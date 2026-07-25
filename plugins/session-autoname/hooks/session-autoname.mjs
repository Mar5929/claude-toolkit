#!/usr/bin/env node
/**
 * session-autoname.mjs — keep a background Claude Code agent session's name
 * matching what it is ACTUALLY doing, not what it started as.
 *
 * Wired as a `Stop` hook, so it runs at the end of every turn. It reads the
 * session transcript, asks Haiku for a short name, and writes that name into
 * the background job's state file.
 *
 * Design notes, so a future reader does not have to rediscover them:
 *
 * 1. WHAT IT WRITES. A background agent session's display name lives in
 *    ~/.claude/jobs/<job-id>/state.json, under `name`. The `--name` value
 *    inside `respawnFlags` holds the same string, so a restarted session keeps
 *    the name instead of reverting. Both are updated together. Claude Code's
 *    daemon picks the change up on its own and mirrors it into the session
 *    transcript as `custom-title` / `agent-name` records.
 *
 * 2. IT IS NOT A SUPPORTED INTERFACE. That state file is Claude Code's own
 *    internal bookkeeping (verified working on CLI 2.1.220). A future release
 *    could rename the field or start writing the name from memory on every
 *    tick. Everything here therefore fails SILENTLY and always exits 0. A
 *    broken auto-namer must never break a session.
 *
 * 3. IT ONLY APPLIES TO BACKGROUND SESSIONS. A normal interactive terminal
 *    session has no job state file and nothing to rename, so the hook no-ops.
 *    CLAUDE_JOB_DIR is set only for background jobs, which makes it the
 *    natural gate.
 *
 * 4. RECURSION. The Haiku call is a nested `claude -p` run. It is launched
 *    with `--setting-sources ""`, so the child loads no settings and therefore
 *    no hooks, which is what stops it triggering this script again forever.
 *    CLAUDE_AUTONAME=0 in the child's environment is a second, independent
 *    guard in case that flag's behavior ever changes. Note that `--bare` would
 *    also skip hooks but is deliberately NOT used: it refuses OAuth and
 *    keychain auth and demands an ANTHROPIC_API_KEY, which this machine does
 *    not use.
 *
 * 5. IT NEVER BLOCKS A TURN. The hook process forks a detached worker and
 *    exits immediately, so the roughly 3 to 4 seconds the Haiku call takes are
 *    never added to the owner's wait.
 *
 * Kill switch: set CLAUDE_AUTONAME=0.
 * Tuning:      CLAUDE_AUTONAME_MODEL, CLAUDE_AUTONAME_MIN_SECONDS.
 * Debug log:   <job-dir>/.autoname.log (last few runs only).
 */

import { readFileSync, writeFileSync, renameSync, existsSync, readdirSync, openSync, closeSync, statSync, unlinkSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { spawn, execFileSync } from 'node:child_process';

const JOBS_DIR = join(homedir(), '.claude', 'jobs');
const MODEL = process.env.CLAUDE_AUTONAME_MODEL || 'claude-haiku-4-5-20251001';
const MIN_SECONDS = Number(process.env.CLAUDE_AUTONAME_MIN_SECONDS || '0');
const MAX_NAME_CHARS = 60;
const LOCK_STALE_MS = 120_000;

/** Never let this hook surface an error into the session. */
function bail() { process.exit(0); }

// ---------------------------------------------------------------- worker mode

if (process.argv[2] === '--worker') {
  try { runWorker(process.argv[3]); } catch { /* silent by design */ }
  process.exit(0);
}

// ------------------------------------------------------------------ hook mode

if (process.env.CLAUDE_AUTONAME === '0') bail();

let payload = {};
try {
  const raw = readFileSync(0, 'utf8');
  payload = raw.trim() ? JSON.parse(raw) : {};
} catch { /* a missing or malformed payload is not fatal */ }

const jobDir = resolveJobDir(payload);
if (!jobDir) bail();                       // interactive session, nothing to name

// One worker at a time. Turns can land faster than a Haiku call returns, and
// two workers racing would each read-modify-write the same state file.
const lockPath = join(jobDir, '.autoname.lock');
try {
  if (existsSync(lockPath) && Date.now() - statSync(lockPath).mtimeMs < LOCK_STALE_MS) bail();
  try { unlinkSync(lockPath); } catch { /* already gone */ }
  closeSync(openSync(lockPath, 'wx'));
} catch { bail(); }

const handoffPath = join(tmpdir(), `claude-autoname-${process.pid}-${Date.now()}.json`);
try {
  writeFileSync(handoffPath, JSON.stringify({ jobDir, transcript: payload.transcript_path || '' }));
} catch { try { unlinkSync(lockPath); } catch {} bail(); }

// Fork and forget, so the turn ends now rather than in four seconds.
try {
  const child = spawn(process.execPath, [new URL(import.meta.url).pathname, '--worker', handoffPath], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, CLAUDE_AUTONAME: '0' },
  });
  child.unref();
} catch { try { unlinkSync(lockPath); } catch {} }

bail();

// ----------------------------------------------------------------- internals

/**
 * Find this session's background job directory.
 *
 * CLAUDE_JOB_DIR is the fast path and is set for background jobs. The scan is
 * a fallback for the case where the hook process does not inherit it: match a
 * job's recorded transcript path or resumed-session id against the payload.
 */
function resolveJobDir(hookPayload) {
  const fromEnv = process.env.CLAUDE_JOB_DIR;
  if (fromEnv && existsSync(join(fromEnv, 'state.json'))) return fromEnv;

  const transcript = hookPayload.transcript_path || '';
  const sessionId = hookPayload.session_id || '';
  if (!transcript && !sessionId) return null;

  try {
    for (const entry of readdirSync(JOBS_DIR)) {
      const dir = join(JOBS_DIR, entry);
      const statePath = join(dir, 'state.json');
      if (!existsSync(statePath)) continue;
      let state;
      try { state = JSON.parse(readFileSync(statePath, 'utf8')); } catch { continue; }
      if (transcript && state.linkScanPath === transcript) return dir;
      if (sessionId && (state.resumeSessionId === sessionId || state.sessionId === sessionId)) return dir;
    }
  } catch { /* no jobs dir at all */ }
  return null;
}

function runWorker(handoffPath) {
  let job;
  try { job = JSON.parse(readFileSync(handoffPath, 'utf8')); } catch { return; }
  try { unlinkSync(handoffPath); } catch {}

  const { jobDir } = job;
  const statePath = join(jobDir, 'state.json');
  const lockPath = join(jobDir, '.autoname.lock');
  const release = () => { try { unlinkSync(lockPath); } catch {} };

  try {
    const state = readState(statePath);
    if (!state) return release();

    if (MIN_SECONDS > 0) {
      const stampPath = join(jobDir, '.autoname.stamp');
      try {
        if (existsSync(stampPath) && (Date.now() - statSync(stampPath).mtimeMs) / 1000 < MIN_SECONDS) {
          return release();
        }
      } catch {}
      try { writeFileSync(stampPath, ''); } catch {}
    }

    const transcriptPath = job.transcript || state.linkScanPath;
    const context = readTranscript(transcriptPath, state);
    if (!context) return release();

    const name = askForName(context, jobDir, state.name || '');
    if (!name) return release();
    if (name === state.name) { log(jobDir, `unchanged: ${name}`); return release(); }

    applyName(statePath, name);
    log(jobDir, `renamed: ${name}`);
  } catch (err) {
    log(jobDir, `error: ${String(err && err.message || err).slice(0, 200)}`);
  } finally {
    release();
  }
}

function readState(statePath) {
  try { return JSON.parse(readFileSync(statePath, 'utf8')); } catch { return null; }
}

/**
 * Build the picture the namer reasons over: what the OWNER has asked for across
 * the whole session, not what the session happens to be doing this minute.
 *
 * The bias here is deliberate and is the whole point of the hook. The name is
 * supposed to be the overarching project, so the evidence has to be the arc of
 * the owner's requests, not the latest step. Concretely:
 *
 * - The opening request gets the most room. That is nearly always where the
 *   real project is stated.
 * - Every later request is included, but each is clipped hard. Seeing that
 *   fifteen asks all circle one project is what identifies the project; the
 *   full text of the fifteenth is what would drag the name down to a step.
 * - The assistant's own output is EXCLUDED entirely. An earlier version fed in
 *   the last reply and the names tracked it turn by turn ("... verify",
 *   "... #156"), which is exactly the failure this shape avoids: the assistant
 *   narrates the current step, so naming from it guarantees step-level names.
 */
function readTranscript(transcriptPath, state) {
  const opening = (state.intent || state.detail || '').trim();

  let userMessages = [];
  if (transcriptPath && existsSync(transcriptPath)) {
    try {
      const lines = readFileSync(transcriptPath, 'utf8').split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        let record;
        try { record = JSON.parse(line); } catch { continue; }
        if (record.isSidechain || record.isMeta) continue;      // subagent + injected context
        if (record.type !== 'user') continue;
        const content = record.message && record.message.content;
        if (typeof content !== 'string') continue;
        const text = content.trim();
        // Slash-command scaffolding, hook output, and tool-result echoes are
        // not the owner talking, and they are the noisiest thing in here.
        if (!text || text.startsWith('<') || text.startsWith('Caveat:')) continue;
        userMessages.push(text);
      }
    } catch { /* fall back to state.intent alone */ }
  }

  const first = userMessages[0] || opening;
  if (!first && userMessages.length === 0) return null;

  const later = userMessages.slice(1).map((m, i) => `${i + 2}. ${clip(m, 220)}`);
  // Keep the tail bounded without letting the newest asks crowd out the arc.
  const laterShown = later.length > 25 ? [...later.slice(0, 5), '...', ...later.slice(-19)] : later;

  return [
    `HOW THE SESSION OPENED (this is usually the project):\n${clip(first, 2000)}`,
    laterShown.length
      ? `EVERY LATER REQUEST FROM THE OWNER, ABBREVIATED (the arc, not the detail):\n${laterShown.join('\n')}`
      : '',
  ].filter(Boolean).join('\n\n');
}

function clip(text, max) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max) + ' ...' : s;
}

function askForName(context, jobDir, currentName) {
  const prompt = [
    'Name this working session after the SINGLE LARGEST, OVERARCHING PROJECT it is working toward,',
    'so its owner can tell at a glance what the session is for.',
    '',
    'The name must sit at the level of the whole project, NOT the current step. A session works',
    'through many steps toward one goal; the steps change constantly and the goal rarely does.',
    'Name the goal.',
    '',
    'Too granular, never do this:',
    '  Verify test output for PR #156        (a step)',
    '  Resolve a merge conflict              (a step)',
    '  Fix the flaky banner assertion        (one task inside the project)',
    '  Reading CalendarView.swift            (an action)',
    '',
    'Right level:',
    '  Anchor cleanup batch (#147, #80, #148)',
    '  Anchor Program/Calendar refactor (#130)',
    '  Stripe billing migration',
    '  Rewrite auth for SSO',
    '',
    'If the session is working several separate items under one umbrella, name the umbrella and',
    'list the items. If there is genuinely only one item, name that item at project level.',
    '',
    'STABILITY MATTERS MORE THAN FRESHNESS. The owner reads this name in a list; a name that',
    'rewords itself every few minutes is worse than useless. So:',
    currentName
      ? `- The session is currently named: ${currentName}`
      : '- The session has no name yet.',
    currentName
      ? '- If that name still describes the overarching project, output it back EXACTLY character for'
        + ' character, unchanged. Do not rephrase it, reorder it, or "improve" it. Only output something'
        + ' different if the overarching project has genuinely CHANGED, not merely progressed.'
      : '- Pick a name that will still be right many turns from now.',
    '',
    'Format rules:',
    '- Output ONLY the name. No surrounding quotes, no trailing period, no explanation, no preamble.',
    `- Between 3 and 8 words, at most ${MAX_NAME_CHARS} characters.`,
    '- Include the app or repo name when there is one.',
    '- Write it as a label, not a sentence. No em dashes.',
    '- Use ordinary punctuation where it aids readability: commas between items, parentheses for a',
    '  list, and a # in front of every ticket or issue number.',
    '',
    context,
  ].join('\n');

  // Run the child somewhere neutral so it cannot pick up a project's CLAUDE.md
  // or .mcp.json. The job's own scratch dir is ideal but is not guaranteed to
  // exist, and a missing cwd makes the spawn throw, which would look exactly
  // like a model failure. Fall back to the system temp dir.
  const scratch = join(jobDir, 'tmp');
  const workDir = existsSync(scratch) ? scratch : tmpdir();

  try {
    const out = execFileSync(
      'claude',
      ['-p', '--model', MODEL, '--setting-sources', '', '--strict-mcp-config', prompt],
      {
        encoding: 'utf8',
        timeout: 60_000,
        cwd: workDir,
        env: { ...process.env, CLAUDE_AUTONAME: '0' },
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );
    return sanitize(out);
  } catch {
    return null;
  }
}

/** Trust nothing a model returns as a filename-ish display string. */
function sanitize(raw) {
  let name = String(raw || '').split('\n').map(s => s.trim()).filter(Boolean)[0] || '';
  name = name.replace(/^["'`]+|["'`]+$/g, '').replace(/[.]+$/, '').replace(/\s+/g, ' ').trim();
  if (!name) return null;
  if (name.length > MAX_NAME_CHARS) name = name.slice(0, MAX_NAME_CHARS).trim();
  // A model that answered in prose instead of a label is a failed run, not a name.
  if (name.split(' ').length > 12) return null;
  if (/^(i |sorry|here|the name|based on)/i.test(name)) return null;
  return name;
}

/**
 * Write the name into the job state.
 *
 * Re-read immediately before writing to keep the window in which the daemon's
 * own writes could be clobbered as small as possible, then swap the file in
 * atomically so a half-written state file can never be observed.
 *
 * `nameSource` is deliberately left as "user". It is the value the daemon has
 * been observed to preserve rather than recompute, and the owner has chosen to
 * have the automatic name win, so presenting it as owner-set is the behavior
 * he asked for.
 */
function applyName(statePath, name) {
  const state = readState(statePath);
  if (!state) return;

  state.name = name;
  state.nameSource = 'user';

  const flags = Array.isArray(state.respawnFlags) ? state.respawnFlags.slice() : null;
  if (flags) {
    const at = flags.indexOf('--name');
    if (at !== -1 && at + 1 < flags.length) flags[at + 1] = name;
    else flags.push('--name', name);
    state.respawnFlags = flags;
  }

  const tmpPath = `${statePath}.autoname.${process.pid}`;
  writeFileSync(tmpPath, JSON.stringify(state));
  renameSync(tmpPath, statePath);
}

/** A tiny, self-truncating log so a silent failure is still diagnosable. */
function log(jobDir, line) {
  try {
    const logPath = join(jobDir, '.autoname.log');
    appendFileSync(logPath, `${new Date().toISOString()} ${line}\n`);
    const lines = readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
    if (lines.length > 40) writeFileSync(logPath, lines.slice(-20).join('\n') + '\n');
  } catch {}
}

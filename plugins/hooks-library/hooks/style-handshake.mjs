#!/usr/bin/env node
/**
 * Request the style read at UserPromptSubmit, then acknowledge a full Read
 * through PostToolUse. Never block Stop or inspect a finished reply.
 * Delivery and a tool read are observable; understanding and compliance are not.
 */
import {
  mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync,
  writeFileSync, renameSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const MAX_AGE = 24 * 60 * 60 * 1000;
const ACK = 'I read the output style and will follow it.';
const userDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
const stateDir = process.env.STYLE_HANDSHAKE_STATE_DIR
  || join(tmpdir(), 'claude-toolkit-style-handshake');

function context(event, text) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: event, additionalContext: text },
  }));
}

function canonical(path) {
  const actual = realpathSync(path);
  return process.platform === 'win32' ? actual.toLowerCase() : actual;
}

function selectedStyle(root) {
  for (const path of [join(root, '.claude', 'settings.local.json'),
    join(root, '.claude', 'settings.json'), join(userDir, 'settings.json')]) {
    let settings;
    try { settings = JSON.parse(readFileSync(path, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (typeof settings.outputStyle === 'string' && settings.outputStyle.trim()) {
      return settings.outputStyle.trim();
    }
  }
  return 'Plain English';
}

function stylePath(root) {
  const name = selectedStyle(root);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  for (const dir of [join(root, '.claude', 'output-styles'), join(userDir, 'output-styles')]) {
    let names;
    try { names = readdirSync(dir).filter(file => file.endsWith('.md')); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    for (const file of names) {
      const path = join(dir, file);
      const text = readFileSync(path, 'utf8');
      const header = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const displayName = header?.[1].match(/^name:\s*(.*?)\s*$/m)?.[1]
        .replace(/^(['"])(.*)\1$/, '$2');
      if (displayName === name || (!displayName && file === `${slug}.md`)) {
        return canonical(path);
      }
    }
  }
  throw new Error('No readable file for the selected output style');
}

function sweep() {
  for (const file of readdirSync(stateDir)) {
    if (!/^[a-f0-9]{64}(?:\.json|-[a-f0-9-]+\.(?:read|tmp))$/.test(file)) continue;
    try {
      const path = join(stateDir, file);
      if (statSync(path).mtimeMs < Date.now() - MAX_AGE) rmSync(path);
    } catch { /* Another hook may have already removed this file. */ }
  }
}

function run(input) {
  const event = input.hook_event_name;
  if (!['UserPromptSubmit', 'PostToolUse'].includes(event) || input.agent_id) return;
  if (typeof input.session_id !== 'string' || !input.session_id) return;
  const root = resolve(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
  const scope = createHash('sha256').update(`${canonical(root)}\0${input.session_id}`).digest('hex');
  const statePath = join(stateDir, `${scope}.json`);

  if (event === 'UserPromptSubmit') {
    try { rmSync(statePath, { force: true }); }
    catch { /* State storage is optional; reminder delivery is not. */ }
    let path;
    try { path = stylePath(root); }
    catch {
      context(event, 'Style handshake: the selected output style file could not be located or read. '
        + 'Briefly report that limitation, do not claim you read it, and continue with the request.');
      return;
    }
    // UserPromptSubmit is the turn boundary; prompt_id is not required.
    try {
      mkdirSync(stateDir, { recursive: true });
      sweep();
      const state = { path, turn: randomUUID(), promptId: input.prompt_id, startedAt: Date.now() };
      const temporary = join(stateDir, `${scope}-${state.turn}.tmp`);
      writeFileSync(temporary, JSON.stringify(state));
      renameSync(temporary, statePath);
    } catch { /* Deliver the reminder even if optional read tracking fails. */ }
    context(event, 'Style handshake for this new user message: before working on the request or writing a reply, '
      + `open ${JSON.stringify(path)} with the Read tool and read the whole file. Make this Read alone; `
      + 'do not batch it with any task tools. Wait for its result. '
      + `Immediately after reading it, send the brief acknowledgment "${ACK}" before calling any other tools. `
      + `Say it exactly once. This is an opening message, not the final answer. Then handle the user's request in the same turn, `
      + 'following that style. The acknowledgment is the one required opening sentence even if the style says no preamble. '
      + 'Do this again for every new user message, including short questions. '
      + 'If the read fails, report that briefly instead of claiming success.');
    return;
  }

  if (input.tool_name !== 'Read' || typeof input.tool_input?.file_path !== 'string') return;
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  if (state.promptId && input.prompt_id && state.promptId !== input.prompt_id) return;
  if (!Number.isFinite(state.startedAt) || Date.now() - state.startedAt > MAX_AGE) return;
  if (canonical(resolve(input.cwd || root, input.tool_input.file_path)) !== state.path) return;
  const response = input.tool_response;
  // A successful text Read reports its returned range. A preview is not a full read.
  const file = response?.file;
  if (response?.type !== 'text' || file?.startLine !== 1
    || !Number.isInteger(file.numLines) || !Number.isInteger(file.totalLines)
    || file.numLines < file.totalLines) return;
  if (!/^[a-f0-9-]+$/.test(state.turn)) return;
  try {
    writeFileSync(join(stateDir, `${scope}-${state.turn}.read`), String(Date.now()), { flag: 'wx' });
  } catch (error) {
    if (error.code === 'EEXIST') return;
    throw error;
  }
  context(event, 'Style handshake: the full output style file was returned by Read for this turn. '
    + `Now send the brief opening message "${ACK}" before calling any task tools. `
    + "Then continue with the user's request in the same turn; do not end the turn at the acknowledgment. "
    + 'If you already acknowledged this read, do not repeat the acknowledgment.');
}

// Old confirm invocations do nothing and never wait for stdin.
if (process.argv.length === 2) {
  try { run(JSON.parse(readFileSync(0, 'utf8'))); }
  catch { /* A broken reminder must never trap the conversation. */ }
}

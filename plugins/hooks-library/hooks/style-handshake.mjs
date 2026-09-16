#!/usr/bin/env node
/**
 * style-handshake: a Stop hook, plus a PostToolUse companion, that holds the
 * turn open until the agent has read the project's output style file and said
 * in its final message whether the reply matches it.
 *
 * What it is NOT. It does not read the reply for figurative language, em
 * dashes, long sentences, or anything else. It judges no writing. It checks
 * two mechanical facts: the output style file was opened with the Read tool
 * during this turn, and the final message ends with one of two exact lines.
 * The comparison itself happens in the agent's head, which is the only place
 * that can do it. The hook only makes sure the step happened.
 *
 * The two lines, exactly:
 *   Style handshake: reply matches the output style.
 *   Style handshake: reply rewritten to match the output style.
 *
 * How the two halves work together. The PostToolUse half fires after a Read
 * of the output style file and writes an empty marker file named for this
 * session and prompt. The Stop half looks for that marker and for one of the
 * two lines at the end of the message. Both present: the turn ends and the
 * marker is deleted. Either missing: the stop is blocked with instructions.
 *
 * Short replies skip the handshake. A reply under STYLE_HANDSHAKE_MIN_CHARS
 * characters (default 120) passes untouched, because a one-line answer costs
 * more to check than the check is worth.
 *
 * It gives up after three blocks for the same prompt. Claude Code ends the
 * turn itself after 8 consecutive stop-hook continuations, and hitting that
 * cap spends eight model turns on a handshake. The fourth time this hook
 * would block the same prompt, it reports one line to the owner and lets the
 * turn end instead.
 *
 * State lives in the OS temp folder, one empty marker file and one counter
 * file per session and prompt. STYLE_HANDSHAKE_STATE_DIR overrides the
 * folder, which is what the tests use. Files older than 24 hours are deleted
 * on any run.
 *
 * Fails open and quiet. Any unexpected error exits 0 with nothing written. A
 * broken handshake must never trap a turn.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const MATCHES_LINE = 'Style handshake: reply matches the output style.';
const REWRITTEN_LINE =
  'Style handshake: reply rewritten to match the output style.';
const DEFAULT_MIN_CHARS = 120;
const DEFAULT_STYLE_FILE = 'plain-english.md';
const MAX_BLOCKS = 3;
const MAX_STATE_AGE_MS = 24 * 60 * 60 * 1000;

function bail() {
  process.exit(0);
}

/** The state folder, overridable so the tests never touch the real one. */
function stateDir() {
  const override = process.env.STYLE_HANDSHAKE_STATE_DIR;
  if (override) return override;
  return join(tmpdir(), 'claude-toolkit-style-handshake');
}

/** One key per turn: the session and the prompt inside it. */
function turnKey(input) {
  const session = typeof input.session_id === 'string' ? input.session_id : '';
  const prompt = typeof input.prompt_id === 'string' ? input.prompt_id : '';
  const raw = prompt ? `${session}-${prompt}` : session;
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Where the project root is. The hook is registered with
 * ${CLAUDE_PROJECT_DIR}, which Claude Code also exports to the process, and
 * which keeps pointing at the checkout the session started in even after
 * Claude enters a worktree. `cwd` on stdin is the fallback.
 */
function projectDir(input) {
  return (
    process.env.CLAUDE_PROJECT_DIR
    || (typeof input.cwd === 'string' && input.cwd)
    || process.cwd()
  );
}

/** "Plain English" in settings becomes .claude/output-styles/plain-english.md */
function styleFileName(root) {
  try {
    const settings = JSON.parse(
      readFileSync(join(root, '.claude', 'settings.json'), 'utf8'),
    );
    const name = settings && settings.outputStyle;
    if (typeof name === 'string' && name.trim()) {
      const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (slug) return `${slug}.md`;
    }
  } catch {
    // No settings file, unreadable, or no outputStyle: use the default below.
  }
  return DEFAULT_STYLE_FILE;
}

function stylePath(root) {
  return resolve(root, '.claude', 'output-styles', styleFileName(root));
}

/** Delete marker and counter files left behind by turns that ended long ago. */
function sweep(dir) {
  try {
    const cutoff = Date.now() - MAX_STATE_AGE_MS;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.read') && !name.endsWith('.count')) continue;
      const path = join(dir, name);
      try {
        if (statSync(path).mtimeMs < cutoff) rmSync(path, { force: true });
      } catch {
        // A file another session removed between the listing and the stat.
      }
    }
  } catch {
    // The folder does not exist yet, which means there is nothing to sweep.
  }
}

/** PostToolUse: record that the output style file was read this turn. */
function handleRead(input, dir) {
  if (input.tool_name !== 'Read') bail();
  const path = input.tool_input && input.tool_input.file_path;
  if (typeof path !== 'string' || !path) bail();
  const root = projectDir(input);
  const wanted = `output-styles/${styleFileName(root)}`;
  if (!path.replace(/\\/g, '/').endsWith(wanted)) bail();
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${turnKey(input)}.read`), '');
  bail();
}

/** The last line with anything on it, trimmed. */
function lastNonEmptyLine(message) {
  const lines = message.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line) return line;
  }
  return '';
}

function blockReason(root) {
  return [
    'Style handshake. Open the output style file at ',
    stylePath(root),
    ' with the Read tool and read it. Compare your last reply with it,',
    ' sentence by sentence. Then end your turn with a final message that is',
    ' either your last reply rewritten to match the style, ending with the',
    ` line \`${REWRITTEN_LINE}\`, or one line: \`${MATCHES_LINE}\``,
    ' The turn cannot end until both the read and that line have happened.',
  ].join('');
}

/** Stop: let the turn end only when both halves of the handshake happened. */
function handleStop(input, dir) {
  const message =
    typeof input.last_assistant_message === 'string'
      ? input.last_assistant_message
      : '';
  const minChars = Number.parseInt(
    process.env.STYLE_HANDSHAKE_MIN_CHARS || '',
    10,
  );
  const threshold = Number.isFinite(minChars) && minChars >= 0
    ? minChars
    : DEFAULT_MIN_CHARS;
  if (message.trim().length < threshold) bail();

  const key = turnKey(input);
  const marker = join(dir, `${key}.read`);
  const counter = join(dir, `${key}.count`);
  const line = lastNonEmptyLine(message);
  const said = line === MATCHES_LINE || line === REWRITTEN_LINE;

  if (said && existsSync(marker)) {
    rmSync(marker, { force: true });
    rmSync(counter, { force: true });
    bail();
  }

  // How many times this same prompt has already been blocked. A continuation
  // whose counter is gone (a wiped temp folder) counts as one block already
  // spent, so losing the file cannot restart the three attempts.
  let blocks = 0;
  try {
    blocks = Number.parseInt(readFileSync(counter, 'utf8'), 10);
  } catch {
    blocks = input.stop_hook_active === true ? 1 : 0;
  }
  if (!Number.isFinite(blocks) || blocks < 0) blocks = 0;

  if (blocks >= MAX_BLOCKS) {
    rmSync(marker, { force: true });
    rmSync(counter, { force: true });
    process.stdout.write(
      JSON.stringify({
        systemMessage:
          'Style handshake gave up after 3 attempts for this turn.',
      }),
    );
    process.exit(0);
  }

  mkdirSync(dir, { recursive: true });
  writeFileSync(counter, String(blocks + 1));
  process.stdout.write(
    JSON.stringify({
      decision: 'block',
      reason: blockReason(projectDir(input)),
    }),
  );
  process.exit(0);
}

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  bail();
}
if (!input || typeof input !== 'object') bail();

try {
  const dir = stateDir();
  sweep(dir);
  if (input.hook_event_name === 'PostToolUse') handleRead(input, dir);
  if (input.hook_event_name === 'Stop') handleStop(input, dir);
} catch {
  bail();
}
bail();

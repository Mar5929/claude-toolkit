#!/usr/bin/env node
/**
 * Tests for style-handshake. Run:
 *   node plugins/hooks-library/tests/style-handshake.test.mjs
 *
 * Every check runs the hook as Claude Code runs it: a child process with the
 * event JSON on stdin, reading what comes back on stdout. The state folder is
 * a fresh temp directory passed in STYLE_HANDSHAKE_STATE_DIR, so a run never
 * touches the marker files of a real session.
 *
 * The checks that assert silence carry as much weight as the ones that assert
 * a block. A hook that blocks when it should not is visible in one turn. A
 * hook that stays quiet when it should have blocked looks exactly like a
 * handshake that passed.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const HOOK = resolve(here, '..', 'hooks', 'style-handshake.mjs');
const PROJECT = resolve(here, '..', '..', '..');
const STYLE_FILE = join(PROJECT, '.claude', 'output-styles', 'plain-english.md');

const MATCHES_LINE = 'Style handshake: reply matches the output style.';
const REWRITTEN_LINE =
  'Style handshake: reply rewritten to match the output style.';

let pass = 0;
let fail = 0;

function ok(condition, message) {
  if (condition) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL: ${message}`);
  }
}

let stateDir;

function freshState() {
  if (stateDir) rmSync(stateDir, { recursive: true, force: true });
  stateDir = mkdtempSync(join(tmpdir(), 'style-handshake-test-'));
  return stateDir;
}

function run(payload) {
  return execFileSync('node', [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 10000,
    env: {
      ...process.env,
      STYLE_HANDSHAKE_STATE_DIR: stateDir,
      CLAUDE_PROJECT_DIR: PROJECT,
    },
  });
}

function markers() {
  return readdirSync(stateDir).filter((name) => name.endsWith('.read'));
}

const SESSION = 'session-abc';
const PROMPT = 'prompt-123';

function stop(message, extra = {}) {
  return run({
    hook_event_name: 'Stop',
    session_id: SESSION,
    prompt_id: PROMPT,
    cwd: PROJECT,
    last_assistant_message: message,
    ...extra,
  });
}

function read(filePath) {
  return run({
    hook_event_name: 'PostToolUse',
    session_id: SESSION,
    prompt_id: PROMPT,
    cwd: PROJECT,
    tool_name: 'Read',
    tool_input: { file_path: filePath },
  });
}

const LONG_REPLY = [
  'The four checks all pass. link-check found no dead pointers, orphan-check',
  'found no unreachable file, installed-copy-check compared every copy under',
  '.claude with what the repo ships, and the knowledge startup check read the',
  'files the hook loads.',
].join(' ');

ok(LONG_REPLY.length >= 120, 'the long reply is over the short-reply threshold');

// --- a short reply skips the handshake ------------------------------------

freshState();
ok(stop('Done.') === '', 'a short reply produces no output');
ok(
  stop('x'.repeat(119)) === '',
  'a reply one character under the threshold produces no output',
);

// --- a long reply with no marker is blocked -------------------------------

freshState();
const blocked = JSON.parse(stop(LONG_REPLY));
ok(blocked.decision === 'block', 'a long reply with no read is blocked');
ok(
  blocked.reason.includes(STYLE_FILE),
  'the reason names the output style file by full path',
);
ok(blocked.reason.includes(MATCHES_LINE), 'the reason quotes the matches line');
ok(
  blocked.reason.includes(REWRITTEN_LINE),
  'the reason quotes the rewritten line',
);
ok(blocked.reason.length < 700, 'the reason stays under 700 characters');
ok(!blocked.reason.includes('—'), 'no em dashes in what the agent reads');

// --- the handshake completed: read plus the line --------------------------

freshState();
ok(read(STYLE_FILE) === '', 'reading the style file produces no output');
ok(markers().length === 1, 'reading the style file writes one marker');
ok(
  stop(`${LONG_REPLY}\n\n${MATCHES_LINE}`) === '',
  'a read plus the matches line ends the turn',
);
ok(markers().length === 0, 'a completed handshake deletes the marker');

freshState();
read(STYLE_FILE);
ok(
  stop(`${LONG_REPLY}\n\n${REWRITTEN_LINE}\n`) === '',
  'the rewritten line ends the turn too, trailing newline included',
);
ok(markers().length === 0, 'the rewritten line deletes the marker as well');

// --- a read with no line, and a line with no read -------------------------

freshState();
read(STYLE_FILE);
const noLine = JSON.parse(stop(LONG_REPLY));
ok(noLine.decision === 'block', 'a read with no handshake line is blocked');

freshState();
read(STYLE_FILE);
const wrongLine = JSON.parse(
  stop(`${LONG_REPLY}\n\nStyle handshake: looks fine to me.`),
);
ok(wrongLine.decision === 'block', 'a line that is close but not exact is blocked');

freshState();
const lineOnly = JSON.parse(stop(`${LONG_REPLY}\n\n${MATCHES_LINE}`));
ok(lineOnly.decision === 'block', 'the line without the read is blocked');

// --- it gives up after three blocks for the same prompt -------------------

freshState();
ok(JSON.parse(stop(LONG_REPLY)).decision === 'block', 'first attempt blocks');
ok(
  JSON.parse(stop(LONG_REPLY, { stop_hook_active: true })).decision === 'block',
  'second attempt blocks',
);
ok(
  JSON.parse(stop(LONG_REPLY, { stop_hook_active: true })).decision === 'block',
  'third attempt blocks',
);
const gaveUp = JSON.parse(stop(LONG_REPLY, { stop_hook_active: true }));
ok(gaveUp.decision === undefined, 'the fourth attempt does not block');
ok(
  gaveUp.systemMessage === 'Style handshake gave up after 3 attempts for this turn.',
  'the fourth attempt reports that it gave up',
);

// --- the marker is per session and prompt ---------------------------------

freshState();
read(STYLE_FILE);
const otherPrompt = JSON.parse(
  run({
    hook_event_name: 'Stop',
    session_id: SESSION,
    prompt_id: 'prompt-999',
    cwd: PROJECT,
    last_assistant_message: `${LONG_REPLY}\n\n${MATCHES_LINE}`,
  }),
);
ok(
  otherPrompt.decision === 'block',
  'a marker from one prompt does not satisfy the next prompt',
);

// --- PostToolUse ignores everything but the style file --------------------

freshState();
ok(read(join(PROJECT, 'README.md')) === '', 'reading another file is silent');
ok(markers().length === 0, 'reading another file writes no marker');

ok(
  read(join(PROJECT, '.claude', 'output-styles', 'concise.md')) === ''
    && markers().length === 0,
  'reading a different output style writes no marker',
);

freshState();
run({
  hook_event_name: 'PostToolUse',
  session_id: SESSION,
  prompt_id: PROMPT,
  cwd: PROJECT,
  tool_name: 'Edit',
  tool_input: { file_path: STYLE_FILE },
});
ok(markers().length === 0, 'editing the style file is not reading it');

// --- broken input fails open ----------------------------------------------

freshState();
ok(run({}) === '', 'an empty payload produces no output');
ok(
  execFileSync('node', [HOOK], {
    input: 'not json',
    encoding: 'utf8',
    timeout: 10000,
    env: { ...process.env, STYLE_HANDSHAKE_STATE_DIR: stateDir },
  }) === '',
  'input that is not JSON produces no output',
);
ok(
  run({ hook_event_name: 'SessionStart', session_id: SESSION }) === '',
  'an event this hook does not handle produces no output',
);

// --- the threshold is configurable ----------------------------------------

freshState();
const raised = execFileSync('node', [HOOK], {
  input: JSON.stringify({
    hook_event_name: 'Stop',
    session_id: SESSION,
    prompt_id: PROMPT,
    cwd: PROJECT,
    last_assistant_message: LONG_REPLY,
  }),
  encoding: 'utf8',
  timeout: 10000,
  env: {
    ...process.env,
    STYLE_HANDSHAKE_STATE_DIR: stateDir,
    CLAUDE_PROJECT_DIR: PROJECT,
    STYLE_HANDSHAKE_MIN_CHARS: '5000',
  },
});
ok(raised === '', 'raising the threshold lets a long reply through');

if (stateDir) rmSync(stateDir, { recursive: true, force: true });
ok(!existsSync(stateDir), 'the temp state folder is cleaned up');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

#!/usr/bin/env node
/**
 * Tests for style-handshake. Run:
 *   node plugins/hooks-library/tests/style-handshake.test.mjs
 *
 * Every check runs the hook as Claude Code runs it: a child process with the
 * event JSON on stdin, reading what comes back on stdout. The confirm mode
 * runs the same way the agent runs it, with the key on the command line. The
 * state folder is a fresh temp directory passed in STYLE_HANDSHAKE_STATE_DIR,
 * so a run never touches the marker files of a real session.
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
const INSTALLED_HOOK = join(PROJECT, '.claude', 'hooks', 'style-handshake.mjs');

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

/** The confirm mode: an argument on the command line and no stdin. */
function confirm(key) {
  return execFileSync('node', [HOOK, 'confirm', key], {
    input: '',
    encoding: 'utf8',
    timeout: 10000,
    env: {
      ...process.env,
      STYLE_HANDSHAKE_STATE_DIR: stateDir,
      CLAUDE_PROJECT_DIR: PROJECT,
    },
  });
}

function files(suffix) {
  return readdirSync(stateDir).filter((name) => name.endsWith(suffix));
}

const markers = () => files('.read');
const confirmations = () => files('.ok');

const SESSION = 'session-abc';
const PROMPT = 'prompt-123';
const KEY = `${SESSION}-${PROMPT}`;

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

// --- a long reply with neither marker is blocked --------------------------

freshState();
const blocked = JSON.parse(stop(LONG_REPLY));
ok(blocked.decision === 'block', 'a long reply with no handshake is blocked');
ok(
  blocked.reason.includes(STYLE_FILE),
  'the reason names the output style file by full path',
);
ok(
  blocked.reason.includes(`node .claude/hooks/style-handshake.mjs confirm ${KEY}`),
  'the reason gives the confirm command with the relative hook path and the turn key',
);
ok(blocked.reason.length < 600, 'the reason stays under 600 characters');
ok(!blocked.reason.includes('—'), 'no em dashes in what the agent reads');
ok(
  !blocked.reason.includes('Style handshake: reply'),
  'the reason asks for no visible line in the reply',
);

// --- one marker on its own is not enough ----------------------------------

freshState();
ok(read(STYLE_FILE) === '', 'reading the style file produces no output');
ok(markers().length === 1, 'reading the style file writes one marker');
const readOnly = JSON.parse(stop(LONG_REPLY));
ok(readOnly.decision === 'block', 'the read without the confirm is blocked');

freshState();
ok(confirm(KEY) === '', 'the confirm command produces no output');
ok(confirmations().length === 1, 'the confirm command writes one ok file');
ok(markers().length === 0, 'the confirm command writes no read marker');
const confirmOnly = JSON.parse(stop(LONG_REPLY));
ok(confirmOnly.decision === 'block', 'the confirm without the read is blocked');

// --- both markers end the turn --------------------------------------------

freshState();
read(STYLE_FILE);
confirm(KEY);
ok(markers().length === 1 && confirmations().length === 1, 'both files exist');
ok(stop(LONG_REPLY) === '', 'the read plus the confirm ends the turn');
ok(markers().length === 0, 'a completed handshake deletes the read marker');
ok(confirmations().length === 0, 'a completed handshake deletes the ok file');

// --- the confirm mode rejects a key it did not compute --------------------

freshState();
ok(confirm('../escape') === '', 'a key with a slash produces no output');
ok(readdirSync(stateDir).length === 0, 'a key with a slash writes nothing');
ok(confirm('key with spaces') === '', 'a key with spaces produces no output');
ok(readdirSync(stateDir).length === 0, 'a key with spaces writes nothing');
ok(confirm('') === '', 'an empty key produces no output');
ok(readdirSync(stateDir).length === 0, 'an empty key writes nothing');
ok(
  execFileSync('node', [HOOK, 'confirm'], {
    input: '',
    encoding: 'utf8',
    timeout: 10000,
    env: { ...process.env, STYLE_HANDSHAKE_STATE_DIR: stateDir },
  }) === '',
  'confirm with no key produces no output',
);
ok(readdirSync(stateDir).length === 0, 'confirm with no key writes nothing');

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

// --- the handshake is per session and prompt ------------------------------

freshState();
read(STYLE_FILE);
confirm(KEY);
const otherPrompt = JSON.parse(
  run({
    hook_event_name: 'Stop',
    session_id: SESSION,
    prompt_id: 'prompt-999',
    cwd: PROJECT,
    last_assistant_message: LONG_REPLY,
  }),
);
ok(
  otherPrompt.decision === 'block',
  'a handshake from one prompt does not satisfy the next prompt',
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

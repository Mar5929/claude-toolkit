#!/usr/bin/env node
/**
 * Tests for memory-pr-hook. Run:
 *   node plugins/hooks-library/tests/memory-pr-hook-harness.mjs
 *
 * A third of these checks make sure an ordinary command is NOT held. That
 * weighting is deliberate. This repository writes about `gh pr create` in
 * ordinary prose, in rules, in tickets, and in commit messages, so a hook that
 * matches the words anywhere in a line would fire constantly on text that is
 * not a command. A wrong hold costs the owner a wasted turn, the same way a
 * wrong block does in writing-guard.
 */

import {
  opensPullRequest,
  stripHeredocs,
  stripQuoted,
  buildMessage,
} from '../hooks/memory-pr-hook.mjs';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HOOK = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'hooks', 'memory-pr-hook.mjs');

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

// --- commands that must be held -------------------------------------------

const held = [
  ['gh pr create', 'the plain case'],
  ['gh pr create --fill --title "x"', 'extra options change nothing'],
  ['gh pr create --draft', 'a draft pull request is still a pull request'],
  ['cd repo && gh pr create', 'each command in a chain is looked at separately'],
  ['git push -u origin HEAD && gh pr create --fill', 'push then open'],
  ['gh   pr   create', 'extra spaces tolerated'],
  ['GH_TOKEN=x gh pr create', 'settings written in front are stripped off first'],
  ['gh pr create --base main --head feat/x --body-file /tmp/b.md', 'a body read from a file'],
];
for (const [command, why] of held) {
  ok(opensPullRequest(command), `must hold (${why}): ${command}`);
}

// The most common real shape: a commit message pasted in as a block of text,
// with the real command after it. The block comes FIRST, so a rule of "ignore
// everything after the first <<" would swallow the command this hook exists
// for.
const heredocThenCreate = [
  'git commit -m "$(cat <<EOF',
  'Fix the thing',
  '',
  'Longer explanation that mentions gh pr create in prose.',
  'EOF',
  ')" && gh pr create --fill',
].join('\n');
ok(opensPullRequest(heredocThenCreate), 'must hold a real command that follows a pasted text block');

// --- commands that must NOT be held ---------------------------------------

const allowed = [
  ['gh pr list', 'reading, not opening'],
  ['gh pr view 12', 'reading, not opening'],
  ['gh pr status', 'reading, not opening'],
  ['gh pr merge 12', 'merging is out of scope by decision'],
  ['gh pr create --help', 'asking for help, not opening anything'],
  ['gh pr create -h', 'asking for help, short form'],
  ['gh repo create my-repo', 'a different command'],
  ['echo "gh pr create when done"', 'the words appear as text, not as a command'],
  ['git commit -m "document gh pr create"', 'the words appear inside a commit message'],
  ['npm run gh-pr-create', 'not the gh command'],
  ['git push origin HEAD', 'pushing is not opening a pull request'],
  ['ls -la', 'nothing to do with pull requests at all'],
  ['gh pr edit 12 --add-label refined', 'editing an existing pull request'],
  ['grep -r "gh pr create" plugins/', 'searching the repository for the words'],
];
for (const [command, why] of allowed) {
  ok(!opensPullRequest(command), `must NOT hold (${why}): ${command}`);
}

// The command written inside a pasted block is documentation, not a command.
const heredocOnly = [
  'cat <<EOF > docs/how-to.md',
  'When you are done, run:',
  'gh pr create --fill',
  'EOF',
].join('\n');
ok(!opensPullRequest(heredocOnly), 'must NOT hold a command written inside a pasted text block');

// A separator inside a quoted string must not split the line into a command.
ok(!opensPullRequest('echo "step 1 && gh pr create"'), 'must NOT hold a chain written inside quotes');
ok(!opensPullRequest("echo 'gh pr create'"), 'must NOT hold single-quoted text');

// --- the helper functions behave ------------------------------------------

ok(stripHeredocs('a <<EOF\nbody\nEOF\nb').includes('b'), 'stripHeredocs keeps what follows the block');
ok(!stripHeredocs('a <<EOF\nbody\nEOF\nb').includes('body'), 'stripHeredocs removes the block body');
ok(!stripHeredocs("a <<'EOF'\nbody\nEOF").includes('body'), 'stripHeredocs handles a quoted marker');
ok(!stripHeredocs('a <<EOF\nbody never closed').includes('body'), 'an unterminated block is dropped to the end');
ok(stripQuoted('a "b c" d').includes('d') && !stripQuoted('a "b c" d').includes('b'), 'stripQuoted removes double quotes');
ok(!stripQuoted("a 'b c' d").includes('b'), 'stripQuoted removes single quotes');
ok(opensPullRequest('gh pr create --title "gh pr list"'), 'a quoted option value does not hide the command');

// --- the message says the four things it is allowed to say ----------------

const message = buildMessage();
ok(message.includes('wrap-up-ritual.md'), 'message names the rule file');
ok(message.includes('memory'), 'message says what the check is about');
ok(message.includes('description'), 'message says what goes in the pull request description');
ok(message.includes('helper agent'), 'message tells a helper agent to report back');
ok(!/memory\/(decisions|knowledge|context|planning)/.test(message), 'message names no memory destination');
ok(!/second-brain/i.test(message), 'message does not assume any system is installed');

// --- end to end through the real hook -------------------------------------

// Session ids must be unique per RUN. The hook keeps per-branch state in a temp
// file keyed by session id, so reusing a fixed id makes the second run of this
// harness see "already held on this branch" and skip the hold. That is the hook
// working correctly and the test lying.
const RUN = `${process.pid}-${process.hrtime.bigint()}`;

/** A folder that is not a git repository, so the branch key falls back to it. */
function projectDir(config) {
  const dir = mkdtempSync(join(tmpdir(), 'mprh-test-'));
  if (config) {
    mkdirSync(join(dir, '.claude'), { recursive: true });
    writeFileSync(join(dir, '.claude', 'memory-pr-hook.json'), JSON.stringify(config));
  }
  return dir;
}

function runHook(payload) {
  try {
    const stdout = execFileSync('node', [HOOK], {
      input: JSON.stringify(payload),
      encoding: 'utf8',
    });
    return { code: 0, stdout };
  } catch (err) {
    return { code: err.status, stdout: err.stdout || '' };
  }
}

function decisionOf(result) {
  if (!result.stdout.trim()) return null;
  try {
    return JSON.parse(result.stdout).hookSpecificOutput.permissionDecision;
  } catch {
    return 'unparseable';
  }
}

const firstDir = projectDir();
const firstTry = runHook({
  tool_name: 'Bash',
  tool_input: { command: 'gh pr create --fill' },
  session_id: `test-hold-${RUN}`,
  cwd: firstDir,
});
ok(firstTry.code === 0, 'the hook always exits 0, even when it holds');
ok(decisionOf(firstTry) === 'deny', 'the hook denies the command that opens a pull request');
ok(decisionOf(firstTry) !== 'ask', 'the hook never asks the owner, which would put a popup in front of them');
ok(firstTry.stdout.includes('wrap-up-ritual.md'), 'the reason handed to the agent names the rule');

const retry = runHook({
  tool_name: 'Bash',
  tool_input: { command: 'gh pr create --fill' },
  session_id: `test-hold-${RUN}`,
  cwd: firstDir,
});
ok(decisionOf(retry) === null, 'the same branch is not held twice in one session');

const otherBranch = runHook({
  tool_name: 'Bash',
  tool_input: { command: 'gh pr create --fill' },
  session_id: `test-hold-${RUN}`,
  cwd: projectDir(),
});
ok(decisionOf(otherBranch) === 'deny', 'a different branch in the same session is held once too');

const newSession = runHook({
  tool_name: 'Bash',
  tool_input: { command: 'gh pr create --fill' },
  session_id: `test-hold-2-${RUN}`,
  cwd: firstDir,
});
ok(decisionOf(newSession) === 'deny', 'a new session on the same branch is held once more');

const reading = runHook({
  tool_name: 'Bash',
  tool_input: { command: 'gh pr list' },
  session_id: `test-read-${RUN}`,
  cwd: projectDir(),
});
ok(reading.code === 0 && decisionOf(reading) === null, 'reading a pull request is never held');

const switchedOff = runHook({
  tool_name: 'Bash',
  tool_input: { command: 'gh pr create' },
  session_id: `test-off-${RUN}`,
  cwd: projectDir({ enabled: false }),
});
ok(decisionOf(switchedOff) === null, 'a project can switch it off');

const capped = projectDir({ enabled: true, maxHolds: 1 });
runHook({
  tool_name: 'Bash',
  tool_input: { command: 'gh pr create' },
  session_id: `test-cap-${RUN}`,
  cwd: capped,
});
const overCap = runHook({
  tool_name: 'Bash',
  tool_input: { command: 'gh pr create' },
  session_id: `test-cap-${RUN}`,
  cwd: projectDir({ enabled: true, maxHolds: 1 }),
});
ok(decisionOf(overCap) === null, 'maxHolds is a safety valve against a runaway loop');

ok(decisionOf(runHook({})) === null, 'no payload is allowed through');
ok(decisionOf(runHook({ tool_input: {} })) === null, 'a payload with no command is allowed through');
ok(runHook({ tool_input: { command: 'ls -la' } }).code === 0, 'an ordinary command exits 0');

console.log(`${fail === 0 ? 'ALL PASS' : 'FAILURES'} (${pass} checks), FAIL: ${fail}`);
process.exit(fail === 0 ? 0 : 1);

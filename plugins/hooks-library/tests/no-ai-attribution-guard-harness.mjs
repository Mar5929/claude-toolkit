#!/usr/bin/env node
/**
 * Tests for no-ai-attribution-guard. Run:
 *   node plugins/hooks-library/tests/no-ai-attribution-guard-harness.mjs
 *
 * Half of these checks make sure an ordinary command is NOT blocked. This
 * repository writes about the `Co-Authored-By: Claude` trailer in its own
 * rules, tickets, and commit messages, so a guard matching those words anywhere
 * would fire on text that is not attribution. The two things that stop it are
 * the line-start anchor and the list of publishing commands, and both are
 * tested here from the wrong-block side as hard as from the right-block side.
 *
 * The other direction matters more than it does for the other hooks in this
 * plugin. A wrong pass puts an AI's name on the owner's client work, which
 * cannot be taken back once it is pushed. A wrong block costs one reworded
 * message.
 */

import { findAttribution, publishesText, buildMessage } from '../hooks/no-ai-attribution-guard.mjs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'hooks',
  'no-ai-attribution-guard.mjs',
);

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

// --- commands that must be blocked ----------------------------------------

const blocked = [
  [
    'git commit -m "Fix the thing\n\nCo-Authored-By: Claude <noreply@anthropic.com>"',
    'the trailer Claude Code adds by default',
  ],
  [
    'git commit -m "Fix the thing\n\nco-authored-by: claude <noreply@anthropic.com>"',
    'lower case is the same trailer',
  ],
  [
    'git commit -m "Fix\n\nCo-Authored-By: GitHub Copilot <copilot@github.com>"',
    'another AI agent, not just Claude',
  ],
  [
    'git commit -m "Fix\n\nCo-Authored-By: Cursor <cursor@example.com>"',
    'Cursor is on the name list too',
  ],
  [
    'git commit -m "Fix\n\n\u{1F916} Generated with [Claude Code](https://claude.com/claude-code)"',
    'the generated line Claude Code adds to pull requests',
  ],
  [
    'git commit -m "Fix\n\nGenerated with Claude Code"',
    'the generated line without the robot picture',
  ],
  [
    'git commit --amend -m "Fix\n\nCo-Authored-By: Claude <noreply@anthropic.com>"',
    'amending a commit publishes the same way',
  ],
  [
    'git commit -a -m "Fix\n\nCo-Authored-By: Claude <x@y.z>"',
    'options between git and commit do not hide it',
  ],
  [
    'gh pr create --title "Fix" --body "Done.\n\n\u{1F916} Generated with Claude Code"',
    'a pull request body carries it too',
  ],
  [
    'gh pr edit 12 --body "Done.\n\nCo-Authored-By: Claude <noreply@anthropic.com>"',
    'editing a pull request republishes the body',
  ],
  [
    'gh release create v1.0 --notes "Ships X\n\nGenerated with Claude Code"',
    'release notes are published text',
  ],
  [
    'git tag -a v1.0 -m "Release\n\nCo-Authored-By: Claude <noreply@anthropic.com>"',
    'an annotated tag holds a message',
  ],
  [
    'git commit -m "Fix\n\nreported-by: someone <noreply@anthropic.com>"',
    'the no-reply address is enough on its own',
  ],
  [
    'git push -u origin HEAD && git commit -m "x\n\nCo-Authored-By: Claude <a@b.c>"',
    'each command in a chain is looked at',
  ],
  [
    'git commit -F - <<EOF\nFix the thing\n\nCo-Authored-By: Claude <noreply@anthropic.com>\nEOF',
    'a pasted-in block is read, not stripped',
  ],
  [
    'git commit -m "$(cat <<EOF\nFix\n\n\u{1F916} Generated with [Claude Code](https://claude.com/claude-code)\nEOF\n)"',
    'the shape Claude Code actually produces',
  ],
];
for (const [command, why] of blocked) {
  ok(findAttribution(command) !== null, `must block (${why}): ${command.slice(0, 60)}`);
}

// --- commands that must NOT be blocked ------------------------------------

const allowed = [
  ['git commit -m "Fix the login timeout"', 'an ordinary commit'],
  ['git status', 'a command that publishes nothing'],
  ['gh pr create --fill', 'a pull request with no attribution in it'],
  [
    'git commit -m "Stop shipping the Co-Authored-By: Claude trailer"',
    'prose about the trailer, mid-line, is not the trailer',
  ],
  [
    'git commit -m "Add a guard that blocks Generated with Claude Code lines"',
    'prose about the generated line is not the generated line',
  ],
  [
    'git commit -m "Fix\n\nCo-Authored-By: Mike Rihm <michael@rihm.com>"',
    'a real human co-author is fine and must keep working',
  ],
  [
    'git commit -m "Fix\n\nCo-Authored-By: Dana Chen <dana@example.com>"',
    'any human co-author, not just the owner',
  ],
  [
    'echo "Co-Authored-By: Claude <noreply@anthropic.com>" > /tmp/notes.txt',
    'writing the words into a file is not publishing them',
  ],
  [
    'grep -rn "Co-Authored-By: Claude" .',
    'searching for the trailer must not be blocked',
  ],
  [
    'cat plugins/project-init/machine/rules/no-ai-attribution.md',
    'reading the rule that describes it',
  ],
  ['gh pr create --help', 'asking for help publishes nothing'],
  [
    'git log --grep="Co-Authored-By: Claude"',
    'looking through history for it is a read',
  ],
];
for (const [command, why] of allowed) {
  const found = findAttribution(command);
  ok(found === null, `must allow (${why}): ${command.slice(0, 60)} [matched ${found?.matched}]`);
}

// One case deliberately goes the strict way, and it is written out here rather
// than left as a surprise. Claude's no-reply address counts as attribution
// anywhere inside a publishing command, prose included, because there is no
// honest reason for that address to be in a commit message at all. Writing
// about it in a file is untouched; only publishing it is blocked.
ok(
  findAttribution('git commit -m "Document the noreply@anthropic.com address"') !== null,
  'the no-reply address is blocked even in prose, on purpose',
);
ok(
  findAttribution('echo "noreply@anthropic.com" >> notes.md') === null,
  'writing the no-reply address into a file is still fine',
);

// --- which commands count as publishing -----------------------------------

ok(publishesText('git commit -m "x"'), 'git commit publishes');
ok(publishesText('gh pr create'), 'gh pr create publishes');
ok(publishesText('git tag -a v1 -m "x"'), 'git tag publishes');
ok(!publishesText('git status'), 'git status does not publish');
ok(!publishesText('ls -la'), 'an unrelated command does not publish');
ok(!publishesText('git commitizen'), 'a command that merely starts with the letters does not count');

// --- the message ----------------------------------------------------------

const message = buildMessage({ reason: 'a Co-Authored-By trailer naming an AI', matched: 'X' });
ok(message.includes('no-ai-attribution.md'), 'the message names the rule');
ok(message.includes('a Co-Authored-By trailer naming an AI'), 'the message says what matched');
ok(!message.includes('—'), 'no em dashes in what the owner reads');

// --- end to end, through stdin --------------------------------------------

function run(payload) {
  return execFileSync('node', [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 10000,
  });
}

const denied = run({
  tool_input: {
    command: 'git commit -m "Fix\n\nCo-Authored-By: Claude <noreply@anthropic.com>"',
  },
});
ok(
  JSON.parse(denied).hookSpecificOutput?.permissionDecision === 'deny',
  'a real trailer is denied end to end',
);

ok(run({ tool_input: { command: 'git commit -m "Fix the login timeout"' } }) === '', 'an ordinary commit produces no output');
ok(run({}) === '', 'an empty payload produces no output');
ok(run({ tool_input: {} }) === '', 'a payload with no command produces no output');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

// Tests for the findings of the second independent review (2026-09-26). Each
// test failed on the engine at commit 220453c and passes after the fix.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  makeProject, ok, refused, prompt, preTool, state, isDeny, isAllow,
} from './helpers.mjs';
import * as hooks from '../engine/hooks.mjs';
import { isAfter } from '../engine/core.mjs';

const PLUGIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

function routed(dir, session = 's1') {
  prompt(dir, 'hi', session);
  ok(dir, ['route', 'chat'], { session });
}

function proposeCard(dir, session = 's1') {
  prompt(dir, 'save this: invoices go out on the 5th', session);
  ok(dir, ['route', 'remember'], { session });
  const out = ok(dir, ['memory', 'propose', '--type', 'fact', '--title', 'Invoice day', '--statement', 'Invoices go out on the 5th.', '--why', 'Owner said so.', '--source', 'owner, 2026-09-26'], { session });
  ok(dir, ['next'], { session });
  ok(dir, ['next'], { session });
  return /Memory proposal (\S+)/.exec(out)[1];
}

// ---------- 1. ids from the command line never leave their folder ----------

test('1: ids with path parts are refused before any file is touched', () => {
  const dir = makeProject();
  fs.writeFileSync(path.join(dir, 'package.json'), '{}\n');
  fs.writeFileSync(path.join(dir, 'fake.json'), JSON.stringify({ id: '../../fake', type: 'fact', title: 'x', statement: 'x', why: 'x', source: 'x' }));
  routed(dir);
  assert.match(refused(dir, ['memory', 'reject', '../../package']), /not a valid proposal id/);
  assert.ok(fs.existsSync(path.join(dir, 'package.json')), 'package.json is still there');
  refused(dir, ['memory', 'approve', '../../fake']);
  refused(dir, ['memory', 'edit', '../../fake', '--statement', 'y']);
  refused(dir, ['librarian', 'apply', '--job', '../../fake', '--action', 'skip', '--reason', 'x']);
  refused(dir, ['item', 'show', '--item', '../1']);
  assert.ok(!fs.existsSync(path.join(dir, '.flow', 'queue')) || fs.readdirSync(path.join(dir, '.flow', 'queue')).length === 0, 'no job was queued');
});

test('1: owner-reply checks fail closed on a missing or invalid time', () => {
  assert.equal(isAfter('2026-09-26T10:00:00.000Z', undefined), false);
  assert.equal(isAfter('2026-09-26T10:00:00.000Z', 'not a time'), false);
  assert.equal(isAfter(undefined, '2026-09-26T10:00:00.000Z'), false);
  assert.equal(isAfter('2026-09-26T10:00:01.000Z', '2026-09-26T10:00:00.000Z'), true);

  const dir = makeProject();
  routed(dir);
  // A card written without a creation time cannot be approved by any reply.
  fs.writeFileSync(path.join(dir, 'memory', 'pending', 'mem-abcdef.json'), JSON.stringify({ id: 'mem-abcdef', type: 'fact', title: 'x', statement: 'x.', why: 'x', source: 'x', session: 's1' }));
  prompt(dir, 'approve');
  ok(dir, ['route', 'chat']);
  refused(dir, ['memory', 'approve', 'mem-abcdef']);
});

// ---------- 2. reject follows the same rule as approve ----------

test('2: reject needs an owner reply after the card, in the card\'s session', () => {
  const dir = makeProject();
  const id = proposeCard(dir, 'A');
  assert.match(refused(dir, ['memory', 'reject', id], { session: 'A' }), /owner has not replied/);
  routed(dir, 'B');
  assert.match(refused(dir, ['memory', 'reject', id], { session: 'B' }), /waiting in another session/);
  prompt(dir, 'reject it', 'A');
  ok(dir, ['route', 'continue'], { session: 'A' });
  ok(dir, ['memory', 'reject', id], { session: 'A' });
});

// ---------- 3. shell gate ----------

test('3: the shell gate handles ${VAR}, whole-tree git and find commands, xargs, and wrappers', () => {
  const dir = makeProject();
  routed(dir);
  const bash = (command) => preTool(dir, 'Bash', { command });
  for (const command of [
    'echo x > ${CLAUDE_PROJECT_DIR}/memory/FOCUS.md',
    'rm -rf ${CLAUDE_PROJECT_DIR}/work',
    'cd ${CLAUDE_PROJECT_DIR}/memory && rm FOCUS.md',
    'git checkout .',
    'git checkout -- memory/FOCUS.md',
    'git checkout memory/FOCUS.md',
    'git restore .',
    'git restore memory/',
    'git reset --hard',
    'git reset --hard HEAD~1',
    'git stash',
    'git stash pop',
    'git clean -fd',
    'sed --in-place s/a/b/ memory/FOCUS.md',
    'find . -delete',
    'find memory -name x.md -exec rm {} ;',
    'ls memory | xargs rm',
    'sudo rm memory/FOCUS.md',
    'command rm memory/FOCUS.md',
    'time rm memory/FOCUS.md',
    'nohup rm memory/FOCUS.md',
    'env rm memory/FOCUS.md',
    'rm -rf .',
  ]) assert.ok(isDeny(bash(command)), `refuse: ${command}`);
  for (const command of [
    'git status', 'git diff', 'git log --oneline', 'git add -A', 'git commit -m "x"', 'git checkout main',
    'git restore --staged src/a.js', 'git stash list', 'find src -name x.js', 'rm -rf src/build',
    'sudo apt list', 'echo ${HOME}',
  ]) assert.equal(bash(command), null, `allow: ${command}`);
});

// ---------- 4. hand edits in ITEM.md ----------

function newItem(dir) {
  prompt(dir, 'new');
  ok(dir, ['route', 'new-work']);
  ok(dir, ['item', 'new', '--title', 'Reminders', '--goal', 'Send reminders.']);
  return path.join(dir, 'work', '1-reminders', 'ITEM.md');
}

test('4: front-matter lines flow does not own, fenced headings, and blank lines survive a write', () => {
  const dir = makeProject();
  const file = newItem(dir);
  let text = fs.readFileSync(file, 'utf8');
  text = text
    .replace('requirements_approved: null\n', 'requirements_approved: null\n# owner comment\nowner: Mike\ntags:\n  - billing\n  - email\n')
    .replace('Send reminders.', 'Send reminders.\n\n```md\n## Progress\nnot a heading\n```')
    .replace('## Requirements\n\nNone yet.', '## Requirements\n\n- **R1** (draft) First.\n\n- **R2** (draft) Second.');
  fs.writeFileSync(file, text);
  ok(dir, ['item', 'progress', '--text', 'Wrote the plan.']);
  const after = fs.readFileSync(file, 'utf8');
  assert.match(after, /requirements_approved: null\n# owner comment\nowner: Mike\ntags:\n {2}- billing\n {2}- email\n---/);
  assert.match(after, /```md\n## Progress\nnot a heading\n```/);
  assert.match(after, /## Progress\n\n- \d{4}-\d\d-\d\d Wrote the plan\./, 'the real Progress section got the entry');
  assert.match(after, /- \*\*R1\*\* \(draft\) First\.\n\n- \*\*R2\*\* \(draft\) Second\./);
});

test('4: a CRLF item is listed and keeps its line endings after a write', () => {
  const dir = makeProject();
  const file = newItem(dir);
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\n/g, '\r\n'));
  assert.match(ok(dir, ['item', 'list']), /1 Reminders/);
  ok(dir, ['item', 'requirement', '--text', 'It works.']);
  const after = fs.readFileSync(file, 'utf8');
  assert.ok(after.includes('\r\n') && !/[^\r]\n/.test(after), 'every line ends in CRLF');
  assert.match(after, /R1\*\* \(draft\) It works\./);
});

// ---------- 5. "remember this ...?" ----------

test('5: "remember this ...?" is not forced; "save this" always is', () => {
  const dir = makeProject();
  const out = prompt(dir, 'Remember this error? It is back.');
  assert.equal(state(dir).turn.forcedRoute, null);
  assert.match(out.hookSpecificOutput.additionalContext, /may ask about the past/);
  prompt(dir, 'save this? yes, the deploy day is Friday');
  assert.equal(state(dir).turn.forcedRoute, 'remember');
});

// ---------- 6. auto-allow only the plugin's own flow ----------

test('6: a bare flow is auto-allowed only when PATH resolves it to this plugin', () => {
  const dir = makeProject();
  prompt(dir, 'hi');
  const other = fs.mkdtempSync(path.join(os.tmpdir(), 'sbf-otherflow-'));
  fs.writeFileSync(path.join(other, 'flow'), '#!/bin/sh\necho other\n', { mode: 0o755 });
  const pre = (PATH) => hooks.preToolUse({ session_id: 's1', cwd: dir, tool_name: 'Bash', tool_input: { command: 'flow status' } }, { PATH });
  assert.ok(isAllow(pre(path.join(PLUGIN, 'bin'))));
  assert.equal(pre('/usr/bin'), null, 'no flow on PATH: no decision');
  assert.equal(pre(`${other}${path.delimiter}${path.join(PLUGIN, 'bin')}`), null, 'another flow first on PATH: no decision');
});

// ---------- 7. a notification in the middle of an owner turn ----------

test('7: a notification before the owner turn is routed keeps that turn in force', () => {
  const dir = makeProject();
  prompt(dir, 'save this: invoices go out on the 5th');
  const n = state(dir).turn.n;
  prompt(dir, '<task-notification>\n<status>completed</status>\n</task-notification>');
  const turn = state(dir).turn;
  assert.equal(turn.n, n, 'the owner turn is not replaced');
  assert.equal(turn.routed, false);
  assert.equal(turn.forcedRoute, 'remember');
  assert.ok(isDeny(preTool(dir, 'Bash', { command: 'npm test' })), 'the route is still required');
  refused(dir, ['route', 'chat']);
  ok(dir, ['route', 'remember']);
});

// ---------- 8. flow init prompts normally ----------

test('8: flow init is not auto-allowed', () => {
  const dir = makeProject();
  routed(dir);
  assert.equal(preTool(dir, 'Bash', { command: 'flow init' }), null);
  assert.ok(isAllow(preTool(dir, 'Bash', { command: 'flow status' })));
});

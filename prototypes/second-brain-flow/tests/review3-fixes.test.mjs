// Tests for the findings of the third independent review (2026-09-26). Each
// test failed on the engine at commit 6c2cfa5 and passes after the fix.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeProject, ok, refused, prompt, isDeny, isAllow } from './helpers.mjs';
import * as hooks from '../engine/hooks.mjs';
import { splitCommands } from '../engine/shell.mjs';

const PLUGIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FLOW = path.join(PLUGIN, 'bin', 'flow');

function routed(dir) {
  prompt(dir, 'hi');
  ok(dir, ['route', 'chat']);
}

// The hook's environment as Claude Code gives it with --plugin-dir: the
// plugin's bin/ is not on PATH, and CLAUDE_PLUGIN_ROOT is set.
const HOOK_ENV = { PATH: '/usr/local/bin:/usr/bin:/bin', CLAUDE_PLUGIN_ROOT: PLUGIN };
const pre = (dir, command, env = HOOK_ENV) => hooks.preToolUse({
  session_id: 's1', cwd: dir, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command },
}, env);

// ---------- 1. comments cannot hide lines ----------

test('1: a # comment cannot hide the lines after it from the gate or get an automatic allow', () => {
  const dir = makeProject();
  routed(dir);
  const payloads = [
    `${FLOW} status # <<X\ntouch memory/pwned\nX`,
    'flow status # "\nrm -rf memory\n"',
    "flow status # '\nrm -rf work\n'",
    'flow status # note\necho x > memory/FOCUS.md',
  ];
  for (const command of payloads) assert.ok(isDeny(pre(dir, command)), `deny: ${JSON.stringify(command)}`);
  // Lines that write nothing protected are not denied, and still get no allow.
  for (const command of [
    `${FLOW} status # <<X\ntouch pwned\nX`,
    'flow status # "\ntouch elsewhere\n"',
    'flow status # note',
    'flow status\rtouch x',
    "flow memory propose --file - <<'EOF'\n{}\nEOF",
  ]) assert.ok(!isAllow(pre(dir, command)), `no allow: ${JSON.stringify(command)}`);
  // The parser sees the command after a comment line.
  assert.deepEqual(splitCommands('flow status # "\nrm -rf memory\n"').map((s) => s.tokens).slice(0, 2), [['flow', 'status'], ['rm', '-rf', 'memory']]);
  // A # inside a word or inside quotes is not a comment.
  assert.deepEqual(splitCommands('echo a#b "#c"').map((s) => s.tokens), [['echo', 'a#b', '#c']]);
});

test('1: only plain one-line flow commands are auto-allowed', () => {
  const dir = makeProject();
  routed(dir);
  assert.ok(isAllow(pre(dir, 'flow item question --text "Which clients get reminders?"')));
  assert.ok(isAllow(pre(dir, "flow memory recall 'fiscal year'")));
  for (const command of ['flow status 2>&1', 'flow item question --text "$(id)"', 'flow status\n', 'flow status ; true']) {
    assert.ok(!isAllow(pre(dir, command)), `no allow: ${JSON.stringify(command)}`);
  }
});

// ---------- 2. bare flow resolves through CLAUDE_PLUGIN_ROOT ----------

test('2: a bare flow is auto-allowed through CLAUDE_PLUGIN_ROOT when no other flow is on the hook PATH', () => {
  const dir = makeProject();
  routed(dir);
  assert.ok(isAllow(pre(dir, 'flow status')));
  const other = fs.mkdtempSync(path.join(os.tmpdir(), 'sbf-otherflow-'));
  fs.writeFileSync(path.join(other, 'flow'), '#!/bin/sh\necho other\n', { mode: 0o755 });
  assert.equal(pre(dir, 'flow status', { ...HOOK_ENV, PATH: `${other}:/usr/bin` }), null, 'another flow on PATH: no decision');
  assert.equal(pre(dir, 'flow status', { ...HOOK_ENV, CLAUDE_PLUGIN_ROOT: other }), null, 'CLAUDE_PLUGIN_ROOT pointing elsewhere: no decision');
});

// ---------- 3. --file ----------

test('3: --file reads only regular files inside the project, or stdin', () => {
  const dir = makeProject();
  const outside = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sbf-outside-')), 'x.json');
  fs.writeFileSync(outside, '{"statement": "secret"}');
  fs.writeFileSync(path.join(dir, 'in.json'), '{"title": "From file"}');
  fs.symlinkSync(outside, path.join(dir, 'link.json'));
  prompt(dir, 'new');
  ok(dir, ['route', 'new-work']);
  assert.match(refused(dir, ['item', 'new', '--file', outside]), /inside the project/);
  assert.match(refused(dir, ['item', 'new', '--file', 'link.json']), /inside the project/);
  assert.match(refused(dir, ['item', 'new', '--file', '/dev/zero']), /inside the project|not a regular file/);
  fs.mkdirSync(path.join(dir, 'adir'));
  assert.match(refused(dir, ['item', 'new', '--file', 'adir']), /not a regular file/);
  assert.match(ok(dir, ['item', 'new', '--file', 'in.json']), /Created work item 1: From file/);
});

// ---------- 4. YAML block scalars ----------

test('4: block scalars in front matter are kept, or replaced whole when flow owns the key', () => {
  const dir = makeProject();
  prompt(dir, 'new');
  ok(dir, ['route', 'new-work']);
  ok(dir, ['item', 'new', '--title', 'Reminders']);
  const file = path.join(dir, 'work', '1-reminders', 'ITEM.md');
  const text = fs.readFileSync(file, 'utf8')
    .replace('title: Reminders\n', 'title: >\n  Reminder emails\n  for late invoices\n')
    .replace('requirements_approved: null\n', 'requirements_approved: null\nnotes: |\n  Line one.\n  Line two.\n');
  fs.writeFileSync(file, text);
  assert.match(ok(dir, ['item', 'list']), /1 Reminder emails for late invoices/);
  ok(dir, ['item', 'requirement', '--text', 'It works.']);
  const after = fs.readFileSync(file, 'utf8');
  assert.match(after, /\ntitle: Reminder emails for late invoices\n/, 'the owned key and its lines are replaced together');
  assert.ok(!after.includes('title: ">"'));
  assert.ok(!/\n {2}for late invoices\n/.test(after), 'no stray continuation line is left');
  assert.match(after, /notes: \|\n {2}Line one\.\n {2}Line two\.\n/, 'an unowned block scalar is kept verbatim');
});

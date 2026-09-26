import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeProject, ok, refused, prompt, where, state } from './helpers.mjs';

function proposeCard(dir) {
  ok(dir, ['route', 'remember']);
  const out = ok(dir, ['memory', 'propose', '--type', 'preference', '--title', 'Short replies', '--statement', 'The owner prefers short replies.', '--why', 'Said so.', '--source', 'owner']);
  return /Memory proposal (mem-[0-9a-f]+)/.exec(out)[1];
}

test('memory approve is refused before an owner prompt and accepted after', () => {
  const dir = makeProject();
  prompt(dir, 'remember this: short replies');
  const id = proposeCard(dir);
  assert.match(refused(dir, ['memory', 'approve', id]), /owner has not replied/);
  assert.ok(fs.existsSync(path.join(dir, 'memory', 'pending', `${id}.json`)), 'onboarding writes a pending proposal');
  assert.equal(fs.readdirSync(path.join(dir, 'memory', 'topics')).filter((n) => n.endsWith('.md')).length, 0, 'nothing is saved yet');
  prompt(dir, 'approve');
  assert.match(ok(dir, ['memory', 'approve', id]), /Queued librarian job/);
  assert.ok(!fs.existsSync(path.join(dir, 'memory', 'pending', `${id}.json`)));
});

test('an edited proposal needs a fresh owner reply', () => {
  const dir = makeProject();
  prompt(dir, 'save this');
  const id = proposeCard(dir);
  prompt(dir, 'change it to say very short');
  ok(dir, ['memory', 'edit', id, '--statement', 'The owner prefers very short replies.']);
  refused(dir, ['memory', 'approve', id]);
  prompt(dir, 'yes');
  ok(dir, ['memory', 'approve', id]);
});

test('item approve is refused before an owner prompt and accepted after', () => {
  const dir = makeProject();
  prompt(dir, 'new');
  ok(dir, ['route', 'new-work']);
  ok(dir, ['item', 'new', '--title', 'Thing']);
  ok(dir, ['item', 'requirement', '--text', 'It works.']);
  assert.match(refused(dir, ['item', 'approve']), /--propose/);
  ok(dir, ['item', 'approve', '--propose']);
  assert.match(ok(dir, ['item', 'show']), /## Next step\n\nOwner decides whether to approve moving the item to requirements-approved/);
  assert.match(refused(dir, ['item', 'approve']), /owner has not replied/);
  prompt(dir, 'approved');
  ok(dir, ['route', 'chat']);
  assert.match(ok(dir, ['item', 'approve', '--item', '1']), /refinement to requirements-approved/);
  const item = fs.readFileSync(path.join(dir, 'work', '1-thing', 'ITEM.md'), 'utf8');
  assert.match(item, /requirements_approved: 2\d{3}-\d\d-\d\d/);
  assert.match(item, /\*\*R1\*\* \(approved\)/);
  assert.match(item, /## Next step\n\nRequirements are approved\. Start the design\./);
});

test('stage done and requirements-approved are gated; other stages are not', () => {
  const dir = makeProject();
  prompt(dir, 'new');
  ok(dir, ['route', 'new-work']);
  ok(dir, ['item', 'new', '--title', 'Thing']);
  ok(dir, ['item', 'stage', 'build']);
  refused(dir, ['item', 'stage', 'done']);
  refused(dir, ['item', 'stage', 'requirements-approved']);
  ok(dir, ['item', 'stage', 'done', '--propose']);
  refused(dir, ['item', 'stage', 'done']);
  prompt(dir, 'yes it is done');
  ok(dir, ['route', 'chat']);
  assert.match(ok(dir, ['item', 'stage', 'done', '--item', '1']), /to done/);
  refused(dir, ['item', 'stage', 'nonsense', '--item', '1']);
});

test('trust set is refused without the owner trust command and accepted with it', () => {
  const dir = makeProject();
  prompt(dir, 'please turn on trusted mode');
  assert.match(refused(dir, ['trust', 'set', 'on']), /Only the owner/);
  prompt(dir, '/second-brain-flow:trust on');
  assert.match(refused(dir, ['trust', 'set', 'off']), /Only the owner/);
  assert.match(ok(dir, ['trust', 'set', 'on']), /now trusted/);
  assert.match(ok(dir, ['trust']), /Memory mode: trusted/);
  prompt(dir, 'next prompt');
  refused(dir, ['trust', 'set', 'off']);
  prompt(dir, '/trust off');
  assert.match(ok(dir, ['trust', 'set', 'off']), /now onboarding/);
  const config = JSON.parse(fs.readFileSync(path.join(dir, 'memory', 'config.json'), 'utf8'));
  assert.equal(config.history.length, 2);
  assert.equal(config.changed_by, 'owner');
});

test('a save phrase forces the remember route', () => {
  const dir = makeProject();
  for (const phrase of ['Save this: we ship Fridays', 'remember this please', 'REMEMBER THAT the API is v2']) {
    const out = prompt(dir, phrase);
    assert.match(out.hookSpecificOutput.additionalContext, /route must be `remember`/);
    assert.equal(state(dir).turn.forcedRoute, 'remember');
    assert.match(refused(dir, ['route', 'chat']), /save phrase/);
    ok(dir, ['route', 'remember']);
    assert.equal(where(dir), 'remember:propose');
    ok(dir, ['cancel']);
  }
  prompt(dir, '  save this, it matters');
  assert.equal(state(dir).turn.forcedRoute, 'remember', 'the phrase at the start counts');
  prompt(dir, 'please save this file');
  assert.equal(state(dir).turn.forcedRoute, null, 'the phrase elsewhere does not');
});

test('memory propose is refused outside the remember workflow and when incomplete', () => {
  const dir = makeProject();
  prompt(dir, 'hi');
  ok(dir, ['route', 'chat']);
  assert.match(refused(dir, ['memory', 'propose', '--type', 'fact', '--title', 'x', '--statement', 'y', '--why', 'z', '--source', 'o']), /route remember/);
  ok(dir, ['route', 'remember']);
  assert.match(refused(dir, ['memory', 'propose', '--type', 'opinion', '--title', 'x']), /type must be one of/);
});

test('bigger inputs can come from a JSON file or stdin', () => {
  const dir = makeProject();
  prompt(dir, 'save this');
  ok(dir, ['route', 'remember']);
  const payload = JSON.stringify({ type: 'lesson', title: 'Quotes in shell', statement: 'Multi-line text\nworks from stdin; even "quotes".', why: 'Shell quoting is hard.', source: 'agent' });
  assert.match(ok(dir, ['memory', 'propose', '--file', '-'], { stdin: payload }), /Title: Quotes in shell/);
  const file = path.join(dir, 'item.json');
  fs.writeFileSync(file, JSON.stringify({ title: 'From a file', goal: 'Goal: with a colon', why: 'Because' }));
  ok(dir, ['item', 'new', '--file', file]);
  assert.match(ok(dir, ['item', 'show', '1']), /Goal: with a colon/);
});

test('flow turn starts a turn by hand for hosts without the prompt hook', () => {
  const dir = makeProject();
  assert.match(ok(dir, ['turn', '--prompt', 'save this: invoices go out on the 5th']), /must be `remember`/);
  refused(dir, ['route', 'chat']);
  ok(dir, ['route', 'remember']);
  ok(dir, ['cancel']);
  // The trust command is not honored from flow turn: nothing proves the owner typed it.
  ok(dir, ['turn', '--prompt', '/trust on']);
  assert.match(refused(dir, ['trust', 'set', 'on']), /Only the owner/);
  assert.match(ok(dir, ['status']), /Turn 2: not routed yet/);
});

test('the Codex path: a save runs end to end with flow turn and no hooks', () => {
  const dir = makeProject();
  ok(dir, ['turn', '--prompt', 'remember that invoices go out on the 5th']);
  ok(dir, ['route', 'remember']);
  const card = ok(dir, ['memory', 'propose', '--type', 'fact', '--title', 'Invoice day', '--statement', 'Invoices go out on the 5th.', '--why', 'Owner said so.', '--source', 'owner, 2026-09-26']);
  const id = /Memory proposal (\S+)/.exec(card)[1];
  ok(dir, ['next']);
  ok(dir, ['next']);
  refused(dir, ['memory', 'approve', id]);
  ok(dir, ['turn', '--prompt', 'approve']);
  ok(dir, ['route', 'continue']);
  ok(dir, ['memory', 'approve', id]);
  ok(dir, ['next', '--decision', 'approved']);
  refused(dir, ['next']);
  ok(dir, ['librarian', 'next']);
  ok(dir, ['librarian', 'apply', '--action', 'create']);
  assert.match(ok(dir, ['next']), /Workflow remember is finished/);
  assert.ok(fs.existsSync(path.join(dir, 'memory', 'topics', 'fact-invoice-day.md')));
});

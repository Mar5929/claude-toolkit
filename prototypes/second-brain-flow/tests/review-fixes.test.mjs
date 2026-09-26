// Tests for the findings of the 2026-09-26 independent review. Each test failed
// on the engine at commit 515ea28 and passes after the fix.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  makeProject, ok, refused, flow, prompt, preTool, stopHook, subagentStart, sessionStart, state, where, isDeny, isAllow,
} from './helpers.mjs';
import * as hooks from '../engine/hooks.mjs';

const PLUGIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

function proposeCard(dir, session = 's1') {
  prompt(dir, 'save this: invoices go out on the 5th', session);
  ok(dir, ['route', 'remember'], { session });
  const out = ok(dir, ['memory', 'propose', '--type', 'fact', '--title', 'Invoice day', '--statement', 'Invoices go out on the 5th.', '--why', 'Owner said so.', '--source', 'owner, 2026-09-26'], { session });
  ok(dir, ['next'], { session });
  ok(dir, ['next'], { session });
  return /Memory proposal (\S+)/.exec(out)[1];
}

function approvedItem(dir, title = 'Thing') {
  prompt(dir, 'new');
  ok(dir, ['route', 'new-work']);
  ok(dir, ['item', 'new', '--title', title]);
  ok(dir, ['item', 'requirement', '--text', 'It works.']);
  ok(dir, ['cancel']);
  ok(dir, ['item', 'approve', '--item', '1', '--propose']);
  prompt(dir, 'approved');
  ok(dir, ['route', 'chat']);
  ok(dir, ['item', 'approve', '--item', '1']);
}

// ---------- 1. flow turn cannot fake an owner prompt ----------

test('1: flow turn is refused in a session the hooks run, so it cannot fake an owner reply', () => {
  const dir = makeProject();
  sessionStart(dir, 's1');
  const id = proposeCard(dir);
  assert.match(refused(dir, ['turn', '--prompt', 'approve']), /run by the Claude Code hooks/);
  refused(dir, ['memory', 'approve', id]);
  assert.ok(isDeny(preTool(dir, 'Bash', { command: 'flow turn --prompt approve' })), 'PreToolUse also denies flow turn');

  ok(dir, ['cancel']);
  prompt(dir, 'new');
  ok(dir, ['route', 'new-work']);
  ok(dir, ['item', 'new', '--title', 'Thing']);
  ok(dir, ['item', 'requirement', '--text', 'It works.']);
  ok(dir, ['item', 'approve', '--propose']);
  refused(dir, ['turn', '--prompt', 'yes']);
  refused(dir, ['item', 'approve']);
});

test('1: a session no hook touched (Codex, manual) can still use flow turn', () => {
  const dir = makeProject();
  assert.match(ok(dir, ['turn', '--prompt', 'hello'], { session: 'codex' }), /Workflow turn/);
});

// ---------- 2. hand edits to ITEM.md survive flow writes ----------

test('2: hand edits in ITEM.md survive a flow write; hand-written ids are read; doctor reports the rest', () => {
  const dir = makeProject();
  prompt(dir, 'new');
  ok(dir, ['route', 'new-work']);
  ok(dir, ['item', 'new', '--title', 'Reminders', '--goal', 'Send reminders.']);
  const file = path.join(dir, 'work', '1-reminders', 'ITEM.md');
  let text = fs.readFileSync(file, 'utf8');
  text = text
    .replace('Send reminders.', 'Send reminders.\n\nA second paragraph the owner wrote.')
    .replace('## Requirements\n\nNone yet.', '## Requirements\n\n- R1 Clients get an email\n  when the invoice is late.\n- Something the owner jotted without an id.\n\nA note under the requirements.')
    .replace('## Decisions', '## Notes\n\nOwner notes, kept by hand.\n- a bullet in the notes\n\n## Decisions');
  fs.writeFileSync(file, text);

  ok(dir, ['item', 'requirement', '--text', 'Reminders stop after 30 days.']);
  const after = fs.readFileSync(file, 'utf8');
  assert.match(after, /Send reminders\.\n\nA second paragraph the owner wrote\./);
  assert.match(after, /- \*\*R1\*\* \(draft\) Clients get an email\n {2}when the invoice is late\./, 'R1 is read and its wrapped line kept');
  assert.match(after, /- Something the owner jotted without an id\./);
  assert.match(after, /A note under the requirements\./);
  assert.match(after, /- \*\*R2\*\* \(draft\) Reminders stop after 30 days\./);
  assert.match(after, /## Notes\n\nOwner notes, kept by hand\.\n- a bullet in the notes\n\n## Decisions/);
  assert.ok(!/\*\*null\*\*/.test(after));
  const doctor = flow(dir, ['doctor']);
  assert.equal(doctor.code, 1);
  assert.match(doctor.stdout, /line in Requirements that flow cannot read, kept as written: - Something the owner jotted/);
});

test('2: flow doctor names the lines it could not read', () => {
  const dir = makeProject();
  prompt(dir, 'new');
  ok(dir, ['route', 'new-work']);
  ok(dir, ['item', 'new', '--title', 'Reminders']);
  const file = path.join(dir, 'work', '1-reminders', 'ITEM.md');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('## Open questions\n\nNone yet.', '## Open questions\n\n- Who signs off?'));
  assert.match(flow(dir, ['doctor']).stdout, /line in Open questions that flow cannot read, kept as written: - Who signs off\?/);
});

// ---------- 3. undo ----------

function trusted(dir) {
  prompt(dir, '/second-brain-flow:trust on');
  ok(dir, ['trust', 'set', 'on']);
}

function queueSave(dir, fields) {
  prompt(dir, 'save this');
  ok(dir, ['route', 'remember']);
  const out = ok(dir, ['memory', 'propose', '--file', '-'], { stdin: JSON.stringify({ source: 'owner, 2026-09-26', why: 'Owner said so.', ...fields }) });
  ok(dir, ['next']);
  subagentStart(dir, 'second-brain-flow:memory-librarian');
  ok(dir, ['next']);
  return /job (job-[0-9a-f]+)/.exec(out)[1];
}

test('3: undo needs the owner command, and refuses when a later change touched the same file', () => {
  const dir = makeProject();
  trusted(dir);
  const j1 = queueSave(dir, { type: 'decision', title: 'Okta for login', statement: 'The portal signs in through Okta.' });
  const c1 = /Change (chg-[0-9a-f]+)/.exec(ok(dir, ['librarian', 'apply', '--job', j1, '--action', 'create']))[1];
  const j2 = queueSave(dir, { type: 'fact', title: 'Okta tenant', statement: 'The Okta tenant is shared with staff.' });
  const c2 = /Change (chg-[0-9a-f]+)/.exec(ok(dir, ['librarian', 'apply', '--job', j2, '--action', 'update', '--topic', 'decision-okta-for-login']))[1];

  assert.match(refused(dir, ['memory', 'undo', c1]), /Only the owner can undo/);
  prompt(dir, `/second-brain-flow:memory-undo ${c1}`);
  assert.match(refused(dir, ['memory', 'undo', c1]), new RegExp(`Undo ${c2} first`));
  assert.match(read(dir, 'memory/topics/decision-okta-for-login.md'), /shared with staff/, 'the later change is intact');

  prompt(dir, `/memory-undo ${c2}`);
  ok(dir, ['memory', 'undo', c2]);
  prompt(dir, `/memory-undo ${c1}`);
  refused(dir, ['memory', 'undo', c2]);
  ok(dir, ['memory', 'undo', c1]);
  assert.ok(!fs.existsSync(path.join(dir, 'memory/topics/decision-okta-for-login.md')));
});

// ---------- 4. shell write gate ----------

test('4: the shell gate expands known variables, follows cd, reads bash -c, and protects .flow/', () => {
  const dir = makeProject();
  prompt(dir, 'hi');
  ok(dir, ['route', 'chat']);
  const pre = (command, env = {}) => hooks.preToolUse({
    session_id: 's1', cwd: dir, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command },
  }, env);
  for (const command of [
    'echo x > $CLAUDE_PROJECT_DIR/memory/FOCUS.md',
    'echo x > "${CLAUDE_PROJECT_DIR}/memory/FOCUS.md"',
    'echo x > $PWD/work/1-x/ITEM.md',
    'cd memory && echo x > FOCUS.md',
    'cd work/1-x; rm ITEM.md',
    'bash -c "echo x > memory/FOCUS.md"',
    "sh -c 'cd memory && touch x'",
    'eval "rm -rf work"',
    'echo {} > .flow/sessions/s1.json',
    'FLOW_SESSION_ID=other flow status',
    'env FLOW_SESSION_ID=other flow memory approve mem-1',
    'export FLOW_SESSION_ID=other',
    'unset FLOW_SESSION_ID; flow status',
    'env -u FLOW_SESSION_ID flow turn',
  ]) assert.ok(isDeny(pre(command)), `refuse: ${command}`);
  assert.ok(isDeny(pre('echo x > $HOME/memory/FOCUS.md', { HOME: dir })), 'refuse: $HOME expanded');
  assert.ok(isDeny(pre('echo x > ~/memory/FOCUS.md', { HOME: dir })), 'refuse: ~ expanded');
  assert.ok(isDeny(preTool(dir, 'Write', { file_path: path.join(dir, '.flow', 'sessions', 's1.json'), content: '{}' })));
  assert.equal(pre('cd src && echo x > out.txt'), null);
  assert.equal(pre('cat .flow/audit.log'), null);
  assert.equal(pre('echo x > $TMPDIR/memory/a'), null, 'an unknown variable cannot be judged; see the README limits');
});

// ---------- 5. cards belong to their session ----------

test('5: a card can be approved only by an owner reply in the session that showed it', () => {
  const dir = makeProject();
  const id = proposeCard(dir, 'A');
  prompt(dir, 'approve it', 'B');
  ok(dir, ['route', 'chat'], { session: 'B' });
  assert.match(refused(dir, ['memory', 'approve', id], { session: 'B' }), /waiting in another session/);
  refused(dir, ['memory', 'edit', id, '--statement', 'Changed.'], { session: 'B' });
  assert.match(ok(dir, ['memory', 'pending'], { session: 'B' }), new RegExp(`Waiting in another session: ${id}`));
  assert.match(prompt(dir, 'hello', 'B').hookSpecificOutput.additionalContext, /waiting in another session/);
  prompt(dir, 'approve', 'A');
  ok(dir, ['route', 'continue'], { session: 'A' });
  ok(dir, ['memory', 'approve', id], { session: 'A' });
});

// ---------- 6. requirements approval before later stages and work ----------

test('6: later stages and the work route need approved requirements', () => {
  const dir = makeProject();
  prompt(dir, 'new');
  ok(dir, ['route', 'new-work']);
  ok(dir, ['item', 'new', '--title', 'Thing']);
  for (const stage of ['design', 'build', 'testing', 'review']) refused(dir, ['item', 'stage', stage]);
  prompt(dir, 'work on item 1');
  assert.match(refused(dir, ['route', 'work', '--item', '1']), /flow route refine --item 1/);

  const dir2 = makeProject();
  approvedItem(dir2);
  prompt(dir2, 'work on item 1');
  ok(dir2, ['route', 'work', '--item', '1']);
  ok(dir2, ['item', 'stage', 'build']);
});

// ---------- 7. save phrases ----------

test('7: "remember that ...?" is a question, not a forced save; plain save phrases still force', () => {
  const dir = makeProject();
  const out = prompt(dir, 'Remember that bug we fixed yesterday? Is it back?');
  assert.equal(state(dir).turn.forcedRoute, null);
  assert.match(out.hookSpecificOutput.additionalContext, /may ask about the past/);
  ok(dir, ['route', 'recall']);
  for (const text of ['remember that invoices go out on the 5th', 'save this: why not?', 'Remember this?']) {
    prompt(dir, text);
    assert.equal(state(dir).turn.forcedRoute, 'remember', text);
    refused(dir, ['route', 'chat']);
    ok(dir, ['route', 'remember']);
    ok(dir, ['cancel']);
  }
});

// ---------- 8. repeated routes do not pile up ----------

test('8: a second route for the same workflow and item replaces the waiting one; a reply answers only the top step', () => {
  const dir = makeProject();
  approvedItem(dir);
  for (let i = 0; i < 3; i += 1) {
    prompt(dir, 'continue item 1');
    ok(dir, ['route', 'resume-work', '--item', '1']);
    ok(dir, ['item', 'question', '--none']);
    ok(dir, ['next']);
  }
  assert.deepEqual(state(dir).stack.map((f) => `${f.workflow}:${f.step}`), ['resume-work:await-alignment']);

  // Two different waiting workflows: the reply answers the top one only.
  proposeCard(dir);
  prompt(dir, 'approve');
  const s = state(dir);
  const resume = s.stack.find((f) => f.workflow === 'resume-work');
  const remember = s.stack.find((f) => f.workflow === 'remember');
  assert.ok(remember.ownerRepliedAt, 'the top waiting step is answered');
  assert.equal(resume.ownerRepliedAt < s.turn.promptAt, true, 'the older waiting step is not');
});

// ---------- 9. notification turns and older unfinished steps ----------

test('9: a notification turn does not hold the reply for a step an earlier turn left open', () => {
  const dir = makeProject();
  prompt(dir, 'new');
  ok(dir, ['route', 'new-work']);
  assert.equal(where(dir), 'new-work:capture');
  prompt(dir, '<task-notification>\n<status>completed</status>\n</task-notification>');
  assert.equal(stopHook(dir, 'The librarian finished.'), null);
});

// ---------- 10. plain flow commands run without a permission prompt ----------

test('10: a plain flow command is allowed without a prompt; anything else is not auto-allowed', () => {
  const dir = makeProject();
  prompt(dir, 'hi');
  assert.ok(isAllow(preTool(dir, 'Bash', { command: 'flow status' })));
  assert.ok(isAllow(preTool(dir, 'Bash', { command: `node ${PLUGIN}/bin/flow route chat` })));
  assert.equal(preTool(dir, 'Bash', { command: 'flow status && flow item list' }), null, 'a chain gets no allow');
  assert.ok(isDeny(preTool(dir, 'Bash', { command: 'flow status | head' })), 'a pipe is not only flow before routing');
  ok(dir, ['route', 'chat']);
  assert.equal(preTool(dir, 'Bash', { command: '/tmp/other/bin/flow status' }), null, 'another bin/flow gets no allow');
  assert.equal(preTool(dir, 'Bash', { command: 'flow status > out.txt' }), null);
  assert.ok(isAllow(preTool(dir, 'Bash', { command: 'flow librarian next' }, { agent: 'second-brain-flow:memory-librarian' })));
});

// ---------- 11 and 12. librarian dispatch ----------

test('11: SubagentStart marks only this session\'s jobs; 12: only the plugin-scoped librarian name counts', () => {
  const dir = makeProject();
  trusted(dir);
  prompt(dir, '/second-brain-flow:trust on', 'B');
  const jobFor = (session) => {
    prompt(dir, 'save this', session);
    ok(dir, ['route', 'remember'], { session });
    const out = ok(dir, ['memory', 'propose', '--type', 'fact', '--title', `Fact ${session}`, '--statement', `Statement ${session}.`, '--why', 'Why.', '--source', 'owner'], { session });
    return /job (job-[0-9a-f]+)/.exec(out)[1];
  };
  const a = jobFor('s1');
  const b = jobFor('B');
  assert.equal(subagentStart(dir, 'memory-librarian'), null);
  assert.equal(subagentStart(dir, 'other-plugin:memory-librarian'), null);
  subagentStart(dir, 'second-brain-flow:memory-librarian', 's1');
  const job = (id) => JSON.parse(read(dir, `.flow/queue/${id}.json`));
  assert.equal(job(a).status, 'dispatched');
  assert.equal(job(b).status, 'queued', 'the other session\'s job is untouched');
  const hooksJson = JSON.parse(fs.readFileSync(path.join(PLUGIN, 'hooks', 'hooks.json'), 'utf8'));
  assert.equal(hooksJson.hooks.SubagentStart[0].matcher, '^second-brain-flow:memory-librarian$');
});

// ---------- found in the final end-to-end run ----------

test('the owner checks apply to a redirected flow command; 2>&1 is not a file write', () => {
  const dir = makeProject();
  prompt(dir, 'hi');
  ok(dir, ['route', 'chat']);
  assert.ok(isDeny(preTool(dir, 'Bash', { command: 'flow trust set on 2>&1' })), 'trust set with 2>&1 is still checked');
  assert.ok(isDeny(preTool(dir, 'Bash', { command: 'flow turn --prompt yes > /dev/null' })));
  assert.ok(isAllow(preTool(dir, 'Bash', { command: 'flow status 2>&1' })), '2>&1 writes no file, so the command is still plain');
  assert.equal(preTool(dir, 'Bash', { command: 'flow status > out.txt' }), null, 'a file redirect gets no automatic allow');
  assert.ok(isDeny(preTool(dir, 'Bash', { command: 'echo x 2> memory/FOCUS.md' })), 'a real redirect after a descriptor is still a write');
});

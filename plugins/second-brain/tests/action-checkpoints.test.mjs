import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { pullRequestActionKey } from '../hooks/save-reminder.mjs';
import { workItemActionKey } from '../hooks/work-item-close.mjs';

const saveReminder = resolve('plugins/second-brain/hooks/save-reminder.mjs');
const workItemClose = resolve('plugins/second-brain/hooks/work-item-close.mjs');
const HOLD_STATE = 'second-brain-action-hold';

function repository(t) {
  const root = mkdtempSync(join(tmpdir(), 'knowledge-action-hook-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-b', 'main'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Fixture Agent'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'fixture@example.invalid'], { cwd: root });
  writeFileSync(join(root, 'README.md'), 'fixture\n');
  execFileSync('git', ['add', 'README.md'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'Initialize fixture'], { cwd: root });
  return root;
}

function commit(root, text) {
  writeFileSync(join(root, 'README.md'), text);
  execFileSync('git', ['add', 'README.md'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'Change fixture'], { cwd: root });
}

function runHook(path, input, env = {}) {
  return execFileSync(process.execPath, [path], {
    cwd: input.cwd,
    input: JSON.stringify(input),
    encoding: 'utf8',
    env: { ...process.env, TOOLKIT_PROTOCOL_ENGINE: '', ...env },
  });
}

function denialReason(output) {
  const decision = JSON.parse(output).hookSpecificOutput;
  assert.equal(decision.hookEventName, 'PreToolUse');
  assert.equal(decision.permissionDecision, 'deny');
  return decision.permissionDecisionReason;
}

function holdFolder() {
  return join(tmpdir(), HOLD_STATE);
}

/** The one shared file listing the actions this session and agent already held. */
function stateFile(sessionId, agentId = 'root') {
  const name = createHash('sha256').update(JSON.stringify([sessionId, agentId])).digest('hex');
  return join(holdFolder(), `${name}.json`);
}

/** Only this test's own files. Never a sweep of a folder other sessions share. */
function holdFileCount() {
  return existsSync(holdFolder()) ? readdirSync(holdFolder()).length : 0;
}

function session(t, name) {
  const sessionId = `${name}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  t.after(() => rmSync(stateFile(sessionId), { force: true }));
  return sessionId;
}

function pullRequestInput(root, sessionId, command = 'gh pr create --title fixture --body fixture') {
  return {
    session_id: sessionId,
    turn_id: 'turn-one',
    cwd: root,
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command },
  };
}

test('pull-request identity changes with HEAD and includes the canonical project', t => {
  const root = repository(t);
  const first = JSON.parse(pullRequestActionKey(root));
  assert.deepEqual(first.slice(0, 3), ['pull-request-create', root, 'main']);
  commit(root, 'fixture two\n');
  const second = JSON.parse(pullRequestActionKey(root));
  assert.notEqual(second[3], first[3]);
});

test('close and merge identities retain the project and every ordered action with its command segment', t => {
  const root = repository(t);
  assert.deepEqual(
    JSON.parse(workItemActionKey('gh issue close 42', root)),
    ['work-item-actions', root, [['issue-close', 'gh issue close 42']]],
  );
  assert.deepEqual(
    JSON.parse(workItemActionKey('gh pr merge 42 --squash', root)),
    ['work-item-actions', root, [['pull-request-merge', 'gh pr merge 42 --squash']]],
  );
  assert.deepEqual(
    JSON.parse(workItemActionKey('gh issue close 42 && gh pr merge 43', root)),
    ['work-item-actions', root, [
      ['issue-close', 'gh issue close 42'],
      ['pull-request-merge', 'gh pr merge 43'],
    ]],
  );
  assert.notEqual(
    workItemActionKey('gh issue close 42 && gh pr merge 43', root),
    workItemActionKey('gh issue close 42 && gh pr merge 99', root),
  );
});

test('different close commands get different keys and the same command repeats its key', t => {
  const root = repository(t);
  assert.notEqual(
    workItemActionKey('gh issue close --repo my-org/repo-2 374', root),
    workItemActionKey('gh issue close 2', root),
  );
  assert.equal(
    workItemActionKey('gh issue close 2', root),
    workItemActionKey('gh issue close 2', root),
  );
});

test('pull-request creation is held once, names the action, and allows a plain retry', t => {
  const root = repository(t);
  const sessionId = session(t, 'pull-request-hold');
  const input = pullRequestInput(root, sessionId);

  const reason = denialReason(runHook(saveReminder, input));
  assert.match(reason, /Held action: gh pr create on branch main at [0-9a-f]{7}\./);
  assert.match(reason, /Review what this action needs saved/);
  assert.match(reason, /run the same command again/);
  assert.match(reason, /If you are a helper agent, stop and report this to the main agent\./);
  assert.doesNotMatch(reason, /nonce|generation=|knowledge-completion\.mjs review/);

  assert.equal(runHook(saveReminder, input), '', 'the identical retry is allowed');
  assert.equal(runHook(saveReminder, input), '', 'it stays allowed for the rest of the session');
});

test('a new HEAD holds pull-request creation again', t => {
  const root = repository(t);
  const sessionId = session(t, 'pull-request-head');
  const input = pullRequestInput(root, sessionId);

  denialReason(runHook(saveReminder, input));
  assert.equal(runHook(saveReminder, input), '');
  commit(root, 'fixture two\n');
  assert.match(denialReason(runHook(saveReminder, input)), /Held action: gh pr create on branch main/);
});

test('closing an issue and merging a pull request are each held once, then allowed', t => {
  const root = repository(t);
  for (const command of ['gh issue close 42', 'gh pr merge 43 --squash']) {
    const sessionId = session(t, 'work-item-hold');
    const input = { ...pullRequestInput(root, sessionId), tool_input: { command } };
    const reason = denialReason(runHook(workItemClose, input));
    assert.ok(reason.includes(`Held action: ${command}.`), `the denial names ${command}`);
    assert.match(reason, /Review what this action needs saved/);
    assert.match(reason, /run the same command again/);
    assert.doesNotMatch(reason, /nonce|generation=|knowledge-completion\.mjs review/);
    assert.equal(runHook(workItemClose, input), '', `the identical ${command} retry is allowed`);
  }
});

test('a changed later action in a compound close command is held again', t => {
  const root = repository(t);
  const sessionId = session(t, 'compound-work-item');
  const input = { ...pullRequestInput(root, sessionId), tool_input: { command: 'gh issue close 42 && gh pr merge 43' } };

  const reason = denialReason(runHook(workItemClose, input));
  assert.ok(reason.includes('Held action: gh issue close 42, gh pr merge 43.'));
  assert.equal(runHook(workItemClose, input), '');

  const changed = { ...input, tool_input: { command: 'gh issue close 42 && gh pr merge 99' } };
  assert.ok(denialReason(runHook(workItemClose, changed)).includes('gh pr merge 99'));
});

test('a mixed pull-request and close command is denied by both hooks and records nothing', t => {
  const root = repository(t);
  const sessionId = session(t, 'mixed-action');
  const mixed = 'gh pr create --title fixture --body fixture && gh issue close 42';
  const input = pullRequestInput(root, sessionId, mixed);

  const reasons = [
    denialReason(runHook(saveReminder, input)),
    denialReason(runHook(saveReminder, input)),
    denialReason(runHook(workItemClose, input)),
    denialReason(runHook(workItemClose, input)),
  ];
  assert.equal(new Set(reasons).size, 1);
  assert.match(reasons[0], /Run them as separate commands/);
  assert.equal(existsSync(stateFile(sessionId)), false, 'no held action was recorded');

  const plain = pullRequestInput(root, sessionId);
  assert.match(denialReason(runHook(saveReminder, plain)), /Held action: gh pr create/);
  assert.equal(runHook(saveReminder, plain), '');
});

test('both hooks share one held list without holding each other actions', t => {
  const root = repository(t);
  const sessionId = session(t, 'shared-list');
  const pullRequest = pullRequestInput(root, sessionId);
  const close = { ...pullRequest, tool_input: { command: 'gh issue close 42' } };

  denialReason(runHook(saveReminder, pullRequest));
  assert.match(denialReason(runHook(workItemClose, close)), /Held action: gh issue close 42\./);
  assert.equal(runHook(saveReminder, pullRequest), '');
  assert.equal(runHook(workItemClose, close), '');
  const held = JSON.parse(readFileSync(stateFile(sessionId), 'utf8')).actions;
  assert.equal(held.length, 2, 'one file holds both actions');
});

test('leading cd binds the hold to the target repository while false guards gh', t => {
  const sessionRoot = repository(t);
  const targetRoot = repository(t);
  const canonicalTarget = realpathSync(targetRoot);
  const sessionId = session(t, 'leading-cd');
  const fakeBin = mkdtempSync(join(tmpdir(), 'knowledge-fake-gh-'));
  const sentinel = join(fakeBin, 'invoked');
  const fakeGh = join(fakeBin, 'gh');
  t.after(() => rmSync(fakeBin, { recursive: true, force: true }));
  writeFileSync(fakeGh, '#!/bin/sh\nprintf invoked > "$GH_SENTINEL"\n');
  chmodSync(fakeGh, 0o755);
  const command = `cd "${targetRoot}" && false && gh pr create --title fixture --body fixture`;
  assert.throws(() => execFileSync('/bin/sh', ['-c', command], {
    cwd: sessionRoot,
    env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH}`, GH_SENTINEL: sentinel },
  }));
  assert.equal(existsSync(sentinel), false, 'the false guard prevents even the fake gh executable from running');

  denialReason(runHook(saveReminder, pullRequestInput(sessionRoot, sessionId, command)));
  const held = JSON.parse(readFileSync(stateFile(sessionId), 'utf8')).actions;
  assert.equal(held.length, 1);
  assert.ok(held[0].includes(canonicalTarget), 'the held action names the target repository');
  assert.ok(!held[0].includes(realpathSync(sessionRoot)), 'the session repository is not the held action');
  assert.equal(runHook(saveReminder, pullRequestInput(sessionRoot, sessionId, command)), '');
  assert.match(
    denialReason(runHook(saveReminder, pullRequestInput(sessionRoot, sessionId))),
    /Held action: gh pr create/,
    'the session repository is still held on its own first attempt',
  );
});

test('a host that sends no session id is never held and writes no hold file', t => {
  const root = repository(t);
  const before = holdFileCount();
  for (const agent of ['root', 'worker']) {
    const { session_id, ...input } = pullRequestInput(root, 'unused');
    assert.equal(runHook(saveReminder, { ...input, agent_id: agent }), '');
  }
  assert.equal(holdFileCount(), before, 'no hold file was written for a session without an id');
});

test('session ids that differ only in punctuation do not share a hold', t => {
  const root = repository(t);
  for (const sessionId of ['a.b', 'a/b', 'a b']) {
    t.after(() => rmSync(stateFile(sessionId), { force: true }));
    const input = pullRequestInput(root, sessionId);
    assert.match(denialReason(runHook(saveReminder, input)), /Held action: gh pr create/,
      `${JSON.stringify(sessionId)} is held on its own first attempt`);
    assert.equal(runHook(saveReminder, input), '');
  }
});

test('the hold folder and file are private to the owner', {
  skip: process.platform === 'win32' ? 'POSIX modes only' : false,
}, t => {
  const root = repository(t);
  const sessionId = session(t, 'hold-modes');
  denialReason(runHook(saveReminder, pullRequestInput(root, sessionId)));
  assert.equal(statSync(holdFolder()).mode & 0o777, 0o700);
  assert.equal(statSync(stateFile(sessionId)).mode & 0o777, 0o600);
});

/**
 * The denial is written before the key is recorded, so a list that cannot be
 * written still denies this attempt and holds the same action again next time.
 * A read-only hold file makes the recording fail for real.
 */
test('a hold that cannot be recorded still denies and holds again', {
  skip: process.platform === 'win32' ? 'POSIX modes only' : false,
}, t => {
  const root = repository(t);
  const sessionId = session(t, 'unwritable-hold');
  const input = pullRequestInput(root, sessionId);
  denialReason(runHook(saveReminder, input));
  assert.equal(runHook(saveReminder, input), '');

  commit(root, 'fixture two\n');
  chmodSync(stateFile(sessionId), 0o400);
  assert.match(denialReason(runHook(saveReminder, input)), /Held action: gh pr create/,
    'the denial was already written when recording failed');
  assert.match(denialReason(runHook(saveReminder, input)), /Held action: gh pr create/,
    'the unrecorded action is held again');
  chmodSync(stateFile(sessionId), 0o600);
  denialReason(runHook(saveReminder, input));
  assert.equal(runHook(saveReminder, input), '', 'a writable list ends the repeated hold');
});

test('nonmatching commands remain untouched', t => {
  const root = repository(t);
  const sessionId = session(t, 'nonmatching');
  assert.equal(runHook(saveReminder, pullRequestInput(root, sessionId, 'git status --short')), '');
  assert.equal(existsSync(stateFile(sessionId)), false);
});

test('hooks reached through a symbolic link still run and hold the action', t => {
  const root = repository(t);
  // Deliberately not canonicalized: the link path must differ from the real module path.
  const linkParent = mkdtempSync(join(tmpdir(), 'knowledge-linked-hooks-'));
  const linked = join(linkParent, 'hooks');
  symlinkSync(resolve('plugins/second-brain/hooks'), linked, 'dir');
  t.after(() => rmSync(linkParent, { recursive: true, force: true }));
  for (const [file, command] of [
    ['save-reminder.mjs', 'gh pr create --title fixture --body fixture'],
    ['work-item-close.mjs', 'gh issue close 42'],
  ]) {
    const path = join(linked, file);
    assert.notEqual(realpathSync(path), path, 'the fixture path really passes through a link');
    const sessionId = session(t, 'linked-hook');
    const reason = denialReason(runHook(path, pullRequestInput(root, sessionId, command)));
    assert.match(reason, /Held action: /, `${file} holds the action through a link`);
  }
});

test('a repository with no commits still holds pull-request creation', t => {
  const root = mkdtempSync(join(tmpdir(), 'knowledge-unborn-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-b', 'main'], { cwd: root });
  const sessionId = session(t, 'unborn-hook');
  assert.doesNotThrow(() => pullRequestActionKey(root));
  const reason = denialReason(runHook(saveReminder, pullRequestInput(root, sessionId)));
  // With no commits there is no readable branch name, so the key falls back to the project path.
  assert.match(reason, /Held action: gh pr create on branch .* with no commits\./);
  assert.equal(runHook(saveReminder, pullRequestInput(root, sessionId)), '');
});

// protocol-guard K7 (#396 step 6): while the engine names K7, the general holds
// step aside; the knowledge-only branch message stays. Without it, both hold.
test('work finish is a close action, and K7 replaces the close and merge hold while the engine runs', t => {
  const root = repository(t);
  const session = `k7-close-${process.pid}-${Date.now()}`;
  const input = (command) => ({ session_id: session, cwd: root, tool_name: 'Bash', tool_input: { command } });
  assert.equal(runHook(workItemClose, input('node plugins/work-tracker/skills/work/scripts/work.mjs finish WI-1 --evidence x'), { TOOLKIT_PROTOCOL_ENGINE: `${session}:K4,CW,K7` }), '');
  // A child process that inherited another session's value still holds.
  assert.match(denialReason(runHook(workItemClose, input('gh issue close 7'), { TOOLKIT_PROTOCOL_ENGINE: 'parent-session:K4,CW,K7' })), /Finishing a work item/);
  assert.match(denialReason(runHook(workItemClose, input('gh -R o/r issue close 8'))), /Finishing a work item/);
  assert.match(denialReason(runHook(workItemClose, input('work finish WI-1 --evidence x'))), /Finishing a work item/);
  assert.equal(JSON.parse(workItemActionKey('work finish WI-2', root))[2][0][0], 'work-finish');
});
test('K7 replaces the general pull-request hold but not the knowledge-only branch message', t => {
  const root = repository(t);
  execFileSync('git', ['checkout', '-q', '-b', 'feature'], { cwd: root });
  commit(root, 'feature\n');
  const session = `k7-pr-${process.pid}-${Date.now()}`;
  const input = { session_id: session, cwd: root, tool_name: 'Bash', tool_input: { command: 'gh pr create --fill' } };
  assert.equal(runHook(saveReminder, input, { TOOLKIT_PROTOCOL_ENGINE: `${session}:K7` }), '');
  const knowledgeRoot = repository(t);
  execFileSync('git', ['checkout', '-q', '-b', 'save'], { cwd: knowledgeRoot });
  execFileSync('mkdir', ['-p', join(knowledgeRoot, 'knowledge')]);
  writeFileSync(join(knowledgeRoot, 'knowledge/note.md'), 'note\n');
  execFileSync('git', ['add', 'knowledge/note.md'], { cwd: knowledgeRoot });
  execFileSync('git', ['commit', '-q', '-m', 'note'], { cwd: knowledgeRoot });
  const kInput = { session_id: `${session}-k`, cwd: knowledgeRoot, tool_name: 'Bash', tool_input: { command: 'gh pr create --fill' } };
  assert.match(denialReason(runHook(saveReminder, kInput, { TOOLKIT_PROTOCOL_ENGINE: `${session}-k:K7` })), /changes only knowledge/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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

function runHook(path, input) {
  return execFileSync(process.execPath, [path], {
    cwd: input.cwd,
    input: JSON.stringify(input),
    encoding: 'utf8',
  });
}

function denialReason(output) {
  const decision = JSON.parse(output).hookSpecificOutput;
  assert.equal(decision.hookEventName, 'PreToolUse');
  assert.equal(decision.permissionDecision, 'deny');
  return decision.permissionDecisionReason;
}

/** The one shared file listing the actions this session and agent already held. */
function stateFile(sessionId, agentId = 'root') {
  return join(tmpdir(), HOLD_STATE, `${sessionId}-${agentId}.json`);
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { claimActionReview } from '../hooks/knowledge-completion.mjs';
import { pullRequestActionKey } from '../hooks/save-reminder.mjs';
import { workItemActionKey } from '../hooks/work-item-close.mjs';

const completion = resolve('plugins/second-brain/hooks/knowledge-completion.mjs');
const saveReminder = resolve('plugins/second-brain/hooks/save-reminder.mjs');
const workItemClose = resolve('plugins/second-brain/hooks/work-item-close.mjs');

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

function runHook(path, input) {
  return execFileSync(process.execPath, [path], {
    cwd: input.cwd,
    input: JSON.stringify(input),
    encoding: 'utf8',
  });
}

function runHookAsync(path, input) {
  return new Promise((accept, reject) => {
    const child = spawn(process.execPath, [path], { cwd: input.cwd });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) accept(stdout);
      else reject(new Error(`Hook exited ${code}: ${stderr}`));
    });
    child.stdin.end(JSON.stringify(input));
  });
}

function checkpointFrom(output) {
  const reason = JSON.parse(output).hookSpecificOutput.permissionDecisionReason;
  const generation = reason.match(/generation=([\w-]+)/)?.[1];
  const nonce = reason.match(/action=([\w-]+)/)?.[1];
  assert.ok(generation, 'denial names the current review generation');
  assert.ok(nonce, 'denial names the action occurrence');
  return { generation, nonce, reason };
}

function denialReason(output) {
  return JSON.parse(output).hookSpecificOutput.permissionDecisionReason;
}

function stateFile(root, sessionId, agentId = 'root') {
  const key = createHash('sha256')
    .update(JSON.stringify([realpathSync(root), sessionId, agentId]))
    .digest('hex');
  return join(tmpdir(), 'toolkit-knowledge-review', `${key}.json`);
}

test('pull-request identity changes with HEAD and includes the canonical project', t => {
  const root = repository(t);
  const first = JSON.parse(pullRequestActionKey(root));
  assert.deepEqual(first.slice(0, 3), ['pull-request-create', root, 'main']);
  writeFileSync(join(root, 'README.md'), 'fixture two\n');
  execFileSync('git', ['add', 'README.md'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'Change fixture'], { cwd: root });
  const second = JSON.parse(pullRequestActionKey(root));
  assert.notEqual(second[3], first[3]);
});

test('close and merge identities retain every ordered action, project, and item', t => {
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

test('hook denies, requires an action-specific record, allows once, then denies again', t => {
  const root = repository(t);
  const sessionId = `action-hook-${process.pid}-${Date.now()}`;
  const input = {
    session_id: sessionId,
    turn_id: 'turn-one',
    cwd: root,
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'gh pr create --title fixture --body fixture' },
  };
  const checkpointPath = stateFile(root, sessionId);
  t.after(() => rmSync(checkpointPath, { force: true }));

  const first = checkpointFrom(runHook(saveReminder, input));
  execFileSync(process.execPath, [completion, 'review', root, sessionId, 'root', first.generation, 'no-change']);
  const stillHeld = checkpointFrom(runHook(saveReminder, input));
  assert.equal(stillHeld.nonce, first.nonce);
  execFileSync(process.execPath, [
    completion,
    'review',
    root,
    sessionId,
    'root',
    first.generation,
    'saved',
    first.nonce,
  ]);
  assert.equal(runHook(saveReminder, input), '');
  const later = checkpointFrom(runHook(saveReminder, input));
  assert.notEqual(later.nonce, first.nonce);
});

test('concurrent matching retries can consume only one action receipt', async t => {
  const root = repository(t);
  const sessionId = `concurrent-hook-${process.pid}-${Date.now()}`;
  const input = {
    session_id: sessionId,
    turn_id: 'turn-one',
    cwd: root,
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'gh pr create --title fixture --body fixture' },
  };
  const checkpointPath = stateFile(root, sessionId);
  t.after(() => rmSync(checkpointPath, { force: true }));
  const first = checkpointFrom(runHook(saveReminder, input));
  execFileSync(process.execPath, [
    completion,
    'review',
    root,
    sessionId,
    'root',
    first.generation,
    'saved',
    first.nonce,
  ]);
  const outputs = await Promise.all([
    runHookAsync(saveReminder, input),
    runHookAsync(saveReminder, input),
  ]);
  assert.equal(outputs.filter(output => output === '').length, 1);
  const denied = outputs.find(output => output !== '');
  assert.equal(JSON.parse(denied).hookSpecificOutput.permissionDecision, 'deny');
});

test('close and merge hook uses the same action-specific deny and retry path', t => {
  const root = repository(t);
  for (const [index, command] of [
    'gh issue close 42',
    'gh pr merge 43 --squash',
  ].entries()) {
    const sessionId = `work-item-hook-${process.pid}-${Date.now()}-${index}`;
    const input = {
      session_id: sessionId,
      turn_id: 'turn-one',
      cwd: root,
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command },
    };
    const checkpointPath = stateFile(root, sessionId);
    t.after(() => rmSync(checkpointPath, { force: true }));

    const first = checkpointFrom(runHook(workItemClose, input));
    assert.match(first.reason, /A general turn outcome does not satisfy this action/);
    assert.match(first.reason, /If approval or a save remains unfinished/);
    execFileSync(process.execPath, [
      completion,
      'review',
      root,
      sessionId,
      'root',
      first.generation,
      'pending-approval',
      first.nonce,
    ]);
    assert.equal(runHook(workItemClose, input), '');
    assert.notEqual(checkpointFrom(runHook(workItemClose, input)).nonce, first.nonce);
  }
});

test('changing a later action in a compound close command invalidates the receipt', t => {
  const root = repository(t);
  const sessionId = `compound-work-item-${process.pid}-${Date.now()}`;
  const input = {
    session_id: sessionId,
    turn_id: 'turn-one',
    cwd: root,
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'gh issue close 42 && gh pr merge 43' },
  };
  const checkpointPath = stateFile(root, sessionId);
  t.after(() => rmSync(checkpointPath, { force: true }));

  const first = checkpointFrom(runHook(workItemClose, input));
  execFileSync(process.execPath, [
    completion,
    'review',
    root,
    sessionId,
    'root',
    first.generation,
    'no-change',
    first.nonce,
  ]);
  const changed = checkpointFrom(runHook(workItemClose, {
    ...input,
    tool_input: { command: 'gh issue close 42 && gh pr merge 99' },
  }));
  assert.notEqual(changed.nonce, first.nonce);
});

test('mixed PR-create and close commands never mutate or consume review state', async t => {
  const root = repository(t);
  const sessionId = `mixed-action-${process.pid}-${Date.now()}`;
  const base = {
    session_id: sessionId,
    turn_id: 'turn-one',
    cwd: root,
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
  };
  const pullRequestInput = {
    ...base,
    tool_input: { command: 'gh pr create --title fixture --body fixture' },
  };
  const mixedInput = {
    ...base,
    tool_input: { command: 'gh pr create --title fixture --body fixture && gh issue close 42' },
  };
  const checkpointPath = stateFile(root, sessionId);
  t.after(() => rmSync(checkpointPath, { force: true }));

  const pending = checkpointFrom(runHook(saveReminder, pullRequestInput));
  const sequential = [
    runHook(saveReminder, mixedInput),
    runHook(workItemClose, mixedInput),
    runHook(workItemClose, mixedInput),
    runHook(saveReminder, mixedInput),
  ].map(denialReason);
  assert.equal(new Set(sequential).size, 1);
  assert.match(sequential[0], /Run them as separate commands/);
  assert.equal(checkpointFrom(runHook(saveReminder, pullRequestInput)).nonce, pending.nonce);

  execFileSync(process.execPath, [
    completion,
    'review',
    root,
    sessionId,
    'root',
    pending.generation,
    'no-change',
    pending.nonce,
  ]);
  const concurrent = await Promise.all([
    runHookAsync(saveReminder, mixedInput),
    runHookAsync(workItemClose, mixedInput),
  ]);
  assert.equal(new Set(concurrent.map(denialReason)).size, 1);
  assert.equal(runHook(saveReminder, pullRequestInput), '');
});

test('leading cd binds the action checkpoint to the target repository while false guards gh', t => {
  const sessionRoot = repository(t);
  const targetRoot = repository(t);
  const canonicalTarget = realpathSync(targetRoot);
  const sessionId = `leading-cd-${process.pid}-${Date.now()}`;
  const targetState = stateFile(targetRoot, sessionId);
  const sessionState = stateFile(sessionRoot, sessionId);
  const fakeBin = mkdtempSync(join(tmpdir(), 'knowledge-fake-gh-'));
  const sentinel = join(fakeBin, 'invoked');
  const fakeGh = join(fakeBin, 'gh');
  t.after(() => {
    rmSync(targetState, { force: true });
    rmSync(sessionState, { force: true });
    rmSync(fakeBin, { recursive: true, force: true });
  });
  writeFileSync(fakeGh, '#!/bin/sh\nprintf invoked > "$GH_SENTINEL"\n');
  chmodSync(fakeGh, 0o755);
  const command = `cd "${targetRoot}" && false && gh pr create --title fixture --body fixture`;
  assert.throws(() => execFileSync('/bin/sh', ['-c', command], {
    cwd: sessionRoot,
    env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH}`, GH_SENTINEL: sentinel },
  }));
  assert.equal(existsSync(sentinel), false, 'the false guard prevents even the fake gh executable from running');

  const checkpoint = checkpointFrom(runHook(saveReminder, {
    session_id: sessionId,
    turn_id: 'turn-one',
    cwd: sessionRoot,
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command },
  }));
  assert.match(checkpoint.reason, new RegExp(`root=${JSON.stringify(canonicalTarget).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.equal(existsSync(targetState), true, 'the target repository owns the checkpoint');
  assert.equal(existsSync(sessionState), false, 'the session repository receives no checkpoint');
});

test('nonmatching commands remain untouched', t => {
  const root = repository(t);
  const output = runHook(saveReminder, {
    session_id: `nonmatching-${process.pid}-${Date.now()}`,
    turn_id: 'turn-one',
    cwd: root,
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'git status --short' },
  });
  assert.equal(output, '');
});

test('hooks reached through a symbolic link still run and hold the action', t => {
  const root = repository(t);
  // Deliberately not canonicalized: the link path must differ from the real module path.
  const linkParent = mkdtempSync(join(tmpdir(), 'knowledge-linked-hooks-'));
  const linked = join(linkParent, 'hooks');
  symlinkSync(resolve('plugins/second-brain/hooks'), linked, 'dir');
  t.after(() => rmSync(linkParent, { recursive: true, force: true }));
  for (const [index, [file, command]] of [
    ['save-reminder.mjs', 'gh pr create --title fixture --body fixture'],
    ['work-item-close.mjs', 'gh issue close 42'],
  ].entries()) {
    const path = join(linked, file);
    assert.notEqual(realpathSync(path), path, 'the fixture path really passes through a link');
    const sessionId = `linked-hook-${process.pid}-${Date.now()}-${index}`;
    const checkpointPath = stateFile(root, sessionId);
    t.after(() => rmSync(checkpointPath, { force: true }));
    const output = runHook(path, {
      session_id: sessionId,
      turn_id: 'turn-one',
      cwd: root,
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command },
    });
    assert.ok(checkpointFrom(output).nonce, `${file} holds the action through a link`);
  }
});

test('an existing lock holds the action, names its file, and is never removed by another caller', t => {
  const root = repository(t);
  const directory = join(root, 'temporary');
  const identity = { session_id: 'lock-session', agent_id: 'root', turn_id: 'turn-one' };
  assert.equal(claimActionReview(root, identity, 'action-a', directory).status, 'review-required');
  const key = createHash('sha256')
    .update(JSON.stringify([realpathSync(root), identity.session_id, 'root']))
    .digest('hex');
  const lock = join(directory, `${key}.json.lock`);
  writeFileSync(lock, '');
  assert.deepEqual(claimActionReview(root, identity, 'action-a', directory), { status: 'busy', lock });
  assert.equal(existsSync(lock), true, 'the lock is left for its owner to release or the owner to inspect');
});

/**
 * A release that cannot remove the lock must not throw into the hook's
 * fail-open path. An append-only directory lets the lock be created and then
 * refuses to let it be unlinked, so the release fails for real.
 */
test('a release that cannot remove the lock does not throw', {
  skip: process.platform === 'darwin' ? false : 'chflags is macOS-only',
}, t => {
  const root = repository(t);
  const directory = join(root, 'temporary');
  const identity = { session_id: 'release-session', agent_id: 'root', turn_id: 'turn-one' };
  assert.equal(claimActionReview(root, identity, 'action-a', directory).status, 'review-required');
  const key = createHash('sha256')
    .update(JSON.stringify([realpathSync(root), identity.session_id, 'root']))
    .digest('hex');
  execFileSync('chflags', ['uappnd', directory]);
  try {
    let result;
    assert.doesNotThrow(() => {
      result = claimActionReview(root, { ...identity, turn_id: 'turn-two' }, 'action-a', directory);
    });
    assert.deepEqual(result, { status: 'stale-turn' });
    assert.equal(
      existsSync(join(directory, `${key}.json.lock`)),
      true,
      'the lock really could not be removed',
    );
  } finally {
    execFileSync('chflags', ['nouappnd', directory]);
  }
});

test('hook busy message names the lock file', t => {
  const root = repository(t);
  const sessionId = `busy-hook-${process.pid}-${Date.now()}`;
  const checkpointPath = stateFile(root, sessionId);
  const lock = `${checkpointPath}.lock`;
  t.after(() => { rmSync(lock, { force: true }); rmSync(checkpointPath, { force: true }); });
  const input = {
    session_id: sessionId,
    turn_id: 'turn-one',
    cwd: root,
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'gh pr create --title fixture --body fixture' },
  };
  checkpointFrom(runHook(saveReminder, input));
  writeFileSync(lock, '');
  const reason = denialReason(runHook(saveReminder, input));
  assert.ok(reason.includes(lock), 'the denial names the lock file');
});

test('a repository with no commits still holds pull-request creation', t => {
  const root = mkdtempSync(join(tmpdir(), 'knowledge-unborn-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-b', 'main'], { cwd: root });
  const sessionId = `unborn-hook-${process.pid}-${Date.now()}`;
  const checkpointPath = stateFile(root, sessionId);
  t.after(() => rmSync(checkpointPath, { force: true }));
  assert.doesNotThrow(() => pullRequestActionKey(root));
  const output = runHook(saveReminder, {
    session_id: sessionId,
    turn_id: 'turn-one',
    cwd: root,
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'gh pr create --title fixture --body fixture' },
  });
  assert.ok(checkpointFrom(output).nonce);
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

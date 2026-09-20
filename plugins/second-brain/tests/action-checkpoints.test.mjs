import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

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
    ['work-item-actions', root, [['issue-close', '42']]],
  );
  assert.deepEqual(
    JSON.parse(workItemActionKey('gh pr merge 42 --squash', root)),
    ['work-item-actions', root, [['pull-request-merge', '42']]],
  );
  assert.deepEqual(
    JSON.parse(workItemActionKey('gh issue close 42 && gh pr merge 43', root)),
    ['work-item-actions', root, [['issue-close', '42'], ['pull-request-merge', '43']]],
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

// Tests for the fifth independent review (2026-09-26): worktrees and symlinked
// paths. Each test failed on the engine at commit 3defc11 and passes after the fix.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeProject, ok, isDeny, isAllow } from './helpers.mjs';
import * as hooks from '../engine/hooks.mjs';
import { run } from '../engine/cli.mjs';

const PLUGIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFor = (proj) => ({ CLAUDE_PROJECT_DIR: proj, CLAUDE_PLUGIN_ROOT: PLUGIN, PATH: '/usr/bin:/bin' });
const base = (cwd, event) => ({ session_id: 's1', cwd, hook_event_name: event });
const prompt = (proj, cwd, text) => hooks.userPromptSubmit({ ...base(cwd, 'UserPromptSubmit'), prompt: text }, envFor(proj));
const pre = (proj, cwd, tool, input) => hooks.preToolUse({ ...base(cwd, 'PreToolUse'), tool_name: tool, tool_input: input }, envFor(proj));

// A git worktree of the project: its own folder, with the committed memory/.
function withWorktree() {
  const proj = makeProject();
  const wt = path.join(proj, '.claude', 'worktrees', 'x');
  fs.mkdirSync(wt, { recursive: true });
  fs.writeFileSync(path.join(wt, '.git'), 'gitdir: ../../../.git/worktrees/x\n');
  assert.equal(run(['init'], { cwd: wt, env: {} }).code, 0);
  prompt(proj, proj, 'hi');
  ok(proj, ['route', 'chat']);
  return { proj, wt };
}

test('1: in a worktree, writes to its memory/, work/, and .flow/ are refused', () => {
  const { proj, wt } = withWorktree();
  assert.ok(isDeny(pre(proj, wt, 'Write', { file_path: path.join(wt, 'memory', 'topics', 'fact-x.md'), content: 'x' })));
  assert.ok(isDeny(pre(proj, wt, 'Edit', { file_path: 'memory/config.json', old_string: 'onboarding', new_string: 'trusted' })));
  assert.ok(isDeny(pre(proj, wt, 'Bash', { command: 'sed -i s/a/b/ memory/INDEX.md' })));
  assert.ok(isDeny(pre(proj, wt, 'Bash', { command: 'echo x > work/1-x/ITEM.md' })));
  assert.ok(isDeny(pre(proj, wt, 'Bash', { command: 'git checkout -- .' })));
  // From the session root too, by path.
  assert.ok(isDeny(pre(proj, proj, 'Write', { file_path: path.join(wt, 'memory', 'config.json'), content: '{}' })));
  // Other files in the worktree are not guarded.
  assert.equal(pre(proj, wt, 'Write', { file_path: path.join(wt, 'src', 'a.js'), content: 'x' }), null);
});

test('1: flow in a worktree gets no automatic approval and no owner-gated commands', () => {
  const { proj, wt } = withWorktree();
  assert.equal(pre(proj, wt, 'Bash', { command: 'flow status' }), null);
  assert.ok(isDeny(pre(proj, wt, 'Bash', { command: 'flow memory approve mem-abcdef' })));
  assert.ok(isAllow(pre(proj, proj, 'Bash', { command: 'flow status' })));
});

test('2: a symlinked project path neither opens the guard nor trips the root check', () => {
  const proj = makeProject();
  const link = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sbf-link-')), 'proj');
  fs.symlinkSync(proj, link);
  prompt(proj, proj, 'hi');
  ok(proj, ['route', 'chat']);
  // The session root is the real path; the cwd and the target use the link.
  assert.ok(isDeny(pre(proj, link, 'Write', { file_path: path.join(link, 'memory', 'config.json'), content: '{}' })));
  assert.ok(isDeny(pre(proj, link, 'Bash', { command: 'rm memory/config.json' })));
  assert.ok(isAllow(pre(proj, link, 'Bash', { command: 'flow status' })), 'the same project through a link is not a different root');
  // And the other way round: the session root is the link.
  assert.ok(isDeny(pre(link, proj, 'Write', { file_path: path.join(proj, '.flow', 'sessions', 's1.json'), content: '{}' })));
  // A symlink inside the project that points into memory/ is followed.
  fs.symlinkSync(path.join(proj, 'memory'), path.join(proj, 'mem'));
  assert.ok(isDeny(pre(proj, proj, 'Write', { file_path: path.join(proj, 'mem', 'config.json'), content: '{}' })));
});

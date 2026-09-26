// Tests for the fourth independent review (2026-09-26): the project root comes
// from the session, not the cwd. Each test failed on the engine at commit
// 89dc3ae and passes after the fix.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeProject, ok, isDeny, isAllow } from './helpers.mjs';
import * as hooks from '../engine/hooks.mjs';
import { run } from '../engine/cli.mjs';

const PLUGIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// A project with a nested repository at sub/ (a submodule or vendored repo).
function nested() {
  const proj = makeProject();
  const sub = path.join(proj, 'sub');
  fs.mkdirSync(path.join(sub, '.git'), { recursive: true });
  return { proj, sub };
}

const hookEnv = (proj) => ({ CLAUDE_PROJECT_DIR: proj, CLAUDE_PLUGIN_ROOT: PLUGIN, PATH: '/usr/bin:/bin' });
const base = (cwd, event) => ({ session_id: 's1', cwd, hook_event_name: event });
const prompt = (proj, cwd, text) => hooks.userPromptSubmit({ ...base(cwd, 'UserPromptSubmit'), prompt: text }, hookEnv(proj));
const pre = (proj, cwd, tool, input) => hooks.preToolUse({ ...base(cwd, 'PreToolUse'), tool_name: tool, tool_input: input }, hookEnv(proj));
const flowIn = (cwd, args, env = { FLOW_SESSION_ID: 's1' }) => run(args, { cwd, env, stdin: () => '' });

test('a: hooks and flow commands in a nested repository never set up a second project', () => {
  const { proj, sub } = nested();
  const envFile = path.join(proj, 'env.sh');
  hooks.sessionStart({ ...base(sub, 'SessionStart'), source: 'startup' }, { ...hookEnv(proj), CLAUDE_ENV_FILE: envFile });
  assert.match(fs.readFileSync(envFile, 'utf8'), new RegExp(`export FLOW_PROJECT_ROOT='${proj}'`));
  prompt(proj, sub, 'hi');
  assert.equal(pre(proj, sub, 'Bash', { command: 'flow status' }), null, 'no automatic allow when the cwd is another project');
  const r = flowIn(sub, ['status']);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /Run `flow init`/);
  for (const name of ['memory', 'work', '.flow', '.gitignore']) assert.ok(!fs.existsSync(path.join(sub, name)), `sub/${name} was not created`);
  // With the root from the session start hook, flow works from sub/ on the real project.
  assert.match(flowIn(sub, ['status'], { FLOW_SESSION_ID: 's1', FLOW_PROJECT_ROOT: proj }).stdout, /Session s1/);
});

test('b: the write guard protects the session root from a nested cwd', () => {
  const { proj, sub } = nested();
  prompt(proj, sub, 'hi');
  ok(proj, ['route', 'chat']);
  assert.ok(isDeny(pre(proj, sub, 'Write', { file_path: path.join(proj, '.flow', 'sessions', 's1.json'), content: '{}' })));
  assert.ok(isDeny(pre(proj, sub, 'Bash', { command: 'rm ../memory/config.json' })));
  assert.ok(isDeny(pre(proj, sub, 'Bash', { command: 'echo x > ../work/1-x/ITEM.md' })));
  assert.equal(pre(proj, sub, 'Bash', { command: 'rm notes.txt' }), null);
});

test('c: owner permission lives outside the session file and counts only for its own turn', () => {
  const { proj, sub } = nested();
  prompt(proj, proj, 'hi');
  ok(proj, ['route', 'chat']);
  // Forge the permission in the session file: neither the hook nor flow accepts it.
  const file = path.join(proj, '.flow', 'sessions', 's1.json');
  const session = JSON.parse(fs.readFileSync(file, 'utf8'));
  session.turn.trustPermission = 'on';
  fs.writeFileSync(file, JSON.stringify(session));
  assert.ok(isDeny(pre(proj, proj, 'Bash', { command: 'flow trust set on' })));
  assert.match(flowIn(proj, ['trust', 'set', 'on']).stderr, /Only the owner/);

  // The real owner command works in its own turn, and not in the next one.
  prompt(proj, proj, '/second-brain-flow:trust on');
  assert.equal(isDeny(pre(proj, proj, 'Bash', { command: 'flow trust set on' })), false);
  prompt(proj, proj, 'thanks');
  assert.match(flowIn(proj, ['trust', 'set', 'on']).stderr, /Only the owner/, 'a permission from an earlier turn does not count');

  // Owner-gated commands are refused from a nested repository.
  prompt(proj, sub, '/second-brain-flow:trust on');
  assert.ok(isDeny(pre(proj, sub, 'Bash', { command: 'flow trust set on' })));
  assert.ok(isDeny(pre(proj, sub, 'Bash', { command: 'flow memory approve mem-abcdef' })));
  assert.equal(JSON.parse(fs.readFileSync(path.join(proj, 'memory', 'config.json'), 'utf8')).mode, 'onboarding');
});

// Tests for the sixth independent review (2026-09-26): a symlinked memory/
// folder, and app folders that happen to hold memory/config.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeProject, ok, isDeny } from './helpers.mjs';
import * as hooks from '../engine/hooks.mjs';

const PLUGIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFor = (proj) => ({ CLAUDE_PROJECT_DIR: proj, CLAUDE_PLUGIN_ROOT: PLUGIN, PATH: '/usr/bin:/bin' });
const base = (cwd, event) => ({ session_id: 's1', cwd, hook_event_name: event });
const pre = (proj, cwd, tool, input) => hooks.preToolUse({ ...base(cwd, 'PreToolUse'), tool_name: tool, tool_input: input }, envFor(proj));
const routed = (proj) => {
  hooks.userPromptSubmit({ ...base(proj, 'UserPromptSubmit'), prompt: 'hi' }, envFor(proj));
  ok(proj, ['route', 'chat']);
};

test('1: a memory/ folder that is a symlink to another folder is still guarded', () => {
  const proj = makeProject();
  const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'sbf-shared-'));
  fs.cpSync(path.join(proj, 'memory'), elsewhere, { recursive: true });
  fs.rmSync(path.join(proj, 'memory'), { recursive: true });
  fs.symlinkSync(elsewhere, path.join(proj, 'memory'));
  routed(proj);
  assert.ok(isDeny(pre(proj, proj, 'Write', { file_path: path.join(proj, 'memory', 'topics', 'x.md'), content: 'x' })));
  assert.ok(isDeny(pre(proj, proj, 'Write', { file_path: 'memory/config.json', content: '{}' })));
  assert.ok(isDeny(pre(proj, proj, 'Bash', { command: 'echo hi > memory/FOCUS.md' })));
});

test('1: a .flow/ folder that is a symlink is still guarded', () => {
  const proj = makeProject();
  const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'sbf-flow-'));
  fs.cpSync(path.join(proj, '.flow'), elsewhere, { recursive: true });
  fs.rmSync(path.join(proj, '.flow'), { recursive: true });
  fs.symlinkSync(elsewhere, path.join(proj, '.flow'));
  routed(proj);
  assert.ok(isDeny(pre(proj, proj, 'Write', { file_path: '.flow/owner/s1.json', content: '{}' })));
});

test('2: an app folder with memory/config.json that is not flow config is not guarded', () => {
  const proj = makeProject();
  routed(proj);
  const lib = path.join(proj, 'src', 'lib');
  fs.mkdirSync(path.join(lib, 'memory'), { recursive: true });
  fs.writeFileSync(path.join(lib, 'memory', 'config.json'), '{"cacheSize": 10}');
  assert.equal(isDeny(pre(proj, proj, 'Write', { file_path: path.join(lib, 'memory', 'store.ts'), content: 'x' })), false);
  assert.equal(isDeny(pre(proj, proj, 'Write', { file_path: path.join(lib, 'work', 'job.ts'), content: 'x' })), false);
});

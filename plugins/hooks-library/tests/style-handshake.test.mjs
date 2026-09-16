#!/usr/bin/env node
// Run: node plugins/hooks-library/tests/style-handshake.test.mjs
// Subprocess tests use synthetic projects and the captured Claude Code text-Read shape.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const hook = join(project, 'plugins/hooks-library/hooks/style-handshake.mjs');
const temp = mkdtempSync(join(tmpdir(), 'style-handshake-test-'));
const root = join(temp, 'project with spaces');
const userDir = join(temp, 'user');
const state = join(temp, 'state');
const style = join(root, '.claude/output-styles/plain-english.md');
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; }
function put(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof value === 'string' ? value : JSON.stringify(value));
}
function run(input, env = {}, args = []) {
  return execFileSync(process.execPath, [hook, ...args], {
    input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8', timeout: 5000,
    env: { ...process.env, CLAUDE_PROJECT_DIR: root, CLAUDE_CONFIG_DIR: userDir,
      STYLE_HANDSHAKE_STATE_DIR: state, ...env },
  });
}
function event(name, extra = {}) {
  return { hook_event_name: name, session_id: 'session-a', cwd: root, ...extra };
}
function prompt(extra = {}, env = {}) { return run(event('UserPromptSubmit', { prompt: 'Hello', ...extra }), env); }
function read(extra = {}, env = {}) {
  return run(event('PostToolUse', { tool_name: 'Read', tool_input: { file_path: style },
    tool_response: { type: 'text', file: { startLine: 1, numLines: 4, totalLines: 4 } }, ...extra }), env);
}
function text(output) { return JSON.parse(output).hookSpecificOutput.additionalContext; }
function markers() { return readdirSync(state).filter(file => file.endsWith('.read')); }

try {
  put(join(root, '.claude/settings.json'), { outputStyle: 'Plain English' });
  put(style, '---\nname: Plain English\n---\nUse plain words.\n');
  mkdirSync(userDir, { recursive: true });
  const first = prompt();
  check(JSON.parse(first).hookSpecificOutput.hookEventName === 'UserPromptSubmit', 'reminder uses the prompt event');
  check(text(first).includes('Read tool') && text(first).includes('whole file'), 'request an explicit whole-file read');
  check(text(first).includes('I read the output style and will follow it.'), 'request the approved acknowledgment');
  check(text(first).includes('even if the style says no preamble'), 'resolve the existing no-preamble conflict');
  check(!JSON.parse(first).decision, 'never block the submitted prompt');
  check(text(first).includes('plain-english.md'), 'give the selected path');
  check(markers().length === 0, 'delivering the reminder does not count as a Read');
  check(read({ tool_name: 'Bash' }) === '', 'ignore other tools');
  check(read({ tool_response: undefined }) === '', 'no success claim without a read result');
  check(read({ hook_event_name: 'PostToolUseFailure' }) === '', 'ignore failed reads');
  check(read({ tool_response: { type: 'text', file: { startLine: 1, numLines: 1, totalLines: 4 } } }) === '', 'partial preview does not count');
  check(read({ tool_response: { type: 'text', file: { startLine: 2, numLines: 4, totalLines: 4 } } }) === '', 'read starting in the middle does not count');
  check(read({ agent_id: 'child-agent' }) === '', 'a child agent read cannot satisfy the main conversation');
  const otherStyle = join(temp, 'other/output-styles/plain-english.md');
  put(otherStyle, 'Unrelated style');
  check(read({ tool_input: { file_path: otherStyle } }) === '', 'same filename in another project does not count');
  check(read({ session_id: 'session-b' }) === '', 'another session cannot use the pending request');
  check(text(read()).includes('full output style file was returned'), 'a complete successful read prompts acknowledgment');
  check(markers().length === 1, 'record the observed read');
  check(read() === '', 'repeated reads produce no duplicate acknowledgment reminder');
  prompt();
  check(text(read()).includes('Now send'), 'identical next prompt starts a new handshake without prompt_id');
  prompt({ prompt_id: 'new-turn' });
  check(read({ prompt_id: 'old-turn' }) === '', 'ignore a delayed read from a previous identified turn');
  check(text(read({ prompt_id: 'new-turn' })).includes('Now send'), 'matching actual prompt identifiers work');
  prompt({ session_id: 'session-b' });
  check(text(read({ session_id: 'session-b' })).includes('Now send'), 'concurrent session maintains its own handshake');
  check(read() === '', 'another session reset does not reset this one');
  check(text(prompt({ prompt: '?' })).includes('Read tool'), 'short prompts get the handshake');
  check(text(prompt({ prompt: 'long '.repeat(1000) })).includes('Read tool'), 'long prompts get the handshake');
  check(run(event('Stop', { last_assistant_message: 'long '.repeat(1000) })) === '', 'Stop never restarts an answer');
  check(run('', {}, ['confirm', 'old-key']) === '', 'old confirm calls are harmless and read no stdin');
  check(run('not json') === '', 'malformed input fails open');
  check(run('null') === '', 'null input fails open');
  check(prompt({ session_id: '' }) === '', 'missing session does not create shared anonymous state');
  check(prompt({ agent_id: 'child-agent' }) === '', 'skip child-agent prompt events');
  const alias = join(root, '.claude/output-styles/unrelated-filename.md');
  put(alias, '---\nname: "Custom Style"\n---\nBe brief.');
  put(join(root, '.claude/settings.local.json'), { outputStyle: 'Custom Style' });
  check(text(prompt()).includes('unrelated-filename.md'), 'local selection and frontmatter name beat filename assumptions');
  check(read() === '', 'old selected style no longer satisfies the new turn');
  rmSync(join(root, '.claude/settings.local.json'));
  put(join(root, '.claude/settings.json'), { outputStyle: 'Missing Style' });
  check(text(prompt()).includes('do not claim you read it'), 'missing style gets an honest limitation');
  check(read() === '', 'missing style invalidates the previous turn');
  put(join(root, '.claude/settings.json'), '{');
  check(text(prompt()).includes('could not be located or read'), 'invalid settings do not silently choose another style');
  put(join(root, '.claude/settings.json'), {});
  put(join(userDir, 'settings.json'), { outputStyle: 'User Style' });
  put(join(userDir, 'output-styles/user-style.md'), '---\nname: User Style\n---\nBe clear.');
  check(text(prompt()).includes('user-style.md'), 'user style is found when project has no selection');
  put(join(root, '.claude/settings.json'), { outputStyle: 'Plain English' });
  const brokenState = join(temp, 'not-a-directory');
  put(brokenState, 'x');
  check(text(prompt({}, { STYLE_HANDSHAKE_STATE_DIR: brokenState })).includes('Read tool'), 'tracking failure must not suppress delivery');
  prompt();
  for (const name of readdirSync(state).filter(name => name.endsWith('.json'))) {
    const path = join(state, name);
    const record = JSON.parse(readFileSync(path));
    record.startedAt = Date.now() - 25 * 60 * 60 * 1000;
    put(path, record);
  }
  check(read() === '', 'expired request does not prompt a success acknowledgment');
  const expired = join(state, `${'a'.repeat(64)}-aaaa.read`);
  const preserved = join(state, 'unrelated.txt');
  put(expired, ''); put(preserved, '');
  utimesSync(expired, 0, 0); utimesSync(preserved, 0, 0);
  prompt();
  check(!readdirSync(state).includes(`${'a'.repeat(64)}-aaaa.read`), 'old owned marker expires');
  check(readdirSync(state).includes('unrelated.txt'), 'cleanup preserves unrelated files');
  prompt({}, { CLAUDE_PROJECT_DIR: '' });
  check(text(read({}, { CLAUDE_PROJECT_DIR: '' })).includes('Now send'), 'cwd fallback works');
  const nested = join(root, 'nested'); mkdirSync(nested);
  prompt();
  check(text(read({ cwd: nested })).includes('Now send'), 'project root remains stable after cwd changes');
  if (process.platform === 'win32') {
    prompt();
    check(text(read({ tool_input: { file_path: style.toUpperCase().replaceAll('\\', '/') } })).includes('Now send'), 'Windows path case and separators match');
  }
  const settings = JSON.parse(readFileSync(join(project, '.claude/settings.json')));
  const calls = eventName => (settings.hooks[eventName] || []).flatMap(group => group.hooks)
    .filter(entry => JSON.stringify(entry).includes('style-handshake.mjs'));
  check(calls('UserPromptSubmit').length === 1, 'install exactly one prompt hook');
  check(calls('PostToolUse').length === 1, 'install exactly one read companion');
  check(calls('Stop').length === 0, 'no installed style Stop hook');
  check(!(settings.permissions?.allow || []).some(rule => rule.includes('style-handshake.mjs confirm')), 'old confirm permission removed');
  check(readFileSync(hook, 'utf8') === readFileSync(join(project, '.claude/hooks/style-handshake.mjs'), 'utf8'), 'source and installed copy agree');
  console.log(`${checks} passed, 0 failed`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}

#!/usr/bin/env node
// Run: node plugins/hooks-library/tests/style-handshake.test.mjs
// Subprocess tests use synthetic projects and the captured Claude Code text-Read shape.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const hook = join(project, 'plugins/hooks-library/hooks/style-handshake.mjs');
const temp = mkdtempSync(join(tmpdir(), 'style-handshake-test-'));
const root = join(temp, 'project with spaces');
const userDir = join(temp, 'user');
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
    env: { ...process.env, CLAUDE_PROJECT_DIR: root, CLAUDE_CONFIG_DIR: userDir, ...env },
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
function silentRequest(output, path, message) {
  const body = text(output);
  check(body.includes('Read tool') && body.includes('whole file'), `${message}: asks for a whole-file Read`);
  check(body.includes(path), `${message}: gives the selected path`);
  check(!body.includes('I read the output style'), `${message}: no acknowledgment sentence`);
  check(!/send the|say "/i.test(body), `${message}: nothing to send or say`);
  check(!/acknowledg(e|ment) "/i.test(body), `${message}: no quoted acknowledgment`);
}

try {
  put(join(root, '.claude/settings.json'), { outputStyle: 'Plain English' });
  put(style, '---\nname: Plain English\n---\nUse plain words.\n');
  mkdirSync(userDir, { recursive: true });

  // (a) The per-message read request is still sent, with the path, on every prompt.
  const first = prompt();
  check(JSON.parse(first).hookSpecificOutput.hookEventName === 'UserPromptSubmit', 'request uses the prompt event');
  check(!JSON.parse(first).decision, 'never block the submitted prompt');
  silentRequest(first, 'plain-english.md', 'first prompt');
  check(/silent/i.test(text(first)), 'the read is silent');
  check(/do not (announce|mention)/i.test(text(first)), 'tell the agent not to announce the read');
  check(!text(first).includes('Make this Read alone'), 'no batching clause');
  check(!text(first).includes('no preamble'), 'no preamble override clause');
  silentRequest(prompt({ prompt: '?' }), 'plain-english.md', 'short prompt');
  silentRequest(prompt({ prompt: 'long '.repeat(1000) }), 'plain-english.md', 'long prompt');
  check(prompt() === first, 'repeated identical prompts get the same request again');

  // (b) PostToolUse now says nothing, even for a complete Read of the style file.
  check(read() === '', 'complete style Read produces no output');
  check(read() === '', 'repeated style Read produces no output');
  check(read({ tool_name: 'Bash' }) === '', 'other tools produce no output');
  check(read({ agent_id: 'child-agent' }) === '', 'child-agent Read produces no output');

  // Kept behavior.
  check(prompt({ agent_id: 'child-agent' }) === '', 'skip child-agent prompt events');
  check(run(event('Stop', { last_assistant_message: 'long '.repeat(1000) })) === '', 'Stop is silent');
  check(run('', {}, ['confirm', 'old-key']) === '', 'old confirm calls are harmless and read no stdin');
  check(run('not json') === '', 'malformed input fails open');
  check(run('null') === '', 'null input fails open');

  // (c) No style file for the selected name, and no selection at all, are silent.
  put(join(root, '.claude/settings.json'), { outputStyle: 'Concise' });
  check(prompt() === '', 'a built-in name with no style file produces no output');
  put(join(root, '.claude/settings.json'), { outputStyle: 'Bogus Style' });
  check(prompt() === '', 'an unknown custom name with no style file produces no output');
  put(join(root, '.claude/settings.json'), {});
  check(prompt() === '', 'no selected style produces no output, even beside a style file');

  // (d) A style file that is found but cannot be read is reported.
  const brokenStyle = join(root, '.claude/output-styles/broken-style.md');
  mkdirSync(brokenStyle, { recursive: true });
  put(join(root, '.claude/settings.json'), { outputStyle: 'Broken Style' });
  check(text(prompt()).includes('could not be located or read'), 'an unreadable style file gets an honest limitation');
  const badEntry = join(root, '.claude/output-styles/notes.md');
  mkdirSync(badEntry, { recursive: true });
  put(join(root, '.claude/settings.json'), { outputStyle: 'Plain English' });
  silentRequest(prompt(), 'plain-english.md', 'a bad folder entry does not hide a valid style');
  rmSync(brokenStyle, { recursive: true });
  rmSync(badEntry, { recursive: true });

  const customConcise = join(root, '.claude/output-styles/my-concise.md');
  put(customConcise, '---\nname: Concise\n---\nCustom concise.');
  put(join(root, '.claude/settings.json'), { outputStyle: 'Concise' });
  silentRequest(prompt(), 'my-concise.md', 'custom file named like a built-in');
  rmSync(customConcise);

  const alias = join(root, '.claude/output-styles/unrelated-filename.md');
  put(alias, '---\nname: "Custom Style"\n---\nBe brief.');
  const other = join(root, '.claude/output-styles/other-style.md');
  put(other, '---\nname: "Other Style"\n---\nBe direct.');
  put(join(root, '.claude/settings.json'), { outputStyle: 'Custom Style' });
  put(join(root, '.claude/settings.local.json'), { outputStyle: 'Other Style' });
  silentRequest(prompt(), 'other-style.md', 'local settings win over project settings');
  rmSync(join(root, '.claude/settings.local.json'));
  silentRequest(prompt(), 'unrelated-filename.md', 'the frontmatter name beats filename assumptions');
  rmSync(other);
  put(join(root, '.claude/settings.json'), '{');
  check(text(prompt()).includes('could not be located or read'), 'invalid settings do not silently choose another style');
  put(join(root, '.claude/settings.json'), {});
  put(join(userDir, 'settings.json'), { outputStyle: 'User Style' });
  put(join(userDir, 'output-styles/user-style.md'), '---\nname: User Style\n---\nBe clear.');
  silentRequest(prompt(), 'user-style.md', 'user style is found when project has no selection');
  put(join(root, '.claude/settings.json'), { outputStyle: 'Plain English' });
  silentRequest(prompt({}, { CLAUDE_PROJECT_DIR: '' }), 'plain-english.md', 'cwd fallback works');
  const nested = join(root, 'nested'); mkdirSync(nested);
  silentRequest(prompt({ cwd: nested }), 'plain-english.md', 'project root stays stable when cwd is nested');

  const settings = JSON.parse(readFileSync(join(project, '.claude/settings.json')));
  const calls = eventName => (settings.hooks[eventName] || []).flatMap(group => group.hooks)
    .filter(entry => JSON.stringify(entry).includes('style-handshake.mjs'));
  check(calls('UserPromptSubmit').length === 1, 'install exactly one prompt hook');
  check(calls('PostToolUse').length === 0, 'no installed Read companion');
  check(calls('Stop').length === 0, 'no installed style Stop hook');
  check(!(settings.permissions?.allow || []).some(rule => rule.includes('style-handshake.mjs confirm')), 'old confirm permission removed');
  check(readFileSync(hook, 'utf8') === readFileSync(join(project, '.claude/hooks/style-handshake.mjs'), 'utf8'), 'source and installed copy agree');
  console.log(`${checks} passed, 0 failed`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}

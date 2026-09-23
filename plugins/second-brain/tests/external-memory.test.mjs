// External memory mode (#404): the hooks read `.toolkit-memory.json` and say
// where memory lives. A missing file keeps files mode exactly as it was.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import {
  knowledgeActive, memoryLayout, readMemoryConfig, resolveManual,
} from '../hooks/knowledge-manual.mjs';
import { loadKnowledge } from '../hooks/knowledge-session-start.mjs';
import { buildReminder, REMINDER } from '../hooks/memory-reminder.mjs';
import { beginReview, completion } from '../hooks/knowledge-completion.mjs';
import { buildDirectCommitMessage, buildMessage as prMessage, isKnowledgeOnly } from '../hooks/save-reminder.mjs';
import { buildMessage as closeMessage } from '../hooks/work-item-close.mjs';

const hooks = join(import.meta.dirname, '../hooks');
const manualSource = join(import.meta.dirname, '../skills/knowledge-setup/references/templates/knowledge/knowledge-manual.md');
const mem0 = { format: 1, memory: 'external', service: 'mem0', server: 'mem0', project: 'dragonfly' };
const hindsight = { format: 1, memory: 'external', service: 'hindsight', server: 'hs', project: 'dragonfly' };

function project(t, config = mem0, { manual = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'knowledge-external-hook-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (path, text) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); };
  if (config) write('.toolkit-memory.json', typeof config === 'string' ? config : JSON.stringify(config));
  write('SOUL.md', '# Soul\n');
  write('PROJECT.md', '# Project\n');
  if (manual) { mkdirSync(join(root, 'docs'), { recursive: true }); copyFileSync(manualSource, join(root, 'docs/knowledge-manual.md')); }
  return { root, write };
}

test('config: missing means files; valid external is read; invalid falls back to files with an error', t => {
  const none = project(t, null);
  assert.deepEqual(readMemoryConfig(none.root), { mode: 'files', service: null, server: null, project: null, error: null });
  assert.deepEqual(readMemoryConfig(project(t, mem0).root), { mode: 'external', service: 'mem0', server: 'mem0', project: 'dragonfly', error: null });
  assert.equal(readMemoryConfig(project(t, { format: 1, memory: 'files' }).root).error, null);
  for (const bad of ['{', '[]', { ...mem0, format: 2 }, { ...mem0, service: 'zep' }, { ...mem0, server: '' }, { ...mem0, server: 'a b' }, { ...mem0, project: ' ' }]) {
    const config = readMemoryConfig(project(t, bad).root);
    assert.equal(config.mode, 'files', JSON.stringify(bad)); assert.match(config.error, /^\.toolkit-memory\.json /);
  }
});

test('layout: files paths are today\'s; external moves the Git files and hands memory to the service', () => {
  assert.equal(memoryLayout('files').workingMemory, 'knowledge/memory/current.md');
  assert.equal(memoryLayout('files').knowledgeManual, 'knowledge/knowledge-manual.md');
  assert.deepEqual(
    Object.fromEntries(['projectContext', 'knowledgeManual', 'toolkitManual', 'prds', 'prdIndex', 'workingMemory', 'inbox'].map(k => [k, memoryLayout('external')[k]])),
    { projectContext: 'PROJECT.md', knowledgeManual: 'docs/knowledge-manual.md', toolkitManual: 'docs/toolkit-manual.md', prds: 'prds', prdIndex: 'prds/prd-index.md', workingMemory: null, inbox: null },
  );
});

test('startup (mem0): SOUL.md, PROJECT.md, then the exact tool for working memory and pending records', t => {
  const { root } = project(t, mem0);
  const out = loadKnowledge(root);
  const steps = [
    '1. Read `SOUL.md` in full.',
    '2. Read `PROJECT.md` in full.',
    '3. Load working memory (kind `working`) with `mcp__mem0__get_memories` with filters `{"AND":[{"app_id":"dragonfly"},{"metadata":{"toolkit_kind":"working"}}]}`',
    '4. List pending records (kind `pending`) with `mcp__mem0__get_memories` with filters `{"AND":[{"app_id":"dragonfly"},{"metadata":{"toolkit_kind":"pending"}}]}`',
    'references/memory-providers/mem0.md',
    'If the MCP server `mem0` is not connected, tell the owner. Pause only the work that needs memory.',
  ];
  let previous = -1;
  for (const step of steps) { const at = out.indexOf(step); assert.ok(at > previous, step); previous = at; }
  assert.doesNotMatch(out, /knowledge\/|memory-inbox|current\.md|Knowledge manual missing/);
  assert.ok(out.length < 1500);
});

test('startup (Hindsight): list_documents by id prefix, then get_document', t => {
  const out = loadKnowledge(project(t, hindsight).root);
  assert.ok(out.includes('3. Load working memory (kind `working`) with `mcp__hs__list_documents` with q "working:", keeping ids that start with "working:", then `mcp__hs__get_document` for each.'));
  assert.ok(out.includes('`mcp__hs__list_documents` with q "pending:"'));
  assert.ok(out.includes('references/memory-providers/hindsight.md'));
  assert.ok(out.includes('MCP server `hs` is not connected'));
});

test('startup reports a missing PROJECT.md and a missing docs manual without stopping', t => {
  const { root } = project(t, mem0, { manual: false });
  rmSync(join(root, 'PROJECT.md'));
  const out = loadKnowledge(root);
  assert.match(out, /\[Project startup file missing: PROJECT\.md\. Continuing without it\.\]/);
  assert.match(out, /\[Knowledge manual missing: docs\/knowledge-manual\.md\./);
  assert.match(out, /3\. Load working memory/);
});

test('an invalid config keeps files-mode startup and says what is wrong', t => {
  const { root } = project(t, '{broken');
  const out = loadKnowledge(root);
  assert.match(out, /1\. `SOUL\.md`/);
  assert.match(out, /\[\.toolkit-memory\.json could not be read as JSON/);
  assert.match(buildReminder(root), /\[\.toolkit-memory\.json could not be read as JSON/);
});

test('reminder names the docs manual and the memory service; files mode text is unchanged', t => {
  const { root } = project(t, mem0);
  const text = buildReminder(root);
  assert.ok(text.startsWith(REMINDER.replace('knowledge/knowledge-manual.md', 'docs/knowledge-manual.md')));
  assert.match(text, /Memory mode: external\./);
  assert.equal(resolveManual(root).path, 'docs/knowledge-manual.md');
  const files = project(t, null, { manual: false });
  mkdirSync(join(files.root, 'knowledge'));
  copyFileSync(manualSource, join(files.root, 'knowledge/knowledge-manual.md'));
  assert.equal(buildReminder(files.root), `${REMINDER}\n`);
});

test('turn review runs for a valid external config, even before the manual is installed', t => {
  assert.equal(knowledgeActive(project(t, mem0, { manual: false }).root), true);
  assert.equal(knowledgeActive(project(t, '{broken', { manual: false }).root), false);
  assert.equal(knowledgeActive(project(t, null, { manual: false }).root), false);
});

test('hooks installed in .claude/hooks find an external project root with no knowledge/ folder', t => {
  const { root } = project(t, mem0);
  for (const name of ['knowledge-session-start', 'knowledge-manual', 'memory-reminder', 'knowledge-completion', 'command-parsing']) {
    mkdirSync(join(root, '.claude/hooks'), { recursive: true });
    copyFileSync(join(hooks, `${name}.mjs`), join(root, '.claude/hooks', `${name}.mjs`));
  }
  const nested = join(root, 'packages/app'); mkdirSync(nested, { recursive: true });
  const env = { ...process.env, TMPDIR: join(root, 'tmp') }; delete env.CLAUDE_PROJECT_DIR; delete env.CODEX_PROJECT_DIR;
  mkdirSync(env.TMPDIR);
  const startup = execFileSync(process.execPath, [join(root, '.claude/hooks/knowledge-session-start.mjs')], { cwd: nested, env, encoding: 'utf8' });
  assert.match(startup, /2\. Read `PROJECT\.md` in full\./);
  const input = { session_id: `external-${process.pid}`, agent_id: 'root', turn_id: 't1', hook_event_name: 'UserPromptSubmit' };
  const prompt = execFileSync(process.execPath, [join(root, '.claude/hooks/memory-reminder.mjs')], { cwd: nested, env, input: JSON.stringify(input), encoding: 'utf8' });
  assert.match(prompt, /Policy: `docs\/knowledge-manual\.md`\./);
  assert.match(prompt, /Before you finish, run:/);
  const stop = execFileSync(process.execPath, [join(root, '.claude/hooks/knowledge-completion.mjs')], { cwd: nested, env, input: JSON.stringify({ ...input, hook_event_name: 'Stop' }), encoding: 'utf8' });
  assert.equal(JSON.parse(stop).decision, 'block');
});

test('engine names in external mode (CWX, K4X, K6X) replace the old review the same way', t => {
  const { root } = project(t, mem0);
  const directory = join(root, 'review');
  const identity = { session_id: 'external-engine', agent_id: 'root', turn_id: 't1' };
  beginReview(root, identity, directory);
  assert.deepEqual(completion(root, { ...identity, hook_event_name: 'Stop', toolkit_protocol_engine: { version: '0.1.0', active: ['K4X', 'CWX', 'K5X', 'K6X', 'K7'] } }, directory), {});
  assert.equal(completion(root, { ...identity, hook_event_name: 'Stop', toolkit_protocol_engine: { version: '0.1.0', active: ['K4X'] } }, directory).decision, 'block');
  const second = completion(root, { ...identity, hook_event_name: 'Stop' }, directory);
  assert.match(second.systemMessage, /as a pending memory record/);
  const env = { ...process.env, CLAUDE_PROJECT_DIR: root, CLAUDE_CODE_ENABLE_FUNCTION_HOOKS: '', TMPDIR: join(root, 'tmp') };
  mkdirSync(env.TMPDIR);
  const run = input => execFileSync(process.execPath, [join(hooks, 'memory-reminder.mjs')], { input: JSON.stringify(input), env, encoding: 'utf8' });
  const base = { session_id: `external-reminder-${process.pid}`, agent_id: 'root', turn_id: 't2' };
  assert.match(run(base), /Before you finish, run:/);
  assert.doesNotMatch(run({ ...base, toolkit_protocol_engine: { version: '0.1.0', active: ['K4X', 'CWX', 'K6X'] } }), /Before you finish, run:/);
  assert.match(run({ ...base, toolkit_protocol_engine: { version: '0.1.0', active: ['K4X', 'K6X'] } }), /Before you finish, run:/);
});

test('action holds: external documentation paths count as documentation-only; messages name the mode\'s manual', () => {
  assert.equal(isKnowledgeOnly(['prds/a/a.md', 'prds/prd-index.md', 'docs/knowledge-manual.md', 'PROJECT.md'], 'external'), true);
  assert.equal(isKnowledgeOnly(['prds/a.md', 'src/app.js'], 'external'), false);
  assert.equal(isKnowledgeOnly(['knowledge/memory/current.md'], 'external'), false);
  assert.equal(isKnowledgeOnly(['PROJECT.md'], 'files'), false);
  assert.equal(isKnowledgeOnly(['knowledge/a.md']), true);
  assert.match(buildDirectCommitMessage(['prds/a.md'], 'external'), /changes only documentation paths \(prds\/, docs\/, PROJECT\.md\)/);
  assert.match(buildDirectCommitMessage(['knowledge/a.md']), /changes only knowledge\//);
  assert.match(prMessage('external'), /docs\/knowledge-manual\.md shows how to/);
  assert.match(prMessage(), /knowledge\/knowledge-manual\.md shows how to/);
  assert.match(closeMessage('external'), /docs\/knowledge-manual\.md shows how/);
  assert.match(closeMessage(), /knowledge\/knowledge-manual\.md shows how/);
});

test('pull request from an external project with only prds/ changes gets the documentation route message', t => {
  const root = mkdtempSync(join(tmpdir(), 'knowledge-external-pr-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] });
  git('init', '-q', '-b', 'main'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid');
  writeFileSync(join(root, '.toolkit-memory.json'), JSON.stringify(mem0));
  git('add', '.toolkit-memory.json'); git('commit', '-q', '-m', 'init');
  git('checkout', '-q', '-b', 'save');
  mkdirSync(join(root, 'prds')); writeFileSync(join(root, 'prds/a.md'), '# A\n');
  git('add', 'prds/a.md'); git('commit', '-q', '-m', 'prd');
  const sessionId = `external-pr-${process.pid}-${Date.now()}`;
  const holdFile = join(tmpdir(), 'second-brain-action-hold', `${createHash('sha256').update(JSON.stringify([sessionId, 'root'])).digest('hex')}.json`);
  t.after(() => rmSync(holdFile, { force: true }));
  const out = execFileSync(process.execPath, [join(hooks, 'save-reminder.mjs')], {
    cwd: root, encoding: 'utf8', env: { ...process.env, TOOLKIT_PROTOCOL_ENGINE: '' },
    input: JSON.stringify({ session_id: sessionId, cwd: root, tool_name: 'Bash', tool_input: { command: 'gh pr create --fill' } }),
  });
  assert.match(JSON.parse(out).hookSpecificOutput.permissionDecisionReason, /changes only documentation paths/);
});

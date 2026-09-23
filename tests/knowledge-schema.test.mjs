#!/usr/bin/env node
// Objective schema/index acceptance. Synthetic approval is fixture data, never authority.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, renameSync, readdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parseFrontmatter } from '../plugins/second-brain/tools/frontmatter.mjs';
import { buildIndexes, readMemoryConfig as toolMemoryConfig } from '../plugins/second-brain/tools/build-knowledge-index.mjs';
import { readMemoryConfig as hookMemoryConfig } from '../plugins/second-brain/hooks/knowledge-manual.mjs';
import { checkKnowledge, MANUAL_SHA256 } from '../plugins/second-brain/tools/check-knowledge.mjs';
import { validMemory as guardMemory } from '../plugins/protocol-guard/hooks/memory-config.mjs';
import { memoryMode as startupMemoryMode } from '../plugins/project-init/library/hooks/toolkit-session-start.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const memoryPath = 'knowledge/memory/memory-entries/imports/matching.md';
const marker = '<!-- claude-toolkit:knowledge-schema:2 -->';
const baseMemory = {
  summary: 'Customer imports match stable identifiers; email is not a unique identity.',
  group: 'Customer imports', type: 'decision', status: 'current',
  source: 'Fixture owner, import review', context: 'Synthetic review on 2026-09-19.',
  confidence: 'reported', created_at: '2026-09-19', updated_at: '2026-09-19',
  tags: ['imports'], approved_by: 'Fixture owner', approval_date: '2026-09-19',
};
const basePrd = { summary: 'Users can review imports before accepting them.', group: 'Import requirements', area: 'imports', status: 'proposed', source: 'Fixture owner', created_at: '2026-09-19', updated_at: '2026-09-19', tags: ['imports'] };
function document(data, body = '# Import matching\n\nReported by the fixture owner.\n') {
  return `---\n${Object.entries(data).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n\n${body}`;
}
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'knowledge-schema-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const write = (path, content) => { mkdirSync(dirname(resolve(dir, path)), { recursive: true }); writeFileSync(resolve(dir, path), content); };
  // Until activation lands, exercise v2 structure with the marker plus the v1
  // managed manual and expect that exact manual mismatch separately. Never
  // suppress any other checker result or present this as equipped-project proof.
  let manual = readFileSync(resolve(root, 'knowledge/knowledge-manual.md'), 'utf8');
  if (!manual.includes(marker)) manual = `${marker}\n${manual}`;
  write('knowledge/knowledge-manual.md', manual);
  for (const path of ['SOUL.md', 'knowledge/project.md', 'knowledge/README.md', 'knowledge/memory/current.md', 'knowledge/memory-inbox.md', 'knowledge/memory/memory-entries/terminology-glossary.md']) write(path, '# Fixture\n');
  write(memoryPath, document(baseMemory));
  write('knowledge/prds/imports/imports.md', document(basePrd, '# Import requirements\n'));
  write('knowledge/prds/imports/preview.md', document({ ...basePrd, summary: 'A preview shows every changed row.' }, '# Preview\n'));
  write('ai-external-knowledge/vendor/README.md', document({ group: 'Vendor sources', summary: 'Import API reference, useful when checking provider limits.', source: 'https://example.test/import', captured_at: '2026-09-19' }, '# Vendor import API\n'));
  buildIndexes(dir);
  const expectedManualMismatch = createHash('sha256').update(manual).digest('hex') !== MANUAL_SHA256;
  const problems = () => {
    const result = checkKnowledge(dir).problems;
    if (expectedManualMismatch) {
      const index = result.findIndex(problem => problem.includes("does not match the toolkit's managed operating manual"));
      assert.notEqual(index, -1, 'synthetic managed-manual mismatch must remain reported');
      result.splice(index, 1);
    }
    return result;
  };
  return { dir, write, problems, read: path => readFileSync(resolve(dir, path), 'utf8'), memory: changes => write(memoryPath, document({ ...baseMemory, ...changes })) };
}
function snapshot(dir) {
  const files = {};
  function walk(path) { for (const entry of readdirSync(path, { withFileTypes: true })) { const child = join(path, entry.name); if (entry.isDirectory()) walk(child); else if (entry.isFile()) files[child] = readFileSync(child, 'utf8'); } }
  walk(dir); return files;
}

test('three deterministic grouped link indexes preserve source summaries and PRD nesting', t => {
  const f = fixture(t);
  assert.deepEqual(f.problems(), []);
  const before = snapshot(f.dir);
  const result = buildIndexes(f.dir);
  assert.equal(result.written.length, 3);
  assert.deepEqual(snapshot(f.dir), before);
  assert.equal(f.read('knowledge/memory/memory-index.md'), `# Memory index\n\n## Customer imports\n\n- [Import matching](memory-entries/imports/matching.md): ${baseMemory.summary}\n`);
  assert.match(f.read('knowledge/prds/prd-index.md'), /- \[Import requirements\]\(imports\/imports.md\) \(proposed\):.*\n  - \[Preview\]\(imports\/preview.md\) \(proposed\):/);
  assert.match(f.read('ai-external-knowledge/README.md'), /\[Vendor import API\]\(vendor\/README.md\): Import API reference/);
  assert.doesNotMatch(f.read('knowledge/memory/memory-index.md'), /glossary|inbox/);
});

test('checker never changes passing or failing files and finds stale index', t => {
  const f = fixture(t); const before = snapshot(f.dir);
  f.problems(); assert.deepEqual(snapshot(f.dir), before);
  f.memory({ summary: 'Changed supported summary.' });
  const failed = snapshot(f.dir);
  assert.ok(f.problems().some(p => p.includes('does not match its sources')));
  assert.deepEqual(snapshot(f.dir), failed);
});

for (const [size, valid] of [[199, true], [200, false]]) test(`summary ${size} characters ${valid ? 'passes' : 'fails'}`, t => {
  const f = fixture(t); f.memory({ summary: 'x'.repeat(size) });
  if (valid) { buildIndexes(f.dir); assert.deepEqual(f.problems(), []); }
  else { assert.throws(() => buildIndexes(f.dir), /under 200/); assert.ok(f.problems().some(p => p.includes('199') || p.includes('under 200'))); }
});
for (const [size, valid] of [[4999, true], [5000, false]]) test(`current ${size} Unicode characters ${valid ? 'passes' : 'fails'}`, t => {
  const f = fixture(t); f.write('knowledge/memory/current.md', '😀'.repeat(size));
  assert.equal(f.problems().some(p => p.includes('under 5000')), !valid);
});
for (const field of ['group', 'context', 'updated_at', 'approved_by', 'approval_date']) test(`missing memory ${field} fails`, t => {
  const f = fixture(t); const data = { ...baseMemory }; delete data[field]; f.write(memoryPath, document(data));
  assert.ok(f.problems().some(p => p.includes(field)));
});
for (const date of ['2026-02-30', '2026-9-19', ['2026-09-19']]) test(`invalid date ${JSON.stringify(date)} fails`, t => {
  const f = fixture(t); f.memory({ updated_at: date }); assert.ok(f.problems().some(p => p.includes('updated_at')));
});
test('automatic historical record passes after revocation without fabricated individual approval', t => {
  const f = fixture(t); const data = { ...baseMemory, auto_saved: true }; delete data.approved_by; delete data.approval_date;
  f.write(memoryPath, document(data)); f.write('knowledge/project.md', document({ memory_auto_save: false }, '# Project\n'));
  assert.deepEqual(f.problems(), []);
});
for (const value of [false, 'true', 'false']) test(`invalid auto_saved ${JSON.stringify(value)} fails`, t => {
  const f = fixture(t); f.memory({ auto_saved: value }); assert.ok(f.problems().some(p => p.includes('auto_saved')));
});
test('automatic marker cannot masquerade as individual approval', t => {
  const f = fixture(t); f.memory({ auto_saved: true }); assert.ok(f.problems().some(p => p.includes('replaces individual')));
});
test('enabled grant requires all evidence; disabled historical grants need no new approval', t => {
  const f = fixture(t);
  const grant = { memory_auto_save: true, memory_permission_by: 'Fixture owner', memory_permission_date: '2026-09-19', memory_permission_source: 'Fixture conversation', memory_permission_scope: 'Memory lifecycle only' };
  f.write('knowledge/project.md', document(grant)); assert.deepEqual(f.problems(), []);
  for (const field of Object.keys(grant).slice(1)) { const bad = { ...grant }; delete bad[field]; f.write('knowledge/project.md', document(bad)); assert.ok(f.problems().some(p => p.includes(field))); }
  f.write('knowledge/project.md', document({ memory_auto_save: 'true' })); assert.ok(f.problems().some(p => p.includes('true or false')));
});
test('proposed PRD needs no invented approval; finalized requires real pair and excludes memory fields', t => {
  const f = fixture(t);
  for (const fields of [{status: 'finalized'}, {approved_by: 'Owner'}, {auto_saved: true}, {confidence: 'observed'}, {status: 'current'}]) {
    f.write('knowledge/prds/imports/preview.md', document({ ...basePrd, ...fields }));
    assert.ok(f.problems().some(p => p.includes('preview.md') && !p.includes('does not match its sources')));
  }
  f.write('knowledge/prds/imports/preview.md', document({ ...basePrd, status: 'finalized', approved_by: 'Fixture owner', approval_date: '2026-09-19' }));
  buildIndexes(f.dir); assert.deepEqual(f.problems(), []);
  assert.doesNotMatch(f.read('knowledge/prds/prd-index.md'), /\(finalized\)/);
});
test('large mixed topic and feedback have no artificial cap; content provenance stays unchanged', t => {
  const f = fixture(t);
  const body = '# Import matching\n\n## Current observed sample\nFixture import log, 2026-09-19: identifier matching passed on the sample only.\n\n## Inferred explanation\nCause remains inferred, not verified.\n\n## Historical owner decision\nThe email-match decision from 2026-03-01 is superseded; its original approval does not approve new claims.\n' + 'Useful detail. '.repeat(900);
  f.write(memoryPath, document(baseMemory, body)); f.write('knowledge/memory-self-improvement.md', '# Feedback\n' + 'Owner feedback. '.repeat(900));
  buildIndexes(f.dir); const before = snapshot(f.dir); assert.deepEqual(f.problems(), []); assert.deepEqual(snapshot(f.dir), before);
});
test('renames move generated links without altering source files', t => {
  const f = fixture(t); renameSync(resolve(f.dir, memoryPath), resolve(f.dir, 'knowledge/memory/memory-entries/imports/identity.md'));
  renameSync(resolve(f.dir, 'ai-external-knowledge/vendor'), resolve(f.dir, 'ai-external-knowledge/provider'));
  buildIndexes(f.dir); assert.deepEqual(f.problems(), []);
  assert.match(f.read('knowledge/memory/memory-index.md'), /imports\/identity.md/);
  assert.match(f.read('ai-external-knowledge/README.md'), /provider\/README.md/);
});
test('partial migration remains visibly incomplete', t => {
  const f = fixture(t); f.write('knowledge/current.md', '# Stale current'); f.write('knowledge/prds/spec-index.md', '# Stale index'); f.write('knowledge/memory/old-topic.md', document(baseMemory));
  assert.ok(f.problems().filter(p => p.includes('legacy')).length >= 3);
});
test('captured topic metadata failure prevents every index write', t => {
  const f = fixture(t); f.write('ai-external-knowledge/vendor/README.md', '# Old metadata-free topic\n');
  const before = snapshot(f.dir); assert.throws(() => buildIndexes(f.dir), /frontmatter/); assert.deepEqual(snapshot(f.dir), before);
  assert.ok(f.problems().some(p => p.includes('captured_at')));
});
test('duplicate metadata cannot widen approval or silently replace evidence', t => {
  const f = fixture(t); f.write(memoryPath, document(baseMemory).replace('status: "current"', 'status: "current"\nstatus: "retired"'));
  assert.ok(f.problems().some(p => p.includes('duplicate field status')));
  assert.throws(() => buildIndexes(f.dir), /duplicate field/);
});
test('YAML quotes, commas and comments preserve scalars and reject ambiguous structure', () => {
  const result = parseFrontmatter('---\nsource: "Owner: import review #1" # comment\ntags: ["matching, names", imports]\nauto_saved: true\nquoted: "true"\n---\n# Topic\n');
  assert.deepEqual(result.errors, []); assert.equal(result.data.source, 'Owner: import review #1'); assert.deepEqual(result.data.tags, ['matching, names', 'imports']); assert.equal(result.data.auto_saved, true); assert.equal(result.data.quoted, 'true');
  for (const text of ['source: [missing', 'source: value\n  - replacement', 'source: &alias value', 'source: "unclosed']) assert.ok(parseFrontmatter(`---\n${text}\n---\n`).errors.length);
});
test('symlinked sources and index targets fail without outside writes', t => {
  const f = fixture(t); f.write('outside.md', 'Untouched');
  rmSync(resolve(f.dir, 'knowledge/memory/memory-index.md')); symlinkSync(resolve(f.dir, 'outside.md'), resolve(f.dir, 'knowledge/memory/memory-index.md'));
  assert.throws(() => buildIndexes(f.dir), /symbolic link/); assert.equal(f.read('outside.md'), 'Untouched'); assert.ok(f.problems().some(p => p.includes('regular generated index')));
});

test('invalid field types report problems instead of throwing', t => {
  const f = fixture(t);
  for (const fields of [{group: ['Imports']}, {group: 7}, {summary: false}, {tags: [5]}, {source: null}]) {
    f.memory(fields); assert.doesNotThrow(() => f.problems()); assert.ok(f.problems().length);
  }
  f.write('knowledge/project.md', document({ memory_auto_save: true, memory_permission_date: ['2026-09-19'] }));
  assert.ok(f.problems().some(p => p.includes('memory_permission_date')));
});
test('whole-file and related paths must exist inside the selected fixture project', t => {
  const f = fixture(t);
  f.memory({ related_memories: ['knowledge/memory/memory-entries/missing.md'] }); assert.ok(f.problems().some(p => p.includes('does not exist')));
  f.memory({ supersedes: '../outside.md' }); assert.ok(f.problems().some(p => p.includes('within the project')));
  f.write(memoryPath, document(baseMemory, '# Import matching\n\n[Missing evidence](missing.md)\n')); assert.ok(f.problems().some(p => p.includes('link missing.md')));
});
test('malformed and repeated schema markers fail visibly', t => {
  const f = fixture(t); const manual = f.read('knowledge/knowledge-manual.md');
  f.write('knowledge/knowledge-manual.md', `${marker}\n${manual}`); assert.ok(f.problems().some(p => p.includes('duplicate schema')));
  f.write('knowledge/knowledge-manual.md', manual.replace(marker, '<!-- claude-toolkit:knowledge-schema:99 -->'));
  assert.ok(f.problems().some(p => p.includes('unknown or duplicate')));
});
test('topic and PRD layout errors remain incomplete', t => {
  const f = fixture(t);
  f.write('knowledge/memory/memory-entries/imports/deep/entry.md', document(baseMemory));
  f.write('knowledge/prds/parentless/child.md', document(basePrd));
  assert.ok(f.problems().some(p => p.includes('deeper than a topic')));
  assert.ok(f.problems().some(p => p.includes('parent PRD parentless.md')));
});
test('unreadable file shapes report failed checking without changing records', t => {
  const f = fixture(t); rmSync(resolve(f.dir, 'knowledge/knowledge-manual.md')); mkdirSync(resolve(f.dir, 'knowledge/knowledge-manual.md'));
  const result = checkKnowledge(f.dir); assert.ok(result.problems.some(p => p.includes('could not finish checking')));
});

test('relationship directories and symlinks cannot stand in for approved records', t => {
  const f = fixture(t);
  f.memory({ related_memories: ['knowledge/memory/memory-entries/'] }); assert.ok(f.problems().some(p => p.includes('regular Markdown file')));
  symlinkSync(resolve(f.dir, memoryPath), resolve(f.dir, 'linked.md'));
  f.memory({ supersedes: 'linked.md' }); assert.ok(f.problems().some(p => p.includes('regular Markdown file')));
  symlinkSync(tmpdir(), resolve(f.dir, 'outside'));
  f.memory({ supersedes: 'outside/example.md' }); assert.ok(f.problems().some(p => p.includes('regular Markdown file')));
});
test('all index targets are checked before any index is replaced', t => {
  const f = fixture(t); f.memory({ summary: 'This changed summary must not reach an index on a failed rebuild.' });
  rmSync(resolve(f.dir, 'knowledge/prds/prd-index.md')); mkdirSync(resolve(f.dir, 'knowledge/prds/prd-index.md'));
  const before = snapshot(f.dir); assert.throws(() => buildIndexes(f.dir), /regular file/); assert.deepEqual(snapshot(f.dir), before);
});
test('no project permission frontmatter means default approval stays on', t => {
  const f = fixture(t); f.write('knowledge/project.md', '# Project\nNo automatic-save grant has been given.\n'); assert.deepEqual(f.problems(), []);
});


test('copied command entry points run through a path alias', t => {
  const f = fixture(t);
  symlinkSync(resolve(root, 'plugins/second-brain/tools'), resolve(f.dir, 'tool-alias'));
  const built = spawnSync(process.execPath, [resolve(f.dir, 'tool-alias/build-knowledge-index.mjs'), f.dir], { encoding: 'utf8' });
  assert.equal(built.status, 0, built.stderr);
  assert.equal(built.stdout.match(/Wrote /g)?.length, 3);
  const checked = spawnSync(process.execPath, [resolve(f.dir, 'tool-alias/check-knowledge.mjs'), f.dir], { encoding: 'utf8' });
  assert.match(checked.stdout + checked.stderr, /ALL PASS|managed operating manual/);
  assert.notEqual(checked.stdout + checked.stderr, '');
});

test('dangling index symlink cannot create an unintended file', t => {
  const f = fixture(t);
  const target = resolve(f.dir, 'unintended.md');
  rmSync(resolve(f.dir, 'knowledge/memory/memory-index.md'));
  symlinkSync(target, resolve(f.dir, 'knowledge/memory/memory-index.md'));
  const before = snapshot(f.dir);
  assert.throws(() => buildIndexes(f.dir), /regular file/);
  assert.deepEqual(snapshot(f.dir), before);
});

// External memory mode (#404): memory lives in a memory service, so the Git
// side is SOUL.md, PROJECT.md, the manual in docs/, PRDs in prds/ and captured
// outside documentation. No memory index is built.
const managedManual = readFileSync(resolve(root, 'plugins/second-brain/skills/knowledge-setup/references/templates/knowledge/knowledge-manual.md'), 'utf8');
const externalConfig = { format: 1, memory: 'external', service: 'hindsight', server: 'hindsight', project: 'imports' };
function externalFixture(t, config = externalConfig) {
  const dir = mkdtempSync(join(tmpdir(), 'knowledge-external-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const write = (path, content) => { mkdirSync(dirname(resolve(dir, path)), { recursive: true }); writeFileSync(resolve(dir, path), content); };
  write('.toolkit-memory.json', typeof config === 'string' ? config : JSON.stringify(config));
  write('docs/knowledge-manual.md', managedManual);
  write('SOUL.md', '# Fixture\n');
  write('PROJECT.md', '# Project\n');
  write('prds/imports/imports.md', document(basePrd, '# Import requirements\n'));
  write('prds/imports/preview.md', document({ ...basePrd, summary: 'A preview shows every changed row.' }, '# Preview\n'));
  write('ai-external-knowledge/vendor/README.md', document({ group: 'Vendor sources', summary: 'Import API reference.', source: 'https://example.test/import', captured_at: '2026-09-19' }, '# Vendor import API\n'));
  return { dir, write, read: path => readFileSync(resolve(dir, path), 'utf8') };
}

test('external: builder writes the PRD and outside-documentation indexes only', t => {
  const f = externalFixture(t);
  const result = buildIndexes(f.dir);
  assert.deepEqual(result.written.map(x => x.path.slice(f.dir.length + 1)).sort(), ['ai-external-knowledge/README.md', 'prds/prd-index.md']);
  assert.match(f.read('prds/prd-index.md'), /- \[Import requirements\]\(imports\/imports.md\) \(proposed\):.*\n  - \[Preview\]\(imports\/preview.md\) \(proposed\):/);
  assert.equal(readdirSync(f.dir).includes('knowledge'), false);
  const checked = checkKnowledge(f.dir);
  assert.deepEqual(checked.problems, []);
  assert.equal(checked.mode, 'external');
});

test('external: a knowledge/memory folder, stale index, or missing files fail the check', t => {
  const f = externalFixture(t); buildIndexes(f.dir);
  f.write('knowledge/memory/current.md', '# Current\n');
  assert.ok(checkKnowledge(f.dir).problems.some(p => p.includes('knowledge/memory') && p.includes('one home')));
  rmSync(resolve(f.dir, 'knowledge'), { recursive: true });
  f.write('prds/imports/imports.md', document({ ...basePrd, summary: 'Changed.' }, '# Import requirements\n'));
  assert.ok(checkKnowledge(f.dir).problems.some(p => p.includes('prds/prd-index.md') && p.includes('does not match')));
  buildIndexes(f.dir);
  rmSync(resolve(f.dir, 'PROJECT.md')); rmSync(resolve(f.dir, 'docs/knowledge-manual.md'));
  const problems = checkKnowledge(f.dir).problems;
  assert.ok(problems.some(p => p.includes('PROJECT.md') && p.includes('missing')));
  assert.ok(problems.some(p => p.includes('docs/knowledge-manual.md') && p.includes('missing')));
});

test('external: PRD records get the same field checks under prds/', t => {
  const f = externalFixture(t);
  f.write('prds/imports/preview.md', document({ ...basePrd, status: 'current' }, '# Preview\n'));
  buildIndexes(f.dir);
  assert.ok(checkKnowledge(f.dir).problems.some(p => p.includes('prds/imports/preview.md') && p.includes('status "current"')));
});

test('invalid memory config is a checker error; hooks and tools read it the same way', t => {
  for (const [config, pattern] of [
    ['{not json', /could not be read as JSON/],
    [{ format: 1, memory: 'cloud' }, /"memory"/],
    [{ format: 1, memory: 'external', service: 'other', server: 's', project: 'p' }, /"service"/],
    [{ format: 1, memory: 'external', service: 'mem0', project: 'p' }, /"server"/],
    [{ format: 1, memory: 'external', service: 'mem0', server: 'mem0' }, /"project"/],
    [{ format: 2, memory: 'external', service: 'mem0', server: 'mem0', project: 'p' }, /"format"/],
    [{ memory: 'external', service: 'mem0', server: 'mem0', project: 'p' }, /"format"/],
    [{ format: 1, memory: 'external', service: 'mem0', server: 'mem0.cloud', project: 'p' }, /"server"/],
  ]) {
    const f = externalFixture(t, config);
    const hook = hookMemoryConfig(f.dir);
    assert.deepEqual(toolMemoryConfig(f.dir), hook);
    assert.equal(hook.mode, 'files'); assert.match(hook.error, pattern);
    assert.ok(checkKnowledge(f.dir).problems.some(p => p.includes('.toolkit-memory.json')), JSON.stringify(config));
  }
  for (const config of [externalConfig, { format: 1, memory: 'files' }, { ...externalConfig, service: 'mem0', server: 'mem0' }]) {
    const f = externalFixture(t, config);
    assert.deepEqual(toolMemoryConfig(f.dir), hookMemoryConfig(f.dir));
  }
  const empty = mkdtempSync(join(tmpdir(), 'knowledge-external-')); t.after(() => rmSync(empty, { recursive: true, force: true }));
  assert.deepEqual(hookMemoryConfig(empty), { mode: 'files', service: null, server: null, project: null, error: null });
  assert.deepEqual(toolMemoryConfig(empty), hookMemoryConfig(empty));
  assert.equal(checkKnowledge(empty).skipped, true);
});

// Every reader of .toolkit-memory.json applies the same rules. An invalid
// config means files mode in every one of them.
test('every memory config reader gives the same mode for the same config', t => {
  const good = { format: 1, memory: 'external', service: 'mem0', server: 'mem0', project: 'imports' };
  const cases = [
    [good, 'external'],
    [{ ...good, service: 'hindsight', server: 'hindsight' }, 'external'],
    [{ ...good, server: 'my-mem0_2' }, 'external'],
    [{ ...good, project: ' imports ' }, 'external'],
    [{ format: 1, memory: 'files' }, 'files'],
    ['{not json', 'files'],
    [[], 'files'],
    [null, 'files'],
    [{ memory: 'external', service: 'mem0', server: 'mem0', project: 'imports' }, 'files'],
    [{ ...good, format: 2 }, 'files'],
    [{ ...good, format: '1' }, 'files'],
    [{ format: 1 }, 'files'],
    [{ ...good, memory: 'cloud' }, 'files'],
    [{ ...good, service: 'toString' }, 'files'],
    [{ ...good, service: 'constructor' }, 'files'],
    [{ ...good, service: 'Mem0' }, 'files'],
    [{ ...good, service: undefined }, 'files'],
    [{ ...good, server: 'mem0.cloud' }, 'files'],
    [{ ...good, server: 'mem 0' }, 'files'],
    [{ ...good, server: ' mem0 ' }, 'files'],
    [{ ...good, server: '' }, 'files'],
    [{ ...good, server: 'mem0\n' }, 'files'],
    [{ ...good, server: 7 }, 'files'],
    [{ ...good, project: '' }, 'files'],
    [{ ...good, project: '   ' }, 'files'],
    [{ ...good, project: 'a\nb' }, 'files'],
    [{ ...good, project: undefined }, 'files'],
  ];
  const reminder = resolve(root, 'plugins/hooks-library/hooks/spec-check-reminder.mjs');
  cases.forEach(([config, expected], index) => {
    const text = typeof config === 'string' ? config : JSON.stringify(config);
    const dir = mkdtempSync(join(tmpdir(), 'memory-readers-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    writeFileSync(join(dir, '.toolkit-memory.json'), text);
    let parsed; try { parsed = JSON.parse(text); } catch { parsed = undefined; }
    const session = `memory-readers-${process.pid}-${Date.now()}-${index}`;
    const out = spawnSync(process.execPath, [reminder], { input: JSON.stringify({ session_id: session, cwd: dir }), env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });
    rmSync(join(tmpdir(), 'claude-spec-check-reminder', session), { force: true });
    const modes = {
      secondBrainHook: hookMemoryConfig(dir).mode,
      secondBrainTool: toolMemoryConfig(dir).mode,
      protocolGuard: guardMemory(parsed) ?? 'files',
      projectInitStartup: startupMemoryMode(dir),
      specCheckReminder: out.stdout.includes('(a prds/ file') ? 'external' : out.stdout.includes('(a knowledge/prds/ file') ? 'files' : `no output: ${out.stderr}`,
    };
    for (const [reader, mode] of Object.entries(modes)) assert.equal(mode, expected, `${reader} on ${text}`);
  });
});

test('files-mode config keeps today\'s checks', t => {
  const f = fixture(t);
  f.write('.toolkit-memory.json', JSON.stringify({ format: 1, memory: 'files' }));
  assert.deepEqual(f.problems(), []);
  assert.equal(buildIndexes(f.dir).written.length, 3);
});

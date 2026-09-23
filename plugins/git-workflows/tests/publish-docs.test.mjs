import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, copyFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = resolve(dirname(fileURLToPath(import.meta.url)), '../skills/publish-docs/scripts/publish-docs.mjs');
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const base = resolve(mkdtempSync(join(tmpdir(), 'publish-docs-test-')));
const workspaces = [];

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.error) throw result.error;
  return result;
}
function git(cwd, ...args) {
  const result = run('git', args, cwd);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}
function start(source, path) {
  const result = run(process.execPath, [script, 'start', '--branch', 'main', '--', path], source);
  assert.equal(result.status, 0, result.stderr);
  const workspace = result.stdout.trim();
  assert.equal(basename(dirname(workspace)), basename(base));
  workspaces.push({ source, workspace });
  return workspace;
}

test.after(() => {
  for (const { source, workspace } of workspaces) {
    if (existsSync(workspace)) run('git', ['worktree', 'remove', '--force', workspace], source);
  }
  rmSync(base, { recursive: true, force: true });
});

test('parallel saves have separate staging areas and a remote race is recoverable', () => {
  const remote = join(base, 'remote.git');
  const source = join(base, 'project');
  git(base, 'init', '--bare', '-q', remote);
  mkdirSync(source);
  git(source, 'init', '-q', '-b', 'main');
  git(source, 'config', 'user.name', 'Fixture Owner');
  git(source, 'config', 'user.email', 'fixture@example.invalid');
  write(join(source, 'README.md'), '# Project\n');
  write(join(source, 'docs', 'existing.md'), '# Existing\n');
  write(join(source, 'force-app', 'objects', 'large.xml'), '<root/>\n');
  git(source, 'add', 'README.md', 'docs/existing.md', 'force-app/objects/large.xml');
  git(source, 'commit', '-q', '-m', 'Initial files');
  git(source, 'remote', 'add', 'origin', remote);
  git(source, 'push', '-q', '-u', 'origin', 'main');

  const codeSave = run(process.execPath, [script, 'start', '--branch', 'main', '--', 'src/change.js'], source);
  assert.equal(codeSave.status, 1);
  assert.match(codeSave.stderr, /Not a documentation save path/);

  const first = start(source, 'docs/first.md');
  const second = start(source, 'docs/second.md');
  assert.equal(existsSync(join(first, 'force-app', 'objects', 'large.xml')), false);
  assert.equal(existsSync(join(second, 'force-app', 'objects', 'large.xml')), false);
  write(join(first, 'docs', 'first.md'), '# First\n');
  write(join(second, 'docs', 'second.md'), '# Second\n');
  git(first, 'add', '--', 'docs/first.md');
  git(second, 'add', '--', 'docs/second.md');
  assert.equal(git(first, 'diff', '--cached', '--name-only'), 'docs/first.md');
  assert.equal(git(second, 'diff', '--cached', '--name-only'), 'docs/second.md');
  assert.equal(git(source, 'status', '--porcelain'), '');

  write(join(first, 'docs', 'unexpected.md'), '# Unexpected\n');
  const incomplete = run(process.execPath, [script, 'publish', '--message', 'Save first document'], first);
  assert.equal(incomplete.status, 1);
  assert.match(incomplete.stderr, /Unpublished files remain/);
  rmSync(join(first, 'docs', 'unexpected.md'));
  const one = run(process.execPath, [script, 'publish', '--message', 'Save first document'], first);
  assert.equal(one.status, 0, one.stderr);
  const stale = run(process.execPath, [script, 'publish', '--message', 'Save second document'], second);
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /default branch advanced/);
  assert.equal(git(second, 'status', '--porcelain'), '');
  git(second, 'rebase', 'FETCH_HEAD');
  const two = run(process.execPath, [script, 'publish', '--message', 'Save second document'], second);
  assert.equal(two.status, 0, two.stderr);
  git(source, 'fetch', '-q', 'origin', 'main');
  assert.equal(git(source, 'show', 'FETCH_HEAD:docs/first.md'), '# First');
  assert.equal(git(source, 'show', 'FETCH_HEAD:docs/second.md'), '# Second');
  assert.equal(readFileSync(join(source, 'docs', 'existing.md'), 'utf8'), '# Existing\n');
});

test('a knowledge save checks a staged link to a file outside the sparse checkout', () => {
  const remote = join(base, 'knowledge-remote.git');
  const source = join(base, 'knowledge-project');
  git(base, 'init', '--bare', '-q', remote);
  mkdirSync(source);
  git(source, 'init', '-q', '-b', 'main');
  git(source, 'config', 'user.name', 'Fixture Owner');
  git(source, 'config', 'user.email', 'fixture@example.invalid');
  const template = join(repo, 'plugins', 'second-brain', 'skills', 'knowledge-setup', 'references', 'templates');
  for (const path of ['knowledge/knowledge-manual.md', 'knowledge/README.md', 'knowledge/memory-inbox.md', 'knowledge/memory/memory-entries/terminology-glossary.md']) {
    const target = join(source, path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(template, path), target);
  }
  for (const name of ['frontmatter', 'build-knowledge-index', 'check-knowledge']) {
    const target = join(source, '.claude', 'tools', `${name}.mjs`);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(repo, 'plugins', 'second-brain', 'tools', `${name}.mjs`), target);
  }
  write(join(source, 'SOUL.md'), '# Fixture role\n');
  write(join(source, 'knowledge', 'project.md'), '# Fixture project\n');
  write(join(source, 'knowledge', 'memory', 'current.md'), '# Current working memory\nUpdated: 2026-09-23\n\nNone.\n');
  write(join(source, 'README.md'), '# Fixture\n');
  mkdirSync(join(source, 'knowledge', 'prds'), { recursive: true });
  mkdirSync(join(source, 'ai-external-knowledge'), { recursive: true });
  write(join(source, 'force-app', 'objects', 'large.xml'), '<root/>\n');
  git(source, 'config', 'core.autocrlf', 'false');
  const builder = join(source, '.claude', 'tools', 'build-knowledge-index.mjs');
  const built = run(process.execPath, [builder, source], source);
  assert.equal(built.status, 0, built.stderr);
  git(source, 'add', 'SOUL.md', 'knowledge', '.claude/tools', 'ai-external-knowledge', 'force-app');
  git(source, 'commit', '-q', '-m', 'Initial knowledge');
  const hook = git(source, 'rev-parse', '--git-path', 'hooks/pre-commit');
  copyFileSync(join(repo, 'plugins', 'second-brain', 'tools', 'knowledge-pre-commit.sh'), resolve(source, hook));
  chmodSync(resolve(source, hook), 0o755);
  git(source, 'remote', 'add', 'origin', remote);
  git(source, 'push', '-q', '-u', 'origin', 'main');

  const path = 'knowledge/memory/memory-entries/fixture-topic.md';
  const workspace = start(source, path);
  assert.equal(existsSync(join(workspace, 'force-app', 'objects', 'large.xml')), false);
  write(join(workspace, path), `---\nsummary: Fixture topic.\ngroup: Fixture\ntype: fact\nstatus: current\nsource: fixture\ncontext: Test fixture, 2026-09-23.\nconfidence: observed\ncreated_at: 2026-09-23\nupdated_at: 2026-09-23\ntags: [fixture]\napproved_by: Fixture Owner\napproval_date: 2026-09-23\n---\n\n# Fixture topic\n\n[Source](../../../force-app/objects/large.xml)\n`);
  assert.equal(run(process.execPath, [join(workspace, '.claude', 'tools', 'build-knowledge-index.mjs'), workspace], workspace).status, 0);
  git(workspace, 'add', '--', path, 'knowledge/memory/memory-index.md');
  const published = run(process.execPath, [script, 'publish', '--message', 'Add fixture memory'], workspace);
  assert.equal(published.status, 0, published.stderr);
  git(source, 'fetch', '-q', 'origin', 'main');
  assert.match(git(source, 'show', `FETCH_HEAD:${path}`), /Fixture topic/);
});

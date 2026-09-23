// Exercises the shipped Git pre-commit hook in a real fixture repository and
// the permission rules that refuse skipping it. It does not prove host behavior.
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, readdirSync, rmSync, realpathSync, chmodSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const template = 'plugins/second-brain/skills/knowledge-setup/references/templates/';
const hookSource = resolve(repo, 'plugins/second-brain/tools/knowledge-pre-commit.sh');

// Private temporary folder for the fixture and for the hook's own copy.
const base = realpathSync(mkdtempSync(join(tmpdir(), 'knowledge-pre-commit-test-')));
const hookTmp = resolve(base, 'hook-tmp');
mkdirSync(hookTmp);
test.after(() => rmSync(base, { recursive: true, force: true }));

const env = { ...process.env, TMPDIR: hookTmp };
const git = (cwd, ...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8' });
const commit = (cwd, message, extraEnv = {}) =>
  spawnSync('git', ['commit', '-q', '-m', message], { cwd, env: { ...env, ...extraEnv }, encoding: 'utf8' });

const goodMemory = `---
summary: Fixture topic used to test the commit-time check.
group: Fixture
type: fact
status: current
source: fixture
context: Test fixture, 2026-09-23.
confidence: observed
created_at: 2026-09-23
updated_at: 2026-09-23
tags: [fixture]
approved_by: Fixture Owner
approval_date: 2026-09-23
---

# Fixture topic

A valid memory file.
`;

function fixture(name) {
  const root = resolve(base, name);
  const write = (path, text) => { mkdirSync(dirname(resolve(root, path)), { recursive: true }); writeFileSync(resolve(root, path), text); };
  const copy = (from, to) => { mkdirSync(dirname(resolve(root, to)), { recursive: true }); copyFileSync(resolve(repo, from), resolve(root, to)); };
  for (const file of ['knowledge/knowledge-manual.md', 'knowledge/README.md', 'knowledge/memory-inbox.md', 'knowledge/memory/memory-entries/terminology-glossary.md']) copy(template + file, file);
  for (const tool of ['frontmatter', 'build-knowledge-index', 'check-knowledge']) copy(`plugins/second-brain/tools/${tool}.mjs`, `.claude/tools/${tool}.mjs`);
  write('SOUL.md', '# Fixture role\n\nSupport the commit-time check test.\n');
  write('knowledge/project.md', '# Fixture project\n\nSynthetic project for the pre-commit hook test.\n');
  write('knowledge/memory/current.md', '# Current working memory\nUpdated: 2026-09-23\n\nNone.\n');
  write('README.md', '# Fixture\n');
  mkdirSync(resolve(root, 'knowledge/prds'), { recursive: true });
  mkdirSync(resolve(root, 'ai-external-knowledge'), { recursive: true });
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.name', 'Fixture Agent');
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  rebuild(root);
  git(root, 'add', 'SOUL.md', 'README.md', 'knowledge', '.claude', 'ai-external-knowledge');
  // Install exactly as the setup steps say: copy to the hooks path Git reports.
  const target = resolve(root, git(root, 'rev-parse', '--git-path', 'hooks/pre-commit').trim());
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(hookSource, target);
  chmodSync(target, 0o755);
  const first = commit(root, 'Initialize fixture');
  assert.equal(first.status, 0, first.stderr);
  return root;
}

const rebuild = (root) => execFileSync(process.execPath, [resolve(root, '.claude/tools/build-knowledge-index.mjs'), root], { encoding: 'utf8' });
const memoryPath = 'knowledge/memory/memory-entries/fixture-topic.md';
const write = (root, path, text) => { mkdirSync(dirname(resolve(root, path)), { recursive: true }); writeFileSync(resolve(root, path), text); };

test('shipped hook is executable and carries its install marker', () => {
  const text = readFileSync(hookSource, 'utf8');
  assert.match(text, /^#!\/bin\/sh\n# claude-toolkit:knowledge-pre-commit\n/);
  assert.ok(git(repo, 'ls-files', '-s', 'plugins/second-brain/tools/knowledge-pre-commit.sh').startsWith('100755'));
});

test('a commit that does not touch knowledge is not checked', () => {
  const root = fixture('unrelated');
  write(root, 'knowledge/memory/memory-entries/broken.md', 'no frontmatter\n');
  write(root, 'README.md', '# Fixture\n\nChanged.\n');
  git(root, 'add', 'README.md');
  const result = commit(root, 'Unrelated change');
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout + result.stderr, /ALL PASS|Knowledge check/);
});

test('a branch with no knowledge folder is not refused', () => {
  const root = fixture('no-knowledge');
  git(root, 'rm', '-r', '-q', 'knowledge', '.claude');
  write(root, 'SOUL.md', '# Fixture role\n\nChanged without knowledge.\n');
  git(root, 'add', 'SOUL.md');
  const result = commit(root, 'No knowledge here');
  assert.equal(result.status, 0, result.stderr);
});

test('a staged badly formatted knowledge file is refused and named', () => {
  const root = fixture('bad');
  write(root, 'knowledge/memory/memory-entries/broken.md', '# Broken\n\nNo frontmatter.\n');
  git(root, 'add', 'knowledge');
  const result = commit(root, 'Bad memory');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /knowledge\/memory\/memory-entries\/broken\.md/);
  assert.match(result.stderr, /this commit was refused/);
  assert.equal(git(root, 'rev-list', '--count', 'HEAD').trim(), '1');
  assert.deepEqual(readdirSync(hookTmp), [], 'the hook removes its private copy');
});

test('a valid knowledge commit passes, including one that deletes a file', () => {
  const root = fixture('good');
  write(root, memoryPath, goodMemory);
  rebuild(root);
  git(root, 'add', 'knowledge');
  let result = commit(root, 'Add memory');
  assert.equal(result.status, 0, result.stderr);
  git(root, 'rm', '-q', memoryPath);
  rebuild(root);
  git(root, 'add', 'knowledge');
  result = commit(root, 'Remove memory');
  assert.equal(result.status, 0, result.stderr);
});

test('a new memory whose index was not rebuilt is refused', () => {
  const root = fixture('stale-index');
  write(root, memoryPath, goodMemory);
  git(root, 'add', memoryPath);
  const result = commit(root, 'Memory without index');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /memory-index\.md/);
});

test('staged content decides, not unstaged edits in the working folder', () => {
  const root = fixture('staged-only');
  // Good staged file, broken unstaged file beside it: the commit passes.
  write(root, memoryPath, goodMemory);
  rebuild(root);
  git(root, 'add', 'knowledge');
  write(root, 'knowledge/memory/memory-entries/other-session.md', 'unstaged, no frontmatter\n');
  let result = commit(root, 'Good staged memory');
  assert.equal(result.status, 0, result.stderr);
  rmSync(resolve(root, 'knowledge/memory/memory-entries/other-session.md'));
  // Broken staged file, fixed only in the working folder: the commit is refused.
  write(root, memoryPath, goodMemory.replace('type: fact', 'type: rumour'));
  git(root, 'add', memoryPath);
  write(root, memoryPath, goodMemory);
  result = commit(root, 'Broken staged memory');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /rumour/);
});

test('the hook installed once also runs in a linked worktree', () => {
  const root = fixture('worktree-main');
  const linked = resolve(base, 'worktree-linked');
  git(root, 'worktree', 'add', '-q', '-b', 'side', linked);
  write(linked, 'knowledge/memory/memory-entries/broken.md', '# Broken\n');
  git(linked, 'add', 'knowledge');
  const result = commit(linked, 'Bad memory in worktree');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /broken\.md/);
});

test('a missing Node.js refuses the commit with a clear message', () => {
  const root = fixture('no-node');
  write(root, memoryPath, goodMemory);
  rebuild(root);
  git(root, 'add', 'knowledge');
  // A PATH holding only the commands the hook and Git need, without node.
  const bin = resolve(base, 'bin-without-node');
  mkdirSync(bin);
  for (const name of ['git', 'grep', 'tr', 'mktemp', 'rm', 'sh']) {
    const found = execFileSync('/bin/sh', ['-c', `command -v ${name}`], { encoding: 'utf8' }).trim();
    if (!existsSync(resolve(bin, name))) symlinkSync(found, resolve(bin, name));
  }
  const result = spawnSync(resolve(bin, 'git'), ['commit', '-q', '-m', 'No node'], { cwd: root, env: { ...env, PATH: bin }, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Node\.js was not found/);
});

test('settings refuse skipping the hook with --no-verify or -n', () => {
  const rules = [
    'Bash(git commit --no-verify *)',
    'Bash(git commit * --no-verify)',
    'Bash(git commit * --no-verify *)',
    'Bash(git commit -n *)',
    'Bash(git commit * -n)',
    'Bash(git commit * -n *)',
  ];
  const shipped = JSON.parse(readFileSync(resolve(repo, 'plugins/project-init/library/templates/settings-permissions.json'), 'utf8'));
  const own = JSON.parse(readFileSync(resolve(repo, '.claude/settings.json'), 'utf8'));
  for (const rule of rules) {
    assert.ok(shipped.general.deny.includes(rule), `template deny has ${rule}`);
    assert.ok(own.permissions.deny.includes(rule), `.claude/settings.json deny has ${rule}`);
  }
});

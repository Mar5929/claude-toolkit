#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, basename, join, resolve, isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';

function git(cwd, args, { allowFailure = false } = {}) {
  const result = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });
  if (result.error || (!allowFailure && result.status !== 0)) {
    throw new Error(`git ${args[0]} failed: ${(result.stderr || result.error?.message || '').trim()}`);
  }
  return result;
}

function cleanPath(path) {
  const value = path.replaceAll('\\', '/');
  if (!value || isAbsolute(path) || value.startsWith('/') || value.endsWith('/')
      || value.split('/').some(part => !part || part === '.' || part === '..')
      || value === '.git' || value.startsWith('.git/')) {
    throw new Error(`Expected a project-relative file path: ${path}`);
  }
  const filename = basename(value);
  if (!value.endsWith('.md') || ['AGENTS.md', 'CLAUDE.md', 'SKILL.md'].includes(filename)
      || (filename !== 'README.md' && ['plugins/', '.claude/', '.agents/', 'tests/', 'src/', 'scripts/']
        .some(folder => value.startsWith(folder))))
    throw new Error(`Not a documentation save path: ${path}`);
  return value;
}

function markerPath(cwd) {
  return join(git(cwd, ['rev-parse', '--absolute-git-dir']).stdout.trim(), 'toolkit-docsave.json');
}

function generatedPaths(paths) {
  const output = new Set(paths);
  if (paths.some(path => path.startsWith('knowledge/memory/memory-entries/')))
    output.add('knowledge/memory/memory-index.md');
  if (paths.some(path => path.startsWith('knowledge/prds/')))
    output.add('knowledge/prds/prd-index.md');
  if (paths.some(path => path.startsWith('prds/')))
    output.add('prds/prd-index.md');
  if (paths.some(path => path.startsWith('ai-external-knowledge/') && path !== 'ai-external-knowledge/README.md'))
    output.add('ai-external-knowledge/README.md');
  return [...output];
}

function start(args) {
  const branchFlag = args.indexOf('--branch');
  const separator = args.indexOf('--');
  if (branchFlag < 0 || separator < 0 || branchFlag + 1 >= separator || separator === args.length - 1)
    throw new Error('Usage: publish-docs.mjs start --branch DEFAULT -- FILE...');
  const branch = args[branchFlag + 1];
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(branch) || branch.includes('..'))
    throw new Error('Invalid default branch name.');
  const source = git(process.cwd(), ['rev-parse', '--show-toplevel']).stdout.trim();
  if (existsSync(markerPath(source)))
    throw new Error('Already in an isolated save workspace. Continue that save instead of opening another.');
  const paths = generatedPaths(args.slice(separator + 1).map(cleanPath));
  git(source, ['fetch', 'origin', branch]);
  const base = git(source, ['rev-parse', 'FETCH_HEAD']).stdout.trim();
  const workspace = resolve(dirname(source), `${basename(source)}-docsave-${randomUUID().slice(0, 8)}`);
  if (existsSync(workspace)) throw new Error(`Save workspace already exists: ${workspace}`);
  git(source, ['worktree', 'add', '--no-checkout', '--detach', workspace, base]);
  const folders = new Set(['knowledge', 'ai-external-knowledge', 'prds', 'docs', '.claude/tools']);
  for (const path of paths) {
    const folder = dirname(path).replaceAll('\\', '/');
    if (folder !== '.') folders.add(folder);
  }
  git(workspace, ['sparse-checkout', 'init', '--cone']);
  git(workspace, ['sparse-checkout', 'set', '--cone', ...folders]);
  git(workspace, ['read-tree', '-mu', 'HEAD']);
  writeFileSync(markerPath(workspace), JSON.stringify({ source, workspace, branch, base, paths }, null, 2));
  process.stdout.write(`${workspace}\n`);
}

function publish(args) {
  const messageFlag = args.indexOf('--message');
  if (messageFlag < 0 || !args[messageFlag + 1])
    throw new Error('Usage: publish-docs.mjs publish --message "Commit message"');
  const workspace = git(process.cwd(), ['rev-parse', '--show-toplevel']).stdout.trim();
  const file = markerPath(workspace);
  if (!existsSync(file)) throw new Error('This is not a publish-docs save workspace. Run start first.');
  const state = JSON.parse(readFileSync(file, 'utf8'));
  const { source, branch, base, paths } = state;
  if (resolve(workspace) === resolve(source) || git(workspace, ['symbolic-ref', '-q', 'HEAD'], { allowFailure: true }).status === 0)
    throw new Error('Publication requires the isolated, detached save workspace.');
  const staged = git(workspace, ['diff', '--cached', '--name-only', '-z']).stdout.split('\0').filter(Boolean);
  const allowed = new Set(paths);
  if (staged.some(path => !allowed.has(path))) throw new Error(`Other staged changes are present: ${staged.filter(path => !allowed.has(path)).join(', ')}`);
  const unstaged = git(workspace, ['diff', '--name-only', '-z']).stdout.split('\0').filter(Boolean);
  const untracked = git(workspace, ['ls-files', '--others', '--exclude-standard', '-z']).stdout.split('\0').filter(Boolean);
  if (unstaged.length || untracked.length)
    throw new Error(`Unpublished files remain in this save workspace: ${[...unstaged, ...untracked].join(', ')}`);
  git(workspace, ['diff', '--cached', '--check']);
  const knowledgeChange = staged.some(path => path.startsWith('knowledge/') || path.startsWith('prds/') || path.startsWith('ai-external-knowledge/') || ['SOUL.md', 'PROJECT.md', 'docs/knowledge-manual.md', '.toolkit-memory.json'].includes(path));
  if (knowledgeChange) {
    const hook = git(workspace, ['rev-parse', '--git-path', 'hooks/pre-commit']).stdout.trim();
    if (!existsSync(hook) || !readFileSync(hook, 'utf8').includes('# claude-toolkit:knowledge-pre-commit'))
      throw new Error('The knowledge pre-commit check is missing. Restore it through knowledge setup or project sync before publishing.');
  }
  if (staged.length) git(workspace, ['commit', '-m', args[messageFlag + 1]]);
  else if (git(workspace, ['rev-parse', 'HEAD']).stdout.trim() === (state.lastPublished || base))
    throw new Error('No changes to publish.');
  git(workspace, ['fetch', 'origin', branch]);
  const remote = git(workspace, ['rev-parse', 'FETCH_HEAD']).stdout.trim();
  if (git(workspace, ['merge-base', '--is-ancestor', remote, 'HEAD'], { allowFailure: true }).status !== 0)
    throw new Error('The default branch advanced. Reconcile it in this isolated workspace, rebuild indexes, then run publish again.');
  git(workspace, ['push', 'origin', `HEAD:${branch}`]);
  git(workspace, ['fetch', 'origin', branch]);
  const head = git(workspace, ['rev-parse', 'HEAD']).stdout.trim();
  if (git(workspace, ['merge-base', '--is-ancestor', head, 'FETCH_HEAD'], { allowFailure: true }).status !== 0)
    throw new Error('Push returned, but the save could not be verified on the remote. Keep the workspace and inspect it.');
  state.lastPublished = head;
  writeFileSync(file, JSON.stringify(state, null, 2));
  process.stdout.write(`Published ${head} to origin/${branch}.\n`);
}

try {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'start') start(args);
  else if (command === 'publish') publish(args);
  else throw new Error('Usage: publish-docs.mjs start --branch DEFAULT -- FILE... | publish --message TEXT');
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}

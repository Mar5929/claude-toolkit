#!/usr/bin/env node
/** Read-only evidence for an interrupted save. Never decides meaning or permission. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { resolve, relative, isAbsolute, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const digest = value => createHash('sha256').update(value).digest('hex');
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function git(root, args) {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
}
function inside(root, path) {
  if (isAbsolute(path) || path.includes('\0') || path.includes('\\')) throw new Error('Use project-relative destination paths.');
  const absolute = resolve(root, path);
  const rel = relative(root, absolute);
  if (!rel || rel === '..' || rel.startsWith('../')) throw new Error('Destination escapes the project.');
  // Check an existing ancestor too, so a missing file below an external symlink is refused.
  let parent = absolute;
  while (!existsSync(parent) && parent !== dirname(parent)) parent = dirname(parent);
  const real = relative(root, realpathSync(parent));
  if (real === '..' || real.startsWith('../') || isAbsolute(real)) throw new Error('Destination follows a symlink outside the project.');
  return absolute;
}
export function readPendingEntry(root, reference) {
  root = realpathSync(root);
  if (!UUID.test(reference)) throw new Error('Reference must be the existing save UUID.');
  const inbox = readFileSync(inside(root, 'knowledge/memory-inbox.md'), 'utf8');
  const start = `<!-- knowledge-save:${reference}:start -->`;
  const end = `<!-- knowledge-save:${reference}:end -->`;
  if (inbox.split(start).length !== 2 || inbox.split(end).length !== 2) throw new Error('Pending entry is missing or duplicated; reconcile the inbox before retry.');
  const from = inbox.indexOf(start), to = inbox.indexOf(end);
  if (to < from) throw new Error('Pending entry markers are out of order.');
  const text = inbox.slice(from, to + end.length);
  const header = text.split('\n### ')[0];
  const field = name => {
    const matches = [...header.matchAll(new RegExp(`^${name}: (.*)$`, 'gm'))];
    if (matches.length !== 1 || !matches[0][1].trim()) throw new Error(`Pending entry needs one nonblank ${name} field.`);
    return matches[0][1];
  };
  const state = field('State');
  if (!['awaiting approval', 'approved, save unfinished', 'blocked by conflict'].includes(state)) throw new Error('Pending entry has an invalid state.');
  if (field('Reference') !== reference) throw new Error('Pending reference does not match its markers.');
  return { reference, revision: field('Revision'), state, text, digest: digest(text) };
}
export function inspectSave({ root, reference, paths, remote = 'origin', branch }) {
  root = realpathSync(root);
  if (!branch || branch.startsWith('-') || remote.startsWith('-')) throw new Error('Name the actual remote and publication branch.');
  git(root, ['check-ref-format', `refs/heads/${branch}`]);
  if (!Array.isArray(paths) || !paths.length) throw new Error('Supply the exact destinations from the approved entry.');
  const entry = readPendingEntry(root, reference);
  const snapshots = paths.map(path => {
    const absolute = inside(root, path);
    return { path, local: existsSync(absolute) ? { exists: true, sha256: digest(readFileSync(absolute)) } : { exists: false } };
  });
  let published = { remote, branch, verified: false, tip: null };
  try {
    const line = git(root, ['ls-remote', '--exit-code', remote, `refs/heads/${branch}`]).trim();
    const [tip, ref] = line.split(/\s+/);
    if (!/^[a-f0-9]{40,64}$/.test(tip) || ref !== `refs/heads/${branch}`) throw new Error('Unexpected remote reference.');
    // Fetch this observed object without modifying a shared branch or FETCH_HEAD.
    git(root, ['fetch', '--no-write-fetch-head', '--no-tags', remote, tip]);
    published = { remote, branch, verified: true, tip, observedAt: new Date().toISOString() };
    for (const file of snapshots) {
      const listing = git(root, ['ls-tree', tip, '--', file.path]).trim();
      if (!listing) file.remote = { exists: false };
      else {
        const mode = listing.split(/\s+/)[0];
        if (!['100644', '100755'].includes(mode)) throw new Error('Remote destination is not a regular file.');
        const content = git(root, ['show', `${tip}:${file.path}`]);
        file.remote = { exists: true, sha256: digest(content) };
      }
      file.localMatchesRemote = file.local.exists === file.remote.exists
        && (!file.local.exists || file.local.sha256 === file.remote.sha256);
    }
  } catch {
    // Do not leak authentication stderr or claim a stale tracking ref is current evidence.
    published = { remote, branch, verified: false, tip: null,
      problem: 'Current remote evidence unavailable. Check access/branch without changing authentication; preserve pending state.' };
    for (const file of snapshots) { delete file.remote; delete file.localMatchesRemote; }
  }
  const trailer = `Knowledge-save: ${reference}`;
  // A fetched object has no ref here: include the observed tip explicitly so
  // another computer's save remains discoverable from an older checkout.
  const revisions = published.verified ? ['--all', published.tip] : ['--all'];
  const candidates = git(root, ['log', ...revisions, '--format=%H', '--fixed-strings', `--grep=${trailer}`]).trim().split('\n').filter(Boolean);
  const commits = [];
  for (const commit of candidates) {
    if (!git(root, ['show', '-s', '--format=%B', commit]).split('\n').includes(trailer)) continue;
    let onRemote = null;
    if (published.verified) {
      try { git(root, ['merge-base', '--is-ancestor', commit, published.tip]); onRemote = true; }
      catch { onRemote = false; }
    }
    commits.push({ commit, onRemote, paths: git(root, ['diff-tree', '--root', '--no-commit-id', '--name-only', '-r', commit]).trim().split('\n').filter(Boolean) });
  }
  return { entry, destinations: snapshots, remote: published, commits,
    workingChanges: git(root, ['status', '--porcelain=v1', '--untracked-files=normal', '--', ...paths]).trim(),
    limitation: 'Evidence only. Compare actual content, latest authority, helper status and checks before any retry or completion claim. Matching files or a commit trailer do not prove approved meaning.' };
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [root, reference, remote, branch, ...paths] = process.argv.slice(2);
    if (!root || !reference) throw new Error('Usage: inspect-knowledge-save.mjs ROOT UUID REMOTE BRANCH DESTINATION...');
    console.log(JSON.stringify(inspectSave({ root, reference, remote, branch, paths }), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

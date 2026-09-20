import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { inspectSave, readPendingEntry } from '../tools/inspect-knowledge-save.mjs';

const reference = 'd870390a-7808-41de-82b8-f4ef915b5ec4';
const other = 'ad3edb50-e42a-441e-ae03-ec05c4fb4285';
const path = 'knowledge/memory/memory-entries/customer-imports.md';
const entry = (ref = reference, state = 'approved, save unfinished') => `<!-- knowledge-save:${ref}:start -->\n## Customer imports\n\nReference: ${ref}\nRevision: 1\nDestination: ${path}\nOperation: update\nState: ${state}\nSource: Fixture owner, 2026-09-19\nConversation: Fixture only\nUpdated: 2026-09-19T18:00:00Z\nNext: Publish approved update.\n\n### Exact card or owed update\n**Change:** Update customer-import matching.\n\n**Summary:** Use customer identifiers, preserving the separate rollback note.\n\n**Your decision:** Save this understanding?\n\n### Authority\nFixture owner approved revision 1 on 2026-09-19, in fixture conversation, only the matching change.\n\n### Execution evidence\nNo worker; publication unverified.\n<!-- knowledge-save:${ref}:end -->\n`;
function fixture(t) {
  const home = mkdtempSync(join(tmpdir(), 'knowledge-recovery-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const remote = join(home, 'remote.git'), root = join(home, 'first');
  const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(home, 'init', '--bare', '--initial-branch=main', remote);
  git(home, 'clone', remote, root);
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  git(root, 'config', 'user.name', 'Fixture');
  mkdirSync(join(root, 'knowledge/memory/memory-entries'), { recursive: true });
  writeFileSync(join(root, path), '# Customer imports\n\nMatch by name.\n\nRollback uses the retained batch file.\n');
  writeFileSync(join(root, 'knowledge/memory-inbox.md'), '# Pending knowledge saves\n\n'+entry()+ '\n'+entry(other, 'awaiting approval'));
  git(root, 'add', path, 'knowledge/memory-inbox.md');
  git(root, 'commit', '-m', 'Fixture baseline');
  git(root, 'push', 'origin', 'main');
  const inspect = () => inspectSave({ root, reference, paths: [path], remote: 'origin', branch: 'main' });
  const write = () => writeFileSync(join(root, path), '# Customer imports\n\nMatch by customer identifier.\n\nRollback uses the retained batch file.\n');
  const commit = () => { git(root, 'add', path); git(root, 'commit', '-m', `Approved matching update\n\nKnowledge-save: ${reference}`); return git(root, 'rev-parse', 'HEAD'); };
  return { home, root, remote, git, inspect, write, commit };
}

test('before edit: exact authority and unanswered card survive; evidence alone claims no completion', t => {
  const f = fixture(t), result = f.inspect();
  assert.equal(result.commits.length, 0);
  assert.equal(result.entry.state, 'approved, save unfinished');
  assert.match(result.entry.text, /approved revision 1/);
  assert.equal(readPendingEntry(f.root, other).state, 'awaiting approval');
  assert.equal(result.destinations[0].localMatchesRemote, true); // Baseline matches too: this cannot establish approval fulfilment.
  assert.match(result.limitation, /do not prove approved meaning/);
});
test('after edit: preserve local authorized content without pretending it is shared', t => {
  const f = fixture(t); f.write();
  const r = f.inspect();
  assert.equal(r.destinations[0].localMatchesRemote, false);
  assert.match(r.workingChanges, /customer-imports/);
  assert.equal(r.commits.length, 0);
});
test('after commit: identifies unpushed effect without replaying it', t => {
  const f = fixture(t); f.write(); const id = f.commit();
  const r = f.inspect();
  assert.equal(r.commits[0].commit, id); assert.equal(r.commits[0].onRemote, false);
  assert.equal(r.workingChanges, '');
});
test('push response lost: current remote ancestry proves commit published; cleanup remains', t => {
  const f = fixture(t); f.write(); const id = f.commit(); f.git(f.root, 'push', 'origin', 'main');
  const r = f.inspect();
  assert.equal(r.remote.verified, true); assert.equal(r.commits[0].commit, id);
  assert.equal(r.commits[0].onRemote, true); assert.equal(r.destinations[0].localMatchesRemote, true);
  assert.equal(r.entry.state, 'approved, save unfinished');
});
test('offline/unavailable remote: stale local refs never pass verification', t => {
  const f = fixture(t); f.write(); f.commit();
  f.git(f.root, 'remote', 'set-url', 'origin', join(f.home, 'absent.git'));
  const r = f.inspect(); assert.equal(r.remote.verified, false);
  assert.equal(r.commits[0].onRemote, null); assert.equal(r.destinations[0].remote, undefined);
});
test('parallel edit and rejected push: inspect current remote content while preserving local work', t => {
  const f = fixture(t), second = join(f.home, 'second');
  f.git(f.home, 'clone', f.remote, second);
  f.git(second, 'config', 'user.email', 'fixture@example.invalid'); f.git(second, 'config', 'user.name', 'Other fixture');
  writeFileSync(join(second, path), '# Customer imports\n\nMatch by name pending decision.\n\nRollback uses the new reviewed batch file.\n');
  f.git(second, 'add', path); f.git(second, 'commit', '-m', 'Independent current change'); f.git(second, 'push', 'origin', 'main');
  f.write(); f.commit(); assert.throws(() => f.git(f.root, 'push', 'origin', 'main'));
  const before = readFileSync(join(f.root, path), 'utf8');
  const r = f.inspect(); assert.equal(r.commits[0].onRemote, false); assert.equal(r.destinations[0].localMatchesRemote, false);
  assert.equal(readFileSync(join(f.root, path), 'utf8'), before);
  assert.match(readPendingEntry(f.root, other).text, /awaiting approval/);
});
test('cross-computer recovery sees only shared pending state, never the unshared local update', t => {
  const f = fixture(t); f.write(); f.commit();
  const second = join(f.home, 'second'); f.git(f.home, 'clone', f.remote, second);
  const r = inspectSave({ root: second, reference, paths: [path], remote: 'origin', branch: 'main' });
  assert.equal(r.commits.length, 0); assert.match(r.entry.text, /approved revision 1/);
  assert.match(readFileSync(join(second, path), 'utf8'), /Match by name/);
});
test('published destination with later conflict: ancestry is retained, current content differs', t => {
  const f = fixture(t); f.write(); f.commit(); f.git(f.root, 'push', 'origin', 'main');
  const second = join(f.home, 'second'); f.git(f.home, 'clone', f.remote, second);
  f.git(second, 'config', 'user.email', 'fixture@example.invalid'); f.git(second, 'config', 'user.name', 'Other fixture');
  writeFileSync(join(second, path), '# Customer imports\n\nOwner later paused identifier matching.\n');
  f.git(second, 'add', path); f.git(second, 'commit', '-m', 'Later direction'); f.git(second, 'push', 'origin', 'main');
  const r = f.inspect(); assert.equal(r.commits[0].onRemote, true); assert.equal(r.destinations[0].localMatchesRemote, false);
  assert.match(r.entry.text, /approved revision 1/);
});
test('stale clone discovers another computer publication without changing local refs', t => {
  const f = fixture(t), second = join(f.home, 'stale');
  f.git(f.home, 'clone', f.remote, second);
  const refs = f.git(second, 'show-ref');
  f.write(); const id = f.commit(); f.git(f.root, 'push', 'origin', 'main');
  const r = inspectSave({ root: second, reference, paths: [path], remote: 'origin', branch: 'main' });
  assert.equal(r.remote.verified, true);
  assert.equal(r.commits[0].commit, id); assert.equal(r.commits[0].onRemote, true);
  assert.equal(r.destinations[0].localMatchesRemote, false);
  assert.equal(f.git(second, 'show-ref'), refs);
  assert.match(readPendingEntry(second, reference).text, /approved revision 1/);
});
test('repeated inspection is read-only; rejected proposal removal is separate from destination deletion', t => {
  const f = fixture(t); f.write(); f.commit(); f.git(f.root, 'push', 'origin', 'main');
  const before = readFileSync(join(f.root, 'knowledge/memory-inbox.md'), 'utf8');
  f.inspect(); f.inspect(); assert.equal(readFileSync(join(f.root, 'knowledge/memory-inbox.md'), 'utf8'), before);
  writeFileSync(join(f.root, 'knowledge/memory-inbox.md'), before.replace(entry(), ''));
  assert.throws(f.inspect, /missing or duplicated/);
  assert.equal(readPendingEntry(f.root, other).state, 'awaiting approval');
  assert.match(readFileSync(join(f.root, path), 'utf8'), /customer identifier/);
});
test('malformed identity, duplicate entry and escaping paths fail before evidence is trusted', t => {
  const f = fixture(t);
  assert.throws(() => inspectSave({ root: f.root, reference, paths: ['../outside'], branch: 'main' }), /escapes/);
  symlinkSync(f.home, join(f.root, 'external'));
  assert.throws(() => inspectSave({ root: f.root, reference, paths: ['external/missing'], branch: 'main' }), /symlink/);
  const inbox = join(f.root, 'knowledge/memory-inbox.md'); writeFileSync(inbox, readFileSync(inbox, 'utf8') + entry());
  assert.throws(f.inspect, /duplicated/);
  assert.throws(() => readPendingEntry(f.root, '--all'), /UUID/);
});
test('missing revision and conflicting header states remain ambiguous', t => {
  const f = fixture(t), inbox = join(f.root, 'knowledge/memory-inbox.md');
  writeFileSync(inbox, entry().replace('Revision: 1\n', ''));
  assert.throws(f.inspect, /one nonblank Revision/);
  writeFileSync(inbox, entry().replace('Revision: 1', 'Revision: 1\nState: awaiting approval'));
  assert.throws(f.inspect, /one nonblank State/);
});

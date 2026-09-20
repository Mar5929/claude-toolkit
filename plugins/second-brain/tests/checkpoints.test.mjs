import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beginReview, recordReview, completion } from '../hooks/knowledge-completion.mjs';
import { buildReminder } from '../hooks/memory-reminder.mjs';
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'knowledge-checkpoint-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, directory: join(root, 'temporary'), identity: { session_id: 'session-a', agent_id: 'root' } };
}
test('missing outcome requests one continuation; repeated stops cannot loop', t => {
  const {root,directory,identity}=fixture(t);beginReview(root,identity,directory);
  assert.equal(completion(root,identity,directory).decision,'block');
  assert.equal(completion(root,identity,directory).decision,undefined);
  assert.equal(completion(root,identity,directory).decision,undefined);
});
test('prior stop-hook continuation does not trigger another block', t => {
  const {root,directory,identity}=fixture(t);beginReview(root,identity,directory);
  assert.equal(completion(root,{...identity,stop_hook_active:true},directory).decision,undefined);
});
test('pending proposal and independent save are valid completed reviews, not completed saves', t => {
  const {root,directory,identity}=fixture(t);
  for(const outcome of ['no-change','pending-approval','save-unfinished','saved']) {
    const {generation}=beginReview(root,identity,directory);
    assert.equal(recordReview(root,identity,generation,outcome,directory).outcome,outcome);
    assert.deepEqual(completion(root,identity,directory),{});
  }
});
test('late prior-turn and different-agent receipts cannot complete the current review', t => {
  const {root,directory,identity}=fixture(t);
  const old=beginReview(root,identity,directory);
  const current=beginReview(root,identity,directory);
  assert.throws(()=>recordReview(root,identity,old.generation,'saved',directory),/Stale/);
  const helper={...identity,agent_id:'worker'};beginReview(root,helper,directory);
  assert.throws(()=>recordReview(root,helper,current.generation,'saved',directory),/Stale/);
  assert.equal(completion(root,identity,directory).decision,'block');
  assert.deepEqual(completion(root,{...helper,hook_event_name:'SubagentStop'},directory),{});
});
test('missing identity has no shared unknown-session state', t => {
  const {root,directory}=fixture(t);assert.throws(()=>beginReview(root,{},directory),/identity/);
});
test('unconfigured/conflicting manuals emit no policy or grant; compatible manual carries both routes', t => {
  const {root}=fixture(t);assert.equal(buildReminder(root),'');
  mkdirSync(join(root,'knowledge'));
  writeFileSync(join(root,'knowledge/knowledge-manual.md'),'<!-- claude-toolkit:knowledge-manual -->\nPolicy');
  const reminder=buildReminder(root);
  assert.match(reminder,/knowledge\/knowledge-manual.md/); assert.match(reminder,/knowledge\/toolkit-manual.md/);
  assert.match(reminder,/only source exception/);assert.match(reminder,/Intent neither/);
  writeFileSync(join(root,'knowledge/README.md'),'<!-- claude-toolkit:knowledge-manual -->\nConflicting policy');
  assert.doesNotMatch(buildReminder(root),/Friendly reminder/);
});

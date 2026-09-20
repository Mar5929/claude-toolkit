import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beginReview, recordReview, completion } from '../hooks/knowledge-completion.mjs';
import { buildReminder } from '../hooks/memory-reminder.mjs';
// Native event IDs are from docs/designs/269-knowledge-system/research/2026-09-20-native-hook-correlation.md.
const observedCodexTurns = {
  session_id: 'codex-session-two-turn',
  first: 'codex-turn-one',
  second: 'codex-turn-two',
};
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'knowledge-checkpoint-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, directory: join(root, 'temporary'), identity: { session_id: 'session-a', agent_id: 'root', turn_id: 'turn-a' } };
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
test('stale Codex Stop A is ignored; genuine B blocks once and continuation B cannot block again', t => {
  const {root,directory}=fixture(t);
  const base={session_id:observedCodexTurns.session_id,agent_id:'root'};
  const turnA={...base,turn_id:observedCodexTurns.first};
  const turnB={...base,turn_id:observedCodexTurns.second};
  assert.equal(beginReview(root,turnA,directory).turn_id,observedCodexTurns.first);
  assert.equal(beginReview(root,turnB,directory).turn_id,observedCodexTurns.second);
  assert.deepEqual(completion(root,{...turnA,hook_event_name:'Stop',stop_hook_active:false},directory),{});
  const firstStop=completion(root,{...turnB,hook_event_name:'Stop',stop_hook_active:false},directory);
  assert.equal(firstStop.decision,'block');
  assert.doesNotMatch(firstStop.reason,/cannot isolate a late Stop/);
  const continuation=completion(root,{...turnB,hook_event_name:'Stop',stop_hook_active:true},directory);
  assert.equal(continuation.decision,undefined);
  assert.match(continuation.systemMessage,/No further continuation/);
  assert.equal(completion(root,{...turnB,hook_event_name:'Stop',stop_hook_active:false},directory).decision,undefined);
});
test('missing turn identifier preserves compatibility and names the late-Stop isolation gap', t => {
  const {root,directory,identity}=fixture(t);
  const {turn_id,...withoutTurn}=identity;
  const legacy=beginReview(root,withoutTurn,directory);
  assert.equal('turn_id' in legacy,false);
  const missingStored=completion(root,{...identity,hook_event_name:'Stop'},directory);
  assert.equal(missingStored.decision,'block');
  assert.match(missingStored.reason,/compatibility mode cannot isolate a late Stop/);
  beginReview(root,identity,directory);
  const missingIncoming=completion(root,{...withoutTurn,hook_event_name:'Stop'},directory);
  assert.equal(missingIncoming.decision,'block');
  assert.match(missingIncoming.reason,/compatibility mode cannot isolate a late Stop/);
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

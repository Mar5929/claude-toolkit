import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, realpathSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  beginReview,
  completion,
  recordReview,
} from '../hooks/knowledge-completion.mjs';
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
function lockFile(root, directory, identity) {
  const key=createHash('sha256')
    .update(JSON.stringify([realpathSync(root),identity.session_id,identity.agent_id||'root']))
    .digest('hex');
  return join(directory,`${key}.json.lock`);
}
test('an old lock still makes the review state busy, names its file, and is never removed', t => {
  const {root,directory,identity}=fixture(t);
  beginReview(root,identity,directory);
  const lock=lockFile(root,directory,identity);
  writeFileSync(lock,'');
  assert.throws(()=>beginReview(root,identity,directory),error=>{
    assert.match(error.message,/Review state is busy/);
    assert.ok(error.message.includes(lock),'the error names the lock file');
    assert.equal(error.lock,lock);
    return true;
  });
  assert.equal(existsSync(lock),true,'the lock is left for its owner to release or the owner to inspect');
});
/**
 * A release that cannot remove the lock must not throw into a caller's
 * fail-open path. An append-only directory lets the lock be created and then
 * refuses to let it be unlinked, so the release fails for real.
 */
test('a release that cannot remove the lock does not throw', {
  skip: process.platform === 'darwin' ? false : 'chflags is macOS-only',
}, t => {
  const {root,directory}=fixture(t);
  const identity={session_id:'release-session',agent_id:'root',turn_id:'turn-one'};
  beginReview(root,identity,directory);
  execFileSync('chflags',['uappnd',directory]);
  try {
    let result;
    assert.doesNotThrow(()=>{
      result=completion(root,{...identity,hook_event_name:'Stop',turn_id:'turn-two'},directory);
    });
    assert.deepEqual(result,{});
    assert.equal(existsSync(lockFile(root,directory,identity)),true,'the lock really could not be removed');
  } finally {
    execFileSync('chflags',['nouappnd',directory]);
  }
});
test('missing identity has no shared unknown-session state', t => {
  const {root,directory}=fixture(t);assert.throws(()=>beginReview(root,{},directory),/identity/);
});
test('unconfigured/conflicting manuals emit no policy or grant; compatible manual carries both routes', t => {
  const {root}=fixture(t);assert.equal(buildReminder(root),'');
  mkdirSync(join(root,'knowledge'));
  writeFileSync(join(root,'knowledge/knowledge-manual.md'),'<!-- claude-toolkit:knowledge-manual -->\nPolicy');
  const reminder=buildReminder(root);
  assert.match(reminder,/knowledge\/knowledge-manual.md/); assert.match(reminder,/Open `knowledge-save` before any memory proposal or save/);
  assert.doesNotMatch(reminder,/acknowledg|Say you will/i);
  writeFileSync(join(root,'knowledge/README.md'),'<!-- claude-toolkit:knowledge-manual -->\nConflicting policy');
  assert.doesNotMatch(buildReminder(root),/Friendly reminder/);
});
// protocol-guard backup field (#396 step 5). With function hooks off the field
// is absent and every check runs as before.
test('completion skips its check only while protocol-guard reports K4 and K6 active', t => {
  const {root,directory,identity}=fixture(t);
  beginReview(root,identity,directory);
  const engine={version:'0.1.0',active:['K4','CW','K5','K6']};
  assert.deepEqual(completion(root,{...identity,hook_event_name:'Stop',toolkit_protocol_engine:engine},directory),{});
  assert.equal(completion(root,{...identity,hook_event_name:'Stop',toolkit_protocol_engine:{version:'0.1.0',active:['K4']}},directory).decision,'block');
  beginReview(root,identity,directory);
  assert.equal(completion(root,{...identity,hook_event_name:'Stop'},directory).decision,'block');
});
test('memory reminder leaves out the turn-review line only while CW, K4 and K6 run', t => {
  const root = mkdtempSync(join(tmpdir(), 'knowledge-reminder-engine-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'knowledge'), { recursive: true });
  execFileSync('cp', [join(import.meta.dirname, '../skills/knowledge-setup/references/templates/knowledge/knowledge-manual.md'), join(root, 'knowledge/knowledge-manual.md')]);
  const run = (input, env = {}) => execFileSync('node', [join(import.meta.dirname, '../hooks/memory-reminder.mjs')], {
    input: JSON.stringify(input),
    env: { ...process.env, CLAUDE_PROJECT_DIR: root, CLAUDE_CODE_ENABLE_FUNCTION_HOOKS: '', TMPDIR: join(root, 'tmp'), ...env },
    encoding: 'utf8',
  });
  const base = { session_id: `reminder-${process.pid}`, agent_id: 'root', turn_id: 'turn-1' };
  mkdirSync(join(root, 'tmp'), { recursive: true });
  assert.match(run(base), /Before you finish, run:/);
  assert.doesNotMatch(run({ ...base, toolkit_protocol_engine: { version: '0.1.0', active: ['K4', 'CW', 'K5', 'K6'] } }), /Before you finish, run:/);
  assert.match(run({ ...base, toolkit_protocol_engine: { version: '0.1.0', active: ['K4', 'K6'] } }), /Before you finish, run:/);
  // Function hooks on and the plugin enabled, but no field: one line per session.
  mkdirSync(join(root, '.claude'), { recursive: true });
  writeFileSync(join(root, '.claude/settings.json'), JSON.stringify({ enabledPlugins: { 'protocol-guard@claude-toolkit': true } }));
  const on = { CLAUDE_CODE_ENABLE_FUNCTION_HOOKS: '1' };
  assert.match(run(base, on), /Required workflow checks are not running/);
  assert.doesNotMatch(run(base, on), /Required workflow checks are not running/);
  assert.doesNotMatch(run({ ...base, session_id: 'other', toolkit_protocol_engine: { version: '0.1.0', active: [] } }, on), /not running/);
});

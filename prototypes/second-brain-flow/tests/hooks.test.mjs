import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  makeProject, ok, refused, prompt, preTool, stopHook, subagentStart, sessionStart, state, where, isDeny, isAllow,
} from './helpers.mjs';
import { splitCommands } from '../engine/shell.mjs';

const PLUGIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('SessionStart initializes the project, writes FLOW_SESSION_ID, and injects context', () => {
  const dir = makeProject();
  const envFile = path.join(dir, 'env.sh');
  fs.writeFileSync(envFile, 'export OTHER=1\n');
  const out = sessionStart(dir, 'sess-42', { CLAUDE_ENV_FILE: envFile });
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(out.hookSpecificOutput.additionalContext, /Memory mode: onboarding/);
  assert.match(out.hookSpecificOutput.additionalContext, /Memory index \(memory\/INDEX\.md\)/);
  assert.match(out.hookSpecificOutput.additionalContext, /Focus \(memory\/FOCUS\.md\)/);
  assert.ok(out.hookSpecificOutput.additionalContext.length < 10000);
  assert.equal(fs.readFileSync(envFile, 'utf8'), "export OTHER=1\nexport FLOW_SESSION_ID='sess-42'\n");
  assert.ok(fs.existsSync(path.join(dir, 'memory', 'config.json')));
  assert.match(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8'), /^\.flow\/$/m);
});

test('SessionStart after compaction re-injects the step in progress', () => {
  const dir = makeProject();
  prompt(dir, 'new work');
  ok(dir, ['route', 'new-work']);
  const out = sessionStart(dir, 's1', {}, 'compact');
  assert.match(out.hookSpecificOutput.additionalContext, /Workflow in progress: new-work:capture/);
  assert.match(out.hookSpecificOutput.additionalContext, /flow item new/);
});

test('UserPromptSubmit starts a turn and moves a waiting owner step forward on continue', () => {
  const dir = makeProject();
  prompt(dir, 'new');
  ok(dir, ['route', 'new-work']);
  ok(dir, ['item', 'new', '--title', 'X']);
  ok(dir, ['next']);
  ok(dir, ['item', 'question', '--text', 'Why?']);
  ok(dir, ['next', '--decision', 'asked']);
  const out = prompt(dir, 'Because.');
  assert.match(out.hookSpecificOutput.additionalContext, /Waiting workflow: refine \(item 1\) at step await-answer/);
  assert.equal(state(dir).turn.n, 2);
  ok(dir, ['route', 'continue']);
  assert.equal(where(dir), 'refine:capture');
});

test('PreToolUse: before routing, only read-only tools and flow commands run', () => {
  const dir = makeProject();
  prompt(dir, 'hello');
  assert.equal(preTool(dir, 'Read', { file_path: path.join(dir, 'README.md') }), null);
  assert.equal(preTool(dir, 'Grep', { pattern: 'x' }), null);
  assert.equal(preTool(dir, 'Skill', { skill: 'second-brain-flow:flow' }), null, 'loading a skill is allowed; its tools are checked');
  assert.ok(isAllow(preTool(dir, 'Bash', { command: 'flow status', description: 'Show status' })));
  assert.ok(isAllow(preTool(dir, 'Bash', { command: `node ${PLUGIN}/bin/flow route chat` })));
  assert.equal(preTool(dir, 'Bash', { command: `${PLUGIN}/bin/flow status && flow item list` }), null);
  assert.ok(isAllow(preTool(dir, 'Bash', { command: "flow memory propose --file - <<'EOF'\n{\"statement\": \"a; b | c && rm -rf /\"}\nEOF" })));
  const denied = preTool(dir, 'Bash', { command: 'npm test' });
  assert.ok(isDeny(denied));
  assert.equal(denied.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /Run `flow route <route>` first/);
  assert.ok(isDeny(preTool(dir, 'Bash', { command: 'flow status; npm test' })));
  assert.ok(isDeny(preTool(dir, 'Bash', { command: 'flow status > out.txt' })));
  assert.ok(isDeny(preTool(dir, 'Bash', { command: 'flow route "$(cat x)"' })));
  assert.ok(isDeny(preTool(dir, 'Write', { file_path: path.join(dir, 'src', 'a.js'), content: 'x' })));
  assert.ok(isDeny(preTool(dir, 'Agent', { prompt: 'x', description: 'x', subagent_type: 'Explore' })));
  // A subagent is not held by routing.
  assert.equal(preTool(dir, 'Bash', { command: 'npm test' }, { agent: 'Explore' }), null);
  ok(dir, ['route', 'chat']);
  assert.equal(preTool(dir, 'Bash', { command: 'npm test' }), null);
  assert.equal(preTool(dir, 'Write', { file_path: path.join(dir, 'src', 'a.js'), content: 'x' }), null);
});

test('PreToolUse: writes to memory/ and work/ are refused for every agent, at all times', () => {
  const dir = makeProject();
  prompt(dir, 'hi');
  ok(dir, ['route', 'chat']);
  for (const agent of [null, 'second-brain-flow:memory-librarian']) {
    const opts = { agent };
    assert.ok(isDeny(preTool(dir, 'Write', { file_path: path.join(dir, 'memory', 'topics', 'x.md'), content: 'x' }, opts)));
    assert.ok(isDeny(preTool(dir, 'Edit', { file_path: path.join(dir, 'work', '1-x', 'ITEM.md'), old_string: 'a', new_string: 'b', replace_all: false }, opts)));
    assert.ok(isDeny(preTool(dir, 'MultiEdit', { file_path: path.join(dir, 'memory', 'INDEX.md'), edits: [] }, opts)));
    for (const command of [
      'echo hi > memory/INDEX.md',
      'echo hi >> ./work/1-x/ITEM.md',
      'cat x | tee memory/log.md',
      "sed -i 's/a/b/' memory/topics/x.md",
      'rm -rf work/1-x',
      'mv notes.md memory/topics/',
      `cp a.md ${path.join(dir, 'memory', 'topics', 'a.md')}`,
      'touch work/new',
      'git checkout -- memory/',
    ]) {
      const out = preTool(dir, 'Bash', { command }, opts);
      assert.ok(isDeny(out), `refuse: ${command}`);
      assert.match(out.hookSpecificOutput.permissionDecisionReason, /change only through the flow command/);
    }
  }
  const focus = preTool(dir, 'Edit', { file_path: path.join(dir, 'memory', 'FOCUS.md'), old_string: 'a', new_string: 'b' });
  assert.match(focus.hookSpecificOutput.permissionDecisionReason, /flow focus todo\|upcoming\|remove/, 'the refusal names the command for FOCUS.md');
  assert.match(preTool(dir, 'Bash', { command: 'echo x > memory/INDEX.md' }).hookSpecificOutput.permissionDecisionReason, /INDEX.md is generated by flow/);
  assert.equal(preTool(dir, 'Bash', { command: 'cat memory/INDEX.md' }), null);
  assert.equal(preTool(dir, 'Bash', { command: 'grep -r okta memory/ work/' }), null);
  assert.equal(preTool(dir, 'Read', { file_path: path.join(dir, 'memory', 'INDEX.md') }), null);
  assert.equal(preTool(dir, 'Write', { file_path: path.join(dir, 'docs', 'memory.md'), content: 'x' }), null);
  assert.ok(isAllow(preTool(dir, 'Bash', { command: 'flow librarian apply --action create' }, { agent: 'second-brain-flow:memory-librarian' })));
});

test('PreToolUse: flow trust set needs the owner command; a save phrase forces remember', () => {
  const dir = makeProject();
  prompt(dir, 'turn on trust please');
  const out = preTool(dir, 'Bash', { command: 'flow trust set on' });
  assert.ok(isDeny(out));
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /Only the owner/);
  prompt(dir, '/second-brain-flow:trust on');
  assert.ok(isAllow(preTool(dir, 'Bash', { command: 'flow trust set on' })));
  assert.ok(isDeny(preTool(dir, 'Bash', { command: 'flow trust set off' })));

  prompt(dir, 'save this: Tuesdays');
  assert.ok(isDeny(preTool(dir, 'Bash', { command: 'flow route chat' })));
  assert.ok(isAllow(preTool(dir, 'Bash', { command: 'flow route remember' })));
});

test('SubagentStart marks queued jobs dispatched only for the librarian', () => {
  const dir = makeProject();
  prompt(dir, '/trust on');
  ok(dir, ['trust', 'set', 'on']);
  ok(dir, ['route', 'remember']);
  ok(dir, ['memory', 'propose', '--type', 'fact', '--title', 'A', '--statement', 'B.', '--why', 'C', '--source', 'owner']);
  assert.equal(subagentStart(dir, 'Explore'), null);
  assert.equal(state(dir).subagentStarts.length, 0);
  const out = subagentStart(dir, 'second-brain-flow:memory-librarian');
  assert.equal(out.hookSpecificOutput.hookEventName, 'SubagentStart');
  assert.match(out.hookSpecificOutput.additionalContext, /flow librarian next/);
  assert.equal(state(dir).subagentStarts.length, 1);
  const queue = path.join(dir, '.flow', 'queue');
  const job = JSON.parse(fs.readFileSync(path.join(queue, fs.readdirSync(queue)[0]), 'utf8'));
  assert.equal(job.status, 'dispatched');
});

test('Stop: blocks an unrouted turn once, and never when stop_hook_active is true', () => {
  const dir = makeProject();
  prompt(dir, 'hi');
  const out = stopHook(dir, 'Hello!');
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /never routed/);
  assert.equal(stopHook(dir, 'Hello!', { active: true }), null);
  ok(dir, ['route', 'chat']);
  assert.equal(stopHook(dir, 'Hello!'), null);
});

test('Stop: blocks when the current agent step fails its exit checks; owner steps are a valid stop', () => {
  const dir = makeProject();
  prompt(dir, 'new work');
  ok(dir, ['route', 'new-work']);
  const out = stopHook(dir, 'Tell me more.');
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /step capture is not finished.*flow item new/);
  assert.equal(stopHook(dir, 'Tell me more.', { active: true }), null);
  ok(dir, ['item', 'new', '--title', 'X']);
  ok(dir, ['next']);
  ok(dir, ['item', 'question', '--text', 'Why?']);
  ok(dir, ['next', '--decision', 'asked']);
  assert.equal(where(dir), 'refine:await-answer');
  assert.equal(stopHook(dir, 'Q1: Why?'), null);
});

test('Stop: blocks when a proposal card id is missing from the reply', () => {
  const dir = makeProject();
  prompt(dir, 'save this: short replies');
  ok(dir, ['route', 'remember']);
  const card = ok(dir, ['memory', 'propose', '--type', 'preference', '--title', 'Short', '--statement', 'Short replies.', '--why', 'Asked.', '--source', 'owner']);
  const id = /Memory proposal (mem-[0-9a-f]+)/.exec(card)[1];
  ok(dir, ['next']);
  ok(dir, ['next']);
  const out = stopHook(dir, 'I would like to save a preference. Approve?');
  assert.equal(out.decision, 'block');
  assert.match(out.reason, new RegExp(`card ${id}`));
  assert.equal(stopHook(dir, `Memory proposal ${id}: short replies. Approve?`), null);
});

test('Stop: blocks when a librarian job is queued but no librarian started', () => {
  const dir = makeProject();
  prompt(dir, '/trust on');
  ok(dir, ['trust', 'set', 'on']);
  ok(dir, ['route', 'chat']);
  prompt(dir, 'save this: deploys on Tuesday');
  ok(dir, ['route', 'remember']);
  ok(dir, ['memory', 'propose', '--type', 'fact', '--title', 'Deploy day', '--statement', 'Tuesday.', '--why', 'Said.', '--source', 'owner']);
  ok(dir, ['next']);
  const out = stopHook(dir, 'Saving to memory: deploy day.');
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /librarian agent has not started/);
  assert.equal(stopHook(dir, 'x', { active: true }), null);
  subagentStart(dir, 'second-brain-flow:memory-librarian');
  ok(dir, ['next']);
  assert.equal(stopHook(dir, 'Saving to memory: deploy day.'), null);
});

test('parallel sessions keep separate state and share memory files', () => {
  const dir = makeProject();
  prompt(dir, 'new work', 'A');
  prompt(dir, 'hello', 'B');
  ok(dir, ['route', 'new-work'], { session: 'A' });
  assert.equal(where(dir, 'A'), 'new-work:capture');
  assert.equal(where(dir, 'B'), 'turn:route');
  assert.ok(isDeny(preTool(dir, 'Bash', { command: 'npm test' }, { session: 'B' })));
  assert.equal(preTool(dir, 'Bash', { command: 'npm test' }, { session: 'A' }), null);
  ok(dir, ['item', 'new', '--title', 'From A'], { session: 'A' });
  ok(dir, ['route', 'new-work'], { session: 'B' });
  ok(dir, ['item', 'new', '--title', 'From B'], { session: 'B' });
  assert.equal(state(dir, 'A').stack[0].vars.item, 1);
  assert.equal(state(dir, 'B').stack[0].vars.item, 2);
  assert.ok(fs.existsSync(path.join(dir, '.flow', 'sessions', 'A.json')));
  assert.ok(fs.existsSync(path.join(dir, '.flow', 'sessions', 'B.json')));
});

test('hook wrappers read stdin JSON and print the JSON output', () => {
  const dir = makeProject();
  const run = (file, input) => spawnSync(process.execPath, [path.join(PLUGIN, 'hooks', file)], { input: JSON.stringify(input), encoding: 'utf8', env: { PATH: process.env.PATH } });
  const base = { session_id: 'w1', transcript_path: '/tmp/t.jsonl', cwd: dir, permission_mode: 'default' };
  const s = run('session-start.mjs', { ...base, hook_event_name: 'SessionStart', source: 'startup' });
  assert.equal(s.status, 0);
  assert.equal(JSON.parse(s.stdout).hookSpecificOutput.hookEventName, 'SessionStart');
  const u = run('user-prompt-submit.mjs', { ...base, hook_event_name: 'UserPromptSubmit', prompt: 'hi' });
  assert.match(JSON.parse(u.stdout).hookSpecificOutput.additionalContext, /flow route/);
  const p = run('pre-tool-use.mjs', { ...base, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'ls -la' }, tool_use_id: 't1' });
  assert.equal(JSON.parse(p.stdout).hookSpecificOutput.permissionDecision, 'deny');
  const st = run('stop.mjs', { ...base, hook_event_name: 'Stop', stop_hook_active: false, last_assistant_message: 'hi' });
  assert.equal(JSON.parse(st.stdout).decision, 'block');
  const sa = run('subagent-start.mjs', { ...base, hook_event_name: 'SubagentStart', agent_id: 'a1', agent_type: 'Explore' });
  assert.equal(sa.stdout, '');
  const bad = spawnSync(process.execPath, [path.join(PLUGIN, 'hooks', 'stop.mjs')], { input: 'not json', encoding: 'utf8' });
  assert.equal(bad.status, 0, 'a broken input never blocks the session');
});

test('the shell reader splits commands and skips heredoc bodies', () => {
  const segs = splitCommands("FLOW_SESSION_ID=x flow item answer Q1 --text 'yes; do it' && echo ok | tee out.txt");
  assert.equal(segs.length, 3);
  assert.deepEqual(segs[0].tokens, ['FLOW_SESSION_ID=x', 'flow', 'item', 'answer', 'Q1', '--text', 'yes; do it']);
  assert.deepEqual(segs[2].tokens, ['tee', 'out.txt']);
  const doc = splitCommands("flow memory propose --file - <<'EOF'\n{\"a\": \"x > memory/y\"}\nEOF\necho done > work/z");
  assert.deepEqual(doc.map((s) => s.tokens[0]), ['flow', 'echo']);
  assert.deepEqual(doc[1].redirects, ['work/z']);
});

test('a background task notification is not an owner prompt', () => {
  const dir = makeProject();
  prompt(dir, 'save this: invoices go out on the 5th');
  ok(dir, ['route', 'remember']);
  const card = ok(dir, ['memory', 'propose', '--type', 'fact', '--title', 'Invoice day', '--statement', 'Invoices go out on the 5th.', '--why', 'Owner said so.', '--source', 'owner, 2026-09-26']);
  const id = /Memory proposal (\S+)/.exec(card)[1];
  ok(dir, ['next']);
  ok(dir, ['next']);
  assert.equal(where(dir), 'remember:await-decision');
  const lastOwner = state(dir).lastOwnerPromptAt;

  // Shaped like the message Claude Code sent in the end-to-end run.
  const out = prompt(dir, '<task-notification>\n<task-id>a00c4bf2</task-id>\n<status>completed</status>\n</task-notification>');
  assert.match(out.hookSpecificOutput.additionalContext, /not an owner prompt/);
  const s = state(dir);
  assert.equal(s.lastOwnerPromptAt, lastOwner, 'the owner prompt time does not move');
  assert.equal(s.turn.routed, true);
  assert.equal(where(dir), 'remember:await-decision', 'the waiting owner step stays put');
  assert.match(refused(dir, ['route', 'continue']), /owner has not answered/);
  assert.match(refused(dir, ['memory', 'approve', id]), /owner has not replied/);
  assert.equal(stopHook(dir, 'The librarian finished.'), null, 'a notification turn ends without a route');
  assert.equal(isDeny(preTool(dir, 'Bash', { command: 'ls' })), false, 'tools run in a notification turn');

  // The owner's real reply still works afterwards.
  prompt(dir, 'approve');
  ok(dir, ['route', 'continue']);
  ok(dir, ['memory', 'approve', id]);
});

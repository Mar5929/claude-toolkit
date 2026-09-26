// Test helpers: a temporary project, the flow command, and synthetic hook input
// shaped like the examples in ai-external-knowledge/claude-code/hooks.md.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { run } from '../engine/cli.mjs';
import * as hooks from '../engine/hooks.mjs';
import { loadSession } from '../engine/project.mjs';

const PLUGIN_BIN = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'bin');

// A temporary project with a .git folder. It is set up with `flow init`
// unless init is false, since ordinary flow commands no longer set one up.
export function makeProject({ init = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sbf-test-'));
  fs.mkdirSync(path.join(dir, '.git'));
  if (init) {
    const r = run(['init'], { cwd: dir, env: {}, stdin: () => '' });
    assert.equal(r.code, 0, r.stderr);
  }
  return dir;
}

export function flow(dir, args, { session = 's1', stdin = '' } = {}) {
  return run(args, { cwd: dir, env: { FLOW_SESSION_ID: session }, stdin: () => stdin });
}

// Runs flow and fails the test when it is refused.
export function ok(dir, args, opts) {
  const r = flow(dir, args, opts);
  assert.equal(r.code, 0, `flow ${args.join(' ')} was refused: ${r.stderr}`);
  return r.stdout;
}

// Runs flow and fails the test when it is not refused.
export function refused(dir, args, opts) {
  const r = flow(dir, args, opts);
  assert.equal(r.code, 1, `flow ${args.join(' ')} should be refused but printed: ${r.stdout}`);
  assert.match(r.stderr, /^Refused: /);
  return r.stderr;
}

function common(dir, session, event) {
  return {
    session_id: session,
    transcript_path: `/home/user/.claude/projects/x/${session}.jsonl`,
    cwd: dir,
    permission_mode: 'default',
    hook_event_name: event,
  };
}

export function prompt(dir, text, session = 's1') {
  return hooks.userPromptSubmit({ ...common(dir, session, 'UserPromptSubmit'), prompt: text }, {});
}

export function preTool(dir, toolName, toolInput, { session = 's1', agent = null } = {}) {
  const input = { ...common(dir, session, 'PreToolUse'), tool_name: toolName, tool_input: toolInput, tool_use_id: 'toolu_01ABC' };
  if (agent) Object.assign(input, { agent_id: 'agent-abc123', agent_type: agent });
  // Claude Code puts the plugin's bin/ on the PATH, so a bare `flow` resolves to it.
  return hooks.preToolUse(input, { PATH: `${PLUGIN_BIN}${path.delimiter}/usr/bin` });
}

export function stopHook(dir, lastMessage, { session = 's1', active = false } = {}) {
  return hooks.stop({
    ...common(dir, session, 'Stop'),
    stop_hook_active: active,
    last_assistant_message: lastMessage,
    background_tasks: [],
    session_crons: [],
  }, {});
}

export function subagentStart(dir, agentType, session = 's1') {
  return hooks.subagentStart({ ...common(dir, session, 'SubagentStart'), agent_id: 'agent-abc123', agent_type: agentType }, {});
}

export function sessionStart(dir, session = 's1', env = {}, source = 'startup') {
  return hooks.sessionStart({ ...common(dir, session, 'SessionStart'), source, model: 'claude-opus-5' }, env);
}

export function state(dir, session = 's1') {
  return loadSession(dir, session);
}

export function topFrame(dir, session = 's1') {
  const s = state(dir, session);
  return s.stack[s.stack.length - 1] || null;
}

export function where(dir, session = 's1') {
  const f = topFrame(dir, session);
  return f ? `${f.workflow}:${f.step}` : 'empty';
}

export function isDeny(out) {
  return out?.hookSpecificOutput?.permissionDecision === 'deny';
}

export function isAllow(out) {
  return out?.hookSpecificOutput?.permissionDecision === 'allow';
}

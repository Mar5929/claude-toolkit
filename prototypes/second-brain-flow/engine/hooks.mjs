// Hook logic. Each function takes the parsed hook input and returns the JSON
// object Claude Code expects on stdout, or null for no output.
// Field names follow ai-external-knowledge/claude-code/hooks.md (captured 2026-09-22).
import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot, projectPaths, readText } from './core.mjs';
import { ensureInit, loadConfig, loadSession, updateSession } from './project.mjs';
import { SAVE_PHRASE, beginTurn, beginNotificationTurn, top, stepOf, missingForStep, describe } from './runner.mjs';
import { markDispatched, getJob } from './memory.mjs';
import { splitCommands, programOf, isFlowProgram } from './shell.mjs';

const TRUST_COMMAND = /^\s*\/(?:second-brain-flow:)?trust\s+(on|off)\b/i;
// Claude Code delivers a finished background task to the main agent as a user
// message that starts with this tag. The prompt hook sees it like an owner prompt.
const NOTIFICATION = /^\s*<task-notification>/;
// Skill only loads instructions; the tools a skill then uses are checked one by one.
const READ_ONLY_TOOLS = new Set(['Read', 'Glob', 'Grep', 'LS', 'NotebookRead', 'ToolSearch', 'Skill', 'WebFetch', 'WebSearch', 'TaskList', 'TaskGet', 'TaskOutput']);
const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const WRITE_PROGRAMS = new Set(['tee', 'mv', 'cp', 'rm', 'touch', 'mkdir', 'rmdir', 'ln', 'truncate', 'install', 'rsync', 'unlink', 'dd', 'chmod']);
const LIBRARIAN = /memory-librarian/;

function rootFor(input, env) {
  return findProjectRoot(input.cwd || process.cwd(), env);
}

function sessionIdOf(input) {
  return String(input.session_id || 'manual').replace(/[^A-Za-z0-9_.-]/g, '_');
}

function clip(text, max) {
  const t = String(text || '').trim();
  return t.length > max ? `${t.slice(0, max)}\n(cut at ${max} characters; read the file for the rest)` : t;
}

// ---------- SessionStart ----------

export function sessionStart(input, env = process.env) {
  const root = rootFor(input, env);
  ensureInit(root);
  const id = sessionIdOf(input);
  if (env.CLAUDE_ENV_FILE) {
    fs.appendFileSync(env.CLAUDE_ENV_FILE, `export FLOW_SESSION_ID='${id}'\n`);
  }
  const state = updateSession(root, id, (session) => {
    session.lastSource = input.source || null;
    return { stack: session.stack.map((f) => `${f.workflow}:${f.step}`), text: session.stack.length ? describe({ root, session }) : null };
  });
  const p = projectPaths(root);
  const lines = [
    `This project uses second-brain-flow. Memory mode: ${loadConfig(root).mode}.`,
    'Each owner prompt starts the turn workflow, and the prompt hook names the current step. `flow status` shows it at any time.',
    'Memory and work-item files change only through the `flow` command.',
    '',
    'Memory index (memory/INDEX.md):',
    clip(readText(p.index, ''), 4000),
    '',
    'Focus (memory/FOCUS.md):',
    clip(readText(p.focus, ''), 2000),
  ];
  if (state.text) lines.push('', `Workflow in progress: ${state.stack.join(' > ')}.`, state.text);
  return { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: lines.join('\n') } };
}

// ---------- UserPromptSubmit ----------

export function userPromptSubmit(input, env = process.env) {
  const root = rootFor(input, env);
  ensureInit(root);
  const prompt = String(input.prompt || '');
  if (NOTIFICATION.test(prompt)) {
    const note = updateSession(root, sessionIdOf(input), (session) => beginNotificationTurn({ root, session }, { prompt }));
    return { hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: `second-brain-flow:\n${note}` } };
  }
  const trust = TRUST_COMMAND.exec(prompt);
  const save = SAVE_PHRASE.test(prompt);
  const text = updateSession(root, sessionIdOf(input), (session) => beginTurn({ root, session }, {
    prompt,
    forcedRoute: save ? 'remember' : null,
    trustPermission: trust ? trust[1].toLowerCase() : null,
  }));
  return { hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: `second-brain-flow:\n${text}` } };
}

// ---------- PreToolUse ----------

function deny(reason) {
  return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } };
}

function protectedArea(root, cwd, target) {
  if (!target || typeof target !== 'string') return null;
  const cleaned = target.replace(/\\/g, '/').replace(/^of=/, '');
  if (cleaned.startsWith('~') || cleaned.startsWith('$')) return null;
  const abs = path.resolve(cwd, cleaned);
  const rel = path.relative(root, abs).replace(/\\/g, '/');
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  const first = rel.split('/')[0];
  return first === 'memory' || first === 'work' ? first : null;
}

function protectedMessage(area, target = '') {
  const name = path.basename(String(target));
  let how = 'Use `flow item ...`.';
  if (area === 'memory') {
    if (name === 'FOCUS.md') how = 'Use `flow focus todo|upcoming|remove --text "..."`; the open items list is rebuilt from the items.';
    else if (['INDEX.md', 'GLOSSARY.md', 'log.md'].includes(name)) how = `${name} is generated by flow. Change topics through \`flow route remember\`.`;
    else how = 'Save memory with `flow route remember`.';
  }
  return `Files under ${area}/ change only through the flow command. ${how} Run \`flow help\` for the commands.`;
}

// Returns a refusal reason when a shell command writes under memory/ or work/.
function shellWriteReason(root, cwd, segments) {
  for (const seg of segments) {
    for (const target of seg.redirects) {
      const area = protectedArea(root, cwd, target);
      if (area) return protectedMessage(area, target);
    }
    const { program, args } = programOf(seg.tokens);
    const name = path.basename(program);
    if (isFlowProgram(program, args).flow) continue;
    let writes = WRITE_PROGRAMS.has(name);
    if ((name === 'sed' || name === 'perl') && args.some((a) => /^-[a-zA-Z]*i/.test(a))) writes = true;
    if (name === 'git' && ['rm', 'mv', 'checkout', 'restore', 'clean', 'apply'].includes(args[0])) writes = true;
    if (!writes) continue;
    for (const a of args) {
      const area = protectedArea(root, cwd, a);
      if (area) return protectedMessage(area, a);
    }
  }
  return null;
}

export function preToolUse(input, env = process.env) {
  const root = rootFor(input, env);
  const cwd = input.cwd || root;
  const tool = input.tool_name;
  const ti = input.tool_input || {};
  const session = loadSession(root, sessionIdOf(input));
  const isSubagent = Boolean(input.agent_id);

  if (WRITE_TOOLS.has(tool)) {
    const area = protectedArea(root, cwd, ti.file_path || ti.notebook_path);
    if (area) return deny(protectedMessage(area, ti.file_path || ti.notebook_path));
  }

  let onlyFlow = false;
  if (tool === 'Bash' || tool === 'PowerShell') {
    const segments = splitCommands(ti.command);
    const writeReason = shellWriteReason(root, cwd, segments);
    if (writeReason) return deny(writeReason);
    onlyFlow = segments.length > 0;
    for (const seg of segments) {
      const { program, args } = programOf(seg.tokens);
      const flow = isFlowProgram(program, args);
      if (!flow.flow || seg.opaque || seg.redirects.length) {
        onlyFlow = false;
        continue;
      }
      const [cmd, sub, value] = flow.args;
      if (cmd === 'trust' && sub === 'set' && session.turn?.trustPermission !== value) {
        return deny(`Only the owner can change the memory mode. The owner types \`/second-brain-flow:trust ${value || 'on'}\`. Tell the owner that.`);
      }
      const forced = session.turn?.forcedRoute;
      if (!isSubagent && cmd === 'route' && forced && !session.turn.routed && sub !== forced) {
        return deny(`The owner's prompt starts with a save phrase. Run \`flow route ${forced}\`.`);
      }
    }
  }

  // Routing applies to the main agent only. Subagents do not route turns.
  if (!isSubagent && session.turn && !session.turn.routed) {
    if (READ_ONLY_TOOLS.has(tool) || onlyFlow) return null;
    return deny('This turn has no route yet. Run `flow route <route>` first (`flow status` lists the routes). Until then only read-only tools and `flow` commands run.');
  }
  return null;
}

// ---------- SubagentStart ----------

export function subagentStart(input, env = process.env) {
  if (!LIBRARIAN.test(String(input.agent_type || ''))) return null;
  const root = rootFor(input, env);
  const id = sessionIdOf(input);
  const marked = updateSession(root, id, (session) => {
    let jobs = markDispatched(root, id);
    if (!jobs.length) jobs = markDispatched(root, null);
    session.subagentStarts.push({ agent_type: input.agent_type, agent_id: input.agent_id || null, at: new Date().toISOString(), jobs });
    return jobs;
  });
  return {
    hookSpecificOutput: {
      hookEventName: 'SubagentStart',
      additionalContext: `Librarian jobs started for this run: ${marked.length ? marked.join(', ') : 'none new'}. Run \`flow librarian next\` for the first job.`,
    },
  };
}

// ---------- Stop ----------

export function stop(input, env = process.env) {
  if (input.stop_hook_active) return null;
  const root = rootFor(input, env);
  const id = sessionIdOf(input);
  if (!fs.existsSync(path.join(projectPaths(root).sessions, `${id}.json`))) return null;
  const session = loadSession(root, id);
  const turn = session.turn;
  if (!turn) return null;
  const ctx = { root, session };
  const reasons = [];
  if (!turn.routed) {
    reasons.push('This turn was never routed. Run `flow route <route>` and follow the step it prints.');
  } else {
    const frame = top(session);
    const step = stepOf(frame);
    if (step?.kind === 'agent') {
      const missing = missingForStep(ctx, frame, null);
      if (missing.length) reasons.push(`Workflow ${frame.workflow} step ${frame.step} is not finished. ${missing.join(' ')}`);
    }
  }
  const reply = String(input.last_assistant_message || '');
  const cards = new Set(session.proposals.filter((p) => p.turn === turn.n).map((p) => p.id));
  for (const cardId of cards) {
    const stillPending = fs.existsSync(path.join(projectPaths(root).pending, `${cardId}.json`));
    if (stillPending && !reply.includes(cardId)) reasons.push(`Show memory proposal card ${cardId} in your reply, with its id. \`flow memory pending\` prints it.`);
  }
  for (const job of session.jobs.filter((j) => j.turn === turn.n)) {
    let status = 'done';
    try { status = getJob(root, job.id).status; } catch { /* job removed */ }
    if (status === 'queued' && !reasons.some((r) => r.includes(job.id))) reasons.push(`Librarian job ${job.id} is queued but the memory-librarian agent has not started. Start it with the Agent tool, in the background.`);
  }
  if (!reasons.length) return null;
  return { decision: 'block', reason: `second-brain-flow: before you end this reply: ${reasons.join(' ')}` };
}

// ---------- stdin wrapper ----------

const HANDLERS = {
  SessionStart: sessionStart,
  UserPromptSubmit: userPromptSubmit,
  PreToolUse: preToolUse,
  SubagentStart: subagentStart,
  Stop: stop,
};

export async function runHookFromStdin(eventName) {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  try {
    const input = raw.trim() ? JSON.parse(raw) : {};
    const output = HANDLERS[eventName](input, process.env);
    if (output) process.stdout.write(`${JSON.stringify(output)}\n`);
  } catch (err) {
    // A broken hook must not stop the session. The error goes to the debug log.
    process.stderr.write(`second-brain-flow ${eventName} hook failed: ${err.stack || err.message}\n`);
  }
  process.exit(0);
}

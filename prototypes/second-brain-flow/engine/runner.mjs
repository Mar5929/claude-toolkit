// The step runner: a stack of workflows, named exit checks, and named auto actions.
import { now, isAfter, refuse } from './core.mjs';
import { loadConfig } from './project.mjs';
import { loadWorkflow } from './workflows.mjs';
import { findItem, listItems, renderItem } from './items.mjs';
import { recall, formatHits, listPending, listJobs, getJob, pendingPath } from './memory.mjs';
import { refreshFocus, getSection } from './focus.mjs';
import fs from 'node:fs';

// An owner prompt that starts with one of these phrases must route `remember`.
export const SAVE_PHRASE = /^\s*(save this|remember this|remember that)\b/i;

export const ROUTES = ['chat', 'recall', 'new-work', 'resume-work', 'refine', 'work', 'remember', 'wrap-up', 'continue'];

export function top(session) {
  return session.stack[session.stack.length - 1] || null;
}

export function stepOf(frame) {
  if (!frame) return null;
  return loadWorkflow(frame.workflow).steps[frame.step];
}

export function recordFact(session, kind, data = {}) {
  const frame = top(session);
  if (!frame) return;
  frame.facts = frame.facts || [];
  frame.facts.push({ kind, at: now(), ...data });
}

function factsSince(frame, kinds, sinceStepStart = true) {
  const list = Array.isArray(kinds) ? kinds : [kinds];
  return (frame.facts || []).filter((f) => list.includes(f.kind) && (!sinceStepStart || !isAfter(frame.stepStarted, f.at)));
}

function frameItem(ctx, frame) {
  if (!frame.vars?.item) return null;
  try {
    return findItem(ctx.root, frame.vars.item);
  } catch {
    return null;
  }
}

// ---------- exit checks: each returns null when satisfied, or what is missing ----------

export const CHECKS = {
  routed: (ctx) => (ctx.session.turn?.routed ? null : 'This turn has no route. Run `flow route <route>`.'),
  itemCreated: (ctx, frame) => (factsSince(frame, 'item-created', false).length ? null
    : 'No work item was created. Run `flow item new --title "..." --goal "..." --why "..."`.'),
  questionAsked: (ctx, frame) => (factsSince(frame, 'question').length ? null
    : 'No question was recorded in this step. Run `flow item question --text "..."`.'),
  questionsRecordedOrNone: (ctx, frame) => (factsSince(frame, ['question', 'question-none']).length ? null
    : 'Record each clarifying question with `flow item question --text "..."`, or run `flow item question --none`.'),
  askedOrNone: (ctx, frame, decision) => {
    if (decision === 'none') return factsSince(frame, 'question-none').length ? null
      : 'Run `flow item question --none` first, to record that no question is needed.';
    if (decision === 'asked') return factsSince(frame, 'question').length ? null
      : 'No question was recorded in this step. Run `flow item question --text "..."` or `--ask <Q id>`.';
    return factsSince(frame, ['question', 'question-none']).length ? null
      : 'Record each question with `flow item question --text "..."` (or `--ask <Q id>` for an open one), or run `flow item question --none`.';
  },
  openQuestionsResolved: (ctx, frame) => {
    const item = frameItem(ctx, frame);
    if (!item) return 'No work item is selected for this workflow.';
    const open = item.questions.filter((q) => q.state === 'asked').map((q) => q.id);
    return open.length ? `Questions still open on item ${item.fm.id}: ${open.join(', ')}. Save each with \`flow item answer <Q id> --text "..."\`, \`--defer\`, or \`--withdraw\`.` : null;
  },
  answersSaved: (ctx, frame) => CHECKS.openQuestionsResolved(ctx, frame),
  requirementsIfReady: (ctx, frame, decision) => {
    if (decision !== 'ready') return null;
    const item = frameItem(ctx, frame);
    return item && item.requirements.length ? null : 'The item has no requirements yet. Add them with `flow item requirement --text "..."`.';
  },
  approvalProposed: (ctx, frame) => (factsSince(frame, 'approval-proposed').length ? null
    : 'Approval was not proposed. Run `flow item approve --propose`.'),
  approvalRecordedIfApproved: (ctx, frame, decision) => {
    if (decision !== 'approved') return null;
    const item = frameItem(ctx, frame);
    return item && item.fm.requirements_approved ? null : 'The approval is not recorded. Run `flow item approve`.';
  },
  progressRecorded: (ctx, frame) => (factsSince(frame, 'progress').length ? null
    : 'No progress was recorded in this step. Run `flow item progress --text "..."`.'),
  nextStepRecorded: (ctx, frame) => (factsSince(frame, 'next-step').length ? null
    : 'The next step is not recorded. Run `flow item progress --next "..."`.'),
  proposalCreated: (ctx, frame) => (factsSince(frame, 'proposal').length ? null
    : 'No memory proposal was made. Run `flow memory propose ...`.'),
  cardCreated: (ctx, frame) => {
    const ids = factsSince(frame, 'proposal', false).map((f) => f.id);
    return ids.some((id) => fs.existsSync(pendingPath(ctx.root, id))) ? null
      : 'No pending proposal card exists for this workflow. Run `flow memory propose ...`.';
  },
  proposalResolved: (ctx, frame, decision) => {
    const need = { approved: 'proposal-approved', rejected: 'proposal-rejected', edited: 'proposal-edited' }[decision];
    if (!need) return null;
    if (factsSince(frame, need).length) return null;
    const cmd = { approved: 'flow memory approve <id>', rejected: 'flow memory reject <id>', edited: 'flow memory edit <id> ...' }[decision];
    return `The decision "${decision}" is not recorded. Run \`${cmd}\` first.`;
  },
  librarianStarted: (ctx, frame) => {
    const ids = factsSince(frame, 'job-queued', false).map((f) => f.id);
    if (!ids.length) return 'No librarian job was queued in this workflow.';
    const waiting = ids.filter((id) => {
      try { return getJob(ctx.root, id).status === 'queued'; } catch { return false; }
    });
    return waiting.length ? `The memory-librarian agent has not started for job ${waiting.join(', ')}. Start it with the Agent tool, in the background.` : null;
  },
  focusNotesRecorded: (ctx, frame) => (factsSince(frame, ['focus', 'next-step']).length ? null
    : 'Nothing was recorded. Run `flow focus todo --text "..."`, `flow item progress --next "..."`, or `flow focus none`.'),
};

// ---------- auto actions: each returns { output, branch } ----------

export const ACTIONS = {
  orient: (ctx) => ({ output: orientText(ctx) }),
  loadItemContext: (ctx, frame) => {
    const item = findItem(ctx.root, frame.vars?.item);
    const hits = recall(ctx.root, `${item.fm.title} ${item.goal}`, { limit: 5, topicsOnly: true });
    return {
      output: [
        `Work item ${item.fm.id}, stage ${item.fm.stage}:`,
        renderItem(item).trim(),
        '',
        'Related memory:',
        formatHits(hits),
      ].join('\n'),
    };
  },
  recallSearch: (ctx, frame) => {
    const query = frame.vars?.query || ctx.session.turn?.prompt || '';
    return { output: `Memory and work items matching "${query.slice(0, 80)}":\n${formatHits(recall(ctx.root, query))}` };
  },
  modeGate: (ctx) => {
    const mode = loadConfig(ctx.root).mode === 'trusted' ? 'trusted' : 'onboarding';
    return { output: `Memory mode is ${mode}.`, branch: mode };
  },
  routeByStage: (ctx, frame) => {
    const item = findItem(ctx.root, frame.vars?.item);
    const branch = ['discovery', 'refinement'].includes(item.fm.stage) ? 'refine' : 'work';
    return { output: `Item ${item.fm.id} is in ${item.fm.stage}, so the ${branch} workflow runs.`, branch };
  },
  refreshFocus: (ctx) => {
    const text = refreshFocus(ctx.root);
    return { output: `Focus file rebuilt. Open items:\n${getSection(text, 'items')}` };
  },
};

// ---------- orient ----------

export function orientText(ctx) {
  const { session, root } = ctx;
  const config = loadConfig(root);
  const lines = [`Turn ${session.turn?.n ?? 0}. Memory mode: ${config.mode}.`];
  const below = session.stack.filter((f) => f.workflow !== 'turn');
  if (below.length) {
    const f = below[below.length - 1];
    const step = stepOf(f);
    const item = f.vars?.item ? ` (item ${f.vars.item})` : '';
    if (step?.kind === 'owner') lines.push(`Waiting workflow: ${f.workflow}${item} at step ${f.step}, for the owner's answer. If this prompt answers it, route \`continue\`.`);
    else lines.push(`Open workflow: ${f.workflow}${item} at step ${f.step}. Route \`continue\` to resume it, or run \`flow cancel\` to drop it.`);
  }
  if (session.turn?.forcedRoute) lines.push(`The owner's prompt starts with a save phrase, so the route must be \`${session.turn.forcedRoute}\`.`);
  if (session.turn?.trustPermission) lines.push(`The owner typed the trust command. Run \`flow trust set ${session.turn.trustPermission}\`.`);
  const pending = listPending(root);
  if (pending.length) lines.push(`Pending memory proposals: ${pending.map((p) => `${p.id} (${p.title})`).join('; ')}.`);
  const queued = listJobs(root).filter((j) => j.status === 'queued');
  if (queued.length) lines.push(`Librarian jobs not started: ${queued.length}.`);
  const open = listItems(root).filter((i) => i.fm.stage !== 'done');
  if (open.length) lines.push(`Open items: ${open.slice(0, 6).map((i) => `${i.fm.id} ${i.fm.title} (${i.fm.stage})`).join('; ')}.`);
  return lines.join('\n');
}

// ---------- running steps ----------

function enter(frame, stepName) {
  frame.step = stepName;
  frame.stepStarted = now();
  frame.callPushed = false;
}

function makeFrame(workflowId, vars) {
  const def = loadWorkflow(workflowId);
  return { workflow: workflowId, step: def.start, stepStarted: now(), vars: { ...vars }, decisions: {}, facts: [], started: now() };
}

// Runs auto, call, and end steps until an agent or owner step is current.
export function settle(ctx) {
  const out = [];
  for (let guard = 0; guard < 200; guard += 1) {
    const frame = top(ctx.session);
    if (!frame) break;
    const def = loadWorkflow(frame.workflow);
    const step = def.steps[frame.step];
    if (step.kind === 'auto') {
      const result = ACTIONS[step.action](ctx, frame);
      if (result.output) out.push(result.output);
      const target = step.branches ? step.branches[result.branch] : step.next;
      if (!target) refuse(`Auto step ${frame.step} gave branch "${result.branch}", which the workflow does not define.`);
      if (step.branches) frame.decisions[frame.step] = result.branch;
      enter(frame, target);
    } else if (step.kind === 'call') {
      if (frame.callPushed) {
        enter(frame, step.next);
      } else {
        frame.callPushed = true;
        ctx.session.stack.push(makeFrame(step.workflow, frame.vars));
        out.push(`Starting workflow ${step.workflow}.`);
      }
    } else if (step.kind === 'end') {
      ctx.session.stack.pop();
      out.push(`Workflow ${frame.workflow} is finished.`);
      const parent = top(ctx.session);
      if (parent) {
        if (frame.vars?.item && !parent.vars?.item) parent.vars.item = frame.vars.item;
        if (stepOf(parent).kind !== 'call') break;
      }
    } else {
      break;
    }
  }
  return out;
}

export function missingForStep(ctx, frame, decision) {
  const step = stepOf(frame);
  return (step.exit || []).map((name) => CHECKS[name](ctx, frame, decision)).filter(Boolean);
}

export function describe(ctx) {
  const frame = top(ctx.session);
  if (!frame) return 'No workflow is active. The next owner prompt starts one.';
  const step = stepOf(frame);
  const item = frame.vars?.item ? `, item ${frame.vars.item}` : '';
  const head = `Workflow ${frame.workflow}${item}, step ${frame.step} (${step.kind}).`;
  if (step.kind === 'owner') return `${head}\nThe workflow waits for the owner. End your reply now.`;
  const lines = [head, step.instructions];
  const missing = missingForStep(ctx, frame, null);
  if (missing.length) lines.push(`Still needed: ${missing.join(' ')}`);
  if (step.branches) lines.push(`Decisions: ${Object.keys(step.branches).map((d) => `\`flow next --decision ${d}\``).join(', ')}.`);
  return lines.join('\n');
}

export function statusText(ctx) {
  const { session } = ctx;
  const lines = [];
  lines.push(`Session ${session.id}. Memory mode: ${loadConfig(ctx.root).mode}.`);
  if (session.turn) lines.push(`Turn ${session.turn.n}: ${session.turn.routed ? `routed to ${session.turn.route}` : 'not routed yet'}.`);
  if (session.stack.length) {
    lines.push(`Workflow stack, top last: ${session.stack.map((f) => `${f.workflow}:${f.step}`).join(' > ')}.`);
  }
  lines.push(describe(ctx));
  return lines.join('\n');
}

export function pushWorkflow(ctx, workflowId, vars = {}) {
  ctx.session.stack.push(makeFrame(workflowId, vars));
  const out = settle(ctx);
  out.push(describe(ctx));
  return out.join('\n');
}

export function next(ctx, decision) {
  const frame = top(ctx.session);
  if (!frame) refuse('No workflow is active. Run `flow status`.');
  const step = stepOf(frame);
  if (frame.workflow === 'turn') refuse('Choose this turn\'s route with `flow route <route>`, not `flow next`.');
  if (step.kind === 'owner') refuse(`Workflow ${frame.workflow} is waiting for the owner at step ${frame.step}. End your reply. The owner's next prompt continues it.`);
  if (step.kind !== 'agent') refuse(`Step ${frame.step} is not an agent step.`);
  if (step.branches) {
    const options = Object.keys(step.branches);
    if (!decision) refuse(`Step ${frame.step} needs a decision. Run one of: ${options.map((d) => `\`flow next --decision ${d}\``).join(', ')}.`);
    if (!options.includes(decision)) refuse(`"${decision}" is not a decision for step ${frame.step}. Choose one of: ${options.join(', ')}.`);
  } else if (decision) {
    refuse(`Step ${frame.step} takes no decision. Run \`flow next\`.`);
  }
  const missing = missingForStep(ctx, frame, decision);
  if (missing.length) refuse(`Step ${frame.step} is not finished.\n${missing.join('\n')}`);
  const done = frame.step;
  if (decision) frame.decisions[done] = decision;
  enter(frame, step.branches ? step.branches[decision] : step.next);
  const out = [`Step ${done} is complete${decision ? ` (decision: ${decision})` : ''}.`, ...settle(ctx), describe(ctx)];
  return out.join('\n');
}

export function route(ctx, target, { item, query } = {}) {
  const { session } = ctx;
  if (!ROUTES.includes(target)) refuse(`"${target}" is not a route. Routes: ${ROUTES.join(', ')}.`);
  const turn = session.turn;
  if (turn?.forcedRoute && !turn.routed && target !== turn.forcedRoute) {
    refuse(`The owner's prompt starts with a save phrase. Run \`flow route ${turn.forcedRoute}\`.`);
  }
  const onTurn = top(session)?.workflow === 'turn';
  if (target === 'continue') {
    const below = session.stack.filter((f) => f.workflow !== 'turn');
    if (!below.length) refuse('No workflow is waiting. Choose another route.');
  }
  const def = target === 'continue' ? null : loadWorkflow(target);
  let vars = {};
  if (def?.needsItem) {
    if (!item) refuse(`Route ${target} needs an item. Run \`flow route ${target} --item <id>\`. Run \`flow item list\` for ids.`);
    findItem(ctx.root, item);
    vars.item = Number(item);
  } else if (item) {
    findItem(ctx.root, item);
    vars.item = Number(item);
  }
  if (target === 'recall') vars.query = query || turn?.prompt || '';

  if (onTurn) session.stack.pop();
  if (turn && !turn.routed) {
    turn.routed = true;
    turn.route = target;
    turn.routedAt = now();
  }
  if (target === 'continue') {
    const frame = top(session);
    const step = stepOf(frame);
    const out = [`Route: continue ${frame.workflow}.`];
    if (step.kind === 'owner') {
      if (!isAfter(frame.ownerRepliedAt, frame.stepStarted)) {
        refuse(`Workflow ${frame.workflow} is waiting for the owner at step ${frame.step}, and the owner has not answered since it started. End your reply.`);
      }
      enter(frame, step.next);
      out.push(...settle(ctx));
    }
    out.push(describe(ctx));
    return out.join('\n');
  }
  return [`Route: ${target}.`, pushWorkflow(ctx, target, vars)].join('\n');
}

export function cancel(ctx) {
  const frame = top(ctx.session);
  if (!frame) refuse('No workflow is active.');
  if (frame.workflow === 'turn') refuse('The turn workflow cannot be cancelled. Run `flow route <route>`.');
  ctx.session.stack.pop();
  // A parent waiting on this call is dropped too, since its step cannot finish.
  while (top(ctx.session) && stepOf(top(ctx.session)).kind === 'call' && top(ctx.session).callPushed) ctx.session.stack.pop();
  return `Workflow ${frame.workflow} was dropped at step ${frame.step}.\n${describe(ctx)}`;
}

// Called by the prompt hook. Starts a new turn and returns the orient text.
export function beginTurn(ctx, { prompt, forcedRoute = null, trustPermission = null }) {
  const { session } = ctx;
  session.stack = session.stack.filter((f) => f.workflow !== 'turn');
  // Steps marked closeOnNewTurn (a plain answer) finish when the owner moves on.
  for (let guard = 0; guard < 20; guard += 1) {
    const frame = top(session);
    const step = stepOf(frame);
    if (!step || step.kind !== 'agent' || !step.closeOnNewTurn) break;
    enter(frame, step.next);
    settle(ctx);
  }
  const at = now();
  session.turn = {
    n: (session.turn?.n || 0) + 1,
    promptAt: at,
    routed: false,
    route: null,
    forcedRoute,
    trustPermission,
    prompt: String(prompt || '').slice(0, 500),
  };
  session.lastOwnerPromptAt = at;
  for (const frame of session.stack) if (stepOf(frame).kind === 'owner') frame.ownerRepliedAt = at;
  return pushWorkflow(ctx, 'turn');
}

// Called by the prompt hook for a message Claude Code sends on its own, such as
// a background task notification. It is not an owner prompt: it moves no owner
// step forward, counts for no approval, and needs no route.
export function beginNotificationTurn(ctx, { prompt }) {
  const { session } = ctx;
  session.stack = session.stack.filter((f) => f.workflow !== 'turn');
  session.turn = {
    n: (session.turn?.n || 0) + 1,
    promptAt: now(),
    routed: true,
    route: 'notification',
    notification: true,
    forcedRoute: null,
    trustPermission: null,
    prompt: String(prompt || '').slice(0, 500),
  };
  return [
    'This message is a background task notification from Claude Code, not an owner prompt.',
    'It answers no waiting step and counts as no approval. No route is needed.',
    'Tell the owner the result in one line and end your reply.',
    describe(ctx),
  ].join('\n');
}

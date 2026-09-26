// The flow command. run(argv, { cwd, env, stdin }) returns { code, stdout, stderr }.
import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot, Refusal, refuse, now, isAfter, projectPaths, readText, parseFrontMatter } from './core.mjs';
import { ensureInit, loadConfig, saveConfig, sessionIdFromEnv, updateSession } from './project.mjs';
import {
  route, next, cancel, statusText, recordFact, top, CHECKS, ACTIONS, ROUTES,
} from './runner.mjs';
import { loadWorkflow, listWorkflowIds, validateWorkflow, diagram } from './workflows.mjs';
import {
  createItem, findItem, listItems, addQuestion, resolveQuestion, addRequirement, addProgress, setStage,
  renderItem, STAGES, OWNER_GATED_STAGES, parseItem,
} from './items.mjs';
import {
  makeProposal, savePending, getPending, removePending, renderCard, listPending, queueJob, listJobs,
  openJobs, applyLibrarian, undoChange, readLog, recall, formatHits, appendLog, memoryProblems,
  regenerate,
} from './memory.mjs';
import { addFocusLine, removeFocusLine, refreshFocus, focusProblems } from './focus.mjs';

const HELP = `flow: the second-brain workflow command.

  flow status                       Current workflow, step, and what it still needs.
  flow route <route> [--item N]     Choose this turn's route. Routes: ${ROUTES.join(', ')}.
  flow next [--decision <d>]        Finish the current step.
  flow cancel                       Drop the current workflow.
  flow item new|show|list|question|answer|requirement|progress|stage|approve
  flow memory recall <words>        Search memory topics and work items.
  flow memory propose --type --title --statement --why --source
  flow memory approve|reject|edit <id>
  flow memory pending|log|undo <change id>
  flow focus todo|upcoming|remove --text "..." | flow focus none
  flow librarian next|apply|done    Used by the memory-librarian agent only.
  flow trust [set on|off]           Show or change the memory mode.
  flow diagram <workflow>           Mermaid diagram of a workflow.
  flow workflows                    List workflows.
  flow doctor [--fix]               Check memory and work-item files.
  flow init                         Set up memory/ and work/ in this project.

Bigger inputs: pass --file <path.json>, or --file - to read JSON from stdin.`;

export function parseArgs(argv, stdin) {
  const positional = [];
  const opts = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq > 0) {
        opts[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        opts[arg.slice(2)] = argv[i + 1];
        i += 1;
      } else {
        opts[arg.slice(2)] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  if (opts.file) {
    const raw = opts.file === '-' || opts.file === true ? stdin() : fs.readFileSync(opts.file, 'utf8');
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      refuse('The --file input is not valid JSON.');
    }
    delete opts.file;
    for (const [k, v] of Object.entries(data)) if (opts[k] === undefined) opts[k] = v;
  }
  return { positional, opts };
}

function str(v) {
  return typeof v === 'string' ? v : v === undefined || v === true ? '' : String(v);
}

function currentItemId(session, opts, positional) {
  if (opts.item !== undefined && opts.item !== true) return Number(opts.item);
  const numeric = positional.find((p) => /^\d+$/.test(p));
  if (numeric) return Number(numeric);
  for (let i = session.stack.length - 1; i >= 0; i -= 1) {
    if (session.stack[i].vars?.item) return session.stack[i].vars.item;
  }
  refuse('No work item is selected. Pass `--item <id>`. Run `flow item list` for ids.');
  return null;
}

function ownerRepliedSince(session, createdAt) {
  return isAfter(session.lastOwnerPromptAt, createdAt);
}

// ---------- item ----------

function itemCommand(ctx, sub, positional, opts) {
  const { root, session } = ctx;
  const text = str(opts.text);
  switch (sub) {
    case 'new': {
      const item = createItem(root, { title: str(opts.title), goal: str(opts.goal), why: str(opts.why) });
      const frame = top(session);
      if (frame && frame.workflow !== 'turn' && !frame.vars.item) frame.vars.item = item.fm.id;
      recordFact(session, 'item-created', { item: item.fm.id });
      return `Created work item ${item.fm.id}: ${item.fm.title}, stage discovery.\nFile: ${path.relative(root, item.file)}\nNext: run \`flow next\`.`;
    }
    case 'list': {
      const items = listItems(root);
      if (!items.length) return 'No work items yet. Create one with `flow route new-work`.';
      return items.map((i) => `${i.fm.id} ${i.fm.title} (${i.fm.stage}). Next: ${i.next || 'not recorded'}`).join('\n');
    }
    case 'show': {
      const item = findItem(root, currentItemId(session, opts, positional));
      return renderItem(item).trim();
    }
    case 'question': {
      const id = currentItemId(session, opts, positional);
      if (opts.none) {
        findItem(root, id);
        recordFact(session, 'question-none', { item: id });
        return 'Recorded: no clarifying questions. Next: run `flow next`.';
      }
      const { result } = addQuestion(root, id, text);
      recordFact(session, 'question', { item: id, question: result });
      return `Recorded question ${result} on item ${id}. Ask it in your reply. Record any other questions the same way, then run \`flow next\`.`;
    }
    case 'answer': {
      const qid = positional.find((p) => /^q\d+$/i.test(p)) || opts.question;
      if (!qid) refuse('Name the question: `flow item answer <Q id> --text "..."`.');
      const id = currentItemId(session, opts, positional.filter((p) => p !== qid));
      const { result } = resolveQuestion(root, id, qid, { answer: text, defer: opts.defer === true, withdraw: opts.withdraw === true });
      recordFact(session, 'answer', { item: id, question: String(qid).toUpperCase(), outcome: result });
      return `Question ${String(qid).toUpperCase()} on item ${id} is ${result}.`;
    }
    case 'requirement': {
      const id = currentItemId(session, opts, positional);
      const { result, item } = addRequirement(root, id, text, { source: str(opts.source) || 'owner' });
      recordFact(session, 'requirement', { item: id, requirement: result });
      return `Added requirement ${result} (draft) to item ${id}. Stage: ${item.fm.stage}.`;
    }
    case 'progress': {
      const id = currentItemId(session, opts, positional);
      addProgress(root, id, text, str(opts.next));
      if (text) recordFact(session, 'progress', { item: id });
      if (opts.next) recordFact(session, 'next-step', { item: id });
      return `Recorded on item ${id}.${text ? ' Progress added.' : ''}${opts.next ? ' Next step updated.' : ''}`;
    }
    case 'stage': {
      const stage = positional.find((p) => STAGES.includes(p)) || str(opts.stage);
      const id = currentItemId(session, opts, positional);
      if (!STAGES.includes(stage)) refuse(`Name a stage: ${STAGES.join(', ')}.`);
      return stageChange(ctx, id, stage, opts.propose === true);
    }
    case 'approve':
      return stageChange(ctx, currentItemId(session, opts, positional), 'requirements-approved', opts.propose === true);
    default:
      refuse('Item commands: new, show, list, question, answer, requirement, progress, stage, approve.');
  }
  return '';
}

function stageChange(ctx, id, stage, propose) {
  const { root, session } = ctx;
  const item = findItem(root, id);
  if (OWNER_GATED_STAGES.includes(stage)) {
    if (propose) {
      session.approvalRequests.push({ item: id, stage, createdAt: now(), turn: session.turn?.n ?? 0 });
      recordFact(session, 'approval-proposed', { item: id, stage });
      return `Proposed moving item ${id} to ${stage}. Ask the owner in your reply and end it. After the owner answers yes, run \`flow item ${stage === 'done' ? 'stage done' : 'approve'} --item ${id}\`.`;
    }
    const request = [...session.approvalRequests].reverse().find((r) => r.item === id && r.stage === stage);
    if (!request) refuse(`Moving item ${id} to ${stage} needs the owner's approval. First run \`flow item ${stage === 'done' ? 'stage done' : 'approve'} --item ${id} --propose\`, ask the owner, and end your reply.`);
    if (!ownerRepliedSince(session, request.createdAt)) refuse(`The owner has not replied since you proposed ${stage} for item ${id}. End your reply and wait for the owner's answer.`);
  } else if (propose) {
    refuse(`Stage ${stage} does not need owner approval. Run \`flow item stage ${stage} --item ${id}\`.`);
  }
  if (item.fm.stage === stage) return `Item ${id} is already in ${stage}.`;
  setStage(root, id, stage);
  if (stage === 'requirements-approved') recordFact(session, 'item-approved', { item: id });
  return `Item ${id} moved from ${item.fm.stage} to ${stage}.`;
}

// ---------- memory ----------

function memoryCommand(ctx, sub, positional, opts) {
  const { root, session } = ctx;
  const mode = loadConfig(root).mode;
  const id = positional[0] || str(opts.id);
  switch (sub) {
    case 'recall': {
      const query = positional.join(' ') || str(opts.query);
      if (!query) refuse('Pass the words to search for: `flow memory recall <words>`.');
      return formatHits(recall(root, query, { includeSuperseded: opts.all === true }));
    }
    case 'propose': {
      const frame = top(session);
      if (!frame || frame.workflow !== 'remember' || frame.step !== 'propose') {
        refuse('Memory proposals are made inside the remember workflow. Run `flow route remember` first.');
      }
      const proposal = makeProposal(opts, { session: session.id, turn: session.turn?.n ?? 0 });
      recordFact(session, 'proposal', { id: proposal.id });
      if (mode === 'trusted') {
        const job = queueJob(root, proposal, { mode, approval: null, session: session.id });
        session.jobs.push({ id: job.id, queuedAt: job.queued_at, turn: session.turn?.n ?? 0 });
        recordFact(session, 'job-queued', { id: job.id });
        return `Trusted mode. Queued librarian job ${job.id} for "${proposal.title}".\nNext: run \`flow next\`, then start the memory-librarian agent in the background.`;
      }
      savePending(root, proposal);
      session.proposals.push({ id: proposal.id, createdAt: proposal.created_at, turn: session.turn?.n ?? 0 });
      return `Onboarding mode. Nothing is saved until the owner approves.\nShow this card in your reply, with its id:\n\n${renderCard(root, proposal)}\n\nNext: run \`flow next\`.`;
    }
    case 'pending': {
      const list = listPending(root);
      return list.length ? list.map((p) => renderCard(root, p)).join('\n\n') : 'No pending proposals.';
    }
    case 'approve': {
      const proposal = getPending(root, id);
      if (!ownerRepliedSince(session, proposal.created_at)) {
        refuse(`The owner has not replied since proposal ${id} was shown. Show the card, end your reply, and wait for the owner.`);
      }
      const job = queueJob(root, proposal, {
        mode, session: session.id, approval: { by: 'owner', at: now(), owner_prompt_at: session.lastOwnerPromptAt },
      });
      removePending(root, id);
      session.jobs.push({ id: job.id, queuedAt: job.queued_at, turn: session.turn?.n ?? 0 });
      recordFact(session, 'proposal-approved', { id });
      recordFact(session, 'job-queued', { id: job.id });
      return `Approved ${id}. Queued librarian job ${job.id}.\nNext: run \`flow next --decision approved\`, then start the memory-librarian agent in the background.`;
    }
    case 'reject': {
      const proposal = getPending(root, id);
      removePending(root, id);
      appendLog(root, `${now()} | ${id} | rejected | - | "${proposal.title}" | mode ${mode} | owner rejected`);
      recordFact(session, 'proposal-rejected', { id });
      return `Rejected ${id}. Nothing was saved.\nNext: run \`flow next --decision rejected\`.`;
    }
    case 'edit': {
      const proposal = getPending(root, id);
      const changed = {};
      for (const field of ['type', 'title', 'statement', 'why', 'source', 'summary']) {
        if (typeof opts[field] === 'string') changed[field] = opts[field];
      }
      if (!Object.keys(changed).length) refuse('Pass the fields to change, for example `--statement "..."`.');
      const updated = makeProposal({ ...proposal, ...changed }, { session: session.id, turn: session.turn?.n ?? 0 });
      updated.id = proposal.id;
      savePending(root, updated);
      session.proposals.push({ id: updated.id, createdAt: updated.created_at, turn: session.turn?.n ?? 0 });
      recordFact(session, 'proposal-edited', { id });
      return `Edited ${id}. The owner must see the new card before it can be approved:\n\n${renderCard(root, updated)}\n\nNext: run \`flow next --decision edited\`.`;
    }
    case 'log': {
      const lines = readLog(root, Number(opts.lines) || 20);
      return lines.length ? lines.join('\n') : 'The memory log is empty.';
    }
    case 'undo': {
      if (!id) refuse('Name the change: `flow memory undo <change id>`. Run `flow memory log` for ids.');
      const h = undoChange(root, id);
      return `Undid change ${id}. Restored: ${Object.keys(h.files).join(', ') || 'nothing'}. INDEX.md and GLOSSARY.md were rebuilt.`;
    }
    default:
      refuse('Memory commands: recall, propose, pending, approve, reject, edit, log, undo.');
  }
  return '';
}

// ---------- librarian ----------

function librarianCommand(ctx, sub, positional, opts) {
  const { root } = ctx;
  switch (sub) {
    case 'next': {
      const job = openJobs(root)[0];
      if (!job) return 'No librarian jobs are waiting. Run `flow librarian done` and stop.';
      const p = job.proposal;
      const hits = recall(root, `${p.title} ${p.statement}`, { limit: 5, topicsOnly: true });
      return [
        `Job ${job.id} (${job.mode} mode). Proposal:`,
        `Type: ${p.type}`, `Title: ${p.title}`, `Statement: ${p.statement}`, `Why: ${p.why}`, `Source: ${p.source}`,
        '',
        'Closest existing topics (read any you need):',
        formatHits(hits),
        '',
        'Decide one action and run it:',
        `  flow librarian apply --job ${job.id} --action create [--summary "..."]`,
        `  flow librarian apply --job ${job.id} --action update --topic <id> [--text "..."]`,
        `  flow librarian apply --job ${job.id} --action supersede --topic <old id>`,
        `  flow librarian apply --job ${job.id} --action merge --topic <keep id> --from <other id>`,
        `  flow librarian apply --job ${job.id} --action skip --reason "..."`,
      ].join('\n');
    }
    case 'apply': {
      const jobId = str(opts.job) || openJobs(root)[0]?.id;
      if (!jobId) refuse('No librarian job is waiting.');
      const r = applyLibrarian(root, jobId, {
        action: str(opts.action), topic: str(opts.topic), from: str(opts.from), reason: str(opts.reason),
        summary: str(opts.summary), text: str(opts.text),
      });
      const left = openJobs(root).length;
      return `Applied ${r.action} for job ${jobId}. Change ${r.changeId}. Topics: ${r.topics.join(', ') || 'none'}.\nINDEX.md, GLOSSARY.md, and log.md are updated.\nNext: ${left ? 'run `flow librarian next`.' : 'run `flow librarian done`.'}`;
    }
    case 'done': {
      const left = openJobs(root);
      const done = listJobs(root).filter((j) => j.status === 'done').slice(-5);
      const lines = done.map((j) => `- ${j.id}: ${j.result.action} ${j.result.topics.join(', ')}`.trim());
      if (left.length) return `Jobs still waiting: ${left.map((j) => j.id).join(', ')}. Run \`flow librarian next\`.`;
      return `All librarian jobs are done.\n${lines.join('\n')}\nReport one line per job to the main agent and stop.`;
    }
    default:
      refuse('Librarian commands: next, apply, done.');
  }
  return '';
}

// ---------- trust, focus, doctor ----------

function trustCommand(ctx, positional) {
  const { root, session } = ctx;
  const config = loadConfig(root);
  if (positional[0] !== 'set') {
    return `Memory mode: ${config.mode}. Changed ${config.changed_at} by ${config.changed_by}.\nOnly the owner can change it, by typing \`/second-brain-flow:trust on\` or \`off\`.`;
  }
  const value = positional[1];
  if (!['on', 'off'].includes(value)) refuse('Run `flow trust set on` or `flow trust set off`.');
  if (session.turn?.trustPermission !== value) {
    refuse(`Only the owner can change the memory mode. The owner types \`/second-brain-flow:trust ${value}\` to do it.`);
  }
  const mode = value === 'on' ? 'trusted' : 'onboarding';
  const history = [...(config.history || []), { from: config.mode, to: mode, at: now(), by: 'owner', session: session.id }];
  saveConfig(root, { ...config, mode, changed_at: now(), changed_by: 'owner', history });
  appendLog(root, `${now()} | mode | ${config.mode} -> ${mode} | owner command | session ${session.id}`);
  return `Memory mode is now ${mode}.${mode === 'trusted' ? ' Saves go straight to the librarian. The owner can review them with `flow memory log`.' : ' Every save needs the owner\'s approval.'}`;
}

function focusCommand(ctx, sub, opts) {
  const { root, session } = ctx;
  const text = str(opts.text);
  if (sub === 'todo' || sub === 'upcoming') {
    addFocusLine(root, sub, text);
    recordFact(session, 'focus', { section: sub });
    return `Added to ${sub === 'todo' ? 'owner to-dos' : 'upcoming'}.`;
  }
  if (sub === 'remove') {
    const n = removeFocusLine(root, text);
    recordFact(session, 'focus', { section: 'remove' });
    return `Removed ${n} line${n === 1 ? '' : 's'}.`;
  }
  if (sub === 'none') {
    recordFact(session, 'focus', { section: 'none' });
    return 'Recorded: no focus changes.';
  }
  if (!sub || sub === 'show') return refreshFocus(root).trim();
  refuse('Focus commands: show, todo, upcoming, remove, none.');
  return '';
}

function itemProblems(root) {
  const problems = [];
  const dir = projectPaths(root).work;
  if (!fs.existsSync(dir)) return problems;
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name, 'ITEM.md');
    if (!fs.existsSync(file)) continue;
    const item = parseItem(readText(file), file);
    if (!item) { problems.push(`work/${name}/ITEM.md has no front matter.`); continue; }
    for (const field of ['id', 'title', 'stage', 'created', 'updated']) if (!item.fm[field]) problems.push(`work/${name}/ITEM.md is missing ${field}.`);
    if (!name.startsWith(`${item.fm.id}-`)) problems.push(`work/${name} does not start with its id ${item.fm.id}.`);
    if (!STAGES.includes(item.fm.stage)) problems.push(`work/${name}/ITEM.md has unknown stage ${item.fm.stage}.`);
    const { body } = parseFrontMatter(readText(file));
    for (const s of ['Goal', 'Why', 'Requirements', 'Open questions', 'Decisions', 'Progress', 'Next step']) {
      if (!body.includes(`## ${s}`)) problems.push(`work/${name}/ITEM.md is missing the ${s} section.`);
    }
    for (const r of item.requirements) if (!r.id) problems.push(`work/${name}/ITEM.md has a requirement line flow cannot read: ${r.text}`);
    for (const q of item.questions) if (!q.id) problems.push(`work/${name}/ITEM.md has a question line flow cannot read: ${q.text}`);
  }
  return problems;
}

function doctor(ctx, opts) {
  const { root } = ctx;
  if (opts.fix) {
    regenerate(root);
    refreshFocus(root);
  }
  const problems = [
    ...memoryProblems(root),
    ...itemProblems(root),
    ...focusProblems(readText(projectPaths(root).focus, '')),
    ...listWorkflowIds().flatMap((id) => validateWorkflow(loadWorkflow(id), { checks: CHECKS, actions: ACTIONS })),
  ];
  if (!problems.length) return { text: `No problems found.${opts.fix ? ' INDEX.md, GLOSSARY.md, and FOCUS.md were rebuilt.' : ''}` };
  return { text: `${problems.length} problem${problems.length === 1 ? '' : 's'}:\n${problems.map((p) => `- ${p}`).join('\n')}`, code: 1 };
}

// ---------- dispatch ----------

export function run(argv, { cwd = process.cwd(), env = process.env, stdin = () => fs.readFileSync(0, 'utf8') } = {}) {
  try {
    const [cmd, sub, ...restArgs] = argv;
    if (!cmd || cmd === 'help' || cmd === '--help') return { code: 0, stdout: HELP, stderr: '' };
    if (cmd === 'diagram') {
      if (!sub) refuse('Name a workflow: `flow diagram <workflow>`.');
      return { code: 0, stdout: diagram(sub), stderr: '' };
    }
    if (cmd === 'workflows') {
      return { code: 0, stdout: listWorkflowIds().map((id) => `${id}: ${loadWorkflow(id).title}`).join('\n'), stderr: '' };
    }
    const root = findProjectRoot(cwd, env);
    const created = ensureInit(root);
    if (cmd === 'init') {
      return { code: 0, stdout: created ? `Set up memory/ and work/ in ${root}. Memory mode: onboarding.` : `Already set up in ${root}.`, stderr: '' };
    }
    const sessionId = sessionIdFromEnv(env);
    const subArgs = ['item', 'memory', 'librarian', 'focus'].includes(cmd) ? restArgs : [sub, ...restArgs].filter((x) => x !== undefined);
    const { positional, opts } = parseArgs(subArgs, stdin);
    let code = 0;
    const stdout = updateSession(root, sessionId, (session) => {
      const ctx = { root, session };
      switch (cmd) {
        case 'status': return statusText(ctx);
        case 'route': {
          if (!positional[0]) refuse(`Name a route: ${ROUTES.join(', ')}.`);
          return route(ctx, positional[0], { item: opts.item, query: str(opts.query) || positional.slice(1).join(' ') });
        }
        case 'next': return next(ctx, opts.decision === true ? '' : str(opts.decision));
        case 'cancel': return cancel(ctx);
        case 'item': return itemCommand(ctx, sub, positional, opts);
        case 'memory': return memoryCommand(ctx, sub, positional, opts);
        case 'librarian': return librarianCommand(ctx, sub, positional, opts);
        case 'focus': return focusCommand(ctx, sub, opts);
        case 'trust': return trustCommand(ctx, positional);
        case 'doctor': {
          const r = doctor(ctx, opts);
          code = r.code || 0;
          return r.text;
        }
        default:
          refuse(`Unknown command "${cmd}". Run \`flow help\`.`);
      }
      return '';
    });
    return { code, stdout, stderr: '' };
  } catch (err) {
    if (err instanceof Refusal) return { code: 1, stdout: '', stderr: `Refused: ${err.message}` };
    return { code: 2, stdout: '', stderr: `flow failed: ${err.stack || err.message}` };
  }
}


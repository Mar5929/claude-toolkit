// Memory: topics, proposals, librarian jobs, generated indexes, log, undo, recall.
import fs from 'node:fs';
import path from 'node:path';
import {
  projectPaths, readText, writeText, readJson, writeJson, parseFrontMatter, renderFrontMatter,
  renderTemplate, slugify, today, now, shortId, withLock, refuse, ensureDir,
} from './core.mjs';
import { listItems } from './items.mjs';

export const TOPIC_TYPES = ['decision', 'fact', 'preference', 'term', 'lesson', 'event'];
export const LIBRARIAN_ACTIONS = ['create', 'update', 'supersede', 'merge', 'skip'];
const REQUIRED_TOPIC_FIELDS = ['id', 'type', 'title', 'summary', 'status', 'source', 'created', 'updated'];

// ---------- topics ----------

export function parseTopic(text, file = null) {
  const { data, body } = parseFrontMatter(text);
  if (!data) return null;
  return { fm: data, body: body.replace(/^\n+/, ''), file };
}

export function renderTopic(topic) {
  return `${renderFrontMatter(topic.fm)}\n${topic.body.trim()}\n`;
}

export function listTopics(root) {
  const dir = projectPaths(root).topics;
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((n) => n.endsWith('.md'))
    .map((n) => parseTopic(readText(path.join(dir, n)), path.join(dir, n)))
    .filter(Boolean)
    .sort((a, b) => String(a.fm.id).localeCompare(String(b.fm.id)));
}

export function findTopic(root, id) {
  const topic = listTopics(root).find((t) => t.fm.id === id);
  if (!topic) refuse(`Topic "${id}" does not exist. Run \`flow memory recall <words>\` to find topic ids.`);
  return topic;
}

function topicPath(root, id) {
  return path.join(projectPaths(root).topics, `${id}.md`);
}

function firstSentence(text) {
  const t = String(text).trim().replace(/\s+/g, ' ');
  const m = /^(.+?[.!?])(\s|$)/.exec(t);
  const s = m ? m[1] : t;
  return s.length > 160 ? `${s.slice(0, 157)}...` : s;
}

export function validateProposal(p) {
  const problems = [];
  if (!TOPIC_TYPES.includes(p.type)) problems.push(`type must be one of ${TOPIC_TYPES.join(', ')}`);
  for (const field of ['title', 'statement', 'why', 'source']) {
    if (!p[field] || !String(p[field]).trim()) problems.push(`${field} is missing`);
  }
  if (problems.length) refuse(`The memory proposal is not complete: ${problems.join('; ')}.`);
}

function validateTopic(topic) {
  const missing = REQUIRED_TOPIC_FIELDS.filter((f) => !topic.fm[f]);
  if (missing.length) refuse(`The topic would be missing: ${missing.join(', ')}.`);
  if (!TOPIC_TYPES.includes(topic.fm.type)) refuse(`Topic type "${topic.fm.type}" is not allowed.`);
  if (String(topic.fm.summary).includes('\n')) refuse('A topic summary must be one line.');
}

// ---------- proposals (onboarding mode) ----------

export function pendingPath(root, id) {
  return path.join(projectPaths(root).pending, `${id}.json`);
}

export function listPending(root) {
  const dir = projectPaths(root).pending;
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((n) => n.endsWith('.json')).map((n) => readJson(path.join(dir, n))).filter(Boolean);
}

export function getPending(root, id) {
  const p = readJson(pendingPath(root, id));
  if (!p) refuse(`No pending proposal has the id "${id}". Pending: ${listPending(root).map((x) => x.id).join(', ') || 'none'}.`);
  return p;
}

export function makeProposal(fields, { session, turn }) {
  const proposal = {
    id: shortId('mem'),
    type: String(fields.type || '').trim(),
    title: String(fields.title || '').trim(),
    statement: String(fields.statement || '').trim(),
    why: String(fields.why || '').trim(),
    source: String(fields.source || '').trim(),
    summary: fields.summary ? String(fields.summary).trim() : null,
    created_at: now(),
    session,
    turn,
  };
  validateProposal(proposal);
  return proposal;
}

export function savePending(root, proposal) {
  writeJson(pendingPath(root, proposal.id), proposal);
}

export function removePending(root, id) {
  fs.rmSync(pendingPath(root, id), { force: true });
}

export function renderCard(root, proposal) {
  return renderTemplate('card.md', {
    ...proposal,
    target: `memory/topics/${proposal.type}-${slugify(proposal.title)}.md`,
  }).trim();
}

// ---------- librarian jobs ----------

function jobPath(root, id) {
  return path.join(projectPaths(root).queue, `${id}.json`);
}

export function listJobs(root) {
  const dir = projectPaths(root).queue;
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((n) => n.endsWith('.json'))
    .map((n) => readJson(path.join(dir, n)))
    .filter(Boolean)
    .sort((a, b) => a.queued_at.localeCompare(b.queued_at));
}

export function getJob(root, id) {
  const job = readJson(jobPath(root, id));
  if (!job) refuse(`No librarian job has the id "${id}".`);
  return job;
}

export function saveJob(root, job) {
  writeJson(jobPath(root, job.id), job);
}

export function queueJob(root, proposal, { mode, approval, session }) {
  const job = {
    id: shortId('job'),
    proposal,
    mode,
    approval,
    session,
    status: 'queued',
    queued_at: now(),
    dispatched_at: null,
    done_at: null,
    result: null,
  };
  saveJob(root, job);
  return job;
}

// Marks this session's queued jobs as dispatched. Only jobs queued by the
// session whose librarian started are touched.
export function markDispatched(root, sessionId) {
  if (!sessionId) return [];
  return withLock(root, 'memory', () => {
    const marked = [];
    for (const job of listJobs(root)) {
      if (job.status === 'queued' && job.session === sessionId) {
        job.status = 'dispatched';
        job.dispatched_at = now();
        saveJob(root, job);
        marked.push(job.id);
      }
    }
    return marked;
  });
}

export function openJobs(root) {
  return listJobs(root).filter((j) => j.status !== 'done');
}

// ---------- generated files ----------

export function renderIndex(root) {
  const active = listTopics(root).filter((t) => t.fm.status === 'active');
  const lines = ['# Memory index', '', 'Generated by flow. Do not edit by hand. One line per active topic.', ''];
  if (!active.length) lines.push('No topics yet.');
  for (const type of TOPIC_TYPES) {
    const group = active.filter((t) => t.fm.type === type);
    if (!group.length) continue;
    lines.push(`## ${type}`, '');
    for (const t of group) lines.push(`- [${t.fm.id}](topics/${t.fm.id}.md) ${t.fm.summary}`);
    lines.push('');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

export function renderGlossary(root) {
  const terms = listTopics(root).filter((t) => t.fm.type === 'term' && t.fm.status === 'active');
  const lines = ['# Glossary', '', 'Generated by flow from term topics. Do not edit by hand.', ''];
  if (!terms.length) lines.push('No terms yet.');
  for (const t of terms.sort((a, b) => a.fm.title.localeCompare(b.fm.title))) {
    lines.push(`- **${t.fm.title}**: ${t.fm.summary} ([${t.fm.id}](topics/${t.fm.id}.md))`);
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

export function regenerate(root) {
  const p = projectPaths(root);
  writeText(p.index, renderIndex(root));
  writeText(p.glossary, renderGlossary(root));
}

// Appends to log.md under the memory lock. For callers that already hold it,
// use appendLog.
export function appendLogLocked(root, entry) {
  return withLock(root, 'memory', () => appendLog(root, entry));
}

export function appendLog(root, entry) {
  const p = projectPaths(root);
  const current = readText(p.log, '# Memory log\n\nEvery memory write, newest last.\n\n');
  writeText(p.log, `${current}${current.endsWith('\n') ? '' : '\n'}- ${entry}\n`);
}

// ---------- librarian apply ----------

function newTopic(root, proposal, extra = {}) {
  let id = `${proposal.type}-${slugify(proposal.title)}`;
  let n = 2;
  while (fs.existsSync(topicPath(root, id))) id = `${proposal.type}-${slugify(proposal.title)}-${n++}`;
  const topic = {
    fm: {
      id,
      type: proposal.type,
      title: proposal.title,
      summary: extra.summary || proposal.summary || firstSentence(proposal.statement),
      status: 'active',
      source: proposal.source,
      created: today(),
      updated: today(),
      supersedes: extra.supersedes || [],
      superseded_by: null,
    },
    body: renderTemplate('topic.md', { frontmatter: '', statement: proposal.statement, why: proposal.why, updates: '' }).trim(),
    file: topicPath(root, id),
  };
  validateTopic(topic);
  return topic;
}

function approvalText(job) {
  if (job.approval) return `approved by ${job.approval.by} at ${job.approval.at}`;
  return 'trusted mode, no approval needed';
}

// Applies one librarian decision. Every file it touches is snapshotted first so
// `flow memory undo <change id>` can put it back.
export function applyLibrarian(root, jobId, options) {
  const action = options.action;
  if (!LIBRARIAN_ACTIONS.includes(action)) refuse(`--action must be one of ${LIBRARIAN_ACTIONS.join(', ')}.`);
  return withLock(root, 'memory', () => {
    const job = getJob(root, jobId);
    if (job.status === 'done') refuse(`Job ${jobId} is already done. Run \`flow librarian next\` for the next job.`);
    const proposal = job.proposal;
    const writes = new Map();
    const touched = [];
    const put = (topic) => {
      validateTopic(topic);
      writes.set(topic.file, renderTopic(topic));
      touched.push(topic.fm.id);
    };
    let reason = options.reason || '';

    if (action === 'create') {
      put(newTopic(root, proposal, { summary: options.summary }));
    } else if (action === 'update') {
      if (!options.topic) refuse('Update needs `--topic <id>`.');
      const t = findTopic(root, options.topic);
      if (t.fm.status !== 'active') refuse(`Topic ${t.fm.id} is ${t.fm.status}. Update an active topic.`);
      const text = options.text || `${proposal.statement} ${proposal.why}`;
      t.body = `${t.body.trim()}\n\n**Update ${today()}.** ${text.trim()}`;
      if (options.summary) t.fm.summary = options.summary;
      t.fm.source = `${t.fm.source}; ${proposal.source}`;
      t.fm.updated = today();
      put(t);
    } else if (action === 'supersede') {
      if (!options.topic) refuse('Supersede needs `--topic <old id>`.');
      const old = findTopic(root, options.topic);
      if (old.fm.status !== 'active') refuse(`Topic ${old.fm.id} is already ${old.fm.status}.`);
      const fresh = newTopic(root, proposal, { summary: options.summary, supersedes: [old.fm.id] });
      old.fm.status = 'superseded';
      old.fm.superseded_by = fresh.fm.id;
      old.fm.updated = today();
      old.body = `${old.body.trim()}\n\n**Superseded ${today()}** by [${fresh.fm.id}](${fresh.fm.id}.md).`;
      put(fresh);
      put(old);
    } else if (action === 'merge') {
      if (!options.topic || !options.from) refuse('Merge needs `--topic <id to keep>` and `--from <id to fold in>`.');
      if (options.topic === options.from) refuse('Merge needs two different topics.');
      const keep = findTopic(root, options.topic);
      const from = findTopic(root, options.from);
      keep.body = `${keep.body.trim()}\n\n**Merged ${today()}** from ${from.fm.id}: ${from.body.split('\n')[0]}`;
      keep.body += `\n\n**Update ${today()}.** ${proposal.statement} ${proposal.why}`;
      keep.fm.supersedes = [...(keep.fm.supersedes || []), from.fm.id];
      keep.fm.source = `${keep.fm.source}; ${proposal.source}`;
      keep.fm.updated = today();
      if (options.summary) keep.fm.summary = options.summary;
      from.fm.status = 'merged';
      from.fm.superseded_by = keep.fm.id;
      from.fm.updated = today();
      put(keep);
      put(from);
    } else {
      if (!reason) refuse('Skip needs `--reason "..."` saying why the proposal is not saved.');
    }

    const changeId = shortId('chg');
    const history = { id: changeId, at: now(), action, job: job.id, undone: false, files: {} };
    for (const file of writes.keys()) {
      history.files[path.relative(root, file)] = readText(file);
    }
    ensureDir(projectPaths(root).history);
    writeJson(path.join(projectPaths(root).history, `${changeId}.json`), history);
    for (const [file, text] of writes) writeText(file, text);
    regenerate(root);
    const target = touched.length ? touched.join(', ') : '-';
    appendLog(root, `${now()} | ${changeId} | ${action} | ${target} | "${proposal.title}" | mode ${job.mode} | ${approvalText(job)} | job ${job.id}${reason ? ` | reason: ${reason}` : ''}`);
    job.status = 'done';
    job.done_at = now();
    job.result = { action, topics: touched, change: changeId, reason: reason || null };
    saveJob(root, job);
    return { changeId, action, topics: touched, job };
  });
}

export function undoChange(root, changeId) {
  return withLock(root, 'memory', () => {
    const file = path.join(projectPaths(root).history, `${changeId}.json`);
    const history = readJson(file);
    if (!history) refuse(`No change has the id "${changeId}". Run \`flow memory log\` to see change ids.`);
    if (history.undone) refuse(`Change ${changeId} was already undone.`);
    // Restoring a file that a later change also wrote would erase that change.
    const later = fs.readdirSync(projectPaths(root).history)
      .map((n) => readJson(path.join(projectPaths(root).history, n)))
      .filter((h) => h && h.id !== changeId && !h.undone && Date.parse(h.at) > Date.parse(history.at))
      .filter((h) => Object.keys(h.files).some((f) => f in history.files))
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    if (later.length) {
      refuse(`Change ${later[0].id} (${later[0].at}) changed ${Object.keys(later[0].files).filter((f) => f in history.files).join(', ')} after ${changeId}. Undo ${later.map((h) => h.id).join(', then ')} first, newest first.`);
    }
    for (const [rel, previous] of Object.entries(history.files)) {
      const abs = path.join(root, rel);
      if (previous === null) fs.rmSync(abs, { force: true });
      else writeText(abs, previous);
    }
    history.undone = true;
    history.undone_at = now();
    writeJson(file, history);
    regenerate(root);
    appendLog(root, `${now()} | undo | ${changeId} | restored ${Object.keys(history.files).join(', ') || 'nothing'}`);
    return history;
  });
}

export function readLog(root, lines = 20) {
  const text = readText(projectPaths(root).log, '');
  const entries = text.split('\n').filter((l) => l.startsWith('- '));
  return entries.slice(-lines);
}

// ---------- recall ----------

const STOP = new Set('the and for with that this what was were are you your from have has had not but can will would should about into there their them then than when where which who how why our out all any also its it is of to in on a an be do did does we i me my or as at by if so up no yes'.split(' '));

export function tokenize(text) {
  return String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w));
}

function countHits(words, text) {
  const tokens = tokenize(text);
  let score = 0;
  for (const w of words) for (const t of tokens) if (t === w || (w.length > 3 && t.startsWith(w))) score += 1;
  return score;
}

export function recall(root, query, { limit = 8, includeSuperseded = false, topicsOnly = false } = {}) {
  const words = [...new Set(tokenize(query))];
  if (!words.length) return [];
  const hits = [];
  for (const t of listTopics(root)) {
    if (!includeSuperseded && t.fm.status !== 'active') continue;
    const score = 4 * countHits(words, t.fm.title) + 3 * countHits(words, t.fm.summary)
      + 2 * countHits(words, `${t.fm.id} ${t.fm.type}`) + countHits(words, t.body);
    if (score > 0) {
      hits.push({ kind: 'topic', id: t.fm.id, title: t.fm.title, summary: t.fm.summary, status: t.fm.status, path: path.relative(root, t.file), score });
    }
  }
  if (!topicsOnly) {
    for (const i of listItems(root)) {
      const score = 4 * countHits(words, i.fm.title) + countHits(words, readText(i.file, ''));
      if (score > 0) {
        hits.push({ kind: 'item', id: `item ${i.fm.id}`, title: i.fm.title, summary: `stage ${i.fm.stage}`, path: path.relative(root, i.file), score });
      }
    }
  }
  return hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, limit);
}

export function formatHits(hits) {
  if (!hits.length) return 'No matches.';
  return hits.map((h, n) => `${n + 1}. [${h.id}] ${h.title}: ${h.summary} (${h.path}, score ${h.score})`).join('\n');
}

// ---------- doctor ----------

export function memoryProblems(root) {
  const p = projectPaths(root);
  const problems = [];
  const topics = listTopics(root);
  const ids = new Set(topics.map((t) => t.fm.id));
  for (const n of fs.existsSync(p.topics) ? fs.readdirSync(p.topics).filter((x) => x.endsWith('.md')) : []) {
    const t = parseTopic(readText(path.join(p.topics, n)));
    if (!t) { problems.push(`topics/${n} has no front matter.`); continue; }
    const missing = REQUIRED_TOPIC_FIELDS.filter((f) => !t.fm[f]);
    if (missing.length) problems.push(`topics/${n} is missing ${missing.join(', ')}.`);
    if (t.fm.id && `${t.fm.id}.md` !== n) problems.push(`topics/${n} has id ${t.fm.id}, which does not match its file name.`);
    if (t.fm.type && !TOPIC_TYPES.includes(t.fm.type)) problems.push(`topics/${n} has unknown type ${t.fm.type}.`);
    if (t.fm.superseded_by && !ids.has(t.fm.superseded_by)) problems.push(`topics/${n} points to missing topic ${t.fm.superseded_by}.`);
    if (t.fm.status !== 'active' && !t.fm.superseded_by) problems.push(`topics/${n} is ${t.fm.status} but names no replacement.`);
  }
  if (readText(p.index) !== renderIndex(root)) problems.push('INDEX.md does not match the topics. Run `flow doctor --fix`.');
  if (readText(p.glossary) !== renderGlossary(root)) problems.push('GLOSSARY.md does not match the term topics. Run `flow doctor --fix`.');
  for (const prop of listPending(root)) {
    try { validateProposal(prop); } catch (e) { problems.push(`pending/${prop.id}.json: ${e.message}`); }
  }
  return problems;
}

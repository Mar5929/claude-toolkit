// Work items: work/<id>-<slug>/ITEM.md. The engine owns the file shape.
import fs from 'node:fs';
import path from 'node:path';
import {
  projectPaths, readText, writeText, parseFrontMatter, renderFrontMatter, renderTemplate,
  slugify, today, withLock, refuse,
} from './core.mjs';
import { refreshFocus } from './focus.mjs';

export const STAGES = ['discovery', 'refinement', 'requirements-approved', 'design', 'build', 'testing', 'review', 'done'];
export const OWNER_GATED_STAGES = ['requirements-approved', 'done'];
const NONE = 'None yet.';

function sections(body) {
  const out = {};
  const parts = body.split(/^## (.+)$/m);
  for (let i = 1; i < parts.length; i += 2) out[parts[i].trim()] = parts[i + 1].trim();
  return out;
}

function listLines(text) {
  if (!text || text === NONE) return [];
  return text.split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2));
}

function plain(text) {
  return !text || text === NONE ? '' : text;
}

export function parseItem(text, file = null) {
  const { data, body } = parseFrontMatter(text);
  if (!data) return null;
  const s = sections(body);
  const requirements = listLines(s.Requirements).map((line) => {
    const m = /^\*\*(R\d+)\*\* \(([\w-]+)\) (.*)$/.exec(line);
    return m ? { id: m[1], status: m[2], text: m[3] } : { id: null, status: 'unknown', text: line };
  });
  const questions = listLines(s['Open questions']).map((line) => {
    const m = /^\*\*(Q\d+)\*\* \((asked|deferred) ([\d-]+)\) (.*)$/.exec(line);
    return m ? { id: m[1], state: m[2], date: m[3], text: m[4] } : { id: null, state: 'unknown', date: null, text: line };
  });
  return {
    fm: data,
    goal: plain(s.Goal),
    why: plain(s.Why),
    requirements,
    questions,
    decisions: listLines(s.Decisions),
    progress: listLines(s.Progress),
    next: plain(s['Next step']),
    file,
  };
}

function list(lines) {
  return lines.length ? lines.map((l) => `- ${l}`).join('\n') : NONE;
}

export function renderItem(item) {
  return renderTemplate('ITEM.md', {
    frontmatter: renderFrontMatter(item.fm),
    id: item.fm.id,
    title: item.fm.title,
    goal: item.goal || NONE,
    why: item.why || NONE,
    requirements: list(item.requirements.map((r) => `**${r.id}** (${r.status}) ${r.text}`)),
    questions: list(item.questions.map((q) => `**${q.id}** (${q.state} ${q.date}) ${q.text}`)),
    decisions: list(item.decisions),
    progress: list(item.progress),
    next: item.next || NONE,
  });
}

export function listItems(root) {
  const dir = projectPaths(root).work;
  if (!fs.existsSync(dir)) return [];
  const items = [];
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name, 'ITEM.md');
    if (!/^\d+-/.test(name) || !fs.existsSync(file)) continue;
    const item = parseItem(readText(file), file);
    if (item) items.push(item);
  }
  return items.sort((a, b) => a.fm.id - b.fm.id);
}

export function findItem(root, id) {
  const n = Number(id);
  if (!Number.isInteger(n)) refuse(`"${id}" is not a work item id. Run \`flow item list\` to see the ids.`);
  const item = listItems(root).find((i) => i.fm.id === n);
  if (!item) refuse(`Work item ${n} does not exist. Run \`flow item list\` to see the ids.`);
  return item;
}

function save(root, item) {
  item.fm.updated = today();
  writeText(item.file, renderItem(item));
  refreshFocus(root);
  return item;
}

// Change one item under the work lock, re-reading it first so parallel
// sessions do not overwrite each other.
export function changeItem(root, id, fn) {
  return withLock(root, 'work', () => {
    const item = findItem(root, id);
    const result = fn(item);
    save(root, item);
    return { item, result };
  });
}

export function createItem(root, { title, goal, why }) {
  if (!title || !String(title).trim()) refuse('A work item needs a title. Pass `--title "..."`.');
  return withLock(root, 'work', () => {
    const items = listItems(root);
    const id = items.reduce((max, i) => Math.max(max, i.fm.id), 0) + 1;
    const file = path.join(projectPaths(root).work, `${id}-${slugify(title)}`, 'ITEM.md');
    const item = {
      fm: { id, title: String(title).trim(), stage: 'discovery', created: today(), updated: today(), requirements_approved: null },
      goal: goal || '', why: why || '', requirements: [], questions: [], decisions: [], progress: [], next: '', file,
    };
    save(root, item);
    return item;
  });
}

function nextNumber(item, letter) {
  let max = 0;
  const re = new RegExp(`\\*\\*${letter}(\\d+)\\*\\*|^${letter}(\\d+)$`);
  const all = [...item.requirements.map((r) => r.id || ''), ...item.questions.map((q) => q.id || ''), ...item.decisions];
  for (const text of all) {
    const m = re.exec(text);
    if (m) max = Math.max(max, Number(m[1] || m[2]));
  }
  return `${letter}${max + 1}`;
}

export function addQuestion(root, id, text) {
  if (!text) refuse('Pass the question with `--text "..."`.');
  return changeItem(root, id, (item) => {
    const qid = nextNumber(item, 'Q');
    item.questions.push({ id: qid, state: 'asked', date: today(), text: text.trim() });
    return qid;
  });
}

export function resolveQuestion(root, id, qid, { answer, defer, withdraw, source = 'owner' }) {
  const modes = [answer, defer, withdraw].filter(Boolean).length;
  if (modes !== 1) refuse('Give exactly one of `--text "<answer>"`, `--defer`, or `--withdraw`.');
  return changeItem(root, id, (item) => {
    const q = item.questions.find((x) => x.id === String(qid).toUpperCase());
    if (!q) refuse(`Question ${qid} is not open on item ${id}. Open questions: ${item.questions.map((x) => x.id).join(', ') || 'none'}.`);
    if (defer) {
      q.state = 'deferred';
      q.date = today();
      return 'deferred';
    }
    item.questions = item.questions.filter((x) => x !== q);
    const text = answer ? answer.trim().replace(/([^.!?])$/, '$1.') : '';
    const outcome = withdraw ? 'Withdrawn.' : `Answer: ${text}`;
    item.decisions.push(`${today()} **${q.id}** ${q.text} ${outcome} Source: ${source}.`);
    return withdraw ? 'withdrawn' : 'answered';
  });
}

export function addRequirement(root, id, text, { source = 'owner' } = {}) {
  if (!text) refuse('Pass the requirement with `--text "..."`.');
  return changeItem(root, id, (item) => {
    const rid = nextNumber(item, 'R');
    item.requirements.push({ id: rid, status: 'draft', text: `${text.trim()} Source: ${source}, ${today()}.` });
    if (item.fm.stage === 'discovery') item.fm.stage = 'refinement';
    return rid;
  });
}

export function addProgress(root, id, text, next) {
  if (!text && !next) refuse('Pass `--text "<what was done>"`, `--next "<the next step>"`, or both.');
  return changeItem(root, id, (item) => {
    if (text) item.progress.push(`${today()} ${text.trim()}`);
    if (next) item.next = next.trim();
  });
}

export function setStage(root, id, stage) {
  if (!STAGES.includes(stage)) refuse(`"${stage}" is not a stage. Stages: ${STAGES.join(', ')}.`);
  return changeItem(root, id, (item) => {
    item.fm.stage = stage;
    if (stage === 'requirements-approved') {
      item.fm.requirements_approved = today();
      for (const r of item.requirements) if (r.status === 'draft') r.status = 'approved';
      item.decisions.push(`${today()} Requirements approved by the owner.`);
    }
  });
}

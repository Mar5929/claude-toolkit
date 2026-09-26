// Work items: work/<id>-<slug>/ITEM.md. The engine owns the file shape.
import fs from 'node:fs';
import path from 'node:path';
import {
  projectPaths, readText, writeText, parseFrontMatter, renderFrontMatter, renderFrontMatterKeeping, renderTemplate,
  slugify, today, withLock, refuse, checkId,
} from './core.mjs';
import { refreshFocus } from './focus.mjs';

export const STAGES = ['discovery', 'refinement', 'requirements-approved', 'design', 'build', 'testing', 'review', 'done'];
export const OWNER_GATED_STAGES = ['requirements-approved', 'done'];
const NONE = 'None yet.';

const KNOWN = ['Goal', 'Why', 'Requirements', 'Open questions', 'Decisions', 'Progress', 'Next step'];
const TEMPLATE_KEYS = { Goal: 'goal', Why: 'why', Requirements: 'requirements', 'Open questions': 'questions', Decisions: 'decisions', Progress: 'progress', 'Next step': 'next' };

// Splits the body into the text before the first `## ` heading and the
// sections in file order. A `## ` line inside a fenced code block is not a
// heading. Each section keeps its raw text for verbatim output.
function splitBody(body) {
  const lines = body.split('\n');
  const heads = [];
  let fence = null;
  lines.forEach((line, i) => {
    const f = /^\s*(```|~~~)/.exec(line);
    if (f) fence = fence === null ? f[1] : (fence === f[1] ? null : fence);
    else if (fence === null && /^## (.+)$/.test(line)) heads.push(i);
  });
  if (!heads.length) return { preamble: body, sections: [] };
  const withNewlines = (arr) => arr.map((l) => `${l}\n`).join('');
  const sections = heads.map((h, k) => {
    const end = k + 1 < heads.length ? heads[k + 1] : lines.length;
    const inner = lines.slice(h + 1, end);
    const last = k + 1 === heads.length;
    const raw = last ? (inner.length ? `\n${inner.join('\n')}` : '') : `\n${withNewlines(inner)}`;
    return { heading: lines[h].slice(3).trim(), raw };
  });
  return { preamble: withNewlines(lines.slice(0, heads[0])), sections };
}

// A list section: each entry is a `- ` line plus the lines that continue it
// (wrapped text, up to a blank line). Any other line, blank lines between
// entries included, is kept verbatim in place.
function listEntries(raw) {
  const out = [];
  let current = null;
  for (const line of String(raw || '').split('\n')) {
    if (line.startsWith('- ')) {
      current = { lines: [line.slice(2)] };
      out.push(current);
    } else if (!line.trim()) {
      current = null;
      out.push({ verbatim: '' });
    } else if (current) {
      current.lines.push(line);
    } else if (line.trim() !== NONE) {
      out.push({ verbatim: line });
    }
  }
  while (out.length && out[0].verbatim === '') out.shift();
  while (out.length && out[out.length - 1].verbatim === '') out.pop();
  for (let i = out.length - 1; i > 0; i -= 1) if (out[i].verbatim === '' && out[i - 1].verbatim === '') out.splice(i, 1);
  return out.map((e) => (e.verbatim !== undefined ? e : { text: e.lines.join('\n') }));
}

function plain(text) {
  const t = String(text || '').trim();
  return !t || t === NONE ? '' : t;
}

// Canonical forms first, then hand-written ones such as `- R1 text`,
// `- R3: text`, or `- Q2 (asked) text`. Anything else is kept verbatim.
function parseRequirement(text) {
  const m = /^\*\*(R\d+)\*\* \(([\w-]+)\) ([\s\S]*)$/.exec(text)
    || /^\*{0,2}(R\d+)\*{0,2}[:.)]?\s+(?:\(([\w-]+)\)\s*)?([\s\S]+)$/.exec(text);
  return m ? { id: m[1], status: m[2] || 'draft', text: m[3] } : { verbatim: `- ${text}` };
}

function parseQuestion(text) {
  const m = /^\*\*(Q\d+)\*\* \((asked|deferred)(?: ([\d-]+))?\) ([\s\S]*)$/.exec(text)
    || /^\*{0,2}(Q\d+)\*{0,2}[:.)]?\s+(?:\((asked|deferred)(?: ([\d-]+))?\)\s*)?([\s\S]+)$/.exec(text);
  return m ? { id: m[1], state: m[2] || 'asked', date: m[3] || null, text: m[4] } : { verbatim: `- ${text}` };
}

// Front-matter keys flow writes. Every other front-matter line is kept.
const OWNED_KEYS = ['id', 'title', 'stage', 'created', 'updated', 'requirements_approved'];

export function parseItem(text, file = null) {
  const { data, body, lines } = parseFrontMatter(text);
  if (!data) return null;
  const layout = splitBody(body);
  const s = {};
  for (const sec of layout.sections) if (KNOWN.includes(sec.heading) && !(sec.heading in s)) s[sec.heading] = sec.raw;
  const entries = (name) => listEntries(s[name]);
  return {
    fm: data,
    goal: plain(s.Goal),
    why: plain(s.Why),
    requirements: entries('Requirements').map((e) => (e.verbatim !== undefined ? e : parseRequirement(e.text))),
    questions: entries('Open questions').map((e) => (e.verbatim !== undefined ? e : parseQuestion(e.text))),
    decisions: entries('Decisions').map((e) => (e.verbatim !== undefined ? e : e.text)),
    progress: entries('Progress').map((e) => (e.verbatim !== undefined ? e : e.text)),
    next: plain(s['Next step']),
    layout,
    fmLines: lines,
    eol: String(text).includes('\r\n') ? '\r\n' : '\n',
    file,
  };
}

// Lines in a list section that flow could not read. `flow doctor` reports them.
export function unreadLines(item) {
  const out = [];
  for (const [name, list] of [['Requirements', item.requirements], ['Open questions', item.questions]]) {
    for (const e of list) if (e.verbatim) out.push({ section: name, line: e.verbatim });
  }
  return out;
}

function list(all, render) {
  // Blank lines kept from the file stay between entries, never at the ends or doubled.
  const entries = all.filter((e, i, a) => !(e && e.verbatim === '' && (i === 0 || i === a.length - 1 || (a[i - 1] && a[i - 1].verbatim === ''))));
  if (!entries.some((e) => !(e && e.verbatim === ''))) return NONE;
  return entries.map((e) => (e && e.verbatim !== undefined ? e.verbatim : `- ${render(e)}`)).join('\n');
}

function sectionContent(item, heading) {
  switch (heading) {
    case 'Goal': return item.goal || NONE;
    case 'Why': return item.why || NONE;
    case 'Requirements': return list(item.requirements, (r) => `**${r.id}** (${r.status}) ${r.text}`);
    case 'Open questions': return list(item.questions, (q) => `**${q.id}** (${q.state}${q.date ? ` ${q.date}` : ''}) ${q.text}`);
    case 'Decisions': return list(item.decisions, (d) => d);
    case 'Progress': return list(item.progress, (p) => p);
    case 'Next step': return item.next || NONE;
    default: return '';
  }
}

export function renderItem(item) {
  if (!item.layout) {
    return renderTemplate('ITEM.md', {
      frontmatter: renderFrontMatter(item.fm),
      id: item.fm.id,
      title: item.fm.title,
      ...Object.fromEntries(KNOWN.map((h) => [TEMPLATE_KEYS[h], sectionContent(item, h)])),
    });
  }
  // An existing file: flow's sections are rewritten in place; every other
  // section and the text before the first heading stay exactly as they were.
  const { preamble, sections } = item.layout;
  const present = new Set();
  const blocks = sections.map((sec) => {
    if (!KNOWN.includes(sec.heading) || present.has(sec.heading)) return `## ${sec.heading}${sec.raw}`;
    present.add(sec.heading);
    return `## ${sec.heading}\n\n${sectionContent(item, sec.heading)}\n\n`;
  });
  for (const h of KNOWN) if (!present.has(h)) blocks.push(`## ${h}\n\n${sectionContent(item, h)}\n\n`);
  let out = `${renderFrontMatterKeeping(item.fmLines || [], item.fm, OWNED_KEYS)}${preamble}`;
  for (const b of blocks) {
    if (!out.endsWith('\n\n') && out.length) out += out.endsWith('\n') ? '\n' : '\n\n';
    out += b;
  }
  return `${out.replace(/\n+$/, '')}\n`;
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
  checkId('item', id);
  const n = Number(id);
  if (!Number.isInteger(n)) refuse(`"${id}" is not a work item id. Run \`flow item list\` to see the ids.`);
  const item = listItems(root).find((i) => i.fm.id === n);
  if (!item) refuse(`Work item ${n} does not exist. Run \`flow item list\` to see the ids.`);
  return item;
}

function save(root, item) {
  item.fm.updated = today();
  const text = renderItem(item);
  writeText(item.file, item.eol === '\r\n' ? text.replace(/\n/g, '\r\n') : text);
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
  const all = [...item.requirements.map((r) => r.id || ''), ...item.questions.map((q) => q.id || ''), ...item.decisions.map((d) => (typeof d === 'string' ? d : d.verbatim))];
  for (const text of all) {
    const m = re.exec(text);
    if (m) max = Math.max(max, Number(m[1] || m[2]));
  }
  return `${letter}${max + 1}`;
}

function sameQuestion(a, b) {
  const norm = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return norm(a) === norm(b);
}

// Records a question. A question already on the item (open or deferred) with the
// same words is asked again instead of being added twice. Returns { id, existing }.
export function addQuestion(root, id, text) {
  if (!text) refuse('Pass the question with `--text "..."`.');
  return changeItem(root, id, (item) => {
    const same = item.questions.find((q) => q.id && sameQuestion(q.text, text));
    if (same) {
      same.state = 'asked';
      same.date = today();
      return { id: same.id, existing: true };
    }
    const qid = nextNumber(item, 'Q');
    item.questions.push({ id: qid, state: 'asked', date: today(), text: text.trim() });
    return { id: qid, existing: false };
  });
}

// Asks an open or deferred question again. Returns { id, existing: true }.
export function reaskQuestion(root, id, qid) {
  return changeItem(root, id, (item) => {
    const q = item.questions.find((x) => x.id === String(qid).toUpperCase());
    if (!q) refuse(`Question ${qid} is not on item ${id}. Open questions: ${item.questions.map((x) => x.id).join(', ') || 'none'}.`);
    q.state = 'asked';
    q.date = today();
    return { id: q.id, existing: true };
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

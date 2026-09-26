// Shared helpers: project root, paths, time, files, locks, front matter.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export class Refusal extends Error {
  constructor(message) {
    super(message);
    this.name = 'Refusal';
  }
}

export function refuse(message) {
  throw new Refusal(message);
}

export function findProjectRoot(start = process.cwd(), env = process.env) {
  if (env.FLOW_PROJECT_ROOT) return path.resolve(env.FLOW_PROJECT_ROOT);
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'memory', 'config.json'))) return dir;
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}

export function projectPaths(root) {
  const memory = path.join(root, 'memory');
  const flow = path.join(root, '.flow');
  return {
    root,
    memory,
    config: path.join(memory, 'config.json'),
    index: path.join(memory, 'INDEX.md'),
    focus: path.join(memory, 'FOCUS.md'),
    glossary: path.join(memory, 'GLOSSARY.md'),
    log: path.join(memory, 'log.md'),
    topics: path.join(memory, 'topics'),
    pending: path.join(memory, 'pending'),
    work: path.join(root, 'work'),
    flow,
    sessions: path.join(flow, 'sessions'),
    queue: path.join(flow, 'queue'),
    history: path.join(flow, 'history'),
    locks: path.join(flow, 'locks'),
    audit: path.join(flow, 'audit.log'),
  };
}

// Times are ISO strings. now() never returns the same millisecond twice in one
// process, so "created before the owner prompt" comparisons stay strict.
let lastMs = 0;
export function nowMs() {
  let ms = Date.now();
  if (ms <= lastMs) ms = lastMs + 1;
  lastMs = ms;
  return ms;
}
export function now() {
  return new Date(nowMs()).toISOString();
}
export function today() {
  return new Date().toISOString().slice(0, 10);
}
// True only when both times are valid and a is later than b. A missing or
// unreadable time never counts as "after", so owner checks fail closed.
export function isAfter(a, b) {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (!a || !b || Number.isNaN(ta) || Number.isNaN(tb)) return false;
  return ta > tb;
}

// Ids that reach a file path. Each is checked before any path is built.
const ID_PATTERNS = {
  card: /^mem-[0-9a-f]{4,32}$/,
  job: /^job-[0-9a-f]{4,32}$/,
  change: /^chg-[0-9a-f]{4,32}$/,
  topic: /^[a-z]+-[a-z0-9]+(?:-[a-z0-9]+)*$/,
  item: /^[1-9]\d{0,6}$/,
};
const ID_NAMES = { card: 'proposal', job: 'librarian job', change: 'change', topic: 'topic', item: 'work item' };

export function checkId(kind, id) {
  const text = String(id ?? '');
  if (!ID_PATTERNS[kind].test(text)) refuse(`"${text}" is not a valid ${ID_NAMES[kind]} id.`);
  return text;
}

// Builds dir/<name> and refuses when the result would leave dir.
export function pathInside(dir, name) {
  const file = path.resolve(dir, name);
  const rel = path.relative(path.resolve(dir), file);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) refuse(`"${name}" is outside ${dir}.`);
  return file;
}

export function shortId(prefix) {
  return `${prefix}-${crypto.randomBytes(3).toString('hex')}`;
}

export function slugify(text, max = 50) {
  const slug = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.slice(0, max).replace(/-+$/g, '') || 'untitled';
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function readText(file, fallback = null) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return fallback;
  }
}

export function writeText(file, text) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(3).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

export function readJson(file, fallback = null) {
  const text = readText(file);
  if (text === null) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function writeJson(file, data) {
  writeText(file, `${JSON.stringify(data, null, 2)}\n`);
}

const sleepBuffer = new Int32Array(new SharedArrayBuffer(4));
function sleep(ms) {
  Atomics.wait(sleepBuffer, 0, 0, ms);
}

// A lock is a folder: mkdir either creates it or fails because another process
// holds it. A lock older than staleMs is treated as left behind and removed.
export function withLock(root, name, fn, { staleMs = 10000, waitMs = 15000 } = {}) {
  const dir = path.join(projectPaths(root).locks, `${name}.lock`);
  ensureDir(path.dirname(dir));
  const started = Date.now();
  for (;;) {
    try {
      fs.mkdirSync(dir);
      break;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      try {
        const age = Date.now() - fs.statSync(dir).mtimeMs;
        if (age > staleMs) {
          fs.rmSync(dir, { recursive: true, force: true });
          continue;
        }
      } catch {
        continue;
      }
      if (Date.now() - started > waitMs) refuse(`Another session holds the ${name} lock. Try again in a moment.`);
      sleep(20);
    }
  }
  try {
    return fn();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Front matter: a small subset of YAML. Windows line endings are read as `\n`.
// `lines` keeps the raw front-matter lines so a rewrite can keep the ones flow
// does not own.
export function parseFrontMatter(input) {
  const text = String(input || '').replace(/\r\n/g, '\n');
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) return { data: null, body: text, lines: [] };
  const data = {};
  const lines = m[1].split('\n');
  for (const group of keyGroups(lines)) {
    if (!group.key) continue;
    const value = group.value.trim();
    const block = /^([>|])[+-]?\d*$/.exec(value);
    if (block) {
      const inner = group.lines.slice(1).map((l) => l.trim());
      data[group.key] = block[1] === '>' ? inner.filter(Boolean).join(' ') : inner.join('\n');
    } else {
      data[group.key] = parseScalar(value);
    }
  }
  return { data, body: text.slice(m[0].length), lines };
}

// Groups front-matter lines by key: a `key: value` line and the lines that
// continue it (indented lines, or `- ` items under a key with no value).
// Lines before the first key, or that belong to none, form groups with no key.
function keyGroups(lines) {
  const groups = [];
  let current = null;
  for (const line of lines) {
    const kv = /^([A-Za-z_][\w-]*):\s?(.*)$/.exec(line);
    const continues = current && current.key && (/^[ \t]/.test(line) || (!current.value.trim() && /^- /.test(line)) || (!line.trim() && /^[>|]/.test(current.value.trim())));
    if (kv && !continues) {
      current = { key: kv[1], value: kv[2], lines: [line] };
      groups.push(current);
    } else if (continues) {
      current.lines.push(line);
    } else {
      current = null;
      groups.push({ key: null, value: '', lines: [line] });
    }
  }
  return groups;
}

// Rewrites only the keys flow owns, in place. Every other line, such as a
// comment, a block list, or a key flow does not know, stays as written.
export function renderFrontMatterKeeping(lines, data, owned) {
  const out = [];
  const done = new Set();
  for (const group of keyGroups(lines)) {
    if (group.key && owned.includes(group.key) && !done.has(group.key)) {
      // The key line and its continuation lines are replaced together.
      out.push(`${group.key}: ${formatScalar(data[group.key])}`);
      done.add(group.key);
    } else {
      out.push(...group.lines);
    }
  }
  for (const key of owned) if (!done.has(key) && key in data) out.push(`${key}: ${formatScalar(data[key])}`);
  return `---\n${out.join('\n')}\n---\n`;
}

function parseScalar(raw) {
  if (raw === '' || raw === 'null' || raw === '~') return null;
  if (raw.startsWith('"')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw.slice(1, -1);
    }
  }
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const inner = raw.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((s) => parseScalar(s.trim()));
  }
  if (/^-?\d+$/.test(raw)) return Number(raw);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return raw;
}

function formatScalar(value) {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(formatScalar).join(', ')}]`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const s = String(value);
  if (/^[\w./-][\w ./()-]*$/.test(s) && !/^(null|true|false|-?\d+)$/.test(s) && !s.endsWith(' ')) return s;
  return JSON.stringify(s);
}

export function renderFrontMatter(data) {
  const lines = Object.entries(data).map(([k, v]) => `${k}: ${formatScalar(v)}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

export function renderTemplate(name, values) {
  const file = path.join(PLUGIN_ROOT, 'templates', name);
  const text = fs.readFileSync(file, 'utf8');
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => (values[key] ?? '').toString());
}

export function audit(root, event, detail = {}) {
  const p = projectPaths(root);
  ensureDir(p.flow);
  fs.appendFileSync(p.audit, `${JSON.stringify({ at: now(), event, ...detail })}\n`);
}

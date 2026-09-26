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
export function isAfter(a, b) {
  if (!a) return false;
  if (!b) return true;
  return Date.parse(a) > Date.parse(b);
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

// Front matter: a small subset of YAML. Scalars, null, and inline lists.
export function parseFrontMatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text || '');
  if (!m) return { data: null, body: text || '' };
  const data = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([A-Za-z_][\w-]*):\s?(.*)$/.exec(line);
    if (kv) data[kv[1]] = parseScalar(kv[2].trim());
  }
  return { data, body: text.slice(m[0].length) };
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

// Project setup, memory config, and per-session state.
import fs from 'node:fs';
import path from 'node:path';
import {
  projectPaths, ensureDir, readJson, writeJson, readText, writeText, now, renderTemplate, withLock,
} from './core.mjs';
import { renderIndex, renderGlossary } from './memory.mjs';

export function isInitialized(root) {
  return fs.existsSync(projectPaths(root).config);
}

export function ensureInit(root) {
  const p = projectPaths(root);
  if (isInitialized(root)) {
    ensureDir(p.sessions);
    return false;
  }
  withLock(root, 'memory', () => {
    if (fs.existsSync(p.config)) return;
    for (const dir of [p.memory, p.topics, p.pending, p.work, p.sessions, p.queue, p.history]) ensureDir(dir);
    if (!fs.existsSync(p.index)) writeText(p.index, renderIndex(root));
    if (!fs.existsSync(p.glossary)) writeText(p.glossary, renderGlossary(root));
    if (!fs.existsSync(p.log)) writeText(p.log, '# Memory log\n\nEvery memory write, newest last.\n\n');
    if (!fs.existsSync(p.focus)) writeText(p.focus, renderTemplate('FOCUS.md', { items: '- None yet.' }));
    for (const dir of [p.topics, p.pending, p.work]) {
      const keep = path.join(dir, '.gitkeep');
      if (!fs.existsSync(keep)) writeText(keep, '');
    }
    const gi = path.join(root, '.gitignore');
    const current = readText(gi, '');
    if (!/^\.flow\/?$/m.test(current)) {
      writeText(gi, `${current}${current && !current.endsWith('\n') ? '\n' : ''}.flow/\n`);
    }
    writeJson(p.config, { mode: 'onboarding', changed_at: now(), changed_by: 'setup', history: [] });
  });
  return true;
}

export function loadConfig(root) {
  return readJson(projectPaths(root).config, { mode: 'onboarding', history: [] });
}

export function saveConfig(root, config) {
  writeJson(projectPaths(root).config, config);
}

export function sessionIdFromEnv(env = process.env) {
  const id = env.FLOW_SESSION_ID || 'manual';
  return id.replace(/[^A-Za-z0-9_.-]/g, '_');
}

function sessionFile(root, id) {
  return path.join(projectPaths(root).sessions, `${id.replace(/[^A-Za-z0-9_.-]/g, '_')}.json`);
}

export function newSession(id) {
  return {
    id,
    created: now(),
    updated: now(),
    stack: [],
    turn: null,
    lastOwnerPromptAt: null,
    proposals: [],
    jobs: [],
    approvalRequests: [],
    subagentStarts: [],
  };
}

export function loadSession(root, id) {
  return readJson(sessionFile(root, id)) || newSession(id);
}

export function saveSession(root, session) {
  session.updated = now();
  writeJson(sessionFile(root, session.id), session);
}

// Load, change, and save one session under its own lock.
export function updateSession(root, id, fn) {
  return withLock(root, `session-${id}`, () => {
    const session = loadSession(root, id);
    const result = fn(session);
    saveSession(root, session);
    return result;
  });
}

// The owner's commands for the current turn (trust, undo), written only by the
// prompt hook to .flow/owner/<session>.json, a folder the agent's tools are
// refused. A permission counts only for the turn id that the prompt hook set.
function ownerFile(root, id) {
  return path.join(projectPaths(root).flow, 'owner', `${String(id).replace(/[^A-Za-z0-9_.-]/g, '_')}.json`);
}

export function recordOwnerCommands(root, sessionId, turnId, commands) {
  writeJson(ownerFile(root, sessionId), { turn: turnId, at: now(), ...commands });
}

export function ownerAllows(root, session, kind, value) {
  const record = readJson(ownerFile(root, session.id));
  if (!record || !session.turn?.id || record.turn !== session.turn.id) return false;
  return record[kind] != null && record[kind] === value;
}

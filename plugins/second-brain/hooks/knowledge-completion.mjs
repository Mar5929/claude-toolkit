#!/usr/bin/env node
/** Temporary review bookkeeping only. No content, permission, transcript or save state. */
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, renameSync, openSync, closeSync, unlinkSync, realpathSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveManual } from './knowledge-manual.mjs';

export const OUTCOMES = ['no-change', 'pending-approval', 'save-unfinished', 'saved'];
const UNCORRELATED_STOP = 'This Stop event has no turn id, so a late Stop from an earlier turn cannot be told apart.';
function turnId(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}
function statePath(root, identity, directory = join(tmpdir(), 'toolkit-knowledge-review')) {
  if (!identity.session_id) throw new Error('Missing session identity; completion checkpoint unavailable.');
  const key = createHash('sha256').update(JSON.stringify([realpathSync(root), identity.session_id, identity.agent_id || 'root'])).digest('hex');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  return join(directory, `${key}.json`);
}
function locked(root, identity, directory, operation) {
  const path = statePath(root, identity, directory), lock = `${path}.lock`;
  let handle;
  try { handle = openSync(lock, 'wx', 0o600); }
  catch {
    throw Object.assign(new Error(`Review state is busy or an interrupted update needs inspection; do not assume completion. Lock file: ${lock}`), { lock });
  }
  try {
    let state = null;
    try { state = JSON.parse(readFileSync(path, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw new Error('Review state unreadable; restore guidance and record a fresh review.'); }
    const { next, result } = operation(state);
    if (next) {
      const temporary = `${path}.${randomUUID()}.tmp`;
      try { writeFileSync(temporary, JSON.stringify(next), { mode: 0o600 }); renameSync(temporary, path); }
      finally { try { unlinkSync(temporary); } catch {} }
    }
    return result;
  } finally { closeSync(handle); try { unlinkSync(lock); } catch {} }
}
export function beginReview(root, identity, directory) {
  return locked(root, identity, directory, () => {
    const correlation = turnId(identity.turn_id);
    const next = { generation: randomUUID(), outcome: null, continued: false, ...(correlation ? { turn_id: correlation } : {}) };
    return { next, result: { ...next } };
  });
}
export function recordReview(root, identity, generation, outcome, directory) {
  if (!OUTCOMES.includes(outcome)) throw new Error('Unknown review outcome.');
  return locked(root, identity, directory, state => {
    if (!state || state.generation !== generation) throw new Error('Stale or different-session review; inspect the current turn before recording it.');
    return { next: { ...state, outcome }, result: { generation, outcome } };
  });
}
export function completion(root, input, directory) {
  if (input.hook_event_name === 'SubagentStop') return {};
  return locked(root, input, directory, state => {
    if (!state) return { result: { systemMessage: 'Knowledge completion checkpoint unavailable for this turn. Review under the manual and preserve unfinished saves; no completion was recorded.' } };
    const incomingTurn = turnId(input.turn_id);
    if (state.turn_id && incomingTurn && state.turn_id !== incomingTurn) return { result: {} };
    const correlationNotice = state.turn_id && incomingTurn ? '' : ` ${UNCORRELATED_STOP}`;
    if (state.outcome) return { result: {} };
    if (state.continued || input.stop_hook_active) {
      return { next: { ...state, continued: true }, result: { systemMessage: `Knowledge review remains unrecorded. No further continuation is requested; preserve any unfinished save in the inbox.${correlationNotice}` } };
    }
    return { next: { ...state, continued: true }, result: {
      decision: 'block',
      reason: `Knowledge turn review is not recorded. With knowledge-save and the knowledge manual, check quietly what was decided or found since the last review. Keep proposals and unfinished approved saves in the pending inbox. Do not wait for helper agents. Then run: node .claude/hooks/knowledge-completion.mjs review ${JSON.stringify(root)} ${JSON.stringify(input.session_id)} ${JSON.stringify(input.agent_id || 'root')} ${state.generation} OUTCOME, where OUTCOME is no-change, pending-approval, save-unfinished, or saved. The outcome does not permit a save or prove the check was right. Use tool calls only. Write no more text to the user.${correlationNotice}`,
    } };
  });
}
function canonical(path) { try { return realpathSync(path); } catch { return resolve(path); } }
if (process.argv[1] && canonical(process.argv[1]) === canonical(fileURLToPath(import.meta.url))) {
  try {
    if (process.argv[2] === 'review') {
      const [root, session_id, agent_id, generation, outcome] = process.argv.slice(3);
      console.log(JSON.stringify(recordReview(root, { session_id, agent_id }, generation, outcome)));
    } else {
      const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
      const installedRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
      const root = process.env.CLAUDE_PROJECT_DIR
        || (existsSync(resolve(installedRoot, 'knowledge')) ? installedRoot : null)
        || process.env.CODEX_PROJECT_DIR || input.cwd || process.cwd();
      const manual = resolveManual(root);
      if (manual.text?.includes('<!-- claude-toolkit:knowledge-schema:2 -->')) console.log(JSON.stringify(completion(root, input)));
      else if (manual.notice) console.log(JSON.stringify({ systemMessage: manual.notice }));
    }
  } catch (error) {
    if (process.argv[2] === 'review') { console.error(error.message); process.exitCode = 1; }
    else console.log(JSON.stringify({ systemMessage: `Knowledge completion check unavailable: ${error.message}` }));
  }
}

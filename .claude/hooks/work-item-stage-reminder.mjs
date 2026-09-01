#!/usr/bin/env node
/**
 * work-item-stage-reminder: a PostToolUse hook that fires once, on the
 * session's first file edit, and asks the agent to confirm the work item, its
 * stage, and its progress log.
 *
 * Why this exists. The `work-item-stages.md` rule gives every work item one
 * current stage and a dated progress log. The failure it exists for is the log
 * going stale: a session works for an hour, the stage moved two steps, and
 * nobody wrote either down, so the next session starts by reconstructing what
 * happened. A rule alone gets buried in exactly the long sessions where that
 * happens. This hook puts the question back in front of the agent at the one
 * moment that matters, the first write.
 *
 * What it is NOT. A reminder, not a gate. It reads no tracker, checks no
 * stage, and never blocks an edit. It cannot tell work-item work from a
 * one-line fix, so it asks once and stays quiet for the rest of the session.
 *
 * How it delivers. PostToolUse on Edit, Write, and NotebookEdit. Exit 0 with
 * the reminder on stdout, which Claude Code feeds back to the agent. A state
 * file keyed by session id under the OS temp folder makes it once-per-session.
 *
 * Fails open and quiet. Any unexpected error exits 0 with nothing written. A
 * broken reminder must never block an edit.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function bail() {
  process.exit(0);
}

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  bail();
}

const sessionId = input && input.session_id;
if (!sessionId || typeof sessionId !== 'string') bail();

try {
  const stateDir = join(tmpdir(), 'claude-work-item-stage-reminder');
  const stateFile = join(stateDir, sessionId.replace(/[^a-zA-Z0-9_-]/g, '_'));
  if (existsSync(stateFile)) bail();
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(stateFile, String(Date.now()));
} catch {
  bail();
}

process.stdout.write(
  [
    'You are about to change files. If this session is working a tracked work',
    'item: name the item, name its current stage, and check that the progress',
    'log is current. If the stage has moved, set it now before continuing. If',
    'this is not work-item work, ignore this.',
  ].join(' ') + '\n'
);
process.exit(0);

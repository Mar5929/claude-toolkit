#!/usr/bin/env node
/**
 * spec-check-reminder: a PostToolUse hook that fires once, on the session's
 * first file edit, and asks whether the spec-check skill has run.
 *
 * Why this exists. The spec-check skill reviews the specification an agent is
 * about to build from and flags anything that could skew the work. The failure
 * it exists for is forgetting to run it: a session picks up a ticket, starts
 * editing, and builds from a drifted spec. A rule alone gets buried in exactly
 * the long handed-off sessions where drift happens. This hook puts the
 * question back in front of the agent at the one moment that matters, the
 * first write.
 *
 * What it is NOT. A reminder, not a gate. It reads nothing, judges nothing,
 * and never blocks an edit. It cannot tell real build work from a one-line
 * fix, so it asks once and stays quiet for the rest of the session.
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
  const stateDir = join(tmpdir(), 'claude-spec-check-reminder');
  const stateFile = join(stateDir, sessionId.replace(/[^a-zA-Z0-9_-]/g, '_'));
  if (existsSync(stateFile)) bail();
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(stateFile, String(Date.now()));
} catch {
  bail();
}

process.stdout.write(
  [
    'First file change of this session. If this edit is part of building from',
    'or designing a solution from a specification (a knowledge/prds/ file or',
    'a ticket body), and the spec-check skill has not run yet, run it now and',
    'show the owner what it finds before building further. If this is not',
    'build-from-a-spec work, or the check already ran, continue; this reminder',
    'fires only once per session.',
  ].join(' ') + '\n'
);
process.exit(0);

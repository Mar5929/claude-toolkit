#!/usr/bin/env node
/**
 * save-reminder: a PreToolUse hook on Bash that holds the command which opens a
 * pull request, once per branch per session, so the agent runs the save at the
 * moment it applies.
 *
 * Why this exists. `specs/memory-system.md` names three moments when a save
 * runs, and one of them is a pull request opening. A rule is read once at the
 * start of a session and forgotten thousands of words later, at the exact moment
 * it applies. Opening a pull request is a single moment a small program can see.
 * Counted from real transcripts before this hook existed, the equivalent rule
 * was mostly ignored: 3.4% of turns in DragonFly, 0.5% in davis-advisors-sfdc,
 * 19% in claude-toolkit with the check never actually run.
 *
 * This is the only hook the memory system has, and the specification allows only
 * one. It reminds. It never writes a file and never approves anything.
 *
 * What it knows. Three facts, and nothing else:
 *   1. a pull request is about to be opened;
 *   2. this project saves at that moment, through `.claude/skills/remember/`;
 *   3. the pull request opens either way, with the code in it.
 *
 * What it must never know, and this is the test for whether it is built
 * correctly rather than a preference:
 *   - which folder anything goes in, or what a saved file looks like. That is
 *     the skill's job, and it loads only when a save actually runs.
 *   - any list of words or patterns that decides what is worth saving. That
 *     judgment is the agent's. The davis-advisors-sfdc project's memory hook
 *     went the other way with 46 text patterns, and its own log shows it firing
 *     on helper agent output and on messages from other sessions instead of on
 *     the owner's words.
 *
 * How it holds. Emits a PreToolUse `deny` decision with a short reason written
 * for the agent. It must never emit `ask`: that would put a popup in front of
 * the user on every pull request and let one click skip the save.
 *
 * Held once per branch per session, so the agent's own retry a moment later goes
 * straight through. Every pull request in a session still gets held once.
 *
 * Fails open. Any unexpected error exits 0 and the command runs. A broken hook
 * must never wedge a session.
 *
 * Costs nothing on ordinary commands. A command with no `gh` in it exits after
 * one substring check, with no file read and no subprocess.
 *
 * Config, all optional, from `.claude/save-reminder.json` in the project root:
 *   { "enabled": true, "maxHolds": 0 }
 * `maxHolds` of 0 means no limit. It exists only as a safety valve against a
 * runaway loop, not as a cap on how many pull requests get saved against.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const SKILL = '.claude/skills/remember/SKILL.md';

function bail() {
  process.exit(0);
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

/**
 * Exported for tests. Removes the body of every pasted-in text block (a
 * heredoc), from its start marker to the line that closes it.
 *
 * Only the block itself is removed, and what is left is still scanned, because
 * the common real shape puts the pasted block first:
 *
 *   git commit -m "$(cat <<EOF
 *   ... message ...
 *   EOF
 *   )" && gh pr create --fill
 *
 * An unterminated block is dropped to the end, because there is no command after
 * it to find.
 */
export function stripHeredocs(command) {
  return command.replace(
    /<<[-~]?[ \t]*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1[\s\S]*?(?:\n[ \t]*\2[ \t]*(?=\n|$)|$)/g,
    ' ',
  );
}

/**
 * Exported for tests. Removes quoted text, so the command name written inside a
 * message or an echo is not read as a command. This repository writes about the
 * pull request command in ordinary prose, so `git commit -m "document gh pr
 * create"` is a real case and not a hypothetical one.
 */
export function stripQuoted(command) {
  return command.replace(/"(?:\\.|[^"\\])*"/g, ' ').replace(/'[^']*'/g, ' ');
}

/** One command in a chain, with any settings written in front of it removed. */
function bareCommand(segment) {
  let text = segment.trim();
  // GH_TOKEN=x gh pr create -> gh pr create
  while (/^[A-Za-z_][A-Za-z0-9_]*=\S*[ \t]+/.test(text)) {
    text = text.replace(/^[A-Za-z_][A-Za-z0-9_]*=\S*[ \t]+/, '');
  }
  return text.replace(/\s+/g, ' ');
}

/**
 * Exported for tests. True when this command line opens a pull request.
 *
 * Every command in a chain is looked at on its own, never the whole line as one
 * string, because `git push -u origin HEAD && gh pr create` has to be held and
 * `echo "gh pr create when done"` must not be.
 */
export function opensPullRequest(command) {
  if (typeof command !== 'string' || !command.includes('gh')) return false;
  const scannable = stripQuoted(stripHeredocs(command));
  const segments = scannable.split(/\|\||&&|[;|&\n()]/);
  for (const segment of segments) {
    const text = bareCommand(segment);
    if (!/^gh +pr +create\b/.test(text)) continue;
    // Asking for help does not open anything.
    if (/(^| )(--help|-h)( |$)/.test(text)) continue;
    return true;
  }
  return false;
}

function loadConfig(projectDir) {
  const defaults = { enabled: true, maxHolds: 0 };
  if (!projectDir) return defaults;
  const path = join(projectDir, '.claude', 'save-reminder.json');
  if (!existsSync(path)) return defaults;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return {
      enabled: parsed.enabled !== false,
      maxHolds: Number.isInteger(parsed.maxHolds) && parsed.maxHolds > 0 ? parsed.maxHolds : 0,
    };
  } catch {
    return defaults;
  }
}

/**
 * What tells one piece of work from another. The branch when git can answer, the
 * working folder when it cannot, so a project that is not a git repository still
 * gets held once rather than every time or never.
 */
function branchKey(projectDir) {
  try {
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: projectDir || process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000,
    }).trim();
    if (branch) return branch;
  } catch {
    /* not a git repository, or git is not installed */
  }
  return projectDir || 'unknown';
}

function stateFile(sessionId) {
  const dir = join(tmpdir(), 'claude-save-reminder');
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    return null;
  }
  const safe = String(sessionId || 'unknown').replace(/[^A-Za-z0-9_-]/g, '');
  return join(dir, `${safe || 'unknown'}.json`);
}

function readState(path) {
  if (!path || !existsSync(path)) return { holds: 0, branches: [] };
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return {
      holds: Number.isInteger(parsed.holds) ? parsed.holds : 0,
      branches: Array.isArray(parsed.branches) ? parsed.branches : [],
    };
  } catch {
    return { holds: 0, branches: [] };
  }
}

function writeState(path, state) {
  if (!path) return;
  try {
    writeFileSync(path, JSON.stringify(state));
  } catch {
    /* state is an optimization, not a requirement */
  }
}

/** Exported for the test harness. The whole of what the hook says. */
export function buildMessage() {
  return [
    'Held once. A pull request opening is one of the three moments this project saves at.',
    '',
    `Read ${SKILL} and follow it, then run this command again.`,
    '',
    '- Nothing worth saving? Say so in one line and re-run this command.',
    '- Something worth saving? Re-run this command anyway. The pull request opens now,',
    '  with the code in it. Draft the real words, show the user the numbered list, and',
    '  write only what the user keeps, into this same branch.',
    '',
    'Either way, say in the pull request description what the save found.',
    '',
    'If you are a helper agent, stop here and report this back to the main agent.',
    'The main agent is the one that has to run the save.',
    '',
    'This branch will not be held again in this session.',
  ].join('\n');
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

function main() {
  const raw = readStdin();
  let payload = {};
  try {
    payload = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    bail();
  }

  const command = payload.tool_input?.command;
  // The cheap path every ordinary command takes: one substring check, no file
  // read, no subprocess.
  if (typeof command !== 'string' || !command.includes('gh')) bail();
  if (!opensPullRequest(command)) bail();

  const projectDir = payload.cwd || process.env.CLAUDE_PROJECT_DIR || '';
  const config = loadConfig(projectDir);
  if (!config.enabled) bail();

  const branch = branchKey(projectDir);
  const path = stateFile(payload.session_id);
  const state = readState(path);

  if (state.branches.includes(branch)) bail();
  if (config.maxHolds > 0 && state.holds >= config.maxHolds) bail();

  writeState(path, { holds: state.holds + 1, branches: [...state.branches, branch] });
  deny(buildMessage());
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('save-reminder.mjs')
) {
  try {
    main();
  } catch {
    bail();
  }
}

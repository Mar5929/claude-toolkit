#!/usr/bin/env node
/**
 * no-ai-attribution-guard: a PreToolUse hook on Bash that refuses any command
 * which would put AI credit on a commit, a tag, a pull request, or a release.
 *
 * Why this exists. Claude Code adds a `Co-Authored-By: Claude` trailer to
 * commits and a "Generated with Claude Code" line to pull requests unless the
 * `attribution` setting turns them off. That setting is the main defense and it
 * has two holes: a project's own settings file beats the machine-wide one, and
 * it does nothing about text an agent types into a message by hand. A written
 * rule covers the rest, but a rule is guidance the model may or may not follow.
 * The Claude Code documentation says so plainly: "To block an action regardless
 * of what Claude decides, use a PreToolUse hook instead." This is that hook.
 *
 * The owner's work must carry only their name, most of all in a client
 * repository. That makes a wrong pass worse than a wrong block here, which is
 * the opposite of how `writing-guard` is tuned.
 *
 * This hook is machine-wide. It is registered in the user's own
 * `~/.claude/settings.json` and installed by the `machine-sync` skill, so it
 * covers every repository on the machine, including ones that were never set up
 * with the toolkit. Every other hook in this plugin is per-project.
 *
 * It reads INSIDE quotes and pasted-in text blocks because the quoted text is
 * the thing being checked: the trailer lives in the commit message, and a
 * commit message is always quoted.
 *
 * What stops an ordinary commit being blocked by mistake. This repository
 * writes about the `Co-Authored-By: Claude` trailer in its own rules, tickets,
 * and commit messages, so a hook matching those words anywhere in a line would
 * fire constantly on text that is not attribution. Two things prevent that:
 *
 *   1. Every trailer pattern is anchored to the start of a line. A real trailer
 *      sits on its own line. Prose mentioning it, such as "stop shipping the
 *      Co-Authored-By: Claude trailer", does not match.
 *   2. Only commands that publish something are scanned: `git commit`,
 *      `git tag`, `git merge`, `gh pr create`, `gh pr edit`, `gh release
 *      create`, and `gh issue create`. Writing the same words into a file is
 *      not touched.
 *
 * Fails open. Any unexpected error exits 0 and the command runs. A broken hook
 * must never wedge a session. It also costs nothing on ordinary commands: a
 * command with none of the marker words exits after a handful of substring
 * checks, with no file read and no subprocess.
 *
 * Config, optional, from `no-ai-attribution-guard.json` next to this file:
 *   { "enabled": true }
 * Setting `enabled` to false switches the guard off. It exists as an escape
 * hatch for a wrong block that cannot be reworded, not as a normal setting. The
 * written rule still applies when it is off.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RULE = 'no-ai-attribution.md';

/** Names that make a co-author trailer an AI credit rather than a person. */
const AI_NAMES = [
  'claude',
  'anthropic',
  'chatgpt',
  'openai',
  'gpt-',
  'copilot',
  'codex',
  'cursor',
  'gemini',
  'devin',
  'windsurf',
  'aider',
  'cline',
  'ai assistant',
  'ai agent',
].join('|');

/**
 * Exported for tests. Each entry is a pattern and the plain-words reason shown
 * when it matches.
 *
 * `^[ \t>#*-]*` allows the leading whitespace, quote marker, or list marker a
 * trailer picks up when it travels through a pasted-in block or a description,
 * while still requiring the credit to begin its own line.
 */
export const PATTERNS = [
  [
    new RegExp(String.raw`^[ \t>#*-]*co-authored-by:[^\n]*(${AI_NAMES})`, 'im'),
    'a Co-Authored-By trailer naming an AI',
  ],
  [
    /^[ \t>#*-]*(?:\u{1F916}\s*)?generated with[^\n]*(?:claude|copilot|codex|cursor|chatgpt|openai|gemini)/imu,
    'a "Generated with" line naming an AI',
  ],
  [
    /^[ \t>#*-]*(?:\u{1F916}\s*)?(?:created|written|authored|made)\s+(?:with|by)[^\n]*(?:claude code|github copilot|chatgpt|openai|cursor ai)/imu,
    'a line crediting an AI for the work',
  ],
  [/noreply@anthropic\.com/i, "Claude's no-reply email address"],
  [/\bclaude\.com\/claude-code\b/i, 'the Claude Code link that ships in the default credit line'],
];

/** The cheap first look. None of these words present means nothing to check. */
const MARKERS = [
  'co-authored-by',
  'generated with',
  'created with',
  'written by',
  'authored by',
  'made with',
  'anthropic',
  'claude-code',
];

/** Commands that publish text where credit would end up on the owner's work. */
const PUBLISHING = [
  /^git\s+(?:-\S+\s+|--\S+(?:=\S+)?\s+)*commit\b/,
  /^git\s+(?:-\S+\s+|--\S+(?:=\S+)?\s+)*tag\b/,
  /^git\s+(?:-\S+\s+|--\S+(?:=\S+)?\s+)*merge\b/,
  /^git\s+(?:-\S+\s+|--\S+(?:=\S+)?\s+)*notes\b/,
  /^gh\s+pr\s+(?:create|edit)\b/,
  /^gh\s+release\s+(?:create|edit)\b/,
  /^gh\s+issue\s+(?:create|edit)\b/,
];

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

/** One command in a chain, with any settings written in front of it removed. */
function bareCommand(segment) {
  let text = segment.trim();
  while (/^[A-Za-z_][A-Za-z0-9_]*=\S*[ \t]+/.test(text)) {
    text = text.replace(/^[A-Za-z_][A-Za-z0-9_]*=\S*[ \t]+/, '');
  }
  return text;
}

/**
 * Exported for tests. True when this command line publishes text.
 *
 * Splitting on the separators outside quotes is deliberately not attempted.
 * A commit message may hold any character, so the split is done on the raw line
 * and every piece is tested. A piece that starts with a publishing command is
 * enough: the point is only to decide whether to look at the text at all, and
 * looking at a line that turns out to be harmless costs one regular expression.
 */
export function publishesText(command) {
  if (typeof command !== 'string') return false;
  const segments = command.split(/\|\||&&|[;|&\n()]/);
  for (const segment of segments) {
    const text = bareCommand(segment).replace(/\s+/g, ' ');
    if (/(^| )(--help|-h)( |$)/.test(text)) continue;
    if (PUBLISHING.some((pattern) => pattern.test(text))) return true;
  }
  return false;
}

/**
 * Exported for tests. The reason this command carries AI credit, or null when
 * it does not.
 */
export function findAttribution(command) {
  if (typeof command !== 'string' || !command) return null;
  const lowered = command.toLowerCase();
  if (!MARKERS.some((marker) => lowered.includes(marker))) return null;
  if (!publishesText(command)) return null;
  for (const [pattern, reason] of PATTERNS) {
    const match = pattern.exec(command);
    if (match) return { reason, matched: match[0].trim().slice(0, 120) };
  }
  return null;
}

function loadConfig() {
  const defaults = { enabled: true };
  try {
    const path = join(dirname(fileURLToPath(import.meta.url)), 'no-ai-attribution-guard.json');
    if (!existsSync(path)) return defaults;
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return { enabled: parsed.enabled !== false };
  } catch {
    return defaults;
  }
}

/** Exported for the test harness. The whole of what the hook says. */
export function buildMessage(found) {
  return [
    `Blocked. This command would put AI credit on the owner's work: ${found.reason}.`,
    '',
    `What matched: ${found.matched}`,
    '',
    'Nothing this owner commits or pushes carries a line saying an AI helped write',
    `it. The rule is ${RULE} in the machine-wide rules folder.`,
    '',
    'Remove that line and run the command again. Do not work around this by',
    'writing the commit another way, and do not turn the guard off.',
    '',
    'If you are a helper agent, stop here and report this back to the main agent.',
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
  if (typeof command !== 'string') bail();

  const found = findAttribution(command);
  if (!found) bail();
  if (!loadConfig().enabled) bail();

  deny(buildMessage(found));
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('no-ai-attribution-guard.mjs')
) {
  try {
    main();
  } catch {
    bail();
  }
}

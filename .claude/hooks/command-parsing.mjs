/**
 * Work out what a Bash command is actually about to do.
 *
 * Shared by the reminder hooks so they cannot disagree about whether a command
 * opens a pull request or closes a work item. Quoted text and heredoc bodies
 * are stripped first, so a command that merely mentions `gh pr create` inside a
 * commit message never triggers a hold.
 *
 * This module also owns the list of actions already held in this session, so
 * both hooks record a hold the same way and in the same file.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export function stripHeredocs(command) {
  return command.replace(
    /<<[-~]?[ \t]*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1[\s\S]*?(?:\n[ \t]*\2[ \t]*(?=\n|$)|$)/g,
    " ",
  );
}

export function stripQuoted(command) {
  return command.replace(/"(?:\\.|[^"\\])*"/g, " ").replace(/'[^']*'/g, " ");
}

/** Drop leading `VAR=value` prefixes and collapse whitespace. */
export function bareCommand(segment) {
  let text = segment.trim();
  while (/^[A-Za-z_][A-Za-z0-9_]*=\S*[ \t]+/.test(text)) {
    text = text.replace(/^[A-Za-z_][A-Za-z0-9_]*=\S*[ \t]+/, "");
  }
  return text.replace(/\s+/g, " ");
}

/** Every runnable segment of a command line, cleaned up. */
export function segmentsOf(command) {
  return stripQuoted(stripHeredocs(command))
    .split(/\|\||&&|[;|&\n()]/)
    .map(bareCommand)
    .filter((text) => text && !/(^| )(--help|-h)( |$)/.test(text));
}

/** True when any segment starts with one of the given patterns. */
export function matchesAny(command, patterns) {
  if (typeof command !== "string") return false;
  for (const segment of segmentsOf(command)) {
    if (patterns.some((pattern) => pattern.test(segment))) return true;
  }
  return false;
}

export const SPLIT_REVIEW_ACTIONS = [
  "Held. This command combines pull-request creation with a work-item close or merge.",
  "Run them as separate commands so each action gets its own Knowledge review checkpoint.",
  "No review state was changed or consumed.",
].join("\n");

export function combinesReviewActions(command) {
  return matchesAny(command, OPENS_PULL_REQUEST)
    && matchesAny(command, CLOSES_WORK_ITEM);
}

/**
 * The directory a command actually runs in.
 *
 * A command that starts by changing directory runs somewhere other than the
 * session's own working directory. For a git-aware command that difference
 * decides which branch it acts on, so a hook asking "which branch is this
 * about" has to ask here instead of trusting the session's directory.
 *
 * Read from the raw command on purpose. `segmentsOf` strips quoted text, and a
 * path with a space in it is quoted, so reading a segment would lose the path.
 *
 * Falls back to the given directory when there is no leading `cd`, which is the
 * common case.
 */
export function effectiveDirectory(command, cwd) {
  if (typeof command !== "string") return cwd;
  const match = command.match(/^\s*cd\s+(?:"([^"]*)"|'([^']*)'|([^\s;&|]+))/);
  const target = match && (match[1] ?? match[2] ?? match[3]);
  return target ? resolve(cwd, target) : cwd;
}

export const OPENS_PULL_REQUEST = [/^gh +pr +create\b/];
export const CLOSES_WORK_ITEM = [/^gh +issue +close\b/, /^gh +pr +merge\b/];

/** One file per session and agent, listing the action keys already held. */
function holdPath(payload) {
  const directory = join(tmpdir(), "second-brain-action-hold");
  mkdirSync(directory, { recursive: true });
  const safe = (value, fallback) =>
    String(value || fallback).replace(/[^A-Za-z0-9_-]/g, "") || fallback;
  return join(directory, `${safe(payload.session_id, "unknown")}-${safe(payload.agent_id, "root")}.json`);
}

/**
 * True when this session and agent already held that action. Otherwise the key
 * is recorded and false is returned, so each action is held exactly once.
 *
 * An unreadable or corrupt list counts as empty, so the action is held again
 * and the file is rewritten. A failed write throws, which reaches the hook's
 * outer fail-open path and allows the command, rather than holding that action
 * forever with no way through.
 */
export function heldBefore(payload, key) {
  const path = holdPath(payload);
  let actions = [];
  if (existsSync(path)) {
    try {
      const value = JSON.parse(readFileSync(path, "utf8"));
      if (Array.isArray(value.actions)) actions = value.actions;
    } catch {
      // Treated as empty. This list never allows an action silently.
    }
  }
  if (actions.includes(key)) return true;
  writeFileSync(path, JSON.stringify({ actions: [...actions, key] }));
  return false;
}

/** The denial text: the hook's own guidance, then the action and the retry. */
export function heldMessage(message, label) {
  return [
    message,
    "",
    `Held action: ${label}.`,
    "Review what this action needs saved, then run the same command again; it",
    "will not be held a second time in this session.",
  ].join("\n");
}

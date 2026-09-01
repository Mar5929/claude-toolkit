/**
 * Work out what a Bash command is actually about to do.
 *
 * Shared by the reminder hooks so they cannot disagree about whether a command
 * opens a pull request or closes a work item. Quoted text and heredoc bodies
 * are stripped first, so a command that merely mentions `gh pr create` inside a
 * commit message never triggers a hold.
 */

import { resolve } from "node:path";

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

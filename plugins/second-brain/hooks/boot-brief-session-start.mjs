#!/usr/bin/env node

/**
 * Claude Code SessionStart adapter for the memory system v2 boot brief.
 *
 * The host hands this hook its event as JSON on standard input, carrying at
 * least session_id, cwd, hook_event_name, and source. The hook resolves the
 * scope from that cwd, runs the assembler in process, and prints the brief as
 * the session's additional context.
 *
 * Fail-open, all of it required:
 *
 *   - Every error is caught. The hook prints one short warning line naming what
 *     failed and exits 0 anyway. A broken memory system degrades a session. It
 *     never stops one.
 *   - The hook exits 0 in every path, including a thrown exception and the soft
 *     time limit. The exit code is not a decision here, so nothing reads it as
 *     a refusal.
 *   - A directory with no memory project prints nothing at all. Not every
 *     repository is a memory project, and a session in one of those should
 *     notice nothing.
 *
 * Read-only, all of it required:
 *
 *   - The hook writes nothing. Not knowledge/current.md, not a session summary,
 *     not any other state.
 *   - A crash-recovery journal under .memory/ is reported as a warning and left
 *     alone. The first memory tool operation performs the recovery in its
 *     preflight, which is how "recover before current retrieval" and "startup
 *     writes nothing" both hold.
 *   - Two cold sessions over unchanged inputs produce the same brief, byte for
 *     byte.
 *
 * The version 1 loader knowledge-session-start.mjs stays registered and
 * untouched until the cutover work item swaps them.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assembleBootBrief, isMemoryProject } from "../tools/boot-brief.mjs";

/** The soft time limit. On timeout the brief carries what it finished, plus a warning. */
export const TIME_BUDGET_MS = 2000;

export function readEvent(stdinText) {
  try {
    const event = JSON.parse(stdinText);
    return event && typeof event === "object" ? event : {};
  } catch {
    return {};
  }
}

/** Where the session is. The event's cwd wins, then the host's project variable. */
export function startDirectory(event, env = process.env) {
  const candidates = [
    typeof event.cwd === "string" ? event.cwd : "",
    env.CLAUDE_PROJECT_DIR || "",
    env.CODEX_PROJECT_DIR || "",
  ];
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return resolve(candidate);
  }
  return process.cwd();
}

function journalWarning(root) {
  const journal = resolve(root, ".memory/journal");
  if (!existsSync(journal)) return null;
  return "\n[Memory: an interrupted write left a recovery journal under .memory/. "
    + "Startup does not act on it. The next memory tool operation recovers it first.]\n";
}

/**
 * Build what the hook prints. An empty string means print nothing, which is the
 * answer for a directory that is not part of a memory project.
 */
export function bootBriefOutput(startDir, options = {}) {
  if (!isMemoryProject(startDir)) return "";

  const brief = assembleBootBrief({
    projectRoot: startDir,
    timeBudgetMs: TIME_BUDGET_MS,
    ...options,
  });

  if (!brief.ok) {
    return `[Boot brief: ${brief.message}. Continue without it.]\n`;
  }

  return brief.text + (journalWarning(brief.model.root) ?? "");
}

function main() {
  let stdinText = "";
  try {
    stdinText = readFileSync(0, "utf8");
  } catch {
    // No stdin. The hook still works from the host's project directory.
  }
  const event = readEvent(stdinText);
  process.stdout.write(bootBriefOutput(startDirectory(event)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    main();
  } catch (error) {
    process.stdout.write(
      `[Boot brief startup failed open: ${error.message}. Continue without it.]\n`,
    );
  }
  process.exitCode = 0;
}

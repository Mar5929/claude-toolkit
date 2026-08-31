#!/usr/bin/env node

/**
 * Read-only UserPromptSubmit reminder.
 *
 * The operating manual is loaded once, at session start, and it is long. In a
 * long session it slides out of the agent's attention, so saves drift: the wrong
 * things get written, the right things get missed, and proposals stop using the
 * one approval format the manual requires.
 *
 * This prints a short reminder ahead of every owner prompt. It is deliberately a
 * pointer, not a copy. `tests/knowledge-startup-check.mjs` forbids any file
 * outside the manual from carrying a policy marker block, so the reminder names
 * the manual and the skill and lets those hold the actual policy.
 *
 * It is a reference, not an instruction to save. Wording that reads as a command
 * makes an agent propose a save on turns that call for none, which is worse than
 * the drift it was meant to fix.
 *
 * Silent when the project has no toolkit knowledge manual, so it can never claim
 * a memory system that is not there.
 *
 * Fails open, always. A missing or unreadable file is skipped and the prompt
 * continues, because a reminder must never be able to wedge a session.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MANUAL_PATH = "knowledge/README.md";
export const MANUAL_MARKER = "<!-- claude-toolkit:knowledge-manual -->";

export const REMINDER = [
  "Project knowledge is active. Manual: knowledge/README.md - reopen it before proposing any save.",
  "",
  "Memory (knowledge/memory/) = a lasting fact, decision, event, context, or constraint. Why things are the way they are.",
  "Spec (knowledge/specs/) = settled behavior of the system. How it is meant to work. A current spec beats a memory.",
  "",
  "Save only when ALL are true: lasting, about this project, the project itself changed, still true in six months, not already in a committed file or loaded rule, and you can name the source.",
  "Never save: commands, tool or agent behavior, troubleshooting, errors, scratch reasoning, dropped ideas, edit logs, sub-agent activity, copies of code or specs, procedures, open tasks, live status, secrets.",
  "Instead: procedure goes to a skill. Standing instruction goes to .claude/rules/. Live status goes to the work tracker.",
  "",
  "Saves happen through the remember skill, never by hand, never without the owner's approval.",
  "This is a reference, not a prompt to save. Most turns need no action.",
].join("\n");

/** True only for a manual this toolkit manages. */
export function hasManagedManual(projectRoot) {
  const absolute = resolve(projectRoot, MANUAL_PATH);
  if (!existsSync(absolute)) return false;
  try {
    return readFileSync(absolute, "utf8").trimStart().startsWith(MANUAL_MARKER);
  } catch {
    return false;
  }
}

export function buildReminder(projectRoot) {
  return hasManagedManual(projectRoot) ? `${REMINDER}\n` : "";
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const root = process.env.CLAUDE_PROJECT_DIR
      || process.env.CODEX_PROJECT_DIR
      || process.cwd();
    process.stdout.write(buildReminder(root));
  } catch {
    // A reminder is never worth interrupting a prompt for.
  }
  process.exitCode = 0;
}

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
 * It names the parts of a proposal anyway, which is the one place that pointing
 * was not enough. The manual is printed in full at session start and then never
 * again, and it defers the proposal's markup to the remember skill's template.
 * So an agent deciding to propose forty turns later has the names nowhere in
 * reach and a pointer that stops one file short of the answer. It writes its
 * own block instead, which is the failure this list exists to prevent. Names
 * only: what they mean stays in the manual, how they look stays in the
 * template.
 *
 * It asks the save question every turn and answers it "usually not" in the same
 * breath. Both halves are needed. Without the question the check only happens at
 * a pull request, so a spec goes stale mid-session. Without the default of no, a
 * command-shaped nudge makes an agent propose a save on turns that call for
 * none, which is worse than the drift it was meant to fix.
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

/**
 * The parts of a save proposal, in order. The manual owns what they mean and
 * the template owns how they look. This list carries only their names, because
 * an agent that cannot recall the names invents its own block instead.
 *
 * `tests/knowledge-startup-check.mjs` fails when this list stops matching the
 * manual, so the two cannot drift apart.
 */
export const PROPOSAL_LABELS = [
  "Save as",
  "What it says",
  "Why keep it",
  "Where it goes",
  "Where it came from",
  "Labels",
  "Guesses I made",
  "What I checked",
];

export const REMINDER = [
  "Project knowledge is active. Manual: knowledge/README.md - reopen it before proposing any save.",
  "",
  "Memory (knowledge/memory/) = a lasting fact, decision, event, context, or constraint. Why things are the way they are.",
  "Spec (knowledge/specs/) = settled behavior of the system. How it is meant to work. A current spec beats a memory.",
  "",
  "Memory must be about this project, and must come from the owner or from the owner and agent working it out together. Not from the agent alone.",
  "Never save: commands, tool calls, agent or shell behavior, troubleshooting, errors, scratch reasoning, dropped ideas, edit logs, sub-agent activity, copies of code or specs, procedures, open tasks, live status, secrets.",
  "Instead: procedure goes to a skill. Standing instruction goes to .claude/rules/. Live status goes to the work tracker.",
  "",
  "Saves happen through the remember skill, never by hand, never without the owner's approval.",
  "Before you answer: is there a spec to update or a memory to add? Usually not, and then you say nothing. If there is, invoke remember.",
  "",
  `A proposal has one fixed shape: subject line, then ${PROPOSAL_LABELS.join(", ")}.`,
  "Rendered Markdown, blank line after each label, never in a code fence. Never invent a shape. Template: the remember skill's references/proposal-template.md.",
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

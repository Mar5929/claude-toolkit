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

export const MANUAL_PATH = "knowledge/knowledge-manual.md";
export const LEGACY_MANUAL_PATH = "knowledge/README.md";
export const MANUAL_MARKER = "<!-- claude-toolkit:knowledge-manual -->";

/** Read-only compatibility during the manual filename migration. */
export function resolveManual(projectRoot) {
  const read = path => {
    const absolute = resolve(projectRoot, path);
    return existsSync(absolute) ? readFileSync(absolute, "utf8") : null;
  };
  try {
    const current = read(MANUAL_PATH);
    let legacy = null;
    let legacyUnreadable = false;
    try { legacy = read(LEGACY_MANUAL_PATH); } catch { legacyUnreadable = true; }
    const marked = text => text !== null && text.trimStart().startsWith(MANUAL_MARKER);
    const normalize = text => text.replace(/\r\n/g, "\n")
      .replaceAll(LEGACY_MANUAL_PATH, MANUAL_PATH).trim();
    if (current !== null) {
      if (!current.trim()) return { path: MANUAL_PATH, notice: `Project startup file empty: ${MANUAL_PATH}. Continuing without it.` };
      if (!marked(current)) return { path: MANUAL_PATH, notice: "Knowledge manual is not marked as managed. Run project-sync to review it; no manual policy was loaded." };
      if (marked(legacy) && normalize(current) !== normalize(legacy)) {
        return { path: MANUAL_PATH, notice: "Conflicting marked knowledge manuals exist at knowledge/knowledge-manual.md and knowledge/README.md. Preserve both and reconcile through project-sync; no manual policy was loaded." };
      }
      return { path: MANUAL_PATH, text: current,
        ...(legacyUnreadable ? { notice: "Using the canonical knowledge manual; legacy knowledge/README.md could not be inspected. Project-sync must check that path before migration cleanup." } : {}) };
    }
    if (marked(legacy)) return { path: LEGACY_MANUAL_PATH, text: legacy,
      notice: "Using the legacy knowledge/README.md manual until project-sync migrates it to knowledge/knowledge-manual.md." };
    if (legacyUnreadable) return { path: MANUAL_PATH, notice: "Canonical knowledge manual is missing and legacy knowledge/README.md could not be read. No manual policy was loaded; project-sync must investigate." };
    return { path: MANUAL_PATH };
  } catch {
    return { path: MANUAL_PATH, notice: "Could not read the knowledge manual. Preserve existing files and use project-sync to investigate; no manual policy was loaded." };
  }
}

export const REMINDER = [
  "Project knowledge is active. Manual: knowledge/knowledge-manual.md - reopen it before proposing any save.",
  "",
  "Memory (knowledge/memory/) = a lasting fact, decision, event, context, or constraint. Why things are the way they are.",
  "PRD (knowledge/prds/) = one living document per feature area. It opens as status: proposed, what we want built, and is edited to status: current once it describes what was actually built. Only a current PRD is settled truth, and only a current PRD beats a memory. This folder used to be called knowledge/specs/.",
  "",
  "Memory must be about this project, and must come from the owner or from the owner and agent working it out together. Not from the agent alone.",
  "Never save: commands, tool calls, agent or shell behavior, troubleshooting, errors, scratch reasoning, dropped ideas, edit logs, sub-agent activity, copies of code or specs, procedures, open tasks, live status, secrets.",
  "Instead: procedure goes to a skill. Standing instruction goes to .claude/rules/. Live status goes to the work tracker.",
  "",
  "Saves happen through the remember skill, never by hand, never without the owner's approval.",
  "Before you answer: is there a PRD to update or a memory to add? Usually not, and then you say nothing. If there is, invoke remember; knowledge/knowledge-manual.md shows how to display the proposal.",
].join("\n");

/** True only for a manual this toolkit manages. */
export function hasManagedManual(projectRoot) {
  return typeof resolveManual(projectRoot).text === "string";
}

export function buildReminder(projectRoot) {
  const manual = resolveManual(projectRoot);
  const notice = manual.notice ? `[${manual.notice}]\n` : "";
  return typeof manual.text === "string"
    ? notice + REMINDER.replaceAll(MANUAL_PATH, manual.path) + "\n"
    : notice;
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

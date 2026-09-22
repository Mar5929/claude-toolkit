#!/usr/bin/env node

/** Shared UserPromptSubmit guidance. Selection stays with the agent; temporary
 * review state records declarations only. A missing/conflicting managed manual
 * produces its repair notice and never creates save authority. */

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beginReview } from "./knowledge-completion.mjs";

import { MANUAL_PATH, resolveManual } from "./knowledge-manual.mjs";
export { MANUAL_PATH, LEGACY_MANUAL_PATH, MANUAL_MARKER, resolveManual } from "./knowledge-manual.mjs";

export const REMINDER = [
  "Friendly reminder: keep front of mind and follow all of the Toolkit operating system methodologies, processes, and instructions. Know where the project files and folders live.",
  "Check this message for anything to add, change, or remove in the project's records.",
  "- Working memory holds what is going on now: goals, blockers, next steps, and work in progress. Keep it short.",
  "- Lasting memory holds what a future session would need explained again: facts, decisions, feedback, and lessons. It comes from the owner or joint work, or from a serious project failure you found and fixed.",
  "- Do not save tool output, logs, guesses, steps, requirements, status, or secrets as lasting memory. Put them where they belong, such as the work item, the requirements, the design, or a rule or skill.",
  "- Only change what each place allows. Noticing a change does not permit other work.",
  "- The manuals are knowledge/knowledge-manual.md and knowledge/toolkit-manual.md. Reread a part only when it is missing or has changed.",
  "- Use knowledge-save to propose, make, or recover a save. Say nothing when nothing changed.",
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

function canonical(path) { try { return realpathSync(path); } catch { return resolve(path); } }
if (process.argv[1] && canonical(fileURLToPath(import.meta.url)) === canonical(process.argv[1])) {
  try {
    const installedRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
    const root = process.env.CLAUDE_PROJECT_DIR
      || (existsSync(resolve(installedRoot, "knowledge")) ? installedRoot : null)
      || process.env.CODEX_PROJECT_DIR
      || process.cwd();
    process.stdout.write(buildReminder(root));
    const manual = resolveManual(root);
    if (manual.text?.includes("<!-- claude-toolkit:knowledge-schema:2 -->")) {
      try {
        const input = JSON.parse(readFileSync(0, "utf8") || "{}");
        const checkpoint = beginReview(root, input);
        process.stdout.write(`Before you finish, run: node .claude/hooks/knowledge-completion.mjs review ${JSON.stringify(root)} ${JSON.stringify(input.session_id)} ${JSON.stringify(input.agent_id || "root")} ${checkpoint.generation} OUTCOME. OUTCOME is no-change, pending-approval, save-unfinished, or saved. Pending work is not a finished save.\n`);
      } catch (error) { process.stdout.write(`Knowledge turn review unavailable: ${error.message} Follow the knowledge manual and report any unfinished save.\n`); }
    }

  } catch {
    // A reminder is never worth interrupting a prompt for.
  }
  process.exitCode = 0;
}

#!/usr/bin/env node

/** Shared UserPromptSubmit reminder. It names the owning skill; it does not
 * select or approve anything. A missing or conflicting managed manual prints
 * its repair notice only. The review line gives the exact command that
 * records this turn's review for knowledge-completion.mjs. */

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beginReview, reviewCommand } from "./knowledge-completion.mjs";

import { MANUAL_PATH, resolveManual } from "./knowledge-manual.mjs";
export { MANUAL_PATH, LEGACY_MANUAL_PATH, MANUAL_MARKER, resolveManual } from "./knowledge-manual.mjs";

export const REMINDER = [
  "Friendly reminder: keep front of mind and follow all of the Toolkit operating system methodologies, processes, and instructions. Know where the project files and folders live.",
  "When the owner settles a decision, requirement, or correction, save it in its home before moving on.",
  "Open `knowledge-save` before any memory proposal or save.",
  "Policy: `knowledge/knowledge-manual.md`.",
].join("\n");

export function reviewLine(root, input, generation) {
  return `Before you finish, run: ${reviewCommand(root, input, generation)}. OUTCOME is no-change, pending-approval, save-unfinished, or saved. Pending work is not a finished save.`;
}

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
        process.stdout.write(`${reviewLine(root, input, checkpoint.generation)}\n`);
      } catch (error) { process.stdout.write(`Knowledge turn review unavailable: ${error.message} Report any unfinished save.\n`); }
    }

  } catch {
    // A reminder is never worth interrupting a prompt for.
  }
  process.exitCode = 0;
}

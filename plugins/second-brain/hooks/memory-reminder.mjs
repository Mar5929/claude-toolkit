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
  "Check this message and recent conversation for records to add, update, correct, or remove.",
  "Working memory: short current context (goals, blockers, next steps, temporary notes, marked guesses, partial work). No filler, secrets, or log.",
  "Lasting memory: important project facts, decisions, feedback, context, events, limits, relationships, and lessons a future session would need again. Source: the owner or joint work, or a serious project failure you found and fixed.",
  "Never lasting memory: tool activity, logs, source copies, scratch thinking, dropped guesses, procedures, requirements, open steps, live status, system explanations, useless stale claims, secrets. Keep what is useful in its own home.",
  "Other homes: current work, pending inbox, tracker, requirements, design, research, skills, rules, System Guide if on, named client architecture. Follow each home's permissions. Noticing a change permits no unrelated work.",
  "Manuals: knowledge/knowledge-manual.md and knowledge/toolkit-manual.md. Reread only missing or changed parts, before the task that needs them.",
  "Say you will check, then check. That proves nothing and approves no save. Use knowledge-save for proposals, approved saves, and recovery. Stay quiet when nothing changes; answer when asked.",
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
        process.stdout.write(`Knowledge turn review: session=${JSON.stringify(input.session_id)}, agent=${JSON.stringify(input.agent_id || "root")}, generation=${checkpoint.generation}. Before you finish, check quietly what changed, then run knowledge-completion.mjs review with: project root, session, agent, generation, outcome (no-change, pending-approval, save-unfinished, or saved). Pending work is not a finished save.\n`);
      } catch (error) { process.stdout.write(`Knowledge turn review unavailable: ${error.message} Follow the knowledge manual and report any unfinished save.\n`); }
    }

  } catch {
    // A reminder is never worth interrupting a prompt for.
  }
  process.exitCode = 0;
}

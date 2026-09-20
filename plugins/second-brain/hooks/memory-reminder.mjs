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
  "Evaluate this message and relevant conversation for additions, updates, corrections, removal and other needed record changes.",
  "Working memory is concise active context: objectives, blockers, next steps, temporary notes, labelled hypotheses and partial state. Exclude filler, secrets and an accumulating activity log.",
  "Lasting memory is project-relevant and significant: durable facts, decisions, feedback, context, events, constraints, relationships and lessons future sessions would need explained again. It comes from the owner or joint work; a significant project failure independently found and fixed is the only source exception.",
  "Tool activity, logs, source copies, scratch reasoning, dropped speculation, procedures, requirements, open steps, live status, system explanations, useless stale claims and secrets are not lasting memory. Preserve useful information in its proper home instead.",
  "Consider every owner: current work, pending inbox, tracker, requirements, design/research, skills/rules, enabled System Guide, and designated client architecture. Follow each owner's permission; noticing a change authorizes no unrelated implementation.",
  "Manuals: knowledge/knowledge-manual.md and knowledge/toolkit-manual.md. Reuse available current guidance; restore missing or changed guidance before the affected operation, without forcing full rereads every turn.",
  "Explicitly acknowledge intent to evaluate, then evaluate. Intent neither proves completed review nor approves a save. Use knowledge-save for proposals, authorized saves and recovery. Routine no-change reviews stay quiet; explicit requests receive an answer.",
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
        process.stdout.write(`Knowledge turn review: session=${JSON.stringify(input.session_id)}, agent=${JSON.stringify(input.agent_id || "root")}, generation=${checkpoint.generation}. Before finishing, quietly review actual outcomes and record one of no-change, pending-approval, save-unfinished, saved using knowledge-completion.mjs review with project root, session, agent, generation and outcome as positional arguments. Never treat pending work as a completed save.\n`);
      } catch (error) { process.stdout.write(`Knowledge review checkpoint unavailable: ${error.message} Follow the manual and report affected unfinished work.\n`); }
    }

  } catch {
    // A reminder is never worth interrupting a prompt for.
  }
  process.exitCode = 0;
}

#!/usr/bin/env node

/** Shared UserPromptSubmit reminder. It names the owning skill; it does not
 * select or approve anything. A missing or conflicting managed manual prints
 * its repair notice only. The review line gives the exact command that
 * records this turn's review for knowledge-completion.mjs. */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beginReview, protocolsActive, reviewCommand } from "./knowledge-completion.mjs";

import { MANUAL_PATH, resolveManual } from "./knowledge-manual.mjs";
export { MANUAL_PATH, LEGACY_MANUAL_PATH, MANUAL_MARKER, resolveManual } from "./knowledge-manual.mjs";

export const REMINDER = [
  "Friendly reminder: keep front of mind and follow all of the Toolkit operating system methodologies, processes, and instructions. Know where the project files and folders live.",
  "When the owner settles a decision, requirement, or correction, save it in its home before moving on.",
  "Open `knowledge-save` before any memory proposal or save.",
  "Policy: `knowledge/knowledge-manual.md`.",
].join("\n");

export function reviewLine(root, input, generation) {
  return `Before you finish, run: \`${reviewCommand(root, input, generation)}\`. OUTCOME is no-change, pending-approval, save-unfinished, or saved. Pending work is not a finished save.`;
}

/** The turn-review line is left out while protocol-guard checks the same
 * steps from facts: CW (working memory) and K4 and K6 (knowledge writes), the
 * last two being what knowledge-completion.mjs skips its check for. */
export const ENGINE_REPLACES_REVIEW = ["CW", "K4", "K6"];

export const ENGINE_NOT_RUNNING = "Required workflow checks are not running in this session: function hooks are on, but protocol-guard did not load. The older hooks run in full.";

/** One line per session when this project turns protocol-guard on with function
 * hooks but the engine's field is absent. A marker file keeps it to once. */
export function engineNotRunningLine(root, input, env = process.env, directory = join(tmpdir(), "toolkit-protocol-guard")) {
  if (env.CLAUDE_CODE_ENABLE_FUNCTION_HOOKS !== "1" || input?.toolkit_protocol_engine !== undefined) return "";
  let enabled = false;
  try {
    const settings = JSON.parse(readFileSync(resolve(root, ".claude/settings.json"), "utf8"));
    enabled = settings?.enabledPlugins?.["protocol-guard@claude-toolkit"] === true;
  } catch { enabled = false; }
  if (!enabled || !input?.session_id) return "";
  const marker = join(directory, createHash("sha256").update(String(input.session_id)).digest("hex"));
  if (existsSync(marker)) return "";
  try { mkdirSync(directory, { recursive: true, mode: 0o700 }); writeFileSync(marker, "", { mode: 0o600 }); } catch { /* still say it once now */ }
  return ENGINE_NOT_RUNNING;
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
    let out = buildReminder(root);
    let input = {};
    try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { input = {}; }
    const notRunning = engineNotRunningLine(root, input);
    if (notRunning) out += `${notRunning}\n`;
    const manual = resolveManual(root);
    if (manual.text?.includes("<!-- claude-toolkit:knowledge-schema:2 -->")) {
      try {
        // The review checkpoint always starts, so knowledge-completion.mjs can
        // run in full if the engine stops mid-turn. Only the printed line is
        // left out while protocol-guard checks the same steps.
        const checkpoint = beginReview(root, input);
        if (!protocolsActive(input, ENGINE_REPLACES_REVIEW)) out += `${reviewLine(root, input, checkpoint.generation)}\n`;
      } catch (error) { out += `Knowledge turn review unavailable: ${error.message} Report any unfinished save.\n`; }
    }
    // The "not running" line also goes to the owner, as a systemMessage; the
    // rest reaches the agent as context, exactly as plain output would.
    if (notRunning) {
      process.stdout.write(JSON.stringify({
        systemMessage: notRunning,
        hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: out },
      }));
    } else {
      process.stdout.write(out);
    }

  } catch {
    // A reminder is never worth interrupting a prompt for.
  }
  process.exitCode = 0;
}

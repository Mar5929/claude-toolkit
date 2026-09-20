#!/usr/bin/env node

// Project-init owns this read-only orientation route so it also ships when
// optional Knowledge, System Guide, and hooks-library plugins are absent.
// Never print manual bodies: both supported hosts can spill large hook output.
import { readFileSync, realpathSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const TOOLKIT_MANUAL = "knowledge/toolkit-manual.md";

function fileState(root, path) {
  try {
    return readFileSync(resolve(root, path), "utf8").trim() ? "available" : "empty";
  } catch (error) {
    return error.code === "ENOENT" ? "missing" : "unreadable";
  }
}

export function toolkitOrientation(root, event = "SessionStart") {
  const manualState = fileState(root, TOOLKIT_MANUAL);
  const claudeState = fileState(root, "CLAUDE.md");
  const roots = ["AGENTS.md", "CLAUDE.md"].filter((path) => fileState(root, path) === "available");
  const messages = [];
  if (event === "UserPromptSubmit") {
    messages.push("Toolkit workflow reminder: use the applicable project-root AGENTS.md/CLAUDE.md chain and knowledge/toolkit-manual.md. Follow the selected components' own instructions; reread missing guidance after context loss.");
  } else {
    messages.push(
      "Toolkit session orientation. Paths below are relative to the project root containing this installed .claude/hooks script.",
      roots.length ? `Read the applicable root instruction chain: ${roots.join(" -> ")}.` : "Required root guidance is missing, empty, or unreadable: AGENTS.md / CLAUDE.md. Report the gap.",
      `Read all of ${TOOLKIT_MANUAL} before starting work, including after resume, clear, or compaction.`,
      "A truncated preview or saved-output path is not a complete read. Continue with bounded file chunks until every section has been read; if content cannot be read, report the gap before claiming readiness.",
      "After the required reads, briefly acknowledge receipt and intent to follow the workflows. A hook running or a file existing does not establish that you read it.",
      "Use the root map's actual tracker, paths, and selected components. Read detailed component instructions when applicable; a Toolkit manual does not enable optional components or grant approval.",
    );
  }
  if (manualState !== "available") {
    messages.push(`Required Toolkit manual is ${manualState}: ${TOOLKIT_MANUAL}. Report this gap; project-init/project-sync owns repair. Do not claim the orientation was read or recreate its policy from memory.`);
  }
  if (claudeState !== "available" && roots.includes("AGENTS.md")) {
    messages.push(`The Toolkit root chain is incomplete: CLAUDE.md is ${claudeState}. AGENTS.md does not replace its target; report the gap before claiming readiness.`);
  }
  return messages.join("\n") + "\n";
}

export function installedProjectRoot(scriptPath, cwd = process.cwd()) {
  const hooks = dirname(scriptPath);
  return basename(hooks) === "hooks" && basename(dirname(hooks)) === ".claude"
    ? dirname(dirname(hooks)) : cwd;
}

function canonical(path) {
  try { return realpathSync(path); } catch { return resolve(path); }
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && canonical(scriptPath) === canonical(process.argv[1])) {
  try {
    let event = "SessionStart";
    try {
      const input = JSON.parse(readFileSync(0, "utf8"));
      if (input.hook_event_name === "UserPromptSubmit") event = "UserPromptSubmit";
    } catch { /* A direct verification run uses the startup route. */ }
    const root = process.env.CLAUDE_PROJECT_DIR || installedProjectRoot(scriptPath);
    process.stdout.write(toolkitOrientation(root, event));
  } catch {
    process.stdout.write("Toolkit orientation could not be prepared. Read the project's root instruction chain and knowledge/toolkit-manual.md directly; report any unavailable required guidance.\n");
  }
  process.exitCode = 0;
}

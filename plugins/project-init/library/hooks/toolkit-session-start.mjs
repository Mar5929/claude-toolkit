#!/usr/bin/env node

// Project-init owns this startup orientation so it also ships when the optional
// Knowledge, System Guide, and hooks-library plugins are absent. It runs at
// SessionStart only. It prints the manual's short Summary section, never the
// manual body, and asks for no acknowledgment.
import { readFileSync, realpathSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const TOOLKIT_MANUAL = "knowledge/toolkit-manual.md";
// A project that keeps its memory in a memory service (mem0 or Hindsight)
// declares it in this file and keeps the manual in docs/. A missing or invalid
// file means "files" mode, so the hook fails open to today's layout. This small
// reader duplicates second-brain's readMemoryConfig on purpose: project-init
// ships without the second-brain plugin.
export const MEMORY_CONFIG = ".toolkit-memory.json";
export const EXTERNAL_TOOLKIT_MANUAL = "docs/toolkit-manual.md";
// AGENTS.md holds the project instructions. The CLAUDE.md beside it is one
// import line, which is how Claude Code versions that do not read AGENTS.md
// natively still receive it. Codex reads AGENTS.md and never CLAUDE.md.
export const ROOT_INSTRUCTIONS = "AGENTS.md";
const CLAUDE_MD_IMPORT = "@AGENTS.md";
// The Summary section is printed at every startup. A longer section is cut here
// so a local edit cannot turn the hook into a manual dump.
export const SUMMARY_WORD_LIMIT = 120;

// Used when the manual has no Summary section. Keep it equal to the template's
// Summary section.
export const DEFAULT_SUMMARY = [
  "Toolkit project. AGENTS.md names the tracker and the codemap.",
  "- Before substantial work, open the `work` skill and read the active item.",
  "- When project information could affect an answer or action, open `knowledge-find` and cite each substantive finding.",
  "- When the owner settles a decision, requirement, or correction, open `knowledge-save`.",
  "- `knowledge/toolkit-manual.md` is reference. Open the section you need. Do not read it at startup.",
].join("\n");

// The external-mode equivalent. Keep it equal to the template's
// "Summary for the external memory mode" section.
export const EXTERNAL_SUMMARY_HEADING = "Summary for the external memory mode";
export const DEFAULT_EXTERNAL_SUMMARY = [
  "Toolkit project. AGENTS.md names the tracker and the codemap.",
  "- Before substantial work, open the `work` skill and read the active item.",
  "- When project information could affect an answer or action, open `knowledge-find` and cite each substantive finding. It searches the memory service.",
  "- When the owner settles a decision, requirement, or correction, open `knowledge-save`. It saves to the memory service.",
  "- `docs/toolkit-manual.md` is reference. Open the section you need. Do not read it at startup.",
].join("\n");

/**
 * "external" only for a valid external config; anything else is "files". The
 * rules are second-brain's readMemoryConfig rules: "format" 1, "memory"
 * "external", "service" mem0 or hindsight, "server" of letters, digits, _ and
 * - only, and a non-empty "project", each on one line.
 */
export function memoryMode(root) {
  try {
    const data = JSON.parse(readFileSync(resolve(root, MEMORY_CONFIG), "utf8"));
    const line = (value) => typeof value === "string" && value.trim() !== "" && !/[\r\n]/.test(value);
    return data && typeof data === "object" && !Array.isArray(data)
      && data.format === 1 && data.memory === "external"
      && ["mem0", "hindsight"].includes(data.service)
      && line(data.server) && /^[A-Za-z0-9_-]+$/.test(data.server)
      && line(data.project) ? "external" : "files";
  } catch {
    return "files";
  }
}

function fileState(root, path) {
  try {
    return readFileSync(resolve(root, path), "utf8").trim() ? "available" : "empty";
  } catch (error) {
    return error.code === "ENOENT" ? "missing" : "unreadable";
  }
}

function fileText(root, path) {
  try {
    return readFileSync(resolve(root, path), "utf8");
  } catch {
    return null;
  }
}

/** The text under the manual's "## Summary" heading (or another `## ` heading), or null. */
export function manualSummary(text, heading = "Summary") {
  if (!text) return null;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => /^##\s+/.test(line) && line.replace(/^##\s+/, "").trim() === heading);
  if (start === -1) return null;
  const body = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,2}\s/.test(line)) break;
    body.push(line);
  }
  const summary = body.join("\n").trim();
  if (!summary) return null;
  const words = summary.split(/\s+/);
  if (words.length <= SUMMARY_WORD_LIMIT) return summary;
  return `${words.slice(0, SUMMARY_WORD_LIMIT).join(" ")} [Summary cut at ${SUMMARY_WORD_LIMIT} words.]`;
}

export function toolkitOrientation(root) {
  const external = memoryMode(root) === "external";
  const manual = external ? EXTERNAL_TOOLKIT_MANUAL : TOOLKIT_MANUAL;
  const manualState = fileState(root, manual);
  const rootState = fileState(root, ROOT_INSTRUCTIONS);
  const claudeText = fileText(root, "CLAUDE.md");
  const summary = manualState === "available"
    ? manualSummary(fileText(root, manual), external ? EXTERNAL_SUMMARY_HEADING : "Summary") : null;
  const messages = [
    "Toolkit orientation. Paths resolve from the project root.",
    summary ?? (external ? DEFAULT_EXTERNAL_SUMMARY : DEFAULT_SUMMARY),
  ];
  if (manualState !== "available") {
    messages.push(`Toolkit manual is ${manualState}: ${manual}. Report this gap. project-sync repairs it.`);
  }
  if (rootState !== "available") {
    messages.push(`Root instructions are missing, empty, or unreadable: ${ROOT_INSTRUCTIONS}. Report this gap.`);
  } else if (claudeText === null || claudeText.trim() !== CLAUDE_MD_IMPORT) {
    messages.push(`CLAUDE.md should hold the single line ${CLAUDE_MD_IMPORT}, so that Claude Code reads ${ROOT_INSTRUCTIONS}. Report this gap.`);
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
    const root = process.env.CLAUDE_PROJECT_DIR || installedProjectRoot(scriptPath);
    process.stdout.write(toolkitOrientation(root));
  } catch {
    process.stdout.write(`Toolkit orientation could not be prepared. Read the project's ${ROOT_INSTRUCTIONS}.\n`);
  }
  process.exitCode = 0;
}

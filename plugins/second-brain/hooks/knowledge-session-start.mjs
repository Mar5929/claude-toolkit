#!/usr/bin/env node

/**
 * Read-only SessionStart loader.
 *
 * Prints a short, bounded list of the three startup reads. It never prints
 * file contents, and its output is not proof that the agent read the files.
 * In `external` memory mode (`.toolkit-memory.json`) the reads are `SOUL.md`
 * and `PROJECT.md`, then two agent steps that name the memory service's tools.
 * The knowledge manual and the indexes are not startup reads: the
 * knowledge-* skills open them when a task needs them.
 *
 * Fails open, always. A missing or unreadable file is reported and the
 * session continues, because knowledge setup must never stop a session.
 */

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MANUAL_PATH, resolveManual } from "./memory-reminder.mjs";
import { isProjectRoot, memoryAdapterReference, memoryLayout, memoryListStep, readMemoryConfig } from "./knowledge-manual.mjs";

export const SYSTEM_GUIDE_CONFIG = ".system-guide.json";
export const SYSTEM_GUIDE_OFF_MESSAGE = "System Guide is not configured.";

export const STARTUP_FILES = [
  { path: "SOUL.md" },
  { path: "knowledge/project.md" },
  { path: "knowledge/memory/current.md" },
];
export const LEGACY_STARTUP_FILES = STARTUP_FILES.map(item => ({ path: item.path
  .replace("knowledge/memory/current.md", "knowledge/current.md") }));
export const INBOX_PATH = "knowledge/memory-inbox.md";

/**
 * The System Guide plugin owns every configured on/repair briefing. The second
 * brain reports only an explicit off state, without importing or locating a
 * sibling plugin. A malformed config is left for project-sync or the guide
 * plugin to report as needing repair; calling it off would hide that problem.
 */
export function systemGuideOffMessage(projectRoot) {
  const configPath = resolve(projectRoot, SYSTEM_GUIDE_CONFIG);
  if (!existsSync(configPath)) return SYSTEM_GUIDE_OFF_MESSAGE;
  try {
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    return config && config.enabled === false ? SYSTEM_GUIDE_OFF_MESSAGE : "";
  } catch {
    return "";
  }
}

/** One startup file line, or the notice for a missing, empty or unreadable file. */
function fileLine(root, path, position) {
  const absolute = resolve(root, path);
  if (!existsSync(absolute)) return `[Project startup file missing: ${path}. Continuing without it.]`;
  try {
    if (!readFileSync(absolute, "utf8").trim()) return `[Project startup file empty: ${path}. Continuing without it.]`;
  } catch {
    return `[Could not read ${path}. Continuing without it.]`;
  }
  return `${position}. \`${path}\``;
}

/**
 * External memory mode. A command hook cannot call an MCP tool, so loading
 * working memory and listing pending saves are agent steps. The text names
 * the exact tool for the configured service.
 */
function loadExternal(root, config) {
  const layout = memoryLayout("external");
  const lines = [
    "Project knowledge startup. Memory mode: external "
      + `(${config.service}, MCP server \`${config.server}\`, project \`${config.project}\`).`,
    "Before substantial work, do these in order:",
    fileLine(root, "SOUL.md", 1).replace(/^1\. (.*)$/, "1. Read $1 in full."),
    fileLine(root, layout.projectContext, 2).replace(/^2\. (.*)$/, "2. Read $1 in full."),
    `3. Load working memory (kind \`working\`) with ${memoryListStep(config, "working")}. Read every record.`,
    `4. List pending records (kind \`pending\`) with ${memoryListStep(config, "pending")}. They are unfinished saves.`,
    `Tool details: ${memoryAdapterReference(config)}.`,
    "If a read is cut off, read the rest in more chunks.",
    `If the MCP server \`${config.server}\` is not connected, tell the owner. Pause only the work that needs memory.`,
  ];
  const manual = resolveManual(root);
  if (manual.notice) lines.push(`[${manual.notice}]`);
  else if (typeof manual.text !== "string") {
    lines.push(`[Knowledge manual missing: ${layout.knowledgeManual}. Do not invent knowledge policy. project-sync can restore it.]`);
  }
  lines.push(
    "Do not read the knowledge manual or the indexes now. The `knowledge-*` skills open them when needed.",
    "Report a missing or empty file. Pause only the work that needs it.",
  );
  const guideStatus = systemGuideOffMessage(root);
  if (guideStatus) lines.push(guideStatus);
  return lines.join("\n") + "\n";
}

export function loadKnowledge(projectRoot) {
  const root = resolve(projectRoot || process.cwd());
  const config = readMemoryConfig(root);
  if (config.mode === "external") return loadExternal(root, config);
  const lines = [
    "Project knowledge startup.",
    "Before substantial work, read these files in full, in this order:",
  ];
  const manual = resolveManual(root);
  const schema2 = manual.text?.includes("<!-- claude-toolkit:knowledge-schema:2 -->");
  let position = 0;
  for (const { path } of schema2 ? STARTUP_FILES : LEGACY_STARTUP_FILES) {
    position++;
    const absolute = resolve(root, path);
    if (!existsSync(absolute)) {
      lines.push(`[Project startup file missing: ${path}. Continuing without it.]`);
      continue;
    }
    try {
      if (!readFileSync(absolute, "utf8").trim()) {
        lines.push(`[Project startup file empty: ${path}. Continuing without it.]`);
        continue;
      }
    } catch {
      lines.push(`[Could not read ${path}. Continuing without it.]`);
      continue;
    }
    lines.push(`${position}. \`${path}\``);
  }
  lines.push("If a read is cut off, read the rest in more chunks.");
  if (schema2) lines.push(`Check \`${INBOX_PATH}\` for unfinished saves.`);
  if (manual.notice) lines.push(`[${manual.notice}]`);
  else if (typeof manual.text !== "string") {
    lines.push(`[Knowledge manual missing: ${MANUAL_PATH}. Do not invent knowledge policy. project-sync can restore it.]`);
  }
  if (config.error) lines.push(`[${config.error}]`);
  lines.push(
    "Do not read the knowledge manual or the indexes now. The `knowledge-*` skills open them when needed.",
    "Report a missing or empty file. Pause only the work that needs it.",
  );
  const guideStatus = systemGuideOffMessage(root);
  if (guideStatus) lines.push(guideStatus);
  return lines.join("\n") + "\n";
}

function canonicalPath(path) {
  try {
    return realpathSync(path);
  } catch {
    return resolve(path);
  }
}

if (process.argv[1]
  && canonicalPath(fileURLToPath(import.meta.url)) === canonicalPath(process.argv[1])) {
  try {
    const installedRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
    const root = process.env.CLAUDE_PROJECT_DIR
      || (isProjectRoot(installedRoot) ? installedRoot : null)
      || process.env.CODEX_PROJECT_DIR
      || process.cwd();
    process.stdout.write(loadKnowledge(root));
  } catch (error) {
    process.stdout.write(
      `[Project knowledge startup failed open: ${error.message}. Continuing without it.]\n`,
    );
  }
  process.exitCode = 0;
}

#!/usr/bin/env node

/**
 * Read-only SessionStart loader.
 *
 * Prints a bounded, ordered read request for the knowledge manual and project
 * map. The files themselves may exceed a host's hook-output limit, so the hook
 * never treats stdout delivery as proof that the agent read them.
 *
 * Fails open, always. A missing or unreadable file is skipped and the session
 * continues, because knowledge setup must never be able to wedge a session.
 */

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MANUAL_PATH, resolveManual } from "./memory-reminder.mjs";

export const SYSTEM_GUIDE_CONFIG = ".system-guide.json";
export const SYSTEM_GUIDE_OFF_MESSAGE = "System Guide is not configured.";

export const STARTUP_FILES = [
  { path: "SOUL.md" },
  { path: "knowledge/project.md" },
  { path: "knowledge/knowledge-manual.md" },
  { path: "knowledge/memory/current.md" },
  { path: "knowledge/memory/memory-index.md" },
  { path: "knowledge/prds/prd-index.md" },
];
export const LEGACY_STARTUP_FILES = STARTUP_FILES.map(item => ({ path: item.path
  .replace("knowledge/memory/current.md", "knowledge/current.md")
  .replace("knowledge/prds/prd-index.md", "knowledge/prds/spec-index.md") }));

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

export function loadKnowledge(projectRoot) {
  const root = resolve(projectRoot || process.cwd());
  const lines = [
    "Project knowledge startup.",
    "Follow any Toolkit startup orientation and root instruction chain delivered for this project first.",
    "Before claiming readiness or doing substantial work, read every available file below completely in this exact order.",
    "If a read is truncated, continue reading in additional chunks until the entire file has been read.",
  ];
  let position = 0;

  const resolved = resolveManual(root);
  const schema2 = resolved.text?.includes("<!-- claude-toolkit:knowledge-schema:2 -->");
  for (const { path } of schema2 ? STARTUP_FILES : LEGACY_STARTUP_FILES) {
    position++;
    if (path === MANUAL_PATH) {
      const manual = resolveManual(root);
      if (manual.notice) lines.push(`[${manual.notice}]`);
      if (typeof manual.text === "string") {
        lines.push(`${position}. Read all of \`${manual.path}\`.`);
      } else if (!manual.notice) {
        lines.push(`[Project startup file missing: ${MANUAL_PATH}. Continuing without it. Do not invent knowledge policy; project sync can restore the managed copy.]`);
      }
      continue;
    }
    const absolute = resolve(root, path);
    if (!existsSync(absolute)) {
      lines.push(`[Project startup file missing: ${path}. Continuing without it.]`);
      continue;
    }
    try {
      const text = readFileSync(absolute, "utf8");
      if (!text.trim()) {
        lines.push(`[Project startup file empty: ${path}. Continuing without it.]`);
        continue;
      }
    } catch {
      lines.push(`[Could not read ${path}. Continuing without it.]`);
      continue;
    }
    lines.push(`${position}. Read all of \`${path}\`.`);
  }

  if (schema2) lines.push(
    "After the three ordered startup reads, give one brief confirmation only when their full contents reached you. On recovery restore missing/current guidance without repeating the greeting.",
    "Check relevant entries in `knowledge/memory-inbox.md`; exact cards, authority and unfinished saves are pending work, never current facts. Missing inbox pauses dependent recovery.",
    "Lookup map: `knowledge/memory/memory-entries/terminology-glossary.md`; `ai-external-knowledge/README.md`; the four knowledge-find/save/review/setup skills. Read the applicable procedure before its operation; restore it after context loss.",
  );
  const guideStatus = systemGuideOffMessage(root);
  if (guideStatus) lines.push(guideStatus);

  lines.push(
    "Follow the resolved managed manual listed above only after reading it completely.",
    "Report missing, empty, unreadable, or conflicting required guidance before claiming readiness. This checklist is not proof that the files were read.",
  );
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
      || (existsSync(resolve(installedRoot, "knowledge")) ? installedRoot : null)
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

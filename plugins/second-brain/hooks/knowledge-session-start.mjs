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
  { path: "knowledge/knowledge-manual.md" },
  { path: "knowledge/project.md" },
  { path: "knowledge/current.md" },
  { path: "knowledge/memory/memory-index.md" },
  { path: "knowledge/prds/spec-index.md" },
];

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

  for (const { path } of STARTUP_FILES) {
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

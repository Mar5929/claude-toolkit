#!/usr/bin/env node

/**
 * Read-only SessionStart loader.
 *
 * Prints the one operating manual and the small project map into a new session.
 *
 * From the two indexes it prints only the entry lines, never the explanation
 * at the top of those files. That explanation is for a person opening the file;
 * reprinting it at every session start would be paid for on every session and
 * teach the agent nothing.
 *
 * The listings are deliberately unsatisfying. They say enough to make an agent
 * open the right file and never enough to answer from the listing alone.
 *
 * Fails open, always. A missing or unreadable file is skipped and the session
 * continues, because knowledge setup must never be able to wedge a session.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const STARTUP_FILES = [
  { path: "SOUL.md", label: "Who you are in this project", whole: true },
  {
    path: "knowledge/README.md",
    label: "How to use project knowledge",
    whole: true,
  },
  { path: "knowledge/project.md", label: "What this project is", whole: true },
  { path: "knowledge/current.md", label: "What is happening right now", whole: true },
  {
    path: "knowledge/memory/memory-index.md",
    label: "What this project knows. Open a file before relying on its line",
    whole: false,
  },
  {
    path: "knowledge/specs/spec-index.md",
    label: "How this project is meant to work. A current spec beats a memory",
    whole: false,
  },
];

/** Just the list entries and their wrapped continuation lines. */
export function entriesOnly(text) {
  const kept = [];
  let inEntry = false;
  for (const line of text.split("\n")) {
    if (/^-\s/.test(line)) {
      kept.push(line);
      inEntry = true;
    } else if (inEntry && /^\s+\S/.test(line)) {
      kept.push(line);
    } else {
      inEntry = false;
    }
  }
  return kept.join("\n");
}

export function loadKnowledge(projectRoot) {
  const root = resolve(projectRoot || process.cwd());
  const sections = [];

  for (const { path, label, whole } of STARTUP_FILES) {
    const absolute = resolve(root, path);
    if (!existsSync(absolute)) {
      const detail = path === "knowledge/README.md"
        ? " Do not invent knowledge policy; project sync can restore the managed copy."
        : "";
      sections.push(`[Project startup file missing: ${path}. Continuing without it.${detail}]`);
      continue;
    }
    let text;
    try {
      text = readFileSync(absolute, "utf8").replace(/\r\n/g, "\n").trim();
    } catch (error) {
      sections.push(`[Could not read ${path}: ${error.message}. Continuing without it.]`);
      continue;
    }
    const body = whole ? text : entriesOnly(text);
    if (body.trim()) {
      sections.push(`${label} (${path}):\n\n${body}`);
    } else if (!whole && text) {
      sections.push(`${label} (${path}):\n\nNothing saved yet.`);
    } else {
      sections.push(`[Project startup file empty: ${path}. Continuing without it.]`);
    }
  }

  return sections.join("\n\n---\n\n") + "\n";
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const root = process.env.CLAUDE_PROJECT_DIR
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

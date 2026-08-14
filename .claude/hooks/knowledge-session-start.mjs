#!/usr/bin/env node

/**
 * Read-only SessionStart loader. It prints the project overview and generated
 * index into the session, plus the session id Claude Code hands the hook on
 * stdin, so the `remember` skill can fill its `session:` field. Missing files
 * and unexpected errors are reported but always exit successfully, so
 * knowledge setup can never wedge a session.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const files = ["knowledge/project.md", "knowledge/index.md"];

export function readSessionId(stdinText) {
  try {
    const id = JSON.parse(stdinText).session_id;
    return typeof id === "string" && id.trim() ? id.trim() : null;
  } catch {
    return null;
  }
}

export function loadKnowledge(projectRoot) {
  const root = resolve(projectRoot || process.cwd());
  const sections = [];

  for (const relativePath of files) {
    const absolute = resolve(root, relativePath);
    if (!existsSync(absolute)) {
      sections.push(`[Project knowledge: ${relativePath} is missing. Continue without it.]`);
      continue;
    }
    try {
      sections.push(
        `Project knowledge from ${relativePath}:\n\n`
        + readFileSync(absolute, "utf8").replace(/\r\n/g, "\n").trim(),
      );
    } catch (error) {
      sections.push(
        `[Project knowledge: could not read ${relativePath}: ${error.message}. `
        + "Continue without it.]",
      );
    }
  }

  return sections.join("\n\n---\n\n") + "\n";
}

function main() {
  const root = process.env.CLAUDE_PROJECT_DIR || process.env.CODEX_PROJECT_DIR || process.cwd();
  let stdinText = "";
  try {
    stdinText = readFileSync(0, "utf8");
  } catch {
    // No stdin (Codex, or run by hand). The session id line is simply omitted.
  }
  const sessionId = readSessionId(stdinText);
  const sessionLine = sessionId
    ? `This session's id is ${sessionId}. When the remember skill saves a memory, `
      + `write this id in the \`session:\` field.\n\n---\n\n`
    : "";
  process.stdout.write(sessionLine + loadKnowledge(root));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    main();
  } catch (error) {
    process.stdout.write(
      `[Project knowledge startup failed open: ${error.message}. Continue without it.]\n`,
    );
    process.exitCode = 0;
  }
}

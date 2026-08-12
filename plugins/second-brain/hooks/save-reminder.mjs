#!/usr/bin/env node

/**
 * Hold `gh pr create` once per branch per session so the main agent runs the
 * owner-approved remember review. This hook only reminds. It never decides,
 * writes, or approves project knowledge. Unexpected failures allow the command.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function failOpen() {
  process.exitCode = 0;
}

export function stripHeredocs(command) {
  return command.replace(
    /<<[-~]?[ \t]*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1[\s\S]*?(?:\n[ \t]*\2[ \t]*(?=\n|$)|$)/g,
    " ",
  );
}

export function stripQuoted(command) {
  return command.replace(/"(?:\\.|[^"\\])*"/g, " ").replace(/'[^']*'/g, " ");
}

function bareCommand(segment) {
  let text = segment.trim();
  while (/^[A-Za-z_][A-Za-z0-9_]*=\S*[ \t]+/.test(text)) {
    text = text.replace(/^[A-Za-z_][A-Za-z0-9_]*=\S*[ \t]+/, "");
  }
  return text.replace(/\s+/g, " ");
}

export function opensPullRequest(command) {
  if (typeof command !== "string" || !command.includes("gh")) return false;
  const scannable = stripQuoted(stripHeredocs(command));
  for (const segment of scannable.split(/\|\||&&|[;|&\n()]/)) {
    const text = bareCommand(segment);
    if (!/^gh +pr +create\b/.test(text)) continue;
    if (/(^| )(--help|-h)( |$)/.test(text)) continue;
    return true;
  }
  return false;
}

function branchKey(projectRoot) {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
    }).trim() || projectRoot;
  } catch {
    return projectRoot;
  }
}

function statePath(sessionId) {
  const dir = join(tmpdir(), "second-brain-save-reminder");
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    return null;
  }
  const safe = String(sessionId || "unknown").replace(/[^A-Za-z0-9_-]/g, "");
  return join(dir, `${safe || "unknown"}.json`);
}

function readState(path) {
  if (!path || !existsSync(path)) return { branches: [] };
  try {
    const value = JSON.parse(readFileSync(path, "utf8"));
    return { branches: Array.isArray(value.branches) ? value.branches : [] };
  } catch {
    return { branches: [] };
  }
}

function writeState(path, state) {
  if (!path) return;
  try {
    writeFileSync(path, JSON.stringify(state));
  } catch {
    // State only prevents a repeated reminder. It is never project knowledge.
  }
}

export function buildMessage() {
  return [
    "Held once. A pull request opening is a project-knowledge review moment.",
    "",
    "Invoke /remember and follow it, then run this command again.",
    "",
    "- Nothing passes the four save filters? Say so briefly and retry.",
    "- Something should be saved? Show What I want to change and Why, then the",
    "  exact words. The pull request may open now, but durable words do not merge",
    "  until the owner approves them.",
    "",
    "If you are a helper agent, stop and report this to the main agent.",
    "This branch will not be held again in this session.",
  ].join("\n");
}

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  }));
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return failOpen();
  }

  const command = payload.tool_input?.command;
  if (!opensPullRequest(command)) return failOpen();

  const projectRoot = resolve(
    payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd(),
  );
  const branch = branchKey(projectRoot);
  const path = statePath(payload.session_id);
  const state = readState(path);
  if (state.branches.includes(branch)) return failOpen();

  writeState(path, { branches: [...state.branches, branch] });
  deny(buildMessage());
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    main();
  } catch {
    failOpen();
  }
}

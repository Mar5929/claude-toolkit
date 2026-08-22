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

import { matchesAny, OPENS_PULL_REQUEST } from "./command-parsing.mjs";

function failOpen() {
  process.exitCode = 0;
}

export function opensPullRequest(command) {
  return matchesAny(command, OPENS_PULL_REQUEST);
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
    "Held once. A pull request opening is a save moment.",
    "",
    "Invoke the remember skill and follow it, then run this command again.",
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

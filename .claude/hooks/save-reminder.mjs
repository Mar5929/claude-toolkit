#!/usr/bin/env node

/**
 * Hold `gh pr create` once per branch per session so the main agent runs the
 * owner-approved remember review. This hook only reminds. It never decides,
 * writes, or approves project knowledge. Unexpected failures allow the command.
 *
 * A knowledge-only branch gets a different message. `knowledge-direct-commit.md`
 * says a save touching only `knowledge/` commits straight to the default branch,
 * with no worktree, branch, or pull request. That rule is context, not
 * enforcement, so an agent can read it and open the pull request anyway. The
 * owner then finds out at the end of the session that an approved save never
 * landed. Reaching `gh pr create` with nothing but `knowledge/` in the diff is
 * the moment that mistake becomes visible, so it is the moment to say so.
 *
 * The hold is once per branch either way. The rule itself sends the agent back
 * to a pull request when branch protection refuses the push, so a permanent
 * block would break the fallback the rule depends on.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { matchesAny, OPENS_PULL_REQUEST } from "./command-parsing.mjs";

const KNOWLEDGE_PREFIX = "knowledge/";

function failOpen() {
  process.exitCode = 0;
}

export function opensPullRequest(command) {
  return matchesAny(command, OPENS_PULL_REQUEST);
}

function git(projectRoot, args) {
  return execFileSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 3000,
  });
}

function branchKey(projectRoot) {
  try {
    return git(projectRoot, ["rev-parse", "--abbrev-ref", "HEAD"]).trim() || projectRoot;
  } catch {
    return projectRoot;
  }
}

/** The branch a pull request would target, or null when it cannot be read. */
function defaultBranch(projectRoot) {
  try {
    const ref = git(projectRoot, ["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"]).trim();
    const name = ref.replace(/^refs\/remotes\//, "");
    if (name) return name;
  } catch {
    // No origin/HEAD. Fall through to the usual names.
  }
  for (const name of ["origin/main", "origin/master", "main", "master"]) {
    try {
      git(projectRoot, ["rev-parse", "--verify", "--quiet", name]);
      return name;
    } catch {
      // Try the next one.
    }
  }
  return null;
}

/**
 * The paths this branch's commits would put into a pull request. Null when git
 * cannot answer, so a caller can tell "nothing changed" apart from "could not
 * look".
 *
 * Committed work only. Untracked and uncommitted files are not in a pull
 * request, and counting them let one stray build artifact or scratch file
 * decide that a knowledge-only branch was something else.
 */
export function changedPaths(projectRoot) {
  const base = defaultBranch(projectRoot);
  if (!base) return null;
  try {
    return git(projectRoot, ["diff", "--name-only", `${base}...HEAD`])
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}

/** True only when there is something to land and all of it is knowledge. */
export function isKnowledgeOnly(paths) {
  if (!Array.isArray(paths) || paths.length === 0) return false;
  return paths.every((path) => path.startsWith(KNOWLEDGE_PREFIX));
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
    "Check whether any specification needs updating and whether anything is",
    "worth saving as memory. If there is, knowledge/README.md shows how to",
    "display the proposal.",
    "",
    "If you are a helper agent, stop and report this to the main agent.",
    "This branch will not be held again in this session.",
  ].join("\n");
}

export function buildDirectCommitMessage(paths) {
  return [
    "Held once. This branch changes nothing outside knowledge/, so it does not",
    "need a pull request.",
    "",
    `Files: ${paths.join(", ")}`,
    "",
    "Follow .claude/rules/knowledge-direct-commit.md instead: pull the default",
    "branch, rebuild the generated indexes, stage these exact paths, read",
    "`git diff --cached --name-status` to confirm every file is one you wrote,",
    "then commit and push to the default branch.",
    "",
    "Go back to a pull request only if that push is refused, and say why.",
    "Run this command again to open one; this branch will not be held again.",
    "",
    "If you are a helper agent, stop and report this to the main agent.",
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

  const paths = changedPaths(projectRoot);
  writeState(path, { branches: [...state.branches, branch] });
  deny(isKnowledgeOnly(paths) ? buildDirectCommitMessage(paths) : buildMessage());
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    main();
  } catch {
    failOpen();
  }
}

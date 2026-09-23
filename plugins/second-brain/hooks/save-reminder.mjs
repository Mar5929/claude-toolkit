#!/usr/bin/env node

/**
 * Hold each recognized `gh pr create` action once per session, so the agent
 * reviews what that action needs saved. A plain retry of the same command is
 * then allowed, and the action stays allowed for the rest of the session. This
 * hook never decides, writes, or approves project knowledge. Unexpected
 * failures allow the command.
 *
 * A knowledge-only branch gets a different message. `knowledge-direct-commit.md`
 * says a save touching only `knowledge/` commits straight to the default branch,
 * with no worktree, branch, or pull request. That rule is context, not
 * enforcement, so an agent can read it and open the pull request anyway. The
 * owner then finds out at the end of the session that an approved save never
 * landed. Reaching `gh pr create` with nothing but `knowledge/` in the diff is
 * the moment that mistake becomes visible, so it is the moment to say so.
 *
 * The hold is not enforcement of the save route or proof of judgment. A refused
 * direct push is reported to the owner; it does not automatically authorize a
 * pull request or a retry through another account.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  combinesReviewActions,
  effectiveDirectory,
  engineProtocols,
  heldMessage,
  matchesAny,
  OPENS_PULL_REQUEST,
  recordHold,
  shouldHold,
  SPLIT_REVIEW_ACTIONS,
} from "./command-parsing.mjs";

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

function repositoryRoot(projectRoot) {
  return git(projectRoot, ["rev-parse", "--show-toplevel"]).trim();
}

/** A repository with no commits has no HEAD; the action is still held. */
function headKey(projectRoot) {
  try {
    return git(projectRoot, ["rev-parse", "HEAD"]).trim();
  } catch {
    return "no-commits";
  }
}

export function pullRequestActionKey(projectRoot) {
  return JSON.stringify([
    "pull-request-create",
    projectRoot,
    branchKey(projectRoot),
    headKey(projectRoot),
  ]);
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

export function buildMessage() {
  return [
    "Held. Opening a pull request is a save-review moment.",
    "",
    "Use knowledge-save to review this work and preserve its outcome, then retry.",
    "Check whether any specification needs updating and whether anything is",
    "worth saving as memory. If there is, knowledge/knowledge-manual.md shows how to",
    "display the proposal.",
    "",
    "If you are a helper agent, stop and report this to the main agent.",
  ].join("\n");
}

export function buildDirectCommitMessage(paths) {
  return [
    "Held. This branch changes only knowledge/; inspect actual content to decide whether it",
    "needs the documentation route or an implementation pull request.",
    "",
    `Files: ${paths.join(", ")}`,
    "",
    "For authorized documentation-only changes, open the publish-docs skill and follow",
    ".claude/rules/knowledge-direct-commit.md from the existing default-branch",
    "checkout, even while implementation is in a worktree.",
    "Reconcile only approved meaning with the latest destination, rebuild",
    "and check the indexes, and commit and push only this authorized save.",
    "Preserve other sessions' edits and staged work.",
    "",
    "If validation or pushing fails, report the unfinished save and next step.",
    "A refused push or login window means stop; do not automatically retry",
    "or open a pull request. This reminder is not enforcement of that rule.",
    "",
    "If you are a helper agent, stop and report this to the main agent.",
  ].join("\n");
}

/** The held action in words, from the parts of its key. */
function actionLabel(key) {
  const [, , branch, head] = JSON.parse(key);
  const where = head === "no-commits" ? "with no commits" : `at ${head.slice(0, 7)}`;
  return `gh pr create on branch ${branch} ${where}`;
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
  if (combinesReviewActions(command)) return deny(SPLIT_REVIEW_ACTIONS);

  const projectRoot = resolve(
    payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd(),
  );
  const workingDirectory = effectiveDirectory(command, projectRoot);
  const root = repositoryRoot(workingDirectory);
  const key = pullRequestActionKey(root);
  if (!shouldHold(payload, key)) return failOpen();

  const paths = changedPaths(root);
  const knowledgeOnly = isKnowledgeOnly(paths);
  // protocol-guard K7 replaces the general save-review hold. The
  // knowledge-only branch message stays: K7 does not check the route.
  if (!knowledgeOnly && engineProtocols().includes("K7")) return failOpen();
  const message = knowledgeOnly ? buildDirectCommitMessage(paths) : buildMessage();
  deny(heldMessage(message, actionLabel(key)));
  recordHold(payload, key);
}

function canonical(path) { try { return realpathSync(path); } catch { return resolve(path); } }

if (process.argv[1] && canonical(process.argv[1]) === canonical(fileURLToPath(import.meta.url))) {
  try {
    main();
  } catch {
    failOpen();
  }
}

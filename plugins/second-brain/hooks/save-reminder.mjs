#!/usr/bin/env node

/**
 * Hold each recognized `gh pr create` occurrence until the main agent records
 * an action-associated Knowledge review outcome. One exact retry consumes that
 * receipt. This hook never decides, writes, or approves project knowledge.
 * Unexpected failures allow the command.
 *
 * A knowledge-only branch gets a different message. `knowledge-direct-commit.md`
 * says a save touching only `knowledge/` commits straight to the default branch,
 * with no worktree, branch, or pull request. That rule is context, not
 * enforcement, so an agent can read it and open the pull request anyway. The
 * owner then finds out at the end of the session that an approved save never
 * landed. Reaching `gh pr create` with nothing but `knowledge/` in the diff is
 * the moment that mistake becomes visible, so it is the moment to say so.
 *
 * The action receipt is not enforcement of the save route or proof of judgment.
 * A refused direct push is reported to the owner; it does not automatically
 * authorize a pull request or a retry through another account.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  combinesReviewActions,
  effectiveDirectory,
  matchesAny,
  OPENS_PULL_REQUEST,
  SPLIT_REVIEW_ACTIONS,
} from "./command-parsing.mjs";
import { claimActionReview } from "./knowledge-completion.mjs";

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
    "For authorized documentation-only changes, follow .claude/rules/knowledge-direct-commit.md from the existing",
    "default-branch checkout, even while implementation is in a worktree.",
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

function actionReviewMessage(message, root, input, checkpoint) {
  if (checkpoint.status === "stale-turn") {
    return `${message}\n\nThis action belongs to an older turn. Do not mutate the current review state; retry from the current turn.`;
  }
  if (checkpoint.status === "busy") {
    return `${message}\n\nThe review state is busy or an interrupted update needs inspection. This action remains held; inspect the current checkpoint before retrying. Lock file: ${checkpoint.lock}. If no other review is running, inspect and remove that file, then retry.`;
  }
  return [
    message,
    "",
    "After reviewing the work for this exact pull-request action, record the action-specific outcome with",
    "node .claude/hooks/knowledge-completion.mjs review using these six positional arguments:",
    `root=${JSON.stringify(root)}, session=${JSON.stringify(input.session_id)}, agent=${JSON.stringify(input.agent_id || "root")}, generation=${checkpoint.generation}, outcome=no-change|pending-approval|save-unfinished|saved, action=${checkpoint.nonce}.`,
    "A general turn outcome does not satisfy this action. The action receipt is consumed by one exact retry and proves neither judgment nor permission.",
    "If approval or a save remains unfinished and this pull request depends on it, do not retry until that dependency is resolved.",
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
  if (combinesReviewActions(command)) return deny(SPLIT_REVIEW_ACTIONS);

  const projectRoot = resolve(
    payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd(),
  );
  const workingDirectory = effectiveDirectory(command, projectRoot);
  const root = repositoryRoot(workingDirectory);
  const checkpoint = claimActionReview(root, payload, pullRequestActionKey(root));
  if (checkpoint.status === "allow") return failOpen();
  const paths = changedPaths(root);
  const message = isKnowledgeOnly(paths) ? buildDirectCommitMessage(paths) : buildMessage();
  deny(actionReviewMessage(message, root, payload, checkpoint));
}

function canonical(path) { try { return realpathSync(path); } catch { return resolve(path); } }

if (process.argv[1] && canonical(process.argv[1]) === canonical(fileURLToPath(import.meta.url))) {
  try {
    main();
  } catch {
    failOpen();
  }
}

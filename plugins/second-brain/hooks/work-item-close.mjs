#!/usr/bin/env node

/**
 * Hold each recognized `gh issue close` and `gh pr merge` action once per
 * session, so the agent reviews what that action needs saved. A plain retry of
 * the same command is then allowed, and the action stays allowed for the rest
 * of the session.
 *
 * A finished work item is the moment a specification goes stale, and it is the
 * moment nobody remembers to check. A specification that is never updated after
 * the work lands drifts away from the real system and then answers questions
 * wrong, quietly, for months.
 *
 * This hook only reminds. It never decides, writes, or approves anything.
 * Any unexpected failure allows the command.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CLOSES_WORK_ITEM,
  combinesReviewActions,
  effectiveDirectory,
  heldBefore,
  heldMessage,
  matchesAny,
  segmentsOf,
  SPLIT_REVIEW_ACTIONS,
} from "./command-parsing.mjs";

function failOpen() {
  process.exitCode = 0;
}

export function closesWorkItem(command) {
  return matchesAny(command, CLOSES_WORK_ITEM);
}

function git(projectRoot, args) {
  return execFileSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 3000,
  });
}

function repositoryRoot(projectRoot) {
  return git(projectRoot, ["rev-parse", "--show-toplevel"]).trim();
}

export function workItemActionKey(command, projectRoot) {
  const actions = [];
  for (const segment of segmentsOf(command)) {
    const type = CLOSES_WORK_ITEM[0].test(segment)
      ? "issue-close"
      : CLOSES_WORK_ITEM[1].test(segment)
        ? "pull-request-merge"
        : null;
    if (!type) continue;
    actions.push([type, segment]);
  }
  return JSON.stringify([
    "work-item-actions",
    projectRoot,
    actions.length ? actions : [["unknown", "unknown"]],
  ]);
}

export function buildMessage() {
  return [
    "Held. Finishing a work item is a save-review moment.",
    "",
    "Use knowledge-save to review what this work changed in a",
    "PRD or another owning record, and preserve pending work, then run",
    "this command again. If there is anything, knowledge/knowledge-manual.md shows how",
    "to display the proposal. A merge or closure alone proves no delivery or requirements approval.",
    "",
    "If you are a helper agent, stop and report this to the main agent.",
  ].join("\n");
}

/** The held close or merge commands in words, from the parts of their key. */
function actionLabel(key) {
  const [, , actions] = JSON.parse(key);
  return actions.map(([, segment]) => segment).join(", ");
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
  if (!closesWorkItem(command)) return failOpen();
  if (combinesReviewActions(command)) return deny(SPLIT_REVIEW_ACTIONS);

  const projectRoot = resolve(
    payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd(),
  );
  const workingDirectory = effectiveDirectory(command, projectRoot);
  const root = repositoryRoot(workingDirectory);
  const key = workItemActionKey(command, root);
  if (heldBefore(payload, key)) return failOpen();

  deny(heldMessage(buildMessage(), actionLabel(key)));
}

function canonical(path) { try { return realpathSync(path); } catch { return resolve(path); } }

if (process.argv[1] && canonical(process.argv[1]) === canonical(fileURLToPath(import.meta.url))) {
  try {
    main();
  } catch {
    failOpen();
  }
}

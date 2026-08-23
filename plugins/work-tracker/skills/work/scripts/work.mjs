#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  WorkError,
  assertAllowedFlags,
  findGitRoot,
  flagList,
  git,
  parseArgs,
  printResult,
  requiredFlag,
  stableJson,
} from "./lib/common.mjs";
import {
  addItem,
  finishItem,
  getStatus,
  initialize,
  landingStatus,
  linkItems,
  loadTracker,
  migrateLegacyTracker,
  nextItem,
  reconcileTracker,
  regenerate,
  requirementsStatus,
  startItem,
  unlinkItems,
  updateItem,
  updateRequirementsStatus,
  validateTracker,
} from "./lib/tracker.mjs";

const VERSION = "2.0.0";

export async function main(argv = process.argv.slice(2)) {
  const { positionals, flags } = parseArgs(argv);
  const command = positionals[0] ?? "help";
  const json = Boolean(flags.json);
  const repoRoot = findGitRoot(flags.cwd === true ? process.cwd() : flags.cwd ?? process.cwd());

  let result;
  switch (command) {
    case "help":
    case "--help":
    case "-h":
      result = helpText();
      break;
    case "version":
      result = { version: VERSION, text: VERSION };
      break;
    case "init":
      assertAllowedFlags(flags, ["cwd", "default-branch", "json"]);
      result = initialize(repoRoot, {
        defaultBranch: flags["default-branch"] === true ? undefined : flags["default-branch"],
      });
      break;
    case "migrate":
      assertAllowedFlags(flags, ["cwd", "from", "apply", "json"]);
      result = migrateLegacyTracker(repoRoot, {
        from: flags.from === true ? undefined : flags.from,
        apply: Boolean(flags.apply),
      });
      break;
    case "add": {
      assertAllowedFlags(flags, [
        "cwd",
        "title",
        "description",
        "purpose",
        "priority",
        "type",
        "next-step",
        "created-date",
        "id",
        "json",
      ]);
      const description = flags.description ?? flags.purpose;
      if (description === undefined || description === true || String(description).trim() === "") {
        throw new WorkError("Missing required option --description", "missing_option");
      }
      result = addItem(loadTracker(repoRoot), {
        id: flags.id,
        title: requiredFlag(flags, "title"),
        description: String(description),
        priority: flags.priority,
        type: flags.type,
        nextStep: requiredFlag(flags, "next-step"),
        createdDate: flags["created-date"],
      });
      break;
    }
    case "requirements": {
      assertAllowedFlags(flags, ["cwd", "finalize", "reopen", "approved-by", "json"]);
      const id = requiredPositional(positionals, 1, "work-item ID");
      const tracker = loadTracker(repoRoot);
      if (!flags.finalize && !flags.reopen) {
        result = requirementsStatus(tracker, id);
      } else {
        if (flags.finalize && flags.reopen) {
          throw new WorkError("Choose either --finalize or --reopen", "conflicting_options");
        }
        result = updateRequirementsStatus(tracker, id, {
          finalize: Boolean(flags.finalize),
          reopen: Boolean(flags.reopen),
          approvedBy: flags["approved-by"] === true ? undefined : flags["approved-by"],
        });
      }
      break;
    }
    case "status": {
      assertAllowedFlags(flags, ["cwd", "all", "json"]);
      result = getStatus(loadTracker(repoRoot), { all: Boolean(flags.all) });
      break;
    }
    case "next":
      assertAllowedFlags(flags, ["cwd", "json"]);
      result = nextItem(loadTracker(repoRoot));
      break;
    case "start": {
      assertAllowedFlags(flags, ["cwd", "branch", "next-step", "allow-shared-branch", "json"]);
      const id = requiredPositional(positionals, 1, "work-item ID");
      const branch =
        flags.branch === true || flags.branch === undefined
          ? currentBranch(repoRoot)
          : String(flags.branch);
      result = startItem(loadTracker(repoRoot), id, {
        branch,
        nextStep: flags["next-step"] === true ? undefined : flags["next-step"],
        allowSharedBranch: Boolean(flags["allow-shared-branch"]),
      });
      break;
    }
    case "update": {
      assertAllowedFlags(flags, [
        "cwd",
        "status",
        "next-step",
        "branch",
        "blocker",
        "blocker-item",
        "clear-blocker",
        "note",
        "allow-shared-branch",
        "json",
      ]);
      const id = requiredPositional(positionals, 1, "work-item ID");
      result = updateItem(loadTracker(repoRoot), id, {
        status: flags.status === true ? undefined : flags.status,
        nextStep: flags["next-step"] === true ? "" : flags["next-step"],
        branch: flags.branch === true ? "" : flags.branch,
        blockers: flagList(flags, "blocker").map(String),
        blockerItem: flags["blocker-item"] === true ? undefined : flags["blocker-item"],
        clearBlocker: flags["clear-blocker"] === true ? "all" : flags["clear-blocker"],
        note: flags.note === true ? undefined : flags.note,
        allowSharedBranch: Boolean(flags["allow-shared-branch"]),
      });
      break;
    }
    case "link": {
      assertAllowedFlags(flags, ["cwd", "type", "target", "remove", "json"]);
      const id = requiredPositional(positionals, 1, "source work-item ID");
      const type = requiredFlag(flags, "type");
      const target = requiredFlag(flags, "target");
      result = flags.remove
        ? unlinkItems(loadTracker(repoRoot), id, type, target)
        : linkItems(loadTracker(repoRoot), id, type, target);
      break;
    }
    case "finish": {
      assertAllowedFlags(flags, ["cwd", "commit", "pr", "next-step", "json"]);
      const id = requiredPositional(positionals, 1, "work-item ID");
      result = finishItem(loadTracker(repoRoot), id, {
        commit: flags.commit === true ? undefined : flags.commit,
        pullRequest: flags.pr === true ? undefined : flags.pr,
        nextStep: flags["next-step"] === true ? undefined : flags["next-step"],
      });
      break;
    }
    case "landed": {
      assertAllowedFlags(flags, ["cwd", "json"]);
      const id = requiredPositional(positionals, 1, "work-item ID");
      result = landingStatus(loadTracker(repoRoot), id);
      break;
    }
    case "dashboard": {
      assertAllowedFlags(flags, ["cwd", "json"]);
      const generated = regenerate(loadTracker(repoRoot));
      result = {
        outcome: "generated",
        ...generated,
        text: `Generated ${generated.dashboard}.`,
      };
      break;
    }
    case "validate": {
      assertAllowedFlags(flags, ["cwd", "json"]);
      result = validateTracker(loadTracker(repoRoot));
      printResult(result, json);
      return result.valid ? 0 : 2;
    }
    case "reconcile":
      assertAllowedFlags(flags, ["cwd", "json"]);
      result = reconcileTracker(loadTracker(repoRoot));
      break;
    default:
      throw new WorkError(`Unknown command "${command}". Run work help.`, "unknown_command");
  }
  printResult(result, json);
  return 0;
}

function requiredPositional(positionals, index, label) {
  const value = positionals[index];
  if (!value) throw new WorkError(`Missing ${label}`, "missing_argument");
  return value;
}

function currentBranch(repoRoot) {
  const result = git(repoRoot, ["branch", "--show-current"]);
  const branch = result.stdout.trim();
  if (!branch) {
    throw new WorkError("HEAD is detached. Pass --branch explicitly.", "detached_head");
  }
  return branch;
}

function helpText() {
  return `work-tracker ${VERSION}

Usage:
  work init [--default-branch main]
  work migrate [--from work-items] [--apply]
  work add --title TITLE --description DESCRIPTION --priority medium --type task --next-step STEP
  work requirements WI-001
  work requirements WI-001 --finalize --approved-by NAME
  work requirements WI-001 --reopen
  work status [--all] [--json]
  work next [--json]
  work start WI-001 [--branch BRANCH] [--next-step STEP]
  work update WI-001 [--status Ready] [--next-step STEP] [--blocker REASON] [--clear-blocker ID]
  work link WI-001 --type depends_on --target WI-002 [--remove]
  work finish WI-001 [--commit SHA] [--pr NUMBER_OR_URL]
  work landed WI-001
  work reconcile
  work validate [--json]
  work dashboard

Local files always live in .work-items and Git ignores that folder.
Statuses: Backlog, Ready, In Progress, In Review, Done, Cancelled.
Requirements statuses: refining, finalized.
Types: bug, enhancement, task.

All commands accept --cwd PATH and --json where shown.
`;
}

if (
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])
) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      const workError =
        error instanceof WorkError
          ? error
          : new WorkError(error?.stack || String(error), "unexpected_error");
      const json = process.argv.includes("--json");
      const payload = {
        outcome: "error",
        error: workError.code,
        message: workError.message,
        ...(workError.details ? { details: workError.details } : {}),
      };
      if (json) process.stderr.write(stableJson(payload));
      else process.stderr.write(`Error: ${workError.message}\n`);
      process.exitCode = 1;
    });
}

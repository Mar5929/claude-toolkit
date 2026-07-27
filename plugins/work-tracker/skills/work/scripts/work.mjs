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
  archiveItem,
  finishItem,
  getStatus,
  initialize,
  landingStatus,
  linkItems,
  loadTracker,
  nextItem,
  reconcileTracker,
  regenerate,
  startItem,
  unlinkItems,
  updateItem,
  validateTracker,
} from "./lib/tracker.mjs";
import {
  githubConnect,
  githubInfo,
  githubReconcile,
  githubSync,
} from "./lib/github.mjs";

const VERSION = "1.0.0";

export async function main(argv = process.argv.slice(2)) {
  const { positionals, flags } = parseArgs(argv);
  const command = positionals[0] ?? "help";
  const json = Boolean(flags.json);
  const repoRoot = findGitRoot(flags.cwd === true ? process.cwd() : flags.cwd ?? process.cwd());
  const trackerPath = flags.path === true ? undefined : flags.path;

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
      assertAllowedFlags(flags, ["cwd", "path", "default-branch", "json"]);
      result = initialize(repoRoot, {
        path: trackerPath,
        defaultBranch: flags["default-branch"] === true ? undefined : flags["default-branch"],
      });
      break;
    case "add": {
      assertAllowedFlags(flags, [
        "cwd",
        "path",
        "title",
        "purpose",
        "priority",
        "type",
        "next-step",
        "status",
        "created-at",
        "id",
        "github",
        "json",
      ]);
      const tracker = loadTracker(repoRoot, trackerPath);
      result = addItem(tracker, {
        id: flags.id,
        title: requiredFlag(flags, "title"),
        purpose: requiredFlag(flags, "purpose"),
        priority: flags.priority,
        type: flags.type,
        nextStep: requiredFlag(flags, "next-step"),
        status: flags.status,
        createdAt: flags["created-at"],
      });
      if (flags.github) {
        const refreshed = loadTracker(repoRoot, trackerPath);
        result.github = githubSync(refreshed, { ids: [result.item.id] });
        result.text += `\n${result.github.text}`;
      }
      break;
    }
    case "status": {
      assertAllowedFlags(flags, ["cwd", "path", "all", "json"]);
      const tracker = loadTracker(repoRoot, trackerPath);
      result = getStatus(tracker, { all: Boolean(flags.all) });
      break;
    }
    case "next": {
      assertAllowedFlags(flags, ["cwd", "path", "json"]);
      result = nextItem(loadTracker(repoRoot, trackerPath));
      break;
    }
    case "start": {
      assertAllowedFlags(flags, ["cwd", "path", "branch", "next-step", "allow-shared-branch", "github", "json"]);
      const id = requiredPositional(positionals, 1, "work-item ID");
      const branch =
        flags.branch === true || flags.branch === undefined
          ? currentBranch(repoRoot)
          : String(flags.branch);
      result = startItem(loadTracker(repoRoot, trackerPath), id, {
        branch,
        nextStep: flags["next-step"] === true ? undefined : flags["next-step"],
        allowSharedBranch: Boolean(flags["allow-shared-branch"]),
      });
      if (flags.github) {
        result.github = githubSync(loadTracker(repoRoot, trackerPath), { ids: [id] });
        result.text += `\n${result.github.text}`;
      }
      break;
    }
    case "update": {
      assertAllowedFlags(flags, [
        "cwd",
        "path",
        "status",
        "next-step",
        "branch",
        "blocker",
        "blocker-item",
        "clear-blocker",
        "note",
        "allow-shared-branch",
        "github",
        "json",
      ]);
      const id = requiredPositional(positionals, 1, "work-item ID");
      result = updateItem(loadTracker(repoRoot, trackerPath), id, {
        status: flags.status === true ? undefined : flags.status,
        nextStep: flags["next-step"] === true ? "" : flags["next-step"],
        branch: flags.branch === true ? "" : flags.branch,
        blockers: flagList(flags, "blocker").map(String),
        blockerItem: flags["blocker-item"] === true ? undefined : flags["blocker-item"],
        clearBlocker: flags["clear-blocker"] === true ? "all" : flags["clear-blocker"],
        note: flags.note === true ? undefined : flags.note,
        allowSharedBranch: Boolean(flags["allow-shared-branch"]),
      });
      if (flags.github) {
        result.github = githubSync(loadTracker(repoRoot, trackerPath), { ids: [id] });
        result.text += `\n${result.github.text}`;
      }
      break;
    }
    case "link": {
      assertAllowedFlags(flags, ["cwd", "path", "type", "target", "remove", "json"]);
      const id = requiredPositional(positionals, 1, "source work-item ID");
      const type = requiredFlag(flags, "type");
      const target = requiredFlag(flags, "target");
      result = flags.remove
        ? unlinkItems(loadTracker(repoRoot, trackerPath), id, type, target)
        : linkItems(loadTracker(repoRoot, trackerPath), id, type, target);
      break;
    }
    case "finish": {
      assertAllowedFlags(flags, ["cwd", "path", "commit", "pr", "next-step", "github", "json"]);
      const id = requiredPositional(positionals, 1, "work-item ID");
      result = finishItem(loadTracker(repoRoot, trackerPath), id, {
        commit: flags.commit === true ? undefined : flags.commit,
        pullRequest: flags.pr === true ? undefined : flags.pr,
        nextStep: flags["next-step"] === true ? undefined : flags["next-step"],
      });
      if (flags.github) {
        result.github = githubSync(loadTracker(repoRoot, trackerPath), { ids: [id] });
        result.text += `\n${result.github.text}`;
      }
      break;
    }
    case "landed": {
      assertAllowedFlags(flags, ["cwd", "path", "json"]);
      const id = requiredPositional(positionals, 1, "work-item ID");
      result = landingStatus(loadTracker(repoRoot, trackerPath), id);
      break;
    }
    case "archive": {
      assertAllowedFlags(flags, ["cwd", "path", "json"]);
      const id = requiredPositional(positionals, 1, "work-item ID");
      result = archiveItem(loadTracker(repoRoot, trackerPath), id);
      break;
    }
    case "dashboard": {
      assertAllowedFlags(flags, ["cwd", "path", "json"]);
      const tracker = loadTracker(repoRoot, trackerPath);
      const generated = regenerate(tracker);
      result = {
        outcome: "generated",
        ...generated,
        text: `Generated ${generated.dashboard} and ${generated.backlog}.`,
      };
      break;
    }
    case "validate": {
      assertAllowedFlags(flags, ["cwd", "path", "json"]);
      result = validateTracker(loadTracker(repoRoot, trackerPath));
      printResult(result, json);
      return result.valid ? 0 : 2;
    }
    case "reconcile": {
      assertAllowedFlags(flags, ["cwd", "path", "github", "json"]);
      const tracker = loadTracker(repoRoot, trackerPath);
      result = reconcileTracker(tracker);
      if (flags.github) {
        result.github = githubReconcile(tracker);
        result.text += `\n${result.github.text}`;
      }
      break;
    }
    case "github":
      result = githubCommand(repoRoot, trackerPath, positionals.slice(1), flags);
      break;
    default:
      throw new WorkError(`Unknown command "${command}". Run work help.`, "unknown_command");
  }
  printResult(result, json);
  return 0;
}

function githubCommand(repoRoot, trackerPath, positionals, flags) {
  const subcommand = positionals[0] ?? "status";
  const tracker = loadTracker(repoRoot, trackerPath);
  switch (subcommand) {
    case "connect":
      assertAllowedFlags(flags, [
        "cwd",
        "path",
        "create",
        "project-number",
        "owner",
        "repo",
        "title",
        "configure-status",
        "no-link",
        "json",
      ]);
      return githubConnect(tracker, {
        create: Boolean(flags.create),
        projectNumber:
          flags["project-number"] === true || flags["project-number"] === undefined
            ? undefined
            : Number(flags["project-number"]),
        owner: flags.owner === true ? undefined : flags.owner,
        repository: flags.repo === true ? undefined : flags.repo,
        title: flags.title === true ? undefined : flags.title,
        configureStatus: Boolean(flags["configure-status"]),
        linkRepository: !flags["no-link"],
      });
    case "sync": {
      assertAllowedFlags(flags, ["cwd", "path", "all", "json"]);
      const ids = flags.all ? [] : positionals.slice(1);
      return githubSync(tracker, { ids });
    }
    case "reconcile":
      assertAllowedFlags(flags, ["cwd", "path", "json"]);
      return githubReconcile(tracker);
    case "status":
      assertAllowedFlags(flags, ["cwd", "path", "json"]);
      return githubInfo(tracker);
    default:
      throw new WorkError(`Unknown github command "${subcommand}"`, "unknown_command");
  }
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
  work init [--path work-items] [--default-branch main]
  work add --title TITLE --purpose PURPOSE --priority medium --type task --next-step STEP [--github]
  work status [--all] [--json]
  work next [--json]
  work start WI-001 [--branch BRANCH] [--next-step STEP] [--github]
  work update WI-001 [--status Ready] [--next-step STEP] [--blocker REASON] [--clear-blocker ID] [--github]
  work link WI-001 --type depends_on --target WI-002 [--remove]
  work finish WI-001 [--commit SHA] [--pr NUMBER_OR_URL] [--github]
  work landed WI-001
  work archive WI-001
  work reconcile [--github]
  work validate [--json]
  work dashboard
  work github connect (--create | --project-number N) [--owner OWNER] [--repo OWNER/REPO]
  work github sync [WI-001 ... | --all]
  work github reconcile
  work github status

Statuses: Backlog, Ready, In Progress, In Review, Done, Cancelled.
Types: bug, enhancement, task.

All commands accept --cwd PATH, --path WORK_ITEMS_PATH, and --json where shown.
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

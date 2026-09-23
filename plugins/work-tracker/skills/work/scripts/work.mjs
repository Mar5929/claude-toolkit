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
  editItemDocument,
  recoverTracker,
  addRoadmapStage,
  addTask,
  activeItem,
  archiveItem,
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
  roadmapStatus,
  requirementsStatus,
  startItem,
  selectTask,
  taskStatus,
  unarchiveItem,
  unlinkItems,
  updateItem,
  updateRoadmapStage,
  updateRequirementsStatus,
  updateTask,
  validateTracker,
  completeTask,
} from "./lib/tracker.mjs";

const VERSION = "2.8.0";

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
    case "recover":
      assertAllowedFlags(flags, ["cwd", "json"]);
      result = recoverTracker(repoRoot);
      break;
    case "edit":
      assertAllowedFlags(flags, ["cwd", "input", "expected-hash", "json"]);
      result = editItemDocument(loadTracker(repoRoot), positionals[1], {
        inputPath: path.resolve(requiredFlag(flags, "input")),
        expectedHash: requiredFlag(flags, "expected-hash"),
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
        "group",
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
        group: flags.group === true ? undefined : flags.group,
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
    case "roadmap": {
      const action = positionals[1] ?? "show";
      if (action === "show") {
        assertAllowedFlags(flags, ["cwd", "json"]);
        result = roadmapStatus(loadTracker(repoRoot), requiredPositional(positionals, 2, "work-item ID"));
      } else if (action === "add") {
        assertAllowedFlags(flags, ["cwd", "title", "outcome", "acceptance", "lifecycle-stage", "child-item", "draft", "json"]);
        result = addRoadmapStage(loadTracker(repoRoot), requiredPositional(positionals, 2, "work-item ID"), {
          title: requiredFlag(flags, "title"),
          outcome: requiredFlag(flags, "outcome"),
          acceptance: requiredFlag(flags, "acceptance"),
          lifecycleStage: flags["lifecycle-stage"] === true ? undefined : flags["lifecycle-stage"],
          childItems: flagList(flags, "child-item").map(String),
          draft: Boolean(flags.draft),
        });
      } else if (action === "update") {
        assertAllowedFlags(flags, ["cwd", "title", "outcome", "acceptance", "lifecycle-stage", "child-item", "clear-child-items", "draft", "planned", "json"]);
        if (flags.draft && flags.planned) throw new WorkError("Choose either --draft or --planned", "conflicting_options");
        const childItems = flags["clear-child-items"]
          ? []
          : Object.hasOwn(flags, "child-item") ? flagList(flags, "child-item").map(String) : undefined;
        result = updateRoadmapStage(
          loadTracker(repoRoot),
          requiredPositional(positionals, 2, "work-item ID"),
          requiredPositional(positionals, 3, "roadmap stage ID"),
          {
            title: flags.title === true ? undefined : flags.title,
            outcome: flags.outcome === true ? undefined : flags.outcome,
            acceptance: flags.acceptance === true ? undefined : flags.acceptance,
            lifecycleStage: flags["lifecycle-stage"] === true ? "" : flags["lifecycle-stage"],
            childItems,
            draft: Boolean(flags.draft),
            planned: Boolean(flags.planned),
          },
        );
      } else throw new WorkError("Usage: work roadmap show|add|update ...", "invalid_roadmap_command");
      break;
    }
    case "task": {
      const action = positionals[1] ?? "show";
      const commonTaskFlags = ["cwd", "json"];
      if (action === "show") {
        assertAllowedFlags(flags, commonTaskFlags);
        result = taskStatus(
          loadTracker(repoRoot),
          requiredPositional(positionals, 2, "work-item ID"),
          positionals[3],
        );
      } else if (action === "add") {
        assertAllowedFlags(flags, [
          ...commonTaskFlags, "id", "roadmap-stage", "stage-title", "stage-outcome", "stage-acceptance", "lifecycle-stage",
          "title", "objective", "instructions", "constraint", "input", "deliverable", "acceptance", "depends-on",
          "position", "next-action", "approval-required",
        ]);
        result = addTask(loadTracker(repoRoot), requiredPositional(positionals, 2, "work-item ID"), {
          taskId: flags.id === true ? undefined : flags.id,
          roadmapStage: flags["roadmap-stage"] === true ? undefined : flags["roadmap-stage"],
          stageTitle: flags["stage-title"] === true ? undefined : flags["stage-title"],
          stageOutcome: flags["stage-outcome"] === true ? undefined : flags["stage-outcome"],
          stageAcceptance: flags["stage-acceptance"] === true ? undefined : flags["stage-acceptance"],
          lifecycleStage: flags["lifecycle-stage"] === true ? undefined : flags["lifecycle-stage"],
          title: requiredFlag(flags, "title"),
          objective: requiredFlag(flags, "objective"),
          instructions: requiredFlag(flags, "instructions"),
          constraints: flagList(flags, "constraint").map(String),
          inputs: flagList(flags, "input").map(String),
          deliverable: requiredFlag(flags, "deliverable"),
          acceptance: requiredFlag(flags, "acceptance"),
          dependencies: flagList(flags, "depends-on").map(String),
          position: flags.position === true ? undefined : flags.position,
          nextAction: requiredFlag(flags, "next-action"),
          approvalRequired: Boolean(flags["approval-required"]),
        });
      } else if (action === "update") {
        assertAllowedFlags(flags, [
          ...commonTaskFlags, "roadmap-stage", "title", "objective", "instructions", "constraint", "clear-constraints",
          "input", "clear-inputs", "deliverable", "acceptance", "depends-on", "clear-dependencies", "position",
          "next-action", "status", "approval-required", "no-approval-required",
        ]);
        const exactList = (key, clearKey) => flags[clearKey]
          ? []
          : Object.hasOwn(flags, key) ? flagList(flags, key).map(String) : undefined;
        result = updateTask(
          loadTracker(repoRoot),
          requiredPositional(positionals, 2, "work-item ID"),
          requiredPositional(positionals, 3, "task ID"),
          {
            roadmapStage: flags["roadmap-stage"] === true ? undefined : flags["roadmap-stage"],
            title: flags.title === true ? undefined : flags.title,
            objective: flags.objective === true ? undefined : flags.objective,
            instructions: flags.instructions === true ? undefined : flags.instructions,
            constraints: exactList("constraint", "clear-constraints"),
            inputs: exactList("input", "clear-inputs"),
            deliverable: flags.deliverable === true ? undefined : flags.deliverable,
            acceptance: flags.acceptance === true ? undefined : flags.acceptance,
            dependencies: exactList("depends-on", "clear-dependencies"),
            position: flags.position === true ? undefined : flags.position,
            nextAction: flags["next-action"] === true ? undefined : flags["next-action"],
            status: flags.status === true ? undefined : flags.status,
            approvalRequired: flags["approval-required"] ? true : flags["no-approval-required"] ? false : undefined,
          },
        );
      } else if (action === "select") {
        assertAllowedFlags(flags, commonTaskFlags);
        result = selectTask(
          loadTracker(repoRoot),
          requiredPositional(positionals, 2, "work-item ID"),
          requiredPositional(positionals, 3, "task ID"),
        );
      } else if (action === "complete") {
        assertAllowedFlags(flags, [...commonTaskFlags, "evidence", "approved-by", "approved-date"]);
        result = completeTask(
          loadTracker(repoRoot),
          requiredPositional(positionals, 2, "work-item ID"),
          requiredPositional(positionals, 3, "task ID"),
          {
            evidence: requiredFlag(flags, "evidence"),
            approvedBy: flags["approved-by"] === true ? undefined : flags["approved-by"],
            approvedDate: flags["approved-date"] === true ? undefined : flags["approved-date"],
          },
        );
      } else throw new WorkError("Usage: work task show|add|update|select|complete ...", "invalid_task_command");
      break;
    }
    case "active": {
      assertAllowedFlags(flags, ["cwd", "replace", "json"]);
      const action = positionals[1];
      if (!action) result = activeItem(loadTracker(repoRoot));
      else if (action === "clear") {
        if (positionals[2]) throw new WorkError("work active clear takes no work-item ID", "unexpected_argument");
        result = activeItem(loadTracker(repoRoot), { clear: true });
      } else if (action === "set") {
        result = activeItem(loadTracker(repoRoot), { set: requiredPositional(positionals, 2, "work-item ID"), replace: Boolean(flags.replace) });
      } else throw new WorkError("Usage: work active [set ID [--replace]|clear]", "invalid_active_command");
      break;
    }
    case "status": {
      assertAllowedFlags(flags, ["cwd", "all", "archived", "json"]);
      result = getStatus(loadTracker(repoRoot), {
        all: Boolean(flags.all),
        archived: Boolean(flags.archived),
      });
      break;
    }
    case "archive": {
      assertAllowedFlags(flags, ["cwd", "json"]);
      const id = requiredPositional(positionals, 1, "work-item ID");
      result = archiveItem(loadTracker(repoRoot), id);
      break;
    }
    case "unarchive": {
      assertAllowedFlags(flags, ["cwd", "json"]);
      const id = requiredPositional(positionals, 1, "work-item ID");
      result = unarchiveItem(loadTracker(repoRoot), id);
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
        "stage",
        "status",
        "next-step",
        "branch",
        "type",
        "blocker",
        "blocker-item",
        "clear-blocker",
        "note",
        "allow-shared-branch",
        "json",
      ]);
      const id = requiredPositional(positionals, 1, "work-item ID");
      result = updateItem(loadTracker(repoRoot), id, {
        stage: flags.stage === true ? undefined : flags.stage,
        status: flags.status === true ? undefined : flags.status,
        nextStep: flags["next-step"] === true ? "" : flags["next-step"],
        branch: flags.branch === true ? "" : flags.branch,
        type: flags.type === true ? undefined : flags.type,
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
      assertAllowedFlags(flags, ["cwd", "evidence", "approved-by", "approved-date", "commit", "pr", "next-step", "json"]);
      const id = requiredPositional(positionals, 1, "work-item ID");
      result = finishItem(loadTracker(repoRoot), id, {
        commit: flags.commit === true ? undefined : flags.commit,
        pullRequest: flags.pr === true ? undefined : flags.pr,
        nextStep: flags["next-step"] === true ? undefined : flags["next-step"],
        evidence: flags.evidence === true ? undefined : flags.evidence,
        approvedBy: flags["approved-by"] === true ? undefined : flags["approved-by"],
        approvedDate: flags["approved-date"] === true ? undefined : flags["approved-date"],
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
    [--group FOLDER]
  work edit WI-001 --input FILE --expected-hash SHA256
  work recover
  work requirements WI-001
  work requirements WI-001 --finalize --approved-by NAME
  work requirements WI-001 --reopen
  work roadmap show WI-001
  work roadmap add WI-001 --title TITLE --outcome OUTCOME --acceptance CONDITION --child-item WI-002
  work roadmap update WI-001 STAGE-001 [--title TITLE] [--child-item WI-002]
  work task show WI-001 [TASK-001]
  work task add WI-001 --stage-title TITLE --stage-outcome OUTCOME --stage-acceptance CONDITION
    --title TITLE --objective OBJECTIVE --instructions INSTRUCTIONS [--constraint TEXT] [--input PATH_OR_URL]
    --deliverable DELIVERABLE --acceptance CONDITION --next-action ACTION [--approval-required]
  work task add WI-001 --roadmap-stage STAGE-001 ...
  work task update WI-001 TASK-001 [--position POSITION] [--next-action ACTION] [--status STATUS]
  work task select WI-001 TASK-001
  work task complete WI-001 TASK-001 --evidence TEXT [--approved-by NAME] [--approved-date YYYY-MM-DD]
  work active [set WI-001 [--replace]|clear]
  work status [--all] [--archived] [--json]
  work next [--json]
  work start WI-001 [--branch BRANCH] [--next-step STEP]
  work update WI-001 [--stage 08] [--type build] [--note WHAT_HAPPENED] [--status Ready] [--next-step STEP]
    [--blocker REASON] [--clear-blocker ID]
  work link WI-001 --type depends_on --target WI-002 [--remove]
  work finish WI-001 --evidence TEXT [--approved-by NAME] [--approved-date YYYY-MM-DD] [--commit SHA] [--pr NUMBER_OR_URL]
  work landed WI-001
  work archive WI-001
  work unarchive WI-001
  work reconcile
  work validate [--json]
  work dashboard

Local files always live in .work-items and Git ignores that folder.
Every folder in there is searched for work items, at any depth. That includes
work-item folders, so a work item may hold other work items: the parent keeps
its own status and requirements and is listed alongside them. There is no epic
type.
Items inside .work-items/archive are archived, however deep. Moving the folder
by hand does the same thing as the archive command, for grouping and archiving
alike, and archiving a folder archives everything inside it. Archived items are
hidden from status, next, and the dashboard, and their ID numbers are never
reused.
Statuses: Backlog, Ready, In Progress, In Review, Done, Cancelled.
Roadmap stages use owner-defined titles and stay separate from lifecycle stages.
Each roadmap stage has one or more tasks, linked child work items, or both.
Task statuses: Pending, In Progress, Blocked, Complete, Cancelled.
Stages: 01-discovery, 02-refinement, 03-requirements-approved, 04-solution-design,
05-breakdown, 06-implementation-plan, 07-tracking-setup, 08-build, 09-testing,
10-bug-fixing, 11-user-approval, 12-pr-and-push, 13-deployment, 14-spec-update.
--stage takes a number, a name, or both. It sets the stage, derives the status,
and appends a dated line to Recent History (legacy: STATUS.md Progress log). An item with no stage
is normal. The work skill's references/lifecycle.md decides which stage is correct; nothing here does.
Requirements statuses: refining, finalized.
Types: discovery, solution-design, build, data-load, repository-maintenance, research, task, or a custom lower-case kebab-case type. Only build and data-load require finalized requirements in code.

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

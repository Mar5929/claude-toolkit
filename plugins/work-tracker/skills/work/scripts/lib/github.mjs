import path from "node:path";
import {
  WorkError,
  atomicWriteJson,
  isoTimestamp,
  run,
  toPosix,
  withLock,
} from "./common.mjs";
import {
  STATUSES,
  loadTracker,
  regenerate,
} from "./tracker.mjs";

const STATUS_OPTIONS = [
  { name: "Backlog", color: "GRAY", description: "Captured but not yet ready to start." },
  { name: "Ready", color: "BLUE", description: "Actionable and ready to be selected." },
  { name: "In Progress", color: "YELLOW", description: "Actively being implemented." },
  { name: "In Review", color: "ORANGE", description: "Awaiting review or landing." },
  { name: "Done", color: "GREEN", description: "Verified as completed and landed." },
  { name: "Cancelled", color: "RED", description: "Intentionally stopped or declined." },
];

const LABELS = {
  bug: { color: "d73a4a", description: "Something is not working" },
  enhancement: { color: "a2eeef", description: "New feature or improvement" },
  task: { color: "7057ff", description: "Implementation or maintenance task" },
};

export function githubConnect(tracker, input) {
  const gh = ghBinary();
  ensureGhAuth(gh, tracker.paths.repoRoot);
  const repository = input.repository ?? detectRepository(tracker.paths.repoRoot);
  const [repoOwner] = repository.split("/");
  const owner = input.owner ?? repoOwner;
  let project;
  let created = false;

  if (input.create) {
    const title = input.title ?? `${repository.split("/")[1]} work`;
    project = ghJson(
      gh,
      ["project", "create", "--owner", owner, "--title", title, "--format", "json"],
      tracker.paths.repoRoot,
    );
    created = true;
    ghRun(
      gh,
      ["project", "link", String(project.number), "--owner", owner, "--repo", repository],
      tracker.paths.repoRoot,
    );
  } else {
    if (!input.projectNumber) {
      throw new WorkError(
        "Choose --create or provide --project-number when connecting GitHub Projects.",
        "missing_project",
      );
    }
    project = ghJson(
      gh,
      ["project", "view", String(input.projectNumber), "--owner", owner, "--format", "json"],
      tracker.paths.repoRoot,
    );
    if (input.linkRepository !== false) {
      ghRun(
        gh,
        ["project", "link", String(project.number ?? input.projectNumber), "--owner", owner, "--repo", repository],
        tracker.paths.repoRoot,
        { allowAlreadyLinked: true },
      );
    }
  }

  const projectNumber = Number(project.number ?? input.projectNumber);
  let fields = listFields(gh, tracker.paths.repoRoot, owner, projectNumber);
  let statusField = fields.find((field) => field.name === "Status");
  if (!statusField) {
    throw new WorkError(
      "The GitHub Project has no Status field. Add one in GitHub, then reconnect.",
      "missing_status_field",
    );
  }
  const currentNames = optionNames(statusField);
  const exact = sameSet(currentNames, STATUSES);
  if (!exact) {
    if (!created && !input.configureStatus) {
      throw new WorkError(
        `The existing Project Status options are ${currentNames.join(", ") || "empty"}. Re-run with --configure-status to replace them with ${STATUSES.join(", ")}.`,
        "status_configuration_required",
      );
    }
    configureStatusField(gh, tracker.paths.repoRoot, statusField);
    fields = listFields(gh, tracker.paths.repoRoot, owner, projectNumber);
    statusField = fields.find((field) => field.name === "Status");
  }
  const statusOptions = Object.fromEntries(
    (statusField.options ?? []).map((option) => [option.name, option.id]),
  );
  const missingStatuses = STATUSES.filter((status) => !statusOptions[status]);
  if (missingStatuses.length) {
    throw new WorkError(
      `GitHub did not return IDs for status options: ${missingStatuses.join(", ")}`,
      "status_configuration_failed",
    );
  }
  ensureLabels(gh, tracker.paths.repoRoot, repository);

  const updatedConfig = structuredClone(tracker.config);
  updatedConfig.github = {
    authority: "git",
    sync_direction: "git_to_github",
    repository,
    owner,
    project_number: projectNumber,
    project_id: project.id,
    project_url: project.url,
    status_field_id: statusField.id,
    status_options: statusOptions,
    labels: Object.keys(LABELS),
  };
  withLock(tracker.paths.lockPath, () => atomicWriteJson(tracker.paths.configPath, updatedConfig));
  return {
    outcome: created ? "created_and_connected" : "connected",
    github: updatedConfig.github,
    text: `${created ? "Created" : "Connected"} GitHub Project ${projectNumber} for ${repository}. Statuses and bug/enhancement/task labels are ready. Git remains authoritative.`,
  };
}

export function githubSync(tracker, input = {}) {
  const config = requireGithubConfig(tracker.config);
  const gh = ghBinary();
  ensureGhAuth(gh, tracker.paths.repoRoot);
  const selected = selectItems(tracker, input.ids);
  const results = [];

  for (const original of selected) {
    let record = structuredClone(original.record);
    let issueNumber = record.github.issue_number;
    let issueUrl = record.github.issue_url;
    const body = issueBody(original, tracker.paths.repoRoot);
    if (!issueNumber) {
      const createdUrl = ghRun(
        gh,
        [
          "issue",
          "create",
          "--repo",
          config.repository,
          "--title",
          `[${original.id}] ${record.title}`,
          "--body-file",
          "-",
          "--label",
          record.type,
        ],
        tracker.paths.repoRoot,
        { input: body },
      ).stdout.trim();
      issueUrl = createdUrl.split(/\r?\n/).find((line) => /^https:\/\//.test(line.trim()))?.trim() ?? createdUrl;
      issueNumber = issueNumberFromUrl(issueUrl);
      if (!issueNumber) {
        throw new WorkError(`Could not determine issue number from gh output: ${createdUrl}`, "github_issue_parse");
      }
    } else {
      syncIssue(gh, tracker.paths.repoRoot, config.repository, issueNumber, original, body);
    }

    let projectItemId = record.github.project_item_id;
    if (!projectItemId) {
      const added = ghJson(
        gh,
        [
          "project",
          "item-add",
          String(config.project_number),
          "--owner",
          config.owner,
          "--url",
          issueUrl,
          "--format",
          "json",
        ],
        tracker.paths.repoRoot,
      );
      projectItemId = added.id;
      if (!projectItemId) {
        projectItemId = findProjectItemId(gh, tracker.paths.repoRoot, config, issueNumber);
      }
    }
    const statusOption = config.status_options[record.status];
    if (!statusOption) {
      throw new WorkError(`GitHub status option is not configured for ${record.status}`, "missing_status_option");
    }
    ghRun(
      gh,
      [
        "project",
        "item-edit",
        "--id",
        projectItemId,
        "--project-id",
        config.project_id,
        "--field-id",
        config.status_field_id,
        "--single-select-option-id",
        statusOption,
      ],
      tracker.paths.repoRoot,
    );
    syncIssueState(gh, tracker.paths.repoRoot, config.repository, issueNumber, record.status);

    const githubMetadata = {
      issue_number: issueNumber,
      issue_url: issueUrl,
      project_item_id: projectItemId,
      last_synced_at: isoTimestamp(),
    };
    writeGithubRecord(tracker, original.id, githubMetadata);
    results.push({
      id: original.id,
      issue_number: issueNumber,
      issue_url: issueUrl,
      project_item_id: projectItemId,
      status: record.status,
    });
  }
  const refreshed = loadTracker(
    tracker.paths.repoRoot,
    path.relative(tracker.paths.repoRoot, tracker.paths.workRoot),
  );
  regenerate(refreshed);
  return {
    outcome: "synced",
    synced: results,
    text: `Synchronized ${results.length} work item(s) to GitHub Project ${config.project_number}.`,
  };
}

export function githubReconcile(tracker) {
  const config = requireGithubConfig(tracker.config);
  const gh = ghBinary();
  ensureGhAuth(gh, tracker.paths.repoRoot);
  const listing = ghJson(
    gh,
    [
      "project",
      "item-list",
      String(config.project_number),
      "--owner",
      config.owner,
      "--limit",
      "1000",
      "--format",
      "json",
    ],
    tracker.paths.repoRoot,
  );
  const projectItems = listing.items ?? listing;
  const findings = [];
  for (const item of tracker.items) {
    if (!item.record.github.issue_number) {
      findings.push({
        item: item.id,
        code: "github_missing_issue",
        message: `${item.id} has no linked GitHub issue.`,
        repair: `Run work github sync ${item.id}.`,
      });
      continue;
    }
    const remote = projectItems.find(
      (candidate) =>
        Number(candidate.content?.number ?? candidate.number) === Number(item.record.github.issue_number),
    );
    if (!remote) {
      findings.push({
        item: item.id,
        code: "github_missing_project_item",
        message: `${item.id} issue #${item.record.github.issue_number} is not in Project ${config.project_number}.`,
        repair: `Clear the stale project_item_id and run work github sync ${item.id}.`,
      });
      continue;
    }
    const remoteStatus = remote.status ?? remote["Status"] ?? fieldValue(remote, "Status");
    if (remoteStatus && remoteStatus !== item.record.status) {
      findings.push({
        item: item.id,
        code: "github_status_drift",
        message: `${item.id} is ${item.record.status} in Git but ${remoteStatus} in GitHub.`,
        repair: `Run work github sync ${item.id} to restore the Git-authoritative status, or explicitly update the local ticket first.`,
      });
    }
    const labels = (remote.content?.labels ?? remote.labels ?? []).map((label) =>
      typeof label === "string" ? label : label.name,
    );
    if (labels.length && !labels.includes(item.record.type)) {
      findings.push({
        item: item.id,
        code: "github_label_drift",
        message: `${item.id} expects label ${item.record.type}, but GitHub has ${labels.join(", ") || "none"}.`,
        repair: `Run work github sync ${item.id}.`,
      });
    }
    const pullRequest = item.record.git.pull_request;
    const pullRequestNumber =
      typeof pullRequest === "object" ? pullRequest?.number : Number(pullRequest);
    if (pullRequestNumber) {
      const pr = ghJson(
        gh,
        [
          "pr",
          "view",
          String(pullRequestNumber),
          "--repo",
          config.repository,
          "--json",
          "state,mergedAt,mergeCommit,url,headRefName",
        ],
        tracker.paths.repoRoot,
      );
      if (
        pr.state === "MERGED" &&
        ["In Progress", "In Review"].includes(item.record.status)
      ) {
        findings.push({
          item: item.id,
          code: "github_pr_merged_but_active",
          message: `${item.id} is ${item.record.status}, but pull request #${pullRequestNumber} merged${pr.mergeCommit?.oid ? ` at ${pr.mergeCommit.oid.slice(0, 12)}` : ""}.`,
          repair: `Fetch ${tracker.config.default_branch}, then run work finish ${item.id}${pr.mergeCommit?.oid ? ` --commit ${pr.mergeCommit.oid}` : ""}.`,
        });
      }
    }
  }
  return {
    outcome: findings.length ? "findings" : "clean",
    findings,
    text: findings.length
      ? `GitHub reconciliation found ${findings.length} issue(s):\n${findings.map((finding) => `- ${finding.message} Repair: ${finding.repair}`).join("\n")}`
      : "GitHub issues and Project statuses match the Git-authoritative tracker.",
  };
}

export function githubInfo(tracker) {
  const config = requireGithubConfig(tracker.config);
  return {
    outcome: "connected",
    github: config,
    text: `GitHub Project ${config.project_number} (${config.project_url}) mirrors ${config.repository}. Git is authoritative.`,
  };
}

function ghBinary() {
  return process.env.WORK_TRACKER_GH || "gh";
}

function ghRun(gh, args, cwd, options = {}) {
  const result = run(gh, args, {
    cwd,
    input: options.input,
    allowFailure: options.allowAlreadyLinked,
  });
  if (
    options.allowAlreadyLinked &&
    result.status !== 0 &&
    !/already linked|already exists/i.test(`${result.stderr}\n${result.stdout}`)
  ) {
    throw new WorkError(
      `gh ${args.join(" ")} failed: ${(result.stderr || result.stdout).trim()}`,
      "github_command_failed",
    );
  }
  return result;
}

function ghJson(gh, args, cwd) {
  const result = ghRun(gh, args, cwd);
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new WorkError(`GitHub CLI returned invalid JSON: ${error.message}`, "github_invalid_json");
  }
}

function ghGraphql(gh, cwd, query, variables) {
  return ghJsonInput(gh, ["api", "graphql", "--input", "-"], cwd, { query, variables });
}

function ghJsonInput(gh, args, cwd, input) {
  const result = ghRun(gh, args, cwd, { input: JSON.stringify(input) });
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new WorkError(`GitHub API returned invalid JSON: ${error.message}`, "github_invalid_json");
  }
}

function ensureGhAuth(gh, cwd) {
  const result = run(gh, ["auth", "status"], { cwd, allowFailure: true });
  if (result.status !== 0) {
    throw new WorkError(
      "GitHub CLI is not authenticated. Run `gh auth login`, then `gh auth refresh -s project`.",
      "github_auth_required",
    );
  }
}

function detectRepository(repoRoot) {
  const result = run("git", ["-C", repoRoot, "remote", "get-url", "origin"]);
  const url = result.stdout.trim();
  const https = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!https) {
    throw new WorkError(
      "Could not infer owner/repository from origin. Pass --repo owner/name.",
      "github_repo_required",
    );
  }
  return `${https[1]}/${https[2].replace(/\.git$/, "")}`;
}

function listFields(gh, cwd, owner, projectNumber) {
  const result = ghJson(
    gh,
    [
      "project",
      "field-list",
      String(projectNumber),
      "--owner",
      owner,
      "--limit",
      "100",
      "--format",
      "json",
    ],
    cwd,
  );
  return result.fields ?? result;
}

function configureStatusField(gh, cwd, field) {
  const existing = new Map((field.options ?? []).map((option) => [option.name, option]));
  const singleSelectOptions = STATUS_OPTIONS.map((option) => ({
    ...option,
    ...(existing.get(option.name)?.id ? { id: existing.get(option.name).id } : {}),
  }));
  const mutation = `mutation ConfigureStatus($input: UpdateProjectV2FieldInput!) {
    updateProjectV2Field(input: $input) {
      projectV2Field {
        ... on ProjectV2SingleSelectField {
          id
          name
          options { id name }
        }
      }
    }
  }`;
  ghGraphql(gh, cwd, mutation, {
    input: { fieldId: field.id, singleSelectOptions },
  });
}

function optionNames(field) {
  return (field.options ?? []).map((option) => option.name);
}

function sameSet(left, right) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function ensureLabels(gh, cwd, repository) {
  const result = ghJson(
    gh,
    ["label", "list", "--repo", repository, "--limit", "1000", "--json", "name"],
    cwd,
  );
  const existing = new Set(result.map((label) => label.name));
  for (const [name, details] of Object.entries(LABELS)) {
    if (existing.has(name)) continue;
    ghRun(
      gh,
      [
        "label",
        "create",
        name,
        "--repo",
        repository,
        "--color",
        details.color,
        "--description",
        details.description,
      ],
      cwd,
    );
  }
}

function requireGithubConfig(config) {
  if (!config.github) {
    throw new WorkError(
      "GitHub Projects is not connected. Run work github connect --create, or provide --project-number.",
      "github_not_connected",
    );
  }
  return config.github;
}

function selectItems(tracker, ids) {
  if (!ids || ids.length === 0 || ids.includes("--all")) return tracker.items;
  return ids.map((id) => {
    const normalized = String(id).toUpperCase();
    const matches = tracker.items.filter((item) => item.id === normalized);
    if (matches.length !== 1) {
      throw new WorkError(`Work item ${normalized} does not exist or is duplicated`, "missing_item");
    }
    return matches[0];
  });
}

function issueBody(item, repoRoot) {
  const record = item.record;
  const blockers = record.blockers.length
    ? record.blockers.map((blocker) => `- ${blocker.reason}`).join("\n")
    : "- None";
  const relations = Object.entries(record.relationships)
    .filter(([, targets]) => targets.length)
    .map(([type, targets]) => `- ${type}: ${targets.join(", ")}`)
    .join("\n") || "- None";
  return `<!-- work-tracker:${item.id} -->
# ${item.id}: ${record.title}

This issue mirrors the Git-authoritative work item at:
\`${toPosix(path.relative(repoRoot, item.path))}\`

## Purpose

See the repository \`SPEC.md\` for the authoritative specification.

## Current handoff

- Status: ${record.status}
- Priority: ${record.priority}
- Type: ${record.type}
- Exact next step: ${record.next_step || "None"}
- Branch: ${record.git.branch ?? "Not recorded"}
- Pull request: ${formatPr(record.git.pull_request)}

## Blockers

${blockers}

## Relationships

${relations}

Do not treat this issue body as a second source of truth. Use the \`work\`
commands to update the repository record and synchronize it here.
`;
}

function syncIssue(gh, cwd, repository, number, item, body) {
  const current = ghJson(
    gh,
    ["issue", "view", String(number), "--repo", repository, "--json", "labels,state,url"],
    cwd,
  );
  const labels = new Set((current.labels ?? []).map((label) => label.name));
  const args = [
    "issue",
    "edit",
    String(number),
    "--repo",
    repository,
    "--title",
    `[${item.id}] ${item.record.title}`,
    "--body-file",
    "-",
  ];
  if (!labels.has(item.record.type)) args.push("--add-label", item.record.type);
  const remove = Object.keys(LABELS).filter((label) => label !== item.record.type && labels.has(label));
  if (remove.length) args.push("--remove-label", remove.join(","));
  ghRun(gh, args, cwd, { input: body });
}

function syncIssueState(gh, cwd, repository, number, status) {
  const current = ghJson(
    gh,
    ["issue", "view", String(number), "--repo", repository, "--json", "state"],
    cwd,
  );
  if (status === "Done" && current.state !== "CLOSED") {
    ghRun(gh, ["issue", "close", String(number), "--repo", repository, "--reason", "completed"], cwd);
  } else if (status === "Cancelled" && current.state !== "CLOSED") {
    ghRun(gh, ["issue", "close", String(number), "--repo", repository, "--reason", "not planned"], cwd);
  } else if (!["Done", "Cancelled"].includes(status) && current.state === "CLOSED") {
    ghRun(gh, ["issue", "reopen", String(number), "--repo", repository], cwd);
  }
}

function findProjectItemId(gh, cwd, config, issueNumber) {
  const result = ghJson(
    gh,
    [
      "project",
      "item-list",
      String(config.project_number),
      "--owner",
      config.owner,
      "--limit",
      "1000",
      "--format",
      "json",
    ],
    cwd,
  );
  const found = (result.items ?? result).find(
    (item) => Number(item.content?.number ?? item.number) === Number(issueNumber),
  );
  if (!found?.id) {
    throw new WorkError(`Could not find issue #${issueNumber} in GitHub Project`, "github_project_item_missing");
  }
  return found.id;
}

function issueNumberFromUrl(url) {
  const match = String(url).match(/\/issues\/(\d+)(?:$|[?#])/);
  return match ? Number(match[1]) : null;
}

function writeGithubRecord(tracker, id, githubMetadata) {
  withLock(tracker.paths.lockPath, () => {
    const refreshed = loadTracker(
      tracker.paths.repoRoot,
      path.relative(tracker.paths.repoRoot, tracker.paths.workRoot),
    );
    const item = refreshed.items.find((candidate) => candidate.id === id);
    if (!item) throw new WorkError(`Work item ${id} disappeared during GitHub sync`, "missing_item");
    const record = structuredClone(item.record);
    record.github = githubMetadata;
    atomicWriteJson(item.itemPath, record);
  });
}

function fieldValue(item, fieldName) {
  const values = item.fieldValues ?? item.fields ?? [];
  const found = values.find((value) => value.field?.name === fieldName || value.name === fieldName);
  return found?.value ?? found?.name ?? null;
}

function formatPr(pr) {
  if (!pr) return "Not recorded";
  if (typeof pr === "string" || typeof pr === "number") return String(pr);
  return pr.url ?? (pr.number ? `#${pr.number}` : "Not recorded");
}

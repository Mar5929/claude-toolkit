import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  parseYaml,
  readYaml,
  stableYaml,
} from "../skills/work/scripts/lib/common.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.resolve(here, "../skills/work/scripts/work.mjs");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    input: options.input,
    env: { ...process.env, ...options.env },
  });
  if (!options.allowFailure && result.status !== 0) {
    assert.fail(`${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
  }
  return result;
}

function git(repo, ...args) {
  return run("git", ["-C", repo, ...args]);
}

function makeRepo(name = "tracker repo with spaces") {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "work-tracker-test-"));
  const repo = path.join(parent, name);
  fs.mkdirSync(repo);
  git(repo, "init", "-b", "main");
  git(repo, "config", "user.email", "tests@example.com");
  git(repo, "config", "user.name", "Work Tracker Tests");
  fs.writeFileSync(path.join(repo, "README.md"), "# Fixture\n");
  git(repo, "add", "README.md");
  git(repo, "commit", "-m", "initial");
  return repo;
}

function work(repo, args, options = {}) {
  return run(process.execPath, [cli, ...args, "--cwd", repo], options);
}

function jsonWork(repo, args, options = {}) {
  const result = work(repo, [...args, "--json"], options);
  return { ...result, json: result.stdout ? JSON.parse(result.stdout) : null };
}

function init(repo) {
  return jsonWork(repo, ["init"]).json;
}

function add(repo, title, extra = []) {
  const defaultOptions = [];
  if (!extra.includes("--priority")) defaultOptions.push("--priority", "medium");
  if (!extra.includes("--type")) defaultOptions.push("--type", "task");
  return jsonWork(repo, [
    "add",
    "--title",
    title,
    "--description",
    `${title} is the owner request.`,
    "--next-step",
    `Refine ${title}`,
    ...defaultOptions,
    ...extra,
  ]).json;
}

function itemPath(repo, id) {
  const root = path.join(repo, ".work-items");
  const folder = fs.readdirSync(root).find((name) => name.startsWith(`${id}-`));
  if (!folder) throw new Error(`Missing ${id}`);
  return path.join(root, folder);
}

function fillRequirements(repo, id) {
  const filePath = path.join(itemPath(repo, id), "REQUIREMENTS.md");
  const source = fs.readFileSync(filePath, "utf8");
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  assert.ok(frontmatter);
  fs.writeFileSync(
    filePath,
    `---\n${frontmatter}\n---\n\n# ${id}: Agreed requirements\n\n## Goal\n\nGive the owner the requested result.\n\n## Why\n\nThe current behavior causes extra work.\n\n## What has to be true for this to count as finished\n\n- The requested behavior works.\n\n## What the person using it experiences\n\nThe person sees the simpler result.\n\n## How it behaves from the outside\n\n1. The person makes the request.\n2. The system returns the result.\n\n## Edge cases\n\n- Missing input produces a clear message.\n`,
  );
}

function finalize(repo, id, owner = "Mike") {
  fillRequirements(repo, id);
  return jsonWork(repo, ["requirements", id, "--finalize", "--approved-by", owner]).json;
}

function requirementsMeta(repo, id) {
  const source = fs.readFileSync(path.join(itemPath(repo, id), "REQUIREMENTS.md"), "utf8");
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  assert.ok(frontmatter);
  return parseYaml(frontmatter, `${id} requirements`);
}

test("initializes one flat ignored tracker in a path containing spaces", () => {
  const repo = makeRepo();
  const result = init(repo);
  assert.equal(result.outcome, "initialized");
  assert.equal(result.path, ".work-items");
  assert.equal(result.item_count, 0);
  assert.ok(fs.existsSync(path.join(repo, ".work-items", ".work-tracker.yaml")));
  assert.ok(fs.existsSync(path.join(repo, ".work-items", "DASHBOARD.md")));
  assert.match(fs.readFileSync(path.join(repo, ".gitignore"), "utf8"), /^\/\.work-items\/$/m);
  assert.equal(git(repo, "check-ignore", ".work-items").status, 0);
  for (const oldStage of ["01-backlog", "02-in-progress", "03-completed", "04-archived"]) {
    assert.equal(fs.existsSync(path.join(repo, ".work-items", oldStage)), false);
  }
});

test("linked Git worktrees share the primary checkout's local tracker", () => {
  const repo = makeRepo("primary checkout");
  init(repo);
  add(repo, "Primary item");
  git(repo, "add", ".gitignore");
  git(repo, "commit", "-m", "ignore local work items");
  const linked = path.join(path.dirname(repo), "linked checkout");
  git(repo, "worktree", "add", linked, "-b", "codex/linked-test");
  const linkedStatus = jsonWork(linked, ["status", "--all"]).json;
  assert.equal(linkedStatus.groups.backlog[0].id, "WI-001");
  assert.equal(
    linkedStatus.groups.backlog[0].path,
    path
      .join(fs.realpathSync(repo), ".work-items", "WI-001-primary-item")
      .split(path.sep)
      .join("/"),
  );
  assert.equal(fs.existsSync(path.join(linked, ".work-items")), false);
  add(linked, "Linked item");
  assert.ok(fs.existsSync(path.join(repo, ".work-items", "WI-002-linked-item")));
  assert.equal(jsonWork(repo, ["status", "--all"]).json.counts.backlog, 2);
});

test("initialization preserves existing ignore rules and adds one local tracker rule", () => {
  const repo = makeRepo("existing gitignore");
  fs.writeFileSync(path.join(repo, ".gitignore"), "node_modules/");
  init(repo);
  init(repo);
  assert.equal(
    fs.readFileSync(path.join(repo, ".gitignore"), "utf8"),
    "node_modules/\n/.work-items/\n",
  );
});

test("adds a flat YAML work item with refining raw requirements", () => {
  const repo = makeRepo();
  init(repo);
  const created = add(repo, "Simple local tracker");
  assert.equal(created.item.id, "WI-001");
  assert.equal(created.item.status, "Backlog");
  assert.equal(created.item.requirements_status, "refining");
  const folder = itemPath(repo, "WI-001");
  assert.equal(path.dirname(folder), path.join(repo, ".work-items"));
  const record = readYaml(path.join(folder, "ITEM.yaml"));
  assert.equal(record.description, "Simple local tracker is the owner request.");
  assert.equal(record.created_date, record.updated_date);
  const requirements = fs.readFileSync(path.join(folder, "REQUIREMENTS.md"), "utf8");
  assert.match(requirements, /status: "refining"/);
  assert.match(requirements, /Simple local tracker is the owner request\./);
  assert.equal(git(repo, "ls-files", "--", ".work-items").stdout.trim(), "");
});

test("requires complete owner-approved requirements before work starts", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Approval gate");
  const earlyStart = jsonWork(
    repo,
    ["start", "WI-001", "--branch", "codex/approval"],
    { allowFailure: true },
  );
  assert.equal(JSON.parse(earlyStart.stderr).error, "requirements_not_finalized");
  const earlyFinalize = jsonWork(
    repo,
    ["requirements", "WI-001", "--finalize", "--approved-by", "Mike"],
    { allowFailure: true },
  );
  assert.equal(JSON.parse(earlyFinalize.stderr).error, "incomplete_requirements");
  const finalized = finalize(repo, "WI-001");
  assert.equal(finalized.item.status, "Ready");
  assert.equal(finalized.item.requirements_status, "finalized");
  assert.equal(requirementsMeta(repo, "WI-001").approved_by, "Mike");
  const started = jsonWork(repo, [
    "start",
    "WI-001",
    "--branch",
    "codex/approval",
    "--next-step",
    "Build approved behavior",
  ]).json;
  assert.equal(started.item.status, "In Progress");
});

test("reopening requirements returns active work to the flat backlog without moving it", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Changed direction");
  finalize(repo, "WI-001");
  const before = itemPath(repo, "WI-001");
  jsonWork(repo, ["start", "WI-001", "--branch", "codex/direction"]);
  const reopened = jsonWork(repo, ["requirements", "WI-001", "--reopen"]).json;
  assert.equal(reopened.item.status, "Backlog");
  assert.equal(reopened.item.requirements_status, "refining");
  assert.equal(itemPath(repo, "WI-001"), before);
});

test("prevents accidental active branch sharing", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "First");
  add(repo, "Second");
  finalize(repo, "WI-001");
  finalize(repo, "WI-002");
  jsonWork(repo, ["start", "WI-001", "--branch", "codex/shared"]);
  const collision = jsonWork(
    repo,
    ["start", "WI-002", "--branch", "codex/shared"],
    { allowFailure: true },
  );
  assert.equal(JSON.parse(collision.stderr).error, "branch_claimed");
});

test("maintains inverse relationships in YAML and rejects dependency cycles", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "One");
  add(repo, "Two");
  const linked = jsonWork(repo, [
    "link",
    "WI-001",
    "--type",
    "depends_on",
    "--target",
    "WI-002",
  ]).json;
  assert.equal(linked.inverse, "blocks");
  const target = readYaml(path.join(itemPath(repo, "WI-002"), "ITEM.yaml"));
  assert.deepEqual(target.relationships.blocks, ["WI-001"]);
  const cycle = jsonWork(
    repo,
    ["link", "WI-002", "--type", "depends_on", "--target", "WI-001"],
    { allowFailure: true },
  );
  assert.equal(JSON.parse(cycle.stderr).error, "dependency_cycle");
});

test("recommends only finalized ready or active work", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Low backlog", ["--priority", "low"]);
  add(repo, "Ready high", ["--priority", "high"]);
  add(repo, "Urgent backlog", ["--priority", "urgent"]);
  finalize(repo, "WI-002");
  assert.equal(jsonWork(repo, ["next"]).json.recommendation.id, "WI-002");
  finalize(repo, "WI-001");
  jsonWork(repo, ["start", "WI-001", "--branch", "codex/low"]);
  assert.equal(jsonWork(repo, ["next"]).json.recommendation.id, "WI-001");
});

test("does not report branch-complete work as landed until Git ancestry proves it", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Feature");
  finalize(repo, "WI-001");
  git(repo, "switch", "-c", "codex/feature");
  fs.writeFileSync(path.join(repo, "feature.txt"), "feature\n");
  git(repo, "add", "feature.txt");
  git(repo, "commit", "-m", "feature work");
  const commit = git(repo, "rev-parse", "HEAD").stdout.trim();
  jsonWork(repo, ["start", "WI-001", "--branch", "codex/feature"]);
  const first = jsonWork(repo, ["finish", "WI-001", "--commit", commit]).json;
  assert.equal(first.landed, false);
  assert.equal(first.item.status, "In Review");
  assert.equal(jsonWork(repo, ["landed", "WI-001"]).json.landed, false);
  git(repo, "branch", "-f", "main", commit);
  const second = jsonWork(repo, ["finish", "WI-001", "--commit", commit]).json;
  assert.equal(second.landed, true);
  assert.equal(second.item.status, "Done");
  assert.ok(fs.existsSync(path.join(itemPath(repo, "WI-001"), "ITEM.yaml")));
});

test("validation rejects false completion, broken links, malformed dates, and duplicates", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Invalid");
  finalize(repo, "WI-001");
  const folder = itemPath(repo, "WI-001");
  const recordPath = path.join(folder, "ITEM.yaml");
  const record = readYaml(recordPath);
  record.status = "Done";
  record.created_date = "2026-99-99";
  record.relationships.depends_on = ["WI-999"];
  record.git.landed_commit = git(repo, "rev-parse", "HEAD").stdout.trim();
  record.git.landed_date = "2026-07-27";
  record.git.default_branch = "missing-main";
  fs.writeFileSync(recordPath, stableYaml(record));
  fs.cpSync(folder, path.join(repo, ".work-items", "WI-001-duplicate"), { recursive: true });
  const result = jsonWork(repo, ["validate"], { allowFailure: true });
  assert.equal(result.status, 2);
  assert.ok(result.json.errors.some((error) => error.includes("Duplicate ID")));
  assert.ok(result.json.errors.some((error) => error.includes("malformed created_date")));
  assert.ok(result.json.errors.some((error) => error.includes("missing WI-999")));
});

test("dashboard generation is stable and reconciliation reports stale output", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Stable dashboard");
  const dashboard = path.join(repo, ".work-items", "DASHBOARD.md");
  const first = fs.readFileSync(dashboard, "utf8");
  jsonWork(repo, ["dashboard"]);
  assert.equal(fs.readFileSync(dashboard, "utf8"), first);
  fs.appendFileSync(dashboard, "\nmanual drift\n");
  const reconciled = jsonWork(repo, ["reconcile"]).json;
  assert.ok(reconciled.findings.some((finding) => finding.code === "stale_dashboard"));
});

test("an interrupted atomic write leaves records intact and no partial new item", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Existing");
  const existingPath = path.join(itemPath(repo, "WI-001"), "ITEM.yaml");
  const before = fs.readFileSync(existingPath, "utf8");
  const failedUpdate = jsonWork(
    repo,
    ["update", "WI-001", "--next-step", "Should not persist"],
    { allowFailure: true, env: { WORK_TRACKER_FAIL_AFTER_TEMP: "1" } },
  );
  assert.equal(failedUpdate.status, 1);
  assert.equal(fs.readFileSync(existingPath, "utf8"), before);
  const failedAdd = jsonWork(
    repo,
    [
      "add",
      "--title",
      "Interrupted",
      "--description",
      "Must not persist",
      "--next-step",
      "Never",
    ],
    { allowFailure: true, env: { WORK_TRACKER_FAIL_AFTER_TEMP: "1" } },
  );
  assert.equal(failedAdd.status, 1);
  assert.equal(
    fs.readdirSync(path.join(repo, ".work-items")).filter((name) => name.startsWith("WI-002")).length,
    0,
  );
  assert.equal(jsonWork(repo, ["validate"]).status, 0);
});

test("previews and safely copies a legacy staged tracker without deleting its source", () => {
  const repo = makeRepo("legacy migration");
  const source = path.join(repo, "work-items");
  const folder = path.join(source, "01-backlog", "WI-007-old-item");
  fs.mkdirSync(folder, { recursive: true });
  const spec = "# Original spec\n\nKeep this exact text.\n";
  const status = "# Original status\n\nNext: preserve this note.\n";
  fs.writeFileSync(path.join(folder, "SPEC.md"), spec);
  fs.writeFileSync(path.join(folder, "STATUS.md"), status);
  fs.writeFileSync(path.join(folder, "notes.txt"), "unknown file stays\n");
  fs.writeFileSync(
    path.join(folder, "ITEM.json"),
    `${JSON.stringify({
      schema_version: 1,
      id: "WI-007",
      title: "Old item",
      status: "Backlog",
      priority: "high",
      type: "task",
      created_at: "2026-08-01",
      updated_at: "2026-08-02",
      next_step: "Review old item",
      blockers: [],
      relationships: Object.fromEntries(
        ["depends_on", "blocks", "related_to", "parent", "children", "supersedes", "superseded_by"].map(
          (type) => [type, []],
        ),
      ),
      git: {},
    }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(source, ".work-tracker.json"),
    `${JSON.stringify({ schema_version: 1, github: { project_number: 3 } }, null, 2)}\n`,
  );

  const blockedInit = jsonWork(repo, ["init"], { allowFailure: true });
  assert.equal(JSON.parse(blockedInit.stderr).error, "legacy_tracker_found");
  const preview = jsonWork(repo, ["migrate", "--from", "work-items"]).json;
  assert.equal(preview.outcome, "migration_preview");
  assert.equal(preview.source_will_be_preserved, true);
  assert.equal(preview.legacy_github_detected, true);
  assert.equal(fs.existsSync(path.join(repo, ".work-items")), false);

  const migrated = jsonWork(repo, ["migrate", "--from", "work-items", "--apply"]).json;
  assert.deepEqual(migrated.migrated, ["WI-007"]);
  assert.equal(migrated.source_preserved, true);
  assert.equal(fs.readFileSync(path.join(folder, "SPEC.md"), "utf8"), spec);
  const target = itemPath(repo, "WI-007");
  assert.equal(path.dirname(target), path.join(repo, ".work-items"));
  assert.equal(fs.readFileSync(path.join(target, "SPEC.md"), "utf8"), spec);
  assert.equal(fs.readFileSync(path.join(target, "notes.txt"), "utf8"), "unknown file stays\n");
  assert.equal(readYaml(path.join(target, "ITEM.yaml")).status, "Backlog");
  assert.equal(requirementsMeta(repo, "WI-007").status, "refining");
  assert.equal(jsonWork(repo, ["validate"]).status, 0);
});

test("local mode has no GitHub mirror command", () => {
  const repo = makeRepo();
  init(repo);
  const result = jsonWork(repo, ["github", "status"], { allowFailure: true });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stderr).error, "unknown_command");
});

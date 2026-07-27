import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.resolve(here, "../skills/work/scripts/work.mjs");
const mockGh = path.resolve(here, "fixtures/mock-gh.mjs");

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
    "--purpose",
    `${title} purpose`,
    "--next-step",
    `${title} next`,
    ...defaultOptions,
    ...extra,
  ]).json;
}

function itemPath(repo, id) {
  for (const stage of ["01-backlog", "02-in-progress", "03-completed", "04-archived"]) {
    const root = path.join(repo, "work-items", stage);
    if (!fs.existsSync(root)) continue;
    const folder = fs.readdirSync(root).find((name) => name.startsWith(`${id}-`));
    if (folder) return path.join(root, folder);
  }
  throw new Error(`Missing ${id}`);
}

test("initializes safely in a path containing spaces and emits JSON", () => {
  const repo = makeRepo();
  const result = init(repo);
  assert.equal(result.outcome, "initialized");
  assert.equal(result.path, "work-items");
  assert.equal(result.item_count, 0);
  assert.ok(fs.existsSync(path.join(repo, "work-items", ".work-tracker.json")));
  assert.ok(fs.existsSync(path.join(repo, "work-items", "DASHBOARD.md")));
});

test("adopts an existing manual work item without overwriting notes", () => {
  const repo = makeRepo();
  const folder = path.join(repo, "work-items", "01-backlog", "WI-007-old-item");
  fs.mkdirSync(folder, { recursive: true });
  const spec = "# Original spec\n\nKeep this exact text.\n";
  const status = "# Original status\n\nNext: preserve this note.\n";
  fs.writeFileSync(path.join(folder, "SPEC.md"), spec);
  fs.writeFileSync(path.join(folder, "STATUS.md"), status);
  const result = init(repo);
  assert.deepEqual(result.adopted, ["WI-007"]);
  assert.equal(fs.readFileSync(path.join(folder, "SPEC.md"), "utf8"), spec);
  assert.equal(fs.readFileSync(path.join(folder, "STATUS.md"), "utf8"), status);
  const record = JSON.parse(fs.readFileSync(path.join(folder, "ITEM.json"), "utf8"));
  assert.equal(record.migration.needs_review, true);
  assert.equal(record.status, "Backlog");
});

test("adds, starts, updates, and prevents accidental active branch sharing", () => {
  const repo = makeRepo();
  init(repo);
  assert.equal(add(repo, "First").item.id, "WI-001");
  assert.equal(add(repo, "Second").item.id, "WI-002");
  const started = jsonWork(repo, [
    "start",
    "WI-001",
    "--branch",
    "codex/shared",
    "--next-step",
    "Implement first",
  ]).json;
  assert.equal(started.item.status, "In Progress");
  const collision = jsonWork(
    repo,
    ["start", "WI-002", "--branch", "codex/shared"],
    { allowFailure: true },
  );
  assert.equal(collision.status, 1);
  assert.equal(JSON.parse(collision.stderr).error, "branch_claimed");
  const updated = jsonWork(repo, [
    "update",
    "WI-001",
    "--blocker",
    "Waiting for API contract",
    "--note",
    "Recorded external blocker",
  ]).json;
  assert.equal(updated.item.blockers[0].reason, "Waiting for API contract");
  assert.match(fs.readFileSync(path.join(itemPath(repo, "WI-001"), "STATUS.md"), "utf8"), /Waiting for API contract/);
  const falseDone = jsonWork(
    repo,
    ["update", "WI-001", "--status", "Done"],
    { allowFailure: true },
  );
  assert.equal(falseDone.status, 1);
  assert.equal(JSON.parse(falseDone.stderr).error, "finish_required");
});

test("maintains inverse relationships and rejects dependency cycles", () => {
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
  const target = JSON.parse(fs.readFileSync(path.join(itemPath(repo, "WI-002"), "ITEM.json"), "utf8"));
  assert.deepEqual(target.relationships.blocks, ["WI-001"]);
  const cycle = jsonWork(
    repo,
    ["link", "WI-002", "--type", "depends_on", "--target", "WI-001"],
    { allowFailure: true },
  );
  assert.equal(cycle.status, 1);
  assert.equal(JSON.parse(cycle.stderr).error, "dependency_cycle");
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(itemPath(repo, "WI-002"), "ITEM.json"), "utf8")).relationships.depends_on,
    [],
  );
});

test("recommends active or ready unblocked work deterministically", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Low backlog", ["--priority", "low"]);
  add(repo, "Ready high", ["--priority", "high", "--status", "Ready"]);
  add(repo, "Urgent blocked", ["--priority", "urgent"]);
  jsonWork(repo, ["update", "WI-003", "--blocker", "Owner decision"]);
  assert.equal(jsonWork(repo, ["next"]).json.recommendation.id, "WI-002");
  jsonWork(repo, ["start", "WI-001", "--branch", "codex/low"]);
  assert.equal(jsonWork(repo, ["next"]).json.recommendation.id, "WI-001");
});

test("does not report branch-complete work as landed until Git ancestry proves it", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Feature");
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
  assert.ok(fs.existsSync(path.join(itemPath(repo, "WI-001"), "ITEM.json")));
});

test("validation rejects false completion, broken links, malformed dates, and duplicates", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Invalid");
  const folder = itemPath(repo, "WI-001");
  const recordPath = path.join(folder, "ITEM.json");
  const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
  record.status = "Done";
  record.created_at = "2026-99-99";
  record.relationships.depends_on = ["WI-999"];
  record.git.landed_commit = git(repo, "rev-parse", "HEAD").stdout.trim();
  record.git.landed_at = "2026-07-27";
  record.git.default_branch = "missing-main";
  fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);
  const duplicate = path.join(repo, "work-items", "03-completed", "WI-001-duplicate");
  fs.cpSync(folder, duplicate, { recursive: true });
  const result = jsonWork(repo, ["validate"], { allowFailure: true });
  assert.equal(result.status, 2);
  assert.equal(result.json.valid, false);
  assert.ok(result.json.errors.some((error) => error.includes("Duplicate ID")));
  assert.ok(result.json.errors.some((error) => error.includes("malformed created_at")));
  assert.ok(result.json.errors.some((error) => error.includes("missing WI-999")));
});

test("dashboard generation is stable and reconciliation reports stale generated files", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Stable dashboard");
  const dashboard = path.join(repo, "work-items", "DASHBOARD.md");
  const first = fs.readFileSync(dashboard, "utf8");
  jsonWork(repo, ["dashboard"]);
  assert.equal(fs.readFileSync(dashboard, "utf8"), first);
  fs.appendFileSync(dashboard, "\nmanual drift\n");
  const reconciled = jsonWork(repo, ["reconcile"]).json;
  assert.ok(reconciled.findings.some((finding) => finding.code === "stale_dashboard"));
});

test("an interrupted atomic write leaves existing records intact and no partial new item", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Existing");
  const existingPath = path.join(itemPath(repo, "WI-001"), "ITEM.json");
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
      "--purpose",
      "Must not persist",
      "--next-step",
      "Never",
    ],
    { allowFailure: true, env: { WORK_TRACKER_FAIL_AFTER_TEMP: "1" } },
  );
  assert.equal(failedAdd.status, 1);
  assert.equal(fs.readdirSync(path.join(repo, "work-items", "01-backlog")).filter((name) => name.startsWith("WI-002")).length, 0);
  assert.equal(jsonWork(repo, ["validate"]).status, 0);
});

test("creates and synchronizes an optional GitHub Project with requested statuses and labels", () => {
  const repo = makeRepo("github adapter repo");
  init(repo);
  add(repo, "GitHub task", ["--type", "enhancement", "--status", "Ready"]);
  const statePath = path.join(repo, "mock-gh-state.json");
  const env = {
    WORK_TRACKER_GH: mockGh,
    MOCK_GH_STATE: statePath,
  };
  const connected = jsonWork(
    repo,
    [
      "github",
      "connect",
      "--create",
      "--owner",
      "test",
      "--repo",
      "test/repo",
      "--title",
      "Repo work",
    ],
    { env },
  ).json;
  assert.equal(connected.outcome, "created_and_connected");
  assert.deepEqual(Object.keys(connected.github.status_options), [
    "Backlog",
    "Ready",
    "In Progress",
    "In Review",
    "Done",
    "Cancelled",
  ]);
  const synced = jsonWork(repo, ["github", "sync", "WI-001"], { env }).json;
  assert.equal(synced.synced[0].status, "Ready");
  const record = JSON.parse(fs.readFileSync(path.join(itemPath(repo, "WI-001"), "ITEM.json"), "utf8"));
  assert.equal(record.github.issue_number, 1);
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  assert.equal(state.projectItems[1].status, "Ready");
  assert.ok(state.labels.includes("task"));
  assert.equal(jsonWork(repo, ["github", "reconcile"], { env }).json.outcome, "clean");
});

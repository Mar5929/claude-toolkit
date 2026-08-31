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

// Searches group folders too, so a test can finalize or read an item wherever
// the owner filed it. The archive is excluded; archivedItemPath covers that.
function itemPath(repo, id) {
  const root = path.join(repo, ".work-items");
  const found = findItemPath(repo, id, root, path.join(root, "archive"));
  if (!found) throw new Error(`Missing ${id}`);
  return found;
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

function archivePath(repo) {
  return path.join(repo, ".work-items", "archive");
}

function archivedItemPath(repo, id) {
  const found = findItemPath(repo, id, archivePath(repo));
  if (!found) throw new Error(`Missing archived ${id}`);
  return found;
}

test("init creates the archive folder", () => {
  const repo = makeRepo();
  init(repo);
  assert.ok(fs.existsSync(archivePath(repo)));
  assert.match(fs.readFileSync(path.join(repo, ".work-items", "README.md"), "utf8"), /archive\//);
});

test("archive moves a folder, hides it from the everyday views, and keeps it findable", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Old finished thing");
  add(repo, "Live thing");
  finalize(repo, "WI-002");

  const archived = jsonWork(repo, ["archive", "WI-001"]).json;
  assert.equal(archived.outcome, "archived");
  assert.equal(archived.archived, true);
  assert.equal(archived.path, ".work-items/archive/WI-001-old-finished-thing");
  assert.ok(fs.existsSync(archivedItemPath(repo, "WI-001")));
  assert.equal(fs.existsSync(path.join(repo, ".work-items", "WI-001-old-finished-thing")), false);

  const status = jsonWork(repo, ["status"]).json;
  assert.equal(status.counts.archived, 1);
  assert.equal(status.counts.backlog, 1);
  assert.deepEqual(
    status.groups.backlog.map((item) => item.id),
    ["WI-002"],
  );
  assert.deepEqual(
    status.groups.archived.map((item) => item.id),
    ["WI-001"],
  );

  assert.equal(jsonWork(repo, ["next"]).json.recommendation.id, "WI-002");

  jsonWork(repo, ["dashboard"]);
  const dashboard = fs.readFileSync(path.join(repo, ".work-items", "DASHBOARD.md"), "utf8");
  assert.equal(dashboard.includes("WI-001"), false);
  assert.ok(dashboard.includes("WI-002"));

  const listed = jsonWork(repo, ["status", "--archived"]).json;
  assert.deepEqual(
    listed.groups.backlog.map((item) => item.id),
    ["WI-001", "WI-002"],
  );
  assert.ok(listed.text.includes(".work-items/archive/WI-001-old-finished-thing"));

  const history = fs
    .readFileSync(path.join(archivedItemPath(repo, "WI-001"), "HISTORY.ndjson"), "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(history.at(-1).action, "archived");
  assert.equal(jsonWork(repo, ["validate"]).json.archived_count, 1);
});

test("a folder moved into the archive by hand is archived, with no command run", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Dragged by hand");
  const source = itemPath(repo, "WI-001");
  fs.renameSync(source, path.join(archivePath(repo), path.basename(source)));

  const status = jsonWork(repo, ["status"]).json;
  assert.equal(status.counts.archived, 1);
  assert.equal(status.counts.backlog, 0);
  assert.equal(status.groups.archived[0].archived, true);
  assert.equal(jsonWork(repo, ["validate"]).status, 0);
});

test("items nested in subfolders of the archive are still found", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Grouped item");
  const source = itemPath(repo, "WI-001");
  const group = path.join(archivePath(repo), "2026-q1");
  fs.mkdirSync(group, { recursive: true });
  fs.renameSync(source, path.join(group, path.basename(source)));

  const status = jsonWork(repo, ["status", "--archived"]).json;
  assert.equal(status.counts.archived, 1);
  assert.equal(status.groups.archived[0].path, ".work-items/archive/2026-q1/WI-001-grouped-item");
  assert.equal(jsonWork(repo, ["validate"]).json.item_count, 1);
});

test("an archived ID number is never handed out again", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "First");
  add(repo, "Second");
  jsonWork(repo, ["archive", "WI-001"]);
  jsonWork(repo, ["archive", "WI-002"]);
  assert.equal(add(repo, "Third").item.id, "WI-003");
});

test("links between an archived item and an open one stay valid both ways", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Open work");
  add(repo, "Retired work");
  jsonWork(repo, ["link", "WI-001", "--type", "depends_on", "--target", "WI-002"]);
  jsonWork(repo, ["archive", "WI-002"]);

  const validation = jsonWork(repo, ["validate"]).json;
  assert.deepEqual(validation.errors, []);
  assert.equal(validation.valid, true);
  assert.deepEqual(readYaml(path.join(archivedItemPath(repo, "WI-002"), "ITEM.yaml")).relationships.blocks, [
    "WI-001",
  ]);
});

test("archiving an open item is allowed and changes nothing about the item", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Still open");
  finalize(repo, "WI-001");
  jsonWork(repo, ["start", "WI-001", "--branch", "feature/open"]);
  const before = readYaml(path.join(itemPath(repo, "WI-001"), "ITEM.yaml"));

  const archived = jsonWork(repo, ["archive", "WI-001"]).json;
  assert.equal(archived.outcome, "archived");
  const after = readYaml(path.join(archivedItemPath(repo, "WI-001"), "ITEM.yaml"));
  assert.deepEqual(after, before);
  assert.equal(after.status, "In Progress");

  const result = jsonWork(repo, ["next"], { allowFailure: true });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stderr).error, "no_actionable_item");
});

test("archiving twice reports no change, and unarchive puts the folder back", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Round trip");
  jsonWork(repo, ["archive", "WI-001"]);

  const again = jsonWork(repo, ["archive", "WI-001"]).json;
  assert.equal(again.outcome, "unchanged");
  assert.match(again.text, /already archived/);

  const restored = jsonWork(repo, ["unarchive", "WI-001"]).json;
  assert.equal(restored.outcome, "unarchived");
  assert.equal(restored.archived, false);
  assert.equal(restored.path, ".work-items/WI-001-round-trip");
  assert.ok(fs.existsSync(itemPath(repo, "WI-001")));
  assert.equal(jsonWork(repo, ["status"]).json.counts.backlog, 1);

  const noop = jsonWork(repo, ["unarchive", "WI-001"]).json;
  assert.equal(noop.outcome, "unchanged");
  assert.match(noop.text, /already not archived/);
});

test("something that is not a work item in the archive is ignored", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Real item");
  fs.mkdirSync(path.join(archivePath(repo), "screenshots"), { recursive: true });
  fs.writeFileSync(path.join(archivePath(repo), "notes.txt"), "loose file\n");

  const validation = jsonWork(repo, ["validate"]).json;
  assert.equal(validation.item_count, 1);
  assert.equal(validation.archived_count, 0);
  assert.equal(validation.valid, true);
});

test("validation still covers archived items", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Broken later");
  jsonWork(repo, ["archive", "WI-001"]);
  fs.rmSync(path.join(archivedItemPath(repo, "WI-001"), "ITEM.yaml"));

  const result = jsonWork(repo, ["validate"], { allowFailure: true });
  assert.equal(result.status, 2);
  assert.ok(result.json.errors.some((error) => error.includes("WI-001: ITEM.yaml is missing")));
});

function workRoot(repo) {
  return path.join(repo, ".work-items");
}

// Finds a work item wherever the owner has filed it, so these tests never assume
// the flat layout the grouping feature exists to relax.
// Mirrors the tracker's own rule: a folder is a work item when its name looks
// like one AND it holds work-item files. A group the owner called "phase-1" is
// still a group, and a work item may hold work items, so this looks inside
// everything.
function isItemFolder(dirPath, name) {
  if (!/^[A-Za-z][A-Za-z0-9]*-\d+(?:-|$)/.test(name)) return false;
  return ["ITEM.yaml", "ITEM.json", "REQUIREMENTS.md", "SPEC.md", "STATUS.md", "HISTORY.ndjson"]
    .some((file) => fs.existsSync(path.join(dirPath, file)));
}

function findItemPath(repo, id, root = workRoot(repo), skip = null) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const entryPath = path.join(root, entry.name);
    if (skip && entryPath === skip) continue;
    if (entry.name.startsWith(`${id}-`) && isItemFolder(entryPath, entry.name)) return entryPath;
    const found = findItemPath(repo, id, entryPath, skip);
    if (found) return found;
  }
  return null;
}

function moveByHand(fromPath, toPath) {
  fs.mkdirSync(path.dirname(toPath), { recursive: true });
  fs.renameSync(fromPath, toPath);
}

test("a folder the owner makes is a group and its work items are found", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Org wide defaults", ["--group", "security-and-permissions"]);
  add(repo, "Ungrouped item");

  const created = findItemPath(repo, "WI-001");
  assert.equal(
    path.relative(workRoot(repo), created),
    path.join("security-and-permissions", "WI-001-org-wide-defaults"),
  );

  const status = jsonWork(repo, ["status"]).json;
  assert.equal(status.counts.backlog, 2);
  const grouped = status.groups.backlog.find((item) => item.id === "WI-001");
  assert.equal(grouped.group, "security-and-permissions");
  assert.equal(grouped.path, ".work-items/security-and-permissions/WI-001-org-wide-defaults");
  assert.equal(status.groups.backlog.find((item) => item.id === "WI-002").group, null);
});

test("groups may be nested and their other files are left alone", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Sharing rules", ["--group", "security-and-permissions/record-access"]);

  const architecture = path.join(workRoot(repo), "security-and-permissions", "ARCHITECTURE.md");
  fs.writeFileSync(architecture, "# Overall solution architecture\n");
  fs.mkdirSync(path.join(workRoot(repo), "security-and-permissions", "diagrams"), {
    recursive: true,
  });

  const validation = jsonWork(repo, ["validate"]).json;
  assert.equal(validation.valid, true);
  assert.equal(validation.item_count, 1);
  assert.equal(
    jsonWork(repo, ["status"]).json.groups.backlog[0].group,
    "security-and-permissions/record-access",
  );
  assert.equal(fs.readFileSync(architecture, "utf8"), "# Overall solution architecture\n");
});

test("moving a work item into a group by hand needs no command", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Permission sets");

  moveByHand(
    findItemPath(repo, "WI-001"),
    path.join(workRoot(repo), "security-and-permissions", "WI-001-permission-sets"),
  );

  const status = jsonWork(repo, ["status", "--all"]).json;
  assert.equal(status.groups.backlog[0].group, "security-and-permissions");
  assert.match(status.text, /in security-and-permissions/);
  assert.equal(jsonWork(repo, ["validate"]).json.valid, true);
});

test("archiving keeps the group and unarchiving puts the item back in it", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Field level security", ["--group", "security-and-permissions"]);

  const archived = jsonWork(repo, ["archive", "WI-001"]).json;
  assert.equal(archived.outcome, "archived");
  assert.equal(
    archived.path,
    ".work-items/archive/security-and-permissions/WI-001-field-level-security",
  );
  assert.equal(jsonWork(repo, ["status"]).json.counts.backlog, 0);
  assert.equal(jsonWork(repo, ["status", "--archived"]).json.counts.archived, 1);

  // The owner may well have deleted the empty group folder in the meantime.
  fs.rmSync(path.join(workRoot(repo), "security-and-permissions"), {
    recursive: true,
    force: true,
  });

  const restored = jsonWork(repo, ["unarchive", "WI-001"]).json;
  assert.equal(restored.outcome, "unarchived");
  assert.equal(restored.path, ".work-items/security-and-permissions/WI-001-field-level-security");
  assert.equal(jsonWork(repo, ["status"]).json.groups.backlog[0].group, "security-and-permissions");
});

test("moving a whole group folder into the archive archives everything in it", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Owd", ["--group", "security-and-permissions"]);
  add(repo, "Sharing", ["--group", "security-and-permissions"]);
  add(repo, "Unrelated");

  moveByHand(
    path.join(workRoot(repo), "security-and-permissions"),
    path.join(archivePath(repo), "security-and-permissions"),
  );

  const status = jsonWork(repo, ["status", "--all"]).json;
  assert.equal(status.counts.archived, 2);
  assert.equal(status.counts.backlog, 1);
  assert.equal(status.groups.backlog[0].id, "WI-003");
  assert.equal(
    status.groups.archived.every((item) => item.group === "archive/security-and-permissions"),
    true,
  );
  assert.equal(jsonWork(repo, ["validate"]).json.valid, true);
});

// The owner works a big area as one item, keeps that area's shared documents in
// its folder, and nests the pieces underneath it. The parent stays a real work
// item with its own status; the children are found alongside it.
test("a work item may hold other work items, and both are found", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Security and permissions");
  add(repo, "Org wide defaults");
  add(repo, "Sharing rules");

  const parent = findItemPath(repo, "WI-001");
  fs.mkdirSync(path.join(parent, "diagrams"), { recursive: true });
  fs.writeFileSync(path.join(parent, "ARCHITECTURE.md"), "# Overall solution\n");
  moveByHand(findItemPath(repo, "WI-002"), path.join(parent, "WI-002-org-wide-defaults"));
  moveByHand(findItemPath(repo, "WI-003"), path.join(parent, "WI-003-sharing-rules"));

  const status = jsonWork(repo, ["status", "--all"]).json;
  assert.equal(status.counts.backlog, 3);
  const byId = Object.fromEntries(status.groups.backlog.map((item) => [item.id, item]));
  assert.equal(byId["WI-001"].group, null);
  assert.equal(byId["WI-002"].group, "WI-001-security-and-permissions");
  assert.equal(byId["WI-003"].group, "WI-001-security-and-permissions");
  assert.equal(jsonWork(repo, ["validate"]).json.valid, true);
  assert.equal(fs.readFileSync(path.join(parent, "ARCHITECTURE.md"), "utf8"), "# Overall solution\n");
});

test("archiving a parent work item takes the work items inside it along", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Security and permissions");
  add(repo, "Org wide defaults");

  const parent = findItemPath(repo, "WI-001");
  moveByHand(findItemPath(repo, "WI-002"), path.join(parent, "WI-002-org-wide-defaults"));

  const archived = jsonWork(repo, ["archive", "WI-001"]).json;
  assert.equal(archived.path, ".work-items/archive/WI-001-security-and-permissions");
  const after = jsonWork(repo, ["status", "--all"]).json;
  assert.equal(after.counts.archived, 2);
  assert.equal(after.counts.backlog, 0);

  const restored = jsonWork(repo, ["unarchive", "WI-001"]).json;
  assert.equal(restored.outcome, "unarchived");
  assert.equal(jsonWork(repo, ["status"]).json.counts.backlog, 2);
  assert.equal(
    jsonWork(repo, ["status"]).json.groups.backlog.find((item) => item.id === "WI-002").group,
    "WI-001-security-and-permissions",
  );
});

test("add refuses a group that escapes the tracker or hides the item", () => {
  const repo = makeRepo();
  init(repo);

  for (const group of ["../outside", "archive", "archive/old", ".hidden"]) {
    const result = work(
      repo,
      ["add", "--title", "Guarded", "--description", "Owner request.", "--next-step", "Refine",
        "--priority", "medium", "--type", "task", "--group", group, "--json"],
      { allowFailure: true },
    );
    assert.equal(result.status, 1, `expected ${group} to be refused`);
    assert.equal(JSON.parse(result.stderr).error, "invalid_group");
  }
  assert.equal(jsonWork(repo, ["status"]).json.counts.backlog, 0);
});

// The owner groups work by phase and by epic, so these names are the ones they
// will actually type. They match the work-item pattern, and treating one as a
// work item would hide everything inside it.
test("a group folder named like a work item is still a group", () => {
  const repo = makeRepo();
  init(repo);

  for (const group of ["phase-1", "epic-2", "sprint-3"]) {
    const created = add(repo, `Item for ${group}`, ["--group", group]);
    assert.equal(created.outcome, "created");
  }

  const status = jsonWork(repo, ["status"]).json;
  assert.equal(status.counts.backlog, 3);
  assert.deepEqual(
    status.groups.backlog.map((item) => item.group).sort(),
    ["epic-2", "phase-1", "sprint-3"],
  );
  assert.equal(
    status.groups.backlog.every((item) => item.id.startsWith("WI-")),
    true,
  );
  assert.equal(jsonWork(repo, ["validate"]).json.valid, true);

  // init must not adopt one of those folders as a work item either.
  assert.equal(jsonWork(repo, ["validate"]).json.item_count, 3);
});

test("an ordinary subfolder inside a work item is not reported as hidden work", () => {
  const repo = makeRepo();
  init(repo);
  add(repo, "Real item");

  for (const name of ["notes-2024", "screenshots-2", "v2-1", "diagrams"]) {
    fs.mkdirSync(path.join(findItemPath(repo, "WI-001"), name), { recursive: true });
  }

  const validation = jsonWork(repo, ["validate"]).json;
  assert.equal(validation.valid, true);
  assert.equal(validation.item_count, 1);
});

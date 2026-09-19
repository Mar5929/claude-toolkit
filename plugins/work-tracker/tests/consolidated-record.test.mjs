import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  parseDocument,
  documentHash,
} from "../skills/work/scripts/lib/work-item-document.mjs";
import { stableYaml } from "../skills/work/scripts/lib/common.mjs";
const cli = fileURLToPath(
  new URL("../skills/work/scripts/work.mjs", import.meta.url),
);
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "work-document-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => {
    const p = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
    assert.equal(p.status, 0, p.stderr);
    return p.stdout;
  };
  git("init", "-b", "main");
  git("config", "user.name", "Fixture");
  git("config", "user.email", "fixture@example.test");
  fs.writeFileSync(path.join(root, "README.md"), "fixture");
  git("add", "README.md");
  git("commit", "-m", "fixture");
  const run = (args, opts = {}) => {
    const p = spawnSync(
      process.execPath,
      [cli, ...args, "--cwd", root, "--json"],
      { encoding: "utf8", env: { ...process.env, ...opts.env } },
    );
    if (!opts.fail) assert.equal(p.status, 0, p.stderr + "\n" + p.stdout);
    return {
      ...p,
      data: p.stdout || p.stderr ? JSON.parse(p.stdout || p.stderr) : null,
    };
  };
  run(["init"]);
  const add = (title = "Example", extra = []) =>
    run([
      "add",
      "--title",
      title,
      "--description",
      "Owner request",
      "--next-step",
      "Refine requirements",
      ...extra,
    ]).data.item;
  const source = (item) =>
    fs.readFileSync(path.resolve(root, item.path, "WORK-ITEM.md"), "utf8");
  const file = (item) => path.resolve(root, item.path, "WORK-ITEM.md");
  const active = (id) => run(["active", "set", id, "--replace"]);
  return { root, git, run, add, source, file, active };
}
function task(f, item = "WI-001", extra = []) {
  return f.run([
    "task",
    "add",
    item,
    "--stage-title",
    "Build",
    "--stage-outcome",
    "Working feature",
    "--stage-acceptance",
    "Tests pass",
    "--title",
    "Implement",
    "--objective",
    "Meet requirement",
    "--instructions",
    "Read the design\n```html\n<!--\n```\nPreserve prior decisions",
    "--constraint",
    "No migration",
    "--input",
    "DESIGN.md",
    "--deliverable",
    "Checked change",
    "--acceptance",
    "Owner accepts",
    "--next-action",
    "Read DESIGN.md",
    ...extra,
  ]).data;
}
function candidate(f, item, transform) {
  const before = f.source(item),
    input = path.join(f.root, "candidate.md");
  fs.writeFileSync(input, transform(before));
  return [
    "edit",
    item.id,
    "--input",
    input,
    "--expected-hash",
    documentHash(before),
  ];
}

test("new item has exactly one record with required ordered sections; legacy files are not created", (t) => {
  const f = fixture(t),
    item = f.add();
  assert.deepEqual(fs.readdirSync(path.dirname(f.file(item))), [
    "WORK-ITEM.md",
  ]);
  const doc = parseDocument(f.source(item));
  assert.equal(doc.record.id, item.id);
  assert.equal(doc.requirements.meta.status, "refining");
  assert.equal(item.format, "markdown");
  assert.equal(item.document_hash, documentHash(f.source(item)));
  assert.deepEqual(Object.keys(doc.sections), [
    "Overview",
    "Roadmap",
    "Tasks",
    "Recent History",
    "Requirements",
  ]);
  f.run(["init"]);
  assert.deepEqual(fs.readdirSync(path.dirname(f.file(item))), [
    "WORK-ITEM.md",
  ]);
});

test("task updates retain owner prose, code examples, Unicode, CRLF, notes, and collapsed history", (t) => {
  const f = fixture(t),
    item = f.add();
  f.active(item.id);
  task(f);
  const raw =
    f
      .source(item)
      .replace(
        "## Context and notes\n\n",
        "## Context and notes\n\nOwner: María\nKeep this decision exactly.\n\n```html\n<!--\n```\n\n",
      )
      .replace(
        "# Recent History\n\n",
        "# Recent History\n\n<details>\n<summary>Earlier decisions</summary>\n",
      )
      .replace("# Requirements\n", "</details>\n\n# Requirements\n") +
    "\n### Detail\n\n```markdown\n# Overview\n- Status: Done\n```\n\n<details>\n<summary>Examples</summary>\n\nDo not rewrite **this**.\n</details>\n";
  fs.writeFileSync(f.file(item), raw.replaceAll("\n", "\r\n"));
  const before = parseDocument(f.source(item));
  f.run([
    "task",
    "update",
    item.id,
    "TASK-001",
    "--next-action",
    "Review result",
    "--status",
    "In Progress",
  ]);
  const after = parseDocument(f.source(item));
  assert.equal(after.requirements.body, before.requirements.body);
  assert.ok(
    after.source.includes("Owner: María\r\nKeep this decision exactly."),
  );
  assert.equal(
    after.roadmap.tasks[0].instructions,
    "Read the design\n```html\n<!--\n```\nPreserve prior decisions",
  );
  assert.equal(after.roadmap.tasks[0].next_action, "Review result");
  assert.equal(after.record.status, "Backlog");
  assert.equal(after.history.length, before.history.length + 1);
  assert.ok(!/(?<!\r)\n/.test(after.source));
  assert.ok(
    after.source.indexOf("task_updated") < after.source.indexOf("</details>"),
  );
});

test("guarded prose edit saves notes and requirements, detects stale versions, and rejects approval bypass", (t) => {
  const f = fixture(t),
    item = f.add();
  f.active(item.id);
  f.run(
    candidate(f, item, (s) =>
      s
        .replace(
          "_Not agreed yet._",
          "Accepted scope is still being discussed.",
        )
        .replace(
          "## Open questions\n\nNone.",
          "## Open questions\n\nWho approves? Answer from: Mike.",
        ),
    ),
  );
  assert.match(f.source(item), /Who approves/);
  const stale = candidate(f, item, (s) => s + "\nPending note\n");
  f.run([
    "update",
    item.id,
    "--next-step",
    "Check question",
    "--note",
    "Decision captured",
  ]);
  const before = f.source(item);
  assert.equal(f.run(stale, { fail: true }).data.error, "stale_document");
  assert.equal(f.source(item), before);
  const bypass = candidate(f, item, (s) =>
    s.replace("- Status: Backlog", "- Status: Done"),
  );
  assert.equal(
    f.run(bypass, { fail: true }).data.error,
    "guarded_document_fields",
  );
  assert.equal(f.source(item), before);
  f.run(["requirements", item.id, "--finalize", "--approved-by", "Mike"]);
  assert.equal(
    f.run(
      candidate(f, item, (s) => s + "\nChanged approved scope\n"),
      { fail: true },
    ).data.error,
    "requirements_finalized",
  );
});

test("approval, task completion and parent completion remain separate; completion retry emits one event", (t) => {
  const f = fixture(t),
    item = f.add("Build", ["--type", "build"]);
  f.active(item.id);
  const denied = f.run(["update", item.id, "--status", "In Progress"], {
    fail: true,
  });
  assert.notEqual(denied.status, 0);
  task(f, item.id, ["--approval-required"]);
  assert.notEqual(
    f.run(
      ["task", "complete", item.id, "TASK-001", "--evidence", "Tests passed"],
      { fail: true },
    ).status,
    0,
  );
  f.run([
    "task",
    "complete",
    item.id,
    "TASK-001",
    "--evidence",
    "Tests passed",
    "--approved-by",
    "Mike",
  ]);
  assert.equal(parseDocument(f.source(item)).record.status, "Backlog");
  f.run(["requirements", item.id, "--finalize", "--approved-by", "Mike"]);
  const args = [
    "finish",
    item.id,
    "--evidence",
    "Feature accepted",
    "--approved-by",
    "Mike",
  ];
  f.run(args);
  f.run(args);
  const events = fs
    .readFileSync(path.join(f.root, ".work-items/EVENTS.ndjson"), "utf8")
    .trim()
    .split("\n");
  assert.equal(events.length, 1);
  assert.equal(f.run(["validate"]).data.valid, true);
});

test("existing legacy items remain usable alongside new items and cross-format relationships", (t) => {
  const f = fixture(t),
    item = f.add("New"),
    old = f.add("Legacy fixture");
  // Establish a pre-release fixture only; there is no production conversion API.
  const doc = parseDocument(f.source(old)),
    dir = path.dirname(f.file(old));
  fs.writeFileSync(path.join(dir, "ITEM.yaml"), stableYaml(doc.record));
  fs.writeFileSync(path.join(dir, "TASKS.yaml"), stableYaml(doc.roadmap));
  fs.writeFileSync(
    path.join(dir, "REQUIREMENTS.md"),
    "---\n" +
      stableYaml(doc.requirements.meta) +
      "---\n" +
      doc.requirements.body,
  );
  fs.writeFileSync(path.join(dir, "STATUS.md"), "Legacy owner notes\n");
  fs.writeFileSync(
    path.join(dir, "HISTORY.ndjson"),
    doc.history.map((e) => JSON.stringify(e)).join("\n") + "\n",
  );
  fs.unlinkSync(f.file(old));
  const requirementBefore = fs.readFileSync(
    path.join(dir, "REQUIREMENTS.md"),
    "utf8",
  );
  f.active(item.id);
  f.run(["link", item.id, "--type", "children", "--target", old.id]);
  f.active(old.id);
  f.run([
    "update",
    old.id,
    "--next-step",
    "Keep legacy format",
    "--note",
    "Legacy update",
  ]);
  assert.equal(fs.existsSync(f.file(old)), false);
  assert.equal(
    fs.readFileSync(path.join(dir, "REQUIREMENTS.md"), "utf8"),
    requirementBefore,
  );
  assert.deepEqual(
    parseDocument(f.source(item)).record.relationships.children,
    [old.id],
  );
  assert.equal(f.run(["validate"]).data.valid, true);
});

test("malformed and competing authorities fail without rewriting content", (t) => {
  const f = fixture(t),
    item = f.add();
  f.active(item.id);
  const original = f.source(item);
  for (const bad of [
    original.replace("# Roadmap", "# Overview"),
    original.replace("- Status: Backlog", "- Status: Backlog\n- Status: Done"),
    original.replace(
      "## Context and notes",
      "```\n# Requirements\n```\n## Context and notes",
    ) + "\n# Surprise\n",
  ]) {
    fs.writeFileSync(f.file(item), bad);
    assert.notEqual(
      f.run(["update", item.id, "--next-step", "No overwrite"], { fail: true })
        .status,
      0,
    );
    assert.equal(f.source(item), bad);
  }
  fs.writeFileSync(f.file(item), original);
  fs.writeFileSync(
    path.join(path.dirname(f.file(item)), "ITEM.yaml"),
    "conflicting",
  );
  assert.equal(
    f.run(["init"], { fail: true }).data.error,
    "mixed_item_formats",
  );
  assert.equal(f.source(item), original);
});

test("failed save restores the document and state without reporting completion", (t) => {
  const f = fixture(t),
    item = f.add();
  f.active(item.id);
  const before = f.source(item);
  const result = f.run(
    ["finish", item.id, "--approved-by", "Mike", "--evidence", "Accepted"],
    { fail: true, env: { WORK_TRACKER_FAIL_AFTER_INSTALL: "1" } },
  );
  assert.notEqual(result.status, 0);
  assert.equal(f.source(item), before);
  assert.equal(f.run(["active"]).data.item.id, item.id);
  assert.equal(
    fs.existsSync(path.join(f.root, ".work-items/EVENTS.ndjson")),
    false,
  );
});

test("archive and restore preserve the single record and add readable history", (t) => {
  const f = fixture(t),
    item = f.add("Nested", ["--group", "area"]);
  f.active(item.id);
  const archived = f.run(["archive", item.id]).data;
  const target = path.resolve(f.root, archived.path, "WORK-ITEM.md");
  assert.ok(fs.existsSync(target));
  assert.equal(
    parseDocument(fs.readFileSync(target, "utf8")).history.at(-1).action,
    "archived",
  );
  f.run(["unarchive", item.id]);
  assert.deepEqual(fs.readdirSync(path.dirname(f.file(item))), [
    "WORK-ITEM.md",
  ]);
  assert.equal(f.run(["validate"]).data.valid, true);
});

test("each branch retains its selected task when another branch changes the same document", (t) => {
  const f = fixture(t),
    item = f.add();
  f.active(item.id);
  task(f);
  task(f);
  f.run(["task", "select", item.id, "TASK-001"]);
  f.git("switch", "-c", "other");
  f.active(item.id);
  f.run(["task", "select", item.id, "TASK-002"]);
  f.run([
    "task",
    "update",
    item.id,
    "TASK-002",
    "--next-action",
    "Second branch review",
  ]);
  assert.equal(f.run(["active"]).data.item.current_task.id, "TASK-002");
  f.git("switch", "main");
  assert.equal(f.run(["active"]).data.item.current_task.id, "TASK-001");
});

test("interrupted multi-file completion recovers once and preserves later edits on conflict", (t) => {
  const f = fixture(t),
    item = f.add();
  f.active(item.id);
  const result = f.run(
    ["finish", item.id, "--approved-by", "Mike", "--evidence", "Accepted"],
    { fail: true, env: { WORK_TRACKER_EXIT_AFTER_INSTALL: "1" } },
  );
  assert.equal(result.status, 86);
  assert.equal(
    f.run(["status"], { fail: true }).data.error,
    "pending_recovery",
  );
  const installed = f.source(item);
  fs.writeFileSync(f.file(item), installed + "\nLater human edit\n");
  assert.equal(
    f.run(["recover"], { fail: true }).data.error,
    "recovery_conflict",
  );
  assert.ok(f.source(item).endsWith("Later human edit\n"));
  fs.writeFileSync(f.file(item), installed);
  assert.equal(f.run(["recover"]).data.recovered, 1);
  assert.equal(f.run(["recover"]).data.recovered, 0);
  assert.equal(f.run(["validate"]).data.valid, true);
  assert.equal(
    fs
      .readFileSync(path.join(f.root, ".work-items/EVENTS.ndjson"), "utf8")
      .trim()
      .split("\n").length,
    1,
  );
  assert.deepEqual(fs.readdirSync(path.dirname(f.file(item))), [
    "WORK-ITEM.md",
  ]);
});

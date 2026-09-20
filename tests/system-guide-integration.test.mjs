#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  loadKnowledge,
  systemGuideOffMessage,
  SYSTEM_GUIDE_OFF_MESSAGE,
} from "../plugins/second-brain/hooks/knowledge-session-start.mjs";
import { checkKnowledge } from "../plugins/second-brain/tools/check-knowledge.mjs";
import {
  inspectGuide,
  refreshGuide,
  setupGuide,
} from "../plugins/system-guide/tools/system-guide.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const systemGuideCli = resolve(repoRoot, "plugins/system-guide/tools/system-guide.mjs");
const fixtures = [];
let checks = 0;

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "system-guide-integration-"));
  fixtures.push(root);
  return root;
}

function write(root, relativePath, content) {
  const target = resolve(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
}

function count(text, value) {
  return text.split(value).length - 1;
}

function snapshotFiles(root, relativePath = "") {
  const snapshot = {};
  for (const entry of readdirSync(resolve(root, relativePath), { withFileTypes: true })) {
    const path = join(relativePath, entry.name);
    if (entry.isDirectory()) Object.assign(snapshot, snapshotFiles(root, path));
    else snapshot[path] = readFileSync(resolve(root, path)).toString("base64");
  }
  return snapshot;
}

function check(name, fn) {
  fn();
  checks += 1;
  process.stdout.write(`PASS: ${name}\n`);
}

try {
  check("second-brain reports System Guide off only for missing or disabled config", () => {
    const root = fixture();
    assert.equal(systemGuideOffMessage(root), SYSTEM_GUIDE_OFF_MESSAGE);
    assert.equal(count(loadKnowledge(root), SYSTEM_GUIDE_OFF_MESSAGE), 1);

    write(root, ".system-guide.json", JSON.stringify({
      version: 1,
      enabled: false,
      guidePath: "knowledge/system",
      sources: [],
    }));
    assert.equal(systemGuideOffMessage(root), SYSTEM_GUIDE_OFF_MESSAGE);
    assert.equal(count(loadKnowledge(root), SYSTEM_GUIDE_OFF_MESSAGE), 1);
  });

  check("enabled and broken guide config stays out of the second-brain briefing", () => {
    const root = fixture();
    write(root, ".system-guide.json", JSON.stringify({
      version: 1,
      enabled: true,
      guidePath: "knowledge/system",
      sources: [],
    }));
    assert.equal(inspectGuide(root).state, "needs-repair");
    assert.equal(systemGuideOffMessage(root), "");
    assert.equal(count(loadKnowledge(root), SYSTEM_GUIDE_OFF_MESSAGE), 0);

    write(root, ".system-guide.json", "{ broken json");
    assert.equal(inspectGuide(root).state, "needs-repair");
    assert.equal(systemGuideOffMessage(root), "");
  });

  check("guide-only setup creates no second-brain files", () => {
    const root = fixture();
    const result = setupGuide(root, {
      sources: [{ path: "src", kind: "code", completeness: "partial" }],
    });
    assert.equal(result.state, "on");
    assert.equal(inspectGuide(root).state, "on");
    assert.equal(systemGuideOffMessage(root), "");
    for (const absent of [
      "SOUL.md",
      "knowledge/knowledge-manual.md",
      "knowledge/memory",
      "knowledge/prds",
      ".claude",
    ]) {
      assert.equal(existsSync(resolve(root, absent)), false, `${absent} should not be created`);
    }
  });

  check("established custom guide location is adopted without replacing content", () => {
    const root = fixture();
    const original = "# Established guide\n\nOwner-written entry.\n";
    write(root, "docs/system-reference/README.md", original);
    assert.throws(
      () => setupGuide(root, { guidePath: "docs/system-reference" }),
      (error) => error?.code === "adoption_required",
    );
    setupGuide(root, { guidePath: "docs/system-reference", adopt: true });
    assert.equal(readFileSync(resolve(root, "docs/system-reference/README.md"), "utf8"), original);
    const status = inspectGuide(root);
    assert.equal(status.state, "on");
    assert.equal(status.guidePath, "docs/system-reference");
  });

  check("System Guide check detects changed sources without changing project files", () => {
    const root = fixture();
    write(root, "src/service.js", "export const service = 'before';\n");
    setupGuide(root, {
      sources: [{ path: "src", kind: "code", completeness: "complete" }],
    });
    refreshGuide(root, { now: "2026-09-20T12:00:00Z" });
    write(root, "src/service.js", "export const service = 'after';\n");

    const before = snapshotFiles(root);

    const result = spawnSync(process.execPath, [
      systemGuideCli,
      "check",
      "--root",
      root,
      "--json",
    ], { encoding: "utf8" });
    assert.equal(result.status, 1, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.state, "needs-repair");
    assert.equal(report.issues.some((issue) => issue.code === "source_changed"), true);
    assert.deepEqual(snapshotFiles(root), before);
  });

  check("project-sync requires the deep System Guide check during audit", () => {
    const projectSync = readFileSync(
      resolve(repoRoot, "plugins/project-init/skills/project-sync/SKILL.md"),
      "utf8",
    );
    assert.match(projectSync, /system-guide-plugin>\/tools\/system-guide\.mjs check --root <project-root> --json/);
    assert.match(projectSync, /`check` scans those sources/);
  });

  check("knowledge checker accepts grouped finalized PRDs and legacy current PRDs", () => {
    const root = fixture();
    const manual = readFileSync(
      resolve(repoRoot, "plugins/second-brain/skills/knowledge-setup/references/templates/knowledge/knowledge-manual.md"),
      "utf8",
    );
    write(root, "knowledge/knowledge-manual.md", manual.replace("<!-- claude-toolkit:knowledge-schema:2 -->", ""));
    write(root, "knowledge/prds/with-group.md", [
      "---",
      "summary: A grouped PRD remains valid.",
      "group: Project knowledge",
      "area: with-group",
      "status: finalized",
      "source: Owner approval",
      "created_at: 2026-09-10",
      "tags: [knowledge]",
      "approved_by: Mike Rihm",
      "approval_date: 2026-09-10",
      "---",
      "",
      "# With group",
      "",
      "Proposed behavior.",
      "",
    ].join("\n"));
    write(root, "knowledge/prds/without-group.md", [
      "---",
      "summary: An older PRD without group remains valid.",
      "area: without-group",
      "status: current",
      "source: Earlier owner approval",
      "created_at: 2026-09-09",
      "tags: [knowledge]",
      "approved_by: Mike Rihm",
      "approval_date: 2026-09-09",
      "---",
      "",
      "# Without group",
      "",
      "Earlier proposed behavior.",
      "",
    ].join("\n"));
    const result = checkKnowledge(root);
    assert.equal(result.problems.length, 1);
    assert.match(result.problems[0], /managed operating manual/);
  });

  process.stdout.write(`ALL PASS (${checks} integration checks)\n`);
} finally {
  for (const root of fixtures) rmSync(root, { recursive: true, force: true });
}

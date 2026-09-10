#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadKnowledge,
  systemGuideOffMessage,
  SYSTEM_GUIDE_OFF_MESSAGE,
} from "../plugins/second-brain/hooks/knowledge-session-start.mjs";
import { checkKnowledge } from "../plugins/second-brain/tools/check-knowledge.mjs";
import {
  inspectGuide,
  setupGuide,
} from "../plugins/system-guide/tools/system-guide.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
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
      "knowledge/README.md",
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

  check("knowledge checker accepts grouped finalized PRDs and legacy current PRDs", () => {
    const root = fixture();
    const manual = readFileSync(
      resolve(repoRoot, "plugins/second-brain/skills/second-brain/references/templates/knowledge/README.md"),
      "utf8",
    );
    write(root, "knowledge/README.md", manual);
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
    assert.deepEqual(result.problems, []);
  });

  process.stdout.write(`ALL PASS (${checks} integration checks)\n`);
} finally {
  for (const root of fixtures) rmSync(root, { recursive: true, force: true });
}

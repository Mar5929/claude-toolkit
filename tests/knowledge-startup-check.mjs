#!/usr/bin/env node

/**
 * Enforce the one-manual project knowledge contract.
 *
 * This catches the failures that ordinary link and copy checks cannot: host
 * startup drift, a reordered or repeated startup file, a manual too large to
 * load cheaply, a changed managed manual, or another active instruction file
 * claiming one of the manual's policy sections.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

import {
  STARTUP_FILES,
  loadKnowledge,
} from "../plugins/second-brain/hooks/knowledge-session-start.mjs";
import {
  MANUAL_SHA256,
  checkKnowledge,
} from "../plugins/second-brain/tools/check-knowledge.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const manualSource = "plugins/second-brain/skills/second-brain/references/templates/knowledge/README.md";
const manualCopy = "knowledge/README.md";
const failures = [];
let checks = 0;

function check(name, run) {
  try {
    run();
    checks++;
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

function read(path) {
  return readFileSync(resolve(root, path), "utf8").replace(/\r\n/g, "\n");
}

function count(text, value) {
  return text.split(value).length - 1;
}

function policy(text, name) {
  const match = text.match(new RegExp(
    `<!-- knowledge-policy:${name}:start -->([\\s\\S]*?)<!-- knowledge-policy:${name}:end -->`,
  ));
  assert.ok(match, `manual has no ${name} policy block`);
  return match[1].replace(/\s+/g, " ");
}

function rootKnowledgeSection(path) {
  const match = read(path).match(/## Project knowledge\n([\s\S]*?)(?=\n## |\n<!-- shared-with-agents-md:end -->)/);
  assert.ok(match, `${path} has no Project knowledge section`);
  return match[1].trim();
}

function handlers(configPath) {
  const config = JSON.parse(read(configPath));
  const groups = config.hooks?.SessionStart || [];
  return groups.flatMap((group) => (group.hooks || []).map((hook) => ({
    matcher: group.matcher,
    ...hook,
  })));
}

check("startup file order", () => {
  assert.deepEqual(STARTUP_FILES.map((item) => item.path), [
    "SOUL.md",
    "knowledge/README.md",
    "knowledge/project.md",
    "knowledge/current.md",
    "knowledge/memory/memory-index.md",
    "knowledge/specs/spec-index.md",
  ]);
  assert.equal(new Set(STARTUP_FILES.map((item) => item.path)).size, 6);
});

const fixture = mkdtempSync(join(tmpdir(), "knowledge-startup-check-"));
try {
  const files = new Map([
    ["SOUL.md", "SOUL_SENTINEL"],
    ["knowledge/README.md", "MANUAL_SENTINEL"],
    ["knowledge/project.md", "PROJECT_SENTINEL"],
    ["knowledge/current.md", "CURRENT_SENTINEL"],
    ["knowledge/memory/memory-index.md", "# ignored\n\n- MEMORY_SENTINEL\n  wrapped"],
    ["knowledge/specs/spec-index.md", "# ignored\n\n- SPEC_SENTINEL"],
  ]);
  for (const [path, text] of files) {
    const absolute = resolve(fixture, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, text);
  }

  check("loader output order and uniqueness", () => {
    const output = loadKnowledge(fixture);
    const sentinels = [
      "SOUL_SENTINEL",
      "MANUAL_SENTINEL",
      "PROJECT_SENTINEL",
      "CURRENT_SENTINEL",
      "MEMORY_SENTINEL",
      "SPEC_SENTINEL",
    ];
    let previous = -1;
    for (const sentinel of sentinels) {
      const position = output.indexOf(sentinel);
      assert.ok(position > previous, `${sentinel} is out of order`);
      assert.equal(count(output, sentinel), 1, `${sentinel} is repeated`);
      previous = position;
    }
    assert.ok(output.includes("  wrapped"));
    assert.ok(!output.includes("# ignored"));
    assert.ok(!output.includes("Only files marked current"));
    assert.ok(!output.includes("showing him the exact words"));
  });

  check("missing manual fails open", () => {
    rmSync(resolve(fixture, "knowledge/README.md"));
    const output = loadKnowledge(fixture);
    assert.equal(count(output, "Project startup file missing: knowledge/README.md"), 1);
    assert.ok(output.includes("Do not invent knowledge policy"));
    assert.ok(output.includes("PROJECT_SENTINEL"));
    assert.ok(output.includes("SPEC_SENTINEL"));
  });

  check("empty manual fails open", () => {
    writeFileSync(resolve(fixture, "knowledge/README.md"), "");
    const output = loadKnowledge(fixture);
    assert.equal(count(output, "Project startup file empty: knowledge/README.md"), 1);
    assert.ok(output.includes("CURRENT_SENTINEL"));
  });

  check("an empty index is a valid fresh project", () => {
    writeFileSync(resolve(fixture, "knowledge/README.md"), "MANUAL_SENTINEL");
    writeFileSync(
      resolve(fixture, "knowledge/memory/memory-index.md"),
      "# What this project knows\n\nNothing saved yet.\n",
    );
    writeFileSync(
      resolve(fixture, "knowledge/specs/spec-index.md"),
      "# How this project is meant to work\n\nNothing saved yet.\n",
    );
    const output = loadKnowledge(fixture);
    assert.equal(count(output, "Nothing saved yet."), 2);
    assert.ok(!output.includes("Project startup file empty: knowledge/memory/memory-index.md"));
    assert.ok(!output.includes("Project startup file empty: knowledge/specs/spec-index.md"));
  });
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

check("Claude and Codex hook parity", () => {
  for (const path of [".claude/settings.json", ".codex/hooks.json"]) {
    const found = handlers(path).filter((hook) =>
      hook.command?.includes(".claude/hooks/knowledge-session-start.mjs"));
    assert.equal(found.length, 1, `${path} must register one knowledge loader`);
    assert.equal(found[0].matcher, "startup|resume|clear|compact");
    assert.equal(found[0].type, "command");
    assert.equal(found[0].timeout, 10);
  }
  const codex = handlers(".codex/hooks.json").find((hook) =>
    hook.command?.includes("knowledge-session-start.mjs"));
  assert.ok(codex.additionalContextLimit >= 5000);
});

check("short identical root fallback", () => {
  const claude = rootKnowledgeSection("CLAUDE.md");
  const codex = rootKnowledgeSection("AGENTS.md");
  assert.equal(claude, codex);
  assert.ok(claude.includes("knowledge/README.md"));
  assert.ok(claude.includes("once"));
  assert.ok(claude.includes("not already in this session"));
  assert.ok(claude.includes("continue and report it"));
  assert.ok(claude.split(/\s+/).length <= 80);
  assert.ok(!read("CLAUDE.md").includes("@SOUL.md"));
});

check("manual size, markers, copy, and checksum", () => {
  const source = read(manualSource);
  const installed = read(manualCopy);
  assert.equal(source, installed);
  assert.equal(count(source, "<!-- claude-toolkit:knowledge-manual -->"), 1);
  assert.ok(source.split("\n").length <= 253, "manual exceeds 253 lines");
  assert.ok(source.trim().split(/\s+/).length <= 1557, "manual exceeds 1,557 words");
  const actualHash = createHash("sha256").update(source).digest("hex");
  assert.equal(actualHash, MANUAL_SHA256);
  for (const policy of [
    "routing",
    "trust",
    "find",
    "save-test",
    "never-save",
    "file-shapes",
    "approval",
    "lifecycle",
    "skill-map",
  ]) {
    assert.equal(count(source, `knowledge-policy:${policy}:start`), 1);
    assert.equal(count(source, `knowledge-policy:${policy}:end`), 1);
  }
});

check("project scope gate runs before a save proposal", () => {
  const manual = read(manualSource);
  const saveTest = policy(manual, "save-test");
  const neverSave = policy(manual, "never-save");
  const approval = policy(manual, "approval");
  assert.ok(saveTest.includes("current project"));
  assert.ok(saveTest.includes("future project action or decision"));
  assert.ok(saveTest.includes("Where it happened does not make it project knowledge"));
  assert.ok(saveTest.includes("agent-tooling project"));
  assert.ok(saveTest.includes("configuration"));
  assert.ok(neverSave.includes("generic agent, shell, or tool behavior"));
  assert.ok(neverSave.includes("one-off troubleshooting"));
  assert.ok(neverSave.includes("global memory"));
  assert.ok(approval.includes("Project value"));

  const remember = read("plugins/second-brain/skills/remember/SKILL.md");
  const scope = remember.indexOf("## 1. Gather and scope candidates");
  const search = remember.indexOf("## 2. Search before drafting");
  const draft = remember.indexOf("## 3. Draft and wait");
  assert.ok(scope !== -1 && scope < search && search < draft);
  assert.ok(remember.includes("knowledge/project.md"));
  assert.ok(remember.includes("Future work on this project needs this because"));
  assert.ok(remember.includes("keep only the constraint"));
  assert.ok(remember.includes("separate global rule or skill review"));
});

check("checker catches a missing or changed managed manual", () => {
  const project = mkdtempSync(join(tmpdir(), "knowledge-manual-drift-"));
  try {
    mkdirSync(resolve(project, "knowledge"), { recursive: true });
    let result = checkKnowledge(project);
    assert.ok(result.problems.some((problem) => problem.includes("is missing")));
    writeFileSync(resolve(project, "knowledge/README.md"), "changed\n");
    result = checkKnowledge(project);
    assert.ok(result.problems.some((problem) =>
      problem.includes("does not match the toolkit's managed operating manual")));
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

check("no second policy owner", () => {
  const active = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: root, encoding: "utf8" },
  ).split("\n").filter(Boolean).filter((path) =>
    /^(CLAUDE\.md|AGENTS\.md|README\.md|docs\/|\.claude\/rules\/|plugins\/(project-init|second-brain|session-skills)\/)/.test(path)
      && /\.(md|mjs)$/.test(path)
      && path !== manualSource
      && path !== manualCopy);

  const forbiddenHeadings = [
    "## The find ladder",
    "## The file shape",
    "## How approval works",
    "## Approval boundary",
    "## What never gets saved",
  ];
  for (const path of active) {
    const text = read(path);
    assert.ok(!text.includes("knowledge-policy:"), `${path} claims a manual policy marker`);
    for (const heading of forbiddenHeadings) {
      assert.ok(!text.includes(heading), `${path} repeats manual policy as ${heading}`);
    }
    const labels = [
      "What:", "Project value:", "Where:", "Source:", "Tags:", "Assumptions:",
    ];
    assert.ok(!labels.every((label) => text.includes(label)),
      `${path} repeats the complete approval contract`);
  }

  assert.ok(!active.some((path) => path.endsWith("where-persistent-information-belongs.md")));
});

check("machine-wide fallback stays a pointer", () => {
  const source = read("plugins/project-init/machine/rules/activate-project-knowledge.md");
  assert.ok(source.includes("knowledge/README.md"));
  assert.ok(source.includes("<!-- claude-toolkit:knowledge-manual -->"));
  assert.ok(source.includes("If the marker is absent, do nothing"));
  assert.ok(source.trim().split(/\s+/).length <= 50);
  const sync = read("plugins/project-init/skills/machine-sync/SKILL.md");
  assert.ok(sync.includes("<!-- claude-toolkit:project-knowledge:start -->"));
  assert.ok(sync.includes("<!-- claude-toolkit:project-knowledge:end -->"));
});

check("fresh projects are recognized as current", () => {
  for (const path of [
    "plugins/second-brain/skills/second-brain/SKILL.md",
    "plugins/project-init/skills/project-sync/SKILL.md",
  ]) {
    const text = read(path);
    assert.ok(text.includes("<!-- claude-toolkit:knowledge-manual -->"));
    assert.ok(/fresh setup with no saved files/i.test(text));
  }
});

if (failures.length) {
  console.error(`FAIL: ${failures.length} knowledge startup contract problem(s):`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`ALL PASS (${checks} knowledge startup contract checks), FAIL: 0`);
}

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
  existsSync,
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

check("short root fallback", () => {
  // Since #254 AGENTS.md is one pointer line, so CLAUDE.md is the only root
  // file carrying the knowledge route. AGENTS.md must still send a Codex
  // session there, because Codex expands no import syntax.
  const claude = rootKnowledgeSection("CLAUDE.md");
  assert.ok(claude.includes("knowledge/README.md"));
  assert.ok(claude.includes("once"));
  assert.ok(claude.includes("not already in this session"));
  assert.ok(claude.includes("continue and report it"));
  assert.ok(claude.split(/\s+/).length <= 80);
  assert.ok(!read("CLAUDE.md").includes("@SOUL.md"));

  const codex = read("AGENTS.md").trim();
  assert.ok(/CLAUDE\.md/.test(codex), "AGENTS.md must point a Codex session at CLAUDE.md");
  assert.ok(codex.split("\n").length === 1, "AGENTS.md must stay one pointer line");
  assert.ok(!codex.includes("@CLAUDE.md"), "Codex expands no import syntax");
});

check("manual size, markers, copy, and checksum", () => {
  const source = read(manualSource);
  const installed = read(manualCopy);
  assert.equal(source, installed);
  assert.equal(count(source, "<!-- claude-toolkit:knowledge-manual -->"), 1);
  // The manual loads at session start in every equipped project, so its size is
  // a running token cost. These caps are a deliberate ratchet: raise them only
  // when the owner has decided the added words are worth paying for everywhere.
  assert.ok(source.split("\n").length <= 280, "manual exceeds 280 lines");
  assert.ok(source.trim().split(/\s+/).length <= 1950, "manual exceeds 1,950 words");
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
  assert.ok(saveTest.includes("relevant to the project itself"));
  assert.ok(saveTest.includes("provided by the user or worked out by both the user and the agent"));
  assert.ok(neverSave.includes("A procedure that belongs in a rule or a skill"));
  // A fix this project worked out is a memory, not a procedure. The never-save
  // bullet above reads as if it swallows one, so both halves are asserted here:
  // recall is told to look for a past fix, and remember has to have saved it.
  assert.ok(saveTest.includes("How a real failure here was fixed is memory"));
  assert.ok(neverSave.includes("One past fix is not this"));
  assert.ok(neverSave.includes("Live status of current work"));
  assert.ok(neverSave.includes("Passwords, keys, and tokens"));
  assert.ok(approval.includes("Project value"));
  // A proposal must say the word Memory or Specification. The owner should not
  // have to decode a folder path to know what he is approving.
  assert.ok(approval.includes("Type: Memory, or Specification"));

  const remember = read("plugins/second-brain/skills/remember/SKILL.md");
  const scope = remember.indexOf("## 1. Gather and scope candidates");
  const search = remember.indexOf("## 2. Search before drafting");
  const draft = remember.indexOf("## 3. Draft and wait");
  assert.ok(scope !== -1 && scope < search && search < draft);
  assert.ok(remember.includes("knowledge/project.md"));
  // The manual no longer carries a numbered save test, so the "do not restate
  // what a committed file already says" gate lives in the skill's search step.
  // It is the most-used rejection reason in memory-self-improvement.md, so it
  // is asserted here rather than left uncovered.
  assert.ok(remember.includes("already contains the information fully"));
  assert.ok(remember.includes("separate global rule or skill review"));

  // The read side and the write side have to agree, or recall searches for
  // something remember was never willing to write.
  const recall = read("plugins/second-brain/skills/recall/SKILL.md");
  assert.ok(recall.includes("troubleshooting"));
  assert.ok(remember.includes("after working"));
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

check("the per-prompt reminder stays a pointer", () => {
  const source = read("plugins/second-brain/hooks/memory-reminder.mjs");
  assert.ok(source.includes("knowledge/README.md"),
    "the reminder does not name the manual");
  assert.ok(source.includes("<!-- claude-toolkit:knowledge-manual -->"),
    "the reminder does not gate on the managed manual marker");
  assert.ok(!source.includes("knowledge-policy:"),
    "the reminder copies a manual policy block instead of pointing at it");
  const body = source.match(/export const REMINDER = \[([\s\S]*?)\]\.join/);
  assert.ok(body, "the reminder text is no longer a single exported block");
  assert.ok(body[1].length <= 1600,
    "the reminder is long enough to be a copy of the manual, not a pointer");
});

check("the retired activation rule is gone and removable", () => {
  assert.ok(!existsSync(resolve(root, "plugins/project-init/machine/rules/activate-project-knowledge.md")),
    "the retired rule still ships");
  for (const path of [
    "plugins/project-init/machine/README.md",
    "plugins/project-init/README.md",
    "docs/toolkit-map.md",
    "README.md",
  ]) {
    assert.ok(!read(path).includes("activate-project-knowledge"),
      `${path} still promises the retired rule`);
  }
  const sync = read("plugins/project-init/skills/machine-sync/SKILL.md");
  assert.ok(sync.includes("activate-project-knowledge.md"),
    "machine-sync cannot tell an already-equipped machine what to remove");
  assert.ok(sync.includes("<!-- claude-toolkit:project-knowledge:start -->"),
    "machine-sync no longer names the Codex block to remove");
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

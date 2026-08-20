#!/usr/bin/env node

/**
 * Harness for the version 2 record schema and the core validator.
 *
 * It builds temporary projects, writes records into the four type folders,
 * runs the real command line, and asserts the required fields, every refusal
 * the schema owns, the legacy warning that must never fail a run, the check
 * catalog with its skipped entries, the exit mapping, and byte-for-byte
 * determinism. Every fixture is removed at the end.
 *
 * Run: node plugins/second-brain/tests/schema-harness.mjs
 */

import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const plugin = resolve(root, "plugins/second-brain");
const tool = resolve(plugin, "tools/memory.mjs");
const templates = resolve(plugin, "skills/second-brain/references/templates-v2");
const fixtures = [];
let passed = 0;

function ok(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed++;
  console.log(`PASS: ${message}`);
}

function fixture(name) {
  const path = mkdtempSync(join(realpathSync(tmpdir()), `memory-schema-${name}-`));
  fixtures.push(path);
  return path;
}

function write(base, path, content = "") {
  const absolute = resolve(base, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
}

function call(cwd, ...args) {
  const run = spawnSync(process.execPath, [tool, ...args], { cwd, encoding: "utf8" });
  let payload = null;
  try {
    payload = JSON.parse(run.stdout);
  } catch {
    payload = null;
  }
  return { code: run.status, stdout: run.stdout, stderr: run.stderr, payload };
}

const FRONT_MATTER = [
  "schema_version: 2",
  "project_id: schema-fixture",
  "project_root: .",
  "subroots: []",
  "privacy:",
  "  level: standard",
  "  external_transfer: denied",
  "  third_party_personal: refused",
  "profiles: []",
  "",
].join("\n");

/** A project shaped like the required core, plus whatever the test writes. */
function project(name, files = {}) {
  const base = fixture(name);
  write(base, "knowledge/project.md", `---\n${FRONT_MATTER}---\n\n# What this project is\n\nA fixture.\n`);
  write(base, "knowledge/map.md", "# Map\n\n| Role | Path |\n| --- | --- |\n| Specifications | `knowledge/specs/` |\n");
  write(base, "knowledge/current.md", "---\nupdated: 2026-08-01\n---\n\n# Current state\n\n## Current focus\n\nA fixture.\n");
  mkdirSync(resolve(base, "knowledge/specs"), { recursive: true });
  for (const type of ["facts", "decisions", "events", "patterns"]) {
    write(base, `knowledge/memory/${type}/.gitkeep`, "");
  }
  for (const [path, content] of Object.entries(files)) write(base, path, content);
  return base;
}

/**
 * Build one record. `fields` replaces or removes front matter lines by key,
 * `body` replaces everything under the front matter.
 */
function record({ fields = {}, body = null } = {}) {
  const base = {
    id: "fact-one",
    type: "fact",
    status: "active",
    epistemic_status: "documented",
    recorded_at: "2026-08-01",
    effective_from: "2026-08-01",
    effective_to: "null",
    occurred_at: "null",
    approval: ["  actor: owner", "  approved_at: 2026-08-01", "  action: add"],
    evidence: ["  - source_type: owner_statement", "    locator: issue-1#comment-2"],
    based_on: "[]",
  };
  const merged = { ...base, ...fields };
  const lines = [];
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) lines.push(`${key}:`, ...value);
    else lines.push(`${key}: ${value}`);
  }
  const text = body ?? "\n# The build uses Node built-ins only\n\nThe build uses Node built-ins only.\n";
  return `---\n${lines.join("\n")}\n---\n${text}`;
}

function entry(payload, id) {
  return payload.result.find((check) => check.id === id);
}

function codes(entries) {
  return entries.map((item) => item.code);
}

try {
  // A well-formed project with one record of each type.
  const good = project("good", {
    "knowledge/memory/facts/one.md": record(),
    "knowledge/memory/decisions/choice.md": record({
      fields: { id: "decision-one", type: "decision", epistemic_status: "approved" },
      body: [
        "",
        "# Refresh tokens use secure device storage",
        "",
        "Refresh tokens live in secure device storage.",
        "",
        "## Context",
        "",
        "The application needs durable refresh tokens.",
        "",
        "## Decision",
        "",
        "Refresh tokens live in secure device storage.",
        "",
        "## Reason",
        "",
        "Secure device storage is the approved protection boundary.",
        "",
        "## Rejected options",
        "",
        "- Ordinary application storage.",
        "",
        "## Consequences",
        "",
        "- Clients need the device security API.",
        "",
      ].join("\n"),
    }),
    "knowledge/memory/events/shipped.md": record({
      fields: {
        id: "event-one",
        type: "event",
        epistemic_status: "observed",
        occurred_at: "2026-08-01",
      },
      body: "\n# The validator shipped\n\nThe validator shipped on the first of August.\n",
    }),
    "knowledge/memory/patterns/repeat.md": record({
      fields: {
        id: "pattern-one",
        type: "pattern",
        epistemic_status: "inferred",
        based_on: ["  - knowledge/memory/events/shipped.md"],
      },
      body: "\n# Schema work lands before write work\n\nSchema work has landed before write work each time.\n",
    }),
  });

  const clean = call(good, "validate");
  ok(clean.code === 0, "a well-formed project exits 0");
  ok(clean.stderr === "", "validate writes nothing to standard error");
  ok(clean.payload !== null, "validate prints one JSON object");
  ok(clean.payload.operation === "memory_validate", "the envelope names the tool-surface operation");
  ok(clean.payload.status === "ok", "a project with no failing check reports status ok");
  ok(Array.isArray(clean.payload.result), "the result is one entry per check");
  ok(clean.payload.result.length === 22, "the catalog carries all twenty-two checks");
  ok(
    clean.payload.result.map((check) => check.id).join(",")
      === Array.from({ length: 22 }, (unused, index) => `MV-${String(index + 1).padStart(2, "0")}`).join(","),
    "the checks are reported in MV-01 to MV-22 order",
  );
  ok(
    clean.payload.result.every((check) => check.version === "2.0"),
    "every check reports its version",
  );
  ok(
    clean.payload.result.every((check) => Object.keys(check).join(",") === "id,version,status,findings,skipped_because"),
    "every check entry keeps the contract field order",
  );
  ok(entry(clean.payload, "MV-01").status === "pass", "the required core passes MV-01");
  ok(
    entry(clean.payload, "MV-01").skipped_because.includes("route half"),
    "MV-01 names the half of itself a project with no host route cannot run",
  );
  ok(entry(clean.payload, "MV-03").status === "pass", "well-formed records pass MV-03");
  ok(entry(clean.payload, "MV-04").status === "pass", "records with a basis pass MV-04");
  ok(entry(clean.payload, "MV-18").status === "skipped", "a project with no applied migration skips MV-18");
  ok(
    entry(clean.payload, "MV-18").skipped_because.includes("last-migration.json"),
    "MV-18 names the receipt it would have inspected",
  );
  ok(
    clean.payload.result
      .filter((check) => check.status === "skipped")
      .every((check) => typeof check.skipped_because === "string" && check.skipped_because.length > 0),
    "every skipped check names why it did not run",
  );
  ok(
    clean.payload.result.filter((check) => check.status === "fail").length === 0,
    "a well-formed project fails no check",
  );
  ok(clean.payload.errors.length === 0, "a well-formed project produces no errors");
  ok(call(good, "validate").stdout === clean.stdout, "two validate runs produce the same bytes");

  // The shipped record templates validate where they belong.
  const fromTemplates = project("templates");
  for (const [type, folder] of Object.entries({
    fact: "facts", decision: "decisions", event: "events", pattern: "patterns",
  })) {
    cpSync(
      resolve(templates, `records/${type}.md`),
      resolve(fromTemplates, `knowledge/memory/${folder}/${type}.md`),
    );
  }
  const templateRun = call(fromTemplates, "validate");
  ok(templateRun.code === 0, "the four shipped record templates validate");
  ok(entry(templateRun.payload, "MV-03").status === "pass", "the templates carry every required field");
  ok(entry(templateRun.payload, "MV-04").status === "pass", "the pattern template names what it rests on");

  // Every required field is required.
  for (const field of ["id", "type", "status", "epistemic_status", "recorded_at", "approval", "evidence"]) {
    const base = project(`missing-${field}`, {
      // A second field is kept so the record is not read as a legacy record.
      "knowledge/memory/facts/one.md": record({ fields: { [field]: undefined } }),
    });
    const run = call(base, "validate");
    ok(run.code === 1, `a record missing ${field} fails the run`);
    ok(entry(run.payload, "MV-03").status === "fail", `a record missing ${field} fails MV-03`);
  }

  // The refusals the schema owns.
  const noEvidence = project("no-evidence", {
    "knowledge/memory/facts/one.md": record({ fields: { evidence: undefined } }),
  });
  const noEvidenceRun = call(noEvidence, "validate");
  ok(
    codes(noEvidenceRun.payload.errors).includes("record/missing-evidence"),
    "a record with no evidence names the missing-evidence code",
  );
  ok(noEvidenceRun.payload.status === "refused", "a failing check refuses the run");

  const partialEvidence = project("partial-evidence", {
    "knowledge/memory/facts/one.md": record({
      fields: { evidence: ["  - source_type: owner_statement"] },
    }),
  });
  ok(
    codes(call(partialEvidence, "validate").payload.errors).includes("record/missing-evidence"),
    "an evidence entry with no locator is a missing-evidence failure",
  );

  const inference = project("inference", {
    "knowledge/memory/facts/one.md": record({ fields: { epistemic_status: "inferred" } }),
  });
  const inferenceRun = call(inference, "validate");
  ok(inferenceRun.code === 1, "an inference with an empty based_on fails the run");
  ok(entry(inferenceRun.payload, "MV-04").status === "fail", "the empty basis fails MV-04, not MV-03");
  ok(entry(inferenceRun.payload, "MV-03").status === "pass", "MV-03 stays clean when only the basis is missing");
  ok(
    codes(inferenceRun.payload.errors).includes("record/inference-without-basis"),
    "the empty basis names the inference-without-basis code",
  );

  const pattern = project("pattern", {
    "knowledge/memory/patterns/one.md": record({
      fields: { id: "pattern-two", type: "pattern", epistemic_status: "observed" },
      body: "\n# Reviews cluster on Fridays\n\nReviews cluster on Fridays.\n",
    }),
  });
  ok(
    codes(call(pattern, "validate").payload.errors).includes("record/inference-without-basis"),
    "a pattern with an empty based_on is refused whatever its epistemic status",
  );

  const event = project("event", {
    "knowledge/memory/events/one.md": record({
      fields: { id: "event-two", type: "event", epistemic_status: "observed" },
      body: "\n# The cutover ran\n\nThe cutover ran.\n",
    }),
  });
  ok(
    call(event, "validate").payload.errors.some((item) => item.message.includes("occurred_at")),
    "an event with no occurred_at is refused",
  );

  const range = project("range", {
    "knowledge/memory/events/one.md": record({
      fields: {
        id: "event-three",
        type: "event",
        epistemic_status: "reported",
        occurred_at: "2026-06 to 2026-07, exact date unknown",
      },
      body: "\n# The migration ran\n\nThe migration ran at some point that summer.\n",
    }),
  });
  ok(call(range, "validate").code === 0, "an honest date range satisfies occurred_at");

  const decision = project("decision", {
    "knowledge/memory/decisions/one.md": record({
      fields: { id: "decision-two", type: "decision", epistemic_status: "approved" },
      body: [
        "",
        "# Use Node built-ins",
        "",
        "The tools use Node built-ins only.",
        "",
        "## Context",
        "",
        "Dependencies are refused.",
        "",
        "## Decision",
        "",
        "Node built-ins only.",
        "",
        "## Reason",
        "",
        "Nothing to install and nothing to update.",
        "",
        "## Consequences",
        "",
        "- More code to write by hand.",
        "",
      ].join("\n"),
    }),
  });
  const decisionRun = call(decision, "validate");
  ok(
    decisionRun.payload.errors.some((item) => item.message.includes("rejected options")),
    "a decision missing one of its required parts names the part",
  );
  ok(decisionRun.code === 1, "an incomplete decision fails the run");

  const duplicate = project("duplicate", {
    "knowledge/memory/facts/one.md": record(),
    "knowledge/memory/facts/two.md": record(),
  });
  ok(
    codes(call(duplicate, "validate").payload.errors).includes("record/duplicate-id"),
    "two records claiming one id are refused",
  );

  const wrongFolder = project("wrong-folder", {
    "knowledge/memory/events/one.md": record(),
  });
  ok(
    call(wrongFolder, "validate").payload.errors.some((item) => item.message.includes("events folder")),
    "a record in the folder of another type is refused",
  );

  const badValue = project("bad-value", {
    "knowledge/memory/facts/one.md": record({ fields: { epistemic_status: "probably" } }),
  });
  ok(
    call(badValue, "validate").payload.errors.some((item) => item.message.includes("allowed set")),
    "a value outside its allowed set is refused",
  );

  const badDate = project("bad-date", {
    "knowledge/memory/facts/one.md": record({ fields: { recorded_at: "August 2026" } }),
  });
  ok(
    call(badDate, "validate").payload.errors.some((item) => item.message.includes("YYYY-MM-DD")),
    "a date that is not a calendar date is refused",
  );

  const noSummary = project("no-summary", {
    "knowledge/memory/facts/one.md": record({ body: "\n# A heading with nothing under it\n" }),
  });
  ok(
    call(noSummary, "validate").payload.errors.some((item) => item.message.includes("summary")),
    "a record with no summary under the H1 is refused",
  );

  const longSummary = project("long-summary", {
    "knowledge/memory/facts/one.md": record({
      body: "\n# Two sentences\n\nThe first sentence stands. The second one does not belong here.\n",
    }),
  });
  ok(
    call(longSummary, "validate").payload.errors.some((item) => item.message.includes("more than one sentence")),
    "a summary of more than one sentence is refused",
  );

  const unknownField = project("unknown-field", {
    "knowledge/memory/facts/one.md": record({ fields: { certainty: "high" } }),
  });
  ok(
    call(unknownField, "validate").payload.errors.some((item) => item.message.includes("not defined by record schema")),
    "a field the schema does not define is refused",
  );

  // Nothing in a message carries record body text.
  ok(
    !JSON.stringify(call(longSummary, "validate").payload).includes("The second one does not belong here"),
    "no message carries record body text",
  );

  // A migrated record missing v2 metadata warns and never fails.
  const legacy = project("legacy", {
    "knowledge/memory/decisions/old.md": [
      "---",
      "source: user-said-it",
      "date: 2026-02-01",
      "tags: [routing]",
      "---",
      "",
      "# The old record still reads",
      "",
      "It was written before the version 2 schema existed.",
      "",
    ].join("\n"),
  });
  const legacyRun = call(legacy, "validate");
  ok(legacyRun.code === 0, "a legacy record never fails the run");
  ok(legacyRun.payload.status === "ok", "a legacy record leaves the run at status ok");
  ok(entry(legacyRun.payload, "MV-03").status === "pass", "a legacy record does not fail MV-03");
  ok(
    codes(legacyRun.payload.warnings).includes("record/legacy-gap"),
    "a legacy record raises the legacy-gap warning",
  );
  const gap = legacyRun.payload.warnings.find((item) => item.code === "record/legacy-gap");
  ok(gap.detail.includes("id") && gap.detail.includes("evidence"), "the warning names the missing fields");
  ok(gap.path === "knowledge/memory/decisions/old.md", "the warning names the record it is about");

  // The required core.
  const noMap = fixture("no-map");
  write(noMap, "knowledge/project.md", `---\n${FRONT_MATTER}---\n\n# Fixture\n\nA fixture.\n`);
  const coreRun = call(noMap, "validate");
  ok(coreRun.code === 1, "a project missing the required core fails the run");
  ok(entry(coreRun.payload, "MV-01").status === "fail", "the missing core fails MV-01");
  ok(
    coreRun.payload.errors.some((item) => item.path === "knowledge/map.md"),
    "the failure names each missing required path",
  );
  ok(
    coreRun.payload.errors.some((item) => item.path === "knowledge/memory/facts"),
    "a missing record folder is part of the same failure",
  );

  // A project with only the required core and no records passes.
  const empty = project("empty");
  ok(call(empty, "validate").code === 0, "a project with only the required core passes");

  // Call shape.
  const filtered = call(good, "validate", "--check", "MV-03,MV-04");
  ok(filtered.code === 0, "a filtered run exits on the checks it ran");
  ok(filtered.payload.result.length === 2, "--check limits the run to the named checks");
  ok(
    call(good, "validate", "--check", "MV-99").code === 2,
    "an unknown check id could not be evaluated",
  );
  ok(
    codes(call(good, "validate", "--check", "MV-99").payload.errors).includes("cli/invalid-invocation"),
    "an unknown check id names the invalid-invocation code",
  );
  ok(call(good, "validate", "--check").code === 2, "--check with no value is an invalid invocation");
  ok(call(good, "validate", "--nope").code === 2, "a flag validate does not define is an invalid invocation");
  ok(call(good, "validate", "--fixtures").code === 0, "--fixtures is accepted");
  ok(call(good, "capabilities", "--json").code === 2, "a flag an operation does not define is an invalid invocation");
  ok(call(good, "nonsense").code === 2, "an unknown operation is an invalid invocation");
  ok(
    codes(call(good, "nonsense").payload.errors).includes("cli/invalid-invocation"),
    "an unknown operation names the invalid-invocation code",
  );

  console.log(`ALL PASS (${passed} checks), FAIL: 0`);
} finally {
  for (const path of fixtures.reverse()) rmSync(path, { recursive: true, force: true });
}

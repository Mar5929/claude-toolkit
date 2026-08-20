#!/usr/bin/env node

/**
 * Harness for the version 2 lifecycle and pin operations.
 *
 * It builds temporary projects and runs the real operations end to end: ADD,
 * CONFIRM, CORRECT, SUPERSEDE, RETIRE, MERGE, DELETE, and NOOP as the default
 * outcome, then PIN and UNPIN. Every one of them goes through the same
 * two-phase review as any other write, so the checks below assert both halves:
 * a proposal that changes nothing, and an approved apply that changes exactly
 * the paths it reported.
 *
 * The acceptance tests this file proves are named where they are proved. AT-10
 * is evidence consolidation, AT-11 is the superseded timeline, AT-12 is the
 * retirement phrase hunt, and AT-23 is two conflicting meanings staying
 * separate. AT-05 is a pinned statement reaching a cold session, AT-07 is
 * unpin removing startup visibility and nothing else, AT-08 is supersede and
 * retire dropping the old pin without pinning a successor, and AT-09 is the
 * over-budget refusal. AT-06, the cross-project pair, is in the boot brief
 * harness, where startup is what the leak would show up in.
 *
 * Run: node plugins/second-brain/tests/lifecycle-harness.mjs
 */

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { resolveScope } from "../tools/lib/scope.mjs";
import { parseRecord } from "../tools/lib/record-schema.mjs";
import { parsePins, summaryHash } from "../tools/lib/pins.mjs";
import { DEGRADATION_STEPS, assembleBootBrief, renderBrief } from "../tools/boot-brief.mjs";
import {
  RETIREMENT_EXEMPTIONS_SECTION,
  RETIRED_PHRASES_SECTION,
  lifecycle,
  noop,
  phraseHunt,
  pinOperation,
  readSection,
  retiredPhraseSets,
  sha256,
} from "../tools/memory-write.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const plugin = resolve(root, "plugins/second-brain");
const tool = resolve(plugin, "tools/memory.mjs");
const templates = resolve(plugin, "skills/second-brain/references/templates-v2/knowledge");
const fixtures = [];
let passed = 0;

/** Module calls take a fixed clock, so nothing here depends on the wall clock. */
const NOW = new Date("2026-08-20T12:00:00Z");
const TODAY = "2026-08-20";

function ok(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed++;
  console.log(`PASS: ${message}`);
}

function fixture(name) {
  const path = mkdtempSync(join(realpathSync(tmpdir()), `memory-lifecycle-${name}-`));
  fixtures.push(path);
  return path;
}

function write(base, path, content = "") {
  const absolute = resolve(base, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
}

function read(base, path) {
  return readFileSync(resolve(base, path), "utf8");
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

function codes(entries) {
  return (entries ?? []).map((entry) => entry.code);
}

const CURRENT = [
  "---",
  "updated: 2026-08-19",
  "---",
  "",
  "# Current state",
  "",
  "## Current focus",
  "",
  "Building the lifecycle operations.",
  "",
  "## Blockers",
  "",
  "None.",
  "",
  "## Next step",
  "",
  "Run the lifecycle harness.",
  "",
  "## Handoff",
  "",
  "The seven writing operations are built.",
  "",
].join("\n");

/** A project shaped like the required core, from the shipped templates. */
function project(name, files = {}) {
  const base = fixture(name);
  cpSync(templates, resolve(base, "knowledge"), { recursive: true });
  write(
    base,
    "knowledge/project.md",
    read(base, "knowledge/project.md").replace("replace-with-a-stable-project-id", `fixture-${name}`),
  );
  write(base, "knowledge/current.md", CURRENT);
  write(base, "knowledge/specs/example.md", "# Example\n\nApproved behavior.\n");
  for (const [path, content] of Object.entries(files)) write(base, path, content);
  return base;
}

/**
 * One record file. Every field the schema requires is filled, so a check that
 * fails here is failing on the lifecycle rule it names and nothing else.
 */
function record(fields) {
  const {
    id,
    type = "fact",
    status = "active",
    epistemic = "documented",
    evidence = [["owner_statement", "knowledge/specs/example.md"]],
    extra = [],
    title,
    summary,
    sections = [],
  } = fields;

  const lines = [
    "---",
    "schema_version: 2",
    `id: ${id}`,
    `type: ${type}`,
    `status: ${status}`,
    `epistemic_status: ${epistemic}`,
    "recorded_at: 2026-08-19",
    "approval:",
    "  actor: owner",
    "  approved_at: 2026-08-19",
    `  action: ${status === "active" ? "add" : status}`,
    "evidence:",
  ];
  for (const [sourceType, locator] of evidence) {
    lines.push(`  - source_type: ${sourceType}`, `    locator: ${locator}`);
  }
  lines.push("based_on: []", ...extra, "---", "", `# ${title}`, "", summary, "");
  for (const [heading, body] of sections) lines.push(`## ${heading}`, "", body, "");
  return lines.join("\n");
}

function scopeOf(base) {
  const scope = resolveScope(base);
  if (!scope.ok) throw new Error(`FAIL: the fixture scope did not resolve: ${scope.error.message}`);
  return scope;
}

function stage(base, contents, name = "staged.md") {
  write(base, name, contents);
  return resolve(base, name);
}

/** Propose one lifecycle operation. Nothing canonical changes. */
function propose(base, options) {
  return lifecycle(scopeOf(base), { ...options, mode: "propose", now: NOW });
}

/** Propose, then approve the exact reviewed bytes. */
function through(base, options) {
  const proposal = propose(base, options);
  if (!proposal.ok || proposal.status !== "awaiting-approval") return { proposal, applied: null };
  const reviewText = read(base, proposal.result.review_file);
  const applied = lifecycle(scopeOf(base), {
    operation: options.operation,
    mode: "apply",
    proposalId: proposal.result.proposal_id,
    contentHash: sha256(reviewText),
    now: NOW,
  });
  return { proposal, applied };
}

function frontMatter(base, path) {
  return parseRecord(read(base, path)).data;
}

/** Propose one pin operation. Nothing canonical changes. */
function proposePin(base, options) {
  return pinOperation(scopeOf(base), { ...options, mode: "propose", now: NOW });
}

/** Approve the exact reviewed bytes of a pin proposal. */
function applyPin(base, operation, proposal) {
  return pinOperation(scopeOf(base), {
    operation,
    mode: "apply",
    proposalId: proposal.result.proposal_id,
    contentHash: sha256(read(base, proposal.result.review_file)),
    now: NOW,
  });
}

/** One numbered block of a rendered brief, used to read the pin block. */
function blockText(text, number) {
  const start = text.indexOf(`## ${number}. `);
  if (start < 0) return "";
  const next = text.indexOf(`\n## ${number + 1}. `, start);
  return next < 0 ? text.slice(start) : text.slice(start, next);
}

function checkStatus(base, id) {
  const run = call(base, "validate", "--check", id);
  return run.payload.result.find((entry) => entry.id === id);
}

const TOKEN_SUMMARY = "Refresh tokens live in secure device storage, not ordinary application storage.";

const FACT_TOKENS = record({
  id: "fact-token-storage-001",
  title: "Refresh tokens use secure device storage",
  summary: TOKEN_SUMMARY,
});

try {
  // -------------------------------------------------------------------------
  // ADD, and the two refusals that keep one meaning in one record.
  // -------------------------------------------------------------------------
  const added = project("add");
  const addProposal = propose(added, {
    operation: "add",
    type: "fact",
    contents: FACT_TOKENS,
  });
  ok(addProposal.status === "awaiting-approval", "add proposes rather than writing");
  ok(
    addProposal.result.destination === "knowledge/memory/facts/fact-token-storage-001.md",
    "add derives the destination from the record type and its id",
  );
  ok(
    !existsSync(resolve(added, "knowledge/memory/facts/fact-token-storage-001.md")),
    "an add proposal creates no canonical file",
  );
  ok(
    addProposal.result.source_hashes.some((entry) => entry.locator === "knowledge/specs/example.md"),
    "the cited evidence is a bound input of the approval",
  );

  const addApplied = lifecycle(scopeOf(added), {
    operation: "add",
    mode: "apply",
    proposalId: addProposal.result.proposal_id,
    contentHash: sha256(read(added, addProposal.result.review_file)),
    now: NOW,
  });
  ok(addApplied.ok, "an approved add writes");
  ok(addApplied.result.added === "fact-token-storage-001", "the add result names the record it added");
  ok(
    addApplied.result.changed_paths.join(",") === "knowledge/memory/facts/fact-token-storage-001.md",
    "the add reports exactly the path it wrote",
  );
  ok(
    frontMatter(added, "knowledge/memory/facts/fact-token-storage-001.md").approval.approved_at === TODAY,
    "the coordinator stamps the approval that actually happened",
  );

  const duplicateId = propose(added, {
    operation: "add",
    type: "fact",
    contents: record({
      id: "fact-token-storage-001",
      title: "Something else entirely",
      summary: "A different meaning under a used id.",
    }),
  });
  ok(!duplicateId.ok, "an add that reuses an id is refused");
  ok(codes(duplicateId.errors).includes("record/duplicate-id"), "the reused id names record/duplicate-id");

  const duplicateMeaning = propose(added, {
    operation: "add",
    type: "fact",
    contents: record({
      id: "fact-token-storage-999",
      title: "Refresh tokens use secure device storage",
      summary: TOKEN_SUMMARY,
    }),
  });
  ok(!duplicateMeaning.ok, "an add that repeats an existing meaning is refused");
  ok(
    duplicateMeaning.errors[0].message.includes("confirm"),
    "the duplicate meaning is routed to confirm or correct rather than to a second record",
  );
  ok(
    readdirSync(resolve(added, "knowledge/memory/facts")).filter((name) => name.endsWith(".md")).length === 1,
    "neither refusal left a second record behind",
  );

  const wrongFolder = propose(added, {
    operation: "add",
    type: "fact",
    contents: FACT_TOKENS,
    destination: "knowledge/memory/decisions/fact-token-storage-001.md",
  });
  ok(!wrongFolder.ok, "a record staged into the folder of another type is refused");

  // -------------------------------------------------------------------------
  // AT-10. Two sources supporting unchanged meaning stay two evidence entries
  // on one current record, and the summary is never rewritten.
  // -------------------------------------------------------------------------
  const confirmed = through(added, {
    operation: "confirm",
    id: "fact-token-storage-001",
    evidence: "knowledge/map.md",
    sourceType: "documentation",
  });
  ok(confirmed.applied.ok, "confirm writes through the same two-phase review");
  ok(confirmed.applied.result.confirmed === "fact-token-storage-001", "the confirm result names the record");

  const afterConfirm = frontMatter(added, "knowledge/memory/facts/fact-token-storage-001.md");
  ok(afterConfirm.evidence.length === 2, "AT-10: one current record carries both supporting sources");
  ok(
    afterConfirm.evidence.map((entry) => entry.locator).join(",") === "knowledge/specs/example.md,knowledge/map.md",
    "AT-10: the second source is an evidence entry, not a second record",
  );
  ok(afterConfirm.confirmations.length === 1, "the confirmation records who rechecked it and when");
  ok(afterConfirm.confirmations[0].confirmed_at === TODAY, "the confirmation carries the date of the recheck");
  ok(
    parseRecord(read(added, "knowledge/memory/facts/fact-token-storage-001.md")).summary === TOKEN_SUMMARY,
    "AT-10: confirm never rewrites the approved summary",
  );
  ok(
    confirmed.proposal.result.pin_statement.includes("stays"),
    "confirm states that any pin on the record survives untouched",
  );
  ok(
    readdirSync(resolve(added, "knowledge/memory/facts")).filter((name) => name.endsWith(".md")).length === 1,
    "AT-10: the project still holds exactly one record for this meaning",
  );

  // NOOP is the default outcome: the same confirmation again changes nothing.
  const again = propose(added, {
    operation: "confirm",
    id: "fact-token-storage-001",
    evidence: "knowledge/map.md",
    sourceType: "documentation",
  });
  ok(again.status === "noop", "a lifecycle call that would change no byte reports NOOP");
  ok(again.result.outcome === "NOOP", "the NOOP result says so in a word the skill can render");
  ok(again.result.changed_paths.length === 0, "a NOOP changes no path");

  const unknown = propose(added, { operation: "confirm", id: "fact-nothing", evidence: "knowledge/map.md" });
  ok(!unknown.ok && codes(unknown.errors).includes("record/unknown-id"), "an unknown id is refused");

  // -------------------------------------------------------------------------
  // CORRECT. The record was wrong, so the reason, the date, the approval, and
  // the correcting evidence land on the current record.
  // -------------------------------------------------------------------------
  const corrected = project("correct", {
    "knowledge/memory/facts/fact-build.md": record({
      id: "fact-build",
      title: "The build runs on Node",
      summary: "The build runs on Node and nothing else.",
    }),
  });

  const noNewEvidence = propose(corrected, {
    operation: "correct",
    id: "fact-build",
    reason: "It named no version.",
    contents: record({
      id: "fact-build",
      title: "The build runs on Node 22",
      summary: "The build runs on Node 22 and nothing else.",
    }),
  });
  ok(!noNewEvidence.ok, "a correction with no correcting evidence is refused");
  ok(
    codes(noNewEvidence.errors).includes("record/missing-evidence"),
    "the missing correcting evidence names record/missing-evidence",
  );

  const renamed = propose(corrected, {
    operation: "correct",
    id: "fact-build",
    reason: "It named no version.",
    contents: record({
      id: "fact-build-renamed",
      title: "The build runs on Node 22",
      summary: "The build runs on Node 22 and nothing else.",
      evidence: [["owner_statement", "knowledge/current.md"]],
    }),
  });
  ok(!renamed.ok, "a correction that changes the record id is refused");

  const correction = through(corrected, {
    operation: "correct",
    id: "fact-build",
    reason: "It named no version, so a future agent could not tell which Node.",
    contents: record({
      id: "fact-build",
      title: "The build runs on Node 22",
      summary: "The build runs on Node 22 and nothing else.",
      evidence: [
        ["owner_statement", "knowledge/specs/example.md"],
        ["documentation", "knowledge/current.md"],
      ],
    }),
  });
  ok(correction.applied.ok, "an approved correction writes");
  const afterCorrect = frontMatter(corrected, "knowledge/memory/facts/fact-build.md");
  ok(afterCorrect.approval.action === "correct", "the correction records the action");
  ok(afterCorrect.approval.approved_at === TODAY, "the correction records the date it was approved");
  ok(
    afterCorrect.approval.reason.includes("named no version"),
    "the correction records the reason on the current record",
  );
  ok(
    correction.proposal.result.pin_statement.includes("removed"),
    "a correction that changes the summary states that the pin is removed unless it is re-approved",
  );
  ok(
    correction.applied.result.changed_paths.join(",") === "knowledge/memory/facts/fact-build.md",
    "a correction rewrites the record in place rather than creating a second one",
  );

  // -------------------------------------------------------------------------
  // AT-11. SUPERSEDE. Reciprocal links and both effective dates in one
  // transaction, and the old record stays on disk for the timeline.
  // -------------------------------------------------------------------------
  const timeline = project("supersede", {
    "knowledge/memory/facts/fact-storage.md": record({
      id: "fact-storage",
      title: "Refresh tokens use secure device storage",
      summary: TOKEN_SUMMARY,
    }),
  });
  const superseded = through(timeline, {
    operation: "supersede",
    oldId: "fact-storage",
    contents: record({
      id: "fact-enclave",
      title: "Refresh tokens use the hardware enclave",
      summary: "Refresh tokens live in the hardware enclave.",
    }),
  });
  ok(superseded.applied.ok, "an approved supersession writes");
  ok(
    superseded.applied.result.changed_paths.length === 2,
    "AT-11: the successor and the old record change in one reported transaction",
  );
  ok(
    superseded.applied.result.superseded === "fact-storage" && superseded.applied.result.successor === "fact-enclave",
    "the supersession result names both sides",
  );

  const oldRecord = frontMatter(timeline, "knowledge/memory/facts/fact-storage.md");
  const newRecord = frontMatter(timeline, "knowledge/memory/facts/fact-enclave.md");
  ok(oldRecord.status === "superseded", "AT-11: the old record leaves current truth");
  ok(oldRecord.superseded_by === "fact-enclave", "AT-11: the old record links forward");
  ok(oldRecord.effective_to === TODAY, "AT-11: the old record is dated where its period ended");
  ok(newRecord.supersedes === "fact-storage", "AT-11: the successor links back");
  ok(newRecord.effective_from === TODAY, "AT-11: the successor is dated where its period began");
  ok(newRecord.status === "active", "AT-11: the successor is the current record");
  ok(
    existsSync(resolve(timeline, "knowledge/memory/facts/fact-storage.md")),
    "AT-11: the superseded record remains available for history and timeline questions",
  );
  ok(
    parseRecord(read(timeline, "knowledge/memory/facts/fact-storage.md")).summary === TOKEN_SUMMARY,
    "AT-11: superseding erases none of the old record's meaning",
  );
  ok(
    superseded.proposal.result.pin_statement.includes("not pinned automatically"),
    "the supersession states that the successor is never pinned automatically",
  );
  ok(checkStatus(timeline, "MV-05").status === "pass", "MV-05 passes on a reciprocal supersession");

  // A one-sided supersession is what MV-05 exists to catch.
  write(
    timeline,
    "knowledge/memory/facts/fact-storage.md",
    read(timeline, "knowledge/memory/facts/fact-storage.md").replace("superseded_by: fact-enclave", "superseded_by: null"),
  );
  const oneSided = checkStatus(timeline, "MV-05");
  ok(oneSided.status === "fail", "MV-05 fails when only one side of a supersession links");
  ok(
    oneSided.findings.some((finding) => finding.message.includes("does not link back")),
    "MV-05 says which side did not link back",
  );

  const sameId = propose(timeline, {
    operation: "supersede",
    oldId: "fact-enclave",
    contents: record({
      id: "fact-enclave",
      title: "Refresh tokens use the hardware enclave",
      summary: "A successor carrying the id it replaces.",
    }),
  });
  ok(!sameId.ok, "a successor that reuses the id it replaces is refused");

  // -------------------------------------------------------------------------
  // AT-12. RETIRE. The phrase hunt finds every surviving current use.
  // -------------------------------------------------------------------------
  const retiring = project("retire", {
    "knowledge/memory/facts/fact-daily.md": record({
      id: "fact-daily",
      title: "The team runs a daily sync",
      summary: "The team runs a daily sync every weekday morning.",
    }),
    "knowledge/specs/meetings.md": "# Meetings\n\nThe team runs a daily sync every weekday.\n",
    "knowledge/specs/history.md": "# History\n\n> The team runs a daily sync, as we said in 2025.\n",
    "notes/plan.md": "# Plan\n\nThe team runs a daily sync, so plan around it.\n",
  });

  const retireProposal = propose(retiring, {
    operation: "retire",
    id: "fact-daily",
    reason: "The team stopped running it in August.",
    phrases: ["The team runs a daily sync"],
    exemptions: [["notes/plan.md", "the plan quotes the old wording on purpose"]],
  });
  ok(retireProposal.status === "awaiting-approval", "retire proposes rather than writing");

  const found = retireProposal.result.phrase_locations;
  const outstanding = found.filter((entry) => entry.state === "needs-work");
  ok(
    outstanding.some((entry) => entry.path === "knowledge/specs/meetings.md"),
    "AT-12: the hunt finds a surviving current use of the retired phrase",
  );
  ok(
    outstanding.every((entry) => entry.path !== "knowledge/specs/history.md"),
    "AT-12: an explicit historical quotation is not outstanding work",
  );
  ok(
    found.some((entry) => entry.path === "notes/plan.md" && entry.state === "exempted"),
    "AT-12: an exempted path is listed with its exemption rather than as work",
  );
  ok(
    found.every((entry) => entry.path !== "knowledge/memory/facts/fact-daily.md"),
    "AT-12: the retiring record itself is not hunted",
  );
  ok(
    found.every((entry) => typeof entry.line === "number" && entry.line > 0),
    "AT-12: every location carries its path and its line",
  );

  const retired = lifecycle(scopeOf(retiring), {
    operation: "retire",
    mode: "apply",
    proposalId: retireProposal.result.proposal_id,
    contentHash: sha256(read(retiring, retireProposal.result.review_file)),
    now: NOW,
  });
  ok(retired.ok, "an approved retirement writes");
  ok(retired.result.retired === "fact-daily", "the retirement result names the record");
  ok(
    retired.result.phrase_locations.some((entry) => entry.path === "knowledge/specs/meetings.md"),
    "AT-12: the result lists the locations that still need work",
  );
  ok(
    retired.result.phrase_locations.every((entry) => entry.state === "needs-work"),
    "AT-12: the result lists only what is still outstanding",
  );

  const retiredRecord = frontMatter(retiring, "knowledge/memory/facts/fact-daily.md");
  ok(retiredRecord.status === "retired", "the retired record leaves current truth");
  ok(retiredRecord.retired_because.includes("stopped running it"), "the retirement records its reason");
  ok(retiredRecord.effective_to === TODAY, "the retirement is dated");
  ok(
    existsSync(resolve(retiring, "knowledge/memory/facts/fact-daily.md")),
    "the retired record remains available for history",
  );

  const retiredText = read(retiring, "knowledge/memory/facts/fact-daily.md");
  ok(
    readSection(retiredText, RETIRED_PHRASES_SECTION).length === 1,
    "the retiring record declares the phrase, so the validator can repeat the hunt",
  );
  ok(
    readSection(retiredText, RETIREMENT_EXEMPTIONS_SECTION)[0].includes("notes/plan.md"),
    "the retiring record records the exemption and its reason",
  );
  ok(retiredPhraseSets(scopeOf(retiring))[0].phrases[0] === "The team runs a daily sync", "the declared phrase reads back");
  ok(
    retiredPhraseSets(scopeOf(retiring))[0].exemptions[0][0] === "notes/plan.md",
    "the declared exemption reads back with its path",
  );

  const mv08 = checkStatus(retiring, "MV-08");
  ok(mv08.status === "fail", "AT-12: MV-08 repeats the hunt and fails while a current use survives");
  ok(
    mv08.findings.some((finding) => finding.path === "knowledge/specs/meetings.md"),
    "AT-12: MV-08 names the surviving location",
  );
  ok(
    mv08.findings.every((finding) => finding.path !== "notes/plan.md"),
    "AT-12: MV-08 honors the recorded exemption",
  );

  write(retiring, "knowledge/specs/meetings.md", "# Meetings\n\nThe team meets when it needs to.\n");
  ok(checkStatus(retiring, "MV-08").status === "pass", "AT-12: MV-08 passes once the surviving use is corrected");

  const noPhrase = propose(retiring, { operation: "retire", id: "fact-daily", reason: "No phrase named." });
  ok(!noPhrase.ok, "a retirement that names no phrase is refused");

  // -------------------------------------------------------------------------
  // AT-23. MERGE. Identical meaning only, and conflicting meanings stay
  // separate, linked, and independently evidenced.
  // -------------------------------------------------------------------------
  const duplicates = project("merge", {
    "knowledge/memory/facts/fact-node-a.md": record({
      id: "fact-node-a",
      title: "The build runs on Node",
      summary: "The build runs on Node and nothing else.",
      evidence: [["owner_statement", "knowledge/specs/example.md"]],
    }),
    "knowledge/memory/facts/fact-node-b.md": record({
      id: "fact-node-b",
      title: "The build runs on Node",
      summary: "The build runs on Node and nothing else.",
      evidence: [["documentation", "knowledge/map.md"]],
    }),
    "knowledge/memory/facts/fact-deno.md": record({
      id: "fact-deno",
      title: "The build runs on Deno",
      summary: "The build runs on Deno instead.",
      evidence: [["reported", "knowledge/current.md"]],
      extra: ["conflicts_with:", "  - fact-node-a"],
      epistemic: "reported",
    }),
  });

  const noChoice = propose(duplicates, { operation: "merge", ids: ["fact-node-a", "fact-node-b"], survivor: "fact-node-a" });
  ok(!noChoice.ok, "a merge with no pin choice is refused, because the choice is the owner's");

  const conflicting = propose(duplicates, {
    operation: "merge",
    ids: ["fact-node-a", "fact-deno"],
    survivor: "fact-node-a",
    pin: "drop",
  });
  ok(!conflicting.ok, "AT-23: a merge of two different meanings is refused");
  ok(
    codes(conflicting.errors).includes("record/merge-conflict"),
    "AT-23: the refusal names record/merge-conflict",
  );
  ok(
    existsSync(resolve(duplicates, "knowledge/memory/facts/fact-deno.md")),
    "AT-23: both conflicting records stay on disk",
  );
  ok(
    frontMatter(duplicates, "knowledge/memory/facts/fact-deno.md").conflicts_with[0] === "fact-node-a",
    "AT-23: the conflicting records stay linked through conflicts_with",
  );
  ok(
    frontMatter(duplicates, "knowledge/memory/facts/fact-deno.md").evidence[0].locator === "knowledge/current.md",
    "AT-23: each conflicting record keeps its own evidence",
  );

  const statusClash = propose(duplicates, {
    operation: "merge",
    ids: ["fact-node-a", "fact-node-b"],
    survivor: "fact-node-a",
    pin: "drop",
  });
  ok(statusClash.ok, "a merge of two identical meanings is allowed");

  const merged = lifecycle(scopeOf(duplicates), {
    operation: "merge",
    mode: "apply",
    proposalId: statusClash.result.proposal_id,
    contentHash: sha256(read(duplicates, statusClash.result.review_file)),
    now: NOW,
  });
  ok(merged.ok, "an approved merge writes");
  ok(merged.result.survivor === "fact-node-a", "the merge result names the survivor");
  ok(merged.result.merged_ids.join(",") === "fact-node-b", "the merge result names what was consolidated");
  ok(
    !existsSync(resolve(duplicates, "knowledge/memory/facts/fact-node-b.md")),
    "the duplicate surplus is gone after the merge",
  );

  const survivor = frontMatter(duplicates, "knowledge/memory/facts/fact-node-a.md");
  ok(survivor.evidence.length === 2, "every evidence entry is consolidated onto the survivor");
  ok(
    survivor.evidence.map((entry) => entry.locator).join(",") === "knowledge/specs/example.md,knowledge/map.md",
    "the survivor carries both sources in the order they were merged",
  );
  ok(survivor.approval.action === "merge", "the survivor records the merge that produced it");
  ok(
    statusClash.result.pin_statement.includes("removed"),
    "the merge proposal states the pin outcome the owner chose",
  );

  const differentStatus = project("merge-status", {
    "knowledge/memory/facts/fact-x.md": record({
      id: "fact-x",
      title: "One meaning",
      summary: "One meaning, stated once.",
    }),
    "knowledge/memory/facts/fact-y.md": record({
      id: "fact-y",
      title: "One meaning",
      summary: "One meaning, stated once.",
      epistemic: "suspected",
      extra: ["based_on:", "  - fact-x"],
    }),
  });
  const truthClash = propose(differentStatus, {
    operation: "merge",
    ids: ["fact-x", "fact-y"],
    survivor: "fact-x",
    pin: "keep",
  });
  ok(!truthClash.ok, "a merge of records with different truth status is refused");
  ok(
    truthClash.errors.some((entry) => entry.message.includes("epistemic_status")),
    "the refusal says which incompatible field stopped it",
  );

  // -------------------------------------------------------------------------
  // DELETE, and the privacy purge boundary.
  // -------------------------------------------------------------------------
  const deleting = project("delete", {
    "knowledge/memory/facts/fact-typo.md": record({
      id: "fact-typo",
      title: "An accidental record",
      summary: "An accidental record created by a slip of the hand.",
    }),
  });
  const noReason = propose(deleting, { operation: "delete", id: "fact-typo" });
  ok(!noReason.ok, "a deletion with no reason is refused");

  const deleteProposal = propose(deleting, {
    operation: "delete",
    id: "fact-typo",
    reason: "It was created by accident and holds no meaning.",
  });
  ok(deleteProposal.status === "awaiting-approval", "delete proposes rather than removing");
  ok(
    read(deleting, deleteProposal.result.review_file).includes("An accidental record created by a slip of the hand."),
    "the deletion proposal shows the whole record as a visible diff",
  );
  ok(
    existsSync(resolve(deleting, "knowledge/memory/facts/fact-typo.md")),
    "a deletion proposal removes nothing",
  );

  const deleted = lifecycle(scopeOf(deleting), {
    operation: "delete",
    mode: "apply",
    proposalId: deleteProposal.result.proposal_id,
    contentHash: sha256(read(deleting, deleteProposal.result.review_file)),
    now: NOW,
  });
  ok(deleted.ok, "an approved deletion writes");
  ok(deleted.result.deleted === "fact-typo", "the deletion result names the record");
  ok(
    !existsSync(resolve(deleting, "knowledge/memory/facts/fact-typo.md")),
    "the deleted record is gone from the working tree",
  );
  ok(
    deleted.result.changed_paths.join(",") === "knowledge/memory/facts/fact-typo.md",
    "the deletion reports the path it removed",
  );
  ok(deleted.result.purge_complete === null, "an ordinary deletion claims no privacy purge");
  ok(deleted.result.git_history_remaining === null, "an ordinary deletion reports no history boundary");
  ok(checkStatus(deleting, "MV-03").status === "pass", "the project still validates after a deletion");

  const priv = project("privacy", {
    "knowledge/memory/facts/fact-secret.md": record({
      id: "fact-secret",
      title: "A record that named a person",
      summary: "A record that named a person who did not agree to be named.",
    }),
    "knowledge/specs/notes.md": "# Notes\n\nSee fact-secret for the detail.\n",
  });
  const privacyRun = through(priv, {
    operation: "delete",
    id: "fact-secret",
    reason: "It identifies a third party with no approval.",
    privacy: true,
  });
  ok(privacyRun.applied.ok, "an approved privacy deletion writes");
  ok(
    privacyRun.applied.result.remaining_references.some((entry) => entry.path === "knowledge/specs/notes.md"),
    "a privacy deletion reports every surviving reference to the record",
  );
  ok(
    privacyRun.applied.result.purge_complete === true,
    "a project with no Git history in its scope reports the purge complete once nothing else references it",
  );

  mkdirSync(resolve(priv, ".git"), { recursive: true });
  write(priv, "knowledge/memory/facts/fact-second.md", record({
    id: "fact-second",
    title: "A second private record",
    summary: "A second private record nobody approved.",
  }));
  const inGit = through(priv, {
    operation: "delete",
    id: "fact-second",
    reason: "It identifies a third party with no approval.",
    privacy: true,
  });
  ok(inGit.applied.ok, "a privacy deletion runs inside a Git repository");
  ok(inGit.applied.result.purge_complete === false, "a Git repository never reports a complete erasure it cannot prove");
  ok(
    inGit.applied.result.git_history_remaining.includes("history rewrite"),
    "the boundary report says exactly what a complete erasure would still need",
  );
  ok(
    inGit.applied.result.git_history_remaining.includes("clone"),
    "the boundary report names the clones that would still hold the content",
  );

  // A deletion killed mid-transaction puts the record back at the next call,
  // because a removal carries a preimage exactly like a rewrite does.
  const crashed = project("crash", {
    "knowledge/memory/facts/fact-crash.md": record({
      id: "fact-crash",
      title: "A record deleted during a crash",
      summary: "A record deleted during a crash and restored at the next call.",
    }),
  });
  const crashBefore = read(crashed, "knowledge/memory/facts/fact-crash.md");
  const crashProposal = propose(crashed, {
    operation: "delete",
    id: "fact-crash",
    reason: "It was created by accident.",
  });
  const runner = resolve(crashed, "crash-runner.mjs");
  writeFileSync(runner, [
    'import { resolveScope } from "file://SCOPE";',
    'import { applyProposal } from "file://WRITE";',
    "const scope = resolveScope(process.argv[2]);",
    "applyProposal(scope, {",
    "  proposalId: process.argv[3],",
    "  contentHash: process.argv[4],",
    "  simulateCrashAfterStaging: true,",
    "});",
    "",
  ].join("\n")
    .replace("SCOPE", resolve(plugin, "tools/lib/scope.mjs"))
    .replace("WRITE", resolve(plugin, "tools/memory-write.mjs")), "utf8");

  const crashRun = spawnSync(
    process.execPath,
    [runner, crashed, crashProposal.result.proposal_id, sha256(read(crashed, crashProposal.result.review_file))],
    { cwd: crashed, encoding: "utf8" },
  );
  ok(crashRun.status === 70, "the crash fixture stops the deletion mid-transaction");
  ok(
    !existsSync(resolve(crashed, "knowledge/memory/facts/fact-crash.md")),
    "the interrupted deletion had already removed the record",
  );
  ok(call(crashed, "status").code === 0, "the next call runs rather than stopping the session");
  ok(
    read(crashed, "knowledge/memory/facts/fact-crash.md") === crashBefore,
    "recovery puts the deleted record back exactly as it was",
  );
  ok(!existsSync(resolve(crashed, ".memory/journal.json")), "recovery clears the journal");

  // -------------------------------------------------------------------------
  // PIN and UNPIN, architecture section 11. AT-05 is the pinned statement
  // reaching a cold session, AT-07 is unpin removing startup visibility and
  // nothing else, AT-08 is supersede and retire dropping the old pin without
  // pinning a successor, and AT-09 is the over-budget refusal.
  // -------------------------------------------------------------------------
  const PIN_SUMMARY = "The toolkit ships version 2 beside version 1 until the cutover.";
  const pinning = project("pin", {
    "knowledge/memory/facts/fact-beside.md": record({
      id: "fact-beside",
      title: "Version 2 ships beside version 1",
      summary: PIN_SUMMARY,
    }),
    "knowledge/memory/facts/fact-gone.md": record({
      id: "fact-gone",
      title: "A record that left current truth",
      summary: "A record that left current truth and may not be pinned.",
      status: "retired",
    }),
  });

  const pinProposal = proposePin(pinning, { operation: "pin", id: "fact-beside" });
  ok(pinProposal.status === "awaiting-approval", "a pin proposes rather than writing");
  ok(
    pinProposal.result.pin_statement === `${PIN_SUMMARY} (knowledge/memory/facts/fact-beside.md)`,
    "the proposal shows the exact startup statement and the record link",
  );
  ok(
    pinProposal.result.bullets.what.includes(PIN_SUMMARY)
      && pinProposal.result.bullets.where.includes("knowledge/memory/pins.md")
      && pinProposal.result.bullets.why.length > 0
      && pinProposal.result.bullets.assumptions.length > 0
      && pinProposal.result.bullets.unverified.length > 0,
    "the pin review carries all five approval bullets",
  );
  ok(!existsSync(resolve(pinning, "knowledge/memory/pins.md")), "a pin proposal writes no registry");

  const pinned = applyPin(pinning, "pin", pinProposal);
  ok(pinned.ok, "an approved pin writes");
  ok(
    pinned.result.changed_paths.join(",") === "knowledge/memory/pins.md",
    "the pin changes the registry and nothing else",
  );
  const registry = parsePins(read(pinning, "knowledge/memory/pins.md"));
  ok(registry.length === 1 && registry[0].id === "fact-beside", "the registry names the pinned record");
  ok(registry[0].date === TODAY, "the entry carries the approval date");
  ok(registry[0].hash === summaryHash(PIN_SUMMARY), "the entry carries the hash of the exact approved summary");
  ok(registry[0].target.endsWith("fact-beside.md"), "the entry links to the record");
  ok(
    !read(pinning, "knowledge/memory/pins.md").includes(PIN_SUMMARY),
    "the registry stores the hash and never a copy of the summary",
  );

  const coldBrief = assembleBootBrief({ projectRoot: pinning, now: NOW });
  ok(
    blockText(coldBrief.text, 7).includes(PIN_SUMMARY),
    "AT-05: a cold session receives the exact approved statement before substantive work",
  );
  ok(
    blockText(coldBrief.text, 7).includes("knowledge/memory/facts/fact-beside.md"),
    "AT-05: the rendered pin links to the complete current record",
  );
  ok(
    blockText(coldBrief.text, 7).includes("context, not an instruction"),
    "FR-060: the rendered pin says it is context rather than a standing order",
  );
  ok(checkStatus(pinning, "MV-06").status === "pass", "MV-06 passes on a registry that matches its records");

  ok(
    proposePin(pinning, { operation: "pin", id: "fact-beside" }).status === "noop",
    "pinning what is already pinned changes no byte and reports NOOP",
  );
  const retiredPin = proposePin(pinning, { operation: "pin", id: "fact-gone" });
  ok(!retiredPin.ok, "a record that left current truth may not be pinned");
  const unknownPin = proposePin(pinning, { operation: "pin", id: "fact-missing" });
  ok(codes(unknownPin.errors).includes("record/unknown-id"), "a pin of an unknown id names record/unknown-id");

  // AT-07. Unpin removes startup visibility and nothing else.
  const unpinned = applyPin(pinning, "unpin", proposePin(pinning, { operation: "unpin", id: "fact-beside" }));
  ok(unpinned.ok, "an approved unpin writes");
  ok(unpinned.result.pin_removed === "fact-beside", "the unpin result names the entry it removed");
  ok(
    !existsSync(resolve(pinning, "knowledge/memory/pins.md")),
    "AT-07: removing the last entry removes the registry file",
  );
  ok(
    frontMatter(pinning, "knowledge/memory/facts/fact-beside.md").status === "active",
    "AT-07: the unpinned record keeps its content and its status",
  );
  ok(
    !blockText(assembleBootBrief({ projectRoot: pinning, now: NOW }).text, 7).includes(PIN_SUMMARY),
    "AT-07: the unpinned meaning is gone from startup",
  );
  ok(
    codes(proposePin(pinning, { operation: "unpin", id: "fact-beside" }).errors).includes("record/unknown-id"),
    "unpinning what is not pinned is refused rather than silently doing nothing",
  );

  // AT-08. SUPERSEDE drops the old pin in the same transaction and pins no
  // successor, and RETIRE does the same.
  const pinnedTimeline = project("pin-supersede", {
    "knowledge/memory/facts/fact-old.md": record({
      id: "fact-old",
      title: "The old meaning",
      summary: "The old meaning, pinned before it was replaced.",
    }),
  });
  applyPin(pinnedTimeline, "pin", proposePin(pinnedTimeline, { operation: "pin", id: "fact-old" }));
  const replaced = through(pinnedTimeline, {
    operation: "supersede",
    oldId: "fact-old",
    contents: record({
      id: "fact-new",
      title: "The new meaning",
      summary: "The new meaning, which nobody approved for startup.",
    }),
  });
  ok(replaced.applied.ok, "an approved supersession of a pinned record writes");
  ok(
    replaced.applied.result.changed_paths.includes("knowledge/memory/pins.md"),
    "AT-08: the pin removal happens in the supersession's own transaction",
  );
  ok(
    replaced.applied.result.pin_removed === "fact-old",
    "AT-08: the supersession reports which pin it removed",
  );
  ok(
    !existsSync(resolve(pinnedTimeline, "knowledge/memory/pins.md")),
    "AT-08: the successor is never pinned automatically",
  );
  ok(
    !blockText(assembleBootBrief({ projectRoot: pinnedTimeline, now: NOW }).text, 7).includes("The old meaning"),
    "AT-08: the superseded meaning is gone from startup",
  );

  const pinnedRetire = project("pin-retire", {
    "knowledge/memory/facts/fact-sync.md": record({
      id: "fact-sync",
      title: "A pinned practice",
      summary: "A pinned practice the team later stopped.",
    }),
  });
  applyPin(pinnedRetire, "pin", proposePin(pinnedRetire, { operation: "pin", id: "fact-sync" }));
  const retiredPinned = through(pinnedRetire, {
    operation: "retire",
    id: "fact-sync",
    reason: "The team stopped in August.",
    phrases: ["A pinned practice"],
  });
  ok(
    retiredPinned.applied.result.pin_removed === "fact-sync",
    "AT-08: a retirement removes the pin in the same transaction",
  );
  ok(
    !existsSync(resolve(pinnedRetire, "knowledge/memory/pins.md")),
    "AT-08: the retired meaning leaves startup with its record still on disk",
  );

  // CORRECT defaults to unpinning, and --keep-pin is the separate approval.
  const pinnedFix = project("pin-correct", {
    "knowledge/memory/facts/fact-count.md": record({
      id: "fact-count",
      title: "The plugin count",
      summary: "The toolkit ships seven plugins.",
    }),
  });
  applyPin(pinnedFix, "pin", proposePin(pinnedFix, { operation: "pin", id: "fact-count" }));
  const countCorrection = record({
    id: "fact-count",
    title: "The plugin count",
    summary: "The toolkit ships nine plugins.",
    evidence: [["owner_statement", "knowledge/specs/example.md"], ["documentation", "knowledge/map.md"]],
  });
  const dropped = through(pinnedFix, {
    operation: "correct",
    id: "fact-count",
    contents: countCorrection,
    reason: "Two more plugins shipped in August.",
  });
  ok(
    dropped.applied.result.pin_removed === "fact-count",
    "a correction that changes the summary removes the pin by default",
  );
  ok(!existsSync(resolve(pinnedFix, "knowledge/memory/pins.md")), "the dropped pin leaves no entry behind");

  const pinnedKeep = project("pin-keep", {
    "knowledge/memory/facts/fact-count.md": record({
      id: "fact-count",
      title: "The plugin count",
      summary: "The toolkit ships seven plugins.",
    }),
  });
  applyPin(pinnedKeep, "pin", proposePin(pinnedKeep, { operation: "pin", id: "fact-count" }));
  const kept = through(pinnedKeep, {
    operation: "correct",
    id: "fact-count",
    contents: countCorrection,
    reason: "Two more plugins shipped in August.",
    keepPin: true,
  });
  ok(kept.applied.result.pin_kept === "fact-count", "the owner may keep the corrected summary pinned");
  const rehashed = parsePins(read(pinnedKeep, "knowledge/memory/pins.md"));
  ok(
    rehashed[0].hash === summaryHash("The toolkit ships nine plugins."),
    "the kept pin carries the hash of the corrected summary",
  );
  ok(
    blockText(assembleBootBrief({ projectRoot: pinnedKeep, now: NOW }).text, 7).includes("nine plugins"),
    "the kept pin renders the corrected statement at startup",
  );
  ok(checkStatus(pinnedKeep, "MV-06").status === "pass", "MV-06 passes after a rehashed pin");

  // MV-06 is the repair warning of section 11.4: a hand edit to the record
  // leaves the approval evidence in the other file, which is what makes the
  // mismatch detectable.
  write(
    pinnedKeep,
    "knowledge/memory/facts/fact-count.md",
    read(pinnedKeep, "knowledge/memory/facts/fact-count.md").replace("nine plugins", "eleven plugins"),
  );
  const mv06 = checkStatus(pinnedKeep, "MV-06");
  ok(mv06.status === "fail", "MV-06 fails when a summary changed without startup approval");
  ok(
    mv06.findings.some((finding) => finding.path === "knowledge/memory/facts/fact-count.md"),
    "MV-06 names the record whose summary moved",
  );
  ok(
    !blockText(assembleBootBrief({ projectRoot: pinnedKeep, now: NOW }).text, 7).includes("eleven plugins"),
    "a mismatched pin is never rendered as current truth",
  );
  ok(
    assembleBootBrief({ projectRoot: pinnedKeep, now: NOW }).warnings
      .some((entry) => entry.code === "startup/pin-hash-mismatch"),
    "a mismatched pin produces a visible repair warning rather than a silent drop",
  );

  // A DELETE takes the pin entry with it, before any derived artifact rebuild.
  const pinnedDelete = project("pin-delete", {
    "knowledge/memory/facts/fact-slip.md": record({
      id: "fact-slip",
      title: "A record created by accident",
      summary: "A record created by accident and pinned by the same slip.",
    }),
  });
  applyPin(pinnedDelete, "pin", proposePin(pinnedDelete, { operation: "pin", id: "fact-slip" }));
  const removed = through(pinnedDelete, {
    operation: "delete",
    id: "fact-slip",
    reason: "It was created by accident.",
  });
  ok(
    removed.applied.result.pin_removed === "fact-slip",
    "a deletion removes the pin entry in the same transaction",
  );
  ok(!existsSync(resolve(pinnedDelete, "knowledge/memory/pins.md")), "the deleted record leaves no pin behind");

  // AT-09. A pin set that will not fit the budget is refused with the exact
  // byte count and the current set, never quietly left out of the brief.
  const tight = project("pin-budget", {
    "knowledge/memory/facts/fact-first.md": record({
      id: "fact-first",
      title: "The first pinned meaning",
      summary: "The first pinned meaning, approved for the start of every session.",
    }),
    "knowledge/memory/facts/fact-second.md": record({
      id: "fact-second",
      title: "The second pinned meaning",
      summary: "The second pinned meaning, proposed once the budget is already full.",
    }),
  });
  applyPin(tight, "pin", proposePin(tight, { operation: "pin", id: "fact-first" }));

  // The budget is set to exactly what this project needs with one pin, after
  // every degradation step, so the second pin has nowhere left to go and the
  // check is about the pin rather than about a number picked out of the air.
  const roomy = assembleBootBrief({ projectRoot: tight, now: NOW, budget: 10 ** 7 });
  const floor = Buffer.byteLength(renderBrief(roomy.model, {
    collapse: DEGRADATION_STEPS,
    overflow: false,
    overflowBytes: 0,
  }), "utf8");
  write(
    tight,
    "knowledge/project.md",
    read(tight, "knowledge/project.md").replace("---\n\n#", `startup:\n  budget_bytes: ${floor}\n---\n\n#`),
  );
  const overBudget = proposePin(tight, { operation: "pin", id: "fact-second" });
  ok(!overBudget.ok, "AT-09: a pin that would break the startup budget is refused");
  ok(
    codes(overBudget.errors).includes("startup/over-budget"),
    "AT-09: the refusal names startup/over-budget",
  );
  ok(
    overBudget.result.required_bytes > overBudget.result.budget_bytes,
    "AT-09: the refusal states the byte count that needs review",
  );
  ok(
    overBudget.result.pins.map((entry) => entry.id).join(",") === "fact-first",
    "AT-09: the refusal returns the exact current pin set",
  );
  ok(
    blockText(assembleBootBrief({ projectRoot: tight, now: NOW }).text, 7).includes("The first pinned meaning"),
    "AT-09: the pin already approved keeps rendering, and nothing was silently dropped",
  );

  // -------------------------------------------------------------------------
  // The command line: the operations, their exits, and the NOOP outcome.
  // -------------------------------------------------------------------------
  const cli = project("cli", {
    "knowledge/memory/facts/fact-cli.md": record({
      id: "fact-cli",
      title: "The command line carries every operation",
      summary: "The command line carries every lifecycle operation behind one entry.",
    }),
  });

  const surface = call(cli, "capabilities");
  ok(surface.code === 0, "capabilities runs");
  for (const operation of ["memory_add", "memory_confirm", "memory_correct", "memory_supersede", "memory_retire", "memory_merge", "memory_delete"]) {
    ok(surface.payload.result.operations.includes(operation), `capabilities reports ${operation}`);
  }
  ok(
    !surface.payload.result.degraded.some((entry) => entry.feature === "writes"),
    "capabilities no longer reports the writing operations as unavailable",
  );

  const cliNoop = call(cli, "noop", "--reason", "The information is transient.");
  ok(cliNoop.code === 0, "NOOP exits 0, because doing nothing is a run and not a failure");
  ok(cliNoop.payload.status === "noop", "NOOP reports the noop status");
  ok(cliNoop.payload.result.outcome === "NOOP", "NOOP names itself");
  ok(cliNoop.payload.result.reason.includes("transient"), "NOOP carries the reason nothing was stored");

  const missingFlag = call(cli, "retire", "--id", "fact-cli", "--propose");
  ok(missingFlag.code === 2, "a missing required flag could not be evaluated");
  ok(
    codes(missingFlag.payload.errors).includes("cli/invalid-invocation"),
    "the missing flag names cli/invalid-invocation",
  );

  const badType = call(cli, "add", "--type", "story", "--file", stage(cli, FACT_TOKENS), "--propose");
  ok(badType.code === 2, "a type outside the allowed set could not be evaluated");

  const badExempt = call(
    cli,
    "retire",
    "--id",
    "fact-cli",
    "--reason",
    "r",
    "--phrase",
    "p",
    "--exempt",
    "no-reason-here",
    "--propose",
  );
  ok(badExempt.code === 2, "an exemption with no reason could not be evaluated");

  const cliUnknown = call(cli, "delete", "--id", "fact-missing", "--reason", "r", "--propose");
  ok(cliUnknown.code === 1, "a refusal exits 1");
  ok(codes(cliUnknown.payload.errors).includes("record/unknown-id"), "the refusal names the closed reason code");

  const cliPropose = call(cli, "confirm", "--id", "fact-cli", "--evidence", "knowledge/map.md", "--propose");
  ok(cliPropose.code === 0, "a proposal exits 0");
  ok(cliPropose.payload.status === "awaiting-approval", "a proposal reports awaiting-approval");
  const cliId = cliPropose.payload.result.proposal_id;
  const cliHash = sha256(read(cli, `.memory/review/${cliId}.md`));

  const noApproval = call(cli, "confirm", "--apply", "--proposal", cliId);
  ok(noApproval.code === 1, "an apply call with no content hash is refused");
  ok(codes(noApproval.payload.errors).includes("approval/missing"), "the missing hash names approval/missing");

  const cancelled = call(cli, "cancel", "--proposal", cliId);
  ok(cancelled.code === 0, "a skip removes the review file and touches nothing canonical");
  ok(!existsSync(resolve(cli, `.memory/review/${cliId}.md`)), "the skipped review file is gone");
  ok(
    call(cli, "confirm", "--apply", "--proposal", cliId, "--content-hash", cliHash).code === 1,
    "a skipped proposal cannot be applied afterwards",
  );

  const twiceA = call(cli, "validate", "--check", "MV-05,MV-08");
  const twiceB = call(cli, "validate", "--check", "MV-05,MV-08");
  ok(twiceA.stdout === twiceB.stdout, "the same inputs produce the same bytes");
  ok(twiceA.stderr === "" && twiceB.stderr === "", "the lifecycle operations write nothing to standard error");

  // A hunt with no phrase asks for no walk, and a NOOP module call is pure.
  ok(phraseHunt(scopeOf(cli), []).length === 0, "a hunt with no phrase finds nothing and reads nothing");
  ok(noop(scopeOf(cli), { reason: "" }).result.reason.length > 0, "NOOP always states why nothing was stored");

  console.log(`ALL PASS (${passed} checks), FAIL: 0`);
} finally {
  for (const path of fixtures.reverse()) rmSync(path, { recursive: true, force: true });
}

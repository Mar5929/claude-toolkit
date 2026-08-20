#!/usr/bin/env node

/**
 * Harness for the version 2 write coordinator.
 *
 * It builds temporary projects, runs the real command line and the real
 * module, and asserts what the coordinator promises: a proposal changes
 * nothing, approval binds to exact bytes, an edited review file is validated
 * again before it is saved, a legacy record is upgraded on its first approved
 * touch, generated views carry a deterministic fingerprint, a failed
 * transaction restores every preimage, and a process killed mid-transaction
 * is recovered from the journal at the next call.
 *
 * The crash fixture spawns a child that stops between staging and validation,
 * which is the only honest way to leave a real journal behind. Every fixture
 * is removed at the end.
 *
 * Run: node plugins/second-brain/tests/coordinator-harness.mjs
 */

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { resolveScope } from "../tools/lib/scope.mjs";
import {
  applyProposal,
  cancel,
  propose,
  rebuildViews,
  recover,
  sha256,
  updateCurrent,
} from "../tools/memory-write.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const plugin = resolve(root, "plugins/second-brain");
const tool = resolve(plugin, "tools/memory.mjs");
const guardHook = resolve(plugin, "hooks/memory-write-guard.mjs");
const templates = resolve(plugin, "skills/second-brain/references/templates-v2/knowledge");
const fixtures = [];
let passed = 0;

/**
 * Module calls take a fixed clock, so nothing depends on the wall clock. The
 * command line has no clock flag, and the date it stamps is the real one, so
 * the few checks that read a stamped date derive it the same way.
 */
const NOW = new Date("2026-08-20T12:00:00Z");
const TODAY = new Date().toISOString().slice(0, 10);

function ok(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed++;
  console.log(`PASS: ${message}`);
}

function fixture(name) {
  const path = mkdtempSync(join(realpathSync(tmpdir()), `memory-coordinator-${name}-`));
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

/**
 * Run the pre-write guard the way Claude Code runs it: as its own process,
 * with the PreToolUse event on standard input. `denied` reads the payload, not
 * the exit code, because the guard exits 0 on every path by contract.
 */
function guardRaw(cwd, stdinText) {
  const run = spawnSync(process.execPath, [guardHook], { cwd, input: stdinText, encoding: "utf8" });
  let payload = null;
  try {
    payload = run.stdout.trim() ? JSON.parse(run.stdout) : null;
  } catch {
    payload = null;
  }
  const decision = payload?.hookSpecificOutput ?? {};
  return {
    code: run.status,
    stdout: run.stdout,
    stderr: run.stderr,
    denied: decision.permissionDecision === "deny",
    reason: decision.permissionDecisionReason ?? "",
  };
}

function guard(cwd, event) {
  return guardRaw(cwd, JSON.stringify({ hook_event_name: "PreToolUse", cwd, ...event }));
}

/** Every file under knowledge/, so a refused route can be shown to change none. */
function snapshot(base) {
  const contents = new Map();
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else contents.set(relative(base, path), readFileSync(path, "utf8"));
    }
  };
  walk(resolve(base, "knowledge"));
  return contents;
}

function same(first, second) {
  if (first.size !== second.size) return false;
  for (const [path, text] of first) {
    if (second.get(path) !== text) return false;
  }
  return true;
}

/** A project shaped like the required core, from the shipped templates. */
function project(name, files = {}) {
  const base = fixture(name);
  cpSync(templates, resolve(base, "knowledge"), { recursive: true });
  write(
    base,
    "knowledge/project.md",
    read(base, "knowledge/project.md").replace("replace-with-a-stable-project-id", `fixture-${name}`),
  );
  write(base, "knowledge/current.md", currentText("The starting focus.", "2026-08-18"));
  for (const [path, content] of Object.entries(files)) write(base, path, content);
  return base;
}

function currentText(focus, updated = null) {
  return [
    ...(updated ? ["---", `updated: ${updated}`, "---", ""] : []),
    "# Current state",
    "",
    "## Current focus",
    "",
    focus,
    "",
    "## Blockers",
    "",
    "None.",
    "",
    "## Next step",
    "",
    "Run the coordinator harness.",
    "",
    "## Handoff",
    "",
    "The coordinator is built and the harness proves it.",
    "",
  ].join("\n");
}

function stage(base, contents, name = "staged.md") {
  const path = resolve(base, name);
  writeFileSync(path, contents, "utf8");
  return path;
}

function scopeOf(base) {
  const scope = resolveScope(base);
  if (!scope.ok) throw new Error(`FAIL: the fixture scope did not resolve: ${scope.error.message}`);
  return scope;
}

/** One approved current.md write, from proposal to applied transaction. */
function writeCurrent(base, focus, options = {}) {
  const scope = scopeOf(base);
  const proposal = updateCurrent(scope, {
    trigger: options.trigger ?? "handoff",
    contents: currentText(focus),
    mode: "propose",
    now: NOW,
    ...options,
  });
  if (!proposal.ok) return { proposal, applied: null, scope };
  const applied = applyProposal(scope, {
    proposalId: proposal.result.proposal_id,
    contentHash: proposal.result.content_hash,
    now: NOW,
    ...(options.applyOptions ?? {}),
  });
  return { proposal, applied, scope };
}

const LEGACY_RECORD = [
  "---",
  "date: 2026-01-04",
  "tags: [auth]",
  "---",
  "",
  "# Refresh tokens live in secure device storage",
  "",
  "Refresh tokens live in secure device storage, not ordinary application storage.",
  "",
  "## Detail",
  "",
  "Carried over from the version 1 tree.",
  "",
].join("\n");

const VIEW_FILE = [
  "---",
  "generated: true",
  "generator: record-summaries",
  "inputs:",
  "  - knowledge/memory/facts",
  "fingerprint: sha256:stale",
  "---",
  "",
  "# Fact summaries",
  "",
  "Placeholder until the first rebuild.",
  "",
].join("\n");

function factRecord(id, summary) {
  return [
    "---",
    "schema_version: 2",
    `id: ${id}`,
    "type: fact",
    "status: active",
    "epistemic_status: documented",
    "recorded_at: 2026-08-19",
    "approval:",
    "  actor: owner",
    "  approved_at: 2026-08-19",
    "  action: add",
    "evidence:",
    "  - source_type: owner_statement",
    "    locator: knowledge/specs/example.md",
    "based_on: []",
    "---",
    "",
    `# ${summary}`,
    "",
    `${summary}.`,
    "",
  ].join("\n");
}

try {
  // -------------------------------------------------------------------------
  // A proposal changes nothing, and the review file is not project memory.
  // -------------------------------------------------------------------------
  const first = project("propose");
  const before = read(first, "knowledge/current.md");
  const staged = stage(first, currentText("Shipping the coordinator."));
  const proposeRun = call(first, "update-current", "--trigger", "handoff", "--file", staged, "--propose");

  ok(proposeRun.code === 0, "a proposal exits 0");
  ok(proposeRun.payload.status === "awaiting-approval", "a proposal reports awaiting-approval");
  ok(read(first, "knowledge/current.md") === before, "a proposal changes no canonical file");
  const proposalId = proposeRun.payload.result.proposal_id;
  ok(/^p-\d{4}-\d{2}-\d{2}-\d{4}$/.test(proposalId), "the proposal carries a dated id");
  ok(
    proposeRun.payload.result.review_file === `.memory/review/${proposalId}.md`,
    "the proposal names its review file under .memory/review/",
  );
  ok(
    !proposeRun.payload.result.review_file.startsWith("knowledge/"),
    "the review file sits outside every canonical knowledge path",
  );
  ok(existsSync(resolve(first, `.memory/review/${proposalId}.md`)), "the review file is written");
  const reviewText = read(first, `.memory/review/${proposalId}.md`);
  ok(reviewText.includes("## Staged: knowledge/current.md"), "the review file carries the exact staged contents");
  ok(
    proposeRun.payload.result.content_hash === sha256(reviewText),
    "the content hash is the hash of the review file the owner reads",
  );
  ok(
    Object.keys(proposeRun.payload.result.bullets).join(",") === "what,where,why,assumptions,unverified",
    "the proposal carries the five approval bullets",
  );
  ok(
    read(plugin, "skills/second-brain/references/templates-v2/gitignore-snippet.txt").includes(".memory/"),
    "setup ignores .memory/ in Git, so no review file is ever committed",
  );

  // A waiting proposal reaches no read path: not startup, not a view rebuild.
  const brief = spawnSync(process.execPath, [resolve(plugin, "tools/boot-brief.mjs"), first], { encoding: "utf8" });
  ok(brief.status === 0, "startup runs with a proposal waiting for review");
  ok(!brief.stdout.includes(proposalId), "startup never renders a waiting proposal");
  ok(
    !brief.stdout.includes("Shipping the coordinator."),
    "a proposal reaches no startup context before it is approved",
  );
  ok(
    JSON.parse(call(first, "rebuild-views").stdout).result.artifacts.length === 0,
    "a waiting proposal is not an input to any generated view",
  );

  // -------------------------------------------------------------------------
  // Approval binding: every bound input is rechecked.
  // -------------------------------------------------------------------------
  const noHash = call(first, "update-current", "--trigger", "handoff", "--apply", "--proposal", proposalId);
  ok(noHash.code === 1, "an apply call with no content hash is refused");
  ok(codes(noHash.payload.errors).includes("approval/missing"), "the missing content hash names approval/missing");

  const badHash = call(first, "update-current", "--trigger", "handoff", "--apply", "--proposal", proposalId, "--content-hash", "sha256:wrong");
  ok(badHash.code === 1, "an apply call whose hash does not match the review file is refused");
  ok(codes(badHash.payload.errors).includes("approval/stale-proposal"), "the mismatch names approval/stale-proposal");
  ok(read(first, "knowledge/current.md") === before, "a refused apply changes nothing");

  const unknown = call(first, "update-current", "--trigger", "handoff", "--apply", "--proposal", "p-2026-01-01-0001", "--content-hash", "sha256:x");
  ok(unknown.code === 1, "an apply call naming no waiting proposal is refused");
  ok(codes(unknown.payload.errors).includes("approval/missing"), "a missing proposal names approval/missing");

  const applied = call(first, "update-current", "--trigger", "handoff", "--apply", "--proposal", proposalId, "--content-hash", sha256(reviewText));
  ok(applied.code === 0, "an approved apply exits 0");
  ok(applied.payload.result.changed_paths.join(",") === "knowledge/current.md", "the write reports every changed path");
  ok(applied.payload.result.validation === "passed", "the write reports focused validation");
  ok(applied.payload.result.journal === "cleared", "the write clears its journal");
  ok(read(first, "knowledge/current.md").includes("Shipping the coordinator."), "the approved contents are on disk");
  ok(read(first, "knowledge/current.md").includes(`updated: ${TODAY}`), "the coordinator stamps the updated date");
  ok(!existsSync(resolve(first, `.memory/review/${proposalId}.md`)), "a saved proposal removes its review file");
  ok(!existsSync(resolve(first, ".memory/journal.json")), "no journal survives a successful write");
  const afterWrite = spawnSync(process.execPath, [resolve(plugin, "tools/boot-brief.mjs"), first], { encoding: "utf8" });
  ok(
    afterWrite.stdout.includes("Shipping the coordinator."),
    "the approved contents reach startup through knowledge/current.md",
  );
  ok(
    !afterWrite.stdout.includes("older than the 72 hour window"),
    "the stamped date reads as fresh inside the recent window",
  );

  // A destination that moved after the review sends the review back.
  const moved = project("moved");
  const movedRun = updateCurrent(scopeOf(moved), { trigger: "handoff", contents: currentText("A focus."), mode: "propose", now: NOW });
  write(moved, "knowledge/current.md", currentText("Someone edited this by hand.", "2026-08-19"));
  const movedApply = applyProposal(scopeOf(moved), {
    proposalId: movedRun.result.proposal_id,
    contentHash: movedRun.result.content_hash,
    now: NOW,
  });
  ok(!movedApply.ok, "a destination that changed after the review is refused");
  ok(codes(movedApply.errors).includes("approval/stale-proposal"), "the changed destination names approval/stale-proposal");
  ok(read(moved, "knowledge/current.md").includes("Someone edited this by hand."), "the refused write left the file alone");

  // A cited source that changed after the review sends it back too.
  const sourced = project("sourced", { "knowledge/specs/example.md": "# Example\n\nApproved behavior.\n" });
  const sourcedScope = scopeOf(sourced);
  const sourcedProposal = propose(sourcedScope, {
    operation: "memory_update_current",
    destination: "knowledge/current.md",
    contents: currentText("A focus with a source."),
    sources: [{ locator: "knowledge/specs/example.md" }],
    bullets: { what: "w", where: "knowledge/current.md", why: "y", assumptions: "None", unverified: "None" },
  }, { now: NOW });
  ok(sourcedProposal.result.source_hashes[0].hash !== null, "the proposal binds the hash of every cited source file");
  write(sourced, "knowledge/specs/example.md", "# Example\n\nApproved behavior, reworded.\n");
  const sourcedApply = applyProposal(sourcedScope, {
    proposalId: sourcedProposal.result.proposal_id,
    contentHash: sourcedProposal.result.content_hash,
    now: NOW,
  });
  ok(!sourcedApply.ok, "a cited source that changed after the review is refused");
  ok(codes(sourcedApply.errors).includes("approval/source-changed"), "the changed source names approval/source-changed");

  // -------------------------------------------------------------------------
  // The knowledge/current.md contract.
  // -------------------------------------------------------------------------
  const shape = project("shape");
  const missingSection = stage(shape, currentText("A focus.").replace(/## Blockers[\s\S]*?## Next step/, "## Next step"));
  const shapeRun = call(shape, "update-current", "--trigger", "handoff", "--file", missingSection, "--propose");
  ok(shapeRun.code === 1, "a staged current.md missing a required section is refused");
  ok(codes(shapeRun.payload.errors).includes("record/schema-invalid"), "the missing section names record/schema-invalid");
  ok(
    shapeRun.payload.errors.some((entry) => entry.message.includes("blockers")),
    "the refusal names the section that is missing",
  );

  ok(
    call(shape, "update-current", "--trigger", "nonsense", "--file", missingSection, "--propose").code === 2,
    "a trigger outside the three allowed values is an invalid invocation",
  );
  ok(
    codes(call(shape, "update-current", "--trigger", "nonsense", "--file", missingSection, "--propose").payload.errors)
      .includes("cli/invalid-invocation"),
    "the bad trigger names cli/invalid-invocation",
  );
  ok(
    call(shape, "update-current", "--file", missingSection, "--propose").code === 2,
    "update-current without a trigger is an invalid invocation",
  );
  ok(
    call(shape, "update-current", "--trigger", "handoff", "--file", missingSection).code === 2,
    "a write with neither --propose nor --apply is an invalid invocation",
  );

  for (const trigger of ["handoff", "focus-change", "completed-work"]) {
    const each = project(`trigger-${trigger}`);
    const outcome = writeCurrent(each, `Focus for ${trigger}.`, { trigger });
    ok(outcome.applied.ok, `the ${trigger} trigger writes knowledge/current.md through the coordinator`);
    ok(
      outcome.applied.result.changed_paths.join(",") === "knowledge/current.md",
      `the ${trigger} trigger changes that one path and no other`,
    );
  }

  // -------------------------------------------------------------------------
  // The Edit action.
  // -------------------------------------------------------------------------
  const edit = project("edit");
  const editScope = scopeOf(edit);
  const editProposal = updateCurrent(editScope, { trigger: "focus-change", contents: currentText("Before the edit."), mode: "propose", now: NOW });
  const editPath = resolve(edit, editProposal.result.review_file);
  writeFileSync(editPath, readFileSync(editPath, "utf8").replace("Before the edit.", "After the owner edited it."), "utf8");
  const editedHash = sha256(readFileSync(editPath, "utf8"));
  ok(editedHash !== editProposal.result.content_hash, "editing the review file changes its hash");
  const editApply = applyProposal(editScope, {
    proposalId: editProposal.result.proposal_id,
    contentHash: editedHash,
    now: NOW,
  });
  ok(editApply.ok, "a confirmed edit is saved without the owner repeating the change in chat");
  ok(
    read(edit, "knowledge/current.md").includes("After the owner edited it."),
    "the exact edited contents reach the canonical file",
  );

  const brokenEdit = project("broken-edit");
  const brokenScope = scopeOf(brokenEdit);
  const brokenProposal = updateCurrent(brokenScope, { trigger: "handoff", contents: currentText("Before."), mode: "propose", now: NOW });
  const brokenPath = resolve(brokenEdit, brokenProposal.result.review_file);
  writeFileSync(brokenPath, readFileSync(brokenPath, "utf8").replace("## Handoff", "## Notes"), "utf8");
  const brokenApply = applyProposal(brokenScope, {
    proposalId: brokenProposal.result.proposal_id,
    contentHash: sha256(readFileSync(brokenPath, "utf8")),
    now: NOW,
  });
  ok(!brokenApply.ok, "an edit that breaks the required shape stops the write");
  ok(codes(brokenApply.errors).includes("record/schema-invalid"), "the broken edit names the exact problem");
  ok(existsSync(brokenPath), "a failed edit keeps the review file available for correction");

  const retargeted = project("retargeted");
  const retargetScope = scopeOf(retargeted);
  const retargetProposal = updateCurrent(retargetScope, { trigger: "handoff", contents: currentText("Before."), mode: "propose", now: NOW });
  const retargetPath = resolve(retargeted, retargetProposal.result.review_file);
  writeFileSync(
    retargetPath,
    readFileSync(retargetPath, "utf8").replace("## Staged: knowledge/current.md", "## Staged: knowledge/map.md"),
    "utf8",
  );
  const retargetApply = applyProposal(retargetScope, {
    proposalId: retargetProposal.result.proposal_id,
    contentHash: sha256(readFileSync(retargetPath, "utf8")),
    now: NOW,
  });
  ok(!retargetApply.ok, "an edit that changes the destination stops the write");
  ok(codes(retargetApply.errors).includes("approval/stale-proposal"), "the changed destination sends the review back");

  // cancel removes the review file and touches nothing canonical.
  const skipped = project("skip");
  const skipProposal = updateCurrent(scopeOf(skipped), { trigger: "handoff", contents: currentText("A focus."), mode: "propose", now: NOW });
  const skipBefore = read(skipped, "knowledge/current.md");
  const skipRun = call(skipped, "cancel", "--proposal", skipProposal.result.proposal_id);
  ok(skipRun.code === 0, "cancel exits 0");
  ok(!existsSync(resolve(skipped, skipProposal.result.review_file)), "cancel removes the review file after a skip");
  ok(read(skipped, "knowledge/current.md") === skipBefore, "cancel touches no canonical path");
  ok(
    !JSON.parse(call(skipped, "capabilities").stdout).result.operations.includes("memory_cancel"),
    "cancel stays plumbing and never joins the reported operation surface",
  );

  // -------------------------------------------------------------------------
  // Touch upgrade for a legacy record, FR-055.
  // -------------------------------------------------------------------------
  const legacy = project("legacy", { "knowledge/memory/facts/tokens.md": LEGACY_RECORD });
  ok(call(legacy, "validate").code === 0, "a legacy record warns and never fails validation before the touch");
  ok(
    codes(call(legacy, "validate").payload.warnings).includes("record/legacy-gap"),
    "the legacy record is reported as a gap, not a failure",
  );

  const legacyScope = scopeOf(legacy);
  const legacyProposal = propose(legacyScope, {
    operation: "memory_update_current",
    destination: "knowledge/current.md",
    contents: currentText("Touching a migrated record."),
    touches: ["knowledge/memory/facts/tokens.md"],
    bullets: { what: "w", where: "knowledge/current.md", why: "y", assumptions: "None", unverified: "None" },
  }, { now: NOW });
  const legacyReview = read(legacy, legacyProposal.result.review_file);
  ok(
    legacyReview.includes("## Legacy upgrade: knowledge/memory/facts/tokens.md"),
    "the review shows that the touch upgrades a migrated record",
  );
  const missingLine = legacyReview.split("\n").find((line) => line.startsWith("This touch upgrades"));
  ok(
    ["id", "type", "status", "epistemic_status", "recorded_at", "approval", "evidence"]
      .every((field) => missingLine.includes(field)),
    "the review names every field the record was missing",
  );

  const legacyApply = applyProposal(legacyScope, {
    proposalId: legacyProposal.result.proposal_id,
    contentHash: legacyProposal.result.content_hash,
    now: NOW,
  });
  ok(legacyApply.ok, "the approved touch applies");
  ok(
    legacyApply.result.changed_paths.includes("knowledge/memory/facts/tokens.md"),
    "the upgraded record is part of the same reported transaction",
  );
  const upgraded = read(legacy, "knowledge/memory/facts/tokens.md");
  ok(upgraded.includes("type: fact"), "the upgrade takes the type from the folder the record sits in");
  ok(upgraded.includes("epistemic_status: unknown"), "the upgrade records an honest unknown rather than inventing one");
  ok(upgraded.includes("source_type: legacy_record"), "the upgrade names the version 1 record as its evidence");
  ok(upgraded.includes("recorded_at: 2026-01-04"), "the upgrade keeps the date the record already carried");
  ok(!/^date:/m.test(upgraded), "the upgrade drops version 1 keys the schema does not define");
  ok(call(legacy, "validate").code === 0, "the upgraded record passes the record schema");
  ok(
    !codes(call(legacy, "validate").payload.warnings).includes("record/legacy-gap"),
    "the upgraded record is no longer reported as a gap",
  );

  // -------------------------------------------------------------------------
  // Generated views.
  // -------------------------------------------------------------------------
  const plainViews = project("no-views");
  const noViews = call(plainViews, "rebuild-views");
  ok(noViews.code === 0, "rebuild-views exits 0 in a project with no view");
  ok(noViews.payload.status === "noop", "a default project reports NOOP rather than failing");
  ok(JSON.stringify(noViews.payload.result) === '{"artifacts":[]}', "a default project rebuilds no artifact");

  const viewed = project("views", {
    "knowledge/views/facts.md": VIEW_FILE,
    "knowledge/memory/facts/one.md": factRecord("fact-one-001", "The first fact"),
  });
  const rebuilt = call(viewed, "rebuild-views");
  ok(rebuilt.code === 0, "a declared view rebuilds");
  ok(rebuilt.payload.result.artifacts[0].path === "knowledge/views/facts.md", "the rebuild names the artifact");
  const viewText = read(viewed, "knowledge/views/facts.md");
  ok(viewText.includes("generated: true"), "the rebuilt view identifies itself as generated");
  ok(viewText.includes("knowledge/memory/facts/one.md"), "the rebuilt view names and links every input");
  ok(/fingerprint: sha256:[0-9a-f]{64}/.test(viewText), "the rebuilt view carries a deterministic input fingerprint");
  ok(!viewText.includes("sha256:stale"), "the rebuild replaces a stale fingerprint");
  call(viewed, "rebuild-views");
  ok(read(viewed, "knowledge/views/facts.md") === viewText, "an unchanged rebuild produces identical bytes");

  const viewWrite = writeCurrent(viewed, "A focus that leaves the view alone.");
  ok(viewWrite.applied.ok, "a write beside a view applies");
  ok(
    viewWrite.applied.result.artifacts_rebuilt.length === 0,
    "a change no view depends on rebuilds nothing",
  );

  const recordScope = scopeOf(viewed);
  const recordProposal = propose(recordScope, {
    operation: "memory_add",
    destination: "knowledge/memory/facts/two.md",
    recordId: "fact-two-002",
    contents: factRecord("fact-two-002", "The second fact"),
    bullets: { what: "w", where: "knowledge/memory/facts/two.md", why: "y", assumptions: "None", unverified: "None" },
  }, { now: NOW });
  const recordApply = applyProposal(recordScope, {
    proposalId: recordProposal.result.proposal_id,
    contentHash: recordProposal.result.content_hash,
    now: NOW,
  });
  ok(recordApply.ok, "a record write applies");
  ok(
    recordApply.result.artifacts_rebuilt.includes("knowledge/views/facts.md"),
    "a view whose input changed is rebuilt inside the same transaction",
  );
  ok(
    read(viewed, "knowledge/views/facts.md").includes("fact-two-002"),
    "the rebuilt view carries the record the transaction added",
  );
  ok(
    recordApply.result.changed_paths.includes("knowledge/views/facts.md"),
    "one approved write is one reported operation even when it changes several files",
  );

  const badView = project("bad-view", { "knowledge/views/odd.md": VIEW_FILE.replace("record-summaries", "invented-kind") });
  const badRun = call(badView, "rebuild-views");
  ok(badRun.code === 1, "a view naming an unknown generator is refused");
  ok(codes(badRun.payload.errors).includes("write/validation-failed"), "the unknown generator names write/validation-failed");

  // -------------------------------------------------------------------------
  // Transaction behavior: rollback, lock, and crash recovery.
  // -------------------------------------------------------------------------
  const rollbackFixture = project("rollback", {
    "knowledge/memory/facts/broken.md": "---\ndate: 2026-02-02\n---\n\nNo heading at all.\n",
  });
  const rollbackBefore = read(rollbackFixture, "knowledge/current.md");
  const rollbackScope = scopeOf(rollbackFixture);
  const rollbackProposal = propose(rollbackScope, {
    operation: "memory_update_current",
    destination: "knowledge/current.md",
    contents: currentText("A focus that will not survive."),
    touches: ["knowledge/memory/facts/broken.md"],
    bullets: { what: "w", where: "knowledge/current.md", why: "y", assumptions: "None", unverified: "None" },
  }, { now: NOW });
  const rollbackApply = applyProposal(rollbackScope, {
    proposalId: rollbackProposal.result.proposal_id,
    contentHash: rollbackProposal.result.content_hash,
    now: NOW,
  });
  ok(!rollbackApply.ok, "focused validation stops a transaction that would leave an invalid record");
  ok(codes(rollbackApply.errors).includes("write/validation-failed"), "the failure names write/validation-failed");
  ok(rollbackApply.result.changed_paths.length === 0, "a failed transaction reports no changed path");
  ok(read(rollbackFixture, "knowledge/current.md") === rollbackBefore, "the destination preimage is restored");
  ok(
    read(rollbackFixture, "knowledge/memory/facts/broken.md").includes("No heading at all."),
    "every other preimage in the transaction is restored too",
  );
  ok(!existsSync(resolve(rollbackFixture, ".memory/journal.json")), "a failed transaction leaves no journal");
  ok(!existsSync(resolve(rollbackFixture, ".memory/lock")), "a failed transaction releases the lock");

  const locked = project("locked");
  const lockedScope = scopeOf(locked);
  const lockedProposal = updateCurrent(lockedScope, { trigger: "handoff", contents: currentText("A focus."), mode: "propose", now: NOW });
  mkdirSync(resolve(locked, ".memory/lock"), { recursive: true });
  const lockedApply = applyProposal(lockedScope, {
    proposalId: lockedProposal.result.proposal_id,
    contentHash: lockedProposal.result.content_hash,
    now: NOW,
  });
  ok(!lockedApply.ok, "a held lock stops a second write");
  ok(codes(lockedApply.errors).includes("write/lock-held"), "the held lock names write/lock-held");

  // A crash between staging and validation, recovered at the next call.
  const crashed = project("crash");
  const crashBefore = read(crashed, "knowledge/current.md");
  const crashScope = scopeOf(crashed);
  const crashProposal = updateCurrent(crashScope, { trigger: "handoff", contents: currentText("Written just before the crash."), mode: "propose", now: NOW });
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
    [runner, crashed, crashProposal.result.proposal_id, crashProposal.result.content_hash],
    { cwd: crashed, encoding: "utf8" },
  );
  ok(crashRun.status === 70, "the crash fixture stops the process mid-transaction");
  ok(existsSync(resolve(crashed, ".memory/journal.json")), "the interrupted transaction left its journal behind");
  ok(
    read(crashed, "knowledge/current.md").includes("Written just before the crash."),
    "the interrupted transaction left the staged contents on disk",
  );

  const afterCrash = call(crashed, "status");
  ok(afterCrash.code === 0, "the next call runs and reports rather than stopping the session");
  ok(
    read(crashed, "knowledge/current.md") === crashBefore,
    "recovery restores the preimage the crash interrupted",
  );
  ok(!existsSync(resolve(crashed, ".memory/journal.json")), "recovery clears the journal");
  ok(!existsSync(resolve(crashed, ".memory/lock")), "recovery releases the lock the crash left behind");
  ok(codes(afterCrash.payload.warnings).includes("write/journal-present"), "the recovery is reported as a warning");
  ok(afterCrash.payload.result.journal_present === false, "status reports no journal once recovery has run");
  ok(
    afterCrash.payload.warnings.every((entry) => !entry.message.includes("Written just before the crash")),
    "no recovery message carries record body text",
  );

  const unreadable = project("unreadable-journal");
  write(unreadable, ".memory/journal.json", "{ not json\n");
  const blockedRead = call(unreadable, "status");
  ok(blockedRead.code === 0, "an unreadable journal still lets a read run");
  ok(codes(blockedRead.payload.warnings).includes("write/journal-present"), "an unreadable journal is reported");
  ok(existsSync(resolve(unreadable, ".memory/journal.json")), "an unreadable journal is never silently deleted");
  const blockedWrite = updateCurrent(scopeOf(unreadable), { trigger: "handoff", contents: currentText("A focus."), mode: "propose", now: NOW });
  ok(!blockedWrite.ok, "no write runs while an unreadable journal is waiting");
  ok(codes(blockedWrite.errors).includes("write/journal-present"), "the blocked write names write/journal-present");

  // -------------------------------------------------------------------------
  // Section 13.5: one meaning per proposal, and nothing automatic.
  // -------------------------------------------------------------------------
  const events = project("events");
  const eventScope = scopeOf(events);
  const eventRecord = [
    "---",
    "schema_version: 2",
    "id: event-coordinator-001",
    "type: event",
    "status: active",
    "epistemic_status: observed",
    "recorded_at: 2026-08-20",
    "occurred_at: 2026-08-19",
    "approval:",
    "  actor: owner",
    "  approved_at: 2026-08-20",
    "  action: add",
    "evidence:",
    "  - source_type: commit",
    "    locator: 97cb988",
    "based_on: []",
    "---",
    "",
    "# The write coordinator shipped",
    "",
    "The version 2 write coordinator shipped in plugins/second-brain/tools/memory-write.mjs.",
    "",
  ].join("\n");

  const transcript = propose(eventScope, {
    operation: "memory_add",
    destination: "knowledge/memory/events/shipped.md",
    contents: `${eventRecord}## Transcript\n\nThe whole conversation.\n`,
    bullets: { what: "w", where: "knowledge/memory/events/shipped.md", why: "y", assumptions: "None", unverified: "None" },
  }, { now: NOW });
  ok(!transcript.ok, "a completed-work event carrying a transcript is refused");
  ok(
    transcript.errors.some((entry) => entry.message.includes("transcript")),
    "the refusal names the transcript section",
  );

  const twoMeanings = propose(eventScope, {
    operation: "memory_add",
    destination: "knowledge/memory/events/shipped.md",
    contents: `${eventRecord}\n# A second meaning in the same file\n\nAnother thing happened.\n`,
    bullets: { what: "w", where: "knowledge/memory/events/shipped.md", why: "y", assumptions: "None", unverified: "None" },
  }, { now: NOW });
  ok(!twoMeanings.ok, "a staged record holding two meanings is refused before any proposal is shown");

  const automatic = propose(eventScope, {
    operation: "memory_add",
    destination: "knowledge/memory/events/shipped.md",
    contents: eventRecord,
    ownerRequested: false,
    bullets: { what: "w", where: "knowledge/memory/events/shipped.md", why: "y", assumptions: "None", unverified: "None" },
  }, { now: NOW });
  ok(!automatic.ok, "no automatic route may propose a completed-work event");

  const eventOk = propose(eventScope, {
    operation: "memory_add",
    destination: "knowledge/memory/events/shipped.md",
    contents: eventRecord,
    currentContents: currentText("The coordinator shipped."),
    bullets: { what: "w", where: "knowledge/memory/events/shipped.md", why: "y", assumptions: "None", unverified: "None" },
  }, { now: NOW });
  ok(eventOk.ok, "an owner-requested completed-work event with evidence and occurred_at is proposed");
  const eventReview = read(events, eventOk.result.review_file);
  ok(
    eventReview.includes("## Staged: knowledge/memory/events/shipped.md")
      && eventReview.includes("## Staged: knowledge/current.md"),
    "the owner sees the event and the current.md update in one review",
  );
  const eventApply = applyProposal(eventScope, {
    proposalId: eventOk.result.proposal_id,
    contentHash: eventOk.result.content_hash,
    now: NOW,
  });
  ok(eventApply.ok, "the approved event applies");
  ok(
    eventApply.result.changed_paths.join(",") === "knowledge/memory/events/shipped.md,knowledge/current.md",
    "a completed-work event that changes current state updates current.md in the same transaction",
  );
  ok(read(events, "knowledge/current.md").includes("The coordinator shipped."), "current.md carries the approved update");

  // -------------------------------------------------------------------------
  // Scope, privacy, and determinism.
  // -------------------------------------------------------------------------
  const outside = project("outside");
  const outsideProposal = propose(scopeOf(outside), {
    operation: "memory_add",
    destination: "../escape.md",
    contents: "# Nope\n\nNo.\n",
    bullets: { what: "w", where: "../escape.md", why: "y", assumptions: "None", unverified: "None" },
  }, { now: NOW });
  ok(!outsideProposal.ok, "a destination outside the scope root is refused");
  ok(codes(outsideProposal.errors).includes("scope/outside-root"), "the escape names scope/outside-root");

  const notCanonical = propose(scopeOf(outside), {
    operation: "memory_add",
    destination: "notes/idea.md",
    contents: "# Nope\n\nNo.\n",
    bullets: { what: "w", where: "notes/idea.md", why: "y", assumptions: "None", unverified: "None" },
  }, { now: NOW });
  ok(!notCanonical.ok, "a destination outside the knowledge tree is refused");

  const twice = project("twice");
  const runA = call(twice, "rebuild-views");
  const runB = call(twice, "rebuild-views");
  ok(runA.stdout === runB.stdout, "the same inputs produce the same bytes");
  ok(runA.stderr === "" && runB.stderr === "", "the coordinator writes nothing to standard error");

  const recovered = recover(scopeOf(twice));
  ok(recovered.recovered === false && recovered.warnings.length === 0, "a project with no journal recovers nothing and says nothing");

  // -------------------------------------------------------------------------
  // The pre-write guard: every route other than the coordinator is refused.
  // -------------------------------------------------------------------------
  const guarded = project("guard", {
    "knowledge/memory/facts/kept.md": factRecord("fact-kept-001", "The approved behavior"),
    "knowledge/specs/behavior.md": "# How it behaves\n\nThe approved behavior.\n",
    "notes/scratch.md": "# Scratch\n\nNot canonical.\n",
  });
  const guardBefore = snapshot(guarded);

  // AT-39, route one: a direct file edit.
  const directEdit = guard(guarded, {
    tool_name: "Edit",
    tool_input: {
      file_path: "knowledge/memory/facts/kept.md",
      old_string: "The approved behavior.",
      new_string: "Something else.",
    },
  });
  ok(directEdit.code === 0, "the guard exits 0 when it refuses a direct edit");
  ok(directEdit.denied, "a direct edit of a canonical record is denied");
  ok(directEdit.reason.includes("write/guard-refused"), "the refusal carries the write/guard-refused code");
  ok(directEdit.reason.includes("memory.mjs correct"), "the refusal names the operation that should have been used");
  ok(directEdit.stderr === "", "the guard writes nothing to standard error");

  // AT-39, route two: a helper agent. The guard reads paths, not routes, so a
  // subagent call gets the same answer as the main session's own call.
  const helperAgent = guard(guarded, {
    tool_name: "Write",
    tool_input: {
      file_path: "knowledge/memory/facts/helper-wrote-this.md",
      content: "# A fact\n\nWritten by a helper agent.\n",
    },
    source: "subagent",
    agent_name: "memory-helper",
  });
  ok(helperAgent.denied, "a helper agent writing a new canonical record is denied");
  ok(helperAgent.reason.includes("memory.mjs add"), "a new record's refusal names memory.mjs add");
  ok(!existsSync(resolve(guarded, "knowledge/memory/facts/helper-wrote-this.md")), "the helper agent's file was never created");

  // AT-39, route three: a script. A shell redirect, an in-place edit, and a
  // removal are all writes, wherever the command sits in the chain.
  const scriptRedirect = guard(guarded, {
    tool_name: "Bash",
    tool_input: { command: "echo 'rewritten' > knowledge/current.md" },
  });
  ok(scriptRedirect.denied, "a shell redirect into knowledge/current.md is denied");
  ok(scriptRedirect.reason.includes("memory.mjs update-current"), "the current.md refusal names memory.mjs update-current");

  const scriptInPlace = guard(guarded, {
    tool_name: "Bash",
    tool_input: { command: "cd knowledge/specs && sed -i 's/approved/edited/' behavior.md" },
  });
  ok(scriptInPlace.denied, "an in-place edit after a cd into the guarded tree is denied");

  const scriptRemove = guard(guarded, {
    tool_name: "Bash",
    tool_input: { command: "rm knowledge/memory/facts/kept.md" },
  });
  ok(scriptRemove.denied, "removing a canonical record from the shell is denied");
  ok(scriptRemove.reason.includes("memory.mjs retire"), "a removal's refusal names memory.mjs retire");

  ok(same(guardBefore, snapshot(guarded)), "every canonical file is unchanged after all three refused routes");

  // What the guard does not touch.
  ok(!guard(guarded, {
    tool_name: "Bash",
    tool_input: { command: "git checkout knowledge/current.md" },
  }).denied, "the owner keeps ordinary Git access to canonical files");
  ok(!guard(guarded, {
    tool_name: "Bash",
    tool_input: { command: "node tools/memory.mjs update-current --propose --file staged.md" },
  }).denied, "a Bash call that invokes the coordinator is allowed, because it carries the review");
  ok(!guard(guarded, {
    tool_name: "Bash",
    tool_input: { command: "cat knowledge/memory/facts/kept.md" },
  }).denied, "reading a canonical file is not a write");
  ok(!guard(guarded, {
    tool_name: "Edit",
    tool_input: { file_path: "notes/scratch.md", old_string: "Not", new_string: "Still not" },
  }).denied, "an ordinary file outside the guarded set is untouched");
  ok(guard(guarded, {
    tool_name: "Read",
    tool_input: { file_path: "knowledge/current.md" },
  }).stdout === "", "the guard says nothing at all about a tool it does not guard");

  // The recorded boundary. An agent that can widen its own boundary has none.
  const widen = guard(guarded, {
    tool_name: "Edit",
    tool_input: {
      file_path: "knowledge/project.md",
      old_string: "level: standard",
      new_string: "level: sensitive",
    },
  });
  ok(widen.denied, "an edit to the privacy block in knowledge/project.md is denied");
  ok(widen.reason.includes("settings/owner-only"), "the boundary refusal carries settings/owner-only");
  ok(!guard(guarded, {
    tool_name: "Edit",
    tool_input: {
      file_path: "knowledge/project.md",
      old_string: "# What this project is",
      new_string: "# What this project is for",
    },
  }).denied, "ordinary prose in knowledge/project.md is not guarded");

  // Fail-closed. An undecidable call that names a guarded path is a refusal.
  ok(guard(guarded, {
    tool_name: "Write",
    tool_input: { content: "knowledge/memory/facts/no-target.md" },
  }).denied, "a call naming a guarded path with no readable target is denied");
  ok(guardRaw(guarded, "this is not JSON, and it names knowledge/memory/facts/x.md").denied,
    "a tool input that will not parse and names a guarded path is denied");
  ok(!guardRaw(guarded, "this is not JSON and names nothing guarded").denied,
    "an unparsed input that names nothing guarded stays silent");
  const noScope = fixture("guard-no-scope");
  write(noScope, "knowledge/memory/facts/orphan.md", "# Orphan\n\nNo project file.\n");
  ok(guard(noScope, {
    tool_name: "Write",
    tool_input: { file_path: "knowledge/memory/facts/orphan.md", content: "changed" },
  }).denied, "a guarded-looking path whose scope will not resolve is denied");

  const guardA = guard(guarded, {
    tool_name: "Edit",
    tool_input: { file_path: "knowledge/specs/behavior.md", old_string: "approved", new_string: "other" },
  });
  const guardB = guard(guarded, {
    tool_name: "Edit",
    tool_input: { file_path: "knowledge/specs/behavior.md", old_string: "approved", new_string: "other" },
  });
  ok(guardA.stdout === guardB.stdout, "the same call always produces the same answer, byte for byte");
  ok(same(guardBefore, snapshot(guarded)), "the guard itself writes nothing");

  console.log(`ALL PASS (${passed} checks), FAIL: 0`);
} finally {
  for (const path of fixtures.reverse()) rmSync(path, { recursive: true, force: true });
}

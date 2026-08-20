#!/usr/bin/env node

/**
 * Harness for the version 2 memory tool entry, tools/memory.mjs.
 *
 * It builds temporary projects, runs the real command line, and asserts the
 * capabilities and status payloads, the result envelope, the exit codes, the
 * restrictive privacy fallback, and the byte-for-byte determinism the result
 * contract requires. Every fixture is removed at the end.
 *
 * Run: node plugins/second-brain/tests/capabilities-harness.mjs
 */

import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const plugin = resolve(root, "plugins/second-brain");
const tool = resolve(plugin, "tools/memory.mjs");
const templates = resolve(plugin, "skills/second-brain/references/templates-v2/knowledge");
const fixtures = [];
let passed = 0;

function ok(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed++;
  console.log(`PASS: ${message}`);
}

function fixture(name) {
  const path = mkdtempSync(join(realpathSync(tmpdir()), `memory-tool-${name}-`));
  fixtures.push(path);
  return path;
}

function write(base, path, content = "") {
  const absolute = resolve(base, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
}

function daysAgo(count) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - count);
  return date.toISOString().slice(0, 10);
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
  return entries.map((entry) => entry.code);
}

/** A project shaped like the required core, with the settings a test needs. */
function project(name, { frontMatter, current, extras = {} } = {}) {
  const base = fixture(name);
  write(base, "knowledge/project.md", `---\n${frontMatter}---\n\n# What this project is\n\nA fixture.\n`);
  for (const type of ["facts", "decisions", "events", "patterns"]) {
    write(base, `knowledge/memory/${type}/.gitkeep`, "");
  }
  mkdirSync(resolve(base, "knowledge/specs"), { recursive: true });
  write(base, "knowledge/map.md", "# Map\n\n| Role | Path |\n| --- | --- |\n| Specifications | `knowledge/specs/` |\n");
  if (current !== null) {
    write(
      base,
      "knowledge/current.md",
      `---\nupdated: ${current}\n---\n\n# Current state\n\n## Current focus\n\nThe fixture.\n`,
    );
  }
  for (const [path, content] of Object.entries(extras)) write(base, path, content);
  return base;
}

const STANDARD_FRONT_MATTER = [
  "schema_version: 2",
  "project_id: fixture-project",
  "project_root: .",
  "subroots: []",
  "privacy:",
  "  level: standard",
  "  external_transfer: denied",
  "  third_party_personal: refused",
  "profiles: []",
  "",
].join("\n");

try {
  // The envelope and the capabilities payload on a well-formed project.
  const plain = project("plain", { frontMatter: STANDARD_FRONT_MATTER, current: daysAgo(1) });
  const caps = call(plain, "capabilities");
  ok(caps.code === 0, "capabilities exits 0 on a well-formed project");
  ok(caps.stderr === "", "capabilities writes nothing to standard error");
  ok(caps.payload !== null, "capabilities prints one JSON object");
  ok(caps.payload.schema === "memory-tool-result/1", "the envelope names the result schema");
  ok(caps.payload.tool_version === "2.0", "the envelope carries the tool version");
  ok(caps.payload.operation === "memory_capabilities", "the envelope names the tool-surface operation");
  ok(caps.payload.status === "ok", "capabilities reports status ok");
  ok(caps.payload.project_id === "fixture-project", "the envelope carries the project id");
  ok(caps.payload.searched.length === 0, "capabilities leaves searched empty");
  ok(
    Object.keys(caps.payload).join(",")
      === "schema,tool_version,operation,status,project_id,scope_root,result,warnings,errors,searched",
    "the envelope keeps the fixed field order",
  );

  const result = caps.payload.result;
  ok(
    JSON.stringify(result.operations)
      === JSON.stringify([
        "memory_capabilities",
        "memory_status",
        "memory_search",
        "memory_get",
        "memory_timeline",
        "memory_related",
        "memory_sources",
        "memory_review",
        "memory_validate",
        "memory_update_current",
        "memory_rebuild_views",
        "memory_add",
        "memory_confirm",
        "memory_correct",
        "memory_supersede",
        "memory_retire",
        "memory_merge",
        "memory_delete",
        "memory_pin",
        "memory_unpin",
        "spec_search",
        "spec_get",
      ]),
    "capabilities lists exactly the operations this build supports",
  );
  ok(result.approval_mode === "owner-approved", "the approval mode is owner-approved");
  ok(result.search_mode === "direct-file", "the search mode is direct canonical-file search");
  ok(result.pin_support === true, "pin support is true now that the pin manager is built");
  ok(result.pin_count === 0, "a project with no pins file reports no pins");
  ok(result.budget_bytes === 10240, "the startup budget defaults to 10240 bytes");
  ok(result.required_bytes === null, "the required brief size is unavailable without the assembler");
  ok(result.project_id === "fixture-project", "capabilities reports the project id");
  ok(result.privacy.level === "standard", "the resolved privacy level is reported");
  ok(result.external_transfer === "denied", "capabilities reports whether data may leave the machine");
  ok(result.tracker === null, "no configured tracker reports null");
  ok(result.session_history_scope.scoped_by === "project_id", "session history is scoped by project id");
  ok(result.session_history_scope.available === false, "session history is unavailable in this build");
  ok(
    result.degraded.every((entry) => typeof entry.feature === "string" && typeof entry.reason === "string"),
    "every degraded entry names a feature and a reason",
  );
  ok(
    result.degraded.some((entry) => entry.feature === "review")
      && result.degraded.some((entry) => entry.feature === "session history"),
    "the degraded list names the features this build does not carry in full",
  );
  ok(
    !result.degraded.some((entry) => entry.feature === "retrieval"),
    "retrieval is no longer degraded now that the router is built",
  );
  ok(
    codes(caps.payload.warnings).includes("tracker/not-configured"),
    "an unconfigured tracker is a warning, never an error",
  );
  ok(caps.payload.errors.length === 0, "a well-formed project produces no errors");

  // The same inputs produce the same bytes.
  ok(call(plain, "capabilities").stdout === caps.stdout, "two capabilities runs produce the same bytes");
  ok(!caps.stdout.includes(new Date().toISOString().slice(0, 4)), "capabilities carries no wall-clock value");

  // Status on the same project.
  const state = call(plain, "status");
  ok(state.code === 0, "status exits 0");
  ok(state.payload.operation === "memory_status", "status names its tool-surface operation");
  ok(state.payload.result.schema_version === 2, "status reports the settings schema version");
  ok(
    JSON.stringify(state.payload.result.counts) === JSON.stringify({
      facts: 0, decisions: 0, events: 0, patterns: 0,
    }),
    "status counts every record folder",
  );
  ok(state.payload.result.current_md.state === "present", "status finds knowledge/current.md");
  ok(state.payload.result.stale === false, "a current file inside the 72-hour window is not stale");
  ok(state.payload.result.journal_present === false, "no journal is present during a normal read");
  ok(state.payload.result.gold_set === "missing", "an absent gold set is reported, not an error");
  ok(!Object.hasOwn(state.payload.result, "last_validate"), "last_validate is absent until a run is recorded");
  ok(state.payload.result.as_of === new Date().toISOString().slice(0, 10), "status names the comparison date");

  // Records, pins, a journal, and a mapped gold set.
  const loaded = project("loaded", {
    frontMatter: [
      "schema_version: 2",
      "project_id: loaded-project",
      "project_root: .",
      "subroots: []",
      "tracker:",
      "  adapter: github-project",
      "  project: Fixture-Board",
      "privacy:",
      "  level: standard",
      "  external_transfer: denied",
      "  third_party_personal: refused",
      "startup:",
      "  budget_bytes: 12288",
      "",
    ].join("\n"),
    current: daysAgo(0),
    extras: {
      "knowledge/memory/facts/one.md": "# One\n",
      "knowledge/memory/facts/two.md": "# Two\n",
      "knowledge/memory/decisions/choice.md": "# Choice\n",
      "knowledge/memory/pins.md": "# Pins\n",
      ".memory/journal.json": "{}\n",
      "docs/retrieval-questions.md": "# Questions\n",
      "knowledge/map.md": "# Map\n\n| Role | Path |\n| --- | --- |\n| Retrieval gold set | `docs/retrieval-questions.md` |\n",
    },
  });
  const loadedCaps = call(loaded, "capabilities");
  ok(loadedCaps.payload.result.tracker === "github-project", "a configured tracker adapter is reported by name");
  ok(loadedCaps.payload.result.budget_bytes === 12288, "a configured startup budget wins over the default");
  ok(loadedCaps.payload.result.pin_count === 0, "a pins file holding no entry reports no pins");
  ok(
    loadedCaps.payload.result.degraded.some((entry) => entry.feature === "crash recovery"),
    "a present journal appears in the degraded list",
  );
  ok(
    codes(loadedCaps.payload.warnings).includes("write/journal-present"),
    "a present journal warns without stopping a read",
  );
  ok(loadedCaps.code === 0, "a present journal still exits 0 on a read operation");

  const loadedStatus = call(loaded, "status");
  ok(loadedStatus.payload.result.counts.facts === 2, "status counts the facts folder");
  ok(loadedStatus.payload.result.counts.decisions === 1, "status counts the decisions folder");
  ok(loadedStatus.payload.result.journal_present === true, "status reports the recovery journal");
  ok(
    loadedStatus.payload.result.gold_set === "docs/retrieval-questions.md",
    "status reports the gold set mapped in knowledge/map.md",
  );

  // Missing and stale current state.
  const stale = project("stale", { frontMatter: STANDARD_FRONT_MATTER, current: daysAgo(5) });
  const staleStatus = call(stale, "status");
  ok(staleStatus.payload.result.stale === true, "a current file older than 72 hours is stale");
  ok(
    codes(staleStatus.payload.warnings).includes("startup/stale-current"),
    "a stale current file is a warning, never an error",
  );
  ok(staleStatus.code === 0, "a stale current file keeps the operation usable");

  const missing = project("missing", { frontMatter: STANDARD_FRONT_MATTER, current: null });
  const missingStatus = call(missing, "status");
  ok(missingStatus.payload.result.current_md.state === "missing", "a missing current file is reported as missing");
  ok(missingStatus.payload.result.stale === true, "a missing current file counts as stale");

  // The privacy boundary fails closed.
  const unreadable = project("privacy", {
    frontMatter: [
      "schema_version: 2",
      "project_id: closed-project",
      "project_root: .",
      "privacy:",
      "  level: whatever",
      "  external_transfer: approved",
      "",
    ].join("\n"),
    current: daysAgo(0),
  });
  const closed = call(unreadable, "capabilities");
  ok(closed.payload.result.privacy.level === "sensitive", "an unknown privacy level reads as sensitive");
  ok(
    closed.payload.result.external_transfer === "denied",
    "approved transfer with no consent link reads as denied",
  );
  ok(
    closed.payload.result.privacy.third_party_personal === "refused",
    "a missing third-party value reads as refused",
  );
  ok(
    codes(closed.payload.warnings).includes("privacy/consent-missing"),
    "the missing consent link is reported",
  );

  // Scope resolution.
  const nested = resolve(loaded, "docs");
  ok(call(nested, "capabilities").payload.project_id === "loaded-project", "scope resolves from a subdirectory");

  const bare = fixture("bare");
  const unresolved = call(bare, "capabilities");
  ok(unresolved.code === 2, "a directory outside any memory project exits 2");
  ok(unresolved.payload.status === "error", "an unresolved scope is an error, not a refusal");
  ok(
    codes(unresolved.payload.errors).includes("scope/unresolved-root"),
    "an unresolved scope names the scope reason code",
  );

  // Call-shape refusals. An operation or flag this build does not define is a
  // call it could not evaluate, which is exit 2, not a refusal.
  const unknown = call(plain, "session-search", "--query", "anything");
  ok(unknown.code === 2, "an operation this build does not carry exits 2");
  ok(unknown.payload.status === "error", "an unavailable operation could not be evaluated");
  ok(
    codes(unknown.payload.errors).includes("cli/invalid-invocation"),
    "the invalid call names a reason code from the closed list",
  );
  ok(call(plain, "capabilities", "--json").code === 2, "capabilities rejects a flag it does not define");
  ok(call(plain).code === 2, "a missing operation is an invalid invocation");

  // The shipped version 2 template tree resolves and reports.
  const fromTemplate = fixture("template");
  cpSync(templates, resolve(fromTemplate, "knowledge"), { recursive: true });
  const templateCaps = call(fromTemplate, "capabilities");
  ok(templateCaps.code === 0, "the shipped template tree resolves a scope");
  ok(
    templateCaps.payload.result.privacy.level === "standard",
    "the template privacy block parses as written",
  );
  ok(
    templateCaps.payload.result.budget_bytes === 10240,
    "the template leaves the budget at the default",
  );
  ok(call(fromTemplate, "status").payload.result.stale === true, "the template placeholder date reads as stale");

  console.log(`ALL PASS (${passed} checks), FAIL: 0`);
} finally {
  for (const path of fixtures.reverse()) rmSync(path, { recursive: true, force: true });
}

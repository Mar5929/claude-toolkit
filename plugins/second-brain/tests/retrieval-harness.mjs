#!/usr/bin/env node

/**
 * Harness for the retrieval router.
 *
 * It builds temporary projects, runs the real command line, and asserts what
 * architecture section 15 promises: questions route through the tiers, results
 * carry the section 15.2 minimum contract, a specification outranks a derived
 * memory at equal relevance, an empty answer stays empty at exit 0, a query
 * that will not parse is an error at exit 2 rather than no evidence, and every
 * read leaves the project exactly as it found it.
 *
 * AT-13 is consequential recall: search locates the record, get opens the
 * whole record, and sources reaches the original evidence file. AT-15 is the
 * unanswerable question, which comes back empty with the searched scope named.
 * AT-17 is the `.memory/`-absent fixture at the end: every retrieval operation
 * answers with no `.memory/` folder present, and the project holds exactly the
 * same bytes and exactly the same files afterwards.
 *
 * Run: node plugins/second-brain/tests/retrieval-harness.mjs
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, relative, resolve } from "node:path";
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
  const path = mkdtempSync(join(realpathSync(tmpdir()), `memory-retrieval-${name}-`));
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

function paths(results) {
  return (results ?? []).map((entry) => entry.path);
}

/** Every file in the project, so a read can be shown to change none of them. */
function snapshot(base) {
  const contents = new Map();
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      contents.set(relative(base, path), readFileSync(path, "utf8"));
    }
  };
  walk(base);
  return contents;
}

function same(first, second) {
  if (first.size !== second.size) return false;
  for (const [path, text] of first) {
    if (second.get(path) !== text) return false;
  }
  return true;
}

function currentText() {
  return [
    "---",
    "updated: 2026-08-20",
    "---",
    "",
    "# Current state",
    "",
    "## Current focus",
    "",
    "Proving the retrieval router.",
    "",
    "## Blockers",
    "",
    "None.",
    "",
    "## Next step",
    "",
    "Run the retrieval harness.",
    "",
    "## Handoff",
    "",
    "The router reads canonical Markdown directly.",
    "",
  ].join("\n");
}

/** A record with whatever front matter a fixture needs on top of the core. */
function record(type, id, summary, { fields = [], body = [], sections = [] } = {}) {
  return [
    "---",
    "schema_version: 2",
    `id: ${id}`,
    `type: ${type}`,
    "status: active",
    "epistemic_status: documented",
    "recorded_at: 2026-08-19",
    "approval:",
    "  actor: owner",
    "  approved_at: 2026-08-19",
    "  action: add",
    "evidence:",
    "  - source_type: owner_statement",
    "    locator: knowledge/specs/retrieval-policy.md",
    "based_on: []",
    ...fields,
    "---",
    "",
    `# ${summary}`,
    "",
    `${summary}.`,
    "",
    ...(body.length ? [...body, ""] : []),
    ...sections,
  ].join("\n");
}

const SPEC = [
  "---",
  "id: spec-retrieval-policy",
  "status: active",
  "---",
  "",
  "# Retrieval policy",
  "",
  "Retrieval reads canonical Markdown directly and creates no local state.",
  "",
  "A search opens the whole record rather than a detached chunk.",
  "",
].join("\n");

const UNVERSIONED_SPEC = [
  "# Escalation policy",
  "",
  "An unanswerable escalation question returns an honest failure.",
  "",
].join("\n");

/** A project shaped like the required core, with records to retrieve. */
function project(name, options = {}) {
  const base = fixture(name);
  cpSync(templates, resolve(base, "knowledge"), { recursive: true });
  let settings = read(base, "knowledge/project.md")
    .replace("replace-with-a-stable-project-id", `fixture-${name}`);
  if (options.subroot) {
    settings = settings.replace(/^subroots:.*$/m, `subroots: [${options.subroot}]`);
  }
  write(base, "knowledge/project.md", settings);
  write(base, "knowledge/current.md", currentText());
  write(base, "knowledge/specs/retrieval-policy.md", SPEC);
  write(base, "knowledge/specs/escalation.md", UNVERSIONED_SPEC);

  write(
    base,
    "knowledge/memory/facts/retrieval-state.md",
    record("fact", "fact-retrieval-state", "Retrieval creates no local state", {
      fields: ["domain: retrieval", "topics: [state, reads]", "entities: [retrieval router]"],
      body: ["The router reads canonical Markdown directly and writes nothing at all."],
    }),
  );
  write(
    base,
    "knowledge/memory/facts/chunking.md",
    record("fact", "fact-chunking", "A search result opens the whole record", {
      fields: ["domain: retrieval", "topics: [chunks]", "entities: [retrieval router]"],
      body: ["A detached chunk hides the status and the provenance a reader needs."],
    }),
  );
  write(
    base,
    "knowledge/memory/decisions/read-directly.md",
    record("decision", "decision-read-directly", "The router reads canonical Markdown directly", {
      fields: ["domain: retrieval", "topics: [state]", "entities: [retrieval router]"],
      sections: [
        "## Context",
        "",
        "An index would be a second home for the same meaning.",
        "",
        "## Decision",
        "",
        "Retrieval reads the canonical files on every call.",
        "",
        "## Reason",
        "",
        "A cache drifts from the files it was built from.",
        "",
        "## Rejected options",
        "",
        "A stored search index.",
        "",
        "## Consequences",
        "",
        "Every read is a little slower and always current.",
        "",
      ],
    }),
  );
  for (const [path, content] of Object.entries(options.files ?? {})) write(base, path, content);
  return base;
}

/** An inferred record, which the authority order puts below evidenced memory. */
const INFERRED = [
  "---",
  "schema_version: 2",
  "id: fact-inferred-latency",
  "type: fact",
  "status: active",
  "epistemic_status: inferred",
  "recorded_at: 2026-08-19",
  "domain: retrieval",
  "entities: [retrieval router]",
  "approval:",
  "  actor: owner",
  "  approved_at: 2026-08-19",
  "  action: add",
  "evidence:",
  "  - source_type: agent_observation",
  "    locator: knowledge/specs/retrieval-policy.md",
  "based_on: [fact-retrieval-state]",
  "---",
  "",
  "# Reading canonical Markdown directly is fast enough",
  "",
  "Reading canonical Markdown directly is fast enough at this project size.",
  "",
].join("\n");

/** A superseded record, which is history rather than current truth. */
const SUPERSEDED = [
  "---",
  "schema_version: 2",
  "id: event-index-retired",
  "type: event",
  "status: superseded",
  "epistemic_status: documented",
  "recorded_at: 2026-06-01",
  "occurred_at: 2026-06-01",
  "effective_from: 2026-06-01",
  "effective_to: 2026-08-01",
  "entities: [retrieval router]",
  "approval:",
  "  actor: owner",
  "  approved_at: 2026-06-01",
  "  action: add",
  "evidence:",
  "  - source_type: owner_statement",
  "    locator: knowledge/specs/retrieval-policy.md",
  "based_on: []",
  "---",
  "",
  "# The generated index answered retrieval questions",
  "",
  "The generated index answered retrieval questions until August 2026.",
  "",
].join("\n");

/** A record whose cited source is not in the project at all. */
const MISSING_SOURCE = [
  "---",
  "schema_version: 2",
  "id: fact-missing-source",
  "type: fact",
  "status: active",
  "epistemic_status: documented",
  "recorded_at: 2026-08-19",
  "entities: [escalation]",
  "approval:",
  "  actor: owner",
  "  approved_at: 2026-08-19",
  "  action: add",
  "evidence:",
  "  - source_type: owner_statement",
  "    locator: knowledge/specs/not-written-yet.md",
  "  - source_type: web",
  "    locator: https://example.invalid/policy",
  "based_on: [fact-retrieval-state, fact-not-here]",
  "---",
  "",
  "# Escalation waits on the written policy",
  "",
  "Escalation waits on the written policy.",
  "",
].join("\n");

try {
  // -------------------------------------------------------------------------
  // Tier 2: curated project search, the result contract, and the ranking.
  // -------------------------------------------------------------------------
  const first = project("search", {
    files: {
      "knowledge/memory/facts/inferred-latency.md": INFERRED,
      "knowledge/memory/events/index-retired.md": SUPERSEDED,
    },
  });

  const found = call(first, "search", "--query", "canonical Markdown directly");
  ok(found.code === 0, "search exits 0");
  ok(found.stderr === "", "search writes nothing to standard error");
  ok(found.payload.operation === "memory_search", "the envelope names memory_search");
  ok(found.payload.result.length > 0, "a question the project can answer returns results");

  const top = found.payload.result[0];
  ok(
    ["project_id", "layer", "path", "status", "summary", "provenance", "match_reason"]
      .every((field) => Object.hasOwn(top, field)),
    "every result carries the section 15.2 minimum contract",
  );
  ok(Object.hasOwn(top, "record_id"), "a result names its record id, or null where it has none");
  ok(top.project_id === "fixture-search", "a result names the project that answered");
  ok(top.layer === "spec", "a specification outranks a derived memory at equal relevance");
  ok(top.path === "knowledge/specs/retrieval-policy.md", "the specification is the first result");
  ok(typeof top.match_reason === "string" && top.match_reason.includes("matched"), "a result says why it matched");

  const layers = found.payload.result.map((entry) => entry.layer);
  ok(
    layers.indexOf("owner-statement") < layers.indexOf("inference"),
    "evidenced memory outranks an inference at equal relevance",
  );
  ok(
    found.payload.result.every((entry) => entry.provenance && Array.isArray(entry.provenance.evidence)),
    "every result carries its provenance",
  );

  const unversioned = found.payload.result.find(
    (entry) => entry.path === "knowledge/specs/escalation.md",
  );
  ok(unversioned === undefined, "a specification that answers nothing is not returned");

  const degraded = call(first, "search", "--query", "escalation");
  ok(
    degraded.payload.result.some((entry) => typeof entry.degraded_warning === "string"),
    "a file with no readable provenance carries a degraded-state warning",
  );

  ok(found.payload.searched.length > 0, "search names the scope it covered");
  ok(
    found.payload.searched.some((entry) => entry.area === "knowledge/specs")
      && found.payload.searched.some((entry) => entry.area === "knowledge/memory"),
    "the searched scope names the project layers",
  );
  ok(
    found.payload.searched.some((entry) => entry.area === "tracker")
      && found.payload.searched.some((entry) => entry.area === "session-history"),
    "the searched scope names tracker and session-history availability",
  );

  const again = call(first, "search", "--query", "canonical Markdown directly");
  ok(again.stdout === found.stdout, "the same question returns the same bytes");

  // -------------------------------------------------------------------------
  // Empty stays empty, and a broken query is an error rather than no evidence.
  // -------------------------------------------------------------------------
  const nothing = call(first, "search", "--query", "kubernetes ingress certificate");
  ok(nothing.code === 0, "a question this project cannot answer exits 0");
  ok(Array.isArray(nothing.payload.result) && nothing.payload.result.length === 0, "an empty answer stays empty");
  ok(nothing.payload.status === "ok", "an empty answer is a result, not a failure");
  ok(nothing.payload.searched.length > 0, "AT-15: an empty answer still names the searched scope");

  const unclosed = call(first, "search", "--query", '"unclosed phrase');
  ok(unclosed.code === 2, "a query that will not parse exits 2");
  ok(unclosed.payload.status === "error", "a parse failure is an error");
  ok(codes(unclosed.payload.errors).includes("retrieval/parse-error"), "the parse failure names its code");
  ok(unclosed.payload.result === null, "a parse failure returns no result at all");

  const empty = call(first, "search", "--query", "   ");
  ok(empty.code === 2, "a query with no searchable term exits 2");
  ok(codes(empty.payload.errors).includes("retrieval/parse-error"), "an unsearchable query is a parse error");

  const badType = call(first, "search", "--query", "retrieval", "--type", "note");
  ok(badType.code === 2, "a filter value outside the schema exits 2");
  ok(
    codes(badType.payload.errors).includes("retrieval/unsupported-filter"),
    "an unknown filter value is retrieval/unsupported-filter",
  );

  const badStatus = call(first, "search", "--query", "retrieval", "--status", "draft");
  ok(
    codes(badStatus.payload.errors).includes("retrieval/unsupported-filter"),
    "an unknown status value is retrieval/unsupported-filter",
  );

  ok(call(first, "search").code === 2, "search with no query is a call-shape error");
  ok(
    codes(call(first, "search").payload.errors).includes("cli/invalid-invocation"),
    "a missing required flag is cli/invalid-invocation",
  );

  // -------------------------------------------------------------------------
  // Filters, and the line between current truth and history.
  // -------------------------------------------------------------------------
  const decisions = call(first, "search", "--query", "retrieval", "--type", "decision");
  ok(
    paths(decisions.payload.result).every((path) => path.startsWith("knowledge/memory/decisions/")),
    "a type filter returns only that record type",
  );
  const byDomain = call(first, "search", "--query", "retrieval", "--domain", "retrieval");
  ok(byDomain.payload.result.length > 0, "a domain filter returns the records that carry it");
  const byTopic = call(first, "search", "--query", "retrieval", "--topic", "chunks");
  ok(
    paths(byTopic.payload.result).includes("knowledge/memory/facts/chunking.md"),
    "a topic filter returns the records that carry it",
  );

  const current = call(first, "search", "--query", "generated index");
  ok(
    !paths(current.payload.result).includes("knowledge/memory/events/index-retired.md"),
    "a superseded record stays out of a current-truth answer",
  );
  const history = call(first, "search", "--query", "generated index", "--status", "superseded");
  ok(
    paths(history.payload.result).includes("knowledge/memory/events/index-retired.md"),
    "asking for history returns the superseded record",
  );
  ok(
    history.payload.result[0].degraded_warning.includes("superseded"),
    "a superseded result says it is not current truth",
  );

  const limited = call(first, "search", "--query", "retrieval router", "--limit", "1");
  ok(limited.payload.result.length === 1, "--limit caps the number of results");
  ok(call(first, "search", "--query", "retrieval", "--limit", "0").code === 2, "--limit 0 is a call-shape error");

  // -------------------------------------------------------------------------
  // Tier 1: exact lookup by id and by path, and the refusals it owns.
  // -------------------------------------------------------------------------
  const whole = call(first, "get", "--id", "decision-read-directly");
  ok(whole.code === 0, "get exits 0 on a record this project carries");
  ok(whole.payload.result.path === "knowledge/memory/decisions/read-directly.md", "get resolves the path");
  ok(whole.payload.result.front_matter.id === "decision-read-directly", "get returns the parsed front matter");
  ok(whole.payload.result.title === "The router reads canonical Markdown directly", "get returns the H1");
  ok(whole.payload.result.summary.length > 0, "get returns the summary sentence");
  ok(
    whole.payload.result.body === read(first, "knowledge/memory/decisions/read-directly.md"),
    "get returns the whole record and never a fragment",
  );

  const byPath = call(first, "get", "--path", "knowledge/memory/decisions/read-directly.md");
  ok(byPath.payload.result.record_id === "decision-read-directly", "get by path finds the same record");

  const missing = call(first, "get", "--id", "decision-not-here");
  ok(missing.code === 1, "get on an unknown id exits 1");
  ok(codes(missing.payload.errors).includes("record/unknown-id"), "an unknown id is record/unknown-id");

  const outside = call(first, "get", "--path", "../escape.md");
  ok(outside.code === 1, "get on a path outside the scope exits 1");
  ok(codes(outside.payload.errors).includes("scope/outside-root"), "a path outside the scope is scope/outside-root");
  ok(call(first, "get").code === 2, "get with neither id nor path is a call-shape error");

  // -------------------------------------------------------------------------
  // AT-13: consequential recall opens the record and the original evidence.
  // -------------------------------------------------------------------------
  const located = call(first, "search", "--query", "canonical Markdown directly", "--type", "decision");
  const opened = call(first, "get", "--id", located.payload.result[0].record_id);
  const evidence = call(first, "sources", "--id", opened.payload.result.record_id);
  ok(evidence.code === 0, "sources exits 0 on a record this project carries");
  ok(evidence.payload.result.evidence.length === 1, "sources returns the record's evidence entries");
  ok(evidence.payload.result.evidence[0].reachable === true, "a source inside the project is reported reachable");
  const cited = evidence.payload.result.evidence[0].locator;
  ok(existsSync(resolve(first, cited)), "AT-13: the cited evidence is a file the answer can open");
  ok(
    call(first, "get", "--path", cited).payload.result.body === read(first, cited),
    "AT-13: following provenance reaches the original evidence in full",
  );

  const unknownSources = call(first, "sources", "--id", "fact-not-here");
  ok(unknownSources.code === 1, "sources on an unknown id exits 1");
  ok(codes(unknownSources.payload.errors).includes("record/unknown-id"), "sources names the unknown id");

  // -------------------------------------------------------------------------
  // Unreachable sources are warnings, not failures.
  // -------------------------------------------------------------------------
  const second = project("sources", {
    files: { "knowledge/memory/facts/missing-source.md": MISSING_SOURCE },
  });
  const gaps = call(second, "sources", "--id", "fact-missing-source");
  ok(gaps.code === 0, "an unreachable source still exits 0");
  ok(
    codes(gaps.payload.warnings).includes("startup/missing-source"),
    "an unreachable source is a warning, not a failure",
  );
  ok(
    gaps.payload.result.evidence.find((entry) => entry.locator.startsWith("https:")).reachable === null,
    "a source outside the project is reported as unchecked rather than missing",
  );
  ok(
    gaps.payload.result.based_on.find((entry) => entry.record_id === "fact-retrieval-state").path
      === "knowledge/memory/facts/retrieval-state.md",
    "based_on resolves to the records it names",
  );
  ok(
    codes(gaps.payload.warnings).includes("record/unknown-id"),
    "a based_on entry no record carries is reported",
  );

  // -------------------------------------------------------------------------
  // Tier 3: the dated sequence for one entity, history included.
  // -------------------------------------------------------------------------
  const timeline = call(first, "timeline", "--entity", "retrieval router");
  ok(timeline.code === 0, "timeline exits 0");
  const ids = timeline.payload.result.map((entry) => entry.record_id);
  ok(ids.includes("event-index-retired"), "the timeline keeps superseded records for history questions");
  ok(ids[0] === "event-index-retired", "the timeline runs oldest first");
  ok(
    timeline.payload.result.every((entry) => ["record_id", "type", "status", "effective_from", "effective_to", "occurred_at", "summary"]
      .every((field) => Object.hasOwn(entry, field))),
    "every timeline entry carries the fields the contract names",
  );

  const windowed = call(first, "timeline", "--entity", "retrieval router", "--from", "2026-07-01");
  ok(
    !windowed.payload.result.map((entry) => entry.record_id).includes("event-index-retired"),
    "a from date drops what happened before it",
  );
  const nobody = call(first, "timeline", "--entity", "nobody-here");
  ok(nobody.code === 0 && nobody.payload.result.length === 0, "an entity with no records is an empty timeline");
  const badDate = call(first, "timeline", "--entity", "retrieval router", "--from", "last summer");
  ok(badDate.code === 2, "a date that will not parse exits 2");
  ok(codes(badDate.payload.errors).includes("retrieval/parse-error"), "a bad date is a parse error");

  // -------------------------------------------------------------------------
  // The two specification operations.
  // -------------------------------------------------------------------------
  const specs = call(first, "spec-search", "--query", "whole record");
  ok(specs.payload.operation === "spec_search", "the envelope names spec_search");
  ok(specs.payload.result.length > 0, "spec-search finds approved behavior");
  ok(
    specs.payload.result.every((entry) => entry.layer === "spec"
      && entry.path.startsWith("knowledge/specs/")),
    "spec-search returns specifications and nothing else",
  );

  const specById = call(first, "spec-get", "--id", "spec-retrieval-policy");
  ok(specById.payload.operation === "spec_get", "the envelope names spec_get");
  ok(
    specById.payload.result.body === read(first, "knowledge/specs/retrieval-policy.md"),
    "spec-get returns the whole specification",
  );
  const specByStem = call(first, "spec-get", "--id", "escalation");
  ok(
    specByStem.payload.result.path === "knowledge/specs/escalation.md",
    "a specification with no front matter id is found by its file stem",
  );
  const notASpec = call(first, "spec-get", "--path", "knowledge/memory/facts/chunking.md");
  ok(notASpec.code === 1, "spec-get refuses a path that is not a specification");
  const specMissing = call(first, "spec-get", "--id", "spec-not-here");
  ok(specMissing.code === 1, "spec-get on an unknown id exits 1");
  ok(codes(specMissing.payload.errors).includes("record/unknown-id"), "spec-get names the unknown id");

  // -------------------------------------------------------------------------
  // A candidate that belongs to another scope is dropped before ranking.
  // -------------------------------------------------------------------------
  const nested = project("subroot", { subroot: "knowledge/memory/facts/vendor" });
  write(
    nested,
    "knowledge/memory/facts/vendor/vendor-state.md",
    record("fact", "fact-vendor-state", "The vendor project stores its own retrieval state"),
  );
  const scoped = call(nested, "search", "--query", "retrieval state");
  ok(
    !paths(scoped.payload.result).includes("knowledge/memory/facts/vendor/vendor-state.md"),
    "a candidate inside a declared subroot is dropped, not returned",
  );
  ok(
    codes(scoped.payload.warnings).includes("scope/cross-scope-result"),
    "the dropped candidate is reported as a warning rather than a failure",
  );
  ok(scoped.code === 0, "a dropped out-of-scope candidate does not fail the search");

  // -------------------------------------------------------------------------
  // AT-45: an id or path another scope owns is a cross-scope refusal naming
  // the operation, the path, and the resolved root. An id nothing owns stays
  // record/unknown-id, so the two answers keep meaning different things.
  // -------------------------------------------------------------------------
  const crossGet = call(nested, "get", "--id", "fact-vendor-state");
  ok(crossGet.code === 1, "get on an id another scope owns exits 1");
  ok(
    codes(crossGet.payload.errors).includes("scope/cross-scope-result"),
    "AT-45: a cross-scope id is scope/cross-scope-result, not record/unknown-id",
  );
  const crossMessage = crossGet.payload.errors[0].message;
  ok(crossMessage.includes("memory_get"), "AT-45: the refusal names the operation");
  ok(
    crossMessage.includes("knowledge/memory/facts/vendor/vendor-state.md"),
    "AT-45: the refusal names the path",
  );
  ok(
    crossMessage.includes(crossGet.payload.scope_root),
    "AT-45: the refusal names the resolved scope root",
  );
  ok(
    codes(call(nested, "get", "--id", "fact-not-here-at-all").payload.errors)
      .includes("record/unknown-id"),
    "an id no scope carries stays record/unknown-id",
  );
  ok(
    codes(call(nested, "get", "--path", "knowledge/memory/facts/vendor/vendor-state.md").payload.errors)
      .includes("scope/cross-scope-result"),
    "a path inside the root that a subroot owns is cross-scope, not outside-root",
  );
  ok(
    codes(call(nested, "get", "--path", "../escape.md").payload.errors).includes("scope/outside-root"),
    "a path that is not beneath the root at all stays scope/outside-root",
  );
  ok(
    call(nested, "get", "--path", "../escape.md").payload.errors[0].message
      .includes(crossGet.payload.scope_root),
    "AT-45: the outside-root refusal names the operation and the resolved root too",
  );
  ok(
    codes(call(nested, "related", "--id", "fact-vendor-state").payload.errors)
      .includes("scope/cross-scope-result"),
    "related refuses a cross-scope id the same way",
  );
  ok(
    codes(call(nested, "sources", "--id", "fact-vendor-state").payload.errors)
      .includes("scope/cross-scope-result"),
    "sources refuses a cross-scope id the same way",
  );

  // The same answer when the subroot is a project in its own right, which is
  // the section 21.11 monorepo fixture. The message names that project.
  const parent = project("monorepo", { subroot: "apps/vendor" });
  const child = resolve(parent, "apps/vendor");
  cpSync(templates, resolve(child, "knowledge"), { recursive: true });
  write(
    child,
    "knowledge/project.md",
    read(child, "knowledge/project.md").replace("replace-with-a-stable-project-id", "fixture-vendor"),
  );
  write(child, "knowledge/current.md", currentText());
  write(
    child,
    "knowledge/memory/facts/own-state.md",
    record("fact", "fact-vendor-own-state", "The vendor project keeps its own state"),
  );
  const acrossProjects = call(parent, "get", "--id", "fact-vendor-own-state");
  ok(acrossProjects.code === 1, "a record another declared project owns is refused");
  ok(
    codes(acrossProjects.payload.errors).includes("scope/cross-scope-result"),
    "AT-45: a record in a declared nested project is a cross-scope refusal",
  );
  ok(
    acrossProjects.payload.errors[0].message.includes("fixture-vendor"),
    "AT-45: the refusal names the project that owns the record",
  );
  ok(
    call(parent, "pin", "--id", "fact-vendor-own-state", "--propose").payload.errors[0].code
      === "scope/cross-scope-result",
    "AT-45: a cross-scope pin id is refused with the same code",
  );
  ok(
    codes(call(parent, "delete", "--id", "fact-vendor-own-state", "--reason", "not mine", "--propose")
      .payload.errors).includes("scope/cross-scope-result"),
    "AT-45: a lifecycle operation cannot reach a record another scope owns",
  );

  // -------------------------------------------------------------------------
  // AT-17: every retrieval operation works with `.memory/` absent and leaves
  // the project byte for byte as it found it.
  // -------------------------------------------------------------------------
  const bare = project("no-memory-folder", {
    files: {
      "knowledge/memory/facts/inferred-latency.md": INFERRED,
      "knowledge/memory/events/index-retired.md": SUPERSEDED,
    },
  });
  rmSync(resolve(bare, ".memory"), { recursive: true, force: true });
  ok(!existsSync(resolve(bare, ".memory")), "the fixture starts with no .memory/ folder");

  const before = snapshot(bare);
  const reads = [
    ["search", "--query", "canonical Markdown directly"],
    ["search", "--query", "kubernetes ingress certificate"],
    ["search", "--query", '"unclosed phrase'],
    ["get", "--id", "decision-read-directly"],
    ["get", "--path", "knowledge/memory/facts/retrieval-state.md"],
    ["get", "--id", "decision-not-here"],
    ["timeline", "--entity", "retrieval router"],
    ["sources", "--id", "decision-read-directly"],
    ["related", "--id", "decision-read-directly"],
    ["spec-search", "--query", "whole record"],
    ["spec-get", "--path", "knowledge/specs/retrieval-policy.md"],
  ];
  const answered = reads.map((args) => call(bare, ...args));
  ok(
    answered[0].code === 0 && answered[0].payload.result.length > 0,
    "AT-17: search answers with no .memory/ folder present",
  );
  ok(answered[3].code === 0 && answered[3].payload.result.body.length > 0, "AT-17: get answers with .memory/ absent");
  ok(answered[6].code === 0 && answered[6].payload.result.length > 0, "AT-17: timeline answers with .memory/ absent");
  ok(answered[7].code === 0, "AT-17: sources answers with .memory/ absent");
  ok(answered[9].code === 0 && answered[9].payload.result.length > 0, "AT-17: spec-search answers with .memory/ absent");
  ok(answered[10].code === 0, "AT-17: spec-get answers with .memory/ absent");
  ok(answered[1].code === 0 && answered[1].payload.result.length === 0, "AT-17: an empty answer stays empty");
  ok(answered[2].code === 2, "AT-17: an error stays an error");

  ok(!existsSync(resolve(bare, ".memory")), "AT-17: no read creates a .memory/ folder");
  const after = snapshot(bare);
  ok(after.size === before.size, "AT-17: reading creates no file anywhere in the project");
  ok(same(before, after), "AT-17: every file holds exactly the bytes it held before the reads");

  console.log(`\n${passed} checks passed.`);
} finally {
  for (const path of fixtures) rmSync(path, { recursive: true, force: true });
}

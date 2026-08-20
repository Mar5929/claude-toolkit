#!/usr/bin/env node

/**
 * Harness for the review engine.
 *
 * It builds temporary projects, runs the real command line, and asserts what
 * architecture section 17 promises: review returns a worklist across the
 * section 17 categories, every item names what is wrong and one operation that
 * could fix it, a focused review runs the categories a save can break, a deep
 * review adds the whole-corpus categories, the gold-set category reports
 * itself as skipped rather than as a pass, and review writes nothing at all.
 *
 * The write proof is two-sided, because one side alone is not a proof. The
 * no-new-files assertion covers the tool's own writes: the project holds the
 * same files and the same bytes after a review that found fifteen problems,
 * with no `.memory/` folder before or after. The P2-3 guard covers every other
 * route: a hand edit of the record review just flagged is refused, so the only
 * way an item becomes a change is the cleanup skill running the ordinary
 * two-phase review.
 *
 * Run: node plugins/second-brain/tests/review-harness.mjs
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
const guardHook = resolve(plugin, "hooks/memory-write-guard.mjs");
const templates = resolve(plugin, "skills/second-brain/references/templates-v2/knowledge");
const fixtures = [];
let passed = 0;

function ok(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed++;
  console.log(`PASS: ${message}`);
}

function fixture(name) {
  const path = mkdtempSync(join(realpathSync(tmpdir()), `memory-review-${name}-`));
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

/** The guard the way Claude Code runs it: its own process, event on stdin. */
function guard(cwd, event) {
  const run = spawnSync(process.execPath, [guardHook], {
    cwd,
    input: JSON.stringify({ hook_event_name: "PreToolUse", cwd, ...event }),
    encoding: "utf8",
  });
  let payload = null;
  try {
    payload = run.stdout.trim() ? JSON.parse(run.stdout) : null;
  } catch {
    payload = null;
  }
  const decision = payload?.hookSpecificOutput ?? {};
  return {
    code: run.status,
    denied: decision.permissionDecision === "deny",
    reason: decision.permissionDecisionReason ?? "",
  };
}

function codes(entries) {
  return (entries ?? []).map((entry) => entry.code);
}

function categories(items) {
  return [...new Set((items ?? []).map((item) => item.category))];
}

function inCategory(items, category) {
  return (items ?? []).filter((item) => item.category === category);
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
    "Proving the review engine.",
    "",
    "## Blockers",
    "",
    "None.",
    "",
    "## Next step",
    "",
    "Run the review harness.",
    "",
    "## Handoff",
    "",
    "Review reads and writes nothing.",
    "",
  ].join("\n");
}

/** A record with whatever front matter a fixture needs on top of the core. */
function record(type, id, summary, { fields = [], body = [], sections = [], status = "active" } = {}) {
  return [
    "---",
    "schema_version: 2",
    `id: ${id}`,
    `type: ${type}`,
    `status: ${status}`,
    "epistemic_status: documented",
    "recorded_at: 2026-08-19",
    "approval:",
    "  actor: owner",
    "  approved_at: 2026-08-19",
    "  action: add",
    "evidence:",
    "  - source_type: owner_statement",
    "    locator: knowledge/specs/review-policy.md",
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
  "id: spec-review-policy",
  "status: active",
  "---",
  "",
  "# Review policy",
  "",
  "Review returns a worklist and changes nothing.",
  "",
].join("\n");

const VENDOR_SPEC = [
  "---",
  "id: spec-vendor-policy",
  "status: active",
  "---",
  "",
  "# Vendor policy",
  "",
  "The vendor contract is billed monthly.",
  "",
].join("\n");

/** A project shaped like the required core, with nothing wrong in it. */
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
  write(base, "knowledge/specs/review-policy.md", SPEC);
  write(base, "knowledge/specs/vendor-policy.md", VENDOR_SPEC);
  write(
    base,
    "knowledge/memory/facts/read-only.md",
    record("fact", "fact-read-only", "Review reads the canonical files and writes nothing", {
      fields: ["domain: memory", "topics: [review, reads]"],
    }),
  );
  write(
    base,
    "knowledge/memory/decisions/worklist.md",
    record("decision", "decision-worklist", "Review returns a worklist instead of applying repairs", {
      fields: ["domain: memory", "topics: [review]"],
      sections: [
        "## Context",
        "",
        "A repair engine with its own write path would bypass approval.",
        "",
        "## Decision",
        "",
        "Review returns a worklist and the cleanup skill applies it.",
        "",
        "## Reason",
        "",
        "One approved write path is what the guard can hold.",
        "",
        "## Rejected options",
        "",
        "An automatic repair pass.",
        "",
        "## Consequences",
        "",
        "Every repair costs one approval.",
        "",
      ],
    }),
  );
  for (const [path, content] of Object.entries(options.files ?? {})) write(base, path, content);
  return base;
}

try {
  // -------------------------------------------------------------------------
  // A project with nothing wrong returns an empty worklist at exit 0.
  // -------------------------------------------------------------------------
  const clean = project("clean");
  const cleanRun = call(clean, "review");
  ok(cleanRun.code === 0, "a review of a healthy project exits 0");
  ok(cleanRun.payload.operation === "memory_review", "the envelope names memory_review");
  ok(cleanRun.payload.status === "ok", "a review that finds nothing is still ok");
  ok(Array.isArray(cleanRun.payload.result) && cleanRun.payload.result.length === 0,
    "a healthy project returns an empty worklist, never a message");
  ok(cleanRun.payload.errors.length === 0, "review raises no error on a healthy project");
  ok(cleanRun.payload.searched.length === 0, "review leaves the searched field empty");
  ok(
    codes(cleanRun.payload.warnings).includes("startup/missing-source")
      && cleanRun.payload.warnings.some((entry) => entry.message.includes("gold-set")),
    "the gold-set category reports itself as skipped rather than as a pass",
  );
  ok(call(clean, "review").stdout === cleanRun.stdout, "two reviews of the same files produce the same bytes");

  // -------------------------------------------------------------------------
  // The call shape. An unknown scope or a malformed date is exit 2.
  // -------------------------------------------------------------------------
  ok(call(clean, "review", "--scope", "focused").code === 0, "--scope focused is accepted");
  ok(call(clean, "review", "--scope", "deep").code === 0, "--scope deep is accepted");
  const badScope = call(clean, "review", "--scope", "everything");
  ok(badScope.code === 2, "an unknown review scope exits 2");
  ok(codes(badScope.payload.errors).includes("cli/invalid-invocation"), "the bad scope names a reason code");
  ok(call(clean, "review", "--since", "last week").code === 2, "--since takes a plain calendar date");
  ok(call(clean, "review", "--depth", "deep").code === 2, "review rejects a flag it does not define");

  // -------------------------------------------------------------------------
  // A project carrying one of everything section 17 names.
  // -------------------------------------------------------------------------
  const broken = project("broken");

  // Two records with the same wording and different sources.
  for (const [id, locator] of [["fact-vendor-rate-a", "knowledge/specs/vendor-policy.md"], ["fact-vendor-rate-b", "knowledge/map.md"]]) {
    write(
      broken,
      `knowledge/memory/facts/${id}.md`,
      record("fact", id, "The vendor bills a flat monthly rate for the support contract", {
        fields: ["domain: vendors", "topics: [billing]"],
      }).replace("locator: knowledge/specs/review-policy.md", `locator: ${locator}`),
    );
  }

  // Two records with nearly the same wording.
  write(
    broken,
    "knowledge/memory/facts/backup-window-a.md",
    record("fact", "fact-backup-window-a", "Nightly backups run inside the maintenance window every night", {
      fields: ["domain: operations", "topics: [backups]"],
    }),
  );
  write(
    broken,
    "knowledge/memory/facts/backup-window-b.md",
    record("fact", "fact-backup-window-b", "Nightly backups run inside the maintenance window every night at one", {
      fields: ["domain: operations", "topics: [backup]"],
    }),
  );

  // A conflict linked from both sides, and a conflict linked from one.
  write(
    broken,
    "knowledge/memory/decisions/tabs.md",
    record("decision", "decision-tabs", "The house style indents with tabs", {
      fields: ["conflicts_with: [decision-spaces]", "domain: style", "topics: [formatting]"],
      sections: ["## Context", "", "Two teams disagreed.", "", "## Decision", "", "Tabs.", "", "## Reason", "", "Accessibility.", "", "## Rejected options", "", "Spaces.", "", "## Consequences", "", "Diffs change.", ""],
    }),
  );
  write(
    broken,
    "knowledge/memory/decisions/spaces.md",
    record("decision", "decision-spaces", "The house style indents with spaces", {
      fields: ["conflicts_with: [decision-tabs]", "domain: style", "topics: [formatting]"],
      sections: ["## Context", "", "Two teams disagreed.", "", "## Decision", "", "Spaces.", "", "## Reason", "", "Consistency.", "", "## Rejected options", "", "Tabs.", "", "## Consequences", "", "Diffs change.", ""],
    }),
  );
  write(
    broken,
    "knowledge/memory/facts/one-sided.md",
    record("fact", "fact-one-sided", "The staging database is restored from the nightly dump", {
      fields: ["conflicts_with: [fact-other-side]", "domain: operations", "topics: [staging]"],
    }),
  );
  write(
    broken,
    "knowledge/memory/facts/other-side.md",
    record("fact", "fact-other-side", "The staging database is seeded from a fixture file", {
      fields: ["domain: operations", "topics: [staging]"],
    }),
  );

  // Provenance: an unreachable source, and a record with no evidence at all.
  write(
    broken,
    "knowledge/memory/facts/unreachable.md",
    record("fact", "fact-unreachable", "The support rota is published every Friday", {
      fields: ["domain: operations", "topics: [rota]"],
    }).replace("locator: knowledge/specs/review-policy.md", "locator: knowledge/specs/gone.md"),
  );
  write(
    broken,
    "knowledge/memory/facts/no-evidence.md",
    [
      "---",
      "schema_version: 2",
      "id: fact-no-evidence",
      "type: fact",
      "status: active",
      "epistemic_status: documented",
      "recorded_at: 2026-08-19",
      "approval:",
      "  actor: owner",
      "  approved_at: 2026-08-19",
      "  action: add",
      "evidence: []",
      "domain: operations",
      "topics: [rota]",
      "---",
      "",
      "# The rota owner approves swaps",
      "",
      "The rota owner approves swaps.",
      "",
    ].join("\n"),
  );

  // A review date that has passed, a broken id, and a broken relative link.
  write(
    broken,
    "knowledge/memory/facts/review-due.md",
    record("fact", "fact-review-due", "The certificate is renewed by the platform team", {
      fields: ["review_after: 2020-01-01", "domain: operations", "topics: [certificates]"],
    }),
  );
  write(
    broken,
    "knowledge/memory/facts/dangling.md",
    record("fact", "fact-dangling", "The archive is stored on the office server", {
      fields: ["conflicts_with: [fact-not-in-this-project]", "domain: operations", "topics: [archive]"],
      body: ["The detail sits in [the missing note](./not-here.md)."],
    }),
  );

  // A superseded record that names no successor.
  write(
    broken,
    "knowledge/memory/facts/old-rate.md",
    record("fact", "fact-old-rate", "The vendor billed by the hour until the contract changed", {
      status: "superseded",
      fields: ["domain: vendors", "topics: [billing]"],
    }),
  );

  // A retired phrase that survives somewhere else.
  write(
    broken,
    "knowledge/memory/decisions/retired-style.md",
    record("decision", "decision-retired-style", "The old naming convention was retired", {
      status: "retired",
      fields: ["domain: style", "topics: [naming]"],
      sections: [
        "## Context",
        "",
        "The convention confused new sessions.",
        "",
        "## Decision",
        "",
        "It was retired.",
        "",
        "## Reason",
        "",
        "It named the wrong thing.",
        "",
        "## Rejected options",
        "",
        "Keeping it.",
        "",
        "## Consequences",
        "",
        "Every current use needs correcting.",
        "",
        "## Retired phrases",
        "",
        "- `every folder gets a numbered prefix`",
        "",
      ],
    }),
  );
  write(
    broken,
    "knowledge/specs/naming.md",
    ["# Naming", "", "In this project every folder gets a numbered prefix.", ""].join("\n"),
  );

  // A generated view that no longer matches its inputs.
  write(
    broken,
    "knowledge/views/record-summaries.md",
    [
      "---",
      "generated: true",
      "generator: record-summaries",
      "inputs:",
      "  - knowledge/memory/facts",
      "fingerprint: sha256:0000000000000000000000000000000000000000000000000000000000000000",
      "---",
      "",
      "# Record summaries",
      "",
      "This file was hand edited after it was generated.",
      "",
    ].join("\n"),
  );

  // A pin whose approved summary no longer hashes to the approved value.
  write(
    broken,
    "knowledge/memory/pins.md",
    [
      "# Pinned records",
      "",
      "| Record id | Record | Pinned | Summary hash |",
      "| --- | --- | --- | --- |",
      "| fact-read-only | [knowledge/memory/facts/read-only.md](facts/read-only.md) | 2026-08-19 | sha256:1111111111111111111111111111111111111111111111111111111111111111 |",
      "",
    ].join("\n"),
  );

  const before = snapshot(broken);
  const found = call(broken, "review");
  const items = found.payload.result;
  ok(found.code === 0, "a review that finds fifteen problems still exits 0");
  ok(found.payload.status === "ok", "a worklist is a result, never a refusal");
  ok(items.length > 0, "the worklist carries the problems the project holds");

  ok(
    items.every((item) => typeof item.category === "string"
      && ["high", "medium", "low"].includes(item.severity)
      && Array.isArray(item.record_ids)
      && Array.isArray(item.paths)
      && typeof item.what_is_wrong === "string" && item.what_is_wrong.length > 0
      && typeof item.suggested_operation === "string" && item.suggested_operation.length > 0),
    "every item carries a category, a severity, the affected ids and paths, what is wrong, and one suggested operation",
  );
  const allowed = new Set([
    "add", "confirm", "correct", "supersede", "retire", "merge", "delete",
    "pin", "unpin", "move", "memory_rebuild_views",
  ]);
  ok(
    items.every((item) => allowed.has(item.suggested_operation)),
    "every suggested operation is a lifecycle operation, a pin operation, or the view rebuild",
  );
  ok(
    items.every((item) => item.record_ids.length > 0 || item.paths.length > 0),
    "every item names the records or the paths it is about",
  );

  const seen = categories(items);
  for (const category of [
    "duplicate-candidate",
    "evidence-consolidation",
    "current-conflict",
    "unlinked-conflict",
    "provenance",
    "stale-review-date",
    "broken-link",
    "supersession-gap",
    "retired-phrase",
    "stale-view",
    "pin-error",
  ]) {
    ok(seen.includes(category), `the focused worklist covers ${category}`);
  }

  ok(
    inCategory(items, "evidence-consolidation")[0].record_ids.join(",") === "fact-vendor-rate-a,fact-vendor-rate-b",
    "the same meaning resting on two sources is reported as one consolidation, not as two records to delete",
  );
  ok(
    inCategory(items, "duplicate-candidate").every((item) => item.suggested_operation === "merge"
      && item.what_is_wrong.includes("similar wording is never enough")),
    "a duplicate candidate says the owner settles it and that wording alone never merges",
  );
  ok(
    inCategory(items, "stale-review-date").every((item) => item.suggested_operation === "confirm"
      && !item.what_is_wrong.includes("delete")
      && item.what_is_wrong.includes("never for a removal")),
    "FR-045: a passed review date asks for a recheck and never proposes a removal",
  );
  ok(
    !items.some((item) => item.suggested_operation === "delete"),
    "nothing in the worklist proposes a deletion on age or duplication alone",
  );
  ok(
    inCategory(items, "current-conflict").some((item) => item.record_ids.includes("decision-tabs")
      && item.record_ids.includes("decision-spaces")),
    "two active conflicting decisions are reported as a current conflict",
  );
  ok(
    inCategory(items, "unlinked-conflict").some((item) => item.record_ids.includes("fact-one-sided")),
    "a conflict linked from one side only is reported so the link can be completed",
  );
  ok(
    !inCategory(items, "duplicate-candidate").some((item) => item.record_ids.includes("decision-tabs")),
    "records that already say they conflict are never offered as duplicates to merge",
  );
  ok(
    inCategory(items, "provenance").some((item) => item.what_is_wrong.includes("not reachable"))
      && inCategory(items, "provenance").some((item) => item.what_is_wrong.includes("cites no evidence")),
    "provenance covers both an unreachable source and a record resting on nothing",
  );
  ok(
    inCategory(items, "broken-link").some((item) => item.what_is_wrong.includes("fact-not-in-this-project"))
      && inCategory(items, "broken-link").some((item) => item.what_is_wrong.includes("not there")),
    "broken links cover a missing record id and a relative link with no file behind it",
  );
  ok(
    inCategory(items, "supersession-gap").some((item) => item.record_ids.includes("fact-old-rate")),
    "a superseded record naming no successor is a supersession gap",
  );
  ok(
    inCategory(items, "retired-phrase").some((item) => item.paths.includes("knowledge/specs/naming.md")),
    "a retired phrase surviving as current truth names the file it survived in",
  );
  ok(
    inCategory(items, "stale-view")[0].suggested_operation === "memory_rebuild_views",
    "a hand-edited generated view is repaired by rebuilding it, not by a lifecycle write",
  );
  ok(
    inCategory(items, "pin-error").some((item) => item.suggested_operation === "unpin"),
    "a pin whose approved summary no longer hashes is reported against the pin operations",
  );

  const order = items.map((item) => item.category);
  ok(
    order.indexOf("broken-link") > order.indexOf("duplicate-candidate"),
    "the worklist is ordered by category and severity rather than by the order the files were read",
  );

  // -------------------------------------------------------------------------
  // The scopes. Focused runs what a save can break, deep adds the rest.
  // -------------------------------------------------------------------------
  const deep = call(broken, "review", "--scope", "deep");
  const deepSeen = categories(deep.payload.result);
  ok(deep.code === 0, "a deep review exits 0");
  ok(!seen.includes("vocabulary") && !seen.includes("durable-information"),
    "a focused review leaves the whole-corpus categories to the deep review");
  ok(deepSeen.includes("vocabulary"), "the deep review covers the domain and topic vocabulary");
  ok(
    inCategory(deep.payload.result, "vocabulary").some((item) => item.what_is_wrong.includes("backups")
      && item.what_is_wrong.includes("spellings of one term")),
    "two spellings of one topic are reported as overlapping",
  );
  ok(deep.payload.result.length > items.length, "the deep worklist covers everything the focused one did and more");

  const durable = project("durable");
  write(
    durable,
    "knowledge/memory/facts/work-state.md",
    record("fact", "fact-work-state", "We are currently working through the migration backlog", {
      fields: ["domain: memory", "topics: [migration]"],
    }),
  );
  write(
    durable,
    "knowledge/memory/facts/chat-only.md",
    record("fact", "fact-chat-only", "The owner prefers the shorter report format", {
      fields: ["domain: memory", "topics: [reports]"],
    }).replace("source_type: owner_statement", "source_type: conversation"),
  );
  const durableRun = call(durable, "review", "--scope", "deep");
  const durableItems = inCategory(durableRun.payload.result, "durable-information");
  ok(
    durableItems.some((item) => item.record_ids.includes("fact-work-state") && item.suggested_operation === "retire"),
    "a record stating live work state is offered for retirement, with the owner deciding",
  );
  ok(
    durableItems.some((item) => item.record_ids.includes("fact-chat-only") && item.suggested_operation === "correct"),
    "a record resting only on a conversation is offered for correction rather than removal",
  );

  // --since narrows the record categories and leaves the project ones running.
  const narrowed = call(broken, "review", "--since", "2030-01-01");
  const narrowedSeen = categories(narrowed.payload.result);
  ok(narrowed.code === 0, "a review with a since date exits 0");
  ok(!narrowedSeen.includes("stale-review-date") && !narrowedSeen.includes("duplicate-candidate"),
    "--since leaves out records settled before the date");
  ok(narrowedSeen.includes("broken-link") && narrowedSeen.includes("pin-error"),
    "--since still covers the links, views, and pins a save can break in a record it never touched");

  // -------------------------------------------------------------------------
  // What review could not read is reported, never quietly dropped.
  // -------------------------------------------------------------------------
  const nested = project("subroot", { subroot: "knowledge/memory/facts/vendor" });
  write(
    nested,
    "knowledge/memory/facts/vendor/vendor-state.md",
    record("fact", "fact-vendor-state", "The vendor project keeps its own memory"),
  );
  const scoped = call(nested, "review");
  ok(scoped.code === 0, "a record belonging to a declared subroot does not fail the review");
  ok(
    inCategory(scoped.payload.result, "search-capability")
      .some((item) => item.paths.includes("knowledge/memory/facts/vendor/vendor-state.md")),
    "a record review had to drop as out of scope is reported instead of being silently skipped",
  );

  // -------------------------------------------------------------------------
  // Review writes nothing. Both halves of the proof.
  // -------------------------------------------------------------------------
  ok(!existsSync(resolve(broken, ".memory")), "the fixture holds no .memory/ folder before the review");
  const after = snapshot(broken);
  ok(after.size === before.size, "a review that found problems created no file anywhere in the project");
  ok(same(before, after), "every file holds exactly the bytes it held before the review");
  ok(!existsSync(resolve(broken, ".memory")), "review creates no .memory/ folder, lock, journal, or proposal");

  const beforeDeep = snapshot(broken);
  call(broken, "review", "--scope", "deep");
  ok(same(beforeDeep, snapshot(broken)), "a deep review changes nothing either");
  ok(!existsSync(resolve(broken, ".memory")), "a deep review creates no local state");

  // The P2-3 guard: the only other route to a flagged record is refused.
  const flagged = "knowledge/memory/facts/review-due.md";
  const handEdit = guard(broken, {
    tool_name: "Edit",
    tool_input: {
      file_path: flagged,
      old_string: "review_after: 2020-01-01",
      new_string: "review_after: 2030-01-01",
    },
  });
  ok(handEdit.code === 0, "the guard exits 0 when it refuses a repair by hand");
  ok(handEdit.denied, "editing a record review flagged is refused outside the approved write path");
  ok(handEdit.reason.includes("write/guard-refused"), "the refusal carries the write/guard-refused code");
  ok(read(broken, flagged).includes("review_after: 2020-01-01"), "the flagged record is unchanged after the refusal");
  ok(same(before, snapshot(broken)), "the whole project is unchanged after the review and the refused repair");

  console.log(`\n${passed} checks passed.`);
} finally {
  for (const path of fixtures) rmSync(path, { recursive: true, force: true });
}

#!/usr/bin/env node

/**
 * Harness for the full validator.
 *
 * It builds temporary projects, runs the real command line, and asserts what
 * contracts section 4 promises for every check the build runs: MV-01 through
 * MV-22, with MV-18 reported as skipped until the migration engine lands in
 * P4-1 and builds what that check inspects.
 *
 * Two rules the fixtures below hold to:
 *
 *   - Every check that can fail gets a project that really fails it, so no
 *     check is proved by a green run alone.
 *   - Every check that cannot run in a given project reports skipped with a
 *     reason. A check that cannot run is never a pass.
 *
 * The run also proves the validator writes nothing: a project is compared byte
 * for byte before and after a full validate, including with --fixtures, which
 * builds its fixtures under the temporary folder and removes them again.
 *
 * Run: node plugins/second-brain/tests/validate-harness.mjs
 */

import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
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
  const path = mkdtempSync(join(realpathSync(tmpdir()), `memory-validate-${name}-`));
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
  return { code: run.status, stdout: run.stdout, payload };
}

function entry(payload, id) {
  return payload.result.find((check) => check.id === id);
}

function statusOf(payload, id) {
  return entry(payload, id).status;
}

function messages(payload, id) {
  return entry(payload, id).findings.map((finding) => finding.message).join(" | ");
}

/** Every file in the project, so a validate run can be shown to change none. */
function snapshot(base) {
  const contents = new Map();
  const walk = (directory) => {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, item.name);
      if (item.isSymbolicLink()) {
        contents.set(relative(base, path), "symlink");
        continue;
      }
      if (item.isDirectory()) walk(path);
      else contents.set(relative(base, path), readFileSync(path, "utf8"));
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

const CURRENT = [
  "---",
  "updated: 2026-08-20",
  "---",
  "",
  "# Current state",
  "",
  "## Current focus",
  "",
  "Proving the validator.",
  "",
  "## Blockers",
  "",
  "None.",
  "",
  "## Next step",
  "",
  "Run the validate harness.",
  "",
  "## Handoff",
  "",
  "Every check runs or says why it did not.",
  "",
].join("\n");

const SHARED_BLOCK = [
  "<!-- shared-with-agents-md:start -->",
  "Run the boot brief first.",
  "",
  "Memory operations run through memory.mjs. Ask capabilities first.",
  "",
  "The four skills are remember, recall, cleanup, and session-search.",
  "",
  "knowledge/memory/, knowledge/specs/, and knowledge/current.md change only",
  "through the write operations, and only with the owner's approval.",
  "<!-- shared-with-agents-md:end -->",
].join("\n");

const CODEX_ROUTE = [
  "<!-- second-brain:startup-route:start -->",
  "Run this first: node plugins/second-brain/tools/boot-brief.mjs",
  "",
  "Memory operations run through node plugins/second-brain/tools/memory.mjs.",
  "Run capabilities to see what this project supports. Never guess.",
  "",
  "The four skills are remember, recall, cleanup, and session-search.",
  "",
  "Never write into knowledge/memory/, knowledge/specs/, or knowledge/current.md",
  "by hand. Those paths change only through the write operations, and only with",
  "the owner's approval.",
  "<!-- second-brain:startup-route:end -->",
].join("\n");

function agentsFile(route = CODEX_ROUTE, block = SHARED_BLOCK) {
  return ["# Agents", "", block, "", route, ""].join("\n");
}

function claudeFile(block = SHARED_BLOCK) {
  return ["# Claude", "", block, ""].join("\n");
}

/** A record with whatever front matter and body a fixture needs. */
function record(type, id, summary, { fields = [], body = [], sections = [], evidence = null } = {}) {
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
    ...(evidence ?? ["  - source_type: owner_statement", "    locator: knowledge/specs/validator-policy.md"]),
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
  "id: spec-validator-policy",
  "status: active",
  "---",
  "",
  "# Validator policy",
  "",
  "The validator reads canonical Markdown and writes nothing at all.",
  "",
  "A check that cannot run reports skipped with its reason.",
  "",
].join("\n");

const MAP = [
  "# Project map",
  "",
  "## Required core",
  "",
  "| Role | Path | Owner | Authority | How it is searched |",
  "| --- | --- | --- | --- | --- |",
  "| Project identity and settings | `knowledge/project.md` | Owner | Authoritative | Read at startup |",
  "| Approved behavior | `knowledge/specs/` | Owner | Authoritative | spec-search |",
  "",
].join("\n");

/** A project shaped like the required core, with everything a check reads. */
function project(name, options = {}) {
  const base = fixture(name);
  cpSync(templates, resolve(base, "knowledge"), { recursive: true });
  let settings = read(base, "knowledge/project.md")
    .replace("replace-with-a-stable-project-id", `fixture-${name}`);
  if (options.settings) settings = options.settings(settings);
  write(base, "knowledge/project.md", settings);
  write(base, "knowledge/map.md", options.map ?? MAP);
  write(base, "knowledge/current.md", CURRENT);
  write(base, "knowledge/specs/validator-policy.md", SPEC);
  write(base, "AGENTS.md", options.agents ?? agentsFile());
  write(base, "CLAUDE.md", options.claude ?? claudeFile());

  if (options.records !== false) {
    write(
      base,
      "knowledge/memory/facts/reads-write-nothing.md",
      record("fact", "fact-reads-write-nothing", "The validator writes nothing", {
        fields: ["domain: validation", "topics: [checks, reads]"],
        body: ["A validate run leaves the project exactly as it found it."],
      }),
    );
    write(
      base,
      "knowledge/memory/facts/skipped-is-not-a-pass.md",
      record("fact", "fact-skipped-is-not-a-pass", "A skipped check is not a pass", {
        fields: ["domain: validation", "topics: [checks, reads]"],
        body: ["A check that cannot run names the reason it did not."],
      }),
    );
  }
  for (const [path, content] of Object.entries(options.files ?? {})) write(base, path, content);
  return base;
}

function goldSet(entries, { bar = 1, depth = 5 } = {}) {
  const lines = [
    "# Retrieval gold set",
    "",
    `- Bar: ${bar} of ${entries.length}`,
    `- Depth: ${depth}`,
    "",
  ];
  for (const [question, expected] of entries) {
    lines.push(`### ${question}`, "", "- ask: search", `- expect: \`${expected}\``, "");
  }
  return lines.join("\n");
}

try {
  // -------------------------------------------------------------------------
  // A healthy project: every check runs, or says why it did not.
  // -------------------------------------------------------------------------
  const healthy = project("healthy");
  const before = snapshot(healthy);
  const clean = call(healthy, "validate");
  ok(clean.code === 0, "a healthy project exits 0");
  ok(clean.payload.result.length === 22, "the catalog still carries twenty-two checks");
  ok(
    clean.payload.result.every((check) => check.status !== "fail"),
    "no check fails on a healthy project",
  );
  ok(
    clean.payload.result.every((check) => check.status !== "skipped" || (check.skipped_because ?? "").length > 0),
    "every skipped check names why it did not run",
  );
  ok(
    clean.payload.result.every((check) => check.skipped_because === null || typeof check.skipped_because === "string"),
    "a check that ran only in part still names the half it could not read",
  );
  ok(statusOf(clean.payload, "MV-18") === "skipped", "a project with no applied migration skips MV-18");
  ok(
    entry(clean.payload, "MV-18").skipped_because.includes("last-migration.json"),
    "MV-18 names the receipt it would have inspected",
  );
  ok(
    clean.payload.result.filter((check) => check.status === "skipped").length
      < clean.payload.result.length / 2,
    "most of the catalog now runs rather than reporting skipped",
  );
  ok(same(before, snapshot(healthy)), "a full validate run changes no byte of the project");
  ok(call(healthy, "validate").stdout === clean.stdout, "two validate runs produce the same bytes");

  // MV-01, both halves.
  ok(statusOf(clean.payload, "MV-01") === "pass", "a complete core and a complete Codex route pass MV-01");
  ok(entry(clean.payload, "MV-01").skipped_because === null, "MV-01 reports no skipped half once a route is installed");

  const noRoute = project("no-route", { agents: "# Agents\n\nNo route here.\n", claude: "# Claude\n\nNo block.\n" });
  const noRouteRun = call(noRoute, "validate", "--check", "MV-01");
  ok(statusOf(noRouteRun.payload, "MV-01") === "pass", "a project with no host route still passes on its files");
  ok(
    entry(noRouteRun.payload, "MV-01").skipped_because.includes("route half"),
    "a project with no host route reports the route half as not inspected",
  );

  const thinRoute = project("thin-route", {
    agents: agentsFile([
      "<!-- second-brain:startup-route:start -->",
      "Read the project files before working.",
      "<!-- second-brain:startup-route:end -->",
    ].join("\n")),
  });
  const thinRun = call(thinRoute, "validate", "--check", "MV-01");
  ok(thinRun.code === 1, "an incomplete host route fails the run");
  ok(statusOf(thinRun.payload, "MV-01") === "fail", "a route that names neither the tool nor the skills fails MV-01");
  for (const skill of ["remember", "recall", "cleanup", "session-search"]) {
    ok(messages(thinRun.payload, "MV-01").includes(skill), `MV-01 names the missing ${skill} skill`);
  }
  ok(messages(thinRun.payload, "MV-01").includes("memory tool path"), "MV-01 names the missing tool route");

  const missingCore = project("missing-core");
  rmSync(resolve(missingCore, "knowledge/map.md"));
  const coreRun = call(missingCore, "validate", "--check", "MV-01");
  ok(statusOf(coreRun.payload, "MV-01") === "fail", "a missing required file still fails MV-01");

  // MV-02, shared root-block drift.
  ok(statusOf(clean.payload, "MV-02") === "pass", "two identical shared blocks pass MV-02");
  const drifted = project("drift", {
    claude: claudeFile(SHARED_BLOCK.replace("Ask capabilities first.", "Guess what the project supports.")),
  });
  const driftRun = call(drifted, "validate", "--check", "MV-02");
  ok(driftRun.code === 1, "a drifted shared block fails the run");
  ok(messages(driftRun.payload, "MV-02").includes("different meaning"), "MV-02 says the two hosts carry different meaning");

  const oneSided = project("one-sided", { claude: "# Claude\n\nNo block at all.\n" });
  ok(
    statusOf(call(oneSided, "validate", "--check", "MV-02").payload, "MV-02") === "fail",
    "a block in one root file and not the other fails MV-02",
  );
  const neither = project("neither", {
    claude: "# Claude\n\nNothing.\n",
    agents: "# Agents\n\nNothing.\n",
  });
  ok(
    statusOf(call(neither, "validate", "--check", "MV-02").payload, "MV-02") === "skipped",
    "a project with no marked block reports MV-02 skipped rather than passed",
  );

  // MV-07, startup budget and safe degradation.
  ok(statusOf(clean.payload, "MV-07") === "pass", "a brief inside its budget passes MV-07");
  const tight = project("tight-budget", {
    settings: (text) => text.replace("profiles: []", "startup:\n  budget_bytes: 400\nprofiles: []"),
  });
  const tightRun = call(tight, "validate", "--check", "MV-07");
  ok(tightRun.code === 0, "an over-budget brief is a warning, not a refusal");
  ok(statusOf(tightRun.payload, "MV-07") === "warn", "MV-07 warns rather than failing when the required set runs long");
  ok(/\d+ bytes/.test(messages(tightRun.payload, "MV-07")), "MV-07 reports the exact byte count");

  // MV-09, generated artifacts.
  ok(statusOf(clean.payload, "MV-09") === "skipped", "a project with no artifact reports MV-09 skipped");
  const staleView = project("stale-view", {
    files: {
      "knowledge/views/facts.md": [
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
        "Hand edited.",
        "",
      ].join("\n"),
    },
  });
  const viewRun = call(staleView, "validate", "--check", "MV-09");
  ok(viewRun.code === 0, "a stale artifact warns rather than refusing");
  ok(statusOf(viewRun.payload, "MV-09") === "warn", "an artifact that does not match its inputs warns on MV-09");

  // MV-10, map coverage.
  ok(statusOf(clean.payload, "MV-10") === "pass", "a map that covers the tree passes MV-10");
  const badMap = project("bad-map", {
    map: MAP.replace("`knowledge/specs/`", "`knowledge/gone/`"),
    files: { "delivery/report.md": "# Report\n\nNot mapped.\n" },
  });
  const mapRun = call(badMap, "validate", "--check", "MV-10");
  ok(mapRun.code === 0, "map coverage warns rather than refusing");
  ok(statusOf(mapRun.payload, "MV-10") === "warn", "a missing mapped path and an unmapped folder warn on MV-10");
  ok(messages(mapRun.payload, "MV-10").includes("not there"), "MV-10 names the mapped path that is gone");
  ok(messages(mapRun.payload, "MV-10").includes("delivery/"), "MV-10 names the folder the map never mentions");

  // MV-11, vocabulary.
  ok(statusOf(clean.payload, "MV-11") === "pass", "values used by more than one record pass MV-11");
  const vocabulary = project("vocabulary", {
    files: {
      "knowledge/memory/facts/lonely.md": record("fact", "fact-lonely", "One record uses this topic", {
        fields: ["domain: validation", "topics: [only-here]"],
      }),
    },
  });
  const vocabularyRun = call(vocabulary, "validate", "--check", "MV-11");
  ok(statusOf(vocabularyRun.payload, "MV-11") === "warn", "a topic used once warns on MV-11");
  ok(vocabularyRun.code === 0, "a vocabulary warning does not refuse the run");
  ok(
    statusOf(call(project("no-records", { records: false }), "validate", "--check", "MV-11").payload, "MV-11") === "skipped",
    "a project with no records reports MV-11 skipped",
  );

  // MV-12, the search result contract.
  ok(statusOf(clean.payload, "MV-12") === "pass", "a sample search returns complete records for MV-12");
  ok(
    statusOf(call(project("no-records-search", { records: false }), "validate", "--check", "MV-12").payload, "MV-12")
      === "skipped",
    "a project with no active record reports MV-12 skipped rather than passed",
  );

  // MV-13, the tracker bridge.
  ok(statusOf(clean.payload, "MV-13") === "pass", "records with a durable source pass MV-13");
  const bridged = project("tracker-bridge", {
    files: {
      "knowledge/memory/facts/only-the-board.md": record("fact", "fact-only-the-board", "This lives on the board alone", {
        fields: ["domain: validation", "topics: [checks]"],
        evidence: ["  - source_type: tracker_item", "    locator: https://example.invalid/board/12"],
      }),
    },
  });
  const bridgeRun = call(bridged, "validate", "--check", "MV-13");
  ok(bridgeRun.code === 1, "a fact that lives only in the tracker fails the run");
  ok(statusOf(bridgeRun.payload, "MV-13") === "fail", "a tracker-only record fails MV-13");
  ok(messages(bridgeRun.payload, "MV-13").includes("tracker bridge"), "MV-13 says where the meaning is stranded");

  // MV-14, the derived-state rebuild.
  ok(statusOf(clean.payload, "MV-14") === "pass", "a project whose local state holds only known kinds passes MV-14");
  ok(
    entry(clean.payload, "MV-14").skipped_because.includes("gold-set"),
    "MV-14 names where the destructive delete-and-rebuild proof runs",
  );
  const strayState = project("stray-state", { files: { ".memory/notes.json": "{}\n" } });
  const strayRun = call(strayState, "validate", "--check", "MV-14");
  ok(statusOf(strayRun.payload, "MV-14") === "fail", "an unknown file under .memory/ fails MV-14");

  // MV-15, no local state from a read.
  ok(statusOf(clean.payload, "MV-15") === "pass", "a read run leaves nothing behind, which passes MV-15");
  const readOnly = project("read-only");
  const beforeReads = snapshot(readOnly);
  call(readOnly, "search", "--query", "validator");
  call(readOnly, "validate", "--check", "MV-15");
  ok(same(beforeReads, snapshot(readOnly)), "reads and a validate run together create no local state");

  // MV-16, physical project-root isolation.
  ok(statusOf(clean.payload, "MV-16") === "pass", "a single-scope project passes MV-16");
  ok(
    entry(clean.payload, "MV-16").skipped_because.includes("--fixtures"),
    "MV-16 says step ten runs only with the shipped fixtures",
  );
  const withFixtures = call(healthy, "validate", "--check", "MV-16,MV-17", "--fixtures");
  ok(withFixtures.code === 0, "the shipped fixtures pass");
  ok(entry(withFixtures.payload, "MV-16").skipped_because === null, "with --fixtures MV-16 inspects every step");
  ok(same(before, snapshot(healthy)), "running the shipped fixtures changes no byte of the project");

  const nested = project("nested", {
    files: {
      "apps/inner/knowledge/project.md": [
        "---",
        "schema_version: 2",
        "project_id: fixture-inner",
        "project_root: .",
        "subroots: []",
        "privacy:",
        "  level: standard",
        "  external_transfer: denied",
        "  third_party_personal: refused",
        "profiles: []",
        "---",
        "",
        "# Inner project",
        "",
      ].join("\n"),
    },
  });
  const nestedRun = call(nested, "validate", "--check", "MV-16");
  ok(nestedRun.code === 1, "an undeclared nested project fails the run");
  ok(
    messages(nestedRun.payload, "MV-16").includes("declared subroot"),
    "MV-16 names the undeclared nested scope",
  );

  const escaping = project("escape");
  // The target has to sit outside the scope root, so it is named after this
  // fixture folder and removed with it below.
  const outside = `${escaping}-outside.md`;
  writeFileSync(outside, "# Outside\n\nNot this project's.\n", "utf8");
  fixtures.push(outside);
  symlinkSync(outside, resolve(escaping, "knowledge/specs/linked.md"));
  const escapeRun = call(escaping, "validate", "--check", "MV-16");
  ok(statusOf(escapeRun.payload, "MV-16") === "fail", "a link out of the scope fails MV-16");
  ok(messages(escapeRun.payload, "MV-16").includes("resolves outside"), "MV-16 names the escape");

  // MV-17, the privacy boundary.
  ok(statusOf(clean.payload, "MV-17") === "pass", "a standard project with no secret passes MV-17");
  ok(
    entry(clean.payload, "MV-17").skipped_because.includes("step six"),
    "MV-17 names the step it cannot read from files",
  );

  const secret = project("secret", {
    files: {
      "knowledge/specs/deploy.md": [
        "---",
        "id: spec-deploy",
        "status: active",
        "---",
        "",
        "# Deploy",
        "",
        "Set AWS_SECRET_ACCESS_KEY = wJalrXUtnFEMIK7MDENGbPxRfiCYEXAMPLEKEY in the shell.",
        "",
      ].join("\n"),
    },
  });
  const secretRun = call(secret, "validate", "--check", "MV-17");
  ok(secretRun.code === 1, "a secret in canonical knowledge fails the run");
  ok(statusOf(secretRun.payload, "MV-17") === "fail", "an environment-style assignment fails MV-17");
  ok(
    messages(secretRun.payload, "MV-17").includes("environment-assignment"),
    "MV-17 names the pattern that matched",
  );
  ok(
    !secretRun.stdout.includes("wJalrXUtnFEMIK7MDENGbPxRfiCYEXAMPLEKEY"),
    "the finding never carries the matched text",
  );

  const exempted = project("secret-exempt", {
    files: {
      "knowledge/specs/deploy.md": read(secret, "knowledge/specs/deploy.md"),
      "knowledge/memory/decisions/exemption.md": record(
        "decision",
        "decision-secret-exemption",
        "The deploy example is a documented false positive",
        {
          fields: ["domain: validation", "topics: [checks]"],
          body: [
            "The exemption covers knowledge/specs/deploy.md for the environment-assignment pattern.",
          ],
          sections: [
            "## Context",
            "",
            "The published example key matches the pattern set.",
            "",
            "## Decision",
            "",
            "Record an exemption for that file and that pattern.",
            "",
            "## Reason",
            "",
            "Pattern matching is not judgment.",
            "",
            "## Rejected options",
            "",
            "Rewriting the published example.",
            "",
            "## Consequences",
            "",
            "The exemption stays visible in the record.",
            "",
          ],
        },
      ),
    },
  });
  ok(
    statusOf(call(exempted, "validate", "--check", "MV-17").payload, "MV-17") === "pass",
    "a reviewed record naming the file and the pattern clears the match",
  );

  const needless = project("sensitive", {
    settings: (text) => text.replace("level: standard", "level: sensitive"),
    files: {
      "knowledge/memory/facts/reading.md": record("fact", "fact-reading", "The owner takes one daily reading", {
        fields: ["domain: validation", "topics: [checks]"],
        sections: ["## Sensitive content", "", "Category: health", ""],
      }),
    },
  });
  const needlessRun = call(needless, "validate", "--check", "MV-17");
  ok(statusOf(needlessRun.payload, "MV-17") === "fail", "a sensitive record with no stated need fails MV-17");
  ok(
    messages(needlessRun.payload, "MV-17").includes("needed-reason"),
    "MV-17 says which part of the stated need is missing",
  );

  const consentless = project("consent", {
    settings: (text) => text.replace("external_transfer: denied", "external_transfer: approved"),
  });
  const consentRun = call(consentless, "validate", "--check", "MV-17");
  ok(statusOf(consentRun.payload, "MV-17") === "fail", "approved transfer with no consent record fails MV-17");
  ok(
    messages(consentRun.payload, "MV-17").includes("consent"),
    "MV-17 names the consent record that does not resolve",
  );

  // MV-19, the retrieval gold set.
  ok(statusOf(clean.payload, "MV-19") === "warn", "a project with no gold set warns on MV-19");
  ok(clean.code === 0, "a missing gold set does not refuse the run");

  const measured = project("gold-set", {
    files: {
      "knowledge/retrieval-gold-set.md": goldSet(
        [["Where does the validator write?", "knowledge/memory/facts/reads-write-nothing.md"]],
        { bar: 1 },
      ),
    },
  });
  const measuredRun = call(measured, "validate", "--check", "MV-19");
  ok(measuredRun.code === 0, "a gold set that meets its bar exits 0");
  ok(statusOf(measuredRun.payload, "MV-19") === "pass", "a gold set that meets its bar passes MV-19");

  const missed = project("gold-set-missed", {
    files: {
      "knowledge/retrieval-gold-set.md": goldSet(
        [
          ["Where does the validator write?", "knowledge/memory/facts/reads-write-nothing.md"],
          ["Zaphod Beeblebrox flargle", "knowledge/memory/facts/skipped-is-not-a-pass.md"],
        ],
        { bar: 2 },
      ),
    },
  });
  const missedRun = call(missed, "validate", "--check", "MV-19");
  ok(missedRun.code === 1, "a gold set that misses its bar refuses the run");
  ok(statusOf(missedRun.payload, "MV-19") === "fail", "a missed bar fails MV-19");

  // MV-20, quoted-source consistency.
  ok(statusOf(clean.payload, "MV-20") === "skipped", "a project that quotes nothing reports MV-20 skipped");
  const quoted = project("quoted", {
    files: {
      "knowledge/memory/facts/quotes-well.md": record("fact", "fact-quotes-well", "The policy names what a check does", {
        fields: ["domain: validation", "topics: [checks]"],
        body: ['The policy says "The validator reads canonical Markdown and writes nothing at all."'],
      }),
    },
  });
  ok(
    statusOf(call(quoted, "validate", "--check", "MV-20").payload, "MV-20") === "pass",
    "a quoted span that appears in the cited source passes MV-20",
  );

  const misquoted = project("misquoted", {
    files: {
      "knowledge/memory/facts/quotes-badly.md": record("fact", "fact-quotes-badly", "The policy is quoted wrongly", {
        fields: ["domain: validation", "topics: [checks]"],
        body: ['The policy says "the validator rewrites canonical Markdown whenever it likes."'],
      }),
    },
  });
  const misquotedRun = call(misquoted, "validate", "--check", "MV-20");
  ok(misquotedRun.code === 1, "a quoted span that is not in its source refuses the run");
  ok(statusOf(misquotedRun.payload, "MV-20") === "fail", "a span that does not appear in the cited source fails MV-20");

  // -------------------------------------------------------------------------
  // One project where every live check has something to inspect. The healthy
  // fixture above skips a few checks honestly, because it has no artifact, no
  // quotation, and no move. This one has all three, so the run proves the
  // twenty-one live checks really run rather than reporting skipped.
  // -------------------------------------------------------------------------
  const everything = project("everything", {
    files: {
      "knowledge/retrieval-gold-set.md": goldSet(
        [["Where does the validator write?", "knowledge/memory/facts/reads-write-nothing.md"]],
        { bar: 1 },
      ),
      "knowledge/views/facts.md": [
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
        "Rebuilt below before the run.",
        "",
      ].join("\n"),
      "knowledge/memory/facts/quotes-the-policy.md": record(
        "fact",
        "fact-quotes-the-policy",
        "The policy states what a check that cannot run reports",
        {
          fields: ["domain: validation", "topics: [checks, reads]"],
          body: ['The policy says "A check that cannot run reports skipped with its reason."'],
        },
      ),
    },
  });
  // The view has to match what its inputs produce, so the real rebuild runs
  // once before the check reads it.
  ok(call(everything, "rebuild-views").code === 0, "the declared view rebuilds before the run");
  // A move receipt is local state a finished move leaves behind. The move
  // itself is proved in the links harness; what this fixture needs is
  // something for MV-22 to inspect.
  write(
    everything,
    ".memory/last-move.json",
    `${JSON.stringify({
      schema: "memory-move/1",
      record_id: "fact-reads-write-nothing",
      old_path: "knowledge/memory/facts/moved-from.md",
      new_path: "knowledge/memory/facts/reads-write-nothing.md",
      status: "applied",
      repaired: [],
    }, null, 2)}\n`,
  );

  const complete = call(everything, "validate", "--fixtures");
  const live = complete.payload.result.filter((check) => check.status !== "skipped");
  ok(complete.code === 0, "the project where every live check runs exits 0");
  ok(live.length === 21, "all twenty-one live checks run when the project gives each one something to inspect");
  ok(
    complete.payload.result.filter((check) => check.status === "skipped")
      .map((check) => check.id).join(",") === "MV-18",
    "MV-18 is the only check left reporting skipped, because this project was never migrated",
  );
  ok(
    live.every((check) => check.status === "pass" || check.status === "warn"),
    "every live check comes back green on a well-formed project",
  );

  // The filter still works over the wider catalog.
  const filtered = call(healthy, "validate", "--check", "MV-13,MV-20");
  ok(filtered.payload.result.length === 2, "--check limits the run to the named checks");
  ok(
    filtered.payload.result.map((check) => check.id).join(",") === "MV-13,MV-20",
    "the filtered run keeps the catalog order",
  );

  console.log(`\nALL PASS (${passed} checks), FAIL: 0`);
} catch (error) {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
} finally {
  for (const path of fixtures) rmSync(path, { recursive: true, force: true });
}

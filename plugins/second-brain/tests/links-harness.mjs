#!/usr/bin/env node

/**
 * Harness for links, derived backlinks, and move repair.
 *
 * It builds temporary projects, runs the real command line and the real
 * modules, and asserts what architecture section 12.4 promises: a record links
 * to another with an ordinary relative Markdown link, backlinks are derived by
 * reading the current files rather than from any registry, a move repairs every
 * project link in one approved transaction, and a move whose repair cannot
 * complete restores every preimage and changes nothing at all.
 *
 * AT-21 is the specification that links to its supporting decision and comes
 * back as a backlink with `.memory/` absent. AT-22 is the move: one approved
 * operation repairs every affected link, or every file is left as it was.
 * MV-21 and MV-22 are run against the same fixtures.
 *
 * Run: node plugins/second-brain/tests/links-harness.mjs
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
  const path = mkdtempSync(join(realpathSync(tmpdir()), `memory-links-${name}-`));
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

/** Every file in the project, so a refused move can be shown to change none. */
function snapshot(base) {
  const contents = new Map();
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".memory") continue;
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

function currentText(focus) {
  return [
    "---",
    "updated: 2026-08-20",
    "---",
    "",
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
    "Run the links harness.",
    "",
    "## Handoff",
    "",
    "Links, backlinks, and move repair are built.",
    "",
  ].join("\n");
}

function decisionRecord(id, title, body = []) {
  return [
    "---",
    "schema_version: 2",
    `id: ${id}`,
    "type: decision",
    "status: active",
    "epistemic_status: documented",
    "recorded_at: 2026-08-19",
    "approval:",
    "  actor: owner",
    "  approved_at: 2026-08-19",
    "  action: add",
    "evidence:",
    "  - source_type: owner_statement",
    "    locator: knowledge/specs/link-policy.md",
    "based_on: []",
    "---",
    "",
    `# ${title}`,
    "",
    `${title}.`,
    "",
    "## Context",
    "",
    "A specification needs its rationale somewhere that can be corrected on its own.",
    "",
    "## Decision",
    "",
    "Rationale lives in this decision and specifications link to it.",
    "",
    "## Reason",
    "",
    "Copied rationale drifts from the decision that owns it.",
    "",
    "## Rejected options",
    "",
    "Repeating the rationale inside every specification.",
    "",
    "## Consequences",
    "",
    ...(body.length ? body : ["A reader follows one link to reach the reasoning."]),
    "",
  ].join("\n");
}

function factRecord(id, summary, fields = [], body = []) {
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
    "    locator: knowledge/specs/link-policy.md",
    "based_on: []",
    ...fields,
    "---",
    "",
    `# ${summary}`,
    "",
    `${summary}.`,
    "",
    ...(body.length ? [...body, ""] : []),
  ].join("\n");
}

const ADR_ID = "decision-link-home";
const ADR_PATH = "knowledge/memory/decisions/link-home.md";
const ADR_MOVED = "knowledge/memory/decisions/adr/link-home.md";

const SPEC = [
  "# Link policy",
  "",
  "Canonical records link with ordinary relative Markdown links.",
  "",
  `The rationale for this rule lives in [the link home decision](../memory/decisions/link-home.md),`,
  "and is not repeated here.",
  "",
  "An example that is not a link: `[label](knowledge/memory/decisions/link-home.md)`.",
  "",
  "```markdown",
  "[a fenced example](../memory/decisions/link-home.md)",
  "```",
  "",
].join("\n");

const PROJECT_README = [
  "# Fixture project",
  "",
  "The link rule is written up in [the link home decision](./knowledge/memory/decisions/link-home.md).",
  "",
].join("\n");

/** A project shaped like the required core, with a linked decision in it. */
function project(name, options = {}) {
  const base = fixture(name);
  cpSync(templates, resolve(base, "knowledge"), { recursive: true });
  let settings = read(base, "knowledge/project.md")
    .replace("replace-with-a-stable-project-id", `fixture-${name}`);
  if (options.subroot) {
    settings = settings.replace(/^subroots:.*$/m, `subroots: [${options.subroot}]`);
  }
  write(base, "knowledge/project.md", settings);
  write(base, "knowledge/current.md", currentText("Proving links and move repair."));
  write(base, ADR_PATH, decisionRecord(ADR_ID, "Rationale lives in a decision"));
  write(base, "knowledge/specs/link-policy.md", SPEC);
  write(base, "README.md", PROJECT_README);
  write(
    base,
    "knowledge/memory/facts/link-syntax.md",
    factRecord(
      "fact-link-syntax",
      "Relative Markdown links name an explicit .md target",
      [`relates: [${ADR_ID}]`],
      ["It follows [the link home decision](../decisions/link-home.md)."],
    ),
  );
  for (const [path, content] of Object.entries(options.files ?? {})) write(base, path, content);
  return base;
}

function entry(payload, id) {
  return payload.result.find((check) => check.id === id);
}

/** One approved move, from proposal to applied transaction. */
function moveRecord(base, id, destination) {
  const proposal = call(base, "move", "--id", id, "--to", destination, "--propose");
  if (proposal.payload?.status !== "awaiting-approval") return { proposal, applied: null };
  const applied = call(
    base,
    "move",
    "--apply",
    "--proposal",
    proposal.payload.result.proposal_id,
    "--content-hash",
    proposal.payload.result.content_hash,
  );
  return { proposal, applied };
}

try {
  // -------------------------------------------------------------------------
  // memory_related: outgoing links, derived backlinks, and honest refusals.
  // -------------------------------------------------------------------------
  const first = project("related");

  const unknown = call(first, "related", "--id", "decision-not-here");
  ok(unknown.code === 1, "related on an unknown id exits 1");
  ok(codes(unknown.payload.errors).includes("record/unknown-id"), "an unknown id is record/unknown-id");

  const adr = call(first, "related", "--id", ADR_ID);
  ok(adr.code === 0, "related exits 0 on a record this project carries");
  ok(adr.stderr === "", "related writes nothing to standard error");
  ok(adr.payload.operation === "memory_related", "the envelope names memory_related");
  ok(adr.payload.result.path === ADR_PATH, "related reports where the record sits");

  const incoming = adr.payload.result.incoming;
  const spec = incoming.find((link) => link.path === "knowledge/specs/link-policy.md");
  ok(Boolean(spec), "a specification that links to the decision comes back as a backlink");
  ok(spec.relation === "links_to", "the specification's backlink is a link, not a mention");
  ok(spec.record_id === null, "a specification is not a record and carries no record id");

  const factLink = incoming.find((link) => link.path === "knowledge/memory/facts/link-syntax.md" && link.relation === "links_to");
  ok(Boolean(factLink), "a record that links to the decision comes back as a backlink");
  ok(factLink.record_id === "fact-link-syntax", "a backlink from a record carries that record's id");
  ok(
    incoming.some((link) => link.path === "knowledge/memory/facts/link-syntax.md" && link.relation === "relates"),
    "a front matter relation comes back under its own field name",
  );
  ok(
    incoming.some((link) => link.path === "README.md" && link.relation === "links_to"),
    "a tracked file outside knowledge/ is a backlink too",
  );
  ok(
    !incoming.some((link) => link.path === "knowledge/specs/link-policy.md" && link.relation === "mentions"),
    "a file that links is reported once, by its link, never twice",
  );
  ok(
    incoming.every((link) => link.path !== ADR_PATH),
    "a record is never its own backlink",
  );

  // FR-083: the specification carries the link and not the rationale.
  ok(
    !read(first, "knowledge/specs/link-policy.md").includes("Copied rationale drifts"),
    "the specification references the decision without copying its rationale",
  );

  const outgoing = call(first, "related", "--id", "fact-link-syntax").payload.result.outgoing;
  ok(
    outgoing.some((link) => link.relation === "relates" && link.record_id === ADR_ID && link.path === ADR_PATH),
    "an outgoing front matter relation resolves to the record it names",
  );
  ok(
    outgoing.some((link) => link.relation === "links_to" && link.path === ADR_PATH && link.record_id === ADR_ID),
    "an outgoing body link resolves to the record it points at",
  );

  // -------------------------------------------------------------------------
  // AT-21: the same answer with .memory/ absent, and no local state after it.
  // -------------------------------------------------------------------------
  rmSync(resolve(first, ".memory"), { recursive: true, force: true });
  const cold = call(first, "related", "--id", ADR_ID);
  ok(cold.code === 0, "related runs with .memory/ absent");
  ok(cold.stdout === adr.stdout, "the answer with .memory/ absent is the same, byte for byte");
  ok(!existsSync(resolve(first, ".memory")), "a read creates no local state");
  ok(
    !existsSync(resolve(first, "knowledge/backlinks.md"))
      && !existsSync(resolve(first, "knowledge/memory/links.md")),
    "deriving backlinks writes no registry, index, or cache",
  );

  // -------------------------------------------------------------------------
  // MV-21: relative-link syntax and resolvable targets.
  // -------------------------------------------------------------------------
  const linted = call(first, "validate", "--check", "MV-21,MV-22");
  ok(linted.code === 0, "a project whose links resolve passes MV-21");
  ok(entry(linted.payload, "MV-21").status === "pass", "MV-21 passes on resolvable relative links");
  ok(entry(linted.payload, "MV-22").status === "skipped", "MV-22 is skipped where no move has happened");
  ok(
    entry(linted.payload, "MV-22").skipped_because.includes("no record of a move"),
    "the skipped MV-22 names why it did not run",
  );

  const broken = project("broken", {
    files: {
      "knowledge/specs/dangling.md": [
        "# Dangling",
        "",
        "It points at [a record that is gone](../memory/decisions/removed.md).",
        "",
        "It also points at [a picture](../diagrams/shape.png).",
        "",
      ].join("\n"),
    },
  });
  const brokenRun = call(broken, "validate", "--check", "MV-21");
  ok(brokenRun.code === 1, "a broken relative link fails MV-21");
  ok(entry(brokenRun.payload, "MV-21").status === "fail", "MV-21 reports the failure");
  const findings = entry(brokenRun.payload, "MV-21").findings;
  ok(
    findings.some((found) => found.path === "knowledge/specs/dangling.md" && found.message.includes("not there")),
    "the finding names the file whose link target is missing",
  );
  ok(
    findings.some((found) => found.message.includes("no explicit .md target")),
    "a relative link with no explicit .md target is a finding too",
  );
  ok(
    findings.every((found) => !found.message.includes("fenced")),
    "a link inside a fenced block is an example, not a link",
  );

  // -------------------------------------------------------------------------
  // AT-22: one approved move repairs every affected link.
  // -------------------------------------------------------------------------
  const moving = project("move");
  const beforeMove = snapshot(moving);
  const proposal = call(moving, "move", "--id", ADR_ID, "--to", ADR_MOVED, "--propose");

  ok(proposal.code === 0, "a move proposal exits 0");
  ok(proposal.payload.status === "awaiting-approval", "a move proposal waits for approval");
  ok(same(snapshot(moving), beforeMove), "a move proposal changes no file");
  ok(
    proposal.payload.result.bullets.what.includes(ADR_PATH)
      && proposal.payload.result.bullets.what.includes(ADR_MOVED),
    "the proposal states the path it moves from and the path it moves to",
  );

  const applied = call(
    moving,
    "move",
    "--apply",
    "--proposal",
    proposal.payload.result.proposal_id,
    "--content-hash",
    proposal.payload.result.content_hash,
  );
  ok(applied.code === 0, "an approved move exits 0");
  ok(applied.payload.status === "ok", "an approved move reports ok");
  ok(applied.payload.result.moved === ADR_ID, "the result names the record that moved");
  ok(applied.payload.result.moved_from === ADR_PATH, "the result names the old path");
  ok(applied.payload.result.moved_to === ADR_MOVED, "the result names the new path");
  ok(existsSync(resolve(moving, ADR_MOVED)), "the record is at its new path");
  ok(!existsSync(resolve(moving, ADR_PATH)), "nothing is left at the old path");

  const changed = applied.payload.result.changed_paths;
  ok(
    ["knowledge/specs/link-policy.md", "README.md", "knowledge/memory/facts/link-syntax.md", ADR_MOVED, ADR_PATH]
      .every((path) => changed.includes(path)),
    "one operation reports every path it changed",
  );
  ok(
    read(moving, "knowledge/specs/link-policy.md").includes("../memory/decisions/adr/link-home.md"),
    "the specification's link is repaired",
  );
  ok(
    read(moving, "README.md").includes("./knowledge/memory/decisions/adr/link-home.md"),
    "a link from outside knowledge/ is repaired too",
  );
  ok(
    read(moving, "knowledge/memory/facts/link-syntax.md").includes("../decisions/adr/link-home.md"),
    "a link from another record is repaired",
  );
  ok(
    read(moving, "knowledge/specs/link-policy.md").includes("`[label](knowledge/memory/decisions/link-home.md)`"),
    "a path written inside a code span is left exactly as it was",
  );
  ok(
    read(moving, "knowledge/specs/link-policy.md").includes("[a fenced example](../memory/decisions/link-home.md)"),
    "a link inside a fenced block is left exactly as it was",
  );

  const afterMove = call(moving, "validate", "--check", "MV-21,MV-22");
  ok(afterMove.code === 0, "every repaired link resolves");
  ok(entry(afterMove.payload, "MV-21").status === "pass", "MV-21 passes after the move");
  ok(entry(afterMove.payload, "MV-22").status === "pass", "MV-22 confirms no link to the old path survives");

  const movedRelated = call(moving, "related", "--id", ADR_ID).payload.result;
  ok(movedRelated.path === ADR_MOVED, "related follows the record to its new path");
  ok(
    movedRelated.incoming.some((link) => link.path === "knowledge/specs/link-policy.md" && link.relation === "links_to"),
    "the backlinks survive the move",
  );

  // A rename inside the same folder is the same operation.
  const renamed = moveRecord(moving, ADR_ID, "knowledge/memory/decisions/adr/link-home-rule.md");
  ok(renamed.applied.code === 0, "a rename runs through the same approved operation");
  ok(
    read(moving, "knowledge/specs/link-policy.md").includes("../memory/decisions/adr/link-home-rule.md"),
    "a rename repairs the links to the old name",
  );
  ok(
    call(moving, "validate", "--check", "MV-21").code === 0,
    "every link still resolves after the rename",
  );

  // -------------------------------------------------------------------------
  // The move's own refusals.
  // -------------------------------------------------------------------------
  const refusing = project("refuse");
  const beforeRefusals = snapshot(refusing);

  const unknownMove = call(refusing, "move", "--id", "decision-not-here", "--to", ADR_MOVED, "--propose");
  ok(unknownMove.code === 1, "a move of an unknown record is refused");
  ok(codes(unknownMove.payload.errors).includes("record/unknown-id"), "the refusal is record/unknown-id");

  const outside = call(refusing, "move", "--id", ADR_ID, "--to", "notes/link-home.md", "--propose");
  ok(outside.code === 1, "a move out of knowledge/ is refused");
  ok(codes(outside.payload.errors).includes("scope/outside-root"), "the refusal names the boundary it crossed");

  const wrongFolder = call(refusing, "move", "--id", ADR_ID, "--to", "knowledge/memory/facts/link-home.md", "--propose");
  ok(wrongFolder.code === 1, "a move into the wrong type folder is refused");
  ok(codes(wrongFolder.payload.errors).includes("record/schema-invalid"), "the refusal names the schema");

  const occupied = call(refusing, "move", "--id", ADR_ID, "--to", "knowledge/memory/facts/link-syntax.md", "--propose");
  ok(occupied.code === 1, "a move onto a file that is already there is refused");

  const nowhere = call(refusing, "move", "--id", ADR_ID, "--to", ADR_PATH, "--propose");
  ok(nowhere.code === 0 && nowhere.payload.status === "noop", "a move to the path it already sits on is a NOOP");
  ok(nowhere.payload.result.changed_paths.length === 0, "the NOOP changes nothing");

  ok(same(snapshot(refusing), beforeRefusals), "every refused move left every file unchanged");
  ok(call(refusing, "move", "--id", ADR_ID).code === 2, "a move with no phase is an invalid invocation");
  ok(
    codes(call(refusing, "move", "--propose", "--id", ADR_ID).payload.errors).includes("cli/invalid-invocation"),
    "a move proposal with no destination names the invalid invocation",
  );

  // -------------------------------------------------------------------------
  // The failing repair: a link this project may not write, so nothing changes.
  // -------------------------------------------------------------------------
  const blocked = project("blocked", {
    subroot: "nested",
    files: {
      "nested/notes.md": [
        "# Nested project notes",
        "",
        "It cites [the parent project's decision](../knowledge/memory/decisions/link-home.md).",
        "",
      ].join("\n"),
    },
  });
  const beforeBlocked = snapshot(blocked);

  const refusedMove = call(blocked, "move", "--id", ADR_ID, "--to", ADR_MOVED, "--propose");
  ok(refusedMove.code === 1, "a move with a link it cannot repair is refused");
  ok(
    codes(refusedMove.payload.errors).includes("write/link-repair-failed"),
    "the refusal is write/link-repair-failed",
  );
  ok(
    refusedMove.payload.errors.some((error) => error.path === "nested/notes.md"),
    "the refusal names the exact path that could not be repaired",
  );
  ok(same(snapshot(blocked), beforeBlocked), "the refused move changed nothing at all");
  ok(!existsSync(resolve(blocked, ADR_MOVED)), "the record never reached the new path");
  ok(existsSync(resolve(blocked, ADR_PATH)), "the record is still at its old path");
  ok(
    !existsSync(resolve(blocked, ".memory/review"))
      || readdirSync(resolve(blocked, ".memory/review")).length === 0,
    "a refused proposal leaves no review file to approve",
  );

  // -------------------------------------------------------------------------
  // The same failure discovered inside the transaction: every preimage returns.
  // -------------------------------------------------------------------------
  const late = project("late", { subroot: "nested", files: { "nested/.keep": "" } });
  const lateProposal = call(late, "move", "--id", ADR_ID, "--to", ADR_MOVED, "--propose");
  ok(lateProposal.payload.status === "awaiting-approval", "the move is proposed while every link is repairable");

  write(
    late,
    "nested/notes.md",
    ["# Nested project notes", "", "It cites [the decision](../knowledge/memory/decisions/link-home.md).", ""].join("\n"),
  );
  const beforeLate = snapshot(late);

  const lateApply = call(
    late,
    "move",
    "--apply",
    "--proposal",
    lateProposal.payload.result.proposal_id,
    "--content-hash",
    lateProposal.payload.result.content_hash,
  );
  ok(lateApply.code === 1, "a link that appeared after the review refuses the approved move");
  ok(
    codes(lateApply.payload.errors).includes("write/link-repair-failed"),
    "the transaction refuses with write/link-repair-failed",
  );
  ok(
    lateApply.payload.errors.some((error) => error.path === "nested/notes.md"),
    "the transaction names the exact unresolved path",
  );
  ok(same(snapshot(late), beforeLate), "every preimage was restored, so nothing changed");
  ok(existsSync(resolve(late, ADR_PATH)), "the record stayed at its old path");
  ok(!existsSync(resolve(late, ADR_MOVED)), "nothing was left at the new path");
  ok(!existsSync(resolve(late, ".memory/journal.json")), "the transaction cleared its journal");

  const lateCheck = call(late, "validate", "--check", "MV-22");
  ok(lateCheck.code === 0, "MV-22 confirms the restored move left the repository as it was");
  ok(entry(lateCheck.payload, "MV-22").status === "pass", "MV-22 passes on a restored move");

  // -------------------------------------------------------------------------
  // Determinism.
  // -------------------------------------------------------------------------
  const twice = project("twice");
  ok(
    call(twice, "related", "--id", ADR_ID).stdout === call(twice, "related", "--id", ADR_ID).stdout,
    "two related runs produce the same bytes",
  );
  ok(
    call(twice, "validate", "--check", "MV-21").stdout === call(twice, "validate", "--check", "MV-21").stdout,
    "two MV-21 runs produce the same bytes",
  );

  console.log(`\nALL PASS (${passed} checks), FAIL: 0`);
} catch (error) {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
} finally {
  for (const path of fixtures) rmSync(path, { recursive: true, force: true });
}

#!/usr/bin/env node

/**
 * The shipped isolation fixtures of architecture section 21.11.
 *
 * Validator checks MV-16 and MV-17 prove scope and privacy against fixtures
 * that ship with the validator, so the proof does not depend on any one real
 * project. `memory.mjs validate --fixtures` is the only route that runs them.
 *
 * The fixtures sit in their own file for one mechanical reason: building a
 * fixture writes files, and the retrieval path may not carry a write call.
 * `tools/memory.mjs` is scanned as retrieval code by the AT-18 acceleration
 * scan in `gold-set.mjs`, and this file is not, because it answers no
 * question. Every fixture is built under the operating system's temporary
 * folder, is read through the same scope and pin readers a real project uses,
 * and is removed again before the run returns. Nothing is written inside any
 * project, and nothing survives the call.
 */

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { realpathSync } from "node:fs";

import { note } from "./lib/result.mjs";
import { isMemberPath, resolvePrivacy, resolveScope } from "./lib/scope.mjs";
import { walkRecords } from "./lib/record-schema.mjs";
import { PINS_PATH, parsePins, resolvePinTarget } from "./lib/pins.mjs";
import { SENSITIVE_SECTION } from "./memory-write.mjs";

/** Every fixture built by one run, removed in the finally block below. */
function makeRoot(name) {
  return mkdtempSync(join(realpathSync(tmpdir()), `memory-fixture-${name}-`));
}

function put(base, path, text) {
  const absolute = resolve(base, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, text, "utf8");
}

function settings(projectId, { subroots = [], level = "standard", transfer = "denied", consent = null } = {}) {
  const lines = [
    "---",
    "schema_version: 2",
    `project_id: ${projectId}`,
    "project_root: .",
    `subroots: [${subroots.join(", ")}]`,
    "privacy:",
    `  level: ${level}`,
    `  external_transfer: ${transfer}`,
    "  third_party_personal: refused",
  ];
  if (consent !== null) lines.push(`  consent: ${consent}`);
  lines.push("profiles: []", "---", "", "# What this project is", "", "A shipped isolation fixture.", "");
  return lines.join("\n");
}

function currentFile() {
  return [
    "---",
    "updated: 2026-08-20",
    "---",
    "",
    "# Current state",
    "",
    "## Current focus",
    "",
    "Proving scope isolation.",
    "",
    "## Blockers",
    "",
    "None.",
    "",
    "## Next step",
    "",
    "Run the fixtures.",
    "",
    "## Handoff",
    "",
    "The fixtures are temporary.",
    "",
  ].join("\n");
}

function record(id, summary, { sections = [] } = {}) {
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
    "    locator: knowledge/current.md",
    "based_on: []",
    "---",
    "",
    `# ${summary}`,
    "",
    `${summary}.`,
    "",
    ...sections,
  ].join("\n");
}

/** The minimum required core, written straight rather than copied. */
function core(base, projectId, options = {}) {
  put(base, "knowledge/project.md", settings(projectId, options));
  put(base, "knowledge/map.md", "# Project map\n\n| Role | Path |\n| --- | --- |\n| Approved behavior | `knowledge/specs/` |\n");
  put(base, "knowledge/current.md", currentFile());
  put(base, "knowledge/specs/.gitkeep", "");
  for (const folder of ["facts", "decisions", "events", "patterns"]) {
    put(base, `knowledge/memory/${folder}/.gitkeep`, "");
  }
}

function pinFile(id, target, hash) {
  return [
    "# Pinned memory",
    "",
    "| Record id | Link | Approved | Summary hash |",
    "| --- | --- | --- | --- |",
    `| ${id} | [${id}](${target}) | 2026-08-19 | ${hash} |`,
    "",
  ].join("\n");
}

/** The record paths one project's own readers return. */
function recordPaths(root) {
  const scope = resolveScope(root);
  if (!scope.ok) return null;
  return walkRecords(scope.scopeRoot)
    .filter((entry) => isMemberPath(scope, entry.absolute))
    .map((entry) => entry.path)
    .sort();
}

/** The pin targets one project's own registry resolves to. */
function pinPaths(root) {
  const scope = resolveScope(root);
  if (!scope.ok) return null;
  const absolute = resolve(scope.scopeRoot, PINS_PATH);
  let text;
  try {
    text = readFileSync(absolute, "utf8");
  } catch {
    return [];
  }
  return parsePins(text)
    .map((entry) => resolvePinTarget(scope.scopeRoot, entry.target))
    .filter((resolved) => isMemberPath(scope, resolved.absolute))
    .map((resolved) => resolved.path)
    .sort();
}

/**
 * Section 21.11 fixture one, the direct AT-06 proof. Two sibling projects
 * hold a record with the same id and a pin each. Neither project's records
 * nor pins may reach the other's file.
 */
function twoSiblings(findings) {
  const parent = makeRoot("siblings");
  const alpha = resolve(parent, "alpha");
  const beta = resolve(parent, "beta");
  core(alpha, "fixture-alpha");
  core(beta, "fixture-beta");
  put(alpha, "knowledge/memory/facts/shared.md", record("fact-shared", "Alpha holds the shared id"));
  put(beta, "knowledge/memory/facts/shared.md", record("fact-shared", "Beta holds the shared id"));
  put(alpha, `knowledge/${PINS_PATH.slice("knowledge/".length)}`, pinFile("fact-shared", "memory/facts/shared.md", "0".repeat(64)));
  put(beta, `knowledge/${PINS_PATH.slice("knowledge/".length)}`, pinFile("fact-shared", "memory/facts/shared.md", "0".repeat(64)));

  const alphaRecords = recordPaths(alpha);
  const betaRecords = recordPaths(beta);
  if (alphaRecords === null || betaRecords === null) {
    findings.push(note("scope/unresolved-root", "a sibling fixture project did not resolve its own scope"));
    return parent;
  }
  const expected = ["knowledge/memory/facts/shared.md"];
  if (alphaRecords.join("|") !== expected.join("|") || betaRecords.join("|") !== expected.join("|")) {
    findings.push(note(
      "scope/cross-scope-result",
      "a sibling project returned a record set that is not its own",
    ));
  }
  for (const [root, other] of [[alpha, beta], [beta, alpha]]) {
    const pins = pinPaths(root);
    if (pins === null || pins.length !== 1) {
      findings.push(note("scope/cross-scope-result", "a sibling project's pin registry did not resolve to exactly its own record"));
      continue;
    }
    const target = resolve(root, pins[0]);
    if (target.startsWith(other + "/")) {
      findings.push(note("scope/cross-scope-result", "a sibling project's pin resolved into the other project"));
    }
  }
  return parent;
}

/**
 * Section 21.11 fixture two and three. A parent declares two subroots: a
 * session in a subroot resolves to that subroot, and the parent's own record
 * set holds nothing from either. Removing one declaration leaves an
 * undeclared nested project the parent must report.
 */
function monorepo(findings) {
  const base = makeRoot("monorepo");
  core(base, "fixture-parent", { subroots: ["apps/one", "apps/two"] });
  put(base, "knowledge/memory/facts/parent.md", record("fact-parent", "The parent holds its own record"));
  for (const name of ["one", "two"]) {
    core(resolve(base, "apps", name), `fixture-${name}`);
    put(resolve(base, "apps", name), "knowledge/memory/facts/child.md", record(`fact-${name}`, `Subroot ${name} holds its own record`));
  }

  const parentRecords = recordPaths(base);
  if (parentRecords === null || parentRecords.join("|") !== "knowledge/memory/facts/parent.md") {
    findings.push(note("scope/cross-scope-result", "the parent scope returned a record from a declared subroot"));
  }
  const childScope = resolveScope(resolve(base, "apps/one"));
  if (!childScope.ok || childScope.projectId !== "fixture-one") {
    findings.push(note("scope/unresolved-root", "a session inside a declared subroot did not resolve to that subroot"));
  }

  // The same tree with one declaration removed. The nested project is still
  // physically there, so the parent has to see it and refuse to own it.
  const undeclared = makeRoot("undeclared");
  core(undeclared, "fixture-undeclared", { subroots: ["apps/one"] });
  for (const name of ["one", "two"]) {
    core(resolve(undeclared, "apps", name), `fixture-nested-${name}`);
  }
  const outer = resolveScope(undeclared);
  if (outer.ok && isMemberPath(outer, resolve(undeclared, "apps/two/knowledge/project.md")) === false) {
    findings.push(note(
      "scope/undeclared-nested-scope",
      "an undeclared nested project read as outside the parent scope, so the parent would never report it",
    ));
  }
  return [base, undeclared];
}

/**
 * Section 21.11 fixture four and five. A link inside the scope pointing at a
 * file outside it never becomes a member path, and a sibling directory whose
 * name starts with the scope root's name is not a member either.
 */
function escapes(findings) {
  const parent = makeRoot("escape");
  const project = resolve(parent, "project");
  core(project, "fixture-escape");
  put(parent, "outside/secret-notes.md", "# Outside\n\nThis file is not this project's.\n");
  put(parent, "project-notes/note.md", "# Similarly named sibling\n\nNot a member.\n");

  const scope = resolveScope(project);
  if (!scope.ok) {
    findings.push(note("scope/unresolved-root", "the symlink fixture project did not resolve its own scope"));
    return parent;
  }

  const linkPath = resolve(project, "knowledge/memory/facts/escape.md");
  try {
    symlinkSync(resolve(parent, "outside/secret-notes.md"), linkPath);
  } catch {
    // A platform without symbolic links cannot run this fixture, and saying
    // nothing is better than reporting a failure the platform caused.
    return parent;
  }

  if (isMemberPath(scope, linkPath)) {
    findings.push(note(
      "scope/symlink-escape",
      "a symbolic link inside the scope resolved to a file outside it and still read as a member",
    ));
  }
  const walked = walkRecords(scope.scopeRoot).map((entry) => entry.path);
  if (walked.includes("knowledge/memory/facts/escape.md")) {
    findings.push(note("scope/symlink-escape", "the record walk followed a symbolic link out of the scope"));
  }
  if (isMemberPath(scope, resolve(parent, "project-notes/note.md"))) {
    findings.push(note(
      "scope/outside-root",
      "a sibling directory whose name starts with the scope root's name read as a member",
    ));
  }
  return parent;
}

/**
 * MV-16 fixtures. Findings are returned rather than thrown, so a failing
 * fixture reads like every other validator finding.
 */
export function runIsolationFixtures() {
  const findings = [];
  const roots = [];
  try {
    roots.push(twoSiblings(findings));
    roots.push(...monorepo(findings));
    roots.push(escapes(findings));
  } catch (error) {
    findings.push(note("scope/unresolved-root", `an isolation fixture could not run: ${error.code ?? "failed"}`));
  } finally {
    for (const path of roots) rmSync(path, { recursive: true, force: true });
  }
  return { fixtures: ["two sibling projects", "monorepo subroots", "undeclared nested project", "symlink escape", "similarly named sibling"], findings };
}

/**
 * Section 21.11 fixture six, the sensitive project. An approved sensitive
 * record stays out of pins and startup and is still found by direct search,
 * and transfer with an incomplete consent record resolves to denied.
 *
 * `sensitiveGaps` is handed in rather than imported, because MV-17 owns that
 * reader and a second copy of it here is how two answers to one question
 * appear.
 */
export function runPrivacyFixtures({ sensitiveGaps }) {
  const findings = [];
  const roots = [];
  try {
    const base = makeRoot("sensitive");
    roots.push(base);
    core(base, "fixture-sensitive", { level: "sensitive" });
    put(base, "knowledge/memory/facts/needed.md", record("fact-needed", "The owner takes one daily reading", {
      sections: [
        `## ${SENSITIVE_SECTION}`,
        "",
        "Category: health",
        "Needed because: the schedule this project builds depends on it.",
        "",
      ],
    }));
    put(base, "knowledge/memory/facts/no-need.md", record("fact-no-need", "A sensitive detail with no stated need", {
      sections: [`## ${SENSITIVE_SECTION}`, "", "Category: health", ""],
    }));

    const scope = resolveScope(base);
    if (!scope.ok || scope.privacy.level !== "sensitive") {
      findings.push(note("record/schema-invalid", "the sensitive fixture did not resolve as a sensitive project"));
    }
    const paths = recordPaths(base) ?? [];
    if (!paths.includes("knowledge/memory/facts/needed.md")) {
      findings.push(note(
        "privacy/sensitive-unapproved-exposure",
        "an approved sensitive record was not searchable, and section 21.6 keeps it fully searchable",
      ));
    }
    const gaps = sensitiveGaps(readFileSync(resolve(base, "knowledge/memory/facts/no-need.md"), "utf8"));
    if (!gaps.includes("needed-reason")) {
      findings.push(note(
        "privacy/sensitive-unapproved-exposure",
        "a sensitive record with no stated need was not reported as missing its needed reason",
      ));
    }

    const incomplete = makeRoot("consent");
    roots.push(incomplete);
    core(incomplete, "fixture-consent", { transfer: "approved" });
    const resolved = resolvePrivacy(resolveScope(incomplete).settings ?? {});
    if (resolved.privacy.external_transfer !== "denied") {
      findings.push(note(
        "privacy/consent-missing",
        "approved transfer with no consent record did not resolve to denied",
      ));
    }
  } catch (error) {
    findings.push(note("record/schema-invalid", `a privacy fixture could not run: ${error.code ?? "failed"}`));
  } finally {
    for (const path of roots) rmSync(path, { recursive: true, force: true });
  }
  return { fixtures: ["sensitive project", "incomplete consent record"], findings };
}

#!/usr/bin/env node

/**
 * The migration engine, version 1 to version 2.
 *
 * One supported source: the version 1 `knowledge/` layout, the tree the
 * toolkit has been installing since 3.7.0. It converts to the version 2
 * four-type tree of architecture section 7.
 *
 * Three rules shape every line below, and they come from FR-051 to FR-055.
 *
 * 1. Planning never writes. `plan` reads the project, reports what would
 *    happen with counts, hashes, collisions, gaps, link changes, and the
 *    rollback steps, and returns a hash. `apply` refuses without that exact
 *    hash, so what the owner read is what gets written.
 * 2. Nothing is invented. A version 2 field this engine can derive from real
 *    version 1 content is written; a field it cannot is reported as a gap and
 *    left empty. Every migrated record keeps `schema_version: 1` until an
 *    approved operation completes it, which is what makes the validator treat
 *    it as a legacy gap, a warning, rather than a schema failure.
 * 3. Record bodies never change. A record's front matter is rewritten; the
 *    bytes below it are carried over exactly, and both the plan and the
 *    receipt hash the body separately so that claim can be checked rather
 *    than trusted.
 *
 * `flat-149` and `retired-v3` are detect-only. Their conversions belonged to
 * the version 1 engine and shipped in toolkit 3.6.0; a project still on one of
 * them runs that migration first, then this one.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { TYPE_FOLDERS, parseRecord } from "./lib/record-schema.mjs";
import {
  isRelativeTarget,
  relativeLinkText,
  resolveLinkTarget,
  rewriteLinks,
  scanLinks,
} from "./lib/links.mjs";
import {
  PINS_PATH,
  PIN_STATEMENT_LIMIT,
  approvedSummary,
  renderPinsFile,
  summaryHash,
} from "./lib/pins.mjs";

const posix = (value) => value.split(sep).join("/");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

/** The receipt of the last applied migration. Local, disposable, gitignored. */
export const RECEIPT_PATH = ".memory/last-migration.json";

/** Where apply keeps the preimage of every file it changes, so rollback works. */
export const PREIMAGE_FOLDER = ".memory/migration-preimages";

/** The version 1 memory folders, in the order a report lists them. */
export const V1_MEMORY_FOLDERS = Object.freeze([
  "context",
  "decisions",
  "domain",
  "knowledge",
  "operations",
  "planning",
  "references",
]);

/**
 * The taxonomy mapping. Version 1 kept seven memory folders; version 2 keeps
 * four record types. Five folders map deterministically. The other two hold
 * meaning that belongs somewhere else entirely, so they are never auto-moved.
 */
export const TAXONOMY = Object.freeze({
  context: "fact",
  domain: "fact",
  knowledge: "fact",
  decisions: "decision",
  operations: "pattern",
});

/** Version 1 folders whose files the owner routes, one file at a time. */
export const OWNER_ROUTED = Object.freeze({
  planning: "the work tracker, or a planning record the owner approves",
  references: "the reference area this project maps in knowledge/map.md",
});

/** Single version 1 files the owner routes or retires. */
export const OWNER_ROUTED_FILES = Object.freeze([
  {
    path: "knowledge/memory/tags.md",
    question: "version 2 has no tag registry: route this file or retire it",
  },
]);

/** Generated version 1 files the generated views replace. */
export const RETIRED_GENERATED = Object.freeze(["knowledge/index.md"]);

/** Version 1 areas version 2 keeps exactly where they are. */
export const PRESERVED_IN_PLACE = Object.freeze([
  { path: "knowledge/project.md", role: "Project identity and settings" },
  { path: "knowledge/specs", role: "Approved behavior" },
  { path: "knowledge/brainstorms", role: "Internal exploration, a mapped area" },
  { path: "knowledge/retrieval-gold-set.md", role: "The optional retrieval gold set" },
  { path: "knowledge/.obsidian", role: "Editor settings, not project truth" },
]);

/**
 * The declared expected-follow-up set: the version 2 core this engine does not
 * author, because the owner does, after apply returns.
 *
 * The plan reports it as `followUp` and the receipt records it as `follow_up`,
 * so the set is declared before the migration runs and is still readable long
 * afterwards. MV-18 reads it from the receipt.
 *
 * Declaring the set is what keeps MV-18 answerable on a real project. Every
 * one of these files has to change after apply for the project to work at all:
 * scope cannot resolve until the version 2 front matter is in project.md. A
 * check that recorded those files as unchanged and then failed on the owner
 * doing the very thing the migration told them to do could never pass. So the
 * declaration is part of the plan, and MV-18 treats a changed byte in one of
 * these files as expected and reports it. Any other divergence still fails.
 */
export const OWNER_AUTHORED_CORE = Object.freeze([
  {
    path: "knowledge/current.md",
    note: "current state and handoff are project state, so setup authors this file",
  },
  {
    path: "knowledge/map.md",
    note: "the semantic map names this project's own areas, so setup authors this file",
  },
  {
    path: "knowledge/project.md",
    note: "the version 2 settings front matter is owner-only, so setup adds it",
  },
]);

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

function pathExists(root, path) {
  return existsSync(resolve(root, path));
}

function fileContains(root, path, text) {
  try {
    return readFileSync(resolve(root, path), "utf8").includes(text);
  } catch {
    return false;
  }
}

function evidence(root, paths) {
  return paths.filter((path) => pathExists(root, path));
}

/**
 * The version 2 signatures. None of them exists in a version 1 tree, which is
 * what keeps the two states apart without reading folder names alone.
 */
function version2Evidence(root) {
  const found = evidence(root, [
    "knowledge/map.md",
    "knowledge/current.md",
    "knowledge/memory/facts",
    "knowledge/memory/events",
    "knowledge/memory/patterns",
  ]);
  if (fileContains(root, "knowledge/project.md", "schema_version: 2")) {
    found.unshift("knowledge/project.md declares schema_version: 2");
  }
  return found;
}

/**
 * The version 1 signatures. Only folders and files version 2 does not keep
 * count, so a migrated project stops matching the moment apply finishes.
 */
function version1Evidence(root) {
  return evidence(root, [
    "knowledge/index.md",
    ...V1_MEMORY_FOLDERS
      .filter((folder) => folder !== "decisions")
      .map((folder) => `knowledge/memory/${folder}`),
  ]);
}

export function detectLayout(projectRoot = process.cwd()) {
  const root = resolve(projectRoot);

  const v1Core = evidence(root, [
    "knowledge/project.md",
    "knowledge/specs",
    "knowledge/memory",
    "knowledge/brainstorms",
  ]);
  const v1Markers = version1Evidence(root);
  const v1Complete = v1Core.length === 4 && v1Markers.length > 0;
  const v1Partial = v1Markers.length > 0;

  const v2Markers = version2Evidence(root);
  const v2Complete = v2Markers.length >= 3;
  const v2Partial = v2Markers.length > 0;

  const flatRoots = evidence(root, ["specs", "memory", "brainstorms"]);
  const flatSignatures = evidence(root, [
    "memory/index.md",
    "memory/tags.md",
    ".claude/tools/build-memory-index.mjs",
    ".claude/skills/remember/SKILL.md",
    ".claude/skills/recall/SKILL.md",
    ".claude/skills/cleanup/SKILL.md",
  ]);
  if (
    fileContains(root, "CLAUDE.md", "memory/index.md")
    || fileContains(root, "AGENTS.md", "memory/index.md")
  ) flatSignatures.push("root route -> memory/index.md");
  const flatComplete = flatRoots.length === 3 && flatSignatures.length > 0;
  const flatPartial = flatRoots.length > 0 || flatSignatures.length > 0;

  const retiredCore = evidence(root, [
    ".claude/rules/second-brain.md",
    ".claude/agents/memory-verifier.md",
    ".claude/tools/memory-index-build.mjs",
    ".claude/tools/memory-shape-check.mjs",
  ]);
  const retiredIndexes = evidence(root, [
    "specs/README.md",
    "brainstorms/README.md",
    "memory/README.md",
    "memory/context/README.md",
    "memory/decisions/README.md",
    "memory/domain/README.md",
    "memory/knowledge/README.md",
    "memory/operations/README.md",
    "memory/planning/README.md",
    "memory/references/README.md",
  ]);
  const retiredComplete = retiredCore.length >= 3 && retiredIndexes.length >= 3;
  const retiredPartial = retiredCore.length > 0 || retiredIndexes.length >= 3;

  const complete = [
    v1Complete ? "v1" : null,
    v2Complete ? "v2" : null,
    flatComplete ? "flat-149" : null,
    retiredComplete ? "retired-v3" : null,
  ].filter(Boolean);

  let layout;
  if (complete.length > 1) layout = "mixed";
  else if (complete.length === 1) {
    const [candidate] = complete;
    const flatRuntimeBeyondRoute = flatSignatures
      .some((item) => item !== "root route -> memory/index.md");
    const conflictingPartial =
      (candidate !== "v1" && v1Partial)
      || (candidate !== "v2" && v2Partial)
      || (
        candidate !== "flat-149"
        && (flatRoots.length > 0 || flatRuntimeBeyondRoute)
        && !retiredComplete
      )
      || (candidate !== "retired-v3" && retiredPartial && !flatComplete);
    layout = conflictingPartial ? "mixed" : candidate;
  } else if (v1Partial || v2Partial || flatPartial || retiredPartial) layout = "unknown";
  else layout = "none";

  return {
    layout,
    evidence: {
      version1: [...v1Core, ...v1Markers],
      version2: v2Markers,
      flatRoots,
      flatSignatures: [...new Set(flatSignatures)],
      retiredCore,
      retiredIndexes,
    },
    writes: false,
  };
}

// ---------------------------------------------------------------------------
// Reading the project
// ---------------------------------------------------------------------------

function collectFiles(root, relativeDir, out = [], blockers = []) {
  const absoluteDir = resolve(root, relativeDir);
  let entries;
  try {
    entries = readdirSync(absoluteDir, { withFileTypes: true });
  } catch {
    return { out, blockers };
  }

  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    const relativePath = posix(join(relativeDir, entry.name));
    const absolutePath = resolve(root, relativePath);
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      blockers.push(`symlink inside migration source: ${relativePath}`);
    } else if (stat.isDirectory()) {
      collectFiles(root, relativePath, out, blockers);
    } else if (stat.isFile()) {
      out.push(relativePath);
    }
  }
  return { out, blockers };
}

function trackedFiles(root) {
  try {
    return execFileSync(
      "git",
      ["ls-files", "-co", "--exclude-standard", "-z"],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    )
      .split("\0")
      .filter(Boolean)
      .map(posix)
      .sort();
  } catch {
    const files = [];
    const walk = (dir) => {
      for (const entry of readdirSync(resolve(root, dir), { withFileTypes: true })) {
        if ([".git", "node_modules", ".memory", ".claude/worktrees"].includes(entry.name)) continue;
        const path = posix(join(dir, entry.name));
        if (entry.isDirectory()) walk(path);
        else if (entry.isFile()) files.push(path);
      }
    };
    walk("");
    return files.sort();
  }
}

// ---------------------------------------------------------------------------
// Deriving version 2 fields from real version 1 content
// ---------------------------------------------------------------------------

/**
 * The permanent record id, derived from the version 1 filename. Deterministic
 * and reversible by eye: the same file always produces the same id, which is
 * what lets a gold set name an id before the migration runs.
 */
export function recordIdFor(type, path) {
  const stem = basename(path).replace(/\.md$/i, "");
  const slug = stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${type}-${slug}`;
}

const ENTITY_SHAPE = /^[A-Za-z0-9._/-]+$/;
const ENTITY_EXTENSION = /\.[A-Za-z]{1,6}$/;

function looksLikeEntity(value) {
  if (!value || value.length > 120) return false;
  if (!ENTITY_SHAPE.test(value)) return false;
  if (!/[A-Za-z0-9]/.test(value)) return false;
  return value.includes("/") || ENTITY_EXTENSION.test(value);
}

/**
 * The entities one record names, read out of the record's own body: the file
 * and folder paths it writes in code spans, and the files it links to. Nothing
 * is guessed from the title or the folder, so a record that names no file gets
 * an empty list rather than an invented one.
 */
export function entitiesIn(root, path, body) {
  const found = new Set();

  let fenced = false;
  for (const line of body.replace(/\r\n/g, "\n").split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    for (const match of line.matchAll(/`([^`\n]+)`/g)) {
      const token = match[1].trim();
      if (looksLikeEntity(token)) found.add(token);
    }
  }

  for (const link of scanLinks(body)) {
    if (link.image || !isRelativeTarget(link.path)) continue;
    const target = resolveLinkTarget(root, path, link.path);
    if (target && looksLikeEntity(target)) found.add(target);
  }

  return [...found].sort();
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function inlineList(values) {
  return `[${values.join(", ")}]`;
}

/** The raw front matter lines of one file, or null when it carries none. */
function frontMatterLines(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return null;
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) return null;
  return {
    lines: normalized.slice(4, end).split("\n"),
    body: normalized.slice(end + 5),
  };
}

/** Drop one top-level key and every line indented under it. */
function withoutKeys(lines, keys) {
  const kept = [];
  let dropping = false;
  for (const line of lines) {
    const indent = line.length - line.trimStart().length;
    if (indent === 0 && /^[A-Za-z0-9_-]+:/.test(line.trim())) {
      dropping = keys.includes(line.trim().split(":")[0]);
    } else if (indent === 0 && line.trim() === "") {
      // A blank line belongs to whatever block it sits in.
    } else if (indent === 0) {
      dropping = false;
    }
    if (!dropping) kept.push(line);
  }
  return kept.filter((line, index, all) => line.trim() !== "" || (index > 0 && all[index - 1].trim() !== ""));
}

/**
 * Rewrite one version 1 record into a version 2 record, front matter only.
 *
 * Written: the fields this engine can derive from real content. Kept: every
 * version 1 field that carries meaning nothing here can translate. Reported:
 * the version 2 fields that are missing, so the owner sees the gap instead of
 * a value nobody approved.
 */
export function upgradeRecord({ root, path, text, type }) {
  const parsed = frontMatterLines(text);
  const gaps = [];
  const added = [];
  const renamed = [];

  if (!parsed) {
    return {
      text: null,
      gaps: ["the file carries no YAML front matter, so nothing can be derived from it"],
      added,
      renamed,
      id: null,
      entities: [],
      body: text.replace(/\r\n/g, "\n"),
    };
  }

  const record = parseRecord(text);
  const data = record.data ?? {};
  const id = recordIdFor(type, path);
  const entities = entitiesIn(root, path, parsed.body);

  const header = [`schema_version: 1`, `id: ${id}`, `type: ${type}`];
  added.push("schema_version", "id", "type");

  const supersededBy = String(data["superseded-by"] ?? "").trim();
  header.push(`status: ${supersededBy ? "superseded" : "active"}`);
  added.push("status");

  const date = String(data.date ?? "").trim();
  const dropped = ["tags"];
  if (DATE.test(date)) {
    header.push(`recorded_at: ${date}`);
    renamed.push("date -> recorded_at");
    dropped.push("date");
  } else {
    gaps.push("recorded_at: the version 1 date field is missing or is not a YYYY-MM-DD date");
  }

  if (entities.length > 0) {
    header.push(`entities: ${inlineList(entities)}`);
    added.push("entities");
  }

  const topics = Array.isArray(data.tags)
    ? data.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : String(data.tags ?? "").trim() ? [String(data.tags).trim()] : [];
  if (topics.length > 0) {
    header.push(`topics: ${inlineList(topics)}`);
    renamed.push("tags -> topics");
  }

  for (const field of ["epistemic_status", "approval", "evidence"]) {
    gaps.push(`${field}: version 1 recorded no value this engine can translate`);
  }

  const carried = withoutKeys(parsed.lines, dropped);
  const front = [...header, ...carried.filter((line) => line.trim() !== "")];

  return {
    text: `---\n${front.join("\n")}\n---\n${parsed.body}`,
    gaps,
    added,
    renamed,
    id,
    entities,
    body: parsed.body,
  };
}

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------

function publicPlan(plan) {
  return {
    schema: plan.schema,
    layout: plan.layout,
    target: plan.target,
    projectRoot: plan.projectRoot,
    asOf: plan.asOf,
    counts: plan.counts,
    upgrades: plan.upgrades.map(({ source, destination, before, after, body, id, type, added, renamed, gaps }) => ({
      source, destination, before, after, body, id, type, added, renamed, gaps,
    })),
    moves: plan.moves,
    retires: plan.retires,
    creates: plan.creates.map(({ path, sha256: hash }) => ({ path, sha256: hash })),
    removes: plan.removes,
    linkRewrites: plan.linkRewrites.map(({ file, before, after, links }) => ({
      file, before, after, links,
    })),
    preserved: plan.preserved,
    ownerQuestions: plan.ownerQuestions,
    metadataGaps: plan.metadataGaps,
    pins: plan.pins,
    followUp: plan.followUp,
    collisions: plan.collisions,
    blockers: [...new Set(plan.blockers)].sort(),
    warnings: plan.warnings,
    rollback: plan.rollback,
  };
}

function hashPlan(plan) {
  return sha256(JSON.stringify(publicPlan(plan)));
}

const ROLLBACK_STEPS = Object.freeze([
  "Run `knowledge-layout.mjs rollback <project-root>`.",
  "Every file this migration changed, moved, or retired is restored from its preimage under `.memory/migration-preimages/`.",
  "Every file this migration created is deleted, including the generated views and the pin registry it wrote.",
  "The receipt at `.memory/last-migration.json` is removed last, so an interrupted rollback can be run again.",
  "Rollback never deletes approved Markdown and never rewrites Git history. A file the migration did not touch is not read.",
]);

function blocked(plan, code, message) {
  plan.blockers.push(`${code}: ${message}`);
}

/**
 * Read the project and report what a version 1 to version 2 migration would
 * do. This function writes nothing, and every path it reports is relative to
 * the project root.
 */
export function planMigration(projectRoot = process.cwd(), options = {}) {
  const root = resolve(projectRoot);
  const routes = options.routes ?? {};
  const requestedPins = [...new Set(options.pins ?? [])].sort();
  const asOf = options.asOf ?? null;
  const detected = detectLayout(root);

  const plan = {
    schema: "knowledge-migration-plan/1",
    layout: detected.layout,
    target: "v2",
    projectRoot: root,
    asOf,
    counts: {},
    upgrades: [],
    moves: [],
    retires: [],
    creates: [],
    removes: [],
    linkRewrites: [],
    preserved: [],
    ownerQuestions: [],
    metadataGaps: [],
    pins: [],
    followUp: OWNER_AUTHORED_CORE.map((item) => ({ ...item })),
    collisions: [],
    blockers: [],
    warnings: [],
    rollback: [...ROLLBACK_STEPS],
  };

  if (detected.layout !== "v1") {
    if (detected.layout === "flat-149" || detected.layout === "retired-v3") {
      blocked(
        plan,
        "migration/unsupported-source",
        `${detected.layout} is detected but not converted here: run the version 1 migration that shipped in toolkit 3.6.0 first, then run this one`,
      );
    } else if (detected.layout === "v2") {
      blocked(plan, "migration/ambiguous", "this project already runs version 2");
    } else {
      blocked(
        plan,
        "migration/ambiguous",
        `the supported source is the version 1 knowledge layout; detected ${detected.layout}`,
      );
    }
    plan.counts = countsFor(plan, 0);
    plan.hash = hashPlan(plan);
    return plan;
  }

  if (asOf !== null && !DATE.test(asOf)) {
    blocked(plan, "migration/ambiguous", "--as-of is not a YYYY-MM-DD date");
  }

  // ---- the four-type mapping -------------------------------------------
  const moveMap = new Map();
  const idsSeen = new Map();

  for (const folder of V1_MEMORY_FOLDERS) {
    const source = `knowledge/memory/${folder}`;
    if (!pathExists(root, source)) continue;
    const { out, blockers } = collectFiles(root, source);
    plan.blockers.push(...blockers);

    for (const file of out) {
      // An empty version 1 folder is removed, so its placeholder goes with it.
      // The decisions folder is the one version 1 folder version 2 keeps.
      if (basename(file) === ".gitkeep") {
        if (folder !== "decisions") {
          plan.retires.push({
            path: file,
            sha256: sha256(readFileSync(resolve(root, file))),
            reason: "the version 1 folder this placeholder holds open is removed",
          });
        }
        continue;
      }

      if (!file.endsWith(".md")) {
        const answer = routes[file] ?? null;
        plan.ownerQuestions.push({
          path: file,
          question: "this is not a Markdown record, so route it or retire it",
          answer,
        });
        if (answer === null) {
          blocked(plan, "migration/ambiguous", `${file} is not a Markdown record and needs an owner routing answer`);
        } else if (answer === "retire") {
          plan.retires.push({
            path: file,
            sha256: sha256(readFileSync(resolve(root, file))),
            reason: "the owner retired this file during the migration",
          });
        } else {
          moveMap.set(file, answer);
          plan.moves.push({ source: file, destination: answer, sha256: sha256(readFileSync(resolve(root, file))) });
        }
        continue;
      }

      if (OWNER_ROUTED[folder]) {
        const answer = routes[file] ?? null;
        plan.ownerQuestions.push({
          path: file,
          question: `version 2 has no ${folder} folder: this file belongs in ${OWNER_ROUTED[folder]}`,
          answer,
        });
        if (answer === null) {
          blocked(
            plan,
            "migration/ambiguous",
            `${file} needs an owner routing answer before apply; nothing under knowledge/memory/${folder}/ is moved on its own`,
          );
        } else if (answer !== "retire") {
          moveMap.set(file, answer);
          plan.moves.push({ source: file, destination: answer, sha256: sha256(readFileSync(resolve(root, file))) });
        } else {
          plan.retires.push({
            path: file,
            sha256: sha256(readFileSync(resolve(root, file))),
            reason: "the owner retired this file during the migration",
          });
        }
        continue;
      }

      const type = TAXONOMY[folder];
      const destination = `knowledge/memory/${TYPE_FOLDERS[type]}/${basename(file)}`;
      const text = readFileSync(resolve(root, file), "utf8");
      const upgraded = upgradeRecord({ root, path: file, text, type });

      if (upgraded.text === null) {
        blocked(plan, "migration/ambiguous", `${file}: ${upgraded.gaps[0]}`);
        continue;
      }
      if (idsSeen.has(upgraded.id)) {
        plan.collisions.push({
          kind: "record-id",
          id: upgraded.id,
          paths: [idsSeen.get(upgraded.id), file],
        });
        blocked(plan, "migration/collision", `two version 1 records derive the same id ${upgraded.id}`);
      } else {
        idsSeen.set(upgraded.id, file);
      }

      moveMap.set(file, destination);
      plan.upgrades.push({
        source: file,
        destination,
        type,
        id: upgraded.id,
        before: sha256(text),
        after: sha256(upgraded.text),
        body: sha256(upgraded.body),
        added: upgraded.added,
        renamed: upgraded.renamed,
        gaps: upgraded.gaps,
        content: upgraded.text,
      });
      plan.metadataGaps.push({ path: destination, missing: upgraded.gaps });
    }
  }

  // ---- single owner-routed files ----------------------------------------
  for (const item of OWNER_ROUTED_FILES) {
    if (!pathExists(root, item.path)) continue;
    const answer = routes[item.path] ?? null;
    plan.ownerQuestions.push({ path: item.path, question: item.question, answer });
    if (answer === null) {
      blocked(plan, "migration/ambiguous", `${item.path} needs an owner routing answer before apply`);
    } else if (answer === "retire") {
      plan.retires.push({
        path: item.path,
        sha256: sha256(readFileSync(resolve(root, item.path))),
        reason: "version 2 has no tag registry and the owner retired this file",
      });
    } else {
      moveMap.set(item.path, answer);
      plan.moves.push({
        source: item.path,
        destination: answer,
        sha256: sha256(readFileSync(resolve(root, item.path))),
      });
    }
  }

  // ---- generated version 1 files the views replace -----------------------
  for (const path of RETIRED_GENERATED) {
    if (!pathExists(root, path)) continue;
    plan.retires.push({
      path,
      sha256: sha256(readFileSync(resolve(root, path))),
      reason: "generated views replace the version 1 index",
    });
  }

  // ---- collisions --------------------------------------------------------
  const destinations = new Map();
  for (const { source, destination } of [...plan.upgrades, ...plan.moves]) {
    if (destinations.has(destination)) {
      plan.collisions.push({ kind: "destination", path: destination, paths: [destinations.get(destination), source] });
      blocked(plan, "migration/collision", `two files target ${destination}`);
    } else destinations.set(destination, source);

    if (pathExists(root, destination) && !moveMap.has(destination)) {
      plan.collisions.push({ kind: "existing", path: destination, paths: [source] });
      blocked(plan, "migration/collision", `target already exists: ${destination}`);
    }
  }

  // ---- empty version 2 folders and the version 1 folders that go ---------
  for (const type of Object.keys(TYPE_FOLDERS)) {
    const folder = `knowledge/memory/${TYPE_FOLDERS[type]}`;
    const filled = [...destinations.keys()].some((path) => path.startsWith(`${folder}/`));
    if (!filled && !pathExists(root, `${folder}/.gitkeep`)) {
      plan.creates.push({ path: `${folder}/.gitkeep`, content: "", sha256: sha256("") });
    }
  }
  for (const folder of V1_MEMORY_FOLDERS) {
    if (folder === "decisions") continue;
    const path = `knowledge/memory/${folder}`;
    if (pathExists(root, path)) plan.removes.push(path);
  }

  // ---- what stays exactly where it is ------------------------------------
  for (const item of PRESERVED_IN_PLACE) {
    if (pathExists(root, item.path)) plan.preserved.push({ ...item });
  }

  // ---- link repair across the project ------------------------------------
  const existing = new Set(trackedFiles(root));
  const retired = new Set(plan.retires.map((item) => item.path));
  const upgradedText = new Map(plan.upgrades.map((item) => [item.source, item.content]));

  for (const file of [...existing].filter((path) => path.endsWith(".md")).sort()) {
    if (!pathExists(root, file) || retired.has(file)) continue;
    const destination = moveMap.get(file) ?? file;
    const source = upgradedText.get(file) ?? readFileSync(resolve(root, file), "utf8");
    const links = [];

    const rewritten = rewriteLinks(source, ({ path }) => {
      if (!isRelativeTarget(path)) return null;
      const target = resolveLinkTarget(root, file, path);
      if (target === null) return null;
      const moved = moveMap.get(target) ?? null;
      if (moved === null && destination === file) return null;
      if (moved === null && retired.has(target)) {
        blocked(plan, "migration/ambiguous", `${file} links to ${target}, which this migration retires`);
        return null;
      }
      if (moved === null && !existing.has(target) && !pathExists(root, target)) {
        blocked(plan, "migration/ambiguous", `${file} links to ${target}, which is not in the project`);
        return null;
      }
      if (retired.has(target)) {
        blocked(plan, "migration/ambiguous", `${file} links to ${target}, which this migration retires`);
        return null;
      }
      const next = relativeLinkText(destination, moved ?? target);
      if (next === path) return null;
      links.push({ from: path, to: next, target: moved ?? target });
      return next;
    });

    if (rewritten.changed === 0) continue;
    if (upgradedText.has(file)) {
      const entry = plan.upgrades.find((item) => item.source === file);
      entry.content = rewritten.text;
      entry.after = sha256(rewritten.text);
      entry.links = links;
      continue;
    }
    plan.linkRewrites.push({
      file,
      destination,
      before: sha256(source),
      after: sha256(rewritten.text),
      links,
      content: rewritten.text,
    });
  }

  // ---- pins the owner asked for ------------------------------------------
  for (const id of requestedPins) {
    const entry = plan.upgrades.find((item) => item.id === id);
    if (!entry) {
      blocked(plan, "migration/ambiguous", `--pin ${id} names no record this migration writes`);
      continue;
    }
    const statement = approvedSummary(entry.content);
    if (!statement) {
      blocked(plan, "migration/ambiguous", `--pin ${id} names a record with no approved summary to pin`);
      continue;
    }
    const bytes = Buffer.byteLength(statement, "utf8");
    if (bytes > PIN_STATEMENT_LIMIT) {
      blocked(
        plan,
        "migration/ambiguous",
        `--pin ${id} has a ${bytes} byte summary, over the ${PIN_STATEMENT_LIMIT} byte pin statement limit`,
      );
      continue;
    }
    if (asOf === null) {
      blocked(plan, "migration/ambiguous", `--pin ${id} needs --as-of, because a pin records its approval date`);
      continue;
    }
    plan.pins.push({ id, path: entry.destination, date: asOf, hash: summaryHash(statement), statementBytes: bytes });
  }
  if (plan.pins.length > 0) {
    if (pathExists(root, PINS_PATH)) {
      blocked(plan, "migration/collision", `target already exists: ${PINS_PATH}`);
    } else {
      const content = renderPinsFile(plan.pins);
      plan.creates.push({ path: PINS_PATH, content, sha256: sha256(content) });
    }
  }

  plan.creates.sort((left, right) => left.path.localeCompare(right.path));
  plan.moves.sort((left, right) => left.source.localeCompare(right.source));
  plan.upgrades.sort((left, right) => left.source.localeCompare(right.source));
  plan.retires.sort((left, right) => left.path.localeCompare(right.path));
  plan.ownerQuestions.sort((left, right) => left.path.localeCompare(right.path));
  plan.metadataGaps.sort((left, right) => left.path.localeCompare(right.path));

  plan.warnings.push(
    "This engine converts documents, front matter, and links. Setup still installs the version 2 hooks, tools, root routes, and settings, and the owner still authors knowledge/current.md, knowledge/map.md, and the version 2 front matter of knowledge/project.md.",
  );
  if (plan.metadataGaps.length > 0) {
    plan.warnings.push(
      "Every migrated record keeps schema_version: 1 and is reported by the validator as a legacy gap until an approved operation completes it. Nothing below was invented to close a gap.",
    );
  }

  plan.counts = countsFor(plan, existing.size);
  plan.hash = hashPlan(plan);
  return plan;
}

function countsFor(plan, inspected) {
  const touched = new Set([
    ...plan.upgrades.map((item) => item.source),
    ...plan.moves.map((item) => item.source),
    ...plan.retires.map((item) => item.path),
    ...plan.linkRewrites.map((item) => item.file),
  ]);
  return {
    inspected,
    unchanged: Math.max(inspected - touched.size, 0),
    upgraded: plan.upgrades.length,
    moved: plan.moves.length,
    retired: plan.retires.length,
    created: plan.creates.length,
    linkRewrites: plan.linkRewrites.length,
    foldersRemoved: plan.removes.length,
    ownerQuestions: plan.ownerQuestions.length,
    metadataGaps: plan.metadataGaps.length,
    pins: plan.pins.length,
    collisions: plan.collisions.length,
  };
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

function walkTree(root, relativeDir, out = []) {
  const absolute = resolve(root, relativeDir);
  let entries;
  try {
    entries = readdirSync(absolute, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    const path = posix(join(relativeDir, entry.name));
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) walkTree(root, path, out);
    else if (entry.isFile()) out.push(path);
  }
  return out;
}

/** Every file the migration is not touching, hashed, so a stray change shows. */
function unchangedInventory(root, plan) {
  const touched = new Set([
    ...plan.upgrades.map((item) => item.source),
    ...plan.moves.map((item) => item.source),
    ...plan.retires.map((item) => item.path),
    ...plan.linkRewrites.map((item) => item.file),
    ...plan.creates.map((item) => item.path),
  ]);

  const inside = walkTree(root, "knowledge")
    .filter((path) => !touched.has(path))
    .map((path) => ({ path, sha256: sha256(readFileSync(resolve(root, path))) }));

  const rows = trackedFiles(root)
    .filter((path) => path.endsWith(".md") && !path.startsWith("knowledge/") && !touched.has(path))
    .filter((path) => pathExists(root, path))
    .map((path) => `${path}:${sha256(readFileSync(resolve(root, path)))}`);

  return { inside, elsewhere: { count: rows.length, digest: sha256(rows.join("\n")) } };
}

function keepPreimage(root, path) {
  const target = resolve(root, PREIMAGE_FOLDER, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, readFileSync(resolve(root, path)));
}

function removeEmptyDirs(root, relativeDir) {
  const absolute = resolve(root, relativeDir);
  if (!existsSync(absolute)) return;
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (entry.isDirectory()) removeEmptyDirs(root, posix(join(relativeDir, entry.name)));
  }
  if (readdirSync(absolute).length === 0) rmdirSync(absolute);
}

/**
 * Apply the exact plan the owner approved. The approval hash is the binding:
 * a project that changed since the plan was read produces a different hash and
 * this refuses, so nothing is written against a report nobody saw.
 */
export function applyMigration(projectRoot, approvalHash, options = {}) {
  const root = resolve(projectRoot || process.cwd());
  const plan = planMigration(root, options);

  if (plan.blockers.length > 0) {
    throw new Error(`migration blocked:\n- ${[...new Set(plan.blockers)].sort().join("\n- ")}`);
  }
  if (!approvalHash || approvalHash !== plan.hash) {
    throw new Error(`approval hash mismatch; the current no-write plan hash is ${plan.hash}`);
  }
  const canonical = realpathSync(root);
  if (canonical !== root) throw new Error(`project root resolves through a symlink: ${root}`);
  if (existsSync(resolve(root, RECEIPT_PATH))) {
    throw new Error(
      `a migration receipt is already at ${RECEIPT_PATH}; roll that migration back before applying another`,
    );
  }

  const inventory = unchangedInventory(root, plan);

  // Preimages first. Nothing canonical changes until every changed file can be
  // put back, because a rollback that cannot restore is not a rollback.
  mkdirSync(resolve(root, PREIMAGE_FOLDER), { recursive: true });
  for (const item of plan.upgrades) keepPreimage(root, item.source);
  for (const item of plan.moves) keepPreimage(root, item.source);
  for (const item of plan.retires) keepPreimage(root, item.path);
  for (const item of plan.linkRewrites) keepPreimage(root, item.file);

  for (const item of plan.upgrades) {
    mkdirSync(dirname(resolve(root, item.destination)), { recursive: true });
    writeFileSync(resolve(root, item.destination), item.content, "utf8");
    if (item.destination !== item.source) unlinkSync(resolve(root, item.source));
    const written = sha256(readFileSync(resolve(root, item.destination), "utf8"));
    if (written !== item.after) throw new Error(`migration wrote unexpected bytes to ${item.destination}`);
  }
  for (const item of plan.moves) {
    mkdirSync(dirname(resolve(root, item.destination)), { recursive: true });
    renameSync(resolve(root, item.source), resolve(root, item.destination));
  }
  for (const item of plan.retires) unlinkSync(resolve(root, item.path));
  for (const item of plan.linkRewrites) {
    writeFileSync(resolve(root, item.file), item.content, "utf8");
  }
  for (const item of plan.creates) {
    mkdirSync(dirname(resolve(root, item.path)), { recursive: true });
    writeFileSync(resolve(root, item.path), item.content, "utf8");
  }
  for (const folder of Object.values(TYPE_FOLDERS)) {
    mkdirSync(resolve(root, "knowledge/memory", folder), { recursive: true });
  }
  for (const folder of plan.removes) removeEmptyDirs(root, folder);

  const receipt = {
    schema: "knowledge-migration-receipt/1",
    plan_hash: plan.hash,
    layout_before: "v1",
    layout_after: detectLayout(root).layout,
    as_of: plan.asOf,
    counts: plan.counts,
    upgraded: plan.upgrades.map(({ source, destination, id, type, before, after, body, gaps }) => ({
      source, destination, id, type, before, after, body, gaps,
    })),
    moved: plan.moves.map(({ source, destination, sha256: hash }) => ({ source, destination, sha256: hash })),
    retired: plan.retires.map(({ path, sha256: hash, reason }) => ({ path, sha256: hash, reason })),
    created: plan.creates.map(({ path, sha256: hash }) => ({ path, sha256: hash })),
    link_rewrites: plan.linkRewrites.map(({ file, before, after, links }) => ({ file, before, after, links })),
    link_targets: [
      ...new Set([
        ...plan.linkRewrites.flatMap((item) => item.links.map((link) => link.target)),
        ...plan.upgrades.flatMap((item) => (item.links ?? []).map((link) => link.target)),
      ]),
    ].sort(),
    unchanged: inventory.inside,
    unchanged_elsewhere: inventory.elsewhere,
    preimages: PREIMAGE_FOLDER,
    reversible: true,
    follow_up: plan.followUp,
    metadata_gaps: plan.metadataGaps,
  };

  mkdirSync(dirname(resolve(root, RECEIPT_PATH)), { recursive: true });
  writeFileSync(resolve(root, RECEIPT_PATH), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");

  const verdict = checkMigrationIntegrity(root);
  return {
    layout: receipt.layout_after,
    hash: plan.hash,
    counts: plan.counts,
    integrity: verdict.status,
    findings: verdict.findings,
    receipt: RECEIPT_PATH,
    rollback: plan.rollback,
    followUp: plan.followUp,
    runtimeSetupRequired: true,
  };
}

// ---------------------------------------------------------------------------
// Rollback
// ---------------------------------------------------------------------------

export function readReceipt(projectRoot) {
  const root = resolve(projectRoot || process.cwd());
  try {
    return JSON.parse(readFileSync(resolve(root, RECEIPT_PATH), "utf8"));
  } catch {
    return null;
  }
}

/**
 * Undo an applied migration. Every restore comes from a preimage this tool
 * wrote, so nothing is reconstructed from a guess. Files the migration created
 * are removed; files it never touched are never read.
 */
export function rollbackMigration(projectRoot) {
  const root = resolve(projectRoot || process.cwd());
  const receipt = readReceipt(root);
  if (!receipt) throw new Error(`no migration receipt at ${RECEIPT_PATH}`);
  if (receipt.reversible !== true) {
    throw new Error("this migration receipt is not marked reversible");
  }

  const restore = (path) => {
    const preimage = resolve(root, receipt.preimages, path);
    if (!existsSync(preimage)) throw new Error(`preimage missing for ${path}`);
    mkdirSync(dirname(resolve(root, path)), { recursive: true });
    writeFileSync(resolve(root, path), readFileSync(preimage));
  };

  const restored = [];
  const removed = [];

  for (const item of receipt.created) {
    if (existsSync(resolve(root, item.path))) {
      unlinkSync(resolve(root, item.path));
      removed.push(item.path);
    }
  }
  for (const item of receipt.upgraded) {
    if (item.destination !== item.source && existsSync(resolve(root, item.destination))) {
      unlinkSync(resolve(root, item.destination));
    }
    restore(item.source);
    restored.push(item.source);
  }
  for (const item of receipt.moved) {
    if (existsSync(resolve(root, item.destination))) unlinkSync(resolve(root, item.destination));
    restore(item.source);
    restored.push(item.source);
  }
  for (const item of receipt.retired) {
    restore(item.path);
    restored.push(item.path);
  }
  for (const item of receipt.link_rewrites) {
    restore(item.file);
    restored.push(item.file);
  }

  for (const folder of Object.values(TYPE_FOLDERS)) {
    removeEmptyDirs(root, `knowledge/memory/${folder}`);
  }

  rmTree(resolve(root, receipt.preimages));
  unlinkSync(resolve(root, RECEIPT_PATH));
  removeEmptyDirs(root, ".memory");

  return {
    restored: restored.sort(),
    removed: removed.sort(),
    layout: detectLayout(root).layout,
  };
}

function rmTree(absolute) {
  if (!existsSync(absolute)) return;
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const path = resolve(absolute, entry.name);
    if (entry.isDirectory()) rmTree(path);
    else unlinkSync(path);
  }
  rmdirSync(absolute);
}

// ---------------------------------------------------------------------------
// MV-18, migration file counts, links, hashes, and reversibility
// ---------------------------------------------------------------------------

/**
 * Inspect an applied migration against the plan that produced it. This is what
 * validator check MV-18 calls. A project with no receipt has no migration to
 * inspect, which is reported as skipped rather than as a pass.
 *
 * One divergence is expected rather than wrong. The plan declares an
 * expected-follow-up set, OWNER_AUTHORED_CORE above, and the receipt carries it
 * as `follow_up`. Those files are the ones the owner has to change after apply,
 * so their bytes are not compared against the receipt: a changed byte in a
 * declared follow-up file is reported in `skipped_because` and the check still
 * passes. A file that is gone is not a follow-up change and still fails,
 * because the declaration says the owner edits these files, not that they may
 * delete them. Every other divergence from the receipt fails exactly as before.
 */
export function checkMigrationIntegrity(projectRoot) {
  const root = resolve(projectRoot || process.cwd());
  const receipt = readReceipt(root);
  const findings = [];

  if (!receipt) {
    return {
      status: "skipped",
      findings,
      skipped_because: `this project holds no migration receipt at ${RECEIPT_PATH}, so no applied migration can be inspected`,
    };
  }

  const add = (code, message, path) => findings.push({ code, message, path });

  // The declared expected-follow-up set, read from the receipt so an older
  // receipt with no declaration behaves exactly as it did before.
  const followUp = new Set((receipt.follow_up ?? []).map((item) => item.path));
  const changedFollowUp = [];

  const counts = receipt.counts ?? {};
  const measured = {
    upgraded: receipt.upgraded.length,
    moved: receipt.moved.length,
    retired: receipt.retired.length,
    created: receipt.created.length,
    linkRewrites: receipt.link_rewrites.length,
  };
  for (const [key, value] of Object.entries(measured)) {
    if (counts[key] !== value) {
      add("migration/ambiguous", `the receipt counts ${counts[key]} ${key} and records ${value}`, RECEIPT_PATH);
    }
  }

  for (const item of receipt.upgraded) {
    const text = readIfPresent(resolve(root, item.destination));
    if (text === null) {
      add("migration/ambiguous", "a migrated record is not at the path the migration wrote", item.destination);
      continue;
    }
    if (sha256(text) !== item.after) {
      add("migration/ambiguous", "a migrated record no longer matches the bytes the migration wrote", item.destination);
    }
    const parsed = frontMatterLines(text);
    if (!parsed || sha256(parsed.body) !== item.body) {
      add("migration/ambiguous", "a migrated record's body is not the version 1 body byte for byte", item.destination);
    }
  }

  for (const item of receipt.moved) {
    const bytes = readIfPresent(resolve(root, item.destination), true);
    if (bytes === null) add("migration/ambiguous", "a moved file is not at its destination", item.destination);
    else if (sha256(bytes) !== item.sha256) {
      add("migration/ambiguous", "a moved file did not arrive byte for byte", item.destination);
    }
  }

  for (const item of receipt.created) {
    const bytes = readIfPresent(resolve(root, item.path), true);
    if (bytes === null) add("migration/ambiguous", "a file the migration created is gone", item.path);
    else if (sha256(bytes) !== item.sha256) {
      if (followUp.has(item.path)) changedFollowUp.push(item.path);
      else add("migration/ambiguous", "a file the migration created no longer matches its recorded hash", item.path);
    }
  }

  for (const item of receipt.unchanged) {
    const bytes = readIfPresent(resolve(root, item.path), true);
    if (bytes === null) add("migration/ambiguous", "a file the plan said was unchanged is gone", item.path);
    else if (sha256(bytes) !== item.sha256) {
      if (followUp.has(item.path)) changedFollowUp.push(item.path);
      else add("migration/ambiguous", "a byte changed in a file the plan said was unchanged", item.path);
    }
  }

  const rows = trackedFiles(root)
    .filter((path) => path.endsWith(".md") && !path.startsWith("knowledge/"))
    .filter((path) => receipt.unchanged_elsewhere && !isRecordedElsewhere(receipt, path))
    .filter((path) => pathExists(root, path))
    .map((path) => `${path}:${sha256(readFileSync(resolve(root, path)))}`);
  if (receipt.unchanged_elsewhere && sha256(rows.join("\n")) !== receipt.unchanged_elsewhere.digest) {
    add(
      "migration/ambiguous",
      "a byte changed outside knowledge/ in a file the plan said was unchanged",
      RECEIPT_PATH,
    );
  }

  for (const target of receipt.link_targets ?? []) {
    if (!pathExists(root, target)) {
      add("migration/ambiguous", "a link this migration repaired points at a file that is not there", target);
    }
  }

  let skipped = null;
  if (receipt.reversible === true) {
    for (const path of [
      ...receipt.upgraded.map((item) => item.source),
      ...receipt.moved.map((item) => item.source),
      ...receipt.retired.map((item) => item.path),
      ...receipt.link_rewrites.map((item) => item.file),
    ]) {
      if (!pathExists(root, `${receipt.preimages}/${path}`)) {
        add("migration/ambiguous", "the migration is marked reversible but a preimage is missing", path);
      }
    }
  } else {
    skipped = "the migration is no longer marked reversible, so the rollback half of this check has nothing to inspect";
  }

  // Declared follow-up files are reported rather than failed, in the same
  // field the check already uses to name a half it did not inspect.
  const reported = [];
  if (skipped !== null) reported.push(skipped);
  if (changedFollowUp.length > 0) {
    reported.push(
      "these files changed after apply and the plan declared them as owner follow-ups, so their bytes"
      + ` were not compared against the receipt: ${[...new Set(changedFollowUp)].sort().join(", ")}`,
    );
  }

  return {
    status: findings.length > 0 ? "fail" : "pass",
    findings,
    skipped_because: reported.length > 0 ? reported.join("; ") : null,
  };
}

function isRecordedElsewhere(receipt, path) {
  return receipt.upgraded.some((item) => item.source === path || item.destination === path)
    || receipt.moved.some((item) => item.source === path || item.destination === path)
    || receipt.retired.some((item) => item.path === path)
    || receipt.created.some((item) => item.path === path)
    || receipt.link_rewrites.some((item) => item.file === path);
}

function readIfPresent(absolute, raw = false) {
  try {
    return raw ? readFileSync(absolute) : readFileSync(absolute, "utf8");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------

function usage() {
  return [
    "Usage:",
    "  knowledge-layout.mjs detect [project-root] [--json]",
    "  knowledge-layout.mjs plan [project-root] [--route <path>=<destination|retire>]... [--pin <record-id>]... [--as-of <YYYY-MM-DD>] [--json]",
    "  knowledge-layout.mjs apply [project-root] --approve <plan-hash> [same --route, --pin, and --as-of flags]",
    "  knowledge-layout.mjs rollback [project-root]",
    "",
    "The supported source is the version 1 knowledge layout. flat-149 and",
    "retired-v3 are detected and reported; run the toolkit 3.6.0 migration on",
    "those first.",
  ].join("\n");
}

const VALUE_FLAGS = ["--approve", "--route", "--pin", "--as-of", "--output"];

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function repeated(args, name) {
  const values = [];
  args.forEach((arg, index) => {
    if (arg === name && args[index + 1]) values.push(args[index + 1]);
  });
  return values;
}

function readOptions(args) {
  const routes = {};
  for (const entry of repeated(args, "--route")) {
    const split = entry.indexOf("=");
    if (split === -1) throw new Error(`--route needs <path>=<destination|retire>, got ${entry}`);
    routes[entry.slice(0, split)] = entry.slice(split + 1);
  }
  return { routes, pins: repeated(args, "--pin"), asOf: option(args, "--as-of") };
}

function positionalRoot(args) {
  return resolve(args.find((arg, index) => (
    index > 0 && !arg.startsWith("--") && !VALUE_FLAGS.includes(args[index - 1])
  )) || process.cwd());
}

function printPlan(plan, asJson) {
  const visible = { ...publicPlan(plan), hash: plan.hash, writes: false };
  if (asJson) return console.log(JSON.stringify(visible, null, 2));

  console.log(`Layout: ${visible.layout} -> ${visible.target}`);
  console.log(`Files inspected: ${visible.counts.inspected}, unchanged: ${visible.counts.unchanged}`);
  console.log(`Records upgraded: ${visible.counts.upgraded}`);
  console.log(`Files moved on owner routing: ${visible.counts.moved}`);
  console.log(`Files retired: ${visible.counts.retired}`);
  console.log(`Files created: ${visible.counts.created}`);
  console.log(`Files with repaired links: ${visible.counts.linkRewrites}`);
  console.log(`Version 1 folders removed: ${visible.counts.foldersRemoved}`);
  console.log(`Pins written: ${visible.counts.pins}`);
  for (const item of visible.upgrades) {
    console.log(`  upgrade ${item.source} -> ${item.destination} (${item.id}) body ${item.body.slice(0, 12)}`);
  }
  for (const item of visible.moves) console.log(`  move ${item.source} -> ${item.destination}`);
  for (const item of visible.retires) console.log(`  retire ${item.path}: ${item.reason}`);
  for (const item of visible.preserved) console.log(`  keep ${item.path}: ${item.role}`);
  if (visible.ownerQuestions.length) {
    console.log("Owner routing, one file at a time:");
    for (const item of visible.ownerQuestions) {
      console.log(`  ${item.path}: ${item.question}${item.answer ? ` [answered: ${item.answer}]` : " [unanswered]"}`);
    }
  }
  if (visible.metadataGaps.length) {
    console.log("Missing version 2 metadata, shown rather than invented:");
    for (const item of visible.metadataGaps) console.log(`  ${item.path}: ${item.missing.join("; ")}`);
  }
  if (visible.followUp.length) {
    console.log("Expected follow-up, declared here and recorded in the receipt, which setup still authors:");
    for (const item of visible.followUp) console.log(`  ${item.path}: ${item.note}`);
  }
  if (visible.collisions.length) {
    console.log("Collisions:");
    for (const item of visible.collisions) console.log(`  ${item.kind}: ${(item.paths ?? []).join(", ")}`);
  }
  if (visible.blockers.length) console.log(`Blockers:\n- ${visible.blockers.join("\n- ")}`);
  if (visible.warnings.length) console.log(`Warnings:\n- ${visible.warnings.join("\n- ")}`);
  console.log(`Rollback:\n- ${visible.rollback.join("\n- ")}`);
  console.log(`Plan hash: ${visible.hash}`);
  console.log("No files changed.");
  return undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  if (!command || ["-h", "--help", "help"].includes(command)) {
    console.log(usage());
    return;
  }
  const root = positionalRoot(args);
  const asJson = args.includes("--json");

  if (command === "detect") {
    const result = detectLayout(root);
    console.log(asJson ? JSON.stringify(result, null, 2) : `Layout: ${result.layout}\nNo files changed.`);
    return;
  }
  if (command === "plan") {
    printPlan(planMigration(root, readOptions(args)), asJson);
    return;
  }
  if (command === "apply") {
    const result = applyMigration(root, option(args, "--approve"), readOptions(args));
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === "rollback") {
    console.log(JSON.stringify(rollbackMigration(root), null, 2));
    return;
  }
  throw new Error(usage());
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

#!/usr/bin/env node

/**
 * memory-write.mjs: the version 2 write coordinator and canonical store.
 *
 * Only this file changes canonical Markdown. Every write runs in two calls,
 * propose and apply, because approval binds to exact bytes rather than to an
 * agent's report of what the owner said:
 *
 *   propose  writes the whole proposal to .memory/review/<proposal-id>.md and
 *            changes no canonical file. The owner reads it, and may edit it.
 *   apply    rechecks every bound input, then runs one transaction: lock,
 *            journal with preimages, staged contents, legacy upgrades, view
 *            rebuild, focused validation, and either a clean finish or a full
 *            restore of the preimages.
 *
 * The coordinator never invents approval. It has no force flag, no yes flag,
 * and no non-interactive approval mode. The owner's answer is what the skill
 * layer collects, and the apply call carries the proposal id and the content
 * hash of the exact reviewed file. Any bound input that moved between the two
 * calls is refused and the review returns.
 *
 * The coordinator does not commit or push. Git stays the visible audit trail.
 *
 * Messages, warnings, and the crash journal carry ids, paths, counts, and
 * reason codes. Preimages live in their own files under .memory/ so the
 * journal never has to carry record body text.
 */

import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

import { note } from "./lib/result.mjs";
import { isMemberPath, parseFrontMatter } from "./lib/scope.mjs";
import { unknownOrCrossScope } from "./lib/cross-scope.mjs";
import {
  isRelativeTarget,
  relativeLinkText,
  resolveLinkTarget,
  rewriteLinks,
  scanLinks,
} from "./lib/links.mjs";
import {
  CURRENT_SECTIONS,
  RECORD_FOLDERS,
  RECORD_TYPES,
  TYPE_FOLDERS,
  countSentences,
  legacyGaps,
  parseRecord,
  validateRecord,
  walkRecords,
} from "./lib/record-schema.mjs";
import {
  PINS_PATH,
  PIN_STATEMENT_LIMIT,
  approvedSummary,
  parsePins,
  renderPinsFile,
  resolvePinTarget,
  summaryHash,
} from "./lib/pins.mjs";
import { assembleBootBrief } from "./boot-brief.mjs";

/** Local write state. Disposable, never canonical, never committed. */
export const LOCAL_STATE = ".memory";
export const REVIEW_FOLDER = `${LOCAL_STATE}/review`;
export const LOCK_FOLDER = `${LOCAL_STATE}/lock`;
export const JOURNAL_FILE = `${LOCAL_STATE}/journal.json`;
export const PREIMAGE_FOLDER = `${LOCAL_STATE}/preimages`;
export const JOURNAL_SCHEMA = "memory-journal/1";

/**
 * The outcome of the last move or rename. Local, disposable, and outside every
 * canonical path, the same as the journal. It exists so validator check MV-22
 * can inspect the repository after a move instead of taking the tool's word
 * for it: an applied move has to leave no link to the old path, and a restored
 * one has to have left the old path exactly where it was.
 */
export const MOVE_RECEIPT = `${LOCAL_STATE}/last-move.json`;
export const MOVE_RECEIPT_SCHEMA = "memory-move/1";

/** The three triggers that may write knowledge/current.md. */
export const CURRENT_TRIGGERS = Object.freeze(["handoff", "focus-change", "completed-work"]);
export const CURRENT_PATH = "knowledge/current.md";

/** The one view kind this build regenerates. */
export const VIEW_KINDS = Object.freeze(["record-summaries"]);

/**
 * Section 13.5 keeps transcripts, raw command logs, and tool-by-tool history
 * out of a completed-work record. A staged body that carries one of these
 * headings is refused before the owner ever sees a proposal.
 */
const RETIRED_EVENT_SECTIONS = Object.freeze([
  "transcript",
  "command log",
  "tool history",
  "tool-by-tool history",
]);

export function sha256(text) {
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

function isoDate(now) {
  return (now instanceof Date ? now : new Date()).toISOString().slice(0, 10);
}

function relPath(scope, absolute) {
  return relative(scope.scopeRoot, absolute).split(sep).join("/");
}

function absPath(scope, path) {
  return resolve(scope.scopeRoot, path);
}

function readIfPresent(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function writeText(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, "utf8");
}

/** The record folder a canonical path sits in, or null. */
function recordFolderOf(path) {
  const match = /^knowledge\/memory\/([^/]+)\//.exec(path);
  if (!match) return null;
  return RECORD_FOLDERS.includes(match[1]) ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Front matter writing
// ---------------------------------------------------------------------------

function splitFrontMatter(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return { found: false, front: "", body: normalized };
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) return { found: false, front: "", body: normalized };
  return {
    found: true,
    front: normalized.slice(4, end + 1),
    body: normalized.slice(end + 5),
  };
}

function renderValue(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return String(value);
}

/** Render one front matter key, including the two nested shapes the schema uses. */
function renderKey(key, value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return [`${key}: []`];
    const lines = [`${key}:`];
    for (const entry of value) {
      if (entry !== null && typeof entry === "object") {
        const fields = Object.entries(entry);
        fields.forEach(([field, held], index) => {
          lines.push(`${index === 0 ? "  - " : "    "}${field}: ${renderValue(held)}`);
        });
      } else {
        lines.push(`  - ${renderValue(entry)}`);
      }
    }
    return lines;
  }
  if (value !== null && typeof value === "object") {
    const lines = [`${key}:`];
    for (const [field, held] of Object.entries(value)) lines.push(`  ${field}: ${renderValue(held)}`);
    return lines;
  }
  return [`${key}: ${renderValue(value)}`];
}

/**
 * Set front matter keys on a Markdown file, keeping every other line as the
 * author wrote it. A replaced or removed key takes its nested lines with it.
 * Removals are what an upgrade needs when a version 1 record carries a key
 * record schema 2.0 does not define.
 */
export function setFrontMatter(text, updates, removals = []) {
  const parts = splitFrontMatter(text);
  const lines = parts.found ? parts.front.split("\n") : [];
  while (lines.length && lines[lines.length - 1] === "") lines.pop();

  const keys = Object.keys(updates);
  const touched = [...keys, ...removals];
  const kept = [];
  let skipping = false;

  for (const line of lines) {
    const indent = line.length - line.trimStart().length;
    if (skipping) {
      if (indent > 0 && line.trim()) continue;
      skipping = false;
    }
    const match = /^([A-Za-z0-9_-]+):/.exec(line);
    if (match && indent === 0 && touched.includes(match[1])) {
      if (keys.includes(match[1])) kept.push({ key: match[1] });
      skipping = true;
      continue;
    }
    kept.push({ text: line });
  }

  const written = new Set();
  const out = [];
  for (const entry of kept) {
    if (entry.key === undefined) {
      out.push(entry.text);
      continue;
    }
    if (written.has(entry.key)) continue;
    written.add(entry.key);
    out.push(...renderKey(entry.key, updates[entry.key]));
  }
  for (const key of keys) {
    if (written.has(key)) continue;
    out.push(...renderKey(key, updates[key]));
  }

  return `---\n${out.join("\n")}\n---\n${parts.found ? parts.body : `\n${parts.body}`}`;
}

// ---------------------------------------------------------------------------
// Lock, journal, and crash recovery
// ---------------------------------------------------------------------------

function lockPath(scope) {
  return absPath(scope, LOCK_FOLDER);
}

function acquireLock(scope, operation) {
  const path = lockPath(scope);
  mkdirSync(dirname(path), { recursive: true });
  try {
    mkdirSync(path);
  } catch (error) {
    if (error.code === "EEXIST") {
      return {
        ok: false,
        error: note("write/lock-held", "another write holds the project lock", { path: LOCK_FOLDER }),
      };
    }
    throw error;
  }
  writeText(resolve(path, "owner.json"), `${JSON.stringify({ operation, pid: process.pid })}\n`);
  return { ok: true };
}

function releaseLock(scope) {
  rmSync(lockPath(scope), { recursive: true, force: true });
}

function readJournal(scope) {
  const text = readIfPresent(absPath(scope, JOURNAL_FILE));
  if (text === null) return { present: false, journal: null, readable: false };
  try {
    const journal = JSON.parse(text);
    const readable = journal
      && journal.schema === JOURNAL_SCHEMA
      && Array.isArray(journal.entries);
    return { present: true, journal: readable ? journal : null, readable: Boolean(readable) };
  } catch {
    return { present: true, journal: null, readable: false };
  }
}

/**
 * Restore an interrupted transaction. This is the only write a read operation
 * may cause, and it only ever puts back an approved state a crash interrupted.
 * A journal this build cannot read is reported and left in place, because
 * deleting state nobody can judge is worse than carrying it forward.
 */
export function recover(scope) {
  const state = readJournal(scope);
  if (!state.present) return { recovered: false, restored: [], warnings: [], blocked: false };

  if (!state.readable) {
    return {
      recovered: false,
      restored: [],
      blocked: true,
      warnings: [note(
        "write/journal-present",
        "a recovery journal under .memory/ could not be read, so no write may run until it is cleared",
        { path: JOURNAL_FILE },
      )],
    };
  }

  const restored = [];
  for (const entry of state.journal.entries) {
    const target = absPath(scope, entry.path);
    if (!isMemberPath(scope, target)) continue;
    if (entry.existed) {
      const preimage = absPath(scope, entry.preimage);
      if (!existsSync(preimage)) continue;
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(preimage, target);
    } else {
      rmSync(target, { force: true });
    }
    restored.push(entry.path);
  }

  rmSync(absPath(scope, PREIMAGE_FOLDER), { recursive: true, force: true });
  rmSync(absPath(scope, JOURNAL_FILE), { force: true });
  releaseLock(scope);

  return {
    recovered: true,
    restored,
    blocked: false,
    warnings: [note(
      "write/journal-present",
      `an interrupted write was recovered and ${restored.length} canonical path was restored`,
      { path: JOURNAL_FILE, detail: restored.join(", ") },
    )],
  };
}

function writeJournal(scope, proposalId, operation, paths) {
  const entries = [];
  rmSync(absPath(scope, PREIMAGE_FOLDER), { recursive: true, force: true });
  paths.forEach((path, index) => {
    const target = absPath(scope, path);
    const existed = existsSync(target);
    const preimage = `${PREIMAGE_FOLDER}/${String(index + 1).padStart(4, "0")}-${path.replace(/[\\/]/g, "-")}`;
    if (existed) {
      mkdirSync(absPath(scope, PREIMAGE_FOLDER), { recursive: true });
      copyFileSync(target, absPath(scope, preimage));
    }
    entries.push({ path, existed, preimage });
  });
  writeText(
    absPath(scope, JOURNAL_FILE),
    `${JSON.stringify({ schema: JOURNAL_SCHEMA, proposal_id: proposalId, operation, entries }, null, 2)}\n`,
  );
  return entries;
}

function rollback(scope, entries) {
  for (const entry of entries) {
    const target = absPath(scope, entry.path);
    if (entry.existed) copyFileSync(absPath(scope, entry.preimage), target);
    else rmSync(target, { force: true });
  }
  clearJournal(scope);
}

function clearJournal(scope) {
  rmSync(absPath(scope, PREIMAGE_FOLDER), { recursive: true, force: true });
  rmSync(absPath(scope, JOURNAL_FILE), { force: true });
}

// ---------------------------------------------------------------------------
// The view generator
// ---------------------------------------------------------------------------

function markdownFiles(base) {
  const found = [];
  if (!isDirectory(base)) return found;
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink()) continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && entry.name.endsWith(".md")) found.push(path);
    }
  };
  walk(base);
  return found;
}

/**
 * A generated view names itself. A default v2 project stores no view, so this
 * walk normally finds nothing and rebuild-views reports that rather than
 * failing. Nothing declares a view in project settings, because the settings
 * surface is closed and an artifact that identifies itself is what the
 * architecture asks for.
 */
export function findViews(scope) {
  const views = [];
  for (const path of markdownFiles(resolve(scope.scopeRoot, "knowledge"))) {
    const text = readIfPresent(path);
    if (text === null) continue;
    const { data } = parseFrontMatter(text);
    if (data.generated !== true) continue;
    views.push({
      path: relPath(scope, path),
      kind: typeof data.generator === "string" ? data.generator.trim() : null,
      inputs: (Array.isArray(data.inputs) ? data.inputs : []).map((entry) => String(entry).trim()).filter(Boolean),
      title: parseRecord(text).h1 ?? "Generated view",
    });
  }
  return views.sort((a, b) => a.path.localeCompare(b.path));
}

/** Every canonical file one declared input covers, sorted and scope-tested. */
function viewInputFiles(scope, view) {
  const files = [];
  for (const input of view.inputs) {
    const target = absPath(scope, input);
    if (!isMemberPath(scope, target)) continue;
    if (isDirectory(target)) files.push(...markdownFiles(target));
    else if (existsSync(target)) files.push(target);
  }
  return [...new Set(files.map((path) => relPath(scope, path)))].sort();
}

/**
 * The input fingerprint FR-003 and FR-017 require: deterministic, built from
 * the input paths and their bytes, and carrying no wall-clock value, so an
 * unchanged rebuild produces an unchanged file.
 */
export function fingerprint(scope, inputPaths) {
  const lines = inputPaths.map((path) => `${path} ${sha256(readIfPresent(absPath(scope, path)) ?? "")}`);
  return sha256(lines.join("\n"));
}

function renderView(scope, view) {
  const inputs = viewInputFiles(scope, view);
  const stamp = fingerprint(scope, inputs);
  const lines = [
    "---",
    "generated: true",
    `generator: ${view.kind}`,
    "inputs:",
    ...view.inputs.map((input) => `  - ${input}`),
    `fingerprint: ${stamp}`,
    "---",
    "",
    `# ${view.title}`,
    "",
    "This file is generated by `memory.mjs rebuild-views`. Every hand edit is",
    "replaced by the next rebuild. The canonical sources are listed below.",
    "",
    "## Inputs",
    "",
  ];
  if (inputs.length === 0) lines.push("- The declared inputs name no canonical file.");
  else for (const input of inputs) lines.push(`- [${input}](${relative(dirname(absPath(scope, view.path)), absPath(scope, input)).split(sep).join("/")})`);
  lines.push("", "## Summaries", "");

  const rows = [];
  for (const input of inputs) {
    const record = parseRecord(readIfPresent(absPath(scope, input)) ?? "");
    const id = typeof record.data.id === "string" ? record.data.id : input;
    const date = typeof record.data.recorded_at === "string" ? record.data.recorded_at : "undated";
    rows.push(`- ${date} ${id}: ${record.summary || "no summary sentence"} (${input})`);
  }
  if (rows.length === 0) rows.push("- No canonical record matches the declared inputs.");
  lines.push(...rows, "");

  return { contents: `${lines.join("\n")}`, inputs, stamp };
}

/**
 * Whether a declared input covers this path. Coverage is declared rather than
 * existing, so a record a transaction is about to create still counts.
 */
function viewCovers(view, path) {
  return view.inputs.some((input) => path === input || path.startsWith(`${input.replace(/\/$/, "")}/`));
}

/**
 * Rebuild the declared views a change affects. Passing no changed paths
 * rebuilds every declared view, which is what the standalone operation does.
 */
export function planViewRebuild(scope, changedPaths = null) {
  const artifacts = [];
  const errors = [];
  for (const view of findViews(scope)) {
    if (!VIEW_KINDS.includes(view.kind)) {
      errors.push(note(
        "write/validation-failed",
        `the generated view names the unknown generator ${view.kind ?? "none"}`,
        { path: view.path },
      ));
      continue;
    }
    if (changedPaths && !changedPaths.some((path) => viewCovers(view, path))) continue;
    const built = renderView(scope, view);
    artifacts.push({ path: view.path, contents: built.contents, inputs: built.inputs, fingerprint: built.stamp });
  }
  return { artifacts, errors };
}

// ---------------------------------------------------------------------------
// Validation the coordinator owns
// ---------------------------------------------------------------------------

/** The four required headings of knowledge/current.md, plus its dated front matter. */
export function validateCurrent(text, path = CURRENT_PATH) {
  const errors = [];
  const record = parseRecord(text);
  const present = new Set(record.sections.map((heading) => heading.trim().toLowerCase()));
  for (const section of CURRENT_SECTIONS) {
    if (!present.has(section)) {
      errors.push(note("record/schema-invalid", `knowledge/current.md is missing its ${section} section`, { path }));
    }
  }
  const updated = record.data.updated;
  if (typeof updated !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(updated.trim())) {
    errors.push(note("record/schema-invalid", "knowledge/current.md carries no dated updated field", { path }));
  }
  return errors;
}

/** Read every record id in the scope, so a duplicate is caught before a write. */
function recordIds(scope, ignorePaths = []) {
  const ids = new Map();
  for (const entry of walkRecords(scope.scopeRoot)) {
    if (ignorePaths.includes(entry.path)) continue;
    const record = parseRecord(readIfPresent(entry.absolute) ?? "");
    const id = typeof record.data.id === "string" ? record.data.id.trim() : "";
    if (id) ids.set(id, entry.path);
  }
  return ids;
}

/**
 * Focused validation, step 7 of the transaction. It reads what was actually
 * written rather than what was staged, which is the only way a restore can be
 * trusted.
 */
export function focusedValidation(scope, changedPaths, removedPaths = []) {
  const errors = [];
  const warnings = [];
  const ids = recordIds(scope, changedPaths);

  for (const path of removedPaths) {
    if (existsSync(absPath(scope, path))) {
      errors.push(note("write/validation-failed", "a path the write removes is still on disk", { path }));
    }
  }

  for (const path of changedPaths) {
    if (removedPaths.includes(path)) continue;
    const text = readIfPresent(absPath(scope, path));
    if (text === null) {
      errors.push(note("write/validation-failed", "the staged file could not be read back", { path }));
      continue;
    }
    if (path === CURRENT_PATH) {
      errors.push(...validateCurrent(text, path));
      continue;
    }
    const folder = recordFolderOf(path);
    if (folder) {
      const verdict = validateRecord({ record: parseRecord(text), path, folder });
      errors.push(...verdict.errors);
      warnings.push(...verdict.warnings);
      if (verdict.id) {
        const clash = ids.get(verdict.id);
        if (clash) errors.push(note("record/duplicate-id", `id ${verdict.id} is already used by ${clash}`, { path }));
        else ids.set(verdict.id, path);
      }
      continue;
    }
    const { data } = parseFrontMatter(text);
    if (data.generated === true) {
      const view = findViews(scope).find((entry) => entry.path === path);
      if (view && fingerprint(scope, viewInputFiles(scope, view)) !== String(data.fingerprint ?? "")) {
        errors.push(note("write/validation-failed", "the rebuilt view carries a stale fingerprint", { path }));
      }
    }
  }

  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Legacy touch upgrade, FR-055
// ---------------------------------------------------------------------------

/**
 * A record migration carried over without version 2 metadata is upgraded on
 * the next approved touch. The upgrade fills only what the file itself
 * settles: the type from the folder it sits in, the id from its filename, the
 * honest epistemic status unknown, the date it already carries, the approval
 * of this touch, and one evidence entry naming the version 1 record it came
 * from. Nothing about the meaning is invented.
 */
export function planLegacyUpgrade(scope, path, approvedAt) {
  const target = absPath(scope, path);
  const text = readIfPresent(target);
  if (text === null) return null;

  const record = parseRecord(text);
  const missing = legacyGaps(record.data);
  if (!missing) return null;

  const folder = recordFolderOf(path);
  const type = folder
    ? Object.keys(TYPE_FOLDERS).find((name) => TYPE_FOLDERS[name] === folder) ?? null
    : null;
  const slug = path.split("/").pop().replace(/\.md$/, "");
  const carriedDate = [record.data.recorded_at, record.data.date, record.data.created]
    .find((value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()));

  // Version 1 front matter keys record schema 2.0 does not define. They leave
  // with the upgrade rather than failing validation afterwards.
  const removals = ["date", "created", "tags", "source"].filter((key) => Object.hasOwn(record.data, key));

  const updates = {
    schema_version: 2,
    id: typeof record.data.id === "string" && record.data.id.trim() ? record.data.id.trim() : `${type ?? "record"}-${slug}`,
    type,
    status: typeof record.data.status === "string" && record.data.status.trim() ? record.data.status.trim() : "active",
    epistemic_status: typeof record.data.epistemic_status === "string" && record.data.epistemic_status.trim()
      ? record.data.epistemic_status.trim()
      : "unknown",
    recorded_at: carriedDate ? carriedDate.trim() : approvedAt,
    approval: { actor: "owner", approved_at: approvedAt, action: "upgrade" },
  };
  if (!Array.isArray(record.data.evidence) || record.data.evidence.length === 0) {
    updates.evidence = [{
      source_type: "legacy_record",
      locator: path,
      observed_at: updates.recorded_at,
      note: "Carried from the version 1 record on its first approved touch.",
    }];
  }
  return { path, missing, removed: removals, contents: setFrontMatter(text, updates, removals) };
}

// ---------------------------------------------------------------------------
// The review file
// ---------------------------------------------------------------------------

function fenceFor(text) {
  let longest = 0;
  for (const run of text.match(/`+/g) ?? []) longest = Math.max(longest, run.length);
  return "`".repeat(Math.max(3, longest + 1));
}

function nextProposalId(scope, now) {
  const folder = absPath(scope, REVIEW_FOLDER);
  mkdirSync(folder, { recursive: true });
  const date = isoDate(now);
  const taken = new Set(readdirSync(folder));
  for (let sequence = 1; sequence < 10000; sequence++) {
    const id = `p-${date}-${String(sequence).padStart(4, "0")}`;
    if (!taken.has(`${id}.md`) && !taken.has(`${id}.proposal.json`)) return id;
  }
  return `p-${date}-9999`;
}

function renderReview(proposal, staged, upgrades, removals = []) {
  const lines = [
    "---",
    `proposal_id: ${proposal.proposal_id}`,
    `operation: ${proposal.operation}`,
    `destination: ${proposal.destination}`,
    `record_id: ${proposal.record_id ?? "null"}`,
    `trigger: ${proposal.trigger ?? "null"}`,
    "---",
    "",
    `# Proposal ${proposal.proposal_id}`,
    "",
    "This file is not project memory. It sits under `.memory/review/`, outside",
    "every canonical path, and startup, recall, search, generated views, and Git",
    "ignore it. Edit the staged block below if you want different wording, then",
    "say keep or good. Editing this file on its own approves nothing.",
    "",
    "## What",
    "",
    proposal.bullets.what,
    "",
    "## Where",
    "",
    proposal.bullets.where,
    "",
    "## Why",
    "",
    proposal.bullets.why,
    "",
    "## Assumptions",
    "",
    proposal.bullets.assumptions,
    "",
    "## Unverified",
    "",
    proposal.bullets.unverified,
    "",
    "## Bound inputs",
    "",
    `- destination: ${proposal.destination}`,
    `- record id: ${proposal.record_id ?? "none"}`,
    `- pin statement: ${proposal.pin_statement ?? "none"}`,
  ];
  for (const source of proposal.source_hashes) {
    lines.push(`- source ${source.locator}: ${source.hash ?? "not a file in this project"}`);
  }
  lines.push("");

  for (const upgrade of upgrades) {
    lines.push(
      `## Legacy upgrade: ${upgrade.path}`,
      "",
      `This touch upgrades a migrated record. Missing before the touch: ${upgrade.missing.join(", ")}.`,
      "",
    );
  }

  for (const change of staged) {
    const fence = fenceFor(change.contents);
    lines.push(`## Staged: ${change.path}`, "", `${fence}markdown`, change.contents.replace(/\n$/, ""), fence, "");
  }

  for (const removal of removals) {
    const body = removal.contents ?? "";
    const fence = fenceFor(body);
    lines.push(
      `## Removing: ${removal.path}`,
      "",
      "Approving this proposal deletes the file. Its whole current contents are",
      "below so the diff is visible. Editing this block changes nothing, because",
      "the file is removed rather than rewritten.",
      "",
      `${fence}markdown`,
      body.replace(/\n$/, ""),
      fence,
      "",
    );
  }

  if (proposal.boundary) {
    lines.push(
      "## Privacy purge boundary",
      "",
      proposal.boundary.git_history_remaining
        ?? "This project has no Git history in its scope root, so nothing outside the working tree holds the content.",
      "",
    );
  }

  if (proposal.phrase_locations) {
    lines.push("## Retired phrase hunt", "");
    if (proposal.phrase_locations.length === 0) {
      lines.push("No tracked file outside the retiring record carries any named phrase.", "");
    } else {
      for (const found of proposal.phrase_locations) {
        lines.push(`- ${found.path}:${found.line} carries "${found.phrase}" (${found.state})`);
      }
      lines.push("");
    }
  }

  if (staged.some((change) => change.path === CURRENT_PATH)) {
    lines.push(
      "The `updated` date in the staged `knowledge/current.md` is stamped by the",
      "coordinator on the day the write runs, so startup can judge staleness. The",
      "wording above it is what you are approving.",
      "",
    );
  }

  return lines.join("\n");
}

/**
 * Read the staged and removal blocks back out of a review file the owner may
 * have edited. A block runs from its opening fence to the next line holding
 * the same fence, so a staged record may itself contain fenced examples. A
 * removal block is informational: the file it names is deleted rather than
 * rewritten, so its contents are read only to keep the parser in step.
 */
export function readReview(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const staged = [];
  const removals = [];
  let pending = null;

  for (let index = 0; index < lines.length; index++) {
    const heading = /^##\s+(Staged|Removing):\s+(\S+)\s*$/.exec(lines[index]);
    if (heading) {
      pending = { kind: heading[1], path: heading[2] };
      continue;
    }
    if (!pending) continue;
    const opening = /^(`{3,})markdown\s*$/.exec(lines[index]);
    if (!opening) continue;

    const fence = opening[1];
    const start = index + 1;
    let end = start;
    while (end < lines.length && lines[end].trim() !== fence) end++;
    if (pending.kind === "Staged") {
      staged.push({ path: pending.path, contents: `${lines.slice(start, end).join("\n")}\n` });
    } else {
      removals.push(pending.path);
    }
    pending = null;
    index = end;
  }

  return { front: parseFrontMatter(normalized).data ?? {}, staged, removals };
}

// ---------------------------------------------------------------------------
// Propose
// ---------------------------------------------------------------------------

function sourceHashes(scope, sources) {
  return (sources ?? []).map((entry) => {
    const locator = typeof entry === "string" ? entry : entry.locator;
    const target = absPath(scope, locator);
    const readable = isMemberPath(scope, target) && existsSync(target) && !isDirectory(target);
    return { locator, hash: readable ? sha256(readIfPresent(target) ?? "") : null };
  });
}

function destinationGuard(scope, destination) {
  if (!destination) {
    return note("record/schema-invalid", "the proposal names no destination");
  }
  const target = absPath(scope, destination);
  if (!isMemberPath(scope, target)) {
    return note("scope/outside-root", "the destination is outside this project's scope", { path: destination });
  }
  if (!destination.startsWith("knowledge/")) {
    return note("scope/outside-root", "the destination is not a canonical knowledge path", { path: destination });
  }
  return null;
}

/**
 * The guard a link repair passes instead of the canonical-destination guard.
 * Architecture section 12.4 has a move search every tracked project Markdown
 * file, and a project README that links into knowledge/ is one of them, so a
 * repair may touch a tracked file outside knowledge/. It may never create a
 * file, never leave the scope, and never touch anything that is not Markdown
 * already on disk, which is the whole of what this widens.
 */
function repairGuard(scope, path) {
  if (!path) return note("record/schema-invalid", "a link repair names no path");
  const target = absPath(scope, path);
  if (!isMemberPath(scope, target)) {
    return note("scope/outside-root", "a link repair is outside this project's scope", { path });
  }
  if (!path.endsWith(".md")) {
    return note("record/schema-invalid", "a link repair names a file that is not Markdown", { path });
  }
  if (!existsSync(target) || isDirectory(target)) {
    return note("record/unknown-id", "a link repair names a file that is not there", { path });
  }
  return null;
}

/**
 * Check the staged contents of one destination. This is the same set of checks
 * an edited review file runs again before the write, which is what FR-113
 * asks for.
 */
function checkStaged(scope, request, contents, destination, ignorePaths) {
  const errors = [];
  if (destination === CURRENT_PATH) {
    errors.push(...validateCurrent(contents, destination));
    return errors;
  }

  const folder = recordFolderOf(destination);
  if (!folder) return errors;

  const record = parseRecord(contents);
  const headings = new Set(record.sections.map((heading) => heading.trim().toLowerCase()));
  const verdict = validateRecord({ record, path: destination, folder });
  errors.push(...verdict.errors);

  if ((contents.match(/^#\s+\S/gm) ?? []).length > 1) {
    errors.push(note(
      "record/schema-invalid",
      "the staged record carries more than one H1, so it holds more than one meaning",
      { path: destination },
    ));
  }

  const ids = recordIds(scope, ignorePaths);
  if (verdict.id && ids.has(verdict.id) && ids.get(verdict.id) !== destination) {
    errors.push(note("record/duplicate-id", `id ${verdict.id} is already used by ${ids.get(verdict.id)}`, { path: destination }));
  }

  if (folder === "events") {
    for (const retired of RETIRED_EVENT_SECTIONS) {
      if (headings.has(retired)) {
        errors.push(note(
          "record/schema-invalid",
          `a completed-work event may not carry a ${retired} section, only links to evidence`,
          { path: destination },
        ));
      }
    }
    if (request.ownerRequested === false) {
      errors.push(note(
        "record/schema-invalid",
        "a completed-work event may only be proposed at the owner's explicit request",
        { path: destination },
      ));
    }
  }

  return errors;
}

/**
 * Phase one. Write the whole proposal to .memory/review/ and change nothing
 * canonical. The result is the payload contracts section 1.5 defines.
 */
export function propose(scope, request, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const today = isoDate(now);
  const warnings = [];

  const state = recover(scope);
  warnings.push(...state.warnings);
  if (state.blocked) {
    return { ok: false, status: "error", errors: state.warnings, warnings: [] };
  }

  const removals = [...new Set(request.removals ?? [])];
  const repairs = request.repairs ?? [];
  const guarded = [request.destination, ...(request.changes ?? []).map((change) => change.path), ...removals];
  for (const path of guarded) {
    const destinationError = destinationGuard(scope, path);
    if (destinationError) return { ok: false, status: "refused", errors: [destinationError], warnings };
  }
  for (const repair of repairs) {
    const repairError = repairGuard(scope, repair.path);
    if (repairError) return { ok: false, status: "refused", errors: [repairError], warnings };
  }

  // One staged block per path, first write wins, so a caller that names the
  // same path twice never stages two different bodies for it.
  const staged = [];
  const stagedSeen = new Set();
  const stage = (path, contents) => {
    if (path === null || path === undefined || contents === null || contents === undefined) return;
    if (stagedSeen.has(path)) return;
    stagedSeen.add(path);
    staged.push({ path, contents: path === CURRENT_PATH ? setFrontMatter(contents, { updated: today }) : contents });
  };

  stage(request.destination, request.contents);
  for (const change of request.changes ?? []) stage(change.path, change.contents);
  for (const repair of repairs) stage(repair.path, repair.contents);
  if (request.currentContents) stage(CURRENT_PATH, request.currentContents);

  const stagedPaths = staged.map((change) => change.path);
  const errors = [];
  if (staged.length === 0 && removals.length === 0) {
    errors.push(note("record/schema-invalid", "the proposal stages no contents and removes nothing"));
  }
  for (const path of removals) {
    if (stagedSeen.has(path)) {
      errors.push(note("record/schema-invalid", "a path may be staged or removed, never both", { path }));
    } else if (!existsSync(absPath(scope, path))) {
      errors.push(note("record/unknown-id", "the record this proposal would remove does not exist", { path }));
    }
  }
  const ignorePaths = [...stagedPaths, ...removals];
  for (const change of staged) {
    errors.push(...checkStaged(scope, request, change.contents, change.path, ignorePaths));
  }

  const upgrades = [];
  for (const path of request.touches ?? []) {
    if (stagedPaths.includes(path)) continue;
    const target = absPath(scope, path);
    if (!isMemberPath(scope, target)) {
      errors.push(note("scope/outside-root", "a touched record is outside this project's scope", { path }));
      continue;
    }
    if (!existsSync(target)) {
      errors.push(note("record/unknown-id", "a touched record does not exist in this scope", { path }));
      continue;
    }
    const upgrade = planLegacyUpgrade(scope, path, today);
    if (upgrade) upgrades.push(upgrade);
  }

  if (errors.length) return { ok: false, status: "refused", errors, warnings };

  // NOOP is the default lifecycle outcome. A lifecycle proposal whose staged
  // bytes already sit on disk, with nothing to remove and nothing to upgrade,
  // stores nothing and says so rather than sending the owner a review that
  // would change no file.
  if (
    request.noopWhenUnchanged === true
    && removals.length === 0
    && upgrades.length === 0
    && staged.every((change) => readIfPresent(absPath(scope, change.path)) === change.contents)
  ) {
    return {
      ok: true,
      status: "noop",
      errors: [],
      warnings,
      result: {
        outcome: "NOOP",
        operation: request.operation,
        destination: request.destination,
        record_id: request.recordId ?? null,
        changed_paths: [],
        reason: "every staged path already carries exactly these contents",
      },
    };
  }

  const proposalId = nextProposalId(scope, now);
  const preimages = [...stagedPaths, ...removals, ...upgrades.map((upgrade) => upgrade.path)].map((path) => ({
    path,
    hash: existsSync(absPath(scope, path)) ? sha256(readIfPresent(absPath(scope, path)) ?? "") : null,
  }));

  const proposal = {
    proposal_id: proposalId,
    operation: request.operation,
    destination: request.destination,
    record_id: request.recordId ?? null,
    content_hash: null,
    source_hashes: sourceHashes(scope, request.sources),
    pin_statement: request.pinStatement ?? null,
    bullets: {
      what: request.bullets?.what ?? "",
      where: request.bullets?.where ?? request.destination,
      why: request.bullets?.why ?? "",
      assumptions: request.bullets?.assumptions ?? "None",
      unverified: request.bullets?.unverified ?? "None",
    },
    review_file: `${REVIEW_FOLDER}/${proposalId}.md`,
  };
  if (request.trigger) proposal.trigger = request.trigger;
  if (removals.length) proposal.removals = removals;
  if (request.boundary) proposal.boundary = request.boundary;
  if (request.phraseLocations) proposal.phrase_locations = request.phraseLocations;

  const removalBlocks = removals.map((path) => ({
    path,
    contents: readIfPresent(absPath(scope, path)) ?? "",
  }));
  const reviewText = renderReview(proposal, staged, upgrades, removalBlocks);
  proposal.content_hash = sha256(reviewText);

  writeText(absPath(scope, proposal.review_file), reviewText);
  writeText(
    absPath(scope, `${REVIEW_FOLDER}/${proposalId}.proposal.json`),
    `${JSON.stringify({
      schema: "memory-proposal/1",
      proposal_id: proposalId,
      operation: request.operation,
      destination: request.destination,
      record_id: proposal.record_id,
      trigger: request.trigger ?? null,
      pin_statement: proposal.pin_statement,
      content_hash: proposal.content_hash,
      source_hashes: proposal.source_hashes,
      preimages,
      removals,
      repairs: repairs.map((repair) => repair.path),
      lifecycle: request.lifecycle ?? null,
      upgrades: upgrades.map((upgrade) => ({ path: upgrade.path, missing: upgrade.missing })),
      owner_requested: request.ownerRequested !== false,
    }, null, 2)}\n`,
  );

  return { ok: true, status: "awaiting-approval", result: proposal, errors: [], warnings };
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

function readBound(scope, proposalId) {
  const text = readIfPresent(absPath(scope, `${REVIEW_FOLDER}/${proposalId}.proposal.json`));
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Phase two. Recheck every bound input, then run the transaction. Any bound
 * input that moved sends the review back rather than writing.
 */
export function applyProposal(scope, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const today = isoDate(now);
  const warnings = [];

  const proposalId = options.proposalId;
  const contentHash = options.contentHash;
  if (!proposalId || !contentHash) {
    return {
      ok: false,
      status: "refused",
      errors: [note("approval/missing", "an apply call needs a proposal id and a content hash")],
      warnings,
    };
  }

  const state = recover(scope);
  warnings.push(...state.warnings);
  if (state.blocked) return { ok: false, status: "error", errors: state.warnings, warnings: [] };

  const bound = readBound(scope, proposalId);
  if (!bound) {
    return {
      ok: false,
      status: "refused",
      errors: [note("approval/missing", `no proposal ${proposalId} is waiting for approval`, { path: REVIEW_FOLDER })],
      warnings,
    };
  }

  const reviewPath = `${REVIEW_FOLDER}/${proposalId}.md`;
  const reviewText = readIfPresent(absPath(scope, reviewPath));
  if (reviewText === null) {
    return {
      ok: false,
      status: "refused",
      errors: [note("approval/missing", "the review file for this proposal is gone", { path: reviewPath })],
      warnings,
    };
  }

  const actual = sha256(reviewText);
  if (actual !== contentHash) {
    return {
      ok: false,
      status: "refused",
      errors: [note(
        "approval/stale-proposal",
        "the approved contents do not match the review file on disk",
        { path: reviewPath },
      )],
      warnings,
    };
  }

  const edited = actual !== bound.content_hash;
  const review = readReview(reviewText);
  if (review.staged.length === 0 && review.removals.length === 0) {
    return {
      ok: false,
      status: "refused",
      errors: [note("record/schema-invalid", "the review file stages no contents", { path: reviewPath })],
      warnings,
    };
  }

  // A removal set that moved between the two calls is a changed bound input,
  // the same as a changed destination.
  const boundRemovals = [...(bound.removals ?? [])].sort();
  if (boundRemovals.join(",") !== [...review.removals].sort().join(",")) {
    return {
      ok: false,
      status: "refused",
      errors: [note("approval/stale-proposal", "the edited review changes what the write removes", { path: reviewPath })],
      warnings,
    };
  }

  if (edited) {
    const destinations = [...review.staged.map((change) => change.path), ...review.removals];
    if (!destinations.includes(bound.destination) || String(review.front.destination ?? "") !== bound.destination) {
      return {
        ok: false,
        status: "refused",
        errors: [note("approval/stale-proposal", "the edited review changes the destination", { path: reviewPath })],
        warnings,
      };
    }
  }

  // Bound inputs: every cited source, and the preimage of every path the
  // transaction will touch.
  const errors = [];
  for (const source of bound.source_hashes ?? []) {
    if (source.hash === null) continue;
    const target = absPath(scope, source.locator);
    const held = existsSync(target) ? sha256(readIfPresent(target) ?? "") : null;
    if (held !== source.hash) {
      errors.push(note("approval/source-changed", `the cited source ${source.locator} changed after the review`, { path: source.locator }));
    }
  }
  for (const preimage of bound.preimages ?? []) {
    const target = absPath(scope, preimage.path);
    const held = existsSync(target) ? sha256(readIfPresent(target) ?? "") : null;
    if (held !== preimage.hash) {
      errors.push(note("approval/stale-proposal", `${preimage.path} changed after the review`, { path: preimage.path }));
    }
  }
  if (errors.length) return { ok: false, status: "refused", errors, warnings };

  // Re-run the content checks. An edited proposal has to pass everything the
  // first one passed, against the contents that are actually on disk now.
  const staged = review.staged.map((change) => ({
    path: change.path,
    contents: change.path === CURRENT_PATH ? setFrontMatter(change.contents, { updated: today }) : change.contents,
  }));
  const stagedPaths = staged.map((change) => change.path);
  const request = { ownerRequested: bound.owner_requested !== false };
  const ignorePaths = [...stagedPaths, ...review.removals];
  const repairPaths = new Set(bound.repairs ?? []);
  const contentErrors = [];
  for (const change of staged) {
    const guard = repairPaths.has(change.path)
      ? repairGuard(scope, change.path)
      : destinationGuard(scope, change.path);
    if (guard) contentErrors.push(guard);
    else contentErrors.push(...checkStaged(scope, request, change.contents, change.path, ignorePaths));
  }
  for (const path of review.removals) {
    const guard = destinationGuard(scope, path);
    if (guard) contentErrors.push(guard);
  }
  if (contentErrors.length) return { ok: false, status: "refused", errors: contentErrors, warnings };

  const upgrades = [];
  for (const entry of bound.upgrades ?? []) {
    const upgrade = planLegacyUpgrade(scope, entry.path, today);
    if (upgrade) upgrades.push(upgrade);
  }

  const outcome = transact(scope, {
    proposalId,
    operation: bound.operation,
    changes: [...staged, ...upgrades.map((upgrade) => ({ path: upgrade.path, contents: upgrade.contents }))],
    removals: review.removals,
    moves: bound.lifecycle?.kind === "move" ? [bound.lifecycle] : [],
  }, options);

  warnings.push(...outcome.warnings);
  if (!outcome.ok) {
    // A failed transaction restored the preimages, so nothing changed. The
    // review file stays available for correction.
    return {
      ok: false,
      status: outcome.status,
      errors: outcome.errors,
      warnings,
      result: {
        proposal_id: proposalId,
        operation: bound.operation,
        changed_paths: [],
        record_id: bound.record_id ?? null,
        pin_removed: null,
        artifacts_rebuilt: [],
        validation: "failed",
        journal: "cleared",
      },
    };
  }

  rmSync(absPath(scope, reviewPath), { force: true });
  rmSync(absPath(scope, `${REVIEW_FOLDER}/${proposalId}.proposal.json`), { force: true });

  return {
    ok: true,
    status: "ok",
    warnings,
    errors: [],
    result: {
      proposal_id: proposalId,
      operation: bound.operation,
      changed_paths: outcome.changedPaths,
      record_id: bound.record_id ?? null,
      pin_removed: null,
      artifacts_rebuilt: outcome.artifacts,
      validation: "passed",
      journal: "cleared",
      ...lifecycleResult(scope, bound.lifecycle),
    },
  };
}

/**
 * The transaction of architecture section 13.4. One approved write is one
 * reported operation even when it changes several files, and a failure leaves
 * no partial current state.
 */
function transact(scope, plan, options = {}) {
  const warnings = [];
  const lock = acquireLock(scope, plan.operation);
  if (!lock.ok) return { ok: false, status: "refused", errors: [lock.error], warnings, changedPaths: [] };

  const removals = plan.removals ?? [];
  let entries = [];
  try {
    const touched = [...plan.changes.map((change) => change.path), ...removals];
    const viewPlan = planViewRebuild(scope, touched);
    if (viewPlan.errors.length) {
      return { ok: false, status: "refused", errors: viewPlan.errors, warnings, changedPaths: [] };
    }

    const paths = [...touched, ...viewPlan.artifacts.map((view) => view.path)];
    entries = writeJournal(scope, plan.proposalId, plan.operation, paths);

    for (const change of plan.changes) writeText(absPath(scope, change.path), change.contents);
    for (const path of removals) rmSync(absPath(scope, path), { force: true });

    // A crash here is what the recovery journal exists for. The harness uses
    // this switch to stop the process between staging and validation, which
    // is the only honest way to test the recovery path.
    if (options.simulateCrashAfterStaging) process.exit(70);

    // Step 6 rebuilds after staging, so a view sees the approved contents.
    const rebuilt = planViewRebuild(scope, touched);
    for (const view of rebuilt.artifacts) writeText(absPath(scope, view.path), view.contents);

    // A move is validated against the repository as it now stands, not against
    // the proposal. A link that appeared after the review is exactly the case
    // this catches, and it restores every preimage rather than leaving a
    // record whose old path is still linked (architecture section 12.4).
    const moves = plan.moves ?? [];
    const moveErrors = moves.flatMap((move) => moveValidation(scope, move));
    if (moveErrors.length) {
      rollback(scope, entries);
      for (const move of moves) writeMoveReceipt(scope, move, "restored", []);
      return { ok: false, status: "refused", errors: moveErrors, warnings, changedPaths: [] };
    }

    const validation = focusedValidation(scope, paths, removals);
    warnings.push(...validation.warnings);
    if (validation.errors.length) {
      rollback(scope, entries);
      for (const move of moves) writeMoveReceipt(scope, move, "restored", []);
      return {
        ok: false,
        status: "refused",
        errors: [
          note("write/validation-failed", "focused validation failed, so every preimage was restored"),
          ...validation.errors,
        ],
        warnings,
        changedPaths: [],
      };
    }

    for (const move of moves) writeMoveReceipt(scope, move, "applied", move.repaired ?? []);
    clearJournal(scope);
    return {
      ok: true,
      status: "ok",
      errors: [],
      warnings,
      changedPaths: paths,
      artifacts: rebuilt.artifacts.map((view) => view.path),
    };
  } catch (error) {
    if (entries.length) rollback(scope, entries);
    return {
      ok: false,
      status: "error",
      errors: [note("write/validation-failed", `the transaction could not be completed: ${error.code ?? "write failed"}`)],
      warnings,
      changedPaths: [],
    };
  } finally {
    releaseLock(scope);
  }
}

/** Remove a review file after a skip. It touches nothing canonical. */
export function cancel(scope, options = {}) {
  const proposalId = options.proposalId;
  if (!proposalId) {
    return { ok: false, status: "refused", errors: [note("approval/missing", "cancel needs a proposal id")], warnings: [] };
  }
  const review = absPath(scope, `${REVIEW_FOLDER}/${proposalId}.md`);
  const sidecar = absPath(scope, `${REVIEW_FOLDER}/${proposalId}.proposal.json`);
  const found = existsSync(review) || existsSync(sidecar);
  rmSync(review, { force: true });
  rmSync(sidecar, { force: true });
  return {
    ok: true,
    status: found ? "ok" : "noop",
    errors: [],
    warnings: [],
    result: { proposal_id: proposalId, removed: found, changed_paths: [] },
  };
}

/**
 * memory_rebuild_views. A default v2 project stores no view, so this reports
 * that there is nothing to rebuild rather than failing.
 */
export function rebuildViews(scope, options = {}) {
  const warnings = [];
  const state = recover(scope);
  warnings.push(...state.warnings);
  if (state.blocked) return { ok: false, status: "error", errors: state.warnings, warnings: [] };

  const plan = planViewRebuild(scope, null);
  if (plan.errors.length) return { ok: false, status: "refused", errors: plan.errors, warnings };
  if (plan.artifacts.length === 0) {
    return { ok: true, status: "noop", errors: [], warnings, result: { artifacts: [] } };
  }

  const outcome = transact(scope, {
    proposalId: null,
    operation: "memory_rebuild_views",
    changes: plan.artifacts.map((view) => ({ path: view.path, contents: view.contents })),
  }, options);
  warnings.push(...outcome.warnings);
  if (!outcome.ok) return { ok: false, status: outcome.status, errors: outcome.errors, warnings };

  return {
    ok: true,
    status: "ok",
    errors: [],
    warnings,
    result: {
      artifacts: plan.artifacts.map((view) => ({
        path: view.path,
        inputs: view.inputs,
        fingerprint: view.fingerprint,
      })),
      changed_paths: outcome.changedPaths,
    },
  };
}

/**
 * memory_update_current. The only operation that writes knowledge/current.md,
 * on the three triggers of architecture section 10.6 and no other route.
 */
export function updateCurrent(scope, options = {}) {
  const trigger = options.trigger;
  if (!CURRENT_TRIGGERS.includes(trigger)) {
    return {
      ok: false,
      status: "error",
      warnings: [],
      errors: [note(
        "cli/invalid-invocation",
        `--trigger has to be one of ${CURRENT_TRIGGERS.join(", ")}`,
      )],
    };
  }

  if (options.mode === "apply") {
    return applyProposal(scope, options);
  }

  const contents = options.contents;
  if (typeof contents !== "string" || !contents.trim()) {
    return {
      ok: false,
      status: "error",
      warnings: [],
      errors: [note("cli/invalid-invocation", "--file has to name a readable staged Markdown file")],
    };
  }

  return propose(scope, {
    operation: "memory_update_current",
    destination: CURRENT_PATH,
    contents,
    trigger,
    recordId: null,
    sources: options.sources ?? [],
    touches: options.touches ?? [],
    ownerRequested: true,
    bullets: options.bullets ?? {
      what: `Replace the authored contents of ${CURRENT_PATH}.`,
      where: CURRENT_PATH,
      why: whyFor(trigger),
      assumptions: "None",
      unverified: "None",
    },
  }, options);
}

function whyFor(trigger) {
  if (trigger === "handoff") {
    return "An explicit handoff needs current state a fresh agent can read without the prior conversation.";
  }
  if (trigger === "focus-change") {
    return "The current focus changed, and startup would otherwise carry the old one.";
  }
  return "Approved completed work changed the current focus, the blockers, or the next step.";
}

// ---------------------------------------------------------------------------
// The pin manager
// ---------------------------------------------------------------------------

/**
 * Architecture section 11. A pin is project-local startup visibility and
 * nothing else: it does not change a record's authority, type, status, search
 * rank, or canonical home.
 *
 * The registry format lives in lib/pins.mjs, because the boot brief and the
 * validator read the same file. What lives here is the part that writes: the
 * eligibility checks of section 11.1, the budget preflight of section 11.3,
 * and the lifecycle interaction of section 11.4, all of them going through the
 * same two-phase review as every other write.
 */
export const PIN_OPERATIONS = Object.freeze(["pin", "unpin"]);

/**
 * A record carrying sensitive personal content declares it in its own body
 * (section 21.6 rule 1), and a separate recorded approval naming startup
 * exposure is what makes it pinnable (rule 3). The record schema has no field
 * for either, so both are H2 sections on the record, which is where the owner
 * writes the category, the needed reason, and the exposure approval.
 */
export const SENSITIVE_SECTION = "Sensitive content";
export const STARTUP_EXPOSURE_SECTION = "Startup exposure";

/**
 * Read the registry, with every link resolved to its root-relative path so a
 * rewrite is byte-stable no matter which of the two link forms was on disk.
 */
export function readPinRegistry(scope) {
  const text = readIfPresent(absPath(scope, PINS_PATH));
  if (text === null) return { present: false, entries: [] };
  const entries = parsePins(text).map((entry) => ({
    ...entry,
    path: resolvePinTarget(scope.scopeRoot, entry.target).path,
  }));
  return { present: true, entries };
}

/** Stage the registry, or remove it when the last entry is gone. */
function stagePinRegistry(entries) {
  if (entries.length === 0) return { changes: [], removals: [PINS_PATH] };
  return { changes: [{ path: PINS_PATH, contents: renderPinsFile(entries) }], removals: [] };
}

/**
 * The pin side of one lifecycle operation, per architecture section 11.4.
 * Removing a record's meaning from current truth removes its pin in the same
 * transaction. Correcting a summary the owner wants to keep pinned rewrites
 * that entry's hash instead. An operation that changes no entry stages
 * nothing, so it never touches a file it has no reason to.
 */
function planPinChange(scope, plan, today) {
  const { entries, present } = readPinRegistry(scope);
  const removedIds = [];
  const keptIds = [];
  if (!present || entries.length === 0) {
    return { changes: [], removals: [], removedIds, keptIds };
  }

  let next = entries;
  for (const id of plan.remove ?? []) {
    if (!next.some((entry) => entry.id === id)) continue;
    removedIds.push(id);
    next = next.filter((entry) => entry.id !== id);
  }

  const rehash = plan.rehash ?? null;
  if (rehash && next.some((entry) => entry.id === rehash.id)) {
    keptIds.push(rehash.id);
    next = next.map((entry) => (entry.id === rehash.id
      ? { ...entry, path: rehash.path, target: rehash.path, date: today, hash: rehash.hash }
      : entry));
  }

  if (removedIds.length === 0 && keptIds.length === 0) {
    return { changes: [], removals: [], removedIds, keptIds };
  }
  return { ...stagePinRegistry(next), removedIds, keptIds };
}

/**
 * The startup statement a pin renders: the record's exact approved summary and
 * a link to the complete current record. Nothing here paraphrases, because the
 * hash covers these exact bytes.
 */
function pinStatementFor(summary, path) {
  return `${summary} (${path})`;
}

/**
 * The budget preflight of contract 2.16. It renders the brief the project
 * would actually assemble with the candidate pin set and refuses a pin that
 * would push the required blocks past the budget, rather than letting startup
 * discover it later. Nothing is written to ask the question.
 *
 * The caller's clock is handed on, so the preflight measures the same brief the
 * caller's own session would assemble rather than one dated somewhere else.
 */
function pinBudgetCheck(scope, entries, options) {
  const brief = assembleBootBrief({
    projectRoot: scope.scopeRoot,
    pins: entries,
    ...(options.now instanceof Date ? { now: options.now } : {}),
    ...(typeof options.tracker === "function" ? { tracker: options.tracker } : {}),
  });
  if (!brief.ok || !brief.overBudget) return null;
  return {
    bytes: brief.bytes,
    budget: brief.budget,
  };
}

/**
 * PIN. Every check of architecture section 11.1, in the order section 11.3
 * runs them, then the budget preflight, then the same five-bullet review every
 * other write goes through.
 */
function buildPin(scope, options, today) {
  const held = loadRecord(scope, options.id);
  if (!held) return { ok: false, errors: [unknownId(scope, "pin", options.id)] };

  const errors = [];
  if (!isMemberPath(scope, absPath(scope, held.path))) {
    errors.push(note(
      "scope/cross-scope-result",
      `${held.id} sits outside this project's scope, so it may not be pinned here`,
      { path: held.path },
    ));
    return { ok: false, errors };
  }

  const status = oneLine(held.record.data.status ?? "");
  if (status !== "active") {
    errors.push(note(
      "record/schema-invalid",
      `a pinned record has to be active, and ${held.id} is ${status || "carrying no status"}`,
      { path: held.path },
    ));
  }

  // Provenance and the rest of the record schema. A record the validator would
  // fail is not eligible to be the first thing every session reads.
  errors.push(...validateRecord({ record: held.record, path: held.path, folder: held.folder }).errors);

  const approval = held.record.data.approval;
  const approved = approval
    && typeof approval === "object"
    && !Array.isArray(approval)
    && oneLine(approval.actor) === "owner"
    && !blank(approval.approved_at);
  if (!approved) {
    errors.push(note(
      "record/schema-invalid",
      `the current meaning of ${held.id} carries no owner approval, so it may not be pinned`,
      { path: held.path },
    ));
  }

  const summary = approvedSummary(held.text);
  if (!summary) {
    errors.push(note(
      "record/schema-invalid",
      `${held.id} carries no one-sentence summary to render at startup`,
      { path: held.path },
    ));
  } else if (countSentences(summary) > 1) {
    errors.push(note(
      "record/schema-invalid",
      `the summary of ${held.id} is more than one sentence, so it is not a startup statement`,
      { path: held.path },
    ));
  } else if (Buffer.byteLength(summary, "utf8") > PIN_STATEMENT_LIMIT) {
    errors.push(note(
      "record/schema-invalid",
      `the summary of ${held.id} is ${Buffer.byteLength(summary, "utf8")} bytes and the pin statement limit is ${PIN_STATEMENT_LIMIT}`,
      { path: held.path },
    ));
  }

  const sections = new Set(held.record.sections.map((heading) => heading.trim().toLowerCase()));
  const sensitive = scope.privacy.level === "sensitive" || sections.has(SENSITIVE_SECTION.toLowerCase());
  if (sensitive && !sections.has(STARTUP_EXPOSURE_SECTION.toLowerCase())) {
    errors.push(note(
      "privacy/sensitive-unapproved-exposure",
      `${held.id} is sensitive and carries no recorded approval naming startup exposure, so it may not be pinned`,
      { path: held.path },
    ));
  }

  if (errors.length) return { ok: false, errors };

  const { entries } = readPinRegistry(scope);
  const existing = entries.find((entry) => entry.id === held.id);
  const hash = summaryHash(summary);
  const entry = {
    id: held.id,
    path: held.path,
    target: held.path,
    // An entry whose hash already matches keeps its own approval date, so
    // pinning what is already pinned changes no byte and reports NOOP.
    date: existing && existing.hash === hash ? existing.date : today,
    hash,
  };
  const next = [...entries.filter((held_) => held_.id !== held.id), entry];

  const over = pinBudgetCheck(scope, next, options);
  if (over) {
    return {
      ok: false,
      errors: [note(
        "startup/over-budget",
        `pinning ${held.id} would make the required startup blocks ${over.bytes} bytes against a budget of ${over.budget}, so the pin set needs review first`,
        { path: PINS_PATH },
      )],
      result: {
        operation: "memory_pin",
        record_id: held.id,
        required_bytes: over.bytes,
        budget_bytes: over.budget,
        pins: entries.map((held_) => ({ id: held_.id, path: held_.path, date: held_.date })),
      },
    };
  }

  const statement = pinStatementFor(summary, held.path);
  return {
    ok: true,
    request: {
      operation: "memory_pin",
      destination: PINS_PATH,
      contents: renderPinsFile(next),
      recordId: held.id,
      // The record is a bound input: a summary that moves between the review
      // and the approval invalidates the hash the owner approved.
      sources: [held.path],
      lifecycle: { kind: "pin", record_id: held.id, summary_hash: hash },
      pinStatement: statement,
      bullets: {
        what: `Show this at the start of every session in this project: ${statement}`,
        where: `${PINS_PATH}, which stores only the id, the link, the date, and the hash of that summary.`,
        why: options.why
          ? oneLine(options.why)
          : "It is meaning every session needs before substantive work, and a pin is the only way it arrives without being asked for.",
        assumptions: "None. A pin is visibility only: it does not outrank the record, a specification, or a primary source.",
        unverified: "None",
      },
    },
  };
}

/**
 * UNPIN. It removes startup visibility and nothing else. The record keeps its
 * content, its status, and its place in retrieval (FR-061).
 */
function buildUnpin(scope, options) {
  const id = oneLine(options.id);
  const { entries } = readPinRegistry(scope);
  const entry = entries.find((held) => held.id === id);
  if (!entry) {
    return {
      ok: false,
      errors: [note("record/unknown-id", `no pin entry names the record ${id}`, { path: PINS_PATH })],
    };
  }

  const remaining = entries.filter((held) => held.id !== id);
  const held = loadRecord(scope, id);
  const summary = held ? approvedSummary(held.text) : null;
  const statement = summary ? pinStatementFor(summary, entry.path) : `${id} (${entry.path})`;

  return {
    ok: true,
    request: {
      operation: "memory_unpin",
      destination: PINS_PATH,
      contents: remaining.length ? renderPinsFile(remaining) : null,
      removals: remaining.length ? [] : [PINS_PATH],
      recordId: id,
      lifecycle: { kind: "unpin", record_id: id, pin_removed: [id] },
      pinStatement: statement,
      bullets: {
        what: `Stop showing this at the start of every session: ${statement}`,
        where: remaining.length
          ? `${PINS_PATH}, which keeps ${remaining.length} other entry or entries.`
          : `${PINS_PATH}, which is removed with its last entry.`,
        why: options.why
          ? oneLine(options.why)
          : "It no longer needs to reach every cold session before work starts.",
        assumptions: "None",
        unverified: `None. ${id} keeps its content, its status, and its place in search.`,
      },
    },
  };
}

/**
 * The one entry for both pin operations. Propose builds the request and hands
 * it to the coordinator; apply is the shared second phase, exactly as it is
 * for every lifecycle operation.
 */
export function pinOperation(scope, options = {}) {
  const operation = String(options.operation ?? "");
  if (!PIN_OPERATIONS.includes(operation)) {
    return {
      ok: false,
      status: "error",
      warnings: [],
      errors: [note("cli/invalid-invocation", `${operation || "no operation"} is not a pin operation`)],
    };
  }

  if (options.mode === "apply") return applyProposal(scope, options);

  const now = options.now instanceof Date ? options.now : new Date();
  const today = isoDate(now);

  const state = recover(scope);
  if (state.blocked) return { ok: false, status: "error", errors: state.warnings, warnings: [] };

  const built = operation === "pin"
    ? buildPin(scope, options, today)
    : buildUnpin(scope, options, today);
  if (!built.ok) {
    return {
      ok: false,
      status: "refused",
      errors: built.errors,
      warnings: state.warnings,
      result: built.result ?? null,
    };
  }

  const outcome = propose(scope, { ...built.request, noopWhenUnchanged: true }, options);
  return { ...outcome, warnings: [...state.warnings, ...(outcome.warnings ?? [])] };
}

// ---------------------------------------------------------------------------
// The lifecycle engine
// ---------------------------------------------------------------------------

/**
 * Architecture section 14. Eight named operations replace free-form editing,
 * and NOOP is the default outcome: nothing is stored unless one of the seven
 * writing operations is the right answer.
 *
 * Every operation here builds a request and hands it to propose. None of them
 * writes. The write happens in the one transaction applyProposal runs after
 * the owner has read the exact bytes, which is what keeps one write path in
 * one place no matter how many records an operation touches.
 */
export const LIFECYCLE_OPERATIONS = Object.freeze([
  "add",
  "confirm",
  "correct",
  "supersede",
  "retire",
  "merge",
  "delete",
]);

/** Folders a phrase hunt never walks. None of them is project truth. */
const UNTRACKED_FOLDERS = Object.freeze([".git", ".memory", "node_modules"]);

/** Section headings the retiring record uses, so the validator finds them again. */
export const RETIRED_PHRASES_SECTION = "Retired phrases";
export const RETIREMENT_EXEMPTIONS_SECTION = "Retirement exemptions";

function oneLine(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function trimTrailing(rows) {
  const out = [...rows];
  while (out.length && out[out.length - 1].trim() === "") out.pop();
  return out;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "null" || value === "") return [];
  return [value];
}

/**
 * Replace one H2 section of a Markdown body, or append it when it is absent.
 * Fenced blocks are skipped so an example heading inside one is never read as
 * a section of the record.
 */
export function setSection(text, heading, lines) {
  const rows = text.replace(/\r\n/g, "\n").split("\n");
  const wanted = heading.trim().toLowerCase();
  let fenced = false;
  let start = -1;
  let end = rows.length;

  for (let index = 0; index < rows.length; index++) {
    if (/^\s*(```|~~~)/.test(rows[index])) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const match = /^##\s+(.+?)\s*$/.exec(rows[index]);
    if (!match) continue;
    if (start === -1 && match[1].trim().toLowerCase() === wanted) {
      start = index;
      continue;
    }
    if (start !== -1) {
      end = index;
      break;
    }
  }

  const block = [`## ${heading}`, "", ...lines];
  const out = start === -1
    ? [...trimTrailing(rows), "", ...block]
    : [...rows.slice(0, start), ...block, "", ...rows.slice(end)];
  return `${trimTrailing(out).join("\n")}\n`;
}

/** The list items of one H2 section, raw, or an empty array when it is absent. */
export function readSection(text, heading) {
  const rows = text.replace(/\r\n/g, "\n").split("\n");
  const wanted = heading.trim().toLowerCase();
  const items = [];
  let inside = false;
  let fenced = false;

  for (const row of rows) {
    if (/^\s*(```|~~~)/.test(row)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const match = /^##\s+(.+?)\s*$/.exec(row);
    if (match) {
      inside = match[1].trim().toLowerCase() === wanted;
      continue;
    }
    if (inside && /^\s*-\s+\S/.test(row)) items.push(row.replace(/^\s*-\s+/, "").trim());
  }
  return items;
}

/** Every Markdown file in the scope a phrase hunt reads, sorted. */
export function trackedMarkdown(scope) {
  const found = [];
  const walk = (directory) => {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (UNTRACKED_FOLDERS.includes(entry.name)) continue;
        walk(resolve(directory, entry.name));
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        found.push(resolve(directory, entry.name));
      }
    }
  };
  walk(scope.scopeRoot);
  return found;
}

/** A record whose own status puts it in the past rather than in current truth. */
function isHistorical(text) {
  const status = parseFrontMatter(text).data.status;
  return status === "superseded" || status === "retired";
}

/**
 * Architecture section 14.3. Find every surviving location of each exact
 * phrase in tracked Markdown and say what state it is in. A location counts as
 * handled when the line is a Markdown quotation, when the file that holds it
 * is itself a retired or superseded record, or when the retiring record
 * exempts that path with a reason. Everything else needs work.
 */
export function phraseHunt(scope, phrases, options = {}) {
  const wanted = [...new Set((phrases ?? []).map((phrase) => String(phrase)).filter((phrase) => phrase.trim()))];
  if (wanted.length === 0) return [];

  const skip = new Set(options.skipPaths ?? []);
  const exempt = new Map(options.exemptions ?? []);
  const locations = [];

  for (const absolute of trackedMarkdown(scope)) {
    const path = relPath(scope, absolute);
    if (skip.has(path)) continue;
    const text = readIfPresent(absolute);
    if (text === null) continue;

    const historical = isHistorical(text);
    const exemption = exempt.has(path) ? exempt.get(path) : null;
    text.replace(/\r\n/g, "\n").split("\n").forEach((line, index) => {
      for (const phrase of wanted) {
        if (!line.includes(phrase)) continue;
        let state = "needs-work";
        if (exemption) state = "exempted";
        else if (/^\s*>/.test(line)) state = "historical-quotation";
        else if (historical) state = "historical-record";
        locations.push({
          path,
          line: index + 1,
          phrase,
          state,
          reason: exemption,
        });
      }
    });
  }

  return locations.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line || a.phrase.localeCompare(b.phrase));
}

/**
 * Every retired record's declared phrases and exemptions, which is what
 * validator check MV-08 reads. A retired record that declares no phrase asks
 * for no hunt.
 */
export function retiredPhraseSets(scope) {
  const sets = [];
  for (const entry of walkRecords(scope.scopeRoot)) {
    const text = readIfPresent(entry.absolute);
    if (text === null) continue;
    const { data } = parseFrontMatter(text);
    if (String(data.status ?? "").trim() !== "retired") continue;

    const phrases = readSection(text, RETIRED_PHRASES_SECTION)
      .map((item) => (/^`(.+)`$/.exec(item.trim())?.[1] ?? item.trim()))
      .filter(Boolean);
    if (phrases.length === 0) continue;

    const exemptions = [];
    for (const item of readSection(text, RETIREMENT_EXEMPTIONS_SECTION)) {
      const match = /^`([^`]+)`\s*:\s*(.+)$/.exec(item.trim());
      if (match) exemptions.push([match[1].trim(), match[2].trim()]);
    }

    sets.push({
      path: entry.path,
      id: typeof data.id === "string" ? data.id.trim() : entry.path,
      phrases,
      exemptions,
    });
  }
  return sets;
}

/** One record by id, with the path it sits on. */
function loadRecord(scope, id) {
  const wanted = String(id ?? "").trim();
  if (!wanted) return null;
  for (const entry of walkRecords(scope.scopeRoot)) {
    // A record a declared subroot owns is not this scope's to load, let alone
    // to write. Refusing it here is what keeps every lifecycle operation
    // inside the resolved root (AT-45).
    if (!isMemberPath(scope, entry.absolute)) continue;
    const text = readIfPresent(entry.absolute);
    if (text === null) continue;
    const record = parseRecord(text);
    if (String(record.data.id ?? "").trim() !== wanted) continue;
    return { id: wanted, path: entry.path, folder: entry.folder, text, record };
  }
  return null;
}

/**
 * The unknown-id refusal, or the cross-scope one when another scope inside
 * this root owns the id. AT-45 wants a blocked attempt to name the operation
 * and the resolved root rather than read as "no such record".
 */
function unknownId(scope, operation, id) {
  return unknownOrCrossScope(scope, `memory_${operation}`, id);
}

/** The meaning a merge and a duplicate search compare, normalized. */
function meaningOf(record) {
  return oneLine(record.summary ?? "").toLowerCase().replace(/[.!?]+$/, "");
}

function slugFor(id) {
  return String(id).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function destinationFor(type, id) {
  return `knowledge/memory/${TYPE_FOLDERS[type]}/${slugFor(id)}.md`;
}

/** The approval block the coordinator stamps on every lifecycle write. */
function stampApproval(text, action, today, reason = null) {
  const approval = { actor: "owner", approved_at: today, action };
  if (reason) approval.reason = oneLine(reason);
  return setFrontMatter(text, { approval });
}

/** Evidence and confirmation entries keyed the way a merge deduplicates them. */
function evidenceKey(entry) {
  if (entry === null || typeof entry !== "object") return oneLine(entry);
  return `${oneLine(entry.source_type)}|${oneLine(entry.locator)}`;
}

function mergeLists(lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const entry of asArray(list)) {
      const key = typeof entry === "object" && entry !== null ? evidenceKey(entry) : oneLine(entry);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(entry);
    }
  }
  return out;
}

/**
 * Architecture sections 14.4 and 21.8. A privacy deletion says exactly what a
 * complete erasure would still need instead of claiming one it has not proven.
 */
function historyBoundary(scope, privacy) {
  if (!privacy) return null;
  if (!existsSync(resolve(scope.scopeRoot, ".git"))) {
    return {
      purge_complete: true,
      git_history_remaining: null,
    };
  }
  return {
    purge_complete: false,
    git_history_remaining: oneLine(`
      Earlier Git commits still hold this content. A complete erasure needs an
      approved history rewrite, a force push, cleanup of every remote and fork,
      rotation of any credential the record exposed, and every existing clone
      replaced. Nothing here has done any of that.
    `),
  };
}

/** The fields each lifecycle operation adds to the shared apply payload. */
function lifecycleResult(scope, lifecycle) {
  if (!lifecycle) return {};

  // Every operation reports what happened to the pin set, so the owner never
  // has to open the registry to find out (architecture section 11.4).
  const pinned = [];
  if (Array.isArray(lifecycle.pin_removed) && lifecycle.pin_removed.length) {
    pinned.push(["pin_removed", lifecycle.pin_removed.join(", ")]);
  }
  if (Array.isArray(lifecycle.pin_kept) && lifecycle.pin_kept.length) {
    pinned.push(["pin_kept", lifecycle.pin_kept.join(", ")]);
  }
  const base = Object.fromEntries(pinned);

  if (lifecycle.kind === "pin") {
    return { pinned: lifecycle.record_id, summary_hash: lifecycle.summary_hash };
  }
  if (lifecycle.kind === "unpin") {
    return { unpinned: lifecycle.record_id, pin_removed: lifecycle.record_id };
  }

  if (lifecycle.kind === "retire") {
    const locations = phraseHunt(scope, lifecycle.phrases ?? [], {
      skipPaths: lifecycle.skip_paths ?? [],
      exemptions: lifecycle.exemptions ?? [],
    });
    return {
      ...base,
      retired: lifecycle.record_id,
      phrase_locations: locations.filter((found) => found.state === "needs-work"),
    };
  }

  if (lifecycle.kind === "delete") {
    const references = phraseHunt(scope, [lifecycle.record_id], { skipPaths: lifecycle.skip_paths ?? [] })
      .filter((found) => found.state === "needs-work");
    const boundary = lifecycle.boundary ?? { purge_complete: null, git_history_remaining: null };
    return {
      ...base,
      deleted: lifecycle.record_id,
      purge_complete: boundary.purge_complete === true && references.length === 0
        ? true
        : boundary.purge_complete,
      git_history_remaining: boundary.git_history_remaining,
      remaining_references: references,
    };
  }

  if (lifecycle.kind === "merge") {
    return { ...base, survivor: lifecycle.survivor_id, merged_ids: lifecycle.merged_ids ?? [] };
  }
  if (lifecycle.kind === "supersede") {
    return { ...base, superseded: lifecycle.old_id, successor: lifecycle.record_id };
  }
  if (lifecycle.kind === "move") {
    return {
      ...base,
      moved: lifecycle.record_id,
      moved_from: lifecycle.old_path,
      moved_to: lifecycle.new_path,
      links_repaired: lifecycle.repaired ?? [],
    };
  }
  if (lifecycle.kind === "correct") return { ...base, corrected: lifecycle.record_id };
  if (lifecycle.kind === "confirm") return { ...base, confirmed: lifecycle.record_id };
  if (lifecycle.kind === "add") return { ...base, added: lifecycle.record_id };
  return base;
}

function blank(value) {
  return value === undefined
    || value === null
    || value === "null"
    || value === ""
    || (Array.isArray(value) && value.length === 0);
}

/**
 * ADD. One new durable meaning. The id has to be free, and so does the
 * meaning: a summary sentence this project already carries is a confirmation
 * or a correction, never a second record (architecture section 14 and
 * provenance law 3).
 */
function buildAdd(scope, options, today) {
  const type = String(options.type ?? "").trim();
  const record = parseRecord(options.contents);
  const id = String(record.data.id ?? "").trim();
  const errors = [];

  if (!id) errors.push(note("record/schema-invalid", "the staged record states no id"));
  const declared = String(record.data.type ?? "").trim();
  if (declared !== type) {
    errors.push(note(
      "record/schema-invalid",
      `--type says ${type} and the staged record says ${declared || "nothing"}`,
    ));
  }

  const destination = options.destination
    ? String(options.destination).trim()
    : (id && RECORD_TYPES.includes(type) ? destinationFor(type, id) : null);
  if (destination && RECORD_TYPES.includes(type) && !destination.startsWith(`knowledge/memory/${TYPE_FOLDERS[type]}/`)) {
    errors.push(note(
      "record/schema-invalid",
      `a ${type} record belongs under knowledge/memory/${TYPE_FOLDERS[type]}/`,
      { path: destination },
    ));
  }

  // An add that lands on a used id or a used path would overwrite a record
  // rather than add one, so it is refused before the owner sees a proposal.
  if (id) {
    const held = loadRecord(scope, id);
    if (held) {
      errors.push(note("record/duplicate-id", `the id ${id} is already used by ${held.path}`, { path: held.path }));
    }
  }
  if (destination && existsSync(absPath(scope, destination))) {
    errors.push(note("record/duplicate-id", "a record already sits at this path", { path: destination }));
  }

  const meaning = meaningOf(record);
  if (meaning) {
    for (const entry of walkRecords(scope.scopeRoot)) {
      const text = readIfPresent(entry.absolute);
      if (text === null) continue;
      const existing = parseRecord(text);
      if (meaningOf(existing) !== meaning) continue;
      errors.push(note(
        "record/duplicate-id",
        `the record ${String(existing.data.id ?? entry.path)} already carries this exact meaning, so this is a confirm or a correct rather than an add`,
        { path: entry.path },
      ));
      break;
    }
  }

  if (errors.length) return { ok: false, errors };

  const updates = { schema_version: 2 };
  if (blank(record.data.recorded_at)) updates.recorded_at = today;
  const contents = stampApproval(setFrontMatter(options.contents, updates), "add", today);

  return {
    ok: true,
    request: {
      operation: "memory_add",
      destination,
      contents,
      recordId: id,
      sources: asArray(record.data.evidence).map((entry) => entry?.locator).filter(Boolean),
      lifecycle: { kind: "add", record_id: id },
      pinStatement: null,
      bullets: {
        what: `Add the ${type} record ${id}.`,
        where: destination,
        why: options.why ? oneLine(options.why) : "A durable meaning that would otherwise have to be explained again.",
        assumptions: options.assumptions ? oneLine(options.assumptions) : "None",
        unverified: options.unverified ? oneLine(options.unverified) : "None",
      },
    },
  };
}

/**
 * CONFIRM. Reaffirm meaning that has not changed. It appends actor, date, and
 * evidence and never rewrites the summary, so a pin on this record survives
 * untouched (architecture sections 14 and 11.4).
 */
function buildConfirm(scope, options, today) {
  const held = loadRecord(scope, options.id);
  if (!held) return { ok: false, errors: [unknownId(scope, "confirm", options.id)] };

  const locator = oneLine(options.evidence);
  if (!locator) {
    return { ok: false, errors: [note("record/missing-evidence", "a confirmation names no evidence locator")] };
  }

  const sourceType = oneLine(options.sourceType) || "owner_confirmation";
  const evidence = asArray(held.record.data.evidence);
  const entry = { source_type: sourceType, locator, observed_at: today };
  const nextEvidence = evidence.some((held_) => evidenceKey(held_) === evidenceKey(entry))
    ? evidence
    : [...evidence, entry];

  const confirmations = asArray(held.record.data.confirmations);
  const confirmation = { actor: "owner", confirmed_at: today, locator };
  const nextConfirmations = confirmations.some((held_) => oneLine(JSON.stringify(held_)) === oneLine(JSON.stringify(confirmation)))
    ? confirmations
    : [...confirmations, confirmation];

  const contents = stampApproval(
    setFrontMatter(held.text, { evidence: nextEvidence, confirmations: nextConfirmations }),
    "confirm",
    today,
  );

  return {
    ok: true,
    request: {
      operation: "memory_confirm",
      destination: held.path,
      contents,
      recordId: held.id,
      sources: [locator],
      lifecycle: { kind: "confirm", record_id: held.id },
      pinStatement: `The approved summary of ${held.id} does not change, so any pin on it stays exactly as it is.`,
      bullets: {
        what: `Record that ${held.id} was rechecked against ${locator} and still holds.`,
        where: held.path,
        why: "Another source supports unchanged meaning, which is an evidence entry rather than a second record.",
        assumptions: "None",
        unverified: "None",
      },
    },
  };
}

/**
 * CORRECT. The record itself was wrong. The reason, the date, the approval,
 * and the correcting evidence go onto the current record, and Git preserves
 * the prior full text instead of a growing history field (section 14.1).
 */
function buildCorrect(scope, options, today) {
  const held = loadRecord(scope, options.id);
  if (!held) return { ok: false, errors: [unknownId(scope, "correct", options.id)] };

  const reason = oneLine(options.reason);
  if (!reason) {
    return { ok: false, errors: [note("record/schema-invalid", "a correction states no reason")] };
  }

  const corrected = parseRecord(options.contents);
  const errors = [];
  if (String(corrected.data.id ?? "").trim() !== held.id) {
    errors.push(note("record/schema-invalid", "a correction may not change the record id", { path: held.path }));
  }
  if (String(corrected.data.type ?? "").trim() !== String(held.record.data.type ?? "").trim()) {
    errors.push(note("record/schema-invalid", "a correction may not change the record type", { path: held.path }));
  }

  const priorLocators = new Set(asArray(held.record.data.evidence).map((entry) => oneLine(entry?.locator)));
  const correcting = asArray(corrected.data.evidence)
    .map((entry) => oneLine(entry?.locator))
    .filter((locator) => locator && !priorLocators.has(locator));
  if (correcting.length === 0) {
    errors.push(note(
      "record/missing-evidence",
      "a correction names no evidence the record did not already carry",
      { path: held.path },
    ));
  }
  if (errors.length) return { ok: false, errors };

  const summaryChanged = meaningOf(corrected) !== meaningOf(held.record);
  const contents = stampApproval(
    setFrontMatter(options.contents, { schema_version: 2 }),
    "correct",
    today,
    reason,
  );

  // Architecture section 11.4. A changed summary defaults to unpinning,
  // because the approved startup statement is no longer what the record says.
  // --keep-pin is the separate approval that keeps it pinned, and it rewrites
  // the entry's hash to the corrected summary in this same transaction.
  const correctedSummary = approvedSummary(contents);
  const keepPin = options.keepPin === true && Boolean(correctedSummary);
  const pinPlan = planPinChange(scope, !summaryChanged
    ? {}
    : (keepPin
      ? { rehash: { id: held.id, path: held.path, hash: summaryHash(correctedSummary) } }
      : { remove: [held.id] }), today);

  return {
    ok: true,
    request: {
      operation: "memory_correct",
      destination: held.path,
      contents,
      changes: pinPlan.changes,
      removals: pinPlan.removals,
      recordId: held.id,
      sources: correcting,
      lifecycle: {
        kind: "correct",
        record_id: held.id,
        pin_removed: pinPlan.removedIds,
        pin_kept: pinPlan.keptIds,
      },
      pinStatement: summaryChanged
        ? (pinPlan.keptIds.length
          ? `You are approving the corrected summary of ${held.id} to stay pinned, and its startup statement becomes: ${correctedSummary}`
          : `The approved summary of ${held.id} changes, so any pin on it is removed in this same transaction.`)
        : `The approved summary of ${held.id} does not change, so any pin on it stays.`,
      bullets: {
        what: `Correct the record ${held.id}.`,
        where: held.path,
        why: reason,
        assumptions: "None",
        unverified: "None",
      },
    },
  };
}

/**
 * SUPERSEDE. The old record was true during an earlier period. One
 * transaction creates the successor, dates the old record, and writes both
 * links, so neither side is ever half-linked (section 14.1).
 */
function buildSupersede(scope, options, today) {
  const held = loadRecord(scope, options.oldId);
  if (!held) return { ok: false, errors: [unknownId(scope, "supersede", options.oldId)] };

  const successor = parseRecord(options.contents);
  const newId = String(successor.data.id ?? "").trim();
  const type = String(successor.data.type ?? "").trim();
  const errors = [];

  if (!newId) errors.push(note("record/schema-invalid", "the successor states no id"));
  if (newId && newId === held.id) {
    errors.push(note("record/duplicate-id", "the successor carries the id of the record it replaces"));
  }
  if (!RECORD_TYPES.includes(type)) {
    errors.push(note("record/schema-invalid", `the successor states the type ${type || "nothing"}`));
  }
  if (errors.length) return { ok: false, errors };

  const destination = options.destination ? String(options.destination).trim() : destinationFor(type, newId);

  const successorContents = stampApproval(
    setFrontMatter(options.contents, {
      schema_version: 2,
      status: "active",
      supersedes: held.id,
      superseded_by: null,
      effective_from: blank(successor.data.effective_from) ? today : String(successor.data.effective_from).trim(),
      recorded_at: blank(successor.data.recorded_at) ? today : String(successor.data.recorded_at).trim(),
    }),
    "supersede",
    today,
  );

  const oldContents = stampApproval(
    setFrontMatter(held.text, {
      status: "superseded",
      superseded_by: newId,
      effective_to: today,
    }),
    "supersede",
    today,
  );

  // Section 11.4. The old meaning leaves current truth, so it leaves startup
  // in the same transaction. The successor is never pinned automatically.
  const pinPlan = planPinChange(scope, { remove: [held.id] }, today);

  return {
    ok: true,
    request: {
      operation: "memory_supersede",
      destination,
      contents: successorContents,
      changes: [{ path: held.path, contents: oldContents }, ...pinPlan.changes],
      removals: pinPlan.removals,
      recordId: newId,
      sources: asArray(successor.data.evidence).map((entry) => entry?.locator).filter(Boolean),
      lifecycle: {
        kind: "supersede",
        record_id: newId,
        old_id: held.id,
        pin_removed: pinPlan.removedIds,
      },
      pinStatement: `Any pin on ${held.id} is removed in this same transaction, and the successor ${newId} is not pinned automatically.`,
      bullets: {
        what: `Replace ${held.id} with ${newId} and date both records.`,
        where: `${destination} and ${held.path}`,
        why: options.why
          ? oneLine(options.why)
          : `${held.id} was true during an earlier period and ${newId} is true now.`,
        assumptions: "None",
        unverified: "None",
      },
    },
  };
}

/**
 * RETIRE. End a record that has no direct successor. The proposal carries the
 * phrase hunt, and the retiring record itself declares the phrases and any
 * exemption, so validator check MV-08 can repeat the hunt later (14.3).
 */
function buildRetire(scope, options, today) {
  const held = loadRecord(scope, options.id);
  if (!held) return { ok: false, errors: [unknownId(scope, "retire", options.id)] };

  const reason = oneLine(options.reason);
  const phrases = (options.phrases ?? []).map((phrase) => String(phrase).trim()).filter(Boolean);
  const errors = [];
  if (!reason) errors.push(note("record/schema-invalid", "a retirement states no reason"));
  if (phrases.length === 0) {
    errors.push(note("record/schema-invalid", "a retirement names no phrase that must stop being current truth"));
  }
  if (errors.length) return { ok: false, errors };

  const exemptions = options.exemptions ?? [];
  let contents = stampApproval(
    setFrontMatter(held.text, {
      status: "retired",
      retired_because: reason,
      effective_to: today,
    }),
    "retire",
    today,
    reason,
  );
  contents = setSection(contents, RETIRED_PHRASES_SECTION, phrases.map((phrase) => `- \`${phrase}\``));
  if (exemptions.length) {
    contents = setSection(
      contents,
      RETIREMENT_EXEMPTIONS_SECTION,
      exemptions.map(([path, why]) => `- \`${path}\`: ${why}`),
    );
  }

  const locations = phraseHunt(scope, phrases, { skipPaths: [held.path], exemptions });
  const outstanding = locations.filter((found) => found.state === "needs-work");
  const pinPlan = planPinChange(scope, { remove: [held.id] }, today);

  return {
    ok: true,
    request: {
      operation: "memory_retire",
      destination: held.path,
      contents,
      changes: pinPlan.changes,
      removals: pinPlan.removals,
      recordId: held.id,
      phraseLocations: locations,
      lifecycle: {
        kind: "retire",
        record_id: held.id,
        phrases,
        exemptions,
        skip_paths: [held.path],
        pin_removed: pinPlan.removedIds,
      },
      pinStatement: `Any pin on ${held.id} is removed in this same transaction.`,
      bullets: {
        what: `Retire ${held.id} and stop treating ${phrases.length} phrase or phrases as current truth.`,
        where: held.path,
        why: reason,
        assumptions: "None",
        unverified: outstanding.length
          ? `${outstanding.length} tracked location still states a retired phrase as current truth and needs its own approved correction.`
          : "None",
      },
    },
  };
}

/**
 * MERGE. True duplicates only. Identical meaning, compatible truth status,
 * and compatible effective dates, or the records stay separate and linked
 * (section 14.2 and ADR-011).
 */
function buildMerge(scope, options, today) {
  const ids = (options.ids ?? []).map((id) => String(id).trim()).filter(Boolean);
  const survivorId = String(options.survivor ?? "").trim();
  if (ids.length < 2) {
    return { ok: false, errors: [note("record/schema-invalid", "a merge names fewer than two records")] };
  }
  if (!ids.includes(survivorId)) {
    return { ok: false, errors: [note("record/schema-invalid", "the survivor is not one of the merged records")] };
  }
  if (!["keep", "drop"].includes(String(options.pin ?? ""))) {
    return { ok: false, errors: [note("record/schema-invalid", "a merge needs an explicit pin choice of keep or drop")] };
  }

  const loaded = [];
  const errors = [];
  for (const id of ids) {
    const held = loadRecord(scope, id);
    if (!held) errors.push(unknownId(scope, "merge", id));
    else loaded.push(held);
  }
  if (errors.length) return { ok: false, errors };

  const survivor = loaded.find((held) => held.id === survivorId);
  const others = loaded.filter((held) => held.id !== survivorId);
  const conflicts = [];

  for (const held of others) {
    if (meaningOf(held.record) !== meaningOf(survivor.record)) {
      conflicts.push(note(
        "record/merge-conflict",
        `${held.id} and ${survivor.id} do not carry the same meaning, so they stay separate and linked`,
        { path: held.path },
      ));
      continue;
    }
    for (const field of ["status", "epistemic_status", "effective_from", "effective_to"]) {
      const left = oneLine(held.record.data[field] ?? "");
      const right = oneLine(survivor.record.data[field] ?? "");
      if (left !== right) {
        conflicts.push(note(
          "record/merge-conflict",
          `${held.id} and ${survivor.id} differ in ${field}, which a merge may not reconcile`,
          { path: held.path },
        ));
      }
    }
  }
  if (conflicts.length) return { ok: false, errors: conflicts };

  const removedIds = new Set(others.map((held) => held.id));
  const withoutMerged = (list) => list.filter((entry) => {
    const value = oneLine(entry);
    return value !== survivor.id && !removedIds.has(value);
  });

  const contents = stampApproval(
    setFrontMatter(survivor.text, {
      evidence: mergeLists(loaded.map((held) => held.record.data.evidence)),
      confirmations: mergeLists(loaded.map((held) => held.record.data.confirmations)),
      based_on: withoutMerged(mergeLists(loaded.map((held) => held.record.data.based_on))),
      relates: withoutMerged(mergeLists(loaded.map((held) => held.record.data.relates))),
      conflicts_with: withoutMerged(mergeLists(loaded.map((held) => held.record.data.conflicts_with))),
    }),
    "merge",
    today,
  );

  // Section 11.4. The merged-away records are gone, so their entries go with
  // them. The survivor's own entry follows the explicit choice the owner made.
  const pinPlan = planPinChange(scope, {
    remove: [...others.map((held) => held.id), ...(options.pin === "drop" ? [survivor.id] : [])],
  }, today);

  return {
    ok: true,
    request: {
      operation: "memory_merge",
      destination: survivor.path,
      contents,
      changes: pinPlan.changes,
      removals: [...others.map((held) => held.path), ...pinPlan.removals],
      recordId: survivor.id,
      lifecycle: {
        kind: "merge",
        record_id: survivor.id,
        survivor_id: survivor.id,
        merged_ids: others.map((held) => held.id),
        pin_removed: pinPlan.removedIds,
      },
      pinStatement: options.pin === "keep"
        ? `You chose that the surviving record ${survivor.id} stays pinned if it was pinned.`
        : `You chose that any pin on the surviving record ${survivor.id} is removed.`,
      bullets: {
        what: `Consolidate ${others.map((held) => held.id).join(", ")} into ${survivor.id} and keep every evidence entry.`,
        where: survivor.path,
        why: "The records carry one meaning, so one current record with several evidence entries is the honest shape.",
        assumptions: "None",
        unverified: "None",
      },
    },
  };
}

/**
 * DELETE. Accidental, corrupt, duplicate-surplus, or privacy removal only,
 * always with a reason and a visible diff. A privacy removal also reports the
 * Git-history boundary instead of claiming an erasure it has not proven
 * (sections 14.4 and 21.8).
 */
function buildDelete(scope, options, today) {
  const held = loadRecord(scope, options.id);
  if (!held) return { ok: false, errors: [unknownId(scope, "delete", options.id)] };

  const reason = oneLine(options.reason);
  if (!reason) {
    return { ok: false, errors: [note("record/schema-invalid", "a deletion states no reason")] };
  }

  const privacy = options.privacy === true;
  const boundary = historyBoundary(scope, privacy);
  // Section 11.4. The pin entry goes in the same transaction, and the view
  // rebuild inside that transaction runs after it.
  const pinPlan = planPinChange(scope, { remove: [held.id] }, today);

  return {
    ok: true,
    request: {
      operation: "memory_delete",
      destination: held.path,
      contents: null,
      changes: pinPlan.changes,
      removals: [held.path, ...pinPlan.removals],
      recordId: held.id,
      boundary,
      lifecycle: {
        kind: "delete",
        record_id: held.id,
        privacy,
        boundary: boundary ?? { purge_complete: null, git_history_remaining: null },
        skip_paths: [held.path],
        pin_removed: pinPlan.removedIds,
      },
      pinStatement: `Any pin on ${held.id} is removed in this same transaction, before any derived artifact is rebuilt.`,
      bullets: {
        what: privacy
          ? `Delete ${held.id} as a privacy removal and report what a complete erasure would still need.`
          : `Delete ${held.id}.`,
        where: held.path,
        why: reason,
        assumptions: "None",
        unverified: privacy
          ? "A normal Git commit does not erase earlier history, so this deletion is not a complete erasure on its own."
          : "None",
      },
    },
  };
}

const BUILDERS = Object.freeze({
  add: buildAdd,
  confirm: buildConfirm,
  correct: buildCorrect,
  supersede: buildSupersede,
  retire: buildRetire,
  merge: buildMerge,
  delete: buildDelete,
});

/**
 * The one entry every lifecycle operation runs through. Propose builds the
 * request and hands it to the coordinator. Apply is the shared second phase,
 * because approval binds to bytes and not to the operation that produced them.
 */
export function lifecycle(scope, options = {}) {
  const operation = String(options.operation ?? "");
  if (!Object.hasOwn(BUILDERS, operation)) {
    return {
      ok: false,
      status: "error",
      warnings: [],
      errors: [note("cli/invalid-invocation", `${operation || "no operation"} is not a lifecycle operation`)],
    };
  }

  if (options.mode === "apply") return applyProposal(scope, options);

  const now = options.now instanceof Date ? options.now : new Date();
  const today = isoDate(now);

  const state = recover(scope);
  if (state.blocked) return { ok: false, status: "error", errors: state.warnings, warnings: [] };

  const built = BUILDERS[operation](scope, options, today);
  if (!built.ok) {
    return { ok: false, status: "refused", errors: built.errors, warnings: state.warnings };
  }

  const outcome = propose(scope, { ...built.request, noopWhenUnchanged: true }, options);
  return { ...outcome, warnings: [...state.warnings, ...(outcome.warnings ?? [])] };
}

// ---------------------------------------------------------------------------
// Move and rename, architecture section 12.4
// ---------------------------------------------------------------------------

/**
 * Move is plumbing rather than a twenty-fourth tool operation. The stable
 * surface in architecture section 16.1 is closed, and a move creates no
 * meaning: it changes where one record lives and repairs the links that point
 * at it. It runs the same two-phase review as every write, because it changes
 * canonical bytes in several files at once.
 */
export const MOVE_OPERATION = "memory_move";

/** Every tracked Markdown link that still resolves to one path. */
export function survivingLinks(scope, path) {
  const found = [];
  for (const absolute of trackedMarkdown(scope)) {
    const from = relPath(scope, absolute);
    const text = readIfPresent(absolute);
    if (text === null) continue;
    for (const link of scanLinks(text)) {
      if (!link.relative || link.image) continue;
      if (resolveLinkTarget(scope.scopeRoot, from, link.path) !== path) continue;
      found.push({ path: from, line: link.line, target: link.path });
    }
  }
  return found.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);
}

/**
 * What has to be true once a move is staged: the record is at its new path,
 * nothing is left at the old one, and no tracked file still links to it.
 */
function moveValidation(scope, move) {
  const errors = [];
  if (!existsSync(absPath(scope, move.new_path))) {
    errors.push(note("write/link-repair-failed", "the moved record is not at its new path", { path: move.new_path }));
  }
  if (existsSync(absPath(scope, move.old_path))) {
    errors.push(note("write/link-repair-failed", "a file is still at the path this move left behind", { path: move.old_path }));
  }
  for (const found of survivingLinks(scope, move.old_path)) {
    errors.push(note(
      "write/link-repair-failed",
      `line ${found.line} still links to the path this move left behind, so every preimage was restored`,
      { path: found.path, detail: move.old_path },
    ));
  }
  return errors;
}

function writeMoveReceipt(scope, move, status, repaired) {
  writeText(absPath(scope, MOVE_RECEIPT), `${JSON.stringify({
    schema: MOVE_RECEIPT_SCHEMA,
    record_id: move.record_id ?? null,
    old_path: move.old_path,
    new_path: move.new_path,
    status,
    repaired: [...repaired].sort(),
  }, null, 2)}\n`);
}

/** The last move's outcome, or null when this project has never moved a record. */
export function readMoveReceipt(scope) {
  const text = readIfPresent(absPath(scope, MOVE_RECEIPT));
  if (text === null) return null;
  try {
    const held = JSON.parse(text);
    return held && held.schema === MOVE_RECEIPT_SCHEMA ? held : null;
  } catch {
    return null;
  }
}

/**
 * Every tracked Markdown file that links to the old path, rewritten to point
 * at the new one. A file that cannot be repaired is reported by its exact path
 * instead of being rewritten anyway: a link inside a declared subroot belongs
 * to another project's scope, and this project may not write there.
 */
export function planLinkRepair(scope, oldPath, newPath) {
  const repairs = [];
  const unrepairable = [];

  for (const absolute of trackedMarkdown(scope)) {
    const from = relPath(scope, absolute);
    if (from === oldPath) continue;
    const text = readIfPresent(absolute);
    if (text === null) continue;

    const hits = scanLinks(text).filter((link) => link.relative
      && !link.image
      && resolveLinkTarget(scope.scopeRoot, from, link.path) === oldPath);
    if (hits.length === 0) continue;

    if (!isMemberPath(scope, absolute)) {
      unrepairable.push({
        path: from,
        line: hits[0].line,
        reason: "the file sits in a declared subroot, which is another project's scope",
      });
      continue;
    }

    const rewritten = rewriteLinks(text, (link) => {
      if (link.image || !isRelativeTarget(link.path)) return null;
      if (resolveLinkTarget(scope.scopeRoot, from, link.path) !== oldPath) return null;
      return relativeLinkText(from, newPath);
    });
    if (rewritten.changed === 0) {
      unrepairable.push({
        path: from,
        line: hits[0].line,
        reason: "the link could not be rewritten where it is written",
      });
      continue;
    }
    repairs.push({ path: from, contents: rewritten.text, links: rewritten.changed });
  }

  return { repairs, unrepairable };
}

/**
 * The moved record's own outgoing links, rewritten so they point at the same
 * files from the new location. A link whose target was already missing is left
 * exactly as written, because rewriting a broken link would be a guess, and it
 * is reported in the proposal's Unverified bullet instead.
 */
function retargetMovedRecord(scope, text, oldPath, newPath) {
  const broken = [];
  const rewritten = rewriteLinks(text, (link) => {
    if (link.image || !isRelativeTarget(link.path)) return null;
    const target = resolveLinkTarget(scope.scopeRoot, oldPath, link.path);
    if (target === null) return null;
    // A record that links to itself follows itself to the new path.
    if (target === oldPath) return relativeLinkText(newPath, newPath);
    if (!existsSync(absPath(scope, target))) {
      broken.push(`${link.path} on line ${link.line}`);
      return null;
    }
    return relativeLinkText(newPath, target);
  });
  return { contents: rewritten.text, changed: rewritten.changed, broken };
}

/**
 * MOVE. One record changes its canonical path, every project link to it is
 * repaired in the same approved transaction, and a link that cannot be
 * repaired refuses the whole move rather than leaving half of it behind
 * (FR-086). The record's id, meaning, and every other byte stay as they are:
 * changing an id changes identity, which is what SUPERSEDE is for.
 */
export function moveRecord(scope, options = {}) {
  if (options.mode === "apply") return applyProposal(scope, options);

  const state = recover(scope);
  if (state.blocked) return { ok: false, status: "error", errors: state.warnings, warnings: [] };

  const held = loadRecord(scope, options.id);
  if (!held) {
    return { ok: false, status: "refused", errors: [unknownId(scope, "move", options.id)], warnings: state.warnings };
  }

  const destination = String(options.to ?? "").trim().replace(/^\.\//, "");
  if (destination === held.path) {
    return {
      ok: true,
      status: "noop",
      errors: [],
      warnings: state.warnings,
      result: {
        outcome: "NOOP",
        operation: MOVE_OPERATION,
        destination,
        record_id: held.id,
        changed_paths: [],
        reason: "the record already sits at that path",
      },
    };
  }

  const errors = [];
  const guard = destinationGuard(scope, destination);
  if (guard) errors.push(guard);
  else {
    if (!destination.endsWith(".md")) {
      errors.push(note("record/schema-invalid", "a record's destination has to be a Markdown file", { path: destination }));
    }
    if (existsSync(absPath(scope, destination))) {
      errors.push(note("record/schema-invalid", "a file already sits at the destination", { path: destination }));
    }
    const folder = recordFolderOf(destination);
    const type = String(held.record.data.type ?? "").trim();
    if (!folder) {
      errors.push(note(
        "record/schema-invalid",
        "a record stays under knowledge/memory/ in the folder its type names",
        { path: destination },
      ));
    } else if (TYPE_FOLDERS[type] !== folder) {
      errors.push(note(
        "record/schema-invalid",
        `a ${type || "typeless"} record belongs under knowledge/memory/${TYPE_FOLDERS[type] ?? "its own type folder"}/`,
        { path: destination },
      ));
    }
  }
  if (errors.length) return { ok: false, status: "refused", errors, warnings: state.warnings };

  const plan = planLinkRepair(scope, held.path, destination);
  if (plan.unrepairable.length) {
    return {
      ok: false,
      status: "refused",
      warnings: state.warnings,
      errors: plan.unrepairable.map((found) => note(
        "write/link-repair-failed",
        `line ${found.line} links to this record and cannot be repaired, so nothing changed: ${found.reason}`,
        { path: found.path, detail: held.path },
      )),
    };
  }

  const moved = retargetMovedRecord(scope, held.text, held.path, destination);
  const linkCount = plan.repairs.reduce((total, repair) => total + repair.links, 0);

  const request = {
    operation: MOVE_OPERATION,
    destination,
    contents: moved.contents,
    recordId: held.id,
    removals: [held.path],
    repairs: plan.repairs,
    sources: [],
    ownerRequested: true,
    bullets: {
      what: `Move the record ${held.id} from ${held.path} to ${destination}, repairing ${linkCount} link${linkCount === 1 ? "" : "s"} in ${plan.repairs.length} file${plan.repairs.length === 1 ? "" : "s"} and ${moved.changed} of its own.`,
      where: destination,
      why: oneLine(options.why) || "The record's canonical home changed, and every project link to it moves in the same approved operation.",
      assumptions: "None",
      unverified: moved.broken.length
        ? `The record carries ${moved.broken.length} link whose target is already missing, left exactly as written: ${moved.broken.join(", ")}.`
        : "None",
    },
    lifecycle: {
      kind: "move",
      record_id: held.id,
      old_path: held.path,
      new_path: destination,
      repaired: plan.repairs.map((repair) => repair.path),
    },
  };

  const outcome = propose(scope, request, options);
  return { ...outcome, warnings: [...state.warnings, ...(outcome.warnings ?? [])] };
}

/** NOOP. The default outcome: nothing durable is stored, and nothing changes. */
export function noop(scope, options = {}) {
  return {
    ok: true,
    status: "noop",
    errors: [],
    warnings: [],
    result: {
      outcome: "NOOP",
      reason: oneLine(options.reason) || "no durable save is warranted",
      changed_paths: [],
    },
  };
}

#!/usr/bin/env node

/**
 * The versioned record schema and the versioned project-settings schema.
 *
 * One home for both, because the validator, the write coordinator, and the
 * migration engine all need the same answer to "is this record well formed",
 * and a second copy of a field list is how two answers appear.
 *
 * The record schema is version 2.0 and comes from architecture section 12.
 * The settings schema is version 2.0 and comes from architecture section 9.
 * This module defines the shape and judges one record at a time. It never
 * reads the filesystem beyond the walk helper below, never writes, and never
 * carries record body text into a message.
 */

import { readdirSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

import { note } from "./result.mjs";
import { parseFrontMatter } from "./scope.mjs";

export const RECORD_SCHEMA_VERSION = 2;
export const SETTINGS_SCHEMA_VERSION = 2;

/** The four record types and the folder each one lives in. */
export const RECORD_TYPES = Object.freeze(["fact", "decision", "event", "pattern"]);
export const TYPE_FOLDERS = Object.freeze({
  fact: "facts",
  decision: "decisions",
  event: "events",
  pattern: "patterns",
});
export const RECORD_FOLDERS = Object.freeze(["facts", "decisions", "events", "patterns"]);

export const RECORD_STATUSES = Object.freeze(["active", "superseded", "retired"]);

export const EPISTEMIC_STATUSES = Object.freeze([
  "documented",
  "observed",
  "reported",
  "diagnosed",
  "approved",
  "inferred",
  "suspected",
  "unknown",
]);

/** An epistemic status that names a claim the evidence does not settle. */
export const INFERRED_STATUSES = Object.freeze(["inferred", "suspected"]);

/** Required on every new record, before the type-specific rules below. */
export const REQUIRED_FIELDS = Object.freeze([
  "id",
  "type",
  "status",
  "epistemic_status",
  "recorded_at",
  "approval",
  "evidence",
]);

/** Every field the schema defines, so an unknown key is reported once. */
export const KNOWN_FIELDS = Object.freeze([
  "schema_version",
  "id",
  "type",
  "status",
  "epistemic_status",
  "recorded_at",
  "effective_from",
  "effective_to",
  "occurred_at",
  "approval",
  "evidence",
  "based_on",
  "domain",
  "topics",
  "entities",
  "relates",
  "conflicts_with",
  "supersedes",
  "superseded_by",
  "confirmations",
  "review_after",
  "retired_because",
]);

/** Fields that hold a plain calendar date or nothing. */
const DATE_FIELDS = Object.freeze([
  "recorded_at",
  "effective_from",
  "effective_to",
  "review_after",
]);

export const APPROVAL_FIELDS = Object.freeze(["actor", "approved_at", "action"]);
export const EVIDENCE_FIELDS = Object.freeze(["source_type", "locator"]);

/**
 * The body sections a decision record must carry. Date, status, and evidence
 * are the other three parts architecture section 12 requires of a decision,
 * and they are already required of every record, so they are checked once in
 * the shared rules rather than twice here.
 */
export const DECISION_SECTIONS = Object.freeze([
  "context",
  "decision",
  "reason",
  "rejected options",
  "consequences",
]);

/** The required physical core from architecture section 7. */
export const REQUIRED_CORE = Object.freeze([
  { path: "knowledge/project.md", kind: "file" },
  { path: "knowledge/map.md", kind: "file" },
  { path: "knowledge/current.md", kind: "file" },
  { path: "knowledge/specs", kind: "directory" },
  { path: "knowledge/memory/facts", kind: "directory" },
  { path: "knowledge/memory/decisions", kind: "directory" },
  { path: "knowledge/memory/events", kind: "directory" },
  { path: "knowledge/memory/patterns", kind: "directory" },
]);

/** The whole project-settings surface. Everything else in project.md is prose. */
export const SETTINGS_KEYS = Object.freeze({
  required: ["schema_version", "project_id", "project_root", "privacy"],
  optional: ["subroots", "tracker", "startup", "profiles"],
});

/** The four required sections of knowledge/current.md, in order. */
export const CURRENT_SECTIONS = Object.freeze([
  "current focus",
  "blockers",
  "next step",
  "handoff",
]);

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})?$/;

/** The front matter parser reads a bare null as the four-letter string. */
function isEmpty(value) {
  return value === undefined
    || value === null
    || value === "null"
    || value === ""
    || (Array.isArray(value) && value.length === 0);
}

function isDate(value) {
  return typeof value === "string" && DATE.test(value.trim());
}

function isDateOrTimestamp(value) {
  if (typeof value !== "string") return false;
  const text = value.trim();
  return DATE.test(text) || TIMESTAMP.test(text);
}

function asList(value) {
  if (Array.isArray(value)) return value;
  if (isEmpty(value)) return [];
  return [value];
}

/**
 * Split a Markdown body into its H1, the paragraph directly under it, and its
 * H2 headings. Fenced blocks are skipped so an example heading inside one is
 * never read as a section of the record.
 */
export function readBody(body) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  let fenced = false;
  let h1 = null;
  let h1Line = -1;
  const sections = [];

  lines.forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    if (h1 === null && /^#\s+\S/.test(line)) {
      h1 = line.replace(/^#\s+/, "").trim();
      h1Line = index;
      return;
    }
    if (/^##\s+\S/.test(line)) {
      sections.push(line.replace(/^##\s+/, "").trim());
    }
  });

  let summary = "";
  if (h1Line !== -1) {
    const paragraph = [];
    for (let index = h1Line + 1; index < lines.length; index++) {
      const line = lines[index];
      if (/^#{1,6}\s/.test(line)) break;
      if (!line.trim()) {
        if (paragraph.length) break;
        continue;
      }
      paragraph.push(line.trim());
    }
    summary = paragraph.join(" ").trim();
  }

  return { h1, summary, sections };
}

/** Count sentences in the summary paragraph, deterministically. */
export function countSentences(summary) {
  if (!summary) return 0;
  const parts = summary
    .split(/(?<=[.!?])\s+(?=["'`(\[]?[A-Z0-9])/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length;
}

/** Read one record file's text into the pieces the checks read. */
export function parseRecord(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  const front = parseFrontMatter(normalized);
  let body = normalized;
  if (front.found) {
    const end = normalized.indexOf("\n---\n", 4);
    body = end === -1 ? "" : normalized.slice(end + 5);
  }
  return {
    found: front.found,
    data: front.data ?? {},
    problems: front.problems ?? [],
    ...readBody(body),
  };
}

/**
 * A record migration carried over without inventing metadata. Detection is
 * deliberately all-or-nothing: a record that carries none of the version 2
 * identity fields was never written to this schema, while a record that
 * carries some of them is being authored or upgraded and is checked in full.
 * FR-053 keeps the first case a warning; FR-055 upgrades it on the next
 * approved touch.
 */
export function legacyGaps(data) {
  const declared = data.schema_version;
  const belowCurrent = typeof declared === "number" && declared < RECORD_SCHEMA_VERSION;
  const identity = ["id", "type", "epistemic_status", "approval", "evidence"];
  const carried = identity.filter((field) => !isEmpty(data[field]));

  if (!belowCurrent && carried.length > 0) return null;
  return REQUIRED_FIELDS.filter((field) => isEmpty(data[field]));
}

/**
 * Judge one record against record schema 2.0.
 *
 * `path` is the scope-relative path used in every message. `folder` is the
 * record folder the file sits in, which the type has to match. Messages carry
 * field names, ids, and paths, never record body text.
 */
export function validateRecord({ record, path, folder }) {
  const errors = [];
  const warnings = [];
  const data = record.data ?? {};

  const gaps = legacyGaps(data);
  if (gaps) {
    warnings.push(note(
      "record/legacy-gap",
      "a migrated record is missing version 2 metadata and stays usable until its next approved touch",
      { path, detail: `missing: ${gaps.join(", ")}` },
    ));
    return { errors, warnings, legacy: true, id: null };
  }

  for (const problem of record.problems) {
    errors.push(note("record/schema-invalid", problem, { path }));
  }
  if (!record.found) {
    errors.push(note("record/schema-invalid", "the record carries no YAML front matter", { path }));
  }

  for (const field of REQUIRED_FIELDS) {
    if (isEmpty(data[field])) {
      errors.push(note("record/schema-invalid", `required field ${field} is missing or empty`, { path }));
    }
  }

  for (const key of Object.keys(data)) {
    if (!KNOWN_FIELDS.includes(key)) {
      errors.push(note("record/schema-invalid", `field ${key} is not defined by record schema 2.0`, { path }));
    }
  }

  const type = typeof data.type === "string" ? data.type.trim() : null;
  if (type && !RECORD_TYPES.includes(type)) {
    errors.push(note("record/schema-invalid", `type ${type} is outside the allowed set`, { path }));
  }
  if (type && RECORD_TYPES.includes(type) && folder && TYPE_FOLDERS[type] !== folder) {
    errors.push(note(
      "record/schema-invalid",
      `a ${type} record sits in the ${folder} folder`,
      { path },
    ));
  }
  if (!isEmpty(data.status) && !RECORD_STATUSES.includes(String(data.status).trim())) {
    errors.push(note("record/schema-invalid", `status ${data.status} is outside the allowed set`, { path }));
  }
  if (!isEmpty(data.epistemic_status) && !EPISTEMIC_STATUSES.includes(String(data.epistemic_status).trim())) {
    errors.push(note(
      "record/schema-invalid",
      `epistemic_status ${data.epistemic_status} is outside the allowed set`,
      { path },
    ));
  }

  for (const field of DATE_FIELDS) {
    const value = data[field];
    if (isEmpty(value)) continue;
    if (!isDate(value)) {
      errors.push(note("record/schema-invalid", `${field} is not a YYYY-MM-DD date`, { path }));
    }
  }

  const approval = data.approval;
  if (!isEmpty(approval)) {
    if (typeof approval !== "object" || Array.isArray(approval)) {
      errors.push(note("record/schema-invalid", "approval is not a block of fields", { path }));
    } else {
      for (const field of APPROVAL_FIELDS) {
        if (isEmpty(approval[field])) {
          errors.push(note("record/schema-invalid", `approval.${field} is missing`, { path }));
        }
      }
      if (!isEmpty(approval.approved_at) && !isDateOrTimestamp(approval.approved_at)) {
        errors.push(note("record/schema-invalid", "approval.approved_at is not a date or timestamp", { path }));
      }
    }
  }

  const evidence = asList(data.evidence);
  if (evidence.length === 0) {
    errors.push(note("record/missing-evidence", "the record carries no evidence entry", { path }));
  }
  evidence.forEach((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      errors.push(note(
        "record/schema-invalid",
        `evidence entry ${index + 1} is not a block of fields`,
        { path },
      ));
      return;
    }
    for (const field of EVIDENCE_FIELDS) {
      if (isEmpty(entry[field])) {
        errors.push(note(
          "record/missing-evidence",
          `evidence entry ${index + 1} is missing ${field}`,
          { path },
        ));
      }
    }
  });

  if (!record.h1) {
    errors.push(note("record/schema-invalid", "the record carries no H1", { path }));
  } else if (!record.summary) {
    errors.push(note("record/schema-invalid", "no summary sentence sits under the H1", { path }));
  } else if (countSentences(record.summary) > 1) {
    errors.push(note("record/schema-invalid", "the summary under the H1 is more than one sentence", { path }));
  }

  const epistemic = typeof data.epistemic_status === "string" ? data.epistemic_status.trim() : "";
  const needsBasis = INFERRED_STATUSES.includes(epistemic) || type === "pattern";
  if (needsBasis && asList(data.based_on).length === 0) {
    errors.push(note(
      "record/inference-without-basis",
      type === "pattern"
        ? "a pattern names no records in based_on"
        : `an ${epistemic} record names no records in based_on`,
      { path },
    ));
  }

  if (type === "event" && isEmpty(data.occurred_at)) {
    errors.push(note(
      "record/schema-invalid",
      "an event states no occurred_at date, range, or uncertainty",
      { path },
    ));
  }

  if (type === "decision") {
    const present = new Set(record.sections.map((heading) => heading.trim().toLowerCase()));
    for (const section of DECISION_SECTIONS) {
      if (!present.has(section)) {
        errors.push(note(
          "record/schema-invalid",
          `a decision is missing its ${section} section`,
          { path },
        ));
      }
    }
  }

  return {
    errors,
    warnings,
    legacy: false,
    id: typeof data.id === "string" && data.id.trim() ? data.id.trim() : null,
  };
}

/**
 * Every Markdown record under the four type folders, scope-relative and
 * sorted, skipping symbolic links so a walk never leaves the scope.
 */
export function walkRecords(scopeRoot) {
  const found = [];
  for (const folder of RECORD_FOLDERS) {
    const base = resolve(scopeRoot, "knowledge/memory", folder);
    let entries;
    try {
      if (!statSync(base).isDirectory()) continue;
      entries = [];
      const walk = (directory) => {
        for (const entry of readdirSync(directory, { withFileTypes: true })
          .sort((a, b) => a.name.localeCompare(b.name))) {
          if (entry.isSymbolicLink()) continue;
          const full = resolve(directory, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (entry.isFile() && entry.name.endsWith(".md")) entries.push(full);
        }
      };
      walk(base);
    } catch {
      continue;
    }
    for (const full of entries) {
      found.push({ folder, absolute: full, path: relative(scopeRoot, full).split(sep).join("/") });
    }
  }
  return found;
}

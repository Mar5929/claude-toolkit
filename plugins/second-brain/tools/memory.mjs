#!/usr/bin/env node

/**
 * memory.mjs: the one command-line entry for the version 2 memory operations.
 *
 * Call shape:
 *
 *   node <plugin>/tools/memory.mjs <operation> [--flag value]...
 *
 * The operation name is the tool-surface name with the memory_ prefix dropped
 * and underscores turned into hyphens, so memory_update_current is
 * update-current. Every operation prints exactly one JSON envelope on standard
 * output and nothing else. Human-readable rendering is the skill's job.
 *
 * This build implements capabilities and status. The other operations are not
 * stubbed, because a stub that answers is worse than an operation that says it
 * is not here: capabilities reports the whole build state, so an agent reads it
 * instead of guessing.
 *
 * Adding an operation later: add one entry to OPERATIONS whose run function
 * does its own dynamic import, for example
 * `const { search } = await import("./memory-search.mjs")`. The dispatcher is
 * async for exactly that reason, so no later work item has to reshape this
 * file. The preflight below stays the single place scope and privacy resolve,
 * which is why nothing reaches a canonical path through another entry point.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  emit,
  envelope,
  note,
} from "./lib/result.mjs";
import {
  isMemberPath,
  parseFrontMatter,
  resolveScope,
} from "./lib/scope.mjs";

/** The four memory record folders in the required core. */
const RECORD_TYPES = ["facts", "decisions", "events", "patterns"];

/** The default rendered startup budget when the project sets none. */
const DEFAULT_BUDGET_BYTES = 10240;

/** The recent window. A current file older than this is stale. */
const RECENT_WINDOW_HOURS = 72;

const APPROVAL_MODE = "owner-approved";
const SEARCH_MODE = "direct-file";

/**
 * Features the tool surface names that this build does not carry. Each entry
 * is reported by capabilities so an agent never has to discover the gap by
 * calling something that is not here.
 */
const BUILD_GAPS = [
  {
    feature: "retrieval",
    reason: "search, get, timeline, related, sources, spec-search, and spec-get are not available in this build",
  },
  {
    feature: "writes",
    reason: "add, confirm, correct, supersede, retire, merge, delete, and update-current are not available in this build",
  },
  {
    feature: "pins",
    reason: "pin and unpin are not available in this build",
  },
  {
    feature: "review",
    reason: "review is not available in this build",
  },
  {
    feature: "validation",
    reason: "validate is not available in this build",
  },
  {
    feature: "generated views",
    reason: "rebuild-views is not available in this build",
  },
  {
    feature: "session history",
    reason: "session-search is not available in this build",
  },
  {
    feature: "boot brief",
    reason: "the required brief size cannot be measured until the boot brief assembler ships",
  },
];

function isoDate(date) {
  return date.toISOString().slice(0, 10);
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

/** Count Markdown records in one folder, skipping symbolic links. */
function countRecords(folder) {
  if (!isDirectory(folder)) return null;
  let count = 0;
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink()) continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && entry.name.endsWith(".md")) count++;
    }
  };
  walk(folder);
  return count;
}

/** Days between two dates, both written as YYYY-MM-DD. */
function daysBetween(earlier, later) {
  const parse = (text) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) return null;
    const [, year, month, day] = match.map(Number);
    return Date.UTC(year, month - 1, day);
  };
  const from = parse(earlier);
  const to = parse(later);
  if (from === null || to === null) return null;
  return Math.round((to - from) / 86400000);
}

function relativePath(scope, path) {
  return relative(scope.scopeRoot, path).split(sep).join("/");
}

/** knowledge/current.md and the age of its latest authored update. */
function readCurrent(scope, asOf) {
  const path = resolve(scope.scopeRoot, "knowledge/current.md");
  const text = readIfPresent(path);
  if (text === null) {
    return { state: "missing", updated: null, stale: true, reason: "missing" };
  }
  const { data } = parseFrontMatter(text);
  const updated = typeof data.updated === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.updated)
    ? data.updated
    : null;
  if (!updated) {
    return { state: "present", updated: null, stale: true, reason: "undated" };
  }
  const age = daysBetween(updated, asOf);
  const stale = age === null || age * 24 > RECENT_WINDOW_HOURS;
  return { state: "present", updated, stale, reason: stale ? "older than the recent window" : null };
}

/** The pins file is optional. Absent means the project has no pins. */
function readPins(scope) {
  const path = resolve(scope.scopeRoot, "knowledge/memory/pins.md");
  if (!existsSync(path)) return { present: false, count: 0 };
  // The pin manager owns the entry format, so this build reports the file
  // without guessing how many entries it holds.
  return { present: true, count: null };
}

/**
 * The gold set sits at the default path, or wherever knowledge/map.md maps it.
 * Absence is a normal state for a project that has not written one.
 */
function readGoldSet(scope) {
  const defaultPath = resolve(scope.scopeRoot, "knowledge/retrieval-gold-set.md");
  if (existsSync(defaultPath)) return "present";

  const map = readIfPresent(resolve(scope.scopeRoot, "knowledge/map.md"));
  if (map === null) return "missing";

  for (const line of map.replace(/\r\n/g, "\n").split("\n")) {
    if (!/gold set/i.test(line)) continue;
    const match = /`([^`]+\.md)`/.exec(line) ?? /\]\(([^)]+\.md)\)/.exec(line);
    if (!match) continue;
    const mapped = resolve(scope.scopeRoot, match[1]);
    if (existsSync(mapped) && isMemberPath(scope, mapped)) return relativePath(scope, mapped);
  }
  return "missing";
}

/** An interrupted transaction leaves a journal under .memory/. */
function readJournal(scope) {
  const directory = resolve(scope.scopeRoot, ".memory");
  if (!isDirectory(directory)) return false;
  return readdirSync(directory).some((name) => name.startsWith("journal"));
}

function readBudget(scope) {
  const startup = scope.settings.startup;
  const configured = startup && typeof startup === "object" ? startup.budget_bytes : undefined;
  if (typeof configured === "number" && Number.isInteger(configured) && configured > 0) {
    return { bytes: configured, warning: null };
  }
  if (configured === undefined || configured === null) {
    return { bytes: DEFAULT_BUDGET_BYTES, warning: null };
  }
  return {
    bytes: DEFAULT_BUDGET_BYTES,
    warning: note(
      "record/schema-invalid",
      "startup.budget_bytes is not a positive whole number, so the default applies",
      { path: relativePath(scope, scope.projectFile) },
    ),
  };
}

function readTracker(scope) {
  const tracker = scope.settings.tracker;
  if (tracker && typeof tracker === "object" && typeof tracker.adapter === "string" && tracker.adapter.trim()) {
    return tracker.adapter.trim();
  }
  return null;
}

/**
 * The shared preflight. Scope resolves first, then privacy, then the crash
 * journal, then any path argument. A read operation never performs the
 * recovery itself in this build, so a present journal is reported and the
 * operation continues.
 */
function preflight(startDir) {
  const scope = resolveScope(startDir);
  if (!scope.ok) return { ok: false, error: scope.error };

  const warnings = [...scope.warnings];
  const journalPresent = readJournal(scope);
  if (journalPresent) {
    warnings.push(note(
      "write/journal-present",
      "an interrupted write left a recovery journal under .memory/ and recovery is not available in this build",
      { path: ".memory/" },
    ));
  }
  return { ok: true, scope, warnings, journalPresent };
}

/** memory_capabilities: what this project's memory can do, with no guessing. */
export function capabilities(context) {
  const { scope, warnings, journalPresent } = context;
  const budget = readBudget(scope);
  if (budget.warning) warnings.push(budget.warning);

  const pins = readPins(scope);
  const tracker = readTracker(scope);
  if (tracker === null) {
    warnings.push(note("tracker/not-configured", "no tracker is configured in knowledge/project.md"));
  }

  const degraded = [...BUILD_GAPS];
  if (pins.present) {
    degraded.push({
      feature: "pin count",
      reason: "knowledge/memory/pins.md is present and the pin manager that reads it is not available in this build",
    });
  }
  if (tracker === null) {
    degraded.push({
      feature: "tracker",
      reason: "no tracker is configured, so current state comes from knowledge/current.md alone",
    });
  }
  if (journalPresent) {
    degraded.push({
      feature: "crash recovery",
      reason: "a recovery journal is present under .memory/ and recovery is not available in this build",
    });
  }

  return {
    operations: [...OPERATIONS.values()].map((entry) => entry.operation),
    approval_mode: APPROVAL_MODE,
    search_mode: SEARCH_MODE,
    pin_support: false,
    pin_count: pins.count,
    budget_bytes: budget.bytes,
    required_bytes: null,
    project_id: scope.projectId,
    privacy: { ...scope.privacy },
    external_transfer: scope.privacy.external_transfer,
    tracker,
    session_history_scope: {
      scoped_by: "project_id",
      project_id: scope.projectId,
      available: false,
      reason: "the session-history adapter is not available in this build",
    },
    degraded,
  };
}

/** memory_status: the live state of this project's memory. */
export function status(context) {
  const { scope, warnings, journalPresent } = context;
  const asOf = isoDate(new Date());

  const counts = {};
  for (const type of RECORD_TYPES) {
    const folder = resolve(scope.scopeRoot, "knowledge/memory", type);
    const count = countRecords(folder);
    if (count === null) {
      warnings.push(note(
        "startup/missing-source",
        `the required record folder knowledge/memory/${type}/ is missing`,
        { path: `knowledge/memory/${type}/` },
      ));
      counts[type] = 0;
    } else {
      counts[type] = count;
    }
  }

  const pins = readPins(scope);
  const current = readCurrent(scope, asOf);
  if (current.stale) {
    warnings.push(note(
      "startup/stale-current",
      current.state === "missing"
        ? "knowledge/current.md is missing"
        : `knowledge/current.md is ${current.reason}`,
      { path: "knowledge/current.md", detail: current.updated ?? undefined },
    ));
  }

  return {
    project_id: scope.projectId,
    scope_root: scope.scopeRoot,
    schema_version: typeof scope.settings.schema_version === "number"
      ? scope.settings.schema_version
      : null,
    counts,
    pin_count: pins.count,
    current_md: { state: current.state, updated: current.updated },
    stale: current.stale,
    journal_present: journalPresent,
    gold_set: readGoldSet(scope),
    // last_validate stays absent until the validator records a run. Nothing
    // in this build runs it, so the project has never run it.
    as_of: asOf,
  };
}

/**
 * The dispatch table. The key is the command word, the operation is the
 * tool-surface name that appears in the envelope.
 */
const OPERATIONS = new Map([
  ["capabilities", { operation: "memory_capabilities", run: capabilities }],
  ["status", { operation: "memory_status", run: status }],
]);

export function supportedCommands() {
  return [...OPERATIONS.keys()];
}

export async function run(argv, startDir = process.cwd()) {
  const args = argv.slice(2);
  const command = args[0] ?? "";
  const entry = OPERATIONS.get(command);

  if (!entry) {
    return envelope({
      operation: command || "unknown",
      status: "refused",
      errors: [note(
        "record/schema-invalid",
        `${command ? "unknown" : "missing"} operation. This build supports: ${supportedCommands().join(", ")}`,
      )],
    });
  }

  if (args.length > 1) {
    return envelope({
      operation: entry.operation,
      status: "refused",
      errors: [note("record/schema-invalid", `${command} takes no flags`)],
    });
  }

  const context = preflight(startDir);
  if (!context.ok) {
    return envelope({
      operation: entry.operation,
      status: "error",
      errors: [context.error],
    });
  }

  const result = await entry.run(context);
  return envelope({
    operation: entry.operation,
    status: "ok",
    projectId: context.scope.projectId,
    scopeRoot: context.scope.scopeRoot,
    result,
    warnings: context.warnings,
  });
}

async function main() {
  emit(await run(process.argv));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    emit(envelope({
      operation: process.argv[2] ?? "unknown",
      status: "error",
      errors: [note("scope/unresolved-root", `the operation could not be evaluated: ${error.message}`)],
    }));
  });
}

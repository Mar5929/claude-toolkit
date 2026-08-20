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
 * This build implements capabilities, status, validate, update-current,
 * rebuild-views, the seven writing lifecycle operations, pin and unpin, and
 * the noop and cancel plumbing. The other operations are not stubbed, because a stub that
 * answers is worse than an operation that says it is not here: capabilities
 * reports the whole build state, so an agent reads it instead of guessing. The
 * validator follows the same rule inside itself: a check whose component is
 * not built yet is reported as skipped with the reason, never as a pass.
 *
 * Every write goes to memory-write.mjs. This file resolves scope and privacy,
 * reads flags, and prints the envelope. It never touches a canonical path
 * itself, which is what keeps one write path in one file.
 *
 * Adding an operation later: add one entry to OPERATIONS whose run function
 * returns `{ status, result, errors, warnings }`, or a plain payload when the
 * default status is right. The dispatcher is async so a later operation may
 * import its own module. The preflight below stays the single place scope and
 * privacy resolve, which is why nothing reaches a canonical path through
 * another entry point.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  REASON_CODES,
  emit,
  envelope,
  note,
} from "./lib/result.mjs";
import {
  isMemberPath,
  parseFrontMatter,
  resolveScope,
} from "./lib/scope.mjs";
import {
  RECORD_FOLDERS,
  RECORD_TYPES,
  REQUIRED_CORE,
  parseRecord,
  validateRecord,
  walkRecords,
} from "./lib/record-schema.mjs";
import {
  CURRENT_TRIGGERS,
  LIFECYCLE_OPERATIONS,
  PIN_OPERATIONS,
  cancel as cancelProposal,
  lifecycle,
  noop as noopOutcome,
  phraseHunt,
  pinOperation,
  readPinRegistry,
  rebuildViews,
  recover,
  retiredPhraseSets,
  updateCurrent,
} from "./memory-write.mjs";
import {
  PINS_PATH,
  approvedSummary,
  resolvePinTarget,
  summaryHash,
} from "./lib/pins.mjs";

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
    feature: "review",
    reason: "review is not available in this build",
  },
  {
    feature: "validation",
    reason: "validate carries the required-file, record-schema, link, and retired-phrase checks only, and reports every other check as skipped",
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
  const registry = readPinRegistry(scope);
  return { present: registry.present, count: registry.entries.length };
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
 * journal, then any path argument. Recovery is the one write a read operation
 * may cause, and it only ever restores an approved state a crash interrupted.
 * A journal this build cannot read is left in place and reported, because
 * deleting state nobody can judge is worse than carrying it forward.
 */
function preflight(startDir) {
  const scope = resolveScope(startDir);
  if (!scope.ok) return { ok: false, error: scope.error };

  const recovery = recover(scope);
  return {
    ok: true,
    scope,
    warnings: [...scope.warnings, ...recovery.warnings],
    journalPresent: recovery.blocked,
  };
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
  if (tracker === null) {
    degraded.push({
      feature: "tracker",
      reason: "no tracker is configured, so current state comes from knowledge/current.md alone",
    });
  }
  if (journalPresent) {
    degraded.push({
      feature: "crash recovery",
      reason: "a recovery journal under .memory/ could not be read, so no write runs until it is cleared",
    });
  }

  return {
    operations: [...OPERATIONS.values()]
      .filter((entry) => entry.surface !== false)
      .map((entry) => entry.operation),
    approval_mode: APPROVAL_MODE,
    search_mode: SEARCH_MODE,
    pin_support: true,
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
  for (const name of RECORD_FOLDERS) {
    const folder = resolve(scope.scopeRoot, "knowledge/memory", name);
    const count = countRecords(folder);
    if (count === null) {
      warnings.push(note(
        "startup/missing-source",
        `the required record folder knowledge/memory/${name}/ is missing`,
        { path: `knowledge/memory/${name}/` },
      ));
      counts[name] = 0;
    } else {
      counts[name] = count;
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
 * MV-01, the required-files half. The host-route half of the same check needs
 * the startup routes, which are not built yet, so the entry names that gap in
 * skipped_because while still reporting the file verdict.
 */
function checkRequiredFiles(scope) {
  const findings = [];
  for (const entry of REQUIRED_CORE) {
    const path = resolve(scope.scopeRoot, entry.path);
    const present = entry.kind === "directory" ? isDirectory(path) : existsSync(path);
    if (!present) {
      findings.push(note(
        "record/schema-invalid",
        `the required ${entry.kind} ${entry.path} is missing`,
        { path: entry.path },
      ));
    }
  }
  return {
    status: findings.length ? "fail" : "pass",
    findings,
    skipped_because: "the host-route half of this check is not available in this build",
  };
}

/**
 * MV-03 and MV-04 read the same walk, so they are judged together and the
 * findings are split by reason code afterwards. MV-04 owns the empty based_on
 * refusal; MV-03 owns everything else the record schema defines.
 */
function checkRecords(scope) {
  const schema = [];
  const basis = [];
  const legacy = [];
  const seen = new Map();

  for (const entry of walkRecords(scope.scopeRoot)) {
    const text = readIfPresent(entry.absolute);
    if (text === null) {
      schema.push(note("record/schema-invalid", "the record could not be read", { path: entry.path }));
      continue;
    }
    const verdict = validateRecord({
      record: parseRecord(text),
      path: entry.path,
      folder: entry.folder,
    });
    for (const finding of verdict.errors) {
      if (finding.code === "record/inference-without-basis") basis.push(finding);
      else schema.push(finding);
    }
    legacy.push(...verdict.warnings);

    if (verdict.id) {
      const first = seen.get(verdict.id);
      if (first) {
        schema.push(note(
          "record/duplicate-id",
          `id ${verdict.id} is already used by ${first}`,
          { path: entry.path },
        ));
      } else {
        seen.set(verdict.id, entry.path);
      }
    }
  }

  return {
    "MV-03": {
      status: schema.length ? "fail" : "pass",
      findings: [...schema, ...legacy],
      skipped_because: null,
    },
    "MV-04": {
      status: basis.length ? "fail" : "pass",
      findings: basis,
      skipped_because: null,
    },
  };
}

/** Read a front matter field that may hold one id, a list of ids, or nothing. */
function idList(value) {
  const entries = Array.isArray(value) ? value : [value];
  return entries
    .map((entry) => String(entry ?? "").trim())
    .filter((entry) => entry && entry !== "null");
}

/**
 * MV-05, valid conflict targets and reciprocal supersession. A link to an id
 * this scope does not carry, or a supersession the other record does not link
 * back, is what the lifecycle engine exists to prevent, so the validator
 * repeats the check against the files themselves.
 */
function checkLinks(scope) {
  const findings = [];
  const records = new Map();

  for (const entry of walkRecords(scope.scopeRoot)) {
    const text = readIfPresent(entry.absolute);
    if (text === null) continue;
    const { data } = parseRecord(text);
    const id = typeof data.id === "string" ? data.id.trim() : "";
    if (id) records.set(id, { path: entry.path, data });
  }

  for (const [id, held] of records) {
    for (const field of ["conflicts_with", "supersedes", "superseded_by"]) {
      for (const target of idList(held.data[field])) {
        if (!records.has(target)) {
          findings.push(note(
            "record/schema-invalid",
            `${id} names ${target} in ${field} and no record in this scope carries that id`,
            { path: held.path },
          ));
        }
      }
    }

    for (const [field, mirror] of [["supersedes", "superseded_by"], ["superseded_by", "supersedes"]]) {
      for (const target of idList(held.data[field])) {
        const other = records.get(target);
        if (!other) continue;
        if (!idList(other.data[mirror]).includes(id)) {
          findings.push(note(
            "record/schema-invalid",
            `${id} names ${target} in ${field} and ${target} does not link back in ${mirror}`,
            { path: held.path },
          ));
        }
      }
    }
  }

  return { status: findings.length ? "fail" : "pass", findings, skipped_because: null };
}

/**
 * MV-06, pin eligibility, summary hashes, project scope, and startup
 * rendering. It reads the registry against the records it names, which is the
 * same judgment the boot brief makes at startup, repeated here so a broken
 * entry is reported as repair work instead of only going quiet in the brief.
 */
function checkPins(scope) {
  const registry = readPinRegistry(scope);
  if (!registry.present) return { status: "pass", findings: [], skipped_because: null };

  const findings = [];
  const seen = new Set();
  for (const entry of registry.entries) {
    if (seen.has(entry.id)) {
      findings.push(note("record/duplicate-id", `${entry.id} is pinned more than once`, { path: PINS_PATH }));
      continue;
    }
    seen.add(entry.id);

    const resolved = resolvePinTarget(scope.scopeRoot, entry.target);
    if (!isMemberPath(scope, resolved.absolute)) {
      findings.push(note(
        "scope/cross-scope-result",
        `the pinned record ${entry.id} sits outside this project's scope`,
        { path: PINS_PATH },
      ));
      continue;
    }
    const text = readIfPresent(resolved.absolute);
    if (text === null) {
      findings.push(note(
        "record/unknown-id",
        `the pinned record ${entry.id} is not a readable file in this project`,
        { path: resolved.path },
      ));
      continue;
    }

    const { data } = parseFrontMatter(text);
    const status = String(data.status ?? "").trim().toLowerCase();
    if (status === "retired" || status === "superseded") {
      findings.push(note(
        "record/schema-invalid",
        `the pinned record ${entry.id} is ${status}, so its entry needs removing`,
        { path: resolved.path },
      ));
      continue;
    }

    const summary = approvedSummary(text);
    if (!summary) {
      findings.push(note(
        "record/schema-invalid",
        `the pinned record ${entry.id} carries no approved summary to render`,
        { path: resolved.path },
      ));
      continue;
    }
    if (entry.hash !== summaryHash(summary)) {
      findings.push(note(
        "record/schema-invalid",
        `the summary of ${entry.id} no longer hashes to the value the owner approved for startup`,
        { path: resolved.path },
      ));
    }
  }

  return { status: findings.length ? "fail" : "pass", findings, skipped_because: null };
}

/**
 * MV-08, retired phrases and recorded exemptions. Every phrase a retired
 * record declares is hunted again across tracked Markdown. A surviving
 * occurrence that is neither a quotation, nor inside a record that is itself
 * history, nor exempted with a reason on the retiring record, is a failure.
 */
function checkRetiredPhrases(scope) {
  const sets = retiredPhraseSets(scope);
  if (sets.length === 0) {
    return { status: "pass", findings: [], skipped_because: null };
  }

  const findings = [];
  for (const set of sets) {
    const outstanding = phraseHunt(scope, set.phrases, {
      skipPaths: [set.path],
      exemptions: set.exemptions,
    }).filter((found) => found.state === "needs-work");

    for (const found of outstanding) {
      findings.push(note(
        "record/schema-invalid",
        `line ${found.line} still states a phrase ${set.id} retired as current truth`,
        { path: found.path, detail: found.phrase },
      ));
    }
  }

  return { status: findings.length ? "fail" : "pass", findings, skipped_because: null };
}

/**
 * The section 4 check catalog. Every id is permanent and every version is
 * <schema major>.<check revision>. A check whose component is not built yet
 * carries the reason it is skipped, the same way capabilities reports a
 * degraded feature.
 */
const CHECKS = [
  { id: "MV-01", version: "2.0", severity: "fail", title: "required files and host startup routes" },
  {
    id: "MV-02",
    version: "2.0",
    severity: "fail",
    title: "shared root-block meaning and checked-copy drift",
    skipped_because: "the root-instruction drift reader is not available in this build",
  },
  { id: "MV-03", version: "2.0", severity: "fail", title: "record schema, allowed values, unique ids, approval, provenance" },
  { id: "MV-04", version: "2.0", severity: "fail", title: "non-empty evidence for inference" },
  { id: "MV-05", version: "2.0", severity: "fail", title: "valid conflict targets and reciprocal supersession" },
  { id: "MV-06", version: "2.0", severity: "fail", title: "pin eligibility, summary hashes, project scope, startup rendering" },
  {
    id: "MV-07",
    version: "2.0",
    severity: "fail",
    title: "startup budget and safe degradation",
    skipped_because: "the validator does not render the brief in this build",
  },
  { id: "MV-08", version: "2.0", severity: "fail", title: "retired phrases and recorded exemptions" },
  {
    id: "MV-09",
    version: "2.0",
    severity: "warn",
    title: "derived-artifact inputs, fingerprints, and hand edits",
    skipped_because: "the view generator is not available in this build",
  },
  {
    id: "MV-10",
    version: "2.0",
    severity: "warn",
    title: "map coverage for major folders",
    skipped_because: "the map reader is not available in this build",
  },
  {
    id: "MV-11",
    version: "2.0",
    severity: "warn",
    title: "domain and topic vocabulary and usage",
    skipped_because: "the vocabulary reader is not available in this build",
  },
  {
    id: "MV-12",
    version: "2.0",
    severity: "fail",
    title: "direct search returns complete records",
    skipped_because: "the retrieval router is not available in this build",
  },
  {
    id: "MV-13",
    version: "2.0",
    severity: "fail",
    title: "no tracker bridge as the sole home of a fact",
    skipped_because: "the retrieval router is not available in this build",
  },
  {
    id: "MV-14",
    version: "2.0",
    severity: "fail",
    title: "identical canonical results after deleting and rebuilding derived state",
    skipped_because: "the retrieval router is not available in this build",
  },
  {
    id: "MV-15",
    version: "2.0",
    severity: "fail",
    title: "reads and retrieval create no local state",
    skipped_because: "the retrieval router is not available in this build",
  },
  {
    id: "MV-16",
    version: "2.0",
    severity: "fail",
    title: "physical project-root isolation",
    skipped_because: "the isolation steps and their fixtures are not available in this build",
  },
  {
    id: "MV-17",
    version: "2.0",
    severity: "fail",
    title: "privacy-boundary enforcement",
    skipped_because: "the privacy enforcement steps are not available in this build",
  },
  {
    id: "MV-18",
    version: "2.0",
    severity: "fail",
    title: "migration file counts, links, hashes, and reversibility",
    skipped_because: "the migration engine is not available in this build",
  },
  {
    id: "MV-19",
    version: "2.0",
    severity: "warn",
    title: "the retrieval gold set",
    skipped_because: "the gold-set runner is not available in this build",
  },
  {
    id: "MV-20",
    version: "2.0",
    severity: "fail",
    title: "quoted-source consistency",
    skipped_because: "the quoted-source reader is not available in this build",
  },
  {
    id: "MV-21",
    version: "2.0",
    severity: "fail",
    title: "relative-link syntax and resolvable targets",
    skipped_because: "the link checker is not available in this build",
  },
  {
    id: "MV-22",
    version: "2.0",
    severity: "fail",
    title: "complete incoming-link repair after a move or rename",
    skipped_because: "the link checker is not available in this build",
  },
];

export function checkIds() {
  return CHECKS.map((check) => check.id);
}

/** memory_validate: run the section 4 checks this build carries. */
export function validate(context, options = {}) {
  const { scope, warnings } = context;
  // The --fixtures flag adds the isolation fixtures to MV-16, which is not
  // built yet, so this build accepts the flag and it changes nothing.
  const selected = options.check ?? null;
  const wanted = (id) => selected === null || selected.includes(id);

  const records = wanted("MV-03") || wanted("MV-04") ? checkRecords(scope) : {};
  const outcomes = {
    "MV-01": wanted("MV-01") ? checkRequiredFiles(scope) : null,
    ...records,
    "MV-05": wanted("MV-05") ? checkLinks(scope) : null,
    "MV-06": wanted("MV-06") ? checkPins(scope) : null,
    "MV-08": wanted("MV-08") ? checkRetiredPhrases(scope) : null,
  };

  const checks = [];
  for (const check of CHECKS) {
    if (!wanted(check.id)) continue;
    const outcome = outcomes[check.id];
    if (!outcome) {
      checks.push({
        id: check.id,
        version: check.version,
        status: "skipped",
        findings: [],
        skipped_because: check.skipped_because,
      });
      continue;
    }
    const status = outcome.status === "fail" && check.severity === "warn" ? "warn" : outcome.status;
    checks.push({
      id: check.id,
      version: check.version,
      status,
      findings: outcome.findings,
      skipped_because: outcome.skipped_because,
    });
  }

  const errors = [];
  for (const entry of checks) {
    for (const finding of entry.findings) {
      if (entry.status === "fail" && REASON_CODES[finding.code] > 0) errors.push(finding);
      else warnings.push(finding);
    }
  }

  return { checks, errors };
}

/**
 * memory_update_current. The three triggers of architecture section 10.6 are
 * the only ways knowledge/current.md is written, and every one of them runs
 * the same two-phase review as any other write.
 */
function updateCurrentOperation(context, options) {
  return updateCurrent(context.scope, options);
}

/** memory_rebuild_views. Nothing to rebuild is a NOOP, never a failure. */
function rebuildViewsOperation(context) {
  return rebuildViews(context.scope);
}

/** cancel is plumbing for a skip, not an operation on the tool surface. */
function cancelOperation(context, options) {
  return cancelProposal(context.scope, options);
}

/**
 * The seven writing lifecycle operations of architecture section 14. Each one
 * builds its request and runs the same two-phase review as every other write,
 * so no operation gets its own way into a canonical file.
 */
function lifecycleOperation(context, options) {
  return lifecycle(context.scope, options);
}

/**
 * The two pin operations of architecture section 11.3. They change startup
 * visibility and nothing else, and they run the same two-phase review as every
 * other write.
 */
function pinOperationRun(context, options) {
  return pinOperation(context.scope, options);
}

/**
 * NOOP, the default outcome. It is plumbing rather than a tool-surface
 * operation: it changes nothing, and it exists so a session can report that
 * no durable save was warranted without inventing a record to prove it.
 */
function noopOperation(context, options) {
  return noopOutcome(context.scope, options);
}

/**
 * The dispatch table. The key is the command word, the operation is the
 * tool-surface name that appears in the envelope. A `flags` entry lists the
 * flags the operation defines; anything else is an invalid invocation.
 * `surface: false` keeps a command out of the reported operation list, which
 * is how cancel stays plumbing rather than a twenty-fourth operation.
 */
const OPERATIONS = new Map([
  ["capabilities", { operation: "memory_capabilities", run: capabilities }],
  ["status", { operation: "memory_status", run: status }],
  [
    "validate",
    {
      operation: "memory_validate",
      run: validate,
      flags: { check: "value", fixtures: "switch" },
      parse: parseValidateFlags,
    },
  ],
  [
    "update-current",
    {
      operation: "memory_update_current",
      run: updateCurrentOperation,
      parse: parseUpdateCurrentFlags,
    },
  ],
  ["rebuild-views", { operation: "memory_rebuild_views", run: rebuildViewsOperation }],
  ...LIFECYCLE_OPERATIONS.map((command) => [
    command,
    {
      operation: `memory_${command}`,
      run: lifecycleOperation,
      parse: lifecycleParser(command),
    },
  ]),
  ...PIN_OPERATIONS.map((command) => [
    command,
    {
      operation: `memory_${command}`,
      run: pinOperationRun,
      parse: pinParser(command),
    },
  ]),
  [
    "noop",
    {
      operation: "memory_noop",
      surface: false,
      run: noopOperation,
      parse: parseNoopFlags,
    },
  ],
  [
    "cancel",
    {
      operation: "memory_cancel",
      surface: false,
      run: cancelOperation,
      parse: parseCancelFlags,
    },
  ],
]);

/** Read `--flag value` and switch pairs into one object. */
function readFlags(args, spec) {
  const values = {};
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (!flag.startsWith("--")) return { ok: false, message: `${flag} is not a flag` };
    const name = flag.slice(2);
    const kind = spec[name];
    if (!kind) return { ok: false, message: `this operation does not define the flag ${flag}` };
    if (kind === "switch") {
      values[name] = true;
      continue;
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      return { ok: false, message: `${flag} needs a value` };
    }
    // A list flag may be repeated, which is how retire takes several phrases
    // and several exemptions. Every other flag keeps its last value.
    if (kind === "list") {
      if (!Array.isArray(values[name])) values[name] = [];
      values[name].push(value);
    } else {
      values[name] = value;
    }
    index++;
  }
  return { ok: true, values };
}

/** The two-phase flags every write operation shares. */
function readPhase(values) {
  if (values.propose && values.apply) {
    return { ok: false, message: "--propose and --apply are two different calls" };
  }
  if (!values.propose && !values.apply) {
    return { ok: false, message: "a write needs --propose or --apply" };
  }
  // An apply call missing its proposal id or content hash is not a malformed
  // command line, it is a call with no approval behind it. Contracts section
  // 1.6 gives that its own code and its own exit, so it goes to the
  // coordinator rather than being caught here.
  return {
    ok: true,
    mode: values.apply ? "apply" : "propose",
    proposalId: values.proposal ?? null,
    contentHash: values["content-hash"] ?? null,
  };
}

function parseUpdateCurrentFlags(args, startDir) {
  const read = readFlags(args, {
    trigger: "value",
    file: "value",
    propose: "switch",
    apply: "switch",
    proposal: "value",
    "content-hash": "value",
  });
  if (!read.ok) return read;

  const values = read.values;
  if (!CURRENT_TRIGGERS.includes(values.trigger ?? "")) {
    return { ok: false, message: `--trigger has to be one of ${CURRENT_TRIGGERS.join(", ")}` };
  }
  const phase = readPhase(values);
  if (!phase.ok) return phase;

  const options = {
    trigger: values.trigger,
    mode: phase.mode,
    proposalId: phase.proposalId,
    contentHash: phase.contentHash,
    contents: null,
  };

  if (phase.mode === "propose") {
    if (!values.file) return { ok: false, message: "--propose needs --file naming the staged Markdown" };
    const staged = readIfPresent(resolve(startDir, values.file));
    if (staged === null) return { ok: false, message: `the staged file ${values.file} could not be read` };
    options.contents = staged;
  }

  return { ok: true, options };
}

/** The flags each lifecycle operation defines, beyond the two-phase four. */
const LIFECYCLE_FLAGS = Object.freeze({
  add: { type: "value", file: "value", dest: "value", why: "value" },
  confirm: { id: "value", evidence: "value", "source-type": "value" },
  correct: { id: "value", file: "value", reason: "value", "keep-pin": "switch" },
  supersede: { "old-id": "value", file: "value", dest: "value", why: "value" },
  retire: { id: "value", reason: "value", phrase: "list", exempt: "list" },
  merge: { ids: "value", survivor: "value", pin: "value" },
  delete: { id: "value", reason: "value", privacy: "switch" },
});

/** The flags whose absence is a malformed command line rather than a refusal. */
const LIFECYCLE_REQUIRED = Object.freeze({
  add: ["type", "file"],
  confirm: ["id", "evidence"],
  correct: ["id", "file", "reason"],
  supersede: ["old-id", "file"],
  retire: ["id", "reason", "phrase"],
  merge: ["ids", "survivor", "pin"],
  delete: ["id", "reason"],
});

/**
 * One parser for all seven writing operations. A propose call reads its own
 * flags. An apply call carries only the proposal id and the content hash,
 * because approval binds to the reviewed bytes and not to the flags that
 * produced them.
 */
function lifecycleParser(command) {
  return (args, startDir) => {
    const read = readFlags(args, {
      ...LIFECYCLE_FLAGS[command],
      propose: "switch",
      apply: "switch",
      proposal: "value",
      "content-hash": "value",
    });
    if (!read.ok) return read;
    const phase = readPhase(read.values);
    if (!phase.ok) return phase;

    const options = {
      operation: command,
      mode: phase.mode,
      proposalId: phase.proposalId,
      contentHash: phase.contentHash,
    };
    if (phase.mode === "apply") return { ok: true, options };

    const values = read.values;
    for (const flag of LIFECYCLE_REQUIRED[command]) {
      const held = values[flag];
      if (held === undefined || (Array.isArray(held) && held.length === 0)) {
        return { ok: false, message: `${command} --propose needs --${flag}` };
      }
    }

    if (command === "add" || command === "supersede") {
      const staged = readIfPresent(resolve(startDir, values.file));
      if (staged === null) return { ok: false, message: `the staged file ${values.file} could not be read` };
      options.contents = staged;
      if (values.dest) options.destination = values.dest;
      if (values.why) options.why = values.why;
    }
    if (command === "add") {
      if (!RECORD_TYPES.includes(values.type)) {
        return { ok: false, message: `--type has to be one of ${RECORD_TYPES.join(", ")}` };
      }
      options.type = values.type;
    }
    if (command === "supersede") options.oldId = values["old-id"];
    if (command === "confirm") {
      options.id = values.id;
      options.evidence = values.evidence;
      if (values["source-type"]) options.sourceType = values["source-type"];
    }
    if (command === "correct") {
      const staged = readIfPresent(resolve(startDir, values.file));
      if (staged === null) return { ok: false, message: `the staged file ${values.file} could not be read` };
      options.id = values.id;
      options.contents = staged;
      options.reason = values.reason;
      // Section 11.4: a corrected summary drops its pin unless the owner
      // approves the corrected wording for startup in this same review.
      options.keepPin = values["keep-pin"] === true;
    }
    if (command === "retire") {
      options.id = values.id;
      options.reason = values.reason;
      options.phrases = values.phrase;
      options.exemptions = [];
      for (const entry of values.exempt ?? []) {
        const split = entry.indexOf(":");
        if (split === -1) {
          return { ok: false, message: `--exempt takes "<path>: <reason>" and read ${entry}` };
        }
        const path = entry.slice(0, split).trim();
        const why = entry.slice(split + 1).trim();
        if (!path || !why) {
          return { ok: false, message: `--exempt needs both a path and a reason, and read ${entry}` };
        }
        options.exemptions.push([path, why]);
      }
    }
    if (command === "merge") {
      options.ids = values.ids.split(",").map((id) => id.trim()).filter(Boolean);
      options.survivor = values.survivor;
      if (!["keep", "drop"].includes(values.pin)) {
        return { ok: false, message: "--pin has to be keep or drop, because the pin outcome is your choice" };
      }
      options.pin = values.pin;
    }
    if (command === "delete") {
      options.id = values.id;
      options.reason = values.reason;
      options.privacy = values.privacy === true;
    }

    return { ok: true, options };
  };
}

/**
 * One parser for pin and unpin. Both take the record id and an optional
 * reason on the proposal, and both take the proposal id and content hash on
 * the approval, exactly as the lifecycle operations do.
 */
function pinParser(command) {
  return (args) => {
    const read = readFlags(args, {
      id: "value",
      why: "value",
      propose: "switch",
      apply: "switch",
      proposal: "value",
      "content-hash": "value",
    });
    if (!read.ok) return read;
    const phase = readPhase(read.values);
    if (!phase.ok) return phase;

    const options = {
      operation: command,
      mode: phase.mode,
      proposalId: phase.proposalId,
      contentHash: phase.contentHash,
    };
    if (phase.mode === "apply") return { ok: true, options };
    if (!read.values.id) return { ok: false, message: `${command} --propose needs --id` };
    options.id = read.values.id;
    if (read.values.why) options.why = read.values.why;
    return { ok: true, options };
  };
}

function parseNoopFlags(args) {
  const read = readFlags(args, { reason: "value" });
  if (!read.ok) return read;
  return { ok: true, options: { reason: read.values.reason ?? "" } };
}

function parseCancelFlags(args) {
  const read = readFlags(args, { proposal: "value" });
  if (!read.ok) return read;
  if (!read.values.proposal) return { ok: false, message: "cancel needs --proposal" };
  return { ok: true, options: { proposalId: read.values.proposal } };
}

/** Read the validate flags. An unknown check id stops the run before it starts. */
function parseValidateFlags(args) {
  const options = { check: null, fixtures: false };
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === "--fixtures") {
      options.fixtures = true;
      continue;
    }
    if (flag === "--check") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        return { ok: false, message: "--check needs a comma-separated list of check ids" };
      }
      index++;
      const ids = value.split(",").map((item) => item.trim()).filter(Boolean);
      const unknown = ids.filter((id) => !checkIds().includes(id));
      if (unknown.length) {
        return { ok: false, message: `unknown check id: ${unknown.join(", ")}` };
      }
      options.check = ids;
      continue;
    }
    return { ok: false, message: `validate does not define the flag ${flag}` };
  }
  return { ok: true, options };
}

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
      status: "error",
      errors: [note(
        "cli/invalid-invocation",
        `${command ? "unknown" : "missing"} operation. This build supports: ${supportedCommands().join(", ")}`,
      )],
    });
  }

  let options = {};
  if (entry.parse) {
    const parsed = entry.parse(args.slice(1), startDir);
    if (!parsed.ok) {
      return envelope({
        operation: entry.operation,
        status: "error",
        errors: [note("cli/invalid-invocation", parsed.message)],
      });
    }
    options = parsed.options;
  } else if (args.length > 1) {
    return envelope({
      operation: entry.operation,
      status: "error",
      errors: [note("cli/invalid-invocation", `${command} defines no flags`)],
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

  const outcome = await entry.run(context, options);
  const errors = Array.isArray(outcome?.errors) ? outcome.errors : [];
  const warnings = [
    ...context.warnings,
    ...(Array.isArray(outcome?.warnings) ? outcome.warnings : []),
  ];

  // An operation that names its own status keeps it, which is how a proposal
  // reports awaiting-approval and a rebuild with nothing to do reports noop.
  let result;
  if (Object.hasOwn(outcome ?? {}, "checks")) result = outcome.checks;
  else if (Object.hasOwn(outcome ?? {}, "status")) result = outcome.result ?? null;
  else result = outcome;

  return envelope({
    operation: entry.operation,
    status: outcome?.status ?? (errors.length ? "refused" : "ok"),
    projectId: context.scope.projectId,
    scopeRoot: context.scope.scopeRoot,
    result,
    warnings,
    errors,
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

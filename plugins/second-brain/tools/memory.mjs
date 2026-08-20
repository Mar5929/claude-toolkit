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
 * This build implements capabilities, status, the retrieval router (search,
 * get, timeline, related, sources, spec-search, spec-get, and the gated
 * session-search), review,
 * validate, update-current, rebuild-views, the seven writing lifecycle
 * operations, pin and unpin, and the noop, cancel, and move plumbing. The
 * other operations are not stubbed, because a stub that answers is worse than
 * one that says it is not here: capabilities reports the whole build state, so
 * an agent reads it instead of guessing. The validator and the review engine
 * follow the same rule inside themselves: a check or a category whose
 * component is not built yet, or which this project gives nothing to inspect,
 * is reported as skipped with the reason, never as a pass. The validator runs
 * every section 4 check, MV-01 through MV-22.
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

import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
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
  crossScopeNote,
  locateCrossScopePath,
  outsideRootNote,
  unknownOrCrossScope,
} from "./lib/cross-scope.mjs";
import {
  INFERRED_STATUSES,
  RECORD_FOLDERS,
  RECORD_STATUSES,
  RECORD_TYPES,
  REQUIRED_CORE,
  legacyGaps,
  parseRecord,
  validateRecord,
  walkRecords,
} from "./lib/record-schema.mjs";
import {
  CURRENT_TRIGGERS,
  JOURNAL_FILE,
  LIFECYCLE_OPERATIONS,
  LOCAL_STATE,
  LOCK_FOLDER,
  MOVE_RECEIPT,
  PIN_OPERATIONS,
  PREIMAGE_FOLDER,
  REVIEW_FOLDER,
  SENSITIVE_SECTION,
  STARTUP_EXPOSURE_SECTION,
  cancel as cancelProposal,
  lifecycle,
  moveRecord,
  noop as noopOutcome,
  phraseHunt,
  pinOperation,
  planViewRebuild,
  readMoveReceipt,
  readPinRegistry,
  rebuildViews,
  recover,
  retiredPhraseSets,
  survivingLinks,
  trackedMarkdown,
  updateCurrent,
} from "./memory-write.mjs";
import {
  DEGRADATION_STEPS,
  assembleBootBrief,
  majorFolders,
  parseMapRows,
} from "./boot-brief.mjs";
import { runGoldSet } from "./gold-set.mjs";
import { runIsolationFixtures, runPrivacyFixtures } from "./isolation-fixtures.mjs";
import { checkMigrationIntegrity } from "./knowledge-layout.mjs";
import {
  resolveLinkTarget,
  scanLinks,
} from "./lib/links.mjs";
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
    feature: "review",
    reason: "review carries the section 17 categories it can judge from the files and reports the gold-set category as skipped until the gold-set runner is wired in",
  },
  {
    feature: "validation",
    reason: "validate runs every section 4 check, MV-01 through MV-22; a check this project gives nothing to inspect reports skipped with the reason",
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
      available: true,
      reason: scope.privacy.level === "sensitive"
        ? "gated: in a sensitive project only an owner request in this session opens session history"
        : "gated: session-search runs only with a reason, either the owner asking or a named insufficiency of the current owners",
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

// ---------------------------------------------------------------------------
// memory_related, architecture section 12.4
// ---------------------------------------------------------------------------

/** The front matter fields that name another record by id. */
const LINK_FIELDS = Object.freeze([
  "based_on",
  "conflicts_with",
  "relates",
  "supersedes",
  "superseded_by",
]);

/**
 * Every record in the scope, read straight from the files, by id and by path.
 * It is built for one call and thrown away: nothing here is a registry, an
 * index, or a cache, and none of it is written down.
 */
function recordIndex(scope) {
  const byId = new Map();
  const byPath = new Map();
  for (const entry of walkRecords(scope.scopeRoot)) {
    // A record sitting in a declared subroot belongs to that scope, not this
    // one, so it never becomes a link target this project can resolve.
    if (!isMemberPath(scope, entry.absolute)) continue;
    const text = readIfPresent(entry.absolute);
    if (text === null) continue;
    const record = parseRecord(text);
    const id = typeof record.data.id === "string" ? record.data.id.trim() : "";
    const held = { id, path: entry.path, text, data: record.data };
    byPath.set(entry.path, held);
    if (id && !byId.has(id)) byId.set(id, held);
  }
  return { byId, byPath };
}

function linkEntry(recordId, path, relation) {
  return { record_id: recordId ?? null, path: path ?? null, relation };
}

function sortLinks(entries) {
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    const key = `${entry.relation}|${entry.record_id ?? ""}|${entry.path ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out.sort((a, b) => (a.path ?? "").localeCompare(b.path ?? "")
    || a.relation.localeCompare(b.relation)
    || (a.record_id ?? "").localeCompare(b.record_id ?? ""));
}

/**
 * memory_related: the links a record carries, and the project records that
 * link back to it. Backlinks are derived by reading the current files, so
 * there is no backlink registry, graph, database, index, or cache to keep in
 * step, and the whole operation works with `.memory/` absent. A candidate in
 * another scope is dropped rather than returned (FR-123).
 */
export function related(context, options) {
  const { scope } = context;
  const wanted = String(options.id ?? "").trim();
  const index = recordIndex(scope);
  const held = index.byId.get(wanted);
  if (!held) {
    return {
      status: "refused",
      errors: [unknownOrCrossScope(scope, context.operation ?? "memory_related", wanted)],
    };
  }

  const outgoing = [];
  for (const field of LINK_FIELDS) {
    for (const target of idList(held.data[field])) {
      outgoing.push(linkEntry(target, index.byId.get(target)?.path ?? null, field));
    }
  }
  for (const link of scanLinks(held.text)) {
    if (!link.relative || link.image) continue;
    const target = resolveLinkTarget(scope.scopeRoot, held.path, link.path);
    if (target === null || target === held.path) continue;
    outgoing.push(linkEntry(index.byPath.get(target)?.id ?? null, target, "links_to"));
  }

  const incoming = [];
  for (const absolute of trackedMarkdown(scope)) {
    if (!isMemberPath(scope, absolute)) continue;
    const from = relativePath(scope, absolute);
    if (from === held.path) continue;
    const text = readIfPresent(absolute);
    if (text === null) continue;

    const fromId = index.byPath.get(from)?.id ?? null;
    const found = [];
    const { data } = parseFrontMatter(text);
    for (const field of LINK_FIELDS) {
      if (idList(data[field]).includes(wanted)) found.push(linkEntry(fromId, from, field));
    }
    for (const link of scanLinks(text)) {
      if (!link.relative || link.image) continue;
      if (resolveLinkTarget(scope.scopeRoot, from, link.path) !== held.path) continue;
      found.push(linkEntry(fromId, from, "links_to"));
    }
    // A file that names the record without linking to it is still a backlink
    // a reader wants, and saying so is honest. A file that already links is
    // reported once, by the link, rather than twice.
    if (found.length === 0 && (text.includes(wanted) || text.includes(held.path))) {
      found.push(linkEntry(fromId, from, "mentions"));
    }
    incoming.push(...found);
  }

  return {
    status: "ok",
    result: {
      id: wanted,
      path: held.path,
      outgoing: sortLinks(outgoing),
      incoming: sortLinks(incoming),
    },
  };
}

// ---------------------------------------------------------------------------
// The retrieval router, architecture section 15
// ---------------------------------------------------------------------------

/** Approved behavior lives here, and it is the first authority of 15.2. */
const SPEC_FOLDER = "knowledge/specs/";

/**
 * The authority order of section 15.2, lowest number first. A candidate's
 * layer is read from what the record itself says: the folder it sits in, its
 * epistemic status, and the kind of evidence it carries. Nothing here is
 * stored on a record or written down anywhere.
 */
const AUTHORITY_ORDER = Object.freeze({
  spec: 1,
  "owner-statement": 2,
  "code-evidence": 3,
  "active-memory": 4,
  observation: 5,
  inference: 6,
});

/** Evidence source types that make a record an owner or client statement. */
const OWNER_SOURCE_TYPES = Object.freeze([
  "owner_statement",
  "client_statement",
  "owner",
  "client",
  "meeting",
]);

/** Evidence source types that make a record repository evidence. */
const CODE_SOURCE_TYPES = Object.freeze([
  "code",
  "commit",
  "config",
  "git",
  "issue",
  "log",
  "pull_request",
  "repository",
  "test",
]);

/** Ties break toward what is current before what is history. */
const STATUS_ORDER = Object.freeze({ active: 0, current: 0, superseded: 1, retired: 2 });

/**
 * Words an owner-worded question carries that say nothing about the subject.
 * They are dropped from the query so a common word cannot pull an unrelated
 * record into the answer, which is the substitution FR-033 refuses. If the
 * whole query is made of them, the query runs literally instead.
 */
const STOPWORDS = new Set([
  "a", "about", "an", "and", "any", "are", "as", "at", "be", "been", "but",
  "by", "can", "did", "do", "does", "for", "from", "had", "has", "have", "how",
  "i", "if", "in", "into", "is", "it", "its", "me", "my", "no", "not", "of",
  "on", "or", "our", "should", "so", "that", "the", "their", "them", "then",
  "there", "these", "this", "to", "up", "us", "was", "we", "were", "what",
  "when", "where", "which", "who", "why", "will", "with", "would", "you",
  "your",
]);

/**
 * Where a term matched, and what that match is worth. A term counts once per
 * field, so a long record cannot outrank a precise one by repetition.
 */
const FIELD_WEIGHTS = Object.freeze({ title: 5, summary: 4, metadata: 3, body: 1 });

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Read a front matter field that holds one block, a list of blocks, or nothing. */
function blockList(value) {
  const entries = Array.isArray(value) ? value : [value];
  return entries.filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry));
}

function textList(value) {
  const entries = Array.isArray(value) ? value : [value];
  return entries
    .map((entry) => String(entry ?? "").trim())
    .filter((entry) => entry && entry !== "null");
}

/**
 * The authority layer of one candidate. A spec outranks everything. After
 * that an unsettled claim ranks itself down, an observation sits below
 * evidenced memory, and the evidence a record cites decides the rest.
 */
function layerFor(data) {
  const epistemic = String(data.epistemic_status ?? "").trim().toLowerCase();
  if (INFERRED_STATUSES.includes(epistemic)) return "inference";
  if (epistemic === "observed") return "observation";

  const types = blockList(data.evidence)
    .map((entry) => String(entry.source_type ?? "").trim().toLowerCase());
  if (types.some((type) => OWNER_SOURCE_TYPES.includes(type))) return "owner-statement";
  if (types.some((type) => CODE_SOURCE_TYPES.includes(type))) return "code-evidence";
  return "active-memory";
}

/**
 * Whether one evidence locator names a file this project actually holds.
 * `null` means the question does not apply, which is what a locator carrying a
 * scheme (a URL, a ticket reference) gets: this build does not reach outside
 * the project to check it. `sources` and the review engine ask the same
 * question, so they read the same answer.
 */
function locatorReach(scope, locator) {
  const text = String(locator ?? "").trim();
  if (!text || /^[a-z][a-z0-9+.-]*:/i.test(text)) return null;
  const absolute = resolve(scope.scopeRoot, text.split("#")[0]);
  return isMemberPath(scope, absolute) && existsSync(absolute);
}

/** What a result rests on, named without copying the record's body. */
function provenanceOf(data) {
  const approval = data.approval && typeof data.approval === "object" && !Array.isArray(data.approval)
    ? data.approval
    : {};
  return {
    epistemic_status: String(data.epistemic_status ?? "").trim() || null,
    recorded_at: String(data.recorded_at ?? "").trim() || null,
    approved_by: String(approval.actor ?? "").trim() || null,
    approved_at: String(approval.approved_at ?? "").trim() || null,
    evidence: blockList(data.evidence).map((entry) => ({
      source_type: String(entry.source_type ?? "").trim() || null,
      locator: String(entry.locator ?? "").trim() || null,
    })),
    based_on: textList(data.based_on),
  };
}

/**
 * The degraded-state warning of section 15.2, or null. A record that is no
 * longer current truth, and a file whose provenance cannot be read, both have
 * to say so on the result rather than in a footnote nobody opens.
 */
function degradedWarning(candidate) {
  const reasons = [];
  if (candidate.kind === "spec" && !candidate.frontMatter) {
    reasons.push("this specification carries no front matter, so its status and provenance are unverified");
  }
  if (candidate.legacy) {
    reasons.push("this record is missing version 2 metadata and stays usable until its next approved touch");
  }
  if (candidate.status === "superseded" || candidate.status === "retired") {
    reasons.push(`this record is ${candidate.status} and is not current truth`);
  }
  if (candidate.kind === "record" && candidate.provenance.evidence.length === 0) {
    reasons.push("this record cites no evidence");
  }
  if (reasons.length === 0) return null;
  return reasons.join(". ");
}

/** One searchable candidate, built for this call and thrown away after it. */
function buildCandidate(kind, path, text) {
  const record = parseRecord(text);
  const data = record.data ?? {};
  const status = String(data.status ?? "").trim().toLowerCase()
    || (kind === "spec" ? "current" : "");
  const candidate = {
    kind,
    path,
    text,
    data,
    frontMatter: record.found,
    legacy: kind === "record" ? legacyGaps(data) !== null : false,
    id: String(data.id ?? "").trim() || null,
    type: String(data.type ?? "").trim() || null,
    status,
    title: record.h1 ?? "",
    summary: record.summary ?? "",
    layer: kind === "spec" ? "spec" : layerFor(data),
    provenance: provenanceOf(data),
  };
  candidate.degraded = degradedWarning(candidate);
  return candidate;
}

/**
 * Every record in the scope as a candidate, plus every specification file. A
 * candidate that belongs to another scope is dropped here, before ranking,
 * and the drop is reported as a warning rather than as a result (FR-123).
 */
function collectCandidates(scope, { records = true, specs = true } = {}) {
  const found = [];
  const warnings = [];
  const unreadable = [];
  let recordFiles = 0;
  let specFiles = 0;

  if (records) {
    for (const entry of walkRecords(scope.scopeRoot)) {
      if (!isMemberPath(scope, entry.absolute)) {
        warnings.push(note(
          "scope/cross-scope-result",
          "a record under this project's memory folder belongs to a declared subroot, so it was dropped",
          { path: entry.path },
        ));
        continue;
      }
      recordFiles++;
      const text = readIfPresent(entry.absolute);
      if (text === null) {
        unreadable.push(entry.path);
        warnings.push(note("startup/missing-source", "the record could not be read", { path: entry.path }));
        continue;
      }
      found.push(buildCandidate("record", entry.path, text));
    }
  }

  if (specs) {
    for (const absolute of trackedMarkdown(scope)) {
      const path = relativePath(scope, absolute);
      if (!path.startsWith(SPEC_FOLDER)) continue;
      if (!isMemberPath(scope, absolute)) {
        warnings.push(note(
          "scope/cross-scope-result",
          "a specification under this project's specs folder belongs to a declared subroot, so it was dropped",
          { path },
        ));
        continue;
      }
      specFiles++;
      const text = readIfPresent(absolute);
      if (text === null) {
        unreadable.push(path);
        warnings.push(note("startup/missing-source", "the specification could not be read", { path }));
        continue;
      }
      found.push(buildCandidate("spec", path, text));
    }
  }

  return { candidates: found, warnings, unreadable, recordFiles, specFiles };
}

/**
 * The scope a retrieval call actually covered, which is what an honest
 * failure names (architecture section 15.6). It is reported whether the
 * answer is empty or not, so a reader never has to guess what was looked at.
 */
function searchedScope(scope, collected, { records = true, specs = true } = {}) {
  const searched = [];
  if (specs) searched.push({ area: "knowledge/specs", files: collected.specFiles });
  if (records) searched.push({ area: "knowledge/memory", files: collected.recordFiles });
  searched.push({ area: "direct-file search", available: true });
  searched.push({
    area: "tracker",
    available: false,
    reason: readTracker(scope) === null
      ? "no tracker is configured in knowledge/project.md"
      : "the retrieval router does not call the tracker adapter",
  });
  searched.push({
    area: "session-history",
    available: false,
    reason: "session-history is tier 5 and gated, so a curated search never reaches it. Run session-search with a reason.",
  });
  for (const path of collected.unreadable) {
    searched.push({ area: path, available: false, reason: "the file could not be read" });
  }
  return searched;
}

/**
 * Read a query into terms. Quoted text stays one phrase. An unclosed quote or
 * a query with nothing searchable in it is a parse error at exit 2, never an
 * empty result (contracts section 1.4).
 */
function parseQuery(raw) {
  const text = String(raw ?? "");
  if ((text.match(/"/g) ?? []).length % 2 === 1) {
    return { ok: false, message: "the query has an unclosed quotation mark" };
  }

  const phrases = [];
  const remainder = text.replace(/"([^"]*)"/g, (_match, inner) => {
    const phrase = inner.trim().toLowerCase();
    if (phrase) phrases.push(phrase);
    return " ";
  });

  const words = remainder
    .toLowerCase()
    .split(/[^\p{L}\p{N}_.\-/]+/u)
    .map((word) => word.replace(/^[.\-/]+|[.\-/]+$/g, ""))
    .filter(Boolean);

  const all = [...new Set([...phrases, ...words])];
  if (all.length === 0) {
    return { ok: false, message: "the query holds no searchable term" };
  }
  const meaningful = all.filter((term) => !STOPWORDS.has(term));
  return { ok: true, terms: meaningful.length ? meaningful : all };
}

/** The metadata a term may match, kept apart from the record's prose. */
function metadataText(candidate) {
  return [
    candidate.id ?? "",
    candidate.path,
    String(candidate.data.domain ?? ""),
    textList(candidate.data.topics).join(" "),
    textList(candidate.data.entities).join(" "),
  ].join(" ").toLowerCase();
}

/** Score one candidate against the query terms. Zero means no match at all. */
function scoreCandidate(candidate, terms) {
  const fields = {
    title: candidate.title.toLowerCase(),
    summary: candidate.summary.toLowerCase(),
    metadata: metadataText(candidate),
    body: candidate.text.toLowerCase(),
  };

  let score = 0;
  const matched = [];
  const where = [];
  for (const term of terms) {
    let hit = false;
    for (const [field, haystack] of Object.entries(fields)) {
      if (!haystack.includes(term)) continue;
      score += FIELD_WEIGHTS[field];
      hit = true;
      if (!where.includes(field)) where.push(field);
    }
    if (hit) matched.push(term);
  }
  return { score, matched, fields: where };
}

/** The section 15.2 minimum result contract, in a fixed field order. */
function retrievalResult(scope, candidate, matchReason, extra = {}) {
  const result = {
    project_id: scope.projectId,
    layer: candidate.layer,
    record_id: candidate.id,
    path: candidate.path,
    status: candidate.status,
    summary: candidate.summary,
    provenance: candidate.provenance,
    match_reason: matchReason,
    ...extra,
  };
  if (candidate.degraded) result.degraded_warning = candidate.degraded;
  return result;
}

/**
 * Rank by relevance first, then by the section 15.2 authority order, then by
 * the weighted score, then by what is current, then by path. Relevance is how
 * many of the query's terms the candidate answers. Two candidates that answer
 * the same terms are equally relevant, which is the case FR-031 settles in
 * favor of the specification or the primary source. The last keys make the
 * order total, so the same project answers the same question the same way
 * every time.
 */
function rankMatches(matches) {
  return matches.sort((a, b) => b.matched.length - a.matched.length
    || AUTHORITY_ORDER[a.candidate.layer] - AUTHORITY_ORDER[b.candidate.layer]
    || b.score - a.score
    || (STATUS_ORDER[a.candidate.status] ?? 3) - (STATUS_ORDER[b.candidate.status] ?? 3)
    || a.candidate.path.localeCompare(b.candidate.path));
}

/** Apply the search filters. An unknown value is exit 2, never a quiet drop. */
function applyFilters(candidates, options) {
  if (options.type !== null && !RECORD_TYPES.includes(options.type)) {
    return {
      ok: false,
      error: note(
        "retrieval/unsupported-filter",
        `--type ${options.type} is not one of ${RECORD_TYPES.join(", ")}`,
      ),
    };
  }
  if (options.status !== null && !RECORD_STATUSES.includes(options.status)) {
    return {
      ok: false,
      error: note(
        "retrieval/unsupported-filter",
        `--status ${options.status} is not one of ${RECORD_STATUSES.join(", ")}`,
      ),
    };
  }

  const domain = options.domain === null ? null : options.domain.toLowerCase();
  const topic = options.topic === null ? null : options.topic.toLowerCase();

  const kept = candidates.filter((candidate) => {
    if (options.type !== null && candidate.type !== options.type) return false;
    if (options.status !== null) {
      if (candidate.status !== options.status) return false;
    } else if (candidate.kind === "record" && candidate.status !== "active") {
      // A superseded or retired record is history, not current truth, so it
      // answers only a question that asks for it (FR-025).
      return false;
    }
    if (domain !== null && String(candidate.data.domain ?? "").trim().toLowerCase() !== domain) {
      return false;
    }
    if (topic !== null
      && !textList(candidate.data.topics).map((entry) => entry.toLowerCase()).includes(topic)) {
      return false;
    }
    return true;
  });

  return { ok: true, candidates: kept };
}

/**
 * memory_search: tier 2, curated project search over canonical Markdown. It
 * opens whole records rather than detached chunks, drops out-of-scope
 * candidates before ranking, and leaves an empty answer empty.
 */
function searchOperation(context, options, { specsOnly = false } = {}) {
  const { scope } = context;
  const query = parseQuery(options.query);
  if (!query.ok) {
    return { status: "error", errors: [note("retrieval/parse-error", query.message)] };
  }

  const areas = specsOnly ? { records: false, specs: true } : { records: true, specs: true };
  const collected = collectCandidates(scope, areas);
  const searched = searchedScope(scope, collected, areas);

  const filtered = applyFilters(collected.candidates, options);
  if (!filtered.ok) {
    return { status: "error", errors: [filtered.error], warnings: collected.warnings, searched };
  }

  const matches = [];
  for (const candidate of filtered.candidates) {
    const scored = scoreCandidate(candidate, query.terms);
    if (scored.score === 0) continue;
    matches.push({ candidate, ...scored });
  }

  const ranked = rankMatches(matches).slice(0, options.limit);
  const result = ranked.map((match) => retrievalResult(
    scope,
    match.candidate,
    `matched ${match.matched.join(", ")} in ${match.fields.join(", ")} (score ${match.score})`,
  ));

  return { status: "ok", result, warnings: collected.warnings, searched };
}

function specSearchOperation(context, options) {
  return searchOperation(context, options, { specsOnly: true });
}

/**
 * memory_get: tier 1 exact lookup. It returns the whole record, its front
 * matter, and the section 15.2 result fields, so a consequential answer can
 * open the record rather than trust a search line about it.
 */
function getOperation(context, options, { specsOnly = false } = {}) {
  const { scope } = context;
  const areas = specsOnly ? { records: false, specs: true } : { records: true, specs: true };
  const collected = collectCandidates(scope, areas);
  const searched = searchedScope(scope, collected, areas);
  const warnings = [...collected.warnings];

  let found = null;
  let reason = "";

  const operation = context.operation ?? (specsOnly ? "spec_get" : "memory_get");

  if (options.path !== null) {
    const absolute = resolve(scope.scopeRoot, options.path);
    if (!isMemberPath(scope, absolute)) {
      // Inside the root but owned by a declared subroot is a cross-scope
      // answer. Not beneath the root at all is scope/outside-root, which is
      // where a symlink escape and a similarly named sibling land.
      const foreign = locateCrossScopePath(scope, options.path);
      return {
        status: "refused",
        errors: [foreign
          ? crossScopeNote(scope, operation, foreign)
          : outsideRootNote(scope, operation, options.path)],
        warnings,
        searched,
      };
    }
    const wanted = relativePath(scope, absolute);
    if (specsOnly && !wanted.startsWith(SPEC_FOLDER)) {
      return {
        status: "refused",
        errors: [note(
          "record/unknown-id",
          `${wanted} is not a specification, so spec-get does not answer for it`,
          { path: wanted },
        )],
        warnings,
        searched,
      };
    }
    found = collected.candidates.find((candidate) => candidate.path === wanted) ?? null;
    if (!found) {
      // A canonical file the walk does not carry, such as a specification
      // named by path when only records were collected, is still readable.
      const text = isMemberPath(scope, absolute) ? readIfPresent(absolute) : null;
      if (text !== null && wanted.endsWith(".md")) {
        found = buildCandidate(wanted.startsWith(SPEC_FOLDER) ? "spec" : "record", wanted, text);
      }
    }
    reason = "exact lookup by path";
  } else {
    const wanted = String(options.id ?? "").trim();
    found = collected.candidates.find((candidate) => candidate.id === wanted) ?? null;
    if (!found && specsOnly) {
      // A specification file with no front matter is named by its file stem,
      // because that is the only stable id such a file has.
      found = collected.candidates.find((candidate) => {
        const stem = candidate.path.slice(SPEC_FOLDER.length).replace(/\.md$/, "");
        return stem === wanted || stem.split("/").pop() === wanted;
      }) ?? null;
    }
    reason = "exact lookup by record id";
  }

  if (!found) {
    if (options.path === null) {
      const wanted = String(options.id ?? "").trim();
      const refusal = unknownOrCrossScope(scope, operation, wanted);
      if (refusal.code === "record/unknown-id" && specsOnly) {
        refusal.message = `no specification in this scope carries the id ${wanted}`;
      }
      return { status: "refused", errors: [refusal], warnings, searched };
    }
    return {
      status: "refused",
      errors: [note(
        "record/unknown-id",
        `no canonical Markdown file sits at ${options.path} in this scope`,
        { path: options.path },
      )],
      warnings,
      searched,
    };
  }

  return {
    status: "ok",
    result: retrievalResult(scope, found, reason, {
      title: found.title || null,
      front_matter: found.data,
      body: found.text,
    }),
    warnings,
    searched,
  };
}

function specGetOperation(context, options) {
  return getOperation(context, options, { specsOnly: true });
}

/**
 * session_search, tier 5 of architecture section 15.5 and contract 2.21.
 *
 * The adapter itself is the session-search skill's script, which reads the
 * host's own store in place. This operation resolves the project scope, hands
 * the gate its reason, and turns the adapter's answer into the one envelope
 * every operation prints. It copies nothing, indexes nothing, summarizes
 * nothing, and writes nothing.
 *
 * The adapter is imported on the call rather than at module load, because a
 * capabilities or status run has no business reading the transcript reader.
 */
async function sessionSearchOperation(context, options) {
  const { scope } = context;
  const operation = context.operation ?? "session_search";

  let adapter;
  try {
    adapter = await import("../skills/session-search/scripts/search-sessions.mjs");
  } catch (error) {
    return {
      status: "error",
      errors: [note(
        "retrieval/parse-error",
        `the session-history adapter could not be loaded: ${error.code ?? "import failed"}`,
      )],
    };
  }

  let answer;
  try {
    answer = await adapter.searchSessionsGated({
      query: options.query,
      reason: options.reason,
      projectDir: scope.scopeRoot,
      projectId: scope.projectId,
      sensitiveProject: scope.privacy.level === "sensitive",
      since: options.from,
      until: options.to,
    });
  } catch (error) {
    return { status: "error", errors: [note("retrieval/parse-error", error.message)] };
  }

  const covered = {
    machine: answer.machine ?? answer.scope?.machine ?? null,
    host: answer.host ?? answer.scope?.host ?? null,
    from: options.from,
    to: options.to,
  };
  const searched = [{
    area: "session-history",
    available: true,
    machine: covered.machine,
    host: covered.host,
    project_id: scope.projectId,
    from: covered.from,
    to: covered.to,
  }];

  if (answer.status === "refused") {
    return {
      status: "refused",
      errors: [note("history/gate-closed", answer.message, {
        detail: `resolved scope root ${scope.scopeRoot}`,
      })],
      searched,
    };
  }

  // A host or machine this session cannot reach is a scoped miss, not a
  // failure: nothing was found in the scope actually covered, which is the
  // only honest thing to say (contract 2.21, architecture section 15.6).
  const askedElsewhere = (options.host !== null && options.host !== covered.host)
    || (options.machine !== null && options.machine !== covered.machine);

  if (answer.status === "unavailable" || askedElsewhere) {
    const message = askedElsewhere
      ? `this session can read only host ${covered.host} on machine ${covered.machine}.`
      : (answer.warnings?.[0]?.message ?? "no searchable session history is available.");
    return {
      status: "ok",
      result: [],
      warnings: [note(
        "history/unavailable",
        `${message} Covered machine ${covered.machine}, host ${covered.host}, project ${scope.projectId}, dates ${covered.from ?? "any"} to ${covered.to ?? "any"}.`,
      )],
      searched,
    };
  }

  const entries = Array.isArray(answer.entries) ? answer.entries : [];
  const warnings = entries.length ? [] : [note(
    "history/unavailable",
    `nothing matched in the scope searched. Covered machine ${covered.machine}, host ${covered.host}, project ${scope.projectId}, dates ${covered.from ?? "any"} to ${covered.to ?? "any"}. Nothing found here is not the same as the subject never being discussed.`,
  )];

  return { status: "ok", result: entries, warnings, searched };
}

/**
 * memory_timeline: the dated sequence for one entity, oldest first. It
 * includes superseded and retired records on purpose, because a history
 * question is exactly the question those records still answer (section 14).
 */
function timelineOperation(context, options) {
  const { scope } = context;
  for (const [flag, value] of [["--from", options.from], ["--to", options.to]]) {
    if (value !== null && !DATE_ONLY.test(value)) {
      return {
        status: "error",
        errors: [note("retrieval/parse-error", `${flag} is not a YYYY-MM-DD date`)],
      };
    }
  }

  const entity = String(options.entity ?? "").trim().toLowerCase();
  const areas = { records: true, specs: false };
  const collected = collectCandidates(scope, areas);
  const searched = searchedScope(scope, collected, areas);

  const entries = [];
  for (const candidate of collected.candidates) {
    const named = textList(candidate.data.entities).map((value) => value.toLowerCase());
    if (!named.includes(entity)) continue;

    const occurred = String(candidate.data.occurred_at ?? "").trim() || null;
    const from = String(candidate.data.effective_from ?? "").trim() || null;
    const recorded = String(candidate.data.recorded_at ?? "").trim() || null;
    const when = occurred ?? from ?? recorded ?? "";
    if (options.from !== null && when && when < options.from) continue;
    if (options.to !== null && when && when > options.to) continue;

    entries.push({
      record_id: candidate.id,
      type: candidate.type,
      status: candidate.status,
      effective_from: from,
      effective_to: String(candidate.data.effective_to ?? "").trim() || null,
      occurred_at: occurred,
      summary: candidate.summary,
      project_id: scope.projectId,
      layer: candidate.layer,
      path: candidate.path,
      sort_key: when,
      ...(candidate.degraded ? { degraded_warning: candidate.degraded } : {}),
    });
  }

  entries.sort((a, b) => a.sort_key.localeCompare(b.sort_key)
    || (a.record_id ?? "").localeCompare(b.record_id ?? "")
    || a.path.localeCompare(b.path));
  for (const entry of entries) delete entry.sort_key;

  return { status: "ok", result: entries, warnings: collected.warnings, searched };
}

/**
 * memory_sources: what a record rests on, so a consequential answer can
 * follow provenance to the original evidence (section 15.3). A locator that
 * names a path inside the project is checked; one that names anything else is
 * reported as unchecked rather than as missing.
 */
function sourcesOperation(context, options) {
  const { scope } = context;
  const areas = { records: true, specs: true };
  const collected = collectCandidates(scope, areas);
  const searched = searchedScope(scope, collected, areas);
  const warnings = [...collected.warnings];

  const wanted = String(options.id ?? "").trim();
  const found = collected.candidates.find((candidate) => candidate.id === wanted) ?? null;
  if (!found) {
    return {
      status: "refused",
      errors: [unknownOrCrossScope(scope, context.operation ?? "memory_sources", wanted)],
      warnings,
      searched,
    };
  }

  const evidence = blockList(found.data.evidence).map((entry) => {
    const locator = String(entry.locator ?? "").trim() || null;
    const reachable = locatorReach(scope, locator);
    if (reachable === false) {
      warnings.push(note(
        "startup/missing-source",
        "a cited source is not reachable inside this project",
        { path: found.path, detail: locator },
      ));
    }
    return {
      source_type: String(entry.source_type ?? "").trim() || null,
      locator,
      observed_at: String(entry.observed_at ?? "").trim() || null,
      retrieved_at: String(entry.retrieved_at ?? "").trim() || null,
      version: String(entry.version ?? "").trim() || null,
      note: String(entry.note ?? "").trim() || null,
      reachable,
    };
  });

  const basedOn = [];
  for (const id of textList(found.data.based_on)) {
    const other = collected.candidates.find((candidate) => candidate.id === id) ?? null;
    if (!other) {
      warnings.push(note(
        "record/unknown-id",
        `based_on names ${id} and no record in this scope carries that id`,
        { path: found.path },
      ));
      basedOn.push({ record_id: id, path: null, status: null, summary: null });
      continue;
    }
    basedOn.push({
      record_id: other.id,
      path: other.path,
      status: other.status,
      summary: other.summary,
    });
  }

  return {
    status: "ok",
    result: retrievalResult(scope, found, `the evidence ${wanted} rests on`, {
      evidence,
      based_on: basedOn,
    }),
    warnings,
    searched,
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

/** Every canonical Markdown file: the knowledge tree inside this scope. */
function canonicalMarkdown(scope) {
  return trackedMarkdown(scope)
    .filter((absolute) => isMemberPath(scope, absolute))
    .map((absolute) => relativePath(scope, absolute))
    .filter((path) => path.startsWith("knowledge/"));
}

/**
 * MV-21, relative-link syntax and resolvable targets. Architecture section
 * 12.4 gives canonical records ordinary relative Markdown links with explicit
 * .md targets, so a relative link that names anything else, or that names a
 * file which is not there, is repair work.
 */
function checkRelativeLinks(scope) {
  const findings = [];
  for (const path of canonicalMarkdown(scope)) {
    const text = readIfPresent(resolve(scope.scopeRoot, path));
    if (text === null) continue;
    for (const link of scanLinks(text)) {
      if (link.image || !link.relative) continue;
      if (!link.path.endsWith(".md")) {
        findings.push(note(
          "record/schema-invalid",
          `line ${link.line} is a relative link with no explicit .md target`,
          { path, detail: link.path },
        ));
        continue;
      }
      const target = resolveLinkTarget(scope.scopeRoot, path, link.path);
      if (target === null || !existsSync(resolve(scope.scopeRoot, target))) {
        findings.push(note(
          "record/schema-invalid",
          `line ${link.line} links to a file that is not there`,
          { path, detail: link.path },
        ));
      }
    }
  }
  return { status: findings.length ? "fail" : "pass", findings, skipped_because: null };
}

/**
 * MV-22, complete incoming-link repair after a move or rename. It reads the
 * outcome the last move recorded under `.memory/` and inspects the repository
 * against it: an applied move leaves no link to the old path, and a restored
 * one leaves the old path exactly where it was. A project that has never moved
 * a record has nothing to inspect and says so rather than reporting a pass.
 */
function checkMoveRepair(scope) {
  const receipt = readMoveReceipt(scope);
  if (!receipt) {
    return {
      status: "skipped",
      findings: [],
      skipped_because: "this project holds no record of a move to inspect",
    };
  }

  const findings = [];
  if (receipt.status === "applied") {
    if (!existsSync(resolve(scope.scopeRoot, receipt.new_path))) {
      findings.push(note(
        "record/unknown-id",
        "the moved record is not at the path the last move reported",
        { path: receipt.new_path },
      ));
    }
    for (const found of survivingLinks(scope, receipt.old_path)) {
      findings.push(note(
        "record/schema-invalid",
        `line ${found.line} still links to the path the last move left behind`,
        { path: found.path, detail: receipt.old_path },
      ));
    }
  } else {
    if (!existsSync(resolve(scope.scopeRoot, receipt.old_path))) {
      findings.push(note(
        "record/schema-invalid",
        "a restored move left nothing at the old path",
        { path: receipt.old_path },
      ));
    }
    if (existsSync(resolve(scope.scopeRoot, receipt.new_path))) {
      findings.push(note(
        "record/schema-invalid",
        "a restored move left a file at the new path",
        { path: receipt.new_path },
      ));
    }
  }

  return { status: findings.length ? "fail" : "pass", findings, skipped_because: null };
}

// ---------------------------------------------------------------------------
// The rest of the section 4 checks
// ---------------------------------------------------------------------------

/** The two host startup routes of contracts section 5, by where they live. */
const CLAUDE_SETTINGS = ".claude/settings.json";
const CODEX_ROUTE_FILE = "AGENTS.md";
const CODEX_ROUTE_START = "<!-- second-brain:startup-route:start -->";
const CODEX_ROUTE_END = "<!-- second-brain:startup-route:end -->";

/** The four skills every host route names, per contracts section 5.3. */
const ROUTE_SKILLS = Object.freeze(["remember", "recall", "cleanup", "session-search"]);

/** The paths a route has to say are guarded, per contracts section 5.3 item 4. */
const ROUTE_GUARDED = Object.freeze([
  "knowledge/memory/",
  "knowledge/specs/",
  "knowledge/current.md",
]);

/** The markers around the block CLAUDE.md and AGENTS.md both carry. */
const SHARED_BLOCK_START = "<!-- shared-with-agents-md:start -->";
const SHARED_BLOCK_END = "<!-- shared-with-agents-md:end -->";

/** Evidence source types that name a tracker item rather than a durable source. */
const TRACKER_SOURCE_TYPES = Object.freeze([
  "tracker",
  "tracker_item",
  "work_item",
  "issue",
  "ticket",
  "board",
  "card",
  "backlog_item",
]);

/**
 * The fixed secret pattern set of architecture section 21.7. Each entry has an
 * id, because a finding names the pattern that matched and never the text that
 * matched it.
 */
const SECRET_PATTERNS = Object.freeze([
  { id: "private-key-block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { id: "aws-access-key-id", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: "github-token", pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { id: "slack-token", pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  { id: "connection-string-password", pattern: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:[^\s:@/]+@/i },
  {
    id: "environment-assignment",
    pattern: /\b[A-Za-z0-9_]*(secret|token|password|passwd|api[_-]?key)[A-Za-z0-9_]*\s*[:=]\s*["']?[A-Za-z0-9_\-/+.]{12,}/i,
  },
]);

/** Only the local-state kinds contracts section 2.23.1 defines may sit under `.memory/`. */
const LOCAL_STATE_KINDS = Object.freeze([REVIEW_FOLDER, LOCK_FOLDER, JOURNAL_FILE, PREIMAGE_FOLDER, MOVE_RECEIPT]);

/**
 * Every file inside the scope, by path, with its size and modification time.
 * It is built for one comparison and thrown away. `.git` and installed
 * dependencies are skipped: they are not this project's knowledge and walking
 * them would make a read run slower than the thing it is proving.
 */
function projectFingerprint(root) {
  const seen = new Map();
  const walk = (directory) => {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      const path = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) {
        seen.set(path, "symlink");
        continue;
      }
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      try {
        const stat = statSync(path);
        seen.set(path, `${stat.size}:${stat.mtimeMs}`);
      } catch {
        seen.set(path, "unreadable");
      }
    }
  };
  walk(root);
  return seen;
}

/** Paths that appeared, disappeared, or changed between two fingerprints. */
function fingerprintDiff(before, after) {
  const changed = [];
  for (const [path, stamp] of after) {
    if (!before.has(path)) changed.push({ path, state: "created" });
    else if (before.get(path) !== stamp) changed.push({ path, state: "changed" });
  }
  for (const path of before.keys()) {
    if (!after.has(path)) changed.push({ path, state: "removed" });
  }
  return changed;
}

/** Every symbolic link inside the knowledge tree and the local-state folder. */
function scopeSymlinks(scope) {
  const found = [];
  const walk = (directory) => {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) {
        found.push(path);
        continue;
      }
      if (entry.isDirectory()) walk(path);
    }
  };
  for (const area of ["knowledge", LOCAL_STATE]) {
    const base = resolve(scope.scopeRoot, area);
    if (isDirectory(base)) walk(base);
  }
  return found;
}

/**
 * Read one host startup route. `present` says the project installed it at all,
 * which is what separates a v1 project with nothing to inspect from a v2
 * project whose route is incomplete.
 */
function claudeRoute(scope) {
  const path = resolve(scope.scopeRoot, CLAUDE_SETTINGS);
  const text = readIfPresent(path);
  if (text === null) return { host: "claude-code", present: false, reason: "the project has no .claude/settings.json" };

  let settings;
  try {
    settings = JSON.parse(text);
  } catch {
    return { host: "claude-code", present: false, reason: ".claude/settings.json is not readable JSON" };
  }

  const commands = [];
  const hooks = settings.hooks && typeof settings.hooks === "object" ? settings.hooks : {};
  for (const entry of Array.isArray(hooks.SessionStart) ? hooks.SessionStart : []) {
    for (const hook of Array.isArray(entry?.hooks) ? entry.hooks : []) {
      if (typeof hook?.command === "string") commands.push(hook.command);
    }
  }
  const registered = commands.filter((command) => command.includes("boot-brief"));
  if (registered.length === 0) {
    return {
      host: "claude-code",
      present: false,
      reason: "no SessionStart hook in .claude/settings.json runs the version 2 boot brief",
    };
  }
  return { host: "claude-code", present: true, path: CLAUDE_SETTINGS, commands: registered };
}

function codexRoute(scope) {
  const path = resolve(scope.scopeRoot, CODEX_ROUTE_FILE);
  const text = readIfPresent(path);
  if (text === null) return { host: "codex", present: false, reason: "the project has no AGENTS.md" };
  const start = text.indexOf(CODEX_ROUTE_START);
  const end = text.indexOf(CODEX_ROUTE_END);
  if (start === -1 || end === -1 || end < start) {
    return {
      host: "codex",
      present: false,
      reason: "AGENTS.md carries no version 2 startup-route block between its markers",
    };
  }
  return {
    host: "codex",
    present: true,
    path: CODEX_ROUTE_FILE,
    block: text.slice(start + CODEX_ROUTE_START.length, end),
  };
}

/**
 * MV-01, both halves. The files half reads the required core of architecture
 * section 7. The route half reads whichever host routes the project installed
 * and asks each one for the meaning contracts section 5.3 requires. A project
 * that has installed neither route has nothing to inspect, which is reported
 * as a skipped half rather than as a pass it never earned.
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

  const routes = [claudeRoute(scope), codexRoute(scope)];
  const installed = routes.filter((route) => route.present);

  for (const route of installed) {
    if (route.host === "claude-code") {
      // The Claude Code route is a program, so what the check can read is
      // whether the registered hook is really there. What it renders is MV-07.
      for (const command of route.commands) {
        const named = command.split(/\s+/).find((word) => word.includes("boot-brief"));
        const resolved = named ? resolve(scope.scopeRoot, named.replace(/^["']|["']$/g, "")) : null;
        if (resolved && !existsSync(resolved) && !named.includes("${")) {
          findings.push(note(
            "startup/missing-source",
            "the registered SessionStart hook names a file that is not there",
            { path: route.path, detail: named },
          ));
        }
      }
      continue;
    }

    const block = route.block.toLowerCase();
    if (!block.includes("boot-brief")) {
      findings.push(note("record/schema-invalid", "the Codex startup route does not run the boot brief first", { path: route.path }));
    }
    if (!block.includes("memory.mjs") || !block.includes("capabilities")) {
      findings.push(note("record/schema-invalid", "the Codex startup route does not name the memory tool path and how to ask for capabilities", { path: route.path }));
    }
    for (const skill of ROUTE_SKILLS) {
      if (!block.includes(skill)) {
        findings.push(note("record/schema-invalid", `the Codex startup route does not name the ${skill} skill`, { path: route.path }));
      }
    }
    for (const guarded of ROUTE_GUARDED) {
      if (!block.includes(guarded)) {
        findings.push(note("record/schema-invalid", `the Codex startup route does not name ${guarded} as a guarded path`, { path: route.path }));
      }
    }
    if (!block.includes("approval") && !block.includes("approve") && !block.includes("approved")) {
      findings.push(note("record/schema-invalid", "the Codex startup route does not say that approval comes from the owner", { path: route.path }));
    }
  }

  return {
    status: findings.length ? "fail" : "pass",
    findings,
    skipped_because: installed.length
      ? null
      : `the route half of this check has nothing to inspect: ${routes.map((route) => route.reason).join("; ")}`,
  };
}

/**
 * MV-02, shared root-block meaning and checked-copy drift. The two root files
 * carry one block between the same markers, and the block is the only place
 * they are required to agree. Schema 2.0 defines no way to declare another
 * copy pair, so this pair is the whole check.
 */
function checkSharedBlock(scope) {
  const files = ["CLAUDE.md", CODEX_ROUTE_FILE];
  const blocks = files.map((path) => {
    const text = readIfPresent(resolve(scope.scopeRoot, path));
    if (text === null) return { path, state: "absent" };
    const normalized = text.replace(/\r\n/g, "\n");
    const start = normalized.indexOf(SHARED_BLOCK_START);
    const end = normalized.indexOf(SHARED_BLOCK_END);
    if (start === -1 || end === -1 || end < start) return { path, state: "unmarked" };
    return {
      path,
      state: "present",
      lines: normalized
        .slice(start + SHARED_BLOCK_START.length, end)
        .split("\n")
        .map((line) => line.replace(/\s+/g, " ").trim())
        .filter(Boolean),
    };
  });

  const present = blocks.filter((block) => block.state === "present");
  if (present.length === 0) {
    return {
      status: "skipped",
      findings: [],
      skipped_because: "neither root instruction file carries a marked shared block to compare",
    };
  }
  if (present.length === 1) {
    const missing = blocks.find((block) => block.state !== "present");
    return {
      status: "fail",
      findings: [note(
        "record/schema-invalid",
        `${present[0].path} carries the shared block and ${missing.path} is ${missing.state}, so one host reads meaning the other never sees`,
        { path: missing.path },
      )],
      skipped_because: null,
    };
  }

  const [first, second] = present;
  const findings = [];
  const length = Math.max(first.lines.length, second.lines.length);
  for (let index = 0; index < length; index++) {
    if (first.lines[index] === second.lines[index]) continue;
    findings.push(note(
      "record/schema-invalid",
      `the shared block differs from ${second.path} at block line ${index + 1}, so the two hosts carry different meaning`,
      { path: first.path, detail: `${first.lines.length} lines against ${second.lines.length}` },
    ));
    break;
  }
  return { status: findings.length ? "fail" : "pass", findings, skipped_because: null };
}

/**
 * MV-07, startup budget and safe degradation. It renders the brief this
 * project would actually assemble and reads three things: that the degradation
 * steps ran in the fixed section 10.4 order, that nothing required was dropped
 * to fit, and that an over-budget required set is reported with its exact byte
 * count. Running long is a warning, because the brief is right to run long
 * rather than hide a required block.
 */
function checkStartupBudget(scope) {
  const brief = assembleBootBrief({ projectRoot: scope.scopeRoot });
  if (!brief.ok) {
    return {
      status: "fail",
      findings: [note("startup/missing-source", `the boot brief could not be assembled: ${brief.message}`, {
        path: "knowledge/project.md",
      })],
      skipped_because: null,
    };
  }

  const findings = [];
  const expected = DEGRADATION_STEPS.slice(0, brief.applied.length).join(",");
  if (brief.applied.join(",") !== expected) {
    findings.push(note(
      "record/schema-invalid",
      `startup degraded in the order ${brief.applied.join(", ")} and section 10.4 fixes the order as ${DEGRADATION_STEPS.join(", ")}`,
      { path: "knowledge/project.md" },
    ));
  }

  const required = [
    "1. Identity and operating route",
    "2. Project purpose",
    "4. Latest authored handoff",
    "5. Current state",
    "7. Pinned memory",
    "9. Memory contract, skills, and tools",
  ];
  for (const heading of required) {
    if (!brief.text.includes(`## ${heading}`)) {
      findings.push(note(
        "record/schema-invalid",
        `the rendered brief is missing the required block ${heading}`,
        { path: "knowledge/current.md" },
      ));
    }
  }

  if (findings.length) return { status: "fail", findings, skipped_because: null };
  if (brief.overBudget) {
    return {
      status: "warn",
      findings: [note(
        "startup/over-budget",
        `the required startup blocks are ${brief.bytes} bytes and the configured budget is ${brief.budget} bytes`,
        { path: "knowledge/project.md" },
      )],
      skipped_because: null,
    };
  }
  return { status: "pass", findings: [], skipped_because: null };
}

/**
 * MV-09, derived-artifact inputs, fingerprints, and hand edits. A default v2
 * project approves no artifact, so the check reports skipped rather than a
 * pass over nothing.
 */
function checkGeneratedViews(scope) {
  const planned = planViewRebuild(scope);
  if (planned.artifacts.length === 0 && planned.errors.length === 0) {
    return {
      status: "skipped",
      findings: [],
      skipped_because: "this project has approved no generated artifact to inspect",
    };
  }

  const findings = [...planned.errors];
  for (const artifact of planned.artifacts) {
    if (readIfPresent(resolve(scope.scopeRoot, artifact.path)) === artifact.contents) continue;
    findings.push(note(
      "record/schema-invalid",
      "the generated artifact does not match what its declared inputs produce, so it is stale or hand edited",
      { path: artifact.path },
    ));
  }
  return { status: findings.length ? "warn" : "pass", findings, skipped_because: null };
}

/**
 * MV-10, map coverage for major folders. A mapped path that is gone sends an
 * agent to a folder that is not there, and a major folder the map never
 * mentions is a place nobody was told about. Both are the owner's call, which
 * is why this check warns.
 */
function checkMapCoverage(scope) {
  const text = readIfPresent(resolve(scope.scopeRoot, "knowledge/map.md"));
  if (text === null) {
    return {
      status: "warn",
      findings: [note("startup/missing-source", "knowledge/map.md is missing, so no role has a stated home", {
        path: "knowledge/map.md",
      })],
      skipped_because: null,
    };
  }

  const findings = [];
  const rows = parseMapRows(text);
  for (const row of rows) {
    if (!row.path || row.path.toLowerCase() === "not present") continue;
    if (existsSync(resolve(scope.scopeRoot, row.path))) continue;
    findings.push(note(
      "record/schema-invalid",
      `the map sends ${row.role} to a path that is not there`,
      { path: "knowledge/map.md", detail: row.path },
    ));
  }

  const mapped = new Set(majorFolders(rows).map((folder) => folder.replace(/\/$/, "")));
  for (const entry of readdirSync(scope.scopeRoot, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const absolute = resolve(scope.scopeRoot, entry.name);
    if (!isMemberPath(scope, absolute)) continue;
    if (entry.name === "knowledge" || mapped.has(entry.name)) continue;
    findings.push(note(
      "record/schema-invalid",
      `the map does not mention the folder ${entry.name}/, so nothing says what it holds`,
      { path: "knowledge/map.md", detail: `${entry.name}/` },
    ));
  }
  return { status: findings.length ? "warn" : "pass", findings, skipped_because: null };
}

/**
 * MV-11, domain and topic vocabulary and usage. The review engine already
 * judges vocabulary for the cleanup worklist, so the validator reads the same
 * judgment rather than carrying a second opinion about the same values.
 */
function checkVocabulary(scope) {
  const collected = collectCandidates(scope, { records: true, specs: false });
  const records = collected.candidates.filter((candidate) => candidate.kind === "record");
  if (records.length === 0) {
    return {
      status: "skipped",
      findings: [],
      skipped_because: "this project holds no records, so it has no vocabulary to inspect",
    };
  }
  const findings = reviewVocabulary(records).map((item) => note(
    "record/schema-invalid",
    item.what_is_wrong,
    { path: item.paths[0] ?? "knowledge/memory" },
  ));
  return { status: findings.length ? "warn" : "pass", findings, skipped_because: null };
}

/** The section 15.2 minimum contract, by field name, so one list judges it. */
const RESULT_CONTRACT_FIELDS = Object.freeze([
  "project_id",
  "layer",
  "record_id",
  "path",
  "status",
  "summary",
  "provenance",
  "match_reason",
]);

/**
 * MV-12, direct search returns complete records. It runs real searches over
 * this project's own records and asks two questions of every result: does it
 * carry every field of the section 15.2 minimum contract, and does an exact
 * lookup of the same path return the whole file rather than a detached
 * fragment.
 */
function checkSearchContract(scope) {
  const context = { scope, warnings: [] };
  const collected = collectCandidates(scope, { records: true, specs: false });
  const sample = collected.candidates
    .filter((candidate) => candidate.status === "active" && candidate.id)
    .sort((a, b) => a.path.localeCompare(b.path))
    .slice(0, 5);
  if (sample.length === 0) {
    return {
      status: "skipped",
      findings: [],
      skipped_because: "this project holds no active record for a sample search run",
    };
  }

  const findings = [];
  for (const candidate of sample) {
    const run = searchOperation(context, {
      query: candidate.id,
      type: null,
      status: null,
      domain: null,
      topic: null,
      limit: 5,
    });
    if (run.status !== "ok") {
      findings.push(note("retrieval/parse-error", "a sample search did not run", { path: candidate.path }));
      continue;
    }
    for (const result of run.result) {
      for (const field of RESULT_CONTRACT_FIELDS) {
        if (Object.hasOwn(result, field)) continue;
        findings.push(note(
          "record/schema-invalid",
          `a search result is missing the ${field} field of the section 15.2 minimum contract`,
          { path: result.path ?? candidate.path },
        ));
      }
    }
    if (!run.result.some((result) => result.path === candidate.path)) {
      findings.push(note(
        "record/unknown-id",
        "a search for a record's own id did not return that record",
        { path: candidate.path },
      ));
      continue;
    }

    const opened = getOperation(context, { id: null, path: candidate.path });
    if (opened.status !== "ok") {
      findings.push(note("record/unknown-id", "an exact lookup of a record path did not open it", { path: candidate.path }));
      continue;
    }
    const onDisk = readIfPresent(resolve(scope.scopeRoot, candidate.path));
    if (opened.result.body !== onDisk) {
      findings.push(note(
        "record/schema-invalid",
        "an exact lookup returned something other than the whole record file",
        { path: candidate.path },
      ));
    }
  }
  return { status: findings.length ? "fail" : "pass", findings, skipped_because: null };
}

/**
 * MV-13, no tracker bridge as the sole home of a fact. A record whose only
 * evidence is a tracker item keeps its meaning alive only as long as the
 * tracker does, which is the dependency FR-006 refuses.
 */
function checkTrackerBridge(scope) {
  const findings = [];
  const collected = collectCandidates(scope, { records: true, specs: false });
  for (const candidate of collected.candidates) {
    if (candidate.status !== "active") continue;
    const types = candidate.provenance.evidence
      .map((entry) => String(entry.source_type ?? "").trim().toLowerCase())
      .filter(Boolean);
    if (types.length === 0) continue;
    if (!types.every((type) => TRACKER_SOURCE_TYPES.includes(type))) continue;
    findings.push(note(
      "record/missing-evidence",
      "every source this record cites is a tracker item, so its meaning lives nowhere but the tracker bridge",
      { path: candidate.path },
    ));
  }
  return { status: findings.length ? "fail" : "pass", findings, skipped_because: null };
}

/** Local-state paths that are not one of the kinds contracts section 2.23.1 defines. */
function unexpectedLocalState(scope) {
  const base = resolve(scope.scopeRoot, LOCAL_STATE);
  if (!isDirectory(base)) return [];
  const strays = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const path = resolve(directory, entry.name);
      const relativeName = relativePath(scope, path);
      if (LOCAL_STATE_KINDS.some((kind) => relativeName === kind || relativeName.startsWith(`${kind}/`))) {
        continue;
      }
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      strays.push(relativeName);
    }
  };
  walk(base);
  return strays;
}

/**
 * MV-14, identical canonical results after deleting and rebuilding derived
 * state. The validator writes nothing, so it does not delete a project's
 * `.memory/` folder to prove this. It proves the two conditions that make the
 * deletion safe: nothing canonical is read out of local state, and every
 * declared artifact already matches what its inputs produce, so rebuilding it
 * changes no byte. The destructive proof runs in the gold-set runner's
 * self-test, which builds its own project and is the AT-16 fixture.
 */
function checkDerivedRebuild(scope) {
  const findings = [];
  for (const stray of unexpectedLocalState(scope)) {
    findings.push(note(
      "record/schema-invalid",
      "a file under .memory/ is not one of the local-state kinds, so deleting the folder may lose something",
      { path: stray },
    ));
  }

  const planned = planViewRebuild(scope);
  for (const artifact of planned.artifacts) {
    if (readIfPresent(resolve(scope.scopeRoot, artifact.path)) === artifact.contents) continue;
    findings.push(note(
      "record/schema-invalid",
      "a declared artifact does not match what a rebuild from its inputs produces",
      { path: artifact.path },
    ));
  }

  const context = { scope, warnings: [] };
  const options = { query: "the", type: null, status: null, domain: null, topic: null, limit: 10 };
  const first = searchOperation(context, options);
  const second = searchOperation(context, options);
  if (JSON.stringify(first.result) !== JSON.stringify(second.result)) {
    findings.push(note(
      "record/schema-invalid",
      "two identical searches over unchanged files returned different results",
      { path: "knowledge/memory" },
    ));
  }

  return {
    status: findings.length ? "fail" : "pass",
    findings,
    skipped_because: "the delete-and-rebuild half runs in the gold-set runner's self-test, which builds its own project rather than removing this one's local state",
  };
}

/**
 * MV-15, reads and retrieval create no local state. It fingerprints the whole
 * scope, runs real read operations, and fingerprints it again. A read that
 * left anything behind shows up as a created or changed path.
 */
function checkNoLocalState(scope) {
  const before = projectFingerprint(scope.scopeRoot);
  const context = { scope, warnings: [] };
  searchOperation(context, { query: "project", type: null, status: null, domain: null, topic: null, limit: 5 });
  specSearchOperation(context, { query: "project", type: null, status: null, domain: null, topic: null, limit: 5 });
  timelineOperation(context, { entity: "project", from: null, to: null });
  const after = projectFingerprint(scope.scopeRoot);

  const findings = fingerprintDiff(before, after).map((entry) => note(
    "record/schema-invalid",
    `a read run left the path ${entry.state}, and reads create no local state`,
    { path: relative(scope.scopeRoot, entry.path).split(sep).join("/") },
  ));
  return { status: findings.length ? "fail" : "pass", findings, skipped_because: null };
}

/**
 * MV-16, physical project-root isolation. It runs the ten steps of
 * architecture section 21.9 in order. Step ten is the shipped two-project
 * fixture, which runs only under --fixtures, so a run without that flag says
 * step ten was not inspected rather than counting it as passed.
 */
function checkIsolation(scope, { fixtures = false } = {}) {
  const findings = [];

  // Step 1 and 2. Scope resolution already refused a project whose file,
  // project_id, or project_root does not resolve, so what is left to read is
  // the settings surface itself.
  for (const key of ["project_id", "project_root"]) {
    if (String(scope.settings[key] ?? "").trim()) continue;
    findings.push(note("scope/unresolved-root", `knowledge/project.md carries no ${key}`, { path: "knowledge/project.md" }));
  }
  if (!isMemberPath(scope, scope.knowledgeDir)) {
    findings.push(note("scope/unresolved-root", "the knowledge folder that named the scope root does not sit inside it", {
      path: "knowledge",
    }));
  }

  // Step 3. Every canonical and local-state path canonicalizes inside the root.
  const canonicalAreas = [
    "knowledge/specs",
    "knowledge/memory",
    "knowledge/current.md",
    "knowledge/map.md",
    LOCAL_STATE,
  ];
  for (const area of canonicalAreas) {
    const absolute = resolve(scope.scopeRoot, area);
    if (!existsSync(absolute)) continue;
    if (isMemberPath(scope, absolute)) continue;
    findings.push(note("scope/outside-root", "a canonical or local-state path canonicalizes outside the scope root", {
      path: area,
    }));
  }

  // Step 4. A symbolic link that leaves the scope is reported, never followed.
  for (const link of scopeSymlinks(scope)) {
    let target;
    try {
      target = realpathSync(link);
    } catch {
      target = null;
    }
    if (target !== null && isMemberPath(scope, target)) continue;
    findings.push(note("scope/symlink-escape", "a link inside the scope resolves outside it", {
      path: relative(scope.scopeRoot, link).split(sep).join("/"),
    }));
  }

  // Step 5 and 6. Nested project files, declared and undeclared.
  const declared = new Set(scope.subroots);
  const nested = [];
  const hunt = (directory, depth) => {
    if (depth > 6) return;
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      const path = resolve(directory, entry.name);
      if (existsSync(resolve(path, "knowledge/project.md"))) {
        nested.push(path);
        continue;
      }
      hunt(path, depth + 1);
    }
  };
  hunt(scope.scopeRoot, 0);
  for (const path of nested) {
    if (declared.has(path)) continue;
    findings.push(note(
      "scope/undeclared-nested-scope",
      "a second project sits inside this scope and is not a declared subroot",
      { path: relative(scope.scopeRoot, path).split(sep).join("/") },
    ));
  }
  for (const subroot of scope.subroots) {
    const file = resolve(subroot, "knowledge/project.md");
    const name = relative(scope.scopeRoot, subroot).split(sep).join("/");
    if (!existsSync(file)) {
      findings.push(note("scope/unresolved-root", "a declared subroot holds no knowledge/project.md", { path: name }));
      continue;
    }
    const { data } = parseFrontMatter(readIfPresent(file) ?? "");
    const childId = String(data.project_id ?? "").trim();
    if (!childId || childId === scope.projectId) {
      findings.push(note("scope/duplicate-project-id", "a declared subroot carries this project's id or none of its own", { path: name }));
    }
    for (const other of scope.subroots) {
      if (other === subroot) continue;
      if (!subroot.startsWith(`${other}${sep}`)) continue;
      findings.push(note("scope/overlapping-scopes", "two declared subroots nest inside one another", { path: name }));
    }
  }

  // Step 8. Membership is decided by location, and a declared id must match.
  for (const entry of walkRecords(scope.scopeRoot)) {
    if (!isMemberPath(scope, entry.absolute)) continue;
    const { data } = parseFrontMatter(readIfPresent(entry.absolute) ?? "");
    const declaredId = String(data.project_id ?? "").trim();
    if (declaredId && declaredId !== scope.projectId) {
      findings.push(note("scope/duplicate-project-id", "a record declares a project id that is not this scope's", {
        path: entry.path,
      }));
    }
  }
  for (const pin of readPinRegistry(scope).entries) {
    const resolved = resolvePinTarget(scope.scopeRoot, pin.target);
    if (isMemberPath(scope, resolved.absolute)) continue;
    findings.push(note("scope/cross-scope-result", `the pinned record ${pin.id} sits outside this project's scope`, {
      path: PINS_PATH,
    }));
  }

  // Step 9. A link into another scope names that scope's project id.
  for (const path of canonicalMarkdown(scope)) {
    const text = readIfPresent(resolve(scope.scopeRoot, path));
    if (text === null) continue;
    for (const link of scanLinks(text)) {
      if (link.image || !link.relative) continue;
      const absolute = resolve(scope.scopeRoot, path, "..", link.path);
      if (!existsSync(absolute) || isMemberPath(scope, absolute)) continue;
      const owner = nested.find((root) => absolute.startsWith(`${root}${sep}`));
      const ownerId = owner
        ? String(parseFrontMatter(readIfPresent(resolve(owner, "knowledge/project.md")) ?? "").data.project_id ?? "").trim()
        : "";
      if (ownerId && text.includes(ownerId)) continue;
      findings.push(note(
        "scope/cross-scope-result",
        `line ${link.line} links into another scope without naming that scope's project id`,
        { path, detail: link.path },
      ));
    }
  }

  // Step 10. The shipped fixtures.
  let skipped = "step ten was not inspected: the shipped isolation fixtures run only with --fixtures";
  if (fixtures) {
    const run = runIsolationFixtures();
    findings.push(...run.findings);
    skipped = null;
  }

  return { status: findings.length ? "fail" : "pass", findings, skipped_because: skipped };
}

/**
 * The H2 sections architecture section 21.6 requires of a record carrying
 * sensitive personal content. The record schema has no field for either, so
 * the write coordinator put both in the body and this reader stays with that
 * one definition rather than inventing a second.
 */
function declaresSensitive(text) {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .some((line) => line.trim().toLowerCase() === `## ${SENSITIVE_SECTION.toLowerCase()}`);
}

function hasStartupExposure(text) {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .some((line) => line.trim().toLowerCase() === `## ${STARTUP_EXPOSURE_SECTION.toLowerCase()}`);
}

/**
 * What a sensitive record is missing: the category line, or the one line
 * saying why the detail is needed. The text is read and never carried into a
 * message.
 */
function sensitiveGaps(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => line.trim().toLowerCase() === `## ${SENSITIVE_SECTION.toLowerCase()}`);
  if (start === -1) return [];

  const body = [];
  for (let index = start + 1; index < lines.length; index++) {
    if (lines[index].startsWith("## ")) break;
    body.push(lines[index].trim());
  }
  const gaps = [];
  if (!body.some((line) => /^category:/i.test(line))) gaps.push("category");
  if (!body.some((line) => /^needed because:/i.test(line))) gaps.push("needed-reason");
  return gaps;
}

/** A recorded exemption names the file and the pattern, and is itself a record. */
function secretExemptions(scope) {
  const exemptions = [];
  for (const entry of walkRecords(scope.scopeRoot)) {
    const text = readIfPresent(entry.absolute);
    if (text === null) continue;
    if (!/exemption/i.test(text)) continue;
    exemptions.push({ path: entry.path, text });
  }
  return exemptions;
}

/**
 * MV-17, privacy-boundary enforcement. It runs the ten steps of architecture
 * section 21.10 in order. Two of them cannot be read from files alone and say
 * so: undeclared third-party content is judgment rather than a pattern, and a
 * privacy deletion leaves no receipt for a later run to inspect.
 */
function checkPrivacy(scope, { fixtures = false } = {}) {
  const findings = [];
  const notInspected = [];

  // Step 1. Unknown or malformed values resolve to the most restrictive
  // setting, and scope resolution already reported each one.
  for (const warning of scope.warnings) {
    if (!warning.message.toLowerCase().includes("privacy")
      && !warning.message.toLowerCase().includes("transfer")
      && !warning.message.toLowerCase().includes("third_party")) continue;
    findings.push(note("record/schema-invalid", warning.message, { path: "knowledge/project.md" }));
  }

  // Step 2. Approved transfer needs a complete consent record.
  const block = scope.settings.privacy && typeof scope.settings.privacy === "object"
    ? scope.settings.privacy
    : {};
  if (String(block.external_transfer ?? "").trim() === "approved") {
    const consent = String(block.consent ?? "").trim();
    const text = consent ? readIfPresent(resolve(scope.scopeRoot, consent)) : null;
    if (!consent || text === null) {
      findings.push(note("privacy/consent-missing", "external transfer is approved and its consent record does not resolve", {
        path: "knowledge/project.md",
      }));
    } else {
      const lower = text.toLowerCase();
      for (const [part, probe] of [
        ["destination", "destination"],
        ["content scope", "content scope"],
        ["approval date", "approved"],
        ["revocation route", "revoke"],
      ]) {
        if (lower.includes(probe)) continue;
        findings.push(note("privacy/consent-missing", `the consent record does not name the ${part}, so transfer reads as denied`, {
          path: consent,
        }));
      }
    }
  }

  // Step 3. No enabled component declares an external destination while
  // transfer is denied.
  if (scope.privacy.external_transfer === "denied") {
    const tracker = scope.settings.tracker;
    const destination = tracker && typeof tracker === "object"
      ? String(tracker.destination ?? tracker.endpoint ?? "").trim()
      : "";
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(destination)) {
      findings.push(note("privacy/transfer-denied", "a configured component declares an external destination while transfer is denied", {
        path: "knowledge/project.md",
      }));
    }
  }

  // Step 4. The fixed secret pattern set over canonical knowledge.
  const exemptions = secretExemptions(scope);
  for (const path of canonicalMarkdown(scope)) {
    const text = readIfPresent(resolve(scope.scopeRoot, path));
    if (text === null) continue;
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    for (const rule of SECRET_PATTERNS) {
      for (let index = 0; index < lines.length; index++) {
        if (!rule.pattern.test(lines[index])) continue;
        const exempt = exemptions.some((record) => record.text.includes(path) && record.text.includes(rule.id));
        if (exempt) continue;
        findings.push(note(
          "privacy/secret-detected",
          `line ${index + 1} matches the ${rule.id} pattern and no reviewed record exempts it`,
          { path, detail: rule.id },
        ));
        break;
      }
    }
  }

  // Step 5, 6, and 7. Sensitive records, their stated need, and their exposure.
  const sensitiveProject = scope.privacy.level === "sensitive";
  const sensitivePaths = new Set();
  for (const entry of walkRecords(scope.scopeRoot)) {
    const text = readIfPresent(entry.absolute);
    if (text === null || !declaresSensitive(text)) continue;
    sensitivePaths.add(entry.path);
    for (const gap of sensitiveGaps(text)) {
      findings.push(note(
        "privacy/sensitive-unapproved-exposure",
        `a record carrying sensitive content states no ${gap}`,
        { path: entry.path },
      ));
    }
    const { data } = parseFrontMatter(text);
    const approval = data.approval && typeof data.approval === "object" ? data.approval : {};
    if (!String(approval.actor ?? "").trim()) {
      findings.push(note("approval/missing", "a record carrying sensitive content names no owner approval", {
        path: entry.path,
      }));
    }
  }
  notInspected.push("step six, because content identifying another person is judgment rather than a pattern the validator can read");

  for (const pin of readPinRegistry(scope).entries) {
    const resolved = resolvePinTarget(scope.scopeRoot, pin.target);
    const text = readIfPresent(resolved.absolute);
    if (text === null) continue;
    if (!sensitiveProject && !declaresSensitive(text)) continue;
    if (hasStartupExposure(text)) continue;
    findings.push(note(
      "privacy/sensitive-unapproved-exposure",
      `the pinned record ${pin.id} is sensitive and carries no recorded approval naming startup exposure`,
      { path: resolved.path },
    ));
  }
  const planned = planViewRebuild(scope);
  for (const artifact of planned.artifacts) {
    for (const input of artifact.inputs ?? []) {
      const inputPath = typeof input === "string" ? input : String(input?.path ?? "");
      if (!sensitivePaths.has(inputPath)) continue;
      const text = readIfPresent(resolve(scope.scopeRoot, inputPath));
      if (text !== null && hasStartupExposure(text)) continue;
      findings.push(note(
        "privacy/sensitive-unapproved-exposure",
        "a generated artifact reads a sensitive record with no recorded exposure approval",
        { path: artifact.path },
      ));
    }
  }

  // Step 8. A sensitive project may not weaken the history gate.
  if (sensitiveProject) {
    const gate = String(scope.settings.session_search?.gate ?? "").trim();
    if (gate && gate !== "owner-request") {
      findings.push(note(
        "privacy/sensitive-unapproved-exposure",
        `this project is sensitive and configures the history gate as ${gate}, and section 21.6 allows owner request only`,
        { path: "knowledge/project.md" },
      ));
    }
  }

  // Step 9. Local state holds only the kinds contracts section 2.23.1 defines,
  // and no secret text. Preimages and review files hold approved content by
  // design, so what this reads is the kinds and the patterns, not the bodies.
  for (const stray of unexpectedLocalState(scope)) {
    findings.push(note("record/schema-invalid", "a file under .memory/ is not one of the local-state kinds", { path: stray }));
  }
  const journal = readIfPresent(resolve(scope.scopeRoot, JOURNAL_FILE));
  if (journal !== null) {
    for (const rule of SECRET_PATTERNS) {
      if (!rule.pattern.test(journal)) continue;
      findings.push(note("privacy/secret-detected", `the crash journal matches the ${rule.id} pattern`, {
        path: JOURNAL_FILE,
        detail: rule.id,
      }));
    }
  }

  // Step 10. A privacy deletion leaves no receipt, so there is nothing here to
  // inspect after the fact.
  notInspected.push("step ten, because a completed privacy deletion leaves no receipt for a later run to read");

  if (fixtures) {
    findings.push(...runPrivacyFixtures({ sensitiveGaps }).findings);
  } else {
    notInspected.push("the shipped sensitive-project fixtures, which run only with --fixtures");
  }

  return {
    status: findings.length ? "fail" : "pass",
    findings,
    skipped_because: notInspected.length ? `not inspected: ${notInspected.join("; ")}` : null,
  };
}

/**
 * MV-18, migration file counts, links, hashes, and reversibility. The
 * migration engine is the one that knows what it did, so the validator reads
 * the receipt that engine wrote rather than reconstructing a plan a second
 * way. A project that has never been migrated holds no receipt and reports
 * skipped, which is not the same as a pass.
 *
 * The receipt declares an expected-follow-up set: the files the owner has to
 * change after apply, project.md front matter among them. A changed byte in
 * one of those is expected and lands in skipped_because. Every other
 * divergence from the receipt still fails.
 */
function checkMigration(scope) {
  const outcome = checkMigrationIntegrity(scope.scopeRoot);
  return {
    status: outcome.status,
    findings: outcome.findings.map((finding) => note(finding.code, finding.message, { path: finding.path })),
    skipped_because: outcome.skipped_because,
  };
}

/**
 * MV-19, the retrieval gold set. The runner is the one that measures
 * retrieval, so the validator calls it rather than scoring questions a second
 * way. A missing set is a warning that blocks only a proposed retrieval
 * change; a set that runs and misses the bar is a failure.
 */
function checkGoldSet(scope) {
  const where = readGoldSet(scope);
  if (where === "missing") {
    return {
      status: "warn",
      findings: [note(
        "startup/missing-source",
        "this project has written no retrieval gold set, which blocks a proposed retrieval change and nothing else",
        { path: "knowledge/retrieval-gold-set.md" },
      )],
      skipped_because: null,
    };
  }

  const run = runGoldSet({ root: scope.scopeRoot });
  const result = run.result ?? {};
  const findings = (run.errors ?? []).map((error) => note(error.code, error.message, { path: error.path }));
  const setPath = result.gold_set ?? "knowledge/retrieval-gold-set.md";

  if (result.verdict === "met" && findings.length === 0) {
    return { status: "pass", findings: [], skipped_because: null };
  }
  if (result.verdict === "missed") {
    findings.push(note("record/schema-invalid", `the gold set missed its bar: ${result.reason}`, { path: setPath }));
    return { status: "fail", findings, skipped_because: null };
  }
  findings.push(note("startup/missing-source", `the gold set was not measured: ${result.reason}`, { path: setPath }));
  return { status: findings.length > 1 ? "fail" : "warn", findings, skipped_because: null };
}

/** A quoted span long enough to be a quotation rather than a turn of phrase. */
const QUOTE_PATTERN = /"([^"\n]{12,200})"/g;

/**
 * MV-20, quoted-source consistency. An exact quoted span in a record has to
 * appear in one of the sources that record cites, where the source is a file
 * inside the scope. A locator this build cannot reach is not judged, and
 * paraphrase is never judged: that stays an agent review and an owner
 * decision, which is what architecture section 18 says the validator cannot do.
 */
function checkQuotedSources(scope) {
  const findings = [];
  let inspected = 0;

  for (const entry of walkRecords(scope.scopeRoot)) {
    const text = readIfPresent(entry.absolute);
    if (text === null) continue;
    const { data } = parseRecord(text);
    const reachable = blockList(data.evidence)
      .map((item) => String(item.locator ?? "").trim())
      .filter((locator) => locatorReach(scope, locator) === true)
      .map((locator) => readIfPresent(resolve(scope.scopeRoot, locator.split("#")[0])))
      .filter((source) => source !== null);
    if (reachable.length === 0) continue;

    const body = text.slice(text.indexOf("\n---\n") + 1);
    for (const match of body.matchAll(QUOTE_PATTERN)) {
      const span = match[1].trim();
      if (!span) continue;
      inspected++;
      if (reachable.some((source) => source.includes(span))) continue;
      findings.push(note(
        "record/schema-invalid",
        "a quoted span does not appear in any source this record cites",
        { path: entry.path, detail: `${span.length} characters` },
      ));
    }
  }

  if (inspected === 0) {
    return {
      status: "skipped",
      findings: [],
      skipped_because: "no record quotes an exact span from a source this project holds",
    };
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
  { id: "MV-02", version: "2.0", severity: "fail", title: "shared root-block meaning and checked-copy drift" },
  { id: "MV-03", version: "2.0", severity: "fail", title: "record schema, allowed values, unique ids, approval, provenance" },
  { id: "MV-04", version: "2.0", severity: "fail", title: "non-empty evidence for inference" },
  { id: "MV-05", version: "2.0", severity: "fail", title: "valid conflict targets and reciprocal supersession" },
  { id: "MV-06", version: "2.0", severity: "fail", title: "pin eligibility, summary hashes, project scope, startup rendering" },
  { id: "MV-07", version: "2.0", severity: "fail", title: "startup budget and safe degradation" },
  { id: "MV-08", version: "2.0", severity: "fail", title: "retired phrases and recorded exemptions" },
  { id: "MV-09", version: "2.0", severity: "warn", title: "derived-artifact inputs, fingerprints, and hand edits" },
  { id: "MV-10", version: "2.0", severity: "warn", title: "map coverage for major folders" },
  { id: "MV-11", version: "2.0", severity: "warn", title: "domain and topic vocabulary and usage" },
  { id: "MV-12", version: "2.0", severity: "fail", title: "direct search returns complete records" },
  { id: "MV-13", version: "2.0", severity: "fail", title: "no tracker bridge as the sole home of a fact" },
  {
    id: "MV-14",
    version: "2.0",
    severity: "fail",
    title: "identical canonical results after deleting and rebuilding derived state",
  },
  { id: "MV-15", version: "2.0", severity: "fail", title: "reads and retrieval create no local state" },
  { id: "MV-16", version: "2.0", severity: "fail", title: "physical project-root isolation" },
  { id: "MV-17", version: "2.0", severity: "fail", title: "privacy-boundary enforcement" },
  {
    id: "MV-18",
    version: "2.0",
    severity: "fail",
    title: "migration file counts, links, hashes, and reversibility",
  },
  // MV-19 carries the one split severity in section 4: a missing set is a
  // warning, and a set that runs and misses its bar is a failure. The check
  // itself returns the warning, so the catalog records the failing half.
  { id: "MV-19", version: "2.0", severity: "fail", title: "the retrieval gold set" },
  { id: "MV-20", version: "2.0", severity: "fail", title: "quoted-source consistency" },
  { id: "MV-21", version: "2.0", severity: "fail", title: "relative-link syntax and resolvable targets" },
  { id: "MV-22", version: "2.0", severity: "fail", title: "complete incoming-link repair after a move or rename" },
];

export function checkIds() {
  return CHECKS.map((check) => check.id);
}

/** memory_validate: run the section 4 checks this build carries. */
export function validate(context, options = {}) {
  const { scope, warnings } = context;
  // The --fixtures flag adds the shipped section 21.11 fixtures to MV-16 and
  // MV-17. Without it those two checks say which steps they did not inspect.
  const fixtures = options.fixtures === true;
  const selected = options.check ?? null;
  const wanted = (id) => selected === null || selected.includes(id);

  const records = wanted("MV-03") || wanted("MV-04") ? checkRecords(scope) : {};
  const outcomes = {
    "MV-01": wanted("MV-01") ? checkRequiredFiles(scope) : null,
    "MV-02": wanted("MV-02") ? checkSharedBlock(scope) : null,
    ...records,
    "MV-05": wanted("MV-05") ? checkLinks(scope) : null,
    "MV-06": wanted("MV-06") ? checkPins(scope) : null,
    "MV-07": wanted("MV-07") ? checkStartupBudget(scope) : null,
    "MV-08": wanted("MV-08") ? checkRetiredPhrases(scope) : null,
    "MV-09": wanted("MV-09") ? checkGeneratedViews(scope) : null,
    "MV-10": wanted("MV-10") ? checkMapCoverage(scope) : null,
    "MV-11": wanted("MV-11") ? checkVocabulary(scope) : null,
    "MV-12": wanted("MV-12") ? checkSearchContract(scope) : null,
    "MV-13": wanted("MV-13") ? checkTrackerBridge(scope) : null,
    "MV-14": wanted("MV-14") ? checkDerivedRebuild(scope) : null,
    "MV-15": wanted("MV-15") ? checkNoLocalState(scope) : null,
    "MV-16": wanted("MV-16") ? checkIsolation(scope, { fixtures }) : null,
    "MV-17": wanted("MV-17") ? checkPrivacy(scope, { fixtures }) : null,
    "MV-18": wanted("MV-18") ? checkMigration(scope) : null,
    "MV-19": wanted("MV-19") ? checkGoldSet(scope) : null,
    "MV-20": wanted("MV-20") ? checkQuotedSources(scope) : null,
    "MV-21": wanted("MV-21") ? checkRelativeLinks(scope) : null,
    "MV-22": wanted("MV-22") ? checkMoveRepair(scope) : null,
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

// ---------------------------------------------------------------------------
// The review engine, architecture section 17
// ---------------------------------------------------------------------------

/**
 * memory_review is structurally read-only, and the structure is the promise.
 * Nothing below writes, stages, proposes, or calls the coordinator. It reads
 * canonical Markdown through the same collectors the retrieval router uses,
 * judges it, and returns a worklist. Every repair leaves through the cleanup
 * skill, which runs the ordinary two-phase review for each item the owner
 * keeps, so review never becomes a second way into a canonical file.
 *
 * Two rules the categories below never break:
 *
 *   - Age alone is never a reason to delete or retire anything (FR-045). A
 *     stale review date asks for a recheck, not a removal.
 *   - Similar wording is never enough to merge (architecture section 14.2).
 *     A duplicate item is a candidate for the owner to judge, and it says so.
 */

/** The two review scopes of FR-044. `focused` runs after an approved save. */
const REVIEW_SCOPES = Object.freeze(["focused", "deep"]);

/** Worklist ordering, most urgent first. */
const SEVERITY_ORDER = Object.freeze({ high: 0, medium: 1, low: 2 });

/**
 * The section 17 categories. `depth` says which review runs the category: a
 * focused review runs everything a save can break, and a deep review adds the
 * three whole-corpus categories that need judgment or an outside runner.
 */
const REVIEW_CATEGORIES = Object.freeze([
  { id: "duplicate-candidate", depth: "focused" },
  { id: "evidence-consolidation", depth: "focused" },
  { id: "current-conflict", depth: "focused" },
  { id: "unlinked-conflict", depth: "focused" },
  { id: "provenance", depth: "focused" },
  { id: "stale-review-date", depth: "focused" },
  { id: "broken-link", depth: "focused" },
  { id: "supersession-gap", depth: "focused" },
  { id: "retired-phrase", depth: "focused" },
  { id: "stale-view", depth: "focused" },
  { id: "pin-error", depth: "focused" },
  { id: "search-capability", depth: "focused" },
  { id: "vocabulary", depth: "deep" },
  { id: "durable-information", depth: "deep" },
  { id: "gold-set", depth: "deep" },
]);

const CATEGORY_ORDER = new Map(REVIEW_CATEGORIES.map((entry, index) => [entry.id, index]));

/** Two meanings this close in wording are worth the owner comparing. */
const DUPLICATE_OVERLAP = 0.75;

/** More distinct topic values than this is a vocabulary the owner should thin. */
const VOCABULARY_LIMIT = 20;

/** Evidence that is only a conversation leaves a record resting on chat alone. */
const CONVERSATION_SOURCE_TYPES = Object.freeze([
  "chat",
  "conversation",
  "session",
  "transcript",
]);

/** Wording that describes live work state rather than durable meaning. */
const WORK_STATE_WORDING = /\b(currently|right now|as of now|today|this week|in progress|next step|todo|blocked on|working on)\b/i;

/** The gold-set runner P3-5 builds. Review detects it and never imports it. */
const GOLD_SET_RUNNER = "gold-set.mjs";

/** One worklist item, in the fixed field order contracts section 2.8 names. */
function worklistItem(category, severity, { ids = [], paths = [], what, operation }) {
  return {
    category,
    severity,
    record_ids: [...new Set(ids)].sort(),
    paths: [...new Set(paths)].sort(),
    what_is_wrong: what,
    suggested_operation: operation,
  };
}

/** The words a meaning is made of, with the question words dropped. */
function meaningTerms(candidate) {
  const words = `${candidate.title} ${candidate.summary}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
  return new Set(words);
}

/** How much two meanings share, from 0 to 1. */
function termOverlap(first, second) {
  if (first.size === 0 || second.size === 0) return 0;
  let shared = 0;
  for (const term of first) if (second.has(term)) shared++;
  return shared / (first.size + second.size - shared);
}

function normalizedMeaning(candidate) {
  return `${candidate.title} ${candidate.summary}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** A vocabulary value, flattened so two spellings of one term meet. */
function normalizedTerm(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "").replace(/s$/, "");
}

function evidenceLocators(candidate) {
  return candidate.provenance.evidence
    .map((entry) => entry.locator)
    .filter(Boolean)
    .sort();
}

/** True when two records already say how they relate to each other. */
function alreadyLinked(first, second) {
  const names = (holder, other) => ["conflicts_with", "supersedes", "superseded_by", "relates", "based_on"]
    .some((field) => idList(holder.data[field]).includes(other.id));
  return names(first, second) || names(second, first);
}

/** Every date a record carries that says when its meaning was settled. */
function recordDates(candidate) {
  const approval = candidate.data.approval && typeof candidate.data.approval === "object"
    ? candidate.data.approval
    : {};
  return [candidate.data.recorded_at, candidate.data.effective_from, approval.approved_at]
    .map((value) => String(value ?? "").trim().slice(0, 10))
    .filter((value) => DATE_ONLY.test(value));
}

/** Turn a validator finding into one worklist item without rewording it. */
function findingItem(category, severity, operation, finding, byPath) {
  const path = finding.path ?? null;
  const held = path ? byPath.get(path) : null;
  return worklistItem(category, severity, {
    ids: held?.id ? [held.id] : [],
    paths: path ? [path] : [],
    what: finding.detail ? `${finding.message} (${finding.detail})` : finding.message,
    operation,
  });
}

/** Exact and near duplicates, and the evidence that belongs on one record. */
function reviewDuplicates(records, inFocus) {
  const items = [];
  for (let first = 0; first < records.length; first++) {
    for (let second = first + 1; second < records.length; second++) {
      const left = records[first];
      const right = records[second];
      if (left.type !== right.type) continue;
      if (left.status !== "active" || right.status !== "active") continue;
      if (!inFocus(left) && !inFocus(right)) continue;
      if (alreadyLinked(left, right)) continue;
      if (termOverlap(meaningTerms(left), meaningTerms(right)) < DUPLICATE_OVERLAP) continue;

      const ids = [left.id, right.id].filter(Boolean);
      const paths = [left.path, right.path];
      const sameWording = normalizedMeaning(left) === normalizedMeaning(right);
      const leftSources = evidenceLocators(left).join("|");
      const rightSources = evidenceLocators(right).join("|");

      if (sameWording && leftSources !== rightSources) {
        items.push(worklistItem("evidence-consolidation", "medium", {
          ids,
          paths,
          what: `two active ${left.type} records state the same meaning and rest on different sources, so the sources belong as evidence on one record instead of two`,
          operation: "merge",
        }));
        continue;
      }
      items.push(worklistItem("duplicate-candidate", "medium", {
        ids,
        paths,
        what: `two active ${left.type} records state nearly the same meaning and may be true duplicates, which only the owner can settle, because similar wording is never enough to merge`,
        operation: "merge",
      }));
    }
  }
  return items;
}

/** Conflicts that are live on both sides, and conflicts linked on one side. */
function reviewConflicts(records, byId, inFocus) {
  const items = [];
  const seenPair = new Set();
  for (const held of records) {
    if (!held.id) continue;
    for (const target of idList(held.data.conflicts_with)) {
      const other = byId.get(target);
      if (!other) continue;
      if (!inFocus(held) && !inFocus(other)) continue;

      if (!idList(other.data.conflicts_with).includes(held.id)) {
        items.push(worklistItem("unlinked-conflict", "high", {
          ids: [held.id, other.id],
          paths: [other.path],
          what: `${held.id} names ${other.id} as a conflict and ${other.id} does not link back, so the conflict is visible from one side only`,
          operation: "correct",
        }));
      }

      const key = [held.id, other.id].sort().join("|");
      if (held.status === "active" && other.status === "active" && !seenPair.has(key)) {
        seenPair.add(key);
        items.push(worklistItem("current-conflict", "high", {
          ids: [held.id, other.id],
          paths: [held.path, other.path],
          what: `${held.id} and ${other.id} conflict and both are active, so two records claim current truth about the same subject`,
          operation: "supersede",
        }));
      }
    }
  }
  return items;
}

/** Provenance a record is missing, cannot support, or can no longer reach. */
function reviewProvenance(scope, records) {
  const items = [];
  for (const held of records) {
    const ids = held.id ? [held.id] : [];
    const paths = [held.path];

    if (held.legacy) {
      items.push(worklistItem("provenance", "medium", {
        ids,
        paths,
        what: "the record is missing version 2 metadata and stays usable until its next approved touch",
        operation: "correct",
      }));
      continue;
    }

    const evidence = held.provenance.evidence;
    if (evidence.length === 0) {
      items.push(worklistItem("provenance", "high", {
        ids,
        paths,
        what: "the record cites no evidence, so nothing says what its meaning rests on",
        operation: "confirm",
      }));
    }
    for (const entry of evidence) {
      if (!entry.source_type || !entry.locator) {
        items.push(worklistItem("provenance", "high", {
          ids,
          paths,
          what: "an evidence entry is missing its source type or its locator",
          operation: "correct",
        }));
        continue;
      }
      if (locatorReach(scope, entry.locator) === false) {
        items.push(worklistItem("provenance", "medium", {
          ids,
          paths,
          what: `the cited source ${entry.locator} is not reachable inside this project`,
          operation: "correct",
        }));
      }
    }

    if (!held.provenance.approved_by || !held.provenance.approved_at) {
      items.push(worklistItem("provenance", "high", {
        ids,
        paths,
        what: "the record does not say who approved it and when",
        operation: "correct",
      }));
    }
    if (INFERRED_STATUSES.includes(held.provenance.epistemic_status ?? "")
      && held.provenance.based_on.length === 0) {
      items.push(worklistItem("provenance", "high", {
        ids,
        paths,
        what: `an ${held.provenance.epistemic_status} record names nothing in based_on, so its claim rests on no stated basis`,
        operation: "correct",
      }));
    }
  }
  return items;
}

/**
 * Review dates that have passed. The comparison needs today's date, and no
 * wall-clock value goes into the envelope: the item quotes the date the record
 * itself carries. Nothing here proposes a deletion, because age alone is never
 * a reason to remove a record (FR-045).
 */
function reviewStaleDates(records, today) {
  const items = [];
  for (const held of records) {
    if (held.status !== "active") continue;
    const due = String(held.data.review_after ?? "").trim();
    if (!DATE_ONLY.test(due)) continue;
    const age = daysBetween(due, today);
    if (age === null || age <= 0) continue;
    items.push(worklistItem("stale-review-date", "low", {
      ids: held.id ? [held.id] : [],
      paths: [held.path],
      what: `the record asked to be rechecked after ${due} and has not been confirmed since, which asks for a recheck and never for a removal`,
      operation: "confirm",
    }));
  }
  return items;
}

/** Dates and statuses that do not agree about which record is current. */
function reviewSupersession(records, byId) {
  const items = [];
  for (const held of records) {
    const ids = held.id ? [held.id] : [];
    const paths = [held.path];
    const successors = idList(held.data.superseded_by);
    const predecessors = idList(held.data.supersedes);

    if (held.status === "superseded" && successors.length === 0) {
      items.push(worklistItem("supersession-gap", "high", {
        ids,
        paths,
        what: "the record is marked superseded and names no successor, so nothing says what replaced it",
        operation: "supersede",
      }));
    }
    if (held.status === "active" && successors.length > 0) {
      items.push(worklistItem("supersession-gap", "high", {
        ids: [...ids, ...successors],
        paths,
        what: "the record names a successor and is still active, so both it and its successor read as current truth",
        operation: "supersede",
      }));
    }
    if (held.status === "active" && String(held.data.effective_to ?? "").trim()) {
      items.push(worklistItem("supersession-gap", "medium", {
        ids,
        paths,
        what: "the record carries an effective_to date and is still active, so it is dated as ended and still reads as current",
        operation: "supersede",
      }));
    }
    for (const older of predecessors) {
      const other = byId.get(older);
      if (!other || other.status !== "active") continue;
      items.push(worklistItem("supersession-gap", "high", {
        ids: [...ids, older],
        paths: [other.path],
        what: `${held.id ?? held.path} supersedes ${older} and ${older} is still active`,
        operation: "supersede",
      }));
    }
  }
  return items;
}

/** Generated views that no longer match what their inputs would produce. */
function reviewViews(scope) {
  const items = [];
  const planned = planViewRebuild(scope);
  for (const problem of planned.errors) {
    items.push(worklistItem("stale-view", "medium", {
      paths: problem.path ? [problem.path] : [],
      what: problem.message,
      operation: "memory_rebuild_views",
    }));
  }
  for (const artifact of planned.artifacts) {
    const current = readIfPresent(resolve(scope.scopeRoot, artifact.path));
    if (current === artifact.contents) continue;
    items.push(worklistItem("stale-view", "medium", {
      paths: [artifact.path],
      what: "the generated view does not match what its declared inputs produce, so it is stale or hand edited",
      operation: "memory_rebuild_views",
    }));
  }
  return items;
}

/** Pin entries that no longer render, and a pin set the budget cannot carry. */
function reviewPins(scope, byPath) {
  const items = [];
  for (const finding of checkPins(scope).findings) {
    items.push(findingItem("pin-error", "high", "unpin", finding, byPath));
  }

  const registry = readPinRegistry(scope);
  if (registry.entries.length === 0) return items;

  const brief = assembleBootBrief({ projectRoot: scope.scopeRoot });
  if (!brief.ok) return items;
  if (brief.overBudget) {
    items.push(worklistItem("pin-error", "high", {
      paths: [PINS_PATH],
      what: `the required startup blocks are ${brief.bytes} bytes against a budget of ${brief.budget}, so the pin set needs thinning`,
      operation: "unpin",
    }));
  } else if (brief.applied.length > 0) {
    items.push(worklistItem("pin-error", "medium", {
      paths: [PINS_PATH],
      what: `startup already drops ${brief.applied.join(", ")} to fit the budget, so the pin set is under pressure`,
      operation: "unpin",
    }));
  }
  return items;
}

/** Domain and topic values that are unused, overlapping, or too many. */
function reviewVocabulary(records) {
  const items = [];
  const usage = new Map();
  for (const held of records) {
    if (held.status !== "active") continue;
    const values = [
      ...textList(held.data.domain).map((value) => ["domain", value]),
      ...textList(held.data.topics).map((value) => ["topic", value]),
    ];
    for (const [kind, value] of values) {
      const key = `${kind}:${value}`;
      if (!usage.has(key)) usage.set(key, { kind, value, paths: [] });
      usage.get(key).paths.push(held.path);
    }
  }

  for (const entry of [...usage.values()].sort((a, b) => `${a.kind}:${a.value}`.localeCompare(`${b.kind}:${b.value}`))) {
    if (entry.paths.length > 1) continue;
    items.push(worklistItem("vocabulary", "low", {
      paths: entry.paths,
      what: `the ${entry.kind} value ${entry.value} is used by one record only`,
      operation: "correct",
    }));
  }

  const families = new Map();
  for (const entry of usage.values()) {
    const key = `${entry.kind}:${normalizedTerm(entry.value)}`;
    if (!families.has(key)) families.set(key, []);
    families.get(key).push(entry);
  }
  for (const [key, family] of [...families.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const spellings = [...new Set(family.map((entry) => entry.value))].sort();
    if (spellings.length < 2) continue;
    items.push(worklistItem("vocabulary", "medium", {
      paths: family.flatMap((entry) => entry.paths),
      what: `${key.split(":")[0]} values ${spellings.join(" and ")} are spellings of one term`,
      operation: "correct",
    }));
  }

  const topics = [...usage.values()].filter((entry) => entry.kind === "topic");
  if (topics.length > VOCABULARY_LIMIT) {
    items.push(worklistItem("vocabulary", "low", {
      paths: RECORD_FOLDERS.map((folder) => `knowledge/memory/${folder}`),
      what: `the project uses ${topics.length} distinct topic values, which is more than the ${VOCABULARY_LIMIT} a reader can hold, and thinning them is the owner's call`,
      operation: "correct",
    }));
  }
  return items;
}

/**
 * Records that no longer look durable. Neither signal settles anything, and
 * both are proposals the owner may reject. Age is not one of them.
 */
function reviewDurability(records) {
  const items = [];
  for (const held of records) {
    if (held.status !== "active") continue;
    const ids = held.id ? [held.id] : [];
    const sources = held.provenance.evidence
      .map((entry) => String(entry.source_type ?? "").toLowerCase())
      .filter(Boolean);
    if (sources.length > 0 && sources.every((type) => CONVERSATION_SOURCE_TYPES.includes(type))) {
      items.push(worklistItem("durable-information", "medium", {
        ids,
        paths: [held.path],
        what: "every source this record cites is a conversation, so nothing outside a chat supports it",
        operation: "correct",
      }));
    }
    if (WORK_STATE_WORDING.test(held.summary)) {
      items.push(worklistItem("durable-information", "medium", {
        ids,
        paths: [held.path],
        what: "the summary states live work state, which belongs wherever the work item is tracked rather than in memory",
        operation: "retire",
      }));
    }
  }
  return items;
}

/** What the review could not read, and what it had to drop as out of scope. */
function reviewSearchCapability(collected) {
  const items = [];
  for (const path of collected.unreadable) {
    items.push(worklistItem("search-capability", "high", {
      paths: [path],
      what: "the file could not be read, so no search or review covers it",
      operation: "correct",
    }));
  }
  for (const warning of collected.warnings) {
    if (warning.code !== "scope/cross-scope-result") continue;
    items.push(worklistItem("search-capability", "medium", {
      paths: warning.path ? [warning.path] : [],
      what: warning.message,
      operation: "move",
    }));
  }
  return items;
}

/**
 * memory_review. It reads, judges, and returns a worklist. It writes nothing,
 * proposes nothing, and calls nothing that can write.
 */
function reviewOperation(context, options) {
  const { scope } = context;
  const deep = options.scope === "deep";
  const since = options.since;
  const today = isoDate(new Date());
  const warnings = [];

  const collected = collectCandidates(scope, { records: true, specs: false });
  const records = collected.candidates.filter((candidate) => candidate.kind === "record");
  const byId = new Map(records.filter((held) => held.id).map((held) => [held.id, held]));
  const byPath = new Map(records.map((held) => [held.path, held]));

  // --since narrows the record-scoped categories to what was settled on or
  // after that date, which is what a focused review after a save looks at.
  // The project-wide categories run either way, because a save can break a
  // link, a view, or a pin in a record it never touched.
  const inFocus = since === null
    ? () => true
    : (held) => recordDates(held).some((date) => date >= since);
  const focused = since === null ? records : records.filter(inFocus);

  const items = [
    ...reviewDuplicates(records, inFocus),
    ...reviewConflicts(records, byId, inFocus),
    ...reviewProvenance(scope, focused),
    ...reviewStaleDates(focused, today),
    ...checkLinks(scope).findings.map((finding) => findingItem("broken-link", "high", "correct", finding, byPath)),
    ...checkRelativeLinks(scope).findings.map((finding) => findingItem("broken-link", "high", "correct", finding, byPath)),
    ...reviewSupersession(focused, byId),
    ...checkRetiredPhrases(scope).findings.map((finding) => findingItem("retired-phrase", "high", "correct", finding, byPath)),
    ...reviewViews(scope),
    ...reviewPins(scope, byPath),
    ...reviewSearchCapability(collected),
  ];

  if (deep) {
    items.push(...reviewVocabulary(records), ...reviewDurability(records));
  }

  // The gold-set category needs the runner P3-5 builds. Review detects whether
  // it is there and reports the category as skipped either way, because wiring
  // the two together is P3-6's work, and a category that silently reports
  // nothing reads as a pass it never earned.
  const runner = resolve(fileURLToPath(new URL(".", import.meta.url)), GOLD_SET_RUNNER);
  warnings.push(note(
    "startup/missing-source",
    existsSync(runner)
      ? "the gold-set review category is skipped: the runner is present and review does not call it yet"
      : "the gold-set review category is skipped: the gold-set runner is not available in this build",
    { path: `tools/${GOLD_SET_RUNNER}` },
  ));

  items.sort((first, second) => {
    const byCategory = CATEGORY_ORDER.get(first.category) - CATEGORY_ORDER.get(second.category);
    if (byCategory !== 0) return byCategory;
    const bySeverity = SEVERITY_ORDER[first.severity] - SEVERITY_ORDER[second.severity];
    if (bySeverity !== 0) return bySeverity;
    const byPathName = (first.paths[0] ?? "").localeCompare(second.paths[0] ?? "");
    if (byPathName !== 0) return byPathName;
    const byId2 = (first.record_ids[0] ?? "").localeCompare(second.record_ids[0] ?? "");
    if (byId2 !== 0) return byId2;
    return first.what_is_wrong.localeCompare(second.what_is_wrong);
  });

  return { status: "ok", result: items, warnings };
}

/** The category list, so the harness and the skill read one definition. */
export function reviewCategories(depth = "deep") {
  return REVIEW_CATEGORIES
    .filter((entry) => depth === "deep" || entry.depth === "focused")
    .map((entry) => entry.id);
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
 * MOVE. One record changes its canonical path and every project link to it is
 * repaired in the same approved transaction (architecture section 12.4).
 */
function moveOperation(context, options) {
  return moveRecord(context.scope, options);
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
    "search",
    {
      operation: "memory_search",
      run: searchOperation,
      parse: searchParser({ filters: true }),
    },
  ],
  [
    "get",
    {
      operation: "memory_get",
      run: getOperation,
      parse: parseGetFlags,
    },
  ],
  [
    "timeline",
    {
      operation: "memory_timeline",
      run: timelineOperation,
      parse: parseTimelineFlags,
    },
  ],
  [
    "related",
    {
      operation: "memory_related",
      run: related,
      parse: parseRelatedFlags,
    },
  ],
  [
    "sources",
    {
      operation: "memory_sources",
      run: sourcesOperation,
      parse: parseSourcesFlags,
    },
  ],
  [
    "review",
    {
      operation: "memory_review",
      run: reviewOperation,
      parse: parseReviewFlags,
    },
  ],
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
  // The two specification operations carry no memory_ prefix, because the
  // stable surface names them spec_search and spec_get.
  [
    "spec-search",
    {
      operation: "spec_search",
      run: specSearchOperation,
      parse: searchParser({ filters: false }),
    },
  ],
  [
    "spec-get",
    {
      operation: "spec_get",
      run: specGetOperation,
      parse: parseGetFlags,
    },
  ],
  [
    "session-search",
    {
      operation: "session_search",
      run: sessionSearchOperation,
      parse: parseSessionSearchFlags,
    },
  ],
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
  // Move is plumbing too. The stable surface in architecture section 16.1 is
  // closed, and a move creates no meaning: it changes where one record lives
  // and repairs every project link that points at it.
  [
    "move",
    {
      operation: "memory_move",
      surface: false,
      run: moveOperation,
      parse: parseMoveFlags,
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

/** Read --limit, which is a whole number above zero or nothing at all. */
function readLimit(raw, fallback) {
  if (raw === undefined) return { ok: true, limit: fallback };
  if (!/^\d+$/.test(raw) || Number(raw) === 0) {
    return { ok: false, message: "--limit takes a whole number above zero" };
  }
  return { ok: true, limit: Number(raw) };
}

/**
 * One parser for search and spec-search. spec-search defines no record
 * filters, because a specification is not one of the four record types.
 */
function searchParser({ filters }) {
  return (args) => {
    const read = readFlags(args, filters
      ? { query: "value", type: "value", status: "value", domain: "value", topic: "value", limit: "value" }
      : { query: "value", limit: "value" });
    if (!read.ok) return read;
    if (read.values.query === undefined) {
      return { ok: false, message: "search needs --query" };
    }
    const limit = readLimit(read.values.limit, 20);
    if (!limit.ok) return limit;

    return {
      ok: true,
      options: {
        query: read.values.query,
        type: read.values.type ?? null,
        status: read.values.status ?? null,
        domain: read.values.domain ?? null,
        topic: read.values.topic ?? null,
        limit: limit.limit,
      },
    };
  };
}

/** One parser for get and spec-get. Exactly one of --id and --path. */
function parseGetFlags(args) {
  const read = readFlags(args, { id: "value", path: "value" });
  if (!read.ok) return read;
  const { id, path } = read.values;
  if (id === undefined && path === undefined) {
    return { ok: false, message: "get needs --id or --path" };
  }
  if (id !== undefined && path !== undefined) {
    return { ok: false, message: "--id and --path are two different lookups" };
  }
  return { ok: true, options: { id: id ?? null, path: path ?? null } };
}

function parseTimelineFlags(args) {
  const read = readFlags(args, { entity: "value", from: "value", to: "value" });
  if (!read.ok) return read;
  if (!read.values.entity) return { ok: false, message: "timeline needs --entity" };
  return {
    ok: true,
    options: {
      entity: read.values.entity,
      from: read.values.from ?? null,
      to: read.values.to ?? null,
    },
  };
}

function parseSourcesFlags(args) {
  const read = readFlags(args, { id: "value" });
  if (!read.ok) return read;
  if (!read.values.id) return { ok: false, message: "sources needs --id" };
  return { ok: true, options: { id: read.values.id } };
}

/**
 * Session search of contract 2.21.
 *
 * `--reason` is read here and judged by the gate, never by this parser. A call
 * with no reason is a closed gate at exit 1, not a malformed call at exit 2,
 * because contract 2.21 says exactly that: the missing reason is the refusal,
 * and the message has to tell the agent what would open it.
 */
function parseSessionSearchFlags(args) {
  const read = readFlags(args, {
    query: "value",
    reason: "value",
    host: "value",
    machine: "value",
    from: "value",
    to: "value",
  });
  if (!read.ok) return read;
  if (!read.values.query) return { ok: false, message: "session-search needs --query" };
  for (const flag of ["from", "to"]) {
    const value = read.values[flag];
    if (value !== undefined && !DATE_ONLY.test(value)) {
      return { ok: false, message: `--${flag} takes a YYYY-MM-DD date` };
    }
  }
  return {
    ok: true,
    options: {
      query: read.values.query,
      reason: read.values.reason ?? null,
      host: read.values.host ?? null,
      machine: read.values.machine ?? null,
      from: read.values.from ?? null,
      to: read.values.to ?? null,
    },
  };
}

function parseRelatedFlags(args) {
  const read = readFlags(args, { id: "value" });
  if (!read.ok) return read;
  if (!read.values.id) return { ok: false, message: "related needs --id" };
  return { ok: true, options: { id: read.values.id } };
}

/**
 * Move takes the record id and the new path on the proposal, and the proposal
 * id and content hash on the approval, exactly as every other write does.
 */
function parseMoveFlags(args) {
  const read = readFlags(args, {
    id: "value",
    to: "value",
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
    mode: phase.mode,
    proposalId: phase.proposalId,
    contentHash: phase.contentHash,
  };
  if (phase.mode === "apply") return { ok: true, options };
  if (!read.values.id) return { ok: false, message: "move --propose needs --id" };
  if (!read.values.to) return { ok: false, message: "move --propose needs --to naming the new path" };
  options.id = read.values.id;
  options.to = read.values.to;
  if (read.values.why) options.why = read.values.why;
  return { ok: true, options };
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

/**
 * Read the review flags. The scope defaults to focused, which is the review
 * that runs after every approved save.
 */
function parseReviewFlags(args) {
  const read = readFlags(args, { scope: "value", since: "value" });
  if (!read.ok) return read;
  const wanted = read.values.scope ?? "focused";
  if (!REVIEW_SCOPES.includes(wanted)) {
    return { ok: false, message: `--scope takes ${REVIEW_SCOPES.join(" or ")}` };
  }
  const since = read.values.since ?? null;
  if (since !== null && !DATE_ONLY.test(since)) {
    return { ok: false, message: "--since takes a YYYY-MM-DD date" };
  }
  return { ok: true, options: { scope: wanted, since } };
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

  // The scope refusals of architecture section 21.4 name the operation in the
  // message itself, so the context carries it rather than every operation
  // rediscovering its own name.
  context.operation = entry.operation;

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
    // Only retrieval names the scope it covered. Every other operation leaves
    // the field empty, which is what contracts section 1.3 asks for.
    searched: Array.isArray(outcome?.searched) ? outcome.searched : [],
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

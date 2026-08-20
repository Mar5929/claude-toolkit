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
 * get, timeline, related, sources, spec-search, and spec-get), validate,
 * update-current, rebuild-views, the seven writing lifecycle operations, pin
 * and unpin, and the noop, cancel, and move plumbing. The other operations are
 * not stubbed, because
 * a stub that answers is worse than one that says it is not here: capabilities
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
  LIFECYCLE_OPERATIONS,
  PIN_OPERATIONS,
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
import { assembleBootBrief } from "./boot-brief.mjs";
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
    reason: "review is not available in this build",
  },
  {
    feature: "validation",
    reason: "validate carries the required-file, record-schema, link, relative-link, move-repair, pin, and retired-phrase checks only, and reports every other check as skipped",
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
      errors: [note("record/unknown-id", `no record in this scope carries the id ${wanted}`)],
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
    reason: "the session-history adapter is not available in this build",
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

  if (options.path !== null) {
    const absolute = resolve(scope.scopeRoot, options.path);
    if (!isMemberPath(scope, absolute)) {
      return {
        status: "refused",
        errors: [note("scope/outside-root", "the path does not sit inside this project's scope", {
          path: options.path,
        })],
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
    return {
      status: "refused",
      errors: [note(
        "record/unknown-id",
        options.path !== null
          ? `no canonical Markdown file sits at ${options.path} in this scope`
          : `no ${specsOnly ? "specification" : "record"} in this scope carries the id ${String(options.id ?? "").trim()}`,
        options.path !== null ? { path: options.path } : {},
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
      errors: [note("record/unknown-id", `no record in this scope carries the id ${wanted}`)],
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
    skipped_because: "this build does not inspect a search run",
  },
  {
    id: "MV-13",
    version: "2.0",
    severity: "fail",
    title: "no tracker bridge as the sole home of a fact",
    skipped_because: "the tracker bridge reader is not available in this build",
  },
  {
    id: "MV-14",
    version: "2.0",
    severity: "fail",
    title: "identical canonical results after deleting and rebuilding derived state",
    skipped_because: "the delete-and-rebuild fixtures are not available in this build",
  },
  {
    id: "MV-15",
    version: "2.0",
    severity: "fail",
    title: "reads and retrieval create no local state",
    skipped_because: "the no-local-state fixtures are not available in this build",
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
  { id: "MV-21", version: "2.0", severity: "fail", title: "relative-link syntax and resolvable targets" },
  { id: "MV-22", version: "2.0", severity: "fail", title: "complete incoming-link repair after a move or rename" },
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

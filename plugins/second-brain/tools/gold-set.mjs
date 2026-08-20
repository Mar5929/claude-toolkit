#!/usr/bin/env node

/**
 * gold-set.mjs: run this project's retrieval gold set and report honestly.
 *
 * Architecture section 18.1 asks every project for about ten owner-worded
 * questions with the files that should answer them, and sets one bar: at least
 * eight of them answered inside the first five results. FR-037 then says a new
 * retrieval method may be enabled only after it improves that measured number,
 * so this file is the measuring stick every retrieval change has to pass.
 *
 * What it does, in order:
 *
 *   1. resolve the project scope and read the gold set from
 *      knowledge/retrieval-gold-set.md, or from wherever knowledge/map.md maps
 *      it. It never guesses a path.
 *   2. run each question through the real retrieval router in memory.mjs, as a
 *      separate process, exactly as an agent would.
 *   3. score each question: pass, miss, pending, blocked, or error.
 *   4. scan the retrieval code paths for acceleration nobody approved (AT-18).
 *
 * Three rules keep this from reporting a pass it did not earn:
 *
 *   - a question whose expected file is not in the project yet is PENDING, not
 *     a pass and not a failure. A project part way through migration says so.
 *   - a question the environment cannot run, because the scope does not
 *     resolve or because a `.memory/`-absent question meets a project that has
 *     a `.memory/` folder, is BLOCKED and is never counted as passing.
 *   - a run with too few measured questions to reach the bar reports
 *     `not-measured` or `partial`. It never reports the bar as met.
 *
 * The run creates no local state. It reads canonical Markdown through the
 * router, writes nothing anywhere in the project, and checks afterwards that
 * no `.memory/` folder appeared while it was working (AT-17).
 *
 * Run:
 *   node plugins/second-brain/tools/gold-set.mjs [--root <path>] [--set <path>]
 *   node plugins/second-brain/tools/gold-set.mjs --self-test
 *
 * Exit codes follow the tool contract: 0 the run happened, 1 a deterministic
 * rule refused it (the bar was missed, or unapproved acceleration was found),
 * 2 it could not be evaluated.
 */

import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { emit, envelope, note, render } from "./lib/result.mjs";
import { resolveScope, isMemberPath } from "./lib/scope.mjs";
import { PINS_PATH, parsePins, resolvePinTarget } from "./lib/pins.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(HERE, "..");
const MEMORY_TOOL = resolve(HERE, "memory.mjs");
const TEMPLATES = resolve(PLUGIN_ROOT, "skills/second-brain/references/templates-v2/knowledge");

/** The optional canonical home architecture section 7.3.1 names. */
const DEFAULT_SET_PATH = "knowledge/retrieval-gold-set.md";

/** Section 18.1: about ten questions, eight answered in the first five results. */
const DEFAULT_BAR = 8;
const DEFAULT_DEPTH = 5;

/** The v1 folders whose presence means this project has not finished migrating. */
const V1_FOLDERS = [
  "knowledge/memory/context",
  "knowledge/memory/domain",
  "knowledge/memory/knowledge",
  "knowledge/memory/operations",
  "knowledge/memory/planning",
  "knowledge/memory/references",
];

// ---------------------------------------------------------------------------
// The gold set file
// ---------------------------------------------------------------------------

/**
 * Where the gold set lives. The default path wins. A project that keeps test
 * material somewhere else maps it in knowledge/map.md, and the mapped path is
 * read rather than guessed at (section 18.1).
 */
export function findGoldSet(scopeRoot) {
  const preferred = resolve(scopeRoot, DEFAULT_SET_PATH);
  if (existsSync(preferred)) return { path: DEFAULT_SET_PATH, mapped: false };

  const mapPath = resolve(scopeRoot, "knowledge/map.md");
  if (!existsSync(mapPath)) return { path: null, mapped: false };

  for (const line of readFileSync(mapPath, "utf8").replace(/\r\n/g, "\n").split("\n")) {
    if (!/gold set/i.test(line)) continue;
    const match = /`([^`]+\.md)`/.exec(line) ?? /\]\(([^)]+\.md)\)/.exec(line);
    if (!match) continue;
    const target = resolve(scopeRoot, match[1]);
    if (existsSync(target)) return { path: relative(scopeRoot, target).split("\\").join("/"), mapped: true };
  }
  return { path: null, mapped: false };
}

function backtickedPaths(value) {
  const found = [];
  const pattern = /`([^`]+)`/g;
  let match = pattern.exec(value);
  while (match) {
    found.push(match[1].trim());
    match = pattern.exec(value);
  }
  if (found.length) return found;
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Parse the authored file. A question is an H3 heading; the bullets under it
 * carry its fields. Prose headings above H3 are ignored, so the owner may
 * explain the set in the same file.
 */
export function parseGoldSet(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const questions = [];
  const problems = [];
  let bar = DEFAULT_BAR;
  let depth = DEFAULT_DEPTH;
  let current = null;
  let inFence = false;

  const finish = () => {
    if (current) questions.push(current);
    current = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const heading = /^###\s+(.*\S)\s*$/.exec(line);
    if (heading) {
      finish();
      const asked = heading[1].replace(/^Q\d+[.):]\s*/i, "").trim();
      current = {
        question: asked,
        ask: "search",
        query: asked,
        id: null,
        path: null,
        entity: null,
        expect: [],
        expect_nothing: false,
        cases: [],
        answerable: "now",
        note: null,
      };
      continue;
    }
    if (/^#{1,2}\s/.test(line)) {
      finish();
      continue;
    }

    const bullet = /^\s*[-*]\s+\*{0,2}([A-Za-z][A-Za-z ]*?)\*{0,2}\s*:\s*(.*)$/.exec(line);
    if (!bullet) continue;
    const key = bullet[1].trim().toLowerCase();
    const value = bullet[2].trim();

    if (!current) {
      if (key === "bar") {
        const number = /(\d+)/.exec(value);
        if (number) bar = Number(number[1]);
      }
      if (key === "results checked" || key === "depth") {
        const number = /(\d+)/.exec(value);
        if (number) depth = Number(number[1]);
      }
      continue;
    }

    switch (key) {
      case "ask":
        current.ask = value.replace(/`/g, "").trim().toLowerCase();
        break;
      case "query":
        current.query = value.replace(/^`|`$/g, "").trim();
        break;
      case "id":
        current.id = value.replace(/`/g, "").trim();
        break;
      case "path":
        current.path = value.replace(/`/g, "").trim();
        break;
      case "entity":
        current.entity = value.replace(/`/g, "").trim();
        break;
      case "expect":
        if (/^nothing\b/i.test(value.replace(/`/g, "").trim())) current.expect_nothing = true;
        else current.expect = backtickedPaths(value);
        break;
      case "case":
        current.cases = value
          .replace(/`/g, "")
          .split(",")
          .map((entry) => entry.trim().toLowerCase())
          .filter(Boolean);
        break;
      case "answerable":
        current.answerable = /after/i.test(value) ? "after migration" : "now";
        break;
      case "note":
        current.note = value;
        break;
      default:
        problems.push(`the question "${current.question}" carries the unknown field ${key}`);
    }
  }
  finish();

  for (const question of questions) {
    if (!SUPPORTED_ASKS.includes(question.ask)) {
      problems.push(`the question "${question.question}" asks ${question.ask}, which this runner does not run`);
    }
    if (!question.expect_nothing && question.expect.length === 0) {
      problems.push(`the question "${question.question}" names no expected file and does not expect nothing`);
    }
  }

  return { bar, depth, questions, problems };
}

const SUPPORTED_ASKS = ["search", "spec-search", "get", "spec-get", "timeline"];

// ---------------------------------------------------------------------------
// Running one question
// ---------------------------------------------------------------------------

function callRouter(projectRoot, args) {
  const run = spawnSync(process.execPath, [MEMORY_TOOL, ...args], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  let payload = null;
  try {
    payload = JSON.parse(run.stdout);
  } catch {
    payload = null;
  }
  return { code: run.status, payload, stderr: run.stderr };
}

function argsFor(question, depth) {
  switch (question.ask) {
    case "search":
      return ["search", "--query", question.query, "--limit", String(depth)];
    case "spec-search":
      return ["spec-search", "--query", question.query, "--limit", String(depth)];
    case "get":
      return question.id ? ["get", "--id", question.id] : ["get", "--path", question.path ?? ""];
    case "spec-get":
      return question.id ? ["spec-get", "--id", question.id] : ["spec-get", "--path", question.path ?? ""];
    case "timeline":
      return ["timeline", "--entity", question.entity ?? ""];
    default:
      return null;
  }
}

/** The paths one answer named, in the order the router ranked them. */
function answeredPaths(payload, depth) {
  const result = payload?.result ?? null;
  if (result === null) return [];
  const entries = Array.isArray(result) ? result : [result];
  return entries
    .slice(0, depth)
    .map((entry) => (entry && typeof entry === "object" ? entry.path ?? null : null))
    .filter(Boolean);
}

/**
 * Whether the project finished migrating to v2. A question marked
 * "after migration" stays pending until this is true, which is what keeps a
 * half-migrated project from reporting failures it cannot yet fix.
 */
export function migrationState(scopeRoot) {
  const reasons = [];
  if (!existsSync(resolve(scopeRoot, "knowledge/current.md"))) {
    reasons.push("knowledge/current.md is not there yet");
  }
  for (const folder of V1_FOLDERS) {
    if (existsSync(resolve(scopeRoot, folder))) reasons.push(`the version 1 folder ${folder} is still in place`);
  }
  return { migrated: reasons.length === 0, reasons };
}

/** Which records this project pins, so a pinned question can say what it found. */
function pinnedPaths(scope) {
  const path = resolve(scope.scopeRoot, PINS_PATH);
  if (!existsSync(path)) return [];
  const entries = parsePins(readFileSync(path, "utf8"));
  return entries
    .map((entry) => resolvePinTarget(scope.scopeRoot, entry.target)?.path ?? null)
    .filter(Boolean);
}

function runQuestion(scope, question, context) {
  const { depth, migrated, pins } = context;
  const detail = {
    question: question.question,
    ask: question.ask,
    cases: question.cases,
    expected: question.expect_nothing ? "nothing" : question.expect,
    outcome: "blocked",
    reason: "",
    answered: [],
  };

  const missing = question.expect.filter((path) => !existsSync(resolve(scope.scopeRoot, path)));
  if (missing.length && question.answerable === "after migration") {
    detail.outcome = "pending";
    detail.reason = `the expected file ${missing[0]} is not in this project yet`;
    return detail;
  }
  if (!migrated.migrated && question.answerable === "after migration") {
    detail.outcome = "pending";
    detail.reason = `this project has not finished migrating: ${migrated.reasons[0]}`;
    return detail;
  }
  if (question.cases.includes("memory-absent") && existsSync(resolve(scope.scopeRoot, ".memory"))) {
    detail.outcome = "blocked";
    detail.reason = "this question has to run with .memory/ absent, and the project has one. Nothing was deleted";
    return detail;
  }

  const args = argsFor(question, depth);
  if (!args) {
    detail.outcome = "error";
    detail.reason = `${question.ask} is not an operation this runner knows`;
    return detail;
  }

  const run = callRouter(scope.scopeRoot, args);
  if (!run.payload) {
    detail.outcome = "error";
    detail.reason = "the router printed no result this runner could read";
    return detail;
  }
  detail.searched = run.payload.searched ?? [];

  if (run.payload.status === "error") {
    detail.outcome = "error";
    detail.reason = run.payload.errors?.[0]?.message ?? "the router could not evaluate the question";
    return detail;
  }

  const answered = answeredPaths(run.payload, depth);
  detail.answered = answered;

  if (question.cases.includes("memory-absent") && existsSync(resolve(scope.scopeRoot, ".memory"))) {
    detail.outcome = "error";
    detail.reason = "the question ran and a .memory/ folder appeared, so the read created local state";
    return detail;
  }

  if (question.expect_nothing) {
    if (answered.length === 0 && run.payload.status !== "refused") {
      detail.outcome = "pass";
      detail.reason = "the answer stayed empty, which is what this question asks for";
    } else if (run.payload.status === "refused") {
      detail.outcome = "pass";
      detail.reason = `the router refused it: ${run.payload.errors?.[0]?.message ?? "no reason given"}`;
    } else {
      detail.outcome = "miss";
      detail.reason = `the answer named ${answered.length} file(s) when it should have named none`;
    }
    return detail;
  }

  const found = question.expect.filter((path) => answered.includes(path));
  if (found.length === question.expect.length) {
    detail.outcome = "pass";
    detail.reason = `every expected file came back inside the first ${depth} results`;
  } else {
    detail.outcome = "miss";
    const absent = question.expect.filter((path) => !answered.includes(path));
    detail.reason = `${absent.join(", ")} did not come back inside the first ${depth} results`;
  }

  if (question.cases.includes("pinned")) {
    detail.pinned = question.expect.every((path) => pins.includes(path));
    if (!detail.pinned) {
      detail.reason = `${detail.reason}. The expected record is not pinned in ${PINS_PATH}`;
    }
  }
  return detail;
}

// ---------------------------------------------------------------------------
// The acceleration refusal, AT-18
// ---------------------------------------------------------------------------

/**
 * The files that make up the retrieval path. gold-set.mjs is not one of them:
 * it measures retrieval, it does not perform it, and its self-test writes
 * fixtures to a temporary folder, which the rules below rightly forbid in a
 * file that answers a question.
 */
export const RETRIEVAL_PATH_FILES = [
  "tools/memory.mjs",
  "tools/boot-brief.mjs",
  "tools/tracker-adapter.mjs",
  "tools/lib/scope.mjs",
  "tools/lib/result.mjs",
  "tools/lib/record-schema.mjs",
  "tools/lib/links.mjs",
  "tools/lib/pins.mjs",
  "tools/lib/cross-scope.mjs",
  "hooks/boot-brief-session-start.mjs",
  "skills/session-search/scripts/search-sessions.mjs",
];

/**
 * Names that only appear in code once somebody has wired an index, an
 * embedding store, a vector database, or a search service into the read path.
 * Architecture sections 16.2 and 16.3 and ADR-014 make every one of them a new
 * owner-approved decision, not a build-time choice.
 */
const ACCELERATION_TOKENS = [
  "sqlite", "sqlite3", "better_sqlite3", "bettersqlite3", "fts5", "fts4",
  "lunr", "minisearch", "flexsearch", "elasticlunr", "orama", "typesense",
  "meilisearch", "elasticsearch", "opensearch", "solr",
  "faiss", "hnsw", "hnswlib", "annoy", "lancedb", "chromadb", "pinecone",
  "weaviate", "qdrant", "milvus", "pgvector",
  "embedding", "embeddings", "vectorstore", "vector_store", "vectorindex",
  "leveldb", "lmdb", "redis", "memcached", "indexeddb",
  "buildindex", "createindex", "writeindex", "searchindex", "writecache",
  "cachedir", "cachefile", "backgroundindexer", "reindex",
];

/** Writing anything at all in a file whose whole job is to answer a question. */
const WRITE_CALLS = [
  "writefilesync", "appendfilesync", "mkdirsync", "mkdtempsync", "rmsync",
  "rmdirsync", "unlinksync", "renamesync", "copyfilesync", "cpsync",
  "createwritestream", "writesync", "truncatesync", "opensync",
];

/**
 * Remove what is not code. Comments and message strings in these files talk
 * about the very things the scan forbids ("there is no index, cache, or
 * embedding store"), so a scan that reads them reports the promise as the
 * breach. Keeping strings is an option, because import specifiers live in
 * them, so the caller says which pass it wants.
 *
 * A template literal is dropped whole, including anything interpolated inside
 * it. Nothing in the retrieval path builds code that way, and the alternative
 * is a JavaScript parser this build does not need.
 */
export function stripSource(source, { strings = true } = {}) {
  const out = [];
  let index = 0;
  let previous = "";

  const startsRegex = () => {
    if (!previous) return true;
    return "(,=:[!&|?{};+-*%~^<>".includes(previous) || /\breturn|typeof|case|in|of$/.test(previous);
  };

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (char === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") index++;
      continue;
    }
    if (char === "/" && next === "*") {
      index += 2;
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) index++;
      index += 2;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      const quote = char;
      let literal = char;
      index++;
      while (index < source.length) {
        const inner = source[index];
        if (inner === "\\") {
          literal += source.slice(index, index + 2);
          index += 2;
          continue;
        }
        literal += inner;
        index++;
        if (inner === quote) break;
      }
      out.push(strings ? " " : literal);
      previous = strings ? "" : quote;
      continue;
    }
    if (char === "/" && startsRegex()) {
      index++;
      let inClass = false;
      while (index < source.length) {
        const inner = source[index];
        if (inner === "\\") {
          index += 2;
          continue;
        }
        if (inner === "[") inClass = true;
        else if (inner === "]") inClass = false;
        else if (inner === "/" && !inClass) {
          index++;
          break;
        } else if (inner === "\n") break;
        index++;
      }
      while (index < source.length && /[gimsuyd]/.test(source[index])) index++;
      out.push(" ");
      previous = "/";
      continue;
    }

    out.push(char);
    if (!/\s/.test(char)) previous = char;
    index++;
  }
  return out.join("");
}

/** Every module specifier a file imports, however it imports it. */
export function importSpecifiers(source) {
  const code = stripSource(source, { strings: false });
  const found = [];
  // The clause between `import` and `from` holds identifiers, braces, commas,
  // and newlines, and never a quote or a semicolon. Saying so keeps one
  // statement's match from running into the next one's string.
  const patterns = [
    /\bimport\s[^'";]*?\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bexport\s[^'";]*?\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']/g,
    /\brequire\s*\(\s*["']([^"']+)["']/g,
  ];
  for (const pattern of patterns) {
    let match = pattern.exec(code);
    while (match) {
      found.push(match[1]);
      match = pattern.exec(code);
    }
  }
  return [...new Set(found)];
}

function wordPresent(code, token) {
  const pattern = new RegExp(`(^|[^A-Za-z0-9_])${token}([^A-Za-z0-9_]|$)`, "i");
  return pattern.test(code);
}

/**
 * The AT-18 check. It reads the retrieval path as code and refuses three
 * things: a dependency that is not a Node built-in or a file in this plugin,
 * a name that only exists once an accelerator is wired in, and a write call in
 * a file whose job is to answer a question without leaving a trace.
 */
export function scanAcceleration(pluginRoot = PLUGIN_ROOT, files = RETRIEVAL_PATH_FILES) {
  const refusals = [];
  const scanned = [];

  for (const relativePath of files) {
    const path = resolve(pluginRoot, relativePath);
    if (!existsSync(path)) continue;
    scanned.push(relativePath);
    const source = readFileSync(path, "utf8");

    for (const specifier of importSpecifiers(source)) {
      const local = specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("/");
      if (specifier.startsWith("node:") || local) {
        // A built-in can be an accelerator too. Node ships node:sqlite, so a
        // waved-through specifier is still read for the forbidden names. The
        // token pass below strips strings, which is where an import specifier
        // lives, so nothing else in this scan would catch it.
        const accelerator = ACCELERATION_TOKENS.find((token) => wordPresent(specifier, token));
        if (accelerator) {
          refusals.push({
            rule: "gold-set/acceleration-enabled",
            path: relativePath,
            detail: `it imports ${specifier}, which names ${accelerator}, and retrieval acceleration needs a new approved decision record first`,
          });
        }
        continue;
      }
      refusals.push({
        rule: "gold-set/acceleration-dependency",
        path: relativePath,
        detail: `it imports ${specifier}, which is not a Node built-in or a file in this plugin`,
      });
    }

    const code = stripSource(source, { strings: true });
    for (const token of ACCELERATION_TOKENS) {
      if (!wordPresent(code, token)) continue;
      refusals.push({
        rule: "gold-set/acceleration-enabled",
        path: relativePath,
        detail: `its code names ${token}, and retrieval acceleration needs a new approved decision record first`,
      });
    }
    for (const call of WRITE_CALLS) {
      if (!wordPresent(code, call)) continue;
      refusals.push({
        rule: "gold-set/read-path-writes",
        path: relativePath,
        detail: `it calls ${call}, and a read may not create local state`,
      });
    }
  }
  return { scanned, refusals };
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

function verdictFor(counts, bar) {
  if (counts.measured === 0) return "not-measured";
  if (counts.pass >= bar) return "met";
  if (counts.miss > 0 || counts.error > 0) return "missed";
  return "partial";
}

/**
 * Read the set from a folder whose scope did not resolve. Only the default
 * path and an explicit --set are tried here, because knowledge/map.md is read
 * against a scope root this project does not have.
 */
function readSetWithoutScope(root, setPath) {
  const candidate = resolve(root, setPath ?? DEFAULT_SET_PATH);
  if (!existsSync(candidate)) {
    return { path: null, bar: DEFAULT_BAR, depth: DEFAULT_DEPTH, questions: [] };
  }
  try {
    const parsed = parseGoldSet(readFileSync(candidate, "utf8"));
    return {
      path: relative(root, candidate).split("\\").join("/"),
      bar: parsed.bar,
      depth: parsed.depth,
      questions: parsed.questions,
    };
  } catch {
    return { path: null, bar: DEFAULT_BAR, depth: DEFAULT_DEPTH, questions: [] };
  }
}

/**
 * Run the whole set against one project. The caller owns printing; this
 * returns the envelope so the self-test can read it as data.
 */
export function runGoldSet({ root = process.cwd(), setPath = null } = {}) {
  const scope = resolveScope(root);
  const warnings = [];
  const errors = [];

  const acceleration = scanAcceleration();
  for (const refusal of acceleration.refusals) {
    errors.push(note(
      "record/schema-invalid",
      `${refusal.rule}: ${refusal.detail}`,
      { path: refusal.path },
    ));
  }

  if (!scope.ok) {
    // The set is still worth reading and reporting. A project that cannot
    // resolve its own scope runs nothing, and saying which ten questions are
    // waiting is more use than saying none were found.
    const waiting = readSetWithoutScope(resolve(root), setPath);
    const blocked = waiting.questions.map((question) => ({
      question: question.question,
      ask: question.ask,
      cases: question.cases,
      expected: question.expect_nothing ? "nothing" : question.expect,
      outcome: "blocked",
      reason: `this project's scope does not resolve: ${scope.error.message}`,
      answered: [],
    }));
    return envelope({
      operation: "gold_set",
      status: acceleration.refusals.length ? "refused" : "ok",
      result: {
        verdict: "not-measured",
        reason: `this project's scope does not resolve, so no question could run: ${scope.error.message}`,
        bar: waiting.bar,
        depth: waiting.depth,
        gold_set: waiting.path,
        project_state: "unresolved",
        counts: {
          total: blocked.length,
          pass: 0,
          miss: 0,
          pending: 0,
          blocked: blocked.length,
          error: 0,
          measured: 0,
        },
        questions: blocked,
        acceleration: { scanned: acceleration.scanned, refusals: acceleration.refusals },
        local_state_created: false,
      },
      warnings: [note("startup/missing-source", scope.error.message, { path: scope.error.path })],
      errors,
    });
  }

  const found = setPath ? { path: setPath, mapped: false } : findGoldSet(scope.scopeRoot);
  if (!found.path || !existsSync(resolve(scope.scopeRoot, found.path))) {
    return envelope({
      operation: "gold_set",
      status: acceleration.refusals.length ? "refused" : "ok",
      projectId: scope.projectId,
      scopeRoot: scope.scopeRoot,
      result: {
        verdict: "missing",
        reason: `this project has no gold set at ${DEFAULT_SET_PATH} and knowledge/map.md maps none`,
        bar: DEFAULT_BAR,
        depth: DEFAULT_DEPTH,
        gold_set: null,
        project_state: "unknown",
        counts: { total: 0, pass: 0, miss: 0, pending: 0, blocked: 0, error: 0, measured: 0 },
        questions: [],
        acceleration: { scanned: acceleration.scanned, refusals: acceleration.refusals },
        local_state_created: false,
      },
      warnings: [note(
        "startup/missing-source",
        "a missing gold set is a reported state, and it blocks only a proposed retrieval change",
        { path: DEFAULT_SET_PATH },
      )],
      errors,
    });
  }

  const setAbsolute = resolve(scope.scopeRoot, found.path);
  if (!isMemberPath(scope, setAbsolute)) {
    return emitError(scope, note(
      "scope/outside-root",
      "the mapped gold set sits outside this project's scope",
      { path: found.path },
    ), acceleration);
  }

  let parsed;
  try {
    parsed = parseGoldSet(readFileSync(setAbsolute, "utf8"));
  } catch (error) {
    return emitError(scope, note(
      "retrieval/parse-error",
      `the gold set could not be read: ${error.code ?? "read failed"}`,
      { path: found.path },
    ), acceleration);
  }
  if (parsed.questions.length === 0) {
    return emitError(scope, note(
      "retrieval/parse-error",
      "the gold set holds no question this runner could read",
      { path: found.path },
    ), acceleration);
  }
  for (const problem of parsed.problems) {
    warnings.push(note("record/schema-invalid", problem, { path: found.path }));
  }

  const memoryFolderBefore = existsSync(resolve(scope.scopeRoot, ".memory"));
  const context = {
    depth: parsed.depth,
    migrated: migrationState(scope.scopeRoot),
    pins: pinnedPaths(scope),
  };

  const questions = [];
  let searched = [];
  for (const question of parsed.questions) {
    const detail = runQuestion(scope, question, context);
    if (searched.length === 0 && Array.isArray(detail.searched) && detail.searched.length) {
      searched = detail.searched;
    }
    delete detail.searched;
    questions.push(detail);
  }

  const counts = { total: questions.length, pass: 0, miss: 0, pending: 0, blocked: 0, error: 0, measured: 0 };
  for (const detail of questions) counts[detail.outcome] += 1;
  counts.measured = counts.pass + counts.miss + counts.error;

  const memoryFolderAfter = existsSync(resolve(scope.scopeRoot, ".memory"));
  const localStateCreated = !memoryFolderBefore && memoryFolderAfter;
  if (localStateCreated) {
    errors.push(note(
      "record/schema-invalid",
      "gold-set/local-state-created: a .memory/ folder appeared while the set was running, so a read created local state",
      { path: ".memory" },
    ));
  }

  const verdict = verdictFor(counts, parsed.bar);
  const state = context.migrated.migrated ? "v2" : "pre-v2";
  const reasons = {
    met: `${counts.pass} of ${counts.total} questions answered inside the first ${parsed.depth} results, and the bar is ${parsed.bar}`,
    missed: `only ${counts.pass} of ${counts.total} questions answered inside the first ${parsed.depth} results, and the bar is ${parsed.bar}`,
    partial: `${counts.pass} of ${counts.total} questions passed and none missed, but ${counts.total - counts.measured} could not run, so the bar of ${parsed.bar} is not proven either way`,
    "not-measured": `no question could run: ${counts.pending} pending and ${counts.blocked} blocked`,
  };

  if (!context.migrated.migrated) {
    warnings.push(note(
      "record/legacy-gap",
      `this project has not finished migrating to memory system v2: ${context.migrated.reasons.join("; ")}`,
      { path: "knowledge/project.md" },
    ));
  }

  const refused = verdict === "missed" || acceleration.refusals.length > 0 || localStateCreated;
  if (verdict === "missed") {
    errors.push(note(
      "record/schema-invalid",
      `gold-set/bar-missed: ${reasons.missed}`,
      { path: found.path },
    ));
  }

  return envelope({
    operation: "gold_set",
    status: refused ? "refused" : "ok",
    projectId: scope.projectId,
    scopeRoot: scope.scopeRoot,
    result: {
      verdict,
      reason: reasons[verdict],
      bar: parsed.bar,
      depth: parsed.depth,
      gold_set: found.path,
      project_state: state,
      counts,
      questions,
      acceleration: { scanned: acceleration.scanned, refusals: acceleration.refusals },
      local_state_created: localStateCreated,
    },
    warnings,
    errors,
    searched,
  });
}

function emitError(scope, problem, acceleration) {
  return envelope({
    operation: "gold_set",
    status: "error",
    projectId: scope.projectId,
    scopeRoot: scope.scopeRoot,
    result: {
      verdict: "not-measured",
      reason: problem.message,
      bar: DEFAULT_BAR,
      depth: DEFAULT_DEPTH,
      gold_set: problem.path ?? null,
      project_state: "unknown",
      counts: { total: 0, pass: 0, miss: 0, pending: 0, blocked: 0, error: 0, measured: 0 },
      questions: [],
      acceleration: { scanned: acceleration.scanned, refusals: acceleration.refusals },
      local_state_created: false,
    },
    warnings: [],
    errors: [problem],
  });
}

// ---------------------------------------------------------------------------
// The self-test: AT-16, AT-18, and the runner's own honesty
// ---------------------------------------------------------------------------

const fixtures = [];
let passed = 0;

function ok(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed++;
  console.log(`PASS: ${message}`);
}

function fixture(name) {
  const path = mkdtempSync(join(realpathSync(tmpdir()), `gold-set-${name}-`));
  fixtures.push(path);
  return path;
}

function writeFixture(base, path, content) {
  const absolute = resolve(base, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
}

function snapshot(base, skip = []) {
  const contents = new Map();
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      const rel = relative(base, path).split("\\").join("/");
      if (skip.some((prefix) => rel === prefix || rel.startsWith(`${prefix}/`))) continue;
      if (entry.isDirectory()) walk(path);
      else contents.set(rel, readFileSync(path, "utf8"));
    }
  };
  walk(base);
  return contents;
}

function sameFiles(first, second) {
  if (first.size !== second.size) return false;
  for (const [path, text] of first) {
    if (second.get(path) !== text) return false;
  }
  return true;
}

function fixtureRecord(id, type, title, body, extra = [], sections = []) {
  return [
    "---",
    "schema_version: 2",
    `id: ${id}`,
    `type: ${type}`,
    "status: active",
    "epistemic_status: documented",
    "recorded_at: 2026-08-19",
    "domain: retrieval",
    "entities: [gold set]",
    "approval:",
    "  actor: owner",
    "  approved_at: 2026-08-19",
    "  action: add",
    "evidence:",
    "  - source_type: owner_statement",
    "    locator: knowledge/specs/retrieval-policy.md",
    "based_on: []",
    ...extra,
    "---",
    "",
    `# ${title}`,
    "",
    `${body}`,
    "",
    ...sections,
  ].join("\n");
}

const FIXTURE_VIEW_STUB = [
  "---",
  "generated: true",
  "generator: record-summaries",
  "inputs:",
  "  - knowledge/memory/facts",
  "---",
  "",
  "# Fact summaries",
  "",
].join("\n");

function fixtureProject(name, goldSet) {
  const base = fixture(name);
  cpSync(TEMPLATES, resolve(base, "knowledge"), { recursive: true });
  const settings = readFileSync(resolve(base, "knowledge/project.md"), "utf8")
    .replace("replace-with-a-stable-project-id", `fixture-${name}`);
  writeFixture(base, "knowledge/project.md", settings);
  writeFixture(base, "knowledge/current.md", [
    "---",
    "updated: 2026-08-20",
    "---",
    "",
    "# Current state",
    "",
    "## Current focus",
    "",
    "Proving the gold set runner.",
    "",
    "## Blockers",
    "",
    "None.",
    "",
    "## Next step",
    "",
    "Run the self-test.",
    "",
    "## Handoff",
    "",
    "The runner reads the router and writes nothing.",
    "",
  ].join("\n"));
  writeFixture(base, "knowledge/specs/retrieval-policy.md", [
    "# Retrieval policy",
    "",
    "Retrieval reads canonical Markdown directly and creates no local state.",
    "",
  ].join("\n"));
  writeFixture(base, "knowledge/memory/facts/gold-set-bar.md", fixtureRecord(
    "fact-gold-set-bar",
    "fact",
    "The gold set bar is eight of ten",
    "Eight of the ten gold set questions must answer inside the first five results.",
  ));
  writeFixture(base, "knowledge/memory/decisions/no-accelerator.md", fixtureRecord(
    "decision-no-accelerator",
    "decision",
    "No retrieval accelerator without a new decision",
    "A local index, embeddings, or a search service needs a new approved decision record.",
    ["topics: [acceleration]"],
    [
      "## Context",
      "",
      "Direct search answers this project today.",
      "",
      "## Decision",
      "",
      "Nothing accelerates retrieval without a new approved record.",
      "",
      "## Reason",
      "",
      "An unmeasured change cannot be judged.",
      "",
      "## Rejected options",
      "",
      "A stored search index.",
      "",
      "## Consequences",
      "",
      "Every retrieval change runs the gold set first.",
      "",
    ],
  ));
  writeFixture(base, DEFAULT_SET_PATH, goldSet);
  return base;
}

function goldSetText(entries, { bar = 2, depth = 5 } = {}) {
  const lines = [
    "# Retrieval gold set",
    "",
    `- Bar: ${bar} of ${entries.length}`,
    `- Results checked: the first ${depth}`,
    "",
    "## The questions",
    "",
  ];
  for (const entry of entries) {
    lines.push(`### ${entry.question}`, "");
    for (const [key, value] of Object.entries(entry.fields)) lines.push(`- ${key}: ${value}`);
    lines.push("");
  }
  return lines.join("\n");
}

function selfTest() {
  console.log("gold-set.mjs self-test");

  // The acceleration scan, AT-18. The real retrieval path is clean, a file
  // with an accelerator wired in is refused, and prose about accelerators is
  // not mistaken for one.
  const live = scanAcceleration();
  ok(live.scanned.length >= 8, `the scan reads ${live.scanned.length} retrieval files`);
  ok(live.refusals.length === 0, "the shipped retrieval path carries no acceleration and no write call");

  const accelerated = fixture("accelerated");
  writeFixture(accelerated, "tools/fake-router.mjs", [
    'import Database from "better-sqlite3";',
    'import { writeFileSync } from "node:fs";',
    "",
    "export function search(query) {",
    '  const db = new Database(".memory/search.db");',
    '  const embeddings = db.prepare("select * from fts5_index").all();',
    '  writeFileSync(".memory/cache/search.json", JSON.stringify(embeddings));',
    "  return embeddings;",
    "}",
    "",
  ].join("\n"));
  const caught = scanAcceleration(accelerated, ["tools/fake-router.mjs"]);
  const rules = caught.refusals.map((entry) => entry.rule);
  ok(rules.includes("gold-set/acceleration-dependency"), "an outside dependency in the read path is refused");
  ok(rules.includes("gold-set/acceleration-enabled"), "an index or embedding store in the read path is refused");
  ok(rules.includes("gold-set/read-path-writes"), "a write call in the read path is refused");

  // A built-in accelerator. Node ships node:sqlite, so an index can be wired in
  // with no outside dependency at all, and the specifier lives in a string the
  // token pass strips. The import pass has to catch it.
  writeFixture(accelerated, "tools/builtin-router.mjs", [
    'import { DatabaseSync } from "node:sqlite";',
    'import { readFileSync } from "node:fs";',
    "",
    "export function search(query) {",
    '  const store = new DatabaseSync(":memory:");',
    "  return [store, query, readFileSync];",
    "}",
    "",
  ].join("\n"));
  const builtin = scanAcceleration(accelerated, ["tools/builtin-router.mjs"]);
  const builtinRules = builtin.refusals.map((entry) => entry.rule);
  ok(
    builtinRules.includes("gold-set/acceleration-enabled"),
    "a built-in accelerator imported as node:sqlite is refused",
  );
  ok(
    builtin.refusals.some((entry) => entry.detail.includes("node:sqlite")),
    "the built-in refusal names the specifier it read",
  );
  ok(
    scanAcceleration(accelerated, ["tools/builtin-router.mjs"]).refusals.length === builtin.refusals.length,
    "the built-in scan returns the same refusals every run",
  );

  writeFixture(accelerated, "tools/honest-router.mjs", [
    "// This router builds no sqlite index, no embeddings, and no cache.",
    'import { readFileSync } from "node:fs";',
    "",
    "export function search(query) {",
    '  const quoted = readFileSync("knowledge/current.md", "utf8").replace(/["\']/g, " ");',
    '  return quoted.includes(query) ? ["knowledge/current.md"] : [];',
    "}",
    "",
  ].join("\n"));
  const honest = scanAcceleration(accelerated, ["tools/honest-router.mjs"]);
  ok(honest.refusals.length === 0, "a comment and a string naming an index are not mistaken for one");

  // The runner against a real project.
  const questions = [
    {
      question: "What is the gold set bar?",
      fields: {
        Query: "gold set bar",
        Expect: "`knowledge/memory/facts/gold-set-bar.md`",
        Case: "owner vocabulary",
      },
    },
    {
      question: "Anything here about the Kubernetes autoscaler?",
      fields: { Query: "Kubernetes autoscaler", Expect: "nothing", Case: "must-return-nothing" },
    },
    {
      question: "What did the acme-billing project decide about invoices?",
      fields: { Query: "acme-billing invoices", Expect: "nothing", Case: "cross-project" },
    },
    {
      question: "Where is the decision about accelerators?",
      fields: {
        Ask: "get",
        Id: "decision-no-accelerator",
        Expect: "`knowledge/memory/decisions/no-accelerator.md`",
        Case: "exact-id",
      },
    },
    {
      question: "What happened to the gold set over time?",
      fields: {
        Ask: "timeline",
        Entity: "gold set",
        Expect: "`knowledge/memory/facts/gold-set-bar.md`",
        Case: "timeline",
      },
    },
    {
      question: "What does the retrieval policy say, with no .memory/ present?",
      fields: {
        Ask: "spec-search",
        Query: "retrieval policy local state",
        Expect: "`knowledge/specs/retrieval-policy.md`",
        Case: "memory-absent",
      },
    },
    {
      question: "What did we decide about pinning the release checklist?",
      fields: {
        Query: "release checklist pin",
        Expect: "`knowledge/memory/decisions/release-checklist.md`",
        Answerable: "after migration",
        Case: "later",
      },
    },
    {
      question: "What is the standing decision about accelerators?",
      fields: {
        Query: "accelerator approved decision",
        Expect: "`knowledge/memory/decisions/no-accelerator.md`",
        Case: "pinned",
      },
    },
  ];
  const project = fixtureProject("run", goldSetText(questions, { bar: 6 }));
  writeFixture(project, PINS_PATH, [
    "# Pins",
    "",
    "| Record id | Record | Pinned | Summary hash |",
    "| --- | --- | --- | --- |",
    "| decision-no-accelerator | [the accelerator decision](decisions/no-accelerator.md) | 2026-08-19 | sha256:unchecked |",
    "",
  ].join("\n"));

  const before = snapshot(project);
  const first = runGoldSet({ root: project });
  const after = snapshot(project);
  ok(sameFiles(before, after), "running the whole set changes no byte in the project");
  ok(!existsSync(resolve(project, ".memory")), "running the whole set creates no .memory/ folder");
  ok(first.result.local_state_created === false, "the runner reports that it created no local state");
  ok(first.result.counts.total === questions.length, "every question in the file ran or was accounted for");
  ok(first.result.counts.pending === 1, "the question whose expected file is absent is pending, not a miss");
  ok(first.result.counts.miss === 0, "no question in the passing fixture missed");
  ok(first.result.verdict === "met", `the verdict is met (this run says ${first.result.verdict})`);
  ok(first.status === "ok", "a met bar is exit 0");

  const nothing = first.result.questions.find((entry) => entry.cases.includes("must-return-nothing"));
  ok(nothing.outcome === "pass", "an empty answer passes the must-return-nothing question");
  const exact = first.result.questions.find((entry) => entry.cases.includes("exact-id"));
  ok(exact.outcome === "pass", "the exact-id question passes through get");
  const pinned = first.result.questions.find((entry) => entry.cases.includes("pinned"));
  ok(pinned.outcome === "pass" && pinned.pinned === true, "the pinned question reports that the record is pinned");

  // A blocked question is never a pass: the same set, with .memory/ present.
  writeFixture(project, ".memory/review/p-2026-08-20-0001.md", "a leftover proposal\n");
  const blocked = runGoldSet({ root: project });
  const absentCase = blocked.result.questions.find((entry) => entry.cases.includes("memory-absent"));
  ok(absentCase.outcome === "blocked", "a .memory/-absent question is blocked when the folder is there");
  ok(existsSync(resolve(project, ".memory/review/p-2026-08-20-0001.md")), "the runner deleted nothing to run it");

  // AT-16: delete every derived file, rebuild, and get the same answers.
  writeFixture(project, "knowledge/memory/facts/summaries.md", FIXTURE_VIEW_STUB);
  const built = spawnSync(process.execPath, [MEMORY_TOOL, "rebuild-views"], { cwd: project, encoding: "utf8" });
  ok(built.status === 0, "the fixture's declared view rebuilds");
  const viewPath = resolve(project, "knowledge/memory/facts/summaries.md");
  const viewBefore = readFileSync(viewPath, "utf8");
  ok(viewBefore.includes("fingerprint:"), "the rebuilt view carries its input fingerprint");

  const canonicalBefore = snapshot(project, [".memory", "knowledge/memory/facts/summaries.md"]);
  const answersBefore = render(runGoldSet({ root: project }).result.questions);

  rmSync(resolve(project, ".memory"), { recursive: true, force: true });
  writeFileSync(viewPath, FIXTURE_VIEW_STUB, "utf8");
  const rebuilt = spawnSync(process.execPath, [MEMORY_TOOL, "rebuild-views"], { cwd: project, encoding: "utf8" });
  ok(rebuilt.status === 0, "the view rebuilds again after every derived file is deleted");

  ok(readFileSync(viewPath, "utf8") === viewBefore, "the rebuilt view is byte for byte the file that was deleted");
  const canonicalAfter = snapshot(project, [".memory", "knowledge/memory/facts/summaries.md"]);
  ok(sameFiles(canonicalBefore, canonicalAfter), "deleting derived state changed no canonical file");
  const answersAfter = render(runGoldSet({ root: project }).result.questions);
  ok(answersAfter === answersBefore, "AT-16: the same questions come back with the same answers after the rebuild");

  // A set that misses the bar is a refusal at exit 1, and a missing set is not.
  const failing = fixtureProject("missed", goldSetText([
    {
      question: "Where is the release checklist?",
      fields: { Query: "release checklist", Expect: "`knowledge/memory/facts/release-checklist.md`" },
    },
    {
      question: "Where is the escalation policy?",
      fields: { Query: "escalation policy", Expect: "`knowledge/specs/escalation.md`" },
    },
  ], { bar: 2 }));
  const missed = runGoldSet({ root: failing });
  ok(missed.result.verdict === "missed", "a set whose expected files never come back reports missed");
  ok(missed.status === "refused", "a missed bar is a refusal, which the contract maps to exit 1");
  ok(
    missed.errors.some((entry) => entry.message.startsWith("gold-set/bar-missed")),
    "the refusal names the rule that refused it",
  );

  const bare = fixtureProject("bare", "# Retrieval gold set\n\nNo questions yet.\n");
  rmSync(resolve(bare, DEFAULT_SET_PATH));
  const missing = runGoldSet({ root: bare });
  ok(missing.result.verdict === "missing", "a project with no gold set reports a missing set");
  ok(missing.status === "ok", "a missing set is a reported state, not a failure");

  // A project whose scope does not resolve, which is what a project still on
  // version 1 looks like. Every question is blocked and none of them passes.
  const unresolved = fixture("unresolved");
  writeFixture(unresolved, "knowledge/project.md", "# A project with no front matter yet\n");
  writeFixture(unresolved, DEFAULT_SET_PATH, goldSetText([
    { question: "Where is the release checklist?", fields: { Expect: "`knowledge/specs/release.md`" } },
    { question: "Anything about the autoscaler?", fields: { Expect: "nothing" } },
  ], { bar: 2 }));
  const stuck = runGoldSet({ root: unresolved });
  ok(stuck.result.verdict === "not-measured", "a project whose scope does not resolve measures nothing");
  ok(stuck.result.counts.blocked === 2, "every question in that project is blocked, not passing");
  ok(stuck.result.gold_set === DEFAULT_SET_PATH, "the report still names the set that is waiting");
  ok(stuck.status === "ok", "a project that cannot run the set yet is not a failure");

  // Parsing: a question that names no expectation is a visible problem.
  const parsed = parseGoldSet([
    "# Set",
    "",
    "- Bar: 8 of 10",
    "",
    "### A question with nothing to check",
    "",
    "- Query: anything",
    "- Colour: blue",
    "",
  ].join("\n"));
  ok(parsed.bar === 8, "the bar is read from the file");
  ok(parsed.problems.length === 2, "an unknown field and a missing expectation are both reported");

  console.log(`\n${passed} checks passed`);
}

// ---------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const options = { root: process.cwd(), set: null, selfTest: false };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === "--self-test") options.selfTest = true;
    else if (flag === "--root") options.root = argv[++index] ?? options.root;
    else if (flag === "--set") options.set = argv[++index] ?? null;
    else return { error: `${flag} is not a flag this tool takes` };
  }
  return options;
}

function main(argv) {
  const options = parseArgs(argv);
  if (options.error) {
    emit(envelope({
      operation: "gold_set",
      status: "error",
      errors: [note("cli/invalid-invocation", options.error)],
    }));
    return;
  }

  if (options.selfTest) {
    try {
      selfTest();
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    } finally {
      for (const path of fixtures) rmSync(path, { recursive: true, force: true });
    }
    return;
  }

  const root = resolve(options.root);
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    emit(envelope({
      operation: "gold_set",
      status: "error",
      errors: [note("scope/unresolved-root", "--root does not name a directory", { path: root })],
    }));
    return;
  }
  emit(runGoldSet({ root, setPath: options.set }));
}

const invoked = process.argv[1] ? resolve(process.argv[1]) : "";
if (invoked === resolve(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2));
}

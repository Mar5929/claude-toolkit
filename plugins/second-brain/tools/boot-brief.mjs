#!/usr/bin/env node

/**
 * Boot brief assembler, memory system v2.
 *
 * This file is both the source resolver and the boot brief assembler in the
 * architecture's component model. It reads the authored and canonical startup
 * inputs, renders the ten blocks in architecture section 10.2 order, keeps the
 * result inside the configured budget by the four degradation steps in section
 * 10.4, and reports a missing or stale input as a visible warning instead of
 * blocking the session (section 10.5).
 *
 * Three rules it may never trade away for room:
 *
 *   1. The stale warning survives every degradation step, as one labeled line
 *      carrying its date.
 *   2. Degradation step 3 collapses only current areas outside the current
 *      focus, the blockers, and the next step. It never touches those three.
 *   3. When the required set alone will not fit, every required block is still
 *      rendered, `startup/over-budget` is reported with the exact byte count,
 *      and the brief continues in a visible overflow mode.
 *
 * It is read-only. It never writes knowledge/current.md, a session summary, a
 * cache, an index, or any other state. The same inputs always produce the same
 * bytes, which is what acceptance test AT-44 asks for. Every date in the output
 * comes from a file. The one rendered value the clock takes part in is the age
 * label section 10.3 requires on the fallback recent item, and that item always
 * carries its authored date beside the label.
 *
 * The current and recent blocks follow section 10.3. They select, sort, label,
 * and link authored lines. They never write a new statement, and they never
 * paraphrase a fact, number, date, qualifier, decision, or failure reason. When
 * knowledge/current.md is missing or stale, the brief says so and names the
 * date it has, and it states no focus, blocker, or next step the file does not
 * carry (FR-116, AT-43).
 *
 * Extension points, deliberately left open:
 *
 *   - `renderPins` is the pin work item's seat. The version here reads the
 *     optional pin file, verifies each summary hash, and renders the record's
 *     own approved summary.
 *   - The tracker adapter in tools/tracker-adapter.mjs is optional and reads
 *     the configured board. With no tracker configured, or with the configured
 *     one unreachable, startup shows the dated content of knowledge/current.md
 *     and labels live status unverified. `options.tracker` replaces the reader,
 *     which is how a test drives the success path with no network call.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { findProjectFile, isMemberPath, parseFrontMatter, resolveScope } from "./lib/scope.mjs";
import { note } from "./lib/result.mjs";
import { createTracker } from "./tracker-adapter.mjs";

/** Architecture section 10.4. Used when the project sets no budget. */
export const DEFAULT_BUDGET_BYTES = 10240;

/** Architecture section 10.3. The recent window, and the staleness threshold. */
export const RECENT_WINDOW_HOURS = 72;

/** Architecture section 10.4, in order. The assembler applies them one at a time. */
export const DEGRADATION_STEPS = ["warnings", "recent", "current", "map"];

const RECORD_FOLDERS = ["facts", "decisions", "events", "patterns"];

/** The record kind each folder holds, used as the authored label on a line. */
const FOLDER_KINDS = {
  facts: "fact",
  decisions: "decision",
  events: "event",
  patterns: "pattern",
};

/**
 * Architecture section 10.3 calls the recent window a set of meaningful
 * updates. A retired or superseded record is not one: it is no longer current
 * truth, and the record that replaced it carries the update instead.
 */
const INELIGIBLE_RECENT_STATUS = ["retired", "superseded"];

/** Section 10.3 shows at most this many updates from inside the window. */
export const RECENT_WINDOW_LIMIT = 3;

const REQUIRED_CURRENT_AREAS = ["current focus", "blockers", "next step"];

const HANDOFF_AREA = "handoff";

const toolsDirectory = dirname(fileURLToPath(import.meta.url));

function byteLength(text) {
  return Buffer.byteLength(text, "utf8");
}

function repositoryPath(root, absolute) {
  const rel = relative(root, absolute);
  return rel ? rel.split(sep).join("/") : ".";
}

/** Front matter plus the body beneath it. The shared parser owns the front matter. */
function splitDocument(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return { data: {}, body: normalized };
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) return { data: {}, body: normalized };
  const parsed = parseFrontMatter(normalized);
  return { data: parsed.data ?? {}, body: normalized.slice(end + 5) };
}

function readIfPresent(absolute, label, warnings, { required = false } = {}) {
  if (!existsSync(absolute)) {
    if (required) warnings.push(note("startup/missing-source", `${label} is missing`, { path: label }));
    return null;
  }
  try {
    return readFileSync(absolute, "utf8").replace(/\r\n/g, "\n");
  } catch (error) {
    warnings.push(note(
      "startup/missing-source",
      `${label} could not be read: ${error.code ?? "read failed"}`,
      { path: label },
    ));
    return null;
  }
}

function isRealDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function hoursSince(date, now) {
  const stamp = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(stamp)) return null;
  return (now.getTime() - stamp) / 3600000;
}

function trimBlank(lines) {
  const copy = [...lines];
  while (copy.length && !copy[0].trim()) copy.shift();
  while (copy.length && !copy[copy.length - 1].trim()) copy.pop();
  return copy;
}

/** Split a Markdown body into its `## ` areas, keeping the authored lines. */
function splitAreas(body) {
  const areas = [];
  let current = null;
  for (const line of body.split("\n")) {
    const heading = line.match(/^##\s+(.*\S)\s*$/);
    if (heading) {
      current = { title: heading[1], lines: [] };
      areas.push(current);
      continue;
    }
    if (current) current.lines.push(line);
  }
  return areas.map((area) => ({
    title: area.title,
    key: area.title.trim().toLowerCase(),
    lines: trimBlank(area.lines),
  }));
}

/** The first authored section of a document, before its second heading. */
function leadSection(body) {
  const lines = body.split("\n");
  const collected = [];
  let started = false;
  for (const line of lines) {
    if (/^#{1,6}\s/.test(line)) {
      if (started) break;
      started = true;
      continue;
    }
    if (started) collected.push(line);
  }
  return trimBlank(collected.length ? collected : lines);
}

function markdownFiles(directory) {
  if (!existsSync(directory)) return [];
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const path = resolve(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && entry.name.endsWith(".md")) found.push(path);
    }
  };
  walk(directory);
  return found;
}

function firstHeading(body) {
  for (const line of body.split("\n")) {
    const heading = line.match(/^#\s+(.*\S)\s*$/);
    if (heading) return heading[1];
  }
  return null;
}

function firstSentence(body) {
  for (const line of body.split("\n")) {
    const text = line.trim();
    if (!text || text.startsWith("#") || text.startsWith(">") || text.startsWith("|")) continue;
    return text;
  }
  return null;
}

/**
 * The approved one-sentence summary of a record. A record carries it in front
 * matter. Where it does not, the record's own first heading stands in, which is
 * authored text rather than a paraphrase.
 */
function recordSummary(parsed) {
  const declared = typeof parsed.data.summary === "string" ? parsed.data.summary.trim() : "";
  if (declared) return declared;
  return firstHeading(parsed.body) || firstSentence(parsed.body) || null;
}

function readRecord(root, absolute, folder = null) {
  let text;
  try {
    text = readFileSync(absolute, "utf8");
  } catch {
    return null;
  }
  const parsed = splitDocument(text);
  const date = [parsed.data.date, parsed.data.updated, parsed.data.approved]
    .find((value) => isRealDate(value)) || null;
  const declaredKind = typeof parsed.data.type === "string" ? parsed.data.type.trim().toLowerCase() : "";
  const status = typeof parsed.data.status === "string" ? parsed.data.status.trim().toLowerCase() : "";
  return {
    path: repositoryPath(root, absolute),
    date,
    status,
    kind: declaredKind || (folder ? FOLDER_KINDS[folder] ?? null : null),
    summary: recordSummary(parsed),
  };
}

/** Whole days, floored, used only for the fallback item's age label. */
function ageInDays(hours) {
  return Math.max(0, Math.floor(hours / 24));
}

function ageLabel(hours) {
  const days = ageInDays(hours);
  if (days === 0) return "less than a day";
  return days === 1 ? "1 day" : `${days} days`;
}

/**
 * Parse the optional pin file. The pin work item owns its canonical shape. This
 * reader takes a table row of record id, record link, approval date, and
 * summary hash, which is exactly what architecture section 11.2 stores.
 */
export function parsePins(text) {
  const entries = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) continue;
    const cells = trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
    if (cells.length < 4) continue;
    const [id, link, date, hash] = cells;
    const path = link.replace(/^\[[^\]]*\]\(([^)]+)\)$/, "$1").replace(/`/g, "").trim();
    if (!path.endsWith(".md")) continue;
    entries.push({ id, path, date, hash: hash.replace(/`/g, "").trim() });
  }
  return entries;
}

function summaryHash(summary) {
  return `sha256:${createHash("sha256").update(summary, "utf8").digest("hex")}`;
}

/** Read the mapped roles and their physical paths from the authored map. */
function parseMapRows(text) {
  const rows = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) continue;
    const cells = trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
    if (cells.length < 2) continue;
    if (/^[-:\s]+$/.test(cells[0])) continue;
    const role = cells[0].replace(/`/g, "");
    const path = cells[1].replace(/`/g, "");
    const heading = role.toLowerCase();
    if (!role || !path || heading === "role" || heading === "file") continue;
    // The second cell has to read as a route. A table about something else,
    // such as the optional canonical files, is not a mapped role.
    if (/\s/.test(path) && path.toLowerCase() !== "not present") continue;
    rows.push({ role, path });
  }
  return rows;
}

function majorFolders(rows) {
  const folders = [];
  for (const row of rows) {
    if (!row.path || row.path.toLowerCase() === "not present") continue;
    const head = row.path.split("/").filter(Boolean)[0];
    if (!head || head.includes(" ")) continue;
    const label = row.path.includes("/") ? `${head}/` : head;
    if (!folders.includes(label)) folders.push(label);
  }
  return folders;
}

/**
 * The source resolver. It reads every startup input by layer and returns the
 * model the renderer works from. It writes nothing, and it never invents a
 * value: a missing source produces a warning and an empty block.
 */
export function collectSources(scope, options = {}) {
  const root = scope.scopeRoot;
  const knowledge = scope.knowledgeDir;
  const warnings = [...(scope.warnings ?? [])];
  const now = options.now instanceof Date ? options.now : new Date();
  const deadline = typeof options.timeBudgetMs === "number"
    ? Date.now() + options.timeBudgetMs
    : null;
  const outOfTime = () => deadline !== null && Date.now() > deadline;

  const settings = scope.settings ?? {};
  const budgetValue = settings.startup && typeof settings.startup === "object"
    ? settings.startup.budget_bytes
    : undefined;
  let budget = DEFAULT_BUDGET_BYTES;
  if (typeof budgetValue === "number" && Number.isFinite(budgetValue) && budgetValue > 0) {
    budget = budgetValue;
  } else if (budgetValue !== undefined && budgetValue !== null) {
    warnings.push(note(
      "startup/missing-source",
      `startup.budget_bytes is not a positive number, so the default ${DEFAULT_BUDGET_BYTES} applies`,
      { path: "knowledge/project.md" },
    ));
  }

  const projectText = readIfPresent(scope.projectFile, "knowledge/project.md", warnings, { required: true });
  const purpose = projectText === null ? [] : leadSection(splitDocument(projectText).body);
  if (purpose.length === 0) {
    warnings.push(note(
      "startup/missing-source",
      "knowledge/project.md carries no authored purpose",
      { path: "knowledge/project.md" },
    ));
  }

  // Tracker. The adapter is optional (architecture section 10.6). With none
  // configured, or with the configured one unreachable, startup shows the
  // dated content of knowledge/current.md and labels live status unverified
  // (section 20). The no-tracker path is the default: an absent tracker block
  // runs no adapter and starts no command.
  const trackerSettings = settings.tracker && typeof settings.tracker === "object"
    ? settings.tracker
    : null;
  let tracker = { configured: Boolean(trackerSettings), available: false, route: null, items: [] };
  if (!trackerSettings) {
    warnings.push(note("tracker/not-configured", "no work tracker is configured for this project"));
  } else {
    const adapter = trackerSettings.adapter ? String(trackerSettings.adapter) : "unnamed adapter";
    const board = trackerSettings.project ? String(trackerSettings.project) : "unnamed board";
    tracker.route = `${adapter}: ${board}`;
    const read = typeof options.tracker === "function" ? options.tracker : createTracker();
    let answer;
    if (outOfTime()) {
      answer = { available: false, reason: "the startup time limit was reached before the tracker was read" };
    } else {
      try {
        answer = read(trackerSettings, { root, now });
      } catch {
        // The reader is not supposed to throw. If it does, the brief degrades.
        answer = { available: false, reason: "the tracker adapter failed" };
      }
    }
    if (answer && answer.available) {
      tracker = { ...tracker, ...answer, route: tracker.route, configured: true };
    } else {
      const reason = answer && typeof answer.reason === "string" && answer.reason.trim()
        ? `: ${answer.reason.trim()}`
        : "";
      warnings.push(note("tracker/unavailable", `${tracker.route} could not be reached${reason}`));
    }
  }

  // Current state and the authored handoff.
  const currentPath = resolve(knowledge, "current.md");
  const currentText = readIfPresent(currentPath, "knowledge/current.md", warnings, { required: true });
  const current = { present: currentText !== null, updated: null, stale: true, areas: [], handoff: [] };
  if (currentText !== null) {
    const parsed = splitDocument(currentText);
    current.updated = isRealDate(parsed.data.updated) ? parsed.data.updated : null;
    const areas = splitAreas(parsed.body);
    current.handoff = (areas.find((area) => area.key === HANDOFF_AREA) ?? { lines: [] }).lines;
    current.areas = areas.filter((area) => area.key !== HANDOFF_AREA);
    const age = current.updated === null ? null : hoursSince(current.updated, now);
    current.stale = age === null || age > RECENT_WINDOW_HOURS;
    for (const key of REQUIRED_CURRENT_AREAS) {
      if (current.areas.some((area) => area.key === key)) continue;
      warnings.push(note(
        "startup/missing-source",
        `knowledge/current.md has no ${key} area`,
        { path: "knowledge/current.md" },
      ));
    }
    if (current.handoff.length === 0) {
      warnings.push(note(
        "startup/missing-source",
        "knowledge/current.md carries no authored handoff",
        { path: "knowledge/current.md" },
      ));
    }
  }
  if (current.stale) {
    warnings.push(note(
      "startup/stale-current",
      current.updated
        ? `knowledge/current.md was last updated ${current.updated}, which is older than the ${RECENT_WINDOW_HOURS} hour window`
        : "knowledge/current.md is missing or carries no dated update",
      { path: "knowledge/current.md" },
    ));
  }

  // Recent window, architecture section 10.3. Eligible records are the dated
  // approved records that are still current truth. Each one carries the age
  // the window rule sorts and labels by. Nothing here writes a new statement:
  // the summary is the record's own approved one, and the link is its path.
  const recent = [];
  if (outOfTime()) {
    warnings.push(note(
      "startup/missing-source",
      "the startup time limit was reached before the recent window was read",
      { path: "knowledge/memory/" },
    ));
  } else {
    for (const folder of RECORD_FOLDERS) {
      for (const file of markdownFiles(resolve(knowledge, "memory", folder))) {
        const record = readRecord(root, file, folder);
        if (!record || !record.date || !record.summary) continue;
        if (INELIGIBLE_RECENT_STATUS.includes(record.status)) continue;
        const age = hoursSince(record.date, now);
        recent.push({
          ...record,
          ageHours: age,
          withinWindow: age !== null && age <= RECENT_WINDOW_HOURS,
        });
      }
    }
    recent.sort((a, b) => (
      a.date === b.date ? a.path.localeCompare(b.path) : b.date.localeCompare(a.date)
    ));
  }

  // Pins. An absent pin file means the project has no pins, which is not an error.
  const pins = [];
  const pinText = readIfPresent(resolve(knowledge, "memory/pins.md"), "knowledge/memory/pins.md", warnings);
  if (pinText !== null) {
    for (const entry of parsePins(pinText)) {
      const absolute = resolve(root, entry.path);
      if (!isMemberPath(scope, absolute) || !existsSync(absolute)) {
        warnings.push(note(
          "startup/missing-source",
          `pinned record ${entry.id} is not a readable file in this project`,
          { path: entry.path },
        ));
        continue;
      }
      const record = readRecord(root, absolute);
      if (!record || !record.summary) {
        warnings.push(note(
          "startup/pin-hash-mismatch",
          `pinned record ${entry.id} carries no approved summary, so it is omitted`,
          { path: entry.path },
        ));
        continue;
      }
      if (entry.hash && entry.hash !== summaryHash(record.summary)) {
        warnings.push(note(
          "startup/pin-hash-mismatch",
          `pinned record ${entry.id} has a summary the owner has not approved for startup, so it is omitted`,
          { path: entry.path },
        ));
        continue;
      }
      pins.push({ id: entry.id, path: entry.path, date: entry.date, summary: record.summary });
    }
  }

  // Project map, and the owner working contract it routes to.
  const mapText = readIfPresent(resolve(knowledge, "map.md"), "knowledge/map.md", warnings, { required: true });
  const mapRows = mapText === null ? [] : parseMapRows(mapText);
  const contract = mapRows.filter((row) => (
    /rules|host instructions|output style|skills/i.test(row.role)
    && row.path.toLowerCase() !== "not present"
  ));
  for (const row of contract) {
    if (existsSync(resolve(root, row.path))) continue;
    warnings.push(note(
      "startup/missing-source",
      `the map points at ${row.path} for ${row.role}, and it is not there`,
      { path: "knowledge/map.md" },
    ));
  }

  return {
    projectId: scope.projectId,
    root,
    privacy: scope.privacy,
    budget,
    purpose,
    tracker,
    current,
    recent,
    pins,
    map: { rows: mapRows, folders: majorFolders(mapRows) },
    contract,
    memoryTool: resolve(toolsDirectory, "memory.mjs"),
    warnings,
  };
}

function countLink(count, noun, path) {
  const unit = count === 1 ? noun : `${noun}s`;
  return `- ${count} ${unit}. See ${path}.`;
}

/**
 * Block 5, the current state. Every line is authored in knowledge/current.md.
 * A missing file or a missing area says so and names nothing else, because a
 * session may state no focus, blocker, or next step the file does not carry.
 */
export function renderCurrent(model, state) {
  if (!model.current.present) {
    return [
      "- knowledge/current.md is missing, so this project authors no current state.",
      "- State no current focus, blocker, or next step. Never build one from conversation history.",
    ];
  }
  const lines = [];
  const other = model.current.areas.filter((area) => !REQUIRED_CURRENT_AREAS.includes(area.key));
  const dated = model.current.updated ? ` (updated ${model.current.updated})` : " (no dated update)";
  const staleNote = model.current.stale
    ? ` Older than the ${RECENT_WINDOW_HOURS} hour window, so read it as of that date.`
    : "";
  const liveNote = model.tracker.available
    ? ` Live work-item status comes from ${model.tracker.route} in block 4.`
    : " Live status stays unverified, because no reachable tracker confirmed it.";
  lines.push(`Authored in knowledge/current.md${dated}.${staleNote}${liveNote}`);
  for (const key of REQUIRED_CURRENT_AREAS) {
    const area = model.current.areas.find((entry) => entry.key === key);
    lines.push("", `### ${area ? area.title : key}`, "");
    lines.push(...(area && area.lines.length
      ? area.lines
      : [`knowledge/current.md authors no ${key}. Do not supply one.`]));
  }
  if (other.length === 0) return lines;
  // Degradation step 3 collapses these areas only. It never reaches the three above.
  if (state.collapse.includes("current")) {
    lines.push("", countLink(other.length, "other current area", "knowledge/current.md"));
    return lines;
  }
  for (const area of other) {
    lines.push("", `### ${area.title}`, "");
    lines.push(...area.lines);
  }
  return lines;
}

/** One recent line: the record's own date, kind, approved summary, and path. */
function recentLine(record) {
  const kind = record.kind ? ` ${record.kind}` : "";
  return `- ${record.date}${kind}: ${record.summary} (${record.path})`;
}

/**
 * Block 6, the recent window, architecture section 10.3.
 *
 * Up to three eligible updates dated inside the last 72 hours, newest first.
 * When none is inside the window, the latest dated update stands in and is
 * labeled with its age, so nobody reads an old update as this week's news.
 * Everything the block shows is authored: the date, the record's approved
 * one-sentence summary, and the link. It writes no new statement.
 */
export function renderRecent(model, state) {
  if (model.recent.length === 0) {
    return ["- No dated approved record summaries are authored in knowledge/memory/ yet."];
  }
  const collapsed = state.collapse.includes("recent");
  const inWindow = model.recent.filter((record) => record.withinWindow);
  const lines = [];
  let shown = [];

  if (inWindow.length > 0) {
    shown = inWindow.slice(0, collapsed ? 1 : RECENT_WINDOW_LIMIT);
    lines.push(...shown.map(recentLine));
  } else {
    // The fallback. One item, clearly labeled with how old it is (FR-005).
    const latest = model.recent[0];
    shown = [latest];
    const age = latest.ageHours === null ? null : ageLabel(latest.ageHours);
    lines.push(
      age === null
        ? `- No approved update in the last ${RECENT_WINDOW_HOURS} hours. The latest dated update follows.`
        : `- No approved update in the last ${RECENT_WINDOW_HOURS} hours. The latest dated update is ${age} old.`,
    );
    lines.push(recentLine(latest));
  }

  // Degradation step 2 turns the rest into a count and a link.
  const remaining = model.recent.length - shown.length;
  if (remaining > 0) lines.push(countLink(remaining, "older update", "knowledge/memory/"));
  return lines;
}

/** Block 7. The pin work item replaces the body of this function. */
export function renderPins(model) {
  if (model.pins.length === 0) return ["- No pinned memory in this project."];
  return model.pins.map((pin) => `- ${pin.summary} (${pin.path})`);
}

function renderMap(model, state) {
  if (model.map.rows.length === 0) return ["- knowledge/map.md is missing or maps no roles."];
  if (state.collapse.includes("map")) {
    if (model.map.folders.length === 0) return ["- See knowledge/map.md."];
    return [`- Major folders: ${model.map.folders.join(", ")}. See knowledge/map.md.`];
  }
  return model.map.rows.map((row) => `- ${row.role}: ${row.path}`);
}

function staleLine(model) {
  if (!model.current.stale) return null;
  return model.current.updated
    ? `- Stale current state: knowledge/current.md was last updated ${model.current.updated}, more than ${RECENT_WINDOW_HOURS} hours ago. Never invent newer status.`
    : "- Stale current state: knowledge/current.md is missing or carries no dated update. Never invent current status.";
}

function renderWarnings(model, state) {
  const stale = staleLine(model);
  const others = model.warnings.filter((entry) => entry.code !== "startup/stale-current");
  const lines = [];
  // The stale line is rendered first and is never collapsed. A brief that hides
  // how old its current state is misleads worse than a brief that runs long.
  if (stale) lines.push(stale);
  if (others.length === 0) {
    if (!stale) lines.push("- No startup warnings.");
    return lines;
  }
  // Degradation step 1 turns the rest of the warning detail into a count and a link.
  if (state.collapse.includes("warnings")) {
    lines.push(countLink(others.length, "other startup warning", "the memory tool route in block 9"));
    return lines;
  }
  for (const entry of others) {
    lines.push(`- ${entry.code}: ${entry.message}${entry.path ? ` (${entry.path})` : ""}`);
  }
  return lines;
}

const EMPTY_STATE = { collapse: [], overflow: false, overflowBytes: 0 };

/** Render the ten blocks in architecture section 10.2 order. */
export function renderBrief(model, state = EMPTY_STATE) {
  const out = [];
  const block = (number, title, lines) => {
    out.push(`## ${number}. ${title}`, "", ...lines, "");
  };

  out.push(`# Project boot brief: ${model.projectId}`, "");
  if (state.overflow) {
    out.push(
      `> Over budget. The required blocks are ${state.overflowBytes} bytes and the configured budget is ${model.budget} bytes.`,
      "> Every required block is rendered anyway. Raise startup.budget_bytes or review the pin set.",
      "",
    );
  }

  block(1, "Identity and operating route", [
    `- Project id: ${model.projectId}`,
    `- Privacy: level ${model.privacy.level}, external transfer ${model.privacy.external_transfer}, third-party personal ${model.privacy.third_party_personal}.`,
    "- This brief is assembled read-only at startup. It is not a file and it writes nothing.",
    "- Read it before substantive work. Never build current status out of conversation history.",
  ]);

  block(2, "Project purpose", [
    ...(model.purpose.length ? model.purpose : ["- knowledge/project.md carries no authored purpose."]),
    "",
    model.tracker.configured
      ? `- Work tracker: ${model.tracker.route}${model.tracker.available ? "." : ", not reachable in this session, so live status is unverified."}`
      : "- No work tracker is configured. Current state comes from knowledge/current.md alone.",
  ]);

  block(3, "Owner working contract", model.contract.length
    ? model.contract.map((row) => `- ${row.role}: ${row.path}`)
    : ["- knowledge/map.md maps no rules, skills, or output style."]);

  block(4, "Latest authored handoff", [
    ...(model.current.handoff.length
      ? model.current.handoff
      : ["- knowledge/current.md carries no authored handoff."]),
    ...(model.tracker.items ?? []).map((item) => `- Work item: ${item}`),
  ]);

  block(5, "Current state", renderCurrent(model, state));
  block(6, "Recent window", renderRecent(model, state));
  block(7, "Pinned memory", renderPins(model, state));
  block(8, "Project map", renderMap(model, state));

  block(9, "Memory contract, skills, and tools", [
    `- Memory operations: node ${model.memoryTool} <operation>`,
    "- Run the capabilities operation first. Never guess what this project supports.",
    "- Skills: remember, recall, cleanup, session-search. Read the one you need before using it.",
    "- knowledge/memory/, knowledge/specs/, and knowledge/current.md change only through the memory write operations, and only with the owner's approval.",
  ]);

  block(10, "Warnings and degraded capabilities", renderWarnings(model, state));

  return `${out.join("\n").replace(/\n+$/, "")}\n`;
}

/**
 * Assemble the brief. Returns the rendered text, the warnings, the byte count,
 * and which degradation steps were applied, in the order they were applied.
 */
export function assembleBootBrief(options = {}) {
  const start = resolve(options.projectRoot || options.cwd || process.cwd());
  const scope = resolveScope(start);
  if (!scope.ok) {
    return {
      ok: false,
      code: scope.error.code,
      message: scope.error.message,
      text: "",
      warnings: [scope.error],
      bytes: 0,
      budget: DEFAULT_BUDGET_BYTES,
      applied: [],
      overBudget: false,
      model: null,
    };
  }

  const model = collectSources(scope, options);
  const budget = typeof options.budget === "number" && options.budget > 0
    ? options.budget
    : model.budget;
  model.budget = budget;

  const applied = [];
  let text = renderBrief(model, { collapse: applied, overflow: false, overflowBytes: 0 });
  while (byteLength(text) > budget && applied.length < DEGRADATION_STEPS.length) {
    applied.push(DEGRADATION_STEPS[applied.length]);
    text = renderBrief(model, { collapse: applied, overflow: false, overflowBytes: 0 });
  }

  let overBudget = false;
  if (byteLength(text) > budget) {
    // Nothing required is ever dropped to fit. The brief says so and runs long.
    overBudget = true;
    const requiredBytes = byteLength(text);
    model.warnings.push(note(
      "startup/over-budget",
      `the required blocks are ${requiredBytes} bytes and the configured budget is ${budget} bytes`,
      { path: "knowledge/project.md" },
    ));
    text = renderBrief(model, { collapse: applied, overflow: true, overflowBytes: requiredBytes });
  }

  return {
    ok: true,
    code: null,
    message: null,
    text,
    warnings: model.warnings,
    bytes: byteLength(text),
    budget,
    applied,
    overBudget,
    model,
  };
}

/** True when this directory sits inside a project that has the v2 core. */
export function isMemoryProject(startDir) {
  return findProjectFile(startDir) !== null;
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const root = args.find((arg) => !arg.startsWith("--")) || process.cwd();
  const brief = assembleBootBrief({ projectRoot: root });

  if (!brief.ok) {
    if (json) {
      process.stdout.write(`${JSON.stringify({
        schema: "boot-brief/1",
        ok: false,
        code: brief.code,
        message: brief.message,
      }, null, 2)}\n`);
      return;
    }
    process.stdout.write(
      `[Boot brief: ${brief.message}. Continue without it.]\n`,
    );
    return;
  }

  if (!json) {
    process.stdout.write(brief.text);
    return;
  }

  process.stdout.write(`${JSON.stringify({
    schema: "boot-brief/1",
    ok: true,
    project_id: brief.model.projectId,
    bytes: brief.bytes,
    budget: brief.budget,
    applied: brief.applied,
    over_budget: brief.overBudget,
    warnings: brief.warnings,
    text: brief.text,
  }, null, 2)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    main();
  } catch (error) {
    // Read-only and fail-open. A broken brief degrades a session, never stops one.
    process.stdout.write(`[Boot brief failed open: ${error.message}. Continue without it.]\n`);
  }
  process.exitCode = 0;
}

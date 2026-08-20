#!/usr/bin/env node

/**
 * Optional tracker adapter, memory system v2.
 *
 * A work tracker is optional (architecture section 10.6). A project with no
 * `tracker` block in knowledge/project.md has no adapter, and startup works
 * exactly as before: it shows the dated content of knowledge/current.md and
 * labels live status unverified.
 *
 * Where a tracker is configured, this file reads it and hands the boot brief
 * a small set of work-item lines. It never copies tracker status into a file,
 * and knowledge/current.md never copies tracker status either, so the project
 * keeps one current-status record and it stays in the tracker (ADR-006).
 *
 * Three rules this file may never trade away:
 *
 *   1. It never blocks startup. Every failure returns an unavailable answer
 *      with a short mechanical reason. Nothing throws out of `createTracker`.
 *   2. Every wait is bounded. One command gets one tight timeout, and the
 *      whole read gets a deadline, so a hung CLI cannot hold a session open.
 *   3. A reason never carries command output. A tracker's standard error can
 *      hold tokens, URLs, and private titles, so failures map to fixed
 *      phrases instead (contracts section 1.7).
 *
 * The one adapter here is `github-project`, which reads a GitHub Projects
 * board through the `gh` command line. The command runner is injectable so a
 * test can drive the success path without a network call.
 *
 * Settings, in knowledge/project.md front matter:
 *
 *   tracker:
 *     adapter: github-project
 *     project: Claude-Toolkit-Project   # the board title
 *     owner: some-org                   # optional, defaults to @me
 *     number: 7                         # optional, skips the title lookup
 */

import { execFileSync } from "node:child_process";

/** One command gets this long to answer. Startup is not a place to wait. */
export const DEFAULT_TIMEOUT_MS = 2500;

/** The whole tracker read gets this long, however many commands it takes. */
export const DEFAULT_DEADLINE_MS = 5000;

/** How many work items reach the brief. The budget in section 10.4 is shared. */
export const DEFAULT_ITEM_LIMIT = 3;

/** How many boards a title lookup will read before it gives up. */
const BOARD_LOOKUP_LIMIT = 100;

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Map a failed command to a short fixed phrase. Command output never appears
 * here: a tracker's standard error can carry tokens, URLs, and private item
 * titles, and none of that belongs in a startup warning.
 */
function failureReason(command, error, timeoutMs) {
  if (error && error.code === "ENOENT") return `the ${command} command is not installed`;
  if (error && (error.code === "ETIMEDOUT" || error.killed)) {
    return `${command} did not answer within ${timeoutMs} ms`;
  }
  if (error && error.code === "EACCES") return `the ${command} command is not runnable`;
  if (error && typeof error.status === "number") {
    return `${command} exited ${error.status}, so the board may be unreachable or the session unauthenticated`;
  }
  return `the ${command} command could not be run`;
}

/**
 * The default command runner. Synchronous, bounded, and quiet: standard error
 * is discarded so nothing from the tracker leaks into a warning, and the
 * prompt and update notices are turned off so the command cannot wait on a
 * human at session start.
 */
export function runCommand(command, args, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  try {
    const stdout = execFileSync(command, args, {
      encoding: "utf8",
      timeout: timeoutMs,
      killSignal: "SIGKILL",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
      maxBuffer: 1024 * 1024,
      env: {
        ...process.env,
        GH_PROMPT_DISABLED: "1",
        GH_NO_UPDATE_NOTIFIER: "1",
        NO_COLOR: "1",
      },
    });
    return { ok: true, stdout: typeof stdout === "string" ? stdout : "" };
  } catch (error) {
    return { ok: false, stdout: "", reason: failureReason(command, error, timeoutMs) };
  }
}

function parseJson(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

/** GitHub returns either a bare array or an object holding one. */
function jsonList(value, key) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value[key])) return value[key];
  return null;
}

/** The status field of a board item, whatever single-select column holds it. */
function itemStatus(item) {
  const direct = text(item.status);
  if (direct) return direct;
  const nested = item.fieldValues && typeof item.fieldValues === "object"
    ? text(item.fieldValues.status ?? item.fieldValues.Status)
    : "";
  return nested;
}

/** One work-item line. Everything in it comes from the tracker's own answer. */
function itemLine(item) {
  const title = text(item.title) || text(item.content && item.content.title);
  if (!title) return null;
  const number = item.number ?? (item.content && item.content.number);
  const url = text(item.url) || text(item.content && item.content.url);
  const status = itemStatus(item);
  const head = typeof number === "number" ? `#${number} ${title}` : title;
  const label = status ? `${head} (${status})` : head;
  return url ? `${label} ${url}` : label;
}

/**
 * The github-project adapter. It resolves the board number when the settings
 * carry a title only, then reads that board's items. Both calls go through
 * the injected runner, so a test drives the success path with no network.
 */
export function githubProject(settings, context) {
  const run = context.run;
  const timeoutMs = context.timeoutMs;
  const limit = context.itemLimit;
  const board = text(settings.project);
  const owner = text(settings.owner) || "@me";
  if (!board && typeof settings.number !== "number") {
    return { available: false, reason: "the tracker block names no board" };
  }

  let number = typeof settings.number === "number" ? settings.number : null;
  if (number === null) {
    if (context.outOfTime()) {
      return { available: false, reason: "the startup time limit was reached before the board was read" };
    }
    const listed = run("gh", [
      "project", "list",
      "--owner", owner,
      "--limit", String(BOARD_LOOKUP_LIMIT),
      "--format", "json",
    ], { timeoutMs });
    if (!listed.ok) return { available: false, reason: listed.reason };
    const boards = jsonList(parseJson(listed.stdout), "projects");
    if (boards === null) return { available: false, reason: "gh returned an answer this adapter cannot read" };
    const match = boards.find((entry) => entry && text(entry.title) === board);
    if (!match || typeof match.number !== "number") {
      return { available: false, reason: "the configured board was not found for this owner" };
    }
    number = match.number;
  }

  if (context.outOfTime()) {
    return { available: false, reason: "the startup time limit was reached before the board was read" };
  }
  const read = run("gh", [
    "project", "item-list", String(number),
    "--owner", owner,
    "--limit", String(Math.max(limit, 1)),
    "--format", "json",
  ], { timeoutMs });
  if (!read.ok) return { available: false, reason: read.reason };
  const items = jsonList(parseJson(read.stdout), "items");
  if (items === null) return { available: false, reason: "gh returned an answer this adapter cannot read" };

  return {
    available: true,
    items: items.map(itemLine).filter(Boolean).slice(0, limit),
  };
}

/** Every adapter this build carries, by the name projects put in settings. */
export const ADAPTERS = Object.freeze({
  "github-project": githubProject,
});

/**
 * Build the reader the boot brief calls. The returned function takes the
 * project's `tracker` settings and returns either an available answer with
 * its work-item lines, or an unavailable answer with a short reason. It never
 * throws, so a broken tracker degrades a brief instead of stopping a session.
 */
export function createTracker(options = {}) {
  const run = typeof options.run === "function" ? options.run : runCommand;
  const timeoutMs = typeof options.timeoutMs === "number" && options.timeoutMs > 0
    ? options.timeoutMs
    : DEFAULT_TIMEOUT_MS;
  const deadlineMs = typeof options.deadlineMs === "number" && options.deadlineMs > 0
    ? options.deadlineMs
    : DEFAULT_DEADLINE_MS;
  const itemLimit = typeof options.itemLimit === "number" && options.itemLimit > 0
    ? options.itemLimit
    : DEFAULT_ITEM_LIMIT;

  return function readTracker(settings, callContext = {}) {
    const name = text(settings && settings.adapter);
    const adapter = Object.hasOwn(ADAPTERS, name) ? ADAPTERS[name] : null;
    if (adapter === null) {
      return {
        available: false,
        reason: name
          ? `this build carries no adapter named ${name}`
          : "the tracker block names no adapter",
      };
    }
    const stop = Date.now() + deadlineMs;
    const context = {
      ...callContext,
      run,
      timeoutMs,
      itemLimit,
      outOfTime: () => Date.now() > stop,
    };
    try {
      const answer = adapter(settings, context);
      if (!answer || !answer.available) {
        return { available: false, reason: text(answer && answer.reason) || "the tracker could not be read" };
      }
      return { available: true, adapter: name, items: Array.isArray(answer.items) ? answer.items : [] };
    } catch {
      // A broken adapter is a degraded brief, never a stopped session.
      return { available: false, reason: `the ${name} adapter failed while reading the tracker` };
    }
  };
}

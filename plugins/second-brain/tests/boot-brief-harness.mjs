#!/usr/bin/env node

/**
 * Boot brief harness.
 *
 * Builds temporary version 2 projects from the shipped templates and checks the
 * assembler and the Claude Code startup hook: block order, the four degradation
 * steps in their exact order, what may never be dropped, the visible overflow
 * mode, missing sources, a project with no tracker, pin hash verification, the
 * stale warning, byte-for-byte repeatability, and fail-open behavior.
 *
 * Run: node plugins/second-brain/tests/boot-brief-harness.mjs
 */

import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import {
  DEGRADATION_STEPS,
  assembleBootBrief,
  renderBrief,
} from "../tools/boot-brief.mjs";
import { bootBriefOutput, readEvent, startDirectory } from "../hooks/boot-brief-session-start.mjs";
import { createTracker, runCommand } from "../tools/tracker-adapter.mjs";

const plugin = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const templates = resolve(plugin, "skills/second-brain/references/templates-v2/knowledge");
const briefTool = resolve(plugin, "tools/boot-brief.mjs");
const hook = resolve(plugin, "hooks/boot-brief-session-start.mjs");

const fixtures = [];
let passed = 0;

function ok(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed++;
  console.log(`PASS: ${message}`);
}

function fixture(name) {
  const path = mkdtempSync(join(realpathSync(tmpdir()), `boot-brief-${name}-`));
  fixtures.push(path);
  return path;
}

function write(base, path, content) {
  const absolute = resolve(base, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
}

function bytes(text) {
  return Buffer.byteLength(text, "utf8");
}

function dayString(now, daysAgo) {
  return new Date(now.getTime() - daysAgo * 86400000).toISOString().slice(0, 10);
}

/** The optional tracker block of a fixture's project.md front matter. */
function trackerBlock(tracker) {
  if (!tracker) return "";
  const settings = tracker === true
    ? { adapter: "github-project", project: "Test-Board" }
    : tracker;
  return ["tracker:", ...Object.entries(settings).map(([key, value]) => `  ${key}: ${value}`)]
    .join("\n");
}

/** Every fixture starts from the shipped version 2 template tree. */
function makeProject(base, { projectId = "test-project", tracker = false, budget = null } = {}) {
  cpSync(templates, resolve(base, "knowledge"), { recursive: true });
  const template = readFileSync(resolve(templates, "project.md"), "utf8");
  const end = template.indexOf("\n---\n", 4);
  const front = template.slice(4, end).replace(
    /^project_id: .*$/m,
    `project_id: ${projectId}`,
  );
  const extra = [
    trackerBlock(tracker),
    budget === null ? "" : `startup:\n  budget_bytes: ${budget}`,
  ].filter(Boolean).join("\n");
  write(
    base,
    "knowledge/project.md",
    `---\n${front}${extra ? `\n${extra}` : ""}\n---\n${template.slice(end + 5)}`,
  );
  return base;
}

function writeCurrent(base, { updated, areas = [] } = {}) {
  const extra = areas.map((title) => (
    `\n## ${title}\n\nAuthored detail for ${title}, which the brief may collapse to a count.\n`
  )).join("");
  write(base, "knowledge/current.md", [
    "---",
    `updated: ${updated}`,
    "---",
    "",
    "# Current state",
    "",
    "## Current focus",
    "",
    "Ship the boot brief assembler.",
    "",
    "## Blockers",
    "",
    "None.",
    "",
    "## Next step",
    "",
    "Run the boot brief harness.",
    "",
    "## Handoff",
    "",
    "The assembler renders ten blocks and the hook prints them.",
    `${extra}`,
  ].join("\n"));
}

function writeRecords(base, now, count) {
  for (let index = 0; index < count; index++) {
    const folder = ["facts", "decisions", "events", "patterns"][index % 4];
    write(base, `knowledge/memory/${folder}/record-${index}.md`, [
      "---",
      `date: ${dayString(now, index)}`,
      `summary: Approved summary number ${index} with enough authored words to take up room.`,
      "---",
      "",
      `# Record ${index}`,
      "",
      "Body text.",
      "",
    ].join("\n"));
  }
}

/** One record, with the date and status the fixture wants to test. */
function writeRecord(base, folder, name, { date, summary, status = null }) {
  write(base, `knowledge/memory/${folder}/${name}.md`, [
    "---",
    `date: ${date}`,
    status === null ? null : `status: ${status}`,
    `summary: ${summary}`,
    "---",
    "",
    `# ${name}`,
    "",
    "Body text.",
    "",
  ].filter((line) => line !== null).join("\n"));
}

function summaryHash(summary) {
  return `sha256:${createHash("sha256").update(summary, "utf8").digest("hex")}`;
}

/**
 * A command runner that answers from a table instead of starting a process.
 * This is how the success path is proved with no gh command and no network.
 * It records every call so a fixture can assert which commands ran.
 */
function fakeRunner(answers) {
  const calls = [];
  const run = (command, args) => {
    calls.push([command, ...args].join(" "));
    for (const [match, answer] of answers) {
      if (args.includes(match)) return answer;
    }
    return { ok: false, reason: "this fake runner has no answer for that command" };
  };
  run.calls = calls;
  return run;
}

function boardListAnswer(number, title) {
  return { ok: true, stdout: JSON.stringify({ projects: [{ number, title }], totalCount: 1 }) };
}

function itemListAnswer(items) {
  return { ok: true, stdout: JSON.stringify({ items, totalCount: items.length }) };
}

function blockOrder(text) {
  return text.split("\n")
    .filter((line) => /^## \d+\. /.test(line))
    .map((line) => Number(line.slice(3, line.indexOf("."))));
}

function blockText(text, number) {
  const start = text.indexOf(`## ${number}. `);
  if (start < 0) return "";
  const next = text.indexOf(`\n## ${number + 1}. `, start);
  return next < 0 ? text.slice(start) : text.slice(start, next);
}

function warningCodes(brief) {
  return brief.warnings.map((entry) => entry.code);
}

try {
  const now = new Date("2026-08-20T12:00:00Z");

  // A fresh project renders every block in order and needs no degradation.
  const base = fixture("base");
  makeProject(base);
  writeCurrent(base, { updated: dayString(now, 0) });
  writeRecords(base, now, 2);

  const fresh = assembleBootBrief({ projectRoot: base, now });
  ok(fresh.ok, "a project with the version 2 core assembles a brief");
  ok(
    JSON.stringify(blockOrder(fresh.text)) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    "the ten blocks render in architecture section 10.2 order",
  );
  ok(fresh.applied.length === 0 && !fresh.overBudget, "a small project fits the default budget");
  ok(fresh.bytes <= fresh.budget && fresh.budget === 10240, "the default budget is 10240 bytes");
  ok(!fresh.text.includes("Stale current state"), "a current file inside the window shows no stale warning");
  ok(warningCodes(fresh).includes("tracker/not-configured"), "a project with no tracker says so");
  ok(
    fresh.text.includes("No work tracker is configured"),
    "with no tracker the brief still shows the dated current content",
  );
  ok(fresh.text.includes("Ship the boot brief assembler."), "the current focus renders as authored");
  ok(fresh.text.includes("node ") && fresh.text.includes("memory.mjs"), "the memory tool route renders");

  const repeat = assembleBootBrief({ projectRoot: base, now });
  ok(repeat.text === fresh.text, "the same inputs produce the same brief, byte for byte");

  // Staleness uses the 72 hour recent window.
  const stale = fixture("stale");
  makeProject(stale);
  writeCurrent(stale, { updated: dayString(now, 5) });
  const staleBrief = assembleBootBrief({ projectRoot: stale, now });
  ok(warningCodes(staleBrief).includes("startup/stale-current"), "an old current file raises the stale warning");
  ok(
    staleBrief.text.includes(`last updated ${dayString(now, 5)}`),
    "the stale warning carries the date of the last update",
  );

  ok(
    blockText(staleBrief.text, 5).includes(`updated ${dayString(now, 5)}`)
      && blockText(staleBrief.text, 5).includes("Older than the 72 hour window"),
    "the current block names its date and says it is older than the window",
  );
  ok(
    blockText(staleBrief.text, 5).includes("Ship the boot brief assembler."),
    "a stale current file still shows its authored focus rather than nothing",
  );

  writeCurrent(stale, { updated: dayString(now, 2) });
  const insideWindow = assembleBootBrief({ projectRoot: stale, now });
  ok(
    !warningCodes(insideWindow).includes("startup/stale-current"),
    "48 hours old is inside the 72 hour window",
  );

  // An authored file with an area missing states no focus it does not carry.
  const partial = fixture("partial-current");
  makeProject(partial);
  write(partial, "knowledge/current.md", [
    "---",
    `updated: ${dayString(now, 0)}`,
    "---",
    "",
    "# Current state",
    "",
    "## Current focus",
    "",
    "Ship the recent window.",
    "",
    "## Handoff",
    "",
    "The window rule is 72 hours.",
    "",
  ].join("\n"));
  const partialBlock = blockText(assembleBootBrief({ projectRoot: partial, now }).text, 5);
  ok(
    partialBlock.includes("knowledge/current.md authors no next step. Do not supply one."),
    "an unauthored area says the file carries none instead of inventing one",
  );

  // The 72 hour recent window: up to three updates from inside it, newest first.
  const window = fixture("recent-window");
  makeProject(window);
  writeCurrent(window, { updated: dayString(now, 0) });
  writeRecord(window, "events", "shipped-today", {
    date: dayString(now, 0),
    summary: "The assembler shipped behind the version 1 tools.",
  });
  writeRecord(window, "decisions", "chose-yesterday", {
    date: dayString(now, 1),
    summary: "Version 2 ships beside version 1 rather than replacing it.",
  });
  writeRecord(window, "patterns", "lesson-two-days", {
    date: dayString(now, 2),
    summary: "A hook that refuses on exit 1 breaks the session it was meant to help.",
  });
  writeRecord(window, "facts", "older-four-days", {
    date: dayString(now, 4),
    summary: "The budget covers the current and recent blocks too.",
  });
  writeRecord(window, "facts", "older-six-days", {
    date: dayString(now, 6),
    summary: "The plugin ships nine plugins today.",
  });
  writeRecord(window, "facts", "superseded-today", {
    date: dayString(now, 0),
    status: "superseded",
    summary: "An earlier reading of the budget rule that no longer holds.",
  });
  writeRecord(window, "facts", "retired-today", {
    date: dayString(now, 0),
    status: "retired",
    summary: "A retired claim nobody should carry into a new session.",
  });

  const windowBrief = assembleBootBrief({ projectRoot: window, now });
  const windowBlock = blockText(windowBrief.text, 6);
  ok(
    windowBlock.split("\n").filter((line) => /^- \d{4}-\d{2}-\d{2} /.test(line)).length === 3,
    "the recent window shows at most three updates from the last 72 hours",
  );
  ok(
    windowBlock.includes(dayString(now, 0))
      && windowBlock.includes(dayString(now, 1))
      && windowBlock.includes(dayString(now, 2)),
    "the three shown updates are the ones dated inside the window",
  );
  ok(
    windowBlock.indexOf(dayString(now, 0)) < windowBlock.indexOf(dayString(now, 2)),
    "the recent window sorts newest first",
  );
  ok(
    windowBlock.includes("Version 2 ships beside version 1 rather than replacing it.")
      && windowBlock.includes("knowledge/memory/decisions/chose-yesterday.md"),
    "each recent line carries the record's own summary and a link to it",
  );
  ok(
    !windowBlock.includes("The budget covers the current and recent blocks too."),
    "an update older than 72 hours stays out of the window",
  );
  ok(
    windowBlock.includes("2 older updates. See knowledge/memory/."),
    "the updates outside the window become a count and a link",
  );
  ok(
    !windowBlock.includes("An earlier reading of the budget rule")
      && !windowBlock.includes("A retired claim nobody should carry"),
    "a superseded or retired record is not a recent update",
  );
  ok(
    !windowBrief.text.includes("No approved update in the last 72 hours"),
    "with updates inside the window the brief shows no fallback label",
  );

  // No update inside the window: the latest dated update, labeled with its age.
  const fallback = fixture("recent-fallback");
  makeProject(fallback);
  writeCurrent(fallback, { updated: dayString(now, 0) });
  writeRecord(fallback, "events", "five-days", {
    date: dayString(now, 5),
    summary: "The last approved event in this project happened five days ago.",
  });
  writeRecord(fallback, "facts", "twelve-days", {
    date: dayString(now, 12),
    summary: "An older fact from twelve days ago.",
  });
  const fallbackBlock = blockText(assembleBootBrief({ projectRoot: fallback, now }).text, 6);
  ok(
    fallbackBlock.includes("No approved update in the last 72 hours. The latest dated update is 5 days old."),
    "with nothing inside the window the fallback names the age of the latest update",
  );
  ok(
    fallbackBlock.includes(`- ${dayString(now, 5)} event: The last approved event in this project happened five days ago.`),
    "the fallback renders the latest dated update with its date and authored summary",
  );
  ok(
    !fallbackBlock.includes("An older fact from twelve days ago."),
    "the fallback shows one update, not the whole history",
  );
  ok(
    fallbackBlock.includes("1 older update. See knowledge/memory/."),
    "the rest of the history stays a count and a link",
  );

  // The empty case invents nothing.
  const empty = fixture("recent-empty");
  makeProject(empty);
  writeCurrent(empty, { updated: dayString(now, 0) });
  const emptyBlock = blockText(assembleBootBrief({ projectRoot: empty, now }).text, 6);
  ok(
    emptyBlock.includes("No dated approved record summaries are authored in knowledge/memory/ yet."),
    "a project with no dated records says so",
  );
  ok(
    !emptyBlock.includes("older update") && !emptyBlock.includes("latest dated update"),
    "the empty recent window states nothing else",
  );

  // Missing sources warn and never block.
  const missing = fixture("missing");
  makeProject(missing);
  rmSync(resolve(missing, "knowledge/current.md"), { force: true });
  rmSync(resolve(missing, "knowledge/map.md"), { force: true });
  const missingBrief = assembleBootBrief({ projectRoot: missing, now });
  ok(missingBrief.ok, "a project with missing sources still assembles a brief");
  ok(
    JSON.stringify(blockOrder(missingBrief.text)) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    "missing sources leave every block in place",
  );
  const missingCodes = warningCodes(missingBrief);
  ok(missingCodes.filter((code) => code === "startup/missing-source").length >= 2,
    "each missing source raises its own warning");
  ok(missingCodes.includes("startup/stale-current"), "a missing current file is treated as stale");
  ok(
    missingBrief.text.includes("knowledge/current.md is missing"),
    "the brief says the current file is missing rather than inventing state",
  );
  ok(
    !blockText(missingBrief.text, 5).includes("### Current focus")
      && blockText(missingBrief.text, 5).includes("State no current focus, blocker, or next step"),
    "a missing current file leaves the session with no focus, blocker, or next step to state",
  );

  // The tracker adapter is optional. With no tracker block, no adapter runs at
  // all, and startup is exactly as usable as it is with one.
  const noTracker = fixture("tracker-absent");
  makeProject(noTracker);
  writeCurrent(noTracker, { updated: dayString(now, 0) });
  let readerCalls = 0;
  const absentBrief = assembleBootBrief({
    projectRoot: noTracker,
    now,
    tracker: () => {
      readerCalls++;
      return { available: true, items: ["should never be reached"] };
    },
  });
  ok(readerCalls === 0, "with no tracker configured, no adapter is called and no command starts");
  ok(warningCodes(absentBrief).includes("tracker/not-configured"), "an absent tracker warns and nothing else");
  ok(
    !warningCodes(absentBrief).includes("tracker/unavailable"),
    "an absent tracker is not reported as an unreachable one",
  );
  ok(
    absentBrief.text.includes("Ship the boot brief assembler.")
      && blockText(absentBrief.text, 5).includes("Live status stays unverified"),
    "with no tracker the brief shows the dated current content and labels live status unverified",
  );

  // A configured but unreachable tracker degrades to unverified live status.
  const tracked = fixture("tracker");
  makeProject(tracked, { tracker: true });
  writeCurrent(tracked, { updated: dayString(now, 0) });
  const failing = createTracker({
    run: () => ({ ok: false, reason: "the gh command is not installed" }),
  });
  const trackedBrief = assembleBootBrief({ projectRoot: tracked, now, tracker: failing });
  ok(warningCodes(trackedBrief).includes("tracker/unavailable"), "an unreachable tracker warns");
  ok(
    trackedBrief.text.includes("live status is unverified"),
    "an unreachable tracker leaves live status labeled unverified",
  );
  ok(
    trackedBrief.warnings.some((entry) => (
      entry.code === "tracker/unavailable" && entry.message.includes("the gh command is not installed")
    )),
    "the unavailable warning names the mechanical reason the tracker could not be read",
  );
  ok(
    JSON.stringify(blockOrder(trackedBrief.text)) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      && trackedBrief.text.includes("Ship the boot brief assembler.")
      && trackedBrief.text.includes("Run the boot brief harness."),
    "a failing tracker keeps every block and the authored current content",
  );

  // The live default reader, with no injection. This sandbox has no gh command,
  // so this is the real unavailable path rather than a simulated one.
  const ghPresent = runCommand("gh", ["--version"], { timeoutMs: 2000 }).ok;
  const liveStart = Date.now();
  const liveBrief = assembleBootBrief({ projectRoot: tracked, now });
  ok(liveBrief.ok, "the default reader runs the real adapter and still assembles a brief");
  ok(Date.now() - liveStart < 20000, "the real adapter answers inside a bounded wait");
  ok(
    ghPresent || warningCodes(liveBrief).includes("tracker/unavailable"),
    "with no gh command installed the real adapter reports the tracker unavailable",
  );
  ok(
    liveBrief.text.includes("Ship the boot brief assembler."),
    "the real adapter never keeps the authored current content off the brief",
  );

  // The success path, driven by an injected runner. No process starts.
  const reachable = fixture("tracker-live");
  makeProject(reachable, { tracker: true });
  writeCurrent(reachable, { updated: dayString(now, 0) });
  const goodRunner = fakeRunner([
    ["list", boardListAnswer(7, "Test-Board")],
    ["item-list", itemListAnswer([
      {
        number: 41,
        title: "Optional tracker adapter",
        status: "In Progress",
        url: "https://example.invalid/boards/7/41",
      },
      { number: 42, title: "Codex startup route", status: "Ready", url: "https://example.invalid/boards/7/42" },
    ])],
  ]);
  const liveTracker = assembleBootBrief({
    projectRoot: reachable,
    now,
    tracker: createTracker({ run: goodRunner }),
  });
  ok(
    !warningCodes(liveTracker).includes("tracker/unavailable"),
    "a reachable tracker raises no unavailable warning",
  );
  ok(
    blockText(liveTracker.text, 4).includes("#41 Optional tracker adapter (In Progress)")
      && blockText(liveTracker.text, 4).includes("https://example.invalid/boards/7/41"),
    "a reachable tracker adds the work item, its live status, and its link",
  );
  ok(
    blockText(liveTracker.text, 2).includes("Work tracker: github-project: Test-Board.")
      && !blockText(liveTracker.text, 2).includes("not reachable"),
    "a reachable tracker renders its route without the unreachable label",
  );
  ok(
    blockText(liveTracker.text, 5).includes("Live work-item status comes from github-project: Test-Board"),
    "with a reachable tracker the current block points at the tracker instead of saying unverified",
  );
  ok(
    goodRunner.calls.length === 2 && goodRunner.calls[0].includes("project list"),
    "a board named by title is resolved once and then read once",
  );

  // A board number in settings skips the title lookup.
  const numbered = fixture("tracker-numbered");
  makeProject(numbered, {
    tracker: { adapter: "github-project", project: "Test-Board", owner: "example-org", number: 7 },
  });
  writeCurrent(numbered, { updated: dayString(now, 0) });
  const numberedRunner = fakeRunner([["item-list", itemListAnswer([
    { number: 5, title: "Already numbered", status: "Done", url: "https://example.invalid/boards/7/5" },
  ])]]);
  const numberedBrief = assembleBootBrief({
    projectRoot: numbered,
    now,
    tracker: createTracker({ run: numberedRunner }),
  });
  ok(
    numberedRunner.calls.length === 1 && numberedRunner.calls[0].includes("--owner example-org"),
    "a configured board number runs one command and uses the configured owner",
  );
  ok(
    blockText(numberedBrief.text, 4).includes("#5 Already numbered (Done)"),
    "the numbered board renders its work item",
  );

  // The brief takes a bounded number of items, whatever the board returns.
  const manyRunner = fakeRunner([
    ["list", boardListAnswer(7, "Test-Board")],
    ["item-list", itemListAnswer(Array.from({ length: 10 }, (unused, index) => ({
      number: index,
      title: `Item ${index}`,
      status: "Ready",
      url: `https://example.invalid/boards/7/${index}`,
    })))],
  ]);
  const manyBrief = assembleBootBrief({
    projectRoot: reachable,
    now,
    tracker: createTracker({ run: manyRunner }),
  });
  ok(
    blockText(manyBrief.text, 4).split("\n").filter((line) => line.startsWith("- Work item:")).length === 3,
    "a busy board contributes at most three work items to the brief",
  );

  // An adapter name this build does not carry is unavailable, not a crash.
  const unknown = fixture("tracker-unknown");
  makeProject(unknown, { tracker: { adapter: "jira", project: "MEM" } });
  writeCurrent(unknown, { updated: dayString(now, 0) });
  const unknownBrief = assembleBootBrief({ projectRoot: unknown, now });
  ok(
    unknownBrief.warnings.some((entry) => (
      entry.code === "tracker/unavailable" && entry.message.includes("no adapter named jira")
    )),
    "an adapter this build does not carry is reported as unavailable by name",
  );
  ok(
    unknownBrief.text.includes("Ship the boot brief assembler."),
    "an unknown adapter still leaves a usable brief",
  );

  // The adapter never throws, whatever the runner does.
  const throwing = createTracker({ run: () => { throw new Error("boom"); } });
  const thrown = throwing({ adapter: "github-project", project: "Test-Board" }, { now });
  ok(
    thrown.available === false && thrown.reason.includes("github-project"),
    "a runner that throws produces an unavailable answer rather than an exception",
  );
  const garbled = createTracker({ run: () => ({ ok: true, stdout: "not json" }) });
  ok(
    garbled({ adapter: "github-project", project: "Test-Board" }, { now }).available === false,
    "an answer the adapter cannot read is unavailable rather than invented",
  );
  const missingCommand = runCommand("second-brain-no-such-command", [], { timeoutMs: 2000 });
  ok(
    missingCommand.ok === false && missingCommand.reason.includes("is not installed"),
    "the default runner reports a missing command instead of throwing",
  );

  // Pins render the record's own approved summary, and a changed summary is omitted.
  const pinned = fixture("pins");
  makeProject(pinned);
  writeCurrent(pinned, { updated: dayString(now, 0) });
  const goodSummary = "The toolkit ships version 2 beside version 1.";
  write(pinned, "knowledge/memory/decisions/ship-beside.md", [
    "---",
    `date: ${dayString(now, 1)}`,
    `summary: ${goodSummary}`,
    "---",
    "",
    "# Ship beside",
    "",
    "Body.",
    "",
  ].join("\n"));
  write(pinned, "knowledge/memory/facts/changed.md", [
    "---",
    `date: ${dayString(now, 1)}`,
    "summary: This summary was edited after the owner approved the pin.",
    "---",
    "",
    "# Changed",
    "",
    "Body.",
    "",
  ].join("\n"));
  write(pinned, "knowledge/memory/pins.md", [
    "# Pinned memory",
    "",
    "| Record id | Record | Pinned | Summary hash |",
    "| --- | --- | --- | --- |",
    `| decision-ship-beside | knowledge/memory/decisions/ship-beside.md | ${dayString(now, 1)} | ${summaryHash(goodSummary)} |`,
    `| fact-changed | knowledge/memory/facts/changed.md | ${dayString(now, 1)} | ${summaryHash("an older approved summary")} |`,
    "",
  ].join("\n"));
  const pinBrief = assembleBootBrief({ projectRoot: pinned, now });
  ok(
    blockText(pinBrief.text, 7).includes(goodSummary),
    "a valid pin renders the record's approved summary",
  );
  ok(
    warningCodes(pinBrief).includes("startup/pin-hash-mismatch"),
    "a pin whose summary changed raises the hash mismatch warning",
  );
  ok(
    !blockText(pinBrief.text, 7).includes("This summary was edited after"),
    "a mismatched pin is omitted from the pin block, and the record keeps its place elsewhere",
  );

  // The four degradation steps, in the exact order, then visible overflow.
  const heavy = fixture("over-budget");
  makeProject(heavy);
  writeCurrent(heavy, {
    updated: dayString(now, 9),
    areas: ["Open questions", "Parked work", "Notes for the next session"],
  });
  writeRecords(heavy, now, 8);
  write(heavy, "knowledge/memory/pins.md", [
    "| Record id | Record | Pinned | Summary hash |",
    "| --- | --- | --- | --- |",
    `| record-0 | knowledge/memory/facts/record-0.md | ${dayString(now, 1)} | |`,
    "",
  ].join("\n"));

  const full = assembleBootBrief({ projectRoot: heavy, now, budget: 10 ** 7 });
  const sizes = [0, 1, 2, 3, 4].map((level) => bytes(renderBrief(full.model, {
    collapse: DEGRADATION_STEPS.slice(0, level),
    overflow: false,
    overflowBytes: 0,
  })));
  ok(
    sizes.every((size, index) => index === 0 || size < sizes[index - 1]),
    "each degradation step makes the brief smaller",
  );

  const observed = [];
  for (let level = 1; level <= DEGRADATION_STEPS.length; level++) {
    const brief = assembleBootBrief({ projectRoot: heavy, now, budget: sizes[level - 1] - 1 });
    observed.push(brief.applied.join(","));
    ok(!brief.overBudget, `budget just under level ${level - 1} still fits after degrading`);
    ok(
      brief.text.includes("Stale current state"),
      `the stale warning survives degradation step ${level}`,
    );
    ok(
      brief.text.includes("Ship the boot brief assembler.")
        && brief.text.includes("### Blockers")
        && brief.text.includes("Run the boot brief harness.")
        && brief.text.includes("The assembler renders ten blocks")
        && brief.text.includes("Approved summary number 0"),
      `step ${level} keeps the focus, blockers, next step, handoff, and pins`,
    );
  }
  ok(
    JSON.stringify(observed) === JSON.stringify([
      "warnings",
      "warnings,recent",
      "warnings,recent,current",
      "warnings,recent,current,map",
    ]),
    "degradation applies warnings, then recent, then current areas, then the map",
  );

  const collapsedCurrent = assembleBootBrief({ projectRoot: heavy, now, budget: sizes[2] - 1 });
  ok(
    collapsedCurrent.text.includes("3 other current areas. See knowledge/current.md."),
    "step 3 collapses the other current areas to a count and a link",
  );
  ok(
    !collapsedCurrent.text.includes("Notes for the next session"),
    "the collapsed current areas leave the brief",
  );
  ok(
    collapsedCurrent.text.includes("### Current focus")
      && collapsedCurrent.text.includes("### Blockers")
      && collapsedCurrent.text.includes("### Next step"),
    "step 3 never touches the current focus, the blockers, or the next step",
  );

  const collapsedRecent = assembleBootBrief({ projectRoot: heavy, now, budget: sizes[1] - 1 });
  ok(
    collapsedRecent.text.includes("older updates. See knowledge/memory/."),
    "step 2 turns older recent items into a count and a link",
  );
  const collapsedWarnings = assembleBootBrief({ projectRoot: heavy, now, budget: sizes[0] - 1 });
  ok(
    collapsedWarnings.text.includes("other startup warning"),
    "step 1 turns warning detail into a count and a link",
  );
  const collapsedMap = assembleBootBrief({ projectRoot: heavy, now, budget: sizes[3] - 1 });
  ok(
    collapsedMap.text.includes("Major folders:") && collapsedMap.text.includes("See knowledge/map.md."),
    "step 4 keeps major folders only",
  );

  const overflow = assembleBootBrief({ projectRoot: heavy, now, budget: 400 });
  ok(overflow.overBudget, "a budget the required set cannot meet reports over budget");
  ok(warningCodes(overflow).includes("startup/over-budget"), "the over-budget warning is raised");
  ok(
    overflow.warnings.some((entry) => (
      entry.code === "startup/over-budget" && entry.message.includes(`${sizes[4]} bytes`)
    )),
    "the over-budget warning carries the exact byte count of the required set",
  );
  ok(overflow.text.includes("> Over budget."), "overflow mode is visible in the brief");
  ok(overflow.bytes > overflow.budget, "overflow renders long rather than dropping a required block");
  ok(
    overflow.text.includes("Ship the boot brief assembler.")
      && overflow.text.includes("Run the boot brief harness.")
      && overflow.text.includes("The assembler renders ten blocks")
      && overflow.text.includes("Approved summary number 0")
      && overflow.text.includes("memory.mjs")
      && overflow.text.includes("Stale current state"),
    "overflow keeps identity, purpose, focus, next step, handoff, pins, the tool route, and the stale line",
  );
  ok(
    JSON.stringify(blockOrder(overflow.text)) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    "overflow still renders every block",
  );

  // The project budget in front matter is what the assembler uses.
  const budgeted = fixture("budget");
  makeProject(budgeted, { budget: 2048 });
  writeCurrent(budgeted, { updated: dayString(now, 0) });
  writeRecords(budgeted, now, 6);
  const budgetedBrief = assembleBootBrief({ projectRoot: budgeted, now });
  ok(budgetedBrief.budget === 2048, "startup.budget_bytes in project.md sets the budget");
  ok(
    budgetedBrief.bytes <= 2048 || budgetedBrief.overBudget,
    "the brief fits the configured budget or says it could not",
  );

  // The startup hook.
  const outside = fixture("outside");
  write(outside, "README.md", "# Not a memory project\n");
  ok(bootBriefOutput(outside) === "", "a directory with no memory project prints nothing");
  ok(readEvent("not json").cwd === undefined, "an unparsed hook event does not throw");
  ok(startDirectory({ cwd: base }) === realpathSync(base), "the hook starts from the event cwd");

  const hookText = bootBriefOutput(base, { now });
  ok(hookText.startsWith("# Project boot brief"), "the hook prints the assembled brief");

  mkdirSync(resolve(base, ".memory"), { recursive: true });
  write(base, ".memory/journal", "{}\n");
  ok(
    bootBriefOutput(base, { now }).includes("recovery journal under .memory/"),
    "a crash-recovery journal is reported and left alone",
  );
  ok(
    readFileSync(resolve(base, ".memory/journal"), "utf8") === "{}\n",
    "startup does not act on the journal",
  );

  const broken = fixture("broken");
  makeProject(broken);
  write(broken, "knowledge/project.md", "---\nschema_version: 2\n---\n\n# Broken\n");
  const brokenOutput = bootBriefOutput(broken);
  ok(brokenOutput.startsWith("[Boot brief:"), "unreadable settings produce one short warning line");

  // The hook and the tool as the host and the Codex route run them.
  const hookRun = execFileSync("node", [hook], {
    input: JSON.stringify({ session_id: "s1", cwd: base, hook_event_name: "SessionStart", source: "startup" }),
    encoding: "utf8",
  });
  ok(hookRun.includes("# Project boot brief"), "the hook prints the brief when the host runs it");
  const outsideRun = execFileSync("node", [hook], {
    input: JSON.stringify({ session_id: "s2", cwd: outside, hook_event_name: "SessionStart", source: "startup" }),
    encoding: "utf8",
  });
  ok(outsideRun === "", "the hook prints nothing outside a memory project, and exits 0");

  const cli = execFileSync("node", [briefTool, base], { encoding: "utf8" });
  ok(cli.includes("# Project boot brief"), "the assembler runs from a terminal for the Codex route");
  const cliJson = JSON.parse(execFileSync("node", [briefTool, heavy, "--json"], { encoding: "utf8" }));
  ok(cliJson.schema === "boot-brief/1" && cliJson.ok === true, "the tool reports a machine-readable result");
  ok(Array.isArray(cliJson.applied), "the machine-readable result names the degradation steps applied");

  console.log(`ALL PASS (${passed} checks), FAIL: 0`);
} finally {
  for (const path of fixtures.reverse()) rmSync(path, { recursive: true, force: true });
}

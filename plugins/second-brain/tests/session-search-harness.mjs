#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  evaluateHistoryGate,
  expandSession,
  searchSessions,
  searchSessionsGated,
} from "../skills/session-search/scripts/search-sessions.mjs";

const script = resolve(
  new URL("../skills/session-search/scripts/search-sessions.mjs", import.meta.url).pathname,
);

const fixtures = [];
let passed = 0;

function ok(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed++;
  console.log(`PASS: ${message}`);
}

function fixture(name) {
  const path = mkdtempSync(join(tmpdir(), `session-search-${name}-`));
  fixtures.push(path);
  return path;
}

function encoded(path) {
  return resolve(path).replace(/[^a-zA-Z0-9]/g, "-");
}

function transcript(configDir, cwd, sessionId, entries, title = null) {
  const directory = resolve(configDir, "projects", encoded(cwd));
  mkdirSync(directory, { recursive: true });
  const rows = [];
  if (title) rows.push({ type: "ai-title", aiTitle: title, sessionId });
  rows.push(...entries);
  const path = resolve(directory, `${sessionId}.jsonl`);
  writeFileSync(path, `${rows.map((entry) => JSON.stringify(entry)).join("\n")}\n`, "utf8");
  return path;
}

function message(type, cwd, sessionId, id, timestamp, content, extra = {}) {
  return {
    type,
    cwd,
    sessionId,
    timestamp,
    uuid: type === "user" ? id : undefined,
    message: {
      id: type === "assistant" ? id : undefined,
      role: type,
      content,
    },
    ...extra,
  };
}

function digest(path, skip = []) {
  const rows = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      if (skip.includes(entry.name)) continue;
      const child = join(directory, entry.name);
      if (entry.isDirectory()) walk(child);
      else rows.push(`${child}:${createHash("sha256").update(readFileSync(child)).digest("hex")}`);
    }
  };
  walk(path);
  return createHash("sha256").update(rows.join("\n")).digest("hex");
}

/** Run the real command line so exit codes are proved, not assumed. */
function cli(args, configDir = null) {
  const result = spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    env: configDir ? { ...process.env, CLAUDE_CONFIG_DIR: configDir } : process.env,
  });
  let payload = null;
  try {
    payload = JSON.parse(result.stdout);
  } catch {
    payload = null;
  }
  return { code: result.status, payload, stdout: result.stdout };
}

function git(path, ...args) {
  return execFileSync("git", ["-C", path, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

try {
  const base = fixture("main");
  const configDir = resolve(base, "claude-home");
  const project = resolve(base, "project");
  const worktree = resolve(base, "project-worktree");
  const unrelated = resolve(base, "private-other-project");
  mkdirSync(project, { recursive: true });
  mkdirSync(unrelated, { recursive: true });
  git(project, "init", "-b", "main");
  git(project, "config", "user.name", "Test User");
  git(project, "config", "user.email", "test@example.com");
  writeFileSync(resolve(project, "README.md"), "fixture\n", "utf8");
  git(project, "add", "README.md");
  git(project, "commit", "-m", "fixture");
  git(project, "worktree", "add", "-b", "feature", worktree);

  const sessionA = "11111111-1111-4111-8111-111111111111";
  const sessionB = "22222222-2222-4222-8222-222222222222";
  const sessionC = "33333333-3333-4333-8333-333333333333";
  transcript(
    configDir,
    project,
    sessionA,
    [
      message(
        "user",
        project,
        sessionA,
        "user-a",
        "2026-08-10T12:00:00.000Z",
        "We decided the amber launch rule after checking the current files. " + "x".repeat(700) + " PRIVATE DISTANT TEXT",
      ),
      message(
        "assistant",
        project,
        sessionA,
        "assistant-a",
        "2026-08-10T12:01:00.000Z",
        [{ type: "text", text: "The amber launch rule is historical context, not current truth." }],
      ),
      message(
        "user",
        project,
        sessionA,
        "tool-a",
        "2026-08-10T12:02:00.000Z",
        [{ type: "tool_result", tool_use_id: "tool", content: "amber launch secret tool output" }],
      ),
      message(
        "assistant",
        project,
        sessionA,
        "meta-a",
        "2026-08-10T12:03:00.000Z",
        [{ type: "text", text: "amber launch hidden meta" }],
        { isMeta: true },
      ),
    ],
    "Launch decision",
  );
  transcript(
    configDir,
    worktree,
    sessionB,
    [
      message(
        "user",
        worktree,
        sessionB,
        "user-b",
        "2026-08-11T12:00:00.000Z",
        "The worktree also discussed the amber launch rule.",
      ),
      message(
        "assistant",
        worktree,
        sessionB,
        "assistant-b",
        "2026-08-11T12:01:00.000Z",
        [{ type: "text", text: "That worktree discussion stayed local." }],
      ),
    ],
  );
  const unrelatedPath = transcript(
    configDir,
    unrelated,
    sessionC,
    [
      message(
        "user",
        unrelated,
        sessionC,
        "user-c",
        "2026-08-12T12:00:00.000Z",
        "Another private project used the amber launch words.",
      ),
    ],
  );
  writeFileSync(unrelatedPath, `${readFileSync(unrelatedPath, "utf8")}not-json\n`, "utf8");

  const before = digest(configDir);
  const projectBefore = digest(project, [".git"]);
  const projectResult = await searchSessions({
    query: '"amber launch" rule',
    projectDir: project,
    configDir,
  });
  ok(projectResult.status === "ok", "project search finds a match");
  ok(projectResult.scope.kind === "project", "project is the default scope");
  ok(projectResult.matches.every((match) => match.sessionId === sessionA), "project search excludes worktrees and other projects");
  ok(projectResult.matches.length === 2, "search includes visible user and assistant text only");
  ok(projectResult.matches.every((match) => match.excerpt.length <= 500), "each excerpt is capped at 500 characters");
  ok(!projectResult.matches[0].excerpt.includes("PRIVATE DISTANT TEXT"), "excerpt excludes distant unrelated text");
  ok(projectResult.matches[0].sessionTitle === "Launch decision", "result includes the session title");
  const matchedUser = projectResult.matches.find((match) => match.messageId === "user-a");
  ok(matchedUser?.matchedAt === "2026-08-10T12:00:00.000Z", "result identifies the matching message time");
  ok(projectResult.matches[0].sessionStartedAt === "2026-08-10T12:00:00.000Z", "result identifies the session start");
  ok(projectResult.matches[0].sessionLastActivityAt === "2026-08-10T12:01:00.000Z", "result identifies the last visible activity");
  ok(projectResult.matches[0].resumeCommand === `claude --resume '${sessionA}'`, "result includes the exact resume command");
  ok(projectResult.historyIsCurrentTruth === false, "result labels history as non-authoritative");

  const titleResult = await searchSessions({
    query: '"Launch decision"',
    projectDir: project,
    configDir,
  });
  ok(titleResult.matches.length === 1, "search finds a session by its title alone");
  ok(titleResult.matches[0].matchSource === "session-title", "title-only matches identify their source");

  const repositoryResult = await searchSessions({
    query: "amber launch",
    projectDir: project,
    configDir,
    scope: "repository",
  });
  ok(repositoryResult.matches.some((match) => match.sessionId === sessionB), "repository search includes registered worktrees");
  ok(!repositoryResult.matches.some((match) => match.sessionId === sessionC), "repository search excludes unrelated projects");

  let allBlocked = false;
  try {
    await searchSessions({ query: "amber", projectDir: project, configDir, scope: "all" });
  } catch (error) {
    allBlocked = error.message.includes("--allow-all-projects");
  }
  ok(allBlocked, "all-project search requires the explicit widening flag");
  const allResult = await searchSessions({
    query: "amber",
    projectDir: project,
    configDir,
    scope: "all",
    allowAllProjects: true,
  });
  ok(allResult.matches.some((match) => match.sessionId === sessionC), "approved all-project search includes unrelated projects");
  ok(allResult.searched.invalidLines === 1, "malformed internal records are skipped and counted");

  const dated = await searchSessions({
    query: "amber launch",
    projectDir: project,
    configDir,
    scope: "repository",
    since: "2026-08-11",
    until: "2026-08-11",
  });
  ok(dated.matches.length === 1 && dated.matches[0].sessionId === sessionB, "date range filters message timestamps");

  const expandedMessage = await expandSession({
    sessionId: sessionA,
    messageId: "user-a",
    projectDir: project,
    configDir,
    expand: "message",
  });
  ok(expandedMessage.messages.length === 1, "message expansion returns one selected message");
  ok(expandedMessage.messages[0].text.includes("PRIVATE DISTANT TEXT"), "explicit expansion returns the complete visible message");
  const expandedTurn = await expandSession({
    sessionId: sessionA,
    messageId: "assistant-a",
    projectDir: project,
    configDir,
    expand: "turn",
  });
  ok(expandedTurn.messages.length === 2, "turn expansion returns the user and assistant messages");
  ok(expandedTurn.messages[0].role === "user" && expandedTurn.messages[1].role === "assistant", "expanded turn keeps conversation order");

  const disabled = await searchSessions({
    query: "amber",
    projectDir: project,
    configDir,
    skipPromptHistory: true,
  });
  ok(disabled.status === "unavailable" && disabled.message.includes("CLAUDE_CODE_SKIP_PROMPT_HISTORY"), "disabled history is reported plainly");

  const emptyConfig = fixture("empty");
  const missing = await searchSessions({
    query: "amber",
    projectDir: project,
    configDir: emptyConfig,
  });
  ok(missing.status === "unavailable" && missing.message.includes("expired"), "missing history names disabled, expired, removed, and relocated possibilities");

  const changedConfig = fixture("changed-format");
  transcript(changedConfig, project, "44444444-4444-4444-8444-444444444444", [
    { type: "future-format", cwd: project, sessionId: "44444444-4444-4444-8444-444444444444" },
  ]);
  const changed = await searchSessions({
    query: "amber",
    projectDir: project,
    configDir: changedConfig,
  });
  ok(changed.status === "unavailable" && changed.message.includes("format may have changed"), "unknown transcript shapes fail plainly instead of claiming no match");

  // Locator additions, FR-107 and AT-38. Every v1 field above still holds.
  const located = projectResult.matches.find((match) => match.messageId === "user-a");
  ok(located.host === "claude-code-cli", "each match names the host it came from");
  ok(located.machine === hostname(), "each match names the machine it was read on");
  ok(located.date === located.matchedAt, "each match carries the message date");
  ok(
    located.messageLocator.includes(sessionA) && located.messageLocator.includes("user-a"),
    "each match carries a locator naming the session and the message",
  );
  ok(projectResult.scope.host === "claude-code-cli" && projectResult.scope.machine === hostname(), "the scope names the host and the machine covered");
  ok(
    expandedMessage.messages[0].messageLocator === located.messageLocator,
    "expansion returns the same locator the search result carried",
  );

  // The section 15.5 gate.
  const noReason = evaluateHistoryGate(undefined);
  ok(noReason.open === false && noReason.code === "history/gate-closed", "no reason closes the gate");
  ok(evaluateHistoryGate("   ").open === false, "a blank reason closes the gate");
  ok(evaluateHistoryGate("because").open === false, "a one-word reason closes the gate");
  ok(evaluateHistoryGate("owner-request").openedBy === "owner-request", "the owner request opens the gate");
  ok(
    evaluateHistoryGate("owner-request", { sensitiveProject: true }).open === true,
    "an owner request opens the gate in a sensitive project",
  );
  ok(
    evaluateHistoryGate("current specs and memory hold no wording for this", { sensitiveProject: true }).open === false,
    "a named insufficiency does not open the gate in a sensitive project",
  );

  const refused = await searchSessionsGated({
    query: "amber launch",
    projectDir: project,
    configDir,
  });
  ok(refused.status === "refused" && refused.code === "history/gate-closed", "a gated search with no reason is refused");
  ok(refused.entries.length === 0, "a refused search returns no history at all");

  const opened = await searchSessionsGated({
    query: '"amber launch" rule',
    projectDir: project,
    configDir,
    projectId: "claude-toolkit",
    reason: "the current specs and memory records do not carry this wording",
  });
  ok(opened.status === "ok" && opened.gate.opened_by === "sources-insufficient", "a named insufficiency opens the gate");
  ok(opened.scope.project_id === "claude-toolkit", "the gated scope names the project id it was given");
  ok(
    opened.scope.machine === hostname() && opened.scope.host === "claude-code-cli",
    "the gated scope names the machine and the host",
  );
  const entry = opened.entries[0];
  ok(
    ["host", "session_id", "date", "role", "message_locator", "excerpt"].every((field) => entry[field]),
    "each gated entry carries host, session id, date, role, message locator, and excerpt",
  );
  ok(entry.session_id === sessionA && entry.message_locator.includes(sessionA), "the gated entry locates the original session");
  ok(opened.historyIsCurrentTruth === false, "a gated result still labels history as non-authoritative");

  const ownerAsked = await searchSessionsGated({
    query: "amber launch",
    projectDir: project,
    configDir,
    reason: "owner-request",
    sensitiveProject: true,
  });
  ok(ownerAsked.status === "ok" && ownerAsked.gate.opened_by === "owner-request", "an owner request searches a sensitive project");
  const sensitiveRefusal = await searchSessionsGated({
    query: "amber launch",
    projectDir: project,
    configDir,
    reason: "current project owners did not answer this question",
    sensitiveProject: true,
  });
  ok(sensitiveRefusal.status === "refused", "insufficient current sources do not open a sensitive project's history");

  const gatedMiss = await searchSessionsGated({
    query: "amber launch",
    projectDir: project,
    configDir: emptyConfig,
    reason: "owner-request",
  });
  ok(gatedMiss.status === "unavailable" && gatedMiss.warnings[0].code === "history/unavailable", "an unreadable store is a warning, not a refusal");
  ok(
    gatedMiss.warnings[0].message.includes(hostname())
      && gatedMiss.warnings[0].message.includes("claude-code-cli")
      && gatedMiss.warnings[0].message.includes("never being discussed"),
    "the miss names the machine, host, and dates covered without claiming nothing was discussed",
  );

  // The gate refuses at the command line too, with the contract exit code.
  const bypass = cli(["--query", "amber launch", "--project", project, "--reason", ""], configDir);
  ok(bypass.code === 1, "a gate bypass exits 1");
  ok(bypass.payload.code === "history/gate-closed", "a gate bypass names history/gate-closed");
  ok(bypass.payload.entries.length === 0, "a gate bypass returns no entries");
  const bypassExpand = cli([
    "--project", project,
    "--session", sessionA,
    "--message", "user-a",
    "--expand", "message",
    "--reason", "x",
  ], configDir);
  ok(bypassExpand.code === 1 && bypassExpand.payload.messages.length === 0, "a gate bypass on expansion refuses as well");
  const allowed = cli([
    "--query", "amber launch",
    "--project", project,
    "--reason", "owner-request",
  ], configDir);
  ok(allowed.code === 0 && allowed.payload.gate.opened_by === "owner-request", "the owner request runs at the command line");

  // v1 invocations keep their exact shape, flags, and exit behavior.
  const v1 = cli(["--query", "amber launch", "--project", project], configDir);
  ok(v1.code === 0 && v1.payload.status === "ok" && Array.isArray(v1.payload.matches), "the v1 command line still returns matches at exit 0");
  ok(v1.payload.gate === undefined, "an ungated v1 call carries no gate block");
  ok(cli(["--help"]).code === 0, "help still exits 0");
  ok(cli(["--query"], configDir).code === 2, "a missing flag value still exits 2");

  ok(digest(configDir) === before, "search and expansion never change transcript data");
  ok(digest(project, [".git"]) === projectBefore, "no search path writes anything into the project");

  console.log(`ALL PASS (${passed} checks), FAIL: 0`);
} finally {
  for (const path of fixtures.reverse()) rmSync(path, { recursive: true, force: true });
}

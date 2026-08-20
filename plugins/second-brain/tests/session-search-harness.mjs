#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  expandSession,
  searchSessions,
} from "../skills/session-search/scripts/search-sessions.mjs";

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

function digest(path) {
  const rows = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const child = join(directory, entry.name);
      if (entry.isDirectory()) walk(child);
      else rows.push(`${child}:${createHash("sha256").update(readFileSync(child)).digest("hex")}`);
    }
  };
  walk(path);
  return createHash("sha256").update(rows.join("\n")).digest("hex");
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
  ok(digest(configDir) === before, "search and expansion never change transcript data");

  console.log(`ALL PASS (${passed} checks), FAIL: 0`);
} finally {
  for (const path of fixtures.reverse()) rmSync(path, { recursive: true, force: true });
}

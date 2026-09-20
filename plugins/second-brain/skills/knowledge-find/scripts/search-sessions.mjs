#!/usr/bin/env node

import { createReadStream, realpathSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, isAbsolute, relative, resolve } from "node:path";
import { createInterface } from "node:readline";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;
const DEFAULT_EXCERPT = 500;

function enabled(value) {
  return value != null && !["", "0", "false", "no"].includes(String(value).toLowerCase());
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function parseTerms(query) {
  const terms = [];
  const pattern = /"([^"]+)"|(\S+)/g;
  for (const match of String(query ?? "").matchAll(pattern)) {
    const term = normalizeText(match[1] ?? match[2]).toLowerCase();
    if (term && !terms.includes(term)) terms.push(term);
  }
  return terms;
}

function parseDate(value, endOfDay = false) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid date: ${value}. Use YYYY-MM-DD.`);
  }
  const suffix = endOfDay ? "T23:59:59.999" : "T00:00:00.000";
  const parsed = new Date(`${value}${suffix}`).getTime();
  if (!Number.isFinite(parsed)) throw new Error(`Invalid date: ${value}. Use YYYY-MM-DD.`);
  return parsed;
}

function isWithin(candidate, root) {
  const path = relative(canonicalPath(root), canonicalPath(candidate));
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

function canonicalPath(path) {
  try {
    return realpathSync.native(resolve(path));
  } catch {
    return resolve(path);
  }
}

function encodedProjectName(path) {
  return resolve(path).replace(/[^a-zA-Z0-9]/g, "-");
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

function messageText(entry) {
  if (!entry || !["user", "assistant"].includes(entry.type)) return "";
  if (entry.isMeta === true || entry.isSidechain === true) return "";
  const message = entry.message;
  if (!message || !["user", "assistant"].includes(message.role)) return "";
  if (typeof message.content === "string") return normalizeText(message.content);
  if (!Array.isArray(message.content)) return "";
  return normalizeText(
    message.content
      .filter((block) => block?.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("\n"),
  );
}

function messageId(entry, lineNumber) {
  return entry?.message?.id ?? entry?.uuid ?? `line-${lineNumber}`;
}

function matchScore(text, terms, query) {
  const lower = text.toLowerCase();
  let coverage = 0;
  let occurrences = 0;
  let firstIndex = -1;
  for (const term of terms) {
    let index = lower.indexOf(term);
    if (index === -1) continue;
    coverage++;
    if (firstIndex === -1 || index < firstIndex) firstIndex = index;
    while (index !== -1) {
      occurrences++;
      index = lower.indexOf(term, index + Math.max(term.length, 1));
    }
  }
  const exact = query && lower.includes(query.toLowerCase()) ? 1 : 0;
  return { coverage, occurrences, firstIndex, score: exact * 10000 + coverage * 1000 + occurrences * 10 };
}

function excerptAround(text, index, maximum = DEFAULT_EXCERPT) {
  const clean = normalizeText(text);
  if (clean.length <= maximum) return clean;
  const center = index < 0 ? 0 : index;
  let start = Math.max(0, center - Math.floor(maximum * 0.35));
  let end = Math.min(clean.length, start + maximum - 2);
  start = Math.max(0, end - (maximum - 2));

  if (start > 0) {
    const boundary = clean.indexOf(" ", start);
    if (boundary !== -1 && boundary < start + 40) start = boundary + 1;
  }
  if (end < clean.length) {
    const boundary = clean.lastIndexOf(" ", end);
    if (boundary > end - 40) end = boundary;
  }

  const prefix = start > 0 ? "…" : "";
  const suffix = end < clean.length ? "…" : "";
  return `${prefix}${clean.slice(start, end)}${suffix}`.slice(0, maximum);
}

async function jsonLines(path, onEntry, maximumLines = Infinity) {
  const stream = createReadStream(path, { encoding: "utf8" });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  let lineNumber = 0;
  let invalid = 0;
  try {
    for await (const line of lines) {
      lineNumber++;
      if (!line.trim()) continue;
      try {
        const shouldStop = await onEntry(JSON.parse(line), lineNumber);
        if (shouldStop || lineNumber >= maximumLines) break;
      } catch (error) {
        if (error instanceof SyntaxError) invalid++;
        else throw error;
      }
    }
  } finally {
    lines.close();
    stream.destroy();
  }
  return invalid;
}

async function topLevelTranscripts(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".jsonl")) continue;
      const path = resolve(directory, entry.name);
      try {
        const details = await stat(path);
        files.push({ path, mtimeMs: details.mtimeMs });
      } catch {
        // Another readable transcript in the directory may still be useful.
      }
    }
    return files.sort((a, b) => b.mtimeMs - a.mtimeMs);
  } catch {
    return [];
  }
}

async function representativeCwd(files) {
  for (const file of files.slice(0, 3)) {
    let cwd = null;
    try {
      await jsonLines(
        file.path,
        (entry) => {
          if (typeof entry.cwd === "string" && entry.cwd) {
            cwd = canonicalPath(entry.cwd);
            return true;
          }
          return false;
        },
        200,
      );
    } catch {
      // A later file may still identify the project.
    }
    if (cwd) return cwd;
  }
  return null;
}

async function discoverProjects(configDir) {
  const projectsDir = resolve(configDir, "projects");
  let entries;
  try {
    entries = await readdir(projectsDir, { withFileTypes: true });
  } catch {
    return { projectsDir, projects: [] };
  }

  const projects = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const directory = resolve(projectsDir, entry.name);
    const files = await topLevelTranscripts(directory);
    if (!files.length) continue;
    projects.push({
      directory,
      encodedName: entry.name,
      cwd: await representativeCwd(files),
      files,
    });
  }
  return { projectsDir, projects };
}

function repositoryWorktrees(projectDir) {
  try {
    const output = execFileSync(
      "git",
      ["-C", resolve(projectDir), "worktree", "list", "--porcelain"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return output
      .split(/\r?\n/)
      .filter((line) => line.startsWith("worktree "))
      .map((line) => canonicalPath(line.slice("worktree ".length)))
      .filter((path, index, paths) => paths.indexOf(path) === index);
  } catch {
    return [resolve(projectDir)];
  }
}

function selectProjects(projects, scope, scopePaths) {
  if (scope === "all") return projects;
  const directNames = new Set(scopePaths.map(encodedProjectName));
  return projects.filter((project) => {
    if (directNames.has(project.encodedName)) return true;
    if (!project.cwd) return false;
    return scopePaths.some((path) => isWithin(project.cwd, path));
  });
}

function historyUnavailable(configDir, projectsDir) {
  return {
    status: "unavailable",
    source: "Claude Code CLI local transcripts",
    configDir,
    projectsDir,
    message:
      "No searchable local Claude Code CLI history is available. Transcript saving may be disabled, or history may have expired, been removed, or use another CLAUDE_CONFIG_DIR.",
  };
}

function baseResult(options, scopePaths, selectedProjects) {
  return {
    source: "Claude Code CLI local transcripts",
    historyIsCurrentTruth: false,
    scope: {
      kind: options.scope,
      project: resolve(options.projectDir),
      paths: scopePaths,
      projects: [...new Set(selectedProjects.map((project) => project.cwd ?? project.encodedName))],
    },
  };
}

export async function searchSessions(rawOptions = {}) {
  const options = {
    query: rawOptions.query ?? "",
    projectDir: rawOptions.projectDir ?? process.cwd(),
    configDir: rawOptions.configDir ?? process.env.CLAUDE_CONFIG_DIR ?? resolve(homedir(), ".claude"),
    scope: rawOptions.scope ?? "project",
    allowAllProjects: rawOptions.allowAllProjects === true,
    since: rawOptions.since ?? null,
    until: rawOptions.until ?? null,
    limit: Math.min(Math.max(Number(rawOptions.limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT),
    excerpt: Math.min(Math.max(Number(rawOptions.excerpt ?? DEFAULT_EXCERPT), 80), DEFAULT_EXCERPT),
    skipPromptHistory:
      rawOptions.skipPromptHistory ?? enabled(process.env.CLAUDE_CODE_SKIP_PROMPT_HISTORY),
  };

  if (!options.query.trim()) throw new Error("A search query is required.");
  if (!Number.isFinite(options.limit)) throw new Error("Limit must be a number from 1 to 20.");
  if (!Number.isFinite(options.excerpt)) throw new Error("Excerpt size must be a number.");
  if (!["project", "repository", "all"].includes(options.scope)) {
    throw new Error("Scope must be project, repository, or all.");
  }
  if (options.scope === "all" && !options.allowAllProjects) {
    throw new Error("All-project search requires --allow-all-projects after the owner widens the scope.");
  }
  if (options.skipPromptHistory) {
    return {
      status: "unavailable",
      source: "Claude Code CLI local transcripts",
      message:
        "CLAUDE_CODE_SKIP_PROMPT_HISTORY disables transcript writes, so no complete searchable local history is available.",
    };
  }

  const terms = parseTerms(options.query);
  if (!terms.length) throw new Error("A search query must contain at least one word.");
  const sinceMs = parseDate(options.since);
  const untilMs = parseDate(options.until, true);
  if (sinceMs != null && untilMs != null && sinceMs > untilMs) {
    throw new Error("The since date must not be after the until date.");
  }

  const discovered = await discoverProjects(options.configDir);
  if (!discovered.projects.length) {
    return historyUnavailable(options.configDir, discovered.projectsDir);
  }

  const scopePaths = options.scope === "all"
    ? []
    : options.scope === "repository"
      ? repositoryWorktrees(options.projectDir)
      : [canonicalPath(options.projectDir)];
  const selectedProjects = selectProjects(
    discovered.projects,
    options.scope,
    scopePaths,
  );
  const base = baseResult(options, scopePaths, selectedProjects);

  if (!selectedProjects.length) {
    return {
      ...base,
      status: "no-history-for-scope",
      query: options.query,
      message:
        "No Claude Code CLI transcripts were found for this scope. History may be disabled, expired, removed, or stored under another project directory.",
      matches: [],
      searched: { sessions: 0, messages: 0, invalidLines: 0 },
    };
  }

  const matches = [];
  let sessions = 0;
  let records = 0;
  let messages = 0;
  let invalidLines = 0;
  const warnings = [];

  for (const project of selectedProjects) {
    for (const file of project.files) {
      if (sinceMs != null && file.mtimeMs < sinceMs) continue;
      sessions++;
      let sessionTitle = null;
      let sessionStartedAt = null;
      let sessionLastActivityAt = null;
      let representative = null;
      const sessionIdFromFile = basename(file.path, ".jsonl");
      const firstMatch = matches.length;
      try {
        invalidLines += await jsonLines(file.path, (entry, lineNumber) => {
          records++;
          if (entry?.type === "custom-title" && typeof entry.customTitle === "string") {
            sessionTitle = entry.customTitle;
          } else if (!sessionTitle && entry?.type === "ai-title" && typeof entry.aiTitle === "string") {
            sessionTitle = entry.aiTitle;
          }

          const text = messageText(entry);
          if (!text) return false;
          messages++;
          const timestampMs = Date.parse(entry.timestamp ?? "");
          const effectiveTime = Number.isFinite(timestampMs) ? timestampMs : file.mtimeMs;
          if (sessionStartedAt == null || effectiveTime < sessionStartedAt) sessionStartedAt = effectiveTime;
          if (sessionLastActivityAt == null || effectiveTime > sessionLastActivityAt) {
            sessionLastActivityAt = effectiveTime;
          }
          if (!representative || (representative.role !== "user" && entry.message.role === "user")) {
            representative = {
              text,
              role: entry.message.role,
              messageId: messageId(entry, lineNumber),
              effectiveTime,
              cwd: entry.cwd ?? project.cwd,
              sessionId: entry.sessionId ?? entry.session_id ?? sessionIdFromFile,
              lineNumber,
            };
          }
          if (sinceMs != null && effectiveTime < sinceMs) return false;
          if (untilMs != null && effectiveTime > untilMs) return false;

          const scored = matchScore(text, terms, normalizeText(options.query));
          if (!scored.coverage) return false;
          const sessionId = entry.sessionId ?? entry.session_id ?? sessionIdFromFile;
          matches.push({
            project: project.cwd ?? entry.cwd ?? project.encodedName,
            cwd: entry.cwd ?? project.cwd,
            sessionId,
            sessionTitle,
            messageId: messageId(entry, lineNumber),
            matchedAt: new Date(effectiveTime).toISOString(),
            role: entry.message.role,
            excerpt: excerptAround(text, scored.firstIndex, options.excerpt),
            matchSource: "passage",
            resumeCommand: `claude --resume ${shellQuote(sessionId)}`,
            score: scored.score,
            coverage: scored.coverage,
            lineNumber,
            transcript: file.path,
          });
          return false;
        });
        const titleScore = sessionTitle
          ? matchScore(sessionTitle, terms, normalizeText(options.query))
          : { coverage: 0, score: 0, firstIndex: -1 };
        const fileMatches = matches.slice(firstMatch).filter((match) => match.transcript === file.path);
        if (titleScore.coverage && fileMatches.length) {
          for (const match of fileMatches) {
            match.score += titleScore.score;
            match.matchSource = "session-title-and-passage";
          }
        } else if (titleScore.coverage && representative) {
          const insideRange = (sinceMs == null || representative.effectiveTime >= sinceMs)
            && (untilMs == null || representative.effectiveTime <= untilMs);
          if (insideRange) {
            matches.push({
              project: project.cwd ?? representative.cwd ?? project.encodedName,
              cwd: representative.cwd ?? project.cwd,
              sessionId: representative.sessionId,
              sessionTitle,
              messageId: representative.messageId,
              matchedAt: new Date(representative.effectiveTime).toISOString(),
              role: representative.role,
              excerpt: excerptAround(representative.text, 0, options.excerpt),
              matchSource: "session-title",
              resumeCommand: `claude --resume ${shellQuote(representative.sessionId)}`,
              score: titleScore.score,
              coverage: titleScore.coverage,
              lineNumber: representative.lineNumber,
              transcript: file.path,
            });
          }
        }
        for (let index = firstMatch; index < matches.length; index++) {
          if (matches[index].transcript !== file.path) continue;
          matches[index].sessionTitle = sessionTitle;
          matches[index].sessionStartedAt = sessionStartedAt == null
            ? null
            : new Date(sessionStartedAt).toISOString();
          matches[index].sessionLastActivityAt = sessionLastActivityAt == null
            ? null
            : new Date(sessionLastActivityAt).toISOString();
        }
      } catch (error) {
        warnings.push(`Could not read ${file.path}: ${error.message}`);
      }
    }
  }

  matches.sort((a, b) =>
    b.score - a.score || Date.parse(b.matchedAt) - Date.parse(a.matchedAt) || a.sessionId.localeCompare(b.sessionId));
  const limited = matches
    .slice(0, options.limit)
    .map(({ score, coverage, lineNumber, transcript, ...match }) => match);
  const unreadable = sessions > 0 && messages === 0 && (records > 0 || warnings.length > 0 || invalidLines > 0);

  return {
    ...base,
    status: unreadable ? "unavailable" : limited.length ? "ok" : "no-matches",
    query: options.query,
    dateRange: { since: options.since, until: options.until },
    message: unreadable
      ? "Transcript files were found, but no supported visible conversation records could be read. Claude Code's internal transcript format may have changed."
      : limited.length
        ? "Historical matches only. Check current project files before relying on them."
        : "No matching Claude Code CLI history was found in this scope.",
    matches: limited,
    searched: { sessions, records, messages, invalidLines },
    ...(warnings.length ? { warnings } : {}),
  };
}

async function visibleMessages(file) {
  const messages = [];
  const seen = new Set();
  await jsonLines(file.path, (entry, lineNumber) => {
    const text = messageText(entry);
    if (!text) return false;
    const id = messageId(entry, lineNumber);
    const key = `${entry.message.role}:${id}:${text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    messages.push({
      messageId: id,
      role: entry.message.role,
      date: entry.timestamp ?? new Date(file.mtimeMs).toISOString(),
      text,
      cwd: entry.cwd,
      sessionId: entry.sessionId ?? entry.session_id ?? basename(file.path, ".jsonl"),
    });
    return false;
  });
  return messages;
}

export async function expandSession(rawOptions = {}) {
  const options = {
    sessionId: rawOptions.sessionId,
    messageId: rawOptions.messageId,
    expand: rawOptions.expand ?? "message",
    projectDir: rawOptions.projectDir ?? process.cwd(),
    configDir: rawOptions.configDir ?? process.env.CLAUDE_CONFIG_DIR ?? resolve(homedir(), ".claude"),
    scope: rawOptions.scope ?? "project",
    allowAllProjects: rawOptions.allowAllProjects === true,
    skipPromptHistory:
      rawOptions.skipPromptHistory ?? enabled(process.env.CLAUDE_CODE_SKIP_PROMPT_HISTORY),
  };
  if (!options.sessionId || !options.messageId) {
    throw new Error("Expansion requires both --session and --message.");
  }
  if (!["message", "turn"].includes(options.expand)) {
    throw new Error("Expansion must be message or turn.");
  }
  if (!["project", "repository", "all"].includes(options.scope)) {
    throw new Error("Scope must be project, repository, or all.");
  }
  if (options.scope === "all" && !options.allowAllProjects) {
    throw new Error("All-project search requires --allow-all-projects after the owner widens the scope.");
  }
  if (options.skipPromptHistory) {
    return {
      status: "unavailable",
      source: "Claude Code CLI local transcripts",
      message: "Transcript writes are disabled by CLAUDE_CODE_SKIP_PROMPT_HISTORY.",
    };
  }

  const discovered = await discoverProjects(options.configDir);
  if (!discovered.projects.length) return historyUnavailable(options.configDir, discovered.projectsDir);
  const scopePaths = options.scope === "all"
    ? []
    : options.scope === "repository"
      ? repositoryWorktrees(options.projectDir)
      : [canonicalPath(options.projectDir)];
  const selectedProjects = selectProjects(
    discovered.projects,
    options.scope,
    scopePaths,
  );

  const candidates = [];
  for (const project of selectedProjects) {
    for (const file of project.files) {
      if (basename(file.path, ".jsonl") !== options.sessionId) continue;
      const messages = await visibleMessages(file);
      const index = messages.findIndex((message) => message.messageId === options.messageId);
      if (index !== -1) candidates.push({ project, file, messages, index });
    }
  }
  if (!candidates.length) {
    return {
      status: "no-match",
      source: "Claude Code CLI local transcripts",
      scope: options.scope,
      message: "The selected session message was not found in this scope.",
      messages: [],
    };
  }
  if (candidates.length > 1) {
    return {
      status: "ambiguous",
      source: "Claude Code CLI local transcripts",
      message: "More than one transcript contains that session and message. Narrow the scope.",
      messages: [],
    };
  }

  const candidate = candidates[0];
  const selected = [candidate.messages[candidate.index]];
  if (options.expand === "turn") {
    const current = candidate.messages[candidate.index];
    if (current.role === "user") {
      const next = candidate.messages.slice(candidate.index + 1).find((message) => message.role === "assistant");
      if (next) selected.push(next);
    } else {
      const prior = candidate.messages.slice(0, candidate.index).reverse().find((message) => message.role === "user");
      if (prior) selected.unshift(prior);
    }
  }

  return {
    status: "ok",
    source: "Claude Code CLI local transcripts",
    historyIsCurrentTruth: false,
    project: candidate.project.cwd ?? candidate.project.encodedName,
    sessionId: options.sessionId,
    resumeCommand: `claude --resume ${shellQuote(options.sessionId)}`,
    expansion: options.expand,
    messages: selected,
  };
}

function help() {
  return `Search local Claude Code CLI transcripts without changing them.

Search:
  node search-sessions.mjs --query <words> [--project <path>]
    [--scope project|repository|all] [--allow-all-projects]
    [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--limit 1-20]

Expand one result:
  node search-sessions.mjs --session <id> --message <id>
    --expand message|turn [same scope options]

The default scope is the current project. All-project search is refused unless
--allow-all-projects is present after the owner chooses that wider scope.`;
}

export function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    const take = () => {
      const value = argv[++index];
      if (value == null) throw new Error(`${argument} requires a value.`);
      return value;
    };
    if (argument === "--query") options.query = take();
    else if (argument === "--project") options.projectDir = take();
    else if (argument === "--scope") options.scope = take();
    else if (argument === "--since") options.since = take();
    else if (argument === "--until") options.until = take();
    else if (argument === "--limit") options.limit = Number(take());
    else if (argument === "--session") options.sessionId = take();
    else if (argument === "--message") options.messageId = take();
    else if (argument === "--expand") options.expand = take();
    else if (argument === "--allow-all-projects") options.allowAllProjects = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
      process.stdout.write(`${help()}\n`);
      return;
    }
    const result = options.sessionId || options.messageId || options.expand
      ? await expandSession(options)
      : await searchSessions(options);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ status: "error", message: error.message }, null, 2)}\n`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  await main();
}

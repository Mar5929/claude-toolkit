#!/usr/bin/env node

/**
 * Claude Code PreToolUse guard for the version 2 memory system.
 *
 * Architecture section 13.3 puts the approval gate in two places. One is the
 * write coordinator, which is the only approved route into canonical Markdown.
 * This file is the other one: every other route to those paths is refused
 * before it applies. A direct file edit, a helper agent, a hook, a background
 * process, a provider, or a script all get the same answer.
 *
 * Three properties are required and none of them is negotiable:
 *
 *   - Deterministic. No model sits in this path. The same event always
 *     produces the same answer. Everything here is string and path work.
 *   - Exit 0 on every path (contracts C10 and section 1.4). A Claude Code hook
 *     reports its decision in the JSON it prints, not in its exit code. A
 *     refusal is a permissionDecision of deny with the reason code and the
 *     operation that should have been used inside permissionDecisionReason.
 *   - Fail-closed on the guarded paths. When the tool input will not parse, the
 *     scope will not resolve, or an edit cannot be applied to work out what it
 *     would change, a call that names a guarded path is denied and told why. A
 *     guard that allows what it could not evaluate is not a guard.
 *
 * The guard says nothing at all about a call it does not guard, so an ordinary
 * session notices nothing.
 *
 * The guarded set is exactly what architecture section 13.3 names:
 * knowledge/memory/**, knowledge/specs/**, and knowledge/current.md. Contracts
 * decision C7 adds one rule for knowledge/project.md: an edit that would change
 * project_root, subroots, or the privacy block is refused with
 * settings/owner-only, because a boundary the agent can widen is not a
 * boundary. The rest of project.md is ordinary prose and is not guarded.
 *
 * git commands are allowed, per contracts decision C8. The owner keeps ordinary
 * Git access to every canonical file, and approved writes still have to be
 * committed. The stated consequence is that an agent running git checkout on a
 * canonical file can move it back to a committed state. The guard refuses by
 * path and operation, not by intent, and does not try to tell an honest mistake
 * from a bypass.
 *
 * The write coordinator is never blocked by this hook, because it writes from
 * inside a Node process rather than through a host tool call. A Bash call that
 * invokes memory.mjs or memory-write.mjs is allowed for the same reason: those
 * carry the review.
 *
 * Scope and path work is imported from tools/lib/scope.mjs and the reason codes
 * from tools/lib/result.mjs. Neither is reimplemented here. Two copies of a
 * boundary rule drift, and this hook and the coordinator have to agree about
 * which paths are canonical.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { note } from "../tools/lib/result.mjs";
import { findProjectFile, isMemberPath, parseFrontMatter, resolveScope } from "../tools/lib/scope.mjs";

/** The file-editing tools this guard covers. Each names its target differently. */
export const EDIT_TOOLS = Object.freeze({
  Write: "file_path",
  Edit: "file_path",
  MultiEdit: "file_path",
  NotebookEdit: "notebook_path",
});

/** The settings keys only the owner may change (contracts C7). */
export const OWNER_ONLY_KEYS = Object.freeze(["project_root", "subroots", "privacy"]);

/**
 * The shape of a guarded path, used when the scope will not resolve and the
 * only thing left to read is the text of the path itself.
 */
const GUARDED_SHAPE = /(^|[^A-Za-z0-9_-])knowledge\/(memory\/|specs\/|current\.md(?![A-Za-z0-9_-]))/;
const SETTINGS_SHAPE = /(^|[^A-Za-z0-9_-])knowledge\/project\.md(?![A-Za-z0-9_-])/;

/** Command starts that never reach the guarded set through this guard. */
const ALLOWED_COMMANDS = [
  /^git(\s|$)/,
  /(^|\/)memory\.mjs(\s|$)/,
  /(^|\/)memory-write\.mjs(\s|$)/,
];

/**
 * Mutation tokens for Bash, from contracts section 5.4. A command naming a
 * guarded path together with one of these is refused. cp and mv are on the list
 * even though a copy out of the guarded set changes nothing, because the
 * contract names them and a guard that reasons about direction is a guard that
 * can be talked around.
 */
const MUTATIONS = [
  { pattern: /(^|\s)tee(\s|$)/, kind: "write" },
  { pattern: /(^|\s)cp(\s|$)/, kind: "write" },
  { pattern: /(^|\s)(mv|rename)(\s|$)/, kind: "write" },
  { pattern: /(^|\s)rm(\s|$)/, kind: "remove" },
  { pattern: /(^|\s)(unlink|shred)(\s|$)/, kind: "remove" },
  { pattern: /(^|\s)truncate(\s|$)/, kind: "remove" },
  { pattern: /(^|\s)sed\s+(-\S+\s+)*-\S*i/, kind: "write" },
  { pattern: /(^|\s)(perl|ruby)\s+(-\S+\s+)*-\S*i/, kind: "write" },
  { pattern: /(^|\s)(vi|vim|nvim|nano|emacs|ed|pico)(\s|$)/, kind: "write" },
  { pattern: /(^|\s)(dd|install|patch|touch|chmod|chown)(\s|$)/, kind: "write" },
];

/** Redirect targets, which are writes whatever the command in front of them is. */
const REDIRECT = /(?:^|[^0-9<>&])(?:\d?>>?|&>>?)\s*(["']?)([^\s;|&()<>"']+)\1/g;

function readIfPresent(path) {
  try {
    if (!existsSync(path) || statSync(path).isDirectory()) return null;
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

/**
 * Membership beneath one guarded root, using the same canonicalization and the
 * same separator boundary the scope module uses everywhere else. A symlink
 * pointing into the guarded set resolves and is caught here.
 */
function beneath(root, candidate) {
  return isMemberPath({ scopeRoot: root, subroots: [] }, candidate);
}

/** Normalize a path for the text tests. Only separators change. */
function textual(value) {
  return String(value).replace(/\\/g, "/");
}

/**
 * The guarded roots of one project, or null when this directory is not part of
 * a memory project at all.
 */
export function guardedRoots(startDir) {
  const projectFile = findProjectFile(startDir);
  if (!projectFile) return null;
  const scope = resolveScope(startDir);
  if (!scope.ok) return { ok: false, projectFile };
  return {
    ok: true,
    projectFile: scope.projectFile,
    memory: resolve(scope.knowledgeDir, "memory"),
    specs: resolve(scope.knowledgeDir, "specs"),
    current: resolve(scope.knowledgeDir, "current.md"),
    settings: scope.projectFile,
  };
}

/**
 * What a path is, as far as this guard is concerned:
 * "memory", "specs", "current", "settings", or null for everything else.
 */
export function classifyPath(roots, target) {
  if (!roots || !roots.ok) return null;
  if (beneath(roots.current, target)) return "current";
  if (beneath(roots.settings, target)) return "settings";
  if (beneath(roots.memory, target)) return "memory";
  if (beneath(roots.specs, target)) return "specs";
  return null;
}

/** The same question answered from the text alone, for the undecidable cases. */
export function looksGuarded(pathText) {
  return GUARDED_SHAPE.test(textual(pathText));
}

export function looksLikeSettings(pathText) {
  return SETTINGS_SHAPE.test(textual(pathText));
}

/**
 * The memory.mjs operation that should have been used. The refusal names it,
 * which is what turns a block into an instruction (architecture section 13.3).
 */
export function operationFor(kind, target, intent = "write") {
  if (kind === "current") return "memory.mjs update-current";
  if (intent === "remove") {
    return "memory.mjs retire, or memory.mjs delete when the record has to go entirely";
  }
  const exists = existsSync(target);
  return exists ? "memory.mjs correct" : "memory.mjs add";
}

function refusal(code, message, operation) {
  const entry = note(code, message);
  const lines = [
    `Blocked. ${entry.code}: ${entry.message}`,
    "",
    "Canonical project knowledge changes only through the memory write",
    "coordinator, which shows the owner the exact bytes and waits for the",
    "owner's answer. This route skips that review, so it is refused before it",
    "applies rather than after.",
    "",
    `Use ${operation} instead. It proposes the change, the owner approves the`,
    "proposal, and the write applies as one transaction.",
    "",
    "Do not work around this by writing the file another way, and do not turn",
    "the guard off. If you are a helper agent, stop here and report this back",
    "to the main agent.",
  ];
  return { deny: true, code: entry.code, reason: lines.join("\n") };
}

const ALLOW = Object.freeze({ deny: false, code: null, reason: null });

/** Apply one Edit-style replacement, or report that it cannot be applied. */
function applyEdit(text, edit) {
  const oldString = typeof edit.old_string === "string" ? edit.old_string : null;
  const newString = typeof edit.new_string === "string" ? edit.new_string : null;
  if (oldString === null || newString === null) return null;
  if (oldString === "") return null;
  if (!text.includes(oldString)) return null;
  if (edit.replace_all) return text.split(oldString).join(newString);
  return text.replace(oldString, newString);
}

function boundaryOf(text) {
  const parsed = parseFrontMatter(text);
  if (!parsed.found) return null;
  const picked = {};
  for (const key of OWNER_ONLY_KEYS) picked[key] = parsed.data?.[key] ?? null;
  return JSON.stringify(picked);
}

/**
 * The settings rule. A call that leaves project_root, subroots, and the privacy
 * block exactly as they are passes. Anything this guard cannot work out is a
 * refusal, because the alternative is letting the boundary move unread.
 */
function checkSettings(toolName, input, target) {
  const before = readIfPresent(target);
  // No file yet means no boundary to widen. Project setup writes this file.
  if (before === null) return ALLOW;

  let after = null;
  if (toolName === "Write") {
    after = typeof input.content === "string" ? input.content : null;
  } else if (toolName === "Edit") {
    after = applyEdit(before, input);
  } else if (toolName === "MultiEdit") {
    const edits = Array.isArray(input.edits) ? input.edits : null;
    if (edits) {
      after = before;
      for (const edit of edits) {
        after = after === null ? null : applyEdit(after, edit);
      }
    }
  }

  if (after === null) {
    return refusal(
      "settings/owner-only",
      "this call changes knowledge/project.md in a way the guard could not read,"
      + " so the recorded scope and privacy boundary may move",
      "an owner edit, or memory.mjs status to read the current boundary",
    );
  }

  const from = boundaryOf(before);
  const to = boundaryOf(after);
  if (from !== null && to !== null && from === to) return ALLOW;

  return refusal(
    "settings/owner-only",
    "this call would change project_root, subroots, or the privacy block in"
    + " knowledge/project.md, and only the owner changes those",
    "an owner edit, made by the owner and not by an agent",
  );
}

/** One Edit, Write, MultiEdit, or NotebookEdit call. */
export function checkEditCall(toolName, input, startDir) {
  const field = EDIT_TOOLS[toolName];
  const raw = input?.[field];
  const roots = guardedRoots(startDir);

  if (typeof raw !== "string" || !raw.trim()) {
    // No readable target. Silence is right unless the payload itself names a
    // guarded path, in which case this is a call the guard could not evaluate.
    const text = textual(JSON.stringify(input ?? {}));
    if (looksGuarded(text) || looksLikeSettings(text)) {
      return refusal(
        "write/guard-refused",
        `a ${toolName} call names a canonical memory path but carries no readable target,`
        + " so the guard could not evaluate it",
        "memory.mjs with the operation the change needs",
      );
    }
    return ALLOW;
  }

  const target = resolve(isAbsolute(raw) ? raw : resolve(startDir, raw));

  if (roots === null || roots.ok === false) {
    // No project file, or a project file that will not resolve. Either way the
    // guard cannot say where the guarded set is. The text of the path is all
    // that is left, and a path shaped like a guarded one is denied.
    if (looksGuarded(textual(target)) || looksGuarded(textual(raw))) {
      return refusal(
        "write/guard-refused",
        "this path is shaped like a canonical memory path and the project scope"
        + " would not resolve, so the guard could not evaluate the call",
        "memory.mjs with the operation the change needs, once the scope resolves",
      );
    }
    return ALLOW;
  }

  const kind = classifyPath(roots, target);
  if (kind === null) return ALLOW;
  if (kind === "settings") return checkSettings(toolName, input ?? {}, target);

  return refusal(
    "write/guard-refused",
    `${toolName} would change ${kind === "current" ? "knowledge/current.md" : `canonical ${kind}`}`
    + " without the owner's review",
    operationFor(kind, target),
  );
}

/** Split a command line into the pieces that each run on their own. */
function segments(command) {
  return command.split(/\|\||&&|[;|&\n]/).map((piece) => piece.trim()).filter(Boolean);
}

function withoutSettings(text) {
  let out = text;
  while (/^[A-Za-z_][A-Za-z0-9_]*=\S*\s+/.test(out)) {
    out = out.replace(/^[A-Za-z_][A-Za-z0-9_]*=\S*\s+/, "");
  }
  return out;
}

/** Every token in a command piece that could be a path. */
function pathTokens(text) {
  const tokens = [];
  for (const match of text.matchAll(/["']?([^\s"';|&()<>]+)["']?/g)) {
    const token = match[1];
    if (!token || token.startsWith("-")) continue;
    if (token.includes("/") || token.endsWith(".md")) tokens.push(token);
  }
  return tokens;
}

function redirectTargets(text) {
  const targets = [];
  for (const match of text.matchAll(REDIRECT)) targets.push(match[2]);
  return targets;
}

function mutationKind(text) {
  for (const { pattern, kind } of MUTATIONS) {
    if (pattern.test(text)) return kind;
  }
  return null;
}

/** One Bash call. Each piece of the command line is judged on its own. */
export function checkBashCall(input, startDir) {
  const command = input?.command;
  const roots = guardedRoots(startDir);

  if (typeof command !== "string" || !command.trim()) {
    const text = textual(JSON.stringify(input ?? {}));
    if (looksGuarded(text)) {
      return refusal(
        "write/guard-refused",
        "a Bash call names a canonical memory path but carries no readable command,"
        + " so the guard could not evaluate it",
        "memory.mjs with the operation the change needs",
      );
    }
    return ALLOW;
  }

  let cwd = startDir;
  for (const piece of segments(command)) {
    const text = withoutSettings(piece).replace(/\s+/g, " ");

    // A cd moves the working directory for everything after it, so a later
    // piece naming a bare file name still resolves to the right place.
    const moved = text.match(/^cd\s+(["']?)([^\s"']+)\1$/);
    if (moved) {
      const next = moved[2];
      cwd = resolve(isAbsolute(next) ? next : resolve(cwd, next));
      continue;
    }

    if (ALLOWED_COMMANDS.some((pattern) => pattern.test(text))) continue;

    const kind = mutationKind(text);
    const targets = redirectTargets(text);
    if (kind === null && targets.length === 0) continue;

    const candidates = kind === null ? targets : [...pathTokens(text), ...targets];
    for (const candidate of candidates) {
      const absolute = resolve(isAbsolute(candidate) ? candidate : resolve(cwd, candidate));

      if (roots === null || roots.ok === false) {
        if (looksGuarded(textual(absolute)) || looksGuarded(textual(candidate))) {
          return refusal(
            "write/guard-refused",
            "this command names a path shaped like a canonical memory path and the"
            + " project scope would not resolve, so the guard could not evaluate it",
            "memory.mjs with the operation the change needs, once the scope resolves",
          );
        }
        continue;
      }

      const guarded = classifyPath(roots, absolute);
      if (guarded === null) continue;
      if (guarded === "settings") {
        return refusal(
          "settings/owner-only",
          "this command would rewrite knowledge/project.md, which carries the"
          + " recorded scope and privacy boundary",
          "an owner edit, made by the owner and not by an agent",
        );
      }
      return refusal(
        "write/guard-refused",
        `this command would change ${guarded === "current" ? "knowledge/current.md" : `canonical ${guarded}`}`
        + " without the owner's review",
        operationFor(guarded, absolute, kind ?? "write"),
      );
    }
  }

  return ALLOW;
}

/**
 * The whole decision for one PreToolUse event. Exported so the harness runs the
 * same code the hook runs.
 */
export function decide(event, options = {}) {
  const toolName = typeof event?.tool_name === "string" ? event.tool_name : "";
  const input = event?.tool_input;
  const startDir = options.startDir ?? startDirectory(event);

  if (Object.hasOwn(EDIT_TOOLS, toolName)) return checkEditCall(toolName, input ?? {}, startDir);
  if (toolName === "Bash") return checkBashCall(input ?? {}, startDir);
  return ALLOW;
}

/** Where the call is happening. The event's cwd wins, then the host variable. */
export function startDirectory(event, env = process.env) {
  const candidates = [
    typeof event?.cwd === "string" ? event.cwd : "",
    env.CLAUDE_PROJECT_DIR || "",
    env.CODEX_PROJECT_DIR || "",
  ];
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return resolve(candidate);
  }
  return process.cwd();
}

/** The deny payload, in the shape a Claude Code PreToolUse hook reports. */
export function denyPayload(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
}

/**
 * What the hook prints for one raw standard input string. An empty string means
 * the guard says nothing, which is the answer for every call it does not guard.
 */
export function hookOutput(stdinText, options = {}) {
  let event = null;
  try {
    event = stdinText.trim() ? JSON.parse(stdinText) : {};
  } catch {
    event = null;
  }

  if (event === null || typeof event !== "object") {
    // The event would not parse. Fail closed only when the raw text names
    // something that could be inside the guarded set.
    if (looksGuarded(textual(stdinText))) {
      const denied = refusal(
        "write/guard-refused",
        "this tool call names a canonical memory path and its input would not parse,"
        + " so the guard could not evaluate it",
        "memory.mjs with the operation the change needs",
      );
      return `${JSON.stringify(denyPayload(denied.reason))}\n`;
    }
    return "";
  }

  const verdict = decide(event, options);
  if (!verdict.deny) return "";
  return `${JSON.stringify(denyPayload(verdict.reason))}\n`;
}

function main() {
  let stdinText = "";
  try {
    stdinText = readFileSync(0, "utf8");
  } catch {
    stdinText = "";
  }

  try {
    process.stdout.write(hookOutput(stdinText));
  } catch {
    // The guard itself broke. It still holds the guarded paths: a raw event
    // naming one is denied on the text alone, and anything else is silent.
    if (looksGuarded(textual(stdinText))) {
      const denied = refusal(
        "write/guard-refused",
        "the guard failed while evaluating a call that names a canonical memory path",
        "memory.mjs with the operation the change needs",
      );
      process.stdout.write(`${JSON.stringify(denyPayload(denied.reason))}\n`);
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    main();
  } catch {
    // Nothing readable is left to judge, and the exit code was never the
    // decision. Exit 0 with no payload.
  }
  process.exitCode = 0;
}

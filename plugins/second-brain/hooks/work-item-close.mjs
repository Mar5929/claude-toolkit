#!/usr/bin/env node

/**
 * Hold `gh issue close` and `gh pr merge` once per work item per session, so
 * the agent asks whether any specification now describes the system wrongly.
 *
 * A finished work item is the moment a specification goes stale, and it is the
 * moment nobody remembers to check. A specification that is never updated after
 * the work lands drifts away from the real system and then answers questions
 * wrong, quietly, for months.
 *
 * This hook only reminds. It never decides, writes, or approves anything.
 * Any unexpected failure allows the command.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { matchesAny, segmentsOf, CLOSES_WORK_ITEM } from "./command-parsing.mjs";

function failOpen() {
  process.exitCode = 0;
}

export function closesWorkItem(command) {
  return matchesAny(command, CLOSES_WORK_ITEM);
}

/**
 * The issue or pull request number being closed, so the same one is held only
 * once. Falls back to the whole command when no number is found.
 */
export function workItemKey(command) {
  for (const segment of segmentsOf(command)) {
    if (!CLOSES_WORK_ITEM.some((pattern) => pattern.test(segment))) continue;
    const number = segment.match(/\b(\d+)\b/);
    if (number) return number[1];
    return segment;
  }
  return "unknown";
}

function statePath(sessionId) {
  const dir = join(tmpdir(), "second-brain-work-item-close");
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    return null;
  }
  const safe = String(sessionId || "unknown").replace(/[^A-Za-z0-9_-]/g, "");
  return join(dir, `${safe || "unknown"}.json`);
}

function readState(path) {
  if (!path || !existsSync(path)) return { items: [] };
  try {
    const value = JSON.parse(readFileSync(path, "utf8"));
    return { items: Array.isArray(value.items) ? value.items : [] };
  } catch {
    return { items: [] };
  }
}

function writeState(path, state) {
  if (!path) return;
  try {
    writeFileSync(path, JSON.stringify(state));
  } catch {
    // State only prevents a repeated reminder. It is never project knowledge.
  }
}

export function buildMessage() {
  return [
    "Held once. Finishing a work item is when a specification goes stale.",
    "",
    "Ask one question before closing: did this work change how any part of",
    "the system is meant to work?",
    "",
    "- No? Say so in one line and run the command again.",
    "- Yes? Update the specification for that area to match what was actually",
    "  built, through /remember, so the owner sees the words first. Then run",
    "  the command again.",
    "",
    "This is about how the system behaves, not about what you did. Progress,",
    "blockers, and what shipped belong in the work item itself, never in a",
    "specification or a memory.",
    "",
    "If you are a helper agent, stop and report this to the main agent.",
    "This work item will not be held again in this session.",
  ].join("\n");
}

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  }));
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return failOpen();
  }

  const command = payload.tool_input?.command;
  if (!closesWorkItem(command)) return failOpen();

  const key = workItemKey(command);
  const path = statePath(payload.session_id);
  const state = readState(path);
  if (state.items.includes(key)) return failOpen();

  writeState(path, { items: [...state.items, key] });
  deny(buildMessage());
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    main();
  } catch {
    failOpen();
  }
}

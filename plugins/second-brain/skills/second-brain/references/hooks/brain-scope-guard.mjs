#!/usr/bin/env node
// PreToolUse hook: keep a session from reading or writing ANOTHER project's
// second brain.
//
// Account-level MCP connectors are attached to the whole Claude account, not to
// a repo, so every project's brain connector is visible in every session. The
// committed `.mcp.json` names this repo's server `second-brain`, but a cloud or
// background session may have only some OTHER project's connector attached, and
// nothing marks it as foreign. A session in project A then answers from project
// B's memory, confidently and wrongly, and a curator could upsert into B's
// store. Both are silent.
//
// So: allow the brain tools of THIS project (the `second-brain` server from
// .mcp.json, plus the connector named in BRAIN_CONNECTOR) and stop the rest.
//
// Deterministic, no model, no network, no file reads. ALWAYS exits 0. Fails
// OPEN on any parse or logic error, so a guard bug can never block unrelated
// tools.
//
// Contract (same as guard-protected-orgs.js):
//   stdin  = JSON { tool_name, tool_input, ... }
//   stdout = JSON { hookSpecificOutput: { hookEventName: "PreToolUse",
//                   permissionDecision, permissionDecisionReason } }
//   permissionDecision: "allow" | "ask" | "deny"
//
// `BRAIN_SCOPE_GUARD=0` disables it.

import { readFileSync } from "node:fs";

const env = process.env;
const truthy = (v) => v === "1" || v === "true" || v === "yes" || v === "on";
const allow = () => process.exit(0);   // silent allow: emit nothing

function stop(decision, reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: decision,      // "ask" | "deny"
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

if (!truthy(env.BRAIN_SCOPE_GUARD ?? "1")) allow();

// Tools unique to the second-brain server. Seeing one of these is enough to
// know the call is a brain call, whatever the server is called.
const BRAIN_TOOLS = new Set([
  "get_digest", "put_digest", "read_journal", "append_journal", "drain_journal",
  "upsert_node", "list_nodes",
]);
// Generic names another MCP server could plausibly also use. Only treat these
// as brain calls when the server itself looks like a brain, so an unrelated
// server with its own `recall` or `export` is never caught.
const AMBIGUOUS_TOOLS = new Set(["recall", "get_node", "export"]);

// Claude Code builds tool names as mcp__<server>__<tool>, with the server's
// spaces and hyphens turned into underscores. Normalize both sides the same way
// so `Anchor Brain`, `anchor-brain`, and `Anchor_Brain` all compare equal.
const norm = (s) => String(s).trim().replace(/[\s-]+/g, "_").toLowerCase();

try {
  let payload = {};
  try { payload = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { allow(); }

  const toolName = typeof payload.tool_name === "string" ? payload.tool_name : "";
  const m = toolName.match(/^mcp__(.+)__([^_].*)$/);
  if (!m) allow();                       // not an MCP tool call at all
  const [, server, tool] = m;

  const looksLikeBrain = /brain/i.test(server);
  const isBrainCall = BRAIN_TOOLS.has(tool) || (AMBIGUOUS_TOOLS.has(tool) && looksLikeBrain);
  if (!isBrainCall) allow();

  // This project's own brain: the .mcp.json server name, plus its connector.
  const connector = env.BRAIN_CONNECTOR || "";
  const mine = new Set(["second_brain"]);          // `second-brain` normalized
  if (connector) mine.add(norm(connector));
  if (mine.has(norm(server))) allow();

  const project = env.BRAIN_PROJECT || "this project";
  if (!connector) {
    // The project never declared its connector, so we cannot prove this server
    // is foreign. Ask rather than deny: a wrong-project read is silent and
    // costly, but hard-blocking a project that simply has not been synced yet
    // would be worse. Setting BRAIN_CONNECTOR removes this prompt.
    stop("ask",
      `'${toolName}' targets the second brain of a project called '${server}', and ` +
      `${project} has not declared its own connector (BRAIN_CONNECTOR is unset in ` +
      `.claude/settings.json). Memory connectors are attached per ACCOUNT, not per repo, ` +
      `so another project's brain is visible here and its answers would be wrong for this ` +
      `one. Confirm only if '${server}' really is this project's brain.`);
  }

  stop("deny",
    `Blocked: '${toolName}' reads or writes ANOTHER project's second brain. ` +
    `${project}'s brain is 'second-brain' (terminal) or '${connector}' (cloud connector). ` +
    `Memory connectors are attached per account, not per repo, so '${server}' is visible ` +
    `here but its memory is about a different codebase: answers from it are wrong for this ` +
    `project, and writes would pollute someone else's store. If this project's brain is not ` +
    `reachable in this session, use the bearer fast path ` +
    `($BRAIN_MCP_ORIGIN/fast/$BRAIN_PROJECT/...) or say the store is unavailable. Never ` +
    `substitute another project's memory.`);
} catch {
  allow();   // fail open: a guard bug must never block unrelated work
}

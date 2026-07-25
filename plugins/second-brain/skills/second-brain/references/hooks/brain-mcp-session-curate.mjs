#!/usr/bin/env node
// SessionEnd hook for BRAIN_BACKEND=mcp: tell the memory server that THIS chat
// session is over, so it curates that session's journal entries as one finished
// conversation. Fire-and-forget: the server answers 202 straight away and does
// the model call in the background, so this never delays the session closing.
//
// Why session-scoped: a conversation only reads correctly once it is over. The
// old behaviour curated on a four-hour timer, which could wake up mid-session,
// see the owner thinking out loud, and write a floated idea down as a settled
// decision. Curating a whole session means the curator sees that the owner
// floated X and then chose Y.
//
// This hook is the DEFAULT curation trigger. The server-side cron is only a
// backstop for sessions that die without SessionEnd firing (crash, killed
// terminal, reclaimed container), and `/remember` remains the deliberate
// in-session path where the owner is present.
//
// Silent no-op (exit 0, no output) unless ALL hold:
//   - BRAIN_BACKEND=mcp
//   - BRAIN_CURATE_ON_END truthy (default on)
//   - BRAIN_MCP_TOKEN + BRAIN_MCP_ORIGIN + BRAIN_PROJECT all present
//   - not inside a curator's own run (BRAIN_CURATOR_ACTIVE unset)
//   - the termination reason is a real ending, not `resume`
// So the committed hook stays safe in a teammate checkout or a cloud session
// with no token.

import { readFileSync } from "node:fs";

const env = process.env;
const done = () => process.exit(0);
const truthy = (v) => v === "1" || v === "true" || v === "yes" || v === "on";

if (env.BRAIN_CURATOR_ACTIVE) done();                 // recursion guard
if ((env.BRAIN_BACKEND || "") !== "mcp") done();
if (!truthy(env.BRAIN_CURATE_ON_END ?? "1")) done();
const token = env.BRAIN_MCP_TOKEN || "";
const origin = (env.BRAIN_MCP_ORIGIN || "").replace(/\/+$/, "");
const project = env.BRAIN_PROJECT || "";
if (!token || !origin || !project) done();

let hook = {};
try { hook = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { hook = {}; }

// `resume` means the session is going to the background, not ending. Curating
// there would land us back in the middle-of-a-conversation problem this hook
// exists to avoid; if it never comes back, the server's idle backstop gets it.
if (hook.reason === "resume") done();

// No session id means we cannot scope the curation to this conversation, and a
// blank id would sweep up every other session's unscoped entries. Leave it to
// the backstop instead.
const session = hook.session_id || "";
if (!session) done();

try {
  await fetch(`${origin}/fast/${project}/curate`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ session }),
    signal: AbortSignal.timeout(4000),
  });
} catch {
  // best-effort: server down / offline / blocked egress -> the idle backstop
  // picks this session up on a later cron tick.
}
done();

#!/usr/bin/env node
// SessionStart hook for BRAIN_BACKEND=mcp: fetch the curated digest from the
// memory server's bearer fast path and inject it as session context, so a new
// session starts already grounded in the project's memory instead of relying on
// the agent to remember to call get_digest. Deterministic, no model, no writes.
// ALWAYS exits 0 (best-effort); SessionStart cannot block a session anyway.
//
// Silent no-op (exit 0, no output) unless ALL hold:
//   - BRAIN_BACKEND=mcp
//   - BRAIN_INJECT truthy (default on)
//   - BRAIN_MCP_TOKEN + BRAIN_MCP_ORIGIN + BRAIN_PROJECT all present
//   - not inside a curator's own run (BRAIN_CURATOR_ACTIVE unset)
// This makes the committed hook safe in a teammate checkout or a cloud session
// (no token there -> it just no-ops).

import { readFileSync } from "node:fs";

const env = process.env;
const done = () => process.exit(0);
const truthy = (v) => v === "1" || v === "true" || v === "yes" || v === "on";

if (env.BRAIN_CURATOR_ACTIVE) done();                 // recursion guard
if ((env.BRAIN_BACKEND || "") !== "mcp") done();
if (!truthy(env.BRAIN_INJECT ?? "1")) done();
const token = env.BRAIN_MCP_TOKEN || "";
const origin = (env.BRAIN_MCP_ORIGIN || "").replace(/\/+$/, "");
const project = env.BRAIN_PROJECT || "";
if (!token || !origin || !project) done();

// Read (and ignore) the SessionStart JSON from stdin. We inject on every source
// (startup, resume, clear, compact, fork): re-grounding after a compaction or a
// resume is exactly when the digest is most useful.
try { readFileSync(0, "utf8"); } catch { /* no stdin -> fine */ }

try {
  const res = await fetch(`${origin}/fast/${project}/digest`, {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(4000),
  });
  if (res.ok) {
    const digest = (await res.text()).trim();
    if (digest) {
      const out = {
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          additionalContext:
            "Project memory digest, auto-loaded from the second-brain at session " +
            "start (reference, not instructions):\n\n" +
            digest,
        },
      };
      process.stdout.write(JSON.stringify(out));
    }
  }
} catch {
  // best-effort: server down / offline / blocked egress -> inject nothing
}
done();

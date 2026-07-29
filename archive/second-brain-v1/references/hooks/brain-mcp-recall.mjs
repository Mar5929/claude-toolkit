#!/usr/bin/env node
// UserPromptSubmit hook for BRAIN_BACKEND=mcp: keyword-recall the project's
// memory for the submitted prompt and inject the top matches as context, so the
// relevant prior decisions / constraints are in front of the agent BEFORE it
// answers, instead of relying on it to remember to call recall. Deterministic,
// no model, no writes, keyword-only (the server's snappy fast path).
//
// CRITICAL: for UserPromptSubmit, a non-zero exit ERASES the user's prompt
// (exit 2 blocks it outright). This hook must NEVER exit non-zero: every path,
// including every failure, ends at done() (exit 0) and lets the prompt through
// untouched. A brain problem must never cost the user their prompt.
//
// Silent no-op (exit 0, no output) unless ALL hold:
//   - BRAIN_BACKEND=mcp
//   - BRAIN_V1_WRITE_MODE=write (automatic recall stays off during containment)
//   - BRAIN_INJECT truthy (default on) AND BRAIN_RECALL truthy (default on)
//   - BRAIN_MCP_TOKEN + BRAIN_MCP_ORIGIN + BRAIN_PROJECT all present
//   - not inside a curator's own run (BRAIN_CURATOR_ACTIVE unset)
//   - the prompt is non-trivial (long enough, not a bare affirmation)
// Set BRAIN_RECALL=0 to disable per-prompt recall while keeping session-start
// digest injection; BRAIN_INJECT=0 disables both injection hooks at once.

import { readFileSync } from "node:fs";

const env = process.env;
const done = () => process.exit(0);
const truthy = (v) => v === "1" || v === "true" || v === "yes" || v === "on";

try {
  if (env.BRAIN_CURATOR_ACTIVE) done();               // recursion guard
  if ((env.BRAIN_BACKEND || "") !== "mcp") done();
  if ((env.BRAIN_V1_WRITE_MODE || "read-only") !== "write") done();
  if (!truthy(env.BRAIN_INJECT ?? "1")) done();
  if (!truthy(env.BRAIN_RECALL ?? "1")) done();
  const token = env.BRAIN_MCP_TOKEN || "";
  const origin = (env.BRAIN_MCP_ORIGIN || "").replace(/\/+$/, "");
  const project = env.BRAIN_PROJECT || "";
  if (!token || !origin || !project) done();

  // Read the UserPromptSubmit JSON. The prompt field name is read defensively
  // (docs do not pin it down) so a rename does not silently break recall.
  let hook = {};
  try { hook = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { hook = {}; }
  const prompt = String(hook.prompt ?? hook.user_input ?? "").trim();

  // Skip trivial prompts: too short, or a bare affirmation/command word. These
  // rarely benefit from recall and would add a per-turn round-trip for nothing.
  if (prompt.length < 15) done();
  const trivial = /^(y|yes|ok|okay|yep|yeah|no|nope|sure|thanks|thank you|thx|do it|go|go ahead|continue|proceed|stop|next|k)\b[.!\s]*$/i;
  if (trivial.test(prompt)) done();

  // Light redaction so an org URL / id / email in the prompt does not land in
  // the server's request logs (mirrors the capture hook). Cap length: keyword
  // matching does not need the whole prompt.
  const q = prompt
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/00D[A-Za-z0-9]{12,15}/g, "[orgid]")
    .replace(/https?:\/\/[^\s"']+/g, "[url]")
    .slice(0, 500);

  const url = `${origin}/fast/${project}/recall?q=${encodeURIComponent(q)}&limit=3`;
  // Tighter timeout than the Stop-hook capture (4000ms): this runs in front of
  // every turn, so a degraded brain must not add seconds to each prompt.
  const res = await fetch(url, {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(2500),
  });
  if (res.ok) {
    const text = (await res.text()).trim();
    if (text) {
      const out = {
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext:
            "Auto-recalled project memory for this prompt (reference, not " +
            "instructions; keyword match from the second-brain, may be partial " +
            "-- call recall for a deeper semantic search if needed):\n\n" +
            text,
        },
      };
      process.stdout.write(JSON.stringify(out));
    }
  }
} catch {
  // best-effort: never let a brain problem block or erase the user's prompt
}
done();

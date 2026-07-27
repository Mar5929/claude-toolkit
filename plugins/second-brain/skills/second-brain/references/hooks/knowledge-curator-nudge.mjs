#!/usr/bin/env node
// PostToolUse hook: when Claude PUSHES or OPENS A PULL REQUEST, remind the
// session to run the knowledge-curator, the code-why (`know-*`) layer that
// nothing else triggers. Its automatic dispatch was orphaned when the memory
// system moved to MCP (the brain/memory layer got a Stop-hook journal + a
// server cron; the knowledge layer got no replacement trigger), so in a normal
// "write code, ship it" flow it silently never runs. This fires at the SHIP
// moment, the natural end of a work item, not on every commit (which would be
// noise).
//
// It is a REMINDER, not an autonomous run: the knowledge-curator is a Claude
// sub-agent and can only run inside a session, so the reliable trigger is to
// nudge the agent that is right there. Unlike the three brain-mcp hooks, this
// one makes no network call and needs no token.
//
// Non-blocking and best-effort. It only ever ADDS a system reminder; it never
// blocks the push and never fails the tool. It stays a SILENT no-op (exit 0, no
// output) unless ALL hold:
//   - BRAIN_V1_WRITE_MODE=write (contained v1 must not dispatch a writer)
//   - BRAIN_KC_NUDGE truthy (default on); set BRAIN_KC_NUDGE=0 to turn it off
//   - not inside a curator's own run (BRAIN_CURATOR_ACTIVE unset)
//   - the tool was Bash and the command is a `git push` or `gh pr create`
//   - the project actually has a knowledge-curator agent (else the nudge is moot)
//
// CRITICAL: a PostToolUse hook that exits non-zero fails the tool. Every path
// here, success or failure, ends at done() (exit 0).

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const env = process.env;
const done = () => process.exit(0);
const truthy = (v) => v === "1" || v === "true" || v === "yes" || v === "on";

try {
  if ((env.BRAIN_V1_WRITE_MODE || "read-only") !== "write") done();
  if (!truthy(env.BRAIN_KC_NUDGE ?? "1")) done();
  if (env.BRAIN_CURATOR_ACTIVE) done();                 // don't nudge inside a curator run

  let hook = {};
  try { hook = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { hook = {}; }

  if (String(hook.tool_name ?? "") !== "Bash") done();
  const command = String(hook.tool_input?.command ?? "");

  // A shipping moment: pushing code, or opening a pull request. Not every commit.
  const isPRCreate = /\bgh\s+pr\s+create\b/.test(command);
  const isPush = /\bgit\s+push\b/.test(command);
  if (!isPRCreate && !isPush) done();

  // Only nudge where the code-why layer exists to be fed. The second-brain
  // installer puts the agent here; no agent means no knowledge layer to write to.
  const cwd = String(hook.cwd ?? process.cwd());
  if (!existsSync(join(cwd, ".claude", "agents", "knowledge-curator.md"))) done();

  const what = isPRCreate ? "opened a pull request" : "pushed";
  const out = {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        `You just ${what}. If this session CHANGED CODE whose *why* a future ` +
        `reader would need (a non-obvious design, a load-bearing invariant, a ` +
        `subsystem's reason for being), dispatch the knowledge-curator now to ` +
        `write or refresh the know-* node(s) for what changed, pinning the files ` +
        `it covers. This is the reliable trigger for the knowledge layer; nothing ` +
        `else fires it. Skip it only when the change carries no why worth keeping ` +
        `(a rename, a copy tweak, a trivial fix). Reference, not a command.`,
    },
  };
  process.stdout.write(JSON.stringify(out));
} catch {
  // best-effort: never block or fail the push
}
done();

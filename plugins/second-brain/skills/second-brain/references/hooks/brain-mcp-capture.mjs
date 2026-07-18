#!/usr/bin/env node
// Stop hook for BRAIN_BACKEND=mcp: drop ONE redacted turn record into the
// memory server's journal via the bearer fast path. Deterministic, no model,
// no git writes. ALWAYS exits 0 (best-effort). Curation (journal -> nodes) is a
// separate in-session brain-curator dispatch, not this hook.
//
// Silent no-op (exit 0, no output) unless ALL hold:
//   - BRAIN_BACKEND=mcp
//   - BRAIN_CAPTURE truthy (default on)
//   - BRAIN_MCP_TOKEN + BRAIN_MCP_ORIGIN + BRAIN_PROJECT all present
//   - not inside a curator's own run (BRAIN_CURATOR_ACTIVE unset)
// This makes the committed hook safe in a teammate checkout or a cloud session
// (no token there) and safe under the git rollback path.

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const env = process.env;
const done = () => process.exit(0);
const truthy = (v) => v === "1" || v === "true" || v === "yes" || v === "on";

if (env.BRAIN_CURATOR_ACTIVE) done();                 // recursion guard
if ((env.BRAIN_BACKEND || "") !== "mcp") done();
if (!truthy(env.BRAIN_CAPTURE ?? "1")) done();
const token = env.BRAIN_MCP_TOKEN || "";
const origin = (env.BRAIN_MCP_ORIGIN || "").replace(/\/+$/, "");
const project = env.BRAIN_PROJECT || "";
if (!token || !origin || !project) done();

const projectDir = env.CLAUDE_PROJECT_DIR || process.cwd();

// Redact anything that could leak org access details or PII into the cloud DB.
function redact(s) {
  if (s == null) return s;
  return String(s)
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/00D[A-Za-z0-9]{12,15}/g, "[orgid]")
    .replace(/https?:\/\/[A-Za-z0-9.-]*\.(?:my\.salesforce|salesforce|salesforce-setup|force|visualforce|documentforce|my\.site)\.com[^\s"']*/gi, "[sf-url]");
}
// Keep repo-relative paths (git status --porcelain already gives these); only
// basename-collapse a TRUE absolute path outside the repo, so an absolute path
// never carries the OS username. Strip trailing slashes (untracked dirs).
function relPath(p) {
  if (!p) return p;
  let s = String(p).replace(/\\/g, "/").replace(/\/+$/, "");
  const root = projectDir.replace(/\\/g, "/").replace(/\/+$/, "");
  if (s.startsWith(root)) s = s.slice(root.length).replace(/^\/+/, "");
  else if (/^[A-Za-z]:\//.test(s) || s.startsWith("/")) s = s.split("/").pop() || "";
  return redact(s);
}

// Read the Stop-hook JSON from stdin (best-effort).
let hook = {};
try { hook = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { hook = {}; }

function git(args) {
  try {
    return execSync(`git -C "${projectDir}" ${args}`, {
      encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 1500,
    }).trim();
  } catch { return ""; }
}
const branch = redact(git("rev-parse --abbrev-ref HEAD"));
const head = git("rev-parse HEAD");
const subject = redact(git("log -1 --pretty=%s"));
const changed = git("status --porcelain")
  .split("\n")
  .map((l) => {
    let p = l.slice(3).trim();
    const arrow = p.indexOf(" -> ");
    if (arrow !== -1) p = p.slice(arrow + 4);   // renamed/copied: keep the new path
    return p.replace(/^"|"$/g, "");             // git quotes paths with spaces / non-ascii
  })
  .map(relPath)
  .filter(Boolean)
  .slice(0, 40);

const entry = {
  source: "local",
  ts: new Date().toISOString(),
  session: hook.session_id || "",
  transcript: relPath(hook.transcript_path || ""),
  branch,
  head,
  head_subject: subject,
  changed,
  repo_changed: changed.length > 0,
};

try {
  await fetch(`${origin}/fast/${project}/journal`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(entry),
    signal: AbortSignal.timeout(4000),
  });
} catch {
  // best-effort: server down / offline / blocked egress -> drop silently
}
done();

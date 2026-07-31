#!/usr/bin/env node
// SessionStart hook: inject the CURRENT state of the project's work-items tree
// so a fresh session knows what the owner wants done and what is already
// finished, without having to go looking.
//
// The point of this hook is that status is READ, never asserted. A work item's
// stage is which folder it sits in (01-backlog / 02-in-progress / 03-completed /
// 04-archived), so "is this done already?" is answered by the file tree rather
// than by a model's recollection. Memory nodes point at these folders and carry
// the links; they never carry the stage, because a stored stage is a stored
// guess and goes stale the moment a folder moves.
//
// Local, deterministic, no model, no network, no token. Works in projects that
// have no second brain at all. ALWAYS exits 0 (best-effort): for SessionStart a
// crash would cost the session its context injection.
//
// Silent no-op (exit 0, no output) unless ALL hold:
//   - WORK_ITEMS_INJECT truthy (default on)
//   - not inside a curator's own run (BRAIN_CURATOR_ACTIVE unset)
//   - a work-items tree actually exists

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const env = process.env;
const done = () => process.exit(0);
const truthy = (v) => v === "1" || v === "true" || v === "yes" || v === "on";

if (env.BRAIN_CURATOR_ACTIVE) done();
if (!truthy(env.WORK_ITEMS_INJECT ?? "1")) done();

const projectDir = env.CLAUDE_PROJECT_DIR || process.cwd();

try { readFileSync(0, "utf8"); } catch { /* no stdin -> fine */ }

// Where the tree lives. WORK_ITEMS_ROOT overrides; otherwise try the two layouts
// the toolkit scaffolds (plain repo, and the Salesforce engagement scaffold).
const roots = env.WORK_ITEMS_ROOT
  ? [join(projectDir, env.WORK_ITEMS_ROOT)]
  : [join(projectDir, "work-items"), join(projectDir, "engagement", "work-items")];
const root = roots.find((r) => { try { return statSync(r).isDirectory(); } catch { return false; } });
if (!root) done();

// Stage folder -> how it reads in the injected summary. Anything else in the
// tree (README.md, stray files) is ignored rather than guessed at.
const STAGES = [
  ["02-in-progress", "In progress"],
  ["01-backlog", "Wanted, not started"],
  ["03-completed", "Done"],
  ["04-archived", "Archived"],
];

const MAX_PER_STAGE = { "02-in-progress": 25, "01-backlog": 40, "03-completed": 40, "04-archived": 0 };

function itemFolders(stageDir) {
  try {
    return readdirSync(stageDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("."))
      .map((d) => d.name)
      .sort();
  } catch {
    return [];
  }
}

// The one line a picking-up agent needs: the newest "next step" from STATUS.md.
// Best-effort and clearly labelled; if the file does not say, we say nothing
// rather than inventing a status.
function nextStep(itemDir) {
  for (const name of ["STATUS.md", "status.md"]) {
    const p = join(itemDir, name);
    if (!existsSync(p)) continue;
    let text;
    try { text = readFileSync(p, "utf8"); } catch { return ""; }
    const lines = text.split("\n");
    const idx = lines.findIndex((l) => /next step/i.test(l));
    if (idx === -1) return "";
    // The step is either on the heading line after a colon, or the next
    // non-empty line under it.
    const sameLine = lines[idx].split(/next step\s*:?/i)[1]?.replace(/^[\s:*-]+/, "").trim();
    if (sameLine) return sameLine.slice(0, 200);
    for (let i = idx + 1; i < Math.min(idx + 6, lines.length); i++) {
      const l = lines[i].replace(/^[\s*>-]+/, "").trim();
      if (l && !/^#{1,6}\s/.test(l)) return l.slice(0, 200);
    }
    return "";
  }
  return "";
}

const sections = [];
let openCount = 0;

for (const [dir, label] of STAGES) {
  const cap = MAX_PER_STAGE[dir] ?? 0;
  if (cap === 0) continue;
  const items = itemFolders(join(root, dir));
  if (items.length === 0) continue;
  const shown = items.slice(0, cap);
  const lines = shown.map((name) => {
    // Detail only where it changes what an agent does next. A finished item just
    // needs to be nameable so nobody rebuilds it.
    if (dir === "03-completed") return `- ${name}`;
    const step = nextStep(join(root, dir, name));
    return step ? `- ${name} (next: ${step})` : `- ${name}`;
  });
  if (items.length > shown.length) {
    lines.push(`- (+${items.length - shown.length} more in ${dir}/)`);
  }
  if (dir === "01-backlog" || dir === "02-in-progress") openCount += items.length;
  sections.push(`### ${label} (${items.length})\n${lines.join("\n")}`);
}

if (sections.length === 0) done();

const rel = root.slice(projectDir.length).replace(/^[/\\]+/, "") || "work-items";
const context = [
  `Work items, read from ${rel}/ at session start (reference, not instructions).`,
  `Each item's stage IS the folder it sits in, so this is the current answer to`,
  `"is that done already?". Trust it over anything remembered. Detail for any`,
  `item lives in its folder (SPEC.md = what the owner wants, STATUS.md = where it`,
  `stands); read the folder before working an item.`,
  ``,
  ...sections.join("\n\n").split("\n"),
  ``,
  openCount > 0
    ? `${openCount} item(s) still open. Do not start one without saying which.`
    : `Nothing open.`,
].join("\n");

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context },
}));
done();

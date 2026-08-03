#!/usr/bin/env node

/**
 * orphan-check.mjs: fail when the toolkit ships a file nothing points at.
 *
 * Why this exists: in July 2026 a cleanup removed the last live pointer to the
 * Salesforce dependency graph. All sixteen of its files stayed in the repo and
 * kept passing every test, but no skill, README, or index named them any more,
 * so setup stopped offering the tool and nobody noticed for weeks. Tests that
 * check what a file SAYS cannot catch that. This one checks whether a file can
 * still be FOUND.
 *
 * The rule: every shipped file must be named by at least one index document.
 * An index document is one of:
 *
 *   README.md, CLAUDE.md, docs/toolkit-map.md
 *   plugins/<plugin>/README.md
 *   plugins/<plugin>/skills/<skill>/SKILL.md
 *   any references/setup-flow.md
 *   any README.md that indexes a folder (library/rules/general/,
 *   library/rules/salesforce/, library/tools/kb/, hooks/,
 *   docs/second-brain-v3/, and so on)
 *
 * Being named by an ordinary document is deliberately NOT enough. In July the
 * orphaned guide was still mentioned by two other files, but both were archived
 * material nobody routes through, which is exactly how the tool went missing
 * while looking present.
 *
 * "Named" means an index contains the file's path, or enough of the tail of its
 * path to be unambiguous, or a reference to the folder it sits in directly (a
 * folder reference covers the files one level inside it, not the whole tree).
 *
 * Run: node tests/orphan-check.mjs
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const tracked = execFileSync("git", ["ls-files"], {
  cwd: root,
  encoding: "utf8",
})
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

/** Files that must be reachable. */
const CANDIDATE_ROOTS = ["plugins/", "docs/", "tests/"];

/**
 * Exempt paths. These are found by the host or by git, not by a pointer:
 *   - plugin and skill manifests, which the marketplace file enumerates;
 *   - SKILL.md and plugin READMEs, which are the index documents themselves;
 *   - a skill's Codex presentation file, which that host reads by position;
 *   - anything inside a dot-directory (host metadata).
 */
function isExempt(path) {
  if (path.split("/").some((part) => part.startsWith("."))) return true;
  if (path.endsWith("/SKILL.md")) return true;
  if (/^plugins\/[^/]+\/README\.md$/.test(path)) return true;
  if (/^plugins\/[^/]+\/skills\/[^/]+\/agents\/[^/]+\.yaml$/.test(path)) return true;
  return false;
}

function isIndexDocument(path) {
  if (path === "README.md" || path === "CLAUDE.md") return true;
  if (path === "docs/toolkit-map.md") return true;
  if (path.endsWith("/SKILL.md")) return true;
  if (path.endsWith("/README.md")) return true;
  if (path.endsWith("/setup-flow.md")) return true;
  return false;
}

const candidates = tracked.filter(
  (path) => CANDIDATE_ROOTS.some((dir) => path.startsWith(dir)) && !isExempt(path),
);

const indexes = tracked.filter(
  (path) => isIndexDocument(path) && (path.endsWith(".md") || path.endsWith(".json")),
);

const indexText = new Map();
for (const path of indexes) {
  indexText.set(path, readFileSync(resolve(root, path), "utf8"));
}

/** Every segment-aligned tail of a path: a/b/c -> ["a/b/c", "b/c", "c"]. */
function tails(path) {
  const parts = path.split("/");
  const out = [];
  for (let i = 0; i < parts.length; i++) out.push(parts.slice(i).join("/"));
  return out;
}

/**
 * Folders whose direct children may be referred to by bare name, because that
 * is how the toolkit's own indexes talk about them ("the `tools/` folder", "the
 * `hooks/` folder"). Anywhere deeper, a bare folder name like `src/` or `lib/`
 * is too generic to prove anything, so it does not count.
 *
 * `library` joined this list in #126, when the rules, styles, tools, templates,
 * and guides moved out of `references/` into `plugins/project-init/library/`.
 */
const NAMEABLE_PARENTS = new Set([
  "references",
  "library",
  "plugins",
  "docs",
  "",
]);

/**
 * The strings that count as naming this file. A bare "README.md" names nothing,
 * so a README is only matched by its folder, never by its own file name.
 *
 * A folder reference covers the code, data, and config files directly inside
 * it, plus that folder's own README. It deliberately does NOT cover a document
 * sitting in the folder: a guide has to be named, because "there is a folder
 * over there" is exactly the kind of pointer that let a whole guide go missing
 * while the folder around it still looked referenced.
 */
function mentionsFor(path) {
  const parts = path.split("/");
  const base = parts[parts.length - 1];
  const isDocument = base.endsWith(".md") && base !== "README.md";
  const fileTails = base === "README.md" ? tails(path).slice(0, -1) : tails(path);
  if (isDocument) return fileTails;
  const parentParts = parts.slice(0, -1);
  const grandparent = parentParts[parentParts.length - 2] ?? "";
  const folderTails = tails(parentParts.join("/"))
    .filter((tail) => tail.includes("/") || NAMEABLE_PARENTS.has(grandparent))
    .map((tail) => `${tail}/`);
  return [...fileTails, ...folderTails];
}

const orphans = [];
for (const path of candidates) {
  const mentions = mentionsFor(path);
  let found = false;
  for (const [indexPath, text] of indexText) {
    if (indexPath === path) continue;
    if (mentions.some((mention) => text.includes(mention))) {
      found = true;
      break;
    }
  }
  if (!found) orphans.push(path);
}

if (orphans.length > 0) {
  console.log(`FAIL: ${orphans.length} shipped file(s) that no index points at:`);
  for (const path of orphans) console.log(`  ${path}`);
  console.log("");
  console.log("Fix by naming the file (or the folder it sits in) in the skill,");
  console.log("plugin README, folder index, or docs/toolkit-map.md that should");
  console.log("lead a session to it. If it is no longer wanted, delete it.");
  throw new Error(`FAIL: ${orphans.length} orphaned file(s)`);
}

console.log(
  `ALL PASS (${candidates.length} shipped files reachable from ` +
    `${indexes.length} index documents), FAIL: 0`,
);

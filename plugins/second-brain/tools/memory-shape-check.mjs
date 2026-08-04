#!/usr/bin/env node

/**
 * memory-shape-check.mjs: confirm the shape of every durable document in about
 * a second.
 *
 * Why this exists: the shape of a memory document is mechanical. A title, a
 * one-sentence summary, a source line, an allowed folder, an entry in the
 * nearest index. Making an agent read a long rule to enforce that is slow and
 * it forgets. This never forgets and it costs a second.
 *
 * It checks shape only. Whether the content is TRUE is the memory verifier's
 * job, and it runs before the owner ever sees the words.
 *
 * Run from the project root:
 *   node .claude/tools/memory-shape-check.mjs
 *   node .claude/tools/memory-shape-check.mjs memory/knowledge/hooks
 *
 * Exit code 0 when everything passes, 1 when something is missing.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const roots = args.length > 0 ? args : ["memory", "specs"];

/** The seven typed homes. Anything else under memory/ is a wrong folder. */
const MEMORY_TYPES = new Set([
  "context",
  "planning",
  "decisions",
  "knowledge",
  "references",
  "domain",
  "operations",
]);

/** The allowed values of the source line. A trailing clause is fine. */
const BASIS = /^Basis: (Observed|Owner-confirmed \d{4}-\d{2}-\d{2}|Source|Inferred, unconfirmed)\b/;

/** An index names its folder's contents; it carries no source line itself. */
const isIndex = (path) => basename(path) === "README.md";

/** The two indexes at the top of the tree, which no other index owns. */
const TREE_ROOTS = new Set(["memory/README.md", "specs/README.md"]);

function posix(path) {
  return path.split(sep).join("/");
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(resolve(root, dir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(path, out);
    else if (entry.name.endsWith(".md")) out.push(path);
  }
  return out;
}

function read(path) {
  return readFileSync(resolve(root, path), "utf8").replace(/\r\n/g, "\n");
}

/**
 * The title, the one-sentence summary, and the source line, read the way a
 * person reads them: the first heading, the first paragraph under it, and a
 * `Basis:` line before the first section heading.
 */
function head(text) {
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;

  const titleMatch = lines[i] ? lines[i].match(/^# (.+)$/) : null;
  const title = titleMatch ? titleMatch[1].trim() : null;
  if (!title) return { title: null, summary: null, basis: null };
  i++;

  while (i < lines.length && lines[i].trim() === "") i++;

  const summaryLines = [];
  while (
    i < lines.length
    && lines[i].trim() !== ""
    && !lines[i].startsWith("#")
    && !BASIS.test(lines[i])
  ) {
    summaryLines.push(lines[i].trim());
    i++;
  }
  const summary = summaryLines.length > 0 ? summaryLines.join(" ") : null;

  let basis = null;
  for (let j = i; j < lines.length; j++) {
    if (/^## /.test(lines[j])) break;
    if (BASIS.test(lines[j])) {
      basis = lines[j].trim();
      break;
    }
  }

  return { title, summary, basis };
}

/** The index that owns this file: the nearest README.md above it. */
function nearestIndex(path) {
  let dir = dirname(path);
  if (isIndex(path)) dir = dirname(dir);
  while (dir && dir !== "." && dir !== "/") {
    const candidate = `${posix(dir)}/README.md`;
    try {
      if (statSync(resolve(root, candidate)).isFile()) return candidate;
    } catch {
      /* keep walking up */
    }
    dir = dirname(dir);
  }
  return null;
}

/** Every relative Markdown link in a file, resolved to a repo path. */
function linkTargets(indexPath) {
  const text = read(indexPath);
  const dir = dirname(indexPath);
  const targets = new Set();
  for (const match of text.matchAll(/\]\(([^)\s]+?)(?:\s+"[^"]*")?\)/g)) {
    const href = match[1];
    if (/^[a-z]+:/i.test(href) || href.startsWith("#")) continue;
    targets.add(posix(relative(root, resolve(root, dir, href.split("#")[0]))));
  }
  return targets;
}

const files = roots.flatMap((r) => {
  const full = resolve(root, r);
  try {
    return statSync(full).isDirectory() ? walk(posix(relative(root, full))) : [posix(r)];
  } catch {
    return [];
  }
});

const failures = [];
const indexCache = new Map();

for (const path of files) {
  const problems = [];
  const { title, summary, basis } = head(read(path));

  if (!title) {
    problems.push("no title: the first line should be `# ` and the name of the thing");
  }
  if (!summary) {
    problems.push("no one-sentence summary directly under the title");
  }

  const underMemory = path.startsWith("memory/");

  if (underMemory) {
    const type = path.split("/")[1];
    if (!MEMORY_TYPES.has(type) && path !== "memory/README.md") {
      problems.push(
        `\`memory/${type}/\` is not one of the seven homes: `
          + `${[...MEMORY_TYPES].join(", ")}`,
      );
    }
    if (!isIndex(path) && !basis) {
      problems.push(
        "no `Basis:` line under the summary. Use one of: `Basis: Observed`,"
          + " `Basis: Owner-confirmed <YYYY-MM-DD>`, `Basis: Source`,"
          + " `Basis: Inferred, unconfirmed`",
      );
    }
  }

  if (!TREE_ROOTS.has(path)) {
    const index = nearestIndex(path);
    if (!index) {
      problems.push("no index above it, so nothing points at it");
    } else {
      if (!indexCache.has(index)) indexCache.set(index, linkTargets(index));
      if (!indexCache.get(index).has(path)) {
        problems.push(
          `${index} does not link to it. Run`
            + " `node .claude/tools/memory-index-build.mjs` to rebuild the list.",
        );
      }
    }
  }

  if (problems.length > 0) failures.push({ path, problems });
}

if (failures.length > 0) {
  const lines = failures.map(
    ({ path, problems }) => `  ${path}\n${problems.map((p) => `    ${p}`).join("\n")}`,
  );
  console.error(
    `FAIL: ${failures.length} document(s) are missing something the shape`
      + ` needs:\n${lines.join("\n")}\n\nThe save is not finished until these`
      + " pass.\n",
  );
  process.exit(1);
}

console.log(
  `ALL PASS (${files.length} documents have a title, a summary, a source line`
    + " where one is required, an allowed folder, and an index entry), FAIL: 0",
);

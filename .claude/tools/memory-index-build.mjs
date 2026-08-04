#!/usr/bin/env node

/**
 * memory-index-build.mjs: build the list of documents in every index from the
 * documents themselves.
 *
 * Why this exists: a hand-typed index goes out of date the moment somebody
 * forgets to add a line, and nothing notices. Every entry here comes straight
 * from the document it points at, so the list cannot disagree with the folder.
 *
 * What it rebuilds: the run of `- [Title](path): summary` bullets inside these
 * sections, and nothing else.
 *
 *   ## Areas, ## Types, or ## Capabilities   subfolders that have a README.md
 *   ## Documents                             other .md files in the same folder
 *   ## Superseded documents                  those marked `Status: Superseded`
 *
 * Every other line is left exactly as it is: the prose saying what the folder
 * owns and does not own, a hand-written table, a note saying the folder is
 * empty. Only the bullets are generated, because only the bullets can silently
 * fall out of step with the folder.
 *
 * Each entry's title and summary come from the document's own first heading and
 * first paragraph, so there is one source for both and no second copy to drift.
 *
 * Run from the project root:
 *   node .claude/tools/memory-index-build.mjs
 *   node .claude/tools/memory-index-build.mjs --check
 *
 * `--check` writes nothing and exits 1 if any index is out of date.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, relative, resolve, sep } from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const given = args.filter((a) => !a.startsWith("--"));
const searchRoots = given.length > 0 ? given : ["memory", "specs"];

const AREA_HEADINGS = ["## Areas", "## Types", "## Capabilities"];
const DOCS_HEADING = "## Documents";
const SUPERSEDED_HEADING = "## Superseded documents";
const WIDTH = 79;
const INDENT = "  ";

const posix = (path) => path.split(sep).join("/");
const read = (path) => readFileSync(resolve(root, path), "utf8").replace(/\r\n/g, "\n");

/** The title and the one-sentence summary, which is what an entry is made of. */
function head(text) {
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  const titleMatch = lines[i] ? lines[i].match(/^# (.+)$/) : null;
  if (!titleMatch) return { title: null, summary: null };
  i++;
  while (i < lines.length && lines[i].trim() === "") i++;
  const summary = [];
  while (
    i < lines.length
    && lines[i].trim() !== ""
    && !lines[i].startsWith("#")
    && !/^(Basis|Status|Tags|Aliases|Sources|Review (after|when)): /.test(lines[i])
  ) {
    summary.push(lines[i].trim());
    i++;
  }
  return { title: titleMatch[1].trim(), summary: summary.join(" ") || null };
}

const isSuperseded = (text) => /^Status: Superseded\b/m.test(text);

/**
 * Wrap at 79 columns. The first token is the link and is never broken across
 * lines, however long the title is, because a split link is a broken link.
 */
function wrapTokens(tokens) {
  const lines = [];
  let line = "";
  for (const token of tokens) {
    const candidate = line === "" ? token : `${line} ${token}`;
    const width = lines.length === 0 ? WIDTH : WIDTH - INDENT.length;
    if (line !== "" && candidate.length > width) {
      lines.push(line);
      line = token;
    } else {
      line = candidate;
    }
  }
  if (line !== "") lines.push(line);
  return lines.map((l, i) => (i === 0 ? l : INDENT + l));
}

function entry(href, title, summary) {
  const link = `- [${title}](${href})`;
  if (!summary) return [link];
  return wrapTokens([`${link}:`, ...summary.split(/\s+/)]);
}

function indexesUnder(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(resolve(root, dir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const item of entries) {
    if (item.isDirectory()) indexesUnder(`${dir}/${item.name}`, out);
    else if (item.name === "README.md") out.push(`${dir}/${item.name}`);
  }
  return out;
}

/** The three lists this folder should show, built from what is actually in it. */
function listsFor(indexPath) {
  const dir = dirname(indexPath);
  const entries = readdirSync(resolve(root, dir), { withFileTypes: true });
  const areas = [];
  const documents = [];
  const superseded = [];

  for (const item of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    if (item.isDirectory()) {
      const childIndex = `${dir}/${item.name}/README.md`;
      try {
        if (!statSync(resolve(root, childIndex)).isFile()) continue;
      } catch {
        continue;
      }
      const { title, summary } = head(read(childIndex));
      if (title) areas.push(...entry(`${item.name}/README.md`, title, summary));
      continue;
    }
    if (!item.name.endsWith(".md") || item.name === "README.md") continue;
    const text = read(`${dir}/${item.name}`);
    const { title, summary } = head(text);
    if (!title) continue;
    const lines = entry(item.name, title, summary);
    if (isSuperseded(text)) superseded.push(...lines);
    else documents.push(...lines);
  }

  return { areas, documents, superseded };
}

const isEntryStart = (line) => /^- \[/.test(line);
const isContinuation = (line) => /^ {2}\S/.test(line);

/**
 * Swap the run of generated bullets inside one section, leaving every other
 * line in that section untouched. Returns null when the heading is not there.
 */
function rebuildSection(text, heading, bullets) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) return null;

  let end = start + 1;
  while (end < lines.length && !/^## (?!#)/.test(lines[end])) end++;

  const body = lines.slice(start + 1, end);
  let from = body.findIndex(isEntryStart);
  let to = from;
  if (from !== -1) {
    to = from + 1;
    while (to < body.length && (isEntryStart(body[to]) || isContinuation(body[to]))) to++;
  }

  let rebuilt;
  if (from !== -1) {
    rebuilt = [...body.slice(0, from), ...bullets, ...body.slice(to)];
    if (bullets.length === 0) {
      // Drop the blank line the removed run used to sit against.
      while (rebuilt.length > 1 && rebuilt[0] === "" && rebuilt[1] === "") rebuilt.shift();
    }
  } else if (bullets.length > 0) {
    rebuilt = ["", ...bullets, ...body];
  } else {
    return lines.join("\n");
  }

  return [...lines.slice(0, start + 1), ...rebuilt, ...lines.slice(end)].join("\n");
}

const files = searchRoots.flatMap((r) => {
  try {
    const full = resolve(root, r);
    return statSync(full).isDirectory()
      ? indexesUnder(posix(relative(root, full)))
      : [posix(r)];
  } catch {
    return [];
  }
});

const stale = [];
let changed = 0;
let seen = 0;

for (const indexPath of files) {
  if (basename(indexPath) !== "README.md") continue;
  seen++;
  const original = read(indexPath);
  let text = original;
  const { areas, documents, superseded } = listsFor(indexPath);

  const areaHeading = AREA_HEADINGS.find((h) => text.includes(`\n${h}\n`)) ?? AREA_HEADINGS[0];

  for (const [heading, bullets] of [
    [areaHeading, areas],
    [DOCS_HEADING, documents],
    [SUPERSEDED_HEADING, superseded],
  ]) {
    const rebuilt = rebuildSection(text, heading, bullets);
    if (rebuilt !== null) text = rebuilt;
    else if (bullets.length > 0) {
      text = `${text.replace(/\n+$/, "")}\n\n${heading}\n\n${bullets.join("\n")}\n`;
    }
  }

  text = `${text.replace(/\n+$/, "")}\n`;

  if (text !== original) {
    if (checkOnly) stale.push(indexPath);
    else {
      writeFileSync(resolve(root, indexPath), text, "utf8");
      changed++;
      console.log(`rebuilt ${indexPath}`);
    }
  }
}

if (checkOnly && stale.length > 0) {
  console.error(
    `FAIL: ${stale.length} index/indexes no longer match the documents in`
      + ` their folder:\n${stale.map((s) => `  ${s}`).join("\n")}\n\n`
      + "Run `node .claude/tools/memory-index-build.mjs` to rebuild them.\n",
  );
  process.exit(1);
}

console.log(
  checkOnly
    ? `ALL PASS (${seen} indexes match the documents in their folder), FAIL: 0`
    : `Done: ${changed} of ${seen} indexes rebuilt.`,
);

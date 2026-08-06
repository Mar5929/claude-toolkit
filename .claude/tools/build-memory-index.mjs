#!/usr/bin/env node

/**
 * build-memory-index.mjs: rebuild `memory/index.md` from the files themselves.
 *
 * Why this exists: `specs/memory-system.md` says a session reads the index at
 * the start to see what the project already knows, and that nobody maintains
 * that list by hand. A hand-kept index was tried in an earlier version of this
 * system and failed: agents spent more time tending the list than using it.
 *
 * What it does: walks `specs/` and `memory/`, takes each file's H1 title and the
 * paragraph directly under it as the one-sentence summary, and writes one entry
 * per file grouped by folder. Every title and summary was already approved by
 * the user during the save, so the rebuilt index contains nothing the user has
 * not seen.
 *
 * It checks nothing and enforces nothing. The files win whenever the index
 * disagrees with them; the fix is to run this again.
 *
 * A file with no H1 title is listed by its file name, so it cannot go missing.
 * `memory/index.md` itself is left out, because a table of contents does not
 * list itself.
 *
 * The agent runs this as the last step of every save:
 *   node .claude/tools/build-memory-index.mjs
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUTPUT = "memory/index.md";
const ROOTS = ["specs", "memory"];
const WIDTH = 79;
const INDENT = "  ";

const posix = (path) => path.split(sep).join("/");
const read = (path) =>
  readFileSync(resolve(root, path), "utf8").replace(/\r\n/g, "\n");

/** Every Markdown file under a folder, deepest paths and all, sorted. */
function markdownFilesUnder(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(resolve(root, dir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const item of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    const path = `${dir}/${item.name}`;
    if (item.isDirectory()) markdownFilesUnder(path, out);
    else if (item.name.endsWith(".md")) out.push(path);
  }
  return out;
}

/**
 * The title and the one-sentence summary, which is what an entry is made of.
 * The YAML block at the top of a memory file is skipped, then the H1, then the
 * paragraph under it.
 */
function head(text) {
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (lines[i] !== undefined && lines[i].trim() === "---") {
    i++;
    while (i < lines.length && lines[i].trim() !== "---") i++;
    i++;
  }
  while (i < lines.length && lines[i].trim() === "") i++;
  const titleMatch = lines[i] ? lines[i].match(/^# (.+)$/) : null;
  if (!titleMatch) return { title: null, summary: null };
  i++;
  while (i < lines.length && lines[i].trim() === "") i++;
  const summary = [];
  while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("#")) {
    summary.push(lines[i].trim());
    i++;
  }
  return { title: titleMatch[1].trim(), summary: summary.join(" ") || null };
}

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

const byFolder = new Map();
let count = 0;

for (const dir of ROOTS) {
  for (const path of markdownFilesUnder(dir)) {
    if (path === OUTPUT) continue;
    const { title, summary } = head(read(path));
    const folder = posix(dirname(path));
    // Every link is written from where the index sits, which is `memory/`.
    const href = posix(relative("memory", path));
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder).push(...entry(href, title || path.split("/").pop(), summary));
    count++;
  }
}

const out = [
  "# What this project has written down",
  "",
  "Every file in `specs/` and `memory/`, with its one-sentence summary.",
  "`specs/` says what things must do. `memory/` says what is worth knowing.",
  "",
  "Built by `node .claude/tools/build-memory-index.mjs`. Nobody edits this file",
  "by hand. If it disagrees with the files, the files win: run that command",
  "again.",
];

for (const folder of [...byFolder.keys()].sort()) {
  out.push("", `## ${folder}/`, "", ...byFolder.get(folder));
}

out.push("");
writeFileSync(resolve(root, OUTPUT), out.join("\n"), "utf8");
console.log(`Wrote ${OUTPUT}: ${count} file(s) in ${byFolder.size} folder(s).`);

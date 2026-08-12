#!/usr/bin/env node

/**
 * Rebuild knowledge/index.md from knowledge/specs/ and knowledge/memory/.
 *
 * The source documents win. This script only produces a deterministic map. It
 * deliberately performs no schema validation and never reads brainstorms or
 * Obsidian state.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const installedRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const root = resolve(process.argv[2] || installedRoot);
const roots = ["specs", "memory"];
const excluded = new Set(["memory/tags.md"]);
const width = 79;

const posix = (value) => value.split(sep).join("/");

function markdownFilesUnder(vault, relativeDir, out = []) {
  let entries;
  try {
    entries = readdirSync(resolve(vault, relativeDir), { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    const path = posix(`${relativeDir}/${entry.name}`);
    if (entry.isDirectory()) markdownFilesUnder(vault, path, out);
    else if (entry.isFile() && entry.name.endsWith(".md") && !excluded.has(path)) {
      out.push(path);
    }
  }
  return out;
}

function documentHead(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let cursor = 0;

  while (cursor < lines.length && lines[cursor].trim() === "") cursor++;
  if (lines[cursor]?.trim() === "---") {
    cursor++;
    while (cursor < lines.length && lines[cursor].trim() !== "---") cursor++;
    if (cursor < lines.length) cursor++;
  }

  while (cursor < lines.length && lines[cursor].trim() === "") cursor++;
  const titleMatch = lines[cursor]?.match(/^#\s+(.+?)\s*$/);
  if (!titleMatch) return { title: null, summary: null };
  cursor++;

  while (cursor < lines.length && lines[cursor].trim() === "") cursor++;
  const summary = [];
  while (
    cursor < lines.length
    && lines[cursor].trim() !== ""
    && !/^#{1,6}\s/.test(lines[cursor])
  ) {
    summary.push(lines[cursor].trim());
    cursor++;
  }

  return { title: titleMatch[1].trim(), summary: summary.join(" ") || null };
}

function readableName(path) {
  return path
    .split("/")
    .pop()
    .replace(/\.md$/i, "")
    .split("-")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ") || path;
}

function wrapEntry(href, title, summary) {
  const first = `- [${title}](${href})${summary ? ":" : ""}`;
  if (!summary) return [first];

  const words = summary.split(/\s+/);
  const lines = [first];
  for (const word of words) {
    const index = lines.length - 1;
    const separator = lines[index] === first ? " " : " ";
    if (`${lines[index]}${separator}${word}`.length <= width) {
      lines[index] += `${separator}${word}`;
    } else {
      lines.push(`  ${word}`);
    }
  }
  return lines;
}

export function buildIndex(projectRoot = root) {
  const vault = resolve(projectRoot, "knowledge");
  const groups = new Map();
  let count = 0;

  for (const sourceRoot of roots) {
    for (const path of markdownFilesUnder(vault, sourceRoot)) {
      const absolute = resolve(vault, path);
      const text = readFileSync(absolute, "utf8");
      const { title, summary } = documentHead(text);
      const folder = posix(dirname(path));
      const href = posix(relative(vault, absolute));
      if (!groups.has(folder)) groups.set(folder, []);
      groups.get(folder).push(...wrapEntry(href, title || readableName(path), summary));
      count++;
    }
  }

  const lines = [
    "# What this project has written down",
    "",
    "Every current specification and memory, with its one-sentence summary.",
    "",
    "Built by `node .claude/tools/build-knowledge-index.mjs`. Nobody edits this file",
    "by hand. If it disagrees with the source files, rebuild it.",
  ];

  for (const folder of [...groups.keys()].sort()) {
    lines.push("", `## ${folder}/`, "", ...groups.get(folder));
  }
  lines.push("");

  writeFileSync(resolve(vault, "index.md"), lines.join("\n"), "utf8");
  return { count, folders: groups.size, output: resolve(vault, "index.md") };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = buildIndex(root);
    console.log(
      `Wrote ${posix(relative(root, result.output))}: ${result.count} file(s) in `
      + `${result.folders} folder(s).`,
    );
  } catch (error) {
    console.error(`Could not build knowledge/index.md: ${error.message}`);
    process.exitCode = 1;
  }
}

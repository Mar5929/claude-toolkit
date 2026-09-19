#!/usr/bin/env node

/**
 * Rebuild the two knowledge indexes:
 *
 *   knowledge/memory/memory-index.md
 *   knowledge/prds/spec-index.md
 *
 * One line per file, taken from that file's `summary` field, so the summary
 * lives in exactly one place and is copied nowhere. The source files always
 * win: this script only produces a deterministic list of what is there.
 *
 * `knowledge/prds/` also holds feature-area folders. In a folder named
 * `<area>/`, the file `<area>.md` is the parent PRD and every other Markdown
 * file beside it is a child PRD. The index prints the parent on its own line
 * and each child indented one level beneath it, so a reader sees the area and
 * its parts together. Every path printed is relative to the index file.
 *
 * It validates nothing. `check-knowledge.mjs` does that.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter } from "./frontmatter.mjs";

const installedRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const root = resolve(process.argv[2] || installedRoot);
const width = 79;

const posix = (value) => value.split(sep).join("/");
const byName = (a, b) => a.name.localeCompare(b.name);
const byKey = (a, b) => a.key.localeCompare(b.key);

const FOLDERS = [
  {
    dir: "memory",
    index: "memory-index.md",
    heading: "What this project knows",
    blurb: [
      "Every memory file, with the one sentence it uses to describe itself.",
      "",
      "A line marked superseded or retired does not answer questions about what is",
      "true now. Open it only for history.",
    ],
  },
  {
    dir: "prds",
    index: "spec-index.md",
    // A feature area may be a folder: knowledge/prds/<area>/<area>.md is the
    // parent PRD and the files beside it are its children.
    areaFolders: true,
    heading: "How this project is meant to work",
    blurb: [
      "Every PRD, with the one sentence it uses to describe itself.",
      "",
      "A PRD is one living document per feature area. Anything other than current",
      "is labelled in brackets after the filename. A line marked proposed is what",
      "we want built and is not true yet. A line marked superseded or retired",
      "describes how something used to work. Finalized and legacy current PRDs",
      "state settled requirements; memory does not override them.",
    ],
  },
];

/** The `summary` and `status` of one indexed file, plus how deep it is nested. */
function readEntry(vault, folder, path, depth) {
  const text = readFileSync(resolve(vault, folder.dir, path), "utf8");
  const { data } = parseFrontmatter(text);
  return {
    path,
    depth,
    summary: typeof data.summary === "string" ? data.summary.trim() : "",
    status: typeof data.status === "string" ? data.status.trim() : "",
  };
}

/** The Markdown files inside one feature-area folder, parent first. */
function readAreaFolder(vault, folder, area, warnings) {
  const entries = readdirSync(resolve(vault, folder.dir, area), { withFileTypes: true });
  const parentName = `${area}.md`;
  let parent = null;
  const children = [];

  for (const entry of [...entries].sort(byName)) {
    if (entry.isDirectory()) {
      warnings.push(
        `knowledge/${folder.dir}/${area}/${entry.name}/ is a folder inside a PRD`
        + " folder. A PRD folder is one level deep, so nothing inside it is"
        + " indexed.",
      );
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (entry.name === folder.index) continue;
    if (entry.name === parentName) {
      parent = readEntry(vault, folder, `${area}/${entry.name}`, 0);
      continue;
    }
    children.push({ key: entry.name, path: `${area}/${entry.name}` });
  }

  if (!parent) {
    warnings.push(
      `knowledge/${folder.dir}/${area}/ has no ${parentName}, so its files are`
      + " listed on their own. The parent PRD for a feature area folder is named"
      + " after the folder.",
    );
  }

  const childDepth = parent ? 1 : 0;
  return [
    ...(parent ? [parent] : []),
    ...[...children].sort(byKey).map((child) => readEntry(vault, folder, child.path, childDepth)),
  ];
}

/**
 * Everything one index lists, in a fixed order. Flat files and feature-area
 * folders are ordered together by name, and a folder's children follow their
 * parent. The same files always produce the same lines.
 */
function collect(vault, folder) {
  let entries;
  try {
    entries = readdirSync(resolve(vault, folder.dir), { withFileTypes: true });
  } catch {
    return { entries: [], warnings: [] };
  }

  const warnings = [];
  const units = [];
  for (const entry of [...entries].sort(byName)) {
    if (entry.isDirectory()) {
      if (!folder.areaFolders) {
        warnings.push(
          `knowledge/${folder.dir}/${entry.name}/ is a subfolder. This folder is`
          + " flat, so nothing inside it is indexed.",
        );
        continue;
      }
      units.push({ key: entry.name, area: entry.name });
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (entry.name === folder.index) continue;
    units.push({ key: entry.name, file: entry.name });
  }

  const collected = [];
  for (const unit of [...units].sort(byKey)) {
    if (unit.area) collected.push(...readAreaFolder(vault, folder, unit.area, warnings));
    else collected.push(readEntry(vault, folder, unit.file, 0));
  }
  return { entries: collected, warnings };
}

function wrapEntry(name, status, summary, depth = 0) {
  const indent = "  ".repeat(depth);
  const label = status && status !== "current" ? ` (${status})` : "";
  const head = `${indent}- \`${name}\`${label}:`;
  if (!summary) return [`${head} (no summary)`];

  const lines = [head];
  const hang = `${indent}  `;
  for (const word of summary.split(/\s+/)) {
    const last = lines.length - 1;
    if (`${lines[last]} ${word}`.length <= width) lines[last] += ` ${word}`;
    else lines.push(`${hang}${word}`);
  }
  return lines;
}

export function buildIndexes(projectRoot = root) {
  const vault = resolve(projectRoot, "knowledge");
  const written = [];
  const warnings = [];
  let total = 0;

  for (const folder of FOLDERS) {
    const collected = collect(vault, folder);
    warnings.push(...collected.warnings);

    const entries = [];
    for (const entry of collected.entries) {
      entries.push(...wrapEntry(entry.path, entry.status, entry.summary, entry.depth));
      total++;
    }

    const lines = [
      `# ${folder.heading}`,
      "",
      ...folder.blurb,
      "",
      "Built by `node .claude/tools/build-knowledge-index.mjs`. Nobody edits this",
      "file by hand. If it disagrees with the files on disk, the files win:",
      "rebuild it.",
      "",
    ];
    lines.push(...(entries.length ? entries : ["Nothing saved yet."]));
    lines.push("");

    const output = resolve(vault, folder.dir, folder.index);
    writeFileSync(output, lines.join("\n"), "utf8");
    written.push({ path: output, count: collected.entries.length });
  }

  return { written, warnings, total };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const result = buildIndexes(root);
    for (const { path, count } of result.written) {
      console.log(`Wrote ${posix(relative(root, path))}: ${count} file(s).`);
    }
    for (const warning of result.warnings) console.warn(`Warning: ${warning}`);
  } catch (error) {
    console.error(`Could not build the knowledge indexes: ${error.message}`);
    process.exitCode = 1;
  }
}

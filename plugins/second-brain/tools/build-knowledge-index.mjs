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
    heading: "How this project is meant to work",
    blurb: [
      "Every PRD, with the one sentence it uses to describe itself.",
      "",
      "A PRD is one living document per feature area. Anything other than current",
      "is labelled in brackets after the filename. A line marked proposed is what",
      "we want built and is not true yet. A line marked superseded or retired",
      "describes how something used to work. Only a current PRD is settled truth,",
      "and only a current PRD beats a memory.",
    ],
  },
];

/** Markdown files directly inside a knowledge folder, minus its own index. */
function filesIn(vault, folder) {
  let entries;
  try {
    entries = readdirSync(resolve(vault, folder.dir), { withFileTypes: true });
  } catch {
    return { files: [], subfolders: [] };
  }

  const files = [];
  const subfolders = [];
  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) {
      subfolders.push(entry.name);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (entry.name === folder.index) continue;
    files.push(entry.name);
  }
  return { files, subfolders };
}

function wrapEntry(name, status, summary) {
  const label = status && status !== "current" ? ` (${status})` : "";
  const head = `- \`${name}\`${label}:`;
  if (!summary) return [`${head} (no summary)`];

  const lines = [head];
  for (const word of summary.split(/\s+/)) {
    const last = lines.length - 1;
    if (`${lines[last]} ${word}`.length <= width) lines[last] += ` ${word}`;
    else lines.push(`  ${word}`);
  }
  return lines;
}

export function buildIndexes(projectRoot = root) {
  const vault = resolve(projectRoot, "knowledge");
  const written = [];
  const warnings = [];
  let total = 0;

  for (const folder of FOLDERS) {
    const { files, subfolders } = filesIn(vault, folder);

    for (const name of subfolders) {
      warnings.push(
        `knowledge/${folder.dir}/${name}/ is a subfolder. This folder is flat, so`
        + " nothing inside it is indexed.",
      );
    }

    const entries = [];
    for (const name of files) {
      const text = readFileSync(resolve(vault, folder.dir, name), "utf8");
      const { data } = parseFrontmatter(text);
      const summary = typeof data.summary === "string" ? data.summary.trim() : "";
      const status = typeof data.status === "string" ? data.status.trim() : "";
      entries.push(...wrapEntry(name, status, summary));
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
    written.push({ path: output, count: files.length });
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

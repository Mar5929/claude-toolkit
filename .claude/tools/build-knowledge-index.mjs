#!/usr/bin/env node

/**
 * Rebuild source-owned knowledge indexes. The managed manual selects schema 2:
 * grouped Markdown links for memory, PRDs and captured-source topic READMEs.
 * Unmigrated projects retain the legacy two-index layout. In `external`
 * memory mode it builds `prds/prd-index.md` and `ai-external-knowledge/README.md`
 * only: the memory service lists memory itself. No record body or
 * authority is changed. The checker validates records separately.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, lstatSync, realpathSync } from "node:fs";
import { dirname, relative, resolve, sep, basename } from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter, bodyTitle } from "./frontmatter.mjs";

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

/**
 * The project's memory mode, from `.toolkit-memory.json`. A copy of
 * `readMemoryConfig` in `hooks/knowledge-manual.mjs`: the tools are copied
 * into `.claude/tools/` on their own, so they do not import the hooks.
 * tests/knowledge-schema.test.mjs checks that both copies agree.
 */
export const MEMORY_CONFIG_PATH = ".toolkit-memory.json";
const MEMORY_SERVICES = ["mem0", "hindsight"];
export function readMemoryConfig(projectRoot) {
  const files = { mode: "files", service: null, server: null, project: null, error: null };
  if (!existsSync(resolve(projectRoot, MEMORY_CONFIG_PATH))) return files;
  const invalid = error => ({ ...files, error: `${MEMORY_CONFIG_PATH} ${error}` });
  const nonblank = value => typeof value === "string" && value.trim() !== "" && !/[\r\n]/.test(value);
  let data;
  try { data = JSON.parse(readFileSync(resolve(projectRoot, MEMORY_CONFIG_PATH), "utf8")); }
  catch { return invalid("could not be read as JSON. Fix it; files mode is used until then."); }
  if (!data || typeof data !== "object" || Array.isArray(data)) return invalid("must be a JSON object.");
  if (data.format !== 1) return invalid('needs "format": 1.');
  if (data.memory === "files") return files;
  if (data.memory !== "external") return invalid('needs "memory" set to "files" or "external".');
  if (!MEMORY_SERVICES.includes(data.service)) return invalid(`needs "service" set to ${MEMORY_SERVICES.map(x => `"${x}"`).join(" or ")} in external mode.`);
  if (!nonblank(data.server) || !/^[A-Za-z0-9_.-]+$/.test(data.server)) return invalid('needs "server" set to the MCP server name in external mode.');
  if (!nonblank(data.project)) return invalid('needs "project" set to the memory scope in external mode.');
  return { mode: "external", service: data.service, server: data.server.trim(), project: data.project.trim(), error: null };
}

export function buildIndexes(projectRoot = root) {
  const external = readMemoryConfig(projectRoot).mode === "external";
  if (external || knowledgeSchema(projectRoot) === 2) {
    const outputs = renderV2Indexes(projectRoot, external ? EXTERNAL_V2_INDEXES : V2_INDEXES);
    const problems = outputs.flatMap(output => output.problems);
    for (const output of outputs) {
      const info = lstatSync(output.path, { throwIfNoEntry: false });
      if (info && (info.isSymbolicLink() || !info.isFile())) problems.push(`${output.path} must be a regular file, not a symbolic link or directory.`);
    }
    if (problems.length) throw new Error(problems.join("\n"));
    for (const output of outputs) writeFileSync(output.path, output.content, "utf8");
    return { written: outputs.map(({ path, count }) => ({ path, count })), warnings: [], total: outputs.reduce((n, output) => n + output.count, 0) };
  }
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


/** Schema selection belongs to the managed manual, never inferred from folders. */
export function knowledgeSchema(projectRoot) {
  const manual = resolve(projectRoot, "knowledge/knowledge-manual.md");
  if (!existsSync(manual)) return 1;
  const text = readFileSync(manual, "utf8");
  const markers = text.match(/<!--\s*claude-toolkit:knowledge-schema:[^>]*-->/g) || [];
  if (markers.length > 1 || (markers.length && markers[0] !== "<!-- claude-toolkit:knowledge-schema:2 -->")) throw new Error("knowledge/knowledge-manual.md has an unknown or duplicate schema marker.");
  return markers.length ? 2 : 1;
}

const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
export const V2_INDEXES = [
  { source: "knowledge/memory/memory-entries", output: "knowledge/memory/memory-index.md", kind: "memory", title: "Memory index" },
  { source: "knowledge/prds", output: "knowledge/prds/prd-index.md", kind: "spec", title: "PRD index" },
  { source: "ai-external-knowledge", output: "ai-external-knowledge/README.md", kind: "external", title: "Outside documentation" },
];
/** External memory mode: the memory service lists its own records, so there
 * is no memory index. PRDs live in the top-level `prds/` folder. */
export const EXTERNAL_V2_INDEXES = [
  { source: "prds", output: "prds/prd-index.md", kind: "spec", title: "PRD index" },
  V2_INDEXES[2],
];

/** Inventory only real Markdown files; never follow links outside the project. */
export function collectV2(projectRoot, folder) {
  const entries = [], problems = [];
  const walk = (dir, depth = 0, parent = null) => {
    const absolute = resolve(projectRoot, dir);
    if (!existsSync(absolute)) { problems.push(`${dir}/ is missing.`); return; }
    if (lstatSync(absolute).isSymbolicLink()) { problems.push(`${dir}/ is a symbolic link; inspect its owner before indexing.`); return; }
    const children = readdirSync(absolute, { withFileTypes: true }).sort((a, b) => compare(a.name, b.name));
    if (folder.kind === "spec" && depth === 1 && !children.some(x => x.isFile() && x.name === `${basename(dir)}.md`)) {
      problems.push(`${dir}/ needs its parent PRD ${basename(dir)}.md.`);
    }
    if (folder.kind === "external" && depth === 1 && !children.some(x => x.isFile() && x.name === "README.md")) {
      problems.push(`${dir}/ needs a topic README.md with source metadata.`);
    }
    for (const child of children) {
      const path = `${dir}/${child.name}`;
      if (child.isSymbolicLink()) { problems.push(`${path} is a symbolic link; inspect it before indexing.`); continue; }
      if (child.isDirectory()) {
        if (folder.kind === "external" && depth > 0) continue; // Captured pages are owned by their topic README.
        if (folder.kind !== "external" && depth > 0) { problems.push(`${path}/ is deeper than a topic folder.`); continue; }
        walk(path, depth + 1, folder.kind === "spec" ? `${path}/${child.name}.md` : null);
        continue;
      }
      if (!child.isFile() || !child.name.endsWith(".md")) continue;
      if (folder.kind === "external" && (depth !== 1 || child.name !== "README.md")) continue;
      if (folder.kind === "memory" && path === `${folder.source}/terminology-glossary.md`) continue;
      if (path === folder.output || path === "knowledge/prds/spec-index.md") continue;
      const text = readFileSync(resolve(projectRoot, path), "utf8");
      const parsed = parseFrontmatter(text);
      if (!parsed.hasFrontmatter) problems.push(`${path} has no readable frontmatter.`);
      problems.push(...parsed.errors.map(error => `${path}: ${error}`));
      for (const field of ["summary", "group"]) {
        if (typeof parsed.data[field] !== "string" || !parsed.data[field].trim() || /[\r\n]/.test(parsed.data[field])) problems.push(`${path} needs a nonblank single-line ${field}.`);
      }
      if (typeof parsed.data.summary === "string" && [...parsed.data.summary].length >= 200) problems.push(`${path} summary must be under 200 characters.`);
      entries.push({ path, parent: path === parent ? null : parent, text, ...parsed });
    }
  };
  walk(folder.source);
  return { entries, problems };
}

const labelText = value => value.replace(/\\/g, "\\\\").replace(/[\[\]]/g, "\\$&");
const linkPath = value => value.split("/").map(encodeURIComponent).join("/");

/** Pure renderer used by both the writer and the read-only stale-index check. */
export function renderV2Indexes(projectRoot, folders = V2_INDEXES) {
  return folders.map(folder => {
    const { entries, problems } = collectV2(projectRoot, folder);
    const byPath = new Map(entries.map(entry => [entry.path, entry]));
    const groups = new Map();
    for (const entry of entries) {
      const parent = entry.parent && byPath.get(entry.parent);
      if (parent && parent.data.group !== entry.data.group) problems.push(`${entry.path} must share its parent PRD's group to remain under that parent.`);
      const group = typeof entry.data.group === "string" && entry.data.group.trim() && !/[\r\n]/.test(entry.data.group) ? entry.data.group : "Missing group";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(entry);
    }
    const lines = [`# ${folder.title}`, ""];
    for (const group of [...groups.keys()].sort((a, b) => compare(a.trim().toLowerCase(), b.trim().toLowerCase()) || compare(a, b))) {
      lines.push(`## ${group}`, "");
      const sorted = groups.get(group).sort((a, b) => compare(a.parent || a.path, b.parent || b.path) || Number(Boolean(a.parent)) - Number(Boolean(b.parent)) || compare(a.path, b.path));
      for (const entry of sorted) {
        const title = bodyTitle(entry.body) || basename(entry.path, ".md");
        const status = entry.data.status;
        const label = folder.kind !== "external" && status && status !== (folder.kind === "memory" ? "current" : "finalized") ? ` (${status})` : "";
        const href = linkPath(posix(relative(dirname(resolve(projectRoot, folder.output)), resolve(projectRoot, entry.path))));
        lines.push(`${entry.parent ? "  " : ""}- [${labelText(title)}](${href})${label}: ${entry.data.summary || ""}`);
      }
      lines.push("");
    }
    return { path: resolve(projectRoot, folder.output), content: lines.join("\n"), count: entries.length, problems };
  });
}

if (process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(process.argv[1]))) {
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

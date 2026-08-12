#!/usr/bin/env node

/**
 * Read-only project-knowledge health report.
 *
 * Markdown and Git remain authoritative. This tool inventories the fixed
 * memory properties, approved project tags, provenance paths, and replacement
 * links. It reports concrete mechanical risks and never edits a file.
 */

import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import {
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED_PROPERTIES = new Set([
  "source",
  "source-file",
  "date",
  "session",
  "tags",
  "superseded-by",
]);

const REQUIRED_PROPERTIES = ["source", "date", "session", "tags"];

const ALLOWED_SOURCES = new Set([
  "owner-quote",
  "owner-paraphrase",
  "read-from-file",
  "agent-observed",
  "agent-conclusion-unchecked",
]);

const RETIRED_SOURCES = new Map([
  ["user-said-it", "Choose owner-quote for verbatim words or owner-paraphrase otherwise."],
  ["agent-saw-it-happen", "Use agent-observed."],
  ["agent-guess-unchecked", "Use agent-conclusion-unchecked."],
]);

const SESSION_PLACEHOLDERS = new Set([
  "current-session",
  "current",
  "unknown",
  "none",
  "n/a",
  "test",
  "review_required",
]);

function normalizeText(text) {
  return text.replace(/\r\n/g, "\n");
}

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2
    && ((trimmed.startsWith('"') && trimmed.endsWith('"'))
      || (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) return trimmed.slice(1, -1);
  return trimmed;
}

function parseInlineList(value) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return [];
  return inner.split(",").map((item) => stripQuotes(item)).filter(Boolean);
}

export function parseFrontmatter(text) {
  const normalized = normalizeText(text);
  if (!normalized.startsWith("---\n")) {
    return { properties: {}, types: {}, problems: ["missing YAML frontmatter"] };
  }

  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) {
    return { properties: {}, types: {}, problems: ["YAML frontmatter is not closed"] };
  }

  const lines = normalized.slice(4, end).split("\n");
  const properties = {};
  const types = {};
  const problems = [];
  let activeList = null;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!line.trim() || line.trimStart().startsWith("#")) continue;

    const listItem = line.match(/^\s+-\s+(.+)$/);
    if (listItem && activeList) {
      properties[activeList].push(stripQuotes(listItem[1]));
      continue;
    }

    activeList = null;
    const match = line.match(/^([A-Za-z0-9-]+):(?:\s*(.*))?$/);
    if (!match) {
      problems.push(`could not read frontmatter line ${index + 2}`);
      continue;
    }

    const [, key, raw = ""] = match;
    if (Object.hasOwn(properties, key)) {
      problems.push(`property ${key} appears more than once`);
      continue;
    }

    if (!raw.trim()) {
      properties[key] = [];
      types[key] = "list";
      activeList = key;
      continue;
    }

    const list = parseInlineList(raw);
    if (list !== null) {
      properties[key] = list;
      types[key] = "list";
    } else {
      properties[key] = stripQuotes(raw);
      types[key] = "scalar";
    }
  }

  return { properties, types, problems };
}

function markdownFiles(root) {
  if (!existsSync(root)) return [];
  const files = [];

  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const path = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && entry.name.endsWith(".md")) files.push(path);
    }
  }

  walk(root);
  return files;
}

function parseApprovedTags(text) {
  const tags = new Map();
  const duplicates = [];
  const lines = normalizeText(text).split("\n");

  function add(name, meaning) {
    if (tags.has(name)) duplicates.push(name);
    else tags.set(name, meaning);
  }

  for (const line of lines) {
    const table = line.match(/^\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|\s*$/);
    if (table) {
      add(table[1], table[2]);
      continue;
    }

    const bullet = line.match(/^[-*]\s+`?([^`\s]+)`?(?:\s*:\s*(.*))?$/u);
    if (bullet) add(bullet[1], bullet[2] || "");
  }

  return { tags, duplicates };
}

function tagKey(tag) {
  return tag.toLowerCase().replace(/[\s_-]+/g, "");
}

function singularTagKey(tag) {
  const key = tagKey(tag);
  if (key.endsWith("ies") && key.length > 4) return `${key.slice(0, -3)}y`;
  if (key.endsWith("s") && !key.endsWith("ss") && key.length > 3) return key.slice(0, -1);
  return key;
}

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function validTagName(value) {
  return typeof value === "string"
    && /^(?=.*[\p{L}_/-])[\p{L}\p{N}_/-]+$/u.test(value);
}

function insideRoot(root, path) {
  const rel = relative(root, path);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function repositoryPath(root, file) {
  return relative(root, file).split(sep).join("/");
}

function warning(code, path, message, repair) {
  return { code, path, message, repair };
}

function claimSourceMarkers(text) {
  const markers = [];
  let fence = null;
  normalizeText(text).split("\n").forEach((line, index) => {
    const fenceMatch = line.match(/^\s*(```|~~~)/);
    if (fenceMatch) {
      fence = fence === fenceMatch[1] ? null : (fence || fenceMatch[1]);
      return;
    }
    if (fence) return;
    const match = line.match(/^>\s*Claim source:\s*([^;]+);\s*(.+?)\s*$/i);
    if (match) markers.push({ source: match[1].trim(), trace: match[2].trim(), line: index + 1 });
  });
  return markers;
}

function validateMemory(root, file, approvedTags) {
  const path = repositoryPath(root, file);
  const text = readFileSync(file, "utf8");
  const parsed = parseFrontmatter(text);
  const { properties, types } = parsed;
  const warnings = parsed.problems.map((problem) => warning(
    "frontmatter-malformed",
    path,
    problem,
    "Repair the YAML through the normal owner-approved save flow.",
  ));

  for (const key of Object.keys(properties)) {
    if (!ALLOWED_PROPERTIES.has(key)) {
      warnings.push(warning(
        "property-not-allowed",
        path,
        `property ${key} is not in the approved vocabulary`,
        `Remove ${key} or approve a change to the project-knowledge specification first.`,
      ));
    }
    if (key !== "tags" && ALLOWED_PROPERTIES.has(key) && types[key] !== "scalar") {
      warnings.push(warning(
        "property-type-invalid",
        path,
        `property ${key} must be one text value`,
        `Replace ${key} with one honest text value through the owner-approved save flow.`,
      ));
    }
    if (
      (key === "source-file" || key === "superseded-by")
      && types[key] === "scalar"
      && properties[key] === ""
    ) {
      warnings.push(warning(
        "property-empty",
        path,
        `optional property ${key} is present but empty`,
        `Remove ${key} or provide its exact value through the owner-approved save flow.`,
      ));
    }
  }

  for (const key of REQUIRED_PROPERTIES) {
    if (!Object.hasOwn(properties, key) || properties[key] === "" || properties[key].length === 0) {
      warnings.push(warning(
        "property-missing",
        path,
        `required property ${key} is missing`,
        `Propose an honest ${key} value through the normal owner-approved save flow.`,
      ));
    }
  }

  const source = typeof properties.source === "string" ? properties.source : "";
  if (source && !ALLOWED_SOURCES.has(source)) {
    if (RETIRED_SOURCES.has(source)) {
      warnings.push(warning(
        "source-retired",
        path,
        `source value ${source} is retired`,
        RETIRED_SOURCES.get(source),
      ));
    } else {
      warnings.push(warning(
        "source-invalid",
        path,
        `source value ${source} is not approved`,
        "Choose one approved source value and show the exact change to the owner.",
      ));
    }
  }
  if (source === "agent-conclusion-unchecked") {
    warnings.push(warning(
      "source-unchecked",
      path,
      "agent conclusion is explicitly unchecked and must not be repeated as truth",
      "Verify it against an authoritative source, ask the owner, or remove it with approval.",
    ));
  }

  const sourceFile = typeof properties["source-file"] === "string"
    ? properties["source-file"]
    : "";
  if (source === "read-from-file" && !sourceFile) {
    warnings.push(warning(
      "source-file-missing",
      path,
      "read-from-file has no source-file",
      "Add the exact repository path that supports the memory.",
    ));
  }
  if (source !== "read-from-file" && sourceFile) {
    warnings.push(warning(
      "source-file-unexpected",
      path,
      `source-file is present for ${source || "a missing source"}`,
      "Remove source-file or correct source to read-from-file with owner approval.",
    ));
  }
  if (sourceFile) {
    const sourcePath = resolve(root, sourceFile);
    if (isAbsolute(sourceFile) || !insideRoot(root, sourcePath)) {
      warnings.push(warning(
        "source-file-outside-project",
        path,
        `source-file does not name a repository-relative path: ${sourceFile}`,
        "Use the exact path inside this repository.",
      ));
    } else if (!existsSync(sourcePath)) {
      warnings.push(warning(
        "source-file-broken",
        path,
        `source-file does not exist: ${sourceFile}`,
        "Repair the path or replace the unsupported claim with owner approval.",
      ));
    } else if (!statSync(sourcePath).isFile()) {
      warnings.push(warning(
        "source-file-invalid",
        path,
        `source-file does not resolve to a file: ${sourceFile}`,
        "Use the exact repository file that supports the claim.",
      ));
    } else if (!insideRoot(realpathSync(root), realpathSync(sourcePath))) {
      warnings.push(warning(
        "source-file-outside-project",
        path,
        `source-file resolves outside the repository: ${sourceFile}`,
        "Use a source file that remains inside this repository.",
      ));
    }
  }

  const claimSources = claimSourceMarkers(text);
  for (const claim of claimSources) {
    if (!ALLOWED_SOURCES.has(claim.source)) {
      warnings.push(warning(
        "claim-source-invalid",
        path,
        `claim source on line ${claim.line} is not approved: ${claim.source}`,
        "Use one approved source value and a retrievable trace.",
      ));
      continue;
    }
    if (claim.source === "agent-conclusion-unchecked") {
      warnings.push(warning(
        "claim-source-unchecked",
        path,
        `claim on line ${claim.line} is an unchecked agent conclusion`,
        "Verify, ask the owner, or remove the claim with approval.",
      ));
    }
    if (claim.source === "read-from-file") {
      const claimPath = resolve(root, claim.trace);
      if (isAbsolute(claim.trace) || !insideRoot(root, claimPath)) {
        warnings.push(warning(
          "claim-source-file-outside-project",
          path,
          `claim source on line ${claim.line} is not a repository-relative path: ${claim.trace}`,
          "Use the exact supporting repository file.",
        ));
      } else if (!existsSync(claimPath)) {
        warnings.push(warning(
          "claim-source-file-broken",
          path,
          `claim source on line ${claim.line} does not exist: ${claim.trace}`,
          "Repair the path or replace the unsupported claim with approval.",
        ));
      } else if (!statSync(claimPath).isFile()
        || !insideRoot(realpathSync(root), realpathSync(claimPath))) {
        warnings.push(warning(
          "claim-source-file-invalid",
          path,
          `claim source on line ${claim.line} does not resolve to a repository file: ${claim.trace}`,
          "Use the exact supporting repository file.",
        ));
      }
    }
  }

  const date = typeof properties.date === "string" ? properties.date : "";
  if (date && !isRealDate(date)) {
    warnings.push(warning(
      "date-invalid",
      path,
      `date is not YYYY-MM-DD: ${date}`,
      "Use the date of the last owner-approved change.",
    ));
  }

  const session = typeof properties.session === "string" ? properties.session : "";
  if (session && SESSION_PLACEHOLDERS.has(session.toLowerCase())) {
    warnings.push(warning(
      "session-placeholder",
      path,
      `session is not retrievable and does not say it is unavailable: ${session}`,
      "Use a retrievable session reference, or use unavailable when none remains.",
    ));
  }

  const tags = Array.isArray(properties.tags) ? properties.tags : [];
  if (Object.hasOwn(properties, "tags") && types.tags !== "list") {
    warnings.push(warning(
      "tags-not-list",
      path,
      "tags is not a YAML list",
      "Use an Obsidian-compatible YAML list with one to three approved tags.",
    ));
  }
  if (tags.length > 3) {
    warnings.push(warning(
      "too-many-tags",
      path,
      `memory has ${tags.length} tags; the limit is 3`,
      "Keep the one to three project subjects that best help retrieval.",
    ));
  }
  if (new Set(tags).size !== tags.length) {
    warnings.push(warning(
      "tag-repeated",
      path,
      "the same tag appears more than once",
      "Keep each approved tag once.",
    ));
  }
  for (const tag of tags) {
    if (!validTagName(tag)) {
      warnings.push(warning(
        "tag-invalid",
        path,
        `tag is not an Obsidian-safe subject: ${tag}`,
        "Use letters, numbers, underscores, hyphens, or forward slashes, with at least one non-number.",
      ));
    }
    if (!approvedTags.has(tag)) {
      warnings.push(warning(
        "tag-not-approved",
        path,
        `tag is not in the project vocabulary: ${tag}`,
        "Reuse an approved tag or approve this tag and its meaning in the same save.",
      ));
    }
  }

  const supersededBy = typeof properties["superseded-by"] === "string"
    ? properties["superseded-by"]
    : "";
  if (supersededBy) {
    const replacement = resolve(dirname(file), supersededBy);
    if (!insideRoot(root, replacement) || !existsSync(replacement)) {
      warnings.push(warning(
        "superseded-by-broken",
        path,
        `superseded-by does not reach an existing project file: ${supersededBy}`,
        "Repair the relative path or choose the current canonical file with owner approval.",
      ));
    } else if (!statSync(replacement).isFile()) {
      warnings.push(warning(
        "superseded-by-invalid",
        path,
        `superseded-by names a directory, not a memory file: ${supersededBy}`,
        "Choose the exact current memory file with owner approval.",
      ));
    } else if (!insideRoot(realpathSync(root), realpathSync(replacement))) {
      warnings.push(warning(
        "superseded-by-broken",
        path,
        `superseded-by resolves outside the repository: ${supersededBy}`,
        "Choose a current memory that remains inside this repository.",
      ));
    }
  }

  return {
    path,
    properties: {
      source: source || null,
      sourceFile: sourceFile || null,
      date: date || null,
      session: session || null,
      tags,
      supersededBy: supersededBy || null,
      claimSources,
    },
    warnings,
  };
}

function overlappingTags(tags) {
  const overlaps = [];
  for (let left = 0; left < tags.length; left++) {
    for (let right = left + 1; right < tags.length; right++) {
      const a = tags[left];
      const b = tags[right];
      if (tagKey(a) === tagKey(b) || singularTagKey(a) === singularTagKey(b)) {
        overlaps.push([a, b]);
      }
    }
  }
  return overlaps;
}

export function inspectKnowledge(projectRoot = process.cwd()) {
  const root = resolve(projectRoot);
  const memoryRoot = resolve(root, "knowledge/memory");
  const specificationRoot = resolve(root, "knowledge/specs");
  const tagPath = resolve(memoryRoot, "tags.md");
  const topWarnings = [];

  if (!existsSync(memoryRoot)) {
    return {
      projectRoot: root,
      memories: [],
      tags: [],
      unusedTags: [],
      overlappingTags: [],
      warnings: [warning(
        "memory-root-missing",
        "knowledge/memory",
        "memory root is missing",
        "Run the project-knowledge setup or sync flow before saving memory.",
      )],
    };
  }

  let approvedTags = new Map();
  if (!existsSync(tagPath)) {
    topWarnings.push(warning(
      "tag-vocabulary-missing",
      "knowledge/memory/tags.md",
      "the approved project tag vocabulary is missing",
      "Restore the project-specific tag file before approving new memory tags.",
    ));
  } else {
    const parsedTags = parseApprovedTags(readFileSync(tagPath, "utf8"));
    approvedTags = parsedTags.tags;
    for (const tag of parsedTags.duplicates) {
      topWarnings.push(warning(
        "tag-definition-repeated",
        "knowledge/memory/tags.md",
        `approved tag is defined more than once: ${tag}`,
        "Keep one approved definition after the owner chooses the current meaning.",
      ));
    }
    for (const [tag, meaning] of approvedTags) {
      if (!validTagName(tag)) {
        topWarnings.push(warning(
          "tag-definition-invalid",
          "knowledge/memory/tags.md",
          `approved tag is not an Obsidian-safe subject: ${tag}`,
          "Use letters, numbers, underscores, hyphens, or forward slashes, with at least one non-number.",
        ));
      }
      if (!meaning) {
        topWarnings.push(warning(
          "tag-definition-missing",
          "knowledge/memory/tags.md",
          `approved tag has no plain-language meaning: ${tag}`,
          "Add the owner-approved meaning without changing the tag's scope.",
        ));
      }
    }
    if (approvedTags.size > 20) {
      topWarnings.push(warning(
        "tag-vocabulary-long",
        "knowledge/memory/tags.md",
        `approved tag vocabulary has ${approvedTags.size} tags`,
        "Run a full health review for unused and overlapping tags. Do not prune them silently.",
      ));
    }
  }

  const memories = markdownFiles(memoryRoot)
    .filter((file) => resolve(file) !== tagPath)
    .map((file) => validateMemory(root, file, approvedTags));

  const memoryByPath = new Map(memories.map((memory) => [memory.path, memory]));
  const replacementByPath = new Map();
  for (const memory of memories) {
    if (!memory.properties.supersededBy) continue;
    const absolute = resolve(root, memory.path);
    const target = repositoryPath(
      root,
      resolve(dirname(absolute), memory.properties.supersededBy),
    );
    replacementByPath.set(memory.path, target);
    if (target === memory.path) {
      memory.warnings.push(warning(
        "superseded-by-self",
        memory.path,
        "superseded-by points back to the same memory",
        "Choose the separate current canonical memory or remove the history marker with approval.",
      ));
    }
  }

  for (const memory of memories) {
    const seen = new Set([memory.path]);
    let cursor = replacementByPath.get(memory.path);
    while (cursor && memoryByPath.has(cursor)) {
      if (seen.has(cursor)) {
        memory.warnings.push(warning(
          "superseded-by-cycle",
          memory.path,
          "superseded-by links form a cycle",
          "Choose one current canonical memory and repair the history links with approval.",
        ));
        break;
      }
      seen.add(cursor);
      cursor = replacementByPath.get(cursor);
    }
  }

  const specifications = markdownFiles(specificationRoot).map((file) => {
    const path = repositoryPath(root, file);
    const hasFrontmatter = normalizeText(readFileSync(file, "utf8")).startsWith("---\n");
    const warnings = hasFrontmatter
      ? [warning(
        "specification-has-frontmatter",
        path,
        "specification has YAML frontmatter even though owner-approved behavior uses plain Markdown",
        "Remove the memory properties through the normal owner-approved specification change.",
      )]
      : [];
    return { path, warnings };
  });

  const counts = new Map([...approvedTags.keys()].map((tag) => [tag, 0]));
  const historyCounts = new Map([...approvedTags.keys()].map((tag) => [tag, 0]));
  for (const memory of memories) {
    for (const tag of new Set(memory.properties.tags)) {
      if (!counts.has(tag)) counts.set(tag, 0);
      if (!historyCounts.has(tag)) historyCounts.set(tag, 0);
      const target = memory.properties.supersededBy ? historyCounts : counts;
      target.set(tag, (target.get(tag) || 0) + 1);
    }
  }

  const tags = [...counts]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({
      name,
      count,
      historyCount: historyCounts.get(name) || 0,
      meaning: approvedTags.get(name) || "",
      approved: approvedTags.has(name),
    }));
  const observedTags = memories.flatMap((memory) => memory.properties.tags);
  const overlaps = overlappingTags([...new Set([...approvedTags.keys(), ...observedTags])].sort());
  for (const [a, b] of overlaps) {
    topWarnings.push(warning(
      "tags-overlap",
      "knowledge/memory/tags.md",
      `tags may overlap: ${a} and ${b}`,
      "Choose one project term or document why both are needed, with owner approval.",
    ));
  }

  const warnings = [
    ...topWarnings,
    ...specifications.flatMap((specification) => specification.warnings),
    ...memories.flatMap((memory) => memory.warnings),
  ];

  return {
    projectRoot: root,
    summary: {
      memories: memories.length,
      specifications: specifications.length,
      approvedTags: approvedTags.size,
      warnings: warnings.length,
    },
    memories,
    specifications,
    tags,
    unusedTags: tags
      .filter((tag) => tag.approved && tag.count === 0 && tag.historyCount === 0)
      .map((tag) => tag.name),
    overlappingTags: overlaps,
    warnings,
  };
}

export function formatHealthReport(report) {
  const lines = [
    "# Project knowledge health",
    "",
    `${report.summary?.memories ?? 0} memories, ${report.summary?.approvedTags ?? 0} approved tags, ${report.warnings.length} warnings.`,
    "",
    "## Tag vocabulary",
    "",
  ];

  if (report.tags.length === 0) lines.push("No approved tags yet.");
  else {
    for (const tag of report.tags) {
      const approval = tag.approved ? "" : " (not approved)";
      const meaning = tag.meaning ? `: ${tag.meaning}` : "";
      const history = tag.historyCount ? `, ${tag.historyCount} retained history` : "";
      const unit = tag.count === 1 ? "memory" : "memories";
      lines.push(`- ${tag.name}: ${tag.count} current ${unit}${history}${approval}${meaning}`);
    }
  }

  lines.push("", "## Warnings", "");
  if (report.warnings.length === 0) lines.push("No mechanical warnings found.");
  else {
    for (const item of report.warnings) {
      lines.push(`- ${item.path}: ${item.message}. Repair: ${item.repair}`);
    }
  }

  lines.push(
    "",
    "This read-only report checks fields, tags, and provenance paths. An agent still reviews meaning for stale, repeated, conflicting, or misplaced knowledge.",
    "",
  );
  return lines.join("\n");
}

export function formatTagReport(report) {
  const lines = [
    "# Project knowledge tags",
    "",
    `${report.tags.length} tags are used or approved for this project.`,
    "",
  ];
  if (report.tags.length === 0) lines.push("No approved tags yet.");
  else {
    for (const tag of report.tags) {
      const approval = tag.approved ? "" : " (not approved)";
      const meaning = tag.meaning ? `: ${tag.meaning}` : "";
      const history = tag.historyCount ? `, ${tag.historyCount} retained history` : "";
      const unit = tag.count === 1 ? "memory" : "memories";
      lines.push(`- ${tag.name}: ${tag.count} current ${unit}${history}${approval}${meaning}`);
    }
  }
  if (report.overlappingTags.length > 0) {
    lines.push("", "Possible overlaps:");
    for (const [left, right] of report.overlappingTags) lines.push(`- ${left} and ${right}`);
  }
  lines.push("");
  return lines.join("\n");
}

export function formatPropertyReport(report) {
  const lines = ["# Project knowledge properties", ""];
  if (report.memories.length === 0) lines.push("No memories found.");
  for (const memory of report.memories) {
    const values = memory.properties;
    lines.push(
      `## ${memory.path}`,
      "",
      `- source: ${values.source ?? "missing"}`,
      `- source-file: ${values.sourceFile ?? "not used"}`,
      `- date: ${values.date ?? "missing"}`,
      `- session: ${values.session ?? "missing"}`,
      `- tags: ${values.tags.length > 0 ? values.tags.join(", ") : "missing"}`,
      `- superseded-by: ${values.supersededBy ?? "not used"}`,
      `- claim sources: ${values.claimSources.length}`,
      "",
    );
  }
  return lines.join("\n");
}

export function formatProvenanceReport(report) {
  const lines = ["# Project knowledge provenance", ""];
  if (report.memories.length === 0) lines.push("No memories found.");
  for (const memory of report.memories) {
    const values = memory.properties;
    const sourceFile = values.sourceFile ? `, file ${values.sourceFile}` : "";
    lines.push(
      `- ${memory.path}: ${values.source ?? "missing source"}${sourceFile}, session ${values.session ?? "missing"}`,
    );
    for (const claim of values.claimSources) {
      lines.push(`  - line ${claim.line}: ${claim.source}; ${claim.trace}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

export function formatView(report, view = "health") {
  if (view === "tags") return formatTagReport(report);
  if (view === "properties") return formatPropertyReport(report);
  if (view === "provenance") return formatProvenanceReport(report);
  return formatHealthReport(report);
}

export function focusHealthReport(report, focus) {
  if (!focus) return report;
  const path = repositoryPath(report.projectRoot, resolve(report.projectRoot, focus));
  const memories = report.memories.filter((memory) => memory.path === path);
  const specifications = report.specifications.filter((specification) => specification.path === path);
  const focusTags = new Set(memories.flatMap((memory) => memory.properties.tags));
  const referringPaths = new Set(report.memories.filter((memory) => {
    const values = memory.properties;
    const replacement = values.supersededBy
      ? repositoryPath(
        report.projectRoot,
        resolve(report.projectRoot, dirname(memory.path), values.supersededBy),
      )
      : null;
    const sourceFile = values.sourceFile
      ? repositoryPath(report.projectRoot, resolve(report.projectRoot, values.sourceFile))
      : null;
    return sourceFile === path
      || replacement === path
      || values.claimSources.some((claim) => (
        claim.source === "read-from-file"
          && repositoryPath(report.projectRoot, resolve(report.projectRoot, claim.trace)) === path
      ));
  }).map((memory) => memory.path));
  const warnings = report.warnings.filter((item) => (
    item.path === path
    || referringPaths.has(item.path)
    || (item.code === "tags-overlap"
      && [...focusTags].some((tag) => item.message.includes(tag)))
  ));
  return {
    ...report,
    focus: path,
    summary: { ...report.summary, warnings: warnings.length },
    memories,
    specifications,
    warnings,
  };
}

function jsonView(report, view) {
  const common = {
    schemaVersion: 1,
    view,
    projectRoot: report.projectRoot,
    focus: report.focus ?? null,
  };
  if (view === "tags") {
    return {
      ...common,
      tags: report.tags,
      unusedTags: report.unusedTags,
      overlappingTags: report.overlappingTags,
      warnings: report.warnings.filter((item) => item.code.startsWith("tag")),
    };
  }
  if (view === "properties") {
    return {
      ...common,
      memories: report.memories,
      specifications: report.specifications,
      warnings: report.warnings.filter((item) => (
        item.code.includes("property")
        || item.code.startsWith("frontmatter")
        || item.code === "specification-has-frontmatter"
      )),
    };
  }
  if (view === "provenance") {
    return {
      ...common,
      memories: report.memories.map((memory) => ({
        path: memory.path,
        source: memory.properties.source,
        sourceFile: memory.properties.sourceFile,
        session: memory.properties.session,
        supersededBy: memory.properties.supersededBy,
        claimSources: memory.properties.claimSources,
      })),
      warnings: report.warnings.filter((item) => (
        item.code.startsWith("source")
        || item.code.startsWith("claim-source")
        || item.code.startsWith("session")
        || item.code.startsWith("superseded")
      )),
    };
  }
  return { ...common, ...report };
}

function parseArguments(argv) {
  const args = argv.slice(2);
  const json = args.includes("--json");
  const focusIndex = args.indexOf("--focus");
  const focus = focusIndex >= 0 ? args[focusIndex + 1] : null;
  const values = args.filter((arg, index) => (
    !arg.startsWith("--")
    && (focusIndex < 0 || index !== focusIndex + 1)
  ));
  const views = new Set(["health", "tags", "properties", "provenance"]);
  const view = views.has(values[0]) ? values.shift() : "health";
  const root = values[0] || process.cwd();
  return { root, json, view, focus };
}

function main() {
  const { root, json, view, focus } = parseArguments(process.argv);
  const report = focusHealthReport(inspectKnowledge(root), focus);
  const selected = json ? jsonView(report, view) : formatView(report, view);
  process.stdout.write(json ? `${JSON.stringify(selected, null, 2)}\n` : selected);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    main();
  } catch (error) {
    console.error(`Knowledge health review failed: ${error.message}`);
    process.exitCode = 1;
  }
}

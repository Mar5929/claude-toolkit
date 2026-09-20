#!/usr/bin/env node

/**
 * Check the knowledge folder for anything malformed or unsafe.
 *
 * `knowledge/memory/` is flat. `knowledge/prds/` may also hold a feature-area
 * folder: `<area>/<area>.md` is the parent PRD and every other Markdown file
 * beside it is a child PRD, checked against the same field rules. A folder
 * inside a feature-area folder is a problem, because a PRD folder is one level
 * deep.
 *
 * Read-only. It never edits, moves, or deletes a file. It exists so a save can
 * be verified instead of assumed, and so the one rule that cannot be left to an
 * agent's good intentions, no secrets in Git, is enforced by code.
 *
 * Exit code 0 means every file is well formed. Exit code 1 means at least one
 * problem, each printed in plain English with its file and the reason.
 *
 * Usage:
 *   node check-knowledge.mjs [project-root]
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, existsSync, lstatSync } from "node:fs";
import { dirname, relative, resolve, sep, basename } from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter } from "./frontmatter.mjs";
import { knowledgeSchema, collectV2, renderV2Indexes, V2_INDEXES } from "./build-knowledge-index.mjs";

const installedRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const root = resolve(process.argv[2] || installedRoot);

const posix = (value) => value.split(sep).join("/");

const CURRENT_MD_MAX_CHARS = 2000;
const SELF_IMPROVEMENT_MAX_CHARS = 8000;
const SUMMARY_MAX_CHARS = 250;
export const MANUAL_SHA256 = "33f9817a96e0c3a436189dea75a6c0bb4b357cd73e0fac39840bdcf089e75cd0";

const STATUS_VALUES = ["current", "superseded", "retired"];
// Finalized records approved requirements, not proof of delivery.
// Legacy current remains readable only under the legacy schema.
const SPEC_STATUS_VALUES = ["proposed", "finalized", ...STATUS_VALUES];
const TYPE_VALUES = ["fact", "decision", "event", "context", "constraint"];
const CONFIDENCE_VALUES = ["observed", "reported", "inferred"];

const MEMORY_REQUIRED = [
  "summary", "type", "status", "source", "confidence",
  "created_at", "tags", "approved_by", "approval_date",
];
const SPEC_REQUIRED = [
  "summary", "area", "status", "source",
  "created_at", "tags", "approved_by", "approval_date",
];

const MEMORY_KNOWN = new Set([
  ...MEMORY_REQUIRED, "group", "confirmed_at", "source_quote", "effective_from",
  "effective_to", "project", "work_item", "supersedes", "superseded_by",
  "related_memories",
]);
const SPEC_KNOWN = new Set([
  ...SPEC_REQUIRED, "group", "confirmed_at", "source_quote", "effective_from",
  "effective_to", "project", "work_item", "supersedes", "superseded_by",
]);

const DATE_FIELDS = [
  "created_at", "approval_date", "confirmed_at", "effective_from", "effective_to",
];

/**
 * Patterns for things that must never be committed. Each is a shape that is
 * hard to produce by accident, so a hit is worth stopping on.
 */
const SECRET_PATTERNS = [
  [/\bsk-[A-Za-z0-9_-]{20,}\b/, "an API key beginning sk-"],
  [/\bsk-ant-[A-Za-z0-9_-]{20,}\b/, "an Anthropic API key"],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}\b/, "a GitHub token"],
  [/\bxox[abposr]-[A-Za-z0-9-]{10,}\b/, "a Slack token"],
  [/\bAKIA[0-9A-Z]{16}\b/, "an AWS access key id"],
  [/-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/, "a private key block"],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/, "a JSON web token"],
  [/(?:password|passwd|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*["']?[^\s"'<>{}]{8,}/i,
    "something that reads as a password or key assignment"],
];

const problems = [];
let filesChecked = 0;

function fail(path, message) {
  problems.push(`  ${path}\n    ${message}`);
}

function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y
    && date.getUTCMonth() === m - 1
    && date.getUTCDate() === d;
}

function checkSecrets(path, text) {
  for (const [pattern, description] of SECRET_PATTERNS) {
    if (pattern.test(text)) {
      fail(path, `contains ${description}. Secrets never go in knowledge, because`
        + " this folder is in Git and Git keeps everything. Remove it, then rotate"
        + " the credential: it is compromised the moment it is written down.");
      return;
    }
  }
}

function checkFile(vault, folder, name, kind, schema = 1) {
  const path = `knowledge/${folder}/${name}`;
  const text = readFileSync(resolve(vault, folder, name), "utf8");
  filesChecked++;

  checkSecrets(path, text);

  const { hasFrontmatter, data, body, errors } = parseFrontmatter(text);

  if (!hasFrontmatter) {
    fail(path, errors[0]
      ? `frontmatter could not be read: ${errors[0]}.`
      : "has no frontmatter. Every knowledge file opens with a --- fenced block.");
    return;
  }
  for (const error of errors) fail(path, `frontmatter problem: ${error}.`);

  const required = [...(kind === "memory" ? MEMORY_REQUIRED : SPEC_REQUIRED)];
  const known = new Set(kind === "memory" ? MEMORY_KNOWN : SPEC_KNOWN);
  const autoSaved = schema === 2 && kind === "memory" && data.auto_saved === "true";
  if (schema === 2) {
    required.push("group", "updated_at", ...(kind === "memory" ? ["context"] : []));
    for (const key of ["updated_at", ...(kind === "memory" ? ["context", "auto_saved"] : [])]) known.add(key);
    if (kind === "memory" && Object.hasOwn(data, "auto_saved") && !autoSaved) fail(path, "auto_saved must be true when present; omit it for individually approved memory.");
    if (autoSaved && (Object.hasOwn(data, "approved_by") || Object.hasOwn(data, "approval_date"))) fail(path, "auto_saved replaces individual approval fields; a standing grant is not individual approval.");
  }

  // Saving a proposed PRD does not approve its requirements. Omit the pair
  // only when neither approval field has been supplied; placeholders are invalid.
  const unapprovedDraft = kind === "spec" && data.status === "proposed"
    && !Object.hasOwn(data, "approved_by") && !Object.hasOwn(data, "approval_date");
  const approvalFields = ["approved_by", "approval_date"];

  for (const field of required) {
    if ((unapprovedDraft || autoSaved) && approvalFields.includes(field)) continue;
    const value = data[field];
    const empty = value === undefined
      || value === ""
      || (Array.isArray(value) && value.length === 0);
    if (empty) fail(path, `is missing the required field \`${field}\`.`);
    else if (field !== "tags" && (typeof value !== "string" || !value.trim())) fail(path, `${field} must be a nonblank string.`);
  }

  for (const field of approvalFields) {
    if (Object.hasOwn(data, field)
      && (typeof data[field] !== "string" || !data[field].trim())) {
      fail(path, `has an invalid \`${field}\`. Approval fields must be nonblank strings.`);
    }
  }

  for (const field of Object.keys(data)) {
    if (!known.has(field)) {
      fail(path, `has an unknown field \`${field}\`. Fields are not invented`
        + " one file at a time. Add it to the schema first, or remove it.");
    }
  }

  if (kind === "memory" && data.confidence && !CONFIDENCE_VALUES.includes(data.confidence)) {
    fail(path, `has confidence "${data.confidence}". It must be one of:`
      + ` ${CONFIDENCE_VALUES.join(", ")}.`);
  }
  if (kind === "memory" && data.type && !TYPE_VALUES.includes(data.type)) {
    fail(path, `has type "${data.type}". It must be one of: ${TYPE_VALUES.join(", ")}.`);
  }
  const statusValues = kind === "memory" ? STATUS_VALUES : SPEC_STATUS_VALUES.filter(status => schema === 1 || status !== "current");
  if (data.status && !statusValues.includes(data.status)) {
    fail(path, `has status "${data.status}". It must be one of:`
      + ` ${statusValues.join(", ")}.`);
  }

  for (const field of [...DATE_FIELDS, ...(schema === 2 ? ["updated_at"] : [])]) {
    const value = data[field];
    if (value !== undefined && (typeof value !== "string" || !isDate(value))) {
      fail(path, `has ${field} "${value}". Dates are written YYYY-MM-DD.`);
    }
  }

  const summaryLimit = schema === 2 ? 199 : SUMMARY_MAX_CHARS;
  if (schema === 2 && typeof data.summary === "string" && /[\r\n]/.test(data.summary)) fail(path, "summary must be one line.");
  if (typeof data.summary === "string" && [...data.summary].length > summaryLimit) {
    fail(path, `has a summary of ${data.summary.length} characters. It is one`
      + ` sentence, at most ${summaryLimit}. The index copies it, so a long`
      + " one is paid for on every read.");
  }

  if (data.tags !== undefined && !Array.isArray(data.tags)) {
    fail(path, "has tags written as a single value. Tags are a list, for example"
      + " [migration, salesforce].");
  }

  const superseded = typeof data.superseded_by === "string" ? data.superseded_by.trim() : "";
  if (superseded && data.status !== "superseded") {
    fail(path, `points at a replacement but its status is "${data.status || "unset"}".`
      + " A file with superseded_by has status: superseded.");
  }
  if (data.status === "superseded" && !superseded) {
    fail(path, "has status superseded but does not say what replaced it. Set"
      + " superseded_by to the new file's path.");
  }
  for (const field of ["supersedes", "superseded_by"]) {
    const value = typeof data[field] === "string" ? data[field].trim() : "";
    if (!value) continue;
    for (const target of value.split(",").map((item) => item.trim()).filter(Boolean)) {
      const candidates = [
        resolve(vault, "..", target),
        resolve(vault, folder, target),
        resolve(vault, target),
      ];
      if (!(schema === 2 ? candidates.slice(0, 1) : candidates).some((candidate) => existsSync(candidate))) {
        fail(path, `${field} points at "${target}", which does not exist.`);
      }
    }
  }

  if (!body.split("\n").some((line) => /^#\s+\S/.test(line))) {
    fail(path, "has no title. Below the frontmatter comes a `# Title` in plain"
      + " words.");
  }
}

const TOPIC_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * One feature-area folder under knowledge/prds/. The file named after the
 * folder is the parent PRD; every other Markdown file beside it is a child PRD
 * and is checked against the same field rules. The folder is one level deep.
 */
function checkAreaFolder(vault, folder, area, kind, indexName) {
  const dir = `${folder}/${area}`;
  if (!TOPIC_NAME.test(area)) {
    fail(`knowledge/${dir}/`,
      "is not named for its feature area in plain words. Use lowercase words"
      + " joined by hyphens, for example toolkit-operating-system.");
  }

  let entries;
  try {
    entries = readdirSync(resolve(vault, dir), { withFileTypes: true });
  } catch {
    return;
  }

  const parentName = `${area}.md`;
  let hasParent = false;
  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) {
      fail(`knowledge/${dir}/${entry.name}/`,
        "is a folder inside a PRD folder. A PRD folder is one level deep: the"
        + ` parent ${parentName} and its child PRDs beside it. Move the files up`
        + " and delete the folder.");
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (entry.name === indexName) continue;
    if (entry.name === parentName) hasParent = true;
    if (!TOPIC_NAME.test(entry.name.slice(0, -3))) {
      fail(`knowledge/${dir}/${entry.name}`,
        "is not named for its topic in plain words. Use lowercase words joined"
        + " by hyphens, for example how-the-migration-orders-its-steps.md.");
    }
    checkFile(vault, dir, entry.name, kind);
  }

  if (!hasParent) {
    fail(`knowledge/${dir}/`,
      `has no ${parentName}. A feature-area folder holds the parent PRD named`
      + " after the folder, and every other Markdown file in it is a child PRD.");
  }
}

function checkFolder(vault, folder, kind, indexName, areaFolders = false) {
  let entries;
  try {
    entries = readdirSync(resolve(vault, folder), { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) {
      if (areaFolders) {
        checkAreaFolder(vault, folder, entry.name, kind, indexName);
        continue;
      }
      fail(`knowledge/${folder}/${entry.name}/`,
        "is a subfolder. This folder is flat: one file per topic, no bins by"
        + " type. Move the files up and delete the folder.");
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (entry.name === indexName) continue;
    if (!TOPIC_NAME.test(entry.name.slice(0, -3))) {
      fail(`knowledge/${folder}/${entry.name}`,
        "is not named for its topic in plain words. Use lowercase words joined"
        + " by hyphens, for example how-the-migration-orders-its-steps.md.");
    }
    checkFile(vault, folder, entry.name, kind);
  }
}

function checkCurrent(vault) {
  const path = resolve(vault, "current.md");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  filesChecked++;
  checkSecrets("knowledge/current.md", text);
  if (text.length > CURRENT_MD_MAX_CHARS) {
    fail("knowledge/current.md",
      `is ${text.length} characters, over the ${CURRENT_MD_MAX_CHARS} cap. It is`
      + " what is happening right now, not a log. Overwrite it, do not add to it."
      + " Anything worth keeping goes through a save.");
  }
}

function checkSelfImprovement(vault) {
  const path = resolve(vault, "memory-self-improvement.md");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  filesChecked++;
  checkSecrets("knowledge/memory-self-improvement.md", text);
  if (text.length > SELF_IMPROVEMENT_MAX_CHARS) {
    fail("knowledge/memory-self-improvement.md",
      `is ${text.length} characters, over the ${SELF_IMPROVEMENT_MAX_CHARS} cap.`
      + " It is a short record of what the owner counts as memory-worthy, not a"
      + " log of every review. Run reflect to merge repeated lines into lessons."
      + " Nothing here is truncated silently.");
  }
}

function checkManual(vault) {
  const path = resolve(vault, "knowledge-manual.md");
  if (!existsSync(path)) {
    fail("knowledge/knowledge-manual.md",
      "is missing. This managed operating manual is required for an equipped"
      + " project. Run project-sync to migrate a marked legacy knowledge/README.md"
      + " or restore the manual without overwriting unrelated files.");
    return;
  }
  const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const legacyPath = resolve(vault, "README.md");
  if (existsSync(legacyPath)) {
    let legacy = "";
    try { legacy = readFileSync(legacyPath, "utf8").replace(/\r\n/g, "\n"); }
    catch { fail("knowledge/README.md", "could not be inspected for legacy manual conflicts. Preserve it and investigate through project-sync."); }
    if (legacy.trimStart().startsWith("<!-- claude-toolkit:knowledge-manual -->")
      && legacy.replaceAll("knowledge/README.md", "knowledge/knowledge-manual.md").trim() !== text.trim()) {
      fail("knowledge/knowledge-manual.md", "conflicts with the marked legacy knowledge/README.md. Preserve both and reconcile through project-sync.");
    }
  }
  filesChecked++;
  const actual = createHash("sha256").update(text).digest("hex");
  if (actual !== MANUAL_SHA256) {
    fail("knowledge/knowledge-manual.md",
      "does not match the toolkit's managed operating manual. Run project-sync"
      + " to review the difference and restore the managed copy.");
  }
}


function checkV2(projectRoot, vault) {
  const requiredPaths = ["SOUL.md", "knowledge/project.md", "knowledge/README.md", "knowledge/memory/current.md", "knowledge/memory-inbox.md", "knowledge/memory/memory-entries/terminology-glossary.md"];
  for (const path of requiredPaths) {
    const absolute = resolve(projectRoot, path);
    if (!existsSync(absolute)) { fail(path, "is missing from this schema-2 project. Complete migration before reporting it equipped."); continue; }
    if (lstatSync(absolute).isSymbolicLink() || !lstatSync(absolute).isFile()) { fail(path, "must be a regular project file."); continue; }
    const text = readFileSync(absolute, "utf8");
    filesChecked++;
    checkSecrets(path, text);
    if (path === "knowledge/memory/current.md" && [...text].length >= 5000) fail(path, "must be under 5000 characters. Preserve useful meaning while shortening it.");
  }
  for (const path of ["knowledge/current.md", "knowledge/prds/spec-index.md"]) {
    if (existsSync(resolve(projectRoot, path))) fail(path, "is a legacy location. Reconcile and migrate it; do not keep competing active records.");
  }
  if (existsSync(resolve(vault, "memory"))) {
    for (const entry of readdirSync(resolve(vault, "memory"), { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".md") && !["memory-index.md", "current.md"].includes(entry.name)) fail(`knowledge/memory/${entry.name}`, "is a legacy memory outside memory-entries/. Reconcile it before completing migration.");
    }
  }
  const projectPath = resolve(vault, "project.md");
  if (existsSync(projectPath) && lstatSync(projectPath).isFile()) {
    const { data, errors } = parseFrontmatter(readFileSync(projectPath, "utf8"));
    for (const error of errors) fail("knowledge/project.md", error);
    if (data.memory_auto_save !== undefined && !["true", "false"].includes(data.memory_auto_save)) fail("knowledge/project.md", "memory_auto_save must be true or false.");
    if (data.memory_auto_save === "true") {
      for (const key of ["memory_permission_by", "memory_permission_date", "memory_permission_source", "memory_permission_scope"]) {
        if (typeof data[key] !== "string" || !data[key].trim()) fail("knowledge/project.md", `enabled automatic memory saving needs ${key}.`);
      }
      if (data.memory_permission_date && !isDate(data.memory_permission_date)) fail("knowledge/project.md", "memory_permission_date must be a real YYYY-MM-DD date.");
    }
  }
  for (const folder of V2_INDEXES) {
    const { entries, problems: inventoryProblems } = collectV2(projectRoot, folder);
    for (const problem of inventoryProblems) fail(folder.source, problem);
    const topicGroups = new Map();
    for (const entry of entries) {
      if (folder.kind === "external") {
        filesChecked++;
        checkSecrets(entry.path, entry.text);
        for (const key of ["source", "captured_at"]) if (typeof entry.data[key] !== "string" || !entry.data[key].trim()) fail(entry.path, `needs ${key}.`);
        if (entry.data.captured_at && !isDate(entry.data.captured_at)) fail(entry.path, "captured_at must be a real YYYY-MM-DD date.");
        continue;
      }
      const parts = posix(relative(resolve(projectRoot, folder.source), resolve(projectRoot, entry.path))).split("/");
      for (const [i, part] of parts.entries()) if (!TOPIC_NAME.test(i === parts.length - 1 ? part.slice(0, -3) : part)) fail(entry.path, "use lowercase topic words joined by hyphens for files and folders.");
      if (folder.kind === "memory" && parts.length > 1) {
        const group = topicGroups.get(parts[0]);
        if (group && group !== entry.data.group) fail(entry.path, "files in one memory topic folder must share their group.");
        topicGroups.set(parts[0], entry.data.group);
      }
      const relativePath = posix(relative(vault, resolve(projectRoot, entry.path)));
      checkFile(vault, dirname(relativePath), basename(relativePath), folder.kind, 2);
    }
  }
  for (const output of renderV2Indexes(projectRoot)) {
    const path = posix(relative(projectRoot, output.path));
    for (const problem of output.problems.filter(problem => problem.includes("parent PRD's group"))) fail(path, problem);
    if (!existsSync(output.path)) fail(path, "is missing. Rebuild the generated indexes.");
    else if (lstatSync(output.path).isSymbolicLink() || !lstatSync(output.path).isFile()) fail(path, "must be a regular generated index file.");
    else if (readFileSync(output.path, "utf8") !== output.content) fail(path, "does not match its sources. Rebuild the generated indexes; sources win.");
  }
  const feedback = resolve(vault, "memory-self-improvement.md");
  if (existsSync(feedback) && lstatSync(feedback).isFile()) { filesChecked++; checkSecrets("knowledge/memory-self-improvement.md", readFileSync(feedback, "utf8")); }
}

export function checkKnowledge(projectRoot = root) {
  problems.length = 0;
  filesChecked = 0;
  const vault = resolve(projectRoot, "knowledge");
  if (!existsSync(vault)) return { problems: [], filesChecked: 0, skipped: true };

  checkManual(vault);
  const manualPath = resolve(vault, "knowledge-manual.md");
  const manualText = existsSync(manualPath) ? readFileSync(manualPath, "utf8") : "";
  const markers = manualText.match(/<!--\s*claude-toolkit:knowledge-schema:[^>]*-->/g) || [];
  if (markers.length > 1 || (markers.length && markers[0] !== "<!-- claude-toolkit:knowledge-schema:2 -->")) fail("knowledge/knowledge-manual.md", "has an unknown or duplicate schema marker; reconcile the managed manual.");
  if (knowledgeSchema(projectRoot) === 2) {
    checkV2(projectRoot, vault);
    return { problems: [...problems], filesChecked, skipped: false, schema: 2 };
  }
  checkCurrent(vault);
  checkSelfImprovement(vault);
  checkFolder(vault, "memory", "memory", "memory-index.md");
  checkFolder(vault, "prds", "spec", "spec-index.md", true);

  return { problems: [...problems], filesChecked, skipped: false };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = checkKnowledge(root);
  if (result.skipped) {
    console.log(`No knowledge folder at ${posix(relative(root, resolve(root, "knowledge")))}. Nothing to check.`);
  } else if (result.problems.length === 0) {
    console.log(`ALL PASS (${result.filesChecked} file(s) checked).`);
  } else {
    console.error(
      `FAIL: ${result.problems.length} problem(s) in ${result.filesChecked} file(s):\n`,
    );
    for (const problem of result.problems) console.error(`${problem}\n`);
    process.exitCode = 1;
  }
}

#!/usr/bin/env node

/**
 * Check the knowledge folder for anything malformed or unsafe.
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
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter } from "./frontmatter.mjs";

const installedRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const root = resolve(process.argv[2] || installedRoot);

const posix = (value) => value.split(sep).join("/");

const CURRENT_MD_MAX_CHARS = 2000;
const SUMMARY_MAX_CHARS = 250;
export const MANUAL_SHA256 = "b1af01ce4788d2f6d5888fbe859fbb5ca5d941cc616a458c7d8b1e763d40ba61";

const STATUS_VALUES = ["current", "superseded", "retired"];
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
  ...MEMORY_REQUIRED, "confirmed_at", "source_quote", "effective_from",
  "effective_to", "project", "work_item", "supersedes", "superseded_by",
  "related_memories",
]);
const SPEC_KNOWN = new Set([
  ...SPEC_REQUIRED, "confirmed_at", "source_quote", "effective_from",
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

function checkFile(vault, folder, name, kind) {
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

  const required = kind === "memory" ? MEMORY_REQUIRED : SPEC_REQUIRED;
  const known = kind === "memory" ? MEMORY_KNOWN : SPEC_KNOWN;

  for (const field of required) {
    const value = data[field];
    const empty = value === undefined
      || value === ""
      || (Array.isArray(value) && value.length === 0);
    if (empty) fail(path, `is missing the required field \`${field}\`.`);
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
  if (data.status && !STATUS_VALUES.includes(data.status)) {
    fail(path, `has status "${data.status}". It must be one of:`
      + ` ${STATUS_VALUES.join(", ")}.`);
  }

  for (const field of DATE_FIELDS) {
    const value = data[field];
    if (typeof value === "string" && value !== "" && !isDate(value)) {
      fail(path, `has ${field} "${value}". Dates are written YYYY-MM-DD.`);
    }
  }

  if (typeof data.summary === "string" && data.summary.length > SUMMARY_MAX_CHARS) {
    fail(path, `has a summary of ${data.summary.length} characters. It is one`
      + ` sentence, at most ${SUMMARY_MAX_CHARS}. The index copies it, so a long`
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
        resolve(root, target),
        resolve(vault, folder, target),
        resolve(vault, target),
      ];
      if (!candidates.some((candidate) => existsSync(candidate))) {
        fail(path, `${field} points at "${target}", which does not exist.`);
      }
    }
  }

  if (!body.split("\n").some((line) => /^#\s+\S/.test(line))) {
    fail(path, "has no title. Below the frontmatter comes a `# Title` in plain"
      + " words.");
  }
}

function checkFolder(vault, folder, kind, indexName) {
  let entries;
  try {
    entries = readdirSync(resolve(vault, folder), { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) {
      fail(`knowledge/${folder}/${entry.name}/`,
        "is a subfolder. This folder is flat: one file per topic, no bins by"
        + " type. Move the files up and delete the folder.");
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (entry.name === indexName) continue;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(entry.name)) {
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

function checkManual(vault) {
  const path = resolve(vault, "README.md");
  if (!existsSync(path)) {
    fail("knowledge/README.md",
      "is missing. This managed operating manual is required for an equipped"
      + " project. Run project-sync to restore it.");
    return;
  }
  const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  filesChecked++;
  const actual = createHash("sha256").update(text).digest("hex");
  if (actual !== MANUAL_SHA256) {
    fail("knowledge/README.md",
      "does not match the toolkit's managed operating manual. Run project-sync"
      + " to review the difference and restore the managed copy.");
  }
}

export function checkKnowledge(projectRoot = root) {
  problems.length = 0;
  filesChecked = 0;
  const vault = resolve(projectRoot, "knowledge");
  if (!existsSync(vault)) return { problems: [], filesChecked: 0, skipped: true };

  checkManual(vault);
  checkCurrent(vault);
  checkFolder(vault, "memory", "memory", "memory-index.md");
  checkFolder(vault, "specs", "spec", "spec-index.md");

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

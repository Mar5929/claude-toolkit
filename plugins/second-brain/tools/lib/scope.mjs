#!/usr/bin/env node

/**
 * Physical scope resolution and the recorded privacy boundary.
 *
 * One home for both boundaries, because every entry point needs the same
 * answer and two copies of a boundary rule drift. Resolution reads only files
 * inside the project. A stored absolute path, an environment variable, the
 * host's idea of a workspace, and the Git remote take no part.
 *
 * The full versioned settings schema lives in record-schema.mjs. This file
 * reads only the keys scope and privacy need.
 */

import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, resolve, sep } from "node:path";

import { note } from "./result.mjs";

const PRIVACY_LEVELS = new Set(["standard", "sensitive"]);
const TRANSFER_VALUES = new Set(["denied", "approved"]);
const THIRD_PARTY_VALUES = new Set(["refused", "by-record"]);

/** The most restrictive reading, used whenever a value is missing or unknown. */
const RESTRICTIVE_PRIVACY = Object.freeze({
  level: "sensitive",
  external_transfer: "denied",
  third_party_personal: "refused",
});

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

function scalar(raw) {
  const value = stripQuotes(raw);
  if (/^-?\d+$/.test(value)) return Number(value);
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

/**
 * Read the YAML front matter of a Markdown file. Handles scalars, inline
 * lists, dash lists, and nested maps, which is the whole shape the settings
 * front matter uses. Anything richer is reported as a problem instead of
 * being guessed at.
 */
export function parseFrontMatter(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  const problems = [];
  if (!normalized.startsWith("---\n")) {
    return { found: false, data: {}, problems: ["missing YAML front matter"] };
  }
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) {
    return { found: false, data: {}, problems: ["YAML front matter is not closed"] };
  }

  const lines = [];
  normalized.slice(4, end).split("\n").forEach((line, offset) => {
    if (!line.trim() || line.trimStart().startsWith("#")) return;
    lines.push({
      indent: line.length - line.trimStart().length,
      text: line.trim(),
      number: offset + 2,
    });
  });

  function parseBlock(start, indent) {
    let index = start;
    let map = null;
    let list = null;

    while (index < lines.length && lines[index].indent >= indent) {
      const line = lines[index];
      if (line.indent > indent) {
        problems.push(`unexpected indent on front matter line ${line.number}`);
        index++;
        continue;
      }

      if (line.text.startsWith("- ")) {
        if (list === null) list = [];
        const rest = line.text.slice(2);
        const pair = rest.match(/^([A-Za-z0-9_-]+):(?:\s+(.*))?$/);
        if (!pair) {
          list.push(scalar(rest));
          index++;
          continue;
        }
        // A dash line that opens a map, which is the shape of an evidence
        // entry. Its remaining keys sit at a deeper indent than the dash.
        const item = {};
        const [, firstKey, firstRaw = ""] = pair;
        const firstList = parseInlineList(firstRaw);
        item[firstKey] = firstRaw.trim()
          ? (firstList === null ? scalar(firstRaw) : firstList)
          : null;
        index++;
        while (index < lines.length && lines[index].indent > line.indent) {
          const child = lines[index];
          const childPair = child.text.match(/^([A-Za-z0-9_-]+):(?:\s+(.*))?$/);
          if (!childPair) {
            problems.push(`could not read front matter line ${child.number}`);
            index++;
            continue;
          }
          const [, key, raw = ""] = childPair;
          if (Object.hasOwn(item, key)) {
            problems.push(`key ${key} appears more than once`);
          }
          const inline = parseInlineList(raw);
          item[key] = raw.trim() ? (inline === null ? scalar(raw) : inline) : null;
          index++;
        }
        list.push(item);
        continue;
      }

      const match = line.text.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
      if (!match) {
        problems.push(`could not read front matter line ${line.number}`);
        index++;
        continue;
      }

      if (map === null) map = {};
      const [, key, raw = ""] = match;
      if (Object.hasOwn(map, key)) {
        problems.push(`key ${key} appears more than once`);
      }

      if (raw.trim()) {
        const inline = parseInlineList(raw);
        map[key] = inline === null ? scalar(raw) : inline;
        index++;
        continue;
      }

      const next = lines[index + 1];
      if (next && next.indent > indent) {
        const [child, resumed] = parseBlock(index + 1, next.indent);
        map[key] = child;
        index = resumed;
      } else {
        map[key] = null;
        index++;
      }
    }

    if (list !== null && map !== null) {
      problems.push("front matter mixes list entries and keys at one level");
    }
    return [list !== null ? list : (map ?? {}), index];
  }

  const [data] = parseBlock(0, lines.length ? lines[0].indent : 0);
  return { found: true, data: data ?? {}, problems };
}

function canonical(path) {
  try {
    return realpathSync(path);
  } catch {
    const parent = dirname(path);
    if (parent === path) return resolve(path);
    return resolve(canonical(parent), path.slice(parent.length + 1));
  }
}

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function beneath(root, candidate) {
  return candidate === root || candidate.startsWith(root + sep);
}

/**
 * Walk up from the starting directory to the nearest ancestor holding
 * knowledge/project.md. Returns null when no ancestor has one, which means
 * this directory is not part of a memory project.
 */
export function findProjectFile(startDir = process.cwd()) {
  let directory = canonical(resolve(startDir));
  for (;;) {
    const candidate = resolve(directory, "knowledge", "project.md");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
}

/** Resolve the recorded privacy boundary. A malformed block never fails open. */
export function resolvePrivacy(settings) {
  const warnings = [];
  const block = settings && typeof settings.privacy === "object" && settings.privacy !== null
    ? settings.privacy
    : null;

  if (!block) {
    warnings.push(note(
      "record/schema-invalid",
      "no readable privacy block, so the most restrictive boundary applies",
    ));
    return { privacy: { ...RESTRICTIVE_PRIVACY }, warnings };
  }

  const privacy = { ...RESTRICTIVE_PRIVACY };

  if (PRIVACY_LEVELS.has(block.level)) privacy.level = block.level;
  else {
    warnings.push(note(
      "record/schema-invalid",
      "privacy level is missing or unknown, so sensitive applies",
    ));
  }

  if (TRANSFER_VALUES.has(block.external_transfer)) {
    privacy.external_transfer = block.external_transfer;
  } else {
    warnings.push(note(
      "record/schema-invalid",
      "external_transfer is missing or unknown, so denied applies",
    ));
  }

  if (privacy.external_transfer === "approved" && !block.consent) {
    privacy.external_transfer = "denied";
    warnings.push(note(
      "privacy/consent-missing",
      "external_transfer is approved with no consent link, so denied applies",
    ));
  }

  if (THIRD_PARTY_VALUES.has(block.third_party_personal)) {
    privacy.third_party_personal = block.third_party_personal;
  } else {
    warnings.push(note(
      "record/schema-invalid",
      "third_party_personal is missing or unknown, so refused applies",
    ));
  }

  return { privacy, warnings };
}

/**
 * Resolve the physical scope, in the fixed order of the architecture:
 * find the project file, resolve project_root against it, canonicalize,
 * require the knowledge folder to sit inside the result, then remove every
 * declared subroot subtree.
 */
export function resolveScope(startDir = process.cwd()) {
  const projectFile = findProjectFile(startDir);
  if (!projectFile) {
    return {
      ok: false,
      error: note(
        "scope/unresolved-root",
        "no ancestor directory holds knowledge/project.md",
        { path: resolve(startDir) },
      ),
    };
  }

  const projectDir = dirname(dirname(projectFile));
  const knowledgeDir = resolve(projectDir, "knowledge");

  let parsed;
  try {
    parsed = parseFrontMatter(readFileSync(projectFile, "utf8"));
  } catch (error) {
    return {
      ok: false,
      error: note("scope/unresolved-root", `knowledge/project.md is unreadable: ${error.code ?? "read failed"}`, {
        path: projectFile,
      }),
    };
  }

  const settings = parsed.data ?? {};
  const warnings = parsed.problems.map((problem) => note(
    "record/schema-invalid",
    problem,
    { path: projectFile },
  ));

  const projectId = typeof settings.project_id === "string" && settings.project_id.trim()
    ? settings.project_id.trim()
    : null;
  if (!projectId) {
    return {
      ok: false,
      error: note("scope/unresolved-root", "knowledge/project.md carries no project_id", {
        path: projectFile,
      }),
    };
  }

  const declaredRoot = settings.project_root;
  if (declaredRoot === undefined || declaredRoot === null || declaredRoot === "") {
    return {
      ok: false,
      error: note("scope/unresolved-root", "knowledge/project.md carries no project_root", {
        path: projectFile,
      }),
    };
  }

  const rootText = String(declaredRoot);
  const scopeRoot = canonical(isAbsolute(rootText) ? rootText : resolve(projectDir, rootText));
  if (!isDirectory(scopeRoot)) {
    return {
      ok: false,
      error: note("scope/unresolved-root", "project_root does not resolve to a directory", {
        path: scopeRoot,
      }),
    };
  }
  if (!beneath(scopeRoot, canonical(knowledgeDir))) {
    return {
      ok: false,
      error: note(
        "scope/unresolved-root",
        "the resolved scope root does not contain the knowledge folder that named it",
        { path: scopeRoot },
      ),
    };
  }

  const declaredSubroots = Array.isArray(settings.subroots) ? settings.subroots : [];
  const subroots = declaredSubroots
    .map((entry) => String(entry).trim())
    .filter(Boolean)
    .map((entry) => canonical(isAbsolute(entry) ? entry : resolve(scopeRoot, entry)));

  const { privacy, warnings: privacyWarnings } = resolvePrivacy(settings);

  return {
    ok: true,
    projectFile,
    knowledgeDir: canonical(knowledgeDir),
    scopeRoot,
    projectId,
    settings,
    subroots,
    privacy,
    warnings: [...warnings, ...privacyWarnings],
  };
}

/**
 * A member path is the scope root or sits beneath it once canonicalized,
 * with declared subroots removed. The separator at the boundary is what stops
 * a sibling folder named project-notes passing as a member of project.
 */
export function isMemberPath(scope, candidate) {
  const target = canonical(isAbsolute(candidate) ? candidate : resolve(scope.scopeRoot, candidate));
  if (!beneath(scope.scopeRoot, target)) return false;
  return !scope.subroots.some((subroot) => beneath(subroot, target));
}

/**
 * Second names for the same three functions. Entry points arrived at
 * different wording for the same answer, and one module with two names is
 * still one boundary rule. Prefer the names above in new code.
 */
export const readFrontMatter = parseFrontMatter;
export const readPrivacy = resolvePrivacy;
export const insideRoot = isMemberPath;

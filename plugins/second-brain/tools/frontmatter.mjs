/**
 * Read the YAML frontmatter off a knowledge file.
 *
 * Deliberately small. The knowledge schema uses scalars and flat lists of
 * strings and nothing else, so this handles exactly that and reports anything
 * it does not understand rather than guessing. Both the index builder and the
 * checker read files through here, so they never disagree about what a file
 * says.
 */

const FENCE = "---";

function stripQuotes(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function parseInlineList(value) {
  const inner = value.trim().slice(1, -1).trim();
  if (!inner) return [];
  return inner.split(",").map(stripQuotes).filter((item) => item !== "");
}

/**
 * @returns {{
 *   hasFrontmatter: boolean,
 *   data: Record<string, string | string[]>,
 *   body: string,
 *   errors: string[],
 * }}
 */
export function parseFrontmatter(text) {
  const normalised = text.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const lines = normalised.split("\n");
  const errors = [];

  if (lines[0]?.trim() !== FENCE) {
    return { hasFrontmatter: false, data: {}, body: normalised, errors };
  }

  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === FENCE) {
      end = i;
      break;
    }
  }

  if (end === -1) {
    errors.push("the frontmatter opens with --- but never closes");
    return { hasFrontmatter: false, data: {}, body: normalised, errors };
  }

  const data = {};
  let currentKey = null;

  for (let i = 1; i < end; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();
    if (line.trim() === "" || line.trim().startsWith("#")) continue;

    const listItem = line.match(/^\s+-\s*(.*)$/);
    if (listItem) {
      if (!currentKey) {
        errors.push(`line ${i + 1}: a list item with no field above it`);
        continue;
      }
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(stripQuotes(listItem[1]));
      continue;
    }

    const pair = line.match(/^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/);
    if (!pair) {
      errors.push(`line ${i + 1}: cannot read "${line.trim()}" as a field`);
      currentKey = null;
      continue;
    }

    const [, key, rest] = pair;
    currentKey = key;

    if (rest === "") {
      data[key] = "";
      continue;
    }
    if (rest.startsWith("[") && rest.endsWith("]")) {
      data[key] = parseInlineList(rest);
      continue;
    }
    data[key] = stripQuotes(rest);
  }

  return {
    hasFrontmatter: true,
    data,
    body: lines.slice(end + 1).join("\n"),
    errors,
  };
}

/** The first level-one heading in the body, or null. */
export function bodyTitle(body) {
  for (const line of body.split("\n")) {
    const match = line.match(/^#\s+(.+?)\s*$/);
    if (match) return match[1].trim();
  }
  return null;
}

#!/usr/bin/env node

/**
 * The pin registry format, in one place.
 *
 * Architecture section 11.2 puts pin state in one optional canonical file,
 * knowledge/memory/pins.md, and says an entry stores only four things: the
 * record id, a relative link to that record, the approval date, and the hash
 * of the exact approved summary. The summary itself is never copied here.
 * Startup reads the summary from the record and verifies the hash, which is
 * what makes a hand edit to a record detectable: the approval evidence lives
 * in a different file from the meaning it covers.
 *
 * Three readers need the same answer about that file. The pin manager in
 * memory-write.mjs writes it, the boot brief assembler renders from it, and
 * validator check MV-06 judges it. So the format lives here and none of them
 * carries a second copy of it.
 *
 * This module reads no file it was not handed except when resolving a link
 * target, and it writes nothing.
 */

import { createHash } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

import { parseRecord } from "./record-schema.mjs";

/** The one home of pin state. Absent means the project has no pins. */
export const PINS_PATH = "knowledge/memory/pins.md";

/** The folder a link target is resolved against when it is not root-relative. */
export const PINS_FOLDER = "knowledge/memory";

/** The four columns, in order. The header is written from this list. */
export const PIN_COLUMNS = Object.freeze(["Record id", "Record", "Pinned", "Summary hash"]);

/**
 * The pin statement limit of architecture section 11.1, in bytes of UTF-8.
 * Nothing in the design documents fixes a number, so this build picks one that
 * holds a long sentence with its qualifiers, dates, and numbers and still
 * leaves a ten-pin project inside the default ten-kilobyte startup budget.
 */
export const PIN_STATEMENT_LIMIT = 320;

export function summaryHash(summary) {
  return `sha256:${createHash("sha256").update(summary, "utf8").digest("hex")}`;
}

/**
 * The exact approved summary of one record, as text.
 *
 * A version 2 record carries it as the one-sentence paragraph under the H1,
 * which is what the record schema validates. A record migrated from version 1
 * may carry it as a front matter summary field instead, and that field wins
 * when it is there, because it is what the owner approved. The H1 is the last
 * fallback: it is authored text rather than a paraphrase.
 */
export function approvedSummary(text) {
  const record = parseRecord(String(text ?? ""));
  const declared = typeof record.data.summary === "string" ? record.data.summary.trim() : "";
  if (declared) return declared;
  if (record.summary) return record.summary;
  return record.h1 || null;
}

function cellText(cell) {
  return cell.replace(/`/g, "").trim();
}

/** The link target of a cell that may be a Markdown link or a bare path. */
export function linkTarget(cell) {
  const link = /^\[[^\]]*\]\(([^)]+)\)$/.exec(cell.trim());
  return cellText(link ? link[1] : cell);
}

/**
 * Read the registry. Every row of the four-column table becomes one entry.
 * Anything that is not such a row, including the header and the divider, is
 * skipped rather than guessed at.
 */
export function parsePins(text) {
  const entries = [];
  for (const line of String(text ?? "").replace(/\r\n/g, "\n").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) continue;
    const cells = trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
    if (cells.length < 4) continue;
    if (/^[-:\s]+$/.test(cells[0])) continue;
    const target = linkTarget(cells[1]);
    if (!target.endsWith(".md")) continue;
    entries.push({
      id: cellText(cells[0]),
      target,
      date: cellText(cells[2]),
      hash: cellText(cells[3]),
    });
  }
  return entries;
}

/**
 * Resolve one entry's link against the project root. A target written from
 * the root wins; a target written relative to the pin file itself, which is
 * what this module renders, is the fallback. The answer carries the
 * root-relative path, so every reader names the record the same way.
 */
export function resolvePinTarget(root, target) {
  const candidates = [resolve(root, target), resolve(root, PINS_FOLDER, target)];
  for (const absolute of candidates) {
    try {
      if (statSync(absolute).isFile()) {
        return { absolute, path: relative(root, absolute).split(sep).join("/") };
      }
    } catch {
      continue;
    }
  }
  const absolute = candidates[0];
  return {
    absolute,
    path: relative(root, absolute).split(sep).join("/"),
    missing: !existsSync(absolute),
  };
}

/** The link cell this module writes: the root-relative path, linked from here. */
export function pinLink(path) {
  const target = path.startsWith(`${PINS_FOLDER}/`) ? path.slice(PINS_FOLDER.length + 1) : path;
  return `[${path}](${target})`;
}

/**
 * Render the whole registry. Entries are sorted by record id, so the same pin
 * set always produces the same bytes and two sessions adding different pins
 * never reorder each other's rows.
 */
export function renderPinsFile(entries) {
  const rows = [...entries]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((entry) => `| ${entry.id} | ${pinLink(entry.path ?? entry.target)} | ${entry.date} | ${entry.hash} |`);

  return [
    "# Pinned memory",
    "",
    "Every row names one record the owner approved for the start of every",
    "session in this project. A row stores the record id, a link to the record,",
    "the approval date, and the hash of the exact approved summary. The summary",
    "itself is never copied here: startup reads it from the record and checks it",
    "against the hash, so a summary that changed without approval is reported",
    "instead of shown.",
    "",
    "This file is written only through the memory write coordinator, by the pin",
    "and unpin operations. Deleting it by hand removes every pin and nothing",
    "else: no record loses its content, its status, or its place in retrieval.",
    "",
    `| ${PIN_COLUMNS.join(" | ")} |`,
    `| ${PIN_COLUMNS.map(() => "---").join(" | ")} |`,
    ...rows,
    "",
  ].join("\n");
}

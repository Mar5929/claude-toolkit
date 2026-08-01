#!/usr/bin/env node

/**
 * link-check.mjs: fail when a Markdown link points at a file that is not there.
 *
 * Why this exists: the memory rule tells writers to link to one canonical home
 * instead of copying it. Every copy that discipline removes becomes a link, so
 * the more the rule works, the more the corpus depends on links that resolve.
 * A document's identity here is its relative path. Nothing else. Rename or move
 * a file and every pointer aimed at it dies quietly, and a dead pointer is
 * worse than the copy it replaced: it still looks like a canonical home, and a
 * reader who follows it finds nothing instead of finding stale text they can
 * recognize as stale.
 *
 * orphan-check.mjs asks whether a file can still be FOUND. This one asks the
 * opposite question: does what a file POINTS AT still exist.
 *
 * Only real links are checked. The toolkit ships copy-ready templates full of
 * deliberate placeholders such as [<Capability>](<capability>/README.md), and
 * worked examples such as [Ownership decision](../../../memory/decisions/...).
 * Those are illustrations, not paths, so anything inside a fenced code block or
 * inline backticks is skipped, as is any target containing angle brackets.
 *
 * Anchors are split off and only the file part is checked. Heading text is
 * prose and churns; the file existing is the part worth guarding.
 *
 * Run: node tests/link-check.mjs
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const markdownFiles = execFileSync("git", ["ls-files", "*.md"], {
  cwd: root,
  encoding: "utf8",
})
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

/** Inline `code spans`, so an example link inside backticks is not a link. */
function stripCodeSpans(line) {
  return line.replace(/`[^`]*`/g, "");
}

/**
 * Targets that are not paths into this repository:
 *   - a scheme such as http:, https:, or mailto:
 *   - a protocol-relative URL
 *   - an anchor into the current document
 *   - a placeholder from a copy-ready template
 */
function isNotARepositoryPath(target) {
  return (
    /^[a-z][a-z0-9+.-]*:/i.test(target)
    || target.startsWith("//")
    || target.startsWith("#")
    || target.includes("<")
    || target.includes(">")
  );
}

const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

const broken = [];
let checked = 0;

for (const file of markdownFiles) {
  // Tolerate Windows line endings: a checkout with core.autocrlf on has \r\n.
  const lines = readFileSync(resolve(root, file), "utf8")
    .replace(/\r\n/g, "\n")
    .split("\n");

  let inFence = false;

  lines.forEach((rawLine, index) => {
    if (/^\s*(```|~~~)/.test(rawLine)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;

    const line = stripCodeSpans(rawLine);
    for (const match of line.matchAll(LINK)) {
      const target = match[1];
      if (isNotARepositoryPath(target)) continue;

      const path = decodeURIComponent(target.split("#")[0]);
      if (!path) continue;

      checked++;
      if (!existsSync(resolve(root, dirname(file), path))) {
        broken.push(`  ${file}:${index + 1} -> ${target}`);
      }
    }
  });
}

if (broken.length > 0) {
  console.error(
    `FAIL: ${broken.length} Markdown link(s) point at a file that does not `
      + `exist:\n${broken.join("\n")}\n\n`
      + "Fix by correcting the path, or by pointing at the file that replaced\n"
      + "the missing one. A link inside a fenced code block or backticks is\n"
      + "treated as an example and is not checked.",
  );
  throw new Error(`${broken.length} broken Markdown link(s)`);
}

console.log(
  `ALL PASS (${checked} relative links resolve across `
    + `${markdownFiles.length} Markdown files), FAIL: 0`,
);

#!/usr/bin/env node

/**
 * installed-copy-check.mjs: fail when a file this repo ships and the copy this
 * repo runs have drifted apart.
 *
 * Why this exists: this repo is set up with its own toolkit, the same way
 * Anchor, DragonFly, and Diligence Ready are. So it holds two of almost
 * everything. `plugins/project-init/library/rules/general/wrap-up-ritual.md` is
 * what every other project receives, and `.claude/rules/wrap-up-ritual.md` is
 * the copy governing the session editing it. Change one and forget the other
 * and the repo starts telling other projects one thing while doing another.
 * That failure is silent: every other test passes, both files read fine on
 * their own, and nothing points at the pair.
 *
 * link-check.mjs asks whether what a file POINTS AT still exists.
 * orphan-check.mjs asks whether a file can still be FOUND.
 * This one asks whether two files that must say the same thing still do.
 *
 * Three things are checked.
 *
 * 1. Every tracked file under `.claude/` that has a shipped original matches it
 *    byte for byte, ignoring line endings. This repo runs the shipped rules
 *    unmodified on purpose: it is the test of what it ships. A file under
 *    `.claude/` with no known original and no exemption fails, so a new copy
 *    cannot be added without being checked.
 *
 * 2. The block between the `shared-with-agents-md` markers is identical in
 *    `CLAUDE.md` and `AGENTS.md`. Claude reads the first file, Codex reads the
 *    second, and the toolkit requires the memory routing to be the same in both.
 *
 * 3. The memory section inside that block matches the second-brain plugin's
 *    `references/orientation-snippet.md`, which is the canonical wording every
 *    project copies.
 *
 * Run: node tests/installed-copy-check.mjs
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const GENERAL_RULES = "plugins/project-init/library/rules/general";
const SECOND_BRAIN = "plugins/second-brain/skills/second-brain/references";
const ORIENTATION = `${SECOND_BRAIN}/orientation-snippet.md`;

/**
 * Where a file under `.claude/` came from. `null` means the file is this
 * repo's own and has no shipped original, which is allowed only for the files
 * listed here by name.
 */
const OWN_FILES = new Set([
  ".claude/rules/README.md",
  ".claude/settings.json",
  ".claude/toolkit-sync.md",
]);

function shippedOriginalFor(path) {
  if (OWN_FILES.has(path)) return null;
  if (path === ".claude/rules/second-brain.md") {
    return `${SECOND_BRAIN}/second-brain-rule.md`;
  }
  let match = path.match(/^\.claude\/rules\/(.+\.md)$/);
  if (match) return `${GENERAL_RULES}/${match[1]}`;
  match = path.match(/^\.claude\/agents\/(.+\.md)$/);
  if (match) return `plugins/second-brain/agents/${match[1]}`;
  match = path.match(/^\.claude\/output-styles\/(.+\.md)$/);
  if (match) return `plugins/project-init/library/output-styles/${match[1]}`;
  match = path.match(/^\.claude\/hooks\/(.+)$/);
  if (match) return `plugins/hooks-library/hooks/${match[1]}`;
  return undefined;
}

/** Line endings differ between checkouts; the words are what must match. */
function read(path) {
  return readFileSync(resolve(root, path), "utf8").replace(/\r\n/g, "\n");
}

const tracked = execFileSync("git", ["ls-files", ".claude"], {
  cwd: root,
  encoding: "utf8",
})
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

const failures = [];
let checked = 0;

for (const path of tracked) {
  const original = shippedOriginalFor(path);
  if (original === null) continue;
  if (original === undefined) {
    failures.push(
      `  ${path}\n    is under .claude/ but this check does not know what it is`
        + " a copy of.\n    Add its shipped original to shippedOriginalFor(), or"
        + " add the path to\n    OWN_FILES if this repo genuinely wrote it.",
    );
    continue;
  }
  if (!existsSync(resolve(root, original))) {
    failures.push(
      `  ${path}\n    copies ${original}, which no longer exists.\n`
        + "    Either the original moved and this copy is now stale, or the"
        + " copy should go.",
    );
    continue;
  }
  checked++;
  if (read(path) !== read(original)) {
    failures.push(
      `  ${path}\n    no longer matches ${original}.\n`
        + "    This repo runs what it ships, unmodified. Make the change in"
        + " both files.",
    );
  }
}

/** The block both root instruction files must carry word for word. */
function sharedBlock(path) {
  const text = read(path);
  const start = text.indexOf("<!-- shared-with-agents-md:start -->");
  const end = text.indexOf("<!-- shared-with-agents-md:end -->");
  if (start === -1 || end === -1) return null;
  return text.slice(start, end);
}

const claudeBlock = sharedBlock("CLAUDE.md");
const agentsBlock = sharedBlock("AGENTS.md");

if (claudeBlock === null || agentsBlock === null) {
  failures.push(
    "  CLAUDE.md / AGENTS.md\n    one of them is missing a"
      + " shared-with-agents-md marker, so the two\n    cannot be compared."
      + " Claude reads CLAUDE.md and Codex reads AGENTS.md;\n    the block"
      + " between the markers has to be in both.",
  );
} else {
  checked++;
  if (claudeBlock !== agentsBlock) {
    failures.push(
      "  CLAUDE.md / AGENTS.md\n    the shared block differs between them."
        + " Claude reads one file and Codex\n    reads the other, so a session"
        + " gets different instructions depending on\n    which program it is."
        + " Copy the block across.",
    );
  }
}

/** The canonical memory routing, from the plugin every project copies it from. */
const snippet = read(ORIENTATION);
const fenceStart = snippet.indexOf("```markdown\n");
const fenceEnd = snippet.indexOf("\n```", fenceStart + 1);
const canonicalMemorySection =
  fenceStart === -1 || fenceEnd === -1
    ? null
    : snippet.slice(fenceStart + "```markdown\n".length, fenceEnd + 1);

function memorySection(block) {
  if (block === null) return null;
  const start = block.indexOf("## Project memory and knowledge");
  if (start === -1) return null;
  const rest = block.slice(start);
  const next = rest.search(/\n## (?!#)/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

if (canonicalMemorySection === null) {
  failures.push(
    `  ${ORIENTATION}\n    has no \`\`\`markdown block, so there is nothing to`
      + " compare the root files\n    against.",
  );
} else {
  const rootMemorySection = memorySection(claudeBlock);
  if (rootMemorySection === null) {
    failures.push(
      "  CLAUDE.md\n    has no \"## Project memory and knowledge\" section"
        + " inside its shared block.\n    Every project carries it, and it goes"
        + " first, because routing has to\n    happen before an agent writes.",
    );
  } else {
    checked++;
    if (rootMemorySection.trim() !== canonicalMemorySection.trim()) {
      failures.push(
        `  CLAUDE.md and AGENTS.md\n    the memory section no longer matches`
          + ` ${ORIENTATION}.\n    That snippet is what every project copies,`
          + " so a change to one has to be a\n    change to both, in the same"
          + " commit.",
      );
    }
  }
}

if (failures.length > 0) {
  console.error(
    `FAIL: ${failures.length} shipped file(s) and the copy this repo runs have `
      + `drifted apart:\n${failures.join("\n")}\n`,
  );
  throw new Error(`${failures.length} drifted installed copy/copies`);
}

console.log(
  `ALL PASS (${checked} installed copies match what this repo ships), FAIL: 0`,
);

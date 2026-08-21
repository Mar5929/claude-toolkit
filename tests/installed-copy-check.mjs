#!/usr/bin/env node

/**
 * installed-copy-check.mjs: fail when a file this repo ships and the copy this
 * repo runs have drifted apart.
 *
 * Why this exists: this repo is set up with its own toolkit, the same way
 * Anchor, DragonFly, and Diligence Ready are. So it holds two of almost
 * everything. A rule under `plugins/project-init/library/rules/general/` is
 * what every other project receives, and its `.claude/rules/` counterpart is
 * the copy governing the session editing it. Change one and forget the other
 * and the repo starts telling other projects one thing while doing another.
 * That failure is silent: every other test passes, both files read fine on
 * their own, and nothing points at the pair.
 *
 * link-check.mjs asks whether what a file POINTS AT still exists.
 * orphan-check.mjs asks whether a file can still be FOUND.
 * This one asks whether two files that must say the same thing still do.
 *
 * Two things are checked.
 *
 * 1. Every tracked or new unignored file under `.claude/` that has a shipped
 *    original matches it byte for byte, ignoring line endings. This repo runs
 *    the shipped rules unmodified on purpose: it is the test of what it ships.
 *    A file under `.claude/` with no known original and no exemption fails, so
 *    a new copy cannot be added without being checked.
 *
 * 2. The block between the `shared-with-agents-md` markers is identical in
 *    `CLAUDE.md` and `AGENTS.md`, with no exceptions. Claude reads the first
 *    file and Codex reads the second, so a difference there means a session gets
 *    different instructions depending on which program it is.
 *
 * The root knowledge route is short enough to compare word for word. Host hook
 * wiring lives in settings files, outside the shared block. The project-local
 * index, layout, health, and startup scripts are also checked against the
 * second-brain package that other projects receive.
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
const SECOND_BRAIN = "plugins/second-brain";

/**
 * Where a file under `.claude/` came from. `null` means the file is this
 * repo's own and has no shipped original, which is allowed only for the files
 * listed here by name and the folders listed just below.
 */
const OWN_FILES = new Set([
  ".claude/rules/README.md",
  ".claude/settings.json",
  ".claude/toolkit-sync.md",
  ".claude/agents/product-manager.md",
]);

function shippedOriginalFor(path) {
  if (OWN_FILES.has(path)) return null;
  let match = path.match(/^\.claude\/rules\/(.+\.md)$/);
  if (match) return `${GENERAL_RULES}/${match[1]}`;
  match = path.match(/^\.claude\/output-styles\/(.+\.md)$/);
  if (match) return `plugins/project-init/library/output-styles/${match[1]}`;
  match = path.match(/^\.claude\/hooks\/(.+)$/);
  if (match && ["knowledge-session-start.mjs", "save-reminder.mjs"].includes(match[1])) {
    return `${SECOND_BRAIN}/hooks/${match[1]}`;
  }
  if (match) return `plugins/hooks-library/hooks/${match[1]}`;
  match = path.match(/^\.claude\/tools\/(.+)$/);
  if (match) return `${SECOND_BRAIN}/tools/${match[1]}`;
  return undefined;
}

/** Line endings differ between checkouts; the words are what must match. */
function read(path) {
  return readFileSync(resolve(root, path), "utf8").replace(/\r\n/g, "\n");
}

const tracked = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", ".claude"],
  {
    cwd: root,
    encoding: "utf8",
  },
)
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
  const missing = [
    claudeBlock === null ? "CLAUDE.md" : null,
    agentsBlock === null ? "AGENTS.md" : null,
  ]
    .filter(Boolean)
    .join(" and ");
  failures.push(
    `  ${missing}\n    is missing a shared-with-agents-md marker, so the two`
      + " root files cannot be\n    compared. Claude reads CLAUDE.md and Codex"
      + " reads AGENTS.md; the block\n    between the markers has to be in"
      + " both.",
  );
} else {
  checked++;
  if (claudeBlock !== agentsBlock) {
    failures.push(
      "  CLAUDE.md / AGENTS.md\n    the block between the markers differs"
        + " between them. Claude reads one file\n    and Codex reads the other,"
        + " so a session gets different instructions\n    depending on which"
        + " program it is. Copy the block across.",
    );
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
  `ALL PASS (${checked} checks: installed copies match what this repo ships, `
    + "and the two root instruction files agree), FAIL: 0",
);

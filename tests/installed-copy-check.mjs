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
 * Four things are checked.
 *
 * 1. Every tracked or new unignored file under `.claude/` that has a shipped
 *    original matches it byte for byte, ignoring line endings. This repo runs
 *    the shipped rules unmodified on purpose: it is the test of what it ships.
 *    A file under `.claude/` with no known original and no exemption fails, so
 *    a new copy cannot be added without being checked.
 *
 * 2. `AGENTS.md` is the single pointer line and nothing else. Codex reads that
 *    file, expands no import syntax, and follows a plain instruction to open
 *    another one. So anything written into it is a hand-maintained second copy
 *    of `CLAUDE.md` that drifts from the first.
 *
 * 3. The project knowledge operating manual matches the packaged template.
 *
 * 4. The default project file lifecycle rule and the Salesforce scaffold keep
 *    architecture, presentation deliverables, and retired material in the
 *    exact homes the owner approved.
 *
 * The project-local index builder, knowledge checker, frontmatter parser, and
 * the four knowledge hooks are also checked against the second-brain package
 * that other projects receive.
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
const OUTPUT_STYLES = "plugins/project-init/library/output-styles";
const MANAGED_COPIES = [
  [
    "knowledge/README.md",
    `${SECOND_BRAIN}/skills/second-brain/references/templates/knowledge/README.md`,
  ],
];

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
  match = path.match(/^\.claude\/hooks\/(.+)$/);
  const secondBrainHooks = [
    "knowledge-session-start.mjs",
    "save-reminder.mjs",
    "work-item-close.mjs",
    "command-parsing.mjs",
    "memory-reminder.mjs",
  ];
  if (match && secondBrainHooks.includes(match[1])) {
    return `${SECOND_BRAIN}/hooks/${match[1]}`;
  }
  if (match) return `plugins/hooks-library/hooks/${match[1]}`;
  match = path.match(/^\.claude\/tools\/(.+)$/);
  if (match) return `${SECOND_BRAIN}/tools/${match[1]}`;
  match = path.match(/^\.claude\/output-styles\/(.+\.md)$/);
  if (match) return `${OUTPUT_STYLES}/${match[1]}`;
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

for (const [installed, original] of MANAGED_COPIES) {
  if (!existsSync(resolve(root, installed)) || !existsSync(resolve(root, original))) {
    failures.push(
      `  ${installed}\n    cannot be compared with ${original} because one is missing.`,
    );
    continue;
  }
  checked++;
  if (read(installed) !== read(original)) {
    failures.push(
      `  ${installed}\n    no longer matches ${original}.\n`
        + "    The operating manual is managed by the toolkit and is not project-specific.",
    );
  }
}

const lifecycleRulePath = `${GENERAL_RULES}/project-file-lifecycle.md`;
const lifecycleRule = read(lifecycleRulePath);
const generalRulesIndex = read(`${GENERAL_RULES}/README.md`);
const salesforceScaffold = read(
  "plugins/project-init/skills/project-init/references/salesforce-project-scaffold.md",
);
const salesforceCompatibility = read(
  "plugins/project-init/library/rules/salesforce/delivery-and-knowledge-boundary.md",
);

const lifecycleChecks = [
  [
    lifecycleRule,
    "`<delivery-root>/architecture/<area>/`",
    `${lifecycleRulePath} does not keep active architecture in its approved home`,
  ],
  [
    lifecycleRule,
    "`<delivery-root>/deliverables/`",
    `${lifecycleRulePath} does not name the presentation deliverables home`,
  ],
  [
    lifecycleRule,
    "PowerPoints, executive summaries, and high-level project overviews only",
    `${lifecycleRulePath} no longer limits deliverables to presentation material`,
  ],
  [
    lifecycleRule,
    "Completion is not a reason to archive it.",
    `${lifecycleRulePath} no longer keeps current architecture after work closes`,
  ],
  [
    salesforceScaffold,
    "architecture/              # current detailed designs, grouped by area",
    "the Salesforce scaffold does not offer the architecture folder",
  ],
  [
    salesforceScaffold,
    "PowerPoints, executive summaries, and high-level project overviews only",
    "the Salesforce scaffold no longer limits deliverables to presentation material",
  ],
  [
    salesforceCompatibility,
    "The general `project-file-lifecycle.md` rule owns",
    "the Salesforce compatibility rule does not point to the general lifecycle authority",
  ],
];

for (const [content, required, message] of lifecycleChecks) {
  checked++;
  if (!content.includes(required)) failures.push(`  ${message}`);
}

const defaultStart = generalRulesIndex.indexOf("## Default ON");
const conditionalStart = generalRulesIndex.indexOf("## Conditional");
const lifecycleEntry = generalRulesIndex.indexOf("| `project-file-lifecycle.md`");
checked++;
if (
  defaultStart === -1
  || conditionalStart === -1
  || lifecycleEntry < defaultStart
  || lifecycleEntry > conditionalStart
) {
  failures.push(
    "  the general rules index does not list project-file-lifecycle.md as default ON",
  );
}

/**
 * AGENTS.md is one pointer line and nothing else. Codex reads it and expands no
 * import syntax, so anything written into it is a second copy of what CLAUDE.md
 * already says, maintained by hand, drifting from the first.
 */
const AGENTS_MD = "Read CLAUDE.md in this folder and follow it.";

checked++;
if (read("AGENTS.md").trim() !== AGENTS_MD) {
  failures.push(
    "  AGENTS.md\n    is not the single pointer line. Codex reads this file and"
      + " expands no import\n    syntax, so anything else here is a hand-copied"
      + " second CLAUDE.md that will\n    drift. The whole file has to be:\n"
      + `      ${AGENTS_MD}`,
  );
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
    + "the lifecycle homes agree, and AGENTS.md is still one line), FAIL: 0",
);

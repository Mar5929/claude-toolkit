#!/usr/bin/env node

/**
 * skill-copy-check.mjs: fail when the two installed copies of a project skill
 * differ, or when a library skill cannot be installed for both hosts.
 *
 * Why this exists: Claude Code reads project skills only from
 * `.claude/skills/<name>/`, and Codex reads them only from
 * `.agents/skills/<name>/`. `project-init` and `project-sync` therefore install
 * each project skill twice, as plain byte-identical copies. A symlink is not
 * used, because Git on Windows checks a symlink out as a plain text file. Two
 * copies drift the moment one is edited, and each host then follows a
 * different procedure with no error anywhere. This check finds that drift.
 * The decision is recorded on issue #396 (T12, approved 2026-09-22).
 *
 * It checks three things:
 *
 *   1. Every `.claude/skills/<name>/` that has a `.agents/skills/<name>/`
 *      beside it (same parent folder) holds the same files with the same
 *      bytes, and neither copy is a symlink.
 *   2. Every library skill under `plugins/project-init/library/skills/` uses
 *      only the `name` and `description` frontmatter keys (the keys both hosts
 *      read), its `name` matches its folder, and its description starts with
 *      "Use when" so both hosts can pick it without being named.
 *   3. Every `sf-*` skill a Salesforce library rule names exists in the
 *      library.
 *
 * Run: node tests/skill-copy-check.mjs
 */

import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const LIBRARY_SKILLS = "plugins/project-init/library/skills";
const SALESFORCE_RULES = "plugins/project-init/library/rules/salesforce";

const failures = [];
let checked = 0;

/** Tracked files plus new files not yet added, so an unstaged copy is seen. */
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { cwd: root, encoding: "utf8" },
)
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((path) => existsSync(join(root, path)));

/** Every file under a folder, as paths relative to that folder. */
function filesUnder(folder) {
  const prefix = `${folder}/`;
  return files
    .filter((path) => path.startsWith(prefix))
    .map((path) => path.slice(prefix.length))
    .sort();
}

// 1. Installed pairs.
const claudeSkillDirs = new Set();
for (const path of files) {
  const match = path.match(/^((?:.*\/)?)\.claude\/skills\/([^/]+)\//);
  if (match) claudeSkillDirs.add(`${match[1]}.claude/skills/${match[2]}`);
}

for (const claudeDir of [...claudeSkillDirs].sort()) {
  const agentsDir = claudeDir.replace(/\.claude\/skills\/([^/]+)$/, ".agents/skills/$1");
  if (!existsSync(join(root, agentsDir))) continue;
  checked++;

  for (const dir of [claudeDir, agentsDir]) {
    if (lstatSync(join(root, dir)).isSymbolicLink()) {
      failures.push(`  ${dir} is a symlink. Install a plain copy instead.`);
    }
  }

  const claudeFiles = filesUnder(claudeDir);
  const agentsFiles = filesUnder(agentsDir);
  const all = [...new Set([...claudeFiles, ...agentsFiles])].sort();
  for (const name of all) {
    const a = join(root, claudeDir, name);
    const b = join(root, agentsDir, name);
    if (!existsSync(a) || !existsSync(b)) {
      failures.push(
        `  ${name} is in only one of ${claudeDir}/ and ${agentsDir}/.`,
      );
      continue;
    }
    if (lstatSync(a).isSymbolicLink() || lstatSync(b).isSymbolicLink()) {
      failures.push(`  ${claudeDir}/${name} or its pair is a symlink.`);
      continue;
    }
    if (!readFileSync(a).equals(readFileSync(b))) {
      failures.push(
        `  ${claudeDir}/${name}\n    differs from ${agentsDir}/${name}.\n`
          + "    Both hosts must receive the same skill. Copy one over the other.",
      );
    }
  }
}

// 2. Library skills.
function frontmatter(text) {
  if (!text.startsWith("---\n")) return null;
  const end = text.indexOf("\n---", 4);
  if (end === -1) return null;
  const fields = {};
  for (const line of text.slice(4, end).split("\n")) {
    const m = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (m) fields[m[1]] = m[2].trim();
  }
  return fields;
}

const librarySkillNames = new Set();
const libraryRoot = join(root, LIBRARY_SKILLS);
if (existsSync(libraryRoot)) {
  for (const stack of readdirSync(libraryRoot, { withFileTypes: true })) {
    if (!stack.isDirectory()) continue;
    for (const skill of readdirSync(join(libraryRoot, stack.name), {
      withFileTypes: true,
    })) {
      if (!skill.isDirectory()) continue;
      const skillPath = join(libraryRoot, stack.name, skill.name, "SKILL.md");
      const shown = relative(root, skillPath);
      checked++;
      if (!existsSync(skillPath)) {
        failures.push(`  ${shown} is missing.`);
        continue;
      }
      librarySkillNames.add(skill.name);
      const fields = frontmatter(readFileSync(skillPath, "utf8"));
      if (!fields) {
        failures.push(`  ${shown} has no frontmatter on its first line.`);
        continue;
      }
      const extra = Object.keys(fields).filter(
        (key) => key !== "name" && key !== "description",
      );
      if (extra.length) {
        failures.push(
          `  ${shown} uses frontmatter only one host reads: ${extra.join(", ")}.\n`
            + "    Library skills carry only name and description.",
        );
      }
      if (fields.name !== skill.name) {
        failures.push(`  ${shown} name "${fields.name}" does not match its folder.`);
      }
      if (!/^Use when\b/.test(fields.description || "")) {
        failures.push(`  ${shown} description does not start with "Use when".`);
      }
    }
  }
}

// 3. Skills named by the Salesforce rules exist.
const rulesRoot = join(root, SALESFORCE_RULES);
if (existsSync(rulesRoot)) {
  for (const entry of readdirSync(rulesRoot)) {
    if (!entry.endsWith(".md")) continue;
    const text = readFileSync(join(rulesRoot, entry), "utf8");
    for (const m of text.matchAll(/`(sf-[a-z0-9-]+)`/g)) {
      checked++;
      if (!librarySkillNames.has(m[1])) {
        failures.push(
          `  ${SALESFORCE_RULES}/${entry} names skill ${m[1]}, which is not in ${LIBRARY_SKILLS}/.`,
        );
      }
    }
  }
}

if (failures.length) {
  console.error(`skill-copy-check: ${failures.length} problem(s)\n`);
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`skill-copy-check: ${checked} checks passed.`);

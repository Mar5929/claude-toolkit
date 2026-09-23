#!/usr/bin/env node

/**
 * startup-budget-check.mjs: fail when the text an agent receives at the start
 * of every session grows past its budget.
 *
 * Why this exists: issue #396 found about 19,100 words loaded at the start of
 * every DragonFly session: long rules, a long root AGENTS.md, and startup hooks
 * that asked for full reads of both manuals and the indexes. Agents skipped
 * required steps inside that volume. The cut brought the load down. Nothing
 * else stops it from growing back one reasonable paragraph at a time.
 *
 * "Startup text" is counted in words, split on whitespace:
 *
 * - every rule in `.claude/rules/` with no `paths:` frontmatter (a rule with
 *   `paths:` loads only when a matching file is read);
 * - the root `AGENTS.md`;
 * - the output of every SessionStart hook registered in
 *   `.claude/settings.json`;
 * - the three required reads: `SOUL.md`, `knowledge/project.md`, and
 *   `knowledge/memory/current.md`.
 *
 * The output style, skill descriptions, and Claude Code's own system prompt
 * are not counted. Per-message hook output is reported, not budgeted.
 *
 * Two profiles run by default:
 *
 * - `repo`: this repository as it runs itself.
 * - `general`: a new general project built from shipped files only: the
 *   default-on general rules, the sample AGENTS.md in `root-file-examples.md`,
 *   the Toolkit manual template, the knowledge templates, and both startup
 *   hooks. It measures what the toolkit adds, before the project writes its
 *   own SOUL, project map, and working memory.
 *
 * Measure a real project with:
 *   node tests/startup-budget-check.mjs --project <path> [--budget <words>]
 * The default budget for a real project is 4,300 words: the approved #396
 * target for DragonFly without its Salesforce rules.
 *
 * Run: node tests/startup-budget-check.mjs
 */

import { execSync } from "node:child_process";
import {
  cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Budgets in words. Set from the measured result after the #396 cut, with
 * headroom for ordinary growth of working memory. Raise one only with the
 * owner's approval, and record why in tests/AGENTS.md.
 */
const BUDGETS = { repo: 4500, general: 3000, project: 4300 };

const REQUIRED_READS = ["SOUL.md", "knowledge/project.md", "knowledge/memory/current.md"];

const words = (text) => text.split(/\s+/).filter(Boolean).length;

function read(path) {
  try { return readFileSync(path, "utf8"); } catch { return null; }
}

function isPathScoped(text) {
  const match = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n/);
  return Boolean(match && /^paths:/m.test(match[1]));
}

function markdownFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.name.endsWith(".md") ? [path] : [];
  });
}

function hookCommands(root, event) {
  const settings = read(join(root, ".claude/settings.json"));
  if (!settings) return [];
  const groups = JSON.parse(settings).hooks?.[event] ?? [];
  return groups
    .filter((group) => event !== "SessionStart" || !group.matcher
      || group.matcher.split("|").includes("startup"))
    .flatMap((group) => group.hooks ?? [])
    .filter((hook) => hook.type === "command")
    .map((hook) => [hook.command, ...(hook.args ?? []).map((arg) => `"${arg}"`)].join(" "));
}

function runHooks(root, event) {
  let output = "";
  for (const command of hookCommands(root, event)) {
    try {
      output += execSync(command, {
        cwd: root,
        env: { ...process.env, CLAUDE_PROJECT_DIR: root },
        input: JSON.stringify({ hook_event_name: event, source: "startup", cwd: root }),
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
        timeout: 10000,
      });
    } catch (error) {
      output += error.stdout ?? "";
    }
  }
  return output;
}

function measure(root) {
  const parts = [];
  for (const path of markdownFiles(join(root, ".claude/rules"))) {
    const text = read(path);
    if (!isPathScoped(text)) parts.push([relative(root, path), words(text)]);
  }
  parts.push(["AGENTS.md", words(read(join(root, "AGENTS.md")) ?? "")]);
  parts.push(["SessionStart hook output", words(runHooks(root, "SessionStart"))]);
  for (const path of REQUIRED_READS) parts.push([path, words(read(join(root, path)) ?? "")]);
  const total = parts.reduce((sum, [, count]) => sum + count, 0);
  const perMessage = words(runHooks(root, "UserPromptSubmit"));
  return { parts, total, perMessage };
}

/** A new general project assembled from the files the toolkit ships. */
function buildGeneralFixture() {
  const parent = mkdtempSync(join(tmpdir(), "startup-budget-"));
  const root = join(parent, "project");
  const general = join(repo, "plugins/project-init/library/rules/general");
  const templates = join(repo, "plugins/second-brain/skills/knowledge-setup/references/templates");
  mkdirSync(join(root, ".claude/rules"), { recursive: true });
  mkdirSync(join(root, "knowledge/memory"), { recursive: true });

  const readme = read(join(general, "README.md"));
  const defaultOn = readme.slice(readme.indexOf("## Default ON"));
  const section = defaultOn.slice(0, defaultOn.indexOf("\n## ", 5));
  for (const [, name] of section.matchAll(/^\| `([^`]+\.md)` \|/gm)) {
    cpSync(join(general, name), join(root, ".claude/rules", name));
  }

  const examples = read(join(repo, "plugins/project-init/skills/project-init/references/root-file-examples.md"));
  const sample = examples.match(/````markdown\n([\s\S]*?)\n````/);
  writeFileSync(join(root, "AGENTS.md"), sample ? sample[1] : "");
  writeFileSync(join(root, "CLAUDE.md"), "@AGENTS.md\n");

  cpSync(join(repo, "plugins/project-init/library/templates/toolkit-manual.md"),
    join(root, "knowledge/toolkit-manual.md"));
  cpSync(join(templates, "knowledge"), join(root, "knowledge"), { recursive: true });
  cpSync(join(templates, "SOUL.md"), join(root, "SOUL.md"));

  cpSync(join(repo, "plugins/second-brain/hooks"), join(root, ".claude/hooks"), { recursive: true });
  cpSync(join(repo, "plugins/project-init/library/hooks/toolkit-session-start.mjs"),
    join(root, ".claude/hooks/toolkit-session-start.mjs"));
  const hook = (name) => ({
    type: "command",
    command: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${name}"`,
    timeout: 10,
  });
  writeFileSync(join(root, ".claude/settings.json"), JSON.stringify({
    hooks: {
      SessionStart: [{
        matcher: "startup|resume|clear|compact",
        hooks: [hook("toolkit-session-start.mjs"), hook("knowledge-session-start.mjs")],
      }],
      UserPromptSubmit: [{ hooks: [hook("memory-reminder.mjs")] }],
    },
  }));
  return { root, cleanup: () => rmSync(parent, { recursive: true, force: true }) };
}

function report(name, result, budget) {
  const lines = result.parts.map(([part, count]) => `    ${String(count).padStart(6)}  ${part}`);
  const status = result.total <= budget ? "PASS" : "FAIL";
  console.log(`${status} ${name}: ${result.total} words at startup (budget ${budget}); `
    + `${result.perMessage} words per message, not budgeted\n${lines.join("\n")}`);
  return status === "PASS";
}

const args = process.argv.slice(2);
const projectIndex = args.indexOf("--project");
const budgetIndex = args.indexOf("--budget");
let ok = true;

if (projectIndex !== -1) {
  const root = resolve(args[projectIndex + 1]);
  const budget = budgetIndex !== -1 ? Number(args[budgetIndex + 1]) : BUDGETS.project;
  ok = report(relative(process.cwd(), root) || root, measure(root), budget);
} else {
  ok = report("repo", measure(repo), BUDGETS.repo) && ok;
  const fixture = buildGeneralFixture();
  try {
    ok = report("general", measure(fixture.root), BUDGETS.general) && ok;
  } finally {
    fixture.cleanup();
  }
}

if (!ok) {
  console.error("FAIL: startup text is over budget. Cut words, or move text into a skill, a"
    + " reference file, or a rule with paths:.");
  process.exitCode = 1;
}

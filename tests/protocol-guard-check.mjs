#!/usr/bin/env node

/**
 * protocol-guard-check.mjs: fail when the protocol-guard plugin no longer fits
 * the installed Claude Code, or when its protocol list names something that
 * does not exist.
 *
 * Why this exists: protocol-guard runs on Claude Code function hooks, an
 * early-access API whose declarations say it "may change between releases
 * without notice". A renamed event or field produces an engine that loads and
 * checks nothing. The protocol list is data that names an owner skill for each
 * required step, so a renamed skill would leave a check pointing at nothing.
 * Issue #396 (roadmap step 5, requirement 6) asks for both to fail here.
 *
 * Steps that need Claude Code are skipped, not failed, when `claude` is not
 * installed (for example on a Codex-only machine):
 *
 *   1. Regenerate the declarations with `/plugin-types` into the plugin's
 *      `.claude/types/` (ignored by Git) and type-check the engine and its
 *      tests with `tsc`.
 *   2. `claude plugin validate` the plugin and compare the events it hooks.
 *   3. Run the plugin's offline tests with `claude plugin test`.
 *
 * Steps that need only Node:
 *
 *   4. The default list parses, names are unique, every entry uses only known
 *      words, the test fixture is an exact copy, and every owner exists
 *      (a skill as `plugins/<plugin>/skills/<name>/SKILL.md`).
 *   5. The engine's shell reader and the command hooks' reader
 *      (`plugins/second-brain/hooks/command-parsing.mjs`) agree on which
 *      commands close an issue, merge or open a pull request.
 *
 * Run: node tests/protocol-guard-check.mjs
 */

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const plugin = join(root, "plugins/protocol-guard");
const env = { ...process.env, CLAUDE_CODE_ENABLE_FUNCTION_HOOKS: "1" };
const EXPECTED_HOOKS = "session.start, session.end, turn.start, session.compact, prompt.submit, classic.UserPromptSubmit, classic.Stop, skill.prompt, tool.call, turn.step, turn.complete";

const failures = [];
const notes = [];
const fail = (message) => failures.push(message);

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: "utf8", env, timeout: 180000, ...options });
}

// ---------- Claude Code steps ----------

const version = run("claude", ["--version"]);
if (version.error || version.status !== 0) {
  notes.push("SKIP: claude is not installed; steps 1 to 3 did not run.");
} else {
  const installed = version.stdout.trim().split(" ")[0];
  const readme = readFileSync(join(plugin, "README.md"), "utf8");
  const tested = /Last tested on Claude Code (\d+\.\d+\.\d+)/.exec(readme)?.[1];
  if (tested !== installed) notes.push(`NOTE: Claude Code ${installed} is installed; the README records ${tested ?? "no version"} as last tested. Re-run the print-mode tests and update the README.`);

  // 1. Declarations and type check.
  const scratch = mkdtempSync(join(tmpdir(), "protocol-guard-types-"));
  try {
    const gen = run("claude", ["-p", "/plugin-types"], { cwd: scratch });
    const types = join(scratch, ".claude/types");
    if (gen.status !== 0 || !existsSync(join(types, "claude-code.d.ts"))) {
      fail(`/plugin-types did not write declarations: ${(gen.stderr || gen.stdout).trim().slice(0, 300)}`);
    } else {
      mkdirSync(join(plugin, ".claude"), { recursive: true });
      rmSync(join(plugin, ".claude/types"), { recursive: true, force: true });
      cpSync(types, join(plugin, ".claude/types"), { recursive: true });
      let tsc = run("tsc", ["-p", join(plugin, "tsconfig.json")]);
      if (tsc.error) tsc = run("npx", ["--no-install", "tsc", "-p", join(plugin, "tsconfig.json")]);
      if (tsc.error) notes.push("SKIP: tsc is not installed; the type check did not run.");
      else if (tsc.status !== 0) fail(`The engine does not type-check against Claude Code ${installed}:\n${tsc.stdout}${tsc.stderr}`);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }

  // 2. Validate.
  const validate = run("claude", ["plugin", "validate", plugin]);
  const output = `${validate.stdout}${validate.stderr}`;
  if (validate.status !== 0 || !/Validation passed/.test(output)) fail(`claude plugin validate failed:\n${output}`);
  else if (!output.includes(`hooks: ${EXPECTED_HOOKS}`)) fail(`claude plugin validate lists different hooked events than expected:\n${output}`);

  // 3. Offline tests.
  const tests = run("claude", ["plugin", "test", plugin]);
  const testOut = `${tests.stdout}${tests.stderr}`;
  if (tests.status !== 0 || !/ 0 fail/.test(testOut)) fail(`claude plugin test failed:\n${testOut}`);
  else notes.push(`claude plugin test: ${/(\d+) pass/.exec(testOut)?.[1] ?? "?"} pass.`);
}

// ---------- 4. The protocol list ----------

const KNOWN_ON = ["write", "shell", "oneWriter", "turnEnd"];
const KNOWN_TURN_END = ["afterWorkItemChange", "afterWrite"];
function requireShape(r) {
  const keys = Object.keys(r ?? {}).sort().join(",");
  return ["never", "wrote", "ran", "opened,within", "opened,paths,within"].includes(keys);
}

let list;
try {
  list = JSON.parse(readFileSync(join(plugin, "protocols.default.json"), "utf8"));
} catch (error) {
  fail(`protocols.default.json does not parse: ${error.message}`);
}
if (list) {
  const names = list.protocols.map((p) => p.name);
  if (new Set(names).size !== names.length) fail(`Protocol names repeat: ${names.join(", ")}`);
  const skills = new Set();
  for (const pluginDir of readdirSync(join(root, "plugins"), { withFileTypes: true })) {
    const dir = join(root, "plugins", pluginDir.name, "skills");
    if (!pluginDir.isDirectory() || !existsSync(dir)) continue;
    for (const skill of readdirSync(dir)) if (existsSync(join(dir, skill, "SKILL.md"))) skills.add(skill);
  }
  for (const p of list.protocols) {
    for (const field of ["name", "why", "owner", "on", "require", "tell"]) if (p[field] === undefined) fail(`${p.name}: missing "${field}".`);
    for (const key of Object.keys(p.on ?? {})) if (!KNOWN_ON.includes(key)) fail(`${p.name}: unknown trigger word on.${key}.`);
    for (const key of Object.keys(p.on?.turnEnd ?? {})) if (!KNOWN_TURN_END.includes(key)) fail(`${p.name}: unknown trigger word on.turnEnd.${key}.`);
    for (const r of p.require ?? []) if (!requireShape(r)) fail(`${p.name}: unknown require entry ${JSON.stringify(r)}.`);
    if (p.owner?.skill !== undefined && !skills.has(p.owner.skill)) fail(`${p.name}: owner skill "${p.owner.skill}" has no plugins/*/skills/${p.owner.skill}/SKILL.md.`);
    if (p.owner?.file !== undefined && !existsSync(join(root, p.owner.file))) fail(`${p.name}: owner file "${p.owner.file}" does not exist.`);
  }
  const fixture = (await import(pathToFileURL(join(plugin, "tests/defaults.fixture.mjs")).href)).default;
  if (!isDeepStrictEqual(fixture, list)) fail("plugins/protocol-guard/tests/defaults.fixture.mjs differs from protocols.default.json. Copy the list into the fixture.");
}

// ---------- 5. Both shell readers agree ----------

const reader = await import(pathToFileURL(join(plugin, "hooks/shell-reader.mjs")).href);
const parsing = await import(pathToFileURL(join(root, "plugins/second-brain/hooks/command-parsing.mjs")).href);
const COMMANDS = [
  "gh issue close 12",
  "gh  issue   close 12 --comment done",
  "GH_TOKEN=x gh issue close 12",
  "cd /tmp && gh issue close 12",
  "git status && gh pr merge 5 --squash",
  "gh pr create --title t --body b",
  'git commit -m "then gh issue close 12"',
  "echo 'gh pr merge 5'",
  "gh issue view 12",
  "gh pr view 5 && gh pr checks 5",
  "cat <<'EOF'\ngh issue close 1\nEOF",
  "ls; gh issue close 3",
  "gh issue close 3 | tee log.txt",
];
const readerSays = (command, sub) => reader.readCommand(command).commands.some((c) => c.program === "gh" && c.args[0] === sub[0] && c.args[1] === sub[1]);
for (const command of COMMANDS) {
  const pairs = [
    [["issue", "close"], [/^gh +issue +close\b/]],
    [["pr", "merge"], [/^gh +pr +merge\b/]],
    [["pr", "create"], parsing.OPENS_PULL_REQUEST],
  ];
  for (const [sub, patterns] of pairs) {
    const a = readerSays(command, sub);
    const b = parsing.matchesAny(command, patterns);
    if (a !== b) fail(`Shell readers disagree on "gh ${sub.join(" ")}" for ${JSON.stringify(command)}: engine ${a}, command hooks ${b}.`);
  }
}

for (const note of notes) console.log(note);
if (failures.length > 0) {
  for (const f of failures) console.error(`FAIL: ${f}`);
  console.error(`FAIL: ${failures.length}`);
  process.exit(1);
}
console.log("ALL PASS (protocol-guard: declarations, validation, offline tests, protocol list and owners, shell readers), FAIL: 0");

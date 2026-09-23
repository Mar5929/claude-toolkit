import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import {
  toolkitOrientation, manualSummary, DEFAULT_SUMMARY, SUMMARY_WORD_LIMIT,
} from "../plugins/project-init/library/hooks/toolkit-session-start.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(repo, "plugins/project-init/library/hooks/toolkit-session-start.mjs");
const template = join(repo, "plugins/project-init/library/templates/toolkit-manual.md");
const words = (text) => text.split(/\s+/).filter(Boolean).length;

function fixture(run) {
  const parent = mkdtempSync(join(tmpdir(), "toolkit-orientation-"));
  const root = join(parent, "project with spaces");
  mkdirSync(join(root, "knowledge"), { recursive: true });
  mkdirSync(join(root, ".claude/hooks"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "## Startup\n\n- Read `SOUL.md`.\n");
  writeFileSync(join(root, "CLAUDE.md"), "@AGENTS.md\n");
  copyFileSync(source, join(root, ".claude/hooks/toolkit-session-start.mjs"));
  copyFileSync(template, join(root, "knowledge/toolkit-manual.md"));
  try { run(root, parent); } finally { rmSync(parent, { recursive: true, force: true }); }
}
function execute(root, cwd = root) {
  const env = { ...process.env };
  delete env.CLAUDE_PROJECT_DIR;
  delete env.CODEX_PROJECT_DIR;
  return execFileSync(process.execPath, [join(root, ".claude/hooks/toolkit-session-start.mjs")], {
    cwd, env, input: JSON.stringify({ hook_event_name: "SessionStart" }), encoding: "utf8",
  });
}

test("startup output is the manual Summary, short, with no full-read or acknowledgment request", () => fixture((root) => {
  const output = toolkitOrientation(root);
  assert.match(output, /Paths resolve from the project root/);
  assert.match(output, /open the `work` skill/);
  assert.match(output, /is reference/);
  assert.ok(words(output) <= 100, `${words(output)} words`);
  assert.ok(!/acknowledg/i.test(output));
  assert.ok(!/completely|read all of/i.test(output));
}));

test("the template Summary and the built-in default say the same thing", () => {
  assert.equal(manualSummary(readFileSync(template, "utf8")), DEFAULT_SUMMARY);
});

test("a large manual body never reaches the output, and a long Summary is cut", () => fixture((root) => {
  const file = join(root, "knowledge/toolkit-manual.md");
  const before = toolkitOrientation(root);
  writeFileSync(file, `${readFileSync(file, "utf8")}\n${"PRIVATE_BODY_SENTINEL\n".repeat(20000)}`);
  assert.equal(toolkitOrientation(root), before);
  writeFileSync(file, `# Manual\n\n## Summary\n\n${"word ".repeat(500)}\n\n## Next\n\nPRIVATE_BODY_SENTINEL\n`);
  const cut = toolkitOrientation(root);
  assert.ok(!cut.includes("PRIVATE_BODY_SENTINEL"));
  assert.match(cut, new RegExp(`cut at ${SUMMARY_WORD_LIMIT} words`));
  assert.ok(words(cut) < SUMMARY_WORD_LIMIT + 30);
}));

test("a manual without a Summary section falls back to the built-in default", () => fixture((root) => {
  writeFileSync(join(root, "knowledge/toolkit-manual.md"), "# Manual\n\nBody only.\n");
  assert.ok(toolkitOrientation(root).includes(DEFAULT_SUMMARY));
}));

for (const state of ["missing", "empty", "unreadable"]) {
  test(`${state} manual reports a gap`, () => fixture((root) => {
    const file = join(root, "knowledge/toolkit-manual.md");
    rmSync(file);
    if (state === "empty") writeFileSync(file, "  \n");
    if (state === "unreadable") mkdirSync(file);
    const output = toolkitOrientation(root);
    assert.match(output, new RegExp(`manual is ${state}`));
    assert.ok(output.includes(DEFAULT_SUMMARY));
  }));
}

test("missing root instructions are reported; optional Knowledge files are not required", () => fixture((root) => {
  rmSync(join(root, "CLAUDE.md")); rmSync(join(root, "AGENTS.md"));
  const output = toolkitOrientation(root);
  assert.match(output, /Root instructions are missing, empty, or unreadable: AGENTS\.md/);
  assert.ok(!output.includes("knowledge/knowledge-manual.md"));
}));

test("a CLAUDE.md holding anything but the import line is reported", () => fixture((root) => {
  writeFileSync(join(root, "CLAUDE.md"), "Read knowledge/toolkit-manual.md.\n");
  assert.match(toolkitOrientation(root), /CLAUDE\.md should hold the single line @AGENTS\.md/);
}));

test("a missing CLAUDE.md beside a present AGENTS.md is reported", () => fixture((root) => {
  rmSync(join(root, "CLAUDE.md"));
  assert.match(toolkitOrientation(root), /CLAUDE\.md should hold the single line @AGENTS\.md/);
}));

test("copied hook finds root from nested cwd and follows aliased paths", () => fixture((root, parent) => {
  const nested = join(root, "nested/deeper"); mkdirSync(nested, { recursive: true });
  const alias = join(parent, "alias"); symlinkSync(root, alias, "dir");
  const direct = execute(root, nested);
  assert.ok(!direct.includes("manual is missing"));
  assert.equal(execute(alias, nested), direct);
}));

test("both hosts register the hook once, at SessionStart only", () => {
  for (const file of [".claude/settings.json", ".codex/hooks.json"]) {
    const config = JSON.parse(readFileSync(join(repo, file), "utf8"));
    for (const [event, groups] of Object.entries(config.hooks)) {
      const matches = groups.flatMap(group => group.hooks
        .filter(hook => (hook.command ?? "").includes("toolkit-session-start.mjs"))
        .map(hook => ({ group, hook })));
      if (event !== "SessionStart") {
        assert.equal(matches.length, 0, `${file} ${event}`);
        continue;
      }
      assert.equal(matches.length, 1, `${file} ${event}`);
      for (const source of ["startup", "resume", "clear", "compact"]) {
        assert.ok(matches[0].group.matcher.split("|").includes(source));
      }
    }
  }
});

test("the hook README installs no per-message registration", () => {
  const readme = readFileSync(join(repo, "plugins/project-init/library/hooks/README.md"), "utf8");
  const blocks = readme.match(/```json[\s\S]*?```/g) ?? [];
  assert.ok(blocks.length >= 2);
  for (const block of blocks) assert.ok(!block.includes("UserPromptSubmit"));
});

test("reusable manual starts with a Summary and has no repository-only links", () => {
  const text = readFileSync(template, "utf8");
  assert.ok(!text.includes("../plugins/") && !text.includes("../docs/"));
  assert.match(text, /^# [^\n]+\n\n## Summary\n/);
  assert.match(text, /AGENTS\.md/);
  assert.match(text, /chosen tracker/);
  assert.match(text, /Knowledge|knowledge/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { toolkitOrientation } from "../plugins/project-init/library/hooks/toolkit-session-start.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(repo, "plugins/project-init/library/hooks/toolkit-session-start.mjs");
function fixture(run) {
  const parent = mkdtempSync(join(tmpdir(), "toolkit-orientation-"));
  const root = join(parent, "project with spaces");
  mkdirSync(join(root, "knowledge"), { recursive: true });
  mkdirSync(join(root, ".claude/hooks"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "Read knowledge/toolkit-manual.md completely.\n");
  writeFileSync(join(root, "CLAUDE.md"), "@AGENTS.md\n");
  copyFileSync(source, join(root, ".claude/hooks/toolkit-session-start.mjs"));
  copyFileSync(join(repo, "plugins/project-init/library/templates/toolkit-manual.md"), join(root, "knowledge/toolkit-manual.md"));
  try { run(root, parent); } finally { rmSync(parent, { recursive: true, force: true }); }
}
function execute(root, event, cwd = root) {
  const env = { ...process.env };
  delete env.CLAUDE_PROJECT_DIR;
  delete env.CODEX_PROJECT_DIR;
  return execFileSync(process.execPath, [join(root, ".claude/hooks/toolkit-session-start.mjs")], {
    cwd, env, input: JSON.stringify({ hook_event_name: event }), encoding: "utf8",
  });
}

test("large manuals stay on disk and output requires complete reads with recovery", () => fixture((root) => {
  const before = toolkitOrientation(root);
  writeFileSync(join(root, "knowledge/toolkit-manual.md"), "PRIVATE_BODY_SENTINEL\n".repeat(20000));
  const after = toolkitOrientation(root);
  assert.equal(after, before);
  assert.ok(after.length < 2500);
  assert.ok(!after.includes("PRIVATE_BODY_SENTINEL"));
  assert.match(after, /bounded file chunks/);
  assert.match(after, /after resume, clear, or compaction/);
  assert.match(after, /After the required reads/);
}));

for (const state of ["missing", "empty", "unreadable"]) {
  test(`${state} manual reports a gap without claiming readiness`, () => fixture((root) => {
    const file = join(root, "knowledge/toolkit-manual.md");
    rmSync(file);
    if (state === "empty") writeFileSync(file, "  \n");
    if (state === "unreadable") mkdirSync(file);
    for (const event of ["SessionStart", "UserPromptSubmit"]) {
      assert.match(toolkitOrientation(root, event), new RegExp(`manual is ${state}`));
      assert.match(toolkitOrientation(root, event), /Do not claim the orientation was read/);
    }
  }));
}

test("missing root instructions are reported; optional Knowledge is not invented", () => fixture((root) => {
  rmSync(join(root, "CLAUDE.md")); rmSync(join(root, "AGENTS.md"));
  assert.match(toolkitOrientation(root), /Required root guidance is missing, empty, or unreadable: AGENTS\.md/);
  assert.match(toolkitOrientation(root), /does not enable optional components/);
  assert.ok(!toolkitOrientation(root).includes("knowledge/knowledge-manual.md"));
}));

test("actual event input selects prompt reminder without another acknowledgment", () => fixture((root) => {
  const prompt = execute(root, "UserPromptSubmit");
  assert.match(prompt, /Toolkit workflow reminder/);
  assert.ok(!prompt.includes("acknowledge"));
  assert.ok(prompt.length < 1000);
  assert.match(execute(root, "SessionStart"), /After the required reads/);
}));

test("a present CLAUDE.md import does not conceal missing AGENTS.md content", () => fixture((root) => {
  rmSync(join(root, "AGENTS.md"));
  for (const event of ["SessionStart", "UserPromptSubmit"]) {
    const output = toolkitOrientation(root, event);
    assert.match(output, /Required root guidance is missing, empty, or unreadable: AGENTS\.md/);
    assert.ok(!output.includes("Read the project's AGENTS.md and follow it."));
  }
}));

test("a CLAUDE.md holding anything but the import line is reported", () => fixture((root) => {
  writeFileSync(join(root, "CLAUDE.md"), "Read knowledge/toolkit-manual.md completely.\n");
  for (const event of ["SessionStart", "UserPromptSubmit"]) {
    assert.match(toolkitOrientation(root, event), /CLAUDE\.md should hold the single line @AGENTS\.md/);
  }
}));

test("a missing CLAUDE.md beside a present AGENTS.md is reported", () => fixture((root) => {
  rmSync(join(root, "CLAUDE.md"));
  for (const event of ["SessionStart", "UserPromptSubmit"]) {
    assert.match(toolkitOrientation(root, event), /CLAUDE\.md should hold the single line @AGENTS\.md/);
  }
}));

test("copied hook finds root from nested cwd and follows aliased paths", () => fixture((root, parent) => {
  const nested = join(root, "nested/deeper"); mkdirSync(nested, { recursive: true });
  const alias = join(parent, "alias"); symlinkSync(root, alias, "dir");
  const direct = execute(root, "SessionStart", nested);
  assert.ok(!direct.includes("manual is missing"));
  assert.equal(execute(alias, "SessionStart", nested), direct);
}));

test("both hosts register startup recovery and prompt routes exactly once", () => {
  for (const file of [".claude/settings.json", ".codex/hooks.json"]) {
    const config = JSON.parse(readFileSync(join(repo, file), "utf8"));
    for (const event of ["SessionStart", "UserPromptSubmit"]) {
      const matches = config.hooks[event].flatMap(group => group.hooks
        .filter(hook => hook.command.includes("toolkit-session-start.mjs"))
        .map(hook => ({ group, hook })));
      assert.equal(matches.length, 1, `${file} ${event}`);
      if (event === "SessionStart") {
        for (const source of ["startup", "resume", "clear", "compact"]) {
          assert.ok(matches[0].group.matcher.split("|").includes(source));
        }
      }
    }
  }
});

test("reusable manual has no unresolved repository-only Markdown links", () => {
  const text = readFileSync(join(repo, "plugins/project-init/library/templates/toolkit-manual.md"), "utf8");
  assert.ok(!text.includes("../plugins/") && !text.includes("../docs/"));
  assert.match(text, /AGENTS\.md/);
  assert.match(text, /chosen tracker/);
  assert.match(text, /Knowledge|knowledge/);
});

#!/usr/bin/env node

import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const plugin = resolve(root, "plugins/second-brain");
const references = resolve(plugin, "skills/second-brain/references");
const templates = resolve(references, "templates");
let passed = 0;

function read(path) {
  // Tolerate Windows line endings: a checkout with core.autocrlf on has \r\n.
  return readFileSync(resolve(root, path), "utf8").replace(/\r\n/g, "\n");
}

function readAbsolute(path) {
  return readFileSync(path, "utf8");
}

function ok(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed++;
  console.log(`PASS: ${message}`);
}

function includes(path, text, message) {
  ok(read(path).includes(text), message);
}

function excludes(path, text, message) {
  ok(!read(path).includes(text), message);
}

const secondBrainSkill =
  "plugins/second-brain/skills/second-brain/SKILL.md";
const rememberSkill = "plugins/second-brain/skills/remember/SKILL.md";
const rule =
  "plugins/second-brain/skills/second-brain/references/second-brain-rule.md";
const role = "plugins/second-brain/agents/memory-verifier.md";
const reference =
  "plugins/second-brain/skills/second-brain/references/second-brain-reference.md";
const indexBuilder = "plugins/second-brain/tools/memory-index-build.mjs";
const shapeCheck = "plugins/second-brain/tools/memory-shape-check.mjs";
const adoption =
  "plugins/second-brain/skills/second-brain/references/adoption-guide.md";
const layout =
  "plugins/second-brain/skills/second-brain/references/folder-layout.md";
const schemas =
  "plugins/second-brain/skills/second-brain/references/markdown-schemas.md";
const orientation =
  "plugins/second-brain/skills/second-brain/references/orientation-snippet.md";
const projectInit = "plugins/project-init/skills/project-init/SKILL.md";
const projectSync = "plugins/project-init/skills/project-sync/SKILL.md";
const grillMe = "plugins/grill-me/skills/grill-me/SKILL.md";
const wrapUp =
  "plugins/project-init/library/rules/general/wrap-up-ritual.md";
const parallelSessions =
  "plugins/project-init/library/rules/general/parallel-agent-sessions.md";

includes(
  secondBrainSkill,
  "production-ready project memory",
  "second-brain reports v3 as shipped",
);
includes(
  secondBrainSkill,
  "one coherent system",
  "second-brain installs one coherent core",
);
includes(
  secondBrainSkill,
  "The main agent owns whether what gets written is true",
  "second-brain puts correctness on the main agent",
);
includes(
  secondBrainSkill,
  "invoke the memory verifier and wait",
  "second-brain checks the draft before the owner sees it",
);
// These three used to assert the skill restated the rule's completion review.
// It now points at the rule instead, because three slightly different wordings
// of one rule is how they drifted apart. Same number of checks, aimed at where
// each truth actually lives.
includes(
  rule,
  "yes-or-no question is not approval",
  "rule states that a yes-or-no question is not approval",
);
includes(
  secondBrainSkill,
  "That rule owns when the check runs",
  "second-brain skill defers to the rule instead of restating it",
);
excludes(
  secondBrainSkill,
  "opened or merged",
  "second-brain skill carries no stale pull request timing",
);
includes(
  secondBrainSkill,
  "Review parallel memory before merge",
  "second-brain reviews parallel semantic conflicts before merge",
);
includes(
  secondBrainSkill,
  "keep the task unfinished",
  "second-brain does not lose failed approved writes",
);
excludes(
  secondBrainSkill,
  "v3 is not shipped",
  "active second-brain skill has no unshipped claim",
);

includes(
  rememberSkill,
  "supplies approval to save",
  "remember treats clear owner instruction as approval",
);
includes(
  rememberSkill,
  "Check it before the owner sees it",
  "remember checks before the owner sees anything",
);
includes(
  rememberSkill,
  "Show the real words",
  "remember shows the words that will be written, not a summary",
);
includes(
  rememberSkill,
  "take the smallest path",
  "remember has a smallest path for a one-line save",
);
includes(
  rememberSkill,
  "Do not use a parser",
  "remember uses AI judgment instead of a parser",
);
excludes(
  rememberSkill,
  "append-only",
  "remember does not make shared memory indexes immutable",
);
includes(
  rememberSkill,
  "keep the task unfinished",
  "remember does not lose a failed approved write",
);
excludes(
  rememberSkill,
  '"reason": "v1_retired"',
  "remember no longer returns the retirement result",
);

for (const type of [
  "context",
  "planning",
  "decisions",
  "knowledge",
  "references",
  "domain",
  "operations",
]) {
  includes(rule, `memory/${type}/`, `rule includes ${type} authority`);
  ok(
    existsSync(resolve(templates, "memory", type, "README.md")),
    `template includes memory/${type}/README.md`,
  );
}

includes(reference, "use judgment over these", "reference preserves AI judgment");
includes(rule, "no proposal limit", "rule has no proposal cap");
includes(
  rule,
  "at the moment its pull request is",
  "rule reviews at task completion",
);
// Was "unfinished work is handed", asserting handoffs were excluded. #130
// reversed that: a handoff is now the review moment with the most at stake,
// because a clear cannot be caught after it happens. Same check, opposite truth.
includes(
  rule,
  "when a session hands off to a fresh one",
  "rule reviews at a handoff",
);
includes(
  rule,
  "natural stopping point after meaningful work",
  "rule includes the natural stopping point",
);
includes(
  rule,
  "One review may satisfy several nearby stopping points",
  "rule prevents repeated unchanged reviews",
);
includes(
  rule,
  "creates no queue",
  "rule creates no hidden queue for deferred proposals",
);
includes(
  rule,
  "## Before a merge",
  "rule checks parallel semantic conflicts before merge",
);
includes(
  rule,
  "sized to the change",
  "rule scales the pre-merge review to the size of the change",
);
includes(
  rule,
  "keep the task\n  unfinished",
  "rule keeps failed approved updates unfinished",
);
includes(
  rule,
  "the tests together",
  "rule aligns requirements with implementation",
);
includes(
  reference,
  "Only these links are mandatory",
  "reference limits mandatory relationships",
);
includes(
  rule,
  "Status: Superseded",
  "rule defines supersession",
);
includes(
  reference,
  "Observed behavior, an agent",
  "reference distinguishes observation from inference",
);
includes(
  rule,
  "Each project repository owns",
  "rule keeps project memory local",
);
excludes(rule, "YAML frontmatter is required", "rule has no required YAML");

includes(role, "You check. You never write.", "verifier never writes");
includes(
  role,
  "Never use Write or Edit. You do not have them.",
  "verifier has no writing tools",
);
includes(
  role,
  "Bash is for reading only",
  "verifier's shell access is read-only",
);
excludes(
  role,
  "tools: Read, Write",
  "verifier is not granted Write in its frontmatter",
);
includes(role, "### It is in a file", "verifier checks the in-a-file source");
includes(role, "### The owner said it", "verifier checks what the owner said");
includes(
  role,
  "### The agent worked it out",
  "verifier separates what nobody can confirm",
);
includes(
  role,
  "Verdict `Unchecked`",
  "verifier marks an unconfirmable claim rather than dropping it",
);
includes(
  role,
  "Your report goes back to whoever called you",
  "verifier hands its report back without being asked",
);
includes(
  role,
  "Arithmetic and dates",
  "verifier rechecks the arithmetic that produced the nine-months error",
);
includes(
  role,
  "Does this already have a home?",
  "verifier looks for an existing home before a fact is proposed",
);
includes(role, "Never do these", "verifier declares prohibited actions");
includes(
  role,
  "duplicate and conflict review before a merge",
  "verifier can perform the read-only parallel review",
);
includes(
  role,
  "Size the review to the change",
  "verifier scales the pre-merge review",
);
includes(
  role,
  "Report the finding. Never perform the repair.",
  "verifier reports repairs instead of making them",
);

// The two scripts do the mechanical part, which is what stops an agent being
// asked to enforce a schema by reading a long rule.
includes(shapeCheck, "Basis:", "shape check enforces the source line");
includes(shapeCheck, "does not link to it", "shape check enforces the index entry");
includes(
  indexBuilder,
  "build the list of documents in every index from the",
  "index builder says its output comes from the documents",
);
includes(
  indexBuilder,
  "is left exactly as it is",
  "index builder leaves hand-written prose alone",
);
includes(rule, "memory-index-build.mjs", "rule names the index builder");
includes(rule, "memory-shape-check.mjs", "rule names the shape check");
includes(rule, "second-brain-reference.md", "rule points at the longer reference");
ok(
  read(rule).split("\n").length < 400,
  "the always-loaded rule stays short enough to load every session",
);

includes(
  adoption,
  "Brownfield read-only audit",
  "adoption begins brownfield work read-only",
);
includes(adoption, "Keep and link", "adoption supports keeping good homes");
includes(adoption, "Move with approval", "adoption gates moves");
includes(
  adoption,
  "Consolidate with approval",
  "adoption gates consolidation",
);
includes(
  adoption,
  "Leave unresolved",
  "adoption preserves uncertainty",
);
includes(
  adoption,
  "V1 content is not a migration source",
  "adoption rejects automatic v1 migration",
);
includes(
  adoption,
  "initial memory pass",
  "adoption offers initial memory population",
);

includes(layout, "Complete core", "layout defines the complete core");
includes(
  layout,
  "Do not offer partial variants",
  "layout rejects partial installations",
);
includes(
  layout,
  "Do not invent empty",
  "layout avoids hypothetical system areas",
);
includes(
  layout,
  "populated area without an index",
  "layout requires indexes for populated memory areas",
);

includes(
  projectInit,
  "complete Git-native second-brain v3",
  "project-init offers complete v3",
);
excludes(
  projectInit,
  "v3 is specified but not shipped",
  "project-init no longer defers v3",
);
includes(
  projectInit,
  "included with second-brain v3",
  "project-init does not create a second knowledge layer",
);
includes(
  projectSync,
  "Second-brain v3 status",
  "project-sync audits v3",
);
includes(
  projectSync,
  "brownfield adoption guide",
  "project-sync adopts v3 through its canonical guide",
);
includes(
  projectSync,
  "does not block v3 adoption",
  "project-sync separates v1 wiring from v3 adoption",
);
includes(
  grillMe,
  "brainstorms/README.md",
  "grill-me indexes v3 brainstorms",
);
includes(
  grillMe,
  "end-of-interview durable",
  "grill-me proposes durable outcomes at completion",
);
includes(
  grillMe,
  "write only its non-authoritative",
  "grill-me limits its direct writes to raw checkpoints",
);
// Searched without the line break it used to carry. Where the sentence wraps is
// not the behavior being tested, and a rewrite of the surrounding paragraph
// moved the break.
includes(
  wrapUp,
  "stopping point after meaningful work",
  "wrap-up uses the natural stopping point",
);
includes(
  wrapUp,
  "parallel duplicate and conflict",
  "wrap-up invokes the parallel-memory review before merge",
);
includes(
  parallelSessions,
  "Shared does not mean immutable",
  "parallel-session safety still permits approved memory maintenance",
);
excludes(
  parallelSessions,
  "Shared index files are append-only",
  "parallel-session rule no longer freezes memory indexes",
);

const requiredTemplates = [
  "brainstorms/README.md",
  "specs/README.md",
  "memory/README.md",
  "memory/context/README.md",
  "memory/planning/README.md",
  "memory/decisions/README.md",
  "memory/knowledge/README.md",
  "memory/references/README.md",
  "memory/domain/README.md",
  "memory/operations/README.md",
];

for (const path of requiredTemplates) {
  ok(existsSync(resolve(templates, path)), `core template exists: ${path}`);
}

const fixture = mkdtempSync(join(tmpdir(), "second-brain-v3-"));
try {
  cpSync(templates, fixture, { recursive: true });
  mkdirSync(resolve(fixture, ".claude/rules"), { recursive: true });
  mkdirSync(resolve(fixture, ".claude/agents"), { recursive: true });
  mkdirSync(resolve(fixture, ".claude/references"), { recursive: true });
  mkdirSync(resolve(fixture, ".claude/tools"), { recursive: true });
  cpSync(resolve(references, "second-brain-rule.md"),
    resolve(fixture, ".claude/rules/second-brain.md"));
  cpSync(resolve(references, "second-brain-reference.md"),
    resolve(fixture, ".claude/references/second-brain-reference.md"));
  cpSync(resolve(plugin, "agents/memory-verifier.md"),
    resolve(fixture, ".claude/agents/memory-verifier.md"));
  for (const tool of ["memory-index-build.mjs", "memory-shape-check.mjs"]) {
    cpSync(resolve(plugin, "tools", tool), resolve(fixture, ".claude/tools", tool));
  }

  const orientationText = readAbsolute(resolve(references,
    "orientation-snippet.md"));
  // Tolerate Windows line endings: a checkout with core.autocrlf on has \r\n.
  const snippetMatch = orientationText.match(
    /```markdown\r?\n([\s\S]*?)\r?\n```/,
  );
  ok(Boolean(snippetMatch), "orientation source contains copy-ready Markdown");
  writeFileSync(resolve(fixture, "CLAUDE.md"), snippetMatch[1]);
  writeFileSync(resolve(fixture, "AGENTS.md"), snippetMatch[1]);

  for (const path of [
    ...requiredTemplates,
    ".claude/rules/second-brain.md",
    ".claude/references/second-brain-reference.md",
    ".claude/agents/memory-verifier.md",
    ".claude/tools/memory-index-build.mjs",
    ".claude/tools/memory-shape-check.mjs",
    "CLAUDE.md",
    "AGENTS.md",
  ]) {
    ok(existsSync(resolve(fixture, path)), `greenfield core installs ${path}`);
  }

  ok(
    readAbsolute(resolve(fixture, "CLAUDE.md"))
      === readAbsolute(resolve(fixture, "AGENTS.md")),
    "Claude and Codex receive identical memory orientation",
  );
  ok(
    readAbsolute(resolve(fixture, "CLAUDE.md"))
      .includes(".claude/rules/second-brain.md"),
    "cold agents route to the canonical rule",
  );
  ok(
    !existsSync(resolve(fixture, "specs/billing"))
      && !existsSync(resolve(fixture, "memory/knowledge/billing")),
    "greenfield core creates no hypothetical system areas",
  );
  // The memory core ships no hooks of its own. This is not a claim that the
  // project has no hooks: hooks-library installs into the same .claude/hooks,
  // and a hook that enforces a rule or starts a review is not a v3 violation.
  // What v3 still forbids is a hook that writes memory.
  ok(
    !existsSync(resolve(fixture, ".claude/hooks"))
      && !existsSync(resolve(fixture, "scripts"))
      && !existsSync(resolve(fixture, ".mcp.json")),
    "greenfield memory core installs no hooks, runtime scripts, or memory MCP",
  );

  // The index list is generated, not typed. Build it in the fixture the way a
  // real save does, then confirm every typed home turns up in it. Asserting
  // against a hand-typed list would test the very thing this replaced.
  execFileSync(
    process.execPath,
    [resolve(fixture, ".claude/tools/memory-index-build.mjs")],
    { cwd: fixture, encoding: "utf8" },
  );
  const memoryIndex = readAbsolute(resolve(fixture, "memory/README.md"));
  for (const type of [
    "context",
    "planning",
    "decisions",
    "knowledge",
    "references",
    "domain",
    "operations",
  ]) {
    ok(
      memoryIndex.includes(`(${type}/README.md)`),
      `memory index links to ${type}`,
    );
  }
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

const secondBrainClaude = JSON.parse(
  read("plugins/second-brain/.claude-plugin/plugin.json"),
);
const secondBrainCodex = JSON.parse(
  read("plugins/second-brain/.codex-plugin/plugin.json"),
);
const projectInitClaude = JSON.parse(
  read("plugins/project-init/.claude-plugin/plugin.json"),
);
const projectInitCodex = JSON.parse(
  read("plugins/project-init/.codex-plugin/plugin.json"),
);
const grillClaude = JSON.parse(
  read("plugins/grill-me/.claude-plugin/plugin.json"),
);
const grillCodex = JSON.parse(
  read("plugins/grill-me/.codex-plugin/plugin.json"),
);

ok(
  secondBrainClaude.version === secondBrainCodex.version,
  "second-brain plugin versions match",
);
ok(
  projectInitClaude.version === projectInitCodex.version,
  "project-init plugin versions match",
);
ok(
  grillClaude.version === grillCodex.version,
  "grill-me plugin versions match",
);

ok(
  // Windows returns backslashes from relative(); compare in one shape.
  relative(root, references).split(sep).join("/")
    .startsWith("plugins/second-brain/"),
  "canonical references stay inside the second-brain plugin",
);
includes(schemas, "Capability specification", "schemas include specifications");
includes(schemas, "Planning", "schemas include planning");
includes(
  schemas,
  "The `Basis:` line is mandatory",
  "schemas require the basis line",
);
includes(rule, "`Basis: Observed`", "rule defines the allowed basis values");
includes(
  rule,
  "Inferred, unconfirmed",
  "rule names the unconfirmed-inference basis",
);
includes(role, "Basis:", "verifier checks for the basis line");
includes(orientation, "Project memory and knowledge", "orientation is present");

// A memory document that has nowhere to put a link restates what it should
// have pointed at. Each memory template must end with a Related slot.
const relatedSlots = [
  ["<Where it applies and does not apply.>", "context"],
  ["  - Current status remains in the work tracker.", "planning"],
  ["- <What this enables, constrains, or requires.>", "decision"],
  ["<Where future work should use it and its limits.>", "knowledge"],
  ["<What it does not prove or what may change.>", "reference"],
  ["- <Easy-to-misunderstand case.>", "domain"],
  ["- <How to stop, reverse, or recover.>", "operations"],
];

for (const [lastLine, type] of relatedSlots) {
  includes(
    schemas,
    `${lastLine}\n\n## Related`,
    `${type} template ends with a Related slot`,
  );
}

includes(
  schemas,
  "not a\nfixed vocabulary",
  "schemas keep relationship labels open",
);
includes(
  schemas,
  "## Superseded documents",
  "schemas keep retained superseded documents indexed",
);
includes(
  reference,
  "## Repetition",
  "reference owns one home for what to do about repetition",
);
includes(
  reference,
  "otherwise restate, one direction",
  "reference makes the anti-duplication link mandatory",
);
includes(
  reference,
  "Labels are plain description, not a fixed vocabulary",
  "reference lists example labels without minting a vocabulary",
);
includes(
  orientation,
  "`Repetition` in",
  "root orientation points at the repetition rule",
);

// Nine checks used to live here, reading the four design documents under
// docs/second-brain-v3/. They existed to catch those documents drifting away
// from the shipped rule, the snippet, and the root files. Issue #144 deleted
// the design documents, so there is no second description left to drift: the
// shipped rule, its reference, the agent file, and the two scripts are the
// only description of the system now, and the checks above already cover them.

// V3 originally banned hooks outright, which conflated "nothing writes memory
// automatically" (still true, and why v1 was retired) with "no automation may
// enforce a rule" (over-reach). The approval promise is what must survive.
includes(
  rule,
  "Nothing reaches memory automatically",
  "rule keeps the approval promise",
);
includes(
  rule,
  "A hook never decides",
  "rule bounds what a hook may do",
);
excludes(rule, "a hook or timer fires", "rule no longer excludes hook triggers");
excludes(rule, "capture hook", "rule drops the blanket hook ban");
excludes(orientation, "capture hook", "root orientation drops the hook ban");
includes(
  orientation,
  "Nothing is remembered automatically",
  "root orientation keeps the approval promise",
);
includes(
  adoption,
  "no hook that writes memory was installed",
  "adoption audits hooks by what they write",
);

console.log(`ALL PASS (${passed} checks), FAIL: 0`);

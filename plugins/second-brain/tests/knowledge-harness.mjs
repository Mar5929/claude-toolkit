#!/usr/bin/env node

import {
  cpSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { buildIndex } from "../tools/build-knowledge-index.mjs";
import {
  formatHealthReport,
  formatPropertyReport,
  formatProvenanceReport,
  formatTagReport,
  focusHealthReport,
  inspectKnowledge,
} from "../tools/knowledge-health.mjs";
import {
  applyMigration,
  checkMigrationIntegrity,
  detectLayout,
  entitiesIn,
  planMigration,
  recordIdFor,
  rollbackMigration,
} from "../tools/knowledge-layout.mjs";
import { loadKnowledge } from "../hooks/knowledge-session-start.mjs";
import { buildMessage, opensPullRequest } from "../hooks/save-reminder.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const plugin = resolve(root, "plugins/second-brain");
const fixtures = [];
let passed = 0;

function ok(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed++;
  console.log(`PASS: ${message}`);
}

function fixture(name) {
  const path = mkdtempSync(join(realpathSync(tmpdir()), `second-brain-${name}-`));
  fixtures.push(path);
  return path;
}

function write(base, path, content = "") {
  const absolute = resolve(base, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
}

function read(base, path) {
  return readFileSync(resolve(base, path), "utf8");
}

function treeDigest(base) {
  const rows = [];
  const walk = (dir = "") => {
    for (const entry of readdirSync(resolve(base, dir), { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isSymbolicLink()) rows.push(`${path}:symlink:${readFileSync(resolve(base, path), "utf8")}`);
      else rows.push(`${path}:${createHash("sha256").update(readFileSync(resolve(base, path))).digest("hex")}`);
    }
  };
  walk();
  return createHash("sha256").update(rows.join("\n")).digest("hex");
}

function makeKnowledge(base) {
  write(base, "knowledge/project.md", "# What this project is\n\nA test project.\n");
  write(base, "knowledge/index.md", "# What this project has written down\n\nEmpty.\n");
  write(base, "knowledge/specs/.gitkeep");
  write(base, "knowledge/memory/tags.md", "# Memory tags\n\nNone yet.\n");
  write(base, "knowledge/brainstorms/.gitkeep");
}

function makeFlat(base, { alternativeProject = false } = {}) {
  if (alternativeProject) {
    write(
      base,
      "memory/planning/what-this-project-is.md",
      "# What this project is\n\nThe approved project frame.\n",
    );
  } else {
    write(base, "project.md", "# What this project is\n\nThe approved project frame.\n");
  }
  write(base, "memory/index.md", "# Old generated index\n\nGenerated.\n");
  write(base, "memory/tags.md", "# Memory tags\n\n- routing\n");
  write(
    base,
    "memory/decisions/keep-bytes.md",
    "---\nsource: user-said-it\ndate: 2026-08-11\nsession: test\ntags: [routing]\n---\n\n# Keep these bytes\n\nThis text has no links and must not change.\n",
  );
  write(
    base,
    "specs/app/capability.md",
    "# Capability\n\nThe capability works.\n\n[Root readme](../../README.md)\n\n[Binary evidence](../../evidence.bin)\n",
  );
  write(
    base,
    "brainstorms/2026-08-11-test.md",
    "# Raw notes\n\nUnchecked.\n\n```markdown\n[example](../specs/missing.md)\n```\n",
  );
  write(base, "README.md", "# Fixture\n\n[Capability](specs/app/capability.md)\n");
  write(base, "evidence.bin", "binary-shaped test evidence\n");
  write(base, ".claude/tools/build-memory-index.mjs", "// old generated-index tool\n");
  write(base, ".claude/skills/remember/SKILL.md", "# old local remember\n");
}

function makeRetired(base) {
  write(base, ".claude/rules/second-brain.md", "# Retired large rule\n");
  write(base, ".claude/agents/memory-verifier.md", "# Retired verifier\n");
  write(base, ".claude/tools/memory-index-build.mjs", "// retired\n");
  write(base, ".claude/tools/memory-shape-check.mjs", "// retired\n");
  for (const path of [
    "specs/README.md",
    "brainstorms/README.md",
    "memory/README.md",
    "memory/context/README.md",
    "memory/decisions/README.md",
    "memory/domain/README.md",
  ]) write(base, path, `# Retired index ${path}\n`);
  write(base, "specs/app/capability.md", "# Capability\n\nApproved behavior.\n");
  write(base, "brainstorms/2026-08-11-raw.md", "# Raw brainstorm\n\nUnchecked.\n");
  write(
    base,
    "memory/decisions/a-choice.md",
    "# A choice\n\nWhy it was made.\n\nBasis: Owner-confirmed 2026-08-01\n",
  );
}

try {
  // Package shape and retired machinery removal.
  for (const path of [
    "skills/second-brain/SKILL.md",
    "skills/remember/SKILL.md",
    "skills/recall/SKILL.md",
    "skills/cleanup/SKILL.md",
    "skills/session-search/SKILL.md",
    "skills/session-search/scripts/search-sessions.mjs",
    "tools/build-knowledge-index.mjs",
    "tools/knowledge-health.mjs",
    "tools/knowledge-layout.mjs",
    "hooks/knowledge-session-start.mjs",
    "hooks/save-reminder.mjs",
  ]) ok(existsSync(resolve(plugin, path)), `package contains ${path}`);

  for (const path of [
    "agents/memory-verifier.md",
    "tools/memory-index-build.mjs",
    "tools/memory-shape-check.mjs",
    "skills/second-brain/references/second-brain-rule.md",
  ]) ok(!existsSync(resolve(plugin, path)), `package excludes retired ${path}`);

  const claudeManifest = JSON.parse(readFileSync(resolve(plugin, ".claude-plugin/plugin.json")));
  const codexManifest = JSON.parse(readFileSync(resolve(plugin, ".codex-plugin/plugin.json")));
  ok(claudeManifest.version === "3.9.0", "Claude manifest is 3.9.0");
  ok(codexManifest.version === "3.9.0", "Codex manifest is 3.9.0");
  ok(claudeManifest.version === codexManifest.version, "plugin manifest versions match");
  const placementRule = "plugins/project-init/library/rules/general/where-persistent-information-belongs.md";
  ok(existsSync(resolve(root, placementRule)), "package contains the plainly named placement rule");
  ok(existsSync(resolve(root, ".claude/rules/where-persistent-information-belongs.md")), "repository runs the plainly named placement rule");
  ok(!existsSync(resolve(root, "plugins/project-init/library/rules/general/capture-the-thinking.md")), "package removes the unclear old placement-rule name");
  ok(!existsSync(resolve(root, ".claude/rules/capture-the-thinking.md")), "repository removes the unclear old placement-rule copy");

  // Check the storage places and the approval-bullet names only. Both are real
  // structure: a missing folder path sends saves to the wrong place, and a
  // missing bullet name changes what the owner is shown. Do not add checks that
  // only pin a sentence's wording; rewriting a sentence is not a defect.
  const rememberText = readFileSync(resolve(plugin, "skills/remember/SKILL.md"), "utf8");
  for (const expected of [
    "`knowledge/specs/`",
    "`knowledge/memory/context/`",
    "`knowledge/memory/decisions/`",
    "`knowledge/memory/domain/`",
    "`knowledge/memory/knowledge/`",
    "`knowledge/memory/operations/`",
    "`knowledge/memory/planning/`",
    "`knowledge/memory/references/`",
    "`knowledge/brainstorms/`",
    "- What:",
    "- Where:",
    "- Why:",
    "- Assumptions:",
    "- Unverified:",
  ]) ok(rememberText.toLowerCase().includes(expected.toLowerCase()), `remember carries ${expected}`);

  // The toolkit spec stays in this repository and remember ships to projects,
  // so each must carry its own copy of the property vocabulary. This keeps the
  // two copies from drifting apart on the field names themselves.
  const specText = readFileSync(resolve(root, "knowledge/specs/memory-system.md"), "utf8");
  for (const field of ["source:", "source-file:", "date:", "session:", "tags:", "superseded-by:"]) {
    ok(specText.includes(`\`${field}\``), `memory-system spec carries property ${field}`);
    ok(rememberText.includes(`\`${field}\``), `remember carries property ${field}`);
  }

  const activeSaveSurfaces = [
    "CLAUDE.md",
    "AGENTS.md",
    "knowledge/specs/memory-system.md",
    "plugins/second-brain/skills/remember/SKILL.md",
    "plugins/second-brain/skills/cleanup/SKILL.md",
    "plugins/second-brain/README.md",
    "plugins/session-skills/skills/handoff/SKILL.md",
    "plugins/session-skills/skills/grill-me/SKILL.md",
    "plugins/session-skills/README.md",
    "plugins/project-init/library/rules/general/offer-context-handoff.md",
    "plugins/project-init/library/rules/general/where-persistent-information-belongs.md",
    "plugins/project-init/skills/project-init/SKILL.md",
    "plugins/project-init/skills/project-init/references/setup-flow.md",
    "plugins/project-init/skills/project-init/references/thin-claudemd.md",
    "docs/toolkit-map.md",
  ].map((path) => readFileSync(resolve(root, path), "utf8").toLowerCase()).join("\n");
  // Only the deleted rule's file name is banned. It is a real path, so a
  // reference to it would be a broken pointer. Banned phrase lists were removed
  // on purpose: they fire on wording a future document is entitled to use.
  for (const forbidden of [
    "capture-the-thinking",
  ]) ok(!activeSaveSurfaces.includes(forbidden), `active save surfaces exclude ${forbidden}`);

  for (const [name, version] of [
    ["project-init", "0.49.0"],
    ["session-skills", "1.3.0"],
  ]) {
    const claude = JSON.parse(readFileSync(resolve(root, `plugins/${name}/.claude-plugin/plugin.json`)));
    const codex = JSON.parse(readFileSync(resolve(root, `plugins/${name}/.codex-plugin/plugin.json`)));
    ok(claude.version === version, `${name} Claude manifest is ${version}`);
    ok(codex.version === version, `${name} Codex manifest is ${version}`);
  }

  const template = resolve(plugin, "skills/second-brain/references/templates/knowledge");
  for (const path of [
    ".obsidian/app.json",
    "project.md",
    "index.md",
    "specs/.gitkeep",
    "brainstorms/.gitkeep",
    "memory/tags.md",
    "memory/context/.gitkeep",
    "memory/decisions/.gitkeep",
    "memory/domain/.gitkeep",
    "memory/knowledge/.gitkeep",
    "memory/operations/.gitkeep",
    "memory/planning/.gitkeep",
    "memory/references/.gitkeep",
  ]) ok(existsSync(resolve(template, path)), `greenfield template contains ${path}`);
  const obsidian = JSON.parse(readFileSync(resolve(template, ".obsidian/app.json")));
  ok(obsidian.alwaysUpdateLinks === true, "Obsidian updates links on rename");
  ok(obsidian.newLinkFormat === "relative", "Obsidian creates relative links");
  ok(obsidian.useMarkdownLinks === true, "Obsidian uses portable Markdown links");
  const emptyTags = readFileSync(resolve(template, "memory/tags.md"), "utf8");
  ok(emptyTags.includes("| Tag | Plain-language meaning |"), "greenfield tag vocabulary has the fixed empty table");
  ok(!emptyTags.includes("project-knowledge"), "greenfield tags do not inherit toolkit topics");

  // ---------------------------------------------------------------------------
  // The version 2 four-type tree, beside the version 1 tree above.
  //
  // This repository runs version 1 until the cutover work item, so every check
  // above still has to prove the version 1 tools it ships. The checks below add
  // the four-type tree the version 2 templates carry and pin what the version 1
  // tools do when they meet one, which is what stops the cutover discovering it
  // by accident. Both fixture sets stay until version 1 is removed.
  // ---------------------------------------------------------------------------
  const templateV2 = resolve(plugin, "skills/second-brain/references/templates-v2/knowledge");
  for (const path of [
    "project.md",
    "map.md",
    "current.md",
    "specs/.gitkeep",
    "memory/facts/.gitkeep",
    "memory/decisions/.gitkeep",
    "memory/events/.gitkeep",
    "memory/patterns/.gitkeep",
  ]) ok(existsSync(resolve(templateV2, path)), `version 2 template contains ${path}`);
  for (const path of [
    "index.md",
    "memory/tags.md",
    "memory/context/.gitkeep",
    "memory/domain/.gitkeep",
    "memory/knowledge/.gitkeep",
    "memory/operations/.gitkeep",
    "memory/planning/.gitkeep",
    "memory/references/.gitkeep",
    "brainstorms/.gitkeep",
  ]) ok(!existsSync(resolve(templateV2, path)), `version 2 template drops ${path}`);

  const v2Settings = readFileSync(resolve(templateV2, "project.md"), "utf8");
  for (const key of ["schema_version:", "project_id:", "project_root:", "privacy:"]) {
    ok(v2Settings.includes(key), `the version 2 project file carries ${key}`);
  }

  const rememberDraft = readFileSync(resolve(plugin, "skills/remember/SKILL-v2.md"), "utf8");
  for (const type of ["`fact`", "`decision`", "`event`", "`pattern`"]) {
    ok(rememberDraft.includes(type), `the remember draft routes saves to the ${type} type`);
  }
  for (const retired of [
    "knowledge/memory/context/",
    "knowledge/memory/domain/",
    "knowledge/memory/operations/",
    "knowledge/memory/planning/",
    "knowledge/memory/references/",
  ]) ok(!rememberDraft.includes(retired), `the remember draft no longer routes saves to ${retired}`);
  ok(
    readFileSync(resolve(plugin, "skills/remember/SKILL.md"), "utf8").includes("knowledge/memory/context/"),
    "the live remember skill still routes saves the version 1 way until the cutover",
  );

  // A version 2 project in front of the version 1 tools. The detector must not
  // read it as the version 1 knowledge layout, and the version 1 loader has to
  // degrade rather than throw. The `v2` detected state lands with the migration
  // engine in P4-1.
  const v2Project = fixture("v2");
  cpSync(templateV2, resolve(v2Project, "knowledge"), { recursive: true });
  write(
    v2Project,
    "knowledge/project.md",
    readFileSync(resolve(v2Project, "knowledge/project.md"), "utf8")
      .replace("replace-with-a-stable-project-id", "fixture-v2"),
  );
  ok(
    detectLayout(v2Project).layout === "v2",
    "the detector reports a version 2 tree as version 2, never as the version 1 layout",
  );
  const v2Startup = loadKnowledge(v2Project);
  ok(
    v2Startup.includes("knowledge/index.md is missing"),
    "the version 1 loader reports the generated index a version 2 project does not have",
  );
  ok(v2Startup.endsWith("\n"), "the version 1 loader still fails open on a version 2 tree");
  ok(
    !existsSync(resolve(v2Project, ".memory")),
    "reading a version 2 project with the version 1 tools creates no local state",
  );

  // Signature detector states.
  const none = fixture("none");
  ok(detectLayout(none).layout === "none", "detector reports none without signatures");

  const unknown = fixture("unknown");
  write(unknown, "memory/notes.md", "# Ordinary notes\n");
  ok(detectLayout(unknown).layout === "unknown", "ordinary similarly named folder is unknown");

  const newLayout = fixture("knowledge");
  makeKnowledge(newLayout);
  ok(detectLayout(newLayout).layout === "v1", "detector reports the complete version 1 knowledge layout");

  const flat = fixture("flat");
  makeFlat(flat);
  ok(detectLayout(flat).layout === "flat-149", "detector reports flat #149 from signatures");

  const retired = fixture("retired");
  makeRetired(retired);
  ok(detectLayout(retired).layout === "retired-v3", "detector reports retired v3 from signatures");

  const mixed = fixture("mixed");
  makeKnowledge(mixed);
  makeFlat(mixed);
  ok(detectLayout(mixed).layout === "mixed", "detector blocks mixed version 1 and flat layouts");

  const partialRetired = fixture("partial-retired");
  write(partialRetired, ".claude/rules/second-brain.md", "# Partial\n");
  ok(detectLayout(partialRetired).layout === "unknown", "partial retired runtime is unknown");

  // Generated index behavior.
  const indexed = fixture("index");
  makeKnowledge(indexed);
  write(
    indexed,
    "knowledge/specs/billing/invoice.md",
    "# Invoice generation\r\n\r\nInvoices are generated once.\r\n",
  );
  write(
    indexed,
    "knowledge/memory/decisions/use-flow.md",
    "---\nsource: user-said-it\ndate: 2026-08-11\nsession: test\ntags: [billing]\n---\n\n# Use a flow\n\nBilling uses a flow.\n\nDetailed body is not startup context.\n",
  );
  write(indexed, "knowledge/memory/knowledge/missing-title.md", "No title here.\n");
  write(indexed, "knowledge/brainstorms/raw.md", "# Raw\n\nDo not index.\n");
  const firstBuild = buildIndex(indexed);
  const firstIndex = read(indexed, "knowledge/index.md");
  const secondBuild = buildIndex(indexed);
  ok(firstBuild.count === 3 && secondBuild.count === 3, "index includes specs and memories only");
  ok(firstIndex === read(indexed, "knowledge/index.md"), "index output is deterministic");
  ok(firstIndex.includes("[Invoice generation](specs/billing/invoice.md)"), "index links from knowledge root");
  ok(firstIndex.includes("[Use a flow](memory/decisions/use-flow.md)"), "index skips memory YAML");
  ok(firstIndex.includes("[Missing Title](memory/knowledge/missing-title.md)"), "missing H1 falls back to readable name");
  ok(!firstIndex.includes("tags.md") && !firstIndex.includes("raw.md"), "index excludes tags and brainstorms");

  write(
    indexed,
    "knowledge/memory/decisions/old-choice.md",
    "---\nsource: owner-paraphrase\ndate: 2020-01-01\nsession: unavailable\ntags: [billing]\nsuperseded-by: use-flow.md\n---\n\n# Old choice\n\nRetained history.\n",
  );
  write(
    indexed,
    "knowledge/memory/decisions/current-empty-replacement.md",
    "---\nsource: owner-paraphrase\ndate: 2026-08-12\nsession: unavailable\ntags: [billing]\nsuperseded-by: \"\"\n---\n\n# Current empty replacement\n\nThis remains current.\n",
  );
  const supersededBuild = buildIndex(indexed);
  const supersededIndex = read(indexed, "knowledge/index.md");
  ok(supersededBuild.count === 4, "index excludes retained superseded memory");
  ok(!supersededIndex.includes("Old choice"), "superseded wording is absent from startup truth");
  ok(supersededIndex.includes("Current empty replacement"), "an empty optional replacement does not hide current memory");
  ok(!supersededIndex.includes("source:") && !supersededIndex.includes("tags:"), "index stays limited to titles, summaries, and links");

  // Startup is read-only, ordered, narrow, and fail-open.
  const startup = loadKnowledge(indexed);
  ok(startup.indexOf("knowledge/project.md") < startup.indexOf("knowledge/index.md"), "startup prints project before index");
  ok(!startup.includes("Detailed body is not startup context."), "startup does not load individual memories");
  const missingStartup = loadKnowledge(none);
  ok(missingStartup.includes("knowledge/project.md is missing"), "startup reports missing project file");
  ok(missingStartup.includes("knowledge/index.md is missing"), "startup reports missing index");

  // PR reminder detection remains narrow.
  ok(opensPullRequest("git push && gh pr create --fill"), "PR reminder detects gh pr create in a chain");
  ok(!opensPullRequest('echo "gh pr create"'), "PR reminder ignores quoted prose");
  ok(!opensPullRequest("gh pr create --help"), "PR reminder ignores help");
  ok(buildMessage().includes("Invoke /remember"), "PR reminder points at the packaged remember skill");
  ok(buildMessage().includes("What, Where, Why, Assumptions"), "PR reminder requests the short approval review");
  ok(!buildMessage().includes("exact words"), "PR reminder does not request full file text");

  // Fixed properties, project tags, provenance, and read-only health views.
  const healthy = fixture("health");
  makeKnowledge(healthy);
  write(
    healthy,
    "knowledge/memory/tags.md",
    [
      "# Memory tags",
      "",
      "| Tag | Plain-language meaning |",
      "| --- | --- |",
      "| `billing` | Billing behavior. |",
      "| `invoice` | Invoice behavior. |",
      "| `invoices` | Invoice behavior in plural. |",
      "| `unused` | A currently unused subject. |",
      "| `Salesforce` | Salesforce platform behavior. |",
      "| `account_owner` | Account ownership behavior. |",
      "| `billing` | A repeated definition that needs review. |",
      "",
    ].join("\n"),
  );
  write(healthy, "evidence.md", "# Evidence\n\nSupports the claim.\n");
  const outsideEvidence = fixture("outside-evidence");
  write(outsideEvidence, "source.md", "# Outside\n");
  symlinkSync(resolve(outsideEvidence, "source.md"), resolve(healthy, "linked-evidence.md"));
  const validMemories = [
    ["quote.md", "owner-quote", "billing", ""],
    ["paraphrase.md", "owner-paraphrase", "billing", ""],
    ["file.md", "read-from-file", "invoice", "source-file: evidence.md\n"],
    ["observed.md", "agent-observed", "billing", ""],
    ["unchecked.md", "agent-conclusion-unchecked", "billing", ""],
  ];
  for (const [name, source, tag, extra] of validMemories) {
    write(
      healthy,
      `knowledge/memory/knowledge/${name}`,
      `---\nsource: ${source}\n${extra}date: 2001-02-03\nsession: unavailable\ntags:\n  - ${tag}\n---\n\n# ${name}\n\nSummary.\n`,
    );
  }
  write(
    healthy,
    "knowledge/memory/knowledge/mixed-source.md",
    "---\nsource: owner-paraphrase\ndate: 2026-08-12\nsession: unavailable\ntags: [billing]\n---\n\n# Mixed source\n\n> Claim source: read-from-file; evidence.md\n\nA supported claim.\n\n```text\n> Claim source: read-from-file; missing-example.md\n```\n\n> Claim source: read-from-file; missing-claim.md\n\nAn unsupported claim.\n",
  );
  write(
    healthy,
    "knowledge/memory/knowledge/file-without-path.md",
    "---\nsource: read-from-file\ndate: 2026-08-12\nsession: unavailable\ntags: [invoice]\n---\n\n# Missing source path\n\nSummary.\n",
  );
  write(
    healthy,
    "knowledge/memory/knowledge/escaped-source.md",
    "---\nsource: read-from-file\nsource-file: linked-evidence.md\ndate: 2026-08-12\nsession: unavailable\ntags: [invoice]\n---\n\n# Escaped source\n\nSummary.\n",
  );
  write(
    healthy,
    "knowledge/memory/knowledge/directory-source.md",
    "---\nsource: read-from-file\nsource-file: knowledge\ndate: 2026-08-12\nsession: unavailable\ntags: [invoice]\n---\n\n# Directory source\n\nSummary.\n",
  );
  write(
    healthy,
    "knowledge/memory/knowledge/empty-optionals.md",
    "---\nsource: owner-paraphrase\nsource-file: \"\"\ndate: 2026-08-12\nsession: unavailable\ntags: [billing]\nsuperseded-by: \"\"\n---\n\n# Empty optional values\n\nSummary.\n",
  );
  write(
    healthy,
    "knowledge/memory/knowledge/invalid.md",
    "---\nsource: user-said-it\nsource-file: missing.md\ndate: 2026-02-30\nsession: current-session\ntags: [Billing, billing, billing, billing?, 123]\nsuperseded-by:\n  - bad.md\nrogue-field: true\n---\n\n# Invalid\n\nSummary.\n",
  );
  write(
    healthy,
    "knowledge/specs/yaml-is-not-for-specs.md",
    "---\nsource: owner-quote\n---\n\n# A specification\n\nApproved behavior.\n",
  );
  const healthBefore = treeDigest(healthy);
  const health = inspectKnowledge(healthy);
  const codes = new Set(health.warnings.map((item) => item.code));
  ok(health.summary.memories === 11, "health report inventories every memory");
  ok(health.tags.find((tag) => tag.name === "billing").count === 7, "tag view counts each memory once even when a tag repeats");
  ok(health.unusedTags.includes("unused"), "health report identifies unused approved tags");
  ok(health.overlappingTags.some(([left, right]) => left === "invoice" && right === "invoices"), "health report finds likely tag overlap");
  ok(health.overlappingTags.some(([left, right]) => left === "Billing" && right === "billing"), "tag overlap includes unapproved case variants");
  ok(codes.has("source-unchecked"), "unchecked agent conclusions are visible warnings");
  ok(codes.has("source-retired"), "retired source values are reported without rewriting");
  ok(codes.has("property-not-allowed"), "unknown properties are reported");
  ok(codes.has("property-type-invalid"), "non-tag properties must be one text value");
  ok(codes.has("property-empty"), "empty optional properties are reported");
  ok(codes.has("date-invalid"), "impossible calendar dates are reported");
  ok(codes.has("session-placeholder"), "session placeholders are reported");
  ok(codes.has("too-many-tags") && codes.has("tag-repeated") && codes.has("tag-invalid") && codes.has("tag-not-approved"), "tag shape and approval rules are checked");
  ok(!health.warnings.some((item) => item.code === "tag-definition-invalid" && /Salesforce|account_owner/.test(item.message)), "Obsidian-safe case and underscore tags remain valid");
  ok(codes.has("source-file-unexpected") && codes.has("source-file-broken"), "broken and forbidden provenance paths are reported");
  ok(codes.has("source-file-missing"), "read-from-file requires an exact repository path");
  ok(codes.has("source-file-outside-project"), "source-file symlinks cannot escape the repository");
  ok(codes.has("source-file-invalid"), "source-file must resolve to a file, not a directory");
  ok(codes.has("claim-source-file-broken"), "mixed-source claim paths are checked");
  ok(!health.warnings.some((item) => item.message.includes("missing-example.md")), "claim examples in fenced code are ignored");
  ok(codes.has("specification-has-frontmatter"), "specification YAML is reported");
  ok(codes.has("tag-definition-repeated"), "repeated tag definitions are reported");
  ok(!health.warnings.some((item) => item.path.endsWith("quote.md") && item.code.includes("date")), "an old valid date creates no warning");
  ok(formatHealthReport(health).includes("Project knowledge health"), "health text view renders");
  ok(formatTagReport(health).includes("Project knowledge tags"), "tag text view renders");
  ok(formatPropertyReport(health).includes("Project knowledge properties"), "property text view renders");
  ok(formatProvenanceReport(health).includes("Project knowledge provenance"), "provenance text view renders");
  ok(formatProvenanceReport(health).includes("line 10: read-from-file; evidence.md"), "provenance view includes body-level claim sources");
  ok(JSON.stringify(inspectKnowledge(healthy)) === JSON.stringify(health), "health JSON is deterministic");
  const focused = focusHealthReport(health, "knowledge/memory/knowledge/unchecked.md");
  ok(
    focused.memories.length === 1
      && focused.warnings.every((item) => item.path === focused.focus || item.code === "tags-overlap"),
    "focused health limits owner-facing warnings to the file and its tag overlaps",
  );
  const deletedFocus = focusHealthReport(health, "missing-claim.md");
  ok(deletedFocus.warnings.some((item) => item.path.endsWith("mixed-source.md")), "focused health includes files that point to a deleted path");
  const normalizedFocus = focusHealthReport(health, "docs/../missing-claim.md");
  ok(normalizedFocus.warnings.some((item) => item.path.endsWith("mixed-source.md")), "focused health normalizes equivalent reference paths");
  const cliJson = JSON.parse(execFileSync(
    process.execPath,
    [resolve(plugin, "tools/knowledge-health.mjs"), "tags", healthy, "--json"],
    { encoding: "utf8" },
  ));
  ok(cliJson.schemaVersion === 1 && cliJson.view === "tags" && Array.isArray(cliJson.tags), "CLI emits a stable JSON tag view");
  const provenanceJson = JSON.parse(execFileSync(
    process.execPath,
    [resolve(plugin, "tools/knowledge-health.mjs"), "provenance", healthy, "--json"],
    { encoding: "utf8" },
  ));
  ok(provenanceJson.warnings.some((item) => item.code === "claim-source-file-broken"), "provenance JSON includes body-level claim warnings");
  ok(treeDigest(healthy) === healthBefore, "every health view is read-only");

  const history = fixture("history-health");
  makeKnowledge(history);
  write(
    history,
    "knowledge/memory/tags.md",
    "# Memory tags\n\n| Tag | Plain-language meaning |\n| --- | --- |\n| `history` | Retained memory history. |\n",
  );
  for (const [name, target] of [["a.md", "b.md"], ["b.md", "a.md"], ["self.md", "self.md"], ["broken.md", "missing.md"]]) {
    write(
      history,
      `knowledge/memory/decisions/${name}`,
      `---\nsource: owner-paraphrase\ndate: 2026-08-12\nsession: unavailable\ntags: [history]\nsuperseded-by: ${target}\n---\n\n# ${name}\n\nHistory.\n`,
    );
  }
  const historyHealth = inspectKnowledge(history);
  const historyCodes = new Set(historyHealth.warnings.map((item) => item.code));
  ok(historyCodes.has("superseded-by-cycle"), "health report finds supersession cycles");
  ok(historyCodes.has("superseded-by-self"), "health report finds self-supersession");
  ok(historyCodes.has("superseded-by-broken"), "health report finds broken replacements");
  ok(historyHealth.tags[0].count === 0 && historyHealth.tags[0].historyCount === 4, "tag counts separate current memory from retained history");
  ok(!historyHealth.unusedTags.includes("history"), "tags used by retained history are not called unused");
  ok(buildIndex(history).count === 0, "all retained history stays out of the startup index");

  // ---------------------------------------------------------------------------
  // The migration engine, version 1 to version 2.
  //
  // AT-19 in three parts: a dry run changes nothing, an approved apply loses no
  // file, link, or unchanged byte, and a rollback puts every byte back. The
  // fixture is a whole version 1 project, so every mapped folder, every
  // owner-routed folder, and every preserved area is exercised at once.
  // ---------------------------------------------------------------------------
  function makeV1(base) {
    write(base, "knowledge/project.md", "# What this project is\n\nA version 1 fixture project.\n");
    write(base, "knowledge/index.md", "# What this project has written down\n\n- [Use a flow](memory/decisions/use-a-flow.md)\n");
    write(base, "knowledge/.obsidian/app.json", '{\n  "alwaysUpdateLinks": true\n}\n');
    write(
      base,
      "knowledge/specs/app/capability.md",
      "# Capability\n\nThe capability works.\n\n[Why a flow](../../memory/decisions/use-a-flow.md)\n\n[The gotcha](../../memory/knowledge/a-gotcha.md)\n",
    );
    write(
      base,
      "knowledge/memory/decisions/use-a-flow.md",
      "---\nsource: user-said-it\ndate: 2026-08-11\nsession: fixture\ntags: [billing, routing]\n---\n\n# Billing uses a flow\n\n`AGENTS.md` and `CLAUDE.md` both name the flow, so the flow is the one home.\n\n```markdown\n[example](../knowledge/missing.md)\n```\n",
    );
    write(
      base,
      "knowledge/memory/context/where-it-runs.md",
      "---\nsource: owner-paraphrase\ndate: 2026-08-11\ntags: [hosting]\n---\n\n# It runs on one box\n\nOne box, no cluster.\n",
    );
    write(
      base,
      "knowledge/memory/domain/invoice.md",
      "---\nsource: user-said-it\ndate: 2026-08-11\ntags: [billing]\n---\n\n# An invoice is one billing run\n\nOne run, one invoice.\n",
    );
    write(
      base,
      "knowledge/memory/knowledge/a-gotcha.md",
      "---\nsource: agent-guess-unchecked\ndate: 2026-08-11\ntags: [testing]\n---\n\n# The check has no trigger\n\n`tests/installed-copy-check.mjs` runs only when a person types it.\n",
    );
    write(
      base,
      "knowledge/memory/operations/release.md",
      "---\nsource: owner-paraphrase\ndate: 2026-08-11\ntags: [release]\n---\n\n# Release runs on Fridays\n\nFridays, never Mondays.\n",
    );
    write(
      base,
      "knowledge/memory/planning/roadmap.md",
      "---\nsource: user-said-it\ndate: 2026-08-11\ntags: [planning]\n---\n\n# The roadmap\n\nThree milestones.\n",
    );
    write(
      base,
      "knowledge/memory/references/vendor-doc.md",
      "---\nsource: doc-verified\ndate: 2026-08-11\ntags: [vendor]\n---\n\n# The vendor guide\n\nWhat the vendor published.\n",
    );
    write(base, "knowledge/memory/tags.md", "# Memory tags\n\n| Tag | Plain-language meaning |\n| --- | --- |\n");
    write(base, "knowledge/brainstorms/2026-08-11-raw.md", "# Raw\n\nUnchecked.\n\n```markdown\n[example](../memory/knowledge/a-gotcha.md)\n```\n");
    write(base, "knowledge/retrieval-gold-set.md", "# Retrieval gold set\n\n- Bar: 8 of 10\n");
    write(base, "README.md", "# Fixture\n\n[The gotcha](knowledge/memory/knowledge/a-gotcha.md)\n");
    for (const folder of ["context", "domain", "knowledge", "operations", "planning", "references"]) {
      write(base, `knowledge/memory/${folder}/.gitkeep`);
    }
  }

  const answered = {
    routes: {
      "knowledge/memory/planning/roadmap.md": "planning/roadmap.md",
      "knowledge/memory/references/vendor-doc.md": "references/vendor-doc.md",
      "knowledge/memory/tags.md": "retire",
    },
    pins: ["decision-use-a-flow"],
    asOf: "2026-08-20",
  };

  const v1 = fixture("v1-migration");
  makeV1(v1);
  ok(detectLayout(v1).layout === "v1", "detector reports the version 1 layout as the supported source");

  // Deterministic id and entity derivation, from the filename and the body.
  ok(
    recordIdFor("decision", "knowledge/memory/decisions/use-a-flow.md") === "decision-use-a-flow",
    "a record id derives from the version 1 filename, deterministically",
  );
  ok(
    entitiesIn(v1, "knowledge/memory/decisions/use-a-flow.md", read(v1, "knowledge/memory/decisions/use-a-flow.md"))
      .includes("AGENTS.md"),
    "entities come from the file names the record body really writes",
  );

  // AT-19 part one: the dry run.
  const beforeDigest = treeDigest(v1);
  const unanswered = planMigration(v1);
  ok(treeDigest(v1) === beforeDigest, "a migration plan writes nothing");
  ok(unanswered.layout === "v1" && unanswered.target === "v2", "the plan names the source and the target layout");
  for (const path of [
    "knowledge/memory/planning/roadmap.md",
    "knowledge/memory/references/vendor-doc.md",
    "knowledge/memory/tags.md",
  ]) {
    ok(
      unanswered.ownerQuestions.some((item) => item.path === path && item.answer === null),
      `${path} is shown for owner routing rather than moved`,
    );
    ok(
      unanswered.blockers.some((item) => item.includes(path)),
      `${path} blocks apply until the owner answers`,
    );
  }
  ok(
    unanswered.blockers.every((item) => item.startsWith("migration/")),
    "every blocker carries a reason code from the closed list",
  );

  const plan = planMigration(v1, answered);
  ok(plan.blockers.length === 0, "an answered plan has no blockers");
  ok(treeDigest(v1) === beforeDigest, "an answered plan still writes nothing");
  ok(plan.counts.upgraded === 5, "the plan counts every mapped record");
  ok(plan.counts.moved === 2, "the plan counts the two owner-routed files");
  ok(plan.rollback.length >= 4 && plan.rollback.every((line) => typeof line === "string"), "the plan carries its rollback steps");

  const mapped = new Map(plan.upgrades.map((item) => [item.source, item.destination]));
  for (const [source, destination] of [
    ["knowledge/memory/context/where-it-runs.md", "knowledge/memory/facts/where-it-runs.md"],
    ["knowledge/memory/domain/invoice.md", "knowledge/memory/facts/invoice.md"],
    ["knowledge/memory/knowledge/a-gotcha.md", "knowledge/memory/facts/a-gotcha.md"],
    ["knowledge/memory/operations/release.md", "knowledge/memory/patterns/release.md"],
    ["knowledge/memory/decisions/use-a-flow.md", "knowledge/memory/decisions/use-a-flow.md"],
  ]) ok(mapped.get(source) === destination, `${source} maps to ${destination}`);

  ok(
    plan.metadataGaps.every((item) => item.missing.some((gap) => gap.startsWith("evidence:"))),
    "missing version 2 metadata is shown as a gap for every migrated record",
  );
  ok(
    plan.followUp.some((item) => item.path === "knowledge/current.md"),
    "the plan says which version 2 core files setup still authors",
  );
  ok(
    plan.preserved.some((item) => item.path === "knowledge/retrieval-gold-set.md"),
    "the gold set is reported as kept where it is",
  );
  ok(
    plan.preserved.some((item) => item.path === "knowledge/brainstorms"),
    "brainstorms stay in place as a mapped area",
  );
  ok(
    plan.retires.some((item) => item.path === "knowledge/index.md"),
    "the version 1 generated index retires because generated views replace it",
  );

  let wrongHash = false;
  try {
    applyMigration(v1, "not-the-hash", answered);
  } catch (error) {
    wrongHash = error.message.includes("approval hash mismatch");
  }
  ok(wrongHash, "apply refuses a stale or missing approval hash");
  ok(treeDigest(v1) === beforeDigest, "a refused apply writes nothing");

  // AT-19 part two: the approved apply.
  const bodies = new Map();
  for (const item of plan.upgrades) {
    const text = read(v1, item.source);
    bodies.set(item.destination, text.slice(text.indexOf("\n---\n") + 5));
  }
  const goldSetBytes = read(v1, "knowledge/retrieval-gold-set.md");
  const brainstormBytes = read(v1, "knowledge/brainstorms/2026-08-11-raw.md");
  const specBytes = read(v1, "knowledge/specs/app/capability.md");

  const applied = applyMigration(v1, plan.hash, answered);
  ok(applied.layout === "v2", "an applied migration reports the version 2 layout");
  ok(detectLayout(v1).layout === "v2", "the detector reports version 2 after apply");
  ok(applied.integrity === "pass", "apply verifies its own result before it returns");

  for (const [destination, body] of bodies) {
    const text = read(v1, destination);
    ok(text.slice(text.indexOf("\n---\n") + 5) === body, `${destination} keeps every body byte`);
  }
  ok(read(v1, "knowledge/retrieval-gold-set.md") === goldSetBytes, "the gold set stays at its home, byte for byte");
  ok(read(v1, "knowledge/brainstorms/2026-08-11-raw.md") === brainstormBytes, "a fenced example is never rewritten");
  ok(specBytes !== read(v1, "knowledge/specs/app/capability.md"), "a specification linking to a moved record is repaired");
  ok(
    read(v1, "knowledge/specs/app/capability.md").includes("../../memory/facts/a-gotcha.md"),
    "the repaired specification link points at the new type folder",
  );
  ok(
    read(v1, "README.md").includes("knowledge/memory/facts/a-gotcha.md"),
    "a link from outside knowledge/ is repaired to the new path",
  );
  ok(
    read(v1, "knowledge/specs/app/capability.md").includes("../../memory/decisions/use-a-flow.md"),
    "a link to a record that did not move keeps working",
  );

  const upgraded = read(v1, "knowledge/memory/decisions/use-a-flow.md");
  ok(upgraded.includes("id: decision-use-a-flow"), "the migrated record carries the derived id");
  ok(upgraded.includes("type: decision"), "the migrated record carries its version 2 type");
  ok(upgraded.includes("recorded_at: 2026-08-11"), "the version 1 date becomes recorded_at");
  ok(upgraded.includes("topics: [billing, routing]"), "version 1 tags become version 2 topics");
  ok(upgraded.includes("AGENTS.md"), "the migrated record lists the entities its body names");
  ok(upgraded.includes("schema_version: 1"), "a migrated record stays on schema 1 until an approved touch completes it");
  ok(!upgraded.includes("epistemic_status:"), "no version 2 field is invented to close a gap");

  ok(existsSync(resolve(v1, "planning/roadmap.md")), "an owner-routed planning file lands where the owner said");
  ok(existsSync(resolve(v1, "references/vendor-doc.md")), "an owner-routed reference file lands where the owner said");
  ok(!existsSync(resolve(v1, "knowledge/memory/tags.md")), "the retired tag registry is gone");
  ok(!existsSync(resolve(v1, "knowledge/index.md")), "the version 1 generated index is gone");
  for (const folder of ["context", "domain", "knowledge", "operations", "planning", "references"]) {
    ok(!existsSync(resolve(v1, `knowledge/memory/${folder}`)), `the empty version 1 ${folder} folder is removed`);
  }
  ok(existsSync(resolve(v1, "knowledge/memory/events/.gitkeep")), "an empty version 2 type folder is held open");
  ok(read(v1, "knowledge/memory/pins.md").includes("decision-use-a-flow"), "the pin the owner asked for is written");
  ok(read(v1, "knowledge/memory/pins.md").includes("2026-08-20"), "the pin records the approval date the owner gave");

  ok(checkMigrationIntegrity(v1).status === "pass", "MV-18 passes on a migration that did what it planned");
  const secondApply = planMigration(v1, answered);
  ok(
    secondApply.blockers.some((item) => item.includes("already runs version 2")),
    "a second run refuses a project that is already version 2",
  );

  // MV-18 catches a byte that changed in a file the plan called unchanged and
  // did not declare as an owner follow-up.
  const drifted = fixture("v1-drift");
  makeV1(drifted);
  const driftPlan = planMigration(drifted, answered);
  const driftApplied = applyMigration(drifted, driftPlan.hash, answered);
  ok(checkMigrationIntegrity(drifted).status === "pass", "the drift fixture starts clean");
  ok(
    driftApplied.followUp.map((item) => item.path).sort().join(",")
      === "knowledge/current.md,knowledge/map.md,knowledge/project.md",
    "apply declares the expected-follow-up set the owner still has to author",
  );
  write(drifted, "knowledge/brainstorms/2026-08-11-raw.md", "# Raw\n\nEdited behind the migration.\n");
  const driftVerdict = checkMigrationIntegrity(drifted);
  ok(driftVerdict.status === "fail", "MV-18 fails when a byte changed in a file the plan said was unchanged");
  ok(
    driftVerdict.findings.some((item) => item.path === "knowledge/brainstorms/2026-08-11-raw.md"),
    "MV-18 names the file whose bytes moved",
  );

  // The other direction. The post-migration follow-up the owner is told to do
  // is the one change MV-18 expects, so the check reports it and still passes.
  // Without this, MV-18 could never pass on a real migrated project: scope
  // does not resolve until the version 2 front matter is in project.md.
  const followed = fixture("v1-follow-up");
  makeV1(followed);
  const followPlan = planMigration(followed, answered);
  applyMigration(followed, followPlan.hash, answered);
  ok(checkMigrationIntegrity(followed).status === "pass", "the follow-up fixture starts clean");
  write(
    followed,
    "knowledge/project.md",
    "---\nschema_version: 2\nproject_id: follow-up\nproject_root: .\n---\n\n# What this project is\n",
  );
  const followVerdict = checkMigrationIntegrity(followed);
  ok(
    followVerdict.status === "pass",
    "MV-18 passes when the owner makes the version 2 front matter follow-up the plan declared",
  );
  ok(followVerdict.findings.length === 0, "the declared follow-up raises no finding");
  ok(
    followVerdict.skipped_because.includes("knowledge/project.md"),
    "MV-18 reports the declared follow-up file whose bytes it did not compare",
  );

  // The declaration covers the declared files and nothing else, so an ordinary
  // file that drifts in the same project still fails alongside it.
  write(followed, "knowledge/brainstorms/2026-08-11-raw.md", "# Raw\n\nAlso edited.\n");
  const bothVerdict = checkMigrationIntegrity(followed);
  ok(bothVerdict.status === "fail", "a declared follow-up does not excuse any other file in the same project");
  ok(
    bothVerdict.findings.length === 1
      && bothVerdict.findings[0].path === "knowledge/brainstorms/2026-08-11-raw.md",
    "the failure names only the file the plan never declared",
  );

  // A declared follow-up file that is gone is not the change the plan
  // declared, so it still fails. The declaration says the owner edits these
  // files, not that they may delete them.
  const removed = fixture("v1-follow-up-gone");
  makeV1(removed);
  const removedPlan = planMigration(removed, answered);
  applyMigration(removed, removedPlan.hash, answered);
  unlinkSync(resolve(removed, "knowledge/project.md"));
  const removedVerdict = checkMigrationIntegrity(removed);
  ok(removedVerdict.status === "fail", "MV-18 still fails when a declared follow-up file is gone entirely");
  ok(
    removedVerdict.findings.some((item) => item.path === "knowledge/project.md"),
    "MV-18 names the declared follow-up file that is gone",
  );

  // AT-19 part three: rollback.
  const rolled = fixture("v1-rollback");
  makeV1(rolled);
  const rollbackDigest = treeDigest(rolled);
  const rollbackPlan = planMigration(rolled, answered);
  applyMigration(rolled, rollbackPlan.hash, answered);
  ok(treeDigest(rolled) !== rollbackDigest, "apply really changed the project");
  const undone = rollbackMigration(rolled);
  ok(treeDigest(rolled) === rollbackDigest, "rollback restores every byte the migration touched");
  ok(undone.layout === "v1", "rollback leaves the project on the version 1 layout");
  ok(!existsSync(resolve(rolled, ".memory")), "rollback removes the local state it created");
  ok(
    checkMigrationIntegrity(rolled).status === "skipped",
    "MV-18 reports skipped once there is no applied migration to inspect",
  );

  // flat-149 and retired-v3 are detect-only.
  for (const [name, base] of [["flat-149", flat], ["retired-v3", retired]]) {
    ok(detectLayout(base).layout === name, `${name} is still detected`);
    const refused = planMigration(base);
    const digestBefore = treeDigest(base);
    ok(
      refused.blockers.some((item) => item.startsWith("migration/unsupported-source")),
      `${name} is refused as an unsupported source`,
    );
    ok(
      refused.blockers.some((item) => item.includes("3.6.0")),
      `${name} is told which earlier migration to run first`,
    );
    ok(treeDigest(base) === digestBefore, `refusing ${name} writes nothing`);
  }

  console.log(`ALL PASS (${passed} checks), FAIL: 0`);
} finally {
  for (const path of fixtures.reverse()) rmSync(path, { recursive: true, force: true });
}

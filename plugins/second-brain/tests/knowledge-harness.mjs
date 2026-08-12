#!/usr/bin/env node

import {
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { buildIndex } from "../tools/build-knowledge-index.mjs";
import {
  applyMigration,
  createRetiredReview,
  detectLayout,
  planMigration,
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
    "tools/build-knowledge-index.mjs",
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
  ok(claudeManifest.version === "3.0.0", "Claude manifest is 3.0.0");
  ok(codexManifest.version === "3.0.0", "Codex manifest is 3.0.0");
  ok(claudeManifest.version === codexManifest.version, "plugin manifest versions match");

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

  // Signature detector states.
  const none = fixture("none");
  ok(detectLayout(none).layout === "none", "detector reports none without signatures");

  const unknown = fixture("unknown");
  write(unknown, "memory/notes.md", "# Ordinary notes\n");
  ok(detectLayout(unknown).layout === "unknown", "ordinary similarly named folder is unknown");

  const newLayout = fixture("knowledge");
  makeKnowledge(newLayout);
  ok(detectLayout(newLayout).layout === "knowledge", "detector reports the complete knowledge layout");

  const flat = fixture("flat");
  makeFlat(flat);
  ok(detectLayout(flat).layout === "flat-149", "detector reports flat #149 from signatures");

  const retired = fixture("retired");
  makeRetired(retired);
  ok(detectLayout(retired).layout === "retired-v3", "detector reports retired v3 from signatures");

  const mixed = fixture("mixed");
  makeKnowledge(mixed);
  makeFlat(mixed);
  ok(detectLayout(mixed).layout === "mixed", "detector blocks mixed knowledge and flat layouts");

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

  // Flat migration: no-write plan, exact-hash apply, link repair, and rerun.
  const dryDigest = treeDigest(flat);
  const flatPlan = planMigration(flat);
  ok(flatPlan.blockers.length === 0, "flat migration plan has no blockers");
  ok(treeDigest(flat) === dryDigest, "flat migration plan writes nothing");
  ok(flatPlan.moves.some((item) => item.destination === "knowledge/project.md"), "plan moves project overview");
  ok(flatPlan.deletes.includes("memory/index.md"), "plan discards the old generated index");
  ok(flatPlan.rewrites.some((item) => item.file === "README.md"), "plan repairs links from outside moved tree");
  ok(flatPlan.rewrites.some((item) => item.file === "specs/app/capability.md"), "plan repairs moved links to repository files");

  let wrongHashFailed = false;
  try {
    applyMigration(flat, "wrong-hash");
  } catch (error) {
    wrongHashFailed = error.message.includes("approval hash mismatch");
  }
  ok(wrongHashFailed, "apply rejects a stale or missing approval hash");
  ok(treeDigest(flat) === dryDigest, "wrong approval hash writes nothing");

  const keepBytes = read(flat, "memory/decisions/keep-bytes.md");
  const applied = applyMigration(flat, flatPlan.hash);
  ok(applied.layout === "knowledge", "successful flat migration reports the new layout");
  ok(detectLayout(flat).layout === "knowledge", "detector recognizes migrated layout");
  ok(read(flat, "knowledge/memory/decisions/keep-bytes.md") === keepBytes, "unlinked document bytes are preserved");
  ok(read(flat, "knowledge/memory/tags.md") === "# Memory tags\n\n- routing\n", "tag list moves unchanged");
  ok(read(flat, "README.md").includes("knowledge/specs/app/capability.md"), "outside link points into knowledge");
  ok(read(flat, "knowledge/specs/app/capability.md").includes("../../../README.md"), "moved link still reaches repository root");
  ok(read(flat, "knowledge/specs/app/capability.md").includes("../../../evidence.bin"), "moved link to non-Markdown source remains valid");
  ok(read(flat, "knowledge/brainstorms/2026-08-11-test.md").includes("[example](../specs/missing.md)"), "code-fenced example stays unchanged");
  ok(existsSync(resolve(flat, "knowledge/.obsidian/app.json")), "migration installs minimal Obsidian config");
  ok(existsSync(resolve(flat, "knowledge/memory/context/.gitkeep")), "migration preserves empty memory types");
  ok(!existsSync(resolve(flat, "memory/index.md")), "old generated index is gone");
  ok(!existsSync(resolve(flat, ".claude/skills/remember")), "old local skill copy is removed");
  ok(read(flat, "knowledge/index.md").includes("Invoice") === false, "rebuilt index comes from migrated fixture only");
  ok(planMigration(flat).blockers.includes("project already uses the knowledge layout"), "rerun refuses to migrate the new layout again");

  const alternate = fixture("alternate-project");
  makeFlat(alternate, { alternativeProject: true });
  const alternatePlan = planMigration(alternate);
  ok(alternatePlan.blockers.length === 0, "older planning overview is a supported flat candidate");
  ok(alternatePlan.moves.some((item) => item.source.endsWith("what-this-project-is.md") && item.destination === "knowledge/project.md"), "planning overview maps to knowledge/project.md");

  const noTags = fixture("missing-tags");
  makeFlat(noTags);
  rmSync(resolve(noTags, "memory/tags.md"));
  const noTagsPlan = planMigration(noTags);
  ok(noTagsPlan.blockers.length === 0, "flat layout may be detected when tags are missing");
  ok(noTagsPlan.creates.some((item) => item.path === "knowledge/memory/tags.md"), "migration creates the required tag list when absent");

  const duplicateProject = fixture("duplicate-project");
  makeFlat(duplicateProject, { alternativeProject: true });
  write(duplicateProject, "project.md", "# Second candidate\n\nConflict.\n");
  ok(planMigration(duplicateProject).blockers.some((item) => item.includes("multiple project overview")), "two overview candidates block migration");

  const collision = fixture("collision");
  makeFlat(collision);
  write(collision, "knowledge/specs/app/capability.md", "# Existing target\n");
  const collisionBefore = treeDigest(collision);
  ok(planMigration(collision).blockers.length > 0, "target collision or mixed target blocks before writes");
  ok(treeDigest(collision) === collisionBefore, "colliding plan writes nothing");

  const dangling = fixture("dangling");
  makeFlat(dangling);
  write(dangling, "specs/app/capability.md", "# Capability\n\nSummary.\n\n[Missing](../missing.md)\n");
  ok(planMigration(dangling).blockers.some((item) => item.includes("dangling migration link")), "dangling moved link blocks migration");

  const symlinked = fixture("symlink");
  makeFlat(symlinked);
  symlinkSync(resolve(symlinked, "README.md"), resolve(symlinked, "memory/linked.md"));
  ok(planMigration(symlinked).blockers.some((item) => item.includes("symlink inside migration source")), "source symlink blocks migration");

  // Retired v3 is review-only and source-preserving.
  const retiredPlan = planMigration(retired);
  ok(retiredPlan.blockers.some((item) => item.includes("requires flat-149")), "retired v3 cannot use flat apply");
  const retiredBefore = treeDigest(retired);
  const review = fixture("retired-review");
  const manifest = createRetiredReview(retired, review);
  ok(treeDigest(retired) === retiredBefore, "retired review leaves source project unchanged");
  ok(manifest.finalizationAvailable === false, "retired review exposes no finalize path");
  ok(manifest.documents.length === 3, "retired manifest accounts for every non-index document");
  ok(manifest.ignoredIndexes.length >= 6, "retired per-folder indexes are listed but not converted");
  const retiredMemoryDraft = read(review, "knowledge/memory/decisions/a-choice.md");
  ok(retiredMemoryDraft.includes("source: REVIEW_REQUIRED"), "retired memory source is never inferred");
  ok(retiredMemoryDraft.includes("session: REVIEW_REQUIRED"), "retired memory session is never inferred");
  ok(retiredMemoryDraft.includes("Basis: Owner-confirmed 2026-08-01"), "retired source words remain in review draft");
  ok(read(review, "manifest.json").includes('"reviewRequired": true'), "retired review writes a machine-readable manifest");

  console.log(`ALL PASS (${passed} checks), FAIL: 0`);
} finally {
  for (const path of fixtures.reverse()) rmSync(path, { recursive: true, force: true });
}

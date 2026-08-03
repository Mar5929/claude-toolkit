#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
let passed = 0;

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
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

function countFiles(path) {
  return readdirSync(resolve(root, path), { withFileTypes: true }).reduce(
    (count, entry) =>
      count +
      (entry.isDirectory()
        ? countFiles(`${path}/${entry.name}`)
        : 1),
    0,
  );
}

const secondBrainSkill =
  "plugins/second-brain/skills/second-brain/SKILL.md";
const rememberSkill = "plugins/second-brain/skills/remember/SKILL.md";
const projectInitSkill =
  "plugins/project-init/skills/project-init/SKILL.md";
const projectSyncSkill =
  "plugins/project-init/skills/project-sync/SKILL.md";
const adoption =
  "plugins/second-brain/skills/second-brain/references/adoption-guide.md";
const activeReferences =
  "plugins/second-brain/skills/second-brain/references";
const archiveRoot = "archive/second-brain-v1";
const serverRoot = `${archiveRoot}/references/server`;
const brainCurator = `${archiveRoot}/references/agents/brain-curator.md`;
const knowledgeCurator =
  `${archiveRoot}/references/agents/knowledge-curator.md`;
const outboxHook =
  `${archiveRoot}/references/hooks/brain-outbox-status.mjs`;

includes(
  secondBrainSkill,
  "Archived v1 boundary",
  "second-brain keeps a minimal archived-v1 boundary",
);
includes(
  secondBrainSkill,
  "installable plugin contains no v1 implementation",
  "second-brain states that v1 is outside the plugin",
);
includes(
  secondBrainSkill,
  "Do not contact cloud resources",
  "second-brain does not contact legacy cloud resources",
);
excludes(
  rememberSkill,
  "v1_retired",
  "remember does not use the v1 result",
);
includes(
  rememberSkill,
  "Never read or import retired v1",
  "remember never imports retired v1",
);
includes(
  projectInitSkill,
  "Never read or import retired v1",
  "project-init never imports retired v1",
);
includes(
  projectSyncSkill,
  "Retired v1 status",
  "project-sync still reports local v1 wiring",
);
includes(
  projectSyncSkill,
  "Deactivate:",
  "project-sync still offers local v1 deactivation",
);
includes(
  projectSyncSkill,
  "Remove local integration:",
  "project-sync still offers approved local v1 removal",
);
includes(
  adoption,
  "V1 content is not a migration source",
  "adoption rejects automatic legacy migration",
);

for (const path of [
  `${activeReferences}/agents`,
  `${activeReferences}/hooks`,
  `${activeReferences}/kb-backfill`,
  `${activeReferences}/profiles`,
  `${activeReferences}/server`,
  `${activeReferences}/structural-layer`,
  `${activeReferences}/architecture-spec.md`,
  `${activeReferences}/brain-scope.md`,
  `${activeReferences}/curator-write-path.md`,
  `${activeReferences}/first-time-infra.md`,
  `${activeReferences}/kb-backfill.md`,
  `${activeReferences}/setup-recipe.md`,
  `${activeReferences}/structural-layer-graphify.md`,
  `${activeReferences}/structural-layer.md`,
  `${activeReferences}/templates/mcp.v1-archived.json`,
  `${activeReferences}/templates/settings.v1-archived.json`,
]) {
  ok(!existsSync(resolve(root, path)), `active plugin excludes ${path}`);
}

for (const path of [
  `${archiveRoot}/README.md`,
  `${archiveRoot}/references/architecture-spec.md`,
  brainCurator,
  knowledgeCurator,
  outboxHook,
  `${serverRoot}/package.json`,
  `${archiveRoot}/project-init-rules/memory-system-ground-rules.md`,
  `${archiveRoot}/project-init-rules/knowledge-layer-ground-rules.md`,
]) {
  ok(existsSync(resolve(root, path)), `archive preserves ${path}`);
}

// The Salesforce dependency graph is NOT archived. It only ever read local
// metadata files, so it never depended on v1 infrastructure, and it now ships
// from project-init. Archiving it would undo that restore.
for (const path of [
  "plugins/project-init/library/tools/kb/build_graph.py",
  "plugins/project-init/library/tools/kb/query_graph.py",
  "plugins/project-init/library/tools/kb/README.md",
]) {
  ok(existsSync(resolve(root, path)), `dependency graph stays shipped: ${path}`);
}
ok(
  !existsSync(resolve(root, `${archiveRoot}/references/structural-layer`)),
  "archive does not swallow the dependency graph",
);

ok(
  countFiles(archiveRoot) >= 55,
  "archive preserves the complete legacy source set",
);
includes(
  `${archiveRoot}/README.md`,
  "Do not install, deploy, run, connect, export, migrate, or revive this code.",
  "archive rejects operational use",
);
includes(
  `${archiveRoot}/README.md`,
  "Existing cloud resources and legacy project data are unchanged.",
  "archive states external data is untouched",
);
includes(brainCurator, "Retired v1 reference", "old brain curator is archived");
includes(
  knowledgeCurator,
  "Retired v1 reference",
  "old knowledge curator is archived",
);
includes(
  outboxHook,
  "not current truth",
  "old outbox notice rejects legacy truth",
);

ok(
  !existsSync(resolve(root,
    "plugins/second-brain/skills/second-brain/references/v1-freeze-and-export.md")),
  "freeze and export runbook is absent",
);
ok(
  !existsSync(resolve(root, serverRoot, "wrangler.jsonc")),
  "archived Worker has no default Wrangler config",
);
ok(
  existsSync(resolve(root, serverRoot, "wrangler.v1-archived.jsonc")),
  "archived Worker keeps a clearly named config record",
);

const serverPackage = JSON.parse(read(`${serverRoot}/package.json`));
ok(!serverPackage.scripts.deploy, "archived Worker has no deploy script");
ok(!serverPackage.scripts.dev, "archived Worker has no development server script");
ok(!serverPackage.scripts.types, "archived Worker has no Wrangler type script");

console.log(`ALL PASS (${passed} checks), FAIL: 0`);

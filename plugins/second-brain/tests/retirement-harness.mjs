#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
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

const secondBrainSkill =
  "plugins/second-brain/skills/second-brain/SKILL.md";
const rememberSkill = "plugins/second-brain/skills/remember/SKILL.md";
const projectInitSkill =
  "plugins/project-init/skills/project-init/SKILL.md";
const projectSyncSkill =
  "plugins/project-init/skills/project-sync/SKILL.md";
const v2Index = "docs/second-brain-v2/README.md";
const unit00 =
  "docs/second-brain-v2/units/00-current-system-retirement.md";
const serverRoot =
  "plugins/second-brain/skills/second-brain/references/server";

includes(secondBrainSkill, "v1 is retired", "second-brain reports v1 retired");
includes(secondBrainSkill, "not shipped", "second-brain reports v2 not shipped");
includes(secondBrainSkill, "Deactivate, recommended first", "second-brain offers deactivation");
includes(secondBrainSkill, "Remove local integration files", "second-brain offers local removal");
excludes(secondBrainSkill, "v1-freeze-and-export", "second-brain has no freeze runbook path");

includes(rememberSkill, '"reason": "v1_retired"', "/remember returns v1_retired");
excludes(rememberSkill, "v1_read_only", "/remember no longer uses containment result");

includes(projectInitSkill, "v1 is retired", "project-init never offers v1");
includes(projectSyncSkill, "Deactivate:", "project-sync offers deactivation");
includes(projectSyncSkill, "Remove local integration", "project-sync offers local removal");
excludes(projectSyncSkill, "HTTP 423", "project-sync does not probe live containment");
excludes(projectSyncSkill, "migration evidence", "project-sync has no v1 migration path");

includes(v2Index, "V2 starts fresh from authoritative Git content", "v2 starts from Git");
includes(v2Index, "not shipped", "v2 remains unshipped");
includes(v2Index, "08-fresh-start-rollout.md", "v2 index uses fresh-start rollout");
excludes(v2Index, "08-migration-rollout.md", "v2 index has no migration unit");

includes(unit00, "V1 will not be deployed", "Unit 00 forbids v1 deployment");
includes(unit00, "will not be imported", "Unit 00 forbids legacy memory import");
includes(unit00, "remain untouched", "Unit 00 leaves cloud resources untouched");

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
ok(
  secondBrainClaude.version === secondBrainCodex.version,
  "second-brain plugin versions match",
);
ok(
  projectInitClaude.version === projectInitCodex.version,
  "project-init plugin versions match",
);

console.log(`ALL PASS (${passed} checks), FAIL: 0`);

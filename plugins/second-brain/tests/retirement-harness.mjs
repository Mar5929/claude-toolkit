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
const v3Index = "docs/second-brain-v3/README.md";
const v3Specification =
  "docs/second-brain-v3/TECHNICAL-SPECIFICATION.md";
const v2Index = "docs/second-brain-v2/README.md";
const serverRoot =
  "plugins/second-brain/skills/second-brain/references/server";
const brainCurator =
  "plugins/second-brain/skills/second-brain/references/agents/brain-curator.md";
const knowledgeCurator =
  "plugins/second-brain/skills/second-brain/references/agents/knowledge-curator.md";
const outboxHook =
  "plugins/second-brain/skills/second-brain/references/hooks/brain-outbox-status.mjs";

includes(secondBrainSkill, "v1 is retired", "second-brain reports v1 retired");
includes(secondBrainSkill, "not shipped", "second-brain reports v3 not shipped");
includes(secondBrainSkill, "Deactivate, recommended first", "second-brain offers deactivation");
includes(secondBrainSkill, "Remove local integration files", "second-brain offers local removal");
excludes(secondBrainSkill, "v1-freeze-and-export", "second-brain has no freeze runbook path");

includes(rememberSkill, '"reason": "v1_retired"', "/remember returns v1_retired");
excludes(rememberSkill, "v1_read_only", "/remember no longer uses containment result");

includes(
  projectInitSkill,
  "Do not offer or install the old",
  "project-init never offers v1",
);
includes(projectSyncSkill, "Deactivate:", "project-sync offers deactivation");
includes(projectSyncSkill, "Remove local integration", "project-sync offers local removal");
excludes(projectSyncSkill, "HTTP 423", "project-sync does not probe live containment");
excludes(projectSyncSkill, "migration evidence", "project-sync has no v1 migration path");

includes(brainCurator, "Retired v1 reference", "old brain curator is marked retired");
includes(knowledgeCurator, "Retired v1 reference", "old knowledge curator is marked retired");
excludes(brainCurator, "migration evidence", "old brain curator is not migration input");
excludes(knowledgeCurator, "migration evidence", "old knowledge curator is not migration input");
includes(outboxHook, "not current truth", "old outbox notice rejects legacy truth");
excludes(outboxHook, "v2 migration", "old outbox notice has no migration path");

includes(v3Index, "draft technical design", "v3 remains unshipped");
includes(v3Index, "a fixed proposal limit", "v3 has no proposal cap");
includes(
  v3Index,
  "scripts or hooks for capture",
  "v3 requires no memory hooks",
);
includes(
  v3Specification,
  "AI judgment remains primary",
  "v3 leaves semantic judgment to the agent",
);
includes(
  v3Specification,
  "writes only content already authorized",
  "v3 preserves the owner approval boundary",
);
includes(v3Specification, "memory/planning/", "v3 includes durable planning");
includes(
  v3Specification,
  "dedicated memory agent",
  "v3 delegates approved writes to a memory agent",
);
includes(
  v3Specification,
  "unfinished task is handed to another session",
  "v3 does not review unfinished handoffs",
);
includes(v2Index, "superseded historical proposal", "v2 is clearly superseded");
includes(v2Index, "Do not implement these requirements", "v2 cannot be mistaken for v3");

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

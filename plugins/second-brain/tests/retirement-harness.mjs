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
const adoption =
  "plugins/second-brain/skills/second-brain/references/adoption-guide.md";
const serverRoot =
  "plugins/second-brain/skills/second-brain/references/server";
const brainCurator =
  "plugins/second-brain/skills/second-brain/references/agents/brain-curator.md";
const knowledgeCurator =
  "plugins/second-brain/skills/second-brain/references/agents/knowledge-curator.md";
const outboxHook =
  "plugins/second-brain/skills/second-brain/references/hooks/brain-outbox-status.mjs";

includes(
  secondBrainSkill,
  "Retired v1 boundary",
  "second-brain keeps retired v1 separate",
);
includes(
  secondBrainSkill,
  "Do not contact cloud resources",
  "second-brain does not contact legacy cloud resources",
);
excludes(
  secondBrainSkill,
  "v1-freeze-and-export",
  "second-brain has no freeze or export runbook",
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
  "project-sync reports retired local v1 wiring",
);
includes(
  projectSyncSkill,
  "Deactivate:",
  "project-sync offers local v1 deactivation",
);
includes(
  projectSyncSkill,
  "Remove local integration:",
  "project-sync offers approved local v1 removal",
);
includes(
  projectSyncSkill,
  "does not block v3 adoption",
  "project-sync does not block v3 on v1 work",
);
includes(
  adoption,
  "V1 content is not a migration source",
  "adoption rejects automatic legacy migration",
);

includes(brainCurator, "Retired v1 reference", "old brain curator is archived");
includes(
  knowledgeCurator,
  "Retired v1 reference",
  "old knowledge curator is archived",
);
excludes(brainCurator, "migration evidence", "brain curator is not migration input");
excludes(
  knowledgeCurator,
  "migration evidence",
  "knowledge curator is not migration input",
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

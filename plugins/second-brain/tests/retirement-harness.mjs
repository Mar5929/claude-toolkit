#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
let passed = 0;

function ok(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed++;
  console.log(`PASS: ${message}`);
}

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function countFiles(path) {
  return readdirSync(resolve(root, path), { withFileTypes: true }).reduce(
    (count, entry) => count + (entry.isDirectory()
      ? countFiles(`${path}/${entry.name}`)
      : 1),
    0,
  );
}

const plugin = "plugins/second-brain";
for (const path of [
  `${plugin}/agents/memory-verifier.md`,
  `${plugin}/tools/memory-index-build.mjs`,
  `${plugin}/tools/memory-shape-check.mjs`,
  `${plugin}/skills/second-brain/references/second-brain-rule.md`,
  `${plugin}/skills/second-brain/references/second-brain-reference.md`,
  `${plugin}/skills/second-brain/references/orientation-snippet.md`,
  `${plugin}/skills/second-brain/references/markdown-schemas.md`,
  `${plugin}/skills/second-brain/references/templates/memory/README.md`,
]) {
  ok(!existsSync(resolve(root, path)), `active package excludes retired ${path}`);
}

for (const path of [
  `${plugin}/skills/remember/SKILL.md`,
  `${plugin}/skills/recall/SKILL.md`,
  `${plugin}/skills/cleanup/SKILL.md`,
  `${plugin}/skills/session-search/SKILL.md`,
  `${plugin}/skills/session-search/scripts/search-sessions.mjs`,
  `${plugin}/tools/build-knowledge-index.mjs`,
  `${plugin}/tools/knowledge-health.mjs`,
  `${plugin}/tools/knowledge-layout.mjs`,
  `${plugin}/hooks/knowledge-session-start.mjs`,
  `${plugin}/hooks/save-reminder.mjs`,
]) {
  ok(existsSync(resolve(root, path)), `active package contains ${path}`);
}

const archive = "archive/second-brain-v1";
for (const path of [
  `${archive}/README.md`,
  `${archive}/references/architecture-spec.md`,
  `${archive}/references/agents/brain-curator.md`,
  `${archive}/references/agents/knowledge-curator.md`,
  `${archive}/references/hooks/brain-outbox-status.mjs`,
  `${archive}/references/server/package.json`,
]) {
  ok(existsSync(resolve(root, path)), `v1 archive preserves ${path}`);
}

ok(countFiles(archive) >= 55, "v1 archive preserves the historical source set");
ok(
  read(`${archive}/README.md`).includes(
    "Do not install, deploy, run, connect, export, migrate, or revive this code.",
  ),
  "v1 archive rejects operational use",
);

for (const path of [
  "plugins/project-init/library/tools/kb/edge_list.py",
  "plugins/project-init/library/tools/kb/query_graph.py",
  "plugins/project-init/library/tools/kb/README.md",
]) {
  ok(existsSync(resolve(root, path)), `dependency graph stays shipped: ${path}`);
}

const activeText = [
  read(`${plugin}/README.md`),
  read(`${plugin}/skills/second-brain/SKILL.md`),
  read(`${plugin}/skills/remember/SKILL.md`),
].join("\n");
ok(
  !activeText.includes("agents/memory-verifier") && !activeText.includes("invoke the memory verifier"),
  "active instructions do not invoke a verifier",
);
ok(!activeText.includes("memory-shape-check"), "active instructions do not invoke a shape checker");
ok(activeText.includes("retired-v3"), "active migration detects retired v3 without restoring it");
ok(
  activeText.includes("Never finalize automatically") && activeText.includes("finalize command"),
  "retired conversion remains review-only",
);

console.log(`ALL PASS (${passed} checks), FAIL: 0`);

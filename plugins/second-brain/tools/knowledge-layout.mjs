#!/usr/bin/env node

/**
 * Detect and safely migrate toolkit project-knowledge layouts.
 *
 * Detection and planning never write. A flat #149 layout can be applied only
 * with the exact hash from its current plan. Retired-v3 content only produces
 * review drafts in a separate empty directory; this tool has no finalize mode.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndex } from "./build-knowledge-index.mjs";

const posix = (value) => value.split(sep).join("/");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const rootDirs = ["specs", "memory", "brainstorms"];
const knowledgeDirs = [
  "knowledge/specs",
  "knowledge/memory/context",
  "knowledge/memory/decisions",
  "knowledge/memory/domain",
  "knowledge/memory/knowledge",
  "knowledge/memory/operations",
  "knowledge/memory/planning",
  "knowledge/memory/references",
  "knowledge/brainstorms",
  "knowledge/.obsidian",
];

function pathExists(root, path) {
  return existsSync(resolve(root, path));
}

function fileContains(root, path, text) {
  try {
    return readFileSync(resolve(root, path), "utf8").includes(text);
  } catch {
    return false;
  }
}

function evidence(root, paths) {
  return paths.filter((path) => pathExists(root, path));
}

export function detectLayout(projectRoot = process.cwd()) {
  const root = resolve(projectRoot);

  const knowledgeRequired = [
    "knowledge/project.md",
    "knowledge/index.md",
    "knowledge/specs",
    "knowledge/memory",
    "knowledge/brainstorms",
  ];
  const knowledgeEvidence = evidence(root, knowledgeRequired);
  const knowledgeComplete = knowledgeEvidence.length === knowledgeRequired.length;
  const knowledgePartial = pathExists(root, "knowledge") || knowledgeEvidence.length > 0;

  const flatRoots = evidence(root, rootDirs);
  const flatSignatures = evidence(root, [
    "memory/index.md",
    "memory/tags.md",
    ".claude/tools/build-memory-index.mjs",
    ".claude/skills/remember/SKILL.md",
    ".claude/skills/recall/SKILL.md",
    ".claude/skills/cleanup/SKILL.md",
  ]);
  if (
    fileContains(root, "CLAUDE.md", "memory/index.md")
    || fileContains(root, "AGENTS.md", "memory/index.md")
  ) flatSignatures.push("root route -> memory/index.md");
  const flatComplete = flatRoots.length === 3 && flatSignatures.length > 0;
  const flatPartial = flatRoots.length > 0 || flatSignatures.length > 0;

  const retiredCore = evidence(root, [
    ".claude/rules/second-brain.md",
    ".claude/agents/memory-verifier.md",
    ".claude/tools/memory-index-build.mjs",
    ".claude/tools/memory-shape-check.mjs",
  ]);
  const retiredIndexes = evidence(root, [
    "specs/README.md",
    "brainstorms/README.md",
    "memory/README.md",
    "memory/context/README.md",
    "memory/decisions/README.md",
    "memory/domain/README.md",
    "memory/knowledge/README.md",
    "memory/operations/README.md",
    "memory/planning/README.md",
    "memory/references/README.md",
  ]);
  const retiredComplete = retiredCore.length >= 3 && retiredIndexes.length >= 3;
  const retiredPartial = retiredCore.length > 0 || retiredIndexes.length >= 3;

  const complete = [
    knowledgeComplete ? "knowledge" : null,
    flatComplete ? "flat-149" : null,
    retiredComplete ? "retired-v3" : null,
  ].filter(Boolean);

  let layout;
  if (complete.length > 1) layout = "mixed";
  else if (complete.length === 1) {
    const [candidate] = complete;
    const flatRuntimeBeyondRoute = flatSignatures.some((item) => item !== "root route -> memory/index.md");
    const conflictingPartial =
      (candidate !== "knowledge" && knowledgePartial)
      || (
        candidate !== "flat-149"
        && (flatRoots.length > 0 || flatRuntimeBeyondRoute)
        && !retiredComplete
      )
      || (candidate !== "retired-v3" && retiredPartial && !flatComplete);
    layout = conflictingPartial ? "mixed" : candidate;
  } else if (knowledgePartial || flatPartial || retiredPartial) layout = "unknown";
  else layout = "none";

  return {
    layout,
    evidence: {
      knowledge: knowledgeEvidence,
      flatRoots,
      flatSignatures: [...new Set(flatSignatures)],
      retiredCore,
      retiredIndexes,
    },
    writes: false,
  };
}

function collectFiles(root, relativeDir, out = [], blockers = []) {
  const absoluteDir = resolve(root, relativeDir);
  let entries;
  try {
    entries = readdirSync(absoluteDir, { withFileTypes: true });
  } catch {
    return { out, blockers };
  }

  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    const relativePath = posix(join(relativeDir, entry.name));
    const absolutePath = resolve(root, relativePath);
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      blockers.push(`symlink inside migration source: ${relativePath}`);
    } else if (stat.isDirectory()) {
      collectFiles(root, relativePath, out, blockers);
    } else if (stat.isFile()) {
      out.push(relativePath);
    }
  }
  return { out, blockers };
}

function trackedFiles(root) {
  try {
    return execFileSync(
      "git",
      ["ls-files", "-co", "--exclude-standard", "-z"],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    )
      .split("\0")
      .filter(Boolean)
      .map(posix)
      .sort();
  } catch {
    const files = [];
    const walk = (dir) => {
      for (const entry of readdirSync(resolve(root, dir), { withFileTypes: true })) {
        if ([".git", "node_modules", ".claude/worktrees"].includes(entry.name)) continue;
        const path = posix(join(dir, entry.name));
        if (entry.isDirectory()) walk(path);
        else if (entry.isFile()) files.push(path);
      }
    };
    walk("");
    return files.sort();
  }
}

function isExternalTarget(target) {
  return (
    !target
    || /^[a-z][a-z0-9+.-]*:/i.test(target)
    || target.startsWith("//")
    || target.startsWith("#")
    || target.startsWith("<")
    || target.includes("{{")
  );
}

function splitTarget(target) {
  const match = target.match(/^([^?#]*)([?#][\s\S]*)?$/);
  return { path: match?.[1] || target, suffix: match?.[2] || "" };
}

function normalizedRepoPath(fromFile, target) {
  let decoded;
  try {
    decoded = decodeURIComponent(target);
  } catch {
    decoded = target;
  }
  const absoluteLike = isAbsolute(decoded) || decoded.startsWith("/");
  if (absoluteLike) return { outside: true, path: null };
  const joined = posix(join(dirname(fromFile), decoded));
  if (joined === ".." || joined.startsWith("../")) return { outside: true, path: null };
  return { outside: false, path: joined.replace(/^\.\//, "") };
}

function targetUnderOldLayout(path) {
  return (
    path === "project.md"
    || rootDirs.some((dir) => path === dir || path.startsWith(`${dir}/`))
  );
}

function newRelativeTarget(fromFile, targetFile, suffix) {
  let path = posix(relative(dirname(fromFile), targetFile));
  if (!path) path = basename(targetFile);
  return encodeURI(path) + suffix;
}

function rewriteMarkdown(text, oldFile, newFile, moveMap, existingFiles, blockers) {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let inFence = false;
  let changed = false;

  const rewriteTarget = (rawTarget) => {
    const wrapper = rawTarget.startsWith("<") && rawTarget.endsWith(">") ? ["<", ">"] : ["", ""];
    const unwrapped = wrapper[0] ? rawTarget.slice(1, -1) : rawTarget;
    if (isExternalTarget(unwrapped)) return rawTarget;
    const { path, suffix } = splitTarget(unwrapped);
    const resolved = normalizedRepoPath(oldFile, path);

    if (resolved.outside) {
      if (oldFile !== newFile) blockers.push(`link escapes repository: ${oldFile} -> ${rawTarget}`);
      return rawTarget;
    }

    const targetMoved = moveMap.has(resolved.path);
    const sourceMoved = oldFile !== newFile;
    if (!targetMoved && !sourceMoved) return rawTarget;

    if (!targetMoved && !existingFiles.has(resolved.path)) {
      if (sourceMoved || targetUnderOldLayout(resolved.path)) {
        blockers.push(`dangling migration link: ${oldFile} -> ${rawTarget}`);
      }
      return rawTarget;
    }

    const targetFile = moveMap.get(resolved.path) || resolved.path;
    const rewritten = `${wrapper[0]}${newRelativeTarget(newFile, targetFile, suffix)}${wrapper[1]}`;
    if (rewritten !== rawTarget) changed = true;
    return rewritten;
  };

  const rewritePlainSegment = (segment) => {
    let next = segment.replace(/(!?\[[^\]]*\]\()([^\s)]+)([^)]*\))/g, (_all, start, target, end) => {
      return `${start}${rewriteTarget(target)}${end}`;
    });
    next = next.replace(/^(\s*\[[^\]]+\]:\s*)(\S+)(.*)$/g, (_all, start, target, end) => {
      return `${start}${rewriteTarget(target)}${end}`;
    });
    return next;
  };

  for (let index = 0; index < lines.length; index++) {
    if (/^\s*(```|~~~)/.test(lines[index])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const parts = lines[index].split(/(`[^`]*`)/g);
    lines[index] = parts.map((part, partIndex) => (
      partIndex % 2 === 0 ? rewritePlainSegment(part) : part
    )).join("");
  }

  const result = lines.join(newline);
  return { changed, text: result };
}

function publicPlan(plan) {
  return {
    layout: plan.layout,
    projectRoot: plan.projectRoot,
    moves: plan.moves,
    deletes: plan.deletes,
    creates: plan.creates,
    rewrites: plan.rewrites.map(({ file, destination, before, after }) => ({
      file, destination, before, after,
    })),
    blockers: [...new Set(plan.blockers)].sort(),
    warnings: plan.warnings,
  };
}

function hashPlan(plan) {
  return sha256(JSON.stringify(publicPlan(plan)));
}

export function planMigration(projectRoot = process.cwd()) {
  const root = resolve(projectRoot);
  const detected = detectLayout(root);
  const plan = {
    layout: detected.layout,
    projectRoot: root,
    moves: [],
    deletes: [],
    creates: [],
    rewrites: [],
    blockers: [],
    warnings: [],
  };

  if (detected.layout !== "flat-149") {
    plan.blockers.push(
      detected.layout === "knowledge"
        ? "project already uses the knowledge layout"
        : `flat migration requires flat-149; detected ${detected.layout}`,
    );
    plan.hash = hashPlan(plan);
    return plan;
  }

  const projectCandidates = [
    "project.md",
    "memory/planning/what-this-project-is.md",
  ].filter((path) => pathExists(root, path));
  if (projectCandidates.length === 0) {
    plan.blockers.push("no project overview candidate; owner-approved knowledge/project.md is required");
  } else if (projectCandidates.length > 1) {
    plan.blockers.push(`multiple project overview candidates: ${projectCandidates.join(", ")}`);
  }

  const moveMap = new Map();
  for (const dir of rootDirs) {
    const { out, blockers } = collectFiles(root, dir);
    plan.blockers.push(...blockers);
    for (const source of out) {
      if (source === "memory/index.md") continue;
      if (projectCandidates[0] === source) continue;
      const destination = `knowledge/${source}`;
      moveMap.set(source, destination);
    }
  }
  if (projectCandidates.length === 1) {
    moveMap.set(projectCandidates[0], "knowledge/project.md");
  }

  for (const [source, destination] of [...moveMap].sort(([a], [b]) => a.localeCompare(b))) {
    if (pathExists(root, destination)) plan.blockers.push(`target already exists: ${destination}`);
    plan.moves.push({ source, destination, bytes: lstatSync(resolve(root, source)).size });
  }

  if (pathExists(root, "memory/index.md")) plan.deletes.push("memory/index.md");

  for (const runtimePath of [
    ".claude/tools/build-memory-index.mjs",
    ".claude/skills/remember",
    ".claude/skills/recall",
    ".claude/skills/cleanup",
  ]) {
    if (!pathExists(root, runtimePath)) continue;
    const stat = lstatSync(resolve(root, runtimePath));
    if (stat.isSymbolicLink()) {
      plan.blockers.push(`symlink inside retired flat runtime: ${runtimePath}`);
    } else if (stat.isDirectory()) {
      const collected = collectFiles(root, runtimePath);
      plan.blockers.push(...collected.blockers);
      plan.deletes.push(...collected.out);
    } else {
      plan.deletes.push(runtimePath);
    }
  }

  const staticCreates = [
    {
      path: "knowledge/.obsidian/app.json",
      content: '{\n  "alwaysUpdateLinks": true,\n  "newLinkFormat": "relative",\n  "useMarkdownLinks": true\n}\n',
    },
  ];
  if (![...moveMap.values()].includes("knowledge/memory/tags.md")) {
    staticCreates.push({
      path: "knowledge/memory/tags.md",
      content: [
        "# Memory tags",
        "",
        "The owner-approved project subjects available to memory files. A new project",
        "starts empty. It never inherits another project's tags.",
        "",
        "The folder says what kind of memory this is. The source property says how its",
        "claims were obtained. Tags say only what project subject the memory is about.",
        "",
        "| Tag | Plain-language meaning |",
        "| --- | --- |",
        "",
        "Use one to three tags per memory. Reuse an existing tag by default. Add a new",
        "tag and its meaning here only in the same save where the owner approves its",
        "first use.",
        "",
      ].join("\n"),
    });
  }
  for (const item of staticCreates) {
    if (pathExists(root, item.path)) plan.blockers.push(`target already exists: ${item.path}`);
    else plan.creates.push({ path: item.path, content: item.content });
  }

  const targets = plan.moves.map((item) => item.destination);
  for (const dir of knowledgeDirs.filter((item) => item !== "knowledge/.obsidian")) {
    if (!targets.some((target) => target.startsWith(`${dir}/`))) {
      plan.creates.push({ path: `${dir}/.gitkeep`, content: "" });
    }
  }

  const existingFiles = new Set();
  for (const file of trackedFiles(root)) existingFiles.add(file);
  for (const { source } of plan.moves) existingFiles.add(source);

  for (const oldFile of [...existingFiles].filter((item) => item.endsWith(".md")).sort()) {
    if (!pathExists(root, oldFile) || !oldFile.endsWith(".md")) continue;
    const newFile = moveMap.get(oldFile) || oldFile;
    const beforeText = readFileSync(resolve(root, oldFile), "utf8");
    const result = rewriteMarkdown(
      beforeText,
      oldFile,
      newFile,
      moveMap,
      existingFiles,
      plan.blockers,
    );
    if (result.changed) {
      plan.rewrites.push({
        file: oldFile,
        destination: newFile,
        before: sha256(beforeText),
        after: sha256(result.text),
        content: result.text,
      });
    }
  }

  plan.warnings.push(
    "This tool migrates documents and Markdown links. The setup workflow must still install hooks, tools, root routes, and settings after apply.",
  );
  plan.hash = hashPlan(plan);
  return plan;
}

function removeEmptyDirs(root, relativeDir) {
  const absolute = resolve(root, relativeDir);
  if (!existsSync(absolute)) return;
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (entry.isDirectory()) removeEmptyDirs(root, posix(join(relativeDir, entry.name)));
  }
  if (readdirSync(absolute).length === 0) rmdirSync(absolute);
}

export function applyMigration(projectRoot, approvalHash) {
  const root = resolve(projectRoot || process.cwd());
  const plan = planMigration(root);
  if (plan.blockers.length > 0) {
    throw new Error(`migration blocked:\n- ${[...new Set(plan.blockers)].join("\n- ")}`);
  }
  if (!approvalHash || approvalHash !== plan.hash) {
    throw new Error(
      `approval hash mismatch; current no-write plan hash is ${plan.hash}`,
    );
  }

  // Validate the project root before the first write and reject a symlinked
  // root. Individual source symlinks were already rejected by planning.
  const canonical = realpathSync(root);
  if (canonical !== root) throw new Error(`project root resolves through a symlink: ${root}`);

  for (const { destination } of plan.moves) {
    mkdirSync(dirname(resolve(root, destination)), { recursive: true });
  }
  for (const { path } of plan.creates) {
    mkdirSync(dirname(resolve(root, path)), { recursive: true });
  }
  for (const dir of knowledgeDirs) mkdirSync(resolve(root, dir), { recursive: true });

  for (const { source, destination } of plan.moves) {
    renameSync(resolve(root, source), resolve(root, destination));
  }
  for (const path of plan.deletes) {
    if (existsSync(resolve(root, path))) unlinkSync(resolve(root, path));
  }
  for (const { path, content } of plan.creates) {
    writeFileSync(resolve(root, path), content, "utf8");
  }
  for (const rewrite of plan.rewrites) {
    writeFileSync(resolve(root, rewrite.destination), rewrite.content, "utf8");
  }

  for (const dir of ["specs", "memory", "brainstorms"]) removeEmptyDirs(root, dir);
  for (const dir of [
    ".claude/skills/remember",
    ".claude/skills/recall",
    ".claude/skills/cleanup",
    ".claude/skills",
  ]) removeEmptyDirs(root, dir);
  buildIndex(root);

  return {
    layout: detectLayout(root).layout,
    hash: plan.hash,
    moved: plan.moves.length,
    rewritten: plan.rewrites.length,
    deleted: plan.deletes,
    runtimeSetupRequired: true,
  };
}

function retiredDocuments(root) {
  const documents = [];
  const ignored = [];
  for (const dir of rootDirs) {
    const { out, blockers } = collectFiles(root, dir);
    if (blockers.length) throw new Error(blockers.join("; "));
    for (const path of out.filter((item) => item.endsWith(".md"))) {
      if (basename(path).toLowerCase() === "readme.md") ignored.push(path);
      else documents.push(path);
    }
  }
  return { documents: documents.sort(), ignored: ignored.sort() };
}

function retiredDraft(source, text) {
  if (!source.startsWith("memory/")) return text;
  return [
    "---",
    "source: REVIEW_REQUIRED",
    "source-file: REVIEW_REQUIRED_IF_NEEDED",
    "date: REVIEW_REQUIRED",
    "session: REVIEW_REQUIRED",
    "tags: [REVIEW_REQUIRED]",
    "---",
    "",
    "<!-- Review every placeholder above. The retired document is preserved below. -->",
    "",
    text.replace(/\r\n/g, "\n").replace(/^\s+/, ""),
  ].join("\n");
}

export function createRetiredReview(projectRoot, outputDir) {
  const root = resolve(projectRoot || process.cwd());
  const output = resolve(outputDir || "");
  const detected = detectLayout(root);
  if (detected.layout !== "retired-v3") {
    throw new Error(`retired review requires retired-v3; detected ${detected.layout}`);
  }
  if (!outputDir) throw new Error("--output is required");
  if (output === root || output.startsWith(`${root}${sep}`)) {
    throw new Error("review output must be outside the project being reviewed");
  }
  if (existsSync(output) && readdirSync(output).length > 0) {
    throw new Error("review output directory must be empty");
  }

  const before = sha256(JSON.stringify(retiredDocuments(root)));
  const { documents, ignored } = retiredDocuments(root);
  const manifest = {
    sourceProject: root,
    detected: "retired-v3",
    finalizationAvailable: false,
    reviewRequired: true,
    unresolvedMemoryFields: ["source", "source-file", "date", "session", "tags"],
    documents: [],
    ignoredIndexes: ignored,
  };

  mkdirSync(output, { recursive: true });
  for (const source of documents) {
    const destination = `knowledge/${source}`;
    const text = readFileSync(resolve(root, source), "utf8");
    const draft = retiredDraft(source, text);
    const absoluteDestination = resolve(output, destination);
    mkdirSync(dirname(absoluteDestination), { recursive: true });
    writeFileSync(absoluteDestination, draft, "utf8");
    manifest.documents.push({
      source,
      draft: destination,
      sourceSha256: sha256(text),
      status: source.startsWith("memory/") ? "review-required" : "copied-for-review",
    });
  }

  writeFileSync(
    resolve(output, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );
  writeFileSync(
    resolve(output, "README.md"),
    [
      "# Retired project-knowledge conversion review",
      "",
      "These are drafts, not approved project truth. The source project was not changed.",
      "Every `REVIEW_REQUIRED` field must be resolved and every document approved",
      "through the normal remember flow. This package has no finalize command.",
      "",
    ].join("\n"),
    "utf8",
  );

  const after = sha256(JSON.stringify(retiredDocuments(root)));
  if (before !== after) throw new Error("source project changed during retired review");
  return manifest;
}

function usage() {
  return [
    "Usage:",
    "  knowledge-layout.mjs detect [project-root] [--json]",
    "  knowledge-layout.mjs plan [project-root] [--json]",
    "  knowledge-layout.mjs apply [project-root] --approve <plan-hash>",
    "  knowledge-layout.mjs review-retired [project-root] --output <empty-dir>",
  ].join("\n");
}

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function positionalRoot(args) {
  return resolve(args.find((arg, index) => (
    index > 0 && !arg.startsWith("--") && args[index - 1] !== "--approve" && args[index - 1] !== "--output"
  )) || process.cwd());
}

function printPlan(plan, asJson) {
  const visible = { ...publicPlan(plan), hash: plan.hash, writes: false };
  if (asJson) return console.log(JSON.stringify(visible, null, 2));
  console.log(`Layout: ${visible.layout}`);
  console.log(`Moves: ${visible.moves.length}`);
  console.log(`Link rewrites: ${visible.rewrites.length}`);
  console.log(`Generated files discarded: ${visible.deletes.length}`);
  console.log(`Creates: ${visible.creates.map((item) => item.path).join(", ") || "none"}`);
  if (visible.blockers.length) console.log(`Blockers:\n- ${visible.blockers.join("\n- ")}`);
  if (visible.warnings.length) console.log(`Warnings:\n- ${visible.warnings.join("\n- ")}`);
  console.log(`Plan hash: ${visible.hash}`);
  console.log("No files changed.");
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  if (!command || ["-h", "--help", "help"].includes(command)) {
    console.log(usage());
    return;
  }
  const root = positionalRoot(args);
  const asJson = args.includes("--json");

  if (command === "detect") {
    const result = detectLayout(root);
    console.log(asJson ? JSON.stringify(result, null, 2) : `Layout: ${result.layout}\nNo files changed.`);
    return;
  }
  if (command === "plan") {
    printPlan(planMigration(root), asJson);
    return;
  }
  if (command === "apply") {
    const result = applyMigration(root, option(args, "--approve"));
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === "review-retired") {
    const result = createRetiredReview(root, option(args, "--output"));
    console.log(
      `Wrote ${result.documents.length} review draft(s). Source project unchanged. `
      + "No finalize command exists.",
    );
    return;
  }
  throw new Error(usage());
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

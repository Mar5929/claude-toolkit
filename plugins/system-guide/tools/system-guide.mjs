#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CONFIG_FILE = ".system-guide.json";
const FORMAT_VERSION = 1;
const GENERATED_MARKER = "<!-- system-guide:generated -->";
const STANDARD_AREAS = [
  "business",
  "data-model",
  "objects",
  "fields",
  "processes",
  "relationships",
  "applications",
];
const SKIPPED_DIRECTORIES = new Set([".git", "node_modules", ".system-guide"]);
const RESERVED_GUIDE_DIRECTORIES = new Set([".git", ".claude", ".codex", ".agents", "node_modules"]);
const CODE_EXTENSIONS = new Map([
  [".js", "JavaScript"], [".jsx", "JavaScript"], [".mjs", "JavaScript"],
  [".cjs", "JavaScript"], [".ts", "TypeScript"], [".tsx", "TypeScript"],
  [".mts", "TypeScript"], [".cts", "TypeScript"], [".py", "Python"],
]);

export class SystemGuideError extends Error {
  constructor(message, code = "system_guide_error", details = undefined) {
    super(message);
    this.name = "SystemGuideError";
    this.code = code;
    this.details = details;
  }
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hashFile(filePath) {
  return sha256(fs.readFileSync(filePath));
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function isoTimestamp(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) throw new SystemGuideError("Refresh time is invalid", "invalid_time");
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function normalizedRoot(root) {
  const resolved = path.resolve(root || process.cwd());
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new SystemGuideError(`Project root does not exist: ${resolved}`, "invalid_root");
  }
  return fs.realpathSync(resolved);
}

function safeRelative(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new SystemGuideError(`${label} must be a non-empty relative path`, "unsafe_path");
  }
  const candidate = value.replace(/\\/g, "/");
  if (candidate.includes("\0") || path.posix.isAbsolute(candidate) || path.win32.isAbsolute(candidate)) {
    throw new SystemGuideError(`${label} must stay inside the project`, "unsafe_path");
  }
  const segments = candidate.split("/");
  if (segments.some((part) => part === "" || part === "." || part === "..")) {
    throw new SystemGuideError(`${label} may not contain empty, current, or parent segments`, "unsafe_path");
  }
  return segments.join("/");
}

function safeResolve(root, relative, label = "Path") {
  const normalized = safeRelative(relative, label);
  const target = path.resolve(root, ...normalized.split("/"));
  const rel = path.relative(root, target);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new SystemGuideError(`${label} must stay inside the project`, "unsafe_path");
  }
  assertNoSymlink(root, target, label);
  return target;
}

function assertNoSymlink(root, target, label) {
  const rel = path.relative(root, target);
  let cursor = root;
  for (const segment of rel.split(path.sep)) {
    cursor = path.join(cursor, segment);
    if (!fs.existsSync(cursor)) continue;
    const stat = fs.lstatSync(cursor);
    if (stat.isSymbolicLink()) {
      throw new SystemGuideError(`${label} may not pass through a symbolic link: ${cursor}`, "unsafe_symlink");
    }
  }
}

function readJson(filePath, label) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") throw new SystemGuideError(`${label} does not exist`, "missing_file");
    throw error;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new SystemGuideError(`${label} is not valid JSON: ${error.message}`, "invalid_json");
  }
}

function validateConfig(root, config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new SystemGuideError("System Guide config must be a JSON object", "invalid_config");
  }
  if (config.version !== FORMAT_VERSION) {
    throw new SystemGuideError(`Unsupported System Guide config version: ${config.version}`, "invalid_config");
  }
  if (typeof config.enabled !== "boolean") {
    throw new SystemGuideError("System Guide config enabled must be true or false", "invalid_config");
  }
  const guidePath = safeRelative(config.guidePath, "guidePath");
  if (guidePath.split("/").some((part) => RESERVED_GUIDE_DIRECTORIES.has(part.toLowerCase()))) {
    throw new SystemGuideError(`guidePath may not use a reserved project directory: ${guidePath}`, "unsafe_path");
  }
  safeResolve(root, guidePath, "guidePath");
  if (!Array.isArray(config.sources)) {
    throw new SystemGuideError("System Guide config sources must be an array", "invalid_config");
  }
  const seen = new Set();
  const sources = config.sources.map((source, index) => {
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      throw new SystemGuideError(`Source ${index + 1} must be an object`, "invalid_config");
    }
    const sourcePath = safeRelative(source.path, `sources[${index}].path`);
    if (!new Set(["code", "salesforce"]).has(source.kind)) {
      throw new SystemGuideError(`Source ${sourcePath} kind must be code or salesforce`, "invalid_config");
    }
    if (!new Set(["complete", "partial"]).has(source.completeness)) {
      throw new SystemGuideError(`Source ${sourcePath} completeness must be complete or partial`, "invalid_config");
    }
    if (sourcePath === guidePath || sourcePath.startsWith(`${guidePath}/`)) {
      throw new SystemGuideError(`Source ${sourcePath} is inside the guide output`, "unsafe_path");
    }
    if (sourcePath.split("/").some((part) => SKIPPED_DIRECTORIES.has(part))) {
      throw new SystemGuideError(`Source ${sourcePath} is a protected directory`, "unsafe_path");
    }
    safeResolve(root, sourcePath, `Source ${sourcePath}`);
    const key = `${source.kind}:${sourcePath}`;
    if (seen.has(key)) throw new SystemGuideError(`Duplicate source: ${key}`, "invalid_config");
    seen.add(key);
    return { path: sourcePath, kind: source.kind, completeness: source.completeness };
  });
  return { version: FORMAT_VERSION, enabled: config.enabled, guidePath, sources };
}

function configPath(root) {
  return path.join(root, CONFIG_FILE);
}

function loadConfig(root, required = true) {
  const filePath = configPath(root);
  if (!fs.existsSync(filePath)) {
    if (!required) return null;
    throw new SystemGuideError(`System Guide is not configured at ${CONFIG_FILE}`, "not_configured");
  }
  assertNoSymlink(root, filePath, CONFIG_FILE);
  return validateConfig(root, readJson(filePath, CONFIG_FILE));
}

function requiredGuideEntries() {
  return ["README.md", "tour.md", "generated/build.json", ...STANDARD_AREAS.flatMap((area) => [
    `${area}/README.md`, `${area}/generated`, `${area}/generated/README.md`, `${area}/generated/meaning-index.md`, `${area}/meaning`,
  ])];
}

function scaffoldReadme(guidePath, record = null, meaning = []) {
  const coverage = record?.coverage?.length
    ? renderTable(["Source", "Kind", "Completeness", "Files", "Limits"], record.coverage.map((source) => [source.path, source.kind, source.completeness, source.fileCount, source.limits]))
    : "No source refresh has been recorded yet.\n";
  const warnings = meaning.filter((entry) => entry.status !== "current");
  return `${GENERATED_MARKER}\n\n# System Guide\n\nThis guide covers the configured sources for this project. Generated evidence is rebuilt from those sources. Meaning is edited separately and requires the owner's approval.\n\n## Start here\n\n- [System tour](tour.md)\n${STANDARD_AREAS.map((area) => `- [${title(area)}](${area}/README.md)`).join("\n")}\n\n## Coverage and freshness\n\nLast successful refresh: ${record?.refreshedAt ?? "Not refreshed"}\n\n${coverage}\n${warnings.length ? `## Meaning needing review\n\n${warnings.map((entry) => `- [${entry.title}](${entry.area}/meaning/${entry.file}) - ${entry.status}`).join("\n")}\n` : "## Meaning needing review\n\nNone found from the recorded source evidence.\n"}\nThe configured guide location is \`${guidePath}/\`. The machine-readable build record is [generated/build.json](generated/build.json).\n`;
}

function scaffoldTour(record = null, meaning = []) {
  const model = record?.model ?? {};
  const counts = {
    "Code modules": model.modules?.length ?? 0,
    "Salesforce objects": model.objects?.length ?? 0,
    "Salesforce fields": model.fields?.length ?? 0,
    "Salesforce processes": model.processes?.length ?? 0,
    "Source relationships": model.relationships?.length ?? 0,
    "Approved meaning pages": meaning.filter((entry) => entry.approved).length,
  };
  const usefulMeaning = meaning.slice(0, 8);
  return `${GENERATED_MARKER}\n\n# System tour\n\nThe current generated map contains ${Object.entries(counts).map(([label, count]) => `${count} ${label.toLowerCase()}`).join(", ")}. It was last refreshed ${record?.refreshedAt ?? "never"}.\n\n## Major parts\n\n${Object.entries(counts).map(([label, count]) => `- ${label}: ${count}`).join("\n")}\n\n## Approved explanations\n\n${usefulMeaning.length ? usefulMeaning.map((entry) => `- [${entry.title}](${entry.area}/meaning/${entry.file}): ${entry.description}`).join("\n") : "No approved meaning has been recorded yet."}\n\n## Known limits\n\n${record?.coverage?.length ? record.coverage.map((source) => `- ${source.path}: ${source.limits}`).join("\n") : "- No source coverage has been recorded."}\n\nUse the area indexes for detail. Source structure does not establish business purpose by itself; record purpose only through an approved meaning change.\n`;
}

function areaReadme(area, meaning = []) {
  const entries = meaning.filter((entry) => entry.area === area);
  return `${GENERATED_MARKER}\n\n# ${title(area)}\n\n- [Generated evidence](generated/README.md)\n- [Meaning evidence and review status](generated/meaning-index.md)\n\n## Meaning pages\n\n${entries.length ? entries.map((entry) => `- [${entry.title}](meaning/${entry.file}): ${entry.description}${entry.status === "current" ? "" : ` (${entry.status})`}`).join("\n") : "No meaning pages are recorded in this area."}\n`;
}

function generatedAreaReadme(area, artifact) {
  const artifactLine = artifact ? `\n- [${artifact.label}](${artifact.file})` : "";
  return `${GENERATED_MARKER}\n\n# Generated ${title(area).toLowerCase()} evidence\n\nThis folder is rebuilt from configured sources. Direct evidence and inferred connections are labelled separately.${artifactLine}\n- [Approved meaning evidence and review status](meaning-index.md)\n`;
}

function title(value) {
  return value.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

function directoryHasEntries(dir) {
  return fs.existsSync(dir) && fs.readdirSync(dir).length > 0;
}

function writeIfMissing(filePath, content, created, preserved) {
  if (fs.existsSync(filePath)) {
    preserved.push(filePath);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, { encoding: "utf8", mode: 0o600, flag: "wx" });
  created.push(filePath);
}

export function setupGuide(root, options = {}) {
  const projectRoot = normalizedRoot(root);
  const existing = loadConfig(projectRoot, false);
  const guidePath = safeRelative(options.guidePath ?? existing?.guidePath ?? "knowledge/system", "guidePath");
  const rawSources = options.sources ?? existing?.sources ?? [];
  const config = validateConfig(projectRoot, {
    version: FORMAT_VERSION,
    enabled: true,
    guidePath,
    sources: rawSources,
  });
  const guideRoot = safeResolve(projectRoot, guidePath, "guidePath");
  if (!existing && directoryHasEntries(guideRoot) && options.adopt !== true) {
    throw new SystemGuideError(
      `The established guide at ${guidePath} is not configured. Re-run with adopt: true after reviewing it.`,
      "adoption_required",
    );
  }
  if (existing && existing.guidePath !== guidePath && directoryHasEntries(guideRoot) && options.adopt !== true) {
    throw new SystemGuideError(`The destination ${guidePath} already has content; explicit adoption is required`, "adoption_required");
  }
  const created = [];
  const preserved = [];
  fs.mkdirSync(guideRoot, { recursive: true });
  writeIfMissing(path.join(guideRoot, "README.md"), scaffoldReadme(guidePath), created, preserved);
  writeIfMissing(path.join(guideRoot, "tour.md"), scaffoldTour(), created, preserved);
  for (const area of STANDARD_AREAS) {
    const areaRoot = path.join(guideRoot, area);
    fs.mkdirSync(path.join(areaRoot, "generated"), { recursive: true });
    fs.mkdirSync(path.join(areaRoot, "meaning"), { recursive: true });
    writeIfMissing(path.join(areaRoot, "README.md"), areaReadme(area), created, preserved);
    writeIfMissing(path.join(areaRoot, "generated", "README.md"), generatedAreaReadme(area), created, preserved);
    writeIfMissing(path.join(areaRoot, "generated", "meaning-index.md"), meaningIndex(area, []), created, preserved);
  }
  fs.mkdirSync(path.join(guideRoot, "generated"), { recursive: true });
  fs.mkdirSync(path.join(guideRoot, ".system-guide", "previews"), { recursive: true });
  writeIfMissing(path.join(guideRoot, "generated", "build.json"), stableJson({
    version: FORMAT_VERSION,
    generator: "system-guide",
    refreshedAt: null,
    snapshotHash: null,
    coverage: [],
    unsupported: { dynamicCodeImports: 0 },
    model: { modules: [], objects: [], fields: [], processes: [], relationships: [] },
  }), created, preserved);
  atomicWrite(configPath(projectRoot), stableJson(config));
  return {
    outcome: existing ? "configured" : options.adopt ? "adopted" : "created",
    state: "on",
    guidePath,
    sources: config.sources,
    created: created.map((file) => toPosix(path.relative(projectRoot, file))),
    preserved: preserved.map((file) => toPosix(path.relative(projectRoot, file))),
  };
}

export function disableGuide(root) {
  const projectRoot = normalizedRoot(root);
  const config = loadConfig(projectRoot);
  if (!config.enabled) return { outcome: "unchanged", state: "off", guidePath: config.guidePath };
  atomicWrite(configPath(projectRoot), stableJson({ ...config, enabled: false }));
  return { outcome: "disabled", state: "off", guidePath: config.guidePath, contentPreserved: true };
}

function readBuildRecord(projectRoot, config) {
  const buildPath = safeResolve(projectRoot, `${config.guidePath}/generated/build.json`, "build record");
  if (!fs.existsSync(buildPath)) return null;
  try {
    const record = readJson(buildPath, "System Guide build record");
    if (record.version !== FORMAT_VERSION || record.generator !== "system-guide") return null;
    return record;
  } catch {
    return null;
  }
}

export function inspectGuide(root) {
  let projectRoot;
  try {
    projectRoot = normalizedRoot(root);
  } catch (error) {
    return { state: "needs-repair", enabled: false, guidePath: null, coverage: [], lastRefresh: null, problems: [problem(error)] };
  }
  const filePath = configPath(projectRoot);
  if (!fs.existsSync(filePath)) {
    return { state: "off", enabled: false, guidePath: null, coverage: [], lastRefresh: null, problems: [] };
  }
  let config;
  try {
    config = loadConfig(projectRoot);
  } catch (error) {
    return { state: "needs-repair", enabled: false, guidePath: null, coverage: [], lastRefresh: null, problems: [problem(error)] };
  }
  const record = readBuildRecord(projectRoot, config);
  if (!config.enabled) {
    return {
      state: "off", enabled: false, guidePath: config.guidePath,
      coverage: record?.coverage ?? [], lastRefresh: record?.refreshedAt ?? null, problems: [],
    };
  }
  const guideRoot = safeResolve(projectRoot, config.guidePath, "guidePath");
  const problems = [];
  for (const entry of requiredGuideEntries()) {
    if (!fs.existsSync(path.join(guideRoot, ...entry.split("/")))) {
      problems.push({ code: "missing_guide_entry", message: `Missing ${config.guidePath}/${entry}` });
    }
  }
  return {
    state: problems.length ? "needs-repair" : "on",
    enabled: true,
    guidePath: config.guidePath,
    coverage: record?.coverage ?? [],
    lastRefresh: record?.refreshedAt ?? null,
    problems,
  };
}

function problem(error) {
  return { code: error?.code ?? "system_guide_error", message: error?.message ?? String(error) };
}

function secretLikeName(name) {
  const lower = name.toLowerCase();
  return lower === ".env" || lower.startsWith(".env.") || /(^|[._-])(secret|credential|credentials|private[-_]?key)([._-]|$)/i.test(name) || /\.(pem|p12|pfx|key)$/i.test(name);
}

function walkFiles(projectRoot, sourceRoot, guideRoot, accept) {
  const found = [];
  const visit = (dir) => {
    assertNoSymlink(projectRoot, dir, "Source path");
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (SKIPPED_DIRECTORIES.has(entry.name) || secretLikeName(entry.name)) continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        throw new SystemGuideError(`Source scan refused symbolic link: ${toPosix(path.relative(projectRoot, absolute))}`, "unsafe_symlink");
      }
      if (absolute === guideRoot || absolute.startsWith(`${guideRoot}${path.sep}`)) continue;
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && accept(absolute)) found.push(absolute);
    }
  };
  if (!fs.existsSync(sourceRoot)) throw new SystemGuideError(`Configured source is missing: ${toPosix(path.relative(projectRoot, sourceRoot))}`, "missing_source");
  if (!fs.statSync(sourceRoot).isDirectory()) throw new SystemGuideError("Configured source must be a directory", "invalid_source");
  visit(sourceRoot);
  return found.sort((a, b) => toPosix(path.relative(projectRoot, a)).localeCompare(toPosix(path.relative(projectRoot, b))));
}

function sourceDigest(projectRoot, files) {
  return sha256(files.map((file) => `${toPosix(path.relative(projectRoot, file))}\0${hashFile(file)}`).join("\n"));
}

function lineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function codeTarget(projectPath) {
  return `code:${projectPath}`;
}

function resolveCodeImport(sourceFile, specifier, sourceRoot, knownFiles, language) {
  let base;
  if (language === "Python") {
    if (specifier.startsWith(".")) {
      const dots = specifier.match(/^\.+/)?.[0].length ?? 0;
      let dir = path.dirname(sourceFile);
      for (let i = 1; i < dots; i += 1) dir = path.dirname(dir);
      base = path.join(dir, specifier.slice(dots).replace(/\./g, path.sep));
    } else {
      base = path.join(sourceRoot, specifier.replace(/\./g, path.sep));
    }
    for (const candidate of [`${base}.py`, path.join(base, "__init__.py")]) {
      if (knownFiles.has(path.resolve(candidate))) return path.resolve(candidate);
    }
    return null;
  }
  if (!specifier.startsWith(".")) return null;
  base = path.resolve(path.dirname(sourceFile), specifier);
  const extensions = [...CODE_EXTENSIONS.keys()];
  const candidates = [base, ...extensions.map((ext) => `${base}${ext}`), ...extensions.map((ext) => path.join(base, `index${ext}`))];
  return candidates.find((candidate) => knownFiles.has(path.resolve(candidate))) ?? null;
}

function parseCodeSource(projectRoot, source, files) {
  const known = new Set(files.map((file) => path.resolve(file)));
  const modules = [];
  const relationships = [];
  let dynamicImports = 0;
  for (const file of files) {
    const projectPath = toPosix(path.relative(projectRoot, file));
    const language = CODE_EXTENSIONS.get(path.extname(file).toLowerCase());
    const text = fs.readFileSync(file, "utf8");
    const imports = [];
    if (language === "Python") {
      const regex = /^(?:from\s+([.A-Za-z_][\w.]*)\s+import\s+[^\n#]+|import\s+([A-Za-z_][\w.]*))/gm;
      for (const match of text.matchAll(regex)) imports.push({ specifier: match[1] ?? match[2], index: match.index, syntax: match[0].trim() });
    } else {
      const staticRegex = /(?:import|export)\s+(?:[^"'\n]*?\s+from\s+)?["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)|import\(\s*["']([^"']+)["']\s*\)/g;
      for (const match of text.matchAll(staticRegex)) imports.push({ specifier: match[1] ?? match[2] ?? match[3], index: match.index, syntax: match[0], form: match[3] ? "literal-dynamic" : "static" });
      dynamicImports += [...text.matchAll(/(?:require|import)\(\s*(?!["'])/g)].length;
    }
    const localTargets = [];
    for (const item of imports) {
      const resolved = resolveCodeImport(file, item.specifier, safeResolve(projectRoot, source.path, "source path"), known, language);
      if (!resolved) continue;
      const targetPath = toPosix(path.relative(projectRoot, resolved));
      localTargets.push(targetPath);
      relationships.push({
        id: `imports:${projectPath}->${targetPath}`,
        sourceKey: `${source.kind}:${source.path}`,
        from: codeTarget(projectPath), to: codeTarget(targetPath), type: item.form === "literal-dynamic" ? "dynamically imports" : "imports",
        classification: "inferred",
        evidence: `${projectPath}:${lineNumber(text, item.index)}`,
        note: item.form === "literal-dynamic"
          ? `A dynamic import has a literal path resolved to ${targetPath} using supported file and index conventions.`
          : `A static import names a path resolved to ${targetPath} using supported file and index conventions.`,
      });
    }
    const exportCount = language === "Python"
      ? [...text.matchAll(/^\s*(?:class|def)\s+[A-Za-z_]\w*/gm)].length
      : [...text.matchAll(/\bexport\s+(?:default\s+)?(?:async\s+)?(?:class|function|const|let|var)\b/g)].length;
    modules.push({
      id: codeTarget(projectPath), sourceKey: `${source.kind}:${source.path}`, path: projectPath,
      language, exportCount, localDependencies: [...new Set(localTargets)].sort(), observation: "observed",
    });
  }
  return { modules, relationships, dynamicImports };
}

function xmlValue(source, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`<${escaped}>([\\s\\S]*?)</${escaped}>`, "i"))?.[1]?.trim() ?? null;
}

function xmlValues(source, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...source.matchAll(new RegExp(`<${escaped}>([\\s\\S]*?)</${escaped}>`, "gi"))].map((match) => match[1].trim());
}

function xmlBlocks(source, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...source.matchAll(new RegExp(`<${escaped}>([\\s\\S]*?)</${escaped}>`, "gi"))].map((match) => ({ text: match[1], index: match.index }));
}

function sfName(file, suffix) {
  return path.basename(file).slice(0, -suffix.length);
}

function assertXmlEnvelope(source, rootTag, projectPath) {
  const open = source.search(new RegExp(`<${rootTag}(?:\\s[^>]*)?>`, "i"));
  const close = source.search(new RegExp(`</${rootTag}>`, "i"));
  if (open < 0 || close < open) {
    throw new SystemGuideError(`Salesforce metadata is incomplete or has the wrong root element: ${projectPath}`, "invalid_source");
  }
}

function parseSalesforceSource(projectRoot, source, files) {
  const objects = [];
  const fields = [];
  const processes = [];
  const relationships = [];
  for (const file of files) {
    const projectPath = toPosix(path.relative(projectRoot, file));
    const text = fs.readFileSync(file, "utf8");
    if (file.endsWith(".object-meta.xml")) {
      assertXmlEnvelope(text, "CustomObject", projectPath);
      const name = sfName(file, ".object-meta.xml");
      objects.push({ id: `salesforce:object:${name}`, sourceKey: `${source.kind}:${source.path}`, name, label: xmlValue(text, "label"), path: projectPath, observation: "observed" });
    } else if (file.endsWith(".field-meta.xml")) {
      assertXmlEnvelope(text, "CustomField", projectPath);
      const parts = projectPath.split("/");
      const objectIndex = parts.lastIndexOf("objects");
      const objectName = objectIndex >= 0 ? parts[objectIndex + 1] : "unknown-object";
      const name = xmlValue(text, "fullName") ?? sfName(file, ".field-meta.xml");
      const fieldId = `salesforce:field:${objectName}.${name}`;
      fields.push({ id: fieldId, sourceKey: `${source.kind}:${source.path}`, object: objectName, name, type: xmlValue(text, "type") ?? "unknown", referenceTo: xmlValue(text, "referenceTo"), path: projectPath, observation: "observed" });
      relationships.push({ id: `contains:${objectName}.${name}`, sourceKey: `${source.kind}:${source.path}`, from: `salesforce:object:${objectName}`, to: fieldId, type: "contains field", classification: "direct", evidence: `${projectPath}:1`, note: "The metadata folder and field fullName identify this field's object." });
      for (const reference of xmlValues(text, "referenceTo")) {
        relationships.push({ id: `references:${objectName}.${name}->${reference}`, sourceKey: `${source.kind}:${source.path}`, from: fieldId, to: `salesforce:object:${reference}`, type: "references", classification: "direct", evidence: `${projectPath}:1`, note: "The field metadata declares referenceTo." });
      }
    } else if (file.endsWith(".flow-meta.xml")) {
      assertXmlEnvelope(text, "Flow", projectPath);
      const name = sfName(file, ".flow-meta.xml");
      const processId = `salesforce:flow:${name}`;
      const objectNames = [...new Set(xmlValues(text, "object"))].sort();
      const fieldNames = [...new Set([...xmlValues(text, "field"), ...xmlValues(text, "assignToReference")].filter((value) => /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?$/.test(value)))].sort();
      processes.push({ id: processId, sourceKey: `${source.kind}:${source.path}`, name, status: xmlValue(text, "status") ?? "unknown", processType: xmlValue(text, "processType") ?? "unknown", objects: objectNames, fields: fieldNames, path: projectPath, observation: "observed" });
      for (const objectName of objectNames) relationships.push({ id: `flow-object:${name}->${objectName}`, sourceKey: `${source.kind}:${source.path}`, from: processId, to: `salesforce:object:${objectName}`, type: "mentions object", classification: "direct", evidence: `${projectPath}:1`, note: "The flow metadata contains an object element." });
      for (const fieldName of fieldNames) relationships.push({ id: `flow-field:${name}->${fieldName}`, sourceKey: `${source.kind}:${source.path}`, from: processId, to: `salesforce:field-reference:${fieldName}`, type: "mentions field", classification: "direct", evidence: `${projectPath}:1`, note: "The flow metadata contains a supported field reference element." });
      for (const elementName of ["recordUpdates", "recordCreates"]) {
        for (const block of xmlBlocks(text, elementName)) {
          const objectName = xmlValue(block.text, "object");
          if (!objectName) continue;
          for (const assignment of xmlBlocks(block.text, "inputAssignments")) {
            const fieldName = xmlValue(assignment.text, "field");
            if (!fieldName || !/^[A-Za-z_]\w*$/.test(fieldName)) continue;
            relationships.push({
              id: `flow-write:${name}:${elementName}->${objectName}.${fieldName}`,
              sourceKey: `${source.kind}:${source.path}`,
              from: processId,
              to: `salesforce:field:${objectName}.${fieldName}`,
              type: "writes field",
              classification: "direct",
              evidence: `${projectPath}:${lineNumber(text, block.index)}`,
              note: `The ${elementName} element names ${objectName} and assigns ${fieldName} in the same record operation.`,
            });
          }
        }
      }
    }
  }
  return { objects, fields, processes, relationships };
}

function mergePartial(previousItems, currentItems, sourceKey, partial) {
  if (!partial) return currentItems;
  const currentIds = new Set(currentItems.map((item) => item.id));
  const retained = (previousItems ?? [])
    .filter((item) => item.sourceKey === sourceKey && !currentIds.has(item.id))
    .map((item) => ({ ...item, observation: "not-seen-in-partial-refresh" }));
  return [...currentItems, ...retained].sort((a, b) => a.id.localeCompare(b.id));
}

function markdownLink(fromFile, projectRoot, projectPath, line = null) {
  const target = path.join(projectRoot, ...projectPath.split("/"));
  const relative = toPosix(path.relative(path.dirname(fromFile), target));
  return `${relative.startsWith(".") ? relative : `./${relative}`}${line ? `#L${line}` : ""}`;
}

function evidenceLink(fromFile, projectRoot, evidence) {
  const match = evidence.match(/^(.*):(\d+)$/);
  const sourcePath = match ? match[1] : evidence;
  return markdownLink(fromFile, projectRoot, sourcePath, match ? Number(match[2]) : null);
}

function renderTable(headers, rows) {
  if (!rows.length) return "No supported facts were found in the configured sources.\n";
  const clean = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
  return `| ${headers.join(" | ")} |\n| ${headers.map(() => "---").join(" | ")} |\n${rows.map((row) => `| ${row.map(clean).join(" | ")} |`).join("\n")}\n`;
}

function renderModules(outputFile, projectRoot, modules) {
  return `${GENERATED_MARKER}\n\n# Code module map\n\nThis is a file-level navigation map. It does not turn every function into prose. Export counts are syntax matches, and local dependencies include only supported static imports that resolve inside the configured source.\n\n${renderTable(["Stable target", "Module", "Language", "Exports found", "Local dependencies", "Snapshot observation"], modules.map((module) => [
    `\`${module.id}\``, `[${module.path}](${markdownLink(outputFile, projectRoot, module.path)})`, module.language,
    module.exportCount, module.localDependencies.map((item) => `\`${item}\``).join(", ") || "None found", module.observation,
  ]))}`;
}

function renderRelationships(outputFile, projectRoot, relationships) {
  return `${GENERATED_MARKER}\n\n# Source relationship map\n\nDirect means the source explicitly declares the relationship. Inferred means the tool resolved a static import or a literal dynamic import using its documented file conventions. Non-literal dynamic imports and runtime wiring are outside this map.\n\n${renderTable(["From", "Relationship", "To", "Classification", "Evidence", "Basis", "Snapshot observation"], relationships.map((item) => [
    `\`${item.from}\``, item.type, `\`${item.to}\``, item.classification,
    `[${item.evidence}](${evidenceLink(outputFile, projectRoot, item.evidence)})`, item.note, item.observation ?? "observed",
  ]))}`;
}

function renderSalesforce(outputFile, projectRoot, heading, rows, columns) {
  return `${GENERATED_MARKER}\n\n# ${heading}\n\nThese facts come from the supported Salesforce metadata files named in the evidence column. Labels, descriptions, and file names do not establish business purpose.\n\n${renderTable(columns.map((column) => column.label), rows.map((row) => columns.map((column) => column.render ? column.render(row, outputFile, projectRoot) : row[column.key] ?? "")))}`;
}

function aggregateHash(model) {
  return sha256(stableJson({ modules: model.modules, objects: model.objects, fields: model.fields, processes: model.processes, relationships: model.relationships }));
}

function ownedGenerated(filePath, content) {
  if (!fs.existsSync(filePath)) return;
  const existing = fs.readFileSync(filePath, "utf8");
  if (filePath.endsWith("build.json")) {
    try {
      if (JSON.parse(existing).generator === "system-guide") return;
    } catch {}
  }
  if (!existing.startsWith(GENERATED_MARKER)) {
    throw new SystemGuideError(`Refusing to overwrite owner-maintained file: ${filePath}`, "owner_file_conflict");
  }
}

function atomicWrite(filePath, content) {
  writeTransaction([{ path: filePath, content }], []);
}

function writeTransaction(rawWrites, rawDeletes, failAfterPrepare = false) {
  const writes = rawWrites.filter((entry) => !fs.existsSync(entry.path) || fs.readFileSync(entry.path, "utf8") !== entry.content);
  const deletes = rawDeletes.filter((entry) => fs.existsSync(entry));
  if (!writes.length && !deletes.length) return { changed: [], deleted: [] };
  const nonce = `${process.pid}.${Date.now()}`;
  const prepared = [];
  try {
    for (const entry of writes) {
      fs.mkdirSync(path.dirname(entry.path), { recursive: true });
      const temp = path.join(path.dirname(entry.path), `.${path.basename(entry.path)}.${nonce}.tmp`);
      fs.writeFileSync(temp, entry.content, { encoding: "utf8", mode: 0o600, flag: "wx" });
      prepared.push({ path: entry.path, temp, backup: `${entry.path}.${nonce}.bak`, write: true, existed: fs.existsSync(entry.path), backedUp: false, installed: false });
    }
    for (const filePath of deletes) prepared.push({ path: filePath, temp: null, backup: `${filePath}.${nonce}.bak`, write: false, existed: true, backedUp: false, installed: false });
    if (failAfterPrepare || process.env.SYSTEM_GUIDE_FAIL_AFTER_PREPARE === "1") {
      throw new SystemGuideError("Injected failure after refresh preparation", "injected_failure");
    }
    for (const entry of prepared) {
      if (entry.existed) { fs.renameSync(entry.path, entry.backup); entry.backedUp = true; }
      if (entry.write) { fs.renameSync(entry.temp, entry.path); entry.installed = true; }
    }
  } catch (error) {
    for (const entry of [...prepared].reverse()) {
      try {
        if (entry.installed && fs.existsSync(entry.path)) fs.unlinkSync(entry.path);
        if (entry.backedUp && fs.existsSync(entry.backup)) fs.renameSync(entry.backup, entry.path);
        if (entry.temp && fs.existsSync(entry.temp)) fs.unlinkSync(entry.temp);
      } catch {}
    }
    throw error;
  }
  for (const entry of prepared) {
    if (entry.backedUp && fs.existsSync(entry.backup)) {
      try { fs.unlinkSync(entry.backup); } catch {}
    }
  }
  return { changed: writes.map((entry) => entry.path), deleted: deletes };
}

export function refreshGuide(root, options = {}) {
  const projectRoot = normalizedRoot(root);
  const config = loadConfig(projectRoot);
  if (!config.enabled) throw new SystemGuideError("System Guide is disabled", "guide_disabled");
  const guideRoot = safeResolve(projectRoot, config.guidePath, "guidePath");
  if (!fs.existsSync(guideRoot)) throw new SystemGuideError(`Guide path is missing: ${config.guidePath}`, "needs_repair");
  const previous = readBuildRecord(projectRoot, config);
  let model = { modules: [], objects: [], fields: [], processes: [], relationships: [] };
  const coverage = [];
  let dynamicImports = 0;
  const parsedSources = [];
  for (const source of config.sources) {
    const sourceRoot = safeResolve(projectRoot, source.path, "source path");
    const accept = source.kind === "code"
      ? (file) => CODE_EXTENSIONS.has(path.extname(file).toLowerCase())
      : (file) => /\.(?:object|field|flow)-meta\.xml$/i.test(file);
    const files = walkFiles(projectRoot, sourceRoot, guideRoot, accept);
    const sourceKey = `${source.kind}:${source.path}`;
    const digest = sourceDigest(projectRoot, files);
    const priorCoverage = previous?.coverage?.find((item) => item.path === source.path && item.kind === source.kind);
    const canReuse = options.full !== true
      && priorCoverage?.sourceHash === digest
      && priorCoverage?.completeness === source.completeness
      && previous?.model;
    const parsed = canReuse
      ? Object.fromEntries(["modules", "objects", "fields", "processes", "relationships"].map((key) => [key, (previous.model[key] ?? []).filter((item) => item.sourceKey === sourceKey)]))
      : source.kind === "code"
        ? parseCodeSource(projectRoot, source, files)
        : parseSalesforceSource(projectRoot, source, files);
    if (!canReuse) parsedSources.push(source.path);
    dynamicImports += canReuse ? priorCoverage?.dynamicCodeImports ?? 0 : parsed.dynamicImports ?? 0;
    const partial = source.completeness === "partial";
    for (const key of ["modules", "objects", "fields", "processes", "relationships"]) {
      const current = parsed[key] ?? [];
      const priorForOtherSources = (model[key] ?? []).filter((item) => item.sourceKey !== sourceKey);
      const merged = mergePartial(previous?.model?.[key], current, sourceKey, partial);
      model[key] = [...priorForOtherSources, ...merged];
    }
    coverage.push({
      path: source.path, kind: source.kind, completeness: source.completeness,
      fileCount: files.length, sourceHash: digest,
      dynamicCodeImports: source.kind === "code" ? (canReuse ? priorCoverage?.dynamicCodeImports ?? 0 : parsed.dynamicImports ?? 0) : 0,
      limits: source.kind === "code"
        ? "JavaScript, TypeScript, and Python files; static local imports and literal dynamic imports only; runtime wiring and non-literal dynamic import targets are not resolved."
        : "Salesforce object, field, and flow metadata; selected relationship elements only; this is not a complete Metadata API parser.",
    });
  }
  for (const key of Object.keys(model)) model[key].sort((a, b) => a.id.localeCompare(b.id));
  const snapshotHash = aggregateHash(model);
  const unchanged = previous?.refreshedAt && previous.snapshotHash === snapshotHash && stableJson(previous.coverage) === stableJson(coverage);
  const refreshedAt = unchanged ? previous.refreshedAt : isoTimestamp(options.now);
  const outputs = new Map();
  const output = (relative, content) => outputs.set(path.join(guideRoot, ...relative.split("/")), content);
  output("applications/generated/modules.md", renderModules(path.join(guideRoot, "applications/generated/modules.md"), projectRoot, model.modules));
  output("relationships/generated/source-map.md", renderRelationships(path.join(guideRoot, "relationships/generated/source-map.md"), projectRoot, model.relationships));
  output("objects/generated/salesforce-objects.md", renderSalesforce(path.join(guideRoot, "objects/generated/salesforce-objects.md"), projectRoot, "Salesforce objects", model.objects, [
    { label: "Stable target", render: (row) => `\`${row.id}\`` }, { label: "Object", key: "name" }, { label: "Metadata label", key: "label" },
    { label: "Evidence", render: (row, file, rootPath) => `[${row.path}](${markdownLink(file, rootPath, row.path)})` }, { label: "Snapshot observation", key: "observation" },
  ]));
  output("fields/generated/salesforce-fields.md", renderSalesforce(path.join(guideRoot, "fields/generated/salesforce-fields.md"), projectRoot, "Salesforce fields", model.fields, [
    { label: "Stable target", render: (row) => `\`${row.id}\`` }, { label: "Object", key: "object" }, { label: "Field", key: "name" }, { label: "Type", key: "type" }, { label: "References", key: "referenceTo" },
    { label: "Evidence", render: (row, file, rootPath) => `[${row.path}](${markdownLink(file, rootPath, row.path)})` }, { label: "Snapshot observation", key: "observation" },
  ]));
  output("processes/generated/salesforce-processes.md", renderSalesforce(path.join(guideRoot, "processes/generated/salesforce-processes.md"), projectRoot, "Salesforce processes", model.processes, [
    { label: "Stable target", render: (row) => `\`${row.id}\`` }, { label: "Flow", key: "name" }, { label: "Type", key: "processType" }, { label: "Status", key: "status" },
    { label: "Objects found", render: (row) => row.objects.join(", ") }, { label: "Fields found", render: (row) => row.fields.join(", ") },
    { label: "Evidence", render: (row, file, rootPath) => `[${row.path}](${markdownLink(file, rootPath, row.path)})` }, { label: "Snapshot observation", key: "observation" },
  ]));
  const artifacts = {
    applications: { label: "Code module map", file: "modules.md" },
    relationships: { label: "Source relationship map", file: "source-map.md" },
    objects: { label: "Salesforce object map", file: "salesforce-objects.md" },
    fields: { label: "Salesforce field map", file: "salesforce-fields.md" },
    processes: { label: "Salesforce process map", file: "salesforce-processes.md" },
  };
  for (const area of STANDARD_AREAS) output(`${area}/generated/README.md`, generatedAreaReadme(area, artifacts[area]));
  const record = {
    version: FORMAT_VERSION, generator: "system-guide", refreshedAt, snapshotHash,
    coverage, unsupported: { dynamicCodeImports: dynamicImports }, model,
  };
  output("generated/build.json", stableJson(record));
  const navigation = navigationOutputs(projectRoot, config, record);
  for (const [filePath, content] of navigation.outputs) outputs.set(filePath, content);
  for (const [filePath, content] of outputs) ownedGenerated(filePath, content);
  const transaction = writeTransaction([...outputs].map(([filePath, content]) => ({ path: filePath, content })), [], options.failAfterPrepare === true);
  return {
    outcome: transaction.changed.length ? "refreshed" : "unchanged",
    guidePath: config.guidePath, refreshedAt, snapshotHash, coverage,
    mode: options.full === true ? "full" : "incremental",
    parsedSources,
    counts: { modules: model.modules.length, objects: model.objects.length, fields: model.fields.length, processes: model.processes.length, relationships: model.relationships.length },
    unsupported: record.unsupported,
    changed: transaction.changed.map((file) => toPosix(path.relative(projectRoot, file))),
  };
}

function currentSourceCoverage(projectRoot, config, guideRoot) {
  return config.sources.map((source) => {
    const sourceRoot = safeResolve(projectRoot, source.path, "source path");
    const accept = source.kind === "code"
      ? (file) => CODE_EXTENSIONS.has(path.extname(file).toLowerCase())
      : (file) => /\.(?:object|field|flow)-meta\.xml$/i.test(file);
    const files = walkFiles(projectRoot, sourceRoot, guideRoot, accept);
    return { path: source.path, kind: source.kind, completeness: source.completeness, fileCount: files.length, sourceHash: sourceDigest(projectRoot, files) };
  });
}

function markdownFiles(dir, excluded = new Set()) {
  const files = [];
  const visit = (current) => {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (excluded.has(entry.name) || entry.isSymbolicLink()) continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && entry.name.endsWith(".md")) files.push(absolute);
    }
  };
  visit(dir);
  return files.sort();
}

function parseMeaningFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  const values = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!pair) continue;
    try { values[pair[1]] = JSON.parse(pair[2]); } catch { values[pair[1]] = pair[2]; }
  }
  return values;
}

function meaningBodySummary(text, fallback) {
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
  const titleMatch = body.match(/^#\s+(.+)$/m);
  const titleText = titleMatch?.[1]?.trim() || fallback;
  const withoutHeading = body.replace(/^#\s+.+$/m, "").trim();
  const paragraph = withoutHeading.split(/\r?\n\s*\r?\n/).find((entry) => entry.trim())?.replace(/\s+/g, " ").trim() || "Approved explanation.";
  return { title: titleText, description: paragraph.length > 180 ? `${paragraph.slice(0, 177)}...` : paragraph };
}

function modelTargetStatus(record, targetId) {
  if (!/^(?:code|salesforce):/.test(targetId ?? "")) return "current";
  const items = Object.values(record?.model ?? {}).flatMap((value) => Array.isArray(value) ? value : []);
  const found = items.find((item) => item.id === targetId);
  if (!found) {
    const relevant = (record?.coverage ?? []).filter((source) => {
      if (targetId.startsWith("salesforce:")) return source.kind === "salesforce";
      if (source.kind !== "code") return false;
      const targetPath = targetId.slice("code:".length);
      return targetPath === source.path || targetPath.startsWith(`${source.path}/`);
    });
    if (relevant.length && relevant.every((source) => source.completeness === "complete")) return "target missing from complete captured sources";
    return relevant.length ? "target not confirmed by the partial captured sources" : "target has no matching captured source coverage";
  }
  if (found.observation === "not-seen-in-partial-refresh") return "target not seen in the latest partial snapshot";
  return "current";
}

function sourceReferenceStatus(projectRoot, meta) {
  const refs = Array.isArray(meta?.source_refs) ? meta.source_refs : [];
  const hashes = meta?.source_hashes && typeof meta.source_hashes === "object" ? meta.source_hashes : {};
  for (const ref of refs) {
    if (ref?.kind !== "file" || !ref.path) continue;
    let absolute;
    try { absolute = safeResolve(projectRoot, ref.path, "meaning source reference"); }
    catch { return `source path is unsafe: ${ref.path}`; }
    if (!fs.existsSync(absolute)) return `source missing: ${ref.path}`;
    if (hashes[ref.path] && hashFile(absolute) !== hashes[ref.path]) return `source changed: ${ref.path}`;
  }
  return "current";
}

function collectMeaningEntries(projectRoot, guideRoot, record, overrides = new Map()) {
  const files = new Set(markdownFiles(guideRoot, new Set(["generated", ".system-guide"])).filter((file) => file.split(path.sep).includes("meaning")));
  for (const [file, content] of overrides) content === null ? files.delete(file) : files.add(file);
  return [...files].sort().map((file) => {
    const text = overrides.has(file) ? overrides.get(file) : fs.readFileSync(file, "utf8");
    const relative = toPosix(path.relative(guideRoot, file));
    const parts = relative.split("/");
    const area = parts[0];
    const meta = parseMeaningFrontmatter(text) ?? {};
    const summary = meaningBodySummary(text, path.basename(file, ".md"));
    const approved = Boolean(meta.system_guide_target && meta.approved_by && meta.approval_date && Array.isArray(meta.source_refs) && meta.source_hashes && typeof meta.source_hashes === "object");
    const statuses = approved
      ? [modelTargetStatus(record, meta.system_guide_target), sourceReferenceStatus(projectRoot, meta)].filter((status) => status !== "current")
      : ["approval or metadata missing"];
    return {
      area, file: path.basename(file), path: relative, ...summary,
      targetId: meta.system_guide_target ?? "missing target metadata",
      approved,
      status: statuses.length ? statuses.join("; ") : "current",
    };
  });
}

function meaningIndex(area, entries) {
  const rows = entries.filter((entry) => entry.area === area).map((entry) => [
    `[${entry.title}](../meaning/${entry.file})`, entry.description, `\`${entry.targetId}\``, entry.status,
  ]);
  return `${GENERATED_MARKER}\n\n# ${title(area)} meaning pages\n\nThis generated index points to owner-maintained meaning pages. A status other than current needs review; the page itself is preserved and is not called approved when approval metadata is missing.\n\n${renderTable(["Page", "What it explains", "Stable target", "Evidence status"], rows)}`;
}

function navigationOutputs(projectRoot, config, record, overrides = new Map()) {
  const guideRoot = safeResolve(projectRoot, config.guidePath, "guidePath");
  const entries = collectMeaningEntries(projectRoot, guideRoot, record, overrides);
  const outputs = new Map();
  const addOwnedIndex = (relative, content) => {
    const file = path.join(guideRoot, ...relative.split("/"));
    if (fs.existsSync(file) && !fs.readFileSync(file, "utf8").startsWith(GENERATED_MARKER)) return;
    outputs.set(file, content);
  };
  addOwnedIndex("README.md", scaffoldReadme(config.guidePath, record, entries));
  addOwnedIndex("tour.md", scaffoldTour(record, entries));
  for (const area of STANDARD_AREAS) {
    addOwnedIndex(`${area}/README.md`, areaReadme(area, entries));
    outputs.set(path.join(guideRoot, area, "generated", "meaning-index.md"), meaningIndex(area, entries));
  }
  return { outputs, entries };
}

export function checkGuide(root) {
  const inspection = inspectGuide(root);
  if (inspection.state === "off") return { ok: true, ...inspection, issues: [] };
  if (inspection.state === "needs-repair" && !inspection.guidePath) return { ok: false, ...inspection, issues: inspection.problems };
  const projectRoot = normalizedRoot(root);
  const config = loadConfig(projectRoot);
  const guideRoot = safeResolve(projectRoot, config.guidePath, "guidePath");
  const issues = [...inspection.problems];
  const record = readBuildRecord(projectRoot, config);
  if (record) {
    try {
      const current = currentSourceCoverage(projectRoot, config, guideRoot);
      for (const source of current) {
        const prior = record.coverage?.find((item) => item.path === source.path && item.kind === source.kind);
        if (!prior || prior.sourceHash !== source.sourceHash) issues.push({ code: "source_changed", message: `Source changed since the last successful refresh: ${source.path}` });
      }
    } catch (error) { issues.push(problem(error)); }
  }
  for (const file of markdownFiles(guideRoot, new Set([".system-guide"]))) {
    const text = fs.readFileSync(file, "utf8");
    for (const target of linkTargets(file, text)) {
      const relativeToRoot = path.relative(projectRoot, target);
      if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
        issues.push({ code: "unsafe_guide_link", message: `${toPosix(path.relative(projectRoot, file))} links outside the project` });
      } else if (!fs.existsSync(target)) {
        issues.push({ code: "broken_guide_link", message: `${toPosix(path.relative(projectRoot, file))} links to missing ${toPosix(relativeToRoot)}` });
      }
    }
  }
  for (const file of markdownFiles(guideRoot, new Set(["generated", ".system-guide"])).filter((file) => file.split(path.sep).includes("meaning"))) {
    const text = fs.readFileSync(file, "utf8");
    const meta = parseMeaningFrontmatter(text);
    const relative = toPosix(path.relative(projectRoot, file));
    if (!meta?.system_guide_target || !meta?.approved_by || !meta?.approval_date || !Array.isArray(meta?.source_refs) || !meta?.source_hashes || typeof meta.source_hashes !== "object") {
      issues.push({ code: "invalid_meaning_metadata", message: `Meaning page lacks target, source references, or approval metadata: ${toPosix(path.relative(projectRoot, file))}` });
      continue;
    }
    const targetStatus = modelTargetStatus(record, meta.system_guide_target);
    if (targetStatus.startsWith("target missing")) {
      issues.push({ code: "meaning_target_missing", message: `${relative}: ${targetStatus}` });
    } else if (targetStatus.startsWith("target not") || targetStatus.startsWith("target has no")) {
      issues.push({ code: "meaning_target_unconfirmed", message: `${relative}: ${targetStatus}` });
    }
    for (const ref of meta.source_refs) {
      if (ref?.kind !== "file" || !ref.path) continue;
      let sourceFile;
      try { sourceFile = safeResolve(projectRoot, ref.path, "meaning source reference"); }
      catch (error) { issues.push({ code: "meaning_source_unsafe", message: `${relative}: ${error.message}` }); continue; }
      if (!fs.existsSync(sourceFile)) {
        issues.push({ code: "meaning_source_missing", message: `${relative}: source missing: ${ref.path}` });
      } else if (meta.source_hashes[ref.path] && hashFile(sourceFile) !== meta.source_hashes[ref.path]) {
        issues.push({ code: "meaning_source_changed", message: `${relative}: source changed: ${ref.path}` });
      }
    }
  }
  return {
    ok: issues.length === 0,
    state: issues.length ? "needs-repair" : inspection.state,
    enabled: inspection.enabled, guidePath: inspection.guidePath,
    coverage: inspection.coverage, lastRefresh: inspection.lastRefresh,
    problems: inspection.problems, issues,
  };
}

function safeMeaningDestination(projectRoot, guideRoot, relative) {
  const normalized = safeRelative(relative, "meaning destination");
  if (!/(^|\/)meaning\/[^/]+\.md$/i.test(normalized)) {
    throw new SystemGuideError("Meaning destination must be a Markdown file directly inside a meaning folder", "invalid_meaning_path");
  }
  const target = path.resolve(guideRoot, ...normalized.split("/"));
  const rel = path.relative(guideRoot, target);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) throw new SystemGuideError("Meaning destination escapes the guide", "unsafe_path");
  assertNoSymlink(projectRoot, target, "meaning destination");
  return { normalized, target };
}

function validateSafeText(value, label) {
  const text = String(value ?? "");
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bgh[pousr]_[A-Za-z0-9]{30,}\b/.test(text)) {
    throw new SystemGuideError(`${label} appears to contain a credential`, "secret_detected");
  }
  return text;
}

function normalizedSourceRefs(projectRoot, refs) {
  if (!Array.isArray(refs) || refs.length === 0) throw new SystemGuideError("Meaning changes require at least one source reference", "missing_source_reference");
  return refs.map((entry) => {
    if (typeof entry === "string" || entry?.kind === "file" || (!entry?.kind && entry?.path)) {
      const relative = safeRelative(typeof entry === "string" ? entry : entry.path, "source reference");
      const absolute = safeResolve(projectRoot, relative, "source reference");
      if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) throw new SystemGuideError(`Source reference is missing: ${relative}`, "missing_source_reference");
      return { kind: "file", path: relative, hash: hashFile(absolute), verification: "local-hash" };
    }
    if (entry?.kind === "owner-statement") {
      const attributedTo = validateSafeText(entry.attributedTo, "owner statement attribution").trim();
      const date = approvalDate(entry.date);
      const statement = validateSafeText(entry.statement, "owner statement").trim();
      if (!attributedTo || !statement) throw new SystemGuideError("Owner statement sources require attributedTo, date, and statement", "invalid_source_reference");
      return { kind: "owner-statement", attributedTo, date, statement, verification: "caller-attributed" };
    }
    if (entry?.kind === "external") {
      let url;
      try { url = new URL(String(entry.url)); } catch { throw new SystemGuideError("External source reference requires a valid URL", "invalid_source_reference"); }
      if (!new Set(["https:", "http:"]).has(url.protocol)) throw new SystemGuideError("External source URL must use http or https", "invalid_source_reference");
      if (url.username || url.password || [...url.searchParams.keys()].some((key) => /token|secret|password|api[-_]?key|credential/i.test(key))) {
        throw new SystemGuideError("External source URL may not contain credentials", "secret_detected");
      }
      const titleText = validateSafeText(entry.title, "external source title").trim();
      if (!titleText) throw new SystemGuideError("External source reference requires a title", "invalid_source_reference");
      const result = { kind: "external", url: url.toString(), title: titleText, verification: "not-verified-by-tool" };
      if (entry.capturedAt) result.capturedAt = approvalDate(entry.capturedAt);
      return result;
    }
    throw new SystemGuideError("Source references must be local files, attributed owner statements, or external URLs", "invalid_source_reference");
  });
}

function linkTargets(filePath, text) {
  const targets = [];
  const rawTargets = [];
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) rawTargets.push(match[1]);
  for (const match of text.matchAll(/^\s*\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/gm)) rawTargets.push(match[1] ?? match[2]);
  for (const candidate of rawTargets) {
    const trimmed = candidate.trim();
    const destination = trimmed.startsWith("<") && trimmed.includes(">")
      ? trimmed.slice(1, trimmed.indexOf(">"))
      : trimmed.match(/^\S+/)?.[0] ?? "";
    const raw = destination.split("#")[0];
    if (!raw || /^[a-z]+:/i.test(raw)) continue;
    targets.push(path.resolve(path.dirname(filePath), decodeURIComponent(raw.replace(/\\/g, "/"))));
  }
  return targets;
}

function inboundMeaningLinks(guideRoot, destination) {
  return markdownFiles(guideRoot, new Set(["generated", ".system-guide"]))
    .filter((file) => file !== destination)
    .filter((file) => {
      const text = fs.readFileSync(file, "utf8");
      return !text.startsWith(GENERATED_MARKER) && linkTargets(file, text).includes(destination);
    });
}

function safeGuideMarkdown(projectRoot, guideRoot, relative) {
  const normalized = safeRelative(relative, "link repair path");
  if (!normalized.endsWith(".md") || normalized.split("/").some((part) => part === "generated" || part === ".system-guide")) {
    throw new SystemGuideError("Link repairs must target owner-maintained Markdown inside the guide", "invalid_link_repair");
  }
  const target = path.resolve(guideRoot, ...normalized.split("/"));
  const rel = path.relative(guideRoot, target);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) throw new SystemGuideError("Link repair path escapes the guide", "unsafe_path");
  assertNoSymlink(projectRoot, target, "link repair path");
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) throw new SystemGuideError(`Link repair file is missing: ${normalized}`, "invalid_link_repair");
  return { normalized, target };
}

function normalizeRepairs(projectRoot, guideRoot, repairs, destination) {
  const normalized = [];
  for (const repair of repairs ?? []) {
    const { normalized: relative, target } = safeGuideMarkdown(projectRoot, guideRoot, repair.path);
    if (target === destination) throw new SystemGuideError("A deleted page cannot repair its own links", "invalid_link_repair");
    const before = fs.readFileSync(target, "utf8");
    const find = validateSafeText(repair.find, "link repair match");
    const replace = validateSafeText(repair.replace, "link repair replacement");
    if (!find || !before.includes(find)) throw new SystemGuideError(`Link repair text was not found in ${relative}`, "invalid_link_repair");
    const after = before.split(find).join(replace);
    normalized.push({ path: relative, beforeHash: sha256(before), find, replace, exactText: after });
  }
  return normalized;
}

function previewHash(preview) {
  const copy = { ...preview };
  delete copy.previewHash;
  return sha256(stableJson(copy));
}

export function proposeMeaningChange(root, request = {}) {
  const projectRoot = normalizedRoot(root);
  const config = loadConfig(projectRoot);
  if (!config.enabled) throw new SystemGuideError("System Guide is disabled", "guide_disabled");
  if (!new Set(["create", "update", "delete"]).has(request.action)) throw new SystemGuideError("Meaning action must be create, update, or delete", "invalid_action");
  const guideRoot = safeResolve(projectRoot, config.guidePath, "guidePath");
  const destination = safeMeaningDestination(projectRoot, guideRoot, request.destination);
  const exists = fs.existsSync(destination.target);
  if (request.action === "create" && exists) throw new SystemGuideError("Meaning destination already exists", "destination_exists");
  if (request.action !== "create" && !exists) throw new SystemGuideError("Meaning destination does not exist", "missing_destination");
  const targetId = validateSafeText(request.targetId, "targetId").trim();
  if (!targetId || /[\r\n]/.test(targetId)) throw new SystemGuideError("Meaning targetId is required and must fit on one line", "invalid_target");
  const content = request.action === "delete" ? null : validateSafeText(request.content, "meaning content");
  if (request.action !== "delete" && !content.trim()) throw new SystemGuideError("Meaning content is required", "missing_content");
  const sourceRefs = normalizedSourceRefs(projectRoot, request.sourceRefs);
  const repairs = request.action === "delete" ? normalizeRepairs(projectRoot, guideRoot, request.linkRepairs, destination.target) : [];
  const inbound = request.action === "delete" ? inboundMeaningLinks(guideRoot, destination.target) : [];
  const repairedPaths = new Set(repairs.map((repair) => path.resolve(guideRoot, ...repair.path.split("/"))));
  const unresolvedInbound = inbound.filter((file) => !repairedPaths.has(file)).map((file) => toPosix(path.relative(guideRoot, file)));
  const createdAt = isoTimestamp(request.now);
  const currentHash = exists ? hashFile(destination.target) : null;
  const seed = stableJson({ action: request.action, destination: destination.normalized, targetId, content, sourceRefs, currentHash, repairs, createdAt });
  const previewId = `meaning-${sha256(seed).slice(0, 16)}`;
  const preview = {
    version: FORMAT_VERSION, previewId, createdAt, action: request.action,
    destination: destination.normalized, targetId, exactText: content,
    beforeText: exists ? fs.readFileSync(destination.target, "utf8") : null,
    sourceRefs, uncertainty: validateSafeText(request.uncertainty ?? "None stated", "uncertainty"),
    reason: validateSafeText(request.reason ?? "", "reason"), currentHash,
    linkRepairs: repairs, unresolvedInbound, applyReady: unresolvedInbound.length === 0,
  };
  preview.previewHash = previewHash(preview);
  const previewPath = path.join(guideRoot, ".system-guide", "previews", `${previewId}.json`);
  atomicWrite(previewPath, stableJson(preview));
  return { ...preview, previewPath: toPosix(path.relative(projectRoot, previewPath)) };
}

function approvalDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00Z`).valueOf())) {
    throw new SystemGuideError("Approval record approvedAt must be an ISO date", "invalid_approval");
  }
  return value;
}

function renderMeaning(preview, approval) {
  const sourceRefs = preview.sourceRefs.map(({ hash, verification, ...entry }) => entry);
  const sourceHashes = Object.fromEntries(preview.sourceRefs.filter((entry) => entry.kind === "file").map((entry) => [entry.path, entry.hash]));
  const frontmatter = [
    "---",
    `system_guide_target: ${JSON.stringify(preview.targetId)}`,
    `source_refs: ${JSON.stringify(sourceRefs)}`,
    `source_hashes: ${JSON.stringify(sourceHashes)}`,
    `uncertainty: ${JSON.stringify(preview.uncertainty)}`,
    `approved_by: ${JSON.stringify(approval.approvedBy)}`,
    `approval_date: ${JSON.stringify(approvalDate(approval.approvedAt))}`,
    "---",
    "",
  ].join("\n");
  return `${frontmatter}${preview.exactText.trimEnd()}\n`;
}

export function applyMeaningChange(root, options = {}) {
  const projectRoot = normalizedRoot(root);
  const config = loadConfig(projectRoot);
  if (!config.enabled) throw new SystemGuideError("System Guide is disabled", "guide_disabled");
  const guideRoot = safeResolve(projectRoot, config.guidePath, "guidePath");
  const previewId = String(options.previewId ?? "");
  if (!/^meaning-[a-f0-9]{16}$/.test(previewId)) throw new SystemGuideError("A valid previewId is required", "invalid_preview");
  const previewPath = safeResolve(projectRoot, `${config.guidePath}/.system-guide/previews/${previewId}.json`, "preview path");
  const preview = readJson(previewPath, "meaning preview");
  if (preview.previewId !== previewId || preview.previewHash !== previewHash(preview)) throw new SystemGuideError("Meaning preview was changed after it was created", "stale_preview");
  if (!preview.applyReady) throw new SystemGuideError(`Meaning deletion has unresolved inbound references: ${preview.unresolvedInbound.join(", ")}`, "unresolved_references");
  const approvalRelative = safeRelative(options.approvalRecordPath, "approval record path");
  const approvalPath = safeResolve(projectRoot, approvalRelative, "approval record path");
  const approval = readJson(approvalPath, "approval record");
  if (approval.version !== FORMAT_VERSION || approval.decision !== "approved" || approval.previewId !== previewId || approval.previewHash !== preview.previewHash || typeof approval.approvedBy !== "string" || !approval.approvedBy.trim()) {
    throw new SystemGuideError("Approval record does not explicitly approve this exact preview", "invalid_approval");
  }
  approvalDate(approval.approvedAt);
  const destination = safeMeaningDestination(projectRoot, guideRoot, preview.destination);
  const currentHash = fs.existsSync(destination.target) ? hashFile(destination.target) : null;
  if (currentHash !== preview.currentHash) throw new SystemGuideError("Meaning destination changed after preview", "stale_preview");
  for (const source of preview.sourceRefs) {
    if (source.kind !== "file") continue;
    const absolute = safeResolve(projectRoot, source.path, "source reference");
    if (!fs.existsSync(absolute) || hashFile(absolute) !== source.hash) throw new SystemGuideError(`Meaning source changed after preview: ${source.path}`, "stale_preview");
  }
  const writes = [];
  const deletes = [];
  const overrides = new Map();
  for (const repair of preview.linkRepairs ?? []) {
    const repaired = safeGuideMarkdown(projectRoot, guideRoot, repair.path);
    if (!fs.existsSync(repaired.target) || hashFile(repaired.target) !== repair.beforeHash) throw new SystemGuideError(`Link repair source changed after preview: ${repair.path}`, "stale_preview");
    if (linkTargets(repaired.target, repair.exactText).includes(destination.target)) {
      throw new SystemGuideError(`Link repair still points to the deleted page: ${repair.path}`, "unresolved_references");
    }
    writes.push({ path: repaired.target, content: repair.exactText });
    overrides.set(repaired.target, repair.exactText);
  }
  if (preview.action === "delete") {
    const repairPaths = new Set((preview.linkRepairs ?? []).map((repair) => path.resolve(guideRoot, ...repair.path.split("/"))));
    const unresolvedNow = inboundMeaningLinks(guideRoot, destination.target).filter((file) => !repairPaths.has(file));
    if (unresolvedNow.length) {
      throw new SystemGuideError(`Meaning deletion has new or unresolved inbound references: ${unresolvedNow.map((file) => toPosix(path.relative(guideRoot, file))).join(", ")}`, "unresolved_references");
    }
    deletes.push(destination.target);
    overrides.set(destination.target, null);
  } else {
    const rendered = renderMeaning(preview, approval);
    writes.push({ path: destination.target, content: rendered });
    overrides.set(destination.target, rendered);
  }
  const navigation = navigationOutputs(projectRoot, config, readBuildRecord(projectRoot, config), overrides);
  for (const [filePath, content] of navigation.outputs) {
    ownedGenerated(filePath, content);
    writes.push({ path: filePath, content });
  }
  const transaction = writeTransaction(writes, deletes);
  return {
    outcome: preview.action === "delete" ? "deleted" : preview.action === "create" ? "created" : "updated",
    destination: preview.destination, targetId: preview.targetId,
    approvedBy: approval.approvedBy.trim(), approvalDate: approval.approvedAt,
    repaired: (preview.linkRepairs ?? []).map((repair) => repair.path),
    changed: transaction.changed.map((file) => toPosix(path.relative(projectRoot, file))),
  };
}

function parseArgs(argv) {
  const positionals = [];
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) { positionals.push(token); continue; }
    const key = token.slice(2);
    const next = argv[index + 1];
    const value = next !== undefined && !next.startsWith("--") ? argv[++index] : true;
    if (Object.hasOwn(flags, key)) flags[key] = Array.isArray(flags[key]) ? [...flags[key], value] : [flags[key], value];
    else flags[key] = value;
  }
  return { positionals, flags };
}

function flag(flags, name, required = false) {
  const value = flags[name];
  if (required && (value === undefined || value === true)) throw new SystemGuideError(`Missing --${name}`, "usage");
  return value;
}

function listFlag(flags, name) {
  if (!Object.hasOwn(flags, name)) return [];
  return Array.isArray(flags[name]) ? flags[name] : [flags[name]];
}

function parseSource(value) {
  const match = String(value).match(/^(code|salesforce):(complete|partial):(.+)$/);
  if (!match) throw new SystemGuideError("--source must be kind:completeness:relative/path", "usage");
  return { kind: match[1], completeness: match[2], path: match[3] };
}

function assertFlags(flags, allowed) {
  const unknown = Object.keys(flags).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new SystemGuideError(`Unknown option: --${unknown[0]}`, "usage");
}

function print(result, json) {
  if (json) process.stdout.write(stableJson(result));
  else if (result.text) process.stdout.write(`${result.text}\n`);
  else process.stdout.write(stableJson(result));
}

export function runCli(argv = process.argv.slice(2)) {
  const { positionals, flags } = parseArgs(argv);
  const command = positionals[0];
  if (!command || positionals.length !== 1) throw new SystemGuideError("Usage: system-guide <status|setup|refresh|check|propose|apply|disable> --root <project>", "usage");
  const root = String(flag(flags, "root", true));
  const json = flag(flags, "json") === true;
  let result;
  if (command === "status") {
    assertFlags(flags, ["root", "json"]);
    result = inspectGuide(root);
  } else if (command === "setup") {
    assertFlags(flags, ["root", "json", "guide-path", "source", "adopt"]);
    const sourceFlags = listFlag(flags, "source");
    result = setupGuide(root, { guidePath: flag(flags, "guide-path") || undefined, sources: sourceFlags.length ? sourceFlags.map(parseSource) : undefined, adopt: flag(flags, "adopt") === true });
  } else if (command === "refresh") {
    assertFlags(flags, ["root", "json", "full"]);
    result = refreshGuide(root, { full: flag(flags, "full") === true });
  } else if (command === "check") {
    assertFlags(flags, ["root", "json"]);
    result = checkGuide(root);
  } else if (command === "propose") {
    assertFlags(flags, ["root", "json", "request"]);
    const requestPath = safeResolve(normalizedRoot(root), String(flag(flags, "request", true)), "request path");
    result = proposeMeaningChange(root, readJson(requestPath, "meaning request"));
  } else if (command === "apply") {
    assertFlags(flags, ["root", "json", "preview", "approval"]);
    result = applyMeaningChange(root, { previewId: String(flag(flags, "preview", true)), approvalRecordPath: String(flag(flags, "approval", true)) });
  } else if (command === "disable") {
    assertFlags(flags, ["root", "json"]);
    result = disableGuide(root);
  } else {
    throw new SystemGuideError(`Unknown command: ${command}`, "usage");
  }
  print(result, json);
  if (command === "check" && !result.ok) return 1;
  return 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    process.exitCode = runCli();
  } catch (error) {
    const payload = { error: error?.code ?? "system_guide_error", message: error?.message ?? String(error), details: error?.details };
    process.stderr.write(stableJson(payload));
    process.exitCode = error?.code === "usage" ? 2 : 1;
  }
}

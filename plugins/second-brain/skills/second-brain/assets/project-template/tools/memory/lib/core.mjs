import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, rmdir, stat, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import {
  ALLOWED_RECORD_FIELDS,
  AUTHORITY_KEYS,
  BUDGET_KEYS,
  CANONICAL_PATH_KEYS,
  CONFIG_KEYS,
  FRESHNESS_VALUES,
  INDEX_KEYS,
  RECORD_TYPES,
  REQUIRED_RECORD_FIELDS,
  VERIFICATION_VALUES,
} from "./schemas.mjs";
import { parseFrontmatter, parseStrictYaml } from "./yaml.mjs";

const MARKER = ".second-brain-project.json";
const CONFIG = "memory/config.yaml";
const TYPED_FOLDERS = ["context", "decisions", "knowledge", "references", "domain", "operations"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const REQUIRED_TRACKED_FILES = [
  ".gitignore",
  MARKER,
  "AGENTS.md",
  "CLAUDE.md",
  "PROJECT.md",
  CONFIG,
  "specs/README.md",
  "memory/README.md",
  "memory/context/current.md",
  "memory/.cache/.gitignore",
  ...TYPED_FOLDERS.filter((folder) => folder !== "context").map((folder) => `memory/${folder}/.gitkeep`),
  "tools/memory/validate.mjs",
  "tools/memory/search.mjs",
  "tools/memory/baseline.mjs",
  "tools/memory/write.mjs",
  "tools/memory/lib/core.mjs",
  "tools/memory/lib/schemas.mjs",
  "tools/memory/lib/yaml.mjs",
  ...[
    "config",
    "context",
    "decision",
    "domain",
    "knowledge",
    "operation",
    "project-identity",
    "record-common",
    "reference",
    "requirement",
    "transaction",
    "write-baseline",
    "write-receipt",
  ].map((name) => `tools/memory/schemas/${name}.schema.json`),
];
const SECRET_PATTERNS = [
  { name: "private_key", expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "private_key_assignment", expression: /\bprivate[_-]?key\s*[:=]\s*["']?[A-Za-z0-9_+./=-]{16,}/i },
  { name: "aws_access_key", expression: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { name: "github_token", expression: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { name: "github_fine_grained_token", expression: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { name: "provider_secret_key", expression: /\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{20,}|(?:sk|rk)_live_[A-Za-z0-9]{16,})\b/ },
  { name: "slack_token", expression: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { name: "jwt", expression: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/ },
  { name: "credentialed_database_url", expression: /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?):\/\/[^/\s:@]+:[^/\s@]+@/i },
  {
    name: "assigned_secret",
    expression: /\b(?:api[_-]?key|client[_-]?secret|password|secret|token|access[_-]?token|auth[_-]?token)\s*[:=]\s*["']?[A-Za-z0-9_+./=-]{12,}/i,
  },
];

export function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function git(root, args) {
  return spawnSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
}

export function normalizeRelativePath(input) {
  if (
    typeof input !== "string" ||
    input === "" ||
    input.includes("\0") ||
    isAbsolute(input) ||
    /^[A-Za-z]:/.test(input)
  ) {
    throw new Error(`path must be a non-empty repository-relative path: ${String(input)}`);
  }
  if (input.includes("\\")) throw new Error(`path must use POSIX separators: ${input}`);
  if (input.normalize("NFC") !== input) throw new Error(`path must use NFC Unicode normalization: ${input}`);
  const segments = input.split("/");
  if (segments.some((segment) => segment === "" || segment === ".")) {
    throw new Error(`path contains a noncanonical dot or repeated-separator alias: ${input}`);
  }
  if (segments.some((segment) => segment === "..")) throw new Error(`path escapes the repository: ${input}`);
  return segments.join("/");
}

function pathCollisionKey(path) {
  return normalizeRelativePath(path).normalize("NFC").toLocaleLowerCase("en-US");
}

function canonicalPathList(paths, label) {
  const output = [];
  const seen = new Map();
  for (const input of paths) {
    const path = normalizeRelativePath(input);
    const key = pathCollisionKey(path);
    if (seen.has(key)) throw new Error(`${label} path collision: ${seen.get(key)} and ${path}`);
    seen.set(key, path);
    output.push(path);
  }
  return output.sort((left, right) => left.localeCompare(right, "en"));
}

function absolutePath(root, path) {
  const normalized = normalizeRelativePath(path);
  const target = resolve(root, normalized);
  if (target !== root && !target.startsWith(`${root}${sep}`)) throw new Error(`path escapes the repository: ${path}`);
  return target;
}

async function assertSafeRepositoryPath(root, path, options = {}) {
  const normalized = normalizeRelativePath(path);
  let cursor = root;
  let targetInfo = null;
  for (const segment of normalized.split("/")) {
    cursor = join(cursor, segment);
    try {
      targetInfo = await lstat(cursor);
    } catch (error) {
      if (error.code === "ENOENT" && options.allowMissing !== false) return { path: absolutePath(root, normalized), exists: false };
      throw error;
    }
    if (targetInfo.isSymbolicLink()) throw new Error(`symbolic links are not allowed in repository path ${normalized}`);
  }
  const canonicalRoot = await realpath(root);
  const canonicalTarget = await realpath(cursor);
  if (canonicalTarget !== canonicalRoot && !canonicalTarget.startsWith(`${canonicalRoot}${sep}`)) {
    throw new Error(`resolved path escapes the repository: ${normalized}`);
  }
  if (options.requireFile && !targetInfo.isFile()) throw new Error(`${normalized} must be a regular file`);
  if (options.requireDirectory && !targetInfo.isDirectory()) throw new Error(`${normalized} must be a directory`);
  return { path: cursor, exists: true, info: targetInfo };
}

export async function discoverRoot(explicitRoot = null) {
  const start = await realpath(resolve(explicitRoot || process.cwd()));
  const result = git(start, ["rev-parse", "--show-toplevel"]);
  if (result.status !== 0) throw new Error(`Git repository unavailable: ${result.stderr.trim() || start}`);
  const root = await realpath(resolve(result.stdout.trim()));
  if (explicitRoot && start !== root && !start.startsWith(`${root}${sep}`)) {
    throw new Error(`requested root is outside the discovered Git repository: ${start}`);
  }
  return root;
}

async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function readJson(path, label) {
  let value;
  try {
    value = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`${label} is malformed JSON: ${error.message}`);
  }
  if (!value || Array.isArray(value) || typeof value !== "object") throw new Error(`${label} must be a JSON object`);
  return value;
}

function checkExactKeys(value, expected, label, errors) {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    errors.push(`${label} must be a mapping`);
    return;
  }
  for (const key of Object.keys(value)) {
    if (!expected.includes(key)) errors.push(`${label} contains unknown key ${key}`);
  }
  for (const key of expected) {
    if (!Object.hasOwn(value, key)) errors.push(`${label} is missing ${key}`);
  }
}

function validProjectId(value) {
  return typeof value === "string" && /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$/.test(value);
}

function validRepositoryId(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function validateRelativeConfigPath(value, label, errors) {
  try {
    normalizeRelativePath(value);
  } catch (error) {
    errors.push(`${label}: ${error.message}`);
  }
}

export function validateConfig(config) {
  const errors = [];
  checkExactKeys(config, CONFIG_KEYS, "configuration", errors);
  if (config.schema_version !== 1) errors.push("configuration schema_version must be 1");
  if (!validProjectId(config.project_id)) {
    errors.push("configuration project_id must be 3-64 lowercase letters, digits, or hyphens");
  }
  if (!validRepositoryId(config.repository_id)) errors.push("configuration repository_id must be a canonical UUID");
  if (typeof config.profile !== "string" || !["core", "software", "client", "data", "regulated", "platform"].includes(config.profile)) {
    errors.push("configuration profile is invalid");
  }
  if (!Array.isArray(config.modules) || !config.modules.includes("core") || config.modules.some((item) => typeof item !== "string")) {
    errors.push("configuration modules must be an array containing core");
  } else if (new Set(config.modules).size !== config.modules.length) {
    errors.push("configuration modules must not contain duplicates");
  }
  checkExactKeys(config.canonical_paths, CANONICAL_PATH_KEYS, "canonical_paths", errors);
  if (config.canonical_paths && typeof config.canonical_paths === "object") {
    const pathKeys = new Map();
    for (const [key, value] of Object.entries(config.canonical_paths)) {
      validateRelativeConfigPath(value, `canonical_paths.${key}`, errors);
      try {
        const collision = pathCollisionKey(value);
        if (pathKeys.has(collision)) {
          errors.push(`canonical path collision between ${pathKeys.get(collision)} and ${key}`);
        } else {
          pathKeys.set(collision, key);
        }
      } catch {
        // The path-specific diagnostic above is sufficient.
      }
    }
    const fixedPaths = {
      project_router: "PROJECT.md",
      specifications: "specs",
      memory: "memory",
      current_context: "memory/context/current.md",
      decisions: "memory/decisions",
      knowledge: "memory/knowledge",
      references: "memory/references",
      domain: "memory/domain",
      operations: "memory/operations",
    };
    for (const [key, value] of Object.entries(fixedPaths)) {
      if (config.canonical_paths[key] !== value) errors.push(`canonical_paths.${key} must be ${value}`);
    }
  }
  checkExactKeys(config.authorities, AUTHORITY_KEYS, "authorities", errors);
  if (config.authorities && typeof config.authorities === "object") {
    for (const [key, value] of Object.entries(config.authorities)) {
      if (typeof value !== "string" || value === "") errors.push(`authorities.${key} must be a non-empty string`);
    }
  }
  checkExactKeys(config.budgets, BUDGET_KEYS, "budgets", errors);
  if (config.budgets && typeof config.budgets === "object") {
    for (const key of BUDGET_KEYS) {
      if (!Number.isSafeInteger(config.budgets[key]) || config.budgets[key] <= 0) {
        errors.push(`budgets.${key} must be a positive integer`);
      }
    }
    if (config.budgets.current_max_bytes > 3072) errors.push("budgets.current_max_bytes cannot exceed 3072");
    if (config.budgets.current_max_nonempty_lines > 40) {
      errors.push("budgets.current_max_nonempty_lines cannot exceed 40");
    }
    if (config.budgets.search_max_results > 5) errors.push("budgets.search_max_results cannot exceed 5");
    const budgetMaximums = {
      file_max_bytes: 1048576,
      record_max_count: 10000,
      diagnostic_max_count: 1000,
      diagnostic_max_bytes: 4096,
      query_max_bytes: 8192,
      search_response_max_bytes: 1048576,
    };
    for (const [key, maximum] of Object.entries(budgetMaximums)) {
      if (config.budgets[key] > maximum) errors.push(`budgets.${key} cannot exceed ${maximum}`);
    }
    if (config.budgets.project_router_max_bytes > config.budgets.startup_max_bytes) {
      errors.push("project router budget cannot exceed startup budget");
    }
  }
  checkExactKeys(config.index, INDEX_KEYS, "index", errors);
  if (config.index && typeof config.index === "object") {
    if (typeof config.index.enabled !== "boolean") errors.push("index.enabled must be a boolean");
    if (config.index.schema_version !== 1) errors.push("index.schema_version must be 1");
    if (!Array.isArray(config.index.modes) || config.index.modes.length === 0 || config.index.modes.some((mode) => !["exact"].includes(mode))) {
      errors.push("index.modes may contain exact only in the foundation implementation");
    } else if (new Set(config.index.modes).size !== config.index.modes.length) {
      errors.push("index.modes must not contain duplicates");
    }
  }
  if (!Array.isArray(config.external_authorities) || config.external_authorities.some((item) => typeof item !== "string" || item === "")) {
    errors.push("external_authorities must be an array of stable pointer strings");
  } else if (new Set(config.external_authorities).size !== config.external_authorities.length) {
    errors.push("external_authorities must not contain duplicates");
  }
  return errors;
}

async function readProjectInputs(root, overlay = new Map()) {
  const read = async (path) => {
    if (overlay.has(path)) {
      const value = overlay.get(path);
      if (value === null) throw Object.assign(new Error(`missing ${path}`), { code: "ENOENT" });
      return value;
    }
    await assertSafeRepositoryPath(root, path, { allowMissing: false, requireFile: true });
    return readFile(absolutePath(root, path), "utf8");
  };
  const marker = JSON.parse(await read(MARKER));
  const config = parseStrictYaml(await read(CONFIG), CONFIG);
  return { marker, config, read };
}

async function listFilesRecursively(root, relativeRoot, maximum = 10020) {
  const output = [];
  const base = absolutePath(root, relativeRoot);
  if (!(await pathExists(base))) return output;
  await assertSafeRepositoryPath(root, relativeRoot, { allowMissing: false, requireDirectory: true });
  const walk = async (directory, relativeDirectory) => {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const relativePath = `${relativeDirectory}/${entry.name}`.replace(/^\/+/, "");
      normalizeRelativePath(relativePath);
      if (entry.isSymbolicLink()) throw new Error(`symbolic links are not allowed in knowledge roots: ${relativePath}`);
      if (entry.isDirectory()) await walk(join(directory, entry.name), relativePath);
      else if (entry.isFile()) {
        output.push(relativePath);
        if (output.length > maximum) throw new Error(`file inventory exceeds configured maximum ${maximum}`);
      }
    }
  };
  await walk(base, relativeRoot);
  return output;
}

async function knowledgeFiles(root, config, overlay = new Map()) {
  const configured = [
    config.canonical_paths.specifications,
    ...TYPED_FOLDERS.map((folder) => typedRoot(config, folder)),
  ];
  const found = new Map();
  for (const configuredRoot of configured) {
    for (const path of await listFilesRecursively(root, configuredRoot, config.budgets.record_max_count + 20)) {
      if (path.endsWith(".md") && !path.endsWith("/README.md")) {
        const key = pathCollisionKey(path);
        if (found.has(key) && found.get(key) !== path) throw new Error(`repository path collision: ${found.get(key)} and ${path}`);
        found.set(key, path);
      }
    }
  }
  for (const [path, content] of overlay) {
    if (configured.some((base) => path === base || path.startsWith(`${base}/`))) {
      if (path.endsWith(".md") && !path.endsWith("/README.md")) {
        const key = pathCollisionKey(path);
        if (content === null) found.delete(key);
        else {
          if (found.has(key) && found.get(key) !== path) throw new Error(`overlay path collision: ${found.get(key)} and ${path}`);
          found.set(key, path);
        }
      }
    }
  }
  if (found.size > config.budgets.record_max_count) {
    throw new Error(`record count ${found.size} exceeds configured maximum ${config.budgets.record_max_count}`);
  }
  return [...found.values()].sort((left, right) => left.localeCompare(right, "en"));
}

function typedRoot(config, folder) {
  return config.canonical_paths[folder] || `${config.canonical_paths.memory}/${folder}`;
}

function expectedRecordType(path, config) {
  if (path.startsWith(`${config.canonical_paths.specifications}/`)) return "requirement";
  for (const type of Object.keys(RECORD_TYPES)) {
    if (type === "requirement") continue;
    const root = typedRoot(config, RECORD_TYPES[type].root);
    if (path.startsWith(`${root}/`) || path === root) return type;
  }
  return null;
}

function isIsoTimestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    return false;
  }
  const milliseconds = value.includes(".") ? value : value.replace("Z", ".000Z");
  const parsed = new Date(milliseconds);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === milliseconds;
}

function isStringArray(value) {
  return Array.isArray(value) && value.length <= 100 && value.every((item) => typeof item === "string" && item !== "");
}

function validateRecordMetadata(metadata, path, expectedType) {
  const errors = [];
  for (const key of REQUIRED_RECORD_FIELDS) {
    if (!Object.hasOwn(metadata, key)) errors.push(`${path}: missing frontmatter field ${key}`);
  }
  for (const key of Object.keys(metadata)) {
    if (!ALLOWED_RECORD_FIELDS.includes(key)) errors.push(`${path}: unknown frontmatter field ${key}`);
  }
  if (metadata.record_type !== expectedType) {
    errors.push(`${path}: record_type must be ${expectedType}`);
    return errors;
  }
  const schema = RECORD_TYPES[metadata.record_type];
  if (typeof metadata.id !== "string" || !/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/.test(metadata.id)) {
    errors.push(`${path}: id must be a stable uppercase hyphenated identifier`);
  }
  if (typeof metadata.title !== "string" || metadata.title.trim() === "") errors.push(`${path}: title must be non-empty`);
  if (!schema.lifecycles.includes(metadata.lifecycle)) {
    errors.push(`${path}: lifecycle ${String(metadata.lifecycle)} is invalid for ${metadata.record_type}`);
  }
  if (!FRESHNESS_VALUES.includes(metadata.freshness)) {
    errors.push(`${path}: freshness ${String(metadata.freshness)} is invalid`);
  }
  if (!isIsoTimestamp(metadata.created) || !isIsoTimestamp(metadata.updated)) {
    errors.push(`${path}: created and updated must be ISO 8601 UTC timestamps`);
  } else if (Date.parse(metadata.updated) < Date.parse(metadata.created)) {
    errors.push(`${path}: updated timestamp precedes created timestamp`);
  }
  if (typeof metadata.provenance !== "string" || metadata.provenance.trim() === "") {
    errors.push(`${path}: provenance must be non-empty`);
  }
  for (const field of ["source_paths", "predecessors", "successors", "related"]) {
    if (!isStringArray(metadata[field])) errors.push(`${path}: ${field} must be an array of strings`);
    else if (new Set(metadata[field]).size !== metadata[field].length) errors.push(`${path}: ${field} must not contain duplicates`);
  }
  for (const field of ["work_items", "external_pointers", "subsystems"]) {
    if (Object.hasOwn(metadata, field) && !isStringArray(metadata[field])) {
      errors.push(`${path}: ${field} must be an array of strings`);
    } else if (Object.hasOwn(metadata, field) && new Set(metadata[field]).size !== metadata[field].length) {
      errors.push(`${path}: ${field} must not contain duplicates`);
    }
  }
  if (!VERIFICATION_VALUES.includes(metadata.verification)) {
    errors.push(`${path}: verification ${String(metadata.verification)} is invalid`);
  }
  const isCurrent = schema.current.includes(metadata.lifecycle);
  if (isCurrent && metadata.freshness !== "current") {
    errors.push(`${path}: current lifecycle records require freshness current`);
  }
  if (isCurrent && ["unverified", "stale"].includes(metadata.verification)) {
    errors.push(`${path}: current lifecycle records cannot use ${metadata.verification} verification`);
  }
  if (
    isCurrent &&
    ["requirement", "decision"].includes(metadata.record_type) &&
    !["owner_reviewed", "repository_evidence", "verified"].includes(metadata.verification)
  ) {
    errors.push(`${path}: active requirements and accepted decisions require trusted verification`);
  }
  if (
    isCurrent &&
    typeof metadata.provenance === "string" &&
    /\b(?:agent[- ]?(?:guess|inference)|model[- ]?(?:guess|inference)|unverified inference|speculative inference)\b/i.test(metadata.provenance)
  ) {
    errors.push(`${path}: agent inference or guesses cannot be current authority`);
  }
  for (const sourcePath of metadata.source_paths || []) {
    try {
      normalizeRelativePath(sourcePath);
    } catch (error) {
      errors.push(`${path}: source_paths entry ${sourcePath}: ${error.message}`);
    }
  }
  for (const field of ["predecessors", "successors", "related"]) {
    if ((metadata[field] || []).includes(metadata.id)) errors.push(`${path}: ${field} cannot link a record to itself`);
  }
  if ((metadata.source_commit && !/^[0-9a-f]{40,64}$/.test(metadata.source_commit)) ||
      (metadata.source_hash && !/^[0-9a-f]{64}$/.test(metadata.source_hash))) {
    errors.push(`${path}: source_commit or source_hash is malformed`);
  }
  return errors;
}

function validateBody(record) {
  const errors = [];
  if (record.body.trim() === "") errors.push(`${record.path}: record body must be non-empty`);
  for (const heading of RECORD_TYPES[record.metadata.record_type]?.requiredHeadings || []) {
    const expression = new RegExp(`^#{1,6}\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "im");
    if (!expression.test(record.body)) errors.push(`${record.path}: missing required heading ${heading}`);
  }
  return errors;
}

function currentLifecycle(record) {
  return RECORD_TYPES[record.metadata.record_type]?.current.includes(record.metadata.lifecycle);
}

function validateRelations(records) {
  const errors = [];
  const byId = new Map(records.map((record) => [record.metadata.id, record]));
  for (const record of records) {
    const metadata = record.metadata;
    for (const id of (metadata.predecessors || []).slice(0, 100)) {
      const target = byId.get(id);
      if (!target) errors.push(`${record.path}: predecessor ${id} does not exist`);
      else if (!(target.metadata.successors || []).includes(metadata.id)) {
        errors.push(`${record.path}: predecessor ${id} does not link back through successors`);
      }
    }
    for (const id of (metadata.successors || []).slice(0, 100)) {
      const target = byId.get(id);
      if (!target) errors.push(`${record.path}: successor ${id} does not exist`);
      else {
        if (!(target.metadata.predecessors || []).includes(metadata.id)) {
          errors.push(`${record.path}: successor ${id} does not link back through predecessors`);
        }
        if (target.metadata.record_type !== metadata.record_type) {
          errors.push(`${record.path}: successor ${id} has a different record_type`);
        }
        if (currentLifecycle(record) && currentLifecycle(target)) {
          errors.push(`${record.path}: predecessor and successor ${id} cannot both be current`);
        }
      }
    }
    for (const id of (metadata.related || []).slice(0, 100)) {
      if (!byId.has(id)) errors.push(`${record.path}: related record ${id} does not exist`);
    }
  }
  const visiting = new Set();
  const visited = new Set();
  const visit = (id, trail) => {
    if (visiting.has(id)) {
      errors.push(`lifecycle cycle detected: ${[...trail, id].join(" -> ")}`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const record = byId.get(id);
    for (const successor of (record?.metadata.successors || []).slice(0, 100)) {
      if (byId.has(successor)) visit(successor, [...trail, id]);
    }
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of byId.keys()) visit(id, []);

  for (const record of records) {
    const activeSuccessors = (record.metadata.successors || []).slice(0, 100)
      .map((id) => byId.get(id))
      .filter(Boolean)
      .filter(currentLifecycle);
    if (activeSuccessors.length > 1) {
      errors.push(`${record.path}: competing current successors ${activeSuccessors.map((item) => item.metadata.id).join(", ")}`);
    }
    if (record.metadata.lifecycle === "superseded" && activeSuccessors.length !== 1) {
      errors.push(`${record.path}: superseded records require exactly one current successor; use retired for approved retirement`);
    }
  }
  return errors;
}

function secretFindings(path, content, maximum) {
  const findings = [];
  let total = 0;
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.expression.test(lines[index])) {
        total += 1;
        if (findings.length < maximum) findings.push(`${path}:${index + 1}: secret-like ${pattern.name} content`);
      }
      pattern.expression.lastIndex = 0;
    }
  }
  return { findings, total };
}

async function loadRecords(root, config, read, overlay) {
  const errors = [];
  const records = [];
  const ids = new Map();
  let paths;
  try {
    paths = await knowledgeFiles(root, config, overlay);
  } catch (error) {
    return { records, errors: [error.message] };
  }
  for (const path of paths) {
    let content;
    try {
      content = await read(path);
    } catch (error) {
      errors.push(`${path}: cannot read record: ${error.message}`);
      continue;
    }
    if (Buffer.byteLength(content) > config.budgets.file_max_bytes) {
      errors.push(`${path}: file exceeds configured maximum ${config.budgets.file_max_bytes} bytes`);
      continue;
    }
    let parsed;
    try {
      parsed = parseFrontmatter(content, path);
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    const expected = expectedRecordType(path, config);
    errors.push(...validateRecordMetadata(parsed.metadata, path, expected));
    for (const sourcePath of Array.isArray(parsed.metadata.source_paths) ? parsed.metadata.source_paths : []) {
      try {
        const canonicalSource = normalizeRelativePath(sourcePath);
        if (overlay.has(canonicalSource)) {
          if (overlay.get(canonicalSource) === null) throw new Error("overlay source is deleted");
        } else {
          await assertSafeRepositoryPath(root, canonicalSource, { allowMissing: false, requireFile: true });
        }
      } catch (error) {
        errors.push(`${path}: source path ${sourcePath} must be an existing regular non-symlink file: ${error.message}`);
      }
    }
    const record = { path, content, metadata: parsed.metadata, body: parsed.body };
    errors.push(...validateBody(record));
    if (typeof parsed.metadata.id === "string") {
      if (ids.has(parsed.metadata.id)) {
        errors.push(`duplicate id ${parsed.metadata.id}: ${ids.get(parsed.metadata.id)} and ${path}`);
      } else ids.set(parsed.metadata.id, path);
    }
    records.push(record);
  }
  errors.push(...validateRelations(records));
  return { records, errors };
}

function component(name, status, detail, action) {
  return { name, status, detail, action };
}

function statusRank(status) {
  return { ok: 0, not_enabled: 0, stale: 1, failed: 2 }[status] ?? 2;
}

async function readOverlayOrFile(root, path, overlay) {
  if (overlay.has(path)) {
    const value = overlay.get(path);
    if (value === null) throw Object.assign(new Error(`missing ${path}`), { code: "ENOENT" });
    return value;
  }
  await assertSafeRepositoryPath(root, path, { allowMissing: false, requireFile: true });
  return readFile(absolutePath(root, path), "utf8");
}

export async function validateProject(root, options = {}) {
  const overlay = options.overlay || new Map();
  const components = [];
  const allErrors = [];
  let records = [];
  let marker = null;
  let config = null;
  let rootReady = false;
  try {
    root = await realpath(resolve(root));
    const gitResult = git(root, ["rev-parse", "--show-toplevel"]);
    const gitRoot = gitResult.status === 0 ? await realpath(resolve(gitResult.stdout.trim())) : null;
    if (gitResult.status !== 0 || gitRoot !== root) throw new Error("validation root is not the Git root");
    rootReady = true;
    components.push(component("git", "ok", "Git root is available", "none"));
  } catch (error) {
    components.push(component("git", "failed", error.message, "run from the intended repository root"));
    allErrors.push(error.message);
  }

  let markerError = null;
  let configParseError = null;
  if (rootReady) {
    try {
      const text = await readOverlayOrFile(root, MARKER, overlay);
      if (Buffer.byteLength(text) > 4096) throw new Error(`${MARKER} exceeds 4096 bytes`);
      marker = JSON.parse(text);
      if (!marker || Array.isArray(marker) || typeof marker !== "object") throw new Error("marker must be a JSON object");
    } catch (error) {
      markerError = `${MARKER}: ${error.message}`;
    }
    try {
      const text = await readOverlayOrFile(root, CONFIG, overlay);
      if (Buffer.byteLength(text) > 65536) throw new Error(`${CONFIG} exceeds bootstrap maximum 65536 bytes`);
      config = parseStrictYaml(text, CONFIG);
    } catch (error) {
      configParseError = error.message;
    }
  } else {
    markerError = "project identity is blocked until Git root validation succeeds";
    configParseError = "configuration is blocked until Git root validation succeeds";
  }

  const configErrors = configParseError ? [configParseError] : validateConfig(config);
  if (configErrors.length) {
    components.push(component("configuration_schema", "failed", configErrors.join("; "), "correct memory/config.yaml"));
    allErrors.push(...configErrors);
  } else {
    components.push(component("configuration_schema", "ok", "configuration matches schema version 1", "none"));
  }

  const identityErrors = [];
  if (markerError) identityErrors.push(markerError);
  if (marker) {
    const keys = Object.keys(marker).sort();
    if (JSON.stringify(keys) !== JSON.stringify(["project_id", "repository_id", "schema_version"])) {
      identityErrors.push(`${MARKER} must contain only schema_version, project_id, and repository_id`);
    }
    if (marker.schema_version !== 1) identityErrors.push(`${MARKER} schema_version must be 1`);
    if (!validProjectId(marker.project_id)) identityErrors.push(`${MARKER} project_id is invalid`);
    if (!validRepositoryId(marker.repository_id)) identityErrors.push(`${MARKER} repository_id must be a canonical UUID`);
  }
  if (marker && config && configErrors.length === 0) {
    if (marker.project_id !== config.project_id) {
      identityErrors.push(`project identity mismatch: marker=${marker.project_id}, config=${config.project_id}`);
    }
    if (marker.repository_id !== config.repository_id) {
      identityErrors.push(`repository identity mismatch: marker=${marker.repository_id}, config=${config.repository_id}`);
    }
  } else if (!markerError && configErrors.length > 0) {
    identityErrors.push("identity marker is readable but comparison to configuration is blocked");
  }
  if (rootReady) {
    const configLocations = git(root, [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      "memory/config.yaml",
      ":(glob)**/memory/config.yaml",
    ]);
    if (configLocations.status === 0) {
      const locations = [...new Set(configLocations.stdout.split(/\r?\n/).filter(Boolean))];
      if (locations.length !== 1 || locations[0] !== CONFIG) {
        identityErrors.push(`expected exactly one repository memory configuration at ${CONFIG}; found ${locations.join(", ") || "none"}`);
      }
    }
    if (marker && validRepositoryId(marker.repository_id)) {
      const committedMarker = git(root, ["show", `HEAD:${MARKER}`]);
      if (committedMarker.status === 0) {
        try {
          const committedRepositoryId = JSON.parse(committedMarker.stdout).repository_id;
          if (validRepositoryId(committedRepositoryId) && committedRepositoryId !== marker.repository_id) {
            identityErrors.push("repository_id is immutable and differs from the committed root marker");
          }
        } catch {
          identityErrors.push("committed root marker is malformed and cannot prove immutable repository identity");
        }
      }
    }
  }
  if (identityErrors.length) {
    components.push(component("project_identity", "failed", identityErrors.join("; "), "restore the root marker and matching project and repository identities"));
    allErrors.push(...identityErrors);
  } else {
    components.push(component("project_identity", "ok", `project ${config.project_id} repository ${config.repository_id} matches the root marker`, "none"));
  }

  const structureErrors = [];
  if (!rootReady || configErrors.length) {
    structureErrors.push("required path validation is blocked by Git or configuration failure");
  } else {
    const trackedResult = git(root, ["ls-files", "--cached"]);
    const trackedFiles = new Set(trackedResult.status === 0 ? trackedResult.stdout.split(/\r?\n/).filter(Boolean) : []);
    const requiredDirectories = [
      config.canonical_paths.specifications,
      config.canonical_paths.memory,
      ...TYPED_FOLDERS.map((folder) => typedRoot(config, folder)),
    ];
    for (const path of requiredDirectories) {
      try {
        await assertSafeRepositoryPath(root, path, { allowMissing: false, requireDirectory: true });
      } catch (error) {
        structureErrors.push(`${path}: ${error.message}`);
      }
    }
    for (const path of REQUIRED_TRACKED_FILES) {
      try {
        await assertSafeRepositoryPath(root, path, { allowMissing: false, requireFile: true });
      } catch (error) {
        structureErrors.push(`${path}: ${error.message}`);
        continue;
      }
      if (!trackedFiles.has(path)) {
        structureErrors.push(`${path} must be Git-tracked`);
      }
    }
  }
  if (structureErrors.length) {
    components.push(component("routers_and_folders", "failed", structureErrors.join("; "), "restore and Git-track the complete project template"));
    allErrors.push(...structureErrors);
  } else {
    components.push(component("routers_and_folders", "ok", "all required routers, tools, schemas, ignores, and folder controls are tracked", "none"));
  }

  if (configErrors.length === 0 && rootReady) {
    const loaded = await loadRecords(root, config, (path) => readOverlayOrFile(root, path, overlay), overlay);
    records = loaded.records;
    if (loaded.errors.length) {
      components.push(component("records_and_links", "failed", loaded.errors.join("; "), "correct record authority, schema, sources, identifiers, and lifecycle links"));
      allErrors.push(...loaded.errors);
    } else {
      components.push(component("records_and_links", "ok", `${records.length} structured records are valid`, "none"));
    }
  } else {
    const detail = "record validation is blocked by invalid Git or configuration state";
    components.push(component("records_and_links", "failed", detail, "correct Git root and memory/config.yaml"));
    allErrors.push(detail);
  }

  const budgetErrors = [];
  if (configErrors.length === 0 && rootReady) {
    try {
      const router = await readOverlayOrFile(root, config.canonical_paths.project_router, overlay);
      const current = await readOverlayOrFile(root, config.canonical_paths.current_context, overlay);
      const routerBytes = Buffer.byteLength(router);
      const currentBytes = Buffer.byteLength(current);
      const currentLines = current.split(/\r?\n/).filter((line) => line.trim() !== "").length;
      if (routerBytes > config.budgets.project_router_max_bytes) budgetErrors.push(`project router is ${routerBytes} bytes, maximum ${config.budgets.project_router_max_bytes}`);
      if (currentBytes > config.budgets.current_max_bytes) budgetErrors.push(`current briefing is ${currentBytes} bytes, maximum ${config.budgets.current_max_bytes}`);
      if (currentLines > config.budgets.current_max_nonempty_lines) budgetErrors.push(`current briefing has ${currentLines} non-empty lines, maximum ${config.budgets.current_max_nonempty_lines}`);
      if (routerBytes + currentBytes > config.budgets.startup_max_bytes) budgetErrors.push(`startup context is ${routerBytes + currentBytes} bytes, maximum ${config.budgets.startup_max_bytes}`);
    } catch (error) {
      budgetErrors.push(`cannot measure context budgets: ${error.message}`);
    }
  } else {
    budgetErrors.push("context budget validation is blocked by invalid Git or configuration state");
  }
  if (budgetErrors.length) {
    components.push(component("context_budgets", "failed", budgetErrors.join("; "), "correct configuration or condense PROJECT.md and current context"));
    allErrors.push(...budgetErrors);
  } else {
    components.push(component("context_budgets", "ok", "router and current briefing are within configured budgets", "none"));
  }

  const secretErrors = [];
  let omittedSecretDiagnostics = 0;
  if (configErrors.length === 0 && rootReady) {
    const scanPaths = new Set([MARKER, CONFIG, "AGENTS.md", "CLAUDE.md", "PROJECT.md", "specs/README.md", "memory/README.md"]);
    for (const record of records) scanPaths.add(record.path);
    try {
      for (const rootPath of [config.canonical_paths.specifications, ...TYPED_FOLDERS.map((folder) => typedRoot(config, folder))]) {
        for (const path of await listFilesRecursively(root, rootPath, config.budgets.record_max_count + 20)) {
          scanPaths.add(path);
          if (scanPaths.size > config.budgets.record_max_count + 50) {
            throw new Error("secret scan file inventory exceeds configured bound");
          }
        }
      }
      for (const path of [...scanPaths].sort()) {
        const content = await readOverlayOrFile(root, path, overlay);
        if (Buffer.byteLength(content) > config.budgets.file_max_bytes) {
          secretErrors.push(`${path}: file exceeds configured maximum ${config.budgets.file_max_bytes} bytes`);
          continue;
        }
        const remaining = Math.max(0, config.budgets.diagnostic_max_count - secretErrors.length);
        const secretResult = secretFindings(path, content, remaining);
        secretErrors.push(...secretResult.findings);
        omittedSecretDiagnostics += secretResult.total - secretResult.findings.length;
      }
    } catch (error) {
      secretErrors.push(`secret scan blocked: ${error.message}`);
    }
  } else {
    secretErrors.push("secret scan is blocked by invalid Git or configuration state");
  }
  if (secretErrors.length) {
    components.push(component("secret_scan", "failed", secretErrors.join("; "), "remove credentials, rotate exposed secrets, and correct blocked paths"));
    allErrors.push(...secretErrors);
  } else {
    components.push(component("secret_scan", "ok", "limited secret guard found no recognized pattern; this is not complete detection", "none"));
  }

  if (configErrors.length || !rootReady) {
    const detail = "optional index state is blocked by invalid Git or configuration state";
    components.push(component("optional_index", "failed", detail, "correct Git root and memory/config.yaml"));
    allErrors.push(detail);
  } else if (config.index.enabled === false) {
    components.push(component("optional_index", "not_enabled", "index-free deterministic search is configured", "none"));
  } else {
    components.push(component("optional_index", "stale", "index support is not available until Unit 05; any receipt is untrusted", "keep using Git search or disable indexing"));
  }

  if (configErrors.length || !rootReady) {
    const detail = "external authority configuration is blocked by invalid Git or configuration state";
    components.push(component("external_authorities", "failed", detail, "correct Git root and memory/config.yaml"));
    allErrors.push(detail);
  } else if (config.external_authorities.length === 0) {
    components.push(component("external_authorities", "not_enabled", "no external authority exceptions are configured", "none"));
  } else {
    components.push(component("external_authorities", "ok", `${config.external_authorities.length} stable pointers are configured; availability was not contacted`, "verify availability only when the task requires it"));
  }

  const limits = configErrors.length === 0
    ? config.budgets
    : { diagnostic_max_count: 100, diagnostic_max_bytes: 512 };
  const clip = (value) => {
    const text = String(value);
    if (Buffer.byteLength(text) <= limits.diagnostic_max_bytes) return text;
    let output = "";
    for (const character of text) {
      if (Buffer.byteLength(`${output}${character}…`) > limits.diagnostic_max_bytes) break;
      output += character;
    }
    return `${output}…`;
  };
  for (const item of components) item.detail = clip(item.detail);
  const componentOrder = new Map([
    "git",
    "project_identity",
    "configuration_schema",
    "routers_and_folders",
    "records_and_links",
    "context_budgets",
    "secret_scan",
    "optional_index",
    "external_authorities",
  ].map((name, index) => [name, index]));
  components.sort((left, right) => componentOrder.get(left.name) - componentOrder.get(right.name));
  const uniqueErrors = [...new Set(allErrors.map(clip))].sort();
  const reportedErrors = uniqueErrors.slice(0, limits.diagnostic_max_count);
  const worst = components.reduce((rank, item) => Math.max(rank, statusRank(item.status)), 0);
  return {
    schema_version: 1,
    project_id: marker?.project_id ?? config?.project_id,
    repository_id: marker?.repository_id ?? config?.repository_id,
    usable: worst < 2,
    stale: worst === 1,
    components,
    errors: reportedErrors,
    diagnostic_count: uniqueErrors.length + omittedSecretDiagnostics,
    diagnostics_truncated: Math.max(0, uniqueErrors.length - reportedErrors.length) + omittedSecretDiagnostics,
    records,
    config,
  };
}

function headingForLine(lines, target) {
  for (let index = target; index >= 0; index -= 1) {
    if (/^#{1,6}\s+/.test(lines[index])) return lines[index].replace(/^#{1,6}\s+/, "").trim();
  }
  return null;
}

export async function searchProject(root, query, requestedLimit = null) {
  if (typeof query !== "string" || query.trim() === "") throw new Error("search query must be non-empty");
  const validation = await validateProject(root);
  if (!validation.usable) throw new Error(`project validation failed before retrieval: ${validation.errors.join("; ")}`);
  if (Buffer.byteLength(query) > validation.config.budgets.query_max_bytes) {
    throw new Error(`search query exceeds configured maximum ${validation.config.budgets.query_max_bytes} bytes`);
  }
  const limit = requestedLimit ?? validation.config.budgets.search_max_results;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > validation.config.budgets.search_max_results) {
    throw new Error(`search limit must be between 1 and ${validation.config.budgets.search_max_results}`);
  }
  const needle = query.toLocaleLowerCase("en");
  const ranked = [];
  for (const record of validation.records) {
    const lines = record.content.replace(/\r\n/g, "\n").split("\n");
    const anchors = [];
    for (let index = 0; index < lines.length; index += 1) {
      if (lines[index].toLocaleLowerCase("en").includes(needle)) {
        anchors.push({ line: index + 1, heading: headingForLine(lines, index) });
        if (anchors.length === 3) break;
      }
    }
    const idMatch = record.metadata.id.toLocaleLowerCase("en") === needle;
    const titleMatch = record.metadata.title.toLocaleLowerCase("en").includes(needle);
    const pathMatch = record.path.toLocaleLowerCase("en").includes(needle);
    if (!idMatch && !titleMatch && !pathMatch && anchors.length === 0) continue;
    ranked.push({
      rank: idMatch ? 0 : titleMatch ? 1 : pathMatch ? 2 : 3,
      current: currentLifecycle(record) ? 0 : 1,
      authority: record.metadata.record_type === "requirement" ? 0 : record.metadata.record_type === "decision" ? 1 : 2,
      path: record.path,
      id: record.metadata.id,
      record_type: record.metadata.record_type,
      lifecycle: record.metadata.lifecycle,
      freshness: record.metadata.freshness,
      title: record.metadata.title,
      provenance: record.metadata.provenance,
      source_paths: record.metadata.source_paths,
      source_hash: sha256(record.content),
      anchors,
    });
  }
  ranked.sort(
    (left, right) =>
      left.rank - right.rank ||
      left.current - right.current ||
      left.authority - right.authority ||
      left.path.localeCompare(right.path, "en") ||
      left.id.localeCompare(right.id, "en"),
  );
  const results = [];
  const responseBudget = Math.min(
    validation.config.budgets.task_retrieval_max_bytes,
    validation.config.budgets.search_response_max_bytes,
  );
  const makeResponse = (items) => ({
    schema_version: 1,
    project_id: validation.project_id,
    repository_id: validation.repository_id,
    query,
    index_state: validation.config.index.enabled ? "stale" : "not_enabled",
    matched_count: ranked.length,
    result_count: items.length,
    truncated_count: ranked.length - items.length,
    max_results: limit,
    budget_bytes: responseBudget,
    response_bytes: 0,
    results: items,
  });
  for (const item of ranked) {
    const pointer = { ...item };
    delete pointer.rank;
    delete pointer.current;
    delete pointer.authority;
    const candidate = makeResponse([...results, pointer]);
    if (Buffer.byteLength(JSON.stringify(candidate)) > responseBudget) break;
    results.push(pointer);
    if (results.length === limit) break;
  }
  if (ranked.length > 0 && results.length === 0) {
    throw new Error("task retrieval budget is too small for one pointer result");
  }
  const response = makeResponse(results);
  let previousBytes = -1;
  while (response.response_bytes !== previousBytes) {
    previousBytes = response.response_bytes;
    response.response_bytes = Buffer.byteLength(JSON.stringify(response));
  }
  if (response.response_bytes > responseBudget) throw new Error("search response envelope exceeds configured budget");
  return response;
}

export async function captureBaseline(root, paths) {
  if (!Array.isArray(paths) || paths.length === 0) throw new Error("at least one explicit in-scope path is required");
  const normalized = canonicalPathList(paths, "baseline");
  const validation = await validateProject(root);
  if (!validation.usable) throw new Error(`cannot capture baseline for an invalid project: ${validation.errors.join("; ")}`);
  const entries = {};
  for (const path of normalized) {
    const target = absolutePath(root, path);
    try {
      await assertSafeRepositoryPath(root, path, { allowMissing: false, requireFile: true });
      const content = await readFile(target);
      entries[path] = { exists: true, sha256: sha256(content), bytes: content.length };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      entries[path] = { exists: false, sha256: null, bytes: 0 };
    }
  }
  const head = git(root, ["rev-parse", "HEAD"]);
  if (head.status !== 0) throw new Error(`cannot capture Git HEAD: ${head.stderr.trim()}`);
  return {
    schema_version: 1,
    project_id: validation.project_id,
    repository_id: validation.repository_id,
    head: head.stdout.trim(),
    paths: entries,
  };
}

async function assertBaseline(root, baseline, transactionPaths) {
  if (!baseline || baseline.schema_version !== 1 || typeof baseline.paths !== "object") {
    throw new Error("transaction baseline is malformed");
  }
  const validation = await validateProject(root);
  if (!validation.usable) throw new Error(`project is invalid before transaction: ${validation.errors.join("; ")}`);
  if (baseline.project_id !== validation.project_id) throw new Error("transaction baseline project_id does not match this repository");
  if (baseline.repository_id !== validation.repository_id) throw new Error("transaction baseline repository_id does not match this repository");
  const head = git(root, ["rev-parse", "HEAD"]);
  if (head.status !== 0 || baseline.head !== head.stdout.trim()) {
    throw new Error("transaction baseline HEAD does not match destination HEAD");
  }
  const baselinePaths = canonicalPathList(Object.keys(baseline.paths), "baseline");
  if (JSON.stringify(baselinePaths) !== JSON.stringify(transactionPaths)) {
    throw new Error("transaction paths must exactly match the explicit baseline scope");
  }
  for (const path of baselinePaths) {
    const expected = baseline.paths[path];
    try {
      await assertSafeRepositoryPath(root, path, { allowMissing: !expected.exists, requireFile: expected.exists });
      const content = await readFile(absolutePath(root, path));
      if (!expected.exists || sha256(content) !== expected.sha256) throw new Error(`baseline conflict for ${path}`);
    } catch (error) {
      if (error.code === "ENOENT" && expected.exists === false) continue;
      throw error;
    }
  }
  return validation;
}

function recordSummary(content, path) {
  if (content === null || !path.endsWith(".md") || path.endsWith("/README.md")) return null;
  try {
    const { metadata } = parseFrontmatter(content, path);
    return { id: metadata.id ?? null, lifecycle: metadata.lifecycle ?? null, freshness: metadata.freshness ?? null };
  } catch {
    return null;
  }
}

export async function applyTransaction(root, transaction, options = {}) {
  if (!transaction || transaction.schema_version !== 1 || !Array.isArray(transaction.writes)) {
    throw new Error("transaction must use schema_version 1 and include writes");
  }
  for (const key of Object.keys(transaction)) {
    if (!["schema_version", "project_id", "repository_id", "baseline", "evidence", "writes"].includes(key)) {
      throw new Error(`transaction contains unknown key ${key}`);
    }
  }
  if (!Array.isArray(transaction.evidence) || transaction.evidence.some((item) => typeof item !== "string" || item === "")) {
    throw new Error("transaction evidence must be an array of non-empty strings");
  }
  if (transaction.evidence.length > 20 || transaction.evidence.some((item) => Buffer.byteLength(item) > 512)) {
    throw new Error("transaction evidence exceeds the bounded count or byte limit");
  }
  const rawPaths = transaction.writes.map((item) => item?.path);
  const paths = canonicalPathList(rawPaths, "transaction");
  const writes = new Map();
  const changeKinds = new Map();
  for (let index = 0; index < transaction.writes.length; index += 1) {
    const item = transaction.writes[index];
    if (!item || typeof item.content !== "string") throw new Error("each write requires a path and string content");
    for (const key of Object.keys(item)) {
      if (!["path", "content", "change_kind"].includes(key)) throw new Error(`transaction write contains unknown key ${key}`);
    }
    const path = normalizeRelativePath(item.path);
    if (!(path.startsWith("specs/") || TYPED_FOLDERS.some((folder) => path.startsWith(`memory/${folder}/`)))) {
      throw new Error(`transaction path is outside knowledge roots: ${path}`);
    }
    if (!path.endsWith(".md") || path.endsWith("/README.md")) {
      throw new Error(`transaction path must be one structured Markdown record: ${path}`);
    }
    if (item.change_kind && !["created", "updated", "corrected", "superseded"].includes(item.change_kind)) {
      throw new Error(`invalid change_kind for ${path}`);
    }
    writes.set(path, item.content);
    changeKinds.set(path, item.change_kind || null);
  }
  if (writes.size === 0) throw new Error("transaction contains no writes");
  const beforeValidation = await assertBaseline(root, transaction.baseline, paths);
  if (transaction.baseline.project_id !== transaction.project_id || transaction.project_id !== beforeValidation.project_id) {
    throw new Error("transaction project_id does not match baseline and repository identity");
  }
  if (
    transaction.baseline.repository_id !== transaction.repository_id ||
    transaction.repository_id !== beforeValidation.repository_id
  ) {
    throw new Error("transaction repository_id does not match baseline and repository identity");
  }
  for (const [path, content] of writes) {
    if (Buffer.byteLength(content) > beforeValidation.config.budgets.file_max_bytes) {
      throw new Error(`${path} exceeds configured maximum ${beforeValidation.config.budgets.file_max_bytes} bytes`);
    }
  }

  const overlay = new Map(writes);
  const candidate = await validateProject(root, { overlay });
  if (!candidate.usable) throw new Error(`candidate transaction failed validation: ${candidate.errors.join("; ")}`);

  const stagingRoot = join(root, "memory", ".cache", `.transaction-${randomUUID()}`);
  const backups = new Map();
  const backupFiles = new Map();
  const backupModes = new Map();
  const derivedKinds = new Map();
  const staged = new Map();
  const applied = [];
  const createdDirectories = [];
  let receipt = null;
  const rollback = async () => {
    const rollbackErrors = [];
    for (const path of [...applied].reverse()) {
      try {
        await assertSafeRepositoryPath(root, dirname(path), { allowMissing: false, requireDirectory: true });
        await rm(absolutePath(root, path), { force: true });
      } catch (error) {
        rollbackErrors.push(`${path}: ${error.message}`);
      }
    }
    for (const path of paths) {
      const backupPath = backupFiles.get(path);
      if (!backupPath || !(await pathExists(backupPath))) continue;
      try {
        const target = absolutePath(root, path);
        await assertSafeRepositoryPath(root, dirname(path), { allowMissing: false, requireDirectory: true });
        await rename(backupPath, target);
        await chmod(target, backupModes.get(path) ?? 0o644);
      } catch (error) {
        rollbackErrors.push(`${path}: ${error.message}`);
      }
    }
    for (const directory of [...createdDirectories].reverse()) {
      try {
        await rmdir(directory);
      } catch (error) {
        if (error.code !== "ENOTEMPTY") rollbackErrors.push(`${directory}: ${error.message}`);
      }
    }
    return rollbackErrors;
  };
  try {
    await assertSafeRepositoryPath(root, "memory/.cache", { allowMissing: false, requireDirectory: true });
    await mkdir(stagingRoot, { recursive: false });
    await assertSafeRepositoryPath(root, relative(root, stagingRoot), { allowMissing: false, requireDirectory: true });
    for (const path of paths) {
      const target = absolutePath(root, path);
      const stagedPath = join(stagingRoot, sha256(path));
      await writeFile(stagedPath, writes.get(path), { encoding: "utf8", flag: "wx", mode: 0o600 });
      staged.set(path, stagedPath);
      try {
        const safe = await assertSafeRepositoryPath(root, path, { allowMissing: false, requireFile: true });
        const before = await readFile(target);
        backups.set(path, before);
        backupModes.set(path, safe.info.mode & 0o777);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        backups.set(path, null);
      }
    }
    for (const path of paths) {
      const beforeRecord = recordSummary(backups.get(path)?.toString("utf8") ?? null, path);
      const afterRecord = recordSummary(writes.get(path), path);
      const derivedAction = backups.get(path) === null
        ? "created"
        : beforeRecord?.lifecycle !== "superseded" && afterRecord?.lifecycle === "superseded"
          ? "superseded"
          : changeKinds.get(path) === "corrected"
            ? "corrected"
            : "updated";
      if (changeKinds.get(path) && changeKinds.get(path) !== derivedAction) {
        throw new Error(`declared change_kind ${changeKinds.get(path)} does not match actual ${derivedAction} change for ${path}`);
      }
      derivedKinds.set(path, derivedAction);
    }
    for (const path of paths) {
      if (backups.get(path) === null) continue;
      const target = absolutePath(root, path);
      await assertSafeRepositoryPath(root, path, { allowMissing: false, requireFile: true });
      const backupPath = join(stagingRoot, `${sha256(path)}.before`);
      await rename(target, backupPath);
      backupFiles.set(path, backupPath);
    }
    for (const path of paths) {
      const target = absolutePath(root, path);
      const parentRelative = dirname(path);
      const segments = parentRelative === "." ? [] : parentRelative.split("/");
      let cursor = root;
      for (const segment of segments) {
        cursor = join(cursor, segment);
        try {
          const info = await lstat(cursor);
          if (info.isSymbolicLink() || !info.isDirectory()) throw new Error(`unsafe write ancestor for ${path}`);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
          await mkdir(cursor);
          createdDirectories.push(cursor);
        }
      }
      await assertSafeRepositoryPath(root, parentRelative, { allowMissing: false, requireDirectory: true });
      await rename(staged.get(path), target);
      await chmod(target, 0o644);
      await assertSafeRepositoryPath(root, path, { allowMissing: false, requireFile: true });
      applied.push(path);
    }
    if (options.injectPostWriteFailure) throw new Error("injected post-write validation failure");
    const afterValidation = await validateProject(root);
    if (!afterValidation.usable) {
      throw new Error(`post-write validation failed unexpectedly: ${afterValidation.errors.join("; ")}`);
    }
    const changed = [];
    for (const path of paths) {
      const beforeEntry = transaction.baseline.paths[path];
      const beforeContent = beforeEntry.exists ? backups.get(path).toString("utf8") : null;
      await assertSafeRepositoryPath(root, path, { allowMissing: false, requireFile: true });
      const afterContent = await readFile(absolutePath(root, path), "utf8");
      if (beforeEntry.exists && beforeEntry.sha256 === sha256(afterContent)) continue;
      changed.push({
        path,
        action: derivedKinds.get(path),
        before_sha256: beforeEntry.sha256,
        after_sha256: sha256(afterContent),
        before_record: recordSummary(beforeContent, path),
        after_record: recordSummary(afterContent, path),
      });
    }
    receipt = {
      schema_version: 1,
      project_id: afterValidation.project_id,
      repository_id: afterValidation.repository_id,
      baseline_head: transaction.baseline.head,
      in_scope_paths: paths,
      changed_paths: changed.map((item) => item.path),
      changes: changed,
      evidence: [...transaction.evidence],
      validation: { usable: true, failed_components: [] },
      index_state: afterValidation.config.index.enabled ? "stale" : "not_enabled",
      commit: null,
    };
  } catch (error) {
    const rollbackErrors = await rollback();
    const suffix = rollbackErrors.length ? `; rollback errors: ${rollbackErrors.join("; ")}` : "";
    throw new Error(`atomic transaction failed and was rolled back: ${error.message}${suffix}`);
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
  return receipt;
}

export function formatValidationHuman(result) {
  const lines = [`Second-brain foundation health for ${result.project_id || "unknown project"}`];
  for (const item of result.components) {
    lines.push(`[${item.status}] ${item.name}: ${item.detail}`);
    if (item.action !== "none") lines.push(`  Next action: ${item.action}`);
  }
  lines.push(`Usable: ${result.usable ? "yes" : "no"}`);
  return lines.join("\n");
}

export function validationReport(result) {
  return {
    schema_version: result.schema_version,
    project_id: result.project_id,
    repository_id: result.repository_id,
    usable: result.usable,
    stale: result.stale,
    components: result.components,
    errors: result.errors,
    diagnostic_count: result.diagnostic_count,
    diagnostics_truncated: result.diagnostics_truncated,
  };
}

export function formatSearchHuman(result) {
  const lines = [`${result.result_count} of ${result.matched_count} pointer(s) for "${result.query}"`];
  for (const item of result.results) {
    const anchors = item.anchors.length ? item.anchors.map((anchor) => `${item.path}:${anchor.line}`).join(", ") : item.path;
    lines.push(`${item.id} [${item.record_type}/${item.lifecycle}/${item.freshness}] ${item.title}`);
    lines.push(`  ${anchors}`);
    lines.push(`  provenance: ${item.provenance}`);
  }
  if (result.truncated_count) lines.push(`${result.truncated_count} pointer(s) truncated by result or byte limits`);
  return lines.join("\n");
}

export async function materializeTemplate(source, destination, projectId, repositoryId = null, options = {}) {
  if (!validProjectId(projectId)) throw new Error("project id must be 3-64 lowercase letters, digits, or hyphens");
  repositoryId ||= randomUUID();
  if (!validRepositoryId(repositoryId)) throw new Error("repository id must be a canonical UUID");
  const sourceRoot = await realpath(resolve(source));
  const destinationRoot = resolve(destination);
  const files = [];
  const directories = new Set();
  const collisionKeys = new Map();
  const collect = async (from, relativePath = "") => {
    const entries = await readdir(from, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const nextRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      normalizeRelativePath(nextRelative);
      const key = pathCollisionKey(nextRelative);
      if (collisionKeys.has(key)) throw new Error(`template path collision: ${collisionKeys.get(key)} and ${nextRelative}`);
      collisionKeys.set(key, nextRelative);
      const sourcePath = join(from, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`template contains forbidden symbolic link ${nextRelative}`);
      if (entry.isDirectory()) {
        directories.add(nextRelative);
        await collect(sourcePath, nextRelative);
      } else if (entry.isFile()) {
        const content = await readFile(sourcePath);
        const replaced = content
          .toString("utf8")
          .replaceAll("__PROJECT_ID__", projectId)
          .replaceAll("__REPOSITORY_ID__", repositoryId);
        files.push({ path: nextRelative, content: replaced });
      }
    }
  };
  await collect(sourceRoot);

  let destinationExists = false;
  try {
    const info = await lstat(destinationRoot);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error("materialization destination must be a real directory");
    destinationExists = true;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const inspectTarget = async (relativePath, kind) => {
    const target = join(destinationRoot, ...relativePath.split("/"));
    try {
      const info = await lstat(target);
      if (info.isSymbolicLink()) throw new Error(`materialization target is a symbolic link: ${relativePath}`);
      if (kind === "file" || !info.isDirectory()) throw new Error(`materialization collision at ${relativePath}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  };
  if (destinationExists) {
    for (const directory of [...directories].sort()) await inspectTarget(directory, "directory");
    for (const file of files) await inspectTarget(file.path, "file");
  }

  const parent = dirname(destinationRoot);
  await mkdir(parent, { recursive: true });
  const stage = await mkdtemp(join(parent, ".second-brain-stage-"));
  const createdFiles = [];
  const createdDirectories = [];
  try {
    for (const directory of [...directories].sort()) await mkdir(join(stage, ...directory.split("/")), { recursive: true });
    for (const file of files) {
      const target = join(stage, ...file.path.split("/"));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content, { flag: "wx", mode: 0o644 });
    }
    if (!destinationExists) {
      if (options.failBeforeApply) throw new Error("injected materialization failure");
      await rename(stage, destinationRoot);
      return { project_id: projectId, repository_id: repositoryId, files: files.map((item) => item.path).sort() };
    }
    for (const directory of [...directories].sort((left, right) => left.split("/").length - right.split("/").length || left.localeCompare(right))) {
      const target = join(destinationRoot, ...directory.split("/"));
      if (!(await pathExists(target))) {
        await mkdir(target);
        createdDirectories.push(target);
      }
    }
    for (const file of files.sort((left, right) => left.path.localeCompare(right.path, "en"))) {
      const target = join(destinationRoot, ...file.path.split("/"));
      await rename(join(stage, ...file.path.split("/")), target);
      createdFiles.push(target);
      if (options.failAfterCreateCount === createdFiles.length) throw new Error("injected materialization failure");
    }
    return { project_id: projectId, repository_id: repositoryId, files: files.map((item) => item.path).sort() };
  } catch (error) {
    for (const file of createdFiles.reverse()) await rm(file, { force: true });
    for (const directory of createdDirectories.reverse()) {
      try {
        await rmdir(directory);
      } catch (removeError) {
        if (removeError.code !== "ENOTEMPTY") throw removeError;
      }
    }
    throw new Error(`materialization failed without changing preexisting files: ${error.message}`);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

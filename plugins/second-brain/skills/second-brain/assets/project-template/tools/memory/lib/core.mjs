import { chmod, lstat, mkdir, readFile, readdir, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
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
const SECRET_PATTERNS = [
  { name: "private_key", expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "aws_access_key", expression: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { name: "github_token", expression: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { name: "slack_token", expression: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { name: "jwt", expression: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/ },
  {
    name: "assigned_secret",
    expression: /\b(?:api[_-]?key|client[_-]?secret|password|auth[_-]?token)\s*[:=]\s*["']?[A-Za-z0-9_+./=-]{12,}/i,
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
  if (typeof input !== "string" || input === "" || input.includes("\0") || isAbsolute(input)) {
    throw new Error(`path must be a non-empty repository-relative path: ${String(input)}`);
  }
  const normalized = input.replaceAll("\\", "/").replace(/^\.\/+/, "");
  if (
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    normalized.endsWith("/..")
  ) {
    throw new Error(`path escapes the repository: ${input}`);
  }
  return normalized;
}

function absolutePath(root, path) {
  const normalized = normalizeRelativePath(path);
  const target = resolve(root, normalized);
  if (target !== root && !target.startsWith(`${root}${sep}`)) throw new Error(`path escapes the repository: ${path}`);
  return target;
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
    for (const [key, value] of Object.entries(config.canonical_paths)) {
      validateRelativeConfigPath(value, `canonical_paths.${key}`, errors);
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
    return readFile(absolutePath(root, path), "utf8");
  };
  const marker = JSON.parse(await read(MARKER));
  const config = parseStrictYaml(await read(CONFIG), CONFIG);
  return { marker, config, read };
}

async function listFilesRecursively(root, relativeRoot) {
  const output = [];
  const base = absolutePath(root, relativeRoot);
  if (!(await pathExists(base))) return output;
  const walk = async (directory, relativeDirectory) => {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const relativePath = `${relativeDirectory}/${entry.name}`.replace(/^\/+/, "");
      if (entry.isSymbolicLink()) throw new Error(`symbolic links are not allowed in knowledge roots: ${relativePath}`);
      if (entry.isDirectory()) await walk(join(directory, entry.name), relativePath);
      else if (entry.isFile()) output.push(relativePath);
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
  const found = new Set();
  for (const configuredRoot of configured) {
    for (const path of await listFilesRecursively(root, configuredRoot)) {
      if (path.endsWith(".md") && !path.endsWith("/README.md")) found.add(path);
    }
  }
  for (const [path, content] of overlay) {
    if (configured.some((base) => path === base || path.startsWith(`${base}/`))) {
      if (path.endsWith(".md") && !path.endsWith("/README.md")) {
        if (content === null) found.delete(path);
        else found.add(path);
      }
    }
  }
  return [...found].sort((left, right) => left.localeCompare(right, "en"));
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
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item !== "");
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
  if (metadata.lifecycle === "superseded" && (!metadata.successors || metadata.successors.length === 0)) {
    errors.push(`${path}: superseded records require at least one successor`);
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
    for (const id of metadata.predecessors || []) {
      const target = byId.get(id);
      if (!target) errors.push(`${record.path}: predecessor ${id} does not exist`);
      else if (!(target.metadata.successors || []).includes(metadata.id)) {
        errors.push(`${record.path}: predecessor ${id} does not link back through successors`);
      }
    }
    for (const id of metadata.successors || []) {
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
    for (const id of metadata.related || []) {
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
    for (const successor of record?.metadata.successors || []) {
      if (byId.has(successor)) visit(successor, [...trail, id]);
    }
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of byId.keys()) visit(id, []);

  for (const record of records) {
    const activeSuccessors = (record.metadata.successors || [])
      .map((id) => byId.get(id))
      .filter(Boolean)
      .filter(currentLifecycle);
    if (activeSuccessors.length > 1) {
      errors.push(`${record.path}: competing current successors ${activeSuccessors.map((item) => item.metadata.id).join(", ")}`);
    }
  }
  return errors;
}

function secretFindings(path, content) {
  const findings = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.expression.test(lines[index])) findings.push(`${path}:${index + 1}: secret-like ${pattern.name} content`);
      pattern.expression.lastIndex = 0;
    }
  }
  return findings;
}

async function loadRecords(root, config, read, overlay) {
  const errors = [];
  const records = [];
  const ids = new Map();
  for (const path of await knowledgeFiles(root, config, overlay)) {
    let content;
    try {
      content = await read(path);
    } catch (error) {
      errors.push(`${path}: cannot read record: ${error.message}`);
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
  return readFile(absolutePath(root, path), "utf8");
}

export async function validateProject(root, options = {}) {
  root = await realpath(resolve(root));
  const overlay = options.overlay || new Map();
  const components = [];
  const allErrors = [];
  let marker;
  let config;

  const gitResult = git(root, ["rev-parse", "--show-toplevel"]);
  if (gitResult.status !== 0 || resolve(gitResult.stdout.trim()) !== resolve(root)) {
    components.push(component("git", "failed", "validation root is not the Git root", "run from the intended repository root"));
    return { schema_version: 1, usable: false, components, errors: ["Git root validation failed"], records: [] };
  }
  components.push(component("git", "ok", "Git root is available", "none"));

  try {
    const inputs = await readProjectInputs(root, overlay);
    marker = inputs.marker;
    config = inputs.config;
  } catch (error) {
    components.push(component("project_identity", "failed", error.message, `restore ${MARKER} and ${CONFIG}`));
    return { schema_version: 1, usable: false, components, errors: [error.message], records: [] };
  }

  const identityErrors = [];
  if (marker.schema_version !== 1) identityErrors.push(`${MARKER} schema_version must be 1`);
  if (!validProjectId(marker.project_id)) identityErrors.push(`${MARKER} project_id is invalid`);
  if (marker.project_id !== config.project_id) identityErrors.push(`project identity mismatch: marker=${marker.project_id}, config=${config.project_id}`);
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
  const markerTracked = git(root, ["ls-files", "--error-unmatch", "--", MARKER]);
  if (markerTracked.status !== 0 && !overlay.has(MARKER)) identityErrors.push(`${MARKER} must be committed to bind repository identity`);
  if (identityErrors.length) {
    components.push(component("project_identity", "failed", identityErrors.join("; "), "restore the repository marker or matching configuration"));
    allErrors.push(...identityErrors);
  } else {
    components.push(component("project_identity", "ok", `project id ${config.project_id} matches the root marker`, "none"));
  }

  const configErrors = validateConfig(config);
  if (configErrors.length) {
    components.push(component("configuration_schema", "failed", configErrors.join("; "), "correct memory/config.yaml"));
    allErrors.push(...configErrors);
  } else {
    components.push(component("configuration_schema", "ok", "configuration matches schema version 1", "none"));
  }

  const requiredPaths = config.canonical_paths
    ? [
        [config.canonical_paths.project_router, "file"],
        [config.canonical_paths.specifications, "directory"],
        [config.canonical_paths.memory, "directory"],
        [config.canonical_paths.current_context, "file"],
        ...TYPED_FOLDERS.map((folder) => [typedRoot(config, folder), "directory"]),
      ]
    : [];
  const structureErrors = [];
  for (const [path, kind] of requiredPaths) {
    try {
      if (overlay.has(path)) {
        if (overlay.get(path) === null) structureErrors.push(`${path} is missing`);
        continue;
      }
      const info = await stat(absolutePath(root, path));
      if ((kind === "file" && !info.isFile()) || (kind === "directory" && !info.isDirectory())) {
        structureErrors.push(`${path} must be a ${kind}`);
      }
    } catch {
      structureErrors.push(`${path} is missing`);
    }
  }
  if (structureErrors.length) {
    components.push(component("routers_and_folders", "failed", structureErrors.join("; "), "restore the required project template paths"));
    allErrors.push(...structureErrors);
  } else {
    components.push(component("routers_and_folders", "ok", "required routers and typed folders exist", "none"));
  }

  let records = [];
  if (configErrors.length === 0) {
    const read = (path) => readOverlayOrFile(root, path, overlay);
    const loaded = await loadRecords(root, config, read, overlay);
    records = loaded.records;
    if (loaded.errors.length) {
      components.push(component("records_and_links", "failed", loaded.errors.join("; "), "correct malformed records, identifiers, and lifecycle links"));
      allErrors.push(...loaded.errors);
    } else {
      components.push(component("records_and_links", "ok", `${records.length} structured records are valid`, "none"));
    }
  } else {
    components.push(component("records_and_links", "failed", "records cannot be validated until configuration is valid", "correct memory/config.yaml"));
  }

  const budgetErrors = [];
  if (configErrors.length === 0) {
    try {
      const router = await readOverlayOrFile(root, config.canonical_paths.project_router, overlay);
      const current = await readOverlayOrFile(root, config.canonical_paths.current_context, overlay);
      const routerBytes = Buffer.byteLength(router);
      const currentBytes = Buffer.byteLength(current);
      const currentLines = current.split(/\r?\n/).filter((line) => line.trim() !== "").length;
      if (routerBytes > config.budgets.project_router_max_bytes) {
        budgetErrors.push(`project router is ${routerBytes} bytes, maximum ${config.budgets.project_router_max_bytes}`);
      }
      if (currentBytes > config.budgets.current_max_bytes) {
        budgetErrors.push(`current briefing is ${currentBytes} bytes, maximum ${config.budgets.current_max_bytes}`);
      }
      if (currentLines > config.budgets.current_max_nonempty_lines) {
        budgetErrors.push(`current briefing has ${currentLines} non-empty lines, maximum ${config.budgets.current_max_nonempty_lines}`);
      }
      if (routerBytes + currentBytes > config.budgets.startup_max_bytes) {
        budgetErrors.push(`startup context is ${routerBytes + currentBytes} bytes, maximum ${config.budgets.startup_max_bytes}`);
      }
    } catch (error) {
      budgetErrors.push(`cannot measure context budgets: ${error.message}`);
    }
  }
  if (budgetErrors.length) {
    components.push(component("context_budgets", "failed", budgetErrors.join("; "), "condense PROJECT.md or memory/context/current.md"));
    allErrors.push(...budgetErrors);
  } else {
    components.push(component("context_budgets", "ok", "router and current briefing are within configured budgets", "none"));
  }

  const scanPaths = new Set([MARKER, CONFIG]);
  if (config.canonical_paths) {
    scanPaths.add(config.canonical_paths.project_router);
    scanPaths.add(`${config.canonical_paths.specifications}/README.md`);
    scanPaths.add(`${config.canonical_paths.memory}/README.md`);
  }
  for (const record of records) scanPaths.add(record.path);
  if (configErrors.length === 0) {
    for (const rootPath of [
      config.canonical_paths.specifications,
      ...TYPED_FOLDERS.map((folder) => typedRoot(config, folder)),
    ]) {
      for (const path of await listFilesRecursively(root, rootPath)) scanPaths.add(path);
    }
  }
  const secretErrors = [];
  for (const path of [...scanPaths].sort()) {
    try {
      secretErrors.push(...secretFindings(path, await readOverlayOrFile(root, path, overlay)));
    } catch {
      // Required-file checks report missing paths. Optional router files may be absent.
    }
  }
  if (secretErrors.length) {
    components.push(component("secret_scan", "failed", secretErrors.join("; "), "remove credentials and rotate exposed secrets"));
    allErrors.push(...secretErrors);
  } else {
    components.push(component("secret_scan", "ok", "routers, config, specs, and typed memory contain no recognized secret pattern", "none"));
  }

  if (configErrors.length === 0 && config.index.enabled === false) {
    components.push(component("optional_index", "not_enabled", "index-free deterministic search is configured", "none"));
  } else if (configErrors.length === 0) {
    const healthPath = `${config.canonical_paths.memory}/.cache/health.json`;
    try {
      const health = JSON.parse(await readOverlayOrFile(root, healthPath, overlay));
      const head = git(root, ["rev-parse", "HEAD"]).stdout.trim();
      if (
        health.schema_version !== config.index.schema_version ||
        health.source_commit !== head ||
        !Array.isArray(health.source_hashes) ||
        JSON.stringify(health.modes) !== JSON.stringify(config.index.modes)
      ) {
        components.push(component("optional_index", "stale", "index health does not match configuration or current commit", "rebuild the disposable index"));
      } else {
        components.push(component("optional_index", "ok", `index matches commit ${head}`, "none"));
      }
    } catch {
      components.push(component("optional_index", "stale", "index is enabled but no valid health receipt exists", "rebuild the disposable index"));
    }
  }

  if (configErrors.length === 0 && config.external_authorities.length === 0) {
    components.push(component("external_authorities", "not_enabled", "no external authority exceptions are configured", "none"));
  } else if (configErrors.length === 0) {
    components.push(component("external_authorities", "ok", `${config.external_authorities.length} stable pointers are configured; availability was not contacted`, "verify external availability only when the task requires it"));
  }

  const worst = components.reduce((rank, item) => Math.max(rank, statusRank(item.status)), 0);
  return {
    schema_version: 1,
    project_id: config.project_id,
    usable: worst < 2,
    stale: worst === 1,
    components,
    errors: [...new Set(allErrors)].sort(),
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
  for (const item of ranked) {
    const pointer = { ...item };
    delete pointer.rank;
    delete pointer.current;
    delete pointer.authority;
    const candidate = [...results, pointer];
    if (Buffer.byteLength(JSON.stringify(candidate)) > validation.config.budgets.task_retrieval_max_bytes) break;
    results.push(pointer);
    if (results.length === limit) break;
  }
  if (ranked.length > 0 && results.length === 0) {
    throw new Error("task retrieval budget is too small for one pointer result");
  }
  return {
    schema_version: 1,
    project_id: validation.project_id,
    query,
    index_state: "not_enabled",
    result_count: results.length,
    max_results: limit,
    budget_bytes: validation.config.budgets.task_retrieval_max_bytes,
    results,
  };
}

export async function captureBaseline(root, paths) {
  if (!Array.isArray(paths) || paths.length === 0) throw new Error("at least one explicit in-scope path is required");
  const normalized = [...new Set(paths.map(normalizeRelativePath))].sort((left, right) => left.localeCompare(right, "en"));
  const validation = await validateProject(root);
  if (!validation.usable) throw new Error(`cannot capture baseline for an invalid project: ${validation.errors.join("; ")}`);
  const entries = {};
  for (const path of normalized) {
    const target = absolutePath(root, path);
    try {
      const info = await lstat(target);
      if (!info.isFile()) throw new Error(`${path} is not a regular file`);
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
  const baselinePaths = Object.keys(baseline.paths).sort();
  if (JSON.stringify(baselinePaths) !== JSON.stringify(transactionPaths)) {
    throw new Error("transaction paths must exactly match the explicit baseline scope");
  }
  for (const path of baselinePaths) {
    const expected = baseline.paths[path];
    try {
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

export async function applyTransaction(root, transaction) {
  if (!transaction || transaction.schema_version !== 1 || !Array.isArray(transaction.writes)) {
    throw new Error("transaction must use schema_version 1 and include writes");
  }
  if (!Array.isArray(transaction.evidence) || transaction.evidence.some((item) => typeof item !== "string" || item === "")) {
    throw new Error("transaction evidence must be an array of non-empty strings");
  }
  const writes = new Map();
  const changeKinds = new Map();
  for (const item of transaction.writes) {
    if (!item || typeof item.content !== "string") throw new Error("each write requires a path and string content");
    const path = normalizeRelativePath(item.path);
    if (writes.has(path)) throw new Error(`duplicate transaction path ${path}`);
    if (!(path.startsWith("specs/") || TYPED_FOLDERS.some((folder) => path.startsWith(`memory/${folder}/`)))) {
      throw new Error(`transaction path is outside knowledge roots: ${path}`);
    }
    if (item.change_kind && !["created", "updated", "corrected", "superseded"].includes(item.change_kind)) {
      throw new Error(`invalid change_kind for ${path}`);
    }
    writes.set(path, item.content);
    changeKinds.set(path, item.change_kind || null);
  }
  if (writes.size === 0) throw new Error("transaction contains no writes");
  const paths = [...writes.keys()].sort((left, right) => left.localeCompare(right, "en"));
  const beforeValidation = await assertBaseline(root, transaction.baseline, paths);
  if (transaction.baseline.project_id !== transaction.project_id || transaction.project_id !== beforeValidation.project_id) {
    throw new Error("transaction project_id does not match baseline and repository identity");
  }

  const overlay = new Map(writes);
  const candidate = await validateProject(root, { overlay });
  if (!candidate.usable) throw new Error(`candidate transaction failed validation: ${candidate.errors.join("; ")}`);

  const stagingRoot = join(root, "memory", ".cache", `.transaction-${randomUUID()}`);
  const backups = new Map();
  const backupFiles = new Map();
  const derivedKinds = new Map();
  const staged = new Map();
  const applied = [];
  try {
    await mkdir(dirname(stagingRoot), { recursive: true });
    await mkdir(stagingRoot, { recursive: false });
    for (const path of paths) {
      const target = absolutePath(root, path);
      const stagedPath = join(stagingRoot, sha256(path));
      await writeFile(stagedPath, writes.get(path), { encoding: "utf8", flag: "wx", mode: 0o600 });
      staged.set(path, stagedPath);
      try {
        const before = await readFile(target);
        backups.set(path, before);
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
      const backupPath = join(stagingRoot, `${sha256(path)}.before`);
      await rename(target, backupPath);
      backupFiles.set(path, backupPath);
    }
    for (const path of paths) {
      const target = absolutePath(root, path);
      await mkdir(dirname(target), { recursive: true });
      await rename(staged.get(path), target);
      await chmod(target, 0o644);
      applied.push(path);
    }
  } catch (error) {
    for (const path of applied.reverse()) {
      const target = absolutePath(root, path);
      await rm(target, { force: true });
    }
    for (const path of paths) {
      const backupPath = backupFiles.get(path);
      if (!backupPath || !(await pathExists(backupPath))) continue;
      const target = absolutePath(root, path);
      await mkdir(dirname(target), { recursive: true });
      await rename(backupPath, target);
      await chmod(target, 0o644);
    }
    throw new Error(`atomic transaction failed and was rolled back: ${error.message}`);
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }

  const afterValidation = await validateProject(root);
  if (!afterValidation.usable) throw new Error(`post-write validation failed unexpectedly: ${afterValidation.errors.join("; ")}`);
  const changed = [];
  for (const path of paths) {
    const beforeEntry = transaction.baseline.paths[path];
    const beforeContent = beforeEntry.exists ? backups.get(path).toString("utf8") : null;
    const afterContent = await readFile(absolutePath(root, path), "utf8");
    if (beforeEntry.exists && beforeEntry.sha256 === sha256(afterContent)) continue;
    const beforeRecord = recordSummary(beforeContent, path);
    const afterRecord = recordSummary(afterContent, path);
    changed.push({
      path,
      action: derivedKinds.get(path),
      before_sha256: beforeEntry.sha256,
      after_sha256: sha256(afterContent),
      before_record: beforeRecord,
      after_record: afterRecord,
    });
  }
  return {
    schema_version: 1,
    project_id: afterValidation.project_id,
    baseline_head: transaction.baseline.head,
    in_scope_paths: paths,
    changed_paths: changed.map((item) => item.path),
    changes: changed,
    evidence: [...transaction.evidence],
    validation: { usable: true, failed_components: [] },
    index_state: afterValidation.config.index.enabled ? "stale" : "not_enabled",
    commit: null,
  };
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
    usable: result.usable,
    stale: result.stale,
    components: result.components,
    errors: result.errors,
  };
}

export function formatSearchHuman(result) {
  const lines = [`${result.result_count} pointer(s) for "${result.query}"`];
  for (const item of result.results) {
    const anchors = item.anchors.length ? item.anchors.map((anchor) => `${item.path}:${anchor.line}`).join(", ") : item.path;
    lines.push(`${item.id} [${item.record_type}/${item.lifecycle}/${item.freshness}] ${item.title}`);
    lines.push(`  ${anchors}`);
    lines.push(`  provenance: ${item.provenance}`);
  }
  return lines.join("\n");
}

export async function materializeTemplate(source, destination, projectId) {
  if (!validProjectId(projectId)) throw new Error("project id must be 3-64 lowercase letters, digits, or hyphens");
  const sourceRoot = resolve(source);
  const destinationRoot = resolve(destination);
  const walk = async (from, relativePath = "") => {
    const entries = await readdir(from, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const nextRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      const sourcePath = join(from, entry.name);
      const destinationPath = join(destinationRoot, nextRelative);
      if (entry.isSymbolicLink()) throw new Error(`template contains forbidden symbolic link ${nextRelative}`);
      if (entry.isDirectory()) {
        await mkdir(destinationPath, { recursive: true });
        await walk(sourcePath, nextRelative);
      } else if (entry.isFile()) {
        const content = await readFile(sourcePath);
        const replaced = content.toString("utf8").replaceAll("__PROJECT_ID__", projectId);
        await mkdir(dirname(destinationPath), { recursive: true });
        await writeFile(destinationPath, replaced, { flag: "wx", mode: 0o644 });
      }
    }
  };
  await mkdir(destinationRoot, { recursive: true });
  await walk(sourceRoot);
}

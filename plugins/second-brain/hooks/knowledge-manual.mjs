/** Shared read-only managed-manual discovery. No hooks or review-state imports. */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const MANUAL_PATH = "knowledge/knowledge-manual.md";
export const LEGACY_MANUAL_PATH = "knowledge/README.md";
export const MANUAL_MARKER = "<!-- claude-toolkit:knowledge-manual -->";

export const SCHEMA_MARKER = "<!-- claude-toolkit:knowledge-schema:2 -->";
export const MEMORY_CONFIG_PATH = ".toolkit-memory.json";
export const MEMORY_SERVICES = ["mem0", "hindsight"];

const FILES_CONFIG = Object.freeze({ mode: "files", service: null, server: null, project: null, error: null });
const nonblank = value => typeof value === "string" && value.trim() !== "" && !/[\r\n]/.test(value);

/**
 * The project's memory mode, from `.toolkit-memory.json` at the project root.
 * A missing file means `files`. An unreadable or invalid file also gives
 * `files`, so hooks fail open, but `error` says what is wrong; the checker
 * reports it as a problem.
 */
export function readMemoryConfig(projectRoot) {
  const path = resolve(projectRoot, MEMORY_CONFIG_PATH);
  if (!existsSync(path)) return { ...FILES_CONFIG };
  const invalid = error => ({ ...FILES_CONFIG, error: `${MEMORY_CONFIG_PATH} ${error}` });
  let data;
  try { data = JSON.parse(readFileSync(path, "utf8")); }
  catch { return invalid("could not be read as JSON. Fix it; files mode is used until then."); }
  if (!data || typeof data !== "object" || Array.isArray(data)) return invalid("must be a JSON object.");
  if (data.format !== 1) return invalid('needs "format": 1.');
  if (data.memory === "files") return { ...FILES_CONFIG };
  if (data.memory !== "external") return invalid('needs "memory" set to "files" or "external".');
  if (!MEMORY_SERVICES.includes(data.service)) return invalid(`needs "service" set to ${MEMORY_SERVICES.map(x => `"${x}"`).join(" or ")} in external mode.`);
  if (!nonblank(data.server) || !/^[A-Za-z0-9_.-]+$/.test(data.server)) return invalid('needs "server" set to the MCP server name in external mode.');
  if (!nonblank(data.project)) return invalid('needs "project" set to the memory scope in external mode.');
  return { mode: "external", service: data.service, server: data.server.trim(), project: data.project.trim(), error: null };
}

/** Where each kind of project knowledge lives. `null`: held by the memory service. */
export function memoryLayout(mode) {
  if (mode === "external") return {
    mode: "external",
    projectContext: "PROJECT.md",
    knowledgeManual: "docs/knowledge-manual.md",
    toolkitManual: "docs/toolkit-manual.md",
    prds: "prds",
    prdIndex: "prds/prd-index.md",
    workingMemory: null,
    lastingMemory: null,
    memoryIndex: null,
    inbox: null,
    feedback: null,
  };
  return {
    mode: "files",
    projectContext: "knowledge/project.md",
    knowledgeManual: MANUAL_PATH,
    toolkitManual: "knowledge/toolkit-manual.md",
    prds: "knowledge/prds",
    prdIndex: "knowledge/prds/prd-index.md",
    workingMemory: "knowledge/memory/current.md",
    lastingMemory: "knowledge/memory/memory-entries",
    memoryIndex: "knowledge/memory/memory-index.md",
    inbox: "knowledge/memory-inbox.md",
    feedback: "knowledge/memory-self-improvement.md",
  };
}

/** MCP tool names, as `mcp__<server>__<tool>`, by class. */
export const MEMORY_TOOL_CLASSES = {
  mem0: {
    "memory-write": ["add_memory", "update_memory", "delete_memory", "delete_all_memories"],
    "memory-read": ["get_memories", "get_memory", "search_memories"],
  },
  hindsight: {
    "memory-write": ["retain", "sync_retain", "delete_document", "clear_memories"],
    "memory-read": ["list_documents", "get_document", "recall", "list_memories", "get_memory"],
  },
};

export function memoryToolName(config, tool) {
  return `mcp__${config.server}__${tool}`;
}

/** Startup text for listing every record of one kind, naming the exact tool.
 * It follows the knowledge-setup skill's references/memory-providers/ adapters.
 * Hindsight's list_documents has no tag filter: `q` matches part of the id. */
export function memoryListStep(config, kind) {
  const tool = name => `\`${memoryToolName(config, name)}\``;
  if (config.service === "hindsight") {
    return `${tool("list_documents")} with q "${kind}:", keeping ids that start with "${kind}:", then ${tool("get_document")} for each`;
  }
  const filters = JSON.stringify({ AND: [{ app_id: config.project }, { metadata: { toolkit_kind: kind } }] });
  return `${tool("get_memories")} with filters \`${filters}\``;
}

/** Where the exact tool arguments for a service are written down. */
export function memoryAdapterReference(config) {
  return `the \`knowledge-setup\` skill's \`references/memory-providers/${config.service}.md\``;
}

/** True when the knowledge hooks run their turn review: a managed schema-2
 * manual at the mode's path, or a valid external memory config. */
export function knowledgeActive(projectRoot, manual = resolveManual(projectRoot)) {
  return Boolean(manual.text?.includes(SCHEMA_MARKER)) || readMemoryConfig(projectRoot).mode === "external";
}

/** The project root for a hook installed under `<root>/.claude/hooks/`. */
export function isProjectRoot(path) {
  return existsSync(resolve(path, "knowledge")) || existsSync(resolve(path, MEMORY_CONFIG_PATH));
}

/** Read-only compatibility during the manual filename migration. In external
 * mode the manual lives at `docs/knowledge-manual.md` and has no legacy path. */
export function resolveManual(projectRoot) {
  const config = readMemoryConfig(projectRoot);
  if (config.mode === "external") return resolveExternalManual(projectRoot);
  const read = path => {
    const absolute = resolve(projectRoot, path);
    return existsSync(absolute) ? readFileSync(absolute, "utf8") : null;
  };
  try {
    const current = read(MANUAL_PATH);
    let legacy = null;
    let legacyUnreadable = false;
    try { legacy = read(LEGACY_MANUAL_PATH); } catch { legacyUnreadable = true; }
    const marked = text => text !== null && text.trimStart().startsWith(MANUAL_MARKER);
    const normalize = text => text.replace(/\r\n/g, "\n")
      .replaceAll(LEGACY_MANUAL_PATH, MANUAL_PATH).trim();
    if (current !== null) {
      if (!current.trim()) return { path: MANUAL_PATH, notice: `Project startup file empty: ${MANUAL_PATH}. Continuing without it.` };
      if (!marked(current)) return { path: MANUAL_PATH, notice: "Knowledge manual is not marked as managed. Run project-sync to review it; no manual policy was loaded." };
      if (marked(legacy) && normalize(current) !== normalize(legacy)) {
        return { path: MANUAL_PATH, notice: "Conflicting marked knowledge manuals exist at knowledge/knowledge-manual.md and knowledge/README.md. Preserve both and reconcile through project-sync; no manual policy was loaded." };
      }
      return { path: MANUAL_PATH, text: current,
        ...(legacyUnreadable ? { notice: "Using the canonical knowledge manual; legacy knowledge/README.md could not be inspected. Project-sync must check that path before migration cleanup." } : {}) };
    }
    if (marked(legacy)) return { path: LEGACY_MANUAL_PATH, text: legacy,
      notice: "Using the legacy knowledge/README.md manual until project-sync migrates it to knowledge/knowledge-manual.md." };
    if (legacyUnreadable) return { path: MANUAL_PATH, notice: "Canonical knowledge manual is missing and legacy knowledge/README.md could not be read. No manual policy was loaded; project-sync must investigate." };
    return { path: MANUAL_PATH };
  } catch {
    return { path: MANUAL_PATH, notice: "Could not read the knowledge manual. Preserve existing files and use project-sync to investigate; no manual policy was loaded." };
  }
}

function resolveExternalManual(projectRoot) {
  const path = memoryLayout("external").knowledgeManual;
  try {
    const absolute = resolve(projectRoot, path);
    if (!existsSync(absolute)) return { path };
    const text = readFileSync(absolute, "utf8");
    if (!text.trim()) return { path, notice: `Project startup file empty: ${path}. Continuing without it.` };
    if (!text.trimStart().startsWith(MANUAL_MARKER)) return { path, notice: "Knowledge manual is not marked as managed. Run project-sync to review it; no manual policy was loaded." };
    return { path, text };
  } catch {
    return { path, notice: "Could not read the knowledge manual. Preserve existing files and use project-sync to investigate; no manual policy was loaded." };
  }
}

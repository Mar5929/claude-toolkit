import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export class WorkError extends Error {
  constructor(message, code = "work_error", details = undefined) {
    super(message);
    this.name = "WorkError";
    this.code = code;
    this.details = details;
  }
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    input: options.input,
    env: options.env ?? process.env,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) {
    throw new WorkError(
      `Could not run ${command}: ${result.error.message}`,
      "command_unavailable",
    );
  }
  if (result.status !== 0 && !options.allowFailure) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new WorkError(
      `${command} ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`,
      "command_failed",
      { command, args, status: result.status },
    );
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

export function git(repoRoot, args, options = {}) {
  return run("git", ["-C", repoRoot, ...args], options);
}

export function findGitRoot(start = process.cwd()) {
  const result = run("git", ["-C", path.resolve(start), "rev-parse", "--show-toplevel"]);
  return fs.realpathSync(result.stdout.trim());
}

export function isoDate(value = new Date()) {
  return value.toISOString().slice(0, 10);
}

export function isoTimestamp(value = new Date()) {
  return value.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && isoDate(date) === value;
}

export function readJson(filePath, label = path.basename(filePath)) {
  let source;
  try {
    source = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new WorkError(`${label} does not exist at ${filePath}`, "missing_file");
    }
    throw error;
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new WorkError(`${label} is not valid JSON: ${error.message}`, "invalid_json");
  }
}

export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function atomicWrite(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );
  let handle;
  try {
    handle = fs.openSync(tempPath, "wx", 0o600);
    fs.writeFileSync(handle, content, "utf8");
    fs.fsyncSync(handle);
    fs.closeSync(handle);
    handle = undefined;
    if (process.env.WORK_TRACKER_FAIL_AFTER_TEMP === "1") {
      throw new WorkError("Injected failure before atomic rename", "injected_failure");
    }
    fs.renameSync(tempPath, filePath);
  } finally {
    if (handle !== undefined) fs.closeSync(handle);
    try {
      fs.unlinkSync(tempPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

export function atomicWriteJson(filePath, value) {
  atomicWrite(filePath, stableJson(value));
}

export function atomicBatchWrite(entries) {
  const nonce = `${process.pid}.${Date.now()}`;
  const prepared = [];
  try {
    for (const entry of entries) {
      fs.mkdirSync(path.dirname(entry.path), { recursive: true });
      const tempPath = path.join(
        path.dirname(entry.path),
        `.${path.basename(entry.path)}.${nonce}.tmp`,
      );
      const backupPath = path.join(
        path.dirname(entry.path),
        `.${path.basename(entry.path)}.${nonce}.bak`,
      );
      fs.writeFileSync(tempPath, entry.content, { encoding: "utf8", mode: 0o600, flag: "wx" });
      prepared.push({
        ...entry,
        tempPath,
        backupPath,
        existed: fs.existsSync(entry.path),
        backedUp: false,
        installed: false,
      });
    }
    if (process.env.WORK_TRACKER_FAIL_AFTER_TEMP === "1") {
      throw new WorkError("Injected failure before atomic batch rename", "injected_failure");
    }
    for (const entry of prepared) {
      if (entry.existed) {
        fs.renameSync(entry.path, entry.backupPath);
        entry.backedUp = true;
      }
      fs.renameSync(entry.tempPath, entry.path);
      entry.installed = true;
    }
    for (const entry of prepared) {
      if (entry.backedUp) fs.unlinkSync(entry.backupPath);
    }
  } catch (error) {
    for (const entry of [...prepared].reverse()) {
      try {
        if (entry.installed && fs.existsSync(entry.path)) fs.unlinkSync(entry.path);
        if (entry.backedUp && fs.existsSync(entry.backupPath)) {
          fs.renameSync(entry.backupPath, entry.path);
        }
        if (fs.existsSync(entry.tempPath)) fs.unlinkSync(entry.tempPath);
      } catch {
        // Validation and reconciliation will report any interrupted recovery.
      }
    }
    throw error;
  }
}

export function slugify(value) {
  const slug = String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "work-item";
}

export function parseArgs(argv) {
  const positionals = [];
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const raw = token.slice(2);
    const equals = raw.indexOf("=");
    if (equals >= 0) {
      setFlag(flags, raw.slice(0, equals), raw.slice(equals + 1));
      continue;
    }
    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith("--")) {
      setFlag(flags, raw, next);
      index += 1;
    } else {
      setFlag(flags, raw, true);
    }
  }
  return { positionals, flags };
}

function setFlag(flags, key, value) {
  if (Object.hasOwn(flags, key)) {
    flags[key] = Array.isArray(flags[key]) ? [...flags[key], value] : [flags[key], value];
  } else {
    flags[key] = value;
  }
}

export function flagList(flags, key) {
  if (!Object.hasOwn(flags, key)) return [];
  return Array.isArray(flags[key]) ? flags[key] : [flags[key]];
}

export function requiredFlag(flags, key) {
  const value = flags[key];
  if (value === undefined || value === true || String(value).trim() === "") {
    throw new WorkError(`Missing required option --${key}`, "missing_option");
  }
  return String(value);
}

export function assertAllowedFlags(flags, allowed) {
  const unknown = Object.keys(flags).filter((key) => !allowed.includes(key));
  if (unknown.length) {
    throw new WorkError(`Unknown option${unknown.length > 1 ? "s" : ""}: ${unknown.map((key) => `--${key}`).join(", ")}`, "unknown_option");
  }
}

export function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

export function pathInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function withLock(lockPath, callback) {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  let handle;
  try {
    handle = acquireLock(lockPath);
  } catch (error) {
    if (error.code === "EEXIST") {
      throw new WorkError(
        `Another tracker command is running (${lockPath}). Retry after it finishes. If that process was interrupted, remove this stale lock file.`,
        "tracker_locked",
      );
    }
    throw error;
  }
  try {
    return callback();
  } finally {
    if (handle !== undefined) fs.closeSync(handle);
    try {
      fs.unlinkSync(lockPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

function acquireLock(lockPath) {
  try {
    const handle = fs.openSync(lockPath, "wx", 0o600);
    fs.writeFileSync(handle, `${process.pid}\n`, "utf8");
    return handle;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const existingPid = Number.parseInt(fs.readFileSync(lockPath, "utf8").trim(), 10);
    if (Number.isInteger(existingPid) && existingPid > 0 && !processIsAlive(existingPid)) {
      try {
        fs.unlinkSync(lockPath);
      } catch (unlinkError) {
        if (unlinkError.code !== "ENOENT") throw unlinkError;
      }
      const handle = fs.openSync(lockPath, "wx", 0o600);
      fs.writeFileSync(handle, `${process.pid}\n`, "utf8");
      return handle;
    }
    throw error;
  }
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code !== "ESRCH";
  }
}

export function printResult(result, json) {
  if (json) {
    process.stdout.write(stableJson(result));
    return;
  }
  if (typeof result === "string") {
    process.stdout.write(result.endsWith("\n") ? result : `${result}\n`);
    return;
  }
  if (result?.text) {
    process.stdout.write(result.text.endsWith("\n") ? result.text : `${result.text}\n`);
    return;
  }
  process.stdout.write(stableJson(result));
}

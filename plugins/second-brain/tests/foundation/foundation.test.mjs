import test from "node:test";
import assert from "node:assert/strict";
import { access, lstat, mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  applyTransaction,
  captureBaseline,
  materializeTemplate,
  searchProject,
  sha256,
  validateProject,
  validationReport,
} from "../../skills/second-brain/assets/project-template/tools/memory/lib/core.mjs";
import { parseFrontmatter, parseStrictYaml } from "../../skills/second-brain/assets/project-template/tools/memory/lib/yaml.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PLUGIN = resolve(HERE, "../..");
const TEMPLATE = join(PLUGIN, "skills/second-brain/assets/project-template");

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    shell: false,
    env: options.env || process.env,
  });
}

function git(root, ...args) {
  const result = run("git", ["-C", root, ...args]);
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

async function createRepository(projectId = "test-project", name = "project with spaces") {
  const parent = await mkdtemp(join(tmpdir(), "second-brain-foundation-"));
  const root = join(parent, name);
  await materializeTemplate(TEMPLATE, root, projectId);
  git(root, "init", "-q");
  git(root, "config", "user.name", "Foundation Test");
  git(root, "config", "user.email", "foundation@example.invalid");
  git(root, "add", ".");
  git(root, "commit", "-qm", "initial project");
  return { parent, root };
}

async function withRepository(callback, projectId, name) {
  const repository = await createRepository(projectId, name);
  try {
    return await callback(repository.root, repository.parent);
  } finally {
    await rm(repository.parent, { recursive: true, force: true });
  }
}

const TYPE_PATHS = {
  requirement: "specs/product/REQ-001.md",
  decision: "memory/decisions/DEC-001.md",
  context: "memory/context/CTX-001.md",
  knowledge: "memory/knowledge/KNW-001.md",
  reference: "memory/references/REF-001.md",
  domain: "memory/domain/DOM-001.md",
  operation: "memory/operations/OPS-001.md",
};

const TYPE_IDS = {
  requirement: "REQ-001",
  decision: "DEC-001",
  context: "CTX-001",
  knowledge: "KNW-001",
  reference: "REF-001",
  domain: "DOM-001",
  operation: "OPS-001",
};

const TYPE_LIFECYCLES = {
  requirement: "active",
  decision: "accepted",
  context: "active",
  knowledge: "active",
  reference: "active",
  domain: "active",
  operation: "active",
};

function bodyFor(type, suffix = "") {
  if (type === "requirement") {
    return `# Requirement

## Behavior

The system returns a deterministic pointer ${suffix}.

## Scope

This project.

## Invariants

Git remains authoritative.

## Edge cases

An empty result is visible.

## Data preservation

Existing records remain intact.

## Acceptance scenarios

A matching query returns this record.
`;
  }
  if (type === "decision") {
    return `# Decision

## Context

The project needs deterministic behavior.

## Choice

Use Git files.

## Rationale

The source remains inspectable.

## Tradeoffs

Retrieval is deliberate.

## Consequences

No service is required.

## Evidence

Owner approval.
`;
  }
  return `# ${type[0].toUpperCase()}${type.slice(1)}

Verified durable ${type} knowledge ${suffix}.
`;
}

function record(type, overrides = {}, body = null) {
  const metadata = {
    id: TYPE_IDS[type],
    record_type: type,
    title: `${type} record`,
    lifecycle: TYPE_LIFECYCLES[type],
    freshness: "current",
    created: "2026-07-27T12:00:00Z",
    updated: "2026-07-27T12:00:00Z",
    provenance: "owner-approved test evidence",
    source_paths: ["PROJECT.md"],
    predecessors: [],
    successors: [],
    related: [],
    verification: "owner_reviewed",
    ...overrides,
  };
  const yaml = Object.entries(metadata)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n");
  return `---\n${yaml}\n---\n\n${body ?? bodyFor(type)}`;
}

async function put(root, path, content) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), content, "utf8");
}

function component(result, name) {
  return result.components.find((item) => item.name === name);
}

function approvedTransaction(baseline, writes, evidence = ["owner approval"]) {
  return {
    schema_version: 1,
    project_id: baseline.project_id,
    repository_id: baseline.repository_id,
    baseline,
    evidence,
    writes,
  };
}

function jsonSchemaValid(schema, value, documents, documentRoot = schema) {
  if (schema.$ref) {
    if (schema.$ref.startsWith("#/")) {
      const target = schema.$ref.slice(2).split("/").reduce((current, key) => current[key], documentRoot);
      return jsonSchemaValid(target, value, documents, documentRoot);
    }
    const external = documents.get(schema.$ref);
    return Boolean(external) && jsonSchemaValid(external, value, documents, external);
  }
  if (schema.allOf && !schema.allOf.every((item) => jsonSchemaValid(item, value, documents, documentRoot))) return false;
  if (schema.if && jsonSchemaValid(schema.if, value, documents, documentRoot) && !jsonSchemaValid(schema.then, value, documents, documentRoot)) return false;
  if (Object.hasOwn(schema, "const") && value !== schema.const) return false;
  if (schema.enum && !schema.enum.some((item) => Object.is(item, value))) return false;
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (types.length) {
    const matches = types.some((type) => (
      (type === "object" && value !== null && typeof value === "object" && !Array.isArray(value)) ||
      (type === "array" && Array.isArray(value)) ||
      (type === "string" && typeof value === "string") ||
      (type === "integer" && Number.isSafeInteger(value)) ||
      (type === "boolean" && typeof value === "boolean") ||
      (type === "null" && value === null)
    ));
    if (!matches) return false;
  }
  if (typeof value === "string") {
    if (schema.minLength && value.length < schema.minLength) return false;
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) return false;
    if (schema.format === "uuid" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)) return false;
    if (schema.format === "date-time" && Number.isNaN(Date.parse(value))) return false;
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) return false;
    if (schema.maximum !== undefined && value > schema.maximum) return false;
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) return false;
    if (schema.maxItems !== undefined && value.length > schema.maxItems) return false;
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) return false;
    if (schema.items && !value.every((item) => jsonSchemaValid(schema.items, item, documents, documentRoot))) return false;
    if (schema.contains && !value.some((item) => jsonSchemaValid(schema.contains, item, documents, documentRoot))) return false;
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (schema.required && !schema.required.every((key) => Object.hasOwn(value, key))) return false;
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties || {}));
      if (Object.keys(value).some((key) => !allowed.has(key))) return false;
    }
    for (const [key, childSchema] of Object.entries(schema.properties || {})) {
      if (Object.hasOwn(value, key) && !jsonSchemaValid(childSchema, value[key], documents, documentRoot)) return false;
    }
  }
  return true;
}

test("fresh project and fresh clone validate without a service or database", async () => {
  await withRepository(async (root, parent) => {
    const first = await validateProject(root);
    assert.equal(first.usable, true);
    assert.equal(component(first, "optional_index").status, "not_enabled");
    assert.equal(component(first, "external_authorities").status, "not_enabled");

    const clone = join(parent, "fresh clone with spaces");
    const cloneResult = run("git", ["clone", "-q", root, clone]);
    assert.equal(cloneResult.status, 0, cloneResult.stderr);
    const cloned = await validateProject(clone);
    assert.equal(cloned.usable, true);
    assert.equal(cloned.project_id, "test-project");
  });
});

test("human and JSON validation work from a path containing spaces", async () => {
  await withRepository(async (root) => {
    const script = join(root, "tools/memory/validate.mjs");
    const human = run(process.execPath, [script, "--root", root]);
    assert.equal(human.status, 0, human.stderr);
    assert.match(human.stdout, /Second-brain foundation health/);
    assert.match(human.stdout, /\[not_enabled\] optional_index/);

    const json = run(process.execPath, [script, "--root", root, "--json"]);
    assert.equal(json.status, 0, json.stderr);
    const parsed = JSON.parse(json.stdout);
    assert.equal(parsed.usable, true);
    assert.equal(Object.hasOwn(parsed, "records"), false);
    assert.deepEqual(parsed, validationReport(await validateProject(root)));
  });
});

test("copied memory cannot override destination repository identity", async () => {
  const source = await createRepository("source-project", "source");
  const destination = await createRepository("target-project", "target");
  try {
    await cp(join(source.root, "memory"), join(destination.root, "memory"), {
      recursive: true,
      force: true,
    });
    const validation = await validateProject(destination.root);
    assert.equal(validation.usable, false);
    assert.equal(component(validation, "project_identity").status, "failed");
    assert.match(component(validation, "project_identity").detail, /identity mismatch/);

    const search = run(process.execPath, [
      join(destination.root, "tools/memory/search.mjs"),
      "anything",
      "--root",
      destination.root,
      "--json",
    ]);
    assert.notEqual(search.status, 0);
    assert.match(search.stderr, /validation failed before retrieval/);
  } finally {
    await rm(source.parent, { recursive: true, force: true });
    await rm(destination.parent, { recursive: true, force: true });
  }
});

test("deleting the required cache control fails tracked template health without losing records", async () => {
  await withRepository(async (root) => {
    await rm(join(root, "memory/.cache"), { recursive: true, force: true });
    const validation = await validateProject(root);
    assert.equal(validation.usable, false);
    assert.equal(component(validation, "routers_and_folders").status, "failed");
    assert.equal(component(validation, "optional_index").status, "not_enabled");
    assert.equal(component(validation, "optional_index").action, "none");
    assert.equal(validation.records.length, 1);
  });
});

test("cache ignore controls must contain required rules and enforce Git ignore behavior", async (context) => {
  await context.test("valid controls ignore artifacts but retain the nested control", async () => {
    await withRepository(async (root) => {
      const artifact = run("git", ["-C", root, "check-ignore", "-q", "--no-index", "--", "memory/.cache/health.json"]);
      const control = run("git", ["-C", root, "check-ignore", "-q", "--no-index", "--", "memory/.cache/.gitignore"]);
      assert.equal(artifact.status, 0);
      assert.equal(control.status, 1);
      assert.equal((await validateProject(root)).usable, true);
    });
  });
  for (const [name, path, expected] of [
    ["root rules", ".gitignore", /\.gitignore must contain required cache rule/],
    ["nested rules", "memory/.cache/.gitignore", /memory\/\.cache\/\.gitignore must contain required cache rule/],
  ]) {
    await context.test(name, async () => {
      await withRepository(async (root) => {
        await writeFile(join(root, path), "# cache ignore rules removed\n");
        const validation = await validateProject(root);
        assert.equal(validation.usable, false);
        assert.match(component(validation, "routers_and_folders").detail, expected);
      });
    });
  }
});

test("every supported record type validates with provenance and separate freshness", async () => {
  await withRepository(async (root) => {
    for (const type of Object.keys(TYPE_PATHS)) {
      await put(root, TYPE_PATHS[type], record(type));
    }
    const validation = await validateProject(root);
    assert.equal(validation.usable, true, validation.errors.join("\n"));
    assert.equal(validation.records.length, 8);
    for (const type of Object.keys(TYPE_PATHS)) {
      const found = validation.records.find((item) => item.metadata.record_type === type);
      assert.ok(found, `missing ${type}`);
      assert.equal(found.metadata.freshness, "current");
      assert.equal(found.metadata.provenance, "owner-approved test evidence");
      assert.deepEqual(found.metadata.source_paths, ["PROJECT.md"]);
    }
  });
});

test("search is deterministic, pointer-first, index-free, and bounded", async () => {
  await withRepository(async (root) => {
    await put(root, TYPE_PATHS.requirement, record("requirement", { title: "Calendar retention" }, bodyFor("requirement", "calendar")));
    await put(root, TYPE_PATHS.knowledge, record("knowledge", { title: "Calendar implementation" }, bodyFor("knowledge", "calendar")));
    const first = await searchProject(root, "calendar");
    const second = await searchProject(root, "calendar");
    assert.deepEqual(first, second);
    assert.equal(first.index_state, "not_enabled");
    assert.ok(first.result_count <= 5);
    assert.equal(first.results[0].id, "REQ-001");
    assert.equal(Object.hasOwn(first.results[0], "body"), false);
    assert.equal(Object.hasOwn(first.results[0], "content"), false);
    assert.match(first.results[0].source_hash, /^[0-9a-f]{64}$/);
    assert.ok(first.results[0].anchors.every((anchor) => Number.isInteger(anchor.line)));

    const cli = run(process.execPath, [
      join(root, "tools/memory/search.mjs"),
      "calendar",
      "--root",
      root,
      "--json",
    ]);
    assert.equal(cli.status, 0, cli.stderr);
    assert.deepEqual(JSON.parse(cli.stdout), first);
  });
});

test("health reports every component independently with a supported next action", async () => {
  await withRepository(async (root) => {
    const validation = await validateProject(root);
    assert.deepEqual(
      validation.components.map((item) => item.name),
      [
        "git",
        "project_identity",
        "configuration_schema",
        "routers_and_folders",
        "records_and_links",
        "context_budgets",
        "secret_scan",
        "optional_index",
        "external_authorities",
      ],
    );
    for (const item of validation.components) {
      assert.ok(["ok", "not_enabled", "stale", "failed"].includes(item.status));
      assert.equal(typeof item.action, "string");
      assert.notEqual(item.action, "");
    }
  });
});

test("enabled index and a fabricated receipt always report stale until Unit 05", async () => {
  await withRepository(async (root) => {
    const configPath = join(root, "memory/config.yaml");
    const config = (await readFile(configPath, "utf8")).replace("enabled: false", "enabled: true");
    await writeFile(configPath, config);
    await writeFile(join(root, "memory/.cache/health.json"), JSON.stringify({
      schema_version: 1,
      source_commit: git(root, "rev-parse", "HEAD"),
      source_hashes: [],
      modes: ["exact"],
    }));
    const validation = await validateProject(root);
    assert.equal(validation.usable, true);
    assert.equal(validation.stale, true);
    assert.equal(component(validation, "optional_index").status, "stale");
    assert.match(component(validation, "optional_index").detail, /not available until Unit 05/);
    const search = await searchProject(root, "Current project briefing");
    assert.equal(search.index_state, "stale");

    const cli = run(process.execPath, [join(root, "tools/memory/validate.mjs"), "--root", root, "--json"]);
    assert.equal(cli.status, 2);
  });
});

test("configuration rejects malformed YAML, duplicate keys, and unknown keys", async (context) => {
  await context.test("malformed YAML", async () => {
    await withRepository(async (root) => {
      await writeFile(join(root, "memory/config.yaml"), "schema_version: [\n");
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.equal(component(validation, "project_identity").status, "failed");
    });
  });
  await context.test("duplicate key", async () => {
    await withRepository(async (root) => {
      const path = join(root, "memory/config.yaml");
      await writeFile(path, `${await readFile(path, "utf8")}schema_version: 1\n`);
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.match(component(validation, "configuration_schema").detail, /duplicate key/);
      assert.match(component(validation, "project_identity").detail, /comparison .* blocked/);
    });
  });
  await context.test("unknown key", async () => {
    await withRepository(async (root) => {
      const path = join(root, "memory/config.yaml");
      await writeFile(path, `${await readFile(path, "utf8")}unexpected: true\n`);
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.match(component(validation, "configuration_schema").detail, /unknown key/);
    });
  });
});

test("router, startup, current byte, and current line budgets fail mechanically", async (context) => {
  await context.test("router budget", async () => {
    await withRepository(async (root) => {
      const path = join(root, "memory/config.yaml");
      const config = (await readFile(path, "utf8")).replace("project_router_max_bytes: 4096", "project_router_max_bytes: 10");
      await writeFile(path, config);
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.match(component(validation, "context_budgets").detail, /project router/);
    });
  });
  await context.test("startup budget", async () => {
    await withRepository(async (root) => {
      const path = join(root, "memory/config.yaml");
      const config = (await readFile(path, "utf8"))
        .replace("project_router_max_bytes: 4096", "project_router_max_bytes: 1000")
        .replace("startup_max_bytes: 6144", "startup_max_bytes: 1000");
      await writeFile(path, config);
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.match(component(validation, "context_budgets").detail, /startup context/);
    });
  });
  await context.test("current byte budget", async () => {
    await withRepository(async (root) => {
      const path = join(root, "memory/context/current.md");
      await writeFile(path, `${await readFile(path, "utf8")}\n${"x".repeat(3200)}\n`);
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.match(component(validation, "context_budgets").detail, /current briefing is/);
    });
  });
  await context.test("current non-empty line budget", async () => {
    await withRepository(async (root) => {
      const path = join(root, "memory/context/current.md");
      await writeFile(path, `${await readFile(path, "utf8")}\n${Array.from({ length: 41 }, (_, index) => `pointer ${index}`).join("\n")}\n`);
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.match(component(validation, "context_budgets").detail, /non-empty lines/);
    });
  });
});

test("duplicate IDs and malformed records fail with nonzero JSON CLI output", async (context) => {
  await context.test("duplicate stable IDs", async () => {
    await withRepository(async (root) => {
      await put(root, "memory/knowledge/one.md", record("knowledge"));
      await put(root, "memory/knowledge/two.md", record("knowledge", { title: "duplicate" }));
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.match(component(validation, "records_and_links").detail, /duplicate id KNW-001/);
      const cli = run(process.execPath, [join(root, "tools/memory/validate.mjs"), "--root", root, "--json"]);
      assert.equal(cli.status, 1);
      assert.equal(JSON.parse(cli.stdout).usable, false);
    });
  });
  await context.test("missing frontmatter", async () => {
    await withRepository(async (root) => {
      await put(root, TYPE_PATHS.knowledge, "# Not structured\n");
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.match(component(validation, "records_and_links").detail, /must start with YAML frontmatter/);
    });
  });
  await context.test("unknown field and missing required heading", async () => {
    await withRepository(async (root) => {
      const content = record("requirement", { unknown_field: "bad" }, "# Requirement\n");
      await put(root, TYPE_PATHS.requirement, content);
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.match(component(validation, "records_and_links").detail, /unknown frontmatter field/);
      assert.match(component(validation, "records_and_links").detail, /missing required heading Behavior/);
    });
  });
});

test("invalid lifecycle and freshness values fail separately for every record type", async (context) => {
  for (const type of Object.keys(TYPE_PATHS)) {
    await context.test(`${type} lifecycle`, async () => {
      await withRepository(async (root) => {
        await put(root, TYPE_PATHS[type], record(type, { lifecycle: "stale" }));
        const validation = await validateProject(root);
        assert.equal(validation.usable, false);
        assert.match(component(validation, "records_and_links").detail, /lifecycle stale is invalid/);
      });
    });
    await context.test(`${type} freshness`, async () => {
      await withRepository(async (root) => {
        await put(root, TYPE_PATHS[type], record(type, { freshness: "active" }));
        const validation = await validateProject(root);
        assert.equal(validation.usable, false);
        assert.match(component(validation, "records_and_links").detail, /freshness active is invalid/);
      });
    });
  }
});

test("timestamps, provenance, source paths, and verification are strict", async (context) => {
  const cases = [
    ["timestamp", { updated: "yesterday" }, /ISO 8601/],
    ["timestamp order", { created: "2026-07-28T00:00:00Z" }, /precedes created/],
    ["provenance", { provenance: "" }, /provenance must be non-empty/],
    ["source path", { source_paths: ["../foreign"] }, /path escapes/],
    ["verification", { verification: "probably" }, /verification probably is invalid/],
  ];
  for (const [name, override, expected] of cases) {
    await context.test(name, async () => {
      await withRepository(async (root) => {
        await put(root, TYPE_PATHS.knowledge, record("knowledge", override));
        const validation = await validateProject(root);
        assert.equal(validation.usable, false);
        assert.match(component(validation, "records_and_links").detail, expected);
      });
    });
  }
});

test("broken predecessor, successor, and related links fail", async (context) => {
  for (const [field, expected] of [
    ["predecessors", /predecessor KNW-404 does not exist/],
    ["successors", /successor KNW-404 does not exist/],
    ["related", /related record KNW-404 does not exist/],
  ]) {
    await context.test(field, async () => {
      await withRepository(async (root) => {
        const overrides = { [field]: ["KNW-404"] };
        if (field === "successors") overrides.lifecycle = "superseded";
        await put(root, TYPE_PATHS.knowledge, record("knowledge", overrides));
        const validation = await validateProject(root);
        assert.equal(validation.usable, false);
        assert.match(component(validation, "records_and_links").detail, expected);
      });
    });
  }
});

test("lifecycle links require bidirectionality and reject cycles", async (context) => {
  await context.test("missing backlink", async () => {
    await withRepository(async (root) => {
      await put(root, "memory/knowledge/old.md", record("knowledge", {
        id: "KNW-OLD",
        lifecycle: "superseded",
        successors: ["KNW-NEW"],
      }));
      await put(root, "memory/knowledge/new.md", record("knowledge", { id: "KNW-NEW" }));
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.match(component(validation, "records_and_links").detail, /does not link back/);
    });
  });
  await context.test("cycle", async () => {
    await withRepository(async (root) => {
      await put(root, "memory/knowledge/a.md", record("knowledge", {
        id: "KNW-A",
        lifecycle: "superseded",
        predecessors: ["KNW-B"],
        successors: ["KNW-B"],
      }));
      await put(root, "memory/knowledge/b.md", record("knowledge", {
        id: "KNW-B",
        lifecycle: "superseded",
        predecessors: ["KNW-A"],
        successors: ["KNW-A"],
      }));
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.match(component(validation, "records_and_links").detail, /lifecycle cycle detected/);
    });
  });
});

test("a reversal cannot leave active predecessor/successor truth or competing active successors", async (context) => {
  await context.test("active predecessor and successor", async () => {
    await withRepository(async (root) => {
      await put(root, "specs/product/old.md", record("requirement", {
        id: "REQ-OLD",
        successors: ["REQ-NEW"],
      }));
      await put(root, "specs/product/new.md", record("requirement", {
        id: "REQ-NEW",
        predecessors: ["REQ-OLD"],
      }));
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.match(component(validation, "records_and_links").detail, /cannot both be current/);
    });
  });
  await context.test("competing active successors", async () => {
    await withRepository(async (root) => {
      await put(root, "specs/product/old.md", record("requirement", {
        id: "REQ-OLD",
        lifecycle: "superseded",
        successors: ["REQ-NEW-A", "REQ-NEW-B"],
      }));
      await put(root, "specs/product/new-a.md", record("requirement", {
        id: "REQ-NEW-A",
        predecessors: ["REQ-OLD"],
      }));
      await put(root, "specs/product/new-b.md", record("requirement", {
        id: "REQ-NEW-B",
        predecessors: ["REQ-OLD"],
      }));
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.match(component(validation, "records_and_links").detail, /competing current successors/);
    });
  });
});

test("a second repository memory configuration fails identity health", async () => {
  await withRepository(async (root) => {
    await put(root, "nested/memory/config.yaml", await readFile(join(root, "memory/config.yaml"), "utf8"));
    const validation = await validateProject(root);
    assert.equal(validation.usable, false);
    assert.equal(component(validation, "project_identity").status, "failed");
    assert.match(component(validation, "project_identity").detail, /exactly one repository memory configuration/);
  });
});

test("task retrieval budget fails visibly instead of returning a false empty result", async () => {
  await withRepository(async (root) => {
    await put(root, TYPE_PATHS.knowledge, record("knowledge", { title: "Budget marker" }));
    const path = join(root, "memory/config.yaml");
    const config = (await readFile(path, "utf8")).replace("task_retrieval_max_bytes: 16384", "task_retrieval_max_bytes: 10");
    await writeFile(path, config);
    await assert.rejects(searchProject(root, "Budget marker"), /budget is too small/);
    const cli = run(process.execPath, [
      join(root, "tools/memory/search.mjs"),
      "Budget marker",
      "--root",
      root,
      "--json",
    ]);
    assert.equal(cli.status, 1);
    assert.match(JSON.parse(cli.stderr).error, /budget is too small/);
  });
});

const secretCases = [
  ["PROJECT.md", null],
  ["memory/config.yaml", null],
  ...Object.entries(TYPE_PATHS),
];

for (const [label, maybePath] of secretCases) {
  const path = maybePath || label;
  test(`secret-like content fails in ${path}`, async () => {
    await withRepository(async (root) => {
      if (path === "PROJECT.md") {
        const fakeValue = ["api_key: ", "ABCDEFGHIJKLMNOPQRST"].join("");
        await writeFile(join(root, path), `${await readFile(join(root, path), "utf8")}\n${fakeValue}\n`);
      } else if (path === "memory/config.yaml") {
        const fakeValue = ["password", "ABCDEFGHIJKLMNOPQRST"].join("=");
        const content = (await readFile(join(root, path), "utf8")).replace(
          "external_authorities: []",
          `external_authorities: ["${fakeValue}"]`,
        );
        await writeFile(join(root, path), content);
      } else {
        const type = label;
        const fakeValue = ["password", "ABCDEFGHIJKLMNOPQRST"].join("=");
        await put(root, path, record(type, {}, `${bodyFor(type)}\n${fakeValue}\n`));
      }
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.equal(component(validation, "secret_scan").status, "failed");
      assert.match(component(validation, "secret_scan").detail, /secret-like assigned_secret content/);
    });
  });
}

test("private keys, cloud tokens, GitHub tokens, Slack tokens, and JWTs are recognized", async (context) => {
  const values = [
    ["private key", ["-----BEGIN", "PRIVATE KEY-----"].join(" "), /private_key/],
    ["AWS key", ["AKIA", "ABCDEFGHIJKLMNOP"].join(""), /aws_access_key/],
    ["GitHub token", ["ghp_", "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456"].join(""), /github_token/],
    ["Slack token", ["xoxb-", "123456789012-abcdefghijklmnop"].join(""), /slack_token/],
    ["JWT", ["eyJabcdefghijk", "abcdefghijklmnop", "abcdefghijklmnop"].join("."), /jwt/],
  ];
  for (const [name, value, expected] of values) {
    await context.test(name, async () => {
      await withRepository(async (root) => {
        await put(root, TYPE_PATHS.knowledge, record("knowledge", {}, `${bodyFor("knowledge")}\n${value}\n`));
        const validation = await validateProject(root);
        assert.equal(validation.usable, false);
        assert.match(component(validation, "secret_scan").detail, expected);
      });
    });
  }
});

test("record content is parsed as data and is never executed", async () => {
  await withRepository(async (root) => {
    const sentinel = join(root, "should-not-exist");
    const hostile = `$(touch should-not-exist); require("node:fs").writeFileSync("should-not-exist", "bad")`;
    await put(root, TYPE_PATHS.knowledge, record("knowledge", { title: "Hostile text marker" }, `${bodyFor("knowledge")}\n${hostile}\n`));
    const validation = await validateProject(root);
    assert.equal(validation.usable, true, validation.errors.join("\n"));
    const result = await searchProject(root, "Hostile text marker");
    assert.equal(result.result_count, 1);
    await assert.rejects(readFile(sentinel), /ENOENT/);
  });
});

test("candidate validation makes a failed multi-file write atomic", async () => {
  await withRepository(async (root) => {
    const validPath = "memory/knowledge/KNW-ATOMIC.md";
    const invalidPath = "memory/references/REF-ATOMIC.md";
    const baseline = await captureBaseline(root, [validPath, invalidPath]);
    const transaction = {
      schema_version: 1,
      project_id: "test-project",
      repository_id: baseline.repository_id,
      baseline,
      evidence: ["owner approved atomic fixture"],
      writes: [
        {
          path: validPath,
          content: record("knowledge", { id: "KNW-ATOMIC", title: "Atomic valid record" }),
        },
        {
          path: invalidPath,
          content: "# missing strict frontmatter\n",
        },
      ],
    };
    await assert.rejects(applyTransaction(root, transaction), /candidate transaction failed validation/);
    await assert.rejects(readFile(join(root, validPath)), /ENOENT/);
    await assert.rejects(readFile(join(root, invalidPath)), /ENOENT/);
    assert.equal((await validateProject(root)).usable, true);
  });
});

test("baseline conflicts stop approved writes before any file changes", async () => {
  await withRepository(async (root) => {
    const firstPath = "memory/knowledge/KNW-CONFLICT.md";
    const secondPath = "memory/references/REF-CONFLICT.md";
    const baseline = await captureBaseline(root, [firstPath, secondPath]);
    await put(root, firstPath, record("knowledge", { id: "KNW-CONFLICT", title: "Concurrent content" }));
    const transaction = {
      schema_version: 1,
      project_id: "test-project",
      repository_id: baseline.repository_id,
      baseline,
      evidence: ["owner approval"],
      writes: [
        { path: firstPath, content: record("knowledge", { id: "KNW-CONFLICT", title: "Planned content" }) },
        { path: secondPath, content: record("reference", { id: "REF-CONFLICT" }) },
      ],
    };
    await assert.rejects(applyTransaction(root, transaction), /baseline conflict/);
    assert.match(await readFile(join(root, firstPath), "utf8"), /Concurrent content/);
    await assert.rejects(readFile(join(root, secondPath)), /ENOENT/);
  });
});

test("receipt exactly matches explicit in-scope changes in a dirty tree", async () => {
  await withRepository(async (root) => {
    const requirementPath = "specs/product/REQ-RECEIPT.md";
    const knowledgePath = "memory/knowledge/KNW-RECEIPT.md";
    const baseline = await captureBaseline(root, [knowledgePath, requirementPath]);
    await writeFile(join(root, "unrelated dirty file.txt"), "do not include me\n");
    await writeFile(join(root, "PROJECT.md"), `${await readFile(join(root, "PROJECT.md"), "utf8")}\nUnrelated dirty router edit.\n`);

    const transaction = {
      schema_version: 1,
      project_id: "test-project",
      repository_id: baseline.repository_id,
      baseline,
      evidence: ["owner-approved behavior", "repository test evidence"],
      writes: [
        {
          path: requirementPath,
          content: record("requirement", { id: "REQ-RECEIPT", title: "Receipt behavior" }),
        },
        {
          path: knowledgePath,
          content: record("knowledge", { id: "KNW-RECEIPT", title: "Receipt knowledge" }),
        },
      ],
    };
    const receipt = await applyTransaction(root, transaction);
    assert.deepEqual(receipt.in_scope_paths, [knowledgePath, requirementPath]);
    assert.deepEqual(receipt.changed_paths, [knowledgePath, requirementPath]);
    assert.equal(receipt.changes.length, 2);
    assert.deepEqual(receipt.changes.map((item) => item.action), ["created", "created"]);
    assert.deepEqual(receipt.changes.map((item) => item.before_sha256), [null, null]);
    assert.deepEqual(receipt.changes.map((item) => item.after_record.id), ["KNW-RECEIPT", "REQ-RECEIPT"]);
    assert.deepEqual(receipt.evidence, transaction.evidence);
    assert.deepEqual(receipt.validation, { usable: true, failed_components: [] });
    assert.equal(receipt.index_state, "not_enabled");
    assert.equal(receipt.commit, null);
    assert.equal(receipt.baseline_head, git(root, "rev-parse", "HEAD"));
    assert.equal(receipt.changed_paths.includes("PROJECT.md"), false);
    assert.equal(receipt.changed_paths.includes("unrelated dirty file.txt"), false);
    assert.equal(await readFile(join(root, "unrelated dirty file.txt"), "utf8"), "do not include me\n");
    assert.match(await readFile(join(root, "PROJECT.md"), "utf8"), /Unrelated dirty router edit/);
  });
});

test("receipt distinguishes corrected, superseded, and created records with before and after states", async () => {
  await withRepository(async (root) => {
    const knowledgePath = "memory/knowledge/KNW-CHANGE.md";
    const oldPath = "specs/product/REQ-OLD.md";
    const newPath = "specs/product/REQ-NEW.md";
    await put(root, knowledgePath, record("knowledge", { id: "KNW-CHANGE", title: "Incorrect title" }));
    await put(root, oldPath, record("requirement", { id: "REQ-OLD", title: "Old behavior" }));
    const baseline = await captureBaseline(root, [knowledgePath, oldPath, newPath]);
    const receipt = await applyTransaction(root, {
      schema_version: 1,
      project_id: "test-project",
      repository_id: baseline.repository_id,
      baseline,
      evidence: ["owner-approved correction and reversal"],
      writes: [
        {
          path: knowledgePath,
          change_kind: "corrected",
          content: record("knowledge", { id: "KNW-CHANGE", title: "Correct title", updated: "2026-07-27T13:00:00Z" }),
        },
        {
          path: oldPath,
          change_kind: "superseded",
          content: record("requirement", {
            id: "REQ-OLD",
            title: "Old behavior",
            lifecycle: "superseded",
            successors: ["REQ-NEW"],
            updated: "2026-07-27T13:00:00Z",
          }),
        },
        {
          path: newPath,
          change_kind: "created",
          content: record("requirement", {
            id: "REQ-NEW",
            title: "New behavior",
            predecessors: ["REQ-OLD"],
          }),
        },
      ],
    });
    const byPath = new Map(receipt.changes.map((item) => [item.path, item]));
    assert.equal(byPath.get(knowledgePath).action, "corrected");
    assert.equal(byPath.get(knowledgePath).before_record.id, "KNW-CHANGE");
    assert.equal(byPath.get(knowledgePath).after_record.id, "KNW-CHANGE");
    assert.equal(byPath.get(oldPath).action, "superseded");
    assert.equal(byPath.get(oldPath).before_record.lifecycle, "active");
    assert.equal(byPath.get(oldPath).after_record.lifecycle, "superseded");
    assert.equal(byPath.get(newPath).action, "created");
    assert.equal(byPath.get(newPath).before_record, null);
    assert.equal(byPath.get(newPath).after_record.lifecycle, "active");
  });
});

test("write CLI returns structured JSON and rejects empty or out-of-scope writes", async (context) => {
  await context.test("successful JSON receipt", async () => {
    await withRepository(async (root) => {
      const path = "memory/domain/DOM-WRITE.md";
      const transactionPath = join(root, "transaction.json");
      const baseline = await captureBaseline(root, [path]);
      await writeFile(transactionPath, JSON.stringify({
        schema_version: 1,
        project_id: "test-project",
        repository_id: baseline.repository_id,
        baseline,
        evidence: ["owner approval"],
        writes: [{ path, content: record("domain", { id: "DOM-WRITE" }) }],
      }));
      const result = run(process.execPath, [
        join(root, "tools/memory/write.mjs"),
        transactionPath,
        "--root",
        root,
      ]);
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(JSON.parse(result.stdout).changed_paths, [path]);
    });
  });
  await context.test("empty write", async () => {
    await withRepository(async (root) => {
      const baseline = await captureBaseline(root, ["memory/knowledge/KNW-NOOP.md"]);
      const transaction = {
        schema_version: 1,
        project_id: "test-project",
        repository_id: baseline.repository_id,
        baseline,
        evidence: [],
        writes: [],
      };
      await assert.rejects(applyTransaction(root, transaction), /contains no writes/);
      assert.equal(git(root, "status", "--porcelain"), "");
    });
  });
  await context.test("out-of-scope write", async () => {
    await withRepository(async (root) => {
      const baseline = await captureBaseline(root, ["package.json"]);
      const transaction = {
        schema_version: 1,
        project_id: "test-project",
        repository_id: baseline.repository_id,
        baseline,
        evidence: ["owner approval"],
        writes: [{ path: "package.json", content: "{}\n" }],
      };
      await assert.rejects(applyTransaction(root, transaction), /outside knowledge roots/);
      await assert.rejects(readFile(join(root, "package.json")), /ENOENT/);
    });
  });
});

test("skipped or unapproved proposals leave the repository unchanged", async () => {
  await withRepository(async (root) => {
    const before = git(root, "status", "--porcelain");
    const baseline = await captureBaseline(root, ["memory/knowledge/KNW-SKIP.md"]);
    assert.equal(baseline.paths["memory/knowledge/KNW-SKIP.md"].exists, false);
    assert.equal(git(root, "status", "--porcelain"), before);
    await assert.rejects(readFile(join(root, "memory/knowledge/KNW-SKIP.md")), /ENOENT/);
  });
});

test("all distributed JSON schemas parse and cover every record type and write contract", async () => {
  const schemaRoot = join(TEMPLATE, "tools/memory/schemas");
  const expected = [
    "config.schema.json",
    "context.schema.json",
    "decision.schema.json",
    "domain.schema.json",
    "knowledge.schema.json",
    "operation.schema.json",
    "project-identity.schema.json",
    "record-common.schema.json",
    "reference.schema.json",
    "requirement.schema.json",
    "transaction.schema.json",
    "write-baseline.schema.json",
    "write-receipt.schema.json",
  ];
  for (const name of expected) {
    const parsed = JSON.parse(await readFile(join(schemaRoot, name), "utf8"));
    assert.equal(parsed.$schema, "https://json-schema.org/draft/2020-12/schema");
  }
});

test("JSON schema contracts accept valid fixtures and reject invalid fixtures", async () => {
  await withRepository(async (root) => {
    const schemaRoot = join(root, "tools/memory/schemas");
    const names = [
      "config", "context", "decision", "domain", "knowledge", "operation", "project-identity",
      "record-common", "reference", "requirement", "transaction", "write-baseline", "write-receipt",
    ];
    const documents = new Map();
    for (const name of names) {
      documents.set(`${name}.schema.json`, JSON.parse(await readFile(join(schemaRoot, `${name}.schema.json`), "utf8")));
    }

    const marker = JSON.parse(await readFile(join(root, ".second-brain-project.json"), "utf8"));
    const config = parseStrictYaml(await readFile(join(root, "memory/config.yaml"), "utf8"));
    assert.equal(jsonSchemaValid(documents.get("project-identity.schema.json"), marker, documents), true);
    assert.equal(jsonSchemaValid(documents.get("project-identity.schema.json"), { ...marker, repository_id: "not-a-uuid" }, documents), false);
    assert.equal(jsonSchemaValid(documents.get("config.schema.json"), config, documents), true);
    assert.equal(jsonSchemaValid(documents.get("config.schema.json"), { ...config, unknown: true }, documents), false);
    const { repository_id: omittedRepositoryId, ...missingRepositoryConfig } = config;
    assert.ok(omittedRepositoryId);
    assert.equal(jsonSchemaValid(documents.get("config.schema.json"), missingRepositoryConfig, documents), false);

    for (const type of Object.keys(TYPE_PATHS)) {
      const metadata = parseFrontmatter(record(type), type).metadata;
      const schema = documents.get(`${type}.schema.json`);
      assert.equal(jsonSchemaValid(schema, metadata, documents), true, `${type} valid fixture failed`);
      assert.equal(jsonSchemaValid(schema, { ...metadata, lifecycle: "unknown" }, documents), false, `${type} invalid lifecycle passed`);
      if (TYPE_LIFECYCLES[type] === "active" || TYPE_LIFECYCLES[type] === "accepted") {
        assert.equal(jsonSchemaValid(schema, { ...metadata, freshness: "stale" }, documents), false, `${type} stale current fixture passed`);
      }
      if (type === "requirement" || type === "decision") {
        assert.equal(jsonSchemaValid(schema, { ...metadata, verification: "verified" }, documents), false, `${type} generic verified authority passed`);
        assert.equal(
          jsonSchemaValid(schema, { ...metadata, verification: "repository_evidence" }, documents),
          false,
          `${type} internal repository evidence passed`,
        );
        assert.equal(
          jsonSchemaValid(schema, {
            ...metadata,
            verification: "repository_evidence",
            source_paths: ["src/authority.js"],
          }, documents),
          true,
          `${type} independent repository evidence failed`,
        );
      }
    }

    const path = "memory/knowledge/KNW-SCHEMA.md";
    const baseline = await captureBaseline(root, [path]);
    const transaction = approvedTransaction(baseline, [
      { path, change_kind: "created", content: record("knowledge", { id: "KNW-SCHEMA" }) },
    ]);
    assert.equal(jsonSchemaValid(documents.get("write-baseline.schema.json"), baseline, documents), true);
    assert.equal(jsonSchemaValid(documents.get("transaction.schema.json"), transaction, documents), true);
    assert.equal(jsonSchemaValid(documents.get("transaction.schema.json"), { ...transaction, repository_id: "wrong" }, documents), false);
    const receipt = await applyTransaction(root, transaction);
    assert.equal(jsonSchemaValid(documents.get("write-receipt.schema.json"), receipt, documents), true);
    assert.equal(jsonSchemaValid(documents.get("write-receipt.schema.json"), { ...receipt, extra: true }, documents), false);
  });
});

test("foundation core has no network, database, v1, or content-execution dependency", async () => {
  const files = [
    join(TEMPLATE, "tools/memory/lib/core.mjs"),
    join(TEMPLATE, "tools/memory/lib/yaml.mjs"),
    join(TEMPLATE, "tools/memory/lib/schemas.mjs"),
    join(TEMPLATE, "tools/memory/validate.mjs"),
    join(TEMPLATE, "tools/memory/search.mjs"),
    join(TEMPLATE, "tools/memory/baseline.mjs"),
    join(TEMPLATE, "tools/memory/write.mjs"),
  ];
  const combined = (await Promise.all(files.map((path) => readFile(path, "utf8")))).join("\n");
  assert.doesNotMatch(combined, /node:(?:http|https|net|tls|dgram)/);
  assert.doesNotMatch(combined, /\bfetch\s*\(/);
  assert.doesNotMatch(combined, /from\s+["'](?:pg|postgres|sqlite|better-sqlite3|@neondatabase|wrangler)/i);
  assert.doesNotMatch(combined, /\b(?:eval|Function)\s*\(/);
  assert.doesNotMatch(combined, /shell:\s*true/);
});

test("materializer replaces identity placeholders and emits a self-contained deterministic core", async () => {
  const parent = await mkdtemp(join(tmpdir(), "foundation-materialize-"));
  try {
    const root = join(parent, "materialized project");
    const script = join(PLUGIN, "skills/second-brain/scripts/foundation/materialize.mjs");
    const result = run(process.execPath, [
      script,
      "--destination",
      root,
      "--project-id",
      "materialized-project",
    ]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).project_id, "materialized-project");
    assert.doesNotMatch(await readFile(join(root, ".second-brain-project.json"), "utf8"), /__PROJECT_ID__/);
    assert.doesNotMatch(await readFile(join(root, "memory/config.yaml"), "utf8"), /__PROJECT_ID__/);
    for (const scriptName of ["validate.mjs", "search.mjs", "baseline.mjs", "write.mjs"]) {
      assert.match(await readFile(join(root, "tools/memory", scriptName), "utf8"), /^#!\/usr\/bin\/env node/);
    }
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("hashes and baseline path ordering are deterministic", async () => {
  await withRepository(async (root) => {
    assert.equal(sha256("same"), sha256("same"));
    const baseline = await captureBaseline(root, [
      "memory/knowledge/Z.md",
      "memory/knowledge/A.md",
    ]);
    assert.deepEqual(Object.keys(baseline.paths), ["memory/knowledge/A.md", "memory/knowledge/Z.md"]);
    await assert.rejects(
      captureBaseline(root, ["memory/knowledge/Z.md", "memory/knowledge/z.md"]),
      /path collision/,
    );
  });
});

test("repository UUID distinguishes independent repositories with the same project ID", async () => {
  const first = await createRepository("shared-project", "first");
  const second = await createRepository("shared-project", "second");
  try {
    const firstMarker = JSON.parse(await readFile(join(first.root, ".second-brain-project.json"), "utf8"));
    const secondMarker = JSON.parse(await readFile(join(second.root, ".second-brain-project.json"), "utf8"));
    assert.equal(firstMarker.project_id, secondMarker.project_id);
    assert.notEqual(firstMarker.repository_id, secondMarker.repository_id);
    assert.match(firstMarker.repository_id, /^[0-9a-f-]{36}$/);

    const path = "memory/knowledge/KNW-REPO.md";
    const baseline = await captureBaseline(first.root, [path]);
    const transaction = approvedTransaction(baseline, [
      { path, content: record("knowledge", { id: "KNW-REPO" }) },
    ]);
    transaction.repository_id = secondMarker.repository_id;
    await assert.rejects(applyTransaction(first.root, transaction), /repository_id does not match/);
    await assert.rejects(readFile(join(first.root, path)), /ENOENT/);
  } finally {
    await rm(first.parent, { recursive: true, force: true });
    await rm(second.parent, { recursive: true, force: true });
  }
});

test("repository UUID cannot be rotated by editing marker and config together", async () => {
  await withRepository(async (root) => {
    const replacement = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const markerPath = join(root, ".second-brain-project.json");
    const configPath = join(root, "memory/config.yaml");
    const marker = JSON.parse(await readFile(markerPath, "utf8"));
    marker.repository_id = replacement;
    await writeFile(markerPath, `${JSON.stringify(marker, null, 2)}\n`);
    await writeFile(
      configPath,
      (await readFile(configPath, "utf8")).replace(/repository_id: "[^"]+"/, `repository_id: "${replacement}"`),
    );
    const validation = await validateProject(root);
    assert.equal(validation.usable, false);
    assert.match(component(validation, "project_identity").detail, /repository_id is immutable/);
  });
});

test("baseline HEAD must equal destination HEAD even when scoped files are unchanged", async () => {
  await withRepository(async (root) => {
    const path = "memory/knowledge/KNW-HEAD.md";
    const baseline = await captureBaseline(root, [path]);
    await writeFile(join(root, "unrelated.txt"), "new commit\n");
    git(root, "add", "unrelated.txt");
    git(root, "commit", "-qm", "advance head");
    await assert.rejects(
      applyTransaction(root, approvedTransaction(baseline, [
        { path, content: record("knowledge", { id: "KNW-HEAD" }) },
      ])),
      /baseline HEAD does not match/,
    );
    await assert.rejects(readFile(join(root, path)), /ENOENT/);
  });
});

test("noncanonical path aliases and case-fold collisions are rejected", async () => {
  await withRepository(async (root) => {
    for (const badPath of [
      "memory//knowledge/A.md",
      "memory/./knowledge/A.md",
      "memory\\knowledge\\A.md",
      "memory/knowledge/e\u0301.md",
    ]) {
      await assert.rejects(captureBaseline(root, [badPath]), /noncanonical|POSIX|NFC/);
    }
    await assert.rejects(
      captureBaseline(root, ["memory/knowledge/Case.md", "memory/knowledge/case.md"]),
      /path collision/,
    );
    const baseline = await captureBaseline(root, [
      "memory/knowledge/Case.md",
      "memory/knowledge/Other.md",
    ]);
    const transaction = approvedTransaction(baseline, [
      { path: "memory/knowledge/Case.md", content: record("knowledge", { id: "KNW-CASE" }) },
      { path: "memory/knowledge/case.md", content: record("knowledge", { id: "KNW-CASE-LOWER" }) },
    ]);
    await assert.rejects(applyTransaction(root, transaction), /path collision/);
  });
});

test("repository paths reject Windows-incompatible names on every host OS", async () => {
  await withRepository(async (root) => {
    await assert.rejects(
      captureBaseline(root, ["memory/knowledge/control\u0001name.md"]),
      /control character/,
    );
    for (const character of '<>:"|?*') {
      await assert.rejects(
        captureBaseline(root, [`memory/knowledge/bad${character}name.md`]),
        /Windows-forbidden character/,
      );
    }
    for (const path of [
      "memory/knowledge/trailing.",
      "memory/knowledge/trailing ",
    ]) {
      await assert.rejects(captureBaseline(root, [path]), /trailing dot or space/);
    }
    const reserved = [
      "CON", "PRN", "AUX", "NUL",
      ...Array.from({ length: 9 }, (_, index) => `COM${index + 1}`),
      ...Array.from({ length: 9 }, (_, index) => `LPT${index + 1}`),
      "con.txt",
    ];
    for (const basename of reserved) {
      await assert.rejects(
        captureBaseline(root, [`memory/knowledge/${basename}`]),
        /reserved Windows device basename/,
      );
    }
  });
});

test("symlink targets and ancestors fail before read or write escape", async () => {
  await withRepository(async (root, parent) => {
    const outside = join(parent, "outside");
    await mkdir(outside);
    await writeFile(join(outside, "outside.md"), record("knowledge", { id: "KNW-OUTSIDE" }));
    await symlink(join(outside, "outside.md"), join(root, "memory/knowledge/escape.md"));
    const validation = await validateProject(root);
    assert.equal(validation.usable, false);
    assert.match(component(validation, "records_and_links").detail, /symbolic links/);
    await assert.rejects(searchProject(root, "outside"), /validation failed/);
    await rm(join(root, "memory/knowledge/escape.md"));

    const writePath = "memory/knowledge/link/KNW-WRITE.md";
    const baseline = await captureBaseline(root, [writePath]);
    await symlink(outside, join(root, "memory/knowledge/link"));
    await assert.rejects(
      applyTransaction(root, approvedTransaction(baseline, [
        { path: writePath, content: record("knowledge", { id: "KNW-WRITE" }) },
      ])),
      /symbolic links|invalid project/,
    );
    await assert.rejects(readFile(join(outside, "KNW-WRITE.md")), /ENOENT/);
  });
});

test("fresh clone includes and tracks the complete deterministic template", async () => {
  await withRepository(async (root, parent) => {
    const clone = join(parent, "tracked clone");
    assert.equal(run("git", ["clone", "-q", root, clone]).status, 0);
    const expected = [
      ".gitignore",
      ".second-brain-project.json",
      "AGENTS.md",
      "CLAUDE.md",
      "PROJECT.md",
      "specs/README.md",
      "memory/README.md",
      "memory/config.yaml",
      "memory/context/current.md",
      "memory/.cache/.gitignore",
      ...["decisions", "knowledge", "references", "domain", "operations"].map((folder) => `memory/${folder}/.gitkeep`),
      ...["validate.mjs", "search.mjs", "baseline.mjs", "write.mjs"].map((name) => `tools/memory/${name}`),
      ...["core.mjs", "schemas.mjs", "yaml.mjs"].map((name) => `tools/memory/lib/${name}`),
      ...[
        "config", "context", "decision", "domain", "knowledge", "operation", "project-identity",
        "record-common", "reference", "requirement", "transaction", "write-baseline", "write-receipt",
      ].map((name) => `tools/memory/schemas/${name}.schema.json`),
    ];
    const tracked = new Set(git(clone, "ls-files").split("\n"));
    for (const path of expected) {
      await access(join(clone, path));
      assert.equal(tracked.has(path), true, `${path} is not tracked`);
    }
    const validation = await validateProject(clone);
    assert.equal(validation.usable, true, validation.errors.join("\n"));
  });
});

test("deleting a required tool, schema, router, or empty-folder control fails health", async (context) => {
  for (const path of [
    "AGENTS.md",
    "CLAUDE.md",
    "PROJECT.md",
    "tools/memory/validate.mjs",
    "tools/memory/lib/core.mjs",
    "tools/memory/schemas/requirement.schema.json",
    "memory/knowledge/.gitkeep",
    "memory/.cache/.gitignore",
  ]) {
    await context.test(path, async () => {
      await withRepository(async (root) => {
        await rm(join(root, path));
        const validation = await validateProject(root);
        assert.equal(validation.usable, false);
        assert.match(component(validation, "routers_and_folders").detail, /missing|ENOENT/);
      });
    });
  }
});

test("Claude and Codex adapters route to the same canonical PROJECT paths", async () => {
  await withRepository(async (root) => {
    const agents = await readFile(join(root, "AGENTS.md"), "utf8");
    const claude = await readFile(join(root, "CLAUDE.md"), "utf8");
    assert.match(agents, /Read `PROJECT\.md` as the canonical project router/);
    assert.match(claude, /Read `PROJECT\.md` as the canonical project router/);
    assert.equal(agents.replace("Codex", "PLATFORM"), claude.replace("Claude", "PLATFORM"));
  });
});

test("current authority requires current freshness, trusted verification, and non-inference provenance", async (context) => {
  const cases = [
    ["stale freshness", { freshness: "stale" }, /require freshness current/],
    ["unverified freshness", { freshness: "unverified" }, /require freshness current/],
    ["unverified verification", { verification: "unverified" }, /cannot use unverified verification/],
    ["stale verification", { verification: "stale" }, /cannot use stale verification/],
    ["weak requirement verification", { verification: "not_applicable" }, /allow only owner_reviewed or repository_evidence/],
    ["agent guess", { provenance: "agent guess from conversation" }, /cannot be current authority/],
    ["model inference", { provenance: "model inference" }, /cannot be current authority/],
  ];
  for (const [name, overrides, expected] of cases) {
    await context.test(name, async () => {
      await withRepository(async (root) => {
        await put(root, TYPE_PATHS.requirement, record("requirement", overrides));
        const validation = await validateProject(root);
        assert.equal(validation.usable, false);
        assert.match(component(validation, "records_and_links").detail, expected);
      });
    });
  }
});

test("active requirements and accepted decisions accept only reviewed or independent repository evidence", async (context) => {
  for (const type of ["requirement", "decision"]) {
    await context.test(`${type} rejects generic verified authority`, async () => {
      await withRepository(async (root) => {
        await put(root, TYPE_PATHS[type], record(type, { verification: "verified" }));
        const validation = await validateProject(root);
        assert.equal(validation.usable, false);
        assert.match(
          component(validation, "records_and_links").detail,
          /allow only owner_reviewed or repository_evidence/,
        );
      });
    });
    await context.test(`${type} rejects internal memory as repository evidence`, async () => {
      await withRepository(async (root) => {
        await put(root, TYPE_PATHS[type], record(type, {
          verification: "repository_evidence",
          source_paths: ["PROJECT.md"],
        }));
        const validation = await validateProject(root);
        assert.equal(validation.usable, false);
        assert.match(
          component(validation, "records_and_links").detail,
          /repository_evidence requires an existing regular non-symlink source outside/,
        );
      });
    });
    await context.test(`${type} accepts independent repository evidence`, async () => {
      await withRepository(async (root) => {
        await put(root, "src/authority.js", "export const authority = true;\n");
        await put(root, TYPE_PATHS[type], record(type, {
          verification: "repository_evidence",
          source_paths: ["src/authority.js"],
        }));
        const validation = await validateProject(root);
        assert.equal(validation.usable, true, validation.errors.join("\n"));
      });
    });
  }
});

test("source paths must exist as local regular non-symlink files, including transaction overlays", async (context) => {
  await context.test("missing source", async () => {
    await withRepository(async (root) => {
      await put(root, TYPE_PATHS.knowledge, record("knowledge", { source_paths: ["missing.txt"] }));
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.match(component(validation, "records_and_links").detail, /source path missing\.txt/);
    });
  });
  await context.test("directory source", async () => {
    await withRepository(async (root) => {
      await put(root, TYPE_PATHS.knowledge, record("knowledge", { source_paths: ["specs"] }));
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.match(component(validation, "records_and_links").detail, /regular non-symlink file/);
    });
  });
  await context.test("overlay source", async () => {
    await withRepository(async (root) => {
      const knowledgePath = "memory/knowledge/KNW-OVERLAY.md";
      const referencePath = "memory/references/REF-OVERLAY.md";
      const baseline = await captureBaseline(root, [knowledgePath, referencePath]);
      const receipt = await applyTransaction(root, approvedTransaction(baseline, [
        {
          path: knowledgePath,
          content: record("knowledge", { id: "KNW-OVERLAY", source_paths: [referencePath] }),
        },
        {
          path: referencePath,
          content: record("reference", { id: "REF-OVERLAY", source_paths: ["PROJECT.md"] }),
        },
      ]));
      assert.deepEqual(receipt.changed_paths, [knowledgePath, referencePath]);
    });
  });
});

test("source evidence rejects exact self-reference and record dependency cycles", async (context) => {
  await context.test("exact self evidence", async () => {
    await withRepository(async (root) => {
      await put(root, TYPE_PATHS.knowledge, record("knowledge", {
        source_paths: [TYPE_PATHS.knowledge],
      }));
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.match(component(validation, "records_and_links").detail, /source_paths cannot reference the record itself/);
    });
  });
  await context.test("evidence cycle", async () => {
    await withRepository(async (root) => {
      const first = "memory/knowledge/KNW-EVIDENCE-A.md";
      const second = "memory/knowledge/KNW-EVIDENCE-B.md";
      await put(root, first, record("knowledge", {
        id: "KNW-EVIDENCE-A",
        source_paths: [second],
      }));
      await put(root, second, record("knowledge", {
        id: "KNW-EVIDENCE-B",
        source_paths: [first],
      }));
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.match(component(validation, "records_and_links").detail, /evidence cycle detected/);
    });
  });
});

test("timestamps reject impossible UTC calendar values", async () => {
  await withRepository(async (root) => {
    await put(root, TYPE_PATHS.knowledge, record("knowledge", {
      created: "2026-02-30T12:00:00Z",
      updated: "2026-02-30T12:00:00Z",
    }));
    const validation = await validateProject(root);
    assert.equal(validation.usable, false);
    assert.match(component(validation, "records_and_links").detail, /ISO 8601 UTC timestamps/);
  });
});

test("superseded records require exactly one current successor and rejected-only is invalid", async (context) => {
  await context.test("rejected-only successor", async () => {
    await withRepository(async (root) => {
      await put(root, "specs/product/old.md", record("requirement", {
        id: "REQ-OLD",
        lifecycle: "superseded",
        successors: ["REQ-REJECTED"],
      }));
      await put(root, "specs/product/rejected.md", record("requirement", {
        id: "REQ-REJECTED",
        lifecycle: "rejected",
        freshness: "stale",
        verification: "stale",
        predecessors: ["REQ-OLD"],
      }));
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.match(component(validation, "records_and_links").detail, /exactly one current successor/);
    });
  });
  await context.test("approved retirement uses retired", async () => {
    await withRepository(async (root) => {
      await put(root, TYPE_PATHS.knowledge, record("knowledge", {
        lifecycle: "retired",
        freshness: "stale",
        verification: "stale",
      }));
      assert.equal((await validateProject(root)).usable, true);
    });
  });
});

test("inline YAML objects are rejected before duplicate JSON keys can hide", async () => {
  await withRepository(async (root) => {
    const path = join(root, "memory/config.yaml");
    await writeFile(path, `${await readFile(path, "utf8")}extra: {"key":1,"key":2}\n`);
    const validation = await validateProject(root);
    assert.equal(validation.usable, false);
    assert.match(component(validation, "configuration_schema").detail, /inline object syntax is not supported/);
  });
});

test("malformed marker and config still return the complete component inventory", async (context) => {
  for (const [name, path, content] of [
    ["marker", ".second-brain-project.json", "{broken"],
    ["config", "memory/config.yaml", "schema_version: [\n"],
  ]) {
    await context.test(name, async () => {
      await withRepository(async (root) => {
        await writeFile(join(root, path), content);
        const validation = await validateProject(root);
        assert.deepEqual(
          validation.components.map((item) => item.name),
          ["git", "project_identity", "configuration_schema", "routers_and_folders", "records_and_links", "context_budgets", "secret_scan", "optional_index", "external_authorities"],
        );
        assert.equal(validation.usable, false);
        assert.ok(validation.components.every((item) => item.action));
      });
    });
  }
});

test("expanded secret guards catch modern tokens, assignments, database URLs, and private key values", async (context) => {
  const values = [
    ["fine-grained GitHub PAT", ["github_pat_", "11AA22BB33CC44DD55EE66FF77"].join(""), /github_fine_grained_token/],
    ["OpenAI style key", ["sk-proj-", "AA11BB22CC33DD44EE55FF66"].join(""), /provider_secret_key/],
    ["Stripe style key", ["sk_live_", "AA11BB22CC33DD44EE55"].join(""), /provider_secret_key/],
    ["generic secret", ["secret", "AA11BB22CC33DD44EE55"].join("="), /assigned_secret/],
    ["generic token", ["token", "AA11BB22CC33DD44EE55"].join(":"), /assigned_secret/],
    ["access token", ["access_token", "AA11BB22CC33DD44EE55"].join("="), /assigned_secret/],
    ["database URL", ["postgresql://user:", "password@example.invalid/db"].join(""), /credentialed_database_url/],
    ["private key assignment", ["private_key", "AA11BB22CC33DD44EE55"].join("="), /private_key_assignment/],
  ];
  for (const [name, value, expected] of values) {
    await context.test(name, async () => {
      await withRepository(async (root) => {
        await put(root, TYPE_PATHS.knowledge, record("knowledge", {}, `${bodyFor("knowledge")}\n${value}\n`));
        const validation = await validateProject(root);
        assert.equal(validation.usable, false);
        assert.match(component(validation, "secret_scan").detail, expected);
      });
    });
  }
  await withRepository(async (root) => {
    assert.match(await readFile(join(root, "PROJECT.md"), "utf8"), /limited guardrails, not complete detection/);
    assert.match(await readFile(join(root, "memory/README.md"), "utf8"), /limited guardrails, not complete detection/);
  });
});

test("materializer preflights collisions and never overwrites existing adapters", async () => {
  const parent = await mkdtemp(join(tmpdir(), "materializer-collision-"));
  try {
    const root = join(parent, "existing");
    await mkdir(root);
    await writeFile(join(root, "AGENTS.md"), "existing adapter\n");
    const before = await readdir(root);
    await assert.rejects(
      materializeTemplate(TEMPLATE, root, "collision-project"),
      /materialization collision at AGENTS\.md/,
    );
    assert.deepEqual(await readdir(root), before);
    assert.equal(await readFile(join(root, "AGENTS.md"), "utf8"), "existing adapter\n");
    await assert.rejects(readFile(join(root, "PROJECT.md")), /ENOENT/);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("materializer removes every artifact after an injected partial apply failure", async () => {
  const parent = await mkdtemp(join(tmpdir(), "materializer-rollback-"));
  try {
    const root = join(parent, "existing");
    await mkdir(root);
    await writeFile(join(root, "preexisting.txt"), "preserve\n");
    const before = await readdir(root);
    await assert.rejects(
      materializeTemplate(TEMPLATE, root, "rollback-project", null, { failAfterCreateCount: 3 }),
      /without changing preexisting files/,
    );
    assert.deepEqual(await readdir(root), before);
    assert.equal(await readFile(join(root, "preexisting.txt"), "utf8"), "preserve\n");
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("materializer embeds one explicit or generated repository UUID consistently", async () => {
  const parent = await mkdtemp(join(tmpdir(), "materializer-identity-"));
  try {
    const explicit = "11111111-2222-4333-8444-555555555555";
    const explicitRoot = join(parent, "explicit");
    const explicitResult = await materializeTemplate(TEMPLATE, explicitRoot, "identity-project", explicit);
    assert.equal(explicitResult.repository_id, explicit);
    assert.equal(JSON.parse(await readFile(join(explicitRoot, ".second-brain-project.json"), "utf8")).repository_id, explicit);
    assert.match(await readFile(join(explicitRoot, "memory/config.yaml"), "utf8"), new RegExp(explicit));

    const generatedRoot = join(parent, "generated");
    const generated = await materializeTemplate(TEMPLATE, generatedRoot, "identity-project");
    assert.match(generated.repository_id, /^[0-9a-f-]{36}$/);
    assert.equal(JSON.parse(await readFile(join(generatedRoot, ".second-brain-project.json"), "utf8")).repository_id, generated.repository_id);
    assert.match(await readFile(join(generatedRoot, "memory/config.yaml"), "utf8"), new RegExp(generated.repository_id));
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("unexpected post-write validation failure restores the complete baseline", async () => {
  await withRepository(async (root) => {
    const existingPath = "memory/knowledge/KNW-ROLLBACK.md";
    const createdPath = "specs/new-area/REQ-ROLLBACK.md";
    await put(root, existingPath, record("knowledge", { id: "KNW-ROLLBACK", title: "Before" }));
    const beforeContent = await readFile(join(root, existingPath), "utf8");
    const baseline = await captureBaseline(root, [existingPath, createdPath]);
    await assert.rejects(
      applyTransaction(
        root,
        approvedTransaction(baseline, [
          {
            path: existingPath,
            content: record("knowledge", { id: "KNW-ROLLBACK", title: "After", updated: "2026-07-27T13:00:00Z" }),
          },
          {
            path: createdPath,
            content: record("requirement", { id: "REQ-ROLLBACK" }),
          },
        ]),
        { injectPostWriteFailure: true },
      ),
      /rolled back: injected post-write validation failure/,
    );
    assert.equal(await readFile(join(root, existingPath), "utf8"), beforeContent);
    await assert.rejects(readFile(join(root, createdPath)), /ENOENT/);
    await assert.rejects(lstat(join(root, "specs/new-area")), /ENOENT/);
    assert.equal((await validateProject(root)).usable, true);
  });
});

test("configured file, record, diagnostic, query, and complete response bounds are enforced", async (context) => {
  await context.test("file bytes", async () => {
    await withRepository(async (root) => {
      const configPath = join(root, "memory/config.yaml");
      await writeFile(configPath, (await readFile(configPath, "utf8")).replace("file_max_bytes: 65536", "file_max_bytes: 1024"));
      await put(root, TYPE_PATHS.knowledge, record("knowledge", {}, `${bodyFor("knowledge")}\n${"x".repeat(2000)}\n`));
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.match(component(validation, "records_and_links").detail, /file exceeds configured maximum 1024 bytes/);
    });
  });
  await context.test("record count", async () => {
    await withRepository(async (root) => {
      const configPath = join(root, "memory/config.yaml");
      await writeFile(configPath, (await readFile(configPath, "utf8")).replace("record_max_count: 1000", "record_max_count: 1"));
      await put(root, TYPE_PATHS.knowledge, record("knowledge"));
      const validation = await validateProject(root);
      assert.equal(validation.usable, false);
      assert.match(component(validation, "records_and_links").detail, /record count 2 exceeds configured maximum 1/);
    });
  });
  await context.test("diagnostics", async () => {
    await withRepository(async (root) => {
      const configPath = join(root, "memory/config.yaml");
      const config = (await readFile(configPath, "utf8"))
        .replace("diagnostic_max_count: 100", "diagnostic_max_count: 2")
        .replace("diagnostic_max_bytes: 512", "diagnostic_max_bytes: 128");
      await writeFile(configPath, config);
      for (let index = 0; index < 5; index += 1) {
        await put(root, `memory/knowledge/bad-${index}.md`, "# malformed\n");
      }
      const validation = await validateProject(root);
      assert.ok(validation.errors.length <= 2);
      assert.ok(validation.diagnostic_count > validation.errors.length);
      assert.ok(validation.diagnostics_truncated > 0);
      assert.ok(validation.components.every((item) => Buffer.byteLength(item.detail) <= 128));
    });
  });
  await context.test("query bytes", async () => {
    await withRepository(async (root) => {
      const configPath = join(root, "memory/config.yaml");
      await writeFile(configPath, (await readFile(configPath, "utf8")).replace("query_max_bytes: 1024", "query_max_bytes: 5"));
      await assert.rejects(searchProject(root, "123456"), /query exceeds configured maximum 5 bytes/);
    });
  });
  await context.test("complete search response", async () => {
    await withRepository(async (root) => {
      const configPath = join(root, "memory/config.yaml");
      await writeFile(
        configPath,
        (await readFile(configPath, "utf8")).replace("search_response_max_bytes: 16384", "search_response_max_bytes: 1024"),
      );
      for (let index = 1; index <= 5; index += 1) {
        await put(root, `memory/knowledge/KNW-BOUND-${index}.md`, record("knowledge", {
          id: `KNW-BOUND-${index}`,
          title: `Bounded pointer ${index} ${"title".repeat(10)}`,
        }, bodyFor("knowledge", "bounded")));
      }
      const result = await searchProject(root, "bounded");
      assert.ok(Buffer.byteLength(JSON.stringify(result)) <= 1024);
      assert.equal(result.matched_count, 5);
      assert.ok(result.truncated_count > 0);
      assert.equal(result.truncated_count, result.matched_count - result.result_count);
      assert.equal(result.response_bytes, Buffer.byteLength(JSON.stringify(result)));
    });
  });
});

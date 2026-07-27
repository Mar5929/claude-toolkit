import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile, cp } from "node:fs/promises";
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

test("deleting the disabled cache loses no truth", async () => {
  await withRepository(async (root) => {
    await rm(join(root, "memory/.cache"), { recursive: true, force: true });
    const validation = await validateProject(root);
    assert.equal(validation.usable, true);
    assert.equal(component(validation, "optional_index").status, "not_enabled");
    assert.equal(component(validation, "optional_index").action, "none");
  });
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

test("enabled index with no cache reports stale and a rebuild action without hiding core health", async () => {
  await withRepository(async (root) => {
    const configPath = join(root, "memory/config.yaml");
    const config = (await readFile(configPath, "utf8")).replace("enabled: false", "enabled: true");
    await writeFile(configPath, config);
    await rm(join(root, "memory/.cache"), { recursive: true, force: true });
    const validation = await validateProject(root);
    assert.equal(validation.usable, true);
    assert.equal(validation.stale, true);
    assert.equal(component(validation, "optional_index").status, "stale");
    assert.match(component(validation, "optional_index").action, /rebuild/);

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
      assert.match(component(validation, "project_identity").detail, /duplicate key/);
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
      const transaction = {
        schema_version: 1,
        project_id: "test-project",
        baseline: await captureBaseline(root, ["memory/knowledge/KNW-NOOP.md"]),
        evidence: [],
        writes: [],
      };
      await assert.rejects(applyTransaction(root, transaction), /contains no writes/);
      assert.equal(git(root, "status", "--porcelain"), "");
    });
  });
  await context.test("out-of-scope write", async () => {
    await withRepository(async (root) => {
      const transaction = {
        schema_version: 1,
        project_id: "test-project",
        baseline: await captureBaseline(root, ["package.json"]),
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
  assert.doesNotMatch(combined, /\b(?:sqlite|postgres|neon|cloudflare|worker|embedding)\b/i);
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
      "memory/knowledge/Z.md",
    ]);
    assert.deepEqual(Object.keys(baseline.paths), ["memory/knowledge/A.md", "memory/knowledge/Z.md"]);
  });
});

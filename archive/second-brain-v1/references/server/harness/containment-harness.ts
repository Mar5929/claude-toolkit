import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  blockedWriteHttpResponse,
  blockedWriteJson,
  blockedWriteMcpResult,
  legacyAdvisoryText,
  V1_READ_ONLY_PAYLOAD,
  v1WriteMode,
  v1WritesAreReadOnly,
} from "../src/containment";
import { autoCurateDisabledReason, curateSession, runScheduledCuration } from "../src/curate";
import { recallNodes, type Sql } from "../src/db";
import { GitHubHandler } from "../src/github-handler";
import { buildMemoryServer } from "../src/mcp";
import type { Env } from "../src/types";

let passed = 0;

function ok(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed++;
  console.log(`PASS: ${message}`);
}

function envWith(values: Record<string, unknown> = {}): Env {
  return values as unknown as Env;
}

async function testModesAndPayloads(): Promise<void> {
  ok(v1WriteMode(envWith()) === "read-only", "missing write mode fails closed");
  ok(
    v1WriteMode(envWith({ BRAIN_V1_WRITE_MODE: "unexpected" })) === "read-only",
    "unknown write mode fails closed",
  );
  ok(
    v1WriteMode(envWith({ BRAIN_V1_WRITE_MODE: "write" })) === "write",
    "only explicit write restores the server write path",
  );
  ok(v1WritesAreReadOnly(envWith({ BRAIN_V1_WRITE_MODE: "read-only" })), "read-only is detected");

  const expected = JSON.stringify(V1_READ_ONLY_PAYLOAD);
  ok(blockedWriteJson() === expected, "blocked write JSON matches the Unit 00 contract");
  ok(
    blockedWriteMcpResult().isError &&
      blockedWriteMcpResult().content[0]?.text === expected,
    "MCP writes return the exact contract as an error",
  );

  const response = blockedWriteHttpResponse();
  ok(response.status === 423, "HTTP writes return 423 Locked");
  ok(await response.text() === expected, "HTTP writes return the exact JSON contract");
  ok(
    legacyAdvisoryText("value").startsWith("legacy/advisory:"),
    "read output carries the legacy/advisory warning",
  );
}

async function testCurationMakesNoCalls(): Promise<void> {
  const env = envWith({
    BRAIN_V1_WRITE_MODE: "read-only",
    ANTHROPIC_API_KEY: "must-not-be-used",
    DATABASE_URL_FAKE: "must-not-be-used",
  });
  let sqlCalls = 0;
  const sql = (() => {
    sqlCalls++;
    throw new Error("SQL must not run during containment");
  }) as unknown as Sql;
  let modelCalls = 0;
  const model = async () => {
    modelCalls++;
    return "{}";
  };

  ok(autoCurateDisabledReason(env) === "v1_read_only", "containment disables auto-curation first");
  const direct = await curateSession(env, sql, "fake", "session", model);
  ok(direct.skipped === "v1_read_only", "direct session curation is skipped");
  ok(sqlCalls === 0 && modelCalls === 0, "direct curation performs zero SQL and model calls");

  const scheduled = await runScheduledCuration(env, model);
  ok(scheduled.length === 0, "scheduled curation is a no-op");
  ok(sqlCalls === 0 && modelCalls === 0, "scheduled curation performs zero SQL and model calls");
}

async function testRecallDoesNotWriteStats(): Promise<void> {
  let queries = 0;
  const row = {
    id: "legacy-node",
    path: "decisions/legacy-node.md",
    type: "decision",
    title: "Legacy node",
    status: "active",
    markdown: "legacy body",
    updated_at: "2026-01-01T00:00:00Z",
    pinned: false,
  };
  const sql = (() => {
    queries++;
    if (queries === 1) return Promise.resolve([row]);
    return Promise.resolve([]);
  }) as unknown as Sql;

  const nodes = await recallNodes(sql, "fake", "legacy", 5, null, false);
  ok(nodes.length === 1 && nodes[0]?.id === "legacy-node", "read-only recall still returns matches");
  ok(queries === 2, "read-only recall performs no recall-stat update query");
}

async function testFastWriteRoutes(): Promise<void> {
  const env = envWith({ BRAIN_V1_WRITE_MODE: "read-only" });
  const ctx = {} as ExecutionContext;
  for (const action of ["journal", "curate", "node"]) {
    const response = await GitHubHandler.fetch(
      new Request(`https://example.test/fast/fake/${action}`, { method: "POST" }),
      env,
      ctx,
    );
    ok(response.status === 423, `/fast/${action} returns 423 before database access`);
    ok(
      await response.text() === JSON.stringify(V1_READ_ONLY_PAYLOAD),
      `/fast/${action} returns the exact Unit 00 contract`,
    );
  }
}

async function testMcpWriteTools(): Promise<void> {
  let sqlCalls = 0;
  const sql = (() => {
    sqlCalls++;
    return Promise.resolve([{ markdown: "# Legacy digest" }]);
  }) as unknown as Sql;
  const env = envWith({ BRAIN_V1_WRITE_MODE: "read-only" });
  const server = buildMemoryServer(env, sql, "fake", "tester", "admin");
  const client = new Client({ name: "containment-harness", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const calls = [
    ["upsert_node", {
      id: "dec-test",
      path: "decisions/dec-test.md",
      type: "decision",
      title: "Test",
      markdown: "---\nid: dec-test\n---\n\nTest",
    }],
    ["put_digest", { markdown: "# Test" }],
    ["append_journal", { entry: { note: "test" } }],
    ["drain_journal", { seqs: [1] }],
  ] as const;

  for (const [name, args] of calls) {
    const result = await client.callTool({ name, arguments: args });
    ok(result.isError === true, `${name} returns an MCP error`);
    const content = result.content[0];
    ok(
      content?.type === "text" && content.text === JSON.stringify(V1_READ_ONLY_PAYLOAD),
      `${name} returns the exact Unit 00 contract`,
    );
  }
  ok(sqlCalls === 0, "blocked MCP writes perform zero SQL calls");

  const digest = await client.callTool({ name: "get_digest", arguments: {} });
  const digestContent = digest.content[0];
  ok(
    digestContent?.type === "text" &&
      digestContent.text.startsWith("legacy/advisory:") &&
      digestContent.text.includes("# Legacy digest"),
    "MCP digest read remains available with the legacy/advisory warning",
  );
  ok(sqlCalls === 1, "the allowed digest read performs one SQL query");

  await client.close();
  await server.close();
}

function testLocalHooks(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const hooks = resolve(here, "..", "..", "hooks");
  const cases = [
    ["brain-mcp-capture.mjs", "{}"],
    ["brain-mcp-recall.mjs", '{"prompt":"a substantial memory question"}'],
    ["brain-mcp-session-curate.mjs", '{"session_id":"session"}'],
    ["knowledge-curator-nudge.mjs", '{"tool_name":"Bash","tool_input":{"command":"git push"}}'],
  ];

  for (const [file, input] of cases) {
    const run = spawnSync(process.execPath, [resolve(hooks, file)], {
      input,
      encoding: "utf8",
      env: {
        ...process.env,
        BRAIN_BACKEND: "mcp",
        BRAIN_V1_WRITE_MODE: "read-only",
        BRAIN_CAPTURE: "1",
        BRAIN_CURATE_ON_END: "1",
        BRAIN_RECALL: "1",
        BRAIN_KC_NUDGE: "1",
        BRAIN_MCP_TOKEN: "must-not-be-used",
        BRAIN_MCP_ORIGIN: "https://must-not-be-called.invalid",
        BRAIN_PROJECT: "fake",
      },
    });
    ok(run.status === 0, `${file} exits successfully in containment`);
    ok(run.stdout === "", `${file} performs a silent no-op in containment`);
  }
}

async function main(): Promise<void> {
  await testModesAndPayloads();
  await testCurationMakesNoCalls();
  await testRecallDoesNotWriteStats();
  await testFastWriteRoutes();
  await testMcpWriteTools();
  testLocalHooks();
  console.log(`ALL PASS (${passed} checks), FAIL: 0`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

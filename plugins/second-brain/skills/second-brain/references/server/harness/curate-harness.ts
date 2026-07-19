// Harness for the WI-002 Phase 4 auto-curation pass (src/curate.ts). Runs the
// REAL curateProject/runScheduledCuration code against a scratch Neon database
// with the model call MOCKED (a harness can't and shouldn't spend API tokens).
// Same conventions as db-harness.ts:
//
//   HARNESS_DATABASE_URL="postgres://..." npx tsx harness/curate-harness.ts
//
// Manages throwaway project id 'harness-curate'; cleans before and after;
// exits non-zero on the first failed assertion.

import { neon } from "@neondatabase/serverless";
import { appendJournal, getDigest, getNode, readJournal, type Sql } from "../src/db";
import { curateProject, runScheduledCuration, type CallModel } from "../src/curate";
import type { Env } from "../src/types";

const url = process.env.HARNESS_DATABASE_URL;
if (!url) {
  console.error("Set HARNESS_DATABASE_URL to a scratch Neon DB (schema.sql already applied).");
  process.exit(2);
}
const sql = neon(url) as Sql;
const P = "harness-curate";

// No Workers AI binding outside a Worker: embedText degrades to null vectors,
// which upsertNode accepts (keyword-only recall). No API key needed — the
// model is injected per test.
const env = {
  DATABASE_URL_HARNESS_CURATE: url,
  ANTHROPIC_API_KEY: "harness-key-never-used",
} as unknown as Env;

let passed = 0;
function ok(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  PASS  ${msg}`); }
  else { console.error(`  FAIL  ${msg}`); throw new Error(`assertion failed: ${msg}`); }
}

const nodeFile = (id: string, type: string, title: string, body: string) =>
  `---\nid: ${id}\ntype: ${type}\ntitle: "${title}"\nstatus: active\n---\n\n${body}`;

const planJson = (plan: unknown) => JSON.stringify(plan);

async function reset() {
  await sql`delete from edges where project_id = ${P}`;
  await sql`delete from node_versions where project_id = ${P}`;
  await sql`delete from journal where project_id = ${P}`;
  await sql`delete from nodes where project_id = ${P}`;
  await sql`delete from digests where project_id = ${P}`;
  await sql`insert into projects (id, name) values (${P}, 'harness-curate') on conflict (id) do nothing`;
}

async function main() {
  await reset();

  console.log("\n== 1. happy path: entries -> node + drain ==");
  await appendJournal(sql, P, { kind: "note", text: "Owner decided the widget ships in blue." }, "local");
  await appendJournal(sql, P, { kind: "note", text: "Routine narration, nothing durable." }, "local");
  const happyModel: CallModel = async (_s, user) => {
    ok(user.includes("Owner decided the widget ships in blue."), "journal entry text reaches the model");
    ok(user.includes("(no nodes yet)"), "empty node index is presented");
    return planJson({
      nodes: [{
        id: "dec-9001-widget-blue",
        path: "decisions/dec-9001-widget-blue.md",
        type: "decision",
        title: "Widget ships in blue",
        markdown: nodeFile("dec-9001-widget-blue", "decision", "Widget ships in blue", "Owner decision."),
      }],
      digest_markdown: null,
      summary: "1 decision written.",
    });
  };
  const r1 = await curateProject(env, sql, P, happyModel);
  ok(r1.read === 2, `read both entries (got ${r1.read})`);
  ok(r1.nodes_written.length === 1 && r1.nodes_written[0] === "dec-9001-widget-blue", "node reported written");
  ok(r1.drained === 2, `both entries drained (got ${r1.drained})`);
  ok(r1.error === undefined, "no error");
  const written = await getNode(sql, P, "dec-9001-widget-blue");
  ok(written !== null && written.type === "decision", "node exists in the store");
  ok((await readJournal(sql, P, 10)).length === 0, "journal empty after drain");

  console.log("\n== 2. model failure: nothing drained ==");
  await appendJournal(sql, P, { kind: "note", text: "Another fact." }, "local");
  const failModel: CallModel = async () => { throw new Error("model unavailable"); };
  const r2 = await curateProject(env, sql, P, failModel);
  ok(r2.error !== undefined && r2.error.includes("nothing drained"), "error reported, drain aborted");
  ok((await readJournal(sql, P, 10)).length === 1, "entry retries next run");

  console.log("\n== 3. invalid plan (knowledge node) rejected, nothing drained ==");
  const knowledgeModel: CallModel = async () => planJson({
    nodes: [{
      id: "know-sneaky", path: "knowledge/know-sneaky.md", type: "knowledge",
      title: "Sneaky", markdown: nodeFile("know-sneaky", "knowledge", "Sneaky", "x"),
    }],
    digest_markdown: null,
    summary: "tried to write knowledge",
  });
  const r3 = await curateProject(env, sql, P, knowledgeModel);
  ok(r3.error !== undefined && r3.nodes_written.length === 0, "knowledge-type plan rejected by validation");
  ok((await getNode(sql, P, "know-sneaky")) === null, "no knowledge node written");
  ok((await readJournal(sql, P, 10)).length === 1, "entry not drained");

  console.log("\n== 4. digest update + supersede edge ==");
  const supersedeModel: CallModel = async (_s, user) => {
    ok(user.includes("dec-9001-widget-blue"), "existing node index reaches the model");
    return planJson({
      nodes: [{
        id: "dec-9002-widget-red",
        path: "decisions/dec-9002-widget-red.md",
        type: "decision",
        title: "Widget ships in red (reverses blue)",
        markdown: nodeFile("dec-9002-widget-red", "decision", "Widget ships in red", "Reversal."),
        edges: [{ to: "dec-9001-widget-blue", rel: "supersedes" }],
      }],
      digest_markdown: "# Harness digest\n\n- Widget ships in red (dec-9002).",
      summary: "correction + digest refresh",
    });
  };
  const r4 = await curateProject(env, sql, P, supersedeModel);
  ok(r4.nodes_written.includes("dec-9002-widget-red") && r4.drained === 1, "correction applied and drained");
  ok(r4.digest_updated, "digest updated");
  ok((await getDigest(sql, P))?.includes("dec-9002") === true, "digest content stored");
  const red = await getNode(sql, P, "dec-9002-widget-red");
  ok(red !== null && red.edges_out.some((e) => e.rel === "supersedes" && e.to === "dec-9001-widget-blue"),
    "supersedes edge written");

  console.log("\n== 5. empty journal: skip ==");
  const r5 = await curateProject(env, sql, P, happyModel);
  ok(r5.skipped === "journal empty" && r5.read === 0, "empty journal skips cleanly");

  console.log("\n== 6. scheduled entry point: enumeration + kill switches ==");
  await appendJournal(sql, P, { kind: "note", text: "One more durable fact: cadence is weekly." }, "local");
  const enumModel: CallModel = async () => planJson({ nodes: [], digest_markdown: null, summary: "nothing durable" });
  const r6 = await runScheduledCuration(env, enumModel);
  ok(r6.length === 1 && r6[0].project === P, "DATABASE_URL_* enumeration finds the project");
  ok(r6[0].drained === 1, "empty-plan run still drains reviewed entries");
  const noKey = await runScheduledCuration({ ...(env as object) , ANTHROPIC_API_KEY: undefined } as unknown as Env, enumModel);
  ok(noKey.length === 0, "missing key -> dormant no-op");
  const killed = await runScheduledCuration({ ...(env as object), AUTO_CURATE: "0" } as unknown as Env, enumModel);
  ok(killed.length === 0, "AUTO_CURATE=0 kill switch respected");

  await reset();
  console.log(`\nALL PASS (${passed} checks), FAIL: 0`);
}

main().catch((e) => {
  console.error(`\nHARNESS FAILED: ${(e as Error).message}`);
  process.exit(1);
});

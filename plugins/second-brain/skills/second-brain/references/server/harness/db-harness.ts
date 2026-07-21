// Self-verifying DB harness for the second-brain write path. Exercises the REAL
// db.ts SQL (versioning, transitive review cascade, hybrid RRF recall, edge FK,
// export round-trip, auth) against a scratch Neon database. Embeddings are
// MOCKED with sparse unit vectors because Workers AI can't be called outside a
// Worker; the vector column + hybrid query are still exercised.
//
// Prereqs: run schema.sql once against the scratch DB. Then:
//   HARNESS_DATABASE_URL="postgres://..." npx tsx harness/db-harness.ts
//
// It manages a throwaway project id ('harness'), cleaning its rows before and
// after. Exits non-zero on the first failed assertion.

import { neon } from "@neondatabase/serverless";
import {
  appendJournal, drainJournal, exportNodes, getDigest, getGrant, getNode,
  listNodes, neighborsOf, putDigest, readJournal, recallNodes, upsertNode,
  type Sql,
} from "../src/db";

const url = process.env.HARNESS_DATABASE_URL;
if (!url) {
  console.error("Set HARNESS_DATABASE_URL to a scratch Neon DB (schema.sql already applied).");
  process.exit(2);
}
const sql = neon(url) as Sql;
const P = "harness";

let passed = 0;
function ok(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  PASS  ${msg}`); }
  else { console.error(`  FAIL  ${msg}`); throw new Error(`assertion failed: ${msg}`); }
}

// Sparse unit vector: dims=[i] -> 1 at index i. Cosine distance 0 to itself,
// 1 to an orthogonal one, so the recall floor (0.55) cleanly includes/excludes.
function vec(i: number): number[] {
  const v = new Array(1024).fill(0);
  v[i] = 1;
  return v;
}
// Unit vector with cosine `a` to vec(i) (so cosine DISTANCE = 1 - a): lets us
// test realistic mid-range matches, not just identical/orthogonal.
function mixVec(i: number, j: number, a: number): number[] {
  const v = new Array(1024).fill(0);
  v[i] = a;
  v[j] = Math.sqrt(1 - a * a);
  return v;
}
const file = (id: string, title: string, body: string) =>
  `---\nid: ${id}\ntitle: ${title}\n---\n\n${body}`;

async function reset() {
  await sql`delete from edges where project_id = ${P}`;
  await sql`delete from node_versions where project_id = ${P}`;
  await sql`delete from journal where project_id = ${P}`;
  await sql`delete from nodes where project_id = ${P}`;
  await sql`delete from digests where project_id = ${P}`;
  await sql`delete from grants where project_id = ${P}`;
  await sql`insert into projects (id, name) values (${P}, 'harness') on conflict (id) do nothing`;
  await sql`insert into grants (project_id, github_login, role) values (${P}, 'tester', 'admin')`;
}

async function versionCount(id: string): Promise<number> {
  const r = await sql`select count(*)::int as n from node_versions where project_id=${P} and id=${id}` as { n: number }[];
  return r[0].n;
}
async function reviewAfter(id: string): Promise<string | null> {
  const n = await getNode(sql, P, id);
  return n?.review_after ?? null;
}

async function main() {
  await reset();

  // T1: digest round-trip
  await putDigest(sql, P, "# harness digest");
  ok((await getDigest(sql, P)) === "# harness digest", "put_digest / get_digest round-trip");

  // T2: insert leaves no version; update snapshots exactly one OLD version
  await upsertNode(sql, P, "tester", { id: "dec-1", path: "decisions/dec-1.md", type: "decision", title: "First", markdown: file("dec-1", "First", "original body") }, vec(0));
  ok((await versionCount("dec-1")) === 0, "first insert writes NO node_versions row");
  await upsertNode(sql, P, "tester", { id: "dec-1", path: "decisions/dec-1.md", type: "decision", title: "First v2", markdown: file("dec-1", "First v2", "revised body") }, vec(0));
  ok((await versionCount("dec-1")) === 1, "update writes exactly ONE node_versions row");
  const ver = await sql`select markdown from node_versions where project_id=${P} and id='dec-1'` as { markdown: string }[];
  ok(ver[0].markdown.includes("original body"), "snapshot captured the OLD content, not the new");

  // T2b: partial update preserves omitted metadata (an LLM curator won't resend
  // every field); a later null embedding (AI failure) must not wipe the old one.
  await upsertNode(sql, P, "tester", { id: "meta", path: "m/meta.md", type: "decision", title: "Meta", markdown: file("meta", "Meta", "b"), frontmatter: { tags: ["x"] }, pinned: true, review_after: "2030-01-01T00:00:00Z" }, vec(5));
  await upsertNode(sql, P, "tester", { id: "meta", path: "m/meta.md", type: "decision", title: "Meta v2", markdown: file("meta", "Meta v2", "b2") }, vec(5)); // omit fm/pinned/review_after
  const m = await getNode(sql, P, "meta");
  ok(m?.pinned === true, "partial update preserves omitted pinned");
  ok(m?.review_after !== null, "partial update preserves omitted review_after (cascade flag survives edits)");
  ok(JSON.stringify(m?.frontmatter) === JSON.stringify({ tags: ["x"] }), "partial update preserves omitted frontmatter");
  await upsertNode(sql, P, "tester", { id: "meta", path: "m/meta.md", type: "decision", title: "Meta v3", markdown: file("meta", "Meta v3", "b3") }, null); // AI-failure path
  const embHas = await sql`select embedding is not null as has from nodes where project_id=${P} and id='meta'` as { has: boolean }[];
  ok(embHas[0].has === true, "update with null embedding (AI failure) preserves the prior embedding");
  await upsertNode(sql, P, "tester", { id: "meta", path: "m/meta.md", type: "decision", title: "Meta v4", markdown: file("meta", "Meta v4", "b4"), review_after: "" }, vec(5)); // explicit clear
  ok((await getNode(sql, P, "meta"))?.review_after === null, 'review_after="" explicitly clears it');

  // T3: transitive correction cascade over derived-from and premise-of
  await upsertNode(sql, P, "tester", { id: "src", path: "k/src.md", type: "knowledge", title: "Source", markdown: file("src", "Source", "a fact") }, vec(10));
  await upsertNode(sql, P, "tester", { id: "d1", path: "k/d1.md", type: "knowledge", title: "D1", markdown: file("d1", "D1", "derived from src"), edges: [{ to: "src", rel: "derived-from" }] }, vec(11));
  await upsertNode(sql, P, "tester", { id: "d2", path: "k/d2.md", type: "knowledge", title: "D2", markdown: file("d2", "D2", "derived from d1"), edges: [{ to: "d1", rel: "derived-from" }] }, vec(12));
  await upsertNode(sql, P, "tester", { id: "dep", path: "k/dep.md", type: "decision", title: "Dep", markdown: file("dep", "Dep", "depends on src"), edges: [{ to: "src", rel: "depends-on" }] }, vec(13));
  await upsertNode(sql, P, "tester", { id: "x", path: "k/x.md", type: "decision", title: "X", markdown: file("x", "X", "a design") }, vec(14));
  await upsertNode(sql, P, "tester", { id: "prem", path: "k/prem.md", type: "knowledge", title: "Premise", markdown: file("prem", "Premise", "premise of x"), edges: [{ to: "x", rel: "premise-of" }] }, vec(15));
  // Correct `src` -> flags d1 (derived), d2 (transitive), dep (depends-on). Correct `prem` -> flags x.
  await upsertNode(sql, P, "tester", { id: "fix", path: "k/fix.md", type: "knowledge", title: "Fix", markdown: file("fix", "Fix", "the real fact"), edges: [{ to: "src", rel: "corrects" }, { to: "prem", rel: "corrects" }] }, vec(16));
  ok((await reviewAfter("d1")) !== null, "cascade flags a direct derived-from dependent");
  ok((await reviewAfter("d2")) !== null, "cascade flags a TRANSITIVE derived-from dependent");
  ok((await reviewAfter("dep")) !== null, "cascade flags a depends-on dependent");
  ok((await reviewAfter("x")) !== null, "cascade flags a premise-of dependent");
  ok((await reviewAfter("src")) === null, "cascade does NOT self-flag the corrected node");

  // T4: edge FK behavior — soft rel to missing = skipped+reported; critical = throws
  const soft = await upsertNode(sql, P, "tester", { id: "soft", path: "k/soft.md", type: "knowledge", title: "Soft", markdown: file("soft", "Soft", "b"), edges: [{ to: "ghost", rel: "relates-to" }] }, vec(20));
  ok(soft.edges_skipped.length === 1 && soft.edges_written === 0, "soft edge to a missing node is skipped + reported");
  let threw = false;
  try {
    await upsertNode(sql, P, "tester", { id: "crit", path: "k/crit.md", type: "knowledge", title: "Crit", markdown: file("crit", "Crit", "c"), edges: [{ to: "ghost", rel: "supersedes" }] }, vec(21));
  } catch { threw = true; }
  ok(threw, "critical edge (supersedes) to a missing node is a HARD error");
  ok((await getNode(sql, P, "crit")) === null, "the hard-error upsert wrote nothing (atomic)");

  // T5: hybrid recall — keyword hit, semantic hit, and retired-status exclusion
  await upsertNode(sql, P, "tester", { id: "kw", path: "n/kw.md", type: "knowledge", title: "Pricing engine rounding", markdown: file("kw", "Pricing engine rounding", "the pricing engine rounds half-up") }, vec(30));
  const byKeyword = await recallNodes(sql, P, "pricing rounding", 5, null);
  ok(byKeyword.some((n) => n.id === "kw"), "keyword recall finds the node");
  const bySemantic = await recallNodes(sql, P, "totally unrelated words", 5, vec(30));
  ok(bySemantic.some((n) => n.id === "kw"), "semantic recall finds the node by vector even with no keyword overlap");
  // A mid-distance match (cosine distance 0.5) must still surface — real bge-m3
  // matches sit in this range, so an over-strict floor would drop them.
  const byMid = await recallNodes(sql, P, "totally unrelated words", 5, mixVec(30, 31, 0.5));
  ok(byMid.some((n) => n.id === "kw"), "a mid-distance (~0.5) semantic match is still returned (no over-strict floor)");
  // Every retired status must be excluded from PRIMARY hits (catches a dropped
  // value in RETIRED_STATUS, incl. 'answered').
  const RETIRED = ["superseded", "deprecated", "archived", "cleared", "resolved", "answered"];
  for (let i = 0; i < RETIRED.length; i++) {
    const st = RETIRED[i];
    const id = `retired-${st}`;
    await upsertNode(sql, P, "tester", { id, path: `n/${id}.md`, type: "decision", title: `Pricing rounding ${st}`, status: st, markdown: file(id, `Pricing rounding ${st}`, `pricing rounding rule ${st}`) }, vec(40 + i));
    const primary = await recallNodes(sql, P, "pricing rounding", 20, vec(40 + i));
    ok(!primary.some((n) => n.id === id), `a '${st}' node is excluded from PRIMARY recall hits`);
  }

  // T6: neighbor expansion surfaces the replacement (the superseded node)
  await upsertNode(sql, P, "tester", { id: "new", path: "n/new.md", type: "decision", title: "Pricing rounding decision v2", markdown: file("new", "Pricing rounding decision v2", "new pricing rounding rule"), edges: [{ to: "retired-superseded", rel: "supersedes" }] }, vec(60));
  const neigh = await neighborsOf(sql, P, ["new"], 8);
  ok(neigh.some((n) => n.id === "retired-superseded" && n.via === "supersedes"), "neighborsOf returns the superseded node via the supersedes edge");
  ok(neigh.length > 0 && neigh.every((n) => !("markdown" in n)), "neighbors are references (id/title/via/status), carry NO markdown body");

  // T7: journal read/drain by explicit seqs
  const s1 = await appendJournal(sql, P, { note: "turn one" }, "local");
  const s2 = await appendJournal(sql, P, { note: "turn two" }, "cloud");
  ok((await readJournal(sql, P, 50)).length === 2, "read_journal returns undrained entries");
  ok((await drainJournal(sql, P, [s1])) === 1, "drain_journal marks exactly the given seq");
  const left = await readJournal(sql, P, 50);
  ok(left.length === 1 && left[0].seq === s2, "the un-drained entry remains");

  // T8: export round-trips node markdown verbatim
  const files = await exportNodes(sql, P);
  const kwFile = files.find((f) => f.id === "kw");
  ok(!!kwFile && kwFile.markdown === file("kw", "Pricing engine rounding", "the pricing engine rounds half-up"), "export reproduces the full node markdown verbatim");

  // T9: list_nodes filter + auth
  const decisions = await listNodes(sql, P, { type: "decision" });
  ok(decisions.every((n) => n.type === "decision") && decisions.length > 0, "list_nodes filters by type");
  ok((await getGrant(sql, "nobody", P)) === null, "getGrant denies a login with no grant row");
  ok((await getGrant(sql, "tester", P)) === "admin", "getGrant returns the granted role");

  await reset();
  console.log(`\nALL ${passed} CHECKS PASSED`);
}

main().catch((e) => { console.error("\nHARNESS FAILED:", e.message); process.exit(1); });

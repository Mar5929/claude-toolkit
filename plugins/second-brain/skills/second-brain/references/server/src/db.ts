import { neon } from "@neondatabase/serverless";
import type { Env } from "./types";
import { toVector } from "./embed";

export type Sql = ReturnType<typeof neon>;
export type Role = "read" | "write" | "admin";

// Statuses that must never be served as a PRIMARY recall hit: a reversed
// decision / cleared blocker / answered question is stale and causes wrong
// answers (PATTERNS #1, #10). They stay reachable via neighbor expansion.
const RETIRED_STATUS = ["superseded", "deprecated", "archived", "cleared", "resolved", "answered"];

// Dependency rels the correction/supersede cascade walks (PATTERNS #2, #5).
// derived-from / depends-on: dependent = from_id. premise-of: dependent = to_id.
const CRITICAL_RELS = new Set([
  "corrects", "supersedes", "derived-from", "premise-of", "depends-on",
]);

export interface NodeRow {
  id: string;
  path: string;
  type: string;
  title: string;
  status: string;
  markdown: string;
  updated_at: string;
}

export interface UpsertInput {
  id: string;
  path: string;
  type: string;
  title: string;
  status?: string;
  markdown: string;               // FULL node file text (frontmatter + body)
  frontmatter?: Record<string, unknown>;
  pinned?: boolean;
  review_after?: string | null;   // ISO timestamp
  edges?: { to: string; rel: string }[];
}

export interface UpsertResult {
  id: string;
  versioned: boolean;             // true = a prior version was snapshotted (this was an update)
  edges_written: number;
  edges_skipped: { to: string; rel: string; reason: string }[];
  flagged_for_review: string[];   // targets whose dependents were flagged
}

// One database per project: resolve the project's own connection-string secret.
// Returns null when no database is registered for the project.
export function db(env: Env, projectId: string): Sql | null {
  const key = `DATABASE_URL_${projectId.toUpperCase().replace(/-/g, "_")}` as `DATABASE_URL_${string}`;
  const url = env[key];
  return url ? neon(url) : null;
}

// Returns the person's role on the project, or null (no row = no access).
export async function getGrant(sql: Sql, login: string, projectId: string): Promise<Role | null> {
  const rows = await sql`
    select role from grants
    where project_id = ${projectId} and github_login = ${login}
  ` as { role: Role }[];
  return rows[0]?.role ?? null;
}

export async function getDigest(sql: Sql, projectId: string): Promise<string | null> {
  const rows = await sql`
    select markdown from digests where project_id = ${projectId}
  ` as { markdown: string }[];
  return rows[0]?.markdown ?? null;
}

export async function putDigest(sql: Sql, projectId: string, markdown: string): Promise<void> {
  await sql`
    insert into digests (project_id, markdown, updated_at)
    values (${projectId}, ${markdown}, now())
    on conflict (project_id) do update set markdown = excluded.markdown, updated_at = now()
  `;
}

// --- Writes -----------------------------------------------------------------

// upsert_node: snapshot the prior content into node_versions, upsert the node
// (with its embedding), write its edges, and cascade review flags for any
// correction/supersede. The whole thing runs in ONE transaction so a critical
// edge (corrects/supersedes/dependency) can never be silently dropped.
//
// The snapshot is a data-modifying CTE: `prev` reads the OLD row and `saved`
// copies it to node_versions, both against the same Postgres snapshot as the
// main upsert, so the OLD content is captured even though the main statement
// overwrites it. On first insert `prev` is empty, so no version row is written.
export async function upsertNode(
  sql: Sql,
  projectId: string,
  login: string,
  input: UpsertInput,
  vec: number[] | null,
): Promise<UpsertResult> {
  const embedding = vec ? toVector(vec) : null;
  const edges = input.edges ?? [];

  // Fetch existing rows for this node + the edge endpoints in one query. We use
  // this to (a) decide insert-vs-update deterministically, (b) validate edge
  // endpoints exist, and (c) PRESERVE metadata fields the caller omitted — this
  // is an LLM-driven tool, so an omitted `frontmatter`/`status`/`pinned`/
  // `review_after` must not wipe stored state (esp. a review_after the cascade
  // just set). Omitted -> keep existing; present -> overwrite; review_after=""
  // -> explicitly clear.
  const lookupIds = Array.from(new Set([input.id, ...edges.map((e) => e.to)]));
  const existingRows = await sql`
    select id, status, frontmatter, pinned, review_after from nodes
    where project_id = ${projectId} and id = any(${lookupIds})
  ` as { id: string; status: string; frontmatter: unknown; pinned: boolean; review_after: string | null }[];
  const existing = new Map(existingRows.map((r) => [r.id, r]));
  const ex = existing.get(input.id);
  const versioned = existing.has(input.id);

  const status = input.status ?? ex?.status ?? "active";
  const fm = input.frontmatter !== undefined
    ? JSON.stringify(input.frontmatter)
    : ex
      ? (typeof ex.frontmatter === "string" ? ex.frontmatter : JSON.stringify(ex.frontmatter ?? {}))
      : "{}";
  const pinned = input.pinned ?? ex?.pinned ?? false;
  const reviewAfter = input.review_after === undefined
    ? (ex?.review_after ?? null)
    : (input.review_after === "" ? null : input.review_after);

  const validEdges: { to: string; rel: string }[] = [];
  const edges_skipped: { to: string; rel: string; reason: string }[] = [];
  for (const e of edges) {
    const endpointExists = e.to === input.id || existing.has(e.to);
    if (endpointExists) {
      validEdges.push(e);
    } else if (CRITICAL_RELS.has(e.rel)) {
      // Fail loud: dropping a corrects/supersedes/dependency edge would break
      // reversible history (PATTERNS #1) and skip the review cascade (#2/#5).
      throw new Error(
        `upsert_node: edge '${e.rel}' -> '${e.to}' references a node that does not exist yet. ` +
        `Create '${e.to}' first (critical edges are never dropped).`,
      );
    } else {
      edges_skipped.push({ to: e.to, rel: e.rel, reason: "target node does not exist" });
    }
  }

  // Cascade targets: the OLD node is the `to` of a forward corrects/supersedes
  // edge (curators always write new -> old).
  const cascadeTargets = Array.from(
    new Set(validEdges.filter((e) => e.rel === "corrects" || e.rel === "supersedes").map((e) => e.to)),
  );

  const stmts: unknown[] = [];
  stmts.push(sql`
    with prev as (
      select title, status, markdown, frontmatter from nodes
      where project_id = ${projectId} and id = ${input.id}
    ),
    saved as (
      insert into node_versions (project_id, id, title, status, markdown, frontmatter, replaced_by)
      select ${projectId}, ${input.id}, title, status, markdown, frontmatter, ${login} from prev
    )
    insert into nodes (project_id, id, path, type, title, status, markdown, frontmatter,
                       embedding, pinned, review_after, updated_at)
    values (${projectId}, ${input.id}, ${input.path}, ${input.type}, ${input.title}, ${status},
            ${input.markdown}, ${fm}::jsonb, ${embedding}::vector(1024), ${pinned},
            ${reviewAfter}::timestamptz, now())
    on conflict (project_id, id) do update set
      path = excluded.path, type = excluded.type, title = excluded.title, status = excluded.status,
      markdown = excluded.markdown, frontmatter = excluded.frontmatter,
      embedding = coalesce(excluded.embedding, nodes.embedding),
      pinned = excluded.pinned, review_after = excluded.review_after, updated_at = now()
  `);
  for (const e of validEdges) {
    stmts.push(sql`
      insert into edges (project_id, from_id, rel, to_id)
      values (${projectId}, ${input.id}, ${e.rel}, ${e.to})
      on conflict do nothing
    `);
  }
  for (const target of cascadeTargets) {
    // Transitively flag every node that derives from / depends on / is a
    // conclusion of the corrected node. Plain UNION dedups node ids, so the
    // walk terminates on cyclic graphs (no depth counter to defeat it).
    stmts.push(sql`
      with recursive deps(id) as (
        select x.id from (
          select from_id as id from edges
            where project_id = ${projectId} and to_id = ${target} and rel in ('derived-from','depends-on')
          union
          select to_id as id from edges
            where project_id = ${projectId} and from_id = ${target} and rel = 'premise-of'
        ) x
        union
        select x.id
        from deps d
        join lateral (
          select from_id as id from edges
            where project_id = ${projectId} and to_id = d.id and rel in ('derived-from','depends-on')
          union
          select to_id as id from edges
            where project_id = ${projectId} and from_id = d.id and rel = 'premise-of'
        ) x on true
      )
      update nodes set review_after = now()
      where project_id = ${projectId} and id in (select id from deps) and id <> ${target}
    `);
  }

  await (sql as unknown as { transaction: (q: unknown[]) => Promise<unknown[]> }).transaction(stmts);

  return {
    id: input.id,
    versioned,
    edges_written: validEdges.length,
    edges_skipped,
    flagged_for_review: cascadeTargets,
  };
}

export async function appendJournal(
  sql: Sql,
  projectId: string,
  entry: Record<string, unknown>,
  source: "local" | "cloud",
): Promise<number> {
  // Stamp source + receipt server-side so curation can tell local from cloud
  // turns and both shapes normalize to a common envelope.
  const stamped = JSON.stringify({ ...entry, source, received_at: new Date().toISOString() });
  const rows = await sql`
    insert into journal (project_id, entry) values (${projectId}, ${stamped}::jsonb) returning seq
  ` as { seq: number }[];
  return rows[0].seq;
}

export interface JournalRow { seq: number; entry: unknown; created_at: string; }

export async function readJournal(sql: Sql, projectId: string, limit: number): Promise<JournalRow[]> {
  return await sql`
    select seq, entry, created_at from journal
    where project_id = ${projectId} and drained_at is null
    order by seq asc
    limit ${limit}
  ` as JournalRow[];
}

// Drain the EXACT seqs the curator read (not a seq <= range): an entry that
// commits after the read snapshot must not be marked drained-unread.
export async function drainJournal(sql: Sql, projectId: string, seqs: number[]): Promise<number> {
  if (seqs.length === 0) return 0;
  const rows = await sql`
    update journal set drained_at = now()
    where project_id = ${projectId} and drained_at is null and seq = any(${seqs})
    returning seq
  ` as { seq: number }[];
  return rows.length;
}

// --- Reads ------------------------------------------------------------------

export interface FullNode {
  id: string; path: string; type: string; title: string; status: string;
  markdown: string; frontmatter: unknown; pinned: boolean;
  review_after: string | null; created_at: string; updated_at: string;
  edges_out: { rel: string; to: string }[];
  edges_in: { rel: string; from: string }[];
}

export async function getNode(sql: Sql, projectId: string, id: string): Promise<FullNode | null> {
  const rows = await sql`
    select id, path, type, title, status, markdown, frontmatter, pinned,
           review_after, created_at, updated_at
    from nodes where project_id = ${projectId} and id = ${id}
  ` as Omit<FullNode, "edges_out" | "edges_in">[];
  if (rows.length === 0) return null;
  const edgeRows = await sql`
    select from_id, rel, to_id from edges
    where project_id = ${projectId} and (from_id = ${id} or to_id = ${id})
  ` as { from_id: string; rel: string; to_id: string }[];
  return {
    ...rows[0],
    edges_out: edgeRows.filter((e) => e.from_id === id).map((e) => ({ rel: e.rel, to: e.to_id })),
    edges_in: edgeRows.filter((e) => e.to_id === id).map((e) => ({ rel: e.rel, from: e.from_id })),
  };
}

export interface ListFilters {
  type?: string; status?: string; pinned?: boolean; review_due?: boolean; limit?: number;
}
export interface ListRow {
  id: string; type: string; title: string; status: string; path: string;
  updated_at: string; pinned: boolean; review_after: string | null;
}

// Compact scan (no markdown) for curator dedupe + the review sweep.
export async function listNodes(sql: Sql, projectId: string, f: ListFilters): Promise<ListRow[]> {
  const limit = Math.min(f.limit ?? 100, 500);
  return await sql`
    select id, type, title, status, path, updated_at, pinned, review_after
    from nodes
    where project_id = ${projectId}
      and (${f.type ?? null}::text is null or type = ${f.type ?? null})
      and (${f.status ?? null}::text is null or status = ${f.status ?? null})
      and (${f.pinned ?? null}::boolean is null or pinned = ${f.pinned ?? null})
      and (${f.review_due ?? false}::boolean is false
           or (review_after is not null and review_after <= now()))
    order by updated_at desc
    limit ${limit}
  ` as ListRow[];
}

// --- Recall (hybrid: exact + full-text + vector, fused by RRF) --------------

interface Cand extends NodeRow { }

const RRF_K = 60;

// Keyword-only when qvec is null (the fast path, and the AI-unavailable
// fallback). With qvec, fuses full-text rank and vector similarity by
// reciprocal rank fusion (scale-free), keeps an exact id/title branch so ids
// and code tokens surface deterministically, excludes retired statuses from
// primary hits, and boosts pinned load-bearing nodes.
export async function recallNodes(
  sql: Sql,
  projectId: string,
  query: string,
  limit: number,
  qvec?: number[] | null,
): Promise<NodeRow[]> {
  const like = `%${query}%`;
  const pool = 30;

  // Exact / id / code-token branch (deterministic; FTS can't tokenize ids).
  const exact = await sql`
    select id, path, type, title, status, markdown, updated_at, pinned
    from nodes
    where project_id = ${projectId}
      and status <> all(${RETIRED_STATUS})
      and (id ilike ${like} or title ilike ${like})
    order by updated_at desc
    limit ${limit}
  ` as (Cand & { pinned: boolean })[];

  // Full-text candidates (ranked).
  const fts = await sql`
    select id, path, type, title, status, markdown, updated_at, pinned
    from nodes
    where project_id = ${projectId}
      and status <> all(${RETIRED_STATUS})
      and search @@ websearch_to_tsquery('english', ${query})
    order by ts_rank(search, websearch_to_tsquery('english', ${query})) desc, updated_at desc
    limit ${pool}
  ` as (Cand & { pinned: boolean })[];

  // Vector (semantic) candidates: the top-`pool` nearest by cosine distance.
  // NO hard similarity floor — real bge-m3 distances for related text sit in a
  // compressed mid-range (a genuine match measured 0.576 cosine distance), so a
  // floor silently drops true hits. RRF + the final `limit` rank precision;
  // off-topic queries just return the nearest few, which the caller can judge.
  let vec: (Cand & { pinned: boolean })[] = [];
  if (qvec && qvec.length > 0) {
    const qv = toVector(qvec);
    vec = await sql`
      select id, path, type, title, status, markdown, updated_at, pinned
      from nodes
      where project_id = ${projectId}
        and status <> all(${RETIRED_STATUS})
        and embedding is not null
      order by embedding <=> ${qv}::vector(1024)
      limit ${pool}
    ` as (Cand & { pinned: boolean })[];
  }

  // Reciprocal rank fusion across the three ranked lists + a pinned bonus.
  const score = new Map<string, number>();
  const row = new Map<string, Cand & { pinned: boolean }>();
  const fuse = (list: (Cand & { pinned: boolean })[], weight: number) => {
    list.forEach((r, i) => {
      row.set(r.id, r);
      score.set(r.id, (score.get(r.id) ?? 0) + weight / (RRF_K + i + 1));
    });
  };
  fuse(exact, 2.0);   // deterministic matches lead
  fuse(fts, 1.0);
  fuse(vec, 1.0);
  for (const [id, r] of row) if (r.pinned) score.set(id, (score.get(id) ?? 0) + 0.15);

  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  const out = ranked.map(([id]) => {
    const r = row.get(id)!;
    return { id: r.id, path: r.path, type: r.type, title: r.title, status: r.status, markdown: r.markdown, updated_at: r.updated_at };
  });
  if (out.length > 0) await bumpRecallStats(sql, projectId, out.map((n) => n.id));
  return out;
}

// --- Pointer-first recall formatting (shared by the MCP recall tool and the
// /fast recall path) ----------------------------------------------------------

// Hard ceiling on what one recall returns, across matches + neighbors, so a
// broad query can't dump the whole store. Truncation appends a pointer note.
export const RECALL_MAX_CHARS = 16000;

export function capRecall(text: string): string {
  if (text.length <= RECALL_MAX_CHARS) return text;
  return (
    text.slice(0, RECALL_MAX_CHARS) +
    `\n\n<!-- recall output truncated at ${RECALL_MAX_CHARS} chars; narrow the query, lower limit, or get_node specific ids -->`
  );
}

// A short, frontmatter-stripped preview of a node body for the pointer view:
// whitespace-collapsed, up to ~maxChars, ellipsis if truncated, never the
// frontmatter block. The full body is one get_node away.
export function bodySnippet(markdown: string, maxChars = 240): string {
  let body = markdown ?? "";
  const fm = body.match(/^---\n[\s\S]*?\n---\n?/);
  if (fm) body = body.slice(fm[0].length);
  body = body.replace(/\s+/g, " ").trim();
  if (body.length <= maxChars) return body;
  return body.slice(0, maxChars).replace(/\s+\S*$/, "").trimEnd() + "…";
}

// Prioritized 1-hop neighbors of the primary matches: bring "the constraint it
// depends on and the note that replaced it" (PATTERNS server-behavior #4).
// Ranked by rel so the replacement/constraint survives the cap.
// A neighbor is a REFERENCE, not a body: id + title + the relationship + status
// is all "what's linked, is it still valid" needs; the full text is one get_node
// away. Deliberately excludes `markdown` — returning full neighbor bodies used to
// dominate recall's token cost, and it matches the digest's "headlines up top,
// detail in the nodes" rule.
export interface Neighbor {
  id: string; path: string; type: string; title: string;
  status: string; updated_at: string; via: string;
}
export async function neighborsOf(
  sql: Sql, projectId: string, ids: string[], cap: number,
): Promise<Neighbor[]> {
  if (ids.length === 0) return [];
  // Dedupe to one row per neighbor (its highest-priority rel), THEN rank by
  // priority and cap — so the replacement/constraint survives the cap, not
  // whichever neighbor sorts first by id.
  return await sql`
    select id, path, type, title, status, updated_at, via
    from (
      select distinct on (n.id) n.id, n.path, n.type, n.title, n.status, n.updated_at,
             e.rel as via,
             case e.rel
               when 'supersedes' then 1 when 'superseded-by' then 1
               when 'corrects' then 1 when 'corrected-by' then 1
               when 'derived-from' then 2 when 'informs' then 2
               when 'premise-of' then 2 when 'has-premise' then 2
               when 'depends-on' then 3 when 'enables' then 3
               when 'answers' then 3 when 'answered-by' then 3
               when 'blocks' then 3 when 'blocked-by' then 3
               else 5 end as pri
      from edges e
      join nodes n on n.project_id = e.project_id
        and n.id = case when e.from_id = any(${ids}) then e.to_id else e.from_id end
      where e.project_id = ${projectId}
        and (e.from_id = any(${ids}) or e.to_id = any(${ids}))
        and not (n.id = any(${ids}))
      order by n.id, pri
    ) sub
    order by pri, updated_at desc
    limit ${cap}
  ` as Neighbor[];
}

// Usage tracking: ranking and curation can favor notes that keep proving useful.
async function bumpRecallStats(sql: Sql, projectId: string, ids: string[]): Promise<void> {
  await sql`
    update nodes
    set recall_count = recall_count + 1, last_recalled_at = now()
    where project_id = ${projectId} and id = any(${ids})
  `;
}

// Export is CURRENT-STATE only (nodes.markdown + digest). node_versions history
// lives solely in Postgres; the git mirror is not a full history backup.
export async function exportNodes(sql: Sql, projectId: string): Promise<NodeRow[]> {
  return await sql`
    select id, path, type, title, status, markdown, updated_at
    from nodes
    where project_id = ${projectId}
    order by path
  ` as NodeRow[];
}

// Bearer fast path: look up a raw token by its SHA-256 hash. Returns the
// GitHub login the token acts as, or null if unknown/revoked.
export async function loginForToken(sql: Sql, rawToken: string): Promise<string | null> {
  const hash = await sha256Hex(rawToken);
  const rows = await sql`
    select github_login from tokens
    where token_hash = ${hash} and revoked_at is null
  ` as { github_login: string }[];
  return rows[0]?.github_login ?? null;
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

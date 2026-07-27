# second-brain: implementation record + new-project setup recipe

> **Historical v1 build record.** The current source is contained read-only.
> Do not follow this file as a new installation guide. The current operator
> procedure is `../v1-freeze-and-export.md`.

**Purpose.** DragonFly is the PILOT for the second-brain memory + knowledge
architecture (WI-002). This file is the durable, checked-in record of exactly
what was built and how to stand it up, so the proven design can be folded into
the `claude-toolkit` `second-brain` plugin (WI-002 Phase 5) and future projects
get the same setup with no re-derivation. Keep it current as the system evolves.

Companion docs: `README.md` (deployed state + per-project model), `PATTERNS.md`
(the 12 conversation patterns and the binding commitments they drive),
`schema.sql` (+ `upgrade-00*.sql`), and `work-items/WI-002-*.md` (goal, decisions,
phase status).

---

## 1. Architecture (what and why)

One Cloudflare Worker fronts long-term memory over **MCP + GitHub OAuth**,
backed by **Neon Postgres + pgvector**. It is the only transport reachable AND
securely authenticated from every Claude Code session type (local, cloud/
sandboxed, CI): a second git repo fails cloud-reach (403), and raw stores fail
the cloud-secret test. Markdown-native and portable: nodes store the full node
file text. The Unit 00 freeze export includes nodes, edges, revision history,
digest metadata, and journal rows for human review.

```
Any Claude Code session (local | cloud | CI)
        │  MCP over HTTPS + OAuth (GitHub)      ← cloud-reachable + securable
        ▼
  second-brain Worker  ── read:  get_digest, recall, get_node, list_nodes, export
        │              ── write: upsert_node, put_digest, append_journal,
        │                         drain_journal, read_journal   (role write/admin)
        │              ── /fast/<project>/{digest,recall,journal,curate,node}  (bearer:
        │                         local hooks, plus the headless node write)
        │              ── embeddings: Workers AI @cf/baai/bge-m3 (1024-dim)
        ▼
  Neon Postgres + pgvector   ── ONE database PER project
        │  export (current state)
        ▼
  git repo (BACKUP / rollback only, not the live store)
```

**Per-project isolation:** one Neon database per project; the single Worker
resolves each project's database from a secret named `DATABASE_URL_<PROJECT_ID>`
(uppercased, `-`→`_`). Access is private by default: sign-in proves identity
(GitHub), the `grants` table decides per-project role (`read|write|admin`).

**Historical phase status (WI-002):** Phase 1 (read everywhere) DONE + deployed. Phase 2
(write + local capture through MCP) = this record. Server-side auto-curation
INCLUDED: this bundled server ships `src/curate.ts`, which reads undrained
`journal` rows, asks a model (default `claude-haiku-4-5`, override
`CURATOR_MODEL`) for a structured curation plan (Anthropic structured outputs;
the plan's type enum EXCLUDES `knowledge`, so the auto-curator cannot write
know-* nodes, since that layer stays with the in-session knowledge-curator), applies
it through the normal `db.ts` write path (`upsertNode` as login `auto-curator`,
optional `putDigest`), then drains the exact seqs read. Any failure drains
nothing (entries retry). DORMANT until you set the `ANTHROPIC_API_KEY` secret
from the Cloudflare dashboard; `AUTO_CURATE=0` is the kill switch. Unit 00 now
also fails closed on `BRAIN_V1_WRITE_MODE` and keeps `AUTO_CURATE=0`. Harness:
`harness/curate-harness.ts` (mocked model, real db path). This is what makes
cloud sessions curate memory without an in-session curator dispatch. Port to
`claude-toolkit` = this bundled copy.

**Curation is session-scoped, with three triggers.** A conversation only reads
correctly once it is over: a pass that wakes mid-session sees the owner thinking
out loud and can write a floated idea down as a settled decision. So curation
takes one chat session at a time (`curateSession`, entries filtered by the
`session` id the capture hook stamps), and the model is told to record where the
session LANDED, not what it passed through.

| Trigger | When | Quality |
|---|---|---|
| `/remember` | Owner asks, in session | Best: the owner is present |
| SessionEnd hook | Session ends; POSTs `/fast/<project>/curate` with its session id, answered 202 + `waitUntil` so it never delays the exit | Default path |
| Cron backstop | Every 4 hours, sweeps only sessions idle past `BACKSTOP_IDLE_HOURS` (default 24), max 3 per project per tick | Catches sessions that died without SessionEnd |

The idle cutoff is load-bearing: without it the backstop would curate the first
half of a session that is merely still open, which is the problem session
scoping exists to solve. Entries captured with no session id bucket under `""`
and are only ever swept by the backstop.

---

## 2. Repo layout (every file + its role)

| Path | Role |
|---|---|
| `memory-mcp/wrangler.jsonc` | Worker config: name, KV (OAuth), GitHub client id var, `ai` binding. |
| `memory-mcp/src/index.ts` | OAuthProvider + MCP route `/mcp/<project>`; checks grant, builds the per-request server with `(env, sql, projectId, login, role)`. |
| `memory-mcp/src/github-handler.ts` | OAuth `/authorize` + `/callback`; bearer `/fast/<project>/{digest,recall,journal,curate,node}`. Journal, curate, and node are write-gated + hardened; `node` is the headless path that keeps a finished curated node from being lost. |
| `memory-mcp/src/mcp.ts` | Registers all MCP tools; role-gates writes; recall computes the query embedding + neighbor expansion. |
| `memory-mcp/src/db.ts` | All SQL: atomic `upsertNode`, transitive review cascade, hybrid RRF `recallNodes`, `neighborsOf`, journal/digest/read helpers, grants, tokens. |
| `memory-mcp/src/embed.ts` | Workers AI bge-m3 embedding (`embedText`) + pgvector literal (`toVector`). |
| `memory-mcp/src/types.ts` | `Env` (incl. `AI: Ai`), `UserProps`, `AuthRequest`. |
| `memory-mcp/schema.sql` | Full schema (run once per project DB). `upgrade-001/002` = the incremental history for reference. |
| `memory-mcp/seed.sql` | Per-project seed: the `projects` row, owner `grants`, a starter digest. COPY + edit per project. |
| `memory-mcp/scripts/mint-token.mjs` | Mint a local bearer token → writes raw token to gitignored `.claude/settings.local.json`, prints the hash-insert SQL. |
| `memory-mcp/harness/db-harness.mjs` | Self-verifying DB harness (versioning, cascade, hybrid recall, round-trip, auth) against a scratch DB. |
| `.mcp.json` (repo root, committed) | MCP client entry → `/mcp/<project>`. Drives the terminal CLI; the cloud/web app needs an account-level custom connector instead. |
| `.claude/settings.json` (committed) | `env` (BRAIN_BACKEND/ORIGIN/PROJECT/CAPTURE) + the `Stop` capture hook. Kept `BRAIN_BACKEND=git` (inert) until cutover. |
| `.claude/settings.local.json` (gitignored) | `BRAIN_MCP_TOKEN` (raw bearer). Never committed. |
| `.claude/hooks/brain-mcp-capture.mjs` | Node Stop hook: redacts + POSTs one turn record to the journal fast path. No-op unless backend=mcp + token present. |
| `.claude/agents/brain-curator.md` | MCP-native memory curator (owns all nodes except `type: knowledge`). |
| `.claude/agents/knowledge-curator.md` | MCP-native code-why curator (owns `type: knowledge` / `know-*` nodes, `covers:` drift pins). |

The git-backed prototype (11 bash hooks + git curators) lives in
`.claude/worktrees/gate3-secondbrain/` and is the `BRAIN_BACKEND=git` rollback.
It is gitignored (never on main). Do NOT wire the MCP git-export backup into
`<main>/brain/`, which would un-isolate the git rollback path.

---

## 3. Server internals

### 3.1 Schema (no Phase 2 migration needed)
`nodes(project_id,id,path,type,title,status,markdown,frontmatter jsonb,
embedding vector(1024),search tsvector,recall_count,last_recalled_at,pinned,
review_after,created_at,updated_at)`; `edges(project_id,from_id,rel,to_id)`;
`node_versions` (no FK, so it survives deletion); `digests`; `journal(seq,project_id,
entry jsonb,drained_at,created_at)`; `grants`; `tokens` (sha-256 hash only).
`nodes.type` is unconstrained text, so the node types `rule|question|blocker`
added in PATTERNS need no DDL.

### 3.2 MCP tools (contracts)
Reads (any grant): `get_digest()`, `recall({query,limit})`,
`get_node({id})`, `list_nodes({type?,status?,pinned?,review_due?,limit?})`,
`export()`. Curator read (write/admin): `read_journal({limit})`.
Writes (write/admin): `upsert_node({id,path,type,title,status?,markdown,
frontmatter?,pinned?,review_after?,edges?})`, `put_digest({markdown})`,
`append_journal({entry})`, `drain_journal({seqs})`.

Bearer fast path (local hooks): `GET /fast/<p>/digest`,
`GET /fast/<p>/recall?q=&limit=` (keyword-only, snappy), `POST /fast/<p>/journal`
(write-gated, ≤64KB, `application/json`, object body → `{ok:true}`),
`POST /fast/<p>/curate` (write-gated, 202 + `waitUntil`), `POST /fast/<p>/node`
(write-gated, ≤256KB, same fields as `upsert_node` → `{ok:true, ...UpsertResult}`).

`POST /fast/<p>/node` is the headless write path, and it is load-bearing:
`/mcp/<p>` is OAuth-only, so a background job, a cron fire, or a session whose
MCP connection dropped had no way to persist a finished node and lost it. It
calls the same `upsertNode` + `embedText` as the MCP tool, so history snapshots,
edge validation, and the review cascade all apply. Differences from the tool: no
zod layer in front, so the handler validates the shape itself (required fields,
known node type, `markdown` starting with `---`) and returns `400` rather than
writing a half-formed node; a thrown missing-critical-edge error returns `422`
with nothing written, so the caller keeps its copy and retries after creating the
referenced node; and `review_after` defaults to +7 days, because a node written
without reading the graph first may duplicate one that exists, and the next
curator pass should reconcile it. Callers and fallback order:
`../curator-write-path.md`.

### 3.3 Embeddings (Workers AI bge-m3): verified contract
`wrangler.jsonc`: `"ai": { "binding": "AI" }`; `Env.AI: Ai` (type generated by
`wrangler types`, surfaced via `@cloudflare/workers-types`). Call
`env.AI.run("@cf/baai/bge-m3", { text })`: input key `text`, accepts a single
string; response `{ shape:number[], data:number[][] }`, vector at `data[0]`,
**1024-dim** (assert at runtime; Cloudflare's model page doesn't print it).
`run()` THROWS on error/over-long input (truncate_inputs defaults false), so
`embedText` clips to 8000 chars, wraps in try/catch, returns `null` on any
failure → recall/writes degrade to keyword-only instead of erroring. No API key:
Workers AI bills to the same account, so cloud sessions embed too. bge-m3 is
multi-function; ONLY the `{ text }` path returns `data` (the `{query,contexts}`
rerank path returns `{response}`), so do not reuse the access path.

### 3.4 Vector binding (pgvector via neon http): verified contract
Bind the vector as a STRING `[a,b,c]` (`toVector`) and cast `${vec}::vector(1024)`
(a raw JS array serializes as `{..}` which pgvector rejects). Cosine similarity =
`1 - (embedding <=> $q::vector)`; an `hnsw (embedding vector_cosine_ops)` index
(`nodes_embedding_idx`, in schema.sql + upgrade-003) serves it and needs no
training rows. Hybrid ORDER BY uses TWO params: the vector string for
`::vector` and the raw text for `websearch_to_tsquery('english', …)`.

### 3.5 upsert_node: atomic snapshot + edges + cascade
Everything runs in ONE `sql.transaction([...])` (neon http supports the
non-interactive form). The node write is a data-modifying CTE:
`with prev as (select … from nodes where id=$id), saved as (insert into
node_versions select … from prev) insert into nodes … on conflict do update …`.
Postgres runs all WITH sub-statements against ONE snapshot, so `prev` reads the
OLD row and `node_versions` captures it even though the main statement
overwrites it; first insert → `prev` empty → no version row. `versioned` is
decided by a pre-transaction existence check (deterministic; avoids relying on
RETURNING referencing a CTE). Edge endpoints are pre-checked in JS: a **critical
rel** (`corrects|supersedes|derived-from|premise-of|depends-on`) to a missing
node is a HARD error (never silently dropped, which would break reversible
history + skip the cascade); a **soft rel** to a missing node is skipped +
reported. The correction/supersede cascade is a **recursive CTE** (plain `UNION`
on node id dedups and terminates on cyclic graphs, with no depth counter to defeat)
that flags `review_after=now()` on the transitive closure of dependents:
`derived-from`/`depends-on` (dependent = `from_id`) and `premise-of`
(dependent = `to_id`) of each `to_id` of a just-written `corrects`/`supersedes`
edge. **Curators write the forward edge new→old** (a `superseded-by` from the old
node triggers nothing). `upsert_node` is **partial-preserve on update**: omitted
`frontmatter`/`status`/`pinned`/`review_after` keep their stored value (an LLM
curator won't resend every field, and wiping `review_after` would clear a flag
the cascade just set); `review_after: ""` explicitly clears. A null embedding
(Workers AI failure) is coalesced to the prior vector, so an edit during an AI
outage doesn't drop the node from semantic recall.

### 3.6 Hybrid recall (RRF, status-aware)
`recallNodes` fuses three ranked candidate sets by **reciprocal rank fusion**
(`weight/(60+rank)`, scale-free): an exact `id/title ILIKE` branch (weight 2,
deterministic for ids/code tokens/control totals), full-text (`ts_rank`), and
vector (`<=>` cosine distance, top-`pool` nearest, NO hard similarity floor,
real bge-m3 distances for related text are mid-range, e.g. a genuine match
measured 0.576, so a floor silently drops true hits; RRF + the final `limit`
rank precision instead). **Retired statuses**
(`superseded|deprecated|archived|cleared|resolved|answered`) are excluded from
PRIMARY hits (a reversed decision / cleared blocker / answered question must
never be served as live) but stay reachable via neighbor expansion. Pinned matches get a real boost.
`neighborsOf` returns prioritized 1-hop neighbors (supersedes/corrects first,
then dependency rels, then weaker) so "the note that replaced it / the
constraint it depends on" survives the cap. The bearer fast-path recall stays
keyword-only (no AI latency); the MCP `recall` tool does the hybrid + embedding
+ neighbors.

---

## 4. Local capture + in-session curation (BRAIN_BACKEND=mcp)

**Capture (deterministic, no model).** The `Stop` hook
`.claude/hooks/brain-mcp-capture.mjs` (Node, not bash, which avoids jq-absence,
JSON-quoting, `set -u`, curl-timeout hazards on Windows) reads the Stop JSON on
stdin, gathers git metadata, **redacts** emails / SF org ids (`00D…`) /
`*.salesforce.com` URLs / username-bearing paths, and POSTs one journal entry to
`/fast/<project>/journal` with the bearer token (`fetch` + `AbortSignal.timeout`).
It is a silent exit-0 no-op unless backend=mcp, capture on, token + origin
present, and not inside a curator run (recursion guard). Journal entry shape:
`{source, ts, session, transcript, branch, head, head_subject, changed[],
repo_changed}`. Cloud sessions instead call `append_journal({entry})` each turn
(the model), which the server stamps `source:"cloud"`.

**Curation (in-session).** The main agent dispatches the `brain-curator`
subagent (and, when code changed, `knowledge-curator`) at REMEMBER points and
session wrap. The curator `read_journal` → dedupe (`recall`/`list_nodes`/
`get_node`) → `upsert_node` (honoring every PATTERNS commitment) → `put_digest`
→ `drain_journal({seqs})`. This is the "curator reads the queue and writes tidy
notes through the server, the same way cloud will." Full automatic local
curation (no manual dispatch) is deferred to Phase 3 (server-side worker); Phase
2 deliberately holds NO model key on the server.

---

## 5. Design-review lessons (non-obvious correctness the port must keep)

A 5-agent adversarial review (2026-07-17) confirmed the core mechanics and
caught these; encode them in the toolkit port:
- Hybrid recall must use RRF + an exact-match branch + status-awareness; a raw
  score blend buries exact/id hits and can serve a superseded node as primary.
- `upsert_node` must be one transaction; best-effort edges silently drop the
  critical corrects/supersedes link AND skip the review cascade.
- The review cascade must be transitive (recursive), and `$target` = the `to_id`
  of the corrects/supersedes edge; binding the wrong endpoint flags nothing.
- The capture hook belongs in Node, not bash (Windows: jq absent, `set -u`
  aborts on unset vars, curl needs an explicit timeout).
- The journal write endpoint must be write-role-gated (a read token must 403),
  size-capped, content-type + parse guarded, and PII-redacted at the hook
  (journal rows sit in the cloud DB at rest).
- Journal entries need a canonical shape + `source: local|cloud` discriminator so
  the curator drain step doesn't branch on drift.
- The old git `export` was current-state only. Unit 00 adds edges,
  `node_versions`, digest metadata, and every journal row to the human-review
  export; full recovery still uses the database snapshot and logical dump.

A second adversarial pass on the actual code (2026-07-17) added:
- `upsert_node` must PRESERVE omitted metadata on update and coalesce a null
  embedding to the prior vector: a full-replace wipes tags, un-pins nodes, and
  (worst) clears the `review_after` the cascade just set.
- Include every closed status in the recall-exclusion set (esp. `answered`, or
  answered questions keep surfacing as live).
- The recursive cascade must dedup on node id (plain `UNION`), not on
  `(id, depth)`: a depth column makes `UNION` non-terminating on cycles.
- The journal endpoint size cap must check `Content-Length` first and measure
  bytes (not UTF-16 units) after buffering.
- The Node capture hook must keep git-porcelain paths repo-relative (they are
  already relative, so don't basename-collapse), handle rename (`old -> new`) and
  quoted entries, and keep the git+fetch worst case under the Stop-hook timeout.

---

## 6. NEW-PROJECT SETUP RECIPE (the toolkit-port checklist)

To stand this up for another project `<id>` (lowercase, `-` allowed). No new
Worker, KV, or GitHub OAuth app is needed after the first project.

1. **Neon database (one per project).** Create a Neon project; copy the
   connection string. In the Neon SQL editor run `schema.sql`, then a per-project
   seed copied from `seed.sql` (change the project id/name and the owner
   `grants`). Re-run each `upgrade-00*.sql` once per new DB if starting from an
   older `schema.sql`.
2. **Register the DB with the Worker.** `npx wrangler secret put DATABASE_URL_<ID>`
   (uppercase, `-`→`_`), value = the Neon connection string. (Dashboard is the
   reliable way to set secrets; a chat-run `wrangler secret put` can't prompt and
   has saved empty values.)
3. **Deploy / redeploy.** Ensure `wrangler.jsonc` has the `ai` binding, then
   `cd memory-mcp && npx wrangler deploy`. No embedding API key needed.
4. **Commit `.mcp.json`** at the new repo root pointing at
   `https://second-brain.<subdomain>.workers.dev/mcp/<id>`.
5. **Cloud/web connector.** In claude.ai → Settings → Connectors, add a custom
   connector named for the project, URL = the same `/mcp/<id>` endpoint (the web
   app can't run interactive OAuth from a cloud session, so it needs the
   account-level connector; the committed `.mcp.json` covers the terminal CLI).
6. **Grants.** Insert a `grants` row per person you designate (`read|write|admin`).
   No row = 403. Revoke = delete the row (effective next request).
7. **Local bearer token.** `node scripts/mint-token.mjs <github-login> <label>`
   → writes the raw token to gitignored `.claude/settings.local.json`
   (`BRAIN_MCP_TOKEN`); run the printed hash-insert SQL in Neon.
8. **Settings + hook.** Add to committed `.claude/settings.json`: `env`
   (`BRAIN_MCP_ORIGIN`, `BRAIN_PROJECT=<id>`, `BRAIN_CAPTURE=1`, `BRAIN_BACKEND`
   starts `git`) and the `Stop` hook running `.claude/hooks/brain-mcp-capture.mjs`.
   Copy the hook + the two curator agents (`.claude/agents/brain-curator.md`,
   `knowledge-curator.md`) into the new repo.
9. **Verify then cut over.** Run the DB harness (section 7) against a scratch DB;
   prove read in a local + a cloud session; then flip `BRAIN_BACKEND` to `mcp`
   (test in `settings.local.json` first, then commit to `settings.json`).
10. **Adjust curator scope** per project: the DragonFly curators treat Salesforce
    org DATA as in-scope; a non-Salesforce project edits the "org DATA is wanted"
    and exclusion sections accordingly.

---

## 7. Verification

**DB harness** (`harness/db-harness.mjs`, run with `HARNESS_DATABASE_URL` = a
scratch Neon DB): versioning (update leaves exactly one node_versions row with
OLD content; first insert leaves none), the transitive review cascade sets
review_after on dependents, hybrid recall returns a node by keyword AND by
mock-vector, edges + FK behavior, and export round-trips. Embeddings are mocked
(random 1024-vectors) because Workers AI can't be called outside a Worker.

**Live acceptance (WI-002):** local write persists server-side → recall returns
it → a CLOUD session sees the same fact; updating leaves a node_versions row; a
`corrects` edge flags dependents via review_after; git export round-trips; the
`BRAIN_BACKEND=git` worktree path stays untouched.

---

## 8. Guardrails / rollback

Never store secrets, credentials, or org access details (org URLs, usernames,
org IDs); client names + Salesforce org data are wanted. Everything reversible:
`BRAIN_BACKEND=git` returns to the worktree's git store (keep it, and the git
harness, until the MCP path is proven across a local and a cloud session). Keep
the MCP git-export backup OUT of `<main>/brain/` so the git rollback stays
isolated.

---

## 9. Curator refinements + the toolkit profile model (2026-07-18)

Validated against a second, NON-Salesforce project (an iOS fitness app) whose
knowledge-curation examples matched this exact node shape. Refinements folded into
the DragonFly curators (`.claude/agents/*.md`), to carry into the toolkit port:

- `## Gotcha (do not reintroduce)` is a first-class knowledge-node section (the
  highest-value regression guard), not folded into Open questions.
- Every node UPDATE adds a one-line "What changed vs the previous version".
- Node-shaping judgment: a cross-cutting concept node pins only the 1-2 core files
  (broad covers = noisy drift) and links to the subsystem nodes it touches; a
  change that is both bug fix and new mechanism is written new with the bug folded
  into Why + Gotcha; splitting a node shrinks the parent and rewires `part-of`.
- Cross-curator handoff: a code change that reverses a DECISION is flagged by the
  knowledge-curator so the brain-curator supersedes the decision node.
- TWO drift models: covered-file nodes drift by `git hash-object` SHA; org
  data/config nodes (no file to hash) drift by time + re-query, carry a `verified:`
  date + `review_after`, reconciled by re-querying the org (org query > user said
  > assumed).

**Toolkit port model (WI-002 Phase 5): one engine, swappable project profile.**
The core (server, schema, two curators, node shape, hooks, PATTERNS) is IDENTICAL
for every project. Do NOT fork the system per project type. A thin PROFILE, chosen
at setup by asking the project type (Salesforce org | app | other code | docs),
fills only what differs: data-in-scope, what "verified" means, which drift model
applies, the exclusion list, and the dominant node types. DragonFly is the
reference Salesforce profile; the fitness app is the reference app profile. Setup
stays the section 6 recipe plus the profile choice written into the two curator
files. Rationale: two forked setups are two things to maintain and they drift; one
engine + a small profile is what makes the reuse reliable.

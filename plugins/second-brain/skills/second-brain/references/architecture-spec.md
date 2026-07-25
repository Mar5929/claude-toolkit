# second-brain architecture and process flow

What the system is, why it is built this way, and what happens at runtime. Read
this once before installing so you understand what you are wiring up. The deep
build record (schema internals, MCP tool contracts, design-review lessons) lives
in `server/IMPLEMENTATION.md`; this file is the overview.

## What it is

A durable, cross-session memory + knowledge layer for a project, reachable from
BOTH the terminal Claude Code CLI and cloud/web Claude sessions. It replaces the
older git-repo-based store, which could not be reached from a cloud session.

Four parts:

1. **One shared Cloudflare Worker** (`second-brain`), deployed ONCE for all
   projects. It is the MCP server. Live instance: `https://second-brain.rihm.workers.dev`.
2. **One Neon Postgres database per project** (with the `pgvector` extension).
   Projects are isolated: the Worker routes `/mcp/<project-id>` to that project's
   database via a per-project secret `DATABASE_URL_<ID>`.
3. **GitHub OAuth + a per-project `grants` table.** Sign-in identifies the
   GitHub user; a `grants` row (`read` / `write` / `admin`) authorizes them on a
   project. No row means HTTP 403. Revoking is deleting the row.
4. **Per-project wiring in the repo:** a committed `.mcp.json` (points the CLI at
   `/mcp/<id>`), a `Stop` hook that captures each turn, committed settings, and
   the two curator agents carrying this project's profile.

## Why this shape

- **Cloud reach.** A remote HTTP MCP server is reachable and authenticated from
  local, cloud, and CI. The old git store hit 403 from cloud sessions.
- **Isolation without N servers.** One Worker, one database per project, keeps
  projects separate while there is only one thing to deploy and maintain.
- **One engine, swappable profile.** The server, schema, both curators, the node
  shape, the hooks, and the patterns are IDENTICAL on every project. A thin
  profile (chosen at setup) fills only what differs: data in scope, what
  "verified" means, which drift model applies, exclusions, and dominant node
  types. Two forked setups would drift; one engine plus a small profile is what
  makes reuse reliable.

## The memory graph

Every memory is one **node**. Node types: `decision`, `knowledge`, `preference`,
`rule`, `session`, `entity`, `question`, `blocker`. The `knowledge` (`know-*`)
nodes are the code-why layer, owned by the knowledge-curator; the brain-curator
owns the rest. Nodes carry typed **edges** (`implements`, `depends-on`,
`supersedes`, `corrects`, `part-of`, and so on) so the graph is navigable.

Two design rules that matter most:

- **Supersede + correct, never silently overwrite.** Reversing a decision sets the
  old node `superseded` and adds a `supersedes` edge from the new node; a
  correction adds a `corrects` edge. The server then walks dependents and sets
  `review_after` on each, so nothing built on a changed fact silently rots. Every
  update also snapshots the prior version into history.
- **Two staleness models for knowledge.** A node about source files pins them with
  a `covers:` block holding each file's `git hash-object` SHA; it goes stale when
  the SHA changes. A node about data/config (counts, picklists) has no file to
  hash, so it goes stale by time and is reconciled by re-verifying (for Salesforce:
  re-querying the org). Which applies is set by the project profile.

## Retrieval

`recall(query)` is hybrid: keyword search AND vector search (Workers AI
`@cf/baai/bge-m3`, 1024-dim embeddings), fused with Reciprocal Rank Fusion, and
status-aware (superseded nodes rank down). There is no hard vector-distance floor
(an over-strict floor silently dropped good matches). Results include linked
neighbors, so one hit pulls in its context.

## Runtime process flow (what should happen each session)

```
  session start
      |
      v
  SessionStart hook auto-injects the digest  (curated, < ~250 lines; the "what
  you need to know"); the agent can also call get_digest directly
      |
      v
  each prompt: UserPromptSubmit hook auto-injects keyword recall for that prompt;
  the main agent also calls recall(...) for a deeper semantic search when needed
      |
      v
  REMEMBER points: main agent dispatches the brain-curator to upsert nodes
      |
      v
  code changed: main agent dispatches the knowledge-curator to refresh know-* nodes
      |
      v
  session ends -> Stop hook (brain-mcp-capture.mjs) posts ONE redacted turn record
                  to /fast/<project>/journal  (deterministic, no model, best-effort)
      |
      v
  next curator pass: read_journal -> extract durable facts -> upsert_node (deduped,
                     linked) -> put_digest (if the headline changed) -> drain_journal
```

Key point: the **Stop hook only captures** (a cheap journal write). It never runs
a model and never writes nodes. Turning raw journal entries into clean, linked,
deduped nodes is a separate **in-session curator** dispatch. This keeps capture
safe and free even in a teammate checkout or a cloud session with no token.

## The two curators

- **brain-curator** owns all memory except the code-why layer. Modes: CAPTURE
  (drain the journal into nodes), RECALL, REMEMBER, REVIEW SWEEP. Owns the digest.
- **knowledge-curator** owns only `type: knowledge` (`know-*`) nodes: the reason
  code exists, pinned to files via `covers:` SHAs. Modes: DOCUMENT (after code
  changed), EXPLAIN, COVERAGE. Never writes the digest or non-knowledge nodes.

They never run at the same time. Each carries a `## Project profile` section and
the connector-named half of its `tools:` line, the only project-specific parts,
filled at setup from the chosen profile.

**A curator can lose its write path, and must not lose the note with it.** The
MCP connection can drop mid-session, and a background job or cron fire may never
have had one, so a curator can finish a full pass with nowhere to put the result.
Two things keep that from costing the work: `POST /fast/<id>/node` persists a
node with the bearer token and no OAuth, and `.claude/memory-outbox/` holds
anything that still cannot be sent, committed so it travels to a session that
can. `curator-write-path.md` is the canonical description of the routes, the
fallback ladder, and the reporting rule that keeps a silent failure from reading
as success.

## What the second-brain does NOT do

It records the *why* of code and the project's memory. It does NOT model
inter-component structural edges, so it cannot answer "change this field, what
breaks three hops out?" For code/metadata projects that need field-level impact
analysis, a compiled structural dependency graph belongs alongside it (toolkit
backlog A1). Do not claim impact analysis this layer alone cannot do.

## Guardrails

Never store secrets, credentials, or access details (service URLs, usernames, org
IDs, connection strings). The capture hook already redacts emails, Salesforce
URLs, and org IDs from journal metadata. What DATA is in scope is set by the
project profile. Everything is reversible: the `git`-export backup and the
`BRAIN_BACKEND` flag exist so a project can fall back if needed.

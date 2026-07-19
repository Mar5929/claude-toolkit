---
name: second-brain
description: >-
  Install the portable second-brain memory and knowledge architecture in the
  current project: a remote MCP memory server (one shared Cloudflare Worker + a
  per-project Neon Postgres/pgvector database + GitHub OAuth) holding a typed-node
  knowledge graph curated by two background agents, with hybrid keyword+vector
  recall, a digest injected each session, drift-pinned knowledge nodes, per-turn
  capture, and a self-verifying database harness. Reachable from BOTH the terminal
  CLI and cloud/web Claude sessions. Use when the user wants durable cross-session
  memory for a project, or says "set up the memory architecture", "implement the
  second brain", "add long-term memory to this project", "install the memory
  system from my toolkit", or "/second-brain". This skill INSTALLS a fully
  specified system from bundled reference implementations; a short project-type
  question picks the profile, and there is no design work to do.
---

# second-brain: install durable cross-session memory (MCP architecture)

You are installing a fully specified, proven system, not designing one. Read
`references/architecture-spec.md` end to end first: it explains what the system is
and what should happen at runtime. Then follow the steps below. The bundled
`references/` holds working implementations (the deployable server, the two
curators, the capture hook, the templates, the four profiles) that passed a 30+
assertion harness. Copy them and fill placeholders; do not redesign them. If you
find a real defect, fix it, keep the harness green, and tell the user to port the
fix back to the toolkit.

## What gets installed

- **Once, ever:** a shared Cloudflare Worker MCP server + a GitHub OAuth app +
  Workers AI embeddings. For Mike this already exists at
  `https://second-brain.rihm.workers.dev`.
- **Per project:** a Neon database, a committed `.mcp.json`, a cloud connector, an
  access grant, a capture hook + settings, and the two curator agents carrying
  this project's profile.

## Step 0: Orient, then choose the path and the profile

1. Look at the host project. Is it a git repo? Does it ALREADY have a memory
   system (a `brain/` or `memories/` dir, a curator agent, or a `.mcp.json` with a
   `second-brain` server)? If one already exists, STOP and reconcile with the user
   before installing a second.
2. **Does the shared Worker exist yet?** For Mike: yes. If not, do
   `references/first-time-infra.md` ONCE, first.
3. **Ask the project type. This picks the profile:** Salesforce org, app (iOS or
   web), other code, or docs-only. Map the answer to `references/profiles/<type>.md`.
   Confirm the project id (`<ID>`, lowercase, hyphens allowed) with the user.

## Step 1: First-time infrastructure (skip if the shared Worker exists)

Follow `references/first-time-infra.md`. One time, ever. It produces the
`BRAIN_MCP_ORIGIN` that every project uses.

## Step 2: Per-project onboarding

Follow `references/setup-recipe.md` end to end with the chosen `<ID>` and profile.
It creates the database, registers it with the Worker, wires `.mcp.json` + the
connector + the grant + the local token + the capture hook + settings, and
installs the two curators with the profile filled in.

## Step 2b: Structural layer (Salesforce projects, or on request)

For a Salesforce project (the profile that names it), or whenever the owner
wants mechanical impact analysis, follow `references/structural-layer.md`: copy
`references/structural-layer/` into the project as `tools/kb/`, gitignore the
build artifacts, ask the owner the storage question (`GRAPH_BACKEND`, recommend
local), and paste the structural-layer section into the project's
knowledge-curator. It has its own verify step (test suite `OK` + a build).

## Step 3: Verify (do not skip; do not claim success without this)

Per the recipe's verify step: the database harness must end `FAIL: 0` against a
scratch database, and a read/write smoke test must show a fact written locally
recalled in a second local session AND in a cloud session.

## Step 4: Document and populate

- Write the ground rules into the project's `CLAUDE.md` (recipe Step 9).
- Offer the first population (recipe Step 10): brain-curator REMEMBER for the owner
  profile and standing decisions; knowledge-curator COVERAGE then DOCUMENT in
  batches, if the knowledge layer is on. Never sweep a whole codebase in one pass.

## How the installed system runs (tell the user)

- The **digest** (curated, injected via `get_digest`) is what a new session reads
  first.
- To remember or recall, the main agent delegates to the **brain-curator**; to
  explain or document why code exists, it delegates to the **knowledge-curator**.
  They never run at the same time.
- The **Stop hook** captures each turn cheaply to a journal; curators later drain
  it into clean, linked, deduped nodes. Capture is best-effort and safe even with
  no token (a teammate checkout or a cloud session).
- **Impact analysis lives in the structural layer, not here.** The memory layer
  alone cannot answer "change this field, what breaks three hops out?" — the
  bundled compiled dependency graph (Step 2b, `references/structural-layer.md`)
  answers that mechanically. If the structural layer is not installed, do not
  promise impact analysis.

## Reference map

- `references/architecture-spec.md` - what it is, why, and the runtime process flow.
- `references/first-time-infra.md` - the one-time shared-server setup.
- `references/setup-recipe.md` - the exact per-project steps with expected output.
- `references/profiles/*.md` - the four project profiles (fill the curators).
- `references/agents/*.md` - the two curator agent templates.
- `references/hooks/brain-mcp-capture.mjs` - the Stop-hook capture.
- `references/templates/{settings.json, mcp.json}` - the wiring templates.
- `references/structural-layer.md` - installing the compiled dependency graph.
- `references/structural-layer/` - the graph tool itself (parser, impact query,
  connection diff, self-check, storage selector, tests; see its README.md).
- `references/server/` - the deployable Worker: `src/`, `schema.sql`, `seed.sql`,
  `upgrade-00*.sql`, `harness/`, `scripts/mint-token.mjs`, plus `PATTERNS.md` and
  `IMPLEMENTATION.md` (the deep build record).

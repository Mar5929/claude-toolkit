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
- **Per surface:** a bearer token. Each machine gets one in the gitignored
  `.claude/settings.local.json`; each Claude Code cloud environment gets one as
  an environment variable plus the Worker's host on its allowed-domains list
  (setup recipe Step 6b). Skip this and that surface records nothing, silently.

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

## Step 2b: Structural layer (impact analysis, on request)

The structural layer is the mechanical "what connects to what" companion to the
prose knowledge layer: it answers "if I change this, what breaks N steps out?"
Install it whenever the owner wants that, and pick the tool by project type.

- **Salesforce:** follow `references/structural-layer.md`, the bundled compiled
  `force-app/` graph. Copy `references/structural-layer/` into the project as
  `tools/kb/`, gitignore the build artifacts, ask the owner the storage question
  (`GRAPH_BACKEND`, recommend local), and paste the structural-layer section into
  the knowledge-curator. It has its own verify step (test suite `OK` + a build).
- **Every other project type (Swift/iOS, web, backend, generic):** follow
  `references/structural-layer-graphify.md`. Graphify parses the code locally with
  tree-sitter (no API key, nothing leaves the machine) and answers the same impact
  questions. It is optional the same way, so add it only when "what calls this?"
  is a real, recurring question; small codebases are fine on the compiler + tests
  + `covers:` pins.

## Step 2c: Existing codebase? Backfill the knowledge layer (any project type)

If the project already has meaningful code, the `know-*` layer must not start
empty. Follow `references/kb-backfill.md`:

- Produce the subsystem map: on Salesforce, the compiled graph's
  `query_graph.py --map` (Step 2b); everywhere else, the bundled
  `references/kb-backfill/subsystem_map.py` (deterministic, offline, works
  for web, iOS, and generic repos).
- Seed `know-*` nodes with the knowledge-curator in batches of 5-10
  subsystems, busiest first (COVERAGE report first; never the whole codebase
  in one pass).
- Install the ongoing-freshness Stop hook and rule so later code changes
  surface drift to the knowledge-curator by default. Salesforce projects
  that completed Step 2b already have their freshness hook; a project
  installs exactly one, never both.

## Step 3: Verify (do not skip; do not claim success without this)

Per the recipe's verify step: the database harness must end `FAIL: 0` against a
scratch database, and a read/write smoke test must show a fact written locally
recalled in a second local session AND in a cloud session.

## Step 4: Document and populate

- Write the ground rules into the project's `CLAUDE.md` (recipe Step 9).
- Offer the first population (recipe Step 10): brain-curator REMEMBER for the owner
  profile and standing decisions; knowledge-curator COVERAGE then DOCUMENT in
  batches, if the knowledge layer is on. Never sweep a whole codebase in one pass.
  On an existing codebase, the knowledge side IS the Step 2c backfill: drive it
  from the subsystem map per `references/kb-backfill.md`.

## How the installed system runs (tell the user)

- The **digest** (curated, < ~250 lines) is what a new session reads first. A
  `SessionStart` hook auto-injects it at session start; the agent can also call
  `get_digest` directly.
- A `UserPromptSubmit` hook auto-recalls memory for each prompt (keyword-only,
  best-effort) and injects the top matches before the agent answers; the agent
  can also call `recall` for a deeper semantic search. Both injection hooks no-op
  without a token and honor `BRAIN_INJECT` (recall also honors `BRAIN_RECALL`).
- To remember or recall, the main agent delegates to the **brain-curator**; to
  explain or document why code exists, it delegates to the **knowledge-curator**.
  They never run at the same time.
- The **Stop hook** captures each turn cheaply to a journal; curators later drain
  it into clean, linked, deduped nodes. Capture is best-effort and safe even with
  no token (a teammate checkout), but "safe" means silent, not working: a surface
  without a token captures NOTHING while looking normal. Wire every surface
  (Step 6 for machines, Step 6b for cloud environments) and verify per Step 8.
- **Impact analysis lives in the structural layer, not here.** The memory layer
  alone cannot answer "change this field, what breaks three hops out?"; the
  bundled compiled dependency graph (Step 2b, `references/structural-layer.md`)
  answers that mechanically. If the structural layer is not installed, do not
  promise impact analysis.

## Reference map

- `references/architecture-spec.md` - what it is, why, and the runtime process flow.
- `references/first-time-infra.md` - the one-time shared-server setup.
- `references/setup-recipe.md` - the exact per-project steps with expected output.
- `references/profiles/*.md` - the four project profiles (fill the curators).
- `references/agents/*.md` - the two curator agent templates.
- `references/hooks/` - five hooks: `brain-mcp-capture.mjs` (Stop capture),
  `brain-mcp-session-curate.mjs` (SessionEnd: tells the server the conversation
  is over so it curates that session as one finished arc; this is the default
  curation trigger), `brain-mcp-session-digest.mjs` (SessionStart digest
  injection), `brain-mcp-recall.mjs` (UserPromptSubmit recall injection), and
  `knowledge-curator-nudge.mjs` (PostToolUse: after a push or PR-create, remind
  the session to run the knowledge-curator; local, no server call, no token);
  see its README.
- `references/templates/{settings.json, mcp.json}` - the wiring templates.
- `references/structural-layer.md` - installing the compiled dependency graph
  (Salesforce).
- `references/structural-layer-graphify.md` - the non-Salesforce structural layer:
  install and use graphify (a local tree-sitter code graph; Swift, web, generic).
- `references/structural-layer/` - the graph tool itself (parser, impact query,
  connection diff, self-check, storage selector, tests; see its README.md).
- `references/kb-backfill.md` - one-time knowledge backfill + ongoing freshness
  for existing codebases, any project type.
- `references/kb-backfill/` - the subsystem-map script and the generic
  freshness Stop hook.
- `references/server/` - the deployable Worker: `src/`, `schema.sql`, `seed.sql`,
  `upgrade-00*.sql`, `harness/`, `scripts/mint-token.mjs`, plus `PATTERNS.md` and
  `IMPLEMENTATION.md` (the deep build record).

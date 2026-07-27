# second-brain plugin

The toolkit's project memory system. It is currently in a controlled transition:

- **V1 is legacy and contained.** It uses a shared Cloudflare Worker, one Neon
  Postgres/pgvector database per project, GitHub OAuth, typed graph nodes,
  curator agents, automatic capture, and hybrid recall. It must not be installed
  into another project. The contained Worker source fails closed in read-only
  mode and labels reads `legacy/advisory`.
- **V2 is specified but not shipped.** Its Git-native architecture is under
  [`docs/second-brain-v2/`](../../docs/second-brain-v2/README.md). There is no v2
  installer or project migration path yet.

The legacy source and documentation remain in this plugin as implementation and
migration evidence. Their presence does not make v1 production-ready or v2
available.

## Skills

- **second-brain** (`/second-brain`): during containment, refuses new v1
  installations. For an existing v1 project, it can explain and offer the
  reversible project settings that stop automatic capture, recall, and curator
  triggers without deleting anything.
- **remember** (`/remember`): temporarily returns the structured
  `v1_read_only` result. It does not dispatch curators, write the journal, or
  flush outbox files.

## Unit 00 containment

The Worker uses `BRAIN_V1_WRITE_MODE`. Missing, empty, and unknown values fail
closed as `read-only`. Only the explicit value `write` restores server writes.

Blocked MCP writes:

- `upsert_node`
- `put_digest`
- `append_journal`
- `drain_journal`

Blocked bearer routes:

- `POST /fast/<project>/node`
- `POST /fast/<project>/journal`
- `POST /fast/<project>/curate`

They return:

```json
{
  "outcome": "skipped",
  "reason": "v1_read_only",
  "next_action": "retain the proposal locally or use the v2 migration path"
}
```

Bearer writes use HTTP 423. MCP writes return the same JSON as an error.
Scheduled curation and direct session curation make zero model calls. Deliberate
recall remains readable but does not update recall counters while contained.

Existing projects should set:

```json
{
  "BRAIN_V1_WRITE_MODE": "read-only",
  "BRAIN_CAPTURE": "0",
  "BRAIN_CURATE_ON_END": "0",
  "BRAIN_RECALL": "0",
  "BRAIN_KC_NUDGE": "0"
}
```

The live Worker separately needs `BRAIN_V1_WRITE_MODE=read-only` and
`AUTO_CURATE=0`. Source changes in this repository do not deploy that Worker.

## Preserved reads and exports

Scoped `get_digest`, deliberate `recall`, `get_node`, `list_nodes`,
`read_journal`, and `export` reads remain available. Every read is labeled
`legacy/advisory`, meaning it is evidence to verify against Git, not current
truth.

The freeze export includes project identity, current nodes, edges, revision
history, digest metadata, and every journal row without draining anything.
Database-native snapshots and `pg_dump` are still required for full recovery.

The separately approved live procedure is documented in
[`v1-freeze-and-export.md`](skills/second-brain/references/v1-freeze-and-export.md).
It explicitly preserves databases, journal state, local caches, hooks, agents,
tokens, and outbox files.

## What remains from v1

The references under `skills/second-brain/references/` document the legacy:

- deployable Worker and database schema;
- profile-specific curator templates;
- capture, recall, digest, scope, outbox, and work-item hooks;
- Neon/MCP setup recipe;
- drift-pinned knowledge layer;
- optional Salesforce and graphify structural indexes.

These files are retained for auditing and migration. The `second-brain` skill
is the current control point and says not to install them.

## Relationship to project-init

`project-init` now marks memory and knowledge Gates 3 and 4 as deferred during
containment. `project-sync` must not install v1 or claim v2 is available. It may
identify an existing v1 installation and, with approval, apply only the
reversible containment settings.

## Verification

From `skills/second-brain/references/server/`:

```sh
npm ci
npm run check
```

`npm run check` runs TypeScript validation and the no-database containment
harness. The existing database and curation harnesses remain available for a
separately configured scratch Neon database.

## Maintaining this plugin

A content change bumps both plugin manifests and the marketplace metadata
version. Keep this README, the root README, `docs/toolkit-map.md`,
`project-init`, and `project-sync` aligned so none of them mistakes v2
specifications for shipped functionality.

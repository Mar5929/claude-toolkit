# Archived second-brain v1 Worker

This directory is historical implementation evidence for the retired v1
Cloudflare Worker and Neon memory service.

Do not deploy, synchronize, register, seed, restore, export, or connect it to a
project. V2 does not import its data.

The source remains because it records the behavior and failures that informed
the Git-native v2 architecture. Accidental deployment is blocked in two ways:

- the default `wrangler.jsonc` filename is absent; and
- `package.json` has no development, type-generation, or deployment script.

`wrangler.v1-archived.jsonc` is retained only to show the historical binding
shape. Existing live Worker and Neon resources remain untouched until the owner
separately approves deletion.

Historical no-database checks may still be run locally:

```sh
npm ci
npm run check
```

The database and curation harnesses require a scratch Neon database and are not
part of normal retirement validation.

## What is in here

Kept as a record of what the retired service did, not as anything to run.

| Path | What it was |
|---|---|
| `src/index.ts` | The Worker entry point and HTTP routes. |
| `src/mcp.ts` | The memory tools the old MCP server exposed to a session. |
| `src/db.ts` | Neon queries and the per-project database routing. |
| `src/embed.ts` | Embedding calls behind the old semantic search. |
| `src/curate.ts` | The background curator write path. |
| `src/containment.ts` | The checks that stopped one project reading another's store. |
| `src/github-handler.ts` | GitHub OAuth for per-project access. |
| `src/types.ts` | Shared types for all of the above. |
| `schema.sql`, `seed.sql`, `upgrade-00*.sql` | The database shape and its migrations. |
| `harness/db-harness.ts`, `harness/curate-harness.ts` | Checks that needed a scratch database. |
| `harness/containment-harness.ts` | The no-database check `npm run check` runs. |
| `scripts/mint-token.mjs` | Minted a per-project access token for the old service. |
| `wrangler.v1-archived.jsonc` | The historical deployment binding shape, deliberately misnamed so nothing picks it up. |
| `IMPLEMENTATION.md` | The build record: what was actually implemented, in what order, and why. |
| `PATTERNS.md` | The twelve real conversation patterns the memory system was designed against. |

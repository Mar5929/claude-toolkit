# second-brain: remote MCP server for cross-project memory

Phase 1 of WI-002 (see `work-items/WI-002-memory-knowledge-rearchitecture.md`).
One Cloudflare Worker that fronts long-term memory over MCP with GitHub
sign-in. Each Claude project gets its OWN Neon Postgres database (owner
decision, 2026-07-15: easier to separate and archive per project); the Worker
finds a project's database through a per-project secret named
`DATABASE_URL_<PROJECT_ID>` (uppercased, `-` becomes `_`). Reachable from
every Claude Code session type: local, cloud, CI.

## What it serves

| Surface | Auth | Purpose |
|---|---|---|
| `POST /mcp/<project-id>` | OAuth (GitHub) | MCP endpoint. Reads: `get_digest`, `recall`, `get_node`, `list_nodes`, `export`. Writes (role write/admin): `upsert_node`, `put_digest`, `append_journal`, `read_journal`, `drain_journal`. |
| `GET /fast/<project-id>/digest` | Bearer token | Local hook fast path: digest at session start, no browser. |
| `GET /fast/<project-id>/recall?q=...` | Bearer token | Local hook fast path: keyword recall per prompt. |
| `POST /fast/<project-id>/journal` | Bearer token (write role) | Local Stop hook: append a redacted turn record to the capture journal. |
| `/authorize`, `/callback`, `/token`, `/register` | n/a | OAuth plumbing (workers-oauth-provider + GitHub). |

**Phase 2 (writable + local capture) is implemented; see `IMPLEMENTATION.md` for
the full record and the new-project setup recipe.** Writes populate embeddings
(Workers AI `@cf/baai/bge-m3`, 1024-dim) and recall is hybrid (full-text +
pgvector), status-aware, with linked-neighbor expansion.

Access model: sign-in only proves who you are (GitHub login). Every request is
then checked against the `grants` table for that project id. No grant row = 403.
Revoke = delete the row; it takes effect on the next request.

## One-time setup

1. **Neon database (one per project)**
   - Create a Neon project for THIS project (free tier is fine), copy the
     connection string.
   - Run `schema.sql`, then the project's seed (for DragonFly: `seed.sql`,
     which creates project `dragonfly` and grants `Mar5929` admin) in the
     Neon SQL editor.

2. **GitHub OAuth app** (github.com > Settings > Developer settings > OAuth Apps > New)
   - Homepage URL: `https://second-brain.<your-subdomain>.workers.dev`
   - Authorization callback URL: `https://second-brain.<your-subdomain>.workers.dev/callback`
   - Copy the Client ID into `wrangler.jsonc` (`GITHUB_CLIENT_ID`).
   - Generate a client secret; set it in step 4.

3. **KV namespace** (stores OAuth grants/tokens for workers-oauth-provider)
   ```sh
   npx wrangler kv namespace create OAUTH_KV
   ```
   Put the returned id into `wrangler.jsonc`.

4. **Secrets**
   ```sh
   npx wrangler secret put DATABASE_URL_DRAGONFLY
   npx wrangler secret put GITHUB_CLIENT_SECRET
   ```

5. **Deploy**
   ```sh
   npm install
   npx wrangler deploy
   ```
   Note the deployed URL and put it into the repo-root `.mcp.json`
   (replace `REPLACE-SUBDOMAIN`).

6. **Local fast-path token** (optional but recommended)
   ```sh
   node scripts/mint-token.mjs Mar5929 mike-laptop
   ```
   Run the printed SQL in Neon; store the raw token in
   `.claude/settings.local.json` (never committed) as `BRAIN_MCP_TOKEN`.

## Verify (Phase 1 acceptance)

- `claude mcp list` in the DragonFly repo shows `second-brain`; first use
  opens the GitHub sign-in.
- `get_digest` returns the seeded digest; `recall` returns nodes once imported.
- A GitHub account with no grant row gets a 403 from `/mcp/dragonfly` (auth test).
- Delete a grant row, confirm access drops on the next request (revoke test).
- `curl -H "Authorization: Bearer $BRAIN_MCP_TOKEN" .../fast/dragonfly/digest`
  returns the digest (fast-path test).
- The same `.mcp.json` works from a cloud Claude Code session on this repo
  (the case that fails today with the git store).

## Adding another project later

1. Create a new Neon project for it; run `schema.sql` plus a seed (copy
   `seed.sql`, change the project id/name/grants).
2. Store its connection string as a new secret:
   `npx wrangler secret put DATABASE_URL_<PROJECT_ID>` (uppercase, `-` -> `_`).
3. Commit a `.mcp.json` in that repo pointing at `/mcp/<project-id>`.
No new Worker, KV namespace, or GitHub OAuth app is needed. Schema upgrades
must be run once per project database.

## Design notes

- `nodes.markdown` stores the full node file text (frontmatter + body), so
  `export` reproduces the exact markdown files for the git backup. The git
  store (`DragonFly-brain`) stays as backup/rollback until the MCP path is
  proven; `BRAIN_BACKEND=git|mcp` selects the backend in the hooks.
- `recall` is Postgres full-text search with an ILIKE fallback, a small boost
  for pinned nodes, and usage tracking (recall_count / last_recalled_at). The
  `embedding vector(1024)` column is in place; semantic search plugs into
  `recallNodes` in Phase 2 when writes (upsert_node) start populating it, and
  the `edges` table enables graph expansion (return a match plus its linked
  neighbors) once imports populate it.
- Phase 2 adds `upsert_node` / `append_journal` tools; Phase 3 adds the
  server-side curation worker. Curation is session-scoped: the SessionEnd hook
  POSTs `/fast/<project>/curate` when a conversation ends, and the Workers cron
  is only a backstop for sessions that died without it (see IMPLEMENTATION.md).
- Never store secrets, credentials, or customer/tenant record data in memory.
  Client names are OK. Same exclusion rules as the curators.

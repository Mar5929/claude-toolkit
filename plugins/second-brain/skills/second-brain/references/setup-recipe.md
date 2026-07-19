# Per-project setup recipe

Stand up the second-brain for one project. Follow these steps in order. Each step
says what to do, the exact command or text, and what success looks like. This is
the path a new project takes; the shared Worker already exists (if it does not,
do `first-time-infra.md` once, first).

**Before you start, confirm you have:**
- The shared server origin (`BRAIN_MCP_ORIGIN`). For Mike: `https://second-brain.rihm.workers.dev`.
- A project id (`<ID>`): lowercase, hyphens allowed (e.g. `dragonfly`, `anchor`).
  It appears in the `/mcp/<ID>` endpoint and the `DATABASE_URL_<ID>` secret.
- The chosen project profile file (`references/profiles/<type>.md`).
- Access to Neon (hosted Postgres), Cloudflare (for the one secret), and this
  project's git repo.

Paths below are relative to this skill's `references/` unless absolute.

---

## Step 1: Create the project's Neon database

Neon is hosted Postgres. Each project gets its own database so projects stay
isolated.

1. In the Neon console, create a new project (name it for the project).
2. Copy its connection string (starts with `postgres://` or `postgresql://`).
   Keep it handy; it is a secret.
3. Open the Neon SQL editor for that database and run, in order:
   - the full contents of `server/schema.sql`
   - each `server/upgrade-00*.sql` once, in number order
   - a per-project seed: copy `server/seed.sql`, replace `<PROJECT_ID>`,
     `<PROJECT_NAME>`, and `<OWNER_GITHUB_LOGIN>`, then run it.

**Success looks like:** the tables (`projects`, `grants`, `nodes`, `digests`,
`journal`, `node_versions`, and the vector index) exist, and a row for your
project is in `projects` and `grants`. `schema.sql` enables the `pgvector`
extension; if Neon reports it is not available, enable it in the Neon dashboard
and re-run.

## Step 2: Register the database with the shared Worker

The Worker finds a project's database through a secret named `DATABASE_URL_<ID>`
(uppercase, hyphens become underscores; e.g. `DATABASE_URL_ANCHOR`).

- Reliable path: Cloudflare dashboard > your `second-brain` Worker > Settings >
  Variables and Secrets > add a secret `DATABASE_URL_<ID>` = the Neon connection
  string from Step 1.
- Or from the `server/` directory: `npx wrangler secret put DATABASE_URL_<ID>`
  and paste the value when prompted.

**Success looks like:** the secret appears in the Worker's secrets list. You do
NOT redeploy the Worker for a new project; the secret is live on the next request.
(Only the very first infrastructure setup deploys the Worker.)

## Step 3: Commit `.mcp.json` at the project root

This points the terminal Claude Code CLI at this project's endpoint.

- Copy `templates/mcp.json` to the project root as `.mcp.json`.
- Replace `<BRAIN_MCP_ORIGIN>` and `<PROJECT_ID>`; delete the `_comment` key.
- Commit it.

**Success looks like:** `.mcp.json` contains
`"url": "<origin>/mcp/<ID>"` and is committed.

## Step 4: Add the cloud/web connector

A cloud or web Claude session cannot run interactive OAuth from inside a session,
so it needs an account-level connector (the committed `.mcp.json` only covers the
terminal CLI).

- In claude.ai: Settings > Connectors > add a custom connector.
- Name it for the project; URL = the same `<origin>/mcp/<ID>`.

**Success looks like:** the connector appears and, after you authorize it once
with GitHub, a cloud session can call the `second-brain` tools for this project.

## Step 5: Grant access

Sign-in identifies a GitHub user; a `grants` row authorizes them. The seed in
Step 1 already granted the owner `admin`. For anyone else:

- In the Neon SQL editor, run:
  ```sql
  insert into grants (project_id, github_login, role)
  values ('<ID>', '<their-github-login>', 'read')  -- or 'write' / 'admin'
  on conflict (project_id, github_login) do nothing;
  ```

**Success looks like:** each person who should have access has a row. No row means
that person gets HTTP 403. Deleting a row revokes access on the next request.

## Step 6: Mint the local capture token

The Stop hook posts turn records with a bearer token. This token is a secret and
lives only in the project's gitignored `.claude/settings.local.json`.

- From the `server/` directory:
  ```
  node scripts/mint-token.mjs <owner-github-login> "<a label, e.g. mike-laptop>"
  ```
- It writes the raw token into `.claude/settings.local.json` as `BRAIN_MCP_TOKEN`,
  and prints an SQL insert (the token's hash). Run that SQL in the Neon editor so
  the server recognizes the token.

**Success looks like:** `.claude/settings.local.json` has a `BRAIN_MCP_TOKEN`, and
the hash row is in the database. Confirm `.claude/settings.local.json` is
gitignored (add `/.claude/settings.local.json` to `.gitignore` if not).

## Step 7: Install the hook, settings, and the two curators

1. Copy `hooks/brain-mcp-capture.mjs` to the project's `.claude/hooks/`.
2. Merge `templates/settings.json` into the project's committed
   `.claude/settings.json`: the `env` block and the `Stop` hook. Fill
   `<BRAIN_MCP_ORIGIN>` and `<PROJECT_ID>`; drop the `_comment` key. Do NOT
   clobber existing `env` or `hooks` entries (a project may already have a guard
   hook); add to them.
3. Copy `agents/brain-curator.md` and `agents/knowledge-curator.md` to the
   project's `.claude/agents/`.
4. **Fill the profile.** In EACH copied curator, replace the `## Project profile`
   section's `<...>` placeholders using the two paste-blocks in your chosen
   `profiles/<type>.md`, and set `<APP_NAME>` to the real project name.

**Success looks like:** `.claude/settings.json` has `BRAIN_BACKEND=mcp`,
`BRAIN_MCP_ORIGIN`, `BRAIN_PROJECT=<ID>`, `BRAIN_CAPTURE=1`, and the Stop hook;
both curators exist with NO `<...>` placeholders left in their Project profile.

## Step 8: Verify (do not skip; do not claim success without this)

1. **Engine test (db harness).** Create a throwaway scratch Neon database, run
   `server/schema.sql` + the `upgrade-00*.sql` in it, then from `server/`:
   ```
   HARNESS_DATABASE_URL="<scratch-db-connection-string>" npx tsx harness/db-harness.ts
   ```
   Must end `FAIL: 0`. This proves versioning, the review cascade, hybrid recall,
   edges, and export round-trip. (It mocks embeddings, so it needs no Worker.)
2. **Read/write smoke test (this project).** In a terminal Claude Code session in
   the project, dispatch the brain-curator to REMEMBER a small test fact, then in
   a fresh session dispatch RECALL and confirm it comes back. Then confirm a cloud
   session (via the Step 4 connector) sees the same fact.

**Success looks like:** harness `FAIL: 0`, and the test fact written locally is
recalled in a second local session AND in a cloud session.

## Step 9: Document it in the project's CLAUDE.md

Record the ground rules so every future session knows:
- Only the two curators write to the store; sessions never hand-edit memory.
- The store lives in the remote `second-brain` server; this project's endpoint is
  `<origin>/mcp/<ID>`.
- How to ask for memory: "delegate to the brain-curator" (recall/remember) and
  "delegate to the knowledge-curator" (why-does-this-code-exist).
- Capture is on (the Stop hook); the digest is injected via `get_digest`.
- The first digest is thin until a few curated batches have run.

## Step 10: Offer the first population

The store starts empty. Offer to seed it:
- **Memory side:** dispatch the brain-curator in REMEMBER mode to capture the
  owner profile, working agreements, and any standing decisions.
- **Knowledge side** (if the knowledge layer is on): dispatch the
  knowledge-curator for a COVERAGE report first (a read-only ranked list of
  undocumented subsystems), let the owner pick priorities, then DOCUMENT in
  batches of 5-10 subsystems per pass. Never sweep the whole app in one pass.

---

## Quick checklist

```
[ ] 1. Neon DB created; schema + upgrades + per-project seed run
[ ] 2. DATABASE_URL_<ID> secret set on the Worker
[ ] 3. .mcp.json committed at project root
[ ] 4. cloud/web connector added and authorized
[ ] 5. grants row per person
[ ] 6. local BRAIN_MCP_TOKEN minted; hash row inserted; settings.local gitignored
[ ] 7. capture hook + settings merged; both curators installed with the profile filled
[ ] 8. db harness FAIL: 0; read/write smoke test passes local + cloud
[ ] 9. CLAUDE.md ground rules written
[ ] 10. first memory/knowledge population offered
```

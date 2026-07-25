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

- In claude.ai: **Customize > Connectors**, click **+**, choose **Add custom
  connector**.
- Name it for the project; URL = the same `<origin>/mcp/<ID>`. Click **Add**,
  then **Connect** and authorize with GitHub.

**Write the connector's name down. Step 7 needs it twice.** The connector name becomes
part of the MCP tool names in every cloud session (`Anchor Brain` gives
`mcp__Anchor_Brain__upsert_node`, spaces and hyphens turned into underscores),
while the terminal reaches the same server as `mcp__second-brain__...` via
`.mcp.json`. A curator agent's `tools:` line is an allowlist, so one that names
only the terminal shape has NO brain tools in a cloud session: it cannot write,
cannot read, and cannot tell you why. Both curators therefore carry both name
shapes, and the connector-named half is filled in at Step 7. Details:
`curator-write-path.md`.

The same name goes in `.claude/settings.json` as `BRAIN_CONNECTOR`, because
connectors are attached per Claude ACCOUNT rather than per repo: every project's
brain is visible in every session, named after its own project, with nothing
marking the foreign ones. Declaring this project's connector is what lets the
scope guard deny a call to another project's store instead of only asking about
it. Details: `brain-scope.md`.

**Success looks like:** the connector appears and, after you authorize it once
with GitHub, a cloud session can call the `second-brain` tools for this project,
and you have its exact name recorded for Step 7.

This connector covers the **MCP tools**. It does NOT switch on automatic capture
or digest injection in Claude Code cloud sessions: those run the hooks, which
need Step 6b. Do both.

**Never** add `"headers": {"Authorization": "Bearer ${BRAIN_MCP_TOKEN}"}` to
`.mcp.json` to try to skip this step. `/mcp/<ID>` is OAuth-only by design (the
bearer tokens work on `/fast/<ID>/...` only), and Claude Code reports a server as
**failed** when a configured `Authorization` header is rejected instead of
falling back to OAuth. Adding the header breaks the working terminal connection
and fixes nothing.

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

## Step 6: Mint the local hook token (per machine)

All three local hooks (the Stop capture and the SessionStart / UserPromptSubmit
injection hooks) reach the server with a bearer token. This token is a secret and
lives only in the project's gitignored `.claude/settings.local.json`.

**It is per surface, and it does not travel.** Because `settings.local.json` is
gitignored, a fresh clone or a second machine has NO token, and there every local
hook SILENTLY no-ops (capture writes nothing; injection injects nothing) while the
setup still looks "done". Mint a token on each machine that runs this project, and
prove it works in Step 8.

**This includes Claude Code cloud sessions** (claude.ai/code and the Claude
iPhone and Mac apps' Code tabs). They clone the repo, so they run these same
committed hooks, and they have no `settings.local.json`. The Step 4 connector
does NOT cover them: it provides MCP tools, not the hooks' token. Without
Step 6b below, a cloud session records nothing at all while looking completely
normal. This is the single easiest way to end up with a memory system that
appears installed and is quietly dead on three of four surfaces.

- From the `server/` directory:
  ```
  node scripts/mint-token.mjs <owner-github-login> "<a label, e.g. mike-laptop>"
  ```
- It writes the raw token into `.claude/settings.local.json` as `BRAIN_MCP_TOKEN`,
  and prints an SQL insert (the token's hash). Run that SQL in the Neon editor so
  the server recognizes the token.

**Success looks like:** `.claude/settings.local.json` (on THIS machine) has a
`BRAIN_MCP_TOKEN`, and the hash row is in the database. Confirm
`.claude/settings.local.json` is gitignored (add `/.claude/settings.local.json`
to `.gitignore` if not). Step 8 proves the token actually authenticates.

## Step 6b: Wire the Claude Code CLOUD environments (per environment)

claude.ai/code, the Claude iPhone app's Code tab, and the Claude Mac app's Code
tab are not three separate things: they all run the same Anthropic-managed
**cloud environments**. Configure an environment once and all three pick it up.
Two settings are needed, and **both are required** (the token alone silently
fails, because the network layer blocks the request before the token is ever
checked).

1. **Mint a SEPARATE token for the cloud**, labelled e.g.
   `claude-cloud-environments`, and register its hash exactly as in Step 6. Do
   not reuse a machine's token: separate tokens can be revoked independently, and
   the cloud copy is stored in plain text (see the warning below). Note that
   `scripts/mint-token.mjs` writes into `.claude/settings.local.json`, which
   would clobber that machine's token, so for the cloud token generate it
   separately and keep the raw value out of the repo.
2. **In the environment settings** at claude.ai/code: select the current
   environment name (the cloud icon) to open the selector, then hover your
   project's environment and click its settings icon (or **Add environment**).
   Name the environment after the project, one environment per project, so each
   project's token stays scoped to its own sessions.
   - **Environment variables** (`.env` format, one `KEY=value` per line, **no
     quotes**, since quotes are stored as part of the value):
     ```
     BRAIN_MCP_TOKEN=<the cloud token>
     ```
   - **Network access**: set to **Custom**, then in **Allowed domains** add the
     Worker's host on its own line:
     ```
     <your worker host, e.g. second-brain.rihm.workers.dev>
     ```
     Keep **Also include default list of common package managers** CHECKED, or
     you will cut off npm, PyPI, and GitHub, which breaks plugin installs and
     setup scripts.

**Why the allowed-domains step is mandatory:** cloud environments default to
**Trusted** network access, an allowlist of package registries, code hosts, and
cloud SDKs. A private `workers.dev` host is not on it, so the hooks' requests are
blocked at the proxy no matter how valid the token is. (**Full** access also
works and is one click simpler, but it allows every domain.)

**No setup script is needed.** The hooks import only Node built-ins and use the
built-in `fetch`; Node is pre-installed in cloud environments and there is
nothing to `npm install`.

**Warning:** cloud environments have no dedicated secrets store. Environment
variables are stored in the environment config in plain text, visible to anyone
who can edit that environment (on Team/Enterprise, a shared environment reaches
every member). Weigh that before putting a token there, and prefer a separate,
revocable one.

**Success looks like:** a cloud session on the repo answers a question that only
the digest could have told it. Step 8.4 has the exact check.

## Step 7: Install the hooks, settings, and the two curators

1. Copy the hooks from `hooks/` to the project's `.claude/hooks/`:
   `brain-mcp-capture.mjs` (Stop capture), `brain-mcp-session-curate.mjs`
   (SessionEnd: tells the server this conversation is over so it curates the
   session as one finished arc), `brain-mcp-session-digest.mjs`
   (SessionStart digest injection), `work-items-status.mjs` (SessionStart:
   reads the work-items tree and injects what is wanted, in progress, and
   already done; local, no server call, no token, and a silent no-op when the
   project has no such tree), `brain-outbox-status.mjs` (SessionStart: lists
   curated notes still sitting unsaved in `.claude/memory-outbox/`; local, no
   server call, no token, silent when there are none), `brain-scope-guard.mjs`
   (PreToolUse on `mcp__.*`: denies a brain call aimed at ANOTHER project's
   store; local, no server call, no token, fails open), `brain-mcp-recall.mjs` (UserPromptSubmit
   recall injection), `knowledge-curator-nudge.mjs` (PostToolUse: after a
   push or PR-create, remind the session to run the knowledge-curator; local,
   no server call, no token), and `kb-backfill/kb_freshness_hook.py` (Stop:
   flags the knowledge layer stale the moment watched source files change).
   Salesforce projects that install the structural layer use its
   `graph_freshness_hook.py` INSTEAD of `kb_freshness_hook.py`; never wire
   both (see `kb-backfill.md`).
2. Merge `templates/settings.json` into the project's committed
   `.claude/settings.json`: the `env` block and the `SessionStart`,
   `UserPromptSubmit`, `Stop`, `SessionEnd`, `PreToolUse`, and `PostToolUse`
   hooks. Fill `<BRAIN_MCP_ORIGIN>`, `<PROJECT_ID>`, and `BRAIN_CONNECTOR`
   (the Step 4 connector name, written the way it appears in claude.ai; the
   guard normalizes punctuation), and set `KB_SOURCE_PATHS` to the
   profile's Source code path(s) (comma-separated) so the freshness hook has
   paths to watch; drop the `_comment` key. Do NOT clobber existing `env` or
   `hooks` entries (a project may already have a guard hook); add to them. The
   `Stop` hook now runs two commands: capture, then freshness.
3. **Wire the knowledge-freshness rule.** Write the rule from `kb-backfill.md`
   ("Rule to write in step 3d") to `.claude/rules/knowledge-freshness.md`, and
   add the freshness artifacts to `.gitignore`:
   `.claude/hooks/_kb_freshness_stamp.json` and
   `.claude/hooks/_drift_pending.md`. This is what turns a drift flag into a
   curator reconcile: without the rule the hook flags drift that nothing acts on.
4. Copy `agents/brain-curator.md` and `agents/knowledge-curator.md` to the
   project's `.claude/agents/`.
5. **Fill the profile.** In EACH copied curator, replace the `## Project profile`
   section's `<...>` placeholders using the two paste-blocks in your chosen
   `profiles/<type>.md`, and set `<APP_NAME>` to the real project name.
6. **Fill `<BRAIN_CONNECTOR>` in EACH curator**, in both the `tools:` line
   (several occurrences) and the profile's "Cloud connector name" bullet. Use the
   Step 4 connector name with spaces and hyphens replaced by underscores, so
   `Anchor Brain` becomes `mcp__Anchor_Brain__upsert_node`. Get this wrong and
   the curators are silently toolless in every cloud session. If the project has
   no connector yet, delete the `mcp__<BRAIN_CONNECTOR>__*` entries rather than
   leaving the placeholder: a literal `<BRAIN_CONNECTOR>` in a tool name matches
   nothing and hides the fact that the cloud surface is unwired.
7. **Keep the outbox committable.** `.claude/memory-outbox/` holds curated notes
   that could not reach the store, and it must NOT be gitignored: travelling on
   the branch is the whole point. If the project gitignores `.claude/` broadly,
   add a negation (`!.claude/memory-outbox/`).

**Success looks like:** `.claude/settings.json` has `BRAIN_BACKEND=mcp`,
`BRAIN_MCP_ORIGIN`, `BRAIN_PROJECT=<ID>`, `BRAIN_CONNECTOR`, `BRAIN_CAPTURE=1`, `BRAIN_INJECT=1`,
`KB_SOURCE_PATHS` set to real source paths, and the SessionStart,
UserPromptSubmit, and Stop hooks (Stop running BOTH capture and freshness);
`.claude/rules/knowledge-freshness.md` exists; both curators exist with NO
`<...>` placeholders left in their Project profile OR their `tools:` line.

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
3. **Local token actually authenticates (the silent-no-op trap).** With no valid
   `BRAIN_MCP_TOKEN` every local hook no-ops silently, so a broken or missing
   token looks like a working-but-quiet setup. Prove the token authenticates:
   with the project's env loaded,
   ```
   curl -s -o /dev/null -w '%{http_code}\n' \
     -H "Authorization: Bearer $BRAIN_MCP_TOKEN" \
     "$BRAIN_MCP_ORIGIN/fast/$BRAIN_PROJECT/digest"
   ```
   must print `200` (a `401` means the token is missing, unregistered, or
   revoked, re-check Step 6; a `403` means its GitHub login has no grant, Step
   5). Then run the session-digest hook once and confirm it emits
   `hookSpecificOutput` JSON, not nothing.

   Test the WRITE path too, not just the read. Capture is a `POST` to
   `/fast/<project>/journal` and needs the `write` role, so a read-only token
   passes the digest check above and still records nothing:
   ```
   curl -s -o /dev/null -w '%{http_code}\n' -X POST \
     -H "Authorization: Bearer $BRAIN_MCP_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"source":"local","note":"setup verification"}' \
     "$BRAIN_MCP_ORIGIN/fast/$BRAIN_PROJECT/journal"
   ```
   must also print `200` (a `403` here means the token's grant is read-only).
4. **Cloud sessions actually capture (Step 6b).** Do this per environment; it is
   the check that catches the silent-no-op trap on the surfaces you can't see.
   Start a session at claude.ai/code on the repo and ask it something only the
   digest knows (for example, a decision id and why it exists). A correct answer
   proves the SessionStart hook reached the server. A blank look means the token
   or the allowed-domains entry is wrong. To confirm the write path from inside
   the sandbox, have that session run the `POST` command above and report the
   status code.

5. **The headless node-write route exists.** This is what lets a curator save a
   finished node when there is no OAuth session (a background job, a cron fire, a
   dropped MCP connection). Without it the curator does the whole pass and the
   note is lost:
   ```
   curl -s -o /dev/null -w '%{http_code}\n' -X POST \
     -H "Authorization: Bearer $BRAIN_MCP_TOKEN" \
     -H "Content-Type: application/json" -d '{}' \
     "$BRAIN_MCP_ORIGIN/fast/$BRAIN_PROJECT/node"
   ```
   `400` is the PASS here (the route exists and rejected an empty node). `404`
   means the Worker predates the endpoint: redeploy it. `403` means the token's
   grant is read-only.
6. **A curator dispatched from a CLOUD session can actually write.** The trap
   Step 7.6 exists for: the tool names differ by surface, and a curator with a
   mismatched allowlist reports nothing wrong, it just silently has no tools.
   From a cloud session, dispatch the brain-curator and ask it to state which
   brain tools it has before doing anything. It must name `upsert_node`. "Read,
   Grep, Glob only" means the connector name in its `tools:` line is wrong or
   missing.
7. **The scope guard blocks another project's brain.** Connectors are attached
   per account, so a session can silently answer from a different project's
   memory, which is worse than answering from none. With the project's env
   loaded:
   ```
   echo '{"tool_name":"mcp__some-other-brain__recall"}' \
     | node .claude/hooks/brain-scope-guard.mjs
   ```
   must print a `permissionDecision` of `deny` (an `ask` means `BRAIN_CONNECTOR`
   is unset). The same command with this project's own connector name, and with
   an unrelated tool like `mcp__Linear__list_issues`, must print NOTHING.
8. **A background job leaves a trace.** The journal is the fallback everything
   leans on, and it is the least-observed path: hooks no-op silently without a
   token, so a background job that captured nothing looks exactly like one that
   worked. Trigger a background or scheduled run against the repo, then confirm
   from a normal session that its turns are in the journal (`read_journal`, or
   ask the brain-curator). Nothing there means that surface is contributing
   nothing at all, and Step 6b is the fix.

**Success looks like:** harness `FAIL: 0`; the test fact written locally is
recalled in a second local session AND in a cloud session; the token check
returns `200` for BOTH the digest read and the journal write and `400` for the
empty node write, with the digest hook emitting injection JSON; a cloud session
answers from the digest; a cloud-dispatched curator names `upsert_node` among its
tools; the scope guard denies another project's brain and stays silent on this
project's own and on unrelated tools; and a background run's turns show up in the
journal.

## Step 9: Document it in the project's CLAUDE.md

Record the ground rules so every future session knows:
- Only the two curators write to the store; sessions never hand-edit memory.
- The store lives in the remote `second-brain` server; this project's endpoint is
  `<origin>/mcp/<ID>`.
- How to ask for memory: "delegate to the brain-curator" (recall/remember) and
  "delegate to the knowledge-curator" (why-does-this-code-exist).
- Durable facts belong in the brain, not a machine-local file store. Save any
  decision, goal, constraint, or correction that should outlive the session via
  the brain-curator. Claude Code's local `~/.claude/.../memory` file store does
  not travel to clones, other machines, or cloud sessions, so a durable project
  fact must never live only there.
- **Only ever touch THIS project's brain.** Connectors are attached per Claude
  account, not per repo, so every project's brain is visible in every session and
  a background job may hold only a foreign one. This project's brain is the
  `second-brain` server from `.mcp.json` and the connector in `BRAIN_CONNECTOR`,
  those two only. When neither is reachable, use the bearer fast path (scoped by
  project id and token) or say the store is unavailable. Never substitute another
  project's memory: a detailed recall about the wrong codebase reads as correct
  and nothing in the answer catches it.
- **A finished note is never dropped.** The MCP connection can drop mid-session
  and a background job may never have one, in which case the curator hands its
  completed nodes back instead of storing them. Check the write path before
  dispatching, then work the ladder until one route takes it: `POST
  /fast/<ID>/node` with the bearer token, else the same token to
  `POST /fast/<ID>/journal` as a `kind: "curated-node"` entry, else park the node
  file in `.claude/memory-outbox/` and commit it. A SessionStart hook lists what
  is waiting there, `/remember` flushes it first, and nobody reports memory as
  saved when it is still sitting in the outbox.
- Capture is on (the Stop hook). The digest auto-injects at session start and
  per-prompt keyword recall auto-injects before each answer (the SessionStart +
  UserPromptSubmit hooks); the agent can also call `get_digest` / `recall`
  directly. `BRAIN_INJECT=0` disables both injection hooks; `BRAIN_RECALL=0`
  disables just per-prompt recall.
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
[ ] 4. cloud/web connector added and authorized (tools; NOT a substitute for 6b); its exact name recorded for Step 7 (curator tools: lines AND BRAIN_CONNECTOR)
[ ] 5. grants row per person
[ ] 6. local BRAIN_MCP_TOKEN minted; hash row inserted; settings.local gitignored
[ ] 6b. EACH Claude Code cloud environment has BRAIN_MCP_TOKEN set AND the Worker host on its allowed-domains list
[ ] 7. all hooks (capture + session-digest + recall + work-items + outbox-status + scope-guard + knowledge-curator-nudge + freshness) + settings merged with BRAIN_CONNECTOR set; both curators installed with the profile AND <BRAIN_CONNECTOR> filled; .claude/memory-outbox/ not gitignored
[ ] 8. db harness FAIL: 0; digest read AND journal write 200, empty node write 400; smoke test passes local + cloud; a cloud-dispatched curator names upsert_node; the scope guard denies a foreign brain; a background run lands in the journal
[ ] 9. CLAUDE.md ground rules written
[ ] 10. first memory/knowledge population offered
```

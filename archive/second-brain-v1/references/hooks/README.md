# Second-brain hooks

> **Archived v1 reference:** v1 is retired. Do not copy, run, refresh, or import
> these hooks. Existing projects should use `project-sync` to deactivate or
> remove local v1 integration with approval.

Eight deterministic, best-effort hooks. Four connect a project to the memory
server over the bearer fast path (`/fast/<project>/...`); with no
`BRAIN_MCP_TOKEN` they silently no-op, which keeps them safe in a teammate
checkout. Four are different in kind, making no network call and needing no
token: `work-items-status.mjs` reads the work-items tree straight off disk,
`brain-outbox-status.mjs` reports curated notes that are still unsaved,
`brain-scope-guard.mjs` stops a call to another project's brain, and
`knowledge-curator-nudge.mjs` reminds the session to run the knowledge-curator
at a push or PR. None uses a model itself, though
`brain-mcp-session-curate.mjs` asks the server to run one.

Seven of the eight only ever ADD context or record it. `brain-scope-guard.mjs`
is the only one that can stop a tool call, and it is the only `PreToolUse` hook
here.

**That silence is also the system's main failure mode.** A surface with no token
behaves identically to one that is working quietly, so an unwired surface is
invisible until someone checks. Claude Code **cloud** sessions (claude.ai/code
and the Claude iPhone and Mac apps' Code tabs) clone the repo and run these same
hooks with no `settings.local.json`, so they need the token supplied as an
environment variable in the cloud environment, plus the Worker's host on that
environment's allowed-domains list. Setup recipe Step 6b.

| Hook file | Event | Direction | What it does |
| --- | --- | --- | --- |
| `brain-mcp-capture.mjs` | `Stop` | write | Drops one redacted turn record into the journal (`POST /fast/<p>/journal`). Curators later drain it into nodes. |
| `brain-mcp-session-curate.mjs` | `SessionEnd` | write | Tells the server this conversation is over (`POST /fast/<p>/curate` with the session id) so it curates that session as one finished arc. Fire-and-forget: the server answers 202 and does the model call in the background, so the session never waits. No-ops on `reason: resume` (backgrounding is not ending) and when there is no session id. `BRAIN_CURATE_ON_END=0` disables it. |
| `brain-mcp-session-digest.mjs` | `SessionStart` | read + inject | Fetches the curated digest (`GET /fast/<p>/digest`) and injects it as session context, so a session starts grounded in memory. |
| `brain-mcp-recall.mjs` | `UserPromptSubmit` | read + inject | Keyword-recalls the memory for the submitted prompt (`GET /fast/<p>/recall?q=...`) and injects the top matches before the agent answers. |
| `work-items-status.mjs` | `SessionStart` | local inject | Reads the project's `work-items/` tree and injects what is wanted, what is in progress (with each item's next step from `STATUS.md`), and what is already done. No server call, no token, no model. No-ops silently when the project has no work-items tree. `WORK_ITEMS_INJECT=0` disables it; `WORK_ITEMS_ROOT` overrides the location. |
| `brain-outbox-status.mjs` | `SessionStart` | local inject | Lists curated notes waiting in `.claude/memory-outbox/`: nodes a curator finished on a surface that could not reach the store, where the file is the only copy. No server call, no token, so it reports honestly exactly where the server is unreachable. Silent when the folder is absent or empty; `BRAIN_OUTBOX_NOTICE=0` disables it. See `../curator-write-path.md`. |
| `brain-scope-guard.mjs` | `PreToolUse` (`mcp__.*`) | local guard | Denies a brain tool call aimed at ANOTHER project's store. Memory connectors are attached per Claude ACCOUNT, not per repo, so every project's brain is visible in every session with nothing marking the foreign ones. Allows `second-brain` (this repo's `.mcp.json`) and the connector in `BRAIN_CONNECTOR`; asks instead of denying when `BRAIN_CONNECTOR` is unset, since it then cannot prove the server is foreign. Fails OPEN on any error. `BRAIN_SCOPE_GUARD=0` disables it. |
| `knowledge-curator-nudge.mjs` | `PostToolUse` (Bash) | local inject | After a `git push` or `gh pr create`, injects a reminder to dispatch the knowledge-curator for any code-why that changed. No server call, no token. Gated on the knowledge-curator agent existing; `BRAIN_KC_NUDGE=0` disables it. Exists because the knowledge layer, unlike memory, has no automatic trigger of its own. |

The two injection hooks are the automatic half of "the right context at the
right time": the digest lands once per session; recall lands per prompt. The
agent's own `get_digest` / `recall` MCP calls still work and still matter (the
fast-path recall is keyword-only; the MCP `recall` adds vector search for hard
queries).

## Configuration (env vars)

Set in the project's `.claude/settings.json` `env` block, except the token which
is a secret and lives only in the gitignored `.claude/settings.local.json`:

| Var | Where | Meaning |
| --- | --- | --- |
| `BRAIN_V1_WRITE_MODE` | settings.json | Defaults to `read-only`. Only explicit `write` permits the legacy automatic hooks to act. Existing v1 projects must set `read-only`. |
| `BRAIN_BACKEND` | settings.json | Must be `mcp` for any hook to act. |
| `BRAIN_MCP_ORIGIN` | settings.json | Server origin, e.g. `https://second-brain.rihm.workers.dev`. |
| `BRAIN_PROJECT` | settings.json | This project's id. |
| `BRAIN_MCP_TOKEN` | settings.local.json | Bearer token (secret; never committed). |
| `BRAIN_CAPTURE` | settings.json | Default on. `0` disables the Stop capture. |
| `BRAIN_CURATE_ON_END` | settings.json | Default on. `0` disables session-end curation, leaving only `/remember` and the server's idle backstop. |
| `BRAIN_INJECT` | settings.json | Default on. `0` disables BOTH injection hooks. |
| `BRAIN_RECALL` | (optional) | Default on. `0` disables per-prompt recall only, keeping session-start digest injection. |
| `WORK_ITEMS_INJECT` | settings.json | Default on. `0` disables the work-items injection. |
| `BRAIN_OUTBOX_NOTICE` | settings.json | Default on. `0` disables the pending-notes notice. |
| `BRAIN_CONNECTOR` | settings.json | This project's claude.ai connector name (e.g. `Anchor Brain`). Lets the scope guard tell this project's brain from another's, and fills the curators' `tools:` lines. |
| `BRAIN_SCOPE_GUARD` | settings.json | Default on. `0` disables the wrong-project brain guard. |
| `WORK_ITEMS_ROOT` | (optional) | Repo-relative path to the work-items tree. Defaults to `work-items/`, then `engagement/work-items/`. |

## Where work-item status comes from

A work item's stage is **which folder it sits in** (`01-backlog`,
`02-in-progress`, `03-completed`, `04-archived`), and `work-items-status.mjs`
reads that from the tree at every session start. Nothing asserts it and nothing
stores it, so "is that done already?" cannot go stale or be misremembered.

Memory's job is the other half: the `work-item` node holds the want, a `folder:`
pointer, and the typed links to the decisions and knowledge nodes about that
item, so one recall answers "what did we decide while doing this?". The curator
is explicitly forbidden from putting a stage in a node (brain-curator invariant
13), because a copied stage contradicts the tree the moment a folder moves.

The two halves answer different questions. The tree says where things stand; the
graph says what they connect to.

## When curation actually happens

Capture and curation are separate. Capture is per turn, deterministic, and
cannot assert anything wrong. Curation is the model step that turns journal
entries into nodes, and it is **session-scoped**, because a conversation only
reads correctly once it is over: a pass that wakes up mid-session sees the owner
thinking out loud and can write a floated idea down as a settled decision.

Historically, v1 used three triggers. They are disabled during containment:

1. **`/remember`**: an in-session curator dispatch. The owner is present.
2. **Session end**: `brain-mcp-session-curate.mjs`, the default path.
3. **The server cron**: a backstop only. It sweeps sessions whose journal has
   sat untouched past `BACKSTOP_IDLE_HOURS` (default 24), meaning SessionEnd
   never fired for them (crash, killed terminal, reclaimed container).

A session left open for days therefore contributes nothing to memory until it
ends. That is deliberate. `/remember` is the escape hatch when something needs
saving right now.

## Safety rules baked into the hooks

- **Every hook always exits 0.** For `UserPromptSubmit`, a non-zero exit ERASES
  the user's prompt (exit 2 blocks it). `brain-mcp-recall.mjs` therefore wraps
  everything in try/catch and ends every path at `done()` (exit 0): a brain
  problem must never cost the user their prompt.
- **Best-effort.** A missing token, an offline server, a timeout, or an empty
  result injects nothing and the turn proceeds normally.
- **Bounded latency.** The recall hook (per turn) uses a 2500ms fetch timeout,
  tighter than capture's 4000ms, and skips trivial prompts (under 15 chars or a
  bare affirmation like "yes"/"do it") so most turns pay no round-trip.
- **Injected text is labeled reference, not instructions**, so retrieved memory
  is never read as commands.
- **Light redaction** of emails / org ids / URLs on the outbound recall query,
  mirroring the capture hook, so they do not land in server request logs.

## Smoke test (verifies the script's fetch + output contract)

With the project's `BRAIN_*` env vars exported (including a real
`BRAIN_MCP_TOKEN`), from the project root:

```
# Session digest hook: expect JSON with hookSpecificOutput.additionalContext
echo '{"hook_event_name":"SessionStart","source":"startup"}' \
  | node .claude/hooks/brain-mcp-session-digest.mjs

# Recall hook: expect JSON with the recalled nodes, or empty if no keyword hit
echo '{"hook_event_name":"UserPromptSubmit","prompt":"what did we decide about pricing rounding"}' \
  | node .claude/hooks/brain-mcp-recall.mjs

# No token -> both must print nothing and exit 0 (safe in a teammate checkout)
env -u BRAIN_MCP_TOKEN node .claude/hooks/brain-mcp-recall.mjs <<< '{"prompt":"anything at all here"}'; echo "exit=$?"
```

This confirms the scripts hit the right endpoint with the bearer, emit
well-formed `hookSpecificOutput` JSON, and no-op safely without a token. It does
NOT confirm that Claude Code actually ingests the injected context in a live
session; verify that once by eyeballing a real session (the digest should appear
as a system-reminder at the top, and recall should surface relevant nodes on a
memory-touching prompt).

## Troubleshooting: the hooks do nothing

If capture never writes and injection never appears, the cause is almost always a
missing or invalid token on THIS surface. This is the #1 trap: `settings.local.json`
is gitignored, so a clone or a second machine has no token and every local hook
silently no-ops while the setup still looks complete.

In a Claude Code **cloud** session there are two possible causes, so check both:
the `BRAIN_MCP_TOKEN` environment variable is missing from the environment, or
the environment's network allowlist blocks the Worker's host (cloud environments
default to a Trusted allowlist that excludes a private `workers.dev` host, and
the request is blocked at the proxy before the token is ever evaluated). Setup
recipe Step 6b covers both. Check it:

```
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Bearer $BRAIN_MCP_TOKEN" \
  "$BRAIN_MCP_ORIGIN/fast/$BRAIN_PROJECT/digest"
```

- `200`: the token works (a non-empty digest also confirms the project has one).
- `401`: token missing, unregistered, or revoked: mint one for this machine
  (setup recipe Step 6).
- `403`: the token's GitHub login has no grant on this project (setup recipe
  Step 5).
- `404`: wrong `BRAIN_PROJECT` or `BRAIN_MCP_ORIGIN`.

## Troubleshooting: the session answered from the wrong project's memory

Symptom: a session in project A cites decisions that belong to project B, or
says a recall "hit the wrong project's brain". Cause: connectors are attached to
the Claude ACCOUNT, so B's brain is visible in A's session, and in a background
job A's own connector may not be attached at all. Nothing in the tool list marks
which brain belongs to this repo.

`brain-scope-guard.mjs` is the fix, and it needs `BRAIN_CONNECTOR` set to deny
rather than merely ask. Check the guard's own decisions:

```
echo '{"tool_name":"mcp__some-other-brain__recall"}' \
  | BRAIN_PROJECT=$BRAIN_PROJECT BRAIN_CONNECTOR="$BRAIN_CONNECTOR" \
    node .claude/hooks/brain-scope-guard.mjs
```

Expect `permissionDecision: "deny"`. The same command with this project's own
server name must print NOTHING (a silent allow), and so must an unrelated tool
like `mcp__Linear__list_issues`.

Note what the guard does NOT do: it cannot attach this project's connector. When
the right brain is genuinely absent, the correct outcome is the bearer fast path
or an honest "the store is unavailable", never another project's memory.

## Troubleshooting: a curator finished a note and could not save it

Different problem, different fix. The hooks above are the read and capture paths;
a curator writes NODES, and that path can be missing while every hook is healthy.
The MCP connection can drop mid-session, and a background job may never have had
one. `../curator-write-path.md` is the full picture: what the curator does with
the finished note, the fallback ladder, and the outbox that catches it.

The one check worth knowing here is whether this project's Worker has the bearer
node-write endpoint, which is what lets a headless surface store a node at all:

```
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  -H "Authorization: Bearer $BRAIN_MCP_TOKEN" \
  -H "Content-Type: application/json" -d '{}' \
  "$BRAIN_MCP_ORIGIN/fast/$BRAIN_PROJECT/node"
```

`400` (missing required fields) is the healthy answer: the route exists and
rejected an empty node. `404` means the Worker predates the endpoint and needs a
redeploy. `403` means the token's grant is read-only.

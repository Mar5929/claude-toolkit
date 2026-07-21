# Second-brain hooks

Three deterministic, best-effort hooks connect a project to the memory server
over the bearer fast path (`/fast/<project>/...`). None uses a model. All are
safe in a teammate checkout or a cloud session: with no `BRAIN_MCP_TOKEN` they
silently no-op.

| Hook file | Event | Direction | What it does |
| --- | --- | --- | --- |
| `brain-mcp-capture.mjs` | `Stop` | write | Drops one redacted turn record into the journal (`POST /fast/<p>/journal`). Curators later drain it into nodes. |
| `brain-mcp-session-digest.mjs` | `SessionStart` | read + inject | Fetches the curated digest (`GET /fast/<p>/digest`) and injects it as session context, so a session starts grounded in memory. |
| `brain-mcp-recall.mjs` | `UserPromptSubmit` | read + inject | Keyword-recalls the memory for the submitted prompt (`GET /fast/<p>/recall?q=...`) and injects the top matches before the agent answers. |

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
| `BRAIN_BACKEND` | settings.json | Must be `mcp` for any hook to act. |
| `BRAIN_MCP_ORIGIN` | settings.json | Server origin, e.g. `https://second-brain.rihm.workers.dev`. |
| `BRAIN_PROJECT` | settings.json | This project's id. |
| `BRAIN_MCP_TOKEN` | settings.local.json | Bearer token (secret; never committed). |
| `BRAIN_CAPTURE` | settings.json | Default on. `0` disables the Stop capture. |
| `BRAIN_INJECT` | settings.json | Default on. `0` disables BOTH injection hooks. |
| `BRAIN_RECALL` | (optional) | Default on. `0` disables per-prompt recall only, keeping session-start digest injection. |

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

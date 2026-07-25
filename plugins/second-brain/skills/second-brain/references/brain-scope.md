# Which brain is this project's, and why another one is visible

This is the canonical description of **memory scoping**: how a session tells its
own project's second brain from some other project's, and what stops it reading
or writing the wrong one. `curator-write-path.md` covers the other half, what
happens when the RIGHT brain cannot be reached.

## The failure this exists to prevent

An Anchor session (an iOS app) answered from DragonFly's brain (a Salesforce
org). It said so plainly:

> "The recall hit the wrong project's brain (DragonFly, a Salesforce repo).
> Anchor's store isn't wired to these MCP tools in this job."

Reading another project's memory is worse than reading none. An empty recall is
obviously empty; a full recall about the wrong codebase is confident, detailed,
and wrong, and the session has no way to notice. The same mistake on a write
would put Anchor's decisions in DragonFly's graph, where the next DragonFly
session would read them as its own history.

## Why it happens

**Connectors are attached per Claude ACCOUNT, not per repo.** The committed
`.mcp.json` is per-repo and always names this project's server `second-brain`,
so the terminal is naturally scoped. An account-level connector is not: every
project's brain connector is visible in every session, named after its own
project, with nothing in the tool list saying which repo it belongs to. A
session holding `mcp__dragonfly-brain__recall` and `mcp__Anchor_Brain__recall`
has no signal about which one matches the checkout it is sitting in.

**A background job can hold ONLY a foreign one.** This is what made the Anchor
case worse than a slip. Interactively-authenticated connectors may not carry
into a background or scheduled run, so the session had no Anchor brain at all
and exactly one brain tool available, belonging to another project. Calling it
looked like the only option.

**The digest is not affected, which is the tell.** Session-start digest
injection and per-prompt recall injection go over the bearer fast path, which is
scoped by `BRAIN_PROJECT` and the token, so they are always this project's. If
the injected digest is right but a `recall` comes back about another codebase,
this is what happened.

## This project's brain

Two names, both correct, and the guard allows exactly these two:

| Name | Where it comes from | Scope |
| --- | --- | --- |
| `second-brain` | the committed `.mcp.json` | per repo, so always this project |
| `BRAIN_CONNECTOR` (e.g. `Anchor Brain`) | the claude.ai connector, recorded in `.claude/settings.json` | per account, so it needs declaring |

Claude Code turns a connector's spaces and hyphens into underscores when it
builds tool names, so `Anchor Brain` arrives as `mcp__Anchor_Brain__recall`. The
guard normalizes both sides, so however the name is punctuated it compares equal.

## The guard

`brain-scope-guard.mjs` is a `PreToolUse` hook on `mcp__.*`. It is the only hook
in this system that can stop a call:

- **Allow, silently**: any tool on `second-brain` or `BRAIN_CONNECTOR`, and
  anything that is not a brain call at all.
- **Deny**: a brain tool on any other server, with a reason naming this
  project's brain and pointing at the fast path.
- **Ask**: the same call when `BRAIN_CONNECTOR` is unset. It cannot then prove
  the server is foreign, and hard-blocking a project that simply has not been
  synced yet would be worse than a prompt. Setting `BRAIN_CONNECTOR` removes it.

It decides brain-ness from the tool name. `get_digest`, `put_digest`,
`read_journal`, `append_journal`, `drain_journal`, `upsert_node`, and
`list_nodes` are distinctive enough to be conclusive on any server. `recall`,
`get_node`, and `export` are generic names another MCP server could reasonably
use, so those only count when the server name itself looks like a brain. That
keeps an unrelated server with its own `recall` from ever being caught.

It fails **open** on any error, because a guard bug that blocks unrelated tools
would be a worse failure than the one it prevents.

The curators are already scoped by their `tools:` allowlists, which name only
`second-brain` and this project's connector. The main session is the exposed
surface, and the guard is what covers it.

## When this project's brain is not reachable

The guard cannot attach a missing connector. It only removes the wrong answer,
which leaves two right ones:

1. **Use the bearer fast path.** `GET $BRAIN_MCP_ORIGIN/fast/$BRAIN_PROJECT/recall?q=...`
   reads this project's store with the token and no OAuth, and
   `/fast/$BRAIN_PROJECT/node` writes to it. Same scoping guarantee as the
   digest, which is why the digest kept working when the MCP tools did not.
2. **Say the store is unavailable.** An honest gap is a fine answer.

Never substitute another project's memory, and never quietly widen the question
to "whatever brain I can reach". If the only brain in the session belongs to a
different project, the correct report is that this project's brain is not wired
into this job.

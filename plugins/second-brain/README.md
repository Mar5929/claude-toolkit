# second-brain plugin

The toolkit's durable memory and knowledge system. It gives a project a memory
that survives across sessions, so a new session does not start as a stranger to
the codebase and the decisions behind it. It is reachable from both the terminal
CLI and cloud Claude sessions.

## Install

The `second-brain` skill installs it into a project (usually offered by
`project-init` Gates 3 and 4, or run directly):

```
/second-brain
```

## Skills

- **second-brain** (`/second-brain`): installs the system into a project from
  bundled, proven reference implementations. A short project-type question picks
  the profile (Salesforce org, app, other code, docs-only); there is no design
  work. It wires the MCP server, the two curator agents, the capture hook, the
  session digest, and (on request) the structural layer and a knowledge backfill.

- **remember** (`/remember`, or "remember this"): the wrap-up command. At the end
  of a finished work item it dispatches BOTH curators to save what the work
  taught. It covers both on purpose, because the knowledge-curator is the one
  nothing automatic triggers and it otherwise quietly never runs.

## The three layers (this is where "is anything redundant?" usually comes up)

The plugin holds three layers that sound similar but answer different questions.
They are complementary, not redundant:

- **Memory graph** (the brain-curator): the project's decisions, constraints,
  preferences, terminology, open questions. Answers "what did we decide and
  why". Typed nodes with edges, hybrid keyword and vector recall, a curated
  digest injected at session start.
- **Knowledge layer** (the knowledge-curator, `know-*` nodes): the reason code
  exists and how a subsystem works, written in prose and **pinned to the files
  it describes by their git SHA**, so it flags itself stale when the code drifts.
  Answers "why is this code here".
- **Structural layer** (graphify, or the compiled Salesforce metadata graph):
  the mechanical "what connects to what", built from the code by tree-sitter (no
  model). Answers "if I change this, what breaks N steps out". This is the only
  layer that does impact analysis; the memory and knowledge layers cannot.

## How it works at runtime

One shared Cloudflare Worker MCP server, a per-project Neon Postgres/pgvector
database, and GitHub OAuth. A `SessionStart` hook injects the digest; a
`UserPromptSubmit` hook injects keyword recall; a `Stop` hook cheaply captures
each turn to a journal that curators later drain into clean, linked, deduped
nodes. Read `skills/second-brain/references/architecture-spec.md` for the full
design and process flow.

## How it relates to the rest of the toolkit

- `project-init` offers this plugin at its memory and knowledge gates and copies
  the paired behavioral rules (`memory-system-ground-rules.md`,
  `knowledge-layer-ground-rules.md`) from the general-rules library.
- **second-brain versus remember is not redundancy.** second-brain installs the
  system; remember feeds it at wrap-up. Capture is automatic; remember is the
  deliberate step that turns a session's conclusions into curated memory.

## Maintaining this plugin

A content change here bumps `version` in `.claude-plugin/plugin.json` and
`metadata.version` in the repo's `.claude-plugin/marketplace.json`. Keep this
README and `docs/toolkit-map.md` current when the skills or layers change.

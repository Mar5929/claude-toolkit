# Worked examples: a finished AGENTS.md and CLAUDE.md

`thin-agents-md.md` says what the two root files are for and what goes in them.
This file shows one finished pair, so Gate 5 has something to write against.

The project is `acme-crm`: a Salesforce delivery repository that took `SOUL.md`,
System Guide, the project knowledge system, captured outside documentation, and
a GitHub board. Adapt the content, keep the shape.

## Sample AGENTS.md

The line above the title is verbatim in every project. The Startup section names
`SOUL.md`, so there is no separate SOUL line.

````markdown
Always execute work with the context in mind that the user will likely continue work across multiple AI coding sessions where the session context is cleared and picked up again. You must assist the user in helping establish that continuity across sessions while not adding context that might pollute future agents and skew them. Information must be curated and intentional.

# AGENTS.md: working in acme-crm

Salesforce delivery for Acme's sales org.

Read `.claude/rules` first. Every file in that folder is a rule for how you work
here, and they are in force for the whole session.

## Startup

- Read `SOUL.md`, `knowledge/project.md`, and `knowledge/memory/current.md`.
- Check `knowledge/memory-inbox.md` for unfinished saves.
- Read the three files again after resume, clear, or compaction.
- Procedures live in skills. The manuals in `knowledge/` are reference: open a
  section when a task needs it.

## Path-scoped rules

Claude Code loads these when a matching file is read. Codex: open the rule
before working on a matching path.

- `knowledge/**`, `docs/**`, `**/README.md`: `.claude/rules/knowledge-direct-commit.md`
- `force-app/**/permissionsets/**`, `force-app/**/permissionsetgroups/**`, `force-app/**/profiles/**`: `.claude/rules/permissions-source-control.md`
- `force-app/**`, `tools/kb/**`: `.claude/rules/dependency-graph.md`
- `delivery/deployment/**`, `engagement/deployment/**`: `.claude/rules/deployment-runbook.md`
- `delivery/data/**`, `engagement/data/**`: `.claude/rules/production-data.md`

When .system-guide.json is enabled, use the System Guide plugin's system-guide skill for questions or work about existing system structure, purpose, connections, or impact.

## Codemap

| Path | What is there, and when to open it |
| --- | --- |
| `force-app/main/default/` | The org's metadata: objects, flows, Apex, permission sets. Detail: `force-app/AGENTS.md`. |
| `ai-external-knowledge/` | Salesforce documentation captured as Markdown, one folder per topic. Open it before designing against a platform feature, instead of searching the web. Today: `sharing-and-visibility/`, `flow-limits/`. |
| `knowledge/` | What this project decided and why, plus the separately enabled System Guide under its configured path. Open the guide index for existing system structure, purpose, connections, or impact; the routing table in `knowledge/knowledge-manual.md` separates guide explanations from PRDs and memory. |
| `docs/` | Documents written for Acme, not for agents. Detail: `docs/AGENTS.md`. |
| `docs/designs/` | One build plan per work item: how each approved requirement is met. Open it before building an item. Kept after delivery. |
| `scripts/` | Deploy and data-load scripts. Detail: `scripts/AGENTS.md`. |
| `.claude/` | Rules, hooks, settings. |

## Tools

| Tool | Use it for | Detail |
| --- | --- | --- |
| Salesforce CLI (`sf`) | Deploying and retrieving metadata, running Apex tests. | `.claude/rules/salesforce-safety-guardrails.md` |
| `kb-graph` MCP server | Field, flow, and permission questions across the org. Build it with `python3 tools/kb/build_graph.py`. | `tools/kb/README.md` |

## Quick saves

| Path | How updates land | Instructions |
| --- | --- | --- |
| `README.md`, `delivery/architecture/`, `docs/designs/` | Authorized documentation-only updates go straight to the default branch. | `.claude/rules/knowledge-direct-commit.md` and the `publish-docs` skill |
| `knowledge/` | Content approval follows the knowledge manual, then the route above. | `knowledge/knowledge-manual.md` and the `knowledge-save` skill |

## Where work is tracked

The Acme CRM board on GitHub, connected to this repository. The chosen issue
holds its requirements, solution design, progress, and decisions in the board's
established fields and comments. Build and data-load work require recorded
requirements approval. Later stage labels show current position and do not
revoke that approval; check the approval record when resuming.
````

Each folder named in that codemap holds the same pair: an `AGENTS.md` with the
folder's own content, and a `CLAUDE.md` beside it holding the one import line
below.

## The same project in the `external` memory mode

If `acme-crm` kept its memory in a memory service (mem0 or Hindsight), its
`.toolkit-memory.json` would say `"memory": "external"` and these sections
would change. Everything else stays as above.

````markdown
## Startup

- Read `SOUL.md` and `PROJECT.md`.
- Load working memory in full through the memory service named in
  `.toolkit-memory.json`. If its MCP server is not connected, tell the owner.
- List pending saves in the memory service.
- Repeat these steps after resume, clear, or compaction.
- Procedures live in skills. The manuals in `docs/` are reference: open a
  section when a task needs it.

## Path-scoped rules

- `prds/**`, `PROJECT.md`, `docs/**`, `**/README.md`: `.claude/rules/knowledge-direct-commit.md`

## Codemap

| Path | What is there, and when to open it |
| --- | --- |
| `PROJECT.md` | What the project is, why it exists, and its boundaries. Read at startup. |
| `prds/` | One PRD per feature area: the requirements, then the settled behavior. Open it before changing an area. Kept for the life of the area. |
| `docs/` | Documents written for Acme, plus `knowledge-manual.md` and `toolkit-manual.md`, which say how knowledge and the toolkit work here. Detail: `docs/AGENTS.md`. |
| `docs/designs/` | One build plan per work item: how each approved requirement is met. Open it before building an item. Kept after delivery. |

## Tools

| Tool | Use it for | Detail |
| --- | --- | --- |
| `mem0` MCP server | Working memory, lasting memory, and pending saves. Written only through the `knowledge-save` skill. | `docs/knowledge-manual.md` |

## Quick saves

| Path | How updates land | Instructions |
| --- | --- | --- |
| `README.md`, `delivery/architecture/`, `docs/designs/` | Authorized documentation-only updates go straight to the default branch. | `.claude/rules/knowledge-direct-commit.md` and the `publish-docs` skill |
| `prds/` and `PROJECT.md` | Content approval follows the knowledge manual, then the route above. Memory records go through the same skill. | `docs/knowledge-manual.md` and the `knowledge-save` skill |
````

There is no `knowledge/` row in the codemap and no `knowledge/` folder. The
System Guide, when enabled, keeps its own configured path.

## Sample CLAUDE.md

The whole file:

````markdown
@AGENTS.md
````

Claude Code expands that import and reads `AGENTS.md` through it, in every
version and every kind of session. Codex reads `AGENTS.md` by itself and never
reads `CLAUDE.md`, so the import line costs Codex nothing.

The two files have swapped jobs twice. `AGENTS.md` first repeated the codemap,
the working rules, and the folder detail, so that a Codex session was guaranteed
to have the map, and that second copy drifted from the first. It then became one
line telling Codex to open `CLAUDE.md`, which relied on the model choosing to
follow it. Now `AGENTS.md` holds the content that both hosts load, and
`CLAUDE.md` is the one import line. There is still one copy of each thing.

## What is deliberately not in either file

- Any rule already in `.claude/rules/`, beyond a short Quick saves pointer to
  its canonical instructions.
- How to talk to the owner. That is machine-wide, in the owner's own
  `~/.claude/`.
- Any multi-step procedure. Those are skills.
- Anything a session could find in one command: what is Git-ignored, what is
  generated, which folders are empty. The local quick-save row may name its
  Git-ignored boundary because that explains its handling.
- Where anything came from or when it arrived. Git history owns that.
- Current phase, next action, or open work. The tracker owns that.
- What the knowledge folder contains. Its `knowledge-manual.md` owns that.

This example uses GitHub for work tracking, so it has no `.work-items/` row. A
project that selected local tracking adds this row as well:

```markdown
| `.work-items/` | Update the existing shared, Git-ignored local tracker. Do not create a worktree, commit, or push for the tracker update. | `.claude/rules/work-item-folders.md` and the `work` skill |
```

Keep the documentation-publication row even without knowledge or local tracking,
unless the owner opted out. Replace its example paths with the actual project's
documentation locations; do not create missing example folders.

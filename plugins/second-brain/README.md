# second-brain plugin

A production-ready Git-native project memory and knowledge system shared by
Claude and Codex.

Second-brain v3 stores current specifications, discovery, and durable project
knowledge as ordinary Markdown in the adopting repository. Git provides
history, review, conflict detection, and recovery.

**Setup: sets up a project.** Install once per machine, then each project opts
in and gets its own `specs/`, `brainstorms/`, and `memory/` folders.

## Install

```text
/plugin install second-brain
```

For a new project, `project-init` is the normal entry point. For an existing
project, use `project-sync` so adoption begins with a read-only audit.

## Skills

- **second-brain** (`/second-brain`): explains, installs, audits, adopts,
  reviews, and maintains the complete v3 system.
- **remember** (`/remember`): sends a clear owner-approved memory request to
  the on-demand memory librarian for placement and writing.

## What v3 installs

```text
.claude/rules/second-brain.md
.claude/agents/memory-librarian.md
brainstorms/README.md
specs/README.md
memory/README.md
memory/context/README.md
memory/planning/README.md
memory/decisions/README.md
memory/knowledge/README.md
memory/references/README.md
memory/domain/README.md
memory/operations/README.md
```

`CLAUDE.md` and `AGENTS.md` receive the same compact project-memory map and
route both agents to the canonical shared rule.

The complete schema installs as one coherent system. Project-specific areas
such as `authentication/`, `billing/`, or `salesforce/` are created only when
they are real areas in that project.

## How information is organized

- `brainstorms/`: flat dated discovery and interviews, non-authoritative.
- `specs/`: current approved behavior, organized by system area and capability.
- `memory/context/`: durable circumstances and constraints.
- `memory/planning/`: vision, roadmap, milestones, risks, and assumptions.
- `memory/decisions/`: important choices and rationale.
- `memory/knowledge/`: reusable non-obvious understanding.
- `memory/references/`: useful sources and why they matter.
- `memory/domain/`: business concepts, language, actors, and rules.
- `memory/operations/`: operating, release, recovery, and support guidance.

Work-tracker remains authoritative for tickets, status, blockers,
relationships, handoffs, branches, pull requests, and landing proof. Raw
meetings, transcripts, communications, deliverables, and source exports remain
in the project's ordinary artifact scaffolding.

## Main agent and memory librarian

The main agent notices useful durable information and proposes it at approved
completion points:

- substantial task completion before a pull request is opened or merged;
- the end of a brainstorm or requirements interview;
- the end of a milestone or project phase; or
- another natural stopping point after meaningful work with a settled durable
  result.

Ordinary replies, trivial actions, and unfinished handoffs do not cause repeated
reviews. One review may satisfy several nearby stopping points.

There is no proposal count limit. The owner approves, selects, edits, combines,
defers, or skips proposals in normal language.

After approval, the main agent must invoke the on-demand memory librarian. It
writes approved Markdown in the same task worktree and handles routine
placement, indexes, and required structural links. It may delete, move, merge,
split, or supersede content when the exact structural change was visibly
owner-approved. Memory is maintained, not merely accumulated.

If an approved write fails, the task remains unfinished and the pull request
does not merge as though it succeeded unless the owner explicitly waives it. A
deferred proposal changes no durable document and creates no memory queue.

Before a pull request containing specification or memory changes merges, the
branch is brought current through the existing Git workflow. The main agent then
invokes the librarian for a read-only comparison with the latest memory and
indexes. It reports duplicate canonical homes or conflicting current truth that
parallel branches placed in different files, where Git cannot detect a text
conflict.

A clear `remember this` request directly approves saving the identified
content. An ambiguous request receives one focused question or a proposed
durable takeaway.

## Greenfield and brownfield use

Greenfield setup proposes the complete core plus only the known project system
areas, then offers an initial memory pass and `grill-me`.

Brownfield adoption starts read-only. Existing documents are classified as:

1. keep and link;
2. move with approval;
3. consolidate with approval; or
4. leave unresolved.

The audit distinguishes observed behavior, inference, owner-confirmed intent,
and unknowns whenever confusing them could mislead future work.

## What v3 does not use

- database, Worker, or hosted memory service;
- memory MCP server;
- embeddings or semantic search;
- hooks or scripts that capture, recall, place, or write memory;
- transcript or per-message capture;
- background, scheduled, or autonomous curation;
- deterministic classification or approval parsing;
- mandatory YAML, tags, sources, aliases, or fixed proposal counts; or
- automatic Git, pull-request, merge, or deployment actions.

A hook from the `hooks-library` plugin may enforce a rule or start the durable
review at a completion point. That is the hook doing the remembering an agent
skips. The owner still approves every proposal, and the memory librarian still
does every specification and curated-memory write. An owner-invoked `grill-me`
session writes only its raw, non-authoritative brainstorm checkpoints and index
entry.

## Archived v1

The previous Worker, Neon, MCP, curator, hook, outbox, and cache system remains
retired. Its content is not a v3 migration source or current truth.

One thing that lived in this plugin was never part of v1 and is not retired: the
Salesforce dependency graph. It only ever read local metadata files, so it
survived v1's retirement and now ships with `project-init`, at
`plugins/project-init/skills/project-init/references/salesforce-dependency-graph.md`.
It is not part of second-brain and never depended on it. It is not in the
archive.

All other v1 source has been removed from the installable plugin and
consolidated in
[`archive/second-brain-v1/`](../../archive/second-brain-v1/README.md) for
historical inspection. Brownfield adoption may report committed local v1 wiring
and separately offer local deactivation or approved removal. It never contacts
cloud resources or reads legacy memory.

## Verification

Run:

```text
node plugins/second-brain/tests/v3-harness.mjs
node plugins/second-brain/tests/retirement-harness.mjs
node tests/link-check.mjs
claude plugin validate .
```

The v3 harness assembles a temporary greenfield project, verifies the complete
core and Claude/Codex route parity, checks brownfield guidance, and removes the
fixture. It does not change a real project.

`link-check.mjs` belongs in this list because this plugin is the one that tells
writers to link to a canonical home instead of copying it. That instruction is
only safe while the links resolve.

## Canonical design

The shipped behavior is specified under
[`docs/second-brain-v3/`](../../docs/second-brain-v3/README.md). The old v2
proposal remains superseded historical material and is not a v3 requirements
source.

## Maintaining this plugin

A content change bumps both plugin manifests and the marketplace metadata
version. Keep this README, the top README, `docs/toolkit-map.md`,
`project-init`, `project-sync`, `grill-me`, and the v3 specification aligned.

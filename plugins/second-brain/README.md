# second-brain plugin

One portable project-knowledge folder shared by Claude, Codex, Git, and an
optional Obsidian vault.

**Setup: sets up a project.** New projects install it through `project-init`.
Existing projects use `project-sync`, which begins with a read-only layout
check and shows the owner every proposed move before anything changes.

## Install

```text
/plugin install second-brain
```

The plugin keeps its established name so projects that already enable or
disable `second-brain@claude-toolkit` do not need a settings rename.

## What it installs

```text
knowledge/
  .obsidian/
    app.json
  project.md
  index.md
  specs/
  memory/
    tags.md
    context/
    decisions/
    domain/
    knowledge/
    operations/
    planning/
    references/
  brainstorms/

.claude/hooks/knowledge-session-start.mjs
.claude/hooks/save-reminder.mjs
.claude/tools/build-knowledge-index.mjs
.claude/tools/knowledge-layout.mjs
```

The adopting project's root instructions receive a short route to
`knowledge/project.md` and `knowledge/index.md`. Claude's `SessionStart` hook
prints those two files. Codex receives the same read instruction through the
root `AGENTS.md`; a project may also register the fail-open loader through its
native Codex hook configuration when that host supports hooks.

The project turns off Claude Code's private auto-memory. The committed Markdown
files are the one shared truth.

## Skills

- **second-brain** detects, installs, adopts, migrates, or explains the whole
  system.
- **remember** applies the four save filters, shows the owner the change and
  why, then writes only approved words.
- **recall** reads the project map and opens only the knowledge relevant to the
  task.
- **cleanup** reviews stale, repeated, conflicting, or misplaced knowledge and
  proposes owner-approved repairs.

## What each folder owns

- `knowledge/project.md`: what the project is, why it exists, what finished
  looks like, its main workstreams and boundaries, who is involved, and where
  active work is tracked.
- `knowledge/specs/`: approved product or system behavior.
- `knowledge/memory/`: durable context, decisions, domain language, project
  conclusions, operations, planning, and external references.
- `knowledge/brainstorms/`: raw exploration that is not approved truth.
- `knowledge/index.md`: a generated map of specifications and memories.
- `knowledge/.obsidian/`: one portable setting that keeps links relative and
  updates Markdown links when Obsidian renames a file.

Normal relative Markdown and Git remain authoritative. Obsidian is optional.
The plugin installs no community Obsidian plugin and no Git synchronization.

## Approval boundary

Every proposal begins with `What I want to change` and `Why`, in plain bullets,
before the exact words. Short saves are numbered in chat. Every specification
and any large draft may be written to the current working branch for direct
owner review. A branch draft is not approved truth and must not merge until the
owner approves it.

Nothing writes durable project knowledge automatically. Hooks remind and read.
Helper agents may research, but they cannot approve a save.

## Migration

The installed layout tool has four modes:

```text
node .claude/tools/knowledge-layout.mjs detect [project-root] [--json]
node .claude/tools/knowledge-layout.mjs plan [project-root] [--json]
node .claude/tools/knowledge-layout.mjs apply [project-root] --approve <plan-hash>
node .claude/tools/knowledge-layout.mjs review-retired [project-root] --output <empty-dir>
```

Detection uses system signatures, not folder names. It reports `knowledge`,
`flat-149`, `retired-v3`, `none`, `mixed`, or `unknown`.

`plan` never writes. A flat-layout plan checks targets, symlinks, and mapped
Markdown links, and emits the hash required by `apply`. Apply moves documents
without changing their bytes except for deterministic relative-link repair,
discards the old generated index, and rebuilds the new one.

Retired documents cannot be converted safely by guessing what an old `Basis:`
line means for source, date, session, source file, and tags. `review-retired`
therefore writes drafts and a manifest to a separate empty review directory.
It never changes or finalizes the project. The owner resolves every placeholder
before a later approved adoption pass.

Mixed, partial, ambiguous, colliding, escaping, or dangling layouts stop with
no project write.

## What is deliberately absent

- the retired memory verifier;
- the retired large always-loaded memory rule;
- the retired shape checker and per-folder indexes;
- a database, embeddings, or memory server;
- automatic transcript capture or background curation;
- Obsidian-only wikilinks, canvases, Bases, community plugins, or Git plugins;
- a private note store outside the repository.

## Verification

```text
node plugins/second-brain/tests/knowledge-harness.mjs
node plugins/second-brain/tests/retirement-harness.mjs
```

The knowledge harness builds temporary projects for every detector state,
checks greenfield assets, runs flat migration, tests link repair and failures,
creates retired review drafts, exercises both hooks, and removes every fixture.

## Maintaining this plugin

A content change updates both plugin manifests and the marketplace metadata.
Keep the three consuming workflows aligned: `project-init`, `project-sync`, and
this plugin. The project specification is the behavior authority; the package
is its portable implementation.

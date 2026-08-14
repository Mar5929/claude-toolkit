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
.claude/tools/knowledge-health.mjs
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
- **remember** finds where persistent information belongs, shows short What,
  Where, Why, Assumptions, and Unverified bullets, then writes only the approved
  meaning.
- **recall** reads the project map and opens only the knowledge relevant to the
  task.
- **cleanup** reviews stale, repeated, conflicting, or misplaced knowledge and
  combines the read-only health report with a meaning review, then proposes
  owner-approved repairs.
- **session-search** searches existing local Claude Code CLI conversations only
  after current project files fail to answer, and treats every match as history.

## Session search boundary

The agent is the main user of session search. It reads current project files
first, then searches local Claude Code CLI history only when those files leave a
real gap or the owner asks. Raw matches remain tool context unless the owner
asks to see one or a conflict needs explaining.

The first pass searches the current project and returns at most five excerpts
of 500 characters each. It may be widened to the repository's worktrees.
Searching every project requires the owner's explicit choice and a second
command flag. A selected result may expand to its complete visible message or
adjacent conversation turn. Match time, session start, and last activity are
separate fields so a conversation spanning several days is not mislabeled.

The reader uses Claude Code's documented local transcript location. Anthropic
states that the JSONL record shape is internal and may change, so unknown
records are skipped and unreadable history fails plainly. The reader never
returns tool results or hidden thinking, changes a transcript, creates an
index, writes project knowledge, or sends session data elsewhere.

## Fixed properties and project tags

Every memory uses only six YAML properties: `source`, `source-file`, `date`,
`session`, `tags`, and `superseded-by`. The source value separates exact owner
quotes, owner paraphrases, named repository files, direct agent observations,
and unchecked agent conclusions.

Tags describe project subjects only. Each project owns its vocabulary, so a
Salesforce project never inherits this toolkit repository's tags. A normal save
checks every approved tag and its usage but shows the owner only relevant tags,
proposed tags, and concrete warnings.

The installed health tool generates four read-only views:

```text
node .claude/tools/knowledge-health.mjs health [project-root] [--json]
node .claude/tools/knowledge-health.mjs properties [project-root] [--json]
node .claude/tools/knowledge-health.mjs tags [project-root] [--json]
node .claude/tools/knowledge-health.mjs provenance [project-root] [--json]
```

Add `--focus <repository-relative-path>` after an approved save to limit
owner-facing warnings to that file while still checking the complete tag
vocabulary and its usage.

The reports are generated on demand from Markdown and are never committed.
They identify mechanical risks. The cleanup skill reviews meaning and proposes
the owner-approved repair. No tool silently changes persistent knowledge.

## What each folder owns

- `knowledge/project.md`: what the project is, why it exists, what finished
  looks like, its main workstreams and boundaries, who is involved, and where
  active work is tracked.
- `knowledge/specs/`: approved product or system behavior.
- `knowledge/memory/`: persistent context, decisions, domain language, project
  conclusions, operations, planning, and external references.
- `knowledge/brainstorms/`: raw exploration that is not approved truth.
- `knowledge/index.md`: a generated map of specifications and memories.
- `knowledge/.obsidian/`: one portable setting that keeps links relative and
  updates Markdown links when Obsidian renames a file.

Normal relative Markdown and Git remain authoritative. Obsidian is optional.
The plugin installs no community Obsidian plugin and no Git synchronization.

## Approval boundary

Every proposal starts with short What, Where, Why, Assumptions, and Unverified
bullets. Full file text appears only when the owner asks. Approval covers only
the meaning in those bullets, and the write may add no unlisted claim, source,
assumption, or background.

Nothing writes persistent project knowledge automatically. Hooks remind and read.
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
node plugins/second-brain/tests/session-search-harness.mjs
```

The knowledge harness builds temporary projects for every detector state,
checks greenfield assets, runs flat migration, tests link repair and failures,
creates retired review drafts, exercises both hooks, checks property, tag,
provenance, and health behavior, and removes every fixture.
The session-search harness builds local transcript fixtures, checks scope and
privacy boundaries, expands selected messages, verifies failure states, and
proves the transcript tree stays unchanged.

## Maintaining this plugin

A content change updates both plugin manifests and the marketplace metadata.
Keep the three consuming workflows aligned: `project-init`, `project-sync`, and
this plugin. The project specification is the behavior authority; the package
is its portable implementation.

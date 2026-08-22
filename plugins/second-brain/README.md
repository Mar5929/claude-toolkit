# second-brain plugin

One portable project-knowledge folder shared by Claude, Codex, Git, and an
optional Obsidian vault.

**Setup: sets up a project.** New projects install it through `project-init`.
Existing projects use `project-sync`, which reads the folder first and shows the
owner everything that would change before anything moves.

## Install

```text
/plugin install second-brain
```

The plugin keeps its established name, so projects that already enable or
disable `second-brain@claude-toolkit` do not need a settings rename.

## What it installs

```text
SOUL.md                              who the agent is in this project

knowledge/
  project.md                         what the project is, where work is tracked
  current.md                         short-term working memory, overwritten
  memory/
    memory-index.md                  generated, one line per file
  specs/
    spec-index.md                    generated, one line per file
  brainstorms/                       raw exploration, never approved truth
  .obsidian/app.json                 one portable vault setting

.claude/rules/where-persistent-information-belongs.md
.claude/hooks/knowledge-session-start.mjs
.claude/hooks/save-reminder.mjs
.claude/hooks/work-item-close.mjs
.claude/hooks/command-parsing.mjs
.claude/tools/build-knowledge-index.mjs
.claude/tools/check-knowledge.mjs
.claude/tools/frontmatter.mjs
```

`knowledge/memory/` and `knowledge/specs/` are **flat**. One file per topic, no
subfolders by type. A note about one topic is usually a fact and a decision and a
piece of history at once, so nobody picks a bin.

Claude's `SessionStart` hook prints `SOUL.md`, `knowledge/current.md`, and the
entry lines of the two indexes. Codex receives the same instruction through the
root `AGENTS.md`, written out in full because Codex reads that file and nothing
else. A project may also register the fail-open loader through its native Codex
hook configuration where that host supports hooks.

The project turns off Claude Code's private auto-memory. The committed Markdown
is the one shared truth.

## Skills

- **remember** decides where persistent information belongs, shows What, Where,
  Source, Tags, and Assumptions bullets, and writes only what the owner keeps.
- **recall** walks the find ladder and opens only what the task needs.
- **retire** takes one file out of current use: supersede, retire, or delete.
- **reflect** sweeps the whole folder for duplicates, overlaps, contradictions,
  and expired value, and proposes an action for each.
- **second-brain** detects, installs, adopts, converts, or explains the system.
- **session-search** searches local Claude Code CLI history. Tier 5 of the find
  ladder.

## The find ladder

When an agent needs to know something it goes down these tiers and stops at the
first that answers.

| Tier | Where |
|---|---|
| 1 | `knowledge/current.md`, short-term working memory |
| 2 | `.claude/rules/`, in case it is a standing instruction |
| 3 | Skills, in case it is a procedure rather than a fact |
| 4 | `knowledge/memory/` then `knowledge/specs/`, through their indexes |
| 5 | Past sessions, through `session-search` |

When tier 4 finds nothing, the agent says so and names what it searched, then
offers tier 5 rather than taking it silently.

Everything tier 5 returns comes back flagged: "I found this in a previous
session. Is this still accurate?" A past session is a record of what was said
once, never current truth, and nothing is written on the strength of having been
found there.

## The file shape

Nine required fields on every memory file:

`summary`, `type` (fact, decision, event, context, constraint), `status`
(current, superseded, retired), `source`, `confidence` (observed, reported,
inferred), `created_at`, `tags`, `approved_by`, `approval_date`.

Optional, written only when they apply: `confirmed_at`, `source_quote`,
`effective_from`, `effective_to`, `project`, `work_item`, `supersedes`,
`superseded_by`, `related_memories`.

A specification file uses the same set minus `confidence` and `type`, plus
`area`. A specification is approved behavior, so "how sure are we" does not apply
to it.

`confidence` is what makes a saved file safe to read: **observed** means the
agent checked it, **reported** means someone said it, **inferred** means the
agent worked it out and nobody checked. Inferred stays inferred until somebody
checks it. Time passing does not promote it.

`tags` are free-form. There is no fixed vocabulary and no tag file. Each project
grows its own.

## Checking

```text
node .claude/tools/build-knowledge-index.mjs   # rebuild both indexes
node .claude/tools/check-knowledge.mjs          # read-only, exits 1 on a problem
```

The checker fails on a missing required field, a value outside its list, a bad
date, an over-long summary, tags that are not a list, a `superseded_by` pointing
at a file that does not exist, a `superseded_by` whose status disagrees with it,
a subfolder under a flat folder, a filename that is not the topic in plain words,
a file with no title, a `current.md` over its 2,000 character cap, and eight
shapes of secret.

It never edits, moves, or deletes anything. It exists so a save can be verified
instead of assumed.

## What each file owns

- `SOUL.md`: who the agent is here, its role, its purpose.
- `knowledge/project.md`: what the project is, why it exists, what finished looks
  like, its boundaries, who is involved, and where active work is tracked.
- `knowledge/current.md`: what is being worked on now, what is blocking it, the
  next step. Overwritten, never appended, and nothing in it is a lasting fact.
- `knowledge/specs/`: how the system is meant to work, once settled.
- `knowledge/memory/`: lasting facts, decisions, events, context, constraints.
- `knowledge/brainstorms/`: raw exploration that is not approved truth.
- The two indexes: generated, never hand-edited. If one disagrees with the files
  on disk, the files win.

A current specification beats a memory. When a memory and a current
specification disagree, the agent says so and names both rather than quietly
picking one.

## Approval boundary

Every proposal shows What, Where, Source, Tags, and Assumptions. The owner
approves **What** and **Source**; the rest is shown so he can see how it is
being filed, and he may change any of it.

Silence, an unclear answer, or asking to see the full text all mean nothing gets
written. Asking to see the text is not approval. The write adds no claim,
source, assumption, or background the bullets did not cover.

Nothing writes persistent knowledge automatically. Hooks remind and read. Helper
agents may research; they cannot approve a save.

The one exception is converting a project off an older layout, where the files
were already approved once in their old shape. There the owner approves in
batches after the write, and anything that will not convert cleanly is stopped
on and named rather than guessed.

## What is deliberately absent

- a database, embeddings, or memory server;
- a shipped test or eval framework;
- the retired memory verifier, health tool, and layout tool;
- the retired always-loaded memory rule and per-folder indexes;
- automatic transcript capture or background curation;
- Obsidian-only wikilinks, canvases, Bases, community plugins, or Git plugins;
- a private note store outside the repository.

## Verification

There is no harness to run. The two tools are the check:

```text
node .claude/tools/check-knowledge.mjs
node .claude/tools/build-knowledge-index.mjs
```

Build the index twice and confirm the second run changes nothing. Run the
checker against a file with a field removed and confirm it fails with a plain
message naming the file.

## Maintaining this plugin

A content change updates both plugin manifests and the marketplace metadata.
Keep the three consuming workflows aligned: `project-init`, `project-sync`, and
this plugin.

The behavior authority is `knowledge/specs/knowledge-system.md` in the toolkit
repository. It is not installed into projects; this package is its portable
implementation.

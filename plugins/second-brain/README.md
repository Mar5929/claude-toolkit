# second-brain plugin

One portable project-knowledge system shared by Claude Code, Codex, Git, and an
optional Obsidian vault. Its save gate removes generic agent, tool, shell, and
troubleshooting lessons before the owner sees a project-knowledge proposal.

New projects install it through `project-init`. Existing projects use
`project-sync`, which reports every change before touching the project.

## Install

```text
/plugin install second-brain
```

The plugin keeps its established name, so existing project settings do not need
a rename.

## What it installs

```text
SOUL.md                              who the agent is in this project

knowledge/
  README.md                          managed operating manual
  project.md                         project framing and tracker location
  current.md                         short-term work state, overwritten
  memory-self-improvement.md         what the owner counts as memory-worthy
  memory/
    memory-index.md                  generated, one line per memory
  specs/
    spec-index.md                    generated, one line per specification
  brainstorms/                       unchecked exploration
  .obsidian/app.json                 minimal portable vault setting

.claude/hooks/knowledge-session-start.mjs
.claude/hooks/save-reminder.mjs
.claude/hooks/work-item-close.mjs
.claude/hooks/command-parsing.mjs
.claude/tools/build-knowledge-index.mjs
.claude/tools/check-knowledge.mjs
.claude/tools/frontmatter.mjs
```

The packaged source for the manual is
`skills/second-brain/references/templates/knowledge/README.md`. Every equipped
project receives it unchanged as `knowledge/README.md`. Setup and sync treat it
as a managed copy, not project-authored knowledge.

The fail-open startup hook loads `SOUL.md`, the manual, `knowledge/project.md`,
`knowledge/current.md`, and the entry lines of both indexes, in that order. The
same loader is registered for Claude Code and Codex. A short root instruction is
the fallback when a hook does not run. It does not repeat policy.

The project turns off Claude Code's private auto-memory. Committed Markdown and
Git remain the shared source of truth.

## What owns what

- `knowledge/README.md` owns all shared runtime policy, including placement,
  finding, saving, file shape, approval, trust, lifecycle, and the skill map.
- `knowledge/specs/knowledge-system.md` in the toolkit repository is the build
  authority for maintainers. Adopting projects do not receive that file.
- Each skill below owns only the steps unique to its task and points to the
  manual for shared policy.

## Skills

- **remember** scopes candidates to the current project, searches, proposes,
  writes approved meaning, verifies it, and logs what the owner decided.
- **recall** walks the manual's find order and opens only relevant files.
- **retire** safely changes one file's lifecycle.
- **reflect** reviews the whole folder for meaning problems and consolidates the
  self-improvement record.
- **second-brain** detects, installs, converts, or repairs the system.
- **session-search** searches local Claude Code CLI history read-only.

## Tools

```text
node .claude/tools/build-knowledge-index.mjs
node .claude/tools/check-knowledge.mjs
```

The builder creates the two deterministic indexes. The checker validates the
managed manual, knowledge file shape, links, flat-folder layout,
`knowledge/current.md` and `knowledge/memory-self-improvement.md` size, and
common secret patterns. It reports problems and never edits, moves, or deletes
anything.

## Deliberately absent

- a database, embeddings, or memory server;
- automatic transcript capture or background curation;
- the retired verifier, health tool, layout tool, and test harness;
- the retired always-loaded memory rule and per-folder indexes;
- Obsidian-only links, plugins, or private note stores.

## Maintaining this plugin

A content change updates both plugin manifests and the marketplace metadata.
Keep the manual, setup skill, `project-init`, `project-sync`, startup hook, and
static contract tests aligned.

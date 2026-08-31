# Toolkit setup record for claude-toolkit

What this repository set up from its own toolkit, what it skipped, and why. A
later `project-sync` run reads this so a considered "no" is not offered again.

Synced against: `project-init` 0.34.0, on 2026-08-04, for GitHub issue #138.

Changed since, on 2026-08-06, for GitHub issue #149: this repository replaced
the retired second-brain system with a smaller memory system. What that changed
is marked below.

Changed again on 2026-08-11 for GitHub issue #170: the smaller system became the
packaged `second-brain` plugin, and this repository adopted it under one
`knowledge/` root. The root is also a portable Obsidian vault, while Markdown
and Git remain authoritative.

Changed on 2026-08-12 for GitHub issue #174: the packaged system added
read-only search of saved Claude Code CLI sessions as a separate historical
source. Current project files stay authoritative, and no transcript is copied
into project knowledge.

Changed again on 2026-08-12 for GitHub issue #175: the memory system gained a
fixed property vocabulary, project-specific tag checks, visible provenance,
and the read-only `.claude/tools/knowledge-health.mjs` report. The startup route
now carries one short rule that keeps live work and reusable procedures out of
persistent project knowledge.

Rebuilt on 2026-08-21 for GitHub issue #215. Memory became one flat folder with
one file per topic and free-form tags, replacing seven subfolders by type and a
fixed tag list. `SOUL.md` and `knowledge/current.md` are new. The nine required
properties carry visible provenance through `source` and `confidence`. Finding
follows a five-tier ladder ending in session search, whose results always come
back flagged as possibly out of date. 2,659 lines of health, layout, and
harness machinery were deleted in favour of one read-only checker: that
machinery was a large part of why saving cost more than it gave back.

Cleaned up on 2026-08-22 for GitHub issue #219. The system now has one managed
`knowledge/README.md` operating manual. Claude Code and Codex load it once with
the same small project map. Root files, rules, hooks, and skills point to the
manual instead of carrying policy copies.

Changed on 2026-08-28 for GitHub issue #236. This project now runs the default
project file lifecycle rule it ships. The rule keeps work tracking, active
architecture, approved behavior, lasting decisions, implementation,
presentation deliverables, and retired material in separate authoritative
homes.

This repository is the toolkit. It now runs the toolkit on itself, the same way
Anchor, DragonFly, and Diligence Ready do, so a change to the memory system, the
rules, the output style, or the hooks is felt where it is written instead of
three weeks later in another project.

## Gates

| Gate | Result |
| --- | --- |
| 0. Orient | Done. Existing repository, not a new one, so this ran as a sync rather than an init. Node and Markdown, no application stack. |
| 1. Scaffolding and work tracking | Already answered. Work is tracked on the `Claude-Toolkit-Project` board on GitHub. `CLAUDE.md` names it, and `spec-before-you-build.md` is installed alongside that pointer. No scaffolding was added: the folder layout already existed. |
| 2. Hooks | Done. `save-reminder` and `knowledge-session-start` are installed under `.claude/hooks/` and registered in `.claude/settings.json`. Codex registers the same startup loader in `.codex/hooks.json`. The two style hooks were removed with the toolkit, as explained below. |
| 3. Project knowledge | **Adopted from the packaged plugin.** `SOUL.md`, the managed operating manual, `knowledge/project.md`, `knowledge/current.md`, and both generated index entry lists load at session start. Approved specifications, flat persistent memory, and unchecked brainstorms live under the same knowledge root. The packaged skills keep only task-specific steps. The retired policy rule and machinery stay removed. |
| 4. Knowledge layer | Included with Gate 3. The graphify code graph was offered and declined, see below. |
| 5. Root instructions, rules, output style | Done. `CLAUDE.md` and `AGENTS.md` carry the same short project knowledge route. `.claude/rules/` holds the applicable general rules, with no large memory rule or wrap-up ritual. Claude Code's built-in `Concise` style is selected in `.claude/settings.json`; the hand-written `plain-language` style this repo used to ship was removed from the toolkit in issue #245. |
| 6. Optional toolkit skills | Done. All five now ship in one plugin, `session-skills`: `explain-simply`, `grill-me`, `handoff`, `session-summary`, and `track-tasks`. The four that predate the merge were already switched on in the machine settings at `~/.claude/settings.json`. |

## Rules installed

Every default-on general rule that fits, copied unmodified from
`plugins/project-init/library/rules/general/`. `.claude/rules/README.md` lists
what each one does, and which ones this repository does not carry.

Two retired rules remain deliberately absent: `second-brain.md` and
`wrap-up-ritual.md`. The current policy lives in
`knowledge/README.md` and loads once at session start.

Two more default-on rules were deliberately left out from the start:

- `work-item-folders.md`. It governs the Git-native work-tracker, one folder per
  work item inside the repository. Work here is tracked on the GitHub board, so
  there are no work-item folders for it to govern.
- `dependency-graph.md`. Conditional on a code graph being installed, and none
  is.

MCP tool rules were not folded in. They are conditional on the project using a
given MCP server, and this repository's own work uses none.

## Declined

- **The graphify code graph.** It answers "what calls this, and what breaks if I
  change it" from a built graph. This repository is Markdown and a handful of
  Node checks, so the questions it answers do not come up here, and the freshness
  hooks it needs are not committed and would silently go stale in each clone.
  `tests/orphan-check.mjs` and `tests/link-check.mjs` already cover the reachable
  and resolvable questions this repository does have. Do not offer it again
  unless real code lands here.

## What running the toolkit here does to parallel sessions

Several sessions work in this repository at once, each in its own worktree. The
memory system adds a shared file they can collide on that was not there before.

Every approved save rebuilds `knowledge/memory/memory-index.md` and
`knowledge/specs/spec-index.md`. Two sessions saving on different branches can
both change them, so Git may merge both with no reported conflict and still
leave the result wrong.

The answer is that nobody edits that file by hand. After bringing a branch
current, run `node .claude/tools/build-knowledge-index.mjs` again: it rebuilds
the index from the documents, which are what win whenever the two disagree.
`CLAUDE.md` states it under "Parallel sessions in this repo".

## The copies, and what keeps them honest

This repository now holds two of almost every rule: the file it ships to other
projects, under `plugins/`, and the copy it runs, under `.claude/`. The copies
are unmodified on purpose. Adapting them would make this a worse test of what it
ships.

`tests/installed-copy-check.mjs` fails when a shipped file and its copy stop
matching, including the managed manual, or when the block shared by `CLAUDE.md`
and `AGENTS.md` differs. `tests/knowledge-startup-check.mjs` enforces the startup
order, host parity, manual size, and single policy owner. Run both with the other
checks before opening a pull request.

The two files are compared word for word with no exceptions. The passage they
used to word differently, between `<!-- host-specific:start -->` and
`<!-- host-specific:end -->`, belonged to the retired verifier system. The
obsolete root-schema comparison was removed with it.

The knowledge runtime under `.claude/` is now installed from the packaged
`second-brain` plugin: the startup loader, pull-request reminder, generated
index builder, checker, frontmatter reader, and managed manual. The
installed-copy check compares them with their plugin originals.

## Specifications

`knowledge/specs/` fills as work happens. A capability gets its specification
the first time an issue changes what that capability does. Specifications were
deliberately not written up front for the plugins. Every current specification
and memory is listed in one of the two generated indexes.

## The style hooks, removed with the toolkit

`writing-guard` refused any finished reply containing an em dash or a section
sign, which made the agent rewrite it. The owner turned it off here on
2026-08-06, because the hook runs on the Stop event, after the reply is
finished and already on the owner's screen, so he read every refused answer
twice, once refused and once rewritten.

`style-reminder` re-stated the output style on every message. The owner removed
it here on 2026-08-21 as per-message overhead for an instruction the harness
already re-delivers, and dropped both hooks from the toolkit in the same
change, along with the `show-phase-progress` and `steer-to-the-goal` rules.

Know the history before asking for anything like them back. `writing-guard` was
removed once before, in issue #101, on the theory that the hand-written
`plain-language` output style plus the `style-reminder` hook would hold the rule
on their own. Issue #102 brought it back after measuring real transcripts: one
em dash every 1.8 assistant messages in the worst project, against a rule four
words long. So expect the violations to return. This time that is the accepted
trade, not a surprise.

Issue #245 then removed the `plain-language` style itself and switched every
toolkit project to Claude Code's built-in `Concise` style. Nothing hand-written
now enforces voice at any level, and helper agents receive no style at all.

## The built-in memory, turned off here

Claude Code keeps its own per-project notes in a folder under `~/.claude/` that
only Claude Code can read. `knowledge/specs/memory-system.md` says this project
has one shared knowledge system, so `.claude/settings.json` keeps
`CLAUDE_CODE_DISABLE_AUTO_MEMORY` set to `1`. The same settings file enables the
packaged `second-brain` plugin, whose skills read and write the Git-owned files
under `knowledge/` through the owner-approval flow.

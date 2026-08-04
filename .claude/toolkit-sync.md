# Toolkit setup record for claude-toolkit

What this repository set up from its own toolkit, what it skipped, and why. A
later `project-sync` run reads this so a considered "no" is not offered again.

Synced against: `project-init` 0.34.0, on 2026-08-04, for GitHub issue #138.

This repository is the toolkit. It now runs the toolkit on itself, the same way
Anchor, DragonFly, and Diligence Ready do, so a change to the memory system, the
rules, the output style, or the hooks is felt where it is written instead of
three weeks later in another project.

## Gates

| Gate | Result |
|---|---|
| 0. Orient | Done. Existing repository, not a new one, so this ran as a sync rather than an init. Node and Markdown, no application stack. |
| 1. Scaffolding and work tracking | Already answered. Work is tracked on the `Claude-Toolkit-Project` board on GitHub. `CLAUDE.md` names it, and `spec-before-you-build.md` is installed alongside that pointer. No scaffolding was added: the folder layout already existed. |
| 2. Hooks | Done, all three. `style-reminder`, `writing-guard`, and `memory-pr-hook`, copied into `.claude/hooks/` and registered in the committed `.claude/settings.json`. Each was run by hand in both directions before being called installed. |
| 3. Second-brain v3 | Done, complete core. The canonical rule, the memory verifier, the memory routing in both root files, and every root index. |
| 4. Knowledge layer | Included with Gate 3. The graphify code graph was offered and declined, see below. |
| 5. Root instructions, rules, output style | Done. `CLAUDE.md` and `AGENTS.md` rewritten thin, `.claude/rules/` created with fourteen general rules plus the memory rule, and the plain-language output style installed and selected. |
| 6. Optional toolkit skills | Done. `grill-me` was already on. `handoff` and `session-summary` were switched on in the machine settings at `~/.claude/settings.json`. |

## Rules installed

Every default-on general rule that fits, copied unmodified from
`plugins/project-init/library/rules/general/`, plus `second-brain.md` from the
second-brain plugin. `.claude/rules/README.md` lists what each one does.

Two default-on rules were deliberately left out:

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

Every save touches an index (`memory/<type>/README.md`, `specs/README.md`,
`brainstorms/README.md`) as well as the document itself. Two sessions saving on
different branches usually edit different lines of the same index, so Git merges
both with no reported conflict and no warning, and the result can still be
wrong: the same truth filed in two canonical homes, or two entries that
contradict each other.

Nothing about that is specific to this repository, and it is already answered by
the pre-merge review in `.claude/rules/second-brain.md`: bring the branch
current, then have `memory-verifier` compare the changed documents and indexes
against the latest project state before the pull request merges. What is
specific here is that the review has to actually run, because this is the
repository where several sessions at once is the normal way of working rather
than the exception. `CLAUDE.md` states it under "Parallel sessions in this
repo".

## The copies, and what keeps them honest

This repository now holds two of almost every rule: the file it ships to other
projects, under `plugins/`, and the copy it runs, under `.claude/`. The copies
are unmodified on purpose. Adapting them would make this a worse test of what it
ships.

`tests/installed-copy-check.mjs` fails when a shipped file and its copy stop
matching, when the block shared by `CLAUDE.md` and `AGENTS.md` differs between
them, or when the memory routing in the root files drifts from the second-brain
plugin's `orientation-snippet.md`. Run it with the other two checks before
opening a pull request.

One passage in that shared block is allowed to differ, and only one:
`.claude/rules/keep-claudemd-current.md` says Claude invokes the
`memory-verifier` agent directly and Codex cannot, so each root file states that
obligation in the way its own program can act on. It sits between
`<!-- host-specific:start -->` and `<!-- host-specific:end -->` in both files.
The check requires exactly one such passage in each, refuses an empty one, and
compares everything outside them word for word.

What is not covered, so nobody assumes it is: nothing compares the shipped
memory rule at
`plugins/second-brain/skills/second-brain/references/second-brain-rule.md`
against the shipped summary next to it in `orientation-snippet.md`. Their
authority maps already word six of twelve rows differently. Every destination
matches, so no routing is wrong, and the rule is the canonical one by design, so
the summary being worded differently is allowed rather than broken. It is
recorded here because the difference is easy to mistake for drift.

## Specifications

`specs/` exists with its index and fills as work happens. A capability gets its
specification the first time an issue changes what that capability does.
Specifications were deliberately not written up front for the nine plugins.

---
summary: Major project folders carry short AGENTS.md guidance, with a one-line CLAUDE.md beside it, unless a canonical file already owns it, so local detail loads when needed.
group: Working with an agent
area: project-setup
status: finalized
source: GitHub issues #150 and #219, the folder instruction files this repository runs, and current Codex AGENTS.md loading behavior
created_at: 2026-08-12
confirmed_at: 2026-08-22
tags: [project-setup, folder-instructions, agents-md, context-budget]
approved_by: Mike Rihm
approval_date: 2026-08-22
project: claude-toolkit
work_item: "219"
updated_at: 2026-09-23
---

# Folder instruction files

Every major folder in a toolkit project carries its own short `AGENTS.md`, with a
one-line `CLAUDE.md` beside it holding the import for that `AGENTS.md`, unless
another canonical file already owns its instructions, so folder detail reaches
an agent when it opens that folder instead of loading in every session.

## What it is for

The root instruction file and every file in `.claude/rules/` load at the start of
every session. The bigger that pile grows, the less weight any one part of it
carries, and rules that are loaded get missed because they are buried. A folder
file is read later and only when it is needed, so folder detail moved there
leaves the always-loaded pile without being lost.

Each host reaches a folder file a different way:

- **Claude Code** loads a folder `CLAUDE.md` when an agent reads a file in that
  folder. That one-line file imports the `AGENTS.md` beside it, so the folder
  `AGENTS.md` arrives at the same moment.
- **Codex** reads the `AGENTS.md` files from the project root down to the
  directory the session starts in, so a folder `AGENTS.md` arrives at session
  start when the session starts inside that folder's subtree. A session started
  at the root opens the folder file by following the root codemap line.

## Who uses it

- **The owner.** Wants a root instruction file short enough to read and to keep
  current, and wants each folder to explain itself.
- **The agent.** Wants the orientation for a folder to arrive when it opens that
  folder, without every session paying for it.

## What it must do

- **New-project setup writes them.** Each major folder `project-init` creates
  gets a short `AGENTS.md` saying what the folder holds, how to work in it, and
  where the detail lives, plus the one-line `CLAUDE.md` beside it. Both are
  written at the same time as the folder, even when the folder starts empty.
- **Five kinds of folder are skipped**, and every skip is recorded in the setup
  summary: a folder that already has a `README.md` index, `.claude/` and
  everything under it, a folder another plugin creates and indexes, and a folder
  with an obvious name and no conventions to state. The fifth is `knowledge/`
  and everything under it: the root startup route and the project-knowledge
  specification already own that vault, so another instruction file would
  duplicate authority.
- **A `README.md` index is never repeated.** Where a folder has one it stays the
  one index. An `AGENTS.md` pair is written beside it only when the folder needs
  working notes the README does not carry. The two may both exist when they do
  not repeat each other: the README says what the folder holds, and the
  `AGENTS.md` holds only the working notes.
- **Sync treats a missing one as a gap.** `project-sync` reports each folder as
  present, missing, skipped by design, or not recognized, and adds a file only
  with the owner's approval. A folder that already has its own `AGENTS.md` pair is
  left alone and reported as present. A folder the toolkit did not create is
  reported and the owner is asked what it is for, never guessed at.
- **Sync reports the old layout as a gap and offers the move.** A folder holding
  a content-bearing `CLAUDE.md` is reported as one gap for that folder. After the
  owner says yes to that folder, sync renames the file to `AGENTS.md` with its
  content unchanged, fixes the title line, and writes the one-line `CLAUDE.md`
  beside it. Nothing moves without a yes, one file at a time.
- **Sync also offers the move of root lines.** For each folder file the owner
  approves, sync shows the lines in the root `AGENTS.md` about that folder and
  offers to move them into the folder file, leaving one codemap line pointing at
  it.
- **No rule moves.** Behavior rules stay in `.claude/rules/`, which loads every
  session. A folder file may point at a rule and may never hold the only copy of
  one.
- **The root file stays a router and a map:** what the project is, what is in
  each folder and when to open it, what tools the project runs on, and where
  work is tracked. A codemap line naming a folder is what sends an agent to that
  folder's own file.
- **Codex reaches the folder files by opening them.** Root `AGENTS.md` carries
  the content Codex needs at session start, including the instruction to read
  `.claude/rules/`. Nothing Codex must always know lives only in a folder file.
- **They are kept current.** When later work changes what a folder is for, that
  folder's `AGENTS.md` is updated in the same change, the same way the root file
  is.

## How it behaves from the outside

Setting up a new project: the owner approves a folder, and the folder, its
`AGENTS.md` and its one-line `CLAUDE.md` appear together. At the end, the setup
summary lists both the files written and the folders skipped, with the reason for
each skip.

Syncing an existing project: the gap report lists every folder in one of the
four states, and names any folder still holding a content-bearing `CLAUDE.md`.
Nothing changes until the owner approves. For each folder they approve, they see
the draft file, then the root `AGENTS.md` lines about that folder with an offer
to move them in.

Daily work: nothing changes for the agent except that opening a folder brings
that folder's orientation with it.

## Edge cases

- **A folder whose only content is a `README.md` index.** Skipped, and the skip
  is recorded. If the folder needs a working note the README does not carry, a
  pointer-only file is written instead: it names the folder, links the README,
  and adds the note.
- **The `knowledge/` vault.** Skipped even though it has no hand-maintained
  folder index. Its root route and specification already tell agents how to use
  it, and its generated index lists the current documents.
- **An agent runs a command against a folder without ever reading a file in
  it.** That folder's `AGENTS.md` never loads. This is exactly why behavior
  rules stay in `.claude/rules/`.
- **A folder the toolkit did not create.** Sync lists it as not recognized and
  asks the owner what it is for, rather than inferring a purpose from the name.
- **A Codex session works in the project.** A session started at the project root
  sees no folder file until it opens one, and the root codemap line is what sends
  it there. A session started inside a folder receives that folder's `AGENTS.md`
  at start. Everything Codex must always know is in the root file and the rules
  it names.

## What it deliberately does not do

- **No automatic staleness check.** Nothing detects a folder file that has
  fallen behind what its folder now holds. The upkeep rests on `project-sync`,
  which audits the folder files when it runs. There is no session-level rule
  behind it: `keep-claudemd-current.md` was removed from the toolkit on
  2026-08-31. If staleness shows up in practice, a reminder hook can be a later
  ticket.
- **No reliance on Codex loading a nested file on its own.** Codex assembles the
  `AGENTS.md` files from the project root down to the directory the session
  starts in, at most one per directory, and builds that chain once at the start
  of the run. It does not load a nested file later because the session opened a
  file in that folder. A folder file therefore holds detail an agent can be sent
  to, never something every session must know.
- **No long folder files.** Codex reads the whole chain against one shared size
  budget, `project_doc_max_bytes`, which is 32 KiB by default. A long root file
  or a long folder file can use the budget up and cause later files in the chain
  to be dropped. Folder files stay short for that reason as well as for Claude
  Code's context.
- **No `AGENTS.override.md`, `AGENTS.local.md`, or instruction file under
  `.agents/`.** Codex prefers `AGENTS.override.md` over `AGENTS.md` in the same
  directory and drops the `AGENTS.md` there, and Claude Code reads neither.

## Related

- [folder-agents-md.md](../../../plugins/project-init/skills/project-init/references/folder-agents-md.md):
  what goes in one, what never does, which folders get one, which are skipped,
  and the template.
- [thin-agents-md.md](../../../plugins/project-init/skills/project-init/references/thin-agents-md.md):
  that the root `AGENTS.md` is a router and a map, what never goes in it, and
  the one line that is the whole of `CLAUDE.md`.

## Notes

Updated 2026-09-22. Mike approved the change from folder `CLAUDE.md` files to
`AGENTS.md` pairs on 2026-09-22 (issue #388, open point 2, answered yes). The
build is in issue #388's pull request; the earlier one-root-`AGENTS.md` decision
from issues #150 and #219 is superseded by it.

2026-09-23, work item [#396](https://github.com/Mar5929/claude-toolkit/issues/396):
gap-assessment finding F2 (2026-09-21 Toolkit OS gap assessment) recorded. A
folder may hold both a `README.md` index and an `AGENTS.md` pair when they do
not repeat each other, which is how `tests/` in this repository works. Finding
F3 needed no change: the four-question list it named was replaced in the #388
rewrite, and root `AGENTS.md` content now follows `thin-agents-md.md`.

No open questions.

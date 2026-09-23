# docs/designs: the build plan for one work item

A design says **how** one work item gets built. It is written after that item's
requirements are approved, and before any code is written.

One file per work item, named `<work item id>-<short-slug>.md`. For example,
`270-work-item-upkeep.md`.

## When this folder applies

This folder is for a project whose work items live **outside** the repository,
on a GitHub issue board, in Linear, in Jira, or in anything else. There is no
folder on disk for the item, so the design needs a home of its own.

A project that tracks work in the Git-ignored `.work-items/` folder keeps each
design with its own item, the way every other file of that item is kept. It does
not use this folder.

## What goes in one file

Before designing or reviewing a toolkit solution, read and apply the
[owner's handshake principle](../../knowledge/prds/toolkit-operating-system/toolkit-operating-system.md#design-principle-guide-the-agent-through-handshakes).
That principle is settled even while the parent PRD remains proposed. Read the
active item's review plan before resuming; keep its accepted decisions and
review position rather than restarting the interview.

These design-specific instructions belong at this design entry point. The root
`AGENTS.md` and its one-line `CLAUDE.md` provide orientation and routing, as
required by the
[folder-instruction PRD](../../knowledge/prds/toolkit-operating-system/folder-instruction-files.md).
Their map leads here; they do not carry the design philosophy. The principle
itself stays in the parent PRD rather than being copied into project memory.

- How each approved requirement will be met.
- The files the change touches.
- How it will be tested.
- The order the work is done in.
- Preparation needed to understand the design, in this file.
- Bottom Notes with relevant decisions and their approval state, open questions,
  remaining document tasks, and the exact resume point. Update the actual
  design as answers settle and save meaningful changes promptly. The work item
  links here and keeps other work. Do not create a separate prep or interview
  record for new work; preserve existing active records until reconciled.

## How long a file lives

- Created at stage `04-solution-design`.
- Authorized documentation-only updates are checked, committed directly to
  main, and pushed promptly. They do not wait for the implementation pull request.
- **Deleted at stage `14-spec-update`**, once the PRD has been brought up to
  date.

Deleting it loses nothing. Git history keeps the file forever.

The reason to delete it: a design that outlives its build stops matching the
code. A later agent reads it, believes it, and builds against a plan that
changed during the build. After the build, `knowledge/prds/` is what is true.

So this folder only ever holds designs for work happening right now. An empty
folder is the normal state, not a gap.

Nothing checks that the file was deleted. There is no test and no hook. Whoever
finishes the work item has to do it.

## What this folder is not

- **Not requirements.** One work item's requirements live in the work tracker.
  A whole feature area's live in `knowledge/prds/`.
- **Not settled behavior.** That is `knowledge/prds/` too. Requirements and
  settled behavior are the same document at two points in time, told apart by
  its `status` line.

## Designs in progress

- [404-external-memory-provider.md](404-external-memory-provider.md): the
  `external` memory mode, where mem0 or Hindsight replaces the file storage of
  working and lasting memory. Approved and in build.

- [391-output-style.md](391-output-style.md): the focused Plain English style
  revision, silent style delivery, and bounded Claude behavior checks.

- [388-agents-md-instruction-file.md](388-agents-md-instruction-file.md): the
  move from `CLAUDE.md` to `AGENTS.md` as the instruction file for issue #388,
  with the one-line `CLAUDE.md` import beside every `AGENTS.md`.

- [269-knowledge-system.md](269-knowledge-system.md): the single living master
  for issue #269, updated throughout owner review. Solution designs stay here,
  outside `knowledge/`; the linked PRD owns requirements.
- `docs/designs/269-knowledge-system/`: the working records behind that design,
  research and completed reviews kept as history. Its `269-knowledge-system/README.md` says what each file is
  and who wrote it, `process.md` says how the design was made and where it
  stands, and `prep.md` is the design prep file.

- [360-instruction-audit-fixes.md](360-instruction-audit-fixes.md): scoped fixes to
  conflicting instructions, with preserved approval boundaries and scenario checks.

- [396-protocol-enforcement.md](396-protocol-enforcement.md): the design for
  issue #396: the startup cut first, then function hooks with fact checks only.
  Waiting for Mike's open decisions.

- [306-toolkit-manual-review.md](306-toolkit-manual-review.md): Toolkit manual
  content and delivery review, including actual host evidence, remaining
  acceptance cases, and the distinction between closed #306 and delivered behavior.

# Where work items are tracked (Gate 1)

Ask this as its own question. Do not fold it into the folder-layout question.
Where work is tracked is a decision in its own right, and burying it inside a
scaffolding question is how projects end up with a board and no rules for using
it.

## The question

> Where do you track work items for this project?
>
> 1. A GitHub Projects board
> 2. Linear
> 3. Jira
> 4. Local folders on this computer
> 5. The BMAD method
> 6. Somewhere else, or nothing yet

Offer these in plain words. Recommend a GitHub Projects board when the
repository already has a GitHub remote and the owner has no tracker in use;
recommend whatever they already use when they name one.

Answers 2 and 3 stand for any external tracker the toolkit has no setup for.
Notion, Asana, Trello, and a shared spreadsheet are all handled the same way as
Linear and Jira. Name whichever one the owner actually said.

## What each answer does

**This question exists so the project's root instructions can name one
tracker.** Every session then knows where to look for the work without asking.
What changes per answer is only which tracker gets named, and how a ticket is
marked ready.

The toolkit ships no rule saying what a ticket must contain. It used to, and
that rule was removed on 2026-08-31. Do not write a replacement into the project
during setup.

### 1. A GitHub Projects board

The toolkit has a setup for this one. It is the only answer where the toolkit
creates a shared external tracker. Walk the steps in "Setting up a GitHub
Projects board" below.

The refinement session is marked with the `Refining` status and the
`refined` label.

### 2 and 3. Linear, Jira, or another external tracker

Create nothing and change nothing inside that tracker. The toolkit has no setup
for it and does not build one. Confirm with the owner what the tracker is called,
which project or board inside it holds this work, and how they want a refined
ticket marked (a status they already have, a label, or a line in the ticket).

Then write the structural pointer into the root instructions and copy the rule in
Gate 5. That is the whole of what the toolkit does here.

### 4. Local folders on this computer

Install the `work-tracker` plugin and run `work init`, exactly as
`work-items-structure.md` describes. It creates a flat `.work-items/` folder
that Git ignores. Say plainly that these records stay in this checkout and do
not sync to another computer.

The refinement session is marked in `REQUIREMENTS.md`: it stays `refining`
until the owner approves all six parts, then becomes `finalized` and the item
moves to `Ready`. The file contains only owner-stated or owner-approved needs,
with no technical plan or unapproved assumptions.

Local-folder mode has no GitHub mirror. If the owner wants shared GitHub
tracking, choose answer 1 instead.

### 5. The BMAD method

BMAD holds the work itself, so it is an answer to this question and never an
extra layered on top of another answer. Never set it up alongside the
`work-tracker` plugin or alongside a board built by hand from the steps below.
One project, one tracker.

What it is, checked on 2026-08-18: version 6, MIT licensed, installed per
project with `npx bmad-method install`, and needing Node 20.12 or newer. There
is no machine-wide install. It writes `_bmad/` for the framework and
`_bmad-output/` for the work. Its own documentation is at
`https://docs.bmad-method.org`.

What the toolkit does for this answer:

1. Offer to run `npx bmad-method install` yourself. It writes a lot of files, so
   say what it is about to do and wait for a yes. Never run it without one.
2. Name `_bmad-output/` as the tracker in the Gate 5 pointer.

The toolkit installs BMAD and nothing more. It does not wrap BMAD's workflows,
copy BMAD files into the repository, or keep its own record of BMAD's work.

**The refinement session is BMAD's own planning.** `bmad-prd` writes the
requirements document, `bmad-create-epics-and-stories` breaks it into epics and
stories, and `bmad-sprint-planning` is BMAD's readiness gate before building,
returning `PASS`, `CONCERNS`, or `FAIL`. Those documents are the spec, and a
story counts as refined once sprint planning passes it. Do not also write a
six-part `SPEC.md` beside them. Two specs for one story is exactly the second
home this project's rules forbid.

**Say this once when the owner picks BMAD.** BMAD lets work skip planning
entirely: its own workflow map says "Clear work can enter `bmad-build`
directly." Doing that skips the refinement session, which is the guarantee this
whole question exists to hold. Name it once, then it is the owner's call.

### 6. Somewhere else, or nothing yet

Write nothing about tracking. Do not copy the rule, do not add a structural
pointer, do not create anything.

Record the answer in the project's root instructions as one line, so that
`project-sync` can tell "the owner said no" apart from "nobody ever asked" and
stops raising it every run.

## Setting up a GitHub Projects board

Only for answer 1, and only for a board that holds the work itself with no
work-items folder. Walk these steps in order and stop at the first thing that
does not check out.

1. **Confirm the repository has a GitHub remote.** If it does not, create
   nothing. Tell the owner the repository has no remote yet, offer to write the
   rules anyway so the discipline is in place, and tell them to come back to this
   step once a remote exists.
2. **Confirm the `gh` command line tool is signed in with project access.** If it
   is not, do not retry in a loop. Show the owner the exact command to run,
   `gh auth refresh -s project`, then stop and wait. Pick up here when they say
   they have run it.
3. **Ask who owns the board** when the repository belongs to an organization
   rather than a personal account. Do not assume the personal account.
4. **Check whether a board with that name already exists.** If one does, do not
   create a second. Show what is there and ask the owner: use that one, or pick a
   different name.
5. **Show the owner exactly what you are about to create and wait for a yes.**
   Name the board, list the statuses, and name the label. Nothing gets created on
   GitHub before that yes: no board, no statuses, no labels, no issues.
6. **Create the board and link it to the repository.**
7. **Set the statuses** to: `Backlog`, `Refining`, `Ready`, `In progress`,
   `In review`, `Done`, `Cancelled`. Type them exactly as written, lower-case
   second words included. This board holds the work itself. Do not pair it with
   the local `work-tracker` plugin.
8. **Add the `refined` label** to the repository, described as the mark that a
   refinement session finished and the six-part spec is written. Name the label
   for what it means, never after whichever skill happened to run the session.
9. **Report what you made**, including the board's link.

### When the board already exists but is incomplete

List exactly which statuses or which label are missing, and ask before adding
each missing piece. Never rename or delete a status the owner already has, even
when its name differs from the list above. Their board, their names.

### How the statuses are used

- `Backlog`: logged, not yet refined.
- `Refining`: a refinement session is under way. Move the ticket here when the
  session starts.
- `Ready`: the six-part spec is written and agreed. Move it here when the session
  ends, and add the `refined` label. Work may start now, and not before.
- `In progress`: being built.
- `In review`: built, waiting on review or a merge.
- `Done`: landed.
- `Cancelled`: decided against. Close the issue as not planned and say why in the
  ticket, rather than deleting it, so the reason survives.

## What goes into the root instructions

For answers 1 through 5, Gate 5 adds one structural pointer to `CLAUDE.md` and
the same one to `AGENTS.md`, naming the tracker and how a refined ticket is
marked. One or two lines, no more. For example:

> **Work tracking.** Work items live on the `<board name>` GitHub Projects board
> connected to this repository. A ticket moves to `Refining` when its refinement
> session starts, and to `Ready` with the `refined` label once its requirements
> are agreed.

The pointer names the tracker and how a ticket is marked ready, and stops there.
Keeping detail out of the root files is the same thin-root-instructions
convention every other pointer follows, described in `thin-claudemd.md`.

## If the owner changes tracker later

`project-sync` re-asks and rewrites the pointer and the rule. It never deletes
tickets, issues, or boards from the tracker they are leaving. Moving the existing
work across is the owner's call and is done by hand.

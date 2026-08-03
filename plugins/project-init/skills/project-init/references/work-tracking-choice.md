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
> 4. Files in this repository
> 5. Somewhere else, or nothing yet

Offer these in plain words. Recommend a GitHub Projects board when the
repository already has a GitHub remote and the owner has no tracker in use;
recommend whatever they already use when they name one.

Answers 2 and 3 stand for any external tracker the toolkit has no setup for.
Notion, Asana, Trello, and a shared spreadsheet are all handled the same way as
Linear and Jira. Name whichever one the owner actually said.

## What each answer does

**Two things are true for answers 1 through 4**, and they are the reason this
question exists:

- every piece of work is logged in that tracker before it is built; and
- nothing is built until a refinement session has filled in the six-part spec.

Those two live in the `general-rules/spec-before-you-build.md` rule, which is
their one canonical home. Gate 5 copies it into `.claude/rules/`. Do not restate
its contents anywhere else. What changes per answer is only which tracker gets
named and how the refinement session is marked.

### 1. A GitHub Projects board

The toolkit has a setup for this one. It is the only answer where the toolkit
creates the tracker as well as writing the rules. Walk the steps in "Setting up a
GitHub Projects board" below.

The refinement session is marked with the `Refining` status and the
`grill-me-completed` label.

### 2 and 3. Linear, Jira, or another external tracker

Create nothing and change nothing inside that tracker. The toolkit has no setup
for it and does not build one. Confirm with the owner what the tracker is called,
which project or board inside it holds this work, and how they want a refined
ticket marked (a status they already have, a label, or a line in the ticket).

Then write the structural pointer into the root instructions and copy the rule in
Gate 5. That is the whole of what the toolkit does here.

### 4. Files in this repository

Install the `work-tracker` plugin and run `work init`, exactly as
`work-items-structure.md` describes. Nothing about that plugin changes.

The refinement session is marked by the item's status: an item stays in `Backlog`
until its `SPEC.md` answers the six parts, then it moves to `Ready`. Do not run
`work start` on an item that is not `Ready`; say which of the six parts are
missing instead.

The owner may want a GitHub board mirroring these files as well. That is the
plugin's own `work github connect` command, and it configures the board with the
plugin's six statuses (`Backlog`, `Ready`, `In Progress`, `In Review`, `Done`,
`Cancelled`). Those are deliberately not the same as the statuses in the setup
below, because that board reflects the files rather than holding the work. Use
the plugin's command for this, never the by-hand steps below.

### 5. Somewhere else, or nothing yet

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
   `In review`, `Done`, `Cancelled`.
8. **Add the `grill-me-completed` label** to the repository, described as the
   mark that a refinement session finished and the spec is written.
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
  ends, and add the `grill-me-completed` label. Work may start now, and not
  before.
- `In progress`: being built.
- `In review`: built, waiting on review or a merge.
- `Done`: landed.
- `Cancelled`: decided against. Close the issue as not planned and say why in the
  ticket, rather than deleting it, so the reason survives.

## What goes into the root instructions

For answers 1 through 4, Gate 5 adds one structural pointer to `CLAUDE.md` and
the same one to `AGENTS.md`, naming the tracker and how a refined ticket is
marked. One or two lines, no more. For example:

> **Work tracking.** Work items live on the `<board name>` GitHub Projects board
> connected to this repository. A ticket moves to `Refining` when its refinement
> session starts, and to `Ready` with the `grill-me-completed` label when the
> six-part spec is agreed. See `.claude/rules/spec-before-you-build.md`.

The rules themselves stay in `.claude/rules/spec-before-you-build.md`. The
pointer names the tracker; the rule says what to do. Keeping the rules out of the
root files is the same thin-root-instructions convention every other rule
follows, described in `thin-claudemd.md`.

## If the owner changes tracker later

`project-sync` re-asks and rewrites the pointer and the rule. It never deletes
tickets, issues, or boards from the tracker they are leaving. Moving the existing
work across is the owner's call and is done by hand.

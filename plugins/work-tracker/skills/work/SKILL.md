---
name: work
description: Manage a repository's local work items in the Git-ignored .work-items folder, including the folders the owner makes to group related items. Use for requests such as "add this to the backlog", "what should I work on next?", "start WI-014", "update the handoff", "what is blocking this?", "is this in main?", "mark this finished", "archive this item", "what have I archived?", "group these items together", "put this under the security work", or "convert the old work-items folders". Also use at the start or end of substantial repository work when a local work item should be read or updated.
---

# Work Tracker

Use the dependency-free Node.js command at `scripts/work.mjs`, resolved relative
to this `SKILL.md`. Run it from any directory inside the target Git repository.
Use `--json` when structured output will help.

The local files under `.work-items/` are authoritative for this tracker. Git
ignores the whole folder. They stay in the current checkout and do not sync to
GitHub or another computer. If the owner wants shared GitHub tracking, that is a
separate tracker choice, not a mirror of this one.

## Orient before changing work

1. Run `node <skill-root>/scripts/work.mjs status --json`.
2. If the tracker is not initialized, run `init` only after the owner has chosen
   local folders. If an older tracker is found, read
   `references/record-format.md` and preview `migrate` before applying it.
3. Read the selected item's `REQUIREMENTS.md`, `STATUS.md`, and `ITEM.yaml`
   before implementing it.
4. Use tracker commands instead of moving folders or directly changing
   `ITEM.yaml`. Where a folder sits is the exception: it is how the owner
   groups and archives, and both are read fresh on every command. See below.

## Protect the owner's requirements

Every new item starts in `Backlog`. Its `REQUIREMENTS.md` starts as `refining`.

- Pass the owner's starting request through `--description`. Do not replace it
  with an invented goal.
- Interview the owner one question at a time until the six parts in the project
  spec rule are answered.
- Write only what the owner said or approved. A suggestion stays out of the
  file until the owner says yes to it.
- Keep build steps, file choices, tools, versions, and technical design out of
  `REQUIREMENTS.md`.
- Show the completed requirements to the owner. Only after their clear approval
  run `requirements WI-001 --finalize --approved-by NAME`.
- If the direction changes, run `requirements WI-001 --reopen` before editing
  the requirements. This returns the item to `Backlog`.

The command refuses to finalize a file with missing sections. `start` refuses
an item whose requirements are not finalized.

## Route natural requests

| Request | Command |
|---|---|
| Set up local tracking | `init` |
| Preview or apply old-folder conversion | `migrate` |
| Add this to the backlog | `add` |
| Check, finalize, or reopen requirements | `requirements` |
| What is active or blocked? | `status` |
| What should I work on next? | `next` |
| Start this item | `start` |
| Change status, next step, branch, or blockers | `update` |
| Relate or unrelate tickets | `link` |
| Is this work in the default branch? | `landed` |
| Add this under an area of work | `add --group NAME` |
| Get an item out of the way, or bring it back | `archive`, `unarchive` |
| Record branch completion or verified landing | `finish` |
| Compare local tickets with Git | `reconcile` |
| Check local tracker integrity | `validate` |
| Rebuild the dashboard | `dashboard` |

Run `node <skill-root>/scripts/work.mjs help` for exact flags. Read
`references/command-reference.md` for less common commands and
`references/record-format.md` for the file schema or conversion rules.

## Apply status rules

Use exactly these work-item statuses:

- `Backlog`: captured or still being refined.
- `Ready`: requirements finalized and work can start.
- `In Progress`: actively being implemented.
- `In Review`: branch work appears complete but still needs review or landing.
- `Done`: Git proves the completion commit is in the default branch.
- `Cancelled`: intentionally stopped or declined.

Never set `Done` through `update`. Use `finish`; it verifies Git ancestry. If
the commit is not in the default branch, the item remains `In Review`.

Use `bug`, `enhancement`, or `task` as the type. Use `urgent`, `high`, `medium`,
or `low` as priority.

## Respect the owner's folders

Where a work-item folder sits is the owner's own organizing, and it is the only
record of it. Nothing about it is stored in the item's files, so the owner drags
folders in a file manager and the next command already agrees.

Any folder may hold work items, and the walk looks inside all of them. There are
two kinds and they behave identically:

- **A plain folder the owner made**, such as `security-and-permissions/`. It
  carries no status, no requirements, and nothing to finish. It is a name on
  disk and the tracker records nothing about it.
- **A work item that holds other work items.** The owner works a large area as
  one item, so it keeps its own status, requirements, and next step, holds that
  area's shared documents, and the pieces sit inside it. Both the parent and the
  items inside it are listed normally.

Nesting may go as deep as the owner takes it. Notes, documents, and anything
else in any of those folders are left alone.

- Pass `add --group security-and-permissions` to create an item in a folder,
  naming a work-item folder when the item belongs under one. The folder is
  created if it does not exist yet.
- Never move an item between folders, or invent a grouping, on your own
  initiative. Ask the owner.
- `status` names the folder each item is in. Nothing about status, requirements,
  priority, or the six-part gate changes with grouping.
- Folder position and the `parent` relationship are separate. Nesting an item
  inside another does not write a `parent` link, and linking does not move a
  folder. The owner may use either, or both.

Remind the owner once, when they first keep a document in a group folder, that
Git ignores `.work-items/`, so nothing in there is backed up or shared. Notes
are fine there. A document that others need, such as a solution architecture,
belongs in the repository instead.

## Respect the archive folder

Items inside `.work-items/archive/` are archived, at any depth. Sitting in that
folder is the only record of it, so the owner archives things by dragging
folders in a file manager and no command is needed. Dragging a folder in
archives everything inside it, and `archive` on a work item that holds other
work items takes those along too. Say how many items are moving before running
it. Use `archive` and `unarchive` to move the same folders yourself; both keep
the item where it sat, so it comes back to the same place.

Archiving is organizing, not a status change. Any item may be archived at any
status, and archiving never edits the item's files. `status`, `next`, and the
dashboard skip archived items. Use `status --archived` when the owner asks what
they have archived, or to find one. Their ID numbers are never reused, links to
them keep working, and validation still covers them.

Never archive an item on your own initiative. Never treat archiving as a way to
close, cancel, or finish work.

## Preserve the handoff

Keep `next_step` exact and executable. Record why an item is blocked, not just
that it is blocked. Use `update --note` for a dated handoff entry.

Tracker commands preserve the user-notes section of `STATUS.md`. The full dated
history lives in `HISTORY.ndjson`; `STATUS.md` shows the latest entries.

Use `depends_on`, `blocks`, `related_to`, `parent`, or `supersedes` for
relationships. The tool writes the inverse and rejects dependency cycles. These
link one item to another and have nothing to do with which folder an item sits
in. Grouping is folders; relationships are fields. Use `depends_on` when items
in one group have to happen in a set order.

## Close substantial work

1. Update the exact next step or run `finish`.
2. Run `validate`.
3. Run `reconcile`.

Do not claim success when validation or Git ancestry was unavailable. Report
the limit and the supported next command.

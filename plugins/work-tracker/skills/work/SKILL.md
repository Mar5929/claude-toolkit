---
name: work
description: Manage a repository's local work items in the flat, Git-ignored .work-items folder. Use for requests such as "add this to the backlog", "what should I work on next?", "start WI-014", "update the handoff", "what is blocking this?", "is this in main?", "mark this finished", "archive this item", "what have I archived?", or "convert the old work-items folders". Also use at the start or end of substantial repository work when a local work item should be read or updated.
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
   `ITEM.yaml`. The archive folder is the one exception: see below.

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

## Respect the archive folder

Items inside `.work-items/archive/` are archived. Sitting in that folder is the
only record of it, so the owner archives things by dragging folders in a file
manager and no command is needed. Use `archive` and `unarchive` to move the same
folders yourself.

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
relationships. The tool writes the inverse and rejects dependency cycles.

## Close substantial work

1. Update the exact next step or run `finish`.
2. Run `validate`.
3. Run `reconcile`.

Do not claim success when validation or Git ancestry was unavailable. Report
the limit and the supported next command.

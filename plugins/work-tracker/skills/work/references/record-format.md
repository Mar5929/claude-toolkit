# Canonical local work-item format

## Folder layout

```text
.gitignore                         # contains /.work-items/
.work-items/                       # ignored by Git
  .work-tracker.yaml
  README.md
  DASHBOARD.md                     # generated and rebuildable
  WI-014-example/
    ITEM.yaml
    REQUIREMENTS.md
    STATUS.md
    HISTORY.ndjson
    other-owner-notes.md
  security-and-permissions/        # a group folder the owner made
    ARCHITECTURE.md                # their own material, left alone
    WI-015-org-wide-defaults/
    record-access/                 # groups may hold groups
      WI-016-sharing-rules/
  archive/                         # items the owner set aside
    WI-003-older-example/
```

Status changes only in `ITEM.yaml`; status never moves a folder. There are no
status folders.

## Group folders

Any folder under `.work-items/` that is not a work item is a group the owner
made. The scan looks inside it, so work items in there are found and behave
exactly like items at the top level. Everything else in a group folder is left
alone and never read as tracker input. An empty group, and one holding only
documents, are both fine and neither is an error.

A folder is a work item when **both** are true:

1. its name matches `<PREFIX>-<number>`, optionally followed by `-<slug>`; and
2. it holds at least one of `ITEM.yaml`, `ITEM.json`, `REQUIREMENTS.md`,
   `SPEC.md`, `STATUS.md`, or `HISTORY.ndjson`.

The second test is what lets the owner name a group `phase-1` or `epic-2`
without it being taken for a work item and hiding everything inside it. A work
item whose `ITEM.yaml` was deleted still passes it, so `validate` reports the
damage instead of the item quietly disappearing.

A work-item folder is never searched for more work items, so one placed inside
another is invisible to every command. `validate` reports it by name.

Nesting deeper than ten folders is not walked. That is a stop for a runaway
walk, not a limit on how the owner may group work.

Each item carries the folder path it sits in, relative to `.work-items/`, as
`group` in `--json` output and in `work status`. An item at the top level has no
group. An archived item's group keeps its `archive/` prefix, so the reported
location is always the real one.

## The archive folder

`.work-items/archive/` holds items the owner no longer wants to see. Sitting in
that folder, at any depth, is the only record that an item is archived. Nothing
is written into the item's own files, so the owner can drag folders in and out in
a file manager and the next command already agrees with what they did. Dragging a
whole group in archives everything inside it. `work archive` and `work unarchive`
move the same folders for an agent, keeping the item in its group so it returns
where it came from; a group folder deleted meanwhile is recreated.

Archiving is organizing, not a status change. Any item may be archived at any
status, and archiving changes nothing inside it.

- Hidden from `work status`, `work next`, and `DASHBOARD.md`.
- Listed by `work status --archived`, and included in `work status --all`.
- Still validated, still reachable by ID, and still linked in both directions.
- Their ID numbers are never handed out again.

Folders the owner nests inside `archive/` to group items are searched too.
Anything in there that is not a work-item folder is ignored.

Linked Git worktrees in one clone resolve to the primary checkout's
`.work-items/` folder. Commands return its full path when called from a linked
worktree. They share records, locks, and ID allocation. Another clone or
computer has a different local tracker.

## `ITEM.yaml`

`ITEM.yaml` is command-managed. Its top-level fields are:

- `schema_version`: current record shape, now `2`;
- `id`, `title`, and `description`;
- `type`: `bug`, `enhancement`, or `task`;
- `priority`: `urgent`, `high`, `medium`, or `low`;
- `status`: `Backlog`, `Ready`, `In Progress`, `In Review`, `Done`, or
  `Cancelled`;
- `created_date` and `updated_date`, both `YYYY-MM-DD`;
- `next_step`;
- `blockers` and `relationships`; and
- `git`, which holds branch, pull-request, completion, and landing proof.

Nested lists and objects use YAML flow form, such as `blockers: []` and
`git: {"branch":null}`. This remains valid YAML while letting the plugin stay
dependency-free. Use commands instead of hand-editing it.

## `REQUIREMENTS.md`

The YAML fields at the top are:

```yaml
status: "refining"
created_date: "2026-08-23"
updated_date: "2026-08-23"
finalized_date: null
approved_by: null
```

The body records the owner's starting request and the six agreed parts:

- goal;
- why;
- what has to be true for the item to count as finished;
- what the person using it experiences;
- how it behaves from the outside; and
- edge cases.

`refining` means the interview is still open. `finalized` means the owner saw
and approved the complete file. Finalized records require `finalized_date` and
`approved_by`.

This file contains no implementation plan, file path choices, tool or version
choices, or unapproved agent assumptions. When direction changes, reopen it
before editing.

## Other item files

- `STATUS.md`: readable current handoff, recent history, and preserved owner
  notes.
- `HISTORY.ndjson`: complete dated command history, one JSON object per line.
- Other files: preserved and never treated as executable input.

`DASHBOARD.md` is generated. Deleting it cannot delete a work item.

## Git landing proof

`git.completion_commit` means work appears complete at that commit.
`git.landed_commit`, `git.landed_date`, and `git.default_branch` mean Git
ancestry was verified. A `Done` item without that proof fails validation.

The tracker records are ignored by Git. Git is used only to prove whether the
implementation landed.

## Conversion from the older tracker

Older trackers may exist at `work-items/`, `delivery/work-items/`, or
`engagement/work-items/` with four status folders, `ITEM.json`, and `SPEC.md`.

`work migrate` is a read-only preview. `work migrate --apply`:

- copies every item into a flat `.work-items/` folder;
- converts known structured data into `ITEM.yaml`;
- creates a refining `REQUIREMENTS.md` when a valid one is not present;
- preserves `SPEC.md`, `ITEM.json`, `STATUS.md`, history, and unknown files;
- leaves the old tracker unchanged for review;
- reports old GitHub mirror settings but does not carry them over; and
- stops before writing when IDs or target folders conflict.

After the owner verifies the copy, removing the old tracked folder is a
separate, explicit cleanup. Git history remains the backup.

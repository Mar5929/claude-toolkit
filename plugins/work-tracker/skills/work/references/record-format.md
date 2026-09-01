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
  security-and-permissions/        # a plain folder the owner made
    ARCHITECTURE.md                # their own material, left alone
    WI-015-org-wide-defaults/
  WI-017-billing-rework/           # a work item holding work items
    ITEM.yaml                      # its own status and requirements
    diagrams/                      # the area's shared documents
    WI-018-invoice-model/
    WI-019-payment-terms/
  archive/                         # items the owner set aside
    WI-003-older-example/
```

Status changes only in `ITEM.yaml`; status never moves a folder. There are no
status folders.

## Grouping folders

The scan walks every folder under `.work-items/`, work items included, and
collects every work item it finds at any depth. Two kinds of folder can hold
work items, and the scan treats them the same:

- **A plain folder the owner made**, such as `security-and-permissions/`. It has
  no record of its own; nothing about it is stored anywhere.
- **A work item holding other work items**, such as
  `WI-014-security-and-permissions/`. The parent is a normal work item with its
  own `ITEM.yaml`, status, and requirements, and it is listed alongside the items
  inside it. There is no epic or parent type; a parent is a work item that
  happens to have work items in it.

Everything else in those folders is left alone and never read as tracker input.
An empty folder, and one holding only documents, are both fine and neither is an
error.

A folder is a work item when **both** are true:

1. its name matches `<PREFIX>-<number>`, optionally followed by `-<slug>`; and
2. it holds at least one of `ITEM.yaml`, `ITEM.json`, `REQUIREMENTS.md`,
   `SPEC.md`, `STATUS.md`, or `HISTORY.ndjson`.

The second test is what lets the owner name a folder `phase-1` or `epic-2`
without it being taken for a work item and hiding everything inside it. A work
item whose `ITEM.yaml` was deleted still passes it, so `validate` reports the
damage instead of the item quietly disappearing.

Nesting deeper than ten folders is not walked. That is a stop for a runaway
walk, not a limit on how the owner may group work.

Each item carries the folder path it sits in, relative to `.work-items/`, as
`group` in `--json` output and in `work status`. An item at the top level has no
group; one inside a work item has that work item's folder name. An archived
item's group keeps its `archive/` prefix, so the reported location is always the
real one.

Folder position and the `parent` and `children` relationship fields are separate
and neither drives the other. Nesting an item inside another writes no link, and
linking two items moves no folder.

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
- `stage`: the item's current stage from the fourteen in `work-item-stages.md`,
  or `null`. Items created before stages existed have no `stage` key at all,
  which is the same thing as `null` and is never an error;
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

The body records the owner's starting request and whatever was agreed. A new
item starts with that request and an unanswered goal, and how much it grows
depends on the work: a chore keeps the one line the owner asked for, and work
that needs refining grows the parts `work-item-stages.md` lists.

`refining` means the interview is still open. `finalized` means the owner saw
and approved the file. Nothing checks its length or its headings. Finalized
records require `finalized_date` and `approved_by`.

This file contains no implementation plan, file path choices, tool or version
choices, or unapproved agent assumptions. When direction changes, reopen it
before editing.

## The stage and the progress log

`work update <id> --stage <stage> --note <what happened>` writes three things in
one call: the `stage` field in `ITEM.yaml`, the status the stage maps to, and a
dated line in the "Progress log" section of `STATUS.md`. The log line reads

```text
2026-08-29 | 04 solution-design | Chose a rule file so there is one copy of the stage list.
```

`--stage` takes a number (`8`, `08`), a name (`build`), or the whole thing
(`08-build`). Anything it does not recognize is stored exactly as typed.

The mapping is `01` and `02` to `Backlog`, `03` to `Ready`, `04` through `11` to
`In Progress`, `12` and `13` to `In Review`, and `14` to `Done`. `Done` is the
one status this never writes: `finish` owns it, because it is the command that
proves the commit is in the default branch. `Cancelled` stays hand-set.

The command checks nothing else. It does not test that a stage is real, refuse a
move backwards, ask why a stage was skipped, or look for a changed
specification. `work-item-stages.md` decides all of that, and agents follow it
the way they follow any other rule. The one thing that does still apply is the
tracker's existing requirements gate: a stage whose status is `Ready`,
`In Progress`, or `In Review` needs finalized requirements, exactly as an
explicit `--status` does, so the stage cannot write a record `validate` would
then call invalid.

## Other item files

- `STATUS.md`: readable current handoff, the progress log, recent history, and
  preserved owner notes. The progress log and the user notes both sit between
  HTML comment markers and are carried across every rewrite.
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

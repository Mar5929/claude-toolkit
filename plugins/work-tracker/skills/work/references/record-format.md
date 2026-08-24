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
```

Every work-item folder is directly under `.work-items/`. Status changes only in
`ITEM.yaml`; the folder never moves. There are no status folders.

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

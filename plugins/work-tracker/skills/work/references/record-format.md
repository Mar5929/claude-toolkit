# Canonical local work-item format

## Folder layout

```text
.gitignore                         # contains /.work-items/
.work-items/                       # ignored by Git
  .work-tracker.yaml
  ACTIVE.json                       # active item by branch
  EVENTS.ndjson                    # approved completion outbox
  README.md
  DASHBOARD.md                     # generated and rebuildable
  WI-014-example/
    WORK-ITEM.md
    DESIGN.md                      # optional, or link a separate shared design
    other-owner-notes.md
  security-and-permissions/        # a plain folder the owner made
    ARCHITECTURE.md                # their own material, left alone
    WI-015-org-wide-defaults/
  WI-017-billing-rework/           # a work item holding work items
    WORK-ITEM.md                   # its own status and requirements
    diagrams/                      # the area's shared documents
    WI-018-invoice-model/
    WI-019-payment-terms/
  archive/                         # items the owner set aside
    WI-003-older-example/
```

Status changes in Overview (legacy: `ITEM.yaml`); status never moves a folder. There are no
status folders.

## Grouping folders

The scan walks every folder under `.work-items/`, work items included, and
collects every work item it finds at any depth. Two kinds of folder can hold
work items, and the scan treats them the same:

- **A plain folder the owner made**, such as `security-and-permissions/`. It has
  no record of its own; nothing about it is stored anywhere.
- **A work item holding other work items**, such as
  `WI-014-security-and-permissions/`. The parent is a normal work item with its
  own record, status, and requirements, and it is listed alongside the items
  inside it. There is no epic or parent type; a parent is a work item that
  happens to have work items in it.

Everything else in those folders is left alone and never read as tracker input.
An empty folder, and one holding only documents, are both fine and neither is an
error.

A folder is a work item when **both** are true:

1. its name matches `<PREFIX>-<number>`, optionally followed by `-<slug>`; and
2. it holds at least one of `WORK-ITEM.md`, `ITEM.yaml`, `ITEM.json`, `REQUIREMENTS.md`,
   `SPEC.md`, `TASKS.yaml`, `STATUS.md`, or `HISTORY.ndjson`.

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

## One work-item template

New items use one record with these five sections, in this order:

| Section | Content |
| --- | --- |
| Overview | Purpose, current state, next action, blockers, links, approvals, delivery choice, open questions, and context |
| Roadmap | Ordered phases with outcomes, acceptance conditions, and linked child items |
| Tasks | Stable task IDs, phase, objective, instructions, constraints, sources, deliverable, acceptance, status, dependencies, current position, next action, and any task approval |
| Recent History | Complete dated material decisions and progress, optionally collapsed; current meaning also updates its owning section |
| Requirements | Item-specific needs and approval scope, or a link to an existing shared authority |

Design stays separate and linked. Shared PRDs retain their own content and Notes.
For new external items, use these same sections in the issue description. Keep
native status, assignment, relationships, and approval fields authoritative;
reference them instead of duplicating editable values in the description. The
local marker and field encoding below do not apply to external trackers. Adapt
the Markdown formatting to the service, reread before writing, preserve other
content, use revision checks when available, and verify the description and
native fields afterward. On a partial write, keep the exact repair pending;
when revisions are unavailable, do not claim atomic conflict protection.
Existing external items and their progress comments retain their format.

## New local `WORK-ITEM.md`

`work add` creates this record only. Existing multi-file items remain supported
without conversion. A folder containing both this document and legacy canonical
files fails with `mixed_item_formats`; commands never guess which copy wins.
Root configuration, active selections, completion outbox, and generated dashboard
remain separate operational files, not duplicate item records.

The first line is `<!-- work-item-format: 1 -->`, followed by one bold title
`**WI-014: Example**`. Exactly five H1 headings follow: `# Overview`, `# Roadmap`,
`# Tasks`, `# Recent History`, `# Requirements`. Use H2 or deeper headings inside
requirements. Fenced code and HTML comments do not introduce record headings.

Commands read visible `- Label: value` lines, not hidden YAML or a second full
JSON payload. Fields use the same meanings and validation as the legacy schemas
below. The label dictionary is deterministic: capitalize the first letter and
replace underscores with spaces, with these three aliases:

| Field | Visible label |
| --- | --- |
| `description` | Purpose |
| `next_step` or task `next_action` | Next action |
| task `roadmap_stage` | Roadmap phase |

ID and title occur only in the page or entry heading. Overview holds record
fields such as Schema version, Type, Priority, Status, Stage, Dates, Blockers,
Relationships, Git, and Completion. `## Requirements approval` holds the
requirements metadata. `## Open questions` and `## Context and notes` hold
free prose and the delivery choice. Dates use their field-specific labels,
for example Created date and Updated date.

Roadmap begins with its schema version and update date, followed by
`## STAGE-001: Title` blocks. Tasks uses `## TASK-001: Title` blocks. Each
contains its own labeled fields. Recent History uses unique `## ENTRY-1: Action`
blocks with At, Action, Note, and any additional event fields. Old history is
never truncated; a surrounding details block may collapse it.

Text values are plain strings; ambiguous text is JSON-quoted. Booleans,
numbers, and null retain their types. Arrays and nested objects use one inline
JSON value for that field (for example Relationships), preserving all extension
fields without a hidden second record. Multiline text uses `Label: |` followed
by lines indented four spaces, so embedded code fences cannot become document
structure. Duplicate labels, IDs, missing or reordered required sections, and
invalid structured state fail before saving.

Commands patch only changed fields and append history, preserving owner prose,
unknown fields, code examples, newlines, and requirements content. Use the
[guarded edit and recovery commands](command-reference.md#document-saves-and-recovery)
for free prose and interrupted saves. The SHA-256 snapshot check detects stale
command inputs; arbitrary editors are not locked by the tracker.

## Existing multi-file records

The following per-item files are the legacy format. Commands continue to read
and update them in place. They are not created for new items and are not migrated
by this release. Their field definitions also describe the equivalent visible
fields in `WORK-ITEM.md`.

## `ITEM.yaml`

`ITEM.yaml` is command-managed. Its top-level fields are:

- `schema_version`: current record shape, now `2`;
- `id`, `title`, and `description`;
- `type`: a non-empty lower-case kebab-case value. Common suggestions are
  `discovery`, `solution-design`, `build`, `data-load`,
  `repository-maintenance`, `research`, and `task`; legacy `bug` and
  `enhancement` remain valid;
- `priority`: `urgent`, `high`, `medium`, or `low`;
- `status`: `Backlog`, `Ready`, `In Progress`, `In Review`, `Done`, or
  `Cancelled`;
- `stage`: the item's current stage from the fourteen in `lifecycle.md`,
  or `null`. Items created before stages existed have no `stage` key at all,
  which is the same thing as `null` and is never an error;
- `created_date` and `updated_date`, both `YYYY-MM-DD`;
- `next_step`;
- `blockers` and `relationships`; and
- `git`, which holds branch, pull-request, completion, and landing proof; and
- optional `completion`, which holds approval, evidence, and recording time.

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

The body records the owner's starting request and whatever was agreed. Its
length and shape follow the work: a clear chore may keep the one line the owner
asked for, while unclear work grows only through the owner's answers.

`refining` means the interview is still open. `finalized` means the owner saw
and approved the file. Nothing checks its length or its headings. Finalized
records require `finalized_date` and `approved_by`.

This file contains no implementation plan, file path choices, tool or version
choices, or unapproved agent assumptions. When direction changes, reopen it
before editing.

## `TASKS.yaml`

`TASKS.yaml` is the command-managed roadmap and execution record for one work
item. Its top-level `stages` and `tasks` arrays use YAML flow form.

A roadmap stage has a stable `STAGE-<number>` ID, an owner-shaped title,
outcome, acceptance condition, `planned` or `draft` planning status, optional `lifecycle_stage`, and zero or more
`child_work_items`. Roadmap titles are not limited to the fourteen lifecycle
stages. Every stage must be fulfilled by at least one task, one linked child
work item, or both before it is planned. An unexpanded draft stage may remain
empty and is reported as a reconciliation warning rather than filled with a
fabricated task.

For PRD or design refinement, current position and next action may point to
the document's bottom Notes. Keep its discussion and detailed remaining work
there; other tasks use the fields below as usual. This changes no record schema.

A task has a stable `TASK-<number>` ID and records:

- its `roadmap_stage`, title, objective, and instructions;
- governing constraints and linked inputs such as requirements, design files,
  accepted decisions, and project guidance;
- its deliverable and acceptance condition;
- status, dependencies, current position, and exact next action;
- whether approval is required; and
- completion evidence and supplied approval after completion.

Task statuses are `Pending`, `In Progress`, `Blocked`, `Complete`, and
`Cancelled`. Completing a task never changes the parent item's status, stage,
requirements approval, or completion approval.

A child item listed on a roadmap stage must already have the existing
bidirectional tracker relationship: the parent lists it under `children`, and
the child lists the parent under `parent`. The child owns its own requirements,
design, roadmap, tasks, status, and approval. The parent does not copy them.
Folder nesting remains organization and does not establish this relationship.

Legacy items without `TASKS.yaml` remain valid. Validation warns that roadmap
tasks need reconciliation when the item resumes. Reconcile from accepted
evidence; never infer tasks, history, or approval.

## The stage and the progress log

`work update <id> --stage <stage> --note <what happened>` writes three things in
one call: the `stage` field in `ITEM.yaml`, the status the stage maps to, and a
dated line in the "Progress log" section of `STATUS.md`. The log line reads

```text
2026-08-29 | 04 solution-design | Chose a rule file so there is one copy of the stage list.
```

`--stage` takes a number (`8`, `08`), a name (`build`), or the whole thing
(`08-build`). Anything it does not recognize is stored exactly as typed.

The mapping is `01` and `02` to `Backlog`, `03` to `Ready`, `04` through
`11` to `In Progress`, and `12` through `14` to `In Review`. Only
`finish` writes `Done`; `Cancelled` is intentional.

The command accepts an unknown stage and permits skips or backward moves.
`work-item-stages.md` decides whether those choices are correct. The command
does enforce record consistency: known stages derive active status, and
`build` or `data-load` cannot enter an active state before requirements are
finalized.

## Other item files

- `STATUS.md`: readable current handoff, the progress log, recent history, and
  preserved owner notes. It also renders roadmap stages and task continuation
  details, including linked inputs. The progress log and the user notes both
  sit between HTML comment markers and are carried across every rewrite.
  General open questions and useful work-item notes go in User notes. Edit only
  that preserved section, not generated sections. Document-specific discussion
  stays in the document's Notes. Question entries name who must answer, status,
  and what they affect; an unknown person remains explicitly unknown.
- `HISTORY.ndjson`: complete dated command history, one JSON object per line.
- Other files: preserved and never treated as executable input.

`DASHBOARD.md` is generated. Deleting it cannot delete a work item.

## Active item and completion

`ACTIVE.json` maps each branch to one active item and, when selected, its current
roadmap task. Linked worktrees use the same file in the primary tracker. Task
selection is branch-scoped so another branch can work a different task without
silently replacing it. Terminal work clears its mapping. A different named
mutation is refused until the mapping is intentionally replaced.

```json
{
  "schema_version": 1,
  "branches": {
    "issue-270-work-item-upkeep": {
      "item_id": "WI-014",
      "task_id": "TASK-002",
      "set_at": "2026-09-07T15:00:00Z"
    }
  }
}
```

A completion block records non-empty evidence, recording time, and optional
approval. `EVENTS.ndjson` receives one stable `work_completed:<ID>` event only
after the item is both Done and approved. A late approval may fill the missing
approval without an active mapping. Legacy items are not backfilled.

Each line is one JSON event. A pull-request-only example is:

```json
{
  "schema_version": 1,
  "event_id": "work_completed:WI-014",
  "occurred_at": "2026-09-07T15:30:00Z",
  "kind": "work_completed",
  "item_id": "WI-014",
  "title": "Keep the active work item accurate",
  "type": "solution-design",
  "status": "Done",
  "stage": null,
  "approval": {
    "approved_by": "Mike Rihm",
    "approved_date": "2026-09-07"
  },
  "evidence": "Mike accepted the completed design.",
  "git": {
    "completion_commit": null,
    "landed": false,
    "pull_request": {
      "number": 301,
      "url": null,
      "merged_at": null
    }
  }
}
```

`git` is `null` when neither commit nor pull-request evidence was supplied.

## Git landing proof

`git.completion_commit` means work appears complete at that commit.
`git.landed_commit`, `git.landed_date`, and `git.default_branch` mean Git
ancestry was verified. These fields are optional for non-repository work. When
supplied, their shape, existence, and ancestry are validated. Git landing does
not by itself define whether the intended outcome was accepted.

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

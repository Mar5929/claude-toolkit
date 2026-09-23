---
name: work
description: Use before substantial work, and when starting, resuming, changing stage, or closing a work item. Manages the project's local or external tracker, offers agent-led delivery, and holds the work-item lifecycle. Also for backlog capture, grouping, archiving, validation, and reconciliation.
---

# Work Tracker

[Lifecycle](references/lifecycle.md) holds the full work-item policy: orienting,
the delivery offer, planning, approval, stages, the capture table, progress,
handoff, and completion. Read the section the task needs.

Identify the project's configured tracker before acting. Use its native fields,
commands, and records; never create a second tracker or local mirror to make
this skill fit. For a configured local tracker, use the dependency-free Node.js
command at `scripts/work.mjs`, resolved relative to this file. Run it from any
directory inside the target Git repository and use `--json` when structured
output helps. Never run `init` or create `.work-items/` when the project uses an
external tracker.

When configured, local files under `.work-items/` are the local tracker's source
of truth. They are Git-ignored, shared by linked worktrees in one clone, and not
synced to GitHub or another computer. An external tracker is a separate source
of truth, never a mirror of local files.

## Orient first

Before substantial work:

1. Identify the configured tracker from project instructions and existing
   records. If it is external, read the current item through its available
   tools and native fields. Do not run the local CLI or initialize local files.
2. For a configured local tracker, run `work active`; steps 3 through 8 are
   local-tracker instructions.
3. Read the active item's `WORK-ITEM.md`. Existing legacy items retain
   `ITEM.yaml`, `REQUIREMENTS.md`, `TASKS.yaml`, `STATUS.md`, and history. `work active --json` returns the branch's selected
   current task with its full execution and continuation details.
4. If no item is active, select the clear item with `work active set ID`, or
   ask one short question when the choice is unclear.
5. If another item is active, stop. Replace it only through
   `work active set ID --replace` when the change is intentional.
6. For managed work, select the task you are continuing with
   `work task select ID TASK-ID`. Read its linked inputs and governing
   constraints before acting. If a legacy item has no roadmap tasks, reconcile
   them from accepted evidence without guessing history or approval.
7. Read and apply the goal's saved accepted, declined, or revoked delivery
   choice before offering or organizing delivery. Offer again only when the
   goal grows substantially or the owner asks.
8. Confirm the exact current requirements document or workbook and working
   design from the item and owner's instructions. Read those files. Preserve
   an existing authoritative workbook; do not pick a copy by date alone.

`work start ID` selects the item when the branch has no active mapping. Named
mutations refuse a different active item. Reads and tracker-wide checks do not
need an active item. After terminal work clears its mapping, archive or
unarchive that terminal item only while no other item is active.

When starting or resuming a substantial feature or work item, follow
[agent-led delivery](references/agent-led-delivery.md). It owns the offer,
durable choice, authority boundary, and recovery behavior. Simple questions and
quick edits do not receive the offer. After the owner accepts, that method also
asks how the team is arranged and saves the answer with the delivery choice.
[Team arrangements](references/team-arrangements.md) explains what each answer
means.

The remaining CLI and file instructions apply when the local tracker is
configured. With an external tracker, apply the same recordkeeping principles
through its native fields and project workflow without running these commands.
For new external items, put the same five sections from
[record format](references/record-format.md#one-work-item-template) in the item
description. Keep design documents separate and linked. Native status,
assignments, and relationships remain authoritative. Do not copy their values
into a competing body record or migrate existing items.

## Capture what the owner means

Pass the owner's starting request through `add --description`. Record a
lower-case kebab-case type. Suggested types are `discovery`,
`solution-design`, `build`, `data-load`, `repository-maintenance`,
`research`, and `task`; clear custom types and legacy `bug` or `enhancement`
values are valid.

Promptly use `update --note` for a material choice, requirement answer,
constraint, approval, rejection, blocker change, direction change, or discovery
that changes the plan. Keep the note short and faithful. Do not add meaning,
scope, reasons, conditions, or certainty the owner did not give. Ask one short
question when the difference matters.

The progress note is history, not a substitute for the current record. Apply
the capture table in [lifecycle](references/lifecycle.md#capture-during-the-conversation): document-specific questions, decisions,
and tasks stay in the document's Notes, and settled answers update its actual
text or cells. For other open questions and useful notes, use Overview
`Open questions` or `Context and notes` in `WORK-ITEM.md`. Read the current
document and hash, prepare a candidate, and save with `work edit` as described
in the command reference. Existing legacy items use only the preserved
`User notes` section between its markers in `STATUS.md`. Keep the question,
who must answer (or unknown), status, and what it affects current there. Other
tasks use `task add/update`; status, next step, and blockers use `update`.
Do not hand-edit generated sections or duplicate document detail in this file.

After a meaningful update, reread its exact destination and validate tracker
changes. When an answer arrives, resolve the existing question only if answered
and update the affected record with its source and approval state when known.
Keep conflicts open. Never leave an unanswered question only in chat, create a
new notes/start file, or wait for every decision before saving independent work.

Do not record routine commands, files opened, ordinary tests, tiny edits, or
discarded ideas. A next-step-only or branch-only mechanical correction needs no
progress note unless the reason matters.

## Apply the approval gate

New items have a Requirements section in `WORK-ITEM.md`; existing legacy
items keep `REQUIREMENTS.md`. Requirements start as `refining`. Write only the
owner's request and approved meaning. Keep implementation steps, file choices,
tools, versions, and unapproved assumptions out. Show the result before running
`requirements ID --finalize --approved-by NAME`; reopen it when direction
changes. Never finalize while the Requirements `Goal` still reads
`_Not agreed yet._`. Write the goal the owner agreed, show it, and get the
approval first.

The hard command gate applies to `build` and `data-load`: their requirements
must be finalized before implementation starts. Other types use the risk and
scope judgment in [lifecycle](references/lifecycle.md#work-type-and-approval).
A later stage does not revoke approval. `In Progress` means active work, not
necessarily implementation.

## Use the commands

| Need | Command |
| --- | --- |
| Initialize or preview conversion | `init`, `migrate` |
| Add or read work | `add`, `status`, `next` |
| Save document prose or notes with a version check | `edit` |
| Recover an interrupted multi-file save | `recover` |
| Create or revise roadmap stages | `roadmap show`, `roadmap add`, `roadmap update` |
| Create, read, select, update, or complete execution tasks | `task show`, `task add`, `task select`, `task update`, `task complete` |
| Read, select, replace, or clear the active item | `active` |
| Finalize or reopen requirements | `requirements` |
| Start or update an item | `start`, `update` |
| Add progress, stage, type, next step, or blockers | `update` |
| Add or remove a relationship | `link` |
| Finish or cancel work | `finish`, `update --status Cancelled` |
| Check supplied Git evidence | `landed`, `reconcile` |
| Group or set aside items | `add --group`, `archive`, `unarchive` |
| Check records or rebuild the view | `validate`, `dashboard` |

Run `node <skill-root>/scripts/work.mjs help` for exact flags. Read
`references/command-reference.md` for command details and
`references/record-format.md` for the file schema.

## Stages and status

For roadmap planning, follow [lifecycle](references/lifecycle.md#plan). Roadmap stages use the
owner's language and stay separate from the optional fourteen-stage lifecycle.
Each roadmap stage must be fulfilled by one or more tasks, linked child work
items, or both. Use `task add` to create a new stage with its first task
atomically. Use `roadmap add` when a linked child item fulfills the stage.

Every task records its objective, instructions, constraints, linked inputs,
deliverable, acceptance condition, status, dependencies, current position, and
next action. Use `task update` after a meaningful decision or position change.
For a PRD or design refinement task, link its current position and next action
to the document's bottom Notes. Update settled text and remaining discussion in
that document; do not duplicate its detailed checklist in the item. Other tasks
use the Tasks section (legacy: `TASKS.yaml`). Item requirements use the
Requirements section (legacy: `REQUIREMENTS.md`); link any existing shared PRD
instead of copying it.
Task selection is branch-scoped in `ACTIVE.json`; it does not change the item
stage or status. `task complete` records evidence and enforces task-specific
approval when required, but never completes or approves the parent item.

A linked child may own requirements, design, roadmap, and tasks for real scope.
Keep those details in the child and link only its ID from the parent roadmap.
The existing `parent`/`children` relationship must agree; folder nesting remains
organization and does not establish ownership by itself.

The [stage table](references/lifecycle.md#stages) lists the fourteen stages. Stages are flexible descriptions: skip, repeat,
or revisit them with a short meaningful reason. A missing legacy stage is valid
and must not be backfilled.

Known stages derive active status: `01`-`02` Backlog, `03` Ready,
`04`-`11` In Progress, and `12`-`14` In Review. Only `finish` writes
`Done`; cancellation is intentional. Use one update for related changes so
the item, Progress log, history, active state, and any completion event stay
consistent.

## Respect folders and archives

Folder position is the owner's grouping. A plain folder or a work-item folder
may hold work items, and the tracker scans both. Never move items, invent a
group, or archive work without the owner's request. Folder nesting and tracker
relationships are separate.

Anything under `.work-items/archive/` is archived. Archiving changes no status
and is not completion or cancellation. State how many nested items will move
before archiving a folder. Owner-written files are never tracker input and must
be preserved.

Documents under `.work-items/` are not backed up or shared. Say that once when
the owner first keeps shared material there, and point to the project's
repository documentation home.

## Leave the handoff current

Before ending substantial unfinished work, update the exact next step, blockers
or none, open decisions, and current stage and status. Then run `validate` and
read the result. Run `reconcile` when repository evidence is relevant. Do not
claim a check passed when it could not run.

## Finish honestly

First give the owner the result, known gaps, and appropriate evidence, then ask
whether to mark the item Done. A clear earlier approval counts.

Use:

```text
work finish ID --evidence TEXT [--approved-by NAME] [--approved-date DATE]
  [--commit SHA] [--pr NUMBER_OR_URL]
```

Commit and pull-request evidence are optional because non-repository work can
finish. When supplied, the tool verifies and records Git facts. Done means the
intended outcome was accepted; it does not universally mean a commit landed.

If approval is omitted, the tool records and reports the gap, validation warns,
and no `work_completed` event is emitted. Later approval uses the narrow form
`work finish ID --approved-by NAME [--approved-date DATE]`, even after the
active mapping was cleared. It requires no item active on the current branch
and no stale mapping for the completed item. Repeating identical completion
values is a no-op. Cancelled work emits no completion event.

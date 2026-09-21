# work-tracker plugin

Agent-led delivery guidance and a local work tracker shared by Claude and Codex.
The delivery method uses the project's chosen tracker. Local mode keeps each work item in one
Git-ignored folder, groups them in folders the owner makes, and makes
active-item protection, faithful progress, and type-aware approval gates.

**Setup:** install once per machine. The owner can use the delivery method with
an existing external tracker. Local folders are a separate project choice.

## Agent-led delivery

For substantial new work, the `work` skill offers agents responsibility for
delivery while the human acts as product owner. An accepted, declined, or revoked choice
is saved for that goal in the existing item and read on resume. The
[delivery method](skills/work/references/agent-led-delivery.md) owns that
procedure. Agents maintain the work and bring product decisions and results
to the owner, within existing approval and helper permissions.

After the owner accepts, the skill asks whether they want one team inside this
chat or a Main Orchestrator chat that coordinates other chats, each with its
own team. The multi-chat choice is offered only on a host that supports it,
today the Claude Code desktop app, and the answer is saved with the goal's
delivery choice.
[Team arrangements](skills/work/references/team-arrangements.md) explains what
each answer means.

Local choices live in Overview notes in `WORK-ITEM.md` (legacy: preserved
User notes in `STATUS.md`); external choices live in the description or native
fields. New external items use the same five-section template in their description.
External mode never runs the local CLI or creates `.work-items/`. Optional
session skills supply detailed interviews, design, and review methods.
This is guidance for active sessions, not a scheduler that runs after a session
ends. Local records are shared only within one clone's linked worktrees.

## Install

```text
/plugin install work-tracker
```

Then use:

```text
/work
```

Natural requests such as "add this to the backlog," "start WI-014," "what
should I work on next?", and "reconcile the tracker with Git" trigger the same
skill.

## What it installs

- **work**: delivery instructions for the chosen tracker and local tracker commands.
- **`work.mjs`**: one dependency-free Node.js command for local work items,
  built on `scripts/lib/tracker.mjs` for tracker behavior and
  `scripts/lib/common.mjs` for shared file, YAML, Git, and command helpers, and
  `scripts/lib/work-item-document.mjs` for Markdown parsing and targeted updates.
- **Validation and reconciliation**: deterministic checks for local records and
  Git landing proof.
- **Safe conversion**: a preview-first copy from the older staged tracker.

No database, model, cloud service, or external tracker is required.

The detailed references are `references/command-reference.md` for commands and
`references/record-format.md` for files, fields, and conversion. Delivery is
covered by `references/agent-led-delivery.md` and
`references/team-arrangements.md`.

## Where tickets live

Every project uses the same hidden root folder:

```text
.work-items/
  .work-tracker.yaml
  ACTIVE.json
  EVENTS.ndjson
  DASHBOARD.md
  WI-014-example/
    WORK-ITEM.md
    DESIGN.md                       # optional separate design, or link its shared home
  security-and-permissions/          # a group folder the owner made
    ARCHITECTURE.md                  # their own notes, left alone
    WI-015-org-wide-defaults/
    WI-016-sharing-rules/
  archive/
    WI-003-older-example/
```

`work init` adds `/.work-items/` to `.gitignore`. The work records stay in the
current checkout and never enter Git. Agents can update them without filling a
branch or pull request with routine status changes.

Linked Git worktrees in the same clone share the primary checkout's
`.work-items/` folder and lock. Commands run from a linked worktree return the
shared folder's full path, so agents can open the same records without copying
them. Separate clones and computers do not share it.

New items use one `WORK-ITEM.md` with Overview, Roadmap, Tasks, Recent History,
and Requirements. Designs remain separate and linked. Existing multi-file
items retain their format; no migration is required or added for this change.
There are no status folders. Status changes in Overview (legacy: `ITEM.yaml`);
status never moves a folder.

## Stages and the progress log

An item also carries a `stage`, one of the fourteen in `work-item-stages.md`,
and Recent History in `WORK-ITEM.md` (legacy: Progress log in `STATUS.md`).
One command writes the stage,
the status the stage maps to, and a dated log line together:

```text
work update WI-014 --stage 08 --note "Started the build."
```

Stages may be skipped, repeated, or revisited. A recorded known stage and its
active status stay consistent; `Done` and `Cancelled` are intentional terminal
actions. An item with no stage is normal and is never backfilled.

## Grouping work items

Where a folder sits is the owner's own organizing, and the tracker reads it
fresh on every command. That covers grouping and archiving alike, so the owner
arranges work in a file manager and nothing has to be run afterwards.

Any folder may hold work items, and every one of them is searched. There are two
kinds, and they behave identically:

**A plain folder the owner made.** `security-and-permissions/` with the work
items dragged into it. The folder has no status, no requirements, and nothing to
finish. The tracker records nothing about it. It is a name on disk.

**A work item that holds other work items.** When the area is something the owner
actually works, the parent stays a real work item with its own status,
requirements, and next step, keeps that area's shared documents in its folder,
and the pieces sit inside it:

```text
WI-014-security-and-permissions/     In Progress
  WORK-ITEM.md
  analysis/  diagrams/  evidence/    # the shared documents
  WI-023-security-personas/          Backlog
  WI-024-default-visibility/         Backlog
  WI-032-security-sign-off/          Backlog
```

Both the parent and the items inside it are listed normally. There is no epic or
parent type: a parent is just a work item that happens to have work items in it.

Nesting goes as deep as the owner takes it. Notes, documents, and anything else
in any of those folders are left alone and never read as tracker input.

`work status` names the folder each item is in. `work add --group NAME` creates
an item inside one, making the folder if it does not exist.

A folder counts as a work item when its name looks like one **and** it holds
work-item files. So a folder called `phase-1` or `epic-2` is just a folder, even
though the name matches the pattern.

Folder position and the `parent` relationship are separate. Nesting an item
inside another writes no `parent` link, and linking moves no folder. Use either,
or both.

Git ignores `.work-items/`, so a document kept in one of these folders is not
backed up or shared. Notes are fine. A solution architecture others need belongs
in the repository.

## The archive folder

`.work-items/archive/` is where items go when the owner no longer wants to see
them. Expanding the tracker in an editor then shows the archive folder and the
items still in play, instead of everything ever created.

Sitting in that folder, at any depth, is the only record that an item is
archived. Nothing is written into the item's own files, so the owner can drag
folders in and out and the next command already agrees. Dragging a whole group
in archives everything inside it. `work archive` and `work unarchive` keep the
item in its group, so it comes back where it came from, and they move the
same folders for an agent.

Archiving is organizing, not a status change. Any item may be archived at any
status, and nothing inside it changes.

- Hidden from `work status`, `work next`, and `DASHBOARD.md`.
- Listed by `work status --archived`, and included in `work status --all`.
- Still validated, still reachable by ID, still linked in both directions.
- Their ID numbers are never handed out again.

Folders the owner nests inside `archive/` to group items are searched too.
Anything in there that is not a work-item folder is ignored.

## Type-aware approval

New items have a Requirements section and Overview approval fields. Existing
legacy items keep `REQUIREMENTS.md` with YAML fields at the top. The state is:

- `refining`: the owner interview is still open; or
- `finalized`: the owner approved the requirements.

The body runs as long as the work needs. A chore keeps the one line the owner
asked for; work that needs refining grows the goal, reason, requirements, user
experience, outside behavior, and edge cases. Either way it holds only what the
owner said or approved, with no technical plan and no unapproved agent
assumptions.

New items start in `Backlog` with refining requirements. Finalizing records
the owner's approval. The hard command gate applies to `build` and
`data-load`; other types use risk-based judgment from `work-item-stages.md`.
Types are lower-case kebab-case, with suggested values rather than a fixed list.

## Roadmaps and execution tasks

Roadmap and Tasks sections keep each new item's plan and detailed execution
tasks in `WORK-ITEM.md`. Existing legacy items retain `TASKS.yaml`. Roadmap stages use owner-shaped titles; they are separate
from the optional fourteen-stage lifecycle. Each roadmap stage is fulfilled by
one or more internal tasks, linked child work items, or both.

Every task records its objective, instructions, constraints, linked inputs,
deliverable, acceptance condition, status, dependencies, saved position, and
next action. The branch-scoped active map may select one current task, so
`work active --json` gives a fresh session the complete continuation record.

A child work item can fulfill a parent stage and still own its own requirements,
design, roadmap, tasks, status, and approvals. The parent links its ID through
the existing bidirectional `parent`/`children` relationship. Folder nesting
remains organization; there is no fixed epic or feature type. Completing a task
or child never completes or approves its parent.

Legacy items without task records remain valid. Validation asks the agent to
reconcile the missing plan from accepted evidence when the item resumes; it
does not invent tasks or backfill approval.

## Item records and handoffs

- `WORK-ITEM.md`: Overview state and notes, Roadmap, Tasks, full dated Recent
  History, and Requirements. One record, without a hidden duplicate payload.
- Existing legacy `ITEM.yaml`, `REQUIREMENTS.md`, `TASKS.yaml`, `STATUS.md`, and
  `HISTORY.ndjson` remain supported in place. Mixed formats in one item fail
  validation rather than silently choosing an authority.
- Design documents remain separate in the project's chosen home, linked from
  the item. Root operational files below remain separate:
- `ACTIVE.json`: branch-scoped active-item selections.
- `EVENTS.ndjson`: approved completion events, emitted once.
- `DASHBOARD.md`: generated view that can be deleted and rebuilt.

For requirements or design refinement, the document's bottom `Notes` holds
its decisions with approval state, unfinished discussion, remaining document
tasks, and exact resume point. Update the document itself as answers settle.
The work item retains overall status, other tasks, approvals, and links.
Task continuation fields point to Notes rather than duplicating its checklist.
Other open questions and useful notes use Overview in `WORK-ITEM.md`
(legacy: preserved User notes in `STATUS.md`); questions identify who must answer, status, and what they
affect. Task and state changes use the existing commands. A progress note
alone does not update the requirements or design; read back the actual change.
Use `work edit` with the current document hash to save prose, preserving other
content. Interrupted multi-file saves stop commands until `work recover`
verifies and finishes the pending transaction. Unexpected edits are preserved
and reported for reconciliation.

## Commands

```text
work init
work migrate
work add
work edit
work recover
work requirements
work roadmap
work task
work status
work next
work active
work start
work update
work link
work finish
work landed
work archive
work unarchive
work reconcile
work validate
work dashboard
```

Every command supports readable output. Agent workflows use `--json`.
Validation and command failures return nonzero exit codes.

## How completion is recorded

`finish` records evidence appropriate to the work and optional approval, commit,
and pull-request references. Supplied commits are checked against local Git;
pull-request references are recorded, not remotely verified. Non-repository
work needs no fake commit. Approved Done work emits one stable
`work_completed` event. Missing completion approval is reported and warned
about, and emits no event until approval is added.

## Relationships and next-item selection

Relationships include `depends_on`, `blocks`, `related_to`, `parent`, and
`supersedes`. The tool validates IDs, keeps inverse links consistent, and
rejects dependency cycles.

`next` ranks deterministically. It continues actionable active work first, then
considers `Ready` items by priority, dependency readiness, blockers, creation
date, and ID. A `Backlog` item with refining requirements is never recommended
for implementation.

## Converting the older tracker

The older format may live in `work-items/`, `delivery/work-items/`, or
`engagement/work-items/`. It uses four status folders, `ITEM.json`, and
`SPEC.md`.

`work migrate` previews the conversion and changes nothing. After approval,
`work migrate --apply` copies every item into the `.work-items/` folder,
converts known fields to YAML, creates refining requirements when needed, and
preserves all legacy and unknown files. The old tracker remains unchanged until
the owner verifies the copy and approves its removal.

Old GitHub mirror settings are reported and not carried forward.

## GitHub tracking is separate

Local-folder mode has no GitHub mirror. A project that needs shared GitHub work
tracking should choose the GitHub Projects board option during `project-init`
or `project-sync` instead.

## How it relates to the toolkit

- `project-init` Gate 1 offers local tracking when the owner chooses local
  folders. Gate 6 can offer the delivery method with any chosen tracker.
- `project-sync` detects `.work-items/` and offers safe conversion for the older
  staged format.
- `work-item-folders.md` tells agents how to protect requirements and update the
  local tracker.
- Project knowledge may link to a work-item ID, but work-tracker owns task
  status and handoff state.

## Verification

[Delivery scenarios](tests/delivery-scenarios.md) describes fresh-session
behavior checks, observed results, and the limits of source-loaded fixtures.

Run:

```text
node --test plugins/work-tracker/tests/work-tracker.test.mjs plugins/work-tracker/tests/consolidated-record.test.mjs
claude plugin validate .
```

The tests use temporary Git repositories and never change a live project.

## Maintaining this plugin

A content change bumps the plugin manifest and marketplace version. Keep this
README, the top-level README, project-init, project-sync, the work-item rule,
and `docs/toolkit-map.md` current in the same change.

# work-tracker plugin

A local work tracker shared by Claude and Codex. It keeps each work item in one
Git-ignored folder, groups them in folders the owner makes, and makes
owner-approved requirements the gate before
building starts.

**Setup: sets up a project.** Install once per machine. A project opts in when
the owner chooses local folders for work tracking.

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

- **work**: agent instructions used by Claude and Codex.
- **`work.mjs`**: one dependency-free Node.js command for local work items,
  built on `scripts/lib/tracker.mjs` for tracker behavior and
  `scripts/lib/common.mjs` for shared file, YAML, Git, and command helpers.
- **Validation and reconciliation**: deterministic checks for local records and
  Git landing proof.
- **Safe conversion**: a preview-first copy from the older staged tracker.

No database, model, cloud service, or external tracker is required.

The detailed references are `references/command-reference.md` for commands and
`references/record-format.md` for files, fields, and conversion.

## Where tickets live

Every project uses the same hidden root folder:

```text
.work-items/
  .work-tracker.yaml
  DASHBOARD.md
  WI-014-example/
    ITEM.yaml
    REQUIREMENTS.md
    STATUS.md
    HISTORY.ndjson
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

There are no status folders. Status changes in `ITEM.yaml`; status never moves a
folder.

## Stages and the progress log

An item also carries a `stage`, one of the fourteen in `work-item-stages.md`,
and a "Progress log" section in its `STATUS.md`. One command writes the stage,
the status the stage maps to, and a dated log line together:

```text
work update WI-014 --stage 08 --note "Started the build."
```

The code stores and derives, and decides nothing. It does not check that a stage
is real, refuse a move backwards, or ask why a stage was skipped. The rule says
what is correct. An item with no stage is normal: nothing was converted when
stages arrived.

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
  ITEM.yaml  REQUIREMENTS.md  STATUS.md
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

## The requirements gate

Every item contains `REQUIREMENTS.md` with YAML fields at the top. Its status is
either:

- `refining`: the owner interview is still open; or
- `finalized`: the owner approved the complete requirements.

The body holds the goal, reason, requirements, user experience, outside
behavior, and edge cases. It contains only what the owner said or approved. It
contains no technical plan and no unapproved agent assumptions.

New items start in `Backlog` with refining requirements. Finalizing a complete
file moves the item to `Ready`. `work start` refuses anything else. Reopening
requirements returns open work to `Backlog`.

## Item records and handoffs

- `ITEM.yaml`: description, status, priority, type, dates, next step, blockers,
  relationships, and Git landing evidence.
- `REQUIREMENTS.md`: owner-approved needs and their refinement state.
- `STATUS.md`: readable current handoff, recent history, and preserved owner
  notes.
- `HISTORY.ndjson`: complete dated command history.
- `DASHBOARD.md`: generated view that can be deleted and rebuilt.

## Commands

```text
work init
work migrate
work add
work requirements
work status
work next
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

## How completion is proven

`finish` records the completion commit and asks Git whether that commit is an
ancestor of the configured default branch. If yes, the item becomes `Done`. If
not, it becomes `In Review`.

An agent statement, branch name, closed issue, or pull-request number alone
cannot mark a ticket `Done`. `validate` rejects false completion evidence.

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

- `project-init` offers work-tracker when the owner chooses local folders.
- `project-sync` detects `.work-items/` and offers safe conversion for the older
  staged format.
- `work-item-folders.md` tells agents how to protect requirements and update the
  local tracker.
- Project knowledge may link to a work-item ID, but work-tracker owns task
  status and handoff state.

## Verification

Run:

```text
node --test plugins/work-tracker/tests/work-tracker.test.mjs
claude plugin validate .
```

The tests use temporary Git repositories and never change a live project.

## Maintaining this plugin

A content change bumps the plugin manifest and marketplace version. Keep this
README, the top-level README, project-init, project-sync, the work-item rule,
and `docs/toolkit-map.md` current in the same change.

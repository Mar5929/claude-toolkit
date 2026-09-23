# Work tracker command reference

Resolve `scripts/work.mjs` relative to the `work` skill directory and run it
with Node.js.

## Global options

- `--cwd PATH`: target repository or any path inside it.
- `--json`: machine-readable success and error output.

Local files always live at `.work-items/`. There is no custom tracker path.
Items inside `.work-items/archive/` are archived, at any depth.
Every other folder is searched for work items, including work-item folders
themselves, so a work item may hold other work items. See `record-format.md` for
what makes a folder a work item.
Paths are passed as arguments, not interpolated shell fragments, so repository
names with spaces are supported.

## Setup and conversion

```text
work init [--default-branch main]
work migrate [--from work-items]
work migrate [--from work-items] --apply
```

`init` adds `/.work-items/` to `.gitignore` and creates the flat local tracker.
If it detects an older staged tracker, it stops and points to `migrate`.

`migrate` without `--apply` changes nothing. It shows the source, work-item IDs,
conflicts, whether old GitHub settings exist, and what the applied conversion
will preserve. `--apply` copies the items. It never deletes the old tracker.

## Document saves and recovery

`add` creates only `WORK-ITEM.md` for each new item. Existing multi-file items
retain their format; `migrate` is still only the older staged-root importer.
There is no conversion command for existing items in this release.

```text
work status --json
work edit WI-014 --input /absolute/path/candidate.md --expected-hash SHA256
work recover
```

Item JSON includes `format` (`markdown` or `legacy`), `record_path`, and
`document_hash` (null for legacy). Read the latest document at `record_path`,
copy it to a temporary candidate outside the item folder, edit the requirements
prose or Overview notes, then call `edit` with that snapshot's hash. A stale
hash fails without replacing the record: reread and reapply the intended edit.
The active-item guard still applies. Use dedicated commands for structured
fields, task/roadmap state, approvals, completion, and history. Reopen finalized
requirements before editing their text. Remove the temporary candidate after
verified success. Do not put a second canonical record in the item folder.

Successful saves are read back. Single-document replacements are atomic.
Changes that also affect another item, active selection, or completion events
keep a temporary recovery journal. After a process interruption, ordinary
commands report `pending_recovery`; `recover` checks every affected file and
finishes the saved operation once. It refuses unexpected newer content with
`recovery_conflict`. Preserve the journal and reconcile that content before
retrying; never blindly overwrite it or discard the journal to bypass the guard.
The tracker lock coordinates commands in this clone; it cannot lock arbitrary
editors or external services.

## Local work

```text
work add --title TITLE --description DESCRIPTION --priority medium --type task \
  --next-step STEP [--created-date YYYY-MM-DD] [--group FOLDER] [--id WI-014]
work requirements WI-014
work requirements WI-014 --finalize --approved-by NAME
work requirements WI-014 --reopen
work roadmap show WI-014
work roadmap add WI-014 --title TITLE --outcome OUTCOME --acceptance CONDITION \
  [--child-item WI-018] [--lifecycle-stage 04] [--draft]
work roadmap update WI-014 STAGE-001 [--title TITLE] [--outcome OUTCOME] \
  [--acceptance CONDITION] [--child-item WI-018] [--clear-child-items] [--draft|--planned]
work task show WI-014 [TASK-001]
work task add WI-014 --stage-title TITLE --stage-outcome OUTCOME \
  --stage-acceptance CONDITION [--lifecycle-stage 04] --title TITLE \
  --objective OBJECTIVE --instructions INSTRUCTIONS [--constraint TEXT] \
  [--input PATH_OR_URL] --deliverable DELIVERABLE --acceptance CONDITION \
  [--depends-on TASK-001] [--position POSITION] --next-action ACTION \
  [--approval-required]
work task add WI-014 --roadmap-stage STAGE-001 ...
work task update WI-014 TASK-001 [--roadmap-stage STAGE-002] [--status STATUS] \
  [--position POSITION] [--next-action ACTION] [--depends-on TASK-002]
work task select WI-014 TASK-001
work task complete WI-014 TASK-001 --evidence TEXT \
  [--approved-by NAME] [--approved-date YYYY-MM-DD]
work active
work active set WI-014 [--replace]
work active clear
work status [--all] [--archived] [--json]
work next [--json]
work start WI-014 [--branch BRANCH] [--next-step STEP] \
  [--allow-shared-branch]
work update WI-014 [--stage 08] [--type TYPE] [--status Ready] \
  [--next-step STEP] [--branch BRANCH] \
  [--blocker REASON] [--blocker-item WI-002] \
  [--clear-blocker B-001|all] [--note NOTE] [--allow-shared-branch]
work link WI-014 --type depends_on --target WI-002 [--remove]
work finish WI-014 --evidence TEXT [--approved-by NAME] \
  [--approved-date YYYY-MM-DD] [--commit SHA] [--pr NUMBER_OR_URL]
work finish WI-014 --approved-by NAME [--approved-date YYYY-MM-DD]
work landed WI-014
work archive WI-014
work unarchive WI-014
work dashboard
work reconcile
work validate [--json]
```

`add` always creates a `Backlog` item whose requirements are `refining`.
`--description` becomes the preserved starting request. The older `--purpose`
name remains accepted as a compatibility alias.

`--group` puts the new item inside a folder under `.work-items/`, creating the
folder when it does not exist. It takes a plain folder name, a nested path such
as `security-and-permissions/record-access`, or a work-item folder name such as
`WI-014-security-and-permissions` when the item belongs under that item. It
refuses a path that leaves the tracker, one starting with `archive`, and any
folder whose name starts with a dot, since the scan skips those.

`requirements --finalize` requires only the person who approved them. It does
not check the file's length or its headings, because requirements run as long
as the work needs; `references/lifecycle.md` says how much refining work needs. It
changes a `Backlog` item to `Ready`. `--reopen` returns open
work to `Backlog` and clears the approval fields. When a known stage must move
with that status, finalize sets `03-requirements-approved` and reopen sets
`02-refinement`. A missing or unknown stage is preserved.

`roadmap show` reads the item's owner-shaped roadmap. `roadmap add` creates a
stage fulfilled by linked child work items; each child must already be connected
through the tracker's `children`/`parent` relationship. `roadmap update` revises
the stage without changing the work item's lifecycle status. It refuses to
leave a planned stage with no task and no child work item. `--draft` preserves
an unexpanded stage visibly and validation warns that it still needs breakdown;
`--planned` requires a task or child rather than fabricating one.

`task add` creates a detailed task. With `--stage-title`, it creates the roadmap
stage and its first task atomically. With `--roadmap-stage`, it adds another
task to an existing stage. Repeat `--constraint`, `--input`, or `--depends-on`
as needed. Inputs are paths, issue links, PRDs, designs, accepted-decision
records, or other governing sources. Use an explicit `None.` value when a task
has no applicable constraint or input and that fact matters to continuation.

`task update` maintains execution detail and the saved position. Repeated list
flags replace the corresponding list; `--clear-constraints`, `--clear-inputs`,
and `--clear-dependencies` clear them. Dependencies must be tasks in the same
work item and may not form a cycle. Moving a task between roadmap stages is
allowed only when the old stage still has another task or child item.

`task select` records the branch's current task inside the existing active-item
mapping. It does not move the item stage or status. `work active --json` then
returns the complete selected task so a fresh session can read its objective,
instructions, constraints, sources, deliverable, acceptance condition, saved
position, and next action.

`task complete` requires evidence. A task created with `--approval-required`
also requires the approver and date. It checks task dependencies, records the
completion, and clears that branch's current-task selection. It never completes
or approves the parent work item.

`--stage` writes the Overview stage and derived status and appends to Recent
History in `WORK-ITEM.md` (legacy: `ITEM.yaml` and `STATUS.md` Progress log), all in
one call. It takes a number (`8`, `08`), a name (`build`), or the whole thing
(`08-build`), and stores anything it does not recognize exactly as typed. The
log line uses `--note` as its text, or the summary of what changed when there is
no note. A conflicting `--status` is refused and points to `--stage`, so one
command cannot write a known stage and the wrong active status.

`14-spec-update` maps to `In Review`; only `finish` writes `Done`.

Nothing validates the stage itself. `lifecycle.md` says which stage is
correct, when one may be skipped, and what belongs in the log.

`active` reads the current branch mapping. `active set` selects one item and
requires `--replace` to change a conflicting mapping. `start` selects its item
when no mapping exists. Named mutations refuse a different active item.

`start` preserves an existing In Progress stage. When a known earlier stage
must move with the new In Progress status, it uses `08-build` for `build` and
`data-load`, `04-solution-design` for `solution-design`, and clears the stage
for other types because their next phase is not known. A missing legacy stage
stays missing.

The hard finalized-requirements gate applies to `build` and `data-load`.
Other lower-case kebab-case types follow the lifecycle rule's risk judgment.

`archive` moves an item's folder into `.work-items/archive/` and `unarchive`
moves it back. Both keep the item in the folder it sat in, so it returns where it
came from, and a folder deleted meanwhile is recreated. Neither changes the
item's status or its files. Moving the folder by hand does exactly the same
thing, so no command is required.

Archiving moves a folder, so everything inside it goes too. Dragging a plain
folder into `archive/` archives every item in it, and `archive WI-014` on a work
item that holds other work items archives those as well. Check what is inside
before running it.

Archived items are hidden from `status`, `next`, and the dashboard;
`status --archived` lists them and `status --all` includes them. Archiving
something already archived reports no change.

A terminal item may be archived or unarchived after its active mapping is
cleared, but only while no item is active on the current branch.

`finish` requires evidence for a new completion. Commit and pull-request
references are optional. Commits are checked against local Git; pull-request
references are recorded, not remotely verified. Missing approval is
recorded and warned about but emits no completion event. The approval-only form
fills approval on an existing unapproved completion when no item is active on
the current branch and the completed item has no stale mapping. Identical
retries are no-ops.

## Exit behavior

- `0`: command succeeded.
- `1`: command or input failed.
- `2`: `validate` found invalid local records.

JSON errors are written to standard error with `outcome`, `error`, and
`message`.

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

## Local work

```text
work add --title TITLE --description DESCRIPTION --priority medium --type task \
  --next-step STEP [--created-date YYYY-MM-DD] [--group FOLDER] [--id WI-014]
work requirements WI-014
work requirements WI-014 --finalize --approved-by NAME
work requirements WI-014 --reopen
work status [--all] [--archived] [--json]
work next [--json]
work start WI-014 [--branch BRANCH] [--next-step STEP] \
  [--allow-shared-branch]
work update WI-014 [--stage 08] [--note WHAT_HAPPENED] [--status Ready]   [--next-step STEP] [--branch BRANCH] \
  [--blocker REASON] [--blocker-item WI-002] \
  [--clear-blocker B-001|all] [--note NOTE] [--allow-shared-branch]
work link WI-014 --type depends_on --target WI-002 [--remove]
work finish WI-014 [--commit SHA] [--pr NUMBER_OR_URL] [--next-step STEP]
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
as the work needs; `work-item-stages.md` says how much refining work needs. It
changes a `Backlog` item to `Ready`. `--reopen` returns open
work to `Backlog` and clears the approval fields.

`--stage` writes the stage into `ITEM.yaml`, sets the status the stage maps to,
and appends a dated line to the "Progress log" section of `STATUS.md`, all in
one call. It takes a number (`8`, `08`), a name (`build`), or the whole thing
(`08-build`), and stores anything it does not recognize exactly as typed. The
log line uses `--note` as its text, or the summary of what changed when there is
no note. Passing `--status` as well overrides the derived status.

`14-spec-update` maps to `Done`, which `update` never writes; use `finish` for
that. A stage mapping to `Ready`, `In Progress`, or `In Review` needs finalized
requirements, the same as an explicit `--status`.

Nothing validates the stage itself. `work-item-stages.md` says which stage is
correct, when one may be skipped, and what belongs in the log.

`start` accepts only a `Ready` item with finalized requirements. It uses the
current branch when `--branch` is omitted. It rejects a branch already claimed
by another active item unless `--allow-shared-branch` is explicit.

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

`finish` resolves `HEAD` when `--commit` is omitted. It marks `Done` only when
`git merge-base --is-ancestor` proves the commit is in the configured default
branch. Otherwise it records `In Review`.

## Exit behavior

- `0`: command succeeded.
- `1`: command or input failed.
- `2`: `validate` found invalid local records.

JSON errors are written to standard error with `outcome`, `error`, and
`message`.

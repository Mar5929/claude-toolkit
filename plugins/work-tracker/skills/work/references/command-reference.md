# Work tracker command reference

Resolve `scripts/work.mjs` relative to the `work` skill directory and run it
with Node.js.

## Global options

- `--cwd PATH`: target repository or any path inside it.
- `--json`: machine-readable success and error output.

Local files always live at `.work-items/`. There is no custom tracker path.
Items inside `.work-items/archive/` are archived, at any depth.
Any other folder in there is a group the owner made, and the items inside it are
found normally. See `record-format.md` for what separates the two.
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
work update WI-014 [--status Ready] [--next-step STEP] [--branch BRANCH] \
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

`--group` puts the new item in a group folder under `.work-items/`, creating the
folder when it does not exist. Nested names such as
`security-and-permissions/record-access` work. It refuses a path that leaves the
tracker, one starting with `archive`, and any folder whose name starts with a
dot, since the scan skips those.

`requirements --finalize` requires all six sections plus the person who
approved them. It changes a `Backlog` item to `Ready`. `--reopen` returns open
work to `Backlog` and clears the approval fields.

`start` accepts only a `Ready` item with finalized requirements. It uses the
current branch when `--branch` is omitted. It rejects a branch already claimed
by another active item unless `--allow-shared-branch` is explicit.

`archive` moves an item's folder into `.work-items/archive/` and `unarchive`
moves it back. Both keep the item in its group folder, so an item returns where
it came from, and a group folder deleted meanwhile is recreated. Neither changes
the item's status or its files. Moving the folder by hand does exactly the same
thing, so no command is required, and dragging a whole group into `archive/`
archives everything inside it. Archived items are hidden from `status`, `next`,
and the dashboard; `status --archived` lists them and `status --all` includes
them. Archiving something already archived reports no change.

`finish` resolves `HEAD` when `--commit` is omitted. It marks `Done` only when
`git merge-base --is-ancestor` proves the commit is in the configured default
branch. Otherwise it records `In Review`.

## Exit behavior

- `0`: command succeeded.
- `1`: command or input failed.
- `2`: `validate` found invalid local records.

JSON errors are written to standard error with `outcome`, `error`, and
`message`.

# Work tracker command reference

Resolve `scripts/work.mjs` relative to the `work` skill directory and run it
with Node.js.

## Global options

- `--cwd PATH`: target repository or any path inside it.
- `--path PATH`: non-default work-items directory, relative to the Git root.
- `--json`: machine-readable success and error output.

Paths are passed as arguments, not interpolated shell fragments, so repositories
with spaces are supported.

## Local tracker

```text
work init [--path work-items] [--default-branch main]
work add --title TITLE --purpose PURPOSE --priority medium --type task \
  --next-step STEP [--status Backlog] [--id WI-014] [--github]
work status [--all] [--json]
work next [--json]
work start WI-014 [--branch BRANCH] [--next-step STEP] \
  [--allow-shared-branch] [--github]
work update WI-014 [--status Ready] [--next-step STEP] [--branch BRANCH] \
  [--blocker REASON] [--blocker-item WI-002] \
  [--clear-blocker B-001|all] [--note NOTE] [--allow-shared-branch] [--github]
work link WI-014 --type depends_on --target WI-002 [--remove]
work finish WI-014 [--commit SHA] [--pr NUMBER_OR_URL] \
  [--next-step STEP] [--github]
work landed WI-014
work archive WI-014
work dashboard
work reconcile [--github]
work validate [--json]
```

`start` uses the current branch when `--branch` is omitted. It rejects a branch
already claimed by another active item unless `--allow-shared-branch` is
explicit.

`finish` resolves `HEAD` when `--commit` is omitted. It marks `Done` only when
`git merge-base --is-ancestor` proves the commit is in the configured default
branch. Otherwise it records `In Review`.

## GitHub Projects

```text
work github connect --create [--owner OWNER] [--repo OWNER/REPO] [--title TITLE]
work github connect --project-number N [--owner OWNER] [--repo OWNER/REPO]
  [--configure-status] [--no-link]
work github sync [WI-014 ... | --all]
work github reconcile
work github status
```

Connecting requires `gh auth login` and the `project` scope. If needed:

```text
gh auth refresh -s project
```

Creating a Project configures its built-in Status field. Linking an existing
Project validates the field first. Replacing an existing Project's Status
options requires `--configure-status` because it can clear values that do not
map to the requested workflow.

## Exit behavior

- `0`: command succeeded.
- `1`: command or input failed.
- `2`: `validate` found invalid canonical records.

JSON errors are written to standard error with `outcome`, `error`, and
`message`.

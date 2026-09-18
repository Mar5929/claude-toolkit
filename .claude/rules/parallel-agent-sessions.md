# Assume Other Agents Are Working in This Repo Right Now

Other sessions are editing this repository right now. Assume it.

Authorized documentation-only saves follow `knowledge-direct-commit.md` instead
of the worktree and pull-request steps below. That unscoped rule applies even
without project knowledge. Code, configuration, behavior-bearing instructions,
and inseparable mixed changes keep this implementation workflow.

## Look first

Before your first edit, every session:

```
git worktree list
git status
git fetch origin && git log --oneline -10
```

Another worktree, a moved branch, or changes you did not make: other sessions
are live. Never "fix" a dirty tree or an unfamiliar branch. Tell the owner.

## Your own worktree

- Creating a file, or touching more than one, means your own worktree and
  branch: the native worktree tool, or
  `git worktree add .claude/worktrees/<name> -b claude/<name>`. Already in one?
  Stay.
- One exception: a one-file edit to an existing file, asked for directly.
- Never check out, commit to, push to, rebase, or delete another session's
  branch, or commit its uncommitted changes.
- In the shared primary checkout, never switch branches, reset, or rebase.
  Reading and fetching are fine. Authorized documentation edits use the direct
  publication rule; a local work tracker uses its existing commands.
- Sharing a device, simulator, or server for testing? Start your own instance
  rather than competing for one.

## Stage only your work

Never `git add -A`, `git add .`, or `git commit -a`. Name the paths. Read
`git diff --cached --name-status` and the full staged diff: every change must be
yours and authorized. If someone else's changes are staged, coordinate with
their owner before committing; never unstage or include their work.

In a shared file, coordinate overlapping edits and preserve other sessions'
changes. Reconcile authorized corrections against the latest content; do not
replace whole files from an older checkout. Never hand-edit a generated file.

## Claim a number first

Numbers collide. Before taking a work item number or any sequential identifier,
check every tracker folder, every worktree, and the remote. Where a tool assigns
numbers, use it. Where Git owns the identifier, push it before starting work.
Found a collision later? Renumber your own, never the other session's, then
search the repository for the old number.

## Landing work

- Land implementation work by pull request; merge only with owner approval.
  Authorized documentation-only saves use the direct publication rule.
- Before an approved merge, compare its files
  (`git diff --name-only <default-branch>...<branch>`) with `git status` in the
  primary checkout. A file in both: stop, name it, let the owner decide.
- After the merge, remove your worktree and delete your branch.

A project may relax parts of this in its own rules file. Merge-on-approval and
the merge-safety check always stay.

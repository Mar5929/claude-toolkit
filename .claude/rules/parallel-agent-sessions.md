# Assume Other Agents Are Working in This Repo Right Now

Other sessions are editing this repository right now. Assume it.

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
- In the shared primary checkout, never edit, switch branches, reset, or rebase.
  Reading and fetching are fine.
- A work tracker whose records sit in the primary checkout is the one exception:
  run its commands. Do not hand-edit anything else there.
- Sharing a device, simulator, or server for testing? Start your own instance
  rather than competing for one.

## Stage only your work

Never `git add -A`, `git add .`, or `git commit -a`. Name the paths. Read
`git diff --cached --name-status`: every file must be yours. Unstage the rest.

In a shared file, append. Never reorder or rewrite entries you did not add.
Never hand-edit a generated file.

## Claim a number first

Numbers collide. Before taking a work item number or any sequential identifier,
check every tracker folder, every worktree, and the remote. Where a tool assigns
numbers, use it. Where Git owns the identifier, push it before starting work.
Found a collision later? Renumber your own, never the other session's, then
search the repository for the old number.

## Landing work

- Land work by pull request. Never push the default branch yourself. Merge only
  with owner approval.
- Before an approved merge, compare its files
  (`git diff --name-only <default-branch>...<branch>`) with `git status` in the
  primary checkout. A file in both: stop, name it, let the owner decide.
- After the merge, remove your worktree and delete your branch.

A project may relax parts of this in its own rules file. Merge-on-approval and
the merge-safety check always stay.

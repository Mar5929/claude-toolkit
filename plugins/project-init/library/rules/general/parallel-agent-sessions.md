# Assume Other Agents Are Working in This Repo Right Now

Other sessions edit this repository now. Before your first edit, run:

```
git worktree list
git status
git fetch origin && git log --oneline -10
```

- An unknown worktree, moved branch, or change you did not make means other sessions are live. Do not fix it. Tell the owner.
- Code, rules, skills, hooks, settings: use your own worktree and branch (`git worktree add .claude/worktrees/<name> -b claude/<name>`). Exception: a one-file edit asked for directly.
- Documentation-only saves: open the `publish-docs` skill.
- In the shared primary checkout, never switch branches, reset, rebase, or stash.
- Never touch another session's branch or uncommitted work.
- Stage paths by name. Never `git add -A`, `git add .`, or `git commit -a`. Read the full staged diff.
- Never hand-edit a generated file.
- Before taking a sequential number, check every tracker folder, worktree, and the remote.
- Land implementation by pull request, merged with the owner's approval. A standing merge instruction the owner gave for this project counts.
- Before a merge, compare `git diff --name-only <default-branch>...<branch>` with `git status` in the primary checkout. A file in both: stop, name it, ask the owner.
- After the merge, remove your worktree and branch.

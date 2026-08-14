# Assume Other Agents Are Working in This Repo Right Now

Several Claude and Codex sessions work this repository at the same time, often
on the same machine and in the same checkout. That is normal, not an exception.
Behave as though another agent is editing the same files in the same minute,
because one usually is.

A git worktree is a separate folder with its own checked-out branch, so work
there never changes what another session sees.

## 1. Look before you edit

Run these before your first edit of a session, every session:

```
git worktree list
git status
git fetch origin && git log --oneline -10
```

Another worktree, a default branch that moved in the last day, or changes you
did not make all mean parallel sessions are live. That is the normal answer.

Never "fix" a dirty working tree or an unexpected branch you do not recognise.
Another session is probably mid-task. Tell the owner instead.

## 2. Work in your own worktree

Creating any new file, or touching more than one file, means you work in your
own worktree on your own branch. This is not a judgement call about whether your
change feels small, because every agent believes its own change is small. The
narrow exception is a genuine one-file edit to a file that already exists, which
the owner asked for directly.

Before your first file change, use the native worktree tool (`EnterWorktree`) if
available, or `git worktree add .claude/worktrees/<name> -b claude/<name>` as a
fallback. Desktop-app sessions that already start inside an isolated worktree
stay there; do not create another.

**One session, one worktree, one branch.** Never check out, commit to, push to,
rebase, or delete a branch another session is using, and never commit another
session's uncommitted changes, even when the change looks finished and
committing it looks helpful. It is not yours to describe in a commit message.

**Never edit files, switch branches, `git reset`, or `git rebase` in the shared
primary checkout.** That pulls files out from under other sessions. Reading
there is fine, and so is `git fetch` or `git pull` while it sits on the default
branch. The primary checkout stays on the default branch, clean, always.

If sessions share a device, simulator, or server for testing, do not fight over
it; spin up your own instance.

## 3. Stage explicit paths, never everything

**Never run `git add -A`, `git add .`, or `git commit -a`.** In a shared checkout
those sweep up other sessions' in-flight work and put your commit message on it.

Name the paths you are staging. Then read `git diff --cached --name-status`
before committing and confirm every file listed is one you wrote this session.
If a file you did not write appears, unstage it.

## 4. Keep shared-file edits narrow

Some files every session edits: backlog and dashboard views, the generated
`knowledge/index.md`, `CLAUDE.md`, and `AGENTS.md`.

For an ordinary addition, append the new entry without reordering or rewriting
unrelated entries. Reordering turns a clean addition into a conflict and rewrites
another session's words under your commit. If a tool generates the file, do not
hand-edit it at all.

Shared does not mean immutable. When an owner-approved change moves, replaces,
supersedes, merges, or deletes persistent material, the corresponding index entries
may be updated with it. Keep that edit limited to the approved
material and preserve unrelated entries. Before merge, follow the project's
knowledge procedure for its latest-state duplicate and conflict review.

Keep edits to shared status and handoff documents small and additive so parallel
pull requests merge cleanly.

## 5. Claim an identifier before you use it

Sequential numbers assigned independently by parallel agents collide. That is
arithmetic, not carelessness.

Before taking a work item number or any other sequential identifier, check every
place one may already exist: every folder the tracker uses, every other
worktree, and the remote. Then claim it by creating and pushing the folder as
your **first** action, before doing the actual work, so a second agent can see it
is taken.

If you discover a collision after the fact, renumber **your own** item, never the
other session's, and search the whole repository for references to the old
identifier before you finish.

## 6. Landing work on the default branch

Do not push the default branch on your own initiative. Land finished work by
pull request, then ask the owner whether to merge; merge only with their
approval, or a standing instruction to merge.

**Before running an approved merge, check it cannot collide with uncommitted
work in the primary checkout.** Compare `git status` there against the files the
merge changes (`git diff --name-only <default-branch>...<branch>`). If any file
appears in both lists, stop, name exactly those files, and let the owner decide
whether to commit, stash, or skip. Git would refuse a clobbering merge anyway;
the point is to flag the collision first rather than surprise them with an
error.

After the merge, remove your worktree and delete your branch. If your work is
already sitting in the shared working tree when the owner asks you to land it,
say so plainly rather than quietly pushing.

## Relaxing parts of it

A project may relax parts of this when the owner says so, for example allowing
small config edits directly in the primary checkout, or a local `git merge` the
owner explicitly asks for instead of a pull request. Put the relaxed variant in
that project's own `.claude/rules/` file. The merge-only-on-approval step and
the merge-safety check stay in every variant.

If the project has a session-start orientation hook, that hook should remind
each new session to enter its own worktree before changing anything.

## Why

Written after a single session broke this three ways in one hour: two sessions
independently created a work item with the same number and one had to be
renumbered across four files; one session's staged files were swept into another
session's commit twice, so the work ended up described by a commit message about
something else; and a shared backlog file was reordered while three sessions
were editing it. None of that was malice or haste. All of it came from an agent
assuming it was the only one in the repository.

## Related rules

- `work-item-folders.md`: the work tracker and how identifiers are assigned.
- `ask-before-assuming.md`: when the state of the repository is unclear, ask
  rather than guess.

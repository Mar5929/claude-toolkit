# Assume Parallel Agents: Work in Your Own Worktree

The owner routinely runs several Claude Code sessions on the same repo at once
(multiple terminals, plus desktop-app sessions). Assume you are not alone, and
work in your own silo so no session pulls files out from under another.

A git worktree is a separate folder with its own checked-out branch, so work
there never changes what another session sees in the shared checkout.

## The protocol

- **Before your first file change**, create and enter your own git worktree on
  your own new branch. Use the native worktree tool (`EnterWorktree`) if
  available, or `git worktree add .claude/worktrees/<name> -b claude/<name>` as
  a fallback. Desktop-app sessions that already start inside an isolated
  worktree stay there; do not create another.
- **One session = one worktree = one branch.** Never check out, commit to, push
  to, or delete a branch another session is using.
- **Never** edit files, switch branches, `git reset`, or `git rebase` in the
  repo's shared primary checkout; that pulls files out from under other
  sessions. Reading files there is fine, and so is `git fetch`/`git pull` while
  it sits on the default branch. The primary checkout stays on the default
  branch, clean, always.
- Land finished work on the default branch via pull request. After opening the
  PR, ask the owner whether to merge and clean up; merge only with approval (or
  a standing instruction to merge). After the merge, remove your worktree and
  delete the branch.
- **When the owner approves a merge**, check that it cannot collide with
  uncommitted work in the primary checkout before running it: compare
  `git status` there against the files the merge changes
  (`git diff --name-only <default-branch>...<branch>`). If any file appears in
  both lists, stop, name exactly those files, and let the owner decide (commit,
  stash, or skip). Git would refuse a clobbering merge anyway; the point is to
  flag the collision first, not surprise the owner with a git error.
- If the primary checkout is dirty or on an unexpected branch, do not "fix" it;
  another session may be mid-task. Tell the owner instead.
- Keep shared status/handoff docs' edits small and additive so parallel PRs
  merge cleanly.
- If sessions share a device, simulator, or server for testing, do not fight
  over it; spin up your own instance.

## Relaxing parts of it

A project may relax parts of this when the owner says so (for example, allowing
small config edits directly in the primary checkout, or a local `git merge` the
owner explicitly asks for instead of a PR). Put the relaxed variant in that
project's own `.claude/rules/` file. The merge-only-on-approval and
merge-safety-check steps stay in every variant.

If the project has a session-start orientation hook, that hook should remind
each new session to enter its own worktree before changing anything.

---
name: pull-latest
description: >-
  Safely bring a local git repository up to date with its remote when the
  checkout may be shared by parallel agent sessions. Fetch + prune, fast-forward
  when possible, and when local and remote have diverged, inspect both sides and
  reconcile with a merge pull — never rebase, never reset, never push. Use this
  whenever the user asks to "get the latest", "pull the latest changes", "sync
  with remote", "update from origin", "grab what others pushed", or mentions
  that other agents/sessions/teammates pushed changes they want locally — even
  if they just say "update the repo". Do NOT use when the user expresses
  destructive-sync intent (wipe local, exactly mirror remote, fresh start) —
  that is the reset-to-remote skill's job.
---

# Pull latest from remote (parallel-session safe)

Bring the current checkout up to date with its remote without destroying or
rewriting anything. The core assumption: **you may not be the only session
working in this repo.** Other sessions may hold worktrees, reference local
commits, or be mid-task — so anything that rewrites or discards history
(`reset`, `rebase`, `checkout` to another branch) is off the table. Pushing is
also off the table: publishing is the owner's call.

## 1. Preconditions — look before you pull

Run `git status -sb` and `git rev-parse --abbrev-ref HEAD` first.

- **Dirty working tree** → stop. Do not stash, do not commit, do not "fix" it —
  another session may be mid-task. Report exactly what is dirty and ask.
- **Shared primary checkout on an unexpected branch** (not the default branch)
  → stop and report; same reasoning.
- **Your own worktree on your own branch** → fine; pull that branch's upstream.

## 2. Fetch, then try fast-forward

```bash
git fetch --prune origin
git pull --ff-only
```

Fetch separately so you see what arrived (new/deleted remote branches are worth
mentioning in the report). If the fast-forward succeeds, go to step 5.

## 3. If diverged: inspect before reconciling

A refused fast-forward means local has commits the remote doesn't. Never guess
what they are — look:

```bash
git log --oneline @{u}..HEAD        # local-only commits
git log --oneline HEAD..@{u}        # incoming commits
git show --stat <local-only-sha>    # who wrote it, what it touches
```

Questions to answer before touching anything:
- Who authored the local-only commits? (The owner's own unpushed work is
  normal; another agent's commit sitting on a shared branch is worth flagging.)
- Did the same content already land on the remote by another path (e.g., a PR
  merged with a different SHA)? Check with
  `git cat-file -e @{u}:<path>` or by diffing.

If the local-only commits look like another session's in-flight work that
shouldn't be on this branch, **stop and report** instead of merging it in.

## 4. Reconcile with a merge pull

```bash
git pull --no-rebase --no-edit
```

Why merge and not rebase: rebase rewrites the local commits' SHAs, which can
strand other sessions or worktrees that reference them — in a shared checkout
that's never safe. A merge preserves both sides verbatim. If the merge
conflicts, stop and report the conflicting files rather than resolving
unilaterally, unless the resolution is obvious and the user asked you to
complete the sync.

## 5. Report — and do not push

After merging, the branch is ahead of its upstream (the local commits plus the
merge commit). Leave it that way; pushing publishes the owner's unpushed work
and is their decision.

Always end with a short report:
- Incoming commits (oneline) and a one-line summary of what they change
  (use the diffstat — call out anything surprising, e.g. new subsystems).
- Remote branch changes from the prune (created/deleted).
- Final state: "up to date with origin/<branch>" or "ahead by N commits
  (<which ones>) — pushing is your call."
- Anything you found odd in step 3, even if you proceeded.

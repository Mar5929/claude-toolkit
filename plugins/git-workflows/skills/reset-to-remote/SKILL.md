---
name: reset-to-remote
description: Hard-reset a local git repository to exactly mirror its remote — fetch + prune, reset every local branch that tracks a remote to that remote's tip, delete branches whose remote was removed, and reinstall dependencies from the lockfile. Use this whenever the user wants to "match remote", "sync with remote", "fresh start from remote", "make this an exact clone of remote", "wipe local and pull from remote", or describes wanting their local repo to equal what's on the remote (e.g., "I haven't worked on this in a while, others have, just want a fresh start"). Treat this as the safe alternative to deleting and re-cloning a repository. Do NOT trigger for routine `git pull` / `git fetch` requests that don't express destructive-sync intent.
---

# Reset to remote

Bring a local git repository into exact alignment with its remote — the safe equivalent of deleting the directory and re-cloning, without losing remote-tracking refs or having to re-configure local tooling.

A fresh clone has these properties: only the default branch is checked out, every local branch matches its remote counterpart exactly, no orphaned branches exist for remotes that have been deleted, and dependencies are installed from the current lockfile. This skill reproduces that state in place.

The destructive parts are gated behind a preflight safety check and an explicit confirmation. The user has chosen "abort on dirty state" over auto-stashing, because hidden stashes are easy to forget about and a deliberate stop forces a real decision.

## Workflow

### 1. Verify the remote setup

Before anything else, confirm there's a single canonical remote.

```bash
git remote -v
```

- If `origin` exists, use it.
- If there's no `origin` (e.g., the remote was renamed to `upstream`), stop and ask the user which remote should be treated as the source of truth.
- If multiple remotes exist, default to `origin` but mention the others so the user can correct if needed.

Throughout the rest of this skill, the phrase "the remote" refers to whichever remote the user confirmed.

### 2. Preflight: refuse to proceed if work is at risk

Run these checks. If either returns anything, **STOP**. Surface what's blocking and let the user decide what to do — do not auto-resolve.

```bash
git status --porcelain        # uncommitted + staged + untracked changes
git stash list                # existing stashes
```

If both come back clean, continue.

If `git status --porcelain` has output, classify it:
- Modified/staged files → suggest the user commit or stash (and only discard with `git checkout -- .` / `git clean -fd` if they explicitly confirm).
- Untracked files only → ask before assuming they're safe to ignore; some workflows depend on local-only files.

If `git stash list` has entries, ask the user whether each stash is still wanted. Stashes are often deliberate snapshots the user means to come back to.

### 3. Fetch the latest state (safe, non-destructive)

```bash
git fetch --all --prune
```

This pulls down the current remote state and prunes remote-tracking refs for branches that were deleted on the remote. Nothing local is touched yet.

### 4. Identify the default branch from the remote

Do not hardcode `main`. Some repos use `master`, `develop`, or `trunk`. Read what the remote actually says:

```bash
git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@'
```

If that's empty (the symbolic ref isn't set locally), fall back to:

```bash
git remote show origin | awk '/HEAD branch/ {print $NF}'
```

### 5. Build the plan and show it to the user

Enumerate every local branch and its disposition. Use:

```bash
git for-each-ref --format='%(refname:short) | %(upstream:short) | %(upstream:track)' refs/heads/
```

Categorize each branch:

| Category | Condition | Action |
|---|---|---|
| **(a) Tracking, remote exists** | has upstream, `upstream:track` does not contain `[gone]` | hard-reset local to upstream tip |
| **(b) Tracking, remote deleted** | has upstream, `upstream:track` contains `[gone]` | delete local branch |
| **(c) No upstream** | empty upstream column | preserve and warn |

Present this plan to the user as a concrete preview — branch names and target SHAs for resets, branch names for deletions, and any local-only branches that will be preserved. Wait for explicit approval before running any destructive command.

If a local-only branch (category c) exists, call it out clearly. These are almost always work-in-progress the user hasn't pushed. Deleting them silently would be exactly the failure this skill is meant to prevent.

### 6. Switch to the default branch

You can't reset or delete the branch you're currently standing on, so switch first:

```bash
git checkout <default-branch>
```

If the current branch is in category (a), it will get reset in the next step like any other tracking branch. If it's in category (b), the checkout to default makes it deletable.

### 7. Reset tracking branches

For each category (a) branch:

- **If it's the current branch** (default branch after step 6):
  ```bash
  git reset --hard <upstream>
  ```
- **If it's any other branch**:
  ```bash
  git branch -f <branch> <upstream>
  ```

`git branch -f` is preferable for non-current branches because it updates the ref without checking the branch out — no working-tree churn, no chance of triggering pre-checkout hooks, much faster on large repos.

### 8. Delete orphaned branches

For each category (b) branch:

```bash
git branch -D <branch>
```

Use `-D` (capital) not `-d` — the branch may be ahead of any remote since its upstream is gone, and `-d` will refuse.

### 9. Reinstall dependencies if a lockfile exists

Detect the package manager by which lockfile is present in the repo root and run the matching install. Skip silently if none — this is a pure git repo (or a polyglot project where node deps aren't the user's concern right now).

| Lockfile | Command |
|---|---|
| `pnpm-lock.yaml` | `pnpm install` |
| `package-lock.json` | `npm install` |
| `yarn.lock` | `yarn install` |
| `bun.lockb` or `bun.lock` | `bun install` |

If multiple lockfiles are present (e.g., both `package-lock.json` and `pnpm-lock.yaml`), don't guess — ask the user which package manager is canonical. Running the wrong one can corrupt the wrong lockfile or pull a different dependency tree than other developers are using.

### 10. Report final state

End with a concise summary:

- Default branch + new HEAD SHA
- Count and names of branches reset
- Count and names of branches deleted
- Count and names of local-only branches preserved (if any)
- Whether install ran, and whether it actually changed anything

Keep this short — the user just wants to know what happened and confirm nothing was lost.

## Design rationale

- **Refuse on dirty state, don't auto-stash.** Hidden stashes accumulate and get forgotten. A hard stop forces the user to make a real decision about their in-progress work.
- **Detect the default branch from the remote.** Repos that still use `master`, or use `develop` / `trunk`, would be silently mis-handled if `main` were hardcoded.
- **`git branch -f` for non-current branches.** Faster, no working-tree thrash, no hook triggers, and removes a class of "I forgot to checkout back" bugs.
- **Preserve local-only branches by default.** Anything without an upstream is almost certainly unpushed work. Silent deletion would defeat the purpose of "safe equivalent of re-cloning."
- **Confirm before destructive ops.** This skill is convenient *because* it's destructive. A clear preview + approval gate is what makes it safe to invoke.
- **No `git pull`.** Pull can create merge commits when local and remote have diverged — the exact state the user wants to discard.

## What NOT to do

- Do not run `git pull` — use fetch + reset instead.
- Do not use `--force` on `git fetch` — plain fetch is already safe; force-fetch can mask remote history rewrites.
- Do not delete local branches with no upstream without per-branch user approval.
- Do not skip the preflight check, even if the user says "just do it" — show them what's dirty first and let them confirm.
- Do not run the install if no lockfile is present; that would generate one for a project that may not use that package manager.
- Do not hardcode `main` as the default branch.
- Do not auto-resolve multiple lockfiles — ask which is canonical.

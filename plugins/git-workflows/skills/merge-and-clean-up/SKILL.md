---
name: merge-and-clean-up
description: >-
  Merge an approved GitHub pull request, update its base checkout, and safely
  remove only the merged PR's remote branch, local branch, and isolated
  worktree. Use when the user says "merge and clean up", "merge this PR and
  cleanup", "land this pull request", "merge then remove the worktree", or asks
  to finish an already-open PR and clean up its Git artifacts. Supports Claude
  and Codex sessions using local git plus the GitHub CLI.
---

# Merge and clean up

Land one exact pull request, prove it merged, then remove only the workspace
that belonged to it. Treat merge and cleanup as one guarded workflow.

## Safety rules

- A request to "merge and clean up" is merge approval only when the target PR is
  unambiguous from a number, URL, or the current branch. Ask when more than one
  PR could match.
- Read the repository's `AGENTS.md`, `CLAUDE.md`, and local workflow rules
  before acting. Repository rules decide required checks, merge method, ticket
  updates, and who may merge.
- Never merge a draft, bypass branch protection, use admin override, force-push,
  or ignore a failed required check.
- Never delete before GitHub reports the PR as `MERGED`.
- Never delete the default branch, the PR's base branch, an unrelated branch or
  worktree, a dirty worktree, or a branch with local commits not present in the
  PR head.
- Preserve every unrelated worktree and branch. List them before and after
  cleanup.
- If any proof is missing, stop at the safe boundary and report exactly what
  remains.

## 1. Resolve the exact target

Identify the repository and PR from the user's number or URL. For "this PR" or
"the current PR", resolve from the current checkout:

```bash
git status -sb
git remote -v
git rev-parse --abbrev-ref HEAD
gh pr view --json number,url,state,headRefName,headRefOid,baseRefName,isCrossRepository
```

Record:

- repository owner/name
- PR number and URL
- head branch and GitHub head SHA
- base branch
- worktree holding the head branch, if any
- worktree holding the base branch, if any
- whether the head branch belongs to the base repository or a fork

Use `git worktree list --porcelain` to map branches to paths. If the local head
branch exists, require its SHA to equal the PR's `headRefOid` before promising
that cleanup can delete it. A different SHA means local-only work exists. Stop
and preserve it.

## 2. Run the merge preflight

Inspect the current GitHub state:

```bash
gh pr view <number> --repo <owner/repo> \
  --json number,title,state,isDraft,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup,headRefName,headRefOid,baseRefName,isCrossRepository,url
gh pr checks <number> --repo <owner/repo>
```

Proceed with merging only when:

- the PR is open and not a draft
- GitHub reports it mergeable
- required reviews are satisfied
- required checks passed
- the head and base still match the target recorded in step 1

If the PR is already merged, skip the merge command and continue only after
recording its merge commit and rechecking that its head branch and SHA match the
workspace proposed for cleanup. If it is closed without merging, stop.

`gh pr checks` exits nonzero when no checks exist. Treat "no checks reported" as
no configured check, not as a failed check. Run any repository-required local
verification before merging and state plainly when no automated check exists.

If checks are pending, wait only when the user asked to wait or finish the
merge. If checks fail, stop and route the failure to the repository's CI-fix
workflow. Do not merge around it.

Before merging, confirm the PR worktree is clean:

```bash
git -C <head-worktree> status --porcelain
```

Any output blocks cleanup. Do not stash or discard it.

## 3. Merge

Use the merge method explicitly required by the user or repository. When neither
specifies one:

- prefer squash for a normal single-purpose feature branch
- preserve commits with a merge commit when their structure is intentional
- ask if the choice would materially change history

Run the merge against the named repository so the command does not depend on
the current worktree:

```bash
gh pr merge <number> --repo <owner/repo> --squash --delete-branch
```

Replace `--squash` with the chosen method when needed. Omit `--delete-branch`
for a cross-repository PR because its branch belongs to the contributor's fork.
Never add an admin or protection-bypass flag.

Immediately verify the result:

```bash
gh pr view <number> --repo <owner/repo> \
  --json state,mergedAt,mergeCommit,url,headRefName,headRefOid,baseRefName,isCrossRepository
```

Do not clean up unless `state` is `MERGED`.

## 4. Update the base checkout

Locate the worktree holding the base branch. Require it to be clean and on the
expected branch. Then:

```bash
git -C <base-worktree> fetch --prune origin
git -C <base-worktree> pull --ff-only
```

If the base checkout is dirty, on another branch, or cannot fast-forward, leave
it untouched, do not perform local cleanup from it, and report the blocker. Do
not reset, stash, switch, or rebase it.

Follow repository instructions for moving a linked ticket to its completed
state after the merge. Do not invent a ticket when none exists.

## 5. Remove only the merged workspace

Recheck these proofs:

1. GitHub reports the exact PR merged.
2. The cleanup branch is the PR head branch, not the base or default branch.
3. The cleanup worktree is clean.
4. The local branch SHA still equals the recorded PR head SHA.
5. No other worktree uses the cleanup branch.

Run cleanup from the base worktree, never from inside the worktree being
removed:

```bash
git -C <base-worktree> worktree remove <head-worktree>
git -C <base-worktree> branch -d <head-branch>
git -C <base-worktree> worktree prune
```

A squash merge does not make the old branch commit an ancestor of the base, so
`git branch -d` can refuse even after a successful merge. Use
`git branch -D <head-branch>` only when all five proofs above still hold and the
only refusal is the expected non-ancestor warning. This is not permission to
force-delete any other branch.

If GitHub did not delete the remote branch, delete it only when it belongs to
the same repository and exact merged PR:

```bash
git -C <base-worktree> push origin --delete <head-branch>
git -C <base-worktree> fetch --prune origin
```

Do not try to delete a contributor's fork branch.

## 6. Verify and report

Verify:

- the PR is merged
- the base checkout matches its upstream and is clean
- the PR branch is absent locally and remotely
- the PR worktree is absent
- every unrelated worktree remains

End with the PR link, merge commit, final base state, and cleanup result. Put any
remaining owner action last. If everything is complete, say that nothing else
is needed.

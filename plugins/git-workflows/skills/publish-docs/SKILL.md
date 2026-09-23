---
name: publish-docs
description: Use when saving an authorized documentation-only change (project knowledge, PRDs, designs, review records, README files, architecture documents) straight to the default branch. Checks, commits, pushes, and verifies the remote result without a branch, worktree, or pull request.
---

# Publish a documentation save

Publish an authorized, Git-tracked, documentation-only change from the existing
default-branch checkout. This skill changes how a save is published. It does not
grant permission to change the content. Follow the destination's own approval
rules. Saving a proposed design or PRD does not approve its requirements or its
build.

## Choose the route by the actual change

- Documentation: project memory, PRDs, designs, review records, README
  explanations, and architecture documents in their configured homes.
- A folder or a `.md` extension alone does not make a file documentation.
- Rules, skills, prompts, hooks, settings, and code change behavior. They use
  the implementation workflow: a worktree and a pull request.
- Documentation that cannot be separated from a code change stays with that
  change in its worktree and review.
- An independent documentation update can take this route while the
  implementation stays in its worktree.
- Do not split dependent changes to avoid review. Do not describe an unshipped
  feature as shipped.
- Untracked local work items stay in their tracker. No Git save.

## Steps

1. **Find the checkout.** Run `git worktree list`. Confirm the repository,
   default branch, remote, and publishing identity. Inspect working and staged
   changes. No safe checkout: report the blocker. Never switch another
   session's branch. Never stash, discard, or reset its work.
2. **Get current.** Fetch. Fast-forward only when safe. Stop for overlapping
   incoming edits or divergent history. Do not reset or rebase the shared
   checkout. Inspect every outgoing commit: a push also publishes its
   ancestors. Another session's unpushed commit without publication authority:
   coordinate with its owner and leave this save pending. Read the latest
   destination. Reconcile only authorized meaning. Never overwrite it with an
   older copy. Serialize staging and committing with other sessions.
3. **Check.** Check links and formatting. For managed knowledge, rebuild the
   indexes and run its documented checks. Generated files must not include
   another session's unfinished records. A failed check leaves the save
   unfinished, unless the owner authorizes publication with the failure
   recorded.
4. **Stage.** Stage only this save's files, by name. Never stage everything.
   Read the full staged diff. Another owner's staged change blocks this commit
   until that owner finishes or hands it over. Never unstage their work. A
   shared-file change that cannot be separated stays pending. No automatic
   stash.
5. **Commit, push, verify.** Commit and push the default branch. Confirm the
   intended commit is in the remote branch before calling the save complete.
   Then return to any implementation work in its own worktree.

## Recover without losing work

- On a refused push, account mismatch, login prompt, protected branch,
  conflict, or failed check, report separately what is written, checked,
  committed, and published.
- Keep the pending change, any commit id, and the exact next action in the work
  record or handoff.
- On resume, check whether the commit already reached the remote before saving
  again.
- Never force-push, bypass branch protection, retry through another account, or
  turn the save into a pull request without saying so.
- Ask the owner only when meaning, authority, or a different delivery route
  needs a decision.
- An unpushed commit is not a completed save.

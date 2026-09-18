# Authorized Documentation Saves Land Directly

Publish authorized Git-tracked documentation-only changes promptly through the
existing default-branch checkout: check, commit, push, and verify the remote
result. Do not create a branch, worktree, or pull request for that save, or wait
for implementation to ship. This rule applies whether project knowledge is
enabled or not. Its historical filename is retained for existing routes.

This is the documentation exception to `parallel-agent-sessions.md`. It changes
publication, not permission to change content. Honor the destination's existing
approval rules and approval already given for the same meaning and scope.
Saving a proposed design or PRD does not approve its requirements or its build.

## Choose the route by the actual change

Documentation includes project memory, PRDs, designs, review records, README
explanations, and architecture deliverables in their configured homes. Their
folder or `.md` extension alone does not establish eligibility. Rules, skills,
prompts, configuration, and other files that change installed behavior follow
the implementation workflow, even when written in Markdown. The agent judges
the purpose and scope; no classifier or automatic writer decides it.

Code/configuration changes and inseparable accompanying documentation stay in
their implementation worktree and review. An independent documentation update
can take the direct route while implementation stays isolated. Do not split
dependent changes to evade review or describe an unshipped feature as shipped.
Git branches the repository as a whole; this is a publication workflow.
Untracked local work items stay in their existing tracker, without Git saves.

## Publish from the existing default-branch checkout

1. Locate that checkout with `git worktree list`. Confirm repository, default
   branch, remote, and the project's publishing identity. Inspect working and
   staged changes. If no safe checkout is available, report the blocker; never
   switch another session's branch or stash, discard, or reset its work.
2. Fetch and compare remote state. Fast-forward only when safe. Stop for
   overlapping incoming edits or divergent history; do not reset or rebase the
   shared checkout. Inspect every outgoing commit: pushing also publishes its
   ancestors. If another session's unpushed commit lacks publication authority,
   coordinate with its owner and leave this save pending. A clean working tree
   does not establish that those commits may be published.
   Read the latest destination and reconcile only authorized
   meaning. Never overwrite it with an old worktree copy. Coordinate edits to
   the same file and serialize staging/committing with other sessions.
3. Run the destination's relevant checks. For documentation, check links and
   formatting. For managed knowledge, also rebuild indexes and run its
   documented checks. Generated files must not include unfinished records from
   another session. Keep checks scoped; a failed check leaves the save unfinished
   unless the owner explicitly authorizes publication with that failure recorded.
4. Stage only this save's owned, authorized changes. Never stage everything.
   Inspect the full staged diff, not only filenames. Unrelated staged changes
   block this commit until their owner finishes or coordinates a safe handoff;
   never unstage their work. Shared-file changes must be safely separable or
   the save remains pending. Do not use an automatic stash to clear the way.
5. Commit and push the default branch. Verify the intended commit is included
   in the remote branch before calling publication complete; the remote may
   have advanced beyond it. Resume implementation in its existing worktree.

## Recover without losing work

On a refused push, account mismatch, login prompt, protected branch, conflict,
or failed check, report what is written, checked, committed, and remotely
published separately. Preserve the pending change, any commit identity, and
the exact next action in the existing work record or handoff. On resume,
check whether the commit already reached the remote before repeating a save.

Never force-push, bypass branch protection, retry through another account, or
silently turn the save into a pull request. Resolve mechanics without losing
other edits; ask only when meaning, authority, or a different delivery route
requires an owner decision. An unpushed commit is not a completed save.

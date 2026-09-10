---
paths:
  - "knowledge/**"
---
# Knowledge-Only Saves Land Directly

An authorized save under `knowledge/` commits straight to the project's
default branch and is pushed. Do this promptly as work happens, even when the
session's implementation is in a worktree. Do not bury knowledge in that
branch, wait for its pull request, or create another worktree for the save.

This is the owner-approved exception to `parallel-agent-sessions.md`. It
changes where a save lands, not what may be saved. The knowledge manual still
owns content approval. Recognize approval already given for the same change.
Keep implementation and every file outside `knowledge/` on their normal path.

## Save from the default-branch checkout

1. Locate the existing checkout of the default branch with `git worktree list`.
   Check its status and staged changes before writing. Do not switch another
   session's branch or stage, unstage, stash, or discard its work. If no safe
   default-branch checkout is available, report the blocker.
2. Fetch and compare the remote with that checkout. Fast-forward when safe;
   stop if incoming changes overlap local work or the branches have diverged.
   Do not reset or rebase a shared checkout to make the save fit.
3. Read the latest destination and apply only the authorized meaning there.
   Do not copy an old worktree file over newer knowledge. Preserve other
   sessions' edits; resolve conflicting meaning before writing. If the edit
   began on the implementation branch, reconcile it here without committing
   unrelated content or deleting another session's changes there.
4. Rebuild the generated indexes and run the project's knowledge checks.
   In toolkit projects, use `node .claude/tools/build-knowledge-index.mjs`
   and `node .claude/tools/check-knowledge.mjs`. Keep the check focused on the
   save; do not start a broad cleanup. A failing check leaves the save unfinished.
5. Stage only this save's exact paths, all under `knowledge/`. Never use
   `git add -A`. Read the full staged diff, not just the filenames: include
   only authorized content. A generated index must not publish another
   session's unfinished file. If the index or staged content cannot be
   separated safely, report the blocker instead of committing it.
6. Commit with a clear message and push the default branch. Verify the commit
   reached the remote before saying the save is finished. Resume implementation
   in its existing worktree; a later normal update brings the saved knowledge
   into that branch.

## When a save cannot finish

Report what is written locally, what is committed, what reached the remote,
and the exact next step. Keep the pending save visible in the existing work
record or handoff. Do not silently park it on a branch or call it complete.

If a push is refused or a login window appears, stop and report it. Do not
force-push, retry through another account, or automatically turn the save into
a pull request. A different delivery route needs the owner's direction.

Other sessions' work stays protected throughout. A quick save is small and
authorized; it is never permission to commit everything in a shared folder.

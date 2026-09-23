# Safe knowledge saves across sessions (#415)

## Approved outcome

Documentation saves remain on the project's default branch. Each session
prepares a save in its own temporary worktree, so its files and staging area
cannot be mixed with another session's unfinished work. A save is complete only
after all authorized files and follow-up changes are present on the remote.
The knowledge commit check must inspect the staged version without copying the
whole project. `knowledge-save` uses a short topic placement test before its
approval card. Approved by Mike Rihm on 2026-09-23 in the task for issue #415.

## Build

1. Update `publish-docs` and its shipped publication rule. The helper starts a
   detached, sparse worktree from the latest remote default branch. It records
   the exact authorized paths, includes related generated indexes, rejects
   unrelated or unstaged changes, commits, pushes without force, and verifies
   the remote result. A stale remote leaves the local commit recoverable in the
   same workspace.
2. Change the `second-brain` pre-commit hook to copy only staged knowledge and
   checker inputs. Give the checker a staged path list to validate links to
   tracked files outside that smaller snapshot.
3. Put the topic placement test in `knowledge-save`: update a fitting topic,
   rename a coherent topic whose title became too narrow, or split for distinct
   reader questions. Correct conflicting claims in their owning files.
4. Update installed copies, manuals, project templates, catalogs, and plugin
   versions so future project syncs receive the behavior.

## Verification

- Use local bare Git remotes to test two simultaneous saves, unrelated staged
  or untracked files, a changed remote, recovery, and a published memory whose
  source link points outside the sparse checkout.
- Run the existing pre-commit fixture suite and required repository checks.
- Validate the marketplace. Distinguish local test results from behavior in a
  freshly synced project.

## Notes

- The user's approved topic placement request was added to the issue after the
  publication fix began. Both are in this work item.
- A separate save worktree prevents shared staging and accidental mixed
  commits. The smaller staged snapshot addresses the full-project copy cost;
  neither change promises that every Git operation will be instant on Windows.
- In the toolkit checkout on 2026-09-23, the old hook would export all 651
  tracked files for one knowledge commit. The scoped export names 199 checker
  inputs. Projects with large non-knowledge trees should avoid copying those
  trees entirely. This is a file-count measure, not a wall-clock benchmark.
- A project needs a project sync to receive the shipped changes.

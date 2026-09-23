---
name: publish-docs
description: Use when saving an authorized documentation-only change (project knowledge, PRDs, designs, review records, README files, architecture documents) to the default branch from an isolated save workspace. Checks, commits, pushes, and verifies the remote result without a pull request.
---

# Publish a documentation save

Publish an authorized, Git-tracked, documentation-only change from an isolated
temporary Git worktree. Each save has its own files and staging area. The helper
pushes directly to the default branch; it does not open a pull request or leave
the approved content waiting on a feature branch. This skill changes how a save
is published. It does not
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

1. **Choose exact files.** Confirm the repository, default branch, remote, and
   publishing identity. Name every authorized destination and related file,
   including pending-save and link changes. Inspect any existing local edits;
   do not take another session's uncommitted work or overwrite it. If the save
   already began in a shared checkout, recover or hand it over before starting
   a second copy.
2. **Start a separate save workspace.** From the project, run the script beside
   this skill's `SKILL.md`:

   ```text
   node <publish-docs-skill-directory>/scripts/publish-docs.mjs start --branch <default-branch> -- <file> [more files]
   ```

   It fetches the current remote, creates a detached sparse worktree beside
   the project, and prints its path. It includes generated indexes for named
   memory, PRD, and captured-document topics. The helper accepts Markdown
   documentation, including project specific document homes, but rejects
   instruction files and non-README files under behavior directories. Send
   code and configuration through implementation review.
   Use only that path for this save;
   give it to the authorized helper. Another session's save gets a different
   workspace and staging area.
3. **Write and check.** Read the latest destination in that workspace. Apply
   only authorized meaning. Rebuild managed knowledge indexes and run the
   installed knowledge checker. Check links and formatting for other documents.
   Stage only this save's files by name and read the complete staged diff. A
   failed check or unexpected staged path leaves the save unfinished. Never
   bypass a failing check.
4. **Publish and verify.** In the save workspace, run:

   ```text
   node <publish-docs-skill-directory>/scripts/publish-docs.mjs publish --message "<plain commit message>"
   ```

   The script refuses staged paths outside this save, requires the staged
   knowledge check when applicable, commits, pushes to the default branch
   without force, and verifies the remote contains the commit. It does not
   remove the save workspace. Reuse that same workspace for an authorized
   pending-save cleanup, then remove it only after all phases are verified and
   its worktree is clean. Do not delete another session's workspace.

## Recover without losing work

- If the default branch advances, fetch and reconcile in this save workspace.
  Rebuild generated indexes and rerun checks after bringing it current. A
  rejected push does not touch another checkout. Retry `publish` only after
  checking the current remote and the exact pending effect. Ask the owner only
  when the meaning or authority changes.
- On a refused push, account mismatch, login prompt, protected branch,
  conflict, or failed check, report separately what is written, checked,
  committed, and published. Keep the save workspace, any commit id, and the
  exact next action in the work record or handoff.
- Never force-push, bypass branch protection, retry through another account,
  reset, or stash another session's work. An unpushed commit is unfinished.

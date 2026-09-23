---
paths:
  - "knowledge/**"
  - "prds/**"
  - "PROJECT.md"
  - "docs/**"
  - "**/README.md"
---
# Documentation Saves Land Directly

- Commit authorized documentation-only changes straight to the default branch, from the existing default-branch checkout. No branch, worktree, or pull request.
- Rules, skills, hooks, prompts, settings, and code use a worktree and a pull request, even when written in Markdown.
- Saving a document does not approve its requirements or its build.
- Stage only your own files, by name.
- Never force-push, reset, rebase, or stash in the shared checkout.
- An unpushed commit is not a finished save. Verify the commit reached the remote.
- Steps, checks, and recovery: the `publish-docs` skill.

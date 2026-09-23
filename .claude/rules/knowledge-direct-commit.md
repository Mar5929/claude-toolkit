---
paths:
  - "knowledge/**"
  - "prds/**"
  - "PROJECT.md"
  - "docs/**"
  - "**/README.md"
---
# Publish Documentation from an Isolated Workspace

- Prepare each authorized documentation-only save in its own temporary Git worktree. Publish its commit directly to the default branch without a pull request.
- Rules, skills, hooks, prompts, settings, and code use a worktree and a pull request, even when written in Markdown.
- Saving a document does not approve its requirements or its build.
- Stage only this save's files, by name, in its worktree. Read the full staged diff.
- Never force-push or change another session's checkout. Resolve a remote advance in this save's worktree.
- An unpushed commit is unfinished. Verify the complete save reached the remote.
- Steps, checks, and recovery: the `publish-docs` skill.

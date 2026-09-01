---
paths:
  - "knowledge/**"
---
# Knowledge-Only Saves Land Directly

A save that touches only files under `knowledge/` commits straight to the
default branch. No worktree, no feature branch, no pull request.

This is the owner-approved exception to `parallel-agent-sessions.md`. That
rule's ceremony protects code from conflicting edits. A knowledge save is
small, additive, and already approved by the owner in conversation, so paying
the full branch-and-pull-request flow for each one made saving tedious enough
to skip. This rule changes where a save lands, never what may be saved: the
knowledge manual's approval flow still decides the content.

## When the fast path applies

All of these must be true:

- Every file the change touches is under `knowledge/`.
- The content went through the approval the knowledge manual requires.
- The session is not already mid-task in a worktree. A session doing branch
  work keeps its knowledge writes on its own branch, and they reach the
  default branch when its pull request merges.

For this save alone, writing the knowledge files in the primary checkout is
allowed, the same narrow way `parallel-agent-sessions.md` already allows the
work tracker.

## The steps

1. Pull the default branch so you start current.
2. Rebuild the generated indexes the way the knowledge manual says. In
   toolkit projects that is `node .claude/tools/build-knowledge-index.mjs`.
3. Stage the exact paths you wrote, all under `knowledge/`. Never
   `git add -A`.
4. Read `git diff --cached --name-status` and confirm every listed file is
   one you wrote this session.
5. Commit with a clear message and push. If the remote moved in the
   meantime, pull with rebase, rebuild the indexes again, and push once more.

## When to fall back

Go back to the normal branch-and-pull-request flow, and say so, when:

- Any touched file sits outside `knowledge/`.
- The push is refused by branch protection, or still fails after one rebase
  retry.
- A rebase conflicts in anything other than a generated index. An index
  conflict is not a real conflict: rebuild it from the files, which are what
  win, and continue.

## What does not change

Everything else in `parallel-agent-sessions.md` stays in force: never stage a
file you did not write, never touch another session's work, and code still
lands by pull request with owner approval. This rule is the one
owner-approved case of pushing the default branch without asking first.

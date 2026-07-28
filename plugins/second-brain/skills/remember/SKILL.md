---
name: remember
description: >-
  Save clear owner-approved project information through second-brain v3.
  Recognize requests such as "remember this", "save that", "capture what we
  did", or "/remember". Use the on-demand memory librarian to place and write
  the content in Markdown and Git. Never write retired v1, create a quick-write
  store, or add hooks, scripts, databases, embeddings, or transcript capture.
---

# Remember with second-brain v3

A clear request to remember specific information supplies approval to save that
content. The owner does not need to approve a second filing proposal.

## Confirm v3 is installed

The project must contain:

- `.claude/rules/second-brain.md`;
- `.claude/agents/memory-librarian.md`;
- `brainstorms/README.md`;
- `specs/README.md`; and
- `memory/README.md` with all seven typed memory indexes.

If the coherent v3 core is absent, explain that nothing was written and offer
the `second-brain` setup or brownfield adoption workflow. Do not create a
partial memory folder as a shortcut.

## Understand the request

If the content and intended meaning are clear, proceed.

Examples:

- `Remember that production releases require owner approval` is clear.
- `Remember this discussion` is ambiguous. Propose the specific durable
  takeaway or ask one focused question.
- `Remember this and reorganize all architecture documents` approves the
  identified memory, not the large reorganization.

Do not use a parser or require a magic phrase. Interpret the owner's normal
language with AI judgment.

## Delegate the write

1. Read `.claude/rules/second-brain.md`.
2. Confirm the current repository, worktree, and branch.
3. Identify the approved content, relevant context, known canonical documents,
   relationships, and anything the librarian must not infer.
4. Invoke the dedicated memory librarian.
   - Claude: use the installed `memory-librarian` project agent.
   - Codex: delegate to a subagent and require it to read
     `.claude/agents/memory-librarian.md` and the canonical rule first.
5. Inspect the resulting diff.
6. Report what changed, where it was placed, why, and any unresolved issue.

The librarian handles routine placement, nearest-index maintenance, and
mandatory structural links. A risky or large change involving deletion,
authority, canonical homes, broad reorganization, splitting, merging, or
supersession, or a new top-level system area requires a separate visible
proposal and owner approval.

If the host cannot invoke the dedicated librarian, report the approved update
as pending instead of silently writing it another way.

## Boundaries

- Keep live ticket status, blockers, assignments, and handoffs in work-tracker.
- Keep raw meetings, transcripts, communications, and deliverables in their
  ordinary project artifact homes.
- Never store credentials, secrets, private data that does not belong in Git,
  raw chat transcripts, or temporary debug output.
- Never read or import retired v1 Worker, Neon, MCP, curator, hook, outbox,
  cache, or knowledge content.
- Never commit, push, merge, deploy, or contact external systems as part of
  remembering.

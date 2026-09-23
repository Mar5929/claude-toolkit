---
name: knowledge-save
description: Use when the owner settles a decision, gives a requirement or correction, or says "remember this", and before creating or changing any file under knowledge/. Drafts the proposal card, and after approval starts a helper agent to save it. Also finishes and recovers unfinished saves, and updates, supersedes, retires, deletes, or consolidates records.
---

# Save and maintain project knowledge

## Before you start

- These steps need the managed schema:2 manual at `knowledge/knowledge-manual.md`.
- If the manual is legacy, or the layout is partial or conflicting, use
  `knowledge-setup` first, under real update authority.
- Until then, keep candidates and unfinished work in the conversation or in
  current work. Do not create a new inbox. Do not move files as part of a save.
- A newer plugin cache alone does not authorize migration.
- Read the project's selected output style before you write a card or saved
  text. Plain words must keep useful detail and required exact wording.
- Policy lives in `knowledge/knowledge-manual.md`. Open the section you need:
  2 for the owning record, 3 for lasting memory, 4 for permission.

## When to review

Notice additions, corrections, removals, and needed record updates during the
whole conversation. This includes work that edits no files, and information
outside the current item. Noticing a change does not authorize unrelated work.

Review everything since the last review at these moments:

- a work item finishes or closes
- before opening a pull request
- before a handoff or a context clear
- at the end of a turn with real work
- when the owner asks for a save or a review

Review every destination, not only lasting memory.

- A routine review with nothing to save stays quiet.
- Speak only about a proposal that needs approval, a save whose destination
  needs confirmation, or a problem.
- An explicit save or review request always gets an answer.
- Keep an unanswered card in the inbox. Do not show the unchanged card every
  turn.

## Steps

1. Read [selection and cards](references/selection-and-cards.md) before you
   review candidates, ask for approval, or read an answer. Decide the kind,
   scope, and owner first. Then apply the memory tests. Send valid non-memory
   information to its own process. A missing owner is a gap to report.
2. Search the existing topic and the inbox. Check current sources and
   permission. Read [operations and templates](references/operations.md) for
   the operation, then only the template for the destination. Do not widen an
   approval. Do not infer approval from silence, an index, or an inbox entry.
3. Read [execution and recovery](references/execution-and-recovery.md) before
   any authorized save or retry. Record the exact authority and owed change in
   `knowledge/memory-inbox.md` before you edit or start a helper. Keep the same
   reference through retries. Check real file, Git, and remote state before you
   repeat work.
4. When a helper agent is available and authorized, give it the
   [executor assignment](references/executor.md). The conversation continues.
   The main agent owns approval and the verified report. If no helper is
   available, finish in the foreground under the same authority and name the
   limit.
5. Read back the saved text. Check meaning, sources, style, fields, and links.
   Rebuild the indexes and run the installed checker.
6. Publish with the `publish-docs` skill: commit to the default branch, push,
   and verify the remote. Only then is the save complete. Related ready saves
   may share a commit. Keep their permissions separate. Never hold a ready save
   to collect others.
7. Remove only the completed inbox entry. Verify that the cleanup was shared.
   A pending cleanup is not an unpublished destination.

## Report

- Report finished memory and current-work saves briefly.
- Routine authorized PRD upkeep after real delivery stays quiet.
- On failure, say what is written locally, committed, and on the remote, what
  remains, and the next action. Keep the permission and completed steps. Pause
  only the work that depends on the save.

## Limits

- A record, checker result, or receipt proves neither truth nor consent. You
  check meaning.
- This skill adds no automatic-save grant and no separate memory store.

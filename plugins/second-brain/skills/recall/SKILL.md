---
name: recall
description: >-
  Find what this project already knows before searching code broadly or asking
  the owner something already answered. Use when picking up work, before
  changing behavior, when asking what was decided, or when the owner runs
  /recall.
---

# recall

Use the find order, trust rules, and conflict behavior in
`knowledge/README.md`. Reopen those sections after compaction when needed. If
the manual is missing, report that the knowledge policy is unavailable and do
not invent one.

## Search

Walk the manual's tiers in order and stop at the first answer.

- Treat `knowledge/current.md` as current work state, never lasting truth.
- Check loaded rules and available skills before looking for a saved fact.
- At the saved-knowledge tier, read both generated indexes. Open only files
  whose summaries may answer the question, then follow their relative links.
- Read `knowledge/project.md` when the question is about project shape.
- Check the work tracker when the question is about a requirement, status, or
  decision owned by one work item.
- Read `knowledge/brainstorms/` only when raw exploration is requested, and name
  it as unchecked.

Optional Obsidian tools may be used for read-only finding and searching. Normal
Markdown paths remain authoritative.

## Answer

Name the source file and the relevant status and provenance when they affect
trust. Do not answer from an index line alone.

Handle conflicts exactly as the manual says. Show both sources and the precise
disagreement. Do not hide a mismatch between intended behavior, saved context,
and observed code.

If the project tiers do not answer, say what was searched. Offer or announce
the historical search, then invoke `session-search`. If that also finds
nothing, say so plainly and ask the owner. Never fill the gap with an adjacent
or believable guess.

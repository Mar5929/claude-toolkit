---
name: recall
description: >-
  Find what this project already knows before searching code broadly or asking
  the owner something already answered. Use when picking up work, before
  changing behavior, when asking what was decided, or when the owner runs
  /recall. Always use at the start of troubleshooting an error, a failure, or a
  broken process, and before running a multi-step procedure: check whether this
  project has hit the same thing before and already saved how it was fixed, so
  a known solution is reused instead of worked out again.
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
- Before the saved-knowledge tier, resolve the owner's words through the
  project's glossary when one exists.
- At the saved-knowledge tier, read both generated indexes and check
  `.system-guide.json`. When the guide is enabled, use its actual `guidePath`
  and start questions about existing structure, purpose, connections, or impact
  at that guide's index. Start required-behavior questions at PRDs and decisions
  or lessons at memory. Open only files whose summaries may answer the question,
  then follow their relative links. When the guide config is absent or disabled,
  skip it without error.
- Answer settled required behavior only from a PRD marked `finalized` or the
  legacy status `current`. A proposed PRD is wanted work, so name it as not yet
  true. For current structure, use the enabled System Guide and verify existence
  against the live system when it matters.
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
disagreement. A finalized project requirement answers what the system should do,
the System Guide answers how existing parts fit together, and the live system
answers what exists now. Memory overrides none of them. Do not hide a mismatch
between intended behavior, saved context, the guide, and observed code.

If the project tiers do not answer, say what was searched. Offer or announce
the historical search, then invoke `session-search`. If that also finds
nothing, say so plainly and ask the owner. Never fill the gap with an adjacent
or believable guess.

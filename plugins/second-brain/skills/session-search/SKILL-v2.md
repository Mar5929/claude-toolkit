---
name: session-search
description: >-
  Search the host's own saved conversations, in place and read-only, when the
  owner asks to find an earlier session or when the current project owners were
  searched and cannot answer. Name that reason before searching. Results carry
  the host, session id, date, role, and message locator, so exact wording is
  opened at its source before anyone relies on it. Never copy, index, or
  summarize a transcript, never treat a past session as current truth, and never
  widen to other projects without the owner saying so.
---

# session search

This is tier 5 of the retrieval ladder, and it is the last tier before an honest
failure. Everything above it is current project truth. Session history is
evidence of what was said, not a statement of what is true now.

The design authority behind it is the toolkit repository's
`work-items/memory-redesign/memory-system-v2-master-technical-architecture.md`,
section 15.5, with the tool contract in `contracts.md` section 2.21.

## The gate

Search history only when one of these is true:

1. **The owner asked.** They want an earlier session, or the exact words someone
   used.
2. **Current project owners were searched and were insufficient**, and you can
   say which ones you searched and what they were missing.

Nothing else opens it. Curiosity, thoroughness, and "it might help" do not.
Search `memory.mjs search`, `memory.mjs spec-search`, `memory.mjs timeline`, and
`knowledge/current.md` first, and if one of them answers, stop there.

The reason travels with the call, so the gate is checked rather than assumed:

```text
node "${CLAUDE_SKILL_DIR}/scripts/search-sessions.mjs" \
  --query "distinctive words" \
  --project "${CLAUDE_PROJECT_DIR}" \
  --reason owner-request
```

Use `--reason owner-request` when the owner asked in this session. Otherwise pass
a sentence naming what you searched and why it fell short, for example
`--reason "the decision records and current specs carry the outcome but not the
wording the client used"`. A missing, blank, or one-word reason is refused with
`history/gate-closed` and exit 1, and no history is read.

**In a project marked sensitive, only an owner request opens the gate.** Pass
`--sensitive-project` so the script enforces it. Insufficient current sources are
not enough there, however real the gap.

## Search the smallest scope

Choose two to four distinctive words, a quoted phrase, or a known session title.
The default `project` scope covers sessions tied to the current project only.

- `--scope repository` adds the registered worktrees of the same repository.
- `--scope all` needs `--allow-all-projects` as well, and only after the owner
  says to widen it. The script refuses the wider scope without both flags.
- `--since YYYY-MM-DD` and `--until YYYY-MM-DD` narrow to a known date range.
- `--limit N` raises the default five matches.
- `--project-id <id>` records the memory project id the search was run for.

## Read results as located evidence

Each entry carries the host, session id, date, role, message locator, a short
excerpt, the session title, and the exact resume route. That locator is the point
of the tier: it is how the original message gets opened.

Expand one promising entry rather than pasting several:

```text
node "${CLAUDE_SKILL_DIR}/scripts/search-sessions.mjs" \
  --project "${CLAUDE_PROJECT_DIR}" \
  --reason owner-request \
  --session <session-id> \
  --message <message-id> \
  --expand message
```

Use `--expand turn` when the matching message and its reply are both needed.
Reuse the original scope flags and the all-project permission flag.

**Open the source before quoting it.** An excerpt is a pointer, not a quotation.
If the answer turns on the exact wording, expand the message, or hand the owner
`claude --resume <session-id>` so they can read it themselves.

## A miss is scoped, never a denial

If history is missing, disabled, expired, or unreadable, the result is a
`history/unavailable` warning at exit 0 that names the machine, host, project,
and dates actually covered. Report it that way. "Nothing was found in that
scope" is the honest sentence. "That was never discussed" is not, and the tool
never says it.

History being absent never blocks memory. Current project answers, the boot
brief, and cross-machine continuity all work with no history at all.

## Keep the boundary

- History stays where the host put it. Never edit, move, copy, index, archive,
  or summarize a transcript, and never build a session card or any other
  session-derived status store.
- The search writes nothing. No cache, no working set, no local gate file.
- Current files win when they answer. If a session conflicts with a current
  record, show the conflict and treat the session as historical evidence.
- Never write a result into `knowledge/`. Saving anything is `remember`, with the
  owner's approval and a link to the evidence, never a pasted transcript.
- Never return tool results, hidden thinking, or metadata-only records as
  conversation matches.
- Unknown record shapes are skipped, because the host's internal transcript
  format may change.
- Say that history was used only when the answer depends on it, when it conflicts
  with current files, or when a failed search leaves a real gap.

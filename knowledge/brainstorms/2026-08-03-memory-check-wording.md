# How the memory check reads (issues 112 and 113): Brainstorm / Discovery Notes

Date: 2026-08-03
Goal: Settle two tickets that both change how the memory check reads to Mike.
Issue 112 replaces the fixed four-field report block in `second-brain-rule.md`.
Issue 113 replaces the word "durable" across the toolkit.

Both were split out of ticket 104 during its interview on 2026-08-02. Both were
set to **Refining** at the start of this session.

## Summary / key decisions

Opened with a correction Mike raised himself: in the ticket 104 interview he was
asked how much detail he wanted to read, and was never shown that an existing
written rule already required four specific fields. He answered a preference
question without being told it was a decision to replace something. His words:
"why didn't you tell me that I would be overwriting my existing rule, which says
four?" So this session starts by showing him the current wording before asking
anything.

## Q&A log

### Q1: replacing the four-field block, with the current wording shown

- Asked: Mike was shown the exact rule he has today (destination, content, why
  it helps future work, any risky or large structural change) and asked whether
  he still wanted it replaced with one line per item, cut to two of the four, or
  left alone.
- Captured: **Keep the four fields exactly as they are. Issue 112 is closed.**
  He chose completeness over brevity once he could see what the four fields
  actually promise him. This reverses his answer to question 9 of the ticket 104
  interview on 2026-08-02, which was given without the current rule in front of
  him.
- Consequences for ticket 104, applied in this session:
  - The example of a one-line item is removed from "What you experience".
  - The decision "one line per item, more detail only if the owner asks" is
    removed from "Decisions made by the owner" and replaced with: the list
    follows the four fields the rule already requires.
  - Nothing about the hook itself changes. Ticket 104 already says the shape of
    the list lives in the rule, never in the hook, so the hook is unaffected.
- Flags: None

### Q2: what replaces the word "durable" (issue 113)

- Asked: Replace it with everyday words ("the memory check", "worth saving"),
  with "lasting", or show him the real sentences first?
- Captured: **Everyday words.**
  - "the durable-update review" becomes **"the memory check"**
  - "durable updates" becomes **"what is worth saving"**
  - "durable memory" becomes **"saved memory"**
- Flags: Other phrases exist that these three do not cover ("durable context",
  "durable value", "durable document"). Wording for those follows the same
  plain-words rule and is the writer's judgment, not a fixed table.

### Q3: which files get the rename (issue 113)

- Asked: Everything currently in use, absolutely everywhere including the
  history, or only the rules agents read?
- Captured: **Everything currently in use. Leave the history alone.**
  - Changed: `plugins/` (98 uses), `docs/second-brain-v3/` (69 uses in four
    files), `docs/toolkit-map.md` (10), and the top-level `README.md`,
    `CLAUDE.md`, and `AGENTS.md` (3).
  - Left alone: `archive/` (11), `docs/second-brain-v2/` (16), and
    `brainstorms/`. Those record what a retired system did or what Mike actually
    said, and editing a record makes it wrong.
- Flags: None

### Q4: completeness backstop

- Asked: Anything else about how these should read or behave that we have not
  covered? The question was badly worded and Mike said so: "what? what are you
  talking about? Am I supposed to read something". Restated plainly as "are we
  done".
- Captured: Done. Nothing further.
- Flags: None

## What happened after the interview

- **Issue #112 closed** as not planned. The four fields stay.
- **Ticket #104 updated** in three places to match: the example of a one-line
  item is gone, the "one line per item" decision is replaced with the four
  fields the rule already requires, and the split-out list marks #112 closed.
- **Issue #113 rewritten** with the wording, the file list, the three headings
  that need their pointers fixed, and the requirement that #104 lands first.
  Labelled `refined` and moved to **Ready**.
- Noted during write-up: the board label was renamed from `grill-me-completed`
  to `refined` while this session was running, which is why the first attempt to
  label #113 failed.

## Open flags (pending input)

- **None.** Both tickets are settled.

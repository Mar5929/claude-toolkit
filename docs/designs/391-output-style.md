# Output style content and delivery

Build plan for [#391](https://github.com/Mar5929/claude-toolkit/issues/391).
The issue owns requirements, approval, current tasks, and acceptance. Mike
authorized this focused implementation with GPT-5.6 Sol agents on 2026-09-22
in Codex task `01a0cb21-9aa3-7c90-b674-b58bfb1757c2`. Merge and acceptance
remain separate.

## Approach

Use the clear, natural replies Mike selected from that conversation as the
communication reference. Replace the existing Plain English wording with one
short, coherent account: answer the question, use ordinary words and connected
sentences, explain enough to avoid guessing, use lists when useful, and stop
when the answer is complete. Preserve the issue's approved constraints and
precise status reporting. Do not impose a word limit or fixed reply template.

Keep the silent per-message style read. Correct its wording and change its
mechanism only if inspection or a test demonstrates a defect. Do not add a
reply classifier, small-model judge, or new read-tracking state. The
[owner's design principle](../../knowledge/prds/toolkit-operating-system/toolkit-operating-system.md#design-principle-guide-the-agent-through-handshakes)
governs this work.

[#396](https://github.com/Mar5929/claude-toolkit/issues/396) owns the broader
instruction restructuring. Its current dependency on
[PR #398](https://github.com/Mar5929/claude-toolkit/pull/398) must be reconciled
before that PR is retired. Preserve its non-style changes until accounted for.
Review [PR #349](https://github.com/Mar5929/claude-toolkit/pull/349)'s intended
wording in the new style; do not restore its obsolete surrounding style.

## Files and responsibilities

- Content agent: the shipped `plain-english.md`, identical installed copy,
  and output-styles README. Correct delivery documentation against the official
  Claude Code output-styles page.
- Delivery agent: `style-handshake.mjs`, its installed copy, hook tests and
  hooks-library README. Preserve existing selection and silence behavior.
- Behavior agent: isolated temporary Claude fixtures and retained trial inputs,
  outputs, settings and Read events. No real project settings are changed.
- Coordinator: releases, affected explanations, tracker continuity, independent
  review and one focused pull request. Leave Terse and general startup,
  knowledge and rule rewrites outside this implementation.

## Validation

Compare current and candidate styles using the same questions and Claude model.
Use native style selection, inspect the actual style Read events, and retain
the exact outputs. Include a bounded multi-turn continuation. Evaluate clarity,
relevance, literal wording, understandable decisions and accurate status.
Word counts are observations, not pass/fail thresholds.

Run the style-hook tests, four repository checks and plugin validation.
Review the actual final diff independently with a GPT-5.6 Sol agent. Separate
script results, observed Claude behavior, deployment and Mike's acceptance.
A short test cannot prove long-session reliability or guarantee every reply.

## Notes

2026-09-22: Implementation started on `issue-391-style-delivery`. The local
Claude CLI is 2.1.271; tests must name that version. The earlier #398 audit
found a knowledge-manual acknowledgment conflict and a relative review-command
failure from nested folders. Those findings concern the broader knowledge
changes and remain outside this focused style implementation. Next: review
the candidate style and trial results, record old-PR coverage, and prepare
the focused PR without merging it.

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
  Claude Code output-styles page. Correct the artifact rule's attribution of
  wording that no longer appears in the style, keeping its artifact requirements.
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

## Prior pull requests

Keep [#392](https://github.com/Mar5929/claude-toolkit/pull/392) merged. The new
implementation revises its result without reverting unrelated work.

[#349](https://github.com/Mar5929/claude-toolkit/pull/349), head
`8afa546c2ceed14413eccb5672bb5732592653c6`, adds rhetorical-pattern guidance
to an obsolete version of the style. The replacement preserves its useful
meaning: state the point directly, avoid deny-then-correct framing and rhythmic
word pairs, and allow plain factual corrections. Do not merge its old style.

[#398](https://github.com/Mar5929/claude-toolkit/pull/398), head
`665d9eded865cc57f4e0fd9f9e651566be5f18ee`, supplies the clearer style-hook
wording and descriptive-header requirement. The focused replacement includes
both. Its remaining changes are preserved in that open PR: `memory-reminder`,
`knowledge-completion`, `toolkit-session-start`, installed copies, associated
knowledge tests, and release metadata. #396 must account for these changes
before #398 is retired; replacing its style changes does not complete that
handoff. In particular, reconcile the knowledge manual's acknowledgment rule
and the completion command's behavior from nested working directories.

## Validation record

On 2026-09-22, the four repository checks, 76 style-hook assertions, 12
toolkit-startup tests, plugin validation, and diff whitespace check passed.
GPT-5.6 Sol review found four corrections: concise-by-default wording, the
approved status-first and identifying-words instructions, artifact-rule
attribution, and the minimum version for `/output-style`. All four were fixed;
the follow-up source review passed. Final style: 431 words, SHA-256
`9114729f603d81799639123016ac6c0b35673d9d616a151b44e254514a299369`.
The source pass does not establish behavioral acceptance.

Both operating manuals were reviewed. Their style and silent-read explanations
still apply; this focused change needs no manual rewrite. The broader knowledge
acknowledgment conflict remains with #396's instruction work.

The first live trial used Claude Code 2.1.271, requested `opus` with low effort,
and reported `claude-opus-5`. An isolated temporary project selected Plain
English through native settings. The baseline hook ran and emitted hidden
context requesting the whole style file silently. Authentication failed before
the model ran: no Read event, assistant reply, comparison, or multi-turn result
exists. Reported cost and token counts were zero. A direct candidate-hook check
also emitted the silent-read request. These observations establish configuration
and hook emission only, not model receipt or adherence.

On retry, use separate temporary Git projects containing exact baseline and
candidate style/hook files, native `outputStyle` selection, Read-only tools,
project-only settings, no plugins or MCP servers, no persistent session, a
90-second timeout and a $0.30 per-run limit. Keep model, effort and questions
the same. Inspect the Read events and actual replies, including a bounded
two-turn continuation. Retain a sanitized observation table and actual reply
text; do not publish raw authentication/debug logs.

Fixed questions for the comparison:

1. Do function hooks work by having a small model judge the agent's work?
   Explain how they operate.
2. Issue #391 has approved requirements. The style content and hook wording
   are being implemented now. Behavior comparison and independent review still
   need to happen. The pull request has not been opened. So what is next?
3. The new hook has been built and merged, but it has not been tested in a fresh
   Claude Code chat. Is it done? What is its status?
4. For issue #391's behavior-test evidence, we can either commit the full raw
   Claude event streams, including usage and session metadata, or commit a short
   redacted observation table and keep the raw streams out of Git. What am I
   deciding, and which option do you recommend?

For the two-turn test, supply the documented facts about UserPromptSubmit,
stdin event JSON, hidden `additionalContext`, the silent whole-file Read
request, and native per-request style delivery. Ask why both forms of delivery
are used, then ask, "What should I remember from that?" Assess style separately
from unsupported factual claims; these trials cannot establish long-session
reliability or replace Mike's acceptance.

## Notes

2026-09-22: Implementation started on `issue-391-style-delivery`. The local
Claude CLI is 2.1.271; tests must name that version. The earlier #398 audit
found a knowledge-manual acknowledgment conflict and a relative review-command
failure from nested folders. Those findings concern the broader knowledge
changes and remain outside this focused style implementation. Mike said he
will sign in to Claude so behavior tests can continue. Next: retry live tests
after sign-in and prepare the focused PR without merging it. Keep #349 and #398 open until
the replacement and the remaining #398 handoff are accounted for.

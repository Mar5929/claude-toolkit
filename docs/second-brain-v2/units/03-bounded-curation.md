# Unit 03: proactive knowledge review and apply

> Historical only. V3 has no numbered implementation units and does not inherit
> this unit. Read [`docs/second-brain-v3/`](../../second-brain-v3/README.md).

Status: proposed. Depends on Unit 02.

## Outcome

Make the main agent proactively preserve worthwhile project knowledge without
requiring the owner to remember `/remember` or paying for curator subagents.

## Automatic trigger

After verification and before the final response for substantial work, the
active main agent performs a lightweight knowledge review. It also performs the
review when the owner signals that the current task, project, or working
session is ending.

Simple questions and minor edits may skip a visible review. A substantial task
with no candidates reports that no durable updates are recommended.

## Response contract

The final task response separates:

1. specification and memory changes already incorporated with approved work;
2. up to five additional proposals that have not been written.

Each additional proposal states the proposed knowledge, classification,
canonical target file, lifecycle operation, evidence, and why a future agent
will need it.

The agent does not propose raw transcripts, routine code narration, temporary
debugging steps, unverified hypotheses, duplicate facts, or speculative
decisions.

## Owner-controlled apply

Ordinary language controls the proposal set:

- `yes go` applies all proposals;
- `1 only` or another selection applies only the named proposals;
- `edit 2 to say...` revises a proposal before it is applied; and
- `skip` applies none.

Until approval, proposals exist only in the conversation. After approval, the
same main agent checks the canonical home, duplicates, contradictions, and
lifecycle links, then applies the exact Git changes and runs validation.

`/remember` remains an optional explicit entry point to the same workflow. It
is not a required step after normal work.

## Mid-task requirement changes

When the owner changes desired behavior during a chat, the agent locates the
active requirement and classifies the change as a clarification, compatible
extension, reversal, or ambiguity. It shows any material behavior delta.

A clear instruction to implement the new behavior approves the related in-scope
specification update. Compatible changes revise the active requirement. True
reversals create a successor and mark the predecessor superseded. Requirement,
code, and tests change together.

## Cost and scope limits

- no curator subagent;
- no additional model call;
- no per-turn extraction;
- no transcript ingestion;
- no broad repository sweep;
- no scheduled AI maintenance;
- at most five additional proposals; and
- deterministic search, validation, and optional index refresh only.

## Acceptance tests

- Replay the one-line Calendar scenario with zero extra model calls and no
  curator subagent.
- A substantial task automatically produces incorporated updates, proposals,
  or an explicit no-update result.
- `yes go`, selection, editing, and skipping apply exactly the requested set.
- A clear mid-chat reversal updates the successor requirement, code, and tests
  in one change.
- A skipped proposal leaves no repository artifact.
- A mechanical change can produce no recommendations without error.

## Issues covered

#51, #57, #58, #60, #61, and the curator-cost post-mortem.

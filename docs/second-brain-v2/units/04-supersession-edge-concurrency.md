# Unit 04: lifecycle, supersession, and Git concurrency

> Historical only. V3 has no numbered implementation units and does not inherit
> this unit. Read [`docs/second-brain-v3/`](../../second-brain-v3/README.md).

Status: proposed. Depends on Unit 02.

## Outcome

Prevent obsolete requirements, reversed decisions, and overlapping Git edits
from silently presenting multiple versions of current truth.

## Lifecycle rules

- A compatible clarification may revise the existing active record.
- A material reversal creates a successor, marks the predecessor superseded,
  and links both records in the same Git change.
- A correction identifies the incorrect claim and its replacement.
- A changed premise marks known dependents stale or review-required until they
  are confirmed or revised.
- Default retrieval excludes proposed, superseded, stale, and retired records
  from current answers.
- Validators reject missing predecessors, broken successor links, duplicate
  active successors, and lifecycle cycles.

History remains in Git. The current file state must make the active answer
obvious without requiring an agent to reconstruct an entire commit history.

## Relationship rules

Structured records declare their complete intended link set. Validation checks
that every local target exists and that relationship types are allowed for the
record class.

Generated indexes rebuild relationships from the Git records. They do not own
independent edges that can outlive a removed or changed source link.

## Concurrency

Normal repository and worktree isolation rules govern concurrent writers:

- each task works on its own branch and worktree when parallel sessions are in
  use;
- the agent applies related requirement, decision, code, and test updates in
  one change;
- validation runs against the final merged tree;
- merge conflicts are resolved with owner-visible source evidence; and
- no agent silently overwrites a concurrent knowledge change.

If two branches create competing active successors, validation blocks the
merge until one lifecycle is approved. No server revision counter or advisory
lock is required.

## Undo

Undo uses normal Git revert or a new corrective change. Reverting must restore
the complete affected lifecycle and links, then run validation. The original
history remains auditable.

## Acceptance tests

- Superseding an active requirement removes it from default current retrieval.
- Replacing links A and B with B and C removes A after index rebuild.
- Two branches that create competing active successors fail merged-tree
  validation.
- A failed multi-file update is not reported as applied.
- Correcting a premise makes known dependents visibly review-required.
- Reverting a knowledge change reproduces the prior validated state.

## Issues covered

#57 and #58, plus the active-old-decision, append-only-edge, and concurrent
curation defects found during the architecture audit.

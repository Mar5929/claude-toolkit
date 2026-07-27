# Unit 09: verification and cost gates

Status: proposed. Applies to every unit.

## Outcome

Turn the architecture into release gates that protect correctness, retrieval
quality, simplicity, and cost.

## Test layers

1. Pure tests for configuration, metadata schemas, lifecycle transitions,
   content hashes, budgets, redaction, and link validation.
2. Repository-fixture tests for fresh clones, wrong project ids, concurrent
   branches, merged-tree conflicts, Git receipts, and rollback.
3. Workflow tests for Claude and Codex startup, proactive review, natural
   language approval, `/remember`, and no-op tasks.
4. Retrieval tests for deterministic routing, exact search, optional full-text
   search, optional semantic search, and honest abstention.
5. Failure tests for missing files, malformed config, stale indexes, unavailable
   external authorities, partial file edits, and validation failure.
6. Fresh-start adoption and fresh-clone restore tests.
7. Scope-isolation tests for project profiles that separate clients or data
   domains.

## Mandatory regression scenarios

- A copied memory folder declares the wrong project id.
- A current requirement receives a compatible mid-chat clarification.
- A current requirement is materially reversed twice.
- Requirement links shrink as well as grow.
- Two branches create competing active successors.
- An applied multi-file change fails validation and is not reported as
  successful.
- Stale knowledge has the strongest semantic similarity.
- The optional index is missing, stale, corrupted, and then rebuilt.
- A fresh clone has no database or embedding model.
- A fresh-start adoption does not read or import any v1 source.
- A substantial task produces no worthwhile proposal.
- `yes go`, selection, editing, and skipping each apply the exact intended set.
- A rejected proposal leaves no Git artifact.
- A task exceeds 40 turns without per-turn memory capture.
- The 2026-07-25 one-line Calendar scenario is replayed.

## Cost gates

Per substantial task wrap-up:

- no curator subagent;
- no extra model call;
- at most five additional proposals;
- no transcript ingestion;
- no repository-wide AI sweep;
- deterministic search and validation only;
- optional index refresh only when configured; and
- visible completion or visible no-update result.

Per session:

- automatic startup context at most 1,500 tokens by default;
- initial task-specific retrieval at most 4,000 tokens by default;
- no recall on every prompt;
- each document revision injected at most once when session deduplication is
  available; and
- pointer results before full bodies.

Default installation footprint:

- no remote memory service;
- no database process;
- no embedding model download;
- no scheduled curation job; and
- no custom project curator agent.

Projects that enable optional indexing must record measured retrieval benefit,
rebuild time, disk usage, and query latency. Embeddings require a separate
explicit decision.

## Release evidence

Each implementation pull request attaches:

- test commands and results;
- example configuration or record changes;
- failure-injection results;
- measured token, tool-call, latency, and optional disk totals;
- fresh-start rollout and rollback notes when applicable; and
- the requirement identifiers it satisfies.

`Codex plugin validate .` must remain green for every toolkit change. A pilot
project must also complete its own build, test, and retrieval gates.

## Exit criterion

V2 is not production-ready until every mandatory scenario passes, a fresh clone
recovers all authoritative knowledge, and the Calendar cost regression cannot
recur in normal wrap-up. Documentation-only claims do not satisfy a gate.

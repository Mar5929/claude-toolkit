# Second-brain v2 technical specification

Status: superseded historical proposal. Do not implement these requirements.

The owner replaced this proposal with the fresh
[second-brain v3 specification](../second-brain-v3/README.md). V3 inherits
nothing from this folder unless the v3 specification states it directly. The
remaining files are retained temporarily so the abandoned design is visible
during review, not because it is approved work.

This folder is the implementation specification for replacing the retired v1
memory and knowledge system. It is deliberately separate from
`plugins/second-brain/`, which currently provides only retirement controls.
Nothing in this folder should be read as a claim that v2 is installed.

## Why the rework exists

The current design has useful ideas, but too many correctness and cost controls
exist only as instructions to agents. In production use it has:

- returned another project's memory in the wrong session;
- hidden working, skipped, and failed operations behind the same silence;
- relied on connector display names as project identity;
- left writes, fallback delivery, review sweeps, backups, and restore unproved;
- allowed stale nodes and relationships to remain authoritative;
- spent roughly 9.8 million processed tokens and 10.5 minutes on two curator
  subagents after a one-line code change; and
- claimed automatic session curation could recover the same conclusions even
  though the real capture hook sends metadata and a local transcript path, not
  conversation content the remote Worker can read.

The requirements baseline is GitHub issue #50 and its linked issue batch
(#51 through #62). The measured cost baseline is the 2026-07-25 Anchor curator
cost post-mortem.

## Target in one paragraph

V2 is a Git-native project knowledge system. Authoritative app and system
requirements remain under `specs/`. Other durable project knowledge lives in
typed folders under `memory/`, including context, decisions, implementation
knowledge, references, domain knowledge, and operations. The main agent
automatically performs a bounded end-of-task knowledge review and recommends at
most five worthwhile additional updates. The owner can say `yes go`, select or
edit proposals, or skip them. `/remember` remains an optional alias for the
same approved Git workflow. A small router and current-state briefing guide
deliberate retrieval under hard context budgets. No database is required.
Optional SQLite search and dependency graphs are disposable artifacts rebuilt
from Git, never independent sources of truth.

The separate `work-tracker` plugin owns backlog, task status, blockers,
work-item relationships, branch and pull-request evidence, and current
handoffs. V2 may link durable knowledge to work-item IDs, but it does not copy
or manage task status. A connected GitHub Project is a work-tracker mirror.

The [high-level technical architecture](TECHNICAL-ARCHITECTURE.md) supersedes
the earlier remote-ledger direction. The detailed units now break that
architecture into implementable work.

V2 starts fresh from authoritative Git content. Legacy v1 Neon memories are not
an input, evidence source, or migration source for v2. The live Worker and Neon
resources remain untouched until the owner separately approves their deletion.

## Documents

- [Technical architecture](TECHNICAL-ARCHITECTURE.md): the target system,
  boundaries, data model, APIs, trust model, runtime flows, budgets, and major
  decisions.
- [ADR-001: Git-native specifications and typed project memory](decisions/ADR-001-git-native-typed-memory.md)
- [Unit 00: retire the current system](units/00-current-system-retirement.md)
  (retirement implemented in toolkit behavior; no live operation authorized)
- [Unit 01: project identity, configuration, and health](units/01-store-identity-and-health.md)
- [Unit 02: Git schemas, provenance, and change receipts](units/02-schema-provenance-write-receipts.md)
- [Unit 03: proactive knowledge review and apply](units/03-bounded-curation.md)
- [Unit 04: lifecycle, supersession, and Git concurrency](units/04-supersession-edge-concurrency.md)
- [Unit 05: routing, retrieval, and optional index](units/05-digest-retrieval.md)
- [Unit 06: repository knowledge layer](units/06-repo-knowledge-layer.md)
- [Unit 07: backup, retention, and restore](units/07-backup-retention-restore.md)
- [Unit 08: fresh-start rollout and rollback](units/08-fresh-start-rollout.md)
- [Unit 09: verification and cost gates](units/09-verification-cost-gates.md)

## Implementation order

1. Retire v1 and remove its active toolkit paths.
2. Install the project layout, configuration, and validators.
3. Implement record schemas and lifecycle validation.
4. Implement proactive review and owner-controlled apply.
5. Implement deterministic routing and retrieval.
6. Add optional disposable indexing only after the core works without it.
7. Add fresh-start rollout, restore, and full verification gates.

## Non-goals

V2 does not try to remember every session, duplicate every project document,
infer structural dependencies from prose, replace issue trackers, or create a
self-improving agent. Completeness is subordinate to correctness. A missing
memory is acceptable; an authoritative wrong memory is not.

## Decision gates for the owner

Mike has approved these high-level decisions:

1. Git is the canonical home for durable project memory.
2. Authoritative requirements stay under `specs/` and preserve detailed
   behavior, edge cases, and data-preservation rules as they evolve.
3. Other durable project memory is organized into typed folders under
   `memory/`.
4. The main agent automatically recommends worthwhile additional knowledge
   updates at the end of substantial work.
5. `yes go` applies all proposals; selection, editing, and skipping are also
   supported. `/remember` is optional.
6. Normal wrap-up does not use curator subagents, per-turn model capture, or
   scheduled AI curation.
7. The default system requires no database or embedding model. Any index is a
   disposable local artifact rebuilt from Git.
8. V1 is retired. No v1 deployment, export, or memory import will occur.
9. V2 starts only from authoritative content already committed to Git.
10. Existing Worker and Neon resources remain untouched until separately
    approved for deletion.

The exact configuration schema, requirement-file granularity, optional index
thresholds, and traceability strictness remain implementation decisions.

# ADR-001: Git-native specifications and typed project memory

Status: accepted for the v2 technical specification.

## Context

The current second-brain can accumulate stale or incorrect claims, return the
wrong project's content, and spend extreme token budgets on curator work. A
review of the Davis Advisors project showed useful routing, provenance, source
authority, and rebuildable-index patterns, but also showed how repeated
summaries and unenforced current-focus files become bloated. Agentic OS showed
useful search provenance, index health, and retrieval testing, but its per-turn
capture and default semantic infrastructure are too heavy for the core.

The owner wants detailed system requirements to remain available to future
agents, wants requirements to evolve safely, and does not want to invoke
`/remember` after every task.

## Decision

1. Authoritative desired behavior lives in Git under `specs/`.
2. Other durable project memory lives in typed folders under `memory/`:
   `context/`, `decisions/`, `knowledge/`, `references/`, `domain/`, and
   `operations/`.
3. `memory/README.md` and `memory/config.yaml` route agents without duplicating
   canonical bodies.
4. The default system uses deterministic routing and repository text search. It
   requires no remote memory service, database, embedding model, transcript
   capture, scheduled AI curation, or project curator agent.
5. A disposable local index may be enabled only when measured project needs
   justify it. Git remains authoritative and deleting the index loses no truth.
6. The active main agent automatically performs a bounded knowledge review at
   the end of substantial work.
7. Approved in-scope requirements are updated with the code and tests. Up to
   five additional proposals remain in the conversation until the owner says
   `yes go`, selects or edits proposals, or skips them.
8. `/remember` remains an optional alias for the same owner-controlled Git
   workflow.

## Consequences

Future agents can recover the project from a fresh clone and inspect why a
claim is current. Git review and lifecycle validation reduce the chance that
stale decisions silently compound.

The system intentionally remembers less than an automatic transcript archive.
Agents must retrieve deliberately, and projects with very large knowledge sets
may later choose an optional index.

The proactive review depends on shared Claude and Codex workflow instructions.
Mechanical validators enforce structure and budgets, while scenario tests
verify that both agent surfaces follow the conversational behavior.

## Rejected alternatives

- Remote database as the canonical memory store.
- Per-turn memory extraction.
- Raw transcript retention as normal project knowledge.
- Daily or weekly AI curation.
- Mandatory PGLite, embeddings, or a large local model.
- Silent automatic knowledge writes, commits, or pushes.
- Project-specific background curator agents.

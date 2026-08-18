# Memory System v2 Design Handoff

**Date:** 2026-08-18
**Status:** Owner review in progress. Several major decisions are approved and recorded. The tracker-only continuity wording has been corrected to the memory-owned design. Project scope and privacy is the next open decision.

## Purpose

Continue the memory-system v2 design review on another computer without relying on this conversation or a machine-local session history.

The work compares the current toolkit design with two ChatGPT reports, research into leading memory systems, and an adversarial review. The result should be one approved functional-requirements document and one master technical architecture with explicit ADRs and acceptance tests.

## Read these files first

1. [`work-items/memory-redesign/functional-requirements.md`](work-items/memory-redesign/functional-requirements.md)
2. [`work-items/memory-redesign/memory-system-v2-master-technical-architecture.md`](work-items/memory-redesign/memory-system-v2-master-technical-architecture.md)
3. [`work-items/memory-redesign/chatgpt-reports/universal-project-memory-system-functional-requirements.md`](work-items/memory-redesign/chatgpt-reports/universal-project-memory-system-functional-requirements.md)
4. [`work-items/memory-redesign/chatgpt-reports/universal-project-memory-system-technical-spec-and-adrs.md`](work-items/memory-redesign/chatgpt-reports/universal-project-memory-system-technical-spec-and-adrs.md)

The older drafts, original design, and whiteboards were moved under `work-items/memory-redesign/archive/`. They are historical inputs, not current authority.

## Owner goals and boundaries

- Every toolkit project gets the memory system by default, regardless of project type.
- The owner can remove the memory system without breaking the rest of the toolkit or deleting project-owned material.
- The system must work for software, Salesforce, research, client delivery, health, and other projects.
- Approved project knowledge remains human-readable, portable, and versioned.
- Do not make SQLite, embeddings, a vector store, a graph, or a provider the source of truth.
- Do not copy transcripts or automatically save every action.
- Do not generate session summaries from full conversation history.
- The owner can explicitly say "record what we just did" after meaningful work.
- External research remains reference material until an approved project record, decision, specification, rule, or skill links to it.
- Use ordinary relative Markdown links. Backlinks are derived by direct project search rather than stored in a second registry.

## Approved design decisions already recorded

### Retrieval

- V2 searches canonical project files directly by exact id, path, metadata, and project-scoped text search.
- V2 has no SQLite full-text index, embeddings, vector store, graph search, retrieval provider, cache, working-set file, or retrieval metrics store.
- A later accelerator requires a new owner-approved ADR based on measured project failures, stale-result prevention, privacy, purge, outage, and project-isolation proof.

### Durable data model

- The four durable record types are facts, decisions, events, and patterns.
- Each record holds one independently correctable or supersedable meaning, not one sentence per file.
- Facts show their truth state, such as documented, observed, reported, inferred, suspected, or unknown.
- Additional sources supporting unchanged meaning become evidence on the same record.
- Conflicting meanings stay separate, keep their own evidence, and link to each other.
- Reusable source, entity, and relationship records are optional and created only when reuse or ambiguity justifies them.
- Project ADRs live in the decisions area unless an existing project already has an authoritative ADR home.

### Required project structure

The approved core is:

```text
project/
  AGENTS.md
  CLAUDE.md
  knowledge/
    project.md
    current.md
    map.md
    specs/
    memory/
      facts/
      decisions/
      events/
      patterns/
```

- Rules, skills, trackers, delivery areas, references, and source folders remain in their existing project-owned locations and are mapped through `knowledge/map.md`.
- A separate identity file is optional.
- Domain profiles add only needed fields, routes, validation, and privacy warnings. They cannot weaken the common safeguards.
- `.memory/` is absent during normal reads and may exist temporarily for an approved write lock or recovery journal.

### Work recaps

- An explicit "record what we just did" can save one concise event for material completed work directly observed by the main agent.
- It records when the work happened, the exact tool or system, searchable wording, what was done, the result, and evidence links.
- It does not copy a transcript, raw command log, routine tool use, or hidden reasoning.
- Unclear scope, unverified outcomes, or multiple separately meaningful events use the normal owner review.

### Research-spike documentation

- A lasting report from a research-only or spike work item moves to the project's mapped reference area.
- The editable report is the source for generated reading copies such as a PDF.
- Raw queries, working notes, and work-item evidence stay with the original work item.
- The work item and reference package link to each other.
- Unreviewed research may be stored as a visibly unreviewed reference.
- Storage does not make the research an approved decision, fact, or specification.
- Later work links to the research instead of copying it.
- Dragonfly's monday.com connector research at `engagement/references/monday-com-salesforce-connector/` is the concrete example.

### Session history

- Native Claude, Codex, Kimi, Hermes, or other host history stays read-only in its original host-owned location.
- It is searched only when the owner asks or current project sources are insufficient.
- Missing local history never blocks project memory.
- A result for exact wording must link back to the original host session and message location.
- The system creates no transcript copy, transcript index, session card, or generated session summary.

## Continuity correction, applied

The earlier documents made the configured tracker the only cross-machine owner of
current state and handoff. The owner rejected that dependency because projects may use
GitHub Projects, ClickUp, Jira, repository work items, another system, or no tracker.

The approved direction is now recorded across both current documents:

- The memory system owns `knowledge/current.md`.
- Every new session automatically receives a short current-and-recent briefing.
- That briefing works when no tracker exists.
- A tracker adapter may contribute links and ticket status when available, but it is
  optional, and its absence is a supported configuration rather than a degraded one.
- The recent section comes from approved facts, decisions, events, and patterns, not
  from captured transcripts.
- The agent does not read every project file at startup.

Maintenance is hybrid. The memory system updates `knowledge/current.md` during an
explicit handoff, an approved current-focus change, or an owner-requested work recap.
A deterministic startup assembler then reads that file, the pinned records, and the
dated summaries of recently approved records, and renders a bounded briefing. Startup
is read-only, never rewrites `knowledge/current.md`, and shows a dated stale warning
rather than inventing current state.

Do not reopen whether an automatically injected short-term briefing is wanted. It is
wanted, and it is now recorded.

### What changed, by location

In `work-items/memory-redesign/functional-requirements.md`:

- FR-010 searches the current-state record before choosing a home.
- FR-012 splits ticket-level tracker state from current focus.
- FR-030 routes active-work questions to the current-state record first.
- FR-102 gives `knowledge/current.md` ownership of current focus, blockers, the exact
  next step, and the authored handoff.
- FR-103 makes cross-machine continuity work without any tracker.
- FR-108 makes the tracker adapter optional and additive.
- FR-109 limits updates to handoff, approved focus change, and work recap.
- FR-110 requires the automatic, read-only, bounded briefing.
- FR-111 requires a dated stale warning.
- The closing acceptance-style bullets describe a project with no tracker.

In `work-items/memory-redesign/memory-system-v2-master-technical-architecture.md`:

- Principle 3, the authority table in section 6, and the authority bullets name
  `knowledge/current.md` as the owner of current focus.
- The required tree in section 7 and the core bullets in section 7.1 add
  `knowledge/current.md`.
- Section 8 adds a current-state maintainer and marks the tracker adapter optional.
- Section 9 adds `current_max_age_days` and marks the tracker block optional.
- Section 10.2 builds the handoff and current blocks from `knowledge/current.md`.
- Section 10.5 defines the missing-file, stale-file, and no-tracker behaviors.
- Section 10.6 is rewritten as memory-owned continuity.
- Sections 13.1, 15.1, 15.2, 15.6, and 19 route through the current-state record.
- ADR-006 is now "Memory owns current focus, the tracker owns tickets".
- ADR-032 is now "knowledge/current.md owns cross-machine continuity".
- AT-35 and AT-36 are rewritten. AT-39 through AT-42 are new.
- Traceability rows for FR-010, FR-012, FR-102, FR-103, and FR-108 through FR-111.

## What the external research showed

Leading systems generally build short-term context from their own message, event, or memory stream rather than depending on a work tracker:

- [Honcho](https://honcho.dev/docs/v3/documentation/features/get-context) combines summaries, recent messages, and conclusions within a token limit.
- [Mem0](https://github.com/mem0ai/mem0/blob/main/docs/core-concepts/memory-operations/add.mdx) extracts memories from conversation messages scoped by user or run.
- [Hindsight](https://github.com/vectorize-io/hindsight) retains timestamped facts and experiences, then recalls or reflects over them.
- [Graphiti](https://github.com/getzep/graphiti) ingests timestamped episodes and maintains temporal facts.
- [memsearch](https://github.com/zilliztech/memsearch/blob/main/docs/home/configuration.md) captures daily conversation logs and can maintain a project summary of active threads, decisions, risks, and next steps.
- Hermes and Kimi primarily preserve and resume native local sessions.

Most of those systems capture far more conversation data and allow more automatic derivation than this project permits. Copy the memory-owned activity-stream pattern, not their transcript capture, database authority, or background promotion behavior.

## Research process completed

Separate research reviews covered:

1. retrieval;
2. durable data model;
3. project structure;
4. session continuity;
5. startup context; and
6. scope and privacy.

The frameworks reviewed were Hindsight, memsearch, Mem0, Zep and Graphiti, Claude Code, Codex, Kimi, Hermes, and Honcho. Honcho is the correct name. Do not substitute Poncho.

An adversarial review recommended keeping v2 smaller: direct file search, no retrieval database, no provider seam, no copied transcripts, and no generated session summaries. Its tracker-only continuity recommendation was later rejected for the reason explained above.

## Commits created during this design session

```text
f259a5c Update memory v2 project structure requirements
9dd78e8 Add owner-requested work recaps
ce9d30b Record direct Markdown retrieval architecture
4f35248 Define project links and derived backlinks
d92190b Define the durable memory data model
d86cfa9 Record the minimal project structure
a4e8de0 Define research-spike reference storage
ed99ac2 Define tracker-owned session continuity
```

The last commit contains the tracker-only wording that must be corrected. Preserve its valid native-history decisions while replacing its tracker dependency.

## Current document counts

- 111 functional requirements, FR-001 through FR-111.
- 32 ADRs, ADR-001 through ADR-032.
- 42 acceptance tests, AT-01 through AT-42.

All three sets are contiguous and free of duplicates.

## Known gap, pre-existing

FR-074 through FR-081, the work-recap requirements, have no rows in the section 24
traceability table. That gap arrived with commit `9dd78e8` and is not caused by the
continuity correction. Close it during the final consistency review.

## Files whose status is unclear

`work-items/memory-redesign/memory-system-v2-master.md` and
`memory-system-v2-master2.md` still sit beside the two current documents and were last
touched by the owner. They also carry the old tracker wording. They were left unchanged
because the owner has not said whether they are current, superseded, or should move to
`archive/`. Settle this before the final consistency review.

## Remaining major decisions

1. Decide project scope and privacy, including physical project-root enforcement, monorepo subroots, and sensitive health or personal projects.
2. Reconcile any older startup, pin-storage, generated-view, and fixed 10 KB language with the approved minimal structure and continuity design.
3. Settle the status of the two master files named above.
4. Run a final adversarial consistency review across all requirements, ADRs, acceptance tests, and traceability rows, including the FR-074 through FR-081 gap.
5. Only after the architecture is fully approved, create implementation work items.

## Validation baseline

Before this handoff, the design branch passed:

- complete and unique FR, ADR, and AT numbering;
- `node tests/link-check.mjs`;
- `node tests/orphan-check.mjs`; and
- `node tests/installed-copy-check.mjs`.

Run those checks again after correcting continuity and after any merge that changes shared files.

## Starting on the other computer

1. Pull `origin/main`.
2. Read this handoff and the two current design documents.
3. Confirm the listed design commits are present.
4. Continue with project scope and privacy. The continuity correction is done.

# Universal Project Memory System — Functional Requirements

**Status:** Proposed baseline requirements
**Version:** 1.0
**Date:** 2026-08-18
**Applies to:** Software repositories, client projects, personal projects, research knowledge bases, and longitudinal personal health repositories.

---

## 1. Purpose

This document defines **what the Universal Project Memory System must do**. It is intentionally implementation-independent.

The system exists to give AI agents durable, inspectable, project-scoped continuity across sessions without turning model-generated summaries into an uncontrolled source of truth.

A compatible implementation must allow an AI agent such as Claude Code or Codex to enter a project with no prior conversation context and quickly understand:

- who it is and what role it serves;
- what project it is in;
- what the project is trying to accomplish;
- what is currently happening;
- what happened recently;
- where different classes of information belong;
- what historical knowledge exists;
- how to retrieve deeper context;
- how to preserve provenance and historical change;
- how to write new memory safely;
- when **not** to create memory.

The core behavioral principle is:

> **Orient every session, preserve evidence, store durable knowledge selectively, retrieve progressively, and never let autonomous summarization silently rewrite history.**

---

## 2. Definitions

### 2.1 Canonical information

Human-inspectable information that is treated as the durable source of truth for its class.

Examples:

- active specifications;
- approved architectural decisions;
- durable facts;
- user-reported health events;
- original source documents.

### 2.2 Derived information

Information generated from canonical records for convenience or orientation.

Examples:

- `CURRENT.md`;
- `RECENT.md`;
- weekly digests;
- session summaries;
- generated timelines;
- search indexes.

Derived information must never silently become authoritative evidence.

### 2.3 Specification

Normative information describing **what should be true**.

Examples:

- business requirements;
- product requirements;
- API contracts;
- acceptance criteria;
- current architecture specifications;
- roadmap definitions.

### 2.4 Memory

Durable historical or contextual information describing **what happened, what is known, what was decided, why it was decided, or how a meaningful state changed over time**.

### 2.5 Meaningful event

A project- or domain-level occurrence that materially changes historical state and would still be useful to a future collaborator.

A meaningful event is **not** routine AI execution telemetry.

### 2.6 Session evidence

Conversation/session material used for continuity or as a fallback source when curated knowledge does not contain an answer.

### 2.7 Procedural knowledge

Knowledge describing **how to perform a repeatable activity**.

### 2.8 Rule

An instruction describing **how an agent should behave**.

### 2.9 Provenance

Information identifying where a memory or assertion came from and how to recover its source evidence.

---

# 3. Functional Requirement Summary

A compliant system MUST provide the following major capabilities:

1. deterministic session orientation;
2. agent identity and operating contract;
3. project map and information-location awareness;
4. strict separation of specs, rules, context, memory, procedures, and sessions;
5. structured durable memory types;
6. provenance and epistemic status;
7. temporal history with supersession and retirement;
8. selective memory writes;
9. hybrid and progressive retrieval;
10. session-summary and transcript fallback;
11. derived current-state and recent-context views;
12. provider-independent memory tools;
13. project isolation and privacy controls;
14. health-specific contextual-pattern handling;
15. explicit failure behavior when evidence cannot be found.

---

# 4. Session Bootstrap and Orientation Requirements

## FR-BOOT-001 — Every project must have an agent operating contract

Every memory-enabled project MUST contain a vendor-neutral `AGENTS.md` or equivalent operating contract.

It MUST communicate at minimum:

- required startup behavior;
- information hierarchy;
- memory retrieval rules;
- memory write rules;
- rule-loading behavior;
- high-level tool availability;
- instructions not to invent project history.

### Acceptance criteria

A new compatible agent can read the root operating contract and identify where to find identity, current state, project map, specs, durable memory, and session history.

---

## FR-BOOT-002 — Claude-specific entrypoint must remain thin

Projects using Claude Code MUST have a `CLAUDE.md` when needed for automatic Claude project instructions.

`CLAUDE.md` SHOULD remain a thin vendor-specific entrypoint and SHOULD delegate shared behavior to the vendor-neutral project contract and canonical startup files rather than duplicating large instruction blocks.

---

## FR-BOOT-003 — Every project must have a SOUL file

Every memory-enabled project MUST contain `SOUL.md`.

`SOUL.md` MUST define:

- the persistent role of the agent;
- why the agent exists in the project;
- who it serves;
- stable reasoning/behavioral priorities;
- stable epistemic principles;
- what the agent must not lose sight of.

`SOUL.md` MUST NOT contain transient task state, temporary blockers, or a detailed project history.

---

## FR-BOOT-004 — SOUL must be read every session

Every compatible agent session MUST receive or read the contents of `SOUL.md` before substantive project work begins.

The system MAY accomplish this through native instruction-file imports, startup hooks, wrappers, or a mandatory first-read protocol.

---

## FR-BOOT-005 — Every session must know project identity and purpose

At session startup, the agent MUST be able to determine:

- project ID;
- project name;
- project type;
- project purpose;
- target users or domain;
- primary technologies where relevant;
- current lifecycle phase;
- primary objective;
- major constraints.

---

## FR-BOOT-006 — Every session must understand the roadmap

The agent MUST receive a compact representation of the current project direction, including:

- current phase;
- current milestone;
- near-term objectives;
- important long-term direction;
- explicit non-goals when relevant.

The full roadmap SHOULD remain in the specification system and SHOULD NOT be fully injected on every session.

---

## FR-BOOT-007 — Every session must receive current-state context

The agent MUST receive a small derived current-state view describing, where applicable:

- current focus;
- active work;
- known blockers;
- recently completed meaningful work;
- likely next actions.

This current-state view MUST be marked as derived/non-authoritative.

---

## FR-BOOT-008 — Every session must receive recent continuity context

The agent MUST receive a compact recent-session synopsis sufficient to understand:

- what was recently being worked on;
- important recent discoveries;
- unresolved work;
- significant recently failed approaches worth not immediately repeating;
- handoff state.

This SHOULD normally cover only the smallest useful recent window.

---

## FR-BOOT-009 — Every project must expose a semantic directory map

Every project MUST expose a project map such as `context/MAP.md`.

The map MUST explain the purpose of major directories, not merely list filenames.

It MUST identify:

- where canonical specifications live;
- where durable memory lives;
- where rules live;
- where procedures live;
- where session evidence lives;
- where generated/derived state lives;
- which paths are safe to edit;
- which paths are generated or rebuildable.

---

## FR-BOOT-010 — Startup context must be bounded

The system MUST NOT preload the entire historical memory store.

Startup context MUST be deliberately small and SHOULD contain only:

- operating contract;
- SOUL;
- project orientation;
- roadmap summary;
- current state;
- recent synopsis;
- project map;
- memory/retrieval protocol;
- available memory tools.

Everything else MUST be retrieved on demand.

---

# 5. Information Classification Requirements

## FR-CLASS-001 — Specs and memory must remain separate

The system MUST maintain a clear distinction between:

- **specifications:** what should be true;
- **memory:** what happened, what is known historically, what was decided, and why.

An agent MUST classify new durable information before writing it.

---

## FR-CLASS-002 — Normative requirements belong in specs

The following SHOULD normally be stored in the specification system:

- finalized business requirements;
- feature requirements;
- acceptance criteria;
- API/interface contracts;
- current schema definitions;
- security requirements;
- current supported behavior;
- roadmaps;
- non-functional requirements.

---

## FR-CLASS-003 — Durable historical knowledge belongs in memory

The following SHOULD normally be stored in durable memory:

- durable facts;
- architectural/project decisions and ADRs;
- meaningful project/domain events;
- stable entity identities;
- relationships;
- historical state changes;
- source-attributed observations;
- important learned constraints or context not already represented normatively.

---

## FR-CLASS-004 — Rules must remain separate from facts

Detailed behavioral instructions MUST live in rules or procedures, not as factual memory.

Example:

- `rules/memory.md`: how to supersede memories;
- `memory/decisions/...`: the actual decision that was superseded.

---

## FR-CLASS-005 — Procedures must remain separate from history

Repeatable operational knowledge SHOULD live in a procedure/skill system.

Examples:

- release procedure;
- migration procedure;
- research workflow;
- health-document import workflow.

---

## FR-CLASS-006 — Session evidence must remain a separate epistemic tier

Session summaries and transcripts MUST NOT automatically become canonical memory.

They MAY be used for:

- continuity;
- provenance;
- discovery of candidate durable memories;
- transcript fallback during retrieval.

---

# 6. Durable Memory Type Requirements

## FR-MEM-001 — Facts

The system MUST support durable facts representing information expected to remain useful across sessions.

Facts MUST support provenance and lifecycle status.

---

## FR-MEM-002 — Decisions / ADRs

The system MUST support decision records containing, where available:

- decision;
- date/effective time;
- rationale;
- alternatives considered;
- authority/source;
- related evidence;
- linked specifications;
- predecessor/superseded decision.

---

## FR-MEM-003 — Meaningful events

The system MUST support dated meaningful events.

A durable event SHOULD represent a material project/domain state change.

Examples include:

- requirement change;
- client approval;
- release;
- major migration completion;
- production incident;
- important bug discovery;
- security event;
- architecture transition;
- health symptom onset or material change;
- diagnosis, procedure, treatment, imaging, or recovery milestone;
- important research finding or contradictory evidence.

---

## FR-MEM-004 — Agent telemetry must not become durable memory by default

The system MUST NOT create durable project memory for routine agent execution activity such as:

- files opened;
- grep/search calls;
- tool invocations;
- ordinary code edits;
- ordinary test runs;
- routine compiler errors;
- intermediate debugging attempts.

Agent activity MAY become durable memory only when it produces a meaningful project/domain outcome.

---

## FR-MEM-005 — Entities

The system MUST support stable entity identities used across records.

Examples:

- `authentication`;
- `client-acme`;
- `left-elbow`;
- `ulnar-neuropathy`.

Memories SHOULD reference stable entity IDs rather than relying only on free-text tags.

---

## FR-MEM-006 — Relationships

The system MUST support explicit relationships between entities, events, decisions, specs, and sources where useful.

Relationship type and epistemic certainty SHOULD be distinguishable.

---

## FR-MEM-007 — Patterns

For knowledge-base domains where recurring patterns matter, especially health, the system MUST support a first-class `pattern` or `self_observed_pattern` memory type.

A pattern MUST be distinguishable from:

- a diagnosis;
- a one-time event;
- an agent inference;
- a behavioral rule.

---

# 7. Provenance and Epistemic Requirements

## FR-PROV-001 — Provenance is mandatory for durable memory

Every durable memory MUST identify its source type.

Supported source categories SHOULD include at least:

- user statement;
- user-approved decision;
- client statement;
- client document;
- source code;
- Git commit;
- issue/PR;
- medical document;
- clinician/provider statement;
- web source;
- research paper;
- agent observation;
- agent inference;
- agent summary.

---

## FR-PROV-002 — Original evidence must be recoverable when possible

A durable memory SHOULD include sufficient provenance to recover original evidence, such as:

- file path;
- document ID/page;
- commit hash;
- URL/retrieval time;
- session ID/turn ID;
- source record ID.

---

## FR-PROV-003 — Epistemic statuses must remain distinguishable

The system MUST preserve distinctions such as:

- reported;
- observed;
- documented;
- diagnosed;
- approved;
- inferred;
- suspected;
- generated;
- unknown.

An agent MUST NOT silently promote a lower-certainty or inferred statement into an authoritative fact.

---

## FR-PROV-004 — Generated summaries are never primary evidence

Generated summaries MAY guide retrieval but MUST NOT be treated as the final evidentiary source for consequential historical claims when original evidence is available.

---

# 8. Memory Lifecycle Requirements

## FR-LIFE-001 — ADD

The system MUST support adding a new durable memory when genuinely new durable knowledge exists.

---

## FR-LIFE-002 — NOOP

The system MUST support intentionally doing nothing when information is:

- transient;
- already represented;
- insufficiently important;
- speculative;
- ordinary execution detail;
- better represented in another information layer.

Agents SHOULD be encouraged to choose NOOP frequently.

---

## FR-LIFE-003 — CORRECT

The system MUST support correcting an erroneous historical record while preserving auditability.

---

## FR-LIFE-004 — SUPERSEDE

The system MUST support superseding a previously valid memory without deleting it.

Supersession MUST preserve lineage so the system can reconstruct:

- previous state;
- current state;
- when the change occurred;
- why the change occurred when known.

---

## FR-LIFE-005 — RETIRE

The system MUST support retiring knowledge that is no longer active but remains historically meaningful.

---

## FR-LIFE-006 — DELETE

Deletion MUST be reserved for cases such as:

- accidental duplicate;
- corruption;
- privacy/data-removal requirement;
- intentionally purged sensitive information.

Changing reality SHOULD normally use supersession or retirement rather than deletion.

---

## FR-LIFE-007 — Temporal reconstruction

The system MUST be able to answer both current-state and historical-state questions when relevant.

Examples:

- What authentication architecture is active now?
- What did we use six months ago?
- What decision superseded the old design?

---

# 9. Memory Write Behavior Requirements

## FR-WRITE-001 — Classification before write

Before creating durable memory, the agent MUST determine whether the information belongs in:

- a spec;
- a rule;
- a procedure;
- current/recent derived context;
- a durable memory type;
- session evidence only;
- nowhere durable.

---

## FR-WRITE-002 — Durable memories must be atomic

Durable memory records SHOULD be small enough to:

- retrieve precisely;
- supersede independently;
- preserve clear provenance;
- avoid large synchronized rewrites.

The system SHOULD avoid giant all-purpose summary files as canonical memory.

---

## FR-WRITE-003 — Duplicate/history check

Before ADD, CORRECT, SUPERSEDE, or RETIRE, the agent SHOULD search for related existing records.

---

## FR-WRITE-004 — Inference must be explicit

Agent-created inference MAY be stored only if it is explicitly marked as inference and linked to the evidence on which it is based.

---

## FR-WRITE-005 — A simple update should cause a small write

A simple durable event SHOULD normally create or modify only the minimal canonical record plus derived index state.

It MUST NOT require manual synchronization across multiple summary files.

---

# 10. Retrieval Requirements

## FR-RET-001 — Progressive retrieval ladder

The system MUST implement a progressive retrieval protocol.

### Tier 0 — Startup context

Use already-loaded orientation/context first.

### Tier 1 — Direct structured lookup

Use known IDs/entities/spec IDs before fuzzy retrieval.

### Tier 2 — Curated hybrid search

Search specs/memory using keyword + semantic retrieval and metadata filters.

### Tier 3 — Relationship/temporal expansion

Expand through linked entities, predecessors, successors, nearby dates, superseded records, or related specs.

### Tier 4 — Session-summary search

Search summarized session evidence if curated knowledge is insufficient.

### Tier 5 — Raw transcript search

Search original session transcripts as a last evidence-recovery step.

### Tier 6 — Explicit failure

If reliable evidence still cannot be found, tell the user that the historical answer could not be recovered.

---

## FR-RET-002 — Hybrid retrieval

Curated knowledge search MUST support both:

- lexical/keyword retrieval;
- semantic/contextual retrieval.

The results SHOULD be fused/reranked rather than relying on only one retrieval method.

---

## FR-RET-003 — Metadata filters

Retrieval SHOULD support filters including, where applicable:

- project;
- memory type;
- entity;
- status;
- source type;
- date range;
- epistemic status;
- tags;
- spec linkage.

---

## FR-RET-004 — Search results must be concise

Initial search results MUST return small ranked snippets/metadata sufficient to decide which records to expand.

The system SHOULD NOT inject full source documents until requested or needed.

---

## FR-RET-005 — Retrieval must favor primary evidence as stakes rise

For consequential questions, the agent SHOULD progressively move from:

`search result → canonical record → provenance → original evidence`.

---

## FR-RET-006 — Specs and memory must be searched according to question intent

The agent SHOULD route:

- “What should the system do?” → specification search;
- “Why did we do this?” → decision/memory search;
- “What happened?” → event/timeline search;
- “What were we discussing?” → session search.

---

# 11. Session Evidence Requirements

## FR-SES-001 — Session summaries

The system SHOULD preserve concise session summaries for cross-session continuity.

These MAY be AI-generated and MUST be marked as derived/session evidence.

---

## FR-SES-002 — Raw transcripts

The system SHOULD preserve or index raw session transcripts when technically and legally appropriate.

Raw transcripts MUST be searchable as a fallback evidence layer but SHOULD NOT be auto-injected in full.

---

## FR-SES-003 — No automatic promotion

A session summary MUST NOT automatically become canonical memory solely because it was generated.

---

## FR-SES-004 — Candidate promotion

The system MAY identify candidate durable memories from sessions, but promotion MUST still follow the durable-memory classification, provenance, and lifecycle rules.

---

# 12. Derived Context and View Requirements

## FR-DER-001 — Current state is derived

The current-state document MUST be replaceable/regenerable and MUST NOT be the only record of historical decisions or events.

---

## FR-DER-002 — Recent context is derived

The recent-session synopsis MUST remain compact and replaceable.

---

## FR-DER-003 — Generated views

The system MAY generate:

- weekly/monthly digests;
- entity overviews;
- current-state summaries;
- timelines;
- recent-decision lists;
- active-constraint views.

Generated views MUST be identified as derived.

---

## FR-DER-004 — No summary synchronization tax

Canonical writes MUST NOT depend on updating every generated view.

Views SHOULD be regenerated on demand or asynchronously by the local tooling when appropriate.

---

# 13. Provider and Tool Requirements

## FR-TOOL-001 — Provider-independent interface

Agents MUST interact through a stable memory interface independent of the underlying search/index provider.

At minimum the interface SHOULD expose:

- `memory_search`;
- `memory_get`;
- `memory_add`;
- `memory_correct`;
- `memory_supersede`;
- `memory_retire`;
- `memory_delete`;
- `memory_related`;
- `memory_timeline`;
- `memory_sources`;
- `spec_search`;
- `spec_get`;
- `transcript_search`.

---

## FR-TOOL-002 — Provider replacement

Replacing a retrieval engine MUST NOT require redesigning canonical memory records or changing the semantic meaning of facts, events, decisions, patterns, provenance, or lifecycle state.

---

## FR-TOOL-003 — Index is rebuildable

Search/index state SHOULD be derivable from canonical files and session evidence.

Loss of the index MUST NOT mean loss of canonical knowledge.

---

# 14. Project Scope and Isolation Requirements

## FR-SCOPE-001 — Project scope

Every durable memory MUST be associated with a project/repository scope.

---

## FR-SCOPE-002 — Client isolation

A memory from one client project MUST NOT be retrieved into another client project unless explicitly authorized through a broader scope.

---

## FR-SCOPE-003 — Optional broader scopes

The system MAY support broader scopes such as:

- personal/global;
- organization;
- client;
- project;
- repository;
- branch;
- session.

Retrieval SHOULD begin with the narrowest relevant scope.

---

## FR-SCOPE-004 — No accidental global promotion

A project-specific fact MUST NOT be promoted to global preference or global truth without explicit justification.

---

# 15. Privacy and Security Requirements

## FR-SEC-001 — Local-first capability

The system MUST support a local-first deployment in which canonical memory, index state, and transcripts can remain on the user's machine.

---

## FR-SEC-002 — External processing must be explicit

If embeddings, summarization, or retrieval require external services, the configuration MUST make that fact inspectable.

Sensitive repositories SHOULD default to local embeddings/indexing where practical.

---

## FR-SEC-003 — Sensitive source control policy

The system MUST allow projects to configure whether session transcripts, derived indexes, health data, or other sensitive material are committed to Git or retained only locally.

---

# 16. Health Knowledge Base Requirements

## FR-HLT-001 — Health facts must preserve source type

The system MUST distinguish at minimum:

- user-reported symptom/observation;
- clinician-documented information;
- medical document;
- diagnosis;
- agent inference.

---

## FR-HLT-002 — Longitudinal events

Health symptom changes, treatments, procedures, imaging, diagnoses, medication changes, and meaningful recovery milestones SHOULD be representable as dated events.

---

## FR-HLT-003 — Contextual patterns

The system MUST support durable self-observed patterns that may influence interpretation of later events.

These MUST NOT automatically become diagnoses.

---

## FR-HLT-004 — Important patterns may be startup-relevant

A small subset of active contextual patterns MAY be marked as high startup relevance.

The startup context SHOULD include only a short pointer/summary and SHOULD retrieve the full canonical pattern only when relevant.

---

## FR-HLT-005 — Pattern handling must avoid two opposite errors

When a contextual pattern such as symptom hypervigilance is relevant, the agent MUST avoid both:

1. reinforcing unsupported catastrophic interpretations; and
2. dismissing new symptoms merely because the contextual pattern exists.

---

## FR-HLT-006 — Pattern and rule must remain separate

The user's self-observed pattern MUST live as memory.

The agent's reasoning behavior for that pattern MUST live as a rule/procedure.

---

# 17. Maintenance and Reflection Requirements

## FR-MAINT-001 — Maintenance may propose, not rewrite history freely

Automated reflection MAY:

- detect duplicates;
- detect contradictions;
- identify likely supersessions;
- identify stale/retired records;
- repair index state;
- refresh derived views;
- identify orphaned links.

It MUST NOT autonomously rewrite canonical historical evidence merely for stylistic consolidation.

---

## FR-MAINT-002 — Contradictions must remain visible until resolved

When credible records conflict, the system MUST preserve the conflict and provenance rather than silently selecting one narrative.

---

## FR-MAINT-003 — Reindexing

The system MUST support rebuilding retrieval indexes from canonical data.

---

# 18. Failure and Honesty Requirements

## FR-FAIL-001 — No invented history

If the system cannot find reliable evidence for a claimed historical fact, the agent MUST NOT invent a plausible answer.

---

## FR-FAIL-002 — Report search exhaustion

When retrieval reaches the transcript fallback and still fails, the agent SHOULD state which evidence tiers were searched and that no reliable record was found.

---

# 19. Non-Functional Requirements

## NFR-001 — Human inspectability

Canonical durable memory MUST remain readable without proprietary tooling.

## NFR-002 — Portability

The project must remain usable if the chosen memory provider disappears.

## NFR-003 — Auditability

Important memory changes must be auditable through file history, explicit lifecycle links, or equivalent mechanisms.

## NFR-004 — Low write amplification

A simple new fact/event SHOULD result in a small number of file/index changes.

## NFR-005 — Context efficiency

Historical memory SHOULD consume context only when relevant to the task.

## NFR-006 — Retrieval latency

Local exact/keyword retrieval SHOULD feel interactive. Hybrid semantic retrieval SHOULD normally return within a few seconds on a developer workstation for project-sized repositories.

## NFR-007 — Deterministic schema validation

Canonical structured metadata SHOULD be schema-validatable without an LLM.

## NFR-008 — Extensibility

New memory types, source types, or retrieval backends SHOULD be addable without invalidating old records.

---

# 20. System-Level Acceptance Scenarios

## Scenario A — New coding session

Given a fresh Codex or Claude session in a software repository, the agent can:

1. identify its role;
2. identify the project's purpose and roadmap;
3. understand current work;
4. know where specs and memory live;
5. retrieve a prior ADR without scanning the full repo;
6. cite/recover the underlying source when needed.

## Scenario B — Historical architectural question

User asks:

> Why did we choose Keychain for refresh tokens two months ago?

The system:

1. searches decisions/memory;
2. finds the relevant ADR;
3. retrieves rationale and predecessor decisions;
4. follows provenance if needed;
5. answers without relying solely on a session summary.

## Scenario C — Requirement changes

A client changes a requirement.

The system:

1. updates the normative spec through the spec workflow;
2. records the requirement-change event/decision where historically useful;
3. preserves the prior historical state;
4. links new and old records appropriately.

## Scenario D — Health symptom report

User reports a new elbow symptom.

The system:

1. creates one dated user-reported event if durable;
2. links the event to the relevant body-site entities;
3. preserves provenance;
4. does not rewrite multiple summaries;
5. can later retrieve the timeline efficiently.

## Scenario E — Health contextual pattern

A known symptom-hypervigilance pattern exists.

The system:

1. provides a small startup reminder;
2. retrieves the full pattern when relevant;
3. retrieves physical history separately;
4. avoids treating the pattern as diagnosis or proof of cause;
5. avoids dismissing new symptoms.

## Scenario F — Missing memory

User asks about a historical decision not present in curated memory.

The system:

1. searches curated knowledge;
2. expands related/temporal records;
3. searches session summaries;
4. searches raw transcripts;
5. if still unsuccessful, explicitly reports that no reliable record was found.

---

# 21. Governing Requirement

A compliant implementation must uphold this invariant:

> **The project owns its durable knowledge. AI agents may retrieve, propose, write, and maintain that knowledge only through explicit schemas and lifecycle rules. Search indexes and generated summaries are replaceable aids; original evidence and canonical records remain authoritative.**

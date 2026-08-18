# Universal Project Memory System Specification — v2

## 1. Purpose

This specification defines a **provider-independent persistent memory architecture** for AI-assisted projects.

It is intended to work consistently across:

- client software projects;
- personal software projects;
- iOS applications;
- research repositories;
- personal knowledge bases;
- longitudinal health repositories;
- future project types.

The same conceptual architecture should work whether the active agent is Claude Code, Codex, or another compatible agent.

The underlying implementation may use:

- Markdown;
- Git;
- SQLite;
- FTS/keyword retrieval;
- vector/semantic retrieval;
- memsearch;
- Mem0;
- Hindsight;
- another future provider.

The **project's memory contract must not depend on one specific provider**.

---

# 2. Core Principle

Every project using this architecture must give a newly started AI agent enough context to answer:

```text
WHO AM I?

WHAT PROJECT AM I IN?

WHAT ARE WE TRYING TO ACCOMPLISH?

WHAT IS TRUE RIGHT NOW?

WHAT ARE WE CURRENTLY WORKING ON?

WHAT HAPPENED RECENTLY?

WHERE DOES INFORMATION LIVE?

WHAT IS A SPEC VS A MEMORY VS A RULE?

HOW DO I SEARCH FOR MORE CONTEXT?

HOW DO I WRITE OR MAINTAIN MEMORY?

WHAT INFORMATION SHOULD I NOT STORE?
```

The agent should begin every session **oriented, but not overloaded**.

Historical information should be retrieved on demand rather than indiscriminately inserted into the context window.

---

# 3. Mandatory Project Architecture

Every memory-enabled project should expose the following conceptual structure:

```text
project/
│
├── AGENTS.md
├── CLAUDE.md
├── SOUL.md
│
├── rules/
│   ├── README.md
│   ├── memory.md
│   ├── specs.md
│   ├── coding.md
│   ├── research.md
│   ├── security.md
│   └── ...
│
├── context/
│   ├── PROJECT.md
│   ├── CURRENT.md
│   ├── MAP.md
│   └── RECENT.md
│
├── specs/
│   ├── requirements/
│   ├── architecture/
│   ├── interfaces/
│   ├── roadmap/
│   └── ...
│
├── memory/
│   ├── README.md
│   ├── entities/
│   ├── facts/
│   ├── decisions/
│   ├── events/
│   ├── relationships/
│   ├── sources/
│   └── views/
│
├── sessions/
│   ├── summaries/
│   └── transcripts/
│
├── procedures/
│   └── ...
│
├── src/
├── tests/
└── ...
```

Exact names may differ when required by a particular tool.

The **conceptual separation must remain**.

---

# 4. Information Layers

The architecture has seven distinct layers:

```text
1. AGENT OPERATING CONTRACT
   AGENTS.md / CLAUDE.md

2. AGENT IDENTITY
   SOUL.md

3. PROCEDURAL RULES
   rules/

4. PROJECT ORIENTATION / WORKING STATE
   context/

5. NORMATIVE PROJECT TRUTH
   specs/
   **raw code as well**

6. HISTORICAL / DURABLE KNOWLEDGE
   memory/

7. RAW SESSION EVIDENCE
   sessions/
```

These categories must not become interchangeable.

---

# 5. AGENTS.md and CLAUDE.md

Every project must contain an agent entrypoint.

For cross-agent compatibility, the preferred model is:

```text
AGENTS.md
=
vendor-neutral operating contract

CLAUDE.md
=
thin Claude-specific entrypoint
```

The two files should **not contain duplicated large instruction sets**.

Duplication creates drift.

A good pattern is:

```text
CLAUDE.md
    ↓
Read AGENTS.md
Read SOUL.md
Read required startup context
Follow project memory protocol
```

`AGENTS.md` remains the primary shared contract.

---

# 6. What AGENTS.md Should Contain

`AGENTS.md` should remain compact.

It should contain only instructions important enough that virtually every agent session should know them.

It should define:

## 6.1 Required startup reads

For example:

```text
At the beginning of every session:

1. Read SOUL.md.
2. Read context/PROJECT.md.
3. Read context/CURRENT.md.
4. Read context/RECENT.md.
5. Read context/MAP.md.
6. Understand the memory retrieval protocol.
7. Load additional rules only as required by the task.
```

## 6.2 Information hierarchy

The agent must know which information sources have which responsibilities:

```text
specs/
    = what the project SHOULD be

memory/
    = what has happened, what was decided,
      durable context, history and rationale

rules/
    = how the agent SHOULD operate

context/
    = where things stand RIGHT NOW

sessions/
    = raw or summarized conversation history

source code
    = actual implementation state
```

## 6.3 Core behavioral requirements

Examples:

```text
Search before assuming historical context.

Consult active specs before changing specified behavior.

Consult ADRs before overturning architectural decisions.

Prefer original evidence over generated summaries.

Do not convert inference into fact.

Do not create durable memory for trivial activity.

Preserve provenance.

Supersede changing facts rather than silently erasing history.

Do not manually synchronize derived summaries after every update.

Keep memory writes small and atomic.
```

## 6.4 Rule-loading behavior

`AGENTS.md` should tell the agent that detailed instructions live under:

```text
rules/
```

The root file should not contain every coding, testing, memory, security, or research rule.

Instead:

```text
task requires memory write
        ↓
read rules/memory.md

task changes requirements
        ↓
read rules/specs.md

task involves security
        ↓
read rules/security.md
```

This prevents the always-loaded instruction set from becoming enormous.

---

# 7. CLAUDE.md

`CLAUDE.md` should be deliberately thin.

Its purpose is primarily compatibility with Claude Code's startup mechanism.

Conceptually:

```markdown
# Claude Project Instructions

This project uses the Universal Project Memory System.

Always read:

- AGENTS.md
- SOUL.md
- context/PROJECT.md
- context/CURRENT.md
- context/RECENT.md
- context/MAP.md

Follow AGENTS.md as the primary operating contract.

Load detailed rules from rules/ only when relevant.

Use the project's memory tools instead of assuming historical facts.
```

Detailed project knowledge does **not** belong here.

---

# 8. SOUL.md Is Mandatory

Every memory-enabled project must contain:

```text
SOUL.md
```

The agent should read this at the start of **every session**, with the same priority as its root agent instructions.

SOUL defines:

```text
WHO THE AGENT IS

WHY IT EXISTS IN THIS PROJECT

WHO IT SERVES

HOW IT SHOULD THINK ABOUT ITS ROLE

WHAT VALUES SHOULD REMAIN STABLE

WHAT IT MUST NEVER LOSE SIGHT OF
```

SOUL is **identity**, not project history.

---

# 9. What SOUL.md Should Contain

Example:

```markdown
# SOUL

You are the persistent technical collaborator for this project.

Your job is to help the user move the project toward its stated
objectives while preserving architectural coherence and historical
context.

You optimize for:

- correctness;
- maintainability;
- simplicity;
- fidelity to evidence;
- continuity across sessions;
- explicit reasoning about tradeoffs;
- preservation of project intent.

You are not the owner of project truth.

Project truth lives in source code, active specifications,
canonical memory records, and original sources.

Do not invent historical decisions.

Do not promote your own inference into durable fact.

When uncertain about project history, search memory.

When consequential historical claims matter, trace them back to
their original source.
```

SOUL should remain relatively stable.

It should not contain:

- today's tasks;
- transient blockers;
- current implementation status;
- temporary project details;
- long lists of coding rules.

---

# 10. Rules Directory

Detailed operational instructions belong under:

```text
rules/
```

This avoids turning `AGENTS.md` or `CLAUDE.md` into enormous system prompts.

Example:

```text
rules/
├── memory.md
├── specs.md
├── coding.md
├── testing.md
├── research.md
├── security.md
├── git.md
└── health-data.md
```

The agent loads these selectively.

---

# 11. Rule Files vs Memory

Rules answer:

> How should I behave?

Memory answers:

> What happened or what do we know?

For example:

```text
rules/memory.md

"When a durable fact changes,
supersede the previous memory."
```

versus:

```text
memory/decisions/adr-018.md

"We migrated authentication from
API keys to OAuth on May 12."
```

These are fundamentally different.

---

# 12. Project Orientation

Every new session must understand the project itself.

The following should be available in:

```text
context/PROJECT.md
```

It should contain a concise representation of:

```text
project name
project identifier
project type
purpose
target users
primary technologies
high-level architecture
major constraints
current lifecycle stage
primary objective
```

It is orientation, not detailed history.

---

# 13. Roadmap

Agents need awareness of what the project is building toward.

The authoritative roadmap belongs in:

```text
specs/roadmap/
```

A compact summary may be included in:

```text
context/PROJECT.md
```

Example:

```text
CURRENT PHASE
Private beta

PRIMARY OBJECTIVE
Achieve stable TestFlight release.

CURRENT MILESTONE
Beta 3

MAJOR REMAINING AREAS
- authentication stability
- onboarding
- synchronization reliability
```

The agent should understand both what it is working on and what larger goal the work contributes toward.

---

# 14. Current State

`context/CURRENT.md` is an automatically or semi-automatically maintained **working-state view**.

Example:

```markdown
# Current Project State

Generated: 2026-08-17

## Current focus

Authentication reliability.

## Active work

Investigating refresh-token race during background resume.

## Blockers

Race has not yet been reproduced deterministically.

## Current implementation

Keychain storage migration is complete.

## Next likely actions

- instrument refresh flow;
- reproduce background resume;
- inspect actor isolation.
```

This is **derived context**.

It is not canonical historical evidence.

---

# 15. Recent Session Context

`context/RECENT.md` contains a very small window into recent work.

It should answer:

```text
What were we just doing?

What did we learn recently?

What remains unfinished?

What approach should the next session avoid repeating?
```

Example:

```text
Previous meaningful session:

- investigated authentication race;
- determined Keychain itself is not the issue;
- attempted lock-based synchronization;
- reverted it due to deadlock risk;
- next investigation should focus on actor isolation.
```

This can be AI-generated.

It is working continuity rather than canonical knowledge.

---

# 16. Folder / Project Map Is Mandatory

Every memory-enabled project must expose:

```text
context/MAP.md
```

The agent should read it at startup.

The map describes the **meaning of the repository structure**, not merely a raw directory listing.

Example:

```text
src/auth/
    Authentication and session lifecycle.

src/networking/
    HTTP clients and API abstractions.

src/storage/
    Persistent local storage.

specs/
    Normative requirements and designs.

memory/
    Durable historical and contextual knowledge.

sessions/
    Session summaries and raw transcripts.

rules/
    Detailed agent operating instructions.

context/
    Small startup-oriented working context.
```

The map should tell the agent:

```text
where information belongs
where information should be searched
which directories are canonical
which are generated
which should not be manually modified
```

The map may be regenerated when project structure changes.

---

# 17. Specs and Memory Must Be Explicitly Different

This distinction is essential.

## Specs answer

> What should this system do?

## Memory answers

> What happened, what was decided, what did we learn, and why are things the way they are?

---

# 18. What Belongs in Specs

Examples:

```text
finalized business requirements
product requirements
feature specifications
API contracts
interface contracts
data schemas
acceptance criteria
current architectural design specifications
security requirements
current supported behavior
roadmaps
non-functional requirements
```

Example:

```text
specs/requirements/authentication.md
```

might state:

> Refresh tokens must be stored using the operating system's secure credential storage.

That is **normative**.

The project is expected to satisfy it.

---

# 19. What Belongs in Memory

Memory contains durable historical/contextual knowledge.

The primary memory classes are:

```text
1. DURABLE FACTS
2. ARCHITECTURAL / PROJECT DECISIONS
3. MEANINGFUL PROJECT OR DOMAIN EVENTS
4. ENTITY KNOWLEDGE
5. RELATIONSHIPS
6. HISTORICAL STATE CHANGES
7. SOURCE-ATTRIBUTED OBSERVATIONS
8. IMPORTANT LEARNED CONTEXT
```

---

# 20. Durable Facts

A durable fact is information likely to remain useful across many sessions.

Examples:

```text
The app uses CloudKit.

The client requires US-only data residency.

The API uses UUIDv7 identifiers.

The user underwent left ACL reconstruction in 2016.

The left elbow has a history of ulnar nerve transposition.
```

A durable fact should not merely be a repetition of something already clearly represented in an active specification.

---

# 21. Decisions / ADRs

Important decisions must preserve:

```text
what was decided
when
why
what alternatives were considered
who or what authorized it
what evidence informed it
what it superseded
```

Example:

```text
memory/decisions/ADR-004-token-storage.md
```

A finalized specification might say:

> Tokens use Keychain.

The ADR explains:

> Why Keychain was selected, what alternatives were rejected, and what tradeoffs drove the decision.

That is why both specifications and memory are required.

---

# 22. Meaningful Project / Domain Events

An **event is not every thing the agent does**.

It is not:

```text
agent opened file X
agent called grep
agent ran tests
agent compiled code
agent read documentation
agent invoked an MCP tool
agent got an ordinary compiler error
```

Those are execution telemetry.

This system does not need them as durable memory.

---

# 23. What Counts as a Meaningful Event

A meaningful project/domain event is something that changes the historical state of the project or domain.

Examples in software:

```text
client approved a feature
requirement changed
major milestone completed
version released
migration completed
security incident occurred
production outage occurred
important bug discovered
external dependency was deprecated
architecture transition started
architecture transition completed
project scope changed
critical assumption was disproven
important experiment produced a meaningful result
```

Examples in a health knowledge base:

```text
new symptom began
symptom materially changed
injury occurred
surgery occurred
diagnosis was made
treatment started
medication changed
imaging was performed
major recovery milestone occurred
```

Examples in research:

```text
important source was discovered
core hypothesis changed
experiment completed
major finding was confirmed
important contradictory evidence appeared
```

The useful test is:

> **Would someone working on this project six months from now care that this happened?**

If not, it probably does not belong in durable event memory.

---

# 24. Large Tasks Are Not Automatically Events

Completing a large coding task is not itself necessarily a memory event.

For example:

```text
"Agent implemented 14 files today."
```

is not inherently useful historical memory.

But:

```text
"The legacy authentication stack was fully replaced
by OAuth and the old implementation was retired."
```

is meaningful.

The distinction is:

```text
agent activity
vs
project state change
```

Store the second.

---

# 25. Procedural Knowledge

The semantic / episodic / procedural memory model remains useful.

Procedural knowledge should normally live under:

```text
procedures/
```

or:

```text
skills/
```

Examples:

```text
how to perform a production release
how to add a database migration
how to run a research review
how to triage a health-document import
how to rotate credentials
```

These files can still be indexed by the same retrieval system.

---

# 26. Entities

Stable concepts receive stable identities.

Software examples:

```text
authentication
billing
sync-engine
client-acme
api-v2
```

Health examples:

```text
left-elbow
right-elbow
left-knee
lumbar-spine
ulnar-neuropathy
```

Memories reference these identities, allowing entity-scoped retrieval without relying only on free-text similarity.

---

# 27. Provenance Is Mandatory

Every durable memory must indicate where it came from.

Possible provenance types:

```text
user_statement
user_approved_decision
client_statement
client_document
source_code
git_commit
issue
pull_request
medical_document
provider_statement
web_source
research_paper
agent_observation
agent_inference
agent_summary
```

These types must remain distinguishable.

---

# 28. Example Provenance

```yaml
source:
  type: user_statement

session_id: session-2026-08-17-001
```

or:

```yaml
source:
  type: client_document
  path: sources/client/security-requirements.pdf
```

or:

```yaml
source:
  type: web_source
  url: ...
  retrieved_at: ...
```

or:

```yaml
source:
  type: agent_inference

based_on:
  - memory:event-183
  - memory:event-194
```

An agent inference must never masquerade as a user statement or authoritative specification.

---

# 29. Canonical Memory Schema

Durable records should have stable metadata.

Example:

```yaml
---
id: adr-auth-004
type: decision
project_id: atlas-ios
created_at: 2026-04-12T15:34:00-04:00
effective_at: 2026-04-12
status: active

entities:
  - authentication
  - refresh-token
  - keychain

source:
  type: user_approved_decision

supersedes: null

related_specs:
  - spec:auth-security-v3

tags:
  - authentication
  - security
---
```

---

# 30. Memory Lifecycle

Agents must understand that memory has a lifecycle.

The primary operations are:

```text
ADD
NOOP
CORRECT
SUPERSEDE
RETIRE
DELETE
```

## ADD

Create a new memory when genuinely new durable knowledge exists.

## NOOP

Do nothing when information is transient, already stored, unimportant, speculative, ordinary execution detail, or better represented elsewhere.

Agents should use NOOP frequently.

A memory system becomes worse when it remembers everything.

## CORRECT

Used when the historical record itself was wrong.

The correction should preserve an audit trail.

## SUPERSEDE

Used when a fact or decision was valid but a newer state replaces it.

The old record remains historically meaningful and points to its successor.

## RETIRE

Used when something is no longer active and has no simple direct replacement.

## DELETE

Deletion should be unusual and reserved for duplicates, corruption, privacy deletion, sensitive information intentionally removed, or accidental records.

Changing reality is usually a reason to **supersede**, not delete.

---

# 31. Temporal Breadcrumbs

The system must support reconstructing change over time.

```text
Memory A
Auth = API key
valid from Jan → May
        │
        ▼
superseded by
        │
        ▼
Memory B
Auth = OAuth
valid from May →
```

An agent should be able to answer both:

> What does the project use now?

and:

> What did it use six months ago and why did that change?

---

# 32. Session Memory Is Separate

Session information belongs under:

```text
sessions/
```

with:

```text
summaries/
transcripts/
```

Session information is useful evidence and continuity context.

It is not automatically canonical project memory.

---

# 33. Recent Session Synopsis

The most recent useful session information should feed:

```text
context/RECENT.md
```

This is auto-injected at startup.

It should be short and include roughly:

```text
1–3 recent relevant sessions
current unresolved work
important recent discoveries
failed approaches worth avoiding immediately
handoff state
```

It should not become a multi-month historical summary.

---

# 34. Raw Transcripts

Raw chat transcripts are the **last-resort evidence layer**.

They should remain searchable but should not normally enter the context window.

Their role is:

```text
memory search failed
        ↓
search session summaries
        ↓
still insufficient
        ↓
search raw transcripts
        ↓
find original conversation
```

This provides a path back to information that was discussed but never promoted into durable memory.

---

# 35. SQLite as Local Retrieval Catalog

A local SQLite database is a strong implementation candidate for the retrieval/control plane.

```text
Canonical Markdown
       │
       ▼
    SQLite
       │
       ├── metadata
       ├── IDs
       ├── entities
       ├── relationships
       ├── provenance
       ├── FTS keyword index
       ├── session summaries
       └── transcript index
```

The SQLite database should ideally be **rebuildable**.

Canonical memory should not disappear if the index is deleted.

---

# 36. Hybrid Retrieval

The primary retrieval mechanism should combine:

```text
keyword / lexical search
+
semantic / contextual search
```

Conceptually:

```text
                    QUERY
                      │
           ┌──────────┴──────────┐
           ▼                     ▼
       KEYWORD                SEMANTIC
       FTS/BM25               VECTOR
           │                     │
           └──────────┬──────────┘
                      ▼
                RANK / FUSE
                      │
                      ▼
               BEST RESULTS
```

This avoids relying entirely on either literal keywords or embeddings.

---

# 37. Required Retrieval Protocol

Agents must follow a **progressive retrieval ladder**.

## Tier 0 — Always-Loaded Context

Before searching anything, the agent already knows:

```text
AGENTS.md
SOUL.md
project identity
roadmap summary
current state
recent session synopsis
project map
memory protocol
```

If that answers the question, stop.

## Tier 1 — Direct Structured Lookup

When the target is known:

```text
memory_get(id)
entity_get(id)
spec_get(id)
memory_timeline(entity)
```

Use exact lookup before fuzzy search.

## Tier 2 — Hybrid Curated Knowledge Search

Search:

```text
specs
facts
ADRs
events
entities
procedures
relevant source metadata
```

using keyword retrieval + semantic retrieval + metadata filters.

Example:

```text
memory_search(
  query="why refresh tokens are device local",
  type="decision",
  status="active"
)
```

## Tier 3 — Temporal / Relationship Expansion

If initial results are insufficient, expand around:

```text
related entities
preceding records
superseded records
successor records
linked decisions
linked events
linked specifications
nearby dates
```

## Tier 4 — Session Summary Search

If curated project knowledge does not answer the question, search:

```text
sessions/summaries/
```

## Tier 5 — Transcript Search

If session summaries still fail, search:

```text
sessions/transcripts/
```

When a transcript result looks relevant, open the actual conversation segment rather than trusting an automatically generated summary.

## Tier 6 — Failure

If the answer still cannot be recovered, the agent should say that it **could not find reliable historical evidence**.

It should not invent a plausible answer.

---

# 38. Search Specs and Memory Differently

If the question is:

> What should the system do?

prefer:

```text
SPEC SEARCH
```

If the question is:

> Why did we do this?

prefer:

```text
DECISION / MEMORY SEARCH
```

If the question is:

> What happened?

prefer:

```text
EVENT / TIMELINE SEARCH
```

If the question is:

> What were we talking about last week?

prefer:

```text
SESSION SEARCH
```

---

# 39. Primary Evidence Rule

Retrieval snippets help locate evidence.

They are not evidence by themselves.

For consequential questions:

```text
SEARCH
   ↓
RESULT
   ↓
EXPAND MEMORY
   ↓
FOLLOW PROVENANCE
   ↓
READ ORIGINAL SOURCE
   ↓
ANSWER
```

---

# 40. Required Memory Tools

The provider-independent interface should expose at least:

```text
memory_search
memory_get
memory_add
memory_correct
memory_supersede
memory_retire
memory_delete
memory_related
memory_timeline
memory_sources
transcript_search
spec_search
spec_get
```

The agent should learn this tool model at startup.

---

# 41. Agent Memory Write Protocol

Before writing memory:

```text
NEW INFORMATION
       │
       ▼
Does this belong in a spec?
       │
   YES ─────→ spec workflow
       │
      NO
       ▼
Is it durable?
       │
   NO ──────→ NOOP
       │
      YES
       ▼
Classify memory
       │
       ├── fact
       ├── decision
       ├── event
       ├── entity
       └── relationship
       │
       ▼
Identify provenance
       │
       ▼
Resolve entities
       │
       ▼
Search duplicates/history
       │
       ▼
ADD / CORRECT /
SUPERSEDE / RETIRE
       │
       ▼
Write atomic record
       │
       ▼
Update index
```

---

# 42. Memory vs Spec Decision Table

| Information | Destination |
| --- | --- |
| Final business requirement | **specs/** |
| Current accepted API behavior | **specs/** |
| Feature acceptance criteria | **specs/** |
| Current schema definition | **specs/** |
| Product roadmap | **specs/** |
| Why an architecture was selected | **memory/decisions/** |
| Previous architecture | **memory/decisions/** |
| Durable project fact | **memory/facts/** |
| Client-approved historical decision | **memory/decisions/** |
| Major project milestone | **memory/events/** |
| Production incident | **memory/events/** |
| Requirement-change event | **memory/events/** |
| Health symptom occurrence | **memory/events/** |
| Stable entity identity | **memory/entities/** |
| Procedure/runbook | **procedures/** |
| Agent behavioral instruction | **rules/** |
| Current work focus | **context/CURRENT.md** |
| Recent handoff summary | **context/RECENT.md** |
| Full conversation | **sessions/transcripts/** |
| Agent tool call | Normally **nowhere durable** |
| Routine compiler error | Normally **nowhere durable** |
| Important failure that changed architecture | **memory/event or decision** |
| Temporary TODO | task system / current state |
| AI hypothesis | session or explicitly marked inference |

---

# 43. What Must NOT Be Stored as Durable Memory by Default

Do not automatically store:

```text
every agent tool call
every command executed
every file opened
every code edit
routine compiler errors
ordinary test runs
temporary debugging hypotheses
chain-of-thought or hidden reasoning
repetitive summaries
casual conversation
information already represented by an active spec
ephemeral task state
generated prose with no provenance
```

The memory system should be **selective**.

---

# 44. Promotion Rule

Session information becomes durable memory only when it crosses a meaningful threshold.

Examples:

```text
discussion
    ↓
user explicitly approves architecture
    ↓
ADR MEMORY
```

or:

```text
debugging
    ↓
discover fundamental platform limitation
    ↓
DURABLE FACT
```

or:

```text
implementation work
    ↓
major migration completed
    ↓
PROJECT EVENT
```

Not every intermediate step deserves promotion.

---

# 45. Memory Maintenance / Reflection

Periodic maintenance may:

```text
detect duplicates
detect contradictions
identify superseded records
suggest retirements
repair broken links
rebuild indexes
refresh generated views
identify orphaned entities
compress old session summaries
```

It must **not autonomously rewrite historical evidence merely to make it cleaner**.

The preferred behavior is:

```text
reflection proposes maintenance
```

rather than:

```text
reflection rewrites history
```

---

# 46. Derived Views

The system may produce:

```text
current project summary
architecture timeline
weekly digest
health timeline
entity overview
recent decisions
active constraints
historical milestone list
```

These should be marked as generated and treated as caches/navigation aids, not canonical truth.

---

# 47. No Summary Synchronization Tax

Adding one fact should not trigger five document rewrites.

Bad:

```text
new event
   ↓
update project overview
update feature summary
update weekly summary
update historical summary
update current summary
```

Preferred:

```text
new event
   ↓
write one canonical record
   ↓
update index
```

Views are regenerated only when needed.

---

# 48. Startup Injection Model

The effective startup context should look approximately like:

```text
┌───────────────────────────────────────┐
│ AGENTS / CLAUDE OPERATING CONTRACT    │
├───────────────────────────────────────┤
│ SOUL                                  │
├───────────────────────────────────────┤
│ PROJECT IDENTITY + GOALS              │
├───────────────────────────────────────┤
│ CURRENT STATE                         │
├───────────────────────────────────────┤
│ RECENT SESSION SYNOPSIS               │
├───────────────────────────────────────┤
│ PROJECT MAP                           │
├───────────────────────────────────────┤
│ MEMORY / RETRIEVAL PROTOCOL           │
├───────────────────────────────────────┤
│ AVAILABLE TOOLS                       │
└───────────────────────────────────────┘

                then

     RETRIEVE EVERYTHING ELSE
          ONLY WHEN NEEDED
```

---

# 49. What Should NOT Be Auto-Injected

Do not automatically load:

```text
all ADRs
all historical facts
all session summaries
all transcripts
all specifications
all entity records
entire project directory listings
large generated digests
full source documents
```

That defeats the purpose of persistent retrieval.

---

# 50. Context Budget Principle

The agent should receive:

```text
small stable orientation
+
small current-state context
+
small recent-history context
+
task-specific retrieval
```

not:

```text
entire accumulated memory
```

This preserves reasoning space and reduces stale-context effects.

---

# 51. Provider Architecture

The agent should interact with an abstract memory service:

```text
               CLAUDE / CODEX
                     │
                     ▼
              MEMORY PROTOCOL
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
     memsearch      SQLite      Hindsight
        │
        └──── future providers ───┘
```

Provider choice should not redefine what constitutes a fact, ADR, event, source, or specification.

---

# 52. Recommended Initial Technical Model

A particularly strong first implementation is:

```text
               FILE SYSTEM
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
       specs/              memory/
      normative          historical
         │                   │
         └─────────┬─────────┘
                   ▼
               SQLite
        metadata + FTS index
                   │
              ┌────┴────┐
              ▼         ▼
           keyword   semantic
              │         │
              └────┬────┘
                   ▼
              hybrid rank
                   │
                   ▼
                 agent
```

Raw transcripts are indexed separately as the final fallback tier.

---

# 53. Universal Project Contract

Every project adopting this system should be able to make the following promise:

> A new compatible agent can enter this repository with no previous conversation context and rapidly understand who it is, what the project is, what the project is trying to accomplish, what is currently happening, where information belongs, how history is stored, how to retrieve historical evidence, and how to maintain that history without corrupting it.

That is the definition of successful persistent project memory.

---

# 54. Final Mental Model

```text
SOUL
=
WHO AM I?

AGENTS / CLAUDE
=
HOW DO I OPERATE?

RULES
=
WHAT DETAILED CONSTRAINTS APPLY?

PROJECT CONTEXT
=
WHERE ARE WE RIGHT NOW?

SPECS
=
WHAT SHOULD BE TRUE?

MEMORY
=
WHAT HAPPENED, WHAT DO WE KNOW,
WHAT DID WE DECIDE, AND WHY?

PROCEDURES
=
HOW DO WE REPEATEDLY DO THINGS?

SESSION SUMMARIES
=
WHAT WERE WE JUST WORKING ON?

TRANSCRIPTS
=
WHAT WAS ACTUALLY SAID?

SQLITE / MEMSEARCH
=
HOW DO I FIND IT?

PROVENANCE
=
WHY SHOULD I TRUST IT?

SUPERSESSION
=
HOW DID IT CHANGE OVER TIME?
```

---

# 55. Governing Principle

> **Always orient the agent. Keep identity and operating rules small and deterministic. Keep specifications normative. Keep memory historical and evidence-linked. Store meaningful project/domain events, not agent telemetry. Retrieve progressively. Preserve provenance and temporal breadcrumbs. Fall back to original transcripts before guessing.**

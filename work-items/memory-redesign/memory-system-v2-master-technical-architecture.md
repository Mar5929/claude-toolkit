# Memory System v2: Final Master Technical Architecture

**Status:** Final technical architecture for the memory redesign work item.

**Authority:** functional-requirements.md controls behavior. This document controls
the technical design. If they disagree, the functional requirement wins and this
document must be corrected before implementation continues.

**Implementation gate:** This architecture does not authorize implementation,
migration, specification replacement, or project adoption. Those actions remain
subject to the work tracker, approval, migration, and release rules.

## 1. Purpose

This architecture defines a portable project memory system that:

- starts every compatible agent with enough trusted context to work immediately;
- keeps stable project knowledge available across sessions and machines;
- prevents duplicate, stale, weak, or wrongly promoted information from becoming
  current truth;
- keeps approved Markdown in Git as the only canonical project memory;
- retrieves evidence progressively and reports honest failure;
- supports owner-controlled pinned memory without turning it into a rule;
- works when optional search providers and caches are missing; and
- migrates existing projects without silent rewrites or lost history.

The architecture applies to Claude Code, Codex, and future hosts that can satisfy the
same startup, approval, retrieval, privacy, and validation contracts.

## 2. Source resolution

The final design was resolved from these inputs:

1. [functional-requirements.md](functional-requirements.md), including FR-001
   through FR-064;
2. [memory-system-v2-master2.md](memory-system-v2-master2.md), the approved design
   from 2026-08-17; and
3. [memory-system-v2-master.md](memory-system-v2-master.md), the more detailed
   technical draft.

The inputs are used in this order:

- The functional requirements decide what the system must do.
- The approved design decides settled architecture choices when they still satisfy
  the final requirements.
- The detailed draft supplies mechanics when they satisfy both documents above.
- Private measurements and prior research explain choices but never create a
  requirement or prove acceptance.

The final requirements added pinned memory after both master documents were written.
This architecture therefore adds pin storage, operations, startup behavior, safety
checks, migration, and acceptance tests.

The following conflicts are resolved here:

| Topic | Final resolution |
| --- | --- |
| Generated build time | Committed generated views use deterministic input fingerprints. Wall-clock build time stays in the local cache so an unchanged rebuild creates no Git diff. |
| Private host memory | It is never required or treated as project truth. It is disabled where the host allows it. |
| Optional retrieval | Any optional method must prove a measured benefit. Recorded privacy consent is additionally required when content leaves the approved boundary. |
| Sensitive personal information | It is refused when it is not needed and approved for the repository. Required, approved information still follows the privacy contract. |
| Startup pins | Every valid pin is rendered from the canonical record summary. A pin admission check prevents normal writes from creating a budget conflict. |
| Proactive reminders | They are outside v2 acceptance and remain disabled until a later approved design. |
| Current and recent views | They are assembled from authored source lines. They are never model-written summaries. |
| Search engine | Markdown, the generated index, and repository search are the baseline. A local full-text cache is optional acceleration. |

## 3. Scope and exclusions

### 3.1 In scope

- project identity and startup orientation;
- information ownership and placement;
- durable record shape and provenance;
- approval and write coordination;
- lifecycle operations;
- pinned memory;
- current, recent, map, and index views;
- progressive retrieval and session-history gating;
- optional provider conformance;
- read-only review and approved cleanup;
- deterministic validation and retrieval tests;
- privacy boundaries;
- migration and rollback; and
- compatibility across supported agent hosts.

### 3.2 Out of scope

- storing every conversation turn, tool call, command, test run, or edit;
- storing hidden reasoning;
- a second source of truth in a database or vendor service;
- an autonomous memory curator;
- model-written startup summaries;
- automatic bulk upgrades of existing memory;
- proactive reminders in v2;
- mandatory Obsidian, SQLite, embeddings, or any vendor; and
- automatic project migration.

## 4. Architecture principles

The following invariants apply to every component and provider:

1. One meaning has one canonical home.
2. Canonical project memory is readable Markdown tracked by Git.
3. Active work stays in the configured work tracker.
4. Rules define behavior. Skills define reusable processes. Specifications define
   approved behavior. Memory records facts, events, decisions, and lasting context.
5. No current specification or memory write occurs without explicit owner approval.
6. Generated files and indexes are rebuildable and never authoritative.
7. Provenance stays attached to the claim and is not upgraded by age or repetition.
8. Same-subject records from different sources remain separate.
9. Current and historical states are distinct and both retrievable.
10. Retrieval starts with the smallest and most authoritative source.
11. Empty results stay empty.
12. Optional providers can fail without making canonical Markdown unavailable.
13. Project content does not cross its approved privacy boundary.
14. Review cannot write.
15. NOOP is a correct and expected result.
16. Load-bearing safety is enforced by economics, refusal, or detection.

## 5. System context

~~~mermaid
flowchart LR
    O[Owner] -->|approve, pin, unpin, correct| WC[Write coordinator]
    H[Agent host] --> SA[Startup adapter]
    SA --> BA[Boot brief assembler]
    BA --> CS[Canonical Markdown store]
    BA --> TA[Tracker adapter]
    BA --> CM[Capability manifest]
    H --> RR[Retrieval router]
    RR --> CS
    RR --> TA
    RR --> RP[Optional retrieval provider]
    RR --> SH[Local session history adapter]
    WC --> CS
    WC --> VG[View generator]
    WC --> V[Validator]
    VG --> CS
    V --> CS
    V --> RP
    CS --> G[Git audit trail]
~~~

The system boundary is one project repository plus approved local adapters. Canonical
state remains in the repository. The work tracker and host session history may live
outside it, but the system reads them through explicit adapters and does not copy
their full contents into project memory.

## 6. Information and authority model

| Layer | Canonical owner | Answers |
| --- | --- | --- |
| Host operating contract | AGENTS.md, CLAUDE.md, host system prompt | How must this agent work here? |
| Agent identity | SOUL.md | Who is the agent in this project and what must it protect? |
| Detailed behavior | Rules, skills, output style | What behavior or process applies now? |
| Project orientation | knowledge/project.md and knowledge/map.md | What is this project and where does information live? |
| Active work | Configured work tracker | What is active, blocked, assigned, or next? |
| Approved behavior | knowledge/specs/ | What should the product or system do? |
| Implemented state | Code, configuration, tests, deployed state | What exists now? |
| Durable knowledge | knowledge/memory/ | What happened, what was decided, what is known, and why? |
| External and raw material | Delivery folders, references, brainstorms | What did an outside source say or what remains unchecked? |
| Session history | Original host history | What was said in a past conversation? |

Authority depends on the question:

- Expected behavior comes from the current approved specification.
- Actual behavior comes from inspected code, configuration, tests, and target state.
- Decision rationale comes from the decision record and its evidence.
- Active status comes from the tracker.
- Source wording comes from the original source.
- Past conversation wording comes from original session history only after current
  sources are insufficient or when the owner asks.

When two current sources conflict, retrieval returns both with their layers and
provenance. The agent does not silently choose.

## 7. Required project shape

~~~text
project/
  AGENTS.md
  CLAUDE.md
  SOUL.md
  rules/
  skills/
  knowledge/
    project.md
    map.md
    memory-settings.md
    current.md
    recent.md
    index.md
    crib.md
    gold-set.md
    specs/
    memory/
      tags.md
      entities.md
      context/
      decisions/
      domain/
      events/
      knowledge/
      operations/
      planning/
      references/
    brainstorms/
  .memory/
  src/
  tests/
~~~

The active tracker and delivery folders stay in their existing locations.

The full memory-system specification stays in this toolkit. An adopting project gets
the built rules, skills, templates, tools, and project-specific settings. It does not
get a copy of this architecture.

The layout is conceptual where hosts require different physical paths. For example,
a host adapter may map rules/ to .claude/rules/ and skills/ to its installed skill
directory. knowledge/map.md records the physical route so the agent never guesses.

### 7.1 Authored files

- SOUL.md contains stable identity and values only.
- knowledge/project.md contains purpose, users, boundaries, main workstreams,
  completion state, roadmap summary, stable project id, and tracker route.
- knowledge/map.md explains each major folder, its owner, generated state, and search
  route.
- knowledge/memory-settings.md contains project-specific memory configuration,
  including startup budget, project profile, provider selection, privacy decisions,
  review threshold, session-history scope, and pinned record ids.
- knowledge/crib.md maps owner language to project terms.
- knowledge/gold-set.md contains owner-worded retrieval questions and expected
  source files.
- Files under knowledge/specs/ and knowledge/memory/ contain approved canonical
  behavior and knowledge.

### 7.2 Generated files

- knowledge/current.md assembles current tracker and source-record lines.
- knowledge/recent.md assembles recent tracker updates and approved handoff lines.
- knowledge/index.md indexes current specifications and memory records.

Each generated file:

- identifies itself as generated;
- names its canonical inputs;
- carries a deterministic input fingerprint;
- links to every rendered source;
- preserves exact source text, qualifiers, dates, and numbers; and
- is replaced by regeneration if hand-edited.

Wall-clock build times and local health details live under .memory/ only.

### 7.3 Local disposable state

.memory/ is gitignored and may hold:

- a local full-text index;
- capability and provider health caches;
- the conversation working set;
- retrieval metrics;
- write locks and crash-recovery journals; and
- generated-view build metadata.

Deleting .memory/ must not delete project knowledge, approval evidence, pin state, or
session history.

## 8. Component model

| Component | Responsibility | May write canonical Markdown? |
| --- | --- | --- |
| Host startup adapter | Delivers the operating contract and starts the boot brief | No |
| Capability resolver | Reports available operations, provider state, privacy boundary, and degraded features | No |
| Source resolver | Reads authored and canonical inputs by layer | No |
| Boot brief assembler | Selects, orders, budgets, and links startup context | Generated views only through the coordinator |
| Tracker adapter | Reads active and recent work from the configured tracker | No |
| Retrieval router | Applies question routing, tier order, ranking, and failure rules | No |
| Canonical store | Reads and stages Markdown records and settings | Only through the write coordinator |
| Write coordinator | Applies approval, concurrency, lifecycle, regeneration, validation, and rollback | Yes |
| Lifecycle engine | Builds approved record changes for named operations | Only through the coordinator |
| Pin manager | Validates pin eligibility, budget, project scope, and summary hash | Only through the coordinator |
| View generator | Rebuilds current, recent, index, and other derived views | Generated files only |
| Validator | Runs deterministic integrity and acceptance checks | No |
| Review engine | Produces a repair worklist | No |
| Cleanup skill | Converts approved worklist items into lifecycle operations | Only through the coordinator |
| Retrieval provider | Builds disposable indexes and returns search candidates | No |
| Session-history adapter | Searches original local host history with a scoped gate | No |
| Migration engine | Detects, plans, applies, verifies, and rolls back approved migrations | Yes, through the coordinator |

The canonical store and retrieval provider are separate seams. A provider never
becomes a write path to project truth. Approved writes land in Markdown first, then
derived views and provider indexes rebuild from that source.

## 9. Project-specific settings

knowledge/memory-settings.md is an authored Markdown file with structured front
matter. It contains configuration, not duplicated project meaning.

~~~yaml
---
schema_version: 2
project_id: claude-toolkit
profile: software-project
startup_budget_bytes: 10240
tracker:
  adapter: github-project
  project: Claude-Toolkit-Project
session_history:
  enabled: true
  local_only: true
  scope: this-project
provider:
  name: file-search
  external_transfer_allowed: false
  consent_record: null
review:
  deep_backlog_threshold: 20
pins:
  - record_id: decision-auth-004
    pinned_at: 2026-08-18
    approved_summary_hash: sha256-value
---

# Project memory settings

This file controls this project's memory runtime. It does not contain memory
statements or replace their canonical records.
~~~

The stable project id scopes cache keys, provider namespaces, pin queries, retrieval
results, and session-history searches. A path on one machine is never used as the
project identity.

A privacy decision records the provider, allowed data categories, destination,
purpose, approver, date, and any expiry. An environment variable or installed client
never counts as consent.

## 10. Startup architecture

### 10.1 Host delivery

| Host | Delivery contract |
| --- | --- |
| Claude Code | CLAUDE.md, automatically loaded project rules, and a fail-open startup hook |
| Codex | AGENTS.md plus a native startup adapter when available |
| Other host | A tested adapter that delivers the same required meaning |

The system never assumes one host can import another host's root file. Required
shared meaning is copied only where needed and checked for drift.

SOUL.md is read after the host operating contract. It contains no active task,
history, project facts, or detailed rule list.

### 10.2 Boot brief order

The boot brief renders these blocks:

1. identity and operating route;
2. project purpose, goal, phase, and tracker;
3. owner working contract from its canonical rules or output style;
4. latest authored handoff line and work-item link;
5. current state;
6. recent window;
7. pinned memory;
8. project map;
9. memory contract, skills, tools, and retrieval route; and
10. warnings and degraded capabilities.

Pinned memory is a required block. Every entry is the current record's approved
one-sentence summary plus a link to that record. Startup does not paraphrase it.

### 10.3 Current, recent, and map rules

Current and recent generators may select, sort, label, and link authored source
lines. They may not create a new statement or paraphrase a fact, number, date,
qualifier, decision, or failure reason.

The recent window renders up to three meaningful updates from the last 72 hours. If
none exists, it renders the latest dated update and labels its age. Eligible updates
include completed state changes, lessons, failed approaches that should not be
retried, disproved assumptions, and lasting constraints.

The map is authored. Validation compares its listed major paths to the repository and
reports missing, renamed, or undocumented areas.

### 10.4 Budget behavior

The default total rendered budget is 10 KB. A project may lower it only while all
required blocks still fit.

Optional detail degrades in this order:

1. warning detail becomes a count and link;
2. older recent items become a count and link;
3. unchanged current areas become a count and link; and
4. the map keeps major folders only.

Identity, project purpose, latest handoff, every valid pinned memory, and the memory
tool route are never silently dropped.

The pin operation calculates the required brief size before writing. It refuses a new
pin when the complete required brief would exceed the configured budget and returns
the exact pin set and byte count that need review. Lowering the budget uses the same
check.

If a manual edit creates an invalid over-budget pin set, startup renders every valid
pin, reports the configuration error, and continues in a visible overflow mode.
Normal tool-mediated writes cannot create this state.

### 10.5 Missing and stale inputs

A missing source, stale view, failed check, or unavailable adapter produces a visible
warning with a count and link. Startup remains usable. If the tracker is unavailable,
the brief shows the latest dated handoff and labels live status unverified.

## 11. Pinned memory architecture

Pinning is project-local startup visibility. It does not change authority, record
type, record status, search rank rules, or canonical home. A rendered pin is context,
not a mandatory instruction.

### 11.1 Eligibility

A record may be pinned only when:

- it is in this project's canonical knowledge/memory tree;
- its status is active;
- it has valid provenance;
- its current meaning was owner-approved;
- it has a one-sentence summary;
- its summary and qualifiers fit the pin statement limit; and
- adding it keeps the required brief within budget.

An agent may propose a pin or unpin. Only the owner may approve it.

### 11.2 Canonical pin state

The pin registry stores only:

- the canonical record id;
- the pin approval date; and
- the hash of the exact approved summary.

It does not copy the summary. Startup reads the summary from the record, verifies the
hash, and renders it with the record link. This preserves one home for meaning and
detects a changed summary that has not been approved for startup.

The startup adapter also seeds every valid pinned record id into the conversation
working set as a protected entry. It remains available for the full session even when
normal search results are refreshed.

### 11.3 Pin operations

~~~text
memory_pin(id)
  -> load the current record
  -> validate project, status, provenance, approval, and summary
  -> show the exact startup statement and link
  -> run the startup budget preflight
  -> show What, Where, Why, Assumptions, Unverified
  -> wait for owner approval
  -> add the id, date, and summary hash to memory-settings.md
  -> rebuild the boot brief and validate project scope

memory_unpin(id)
  -> show the current startup statement and record link
  -> show the five approval bullets
  -> wait for owner approval
  -> remove the registry entry
  -> rebuild the boot brief
~~~

Unpinning does not delete the record or remove it from normal retrieval.

### 11.4 Lifecycle interaction

- CONFIRM keeps a pin because the approved summary does not change.
- CORRECT defaults to unpin when the summary changes. The owner may separately
  approve the corrected summary to remain pinned in the same review.
- SUPERSEDE and RETIRE remove the old pin in the same reported transaction.
- A successor is never pinned automatically.
- DELETE removes any pin entry before rebuilding views and caches.
- MERGE requires an explicit choice of whether the surviving record should be pinned.
- A record with a missing, mismatched, cross-project, superseded, or retired pin
  entry is not rendered as current truth and produces a repair warning.

### 11.5 Cross-project isolation

Every pin lookup uses the stable project id and repository root. Providers receive
the project id as a required filter. A result without a matching project id is
rejected before ranking. Conformance tests use two projects with overlapping record
ids and prove that neither startup nor retrieval leaks a pin.

A model-generated importance score may help rank ordinary results. It cannot create
or remove a pin, decide truth, or override project scope, record status, provenance,
source authority, or query relevance.

## 12. Durable record model

Every new v2 memory is one Markdown file with structured metadata, a descriptive H1,
and one approved summary sentence directly below the H1.

~~~yaml
---
id: decision-auth-004
type: context | decision | domain | event | knowledge | operation | planning | reference
status: active | superseded | retired
recorded_at: 2026-08-18
effective_at: 2026-08-18
valid_until: null
session: session-id-or-unavailable
approval:
  actor: owner
  approved_at: 2026-08-18T14:00:00-04:00
  action: add
source:
  type: owner_statement | owner_approved_decision | client_statement |
        client_document | source_code | git_commit | issue | pull_request |
        web_source | research_paper | agent_observation | agent_inference
  path: null
  url: null
  retrieved_at: null
based_on: []
tags: [authentication]
entities: [authentication, keychain]
relates: []
supersedes: null
superseded_by: null
paired_with: []
confirmed_on: []
review_after: null
retired_because: null
history: []
---

# Refresh tokens use secure device storage

Refresh tokens live in secure device storage, not normal application storage.

The full meaning, rationale, evidence links, and claim-level source markers follow.
~~~

Required fields for new records are id, type, status, recorded_at, session,
approval, source.type, and the one-sentence summary. An inference also requires a
non-empty based_on list.

Existing records remain usable without a forced bulk upgrade. The next approved edit
may upgrade the touched record after showing missing fields in the approval review.

### 12.1 Provenance laws

1. A new write without provenance is refused.
2. Source provenance is immutable after creation.
3. Verification is an audited correction with evidence. Repetition and age do not
   promote an inference.
4. A claim from another source carries its own marker beside that claim.
5. A negative statement names the scope searched.
6. Same-subject statements from different sources are separate records linked by
   paired_with in both directions.

### 12.2 Entities and relationships

knowledge/memory/entities.md is a stable registry of project concept ids, meanings,
and aliases. Records refer to entity ids for filtering and timelines.

Relationships are typed and state whether they are documented or suspected. A
suspected link never looks like a verified fact. A graph may be derived from these
links, but it is never the canonical record shape.

### 12.3 Atomic record boundary

An indexer either emits the entire record or fails. No search chunk starts inside a
record. Search results may show the summary, but consequential answers open the full
record and follow its provenance.

## 13. Approval and write coordination

### 13.1 Save decision

~~~text
new information
  -> search the work tracker and all current owners
  -> route work state, rules, skills, specs, sources, and conversations first
  -> if memory is still the right home, run the durable-information test
  -> choose NOOP or a record type
  -> identify provenance, entities, and project scope
  -> search duplicate meaning and the entity timeline
  -> choose the lifecycle operation
  -> show What, Where, Why, Assumptions, Unverified
  -> wait for keep, change, or skip
  -> verify the source files did not change after the review
  -> apply the approved transaction
  -> rebuild affected views and provider indexes
  -> validate and report changed paths and any warning
~~~

The durable-information test asks:

1. Will this still matter after the task or session?
2. Is it a stable fact, lasting event, decision, or state?
3. Does an existing owner already hold it?
4. Would leaving it out cause repeated explanation or the same wrong action?

Questions 1, 2, and 4 must be yes. Question 3 must identify the existing home or show
why a new record is needed.

At-risk information is proposed when it appears. If approval does not arrive, nothing
is written and no hidden queue is kept.

### 13.2 Approval contract

The main agent presents one separate five-bullet group for each proposed specification
or memory meaning:

- What: the exact meaning or operation.
- Where: the canonical destination.
- Why: the repeated explanation or wrong action it prevents.
- Assumptions: every assumption, or None.
- Unverified: every unchecked claim, or None.

Only keep, change, or skip from the owner decides the result. Silence, an unclear
reply, a request for full text, a helper agent, a hook, a provider, and a background
process are not approval.

The write coordinator binds approval to:

- the proposed meaning;
- the destination path and record id;
- the lifecycle or pin operation;
- the source content hashes reviewed by the owner; and
- the exact pin statement when pin visibility is included.

If any bound input changes before the write, the coordinator refuses and asks for a
fresh review.

### 13.3 Transaction behavior

An approved write is one reported operation even when it affects several files.

1. Acquire a project-local write lock under .memory/.
2. Recheck source hashes and duplicate ids.
3. Write a crash-recovery journal with preimages under .memory/.
4. Stage canonical Markdown changes.
5. Apply required pin, pairing, supersession, and retirement changes.
6. Rebuild the generated index and affected startup views.
7. Rebuild or invalidate disposable provider indexes.
8. Run focused validation.
9. On success, remove the journal and report every changed path.
10. On failure, restore canonical preimages, discard disposable indexes, report the
    failure, and leave no partial current state.

The coordinator does not commit or push. Git remains the visible audit trail chosen
by the project's normal delivery process.

If a process stops with a journal present, the next startup detects it before
retrieval. It restores the preimages or completes regeneration from canonical files,
then reports the recovery.

## 14. Lifecycle architecture

| Operation | Meaning | Required behavior |
| --- | --- | --- |
| NOOP | Store nothing | Expected for transient, repeated, weak, or misplaced information |
| ADD | Add new durable meaning | Refuse duplicate id and warn on same-provenance duplicate meaning |
| CONFIRM | Reaffirm unchanged meaning | Append a confirmation date without rewriting the summary |
| CORRECT | Fix a record that was wrong | Preserve prior wording in history and record the correcting evidence |
| SUPERSEDE | Replace a formerly true record | Create the successor, date the old record, and write both links |
| RETIRE | End a record with no direct successor | Require a reason, remove it from current reads, and hunt current copies |
| MERGE | Combine true duplicates | Allow only identical meaning and provenance and preserve both originals |
| DELETE | Remove an accidental, corrupt, duplicate-surplus, or privacy record | Require a reason, a visible diff, cache cleanup, and any required privacy purge work |

Retired and superseded records remain available for history and timeline questions.
They do not appear as current truth in startup or ordinary search.

### 14.1 Correction and supersession

CORRECT means the record itself was wrong. The prior text moves to history with the
reason, approval, evidence, and date.

SUPERSEDE means the old record was true during an earlier period. The old and new
records receive reciprocal ids and effective dates in one transaction.

### 14.2 Fact-pair protection

Records with the same subject but different sources are paired, not merged. The
coordinator writes both paired_with links. Validation rejects a one-sided pair.
Review and cleanup cannot retire or merge one merely because the wording is similar.

### 14.3 Retirement phrase hunt

RETIRE accepts exact phrases that must no longer appear as current truth. It searches
tracked files and returns every surviving location. Retirement completes only when
each location is corrected through normal approval, marked as an explicit historical
quotation, or exempted with a reason on the retiring record.

The validator repeats this check. It cannot guarantee discovery of an unrelated
paraphrase with no matching text, so review still checks meaning conflicts.

### 14.4 Privacy deletion

A privacy deletion removes the sensitive content from current records, record
history, generated views, disposable indexes, working sets, and provider copies. It
keeps only non-sensitive audit metadata.

A normal Git commit does not erase earlier Git history. If policy requires complete
repository-history removal, the deletion remains open until a separately approved
history rewrite, remote cleanup, credential rotation where relevant, and clone
replacement are complete. The tool must not claim full erasure before that proof.

## 15. Retrieval architecture

### 15.1 Question routing

| Question | First owner |
| --- | --- |
| What should happen? | Current specification |
| Why was this chosen? | Decision record and evidence |
| What happened? | Event record and timeline |
| What is active? | Work tracker |
| What exists now? | Code, configuration, tests, deployed state |
| What did the source say? | Original source |
| What exact words were used in a conversation? | Original session history after the gate |

### 15.2 Retrieval tiers

1. Tier 0, loaded context. Use the boot brief if it answers.
2. Tier 1, exact lookup. Use id, path, entity, or timeline.
3. Tier 2, curated project search. Search specs, memory, procedures, and source
   metadata with filters.
4. Tier 3, relationship and timeline expansion. Follow entities, pairs, predecessor
   and successor records, decisions, events, specs, and nearby dates.
5. Tier 4, active work and handoff. Search the configured tracker and approved
   pointer-only bridge if needed.
6. Tier 5, session history. Search the original local host history only after the
   gate or on owner request.
7. Tier 6, honest failure. Name the searched scope and unavailable sources.

The baseline uses knowledge/index.md and repository file search. A local full-text
provider may accelerate Tier 2. The agent writes a structured query using project
terms and knowledge/crib.md aliases. Blind synonym expansion is not used.

At equal relevance, results rank in this order:

1. current approved specification or original source;
2. current owner or client statement;
3. source code, Git, issue, or pull request evidence;
4. active memory;
5. agent observation; and
6. agent inference or unchecked brainstorm.

A result has this minimum contract:

~~~text
project_id
layer
record_id or source path
status
one-sentence summary
provenance
match reason or score
provider
degraded-state warning, when present
~~~

An empty result stays empty. A parse error, provider failure, missing method, or
scope error is returned as an error, not converted into no evidence.

### 15.3 Consequential recall

Search results locate evidence. Before a consequential answer, the retrieval router:

1. opens the complete current record;
2. follows provenance;
3. reads the original evidence;
4. checks status and effective dates; and
5. returns conflicts and uncertainty with the answer.

### 15.4 Working set

Tier 2 and later results form a conversation-local working set under .memory/. It
contains project id, query, source paths, record ids, entities, dates, and input
fingerprints. Follow-up questions reuse it until the entity set changes, a new date
scope appears, or a canonical input changes.

The working set is disposable and never becomes memory.

### 15.5 Session-history gate

Tier 2 and Tier 4 return an opaque evidence token containing the project id, query
hash, result count, relevance threshold, available source set, and timestamp.

session_search requires:

- a token showing zero qualifying current results or fewer than the configured
  minimum above the gold-set threshold; or
- an explicit owner request.

The search remains local and scoped to project, machine, host, and date range. A
result includes session id, date, role, resume route, and a short excerpt. The agent
opens the exact conversation segment before relying on it.

A miss means only that no evidence was found in the named available scope. It never
means the subject was never discussed.

### 15.6 Honest failure

The final response says that reliable evidence could not be found and names:

- current project layers searched;
- tracker availability;
- provider availability;
- session-history machines, hosts, and dates searched; and
- any source that could not be accessed.

It does not substitute an unrelated recent memory or invent a likely answer.

## 16. Provider and capability architecture

### 16.1 Stable tool surface

~~~text
memory_capabilities()
memory_status()
memory_search(query, filters)
memory_get(id)
memory_timeline(entity)
memory_related(id)
memory_sources(id)
memory_review(scope)
memory_add(record)
memory_confirm(id)
memory_correct(id, change)
memory_supersede(old_id, new_record)
memory_retire(id, reason, phrases)
memory_merge(ids)
memory_delete(id, reason)
memory_pin(id)
memory_unpin(id)
spec_search(query, filters)
spec_get(id_or_path)
session_search(query, scope, evidence_token)
memory_rebuild()
memory_validate()
~~~

memory_capabilities returns:

- provider name and version;
- available operations;
- approval mode, which is owner-approved;
- enabled search modes;
- pin support and current pin count;
- startup budget and required byte count;
- project id and privacy boundary;
- whether data may leave the machine;
- index state and last local rebuild;
- tracker adapter and session-history scope; and
- degraded or unavailable features.

The root route and boot brief name the four human-facing skills: remember, recall,
cleanup, and session-search. The agent inspects capabilities and never guesses.

### 16.2 Provider seam

A retrieval provider may index and search canonical data. It may not directly create,
correct, supersede, retire, merge, delete, pin, or unpin project truth.

A provider must:

- preserve project scope, record status, schema, and provenance as queryable fields;
- index whole records without fragmenting claim and attribution;
- support current, superseded, and retired states;
- return errors for missing capabilities;
- keep canonical Markdown readable during outage;
- rebuild from canonical sources;
- export or clear every indexed copy;
- honor the recorded privacy decision;
- isolate projects with overlapping record ids;
- preserve empty results; and
- pass lifecycle, ranking, round-trip, privacy, outage, and cross-project tests.

The implementation must not use a missing-method guard that silently substitutes an
empty list.

### 16.3 Optional retrieval methods

An optional method, including local full-text search, embeddings, graph expansion, or
an external service, may be enabled only after the gold set shows that it improves or
preserves required retrieval.

If any content leaves the approved boundary, enablement also requires a recorded
per-project privacy decision. Environment variables and installed credentials do not
count as approval.

Embeddings are off by default. A local full-text cache is disposable and uncommitted.

## 17. Review and cleanup

memory_review is structurally read-only. Its interface has no write capability. It
returns a worklist covering:

- exact and near duplicate candidates;
- same-subject records that should be paired;
- current conflicts;
- invalid or missing provenance;
- stale review dates;
- broken ids and one-sided links;
- supersession gaps;
- surviving retired phrases;
- unused, overlapping, or excessive tags;
- records that no longer pass the durable-information test;
- stale or hand-edited generated views;
- pin errors and budget pressure;
- gold-set failures; and
- provider or cache health failures.

cleanup receives a worklist, presents each proposed meaning separately through the
five-bullet approval, and calls the normal lifecycle or pin operation. It does not
gain a separate write path.

A focused review runs after every approved save. A deep review runs only on owner
request, after migration, or when the configured concrete backlog threshold is
crossed. Age alone never deletes or retires a record.

## 18. Deterministic validation

memory_validate checks:

1. required files and host startup routes;
2. shared root-block meaning and checked-copy drift;
3. record schema, allowed values, unique ids, approval, and provenance;
4. non-empty evidence for inference;
5. bidirectional pairing and supersession links;
6. pin eligibility, summary hashes, project scope, and startup rendering;
7. startup budget and safe degradation;
8. retired phrases and recorded exemptions;
9. generated-view inputs, fingerprints, and hand edits;
10. map coverage for major folders;
11. tag vocabulary and usage;
12. no index fragment beginning inside a record;
13. no tracker bridge as the sole home of a fact;
14. identical canonical results after deleting and rebuilding derived state;
15. provider export, clearing, re-index, and project isolation;
16. provider outage and missing-capability behavior;
17. privacy-boundary enforcement;
18. migration file counts, links, hashes, and reversibility;
19. the retrieval gold set; and
20. quoted-source consistency for exact spans, dates, numbers, and identifiers.

The validator does not claim to understand semantic truth. An unquoted paraphrase
that changes meaning remains an agent review and owner decision.

### 18.1 Retrieval gold set

Each project keeps about ten owner-worded questions with expected source files. At
least eight expected files must appear in the first five results.

The set includes:

- owner vocabulary rather than project terms;
- an exact id or identifier;
- a decision-rationale question;
- a timeline question;
- a question that must return no result;
- punctuation, a hyphen, or digits;
- a pinned-memory question;
- a cross-project isolation question; and
- a provider-outage question.

Every retrieval change and provider enablement runs the set.

## 19. Migration and compatibility

Migration is additive, project-specific, approved, and reversible.

### Phase 1: startup and discovery

- Add SOUL.md, map.md, memory-settings.md, current.md, recent.md, crib.md, and
  gold-set.md.
- Establish a stable project id and tracker route.
- Add memory_capabilities and the boot brief.
- Keep existing records and current skills working.
- Start with an empty pin registry.

### Phase 2: lifecycle and schema

- Add permanent ids, status, dates, approval, entities, provenance objects, and
  lifecycle tools.
- Add events and the entity registry.
- Upgrade a legacy record only through an approved operation that touches it.
- Do not infer missing metadata.

### Phase 3: retrieval and validation

- Add the retrieval router, working set, gold-set runner, project-scope checks, and
  provider conformance suite.
- Keep file search as the baseline.
- Enable optional acceleration only after measurement.

### Phase 4: project adoption

- Detect the source layout by multiple signatures.
- Produce a dry report with file counts, hashes, collisions, missing metadata, link
  changes, and rollback steps.
- Stop on ambiguity or collision.
- Apply only after project-specific approval.
- Verify byte preservation for unchanged files, link integrity, startup behavior,
  pin isolation, provider fallback, and the gold set.
- Remove retired runtime pieces only after replacement checks pass.

Rollback removes generated files, local caches, new runtime wiring, and uncommitted
migration changes. It never erases approved Markdown or rewrites Git history.

## 20. Failure behavior

| Failure | Required result |
| --- | --- |
| Missing startup source | Warn with path and continue with remaining sources |
| Stale generated view | Label stale, rebuild when possible, and link inputs |
| Tracker unavailable | Show last dated handoff and label live status unverified |
| Current source conflict | Return both sources and write neither |
| Code differs from spec | Report actual state and expected state separately |
| Memory differs from spec | Treat the spec as approved intent and show the conflict |
| Missing provenance on new record | Refuse the write |
| Missing legacy metadata | Show the gap and preserve the existing text |
| Inference without evidence | Refuse the write |
| Different provenance on merge | Refuse and propose pairing |
| Provider outage | Fall back to file search and label degraded mode |
| Missing provider method | Return provider failure, never empty evidence |
| Search parse error | Return an error, never no result |
| Session history unavailable | Scope the miss to available machine, host, and dates |
| Partial approval | Write only approved groups |
| Changed source after approval | Refuse and request a fresh review |
| Interrupted transaction | Recover from journal before current retrieval |
| Migration ambiguity or collision | Make no writes |
| Unpreservable link | Stop and show the exact gap |
| Startup over budget | Degrade optional detail, preserve required blocks, and warn |
| Invalid pin summary hash | Omit the invalid entry from current truth and report repair work |
| External transfer without consent | Refuse before any content is sent |
| Unanswerable question | Return honest failure with searched scope |

## 21. Privacy and security

- Secrets and credentials are refused by validation and by the approval review.
- Sensitive personal information is stored only when needed, explicitly approved,
  and allowed by repository and client policy.
- Provider requests are project-scoped and deny external transfer by default.
- Consent is committed, specific, reviewable, and revocable.
- Session history stays in its original local host store.
- Caches and working sets are local, disposable, and excluded from Git.
- Logs contain ids, paths, counts, and error codes, not full secret or private
  content.
- Privacy deletion clears current records, histories, views, caches, and provider
  copies and reports any remaining Git-history work.
- A provider or hook cannot approve or write current truth.

## 22. Acceptance proof

The architecture is implemented only when a real project proves:

| Test | Proof |
| --- | --- |
| AT-01 | Cold Claude Code and Codex sessions receive the operating contract, identity, project, current state, recent handoff, pins, map, owner contract, and capability route. |
| AT-02 | The boot brief stays within its valid budget and degrades in the required order. |
| AT-03 | A transient detail produces NOOP. |
| AT-04 | A new persistent fact cannot be written without the five-bullet owner approval. |
| AT-05 | A pin appears in cold Claude Code and Codex sessions for its project. |
| AT-06 | The same pin never appears in another project's startup or retrieval. |
| AT-07 | Unpin removes startup visibility without deleting or hiding the record from search. |
| AT-08 | Supersede and retire remove the old pin and never auto-pin a successor. |
| AT-09 | Too many pins produce a visible refusal or review warning and never a silent omission. |
| AT-10 | A different-source fact pair survives review and cleanup unchanged. |
| AT-11 | A superseded record leaves current results and remains in its timeline. |
| AT-12 | Retirement finds surviving current uses of the retired phrase. |
| AT-13 | Consequential recall opens the record and original evidence. |
| AT-14 | Session-history search cannot run before the current-source gate or owner request. |
| AT-15 | An unanswerable question returns honest failure and searched scope. |
| AT-16 | Deleting all derived state and rebuilding produces the same canonical results. |
| AT-17 | Provider outage leaves Markdown recall usable. |
| AT-18 | Missing provider capability fails visibly. |
| AT-19 | A migration dry run changes nothing and an approved migration loses no file, link, or unchanged byte. |
| AT-20 | The owner confirms that the boot brief remembers the right things without showing too much. |

## 23. Architectural decision records

### ADR-001: Markdown and Git are canonical

- **Decision:** Approved Markdown is project truth. Git is the durable audit trail.
- **Reason:** The project remains readable, reviewable, portable, and independent of
  every agent, cache, database, and provider.
- **Rejected:** A database or vendor service as the only source of truth.

### ADR-002: The full architecture stays in the toolkit

- **Decision:** Adopting projects receive built behavior and project settings, not a
  copy of this document.
- **Reason:** Copying the architecture creates drift and does not improve startup.
- **Rejected:** Installing the full memory-system specification into every project.

### ADR-003: Host instructions are meaning-equivalent, not shape-identical

- **Decision:** Each host receives the required contract through files and hooks it
  can actually load. Checked copies protect shared meaning.
- **Reason:** Claude Code and Codex load project instructions differently.
- **Rejected:** A universal pointer that silently fails on a host that cannot follow
  it.

### ADR-004: SOUL.md is mandatory and narrow

- **Decision:** Every adopting project has a small identity file containing stable
  role and values only.
- **Reason:** Operating rules do not fully state whom the agent serves and what it
  must protect.
- **Rejected:** Tasks, status, project history, or detailed rules in SOUL.md.

### ADR-005: Startup uses authored or assembled context

- **Decision:** Startup files select and link approved source lines without
  model-written paraphrase.
- **Reason:** A fluent startup summary that drops a qualifier can mislead every
  session.
- **Rejected:** Model-generated current and recent summaries.

### ADR-006: Active work remains in its tracker

- **Decision:** The memory system renders small current and recent views but does not
  own status.
- **Reason:** A second status store becomes stale and violates one canonical home.
- **Rejected:** A permanent memory task list or default per-session status archive.

### ADR-007: Preserve the current taxonomy and add events

- **Decision:** Keep context, decisions, domain, knowledge, operations, planning, and
  references. Add events and one entity registry.
- **Reason:** Existing types route information clearly and events fill the historical
  state-change gap.
- **Rejected:** One broad facts folder, a relationship folder, or a graph as the
  primary record structure.

### ADR-008: Owner approval is required for current truth and pin state

- **Decision:** Specification changes, memory lifecycle changes, pinning, and
  unpinning require the five-bullet owner approval.
- **Reason:** A mechanically valid write can still preserve the wrong meaning or
  visibility.
- **Rejected:** Autonomous curation, delayed approval, and approval by a helper,
  hook, provider, or background process.

### ADR-009: Safety is mechanical

- **Decision:** Load-bearing safeguards use economics, refusal, or deterministic
  detection.
- **Reason:** Written instructions alone cannot reliably prevent duplicate, stale,
  or unsafe writes.
- **Rejected:** Treating rules that agents read as sufficient enforcement.

### ADR-010: Named lifecycle operations replace free-form writes

- **Decision:** NOOP, ADD, CONFIRM, CORRECT, SUPERSEDE, RETIRE, MERGE, and DELETE
  express record changes.
- **Reason:** Each operation can enforce the history and provenance behavior its
  meaning requires.
- **Rejected:** Free-form edits as the normal write path and update-or-merge guessing.

### ADR-011: Different provenance prevents merge

- **Decision:** Same-subject statements from different sources remain separate and
  paired.
- **Reason:** Source difference is information, not duplication.
- **Rejected:** Similarity-based automatic deduplication.

### ADR-012: Review is structurally read-only

- **Decision:** Review returns a worklist. Cleanup writes only through approved
  lifecycle and pin operations.
- **Reason:** The component most likely to over-merge or over-retire cannot have a
  hidden write path.
- **Rejected:** A background curator or reflection process with write access.

### ADR-013: File search is the baseline

- **Decision:** Markdown, the generated index, and repository search work in every
  project. Local full-text search is optional acceleration.
- **Reason:** Correctness must not depend on an installed database.
- **Rejected:** Mandatory SQLite and committed binary indexes.

### ADR-014: Optional retrieval requires measured benefit

- **Decision:** Any optional method must improve or preserve the project gold set.
  Methods that cross the privacy boundary also require recorded consent.
- **Reason:** More infrastructure is not evidence of better or safer retrieval.
- **Rejected:** Default embeddings, provider enablement by feature claim, or consent
  inferred from credentials.

### ADR-015: Providers are conformance-gated

- **Decision:** A provider is eligible only after it passes schema, project-scope,
  lifecycle, retrieval, privacy, outage, export, and rebuild tests.
- **Reason:** A common interface does not make destructive or silent behavior safe.
- **Rejected:** Treating all memory products as interchangeable.

### ADR-016: Session history is last-resort and read-only

- **Decision:** Search original local history in place only after current sources are
  insufficient or on owner request.
- **Reason:** Session history can recover wording but is incomplete, machine-scoped,
  and not current project truth.
- **Rejected:** Copying, committing, uploading, auto-injecting, or silently promoting
  transcripts.

### ADR-017: Retrieval changes require the gold set

- **Decision:** Each project measures retrieval with owner-worded questions and
  expected sources.
- **Reason:** Search quality must match how the owner actually asks.
- **Rejected:** Acceptance based only on benchmarks or product claims.

### ADR-018: Private host memory is never project truth

- **Decision:** Built-in private agent memory is not required, is not authoritative,
  and is disabled where the host allows it.
- **Reason:** It is machine-specific, invisible to Git, and not reliably shared.
- **Rejected:** A hidden second project store.

### ADR-019: Startup is byte-budgeted with required pins

- **Decision:** The boot brief has a configured byte budget. Pin admission and budget
  changes are validated before writing. Required content is never silently omitted.
- **Reason:** Startup must stay small without hiding owner-selected memory.
- **Rejected:** Unbounded injection, silent pin truncation, and post-startup discovery
  of a preventable budget conflict.

### ADR-020: Research evidence is rationale, not authority

- **Decision:** Prior research may explain choices but cannot create requirements or
  prove this implementation.
- **Reason:** The system must pass its own acceptance tests in a real project.
- **Rejected:** Treating private measurements as binding specification evidence or
  deleting all rationale and reopening settled choices.

### ADR-021: Pins store identity and approval, not copied meaning

- **Decision:** The project settings store record id, pin date, and approved summary
  hash. Startup reads the statement from the canonical record.
- **Reason:** This preserves one home for meaning and detects an unapproved summary
  change.
- **Rejected:** Duplicating pin text in a second file, making pins rules, and
  model-written pin summaries.

### ADR-022: Project scope uses a stable id

- **Decision:** A committed stable project id scopes pins, providers, caches, and
  session-history requests.
- **Reason:** Machine paths differ, and overlapping record ids must not leak across
  projects.
- **Rejected:** Filesystem path or provider account as project identity.

### ADR-023: Canonical writes use one coordinator

- **Decision:** Every approved lifecycle, specification, pin, and migration change
  uses concurrency checks, a recovery journal, regeneration, validation, and
  rollback.
- **Reason:** A multi-file write must not leave canonical and derived state
  disagreeing.
- **Rejected:** Independent file edits followed by best-effort repair.

### ADR-024: Privacy deletion reports the Git-history boundary

- **Decision:** Privacy deletion clears current and derived copies immediately and
  reports whether a separately approved Git-history purge remains.
- **Reason:** A normal deletion commit does not erase prior commits.
- **Rejected:** Claiming full erasure after deleting only the current file.

### ADR-025: Proactive reminders are deferred

- **Decision:** Proactive memory remains disabled and outside v2 acceptance.
- **Reason:** The core system must first prove startup, saving, retrieval, lifecycle,
  pinning, and migration behavior.
- **Rejected:** Quietly adding interruption behavior to the v2 build.

## 24. Functional requirement traceability

### Orientation and context

| Requirement | Architecture coverage | Acceptance proof |
| --- | --- | --- |
| FR-001 | Sections 7 and 10 define every required startup source, including pins and capabilities. | AT-01 |
| FR-002 | Section 10.4 defines the byte budget, degradation order, and admission checks. | AT-02 |
| FR-003 | Section 7.2 requires generated labels, inputs, and deterministic fingerprints. | AT-16 |
| FR-004 | Sections 7.2 and 10.3 prohibit startup paraphrase and preserve source text. | AT-01, AT-20 |
| FR-005 | Section 10.3 defines three updates in 72 hours and dated fallback. | AT-01 |
| FR-006 | Sections 7.1 and 10.3 define map meaning, ownership, generated state, and drift checks. | AT-01 |
| FR-007 | Sections 10 and 16 expose skills, tools, and capability inspection. | AT-01, AT-18 |
| FR-008 | Sections 10.5 and 20 define visible warnings and fail-open startup. | AT-01 |

### Placement and storage

| Requirement | Architecture coverage | Acceptance proof |
| --- | --- | --- |
| FR-009 | Section 13.1 defines the durable-information test before a save proposal. | AT-03 |
| FR-010 | Section 13.1 searches the tracker and every information owner first. | AT-03, AT-04 |
| FR-011 | Sections 4, 6, 7, and ADR-021 enforce one home and links. | AT-16 |
| FR-012 | Sections 6, 7, and ADR-006 keep active state in the tracker. | AT-01 |
| FR-013 | Sections 6 and 13 route behavior to rules or output style and processes to skills. | AT-04 |
| FR-014 | Sections 6 and 15.1 route approved behavior to specifications. | AT-13 |
| FR-015 | Sections 6 and 12.1 keep sources and derived conclusions separate and linked. | AT-13 |
| FR-016 | Sections 4, 7, 12, and ADR-001 keep durable memory in Git-tracked Markdown. | AT-16 |
| FR-017 | Sections 7.2, 7.3, 18, and 22 require complete rebuildability. | AT-16 |
| FR-018 | Sections 13, 20, and 21 refuse unneeded or unapproved secrets and sensitive information. | AT-04 |

### Approval, records, and lifecycle

| Requirement | Architecture coverage | Acceptance proof |
| --- | --- | --- |
| FR-019 | Section 13.2 defines separate five-bullet reviews and explicit approval. | AT-04 |
| FR-020 | Section 13.2 defines silence, ambiguity, and full-text requests as no approval. | AT-04 |
| FR-021 | Sections 13.2 and 21 deny approval and writes to helpers, hooks, providers, and background processes. | AT-04 |
| FR-022 | Section 12 defines permanent identity, kind, status, dates, provenance, approval, and summary. | AT-04 |
| FR-023 | Sections 12 and 12.1 require based_on evidence and explicit verification. | AT-13 |
| FR-024 | Section 14 defines every required lifecycle operation. | AT-03, AT-10, AT-11 |
| FR-025 | Sections 14 and 15 exclude obsolete records from current reads and preserve timelines. | AT-11 |
| FR-026 | Sections 14.2 and ADR-011 refuse merge across provenance. | AT-10 |
| FR-027 | Sections 14 and 14.4 constrain deletion and require a reason and audit evidence. | AT-16 |
| FR-028 | Section 13.3 coordinates canonical writes, views, indexes, validation, reporting, and rollback. | AT-16 |

### Retrieval

| Requirement | Architecture coverage | Acceptance proof |
| --- | --- | --- |
| FR-029 | Section 15.2 defines progressive tiers from loaded context to history and failure. | AT-13, AT-14 |
| FR-030 | Section 15.1 routes questions by information owner. | AT-13 |
| FR-031 | Section 15.2 defines the equal-relevance authority order. | AT-13 |
| FR-032 | Section 15.2 defines result layer, status, path or id, summary, provenance, and match reason. | AT-13 |
| FR-033 | Sections 15.2 and 20 preserve empty results and expose errors. | AT-15, AT-18 |
| FR-034 | Section 15.3 requires full-record and original-source expansion. | AT-13 |
| FR-035 | Section 15.5 mechanically gates session-history search. | AT-14 |
| FR-036 | Sections 15.5 and 15.6 scope a history miss to available project, machine, host, and dates. | AT-15 |
| FR-037 | Sections 16.3 and ADR-014 require measured benefit and privacy consent where content leaves the boundary. | AT-17 |
| FR-038 | Section 15.6 defines honest failure and searched scope. | AT-15 |

### Review and cleanup

| Requirement | Architecture coverage | Acceptance proof |
| --- | --- | --- |
| FR-039 | Section 17 gives review no write capability and returns a worklist. | AT-10 |
| FR-040 | Section 17 lists every required worklist category plus pin and provider health. | AT-10 |
| FR-041 | Section 17 prevents review from merging, retiring, rewriting, deleting, pinning, or unpinning. | AT-10 |
| FR-042 | Section 17 routes cleanup through approved lifecycle and pin operations. | AT-10 |
| FR-043 | Sections 12.1, 14.2, and 17 preserve and pair different-source records. | AT-10 |
| FR-044 | Section 17 defines focused and threshold-based deep review. | AT-10 |
| FR-045 | Section 17 states that age alone never deletes or retires. | AT-10 |

### Providers, privacy, and migration

| Requirement | Architecture coverage | Acceptance proof |
| --- | --- | --- |
| FR-046 | Sections 16.2 and 18 define provider conformance before enablement. | AT-17, AT-18 |
| FR-047 | Sections 8, 16.2, and 20 keep Markdown recall available during provider failure. | AT-17 |
| FR-048 | Sections 9, 16, and 21 enforce the recorded project privacy boundary. | AT-17 |
| FR-049 | Sections 15.2, 16.2, and 20 make missing capabilities visible errors. | AT-18 |
| FR-050 | Sections 10 and ADR-018 make private host memory unnecessary, non-authoritative, and disabled where possible. | AT-01 |
| FR-051 | Section 19 requires multi-signature detection, dry run, and stop on ambiguity or collision. | AT-19 |
| FR-052 | Section 19 requires preservation of existing text, links, and unchanged bytes. | AT-19 |
| FR-053 | Sections 12 and 19 preserve and report missing legacy metadata without invention. | AT-19 |
| FR-054 | Sections 13.3 and 19 require recovery and rollback until every check passes. | AT-19 |
| FR-055 | Sections 12 and 19 upgrade legacy records only when an approved edit touches them. | AT-19 |

### Pinned memory

| Requirement | Architecture coverage | Acceptance proof |
| --- | --- | --- |
| FR-056 | Section 11 defines project-local pin and unpin without moving the record or changing it into a rule. | AT-05, AT-07 |
| FR-057 | Sections 11.1, 11.3, and 13.2 reserve pin approval for the owner. | AT-05 |
| FR-058 | Sections 10.2, 10.4, and 11 render every valid project pin before substantive work. | AT-05 |
| FR-059 | Sections 10.2 and 11.2 render the exact approved summary and canonical link. | AT-05 |
| FR-060 | Sections 11 and 15 preserve source authority and treat pins as visibility only. | AT-05, AT-13 |
| FR-061 | Sections 11.3 and 11.4 define unpin, supersession, retirement, correction, and no automatic successor pin. | AT-07, AT-08 |
| FR-062 | Sections 9, 11.5, 16.2, and ADR-022 enforce project scope. | AT-06 |
| FR-063 | Sections 10.4 and 11.1 prevent silent omission and produce a visible budget review. | AT-09 |
| FR-064 | Sections 11 and 15 keep model ranking separate from pin state, truth, provenance, authority, and status. | AT-05, AT-13 |

### Deferred capability

Proactive reminders have no numbered functional requirement. Section 3.2 and ADR-025
keep them disabled and outside v2 acceptance.

## 25. Completion conditions for implementation planning

Before implementation work is split into build tickets:

- every component in section 8 has an owner and package destination;
- every tool in section 16.1 has an interface contract and error contract;
- every test in section 22 maps to one or more automated or witnessed checks;
- the project settings and record schemas have versioned validators;
- the two supported hosts have startup adapter designs;
- the baseline file-search path works without an optional provider;
- the pin budget and cross-project tests exist before pin operations ship;
- migration has dry-run and rollback fixtures from current v1 projects; and
- the work tracker carries implementation status, dependencies, and decisions made
  during the build.

No implementation ticket may weaken an FR. A necessary architecture change updates
this document and its ADR before the change is built.

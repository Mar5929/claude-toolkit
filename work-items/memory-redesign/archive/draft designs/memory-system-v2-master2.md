# Universal project memory system v2

This specification defines the approved v2 design for a portable project memory system that keeps agents oriented, keeps project knowledge trustworthy, and works across Claude Code, Codex, and future compatible agents.

**Status:** Approved by Mike Rihm on 2026-08-17.

**Authority:** This file is the approved v2 design deliverable for the memory redesign work item. It does not replace the current memory-system specification or authorize implementation or migration.

## 1. Goal

A new agent with no earlier chat context must be able to start useful work in its first exchange. It must know:

- who it is in this project;
- how it must work and communicate;
- what the project is and what it is trying to achieve;
- what is true now;
- what work is active and what happened recently;
- where each kind of information belongs;
- what memory tools and skills are available;
- how to retrieve evidence;
- how to save, correct, supersede, retire, merge, and remove memory safely;
- what must not be stored; and
- how to say that reliable evidence was not found.

The system must prevent two failures at the same time:

- **Amnesia:** every new session starts as a stranger and repeats old work.
- **Rot:** too much gets saved, copies drift, and old or weak claims look current.

The agent must start oriented, but not overloaded. Stable context is loaded at startup. Historical detail is retrieved only when the task needs it.

## 2. Inputs and final merge choices

This document consolidates:

- `agent1design-universal-project-memory-system-spec-v2.md`, called the broad design below;
- `agent2design-memory-system-v2.md`, called the mechanical design below; and
- the current `knowledge/specs/memory-system.md`, used as the approved baseline and migration source.

The broad and mechanical designs agree on the main goal. They differ mainly in how much behavior is enforced and how much infrastructure is required.

| Area | Broad design | Mechanical design | Final choice |
| --- | --- | --- | --- |
| Main strength | Complete conceptual map | Enforceable behavior and tests | Keep the broad map and use mechanical safeguards where failure would damage trust |
| Project layout | Root `context/`, `specs/`, `memory/`, and `sessions/` | One `knowledge/` root plus local `.memory/` cache | Keep one `knowledge/` root because the toolkit already uses it |
| Root instructions | `AGENTS.md` is primary and `CLAUDE.md` points to it | Same thin-pointer model | Deliver the same required meaning in host-specific files; use a checked copy when a host cannot follow a pointer |
| Agent identity | `SOUL.md` is mandatory | `SOUL.md` is mandatory | Keep a small mandatory `SOUL.md` |
| Current and recent context | May be AI-generated | Assembled from authored source lines | Use deterministic assembly only; no model-written startup summary |
| Folder map | Required meaning map | Generated map | Keep a small authored map with a structural drift check |
| Memory folders | Facts, decisions, events, entities, relationships, sources | Facts, decisions, events, references, procedures, entity registry | Preserve the toolkit's clearer memory types, add `events/`, and use one entity registry |
| Provenance | Required and typed | Required, immutable, and validated | Use the stricter mechanical model |
| Lifecycle | ADD, NOOP, CORRECT, SUPERSEDE, RETIRE, DELETE | Adds CONFIRM, MERGE, refusal rules, and retirement checks | Use the full mechanical lifecycle with owner approval |
| Retrieval | Keyword plus semantic retrieval | FTS first, agent query writing, embeddings off by default | Use file search as the baseline, optional local FTS cache, and embeddings only after approved need and consent |
| Providers | Broadly interchangeable | Must pass conformance tests | Providers are interchangeable only after they pass the contract |
| Session history | Summaries then transcripts | Pointer-only cards then transcripts | Active work remains in its tracker; session cards are allowed only when they are the configured tracker bridge |
| Save timing | General write protocol | Immediate at-risk capture plus wrap-up | Propose at-risk information immediately, but never write current truth without approval |
| Approval | Not fully defined | `approve` or autonomous `curate` mode | Owner approval is always required for specification and memory changes |
| Maintenance | Reflection may propose repairs | Review is read-only and cleanup uses lifecycle tools | Review is always read-only; approved cleanup performs writes |
| Validation | Mostly principles | Schema, links, retirement, retrieval, migration, and provider tests | Keep the full validation battery, limited to claims a deterministic check can prove |
| Research evidence | Generic examples, including personal health examples | Private research findings and measured claims | Keep public, generic rationale only; do not treat unverified private measurements as specification authority |

## 3. Governing principles

1. **One canonical home.** Each meaning has one current owner. Other places link to it.
2. **Markdown and Git own truth.** Generated views, indexes, databases, and provider stores are replaceable aids.
3. **Approval before current truth.** No specification or memory write becomes current without Mike's explicit approval.
4. **Rules are not memory.** Rules say how agents act. Memory says what happened, what was decided, or what is worth knowing.
5. **Active work is not memory.** Status, blockers, assignments, and next steps stay wherever the work item is tracked.
6. **Specs and observed state differ.** A spec says what should be true. Code, configuration, and runtime evidence show what is true now.
7. **Provenance stays beside the claim.** A source is required and never upgraded by repetition.
8. **NOOP is healthy.** Most session activity should not become durable memory.
9. **Mechanics protect trust.** Refuse unsafe writes, make correct writes easy, and validate what can be checked.
10. **Retrieval is progressive.** Exact and current sources come before fuzzy search and old conversations.
11. **Generated views never become authority.** They may point to current sources but cannot replace them.
12. **Failure is explicit.** When reliable evidence is missing, the agent says so.

## 4. Information and authority architecture

The system has ten distinct information owners. These are not interchangeable.

| Layer | Canonical home | Question it answers | Startup use |
| --- | --- | --- | --- |
| Host operating contract | `AGENTS.md`, `CLAUDE.md`, host system prompt | How must this agent operate here? | Always loaded by the host or read first |
| Agent identity | `SOUL.md` | Who is the agent in this project and what must it protect? | Always read |
| Detailed behavior | Rules, skills, and output style | What process or behavior applies to this task? | Routed at startup, loaded when relevant |
| Project orientation | `knowledge/project.md` and `knowledge/map.md` | What is this project and where does work live? | Always read or rendered into the boot brief |
| Active work | The configured work tracker | What is in progress, blocked, assigned, or next? | Small current and recent view only |
| Approved behavior | `knowledge/specs/` | What should the product or system do? | Retrieved when the task touches that behavior |
| Implemented state | Code, configuration, tests, deployed state | What actually exists now? | Retrieved when needed |
| Durable project knowledge | `knowledge/memory/` | What happened, what was decided, what do we know, and why? | Index only, then task-driven retrieval |
| External and raw source material | Client artifact folders, references, brainstorms | What did an outside source say, or what is still unchecked? | Never loaded wholesale |
| Session history | Host session history | What was actually said in a past conversation? | Last-resort search only |

There is no single authority order for every question:

- For **what should happen**, the current approved specification leads.
- For **what exists**, inspect code, configuration, tests, or the target system.
- For **why a choice was made**, inspect the decision record and its evidence.
- For **what is active**, inspect the work tracker.
- For **what a source said**, inspect the original source.
- For **what was discussed**, search session history only after current project sources are insufficient or when the owner asks.

When two current sources disagree, the agent shows the conflict. It does not silently choose the answer that seems most likely.

## 5. Required project layout

Every adopting project uses this conceptual layout. A host may require a different physical name, but it must preserve the same owners and routes.

```text
project/
  AGENTS.md
  CLAUDE.md
  SOUL.md
  rules/
  skills/
  knowledge/
    project.md
    map.md
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
```

The active work tracker and client delivery folders remain where the project already owns them. The system points to them. It does not copy them into `knowledge/`.

The memory-system implementation specification remains in this toolkit. Adopting projects receive the built rules, skills, templates, and tools. They do not receive a copy of this full specification. Their own `knowledge/specs/` folder holds their product and system specifications.

### Authored files

- `SOUL.md` defines the stable project role, whom the agent serves, what it protects, and what it must not claim.
- `knowledge/project.md` defines the project purpose, users, boundaries, main workstreams, completion state, roadmap summary, and work tracker.
- `knowledge/map.md` gives one plain line for each major folder or component. It identifies canonical, generated, and do-not-edit areas.
- `knowledge/crib.md` maps the owner's common words to project terms. It is small and reviewed.
- `knowledge/gold-set.md` contains retrieval questions and the files expected to answer them.

### Generated files

- `knowledge/current.md` is assembled from the current work tracker and current source records.
- `knowledge/recent.md` is assembled from recent work tracker updates and configured handoff sources.
- `knowledge/index.md` is generated from current specifications and memories.

Each generated file must name its inputs, build time, and do-not-edit status. A generator places source text and links. It does not write a new interpretation.

### Local cache

`.memory/` is gitignored and disposable. It may contain a search index, working set, capability cache, and local retrieval metrics. Deleting it must not delete project knowledge or session history.

## 6. Agent context at startup

### 6.1 Host delivery

The required meaning is the same for every agent. The delivery method may differ.

| Host | Delivery |
| --- | --- |
| Claude Code | `CLAUDE.md`, automatically loaded `.claude/rules/`, and a fail-open startup hook |
| Codex | `AGENTS.md`, plus a native startup hook when available |
| Other agent | A tested adapter that supplies the same contract and boot brief |

The system must not assume that one root file can import another. If a host cannot follow a pointer, the required shared block is copied and a test checks that the copies match. Host-specific details may differ outside that shared block.

`SOUL.md` is short and mandatory. It contains identity and values only. It never contains today's task, current status, historical facts, or a long rule list.

### 6.2 Boot brief

The startup loader renders these slots in order:

1. **Identity and operating route:** the `SOUL.md` summary, the host contract, and which detailed rules to load.
2. **Project:** project purpose, main goal, current phase, and active work tracker.
3. **Owner working contract:** only authored behavior already owned by rules or the output style. It is linked, not copied into memory.
4. **Where work stopped:** the latest authored handoff line and its work-item link.
5. **Current state:** current focus, active work, blockers, recently landed state, and likely next actions.
6. **Recent window:** at most three meaningful updates from the last 72 hours. If none exist, show the latest dated update and mark its age.
7. **Project map:** one line per major folder or component.
8. **Memory contract:** the save test, exclusions, available skills and tools, and retrieval ladder.
9. **Warnings:** stale generated views, validation failures, or unavailable sources, shown as counts and links.

The default rendered budget is 10 KB. The project may lower it, but it may not remove identity, project purpose, the latest handoff, or the memory tool route.

When the brief is too large, remove detail in this order:

1. warning detail becomes a count and link;
2. older recent items become a count and link;
3. unchanged current areas become a count and link;
4. the folder map keeps only major folders.

The loader warns and continues. Startup never blocks because a view is missing, stale, or too large.

### 6.3 Current, recent, and map behavior

`current.md` and `recent.md` are assembled, not summarized. Their generators may select, sort, label, and link authored lines. They may not paraphrase facts, numbers, decisions, or failure reasons.

`map.md` is authored because folder meaning cannot be derived safely from names alone. A structural check compares its listed top-level paths with the repository and reports missing, renamed, or undocumented areas.

The recent view is continuity, not durable memory. A fact, decision, number, date, or qualifier may not exist only in the recent view.

## 7. Functional requirements

### Orientation and context

- **FR-001:** A cold session must receive the host operating contract, `SOUL.md`, project overview, current view, recent view, project map, and memory capability route before substantive work starts.
- **FR-002:** The startup content must fit the configured budget and degrade by pointer and count instead of blocking.
- **FR-003:** `current.md`, `recent.md`, and `index.md` must identify themselves as generated and list their inputs.
- **FR-004:** Generated startup views must not contain model-created paraphrases.
- **FR-005:** The recent window must default to three meaningful updates from the last 72 hours and label older fallback content with its date.
- **FR-006:** The project map must explain folder meaning, ownership, generated state, and search route.
- **FR-007:** The root instructions must tell the agent what memory skills and tools exist and how to inspect current capabilities.
- **FR-008:** Missing startup sources must produce a visible warning and a usable session.

### Placement and storage

- **FR-009:** Every persistent item must pass the persistent-information test before a save is proposed.
- **FR-010:** The save flow must search the active work tracker, rules, skills, specifications, memories, and references before choosing a home.
- **FR-011:** One meaning must have one canonical home. Other files must link instead of restating it.
- **FR-012:** Active work state must remain in the configured work tracker.
- **FR-013:** Standing agent behavior must live in rules or the output style, and reusable agent processes must live in skills.
- **FR-014:** Approved product behavior must live in specifications.
- **FR-015:** External source material and conclusions drawn from it must remain separate and linked.
- **FR-016:** Durable memory must remain readable Markdown tracked by Git.
- **FR-017:** Generated views and local indexes must be rebuildable from canonical sources.
- **FR-018:** Secrets, credentials, and private personal information must be refused.

### Approval, records, and lifecycle

- **FR-019:** The main agent must show separate What, Where, Why, Assumptions, and Unverified bullets for each proposed specification or memory change.
- **FR-020:** No reply, an unclear reply, or a request to see full text must not count as approval.
- **FR-021:** A helper agent, hook, background process, or provider must not approve or silently write current project knowledge.
- **FR-022:** Every durable record must have a permanent id, type, status, dates, provenance, and one-sentence summary.
- **FR-023:** An inference must list the evidence it is based on and remain labeled as an inference until explicitly verified.
- **FR-024:** The system must support NOOP, ADD, CONFIRM, CORRECT, SUPERSEDE, RETIRE, MERGE, and DELETE.
- **FR-025:** SUPERSEDE and RETIRE must remove obsolete records from current retrieval without erasing history.
- **FR-026:** MERGE must be refused when provenance differs.
- **FR-027:** DELETE must be limited to duplication surplus, corruption, privacy removal, or accidental records and must require a reason.
- **FR-028:** An approved write must update its Markdown source, generated index, affected views, and search cache as one reported operation.

### Retrieval

- **FR-029:** Retrieval must start with already-loaded context, then exact lookup, then curated search, then relationship or timeline expansion.
- **FR-030:** Search must route by question type: specs for expected behavior, decisions for rationale, events for history, the tracker for active work, and transcripts for exact past wording.
- **FR-031:** Current specifications and primary sources must rank above derived or unchecked memories when relevance is otherwise equal.
- **FR-032:** Search results must include their layer, status, path, one-sentence summary, provenance, and score or match reason.
- **FR-033:** Empty search results must remain empty. The system must not substitute recent but unrelated content.
- **FR-034:** Consequential answers must expand the record and follow provenance to original evidence.
- **FR-035:** Session-history search must run only when current project sources are insufficient or when the owner asks for it.
- **FR-036:** A session-history miss must be scoped to the machine, project, date range, and available history.
- **FR-037:** Embeddings or an external retrieval service must remain off until the project records both consent and a measured retrieval need.
- **FR-038:** The final retrieval tier must return an honest failure instead of a plausible invention.

### Review and cleanup

- **FR-039:** Memory review must be structurally read-only and return a worklist.
- **FR-040:** The worklist must cover duplicate candidates, conflicts, stale review dates, broken links, supersession gaps, retired phrases, tag problems, and retrieval-test failures.
- **FR-041:** Review must not merge, retire, rewrite, or delete records.
- **FR-042:** Cleanup must use the normal approval review and lifecycle tools for every change.
- **FR-043:** Different-source statements about the same subject must remain separate and be linked as a pair.
- **FR-044:** A focused review must run after an approved save; a deep review runs only on request, after migration, or when a concrete backlog threshold is crossed.
- **FR-045:** Age alone must never delete or retire memory.

### Providers, privacy, and migration

- **FR-046:** A retrieval provider must pass the memory contract before it can be enabled.
- **FR-047:** Provider failure must not make canonical Markdown unavailable.
- **FR-048:** A provider must not send project content outside the approved privacy boundary.
- **FR-049:** A missing provider method must fail loudly. It must not silently return an empty result.
- **FR-050:** Built-in private agent memory must remain disabled for project truth.
- **FR-051:** Migration must detect the source layout by multiple signatures, run a dry check, and stop on ambiguity or collision.
- **FR-052:** Migration must preserve existing text and links unless a change is explicitly approved.
- **FR-053:** Missing metadata must be shown as missing. Migration must not invent it.
- **FR-054:** A migration must be reversible until the new layout, links, views, and checks pass.
- **FR-055:** Existing records may upgrade to the v2 schema when next edited instead of through a risky bulk rewrite.

## 8. What belongs in memory

An item may become persistent project knowledge only when all four questions are resolved:

1. Will it still matter after the current task or session?
2. Is it a stable fact, lasting event, decision, or state?
3. Does an existing work item, rule, skill, specification, memory, or reference already own it?
4. Would leaving it out cause the owner to repeat an explanation or cause a future agent to repeat the same wrong action?

Questions 1, 2, and 4 must be yes. Question 3 must identify the existing owner or prove that a new home is needed.

Difficulty, novelty, effort, and conversation length do not make an item persistent.

### Routing table

| Information | Canonical home |
| --- | --- |
| Work-item goal, requirements, decisions, status, blockers, and next action | Configured work tracker |
| Standing agent behavior or communication requirement | Rules or output style |
| Reusable agent workflow | Skill |
| Approved product or system behavior | `knowledge/specs/` |
| Persistent circumstance, stakeholder, boundary, or outside constraint | `knowledge/memory/context/` |
| Non-obvious choice and its rationale | `knowledge/memory/decisions/` |
| Project-specific term or business rule | `knowledge/memory/domain/` |
| Meaningful project or domain state change | `knowledge/memory/events/` |
| Non-obvious conclusion that prevents repeated investigation or error | `knowledge/memory/knowledge/` |
| Project-specific operating, release, or recovery procedure | `knowledge/memory/operations/` |
| Persistent goal, roadmap, milestone, risk, or assumption | `knowledge/memory/planning/` |
| External source note and what it supports | `knowledge/memory/references/` |
| Stable concept id and aliases | `knowledge/memory/entities.md` |
| Raw client material | Client or delivery artifact folder |
| Internal exploration and unchecked ideas | `knowledge/brainstorms/` |
| Past conversation | Session history |

### Meaningful events

An event changes the historical state of the project or its domain. Examples include an approved requirement change, release, completed migration, incident, deprecated dependency, disproved assumption, or important experiment result.

Tool calls, files opened, ordinary test runs, routine errors, and the number of files changed are agent activity. They are not project events.

The test is: would someone working here six months from now care that this happened?

## 9. Record model and provenance

Every v2 memory uses this core shape:

```yaml
---
id: decision-auth-004
type: context | decision | domain | event | knowledge | operation | planning | reference
status: active | superseded | retired
recorded_at: 2026-08-17
effective_at: 2026-08-17
valid_until: null
session: session-id-or-unavailable
source:
  type: owner_statement | owner_approved_decision | client_statement | client_document | source_code | git_commit | issue | pull_request | web_source | research_paper | agent_observation | agent_inference
  path: null
  url: null
  retrieved_at: null
based_on: []
tags: [authentication]
entities: [authentication, keychain]
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

The full meaning, rationale, evidence links, and any claim-level source markers follow.
```

### Required behavior

- `id` is permanent and unique.
- `type`, `status`, `recorded_at`, `source.type`, `session`, and the one-sentence summary are required.
- `effective_at` records when the statement became true, when known.
- `based_on` is required and non-empty for `agent_inference`.
- `source` is immutable. Verification creates an audited correction; it does not rewrite history silently.
- A claim from another source carries its own source marker beside that claim.
- A negative claim names the scope searched, such as "not found in `src/` and current specs." It never becomes an absolute "does not exist" without evidence.
- `paired_with` links same-subject statements from different sources. Both links must be present.
- More than three tags creates a validation warning. Tags describe subjects, not record types or provenance.
- Existing v1 records keep their current shape until an approved edit upgrades them.

## 10. Memory lifecycle

| Operation | Meaning | Required behavior |
| --- | --- | --- |
| NOOP | Store nothing | Expected for transient, repeated, weak, or misplaced information |
| ADD | New persistent meaning | Refuse duplicate ids; warn about likely duplicate meaning |
| CONFIRM | Existing meaning is still true | Add a confirmation date without rewriting the record |
| CORRECT | The record was wrong | Replace current wording and preserve the previous wording in history and Git |
| SUPERSEDE | The record was true but a new state replaces it | Create the new record and write both links and dates |
| RETIRE | The record is no longer active and has no direct successor | Require a reason and search for current copies of the retired wording |
| MERGE | Duplicate records with the same meaning and provenance become one | Refuse if provenance differs; preserve both originals in history |
| DELETE | Remove an accidental, corrupt, duplicate-surplus, or privacy-sensitive record | Require a reason and a visible Git change; refuse ordinary historical cleanup |

Retired and superseded records remain available for timeline and audit questions. They do not appear as current truth in startup or normal search.

Retirement records may list exact phrases that must no longer appear as current truth. The cleanup tool searches tracked files and reports every surviving use. It does not edit those files until approval.

## 11. Save protocol

When new information appears, the main agent follows this order:

```text
new information
  -> search the work tracker and existing owners
  -> does it belong in a work item, rule, skill, spec, source folder, or session history?
  -> if memory is still the right home, apply the persistent-information test
  -> choose NOOP or classify the memory type
  -> identify provenance and entities
  -> search duplicate meaning and timeline
  -> choose ADD, CONFIRM, CORRECT, SUPERSEDE, RETIRE, MERGE, or DELETE
  -> show What, Where, Why, Assumptions, and Unverified
  -> wait for keep, change, or skip
  -> write only the approved meaning
  -> rebuild affected views and cache
  -> validate and report changed paths
```

At-risk information is proposed when it appears. At-risk means an owner statement, approved decision, discovered constraint, disproved assumption, or other item that would be costly to lose if the session ended now.

If approval does not arrive, no memory is written and no hidden queue is kept. Active information remains in the work tracker or handoff.

## 12. Skills, tools, and discovery

### Human-facing skills

The system exposes four focused skills:

- **remember:** routes information, applies the save test, gets approval, performs the lifecycle operation, and validates the result;
- **recall:** loads the small map, searches current project sources, follows provenance, and reports conflict or failure honestly;
- **cleanup:** runs read-only review, presents repair choices, and performs only approved lifecycle operations; and
- **session-search:** searches local host session history after current project sources are insufficient or when the owner asks.

### Provider-independent tool surface

```text
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
spec_search(query, filters)
spec_get(id_or_path)
session_search(query, scope, empty_token)
memory_rebuild()
memory_validate()
```

`memory_capabilities()` is the first tool call made by the startup loader. It returns:

- provider name and version;
- available operations;
- approval mode, which must be `owner-approved` for this toolkit;
- search modes currently enabled;
- privacy boundary and whether any data may leave the machine;
- index state and last rebuild time;
- configured work tracker and session-history scope; and
- any degraded or unavailable feature.

The boot brief lists the four skills and the capability result in plain words. The agent never has to guess which memory operations exist.

When no provider is installed, the system uses Markdown, the generated index, and repository search as the fallback. Reads continue. Writes still go through `remember` and the same approval contract.

## 13. Retrieval protocol

### Tier 0: already loaded

Use the boot brief. If it answers the question, stop.

### Tier 1: exact lookup

Use `memory_get`, `spec_get`, or `memory_timeline` when an id, path, or entity is known.

### Tier 2: curated project search

Search specifications, current memory, procedures, and source metadata. Use type, status, entity, tag, and date filters.

The baseline search uses the generated index and file search. An approved local provider may build a disposable SQLite FTS index under `.memory/`. The agent writes a structured query using project terms and `crib.md` aliases. Blind synonym expansion is not allowed.

At equal relevance, rank sources in this order:

1. current approved specification or original source;
2. current owner or client statement;
3. source code, Git, issue, or pull request evidence;
4. active decision, event, or other memory;
5. agent observation;
6. agent inference or unchecked brainstorm.

### Tier 3: relationship and timeline expansion

Expand around linked entities, paired facts, superseded records, successor records, related decisions, events, specifications, and nearby dates.

### Tier 4: active work and handoff search

Search the configured work tracker and its recent updates for continuity questions.

If a project cannot expose tracker history, it may configure pointer-only session cards as its tracker bridge. A card contains dates, work-item links, memory ids, and one authored handoff line. It may never be the only home of a fact, decision, number, date, or qualifier.

### Tier 5: session-history search

Search the host's original local session history only when Tier 2 and Tier 4 did not answer or when the owner asks. The search tool requires an emptiness token from the earlier tiers so this order is mechanical.

Session history is searched in place. It is not copied, committed, uploaded, promoted, or auto-injected. A result identifies the project, session, date, role, resume command, and a small excerpt. The agent opens the exact conversation segment before relying on it.

### Tier 6: honest failure

The agent says:

> I could not find reliable evidence for this in the current project sources or the available session history.

It names the scope searched and any unavailable source.

### Retrieval quality

- A parse failure is an error, not an empty result.
- An empty result does not fall back to unrelated recent content.
- Search results locate evidence. They do not replace the full record or original source.
- Results used in a conversation form a local working set so follow-up answers use the same evidence.
- Embeddings remain disabled by default. Enabling them requires a recorded decision, privacy approval, and a gold-set failure that lexical search, aliases, and reranking did not solve.

## 14. Review, reflection, cleanup, and deduplication

`memory_review` is read-only by design. It returns a worklist with:

- exact and near duplicate candidates;
- same-subject records with different provenance that should be paired, not merged;
- current records that conflict;
- missing or invalid provenance;
- stale `review_after` dates;
- broken ids or one-sided links;
- missing supersession pointers;
- current copies of retired phrases;
- unused, overlapping, or overgrown tags;
- records that no longer pass the save test;
- stale generated views;
- retrieval gold-set failures; and
- provider or cache health failures.

The review may explain and recommend. It may not write.

`cleanup` takes the worklist, groups each proposed meaning separately, shows the five approval bullets, and calls the normal lifecycle tools for approved changes.

Deduplication rules are strict:

- Same meaning and same provenance may be merged after approval.
- Same subject and different provenance must remain separate and be paired.
- Similar wording is not enough to merge.
- A newer date is not enough to retire an older record.
- Generated views are rebuilt, never merged into canonical memory.

A focused review runs after each approved save. A deep review runs on request, after migration, or when a configured warning backlog is reached. No cron job, background model, or silent curator changes memory.

## 15. Retrieval provider architecture

The agent talks to one stable memory protocol. Providers implement that protocol.

The reference baseline is Markdown plus repository search. A local SQLite FTS cache is an optional acceleration layer. External stores, vector databases, and future providers are allowed only when they pass conformance.

A provider must:

- preserve the full record schema and provenance as queryable fields;
- support active, superseded, and retired state without hard deletion;
- refuse merges across different provenance;
- export every record back to the canonical Markdown shape;
- keep canonical Markdown available when the provider fails;
- honor the project's privacy boundary;
- never enable external transfer from an environment variable alone;
- fail loudly when a required operation is missing; and
- pass round-trip, lifecycle, retrieval, privacy, and failure tests.

The provider seam changes how information is found. It does not redefine what belongs in memory, who approves it, or which source is authoritative.

## 16. Validation and acceptance

### Deterministic validation

The validator checks:

1. required files and startup routes;
2. record schema, allowed values, unique ids, and required provenance;
3. non-empty `based_on` for inference;
4. link integrity for pairing and supersession;
5. retired phrases and recorded exemptions;
6. generated-view age and input hashes;
7. map coverage for major folders;
8. tag vocabulary and usage;
9. no index chunk beginning inside a record;
10. no card as the sole home of a fact;
11. index and cache rebuild consistency;
12. provider export and re-import round trips;
13. migration file counts, links, and byte preservation; and
14. the retrieval gold set.

The validator does not claim to understand semantic truth. It cannot prove that an unquoted paraphrase contradicts a source. Meaning conflicts remain an agent review task and an owner decision.

### Gold set

Each project keeps about ten owner-phrased retrieval questions with expected source files. At least eight must appear in the first five results. The set must include:

- one question using the owner's own wording rather than project terms;
- one exact id or identifier question;
- one decision-rationale question;
- one timeline question;
- one question that must return no result; and
- one token containing punctuation, a hyphen, or digits.

Any retrieval change must run the set. A provider or embedding feature is not accepted because it sounds more capable. It must improve or preserve measured retrieval.

### End-to-end acceptance

The system is accepted only when all of these are proven:

- A cold Claude Code session and a cold Codex session both receive the required contract and boot brief.
- The first response reflects the project goal, current state, recent handoff, map, and owner working contract without re-explanation.
- The startup brief stays inside its budget and degrades safely.
- A transient tool call produces NOOP.
- A new persistent fact cannot be written without the five-bullet approval.
- A different-source fact pair survives review and cleanup unchanged.
- A superseded record disappears from current results and remains available in its timeline.
- A retired phrase is found wherever it still appears as current text.
- A consequential recall follows provenance to its original source.
- Session search cannot run before current project sources fail or the owner requests it.
- An unanswerable question reaches honest failure.
- Deleting `.memory/` and rebuilding produces the same canonical results.
- A provider outage leaves Markdown recall usable.
- A migration dry run makes no changes, and an approved migration loses no file or link.
- The owner reads the boot brief and confirms that it feels like the project remembers the right things without showing too much.

## 17. Migration from the current system

Migration is additive, approved, and reversible.

### Phase 1: context and discovery

- Add `SOUL.md`, `knowledge/map.md`, generated `current.md` and `recent.md`, `crib.md`, and `gold-set.md`.
- Add `memory_capabilities()` and the boot brief without changing existing memory files.
- Keep the current four skills and current source values working.

### Phase 2: lifecycle and schema

- Add permanent ids, status, dates, entities, source objects, and lifecycle tools.
- Add `events/` and `entities.md`.
- Upgrade old records only when an approved edit touches them.

### Phase 3: retrieval and validation

- Add the progressive retrieval API, working set, gold-set runner, and provider conformance tests.
- Keep file search as the baseline.
- Enable a local FTS cache only after the file baseline passes.

### Phase 4: project adoption

- Detect each project's existing layout by multiple signatures.
- Run a dry report and show every ambiguous field, collision, and link change.
- Migrate only after project-specific approval.
- Remove retired runtime pieces only after the new routes and checks pass.

Rollback removes generated files, local cache, and new runtime wiring. It does not erase approved Markdown or rewrite Git history.

## 18. Architectural decision records

### ADR-001: Markdown and Git remain canonical

- **Decision:** Committed Markdown is project truth. Git is the audit trail.
- **Why:** It is portable, reviewable, mergeable, and independent of an agent or provider.
- **Rejected:** A database or vendor service as the only source of truth.

### ADR-002: The full system specification stays in the toolkit

- **Decision:** Adopting projects receive built behavior, not a copy of this specification.
- **Why:** Copying the full policy creates drift without helping startup.
- **Rejected:** Installing the v2 system specification into every project.

### ADR-003: Root instructions are host-specific but meaning-equivalent

- **Decision:** `AGENTS.md` and `CLAUDE.md` use the delivery shape each host can actually load. Required shared meaning is tested for drift.
- **Why:** Codex cannot follow a `CLAUDE.md` pointer, while Claude Code loads different files automatically.
- **Rejected:** A universal thin pointer that silently fails on some hosts.

### ADR-004: `SOUL.md` is required and narrow

- **Decision:** Every adopting project has a small identity file.
- **Why:** Operating rules do not fully answer whom the agent serves or what stable values it must protect.
- **Rejected:** Storing tasks, history, or detailed rules in `SOUL.md`.

### ADR-005: Startup uses authored and assembled context

- **Decision:** Project, map, identity, and owner behavior are authored. Current, recent, and index views are assembled from authoritative lines.
- **Why:** Startup is the worst place for a fluent summary that dropped a qualifier.
- **Rejected:** AI-generated current or recent summaries.

### ADR-006: Active work remains in its tracker

- **Decision:** The memory system renders a small view of active work but does not own the status.
- **Why:** Duplicated status becomes stale and breaks the one-home rule.
- **Rejected:** A separate memory task list or permanent session-status archive.

### ADR-007: Preserve the current memory taxonomy and add events

- **Decision:** Keep context, decisions, domain, knowledge, operations, planning, and references. Add events and one entity registry.
- **Why:** These names route information more clearly than one broad facts folder, while events fill a real gap.
- **Rejected:** A full entity graph or separate relationship folder as the primary structure.

### ADR-008: Owner approval is always required

- **Decision:** Every specification or memory change uses the short five-bullet approval.
- **Why:** A write that is technically safe can still preserve the wrong meaning or put it in the wrong home.
- **Rejected:** Autonomous curate mode for this toolkit.

### ADR-009: Lifecycle tools enforce source-aware history

- **Decision:** All writes use named operations. Merge across different provenance is refused.
- **Why:** Similar wording from different sources can represent an important fact pair, not duplication.
- **Rejected:** Free-form file edits as the normal write path and automatic semantic deduplication.

### ADR-010: Review is read-only

- **Decision:** Reflection and review produce a worklist only. Cleanup performs approved actions.
- **Why:** The component most likely to over-merge must not have write access.
- **Rejected:** A background curator that rewrites memory.

### ADR-011: File search is the baseline; local FTS is optional

- **Decision:** Every project works with Markdown, the index, and repository search. A disposable SQLite FTS cache may accelerate larger projects.
- **Why:** Small projects should not need a database, while larger projects still get tested search performance.
- **Rejected:** Requiring SQLite for correctness or committing its binary files.

### ADR-012: Embeddings require need and consent

- **Decision:** Embeddings are off by default and enabled per project only after a gold-set gap and privacy approval.
- **Why:** Project content must not leave its boundary for an unproven retrieval benefit.
- **Rejected:** Automatic enablement through an environment variable.

### ADR-013: Providers are conformance-gated

- **Decision:** A provider is swappable only after it proves schema, lifecycle, privacy, export, and retrieval behavior.
- **Why:** A common interface does not make unsafe behavior equivalent.
- **Rejected:** Treating every memory product as interchangeable.

### ADR-014: Session history is a last-resort, read-only source

- **Decision:** Search original local history in place after current sources fail or on owner request.
- **Why:** Conversations can recover missing evidence, but local history is incomplete and not current truth.
- **Rejected:** Copying, committing, auto-injecting, or silently promoting transcripts.

### ADR-015: Retrieval changes require a gold set

- **Decision:** Each project keeps owner-phrased questions and expected sources.
- **Why:** Search quality must be measured against the way the owner actually asks.
- **Rejected:** Declaring a provider better from feature claims alone.

### ADR-016: Built-in private agent memory is not project truth

- **Decision:** Vendor auto-memory remains disabled for project knowledge.
- **Why:** It is machine-specific, invisible, difficult to review, and outside Git.
- **Rejected:** Using private auto-memory as a hidden second store.

## 19. Edge cases

- If a startup source is missing, warn, link to the missing path, and continue with the remaining slots.
- If `current.md` or `recent.md` is older than its inputs, label it stale and rebuild when possible.
- If the work tracker is unavailable, show the last dated handoff and say that live status is unverified.
- If two current files conflict, show both and write neither until the owner chooses.
- If code and a spec disagree, report actual state and expected state separately.
- If a memory and a spec disagree, treat the spec as approved intent and show the memory conflict.
- If a source type or required field is missing, refuse the new write. For a legacy record, show the gap in the approval review.
- If an inference has no `based_on` evidence, refuse it.
- If two records look alike but sources differ, pair them and refuse merge.
- If a provider is unavailable, fall back to file search and label the degraded mode.
- If a provider returns an empty result because a method is missing, treat it as a provider failure.
- If session history is unavailable or expired, scope the failure to the available machine and dates.
- If the owner asks to see full text, show it and wait for a separate approval.
- If the owner approves only some grouped changes, write only those groups.
- If migration signatures conflict, make no writes.
- If a migration cannot preserve a link or identify provenance, stop and show the exact gap.
- If the startup budget is exceeded, shrink optional detail and never remove identity, project purpose, latest handoff, or the memory tool route.
- If an external service would receive project text, refuse until the recorded privacy decision allows it.

## 20. Deliberate exclusions

The system does not:

- store every tool call, command, file open, code edit, test run, or routine error;
- store hidden reasoning or chain-of-thought;
- turn casual conversation or temporary hypotheses into project truth;
- copy active requirements into memory;
- copy work-item status into permanent memory;
- use model-generated summaries as canonical evidence;
- auto-inject all specifications, decisions, memories, or transcripts;
- commit a search database or provider cache;
- let background tasks write memory;
- silently repair meaning;
- make Obsidian, SQLite, embeddings, or any vendor required for correctness; or
- call an old record wrong merely because it is old.

## 21. Approval and adoption

This specification is approved and contains no unresolved design choice.

Adoption follows these steps:

1. this meaning replaces the current `knowledge/specs/memory-system.md` through the normal specification approval flow;
2. the change is split into implementation work items with acceptance tests tied to the numbered requirements;
3. existing toolkit behavior remains active until each replacement passes migration and compatibility checks; and
4. adopting projects move only through their own dry run and approval.

Approval does not authorize a silent implementation, a bulk memory rewrite, or an automatic project migration.

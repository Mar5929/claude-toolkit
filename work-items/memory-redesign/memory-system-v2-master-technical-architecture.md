# Memory System v2: Final Master Technical Architecture

**Status:** Owner review in progress. Settled decisions are recorded here as they are
approved. Phase 0 corrections applied 2026-08-20. Owner approval pending pull request
review.

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
- retrieves directly from canonical files without requiring a search index; and
- migrates existing projects without silent rewrites or lost history.

The architecture applies to Claude Code, Codex, and future hosts that can satisfy the
same startup, approval, retrieval, privacy, and validation contracts.

## 2. Source resolution

The final design was resolved from these inputs:

1. [functional-requirements.md](functional-requirements.md), FR-001 through FR-131;
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

FR-065 through FR-131 were added during the owner review that produced this document.
Section 24 carries a traceability row for every one of them, and the ids run FR-001
through FR-131 with no gaps and no duplicates. A few requirements sit out of numeric
order on the page because ids are permanent and each requirement lives in the topic
section it belongs to. The requirements document explains that at the top of its
section 4.

The header at the top of this document is the only place that records where owner
approval stands. Every section here is written in a settled voice, which is how a
technical design reads, so do not take that voice as approval. Check the header.

The following conflicts are resolved here:

| Topic | Final resolution |
| --- | --- |
| Generated build time | Committed generated views use deterministic input fingerprints. Wall-clock build time stays in local build metadata so an unchanged rebuild creates no Git diff. |
| Private host memory | It is never required or treated as project truth. It is disabled where the host allows it. |
| Optional retrieval | Any optional method must prove a measured benefit. Recorded privacy consent is additionally required when content leaves the approved boundary. |
| Sensitive personal information | It is refused when it is not needed and approved for the repository. Required, approved information still follows the privacy contract. |
| Startup pins | Every valid pin is rendered from the canonical record summary. A pin admission check prevents normal writes from creating a budget conflict. |
| Proactive reminders | They are outside v2 acceptance and remain disabled until a later approved design. |
| Current and recent views | They are assembled from authored source lines. They are never model-written summaries. |
| Search engine | V2 searches canonical Markdown directly by id, path, metadata, and project-scoped repository text search. It creates no search index or retrieval cache. |

## 3. Scope and exclusions

### 3.1 In scope

- project identity and startup orientation;
- information ownership and placement;
- durable record shape and provenance;
- approval and write coordination;
- lifecycle operations;
- pinned memory;
- the authored current-state file, the map, the recent window rendered at startup, and
  any optional derived artifact a project separately approves;
- progressive retrieval and session-history gating;
- a decision gate for any future retrieval accelerator;
- read-only review and approved cleanup;
- deterministic validation and retrieval tests;
- physical project scope, monorepo subroots, and privacy boundaries;
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
- SQLite retrieval indexes, embeddings, graph search, retrieval providers, or other
  search acceleration in v2; and
- automatic project migration.

## 4. Architecture principles

The following invariants apply to every component:

1. One meaning has one canonical home.
2. Canonical project memory is readable Markdown tracked by Git.
3. Live work-item status stays in the configured work tracker where a project has one.
   Continuity stays in knowledge/current.md, which works without a tracker.
4. Rules define behavior. Skills define reusable processes. Specifications define
   approved behavior. Memory records facts, decisions, events, and patterns.
5. No current specification or memory write occurs without explicit owner approval.
6. Generated files are rebuildable and never authoritative.
7. Provenance stays attached to the claim and is not upgraded by age or repetition.
8. New evidence for unchanged meaning stays on one record. Conflicting meanings stay
   separate and linked.
9. Current and historical states are distinct and both retrievable.
10. Retrieval starts with the smallest and most authoritative source.
11. Empty results stay empty.
12. Direct canonical-file retrieval works with no local runtime state.
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
    BA -.->|optional| TA[Tracker adapter]
    BA --> CM[Capability manifest]
    H --> RR[Retrieval router]
    RR --> CS
    RR --> TA
    RR --> SH[Local session history adapter]
    WC --> CS
    WC --> VG[View generator]
    WC --> V[Validator]
    VG --> CS
    V --> CS
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
| Agent identity | Host instructions, project overview, and an optional separate identity file | Who is the agent in this project and what must it protect? |
| Detailed behavior | Rules, skills, output style | What behavior or process applies now? |
| Project orientation | knowledge/project.md and knowledge/map.md | What is this project and where does information live? |
| Current focus and continuity | knowledge/current.md | What is the current focus, what is blocking it, what is the next step, and what does a new session need to continue? |
| Live work-item status | Configured work tracker, where a project has one | What is assigned, in progress, or closed right now? |
| Approved behavior | knowledge/specs/ | What should the product or system do? |
| Implemented state | Code, configuration, tests, deployed state | What exists now? |
| Durable knowledge | knowledge/memory/ | What happened, what was decided, what is known, and why? |
| External and raw material | Delivery folders, references, brainstorms | What did an outside source say or what remains unchecked? |
| Session history | Original host history | What was said in a past conversation? |

Authority depends on the question:

- Expected behavior comes from the current approved specification.
- Actual behavior comes from inspected code, configuration, tests, and target state.
- Decision rationale comes from the decision record and its evidence.
- Current focus, blockers, the next step, and the handoff come from
  knowledge/current.md. Live work-item status comes from the tracker where a project
  has one.
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
  knowledge/
    project.md
    map.md
    current.md
    specs/
    memory/
      facts/
      decisions/
      events/
      patterns/
~~~

This is the complete required physical core. It is installed by default in every
toolkit project. The owner may remove the memory system without removing the rest of
the toolkit or any project-owned material.

The full memory-system specification stays in this toolkit. An adopting project gets
the built rules, skills, templates, tools, and project-specific settings. It does not
get a copy of this architecture.

The active tracker, delivery folders, rules, skills, and source areas stay in their
existing project-owned locations. knowledge/map.md records their logical roles and
physical routes so the agent never guesses or creates a duplicate.

### 7.1 Fixed authored core

- AGENTS.md and CLAUDE.md are the root entry points for their supported hosts. Each
  provides the route to the toolkit and memory behavior that host can actually load.
- knowledge/project.md contains purpose, users, boundaries, main workstreams, stable
  project id, tracker route, and the project's physical root or approved subroot.
- knowledge/map.md explains each major logical role, its current physical path, its
  owner, whether it is authoritative or derived, and how it is searched.
- knowledge/current.md is the authored current-state file. It carries the current
  focus, the known blockers, the exact next step, and a handoff that stands on its own
  for a new agent. It is authored content, not a generated view, and it is written
  only through the write coordinator on the three triggers in section 10.6.
- knowledge/specs/ contains approved project or system behavior.
- knowledge/memory/ contains facts, decisions, events, and patterns in their named
  folders.

### 7.2 Mapped and optional areas

The map points to these roles when they exist. The memory system does not prescribe
their physical folder names:

- project rules and host instructions;
- reusable skills and procedures;
- the active work tracker;
- delivery and client artifacts;
- outside and project research references;
- source records and raw evidence; and
- optional domain-owned stores.

A project may add a references area, a brainstorm area, a separate identity file, or
one or more domain profiles when it needs them. A reference role may resolve to
references/ in one project and engagement/references/ or delivery/references/ in
another. Existing areas are mapped in place rather than moved or copied.

Profiles add only the fields, routes, validation, and privacy warnings their domain
needs. They do not replace the common core or weaken approval, provenance, authority,
scope, or privacy behavior.

#### 7.2.1 Research-spike reference packages

When a research-only or spike work item produces a report that may guide later work:

- the final editable report moves or is written to the mapped project reference area;
- a generated PDF or other reading copy may sit beside it, clearly labeled as derived
  and regenerated from the editable report;
- raw queries, working notes, and work-item evidence remain with the original work
  item;
- the work item links to the reference package and the reference package links back;
- the reference states whether it has been reviewed or verified; and
- later work items, decisions, and specifications link to the reference instead of
  copying its contents.

The reference package may be stored before the owner reads it because reference
storage does not make it current project truth. Owner approval is required only when
a conclusion is promoted into a durable fact, decision, event, pattern, specification,
rule, or skill. In an established project, the mapped location may be
engagement/references/, delivery/references/, references/, or another existing owner.

### 7.3 Generated, optional canonical, and local state

The required structure does not include memory-settings.md, recent.md, index.md,
crib.md, or another generated view. This document is the startup decision, and v2
stores no generated view by default. A project may approve an optional derived
artifact later, but no such artifact becomes canonical merely because it is
rebuildable, and none of them joins the required core.

knowledge/current.md is not a generated view and this rule does not exclude it. It is
authored content in the required core under section 7.1, written only through the
write coordinator. The recent window is still rendered at startup from dated record
summaries and is never stored as a file.

#### 7.3.1 Optional canonical files

Two files are canonical, Git-tracked, and owner-approved, yet belong to neither of the
categories above. They are not generated views, so the exclusion list does not cover
them, and they are not part of the required core, so section 7 does not list them. A
new project has neither one. Each appears only when the project needs it:

| File | Written by | Appears when | Absence means |
| --- | --- | --- | --- |
| knowledge/memory/pins.md | The pin manager, through the write coordinator | The owner approves the project's first pin | The project has no pins. Startup renders an empty pin block and reports no error |
| knowledge/retrieval-gold-set.md | The owner, directly or through an approved write | The owner writes the project's retrieval questions | The project has no gold set. Validator check 19 reports it as a warning, and it blocks only a proposed retrieval change |

This category is closed. A third optional canonical file requires a new approved ADR.
Section 11.2 defines what pins.md holds and section 18.1 defines what the gold set
holds. Neither file may hold the only copy of a meaning that belongs in a record, and
neither is read to decide what is true.

That is how this section and sections 11.2, 18.1, and ADR-021 agree. Those sections
require a home for pin state and for the gold set. This section refuses to grow the
required core. Naming both files optional satisfies both: the boot path still needs
exactly the files in section 7, and a project that uses pins or measures retrieval has
one committed place for each.

A project that already owns a home for retrieval test material may map the gold set
there through knowledge/map.md instead of using the default path. The runner and the
validator read the mapped path, so neither guesses.

.memory/ is absent during normal reads. An approved write may create it temporarily
for a lock or crash-recovery journal. Any local state must be disposable, gitignored,
and removable without losing canonical knowledge, approval evidence, project-owned
sources, or session history.

## 8. Component model

| Component | Responsibility | May write canonical Markdown? |
| --- | --- | --- |
| Host startup adapter | Delivers the operating contract and starts the boot brief | No |
| Capability resolver | Reports available operations, privacy boundary, and degraded features | No |
| Source resolver | Reads authored and canonical inputs by layer | No |
| Boot brief assembler | Selects, orders, budgets, and links startup context. It reads knowledge/current.md and assembles the recent window in memory | No. Startup is read-only under section 10.6 |
| Tracker adapter (optional) | Reads active and recent work from the configured tracker, when one is configured and reachable. Startup and continuity work without it | No |
| Retrieval router | Applies question routing, tier order, ranking, and failure rules | No |
| Canonical store | Reads and stages Markdown records and settings | Only through the write coordinator |
| Write coordinator | Applies approval, concurrency, lifecycle, regeneration, validation, and rollback | Yes |
| Lifecycle engine | Builds approved record changes for named operations | Only through the coordinator |
| Pin manager | Validates pin eligibility, budget, project scope, and summary hash | Only through the coordinator |
| View generator | Rebuilds any optional derived artifact a project has separately approved, and reports that there are none when a project has none. It never writes knowledge/current.md, which is authored, and never stores the recent window, which is assembled at startup | Optional generated files only, and only inside a coordinator transaction |
| Validator | Runs deterministic integrity and acceptance checks | No |
| Review engine | Produces a repair worklist | No |
| Cleanup skill | Converts approved worklist items into lifecycle operations | Only through the coordinator |
| Session-history adapter | Searches original local host history with a scoped gate | No |
| Migration engine | Detects, plans, applies, verifies, and rolls back approved migrations | Yes, through the coordinator |

The view generator has nothing to rebuild in a default v2 project, and
memory_rebuild_views says so rather than failing. It exists because the coordinator
must be able to regenerate whatever a project has approved inside the same
transaction, and because FR-003, FR-004, and FR-017 apply the moment such an artifact
exists. Section 7.3 keeps that possibility from growing the required core.

The retrieval router reads the canonical store directly. V2 has no retrieval-provider
or search-index implementation. Any future accelerator remains outside the canonical
write path and requires a new approved ADR before it is built.

## 9. Project-specific settings

The baseline requires no separate settings file. Small stable values needed to
identify and route the project live in knowledge/project.md front matter so the
required structure remains complete without another configuration owner.

~~~yaml
---
schema_version: 2
project_id: claude-toolkit
tracker:
  adapter: github-project
  project: Claude-Toolkit-Project
project_root: .
subroots: []
privacy:
  level: standard
  external_transfer: denied
  third_party_personal: refused
startup:
  budget_bytes: 10240
profiles:
  - software
---

# Project overview

The authored overview follows this front matter.
~~~

The stable project id scopes pin queries, retrieval results, and session-history
searches. A path on one machine is never used as the project identity.

`project_root`, `subroots`, and `privacy` are the whole configuration surface for scope
and privacy. Section 21 defines how they resolve, what they enforce, how a refusal
reads, and which validator checks read them.

`startup.budget_bytes` is the whole configuration surface for the boot brief. It is
optional. When it is absent, the default in section 10.4 applies. Section 10.4 defines
that default, the preflight that validates any change to it, and what may never be
dropped to meet it.

Startup, pin, session-history, and privacy configuration is settled here and in
sections 10, 11, 15.5, and 21, and none of it adds a required physical file. Pin state
and the retrieval gold set live in the optional canonical files named in section 7.3.1,
which a new project does not have. Session-history scope is a request-time argument
under section 15.5, not stored configuration. An environment variable or installed
client never counts as consent for external transfer.

## 10. Startup architecture

### 10.1 Host delivery

| Host | Delivery contract |
| --- | --- |
| Claude Code | CLAUDE.md, automatically loaded project rules, and a fail-open startup hook |
| Codex | AGENTS.md plus a native startup adapter when available |
| Other host | A tested adapter that delivers the same required meaning |

The system never assumes one host can import another host's root file. Required
shared meaning is copied only where needed and checked for drift.

When a project has a separate identity file, the host reads it after the operating
contract. It contains no active task, history, project facts, or detailed rule list.

### 10.2 Boot brief order

The boot brief renders these blocks:

1. identity and operating route;
2. project purpose, goal, phase, and the tracker route when one is configured;
3. owner working contract from its canonical rules or output style;
4. latest authored handoff line from knowledge/current.md, plus the work-item link
   when a tracker is configured;
5. current state;
6. recent window;
7. pinned memory;
8. project map;
9. memory contract, skills, tools, and retrieval route; and
10. warnings and degraded capabilities.

Pinned memory is a required block. Every entry is the current record's approved
one-sentence summary plus a link to that record. Startup does not paraphrase it.

### 10.3 Current, recent, and map rules

The current block renders authored lines from knowledge/current.md. The recent block
selects, sorts, labels, and links dated summaries of approved records. Neither may
create a new statement or paraphrase a fact, number, date, qualifier, decision, or
failure reason.

The recent window renders up to three meaningful updates from the last 72 hours. If
none exists, it renders the latest dated update and labels its age. Eligible updates
include completed state changes, lessons, failed approaches that should not be
retried, disproved assumptions, and lasting constraints.

The map is authored. Validation compares its listed major paths to the repository and
reports missing, renamed, or undocumented areas.

This document is the startup decision, and v2 stores no generated view. The current
block reads authored lines from knowledge/current.md and the recent block is assembled
in memory at startup, so neither is written to disk and neither can go stale as a file.
If a project separately approves an optional derived artifact, that artifact identifies
itself as generated, names and links every input, carries a deterministic input
fingerprint, and is replaced by regeneration after a hand edit. Approving one never
makes it part of the required project structure.

### 10.4 Budget behavior

The default total rendered budget is 10 KB, meaning 10240 bytes. It covers everything
the brief renders, including the current block read from knowledge/current.md and the
recent window assembled from approved records. Those two blocks are part of the budget,
not an addition to it.

A project may set a different budget in the `startup.budget_bytes` front-matter key in
knowledge/project.md, up or down. Either direction runs the same preflight: the change
is accepted only when the complete required set below still fits, and a change that
would not fit is refused and returns the required byte count. So an owner whose
required set genuinely needs more room raises the budget with the real number in front
of them, instead of losing content to a figure this document picked.

Optional detail degrades in this order:

1. warning detail becomes a count and link;
2. older recent items become a count and link;
3. unchanged current areas become a count and link; and
4. the map keeps major folders only.

These are the required set, and they are never silently dropped at any budget:

- identity and the operating route;
- project purpose;
- the current focus, the known blockers, and the exact next step from
  knowledge/current.md;
- the latest authored handoff line;
- every valid pinned memory; and
- the memory tool route.

Degradation step 3 collapses only the current areas that have not changed, so it never
touches the current focus, the blockers, or the next step. The stale warning defined in
section 10.6 survives every
step as one labeled line carrying its date, because a brief that hides how old its
current state is misleads worse than a brief that runs long.

The pin operation calculates the required brief size before writing. It refuses a new
pin when the complete required brief would exceed the configured budget and returns
the exact pin set and byte count that need review. Every budget change runs the same
check, in either direction.

If a manual edit creates an invalid over-budget pin set, startup renders every valid
pin, reports the configuration error, and continues in a visible overflow mode.
Normal tool-mediated writes cannot create this state.

### 10.5 Missing and stale inputs

A missing source, stale view, failed check, or unavailable adapter produces a visible
warning with a count and link. Startup remains usable. If no tracker is configured, or
the configured tracker is unavailable, the brief shows the dated content of
knowledge/current.md and labels live status unverified. If knowledge/current.md is
missing or older than the recent window, the brief shows the stale warning defined in
section 10.6.

### 10.6 Memory-owned continuity

Memory owns cross-machine continuity through knowledge/current.md. That file carries
the current focus, the known blockers, the exact next step, and an authored handoff
that stands on its own for a new agent that cannot reach the prior conversation. It is
part of the required core in section 7.1 and it works in a project that has no work
tracker.

A configured tracker adapter is optional. Where a tracker exists, current.md links to
the live work item and the adapter adds work-item links and live status at startup
when it is reachable. Neither current.md nor the adapter copies the other's content,
so the project never holds two current-status records. Live status stays in the
tracker. Continuity content stays in current.md.

current.md is written only through the write coordinator, and only on three triggers:

1. an explicit handoff;
2. an approved change of current focus; and
3. an approved completed-work event that changes current state.

No other route, agent, hook, or background process writes it. Startup is read-only. It
reads current.md, the project's pinned records, and the dated summaries of recently
approved records, then renders the briefing inside the budget. The same inputs always
produce the same briefing. Startup never rewrites current.md, never writes a session
summary, and never stores any other state.

If current.md is missing, or its latest dated update is older than the recent window
in section 10.3, startup shows a visible stale warning naming that date and continues
with the dated content it has. If the tracker is unavailable, or no tracker is
configured, startup shows the dated content of current.md and labels live status
unverified. In every one of those cases the session never manufactures current status
from native conversation history.

Normal use requires no hand edit of current.md. The three triggers keep it current
through the approved write path. The file stays plain readable Markdown that the owner
can inspect and correct directly, and the system keeps maintaining it after a hand
correction.

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
- its summary and qualifiers fit the pin statement limit;
- adding it keeps the required brief within budget; and
- it carries no sensitive content, or it carries a recorded owner approval naming
  startup exposure for that record, per section 21.6.

An agent may propose a pin or unpin. Only the owner may approve it.

### 11.2 Canonical pin state

Pin state lives in one file, knowledge/memory/pins.md. That file is an optional
canonical file under section 7.3.1: Git-tracked, written only through the write
coordinator, and absent until the owner approves the project's first pin. A project
with no pins has no such file, which is why the required core in section 7 does not
list it and why section 7.3 is not being contradicted here.

Each entry stores only:

- the canonical record id;
- a relative link to that record;
- the pin approval date; and
- the hash of the exact approved summary.

It does not copy the summary. Startup reads the summary from the record, verifies the
hash, and renders it with the record link. This preserves one home for meaning and
detects a changed summary that has not been approved for startup. Keeping the hash in
a different file from the summary it covers is what makes the mismatch detectable. A
hand edit to a record cannot quietly update that record's own approval evidence.

Removing the last entry removes the file. Deleting the file by hand removes every pin
and nothing else: no record loses its content, its status, or its place in retrieval.

The startup adapter places every valid pinned record in the live session context. It
remains available for the full session without creating a local working-set file.

### 11.3 Pin operations

~~~text
memory_pin(id)
  -> load the current record
  -> validate project, status, provenance, approval, and summary
  -> show the exact startup statement and link
  -> run the startup budget preflight
  -> show What, Where, Why, Assumptions, Unverified
  -> wait for owner approval
  -> add the id, link, date, and summary hash to knowledge/memory/pins.md,
     creating that file when this is the project's first pin
  -> recompute the rendered brief size and validate project scope

memory_unpin(id)
  -> show the current startup statement and record link
  -> show the five approval bullets
  -> wait for owner approval
  -> remove the entry from knowledge/memory/pins.md, removing that file with
     the last entry
  -> recompute the rendered brief size
~~~

The brief itself is never a stored file. It is assembled at startup from current
inputs, so a pin change takes effect at the next session start with nothing to
regenerate.

Unpinning does not delete the record or remove it from normal retrieval.

### 11.4 Lifecycle interaction

- CONFIRM keeps a pin because the approved summary does not change.
- CORRECT defaults to unpin when the summary changes. The owner may separately
  approve the corrected summary to remain pinned in the same review.
- SUPERSEDE and RETIRE remove the old pin in the same reported transaction.
- A successor is never pinned automatically.
- DELETE removes any pin entry in the same transaction, before any approved derived
  artifact is rebuilt.
- MERGE requires an explicit choice of whether the surviving record should be pinned.
- A record with a missing, mismatched, cross-project, superseded, or retired pin
  entry is not rendered as current truth and produces a repair warning.

### 11.5 Cross-project isolation

Every pin lookup uses the stable project id and resolved repository root. A result
without a matching project id or inside a different physical root is rejected before
ranking. Tests use two projects with overlapping record ids and prove that neither
startup nor retrieval leaks a pin.

A model-generated importance score may help rank ordinary results. It cannot create
or remove a pin, decide truth, or override project scope, record status, provenance,
source authority, or query relevance.

## 12. Durable record model

Every new v2 memory is one Markdown file containing one independently correctable or
supersedable meaning, structured metadata, a descriptive H1, and one approved summary
sentence directly below the H1. One meaning is not the same as one sentence. A
decision may keep its context and rationale together when they share evidence, truth
status, and effective dates.

~~~yaml
---
id: decision-auth-004
type: fact | decision | event | pattern
status: active | superseded | retired
epistemic_status: documented | observed | reported | diagnosed | approved |
                  inferred | suspected | unknown
recorded_at: 2026-08-18
effective_from: 2026-08-18
effective_to: null
occurred_at: null
approval:
  actor: owner
  approved_at: 2026-08-18T14:00:00-04:00
  action: add
evidence:
  - source_type: owner_approved_decision
    locator: issue-123#comment-456
    observed_at: 2026-08-18
    retrieved_at: null
    version: null
    note: Owner approved the architecture choice.
based_on: []
domain: [authentication]
topics: [token-storage]
entities: [authentication, keychain]
relates: []
conflicts_with: []
supersedes: null
superseded_by: null
confirmations: []
review_after: null
retired_because: null
---

# Refresh tokens use secure device storage

Refresh tokens live in secure device storage, not normal application storage.

## Context

The application needs durable refresh tokens without placing them in ordinary
application storage.

## Decision

Refresh tokens live in secure device storage.

## Reason

Secure device storage provides the approved protection boundary.

## Rejected options

- Ordinary application storage.

## Consequences

- Supported clients need access to the device security API.
~~~

Required fields for every new record are id, type, status, epistemic_status,
recorded_at, approval, at least one evidence entry, and the one-sentence summary. An
inference or pattern also requires a non-empty based_on list. An event requires an
exact occurred_at value or an explicit date range or uncertainty statement. A
decision requires context, decision, reason, rejected options, consequences, date,
status, and evidence.

Records live under the folder matching their type: facts, decisions, events, or
patterns. Domain and topic describe subject matter without creating another copy or
requiring a file move when the subject grows.

Existing records remain usable without a forced bulk upgrade. The next approved edit
may upgrade the touched record after showing missing fields in the approval review.

### 12.1 Provenance laws

1. A new write without recoverable evidence is refused.
2. An incorrect evidence locator may be corrected only through CORRECT with a reason,
   date, approval, and replacement evidence. Git preserves the earlier wording.
3. Another source supporting unchanged meaning adds an evidence entry and, when the
   owner rechecks it, a confirmation. It does not create a duplicate record.
4. Conflicting meanings remain separate, keep their own truth status and evidence,
   and link through conflicts_with.
5. Verification is an audited correction or confirmation with evidence. Repetition
   and age do not silently promote an inference.
6. An inference or pattern names the records it is based on.
7. A negative statement names the scope searched.
8. A generated view or summary is never primary evidence.

### 12.2 Entities and relationships

Simple records use inline evidence locators, names, and links. No entity, source, or
relationship registry is required.

A stable entity entry is created only when repeated use needs one identity or aliases
would otherwise be ambiguous. A reusable source entry is created only when many
records cite the same source identity. A relationship becomes its own sourced record
only when the relationship itself changes over time or must be independently
corrected. Otherwise, ordinary links are enough.

Optional supporting entries do not create additional memory types. A durable
relationship claim is stored as a fact with subject, relationship, object, truth
status, effective dates, and evidence. A graph may be derived from these links, but it
is never canonical.

### 12.3 Atomic record boundary

The boundary is one independently correctable or supersedable meaning. Clauses that
need different evidence, truth status, or effective dates become separate records.
Context and rationale that cannot change independently may remain with the meaning.

Retrieval returns the whole record rather than storing or searching detached chunks.
Search results may show the summary, but consequential answers open the full record
and follow its evidence.

### 12.4 Links and derived backlinks

Canonical records use ordinary relative Markdown links with explicit .md targets. A
specification links to the decision that owns its rationale. The default project ADR
home is knowledge/memory/decisions/. When a project already has an approved ADR home,
knowledge/map.md points there and the specification links to that canonical location
instead.

Backlinks are derived when requested by searching canonical Markdown inside the
resolved project root for the target record id and relative path. memory_related(id)
returns both outgoing links and incoming backlinks. It reads current files directly
and creates no backlink registry, graph, database, index, or cache.

An ADR may contain authored links to key affected specifications when that helps a
reader, but a second hand-maintained list of every backlink is not required. Obsidian
may display the same ordinary links, but Obsidian behavior is never required for
correctness.

An approved record move or rename searches every tracked project Markdown file,
repairs affected relative links, validates every new target, and commits the result as
one write operation. If any affected link cannot be repaired, the coordinator restores
the preimages and reports the exact unresolved path.

## 13. Approval and write coordination

### 13.1 Save decision

~~~text
new information
  -> search the work tracker and all current owners
  -> route work state, rules, skills, specs, sources, and conversations first
  -> if memory is still the right home, run the durable-information test
  -> run the future-agent interpretation test
  -> choose NOOP or a record type
  -> identify provenance, entities, and project scope
  -> search duplicate meaning and the entity timeline
  -> choose the lifecycle operation
  -> show What, Where, Why, Assumptions, Unverified
  -> wait for keep, change, or skip
  -> verify the source files did not change after the review
  -> apply the approved transaction
  -> rebuild any approved derived artifact the change affects
  -> validate and report changed paths and any warning
~~~

The durable-information test asks:

1. Will this still matter after the task or session?
2. Is it a stable fact, lasting event, decision, or state?
3. Does an existing owner already hold it?
4. Would leaving it out cause repeated explanation or the same wrong action?

Questions 1, 2, and 4 must be yes. Question 3 must identify the existing home or show
why a new record is needed.

The future-agent interpretation test asks:

1. Does the record contain the minimum complete information needed to understand and
   use the meaning correctly?
2. Can it be understood without the conversation that produced it?
3. Are its scope, evidence, authority, and uncertainty plain?
4. Could a reasonable reader infer a broader, narrower, or different meaning than the
   owner intends?
5. Does it contain background, speculation, implied conclusions, recommendations, or
   related information that is not needed?

If question 4 or 5 is yes, the proposal is narrowed before review or becomes NOOP. A
statement does not qualify merely because it is true or related.

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

Only keep, change, edit, or skip from the owner decides the result. Silence, an
unclear reply, a request for full text, a helper agent, a hook, a provider, and a
background process are not approval.

Every review offers an Edit action. Where the host supports keyboard actions, Edit has
a keyboard shortcut. It opens the complete proposal in a temporary file under
`.memory/review/<proposal-id>.md`. The file is outside canonical memory and
specification paths. Startup, recall, search, generated views, and Git-tracked project
knowledge ignore it.

The owner may change the review file directly. After an edit, "good," "keep," or
another clear confirmation approves the exact current file contents. Opening or
editing the file alone is not approval, and the owner never has to repeat the edits in
chat.

The coordinator reruns placement, record-type, provenance, duplicate, conflict,
schema, privacy, and future-agent interpretation checks against the edited contents.
If the edit introduces another meaning, changes the destination or record type, lacks
evidence, creates a conflict, or fails a safety check, the write stops and the review
returns with the exact problem. Otherwise, the current reviewed contents continue to
the protected write operation. The temporary file is removed after a successful save,
skip, or cancellation. A failed validation keeps it available for correction.

The write coordinator binds approval to:

- the proposed meaning;
- the exact reviewed contents and their hash;
- the destination path and record id;
- the lifecycle or pin operation;
- the evidence locators and source hashes reviewed by the owner; and
- the exact pin statement when pin visibility is included.

If any bound input changes before the write, the coordinator refuses and asks for a
fresh review.

### 13.3 Where the approval gate sits

The approval contract above describes what the owner sees. This section decides what
enforces it. Enforcement does not sit in the agent's instructions, because an
instruction only holds while the agent follows it, and the failure mode that matters
is the write that happened without the review.

Two mechanisms carry the gate.

**One approved write path.** Canonical memory and specification changes are applied
only by the write and pin operations of section 16.1. Each operation carries the
five-bullet review, the complete proposal, and its content hash. The host review gives
the owner keep, change, edit, and skip actions and records the owner's decision against
the exact reviewed contents. The agent cannot report an approval the owner did not
give, because the agent is not the thing that records the decision. A compatible host
must provide this review contract before it may write canonical project knowledge.

**A deterministic pre-write guard.** Any other route to the canonical memory and
specification paths is refused before it applies: a direct file edit, a helper agent,
a hook, a background process, a provider, or a script. The guard is deterministic, runs
without a model in its path, and refuses with a message naming the operation that
should have been used. knowledge/current.md is inside the guarded set, so the three
triggers in section 10.6 are the only ways an agent writes it.

Consequences the design accepts:

- A refusal is reported in the session, so a blocked attempt is visible rather than
  silent.
- The guard refuses by path and operation, not by intent. It cannot tell an honest
  mistake from a deliberate bypass, and it does not try to.
- The owner retains ordinary Git access to every canonical file. This gate governs
  agent writes, not the owner's own editing.
- The gate does not record a durable ledger of refused attempts. Refusals are reported
  where they happen, and canonical files stay unchanged, which is what AT-39 proves.

### 13.4 Transaction behavior

An approved write is one reported operation even when it affects several files.

1. Acquire a project-local write lock under .memory/.
2. Recheck source hashes, the approved proposal hash, and duplicate ids.
3. Write a crash-recovery journal with preimages under .memory/.
4. Stage the exact approved Markdown changes.
5. Apply required pin, conflict-link, supersession, and retirement changes.
6. Rebuild any optional derived artifact this project has separately approved and this
   change affects. A default v2 project has none, and the step reports that rather than
   failing. Nothing about startup is rebuilt here: the current block is authored in
   knowledge/current.md and the recent window is assembled at startup, so neither is a
   stored file. Retrieval never depends on a derived artifact.
7. Run focused validation.
8. On success, remove the journal and report every changed path.
9. On failure, restore canonical preimages, report the failure, and leave no partial
   current state.

The coordinator does not commit or push. Git remains the visible audit trail chosen
by the project's normal delivery process.

If a process stops with a journal present, the next startup detects it before
retrieval. It restores the preimages or completes regeneration from canonical files,
then reports the recovery.

### 13.5 Remembering completed work

A request such as "record what we just did" invokes the normal remember workflow. It
is not approval to write and creates no shortcut around placement, durable-information,
future-agent interpretation, evidence, duplicate, conflict, editing, validation, or
owner-approval checks.

Completed work becomes an event only when it passes those checks. The proposal states
when the work occurred, the exact tool or system involved, what materially changed,
the result, and links to available evidence. It excludes transcripts, command logs,
tool-by-tool activity, hidden reasoning, and routine details. The system never creates
the event automatically.

When an approved completed-work event changes the current focus, the blockers, or the
next step, the same transaction updates knowledge/current.md. The owner sees that
update in the same review. This is the third trigger in section 10.6.

## 14. Lifecycle architecture

| Operation | Meaning | Required behavior |
| --- | --- | --- |
| NOOP | Store nothing | Expected for transient, repeated, weak, or misplaced information |
| ADD | Add new durable meaning | Refuse duplicate id or meaning and route another supporting source to evidence |
| CONFIRM | Reaffirm unchanged meaning | Append actor, date, and evidence without rewriting the summary |
| CORRECT | Fix a record that was wrong | Record the reason, date, approval, and correcting evidence while Git preserves the prior text |
| SUPERSEDE | Replace a formerly true record | Create the successor, date the old record, and write both links |
| RETIRE | End a record with no direct successor | Require a reason, remove it from current reads, and hunt current copies |
| MERGE | Combine true duplicates | Allow only identical meaning with compatible truth status and effective dates, then consolidate every evidence entry |
| DELETE | Remove an accidental, corrupt, duplicate-surplus, or privacy record | Require a reason, a visible diff, and any required privacy purge work |

Retired and superseded records remain available for history and timeline questions.
They do not appear as current truth in startup or ordinary search.

### 14.1 Correction and supersession

CORRECT means the record itself was wrong. The current record receives the reason,
approval, correcting evidence, and date. Git preserves the prior full text instead of
copying it into a growing history field.

SUPERSEDE means the old record was true during an earlier period. The old and new
records receive reciprocal ids and effective dates in one transaction.

### 14.2 Evidence consolidation and conflict protection

The same meaning supported by another source remains one current record with multiple
evidence entries. Confirmation records who rechecked the unchanged meaning, when, and
against which evidence.

Different or incompatible meanings remain separate even when they share a subject.
They link through conflicts_with and retain their own truth status, effective dates,
and evidence. Review and cleanup cannot merge them merely because their wording is
similar.

### 14.3 Retirement phrase hunt

RETIRE accepts exact phrases that must no longer appear as current truth. It searches
tracked files and returns every surviving location. Retirement completes only when
each location is corrected through normal approval, marked as an explicit historical
quotation, or exempted with a reason on the retiring record.

The validator repeats this check. It cannot guarantee discovery of an unrelated
paraphrase with no matching text, so review still checks meaning conflicts.

### 14.4 Privacy deletion

A privacy deletion removes the sensitive content from current records, record
history, generated views, and any separately approved external copies. It keeps only
non-sensitive audit metadata.

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
| What are we working on, and what is next? | knowledge/current.md |
| What is the live status of that work item? | Work tracker, where a project has one |
| What exists now? | Code, configuration, tests, deployed state |
| What did the source say? | Original source |
| What exact words were used in a conversation? | Original session history after the gate |

### 15.2 Retrieval tiers

1. Tier 0, loaded context. Use the boot brief if it answers.
2. Tier 1, exact lookup. Use id, path, entity, or timeline.
3. Tier 2, curated project search. Search specs, memory, procedures, and source
   metadata with filters.
4. Tier 3, relationship and timeline expansion. Follow entities, conflict links,
   predecessor and successor records, decisions, events, specs, and nearby dates.
5. Tier 4, active work and handoff. Read knowledge/current.md for the current focus,
   blockers, next step, and handoff. Search the configured tracker and approved
   pointer-only bridge for live status when one exists.
6. Tier 5, session history. Search the original local host history only after the
   gate or on owner request.
7. Tier 6, honest failure. Name the searched scope and unavailable sources.

The baseline reads canonical Markdown directly. It uses exact record ids and paths,
metadata filters, and text search constrained to the resolved project root. A default
v2 project stores no navigation view. Where a project has separately approved one, it
may help a person browse, but retrieval does not depend on it and never treats it as
evidence.

The agent searches with project terms, exact tool names, and useful aliases recorded
on the canonical record. Blind synonym expansion is not used. A match opens the whole
record rather than a detached chunk.

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
degraded-state warning, when present
~~~

The `project_id` on a result is the resolved scope's id from knowledge/project.md. It
is not a field stored on the record. A result carries it so the reader can see which
project answered, and section 21.9 decides membership by physical location.

An empty result stays empty. A search failure, missing method, or scope error is
returned as an error, not converted into no evidence.

### 15.3 Consequential recall

Search results locate evidence. Before a consequential answer, the retrieval router:

1. opens the complete current record;
2. follows provenance;
3. reads the original evidence;
4. checks status and effective dates; and
5. returns conflicts and uncertainty with the answer.

### 15.4 Live follow-up context

The active conversation may retain paths and record ids it just opened so follow-up
questions remain natural. Retrieval writes no working-set file, cache, metric, or
other local state. If the question or scope changes, the agent searches the canonical
files again.

### 15.5 Native session-history fallback

Native history remains in the original host-owned store. The memory system never
copies it, indexes it, summarizes it, converts it into session cards, or uses it as a
second owner of current status.

session_search is available only when:

- the owner asks to search past conversations; or
- the agent has searched the relevant current project owners and can name why they
  are insufficient for the question.

No opaque evidence token or local gate file is required. The search remains read-only
and scoped to the available project, machine, host, and date range. A result includes
the host, session id, date, role, original message locator or resume route, and a short
excerpt. The agent opens the exact conversation segment before relying on its wording.

History search is an optional host capability. Its absence never fails project memory
or cross-machine continuity. A miss means only that no evidence was found in the named
available scope. It never means the subject was never discussed.

### 15.6 Honest failure

The final response says that reliable evidence could not be found and names:

- current project layers searched;
- tracker availability;
- direct-search availability;
- session-history machines, hosts, and dates searched; and
- any source that could not be accessed.

It does not substitute an unrelated recent memory or invent a likely answer.

## 16. Capability and future-acceleration architecture

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
memory_update_current(change)
spec_search(query, filters)
spec_get(id_or_path)
session_search(query, scope)
memory_rebuild_views()
memory_validate()
~~~

memory_update_current is the only operation that writes knowledge/current.md. It runs
the same approval review as every other write and it is available only on the three
triggers in section 10.6. An approved completed-work event that changes current state
updates the file inside its own transaction rather than through a second call.

memory_capabilities returns:

- available operations;
- approval mode, which is owner-approved;
- search mode, which is direct canonical-file search in v2;
- pin support and current pin count;
- startup budget and required byte count;
- project id and privacy boundary;
- whether data may leave the machine;
- tracker adapter and session-history scope; and
- degraded or unavailable features.

The root route and boot brief name the four human-facing skills: remember, recall,
cleanup, and session-search. The agent inspects capabilities and never guesses.

### 16.2 V2 retrieval boundary

V2 implements no SQLite or other full-text index, embeddings, vector store, graph
search, retrieval provider, search cache, retrieval metrics store, or background
indexer. Normal reads do not create .memory/ or write anywhere else.

This is an intentional boundary, not a missing feature. Direct search is the complete
v2 retrieval path until project evidence proves that it is inadequate.

### 16.3 Gate for future acceleration

Any later local index, embeddings, graph expansion, or external retrieval service
requires a new owner-approved ADR. Popularity, vendor claims, and general benchmarks
are not enough.

The proposal must show repeated failures on owner-worded project questions, a clear
latency or recall target, measured improvement over direct search, stale-result
prevention, complete export and purge behavior, outage fallback, physical project
isolation, and privacy approval for any external transfer.

A future accelerator may return candidates only. It may never approve or write
project truth, and direct canonical-file retrieval must continue to work when the
accelerator is absent or broken.

## 17. Review and cleanup

memory_review is structurally read-only. Its interface has no write capability. It
returns a worklist covering:

- exact and near duplicate candidates;
- same-meaning records whose evidence should be consolidated;
- conflicting meanings that need an explicit link;
- current conflicts;
- invalid or missing provenance;
- stale review dates;
- broken ids and one-sided links;
- supersession gaps;
- surviving retired phrases;
- unused, overlapping, or excessive domain and topic values;
- records that no longer pass the durable-information test;
- stale or hand-edited generated views;
- pin errors and budget pressure;
- gold-set failures; and
- direct-search scope or capability failures.

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
5. valid conflict targets and reciprocal supersession links;
6. pin eligibility, summary hashes, project scope, and startup rendering;
7. startup budget and safe degradation;
8. retired phrases and recorded exemptions;
9. generated-view inputs, fingerprints, and hand edits;
10. map coverage for major folders;
11. domain and topic vocabulary and usage;
12. direct search returns complete records rather than detached fragments;
13. no tracker bridge as the sole home of a fact;
14. identical canonical results after deleting and rebuilding derived views;
15. reads and retrieval create no local state;
16. physical project-root isolation, defined step by step in section 21.9;
17. privacy-boundary enforcement, defined step by step in section 21.10;
18. migration file counts, links, hashes, and reversibility;
19. the retrieval gold set;
20. quoted-source consistency for exact spans, dates, numbers, and identifiers;
21. ordinary relative-link syntax and resolvable targets; and
22. complete incoming-link repair after an approved move or rename.

The validator does not claim to understand semantic truth. An unquoted paraphrase
that changes meaning remains an agent review and owner decision.

### 18.1 Retrieval gold set

Each project keeps about ten owner-worded questions with expected source files. At
least eight expected files must appear in the first five results.

The set lives in knowledge/retrieval-gold-set.md, the optional canonical file defined
in section 7.3.1. A project that already owns a home for test material may map the
gold set there through knowledge/map.md instead. The runner and validator check 19
read the mapped path and never guess one.

The file is authored by the owner, because the questions have to be worded the way the
owner actually asks. It is not generated, so section 7.3's exclusion list does not
cover it, and it is not needed to start a session, so the required core in section 7
does not list it.

A project without a gold set is a reported state, not a failure. Validator check 19
warns that the set is missing, and startup and ordinary retrieval are unaffected. What
it does block is a proposed retrieval change: a change nobody can measure cannot be
accepted, so the owner writes the set first.

The set includes:

- owner vocabulary rather than project terms;
- an exact id or identifier;
- a decision-rationale question;
- a timeline question;
- a question that must return no result;
- punctuation, a hyphen, or digits;
- a pinned-memory question;
- a cross-project isolation question; and
- a question run with .memory/ absent.

Every retrieval change runs the set.

## 19. Migration and compatibility

Migration is additive, project-specific, approved, and reversible.

### Phase 1: startup and discovery

- Add only the required core from section 7.
- Establish a stable project id, physical project root, optional tracker route, and
  semantic map without moving existing project-owned areas.
- Create knowledge/current.md from the project's existing handoff material, or as an
  empty authored file that startup reports as stale until the first approved update.
- Add memory_capabilities and the boot brief.
- Keep existing records and current skills working.
- Create no optional identity, reference, brainstorm, profile, generated, or local
  state area until the project uses it.

### Phase 2: lifecycle and schema

- Add permanent ids, the four record types, truth status, dates, approval, evidence
  entries, and lifecycle tools.
- Add optional reusable entity or source entries only where the project needs them.
- Upgrade a legacy record only through an approved operation that touches it.
- Do not infer missing metadata.

### Phase 3: retrieval and validation

- Add the direct-file retrieval router, gold-set runner, and physical project-scope
  checks.
- Keep file search as the baseline.
- Do not implement retrieval acceleration in v2.

### Phase 4: project adoption

- Detect the source layout by multiple signatures.
- Produce a dry report with file counts, hashes, collisions, missing metadata, link
  changes, and rollback steps.
- Stop on ambiguity or collision.
- Apply only after project-specific approval.
- Verify byte preservation for unchanged files, link integrity, startup behavior,
  pin isolation, direct search with .memory/ absent, and the gold set.
- Remove retired runtime pieces only after replacement checks pass.

Rollback removes generated files, new runtime wiring, and uncommitted migration
changes. It never erases approved Markdown or rewrites Git history.

## 20. Failure behavior

| Failure | Required result |
| --- | --- |
| Missing startup source | Warn with path and continue with remaining sources |
| Stale generated view | Label stale, rebuild when possible, and link inputs |
| Tracker unavailable or not configured | Show the dated content of knowledge/current.md and label live status unverified |
| knowledge/current.md missing or stale | Warn with its date, continue with what it has, and never invent current state |
| Current source conflict | Return both sources and write neither |
| Code differs from spec | Report actual state and expected state separately |
| Memory differs from spec | Treat the spec as approved intent and show the conflict |
| Missing provenance on new record | Refuse the write |
| Missing legacy metadata | Show the gap and preserve the existing text |
| Inference without evidence | Refuse the write |
| New source supports unchanged meaning | Add evidence or confirmation to the existing record |
| Meaning, truth status, or dates conflict on merge | Refuse and preserve linked records |
| Search parse error | Return an error, never no result |
| .memory/ absent | Continue direct retrieval without creating it |
| Session history unavailable | Scope the miss to available machine, host, and dates |
| Partial approval | Write only approved groups |
| Changed source after approval | Refuse and request a fresh review |
| Interrupted transaction | Recover from journal before current retrieval |
| Migration ambiguity or collision | Make no writes |
| Broken link target | Warn with the source path and do not treat the link as evidence |
| Unpreservable link | Stop and show the exact gap |
| Startup over budget | Degrade optional detail, preserve required blocks, and warn |
| Invalid pin summary hash | Omit the invalid entry from current truth and report repair work |
| External transfer without consent | Refuse before any content is sent |
| Target path outside the resolved scope root | Refuse the write and return nothing for the read, naming the operation, path, and root |
| Undeclared nested project, overlapping scopes, or duplicate project id | Stop the operation, name both paths, and pick no project |
| Malformed or missing privacy setting | Resolve to the most restrictive setting and report it |
| Sensitive record missing its category, need, or approval | Refuse the write |
| Unanswerable question | Return honest failure with searched scope |

## 21. Scope and privacy enforcement

Two boundaries protect a project. The **physical scope** is the part of the filesystem
this project's memory may read, search, and write. The **privacy boundary** decides
what its content may become: what may be stored, what may be shown at startup, and
whether anything may leave the machine.

Both are resolved from files inside the project. No database, service, background
process, or environment variable takes part. Every check in this section is
deterministic: the same files produce the same answer, with no model in the path.

### 21.1 Resolving the physical scope

Resolution runs on every memory operation, in this order:

1. Start at the working directory. Walk up the directory chain to the nearest ancestor
   that contains `knowledge/project.md`. That file's front matter must carry
   `project_id` and `project_root`.
2. Resolve `project_root` against the directory found in step 1.
3. Canonicalize the result. Expand every symbolic link, resolve `.` and `..`, and
   produce one absolute real path. That path is the scope root.
4. Require the scope root to contain the `knowledge/` directory found in step 1. If it
   does not, resolution fails and the operation stops with `scope/unresolved-root`.
5. Read the scope root's declared `subroots`. Each declared subroot subtree is removed
   from this scope.

Nothing else establishes scope. A stored absolute path, an environment variable, the
host's idea of a workspace, and the Git remote are all ignored, because they differ
from machine to machine while the project id must not. ADR-022 fixes the identity half
of project scope. This section fixes the physical half.

A member path is tested the same way. Canonicalize it to an absolute real path, then
require that path to be the scope root or to sit beneath it, with declared subroots
removed. Canonicalization happens before comparison, and the comparison requires a path
separator at the boundary, so a sibling folder named `project-notes` never passes as a
member of the scope root `project`.

### 21.2 What the scope governs

| Operation | Scope rule |
| --- | --- |
| Direct file search | Walks only the scope root, minus declared subroots and the project's ignore list |
| memory_get, memory_timeline, memory_related, memory_sources | Refuse an id or path that resolves outside the scope |
| Retrieval ranking | Drops an out-of-scope candidate before ranking, not after |
| Pins | A pin must resolve inside the scope and carry the scope's project id, per section 11.5 |
| Boot brief | Reads only files inside the scope |
| Every write operation in section 16.1 | Refuses a target outside the scope |
| Generated views, locks, and journals | Written only under the scope root |
| session_search | Scoped by project id, not by path, because host session history lives outside every scope and stays read-only where the host put it |

A symbolic link inside the scope whose target resolves outside it is outside the scope.
It is not searched, not returned, and not written through. The file it points at
belongs to whoever owns that other location.

Normal retrieval still creates no cache, working set, metrics file, or local index,
inside the scope or outside it.

### 21.3 Monorepo subroots

One repository may hold more than one memory scope. Each participating subroot carries
its own `knowledge/project.md`, its own `project_id`, and `project_root: .`.

- **Scopes never overlap.** Two scope roots may not be the same directory, and neither
  may sit inside the other unless the outer one declares the inner one.
- **A nested scope must be declared by its parent.** The parent lists it under
  `subroots`, which removes that subtree from the parent's scope for search, retrieval,
  pins, views, and writes.
- **An undeclared nested project stops the operation.** Finding a second
  `knowledge/project.md` inside the resolved scope that no `subroots` entry names is
  `scope/undeclared-nested-scope`. The report names both paths. The system does not
  guess which project the session belongs to.
- **The nearest ancestor wins.** A session working inside `packages/billing` resolves
  to billing's scope even when the repository root is also a scope.
- **A repository root does not have to be a scope.** A monorepo may hold only subroot
  projects. Where no ancestor of the working directory holds `knowledge/project.md`,
  there is no active project and memory operations report that plainly rather than
  inventing one.
- **Project ids stay distinct.** Two scopes in one repository claiming the same
  `project_id` is `scope/duplicate-project-id` and stops the operation.
- **Record ids may repeat across scopes.** Two projects may both hold a record with the
  same id. Scope resolution keeps them apart, which is what AT-06 proves.
- **Links may cross, labeled.** A link or evidence entry whose target resolves into
  another scope must name that scope's project id. An unlabeled crossing is a
  validation warning. A cross-scope link is a pointer only. The linked record never
  appears in this project's search results and never counts as this project's
  evidence.

~~~yaml
---
schema_version: 2
project_id: acme-billing
project_root: .
---
~~~

~~~yaml
---
schema_version: 2
project_id: acme-platform
project_root: .
subroots:
  - packages/billing
  - packages/reporting
---
~~~

### 21.4 Refusal behavior

The deterministic pre-write guard in section 13.3 also carries the scope and privacy
refusals. A refused operation:

- changes no file, creates no lock or journal entry, and leaves no partial write;
- reports one message naming the operation, the path or field at fault, the resolved
  scope root or the recorded privacy setting, and the reason code;
- is visible in the session, so a blocked attempt is never silent; and
- is never retried with a widened boundary. Widening requires an owner-approved change
  to `knowledge/project.md`.

Reason codes:

| Code | Raised when |
| --- | --- |
| scope/unresolved-root | project_root is missing, or resolves to a directory that does not contain the knowledge folder |
| scope/outside-root | A canonicalized target path is not the scope root and does not sit beneath it |
| scope/symlink-escape | A path inside the scope resolves, through a link or junction, to a real path outside it |
| scope/undeclared-nested-scope | A second knowledge/project.md sits inside the scope and no subroots entry names it |
| scope/overlapping-scopes | Two scope roots are the same directory, or one sits inside the other without a declaration |
| scope/duplicate-project-id | Two scopes in the repository claim the same project_id |
| scope/cross-scope-result | A retrieval or pin candidate belongs to another scope |
| privacy/transfer-denied | An operation would send project content outside the machine while external_transfer is denied |
| privacy/consent-missing | external_transfer is approved but the consent record is missing, unresolvable, or incomplete |
| privacy/secret-detected | The proposal or a canonical file matches the secret pattern set with no recorded exemption |
| privacy/third-party-personal | A record identifies another person with no owner approval naming that record |
| privacy/sensitive-unapproved-exposure | A sensitive record would enter startup, a pin, a generated view, or a log body with no recorded approval for that exposure |

A read follows the same rules with one difference. An out-of-scope read returns nothing
and says why, rather than refusing the whole question. Retrieval continues over the
paths it may use, and the honest-failure rule in section 15.6 applies when nothing
usable remains.

### 21.5 The recorded privacy boundary

Boundary values live in the `knowledge/project.md` front matter beside the project id,
so the baseline still requires no separate settings file, per section 9.

~~~yaml
privacy:
  level: standard
  external_transfer: denied
  third_party_personal: refused
~~~

- `level` is `standard` or `sensitive`.
- `external_transfer` is `denied` or `approved`. `approved` requires a `consent` link to
  an approved decision record naming the destination, the exact content scope, the
  approval date, and how to revoke it.
- `third_party_personal` is `refused` or `by-record`. `by-record` still requires
  per-record owner approval with a named reason.
- A missing, unreadable, or unknown value is read as the most restrictive setting:
  `sensitive`, `denied`, `refused`. A malformed privacy block never fails open.

`memory_capabilities` reports the resolved boundary so an agent reads it instead of
guessing.

Nothing outside this file widens it. An environment variable, an installed client, a
provider, a hook, a host setting, and an agent instruction are all incapable of
granting transfer consent. Revocation takes effect on the next operation, and there is
no cache to invalidate because v2 keeps no cache. A future retrieval accelerator
inherits these values and still may not approve or write current truth, per section
16.3.

### 21.6 Sensitive projects

A health, personal, or other owner-marked sensitive project runs the same core with
more restrictions and never with fewer. A domain profile may add to this list and may
not subtract from it, per ADR-029.

1. **Named need.** A record carrying sensitive personal content states its category and
   one line saying why that detail is needed for the project's purpose. The approval
   review shows both. Without them the write is refused.
2. **Third parties.** Content identifying another person is refused by default. The
   owner may approve one specific record with a named reason. Blanket permission is not
   available.
3. **No default startup exposure.** A record marked sensitive does not enter the boot
   brief, a pin, or a generated view unless a separate recorded owner approval names
   that exposure. Pin eligibility in section 11.1 checks this before the pin is
   allowed. The record stays fully searchable when the owner asks for it.
4. **History search is owner-request only.** The insufficient-current-sources path in
   section 15.5 does not start `session_search` in a sensitive project. Only the owner
   asking in that session starts it.
5. **Transfer stays denied unless consent is complete.** Any missing part of the
   consent record reads as denied.
6. **Storage answer on record.** Before the first sensitive record is saved, setup
   states plainly that a shared or remote repository keeps deleted content in Git
   history, and records the owner's answer: a local-only repository, or a remote with
   the history boundary accepted. The answer is a decision record. It is never assumed.

### 21.7 Secrets, credentials, and logs

Secret detection is a fixed pattern set, run over a proposal before the write and over
canonical files during validation. It covers private key blocks, common provider token
shapes, connection strings that carry a password, and environment-style assignments
whose name contains secret, token, password, or key. A match refuses the write with
`privacy/secret-detected` and names the file and line.

Pattern matching is not judgment. The owner may record an exemption for a specific
false positive. The exemption is itself a reviewed record naming the file, the pattern,
and the reason, so validation stays deterministic and the exception stays visible.

Logs, journals, and refusal messages carry ids, paths, counts, and reason codes. They
never carry record bodies, matched secret text, or sensitive content.

### 21.8 Privacy deletion and the history boundary

This restates section 14.4 and ADR-024 from the privacy side. Deletion clears the
content from current records, record history, generated views, pin state, and any
separately approved external copy, keeps only non-sensitive audit metadata, and then
reports whether an approved Git-history purge remains. The tool never claims complete
erasure it has not proven.

### 21.9 Validator check 16: physical project-root isolation

1. Exactly one active `knowledge/project.md` resolves for the working directory, and
   its front matter carries `project_id` and `project_root`.
2. `project_root` resolves, and the resolved real path contains the `knowledge/`
   directory that produced it.
3. Every canonical memory, specification, view, and local-state path canonicalizes to a
   real path inside the scope root.
4. No symbolic link or junction inside the scope resolves to a real path outside it
   without being reported.
5. No `knowledge/project.md` sits inside the scope other than declared subroots.
6. Every declared subroot exists, holds its own `knowledge/project.md`, and carries a
   different `project_id`.
7. No two scope roots in the repository are the same directory or nest without a
   declaration.
8. Every record, pin entry, and approved derived artifact read as this project's
   belongs to it by physical location: its canonicalized real path sits inside the
   scope root, with declared subroots removed. Project membership is decided by
   location, not by a field stamped on every file, because section 12 does not put
   `project_id` in the record schema and section 11.2 does not put it in a pin entry.
   Where a record or artifact does declare a `project_id`, that value must be this
   scope's id, and a mismatch is reported.
9. Every link whose target resolves into another scope names that scope's project id.
10. The two-project fixture in section 21.11 returns no cross-scope record, pin, or
    search result.

### 21.10 Validator check 17: privacy-boundary enforcement

1. `knowledge/project.md` carries a `privacy` block whose values are all known, and any
   unknown or malformed value is reported as resolved to its most restrictive setting.
2. `external_transfer: approved` has a resolvable consent record naming destination,
   content scope, approval date, and revocation route. Any missing part is reported as
   denied.
3. No enabled component, hook, or provider declares an external destination while
   transfer is denied.
4. The secret pattern set matches nothing in canonical knowledge that lacks a recorded
   exemption, and every exemption resolves to its reviewed record.
5. In a sensitive project, every record carrying sensitive content has its category,
   its needed-reason line, and its owner approval.
6. In a sensitive project, no record identifying another person exists without a
   per-record approval naming the reason.
7. No sensitive record appears in knowledge/memory/pins.md, the boot brief inputs, or
   any approved generated artifact without a recorded exposure approval.
8. In a sensitive project, the configured `session_search` gate is owner-request only.
9. Local state under the scope root contains no record body text, matched secret text,
   or sensitive content.
10. Every completed privacy deletion leaves no occurrence in current files, record
    history, views, or pin state, and carries its reported Git-history status.

### 21.11 Isolation fixtures

Checks 16 and 17 run against fixtures that ship with the validator, so the proof does
not depend on any one real project.

- **Two sibling projects, shared record ids.** Two scopes hold a record with the same
  id and a pin each. Neither project's startup, search, or pin lookup returns the
  other's record. This is the direct AT-06 proof.
- **Monorepo with declared subroots.** A parent scope declares two subroots. A session
  in a subroot resolves to that subroot, and the parent's search returns nothing from
  either subroot.
- **Undeclared nested project.** The same tree with one `subroots` entry removed stops
  with `scope/undeclared-nested-scope` and names both paths.
- **Symlink escape.** A link inside the scope points at a file outside it. Search skips
  it, retrieval never returns it, and a write through it is refused with
  `scope/symlink-escape`.
- **Similarly named sibling.** A directory beside the scope root whose name starts with
  the root's name is refused with `scope/outside-root`.
- **Sensitive project.** A sensitive record with no stated need is refused. An approved
  sensitive record stays out of startup, pins, and views, and is still found by direct
  search. Transfer with an incomplete consent record is refused with
  `privacy/consent-missing`.

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
| AT-10 | Two sources supporting unchanged meaning remain as separate evidence entries on one current record after review and cleanup. |
| AT-11 | A superseded record leaves current results and remains in its timeline. |
| AT-12 | Retirement finds surviving current uses of the retired phrase. |
| AT-13 | Consequential recall opens the record and original evidence. |
| AT-14 | Session-history search cannot run before the current-source gate or owner request. |
| AT-15 | An unanswerable question returns honest failure and searched scope. |
| AT-16 | Deleting all derived state and rebuilding produces the same canonical results. |
| AT-17 | Direct retrieval works with .memory/ absent and creates no local state. |
| AT-18 | Any attempt to enable retrieval acceleration without a new approved ADR is refused visibly. |
| AT-19 | A migration dry run changes nothing and an approved migration loses no file, link, or unchanged byte. |
| AT-20 | The owner confirms that the boot brief remembers the right things without showing too much. |
| AT-21 | A specification links to its supporting ADR, and memory_related returns that specification as a backlink with .memory/ absent. |
| AT-22 | Moving or renaming a linked ADR repairs every affected project link in one approved operation or leaves every file unchanged. |
| AT-23 | Two conflicting meanings remain separate, linked, and independently evidenced after review and cleanup. |
| AT-24 | A reported or inferred fact never renders as documented or verified. |
| AT-25 | A project ADR contains context, decision, reason, rejected options, consequences, date, status, and evidence. |
| AT-26 | One meaning with shared evidence remains one readable record rather than one file per sentence. |
| AT-27 | A simple durable record validates without a separate source, entity, or relationship registry. |
| AT-28 | A project with only the required physical core passes structure validation. |
| AT-29 | An existing project maps rules, skills, tracker, delivery, source, and reference roles without moving or copying them. |
| AT-30 | Enabling a domain profile adds only its approved fields, routes, validation, and warnings without weakening the common safeguards. |
| AT-31 | Removing the memory system leaves the remaining toolkit and every project-owned specification, reference, rule, skill, and work item intact. |
| AT-32 | A completed research spike leaves its editable report and generated reading copy in the mapped reference area, raw evidence in the original work item, and valid links in both directions. |
| AT-33 | An unreviewed research report remains labeled as unreviewed and never appears as an approved decision, memory record, or specification. |
| AT-34 | Later build work links to the research package, while approved decisions and behavior live only in their decision and specification owners. |
| AT-35 | A cold session on a different machine continues from the current focus, blockers, exact next step, and authored handoff in knowledge/current.md without the prior conversation, both in a project with no work tracker and in a project whose configured tracker cannot be reached. |
| AT-36 | Removing or disabling every native-history adapter leaves current retrieval and cross-machine continuity working from knowledge/current.md and approved project records. |
| AT-37 | A complete project scan finds no transcript copy, transcript index, generated session summary, session card, or status store beyond the required knowledge/current.md created by the memory system. |
| AT-38 | An owner-requested exact-wording search returns the original host, session, date, role, and message locator, or an honestly scoped miss. |
| AT-39 | An agent instructed to skip the approval review, and an agent writing to a canonical memory path by any route other than a section 16.1 write operation, both leave every canonical file unchanged and produce a visible refusal. |
| AT-40 | A true but unnecessary, ambiguous, overbroad, or potentially steering statement is narrowed before review or produces NOOP. |
| AT-41 | The owner opens a proposed memory through Edit, changes the temporary review file, says "good," and the exact edited contents are validated and saved without appearing in startup, recall, search, generated views, or Git-tracked knowledge before approval. |
| AT-42 | "Record what we just did" starts the normal remember workflow and cannot write a completed-work event before the normal review and approval finish. |
| AT-43 | A missing or out-of-date knowledge/current.md produces a visible stale warning naming its latest date, and the session states no current focus, blocker, or next step that the file does not contain. |
| AT-44 | Two cold sessions over the same unchanged inputs render the same current-and-recent briefing, and neither run changes knowledge/current.md or writes any other stored state. Outside the three approved triggers, no route writes knowledge/current.md. |
| AT-45 | A memory operation aimed outside the resolved scope root changes no file and produces a visible refusal naming the operation, the path, and the resolved root. This holds for a symlink escape, a similarly named sibling directory, an undeclared nested project, and a cross-scope record or pin id. |
| AT-46 | A sensitive project refuses a sensitive record that lacks its category, needed reason, or owner approval; keeps approved sensitive records out of startup, pins, and generated views while leaving them findable by direct search; refuses external transfer when no complete consent record resolves; and reports the remaining Git-history work after a privacy deletion. |

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

### ADR-004: A separate identity file is optional and narrow

- **Decision:** Project identity may remain in host instructions and the project
  overview. A separate identity file is added only when it owns distinct stable role
  or values that do not belong in those files.
- **Reason:** Every project needs identity context, but not every project needs a
  second file carrying it.
- **Rejected:** A mandatory identity file in every project, or putting tasks, status,
  project history, and detailed rules into an optional identity file.

### ADR-005: Startup uses authored or assembled context

- **Decision:** Startup files select and link approved source lines without
  model-written paraphrase.
- **Reason:** A fluent startup summary that drops a qualifier can mislead every
  session.
- **Rejected:** Model-generated current and recent summaries.

### ADR-006: Live work-item status remains in the tracker; continuity does not

- **Decision:** Where a project has a work tracker, live work-item status stays there
  and is never copied into a durable memory record. Memory owns continuity only:
  knowledge/current.md holds the current focus, blockers, next step, and handoff, and
  links to the live work item rather than restating its status. The recent window
  stays a rendered view of dated record summaries and is not stored.
- **Reason:** Copying live status into memory creates a second status store that goes
  stale and breaks one canonical home. Continuity is a different thing from status: it
  has to survive with no tracker and with the tracker unreachable, so it cannot live
  in the tracker. See ADR-032.
- **Rejected:** A permanent memory task list, a default per-session status archive,
  and a memory copy of tracker status.

### ADR-007: Use four meaning-based durable record types

- **Decision:** Durable memory uses facts, decisions, events, and patterns. Each
  record contains one independently correctable or supersedable meaning. Domain and
  topic are metadata rather than competing record types. Every fact carries an
  explicit truth status.
- **Reason:** Context, domain, knowledge, operations, and planning overlap as storage
  types. Meaning-based types make correction, time, evidence, and retrieval clear
  while the truth label prevents the word "fact" from implying false certainty.
- **Rejected:** The current folder-led taxonomy, one sentence per record, one mutable
  memory document, and a graph as the canonical model.

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

### ADR-011: Consolidate supporting evidence and preserve conflicts

- **Decision:** Another source supporting the same meaning adds evidence to the same
  record. Meanings with incompatible content, truth status, or effective dates remain
  separate and link as conflicts.
- **Reason:** Evidence difference is valuable, but it does not require duplicate
  copies of unchanged meaning. Conflicting claims must remain independently visible.
- **Rejected:** One record per source, similarity-based automatic merging, and silent
  selection of one conflicting record as truth.

### ADR-012: Review is structurally read-only

- **Decision:** Review returns a worklist. Cleanup writes only through approved
  lifecycle and pin operations.
- **Reason:** The component most likely to over-merge or over-retire cannot have a
  hidden write path.
- **Rejected:** A background curator or reflection process with write access.

### ADR-013: Direct canonical-file search is the v2 retrieval system

- **Decision:** V2 searches canonical Markdown directly through exact record ids,
  paths, metadata, and project-scoped repository text search. It opens whole records
  and follows their evidence. Reads create no index, cache, working-set file, or
  retrieval metrics.
- **Reason:** This keeps one stored copy of project meaning, removes stale-index risk,
  minimizes the privacy surface, and satisfies the current project scale without
  hidden runtime state.
- **Research basis:** SQLite documents that external-content full-text indexes can
  become inconsistent with their source and require explicit repair. See
  [SQLite FTS5](https://www.sqlite.org/fts5.html).
- **Rejected:** SQLite FTS, another full-text index, embeddings, vector search, graph
  search, provider retrieval, detached chunks, and a generated index as a required
  search dependency in v2.

### ADR-014: Future retrieval acceleration requires a new evidence-backed decision

- **Decision:** A later accelerator requires a new owner-approved ADR based on
  repeated failures against owner-worded project questions. It must prove measured
  improvement, stale-result prevention, purge and export behavior, outage fallback,
  physical project isolation, and privacy approval for external transfer.
- **Reason:** Rebuildability repairs stale derived data after the fact. It does not
  remove drift, privacy, or hidden-state risk during normal use.
- **Rejected:** Enabling an index or provider because a framework uses one, because a
  generic benchmark favors one, or because credentials are already installed.

### ADR-015: Retrieval providers are deferred beyond v2

- **Decision:** V2 implements no retrieval-provider seam. If a later ADR approves a
  provider, it may return candidates only and must pass scope, lifecycle, privacy,
  outage, export, purge, rebuild, and cross-project tests before use.
- **Reason:** [Hindsight](https://github.com/vectorize-io/hindsight),
  [Mem0](https://github.com/mem0ai/mem0),
  [Zep Graphiti](https://github.com/getzep/graphiti), and
  [Honcho](https://github.com/plastic-labs/honcho) demonstrate capable
  database-backed retrieval, while
  [memsearch](https://github.com/zilliztech/memsearch) demonstrates a rebuildable
  Markdown shadow index. None proves that this project currently needs the added
  state or consistency burden.
- **Rejected:** Treating leading memory products as interchangeable infrastructure or
  installing a provider seam before a measured project need exists.

### ADR-016: Native session history is optional, in place, and read-only

- **Decision:** Search original host history in place only after current project
  sources are insufficient or on owner request. History availability is never a
  requirement for project memory or continuity.
- **Reason:** Native history can recover exact wording but is incomplete, host-owned,
  and usually limited to one machine.
- **Rejected:** Copying, committing, uploading, auto-injecting, indexing, or silently
  promoting transcripts, plus generated session summaries or session cards.

### ADR-017: Retrieval changes require the gold set

- **Decision:** Each project measures retrieval with owner-worded questions and
  expected sources, kept in knowledge/retrieval-gold-set.md or at the path
  knowledge/map.md gives that role. The file is optional canonical state under section
  7.3.1. A missing set is a warning, and it blocks a proposed retrieval change rather
  than startup or ordinary search.
- **Reason:** Search quality must match how the owner actually asks, and a retrieval
  change nobody can measure cannot be accepted.
- **Rejected:** Acceptance based only on benchmarks or product claims, and adding the
  gold set to the required core, which would make every project carry a test file it
  may never use.

### ADR-018: Private host memory is never project truth

- **Decision:** Built-in private agent memory is not required, is not authoritative,
  and is disabled where the host allows it.
- **Reason:** It is machine-specific, invisible to Git, and not reliably shared.
- **Rejected:** A hidden second project store.

### ADR-019: Startup is byte-budgeted with required pins

- **Decision:** The boot brief has a byte budget, defaulting to 10240 bytes and set in
  the optional `startup.budget_bytes` key in knowledge/project.md front matter. The
  budget covers the current block and the recent window along with everything else the
  brief renders. Pin admission and budget changes, in either direction, are validated
  before writing. Required content, listed in section 10.4, is never silently omitted.
- **Reason:** Startup must stay small without hiding owner-selected memory, and the
  owner needs a way to raise the ceiling with the real byte count in front of them
  rather than losing content to a default.
- **Rejected:** Unbounded injection, silent pin truncation, post-startup discovery of a
  preventable budget conflict, a separate settings file for one number, and a
  lower-only rule that leaves a legitimately large required set with nowhere to go.

### ADR-020: Research evidence is rationale, not authority

- **Decision:** Prior research may explain choices but cannot create requirements or
  prove this implementation.
- **Reason:** The system must pass its own acceptance tests in a real project.
- **Rejected:** Treating private measurements as binding specification evidence or
  deleting all rationale and reopening settled choices.

### ADR-021: Pins store identity and approval, not copied meaning

- **Decision:** Pin state lives in knowledge/memory/pins.md and stores record id, a
  relative link, pin date, and the approved summary hash. That file is optional
  canonical state under section 7.3.1, not part of the required core, so a project with
  no pins carries no extra file. Startup reads the statement from the canonical record.
- **Reason:** This preserves one home for meaning and detects an unapproved summary
  change, because the hash sits in a different file from the summary it covers.
- **Rejected:** Duplicating pin text in a second file, making pins rules, model-written
  pin summaries, holding pin state in knowledge/project.md front matter where every pin
  would rewrite the authored overview, holding it on the record itself where one hand
  edit could change a summary and its own approval evidence together, and holding it
  under .memory/ where it would be gitignored, disposable, and missing on every other
  machine.

### ADR-022: Project scope uses a stable id

- **Decision:** A committed stable project id scopes pins, direct retrieval, and
  session-history requests. The resolved physical project root is also enforced.
- **Reason:** Machine paths differ, and overlapping record ids must not leak across
  projects.
- **Rejected:** A filesystem path alone or an external account as project identity.

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

### ADR-026: Author links once and derive backlinks from current files

- **Decision:** Canonical records use ordinary relative Markdown links. A
  specification links to its supporting decision record. Incoming backlinks are
  derived on request through project-scoped direct file search by record id and path.
- **Reason:** The relationship remains visible in the file that needs it, while a
  derived backlink view avoids a second hand-maintained relationship list that can
  drift. The same links work in Git, ordinary editors, Obsidian, Claude Code, and
  Codex.
- **Rejected:** A stored backlink registry, mandatory reciprocal links, Obsidian-only
  wikilinks, a graph database, or a search index as the source of link relationships.

### ADR-027: Normalize supporting records only when reuse pays for them

- **Decision:** Inline evidence locators, names, and ordinary links are the default.
  Create a reusable source or entity entry only when repeated use or ambiguity makes
  one stable identity valuable. Create a separate relationship record only when the
  relationship itself is sourced, time-varying, and independently maintainable.
- **Reason:** Optional normalization reduces real duplication without turning every
  small project into a hand-maintained database.
- **Rejected:** Mandatory source records, a global entity registry, a relationship
  folder for ordinary links, and graph-first canonical storage.

### ADR-028: Use a small fixed core and map project-owned roles

- **Decision:** Every toolkit project receives the fixed physical core in section 7.
  Rules, skills, trackers, delivery material, sources, and references remain in their
  existing owners and are resolved through knowledge/map.md.
- **Reason:** Stable bootstrap paths make setup and validation reliable, while mapped
  roles prevent duplicate trees and unnecessary moves in established projects.
- **Rejected:** A universal full repository tree, fully unconstrained paths, moving
  existing project areas to match the toolkit, and provider-defined folder layouts.

### ADR-029: Profiles extend the core without replacing it

- **Decision:** Software, Salesforce, research, health, client-delivery, and future
  profiles may add fields, routes, validation, and privacy warnings only when used.
- **Reason:** Projects need different domain support but the same approval,
  provenance, authority, scope, and privacy behavior.
- **Rejected:** Empty domain scaffolding in every project and separate incompatible
  memory systems for each profile.

### ADR-030: Memory is installed by default and removable cleanly

- **Decision:** Project initialization and sync install the common memory system in
  every toolkit project. The owner may remove it without deleting project-owned
  specifications, references, rules, skills, delivery material, or work records.
- **Reason:** Memory should be available in every project without making the rest of
  the toolkit depend on it.
- **Rejected:** Domain-based opt-in during normal setup and removal that strands or
  deletes project-owned material.

### ADR-031: Keep lasting research-spike reports in the mapped reference area

- **Decision:** A research-only or spike work item keeps its final editable report and
  generated reading copies in the project's mapped reference area. Raw queries and
  working evidence remain with the work item, and the two locations link to each
  other. The reference may be stored as unreviewed.
- **Reason:** The report remains easy to find months after the work item closes without
  pretending the research is approved behavior or durable project truth.
- **Rejected:** Leaving the only lasting report inside a completed work item, putting
  the report under durable memory, treating it as a specification, requiring the owner
  to read it before it can be stored as a reference, and copying it into later work.

### ADR-032: Memory owns cross-machine continuity through knowledge/current.md

- **Decision:** knowledge/current.md is the single owner of current focus, blockers,
  the exact next step, and the authored handoff. It is required core content, written
  only through the write coordinator on an explicit handoff, an approved change of
  current focus, or an approved completed-work event that changes current state.
  Startup reads it read-only and deterministically. A new session on any machine
  continues from that file and approved project records without the prior host
  conversation. A tracker adapter is optional and adds work-item links and live status
  when a tracker is configured and reachable.
- **Reason:** Continuity has to work in a project with no tracker, and it has to work
  when the tracker is unreachable. The project repository travels with the work, so
  the file that travels with it is the only continuity source always present. Native
  histories are incomplete and usually stay on the machine and host that made them.
- **Rejected:** Making the configured tracker the only cross-machine owner of current
  state and the handoff. That was the earlier version of this decision and it fails
  three ways: a project without a tracker gets no continuity at all, an unreachable
  tracker turns a cold session into a blind one, and every startup then depends on an
  outside service the repository does not control. Also rejected: a second
  memory-owned status store that duplicates live tracker status, copied transcripts,
  generated session summaries, and treating native history as the cross-machine
  continuity guarantee.

### ADR-033: The approval gate sits in the write path, not in the agent's instructions

- **Decision:** Owner approval is enforced by the section 16.1 write and pin
  operations, whose host review binds the decision to the five bullets and exact
  reviewed contents, plus a deterministic guard that refuses every other route to
  canonical memory and specification paths. The agent's instruction to run the
  five-bullet review stays, but it is no longer what enforces the review.
- **Reason:** ADR-009 already commits this architecture to mechanical safety, and the
  approval contract was the one load-bearing safeguard still resting on the agent
  behaving. An agent that skipped or misreported the review could write current truth.
  Moving the refusal into the write path makes the bypass fail instead of succeed.
- **Rejected:** Approval by agent instruction alone, which cannot refuse anything;
  a review hook that warns without blocking, which leaves the bad write applied; and a
  durable ledger of refused attempts, which would need a second store and is not
  required to prove the gate works.

### ADR-034: Editable proposals stay outside project truth

- **Decision:** Every memory and specification review offers an editable temporary
  proposal under `.memory/review/`. The owner can open it through an Edit action,
  change it directly, and approve the exact current contents without repeating edits
  in chat. Proposal files are excluded from canonical paths, startup, retrieval,
  generated views, and Git-tracked project knowledge.
- **Reason:** The owner needs a fast way to correct exact wording without making an
  unapproved draft look like current project truth.
- **Rejected:** Editing a canonical record before approval; requiring every correction
  to be described in chat; and treating an opened or edited proposal as approval.

### ADR-035: Every memory must be safe for a future agent to interpret

- **Decision:** Proposal and pre-write validation apply the future-agent interpretation
  test. A memory contains the minimum complete context needed for correct use and
  makes scope, evidence, authority, and uncertainty plain. Unneeded or potentially
  steering material is removed or the operation becomes NOOP.
- **Reason:** A statement can be true but still send a future agent down the wrong path
  when it is vague, overbroad, or surrounded by unnecessary context.
- **Rejected:** Saving all true related information and relying on a future agent to
  decide which parts matter.

### ADR-036: Completed work uses the normal remember workflow

- **Decision:** A request to record completed work starts the normal remember workflow
  and receives no approval shortcut. A qualifying event uses the same placement,
  interpretation, evidence, review, editing, validation, and approval rules as every
  other memory.
- **Reason:** One save path is easier to understand and protects completed-work events
  from becoming automatic activity logs or unreviewed project truth.
- **Rejected:** Treating the request itself as approval and creating automatic end-of-
  turn or end-of-session recaps.

### ADR-037: A project's scope is a physical subtree resolved from its own files

- **Decision:** The scope root is the canonicalized real path of `project_root`,
  resolved against the nearest ancestor directory holding `knowledge/project.md`.
  Membership is decided after symbolic links are expanded. A repository may hold
  several scopes, and a nested scope must be declared by its parent under `subroots`.
  An undeclared nested project, an overlap, or a duplicate project id stops the
  operation.
- **Reason:** Machine paths differ, symbolic links and similarly named folders defeat
  string comparison, and a monorepo needs more than one project without letting one
  project read or write another. Resolving from files in the project keeps the answer
  deterministic and portable.
- **Rejected:** Trusting a stored absolute path, an environment variable, or the host's
  workspace notion. Comparing path strings without canonicalizing first. Guessing which
  project a session belongs to when two candidates resolve.

### ADR-038: The privacy boundary is recorded in the project and fails closed

- **Decision:** `knowledge/project.md` front matter records sensitivity level, external
  transfer, third-party personal content, and the consent record when transfer is
  approved. A missing, unreadable, or unknown value resolves to the most restrictive
  setting. Nothing outside that file can widen the boundary, and a sensitive project
  adds restrictions rather than removing any.
- **Reason:** A privacy setting that fails open is worse than none, because it reads as
  a control while granting whatever the environment happens to allow. Keeping the
  values with the project id keeps the required structure at one settings owner.
- **Rejected:** A separate privacy settings file. Environment variables, installed
  clients, or agent instructions as consent. Treating an unparsed privacy block as
  permission.

## 24. Functional requirement traceability

### Orientation and context

| Requirement | Architecture coverage | Acceptance proof |
| --- | --- | --- |
| FR-001 | Sections 7 and 10 define the required identity meaning without requiring a separate identity file. | AT-01, AT-28 |
| FR-002 | Sections 9 and 10.4 define the byte budget, its `startup.budget_bytes` configuration key, the degradation order, the never-dropped set, and the admission preflight. | AT-02 |
| FR-003 | Sections 7.3 and 10.3 store no generated startup view in v2 and require generated labels, inputs, and deterministic fingerprints for any derived artifact a project separately approves. | AT-16 |
| FR-004 | Section 10.3 prohibits startup paraphrase and preserves source text. | AT-01, AT-20 |
| FR-005 | Section 10.3 defines three updates in 72 hours and dated fallback. | AT-01 |
| FR-006 | Sections 7.1 and 10.3 define map meaning, ownership, generated state, and drift checks. | AT-01 |
| FR-007 | Sections 10 and 16 expose skills, tools, and capability inspection. | AT-01, AT-18 |
| FR-008 | Sections 10.5 and 20 define visible warnings and fail-open startup. | AT-01 |

### Placement and storage

| Requirement | Architecture coverage | Acceptance proof |
| --- | --- | --- |
| FR-009 | Section 13.1 defines the durable-information test before a save proposal. | AT-03 |
| FR-109 | Section 13.1 and ADR-035 define the future-agent interpretation test before review and again before write. | AT-40 |
| FR-010 | Section 13.1 searches the tracker and every information owner first. | AT-03, AT-04 |
| FR-011 | Sections 4, 6, 7, and ADR-021 enforce one home and links. | AT-16 |
| FR-012 | Sections 6 and 7 plus ADR-006 keep live work-item status in the tracker where a project has one, and keep continuity in knowledge/current.md instead of a copied status record. | AT-01 |
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
| FR-110 through FR-113 | Section 13.2 and ADR-034 define the editable temporary proposal, exact-content approval, exclusions, and revalidation. | AT-41 |
| FR-021 | Sections 13.2 and 21 deny approval and writes to helpers, hooks, providers, and background processes. | AT-04 |
| FR-108 | Section 13.3 and ADR-033 put the refusal in the approved write path and refuse every other route to canonical paths. | AT-04, AT-39 |
| FR-022 | Section 12 defines permanent identity, kind, status, dates, provenance, approval, and summary. | AT-04 |
| FR-023 | Sections 12 and 12.1 require based_on evidence and explicit verification. | AT-13 |
| FR-024 | Section 14 defines every required lifecycle operation. | AT-03, AT-10, AT-11 |
| FR-025 | Sections 14 and 15 exclude obsolete records from current reads and preserve timelines, and section 14.3 hunts surviving copies of a retired phrase. | AT-11, AT-12 |
| FR-026 | Sections 12.1 and 14.2 plus ADR-011 consolidate supporting evidence and refuse incompatible meanings, truth states, or effective dates. | AT-10, AT-23 |
| FR-027 | Sections 14 and 14.4 constrain deletion and require a reason and audit evidence. | AT-16 |
| FR-028 | Section 13.4 coordinates canonical writes, affected views, validation, reporting, and rollback. | AT-16 |

### Retrieval

| Requirement | Architecture coverage | Acceptance proof |
| --- | --- | --- |
| FR-029 | Section 15.2 defines progressive tiers from loaded context to history and failure. | AT-13, AT-14 |
| FR-030 | Section 15.1 routes questions by information owner. | AT-13 |
| FR-031 | Section 15.2 defines the equal-relevance authority order. | AT-13 |
| FR-032 | Section 15.2 defines result layer, status, path or id, summary, provenance, and match reason. | AT-13 |
| FR-033 | Sections 15.2 and 20 preserve empty results and expose errors. | AT-15, AT-18 |
| FR-034 | Section 15.3 requires full-record and original-source expansion. | AT-13 |
| FR-035 | Section 15.5 permits native-history search only on owner request or after current project sources are insufficient. | AT-14 |
| FR-036 | Sections 15.5 and 15.6 scope a history miss to available project, machine, host, and dates. | AT-15 |
| FR-037 | Sections 16.3, 18.1, and ADR-014 require measured benefit against the project's gold set, and privacy consent where content leaves the boundary. | AT-17 |
| FR-038 | Section 15.6 defines honest failure and searched scope. | AT-15 |

### Review and cleanup

| Requirement | Architecture coverage | Acceptance proof |
| --- | --- | --- |
| FR-039 | Section 17 gives review no write capability and returns a worklist. | AT-10 |
| FR-040 | Section 17 lists every required worklist category plus pin and direct-search health. | AT-10 |
| FR-041 | Section 17 prevents review from merging, retiring, rewriting, deleting, pinning, or unpinning. | AT-10 |
| FR-042 | Section 17 routes cleanup through approved lifecycle and pin operations. | AT-10 |
| FR-043 | Sections 12.1, 14.2, and 17 consolidate supporting evidence while preserving linked conflicts. | AT-10, AT-23 |
| FR-044 | Section 17 defines focused and threshold-based deep review. | AT-10 |
| FR-045 | Section 17 states that age alone never deletes or retires. | AT-10 |

### Providers, privacy, and migration

| Requirement | Architecture coverage | Acceptance proof |
| --- | --- | --- |
| FR-046 | Section 16.3 and ADR-014 require a new approved decision and complete conformance proof before any future provider is enabled. | AT-18 |
| FR-047 | Sections 15 and 16.3 plus ADR-013 keep direct canonical-file recall independent of any future provider. | AT-17 |
| FR-048 | Sections 9, 16, and 21 enforce the recorded project privacy boundary. | AT-17 |
| FR-049 | Sections 15.2, 16.2, and 20 make missing capabilities visible errors. | AT-18 |
| FR-050 | Sections 10 and ADR-018 make private host memory unnecessary, non-authoritative, and disabled where possible. | AT-01 |
| FR-051 | Section 19 requires multi-signature detection, dry run, and stop on ambiguity or collision. | AT-19 |
| FR-052 | Section 19 requires preservation of existing text, links, and unchanged bytes. | AT-19 |
| FR-053 | Sections 12 and 19 preserve and report missing legacy metadata without invention. | AT-19 |
| FR-054 | Sections 13.4 and 19 require recovery and rollback until every check passes. | AT-19 |
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

### Project setup and folder roles

| Requirement | Architecture coverage | Acceptance proof |
| --- | --- | --- |
| FR-065 | Section 7 and ADR-030 install the toolkit and memory route by default. | AT-28, AT-31 |
| FR-066 | Section 7.2 and ADR-029 make profiles additive and preserve common safeguards. | AT-30 |
| FR-067 | Sections 7 and 12 plus ADR-007 define facts, decisions, events, and patterns. | AT-24, AT-25, AT-26 |
| FR-068 | Sections 7 and 12 use one meaning-based type while domain and topic remain metadata. | AT-26 |
| FR-069 | Sections 6 and 7.2 keep reference material outside durable memory and map its project-owned route. | AT-13, AT-29 |
| FR-070 | Section 12.1 defines recoverable source identity, date, version, and evidence. | AT-13 |
| FR-071 | Sections 12.1 and 13 require evidence and owner approval before research becomes current knowledge. | AT-04, AT-13 |
| FR-072 | Sections 6 and 13 route approved behavior to specifications and reusable processes to skills. | AT-04 |
| FR-073 | Section 7 and ADR-030 require clean removal while preserving project-owned material. | AT-31 |

### Remembering completed work

| Requirement | Architecture coverage | Acceptance proof |
| --- | --- | --- |
| FR-074 through FR-081 | Sections 12 and 13.5 plus ADR-036 apply the normal remember workflow and event record rules without an approval shortcut. | AT-42 |

### Links and backlinks

| Requirement | Architecture coverage | Acceptance proof |
| --- | --- | --- |
| FR-082 | Section 12.4 defines ordinary links between canonical project records. | AT-21 |
| FR-083 | Section 12.4 and ADR-026 let a specification reference its supporting decision without copying rationale. | AT-21 |
| FR-084 | Section 12.4 makes memory_related return outgoing links and derived incoming backlinks. | AT-21 |
| FR-085 | Sections 18 and 20 make missing targets visible and prevent broken links from acting as evidence. | AT-21 |
| FR-086 | Sections 12.4, 13.4, and 18 require complete link repair or rollback for a move or rename. | AT-22 |

### Durable data model

| Requirement | Architecture coverage | Acceptance proof |
| --- | --- | --- |
| FR-087 | Sections 12 and 12.3 plus ADR-007 define one independently maintainable meaning rather than one sentence. | AT-26 |
| FR-088 | Section 12 and ADR-007 require explicit truth status on facts. | AT-24 |
| FR-089 | Sections 12 and 12.1 plus ADR-011 preserve multiple evidence entries on unchanged meaning. | AT-10 |
| FR-090 | Sections 12.1 and 14.2 plus ADR-011 keep conflicting meanings separate and linked. | AT-23 |
| FR-091 | Section 12 defines the required decision and ADR content. | AT-25 |
| FR-092 | Section 12 requires an event time, range, or honest uncertainty. | AT-13 |
| FR-093 | Sections 12 and 12.1 require patterns to identify their evidence and remain epistemically distinct. | AT-13, AT-24 |
| FR-094 | Section 12.2 and ADR-027 make supporting registries optional and evidence-based. | AT-27 |

### Minimal project setup

| Requirement | Architecture coverage | Acceptance proof |
| --- | --- | --- |
| FR-095 | Section 7 and ADR-028 define the small cross-domain core. | AT-28 |
| FR-096 | Sections 7.1 and 7.2 plus ADR-028 map existing owners without moves or copies. | AT-29 |
| FR-097 | Sections 7.2 and 7.3 create optional areas only when used. | AT-28, AT-30 |

### Research-spike documentation

| Requirement | Architecture coverage | Acceptance proof |
| --- | --- | --- |
| FR-098 | Section 7.2.1 and ADR-031 keep lasting spike reports in the mapped reference area without promoting them. | AT-32, AT-33 |
| FR-099 | Section 7.2.1 identifies the editable report and derived reading copies. | AT-32 |
| FR-100 | Section 7.2.1 keeps raw evidence with the work item and requires links in both directions. | AT-32 |
| FR-101 | Sections 7.2.1, 12.4, and 13 plus ADR-031 preserve review status, links, and normal promotion approval. | AT-33, AT-34 |

### Session continuity

| Requirement | Architecture coverage | Acceptance proof |
| --- | --- | --- |
| FR-102 | Sections 7.1 and 10.6 plus ADR-032 make knowledge/current.md the owner of current focus, blockers, next step, and the authored handoff, and require it to work with no tracker. | AT-35 |
| FR-103 | Sections 10.5, 10.6, 15.5, and 20 plus ADR-032 keep cross-machine continuity independent of native history and of any tracker, and make the tracker adapter optional in section 8. | AT-35, AT-36 |
| FR-104 | Section 15.5 and ADR-016 keep history optional, read-only, in place, and conditionally searched. | AT-14, AT-36 |
| FR-105 | Section 15.5 plus ADR-016 and ADR-032 prohibit copied or generated session stores and any status store beyond knowledge/current.md. | AT-37 |
| FR-106 | Sections 15.5, 15.6, and 20 scope history gaps without blocking memory. | AT-15, AT-36 |
| FR-107 | Section 15.5 requires the native session and original message locator before exact wording is used. | AT-38 |
| FR-114 | Section 10.6 limits writes to knowledge/current.md to the write coordinator on three triggers, and section 13.3 puts the deterministic refusal in the write path. | AT-44, AT-39 |
| FR-115 | Sections 10.2, 10.3, and 10.6 make the current-and-recent briefing read-only, deterministic, and budgeted. | AT-44, AT-01 |
| FR-116 | Sections 10.5, 10.6, and 20 require a visible stale warning naming the date and forbid invented current state. | AT-43 |
| FR-117 | Sections 7.1 and 10.6 keep knowledge/current.md plain authored Markdown that the approved write path maintains without hand edits, including after an owner correction. | AT-35, AT-44 |

### Project scope and privacy boundary

| Requirement | Architecture coverage | Acceptance proof |
| --- | --- | --- |
| FR-118 | Sections 9 and 21.1 plus ADR-037 resolve the scope root from knowledge/project.md and canonicalize it, ignoring stored paths, environment, host, and remote. | AT-28, AT-45 |
| FR-119 | Section 21.2 applies the scope to search, retrieval, pins, views, local state, and every write, after symbolic links are expanded. | AT-06, AT-17, AT-45 |
| FR-120 | Section 21.4 defines the refusal message, the reason codes, and the no-partial-write rule, carried by the section 13.3 guard. | AT-39, AT-45 |
| FR-121 | Section 21.3 and ADR-037 allow several scopes per repository, require declared subroots, and forbid overlap. | AT-06, AT-45 |
| FR-122 | Sections 21.1 and 21.3 resolve the nearest ancestor and stop on an undeclared nested scope, a duplicate project id, an overlap, or an unresolved root. | AT-45 |
| FR-123 | Sections 11.5, 21.2, and 21.3 drop cross-scope candidates before ranking and require a labeled cross-scope link that is never this project's evidence. | AT-06, AT-21 |
| FR-124 | Sections 9 and 21.5 plus ADR-038 record the privacy boundary in project front matter and resolve missing or malformed values to the most restrictive setting. | AT-46 |
| FR-125 | Section 21.5 and ADR-038 deny every route outside the recorded consent, including environment, client, provider, hook, and agent instruction, and apply revocation on the next operation. | AT-18, AT-46 |
| FR-126 | Section 21.6 and ADR-029 make sensitive-project behavior additive and prevent a profile from weakening it. | AT-30, AT-46 |
| FR-127 | Sections 13.2 and 21.6 require category, named need, and owner approval, and refuse third-party personal content without a per-record reason. | AT-04, AT-46 |
| FR-128 | Sections 10.4, 11.1, and 21.6 keep sensitive content out of startup, pins, views, and log bodies without a recorded exposure approval. | AT-05, AT-46 |
| FR-129 | Sections 15.5 and 21.6 restrict session_search in a sensitive project to an owner request in that session. | AT-14, AT-46 |
| FR-130 | Sections 14.4, 21.6, and 21.8 plus ADR-024 require the recorded storage answer before the first sensitive save and the reported Git-history boundary after a deletion. | AT-46 |
| FR-131 | Sections 18, 21.9, 21.10, and 21.11 define validator checks 16 and 17 and the shipped isolation fixtures. | AT-06, AT-45, AT-46 |

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
- the direct file-search path works with .memory/ absent and creates no local state;
- the pin budget and cross-project tests exist before pin operations ship;
- migration has dry-run and rollback fixtures from current v1 projects; and
- implementation status, dependencies, and decisions made during the build are written
  down somewhere the owner can open without asking anyone. Where the project has a work
  tracker, that is the tracker. Where it does not, the build's own work-item files hold
  them, and knowledge/current.md carries the current focus, the blockers, and the next
  step, as it does in every project. This condition is about the record existing, not
  about owning a tracker.

No implementation ticket may weaken an FR. A necessary architecture change updates
this document and its ADR before the change is built.

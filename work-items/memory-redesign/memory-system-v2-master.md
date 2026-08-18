# Universal Project Memory System v2: Technical Design

**Status:** draft for owner review. Not approved for implementation.

**What this file is:** the merged technical design. It proposes how the system could
satisfy `functional-requirements.md`, which is the proposed north star and controls
when the two disagree. The architecture and decision records guide a future build only
after owner approval. The comparison table and appendices are background and cannot
create requirements. The filename keeps `master` only to avoid breaking current links.

This draft combines these design inputs:

- `V2designs/memory-system-v2-consolidated.md` (called **consolidation A** below);
- `V2designs/memory-system-v2-final-approved.md` (called **consolidation B** below);
- the two drafts under `draft designs/`.

**Authority:** this file is the design deliverable for the memory-redesign work item.
It becomes the governing spec in `knowledge/specs/` (replacing the v1
`memory-system.md`) only through the normal specification approval flow. Approval of
this design does not authorize silent implementation, bulk memory rewrites, or
automatic project migration.

---

## How the two consolidations were merged

Both consolidations were built from the same two drafts and agree on most of the
design. Where they differed, this draft proposes:

| Area | Consolidation A | Consolidation B | Proposed resolution |
| --- | --- | --- | --- |
| Memory folder names | New taxonomy: facts, decisions, events, references | Keep the v1 seven types, add events and an entity registry | **B.** The v1 names route information more clearly than one broad facts folder, existing projects already use them, and migration becomes near-zero |
| Approval | `approve` mode for clients, autonomous `curate` mode for solo projects | Owner approval always | **B.** Specification and memory changes always require owner approval before writing (FR-019) |
| Search engine | SQLite full-text engine is the reference implementation | Plain file search is the baseline; the SQLite cache is optional acceleration | **B, with A's mechanics kept.** Every project works with zero installs; the packaged cache turns on per project and all of A's measured search mechanics apply when it does |
| Root files | AGENTS.md primary, CLAUDE.md a thin pointer | Host-specific files with a tested shared block | **B.** Codex cannot follow a pointer; this repo already proved the tested-copy pattern works |
| Tool discovery | Tools taught via rules and the boot brief | Adds `memory_capabilities()` so the agent is told, never guesses | **B**, kept alongside A's rules-based teaching (FR-007) |
| Session continuity | Session cards for every project | The work tracker is the continuity source; cards only as a bridge | **B.** Active work already lives in the tracker; a second per-session store would duplicate it |
| Proactive memory | `surface_when` triggers with a raise cap | Absent | **Deferred.** Useful idea, but not required for v2; evaluate it only after the core system passes acceptance and the owner approves the added behavior |
| Research evidence | Full measured-evidence appendix as authority | Generic rationale only; private measurements are not spec authority | **Both, split.** The requirements stand on their own; the evidence appendix stays as rationale, clearly labeled as findings from the private research project, not re-verified here (ADR-020) |
| Retrieval metrics | Committed append-only log | Local metrics in the disposable cache | **B.** A committed log invites merge conflicts between parallel sessions; the backlog counter is recomputed at validation time |
| Record summary line | A `one_line` YAML field | The v1 body shape: H1 plus a one-sentence summary | **B.** The summary is extractable from the body exactly as the v1 index generator already does; one home, no duplicate field |

Shared proposals carry into this draft unless the functional requirements or an
explicit decision below say otherwise. Appendix C records the consolidation history.

---

## Part I: Foundations

### 1. Purpose and scope

A persistent memory architecture for AI-assisted projects, installable as a repeatable
blueprint by this toolkit. It must work consistently across client software projects
(Salesforce, web, mobile, integrations), personal software projects, AI agent
projects, native applications, research repositories, personal knowledge bases, and
future project types. It must work whether the active agent is Claude Code, Codex, or
another compatible agent, and it must not depend on any single storage or retrieval
provider (section 21 defines what a conforming provider must guarantee).

The north star, the owner experience, and the numbered functional requirements live in
`functional-requirements.md` and are not restated here. This document is the how.

### 2. Enforcement: why this spec is mechanical

The central finding behind this design: **written rules do not prevent amnesia or rot;
only mechanics do.** In the research project behind consolidation A, three separate
"don't duplicate" rules existed on disk and every agent read at least one; a single
fact was still hand-copied 15 times across 7 files, and a corrected false claim was
still live in four places after a dedicated correction pass. The cause is structural:
appending is the only write an agent can prove is safe, so under pressure every agent
appends. The fix is changing what is cheap and what is refused at the moment of
writing, not writing a better instruction.

So every load-bearing rule in this spec is one of three kinds, and says which:

- **economics**: the correct action is made the cheapest action;
- **refusal**: a tool refuses the wrong write with a message naming the fix;
- **detection**: a validator catches what slipped through, forever.

A rule that is none of these is orientation, not enforcement, and must not be relied
on as enforcement.

---

## Part II: Architecture

### 3. The information owners

Ten distinct owners, never interchangeable:

| Layer | Canonical home | Question it answers | Startup use |
| --- | --- | --- | --- |
| Host operating contract | `AGENTS.md`, `CLAUDE.md`, host system prompt | How must this agent operate here? | Always loaded |
| Agent identity | `SOUL.md` | Who is the agent and what must it protect? | Always read |
| Detailed behavior | Rules, skills, output style | What process applies to this task? | Routed at startup, loaded when relevant |
| Project orientation | `knowledge/project.md`, `knowledge/map.md` | What is this project and where does work live? | Always rendered into the boot brief |
| Active work | The configured work tracker | What is in progress, blocked, assigned, next? | Small current and recent view only |
| Approved behavior | `knowledge/specs/` | What should the product or system do? | Retrieved when the task touches it |
| Implemented state | Code, configuration, tests, deployed state | What actually exists now? | Retrieved when needed |
| Durable project knowledge | `knowledge/memory/` | What happened, what was decided, what do we know, why? | Index only, then task-driven retrieval |
| External and raw material | Client artifact folders, references, brainstorms | What did an outside source say; what is unchecked? | Never loaded wholesale |
| Session history | Host session history, in place | What was actually said in a past conversation? | Last-resort search only |

There is no single authority order for every question. For *what should happen*, the
current approved spec leads. For *what exists*, inspect code and configuration. For
*why*, inspect the decision record and its evidence. For *what is active*, inspect the
tracker. For *what a source said*, inspect the original. For *what was discussed*,
search session history only after current sources fail or when the owner asks. When
two current sources disagree, the agent shows the conflict and does not silently pick.

### 4. Repository layout

```text
project/
├── AGENTS.md                    # operating contract as Codex loads it
├── CLAUDE.md                    # operating contract as Claude Code loads it
├── SOUL.md                      # agent identity (mandatory, small)
├── rules/                       # detailed operating rules, loaded selectively
├── skills/                      # reusable agent processes
├── knowledge/                   # the vault (git-owned; Obsidian-viewable)
│   ├── project.md               # orientation (authored)
│   ├── map.md                   # folder meaning-map (authored + drift check)
│   ├── current.md               # working state (GENERATED, assembled)
│   ├── recent.md                # recent window (GENERATED, assembled)
│   ├── index.md                 # file index (GENERATED)
│   ├── crib.md                  # owner-vocabulary crib (authored, small)
│   ├── gold-set.md              # committed retrieval test (section 20)
│   ├── specs/                   # normative truth, incl. specs/roadmap/
│   ├── memory/
│   │   ├── tags.md              # tag vocabulary
│   │   ├── entities.md          # entity registry (section 8.3)
│   │   ├── context/  decisions/  domain/  events/
│   │   ├── knowledge/  operations/  planning/  references/
│   └── brainstorms/             # unchecked internal exploration
├── .memory/                     # GITIGNORED: search cache, working set, metrics
├── src/  tests/  ...
```

The active work tracker and client delivery folders stay where the project already
owns them; the system points to them and never copies them into `knowledge/`
(FR-012).

The full memory-system specification stays in this toolkit. Adopting projects receive
the built rules, skills, templates, and tools, never a copy of this document
(ADR-002). Their own `knowledge/specs/` holds their product specifications.

Generated files carry a do-not-edit banner, their inputs, and a deterministic input
revision or fingerprint. A wall-clock build time may live only in untracked local
metadata so an unchanged rebuild does not create a Git diff. Hand edits are surfaced
and overwritten by the next build (detection). One meaning has one home; every other
file links to it. **Adding one fact never requires updating multiple
summaries**: views regenerate from records; nothing synchronizes by hand (economics).

### 5. Entry points

**Host delivery (ADR-003).** The required meaning is identical for every agent; the
delivery shape is host-specific, because the system must never assume one root file
can import another:

| Host | Delivery |
| --- | --- |
| Claude Code | `CLAUDE.md`, auto-loaded `.claude/rules/`, and a fail-open startup hook |
| Codex | `AGENTS.md`, plus a native startup hook where available |
| Other agent | A tested adapter supplying the same contract and boot brief |

Where a host cannot follow a pointer, the required shared block is copied word for
word and a committed test checks that the copies match (detection; this repository's
`installed-copy-check` already proves the pattern). Host-specific detail may differ
outside the shared block. The shared block stays compact and carries only:

1. the required startup reads, in order: `SOUL.md`, then `project.md`, `current.md`,
   `recent.md`, `map.md`, then the memory protocol summary;
2. the layer responsibilities (the section 3 table, compressed);
3. the behavioral floor: search before assuming history; consult specs before changing
   specified behavior; consult decisions before overturning them; prefer original
   evidence over generated summaries; never promote inference to fact; NOOP over
   trivial saves; preserve provenance; supersede, never silently erase; keep writes
   small and atomic;
4. rule-loading routes by task type (memory write loads `rules/memory.md`; spec change
   loads `rules/specs.md`; and so on). Root files never inline the detailed rules.

**SOUL.md** is mandatory and is the first project context file read after the host's
operating contract. It is narrow: who the agent is in this project, whom it serves,
what it optimizes for, what it must never lose sight of. No tasks, no status, no
history, no rule lists. Template, adapted per project at install:

```markdown
# SOUL
You are the persistent <role> for this project. You help the owner move it toward its
stated objectives while preserving architectural coherence and historical context.
You optimize for: correctness, maintainability, fidelity to evidence, continuity
across sessions, explicit tradeoffs.
You are not the owner of project truth. Truth lives in source code, active specs,
canonical memory records, and original sources. Do not invent history. Do not promote
your own inference into fact. When uncertain, search; when consequential, follow
provenance to the original source; when you cannot find evidence, say so.
```

**rules/** holds one file per concern. `rules/memory.md` carries the full memory tool
documentation: every operation, every argument, when to use each. Rules answer *how
should I behave*; memory answers *what happened*. A rule file never carries project
facts; a memory never carries standing instructions.

### 6. Orientation files

**`project.md`** (authored at install; the tool asks the owner and never invents the
framing): project name and type, purpose, target users, primary technologies,
high-level architecture, major constraints, lifecycle stage, primary objective, where
active work is tracked, and a compact roadmap summary (current phase, objective,
current milestone, major remaining areas). The authoritative roadmap lives in
`specs/roadmap/`.

**`map.md`** (authored, with a structural drift check): one plain line per major
folder or component, naming what lives there, which areas are canonical, which are
generated, and which must not be hand-edited. Authored because folder meaning cannot
be derived safely from names; the validator compares its listed top-level paths
against the repository and reports missing, renamed, or undocumented areas (FR-006).

**`current.md`** (generated by assembly): current focus, active work, blockers,
recently landed capability, next likely actions, drawn from the work tracker and
current records. **`recent.md`** (generated by assembly): the last 2 to 3 days or 1 to
3 meaningful sessions: what was done, learned, left unfinished, **what failed and
should not be retried**, and where to start. The one free-prose element is the single
authored where-we-left-off line written at wrap-up.

**Neither generated file is ever free-composed by a model** (FR-004). The generators
select, sort, label, and link authored lines; they never paraphrase facts, numbers,
decisions, or failure reasons. Rationale: a controlled summarization probe kept 3 of 3
themes and 0 of 3 specific values; a fluent paraphrase that dropped its qualifier is
most dangerous in the file every session reads first. A fact, decision, number, date,
or qualifier may never exist only in the recent view.

### 7. specs/ vs memory/

**Specs answer: what should this system do.** Requirements, contracts, schemas,
acceptance criteria, architecture specifications, roadmaps. Normative and always
owner-approved. When approved behavior changes, the spec changes; Git keeps old
versions.

**Memory answers: what happened, what was decided, what do we know, and why.** A spec
says "tokens use Keychain"; the decision record says why Keychain won and what lost.
Both are required; they answer different questions.

### 8. The memory taxonomy

The v1 seven types are kept, `events/` is added, and one entity registry is added
(ADR-007):

| Folder | Use it for |
| --- | --- |
| `context/` | A persistent circumstance, stakeholder, boundary, or outside constraint |
| `decisions/` | A non-obvious choice, why it was made, what was rejected, and on what evidence |
| `domain/` | A project-specific term or business rule an agent could misread |
| `events/` | A meaningful project or domain state change (section 8.1) |
| `knowledge/` | A conclusion that prevents a repeated mistake or investigation |
| `operations/` | A repeatable operating, release, or recovery procedure with verification |
| `planning/` | Persistent direction: goals, roadmap detail, milestones, risks, assumptions |
| `references/` | External source material and what it supports (section 8.4) |

#### 8.1 Events

An event changes the historical state of the project or domain: client approved a
feature; requirement changed; release shipped; migration completed; incident occurred;
dependency deprecated; assumption disproven; experiment produced a meaningful result.
The test: *would someone working here six months from now care?* Events are never
agent telemetry: tool calls, files opened, test runs, and "implemented 14 files today"
are agent activity, not project state changes. "The legacy auth stack was fully
replaced by OAuth and retired" is an event; the 14 files that did it are not.

#### 8.2 Decisions

Each decision record preserves: what was decided, when, why, alternatives considered
and why rejected, who or what authorized it, evidence relied on, what it supersedes.
Rejected alternatives are recorded **so they are never re-argued from scratch**.

#### 8.3 Entities: a registry, not a graph

Stable concepts get stable identifiers (`authentication`, `sync-engine`,
`client-acme`) in one file: id, one-line meaning, aliases (which also feed the crib).
Records carry `entities:` lists, enabling entity-scoped retrieval and timelines. A
full entity graph as the primary structure is rejected (ADR-007): at single-team scale
it buys little over the registry, and graph decomposition of ingested text was
observed inventing sentences that were never written. Kept from graph thinking: stable
ids, and typed links with epistemic weight:
`relates: [{to: <id>, rel: <verb>, weight: documented|suspected}]`. A factual link and
an interpretive link must never look identical.

#### 8.4 References

External material keeps its retrieval metadata (url, retrieved_at) and what it
supports. **A source and the conclusion drawn from it are two linked files** (FR-015):
the conclusion (in `knowledge/`, with inference provenance) never absorbs the source;
the source never quietly becomes a conclusion.

### 9. Active work and session continuity

**The work tracker owns active work** (FR-012, ADR-006): status, blockers,
assignments, next actions, and the story of the work. The boot brief renders a small
current and recent view from it; the memory system never owns the status.

**Session cards are a bridge, not a default.** Only when a project cannot expose
tracker history may it configure pointer-only session cards (`knowledge/sessions/
cards/`): date, work-item links, memory ids, one authored handoff line. A card is
never the only home of any fact, decision, number, date, or qualifier (refusal in the
card writer plus a validator check). Rationale: summaries lose to verbatim text as a
retrieval target by 15.9 to 22.0 points in the cited research; cards point, records
and transcripts hold.

**Transcripts** stay wherever the vendor keeps them, searchable in place, never
copied, committed, promoted, or auto-injected (ADR-016 in spirit, FR-035, FR-036).

### 10. Derived views

The system may generate on-demand views: an architecture timeline, an entity
overview, recent decisions, active constraints, a milestone list, a digest. Every
derived view is marked generated and carries its inputs and deterministic input
revision or fingerprint. It is a cache and navigation aid: never canonical, never the
only home of anything, never hand-maintained. New facts never trigger view rewrites;
views regenerate when asked for.

---

## Part III: The record

### 11. Canonical record shape

Every durable memory is a Markdown file with YAML metadata, a descriptive H1, and a
one-sentence summary directly beneath the H1 (the v1 shape, kept). The summary is
what retrieval returns as *the thing to say*; it carries its own qualifier inside it
("staging shares prod Redis, per ops chat, not verified in config"). A qualifier
belonging to a *different source* is a separate record joined by `paired_with`, never
folded into the sentence.

```yaml
---
id: decision-auth-004           # permanent; duplicate id = refused write naming the fix
type: context | decision | domain | event | knowledge | operation | planning | reference
status: active | superseded | retired
recorded_at: 2026-08-17         # when the project learned it
effective_at: 2026-08-17        # when it became true in the world (when known)
valid_until: null
session: session-id-or-unavailable
source:                         # section 12; required, refused if absent
  type: owner_statement | owner_approved_decision | client_statement | client_document |
        source_code | git_commit | issue | pull_request | web_source | research_paper |
        agent_observation | agent_inference
  path: null                    # documents and code
  url: null                     # web sources
  retrieved_at: null
based_on: []                    # REQUIRED non-empty when source.type is agent_inference
tags: [authentication]          # subjects only; more than 3 warns; from tags.md
entities: [authentication, keychain]
relates: []                     # typed links, section 8.3
supersedes: null
superseded_by: null             # tool-written on the older record when superseded
paired_with: []                 # same-subject-different-source twins (section 12.3)
confirmed_on: []                # cheap reaffirmation dates
review_after: null              # staleness surfacing date, optional
retired_because: null
history: []                     # prior wordings, moved automatically on edit
---

# Refresh tokens use secure device storage

Refresh tokens live in secure device storage, not normal application storage.

<body: the full meaning, rationale, evidence links, claim-level source markers>
```

Required always: `id`, `type`, `status`, `recorded_at`, `source.type`, `session`, and
the one-sentence summary (FR-022). Existing v1 records keep their shape until an
approved edit upgrades them (FR-055). A profile (section 22) may extend the source
vocabulary (a health profile adds `medical_document` and `provider_statement`); base
types are never removed or redefined, and an extension must stay distinguishable from
`agent_inference`.

**Atomicity.** A record is indivisible everywhere: an indexer fails loudly rather
than emit a fragment, and a committed test asserts no index chunk starts inside a
record. Rationale: a mature tool's chunker, run on real structured records, produced
retrievable fragments (an attribution with no claim attached), worse than not
indexing at all.

### 12. Provenance

#### 12.1 The three laws

1. **Required.** A write without provenance is refused (refusal; FR-022).
2. **Immutable.** `source` never changes after write; `agent_inference` never upgrades
   by repetition or age. Verification is an explicit, audited edit citing what
   verified it, with the old state kept in `history` (refusal plus detection: the
   validator holds a per-record content hash and errors when an immutable field
   changed without a matching tool audit entry; stated honestly as tool-plus-validator
   enforcement, since markdown cannot physically prevent an edit).
3. **Beside the claim.** In multi-claim bodies, a claim from a different source
   carries its own marker beside that claim, so the file-level value never lends it
   false confidence (the v1 `Claim source:` marker, kept).

#### 12.2 Scoped negatives

"Not found in `src/` and the current specs", never "does not exist". Absence of a
record is not absence in the world, and wording drifts toward the absolute as it is
copied; the scope travels with the claim, verbatim (FR-036 applies the same rule to
session history).

#### 12.3 `paired_with`: protecting fact-pairs

Two statements about one subject from two sources ("the config doesn't state the
timeout" from source_code; "the client says 30 seconds" from client_statement) are
**two records**, linked symmetrically (the tool writes both sides; the validator
errors on a one-sided link), and retrieval returns them together. No operation may
ever merge them (FR-043).

### 13. Lifecycle

| Operation | Meaning | Enforcement |
| --- | --- | --- |
| **NOOP** | Store nothing | The expected common outcome; a memory system gets worse when it remembers everything |
| **ADD** | New durable knowledge | Add-only tool; duplicate-id refusal; near-duplicate warning, suppressed when the candidates' provenance differs (different sources = two facts by definition) |
| **CONFIRM** | Still true | Appends a date to `confirmed_on`; no history churn. Economics: reaffirmation is the most common write and must be the cheapest, so the lazy path and the correct path are the same path |
| **CORRECT** | The record itself was wrong | Fix in place; prior wording moves to `history` automatically, inseparable from the edit; the audit trail is the fix |
| **SUPERSEDE** | Was true; newer state replaces it | New record; the old one gets `valid_until` and `superseded_by`, tool-written in both directions. Yesterday's record stays; it was true when written |
| **RETIRE** | No longer active, no direct successor | Requires `retired_because`; reversible; excluded from current reads; runs the phrase-hunt (section 13.2) |
| **MERGE** | Combine duplicates | Allowed only when meaning and provenance are identical; both originals preserved verbatim in the survivor's history; refused otherwise (FR-026) |
| **DELETE** | Remove outright | Narrow: duplicate surplus, corruption, privacy removal, accidental records; requires a reason and a visible Git diff. Provenance-bearing knowledge normally uses supersession, but privacy removal must delete the sensitive content from records, history, indexes, and caches while keeping only non-sensitive audit metadata (FR-027) |

Changing reality is a reason to supersede, not delete. Retired and superseded records
stay available for timeline and audit questions and never appear as current truth in
startup or normal search (FR-025).

Prior wordings stored in `history` are excluded from current retrieval. They are
available only through an explicit timeline or history request. A privacy deletion
removes the sensitive wording from history too.

#### 13.1 Temporal breadcrumbs

`effective_at` / `valid_until` plus supersession pointers reconstruct any timeline.
*What do we use now* and *what did we use in March and why did it change* are both one
query (`memory_timeline(entity)`), and the answer includes the decision record that
made the change:

```text
Memory A: auth = API key, valid Jan -> May
   superseded by
Memory B: auth = OAuth, valid May ->    (via decision-auth-004, which says why)
```

#### 13.2 Retirement hunts its copies

`memory_retire` takes the exact phrasings being killed. The tool greps the tracked
files and prints every surviving copy with file and line. Retirement does not complete
until each copy is, through the normal approval flow, fixed, sentinel-wrapped
(`<!-- retired:<id> -->…<!-- /retired -->`, greppable, invisible when rendered), or
explicitly exempted on the retiring record. The validator greps every retired phrasing
on every run, forever; the indexer demotes sentinel-wrapped and retired content;
transcript search stamps matching passages "superseded by <id>". Named limit,
honestly: this is text matching; a paraphrase sharing no retired wording survives in
immutable prose, bounded by generation, demotion, and stamping, but not closed.

#### 13.3 What maintenance may never do

No operation, including any future cleanup, may merge or retire two records whose
provenance differs (refusal in the tool, not prose). The near-duplicate pair a cleanup
most wants to merge is exactly the fact-pair whose separation carries the information.

---

## Part IV: Runtime

### 14. Retrieval engine: file search first, cache as acceleration

**The baseline is zero-install** (ADR-013): canonical Markdown, the generated
`index.md`, and repository search. Every project works at this level; reads never
depend on a provider (FR-047).

**The packaged local cache** is a SQLite full-text (FTS5) index in `.memory/`:
gitignored, disposable, rebuilt from the markdown at session start (measured 0.14 to
0.35 seconds for a roughly 5 MB, 300-file corpus), integrity-checked at boot and
rebuilt rather than trusted when the check fails. Write tools synchronously re-index
the file they touched, so a fact stated at turn 3 is retrievable at turn 9. It holds
the full-text index over specs, memory, procedures, and cards; record metadata,
entity, link, and status tables; local retrieval metrics; and an `embeddings` table,
defined and empty (section 16). A project turns the cache on when its corpus or its
gold set warrants; the gold set decides, not preference.

**The database is never committed.** A committed binary store produced unresolvable
merge conflicts between overlapping sessions and a silent total-loss mode under WAL
journaling in the cited research; the committed artifact is text, always.

### 15. The retrieval ladder

Progressive and cheap-first, with tier boundaries enforced mechanically (FR-029).

**Tier 0: already loaded.** The boot brief. If it answers, stop.

**Tier 1: exact lookup.** `memory_get`, `spec_get`, `memory_timeline` when an id,
path, or entity is known. Exact before fuzzy, always.

**Tier 2: curated search.** Specs, memory, procedures, and source metadata, with
type, status, entity, tag, and date filters. Mechanics (applying in full when the
cache is on; in spirit when on file-search baseline):

1. The agent writes a **structured query** using project terms and `crib.md` aliases
   (the crib maps the owner's words to project vocabulary: "the sync thing" to
   `sync-engine`; authored, small, reviewed, no network). Plain text is the degraded
   fallback. Measured on a real corpus: naive keyword 40% recall in the top five;
   authored queries plus crib plus rerank, 90%.
2. **No blind synonym expansion** (measured actively harming 2 of 7 queries by
   diluting discriminating terms).
3. **Auto-quoting** of hyphenated and digit-letter tokens before FTS5 (`oauth2-flow`
   and `utf-8`-shaped tokens crash or silently truncate the MATCH parser); a
   committed regression asserts every crib token survives.
4. **Results carry their layer**, and rank at equal relevance in this order: current
   approved spec or original source; current owner or client statement; source code,
   Git, issue, or pull request evidence; active memory; agent observation; agent
   inference or unchecked brainstorm (FR-031, FR-032). A derived note can never
   outrank, unmarked, the source it derived from.
5. About 30 candidates, **reranked in-context by the calling agent** to about 5.
6. **Empty means empty** (FR-033). A failed or empty query returns nothing, never a
   recency fallback. A parse failure is an error, not evidence of absence.

**Tier 3: expansion.** Around near-misses: related entities, paired facts, superseded
and successor records, linked decisions, events, and specs, adjacent dates. A join on
typed links, not a second guess.

**Tier 4: the work tracker.** Continuity questions ("what did we decide last
Tuesday") go to the tracker and its recent updates, or to session cards where the
bridge is configured.

**Tier 5: session history.** Searched in place, **gated mechanically**: the tool
requires the emptiness token the earlier tiers emit (defined numerically: zero rows
after filters, or fewer than 3 above the relevance cutoff set from the gold set), or
an explicit owner request (FR-035). A result identifies project, session, date, role,
resume command, and a small excerpt; the agent opens the actual conversation segment
before relying on it. Results pass the retired-phrasings filter and arrive stamped
when superseded.

**Tier 6: honest failure** (FR-038). "I could not find reliable evidence for this in
the current project sources or the available session history", naming the scope
searched and any unavailable source. Never a plausible invention.

**The working set.** Tier 2+ results persist for the conversation (a state file in
`.memory/`: file list, record ids, entity set); follow-ups reuse it so the second
answer rests on the same sources as the first. Invalidation is computable: the query's
entity set changes, or a new date token appears.

**The primary-evidence rule** (FR-034). Snippets locate evidence; they are not
evidence. For consequential answers: result, expand the record, follow provenance,
read the original, then answer.

### 16. Embeddings: off by default, one recorded decision away

The `embeddings` table ships empty, with reciprocal-rank fusion at k=60 specified for
when it is enabled. At project scale, lexical search plus authored queries plus rerank
measured at parity or better, costs nothing, and sends nothing anywhere. Enabling
embeddings requires all three (FR-037, ADR-014): a recorded per-project consent
decision (an environment variable is not consent), privacy approval within the
client's data terms, and a gold-set failure on vocabulary-gap cases that the crib and
rerank did not solve.

---

## Part V: Behavior

### 17. Startup: the boot brief and capability discovery

Assembled at session start by the fail-open loader (Claude: SessionStart hook; Codex:
AGENTS.md route plus native hook where available). Before using memory operations, the
startup route calls `memory_capabilities()` when the host supports tool calls or reads
an equivalent generated capability manifest when it does not (FR-007). It returns:
provider name and version;
available operations; approval mode (always owner-approved in this toolkit); enabled
search modes; the privacy boundary and whether any data may leave the machine; index
state and last rebuild; the configured work tracker and session-history scope; and
any degraded feature. The brief lists the four skills and the capability result in
plain words; the agent never guesses which memory operations exist.

Slots, in order:

1. **Identity and operating route:** the SOUL summary, the host contract, which
   detailed rules to load.
2. **Project:** purpose, main goal, current phase, active work tracker.
3. **Owner working contract:** 3 to 6 authored one-liners on how the owner works,
   rendered from their canonical homes (rules, the output style, or authored
   preference records flagged `render_in_brief`), linked, never copied into memory,
   never machine-composed, never cut. *This slot is the difference between an agent
   that knows the project and one that knows the owner.*
4. **Where work stopped:** the latest authored handoff line and its work-item link.
5. **Current state:** from `current.md`, changed areas first, the rest as counts;
   entries past `review_after` render "may be stale, last confirmed <date>" (a
   rendering rule; nothing is deleted).
6. **Recent window:** at most three meaningful updates from the last 72 hours; if
   none, the latest dated update marked with its age (FR-005). Recently settled
   questions render too ("asked <date>, settled") so nothing gets re-asked.
7. **Project map:** one line per major folder.
8. **Memory contract:** the save test, the exclusion list, the skills and tools, the
   retrieval ladder, in five lines.
9. **Warnings:** stale views, validation failures, unavailable sources, maintenance
   backlog, as counts with links.

**Budget:** 10 KB rendered by default, measured in bytes; a project may lower it but
may not remove identity, project purpose, the latest handoff, or the memory tool
route. Over budget, detail degrades in this order: warning detail to a count; older
recent items to a count; unchanged current areas to a count; the map to major folders
only. The loader warns and continues; startup never blocks because a view is missing,
stale, or too large (FR-002, FR-008).

**Never auto-injected:** all decisions, all memories, all summaries, transcripts,
full specs, directory dumps, source documents. Small stable orientation plus small
current state plus a small recent window plus task-driven retrieval, never the
accumulated store. **Nothing may lean on any vendor's built-in private auto-memory**
(machine-local, invisible, unversioned). It is disabled where the host allows it and
is never required for correctness or treated as project truth (FR-050).

### 18. Optional future capability: proactive memory

Proactive reminders are outside required v2 scope and remain disabled unless the core
system first passes acceptance and the owner separately approves this capability.
One possible later design lets records carry `surface_when` triggers:
`{entity: authentication}` fires
when the working set touches that entity; `{before: <date>, days: 7}` fires at brief
time; `{mentions: [token]}` fires at turn time. Raises are tool-recorded
(`raised_on`, outcome `acted|deferred|declined`; declined suppresses that trigger until
the record changes or the owner re-enables it) and capped at two per session via the
working-set counter. Proactivity is
retrieval-triggered, not brief-stuffing: the brief stays small while the agent still
says "before you change the token flow: decision-auth-004 chose this deliberately."

### 19. The write protocol

#### 19.1 The decision ladder

```text
NEW INFORMATION
  -> search the work tracker and existing owners first (FR-010)
  -> belongs in a work item, rule, skill, spec, source folder, or session history?
       -> route it there through the project's normal process
  -> if memory is the right home: apply the persistent-information test (19.3)
  -> NOOP, or classify: context | decision | domain | event | knowledge |
       operation | planning | reference
  -> identify provenance and entities; missing provenance -> the write is refused
  -> search duplicate meaning and the timeline (Tier 1-2 first)
  -> choose ADD | CONFIRM | CORRECT | SUPERSEDE | RETIRE | MERGE | DELETE
  -> show What, Where, Why, Assumptions, Unverified; wait for keep, change, or skip
  -> write only the approved meaning as one atomic record
  -> rebuild the index, affected views, and cache as one reported operation (FR-028)
  -> run the focused read-only check; offer cleanup only on a concrete warning
```

#### 19.2 Cadence

**At-risk information is proposed the moment it appears:** an owner statement, an
approved decision, a discovered constraint, a disproven assumption, anything costly to
lose if the session died now. Proposing immediately is safe because nothing is written
until approval; tidying (the handoff line, link repair) happens at wrap-up, and a
turn-count ceiling backstops sessions that never get one, because the sessions that
end abruptly are disproportionately the ones that mattered. Never per-response
proposals; never checkpoint-only. If approval does not arrive, nothing is written and
no hidden queue is kept (FR-020); active information stays in the tracker or the
handoff.

#### 19.3 The durability test (all must pass; FR-009)

1. Will it still matter after this task or session?
2. Is it a stable fact, lasting event, decision, or state, not difficulty, novelty,
   or effort?
3. Does an existing work item, rule, skill, spec, memory, or reference already own
   it? Then update or link, never copy.
4. Would leaving it out cause a repeated explanation or the same wrong action?

Promotion examples: discussion, then the owner approves an architecture: **decision**.
Debugging, then a platform limitation is discovered: **knowledge**. Implementation,
then a migration completes: **event**. Intermediate steps: NOOP.

#### 19.4 Never stored durably

The `functional-requirements.md` section 5 list, enforced by refusal where a tool can
detect it (secrets patterns, spec restatements by retired-phrase overlap) and by the
approval review everywhere else.

#### 19.5 Approval (ADR-008)

Owner approval is always required for specification and memory changes: the
five-bullet review, keep/change/skip per item, full text shown only on request, and a
request to see it is not approval. A helper agent, hook, or provider can never
substitute (FR-021). This applies to every project and every approval surface
(FR-019).

### 20. Maintenance, review, and cleanup

- **`memory_review` is structurally read-only** (FR-039 to FR-041). It returns a
  worklist: exact and near duplicate candidates; same-subject different-provenance
  records that should be paired, not merged; conflicting current records; missing or
  invalid provenance; stale `review_after` dates; broken ids and one-sided links;
  missing supersession pointers; surviving retired phrases; tag problems; records
  that no longer pass the save test; stale generated views; gold-set failures;
  provider and cache health. It may explain and recommend; it may not write.
- **`cleanup`** takes the worklist, groups each proposed meaning separately, shows the
  five bullets, and calls the normal lifecycle tools for approved changes (FR-042).
- **Cadence:** a focused review after each approved save; a deep review on request,
  after migration, or when a configured warning backlog is crossed (FR-044). No cron,
  no background curator: sessions are the only clock that reliably exists, and a
  backlog counter is self-limiting where a day counter assumes steady traffic.
- **Metrics** live in `.memory/` (local, disposable): retrieval hits and misses,
  Tier-5 fallback emissions, duplicate warnings. A rising fallback rate means memory
  failed to capture something and feeds the next deep review. The rot signal that
  predicts a cold brief: active records past `review_after`. Age alone never deletes
  or retires anything (FR-045).

### 21. Skills and the tool surface

Four human-facing skills, kept from v1 and upgraded to the v2 mechanics:

- **remember:** routes information, applies the save test, gets approval, performs
  the lifecycle operation, validates the result;
- **recall:** loads the map, searches current sources by the ladder, follows
  provenance, reports conflict or failure honestly;
- **cleanup:** runs the read-only review, presents repair choices, performs only
  approved lifecycle operations;
- **session-search:** searches local host history after current sources fail or on
  request.

The provider-independent tool surface (fully documented in `rules/memory.md`,
summarized in the boot brief):

```text
memory_capabilities()            memory_status()
memory_search(query, filters)    memory_get(id)
memory_timeline(entity)          memory_related(id)
memory_sources(id)               memory_review(scope)
memory_add(record)               memory_confirm(id)
memory_correct(id, change)       memory_supersede(old_id, new_record)
memory_retire(id, reason, phrases)
memory_merge(ids)                memory_delete(id, reason)
spec_search(query, filters)      spec_get(id_or_path)
session_search(query, scope, empty_token)
memory_rebuild()                 memory_validate()
```

**Provider conformance (ADR-015).** Providers implement the protocol behind a
store-shaped seam; the `hasattr(...) else []` guard shape is banned by name, because a
guard around a missing method converts a loud bug into a silent lie (FR-049). A
conforming provider must: preserve the full record schema and provenance as queryable
fields; support active, superseded, and retired states without routine hard deletion;
record non-sensitive audit metadata for a delete without preserving privacy-sensitive
content as a before-image; refuse merges across differing provenance;
export every record back to canonical Markdown; keep Markdown available when the
provider fails; honor the privacy boundary and never enable external transfer from an
environment variable alone; fail loudly on missing operations; and pass the
round-trip, lifecycle, retrieval, privacy, and failure suites. These requirements are
not theoretical: each major platform evaluated in the research failed at least one
(hard-delete behind an HTTP 200, flat metadata, silent in-place updates, a
record-dismembering chunker). A provider that fails conformance is not a provider for
this system, whatever its benchmarks say.

---

## Part VI: Assurance

### 22. Per-project profiles

Install-time profiles (Salesforce, web app, iOS, AI agent, research, docs-only,
personal knowledge base) vary only: crib and entity seeds, tag starters, gold-set
template questions, the SOUL role, optional provenance-vocabulary extensions, and
`rules/` starters. Mechanics are identical everywhere.

### 23. The validation battery

Run by `memory_validate` after writes, on explicit validation, and during migration;
reads use only the focused checks needed for their operation. Failures name the file
and the fix:

1. required files and startup routes present;
2. record schema: required fields, allowed values, unique ids, provenance presence,
   non-empty `based_on` on inference;
3. link integrity: `paired_with` symmetric, supersession pointers bidirectional, no
   dangling ids;
4. retired phrasings grep, forever, honoring recorded exemptions;
5. immutability: per-record content hash versus the tool audit trail;
6. generated-view staleness (older than inputs, or hand-edited);
7. map coverage: `map.md` top-level paths versus the repository;
8. root-file shared-block drift between `CLAUDE.md` and `AGENTS.md`;
9. tag vocabulary and usage (more than 20 tags warns, as in v1);
10. atomicity: no index chunk starts inside a record;
11. the card rule, where cards are configured: no card is the sole home of a fact;
12. index and cache rebuild consistency (identical results from unchanged files);
13. provider export and re-import round-trips;
14. migration file counts, links, and byte preservation;
15. the gold set;
16. contradiction check, decidable only: quoted spans inside derived records must
    appear byte-for-byte in their cited source; numbers, dates, and
    identifier-shaped tokens must appear in the cited document. Stated plainly: an
    unquoted contradicting paraphrase is not caught by any shipped check; catching it
    would put a model in the validation path, which is banned. Meaning conflicts
    remain an agent review task and an owner decision.

### 24. The gold set

Each project keeps about ten owner-phrased retrieval questions with expected source
files in `gold-set.md`. At least eight must surface their expected file in the top
five results. The set must include: one question in the owner's own wording rather
than project terms; one exact id or identifier question; one decision-rationale
question; one timeline question; one question that must return no result; and one
token containing punctuation, a hyphen, or digits. Any retrieval change runs the set.
A provider or an embedding feature is never accepted from feature claims; it must
improve or preserve measured retrieval (ADR-017).

### 25. Acceptance

Every adopting project makes this promise:

> A new compatible agent can enter this repository with no previous conversation
> context and rapidly understand who it is, what the project is, what the project is
> trying to accomplish, what is currently happening, where information belongs, how
> history is stored, how to retrieve historical evidence, and how to maintain that
> history without corrupting it.

The proof list lives in `functional-requirements.md` section 7 and is not restated
here; implementation work items tie their acceptance tests to the FR numbers.

### 26. Migration

Additive, approved, and reversible, in four phases:

- **Phase 1, context and discovery:** add `SOUL.md`, `map.md`, generated `current.md`
  and `recent.md`, `crib.md`, `gold-set.md`, `memory_capabilities()`, and the boot
  brief, changing no existing memory file. The current four skills keep working.
- **Phase 2, lifecycle and schema:** add permanent ids, status, dates, entities,
  source objects, and the lifecycle tools; add `events/` and `entities.md`. Old
  records upgrade only when an approved edit touches them (FR-055). v1 source values
  map mechanically: `owner-quote` and `owner-paraphrase` to `owner_statement` (with a
  verbatim flag), `read-from-file` to `source_code` or `client_document` by path,
  `agent-observed` to `agent_observation`, `agent-conclusion-unchecked` to
  `agent_inference`; `superseded-by:` becomes the full lifecycle. Migration never
  invents a missing field; gaps are shown, not guessed (FR-053).
- **Phase 3, retrieval and validation:** add the ladder, working set, gold-set
  runner, and conformance tests. File search stays the baseline; the FTS cache turns
  on only after the file baseline passes.
- **Phase 4, project adoption:** detect each project's layout by multiple signatures,
  dry-run, show every ambiguous field and collision, migrate only with
  project-specific approval, remove retired pieces only after the new routes and
  checks pass (FR-051, FR-052, FR-054).

Rollback removes generated files, the local cache, and new runtime wiring; it never
erases approved Markdown or rewrites Git history.

### 27. Edge cases

- A missing startup source warns, links the missing path, and the session continues.
- A generated view older than its inputs is labeled stale and rebuilt when possible.
- An unavailable tracker shows the last dated handoff, marked "live status
  unverified".
- Two conflicting current files are both shown; neither is written until the owner
  chooses.
- Code disagreeing with a spec is reported as actual state versus expected state.
- A memory disagreeing with a spec: the spec is approved intent; the conflict is
  shown.
- A missing source type or required field refuses a new write; on a legacy record the
  gap is shown in the approval review, never silently relabeled.
- An inference with no `based_on` evidence is refused.
- Two alike records with different sources are paired, and merge is refused.
- An unavailable provider falls back to file search, labeled as degraded.
- An empty result caused by a missing provider method is a provider failure, not an
  answer.
- Unavailable or expired session history scopes the failure to the machine and dates
  known; it never becomes "this was never discussed".
- The owner asking to see full text gets it, and approval is still awaited.
- Partial approval writes only the approved groups.
- Conflicting migration signatures make no writes; an unpreservable link or
  provenance gap stops migration and shows the exact gap.
- An over-budget brief shrinks per the section 17 order and never drops identity,
  project purpose, the latest handoff, or the memory tool route.
- Any path that would send project text to an external service refuses until the
  recorded privacy decision allows it.

---

## Part VII: Architectural decision records

Each records the decision, the reason, and what was rejected, so nothing is re-argued
from scratch.

**ADR-001: Markdown and Git are canonical; every engine is a disposable index.**
Rejected: a database or vendor service as the source of truth. Text in Git is
reviewable, portable, mergeable, and survives every tool change; deleting `.memory/`
costs a rebuild, nothing more.

**ADR-002: the full system specification stays in the toolkit.** Adopting projects
receive built rules, skills, templates, and tools, never a copy of this document.
Rejected: installing the spec everywhere, which creates drift without helping
startup. (This repeats the already-recorded toolkit decision.)

**ADR-003: root instructions are host-specific but meaning-equivalent, with a drift
test.** Rejected: a universal thin pointer. Codex cannot follow a pointer from
`CLAUDE.md`; the tested word-for-word shared block is the pattern this repository
already proves.

**ADR-004: SOUL.md is required and narrow.** Identity and values only. Rejected:
tasks, status, history, or rule lists inside it.

**ADR-005: startup context is authored or assembled, never model-composed.**
Rejected: AI-generated current and recent summaries. Startup is the worst place for a
fluent summary that dropped a qualifier; the cited probe kept 0 of 3 specifics.

**ADR-006: active work stays in its tracker; session cards exist only as a
configured bridge and are never the sole home of a fact.** Rejected: a parallel
memory task list, per-session summaries, or a permanent session-status archive.

**ADR-007: keep the v1 memory taxonomy, add events and one entity registry.**
Rejected: collapsing into a broad facts folder; a full entity graph or relationship
folder as the primary structure (graph decomposition was observed inventing
sentences). The v1 names route better and make migration near-zero.

**ADR-008: owner approval is always required before specification or memory writes.**
Rejected: autonomous curate mode, delayed review at a pull request or handoff, and any
approval by helper agents, hooks, or providers.

**ADR-009: enforcement is mechanical.** Every load-bearing rule is economics,
refusal, or detection. Rejected: relying on instructions agents read; the measured
failure is 15 hand copies of one fact beside three anti-duplication rules.

**ADR-010: ADD is add-only and CONFIRM is first-class and cheap.** Rejected:
write-time reconciliation (update-or-merge on write); the leading platform measured
+20 and +26 benchmark points from removing exactly that.

**ADR-011: merge and retire are refused across differing provenance.** Rejected:
similarity-based deduplication. Same subject, different source is a fact-pair, and
its separation is the point.

**ADR-012: review is read-only; cleanup writes only through approved lifecycle
tools.** Rejected: a background curator with write access, the most dangerous
component in every system reviewed.

**ADR-013: file search is the baseline; the packaged SQLite FTS cache is optional
per-project acceleration; no committed database.** Rejected: requiring a database
for correctness (small projects should not need one) and committing binary stores
(measured merge conflicts and silent loss).

**ADR-014: embeddings require recorded need and recorded consent.** Rejected:
enablement by environment variable or by default. Content must not leave the privacy
boundary for an unproven retrieval benefit; the gold set is the evidence that reopens
the question.

**ADR-015: providers are conformance-gated, not interchangeable.** Rejected:
treating memory products as swappable on interface alone; each one evaluated failed
at least one required behavior measurably.

**ADR-016: session history is a last-resort, read-only source searched in place.**
Rejected: copying, committing, indexing into the vault, auto-injecting, or silently
promoting transcripts.

**ADR-017: retrieval changes require the gold set.** Rejected: accepting a provider
or feature from claims; search quality is measured against how the owner actually
asks.

**ADR-018: vendor built-in auto-memory is never project truth.** Rejected: a hidden,
machine-local, unversioned second store.

**ADR-019: the boot brief is byte-budgeted, carries the owner block, and degrades
instead of blocking.** Rejected: unbounded startup injection (recreates the flooding
this system exists to prevent) and a brief that knows the project but not the owner.

**ADR-020: research evidence is rationale, not authority.** The requirements and
refusals in this spec stand on their own; Appendix A's measurements explain why they
were chosen and are labeled as findings from the private research project, not
re-verified claims of this repository. Rejected: deleting the evidence (it prevents
re-litigating settled choices) and treating it as binding proof.

---

## Appendix A: Evidence (rationale, not authority)

Findings from the August 2026 private research project that motivated the mechanics;
public sources cited where they exist. Per ADR-020 these explain the choices; they
are not re-verified claims of this repository. They are not acceptance criteria and
must not drive a component choice without independent validation in this project.

1. **Rules don't hold; mechanics do:** 3 anti-duplication rules on disk, all read, 15
   copies of one fact anyway; 50.1% copy-forward across 100M clinical notes
   (published EHR-duplication research).
2. **Add-only beats write-time reconciliation:** Mem0 v3 removed ADD/UPDATE/DELETE
   reconciliation; +20 LoCoMo, +26 LongMemEval.
3. **Verbatim beats summaries as a retrieval target:** +15.9 / +22.0 (LoCoMo /
   LongMemEval-S) for verbatim chunks over extracted artifacts; 19.0% versus 89.5%
   recall (summaries versus retrieval-augmented answers, controlled); compaction
   probe: 3 of 3 themes kept, 0 of 3 specifics.
4. **Lexical plus authored queries plus rerank suffices at small scale:** 40% to 90%
   recall in the top five, measured; BM25 near-ceiling for known-item clinical
   retrieval (doi 10.2196/94241); gains live at the rerank stage (doi
   10.1016/j.jbi.2026.105053); domain-tuned embeddings underperformed general ones.
5. **Committed SQLite fails:** reproduced unresolvable add/add binary merge conflict;
   reproduced WAL silent total loss; text-committing patterns are the established
   shape.
6. **Files-as-truth is the direction of travel:** Letta/MemGPT moved memory to a
   git-backed markdown filesystem; Anthropic's memory tooling is file-shaped.
7. **Platform silent destruction, observed first-hand:** hard delete of fact plus
   history behind an HTTP 200; in-place update flipping a value undetected; an
   env-var backend switch shipping a store to a third party; a chunker splitting
   structured records into dangling fragments; an empty-query recency fallback
   presenting an unrelated memory as relevant.
8. **FTS5 sharp edges:** unquoted hyphenated tokens raise OperationalError; a
   two-character length filter silently truncates `x-ray`-shaped tokens; BM25 ranking
   requires a materialized CTE; stopwords are the caller's job.

## Appendix B: Mental model

```text
SOUL            = who am I?
AGENTS/CLAUDE   = how do I operate?
RULES / SKILLS  = what detailed constraints and processes apply here?
PROJECT/CURRENT/RECENT/MAP = where are we right now?
TRACKER         = what is active?
SPECS           = what should be true?
CODE            = what is true?
MEMORY          = what happened, what do we know, what did we decide, and why?
REFERENCES      = what did outside sources say?
TRANSCRIPTS     = what was actually said?
ENGINE / CACHE  = how do I find it?
PROVENANCE      = why should I trust it?
SUPERSESSION    = how did it change over time?
VALIDATOR       = what is quietly wrong?
```

## Appendix C: Consolidation record

**Inputs:** consolidation A (`V2designs/memory-system-v2-consolidated.md`, built on
the mechanics draft with restorations from the architecture draft) and consolidation
B (`V2designs/memory-system-v2-final-approved.md`, built on the same drafts plus the
v1 spec as baseline). Both descend from the same two drafts in `draft designs/` and
from the v1 spec in `original-design/`.

**Taken from consolidation A:** the enforcement taxonomy; the measured retrieval
mechanics (authored queries, crib, auto-quoting, no synonym expansion, rerank,
empty-means-empty, the working set, tier gating by emptiness token); the record
immutability hash check; the retirement phrase-hunt with sentinel wrapping and the
forever-grep; write-now cadence with the turn-count backstop; proactive `surface_when`
triggers with the raise cap as a deferred capability; the derived-views rule; the
evidence appendix; the mental model; the acceptance promise.

**Taken from consolidation B:** the ten-owner authority table; the numbered
functional requirements (moved to `functional-requirements.md` as the north star);
keeping the v1 taxonomy plus events and the entity registry; approval always before
writing; file-search baseline with the FTS cache as
acceleration; host-specific meaning-equivalent root files with the drift test;
`memory_capabilities()` and `memory_status()` and the explicit tool names; the
tracker as the continuity source with cards as a bridge; the six-level source
ranking; the gold-set required question types; the four-phase migration; the edge
case list; the deliberate-exclusions framing; most ADR seeds.

**Conflicts resolved:** the table at the top of this document; each carries an ADR.

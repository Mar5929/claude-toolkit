# Universal Project Memory System, v2 Design Specification (Consolidated)

**Status:** final. This is the single consolidated v2 design specification, built from
the two v2 drafts in this folder and finalized on 2026-08-17 at the owner's direction.
It replaces both drafts, which are kept only as history. It becomes the governing spec
in `knowledge/specs/` (replacing the v1 `memory-system.md`) when the owner lands it
there; until that lands, v1 still governs day-to-day agent behavior. It is standalone:
nothing here requires reading v1 or either draft.

**Lineage:** this document consolidates two inputs.

1. `agent1design-universal-project-memory-system-spec-v2.md` (called **the architecture
   draft** below): a provider-independent conceptual design defining the seven-layer
   model, the entry-point files, the orientation files, the retrieval ladder, the memory
   classes, and the tool surface.
2. `agent2design-memory-system-v2.md` (called **the mechanics draft** below): the same
   architecture grounded in an August 2026 research effort (multi-agent adversarial
   reviews, live evaluations of Hindsight, memsearch, Waku Agent, Mem0, Zep, Letta/MemGPT
   and LangMem, and measured retrieval and storage experiments). The mechanics draft had
   already absorbed most of the architecture draft; its merge record said so explicitly.

This consolidation verified that merge line by line, restored the handful of things the
mechanics draft dropped or thinned (listed in Appendix C), kept every measured rule, and
added Part VII: the design decision records the owner asked for, so every major choice
carries its reason and its rejected alternatives in one place. Where a rule has a measured
reason, the reason is cited inline and collected in Appendix A.

---

## Part I: Foundations

### 1. Purpose and scope

This specification defines a persistent memory architecture for AI-assisted projects,
installable as a repeatable blueprint by this toolkit. It must work consistently across:

- client software projects (Salesforce, web, mobile, integrations);
- personal software projects;
- AI agent projects;
- iOS and other native applications;
- research repositories;
- personal knowledge bases;
- future project types.

It must work whether the active agent is Claude Code, Codex, or another compatible agent,
and it must not depend on any single storage or retrieval provider. Section 24 defines
what a conforming provider must guarantee, and why "provider-independent" cannot mean
"any provider."

### 2. North star

Every session, on any machine, the agent opens **already oriented**: who it is, what the
project is, what it is building toward, what is true right now, what happened recently,
how the owner likes to work, where information lives, and how to find and maintain
everything else. A session ending must never mean the project forgets. A new agent with
zero prior context must be productive within its first exchange.

The agent begins **oriented, but not overloaded**: a small stable injection at startup,
everything else retrieved on demand. Historical information is retrieved when needed, not
poured into the context window. Concretely, the startup context answers:

```text
WHO AM I?                       (SOUL.md)
HOW DO I OPERATE?               (AGENTS.md / CLAUDE.md)
WHAT PROJECT AM I IN?           (knowledge/project.md)
WHAT ARE WE ACCOMPLISHING?      (project.md roadmap summary -> specs/roadmap)
WHAT IS TRUE RIGHT NOW?         (knowledge/current.md)
WHAT HAPPENED RECENTLY?         (knowledge/recent.md)
HOW DOES THE OWNER WORK?        (the owner block, section 19)
WHERE DOES INFORMATION LIVE?    (knowledge/map.md)
WHAT IS A SPEC VS A MEMORY
  VS A RULE?                    (the layer table, section 4)
HOW DO I SEARCH?                (the retrieval ladder, section 17)
HOW DO I WRITE MEMORY?          (the write protocol, section 20)
WHAT DO I NOT STORE?            (the exclusion list, section 20.4)
```

### 3. The two failure modes, and why this spec is mechanical

Everything below exists to kill two failure modes, both observed at scale:

1. **Amnesia.** Each session starts as a stranger; the owner re-explains; decisions get
   re-argued; failed approaches get retried.
2. **Rot.** Every interesting sentence gets saved; copies drift apart; a corrected claim
   survives elsewhere and gets retrieved instead of its correction; the store grows until
   nothing in it is trusted.

**The central finding of the research this spec rests on: written rules do not prevent
either failure. Only mechanics do.** In the research project, three separate "don't
duplicate" rules existed on disk and every agent read at least one; a single fact was
still hand-copied 15 times across 7 files, and a corrected false claim was still live in
four places after a dedicated correction pass. Across 100 million clinical notes, systems
run by trained professionals with written protocol, 50.1% of text is copy-forward. The
cause is structural: appending is the only write an agent can prove is safe, so under
pressure every agent appends. The fix is never a better instruction; it is changing what
is cheap and what is refused at the moment of writing.

So every rule in this spec is one of three kinds, and says which:

- **economics**: the correct action is made the cheapest action;
- **refusal**: a tool refuses the wrong write with a message naming the fix;
- **detection**: a validator catches what slipped through, forever.

A rule that is none of these is orientation, not enforcement, and must not be relied on
as enforcement.

---

## Part II: Architecture

### 4. The seven information layers and the repository layout

Seven layers, never interchangeable:

```text
1. AGENT OPERATING CONTRACT     AGENTS.md / CLAUDE.md   how do I operate?
2. AGENT IDENTITY               SOUL.md                 who am I?
3. RULES                        rules/                  detailed constraints, by task
4. ORIENTATION / WORKING STATE  knowledge/project.md, current.md, recent.md, map.md
5. NORMATIVE TRUTH              knowledge/specs/        what SHOULD be true
6. DURABLE KNOWLEDGE            knowledge/memory/       what happened, what we know, why
7. RAW SESSION EVIDENCE         session cards + transcripts
```

Source code sits beside layer 5 as the actual implementation state; specs say what should
be true, code says what is.

Concrete layout (names may adapt per tool; the conceptual separation may not):

```text
project/
├── AGENTS.md                    # vendor-neutral operating contract (thin)
├── CLAUDE.md                    # thin Claude entrypoint -> AGENTS.md
├── SOUL.md                      # agent identity (mandatory)
├── rules/                       # detailed operating rules, loaded selectively
│   ├── memory.md  specs.md  coding.md  security.md  ...
├── knowledge/                   # the vault (git-owned; Obsidian-viewable)
│   ├── project.md               # orientation (authored)
│   ├── current.md               # working state (GENERATED, assembled)
│   ├── recent.md                # recent window (GENERATED, assembled)
│   ├── map.md                   # repository meaning-map (GENERATED)
│   ├── index.md                 # file index (GENERATED)
│   ├── crib.md                  # authored vocabulary crib (section 17.2)
│   ├── gold-set.md              # committed retrieval test (section 23)
│   ├── specs/                   # normative truth (requirements, architecture,
│   │                            #   interfaces, roadmap; subfolders as needed)
│   ├── memory/
│   │   ├── facts/  decisions/  events/  references/
│   │   ├── entities.md          # entity registry (section 10.4)
│   │   ├── tags.md              # tag vocabulary
│   │   └── metrics.ndjson       # append-only rot metrics (section 22)
│   ├── procedures/              # repeatable how-to knowledge (section 10.7)
│   └── sessions/
│       └── cards/               # per-session manifest cards (section 11.2)
├── .memory/                     # GITIGNORED: SQLite engine, working set, staging
├── src/  tests/  ...
```

Generated files carry a do-not-edit banner, their inputs, and a build timestamp; hand
edits to them are surfaced and overwritten by the next build (detection). One fact has one
home; every other file links to it. **Adding one fact must never require updating multiple
summaries.** Views regenerate from records; nothing synchronizes by hand (economics; this
single property is what kept every generated file in the research project drift-free
while every hand-maintained summary beside them drifted).

### 5. Entry points: AGENTS.md, CLAUDE.md, SOUL.md

**AGENTS.md** is the vendor-neutral contract and stays compact. It carries only what
virtually every session must know:

1. **Required startup reads, in order:** `SOUL.md`, then `knowledge/project.md`,
   `current.md`, `recent.md`, `map.md`, then the memory protocol summary. Load additional
   rules only as the task requires.
2. **The layer responsibilities:** the section 4 table, three lines each, so the agent
   knows what a spec is versus a memory versus a rule versus working state.
3. **The core behavioral floor:** search before assuming history; consult specs before
   changing specified behavior; consult decisions before overturning them; prefer
   original evidence over generated summaries; never promote inference to fact; NOOP over
   trivial saves; preserve provenance; supersede, never silently erase; keep writes small
   and atomic; do not hand-synchronize derived summaries.
4. **Rule-loading:** detailed instructions live in `rules/`, loaded by task type (memory
   write loads `rules/memory.md`; spec change loads `rules/specs.md`; security-relevant
   work loads `rules/security.md`). The root files never inline them. This keeps the
   always-loaded surface small.

**CLAUDE.md** is deliberately thin: "Read AGENTS.md, SOUL.md, and the startup context;
follow the memory protocol; load rules selectively; use the project's memory tools
instead of assuming historical facts." Claude-specific wiring only (hooks, skill routes).
**The two files never duplicate an instruction set. Duplication is drift** (the research
project measured exactly this failure in duplicated rule text).

**SOUL.md is mandatory** and read first, every session, with the same priority as the
root agent instructions. It defines who the agent is in this project, why it exists here,
whom it serves, what it optimizes for, and what it must never lose sight of. Identity and
values, stable across months. It contains no tasks, no status, no history, no rule lists,
no transient project details. Template, adapted per project at install:

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

### 6. rules/: detailed instructions, loaded selectively

One file per concern (`memory.md`, `specs.md`, `coding.md`, `testing.md`, `security.md`,
`git.md`, and whatever else the project needs). AGENTS.md routes to them by task type.
`rules/memory.md` is where the full memory tool documentation lives: every verb, every
argument, when to use each (the boot brief carries only the five-line summary).

Rules answer *how should I behave*; memory answers *what happened and what do we know*.
A rule file never carries project facts, and a memory never carries standing
instructions. Example of the difference: `rules/memory.md` says "when a durable fact
changes, supersede the previous memory"; `memory/decisions/adr-018.md` says "we migrated
authentication from API keys to OAuth on May 12." These are fundamentally different
kinds of statements and never share a file.

### 7. knowledge/project.md: orientation and roadmap

Authored at install: the tool asks the owner for the real framing; it never invents it.
Contains, concisely: project name and type; purpose; target users; primary technologies;
high-level architecture; major constraints; lifecycle stage; primary objective; where
active work is tracked; and a compact roadmap summary.

The roadmap summary names the current phase, the primary objective, the current
milestone, and the major remaining areas, so the agent understands both what it is
working on and what larger goal the work serves. The authoritative full roadmap lives in
`specs/roadmap/`; project.md carries only the summary. Orientation, not history, and not
a status report.

### 8. current.md and recent.md: the working state

**`current.md`: what is true right now.** Generated by assembly: current focus; active
work; blockers; recently landed capability; next likely actions. Each line is drawn
verbatim from records, work items, or the authored handoff line. The generator places
sentences; it never composes them.

**`recent.md`: the recent window.** The last 2 to 3 days, or the last 1 to 3 meaningful
sessions: what was done, what was learned, what remains unfinished, **what failed and
should not be retried** (the highest-value line in a handoff), and where the next session
should start. Assembled from session cards and dated entries; the one free-prose element
is the single authored "where we left off" line written at each wrap-up. It must never
grow into a multi-month historical summary.

**Neither file is ever free-composed by a model.** Measured reason: summarization keeps
high-level themes and drops specifics. A controlled probe kept 3 of 3 themes and **0 of 3
specific values**; a paraphrase reads equally fluent with or without the dropped
qualifier, which is precisely what makes it dangerous in the one file every session reads
first.

### 9. knowledge/map.md: the repository meaning-map

Mandatory, read at startup. The map describes the **meaning** of the repository
structure, not a raw directory listing: one line per major folder saying what lives
there. It tells the agent:

```text
where each kind of information belongs
where each kind of information should be searched
which directories are canonical
which are generated
which must not be hand-edited
```

The map is regenerated when project structure changes (its folder list is derived; its
one-liners are authored once and carried forward).

### 10. specs/ vs memory/: normative vs historical

The distinction is essential and both are required.

**Specs answer: what should this system do.** Finalized business and product
requirements, feature specifications, API and interface contracts, data schemas,
acceptance criteria, current architecture specifications, security requirements,
roadmaps, non-functional requirements. Normative: the project is expected to satisfy
them. When approved behavior changes, the spec changes in the same work; Git keeps old
versions. Always owner-approved.

**Memory answers: what happened, what was decided, what do we know, and why.** A spec
says "tokens use Keychain"; the matching decision record says why Keychain won and what
lost. Classes:

#### 10.1 Facts (`memory/facts/`)

Durable, provenance-bearing statements likely to matter across many sessions: "the
client requires US-only data residency", "the API uses UUIDv7", "staging shares the
production Redis". Includes domain vocabulary a future agent could misread, and
conclusions the project drew from investigation (marked with their inference
provenance). Not restatements of active specs: a fact that merely repeats a spec is a
NOOP.

#### 10.2 Decisions (`memory/decisions/`)

Architectural decision records (ADRs) and other durable choices. Each preserves: what
was decided; when; why; alternatives considered and why rejected; who or what authorized
it; evidence relied on; what it supersedes. Rejected alternatives are recorded **so they
are never re-argued from scratch**, with the evidence, so a future "why don't we just…"
finds the answer.

#### 10.3 Events (`memory/events/`)

**A meaningful event changes the historical state of the project or domain:** client
approved a feature; requirement changed; release shipped; migration completed; incident
occurred; dependency deprecated; scope changed; critical assumption disproven;
experiment produced a meaningful result. The test: *would someone working here six
months from now care that this happened?* If not, it does not belong in durable event
memory.

Events are **not agent telemetry.** Never durable: tool calls, files opened, tests run,
routine errors, "implemented 14 files today". Completing a large task is not itself an
event. The distinction is *agent activity* versus *project state change*; store the
second. "The legacy auth stack was fully replaced by OAuth and retired" is an event; the
14 files that did it are not.

#### 10.4 Entities (`knowledge/memory/entities.md`: a registry, not a graph)

Stable concepts get stable identifiers: `authentication`, `sync-engine`, `client-acme`,
`api-v2`. The registry is one file: id, one-line meaning, aliases (which also feed the
crib, section 17.2). Records carry `entities:` lists, enabling entity-scoped retrieval
and timelines without free-text luck.

**A full entity graph as the primary structure is deliberately rejected** (decision
DR-4): at single-team project scale it buys little over the registry, and graph
decomposition of ingested text was observed, in a mature platform, returning sentences
that were never written, which is fatal for verbatim records. Kept from graph thinking:
stable ids, and typed links with epistemic weight.

#### 10.5 Relationships: typed links on records, not a folder

`relates: [{to: <id>, rel: <verb>, weight: documented|suspected}]`. `documented` means a
source states the connection; `suspected` means an agent proposes it. A factual link and
an interpretive link must never look identical.

#### 10.6 References (`memory/references/`)

External source material with retrieval metadata (url, retrieved_at) and what it
supports. **A source and the conclusion drawn from it are two linked files.** The
conclusion (a fact with inference provenance) never absorbs the source, and the source
never quietly becomes a conclusion.

#### 10.7 Procedures (`knowledge/procedures/`)

Repeatable how-to knowledge with verification steps: releases, migrations, credential
rotation, triage runbooks. Indexed by the same retrieval engine. The classic semantic /
episodic / procedural memory triad maps onto this system as facts+entities /
events+sessions / procedures.

#### 10.8 The routing table

| Information | Home |
|---|---|
| Final requirement, API contract, schema, acceptance criteria, roadmap | `specs/` |
| Why an architecture was chosen; the previous architecture; rejected options | `memory/decisions/` |
| Durable project or domain fact; investigated conclusion; domain term | `memory/facts/` |
| Milestone, incident, requirement change, completed migration | `memory/events/` |
| Stable concept identity | `entities.md` |
| External source material | `memory/references/` |
| Runbook | `procedures/` |
| Standing agent instruction | `rules/` |
| Current focus and blockers | `current.md` (generated) |
| Recent handoff | `recent.md` (generated) |
| The conversation itself | session card + transcript |
| Agent tool call, routine error, temporary hypothesis | **nowhere durable** |
| Temporary TODO | task system / current state |
| Owner's working preferences | preference records (section 19, owner block) |

### 11. Sessions: cards and transcripts

#### 11.1 Transcripts

The last-resort evidence layer. Kept wherever the vendor keeps them (local CLI history),
searchable in place, **never copied, promoted, or auto-injected**. Scope honesty: local
history is per-machine and expires; a failed transcript search proves nothing about
whether a discussion happened, and the agent says "not found in this machine's history",
never "never discussed".

#### 11.2 Session cards (`knowledge/sessions/cards/`)

One small committed card per meaningful session, written at wrap-up: date; topics;
**pointers** to entries written and decisions made (ids, not prose); how the session
ended; the authored where-we-left-off line. Cards are search keys and continuity. **A
card is never the only home of any number, date, decision, quote, or qualifier**
(refusal in the card writer plus a validator check). Measured reason: extracted
artifacts lose to verbatim text by 15.9 to 22.0 points as a retrieval target; summaries
scored 19.0% versus 89.5% recall in a controlled comparison. Cards point; records and
transcripts hold.

### 12. Derived views

Beyond the four generated orientation files, the system may generate on-demand views:
an architecture timeline, an entity overview, recent decisions, active constraints, a
milestone list, a periodic digest. Every derived view is marked as generated, carries
its inputs and build timestamp, and is a cache and navigation aid, never canonical
truth, never the only home of anything, and never hand-maintained. New facts never
trigger view rewrites; views regenerate when asked for (the no-synchronization-tax
principle of section 4).

---

## Part III: The record

### 13. Canonical record schema

Every durable memory is a Markdown file (or a fenced-YAML record within a class file:
one shape per project, chosen at install) with this metadata:

```yaml
---
id: adr-auth-004                # permanent; duplicate id = refused write naming the fix
type: fact | decision | event | reference | procedure
title: "Refresh tokens move to OS keychain"
one_line: "Refresh tokens live in the OS keychain, not app storage."   # section 13.1
status: active | superseded | retired
created_at: 2026-04-12
effective_at: 2026-04-12        # when it became true in the world
recorded_at: 2026-04-12         # when the project learned it (omit when equal)
mentioned_at: []                # dates it was materially discussed (feeds "what did
                                #   we talk about last week")
valid_from: 2026-04-12
valid_until: null
entities: [authentication, keychain]
tags: [security]                # subjects only; at most 3; from tags.md
source:                         # section 14; required, refused if absent
  type: user_approved_decision
  session: 2026-04-12-auth-review
based_on: []                    # REQUIRED non-empty when source.type is agent_inference
relates:
  - {to: adr-auth-001, rel: supersedes, weight: documented}
supersedes: adr-auth-001
superseded_by: null             # tool-written on the older record when superseded
pair_with: []                   # same-subject-different-source twins (section 14.3)
confirmed_on: []                # cheap reaffirmation dates (section 15)
retired_because: null
history: []                     # prior wordings, moved automatically on edit
---
<body: the full statement, rationale, evidence links>
```

#### 13.1 `one_line`

Authored at filing (warn over 120 characters, error over 200). It is what retrieval
returns as *the thing to say*, and it carries its own qualifier inside it ("staging
shares prod Redis **per ops chat, not verified in config**"). A qualifier that belongs
to a *different source* is a separate record joined by `pair_with`, never folded into
this string. The agent's job becomes placing an authored sentence, not re-composing a
hedge each time; the one honest clause survives because it was written once, at the
moment the context was known.

#### 13.2 Atomicity

A record is indivisible everywhere: the indexer fails loudly rather than emit a
fragment, and a committed test asserts no index chunk starts inside a record. Measured
reason: a mature tool's chunker, run on real structured records, produced retrievable
fragments (an attribution with no claim attached, a value list with no statement), which
is worse than not indexing at all.

### 14. Provenance

#### 14.1 Vocabulary

`source.type` is one of:

```text
owner_statement          owner_approved_decision    client_statement
client_document          source_code                git_commit
issue                    pull_request               web_source
research_paper           agent_observation          agent_inference
```

plus per-type fields: `path` (documents and code), `url` + `retrieved_at` (web),
`session` (statements and decisions), `based_on` (inference: required, non-empty,
listing record ids). A profile (section 26) may extend the vocabulary with
domain-specific types (a health profile adds `medical_document` and
`provider_statement`, for example); the base types are never removed or redefined, and
an extension must remain distinguishable from `agent_inference`. An agent inference must
never masquerade as an owner statement or an authoritative specification.

#### 14.2 The three laws

1. **Required.** A write without provenance is refused (refusal).
2. **Immutable.** `source` never changes after write; `agent_inference` never upgrades by
   repetition or age. Verification is an explicit edit citing what verified it, with the
   old state in `history` (refusal plus detection: the validator holds a per-record
   content hash and errors when an immutable field changed without a matching tool audit
   entry; stated honestly as tool-plus-validator enforcement, since markdown cannot
   physically prevent an edit).
3. **Beside the claim.** In multi-claim bodies, a claim from a different source carries
   its own marker on the claim, so the file-level value never lends it false confidence.

**Scoped negatives:** "not found in `src/` and the specs", never "doesn't exist".
Absence-of-record is not absence-in-world, and wording drifts toward the absolute as it
is copied; the scope travels with the claim, verbatim.

#### 14.3 `pair_with`: protecting fact-pairs

Two statements about one subject from two sources ("the config doesn't state the
timeout" [source_code] / "the client says 30 s" [client_statement]) are **two records**,
linked by symmetric `pair_with` (the tool writes both sides; the validator errors on a
one-sided link), and retrieval returns them together as a join. No operation may ever
merge them (section 15).

### 15. Lifecycle

Memory has a lifecycle. The operations, each with its enforcement kind:

| Op | Meaning | Enforcement |
|---|---|---|
| **ADD** | New durable knowledge | add-only tool; duplicate-id refusal; near-duplicate warning, **suppressed when the candidates' provenance differs** (different sources = two facts by definition) |
| **NOOP** | Store nothing | the expected common outcome; a memory system gets worse when it remembers everything |
| **CONFIRM** | "Still true" | appends a date to `confirmed_on`; no history churn. Economics: reaffirmation is the most common write and must be the cheapest; the lazy path and the correct path must be the same path |
| **CORRECT** | The record itself was wrong | fix in place; prior wording moves to `history` with `retired_because: recorded-in-error`; the audit trail *is* the fix; the move is automatic and inseparable from the edit |
| **SUPERSEDE** | Was true; newer state replaces it | new record; old one keeps `valid_until` + `superseded_by` (tool-written both directions). Yesterday's record stays; it was true when written |
| **RETIRE** | No longer active, no direct successor | requires `retired_because` + tool timestamp; reversible; excluded from active reads; **with the phrase-hunt** (section 15.2) |
| **MERGE** | Combine duplicates | allowed **only when provenance is identical**; both originals go verbatim into the survivor's history (refusal otherwise) |
| **DELETE** | Remove outright | narrow: duplicates' surplus, corruption, privacy removal, accidental records; refused for provenance-bearing knowledge (supersede instead); requires a reason; always a visible git diff |

Changing reality is a reason to **supersede**, not delete.

#### 15.1 Temporal breadcrumbs

`valid_from` / `valid_until` plus supersession pointers reconstruct any timeline. *What
do we use now* and *what did we use in March and why did it change* are both one query
(`timeline(entity)`), and the answer includes the decision record that made the change:

```text
Memory A: auth = API key, valid Jan -> May
   superseded by
Memory B: auth = OAuth, valid May ->    (via ADR-nnn, which says why)
```

#### 15.2 Retirement hunts its copies

`retire` takes `retired_phrasings:`, the exact wordings being killed. The tool greps the
repository, prints every surviving copy with file and line, and refuses to complete
until each is fixed, sentinel-wrapped (`<!-- retired:<id> -->…<!-- /retired -->`,
greppable, invisible rendered), or explicitly exempted on the retiring record. The
validator greps every retired phrasing on every run, forever; the indexer demotes
sentinel-wrapped chunks and `status: retired/superseded` content; transcript search
stamps matching passages "superseded by <id>". Measured reason: a corrected claim
outlived its correction in four files *after a dedicated correction pass*, and the
proposed index ranked the stale copy above the correction. Named limit, honestly: this
is text-matching; a paraphrase sharing no retired wording survives in immutable prose,
bounded by generation (assembled views cannot carry it), demotion, and stamping, but not
closed.

#### 15.3 What maintenance may never do

No operation, including any future "cleanup", may merge or retire two records whose
provenance differs (refusal in the tool, not prose). Measured reason: the near-duplicate
pair a cleanup most wants to merge is exactly the fact-pair (section 14.3) whose
separation is the point; and the leading memory platform removed write-time merge/update
reconciliation after measuring that it destroyed information (+20 and +26 on the LoCoMo
and LongMemEval benchmarks from going add-only).

---

## Part IV: Runtime

### 16. The retrieval engine

One SQLite database per project in `.memory/`: **gitignored, disposable, rebuilt from
the markdown at session start** (measured 0.14 to 0.35 s for a roughly 5 MB, 300-file
corpus). `PRAGMA integrity_check` at boot; a failing store is rebuilt, never trusted.
Write tools synchronously re-index the file they touched (composite chunk key: path +
line range + content hash + index version), so a fact stated at turn 3 is retrievable at
turn 9. It holds: an FTS5 index over specs, memory, procedures, and cards (and the
transcript index, separately flagged); record metadata, entity, link and status tables;
and an `embeddings` table, defined and empty (section 18).

**The database is never committed.** Measured: a committed binary store produced
unresolvable add/add merge conflicts between overlapping sessions, and a silent
total-loss mode under WAL journaling; git history goes blind on it; every established
pattern commits exactly one artifact, and it is text. Canonical memory must never
disappear because an index was deleted; deleting `.memory/` costs a rebuild, nothing
more.

### 17. The retrieval ladder

Progressive, cheap-first, with the tier boundaries enforced mechanically.

**Tier 0: already loaded.** The startup injection (section 19). If it answers, stop.

**Tier 1: exact lookup.** When the target is known: `get(id)`, `timeline(entity)`,
`spec_get(id)`. Exact before fuzzy, always.

**Tier 2: hybrid curated search.** Specs, facts, decisions, events, entities,
procedures, references, with metadata filters (type, status, entity, date). Mechanics,
each carrying its measured reason:

1. Primary input is an **agent-authored structured FTS5 query** (AND-of-OR groups);
   plain text is the degraded fallback. The agent is a language model; query composition
   is where "search by meaning" enters, free. (Measured on a real corpus and
   owner-phrased gold questions: naive keyword 40% recall@5; authored queries + crib +
   rerank 90%.)
2. The **authored crib** (`knowledge/crib.md`): owner's words mapped to project
   vocabulary ("the sync thing" maps to `sync-engine`), seeded per profile, fed by
   entity aliases; rendered into the generated map; auditable; no network. **No blind
   synonym expansion** (measured actively harming 2 of 7 queries by diluting
   discriminating terms).
3. **Auto-quoting** of hyphenated and digit-letter tokens before FTS5 (`oauth2-flow`,
   `utf-8`, `L5-S1`-shaped tokens crash or silently truncate the MATCH parser; a
   committed regression asserts every crib token survives the rewriter and returns
   results).
4. **Results carry their layer**, and normatively-sourced hits (specs, client documents)
   sort above derived hits (agent inference) at equal relevance. A derived note can
   never outrank, unmarked, the source it derived from.
5. About 30 BM25 candidates, **reranked in-context by the calling agent** to about 5
   (clinical retrieval studies place the gain at the rerank stage, not the embedding
   stage).
6. **Empty means empty.** A failed or empty query returns nothing, never a recency
   fallback (a shipped system's own docstring records the cost: an unrelated memory
   presented under "Relevant memory"). A parse failure is an error, not evidence of
   absence.

**Tier 3: expansion.** Around near-misses: related entities, superseded and successor
records, linked decisions and events, adjacent dates. This is a join on typed links, not
a second guess.

**Tier 4: session cards.** Continuity questions ("what did we decide last Tuesday").

**Tier 5: transcripts.** Verbatim-turn index, **gated**: the search tool refuses to run
without the emptiness token Tier 2 emits (defined numerically: zero rows after filters,
or fewer than 3 above the relevance cutoff set from the gold set). Mechanical gating,
not instruction; models measurably confuse similar search tools (a filed, unresolved
issue in a leading memory framework). When a transcript hit matters, open the actual
conversation segment; never trust a generated summary of it. Results pass the
retired-phrasings filter and arrive stamped when superseded.

**Tier 6: honest failure.** "I could not find reliable evidence for this in the
project's memory or this machine's session history." Never a plausible invention.

**The working set.** Tier 2+ results persist for the conversation (a state file in
`.memory/`: file list, record ids, entity set) and follow-ups reuse it, so the second
answer rests on the same sources as the first. Invalidation is computable: the query's
entity set changes, or a new date token appears.

**Routing by question type:** *what should it do* goes to specs; *why is it this way*
goes to decisions; *what happened* goes to events and timelines; *what were we just
doing* goes to cards; *what exactly was said* goes to transcripts.

**The primary-evidence rule.** Snippets locate evidence; they are not evidence. For
consequential answers: result, then expand the record, then follow provenance, then read
the original, then answer.

### 18. Embeddings: off by default, one switch away

The `embeddings` table (record id, model, dims, vector, created_at) ships empty, with
reciprocal-rank fusion at k=60 specified as the fusion rule for when it is enabled.
Rationale: at a few MB or less, BM25 + authored queries + rerank measured at parity or
better, costs nothing, and sends nothing anywhere. Turning embeddings on is a
**recorded, per-project consent decision**: for client projects, sending content to an
embedding API is governed by the client's data terms, and an environment variable is not
consent (a reviewed system shipped exactly that: one env var silently routing the whole
store to a third-party service). If a project's gold set fails on vocabulary-gap cases
after the crib and rerank are in place, that is the evidence that reopens this default,
on the merits, per project.

---

## Part V: Behavior

### 19. Startup injection: the boot brief

Assembled at session start (Claude: SessionStart hook; Codex: AGENTS.md route plus hook
where available; both fail open). Slot order; ceiling about 10 KB rendered, measured in
bytes; warn when approaching; **over it, degrade to slots 0 and 1 plus one-line counts
and warn loudly. Never block the session.** Eviction when shrinking: slot 5 first, then
slot 4's overflow, then slot 3, then slot 2's card detail (its authored line is
protected). Slots 0 and 1 are never evicted and are budgeted at 2 KB or less together.

- **Slot 0, orientation:** SOUL pointer; project one-liner; the map; the memory protocol
  in five lines (what the layers are, the tool surface names, the write ladder in one
  line, the retrieval ladder in one line, the exclusion list pointer).
- **Slot 1, the owner block:** 3 to 6 authored preference and context one-liners flagged
  `render_in_brief` (how the owner wants reviews, standing asks, working conventions).
  Authored when learned, never machine-composed, never cut. *This slot is the difference
  between an agent that knows the project and one that knows the owner; its absence was
  the flagship failure of an otherwise-complete design in review.*
- **Slot 2, where we left off:** the authored handoff line plus the last session card.
- **Slot 3, current state:** `current.md` content, changed areas first, the rest as
  counts; entries past their review-by date render "may be stale, last confirmed
  <date>" (a rendering rule; nothing is deleted).
- **Slot 4, open questions and recent decisions:** capped, with an overflow count;
  recently settled items render too ("asked <date>, settled") so nothing gets re-asked.
- **Slot 5, machinery:** validator warning count plus pointer; maintenance backlog count
  when over threshold.

**Never auto-injected:** all decision records, all facts, all summaries, transcripts,
full specs, directory dumps, source documents, entire entity listings, large generated
digests. The budget principle: small stable orientation + small current state + small
recent window + task-driven retrieval, never the accumulated store. This preserves
reasoning space and reduces stale-context effects. **Nothing may lean on any vendor's
built-in private auto-memory** (machine-local, invisible, unversioned; disabled in
adopting projects).

### 20. The write protocol

#### 20.1 The decision ladder

```text
NEW INFORMATION
  -> Belongs in a spec?               YES -> spec workflow (owner-approved)
  -> Durable? (section 20.3 test)     NO  -> NOOP (say so in one line)
  -> Classify: fact | decision | event | reference | procedure
  -> Identify provenance (section 14)     missing -> the write is refused
  -> Resolve entities; search duplicates and history (Tier 1-2 first)
  -> ADD | CONFIRM | CORRECT | SUPERSEDE | RETIRE
  -> Write one atomic record -> index updates synchronously -> done
```

#### 20.2 Cadence: when writes happen

**At-risk information writes immediately:** an owner statement, a decision, a discovered
constraint, a disproven assumption, anything that would be lost if the session died
right now. Safe because ADD is add-only and cannot damage anything. Tidying (cards, the
handoff line, link repair) happens at wrap-up. A turn-count ceiling backstops sessions
that never get a wrap-up, and the sessions that end abruptly are disproportionately the
ones that mattered. Never per-response writes; never checkpoint-only. (Both extremes
measured harmful: per-response floods; checkpoint-only forgets the sessions that die.) A
failed write leaves its queue unprocessed; a queue is never marked done on failure.

#### 20.3 The durability test (all must pass)

1. Will it matter after this session?
2. Is it a stable fact, decision, event, or state, not difficulty, novelty, or effort?
3. Does an existing home own it? (Then update or link, never copy.)
4. Would omitting it cause a repeated explanation or a repeated wrong action?

Promotion examples: discussion, then the owner approves an architecture: **decision
record**. Debugging, then a platform limitation is discovered: **fact**. Implementation,
then a migration completes: **event**. Intermediate steps: NOOP.

#### 20.4 Never stored durably

Tool calls; commands; files opened; code-edit play-by-play; routine compiler and test
errors; temporary hypotheses; chain-of-thought; casual conversation; restatements of
active specs; ephemeral task state; generated prose without provenance; repetitive
summaries; secrets and credentials; private personal information in shared or public
repositories.

#### 20.5 Approval modes

Set per project at install:

- **`approve`** (default for client profiles): every durable save shows the short
  review, What / Where / Why / Assumptions / Unverified, and waits for keep, change, or
  skip. No reply means no write.
- **`curate`** (default for solo profiles): the agent writes within this spec's refusal
  rules; git diffs are the review surface; the five-bullet summary renders in the pull
  request or handoff instead of blocking mid-session.

Specs are owner-approved in both modes, always.

### 21. Proactivity

Records may carry `surface_when` triggers: `{entity: authentication}` (fires when the
working set touches it); `{before: <date>, days: 7}` (brief-time); `{mentions: [token]}`
(turn-time). Raises are tool-recorded (`raised_on`, outcome `acted|deferred|declined`;
`declined` suppresses permanently), capped at two per session via the working-set
counter. Proactivity is retrieval-triggered, not brief-stuffing: the brief stays small
while the agent still says "before you change the token flow: ADR-004 chose this
deliberately."

### 22. Maintenance

- **`review` is read-only**, structurally unable to write. It emits a worklist:
  near-duplicate pairs (provenance-identical only), stale review-by dates, orphaned and
  one-sided links, records never retrieved in N sessions (a review flag, never a
  deletion trigger). Every action goes through the lifecycle tools. (Renamed from
  "reflect"; a maintenance pass with write access is the single most dangerous component
  in every system reviewed; the thing it most wants to merge is the section 14.3 pair.)
  Maintenance proposes; it never rewrites history to make it cleaner.
- **Light pass** at wrap-up: this session's writes only. **Deep pass**: backlog-driven,
  fired when the worklist count crosses a threshold, surfaced as a line in the brief
  with the exact command. No cron, no clock: sessions are the only clock that reliably
  exists, and a backlog counter is self-limiting where a day counter assumes steady
  traffic.
- **Metrics** (`metrics.ndjson`, committed, append-only): retrieval hits and misses,
  Tier-5 fallback emissions, duplicate warnings. A rising fallback rate means memory
  failed to capture something; it feeds the next deep review. The rot metric that
  predicts a cold brief: the count of active records past their review-by date.

---

## Part VI: Assurance

### 23. The validation battery

Run by the validator on every invocation; failures name the file and the fix:

1. Schema: required fields, vocabulary membership, provenance presence, `based_on`
   non-empty on inference.
2. Retired-phrasings grep (forever), honoring recorded exemptions.
3. Atomicity: no index chunk starts inside a record.
4. Link integrity: `pair_with` symmetric; supersession pointers bidirectional; no
   dangling ids.
5. Immutability: per-record content hash versus the tool audit trail (section 14.2).
6. Contradiction check, decidable: quoted spans inside derived records must appear
   byte-for-byte in their cited source; numbers, dates, and identifier-shaped tokens in
   a record must appear in its cited document. Stated plainly: an unquoted contradicting
   paraphrase is not caught by any shipped check; catching it would put a model in the
   validation path, which is banned.
7. Generated-file staleness (an assembled view older than its inputs, or hand-edited).
8. **The gold set** (`gold-set.md`): about 10 owner-phrased questions with expected
   files; recall@5; pass at 8 of 10 or better; the hyphenated-token regression as a
   separate case; run after any retrieval change. A retrieval mechanism is verified,
   never assumed.
9. Round-trips: index rebuild reproduces identical results from unchanged files;
   migration reproduces its input byte-identically.
10. The card rule: no card is the sole home of a fact (cards contain pointers plus the
    authored line only).

### 24. Provider architecture and conformance

The agent interacts with an abstract memory protocol; the reference implementation is
markdown + SQLite as specified. Provider choice must never redefine what a fact,
decision, event, source, or specification is.

```text
            CLAUDE / CODEX / other agent
                       |
                MEMORY PROTOCOL
                       |
        reference impl | future conforming providers
        (markdown+SQLite)
```

The tool surface (taught to the agent at startup via slot 0's summary; fully documented
in `rules/memory.md`):

```text
search(query, filters)   get(id)          timeline(entity)      related(id)
add(record)              confirm(id)      correct(id, ...)      supersede(old, new)
retire(id, phrasings)    merge(ids)       delete(id, reason)    sources(id)
card_search(query)       transcript_search(query, token)
spec_search(query)       spec_get(id)
```

Implemented behind a store-shaped Protocol with a conformance suite run by the validator
against every implementation. The `hasattr(...) else []` guard shape is banned by name: a
guard around a missing method converts a loud bug into a silent lie.

**A conforming provider MUST:** carry the full section 13 schema as first-class
queryable data (not a flattened string map); enforce the section 15 refusals, including
never merging across differing provenance; support supersede and retire without
hard-delete, with any delete requiring a before-image; export everything in a
re-importable form; run within the project's privacy posture (no data leaves without the
recorded consent of section 18); and pass the round-trip and gold-set suites. **These
requirements are not theoretical:** the August 2026 evaluations found each major
platform failing at least one measurably: flat metadata that cannot hold provenance;
hard-delete of a fact plus its history behind an HTTP 200; an in-place update replacing
a value with its opposite, undetected; an indexer dismembering structured records. A
provider that fails conformance is not a provider for this system, whatever its
benchmarks say. The swap seam exists so that a future conforming provider costs one
adapter class, not a rewrite.

### 25. What may never happen

- No model paraphrase in any build, index, or validation path; no machine-composed
  summaries as the only home of anything.
- No committed database; no truth outside git-tracked text.
- No merge or retire across differing provenance; no silent deletes; no hard-delete of
  provenance-bearing records.
- No data leaves the project without recorded, per-project consent; no
  configuration-only backend switches.
- No reliance on vendor built-in auto-memory.
- No auto-injection of the accumulated store.
- Session search never runs before curated tiers have failed mechanically.
- No secrets, credentials, or private personal information in the vault, and no
  project-identifying examples migrated from private repositories into public ones.

### 26. Per-project profiles

Install-time profiles (Salesforce, web app, iOS, AI agent, research, docs-only,
health/personal knowledge base) vary only: crib and entity seeds, tag starters, gold-set
template questions, the SOUL template role, the approval-mode default, optional
provenance-vocabulary extensions (section 14.1), and `rules/` starters. Mechanics are
identical everywhere.

### 27. Migration

**From v1 (this toolkit's current system):** additive and reversible. v1 concepts map:

- `specs/` stays `specs/`;
- the seven v1 memory types map to `facts` (context, domain, knowledge), `decisions`,
  `procedures` (operations), `references`, with `planning` moving to `specs/roadmap`;
- v1 source values map to section 14.1 (`owner-quote` and `owner-paraphrase` become
  `owner_statement` with a verbatim flag; `read-from-file` becomes `source_code` or
  `client_document` by path; `agent-observed` and `agent-conclusion-unchecked` become
  `agent_observation` and `agent_inference`);
- `superseded-by:` becomes the full section 15 lifecycle.

Grandfathered records upgrade when next edited; migration never invents missing fields;
gaps are shown to the owner, not guessed. No bulk rewriting, ever: extraction and
addition only; the engine, brief, and verbs install alongside and take over gradually.
Rollback = delete `.memory/` and the new tools; the markdown never changed shape except
by approved edits.

**Greenfield:** create the tree, ask the owner for real `project.md` framing and the
SOUL role (never invent either), seed profile defaults, register both startup routes,
leave typed folders ready.

### 28. Acceptance: what proves an installation works

Every project adopting this system makes this promise:

> A new compatible agent can enter this repository with no previous conversation
> context and rapidly understand who it is, what the project is, what the project is
> trying to accomplish, what is currently happening, where information belongs, how
> history is stored, how to retrieve historical evidence, and how to maintain that
> history without corrupting it.

Concretely, an installation passes when:

- A cold session's first answer reflects the recent window and the owner block without
  re-explanation.
- The gold set passes at 8 of 10 or better, including one question in the owner's own
  vocabulary.
- "Still true" costs one CONFIRM; a superseded record stops being retrievable as
  current; a retired phrase's copies are hunted, and its transcript hits arrive stamped.
- The fact-pair regression passes: write a section 14.3 pair, run every maintenance
  path, assert both records survive with sources intact.
- A relevant past decision surfaces proactively, within the raise cap.
- "What did we discuss about <entity> last week" is answered with dates from cards,
  without opening transcripts.
- Tier 6 fires honestly on an unanswerable question.
- The brief renders inside its ceiling with slots 0 and 1 intact, and the owner reads it
  and says it feels like the project remembers. That is a real criterion.

---

## Part VII: Design decision records

The load-bearing choices, each with its reason and what it rejected, so none is
re-argued from scratch. Evidence numbers refer to Appendix A.

**DR-1: Markdown and Git own the truth; every engine is a disposable index.**
Rejected: a database as the source of truth. Reason: text in git is reviewable,
diffable, portable, and survives every tool change; files-as-truth is also the
industry's direction of travel (evidence 6). Any index can be deleted and rebuilt at no
cost (section 16).

**DR-2: the SQLite engine is gitignored, never committed.**
Rejected: committing the database beside the markdown. Reason: measured unresolvable
binary merge conflicts between overlapping sessions and a silent total-loss mode under
WAL journaling (evidence 5).

**DR-3: enforcement is mechanical (economics, refusal, detection), never instructional.**
Rejected: relying on written rules agents read. Reason: rules measurably do not hold
under pressure; 15 hand copies of one fact existed alongside three anti-duplication
rules (evidence 1). Every load-bearing rule in this spec names its enforcement kind.

**DR-4: an entity registry plus typed links, not an entity graph.**
Rejected: the architecture draft's `entities/` and `relationships/` folders and any
full graph store. Reason: at single-team scale a registry buys the same entity-scoped
retrieval, and graph decomposition was observed inventing sentences that were never
written (section 10.4). Kept from graph thinking: stable ids and epistemic link weights.

**DR-5: current.md and recent.md are assembled from records, never model-composed.**
Rejected: the architecture draft's "this can be AI-generated" working-state files.
Reason: summarization measurably keeps themes and drops the specific values (0 of 3
survived a controlled probe), and these are the files every session reads first
(evidence 3). One authored handoff line is the only free prose.

**DR-6: session cards plus vendor-side transcripts, not in-repo summaries or copied
transcripts.**
Rejected: the architecture draft's `sessions/summaries/` and `sessions/transcripts/`
folders. Reason: summaries lose to verbatim text as a retrieval target by 15.9 to 22.0
points (evidence 3), so cards hold pointers only and are never the sole home of a fact;
and copying transcripts into the repo creates a second, growing, unowned copy of raw
conversation, which v1 also correctly refused.

**DR-7: ADD is add-only; CONFIRM is a first-class cheap verb.**
Rejected: write-time reconciliation (update-or-merge on write). Reason: the leading
platform measured +20 and +26 benchmark points from removing it (evidence 2); and
reaffirmation must be the cheapest write or agents will re-add instead (section 15).

**DR-8: merge and retire are refused across differing provenance.**
Rejected: free merging of near-duplicates. Reason: the pair a cleanup most wants to
merge is exactly the two-source fact-pair whose separation carries the information
(sections 14.3, 15.3).

**DR-9: retrieval is lexical-first (FTS5 + authored queries + crib + rerank); embeddings
ship off, behind recorded consent.**
Rejected: the architecture draft's assumption of vector search as half of the primary
mechanism. Reason: at project scale the lexical stack measured 90% recall@5 against 40%
naive, at parity or better with embeddings, with zero data egress; and for client work,
sending content to an embedding API needs real consent, not an env var (evidence 4, 7;
section 18). The table and fusion rule ship ready so enabling it is one recorded
decision, not a redesign.

**DR-10: providers are conformance-gated, not interchangeable.**
Rejected: the architecture draft's "memsearch / Mem0 / Hindsight / any future provider"
interchangeability. Reason: each major platform evaluated measurably violates the
schema or lifecycle this spec requires (hard-deletes, flat metadata, silent updates,
record-dismembering chunkers) (evidence 7; section 24). The protocol seam stays so a
future conforming provider costs one adapter.

**DR-11: the boot brief has a byte budget, an owner block, and degrades instead of
blocking.**
Rejected: an unbounded startup injection, and a brief without owner preferences.
Reason: an unbounded brief recreates the context-flooding this system exists to
prevent; and the owner block is what makes the agent know the owner, not just the
project (section 19).

**DR-12: review is read-only and maintenance is backlog-driven; no cron.**
Rejected: a writing "reflect" pass and calendar-scheduled cleanup. Reason: a
maintenance pass with write access was the most dangerous component in every system
reviewed, and sessions are the only clock that reliably exists (section 22).

**DR-13: the vault keeps the `knowledge/` root and the toolkit's approval flow.**
Rejected: the architecture draft's top-level `context/`, `specs/`, `memory/` layout.
Reason: this toolkit's projects already carry a `knowledge/` vault, v1's migration
tooling and Obsidian settings assume it, and keeping the root makes the v1-to-v2
migration additive (section 27). The orientation files land inside it as
`knowledge/project.md`, `current.md`, `recent.md`, `map.md`. The v1 five-bullet
approval review survives as the `approve` mode (section 20.5).

---

## Appendix A: Evidence

Portable findings behind the load-bearing rules (full reports live in the private
research project, August 2026; public sources cited where they exist):

1. **Rules don't hold; mechanics do:** 3 anti-duplication rules on disk, all read, 15
   copies of one fact anyway; 50.1% copy-forward across 100M clinical notes (published
   EHR-duplication research).
2. **Add-only beats write-time reconciliation:** Mem0 v3 removed ADD/UPDATE/DELETE
   reconciliation; +20 LoCoMo, +26 LongMemEval.
3. **Verbatim beats summaries as a retrieval target:** +15.9 / +22.0 (LoCoMo /
   LongMemEval-S) for verbatim chunks over extracted artifacts; 19.0% versus 89.5%
   recall (summaries versus RAG, controlled); compaction probe: 3 of 3 themes kept, 0 of
   3 specifics.
4. **Lexical + authored queries + rerank suffices at small scale:** 40% to 90% recall@5
   measured; BM25 near-ceiling for known-item clinical retrieval (doi 10.2196/94241);
   gains live at the rerank stage (doi 10.1016/j.jbi.2026.105053); domain-tuned
   embeddings underperformed general ones.
5. **Committed SQLite fails:** reproduced unresolvable add/add binary merge conflict;
   reproduced WAL silent total loss; no prior art commits binary+dump; text-committing
   patterns (sqlite-diffable and similar) are the established shape.
6. **Files-as-truth is the direction of travel:** Letta/MemGPT moved memory to a
   git-backed markdown filesystem; Anthropic's memory tooling is file-shaped;
   database-owns-truth systems are multi-tenant services no human reads.
7. **Platform silent-destruction, observed first-hand (2026-08):** hard delete of fact
   plus history behind HTTP 200; in-place update flipping a value undetected; an
   env-var backend switch shipping an entire store to a third party; a chunker
   splitting structured records into dangling fragments; a search tool silently
   returning only one side of conversations; an empty-query recency fallback presenting
   an unrelated memory as relevant.
8. **FTS5 sharp edges:** unquoted hyphenated tokens raise OperationalError; a
   two-character length filter silently turns `x-ray`-shaped tokens into their suffix;
   BM25 ranking requires a materialized CTE; stopwords are the caller's job.

## Appendix B: Mental model

```text
SOUL            = who am I?
AGENTS/CLAUDE   = how do I operate?
RULES           = what detailed constraints apply here?
PROJECT/CURRENT/RECENT/MAP = where are we right now?
SPECS           = what should be true?
MEMORY          = what happened, what do we know, what did we decide, and why?
PROCEDURES      = how do we repeatedly do things?
CARDS           = what were we just working on?
TRANSCRIPTS     = what was actually said?
ENGINE (SQLite) = how do I find it?
PROVENANCE      = why should I trust it?
SUPERSESSION    = how did it change over time?
VALIDATOR       = what is quietly wrong?
```

## Appendix C: Consolidation record

The mechanics draft had already merged the architecture draft's design with the research
mechanics, and recorded that merge. This consolidation verified that record against the
architecture draft line by line and made these changes on top of the mechanics draft:

**Restored from the architecture draft (dropped or thinned in the mechanics draft):**

- The derived-views section (Part II section 12): timelines, digests, entity overviews,
  with the generated-never-canonical rule.
- The fuller AGENTS.md content specification and the rules-versus-memory example
  (sections 5 and 6).
- The map.md detail: canonical versus generated versus do-not-edit (section 9).
- The universal project contract promise, now the opening of the acceptance section
  (section 28).
- The extensible provenance vocabulary: the architecture draft's health-specific source
  types return as profile extensions instead of being deleted (section 14.1).
- The temporal-breadcrumbs diagram and the roadmap-summary content spec (sections 15.1
  and 7).

**Kept from the mechanics draft (everything measured):** the enforcement taxonomy;
add-only ADD; CONFIRM and MERGE; read-only review; the provenance three laws;
`pair_with`; `one_line`; atomicity; the retirement phrase-hunt; the crib; auto-quoting;
no synonym expansion; tier-labelled precedence; empty-means-empty; the gated transcript
tier; the working set; the boot brief with the owner block and degrade-not-block;
write-now cadence; approval modes; the metrics log; backlog-driven maintenance; the
gold set; the conformance suite; the migration map; the evidence appendix.

**Conflicts between the drafts, resolved (each is a DR in Part VII):**

- Interchangeable providers versus conformance-gated: conformance-gated (DR-10).
- Entity and relationship folders versus registry plus typed links: registry (DR-4).
- AI-generated working-state files versus assembled: assembled (DR-5).
- In-repo session summaries and transcripts versus cards plus vendor-side transcripts:
  cards (DR-6).
- Vector search as half the primary mechanism versus lexical-first with embeddings
  off-by-default: lexical-first (DR-9).
- Broad DELETE versus narrow DELETE with refusals: narrow (section 15).
- Top-level layout versus the `knowledge/` vault: the vault (DR-13).
- The architecture draft's real personal-health examples were replaced with generic
  ones, unsuitable for a public repository; the health use case survives as a profile
  (section 26).

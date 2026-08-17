# Universal Project Memory System — v2 Specification

**Status:** proposed. Supersedes `memory-system.md` (v1) when the owner approves it; v1
governs until then. Standalone — nothing here requires reading v1, though §24 maps v1
concepts for migration.

**Lineage:** this document merges two inputs. (1) A provider-independent architecture spec
(the seven-layer model, the file layout, the retrieval ladder, the tool surface). (2) The
mechanics and evidence produced by an August 2026 research effort in a private sibling
knowledge-base project: three multi-agent adversarial review gauntlets, live evaluations of
Hindsight, memsearch, Waku Agent, Mem0, Zep, Letta/MemGPT and LangMem, and measured
experiments on retrieval and storage. Where a rule below has a measured reason, the reason
is cited inline and collected in Appendix A. Appendix C records what came from which input
and how conflicts were resolved.

---

## Part I — Foundations

### 1. Purpose and scope

This specification defines a persistent memory architecture for AI-assisted projects,
installable as a repeatable blueprint by this toolkit. It must work consistently across:

- client software projects (Salesforce, web, mobile, integrations);
- personal software projects;
- AI agent projects;
- research repositories;
- personal knowledge bases;
- future project types.

It must work whether the active agent is Claude Code, Codex, or another compatible agent,
and it must not depend on any single storage or retrieval provider (§21 defines what a
conforming provider must guarantee — and why "provider-independent" cannot mean "any
provider").

### 2. North star

Every session, on any machine, the agent opens **already oriented**: who it is, what the
project is, what it is building toward, what is true right now, what happened recently, how
the owner likes to work, where information lives, and how to find and maintain everything
else. A session ending must never mean the project forgets. A new agent with zero prior
context must be productive within its first exchange.

The agent begins **oriented, but not overloaded**: a small stable injection at startup,
everything else retrieved on demand. Concretely, the startup context answers:

```text
WHO AM I?                       (SOUL.md)
HOW DO I OPERATE?               (AGENTS.md / CLAUDE.md)
WHAT PROJECT AM I IN?           (knowledge/project.md)
WHAT ARE WE ACCOMPLISHING?      (project.md roadmap summary → specs/roadmap)
WHAT IS TRUE RIGHT NOW?         (knowledge/current.md)
WHAT HAPPENED RECENTLY?         (knowledge/recent.md)
HOW DOES THE OWNER WORK?        (the owner-preferences block)
WHERE DOES INFORMATION LIVE?    (knowledge/map.md)
HOW DO I SEARCH?                (the retrieval ladder, §15)
HOW DO I WRITE MEMORY?          (the write protocol, §17)
WHAT DO I NOT STORE?            (the exclusion list, §17.4)
```

### 3. The two failure modes, and why this spec is mechanical

Everything below exists to kill two failure modes, both observed at scale:

1. **Amnesia.** Each session starts as a stranger; the owner re-explains; decisions get
   re-litigated; failed approaches get retried.
2. **Rot.** Every interesting sentence gets saved; copies drift apart; a corrected claim
   survives elsewhere and gets retrieved instead of its correction; the store grows until
   nothing in it is trusted.

**The central finding of the research this spec rests on: written rules do not prevent
either failure — only mechanics do.** In the sibling project, three separate "don't
duplicate" rules existed on disk and every agent read at least one; a single fact was still
hand-copied 15 times across 7 files, and a corrected false claim was still live in four
places after a dedicated correction pass. Across 100 million clinical notes — systems with
trained professionals and written protocol — 50.1% of text is copy-forward. The cause is
structural: appending is the only write an agent can prove is safe, so under pressure every
agent appends. The fix is never a better instruction; it is changing what is cheap and what
is refused at the moment of writing.

Consequently, every rule in this spec is one of three kinds, and says which:

- **economics** — the correct action is made the cheapest action;
- **refusal** — a tool refuses the wrong write with a message naming the fix;
- **detection** — a validator catches what slipped through, forever.

A rule that is none of these is orientation, not enforcement, and must not be relied on as
enforcement.

---

## Part II — Architecture

### 4. The seven information layers and the repository layout

Seven layers, never interchangeable:

```text
1. AGENT OPERATING CONTRACT     AGENTS.md / CLAUDE.md
2. AGENT IDENTITY               SOUL.md
3. RULES                        rules/
4. ORIENTATION / WORKING STATE  knowledge/project.md · current.md · recent.md · map.md
5. NORMATIVE TRUTH              knowledge/specs/
6. DURABLE KNOWLEDGE            knowledge/memory/
7. RAW SESSION EVIDENCE         sessions (cards + transcripts)
```

Concrete layout (names may adapt per tool; the conceptual separation may not):

```text
project/
├── AGENTS.md                    # vendor-neutral operating contract (thin)
├── CLAUDE.md                    # thin Claude entrypoint → AGENTS.md
├── SOUL.md                      # agent identity (mandatory)
├── rules/                       # detailed operating rules, loaded selectively
│   ├── memory.md  specs.md  coding.md  security.md  ...
├── knowledge/                   # the vault (git-owned; Obsidian-viewable)
│   ├── project.md               # orientation (authored)
│   ├── current.md               # working state (GENERATED, assembled)
│   ├── recent.md                # recent window (GENERATED, assembled)
│   ├── map.md                   # repository meaning-map (GENERATED)
│   ├── index.md                 # file index (GENERATED)
│   ├── crib.md                  # authored vocabulary crib (§15.3)
│   ├── gold-set.md              # committed retrieval test (§20.5)
│   ├── specs/                   # normative truth (requirements, architecture,
│   │                            #   interfaces, roadmap — subfolders as needed)
│   ├── memory/
│   │   ├── facts/  decisions/  events/  references/
│   │   ├── entities.md          # entity registry (§9.4)
│   │   ├── tags.md              # tag vocabulary
│   │   └── metrics.ndjson       # append-only rot metrics (§19.3)
│   ├── procedures/              # repeatable how-to knowledge (§9.7)
│   └── sessions/
│       └── cards/               # per-session manifest cards (§10.2)
├── .memory/                     # GITIGNORED: SQLite engine, working set, staging
├── src/  tests/  ...
```

Generated files carry a do-not-edit banner, their inputs, and a build timestamp; hand
edits to them are surfaced and overwritten by the next build (detection). One fact has one
home; every other file links to it. **Adding one fact must never require updating multiple
summaries** — views regenerate from records; nothing synchronizes by hand (economics; this
single property is what prevented drift in every generated file of the sibling project
while every hand-maintained summary beside them drifted).

### 5. Entry points: AGENTS.md, CLAUDE.md, SOUL.md

**AGENTS.md** is the vendor-neutral contract and stays compact — only what virtually every
session must know:

1. Required startup reads, in order: `SOUL.md` → `knowledge/project.md` → `current.md` →
   `recent.md` → `map.md` → the memory protocol summary.
2. The layer responsibilities (the §4 table, three lines each).
3. The core behavioral floor: search before assuming history · consult specs before
   changing specified behavior · consult decisions before overturning them · prefer
   original evidence over generated summaries · never promote inference to fact · NOOP
   over trivial saves · preserve provenance · supersede, never silently erase · keep
   writes small and atomic.
4. Rule-loading: detailed instructions live in `rules/`, loaded by task type (memory write
   → `rules/memory.md`; spec change → `rules/specs.md`; security-relevant →
   `rules/security.md`). The root files never inline them.

**CLAUDE.md** is deliberately thin: "Read AGENTS.md, SOUL.md, and the startup context;
follow the memory protocol; load rules selectively." Claude-specific wiring only (hooks,
skill routes). **The two files never duplicate an instruction set — duplication is drift**
(the sibling project measured exactly this failure in duplicated rule text).

**SOUL.md is mandatory** and read first, every session. It defines who the agent is in
this project, whom it serves, what it optimizes for, and what it must never lose sight of
— identity and values, stable across months. It contains no tasks, no status, no history,
no rule lists. Template (adapted per project at install):

```markdown
# SOUL
You are the persistent <role> for this project. You help the owner move it toward its
stated objectives while preserving architectural coherence and historical context.
You optimize for: correctness · maintainability · fidelity to evidence · continuity
across sessions · explicit tradeoffs.
You are not the owner of project truth. Truth lives in source code, active specs,
canonical memory records, and original sources. Do not invent history. Do not promote
your own inference into fact. When uncertain, search; when consequential, follow
provenance to the original source; when you cannot find evidence, say so.
```

### 6. rules/ — detailed instructions, loaded selectively

One file per concern (`memory.md`, `specs.md`, `coding.md`, `testing.md`, `security.md`,
`git.md`, …). AGENTS.md routes to them by task type. This keeps the always-loaded surface
small (the sibling project measured its always-loaded costs twice and moved everything
movable to on-demand loading). Rules answer *how should I behave*; memory answers *what
happened / what do we know* — a rule file never carries project facts, and a memory never
carries standing instructions.

### 7. knowledge/project.md — orientation

Authored at install (the tool asks the owner; it never invents framing). Contains,
concisely: project name and type · purpose · target users · primary technologies ·
high-level architecture · major constraints · lifecycle stage · primary objective · a
compact roadmap summary (current phase, current milestone, major remaining areas — the
authoritative roadmap lives in `specs/roadmap/`) · where active work is tracked.
Orientation, not history, and not a status report.

### 8. current.md and recent.md — the working state

**`current.md` — what is true right now.** Generated by assembly (§13's constraint):
current focus · active work · blockers · recently landed capability · next likely actions.
Each line is drawn verbatim from records, work items, or the authored handoff line — the
generator places sentences; it never composes them.

**`recent.md` — the recent window.** The last 2–3 days / 1–3 meaningful sessions: what was
done, what was learned, what remains unfinished, **what failed and should not be retried**
(the highest-value line in a handoff), where the next session should start. Assembled from
session cards and dated entries; the one free-prose element is the single authored
"where we left off" line written at each wrap-up.

**Neither file is ever free-composed by a model.** Measured reason: summarization keeps
high-level facts and drops specifics — a controlled probe kept 3 of 3 themes and **0 of 3
specific values**; a paraphrase reads equally fluent with or without the dropped qualifier,
which is precisely what makes it dangerous in the one file every session reads first.

### 9. specs/ vs memory/ — normative vs historical

**Specs answer: what should this system do.** Requirements, API and interface contracts,
schemas, acceptance criteria, architecture specifications, roadmaps, security requirements.
Normative; the project is expected to satisfy them; when approved behavior changes, the
spec changes (git keeps old versions). Always owner-approved.

**Memory answers: what happened, what was decided, what do we know, and why.** Classes:

#### 9.1 Facts (`memory/facts/`)
Durable, provenance-bearing statements likely to matter across many sessions: "the client
requires US-only data residency", "the API uses UUIDv7", "staging shares the production
Redis" — including domain vocabulary a future agent could misread, and conclusions the
project drew from investigation (marked with their inference provenance). Not restatements
of active specs.

#### 9.2 Decisions (`memory/decisions/`)
ADRs. Each preserves: what was decided · when · why · alternatives considered and why
rejected · who or what authorized it · evidence relied on · what it supersedes. A spec says
"tokens use Keychain"; the ADR says why Keychain won and what lost. Both are required; they
answer different questions. Rejected alternatives are recorded **so they are never
re-argued from scratch** — with the evidence, so a future "why don't we just…" finds the
answer.

#### 9.3 Events (`memory/events/`)
**A meaningful event changes the historical state of the project or domain** — client
approved a feature; requirement changed; release shipped; migration completed; incident
occurred; dependency deprecated; critical assumption disproven; experiment produced a
meaningful result. The test: *would someone working here six months from now care that
this happened?*

Events are **not agent telemetry.** Never durable: tool calls, files opened, tests run,
routine errors, "implemented 14 files today". The distinction is *agent activity* vs
*project state change* — store the second. ("The legacy auth stack was fully replaced by
OAuth and retired" is an event; the 14 files that did it are not.)

#### 9.4 Entities (`knowledge/memory/entities.md` — a registry, not a graph)
Stable concepts get stable identifiers: `authentication`, `sync-engine`, `client-acme`,
`api-v2`. The registry is one file: id, one-line meaning, aliases (which also feed the crib,
§15.3). Records carry `entities:` lists, enabling entity-scoped retrieval and timelines
without free-text luck. **A full entity graph as the primary structure is deliberately
rejected**: for single-team project scale it buys little over the registry, and graph
decomposition of ingested text was observed (in a mature platform) returning sentences that
were never written — fatal for verbatim records. Kept from graph thinking: stable ids, and
typed links with epistemic weight.

#### 9.5 Relationships — typed links on records, not a folder
`relates: [{to: <id>, rel: <verb>, weight: documented|suspected}]`. `documented` = a source
states the connection; `suspected` = an agent proposes it. A factual link and an
interpretive link must never look identical.

#### 9.6 References (`memory/references/`)
External source material with retrieval metadata (url, retrieved_at) and what it supports.
**A source and the conclusion drawn from it are two linked files** — the conclusion (a fact
with inference provenance) never absorbs the source, and the source never quietly becomes a
conclusion.

#### 9.7 Procedures (`knowledge/procedures/`)
Repeatable how-to knowledge with verification steps: releases, migrations, credential
rotation, triage runbooks. Indexed by the same retrieval engine. (The semantic / episodic /
procedural memory triad maps to facts+entities / events+sessions / procedures.)

#### 9.8 The routing table

| Information | Home |
|---|---|
| Final requirement, API contract, schema, acceptance criteria, roadmap | `specs/` |
| Why an architecture was chosen; the previous architecture; rejected options | `memory/decisions/` |
| Durable project/domain fact; investigated conclusion; domain term | `memory/facts/` |
| Milestone, incident, requirement change, completed migration | `memory/events/` |
| Stable concept identity | `entities.md` |
| External source material | `memory/references/` |
| Runbook | `procedures/` |
| Standing agent instruction | `rules/` |
| Current focus / blockers | `current.md` (generated) |
| Recent handoff | `recent.md` (generated) |
| Conversation itself | session card + transcript |
| Agent tool call, routine error, temporary hypothesis | **nowhere durable** |
| Owner's working preferences | preference records (§16, owner block) |

### 10. Sessions — cards and transcripts

#### 10.1 Transcripts
The last-resort evidence layer. Kept wherever the vendor keeps them (local CLI history) —
searchable in place, **never copied, promoted, or auto-injected**. Scope honesty: local
history is per-machine and expires; a failed transcript search proves nothing about whether
a discussion happened, and the agent says "not found in this machine's history", never
"never discussed".

#### 10.2 Session cards (`knowledge/sessions/cards/`)
One small committed card per meaningful session, written at wrap-up: date · topics ·
**pointers** to entries written and decisions made (ids, not prose) · how the session ended
· the authored where-we-left-off line. Cards are search keys and continuity — **a card is
never the only home of any number, date, decision, quote, or qualifier** (refusal in the
card writer + validator check). Measured reason: extracted artifacts lose to verbatim text
by 15.9–22.0 points as a retrieval target; summaries scored 19.0% vs 89.5% recall in a
controlled comparison. Cards point; records and transcripts hold.

---

## Part III — The record

### 11. Canonical record schema

Every durable memory is a Markdown file (or fenced-YAML record within a class file — one
shape per project, chosen at install) with this metadata:

```yaml
---
id: adr-auth-004                # permanent; duplicate id = refused write naming the fix
type: fact | decision | event | reference | procedure
title: "Refresh tokens move to OS keychain"
one_line: "Refresh tokens live in the OS keychain, not app storage."   # §11.1
status: active | superseded | retired
created_at: 2026-04-12
effective_at: 2026-04-12        # when it became true in the world
recorded_at: 2026-04-12         # when the project learned it (omit when equal)
mentioned_at: []                # dates it was materially discussed (feeds "what did
                                #   we talk about last week")
valid_from: 2026-04-12
valid_until: null
entities: [authentication, keychain]
tags: [security]                # subjects only; ≤3; from tags.md
source:                         # §12 — required, refused if absent
  type: user_approved_decision
  session: 2026-04-12-auth-review
based_on: []                    # REQUIRED non-empty when source.type is agent_inference
relates:
  - {to: adr-auth-001, rel: supersedes, weight: documented}
supersedes: adr-auth-001
superseded_by: null             # tool-written on the older record when superseded
pair_with: []                   # same-subject-different-source twins (§12.3)
confirmed_on: []                # cheap reaffirmation dates (§13.2)
retired_because: null
history: []                     # prior wordings, moved automatically on edit (§13)
---
<body: the full statement, rationale, evidence links>
```

#### 11.1 `one_line`
Authored at filing (warn >120 chars, error >200); what retrieval returns as *the thing to
say*; carries its own qualifier inside it ("staging shares prod Redis **per ops chat, not
verified in config**"). A qualifier that belongs to a *different source* is a separate
record joined by `pair_with` — never folded into this string (§12.3). The agent's job
becomes placing an authored sentence, not re-composing a hedge each time — the one honest
clause survives because it was written once, at the moment the context was known.

#### 11.2 Atomicity
A record is indivisible everywhere: the indexer fails loudly rather than emit a fragment,
and a committed test asserts no index chunk starts inside a record. Measured reason: a
mature tool's chunker, run on real structured records, produced retrievable fragments —
an attribution with no claim attached, a value list with no statement — worse than not
indexing at all.

### 12. Provenance

#### 12.1 Vocabulary
`source.type` is one of:

```text
owner_statement          owner_approved_decision    client_statement
client_document          source_code                git_commit
issue                    pull_request               web_source
research_paper           agent_observation          agent_inference
```

plus per-type fields: `path` (documents/code), `url` + `retrieved_at` (web), `session`
(statements/decisions), `based_on` (inference — required, non-empty, listing record ids).

#### 12.2 The three laws
1. **Required.** A write without provenance is refused (refusal).
2. **Immutable.** `source` never changes after write; `agent_inference` never upgrades by
   repetition or age — verification is an explicit edit citing what verified it, with the
   old state in `history` (refusal + detection: the validator holds a per-record content
   hash and errors when an immutable field changed without a matching tool audit entry —
   honestly stated as tool-plus-validator enforcement, since markdown cannot physically
   prevent an edit).
3. **Beside the claim.** In multi-claim bodies, a claim from a different source carries its
   own marker on the claim, so the file-level value never lends it false confidence.

**Scoped negatives:** "not found in `src/` and the specs" — never "doesn't exist".
Absence-of-record is not absence-in-world, and wording drifts toward the absolute as it is
copied; the scope travels with the claim, verbatim.

#### 12.3 `pair_with` — protecting fact-pairs
Two statements about one subject from two sources ("the config doesn't state the timeout"
[source_code] / "the client says 30 s" [client_statement]) are **two records**, linked
symmetric-`pair_with` (tool writes both sides; validator errors on a one-sided link), and
retrieval returns them together as a join. No operation may ever merge them (§13.4).

### 13. Lifecycle

Operations, each with its enforcement kind:

| Op | Meaning | Enforcement |
|---|---|---|
| **ADD** | New durable knowledge | add-only tool; duplicate-id refusal; near-duplicate warning — **suppressed when the candidates' provenance differs** (different sources = two facts by definition) |
| **NOOP** | Store nothing | the expected common outcome; a memory system gets worse when it remembers everything |
| **CONFIRM** | "Still true" | appends a date to `confirmed_on`; no history churn. Economics: reaffirmation is the most common write and must be the cheapest — the lazy path and the correct path must be the same path |
| **CORRECT** | The record itself was wrong | fix in place; prior wording moves to `history` with `retired_because: recorded-in-error` — the audit trail *is* the fix; the move is automatic and inseparable from the edit |
| **SUPERSEDE** | Was true; newer state replaces it | new record; old one keeps `valid_until` + `superseded_by` (tool-written both directions). Yesterday's record stays — it was true when written |
| **RETIRE** | No longer active, no direct successor | requires `retired_because` + tool timestamp; reversible; excluded from active reads; **with the phrase-hunt** (§13.3) |
| **MERGE** | Combine duplicates | allowed **only when provenance is identical**; both originals verbatim into the survivor's history (refusal otherwise) |
| **DELETE** | Remove outright | narrow: duplicates' surplus, corruption, privacy removal, accidental records; refused for provenance-bearing knowledge (supersede instead); requires a reason; always a visible git diff |

#### 13.2 Temporal breadcrumbs
`valid_from`/`valid_until` + supersession pointers reconstruct any timeline: *what do we
use now* and *what did we use in March and why did it change* are both one query
(`timeline(entity)`), and the answer includes the ADR that made the change.

#### 13.3 Retirement hunts its copies
`retire` takes `retired_phrasings:` — the exact wordings being killed. The tool greps the
repository, prints every surviving copy with file:line, and refuses to complete until each
is fixed, sentinel-wrapped (`<!-- retired:<id> -->…<!-- /retired -->` — greppable,
invisible rendered), or explicitly exempted on the retiring record. The validator greps
every retired phrasing on every run, forever; the indexer demotes sentinel-wrapped chunks
and `status: retired/superseded` content; transcript search stamps matching passages
"superseded by <id>". Measured reason: a corrected claim outlived its correction in four
files *after a dedicated correction pass*, and the proposed index ranked the stale copy
above the correction. Named limit, honestly: this is text-matching; a paraphrase sharing no
retired wording survives in immutable prose — bounded by generation (assembled views can't
carry it), demotion, and stamping, but not closed.

#### 13.4 What maintenance may never do
No operation — including any future "cleanup" — may merge or retire two records whose
provenance differs (refusal in the tool, not prose). Measured reason: the near-duplicate
pair a cleanup most wants to merge is exactly the fact-pair (§12.3) whose separation is the
point; and the leading memory platform removed write-time merge/update reconciliation after
measuring that it destroyed information (+20/+26 on the LoCoMo/LongMemEval benchmarks from
going add-only).

---

## Part IV — Runtime

### 14. The retrieval engine

One SQLite database per project in `.memory/` — **gitignored, disposable, rebuilt from the
markdown at session start** (measured 0.14–0.35 s for a ~5 MB / ~300-file corpus).
`PRAGMA integrity_check` at boot; a failing store is rebuilt, never trusted. Write tools
synchronously re-index the file they touched (composite chunk key: path + line range +
content hash + index version), so a fact stated at turn 3 is retrievable at turn 9. It
holds: FTS5 index over specs, memory, procedures, cards (and the transcript index,
separately flagged); record metadata, entity, link and status tables; an `embeddings`
table, defined and empty (§15.5).

**The database is never committed.** Measured: a committed binary store produced
unresolvable add/add merge conflicts between overlapping sessions, and a silent
total-loss mode under WAL journaling; git history goes blind on it; every established
pattern commits exactly one artifact, and it is text.

### 15. The retrieval ladder

Progressive, cheap-first, with the tier boundaries enforced mechanically:

**Tier 0 — already loaded.** The startup injection (§16). If it answers, stop.

**Tier 1 — exact lookup.** When the target is known: `get(id)`, `timeline(entity)`,
`spec_get(id)`. Exact before fuzzy, always.

**Tier 2 — hybrid curated search.** Specs, facts, decisions, events, entities, procedures,
references — with metadata filters (type, status, entity, date). Mechanics, each carrying
its measured reason:

1. Primary input is an **agent-authored structured FTS5 query** (AND-of-OR groups); plain
   text is the degraded fallback. The agent is a language model — query composition is
   where "search by meaning" enters, free. (Measured on a real corpus and owner-phrased
   gold questions: naive keyword 40% recall@5; authored queries + crib + rerank 90%.)
2. The **authored crib** (`knowledge/crib.md`): owner's words → project vocabulary
   ("the sync thing" → `sync-engine`), seeded per profile, fed by entity aliases; rendered
   into the generated map; auditable; no network. **No blind synonym expansion** (measured
   actively harming 2 of 7 queries by diluting discriminating terms).
3. **Auto-quoting** of hyphenated / digit-letter tokens before FTS5 (`oauth2-flow`,
   `utf-8`, `L5-S1`-shaped tokens crash or silently truncate the MATCH parser; a committed
   regression asserts every crib token survives the rewriter and returns results).
4. **Results carry their layer**, and normatively-sourced hits (specs, client documents)
   sort above derived hits (agent inference) at equal relevance — a derived note can never
   outrank, unmarked, the source it derived from.
5. ~30 BM25 candidates, **reranked in-context by the calling agent** to ~5 (clinical
   retrieval studies place the gain at the rerank stage, not the embedding stage).
6. **Empty means empty.** A failed or empty query returns nothing — never a recency
   fallback (a shipped system's own docstring records the cost: an unrelated memory
   presented under "Relevant memory"). A parse failure is an error, not evidence of
   absence.

**Tier 3 — expansion.** Around near-misses: related entities, superseded/successor
records, linked decisions and events, adjacent dates. This is a join on typed links, not a
second guess.

**Tier 4 — session cards.** Continuity questions ("what did we decide last Tuesday").

**Tier 5 — transcripts.** Verbatim-turn index, **gated**: the search tool refuses to run
without the emptiness token Tier 2 emits (defined numerically: zero rows after filters, or
fewer than 3 above the relevance cutoff set from the gold set). Mechanical gating, not
instruction — models measurably confuse similar search tools (a filed, unresolved issue in
a leading memory framework). When a transcript hit matters, open the actual conversation
segment; never trust a generated summary of it. Results pass the retired-phrasings filter
and arrive stamped when superseded.

**Tier 6 — honest failure.** "I could not find reliable evidence for this in the project's
memory or this machine's session history." Never a plausible invention.

**The working set.** Tier 2+ results persist for the conversation (a state file in
`.memory/`: file list, record ids, entity set) and follow-ups reuse it, so the second
answer rests on the same sources as the first. Invalidation is computable: the query's
entity set changes, or a new date token appears.

**Routing by question type:** *what should it do* → specs; *why is it this way* →
decisions; *what happened* → events/timeline; *what were we just doing* → cards;
*what exactly was said* → transcripts.

**The primary-evidence rule.** Snippets locate evidence; they are not evidence. For
consequential answers: result → expand record → follow provenance → read the original →
answer.

### 15.5 Embeddings — off by default, one switch away
The `embeddings` table (record id, model, dims, vector, created_at) ships empty, with
reciprocal-rank fusion at k=60 specified as the fusion rule. Rationale: at ≤ a few MB,
BM25 + authored queries + rerank measured at parity or better, costs nothing, and sends
nothing anywhere. Turning embeddings on is a **recorded, per-project consent decision** —
for client projects, sending content to an embedding API is governed by the client's data
terms; an environment variable is not consent (a reviewed system shipped exactly that: one
env var silently routing the whole store to a third-party service). If a project's gold
set fails on vocabulary-gap cases after the crib and rerank are in place, that is the
evidence that reopens this default — on the merits, per project.

---

## Part V — Behavior

### 16. Startup injection — the boot brief

Assembled at session start (Claude: SessionStart hook; Codex: AGENTS.md route + hook where
available; both fail open). Slot order; ceiling ~10 KB rendered, measured in bytes; warn
approaching; **over it, degrade to slots 0–1 plus one-line counts and warn loudly — never
block the session**. Eviction when shrinking: 5 → 4-overflow → 3 → 2's card detail (its
authored line is protected). Slots 0–1 are never evicted and are budgeted ≤2 KB together.

- **Slot 0 — orientation:** SOUL pointer · project one-liner · the map · the memory
  protocol in five lines.
- **Slot 1 — the owner block:** 3–6 authored preference/context one-liners flagged
  `render_in_brief` (how the owner wants reviews, standing asks, working conventions).
  Authored when learned, never machine-composed, never cut. *(This slot is the difference
  between an agent that knows the project and one that knows the owner; its absence was
  the flagship failure of an otherwise-complete design in review.)*
- **Slot 2 — where we left off:** the authored handoff line + the last session card.
- **Slot 3 — current state:** `current.md` content — changed areas first, rest as counts;
  entries past their review-by date render "may be stale, last confirmed <date>" (a
  rendering rule; nothing is deleted).
- **Slot 4 — open questions and recent decisions:** capped, with an overflow count;
  recently settled items render too ("asked <date>, settled") so nothing gets re-asked.
- **Slot 5 — machinery:** validator warning count + pointer; maintenance backlog count
  when over threshold.

**Never auto-injected:** all ADRs, all facts, all summaries, transcripts, full specs,
directory dumps, source documents. Small stable orientation + small current state + small
recent window + task-driven retrieval — never the accumulated store. **Nothing may lean on
any vendor's built-in private auto-memory** (machine-local, invisible, unversioned;
disabled in adopting projects).

### 17. The write protocol

#### 17.1 The decision ladder
```text
NEW INFORMATION
  → Belongs in a spec?            YES → spec workflow (owner-approved)
  → Durable? (§17.3 test)         NO  → NOOP (say so in one line)
  → Classify: fact | decision | event | reference | procedure
  → Identify provenance (§12)     — missing → the write is refused
  → Resolve entities; search duplicates and history (Tier 1–2 first)
  → ADD | CONFIRM | CORRECT | SUPERSEDE | RETIRE
  → Write one atomic record → index updates synchronously → done
```

#### 17.2 Cadence — when writes happen
**At-risk information writes immediately**: an owner statement, a decision, a discovered
constraint, a disproven assumption — anything that would be lost if the session died right
now. Safe because ADD is add-only and cannot damage anything. Tidying (cards, the handoff
line, link repair) happens at wrap-up. A turn-count ceiling backstops sessions that never
get a wrap-up — and the sessions that end abruptly are disproportionately the ones that
mattered. Never per-response writes; never checkpoint-only. (Both extremes measured
harmful: per-response floods; checkpoint-only forgets the sessions that die.) A failed
write leaves its queue unprocessed — a queue is never marked done on failure.

#### 17.3 The durability test (all must pass)
1. Will it matter after this session? 2. Is it a stable fact, decision, event, or state —
not difficulty, novelty, or effort? 3. Does an existing home own it? (Then update or link
— never copy.) 4. Would omitting it cause a repeated explanation or a repeated wrong
action?

Promotion examples: discussion → owner approves an architecture → **ADR**. Debugging →
platform limitation discovered → **fact**. Implementation → migration completed →
**event**. Intermediate steps: NOOP.

#### 17.4 Never stored durably
Tool calls · commands · files opened · code-edit play-by-play · routine compiler/test
errors · temporary hypotheses · chain-of-thought · casual conversation · restatements of
active specs · ephemeral task state · generated prose without provenance · secrets and
credentials · private personal information in shared/public repos.

#### 17.5 Approval modes
Set per project at install:
- **`approve`** (default for client profiles): every durable save shows the short review —
  What / Where / Why / Assumptions / Unverified — and waits for keep, change, or skip. No
  reply means no write.
- **`curate`** (default for solo profiles): the agent writes within this spec's refusal
  rules; git diffs are the review surface; the five-bullet summary renders in the PR or
  handoff instead of blocking mid-session.
Specs are owner-approved in both modes, always.

### 18. Proactivity

Records may carry `surface_when` triggers — `{entity: authentication}` (fires when the
working set touches it) · `{before: <date>, days: 7}` (brief-time) · `{mentions: [token]}`
(turn-time). Raises are tool-recorded (`raised_on`, outcome `acted|deferred|declined`;
`declined` suppresses permanently), capped at two per session via the working-set counter.
Proactivity is retrieval-triggered, not brief-stuffing — the brief stays small while the
agent still says "before you change the token flow: ADR-004 chose this deliberately."

### 19. Maintenance

- **`review` is read-only** — structurally unable to write. It emits a worklist:
  near-duplicate pairs (provenance-identical only), stale review-by dates, orphaned and
  one-sided links, records never retrieved in N sessions (a review flag, never a deletion
  trigger). Every action goes through the lifecycle tools. (Renamed from "reflect";
  a maintenance pass with write access is the single most dangerous component in every
  system reviewed — the thing it most wants to merge is the §12.3 pair.)
- **Light pass** at wrap-up: this session's writes only. **Deep pass**: backlog-driven —
  fired when the worklist count crosses a threshold, surfaced as a line in the brief with
  the exact command. No cron, no clock: sessions are the only clock that reliably exists,
  and a backlog counter is self-limiting where a day counter assumes steady traffic.
- **Metrics** (`metrics.ndjson`, committed, append-only): retrieval hits/misses,
  Tier-5 fallback emissions, duplicate warnings. A rising fallback rate = memory failed to
  capture something; it feeds the next deep review. Rot metric that predicts a cold brief:
  count of active records past their review-by date.

---

## Part VI — Assurance

### 20. The validation battery

Run by the validator on every invocation; failures name the file and the fix:

1. Schema: required fields, vocabulary membership, provenance presence, `based_on`
   non-empty on inference.
2. Retired-phrasings grep (forever), honoring recorded exemptions.
3. Atomicity: no index chunk starts inside a record.
4. Link integrity: `pair_with` symmetric; supersession pointers bidirectional; no dangling
   ids.
5. Immutability: per-record content hash vs. tool audit trail (§12.2).
6. Contradiction check, decidable: quoted spans inside derived records must appear
   byte-for-byte in their cited source; numbers, dates, and identifier-shaped tokens in a
   record must appear in its cited document. Stated plainly: an unquoted contradicting
   paraphrase is not caught by any shipped check — catching it would put a model in the
   validation path, which is banned.
7. Generated-file staleness (an assembled view older than its inputs, or hand-edited).
8. **The gold set** (`gold-set.md`): ~10 owner-phrased questions with expected files;
   recall@5; pass ≥8/10; the hyphenated-token regression as a separate case; run after any
   retrieval change. A retrieval mechanism is verified, never assumed.
9. Round-trips: index rebuild reproduces identical results from unchanged files; migration
   reproduces its input byte-identically.
10. The card rule: no card is the sole home of a fact (cards contain pointers + the
    authored line only).

### 21. Provider architecture and conformance

The agent interacts with an abstract protocol; the reference implementation is
markdown + SQLite as specified. The tool surface:

```text
search(query, filters)   get(id)          timeline(entity)      related(id)
add(record)              confirm(id)      correct(id, …)        supersede(old, new)
retire(id, phrasings)    merge(ids)       delete(id, reason)    sources(id)
card_search(query)       transcript_search(query, token)
spec_search(query)       spec_get(id)
```

Implemented behind a store-shaped Protocol with a conformance suite run by the validator
against every implementation. The `hasattr(...) else []` guard shape is banned by name — a
guard around a missing method converts a loud bug into a silent lie.

**A conforming provider MUST:** carry the full §11 schema as first-class queryable data
(not a flattened string map) · enforce the §13 refusals, including never merging across
differing provenance · support supersede/retire without hard-delete; any delete requires a
before-image · export everything in a re-importable form · run within the project's
privacy posture (no data leaves without the recorded consent of §15.5) · pass the
round-trip and gold-set suites. **These requirements are not theoretical**: the 2026-08
evaluations found each major platform failing at least one measurably — flat metadata that
cannot hold provenance; hard-delete of a fact plus its history behind an HTTP 200; an
in-place update replacing a value with its opposite, undetected; an indexer dismembering
structured records. A provider that fails conformance is not a provider for this system,
whatever its benchmarks say. The swap seam exists so that a future conforming provider
costs one adapter class, not a rewrite.

### 22. What may never happen

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
- No secrets, credentials, or private personal information in the vault — and no
  project-identifying examples migrated from private repositories into public ones.

### 23. Per-project profiles

Install-time profiles — Salesforce · web app · iOS · AI agent · research · docs-only —
vary only: crib and entity seeds, tag starters, gold-set template questions, SOUL template
role, approval-mode default, and rules/ starters. Mechanics are identical everywhere.

### 24. Migration

**From v1 (this toolkit's current system):** additive and reversible. v1 concepts map:
`specs/` → `specs/` · seven memory types → `facts` (context, domain, knowledge),
`decisions`, `procedures` (operations), `references`, with `planning` → `specs/roadmap` ·
v1 source values → §12.1 (`owner-quote`/`owner-paraphrase` → `owner_statement` with a
verbatim flag; `read-from-file` → `source_code`/`client_document` by path;
`agent-observed`/`agent-conclusion-unchecked` → `agent_observation`/`agent_inference`) ·
`superseded-by:` → the full §13 lifecycle. Grandfathered records upgrade when next edited;
migration never invents missing fields — gaps are shown to the owner, not guessed. No bulk
rewriting, ever: extraction and addition only; the engine, brief, and verbs install
alongside and take over gradually. Rollback = delete `.memory/` and the new tools; the
markdown never changed shape except by approved edits.

**Greenfield:** create the tree, ask the owner for real `project.md` framing and SOUL
role (never invent), seed profile defaults, register both startup routes, leave typed
folders ready.

### 25. Acceptance — what proves an installation works

- A cold session's first answer reflects the recent window and the owner block without
  re-explanation.
- The gold set passes ≥8/10, including one question in the owner's own vocabulary.
- "Still true" costs one CONFIRM; a superseded record stops being retrievable as current;
  a retired phrase's copies are hunted, and its transcript hits arrive stamped.
- The fact-pair regression passes: write a §12.3 pair, run every maintenance path, assert
  both records survive with sources intact.
- A relevant past decision surfaces proactively, within the raise cap.
- "What did we discuss about <entity> last week" is answered with dates from cards —
  without opening transcripts.
- Tier 6 fires honestly on an unanswerable question.
- The brief renders inside its ceiling with slots 0–1 intact — and the owner reads it and
  says it feels like the project remembers. That is a real criterion.

---

## Appendix A — Evidence

Portable findings behind the load-bearing rules (full reports live in the private sibling
project, 2026-08; public sources cited where they exist):

1. **Rules don't hold; mechanics do:** 3 anti-duplication rules on disk, all read, 15
   copies of one fact anyway; 50.1% copy-forward across 100M clinical notes (published
   EHR-duplication research).
2. **Add-only beats write-time reconciliation:** Mem0 v3 removed ADD/UPDATE/DELETE
   reconciliation; +20 LoCoMo, +26 LongMemEval.
3. **Verbatim beats summaries as retrieval target:** +15.9/+22.0 (LoCoMo /
   LongMemEval-S) for verbatim chunks over extracted artifacts; 19.0% vs 89.5% recall
   (summaries vs RAG, controlled); compaction probe: 3/3 themes kept, 0/3 specifics.
4. **Lexical + authored queries + rerank suffices at small scale:** 40% → 90% recall@5
   measured; BM25 near-ceiling for known-item clinical retrieval (doi 10.2196/94241);
   gains live at the rerank stage (doi 10.1016/j.jbi.2026.105053); domain-tuned
   embeddings underperformed general ones.
5. **Committed SQLite fails:** reproduced unresolvable add/add binary merge conflict;
   reproduced WAL silent total loss; no prior art commits binary+dump; text-committing
   patterns (sqlite-diffable et al.) are the established shape.
6. **Files-as-truth is the direction of travel:** Letta/MemGPT moved memory to a
   git-backed markdown filesystem; Anthropic's memory tooling is file-shaped; DB-owns-
   truth systems are multi-tenant services no human reads.
7. **Platform silent-destruction, observed first-hand (2026-08):** hard delete of fact +
   history behind HTTP 200; in-place update flipping a value undetected; an env-var
   backend switch shipping an entire store to a third party; a chunker splitting
   structured records into dangling fragments; a search tool silently returning only one
   side of conversations; an empty-query recency fallback presenting an unrelated memory
   as relevant.
8. **FTS5 sharp edges:** unquoted hyphenated tokens raise OperationalError; a
   two-character length filter silently turns `x-ray`-shaped tokens into their suffix;
   BM25 ranking requires a materialized CTE; stopwords are the caller's job.

## Appendix B — Mental model

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

## Appendix C — Merge record

This spec merged a provider-independent architecture draft ("universal spec") with the
toolkit delta spec grounded in the 2026-08 research ("mechanics spec").

**Adopted from the universal spec:** the seven-layer model and standalone layout; the
AGENTS/CLAUDE/SOUL layering with SOUL mandatory; `rules/` selective loading; the
PROJECT/CURRENT/RECENT/MAP orientation split; entities and timelines; the meaningful-event
test and telemetry exclusions; the seven-tier ladder including exact-lookup-first,
expansion, and honest failure; question-type routing; the richer provenance vocabulary;
the named tool surface; the no-summary-synchronization-tax principle.

**Adopted from the mechanics spec:** the enforcement taxonomy (economics/refusal/
detection) and every measured rule: add-only ADD, read-only review, provenance-keyed merge
refusal, the retirement phrase-hunt, cheap CONFIRM, pair_with, one_line, atomicity, the
crib, auto-quoting, no synonym expansion, tier-labelled precedence, empty-means-empty, the
working set, the boot-brief budget with the owner block and degrade-not-block, write-now
cadence, approval modes, the metrics log, backlog-driven maintenance, the gold set, the
conformance suite, and the evidence appendix.

**Conflicts resolved:** interchangeable providers → conformance-gated providers (§21),
because the named candidates measurably violate the schema and lifecycle this spec
requires. Entity/relationship folders → registry + typed links (§9.4–9.5), full graph
rejected with the reason recorded. AI-generated RECENT.md → assembled RECENT.md with one
authored line (§8), per the summarization measurements. Broad DELETE → narrow DELETE with
refusals (§13). Real personal-history examples present in the universal draft were removed
as unsuitable for a public repository; all examples here are generic.

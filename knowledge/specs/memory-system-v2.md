# Memory system v2 — north star and spec

Proposed 2026-08-17. Supersedes `memory-system.md` (v1) when the owner approves it; until
then v1 governs. This v2 incorporates the findings of an extensive August 2026 research and
adversarial-review effort in a sibling private knowledge-base project: three multi-agent
review gauntlets, an evaluation of Hindsight, memsearch (zilliztech), Waku Agent, Mem0, Zep,
Letta/MemGPT and LangMem, and measured experiments on retrieval and storage. Design choices
below cite that evidence in [§9](#9-evidence). Nothing project-specific from that effort is
reproduced here — only the architecture and the measurements that justify it.

## 0. North star

Every session, on any machine, in any project that installs this plugin, the agent should
open **already knowing the project**: what it is, what happened recently, what decisions
stand, what is open, and how the owner likes to work — and it should find anything else in
seconds, by meaning as well as by keyword. A session ending must never mean the project
forgets. And the memory must stay **curated, small, and trustworthy**: no rot, no duplicate
drift, no confident recall of something that was later corrected.

The failure modes this exists to kill, both observed at scale:

1. **Amnesia** — each session starts as a stranger; the owner re-explains; decisions get
   re-litigated; the same wrong action repeats.
2. **Rot** — every interesting sentence gets saved; copies drift apart; a corrected claim
   survives in three other files and gets retrieved instead of the correction. (Measured in
   the sibling project: one fact hand-copied 15 times across 7 files; a corrected false claim
   still live in 4 places after a dedicated correction pass; in clinical-records research,
   50.1% of text across 100M notes is copy-forward. Rules alone did not prevent any of this —
   only mechanics did.)

## 1. What carries over from v1, unchanged

- **Markdown in git is the only truth.** One knowledge root (`knowledge/`), one fact one
  home, links not copies, Obsidian as optional viewer, generated index never hand-edited.
- **The persistent-information test** gates every save (will it matter later; is it a stable
  fact/event/decision/state; does a home already own it; does leaving it out cause repeated
  explanation or a wrong action).
- **The placement table**: work items own live status; rules own standing instructions;
  skills own processes; specs own approved behavior; memory owns persistent understanding;
  references own outside material.
- **The seven memory types** (`context/`, `decisions/`, `domain/`, `knowledge/`,
  `operations/`, `planning/`, `references/`).
- **The owner-approval flow for specs.** Approved behavior changes only with the owner.
- **Source vocabulary** (`owner-quote`, `owner-paraphrase`, `read-from-file`,
  `agent-observed`, `agent-conclusion-unchecked`) — with one hardening in §3.

## 2. What v2 adds — the six pillars

### 2.1 A search engine: SQLite as disposable runtime, markdown as truth

One SQLite database per project, **gitignored, rebuilt from the markdown at session start**
(measured at 0.14–0.35 s for a ~5 MB / ~300-file corpus), holding an FTS5 full-text index
over specs, memory, and the session archive, plus the entry/status/link tables. Truth never
lives in it; deleting it loses nothing. `PRAGMA integrity_check` at boot; a failing store is
rebuilt, never trusted.

**Never commit the database.** Measured failure modes of a committed binary store: add/add
merge conflicts git cannot resolve, silent total loss under WAL when only the main file is
committed, no diff history, unreadable without tooling. Every mature system commits exactly
one artifact and it is text (Letta moved memory out of its DB into git-backed markdown;
basic-memory is markdown + SQLite "purely as an index").

**Retrieval is hybrid: keyword + meaning.** The mechanism, in order of what closed the gap
in measurement (naive keyword 40% recall@5 → 90% with the full mechanism):

1. **Agent-authored structured FTS5 queries** (AND-of-OR groups), not bag-of-words. The
   agent is a language model; composing the query is where "meaning" enters for free.
2. **An authored vocabulary crib** (`knowledge/memory/crib.md`): owner's words → project
   terms (e.g. "the sync thing" → `account-sync-batch-job`). Rendered into the generated
   index; auditable; no network.
3. **Auto-quoting** of hyphenated and digit-letter tokens before FTS5 (unquoted, `x-ray`,
   `L5-S1`-shaped tokens and their coding equivalents — `utf-8`, `oauth2-flow` — crash or
   silently mangle the MATCH parser).
4. **In-context LLM rerank** of ~30 BM25 candidates to ~5. Clinical-retrieval studies put
   the gain at the rerank stage, not the embedding stage.
5. **Embeddings optional, off by default**, as an empty table + reciprocal-rank-fusion
   (k=60) switch. For corpora under a few MB, BM25 + structured queries + rerank measured
   equal or better. Turning embeddings on is a per-project decision: for client projects,
   sending project content to an embedding API is a **consent decision the client's data
   terms govern**, never a config default. No blind synonym expansion (measured hurting 2 of
   7 gold queries).
6. **A committed gold set** (`knowledge/memory/gold-set.md`): ~10 real questions in the
   owner's phrasing with expected files; run after any retrieval change; recall@5, pass ≥
   8/10. An empty or failed query returns nothing — never a recency fallback.

### 2.2 The boot brief: sessions start warm

A generated, size-bounded brief printed by the session-start hook (Claude) / startup route
(Codex). Fixed slots, assembled from entries verbatim — **no machine paraphrase anywhere**:

- **Slot 0 — orientation:** project one-liner, folder map, schema pointer. (v1's
  `project.md` + `index.md`, kept.)
- **Slot 1 — owner preferences:** 3–6 authored one-liners flagged `render_in_brief` (how
  the owner likes reviews, standing asks, conventions). Never evicted, never
  machine-composed.
- **Slot 2 — the recent window: what the last 2–3 days produced.** Where we left off (one
  authored line from the last session card), decisions made, entries changed, open threads.
  Assembled from entries and cards by date filter — not summarized by a model.
- **Slot 3 — open questions and stale flags,** capped with an overflow count. Recently
  settled questions render too ("asked <date>, settled"), so the agent never re-asks.
- **Slot 4 — machinery:** validator warnings count, review-backlog count when over
  threshold.

Ceiling ~10 KB rendered; warn near it; **over it, degrade to slots 0–1 plus counts and warn
loudly** — never block the session. Shrink by summarising the tail (counts + pointers),
never by dropping the head.

### 2.3 An entry lifecycle: supersede, never silently lose

Memory frontmatter gains a lifecycle (the v1 `superseded-by:` field, completed):

- `status:` `live` · `superseded` · `retired`. Retiring requires `retired-because` and a
  tool-written date; it is reversible; retired/superseded content is excluded from the
  index and demoted in search, but stays on disk — **git plus the file is the full
  breadcrumb trail back through time**.
- **Correcting an error vs. new knowledge are different acts:** fix-in-place with the old
  wording moved to a `history` block (audit trail is the fix), vs. a new entry superseding
  the old (yesterday's note was true when written).
- **Retiring a claim hunts its copies.** `decide --retire` takes the phrasings being
  killed, greps the repo, and refuses to finish until each surviving copy is wrapped in a
  sentinel comment (`<!-- retired:<id> -->`), exempted explicitly, or fixed. The validator
  greps retired phrasings forever after. (This exists because a corrected claim measurably
  outlived its correction — rules did not catch it; a grep did.)
- **Cheap reaffirmation:** `confirmed-on:` date list appended by `decide --confirm`, no
  history churn. "Still true" must be the cheapest possible write, because it is the most
  common one — the correct path and the lazy path must be the same path.

### 2.4 The five verbs (maintenance has names)

| Verb | What it is | Hard rules |
|---|---|---|
| `remember` | Add a new entry | **Add-only** — can never overwrite, merge, or delete. Near-duplicate warning, **suppressed when the two candidates' `source` values differ** (differing provenance = two facts by definition). Applies the persistent-information test. |
| `recall` | The tiered read | Specs + memory first (SQL-enforced path filter); session search only on an emptiness token `recall` itself emits. Returns a **working set** (file list + entry ids, persisted to a state file) that follow-ups reuse, so consecutive answers rest on the same sources. |
| `decide` | All change | `--confirm` (reaffirm), supersede, `--retire` (with the phrase hunt), `--merge` (only when provenance is identical; both originals into history, lossless), `--delete-junk` (only for things that never passed the test; requires a reason; visible as a git diff). |
| `review` | Maintenance — **read-only** | Emits a worklist only: near-duplicates, stale entries, orphaned links, never-recalled entries. Acting on it goes through `decide`. Light pass at wrap-up (this session's writes); deep pass **backlog-count-driven**, surfaced in the brief — no cron, no clock. Renamed from "reflect" so no agent reads write-permission into it. |
| `session-search` | The fallback | Over local CLI transcripts at **verbatim-turn granularity**, with per-session **manifest cards** (date, topics, decision pointers, how it ended) as search keys — never as the retrieved unit and never the only home of any fact, number, or decision. Results matching retired phrasings come back stamped "superseded by <id>". |

Why write-time merging is banned and maintenance is read-only: Mem0 shipped write-time
ADD/UPDATE/DELETE reconciliation and **removed it** (+20 LoCoMo, +26 LongMemEval after
going add-only) because reconciling at write time destroyed information. Why verbatim turns
beat summaries as the retrieved unit: measured 15.9–22.0 point gains for verbatim over
extracted artifacts; a compaction probe kept 3/3 high-level facts and **0/3 specific
values**. Summaries drop exactly the qualifiers that matter.

### 2.5 Provenance that machines can act on

v1's `source:` vocabulary is kept and hardened:

- `source` is **immutable after write**. `agent-conclusion-unchecked` never upgrades to
  fact by repetition or age — verification is an explicit `decide` edit citing what
  verified it.
- Scoped negatives: "not found in `src/` and the specs" — never "doesn't exist". Wording
  drifts toward the absolute as it is copied; the scope travels with the claim.
- A claim's source marker sits beside the claim (v1 rule, kept); the validator now checks
  it mechanically.
- The validator detects out-of-band edits: a per-entry content hash, and an error when an
  immutable field changed without a matching `decide` audit trail (tool-plus-validator
  enforcement, stated honestly — markdown cannot physically prevent an edit).

### 2.6 Anti-rot as mechanism, not discipline

- A committed **metrics log** (`knowledge/memory/metrics.ndjson`, append-only): recall
  hits/misses, fallback-token emissions, duplicate warnings. `review` reads it; a high
  session-search fallback rate means memory failed to capture something — it feeds the next
  deep review.
- Fenced records are **atomic**: the index builder fails loudly rather than emit a fragment
  (a mature tool's chunker was observed splitting a structured record into a dangling
  attribution and an orphaned value list — worse than not indexing at all).
- No model paraphrase in any build or index path. A paraphrase reads fluent whether or not
  it kept the qualifier; that is what makes it dangerous.
- Curation stays bounded by the persistent-information test **plus** the approval flow
  (§3): growth is bounded by what the owner approves, warnings are bounded by suppression
  rules, and the deep review works a finite backlog.

## 3. The approval question — one open fork for the owner

v1 requires owner approval for **every** persistent save. The sibling project's design runs
agent-curated with an audit trail instead. For client work, approval-per-save protects
deliverable truth; for solo projects it is friction that discourages capture. Proposed
resolution, to be approved or amended with this spec:

- **Specs: always owner-approved** (unchanged).
- **Memory: per-project mode**, set at install: `approve` (v1 behavior, default for client
  profiles) or `curate` (agent writes within the §2.4 rules, owner reviews git diffs; the
  five-bullet review renders in the PR/handoff instead of blocking mid-session). Default
  for solo profiles: `curate`.

## 4. Per-project profiles

Install-time profiles (Salesforce · web app · iOS · AI agent · docs-only) provide: the crib
seeded with the stack's vocabulary, tags starter list, gold-set template questions, and the
approval mode default. The mechanics above are identical across profiles — only vocabulary
and defaults vary.

## 5. Multi-agent and multi-machine honesty

- Claude gets the brief via the SessionStart hook; Codex via `AGENTS.md` + its hook
  registration; both fail open.
- The SQLite engine is per-machine and disposable — nothing depends on it surviving or
  syncing. The markdown, the metrics log, and the cards travel through git; that is the
  entire sync model.
- Local CLI transcripts are per-machine and may expire: `session-search` reports scope
  honestly ("searched this machine's history for this project") and never claims a
  discussion didn't happen because a transcript is gone.
- Nothing may lean on any vendor's built-in private auto-memory (machine-local, invisible,
  unversioned; disabled in adopting projects — v1 rule, kept).

## 6. What v2 deliberately does not do

- No committed database, no embeddings by default, no cloud memory platform. (Hindsight,
  memsearch, Mem0, Zep and LangMem were evaluated against requirements like these in
   2026-08: every one either required unavailable/consent-gated network dependencies,
  lacked structured provenance a machine can act on, or shipped silent-destruction paths —
  hard deletes and in-place rewrites behind success responses. The full comparison lives in
  the private project; its portable conclusions are §9.)
- No background processes or helper agents writing persistent knowledge (v1, kept).
- No model-generated summaries as the only home of anything.
- No transcript copying/promotion into truth (v1, kept) — indexing for search is not
  promotion.

## 7. Migration from v1

Additive, per-project, reversible: add the lifecycle fields as entries are next touched
(grandfathering, v1's rule); build the engine + brief + verbs alongside the existing skills
(`remember`/`recall`/`cleanup`/`session-search` evolve into the five verbs); seed crib and
gold set at adoption. No bulk rewriting of existing memories — extraction and addition
only. Rollback is deleting the engine and the new tools; the markdown never changed shape
except by approved edits.

## 8. Acceptance (what proves v2 works, per adopting project)

- A cold session's first answer reflects the recent window without the owner re-explaining.
- The gold set passes ≥ 8/10 including one question phrased in the owner's own vocabulary.
- "Still true" costs one `--confirm`; a superseded claim stops being retrievable as
  current; a retired claim's copies are hunted and stamped.
- A duplicate-warning storm or rising fallback rate shows up in the review worklist, not in
  silent growth.
- The owner reads the boot brief and says it feels like the project remembers.

## 9. Evidence

Portable findings this spec rests on (full reports in the private sibling project, 2026-08):

- Copy-forward at scale: 50.1% of text across 100M clinical notes is duplicated; no system
  fixed it with rules — only by changing what is cheap at write time.
- Add-only beats write-time reconciliation: Mem0 v3 removed write-time ADD/UPDATE/DELETE,
  +20 LoCoMo / +26 LongMemEval.
- Verbatim beats summaries as the retrieved unit: +15.9 (LoCoMo) / +22.0 (LongMemEval-S)
  for verbatim chunks over extracted artifacts; 19.0% vs 89.5% recall (summaries vs RAG) on
  a controlled set; a ~170K→2.8K-token compaction kept 3/3 high-level facts, 0/3 specifics.
- Lexical + query-authoring + rerank suffices at small scale: 40% → 90% recall@5 measured
  on a real ~5 MB corpus; clinical-retrieval studies (doi 10.2196/94241, doi
  10.1016/j.jbi.2026.105053) put BM25 near-ceiling for known-item retrieval and the gains
  at the rerank stage; domain-tuned embeddings underperformed general ones.
- Committed SQLite as store: reproduced binary merge-conflict data loss, WAL
  silent-total-loss, no prior art for committed-DB-plus-dump; every established pattern
  commits text (sqlite-diffable et al.).
- Truth-in-files is the industry direction for owner-readable memory: Letta/MemGPT moved
  memory blocks to a git-backed markdown filesystem; Anthropic's memory tooling is
  file-shaped; systems where a DB owns truth are multi-tenant services no human reads.
- Platform silent-destruction paths observed first-hand in 2026-08 testing: a hard delete
  of a fact plus its history behind an HTTP 200; an in-place update that replaced a value
  with its opposite, undetected. Git's free before-image on every change is the
  counter-mechanism.

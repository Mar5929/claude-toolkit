# Second-Brain Memory & Knowledge Architecture: Portable Technical Specification

> **You are the implementing agent.** Read this entire document, then implement
> the system end-to-end in the host project. It is self-contained: the data
> model, storage and sync design, the runtime pipeline, the curator sub-agents,
> the knowledge layer, setup steps, and acceptance tests are all here, and the
> sibling `hooks/`, `agents/`, and `templates/` folders next to this file carry
> **complete, battle-tested reference implementations**. You are expected to
> copy those files and fill placeholders, not re-derive them. Every script here
> passed a 30+ assertion isolated harness (bundled as
> `hooks/brain-harness-test.sh`) and months of production use in the origin
> project, including several incidents whose fixes are baked in (section 14).
>
> **Fill in the placeholders** (`<ANGLE_BRACKETS>`) from the host project:
>
> - `<APP_NAME>`: the product/app name.
> - `<BRAIN_REMOTE_URL>`: the git URL of the **dedicated, private brain repo**
>   you will create (for example `https://github.com/<owner>/<app>-brain.git`).
> - `<PROJECT_EXCLUSIONS>`: domain-specific content that must NEVER be stored
>   (see section 13). Always includes secrets/keys/PII; add anything sensitive
>   to the app's domain (medical, financial, legal, minors, etc.).
> - `<MODEL>`: the model the background curators run on (default `sonnet`; a
>   small/cheap model is the right choice, the curators are librarians, not
>   architects).
> - `<CODE_PATH_REGEX>`: an extended regex over changed file paths that counts
>   as "app code" (for example `src/|lib/|Tests/`). Decides when the
>   knowledge-curator (phase 2) runs. Empty = every change counts.
>
> **Hard dependency:** this design targets **Claude Code** (project hooks in
> `.claude/settings.json` plus sub-agents invoked via `claude -p --agent`). If
> the host uses another harness, the data model, storage, sync, and curator
> prompts port unchanged; only the hook wiring (section 6) changes: adapt the
> three lifecycle triggers (session-start, user-prompt, turn-end) to the host's
> equivalents. Everything else is plain POSIX-ish bash + git.
>
> Design motto: **journal everywhere, curate once, publish once.**

---

## 1. What you are building, and the goals every choice serves

A **second brain**: durable, cross-session project memory plus a knowledge
graph, so every new agent session starts as a colleague who already knows the
project, not a fresh hire scrambling to catch up. It is built to survive the
hostile realities of real agent use: many parallel sessions on one machine,
worktrees that appear and vanish, sessions with no API key, machines that go
offline, and a public app repo that must never leak the store.

| Goal | Mechanism |
|------|-----------|
| **Continuity** | Curated digest injected at every SessionStart; per-prompt relevant-node pointers |
| **Structure** | One fact = one Markdown node; typed, directional edges; a JSON graph index |
| **Cleanliness** | A single writer per file (the curator agents) enforces dedup, links, index consistency |
| **Concurrency-safe** | Any number of parallel sessions; **at most one curator per machine**, batched and debounced |
| **Durability & privacy** | Canonical store in a **dedicated private repo**, never in the app repo |
| **App-git isolation** | Memory can never dirty, lock, or corrupt the app repo's git, structurally |
| **Graceful degradation** | Works with no API key and no `claude` CLI (capture degrades to journaling) |

## 2. System at a glance

```
                        +------------------------------------+
                        |  <owner>/<app>-brain   (PRIVATE)   |  canonical store
                        |  main = the memory, plain files    |
                        +---------------^--------------------+
                                        | push (curator flush only)
                                        | fetch (refresh)
      +---------------------------------+------------------------------+
      |  ~/.cache/second-brain/<sha-of-app-origin-url>/                |  MACHINE-GLOBAL
      |  journal.jsonl   journal.cursor   last-run   current-head     |  coordination
      |  locks/{curator,sync}.lock   sync-repo/ (isolated clone)      |  (shared by ALL
      |  hook.log  curator.log  sync.log  batch.jsonl  runs.jsonl     |  worktrees)
      +---^------------^------------^------------^-----------^--------+
          | append     | append     | append     | elect     | overlay
      +---+---+    +---+---+    +---+---+    +---+--------+  |
      |sess. A|    |sess. B|    |sess. C|    | ONE curator|  |
      |wt A   |    |wt B   |    |primary|    | (primary)  |  |
      +---^---+    +---^---+    +---^---+    +------------+  |
          +------------+------------+------------------------+
            each worktree: brain/ = local gitignored cache
            (digest injection, retrieval, curator writes)
```

Three storage tiers, one writer:

1. **Canonical store**: the brain repo's `main`. Plain Markdown + `index.json`.
2. **Local cache**: `<worktree>/brain/`, gitignored (only `brain/README.md` is
   tracked in the app repo, as a signpost). Every session reads its own cache;
   the curator writes to the **primary checkout's** cache.
3. **Machine-global coordination dir**: journal, cursor, locks, stamps, the
   single hidden sync clone, logs. Per-worktree state cannot coordinate across
   worktrees; this dir is what does. Keyed by the app origin URL so all
   worktrees/clones of the project on one machine share it.

## 3. Data model

### 3.1 Store layout (identical in the brain repo and in each cache)

```
brain/
  BRAIN.md           the curated digest injected into every session; keep it TIGHT
  index.json         the knowledge graph: every node + every typed edge
  ARCHITECTURE.md    a curator-facing digest of this spec (optional, recommended)
  README.md          the tracked signpost (the only brain/ file in the app repo)
  decisions/         ADR-style decision records ("why")       id: dec-XXXX-slug
  knowledge/         durable system/domain knowledge          id: know-slug
  preferences/       owner profile + working agreements       id: pref-slug
  sessions/          one short note per work session          id: ses-YYYY-MM-DD-slug
  glossary/          entities / terms                         id: ent-slug
  _templates/        node-template.md for new nodes
  .runtime/          cache-local state (never synced, never a memory)
```

### 3.2 Node schema

One Markdown file = one fact. YAML frontmatter + free-form body
(`templates/node-template.md`):

```yaml
---
id: dec-0002-example-slug      # STABLE. <type-prefix>-<slug>. Never reused/renamed.
type: decision                 # decision | knowledge | preference | session | entity
title: Human-readable title
status: active                 # active | proposed | superseded | deprecated
created: 2026-07-05
updated: 2026-07-05
tags: [area, subarea]
confidence: high               # high | medium | low (how settled/verified)
source: "where it came from"   # provenance (optional, preferred)
links:                         # typed edges, section 3.3
  - derived-from: pref-owner-profile
covers:                        # knowledge/* only, optional, section 4
  - { path: src/pricing/engine.ts, sha: <git blob sha> }
---
Body. For decisions: context / decision / consequences.
```

Rules: ids are permanent (a rename changes `title`, never `id`); decisions are
numbered like an ADR log, with `dec-01xx` reserved for meta/system decisions
(decisions about the brain itself); retire by `status: superseded` plus a
`superseded-by` edge, **never delete** (history and back-links matter); only
truly erroneous or empty nodes are removed.

### 3.3 Edge vocabulary (typed, directional)

Use the narrowest true type, not blanket `relates-to`:

| Edge | Meaning | Typical inverse |
|------|---------|-----------------|
| `relates-to` | general association (last resort) | `relates-to` |
| `depends-on` | A requires B to hold | `enables` |
| `implements` | A is how B is carried out | `implemented-by` |
| `refines` | A sharpens / narrows B | `refined-by` |
| `part-of` | A is a component of B | `has-part` |
| `example-of` | A is an instance of B | `has-example` |
| `derived-from` | A follows from B (fact/constraint) | `informs` |
| `contradicts` | A is in tension with B (a flag for the curator) | `contradicts` |
| `supersedes` / `superseded-by` | A replaces B (lifecycle) | (paired) |

Node files write the forward edge; the curator keeps the graph bidirectionally
consistent in `index.json`.

### 3.4 `index.json`

Machine-readable mirror: `{version, updated, nodes[], edges[]}` where a node
entry carries `{id, type, title, status, path, tags}`. Used for retrieval,
dedup checks, and orphan/dangling-edge detection. **The files are the source
of truth**: on any divergence the curator rebuilds the index from the files.
`hooks/brain-check.sh` makes the invariants computable (index matches files,
no duplicate ids, no dangling edges, no orphans); the curators run it every
pass.

### 3.5 `BRAIN.md` (the digest)

A curated briefing, not a dump: the project in five lines, load-bearing
decisions (headline + node id), the owner profile in one breath, working
agreements, what's in flight. Target well under about 250 lines; when it would
grow past that, the curator pushes detail down into nodes and keeps only the
headline + id. Volatile day-to-day state is pointed to (for example a
`STATUS.md`), never duplicated, so the two can never disagree.

## 4. The knowledge layer (code-to-context drift detection)

A `knowledge/*` node narrates *why* a code subsystem works the way it does,
but code moves and prose silently goes stale. The layer makes staleness
**computable**, and it has its own specialist writer:

- **Two curators, one lock.** The **brain-curator** owns everything under
  `brain/` except `knowledge/`; the **knowledge-curator** owns exactly
  `brain/knowledge/`. They run as two serialized phases of the same background
  batch (never concurrently), so the split never creates concurrent writers.
  The knowledge-curator runs only when the batch's changed paths match
  `<CODE_PATH_REGEX>`.
- **Shape: a knowledge base over the whole app, not a note pile.** Coverage
  target: every subsystem gets a reference node mapping it to its business
  function (Purpose / Why built this way / How it works in brief / Constraints
  honored / Open questions), and a `know-codemap` node is the inventory: one
  row per subsystem, its node, and a one-line purpose. A subsystem with no
  node is a reportable coverage gap.
- **`covers:` blocks (opt-in, knowledge nodes only).** A node that explains
  specific source files pins each one to the git **blob SHA** it was last
  reconciled against (`git hash-object <file>` at curation time).
- **`hooks/knowledge-drift.sh`** (read-only; never writes the store):
  no args = human report (`fresh` / `STALE` / `MISSING`, exit 1 on drift);
  `--stale` = machine work-queue for the curator; `--for <path>` = reverse
  lookup ("which node explains this file?").
- **Curator sweep rule.** Every background pass runs `--stale`; for each
  flagged node the knowledge-curator **re-reads the covered files, reconciles
  the explanation with the current code, then re-anchors the SHA** and bumps
  `updated`. Re-anchoring without re-reading is forbidden: it would hide the
  very drift the layer exists to catch.

The layer is deliberately part of the same store. Knowledge nodes are ordinary
memory nodes with one extra frontmatter block, so there is no second storage
system to keep consistent.

## 5. Storage topology & privacy

- **Canonical store (recommended): a dedicated, PRIVATE sibling repo**
  (`<BRAIN_REMOTE_URL>`), branch `main`. Contains the store minus `.runtime/`
  and `README.md`. A dedicated repo gives independent history and access
  control, and the app repo then contains **no memory content on any branch**.
- **App repo:** `.gitignore` gets `/brain/*` with `!/brain/README.md` (the
  signpost). The memory system never touches the app repo's `.git`; all git
  work happens in an isolated clone under the machine-global dir.
- **Machine-global dir:**
  `${XDG_CACHE_HOME:-$HOME/.cache}/second-brain/<key>/` where `<key>` is the
  first 16 hex chars of sha256(app origin URL) (falls back to the project path
  when there is no origin). Never leaves the machine.
- **Legacy variant (retrofit only): an orphan branch of the app's own origin.**
  When a second repo is truly unwanted, leave `BRAIN_REMOTE` empty and the
  hooks fall back to a dedicated orphan branch (`second-brain`) of the app's
  origin, via the same isolated clone. The sync **structurally refuses** to
  push memory to `main`/`master`/the default branch in this mode (section
  14). Prefer the dedicated repo: if the app repo is public, an orphan branch
  makes the store public too, which is exactly how the origin project once
  exposed its owner profile.
- **Privacy rule:** if the store may ever hold personal or sensitive owner
  context, the brain repo must be private, and the app repo must never carry
  the store on any branch.

## 6. Runtime pipeline (hooks)

Wired in `.claude/settings.json` (`templates/settings-hooks.json`). All hooks
are best-effort, always exit 0, and are recursion-guarded
(`BRAIN_CURATOR_ACTIVE=1` in the curator's own environment makes every brain
hook a no-op, so the curators' own turns can never re-trigger capture).

| Event | Hook(s), in order | Job |
|-------|-------------------|-----|
| SessionStart | `brain-repair.sh`, then `brain-hydrate.sh`, then `brain-inject.sh` | clear legacy git state; refresh the cache (fetch + converge); print the digest into context |
| UserPromptSubmit | `brain-retrieve.sh` | cheap freshness check, then surface up to 5 relevant nodes (2+ distinct keyword hits) as pointers |
| Stop | `brain-capture.sh` | journal the turn; maybe **elect** the machine's single curator |
| (from the elected runner) | `brain-flush.sh`, then `brain-sync.sh` | publish the store after a clean pass |

### 6.1 Capture (Stop): journal + leader election

Every turn, unconditionally (pure shell, no model call):

1. Compute `repo_changed` for this worktree (HEAD moved with a real diff
   outside `brain/`, or a dirty tree outside `brain/`; per-worktree
   `last-head` marker).
2. Append one JSON line to the **global** `journal.jsonl`: `{ts, session,
   worktree, branch, head, head_subject, transcript, repo_changed, changed[]}`
   (atomic O_APPEND single-line write).

Then the election. Spawn a curator **only if all of**:

- `BRAIN_AUTORUN` is truthy and the `claude` CLI is present (else
  journal-only);
- undrained entries exist (journal lines > cursor) **with** at least one
  `repo_changed: true` among them;
- `now - last-run >= BRAIN_CURATOR_INTERVAL` (default 900 s), a machine-wide
  debounce;
- the global `curator` lock is acquired (atomic `mkdir`, **non-blocking**: if
  held, a curator is already running and this turn's entry lands in a future
  batch);
- both the pending and interval conditions are **re-verified inside the lock**
  (this closes the check-then-act race), then `last-run` is stamped **at
  start** (failed runs also wait out the interval; no retry storms).

The winner snapshots the pending journal slice to `batch.jsonl`, **capped at
40 lines per run** so a monster backlog can never demand an unbounded run (the
remainder drains at the next election; a capped slice containing zero changed
turns is hopped by the cursor with no API spend). Then it spawns **one
detached runner** that:

- runs in the **primary checkout** (the `git rev-parse --git-common-dir`
  parent): ephemeral worktrees can vanish mid-run, the primary cannot;
- invokes `claude -p <batch prompt> --agent brain-curator --model
  $BRAIN_MODEL --permission-mode acceptEdits`, with `CLAUDE_PROJECT_DIR`
  pointed at the primary and the recursion guard exported;
- runs the curator process with a **sanitized env** (`BRAIN_AUTOSYNC=0`,
  `BRAIN_BRANCH=` empty): publishing is the wrapper's job, so any flush/sync
  the agent itself shells out to is a structural no-op (guard #2 from the
  origin project's publish incident; guard #1 is the sync's app-repo refusal,
  section 6.2);
- enforces a hard budget per phase (`BRAIN_CURATOR_TIMEOUT`, default 1200 s)
  via an explicitly-resolved `timeout`/`gtimeout` binary (hook PATH is not the
  interactive PATH) with SIGKILL escalation, or a pure-shell watchdog with the
  same TERM-then-KILL escalation. A runaway curator can never run unbounded,
  even one that ignores SIGTERM;
- on exit 0: advances the cursor to the snapshot end, runs **phase 2**, then
  flushes (publishes). **Phase 2 (knowledge):** if `BRAIN_KNOWLEDGE` is on and
  the batch touched app code (`BRAIN_CODE_PATH_REGEX`), the runner spawns the
  **knowledge-curator** on the same batch, same budget, same lock, serialized
  by construction. Its failure never blocks publishing phase 1 (knowledge
  writes are additive; the publish guards catch a torn index; drift replays
  via its own `--stale` queue rather than the journal cursor);
- on nonzero exit or timeout in phase 1: the cursor stays; the batch
  **replays** at the next election. Curation is idempotent (dedup by design),
  so replays are safe;
- writes one structured row per run to `runs.jsonl` (both phases' exit codes,
  batch range, changed-turn count, duration);
- releases the lock on all paths. The lock's stale-steal age
  (2 x budget + 300 s, because a run can legally span BOTH curator phases)
  exceeds any live run, so only a genuinely dead runner's lock is ever stolen,
  and stealing happens by atomic rename, never a bare `rm -rf` (two contenders
  racing an rm can kill a fresh lock).

### 6.2 Publish (flush then sync): the ONLY writers of the remote

`brain-sync.sh` (a no-op unless `BRAIN_AUTOSYNC` is truthy or `--force`):

1. **Publish guards:** skip if `index.json` or `BRAIN.md` is missing (a gutted
   cache, for example a fresh clone before hydrate) or `index.json` is not
   valid JSON (a curator killed mid-write). Never publish a bad store as the
   baseline every future refresh builds on.
   **App-repo refusal:** when the target remote resolves to the APP repo's own
   origin (legacy mode), the sync refuses outright to push to `main`/`master`/
   the repo's default branch. Memory may only ever land on a dedicated branch
   or the dedicated repo.
2. Prepare the **global isolated clone**: fetch + hard-reset to the brain
   repo's `origin/main` (or prepare an unborn orphan if the branch is absent);
   copy the app repo's signing config in so commits stay Verified.
3. **Additive-union overlay:** tar-copy the cache onto the fresh checkout
   *without wiping it*. Nodes other machines pushed stay; deletions don't
   propagate (the curator supersedes, never deletes).
4. Commit as a stable bot identity (`Claude <noreply@anthropic.com>`), signed
   if a key is configured, `--no-verify`, and push. Push results are
   classified: success / branch-protection = **STOP, never force-push** /
   non-fast-forward = refetch + re-overlay + retry with backoff / transient =
   retry with backoff.
5. On success: record the new HEAD in `current-head`, **fold the union back**
   into the publishing cache (it gains other machines' nodes), and stamp the
   cache's `store-head`.

Per-turn autosync is deliberately absent: N divergent worktree caches taking
turns republishing their own digests produced last-writer-wins ping-pong on
the remote in the origin project. One writer means one publisher, serialized
by the global sync lock.

### 6.3 Refresh (SessionStart + per-prompt): converging caches

`brain_refresh` replaces a naive fill-only hydrate:

- **empty cache** (fresh clone / fresh desktop worktree): fill from the store;
- **stale cache** (`store-head` != `current-head`): additive overlay from the
  **local** clone; adds/updates files, never deletes local-only ones;
- SessionStart runs it with `--fetch` (pulls cross-machine updates,
  offline-safe); the per-prompt path in retrieve is two file reads unless an
  overlay is actually needed, so long-lived sessions converge mid-session;
- it never overlays while the curator lock is held (no mixing an overlay into
  a half-written pass).

### 6.4 Repair (SessionStart)

Idempotent cleanup of legacy state so a session can never start with git
stuck: clears `--skip-worktree` bits on any tracked `brain/` path, removes a
`/brain/` line from the shared `info/exclude`, retires per-worktree
clones/locks from older layouts. Bails if `index.lock` exists (never fights a
live git operation). Mostly relevant when retrofitting a project that once
tracked its store in the app repo; harmless everywhere else.

## 7. Concurrency & consistency model

| Property | Mechanism |
|----------|-----------|
| At most one curator per machine | global `mkdir` lock + interval debounce + post-acquire re-check |
| No lost turns | append-only journal; cursor advances **only** after a clean pass; failed batches replay |
| Exactly-once-ish curation | snapshot slice + cursor arithmetic; replays are idempotent (dedup) |
| No unbounded runs | resolved timeout binary or shell watchdog (rc 124 on kill), TERM then KILL |
| No live-lock steal | steal age > the whole two-phase run budget; steal by atomic rename |
| No torn/gutted publishes | JSON-validity + presence guards before any commit |
| No cross-machine clobber | additive-union overlay (deletes don't propagate; supersede instead) |
| No digest ping-pong | only the elected runner's flush publishes |
| Cache convergence | store-head vs current-head refresh at SessionStart + per prompt |
| App-git safety | all git in an isolated clone under the cache dir; `brain/` gitignored |

Failure modes and their behavior:

- **Curator timeout / crash / API error**: no cursor advance, no publish; the
  half-written cache is tolerated (the next pass re-derives; the guards keep
  it off the remote; a refresh may revert it, an equivalent outcome, and the
  batch replays).
- **Machine offline**: the journal accumulates; flush retries later; refresh
  serves the last-known store.
- **No API key / no `claude` CLI**: journal-only capture; inject/retrieve
  still work from the cache; the next available curator drains everything.
- **Branch protection / rejected push**: STOP and log; never force.
- **Two sessions elect simultaneously**: one `mkdir` wins; the loser exits;
  the winner re-verifies conditions before running.
- **Cloud/sandbox sessions** whose credentials are scoped to the app repo only
  can neither hydrate from nor publish to the separate brain repo. They
  degrade gracefully: journal-only capture inside the sandbox, failed pushes
  logged and swallowed. Cross-machine memory assumes sessions run where brain
  credentials exist.

## 8. The curator agents (one writer per file, serialized)

Full reference prompts: `agents/brain-curator.md` and
`agents/knowledge-curator.md`. Main agents delegate via the Task tool;
hand-editing the store is forbidden, including by humans.

**brain-curator** owns everything except `knowledge/`. Its capture brief is
deliberately open-ended: anything the owner states that a future session
should know, including terminology ("X is also known as Y" becomes a glossary
node with aliases) and corrections ("actually..." refines or supersedes, never
duplicates). Modes: background CAPTURE (batch drain), RECALL (cited answers
from the graph), REMEMBER (immediate persist + flush), HYGIENE (rebuild index
from files, collapse dupes, connect orphans).

**knowledge-curator** owns `brain/knowledge/`. Modes: background DOCUMENT
(phase 2: reconcile the drift queue, re-read before re-anchor, document
changed subsystems), EXPLAIN ("why does this code exist?", with reverse lookup
and staleness warnings), COVERAGE (report undocumented subsystems).

Shared invariants: one writer per file; no duplicates; everything linked;
supersede, don't delete; digest stays tight; stable ids; honesty
(`confidence:` marks unverified claims). Shared exclusions: section 13.

## 9. Configuration reference (`.claude/settings.json`, `env` block)

| Var | Default | Production | Effect |
|-----|---------|------------|--------|
| `BRAIN_ENABLED` | `1` | `1` | master switch |
| `BRAIN_CAPTURE` | `1` | `1` | journal on Stop (+ election) |
| `BRAIN_AUTORUN` | `1` | `1` | allow spawning the curator |
| `BRAIN_INJECT` | `1` | `1` | digest at SessionStart |
| `BRAIN_RETRIEVE` | `1` | `1` | per-prompt node pointers |
| `BRAIN_AUTOSYNC` | `0` | `1` | allow flush to push |
| `BRAIN_REMOTE` | *(empty)* | `<BRAIN_REMOTE_URL>` | brain repo; empty = legacy fallback (app origin + `second-brain` orphan branch) |
| `BRAIN_BRANCH` | *(empty)* | *(NOT SET)* | branch override. **Deliberately absent from settings**: the lib defaults it (`main` when `REMOTE` is set, `second-brain` in legacy mode). Exporting a branch machine-wide is what caused the origin project's publish-to-main incident; leave it unset. |
| `BRAIN_MODEL` | `sonnet` | `<MODEL>` | curator model |
| `BRAIN_KNOWLEDGE` | `1` | `1` | phase-2 knowledge-curator on code batches |
| `BRAIN_CODE_PATH_REGEX` | *(empty)* | `<CODE_PATH_REGEX>` | ERE over changed paths that counts as app code; empty = any change |
| `BRAIN_CURATOR_TIMEOUT` | `1200` | `1200` | hard budget (s) per curator phase |
| `BRAIN_CURATOR_INTERVAL` | `900` | `900` | min s between runs, machine-wide |
| `BRAIN_TIMEOUT_KILLAFTER` | `30` | `30` | s after SIGTERM before SIGKILL escalation |

## 10. Setup / installation (do these in order)

1. **Create the brain repo**: an empty **private** repo the owner can push to
   (`<BRAIN_REMOTE_URL>`).
2. **Add the gitignore** to the app repo and commit it:
   ```gitignore
   # Second brain: local cache; canonical copy lives in the dedicated brain repo.
   /brain/*
   !/brain/README.md
   ```
3. **Scaffold `brain/`** locally: `_templates/node-template.md`, a minimal
   `BRAIN.md` digest, `index.json`
   (`{"version":1,"updated":"<date>","nodes":[],"edges":[]}`), `README.md`
   (the signpost explaining the store is a gitignored cache), and the empty
   node folders.
4. **Install the hooks** from `hooks/` into `.claude/hooks/`, keep the
   `brain-*` names, `chmod +x`.
5. **Install the agents** from `agents/` into `.claude/agents/`, filling
   `<APP_NAME>` and `<PROJECT_EXCLUSIONS>`.
6. **Wire `.claude/settings.json`** by MERGING `templates/settings-hooks.json`
   into the existing file (never clobber existing env/hooks).
7. **Seed the brain repo**: `bash .claude/hooks/brain-sync.sh --force`, then
   verify with `git ls-remote --heads <BRAIN_REMOTE_URL> main`.
8. **Run the harness**: `bash .claude/hooks/brain-harness-test.sh` must end
   `FAIL: 0`.
9. Run the live acceptance tests (section 12) and record the ground rules in
   the project's `CLAUDE.md` (only the curators write to `brain/`; sessions
   must not hand-edit it; where the canonical store lives).

## 11. Operations & troubleshooting

Everything observable lives in the machine-global dir, and every session start
prints a one-line **health footer** (journal backlog, age of the last curator
run, last pipeline event, a backlog warning), so a wedged pipeline is visible
without digging. Every hook exits 0 by design, so without that footer a dead
pipeline would freeze memory silently.

- `hook.log`: elections, completions, refreshes, guard skips. Healthy rhythm:
  `elected curator runner (batch=N..M)` followed by `curator completed:
  drained ...`.
- `runs.jsonl`: one structured row per curator run (`rc`, `knowledge_rc`,
  batch range, changed turns, duration). Regressions like "every run times
  out" or "runs never create nodes" become a one-liner to spot.
- `curator.log`: both curators' own output; `sync.log`: git/push detail.
- Backlog size = `journal.jsonl` lines minus `journal.cursor`.
- `bash .claude/hooks/brain-check.sh`: mechanical store-integrity check.
- `ps -eo pid,etime,command | grep 'agent .*-curator'` must show at most 1.

Manual operations: force a publish with
`bash .claude/hooks/brain-sync.sh --force`; rebuild a cache by deleting
`brain/index.json` and running `brain-hydrate.sh`; ask for memory work in any
session by delegating to the brain-curator ("remember that...", "what do we
know about...", "run a hygiene pass").

## 12. Verification

- **Isolated harness** (`hooks/brain-harness-test.sh`): a scratch app repo
  with a local bare origin, a local bare brain remote, a scratch
  `XDG_CACHE_HOME`, and a stub `claude` CLI. Nothing touches real repos,
  remotes, or the real cache. Assertions cover: no-CLI degradation, 10-way
  concurrent election producing exactly one runner, publish-on-clean-run +
  cursor advance + run ledger, curator env sanitization (autosync off inside
  the curator process; an agent-invoked flush is a no-op), failure holding the
  cursor with no publish, timeout-killing a TERM-immune curator within budget,
  the watchdog TERM-to-KILL fallback, the 40-line batch cap and remainder
  drain, the inert-slice cursor hop with no API spend, the app-repo branch
  refusal, additive union, gutted/torn publish guards, an app-git corruption
  loop (checkout/reset under concurrent syncs), and version pinning (a
  worktree-elected runner must execute its own hooks, never the primary
  checkout's older copies).
- **Live acceptance:** with other sessions paused, one real curator run
  completes (exit 0), updates the store, advances the brain repo, and advances
  the cursor; `git checkout`/`reset` in the app repo never errors during a
  sync; a session with no `claude` CLI still journals and injects.

## 13. Exclusion list: what is NOT a memory

- **Secrets**: API keys, tokens, credentials, anything `.gitignore` protects.
  Never written anywhere under `brain/`.
- **<PROJECT_EXCLUSIONS>**: any domain-sensitive content the project must not
  store (regulated, medical, personal, etc.). Store the *decision* it drove,
  never the sensitive content itself.
- Transient chatter, tool mechanics, restating code/docs verbatim, or
  speculation dressed as fact. When unsure, prefer a small honest node marked
  `confidence: low`.

## 14. Design history: why v2 looks like this

Every guard above was paid for. The origin project (a solo-owner iOS app with
up to 6 parallel Claude Code sessions) went through these, in order:

1. **The curator storm.** v1 spawned a curator per turn, per session. With ~5
   parallel sessions, up to 6 curators ran concurrently, API contention made
   each blow its kill timer, and since publishing gated on a clean exit,
   memory never actually updated. Fix: the machine-global journal, leader
   election, debounce, and single batched runner (section 6.1).
2. **Digest ping-pong.** Per-turn autosync from N divergent worktree caches
   made each stale cache republish its own digest over the others',
   last-writer-wins, visibly flapping on the remote. Fix: only the elected
   runner's flush publishes (section 6.2).
3. **Store tracked in the app repo.** The store originally lived on a branch
   of the app repo, hidden on feature branches via `--skip-worktree`. That
   intermittently corrupted foreground git (`checkout`/`reset` refusing to
   run) and, because the app repo was public, briefly exposed the owner
   profile. Fix: gitignored local cache + dedicated private repo + isolated
   sync clone (section 5), and the `repair` hook for retrofits.
4. **The publish-to-main incident.** During a v1/v2 coexistence window, an old
   sync script inherited a `BRANCH=main` value from a newer session's
   environment and pushed the entire store to the public app repo's `main`.
   Fixes, all regression-tested in the harness: the branch override is never
   set in settings (the lib defaults it), the sync refuses app-repo code
   branches outright, and the curator process runs with a sanitized env so an
   agent-invoked publish is a structural no-op.
5. **Version pinning.** A detached runner that `cd`s into the primary checkout
   once re-resolved a relative hooks path against the primary and silently
   executed the primary's older hook versions. Fix: `HOOK_DIR` is always
   computed absolute (`cd ... && pwd`), with a dedicated harness regression
   test.

If you change the pipeline, keep the harness green and add a regression test
for whatever you learned. That is how this spec stayed trustworthy.

# Universal Project Memory System — Technical Specification and Architecture Decision Records

**Status:** Proposed reference implementation
**Version:** 1.0
**Date:** 2026-08-18

---

## 1. Executive Architecture Decision

Implement the memory system as a **Git-native canonical knowledge layer plus a local, rebuildable retrieval/control plane**.

The reference architecture is:

```text
                         AI AGENTS
                   Claude Code / Codex
                           │
                           ▼
                  Project Entry Points
                 CLAUDE.md / AGENTS.md
                           │
                           ▼
                    Bootstrap Context
        SOUL + PROJECT + CURRENT + RECENT + MAP
                           │
                           ▼
                   Memory Tool Interface
                CLI and/or local MCP server
                           │
          ┌────────────────┼─────────────────┐
          ▼                ▼                 ▼
       Specs API        Memory API       Session API
          │                │                 │
          └────────────────┼─────────────────┘
                           ▼
                   Local Retrieval Layer
                 SQLite + FTS5 + vectors
                   + metadata + RRF
                           │
          ┌────────────────┼─────────────────┐
          ▼                ▼                 ▼
       specs/            memory/          sessions/
       canonical         canonical        evidence
          │                │                 │
          └────────────────┴─────────────────┘
                           │
                           ▼
                           Git
                 (policy-controlled scope)
```

### Core decision

- **Markdown/YAML files are canonical.**
- **Git is the audit/history layer for committed canonical data.**
- **SQLite is derived and rebuildable.**
- **FTS5 + local semantic embeddings are fused for hybrid retrieval.**
- **Raw transcripts are a fallback evidence tier, not canonical memory.**
- **LLM-generated summaries are derived and never silently replace evidence.**
- **The memory API is provider-independent.**
- **memsearch, Hindsight, Mem0, or future systems may be adapters/backends, but none defines the project's information model.**

---

# 2. Goals

The implementation must:

1. provide deterministic startup orientation to Claude Code and Codex;
2. preserve a stable `SOUL.md` identity file;
3. keep root agent instructions small;
4. keep detailed rules out of the always-loaded root files;
5. maintain a project map and compact current/recent context;
6. distinguish specs from historical memory;
7. store durable facts, ADRs, meaningful events, entities, relationships, and patterns;
8. preserve provenance and epistemic status;
9. support ADD, NOOP, CORRECT, SUPERSEDE, RETIRE, DELETE;
10. provide hybrid keyword + semantic search;
11. support a progressive retrieval ladder ending in transcript search;
12. avoid storing routine agent telemetry;
13. keep the system local-first and provider-replaceable;
14. support software and health repositories using the same core architecture.

---

# 3. Non-Goals

The reference implementation does not aim to:

- store every agent tool call as durable memory;
- build a fully autonomous graph-memory system in v1;
- make an LLM-generated database the source of truth;
- preload the entire historical memory base at startup;
- force all session transcripts into Git;
- automatically rewrite canonical records during reflection;
- require a cloud vector database;
- depend on a single AI vendor.

---

# 4. Repository Layout

Recommended layout:

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
│   ├── testing.md
│   ├── research.md
│   ├── security.md
│   └── health-symptom-reasoning.md   # health projects only
│
├── context/
│   ├── PROJECT.md
│   ├── CURRENT.md
│   ├── RECENT.md
│   ├── MAP.md
│   └── PROFILE.md                    # optional domain/user startup hints
│
├── specs/
│   ├── requirements/
│   ├── architecture/
│   ├── interfaces/
│   ├── roadmap/
│   └── schemas/
│
├── memory/
│   ├── README.md
│   ├── facts/
│   ├── decisions/
│   ├── events/
│   ├── entities/
│   ├── relationships/
│   ├── patterns/
│   ├── sources/
│   └── views/
│
├── procedures/
│   └── ...
│
├── sessions/
│   ├── summaries/
│   └── transcripts/
│
├── .memory-system/
│   ├── config.toml
│   ├── index.sqlite
│   ├── locks/
│   └── cache/
│
├── src/
└── tests/
```

### Git policy

Default recommendations:

| Path | Git default |
|---|---|
| `AGENTS.md`, `CLAUDE.md`, `SOUL.md` | Commit |
| `rules/`, `context/PROJECT.md`, `context/MAP.md` | Commit |
| `specs/` | Commit |
| `memory/` canonical records | Commit unless sensitivity policy says otherwise |
| `context/CURRENT.md`, `context/RECENT.md` | Configurable; often commit for solo projects, local-only for noisy teams |
| `sessions/summaries/` | Configurable |
| `sessions/transcripts/` | **Git-ignore by default** |
| `.memory-system/index.sqlite` | **Git-ignore** |
| `.memory-system/cache/` | **Git-ignore** |

For a private health repository, canonical health records may be committed to a private encrypted/controlled Git remote or kept local according to the user's privacy policy.

---

# 5. Agent Bootstrap Design

## 5.1 Bootstrap payload

Every agent session should receive:

```text
1. AGENT OPERATING CONTRACT
2. SOUL
3. PROJECT IDENTITY + GOALS
4. CURRENT STATE
5. RECENT SESSION SYNOPSIS
6. PROJECT MAP
7. MEMORY / RETRIEVAL PROTOCOL
8. AVAILABLE MEMORY TOOLS
9. OPTIONAL HIGH-RELEVANCE PROFILE POINTERS
```

Everything else is retrieved.

---

## 5.2 Claude Code integration

Reference implementation:

`CLAUDE.md` stays thin and imports or instructs loading the shared files.

Suggested form:

```markdown
# Claude Project Entry Point

@AGENTS.md
@SOUL.md
@context/PROJECT.md
@context/CURRENT.md
@context/RECENT.md
@context/MAP.md
@context/PROFILE.md
```

If optional files do not exist, the generator SHOULD omit their imports.

Detailed rule files are **not** imported globally; `AGENTS.md` tells Claude which rule files to read when a task triggers them.

### Rationale

Claude Code supports project `CLAUDE.md` memory and file imports, allowing the bootstrap fragments to remain separate sources of truth rather than duplicated prose.

---

## 5.3 Codex integration

`AGENTS.md` is the vendor-neutral root contract and is available to Codex as project instructions.

It must include a mandatory startup directive:

```text
Before substantive work, read:
- SOUL.md
- context/PROJECT.md
- context/CURRENT.md
- context/RECENT.md
- context/MAP.md
- context/PROFILE.md if present
```

### Optional deterministic wrapper

For stronger enforcement, provide:

```bash
memory-agent start codex
```

which:

1. runs `memory bootstrap --format=markdown`;
2. validates bootstrap files;
3. starts Codex with the bootstrap content available through the configured project instructions/start prompt.

The core architecture does not depend on this wrapper, but it improves deterministic startup behavior.

---

# 6. Root Instruction Design

## 6.1 `AGENTS.md`

`AGENTS.md` is intentionally concise.

It contains:

- mandatory startup reads;
- the information hierarchy;
- the progressive retrieval ladder;
- memory write classification rules;
- prohibition against invented history;
- rule-loader table;
- memory tool names;
- concise build/test commands if universally relevant.

It does **not** contain:

- complete coding standards;
- every security rule;
- full project history;
- all ADRs;
- detailed health reasoning rules;
- giant architectural documentation.

---

## 6.2 `SOUL.md`

`SOUL.md` is stable, small, and mandatory.

It defines the agent's persistent purpose and epistemic posture.

Example invariant:

> You are a persistent collaborator, not the owner of truth. Search before assuming history. Preserve evidence. Do not promote inference into fact.

---

## 6.3 `rules/`

Rules are task-triggered.

`rules/README.md` contains a routing table such as:

| Trigger | Rule file |
|---|---|
| creating/updating memory | `rules/memory.md` |
| changing specs/requirements | `rules/specs.md` |
| security-sensitive work | `rules/security.md` |
| research | `rules/research.md` |
| health symptom reasoning | `rules/health-symptom-reasoning.md` |

---

# 7. Context Document Design

## 7.1 `context/PROJECT.md`

Canonical-ish orientation document containing:

- project ID;
- purpose;
- target users/domain;
- technologies;
- lifecycle phase;
- primary objectives;
- major constraints;
- concise roadmap projection.

This file is manually curated or generated from canonical specs with human review.

---

## 7.2 `context/CURRENT.md`

Derived working-state document.

Recommended front matter:

```yaml
---
generated: true
generated_at: 2026-08-18T12:00:00-04:00
sources:
  - git
  - recent-session
  - active-events
---
```

Contents:

- current focus;
- active work;
- blockers;
- recently completed meaningful state changes;
- next likely actions.

It must never be the sole source for an ADR or durable fact.

---

## 7.3 `context/RECENT.md`

Derived handoff memory containing the smallest useful recent window.

It may be regenerated after each meaningful session.

It SHOULD favor:

- decisions made;
- unresolved questions;
- significant findings;
- meaningful failed approaches;
- next-step handoff.

It SHOULD omit routine tool calls and implementation telemetry.

---

## 7.4 `context/MAP.md`

Generated or maintained semantic directory map.

The generator should enumerate meaningful paths and their role, not every file.

Example source config:

```toml
[map]
include = ["src", "tests", "specs", "memory", "rules", "context", "procedures"]
max_depth = 3
ignore = [".git", "node_modules", ".build", "DerivedData"]
```

---

## 7.5 `context/PROFILE.md`

Optional derived startup hints for persistent high-relevance context.

Example health use:

```markdown
- The user reports a strong variable relationship between symptom-focused
  fear/hypervigilance and perceived symptom intensity. Treat as context,
  never as grounds to dismiss a symptom.
  [memory:pattern-symptom-attention-amplification]
```

The full pattern remains in canonical memory.

---

# 8. Canonical Data Model

All canonical records use Markdown with YAML front matter.

## 8.1 Shared base fields

```yaml
---
id: <stable-id>
project_id: <project-id>
type: <record-type>
status: active
created_at: <timestamp>
effective_at: <timestamp-or-date>

entities: []
tags: []

source:
  type: <source-type>

provenance: {}

epistemic_status: <status>

supersedes: null
superseded_by: null
related_specs: []
related_memories: []
---
```

### Required fields

At minimum:

- `id`;
- `project_id`;
- `type`;
- `status`;
- `created_at`;
- source/provenance sufficient for the record class.

---

## 8.2 Record types

### `fact`

Durable factual/contextual knowledge.

### `decision`

ADR/project decision with rationale.

Recommended additional fields:

```yaml
decision_state: accepted
alternatives: []
consequences: []
```

### `event`

Dated meaningful state change.

Recommended fields:

```yaml
occurred_at: <timestamp>
event_type: <domain-event-type>
```

### `entity`

Stable identity/metadata.

### `relationship`

Explicit edge between stable IDs.

```yaml
subject: entity:left-elbow
predicate: related_to
object: procedure:left-ulnar-nerve-transposition
epistemic_status: documented
```

### `pattern`

Recurring contextual pattern.

Recommended fields:

```yaml
importance: high
startup_relevance: high
applies_to: []
first_recorded_at: <timestamp>
last_reviewed_at: <timestamp>
```

---

# 9. Provenance Model

Use an enumerated source type.

Initial values:

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

Example:

```yaml
source:
  type: user_statement

provenance:
  session_id: claude-2026-08-18-abc
  turn_id: turn-42
  transcript_path: sessions/transcripts/claude-2026-08-18-abc.jsonl
```

Document source:

```yaml
source:
  type: medical_document

provenance:
  source_id: doc-lumbar-mri-2024-03-14
  path: memory/sources/imaging/lumbar-mri-2024-03-14.pdf
  page: 2
```

---

# 10. Epistemic Model

Initial statuses:

```text
reported
observed
documented
diagnosed
approved
inferred
suspected
generated
unknown
```

Rules:

1. source type and epistemic status are separate fields;
2. agent inference must identify evidence IDs;
3. summaries use `generated`;
4. health user observations use `reported` unless documented otherwise;
5. retrieval must never silently rewrite epistemic status.

---

# 11. Lifecycle Model

Statuses:

```text
candidate
active
superseded
retired
rejected
deleted
```

Transitions:

```text
candidate → active
active → superseded
active → retired
active → deleted
candidate → rejected
```

## 11.1 Supersession transaction

`memory_supersede(old_id, new_record)` performs atomically at logical level:

1. load old record;
2. validate old is active;
3. create new record with `supersedes: old_id`;
4. set old `status: superseded`;
5. set old `superseded_by: new_id`;
6. update Git/files;
7. update index;
8. return both IDs.

Historical content is not deleted.

---

# 12. SQLite Derived Index

The index lives at:

```text
.memory-system/index.sqlite
```

It is rebuildable from canonical files plus session evidence.

SQLite is the **control plane and retrieval catalog**, not the source of truth.

---

## 12.1 Suggested tables

```sql
CREATE TABLE files (
  path TEXT PRIMARY KEY,
  content_hash TEXT NOT NULL,
  mtime_ns INTEGER,
  source_class TEXT NOT NULL,
  indexed_at TEXT NOT NULL
);

CREATE TABLE records (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  epistemic_status TEXT,
  source_type TEXT,
  title TEXT,
  path TEXT NOT NULL,
  effective_at TEXT,
  created_at TEXT,
  startup_relevance TEXT,
  body TEXT NOT NULL,
  metadata_json TEXT NOT NULL
);

CREATE TABLE entities (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT,
  name TEXT,
  path TEXT
);

CREATE TABLE record_entities (
  record_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  PRIMARY KEY (record_id, entity_id)
);

CREATE TABLE relationships (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object_id TEXT NOT NULL,
  epistemic_status TEXT,
  source_record_id TEXT
);

CREATE TABLE lifecycle_links (
  record_id TEXT NOT NULL,
  relation TEXT NOT NULL,
  target_id TEXT NOT NULL,
  PRIMARY KEY (record_id, relation, target_id)
);

CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  agent TEXT,
  started_at TEXT,
  ended_at TEXT,
  summary_path TEXT,
  transcript_path TEXT
);

CREATE TABLE chunks (
  chunk_id TEXT PRIMARY KEY,
  record_id TEXT,
  path TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  token_count INTEGER,
  start_line INTEGER,
  end_line INTEGER
);
```

---

## 12.2 FTS5

Create FTS tables for records/chunks/session summaries/transcripts.

Example:

```sql
CREATE VIRTUAL TABLE chunk_fts USING fts5(
  chunk_id UNINDEXED,
  text,
  tokenize='unicode61'
);
```

Metadata filters are applied through joins to `records`/`sessions`.

---

# 13. Semantic Retrieval

## 13.1 Default

Use a **local embedding model** by default for sensitive/local-first deployments.

The exact model is configurable and pinned in `.memory-system/config.toml`.

Example:

```toml
[embeddings]
provider = "local"
model = "<pinned-local-model>"
dimensions = 768
```

Avoid making model identity part of canonical memory.

Changing the embedding model requires re-embedding, not rewriting canonical records.

---

## 13.2 Vector storage

Two acceptable implementations:

### Option A — SQLite vector extension

Keep vectors beside the catalog for a single-file local system.

### Option B — Search-backend adapter

Use memsearch/Milvus or another vector backend behind the same `SearchProvider` interface.

The reference system SHOULD support both, with SQLite FTS5 remaining available regardless.

---

# 14. Hybrid Ranking

Hybrid retrieval pipeline:

```text
query
  │
  ├── FTS5/BM25 search
  │
  └── vector similarity search
          │
          ▼
       rank lists
          │
          ▼
   Reciprocal Rank Fusion
          │
          ▼
     metadata boosts
          │
          ▼
      top-k results
```

Use Reciprocal Rank Fusion conceptually:

```text
score(d) = Σ 1 / (k + rank_i(d))
```

with a configurable `k`.

Optional deterministic boosts may include:

- active over superseded when current state is requested;
- exact entity match;
- exact ID/title match;
- relevant date window;
- higher source authority for specific query classes.

The retrieval engine must **not** let authority boosts erase conflicting evidence; they affect ranking only.

---

# 15. Chunking

Chunk canonical Markdown by semantic section, preferring headings and record boundaries.

Rules:

1. one atomic memory record is normally indexed as one primary record;
2. large source docs/specs may be chunked by heading;
3. chunks retain path/line provenance;
4. search result links back to canonical record/source;
5. embeddings index chunks, not a rewritten summary of the canonical record.

---

# 16. Retrieval API

Expose through local CLI and optionally MCP.

## 16.1 `memory_search`

```json
{
  "query": "why are refresh tokens device local",
  "project_id": "atlas-ios",
  "types": ["decision", "fact"],
  "entities": ["authentication"],
  "status": ["active", "superseded"],
  "start_date": null,
  "end_date": null,
  "limit": 8
}
```

Returns:

```json
{
  "results": [
    {
      "id": "adr-auth-004",
      "type": "decision",
      "status": "active",
      "path": "memory/decisions/adr-auth-004.md",
      "snippet": "...",
      "score": 0.91,
      "source_type": "user_approved_decision"
    }
  ]
}
```

Search returns snippets, not generated conclusions.

---

## 16.2 `memory_get`

Returns the full canonical record plus parsed metadata.

---

## 16.3 `memory_sources`

Returns provenance links and original source locations.

---

## 16.4 `memory_timeline`

Input:

```json
{
  "entity_id": "body-site:left-elbow",
  "start": "2026-01-01",
  "end": "2026-12-31",
  "types": ["event", "pattern", "fact"]
}
```

Returns chronologically ordered canonical record references.

---

## 16.5 `memory_related`

Uses explicit entity/relationship links first, with optional semantic expansion.

---

## 16.6 Write APIs

- `memory_add`
- `memory_correct`
- `memory_supersede`
- `memory_retire`
- `memory_delete`

All writes run schema validation and duplicate/history checks.

---

## 16.7 Spec APIs

- `spec_search`
- `spec_get`

Specs use the same index but remain a separate `source_class` and directory.

---

## 16.8 Transcript API

`transcript_search` searches session evidence only.

It should return:

- session ID;
- time;
- agent;
- matching excerpt;
- transcript path/location.

---

# 17. Progressive Retrieval Orchestrator

Implement a deterministic orchestration policy exposed to agents in `rules/memory.md`.

Pseudo-code:

```python
def retrieve(query, intent, known_id=None, entity=None):
    if bootstrap_context_answers(query):
        return bootstrap_answer_candidate()

    if known_id:
        result = direct_get(known_id)
        if result:
            return result

    curated = hybrid_curated_search(query, intent, entity)
    if sufficient(curated):
        return curated

    expanded = expand_temporal_relationships(curated, entity)
    if sufficient(expanded):
        return expanded

    sessions = search_session_summaries(query)
    if sufficient(sessions):
        return sessions

    transcripts = search_transcripts(query)
    if sufficient(transcripts):
        return transcripts

    return RetrievalFailure(
        searched=["curated", "relationships", "session summaries", "transcripts"]
    )
```

The LLM decides semantic sufficiency, but search tier order and result classes remain explicit.

---

# 18. Write Orchestrator

Pseudo-code:

```python
def classify_new_information(info):
    if is_normative_requirement(info):
        return "spec"
    if is_agent_rule(info):
        return "rule"
    if is_repeatable_procedure(info):
        return "procedure"
    if is_transient_work_state(info):
        return "current_or_session"
    if not is_durable(info):
        return "noop"
    return classify_memory_type(info)
```

Canonical-memory write flow:

```text
information
   ↓
classify destination
   ↓
resolve entities
   ↓
identify provenance
   ↓
search related existing records
   ↓
choose ADD / CORRECT / SUPERSEDE / RETIRE / NOOP
   ↓
render canonical Markdown from schema
   ↓
validate
   ↓
write atomically
   ↓
index changed file
```

---

# 19. Schema Validation

Store JSON Schema or equivalent under:

```text
.memory-system/schemas/
```

Examples:

- `memory-base.schema.json`;
- `decision.schema.json`;
- `event.schema.json`;
- `pattern.schema.json`;
- `entity.schema.json`.

Validation occurs before committing a write.

The LLM can draft content; deterministic code validates structure.

---

# 20. File Naming and IDs

IDs must be stable and independent of file paths.

Recommended ID patterns:

```text
fact-<slug>-<shortid>
adr-<domain>-<nnn>
evt-YYYYMMDD-<shortid>
entity:<namespace>:<slug>
pattern-<slug>
rel-<shortid>
```

Examples:

```text
adr-auth-004
evt-20260818-a7c3
entity:body-site:left-elbow
pattern-symptom-attention-amplification
```

File names SHOULD include the stable ID or human-readable slug.

---

# 21. Session Capture

## 21.1 Raw transcript policy

Adapters for Claude Code and Codex capture session transcript evidence when technically available.

Raw transcripts default to:

```text
sessions/transcripts/<agent>/<YYYY>/<session-id>.jsonl
```

or a provider-native source referenced by metadata.

They are Git-ignored by default.

---

## 21.2 Session summaries

At session end or meaningful checkpoints, generate a concise summary containing only:

- objective;
- meaningful findings;
- decisions made;
- unresolved issues;
- meaningful failed approaches;
- next-step handoff;
- candidate durable memories.

Do **not** include routine tool-call logs.

Summary path:

```text
sessions/summaries/YYYY-MM-DD-<session-id>.md
```

Front matter:

```yaml
---
generated: true
source_type: agent_summary
session_id: <id>
agent: claude-code
started_at: ...
ended_at: ...
---
```

---

# 22. `CURRENT.md` and `RECENT.md` Refresh

Provide command:

```bash
memory refresh-context
```

It may use:

- recent session summaries;
- active Git branch/diff metadata;
- recent canonical events;
- active project tasks if integrated;
- explicit handoff notes.

Rules:

1. output is marked generated;
2. output never modifies canonical memories;
3. agent-generated prose is kept concise;
4. every refresh overwrites/rebuilds derived view rather than accumulating narrative sediment.

---

# 23. Project Map Generation

Provide:

```bash
memory map rebuild
```

The map generator:

1. walks configured directories;
2. applies ignore rules;
3. recognizes conventional paths;
4. optionally reads directory README files;
5. writes a compact semantic map;
6. avoids listing thousands of files.

---

# 24. Indexing Pipeline

Provide daemon/watch mode:

```bash
memory index --watch
```

Pipeline:

```text
file event
   ↓
debounce
   ↓
content hash
   ↓
if unchanged → NOOP
   ↓
parse Markdown/YAML
   ↓
validate source class
   ↓
upsert metadata/record
   ↓
update FTS
   ↓
chunk if needed
   ↓
embed changed chunks only
   ↓
commit DB transaction
```

The file content remains authoritative.

---

# 25. Rebuild

Provide:

```bash
memory index rebuild
```

Rebuild process:

1. create new temporary SQLite database;
2. scan canonical paths and configured session evidence;
3. validate records;
4. rebuild metadata and FTS;
5. rebuild embeddings;
6. run integrity checks;
7. atomically replace old DB.

A corrupted index must never require reconstructing canonical knowledge from the database.

---

# 26. memsearch Integration Strategy

memsearch is treated as an optional retrieval provider rather than the owner of the project model.

Interface:

```python
class SearchProvider(Protocol):
    def index(paths): ...
    def search(query, filters, limit): ...
    def expand(result): ...
```

Potential providers:

```text
SQLiteHybridProvider   # reference implementation
MemsearchProvider      # adapter
HindsightProvider      # future richer adapter
```

### Why not couple the architecture directly to memsearch?

Because the project requires behavior beyond generic search:

- spec vs memory separation;
- strict provenance;
- epistemic statuses;
- lifecycle semantics;
- health patterns;
- custom startup relevance;
- explicit transcript tier;
- provider-independent write rules.

memsearch remains valuable for Markdown-first hybrid retrieval and can accelerate/prototype the search layer.

---

# 27. Health Knowledge Base Extension

The same core engine is used with health-specific schemas and rules.

## 27.1 Directory extension

```text
memory/
├── entities/
├── facts/
├── events/
├── patterns/
├── conditions/
├── procedures/
├── treatments/
├── relationships/
└── sources/
```

---

## 27.2 Symptom event

```yaml
---
id: evt-20260818-elbow-pain-01
project_id: personal-health
type: event
event_type: symptom_observation
status: active
created_at: 2026-08-18T12:05:00-04:00
occurred_at: 2026-08-18T11:50:00-04:00

entities:
  - entity:body-site:left-elbow

source:
  type: user_statement

epistemic_status: reported
---
```

Body records only what the user actually reported, separating interpretation.

---

## 27.3 Contextual pattern

```yaml
---
id: pattern-symptom-attention-amplification
project_id: personal-health
type: pattern
status: active
importance: high
startup_relevance: high
created_at: 2026-08-18T12:00:00-04:00

entities:
  - entity:context:anxiety-hypervigilance
  - entity:context:symptom-perception

source:
  type: user_statement

epistemic_status: reported
---
```

The rule for using this pattern lives separately in:

```text
rules/health-symptom-reasoning.md
```

The pattern is never automatically converted into diagnosis or cause.

---

# 28. Privacy Architecture

Configuration:

```toml
[privacy]
commit_canonical_memory = true
commit_session_summaries = false
commit_transcripts = false
external_embeddings = false
external_summarization = "agent-session-only"
```

Sensitive projects can set all retrieval/embedding operations local.

The system SHOULD expose:

```bash
memory privacy audit
```

which reports:

- files that leave the machine under current config;
- remote embedding/summarization providers;
- Git-tracked sensitive paths;
- transcript retention policy.

---

# 29. Concurrency and Atomic Writes

Use file locks under:

```text
.memory-system/locks/
```

Canonical write sequence:

1. acquire project write lock;
2. re-read target/current record;
3. validate no conflicting edit;
4. write temp file;
5. fsync/rename atomically;
6. release lock;
7. update index.

Git itself is not used as the lock manager.

---

# 30. Git Integration

Optional command:

```bash
memory diff
```

shows only memory/spec/context changes.

Optional commit helper:

```bash
memory commit -m "Record auth token storage decision"
```

The system SHOULD favor small diffs.

It MUST NOT auto-commit unless explicitly configured.

---

# 31. Testing Strategy

## 31.1 Unit tests

- YAML/front-matter parsing;
- schema validation;
- lifecycle transitions;
- RRF fusion;
- metadata filters;
- ID collision handling;
- source/provenance validation;
- project-scope enforcement.

## 31.2 Retrieval tests

Create a golden corpus with questions where:

- keywords match exactly;
- wording differs semantically;
- active and superseded records coexist;
- multiple projects contain similar terms;
- transcript fallback is required.

Assert correct top-k record IDs.

## 31.3 Write tests

Test classification examples:

| Input | Expected destination |
|---|---|
| “Feature must support Face ID” | spec |
| “We chose Keychain because…” | decision memory |
| “Migration completed today” | event memory |
| “Ran tests and 2 failed” | NOOP/session only |
| “My elbow pain increased today” | health event |
| “I tend to hyperfixate on body sensations” | health pattern |

## 31.4 Drift tests

Repeated summary/regeneration cycles MUST NOT modify canonical source text.

## 31.5 Recovery tests

Delete `index.sqlite`, run rebuild, and assert identical canonical retrieval results within ranking tolerance.

---

# 32. Observability

Provide:

```bash
memory doctor
```

Checks:

- schema-invalid records;
- broken IDs/links;
- orphaned entities;
- missing source paths;
- stale index hashes;
- embedding-model mismatch;
- missing startup files;
- oversized startup context;
- project-scope anomalies.

Provide:

```bash
memory explain-search "query"
```

Output:

- FTS rank;
- vector rank;
- fusion rank;
- applied filters/boosts;
- chosen result IDs.

This makes retrieval debuggable rather than magical.

---

# 33. Suggested CLI

```text
memory init
memory bootstrap
memory doctor
memory map rebuild
memory refresh-context
memory index
memory index --watch
memory index rebuild
memory search
memory get
memory add
memory supersede
memory retire
memory timeline
memory related
memory sources
memory transcript-search
memory privacy audit
```

The MCP server exposes equivalent operations to agents.

---

# 34. Implementation Phases

## Phase 1 — Canonical structure and deterministic bootstrap

Build:

- repository layout;
- schemas;
- `AGENTS.md` template;
- `CLAUDE.md` template/imports;
- `SOUL.md`;
- context files;
- CLI initialization;
- Markdown parser/validator.

No semantic retrieval required yet.

## Phase 2 — SQLite metadata + FTS5

Build:

- index database;
- file watcher;
- FTS5;
- metadata filters;
- exact/entity/timeline retrieval;
- rebuild/doctor.

## Phase 3 — Local semantic retrieval

Add:

- embeddings;
- vector backend;
- RRF fusion;
- evaluation corpus.

## Phase 4 — Session evidence

Add:

- Claude/Codex session adapters;
- summaries;
- transcript indexing;
- `RECENT.md` refresh.

## Phase 5 — MCP interface

Expose the stable tool contract to Claude/Codex and future agents.

## Phase 6 — Optional provider adapters

Evaluate:

- memsearch adapter;
- Hindsight adapter;
- alternative embedding/search engines.

Only adopt a richer provider if measured retrieval/maintenance value exceeds added complexity.

---

# 35. Architecture Decision Records

## ADR-001 — Canonical knowledge is Markdown/YAML in the repository

**Status:** Accepted

### Context

Long-lived agent memory risks semantic drift when an LLM-produced database becomes the only representation of prior facts.

### Decision

Store canonical specs and durable memory in human-readable Markdown with structured YAML metadata.

### Consequences

**Positive:**

- inspectable;
- Git-friendly;
- portable;
- easy to diff;
- provider-independent;
- recoverable without specialized database software.

**Negative:**

- requires indexing for fast retrieval at scale;
- schemas must be enforced by tooling.

---

## ADR-002 — Git provides audit history, not search

**Status:** Accepted

### Decision

Use Git for revision history, review, rollback, and synchronization where privacy permits.

Do not use Git as the primary search/index engine.

---

## ADR-003 — SQLite is derived, local, and rebuildable

**Status:** Accepted

### Context

Scanning a large Markdown corpus on every user query becomes slow.

### Decision

Use local SQLite for metadata, entity links, lifecycle links, FTS5, session catalog, and optionally vectors.

The DB is disposable and rebuildable.

### Consequence

Database corruption cannot destroy canonical knowledge.

---

## ADR-004 — Retrieval is hybrid lexical + semantic

**Status:** Accepted

### Decision

Use FTS5/BM25-style keyword ranking and semantic vector similarity, fused using RRF or equivalent rank fusion.

### Rationale

- keyword search preserves precision for IDs/names/exact terms;
- semantic search handles paraphrases;
- fusion reduces failure modes of either approach alone.

---

## ADR-005 — The architecture owns the memory contract; providers are adapters

**Status:** Accepted

### Decision

Do not let memsearch, Hindsight, Mem0, or any other provider define the canonical schema or lifecycle semantics.

Expose a stable internal tool/interface contract.

### Consequence

Providers may be replaced without migrating the meaning of the repository.

---

## ADR-006 — Specs and memory are separate information systems

**Status:** Accepted

### Decision

`specs/` stores normative current intent. `memory/` stores historical/contextual knowledge and rationale.

### Example

- spec: “refresh tokens must use secure credential storage”;
- ADR: why Keychain was selected and what it replaced.

---

## ADR-007 — SOUL is a first-class startup artifact

**Status:** Accepted

### Decision

Every project has `SOUL.md`, read at every session startup.

SOUL contains identity/role/epistemic posture, not project history or transient tasks.

---

## ADR-008 — Root agent files stay small; detailed rules are lazy-loaded

**Status:** Accepted

### Decision

`AGENTS.md`/`CLAUDE.md` contain only universal startup/operating guidance.

Detailed rules live under `rules/` and are loaded based on task triggers.

### Rationale

Reduces context pollution and instruction drift.

---

## ADR-009 — Current and recent context are generated views

**Status:** Accepted

### Decision

`CURRENT.md` and `RECENT.md` may be AI-generated but are explicitly derived and replaceable.

They never become the only evidence for a historical fact.

---

## ADR-010 — Session transcripts are fallback evidence, not canonical memory

**Status:** Accepted

### Decision

Search curated memory first, then session summaries, then raw transcripts.

Transcripts are normally local and Git-ignored.

---

## ADR-011 — Do not store routine agent telemetry as durable memory

**Status:** Accepted

### Decision

Tool calls, file opens, ordinary compiler errors, routine edits, and test runs are not durable project events.

Only meaningful project/domain state changes are promoted.

---

## ADR-012 — Preserve history through supersession/retirement

**Status:** Accepted

### Decision

Changing facts/decisions use explicit supersession or retirement rather than destructive overwrite/deletion.

### Rationale

Allows historical timeline reconstruction and avoids loss of rationale.

---

## ADR-013 — Generated summaries are navigation aids, not evidence

**Status:** Accepted

### Decision

AI-generated digests, summaries, and current-state views may guide search but must trace back to canonical records or transcripts for consequential historical claims.

---

## ADR-014 — Health contextual patterns are first-class memory, not rules or diagnoses

**Status:** Accepted

### Decision

Recurring user-reported health patterns are stored under `memory/patterns/` with explicit epistemic status.

The agent behavior for applying them lives under `rules/`.

### Rationale

Preserves important longitudinal context without turning self-observation into diagnostic truth.

---

## ADR-015 — Sensitive projects default to local-first retrieval

**Status:** Accepted

### Decision

Canonical storage and retrieval index are local by default. Embeddings should be local by default for sensitive repositories.

Remote processing is explicit configuration.

---

## ADR-016 — Search must fail honestly

**Status:** Accepted

### Decision

After curated memory, relationship expansion, session summaries, and transcript search are exhausted, the agent reports that reliable evidence was not found rather than inventing history.

---

# 36. Reference Configuration

Example `.memory-system/config.toml`:

```toml
project_id = "atlas-ios"

[paths]
specs = "specs"
memory = "memory"
rules = "rules"
context = "context"
procedures = "procedures"
sessions = "sessions"

[index]
database = ".memory-system/index.sqlite"
watch = true

[search]
provider = "sqlite-hybrid"
rrf_k = 60
default_limit = 8

[embeddings]
provider = "local"
model = "<pinned-local-model>"

[sessions]
capture = true
summaries = true
transcripts = true
commit_summaries = false
commit_transcripts = false

[bootstrap]
max_chars = 24000
include_profile = true

[privacy]
external_embeddings = false
commit_canonical_memory = true
```

---

# 37. Definition of Done for v1

The reference implementation is considered usable when:

1. `memory init` creates the standard project structure;
2. Claude and Codex are both instructed/oriented correctly at startup;
3. `SOUL.md` is reliably loaded/read;
4. canonical memory files validate against schemas;
5. SQLite can be completely rebuilt from files;
6. exact and FTS search work;
7. semantic retrieval + RRF work locally;
8. records support provenance and lifecycle links;
9. `memory_supersede` preserves both generations;
10. current/recent context can be regenerated;
11. transcripts can be searched as a final fallback;
12. project scope prevents cross-client retrieval;
13. health pattern records remain distinguishable from diagnoses and rules;
14. `memory doctor` detects broken state;
15. deletion of `index.sqlite` followed by rebuild loses no canonical knowledge.

---

# 38. Governing Architecture Principle

> **Keep canonical truth simple, structured, inspectable, and versionable. Make retrieval sophisticated but disposable. Keep summaries and indexes derived. Preserve provenance and temporal breadcrumbs. Let agents search progressively and fail honestly.**

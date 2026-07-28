# Unit 05: routing, retrieval, and optional index

> Historical only. V3 has no numbered implementation units and does not inherit
> this unit. Read [`docs/second-brain-v3/`](../../second-brain-v3/README.md).

Status: proposed. Depends on Units 01 through 04.

## Outcome

Give agents the smallest current context that answers the task, while making
stale or historical material difficult to mistake for authoritative behavior.

## Startup routing

Startup reads:

1. the platform adapter;
2. the canonical project router;
3. `memory/context/current.md`; and
4. only task-relevant specifications or memory files.

The combined automatic startup budget is 1,500 tokens by default. Validation
enforces the configured limit.

`memory/config.yaml` maps subsystems and source path patterns to:

- authoritative files under `specs/`;
- related decisions;
- relevant implementation knowledge;
- domain or source-authority documents; and
- operations guidance when applicable.

## Deterministic retrieval

The agent searches in this order:

1. stable identifier;
2. configured subsystem or path mapping;
3. exact phrase and repository text search;
4. optional full-text index;
5. optional semantic search.

It stops when authoritative sources answer the question. Results return
pointers before bodies and include path, stable id, lifecycle status, source
hash, and a useful anchor.

Current answers exclude proposed, stale, superseded, and retired records unless
the task is explicitly auditing history. A high-similarity stale note must lose
to an active requirement or an honest abstention.

## Optional disposable index

The core works with routing and `rg`; no database is required. A project may
enable local SQLite under `memory/.cache/` only after measured scale or
retrieval problems justify it.

The optional index may contain:

- normalized titles and searchable text;
- stable identifiers, paths, anchors, and statuses;
- source commit and content hashes;
- declared relationships;
- full-text search tables; and
- embeddings only when explicitly enabled.

Deleting the index loses no truth. `tools/memory/rebuild-index.mjs` recreates it
from Git. A stale or failed health receipt causes retrieval to fall back to
repository search.

## Retrieval evaluation

A versioned query set covers exact identifiers, stakeholder terminology,
behavior questions, reversals, stale high-similarity notes, and honest
abstentions. Multi-client profiles also include no-leak scope tests.

## Acceptance tests

- A fresh index-free clone retrieves the Calendar requirement using routing and
  text search.
- A broad query can return no result.
- An active requirement outranks a stale semantically similar note.
- Repeated work does not inject the same document revision twice.
- Deleting or corrupting the optional index triggers a visible fallback.
- Index rebuild reproduces source pointers and hashes.
- Retrieval stays within the configured task budget.

## Issues covered

#57, #59, #62, and the retrieval-ranking lessons from Agentic OS.

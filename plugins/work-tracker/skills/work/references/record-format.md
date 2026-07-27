# Canonical work-item format

## Repository layout

```text
work-items/
  .work-tracker.json
  README.md
  DASHBOARD.md
  01-backlog/
    BACKLOG.md
    WI-014-example/
  02-in-progress/
  03-completed/
  04-archived/
```

Salesforce engagement repositories may use `engagement/work-items/`.

`DASHBOARD.md` and `01-backlog/BACKLOG.md` are generated. Individual item
records are authoritative.

## Item folder

```text
WI-014-example/
  ITEM.json
  SPEC.md
  STATUS.md
  HISTORY.ndjson
  other-user-notes.md
```

- `ITEM.json`: structured status, priority, type, blockers, relationships, Git
  evidence, and optional GitHub identifiers.
- `SPEC.md`: user-authored purpose, requirements, and decisions.
- `STATUS.md`: current readable handoff, recent history, and a preserved
  user-notes region.
- `HISTORY.ndjson`: complete dated event history, one JSON object per line.
- Other files: preserved and never interpreted as executable input.

## Status and stage mapping

The structured `ITEM.json.status` is authoritative because the six-state
workflow is more precise than the legacy four-stage tree.

| Status | Stage folder |
|---|---|
| Backlog, Ready | `01-backlog/` |
| In Progress, In Review | `02-in-progress/` |
| Done | `03-completed/` |
| Cancelled | `04-archived/` |

A Done item may later be archived into `04-archived/` without losing its Done
status. Validation permits that explicit archive case.

## Relationships

- `depends_on` and `blocks` are inverses.
- `related_to` is symmetric.
- `parent` and `children` are inverses.
- `supersedes` and `superseded_by` are inverses.

Validation rejects missing targets, missing inverses, duplicates, self-links,
and dependency cycles.

## Landing evidence

`git.completion_commit` means work appears complete at that commit.
`git.landed_commit`, `git.landed_at`, and `git.default_branch` mean Git ancestry
was verified. A record with status Done and false or missing landing evidence
fails validation.

## Existing-folder adoption

`init` recognizes existing `WI-<number>-<slug>` folders in the four legacy
stages. It creates missing `ITEM.json` and `HISTORY.ndjson` files without
rewriting `SPEC.md`, `STATUS.md`, or any other note. Inferred metadata is marked
`migration.needs_review` until the owner confirms it.

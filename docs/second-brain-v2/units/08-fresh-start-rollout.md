# Unit 08: fresh-start rollout and rollback

> Historical only. V3 has no numbered implementation units and does not inherit
> this unit. Read [`docs/second-brain-v3/`](../../second-brain-v3/README.md).

Status: proposed. Depends on Units 00 through 07 and the gates in Unit 09.

## Outcome

Adopt the Git-native architecture from authoritative repository content,
without reading or importing v1 memory.

## Sequence

### Phase A: confirm the retirement boundary

- Confirm v1 integrations are absent or separately deactivated in the project.
- Do not contact the v1 Worker or Neon database.
- Do not read caches, curator output, journals, outboxes, or legacy exports as
  source material.
- Confirm the current Git repository is the only starting source.

### Phase B: install the v2 core

- Add `specs/` and its behavior router.
- Add the typed `memory/` folders, router, configuration, and bounded current
  state.
- Add deterministic validation and search helpers.
- Confirm a fresh clone works with no remote memory service or local database.

### Phase C: seed from Git

- Route authoritative behavior already in Git into reviewed `specs/` content.
- Route other useful, current Git documentation into the appropriate typed
  `memory/` folders.
- Treat new knowledge found during rollout as a normal owner-approved proposal.
- Record Git paths and commits as provenance.

### Phase D: pilot

Pilot one representative project for at least ten substantial tasks. Measure:

- correct requirement retrieval;
- missed and false retrievals;
- mid-chat requirement changes;
- proactive proposal quality;
- owner approval accuracy;
- token and tool-call cost;
- fresh-clone behavior; and
- optional index value, if enabled.

### Phase E: roll out

Update the toolkit plugin, project-init, and project-sync only after the pilot
passes. Existing projects adopt v2 through an explicit reviewed fresh-start
installation.

## Rollback

Rollback reverts the v2 Git changes or returns to the last validated commit.
It does not reconnect v1. Any optional index is deleted and rebuilt only after
v2 resumes.

## Acceptance tests

- No v1 network, database, export, cache, or outbox read occurs.
- Repeating the Git inventory produces the same proposed seed inventory.
- Requirements land under `specs/`; other approved Git knowledge lands in the
  correct typed `memory/` folder.
- Rollback restores the prior validated repository state.
- Pilot tasks show no foreign memory, silent writes, or unbounded curation.

## Issues covered

All issues in #50 through #62.

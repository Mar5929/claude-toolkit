# Unit 00: contain the current system

Status: implemented in toolkit source; live Worker deployment, per-project
settings, snapshots, and exports require separate approval. Dependencies: none.

## Outcome

Stop v1 from creating additional unverified memory while preserving all current
data for audit and migration.

## Changes

1. Add a documented `BRAIN_V1_WRITE_MODE=read-only` setting honored by the MCP
   writes, bearer node writes, session-end curation, cron, and `/remember`.
2. Set `BRAIN_CURATE_ON_END=0`, `AUTO_CURATE=0`, and `BRAIN_RECALL=0` in
   installed projects during containment.
3. Keep scoped digest reads and deliberate `recall` available, labeled
   `legacy/advisory`.
4. Remove no data. Do not drain undrained journal entries.
5. Take an immediate database-native snapshot plus a logical export before any
   v2 migration work.
6. Add a temporary operator notice to project setup and sync so v1 is not
   installed into another project during the rework.

## Interface

Every blocked v1 write returns:

```json
{
  "outcome": "skipped",
  "reason": "v1_read_only",
  "next_action": "retain the proposal locally or use the v2 migration path"
}
```

It must not return HTTP 200 with ambiguous prose such as `skipped:`.

## Acceptance tests

- All v1 write routes reject without changing nodes, edges, history, digest, or
  journal drain state.
- Reads still return the expected project and carry a legacy warning.
- Scheduled curation performs zero model calls.
- Project-init and project-sync do not offer v1 as production-ready.
- Snapshot identifiers and export hashes are recorded.

## Implementation boundary

The contained Worker source and no-database harness live under
`plugins/second-brain/skills/second-brain/references/server/`. The project
containment behavior lives in the `second-brain`, `remember`, `project-init`,
and `project-sync` skills. The separately approved live procedure is
`plugins/second-brain/skills/second-brain/references/v1-freeze-and-export.md`.

Source implementation does not deploy the Worker, change an existing project,
take a Neon snapshot, or read a live database. Until those approved operator
steps are complete, the live acceptance items remain pending.

## Rollback

Containment can be lifted only through an explicit operator change. Rollback
does not automatically re-enable curation or per-prompt recall.

## Issues covered

#51, #53, #56, #59, plus the unbounded-curator cost incident.

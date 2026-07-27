# Unit 00: retire the current system

Status: implemented in toolkit behavior. No live Worker or Neon operation is
authorized. Dependencies: none.

## Outcome

Retire v1 as a toolkit product and start v2 fresh from authoritative Git
content.

## Decisions

1. V1 will not be deployed, frozen, exported, backed up for migration, or
   migrated.
2. Legacy Neon memories are not current truth and will not be imported into
   `specs/` or `memory/`.
3. V2 starts from authoritative project content already committed to Git.
4. The live Worker, Neon databases, and their data remain untouched until the
   owner separately approves deletion.
5. New projects never receive v1.
6. Existing projects may use `project-sync` to deactivate or remove local v1
   integrations with approval. That process does not contact cloud resources.
7. `/remember` remains unavailable until the Git-native v2 workflow ships.

## Active toolkit behavior

- `second-brain` reports v1 as retired and v2 as not shipped.
- `project-init` defers memory and knowledge setup without offering v1.
- `project-sync` detects local v1 wiring and offers a reversible deactivation
  or an explicitly approved local removal.
- No active skill links to v1 deployment, freeze, export, backup, or migration
  instructions.
- The old Worker source remains only as archived implementation evidence and
  has no default deploy configuration or deploy script.

## Acceptance tests

- No new-project path offers or installs v1.
- No active instruction offers v1 deployment, export, or migration.
- `/remember` returns `v1_retired` and performs no write.
- Project-sync offers deactivation or local removal, never containment or
  migration.
- V2 documentation says it starts from Git and is not shipped.
- Archived Worker source cannot be deployed through the default package or
  Wrangler paths.

## Implementation boundary

This unit changes toolkit source only. It does not change the live Worker,
access Neon, change an existing project, delete cloud resources, begin Unit 01,
or create any v2 project content.

## Rollback

Reversing this repository change would not restore v1 as an approved product.
Any decision to revive or delete live v1 infrastructure requires a separate
owner decision.

## Issues covered

#51, #53, #56, #59, plus the unbounded-curator cost incident.

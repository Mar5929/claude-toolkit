# Unit 08: migration, rollout, and rollback

Status: proposed. Depends on Units 00 through 07 and the gates in Unit 09.

## Outcome

Move a project from v1 into the Git-native architecture without treating legacy
memory as automatically correct and without destroying the evidence needed to
reverse course.

## Sequence

### Phase A: inventory and freeze

- Disable v1 automatic curator writes.
- Export or snapshot existing memory, rules, indexes, and knowledge documents.
- Record the old system's counts, versions, and known health failures.
- Remove stale automatic imports from startup context.
- Keep the legacy source read-only as migration evidence.

### Phase B: install the v2 core

- Add `specs/` and its behavior router.
- Add the typed `memory/` folders, router, configuration, and bounded current
  state.
- Add deterministic validation and search helpers.
- Confirm a fresh clone works with no remote memory service or local database.

### Phase C: classify and review

Every legacy item is classified as:

- current behavior for owner review under `specs/`;
- approved decision;
- useful context, knowledge, reference, domain, or operations content;
- proposed or unresolved;
- superseded or stale history; or
- discardable transcript, duplicate, generic summary, or tool output.

Existence in v1 is never sufficient evidence for active status. The migration
report records the source, target path or discard reason, lifecycle result, and
review evidence.

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
passes. Existing projects adopt v2 through an explicit reviewed migration.

## Rollback

Rollback reverts the v2 Git changes or returns to the last validated commit.
The legacy export remains read-only evidence, but v1 automatic curation is not
re-enabled. Any optional index is deleted and rebuilt only after v2 resumes.

## Acceptance tests

- Running classification twice produces the same proposed migration inventory.
- No legacy item becomes active without documented approval or verified
  evidence.
- Requirements land under `specs/`; other accepted memory lands in the correct
  typed `memory/` folder.
- Rollback restores the prior validated repository state.
- Pilot tasks show no foreign memory, silent writes, or unbounded curation.

## Issues covered

All issues in #50 through #62.

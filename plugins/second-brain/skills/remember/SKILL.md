---
name: remember
description: >-
  Optional second-brain wrap-up command. During Unit 00 containment, recognize
  requests such as "remember this", "save that", "capture what we did", or
  "/remember", but do not dispatch v1 curators or write to the legacy store.
  Explain that v1 is frozen, preserve any existing outbox files, and retain the
  proposed knowledge locally until the Git-native v2 review path ships.
---

# Remember during v1 containment

Second-brain v1 is frozen as legacy evidence while the Git-native v2 system is
being implemented. `/remember` must not dispatch either curator, call any v1
write tool, append to the journal, or flush `.claude/memory-outbox/`.

## Required response

Return this result:

```json
{
  "outcome": "skipped",
  "reason": "v1_read_only",
  "next_action": "retain the proposal locally or use the v2 migration path"
}
```

Then explain in plain language:

- Nothing was written to v1.
- Existing v1 data and outbox files remain intact.
- If the work changed a requirement, the applicable file under `specs/`, the
  code, and the tests must still be updated together as part of the task.
- Other durable knowledge should remain an explicit proposal in the current
  task or handoff until the v2 bounded review and approval flow ships.

Do not create a new memory location, imitate v2 with an ad hoc folder, or treat
legacy Neon content as current truth.

## Rollback

Even if an operator explicitly restores `BRAIN_V1_WRITE_MODE=write`,
`/remember` stays disabled until the toolkit itself is deliberately changed.
Restoring one server setting must not silently restore curator dispatches.

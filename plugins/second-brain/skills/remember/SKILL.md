---
name: remember
description: >-
  Recognize requests such as "remember this", "save that", "capture what we
  did", or "/remember" while v1 is retired and Markdown-only v3 is not shipped.
  Do not dispatch curators, write v1, import legacy memory, or create an ad hoc
  v3 store.
---

# Remember while v3 is not shipped

Second-brain v1 is retired. `/remember` must not call v1, dispatch either
curator, append to the journal, flush an outbox, or read legacy memory.

## Required response

Return this result:

```json
{
  "outcome": "skipped",
  "reason": "v1_retired",
  "next_action": "keep the proposal in the current Git work until the v3 review path ships"
}
```

Then explain in plain language:

- Nothing was written.
- V1 content will not be imported into v3.
- If the current task changes an authoritative Git document, update that
  document, the code, and the tests together through the normal project
  workflow.
- Other durable knowledge remains an explicit proposal in the current task or
  handoff until the v3 review and approval flow ships.

Do not create `specs/`, `memory/`, or another memory location as a partial v3
implementation. Do not treat legacy Neon content as current truth.

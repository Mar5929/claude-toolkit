# Memory System Ground Rules

Include this rule only in a project that already has second-brain v1. Do not add
it to a new project during Unit 00 containment.

Second-brain v1 is frozen legacy evidence, not current truth. Do not dispatch a
curator, call a v1 write tool, use a bearer write fallback, append or drain the
journal, flush the outbox, or delete legacy data.

The project settings must keep these values:

```text
BRAIN_V1_WRITE_MODE=read-only
BRAIN_CAPTURE=0
BRAIN_CURATE_ON_END=0
BRAIN_RECALL=0
BRAIN_KC_NUDGE=0
```

Deliberate, correctly scoped reads may remain available. Treat every digest,
recall result, node, and export as `legacy/advisory`. Verify a useful claim
against the Git repository before relying on it. Never substitute another
project's brain when this project's store is unavailable.

Preserve `.mcp.json`, hooks, agents, tokens, ignored local caches,
`.claude/memory-outbox/`, and remote data as migration evidence. Legacy Neon
content cannot automatically become a current specification or v2 memory file.

If a requirement changes during a task, update the applicable file under
`specs/`, the code, and the tests together. Other durable knowledge remains an
explicit proposal until the Git-native v2 bounded review and approval flow
ships.

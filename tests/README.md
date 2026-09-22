# Tests

Run the repository checks listed in [AGENTS.md](AGENTS.md) before a pull request.

- [Knowledge schema and indexes](knowledge-schema.test.mjs): run
  `node --test tests/knowledge-schema.test.mjs`. Disposable projects exercise
  record fields, scoped approval metadata, migration failures, size boundaries,
  grouped links, source moves, and read-only validation. Legacy compatibility
  remains covered by the startup and System Guide integration checks.
- [Knowledge behavior trials](knowledge-behavior/README.md): bounded fresh
  Codex sessions in disposable projects, with predeclared expectations, raw
  evidence and independent review. These are optional model runs, not part of
  the four deterministic repository checks.

Schema tests check observable files. They do not establish that an agent selected
useful information, interpreted approval correctly, or delivered a background save.
The [Knowledge System implementation plan](../docs/designs/269-knowledge-system/implementation-plan.md)
keeps those separate acceptance gaps and their owners.

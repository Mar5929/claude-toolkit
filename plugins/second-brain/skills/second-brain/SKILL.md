---
name: second-brain
description: >-
  Handle second-brain requests while v1 is retired and Markdown-only v3 is
  specified but not shipped. Never install, deploy, read, export, or migrate
  v1. For an existing project, identify local v1 integration files and offer a
  separately approved deactivation or local removal. Do not contact Worker or
  Neon resources.
---

# Second-brain after v1 retirement

There is currently no production-ready second-brain installation path:

- v1 is retired.
- v3 is a draft technical specification under `docs/second-brain-v3/`, not shipped
  functionality.
- the previous v2 specification is superseded and is not a v3 requirements
  source.

Do not install or revive v1. Do not claim v3 can be installed yet.

## New project

Record memory and knowledge setup as deferred. Continue the rest of project
setup without creating a database, MCP connector, curator agent, capture hook,
recall hook, `specs/`, or `memory/` imitation.

## Existing project without v1

Record second-brain as deferred. Do not add v1 components.

## Existing project with v1

Treat the integration as retired. Do not call its reads or writes, and do not
use its content as current truth or as input to v3.

Offer two local-only choices, one at a time and only with owner approval:

1. **Deactivate, recommended first.** Disable automatic v1 hooks and remove the
   project's v1 MCP connection from committed Claude and Codex configuration.
   Preserve the old scripts and agents temporarily so the change is easy to
   review and reverse.
2. **Remove local integration files.** After showing the exact paths, remove
   committed v1 hooks, curator agents, MCP configuration, v1 rules, and empty
   outbox scaffolding that the owner approves. Do not open ignored local secret
   files. Do not delete an outbox or cache that contains user material without
   separate explicit approval.

Account-level connectors, local tokens, the Worker, Neon databases, and cloud
infrastructure are outside this skill. Report them as separate follow-up work.
Do not access or change them.

## `/remember`

`/remember` remains unavailable until the Markdown v3 review and approval
workflow ships. Do not dispatch a curator, write a journal, flush an outbox, or
create an ad hoc replacement.

## Retirement boundary

- No v1 deployment will occur.
- No v1 memory will be exported or imported into v3.
- Worker and Neon resources remain untouched until separately approved for
  deletion.
- V3 is not shipped. Its technical specification is under owner review.

## Reference map

- `docs/second-brain-v3/`: current draft Markdown architecture.
- `docs/second-brain-v2/`: superseded historical proposal. Do not implement it
  as v3.
- `references/server/`: archived v1 implementation evidence. It is not a
  deployment source and has no default deploy path.
- Other files under `references/`: historical v1 design evidence. They are not
  installation, export, or migration instructions.

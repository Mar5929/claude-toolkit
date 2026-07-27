---
name: second-brain
description: >-
  Handle second-brain setup requests during the Unit 00 containment period.
  The old Neon/MCP v1 system is frozen and must not be installed into a new
  project. Git-native v2 is specified but not shipped. For an existing v1
  project, report its legacy status and offer only the documented, reversible
  containment settings. Do not delete, migrate, deploy, snapshot, or export
  live data without the owner's separate approval.
---

# Second-brain during Unit 00 containment

There is currently no production-ready second-brain installation path:

- v1 is the legacy Neon/MCP system. It is being frozen read-only.
- v2 is a technical specification under `docs/second-brain-v2/`, not shipped
  functionality.

Do not install v1 into another project, and do not claim that v2 can be
installed or migrated to yet.

## New project

Say that second-brain setup is temporarily unavailable while v2 is being
implemented. Continue the rest of project setup without Gates 3 and 4. Do not
create a database, register a Worker secret, add an MCP connector, copy curator
agents, or install automatic capture and recall hooks.

## Existing project without v1

Record second-brain as deferred. Do not add v1 components.

## Existing project with v1

Treat every v1 read as `legacy/advisory`, never as current truth. Offer the
following reversible settings, one project at a time and only with the owner's
approval:

```json
{
  "BRAIN_V1_WRITE_MODE": "read-only",
  "BRAIN_CAPTURE": "0",
  "BRAIN_CURATE_ON_END": "0",
  "BRAIN_RECALL": "0",
  "BRAIN_KC_NUDGE": "0"
}
```

Keep `BRAIN_INJECT=1` only if the owner wants the legacy digest available with
its warning. Do not remove `.mcp.json`, tokens, hooks, agents, outbox files,
ignored local caches, or any database content. Do not run `/remember`.

The server-side controls are separate:

```text
BRAIN_V1_WRITE_MODE=read-only
AUTO_CURATE=0
```

Changing project settings does not change the deployed Worker. Changing the
toolkit source does not deploy it. Follow
`references/v1-freeze-and-export.md` only after the owner separately approves
the live containment and backup operation.

## Read-only behavior

Deliberate `get_digest`, `recall`, `get_node`, `list_nodes`, `read_journal`, and
`export` reads may remain available. Their output must say
`legacy/advisory`. Useful claims must be verified against the Git repository
before use.

Every blocked write must return:

```json
{
  "outcome": "skipped",
  "reason": "v1_read_only",
  "next_action": "retain the proposal locally or use the v2 migration path"
}
```

## What not to do

- Do not delete or drain legacy data.
- Do not promote legacy content into `specs/` or `memory/`.
- Do not deploy the Worker from this skill.
- Do not take a snapshot or logical export without separate approval.
- Do not improvise a partial v2 installer.
- Do not migrate a pilot project until the Git-native core and migration tools
  exist and pass their release gates.

## Reference map

- `references/v1-freeze-and-export.md`: operator procedure for a later,
  separately approved live freeze and backup.
- `references/server/`: contained v1 Worker source and verification harness.
- `references/templates/settings.json`: containment settings for an existing
  v1 project, not a new-project installer.
- `docs/second-brain-v2/`: proposed v2 architecture and implementation units.
- Other files under `references/`: retained v1 implementation evidence. They
  are not current installation instructions during containment.

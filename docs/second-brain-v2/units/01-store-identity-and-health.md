# Unit 01: project identity, configuration, and health

> Historical only. V3 has no numbered implementation units and does not inherit
> this unit. Read [`docs/second-brain-v3/`](../../second-brain-v3/README.md).

Status: proposed. Depends on Unit 00.

## Outcome

Install a portable Git-native scaffold, bind it to the correct repository, and
give agents one cheap answer to "is this project's knowledge system usable?"

## Deliverables

- `memory/config.yaml` with a stable project id, schema version, project
  profile, canonical paths, authority declarations, context budgets, and
  optional index settings.
- `memory/README.md` as the master router for durable project memory.
- `specs/README.md` as the router for authoritative system behavior.
- `memory/context/current.md` as the bounded current-state briefing.
- `tools/memory/validate.mjs` for deterministic configuration and structure
  checks.
- `tools/memory/search.mjs` for deterministic repository search.
- `memory/.cache/` in `.gitignore`.

The toolkit supplies reusable workflow instructions. The installed project
contains only its own configuration, knowledge, and deterministic helpers. It
does not install a background curator agent.

## Repository identity

`memory/config.yaml` declares a stable `project_id`. Validation runs from the
Git root and fails when the config is missing, duplicated, malformed, or
associated with a different declared repository identity.

Connector names, directory display names, and user-level memory locations are
not identity inputs. A copied memory folder cannot silently identify itself as
the destination project.

## Health states

The validator reports independent components:

- project identity;
- required routers and folders;
- configuration schema;
- internal links and stable identifiers;
- context-budget compliance;
- optional index state;
- Git availability; and
- external-authority pointer configuration, when used.

Each component reports `ok`, `not_enabled`, `stale`, or `failed`, plus a
supported next action. There is no misleading aggregate green result.

If indexing is disabled, health says `not_enabled`, not failed. If enabled,
`memory/.cache/health.json` records the indexed commit, source hashes, index
schema, enabled search modes, and last successful rebuild.

## Acceptance tests

- A fresh clone validates without remote credentials or a database.
- A copied `memory/` folder with the wrong project id fails before retrieval.
- An intentionally index-free project reports healthy core behavior.
- Deleting `memory/.cache/` loses no truth and returns a supported rebuild
  action only when indexing is enabled.
- Router and current-state budget violations fail validation.
- Claude and Codex resolve the same canonical project paths.

## Issues covered

#51, #52, #54, #55, and the cross-project identity failures in the v1 audit.

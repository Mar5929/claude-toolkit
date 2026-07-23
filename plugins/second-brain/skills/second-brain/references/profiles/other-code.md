# Profile: other code

Pick this when the project is code but not a Salesforce org and not a user-facing
app: a library, a backend service, a CLI, an automation, or internal tooling.

At install, paste the matching block into each curator's `## Project profile`
section, replacing the `<...>` placeholders. `<APP_NAME>` is the real project name.

## Paste into brain-curator.md `## Project profile`

- **Project:** `<APP_NAME>` (other code)
- **Data in scope:** architecture and design decisions, why subsystems exist,
  constraints, interfaces/contracts, and gotchas. No product or user data.
- **What "verified" means here:** the project builds and its tests/lint pass.
  Order of trust: builds + tests green > user said > assumed.
- **Drift model(s) in use:** file-SHA (covered source files).
- **Source code path(s):** `<the source roots, e.g. src/ lib/ tests/; confirm at install>`
- **Dominant node types:** `decision` nodes, code-subsystem `knowledge` nodes,
  and gotchas.
- **Systems of record (point, do not copy):** `<this project's actual tools, e.g.
  GitHub issues, Linear, Jira>`. The brain writes pointer nodes to these,
  per invariant 9.

## Paste into knowledge-curator.md `## Project profile`

- **Project:** `<APP_NAME>` (other code)
- **Data in scope:** the why behind each subsystem, its contracts, and the
  trade-offs made. No product or user data.
- **What "verified" means here:** the project builds and tests/lint pass. Order of
  trust: builds + tests green > user said > assumed.
- **Drift model(s) in use:** file-SHA (covered source files).
- **Source code path(s):** `<the source roots, e.g. src/ lib/ tests/; confirm at install>`
- **Dominant node types:** one code-subsystem `knowledge` node per module/package
  with a first-class `## Gotcha (do not reintroduce)`, and a `know-codemap` entry
  per subsystem.
- **Structural graph companion:** optional, and here it is graphify (a local
  tree-sitter code graph; see `references/structural-layer-graphify.md`), not the
  Salesforce `force-app/` tool. Add it when the codebase is large and cross-module
  impact ("what calls this?") is a frequent question; otherwise the compiler +
  tests + `covers:` pins suffice.

## Setup notes

- `CODE_PATH_REGEX` = the source roots (ask the owner; e.g. `src/|lib/`).
- Universal exclusions still apply: never store secrets, tokens, or credentials.
- This profile turns the knowledge layer ON.
- Onboarding onto a repo that already has code? Run the one-time knowledge
  backfill and install the freshness hook: `references/kb-backfill.md`
  (SKILL.md Step 2c).

# Profile: app (iOS / web)

Pick this when the project is a user-facing application (iOS, Android, web, or
desktop) built from source you compile and test. Reference example: Mike's iOS
fitness app "Anchor". (Anchor's own knowledge-curation examples and repo path
refine this profile later; see toolkit backlog B1.)

At install, paste the matching block into each curator's `## Project profile`
section, replacing the `<...>` placeholders. `<APP_NAME>` is the real app name.

## Paste into brain-curator.md `## Project profile`

- **Project:** `<APP_NAME>` (app)
- **Data in scope:** product and domain facts a future session needs: feature
  intent, data-model decisions, business rules, platform constraints, and owner
  preferences. NOT raw end-user data.
- **What "verified" means here:** the app compiles and its tests pass on the
  target platform. Order of trust: it builds + tests green > user said > assumed.
- **Drift model(s) in use:** file-SHA (covered source files).
- **Source code path(s):** `<the app's source, e.g. Sources/ App/ Tests/ (iOS) or src/ (web); confirm at install>`
- **Dominant node types:** `decision` nodes (why the app is built this way),
  code-subsystem `knowledge` nodes (one per feature/module), and gotchas.
- **Systems of record (point, do not copy):** `<this project's actual tools, e.g.
  Linear, GitHub issues, TestFlight notes>`. The brain writes pointer nodes to
  these, per invariant 9.

## Paste into knowledge-curator.md `## Project profile`

- **Project:** `<APP_NAME>` (app)
- **Data in scope:** the why behind features and modules; data-model and platform
  decisions. NOT raw end-user data.
- **What "verified" means here:** the app compiles and tests pass on the target
  platform. Order of trust: it builds + tests green > user said > assumed.
- **Drift model(s) in use:** file-SHA (covered source files).
- **Source code path(s):** `<the app's source, e.g. Sources/ App/ Tests/ (iOS) or src/ (web); confirm at install>`
- **Dominant node types:** one code-subsystem `knowledge` node per feature/module,
  with a first-class `## Gotcha (do not reintroduce)` (for example "never score a
  SetLog by raw `log.sets`; a timed hold's work is `workUnits`"), and a
  `know-codemap` entry per subsystem.
- **Structural graph companion:** optional, and for an app it is graphify (a local
  tree-sitter code graph; see `references/structural-layer-graphify.md`), not the
  Salesforce `force-app/` tool. Most apps rely on the compiler + tests plus
  file-SHA `covers:` pins for impact detection; add graphify only when "what calls
  this?" is a real, recurring question.

## Setup notes

- `CODE_PATH_REGEX` = the app's source paths (ask the owner; e.g. `Sources/|Tests/`
  for a Swift app, `src/|lib/` for web).
- Universal exclusions still apply: never store secrets, signing keys, API tokens,
  or real end-user data.
- This profile turns the knowledge layer ON.
- Onboarding onto an app that already has code? Run the one-time knowledge
  backfill and install the freshness hook: `references/kb-backfill.md`
  (SKILL.md Step 2c).

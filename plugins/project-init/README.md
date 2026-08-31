# project-init plugin

The setup system for the toolkit. It puts the toolkit's rules and systems into a
project, either a brand-new one or one that already exists. This is the plugin
you install first on every machine, because it is how everything else in the
toolkit reaches a project.

**Setup: sets up a project.** Install once per machine. Running it is what puts
files into a project, so every project it touches opts in deliberately.

## Install

```
/plugin install project-init
```

## Skills

- **project-init** (`/project-init`): walks a NEW project through setup one
  skippable gate at a time, in a fixed order:
  1. Scaffolding and folder structure, plus a question of its own about where
     work items are tracked (a GitHub Projects board, Linear, Jira, local
     folders on this computer, the BMAD method, or nothing yet)
  2. Hooks and guards
  3. Packaged project knowledge system under `knowledge/`
  4. Optional mechanical knowledge aids
  5. An optional owner-written SOUL.md, plus CLAUDE.md, AGENTS.md, and
     `.claude/rules/`
  6. Optional standalone toolkit skills, offered from the `session-skills` plugin
  It asks before acting, recommends a per-stack layout, and copies in the
  standard rule files, including the project file lifecycle that every agent
  receives through `.claude/rules/`. It does not hold the memory or knowledge systems itself;
  it points at their plugins so each can evolve on its own.
  New Salesforce projects use `delivery/` for client-work artifacts and
  `knowledge/` for curated working context. Existing `engagement/` projects
  stay in place.

- **project-sync** (`/project-sync`): the sibling for a project that ALREADY
  exists. It inventories everything the toolkit currently ships (reading the
  toolkit itself, so new systems are picked up as the toolkit grows),
  cross-references the project, reports the gaps in one table, closes the ones
  you approve, and records the toolkit version it synced against so a later run
  does not re-nag about a deliberate "no". Its Step 1 refreshes the installed
  plugin first, so running it also pulls the latest toolkit onto that machine.

- **work-item-lifecycle** (`/work-item-lifecycle`): applies the project's
  standing file lifecycle to a real file or work-item event. Its description
  lets an agent select it when creating, moving, organizing, completing, or
  archiving work-item information, or when deciding where architecture,
  specifications, decisions, deliverables, or retired material belong. It
  reads the project rule instead of copying a second lifecycle, searches for an
  existing authority, and treats advice separately from permission to write.

- **machine-sync** (`/machine-sync`): the third sibling, working one level up. It
  sets up the COMPUTER rather than a project, comparing the Claude and Codex
  homes against the toolkit's machine-wide set and installing what you approve. Same shape as
  project-sync: read the toolkit, audit, report every gap in one table, change
  nothing until you answer. It exists because the other two only reach inside a
  repository someone ran them on, and some rules have to hold in a repository
  cloned five minutes ago. It is also the whole setup for a new computer.

## Key references

This plugin holds three separate piles, and the difference matters.

### The machine-wide set: what lands on a computer

`machine/` holds what `machine-sync` installs into the host homes, with its own
`README.md` index: `rules/` for the rule files, `settings/required.json` for the
settings values every machine must carry, and a pointer to the machine-wide
hooks, whose scripts live with every other hook in the
[`hooks-library`](../hooks-library/README.md) plugin.

It is deliberately small. Its `README.md` carries a two-question test for what
belongs there: the thing has to hold in a repository nobody set up with the
toolkit, and it must not already be in `library/`. Anything
failing either question is a project rule and goes in `library/` instead. It
carries three rules today: `no-ai-attribution.md`, which keeps credit to Claude
or any other AI agent off everything the owner commits or pushes,
`propose-the-best-solution.md`, which says the best answer always gets said out
loud, whatever it would cost in time, effort, or resources, and
`keep-design-out-of-requirements.md`, which keeps build decisions out of
requirements and splits the work into functional requirements, a technical
specification, and the architectural decision records that join them.

### The library: what lands in a project

`library/` holds everything the toolkit copies into a project. `project-sync`
reads the same folder, so none of it is project-init's property; it lives here
because a plugin ships only the files inside its own folder, so a `library/` at
the repository root would disappear the moment the plugin is installed.

- `library/rules/general/` (with its own `README.md` index): the standard
  `.claude/rules` files copied into every project, marked default ON or
  conditional. The default file lifecycle rule keeps work tracking, active
  architecture, approved behavior, lasting decisions, implementation,
  presentation deliverables, and retired material in their proper homes.
  Retired v1 examples are not part of this active library.
- `library/rules/salesforce/` (with its own `README.md`): the same idea for
  Salesforce projects, including compatibility for existing `engagement/`
  delivery roots.
- `library/tools/permsets.py`: the permission set tool the
  `permissions-source-control.md` rule depends on. Copied to
  `tools/permissions/` in the project.
- `library/tools/kb/`: the Salesforce dependency graph tool, with its own
  `README.md`. Copied whole to `tools/kb/` in the project.
- `library/templates/permissions-runbook.md`: the project-side runbook to copy
  and fill in when permission sets are tracked.
- `library/guides/salesforce-dependency-graph.md`: how to install and use the
  `kb/` tool, which compiles a Salesforce project's own metadata into a local
  graph, so "if I change this field, what breaks?" is answered from the metadata
  instead of from memory. Offered in Gate 1, kept current by a Gate 2 hook. It
  reads local files only and never contacts an org.
- `library/guides/graphify-dependency-graph.md`: the same job for every
  non-Salesforce stack, using the open-source graphify tool. Offered in Gate 4,
  and it ships as a kit too: the tool, the gitignore entry, the
  `library/rules/general/dependency-graph.md` rule, and graphify's own
  auto-rebuild git hooks.
- `library/guides/salesforce-permissions-retrieval.md` and
  `library/guides/salesforce-permissions-research.md`: the permission set
  runbook and the evidence behind it.
- `library/guides/mcp-best-practices.md`: per-server MCP tool rules, folded in
  only for the servers a project actually uses.

### The gate script: how this skill runs itself

`skills/project-init/references/` holds six files, and none is copied into a
project:

- `setup-flow.md`: the ordered, gate-by-gate checklist project-init follows.
- `work-tracking-choice.md`: the Gate 1 question about where work items are
  tracked, what each of the six answers does, and the step-by-step setup for a
  GitHub Projects board. The toolkit can also set up the local-folder answer.
  For the BMAD method it runs BMAD's own installer with approval and stops
  there. It creates and changes nothing inside Linear, Jira, or any other
  external tracker.
- `work-items-structure.md`: what Gate 1 does for the "local folders on this
  computer" answer. Installs the flat, Git-ignored work-tracker, enforces
  owner-approved requirements, and previews conversion before copying an older
  staged tracker.
- `thin-claudemd.md`: how Gate 5 writes a short CLAUDE.md that points at
  `.claude/rules/` instead of holding the rules inline, and the four things that
  must stay in the root file whatever else moves out.
- `folder-claudemd.md`: the short CLAUDE.md Gate 1 writes inside each major
  folder, which Claude Code loads only when an agent reads a file in that
  folder. What goes in one, what never does, which folders get one, and which
  are skipped.
- `salesforce-project-scaffold.md`: the standard Gate 1 folder layout for a
  Salesforce / SFDX project.

### Not here: every hook

The two Salesforce guards Gate 2 offers, the production-org guard and the
permission set deploy guard, ship from the
[`hooks-library`](../hooks-library/README.md) plugin with every other hook in
the toolkit. Gate 2 installs that plugin and follows its two guides, which copy
the hook files into the project; after that the project runs them without the
plugin.

## How it relates to the rest of the toolkit

- project-init is the **entry point that installs the other plugins' systems**.
  Gate 3 offers the complete packaged `second-brain` project knowledge system,
  including its managed operating manual, startup map, task-specific skills,
  index builder, and checker.
- `work-item-lifecycle` is the action layer for the default project file
  lifecycle rule. The rule is always-loaded policy; the skill is selected when
  a specific file or work-item event needs that policy applied.
  Gate 4 offers optional impact-analysis tools without creating a competing
  store.
- Gate 6 offers the `session-skills` plugin, which holds `explain-simply`,
  `grill-me`, `handoff`, `session-summary`, and `track-tasks`, without copying
  anything into the project. The plugin remains their canonical home.
- Gate 1 asks where work items are tracked. Gate 5 writes a one-line pointer in
  `CLAUDE.md` and `AGENTS.md` naming that tracker, so every session knows where
  the work lives. No rule about ticket quality ships with it: the rule that used
  to, `spec-before-you-build.md`, was removed from the toolkit on 2026-08-31.
- Gate 5 installs no general knowledge rule. Projects that accept Gate 3 receive
  `knowledge/README.md` as the one routing and operating manual; projects that
  decline it receive no knowledge policy.
- For the "local folders on this computer" answer, Gate 1 offers `work-tracker`
  as the one canonical task-status system. It uses flat YAML records under
  Git-ignored `.work-items/` and requires an owner-approved `REQUIREMENTS.md`
  before work starts. Existing staged trackers use a preview-first copy that
  leaves their original files untouched for review.
- For the GitHub Projects board answer, Gate 1 sets up the board by hand from
  `work-tracking-choice.md` and no work-tracker code is involved. That board
  holds the shared work. Local-folder mode has no GitHub mirror.
- project-sync detects knowledge layouts by system signatures, not folder names.
  It can install greenfield, dry-run and apply a flat #149 migration with an
  approval hash, or produce owner-review drafts for retired v3 without touching
  the old system. Mixed or unknown layouts stop without writing. Separately, it
  may identify and offer to deactivate older cloud-backed v1 wiring, but it
  never contacts the Worker or Neon or deletes cloud infrastructure.
- **project-init versus project-sync is not redundancy.** They share the same
  inventory of toolkit systems but enter from opposite ends: project-init lays
  foundations in an empty project, project-sync audits and back-fills a project
  that already exists.
- **machine-sync is not a third copy of either.** The other two write into a
  project folder and share `library/`. This one writes into the owner's home
  folder and reads `machine/`, which holds different material for a different
  reason. Running project-sync on every repository would still miss a repository
  nobody ran it on, and that gap is the whole reason machine-sync exists. The
  two scopes never install the same file.

## Maintaining this plugin

A content change here bumps both plugin manifests and `metadata.version` in the
repo's `.claude-plugin/marketplace.json`. Keep this README and
`docs/toolkit-map.md` current when the skills or gates change.

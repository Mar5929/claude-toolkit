# project-init plugin

The setup system for the toolkit. It puts the toolkit's rules and systems into a
project, either a brand-new one or one that already exists. This is the plugin
you install first on every machine, because it is how everything else in the
toolkit reaches a project.

## Install

```
/plugin install project-init
```

## Skills

- **project-init** (`/project-init`): walks a NEW project through setup one
  skippable gate at a time, in a fixed order:
  1. Scaffolding and folder structure, including the optional Git-native
     work-tracker and safe adoption of the existing four-stage convention
  2. Hooks and guards
  3. Complete second-brain v3 memory system
  4. Knowledge layer included with second-brain v3
  5. CLAUDE.md, AGENTS.md, and `.claude/rules/`
  6. Optional standalone toolkit skills, beginning with `grill-me`
  It asks before acting, recommends a per-stack layout, and copies in the
  standard rule files. It does not hold the memory or knowledge systems itself;
  it points at their plugins so each can evolve on its own.

- **project-sync** (`/project-sync`): the sibling for a project that ALREADY
  exists. It inventories everything the toolkit currently ships (reading the
  toolkit itself, so new systems are picked up as the toolkit grows),
  cross-references the project, reports the gaps in one table, closes the ones
  you approve, and records the toolkit version it synced against so a later run
  does not re-nag about a deliberate "no". Its Step 1 refreshes the installed
  plugin first, so running it also pulls the latest toolkit onto that machine.

## Key references

Bundled under `skills/project-init/references/`:

- `setup-flow.md`: the ordered, gate-by-gate checklist project-init follows.
- `work-items-structure.md`: how Gate 1 offers the work-tracker, adopts existing
  folders safely, and separately offers an optional GitHub Project mirror.
- `thin-claudemd.md`: how Gate 5 writes a short CLAUDE.md that points at
  `.claude/rules/` instead of holding the rules inline.
- `general-rules/` (with its own `README.md` index): the standard `.claude/rules`
  files copied into every project, marked default ON or conditional.
- `salesforce-rules/` (with its own `README.md`): the same idea for Salesforce
  projects.
- `salesforce-dependency-graph.md` plus `tools/kb/`: a self-contained tool that
  compiles a Salesforce project's own metadata into a local graph, so "if I
  change this field, what breaks?" is answered from the metadata instead of from
  memory. Offered in Gate 1, kept current by a Gate 2 hook. It reads local files
  only and never contacts an org.
- `graphify-dependency-graph.md`: the same job for every non-Salesforce stack,
  using the open-source graphify tool.
- `mcp-best-practices.md`: per-server MCP tool rules, folded in only for the
  servers a project actually uses.

## How it relates to the rest of the toolkit

- project-init is the **entry point that installs the other plugins' systems**.
  Gate 3 offers the complete `second-brain` v3 system. Gate 4 records its
  knowledge layer as included rather than creating a competing store.
- Gate 6 offers the standalone `grill-me` interview workflow without copying it
  into the project. The plugin remains its canonical home.
- Gate 1 offers `work-tracker` as the one canonical task-status system. It can
  stay entirely local or, with separate approval, create or link a GitHub
  Project. Existing manual work-item folders are adopted without overwriting
  their specifications, handoffs, or notes.
- project-sync performs a read-only v3 adoption audit before changing an
  existing project. Separately, it identifies existing local v1 integrations.
  With owner approval it may deactivate them or remove specifically approved
  local files. It never contacts the Worker or Neon, reads legacy memory,
  imports v1 into v3, or deletes cloud infrastructure.
- **project-init versus project-sync is not redundancy.** They share the same
  inventory of toolkit systems but enter from opposite ends: project-init lays
  foundations in an empty project, project-sync audits and back-fills a project
  that already exists.

## Maintaining this plugin

A content change here bumps `version` in `.claude-plugin/plugin.json` and
`metadata.version` in the repo's `.claude-plugin/marketplace.json`. Keep this
README and `docs/toolkit-map.md` current when the skills or gates change.

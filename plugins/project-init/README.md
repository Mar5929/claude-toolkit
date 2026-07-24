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
  1. Scaffolding and folder structure
  2. Hooks and guards
  3. Memory system (offers the `second-brain` plugin)
  4. Knowledge layer (offers the `second-brain` plugin)
  5. CLAUDE.md and `.claude/rules/`
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
- `thin-claudemd.md`: how Gate 5 writes a short CLAUDE.md that points at
  `.claude/rules/` instead of holding the rules inline.
- `general-rules/` (with its own `README.md` index): the standard `.claude/rules`
  files copied into every project, marked default ON or conditional.
- `salesforce-rules/` (with its own `README.md`): the same idea for Salesforce
  projects.
- `mcp-best-practices.md`: per-server MCP tool rules, folded in only for the
  servers a project actually uses.

## How it relates to the rest of the toolkit

- project-init is the **entry point that installs the other plugins' systems**.
  Gates 3 and 4 offer `second-brain`; the CLAUDE.md gate copies the general
  rules, some of which pair with other plugins (for example
  `memory-system-ground-rules.md` goes in only if the `second-brain` memory gate
  ran).
- **project-init versus project-sync is not redundancy.** They share the same
  inventory of toolkit systems but enter from opposite ends: project-init lays
  foundations in an empty project, project-sync audits and back-fills a project
  that already exists.

## Maintaining this plugin

A content change here bumps `version` in `.claude-plugin/plugin.json` and
`metadata.version` in the repo's `.claude-plugin/marketplace.json`. Keep this
README and `docs/toolkit-map.md` current when the skills or gates change.

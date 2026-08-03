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
  1. Scaffolding and folder structure, plus a question of its own about where
     work items are tracked (a GitHub Projects board, Linear, Jira, files in
     this repository, or nothing yet)
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
- `work-tracking-choice.md`: the Gate 1 question about where work items are
  tracked, what each of the five answers does, and the step-by-step setup for a
  GitHub Projects board. The board is the only answer the toolkit sets up; it
  creates and changes nothing inside Linear, Jira, or any other external
  tracker.
- `work-items-structure.md`: what Gate 1 does for the "files in this repository"
  answer. Installs the work-tracker, adopts existing folders safely, and
  separately offers an optional GitHub Project mirror of those files.
- `thin-claudemd.md`: how Gate 5 writes a short CLAUDE.md that points at
  `.claude/rules/` instead of holding the rules inline.
- `general-rules/` (with its own `README.md` index): the standard `.claude/rules`
  files copied into every project, marked default ON or conditional. Retired v1
  examples are not part of this active library.
- `salesforce-rules/` (with its own `README.md`): the same idea for Salesforce
  projects.
- `output-styles/` (with its own `README.md` index): the `.claude/output-styles`
  files that set the voice Claude answers in, installed in Gate 5.
  `plain-language.md` is default ON. A style is delivered through the system
  prompt and re-stated to the session each turn, which is what a voice rule needs
  and a rule file cannot do; it sits alongside the voice rules rather than
  replacing them, because a subagent never sees a style.
- `salesforce-dependency-graph.md` plus `tools/kb/`: a self-contained tool that
  compiles a Salesforce project's own metadata into a local graph, so "if I
  change this field, what breaks?" is answered from the metadata instead of from
  memory. Offered in Gate 1, kept current by a Gate 2 hook. It reads local files
  only and never contacts an org.
- `graphify-dependency-graph.md`: the same job for every non-Salesforce stack,
  using the open-source graphify tool. Offered in Gate 4, and it ships as a kit
  too: the tool, the gitignore entry, the `general-rules/dependency-graph.md`
  rule, and graphify's own auto-rebuild git hooks.
- `mcp-best-practices.md`: per-server MCP tool rules, folded in only for the
  servers a project actually uses.

## How it relates to the rest of the toolkit

- project-init is the **entry point that installs the other plugins' systems**.
  Gate 3 offers the complete `second-brain` v3 system. Gate 4 records its
  knowledge layer as included rather than creating a competing store.
- Gate 6 offers the standalone `grill-me` interview workflow without copying it
  into the project. The plugin remains its canonical home.
- Gate 1 asks where work items are tracked, and the two guarantees that follow
  are the same whichever answer it gets: log the work in that tracker before
  building it, and refine the six-part spec before building it. Those live once
  in `general-rules/spec-before-you-build.md`, copied into `.claude/rules/` in
  Gate 5, with a one-line pointer in `CLAUDE.md` and `AGENTS.md` naming the
  tracker.
- For the "files in this repository" answer, Gate 1 offers `work-tracker` as the
  one canonical task-status system. It can stay entirely local or, with separate
  approval, create or link a GitHub Project mirroring those files. Existing
  manual work-item folders are adopted without overwriting their specifications,
  handoffs, or notes.
- For the GitHub Projects board answer, Gate 1 sets up the board by hand from
  `work-tracking-choice.md` and no work-tracker code is involved. That board
  holds the work; the mirror above only reflects files that hold it.
- project-sync performs a read-only v3 adoption audit before changing an
  existing project. Separately, it identifies existing local v1 integrations.
  With owner approval it may deactivate them or remove specifically approved
  local files. It never contacts the Worker or Neon, reads legacy memory,
  imports v1 into v3, or deletes cloud infrastructure. It detects committed v1
  patterns directly and does not need archived v1 rule files in the plugin.
- **project-init versus project-sync is not redundancy.** They share the same
  inventory of toolkit systems but enter from opposite ends: project-init lays
  foundations in an empty project, project-sync audits and back-fills a project
  that already exists.

## Maintaining this plugin

A content change here bumps `version` in `.claude-plugin/plugin.json` and
`metadata.version` in the repo's `.claude-plugin/marketplace.json`. Keep this
README and `docs/toolkit-map.md` current when the skills or gates change.

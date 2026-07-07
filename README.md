# claude-toolkit

**A personal, portable toolkit of reusable Claude systems — skills, hooks, and
templates — that follow me across every project and every device.**

This repository is my single source of truth for the repeatable pieces I want in
_every_ project I start: a consistent project-initialization flow, a scalable
memory architecture, a knowledge layer, guard hooks, and CLAUDE.md boilerplate.
Instead of copy-pasting these between projects (and letting the copies drift), I
maintain them **once, here**, and distribute them to each surface.

---

## Why this repo exists

I kept re-solving the same "set up a new project well" problem by hand, and my
best patterns (memory architecture, knowledge layer, standard CLAUDE.md rules)
lived scattered inside individual project repos where they slowly went stale.
This repo fixes that:

- **One canonical copy.** Each reusable system lives here and only here.
- **Cross-project.** Any new repo gets the same battle-tested setup flow.
- **Cross-device.** Works from my MacBook, my Windows laptop, and (via publish)
  the Claude desktop and web apps.
- **No drift.** When I improve a system while using it inside some project, I port
  the change _back here_ and re-publish — the template and every consumer stay in
  sync.

---

## How it's distributed (single source → every surface)

This repo is structured as a **Claude Code plugin marketplace**. One repo can hold
many plugins; each plugin bundles skills (and later hooks/commands/agents).

| Surface | How it consumes this repo | How it updates |
|---|---|---|
| **Claude Code** (Mac + Windows, every project) | `/plugin marketplace add mar5929/claude-toolkit` once per machine, then `/plugin install project-init` | `/plugin marketplace update` (git-pulls) |
| **Claude Code**, no-plugin fallback | clone this repo, symlink `plugins/*/skills/*` into `~/.claude/skills/` | `git pull` |
| **Claude desktop / web** (claude.ai) | upload the skill folder as a Capability/Skill | no git auto-sync — **publish-on-change** from here |

The plugin route is the primary one: it's a single install per machine, updates
with one command, and will also carry hooks/commands as this repo grows. The web
and desktop apps don't auto-pull from git today, so I treat them as **publish
targets** — this repo stays the source of truth and I export to them when a system
changes.

---

## Layout

```
claude-toolkit/
  README.md                       ← you are here
  .claude-plugin/
    marketplace.json              ← lists the plugins in this repo
  plugins/
    project-init/                 ← plugin: the new-project setup flow
      .claude-plugin/plugin.json
      skills/
        project-init/
          SKILL.md                ← the orchestration skill
          references/
            setup-flow.md         ← the ordered gate-by-gate checklist
            claude-md-boilerplate.md  ← standard CLAUDE.md rules I always want
```

Each **concern is its own skill** so it can evolve and be reused independently —
`project-init` orchestrates the setup and _references_ the other systems rather
than hard-coding them, so the memory architecture can change without touching the
init flow.

---

## What's here now

- **`project-init`** — a skill that walks me through setting up a new project in a
  fixed, skippable order: scaffolding & folder structure → hooks → memory system →
  knowledge layer → CLAUDE.md. It asks before acting, recommends per-stack layouts,
  and injects my standard CLAUDE.md rules.

---

## Planned additions (roadmap)

These are the reusable systems I want to fold in here over time. Ordered roughly by
priority; each becomes its own skill/plugin so `project-init` can pull it in.

- [ ] **`memory-architecture` skill** — my scalable long-term memory system (the
  single-owner Markdown knowledge-graph pattern: `memories/` with `index.json`,
  typed edges, a curator agent, drift detection). Port from the Anchor project
  once its remaining bugs are ironed out. This is the highest-value repeatable
  system and the main reason this repo exists.
- [ ] **`knowledge-layer` skill** — the knowledge/`covers:`-style layer that pins
  durable knowledge nodes to source files and flags staleness.
- [ ] **Shared hooks library** — reusable guard hooks I can drop into any project,
  e.g. **block deployments to a protected environment**, secret-scanning
  pre-commit guards, and a SessionStart orientation hook.
- [ ] **CLAUDE.md boilerplate library** — a growing set of standard rules I want in
  every project (e.g. _"if we identify CLAUDE.md-worthy updates during a session,
  update CLAUDE.md before the task ends"_), composable per project.
- [ ] **Publish tooling** — a small script/checklist to export skills to the Claude
  desktop and web apps so those surfaces stay in sync with this repo.
- [ ] **"Port-back" convention** — a documented flow (and a reminder baked into each
  skill) for when I improve a system inside a project: open a PR back to this repo
  so the canonical template is updated and re-published everywhere.

> **Design principle for everything added here:** modular and opt-in. No project is
> forced to take a system it doesn't want; `project-init` offers each one and skips
> what I decline.

---

## Using it

Once installed as a plugin, start a new project and run the skill:

```
/project-init
```

It will walk you through the setup gates one at a time. Every gate is optional —
skip the ones a given project doesn't need.

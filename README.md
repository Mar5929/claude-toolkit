# claude-toolkit

**My personal, portable toolkit of reusable Claude Code systems: skills, rules,
hooks, and templates that follow me to every project and every device.**

---

## The goal

Every project teaches me something: a rule I wish every agent followed, a hook
that would have caught a mistake, a setup pattern that worked well, sometimes a
whole system worth reusing. Those lessons used to live scattered inside
individual project repos, where they drifted and went stale.

This repo is where they accumulate instead. The loop:

1. **Learn.** While working in any project, I find something worth keeping.
2. **Store.** I open a Claude session in this repo and say some version of
   "I want every new project to also do X." The agent figures out where X
   belongs in the toolkit and folds it in (`CLAUDE.md` tells agents exactly how).
3. **Reuse.** When I spin up a new project, the `project-init` skill walks me
   through setup and brings everything in this toolkit with it. For projects
   that already exist, the `project-sync` skill audits them against the
   toolkit and catches them up.

Each new project starts with everything the previous ones taught me, so my
projects get better and better.

Why one canonical copy matters:

- **Cross-project.** Any new repo gets the same battle-tested setup flow.
- **Cross-device.** Works from my MacBook, my Windows laptop, and (via publish)
  the Claude desktop and web apps.
- **No drift.** When I improve a system while using it inside some project, I
  port the change back here and re-publish. The template and every consumer
  stay in sync.

---

## How it grows

When I tell a session here to "remember" or "add" something, it doesn't just get
written down somewhere. It gets fitted into the system:

| What I bring | Where it lands |
|---|---|
| A rule every project should follow (behavior, writing style, workflow) | A numbered rule in `claude-md-boilerplate.md`, injected into each new project's CLAUDE.md |
| A setup step for new projects | A gate (or part of one) in the `project-init` skill |
| A guard hook or automation | The shared hooks library (on the roadmap; recorded there until it exists) |
| A whole reusable system | Its own plugin/skill that `project-init` offers |

`CLAUDE.md` in this repo gives agents the full instructions for handling these
requests.

---

## How it's distributed (single source, every surface)

This repo is structured as a **Claude Code plugin marketplace**. One repo can hold
many plugins; each plugin bundles skills (and later hooks/commands/agents).

| Surface | How it consumes this repo | How it updates |
|---|---|---|
| **Claude Code** (Mac + Windows, every project) | `/plugin marketplace add Mar5929/claude-toolkit` once per machine, then `/plugin install project-init` | `/plugin marketplace update` (git-pulls) |
| **Claude Code**, no-plugin fallback | clone this repo, symlink `plugins/*/skills/*` into `~/.claude/skills/` | `git pull` |
| **Claude desktop / web** (claude.ai) | upload the skill folder as a Capability/Skill | no git auto-sync; **publish-on-change** from here |

The plugin route is the primary one: a single install per machine, updates with
one command, and it will also carry hooks/commands as this repo grows. The web
and desktop apps don't auto-pull from git today, so I treat them as **publish
targets**: this repo stays the source of truth and I export to them when a
system changes.

---

## Layout

```
claude-toolkit/
  README.md                       ← you are here
  CLAUDE.md                       ← instructions for agents working in this repo
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
        project-sync/
          SKILL.md                ← audit an existing project against the toolkit
    sf-architect-solutioning/     ← plugin: Salesforce solution architect
      .claude-plugin/plugin.json
      skills/
        sf-architect-solutioning/
          SKILL.md                ← the 5-phase solutioning protocol
          references/
            doc-sources.md        ← official Salesforce doc map + fetch recipes
            solution-plan-template.md
            solutioning-checklist.md
            architectural-patterns.md, naming-conventions.md,
            salesforce-well-architected.md, metadata/*.md  ← evergreen references
  docs/
    architecture.html             ← visual map of how the pieces fit
```

Each **concern is its own skill** so it can evolve and be reused independently.
`project-init` orchestrates the setup and references the other systems rather
than hard-coding them, so (for example) the memory architecture can change
without touching the init flow.

---

## What's here now

- **`project-init`**: a skill that walks me through setting up a new project in
  a fixed, skippable order: scaffolding & folder structure, hooks, memory
  system, knowledge layer, CLAUDE.md. It asks before acting, recommends
  per-stack layouts, and injects my standard CLAUDE.md rules, including two
  that every project gets by default:
  - the **multi-agent protocol**: every session works in its own git worktree,
    assumes other agents are working in parallel, and lands work by PR
  - my **language rules**: no em dashes, no section signs, no AI filler
    language, plain explanations for a mildly technical reader
- **`project-sync`**: the same idea for projects that already exist. Point any
  repo at the toolkit and say "make sure everything from the toolkit is set up
  here." It inventories what the toolkit currently ships (so new systems are
  picked up automatically as the toolkit grows), cross-references the project,
  reports the gaps in one table, closes the ones I approve, and records the
  toolkit version it synced against so future runs don't re-nag about a
  deliberate "no".
- **`sf-architect-solutioning`**: a Salesforce solution architect skill. Feed it
  a requirement and it runs a 5-phase protocol: push back and clarify, discover
  the current project's requirement/decision locations from its own CLAUDE.md,
  verify every platform claim against official Salesforce docs (live fetch with
  a curated source map, never memory), design declarative-first to
  Well-Architected standards, and present a solution plan with trade-offs for
  approval before anything gets built. Project-agnostic by design: it never
  assumes a folder structure or ticketing system. Domain-specific, so install
  it only on Salesforce projects.

---

## Planned additions (roadmap)

These are the reusable systems I want to fold in here over time. Ordered roughly
by priority; each becomes its own skill/plugin so `project-init` can pull it in.

- [ ] **`memory-architecture` skill**: my scalable long-term memory system (the
  single-owner Markdown knowledge-graph pattern: `memories/` with `index.json`,
  typed edges, a curator agent, drift detection). Port from the Anchor project
  once its remaining bugs are ironed out. This is the highest-value repeatable
  system and the main reason this repo exists.
- [ ] **`knowledge-layer` skill**: the layer that pins durable knowledge nodes
  to source files and flags them stale when the source drifts.
- [ ] **Shared hooks library**: reusable guard hooks I can drop into any
  project, e.g. blocking deployments to a protected environment, secret-scanning
  pre-commit guards, and a SessionStart orientation hook.
- [ ] **CLAUDE.md boilerplate library**: promote the boilerplate reference into
  a standalone, versioned library that projects reuse verbatim instead of
  retyping.
- [ ] **Publish tooling**: a small script/checklist to export skills to the
  Claude desktop and web apps so those surfaces stay in sync with this repo.
- [ ] **"Port-back" convention**: a documented flow (and a reminder baked into
  each skill) for when I improve a system inside a project: open a PR back to
  this repo so the canonical template is updated and re-published everywhere.

> **Design principle for everything added here:** modular and opt-in. No project
> is forced to take a system it doesn't want; `project-init` offers each one and
> skips what I decline.

---

## Using it

Install once per machine:

```
/plugin marketplace add Mar5929/claude-toolkit
/plugin install project-init
```

On Salesforce projects, also:

```
/plugin install sf-architect-solutioning
```

Then, in a fresh project:

```
/project-init
```

It walks through the setup gates one at a time. Every gate is optional; skip the
ones a given project doesn't need.

For a project that already exists:

```
/project-sync
```

It checks the project against everything in the toolkit, shows what's missing,
and sets up what I approve.

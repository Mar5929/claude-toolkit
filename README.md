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
| A rule every project should follow (behavior, writing style, workflow) | Its own file in the `general-rules/` library, copied into each new project's `.claude/rules/` |
| A setup step for new projects | A gate (or part of one) in the `project-init` skill |
| A guard hook or automation | The shared hooks library (on the roadmap; recorded there until it exists) |
| A whole reusable system | Its own plugin/skill that `project-init` offers |

`CLAUDE.md` in this repo gives agents the full instructions for handling these
requests.

---

## How it's distributed (single source, every surface)

This repo is structured as a **Claude Code plugin marketplace** and a **Codex
plugin marketplace**. One repo can hold many plugins; each plugin bundles skills
(and later hooks/commands/agents where the host supports them).

| Surface | How it consumes this repo | How it updates |
|---|---|---|
| **Claude Code** (Mac + Windows, every project) | `/plugin marketplace add Mar5929/claude-toolkit` once per machine, then `/plugin install project-init` | `/plugin marketplace update` (git-pulls) |
| **Codex CLI / ChatGPT desktop Codex** | `codex plugin marketplace add /path/to/claude-toolkit`, then `codex plugin add <plugin>@claude-toolkit` | `codex plugin marketplace upgrade claude-toolkit`, then reinstall changed plugins |
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
  README.md                       ← you are here: purpose and how it grows
  CLAUDE.md                       ← instructions for agents working in this repo
  .claude-plugin/
    marketplace.json              ← lists the plugins in this repo
  .agents/plugins/
    marketplace.json              ← Codex marketplace pointing at the same plugins
  plugins/
    project-init/                 ← plugin: set up a new project, or sync an existing one
      README.md                   ← what this plugin is
      .claude-plugin/plugin.json
      .codex-plugin/plugin.json
      skills/
        project-init/             ← SKILL.md + references/ (setup-flow, thin-claudemd,
                                     general-rules/, salesforce-rules/, mcp-best-practices)
        project-sync/             ← SKILL.md
    second-brain/                 ← plugin: v1 retirement controls; v2 not shipped
      README.md
      .claude-plugin/plugin.json
      .codex-plugin/plugin.json
      skills/
        second-brain/             ← SKILL.md + archived v1 references; v2 spec lives in docs/
        remember/                 ← SKILL.md
    sf-architect-solutioning/     ← plugin: Salesforce solution architect
      README.md
      .claude-plugin/plugin.json
      .codex-plugin/plugin.json
      skills/
        sf-architect-solutioning/ ← SKILL.md + references/ (doc-sources, metadata/*,
                                     patterns, naming, well-architected, templates)
    git-workflows/                ← plugin: parallel-session-safe git sync
      README.md
      .claude-plugin/plugin.json
      .codex-plugin/plugin.json
      skills/
        pull-latest/              ← SKILL.md
        reset-to-remote/          ← SKILL.md
        merge-and-clean-up/       ← SKILL.md + Codex UI metadata
    session-autoname/             ← plugin: background sessions name themselves
      README.md
      .claude-plugin/plugin.json
      .codex-plugin/plugin.json
      hooks/
        session-autoname.mjs      ← the Stop hook, installed to ~/.claude/hooks/
      skills/
        session-autoname/         ← SKILL.md (one-time per-machine install)
    grill-me/                     ← plugin: persistent discovery interviews
      README.md
      .claude-plugin/plugin.json
      .codex-plugin/plugin.json
      skills/
        grill-me/                 ← SKILL.md + Codex UI metadata
    work-tracker/                 ← plugin: Git-native work status and handoffs
      README.md
      .claude-plugin/plugin.json
      .codex-plugin/plugin.json
      skills/
        work/                     ← SKILL.md + dependency-free Node core
  docs/
    toolkit-map.md                ← the catalog: every item and how they relate
    architecture.html             ← visual map of how the pieces fit
```

Each **concern is its own plugin/skill** so it can evolve and be reused
independently. `project-init` orchestrates the setup and references the other
systems rather than hard-coding them, so (for example) the memory architecture
can change without touching the init flow.

For a one-page index of every plugin and skill, and an honest read on how they
relate (including what looks redundant but is not), see
[`docs/toolkit-map.md`](docs/toolkit-map.md). Each plugin also has its own
`README.md`.

---

## What's here now

Seven plugins. Each has its own `README.md` with the detail;
[`docs/toolkit-map.md`](docs/toolkit-map.md) indexes everything in one place and
explains how the pieces relate.

| Plugin | What it does |
|---|---|
| **[project-init](plugins/project-init/README.md)** | Sets up or syncs a project, offers work-tracker with safe adoption of older folders, and defers second-brain while v2 is unshipped. It can retire approved local v1 wiring without touching cloud resources. |
| **[second-brain](plugins/second-brain/README.md)** | V1 is retired and will not be deployed, exported, or migrated. V2 starts fresh from authoritative Git content but is not shipped. `/remember` remains unavailable. |
| **[sf-architect-solutioning](plugins/sf-architect-solutioning/README.md)** | A Salesforce solution architect: pushes back on vague requirements, verifies platform facts against official docs by live fetch, designs declarative-first to Well-Architected standards, and presents a solution plan for approval before any build. Salesforce projects only. |
| **[git-workflows](plugins/git-workflows/README.md)** | Three parallel-session-safe git lifecycle skills: `pull-latest` gets current without rewriting history, `reset-to-remote` mirrors the remote behind confirmation, and `merge-and-clean-up` lands an approved PR before removing only its completed workspace. |
| **[session-autoname](plugins/session-autoname/README.md)** | Keeps a background agent session named after the overarching project it is working on, never the step it is on. A Stop hook re-checks the label each turn from a cheap Haiku call and holds it steady until the project itself changes, so a long session stops lying in the job list without the name churning. One-time per-machine install, not per project. |
| **[grill-me](plugins/grill-me/README.md)** | Stress-tests a plan, design, or topic through a one-question-at-a-time interview and checkpoints every answer to a durable Markdown file before continuing. |
| **[work-tracker](plugins/work-tracker/README.md)** | Gives Claude and Codex one Git-authoritative backlog with exact handoffs, blockers, typed relationships, deterministic next-item selection, Git landing proof, generated dashboards, and optional GitHub Issues and Projects synchronization. |

---

## Planned additions (roadmap)

These are the reusable systems I want to fold in here over time. Ordered roughly
by priority; each becomes its own skill/plugin so `project-init` can pull it in.

- [ ] **Second-brain v2 rework**: Unit 00 retires v1. The source-only controls
  from PR #65 remain archived and will not be deployed, and legacy memory will
  not be imported. The remaining work will replace
  remote authoritative memory and
  open-ended curator subagents with a Git-native project knowledge system.
  Authoritative behavior stays under `specs/`; decisions, context,
  implementation knowledge, references, domain knowledge, and operations live
  in typed folders under `memory/`. Agents automatically review worthwhile
  knowledge updates at the end of substantial work. The owner can say `yes go`,
  select or edit proposals, or skip them, while `/remember` remains optional.
  The default needs no database or embedding model. Any later database is a
  disposable index rebuilt from Git, never a second source of truth. The
  proposed architecture is indexed in
  [`docs/second-brain-v2/`](docs/second-brain-v2/README.md). This is a design,
  not the currently shipped plugin.
- [x] **`second-brain` v1 retirement controls**: v1 must not be installed,
  deployed, exported, or migrated. The archived implementation remains for
  historical inspection with its default deployment path disabled. Existing
  Worker and Neon resources stay untouched until separately approved for
  deletion. V2 starts from authoritative Git content.
- [x] **`work-tracker` plugin**: a dependency-free Git-native tracker shared
  by Claude and Codex. It owns backlog, active status, blockers, relationships,
  handoffs, and verified landing evidence. Its optional GitHub adapter creates
  or links a Project with the six standard statuses and repository issues
  labeled bug, enhancement, or task.
- [ ] **Shared hooks library**: reusable guard hooks I can drop into any
  project, e.g. blocking deployments to a protected environment, secret-scanning
  pre-commit guards, and a SessionStart orientation hook. First one shipped: the
  Salesforce production-org guard installs from `project-init` Gate 2
  (`references/salesforce-prod-guard-hook.md`); the standalone library is still
  planned.
- [x] **General rules library**: the standard rules are now individual files in
  `project-init`'s `general-rules/` library (with a `README.md` index), copied
  into each project's `.claude/rules/` verbatim instead of retyped into CLAUDE.md.
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

For safe git lifecycle skills (`pull-latest`, `reset-to-remote`,
`merge-and-clean-up`) on any project:

```
/plugin install git-workflows
```

For a persistent brainstorm or discovery interview:

```
/plugin install grill-me
/grill-me
```

For Git-native work tracking, optionally mirrored to GitHub Projects:

```text
/plugin install work-tracker
/work
```

To have background agent sessions keep their own names current (a one-time setup
per machine, not per project):

```
/plugin install session-autoname
/session-autoname
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

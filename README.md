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
    second-brain/                 ← plugin: durable memory, knowledge, and structural layers
      README.md
      .claude-plugin/plugin.json
      .codex-plugin/plugin.json
      skills/
        second-brain/             ← SKILL.md + references/ (architecture-spec, setup-recipe,
                                     profiles/, agents/, hooks/, server/, structural layers)
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
    session-autoname/             ← plugin: background sessions name themselves
      README.md
      .claude-plugin/plugin.json
      .codex-plugin/plugin.json
      hooks/
        session-autoname.mjs      ← the Stop hook, installed to ~/.claude/hooks/
      skills/
        session-autoname/         ← SKILL.md (one-time per-machine install)
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

Four plugins. Each has its own `README.md` with the detail;
[`docs/toolkit-map.md`](docs/toolkit-map.md) indexes everything in one place and
explains how the pieces relate.

| Plugin | What it does |
|---|---|
| **[project-init](plugins/project-init/README.md)** | Sets up a project. `project-init` walks a new project through skippable gates (scaffolding, hooks, memory system, knowledge layer, CLAUDE.md); `project-sync` audits an existing project against the toolkit and closes the gaps I approve. |
| **[second-brain](plugins/second-brain/README.md)** | Durable cross-session memory and knowledge for a project (MCP): a curated typed-node knowledge graph with hybrid recall and a session digest, a knowledge layer whose notes are pinned to file SHAs and flagged when the code drifts, and a structural layer for mechanical impact analysis. The `remember` skill saves a finished work item into it. |
| **[sf-architect-solutioning](plugins/sf-architect-solutioning/README.md)** | A Salesforce solution architect: pushes back on vague requirements, verifies platform facts against official docs by live fetch, designs declarative-first to Well-Architected standards, and presents a solution plan for approval before any build. Salesforce projects only. |
| **[git-workflows](plugins/git-workflows/README.md)** | Two parallel-session-safe git sync skills: `pull-latest` gets current without rewriting or discarding history, `reset-to-remote` hard-resets to mirror the remote behind a confirmation. |
| **[session-autoname](plugins/session-autoname/README.md)** | Keeps a background agent session's name matching what it is actually doing. A Stop hook re-labels the session each turn from a cheap Haiku call, so a long session that drifts off its original task stops lying in the job list. One-time per-machine install, not per project. |

---

## Planned additions (roadmap)

These are the reusable systems I want to fold in here over time. Ordered roughly
by priority; each becomes its own skill/plugin so `project-init` can pull it in.

- [x] **`second-brain` plugin** (shipped; formerly the `memory-architecture` and
  `knowledge-layer` roadmap items): the scalable long-term memory system,
  re-architected onto a remote MCP server (shared Cloudflare Worker + a
  per-project Neon Postgres/pgvector database + GitHub OAuth) so it works from
  both the terminal and cloud sessions. One skill installs it per project: the
  typed-node knowledge graph, the two curator agents, four project profiles,
  per-turn capture, the drift-pinned knowledge layer, and a self-verifying
  database harness.
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

For safe git sync skills (`pull-latest`, `reset-to-remote`) on any project:

```
/plugin install git-workflows
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

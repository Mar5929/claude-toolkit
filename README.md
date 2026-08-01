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
| A guard hook or automation | The [`hooks-library`](plugins/hooks-library/README.md) plugin, if the rule is checkable with no interpretation; otherwise it stays a rule |
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
                                     general-rules/, salesforce-rules/, mcp-best-practices,
                                     tools/ with the permission set and dependency graph tools)
        project-sync/             ← SKILL.md
    second-brain/                 ← plugin: Git-native v3 memory for Claude and Codex
      README.md
      .claude-plugin/plugin.json
      .codex-plugin/plugin.json
      agents/
        memory-librarian.md        ← on-demand writer role shared by both agents
      skills/
        second-brain/             ← SKILL.md + canonical v3 rule, schemas, templates
        remember/                 ← direct owner-approved capture workflow
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
    second-brain-v3/              ← current shipped memory and knowledge specification
  tests/
    orphan-check.mjs              ← fails if the toolkit ships a file nothing points at
    link-check.mjs                ← fails if a Markdown link points at a file that is gone
  archive/
    second-brain-v1/              ← retired implementation, outside installable plugins
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
| **[project-init](plugins/project-init/README.md)** | Sets up or syncs a project, offers work-tracker with safe adoption of older folders, and installs the complete second-brain v3 system when selected. For Salesforce projects it also ships two self-contained tools: the permission set kit, and a dependency graph that answers "if I change this field, what breaks?" from the project's own metadata. Existing-project sync begins with a read-only audit. |
| **[second-brain](plugins/second-brain/README.md)** | Production-ready Git-native Markdown memory and knowledge for Claude and Codex, with one shared rule, typed schemas, owner-approved updates, and an on-demand memory librarian. |
| **[sf-architect-solutioning](plugins/sf-architect-solutioning/README.md)** | A Salesforce solution architect: pushes back on vague requirements, verifies platform facts against official docs by live fetch, designs declarative-first to Well-Architected standards, and presents a solution plan for approval before any build. Salesforce projects only. |
| **[git-workflows](plugins/git-workflows/README.md)** | Three parallel-session-safe git lifecycle skills: `pull-latest` gets current without rewriting history, `reset-to-remote` mirrors the remote behind confirmation, and `merge-and-clean-up` lands an approved PR before removing only its completed workspace. |
| **[session-autoname](plugins/session-autoname/README.md)** | Keeps a background agent session named after the overarching project it is working on, never the step it is on. A Stop hook re-checks the label each turn from a cheap Haiku call and holds it steady until the project itself changes, so a long session stops lying in the job list without the name churning. One-time per-machine install, not per project. |
| **[grill-me](plugins/grill-me/README.md)** | Stress-tests a plan, design, or topic through a one-question-at-a-time interview and checkpoints every answer to a durable Markdown file before continuing. |
| **[work-tracker](plugins/work-tracker/README.md)** | Gives Claude and Codex one Git-authoritative backlog with exact handoffs, blockers, typed relationships, deterministic next-item selection, Git landing proof, generated dashboards, and optional GitHub Issues and Projects synchronization. |

---

## Planned additions (roadmap)

These are the reusable systems I want to fold in here over time. Ordered roughly
by priority; each becomes its own skill/plugin so `project-init` can pull it in.

- [x] **Second-brain v3**: a shared Markdown memory and knowledge system for
  Claude and Codex. Raw discovery uses a flat, dated `brainstorms/` collection.
  Current product and system behavior is organized into capability folders
  under `specs/`. Context, planning, decisions, knowledge, references, domain
  material, and operations are organized by type and project-specific area
  under `memory/`. Root `CLAUDE.md` and `AGENTS.md` files give every session
  the compact folder map and route both agents to one canonical detailed rule.
  Documents use ordinary Markdown backlinks. At approved completion points,
  the main agent proposes every additional durable update it recommends. The
  owner approves, selects, edits, combines, defers, or skips proposals in
  normal language. An on-demand memory librarian writes only the approved
  changes in the task's worktree and pull request. There is no fixed proposal
  limit. The system requires no database, MCP server, runtime scripts, memory
  hooks, embeddings, transcript capture, background curation, or scheduled
  jobs. The current shipped specification is indexed in
  [`docs/second-brain-v3/`](docs/second-brain-v3/README.md), and the plugin
  ships the rule, memory-librarian role, templates, setup, sync, and remember
  workflows. The old v2 proposal is superseded.
- [x] **`second-brain` v1 archive**: the retired Worker, Neon, MCP, curator,
  hook, knowledge-backfill, and structural-layer source has been removed from
  active plugin paths and consolidated under
  [`archive/second-brain-v1/`](archive/second-brain-v1/README.md). It is
  historical evidence only. Existing Worker, Neon, and legacy project data
  remain untouched.
- [x] **`work-tracker` plugin**: a dependency-free Git-native tracker shared
  by Claude and Codex. It owns backlog, active status, blockers, relationships,
  handoffs, and verified landing evidence. Its optional GitHub adapter creates
  or links a Project with the six standard statuses and repository issues
  labeled bug, enhancement, or task.
- [x] **Shared hooks library**: now the `hooks-library` plugin. Ships
  `writing-guard`, a Stop hook that catches em dashes, section signs, and filler
  openers in the finished reply and sends it back to be rewritten. Built after
  measuring real transcripts found those rules broken in a quarter to over half
  of all messages despite being stated in several places. Still to come:
  secret-scanning and a SessionStart orientation hook. The Salesforce
  production-org and permission set guards continue to install from
  `project-init` Gate 2.
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

For Git-native project memory shared by Claude and Codex:

```text
/plugin install second-brain
/second-brain
```

New projects can also select it during `/project-init`; existing projects adopt
it through the read-only `/project-sync` audit.

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

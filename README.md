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
| A rule every project should follow (behavior, writing style, workflow) | Its own file in `library/rules/general/`, copied into each new project's `.claude/rules/` |
| A change to the voice Claude answers in, every turn | `library/output-styles/`, copied into each project's `.claude/output-styles/` and switched on in its settings. Use this only for something already written as a rule: a style is the short operative form, delivered where the session gets reminded of it each turn |
| A setup step for new projects | A gate (or part of one) in the `project-init` skill |
| A guard hook or automation | The [`hooks-library`](plugins/hooks-library/README.md) plugin. A hook does one of three jobs: check an output against a rule a machine can test with no interpretation, trigger a process at a moment agents forget, or orient a session at its start. If it needs none of those, it stays a rule |
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
      library/                    ← everything that gets COPIED INTO a project.
        rules/general/               the standard .claude/rules files (17)
        rules/salesforce/            the extra Salesforce rules (10)
        output-styles/               plain-language.md, the voice Claude answers in
        tools/                       permsets.py and the kb/ dependency graph tool
        templates/                   copy-and-fill starting points
        guides/                      how-to docs for installing the kits above
      skills/
        project-init/             ← SKILL.md + references/: the gate script only
                                     (setup-flow, work-tracking-choice,
                                     work-items-structure, thin-claudemd,
                                     salesforce-project-scaffold)
        project-sync/             ← SKILL.md (reads the same library/)
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
    hooks-library/                ← plugin: hooks that check or re-deliver a rule
      README.md
      .claude-plugin/plugin.json
      .codex-plugin/plugin.json
      hooks/
        style-reminder.mjs        ← re-states the output style every message
        writing-guard.mjs         ← checks the finished reply before it is sent
        guard-protected-orgs.js   ← confirms before a deploy hits a production org
        guard-permission-set-deploy.js ← blocks an unpreflighted permset deploy
      templates/protected-orgs.json  ← the production guard's policy file
      salesforce-prod-guard-hook.md      ← install guide for the production guard
      salesforce-permset-guard-hook.md   ← install guide for the permset guard
      tests/                      ← one harness per hook
      skills/
        hooks-library/            ← SKILL.md (install, verify, remove)
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
    session-summary/              ← plugin: what you asked for, and where it stands
      README.md
      .claude-plugin/plugin.json
      .codex-plugin/plugin.json
      skills/
        session-summary/          ← SKILL.md + Codex UI metadata
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

Eight plugins. Each has its own `README.md` with the detail;
[`docs/toolkit-map.md`](docs/toolkit-map.md) indexes everything in one place and
explains how the pieces relate.

**Installing is always per machine, never per project.** Every plugin here
installs into `~/.claude/` and is then available in every project on that
machine. What actually differs between them is whether a plugin needs anything
inside a project folder before it is useful, which is what the last column says:

| Label | Means |
|---|---|
| Install and go | Nothing to set up. Install once on a machine and use it anywhere |
| Sets up a project | Puts files in the repository. Each project opts in, usually through `project-init` or `project-sync` |
| Wires into settings | Installs a hook by editing a settings file, on the machine or in the project |

| Plugin | What it does | Setup |
|---|---|---|
| **[project-init](plugins/project-init/README.md)** | Sets up or syncs a project. Asks where work items are tracked (a GitHub Projects board, Linear, Jira, files in the repository, or nothing), sets up the board itself for the GitHub answer, and carries the same ticket rules into the project whichever answer it gets. Offers work-tracker with safe adoption of older folders, and installs the complete second-brain v3 system when selected. For Salesforce projects it also ships two self-contained tools: the permission set kit, and a dependency graph that answers "if I change this field, what breaks?" from the project's own metadata. Existing-project sync begins with a read-only audit. | Sets up a project |
| **[second-brain](plugins/second-brain/README.md)** | Production-ready Git-native Markdown memory and knowledge for Claude and Codex, with one shared rule, typed schemas, owner-approved updates, and an on-demand memory librarian. | Sets up a project |
| **[sf-architect-solutioning](plugins/sf-architect-solutioning/README.md)** | A Salesforce solution architect: pushes back on vague requirements, verifies platform facts against official docs by live fetch, designs declarative-first to Well-Architected standards, and presents a solution plan for approval before any build. Salesforce projects only. | Install and go |
| **[git-workflows](plugins/git-workflows/README.md)** | Three parallel-session-safe git lifecycle skills: `pull-latest` gets current without rewriting history, `reset-to-remote` mirrors the remote behind confirmation, and `merge-and-clean-up` lands an approved PR before removing only its completed workspace. | Install and go |
| **[hooks-library](plugins/hooks-library/README.md)** | Hooks that make a rule land mechanically instead of restating it: `style-reminder` puts the project's active output style back in front of Claude on every message, and `writing-guard` reads the finished reply and blocks an em dash or a section sign before it is sent. | Wires into settings |
| **[grill-me](plugins/grill-me/README.md)** | Stress-tests a plan, design, or topic through a one-question-at-a-time interview and checkpoints every answer to a durable Markdown file before continuing. | Install and go |
| **[work-tracker](plugins/work-tracker/README.md)** | Gives Claude and Codex one Git-authoritative backlog with exact handoffs, blockers, typed relationships, deterministic next-item selection, Git landing proof, generated dashboards, and optional GitHub Issues and Projects synchronization. | Sets up a project |
| **[session-summary](plugins/session-summary/README.md)** | Recaps a session as a short numbered list, one line per main request you made, in your own words and in the order you asked, each carrying an honest status. Answers "what did I ask for, and where does it stand?" without a narrative of the assistant's own work. | Install and go |

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
  Documents use ordinary Markdown backlinks. At approved completion points and
  natural stopping points after meaningful work, the main agent proposes every
  additional durable update it recommends. The owner approves, selects, edits,
  combines, defers, or skips proposals in normal language. The main agent must
  invoke the on-demand memory librarian, which writes only the approved changes
  in the task's worktree and pull request. Before merge, it checks changed
  memory against the latest project state for parallel duplicate homes or
  conflicts Git cannot see. Owner-approved cleanup may delete or reorganize
  memory, so the system does not only accumulate files. There is no fixed
  proposal limit. The system requires no database, MCP server, embeddings,
  transcript capture, background curation, or scheduled jobs, and no hook ever
  writes memory. The current shipped specification is indexed in
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
- [x] **Shared hooks library**: now the `hooks-library` plugin. Ships two hooks.
  `style-reminder` puts the project's output style back in front of Claude every
  time I send a message, so the writing instructions are never stale hours into a
  session. `writing-guard` reads the finished reply and blocks on an em dash or a
  section sign, so a slip is caught rather than shipped. The guard was deleted in
  #101 and brought back by #102, narrowed to those two characters; everything
  needing judgement stays with the style, because a wrong block costs me a turn.
  It also holds the two Salesforce guards, the production-org guard and the
  permission set deploy guard, moved here by #126 so every hook in the toolkit
  sits in one place. `project-init` Gate 2 still offers them; it now installs
  this plugin and follows its two guides. Still to come: secret-scanning, a
  SessionStart orientation hook, and the memory pull-request hook (#104).
- [x] **General rules library**: the standard rules are now individual files in
  `project-init`'s `library/rules/general/` folder (with a `README.md` index),
  copied
  into each project's `.claude/rules/` verbatim instead of retyped into CLAUDE.md.
- [x] **Output styles library**: `project-init`'s `library/output-styles/` folder
  (with a `README.md` index), copied into each project's `.claude/output-styles/` and
  switched on in its settings, or into `~/.claude/output-styles/` to cover every
  project on the machine at once. `plain-language.md` is default ON, and it is
  the only home for how Claude talks to me. Rewritten by #102 as a goal, then
  real before-and-after examples, then the rules: real names only and never one
  Claude invented, no figures of speech, common words, the answer first, a shape
  that matches the content, every fact kept, no filler, no em dashes, no section
  signs, quiet between tool calls, and my actions at the end. The four voice
  rules it replaced (`writing-and-language`, `how-to-reply`,
  `treat-owner-as-non-technical`, `define-your-terms`) were all deleted.
  `library/rules/general/` now covers how Claude *works*, not how it *talks*. The one
  cost that stands: a helper agent never sees an output style. Two things cover
  it instead. The `follow-the-output-style` rule sends a helper agent to read the
  style file before it writes a commit message, pull request text, or a document,
  and an agent that writes durable files carries the rules in its own definition.
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

For a recap of what you asked for in a session and where each request stands:

```text
/plugin install session-summary
/session-summary
```

For Git-native project memory shared by Claude and Codex:

```text
/plugin install second-brain
/second-brain
```

New projects can also select it during `/project-init`; existing projects adopt
it through the read-only `/project-sync` audit.

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

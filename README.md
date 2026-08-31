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
| --- | --- |
| A rule every project should follow (behavior, writing style, workflow) | Its own file in `library/rules/general/`, copied into each new project's `.claude/rules/` |
| A rule that must hold in every repository on the machine, even ones I never set up | Its own file in `machine/rules/`, installed for Claude Code and, where needed, as a managed Codex block by `machine-sync`. Only when a project rule genuinely cannot cover it |
| A change to the voice Claude answers in, every turn | Nothing here. The toolkit ships no output style. Every project selects Claude Code's built-in `Concise` style, and a project wanting a different voice sets `outputStyle` for itself |
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
| --- | --- | --- |
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
    project-init/                 ← plugin: set up or sync a project, apply its
                                     file lifecycle, or set up a whole computer
      README.md                   ← what this plugin is
      .claude-plugin/plugin.json
      .codex-plugin/plugin.json
      library/                    ← everything that gets COPIED INTO a project.
        rules/general/               the standard .claude/rules files (15)
        rules/salesforce/            the extra Salesforce rules (10)
        tools/                       permsets.py and the kb/ dependency graph tool
        templates/                   copy-and-fill starting points
        guides/                      how-to docs for installing the kits above
      machine/                    ← machine-wide Claude and Codex material
        README.md                    the test for what belongs here, not in library/
        rules/                       no-ai-attribution.md,
                                     propose-the-best-solution.md,
                                     keep-design-out-of-requirements.md,
                                     activate-project-knowledge.md
        settings/required.json       the attribution values that kill the AI credit lines
      skills/
        project-init/             ← SKILL.md + references/: the gate script only
                                     (setup-flow, work-tracking-choice,
                                     work-items-structure, thin-claudemd,
                                     salesforce-project-scaffold)
        project-sync/             ← SKILL.md (reads the same library/)
        work-item-lifecycle/      ← SKILL.md (applies the file lifecycle rule)
        machine-sync/             ← SKILL.md (reads machine/, writes host homes)
    second-brain/                 ← plugin: Git-native project knowledge for Claude and Codex
      README.md
      .claude-plugin/plugin.json
      .codex-plugin/plugin.json
      hooks/
        knowledge-session-start.mjs ← loads the manual and small project map
        save-reminder.mjs          ← pauses pull requests for the owner-approved save
        work-item-close.mjs        ← asks whether a finished work item left a spec stale
        command-parsing.mjs        ← what a Bash command is about to do, shared by both
      tools/
        build-knowledge-index.mjs  ← rebuilds the memory and spec indexes
        check-knowledge.mjs        ← read-only: bad fields, broken links, secrets
        frontmatter.mjs            ← the one YAML reader both tools use
      skills/
        second-brain/             ← install, audit, convert, and explain the system
        remember/                 ← project scope, search, approval, and save steps
        recall/                   ← task steps for finding saved knowledge
        retire/                   ← supersede, retire, or delete one file
        reflect/                  ← sweep for duplicates and contradictions
        session-search/           ← read-only search of local Claude Code CLI history
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
    hooks-library/                ← plugin: hooks that check a moment mechanically
      README.md
      .claude-plugin/plugin.json
      .codex-plugin/plugin.json
      hooks/
        spec-check-reminder.mjs   ← asks once per session whether spec-check ran
        no-ai-attribution-guard.mjs ← refuses a commit or PR that credits an AI
                                     (machine-wide; installed by machine-sync)
        guard-protected-orgs.js   ← confirms before a deploy hits a production org
        guard-permission-set-deploy.js ← blocks an unpreflighted permset deploy
      templates/protected-orgs.json  ← the production guard's policy file
      salesforce-prod-guard-hook.md      ← install guide for the production guard
      salesforce-permset-guard-hook.md   ← install guide for the permset guard
      tests/                      ← the attribution guard's harness
      skills/
        hooks-library/            ← SKILL.md (install, verify, remove)
    work-tracker/                 ← plugin: flat local work status and handoffs
      README.md
      .claude-plugin/plugin.json
      .codex-plugin/plugin.json
      skills/
        work/                     ← SKILL.md + dependency-free Node core
    session-skills/               ← plugin: the eight things you reach for inside one conversation
      README.md
      .claude-plugin/plugin.json
      .codex-plugin/plugin.json
      agents/
        handoff-verifier.md       ← read-only check of the handoff prompt before you see it
      skills/
        braindump/                ← play a pasted brain dump back in simple words before any work starts
        explain-simply/           ← say that again in plain bullets, keeping every number
        grill-me/                 ← persistent discovery interviews
        handoff/                  ← save what a session learned, then hand it off
        session-summary/          ← what you asked for, where it stands, what needs you
        spec-check/               ← flag what could skew a build before building from a spec
        track-tasks/              ← every topic still open in this session
        unslop/                   ← strip the AI tells out of a draft and put a voice back
        unslop/                   ← strip the AI tells out of a draft and put a voice back
  docs/
    toolkit-map.md                ← the catalog: every item and how they relate
  tests/
    orphan-check.mjs              ← fails if the toolkit ships a file nothing points at
    link-check.mjs                ← fails if a Markdown link points at a file that is gone
    installed-copy-check.mjs      ← fails if a shipped file and the copy this repo runs differ
    knowledge-startup-check.mjs   ← enforces the manual and both hosts' startup contract
  archive/
    second-brain-v1/              ← retired implementation, outside installable plugins
  .claude/                        ← this repo running the toolkit on itself
    rules/                        ← copies of the rules it ships, plus their index
    hooks/                        ← style, writing, startup, and save-reminder copies
    tools/                        ← installed index builder and knowledge checker
    toolkit-sync.md               ← what was set up, skipped, or declined, and why
  knowledge/                      ← this repo's Markdown knowledge vault
    README.md                     ← managed operating manual loaded once
    .obsidian/                    ← portable link settings only
    project.md                    ← short project framing loaded at startup
    current.md                    ← short-term work state, overwritten
    memory-self-improvement.md    ← what the owner counts as memory-worthy
    brainstorms/                  ← unchecked discovery notes
    specs/                        ← approved behavior plus generated index
    memory/                       ← flat persistent topics plus generated index
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

Ten plugins. Each has its own `README.md` with the detail;
[`docs/toolkit-map.md`](docs/toolkit-map.md) indexes everything in one place and
explains how the pieces relate.

**Installing is always per machine, never per project.** Every plugin here
installs into its host's plugin home and is then available in every project on that
machine. What actually differs between them is whether a plugin needs anything
inside a project folder before it is useful, which is what the last column says:

| Label | Means |
| --- | --- |
| Install and go | Nothing to set up. Install once on a machine and use it anywhere |
| Sets up a project | Puts files in the repository. Each project opts in, usually through `project-init` or `project-sync` |
| Wires into settings | Installs a hook by editing a settings file, on the machine or in the project |

| Plugin | What it does | Setup |
| --- | --- | --- |
| **[project-init](plugins/project-init/README.md)** | Sets up or syncs a project. It asks where work is tracked, carries the ticket rules into that tracker, offers work-tracker, and installs or safely migrates the portable `knowledge/` vault when selected. `work-item-lifecycle` applies the file lifecycle rule when project information is created, moved, organized, or completed. New Salesforce projects use `delivery/` for client-work artifacts while existing `engagement/` projects stay in place. `machine-sync` installs the rules, settings, and hooks that must hold across the computer. | Sets up a project, and sets up a machine |
| **[second-brain](plugins/second-brain/README.md)** | A portable `knowledge/` system for Claude, Codex, Git, and optional Obsidian: one managed operating manual, a small shared startup map, flat memory, approved specifications, project-scoped owner-approved saves, task-specific skills, one checker, and safe migration from older layouts. | Sets up a project |
| **[sf-architect-solutioning](plugins/sf-architect-solutioning/README.md)** | A Salesforce solution architect: pushes back on vague requirements, verifies platform facts against official docs by live fetch, designs declarative-first to Well-Architected standards, and presents a solution plan for approval before any build. Salesforce projects only. | Install and go |
| **[git-workflows](plugins/git-workflows/README.md)** | Three parallel-session-safe git lifecycle skills: `pull-latest` gets current without rewriting history, `reset-to-remote` mirrors the remote behind confirmation, and `merge-and-clean-up` lands an approved PR before removing only its completed workspace. | Install and go |
| **[hooks-library](plugins/hooks-library/README.md)** | Reusable hooks that make a rule land mechanically: `spec-check-reminder` asks once per session whether the spec-check review ran, `no-ai-attribution-guard` refuses AI credit in Git text, and two Salesforce guards protect production and permission-set deploys. System-specific knowledge hooks ship with second-brain. | Wires into settings |
| **[work-tracker](plugins/work-tracker/README.md)** | Gives Claude and Codex one local backlog under flat, Git-ignored `.work-items/`: YAML records, owner-approved requirements, exact handoffs, blockers, typed relationships, deterministic next-item selection, Git landing proof, generated dashboards, an `archive/` folder for items the owner has set aside, and preview-first conversion of older staged trackers. Shared GitHub tracking remains a separate tracker choice. | Sets up a project |
| **[session-skills](plugins/session-skills/README.md)** | The eight things you reach for inside one conversation, in one install. `braindump` plays a pasted brain dump back in very simple words and waits for your yes before any work starts. `explain-simply` says the last answer again as short bullets keeping every number, date, path, and name. `grill-me` interviews you one question at a time and writes every answer down before continuing. `handoff` saves what a long session learned, then writes a prompt a fresh session can start from, checked by a second agent first. `session-summary` tables what you asked for and gives each request an honest status. `track-tasks` keeps every still-open topic on the built-in task list. `spec-check` flags anything in a specification that could skew a build before the build starts. `unslop` takes a draft that reads as machine-written, names every tell in it with the fix, and rewrites it with a voice put back. | Install and go |

---

## Planned additions (roadmap)

These are the reusable systems I want to fold in here over time. Ordered roughly
by priority; each becomes its own skill/plugin so `project-init` can pull it in.

- [x] **Project knowledge package**: one portable Markdown knowledge vault under
  `knowledge/`, shared by Claude, Codex, Git, and optional Obsidian. One managed
  `knowledge/README.md` owns the operating policy. The startup hook loads it
  once with SOUL, project framing, current work, and the two generated indexes.
  Flat memory holds one file per topic, specifications hold approved behavior,
  and brainstorms stay unchecked. The focused skills point to the manual and
  keep only their own task steps. The package has one checker and deliberately
  has no database, embeddings, automatic capture, background writer, or large
  always-loaded rule. The current build behavior is specified in
  [`knowledge/specs/knowledge-system.md`](knowledge/specs/knowledge-system.md).
- [x] **`second-brain` v1 archive**: the retired Worker, Neon, MCP, curator,
  hook, knowledge-backfill, and structural-layer source has been removed from
  active plugin paths and consolidated under
  [`archive/second-brain-v1/`](archive/second-brain-v1/README.md). It is
  historical evidence only. Existing Worker, Neon, and legacy project data
  remain untouched.
- [x] **`work-tracker` plugin**: a dependency-free local tracker shared by
  Claude and Codex. It owns backlog, approved requirements, active status,
  blockers, relationships, handoffs, and verified landing evidence in flat,
  Git-ignored `.work-items/` folders. It previews and safely copies the older
  staged format without carrying forward its GitHub mirror.
- [x] **Shared hooks library**: now the `hooks-library` plugin.
  `spec-check-reminder` asks once per session, at the first file edit, whether
  the spec-check review has run, so building from a drifted specification is
  caught as it starts. `no-ai-attribution-guard` refuses any commit or pull
  request whose text credits an AI, on every repository on the machine. It also
  holds the two Salesforce guards, the production-org guard and the
  permission set deploy guard, moved here by #126 so reusable hooks sit in one
  place. `project-init` Gate 2 offers those hooks and follows
  the two Salesforce guides. Second-brain keeps its startup and pull-request
  hooks with the knowledge system whose paths and messages they depend on.
  The two per-message style hooks, `style-reminder` and `writing-guard`, were
  removed in August 2026 as per-message overhead.
- [x] **General rules library**: the standard rules are now individual files in
  `project-init`'s `library/rules/general/` folder (with a `README.md` index),
  copied
  into each project's `.claude/rules/` verbatim instead of retyped into CLAUDE.md.
- [x] **Voice: Claude Code's built-in `Concise` style, and nothing of my own**.
  The toolkit used to ship a hand-written `plain-language` style in a
  `library/output-styles/` folder, which replaced four earlier voice rules
  (`writing-and-language`, `how-to-reply`, `treat-owner-as-non-technical`,
  `define-your-terms`). I removed the whole folder in #245 and switched to the
  built-in `Concise` style everywhere, because I read that voice in every other
  tool anyway and keeping a second one meant maintaining a file nobody selected.
  `project-init` now writes `"outputStyle": "Concise"` into a project's committed
  settings and copies no style file. `library/rules/general/` still covers how
  Claude *works*, not how it *talks*.

  **What I gave up, knowingly.** A built-in style has no file on disk, and a
  helper agent never receives an output style either way. So the helper agents
  that write my commit messages, pull request text, and handoff prompts now get
  no voice instruction at all. `follow-the-output-style` stays and already
  handles a built-in style having no file: it tells a helper agent to write
  plainly. An agent that writes owner-facing prose still carries the writing
  rules in its own definition, and that is now the only place those rules exist
  for helper agents.
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

**On a new computer, run this next, before anything else:**

```
/machine-sync
```

It compares that machine's Claude and Codex homes against the toolkit's machine-wide set
and installs what you approve, so the rules that have to hold in every
repository are in place before you clone one. Run it again after any toolkit
update that touched `plugins/project-init/machine/`.

On Salesforce projects, also:

```
/plugin install sf-architect-solutioning
```

For safe git lifecycle skills (`pull-latest`, `reset-to-remote`,
`merge-and-clean-up`) on any project:

```
/plugin install git-workflows
```

For local work tracking in flat folders that Git ignores:

```text
/plugin install work-tracker
/work
```

For the eight things you reach for inside one conversation, all in one install:

```text
/plugin install session-skills
```

Then use whichever one you need:

```text
/braindump          to hear a pasted brain dump back in simple words before work starts
/explain-simply     when an answer did not land and you want plain bullets
/grill-me           for a persistent brainstorm or discovery interview
/handoff            before you clear context, to not lose what a session learned
/session-summary    for what you asked for and where each request stands
/spec-check         to catch what could skew a build before building from a spec
/track-tasks        for every topic still open in this session
/unslop             to strip the AI tells out of a draft and put a voice back
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

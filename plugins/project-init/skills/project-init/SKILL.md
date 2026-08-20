---
name: project-init
description: >-
  Walk the user through initializing a NEW project, one gate at a time:
  scaffolding & folder structure, guard hooks, the packaged project knowledge
  system, CLAUDE.md and AGENTS.md, the Git-native
  work-tracker, and optional standalone toolkit skills. Use when
  the user is starting a new repo/project and wants help setting up the
  foundational scaffolding, or says things like "initialize this project", "set
  up the scaffolding", "/project-init", or "help me get this new repo going".
  This skill ORCHESTRATES setup: it asks the user how they want each piece,
  recommends options for their stack, and only acts after they confirm. Every
  gate is optional and skippable.
---

# project-init: new-project setup, one gate at a time

Your job is to **collaborate with the user to lay a project's foundations**, not
to impose a template. Walk them through the gates below **in order**. Each gate
is **optional and skippable**: always ask before doing, recommend for their
stack, and move on when they say skip.

(For a project that already exists and needs to catch up with the toolkit, use
the sibling `project-sync` skill instead.)

## How to run this skill

1. **Orient first.** Look at what already exists in the working directory (files,
   language, framework, whether it's an empty repo or has code). A greenfield repo
   and a half-built one need different setups. Never assume; read before you
   recommend.
2. **Announce the plan.** Tell the user you'll go gate-by-gate and that each is
   optional. Offer to jump straight to any gate they care about.
3. **Work one gate at a time.** For each: briefly explain what it's for,
   recommend a default for _their_ stack, ask how they want it (or to skip),
   act only after they confirm, and summarize what you did before moving on.
4. **Track progress** so the user always knows where they are (e.g. a short
   checklist you update as gates complete).
5. **Close out** with the wrap-up in the last section.

Do **not** dump all the questions at once. This is a guided conversation, not a
form. Keep each gate tight.

---

## The gates (in order)

### Gate 1: Scaffolding & folder structure

**Purpose:** a sensible directory layout and starter files for the project's stack.

- Identify the stack (ask if unclear: language, framework, app vs. library vs.
  service, monorepo or single package).
- **Recommend** a conventional layout for that stack, and explain the _why_ in a
  sentence or two; don't just emit a tree. Offer 1-2 variants if there's a real
  choice (e.g. `src/`-layout vs. flat).
- Cover, as relevant: source dirs, tests, config, `.gitignore`, a starter README,
  license, editor/formatter config, CI stub.
- Create only what the user approves. Prefer conventional tooling for the stack;
  don't invent structure.
- **Write each major folder's own `CLAUDE.md` at the same time as the folder**,
  even when the folder starts empty. It is a short file saying what the folder
  holds, how to work in it, and where the detail lives, and Claude Code loads it
  only when an agent reads a file in that folder. That is what lets the root
  `CLAUDE.md` stay short without losing the detail. Read
  `references/folder-claudemd.md` first: it says what goes in one, what never
  does, which folders get one, and which are skipped (any folder with a
  `README.md` index, everything under `.claude/`, and the complete
  `knowledge/` tree). Record every skip so the
  wrap-up summary and a later `project-sync` can tell a considered skip from an
  oversight. Never create a nested `AGENTS.md`.

> This gate is intentionally per-project: the value is your tailored
> recommendation, not a frozen template.

**Work tracking (every stack).** Ask, as its own question and not folded into the
folder-layout question: "Where do you track work items for this project?" Offer a
GitHub Projects board, Linear, Jira, files in this repository, the BMAD method,
or somewhere else / nothing yet. `references/work-tracking-choice.md` carries the exact wording,
what each answer does, and the step-by-step setup for a GitHub Projects board.
Read it before asking.

Whatever the owner names, two things then hold in that project: every piece of
work is logged in that tracker before it is built, and nothing is built until a
refinement session has filled in the six-part spec. Those live in the
`library/rules/general/spec-before-you-build.md` rule, copied in Gate 5. Gate 5 also adds
a one-line structural pointer to `CLAUDE.md` and `AGENTS.md` naming the tracker.

A GitHub Projects board is the only answer where the toolkit builds the tracker
itself, and it creates nothing without explicit approval: no board, no statuses,
no labels, no issues. The BMAD method is the only other answer where the toolkit
sets anything up, and there it only runs BMAD's own installer, with approval.
The toolkit creates and changes nothing inside Linear, Jira, or any other
external tracker.

For "files in this repository", install `work-tracker` from this marketplace and
run its `init` command, as described in `references/work-items-structure.md`.
`init` preserves and safely adopts an existing manual tree. Most projects place
it at `work-items/`; new Salesforce projects place it at
`delivery/work-items/`. Existing Salesforce projects may keep
`engagement/work-items/`; never move them automatically.
Do not hand-create a competing tracker.

For "the BMAD method", offer to run `npx bmad-method install` and run it only
with a yes, as described in `references/work-tracking-choice.md`. BMAD holds the
work itself, so never pair it with `work-tracker` or a hand-built board, and
never write a six-part `SPEC.md` beside its stories. Its own planning workflows
are the refinement session.

If the owner answers "somewhere else, or nothing yet", write nothing about
tracking, and record that they were asked and declined so `project-sync` does not
raise it every run.

**Salesforce / SFDX projects** have a standard scaffold worth reusing: see
`references/salesforce-project-scaffold.md`. Offer it whenever the stack is
Salesforce (org build, org merge, or managed service). It stays optional and is
still confirmed folder-by-folder with the owner; it is a starting point, not a
forced template.

Do not create `delivery/knowledge-base/` during Gate 1. Gate 3 owns the project
knowledge choice. When the owner selects project knowledge, `knowledge/` is the
one curated home. When they decline it, a delivery knowledge base may be offered
separately if the project needs one.

**Salesforce project rules library.** When the stack is Salesforce, after the
`.claude/rules/` folder is scaffolded, offer to copy in the reusable Salesforce
rules from `../../library/rules/salesforce/` (each is a standalone `.claude/rules/`
file, e.g. the deploy hitch-hiker check). See that folder's `README.md` for the
current list. They are opt-in and confirmed with the owner; skip the ones a
given project does not want. Make sure the project's CLAUDE.md points at
`.claude/rules/` (Gate 5) so these files are read each session.

**Salesforce dependency graph.** Offer the kit in
`../../library/guides/salesforce-dependency-graph.md` whenever the stack is Salesforce,
and recommend it on an org merge or any org large enough that "if I change this
field, what breaks?" is a recurring question. Like the permission set kit it is
one unit, not a loose rule: the tool in `../../library/tools/kb/` copied to the
project's `tools/kb/`, the gitignore entries, the
`library/rules/salesforce/dependency-graph.md` rule, and the freshness hook in Gate 2.
The tool reads only local `force-app/` files and never contacts an org.

### Gate 2: Hooks (guards & automation)

**Purpose:** wire up Claude Code hooks that enforce guardrails or automate chores.

Ask what the project needs protecting from or automated. Common ones:

- **Environment / deployment guards**: block or require confirmation before
  commands that deploy to a protected environment (e.g. prod), push to a protected
  branch, or run destructive operations.
- **Secret-leak guards**: pre-commit / pre-tool checks that stop secrets or
  ignored files from being committed.
- **SessionStart orientation**: print project state and hard rules at the top of
  each session.
- **Format/lint on save or pre-commit.**

For each requested hook: confirm the exact trigger and action, write the hook
config (and any script), and tell the user how to verify it fires.

**Salesforce / SFDX projects**: offer the ready-made production-org guard. It
confirms before any deploy or destructive `sf`/`sfdx` command hits a production
org, auto-detects which orgs are production, and is tuned by a plain JSON policy
file. Copy and configure, no code to write. Still optional and confirmed with
the owner.

Whenever the permission set rule was accepted in Gate 1, also offer the
permission set deploy guard. It blocks any deploy shipping a permission set that
has not been preflighted. That is the one step whose omission silently and
irreversibly deletes grants, and Salesforce's own `deploy validate` and `deploy
preview` cannot detect it. Both guards live in the same `Bash|PowerShell`
PreToolUse matcher.

Both guards ship from the `hooks-library` plugin, which holds every hook in the
toolkit. Install it from this marketplace (`/plugin install hooks-library`), then
follow its `salesforce-prod-guard-hook.md` and `salesforce-permset-guard-hook.md`
step by step. Do not retype or maintain copies here. Tell the owner the plugin is
only needed while setting the guards up: the install copies the hook files into
the project, so afterwards the project runs them on its own.

Whenever the dependency graph was accepted in Gate 1, also wire its freshness
Stop hook (step 4 of `../../library/guides/salesforce-dependency-graph.md`). Without it
the graph is a snapshot that quietly ages; with it, a metadata change rebuilds
the graph and names the connections that moved. Unlike the two guards above it
is a Stop hook and it lives inside `tools/kb/`, because it imports the rest of
the tool.

**Every project**: offer both general hooks from the `hooks-library` plugin
(`/hooks-library`). Both are default ON.

- `style-reminder` puts the project's output style back in front of the session
  every time the owner sends a message. Offer it because measurement showed
  voice rules are stated clearly in several places and broken in a quarter to
  over half of all messages anyway: a rule applied once per message does not
  survive one delivery at session start.
- `writing-guard` reads the finished reply and hands it back if an em dash or a
  section sign slipped through, so the owner never sees the bad version. Say the
  cost: when it fires the turn takes slightly longer, because the reply is
  written twice.
`style-reminder` and `writing-guard` only work next to an installed output
style, so they pair with Gate 5; if the owner skips the style, skip those two.

The project knowledge package owns its own startup hook, pre-write guard, and
pull-request save reminder. Gate 3 installs all three with the system. Do not
install the retired `memory-pr-hook` or `wrap-up-ritual.md` path from this gate.

> Other reusable hooks (secret-scan and session-start orientation) are still
> planned for the `hooks-library` plugin. Until they land, author any other hook
> for the project directly. A hook may enforce a rule or start a review; no hook
> writes memory.

### Gate 3: Project knowledge system

**Purpose:** install the packaged Git-native memory system, version 2, so Claude
and Codex share one project identity, one current state, one map of where things
live, approved specifications, and four kinds of durable memory.

Offer this gate to every project, whatever its domain. Software, Salesforce,
research, health, and client delivery all get the same core. The core is small
on purpose, and nothing in it is domain-specific.

**The authority split, in plain language:**

- `knowledge/project.md` is the project identity and the whole settings surface.
  There is no second settings file.
- `knowledge/current.md` is where the work stands right now: current focus,
  blockers, next step, and handoff. A new session reads it instead of guessing
  from conversation history.
- `knowledge/map.md` says what each role means here and which folder it already
  resolves to.
- `knowledge/specs/` is current approved behavior.
- `knowledge/memory/` holds four record types and only four: `facts/`,
  `decisions/`, `events/`, and `patterns/`. Every durable memory gets the one
  type that matches what the record means. A subject area such as Salesforce,
  Gearset, health, or research is a field on the record, never a fifth folder
  and never a second copy of the record.
- The mapped reference area holds outside documentation, web-crawl results, and
  agent-written research. That material stays outside durable memory.
- The work tracker owns live work state.
- Git owns exact history.

**Before installing:**

- Ask the owner for the real framing that goes in `knowledge/project.md`: what
  the project is, why it exists, what finished looks like, its main workstreams
  and boundaries, who is involved, and where active work is tracked. Never
  invent that framing, and never ship the template placeholder as if it were
  the answer.
- Show the complete `knowledge/` tree, the two hooks, the settings changes, and
  the Codex route block, then get approval for the whole thing at once.
- Treat the tree, the tools, both hooks, the settings entries, the gitignore
  entry, and both host startup routes as **one adoption unit**. A project that
  takes the folders without the write guard, or the hooks without the tools, is
  a broken install, not a light install. Do not offer a partial variant.

**Install steps, once approved.** Install `second-brain` from this marketplace
first. `<plugin>` below is that plugin's folder on this machine, normally
`~/.claude/plugins/marketplaces/claude-toolkit/plugins/second-brain`.

1. Copy `<plugin>/skills/second-brain/references/templates-v2/knowledge/` to the
   project's `knowledge/`. That is the required core: `project.md`, `current.md`,
   `map.md`, `specs/`, and the four memory folders, each holding a `.gitkeep`
   until its first record.
2. Fill in the front matter of `knowledge/project.md` with the owner. The keys
   are described under "Front-matter settings" below. Replace the whole body
   with the framing they gave you.
3. Fill in `knowledge/map.md`. The required-core rows are fixed. For every other
   row, point at a folder the project already has, or delete the row. See
   "Mapping, not moving" below.
4. Rewrite `knowledge/current.md` from whatever handoff material the project
   already has, or leave the four sections empty and let startup report it as
   stale until the first approved update. Set the `updated` date.
5. Copy the plugin's `tools/` folder into `.claude/tools/`, keeping `lib/`
   inside it. Copy everything there except the retired version 1 tools
   `build-knowledge-index.mjs` and `knowledge-health.mjs`. The tools import each
   other by relative path, so copy the folder rather than picking files.
6. Copy `<plugin>/hooks/boot-brief-session-start.mjs`,
   `<plugin>/hooks/memory-write-guard.mjs`, and `<plugin>/hooks/save-reminder.mjs`
   into `.claude/hooks/`. The hooks reach the tools as `../tools/`, so
   `.claude/tools/` from step 5 has to be its sibling.
7. Merge `<plugin>/skills/second-brain/references/templates-v2/claude-settings-snippet.json`
   into the project's `.claude/settings.json`. Merge, never replace: the file
   usually already carries an output style and other hooks. The snippet brings
   `CLAUDE_CODE_DISABLE_AUTO_MEMORY` set to `1`, which turns off the host's own
   private auto-memory so this system is the only one recording anything;
   `second-brain@claude-toolkit` enabled; and the `memory-write-guard.mjs`
   `PreToolUse` registration. Then add the `SessionStart` registration for
   `boot-brief-session-start.mjs` and the `Bash` `PreToolUse` registration for
   `save-reminder.mjs`. Write the project variable in braced form,
   `${CLAUDE_PROJECT_DIR}`, in every hook command: that is the form the startup
   check reads when it confirms the registered hook file is really there.
8. Append `<plugin>/skills/second-brain/references/templates-v2/gitignore-snippet.txt`
   to the project's `.gitignore`. It ignores `.memory/`, which holds a lock or a
   crash-recovery journal during an approved write. That folder is disposable,
   never canonical, and never committed.
9. Write the Codex startup route into root `AGENTS.md`. The exact block, its two
   markers, and the setup and sync steps are in the second-brain skill. Claude
   Code gets the same meaning automatically from the `SessionStart` hook, so the
   two host routes are two deliveries of one meaning and have to keep saying the
   same five things: the boot brief runs first, the memory tool path and the
   capabilities call, the four skills by name, the guarded paths and that only
   the write operations may change them, and that approval comes from the owner
   and nothing stands in for it.
10. Verify before you call the gate done. Run
    `node .claude/tools/memory.mjs validate` from the project root and read the
    result. Every check has to pass, warn, or say why it was skipped. A fresh
    project normally warns on the retrieval gold set, which is expected and
    blocks nothing. Then run the boot brief once and read what it prints.

**Front-matter settings.** `knowledge/project.md` carries the whole
configuration surface:

- `schema_version: 2`, which is what tells every tool this is a version 2
  project.
- `project_id`, a stable identity that scopes pins, retrieval, and
  session-history search. It never changes when the folder moves, and a machine
  path is never used as the identity.
- `project_root` and `subroots`, the physical scope. Only the owner changes
  them, and the write guard refuses an agent route that tries.
- `privacy`, the approved boundary. A missing or unreadable value reads as the
  most restrictive setting. Nothing outside this file widens it.
- `profiles`, the optional domain profiles. An empty list is normal.
- `tracker`, optional. Without it the project still works and current state
  comes from `knowledge/current.md` alone.
- `startup.budget_bytes`, optional, defaulting to 10240.

**Mapping, not moving.** When the project already has an authoritative home for
rules, skills, active work, delivery material, source records, or references,
map that home in `knowledge/map.md` and leave it exactly where it is. Never move,
copy, or rename project material to fit the shape the map prefers. A role with
no home yet is deleted from the table or marked `not present`. Absence is not an
error, and an empty folder is never created to fill a row.

**Create optional areas only when they are used.** An identity file, a reference
area, a brainstorm area, a profile, and `.memory/` local state are all optional.
Their absence must not break anything. Do not scaffold them at setup.

**Outside documentation and research.** Official product documentation,
web-crawl results, and agent-written research notes live in the mapped reference
area, not in `knowledge/memory/`. Each reference names its original source, the
date it was retrieved, the version or snapshot when that is known, and whether
anyone verified it. Downloading or summarizing something does not make it
project truth. A conclusion becomes a fact, decision, event, or pattern only
through the normal owner approval flow, and the record links back to the
evidence. Approved project behavior learned from outside documentation belongs
in a specification, and a reusable process learned from it belongs in a skill.
Neither is copied into memory as well.

**Domain profiles.** A project may enable one or more profiles by listing them
in `profiles`. A profile adds fields, routes, validation, and privacy warnings
that its domain needs. It never replaces the core and never weakens approval,
provenance, authority, scope, or privacy. If a proposed profile would relax any
of those, it is not a profile and this gate does not install it. Offer a profile
only when the project actually uses it; an empty `profiles` list is the normal
state.

**Removability.** The owner can take this system back out without breaking the
rest of the toolkit. Removal unregisters the two hooks, removes the copied tools
and skills, and leaves `knowledge/` content, project specifications, source
references, rules, skills, and work-tracker records in place. The steps are in
the second-brain skill. Say this at the gate so the owner knows the decision is
reversible.

**After installation:** offer the first persistent-information pass. The main
agent shows short What, Where, Why, Assumptions, and Unverified bullets, then
writes only the meaning the owner approves. Full file text appears only when the
owner asks.

**Never:**

- Never add a database, memory MCP server, embeddings, transcript capture, or a
  background curator. Hooks load and remind; they never approve or write durable
  memory.
- Never write into `knowledge/memory/`, `knowledge/specs/`, or
  `knowledge/current.md` by hand or with a shell command. Those paths change only
  through `memory.mjs` write operations, and only with the owner's approval. The
  write guard refuses the rest.
- Never install the retired version 1 pieces: `knowledge/index.md` and its
  builder, `knowledge/memory/tags.md`, the seven old memory folders, the
  `knowledge-session-start.mjs` loader, the health tool, the `memory-pr-hook`
  plus `wrap-up-ritual.md` path, or any Worker, Neon, curator, outbox, or cache
  content.
- Never create per-folder README indexes or a folder `CLAUDE.md` inside
  `knowledge/`. Its contract is owned by the root routes, the map, and the
  memory-system specification.

### Gate 4: Optional mechanical knowledge aids

**Purpose:** optional impact-analysis tools that support, but never replace, the
Markdown knowledge system.

- Do not offer a second or competing knowledge system. When Gate 3 was
  approved, the four memory types and the mapped reference area already provide
  the persistent knowledge layer.
- Mark this gate **available alongside project knowledge** when Gate 3 ran, or
  **independent of project knowledge** when the owner declined Gate 3.
- Explain that a dependency graph is a separately optional analysis aid for
  brownfield work, not required memory infrastructure and not automatically
  authoritative. It answers what connects to what; only a person records why.
  There are two, by stack: `../../library/guides/salesforce-dependency-graph.md` for
  Salesforce (offered in Gate 1) and `../../library/guides/graphify-dependency-graph.md`
  for every other kind of code. A project installs at most one.
- **On a non-Salesforce project, offer the graphify kit here** when the owner
  wants mechanical impact analysis. It has four parts and they ship together:
  the tool, the `graphify-out/` gitignore entry,
  `library/rules/general/dependency-graph.md` copied to `.claude/rules/` (Gate 5), and
  the auto-rebuild git hooks. The rule is what makes a session use the graph
  instead of searching text; the hooks are what stop it going stale. Tell the
  owner the one thing the hooks cannot do: they are not committed, so every
  fresh clone needs `graphify hook install` run once.
- Do not install the retired v1 knowledge curator, drift hooks, SHA pins, or a
  database-like graph.

### Gate 5: CLAUDE.md and the rules folder

**Purpose:** the project's orientation file that every future session reads
first, plus the `.claude/rules/` folder that holds the behavioral rules.

The behavioral rules do NOT go inside CLAUDE.md. They are individual files in the
project's `.claude/rules/` folder, copied from the toolkit's rules libraries.
CLAUDE.md stays thin and points at that folder. Read `references/thin-claudemd.md`
for the exact structure, and `../../library/rules/general/README.md` for the rule
list.

- **Copy the general rules** the owner wants from `../../library/rules/general/`
  into the project's `.claude/rules/`. Every default-ON file goes in unless the
  owner drops it; walk the list and let them accept, edit, or skip each. Adapt
  wording to the project's voice if they want; each file is the intent, not
  fixed prose. The project knowledge procedure comes from Gate 3's installed
  plugin and is not duplicated as a general rule. No retired memory rule or
  verifier belongs in the active rule library.
- **Default-ON rules** cover the multi-agent worktree protocol (own worktree per
  session, assume parallel agents, land by PR), the language rules (no em dashes,
  no section signs, no AI filler, plain language), and the working-style rules
  (lead with the answer; answer last and ask only in the question box; solve the
  real goal and push back; define terms; ask before assuming; offer a handoff in
  a loaded session; steer the session to the goal; do the technical work
  yourself; one folder per work item; show phase progress; treat the owner as
  non-technical). Every new project gets these unless the owner explicitly opts
  that project out.
- **Salesforce projects:** the `library/rules/salesforce/` files the owner chose in Gate
  1 also live in `.claude/rules/`; make sure they are there.
- **Conditional general rules** only go in when the project has the thing they
  govern. `library/rules/general/README.md` marks them. Today that is
  `dependency-graph.md`, which goes in when the graphify code graph was accepted
  in Gate 4. A Salesforce project gets the `library/rules/salesforce/` file of the same
  name instead; never both.
- **MCP tool rules are conditional.** If the project connects an MCP server
  covered in `../../library/guides/mcp-best-practices.md` (Context7, Gmail, Google
  Calendar, Linear, Notion, Playwright), fold in that server's section (as a
  short CLAUDE.md section or its own `.claude/rules/` file). Skip the servers the
  project doesn't use.
- **`spec-before-you-build.md` never ships alone.** It reads the tracker's name
  out of the root instructions and tells an agent to stop and ask when none is
  there. Copy it only when Gate 1's tracking question was answered with a real
  tracker, and write the pointer named below in the same pass. When the answer
  was "somewhere else, or nothing yet", skip the rule too and record the
  decline.
- **Write the thin CLAUDE.md** _with_ the user, walking the sections rather than
  generating a wall of text: what the project is, the codemap and structural
  pointers, a `Read .claude/rules` line, and which gates ran. Among the
  structural pointers, include the one-line work-tracking pointer from
  `references/work-tracking-choice.md`, naming the tracker Gate 1 settled on and
  how a refined ticket is marked. Add the identical line to `AGENTS.md`. Reflect what the
  earlier gates set up. When project knowledge was installed, keep a short
  route in both files. `CLAUDE.md` names the fail-open boot-brief
  `SessionStart` hook, the write guard, and `knowledge/`. `AGENTS.md` carries
  the Codex startup-route block from Gate 3 step 9, which runs the boot brief
  first. Neither copies the complete system specification.
  Keep other behavioral rules out of the root files.
- **Keep the codemap to one line per folder**, and let that line point at the
  folder's own `CLAUDE.md` for the detail. Four things never leave the root
  file, because an agent needs them before it opens any folder: how to talk to
  the owner, the pointers to the most dangerous rules, the project-knowledge
  startup route, and the codemap lines themselves. `references/thin-claudemd.md` has
  the list under "What must stay in the root file".
- **`AGENTS.md` keeps the folder detail in full.** Codex reads it and never
  reads any `CLAUDE.md`, root or nested, so anything the root `CLAUDE.md` handed
  off to a folder file stays written out in `AGENTS.md`. The two root files are
  meant to differ in length. Never write a nested
  `AGENTS.md` to close that gap.
- **Add a `.claude/rules/README.md`** that indexes what each copied rule file
  does, so the folder is self-describing.
- **Install the plain-language output style** (default ON). Copy
  `../../library/output-styles/plain-language.md` to the project's
  `.claude/output-styles/`, and set `"outputStyle": "plain-language"` in the
  project's committed `.claude/settings.json`. This is the project's only home
  for how Claude talks: written for a non-technical reader, real names only and
  never one Claude invented, no figures of speech, common words, the answer
  first, a shape that matches the content, every fact kept, no filler, no em
  dashes, no section signs, quiet between tool calls, and the owner's actions at
  the end. There are no voice rules in `.claude/rules/` any more; do not write
  one. Pair it with the two Gate 2 style hooks: `style-reminder` re-states the
  style on every message so it does not go stale in a long session, and
  `writing-guard` checks the finished reply for an em dash or a section sign.
  See
  `../../library/output-styles/README.md`. Tell the owner it takes effect on their
  next session, not the current one, and that a helper agent never sees an
  output style, which is why `follow-the-output-style.md` is in the rules folder.
- **Offer the machine-wide install too**, if the owner wants this voice
  everywhere and not just here. Copy the same file to
  `~/.claude/output-styles/plain-language.md` and set `"outputStyle"` in
  `~/.claude/settings.json`. Then every project gets it, including ones that were
  never set up with this toolkit. The project copy still wins where it exists,
  and it is the one that travels to other machines, so doing both is normal.

### Gate 6: Optional standalone toolkit skills

**Purpose:** offer reusable workflows that are useful in this project but live
in their own plugins.

- **Offer `session-skills` as one plugin, and recommend it.** It holds five
  skills that run inside a conversation: `explain-simply`, `grill-me`,
  `handoff`, `session-summary`, and `track-tasks`. They install and version
  together, so this is a single yes or no, not five. If approved, install the
  plugin from this marketplace. Do not copy any `SKILL.md` into the project.
  Describe each one in the owner's terms, using the notes below.
- `explain-simply` says an answer again as short bullets when it did not land
  the first time, keeping every number, date, file path, and name. It re-reads
  nothing, so it cannot quietly change the answer.
- `grill-me` asks one question at a time and writes every answer down before
  continuing. When project knowledge is installed it writes into the project's
  mapped brainstorm area, which is created the first time it is used and not
  before. Explain that it ends by invoking `remember` for any resulting
  specification or durable-memory updates. Raw discovery stays
  non-authoritative and never becomes project truth on its own.
- `session-summary` returns a table with one row per request the owner made, in
  their own words, each with a status such as done, partly done, blocked, or
  waiting on you, and then a block naming whatever still needs them. It reads
  the conversation and writes nothing, so it does not compete with the work
  tracker.
- `track-tasks` keeps every still-open topic in the session on Claude Code's
  built-in task list, and `/track-tasks` prints it. Say what it catches that is
  easiest to lose: topics the owner parked, questions asked of them that they
  never answered, and work blocked behind something else. Say its limit out
  loud, because the skill does: the list dies with the session, so anything that
  has to outlive the conversation moves to the work tracker or into a handoff
  prompt. It pairs with the `track-open-topics.md` rule from Gate 5, which makes
  a session keep the list without being asked. That rule names no skill, so
  taking the rule without this plugin is a valid choice and leaves nothing
  stale.
- `handoff` is the one to press hardest on. Explain what it does in
  the owner's terms: when a session gets long and they want to start fresh,
  typing `/handoff` first shows them a table of what is worth saving from that
  session, they approve or cut rows, and then they get a prompt to paste into
  the new chat with everything else carried inside it. Say why it matters: the
  longest sessions produce the most understanding and lose the most, and nothing
  can catch `/clear` after the fact. Say what happens to the prompt itself: it
  opens with the goal of the work and why it matters, and a second agent that
  never saw the conversation checks it against the repository before the owner
  sees it, so facts do not get less accurate each time work is handed on.
  Anything that cannot be confirmed is labelled inside the prompt rather than
  dropped, and `/handoff check` runs that check on a prompt they already have.
  It needs no output style, no project knowledge system, and no hooks. In a
  project without project knowledge it skips the saving step and puts everything
  in the prompt.
  It pairs with the `offer-context-handoff.md` rule from Gate 5, which is what
  makes the same thing happen when the owner asks in their own words instead of
  typing the command.
- Record whether the owner installed, skipped, or deferred each one so a later
  `project-sync` respects that choice.

---

## References

Two piles, and the difference matters. `references/` is this skill's own script:
how to run a gate. `../../library/` is what lands in the project: rules, styles,
tools, templates, and the guides that install them. `project-sync` reads the same
library.

### This skill's own script: `references/`

- `references/setup-flow.md`: the gate-by-gate checklist to track progress
  against during the run.
- `references/work-tracking-choice.md`: the Gate 1 question about where work
  items are tracked, what each of the five answers does, and the step-by-step
  setup for a GitHub Projects board. Read it in Gate 1, before asking.
- `references/work-items-structure.md`: how Gate 1 initializes the `work-tracker`
  plugin when the owner chose to track work as files in this repository,
  including safe adoption of the older manual tree and the optional GitHub
  Project mirror of those files.
- `references/salesforce-project-scaffold.md`: the standard Gate 1 layout for a
  Salesforce / SFDX project (SFDX source plus a `delivery/` tree). Read it in
  Gate 1 when the stack is Salesforce.
- `references/thin-claudemd.md`: how Gate 5 writes a thin CLAUDE.md that points
  at `.claude/rules/` instead of holding the rules inline, and what must stay in
  the root file.
- `references/folder-claudemd.md`: the short `CLAUDE.md` Gate 1 writes inside
  each major folder. What goes in one, what never does, which folders get one,
  and which are skipped. Read it in Gate 1, before creating folders.

### What lands in the project: `../../library/`

- `../../library/rules/general/`: the standard `.claude/rules/` files (with its
  own `README.md` index) to copy into every project in Gate 5. Active rules are
  default ON unless the owner opts out. Retired v1 examples are not part of this
  library.
- `../../library/rules/salesforce/`: a growing set of reusable `.claude/rules/`
  files for Salesforce projects (with its own `README.md` index). Offer these in
  Gate 1 after `.claude/rules/` is scaffolded, when the stack is Salesforce.
- `../../library/output-styles/`: the `.claude/output-styles/` files (with its
  own `README.md` index) that set the voice Claude answers in, installed in
  Gate 5. `plain-language.md` is default ON. Read the index for why an output
  style sits alongside the voice rules rather than replacing them.
- `../../library/tools/permsets.py`: the tool the permission set rule depends on
  (fetch, verify, check, tidy, preflight). Copy to `tools/permissions/` in the
  project. The rule without the tool is advice with no enforcement.
- `../../library/tools/kb/`: the dependency graph tool itself, with its own
  `README.md` covering scopes, determinism, and known limits. Copy the whole
  folder to `tools/kb/` in the project; the orchestrator imports every file.
- `../../library/templates/permissions-runbook.md`: the project-side runbook to
  copy and fill in when permission sets are tracked.
- `../../library/guides/salesforce-permissions-retrieval.md`: the end-to-end
  process for keeping permission sets in source control safely, and what to do
  about profiles (excluded by default). Covers the four-part install, the
  one-time proof that a retrieve is complete on this org, the trap list, and the
  known retrieve blind spots. Read it when a Salesforce project wants its
  permissions picture in git.
- `../../library/guides/salesforce-permissions-research.md`: the evidence behind
  that runbook. The live verification result, the permission set element
  reference, the tracked Salesforce CLI bugs, the tooling landscape, options
  considered and rejected, and the full source list with dates. Read it before
  re-researching any permission set question or re-litigating the process.
- `../../library/guides/salesforce-dependency-graph.md`: how Gate 1 installs the
  Salesforce dependency graph kit (tool, gitignore entries, rule, and the Gate 2
  freshness hook), how to verify it, and how to use it to write up an org that
  already has a lot of metadata. Read it in Gate 1 when the stack is Salesforce.
- `../../library/guides/graphify-dependency-graph.md`: the same job for every
  non-Salesforce stack, using the open-source graphify tool. Read it in Gate 4
  when the owner wants impact analysis on code the bundled Salesforce parser
  cannot read.
- `../../library/guides/mcp-best-practices.md`: per-server MCP tool rules to
  offer in Gate 5, but only for the MCP servers the project actually uses.

### Not here: every hook

Both Salesforce guards live in the `hooks-library` plugin with every other hook
in the toolkit: the production-org guard (`salesforce-prod-guard-hook.md`) and
the permission set deploy guard (`salesforce-permset-guard-hook.md`). Gate 2
installs that plugin and follows those two guides.

Read a reference when you reach the gate that needs it; you don't need to load
everything up front.

---

## Wrap-up (always do this at the end)

1. **Summarize** what was set up and what was skipped, so the user has a clear
   record. Include the folder `CLAUDE.md` files: which folders got one, and
   which were skipped and why.
2. **Note follow-ups**: anything a skipped gate leaves open, or systems set up
   from an interim pattern that should later reconcile with the `claude-toolkit`
   canonical version.
3. **Port-back reminder:** if during this setup you improved one of the reusable
   systems (memory architecture, knowledge layer, a guard hook, or a general
   project rule in `../../library/rules/general/`), remind the user to port that
   improvement **back to the
   `claude-toolkit` repo** so the canonical template stays current and every other
   project picks it up. Offer to draft that change.

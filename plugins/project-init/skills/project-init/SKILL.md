---
name: project-init
description: >-
  Walk the user through initializing a NEW project, one gate at a time:
  scaffolding & folder structure, guard hooks, the packaged project knowledge
  system, optional SOUL.md, CLAUDE.md and AGENTS.md, the local-folder
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
GitHub Projects board, Linear, Jira, local folders on this computer, the BMAD method,
or somewhere else / nothing yet. `references/work-tracking-choice.md` carries the exact wording,
what each answer does, and the step-by-step setup for a GitHub Projects board.
Read it before asking.

Whatever the owner names, Gate 5 adds a one-line structural pointer to
`CLAUDE.md` and `AGENTS.md` naming that tracker, so every session knows where the
work lives. No rule about ticket quality is copied alongside it.

A GitHub Projects board and local folders are the two tracker choices the toolkit
can set up. GitHub setup creates nothing without explicit approval: no board, no
statuses, no labels, no issues. Local setup creates an ignored `.work-items/`
folder only after the owner chooses it. The BMAD method is the only other answer
where the toolkit sets anything up, and there it only runs BMAD's own installer,
with approval. The toolkit creates and changes nothing inside Linear, Jira, or
any other external tracker.

For "local folders on this computer", install `work-tracker` from this
marketplace and run its `init` command, as described in
`references/work-items-structure.md`. It always uses the flat, Git-ignored
`.work-items/` folder at the repository root. If an older staged tracker exists,
preview `work migrate`, get approval, then copy it with `--apply`. Leave the old
tracker untouched until the owner verifies the copy and separately approves
removal. Do not hand-create a competing tracker or connect local mode to GitHub.

For "the BMAD method", offer to run `npx bmad-method install` and run it only
with a yes, as described in `references/work-tracking-choice.md`. BMAD holds the
work itself, so never pair it with `work-tracker` or a hand-built board, and
never write a six-part `SPEC.md` beside its stories. Its own planning workflows
are the refinement session.

If the owner answers "somewhere else, or nothing yet", write nothing about
tracking, and record that they were asked and declined so `project-sync` does not
raise it every run.

Offer `ai-external-knowledge/` at the project root for every stack. It holds
outside documentation captured as Markdown so agents can read it locally, one
folder per topic. Create it empty with a short `README.md`, or skip it until the
project needs one. Gate 5 copies the `ai-external-knowledge.md` rule that governs
it, and gives the folder its own codemap line in `CLAUDE.md` and `AGENTS.md`.
Without that line an agent never learns the folder is there.

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

**Every project**: offer the general hook from the `hooks-library` plugin
(`/hooks-library`). Default ON where the project uses `session-skills`.

- `spec-check-reminder` asks once, at the session's first file edit, whether
  the spec-check review has run, so a build from a drifted specification is
  caught as it starts. It points at the `spec-check` skill from the
  `session-skills` plugin, so skip it where that plugin is not installed.

The project knowledge package owns its own startup loader and pull-request save
reminder. Gate 3 installs those with the system. Do not install the retired
`memory-pr-hook` or `wrap-up-ritual.md` path from this gate.

> Other reusable hooks (secret-scan and session-start orientation) are still
> planned for the `hooks-library` plugin. Until they land, author any other hook
> for the project directly. A hook may enforce a rule or start a review; no hook
> writes memory.

### Gate 3: Project knowledge system

**Purpose:** install the packaged Git-native project knowledge system so Claude
and Codex share approved specifications, persistent understanding, and one small
startup map.

- Offer the `second-brain` plugin as one coherent, opt-in system.
- Explain that the managed `knowledge/README.md` is the one operating manual.
  It owns placement, finding, saving, file shape, approval, trust, lifecycle,
  and the skill map. Other runtime files point to it instead of copying policy.
- Ask the owner for the real framing in `knowledge/project.md`: what the project
  is, why it exists, what finished looks like, its main workstreams and
  boundaries, who is involved, and where active work is tracked. Never invent
  that framing.
- Show the complete `knowledge/` tree and the proposed startup routes.
- If approved, install `second-brain` from this marketplace and follow its
  greenfield setup workflow. Copy the packaged manual unchanged and use the
  plugin's task-specific skills, tools, and hooks. Do not retype their policy in
  `project-init`.
- Treat the manual, flat folders, tools, hooks, and short root fallback as one
  adoption unit. Do not offer a broken partial variant.
- Commit only `knowledge/.obsidian/app.json` with `alwaysUpdateLinks: true`,
  `newLinkFormat: "relative"`, and `useMarkdownLinks: true`. Add a `.gitignore`
  allowlist that ignores
  every other file under `knowledge/.obsidian/`, including personal layouts,
  hotkeys, appearance, plugins, themes, and device state. Do not commit a core
  plugin list; browsing, search, backlinks, and graph views need no shared
  plugin policy.
- Register `.claude/hooks/knowledge-session-start.mjs` as a fail-open Claude
  `SessionStart` hook. Add the equivalent fail-open `.codex/hooks.json` route
  and add the same short startup and fallback pointer to both root files. The
  hook loads `SOUL.md`, the manual, project framing, current work, and both
  index entry lists in that order. Give the Codex handler at least 5,000 tokens
  of additional context. The root files copy none of the policy.
- After installation, offer to invoke `remember` for any initial candidates. It
  follows the manual and writes only approved meaning.
- A new project starts with no memories. Never inherit another project's
  knowledge, tags, or manual edits.

### Gate 4: Optional mechanical knowledge aids

**Purpose:** optional impact-analysis tools that support, but never replace, the
Markdown knowledge system.

- Do not offer a second or competing knowledge system. When Gate 3 was
  approved, `knowledge/memory/` and `knowledge/specs/` already provide the
  persistent knowledge layer.
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

### Gate 5: SOUL.md, CLAUDE.md, and the rules folder

**Purpose:** optionally define the agent's identity, then write the project's
root orientation files and the `.claude/rules/` folder that holds the
behavioral rules.

`CLAUDE.md` and `AGENTS.md` are the first thing an agent reads in a session.
They do two jobs: carry the few things it must know before it acts, and route,
so that when the owner asks for something the agent knows where in this
repository that thing lives. Tell the owner that while writing them, and keep
out anything that does neither job. `references/thin-claudemd.md` has the exact
structure and the three tests a line has to pass.

The behavioral rules do NOT go inside CLAUDE.md. They are individual files in the
project's `.claude/rules/` folder, copied from the toolkit's rules libraries.
CLAUDE.md stays thin and points at that folder. Read
`../../library/rules/general/README.md` for the rule list.

- **Put the three fixed lines above the title in both root files.** The SOUL
  route first, only when `SOUL.md` exists and Gate 3 was declined. Then two the
  owner supplies, in every project, verbatim:
  `After you generate your response. Simulate the user saying "Huh? What are you saying?". Then regenerate your response based on that.`
  and
  `Always execute work with the context in mind that the user will likely continue work across multiple AI coding sessions where the session context is cleared and picked up again. You must assist the user in helping establish that continuity across sessions while not adding context that might pollute future agents and skew them. Information must be curated and intentional.`
  Never reword, shorten, or repunctuate either one, and never put one in only
  one of the two files. `references/thin-claudemd.md` has the order and the
  reasoning; `references/root-file-examples.md` shows them in place.
- **Offer a project `SOUL.md`.** Ask: "Do you want to create a `SOUL.md` for
  this project? It defines who the agent is, how it communicates, its defaults,
  and what it should avoid." If the owner says yes, work with them to write the
  root file during this gate. Do not install a fixed template or invent the
  project's identity. Keep commands, paths, coding rules, and project workflows
  in `CLAUDE.md`, `AGENTS.md`, or `.claude/rules/`, not `SOUL.md`. If a root
  `SOUL.md` already exists, keep it and never overwrite it. Once the file
  exists and Gate 3 was declined, put `Read SOUL.md first and follow it
  throughout this session.` at the top of each root agent file. When Gate 3 ran,
  its startup loader and short fallback already own the SOUL route. If the owner
  declines, create no file and add no reference.
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
- **Write the thin CLAUDE.md** _with_ the user, walking the sections rather than
  generating a wall of text: what the project is, the codemap and structural
  pointers, a `Read .claude/rules` line, and which gates ran. Among the
  structural pointers, include the one-line work-tracking pointer from
  `references/work-tracking-choice.md`, naming the tracker Gate 1 settled on and
  how a refined ticket is marked. Add the identical line to `AGENTS.md`. Reflect what the
  earlier gates set up. When project knowledge was installed, put the same short
  startup and fallback route in both files. It names the manual and map once;
  neither root copies knowledge policy.
  Keep other behavioral rules out of the root files.
- **Keep the codemap to one line per folder**, and let that line point at the
  folder's own `CLAUDE.md` for the detail. Four things never leave the root
  file, because an agent needs them before it opens any folder: how to talk to
  the owner, the pointers to the most dangerous rules, the project-knowledge
  startup route, and the codemap lines themselves. `references/thin-claudemd.md` has
  the list under "What must stay in the root file".
- **The codemap names the context sources, not only the code.** Give
  `ai-external-knowledge/` its own line saying what topics are captured there
  and to open it before designing against an outside system, and do the same for
  a specifications folder or any reference data the project keeps. Nothing else
  in a session mentions those folders, so an agent reaches them only from here.
  This is the routing job, and it is the part usually left out.
- **`AGENTS.md` is a short pointer file, not a second copy.** Codex reads no
  `CLAUDE.md` and no rule file on its own, and it expands no import syntax, so an
  `@CLAUDE.md` line would load nothing. It does follow a plain instruction to
  open a file. So `AGENTS.md` carries the fixed lines, the title, an instruction
  to read `CLAUDE.md` then every file in `.claude/rules/` then the folder file
  before editing in a folder, the rules whose breach causes real damage in short
  form, and the shared `Communication` and `Project knowledge` sections. It
  carries no codemap and no folder detail. Toolkit projects deliberately keep one
  root AGENTS.md even though Codex supports layered files.
- **Add a `.claude/rules/README.md`** that indexes what each copied rule file
  does, so the folder is self-describing.
- **Select Claude Code's built-in `Concise` output style** (default ON). Set
  `"outputStyle": "Concise"` in the project's committed `.claude/settings.json`.
  Copy no style file: `Concise` is built into Claude Code, so there is nothing
  to install and nothing to keep in step. The toolkit stopped shipping its own
  style in issue #245. There are no voice rules in `.claude/rules/` either; do
  not write one. Tell the owner three things: it takes effect on their next
  session rather than the current one; a helper agent never receives an output
  style, which is why `follow-the-output-style.md` is in the rules folder; and
  with a built-in style there is no file for that rule to point a helper agent
  at, so helper agents fall back to writing plainly.
- **Offer the machine-wide setting too**, if the owner wants this voice
  everywhere and not just here. Set `"outputStyle": "Concise"` in
  `~/.claude/settings.json`. Then every repository gets it, including ones never
  set up with this toolkit. The project setting still wins where it exists, and
  it is the one that travels to other machines, so doing both is normal.

### Gate 6: Optional standalone toolkit skills

**Purpose:** offer reusable workflows that are useful in this project but live
in their own plugins.

- **Offer `session-skills` as one plugin, and recommend it.** It holds eight
  skills that run inside a conversation: `braindump`, `explain-simply`,
  `grill-me`, `handoff`, `session-summary`, `spec-check`, `track-tasks`, and
  `unslop`. They install and version together, so this is a single yes or no,
  not eight. If approved, install the
  plugin from this marketplace. Do not copy any `SKILL.md` into the project.
  Describe each one in the owner's terms, using the notes below.
- `explain-simply` says an answer again as short bullets when it did not land
  the first time, keeping every number, date, file path, and name. It re-reads
  nothing, so it cannot quietly change the answer.
- `grill-me` asks one question at a time and writes every answer to
  `knowledge/brainstorms/{date}-{topic}.md` before continuing when project
  knowledge is installed. Explain that it ends by invoking `remember` for any
  resulting specification or persistent-memory updates. The generated index
  excludes brainstorms, and raw discovery stays non-authoritative.
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
  prompt.
- `unslop` takes writing that already exists and strips the patterns that make
  it read as machine-written, then puts a voice back. Say what it works on: a
  file the owner names, text they paste, or the last answer in the
  conversation. Say what it shows them: a list of every tell it found with the
  fix for each, then the rewrite, and it writes to a file only on their yes.
  Say the two limits, because they are what make it safe. Every number, date,
  file path, name, and field name survives the rewrite unchanged, and it reads
  the project's active output style first, so the project's own voice wins
  wherever the two disagree. Point out that it is the only thing in the
  toolkit that cleans up a document after the fact; the output style only
  governs text Claude is writing now.
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
  items are tracked, what each of the six answers does, and the step-by-step
  setup for a GitHub Projects board. Read it in Gate 1, before asking.
- `references/work-items-structure.md`: how Gate 1 initializes the `work-tracker`
  plugin when the owner chose local folders on this computer, including the
  owner-approved requirements gate and preview-first conversion of the older
  staged tracker.
- `references/salesforce-project-scaffold.md`: the standard Gate 1 layout for a
  Salesforce / SFDX project (SFDX source plus a `delivery/` tree). Read it in
  Gate 1 when the stack is Salesforce.
- `references/thin-claudemd.md`: what the two root files are for (carry the few
  things an agent must know first, and route it to where everything lives), the
  three tests a line has to pass before it goes in, how Gate 5 writes a thin
  CLAUDE.md that points at `.claude/rules/` instead of holding the rules inline,
  and what must stay in the root file.
- `references/root-file-examples.md`: a finished `CLAUDE.md` and the matching
  pointer-model `AGENTS.md` for one example project, plus the three fixed lines
  that sit above the title. Read it in Gate 5, alongside `thin-claudemd.md`.
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

---
name: project-init
description: >-
  Walk the user through initializing a NEW project, one gate at a time:
  scaffolding & folder structure, guard hooks, the memory system, the knowledge
  layer, and CLAUDE.md. Use when the user is starting a new repo/project and
  wants help setting up the foundational scaffolding, or says things like
  "initialize this project", "set up the scaffolding", "/project-init", or "help
  me get this new repo going". This skill ORCHESTRATES setup: it asks the user
  how they want each piece, recommends options for their stack, and only acts
  after they confirm. Every gate is optional and skippable.
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

> This gate is intentionally per-project: the value is your tailored
> recommendation, not a frozen template.

**Work-items structure (every stack).** Offer the standard work-item tracking
tree in `references/work-items-structure.md`: stage folders (`01-backlog/`
holding a `BACKLOG.md` index, `02-in-progress/`, `03-completed/`,
`04-archived/`) with one folder per work item holding `SPEC.md` + `STATUS.md`.
Salesforce projects place it at `engagement/work-items/`. It pairs with
boilerplate rule 18 (Gate 5): read the item's folder first, keep it current as
part of the work, and always close out a finished item in the same session
(update its `STATUS.md`, mark the index entry done, move the folder to the
completed stage).

**Salesforce / SFDX projects** have a standard scaffold worth reusing: see
`references/salesforce-project-scaffold.md`. Offer it whenever the stack is
Salesforce (org build, org merge, or managed service). It stays optional and is
still confirmed folder-by-folder with the owner; it is a starting point, not a
forced template.

**Salesforce project rules library.** When the stack is Salesforce, after the
`.claude/rules/` folder is scaffolded, offer to copy in the reusable Salesforce
rules from `references/salesforce-rules/` (each is a standalone `.claude/rules/`
file, e.g. the deploy hitch-hiker check). See that folder's `README.md` for the
current list. They are opt-in and confirmed with the owner; skip the ones a
given project does not want. Make sure the project's CLAUDE.md points at
`.claude/rules/` (Gate 5) so these files are read each session.

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

**Salesforce / SFDX projects**: offer the ready-made production-org guard in
`references/salesforce-prod-guard-hook.md`. It confirms before any deploy or
destructive `sf`/`sfdx` command hits a production org, auto-detects which orgs
are production, and is tuned by a plain JSON policy file. Copy and configure, no
code to write. Still optional and confirmed with the owner.

> A broader library of reusable guard hooks (secret-scan, session-start
> orientation) is still planned for `claude-toolkit`. Until it lands, author any
> other hook for the project directly.

### Gate 3: Memory system

**Purpose:** durable, cross-session long-term memory so context survives between
sessions.

- Ask whether this project wants the memory system. Many small projects don't
  need it; say so. It's opt-in.
- If yes: install the `second-brain` plugin and run its `second-brain` skill. It
  sets up the remote MCP memory server (a shared Cloudflare Worker plus a
  per-project Neon database, reachable from both the terminal and cloud sessions)
  and asks a short project-type question to pick the right profile. Do not
  hand-build a memory store.
- Explain the ground rules you're establishing (only the two curator agents write
  to the store; a Stop hook captures each turn; the curated digest is injected
  each session).
- Once memory is live, offer to run the `grill-me` skill: it interviews the owner
  about the project and checkpoints every answer to a file, capturing a project
  overview while the curator records durable facts. Save it where the project
  keeps docs (Salesforce scaffold: `engagement/project-overview/`).

> **Packaged as the `second-brain` plugin in this toolkit.** Its `second-brain`
> skill carries the deployable MCP server, the two curator agents, the four
> project profiles, the capture hook, the wiring templates, and a test harness,
> and it also covers the knowledge layer (Gate 4). Follow that skill's steps; do
> not hand-build a memory store here.

### Gate 4: Knowledge layer

**Purpose:** durable knowledge nodes pinned to the source they describe, with
staleness detection when that source drifts.

- Ask whether the project wants the knowledge layer (pairs naturally with the
  memory system, but is separately opt-in).
- If yes: establish the convention for knowledge nodes and how they pin the files
  they "cover," plus the drift check that flags a node when its source changes.

> **Included in the `second-brain` plugin** (the knowledge-curator agent and its
> `covers:` SHA drift-pins install with it). The profile picked in Gate 3 sets
> which drift model applies; skip installing the knowledge-curator to leave this
> layer off. Install via that skill rather than hand-building it.

### Gate 5: CLAUDE.md

**Purpose:** the project's orientation + rules file that every future session
reads first.

- Build it _with_ the user, walking through the sections rather than generating
  a wall of text: what the project is, the codemap, hard rules, how to work
  here, and the wrap-up ritual.
- **Always offer the standard boilerplate rules** from
  `references/claude-md-boilerplate.md`: the rules the user wants in _every_
  project (e.g. keeping CLAUDE.md itself updated when a session surfaces something
  worth recording). Let the user accept, edit, or drop each.
- **Boilerplate rules 8-19 default ON:** the multi-agent protocol (own worktree
  per session, assume parallel agents, land by PR), the language rules (no em
  dashes, no section signs, no AI filler, plain language for a mildly technical
  reader), and the response/working-style rules (lead with the answer, answer
  last and ask only in the question box, solve the real goal and push back,
  define terms, ask before assuming, offer a handoff in a loaded session, steer
  the session to the goal, do the technical work yourself, one folder per work
  item, show phase progress). Every new project gets these unless the owner
  explicitly opts that project out.
- **MCP tool rules are conditional.** If the project connects an MCP server
  covered in `references/mcp-best-practices.md` (Context7, Gmail, Google
  Calendar, Linear, Notion, Playwright), fold in that server's section. Skip the
  ones the project doesn't use.
- Reflect what the earlier gates set up (memory system, knowledge layer, hooks) in
  the relevant CLAUDE.md sections so future sessions know they exist.

---

## References

- `references/setup-flow.md`: the gate-by-gate checklist to track progress
  against during the run.
- `references/work-items-structure.md`: the standard work-items tracking tree
  (stage folders + `BACKLOG.md` index + `SPEC.md`/`STATUS.md` per item) to
  offer in Gate 1 for every stack.
- `references/salesforce-project-scaffold.md`: the standard Gate 1 layout for a
  Salesforce / SFDX project (SFDX source plus an `engagement/` tree). Read it in
  Gate 1 when the stack is Salesforce.
- `references/salesforce-prod-guard-hook.md`: a ready-to-install Gate 2 guard
  that confirms before Salesforce CLI deploys or destructive ops hit a
  production org. Read it in Gate 2 when the stack is Salesforce.
- `references/salesforce-rules/`: a growing library of reusable `.claude/rules/`
  files for Salesforce projects (with its own `README.md` index). Offer these in
  Gate 1 after `.claude/rules/` is scaffolded, when the stack is Salesforce.
- `references/salesforce-permissions-retrieval.md`: the end-to-end process for
  pulling COMPLETE profiles and permission sets into source control (full
  component list, side-folder retrieve, verification spot checks, trap list).
  Read it when a Salesforce project wants its permissions picture in git; pairs
  with the `permissions-source-control.md` rule in `salesforce-rules/`.
- `references/claude-md-boilerplate.md`: the standard CLAUDE.md rules to offer
  in Gate 5.
- `references/mcp-best-practices.md`: per-server MCP tool rules to offer in Gate
  5, but only for the MCP servers the project actually uses.

Read a reference when you reach the gate that needs it; you don't need to load
everything up front.

---

## Wrap-up (always do this at the end)

1. **Summarize** what was set up and what was skipped, so the user has a clear
   record.
2. **Note follow-ups**: anything a skipped gate leaves open, or systems set up
   from an interim pattern that should later reconcile with the `claude-toolkit`
   canonical version.
3. **Port-back reminder:** if during this setup you improved one of the reusable
   systems (memory architecture, knowledge layer, a guard hook, or a CLAUDE.md
   boilerplate rule), remind the user to port that improvement **back to the
   `claude-toolkit` repo** so the canonical template stays current and every other
   project picks it up. Offer to draft that change.

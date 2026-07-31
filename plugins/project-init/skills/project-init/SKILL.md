---
name: project-init
description: >-
  Walk the user through initializing a NEW project, one gate at a time:
  scaffolding & folder structure, guard hooks, the complete second-brain v3
  memory and knowledge system, CLAUDE.md and AGENTS.md, the Git-native
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

> This gate is intentionally per-project: the value is your tailored
> recommendation, not a frozen template.

**Work tracking (every stack).** Offer the `work-tracker` plugin described in
`references/work-items-structure.md`. It extends the established four-stage
tree with structured records, six workflow statuses, deterministic next-item
selection, Git landing proof, validation, and generated dashboards. Most
projects place it at `work-items/`; Salesforce projects place it at
`engagement/work-items/`.

Keep this opt-in. If approved, install `work-tracker` from this marketplace and
run its `init` command. `init` preserves and safely adopts an existing manual
tree. Do not hand-create a competing tracker. Separately ask whether the owner
wants local Git tracking only or also wants to create or link a GitHub Project.
The GitHub option must not run without explicit approval because it creates or
changes external issues, labels, fields, and Project items.

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

Whenever the permission set rule was accepted in Gate 1, also install the
permission set deploy guard in `references/salesforce-permset-guard-hook.md`. It
blocks any deploy shipping a permission set that has not been preflighted. That
is the one step whose omission silently and irreversibly deletes grants, and
Salesforce's own `deploy validate` and `deploy preview` cannot detect it. Both
guards live in the same `Bash|PowerShell` PreToolUse matcher.

> A broader library of reusable guard hooks (secret-scan, session-start
> orientation) is still planned for `claude-toolkit`. Until it lands, author any
> other hook for the project directly.

### Gate 3: Memory system

**Purpose:** install the complete Git-native second-brain v3 system so Claude
and Codex share approved specifications and durable project knowledge.

- Offer the `second-brain` plugin as one coherent, opt-in system.
- Explain the authority split in plain language:
  - `brainstorms/` contains non-authoritative discovery;
  - `specs/` contains current approved behavior;
  - typed `memory/` contains context, planning, decisions, knowledge,
    references, domain material, and operations;
  - raw project artifacts remain in their ordinary scaffold;
  - work-tracker owns live work state; and
  - Git owns exact history.
- Recommend initial system areas based on the project explanation and stack.
- Show the complete core tree, only the real project-specific areas, and the
  proposed `CLAUDE.md` and `AGENTS.md` routes.
- If approved, install `second-brain` from this marketplace and follow its
  greenfield setup workflow. Use its canonical rule, memory-librarian role,
  orientation snippet, and index templates. Do not retype or maintain copies in
  `project-init`.
- Treat the rule, role, root routes, root indexes, and all seven typed memory
  homes as one adoption unit. Do not offer a broken partial variant.
- Offer the initial memory pass after installation. The main agent proposes
  useful initial context, planning, and already-approved specifications; the
  dedicated memory librarian writes only what the owner approves.
- Never add a database, memory MCP server, embeddings, runtime scripts, memory
  hooks, transcript capture, or background curator.
- Never read or import retired v1 Worker, Neon, curator, outbox, or cache
  content.

### Gate 4: Knowledge layer

**Purpose:** durable, reusable project understanding organized in human-readable
Git documents and connected to the specifications and context it affects.

- Do not offer a second or competing knowledge system. When Gate 3 was
  approved, v3's `memory/knowledge/`, `memory/references/`, and
  `memory/domain/` already provide the knowledge layer.
- Mark this gate **included with second-brain v3** when Gate 3 ran, or
  **skipped with Gate 3** when the owner declined v3.
- Explain that Graphify or another repository mapper is a separately optional
  analysis aid for brownfield work, not required memory infrastructure and not
  automatically authoritative.
- Do not install the retired v1 knowledge curator, drift hooks, SHA pins, or a
  database-like graph.

### Gate 5: CLAUDE.md and the rules folder

**Purpose:** the project's orientation file that every future session reads
first, plus the `.claude/rules/` folder that holds the behavioral rules.

The behavioral rules do NOT go inside CLAUDE.md. They are individual files in the
project's `.claude/rules/` folder, copied from the toolkit's rules libraries.
CLAUDE.md stays thin and points at that folder. Read `references/thin-claudemd.md`
for the exact structure, and `references/general-rules/README.md` for the rule
list.

- **Copy the general rules** the owner wants from `references/general-rules/`
  into the project's `.claude/rules/`. Every default-ON file goes in unless the
  owner drops it; walk the list and let them accept, edit, or skip each. Adapt
  wording to the project's voice if they want; each file is the intent, not
  fixed prose. The second-brain rule is installed by Gate 3 from the
  second-brain plugin and is indexed once. Retired v1 recognition files are
  never copied into a new project.
- **Default-ON rules** cover the multi-agent worktree protocol (own worktree per
  session, assume parallel agents, land by PR), the language rules (no em dashes,
  no section signs, no AI filler, plain language), and the working-style rules
  (lead with the answer; answer last and ask only in the question box; solve the
  real goal and push back; define terms; ask before assuming; offer a handoff in
  a loaded session; steer the session to the goal; do the technical work
  yourself; one folder per work item; show phase progress; treat the owner as
  non-technical). Every new project gets these unless the owner explicitly opts
  that project out.
- **Salesforce projects:** the `salesforce-rules/` files the owner chose in Gate
  1 also live in `.claude/rules/`; make sure they are there.
- **MCP tool rules are conditional.** If the project connects an MCP server
  covered in `references/mcp-best-practices.md` (Context7, Gmail, Google
  Calendar, Linear, Notion, Playwright), fold in that server's section (as a
  short CLAUDE.md section or its own `.claude/rules/` file). Skip the servers the
  project doesn't use.
- **Write the thin CLAUDE.md** _with_ the user, walking the sections rather than
  generating a wall of text: what the project is, the codemap and structural
  pointers, a `Read .claude/rules` line, and which gates ran. Reflect what the
  earlier gates set up. When v3 was installed, preserve its compact project
  memory route and add the equivalent route to `AGENTS.md`. Both route to
  `.claude/rules/second-brain.md`; neither copies the complete schema.
  Keep other behavioral rules out of the root files.
- **Add a `.claude/rules/README.md`** that indexes what each copied rule file
  does, so the folder is self-describing.

### Gate 6: Optional standalone toolkit skills

**Purpose:** offer reusable workflows that are useful in this project but live
in their own plugins.

- Offer `grill-me` when the owner wants a durable brainstorm or discovery
  workflow. Explain that it asks one question at a time and writes every answer
  to `brainstorms/{date}-{topic}.md` before continuing.
- Keep it opt-in. If approved, install the `grill-me` plugin from this
  marketplace. Do not copy its `SKILL.md` into the project.
- When v3 is installed, explain that `grill-me` also updates the flat brainstorm
  index and ends by proposing any resulting specification or durable-memory
  updates. It does not make raw discovery authoritative.
- Record whether the owner installed, skipped, or deferred it so a later
  `project-sync` respects that choice.

---

## References

- `references/setup-flow.md`: the gate-by-gate checklist to track progress
  against during the run.
- `references/work-items-structure.md`: how Gate 1 offers and initializes the
  `work-tracker` plugin, including safe adoption of the older manual tree and
  the optional GitHub Project mirror.
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
  keeping permission sets in source control safely, and what to do about profiles
  (excluded by default). Covers the four-part install, the one-time proof that a
  retrieve is complete on this org, the trap list, and the known retrieve blind
  spots. Read it when a Salesforce project wants its permissions picture in git.
- `references/salesforce-permissions-research.md`: the evidence behind that
  runbook. The live verification result, the permission set element reference,
  the tracked Salesforce CLI bugs, the tooling landscape, options considered and
  rejected, and the full source list with dates. Read it before re-researching
  any permission set question or re-litigating the process.
- `references/salesforce-permset-guard-hook.md`: the Gate 2 hook that blocks an
  unpreflighted permission set deploy.
- `references/tools/permsets.py`: the tool the permission set rule depends on
  (fetch, verify, check, tidy, preflight). Copy to `tools/permissions/` in the
  project. The rule without the tool is advice with no enforcement.
- `references/templates/permissions-runbook.md`: the project-side runbook to copy
  and fill in when permission sets are tracked.
- `references/general-rules/`: the standard `.claude/rules/` files (with its own
  `README.md` index) to copy into every project in Gate 5. Active rules are
  default ON unless the owner opts out. The two v1 recognition files are never
  copied into a new project.
- `references/thin-claudemd.md`: how Gate 5 writes a thin CLAUDE.md that points
  at `.claude/rules/` instead of holding the rules inline.
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
   systems (memory architecture, knowledge layer, a guard hook, or a general
   project rule in `references/general-rules/`), remind the user to port that
   improvement **back to the
   `claude-toolkit` repo** so the canonical template stays current and every other
   project picks it up. Offer to draft that change.

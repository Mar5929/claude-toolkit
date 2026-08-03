# Toolkit map

The single index of everything in this toolkit, and how the pieces relate. If
you (or an agent you asked) want to know "what is the purpose of each item?" or
"is anything redundant?", this is the file to read. It keeps entries to one line
and links to each item's canonical home, so nothing is duplicated here; the
depth lives in each plugin's own `README.md` and reference indexes.

## Plugins at a glance

| Plugin | Purpose | Skills | Install |
|---|---|---|---|
| [project-init](../plugins/project-init/README.md) | Put the toolkit's rules and systems into a project, new or existing | `project-init`, `project-sync` | `/plugin install project-init` |
| [second-brain](../plugins/second-brain/README.md) | Git-native Markdown specifications and durable memory shared by Claude and Codex | `second-brain`, `remember` | `/plugin install second-brain` |
| [sf-architect-solutioning](../plugins/sf-architect-solutioning/README.md) | Salesforce solution architect: approved solution plan before any build | `sf-architect-solutioning` | `/plugin install sf-architect-solutioning` |
| [git-workflows](../plugins/git-workflows/README.md) | Parallel-session-safe git lifecycle workflows | `pull-latest`, `reset-to-remote`, `merge-and-clean-up` | `/plugin install git-workflows` |
| [hooks-library](../plugins/hooks-library/README.md) | Guard hooks that enforce the checkable rules mechanically instead of restating them | `hooks-library` | `/plugin install hooks-library` |
| [session-autoname](../plugins/session-autoname/README.md) | Background agent sessions stay named after their overarching project | `session-autoname` | `/plugin install session-autoname` |
| [grill-me](../plugins/grill-me/README.md) | Persistent discovery interviews that checkpoint every answer | `grill-me` | `/plugin install grill-me` |
| [work-tracker](../plugins/work-tracker/README.md) | Git-authoritative backlog, handoffs, relationships, landing proof, and optional GitHub Projects | `work` | `/plugin install work-tracker` |

## Skills at a glance

| Skill | Plugin | Purpose | Trigger |
|---|---|---|---|
| project-init | project-init | Walk a NEW project through setup gates, one skippable step at a time | `/project-init` |
| project-sync | project-init | Audit an EXISTING project against the toolkit and close approved gaps | `/project-sync` |
| second-brain | second-brain | Explain, install, audit, adopt, review, and maintain the complete v3 system | `/second-brain` |
| remember | second-brain | Save clear owner-approved information through the on-demand memory librarian | `/remember`, "remember this" |
| sf-architect-solutioning | sf-architect-solutioning | 5-phase Salesforce solutioning to an approved plan | `/sf-architect-solutioning` |
| pull-latest | git-workflows | Get current with the remote without rewriting or discarding | `/pull-latest` |
| reset-to-remote | git-workflows | Hard-reset a repo to mirror the remote, safely gated | `/reset-to-remote` |
| merge-and-clean-up | git-workflows | Merge one approved PR and remove only its completed branch and worktree | `/merge-and-clean-up`, "merge and clean up" |
| session-autoname | session-autoname | Install the per-machine hook that re-names a background session each turn | `/session-autoname` |
| grill-me | grill-me | Stress-test an idea one question at a time and preserve every answer | `/grill-me`, "grill me" |
| work | work-tracker | Manage local work items and their optional GitHub Issues and Project mirror | `/work`, "add this to the backlog", "what should I work on next?" |

## Rules and references (canonical indexes)

These are not duplicated here. Go to the index that owns them:

- **General rules** (the standard `.claude/rules` files copied into every
  project): [general-rules/README.md](../plugins/project-init/skills/project-init/references/general-rules/README.md).
  Marks active rules default ON or conditional. Retired v1 examples are not
  part of this installable library.
- **Output styles** (the `.claude/output-styles` files that set the voice Claude
  answers in): [output-styles/README.md](../plugins/project-init/skills/project-init/references/output-styles/README.md).
  Marks each style default ON or optional. `plain-language.md` is the only one
  today, and it is default ON.
- **Salesforce rules**: [salesforce-rules/README.md](../plugins/project-init/skills/project-init/references/salesforce-rules/README.md).
- **Salesforce dependency graph**: the tool and its own `README.md` live at
  `plugins/project-init/skills/project-init/references/tools/kb/`; the install
  and use guide is
  [salesforce-dependency-graph.md](../plugins/project-init/skills/project-init/references/salesforce-dependency-graph.md),
  and the standing rule it installs is `salesforce-rules/dependency-graph.md`.
  It compiles a Salesforce project's own `force-app/` metadata into a local
  graph and answers "if I change this field, what breaks N steps out?" It reads
  local files only and never contacts an org. The non-Salesforce equivalent,
  built on the open-source graphify tool, is
  [graphify-dependency-graph.md](../plugins/project-init/skills/project-init/references/graphify-dependency-graph.md),
  whose rule is `general-rules/dependency-graph.md`. Both graphs ship as kits:
  a tool, a rule, and an automatic rebuild. A project has one graph, so it gets
  one of the two rules, never both, and either lands in the project as
  `.claude/rules/dependency-graph.md`.
- **Salesforce permission set kit**: the tool is
  `plugins/project-init/skills/project-init/references/tools/permsets.py`; the
  runbook is `salesforce-permissions-retrieval.md`, the evidence behind it is
  `salesforce-permissions-research.md`, the rule is
  `salesforce-rules/permissions-source-control.md`, and the deploy guard is
  `salesforce-permset-guard-hook.md`.
- **MCP tool rules** (per-server, conditional):
  `plugins/project-init/skills/project-init/references/mcp-best-practices.md`.
- **second-brain v3 runtime sources**:
  `second-brain-rule.md`, `folder-layout.md`, `markdown-schemas.md`,
  `orientation-snippet.md`, `adoption-guide.md`, and `templates/` under
  `plugins/second-brain/skills/second-brain/references/`, plus the
  `memory-librarian.md` role under `plugins/second-brain/agents/`.
- **Archived second-brain v1**:
  [archive/second-brain-v1/README.md](../archive/second-brain-v1/README.md)
  indexes the retired Worker, Neon, MCP, curator, hook, and knowledge-backfill
  source, including `architecture-spec.md`, `setup-recipe.md`,
  `first-time-infra.md`, `curator-write-path.md` (how a curated note reached the
  store, and the fallback ladder when it could not), `brain-scope.md` (which
  brain was this project's, and what stopped a session reading another
  project's), and `kb-backfill.md` with its `kb-backfill/` scripts (the retired
  one-time write-up procedure and its generic freshness hook, superseded for
  Salesforce by the dependency graph and for every other stack by graphify's own
  git hooks). It lives outside active plugin paths and is historical evidence,
  not installation, deployment, export, or migration guidance. The old Worker
  has no default deploy path. The dependency graph is NOT archived: it outlived
  v1 and ships from `project-init` (see below).
- **Shipped second-brain v3**:
  [docs/second-brain-v3/README.md](second-brain-v3/README.md) indexes the
  current Markdown-only specification, schemas, and toolkit
  integration design. It separates flat dated brainstorms, area-based
  capability specifications, seven typed memory homes, and work-tracker
  authority. The main agent proposes updates and an on-demand memory librarian
  writes approved changes in the task worktree. The plugin ships the canonical
  rule, role, templates, setup, sync, and remember workflows.
- **Superseded second-brain v2 proposal**:
  [docs/second-brain-v2/README.md](second-brain-v2/README.md) is retained as
  historical design material. Its numbered units and requirements are not
  inherited by v3.
- **sf-architect references**: the `metadata/*` guides and templates under
  `plugins/sf-architect-solutioning/skills/sf-architect-solutioning/references/`.

## How the pieces relate (and what looks redundant but is not)

Most apparent overlaps in this toolkit are pairs that answer different questions.
The genuine watch-items are called out at the end.

- **project-init versus project-sync.** Same inventory of toolkit systems,
  opposite entry points: init lays foundations in an empty project, sync audits
  and back-fills a project that already exists. Keep both. Sync also carries the
  drift check, which is the only thing that ever delivers an amendment to a rule
  a project already has; without it, editing an existing rule in the toolkit
  changes nothing anywhere else.
- **Archived second-brain v1's three layers.** The legacy memory graph ("what did we decide and
  why"), the knowledge layer ("why does this code exist", prose pinned to file
  SHAs), and what v1 called the structural layer ("if I change this, what
  breaks", built mechanically) sound alike but do not overlap. Only the third
  does impact analysis; only the second carries the human "why". The third one
  outlived v1: it is now the dependency graph shipped by `project-init` (see the
  reference index above), because it never depended on any v1 infrastructure. It
  was only ever bundled inside the second-brain plugin folder.
- **The two dependency graphs are alternatives, not a pair.** The bundled
  Salesforce tool parses `force-app/` metadata; graphify parses source with
  tree-sitter. Same job, different readers, and no project needs both. They also
  keep themselves fresh differently, which is the part that trips people: the
  Salesforce one uses a Stop hook committed in the project's settings, so it
  travels with a clone; graphify uses git hooks, which are never committed, so
  each fresh clone has to install them once. Their shared rule name
  (`dependency-graph.md`, one per library) is deliberate: whichever graph a
  project has, a session reads one rule with that name.
- **The dependency graph versus written knowledge.** The graph answers what
  connects to what, mechanically, rebuilt from the code every time, so it cannot
  be wrong about structure and cannot record intent. Written knowledge (v3's
  `memory/knowledge/`) answers why, and can be wrong the moment code changes,
  which is what the freshness hook and its drift file exist to catch. Neither
  replaces the other, and a project can install the graph without installing
  second-brain at all.
- **Archived second-brain v1 versus v3.** The repository archive preserves the
  old implementation for historical inspection. The installable second-brain
  plugin contains only v3. Project-sync may recognize old local wiring, but it
  does not use the archive as a migration source.
- **second-brain versus remember.** `second-brain` owns complete setup,
  brownfield adoption, explanation, completion review, and maintenance.
  `remember` is the focused entry point when the owner already knows what
  should be saved. Both use the same canonical rule and on-demand memory
  librarian, so there is no quick-write store or competing schema.
- **work-tracker versus the older work-items tree.** Not two trackers.
  work-tracker is the executable extension of the same four-stage convention.
  It adopts existing `SPEC.md`, `STATUS.md`, and notes in place, adds
  `ITEM.json` and deterministic commands, and rebuilds the old hand-edited
  index as a generated view. The six structured statuses distinguish Backlog
  from Ready and In Progress from In Review without creating another folder
  hierarchy.
- **work-tracker versus second-brain v3.** work-tracker owns task status,
  blockers, work-item relationships, branch and pull-request evidence, and the
  current handoff. V3 may link specifications and durable memory to a work-item
  folder, but it does not copy or overrule task status.
- **work-tracker versus GitHub Projects.** Two different things share the word
  "Project". work-tracker's optional adapter creates or updates repository issues
  and a Project as a **mirror** of local files that stay authoritative, using its
  own six statuses, and everything can be reconciled from the local records.
  Separately, a project may answer the Gate 1 tracking question with a GitHub
  Projects board that **holds** the work, with no work-items folder at all. That
  one is set up by hand from `project-init`'s `work-tracking-choice.md`, uses
  seven statuses including `Refining`, and involves no work-tracker code. Never
  point both setups at one board.
- **spec-before-you-build versus work-item-folders.** Not two rules about
  tickets. `spec-before-you-build` is tracker-neutral and states the two things
  that hold anywhere: log the work before building it, and refine the six-part
  spec before building it. `work-item-folders` adds only what is specific to
  tracking work as files in the repository, and is meaningless in a project that
  chose a GitHub board, Linear, or Jira. The six parts are stated once, in
  `spec-before-you-build`.
- **hooks-library versus the rules it enforces.** The rule is still canonical
  and still says what good writing is; the hook only catches the cases a machine
  can catch with no interpretation. They are not duplicates, and the hook is not
  a licence to delete the rule: it fires on the finished reply, so it cannot
  shape a commit message, a document, or a code comment, which the rule still
  governs. The split that decides whether something belongs in the hook is
  once-per-decision versus once-per-message. "Never commit a secret" fires at
  one point and holds on instruction alone. "No em dashes" fires on every
  sentence, thousands of tokens after the rule was last read, and measurement
  put it at one per 1.8 messages in the worst project. That second kind needs a
  check. That once-per-decision test decides whether a rule needs a *check*
  hook. It does not decide whether a hook is allowed at all: a hook may also
  trigger a process agents forget or orient a session at its start, and neither
  of those checks anything. The three jobs and their separate bars are in
  [`hooks-library`](../plugins/hooks-library/README.md).
- **hooks-library versus second-brain v3.** V3 was originally written as a
  system with no hooks anywhere, which conflated two different promises.
  Nothing may write memory automatically, and that still holds; v1 was retired
  for breaking it. But enforcing a rule is not writing memory. A hook that makes
  an agent read the memory rule, or that starts the durable review at a
  completion point, serves the approval promise rather than breaking it. The
  memory core still ships no hooks of its own, so anything hook-shaped comes
  from `hooks-library` and passes through Gate 2.
- **git-workflows versus the parallel-agent-sessions rule.** The rule states the
  behavior ("assume other sessions share the repo"); the three skills are the
  safe git commands that carry it out. Different layers, not duplicates. That
  rule absorbed the separate `worktree-isolation` rule, which had described the
  same situation from the other side: the two were 156 lines that each opened by
  explaining they were not the other, and both stated "one session, one worktree,
  one branch" and "do not fix a dirty tree, tell the owner".
- **grill-me versus work-item and memory files.** `grill-me` owns raw discovery
  notes in a flat, dated `brainstorms/` collection. Each brainstorm links to
  every resulting specification without being copied into system-area folders.
  A work item's `SPEC.md` and `STATUS.md` own that ticket's approved scope and
  readable handoff, while `ITEM.json` owns structured task state. Top-level
  `specs/` owns durable current behavior and second-brain owns durable project
  knowledge. The brainstorm may inform those artifacts but does not replace
  them.
- **session-autoname is deliberately NOT offered by project-init.** Every other
  plugin here installs into a project. This one installs into a machine: it
  writes `~/.claude/hooks/` and `~/.claude/settings.json` once, and from then on
  it applies to background sessions in every project. Putting it behind a
  per-project gate would ask the same question repeatedly and re-do a setup that
  is already done. Install it once per machine with `/plugin install
  session-autoname` then `/session-autoname`. If a future plugin is also
  machine-level, this is the precedent to follow.
- **The session-continuity rule cluster.** Several general rules touch "do not
  lose context across sessions", which can read as overlap: `keep-claudemd-current`
  (write durable facts into CLAUDE.md, and route everything that is not a rule
  out of it so the file stays readable), `wrap-up-ritual` (update the status or
  handoff doc and commit), `offer-context-handoff` (hand a fresh session a
  self-contained prompt), `work-item-folders` (use work-tracker and keep one
  canonical folder per item), `capture-the-thinking` (write the goal, why,
  requirements, edge cases, scenarios, and decisions into their canonical home
  as they surface, mid-task, so nothing important lives only in a conversation,
  plus the durable facts that arrive outside any task and so belong to no
  completion review), and
  `steer-to-the-goal` (preserve a goal that outlasts one chat). Each targets a
  distinct moment, so they compose
  rather than repeat. V3's shared rule owns the approved-completion durable
  knowledge review. `capture-the-thinking` is the standing obligation the others
  assume: `work-item-folders` owns the containers and their fields, the v3
  second-brain rule owns the durable homes and who may write them,
  `wrap-up-ritual` owns the review at the end, and `capture-the-thinking` owns
  the during, which is the moment all three otherwise leave uncovered.
  `keep-claudemd-current` names the status doc, the design doc, and long-term
  memory as destinations for detail that does not belong in CLAUDE.md, but it
  does not own any of them; the rules above do. Naming where something goes is
  what keeps CLAUDE.md from absorbing all three.
- **Voice is not a rule any more.** How Claude writes and replies was four
  rule files, then three, and is now none. It lives in the `plain-language`
  output style, reinforced every turn by the `style-reminder` hook. The path
  there was one long consolidation: `lead-with-the-answer`,
  `close-with-the-ask`, `quiet-while-working`, and `answer-last-question-box`
  merged into `how-to-reply`; then `how-to-reply`, `writing-and-language`, and
  `treat-owner-as-non-technical` were retired in favor of the style. The reason
  is delivery, not content. A rule file is read once at session start, and
  measuring real sessions showed the voice rules were the most-broken in the
  library: em dashes once per 1.8 messages, staying quiet and closing with the
  next step broken in 56 to 60 percent of turns. An output style is delivered in
  the system prompt and re-stated on every message by the hook.
  `show-phase-progress` remains the one deliberate exception, and its one-line
  bar is exactly the mid-work budget the style allows. `define-your-terms` and
  `steer-to-the-goal` still add their own distinct constraints on top.
  **The known cost:** an output style never reaches a subagent, so helper agents
  no longer inherit the voice guidance, and nothing checks a finished reply now
  that `writing-guard` is gone. Both were accepted deliberately.
- **sf-architect-solutioning versus the Salesforce rules versus the dependency
  graph.**
  sf-architect decides what to build; the `salesforce-rules` install standing
  safety and workflow rules; the dependency graph answers impact questions
  about the metadata that already exists. V3 may link to that evidence but does
  not require or own the analysis tool. Three different jobs on the same stack.

### Genuine watch-items (revisit these)

- **second-brain v1's heavy infrastructure.** The legacy system used a Worker,
  a per-project database, embeddings, and two curators. Its complexity
  contributed to the correctness and curator-cost failures that led to
  retirement. Its source is consolidated in the
  [v1 archive](../archive/second-brain-v1/README.md) outside active plugins. Do
  not install it in a new project. The shipped
  [second-brain v3](second-brain-v3/README.md) is a fresh Markdown-only system
  and does not use that infrastructure.
- **Overlap with Claude Code's native memory.** Claude Code now ships an
  auto-memory feature that captures cross-session notes on its own (machine-local).
  It overlapped part of the legacy v1 capture system. Existing v1 projects
  should deactivate the old automatic capture paths. V3 uses
  project Markdown and does not require transcript capture.

## For an agent asked "what is X?"

Answer from the canonical home, not from memory:

1. A plugin or skill: read that plugin's `README.md` (linked above), then the
   `SKILL.md` if you need the exact steps.
2. A rule: read `general-rules/README.md` (or `salesforce-rules/README.md`) and
   then the rule file.
3. "Is anything redundant?": read the relationships section above.

## Keeping this map current

This file is an index, so it drifts if a plugin or skill is added, removed, or
renamed and the map is not updated. When you change a plugin, update its
`README.md` and this map in the same change. `CLAUDE.md` records this as a
standing rule for the repo.

`tests/orphan-check.mjs` enforces the part of that rule a person forgets: every
file the toolkit ships has to be reachable from at least one skill, plugin
README, reference index, or this map. It exists because a July 2026 cleanup
deleted the last pointer to the Salesforce dependency graph and nothing noticed
for weeks. Run it with `node tests/orphan-check.mjs`.

`tests/link-check.mjs` guards the other direction. The memory rule tells writers
to link to one canonical home instead of copying it, so every copy that rule
removes becomes a link, and a link that points at a deleted file still looks
like a home while leading nowhere. It checks every relative Markdown link in the
repository and skips the examples inside code blocks. Run it with
`node tests/link-check.mjs`.

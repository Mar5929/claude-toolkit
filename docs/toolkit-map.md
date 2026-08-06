# Toolkit map

The single index of everything in this toolkit, and how the pieces relate. If
you (or an agent you asked) want to know "what is the purpose of each item?" or
"is anything redundant?", this is the file to read. It keeps entries to one line
and links to each item's canonical home, so nothing is duplicated here; the
depth lives in each plugin's own `README.md` and reference indexes.

## Plugins at a glance

Installing is always per machine. Every plugin lands in `~/.claude/` and is then
available in every project on that machine. The `Setup` column says whether it
also needs something inside a project folder: **Install and go** needs nothing,
**Sets up a project** writes files into the repository and is opted into per
project, and **Wires into settings** installs a hook by editing a settings file.

| Plugin | Purpose | Skills | Install | Setup |
|---|---|---|---|---|
| [project-init](../plugins/project-init/README.md) | Put the toolkit's rules and systems into a project, new or existing | `project-init`, `project-sync` | `/plugin install project-init` | Sets up a project |
| [second-brain](../plugins/second-brain/README.md) | Git-native Markdown specifications and durable memory shared by Claude and Codex | `second-brain`, `remember` | `/plugin install second-brain` | Sets up a project |
| [sf-architect-solutioning](../plugins/sf-architect-solutioning/README.md) | Salesforce solution architect: approved solution plan before any build | `sf-architect-solutioning` | `/plugin install sf-architect-solutioning` | Install and go |
| [git-workflows](../plugins/git-workflows/README.md) | Parallel-session-safe git lifecycle workflows | `pull-latest`, `reset-to-remote`, `merge-and-clean-up` | `/plugin install git-workflows` | Install and go |
| [hooks-library](../plugins/hooks-library/README.md) | Hooks that make a rule land mechanically instead of restating it: `style-reminder` re-states the output style every message, `writing-guard` checks the finished reply, `memory-pr-hook` starts the memory check when a pull request opens | `hooks-library` | `/plugin install hooks-library` | Wires into settings |
| [grill-me](../plugins/grill-me/README.md) | Persistent discovery interviews that checkpoint every answer | `grill-me` | `/plugin install grill-me` | Install and go |
| [work-tracker](../plugins/work-tracker/README.md) | Git-authoritative backlog, handoffs, relationships, landing proof, and optional GitHub Projects | `work` | `/plugin install work-tracker` | Sets up a project |
| [session-summary](../plugins/session-summary/README.md) | Recap one session as a table row per main request, each with an honest status, plus a block for whatever still needs the owner | `session-summary` | `/plugin install session-summary` | Install and go |
| [handoff](../plugins/handoff/README.md) | End a long session without losing what it learned: memory check first, then a prompt a fresh session can start from, carrying anything not saved | `handoff` | `/plugin install handoff` | Install and go |

## Skills at a glance

| Skill | Plugin | Purpose | Trigger |
|---|---|---|---|
| project-init | project-init | Walk a NEW project through setup gates, one skippable step at a time | `/project-init` |
| project-sync | project-init | Audit an EXISTING project against the toolkit and close approved gaps | `/project-sync` |
| second-brain | second-brain | Explain, install, audit, adopt, review, and maintain the complete v3 system | `/second-brain` |
| remember | second-brain | Draft the real words, have `memory-verifier` check them, show the owner, then save, routing what the system should do to `specs/` and everything else to memory | `/remember`, "remember this" |
| sf-architect-solutioning | sf-architect-solutioning | 5-phase Salesforce solutioning to an approved plan | `/sf-architect-solutioning` |
| pull-latest | git-workflows | Get current with the remote without rewriting or discarding | `/pull-latest` |
| reset-to-remote | git-workflows | Hard-reset a repo to mirror the remote, safely gated | `/reset-to-remote` |
| merge-and-clean-up | git-workflows | Merge one approved PR and remove only its completed branch and worktree | `/merge-and-clean-up`, "merge and clean up" |
| grill-me | grill-me | Stress-test an idea one question at a time and preserve every answer | `/grill-me`, "grill me" |
| work | work-tracker | Manage local work items and their optional GitHub Issues and Project mirror | `/work`, "add this to the backlog", "what should I work on next?" |
| session-summary | session-summary | Table every request the owner made in a session, in their words, each with a status, then say what still needs them | `/session-summary`, "summarize this session", "what did I ask for?" |
| handoff | handoff | Run the memory check, save what the owner approves, then write a self-contained prompt for a fresh session carrying whatever was not saved | `/handoff`, "write a handoff", "I'm going to clear context" |

## The library: what lands in a project

Rules, output styles, tools, templates, and the guides that install them all sit
together in one folder, `plugins/project-init/library/`:

| Folder | Holds |
|---|---|
| `library/rules/general/` | the standard `.claude/rules/` files every project gets |
| `library/rules/salesforce/` | the extra `.claude/rules/` files a Salesforce project gets |
| `library/output-styles/` | the `.claude/output-styles/` files that set the voice |
| `library/tools/` | `permsets.py` and the `kb/` dependency graph tool |
| `library/templates/` | copy-and-fill starting points |
| `library/guides/` | how-to documents for installing the kits above |

None of it belongs to `project-init`. `project-sync` reads the same folder, and
so can anything else added later. It sits inside the `project-init` plugin for
one reason: a plugin ships only the files inside its own folder, so a `library/`
at the repository root would vanish the moment the plugin is installed. That was
tested before the move.

`plugins/project-init/skills/project-init/references/` is a different pile and
holds only six files: the gate-by-gate script `project-init` reads to run
itself (`setup-flow.md`, `work-tracking-choice.md`, `work-items-structure.md`,
`thin-claudemd.md`, `folder-claudemd.md`, `salesforce-project-scaffold.md`).
Nothing there is copied into a project.

`thin-claudemd.md` and `folder-claudemd.md` are a pair. The first says what the
root `CLAUDE.md` holds and what must never leave it. The second says what goes
in the short `CLAUDE.md` inside each major folder, which Claude Code loads only
when an agent reads a file in that folder. `project-sync` audits the folder
files against the second one.

Every hook in the toolkit lives in
[`hooks-library`](../plugins/hooks-library/README.md), including the two
Salesforce guards and their install guides.

## Rules and references (canonical indexes)

These are not duplicated here. Go to the index that owns them:

- **General rules** (the standard `.claude/rules` files copied into every
  project): [general-rules/README.md](../plugins/project-init/library/rules/general/README.md).
  Marks active rules default ON or conditional. Retired v1 examples are not
  part of this installable library.
- **Output styles** (the `.claude/output-styles` files that set the voice Claude
  answers in): [output-styles/README.md](../plugins/project-init/library/output-styles/README.md).
  Marks each style default ON or optional. `plain-language.md` is the only one
  today, and it is default ON.
- **Salesforce rules**: [salesforce-rules/README.md](../plugins/project-init/library/rules/salesforce/README.md).
- **Salesforce dependency graph**: the tool and its own `README.md` live at
  `plugins/project-init/library/tools/kb/`; the install
  and use guide is
  [salesforce-dependency-graph.md](../plugins/project-init/library/guides/salesforce-dependency-graph.md),
  and the standing rule it installs is `rules/salesforce/dependency-graph.md`.
  It compiles a Salesforce project's own `force-app/` metadata into a local
  graph and answers "if I change this field, what breaks N steps out?" It reads
  local files only and never contacts an org. The non-Salesforce equivalent,
  built on the open-source graphify tool, is
  [graphify-dependency-graph.md](../plugins/project-init/library/guides/graphify-dependency-graph.md),
  whose rule is `rules/general/dependency-graph.md`. Both graphs ship as kits:
  a tool, a rule, and an automatic rebuild. A project has one graph, so it gets
  one of the two rules, never both, and either lands in the project as
  `.claude/rules/dependency-graph.md`.
- **Salesforce permission set kit**: the tool is
  `plugins/project-init/library/tools/permsets.py`; the runbook is
  `library/guides/salesforce-permissions-retrieval.md`, the evidence behind it
  is `library/guides/salesforce-permissions-research.md`, the project-side
  runbook to fill in is `library/templates/permissions-runbook.md`, the rule is
  `library/rules/salesforce/permissions-source-control.md`, and the deploy guard
  is `hooks-library`'s `salesforce-permset-guard-hook.md` with its
  `hooks/guard-permission-set-deploy.js`.
- **Salesforce production-org guard**: `hooks-library`'s
  `salesforce-prod-guard-hook.md`, with `hooks/guard-protected-orgs.js` and its
  policy file `templates/protected-orgs.json`.
- **MCP tool rules** (per-server, conditional):
  `plugins/project-init/library/guides/mcp-best-practices.md`.
- **second-brain v3 runtime sources**:
  `second-brain-rule.md`, `second-brain-reference.md`, `folder-layout.md`,
  `markdown-schemas.md`, `orientation-snippet.md`, `adoption-guide.md`, and
  `templates/` under `plugins/second-brain/skills/second-brain/references/`,
  plus the `memory-verifier.md` role under `plugins/second-brain/agents/` and
  `memory-index-build.mjs` and `memory-shape-check.mjs` under
  `plugins/second-brain/tools/`.
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
- **Shipped second-brain v3**: the
  [plugin README](../plugins/second-brain/README.md) describes it, and the
  shipped rule, its routing reference, the agent file, and the two scripts under
  `plugins/second-brain/` are the only description of it. There is no separate
  design document set: issue #144 deleted it, because a second description of
  the same system is a second thing to keep in step. V3 separates flat dated
  brainstorms, area-based capability specifications, seven typed memory homes,
  and work-tracker
  authority. At completion points and natural stopping points after meaningful
  work, the main agent drafts the exact words with a source on every claim, has
  the read-only `memory-verifier` check them before the owner sees anything,
  shows the owner the real text, and writes the approved ones itself in the task
  worktree. Two scripts then rebuild the indexes and check each document's
  shape. `memory-verifier` runs again before a merge, sized to the change, to
  catch parallel semantic duplicates or conflicts. The plugin ships the
  canonical rule, its routing reference, the role, the two scripts, templates,
  setup, sync, and remember workflows.
- **Superseded second-brain v2 proposal**: deleted by issue #144, along with the
  v3 design documents. It was a proposal that was never built, and its numbered
  units and requirements were never inherited by v3. Git history has it.
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
  should be saved. Both use the same canonical rule and the same draft, check,
  approve, save flow, so there is no quick-write store or competing schema.
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
- **hooks-library versus the output style it enforces.** The style is canonical
  and says what good writing is; `writing-guard` only catches the two characters
  a machine can catch with no interpretation. They are not duplicates, and the
  hook is not a licence to thin the style: it fires on the finished reply in the
  main conversation, so it cannot shape a commit message, a document, or
  anything a helper agent writes. Those are covered by the
  `follow-the-output-style` rule and, for an agent that writes durable files, by
  the writing rules inside its own definition. The split that decides whether
  something belongs in the hook is
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
  an agent read the memory rule, or that starts the memory check at a completion
  point, serves the approval promise rather than breaking it. The memory core
  still ships no hooks of its own, so anything hook-shaped comes from
  `hooks-library` and passes through Gate 2.
- **memory-pr-hook versus the memory rule it fires.** `memory-pr-hook` looks
  like it belongs to second-brain and does not. It knows four things: a pull
  request is about to open, this project checks what to save to memory first,
  the rule is `wrap-up-ritual.md`, and what was found goes in the pull request
  description. It holds no memory types, no destinations, no list of words that
  decides what is worth saving, and no check for whether any memory system is
  installed, which is why it works unchanged in a project that has none. All the
  judgement stays with the agent and all the wording stays in the rules, so it
  still passes the library's own admission test: the firing needs no judgement,
  and what happens next needs plenty. The counter-example is in the ticket that
  produced it: davis-advisors-sfdc built a memory hook with 46 text patterns
  deciding what mattered, and its own log shows it firing on helper agent output
  instead of on the owner's words.
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
- **handoff versus session-summary.** Both run at the end of a session and they
  answer different questions. `session-summary` answers "which of my requests
  are where, and what still needs me", is read-only, and writes nothing.
  `handoff` answers "how does somebody else pick this up": it runs the memory
  check first, saves what the owner approves, and then writes a prompt for a
  fresh session carrying everything that was not saved. Run both if you want
  both; neither covers the other.
- **handoff versus memory-pr-hook.** Same job at two different moments, solved
  two different ways, and the difference is not a preference. `gh pr create` is
  a bare terminal command carrying no instructions, so it needs a hook to
  interrupt it. `/handoff` is a slash command, and a slash command loads its own
  instructions the moment it is typed, so the memory check is already in front
  of the agent. Adding a hook there would guard a failure that cannot happen.
  Nothing at all can catch `/clear`: the session-end event fires but cannot stop
  the clear or speak to the agent, which is why the trigger has to be something
  the owner does on purpose beforehand.
- **handoff versus second-brain.** `handoff` is its own plugin rather than part
  of the memory system, because writing a handoff prompt is useful in every
  project, including one that never installs memory. In that project the memory
  step is skipped and everything worth keeping goes into the prompt. It contains
  no memory types, no destinations, and no rule about what is worth keeping;
  those stay with the project's own rules. Same boundary `memory-pr-hook` keeps.
- **session-summary versus work-tracker and the wrap-up ritual.** All three
  answer some version of "where do things stand", but for different scopes and
  audiences. `session-summary` is a read-only view of one conversation, written
  around the owner's own requests as a table, ending in whatever still needs
  them, and it writes nothing. `work-tracker` owns
  durable ticket state that outlives the chat, so a request worth keeping goes
  there rather than into a summary. The `wrap-up-ritual` rule is the moment that
  says to update those durable records at the end of substantial work. The
  summary is what the owner reads; the tracker is what the next session reads.
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
  bar is exactly the mid-work budget the style allows. `steer-to-the-goal` still
  adds its own distinct constraint on top. `define-your-terms` was the fourth
  rule to go, folded into the style by #102.
  **The two known costs, and what became of them.** Nothing checked a finished
  reply once `writing-guard` was deleted, which was accepted on a stated
  condition: bring the check back if em dashes returned. #102 restored it,
  narrowed to the em dash and the section sign, with every judgement call left
  to the style. The other cost stands: an output style never reaches a helper
  agent. It is now handled twice over rather than fixed, since it cannot be
  fixed at this level. `follow-the-output-style` tells a helper agent to read
  the style file before writing anything the owner will read, and an agent that
  writes something the owner reads carries the rules in its own definition,
  which is what the "How to write your report" section in `memory-verifier.md`
  is.
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
  [second-brain v3](../plugins/second-brain/README.md) is a fresh Markdown-only
  system and does not use that infrastructure.
- **Overlap with Claude Code's native memory.** Claude Code now ships an
  auto-memory feature that captures cross-session notes on its own (machine-local).
  It overlapped part of the legacy v1 capture system. Existing v1 projects
  should deactivate the old automatic capture paths. V3 uses
  project Markdown and does not require transcript capture.

## For an agent asked "what is X?"

Answer from the canonical home, not from memory:

1. A plugin or skill: read that plugin's `README.md` (linked above), then the
   `SKILL.md` if you need the exact steps.
2. A rule: read `library/rules/general/README.md` (or `library/rules/salesforce/README.md`) and
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

`tests/installed-copy-check.mjs` guards a problem only this repository has. It
is set up with its own toolkit, so it holds two of almost everything: the rule
file it ships to other projects, and the copy in `.claude/rules/` that governs
the session editing it. Change one and forget the other and the toolkit starts
telling other projects one thing while doing another, and every other test still
passes. It also checks that the block both root instruction files carry is the
same in each, and that the memory routing in them still matches the
second-brain plugin's `orientation-snippet.md`. Run it with
`node tests/installed-copy-check.mjs`.

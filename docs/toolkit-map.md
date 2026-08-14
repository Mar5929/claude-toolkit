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
| [project-init](../plugins/project-init/README.md) | Put the toolkit's rules and systems into a project, new or existing, and the machine-wide ones onto the computer itself | `project-init`, `project-sync`, `machine-sync` | `/plugin install project-init` | Sets up a project, and sets up a machine |
| [second-brain](../plugins/second-brain/README.md) | Portable Git-native project knowledge with fixed properties, project-specific tags, visible provenance, short meaning reviews, read-only health reports, and separate read-only Claude Code session history shared by Claude, Codex, and optional Obsidian | `second-brain`, `remember`, `recall`, `cleanup`, `session-search` | `/plugin install second-brain` | Sets up a project |
| [sf-architect-solutioning](../plugins/sf-architect-solutioning/README.md) | Salesforce solution architect: approved solution plan before any build | `sf-architect-solutioning` | `/plugin install sf-architect-solutioning` | Install and go |
| [git-workflows](../plugins/git-workflows/README.md) | Parallel-session-safe git lifecycle workflows | `pull-latest`, `reset-to-remote`, `merge-and-clean-up` | `/plugin install git-workflows` | Install and go |
| [hooks-library](../plugins/hooks-library/README.md) | Reusable style, writing, Git-attribution, and Salesforce deployment hooks; system-specific knowledge hooks stay with second-brain | `hooks-library` | `/plugin install hooks-library` | Wires into settings |
| [work-tracker](../plugins/work-tracker/README.md) | Git-authoritative backlog, handoffs, relationships, landing proof, and optional GitHub Projects | `work` | `/plugin install work-tracker` | Sets up a project |
| [session-skills](../plugins/session-skills/README.md) | The six things you reach for inside one conversation: play back a brain dump, say it simply, get grilled on it, hand it off, recap it, and track what is still open | `braindump`, `explain-simply`, `grill-me`, `handoff`, `session-summary`, `track-tasks` | `/plugin install session-skills` | Install and go |

## Skills at a glance

| Skill | Plugin | Purpose | Trigger |
|---|---|---|---|
| project-init | project-init | Walk a NEW project through setup gates, one skippable step at a time | `/project-init` |
| project-sync | project-init | Audit an EXISTING project against the toolkit and close approved gaps | `/project-sync` |
| machine-sync | project-init | Audit THIS COMPUTER's `~/.claude/` against the toolkit's machine-wide set and close approved gaps. Also the whole setup for a new computer | `/machine-sync`, "set up this machine from my toolkit" |
| second-brain | second-brain | Explain, install, audit, migrate, and maintain the complete project knowledge system | `/second-brain` |
| remember | second-brain | Decide where persistent information belongs, show short What, Where, Why, Assumptions, and Unverified bullets, save only the approved meaning, and rebuild the knowledge index | `/remember`, "remember this" |
| recall | second-brain | Start from the project map and retrieve only the specifications and memories relevant to the task | `/recall`, "what does the project know about this?" |
| cleanup | second-brain | Combine read-only property, tag, provenance, and health findings with a meaning review, then repair only what the owner approves | `/cleanup`, "clean up project knowledge" |
| session-search | second-brain | Search saved local Claude Code CLI discussions only after current project files leave a real gap | `/session-search`, "find the earlier Claude Code discussion" |
| sf-architect-solutioning | sf-architect-solutioning | 5-phase Salesforce solutioning to an approved plan | `/sf-architect-solutioning` |
| pull-latest | git-workflows | Get current with the remote without rewriting or discarding | `/pull-latest` |
| reset-to-remote | git-workflows | Hard-reset a repo to mirror the remote, safely gated | `/reset-to-remote` |
| merge-and-clean-up | git-workflows | Merge one approved PR and remove only its completed branch and worktree | `/merge-and-clean-up`, "merge and clean up" |
| work | work-tracker | Manage local work items and their optional GitHub Issues and Project mirror | `/work`, "add this to the backlog", "what should I work on next?" |
| braindump | session-skills | Play a pasted brain dump back in very simple words, list each ask and every guess, and wait for the owner's yes before any work starts | `/braindump`, "play that back", "tell me what you heard" |
| explain-simply | session-skills | Re-explain the last answer or a named file as short bullets, simplifying the wording and never the facts | `/explain-simply`, "explain that like I'm five", "put that in plain bullets", "simpler" |
| grill-me | session-skills | Stress-test an idea one question at a time and preserve every answer | `/grill-me`, "grill me" |
| handoff | session-skills | Invoke the project's remember workflow when available, then draft a fresh-session prompt that opens with the goal, carries anything unsaved, and is checked against the repository | `/handoff`, `/handoff check`, "write a handoff", "I'm going to clear context" |
| session-summary | session-skills | Table every request the owner made in a session, in their words, each with a status, then say what still needs them | `/session-summary`, "summarize this session", "what did I ask for?" |
| track-tasks | session-skills | Build or refresh the list of every topic still open in this session, then print it | `/track-tasks`, "what is still open", "where are we", "park that one" |

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

Reusable hooks live in [`hooks-library`](../plugins/hooks-library/README.md),
including the two Salesforce guards and the machine-wide Git-attribution guard.
Second-brain ships its two system-specific lifecycle hooks beside its runtime.

## The machine-wide set: what lands on a computer

`plugins/project-init/machine/` is the third pile in that plugin and the one
most easily confused with `library/`. The difference is where it lands:
`library/` goes into a project folder when someone runs a setup skill on it,
this goes into the owner's own `~/.claude/` and applies to every repository on
the machine, including ones nobody ever set up.

| Folder | Holds |
|---|---|
| `machine/rules/` | rule files that install to `~/.claude/rules/`, loaded in every project on the machine |
| `machine/settings/required.json` | the settings values `~/.claude/settings.json` must carry, merged in key by key and never written over the file |

It also names the machine-wide hooks, whose scripts stay in `hooks-library` with
every other hook. `machine-sync` installs all three kinds.

It is deliberately small, and its own `README.md` carries the test that keeps it
that way: a thing belongs there only if it must hold in a repository nobody set
up, and only if it is not already in `library/` or the output styles. Shipping
the same guidance in both piles would mean two copies that drift apart. Today it
holds two rules. `no-ai-attribution.md` comes with a settings value and a hook
that each close a hole the other two leave. `propose-the-best-solution.md`
stands alone and says the best answer always gets said out loud, whatever it
would cost in time, effort, or resources.

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
- **Project knowledge runtime sources**: the five skills under
  `plugins/second-brain/skills/`, the startup and pull-request hooks under
  `plugins/second-brain/hooks/`, the generated-index, health, and migration
  tools under `plugins/second-brain/tools/`, and the new-layout templates referenced by the
  setup skill. The [plugin README](../plugins/second-brain/README.md) is the
  canonical package description.
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
- **Shipped project knowledge package**: the
  [plugin README](../plugins/second-brain/README.md) describes one `knowledge/`
  vault with a short project overview, one generated index, approved
  specifications, seven typed memory homes, and unchecked brainstorms. The
  owner sees every persistent change before it becomes current truth. The package
  ships four focused knowledge workflows plus setup and safe migration. Its
  startup hook reads only the map, its pull-request hook only reminds, and no
  hook or helper agent writes or approves knowledge.
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
  be wrong about structure and cannot record intent. Written project knowledge
  (`knowledge/memory/knowledge/`) answers why, and can be wrong the moment code
  changes,
  which is what the freshness hook and its drift file exist to catch. Neither
  replaces the other, and a project can install the graph without installing
  second-brain at all.
- **Archived second-brain v1 versus the current package.** The repository
  archive preserves the old implementation for historical inspection. The
  installable second-brain plugin contains only the current Markdown vault.
  Project-sync may recognize old local wiring, but it
  does not use the archive as a migration source.
- **second-brain versus its focused skills.** `second-brain` owns setup,
  migration, explanation, and audit. `remember` saves owner-approved truth,
  `recall` retrieves it, and `cleanup` maintains it. `session-search` reads past
  Claude Code CLI discussions only after current files fail to answer and never
  turns history into current truth. There is no competing quick-note store.
- **work-tracker versus the older work-items tree.** Not two trackers.
  work-tracker is the executable extension of the same four-stage convention.
  It adopts existing `SPEC.md`, `STATUS.md`, and notes in place, adds
  `ITEM.json` and deterministic commands, and rebuilds the old hand-edited
  index as a generated view. The six structured statuses distinguish Backlog
  from Ready and In Progress from In Review without creating another folder
  hierarchy.
- **work-tracker versus project knowledge.** work-tracker owns task status,
  blockers, work-item relationships, branch and pull-request evidence, and the
  current handoff. Project knowledge may link specifications and persistent memory to a work-item
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
  `follow-the-output-style` rule and, for an agent that writes persistent files, by
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
- **hooks-library versus project knowledge.** The general hook library owns
  reusable guards and reminders. Second-brain owns its two project-knowledge
  lifecycle hooks because their commands and messages are part of installing
  that system. The startup hook reads only the two map files, and the
  pull-request hook only pauses for the owner-approved `remember` review. Neither
  writes knowledge.
- **git-workflows versus the parallel-agent-sessions rule.** The rule states the
  behavior ("assume other sessions share the repo"); the three skills are the
  safe git commands that carry it out. Different layers, not duplicates. That
  rule absorbed the separate `worktree-isolation` rule, which had described the
  same situation from the other side: the two were 156 lines that each opened by
  explaining they were not the other, and both stated "one session, one worktree,
  one branch" and "do not fix a dirty tree, tell the owner".
- **grill-me versus work-item and memory files.** `grill-me` owns raw discovery
  notes in a flat, dated `knowledge/brainstorms/` collection. Each brainstorm links to
  every resulting specification without being copied into system-area folders.
  A work item's `SPEC.md` and `STATUS.md` own that ticket's approved scope and
  readable handoff, while `ITEM.json` owns structured task state. Top-level
  `knowledge/specs/` owns persistent current behavior and second-brain owns persistent project
  knowledge. The brainstorm may inform those artifacts but does not replace
  them.
- **handoff versus session-summary.** Both run at the end of a session and they
  answer different questions. `session-summary` answers "which of my requests
  are where, and what still needs me", is read-only, and writes nothing.
  `handoff` answers "how does somebody else pick this up": it runs the memory
  check first, saves what the owner approves, and then writes a prompt for a
  fresh session carrying everything that was not saved. Run both if you want
  both; neither covers the other.
- **braindump versus explain-simply versus grill-me.** Three moments around
  understanding. `braindump` checks the assistant understood the owner, before
  any work starts, in one playback and a yes. `explain-simply` re-says
  something already answered so the owner understands the assistant.
  `grill-me` is the long interview that builds the understanding question by
  question and writes it to a file.
- **explain-simply versus session-summary.** Both shorten something, and they
  shorten different things. `session-summary` reads the conversation and reports
  which of the owner's requests are where. `explain-simply` takes one thing that
  did not land, the last answer or a file it is pointed at, and says it again in
  plainer words without changing what it says. One is a status view of a
  session; the other is a second reading of one piece of material.
- **track-tasks versus session-summary versus the work tracker.** Three views of
  "what is outstanding", at three different lifespans. `track-tasks` holds what
  is open right now, in this chat, and dies with the session. `session-summary`
  reads the conversation once and reports which of the owner's requests are
  where; it is a snapshot, not a list that is kept. The work tracker owns
  anything that outlives the conversation, and is the only one of the three that
  survives a `/clear`. A topic that turns into real work moves from the first to
  the third; the middle one never holds anything on its own.
- **The six skills in one plugin are still six skills.** `session-skills`
  packages `braindump`, `explain-simply`, `grill-me`, `handoff`,
  `session-summary`, and `track-tasks` together because each would be a
  single-skill plugin whose packaging cost more than its instructions, and
  because the owner wants all six on every machine. Sharing a plugin does not blur what they do; the distinctions above
  still hold. What it costs is granularity: they install and version together.
- **explain-simply versus the output style and the style-reminder hook.** The
  output style sets how everything is written and the hook keeps it in front of
  the assistant. `explain-simply` is the escape hatch for the times that was not
  enough, on material that is technical by nature. It reads the active output
  style before writing, so it plainly restates rather than switching voice.
- **handoff versus the second-brain pull-request reminder.** Same job at two different moments, solved
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
  those stay with the project's own knowledge system. The pull-request reminder
  keeps the same boundary.
- **handoff-verifier versus project-knowledge approval.** The handoff verifier
  checks a temporary prompt against the repository before the owner sees it.
  Persistent project knowledge uses short direct owner approval instead of a
  verifier agent. Handoff still works in projects that never install
  second-brain.
- **session-summary versus work-tracker and persistent review.** All three
  answer some version of "where do things stand", but for different scopes and
  audiences. `session-summary` is a read-only view of one conversation, written
  around the owner's own requests as a table, ending in whatever still needs
  them, and it writes nothing. `work-tracker` owns
  persistent ticket state that outlives the chat, so a request worth keeping goes
  there rather than into a summary. The `remember` review is the moment that
  proposes persistent project knowledge at the end of substantial work. The
  summary is what the owner reads; the work item is what the next session reads.
- **The session-continuity rule cluster.** Several general rules touch "do not
  lose context across sessions", which can read as overlap:
  `keep-claudemd-current` keeps root instructions small,
  `offer-context-handoff` prepares the next session, `work-item-folders` owns a
  Git-based work-item structure, `where-persistent-information-belongs` routes
  active work, rules, skills, specifications, memory, references, and session
  history, and `steer-to-the-goal` preserves direction beyond one chat. The
  second-brain skills own the approved completion review. The placement rule is
  the standing obligation the others assume: work stays with its item,
  persistent information gets one home, and nothing important lives only in a
  conversation.
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
  which is why every helper-agent definition that writes owner-facing prose must
  carry those writing rules itself.
- **sf-architect-solutioning versus the Salesforce rules versus the dependency
  graph.**
  sf-architect decides what to build; the `salesforce-rules` install standing
  safety and workflow rules; the dependency graph answers impact questions
  about the metadata that already exists. Project knowledge may link to that evidence but does
  not require or own the analysis tool. Three different jobs on the same stack.

### Genuine watch-items (revisit these)

- **second-brain v1's heavy infrastructure.** The legacy system used a Worker,
  a per-project database, embeddings, and two curators. Its complexity
  contributed to the correctness and curator-cost failures that led to
  retirement. Its source is consolidated in the
  [v1 archive](../archive/second-brain-v1/README.md) outside active plugins. Do
  not install it in a new project. The shipped
  [current second-brain package](../plugins/second-brain/README.md) is a fresh
  Markdown-only system and does not use that infrastructure.
- **Overlap with Claude Code's native memory.** Claude Code now ships an
  auto-memory feature that captures cross-session notes on its own (machine-local).
  It overlapped part of the legacy v1 capture system. Existing v1 projects
  should deactivate the old automatic capture paths. The current package uses
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
same in each, plus the project-local second-brain runtime copies against the
files the plugin ships. Run it with
`node tests/installed-copy-check.mjs`.

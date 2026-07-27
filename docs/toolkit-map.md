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
| [second-brain](../plugins/second-brain/README.md) | Retire v1 while Git-native v2 is built | `second-brain`, `remember` | No installation until v2 ships |
| [sf-architect-solutioning](../plugins/sf-architect-solutioning/README.md) | Salesforce solution architect: approved solution plan before any build | `sf-architect-solutioning` | `/plugin install sf-architect-solutioning` |
| [git-workflows](../plugins/git-workflows/README.md) | Parallel-session-safe git sync | `pull-latest`, `reset-to-remote` | `/plugin install git-workflows` |
| [session-autoname](../plugins/session-autoname/README.md) | Background agent sessions stay named after their overarching project | `session-autoname` | `/plugin install session-autoname` |
| [grill-me](../plugins/grill-me/README.md) | Persistent discovery interviews that checkpoint every answer | `grill-me` | `/plugin install grill-me` |
| [work-tracker](../plugins/work-tracker/README.md) | Git-authoritative backlog, handoffs, relationships, landing proof, and optional GitHub Projects | `work` | `/plugin install work-tracker` |

## Skills at a glance

| Skill | Plugin | Purpose | Trigger |
|---|---|---|---|
| project-init | project-init | Walk a NEW project through setup gates, one skippable step at a time | `/project-init` |
| project-sync | project-init | Audit an EXISTING project against the toolkit and close approved gaps | `/project-sync` |
| second-brain | second-brain | Refuse v1 installs; offer local deactivation or removal for an existing v1 project | `/second-brain` |
| remember | second-brain | Return `v1_retired` without dispatching curators or writing data | `/remember`, "remember this" |
| sf-architect-solutioning | sf-architect-solutioning | 5-phase Salesforce solutioning to an approved plan | `/sf-architect-solutioning` |
| pull-latest | git-workflows | Get current with the remote without rewriting or discarding | `/pull-latest` |
| reset-to-remote | git-workflows | Hard-reset a repo to mirror the remote, safely gated | `/reset-to-remote` |
| session-autoname | session-autoname | Install the per-machine hook that re-names a background session each turn | `/session-autoname` |
| grill-me | grill-me | Stress-test an idea one question at a time and preserve every answer | `/grill-me`, "grill me" |
| work | work-tracker | Manage local work items and their optional GitHub Issues and Project mirror | `/work`, "add this to the backlog", "what should I work on next?" |

## Rules and references (canonical indexes)

These are not duplicated here. Go to the index that owns them:

- **General rules** (the standard `.claude/rules` files copied into every
  project): [general-rules/README.md](../plugins/project-init/skills/project-init/references/general-rules/README.md).
  Marks each rule default ON or conditional.
- **Salesforce rules**: [salesforce-rules/README.md](../plugins/project-init/skills/project-init/references/salesforce-rules/README.md).
- **MCP tool rules** (per-server, conditional):
  `plugins/project-init/skills/project-init/references/mcp-best-practices.md`.
- **second-brain v1 internals**: `architecture-spec.md`, `setup-recipe.md`,
  `curator-write-path.md` (how a curated note reaches the store, and the fallback
  ladder when it cannot), `brain-scope.md` (which brain is this project's, and
  what stops a session reading another project's), and the `profiles/`, `agents/`, `hooks/`, and `server/`
  folders (each with its own README) under
  `plugins/second-brain/skills/second-brain/references/`.
  They are archived historical evidence, not installation, deployment, export,
  or migration instructions. The old Worker has no default deploy path.
- **Proposed second-brain v2 rework**: [docs/second-brain-v2/README.md](second-brain-v2/README.md)
  indexes the not-yet-shipped Git-native technical architecture and its working
  implementation units. The architecture and units reflect the Git-first,
  typed-memory, proactive-review direction. The plugin README is the canonical
  current status. V2 starts from authoritative Git content and is not shipped.
- **sf-architect references**: the `metadata/*` guides and templates under
  `plugins/sf-architect-solutioning/skills/sf-architect-solutioning/references/`.

## How the pieces relate (and what looks redundant but is not)

Most apparent overlaps in this toolkit are pairs that answer different questions.
The genuine watch-items are called out at the end.

- **project-init versus project-sync.** Same inventory of toolkit systems,
  opposite entry points: init lays foundations in an empty project, sync audits
  and back-fills a project that already exists. Keep both.
- **second-brain v1's three layers.** The legacy memory graph ("what did we decide and
  why"), the knowledge layer ("why does this code exist", prose pinned to file
  SHAs), and the structural layer ("if I change this, what breaks", built
  mechanically by graphify or the Salesforce metadata graph) sound alike but do
  not overlap. Only the structural layer does impact analysis; only the
  knowledge layer carries the human "why". See the plugin README for the split.
- **second-brain versus remember.** Neither writes. `second-brain` identifies a
  retired local v1 integration and offers deactivation or removal, while
  `remember` returns the structured retired result. Their old writer behavior
  remains documented only as archived implementation evidence.
- **Two historical v1 "the brain is not there" failures.**
  `curator-write-path.md` records how v1 handled the right store being
  unreachable, while `brain-scope.md` records how it blocked the wrong store.
  Retirement authorizes no read or write fallback. Do not use another project's
  store.
- **The outbox versus the capture journal.** Both are retired v1 mechanisms at
  opposite ends of the old pipeline. Neither is imported into v2. Local removal
  must show the exact paths and separately confirm deletion of any non-empty
  user material.
- **work-tracker versus the older work-items tree.** Not two trackers.
  work-tracker is the executable extension of the same four-stage convention.
  It adopts existing `SPEC.md`, `STATUS.md`, and notes in place, adds
  `ITEM.json` and deterministic commands, and rebuilds the old hand-edited
  index as a generated view. The six structured statuses distinguish Backlog
  from Ready and In Progress from In Review without creating another folder
  hierarchy.
- **work-tracker versus second-brain v2.** work-tracker owns task status,
  blockers, work-item relationships, branch and pull-request evidence, and the
  current handoff. V2 may point decisions, requirements, and durable knowledge
  at a work-item ID, but it does not copy or overrule status.
- **work-tracker versus GitHub Projects.** Git files are authoritative by
  default. The optional adapter creates or updates repository issues and a
  Project as a collaboration mirror. Generated dashboards, GitHub issue bodies,
  and Project fields can all be reconciled from the local records.
- **git-workflows versus the worktree-isolation rule.** The rule states the
  behavior ("assume other sessions share the repo"); the two skills are the safe
  git commands that carry it out. Different layers, not duplicates.
- **grill-me versus work-item and memory files.** `grill-me` owns raw discovery
  notes under `brainstorms/`. A work item's `SPEC.md` and `STATUS.md` own the
  approved design and readable handoff, while `ITEM.json` owns structured task
  state and second-brain concerns durable project knowledge. The brainstorm may
  inform those artifacts but does not replace them.
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
  canonical folder per item),
  `steer-to-the-goal` (save a goal that outlasts one chat), and the conditional
  `memory-system-ground-rules` (route durable memory through the curator). Each
  targets a distinct moment (mid-work, wrap-up, session handoff, per-task,
  per-goal, long-term memory), so they compose rather than repeat.
  `keep-claudemd-current` names the status doc, the design doc, and long-term
  memory as destinations for detail that does not belong in CLAUDE.md, but it
  does not own any of them; the rules above do. Naming where something goes is
  what keeps CLAUDE.md from absorbing all three.
- **The response-style rule cluster.** `lead-with-the-answer` and
  `close-with-the-ask` are intentionally paired (the second builds on the first:
  answer first, end with the next action); `answer-last-question-box`,
  `define-your-terms`, and `steer-to-the-goal` each add a distinct constraint.
  Mild overlap by design, not accidental duplication. `quiet-while-working`
  sits one level up from all of them: they govern how you write a single reply,
  it governs how many replies you write at all (at most one short line per
  chunk while working, the whole explanation saved for one final reply). The
  one deliberate exception is `show-phase-progress`, whose one-line bar is
  exactly the mid-work budget `quiet-while-working` allows.
- **sf-architect-solutioning versus the Salesforce rules and structural layer.**
  sf-architect decides what to build; the `salesforce-rules` install standing
  safety and workflow rules; the second-brain Salesforce structural layer answers
  impact questions about existing metadata. Three different jobs on the same
  stack.

### Genuine watch-items (revisit these)

- **second-brain v1's heavy infrastructure.** The legacy system used a Worker,
  a per-project database, embeddings, and two curators. Its complexity
  contributed to the correctness and curator-cost failures that led to
  retirement. Do not install it in a new project. The proposed
  [second-brain v2 rework](second-brain-v2/README.md) responds to measured
  correctness and curator-cost failures by keeping requirements under `specs/`,
  organizing other memory under typed `memory/` folders, making Git the
  authority, proactively proposing end-of-task updates, removing curator agents
  from normal wrap-up, and reserving databases for optional rebuildable search
  or structural indexes.
- **Overlap with Claude Code's native memory.** Claude Code now ships an
  auto-memory feature that captures cross-session notes on its own (machine-local).
  It overlapped part of the legacy v1 capture system. Existing v1 projects
  should deactivate the old automatic capture paths. The v2
  design treats Git as authoritative and does not require transcript capture.

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

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
| [second-brain](../plugins/second-brain/README.md) | Durable cross-session memory, knowledge, and structural layers (MCP) | `second-brain`, `remember` | `/second-brain` (usually via project-init) |
| [sf-architect-solutioning](../plugins/sf-architect-solutioning/README.md) | Salesforce solution architect: approved solution plan before any build | `sf-architect-solutioning` | `/plugin install sf-architect-solutioning` |
| [git-workflows](../plugins/git-workflows/README.md) | Parallel-session-safe git sync | `pull-latest`, `reset-to-remote` | `/plugin install git-workflows` |

## Skills at a glance

| Skill | Plugin | Purpose | Trigger |
|---|---|---|---|
| project-init | project-init | Walk a NEW project through setup gates, one skippable step at a time | `/project-init` |
| project-sync | project-init | Audit an EXISTING project against the toolkit and close approved gaps | `/project-sync` |
| second-brain | second-brain | Install the memory and knowledge architecture into a project | `/second-brain` |
| remember | second-brain | Wrap-up: dispatch both curators to save a finished work item | `/remember`, "remember this" |
| sf-architect-solutioning | sf-architect-solutioning | 5-phase Salesforce solutioning to an approved plan | `/sf-architect-solutioning` |
| pull-latest | git-workflows | Get current with the remote without rewriting or discarding | `/pull-latest` |
| reset-to-remote | git-workflows | Hard-reset a repo to mirror the remote, safely gated | `/reset-to-remote` |

## Rules and references (canonical indexes)

These are not duplicated here. Go to the index that owns them:

- **General rules** (the standard `.claude/rules` files copied into every
  project): [general-rules/README.md](../plugins/project-init/skills/project-init/references/general-rules/README.md).
  Marks each rule default ON or conditional.
- **Salesforce rules**: [salesforce-rules/README.md](../plugins/project-init/skills/project-init/references/salesforce-rules/README.md).
- **MCP tool rules** (per-server, conditional):
  `plugins/project-init/skills/project-init/references/mcp-best-practices.md`.
- **second-brain internals**: `architecture-spec.md`, `setup-recipe.md`,
  `curator-write-path.md` (how a curated note reaches the store, and the fallback
  ladder when it cannot), and the `profiles/`, `agents/`, `hooks/`, and `server/`
  folders (each with its own README) under
  `plugins/second-brain/skills/second-brain/references/`.
- **sf-architect references**: the `metadata/*` guides and templates under
  `plugins/sf-architect-solutioning/skills/sf-architect-solutioning/references/`.

## How the pieces relate (and what looks redundant but is not)

Most apparent overlaps in this toolkit are pairs that answer different questions.
The genuine watch-items are called out at the end.

- **project-init versus project-sync.** Same inventory of toolkit systems,
  opposite entry points: init lays foundations in an empty project, sync audits
  and back-fills a project that already exists. Keep both.
- **second-brain's three layers.** The memory graph ("what did we decide and
  why"), the knowledge layer ("why does this code exist", prose pinned to file
  SHAs), and the structural layer ("if I change this, what breaks", built
  mechanically by graphify or the Salesforce metadata graph) sound alike but do
  not overlap. Only the structural layer does impact analysis; only the
  knowledge layer carries the human "why". See the plugin README for the split.
- **second-brain versus remember.** second-brain installs the system; remember
  feeds it at wrap-up. Capture is automatic, remember is the deliberate step that
  turns a session's conclusions into curated memory. The two automatic triggers
  sit either side of it: a `SessionEnd` hook curates a finished conversation as
  one arc, and a server cron sweeps sessions that died before ending. Curation is
  always session-scoped, never time-sliced, because a conversation read
  mid-flight turns ideas the owner floated into decisions they never made.
- **The outbox versus the capture journal.** Both hold things not yet in the
  graph, at opposite ends of the pipeline. The journal is raw per-turn events,
  written automatically by the Stop hook, which a curator later reads and turns
  into nodes. `.claude/memory-outbox/` holds the opposite: nodes a curator has
  already finished, parked because the store was unreachable at that moment.
  Journal entries are input to curation; outbox files are its output waiting on
  delivery, which is why they are committed and why a leftover file always means
  unfinished work.
- **The work-items tree versus work-item memory nodes.** Not two trackers. The
  tree (scaffolded by project-init Gate 1) owns STATUS: an item's stage is which
  stage folder it sits in, and second-brain's `work-items-status.mjs` hook reads
  that at session start, so "is this done already?" is answered by the file
  system and cannot be misremembered. Memory owns the LINKS: a `work-item` node
  carries the want, a pointer to the folder, and edges to the decisions and
  knowledge nodes produced while working it. The curator may never store a stage.
- **git-workflows versus the worktree-isolation rule.** The rule states the
  behavior ("assume other sessions share the repo"); the two skills are the safe
  git commands that carry it out. Different layers, not duplicates.
- **The session-continuity rule cluster.** Several general rules touch "do not
  lose context across sessions", which can read as overlap: `keep-claudemd-current`
  (write durable facts into CLAUDE.md, and route everything that is not a rule
  out of it so the file stays readable), `wrap-up-ritual` (update the status or
  handoff doc and commit), `offer-context-handoff` (hand a fresh session a
  self-contained prompt), `work-item-folders` (a SPEC and STATUS per work item),
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
  Mild overlap by design, not accidental duplication.
- **sf-architect-solutioning versus the Salesforce rules and structural layer.**
  sf-architect decides what to build; the `salesforce-rules` install standing
  safety and workflow rules; the second-brain Salesforce structural layer answers
  impact questions about existing metadata. Three different jobs on the same
  stack.

### Genuine watch-items (revisit these)

- **second-brain's heavy infrastructure on small or solo projects.** The full
  system (a Worker, a per-project database, embeddings, two curators) is worth it
  when a project needs shared, cross-machine, cross-cloud curated memory. For a
  small or single-machine project it may be more than the job needs; a lighter
  files-in-git tier is a reasonable future option.
- **Overlap with Claude Code's native memory.** Claude Code now ships an
  auto-memory feature that captures cross-session notes on its own (machine-local).
  It overlaps part of what second-brain does. second-brain still adds shared,
  cross-surface, curated, drift-pinned memory that the native feature does not,
  but a project should not unknowingly run both capture systems without a reason.

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

# Toolkit Operating System manual

**Review draft.** This document is being developed under
[issue #306](https://github.com/Mar5929/claude-toolkit/issues/306). It explains
the intended working experience and links to this repository's existing
instructions. Publishing this draft does not activate it, install it in other
projects, or establish that every proposed capability works. Installation,
update behavior, and startup delivery still need their own design and review.

## What the toolkit is for

The toolkit helps an owner and an agent turn a request into a checked result
and continue that work across sessions. It brings reusable instructions,
skills, project knowledge, and work management into the same working process.
The owner can describe the goal in ordinary words. The agent finds the relevant
support and keeps the work understandable without making the owner remember
commands or filing locations.

Each project chooses the components it needs. The toolkit supplies reusable
ways of working; the project supplies its purpose, terminology, systems,
constraints, and chosen tracker. Claude Code or Codex supplies the model,
session, tools, and permissions. An installed plugin, an enabled project
component, and a component working in the current session are separate facts.

This manual explains how those parts cooperate. A subsystem's own manual or
skill owns its detailed procedures. The [Toolkit Operating System PRD](prds/toolkit-operating-system/toolkit-operating-system.md)
and its children hold requirements and their approval state. This manual does
not grant approvals or resolve proposals left open in those records.

## How the owner and agent work together

The owner sets direction, resolves material choices, and accepts the outcome.
The agent reads relevant context, recommends a useful next step, performs
authorized work, and maintains the records needed to continue it. Questions
should address an actual uncertainty after checking existing answers.

The amount of process follows the work. A question may need only an answer and
its source. A larger change may need requirements, a design, a plan, focused
helpers, testing, and review. Work can return to an earlier decision when new
evidence changes what is needed. The project's approval boundaries still apply.

Agent reasoning stays native. Short reminders and handshakes bring relevant
instructions to attention at useful points. An acknowledgment shows receipt
or intent; the resulting work and its verification establish what happened.
One acknowledgment cannot establish lasting retention after context loss.

Shared records make work resumable. A record earns its place by helping the
next decision or preserving information that would otherwise be lost. Links
connect those records without making several copies of the same meaning.

## Finding your way around a project

Start with the project's root instruction chain. In this repository,
[AGENTS.md](../AGENTS.md) leads to [CLAUDE.md](../CLAUDE.md), which provides the
project map and routes to applicable instructions. A folder's own instructions
explain its local conventions when work reaches that folder.

The main areas contribute different kinds of context:

- **Project orientation:** [SOUL.md](../SOUL.md) describes the agent's role;
  [project.md](project.md) describes the project; [current.md](current.md)
  points to active work. The tracker supplies that work's current details.
- **Working instructions:** [.claude/rules/](../.claude/rules/README.md)
  holds standing rules. Skills supply procedures when the task needs them.
  Host configuration connects installed capabilities to a session.
- **Knowledge:** [knowledge/knowledge-manual.md](knowledge-manual.md) explains the knowledge
  subsystem. Requirements and lasting project context have their own homes
  beneath `knowledge/`. Its [routing policy](knowledge-manual.md#put-information-in-one-place)
  owns the detailed decisions about where information belongs.
- **Work records and designs:** the chosen tracker holds each item's working
  record. Here, that tracker is GitHub, and [docs/designs/](../docs/designs/README.md)
  holds linked solution designs. A project using a local tracker follows that
  tracker's document locations.
- **Existing-system understanding:** an enabled System Guide explains useful
  parts and relationships in the actual project. Its location comes from the
  project's configured `guidePath`. A project may instead have another named
  architecture reference. This repository currently has no configured System Guide.
- **Implementation and deliverables:** the root project map identifies the
  actual source, tests, and deliverable folders. In this toolkit repository,
  [plugins/](../plugins/CLAUDE.md) contains the packaged reusable components.
  Other projects have their own structures.
- **Outside reference material:** [ai-external-knowledge/](../.claude/rules/ai-external-knowledge.md)
  holds captured outside sources. Their presence supplies evidence to consult;
  project decisions still need their own authoritative records.

These are the current paths in this repository. Some proposed Knowledge System
requirements describe a different future layout. Those proposals do not move
the files or change the current manual's instructions. A version installed in
another project must name that project's actual paths and enabled components.

## From a request to a checked result

Consider a request such as: "The advisor search misses people from the same
firm." The following walkthrough shows how the components cooperate. The
linked instructions supply the detailed steps and applicable approvals.

### Establish the goal and current position

The agent reads the project orientation and finds any existing work item for
the request. That record establishes what is already known, what the owner
approved, and where work stopped. The agent explains its understanding of the
wanted result and asks about material gaps.

[Work guidance](../plugins/session-skills/skills/work-guide/SKILL.md) connects
the conversation to the chosen tracker. It helps organize work without
requiring a second tracker or restarting an existing plan.

### Understand the relevant system

The agent consults the required search behavior, relevant past decisions,
and available explanations of the search implementation. The knowledge
subsystem helps find project context. An enabled System Guide helps locate
existing parts and relationships. Inspection and tests establish what the
system actually does now.

Those sources answer different questions. Required behavior describes the
target; system evidence shows the present behavior; earlier decisions explain
constraints. When they disagree, the disagreement is part of the work to
resolve. A proposed requirement cannot establish that a feature already exists.

### Decide the change and organize the work

The owner and agent clarify the expected search results and how to recognize
success. [Requirements guidance](../plugins/session-skills/skills/requirements-helper/SKILL.md)
supports that discussion. When a design is needed,
[solution-design guidance](../plugins/session-skills/skills/solution-design/SKILL.md)
connects the requirements to a buildable approach and its review.

The tracker links the requirements, design, decisions, and actionable tasks.
Focused helpers can investigate or review bounded parts while the main
conversation keeps the overall work coherent. Their findings inform decisions;
they do not approve the owner's requirements or complete the parent item.

### Perform and verify the authorized work

The agent carries out the approved scope using the project's implementation
and collaboration instructions. It tests the advisor-search behavior against
the agreed outcome and checks relevant effects on surrounding behavior.
Unresolved failures remain visible in the work record.

Verification distinguishes what was inspected, what passed checks, and what
the owner accepted. A changed file or successful acknowledgment alone does
not establish that the request has been fulfilled. The
[work-item instructions](../.claude/rules/work-item-stages.md) own progress,
approval, and completion handling.

### Deliver and leave the records ready to continue

The change follows the project's publication and deployment route. The agent
reports what reached its destination and what remains pending. Acceptance,
Git publication, deployment, and use in a fresh session can happen at different
times and need their own evidence.

The tracker records the outcome and any remaining action. If the work reveals
lasting project context, the knowledge subsystem handles its review and save.
If it changes useful system explanations, the configured System Guide or
architecture reference receives its authorized upkeep. Required-behavior
documents are reconciled through their own approval process. Each destination
keeps the part it owns and links back to the work when useful.

## Pausing, resuming, and switching work

A useful stopping point leaves the next session able to act: the work item
identifies the current task, governing inputs, accepted decisions, unresolved
questions, blockers, and next action. Project working context helps find that
item. The [handoff workflow](../plugins/session-skills/skills/handoff/SKILL.md) connects continuation
with the applicable project-knowledge review.

On resumption, the agent reads the current records and restores the saved
position. It checks whether the tracker or relevant sources changed since the
handoff. Switching work means establishing the new item's context while
preserving the previous item's position. A past assignment does not establish
that another agent is still working.

The same division of responsibilities applies to a failed save: the work
record identifies what remains unfinished, while the destination's procedure
owns recovery. A local edit, an unpushed commit, and a verified remote save
must remain distinguishable.

## Keeping the project equipped

[Project setup and sync](../plugins/project-init/README.md) establish and
maintain the project's selected components and instruction paths. Publishing
a toolkit release makes it available; each project's adoption still needs to
be established. Machine setup, project setup, and the current session have
different responsibilities.

Authorized explanatory documentation follows the project's
[documentation publication instructions](../.claude/rules/knowledge-direct-commit.md).
Changes to rules, skills, prompts, configuration, or executable behavior use
the implementation workflow, including when their files are Markdown. The
publication rule owns the detailed checks, concurrency handling, and recovery.

For this manual, the agreed destination is `knowledge/toolkit-manual.md`.
The intended setup owners are `project-init` and `project-sync`. Root
instructions and relevant reminders should reference its actual project path.
The startup design should provide concise orientation and lead to detailed
instructions when needed. Its delivery on each host and its behavior after
context loss still require design and verification. This draft does not alter
those mechanisms.

## Component instructions

Use the component relevant to the work, then return to the shared work record.
These links resolve inside this toolkit repository; distribution must provide
working equivalents for each equipped project.

| Component | Contribution to the whole workflow | Detailed owner |
| --- | --- | --- |
| Project setup and sync | Select components and keep their project instructions connected | [Project-init](../plugins/project-init/README.md) |
| Guided work | Connect requests, plans, tasks, requirements, design, and review | [Session skills](../plugins/session-skills/README.md) |
| Work tracking | Preserve the item's current position and outcome in the chosen tracker | [Project tracker](../CLAUDE.md#where-work-is-tracked) and [work-item instructions](../.claude/rules/work-item-stages.md); [local tracker](../plugins/work-tracker/README.md) when selected |
| Project knowledge | Find and preserve qualifying project context across sessions | [Knowledge manual](knowledge-manual.md) |
| System Guide, when enabled | Explain important existing parts and their relationships | [System Guide instructions](../plugins/system-guide/skills/system-guide/SKILL.md) |
| Handoff | Carry unfinished work into another session | [Handoff](../plugins/session-skills/skills/handoff/SKILL.md) |
| Documentation publication | Publish authorized documentation through the project's save route | [Publication instructions](../.claude/rules/knowledge-direct-commit.md) |

The [PRD index](prds/spec-index.md) leads to the required behavior and proposal
status for each area. Detailed schemas, save formats, tracker commands, hook
protocols, and subsystem maintenance procedures remain in their owning files.

# Toolkit Operating System manual

This manual explains how the toolkit's parts work together in this project.
Read all of it during the first project orientation and after resume, clear, or
compaction. If the read is incomplete, open the file again from the first
missing section, in chunks when needed. Report a missing or unreadable file.
Acknowledge receipt and intent only after the complete read.

The project root instructions name the paths, tracker, tools, and optional
components that apply here. This manual supplies the shared workflow. A
component's installed skill, manual, rule, or project pointer owns its detailed
procedure. An available component does not grant permission to use every action
it describes.

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

## What shapes a working session

Output styles, rules, skills, and hooks contribute throughout the workflow.
Understanding their roles helps explain why an agent communicates a certain
way, opens a procedure, receives a reminder, or encounters a blocked action.

### Output styles: how the agent communicates

An output style guides the wording and presentation of replies. The toolkit's
Claude Code setup selects Plain English by default while preserving a deliberate
owner choice of another style. Its purpose is understandable explanations with
enough context to make decisions. The [output styles library](../plugins/project-init/library/output-styles/README.md)
owns the available styles and their setup; the [Plain English style](../plugins/project-init/library/output-styles/plain-english.md)
owns its actual writing instructions. Concise replies retain material evidence,
uncertainty, failed checks, and useful references so the owner can assess the
result without asking for missing essentials.

Communication guidance also matters in documents, diagrams, and helper
findings. A style selected for the main Claude Code conversation does not by
itself establish that helpers or another host received it. Helper instructions
carry the applicable writing guidance, and the project's
[artifact-writing rule](../.claude/rules/plain-english-artifacts.md) covers
owner-facing artifacts. Setup and review need to account for those different
recipients. Selecting a style does not prove that an answer follows it.

### Rules and skills: how work is carried out

Rules establish standing working constraints, such as how concurrent sessions
share a repository or how authorized documentation is published. Skills supply
the procedure for a particular task, such as refining requirements or preparing
a handoff. Root and folder instructions help the agent find the applicable
rules and skills; the current request determines which procedures are useful.

The [rules catalog](../.claude/rules/README.md) identifies this project's
standing instructions. The [toolkit catalog](../docs/toolkit-map.md) connects
the available plugins and skills. Their detailed instructions remain with
those owners. A skill's availability does not grant permission to perform
every action it describes.

### Hooks: actions at particular moments

A hook runs a configured action when the host emits an event, such as session
startup, a submitted message, or a tool operation. Hooks can supply context,
prompt a review, or guard a specific action. Each hook has its own scope and
failure behavior; a reminder and a blocking guard have different effects.

For example, the [hooks library](../plugins/hooks-library/README.md) includes
a specification-review reminder at the first edit, a Claude Code style
handshake when a user message arrives, and guards for selected publishing or
Salesforce deployment operations. The style handshake directs attention back
to the selected style; that style remains the owner of the writing guidance.
It asks for a silent read with no acknowledgment. It does not check that the
read happened or that the reply follows the style.

Some hooks belong to a subsystem. The [knowledge subsystem](../plugins/second-brain/README.md)
owns its startup and save reminders, while [System Guide](../plugins/system-guide/README.md)
owns its enabled-guide startup pointer. Keeping each hook with its component
connects the prompt or check to the procedure responsible for the outcome.

A project's actual host settings determine which hooks run and when. A hook
listed in a catalog is not necessarily enabled here, and Claude Code event
support does not establish equivalent Codex behavior. Setup and sync own the
configuration; the component documentation owns event names, commands,
installation details, and limitations. Verify delivery in the intended host
before relying on a reminder or guard.

## Finding your way around a project

Start with the project's root instruction chain. In this repository,
[AGENTS.md](../AGENTS.md) leads to [CLAUDE.md](../CLAUDE.md), which provides the
project map and routes to applicable instructions. A folder's own instructions
explain its local conventions when work reaches that folder.

The main areas contribute different kinds of context:

- **Project orientation:** [SOUL.md](../SOUL.md) describes the agent's role;
  [project.md](project.md) describes the project; [current.md](memory/current.md)
  points to active work. The tracker supplies that work's current details.
- **Working instructions:** [.claude/rules/](../.claude/rules/README.md)
  holds standing rules. Skills supply procedures when the task needs them.
  Host configuration connects installed capabilities to a session.
- **Knowledge:** [knowledge/knowledge-manual.md](knowledge-manual.md) explains the knowledge
  subsystem. Requirements and lasting project context have their own homes
  beneath `knowledge/`. Its [routing policy](knowledge-manual.md#3-choose-the-record-that-owns-the-information)
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

These are the paths delivered by this Knowledge package. Another project must
use its actual installed layout and enabled components until its authorized migration.

Requested handoffs are found in the Session handoffs section of working memory, newest first; detailed scope and approvals remain in their owning records.


## From a request to a checked result

Consider a request such as: "The advisor search misses people from the same
firm." The following walkthrough shows how the components cooperate. The
linked instructions supply the detailed steps and applicable approvals.

Across these steps, the selected communication guidance shapes explanations,
rules govern the work, and skills provide the relevant procedures. Configured
hooks intervene at their designated events: startup may supply orientation,
a message may prompt a silent style read, and a tool operation may trigger a reminder
or guard. The agent still has to carry out the work and verify its result.

### Establish the goal and current position

The agent reads the project orientation and finds any existing work item for
the request. That record establishes what is already known, what the owner
approved, and where work stopped. The agent explains its understanding of the
wanted result and asks about material gaps.

[Work guidance](../plugins/session-skills/skills/work-guide/SKILL.md) connects
the conversation to the chosen tracker. It helps organize work without
requiring a second tracker or restarting an existing plan.

For substantial new work, the [work plugin](../plugins/work-tracker/README.md)
offers agents responsibility for delivery with the human as product owner.
The accepted, declined, or revoked choice stays with that goal in the existing tracker
and is read in future sessions. After acceptance, the agent asks whether the
owner wants one team inside this chat or a Main Orchestrator chat that
coordinates other chats, each with its own team, where the host supports that.
On a host that does not, the agent asks only whether to run one team of helpers
inside this chat, and a no means the main agent does the work itself.
That answer stays with the goal's delivery choice. The
[team arrangements](../plugins/work-tracker/skills/work/references/team-arrangements.md)
sheet explains each answer. Choosing an arrangement authorizes bounded helper
agents for that goal only, within every other existing limit. With the Main
Orchestrator arrangement the agent also asks whether to archive a team chat
once its work is complete, merged and shipped, reported to a file, and approved
by the owner. Agents manage the agreed work and records;
the owner makes product decisions and approves results. Other existing build,
publication, and helper permissions still apply. This method works with an
external tracker without creating local tracking files. The copied work-item
rule provides the offer and continuation contract when the plugin is absent.

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

The tracker links the requirements and design and keeps overall status,
approvals, other tasks, and progress. While refining a PRD or design, update
its actual text and keep concise Notes at the bottom for useful discussion,
decisions with approval state, remaining document tasks, and the resume point.
Preparation belongs in the design; no separate interview or continuation file
is needed. A specification is the requirements document, not an extra copy.
Identify the exact current document or workbook from the owner and existing
links, not its date alone. Questions record who must answer, status, and what
they affect. Answers update the existing question and the actual document.
Save before moving past a meaningful topic, then read the changed destination
back. A progress note alone is not a requirements or design update. Working
design stays distinct from finalized architecture when the project separates them.
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

New local items consolidate Overview, Roadmap, Tasks, Recent History, and
Requirements in `WORK-ITEM.md`. New external items use those same sections in
their description, with native fields authoritative. Designs remain separate
and linked. Existing items keep their format; no migration is required. The
[work plugin record format](../plugins/work-tracker/skills/work/references/record-format.md)
owns the details. Meaningful human decisions are saved promptly in their
actual document or item and read back, using the project's publication route.

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

On resumption, the agent reads the work item and opens the relevant document.
For PRD or design refinement, its bottom Notes holds the exact place to resume;
other work uses the item's continuation record. Meaningful document changes
are saved during the conversation through the authorized route. Saving does
not approve requirements, design, or implementation. The agent checks whether
the tracker or relevant sources changed since the handoff. Switching work means
establishing the new item's context while
preserving the previous item's position. A past assignment does not establish
that another agent is still working.

The same division of responsibilities applies to a failed save: the work
record identifies what remains unfinished, while the destination's procedure
owns recovery. A local edit, an unpushed commit, and a verified remote save
must remain distinguishable.

## Keeping the project equipped

This project's [manual-upkeep rule](../.claude/rules/keep-manuals-current.md)
requires finalized changes to keep both operating manuals accurate as part of
publication. Each manual retains its own scope; detailed knowledge instructions
continue to come from the knowledge manual's managed source.

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

This file is the toolkit repository's detailed copy. The reusable project source
is [the project-init template](../plugins/project-init/library/templates/toolkit-manual.md),
installed as `knowledge/toolkit-manual.md`. Project-init and project-sync own
the copy, project-specific root route, and configured startup pointer. The
startup route supplies concise orientation and requires an explicit complete
read of the project file; it does not inject this full manual body. Merge,
project adoption, complete reading, and recovery after context loss still need
separate evidence on each supported host.

The [content and delivery review](../docs/designs/306-toolkit-manual-review.md)
records the inspected implementation, actual startup evidence, and remaining
proof. Issue closure does not establish manual acceptance or delivery.

## Component instructions

Use the component relevant to the work, then return to the shared work record.
These links resolve inside this toolkit repository; distribution must provide
working equivalents for each equipped project.

| Component | Contribution to the whole workflow | Detailed owner |
| --- | --- | --- |
| Project setup and sync | Select components and keep their project instructions connected | [Project-init](../plugins/project-init/README.md) |
| Output styles | Shape replies and connect communication guidance to the intended recipient | [Output styles](../plugins/project-init/library/output-styles/README.md) and [artifact-writing rule](../.claude/rules/plain-english-artifacts.md) |
| Rules and skills | Apply standing constraints and task-specific procedures | [Project rules](../.claude/rules/README.md) and [toolkit catalog](../docs/toolkit-map.md) |
| Hooks | Deliver context, reminders, or guards at configured host events | [Hooks library](../plugins/hooks-library/README.md); subsystem hooks remain with [knowledge](../plugins/second-brain/README.md) and [System Guide](../plugins/system-guide/README.md) |
| Guided work | Connect requests, plans, tasks, requirements, design, and review | [Session skills](../plugins/session-skills/README.md) |
| Work tracking | Preserve the item's current position and outcome in the chosen tracker | [Project tracker](../CLAUDE.md#where-work-is-tracked) and [work-item instructions](../.claude/rules/work-item-stages.md); [local tracker](../plugins/work-tracker/README.md) when selected |
| Project knowledge | Find and preserve qualifying project context across sessions | [Knowledge manual](knowledge-manual.md) |
| System Guide, when enabled | Explain important existing parts and their relationships | [System Guide instructions](../plugins/system-guide/skills/system-guide/SKILL.md) |
| Handoff | Carry unfinished work into another session | [Handoff](../plugins/session-skills/skills/handoff/SKILL.md) |
| Documentation publication | Publish authorized documentation through the project's save route | [Publication instructions](../.claude/rules/knowledge-direct-commit.md) |

The [PRD index](prds/prd-index.md) leads to the required behavior and proposal
status for each area. Detailed schemas, save formats, tracker commands, hook
protocols, and subsystem maintenance procedures remain in their owning files.

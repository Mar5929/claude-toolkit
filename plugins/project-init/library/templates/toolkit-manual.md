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
and continue the work across sessions. The owner can describe a goal in
ordinary words. The agent finds the relevant support and keeps the work
understandable without making the owner remember commands or filing locations.

Each project chooses the components it needs. The toolkit supplies reusable
ways of working. The project supplies its purpose, terminology, systems,
constraints, and chosen tracker. Claude Code or Codex supplies the model,
session, tools, and permissions. An installed plugin, an enabled project
component, and a component working in the current session are separate facts.

## How the owner and agent work together

The owner sets direction, resolves material choices, and accepts the outcome.
The agent reads relevant context, recommends a useful next step, performs
authorized work, and maintains the records needed to continue it. Questions
address an actual uncertainty after checking existing answers.

The amount of process follows the work. A question may need only an answer and
its source. A larger change may need requirements, a design, a plan, focused
helpers, testing, and review. Work can return to an earlier decision when new
evidence changes what is needed. The project's approval boundaries still apply.

Agent reasoning stays native. Short reminders and handshakes bring relevant
instructions to attention at useful points. An acknowledgment shows receipt or
intent. The resulting work and its verification establish what happened. One
acknowledgment cannot establish lasting retention after context loss.

Shared records make work resumable. A record earns its place by helping the
next decision or preserving information that would otherwise be lost. Links
connect those records without making several copies of the same meaning.

## What shapes a working session

### Output styles

An output style guides the wording and presentation of replies. Toolkit setup
selects Plain English by default while preserving a deliberate owner choice of
another style. Its purpose is understandable explanations with enough context
to make decisions. The selected style and project instructions own the actual
writing guidance.

Communication guidance also matters in documents, diagrams, and helper
findings. A style selected for the main conversation does not establish that a
helper or another host received it. Helper instructions and applicable project
rules carry their own writing guidance. Selecting a style does not prove that
an answer follows it.

### Rules and skills

Rules establish standing working constraints. Skills supply the procedure for
a particular task. Root and folder instructions help the agent find the rules
and skills that apply. The current request determines which procedures are
useful. Open a detailed procedure when the work reaches it instead of copying
every procedure into the root files or this manual.

### Hooks

A hook runs a configured action when the host emits an event, such as session
startup, a submitted message, or a tool operation. Hooks can supply context,
prompt a review, or guard a specific action. Each hook has its own scope and
failure behavior. A reminder and a blocking guard have different effects.

Some hooks belong to one subsystem. Project knowledge owns its knowledge
startup and save reminders. System Guide owns its enabled-guide startup status.
General project hooks remain with their installed owner. A hook can observe a
read or acknowledgment without proving understanding or compliance.

The project's actual host settings determine which hooks run and when. A hook
present in a plugin is not necessarily enabled here. Claude Code event support
does not establish equivalent Codex behavior. Setup and sync own configuration;
component instructions own event names, commands, installation details, and
limits. Verify delivery in the intended host before relying on a reminder or
guard.

## Finding your way around this project

Start with `AGENTS.md` when the host uses it, then follow its route to
`CLAUDE.md`. The root instructions identify the project's actual folders,
tools, quick-save locations, tracker, and enabled optional components. A
folder's own instructions explain local conventions when work reaches it.

The main areas have different jobs:

- **Project orientation:** root instructions and any configured project role or
  overview files explain the project and lead to current work.
- **Working instructions:** `.claude/rules/` holds installed standing rules.
  Skills supply task procedures when needed.
- **Knowledge, when enabled:** `knowledge/knowledge-manual.md` owns detailed
  knowledge placement, trust, approval, and lifecycle policy. Requirements and
  lasting context use the homes named there.
- **Work records and designs:** the tracker named in `CLAUDE.md` owns each
  item's current record. Its linked design location holds build plans when the
  project uses separate design files.
- **System Guide, when enabled:** its configured guide path explains useful
  existing parts and relationships. The project may instead name another
  architecture reference.
- **Implementation and deliverables:** the root codemap identifies actual
  source, tests, and deliverable folders.
- **Outside reference material:** the root codemap identifies captured outside
  sources. Their presence supplies evidence to consult; project decisions still
  need their own authoritative records.

These paths are conditional. Do not invent a component or folder that the
project did not select. Use the actual paths in the root instructions.

## From a request to a checked result

Consider a request such as, "The advisor search misses people from the same
firm." The steps below show how the components cooperate. Installed component
instructions supply detailed actions and approvals.

Across these steps, communication guidance shapes explanations, rules govern
the work, and skills provide procedures. Configured hooks intervene at their
events. The agent still has to carry out the work and verify its result.

### Establish the goal and current position

Read the project orientation and find any existing work item for the request.
That record establishes what is known, what the owner approved, and where work
stopped. Explain the wanted result and ask only about material gaps.

For substantial new work, the work plugin may offer agents responsibility for
delivery with the human as product owner. The accepted, declined, or revoked
choice stays with that goal in the chosen tracker and is read in later sessions.
Agents manage the agreed work and records; the owner makes product decisions
and approves results. Existing build, publication, and helper permissions still
apply. This method does not create a second tracker.

### Understand the relevant system

Consult required behavior, relevant past decisions, and available explanations
of the current system. Project knowledge can help find context when enabled. An
enabled System Guide can help locate parts and relationships. Inspection and
tests establish what the system does now.

Those sources answer different questions. Required behavior describes the
target. System evidence shows present behavior. Earlier decisions explain
constraints. Name disagreements. A proposed requirement cannot establish that
a feature exists.

### Decide the change and organize the work

Clarify the expected result and how to recognize success. Use requirements and
solution-design guidance when the task needs them. The tracker links the
requirements and design and keeps overall status, approvals, tasks, and
progress.

During PRD or design refinement, update the actual document and keep concise
Notes at its bottom for useful discussion, decisions with approval state,
remaining document tasks, and the resume point. Preparation stays in the
design. Identify the current document or workbook from owner direction and
existing links, not its date alone. Questions record who must answer, status,
and effect. Answers update the question and actual document. Save a meaningful
authorized update before moving past it, then read the destination back. A
progress note alone is not a requirements or design update.

Focused helpers can investigate or review bounded parts while the main
conversation keeps the whole work coherent. Their findings inform decisions;
they do not approve requirements or complete the parent item.

### Perform and verify authorized work

Carry out the approved scope using the project's implementation and
collaboration instructions. Test the agreed result and relevant surrounding
behavior. Keep unresolved failures visible in the work record.

Verification distinguishes what was inspected, what passed checks, and what
the owner accepted. A changed file or acknowledgment alone does not establish
that the request was fulfilled. The installed work-item instructions own
progress, approval, and completion handling.

New local work items use `WORK-ITEM.md` with Overview, Roadmap, Tasks, Recent
History, and Requirements. New external items use those sections in their
description, with native fields authoritative. Designs remain separate and
linked. Existing items keep their format. The work plugin owns record details.

### Deliver and leave records ready to continue

Follow the project's publication and deployment route. Report what reached its
destination and what remains pending. Acceptance, Git publication, deployment,
and use in a fresh session can happen at different times and need separate
evidence.

The tracker records the outcome and remaining actions. If work reveals lasting
project context, the knowledge subsystem handles its review and save when that
system is enabled. If it changes useful system explanations, the configured
System Guide or architecture reference receives authorized upkeep. Required
behavior documents follow their own approval process. Each destination keeps
the part it owns and links to the work when useful.

## Pausing, resuming, and switching work

A useful stopping point leaves a later session able to act. The work item names
the current task, governing inputs, accepted decisions, unresolved questions,
blockers, and next action. Use the handoff workflow when available to connect
continuation with any applicable project-knowledge review.

On resumption, read the work item and relevant document. For PRD or design
refinement, bottom Notes holds the exact resume point. Other work uses the
item's continuation record. Save meaningful document changes during the
conversation through their authorized route. Saving does not approve
requirements, design, or implementation. Check whether the tracker or relevant
sources changed after the handoff. A past assignment does not establish that
another agent is still working.

A failed save follows the same ownership boundaries. The work record identifies
what remains unfinished; the destination's procedure owns recovery. A local
edit, an unpushed commit, and a verified remote save remain distinguishable.

## Keeping the project equipped

Project setup and sync establish and maintain selected components, the root
instruction routes, and this manual. Publishing a toolkit release only makes an
update available. Each project's adoption and each new session's receipt still
need evidence.

Authorized explanatory documentation follows the publication instructions
named in the root Quick saves section. Rules, skills, prompts, configuration,
and executable behavior follow the implementation workflow even when their
files are Markdown. The owning rule supplies checks, concurrency handling, and
recovery.

The reusable source for this file is
`plugins/project-init/library/templates/toolkit-manual.md` inside the installed
project-init plugin. Project setup and sync install it as
`knowledge/toolkit-manual.md` and keep the root pointer current. A project may
have approved adaptations. Sync shows meaningful differences, applies updates
already covered by its authorization, and preserves local meaning. It asks only
when meaning or scope is unresolved or local changes conflict.

The startup route provides a concise orientation and an explicit read of this
manual. If host output is shortened or saved to a spill file, read the complete
manual from this project path before acknowledging receipt. Startup, resume,
clear, and compaction delivery still require evidence in each supported host.

## Component instructions

Use the component relevant to the work, then return to the shared work record.
Find its exact instructions through the root files and the host's installed
skills or plugins.

| Component | Contribution to the workflow | Detailed owner |
| --- | --- | --- |
| Project setup and sync | Select components and keep project routes current | `project-init` and `project-sync` skills |
| Output style | Shape replies for the main conversation | Selected host style and project output-style file |
| Rules and skills | Apply standing constraints and task procedures | `.claude/rules/` and installed skills |
| Hooks | Deliver context, reminders, or guards at configured events | Configured hook and its owning component |
| Guided work | Connect requests, plans, tasks, requirements, design, and review | Session skills |
| Work tracking | Preserve current position and outcome | Tracker named in `CLAUDE.md`; work plugin when selected |
| Project knowledge, when enabled | Find and preserve qualifying project context | `knowledge/knowledge-manual.md` |
| System Guide, when enabled | Explain existing parts and relationships | Configured System Guide skill and guide path |
| Handoff | Carry unfinished work to another session | `handoff` skill when available |
| Documentation publication | Publish authorized documentation through the project route | Quick saves rule named in `CLAUDE.md` |

Detailed schemas, save formats, tracker commands, hook protocols, and subsystem
maintenance procedures remain in their owning instructions.

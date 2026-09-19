# Keep the Active Work Item Accurate

The work tracker is the source of truth for current work. Before substantial
work, identify the tracker and active item, then read its requirements, current
state, progress, blockers, and next step. Use the item named by the owner, an
unambiguous branch or pull request, or the tracker's active-item record. If no
tracker is configured, skip tracker work. If a tracker exists but no item or
more than one item fits, ask one short question.

Subagents may do delegated work. The main agent alone updates or completes the
canonical item.

## Offer responsibility for delivery

When starting or resuming a substantial feature or work item, read and apply
the existing goal's delivery choice before offering or organizing delivery.
Use the installed `work` skill's agent-led delivery method when available. A simple question or quick edit needs no offer.
With no recorded choice or prior explicit request, ask:

> Would you like agents to take responsibility for delivering this, with you acting as product owner?

Wait for the choice before taking over delivery. Acceptance applies to that
goal across sessions; a later explicit request counts without asking again.
A decline preserves normal help and existing record upkeep. Do not repeat the
offer for that goal unless it grows substantially or the owner requests it.
The owner can revoke acceptance; save that state, return to normal help and
required upkeep, and apply the same offer-suppression rules as decline. Missing
access is not a missing decision.

Keep the current choice, goal scope, source/person/date, authority boundaries,
coordinating session, and next-action references in the existing item. Local
mode uses Overview notes in `WORK-ITEM.md` (legacy: preserved User notes in
`STATUS.md`); external mode uses the item description or native fields.
If no item exists, use the normal authorized capture route when the goal
warrants a record; never create an item or tracker solely to record refusal.
With no authorized durable home, say so and carry the decision in the handoff.
Reread updates and preserve intervening edits. Report failed writes as `not saved` and successful writes with failed readback as `saved but not verified`,
with the exact pending action for recovery. A recorded lead is coordination information, not a lock or proof of a running agent.

With acceptance, agents drive discovery, interviews, requirements, research,
design, authorized implementation, checks, and delivery using the plan below.
The owner supplies product direction, resolves meaningful tradeoffs, and
approves results. Delegation does not grant build, deployment, merge, spending,
or helper-selection authority beyond what was given. Existing approvals count.
When the work plugin is unavailable, apply this contract with the project's
existing guidance and tracker; do not require an installation to keep helping.

## Keep a useful, adaptable plan

Teach the agent what to consider; use the project's chosen tracker to record it.
Keep an ordered roadmap from the current position to the intended outcome. Its
stages use names that fit the work; they do not have to match the toolkit
lifecycle stages below. Every applicable roadmap stage is fulfilled by one or
more actionable tasks, linked child work items, or both.

Each task names its work item and roadmap stage and records its objective,
instructions and governing constraints, linked requirements, design, decisions,
and other inputs, expected deliverable, acceptance condition, status,
dependencies when applicable, current position, and next action. Link to the
canonical source instead of copying it. Keep the detail proportionate, and
revise the plan without losing accepted decisions or completed evidence.

A child work item may fulfill a parent roadmap stage. The child keeps its own
requirements, design, roadmap, tasks, status, and approvals. Link it through the
tracker's existing parent-child relationship; folder nesting alone does not
claim that relationship. Completing a task or child does not complete or
approve its parent.

Use native fields, existing sections, or linked canonical documents in the
chosen tracker. Do not create a local mirror or require a second planning
system. Legacy work without these task details remains valid; when it resumes,
reconcile the missing detail from accepted evidence without inventing tasks,
history, or approval. Actual approval, permission, and environment boundaries
still apply.

## One work-item record

New local items use `WORK-ITEM.md`. New external items use the same sections
in their description: Overview, Roadmap, Tasks, Recent History, Requirements.
Keep designs separate and linked. The `work` skill owns the template and local
commands. Use native external fields as the authority for status, assignments,
and relationships, referencing them from the description as needed. Do not
create a local mirror or migrate existing items.

## Work type sets the approval boundary

Use the project's native work type. Toolkit local records use a short
lower-case kebab-case type. Common types are `discovery`,
`solution-design`, `build`, `data-load`, `repository-maintenance`, `research`,
and `task`. A project may use another clear type. Existing `bug` and
`enhancement` values remain valid.

`In Progress` means the item is active. It does not mean implementation has
started. `build` and `data-load` require approved requirements before that work
starts. For every other type, judge the approval needed from the real risk and
scope. Do not turn a small maintenance item into a fixed ceremony, and do not
use a broad type to avoid approval for implementation.

## Stages describe, not command

A work item may carry one current stage. The table below supplies toolkit
defaults; an external tracker can use its own terminology and process. Preserve
its native fields and map the meaning instead of imposing this table as a schema.

| Stage | What it covers | Active status |
| --- | --- | --- |
| `01-discovery` | Working out what the owner wants. | Backlog |
| `02-refinement` | Turning that into requirements. | Backlog |
| `03-requirements-approved` | The owner approved the requirements. | Ready |
| `04-solution-design` | Deciding how it gets built. | In Progress |
| `05-breakdown` | Splitting work that is too large. | In Progress |
| `06-implementation-plan` | Ordering the build steps. | In Progress |
| `07-tracking-setup` | Creating build tracking when needed. | In Progress |
| `08-build` | Producing the requested change. | In Progress |
| `09-testing` | Checking it against the requirements. | In Progress |
| `10-bug-fixing` | Fixing what testing found. | In Progress |
| `11-user-approval` | The owner reviews the result. | In Progress |
| `12-pr-and-push` | Repository work is in a pushed pull request. | In Review |
| `13-deployment` | The result is put where it belongs. | In Review |
| `14-spec-update` | Lasting specifications match the result. | In Review |

Use the stage the work is actually in. Stages may be skipped, repeated, or
revisited when that fits the work. Record one short reason when a move is not
obvious. Pull-request stages apply only to repository work. A legacy item with
no stage is valid; never invent or backfill history.

When using toolkit stages, known stages derive the active status shown above.
`Done` and `Cancelled` are
terminal states set by an intentional completion or cancellation action, not by
a stage. An unknown stage is preserved and reported rather than silently
changed.

## PRD and solution-design continuity

Before discussion or edits, read the active item's instructions and the records
it names. Establish the exact current requirements document or workbook, working
design, and any separate finalized architecture. Use the owner's designation
and recorded links, not filenames or modification dates alone. If authority is
unclear, resolve that one question and keep other work moving. Record the paths
in the existing item; do not create a start page or another file inventory.

While creating or refining a PRD or solution design, update its actual text as
answers settle and keep concise `Notes` at the very bottom. Notes holds useful
discussion, decisions with approval state, open questions, remaining document
tasks, and the exact resume point. Save meaningful changes promptly through
the project's authorized route. A saved draft is not approval to build.

The item retains overall status, stage, approvals, other tasks and blockers,
and links to those documents. For a document-refinement task, its position and
next action can point to the document's Notes; do not duplicate that detail.
Other work stays in the item. Read the item and the linked document's Notes
when resuming. Do not add separate interview or continuation files.

## Capture during the conversation

Classify meaningful information and update its existing home before moving past
that topic. An unanswered question is information to save, not a reason to wait.
Open decisions must not delay recording independent settled answers. Before
asking again, check the current records and cited sources for an answer. If
sources conflict, retain the conflict as open rather than choosing a convenient
answer. Do not treat a question, suggestion, or tentative answer as approval.

| Information | Home | What to record |
| --- | --- | --- |
| Requirement or correction | Actual requirements document or designated workbook | Updated meaning and approval state |
| Design choice | Actual working design | Approach, approved or proposed, and relevant decision context |
| Open question | Relevant requirements/design Notes; otherwise the work item's existing notes | Question, who must answer, open status, and what it affects; use unknown when the person is not known |
| Answer or decision | Update the existing question and affected requirements/design; otherwise the work item | Answer, person, source/date when known, and approval state; mark resolved only when the question is actually answered |
| Outstanding task | Document Notes for work on that document; otherwise the work item's task records | Action, responsible person when known, status, next step, and relevant blocker |
| Useful general note | Relevant document Notes; otherwise existing work-item notes | Only the context needed to continue |

Use the selected tracker's normal update commands or native fields. Edit
document content in its designated file, sheet, or section; a progress entry
alone does not update the requirements or design. Where the project separates
working design from finalized architecture, keep unresolved discussion in the
working record and publish only settled design through its approval/save route.

As soon as the human makes a decision or supplies meaningful requirements,
design information, or a correction, save it in its existing home before
continuing the topic. For authorized Git-tracked documents, make a small
checked commit and push through the project's documentation publication route;
for external items, update the description or native field immediately; for
Git-ignored local items, save through the tracker. Do not wait for session end
or bundle settled answers behind unanswered questions. Respect existing content
approval boundaries and record tentative input as tentative.

After saving under existing authorization, reread the
changed section or query the record to confirm its meaning and location. Verify
the document content as well as tracker status. A successful command alone is
not proof that the intended information was recorded. Say what remains unsaved
if saving fails or requires authority not already given. Do not claim a local
write was committed, pushed, or shared without checking those separately.

## Record meaningful progress

Update the active item when meaning changes:

- a stage, status, type, blocker, or exact next step changes;
- the owner gives a material choice, answer, requirement, constraint, approval,
  or rejection;
- an outside approval is reported, including who approved and any supplied
  conditions, without claiming it was independently verified;
- a discovery or decision changes the plan; or
- a substantial requested outcome finishes.

Capture the owner's meaning promptly and briefly. Do not add rationale, scope,
conditions, or certainty the owner did not give. If ambiguity would materially
change the record, ask one short question. Do not log routine commands, files
opened, ordinary tests, tiny edits, or discarded ideas.

## Update the chosen tracker

**Local folders.** Run `work active`, then use the `work` skill. Read the
selected task and its linked inputs before acting. A conflicting active item is
a hard stop until it is intentionally replaced. Commands update the item,
roadmap tasks, readable progress, history, and branch-scoped active state.

**GitHub.** Resolve and read the issue number, title, body, single Progress log
comment, stage label, and board status before changing it. Requirements and
decisions kept in a PRD or design stay there; link them from the issue. Other
requirements and decisions stay in the issue body. Keep the overall roadmap and tasks in
clear issue-body sections, using child issues or sub-issues when they own real
scope. For new items, append the short dated event in Recent History in the
description. Existing items keep their one Progress log comment. Treat body,
any existing progress comment, label, and board field as one logical update, read them back, and repair
or report any partial failure. Do not create a local mirror.

**Another tracker.** Follow its project instructions and keep one canonical
item. Never create a second tracker to make this rule fit.

## Leave a usable handoff

Before ending substantial unfinished work, leave the active task with its exact
current position and next action, blockers or none, open decisions, linked
governing sources, and true status. Keep the parent item and roadmap accurate.
Read the result back or run the tracker's validation. The `handoff` skill
performs this tracker step before its memory review.

## Finish or cancel honestly

Before marking work `Done`, give the owner a short result, known gaps, and
evidence appropriate to the item, then ask for approval. A clear earlier
approval of that result counts. Do not mark `Done` without approval or describe
an unverified outcome as complete.

`Done` means the intended outcome was accepted. `Cancelled` means work stopped
without achieving it. For repository work, also state whether the completion
commit reached the default branch. Git evidence is not required for work that
does not change a repository.

Local approved completion emits one `work_completed` event. An unapproved local
completion may be recorded only as the tool's explicit exception: report the
missing approval, emit no approved-completion event, and add approval later
through the narrow completion command. In GitHub mode, closing the approved
issue is the completion event; close as not planned for cancellation.

# Keep the Active Work Item Accurate

The work tracker is the source of truth for current work. Before substantial
work, identify the tracker and active item, then read its requirements, current
state, progress, blockers, and next step. Use the item named by the owner, an
unambiguous branch or pull request, or the tracker's active-item record. If no
tracker is configured, skip tracker work. If a tracker exists but no item or
more than one item fits, ask one short question.

Subagents may do delegated work. The main agent alone updates or completes the
canonical item.

## Work type sets the approval boundary

Record a short lower-case kebab-case type. Common types are `discovery`,
`solution-design`, `build`, `data-load`, `repository-maintenance`, `research`,
and `task`. A project may use another clear type. Existing `bug` and
`enhancement` values remain valid.

`In Progress` means the item is active. It does not mean implementation has
started. `build` and `data-load` require approved requirements before that work
starts. For every other type, judge the approval needed from the real risk and
scope. Do not turn a small maintenance item into a fixed ceremony, and do not
use a broad type to avoid approval for implementation.

## Stages describe, not command

A work item may carry one current stage:

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

Known stages derive the active status shown above. `Done` and `Cancelled` are
terminal states set by an intentional completion or cancellation action, not by
a stage. An unknown stage is preserved and reported rather than silently
changed.

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

**Local folders.** Run `work active`, then use the `work` skill. A conflicting
active item is a hard stop until it is intentionally replaced. Commands update
the item, readable progress, history, and active state together.

**GitHub.** Resolve and read the issue number, title, body, single Progress log
comment, stage label, and board status before changing it. Settled requirements
and decisions go in the issue body. Append the short dated event to the one
Progress log comment. Treat body, comment, label, and board field as one logical
update, read them back, and repair or report any partial failure. Do not create
a local mirror.

**Another tracker.** Follow its project instructions and keep one canonical
item. Never create a second tracker to make this rule fit.

## Leave a usable handoff

Before ending substantial unfinished work, leave the active item with the exact
next action, blockers or none, open decisions, and true stage and status. Read
the result back or run the tracker's validation. The `handoff` skill performs
this tracker step before its memory review.

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

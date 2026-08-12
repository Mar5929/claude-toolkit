# Track Every Work Item in Its Own Folder

This rule is for projects that chose to track work as files in the repository.
`spec-before-you-build.md` is the tracker-neutral rule that applies whatever the
project uses; this one adds what is specific to the `work-tracker` plugin.

Capture every ticket, feature, setup task, or deferred want in the project's
declared work tracker. When the `work-tracker` plugin is installed, use its
commands instead of manually moving folders or editing structured fields.

The folder is the durable memory for one piece of work. It has to survive a
context window filling up mid-task, a handoff to another agent, and the owner
moving to a different machine. Chat history survives none of those; the folder
does. That is the whole reason it exists, and it is the test for whether an
entry is worth writing.

Each item has one folder with:

- `ITEM.json`: structured status, priority, type, blockers, relationships, and
  Git evidence;
- `SPEC.md`: the goal, requirements, and decisions;
- `STATUS.md`: the readable current handoff and recent dated history; and
- `HISTORY.ndjson`: the full event history.

**`SPEC.md` answers the six parts** set out in `spec-before-you-build.md`: the
requirements, the goal, the reason, what the person using it experiences, how it
behaves from the outside, and edge cases. That rule is the canonical statement
and applies here exactly as it applies to a ticket in an external tracker.

**When the direction changes, update `SPEC.md` in that same session** rather than
leaving the old target standing. This is what keeps a written requirement from
going stale and a later agent from building carefully to the wrong target.

An item stays in `Backlog` until its `SPEC.md` answers all six parts, then moves
to `Ready`. Do not run `work start` on an item that is not `Ready`. Say which of
the six parts are missing and offer to run the refinement session instead.

**Date every `STATUS.md` entry absolutely**, never "yesterday" or "last week". A
handoff is read weeks later by someone who has no idea when it was written.

- Picking an item up? Run `work status`, then read its folder first: `STATUS.md`,
  then `SPEC.md`, before touching anything. Do not work from chat history or a
  memory of an earlier session.
- Starting it? Only if it is `Ready`. Then run `work start` so the branch and
  exact next step are recorded.
- Working on it? Use `work update` in the same session whenever the next step,
  blockers, or direction changes.
- Relating tickets? Use `work link`; do not hand-edit only one side.
- Finished on a branch? Run `work finish`. It keeps the item In Review until
  Git proves the completion commit is in the default branch. Close it out in the
  same session it finished, recording the date and where it landed (commit, pull
  request, or file). An item left looking open misleads as badly as a missing
  handoff.
- Ending a substantial session? Run `work validate` and leave an exact next
  step. `STATUS.md` must always answer two questions: where are we, and what
  happens next?

The structured status is authoritative. The four stage folders group the six
statuses:

- Backlog and Ready;
- In Progress and In Review;
- Done; and
- Cancelled or archived.

`DASHBOARD.md` and `BACKLOG.md` are generated views. Do not edit them as a
source of truth.

If the plugin is not installed but an older manual work-items tree exists,
preserve it and offer `work init`. The initializer adopts existing `SPEC.md`,
`STATUS.md`, and notes without overwriting them. Do not create a competing
tracker.

Capture a want when the owner says it. A request that exists only in a finished
conversation is lost.

When project knowledge is installed, link a work item to the specification,
planning document, decision, or memory that gives it durable context when that
relationship helps, and never copy current item status, blockers, or handoff
into those documents. `capture-the-thinking.md` carries the table of what
belongs where.

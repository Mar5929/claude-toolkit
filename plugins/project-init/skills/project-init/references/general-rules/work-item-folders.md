# Track Every Work Item in Its Own Folder

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

**Keep `SPEC.md` requirements loose on purpose.** A living goal plus a
current-state note, not frozen acceptance checkboxes. Rigid criteria go stale
the moment the work shifts, and a later agent then builds carefully to the wrong
target. When the direction changes, update the specification in that same
session rather than leaving the old target standing.

**Date every `STATUS.md` entry absolutely**, never "yesterday" or "last week". A
handoff is read weeks later by someone who has no idea when it was written.

- Picking an item up? Run `work status`, then read its folder first: `STATUS.md`,
  then `SPEC.md`, before touching anything. Do not work from chat history or a
  memory of an earlier session.
- Starting it? Run `work start` so the branch and exact next step are recorded.
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

When second-brain v3 is installed, link a work item to the specification,
planning document, decision, or memory that gives it durable context when that
relationship helps. Do not copy current item status, blockers, or handoff into
those documents. A work item's `SPEC.md` owns that ticket's approved scope;
top-level `specs/` owns durable product and system behavior beyond the ticket.

# Track Every Work Item in Its Own Folder

Capture every ticket, feature, setup task, or deferred want in the project's
declared work tracker. When the `work-tracker` plugin is installed, use its
commands instead of manually moving folders or editing structured fields.

Each item has one folder with:

- `ITEM.json`: structured status, priority, type, blockers, relationships, and
  Git evidence;
- `SPEC.md`: the goal, requirements, and decisions;
- `STATUS.md`: the readable current handoff and recent dated history; and
- `HISTORY.ndjson`: the full event history.

- Picking an item up? Run `work status`, then read its folder first.
- Starting it? Run `work start` so the branch and exact next step are recorded.
- Working on it? Use `work update` in the same session whenever the next step,
  blockers, or direction changes.
- Relating tickets? Use `work link`; do not hand-edit only one side.
- Finished on a branch? Run `work finish`. It keeps the item In Review until
  Git proves the completion commit is in the default branch.
- Ending a substantial session? Run `work validate` and leave an exact next
  step.

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
relationship helps, and never copy current item status, blockers, or handoff
into those documents. `capture-the-thinking.md` carries the table of what
belongs where.

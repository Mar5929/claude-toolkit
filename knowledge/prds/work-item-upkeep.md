---
summary: Work tracking keeps the active item's decisions, progress, handoff, and accepted outcome accurate across sessions, using flexible stages and one owner of tracker state.
area: work-tracking
status: current
source: GitHub issue 270, requirements approved 2026-09-03, solution design approved 2026-09-05, implementation and merge authorized 2026-09-07
created_at: 2026-09-07
tags: [work-tracking, lifecycle, handoff, approval]
approved_by: Mike Rihm
approval_date: 2026-09-05
work_item: "270"
---

# Work-item upkeep

The work tracker owns the current item, its requirements, progress, blockers,
next step, and completion record. A future session should be able to continue
from that record without reconstructing decisions from conversation history.

Before substantial work, read the relevant item. Record the owner's material
answers, choices, constraints, and approvals promptly. Keep their meaning;
shortening a statement does not permit adding rationale or certainty. Record
outside approvals as reported, with the person and conditions when supplied.
Routine commands, files opened, and ordinary tests are not progress.

Stages describe a normal path and may be skipped or revisited. In Progress
means work is active, including discovery and design. Build and data-load
execution require approved requirements. Other work types use judgment about
the actual scope and risk. A broad type does not authorize unapproved work.

The local tracker selects an active item per branch and refuses changes to a
different item until an intentional switch. Linked worktrees share the records.
Meaningful changes keep the readable progress and machine-readable history in
agreement. Related writes roll back after ordinary command failures; they are
not guaranteed to recover from a process killed between file replacements.

Before a handoff, update the exact next step, blockers, and open decisions in
the selected tracker, then check the record. The handoff skill does this before
its project-knowledge review. Projects without a tracker can still hand off.

Done means the owner accepted the intended outcome. Cancelled means work
stopped without achieving it. Completion evidence fits the work; Git landing
is a separate fact for repository work. The local tool records Done even when
approval is missing, reports the gap, and warns during validation. The agent
is still instructed to obtain approval before completing an item.

An approved local completion emits one dependable notice. Recording approval
later emits that notice once; repeating the same finish does not duplicate it.
Existing items keep their real history, without invented stages or approvals.
GitHub mode uses the issue and its native close event, with one Progress log
comment and no local mirror. Its separate updates must be read back because
GitHub does not update the body, comment, label, and board as one transaction.

Project knowledge may react to completion and link back to the item. It never
becomes another owner of work-item state. The existing lifecycle rule, work
skill, CLI, and handoff skill carry this behavior. The late stage-reminder hook
is retired without a replacement hook.

The [work-tracker documentation](../../plugins/work-tracker/README.md) owns the
command and record details. [Issue 270](https://github.com/Mar5929/claude-toolkit/issues/270)
holds the approved requirements and delivery evidence.

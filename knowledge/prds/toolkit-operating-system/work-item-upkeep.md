---
summary: Work tracking keeps the active item's decisions, progress, handoff, and accepted outcome accurate across sessions, using flexible stages and one owner of tracker state.
group: Working with an agent
area: work-tracking
status: finalized
source: GitHub issue 270, requirements approved 2026-09-03, solution design approved 2026-09-05, implementation and merge authorized 2026-09-07; Mike's 2026-09-18 document-continuity approval
created_at: 2026-09-07
tags: [work-tracking, lifecycle, handoff, approval]
approved_by: Mike Rihm
approval_date: 2026-09-05
work_item: "270"
updated_at: 2026-09-20
---

# Work-item upkeep

The work tracker owns the current item, overall progress, blockers, other tasks,
next step, approvals, and completion record. It links any PRD or solution design.
Those documents own their requirements or design and their bottom Notes: useful
discussion, decisions with approval state, remaining document tasks, and the
exact resume point. Other work stays in the item. A future session reads the
item and relevant linked document without reconstructing conversation history.

Before substantial work, read the relevant item. Record the owner's material
answers, choices, constraints, and approvals promptly. Keep their meaning;
shortening a statement does not permit adding rationale or certainty. Record
outside approvals as reported, with the person and conditions when supplied.
Routine commands, files opened, and ordinary tests are not progress.
Open questions are saved even without an answer, with who must answer (or
unknown), status, and affected work. Answers update that question and the actual
requirements or design, preserving source and approval state. Save before moving
past the topic and verify the changed content, not just the history entry.
Use the existing item/document locations; no extra start or notes file is needed.

Stages describe a normal path and may be skipped or revisited. In Progress
means work is active, including discovery and design. Build and data-load
execution require approved requirements. Other work types use judgment about
the actual scope and risk. A broad type does not authorize unapproved work.

The local tracker selects an active item per branch and refuses changes to a
different item until an intentional switch. Linked worktrees share the records.
Meaningful changes keep readable current state and recorded history in
agreement. Related writes roll back after ordinary command failures. New
consolidated-record multi-file writes also keep a recovery journal under
`.work-items/.recovery/`, block later mutations while it is pending, and use
`work recover` to verify each affected path still matches its journaled before
or after content and then finish the interrupted operation. Unexpected newer
content is preserved and reported as a recovery conflict. Tests cover
interrupted-write recovery; an actual operating-system process-kill trial
remains unverified. External tracker updates retain their separately documented
non-atomic and uncertain-result limits.

Before a handoff, update the relevant document text and Notes for PRD or design
refinement, and link there from the item. For other work, update the exact next
step, blockers, and open decisions in the selected tracker. Check the records. The handoff skill does this before
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

The [work-tracker documentation](../../../plugins/work-tracker/README.md) owns the
command and record details. [Issue 270](https://github.com/Mar5929/claude-toolkit/issues/270)
holds the approved requirements and delivery evidence.

## Notes

- Decisions: Mike approved the document/tracker boundary on 2026-09-18.
- Resume here: [Guided-delivery Notes](guided-delivery.md#notes) owns remaining
  review and delivery work for this shared change.

---
name: requirements-helper
description: Turn a user's thoughts into clear draft requirements in the project's chosen record through a guided, one-question-at-a-time conversation. Use to clarify a work item's problem, refine requirements, handle changed answers, or resume a requirements interview.
---

# Requirements helper

Keep the interview in the main conversation. First read
[work-guide](../work-guide/SKILL.md) for project context, canonical records,
adaptable methods, and specialist help; do not repeat orientation already
completed in this session.

## Understand before designing

- Read the existing requirements and relevant project evidence before asking
  the owner to repeat themselves. Identify the problem, people affected,
  desired outcome, and known constraints before proposing a solution.
- Use the project's requirements format. If none is chosen, offer a small
  draft organized around the goal, people, required behavior, process or logic,
  and open questions. Omit or reshape sections to fit this item.
- Keep requirements about what must be true and why, with observable outcomes.
  Keep technology choices and build instructions in the separate design;
  preserve an owner-supplied solution idea as a proposal unless it is agreed.

## Discuss and capture

- Ask one plain question at a time, with a recommended answer and a short
  reason when evidence supports one. Work through dependencies in a useful
  order and let the owner think aloud. Do not disguise several decisions as
  one question.
- Save settled answers promptly in the canonical draft through the project's
  existing upkeep workflow. Capture the intended meaning, distinguish
  tentative suggestions from confirmed answers, and leave unknowns visible.
  Do not create a second raw interview log merely to use this skill.
- Apply a clear correction to the draft without asking the owner to approve
  it again. Check affected requirements and proposed design; update obvious
  consequences and ask only about material ambiguity. Preserve useful change
  history through the chosen tracker, without retaining contradictory current
  requirements. A PRD or lasting-knowledge edit still follows its project's
  save policy, taking existing approval into account.
- If an answer is ambiguous enough to change behavior, ask one clarifying
  question. If the owner does not know, leave it open; offer a supported
  recommendation or a focused investigation when useful, and continue with
  independent questions. Never treat silence or uncertainty as agreement.
- For a simple correction, acknowledge the change in a sentence or two and
  ask only the next material question. Do not replay the full document or
  invent the old requirement's rationale, coverage, or consequences as facts.
- If saving is unavailable or fails, lead with that fact and call the revised
  text a conversation draft. Never first say the item was updated and qualify
  that later. For example: "Not saved to Jira yet. The draft now says send the
  summary only on request; retry behavior remains open." Preserve this unsaved
  meaning for the next session instead of asking the owner to manage the save.

## Move forward with the owner

When the draft is coherent, consolidate the required behavior and unresolved
choices for review. A focused delivery-reviewer assignment can check gaps or
contradictions using work-guide's delegation method. Its findings are advice,
not new requirements or approval.

Use the project's specification check and approval boundary before design or
build. Honor a clear request to produce a proposed design while keeping open
choices explicit; do not label the requirements approved from that request.
When the owner has already authorized the next step, continue without a new
approval loop. Leave the canonical item ready for another session to resume.

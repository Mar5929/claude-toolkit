---
summary: The agent offers to organize and guide work from the initial idea through delivery, keeping shared plans and records current while the owner makes decisions and gives approvals.
group: delivery
area: guided-work-management
status: proposed
source: Mike's separate guided-work-management conversation and opt-in clarification on 2026-09-15; GitHub issue 337
created_at: 2026-09-15
tags: [delivery, planning, requirements, continuity]
work_item: "337"
---

# Guided work management

Draft updated 2026-09-15.

## Contents

- [Why this exists](#why-this-exists)
- [What this document holds](#what-this-document-holds)
- [Requirements](#requirements)
  - [Choosing guided management](#choosing-guided-management)
  - [Keeping the work moving](#keeping-the-work-moving)
  - [Continuing across sessions](#continuing-across-sessions)
- [Potential solution design notes](#potential-solution-design-notes)

## Why this exists

The owner wants to describe an outcome, work through questions and decisions,
and approve the necessary steps while the agent takes care of organizing and
maintaining the work. The experience should stay connected from an initial
idea and requirements interview through design, building, verification, and
delivery. The owner should not have to coordinate toolkit components or remind
the agent to maintain records.

This workstream starts from that requested experience. Earlier toolkit tickets
and designs are background to examine for overlap, not decisions inherited by
this proposal. The [work item](https://github.com/Mar5929/claude-toolkit/issues/337)
holds refinement questions, the delivery roadmap, and progress. This document
is a proposed draft; agreement on an individual answer does not establish full
requirements approval or prove that the behavior is delivered.

## What this document holds

This document holds only the what: what the system does, what the end user
experiences, and what information is stored and where. Functional, process,
logic, user-interface, user-experience, and data requirements belong here.
How it is built does not. Each requirement states observable behavior in plain
language and includes a check. Unresolved details stay visible in the work item
instead of becoming assumed requirements.

## Requirements

### Choosing guided management

#### 1. Offer to organize and guide the work

When the owner starts work toward an outcome, the agent offers to organize and
manage its tasks, milestones, roadmap, and scope, and guide the owner through
the process. The owner chooses whether to accept. The agent does not assume
that a request to discuss an idea accepts this service.

The precise point at which to offer, including how to handle small requests,
is still being refined in the linked work item.

**Check:** start discussing a new outcome without having accepted guided
management. The agent offers the service and waits for the choice before
taking over its organization. On acceptance, it begins managing the work.

#### 2. Maintain the accepted plan without repeated upkeep approvals

Once the owner accepts guided management, the agent creates, organizes, and
updates the necessary tasks, milestones, and roadmap within the agreed scope.
It keeps the records current as decisions and progress change. The owner does
not have to dictate tracker commands, filing locations, or routine updates.

If a proposed change would alter the agreed scope, commitments, or an approval
boundary, the agent explains the effect and asks for the required decision.
Accepting help with organization does not itself authorize implementation or
deployment. Existing explicit approvals still count.

**Check:** accept guided management, answer a planning question, and complete
an authorized step. The agent updates the affected records without another
upkeep approval. Then propose a change outside the agreed scope: the agent
explains the consequence and gets a decision before treating it as agreed.

### Keeping the work moving

#### 3. Guide decisions in the context of the intended outcome

The agent helps the owner understand the current position and next useful
action throughout the work. It asks focused questions when information or a
decision is needed, checks earlier answers, and keeps the purpose of the work
in view when interpreting rough or incomplete answers.

If the proposed direction would miss the owner's goal, cause a problem
elsewhere in the system, or has a materially better alternative, the agent
explains the concern and its recommendation. It clarifies uncertain intent
instead of silently replacing it, and respects the owner's informed choice.

**Check:** give an answer whose wording is clear but whose effect would conflict
with the stated goal. The agent identifies the conflict, explains an alternative,
and resolves the intended direction with the owner before recording it as settled.

#### 4. Keep the whole outcome connected to its component work

The maintained plan connects the intended outcome with the tasks and sub-items
needed to reach it. It includes useful milestones, dependencies, completed work,
current status, blockers, open decisions, approval boundaries, and next steps.
The detail stays appropriate to the work and changes when the agreed plan changes.

Completing a requirements document or an individual task does not lose the
remaining path to delivery. Requirements approval, permission to build, checked
results, publication, and owner acceptance remain distinguishable.

**Check:** finish the requirements-refinement item for a feature that still needs
design and implementation. The saved plan identifies what remains and the next
useful authorized action. It does not describe the whole feature as delivered.

### Continuing across sessions

#### 5. Preserve shared records another agent can use

The agent saves meaningful decisions and progress promptly in the project's
chosen records and completes the applicable publication step. The retained
information uses formats that different supported agents and models can read;
continuation must not depend on one model's private memory or the owner
repeating the conversation.

Product requirements live in the PRD. The chosen tracker and its linked plan
hold the roadmap, tasks, milestones, dependencies, progress, and delivery
evidence. The project's short working context points to those records and
provides enough background to resume. Records link to one another without
maintaining competing copies of the same requirements or detailed plan.

If a save or publication fails, the agent reports what remains unsaved or
unpublished and preserves the pending update for recovery. It continues work
that can proceed independently, without making the owner reconstruct the update.

**Check:** interrupt a workstream after a decision and a milestone change.
Resume with a different supported agent using the shared records. It can
explain the goal, completed work, current position, open decisions, and next
authorized action without asking the owner to repeat the earlier discussion.
Repeat with a failed save: pending information is identified and recovered,
and is never represented as already published.

## Potential solution design notes

These are options to explore, not requirements, approved design, or instructions
to build a particular solution.

- For requirements 1-4, examine [work-guide](../../plugins/session-skills/skills/work-guide/SKILL.md)
  as the existing place to coordinate the overall experience, with
  [requirements-helper](../../plugins/session-skills/skills/requirements-helper/SKILL.md)
  supporting interviews. The existing [guided-delivery](guided-delivery.md)
  and [work-item-upkeep](work-item-upkeep.md) agreements already cover related
  responsibilities; identify the actual gaps before adding or moving them.
- For requirement 5, examine the [knowledge system](knowledge-system.md) and
  the chosen tracker together. Readable local files do not by themselves provide
  sharing between computers. The delivery design must account for the intended
  agents, hosts, available access, and the project's chosen sharing arrangement.
- Review overlap with the [toolkit operating-system proposal](toolkit-operating-system.md)
  after this work's expected experience is clear. Resolve conflicting guidance
  explicitly rather than allowing an older proposal to determine this scope.

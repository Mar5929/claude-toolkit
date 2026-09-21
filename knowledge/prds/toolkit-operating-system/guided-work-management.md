---
summary: The agent offers to organize and guide work from the initial idea through delivery, keeping shared plans and records current while the owner makes decisions and gives approvals.
group: Working with an agent
area: guided-work-management
status: proposed
source: Mike's guided-work-management and opt-in clarification on 2026-09-15; roadmap-linked task details and continuation clarification on 2026-09-17; single-record direction on 2026-09-18; agent-led delivery intent confirmed by Mike on 2026-09-19 and handed to this separate design conversation; GitHub issue 337
created_at: 2026-09-15
tags: [delivery, planning, requirements, continuity]
work_item: "337"
updated_at: 2026-09-21
---

# Guided work management

Draft updated 2026-09-19. Mike authorized the roadmap-linked task and
task-continuation implementation on 2026-09-17, the single-record direction and
its planning on 2026-09-18, and the agent-led delivery intent and its capture on
2026-09-19. The full PRD remains proposed. These scoped approvals do not approve
an unseen complete design or unrelated requirements. Later on 2026-09-19, Mike
explicitly authorized an Astra lead with GPT-5.6 Sol helpers to implement and ship
the confirmed agent-led delivery scope through a reviewed pull request and merge.
That authorization does not establish delivery evidence or approve R6 migration.

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

When a request involves several steps or is likely to continue across sessions,
the agent offers: "Would you like agents to take responsibility for delivering
this, with you acting as product owner?" The owner chooses whether to accept.
The agent does not assume that a request to discuss an idea accepts this service.

Acceptance applies to the particular goal or work item and carries across
future sessions working on it. The agent uses the project's existing records to
retain and recover that choice, so the owner does not have to delegate the same
responsibility again. The choice does not change existing permission or
approval boundaries.

After the owner accepts, the agent asks one follow-up question, in substance:
do you want one team inside this chat, or should this chat be renamed Main
Orchestrator and coordinate other chats that each have their own team? The
answer is recorded with that goal's delivery choice, so later sessions read it
and do not ask again. The multi-chat answer is offered only where the host lets
a chat list, read, and message other chats and offer new chats as task buttons.
Where the host does not, the agent says that arrangement is unavailable and
uses one team in the current chat. A short instruction sheet ships with the
work skill and explains what each answer means, so a fresh agent can follow it.
Model wording stays generic: the most capable available model leads and guides,
and the project's helper model carries out the work. A project rule or the
owner's recorded preference names the actual models.

When the owner chooses the Main Orchestrator arrangement, the agent asks one
more question, in substance: should sessions be archived after their task is
fully complete, everything is merged and shipped, and the owner approved? That
answer is recorded with the goal in the same way as the arrangement answer.
With a yes, the main archives a team chat only when its task is complete, its
work is merged and shipped, its report is saved to a file, and the owner
approved the result. It archives only and never deletes, and an archived chat
can be restored. With a no, chats are left as they are.

Choosing a team arrangement is also the owner's authorization to use bounded
helper agents for that goal only. It does not carry to another goal, and every
other existing limit on tools, spending, publication, deployment, and approvals
still applies. Accepting agent-led delivery on its own still authorizes no
helpers.

Simple questions and quick edits stay lightweight: they do not prompt an offer
of guided management solely because the owner made a request.

If the owner declines, the agent continues helping normally and does not repeat
the offer for that goal unless the work grows substantially or the owner asks
for help managing it. Continuing the same goal in another session does not by
itself justify asking again. A later explicit request for management authorizes
that help without another opt-in question.

**Check:** discuss a new feature that needs several steps and will continue in
later sessions, without having accepted guided management. The agent offers
the service and waits for the choice before taking over its organization. On
acceptance, it begins managing the work. Resume the accepted item in a fresh
session: the agent recovers the choice and continues without another opt-in
question. Repeat with a simple factual question
and a quick wording edit: it handles each without a guided-management offer.
Decline the offer for a larger goal, then continue that goal in this and another
session: normal assistance continues without another offer. Substantially expand
the work: the agent may offer again. Explicitly request management later: the
agent begins providing it without asking for the same permission again.
Accept the offer: the agent asks the team-arrangement question once, records
the answer with that goal's delivery choice, and does not ask it again when the
goal resumes in a fresh session. Repeat on a host that cannot list, read, and
message other chats: the agent says the multi-chat arrangement is unavailable
and uses one team in the current chat. Choose the Main Orchestrator
arrangement: the agent asks the archive question once, records the answer with
the goal, and with a yes archives a team chat only after its task is complete,
its work is merged and shipped, its report is saved to a file, and the owner
approved the result, never deleting it. Either arrangement choice authorizes
bounded helper agents for that goal only, within every other existing limit.

#### 2. Maintain the accepted plan without repeated upkeep approvals

Once the owner accepts guided management, the agent creates, organizes, and
updates the necessary tasks, milestones, and roadmap within the agreed scope.
It keeps the records current as decisions and progress change. The owner does
not have to dictate tracker commands, filing locations, or routine updates.

Agents manage discovery, interview the owner, refine requirements, track tasks
and open questions, research options, develop and challenge designs, and drive
authorized implementation, testing, and delivery. They maintain the chosen
tracker and designated documents as meaningful discussion happens, following
the project's templates and record ownership. The human supplies product
direction, answers questions, resolves meaningful tradeoffs, and approves the
result. Agents manage the work and bring decisions to the human when needed.

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

Design-review support includes multiple agents challenging competing approaches,
checking them against requirements, researching uncertainties, and improving a
recommendation before relevant choices return to the owner. The useful
orchestration remains to be agreed with Mike; this intent does not prescribe a
fixed council size or an endless consensus process.

#### 4. Keep the whole outcome connected to its component work

The maintained plan connects the intended outcome with the tasks and sub-items
needed to reach it. It includes useful milestones, dependencies, completed work,
current status, blockers, open decisions, approval boundaries, and next steps.
The detail stays appropriate to the work and changes when the agreed plan changes.
For PRD or solution-design refinement, update the actual document and keep its
discussion, decisions with approval state, remaining tasks, and resume point in
bottom Notes. The work item links there and retains overall status, approvals,
and other work. Do not duplicate document detail in task or interview records.

Work items can contain child work items at multiple levels, including an epic
or feature containing smaller deliverables. Each work item, including a child,
can own explicit, unambiguous requirements, a solution or technical design, a
roadmap from start to finish, and the tasks needed to carry it out. Requirements
cover functional behavior, process, logic, user experience, and data where
applicable. Detail matches the item's scope; parent requirements and shared
constraints are linked rather than copied into competing child documents.

Every applicable roadmap phase is backed by actionable tasks within that item,
linked child work items, or both. A child work item can have its own roadmap and
further children. The relationship identifies which parent phase the child
fulfills; folder nesting alone is not enough to convey that relationship. The
owner's roadmap phases may use their own names and do not have to match the
toolkit's lifecycle-stage labels. Creating a phase or linking a child does not
advance the parent's lifecycle stage or grant approval.

Each task identifies its work item and roadmap phase and explains its objective,
instructions and governing constraints, linked inputs, expected deliverable,
completion or acceptance condition, current status, relevant dependencies, and
next action. The task description contains enough context to execute the
assignment; it does not consist only of a title or unexplained document links.
The amount of detail is proportionate to the task. A phase can have several
tasks, and the plan may change without losing their relationships or decisions.

For example, a Salesforce-system epic can have a shared-rules phase fulfilled
by a child work item for implementing the shared rules. That child has its own
requirements, design, roadmap, and tasks. Its completion advances the relevant
part of the parent's plan but does not mean the whole Salesforce system is
delivered or accepted. Parent and child completion conditions remain explicit.

For example, a solution-design task directs the agent to design from the linked
PRD, apply the agreed project design principles, review the solution with the
owner using the agreed method, preserve decisions and the review position, and
complete only after the required design approval. The task links to the detailed
design and canonical principles instead of maintaining competing copies.

This is the normal workflow for managed work going forward. New plans include
these task records; when resuming existing managed work, the agent reconciles
missing task detail within the accepted scope and preserves earlier approvals,
completion evidence, and remaining decisions. The chosen tracker owns the
records regardless of its storage system; no second tracker is required.

Completing a requirements document or an individual task does not lose the
remaining path to delivery. Requirements approval, permission to build, checked
results, publication, and owner acceptance remain distinguishable.

**Check:** finish the requirements-refinement item for a feature that still needs
design and implementation. The saved plan identifies what remains and the next
useful authorized action. It does not describe the whole feature as delivered.
Inspect each applicable roadmap phase: its tasks or linked children explain what must be done,
which inputs and constraints apply, and how completion will be determined.
Split a phase into two tasks and change a dependency: their work-item/phase
relationships and the remaining path to delivery stay clear. Resume an older
item with missing task detail: the agent fills the gap without treating earlier
unapproved work as approved or discarding the recorded history.
Create an epic with a custom-named phase linked to a child work item, then a
further child under that item. Each level can be understood and resumed from
its own requirements, design, roadmap, task details, and parent links. Completing
the deepest child leaves outstanding parent work and approval conditions visible.

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

On a request such as "pick back up with solution design," the agent finds the
active work item's roadmap task, reads its execution details and linked governing
guidance, and restores the last review position before continuing. The owner
does not have to name a skill, locate the philosophy, or repeat earlier decisions.
The task's continuation record distinguishes completed and accepted steps from
proposals, blockers, and the next authorized action. Root instruction files stay
the repository map and router; task-specific guidance belongs with the relevant
workflow and project records.

If a save or publication fails, the agent reports what remains unsaved or
unpublished and preserves the pending update for recovery. It continues work
that can proceed independently, without making the owner reconstruct the update.

**Check:** interrupt a workstream after a decision and a milestone change.
Resume with a different supported agent using the shared records. It can
explain the goal, completed work, current position, open decisions, and next
authorized action without asking the owner to repeat the earlier discussion.
Repeat with a failed save: pending information is identified and recovered,
and is never represented as already published.
In a fresh supported session, say only "pick back up with solution design"
with the active project selected. The agent retrieves the task, applies its
saved design principles, and resumes the correct review step without repeating
settled questions. If the active item is ambiguous, it asks only what is needed
to select it. A saved link or static instruction check alone does not prove this
fresh-session behavior.

### 6. One readable work-item record

Direction approved by Mike on 2026-09-18; implementation planning requested.
This requirement is not yet delivered and does not approve the full PRD.

Local work items use one authoritative Markdown document for overview/status,
roadmap, tasks, questions, decisions/history, and item-specific requirements. Design
remains separate. The consistent template has a page title followed by
first-level Overview, Roadmap, Tasks, Recent History, and Requirements sections in that
order. Requirements supports second- and third-level headings and bullets.
History may be collapsible; current blockers, next actions, and unanswered
questions remain easy to find. Roadmap holds ordered phases or milestones,
outcomes, status, and links to their tasks or child items. It stays consistent
with task progress without duplicating task detail. Tasks preserve dependencies, responsibility,
status, and continuation. Questions identify who must answer. Answers update
the affected content promptly, and saves are read back to verify them.

There are no competing task, requirements, or status records. Existing shared
PRDs and designated workbooks remain linked authorities rather than duplicated
requirements. For an external work item in GitHub, Jira, Linear, or another
tracker, its description/body holds the same work-item template and section
order as local WORK-ITEM.md: Overview, Roadmap, Tasks, Recent History, and
Requirements. Use the tracker's supported formatting to preserve the same
readable structure; identical Markdown syntax is not required. Native fields
remain authoritative for status and assignments. Design documents stay separate
and linked. Do not create a local mirror or scatter the item's current content
across separate task, requirements, status, or notes documents. Existing work items keep their current format and remain usable. This release
does not migrate existing items or add consolidation migration tooling. New
local items use the consolidated record; installation does not rewrite old work.

Capture a human decision or other meaningful requirement, design, answer,
constraint, or progress update as soon as it is given, before moving past that
topic. Update its authoritative content and preserve whether it is settled or
still proposed. Complete the applicable save/publication route promptly: for
authorized Git-tracked documentation, check, commit, push, and verify remote
publication; for an external work item, update and reread its description or
relevant native field; for a Git-ignored local item, save and reread it locally.
Do not wait for the interview, session, or implementation to finish. A history
entry alone does not replace the actual content update. Report failed or pending
saves without claiming they are published, and retain them for recovery.

**Check:** create and resume an item with a different supported agent. Both use
the same sections and save a dependent review task without creating extra
records. Resume an older item in its existing format and verify its tasks,
requirements, questions, decisions, and approval state remain usable without
conversion. Check applicable rules,
skills, PRDs, setup/sync flows, and both operating manuals for agreement.
Repeat with an external work item: its description contains the same sections,
its design is linked separately, and no local mirror is created. Give a new
requirement and a design decision during discussion: verify each is captured
in its authoritative home and saved/published before the topic changes, with
any failed save identified accurately.

## Potential solution design notes

These are options to explore, not requirements, approved design, or instructions
to build a particular solution.

- For requirements 1-4, examine [work-guide](../../../plugins/session-skills/skills/work-guide/SKILL.md)
  as the existing place to coordinate the overall experience, with
  [requirements-helper](../../../plugins/session-skills/skills/requirements-helper/SKILL.md)
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

## Notes

- Implementation authorized by Mike in the handoff-review task on 2026-09-19:
  proceed with the consolidated record for new work items and a reviewed PR.
  Existing items do not need migration. Keep their existing format usable;
  migration tooling and live-item conversion are excluded from this build.

- Scoped delivery, 2026-09-19: [PR #359](https://github.com/Mar5929/claude-toolkit/pull/359)
  merged the agent-led delivery method and entry points at `df9d2a0`. The
  [scenario guide](../../../plugins/work-tracker/tests/delivery-scenarios.md)
  records fresh Sol source-fixture results and their limits. This is scoped
  implementation evidence, not full-PRD approval, R6 delivery, installed-host
  rollout proof, or acceptance of the complete experience. Issue #337 owns
  current rollout status and remaining verification tasks.

- Clarification approved by Mike in the handoff-review task, 2026-09-19:
  external work-item descriptions use the same template as WORK-ITEM.md;
  designs stay separate. Significant human input is captured and saved through
  the applicable publication route immediately, before moving past the topic.
  R6 records this clarification; it does not authorize its runtime migration.

- Decision: Mike approved the single-record direction and requested a consistent
  template and implementation plan on 2026-09-18. New-record implementation is now authorized; migration was excluded on 2026-09-19.
- Clarification: Roadmap is a top-level section in that same file, immediately
  before Tasks, as Mike confirmed after reviewing the plan.
- Decision: Mike confirmed the agent-led delivery intent and authorized its
  capture on 2026-09-19 in the originating conversation, carried into this
  separate task. Requirements 1-3 contain that intent. Full requirements,
  complete design, and delivery evidence remain separate. Mike subsequently
  authorized an Astra lead and Sol helpers to implement the confirmed scope,
  create a PR, and merge it when done. This authorizes this implementation team;
  future items' helper-selection behavior remains the open product question.
- Still open, answer from Mike: after accepting agent-led delivery for an item,
  may the lead choose and coordinate scoped research, design, and review helpers,
  or should Mike approve the helper team each time? This affects R3 and the
  existing per-item team agreement in [guided delivery](guided-delivery.md#solution-design).
  Recommendation, not approved: let the lead choose within approved scope,
  bringing product choices, significant cost tradeoffs, and existing approval
  boundaries to Mike.
- Decision: Mike accepted the recommendation on 2026-09-21, recorded as
  requirement 9 of [#377](https://github.com/Mar5929/claude-toolkit/issues/377):
  choosing a team arrangement authorizes bounded helper agents for that goal
  only. It does not carry to another goal, and every other existing limit still
  applies. Accepting agent-led delivery on its own still authorizes no helpers.
  This is Mike's decision on this one point, recorded here as proposed PRD
  text. It is not approval of the PRD.
- Resume here: resolve the future helper-authority question when Mike answers;
  retain the existing permission boundary meanwhile. Follow issue #337 for
  rollout and remaining behavior checks. Preserve settled offer timing,
  declined-offer behavior, and the scoped delivery already merged.
- Scoped R6 delivery, 2026-09-19: [PR #362](https://github.com/Mar5929/claude-toolkit/pull/362)
  merged the consolidated new-record runtime at `b2e8727` in work-tracker
  2.8.0. New local items use one `WORK-ITEM.md`; existing items keep their
  format and no migration tooling was added. The
  [consolidated work-item plan](../../../docs/designs/337-consolidated-work-item.md)
  preserves the implementation rationale and evidence limits.
- Installed Codex evidence, 2026-09-20: one coached GPT-5.6 Sol writer using
  installed work-tracker 2.8.0 created and updated a consolidated local item,
  and a separate fresh read-only run recovered its exact item, task, current
  position, next action, question, and context without a legacy mirror.
  Structural validation passed, but semantic readiness did not: the agent
  inferred `Approved by: User` and finalized while the generated Goal still
  said `_Not agreed yet._`. Installed Claude behavior, an actual process-kill
  recovery, live external mutation and recovery, broader rollout, and owner
  acceptance remain open on issue #337.

- Team arrangement question, 2026-09-21: source is Mike's brain dump and his
  confirmed playback on 2026-09-21, tracked in
  [#377](https://github.com/Mar5929/claude-toolkit/issues/377). R1 now carries
  proposed text for the follow-up question asked after acceptance, the record
  of the answer with that goal's delivery choice, the host condition and the
  single-chat fallback, the instruction sheet shipped with the work skill, and
  generic model wording. Mike directed the generic model wording on 2026-09-21
  and restated that the toolkit stays a harness of instructions, checkpoints,
  and handshakes, with nothing new built: no code, state, hook, or detection
  logic. Mike added the archive question on 2026-09-21, requirement 8 of #377,
  and R1 carries it as proposed text. This is proposed text and scoped
  instruction delivery, not PRD approval. No fresh session has yet been
  observed asking the question.

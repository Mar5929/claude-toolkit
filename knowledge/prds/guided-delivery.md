---
summary: Guided delivery lets the owner focus on decisions while the main conversation maintains adaptable plans and brings in focused requirements, design, research, and review help using the project's existing records.
area: guided-delivery
status: current
source: GitHub issues 300 and 302; Mike's 2026-09-08 build-and-ship instruction and requested plain-language PRD addition; Mike's 2026-09-16 solution-design skill requests and PRD update instruction (pull requests 344 and 345)
created_at: 2026-09-08
tags: [delivery, requirements, design, collaboration]
approved_by: Mike Rihm
approval_date: 2026-09-08
work_item: "300"
---

# Guided delivery

The owner guides the project and makes decisions while the main conversation
keeps the work understandable and current. Requirements interviews, solution
designs, and specialist findings belong to the same working conversation for
an item. Independent sessions can work on different items.

## Consistent habits, adaptable records

The agent considers the goal, useful route to delivery, current position,
dependencies, blockers, decisions, responsibility, and next action. A roadmap
or milestones help when the work benefits from them. They are not a required
sequence, fixed field set, or condition for completing an item. A project, use
case, or individual item can change the structure unless the owner requested
a fixed constraint. Actual authorization and environment boundaries still apply.

The project chooses where the work lives. The same habits apply to a local
tracker, GitHub, or another service using its existing fields and documents.
There is no second tracker or automatic local copy. If access fails, the agent
says what remains unsaved and preserves it in the conversation or handoff.
The [existing upkeep contract](work-item-upkeep.md) continues to own status,
progress, approvals, and completion.

## Working with the owner

Read current requirements and relevant project guidance before asking something
already answered. Ask one useful question at a time, with a supported
recommendation and a brief reason. Organize scattered thoughts into explicit
draft requirements. Save clear answers and authorized corrections promptly;
keep unknowns and suggestions distinct from settled meaning. Ask only about
material ambiguity, and recognize approval already given under the project's
save policy.

PRDs use plain language with no jargon. They describe goals, required behavior,
and rules clearly enough that someone who missed the conversation can understand
what must happen and recognize success. Unanswered details stay open. The
requirements guide the solution without prescribing how to build it.

Any retained ideas about how to build belong only in notes at the very bottom
of the PRD, linked to their relevant requirements. They are clearly labeled
potential paths to explore, not requirements, approved design, or instructions
to build that way. Actual design decisions live in the separate design record
with their approval status preserved.

## Solution design

A design starts only when the requirements are ready. Before any design, the
main conversation and a product analyst helper each read the requirements as
one whole inside the larger system, walk the end-to-end experience of the
person who uses the result, and report what is missing, what is not explicit
end to end, and where a builder could misread the wording. Each states its
confidence as a percentage; below 95 means not ready. Gaps are fixed in the
requirements, not patched inside the design. A requirement that does not fit
the end-to-end experience is flagged in the first reply. The owner rules on
every flag and can overrule one; the ruling is recorded.

The owner then agrees, one question at a time: whether to interview first or
scan and research first; the design philosophy, which defaults to the
platform's built-in mechanisms and builds custom only where nothing built-in
serves; whether there is one design option or several; and where the design
and its prep file live. The main conversation weighs the item's complexity
and effort in the context of what is being built and recommends a team for
that item: a product analyst, researchers, a technical architect per option,
a critic, and task agents as needed, each on the model that fits its role.
The owner agrees or changes the team before any helper starts.

One prep file holds the intent, the readiness result, the rulings, the way of
working, the team, every interview answer, and the constraints. Every helper
reads it, so the team shares one understanding of what the requirements are
for.

Designs explain how each requirement will be met, what existing capability is
reused, changed, or new, how the result can be checked, and where a builder
could misread the requirements. A junior intern with no context can read the
design and know what to build, in what order, and how to tell it works.
Current official sources and project evidence support material choices. What
the community says online is a claim until the architect checks it against
official documentation, the project's own code, or a test. What exists today
is evidence, not a constraint: when a design that replaces the existing build
serves the requirements better, the architect recommends the rewrite and says
what it costs. A critic checks every draft against every requirement and the
plain-language rules; the architect fixes; the loop repeats until every
requirement is satisfied or the owner decides the remaining items. Domain
methods, including Salesforce solutioning, fit this conversation instead of
restarting it. The design stays proposed until the owner approves it.

## Parallel work and continuity

Each item's main session owns its canonical updates. Helpers return focused
research or review findings and cannot approve work. Reread shared records
before editing and reconcile changes. An assignment does not prove a worker
is running. Separate checkouts do not isolate shared orgs or release dependencies.

When work resumes or the owner changes items, read the current record and give
a short briefing of where it stands and what needs attention. Project guidance,
decisions, and chosen support travel with a delegated assignment. Use the
existing recall and handoff workflows; saved specialist definitions are not
an automatic memory system.

Project and item guidance can refine toolkit defaults. Improvements intended
for reuse go through the existing authorized toolkit or project update flow;
a one-item variation does not become a new global instruction.

## Scope and limits

The package supplies working instructions and focused helpers, not a live
scheduler or automatic project manager. Specialist support is offered when
useful and follows the owner's current preference. No team is required per epic;
the solution design team is agreed per item and dissolves with it.
Where an independent helper cannot run, the main conversation says so.

The [session-skills documentation](../../plugins/session-skills/README.md)
owns commands, packaging, host differences, and adoption. A published change
must still reach the machine and project before a fresh session can use it.

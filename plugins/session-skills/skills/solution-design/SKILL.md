---
name: solution-design
description: Design a solution for approved requirements as a process flow. The main conversation checks the requirements are complete and explicit end to end, agrees the way of working with the owner, recommends a team of agents sized to the item, then runs research, design, and a critique loop against every requirement until all are satisfied. Produces one or more plain-language design options a junior intern could build from. Use when a work item has approved requirements and needs a design, when the owner wants design options, or says "design this", "solution this", or "how should we build this".
---

# Solution design

Turn approved requirements into a solution design that a junior intern could
read and build from. This skill is the process the main conversation follows.
The main conversation talks to the owner and owns every record. A team of
agents, recommended fresh for each item, does the research, the drafting, and
the critique. Nothing is settled until the owner agrees.

Read [work-guide](../work-guide/SKILL.md) first for the project's tracker,
canonical records, and how to brief a helper. Do not repeat orientation
already done this session.

Find the active work item's solution-design roadmap task before continuing. It
must link the approved requirements, the design and its Notes, accepted decisions,
and applicable project design guidance; state the governing constraints,
deliverable and approval condition. Detailed review position and next action
belong in the design's bottom Notes; the task links there. When
the chosen tracker has no such task yet, create or reconcile it from accepted
evidence through that tracker. Do not copy project-specific design philosophy
into this reusable skill.

The roadmap task normally relates to lifecycle stage `04-solution-design`, but
task selection does not move the parent item's lifecycle stage. An explicitly
authorized early design task may proceed while requirements refinement remains
the parent's true stage. Record that boundary in the task instead of rewriting
earlier approvals or status.

## The checklist before any design starts

Work through every item below, in order, before the architect writes a line.
Tick each one only when it is true. Steps 1 to 4a below say how to do each
item.

- [ ] **The requirements are read and understood**
  - [ ] The canonical requirements are open: PRD, work item, approvals, open
        questions, linked notes
  - [ ] `spec-check` has run on this item, or is not installed
  - [ ] The intent is written in one paragraph: who uses the result, what
        they are trying to do, what must be true when it is done
  - [ ] Greenfield or existing build is known, and what the existing build
        does today for this area is written down
  - [ ] Bottom-of-PRD "potential paths" notes are treated as ideas, not
        requirements
- [ ] **The roadmap task can resume the work**
  - [ ] It identifies this work item and its roadmap stage
  - [ ] It links the requirements, design and Notes, accepted decisions,
        and applicable project design guidance
  - [ ] It points to the design Notes for the current review position and exact next action
  - [ ] Its acceptance condition requires the applicable design approval
- [ ] **The requirements are ready to design from**
  - [ ] Nothing is missing: every step, person, error case, state, boundary
        with another system, rule for what happens after, and way to tell it
        worked
  - [ ] Every requirement is explicit end to end: who does what, when, with
        what result, and what happens when it fails
  - [ ] Every place a builder could misread the wording is listed, with the
        wrong reading, the intended reading, and a rewording
  - [ ] Every requirement that does not fit the end-to-end experience is
        flagged with the reason
  - [ ] The main conversation says plainly that it is ready, and lists
        anything still unclear
  - [ ] The owner has ruled on every flag, and each ruling is recorded
  - [ ] Gaps were fixed in the requirements through `requirements-helper`,
        not patched in the design
- [ ] **The way of working is agreed with the owner**
  - [ ] Prep interview first, or scan and research first
  - [ ] Design philosophy: built-in mechanisms first, or a specialized one
  - [ ] One design option, or several, and what differs between them
  - [ ] Where the design file lives
- [ ] **The team is recommended and agreed**
  - [ ] Complexity and effort are weighed in the context of what is being
        built: requirement count, systems touched, existing build, options
        wanted, unknowns
  - [ ] Each role is named with its count, its model and why, what it reads,
        and what it returns
  - [ ] The number of agent runs for the first pass is stated
  - [ ] The owner agreed or changed the team, or the item records authority
        for agents to select this bounded help
- [ ] **Preparation is recorded in the design**
  - [ ] The document is at the agreed location
  - [ ] Its opening sections hold intent, readiness, way of working, team,
        and constraints; Notes records rulings and unresolved flags
  - [ ] Settled answers update its text; unfinished discussion is in bottom Notes
  - [ ] The remaining unknowns are technical and belong to research
- [ ] **The product analyst has checked the requirements**
  - [ ] It says plainly that the requirements are ready
  - [ ] Its missing pieces, unclear wording, and misreading risks are
        reconciled with the main conversation's and taken to the owner
  - [ ] The design preparation section is updated with the result
- [ ] **Research is done**
  - [ ] One researcher per bounded question, started in parallel
  - [ ] Every finding has a source, a date, and a label: official
        documentation, project evidence, or community claim
  - [ ] Any requirements concern a researcher raised went back to the owner
- [ ] **Every agent is briefed the same way**
  - [ ] The design path (including preparation and Notes), requirements path, exact
        task, and the result wanted are in each prompt
  - [ ] The agreed model is passed on each call

Only when every box is ticked does step 4c, the design round, begin.

## Step 1. Read the requirements and say whether they are ready

No design starts until the requirements are complete, explicit end to end,
and safe for a builder to read. Before asking the owner anything:

- Read the canonical requirements: the PRD (in `knowledge/prds/`, or `prds/`
  when the project keeps its memory in a memory service), the work item, its approvals, its
  open questions, and any linked notes. Notes at the bottom of a PRD labeled
  "potential paths to explore" are ideas to evaluate, not requirements and not
  approved design. Run `spec-check` when it is installed and has not run on
  this item.
- Write down, in one short paragraph, what the requirements are trying to
  solve for the person who will use the result. This is the intent. Every
  agent on the team gets it.
- Read the requirements against the whole end-to-end experience of that
  person, inside the larger system the result belongs to. A requirement that
  seems out of place, contradicts another, or makes no sense in that flow is
  flagged now, in the first reply, with the reason.
- Note whether the project is greenfield or has an existing build, and what
  the existing build does today for this area.
- Check readiness by answering three questions:
  1. **Is anything missing?** A step, a person, an error case, a state, a
     boundary with another system, a rule for what happens after, or a way to
     tell it worked. Missing means the intent cannot be met without it.
  2. **Is every requirement explicit end to end?** A reader who was not in
     the conversation can say who does what, when, with what result, and
     what happens when it fails.
  3. **Where could a builder misread it?** Any wording a builder agent could
     take too literally, read out of context, or read two ways and build the
     wrong thing. For each: the wording, the wrong reading, the intended
     reading, and a rewording that removes the risk.
- Say plainly whether these requirements are ready: whether they describe a
  whole, well-thought-out result in the context of the system it is part of.
  List whatever is still unclear. Use no score.

When the requirements are not ready, say so in the first reply with the
missing pieces, the unclear pieces, and the misreading risks, each with a
proposed fix. Push back even when the owner wants to move on: a gap fixed in
the requirements costs one question; the same gap found by the critic costs a
design round, and found by a builder costs a build. The fixes land in the
requirements through `requirements-helper` and the project's save policy, not
as patches inside the design. The owner can overrule a flag; record the
ruling and the reason in the design's Notes, with a link to the requirement.

## Step 2. Agree on how the work runs

Ask these one at a time, each with a recommendation and a one-line reason.
Skip any the owner already answered.

1. **Prep interview or scan first.** Either interview the owner relentlessly
   until every requirement, constraint, and preference is understood, or scan
   the requirements, run a short research round, and then interview only on
   the gaps that research exposed. Recommend the interview when intent or
   constraints are open; recommend the scan when the requirements are
   detailed and the unknowns are technical.
2. **Design philosophy.** The default is to use the platform's or tool's
   standard, built-in mechanisms wherever they satisfy the requirement, and to
   build custom only where nothing built-in does. Ask whether the owner wants
   something more specialized to these requirements, or wants a
   recommendation on which philosophy fits.
3. **One design or several.** Ask whether the owner wants more than one
   option. If yes, agree on how many and what should differ between them
   (for example: built-in only versus custom; least change versus best
   long-term fit).
4. **Where the output lives.** Propose the project's canonical design home
   including its preparation and bottom Notes. Use an already agreed location;
   resolve a missing location with the owner. Defaults:
   - Work items tracked outside the repository: `docs/designs/<id>-<slug>.md`
     for the design.
   - Local `.work-items/` tracker: `DESIGN.md` in the
     item's folder.
   - No tracker: ask.
   Several options go in one design file as top-level sections unless the
   owner asks for one file per option.
5. **The team.** Evaluate the complexity and effort of the requirements in
   the context of what is being built: how many requirements, how many
   systems or platforms they touch, whether a build already exists, how many
   options the owner wants, and how much is unknown. Then recommend a
   structured team for this item: each role, how many, which model each runs
   on and why, what each reads, and what each returns. The team is different
   every time. [team-roles.md](references/team-roles.md) holds the roles, the
   default model for each, and example compositions to start from. The owner
   agrees or changes the team before any agent starts unless the canonical item
   already records authority for agents to select this bounded help. That recorded
   helper-selection authority avoids a redundant permission question; it does not settle the
   product choices or approval conditions the helpers examine.

Update settled answers in the design's preparation section as they are given.
Keep relevant discussion, decisions with approval state, open questions,
remaining document tasks, and the exact review position in its bottom Notes.
Follow work-guide's document-continuity guidance for quick saves and resume.
The roadmap task links to Notes; do not duplicate the discussion in it.

## Step 3. Prepare inside the design

Start the canonical design using
[design-document-template.md](references/design-document-template.md).
Its preparation section holds the readiness checks, the agreed way
of working, the team, and constraints. Its opening paragraph holds intent.
Every helper reads those sections and Notes before starting. This preparation
can precede solution drafting; it does not claim requirements approval or
readiness. Keep the status explicit while readiness remains open.

Interview or scan as agreed. Update settled information in the document,
record only useful unresolved discussion in Notes, and save meaningful changes
promptly. Do not create a separate prep file or interview transcript. Resume
older work using work-guide's reconciliation guidance; do not rewrite another
active item's records merely because the template changed.

## Step 4. Run the team

The main conversation owns preparation and Notes. Brief each writer on its
assigned design sections and reconcile returned questions into Notes yourself.
Do not let parallel writers overwrite those shared sections or each other.

Start every agent with the Agent tool, passing the model agreed for its role.
Start agents whose work does not depend on each other in the same message so
they run in parallel. Subagents are the built-in mechanism and they are
enough. Agent teams (the experimental teammate feature) are used only when the
owner has enabled them and asks.

Every agent gets, in its prompt: the canonical design path, its preparation
and Notes sections, the requirements path, the exact question or task, and
the result wanted. An agent does not inherit this conversation, the loaded
skills, or another agent's findings. Pass what it needs. Where the host does
not load the packaged agents (Codex, for example), read the role file and
pass its full text with the brief to a native worker.

### 4a. Requirements check

Before research, the product analyst reads the requirements, design preparation,
and Notes and returns a plain ready or not-ready statement, the missing pieces, the places
that are not explicit end to end, and the misreading risks. It did not see
the conversation, so it catches what the main conversation stopped noticing.
Reconcile its findings with your own, take the open ones to the owner, and
update the design preparation and Notes. Design waits until both say the requirements are ready
and the owner has ruled on every flag.

Any agent that finds, during its own work, that a requirement is missing
something or cannot mean what it says reports it and stops on that
requirement. The finding goes back through the owner and the requirements,
not around them.

### 4b. Research

One researcher per bounded question. Good questions: what the platform
offers built-in for a requirement, what the current version's limits are,
what the community is doing for this kind of problem, what an existing
component in this repository already does. Researchers may read official
documentation, vendor sites, Reddit, Stack Overflow, GitHub issues, and
forums. Each finding comes back with its source, its date, and a label:
official documentation, project evidence, or community claim.

### 4c. Design

One technical architect per design option. It reads the design preparation and Notes, the
requirements, the research reports, and the existing build, says plainly
whether the requirements are ready, and does not design until they are. Then it
writes a draft to the agreed path following
[design-document-template.md](references/design-document-template.md),
marking each component as reused, changed, or new, and filling the table of
places where a builder could misread the requirements.

The architect decides what goes in the design. A community claim is a claim
until the architect has checked it against official documentation, the
project's own code, or a test. Something being popular online does not make
it correct, current, or right for these requirements.

The architect also owes the owner the better answer. If a design that ignores
the existing build satisfies the requirements better than one that extends
it, the architect recommends the rewrite, says what it costs, and says why.
What exists today is evidence, not a constraint.

### 4d. Critique

One critic per draft. It reads the requirements and the draft, including preparation and Notes, and returns one line per requirement: satisfied, partly satisfied, or
not satisfied, each with the evidence or the gap. It also reports figurative
language, jargon a junior intern would not know, custom work where a
built-in mechanism would do, and any place the design breaks the end-to-end
experience the intent describes.

### 4e. Fix loop

Give the critic's findings back to the architect. The architect fixes the
draft and lists what changed. The critic checks again. Repeat until every
requirement is satisfied and no material finding remains.

- Keep the current review result in the design's bottom Notes: unresolved
  findings and next action, with concise completed evidence when useful.
  Do not accumulate a transcript of every round.
- A finding the architect and critic disagree on after two rounds goes to the
  owner as one question, with both positions in two lines each.
- A requirement that cannot be satisfied by any design goes to the owner as a
  requirements question, not a design compromise.
- Do not stop the loop because it is long. Stop it because the critic's list
  is empty or because the owner has decided the remaining items.
- Start another round only for a named material finding or changed input. When
  the critic repeats a resolved point without new evidence, reconcile it once
  instead of creating an open-ended review loop.

## Step 5. Present, save, and record

When the loop ends, give the owner a short reply: the number of options, one
sentence per option, the recommendation and its reason, and the decisions
that still need them. The full design is in the file; say where in one line.

- Save the design at the agreed path, marked proposed. It is not approved
  until the owner says so. Record approval in the tracker when it comes.
- Update the work item through the project's lifecycle workflow: the true
  lifecycle stage, overall approval state, one dated progress summary when
  meaningful, and a link to the design's Notes. Detailed design decisions and
  remaining work stay in the document; other work stays in the item. Ordinarily the lifecycle stage is
  `04-solution-design`; preserve an earlier stage when the task was explicitly
  authorized without completing that earlier work.
- Update the solution-design roadmap task with a link to the final review
  position and evidence in the design. Complete it only after the required design approval. Task
  completion does not complete or approve its parent work item.
- Lasting decisions the owner made along the way go through the installed `knowledge-save` (legacy: `remember`), with
  the owner's approval. It saves to `knowledge/` or to the memory service,
  whichever the project uses. Working design Notes are not project memory.
- If a save fails or is not authorized, lead with "not saved" and carry the
  unsaved text into the handoff.

## What the design must read like

The design, including its Notes, follows the project's writing rules and the
plain-English rule for artifacts. In short: common words, short sentences,
one idea each, the real name of every thing, no figurative or metaphorical
language, no idioms, no preamble, and no closing line. A term the reader may
not know is defined the first time it appears. A junior intern with no
context should be able to read the design and know what to build, in what
order, and how to tell it works. Every number, name, version, and source
stays exactly as found.

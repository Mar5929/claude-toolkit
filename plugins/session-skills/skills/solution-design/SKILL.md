---
name: solution-design
description: Design a solution for approved requirements using a team of Opus agents that research, design, critique the design against every requirement, and fix it until all requirements are satisfied. Produces one or more plain-language design options a junior intern could follow. Use when a work item has approved requirements and needs a solution design, when the owner wants design options compared, or when the owner says "design this", "solution this", or "how should we build this".
---

# Solution design

Turn approved requirements into a solution design that a junior intern could
read and build from. The main conversation runs the work and talks to the
owner. A team of Opus agents does the research, the drafting, and the
critique. Nothing is settled until the owner agrees.

Read [work-guide](../work-guide/SKILL.md) first for the project's tracker,
canonical records, and how to brief a helper. Do not repeat orientation
already done this session. [solution-helper](../solution-helper/SKILL.md) is
the light version of this skill for a small item designed in one
conversation. Use this skill when the item is large enough to need research,
a written critique, or more than one option.

## 1. Read the requirements and say whether they are ready

No design starts until the requirements are complete, explicit end to end,
and safe for a builder to read. Before asking the owner anything:

- Read the canonical requirements: the PRD, the work item, its approvals, its
  open questions, and any linked "potential paths" notes. Run `spec-check`
  when it is installed and has not run on this item.
- Write down, in one short paragraph, what the requirements are trying to
  solve for the person who will use the result. This is the intent. Every
  agent on the team gets it.
- Read the requirements against the whole end-to-end experience of that
  person. A requirement that seems out of place, contradicts another, or
  makes no sense in that flow is flagged now, in the first reply, with the
  reason. The owner decides what happens to each flagged requirement. Record
  the ruling in the prep file (section 3).
- Note whether the project is greenfield or has an existing build, and what
  the existing build does today for this area.
- Check readiness. Read the requirements as one whole, inside the larger
  system they belong to, and answer three questions:
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
- State confidence as a number: how sure you are, as a percentage, that
  these requirements describe a whole, well-thought-out result in the context
  of the system it is part of. Below 95 means not ready. Say what would raise
  it.

When the requirements are not ready, say so in the first reply with the
missing pieces, the unclear pieces, and the misreading risks, each with a
proposed fix. Push back even when the owner wants to move on: a gap fixed in
the requirements costs one question; the same gap found by the critic costs a
design round, and found by a builder costs a build. The fixes land in the
requirements through `requirements-helper` and the project's save policy, not
as patches inside the design. The owner can overrule a flag; record the
ruling and the reason in the prep file.

Do not start research or design until the owner has ruled on every flag and
confidence is 95 or above. Record the number and the date in the prep file.

## 2. Agree on how the work runs

Ask these one at a time, each with a recommendation and a one-line reason.
Skip any the owner already answered.

1. **Prep interview or scan first.** Either interview the owner relentlessly
   until every requirement, constraint, and preference is understood, or scan
   the requirements, run a short research round with agents, and then
   interview only on the gaps that research exposed. Recommend the interview
   when the requirements leave intent or constraints open; recommend the scan
   when the requirements are detailed and the unknowns are technical.
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
   and a prep file beside it, then get the owner's agreement before writing
   anything. Defaults:
   - Work items tracked outside the repository: `docs/designs/<id>-<slug>.md`
     for the design and `docs/designs/<id>-<slug>-prep.md` for the prep file.
   - Local `.work-items/` tracker: `DESIGN.md` and `DESIGN-PREP.md` in the
     item's folder.
   - No tracker: ask.
   Several options go in one design file as top-level sections unless the
   owner asks for one file per option.
5. **The team.** Present the team for this item's size and complexity: each
   role, how many, what each one does, and what it reads. Use
   [team-roles.md](references/team-roles.md) to size it. The owner agrees or
   changes it before any agent starts.

Write every agreed answer into the prep file's "How this design is being
made" section as soon as it is given.

## 3. The prep file

The prep file is one Markdown file at the agreed location, shaped by
[prep-file-template.md](references/prep-file-template.md). It holds the intent,
the flagged requirements and the owner's rulings, the agreed way of working,
the team, every interview answer, and the constraints. Every agent reads it
before starting, so it is how the whole team shares one understanding of
what the requirements are for.

When the owner chose the interview: ask one question at a time, with a
recommended answer and a short reason. Resolve a decision before asking about
anything that depends on it. Write each answer to the prep file before asking
the next question, the way `grill-me` does, so an interrupted session loses
nothing. Stop when the remaining unknowns are technical and belong to
research.

When the owner chose the scan: fill the prep file from the requirements and
the project's records, run the research round, then interview only on what
research left open.

## 4. Run the team

Start every agent with the Agent tool and `model: opus`. Start agents whose
work does not depend on each other in the same message so they run in
parallel. Agent teams (the experimental teammate feature) are not used unless
the owner has enabled them and asks for them; subagents are the built-in
mechanism and they are enough.

Every agent gets, in its prompt: the path of the prep file, the path of the
requirements, the path of any draft design, the exact question or task, and
the result wanted. An agent does not inherit this conversation, the loaded
skills, or another agent's findings. Pass what it needs.

Where the host does not load the packaged agents (Codex, for example), read
the role file and pass its full text with the brief to a native worker.

### Requirements check round

Before research, one [design-critic](../../agents/design-critic.md) reads the
requirements and the prep file in requirements mode and returns its own
confidence number, the missing pieces, the places that are not explicit end
to end, and the misreading risks. This is a second reader who did not see the
conversation, so it catches what the main conversation stopped noticing.
Reconcile its findings with your own, take the open ones to the owner, and
update the prep file. Design waits until both numbers are 95 or above.

A researcher or architect that finds, during its own work, that a
requirement is missing something or cannot mean what it says reports it and
stops on that requirement. The finding goes back through the owner and the
requirements, not around them.

### Research round

One [design-researcher](../../agents/design-researcher.md) per bounded
question. Good questions: what the platform offers built-in for a
requirement, what the current version's limits are, what the community is
doing for this kind of problem, what an existing component in this repository
already does. Researchers may read official documentation, vendor sites,
Reddit, Stack Overflow, GitHub issues, and forums. Each finding comes back
with its source, its date, and a label: official documentation, project
evidence, or community claim.

### Design round

One [design-architect](../../agents/design-architect.md) per design option.
It reads the prep file, the requirements, the research reports, and the
existing build, states its own confidence in the requirements, and refuses to
design below 95, returning the gaps instead. Above that it writes a draft
design to the agreed path following
[design-document-template.md](references/design-document-template.md),
including the section that names where a builder could misread the
requirements and what each one is meant to mean.

The architect decides what goes in the design. A community claim is a claim
until the architect has checked it against official documentation, the
project's own code, or a test. Something being popular online does not make
it correct, current, or right for these requirements. The architect says in
the design which claims were verified and how.

The architect also owes the owner the better answer. If a design that ignores
the existing build satisfies the requirements better than one that extends
it, the architect recommends the rewrite, says what it costs, and says why.
What exists today is evidence, not a constraint.

### Critique round

One [design-critic](../../agents/design-critic.md) per draft. It reads the
requirements, the prep file, and the draft, and returns one line per
requirement: satisfied, partly satisfied, or not satisfied, each with the
evidence or the gap. It also reports figurative language, jargon a junior
intern would not know, custom work where a built-in mechanism would do, and
any place the design breaks the end-to-end experience the intent describes.

### Fix loop

Give the critic's findings back to the architect. The architect fixes the
draft and lists what changed. The critic checks again. Repeat until every
requirement is satisfied and no material finding remains.

- Keep a round log in the design file's "Where this stands" section: round
  number, findings raised, findings fixed, requirements still open.
- A finding the architect and critic disagree on after two rounds goes to the
  owner as one question, with both positions in two lines each.
- A requirement that cannot be satisfied by any design goes to the owner as a
  requirements question, not a design compromise.
- Do not stop the loop because it is long. Stop it because the critic's list
  is empty or because the owner has decided the remaining items.

## 5. Present, save, and record

When the loop ends, give the owner a short reply: the number of options, one
sentence per option, the recommendation and its reason, and the decisions
that still need them. The full design is in the file; say where in one line.

- Save the design at the agreed path, marked proposed. It is not approved
  until the owner says so. Record approval in the tracker when it comes.
- Update the work item through the project's lifecycle workflow: stage
  `04-solution-design`, the settled decisions in the body, one dated line in
  the progress log, and the next action.
- Lasting decisions the owner made along the way go through `remember`, with
  the owner's approval. The design file and the prep file are not memory.
- If a save fails or is not authorized, lead with "not saved" and carry the
  unsaved text into the handoff.

## What the design must read like

The design and the prep file follow the project's writing rules and the
plain-English rule for artifacts. In short: common words, short sentences,
one idea each, the real name of every thing, no figurative or metaphorical
language, no idioms, no preamble, and no closing line. A term the reader may
not know is defined the first time it appears. A junior intern with no
context should be able to read the design and know what to build, in what
order, and how to tell it works. Every number, name, version, and source
stays exactly as found.

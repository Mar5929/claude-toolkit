# Write the Work Down; Never Leave It Only in Chat

A conversation is not a record. The goal of a task, the reason it matters, its
requirements, its edge cases and scenarios, the decisions made along the way,
and the questions still open must all end up in the project's files, in the
right place, while the work is happening. If it exists only in a chat, it is
already lost: the session ends, the context window fills, the next agent starts
blind, and the owner is asked the same questions again.

This applies to Claude and to Codex, to the main agent and to every subagent.
Keep it front of mind. It is not a wrap-up step.

## What has to be written down

- **The goal.** What we are trying to achieve, in one or two plain sentences.
- **The why.** The reason it matters and the problem it solves. This is the
  first thing lost and the hardest to reconstruct later.
- **The requirements.** What it must do, and what it must not do.
- **The edge cases and scenarios.** The awkward inputs, the "what happens if",
  the situations talked through and ruled in or out. A scenario discussed in
  chat and never written down will be rediscovered the hard way.
- **The decisions.** The choice made, the options rejected, and the reason.
- **The open questions.** What is still unknown, what it blocks, and who can
  answer it.
- **The constraints.** Anything that limits the solution: a deadline, a system
  boundary, a rule the owner set, an assumption being made.

## Where it goes

One truth, one canonical home. Do not copy the same content into two places,
and do not invent a new location when an existing one fits.

| Content | Home |
|---|---|
| This ticket's goal, requirements, scope, edge cases, and decisions | The work item's `SPEC.md` in the project's work tracker |
| Where the ticket stands, what is next, what is blocked | The work item's `STATUS.md` (or the tracker's status command) |
| Exploration, interviews, options weighed, owner wording, unknowns | `brainstorms/` |
| Approved product or system behavior beyond one ticket | `specs/` |
| An important choice and its rationale | `memory/decisions/` |
| Direction, goals, roadmap, durable risks and assumptions | `memory/planning/` |
| Durable circumstances and constraints | `memory/context/` |
| Reusable non-obvious understanding | `memory/knowledge/` |

When the project has no work tracker item for what is being worked on, create
one before building. When the second-brain memory areas are not installed, the
work item's `SPEC.md` carries all of it.

Durable memory and specification writes follow the project's memory rule: the
owner approves, and the memory librarian writes. Writing a work item's `SPEC.md`
and `STATUS.md` needs no such approval; that is ordinary work.

## When to write it

1. **Before building.** Write the goal, the why, and the known requirements
   into the work item first. If the task is too vague to write down, it is too
   vague to build; ask instead.
2. **The moment it surfaces.** A requirement, edge case, scenario, constraint,
   or decision that comes up in conversation gets written into its home in that
   same session, not saved for a summary later. Mid-task is exactly when this
   gets skipped and exactly when it matters.
3. **When direction changes.** If the goal moves, update the written goal in
   the same session and say what changed.
4. **At completion.** The wrap-up review catches what is durable beyond the
   ticket. It is the last net, not the first.

## The test

Ask: **if this chat vanished right now, could a fresh agent open the repo and
build the right thing, for the right reason, without asking the owner anything
already settled?**

If the answer is no, something discussed is not yet written down. Find it and
write it before continuing.

## What not to do

- Do not answer a requirements question in chat and move on. Answer it, then
  write it down.
- Do not hold a growing pile of decisions "in context" to file at the end. The
  end may not come.
- Do not scatter the same content across a work item, a spec, and a memory
  document. Pick the one home and link to it from the others.
- Do not write a wall of unstructured notes. It has to be organized well enough
  that someone can find the goal, the requirements, and the decisions
  separately, without reading everything.
- Do not treat an exploratory brainstorm answer as approved behavior. Capture it
  as exploration until the owner approves it.

## Not for trivial work

A typo fix, a one-line config change, a quick lookup, or a question with a
one-word answer needs no written record. The test is whether the work has
requirements worth stating. If it does, they are worth writing down.

## How this differs from the neighbouring rules

The work-tracker rule describes the folders and their fields. The memory rule
describes the homes for durable truth and who may write them. The wrap-up rule
describes the review at the end. This rule is the standing obligation those
three assume: capture the thinking as it happens, in the right place, so
nothing important ever lives only in a conversation.

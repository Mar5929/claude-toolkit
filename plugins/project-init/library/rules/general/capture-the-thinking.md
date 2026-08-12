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

## Facts that arrive outside the work

Not everything durable comes from the task in front of you. Some of it just
arrives while you are doing something else, and because it belongs to no ticket,
no completion review will ever ask about it. These are the facts most often
lost.

Notice when one of these goes by:

- **A person or role changed.** Someone joined, changed role, or left, and
  future sessions need to know who to ask about what.
- **A tool, vendor, or system was swapped**, or an integration was added or
  dropped.
- **A standing preference.** An "always" or "never" that outlives this task.
- **A correction.** The owner says "actually..." about something already
  written down, or contradicts a document still marked current.
- **Business language.** The project's own meaning for a term, or how the
  owner's words map to what the system calls the same thing.
- **A new canonical source.** A document or system becomes the place a class of
  information now lives.

These are durable memory, so the same permission applies: the owner reads the
real words and approves them first. Do not record them silently, and do not hold
them for a completion review that has no task to complete. Raise them at the
next natural pause in the conversation.

## Where it goes

One truth, one canonical home. Do not copy the same content into two places,
and do not invent a new location when an existing one fits.

| Content | Home |
|---|---|
| This ticket's goal, requirements, scope, edge cases, and decisions | The work item's `SPEC.md` in the project's work tracker |
| Where the ticket stands, what is next, what is blocked | The work item's `STATUS.md` (or the tracker's status command) |
| Exploration, interviews, options weighed, owner wording, unknowns | `knowledge/brainstorms/` |
| Approved product or system behavior beyond one ticket | `knowledge/specs/` |
| An important choice and its rationale | `knowledge/memory/decisions/` |
| Direction, goals, roadmap, durable risks and assumptions | `knowledge/memory/planning/` |
| Durable circumstances and constraints | `knowledge/memory/context/` |
| Reusable non-obvious understanding | `knowledge/memory/knowledge/` |
| A business term's project-specific meaning | `knowledge/memory/domain/` |
| Why a source matters and what it supports | `knowledge/memory/references/` |
| How the system is operated, released, or recovered | `knowledge/memory/operations/` |

When the project has no work tracker item for what is being worked on, create
one before building. When the project knowledge areas are not installed, the
work item's `SPEC.md` carries all of it.

Durable memory and specification writes use the installed `remember` skill:
apply its filters, show the owner the exact words, then save. Writing a work
item's `SPEC.md` and `STATUS.md` needs no such approval; that is ordinary work.

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
4. **At completion.** Invoke `remember` for what is durable beyond the ticket.
   It is the last net, not the first.

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

## This rule owns the during

`work-item-folders.md` owns the containers, the project knowledge system owns
the durable homes and owner-approval boundary, and `remember` owns the review at
a natural completion point. This rule owns the moment they leave uncovered:
capture the thinking as it happens, so nothing important ever lives only in a
conversation. The table above is the one place that says where each kind of
content goes; other rules point at it rather than keeping their own copy.

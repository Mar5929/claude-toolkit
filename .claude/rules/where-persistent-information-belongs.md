# Where Persistent Information Belongs

Important information should survive a chat, in the place that already owns it.
Not everything important is memory, and copying one fact into several places
makes the project harder to trust.

## Two kinds of information must leave chat

- **Information about the active work item**: its goal, reason, requirements,
  scope, edge cases, decisions, open questions, progress, and blockers. It goes
  wherever that work item is tracked.
- **Persistent project information**: stable facts, lasting events, decisions, or
  states that stop the owner repeating an explanation or a future agent taking
  the same wrong action. It goes in the current rule, skill, specification,
  memory, or reference that owns it.

Internal exploration may stay in a brainstorm while it is still being worked out.
Raw client meetings and client files stay with the project's delivery artifacts.
Past conversation stays in session history. None of it becomes current project
truth just because it exists.

## Where it goes

| Information | Home |
|---|---|
| Who the agent is in this project | `SOUL.md` |
| A standing instruction for how agents behave here | `.claude/rules/`, plus the project's Codex instructions when required |
| A reusable process agents follow across tasks | The appropriate skill |
| Approved system behavior beyond one work item | `knowledge/specs/` |
| A lasting fact, decision, event, or piece of context | `knowledge/memory/` |
| What is being worked on right now, what is blocking it, the next step | `knowledge/current.md` |
| A work item's requirements, status, assignments, and next action | Wherever the work item is tracked |
| Raw client meetings, client files, and source records | The project's delivery or client-artifact folder |
| Internal exploration, owner interviews, options, unchecked ideas | `knowledge/brainstorms/` |
| Past conversation useful only as history | Session history |
| Only needed to finish the task at hand | Nowhere. It stays in the conversation. |

`knowledge/memory/` is flat. One file per topic, no subfolders by type. A note is
usually a fact and a decision and a piece of history at once, so nobody picks a
bin.

Two of these get mixed up constantly:

**A procedure is not a memory.** A repeatable way of doing something is a skill
or a rule. Saved as a memory it comes back later as a fact and gets followed as
an instruction, which is how an agent quietly changes how it works.

**A specification beats a memory.** Once behavior is settled, the specification
answers "how does this work." A memory may explain the history and point at it.
When a memory and a current specification disagree, say so and name both. Never
quietly pick one.

Secrets and private personal information never go in project knowledge.

## Before you ask, or search the code broadly

Go down these tiers and stop at the first one that answers.

1. `knowledge/current.md`. What is happening now.
2. `.claude/rules/`. The answer may be a standing instruction, not a fact.
3. Skills. It may be a procedure rather than something to look up.
4. `knowledge/memory/`, then `knowledge/specs/`, through their indexes, then the
   links inside what you find. A current specification beats a memory.
5. Past sessions, through the session-search skill.

If tier 4 finds nothing, say so and name what you searched. Never invent a
believable answer and never hand back something recent but unrelated. Then offer
tier 5 rather than taking it silently.

Everything from tier 5 comes back flagged: "I found this in a previous session.
Is this still accurate?" It is never treated as current truth and never written
anywhere on the strength of having been found there.

Only files marked `current` answer questions about what is true now.

## Never write without approval

No hook, background job, or helper agent writes to memory or a specification on
its own. Before writing, show one group of bullets per file:

> **What:** what it says, three sentences at most.
> **Where:** the exact file path, and whether it is new or an update.
> **Source:** where the fact came from, and whether it is observed, reported, or
> inferred.
> **Tags:** the tags, and anything else about how it is being filed.
> **Assumptions:** anything assumed, guessed at, or unchecked. `None` when there
> is none.

What the owner approves is **What** and **Source**. Silence, an unclear answer,
or asking to see the full text all mean nothing gets written. Write only what was
approved: not the surrounding context, not an improved version, not one extra
sentence that seemed useful. When the owner edits the words, his words are
written exactly as typed.

Ordinary work-item details need no separate approval. The work item is already
the approved place for active work. Neither does `knowledge/current.md`, which is
overwritten scratch and is never trusted as a lasting fact.

## When to write

1. **Before building.** Put the goal, reason, and known requirements where the
   work item is tracked. Too vague to write down means ask one question first.
2. **When it surfaces.** A new requirement, edge case, constraint, decision, or
   open question goes to its home in the same session.
3. **When direction changes.** Update the work item and record the reason there,
   rather than leaving the old target standing.
4. **At completion or handoff.** Run the save skill. If nothing needs to persist,
   say so in one line and continue.

## The test

If this chat vanished now, could a fresh agent open the project and do the right
work for the right reason without the owner repeating something already settled?

If not, put the missing information in the place that owns it before continuing.

Difficulty, novelty, and conversation length do not make information persistent.
When unsure, do not save. Not saving costs one missed note. Saving carelessly
makes everything else less trustworthy.

## When optional homes are absent

This rule may be installed in a project without the knowledge system or its
skills. Do not create missing `knowledge/` folders or invoke a skill that is not
installed.

Keep work-item information where the work item is tracked. Use an existing rule
or skill where one already owns a standing instruction or process. Keep any other
persistent information with the relevant work item until the owner chooses a
knowledge system. With no work item, carry it in the handoff instead of inventing
a new store.

When a standing instruction or reusable process first appears during active work,
record the requirement where the work item is tracked. Building the rule or skill
then follows that project's normal work process. Do not turn it into memory
merely because the implementation is not finished.

## What not to do

- Do not save the conversation that produced a fact, decision, or rule.
- Do not copy live work status into memory or a specification.
- Do not use a memory file as the only home for an agent instruction.
- Do not mix outside research into an approved decision.
- Do not add reasoning, claims, or background the approval bullets did not cover.
- Do not create a second home because the first is outside the repository. A
  closed issue is still findable and may still own the decision.
- Do not write a wall of notes when a few persistent points are enough.

## Related rules

`spec-before-you-build.md` requires a refined work item before implementation.
`work-item-folders.md` owns the Git-based work-item structure where a project
uses it. The save skill owns the full procedure for writing to memory and
specifications. This rule owns the placement decision all three rely on.

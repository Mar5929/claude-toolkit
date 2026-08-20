# Where Persistent Information Belongs

Important information should survive a chat in the place that already owns it.
Not every important item is memory, and copying one fact into several places
makes the project harder to trust.

## Two kinds of information must leave chat

- **Information about the active work item** includes its goal, reason,
  requirements, scope, edge cases, decisions, open questions, progress, and
  blockers. Put it wherever that work item is being tracked while the work is
  happening.
- **Persistent project information** includes stable facts, lasting events,
  decisions, or states that prevent the owner from repeating an explanation or
  correcting the same wrong action. Put it in the current rule, skill,
  specification, memory, or reference that owns it.

Internal exploration may stay in a brainstorm while it is still being worked
out. Raw client meetings and client-provided files stay with the project's
delivery artifacts. Past conversation stays in session history. None becomes
current project truth merely because it exists.

## Test whether something should persist

Before proposing persistent project information, ask:

1. Will this still matter after the current task or session?
2. Is it a stable fact, lasting event, decision, or state?
3. Would leaving it out make the owner repeat an explanation or make a future
   agent take the same wrong action?
4. Does an existing current place already own it?

If the first three answers are not yes, do not create project knowledge. If the
fourth answer is yes, update or link to that place instead of creating a copy.
Difficulty, novelty, and conversation length do not make information
persistent.

## Where it goes

Search the active work item and the existing rules, skills, specifications,
memories, and references before choosing a new home.

| Information | Home |
|---|---|
| This work item's goal, reason, requirements, scope, edge cases, and decisions | Wherever the work item is being tracked |
| This work item's progress, blockers, assignments, and next action | Wherever the work item is being tracked |
| A standing instruction for how agents behave or work in this project | `.claude/rules/`, plus the project's Codex instructions when required |
| A reusable process agents should follow across tasks or projects | The appropriate skill |
| Approved product or system behavior beyond one work item | `knowledge/specs/` |
| A persistent circumstance, stakeholder, boundary, or outside constraint | `knowledge/memory/context/` |
| A persistent choice and the reason it should not be reversed or debated again | `knowledge/memory/decisions/` |
| A project-specific term or business rule | `knowledge/memory/domain/` |
| A non-obvious project conclusion that prevents a repeated mistake or investigation | `knowledge/memory/knowledge/` |
| A project-specific operating, release, or recovery procedure | `knowledge/memory/operations/` |
| Persistent direction, goals, roadmap, risks, or assumptions beyond one work item | `knowledge/memory/planning/` |
| A durable note about outside source material and what it supports | `knowledge/memory/references/` |
| Raw client meetings, client-provided files, and source records | The project's delivery or client-artifact folder |
| Internal exploration, owner interviews, options, and unchecked ideas | `knowledge/brainstorms/` |
| Past conversation that is useful only as history | Session history |

Secrets and private personal information never go in project knowledge.

## When optional homes are absent

This rule may be installed in a project that does not have the project knowledge
system or the `remember` skill. Do not create missing `knowledge/` folders or
invoke a skill that is not installed.

Keep work-item-specific information wherever the work item is being tracked.
Use an existing rule or skill when one already owns a standing instruction or
reusable process. Keep any other persistent project information with the
relevant work item until the owner chooses a project knowledge system. If no
work item exists, carry it in the handoff or session history instead of
inventing a new storage system.

The short `remember` review below applies only when the complete project
knowledge system is present.

When a standing instruction or reusable process first appears during active
work, record the requirement wherever the work item is being tracked. Building
or changing the rule or skill then follows that project's normal work process.
Do not turn it into memory merely because the implementation is not finished.

## Keep the review short

The installed `remember` skill owns the placement and approval review for
specification and memory changes. Before it writes, it shows one short group of
plain bullets for each separately routed item:

- **What:** the meaning that may be added, changed, moved, or removed.
- **Where:** the current or proposed home.
- **Why:** the repeated explanation or wrong action it prevents.
- **Assumptions:** every assumption, or `None`.
- **Unverified:** every unchecked claim, or `None`.

The owner may keep, change, or skip each item. Full file text appears only when
the owner asks for it, and asking to see it is not approval. The write contains
only the approved meaning and required file structure. Any new claim,
assumption, source, or background needs another short proposal first.

Writing ordinary work-item details needs no separate `remember` approval. The
work item is already the approved place for active work.

## When to write

1. **Before building.** Put the goal, reason, and known requirements wherever
   the work item is being tracked. If they are too vague to write down, ask one
   question before building.
2. **When it surfaces.** Write a new requirement, edge case, constraint,
   decision, or open question into its home in the same session.
3. **When direction changes.** Update the current work item and record the
   reason there instead of leaving the old target standing.
4. **At completion or handoff.** Run `remember`. If nothing needs to persist, say
   so in one line and continue.

## The test

Ask: **if this chat vanished now, could a fresh agent open the project and do
the right work for the right reason without making the owner repeat something
already settled?**

If not, put the missing information in the place that owns it before
continuing.

## What not to do

- Do not save the conversation that produced a fact, decision, or rule.
- Do not copy live work status into memory.
- Do not use a memory file as the only home for an agent instruction.
- Do not mix outside research into an approved decision.
- Do not add reasoning, claims, or background that the approval bullets did not
  cover.
- Do not create a second home because the first one is outside the repository.
  A closed issue or external work item is still findable and may still own the
  decision.
- Do not write a wall of notes when a few persistent points are enough.

## Related rules

`spec-before-you-build.md` requires a refined work item before implementation.
`work-item-folders.md` owns the Git-based work-item structure when a project
uses it. `remember` owns specification and memory approval. This rule owns the
placement decision all three rely on.

# Where Persistent Information Belongs

Important information should survive a chat in the place that already owns it.
Not every important item is memory, and copying one fact into several places
makes the project harder to trust.

## Three kinds of information must leave chat

- **Information about the active work item** includes its goal, reason,
  requirements, scope, edge cases, decisions, open questions, progress, and
  blockers. Put it wherever that work item is being tracked while the work is
  happening.
- **Where the project stands right now** is the current focus, the blockers, the
  next step, and the handoff. Put it in `knowledge/current.md`, which a fresh
  session reads instead of guessing from a conversation it cannot see.
- **Persistent project information** includes lasting facts, decisions, events,
  and patterns that prevent the owner from repeating an explanation or
  correcting the same wrong action. Put it in the current rule, skill,
  specification, or memory record that owns it.

Internal exploration may stay in the project's brainstorm area while it is still
being worked out. Outside documentation and agent-written research stay in the
mapped reference area. Raw client meetings and client-provided files stay with
the project's delivery artifacts. Past conversation stays in session history.
None becomes current project truth merely because it exists.

## Test whether something should persist

Before proposing persistent project information, ask:

1. Will this still matter after the current task or session?
2. Is it a lasting fact, decision, event, or pattern?
3. Would leaving it out make the owner repeat an explanation or make a future
   agent take the same wrong action?
4. Does an existing current place already own it?

If the first three answers are not yes, do not create project knowledge. If the
fourth answer is yes, update or link to that place instead of creating a copy.
Difficulty, novelty, and conversation length do not make information
persistent.

## Where it goes

Search the active work item and the existing rules, skills, specifications,
memory records, and references before choosing a new home.

| Information | Home |
|---|---|
| This work item's goal, reason, requirements, scope, edge cases, and decisions | Wherever the work item is being tracked |
| This work item's progress, blockers, assignments, and next action | Wherever the work item is being tracked |
| Where the whole project stands right now, and the handoff a fresh session needs | `knowledge/current.md` |
| A standing instruction for how agents behave or work in this project | `.claude/rules/`, plus the project's Codex instructions when required |
| A reusable process agents should follow across tasks or projects | The appropriate skill |
| Approved product or system behavior beyond one work item | `knowledge/specs/` |
| Something that is true about this project, with its evidence and how sure anyone is of it | `knowledge/memory/facts/` |
| A choice, why it was made, what was turned down, and what it costs | `knowledge/memory/decisions/` |
| Something that happened, with its date | `knowledge/memory/events/` |
| A way things repeatedly behave here, drawn from facts and events and still short of a proven cause | `knowledge/memory/patterns/` |
| Outside documentation, web-crawl results, and agent-written research | The reference area named in `knowledge/map.md` |
| Raw client meetings, client-provided files, and source records | The delivery or source-record area named in `knowledge/map.md` |
| Internal exploration, owner interviews, options, and unchecked ideas | The brainstorm area named in `knowledge/map.md`, when the project has one |
| Past conversation that is useful only as history | Session history |

Durable memory has those four record types and no others. A subject area such as
Salesforce, health, or research is a field on the record, never a fifth folder
and never a second copy of the record. Persistent direction, goals, and roadmap
belong to the work tracker; a direction choice that must not be re-argued becomes
a decision record.

`knowledge/memory/`, `knowledge/specs/`, and `knowledge/current.md` change only
through the memory tool's write operations, and only after the owner approves. A
hand edit or a shell write into those paths is refused.

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
specification, memory, and current-state changes. Before it writes, it shows one
short group of plain bullets for each separately routed item:

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
- Do not copy live work status into a memory record.
- Do not hand-edit a canonical knowledge file to save a step. The write is
  refused, and the point of the refusal is the approval it protects.
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

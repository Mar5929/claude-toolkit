---
name: remember
description: >-
  Wrap-up command that saves what a work item taught into the project's
  second-brain memory. Run it at the end of a task or work item, or whenever the
  owner says "remember this", "save that", "note this for later", "capture what
  we did", or "/remember". It dispatches the memory curator agents to write the
  durable facts back to THIS project's second brain: the brain-curator for
  decisions, constraints, preferences, corrections, and open questions, and the
  knowledge-curator for the why-behind-the-code when code changed. Do NOT run it
  mid-task, for a trivial or purely mechanical change, or for a question that
  concluded nothing.
---

# Remember (save the work item into the second brain)

A small wrap-up command. When a piece of work is finished and it produced
something durable, this hands that knowledge to the project's memory curators so
it survives into future sessions. It is the deliberate counterpart to automatic
capture: the per-turn journal records events on its own, but a curator dispatch
is what turns a session's *conclusions* into clean, linked memory.

There are two curators, and this command covers **both** on purpose. The
brain-curator (project facts) gets dispatched routinely; the knowledge-curator
(the why-behind-the-code) is the one that quietly never runs, because nothing
automatic triggers it. Running this at wrap-up is how the knowledge layer
actually gets fed.

## Preconditions

This command needs the project's curator agents, which the `second-brain` skill
installs into `.claude/agents/`:

- **`brain-curator`**: owns project memory (decisions, constraints, preferences, terminology, corrections, open questions).
- **`knowledge-curator`**: owns the `know-*` knowledge layer, the why a subsystem exists and how it works, pinned to the files it explains.

If a project has no second brain (neither agent exists), there is nothing to
dispatch. Say so and stop, rather than inventing a place to write.

Each project has its **own** second-brain database, and the curator agents are
already wired to their own project's store. This command does not choose a
database; it just dispatches the local curators, which write to the right one.

## 1. Decide whether there is anything durable

Skip the whole thing when the work item taught nothing that should outlive the
chat: a trivial fix, a mechanical edit, a question that resolved nothing.
Scheduled/background capture already covers the routine.

It is worth running when the work produced a **conclusion**: a decision and its
why, an owner-stated constraint or correction, a preference, an open question
awaiting the owner, a piece of terminology, or a subsystem whose reason-for-being
a future reader would otherwise have to reverse-engineer.

## 2. Extract the facts yourself first

Before dispatching, write down the durable facts in your own words. A curator's
budget should go to deduping and linking, not to re-reading everything you just
did. For each fact, note the specific existing nodes it should link to or update
if you know them, and say plainly what should NOT be stored.

## 3. Dispatch the brain-curator (project facts)

Dispatch the `brain-curator` **once**, batching every project-level fact from
this work item: decisions + why, constraints, preferences, corrections,
terminology, open questions, blockers. Hand it the pre-extracted list from step
2, name the nodes to link, and say what to leave out. One dispatch per wrap-up,
never one per fact.

## 4. Dispatch the knowledge-curator (why-behind-the-code) when code changed

This is the step that usually gets skipped, and the reason this command exists.
If the work item **changed code** in a way where a future reader would need to
know *why it is built that way* (a non-obvious design, a load-bearing invariant,
a subsystem's reason for existing), dispatch the `knowledge-curator` to write or
refresh the `know-*` node for that subsystem, pinning the files it covers.

Skip it only when the change genuinely carries no why worth keeping (a rename, a
copy tweak, a trivial fix). When in doubt after a real code change, dispatch it:
its non-invocation is a known failure mode, not a sign there was nothing to say.

## 5. Stay out of the store yourself

The curators are the **only** writers to the second brain. Do not hand-edit the
memory or knowledge nodes, and do not write to the MCP store directly. Your job
is to extract the facts and route them; the curators own the writing, deduping,
and linking.

## Keep it cheap

One brain-curator dispatch and at most one knowledge-curator dispatch per wrap-up.
Do not loop, do not re-dispatch to "double-check," and do not run this
mid-task. It is a single, bounded closing step.

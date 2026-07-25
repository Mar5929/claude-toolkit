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

## 0. Preflight: is there a write route, and is anything already waiting?

Both checks are cheap and both prevent a wasted pass.

**Flush the outbox first.** If `.claude/memory-outbox/` holds files, those are
curated notes an earlier session finished and could not save. Hand each one to
the curator named in its header (`know-*` nodes to the knowledge-curator,
everything else to the brain-curator) as part of this dispatch, and delete each
file only once it is stored. A leftover file always means unfinished work.

**Confirm a write route exists before dispatching.** The MCP connection can drop
mid-session (it reads fine at session start and is gone by wrap-up), and a
background job may never have had one. A curator dispatched into a dead
connection does the whole job and returns text. So check that a brain tool still
responds (one cheap `recall` or `get_digest` from this session), and say in the
dispatch which route the curator has. If the MCP is gone but `BRAIN_MCP_TOKEN`
is set, say so: the fast path still works.

`references/curator-write-path.md` in the second-brain skill is the full picture
of the routes and the fallback ladder.

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

## 5. Catch a handback: a finished note is never dropped

If a curator reports it could not reach the store, it hands back the complete
node files instead. **That output is the deliverable, and losing it wastes the
entire pass.** Work down the ladder until one route takes it:

1. **`POST /fast/<project>/node`** with `BRAIN_MCP_TOKEN` (a real node write, no
   OAuth needed). `200` means stored.
2. **`POST /fast/<project>/journal`** as a `kind: "curated-node"` entry, if the
   node endpoint returns `404` on this project's Worker. A later curator pass
   promotes it.
3. **`.claude/memory-outbox/<YYYYMMDD-HHMMSS>-<node-id>.md`**, the node file
   verbatim under a comment header naming the curator, id, path, type, edges, and
   why it could not be stored. Commit it: that is how the note travels to a
   session that can save it.

Then tell the owner which route each note took, in the wrap-up itself. Never
report memory as saved when it is sitting in an outbox.
`references/curator-write-path.md` has the exact formats.

## 6. Stay out of the store yourself

The curators are the **only** writers to the second brain. Do not hand-edit the
memory or knowledge nodes, and do not write to the MCP store directly. Your job
is to extract the facts and route them; the curators own the writing, deduping,
and linking.

The outbox is the one exception, and it is not the store: it is a holding pen for
a curator's own finished output, written verbatim as handed back. You never
compose a node yourself, and you never edit one on its way through.

## Keep it cheap

One brain-curator dispatch and at most one knowledge-curator dispatch per wrap-up.
Do not loop, do not re-dispatch to "double-check," and do not run this
mid-task. It is a single, bounded closing step.

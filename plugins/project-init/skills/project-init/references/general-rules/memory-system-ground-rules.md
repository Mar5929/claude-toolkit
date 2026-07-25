# Memory System Ground Rules

Include this rule only if the project set up the long-term memory system.

Long-term memory is single-owner. All writes to the memory store go through the
curator; do not hand-edit it. To remember something, delegate to the curator.
Curated context is injected at session start; treat it as continuity from
earlier sessions.

## Recall before you touch a subsystem

The session-start digest orients you. It does not trigger anything later, and
the per-prompt recall hook only ever sees the owner's opening words. Work
drifts: a session that starts as "fix this button" ends up inside the tool
layer, and nothing re-queries memory when it does.

So before you diagnose, change, or make a claim about a **named subsystem**, run
one `recall` on it. One pointer-first call is cheap, and it is exactly the step
that gets skipped. The store routinely holds a decision about the precise thing
you are about to work on, written days or even hours earlier, that you will
otherwise never read.

The failure this prevents is not "memory was empty." It is "memory knew, and
nobody asked."

## Dispatch the curator once, at wrap-up

Capture is already automatic: the per-turn journal records the session whatever
you do, and the journal is curated when the session ends. A manual curator
dispatch has to earn its cost on top of that.

It earns it when the session's durable fact is a **conclusion** rather than an
event: a decision and its why, a root cause that contradicts the obvious
reading, an owner-stated constraint or correction, an open question awaiting
their call, or a reusable technique. Auto-curation sees turn records. It cannot
reliably reconstruct a judgment buried under fifty tool calls.

When it does earn it:

- **Once per session, at wrap-up, batching every fact.** Never one dispatch per
  finding.
- **Hand it the facts already extracted**, not "go read what I did." Its budget
  should go to deduping and writing.
- **Name the specific existing nodes** you believe it should link or update.
  That collapses its search from a broad sweep to a few lookups.
- **Say what not to store.**

Skip the dispatch entirely for pure question-and-answer turns, mechanical edits,
or an investigation that concluded nothing. Session-end curation covers those.

## Give a many-node topic a hub

When a subject fans out across many nodes, a broad "what do we know about X"
recall returns a wide, expensive pile. The curator's own invariants require a
short overview node linking to the detail nodes, so one recall returns a
headline plus pointers. If you notice a topic that has grown past roughly five
nodes with no hub, say so when you dispatch the curator.

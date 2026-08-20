# Architectural Decision Records: memory system redesign

Decisions made while designing the AI Agent Operating System memory redesign.

A decision earns a record here when a future agent would plausibly re-propose the
thing we rejected. The rejected option and the reason it was rejected are the
point of each record. Without them, the same argument happens again in three
weeks.

Records are never deleted. When a decision is reversed, the old record stays and
a new record supersedes it, naming what changed.

---

## ADR-001: Save as you go is the core, assemble on demand is the fallback

**Date:** 2026-08-20
**Status:** Accepted
**Decided by:** Mike, in the north star refinement session

### Context

The failure that started this redesign: Mike asked an agent in the Davis
Advisors Salesforce project to build a Lightning Web Component using the most
important fields of Discovery, an integration app. The agent did not know what
those fields were. The information had come up across many earlier
conversations and finished tasks, but it was incomplete, unorganized, and
scattered. No single record owned the answer.

### Options considered

1. **Save as you go.** When something durable comes up in a session, the agent
   proposes saving it and the owner approves. By the time the answer is needed,
   a record already exists.
2. **Assemble on demand.** Nothing is saved along the way. When the agent
   realizes it does not know something, it reads the scattered sources and asks
   the owner to confirm what it found before acting.

### Decision

Save as you go is the core of the system. Assemble on demand is the fallback for
when the save did not happen.

### Reason

Assemble on demand alone means re-verifying the same scattered sources every
time the topic comes up, and the answer is only as good as whatever the agent
happens to find that day. It never gets better. Saving as you go compounds.

### Consequences

- The save trigger and the approval flow are the most important parts of the
  system to get right, because everything depends on records existing.
- Save discipline has to be strict, or the store fills with noise and the
  compounding works against us.
- The fallback still has to exist and has to be honest about what it found.

---

## ADR-002: Durable memory has no categories

**Date:** 2026-08-20
**Status:** Accepted
**Decided by:** Mike, in the north star refinement session

### Context

The north star carried a four-part memory model borrowed from cognitive
science: working, semantic, episodic, and procedural memory. The functional
requirements carried a different four-part model: facts, decisions, events, and
patterns. Two documents, two taxonomies, and they did not match.

The v1 build turned those categories into record types, a schema, a validator,
and a router. The overengineering audit dated 2026-08-20 traced the bloat back
to exactly this: a document describing categories caused a builder to construct
machinery for them.

The Discovery case shows the practical problem. One useful note about Discovery
would say what the app is, which fields matter, and why. That is a fact, a
decision, and a piece of history at the same time. Under either taxonomy an
agent splits it into three files or stalls choosing a bin.

### Options considered

1. **Cut the categories.** One kind of durable memory record. The only boundary
   the system enforces is placement: memory, rule, skill, or specification.
2. **Keep light categories** as folder names only, with an instruction never to
   split a record to fit one.
3. **Keep the full model** as record types with their own required fields.

### Decision

Cut the categories. Durable memory is one kind of record.

### Reason

The three things the owner actually wants from memory are findability
(the agent lands on the right note), connection (it reaches related notes), and
curation (what it finds is worth trusting). Categories serve none of the three.
Knowing a note is filed as semantic rather than episodic does not help an agent
find it, connect it, or trust it.

Findability comes from naming the note for its topic and giving it a
one-sentence summary. Connection comes from links written inside the note.
Curation comes from the save discipline. The taxonomy was doing no work and was
generating machinery.

The placement boundary is different and stays. Memory, rules, skills, and
specifications are genuinely different things, and collapsing them is a real
failure the owner has hit.

### Consequences

- No record-type field, no per-type required fields, no type validation, no
  router that branches on type.
- Any future proposal to add memory categories has to argue against this record
  first. Models trained on AI-agent-memory writing will reach for this
  taxonomy by default.
- Note naming and one-sentence summaries carry more weight, because they are
  now the whole findability story.

---

## ADR-003: Plain links, no backlink index

**Date:** 2026-08-20
**Status:** Accepted
**Decided by:** Mike, in the north star refinement session

### Context

The owner wants memories to connect, so an agent that finds one note can reach
the related ones. The v1 requirements turned this into a maintained reverse
index of which records link to which, plus automatic link repair when a file is
moved or renamed.

### Options considered

1. **Plain links.** A note contains file paths pointing at other notes. To find
   what points back at a note, the agent greps for its filename.
2. **Managed links.** A maintained backlink index, plus automatic repair of
   every affected link when a record moves or is renamed.

### Decision

Plain links. Links are file paths written inside notes. Backlinks are answered
by searching for the filename.

### Reason

Writing a link inside a note costs nothing. Maintaining a reverse index costs
real code, and it can be wrong. At the scale these projects run, a few dozen to
a few hundred notes, searching for a filename returns backlinks instantly and
can never be stale, because there is nothing to keep in sync.

### Consequences

- No index to rebuild, no repair transaction, no partial-repair failure state.
- Renaming a note can leave a link pointing at nothing. Link checking belongs in
  the validator, which reports broken links rather than repairing them silently.

---

## ADR-004: Markdown files are the store, and there is no database

**Date:** 2026-08-20
**Status:** Accepted
**Decided by:** Mike, in the north star refinement session

### Context

The owner asked whether memories should be stored in a SQLite database rather
than Markdown files.

### Options considered

1. **Markdown files in the repository**, owned by Git.
2. **SQLite**, or any other database or vector store, as the store of record.

### Decision

Markdown files in the repository are the store of record. No database holds
project memory.

### Reason

Four reasons, heaviest first.

1. Claude Code and Codex read Markdown natively with Read, Grep, and Glob. A
   database needs a tool layer in between just to retrieve a memory, and that
   tool layer is what the overengineering audit identified as a worse version
   of Grep wrapped in ceremony. Choosing a database guarantees building it.
2. The owner cannot read a database file. Reviewing what an agent wrote is a
   core requirement, and it depends on the store being human-readable.
3. Git cannot show a useful diff of a binary file. An agent saving a memory to
   Markdown produces a change the owner can read in seconds. In a database it
   is one opaque blob changing, which removes the main defense against agents
   writing things without the owner noticing.
4. The scale does not justify it. A database starts paying off in the tens of
   thousands of records with real query patterns. These projects hold dozens to
   a few hundred notes, where scanning files is faster than loading an index.

### What would reverse this

A project passing roughly one thousand memories, combined with a real need for
structured queries such as every current decision touching one object made
after a given date. Markdown converts into a database easily at that point. The
reverse trip is much harder, which is why Markdown is the safer starting
choice.

### Consequences

- Retrieval is searching files, not querying a store.
- Every derived view, if one is ever built, must be rebuildable from the files.
- Any proposal for a vector store or embedding database has to argue against
  this record first.

---

## ADR-005: Graphify is an optional view, off by default, never required

**Date:** 2026-08-20
**Status:** Accepted
**Decided by:** Mike, in the north star refinement session

### Context

The owner asked whether Graphify could maintain the map of memories and their
relationships. Graphify is a separate toolkit skill that reads files and builds
a persistent knowledge graph with query and explain tools.

### Options considered

1. **Graphify as part of the core system**, maintaining the memory map.
2. **Graphify as an optional view**, off by default.
3. **No Graphify involvement.**

### Decision

Graphify may be turned on for a project as an optional view over the memory
files. It is off by default. No part of the memory system may require it.

### Reason

Graphify is a view, not a store. It reads the files, and the files stay
authoritative, so deleting the graph loses nothing and rebuilding restores it.
That makes it safe in a way a database is not.

There is a real case for it once a project holds enough notes that the owner
cannot hold the list in their head. A map showing which memories cluster around
a topic is more than searching gives.

At small scale it is overhead, and searching wins.

### Consequences

- Two firm conditions: nothing in the system may stop working when the graph is
  absent, and nothing may live in the graph that is not in a file first.
- If either condition is ever broken, the graph has quietly become the source of
  truth and ADR-004 has been reversed by accident.

---

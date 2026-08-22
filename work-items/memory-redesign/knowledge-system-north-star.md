# Memory System

**Status: approved, 2026-08-21. This is the design being built under issue #215.**

This document is the only design input for that build. The earlier redesign
drafts are in `archive/` and none of them is current.

This is the manual an agent reads to use this project's memory. The short version
lives in `CLAUDE.md` and `AGENTS.md`. This file holds the details.

## The Vision

I want to build an **AI Agent Operating System** for coding agents such as Codex and Claude.

At the center of that operating system is a **second-brain memory and specification system** that gives an AI coding assistant persistent, durable knowledge across sessions.

Today, an agent can have a productive conversation, learn important things about a project, make decisions, understand preferences, and develop useful context — but much of that understanding disappears when the context window ends or a new agent session begins.

The goal is to change that.

The agent should be able to accumulate durable project knowledge over time so that I do not have to repeatedly explain the same facts, decisions, constraints, preferences, architecture, and project history.

The system should make the agent feel increasingly knowledgeable about the project without allowing that accumulated knowledge to become noisy, stale, contradictory, or misleading.

The goal is not to remember everything.

The goal is to remember **the right things**.

### A Reminder - The System Is More Than Memory

Persistent memory is only one part of the operating system.

Different kinds of information have different purposes and should live in different places.

We are building an overall AI operating system. This document focuses only on the knowledge system, AKA memory and specifications, but this is just a reminder of the holistic overall operating system that we are building.

- **Soul** — who the agent is, what its role is, and what its purpose is.
- **Rules** — durable behavioral and operational instructions the agent is expected to follow.
- **Skills** — reusable procedures or capabilities for performing recurring kinds of work.
- **Memory** — durable context, facts, decisions, events, and knowledge that may be useful in future work.
- **Specifications** — authoritative descriptions of how the project or system is intended to work.
- **Transient execution context** — temporary reasoning, tool calls, scratch work, intermediate observations, and other information that should disappear when the task is over.

These are not interchangeable stores.

A major responsibility of the operating system is helping the agent understand **what kind of knowledge it is dealing with and where that knowledge belongs**.

## What the memory system is built to solve - an example

Suppose we are four months into a Salesforce implementation, and I tell the agent "for the migration we are going to need to create a custom field on contact to retain the original created date rather than preserve the Salesforce created date."

## Key Principles of the second brain system

### Specifications Are Authoritative; Memory Provides Context

The memory system and the specification system serve different purposes.

**Memory tells the agent what has happened, what has been learned, what context matters, and what decisions were made.**

**Specifications tell the agent how the system is intended to work.**

When a feature, workflow, architecture, behavior, or interface has been finalized, its authoritative definition should be persisted in the specification system rather than existing only as a memory.

Memory may reference or explain the history behind a specification, but it should not become a competing source of truth for finalized system behavior.

If memory and an active specification disagree, the system should recognize that conflict rather than blindly treating both as equally valid.

## Types of memory

**Short-term memory is where the work is right now.** One file,
`knowledge/current.md`. It says what is being worked on, what is blocking it, and
the exact next step. It gets overwritten, never added to. It is the handoff: a
new agent reads it and carries on without the earlier conversation.

**Long-term memory is what stays true after the work is done.** A folder of
Markdown files, `knowledge/memory/`.

The difference is not how old something is. It is whether it survives the work
finishing. "We are halfway through moving the data" is short-term. "The move has
to run in this order or it fails" is long-term.

Long-term memory comes in a few kinds, borrowed from cognitive science: working
memory, semantic memory, episodic memory, and procedural memory. These categories
describe **what kind of knowledge something is**. They do not require every
category to live in the same physical folder. Some forms of durable agent
knowledge belong in the persistent memory base, while others belong in skills,
rules, specifications, or native agent instructions.

---

#### Working Memory — What the Agent Is Using Right Now

Working memory is the active context required to complete the current task.

Examples include:

- the current conversation;
- active goals and plans;
- tool outputs;
- retrieved documents;
- temporary files;
- intermediate calculations;
- scratch notes;
- unverified hypotheses;
- current debugging observations;
- partial implementation state.

Working memory is necessary, but it is not automatically durable knowledge.

Most working memory should disappear when the work is complete.

The system may preserve session or work-item state long enough to resume interrupted work, but **resumability is not the same thing as long-term memory**.

A tool result, transcript, execution trace, or scratch note should not become long-term memory merely because it existed.

---

#### Semantic Memory — What the Agent Knows

Semantic memory contains durable facts, concepts, relationships, preferences, and project knowledge.

For a coding agent, semantic memory may include things such as:

- stable facts about the project;
- important architectural context;
- project-specific terminology;
- durable constraints;
- important user preferences relevant to the project;
- relationships between components or entities;
- facts that are difficult to infer from the repository alone;
- current truths that future agents will otherwise repeatedly need explained.

Semantic memory should answer questions such as:

> What is true?

> What do we know?

> What concepts or relationships matter in this project?

Semantic memory should not become a duplicate copy of everything already present in source code or authoritative documentation.

If a fact can be cheaply and reliably rediscovered from an authoritative artifact, there is little value in creating a second stale copy unless the memory adds important context that the artifact does not provide.

Facts that can change over time should retain enough temporal context, status, or provenance for future agents to understand **when** they were true and whether they are still current.

---

#### Episodic Memory — What Happened

Episodic memory preserves meaningful events and experiences from the history of the project or agent.

For a coding agent, useful episodes may include:

- a significant architectural decision and why it was made;
- a migration or major change;
- the outcome of an important work item;
- an incident and its resolution;
- a failed approach when knowing why it failed will prevent future rework;
- a consequential interaction or clarification;
- a discovery that materially changed the direction of the project;
- a meaningful experiment and its outcome.

Episodic memory should answer questions such as:

> What happened?

> What did we try?

> What was the outcome?

> Why did we end up here?

An episode should generally be a **distillation of the event**, not a raw transcript of the entire session that produced it.

The useful episode is usually the event, outcome, rationale, lesson, and links to supporting artifacts.

Routine actions should not become episodes simply because they occurred.

The system should preserve episodes when their future value outweighs the noise they add.

---

#### Decisions Span Episodic and Semantic Memory

A decision is a good example of why memory categories should not become rigid silos.

A decision has an **episodic dimension**:

- when it was made;
- what alternatives were considered;
- why the decision was made;
- what happened as a result.

It may also create a **semantic dimension**:

- what is now considered true;
- what constraint now exists;
- what architecture or convention future work should assume.

If the decision defines authoritative system behavior or architecture, the canonical decision should live in the appropriate specification or ADR.

Memory should preserve useful historical context and point to that authority rather than becoming a competing source of truth.

---

#### Procedural Memory — How the Agent Should Behave

Procedural memory is knowledge about **how to perform work**.

Examples include:

- operating instructions;
- repeatable workflows;
- tool-use procedures;
- coding processes;
- review procedures;
- behavioral guardrails;
- reusable task recipes;
- learned skills.

Procedural memory is a valid category of agent memory conceptually, procedural memory should never be stored in the knowledge or specification system. **These are stored as rules or skills for the AI agent!!!!!**

- durable behavioral requirements belong in **Rules** or native agent instructions;
- reusable procedures belong in **Skills**;
- project-specific operating contracts may belong in `AGENTS.md`, `CLAUDE.md`, or the mechanism appropriate to the host;
- system behavior that must be authoritative belongs in the appropriate specification.

If the agent discovers a procedure that appears reusable, it should propose creating or updating a skill rather than silently saving the procedure as an ordinary memory.

The agent should not quietly rewrite its own procedural memory without the appropriate approval.

## Where information goes - this is a holistic look at the operating system as a whole

The operating stores things in is one of six places. Putting something in the wrong one causes real
damage, so check this before saving anything.

| The question | Where it goes |
| --- | --- |
| Who the agent is in this project | `SOUL.md` |
| A standing instruction for how the agent must behave | `.claude/rules/` |
| A repeatable procedure for a kind of work | A skill |
| How the system is meant to work, once settled - THIS IS PART OF THE SECOND BRAIN | `knowledge/specs/` |
| A lasting fact, decision, event, or piece of context - THIS IS PART OF THE SECOND BRAIN | `knowledge/memory/` |
| Only needed to finish the task at hand | Nowhere. It stays in the conversation. |

Two of these get mixed up constantly:

**A procedure is not a memory.** If the agent learns a repeatable way to do
something, that is a skill or a rule. Saving it as a memory means it comes back
later as a fact and gets followed as an instruction. That is how an agent quietly
changes how it works.

**A specification beats a memory.** Once behavior is settled, the specification
answers "how does this work." A memory can explain the history and point at it.
When a memory and a current specification disagree, say so out loud. Do not
quietly pick one.

## What a spec file looks like - The Schema

One file per process/function area of the software. The files can be related to other process areas.

The filename is the process/function area, in plain words.

```markdown
Spec Schema

id:
summary: One sentence saying what this file tells you.
area: 
status:
source: where this came from, where to check it out
source_quote:
created_at:
effective_from:
effective_to:
entities:
tags: [tag-one, tag-two, tag-three...]
project:
work_item:
supersedes:
superseded_by:
approved_by:
approval_date:


# Title - Plain Words

What is true, written so someone reading it a year from now understands it
without the conversation that produced it.
```

## What a memory file looks like - The Schema

One file, one topic. There are no categories, no folders per type, and no form
that makes you choose a bin. One note about a single topic is usually a fact, a
decision, and a piece of history all at once. Never split it up to fit a label.

The filename is the topic, in plain words.

```markdown
Memory Schema

id:
summary: One sentence saying what this file tells you.
type: decision, fact, architectural-decision-record, 
status:
statement:
source: where this came from, where to check it out
source_quote:
created_at:
effective_from:
effective_to:
confidence:
entities:
tags: [tag-one, tag-two, tag-three...]
project:
work_item:
supersedes:
superseded_by:
related_memories:
approved_by:
approval_date:


# Title - Plain Words

What is true, written so someone reading it a year from now understands it
without the conversation that produced it.
```

**What each field is for:**

- **`summary`** lets you find the right file without opening ten of them. One
  sentence.
- **`created`** and **`confirmed`** are different. `created` never changes.
  `confirmed` is the last time someone checked this is still true. An old
  `confirmed` date does not mean the file is wrong. It means nobody has checked
  it lately.
- **`status`** is `current`, `superseded`, or `retired`. Only `current` files
  answer questions about what is true now.
- **`superseded_by`** appears only when `status` is `superseded`. It is the path
  to the file that replaced this one.
- **`confidence`** is `observed`, `reported`, or `inferred`. Observed means the
  agent checked it. Reported means someone said it. Inferred means the agent
  worked it out. Something inferred stays inferred until somebody checks it.
- **`tags`** are free-form. There is no fixed list, and a file can have as many
  as it needs. Tags are how you find a topic across many files.
- **`source`** says where this came from and where to go check it: a file path, a
  commit, a link, or the name of the person who said it.

**Links are plain file paths written in the body.** There is no list of links
kept anywhere. To find what points at a file, search for its name.

## What should be stored in memory

### What to store

Seven questions. The first four decide whether the memory should exist at all.
The last three decide whether it is safe to write. Ask all seven.

**Should it exist?**

1. **Is it a lasting fact, decision, event, or state?** How hard it was, how new
   it felt, how much work it took, and how long it was discussed do not count. A
   session feeling important is not proof that anything lasting came out of it.
2. **Did the project change, or did the agent just do work?** What the agent did
   is not project history. "Wrote fourteen files today" is not a memory. What
   those files changed about the project might be.
3. **Will it still be true in six months?** A fact that goes out of date is worse
   than no fact, because a future agent will believe it.
4. **If it is missing, does the owner have to explain it again, or does a future
   agent get it wrong?** If neither happens, it is not needed.

**Is it safe to write?**

1. **Can this be found or worked out from what is already there?** The code, a
   specification, a rule, a skill, the work tracker, or a memory that already
   exists. If yes, link to it. Never write a second copy. The two will drift
   apart and then neither one can be trusted. Two files saying the same thing
   from genuinely different sources are two pieces of evidence, not a copy.
2. **Can it say where it came from and where to go check it?** A memory that
   cannot say where it came from does not get written.
3. **Could a future agent read this as meaning more than it does?** Something
   that is true in one narrow case, written loosely, gets read as a general rule
   and followed. If the wording can be read two ways, tighten it or do not save
   it.

**When unsure, do not save.** Not saving costs one missed note. Saving carelessly
makes everything else in the folder less trustworthy. The owner can always say
"remember this."

### What never goes in memory

The system should aggressively avoid storing transient or low-value information.
None of this becomes durable memory:

- Tool calls, searches, web lookups, and commands run.
- Rough thinking and scratchpad reasoning.
- Ideas or hypotheses that were tried and dropped.
- Temporary implementation steps and low-level execution details with no lasting relevance.
- Ordinary test and compiler errors.
- Files opened, and a blow-by-blow of edits.
- Every action performed by a sub-agent.
- Chit-chat and conversational filler.
- Copies of code or specifications that already exist. Never save something an agent could work out by reading the production code.
- A procedure that belongs in a rule or a skill.
- Authoritative system behavior that belongs in a specification.
- An open task or implementation step that belongs in work-item tracking.
- Live status of current work.
- Anything stale, superseded, or contradicted with no historical value.
- Passwords, keys, and tokens, ever, because this folder is in Git and Git keeps everything.

### Other Info about whether or not memory should be stored

Information should not enter long-term memory merely because the agent noticed it.

Before creating durable memory, the system should conceptually ask whether the information passes a promotion test.

Information is a good candidate for long-term memory when one or more of the following are true:

- it is likely to matter in a future session;
- losing it would cause me to repeat important context;
- it explains why the project is in its current state;
- it captures an important decision, event, outcome, or lesson;
- it records a durable fact, constraint, preference, or relationship;
- it will prevent meaningful rework or repeated mistakes;
- it is difficult to reconstruct reliably from existing authoritative artifacts;
- it connects other important knowledge in a way that improves future understanding.

Anything that fails these tests, or that appears in the "What never goes in
memory" list above, should not be promoted.

### Memory Should Consolidate, Not Merely Accumulate

A healthy memory system should not behave like an append-only transcript.

As knowledge grows, the system should be able to recognize:

- duplicates;
- overlapping facts;
- contradictions;
- changed preferences;
- superseded decisions;
- repeated episodes that imply a broader pattern;
- memories whose value has expired.

New information should be reconciled with existing knowledge rather than blindly added beside it.

Depending on the situation, the correct action may be to:

- create a new memory;
- enrich an existing memory;
- link related memories;
- merge duplicates;
- supersede an older memory;
- retire stale knowledge;
- preserve an old memory for historical context;
- delete information that was simply wrong or never should have been retained.

The goal is not to maximize the number of memories.

The goal is to maintain a **small, trustworthy, connected body of durable knowledge** that improves future reasoning.

## How to invoke the memory process

Human users can use the /remember skill to initiate the process and tell the agent that the human wants to persist the valuable memories from the chat session into the second brain.

## When to store memories and specs

### Memories should be stored at natural stopping points, such as the ones below

- when a task or work item finishes
- before a commit or pull request (need a hook to remind the agent for this)
- before a handoff or before clearing context (there should be an instruction in the /handoff skill to remind the agent to invoke the /remember process)
- when the session has run long

**The owner can say "remember this" at any time or use the /remember skill.** That starts the review below.
It is not permission to write. It starts the process, it does not skip it.

**Never write memory without approval.** No hook, background job, or helper agent
writes memory on its own. That is what makes the memory worth trusting.

### Specs are FINALIZED and APPROVED specifications on HOW the software, process, etc. should function

Specs are considered testable specifications on how certain areas of a software application should function, such as:

- process flows
- logic flows
- user click paths
- how a user should use the system
- etc...

These could theoretically be used to QA the system if need be. They are not direct one-to-one copies of the raw source production code, and they do not just regurgitate how the code functions. **The second brain system should never save something that an agent could determine simply by looking at the raw production code!!!!!**

## Work items and specs

A work item is one piece of work: a feature, a fix, a change. Work items are
tracked in different places depending on the project. One project uses GitHub
Issues. Another uses folders of files in the repo. Another uses an outside tool
like Linear. Every project is different, and this system does not dictate where
work items live.

Whatever the tracker is, it owns two things about each work item:

- **The requirements.** What has to be true for the work item to count as done.
- **The status.** Where the work stands right now: not started, in progress,
  blocked, done.

Requirements and status are live work state, so they belong in the tracker, not
in memory and not in a spec. The second brain never holds a copy of them.

**When a work item finishes, evaluate the specs.** The finished build is the
moment to ask: did this work change how any part of the system is meant to work?
If yes, the spec for that area gets updated to match what was actually built,
through the normal approval process. The spec folder always reflects the
finalized state of the system, and finished work items are what move it forward.

This is what keeps specs trustworthy. A spec that never gets updated after the
work lands drifts away from the real system, and then it answers questions
wrong.

## How to ask for approval

The ai agents should show these four bullets for each thing being saved. One group per file. Write
nothing until the owner answers.

> **What:** what the memory says. Three sentences at most.
> **Where:** the exact file path, and whether it is new or an update.
> **Tags:** the tags, and anything else about how it is being filed.
> **Assumptions:** anything being assumed, guessed at, or not checked. Write
> `None` when there is none.

Rules for the review:

- **Assumptions get approved separately from the content.** An assumption is how
  memory gets polluted. If the owner approves the content but not an assumption,
  the assumption comes out and the memory is written without it.
- **Silence is not approval.** No answer, an unclear answer, or asking to see the
  full text all mean nothing gets written.
- **The owner can change anything.** The wording, the location, the tags, or drop
  it entirely.
- **Write only what was approved.** Not the surrounding context, not an improved
  version, not one extra sentence that seemed useful.

## Updating, superseding, retiring, deleting

**Never just add.** Writing a new file every time something comes up is how the
folder turns into a mess nobody trusts. Before writing anything new, check
whether a file on this topic already exists.

**Update** when the new information agrees with the file and adds to it. Edit the
file, change `confirmed` to today, and note what changed. No new file.

**Supersede** when the new information contradicts the file and the new
information is right. Three steps, done together:

1. Write the new file.
2. On the old file, set `status` to `superseded` and `superseded_by` to the new
   file's path.
3. Search for the old file's name and fix anything still pointing at it as
   though it were current.

The old file stays. Often the fact that something changed is the useful part.

**Retire** when a file no longer applies but its history still matters. Set
`status` to `retired`. It stops answering questions about what is true now and
stays findable.

**Delete** only for these reasons, and say which one:

- a copy created by mistake
- a password or key that should never have been written down
- something that was never true, which is different from something that stopped
  being true

**Being old is never a reason to retire something.** Written two years ago and
still true means still true.

## Finding things

Search here before asking the owner, and before searching the code broadly.

### The find ladder

In Mike's words:

> Essentially, session search is not a last-ditch effort, but the lowest tier in
> trying to find information for the AI agent.
>
> The AI agent always starts:
>
> 1. Do I see if I can find something in my short-term memory?
> 2. Is it in my rules folder?
> 3. Is it a procedural thing?
>
> If I can't find it in short-term working memory, then it goes to long-term
> memory and searches there. If it can't find it there, then it'll ask the user,
> "Hey, I can't find it. Do you want me to do a session search or something?"
> The user can say yes, or the agent can use its discretion to search through
> sessions. It should always highlight to the user, "Hey, I found this in a
> previous session. Is this still accurate?"

Written out as the order to follow. Stop at the first tier that answers.

1. **Short-term memory.** Read `knowledge/current.md`. It says what is happening
   now.
2. **Rules.** Check `.claude/rules/`. The answer may be a standing instruction
   rather than a fact. These are already loaded, so this is a check, not a
   search.
3. **Skills.** Ask whether this is a procedural thing, a repeatable way of
   working, rather than something to look up.
4. **Long-term memory and specifications.** Search `knowledge/memory/` for the
   topic, using filenames, summaries, and tags, then check `knowledge/specs/` for
   how something is meant to work. A current specification beats a memory. Follow
   the links inside whatever you find; one step usually gets you there.
5. **Past sessions.** The lowest tier, not a last resort. Reached only when the
   four above came up empty.

### What happens when tier 4 finds nothing

Say so plainly and name what you searched. Never make up a believable answer, and
never hand back something recent but unrelated.

Then offer tier 5: ask the owner whether to search past sessions. He can say yes,
or the agent may use its own judgment and search. Either way it is offered or
announced, never done silently.

### Everything found in a past session comes back flagged

A past session is not current truth. It is a record of what was said once. So
every result from tier 5 is handed back with the flag attached: "I found this in
a previous session. Is this still accurate?"

Nothing from a past session is written into memory or a specification on the
strength of having been found there. If it turns out to still be true, it goes
through the normal approval process like anything else.

### Status decides what answers

Only files marked `current` answer questions about what is true now. A superseded
file answers questions about history.

### Memory Index

There should be a `knowledge/memory/memory-index` index that is auto-generated and is a one-line summary of each of the files. That single line summary is derived directly from the summary property of the memory schema in the YAML.

## Overall proposed solution of Second Brain System (Memories and Spec)

We will use out-of-the-box Coding Agent configuration as much as possible, where appropriate.

This second brain system is built to be the second brain for an AI agent, so we will use the native Claude Code and codex mechanisms to empower the agent to use this persistent second brain system.

- Skills for maintaining memories: /remember, /retire, /reflect (job to clean up, deduplication, and consolidate memories)
- Skills for finding things: /recall walks the find ladder above. /session-search is tier 5 of that ladder, and everything it returns comes back flagged as possibly out of date.
- Hooks where appropriate (maybe before a pull request and a hook to detect when a work item is finished?) to force the agent to evaluate if there is something we should persist to memory or the spec system.
- Claude.md + .claude/rules to inject the operating manual of the AI operating system and the second-brain (within the AI operating system) into the agent's context
- SOUL.md to remind the agent of its purpose
- YAML for the markdown file memory and spec schemas
- SQLlite only if we need it.
- We don't need extensive testing frameworks that hard code and test evals to be shipped along with this second brain system.

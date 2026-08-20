# AI Agent Operating System — North Star

## Purpose of This Document

This document is the North Star for the AI Agent Operating System.

It exists to capture, in plain language, what the system is supposed to become and the principles that should guide its design. Coding agents should use this document to continually true up implementation decisions against the original intent.

This is **not** the detailed technical specification. It should not try to prescribe every schema, script, tool, storage format, or implementation detail. Those belong in requirements, technical specs, ADRs, rules, and implementation plans.

When there is ambiguity in a lower-level design, this document should help answer:

> **Are we still building the system we intended to build?**

---

## The Vision

I want to build an **AI Agent Operating System** for coding agents such as Codex and Claude.

At the center of that operating system is a **second-brain memory and specification system** that gives an AI coding assistant persistent, durable knowledge across sessions.

Today, an agent can have a productive conversation, learn important things about a project, make decisions, understand preferences, and develop useful context — but much of that understanding disappears when the context window ends or a new agent session begins.

The goal is to change that.

The agent should be able to accumulate durable project knowledge over time so that I do not have to repeatedly explain the same facts, decisions, constraints, preferences, architecture, and project history.

The system should make the agent feel increasingly knowledgeable about the project without allowing that accumulated knowledge to become noisy, stale, contradictory, or misleading.

The goal is not to remember everything.

The goal is to remember **the right things**.

---

## The System Is More Than Memory

Persistent memory is only one part of the operating system.

Different kinds of information have different purposes and should live in different places.

The system should maintain clear boundaries between:

- **Soul** — who the agent is, what its role is, and what its purpose is.
- **Rules** — durable behavioral and operational instructions the agent is expected to follow.
- **Skills** — reusable procedures or capabilities for performing recurring kinds of work.
- **Memory** — durable context, facts, decisions, events, and knowledge that may be useful in future work.
- **Specifications** — authoritative descriptions of how the project or system is intended to work.
- **Transient execution context** — temporary reasoning, tool calls, scratch work, intermediate observations, and other information that should disappear when the task is over.

These are not interchangeable stores.

A major responsibility of the operating system is helping the agent understand **what kind of knowledge it is dealing with and where that knowledge belongs**.

---

# The Memory Model

The operating system should use a clear memory model so that agents do not treat every piece of context as the same kind of knowledge.

A useful model, borrowed from cognitive science and increasingly used in AI-agent systems, distinguishes **working memory, semantic memory, episodic memory, and procedural memory**.

These categories describe **what kind of knowledge something is**. They do not require every category to live in the same physical memory folder.

In this operating system, that distinction is important: some forms of durable agent knowledge belong in the persistent memory base, while others belong in skills, rules, specifications, or native agent instructions.

---

## Working Memory — What the Agent Is Using Right Now

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

## Semantic Memory — What the Agent Knows

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

## Episodic Memory — What Happened

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

## Decisions Span Episodic and Semantic Memory

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

## Procedural Memory — How the Agent Should Behave

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

Procedural memory is a valid category of agent memory conceptually, but in this operating system it should generally **not** be stored in the ordinary project memory base.

Instead:

- durable behavioral requirements belong in **Rules** or native agent instructions;
- reusable procedures belong in **Skills**;
- project-specific operating contracts may belong in `AGENTS.md`, `CLAUDE.md`, or the mechanism appropriate to the host;
- system behavior that must be authoritative belongs in the appropriate specification.

If the agent discovers a procedure that appears reusable, it should propose creating or updating a skill rather than silently saving the procedure as an ordinary memory.

The agent should not quietly rewrite its own procedural memory without the appropriate approval.

---

## Derived Observations — What the Agent Thinks It Has Learned

Some useful knowledge is not directly stated in any one interaction.

Over time, the agent may recognize a recurring pattern or derive a higher-level conclusion from multiple facts or episodes.

Examples might include:

- a component repeatedly causes failures when a particular migration step is skipped;
- a certain implementation pattern consistently creates maintenance problems in this codebase;
- a user repeatedly chooses one design trade-off over another;
- several incidents point to the same hidden constraint.

These derived observations can be valuable, but they have a different epistemic status from directly observed facts.

The system should therefore keep **evidence separate from inference**.

A derived observation should:

- be identifiable as an inference or learned pattern;
- be grounded in one or more source facts, episodes, or artifacts;
- preserve links to the evidence that supports it;
- be revisable when new evidence contradicts it;
- never silently become an authoritative specification or rule.

A useful learned pattern may eventually justify a new rule, skill, or specification change, but that promotion should be deliberate.

---

# Memory Has Both a Type and a Scope

Memory type and memory scope are different dimensions.

The **type** describes what kind of knowledge something is.

The **scope** describes where and for how long that knowledge should apply.

Useful scopes may include:

- **turn-scoped** — needed only for the immediate interaction;
- **session/work-item-scoped** — useful while a particular piece of work is active;
- **project-scoped** — durable knowledge specific to one project;
- **user/global-scoped** — durable preferences or context that genuinely apply across projects;
- **agent-scoped** — knowledge specific to the operation of a particular agent, when appropriate.

The system should default to the narrowest correct scope.

Project-specific knowledge should not leak into unrelated projects.

Temporary work-item context should not become permanent project truth.

A stable preference that genuinely applies everywhere should not need to be rediscovered separately in every project.

Correct scoping is part of memory hygiene.

---

# History Is Evidence; Memory Is Distilled Signal

The operating system should distinguish between the **record of what happened** and the **durable knowledge extracted from it**.

Conversation transcripts, execution traces, tool logs, sub-agent logs, command output, and task history can be valuable evidence.

That does not make all of them memory.

Most execution history should remain history.

The system should promote only the useful signal from that history into durable memory.

For example:

```text
RAW HISTORY
Agent searched five files, ran three commands, tried two patches,
one failed, the second worked.

                ↓ distill

DURABLE EPISODE
The authentication failure was caused by stale generated client code.
Regenerating the client after the schema change resolved the issue.
The first attempted middleware change was unrelated.
```

Even the distilled episode should only persist if there is a reasonable chance that future agents will benefit from knowing it.

The persistent memory base is not the project's audit log.

---

# The Memory Promotion Test

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

Information should generally **not** be promoted when:

- it is only needed to finish the current task;
- it is a raw tool call, command, search, or execution trace;
- it is conversational filler;
- it is an unverified hypothesis;
- it is an intermediate implementation detail with no future value;
- it duplicates information that is already authoritative and easy to retrieve;
- it is a procedure that belongs in a rule or skill;
- it is authoritative system behavior that belongs in a specification;
- it is simply an open task or implementation step that belongs in work-item tracking;
- it is stale, superseded, or contradicted without historical value;
- it is sensitive information that should not be retained.

The default should be **restraint**.

When uncertain, the system should prefer keeping information transient until there is evidence that it deserves durable status.

---

# Memory Should Consolidate, Not Merely Accumulate

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

---

# North Star Principles

## 1. Persistent Memory Should Make the Agent Smarter, Not Heavier

The memory system should act as the agent's durable second brain.

It should preserve important context that would otherwise be lost between sessions, including things such as:

- important project facts;
- finalized decisions;
- meaningful events and outcomes;
- durable constraints;
- important user preferences relevant to the project;
- architectural or product context that future agents will need;
- lessons or context that prevent the same ground from being rediscovered repeatedly.

But persistence itself is not the goal.

A memory system that saves too much can be worse than having no memory at all.

Every piece of persistent knowledge creates the possibility that a future agent will rely on it. Therefore, information should earn its place in durable memory.

---

## 2. Memory Must Be Protected From Pollution

The system should aggressively avoid storing transient or low-value information.

Examples of things that generally should **not** become durable memory include:

- individual tool calls;
- routine web searches;
- temporary implementation steps;
- scratchpad reasoning;
- intermediate hypotheses that were later abandoned;
- conversational filler;
- every action performed by a sub-agent;
- low-level execution details that have no lasting relevance;
- procedural instructions that actually belong in a rule or skill.

For example, the fact that an agent used a particular tool to search for something is normally irrelevant.

What might matter is the durable conclusion that came out of the research.

The system should favor **signal over completeness**.

---

## 3. Finalized Knowledge Matters More Than the Path Taken to Reach It

The persistent knowledge system should generally capture the useful result of work rather than a transcript of the work itself.

The important question is not:

> What did the agent do?

The important questions are:

> What did we learn?

> What did we decide?

> What changed?

> What will a future agent need to know?

The path used to reach a conclusion can remain transient unless there is a specific reason that path itself has lasting value.

---

## 4. Specifications Are Authoritative; Memory Provides Context

The memory system and the specification system serve different purposes.

**Memory tells the agent what has happened, what has been learned, what context matters, and what decisions were made.**

**Specifications tell the agent how the system is intended to work.**

When a feature, workflow, architecture, behavior, or interface has been finalized, its authoritative definition should be persisted in the specification system rather than existing only as a memory.

Memory may reference or explain the history behind a specification, but it should not become a competing source of truth for finalized system behavior.

If memory and an active specification disagree, the system should recognize that conflict rather than blindly treating both as equally valid.

---

## 5. The Agent Must Know Who It Is Before It Starts Working

Every project should have a `soul.md`.

The soul file defines the identity and purpose of the agent within that project.

It should help answer questions such as:

- Who am I in this project?
- What am I here to accomplish?
- What responsibilities do I have?
- What kind of partner am I supposed to be?
- What principles should guide how I approach the work?

The soul is not ordinary project memory.

It is part of the agent's identity.

The operating system should ensure that the agent loads this identity as part of its normal startup behavior.

---

## 6. Use Existing Agent Mechanisms Before Inventing New Ones

The operating system should work **with** the native mechanisms already provided by agent environments rather than unnecessarily creating parallel systems.

For example:

- Codex already uses `AGENTS.md`.
- Claude environments may use `CLAUDE.md`.
- Those native instruction files can direct the agent to load `soul.md`, project rules, and the appropriate knowledge-system instructions.

If an existing mechanism reliably accomplishes a requirement, the default should be to use that mechanism.

New infrastructure should only be introduced when the native mechanism is insufficient for a meaningful reason.

The system should avoid complexity for complexity's sake.

---

## 7. Agent Startup Should Establish Identity, Operating Rules, and Knowledge Access

When an agent begins working in a project, it should not behave like a blank model dropped into an unfamiliar repository.

The project's native agent instruction mechanism should establish the startup contract.

That contract should ensure the agent understands, at minimum:

1. who it is and what its purpose is;
2. the rules it is expected to follow;
3. that the project has a persistent memory and specification system;
4. how to use those systems;
5. what tools or mechanisms are available for retrieving and maintaining project knowledge.

The exact implementation may differ across agent hosts.

The principle should remain the same.

---

## 8. The Agent Needs an Instruction Manual for the Knowledge System

An agent should not have to guess how the memory and specification systems work.

There should be an explicit operating protocol that teaches the agent things such as:

- when memory should be retrieved;
- when new memory should be created;
- what information belongs in memory;
- what information must stay out of memory;
- when information belongs in a specification instead;
- how memory should be organized;
- what metadata or attributes should accompany a memory;
- how related memories should be linked;
- how existing knowledge should be corrected;
- how stale knowledge should be retired;
- how superseding knowledge should be represented;
- how specifications should be discovered and updated;
- which tools are available to perform these actions.

The North Star does not need to define every one of those mechanics.

It does require that the finished system provide them.

---

## 9. Persistent Knowledge Must Have a Lifecycle

Knowledge changes.

The memory system must not assume that everything written once remains true forever.

The operating system should support a lifecycle for durable knowledge.

Depending on the situation, an item may need to be:

- created;
- updated;
- linked;
- superseded;
- retired;
- archived;
- or deleted.

Deletion should not always be the default when information becomes outdated.

Sometimes the fact that an old decision existed — and was later replaced — is itself important context.

In those situations, the system should be able to preserve the historical relationship:

> **Old knowledge → superseded by → new knowledge**

A future agent should be able to determine not only what is currently true, but when useful, how the project arrived there.

---

## 10. Knowledge Should Be Connected, Not Just Stored

The knowledge base should become increasingly useful as it grows.

Memories should be capable of linking to other relevant memories, specifications, decisions, concepts, work items, or project artifacts.

Backlinks or equivalent relationships should allow the agent to traverse related knowledge.

The result should feel less like a folder full of disconnected notes and more like an evolving project knowledge graph that an agent can navigate.

The system should still remain understandable and inspectable by a human.

---

## 11. Rules, Skills, and Memory Must Not Collapse Into One Another

Procedural knowledge should generally not be stored as project memory.

If the agent learns a repeatable way that it should behave, that information may belong in a rule.

If the agent discovers a reusable procedure or workflow, that information may belong in a skill.

If the agent learns a durable fact, decision, event, or piece of context, that information may belong in memory.

The operating system should help prevent these categories from being mixed together simply because they are all represented as files.

The storage medium does not define the meaning.

The role of the information does.

---

## 12. Agents May Discover New Skills, but Should Not Silently Rewrite Their Own Operating System

While working, an agent may recognize that a repeated or valuable procedure would be useful as a reusable skill.

That is desirable.

However, the agent should not automatically turn every successful procedure into permanent operating behavior.

Instead, the agent should be able to propose the skill to me.

For example:

> I just completed a process that appears reusable. I think this would be useful as a project skill. Would you like me to create it?

I should be able to approve or reject that proposal.

This allows the operating system to improve over time while keeping durable behavioral changes intentional and controlled.

---

## 13. Durable Changes to Agent Behavior Should Be Intentional

The operating system should distinguish between:

- learning information;
- learning how the project works;
- and changing how the agent itself behaves.

Those are different levels of change.

A new project fact may safely become memory.

A finalized system behavior may become a specification.

A new reusable procedure may become a skill.

A permanent behavioral constraint may become a rule or native agent instruction.

The closer a change gets to modifying how future agents operate, the more deliberate that change should be.

---

## 14. Human Control Should Remain Clear

The purpose of the system is not to create an opaque autonomous process that quietly rewrites its own worldview.

The system should make agent learning visible and understandable.

I should be able to inspect:

- what the agent remembers;
- why that information exists;
- what is currently authoritative;
- what has been superseded;
- what rules govern the agent;
- what skills it has;
- and what specifications define the project.

The operating system should improve agent autonomy without sacrificing human control.

---

## 15. The System Should Be Host-Aware but Not Host-Locked

The operating system may run across different coding-agent environments.

Different hosts may have different native instruction files, startup behavior, tools, context mechanisms, or capabilities.

The system should take advantage of those differences where useful, but its conceptual architecture should remain consistent.

For example, Codex and Claude may bootstrap differently, but both should ultimately arrive at the same understanding of:

- identity;
- project rules;
- available skills;
- persistent memory;
- authoritative specifications;
- and how to work with the knowledge system.

The operating system should adapt to the host without becoming conceptually fragmented by it.

---

# Information Placement Philosophy

When the agent encounters something potentially worth preserving, it should conceptually ask:

### Is this about who I am?
Put it in the **Soul**.

### Is this a durable instruction for how I must behave?
Put it in **Rules** or the appropriate native agent instruction mechanism.

### Is this a reusable procedure for accomplishing a type of task?
It may belong in a **Skill**, generally after approval.

### Is this a durable fact, decision, event, lesson, or piece of project context that may matter later?
It may belong in **Memory**.

### Is this an authoritative description of how the system or feature should work?
Put it in **Specifications**.

### Is this merely part of performing the current task?
Keep it **transient**.

This classification discipline is foundational to keeping the operating system healthy.

---

# What Success Looks Like

The system is successful when starting a new coding-agent session no longer feels like starting over.

A new agent should be able to enter the project and quickly understand:

- what project it is part of;
- who it is supposed to be;
- what the project is trying to accomplish;
- the important decisions and context accumulated so far;
- how the system is currently intended to work;
- the rules it must follow;
- the reusable skills available to it;
- where to retrieve additional knowledge;
- and how to responsibly contribute new knowledge back into the system.

Over time, the agent should become more useful because the project's knowledge compounds.

At the same time, the system should remain curated enough that old or irrelevant information does not distort future reasoning.

The ideal outcome is **continuity without context pollution**.

---

# What This System Is Not

This system is not intended to be:

- a permanent transcript of every agent interaction;
- a log of every command or tool call;
- an indiscriminate store of everything an agent ever observes;
- a replacement for authoritative specifications;
- a dumping ground for procedures that belong in skills;
- a hidden mechanism for agents to permanently change their own behavior without oversight;
- or an entirely new agent runtime built simply because existing mechanisms were not considered.

The goal is not maximum persistence.

The goal is **useful, trustworthy persistence**.

---

# The Decision Test

When making architectural or implementation decisions for this operating system, agents should continuously ask:

1. **Does this help future agents regain meaningful context without making me repeat myself?**
2. **Does this preserve the distinction between identity, rules, skills, memory, specs, and transient work?**
3. **Does this reduce or increase the risk of knowledge pollution?**
4. **Are we storing the durable conclusion, or merely the noise produced while reaching it?**
5. **Are we using an existing agent mechanism where one already solves the problem well?**
6. **Can stale or superseded knowledge be recognized rather than silently trusted forever?**
7. **Can a human understand and control what the system has learned?**
8. **Will this make the next agent session more capable without making it more confused?**

If the answer to those questions is yes, the design is probably moving toward the North Star.

If not, it should be reconsidered.

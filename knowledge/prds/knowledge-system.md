---
summary: What the project second brain must do. Every new session already knows what has been going on in this project. Saving something worth keeping takes one short yes from the owner.
area: knowledge-system
status: proposed
source: Owner requirements interview for GitHub issue #269, with clarification on parallel sessions, sustained guidance, and knowledge lookup on 2026-09-10. Replaces the earlier 2026-08 build-plan version
created_at: 2026-08-21
confirmed_at: 2026-09-10
tags: [knowledge-system, memory, prds, second-brain, schema, requirements]
approved_by: Mike Rihm
approval_date: 2026-09-07
project: claude-toolkit
work_item: "269"
---

# The project second brain

## Contents

- [Why this exists](#why-this-exists)
- [How the owner works](#how-the-owner-works)
- [Where it sits](#where-it-sits)
- [How to read this](#how-to-read-this)
- [A session, start to finish](#a-session-start-to-finish)
- [1. Plain parts only](#1-plain-parts-only)
- [2. The agent follows this system](#2-the-agent-follows-this-system)
- [3. Reliable behavior without reminders](#3-reliable-behavior-without-reminders)
- [4. Picks up where the last left off](#4-picks-up-where-the-last-left-off)
- [5. Check memory first](#5-check-memory-first)
- [6. Cite the source](#6-cite-the-source)
- [7. Speaks the project's language](#7-speaks-the-projects-language)
- [8. Read the real documentation first](#8-read-the-real-documentation-first)
- [9. Saving is frictionless](#9-saving-is-frictionless)
- [10. Approval before any write](#10-approval-before-any-write)
- [11. What counts as memory](#11-what-counts-as-memory)
- [12. What never counts](#12-what-never-counts)
- [13. Working memory](#13-working-memory)
- [14. Memory file shape](#14-memory-file-shape)
- [15. How the words are written](#15-how-the-words-are-written)
- [16. Requirements documents](#16-requirements-documents)
- [17. Procedures become skills](#17-procedures-become-skills)
- [18. Where information goes](#18-where-information-goes)
- [19. The find order](#19-the-find-order)
- [20. The save card](#20-the-save-card)
- [21. Indexes and the checker](#21-indexes-and-the-checker)
- [22. Keeping current truth clean](#22-keeping-current-truth-clean)
- [23. Learning what to save](#23-learning-what-to-save)
- [24. The six commands](#24-the-six-commands)
- [25. Codex](#25-codex)
- [26. Built the way Claude Code's documentation says](#26-built-the-way-claude-codes-documentation-says)
- [27. Installed once, turned on per project, and checked](#27-installed-once-turned-on-per-project-and-checked)
- [28. Pending memory inbox](#28-pending-memory-inbox)
- [Potential paths to explore](#potential-paths-to-explore)

## Why this exists

The owner should not have to remember the state of the project himself. The
agent remembers it for him.

- The agent knows more than the owner about what has been going on in this project.
- It gets smarter over time, because what it learns is written down and read back.
- Every new session feels like talking to the same agent, not a stranger who has to be caught up.
- It is the agent's lasting memory, tuned so the agent learns when something is worth keeping.
- The human user (owner) can modify or delete knowledge within the second brain system without involving the agent and the system will not break.

Two ways to fail, and both are bad. Remembering too little means the owner
explains the same thing again. Remembering carelessly is worse, because a later
agent believes something stale and acts on it.

## How the owner works

The owner routinely runs several parallel agent conversations in the integrated
terminals of one VS Code project or directory. Sessions may use different
models or harnesses. Much of the work is complex requirements gathering,
solution design, and reasoning. Context fills quickly; a session may have its
context condensed, be cleared, or be replaced while other sessions keep working.

The owner should never have to babysit knowledge upkeep: remind an agent to
look something up, tell it where information belongs, repeat the save rules,
or reconstruct what another session did. He approves lasting meaning and
proposed removals. The agent notices the need, finds the right instructions,
prepares the proposal, and completes authorized upkeep itself.

Loading all the instructions at startup and hoping they remain in the agent's
attention does not meet this requirement. The system must guide the agent at
the moment it needs to find, propose, write, update, or remove information.
The agent keeps its freedom to reason, investigate, and design within those
boundaries. Requirements 2, 13, 18, and 19 define this behavior.

## Where it sits

The toolkit ships a whole set of parts for working with an AI agent on a
project: rules, hooks, skills, the work tracker, and captured
outside documentation. The second brain is two of those parts. It is the memory,
and it is the record of the product's required behavior, user experience,
process requirements, and reasons, which is what a PRD holds. It keeps what
is true in this project and why. Anything else
belongs to another part, and the second brain does not keep it. A repeatable
procedure goes to a skill. A standing instruction goes to `.claude/rules/`,
written so that it loads only when it is needed. Live status goes to the work
tracker. How one item gets built and its build order belong in its solution
design and work-item plan, kept with or linked from the chosen tracker. Outside documentation
the agent can use goes to `ai-external-knowledge/`. Requirement 18 is the full
list.

This set of parts is a fixed workflow with the agent working inside it. The
moments are fixed by the system, not chosen by the agent. The agent uses its
judgment inside those fixed moments. It never uses its judgment to decide whether a fixed
moment happens at all. Example: the agent decides which information is worth proposing within the
selection rules. It still performs every required save review and obtains
approval when needed. Requirement 3 defines how reliability is demonstrated.

Judge every requirement below against that whole set of parts. If a requirement
moves work into the second brain that another part already owns, the requirement
is wrong.

## How to read this

- The status is `proposed`. This document describes the finished system. It does not describe how the system works today.
- It says what must happen, what the owner sees, and why. It never says which hook, file, or code does it. Those are build decisions and go on the work item, in the work tracker.
- This document holds the goal, the requirement, and the behavior. Each requirement is written clearly enough that a builder can design from it without guessing the intended behavior. The solution design may choose among different ways to meet the same requirement; the PRD does not make that implementation choice.
- When the owner gives a clear answer or correction within authorized refinement of this document, the agent writes it here in that same reply under requirement 10. It is never logged on an issue instead, because an issue comment gets lost and this document then never gets updated.
- Mike authorized ongoing refinement of this PRD and approved the drafting-permission rule in requirement 10 on 2026-09-10. That permission covers faithful capture of his answers and corrections; it does not approve every requirement, a solution design, or implementation.
- Requirement 3 defines the reliability outcomes and the evidence needed to demonstrate them. The solution design chooses how documented harness capabilities deliver those outcomes and identifies any limits.
- "A session, start to finish" follows one session through every requirement, so the numbered list is easier to follow.
- The closing section links to separate exploratory design notes. Those notes are not requirements or an approved solution design.
- Where this document and `knowledge/README.md` disagree, this document wins. Each disagreement is named in the place it happens, and `knowledge/README.md` is then changed to match this document.

## A session, start to finish

This walkthrough describes what the owner experiences and what must be
preserved. The numbered requirements define the checks and approval boundaries;
the solution design chooses the mechanisms that deliver them.

```mermaid
flowchart TD
    A[Owner opens or resumes a session] --> B[Agent finds current guidance and shared context]
    B --> C[Agent explains where work stands and the next step]
    C --> D[Owner asks a question or requests work]
    D --> E[Agent checks relevant knowledge and sources]
    E --> F[Work proceeds within existing approval]
    F --> G[Useful continuation context is kept current]
    G --> H[Save review at the required moment]
    H --> I{New approval needed?}
    I -- yes --> J[Owner sees the standard proposal]
    J --> K{Owner decision}
    K -- approve --> L[Approved save completed and verified]
    K -- unanswered --> M[Proposal retained in the inbox]
    K -- reject --> N[Proposal leaves the active inbox]
    I -- no --> O[Complete authorized saves or explain why none are needed]
    L --> P[Handoff identifies saved state and unfinished work]
    M --> P
    N --> P
    O --> P
    P --> A
```

**1. The owner opens or resumes a session**

- The first response gives a brief, accurate picture of relevant work and its next step. The owner does not have to reconstruct the previous conversation.
- The agent can reach the small knowledge map, current instructions, shared working context, pending inbox, and relevant indexes. Details are opened when needed, including after context is condensed or another session updates a record.
- Missing guidance or unavailable shared context is identified and recovered before work that depends on it proceeds. Requirements 2, 3, 4, 13, and 28 apply.

**2. The owner asks for something**

- The agent follows the find order, uses the project's terminology, and names the sources supporting its answer. It resolves unfamiliar terms from available context and evidence before asking the owner about remaining consequential ambiguity.
- It checks relevant captured outside documentation and, when needed, available session history. Historical findings are verified before being presented as current. Requirements 5 through 8 and 19 apply.

**3. Work happens**

- The agent reasons, investigates, or builds within the task's authorization, using applicable existing skills. It keeps the chosen work record current through that component's workflow.
- It preserves useful continuation context in `knowledge/current.md`, with links to detail and clear labels for unverified findings. Other sessions' useful context is preserved. Disposable scratch details stay out. Requirements 4, 13, 17, and 18 apply.

**4. Something worth keeping comes up**

- The agent identifies a meaningful candidate, checks whether it belongs in lasting knowledge, and uses the destination's rules. It reads relevant memory-selection lessons before proposing something the owner already rejected.
- When new approval is needed, the owner sees the standard card and can approve, edit, or reject it. Clear corrections within authorized PRD refinement are saved without asking again for the same permission.
- An unanswered card is retained automatically in the pending inbox. An approved save is completed and verified, or its failure and next step are reported. Requirements 9 through 12, 20 through 23, and 28 apply.

**5. A turn ends after real work**

- The required save review covers work since the previous review. The owner sees new proposals, the result of authorized saves, or a brief explanation that nothing new needs proposing and whether earlier proposals remain pending.
- Unchanged unanswered cards are not repeated. The current overview identifies the next step. Requirements 3 and 9 apply.

**6. Work is handed over or closed**

- Before opening a pull request or closing a work item, the agent completes the knowledge review for that work. A prior unrelated review or a single card does not satisfy it.
- The delivery workflow owns work status, completion evidence, and implementation approval. Knowledge changes follow their own approval, validation, and publication requirements. If required behavior changes, its PRD is updated within the owner's approval; it gains no build roadmap or progress log.
- An unfinished save and work that depends on it stay visibly unfinished. Unrelated authorized work may continue. Requirements 3, 9, 10, 16, and 18 apply.

**7. The session ends or context is cleared**

- At a known handoff or planned context clear, the agent performs the save review and identifies the shared state, unresolved proposals, and next steps. Useful context is maintained throughout the session so continuity does not rely solely on a final message.
- If sharing failed, the agent says what exists locally and what a later session cannot yet see. A later session recovers unfinished saves and pending proposals from the available shared records. Requirements 3, 4, 13, and 28 apply.

**8. Two days later**

- A new session finds the relevant saved context and current work records, checks their freshness, and continues without making the owner repeat settled decisions.
- It distinguishes verified information from pending proposals and unverified findings. The checks in requirements 3 and 4 demonstrate this behavior.

## 1. Plain parts only

- Every piece of knowledge this system keeps is a plain text file in this repository, and those files are the only copy. No database. No background writer. No separate store the owner cannot open.
- Built from what Claude Code already ships: rules, hooks, skills, Markdown files, and Git. Nothing else.
- Reuse existing toolkit parts and documented harness capabilities before adding a mechanism. Any new mechanism must name the requirement an existing part cannot meet. The knowledge system does not introduce another work tracker or a second owner of another component's content.
- The owner can read, edit, move, or delete any of these files by hand, with no agent involved, and the system still works.

**Check:** open any piece of knowledge in a text editor. Change it by hand.
Delete one. The system keeps working and later sessions read what the owner
left. Then list every part the system is built from. Each one is a rule file, a
hook, a skill, a Markdown file, or Git.

## 2. The agent follows this system

- In every session, the agent follows the knowledge system: when to save, what to save, how to save, where to save, what to check first, what to cite, and what never to write.
- Reading a rule is not enough. The agent has to actually do what the rule says, every time. Example: requirement 9 requires a save review at the end of meaningful work. The test is whether the right proposals, authorized saves, and pending state result, not merely whether the agent read the rule.
- It follows the system whether or not the owner mentions it. The owner never has to remind it.
- A small map is available at startup and whenever context is condensed, cleared, or resumed. It points to the current operating instructions, information homes, indexes, and the checks that apply. Detailed rules, templates, and knowledge are reached when needed; the whole knowledge base and every procedure are not loaded up front.
- Before a lookup, the agent establishes the applicable find order. Before proposing or making a knowledge change, it establishes the destination rules, exclusions, approval rules, file fields, template, and writing standard. It follows the current instructions for that operation even late in a long session. Already-read guidance can be reused while it remains available and current. Missing guidance is opened again before the affected operation proceeds.
- The same guidance applies when the owner changes tasks or another session changes the relevant records. A completed check for an earlier task does not establish that the new task's knowledge was checked.
- The system is responsible for bringing the needed guidance back at these moments. A one-time startup briefing or the owner repeating a rule is not sufficient. Which documented harness mechanism delivers that guidance and the requirement 3 checks is the design's job.
- The agent uses judgment to understand meaning, choose relevant sources, reject low-value candidates, and write a useful proposal. It cannot use that judgment to skip the system's required lookup, approval, validation, or upkeep moments.
- Following is demonstrated, not assumed. Requirement 3 defines the outcomes, verification scenarios, and handling of missed or incomplete operations.

**Check:** run a whole session without mentioning memory once. At every moment
this document names, the agent does what this document says. Any moment where it
did not is identified during verification and handled under requirement 3.

**Check:** run a long requirements or design conversation, condense its context,
then introduce a correction, a lasting decision, and a routine detail that must
not be saved. Without a reminder from the owner, the agent finds the current
guidance, routes each correctly, uses the standard proposal and file shape,
and waits for the required approval. Repeat after switching tasks and in a
fresh session on each supported harness. An initial briefing alone does not
pass this check.

## 3. Reliable behavior without reminders

The owner must be able to rely on knowledge upkeep throughout long and parallel
sessions. Reading instructions once is not enough. The system brings back the
needed guidance, checks the required conditions, and makes an unfinished or
failed operation visible without waiting for the owner to notice.

### Required outcomes

- Before answering or acting on project information, the agent checks the relevant knowledge under requirement 19. Relevant, current sources already available in context can satisfy that check. A check for an earlier task does not cover a different task automatically.
- An answer or proposal based on saved knowledge identifies its supporting source under requirement 6. This applies however the agent found or opened that source. A path attached to a search result alone does not establish that the answer is supported.
- The external-knowledge index is reachable from the small map. The agent opens relevant outside documentation before relying on it, as requirement 8 requires.
- A save review happens at every moment in requirement 9. Opening a pull request or closing a work item requires that review for the work being handed over. At the end of a turn involving real work, at handoff, or when asked to save, the agent shows the review result: new cards, the outcome of already-authorized saves, or a brief explanation of why nothing new needs proposing and whether earlier proposals remain pending. An existing inbox entry alone does not satisfy a new review.
- Lasting knowledge is changed only within the owner's approval. Proposals follow the standard format, and a proposal missing required information is corrected before requesting approval. A save is not reported complete until its content, required fields, indexes, and publication have been checked. Failed checks leave the save unfinished.
- When a required check or save was missed, the agent identifies the gap and performs the needed review or recovery within existing approval. It never claims the missing check happened or asks the owner to reconstruct the session for it.

### How reliability is demonstrated

The solution design identifies which conditions the supported harness can
check or prevent mechanically, which depend on the agent understanding meaning,
and how the latter are guided and verified. Use existing toolkit and documented
harness capabilities first. A custom gate, reply parser, single retrieval route,
or session counter is not required merely because it could be built.

The required outcomes remain mandatory. Any unsupported protection or remaining
reliance on agent judgment is stated in the design and project setup report,
with its practical effect and recovery behavior. Do not describe a reminder as
a guaranteed block, or claim that counts prove the right information was found
or saved. A reported limitation is not evidence that the requirement is met.

**Check:** run representative sessions on every supported harness: a fresh
session, a long reasoning conversation with context condensed, a task switch,
and parallel sessions changing shared knowledge. Include a known fact, a
correction needing approval, an already-approved save, a low-value detail that
must stay out, a failed save, and a handoff. Verify the resulting proposals,
source-backed answers, saved files, and recovered state against the expected
outcomes. The owner supplies no reminders. Record failures and gaps; reading a
rule, calling a tool, or increasing a counter alone does not pass the check.

### A failure pauses the affected work

When a knowledge save fails, pause that save and any work that depends on its
successful completion. Continue unrelated work that can be done accurately
within existing approval. One failed save does not stop the whole session.

The agent says what failed, what was actually saved, what remains unfinished,
which dependent work is waiting, and the next step. It fixes what it can within
existing approval and permissions. If it cannot finish, it reports the blocker
and never claims that the save or dependent work is complete. This applies to
validation and publication failures as well as a missing required approval.

**Check:** make a knowledge save fail while the session has one task that needs
the saved result and another that does not. The save and dependent task remain
unfinished; the agent reports the failure and continues the unrelated task.
Once the save succeeds, the dependent task can resume under its existing
approval.

## 4. Picks up where the last left off

- The owner comes back after two days, asks "what were we working on?", and the agent answers.
- The answer covers what is in progress, what happened last time, and which session handed off to which.
- The owner never pieces this together himself.
- So `knowledge/current.md` is kept up to date as work happens, across sessions, not only at the end of one.
- Updates to it are quick and short. The agent makes them on its own, without asking, and tells the owner in one line that it did. This file is not lasting memory, so a wrong line costs little and the owner can fix it by hand. A stale file costs a lot more.

**Check:** work in one session, close it, open a fresh session two days later and
ask "what were we working on?". The agent answers correctly without reading any
transcript.

## 5. Check memory first

- When the owner asks something, or the agent starts a task, the agent first checks whether this project already knows the answer, already solved it, or holds useful context.
- It brings that up without being asked.
- This check is required for both questions and tasks. Use relevant, current context already available rather than repeating a search solely to record another search. Requirement 3 defines reliability and verification.

**Check:** ask about something already saved. The agent answers from the saved
file and names it, instead of searching the code or asking the owner.

## 6. Cite the source

- Whenever the agent checks memory, a PRD, a saved session, or the outside documentation folder and finds something, it says what it found and, on the line right below, where it found it.
- What that line carries: the file path. For something found in a past session, the name and date of that session. For an outside documentation page, the path of the page and the date the page was captured.
- This covers an answer, a past fix, and any context the agent brings up.
- This happens every time. It is never optional, and never only when the owner asks.
- Why: the owner has to be able to see that the answer came from what this project actually knows, and go and check it himself.

**Check:** the agent says "the project already has this". The line right below
names the file it came from, and the owner can open that file and find it there.

## 7. Speaks the project's language

The system ships a glossary: one file, `knowledge/glossary.md`. It maps the
owner's words and the client's shorthand to the real thing, which may be a field
name, a system, a person, or a process.

- From the first message of every session, the agent uses the glossary's meanings without being told to. How it gets them is the builder's choice.
- When a term in the glossary is used, the agent applies it and does not ask.
- When a term is unfamiliar, first use the conversation, glossary, and relevant project sources to resolve it. Ask one focused question only when uncertainty remains that could change the answer or action. Propose a glossary entry when the mapping is useful recurring project shorthand, through the normal card and approval flow.
- The glossary is one Markdown table. Each row holds the term, what it means in plain words, the real thing it points at (a field name, a system, a person, a process), and where and when that was verified. Example: "Cap Level" means the field `MS_Capacity__c`, verified in the production org on a named date. Longer supporting detail is linked from its proper home under requirement 18; its length does not make it memory.
- Resolve project shorthand before tier 4 so searches use the intended names. Reuse a mapping already established and current; an unfamiliar word alone does not require a new glossary entry.
- The owner's example: he said "match on the discovery email field and the core email field", and the agent knew exactly which two fields those were, like a colleague who had been on the project for years.

**Check:** use a known term, then an unfamiliar term whose meaning is clear
from a project source. The agent resolves both without asking. Use a term with
two plausible meanings that change the action: it asks one focused question.
It proposes a glossary entry for a useful recurring mapping, not every new word.

## 8. Read the real documentation first

- `ai-external-knowledge/README.md` is a small index of captured outside knowledge. For each topic it gives its name, what it covers and when it is useful, a path to its entry page, the original source address, and the capture or refresh date. It points into the documentation instead of copying its contents.
- The project's small knowledge map points to this index. During lookup, the agent scans it to decide whether captured documentation is relevant. A current scan already in context can be reused; a changed topic list or lost context requires a fresh scan.
- Before running a repeatable process or working out a fix that depends on a captured topic, the agent opens the relevant page. Example: before changing a hook, it reads the captured Claude Code page about hooks instead of relying on what it already thinks it knows about hooks. Unrelated topics are not opened.
- One folder per topic. Each names its source address and the date it was captured.
- Adding, refreshing, moving, or removing a captured topic updates its index entry as part of the same upkeep. This index belongs to outside-documentation upkeep; it is separate from the two generated memory and PRD indexes in requirement 21.
- Captured documentation is outside source material, not approved project truth. The agent checks whether its date and version are suitable for the task. When a missing or outdated page matters, it checks the current original source when access allows, or states the gap. It never presents an old capture as verified current behavior.
- The agent judges which outside topics are relevant, then follows the required source checks before relying on them. Requirement 3 defines how this behavior is demonstrated.

**Check:** ask for something a captured topic covers without naming the folder.
The agent finds the topic through the index, opens the relevant page before
acting on its claims, and cites the page and capture date. An unrelated topic
is left unopened. Refresh or remove a topic and check that the index follows.
Repeat with an outdated capture: the answer identifies its age and checks the
original source or states what could not be verified.

## 9. Saving is frictionless

- A save needing new approval is one short card and one yes, whether it is a memory or a product requirements document. Clear answers and corrections within already-authorized PRD refinement are saved immediately under requirement 10, without another card and yes for the same instruction.
- No long review. No back and forth. No reading a full file before deciding.
- The agent proposes at the right moment on its own. The owner never has to remember to ask.
- Five moments force a save review: a work item finishes or closes, a pull request is being opened, a handoff or a context clear is coming, a turn ends after real work was done, and any time the owner says to save something. Requirement 3 defines the required result and how these moments are enforced.
- The other moments are the agent's own judgment. It should propose a save when useful: a real problem here has just been fixed, a commit is coming, or relevant context changed, such as a new person, a role change, a tool switch, a stale fact found, or a data-authority decision. A missed candidate is reviewed at the next required moment.
- The owner saying "remember this" starts the save flow that leads to a card. It is not permission to write, and it skips no step.
- The save review is that same flow run over everything the session did since the last one. It gathers candidates, drops any that fail requirements 11 and 12, checks for existing inbox proposals, and shows one card per new candidate needing approval. Already-authorized saves proceed under requirement 10. If there is nothing new to propose, say why and whether anything remains pending. Do not repeat an unchanged unanswered card at each review. Requirement 3 requires this review and its visible result.
- When approved, memory or PRDs are saved directly to the default branch and pushed!!! They are not lost in worktree branches or buried in something that a future agent would not easily find.
- A save is finished only when the file is on the default branch and pushed, and not before.
- An approved knowledge save is not deferred into a feature branch, pull request, or separate draft. This holds even when the session is doing its other work on a branch. The save still goes straight to the default branch. The session's own branch gets the saved file later, whenever someone merges or pulls the default branch into it. The pending inbox in requirement 28 preserves unanswered proposals and interrupted saves; it never replaces completing an approved save.
- One yes finishes the owner's part. He runs no Git command and does nothing else. The save then completes on its own, and the reply tells him it is done or tells him it failed. Whether the writing happens inside that reply or just after it is the design's job, so long as a failure is never silent.
- If the push fails, the agent says so in that same reply and the save is not finished. Requirement 3 sets what pauses and what can continue. Nothing is ever parked silently.
- Completed knowledge has one authoritative destination. Unfinished proposals have one known inbox, which agents maintain and recover automatically; the owner never has to remember where a proposal was left.

The existing `.claude/rules/knowledge-direct-commit.md` owns the procedure for
publishing authorized knowledge saves to the default branch. The inbox adds
recovery of pending proposals without creating another publication procedure.

**Check:** finish a piece of work. In that same reply the agent shows one card.
With a successful save, one word of approval writes the file, and before the
reply ends the file is on the default branch and pushed. Nothing else is asked
of the owner. If the save fails, the agent identifies the unfinished save and
follows requirement 3; it never claims that no save is waiting.

## 10. Approval before any write

- Nothing writes memory or a requirements document without the owner's yes. Not the agent, not anything the agent starts, not anything running on its own.
- Approval already given for drafting or refining a named PRD covers faithful capture of the owner's clear answers and corrections within that scope. Save those in the same reply without asking him to approve his own instruction again. The normal placement, validation, and publication requirements still apply.
- If the owner's words are ambiguous, clarify the meaning before changing the requirement. A new requirement the agent invents or recommends needs the owner's agreement before it becomes a requirement in the draft. Drafting permission does not approve that new meaning.
- A separate lasting-memory proposal still uses the standard card and approval, even when it arose during an authorized PRD interview. Drafting or saving permission does not approve the requirements as a whole, a solution design, or implementation. Requirement 16 defines what a PRD's approval fields mean.
- Record the drafting permission, who gave it, its source and date, and its scope in the existing canonical draft or linked work record. A later session reads that record and carries forward the same permission while it remains applicable. It does not ask again solely because the session or model changed, and it never expands the recorded scope.
- The same approval boundary covers changing lasting meaning and merging, superseding, retiring, or deleting lasting knowledge. The agent independently identifies and proposes the need; after approval it carries out the approved operation and its checks without making the owner manage the files.
- Silence is not approval. An unclear answer is not approval. Asking to see the full text is not approval.
- The owner may change the wording, the place, the tags, or drop the whole thing.
- When the owner edits the words, those words are written exactly as typed. The agent does not tidy them, shorten them, or improve them.
- Only the approved meaning is written. Not the surrounding context, not an improved version, not one extra sentence that seemed useful.
- The `Unsure` line on the card is approved on its own. The owner can approve the text to be saved and still reject what is on the `Unsure` line. When he does, that unsure part is dropped and never written to the file. Requirement 20 says what the `Unsure` line holds.
- Five things can be done without asking the owner: rebuilding an index, repairing a broken link, writing `knowledge/current.md`, appending a line to `knowledge/memory-self-improvement.md`, and maintaining the pending inbox under requirement 28. None of them changes what a lasting file means. Requirement 4 says how the current file is updated. Inbox retention is permission to preserve a proposal, not permission to accept its meaning.
- There is one exception, for files the owner already approved when this project used an older folder layout. The agent converts those files first and shows the owner the converted results afterwards, in groups small enough to read in one pass. The owner approves after the conversion, not before. Any file that will not convert cleanly is named and left alone. The agent never guesses what an old file meant.

**Check:** show a proposal and say nothing back. The exact proposal is retained
in the pending inbox, marked awaiting approval. Its destination is unchanged,
and a later session never treats the pending text as an approved fact.

**Check:** authorize refinement of a named PRD, then give a clear correction.
The correction is saved in that reply without a new approval question. Start
a fresh session: it finds the recorded permission and handles another in-scope
correction the same way. Give an ambiguous answer: it asks for clarification.
Let the agent recommend a new requirement or identify a separate memory: it
seeks the appropriate approval. None of these steps starts implementation or
marks the full requirements approved.

## 11. What counts as memory

Something is memory when all three are true:

1. It is about this project and useful to it, as `knowledge/project.md` describes the project.
2. It is significant. It is a lasting fact, a decision, a constraint, or a real lesson about how something here works or how a real problem here was fixed. The test is time: without it, the next agent would lose real time working the same thing out again. The words in the memory itself must be about this project.
3. The human user (owner) was part of it. He said it, decided it, or worked it out with the agent.

There is one carve-out. A real, significant problem in this project that the agent found and fixed alone may be proposed as memory, even though the owner was not part of working it out. Nothing else skips point 3. A routine thing the agent did alone still fails point 2, so it is never proposed.

How a real failure here was fixed is memory, not a rule. The memory says what
broke, what caused it, and what fixed it. Writing one rule per fix would put
hundreds of one-off entries in the rules folder. The standing instructions the
rules folder exists for would then be much harder to find.

**One kind of memory has its own name: a significant episode.** It is a piece
of work that produced a result the project will look up again later.

- Its memory says what was done, what came out of it, and where the output lives, in a few sentences, with `type: event`.
- The card for it appears at the end of the task on its own. The owner never asks for it, and one yes writes it.
- The owner's example: an exercise matching two spreadsheets against the contacts in the system, and what the match found.
- Not an episode: routine edits, or a task with no result anyone will look up again.

**This changes the manual.** `knowledge/README.md` today says memory must come
from the owner, or from the owner and agent together. The addition above lets
the agent propose a fix it found alone. The manual is changed to match.

**Check:** finish a piece of work with a real result. The card appears in the
same reply, and nobody asked for it.

**Check:** give the agent two candidates. The owner says "the client moved the
demo to Thursday". That passes all three points and a card is proposed. The
agent, working alone, updated a Python package so a browser would open. That
fails point 2, so the carve-out never reaches it, and no card is ever proposed
for it.

## 12. What never counts

- Small things the agent did alone while doing a task, with no human in it. The owner's example: asked to open Amazon in a browser, the agent had to update a Python package to get there. That is not memory.
- Commands run, tool calls, searches, web lookups, agent behavior, and shell behavior. One exception: a trap in this project's own tools or setup that cost real time, once found and fixed, is a real fix, and requirement 11 makes that memory. Example: the Salesforce command line fails under Bash in this project, so run it from PowerShell. The three-point test still applies, so a one-off hiccup with no lesson in it is never saved.
- Raw error text and scratch thinking. The lesson from a significant fix is memory. The raw error is not.
- Ideas that were tried and dropped. One exception: an idea that was acted on and later found wrong is memory, when the wrong answer had already spread into other files. Example: a test in August said an idea failed, three documents copied that, and the test was found wrong in late August. The memory says the conclusion was withdrawn and why, so no later agent finds a copy and acts on it.
- A step by step record of files opened and edits made, and everything a helper agent did.
- Copies of code, or anything an agent could work out by reading the source or the live system. Example: a write-up of how the sharing model works today, when the org itself shows it. If a project keeps research like that, it keeps it in its own reference folder outside the second brain. Memory holds only the decision or the trap that came out of the research.
- A repeatable procedure. That is a skill. One past fix is not a procedure.
- An open task, an implementation step, or the live status of work in flight. Those belong to the work tracker. Example: a manual step still owed in production is a ticket, never a memory. If no ticket exists, make one.
- A "read this first" pointer for a piece of work. The work item carries its own entry point, and `knowledge/current.md` carries the active ones.
- The story behind a standing instruction. The rule file may say in one line why it exists. Nothing else about its history is kept.
- Anything stale or contradicted with no historical value.
- Passwords, keys, and tokens, ever. The `knowledge/` folder is in Git. Git keeps a copy of every past version of every file, so deleting the secret later does not remove it.

**Check:** run this list against a session's candidates. Anything that matches a
bullet on this list is dropped before a card is written, and the agent says in
one line which bullet dropped it.

## 13. Working memory

One file, `knowledge/current.md`. It is the shared overview across agent
conversations in this project and answers "what is happening right now".

What it holds:

- The current objective, in one or two sentences.
- Which work item it belongs to, and what is blocking it.
- The exact next step.
- Useful short-term findings that have not been saved as memory, clearly marked when unverified. Actual pending save proposals live in `knowledge/memory-inbox.md`; this overview links there instead of copying their text.
- Dates on entries, so a later agent can tell when a line is out of date.
- !!!!The information should be cross-ai-agent sessions. The purpose of the working memory is so that the human user can pickup or start any ai agent session with a brand new agent and it (the agent) has a crystal clear picture on what the current goals, next milestones, roadmaps, tasks, etc. are. Utilize paths to persisted/more detailed information in the current memory if necessary. Don't simply duplicate details stated in work items, memories etc. The point is the consolidate all working sessions into one clear picture so agents know how to orchestrate sessions and guide the user to their goals.!!!!
- In short: this file gives a brand new agent the whole current picture in one read. It holds the goals, the milestones, and the next steps. For detail, it gives the path to the work item, the memory, or the PRD that holds it, instead of copying that detail here.

What it never holds:

- A lasting fact. Nothing in this file is trusted as a lasting fact after the work is finished. Lasting facts go through the normal save into `knowledge/memory/`.
- A log of what happened. It is overwritten, never appended.
- A work item's requirements. Those belong to the tracker.
- Secrets.

How it behaves:

- Read at the start of every session.
- It distinguishes the project's overall objective from each active work item's next step and owning session when known. Detailed scope, progress, and approvals remain in the chosen tracker, linked from this overview.
- Rewritten as work happens: a piece of the work finishes, which the agent judges, something blocks, a handoff is coming, a session closes.
- Before replacing shared context, reread it and reconcile changes made by other sessions or the owner. Preserve other active items and their useful context. Rewriting the overview never means replacing the whole project's picture with only this session's task.
- Before relying on an entry, check its dated state against the linked authoritative record when available. A session name does not prove that session is still running. Unverified findings are labelled as such and never presented as approved lasting knowledge.
- Updated context must be available to the next project session, including one using another harness or worktree. If sharing the update fails, identify the saved location and the gap. Never claim another session can see a change that remains only in this conversation or an isolated checkout.
- Kept short. Long entries make it useless.
- Anything in it that turns out to be lasting goes through the normal save. Sitting in this file is never on its own a reason to make it long-term memory.

**Check:** open the file after a working session. It says the objective, the
next step, and either the blocker or that there is no blocker. Nothing in it is
a record of what happened.

**Check:** two parallel terminal sessions work on different items and both
update the overview. A third, fresh session can identify both items and their
next steps without reading either conversation. Neither update erased the
other's context. Change one item's tracker state and confirm a later briefing
uses that state instead of repeating the older overview.

## 14. Memory file shape

- Flat under `knowledge/memory/`. No subfolders at all.
- One topic per file. The filename is the topic in plain words: lowercase, hyphens between words, ending in `.md`. Not a date, not a code, not a ticket number.
- Flat on purpose. One note is usually a fact, a decision, and a piece of history at once, so sorting into folders by type makes every save start with a question that has no right answer.
- Each file starts with a settings block. The block sits between two lines that hold only `---`, and it is written in real YAML. This document calls that block the frontmatter.

Required on every memory file:

| Field | What it is | Allowed values |
| --- | --- | --- |
| `summary` | The headline fact in one short line, so the index helps the agent choose which source to open. Under 200 characters, which is about 30 words. The index shows this line. | Free text, one line |
| `group` | The topic heading this file sits under in the index. A few plain words, reused across files on the same topic. | Free text, a few words |
| `type` | What kind of thing it mostly is. Does not decide where the file sits. | `fact`, `decision`, `event`, `context`, `constraint` |
| `status` | Whether it answers questions about what is true now. | `current`, `superseded`, `retired` |
| `source` | Where it came from and where to go check it: a file path, a commit, a link, or the name of the person who said it. | Free text |
| `confidence` | How the agent knows. | `observed`, `reported`, `inferred` |
| `created_at` | The date the file was first written. Never changes. | `YYYY-MM-DD` |
| `updated_at` | The date its content or status last changed. Creation sets it too. This is not proof that its facts were rechecked. | `YYYY-MM-DD` |
| `tags` | How a topic is found across many files. Free-form, no fixed list, as many as needed. | YAML list of strings |
| `approved_by` | Who approved it. | A person's name |
| `approval_date` | When they approved it. Never empty. | `YYYY-MM-DD` |

What `confidence` means: `observed` is the agent checked it directly. `reported`
is someone said it. `inferred` is the agent worked it out. Inferred stays
inferred until somebody checks it.

Optional fields, written only when they apply and left out otherwise:

| Field | What it holds | When it is written |
| --- | --- | --- |
| `confirmed_at` | The date the file was last re-checked and found still true. | On every update that confirms the file. |
| `source_quote` | The exact words the fact came from. | When the wording itself matters, such as a client's own phrasing. |
| `effective_from` | The date the fact started to apply. | When a fact has a known start date. |
| `effective_to` | The date the fact stopped applying. | When a fact has a known end date. Not a substitute for `status`. |
| `project` | The project name. | When the file could be read outside its project. |
| `work_item` | The work item that produced the file. | When one work item did. |
| `supersedes` | The path of the file this one replaces. | Only in the supersede step of requirement 22, together with `superseded_by` on the old file. |
| `superseded_by` | The path of the file that replaced this one. | Only in that same step, on the old file. Its `status` becomes `superseded` at the same time. |
| `related_memories` | Paths of other memory files on the same topic. | When a link helps a reader. Write the link on both files, so each one points at the other. |

All dates are `YYYY-MM-DD`. All paths are relative to the project root.

Below the frontmatter comes a title in plain words. Under the title comes what
is true. Write it so someone reading it a year from now understands it without
having seen the conversation that produced it.

Links in the body are plain relative file paths. There is no list of what links
to what. To find the files that point at a file, search the project for that
file's name.

**Check:** write one memory file. Every required field is present and holds an
allowed value, and the checker passes.

## 15. How the words are written

This applies to every memory file, every PRD, and every card. The reader is a
stranger: an agent with no context, or the owner a year from now. He is not
technical.

- Plain, clear, everyday words. No AI jargon, no toolkit vocabulary the reader was never given, no figures of speech, no idioms.
- As short as it can be without dropping anything a future agent needs. Every sentence has to be needed. If removing it loses nothing, remove it.
- Accuracy before completeness. One wrong sentence makes the whole file untrustworthy, because a later agent acts on it. Anything not checked goes in the card's Unsure line or is left out. A guess is never written as a fact.
- Concrete, not abstract: the real name, the real value, the real path, the real date. Write the full date, never "last week". Name the system or the organization every time. When something was left undone, say so.
- Nothing that points at a conversation the reader cannot see. No "as discussed", no "per our call".

What a memory's body holds, in this order, and nothing else:

1. The fact, decision, or lesson itself, in one or two sentences.
2. Why it is so, in enough words that a later agent can tell whether it still applies.
3. What to do differently because of it, when there is something.
4. Where the detail lives, as a path or a link, instead of the detail itself.

When the memory settles a question that was open, it says so and names what
proved it, so no later agent works the same thing out again. Example: "Settled
2026-07-02: manual account edits are reverted every morning; proven three times."

A memory file stays under 5,000 characters. If it grows beyond that limit,
remove repetition, summarize faithfully, split distinct topics into appropriate
memories, or link to supporting detail in its proper home under requirement 18.
Preserve the source and approved meaning. Length alone never turns a fact into
a PRD requirement, a procedure, or a work item. Lasting changes still follow
the approval rules; a failed size check never permits silently dropping meaning.

Before writing, the agent answers three questions. What is the one thing a
future agent must know? What would that agent get wrong without it? What is the
shortest wording that still says it? The card shows the answer to the third
question, never a first draft. Accuracy comes first. Being short and clear
comes second. Neither one is a reason to drop something a future agent needs.

A PRD shares the plain-language, accuracy, and concise-writing standards above.
Its structure and fields follow requirement 16; the memory-only body template
and memory size limit do not apply. It describes system behavior and the user
experience, with requirements whose outcomes can be checked.

**Check:** hand a memory to someone who was not in the conversation. In one
read they can say what is true, why, and what to do about it, and nothing makes
them ask what a word meant. Then remove any one sentence from the file. Each
time, something a future agent needs is now missing. If removing a sentence
loses nothing, that sentence should not have been in the file.

## 16. Requirements documents

A product requirements document, PRD for short, is one document per feature
area, kept in `knowledge/prds/`. A big feature area may be a folder instead of
one file, with a parent PRD and child PRDs inside it.

- Same file for its whole life. The filename is the feature area in plain words, same naming rules as a memory file.
- A feature area may be a folder: `knowledge/prds/<area>/<area>.md` is the parent PRD, and every other file in that folder is a child PRD. A child covers one sub-part of the area with its own numbered requirements, its own status, and the same fields as any PRD. The parent holds the goal, the requirements that span the whole area, and a contents list naming each child. Example: `knowledge/prds/knowledge-system/knowledge-system.md` is the parent, and `knowledge/prds/knowledge-system/indexes-and-checker.md` is a child holding the requirements for the two indexes and the checker.
- A small feature area stays one file at the top of `knowledge/prds/`. Nothing forces a folder.
- A child never repeats a requirement the parent already states. It refers to the parent by requirement number. When the two disagree, the parent wins and the disagreement is said out loud.
- It opens as `proposed`, which is what we want built. It is edited to `finalized` once the work delivering its requirements is verified complete in the tracker and the document accurately describes the delivered behavior. A small PRD follows the same rule. Build progress, delivery dates, and completion evidence stay in the tracker; the PRD does not maintain a second progress record.
- When answering how something works today, the agent uses current evidence. It does not treat a proposed requirement as proof that the behavior exists. A document's status alone, including `finalized`, does not establish what is true now. Requirement 19 governs source checks.
- When a memory and a PRD disagree, the agent names both sources and distinguishes required behavior from evidence of existing behavior. A finalized PRD remains the reference for required behavior; a proposal does not replace verified facts merely by describing a desired change.
- When a project also has a System Guide at `knowledge/system/`, the order is: a finalized PRD wins on what the system should do, the System Guide wins on how the system is put together, and the live system wins on what exists right now. Memory never beats any of those three. The agent reports the disagreement instead of quietly picking. The System Guide is not part of the second brain; it is its own plugin with its own PRD.
- `superseded` and `retired` are history.
- This folder used to be called `knowledge/specs/`, and older sessions call these files specs.
- A PRD describes what the system does or should do, its behavior, the end user's experience, process requirements, constraints, and observable completion expectations. It states these in plain language and distinguishes intended behavior from verified existing behavior. It does not reproduce code or prescribe the build plan.
- Build order, delivery roadmaps, implementation tasks, schedules, work-item status, and solution designs do not belong in a PRD. Required runtime sequences do belong: for example, approval must precede a lasting-memory write. That describes how the product behaves, not which part to build first.
- When a work item finishes, check whether it changed how any area is meant to behave. If it did, update that area's PRD within requirement 10's approval rules. Reordering delivery alone never changes the product requirements.

**A PRD is usually big.** Most of the time it describes a large feature, too
much for one work item to deliver. A small PRD that one work item delivers is
allowed, and it is the exception.

- When a PRD is too big for one work item, it is broken down into smaller work items in the work tracker. Each work item points back to the PRD and names the numbered requirements it delivers. That is why the requirements are numbered.
- The solution design and work-item plan own how the work gets built, its roadmap, and build order. They live with the work item or in the project's designated design document linked from that item. The chosen tracker owns current delivery status, dependencies, blockers, and next actions. Use the existing delivery workflow; the knowledge system creates no second planner or tracker.
- A PRD may link to the relevant work item or delivery plan so the agent can find it. It does not copy that plan, build order, or status. Each work item names the PRD requirements it delivers, preserving the connection between requirements and implementation.
- Agents keep each record current in its own home when the work changes, within existing approval. A work item being created, reordered, or split updates the delivery records. A change to required behavior updates the PRD. The owner never has to direct the filing or keep these records aligned by hand.

The owner confirmed this boundary during the PRD interview on 2026-09-10:
PRDs describe the system and its required behavior; delivery roadmaps belong
in the solution design and work-item plan.

**Check:** open a PRD that more than one work item delivers. Its links lead to
the delivery records, and the work items name the requirements they cover.
Ask to build search before the inbox: the delivery plan changes, and the PRD
gains no roadmap, tasks, or progress entries. Change the required search
behavior: the PRD captures that approved meaning. A fresh session finds both
the required behavior and current delivery plan without the owner directing
it to the right files.

Required fields: `summary`, `group`, `area`, `status`, `source`, `created_at`,
`updated_at`, and `tags`. They follow the memory field meanings except for
approval: on a PRD, `approved_by` and `approval_date` record approval of its
requirements, not permission to write or save the draft. An unapproved
`proposed` PRD omits both. Once requirements are approved, both are required,
even while the PRD remains proposed. Every other PRD status requires both.
If either approval field is supplied, both must be nonblank strings, and the
approval date must be a real `YYYY-MM-DD` date. Do not invent approval metadata.
Memory approval remains required.

This approval-format clarification was approved and built on 2026-09-10 in
[issue 311](https://github.com/Mar5929/claude-toolkit/issues/311) and
[PR 312](https://github.com/Mar5929/claude-toolkit/pull/312). It does not mark
the rest of this proposed knowledge system as built.

**Approval check:** save an authorized unapproved draft without either field;
validation passes without claiming requirements approval. Add only one field,
an empty pair, or an invalid date; validation fails. Existing approved PRDs
and memories still pass with complete valid approval records.

A PRD's `status` is `proposed`, `finalized`, `superseded`, or `retired`. A PRD
never uses the word `current`. The word for a built PRD is `finalized`. `area`
names the feature area and normally matches the filename.

Optional fields: `confirmed_at`, `source_quote`, `effective_from`,
`effective_to`, `project`, `work_item`, `supersedes`, `superseded_by`,
with the same meanings and rules as the memory file table.

Two fields are never on a PRD. `confidence` is left out, because a PRD states
what should happen, rather than how certain a fact is. `type` is left out,
because every file in the folder is the same kind of thing.

`proposed` and `finalized` are statuses only a PRD may carry. No memory file ever
has them. A memory that is still true is `current`.

**Check:** a proposed requirement says customers should receive an email after
checkout. Ask whether those emails are being sent today. The agent checks
current evidence rather than treating the requirement as proof. If it cannot
verify the behavior, it says so. A finalized label alone does not skip this check.

## 17. Procedures become skills

- When the agent works out a repeatable way to do something here, that is a skill, not a memory file.
- It becomes a project skill at `.claude/skills/<name>/SKILL.md`. A skill in that folder is used in this project and nowhere else. It is not copied to other projects. Whether a procedure is worth sharing with other projects is not this system's job.
- The agent proposes it through the same one card, one yes flow used for a save.
- A procedure must never be saved as a memory file. A memory file is read back later as a fact about the project, so a procedure stored there gets followed as an instruction that nobody approved as an instruction. Example: an agent saves "we deploy by running the build script twice" as a memory. A later agent reads that line as a rule and runs the script twice, even after the real procedure changed.
- The traps and gotchas that go with a procedure live in that skill, next to the steps, not in memory. Example: the five ways a field-change search gives a confidently wrong answer sit in the skill that does the search.

**Check:** teach the agent a repeatable way of doing something here. It offers a
project skill at that path, not a memory file.

## 18. Where information goes

Before the agent writes anything, it works out which home in the table below
the information belongs in, and names that home in the card. The wrong
home does real harm. Example: a repeatable procedure saved as a memory file
comes back later as a fact and gets followed as an instruction, which is what
requirement 17 forbids.

For the chosen destination, the agent follows its current content rules,
exclusions, fields, template, approval boundary, and update or removal process.
These have one authoritative home in that component's guidance, reached through
the small knowledge map. A future agent must be able to find them without the
owner explaining the folder structure. The second brain points to the System
Guide's own rules when it is enabled; it does not invent a competing template
or maintain that guide as another PRD.

The agent checks both what belongs and what must stay out before proposing a
save. A correct folder and valid fields do not make unsupported content safe.
Keep the approved meaning, its source, relevant dates, and current or historical
status clear. Exclude unrelated details, unsupported conclusions, duplicate
explanations, and transient reasoning that could mislead a future reader.
Requirement 15 owns the plain-language writing standard. The owner approves
lasting meaning through the standardized proposal, not by managing files.

| The question | Where it goes |
| --- | --- |
| Who the agent is in this project | `SOUL.md` |
| A standing instruction for how the agent behaves | The project's root instructions, such as `CLAUDE.md` or `AGENTS.md`, and applicable rules in `.claude/rules/` or the harness equivalent |
| Where this project keeps its things: the real systems it uses, their names and IDs, and the folders and paths that matter | `knowledge/project.md` |
| How a part of the system is put together, and what it is for: its objects, fields, processes, sub-applications, and what links to what | The System Guide at `knowledge/system/`, when the project has one. It is a separate toolkit plugin the owner turns on per project, with its own PRD. Memory keeps only the decision or the trap, and links to the System Guide page. |
| A repeatable procedure | A project skill at `.claude/skills/<name>/SKILL.md` |
| What we want built, and later the behavior we actually got | `knowledge/prds/` |
| A lasting fact, decision, event, context, or constraint | `knowledge/memory/` |
| The current objective, blocker, and next step | `knowledge/current.md` |
| An unanswered save proposal or an approved save that has not finished | `knowledge/memory-inbox.md`, temporary pending state under requirement 28 |
| A word the owner or the client uses for something | `knowledge/glossary.md` |
| What this owner accepts and rejects as memory | `knowledge/memory-self-improvement.md` |
| Requirements and status for one piece of work | The work tracker |
| Build order and delivery roadmap | The solution design and work-item plan, kept with or linked from the chosen tracker |
| Which PRD requirements a work item delivers | The work item, referring to the PRD's numbered requirements |
| How one work item gets built | Its solution design, kept with or linked from the work item |
| Documentation from outside this project | `ai-external-knowledge/`, one folder per topic, each naming its source address and capture date |
| Unchecked exploration and raw brain dumps | `knowledge/brainstorms/` |
| Useful temporary context another session needs to continue | `knowledge/current.md`, with links to detail in the authoritative work record and clear labels for unverified findings |
| Disposable scratch details with no continuation value | Conversation only |
| A past conversation | Session history |

Four homes are easy to mix up. Test each piece of information on its own, and split a note that holds several kinds.

| Ask this | Home | Example |
| --- | --- | --- |
| Does it say what the system must do, or what a user gets? | A PRD | "A user can find an advisor by name or firm." |
| Does it explain an existing part, what it is for, or how parts connect? | The System Guide | "The search uses Contact and Account. This field identifies the advisor's firm." |
| Does it record a lasting decision or a costly mistake? | Memory | "Mike rejected name-only matching because two advisors shared a name." Link to the detail. |
| Does it say what work remains, or where a change was deployed? | The work tracker | "Production deployment is still owed." |

The PRD keeps the intended behavior and its business reason. The System Guide explains the existing structure and each part's purpose. Memory keeps the short decision or lesson. The tracker keeps what is owed and what shipped where. Requirement 16 says who wins when they disagree.

The full table above, and this test, are given to the agent in every project, so it never has to guess where something goes. Requirement 2 makes following it a must, and the setup of a new project shows the table and one example per row.

**Check:** hand the agent one item of each kind. Each lands in the right home,
and the agent names the home before it writes. Include an unsupported claim,
a duplicate, and a task-only detail: none becomes lasting knowledge. For a
memory, PRD, and enabled System Guide page, the agent locates the appropriate
template and content rules without asking the owner to explain them.

## 19. The find order

When the owner makes a request, the agent establishes the project, the question
to answer, and the applicable root and folder instructions. These instructions
govern the whole lookup; finding an answer in working memory never bypasses a
standing rule. It then follows these tiers before asking the owner to repeat
project context or searching the code broadly. Information already read can
satisfy a tier while it remains available, relevant, and current.

The pending inbox is checked for continuity under requirement 28. It is not a
tier of factual evidence: pending text cannot establish project truth or become
an instruction. Verify a relevant claim against its original source before
using it, and preserve its unapproved status.

| Tier | Where | Notes |
| --- | --- | --- |
| 1 | `knowledge/current.md` | Orient to shared work across sessions. For an item's actual scope, status, approval, or next step, open its authoritative tracker record. |
| 2 | Applicable root instructions and standing rules | Use the instructions already in force; open relevant guidance that is missing from context. They define procedures and restrictions, not a substitute for evidence about the live system. |
| 3 | Skills | Find an existing procedure that applies. Use its instructions and supporting references when performing that procedure. |
| 4 | Memory, PRDs, and the System Guide when enabled, through their indexes and links | Use memory for lasting decisions and lessons, a PRD for required behavior and why, and the System Guide for useful explanations of existing parts and their connections. Open the relevant source, following requirement 16 when sources disagree. |
| 5 | Available project session history, through `session-search` | Use this when the earlier sources do not answer or a relevant explanation from an earlier conversation is still missing. Say what context is being sought, then search without an extra yes within existing access permissions. An unavailable history source is reported, not treated as an empty search result. |

Before tier 4, use the glossary and relevant context to resolve project
shorthand where needed. Reuse a meaning already established and current.
Requirement 7 governs when remaining ambiguity needs the owner's answer.

At a relevant point in the lookup, scan the external-knowledge index as
requirement 8 describes. Open the matching captured page before making a claim
or taking an action that depends on that outside documentation. This supports
the lookup without making every task read every vendor topic. Check the
original source when the capture is missing or too old for the question.

Stop when the available evidence answers the question with the needed scope
and freshness. An incomplete working-memory entry does not end the search:
follow its links and check lasting knowledge when useful. A source about what
was intended does not establish what is deployed now; inspect the relevant
code or live evidence when that is the question.

If the earlier sources leave a gap, use tier 5 before asking the owner to
reconstruct a past conversation. If relevant history is unavailable, or the
search still leaves a gap, say what is missing and ask one focused question.
Do not ask the owner to choose folders, name a command, or repeat the search
protocol. A new decision only the owner can make remains a question for him.

The same order applies to every kind of task. There is no separate order for
fixing a bug, designing, or resuming work.

- Always name where the answer was found, in the shape requirement 6 sets.
- An index line is only a pointer to a file. Never answer from the index line alone. Open the file it points at and read it before using what it says.
- Answer what is true now from relevant, current evidence. Memory, PRDs, and historical records can point to useful sources, but a status label or proposed requirement alone does not prove existing behavior. Check the supporting evidence, name disagreements, and state what remains unverified. Reuse evidence already read while it remains relevant and current.
- When tier 4 finds nothing, say so plainly and name what was searched. Never invent a believable answer, and never hand back something recent but unrelated.
- A tier 5 finding is identified as historical, with its source and date. Before relying on it as current, verify it against relevant project records or direct evidence. Ask the owner only when material uncertainty remains that available sources cannot resolve. If verification is unavailable, state that limit. Being found in history is never by itself a reason to save something; lasting candidates still pass the normal selection and approval steps.

Outside documentation supports the relevant tier; it does not replace the
project's decisions or instructions. Requirement 8 owns its index and upkeep.

**Check:** ask about active work, a past decision, required product behavior,
an existing system interaction, and a vendor capability. Without naming a
command, the owner gets an answer grounded in the appropriate source. Ask for
an explanation missing from project records but present in an earlier session:
the agent identifies the historical source and date, verifies relevant claims
against available evidence, and asks only about remaining material uncertainty.
Ask something none of the available sources answers: it names the gap and asks one
focused question. Repeat with history unavailable and confirm it reports that
limitation instead of pretending a search found nothing.

## 20. The save card

Every save proposal, in every project, uses one shape. Same parts, same order,
same labels, so the tenth card reads the same way as the first.

- A bold headline. One plain sentence saying what gets saved. Not a file path and not a short tag-like phrase. Good: "The client moved the demo to Thursday." Bad: `knowledge/memory/demo-date.md`. Bad: "Demo date change".
- Then an arrow, the character →, and one of four phrases: `New memory file`, `Memory, edit to an existing file`, `New PRD file`, `PRD, edit to an existing file`.
- Those four phrases identify memory and PRD writes. For a removal or status change, the arrow names the destination and actual operation, such as `Memory, retire an existing file` or `Memory, delete an existing file`. The quote identifies the meaning being removed or taken out of current use. A glossary, standing-instruction, or skill proposal names its actual destination and operation in the same position, retaining the same headline, quote, and five bullets. It follows that destination's own approval and delivery rules. A System Guide proposal follows that component's standard. Routing another kind of information never silently extends the knowledge-only Git exception to it.
- A block quote holding the exact text that would land in the file. Three sentences at most. Not the full file text.
- Five bullets on consecutive lines, in this order: `Why`, `Where`, `From`, `Unsure`, `Checked`.

What each bullet carries:

- `Why`: what a later session gets out of this. Not a restatement of the quote.
- `Where`: the exact path, whether the file is new or an edit, and the tags.
- `From`: who it came from and how sure. You said it, we worked it out together, or I worked it out.
- `Unsure`: anything unchecked, or the single word "nothing". Never left out and never softened into silence.
- `Checked`: the files the agent opened to confirm this is not already written down. It appears on the card itself, at the same time as everything else. The owner can then see whether the agent really looked before he answers.

How it is shown:

- Rendered Markdown, never inside a code fence. The owner reads the formatted result, not the markup.
- A blank line between the three blocks and nowhere else. The three blocks are: the headline with its arrow line, the block quote, and the five bullets. Related lines stay together. A blank line after every sentence hides what connects to what.
- Every line written as if the owner is five years old. Short words, one idea per sentence, no jargon, and none of the toolkit's own vocabulary.
- More than one file means numbered blocks with a horizontal rule between them, and one closing line asking which numbers to save.

The headline and the quoted text are what the owner is really saying yes to.
He approves the quoted text, `Why`, and `From`. The other bullets are shown so
he can see where the file goes and how it is tagged, and he may change any of
them.

**This changes today's template.** The arrow line currently offers the word
"spec". The folder is `knowledge/prds/` and the word is PRD.

**Check:** read a card. The owner can tell in one pass what is being saved,
whether it is a memory or a PRD, and exactly which words will be written. He
never opens a file to decide.

## 21. Indexes and the checker

- Two generated files: `knowledge/memory/memory-index.md` and `knowledge/prds/prd-index.md`. In the PRD index, a child PRD is listed under its parent, indented one level, so the reader sees the area and its parts together. Both have the same shape and are built the same way. The PRD index used to be called `spec-index.md`.
- The index is grouped under short topic headings, not one flat alphabetical list. Each heading reads like the question a reader would ask, such as "Deploy and org-safety rules" or "Where things live", so the reader can quickly find the relevant source. The heading comes from each file's `group` field. Files with the same `group` sit together under that heading. The order of the groups, and the order of files inside a group, follow one fixed rule, so the same set of files always produces exactly the same index. Which rule is the design's job.
- Each entry is one line: a link to the file, then the file's `summary`. The summary is the headline fact itself, in plain words, not a description of the file. It helps a reader choose the source; the agent opens that file before relying on the claim, as requirement 19 requires. The owner's model for this is the memory index in his Davis project, where a line reads like "Never send via Gmail; paste the email or save it to a file".
- The summary is written once, in the file's own `summary` field, and the index copies it word for word. The index adds nothing of its own. Every line in it comes from a file.
- A memory whose status is not `current`, or a PRD whose status is not `finalized`, shows its status on its line, so historical records and proposed requirements are clearly identified. No index label substitutes for requirement 19's source checks.
- The header above the entries is two lines at most. The index points at files. It does not explain how anything works.
- Never edited by hand. The order of files inside a group follows one fixed rule. Two sessions rebuilding the index at the same time then produce the same lines in the same order, so their changes do not conflict in Git.
- If an index disagrees with the files on disk, the files win. Rebuild it.
- Every saved memory file and PRD is confirmed against the field rules and four size limits: the `summary` line of any memory file or PRD is under 200 characters, `knowledge/current.md` is under 5,000 characters, `knowledge/memory-self-improvement.md` is under 10,000 characters, and any one memory file is under 5,000 characters. Nothing else has a size limit. Confirming never changes a file.
- A file that breaks a limit or a field rule is named, along with the rule it broke. A save that fails is not finished. The agent fixes the file and confirms it again before it says the save is done. Nothing is ever cut off silently.
- After any lasting knowledge change, the index is rebuilt and the checker is run. A failing check means the save is not finished, and the agent says so instead of claiming the knowledge is stored.

**Check:** rename a memory file and rebuild. The index line follows, under the
heading its `group` names. Read any line: it states a fact, not "this file is
about". Break a required field and try to save. The save is reported unfinished, and the
file and the broken rule are named.

## 22. Keeping current truth clean

- The agent notices and proposes cleanup without being asked. Every proposal names the affected content, the operation, and its reason in the standard format. Owner approval is required before a lasting edit, merge, supersession, retirement, or deletion; after approval, the agent completes the operation and checks the result itself. It does not ask the owner to perform the file maintenance.
- Never just add. Search for a file on this topic first. A new file every time something comes up fills the folder with near-duplicates until nobody trusts it.
- Keep the original creation date, update the content-change date, and retain evidence for the current meaning. Record a verification date only when the claim was actually rechecked. A recent edit alone never makes an old claim newly verified.
- **Update** when the new information agrees with the file and adds to it. Edit the file, set `updated_at` to today, and say in the file body what changed and on what date. Set `confirmed_at` only when its claim was rechecked and found still true. No new file.
- **Supersede** when the new information contradicts the file and is right. Three steps, together or not at all: write the new file with `supersedes` pointing at the old, mark the old file `superseded` with `superseded_by` pointing at the new, then fix anything still treating the old file as current. The old file stays, because often the fact that something changed is the useful part.
- **Retire** when a file no longer applies but its history still matters. Set `status` to `retired`. It stops answering what is true now and stays findable.
- **Delete** for three reasons only, and name the reason in the reply: a copy made by mistake, a secret that should never have been written down, or something that was never true. Something that stopped being true is superseded or retired, never deleted.
- Age alone is never a reason. Written two years ago and still true means still true.
- A memory nobody will look up again is found and proposed for retirement without the owner hunting for it. He says yes. The reason is never age. The reason is that the result it holds will not be needed again. Example: a spreadsheet built once in June, checked and delivered, with nothing pointing at it months later.
- This happens at each save, for the files the search turned up, and across the whole folder when `reflect` runs. Two files saying the same thing are merged into one. Two files that disagree are resolved by the supersede steps above. Add `related_memories` links only when understanding or applying one file benefits from opening the other, following requirement 14. A shared topic alone does not require direct links between every pair; the index already supports topic discovery. The aim is a small set of files the agent can trust, where related files point at each other, not a large set.

**Check:** save something that contradicts an existing file. The agent shows the
conflict, supersedes rather than adding a second file beside it, and afterwards
both files point at each other.

**Check:** let the agent find an accidental duplicate. It proposes the removal
and explains why without prompting. Withhold approval: the file remains.
Approve: it removes the duplicate, repairs affected navigation, validates the
result, and reports completion. A later session follows the surviving source.

## 23. Learning what to save

`knowledge/memory-self-improvement.md` is where the agent keeps lessons about
what this owner accepts and rejects AS IT RELATES TO MEMORY, so its proposals get better over time.

- It holds lessons and a short log of recent proposal outcomes.
- The save flow reads this file before it gathers candidates, so something the owner has already rejected is dropped or reshaped before he ever sees it. After the owner decides, the save flow appends one line to this file for each candidate it showed him.
- Each line carries the date, the candidate in a few words, the outcome, and the owner's reason in his own words, or "no reason given". Never an invented reason.
- This file is a scratch record the save flow keeps for itself. It is not memory. Appending a line to it needs no approval. Requirement 10 lists it with the other things that need none. Nothing in it is a lasting fact about the project, and secrets never go in it.

- When a lesson in this file disagrees with anything in this document, this document wins. The agent names the disagreement in its reply instead of quietly following one of them.
- The `reflect` command merges repeated lines into a single lesson, so the file stays small.
- Lessons stay in this project. If evidence available within authorized access suggests a useful toolkit-wide improvement, propose it through the existing toolkit change workflow. Local memory upkeep does not search other projects, change shared instructions, or roll out policy to them on its own. A wider change needs its own scope and approval.

**Check:** reject a proposal and give a reason. A line appears in the file with
that reason. Propose something similar later and the agent names the earlier
rejection instead of proposing it again.

## 24. The six commands

| Command | What it does for the owner |
| --- | --- |
| `recall` | Finds what this project already knows, before searching the code or asking him. |
| `remember` | Finds what is worth saving, checks the inbox to avoid duplicate proposals, shows new cards, and saves each approved item as a memory or a PRD. It can also bring back pending cards for review. |
| `retire` | Takes one file out of current use: superseded, retired, or deleted. |
| `reflect` | Reviews the whole knowledge folder and proposes cleanup: duplicates, contradictions, stale files. |
| `session-search` | Searches available project session history when project knowledge did not answer or a relevant explanation is missing. The host and access limits are stated. |
| `second-brain` | Sets up, checks, explains, or repairs this system in a project. |

**Check:** for each of the six, the owner asks for it in his own words and
names nothing else. `recall`: he asks what the project already knows about a
topic, and gets saved files with their paths. `remember`: he says "remember
this", and gets a card. `retire`: he says a file is out of date, and gets a
proposal to supersede, retire, or delete it. `reflect`: he asks for a cleanup
review, and gets a list of duplicates, contradictions, and stale files.
`session-search`: project knowledge answers nothing, and the agent announces
and runs the available history search under requirement 19. `second-brain`: he asks whether this system is set up
correctly here, and gets an answer.

## 25. Codex

- A Codex session follows every requirement in this document, the same as a Claude session. Same shared files, equivalent startup orientation, same cards, and the same rules about what to save and where.
- The design uses each supported harness's documented capabilities to meet the same outcomes and performs requirement 3's verification on each. It does not assume that one harness's mechanisms exist in another.
- Where the design finds that Codex cannot enforce one behavior at all, it says which one, and the setup report for every project says so too. It never quietly leaves a gap.
- Nothing in the saved files is specific to one agent. Both read the same Markdown.

**Check:** open the project in Codex and run the same session as in "A session,
start to finish". Every step gives the owner the same result it gives in Claude.
Any step that cannot be enforced in Codex is named in the setup report.

## 26. Built the way Claude Code's documentation says

Everything this system puts into a project, and everything the toolkit ships
for it, is built the way the official Claude Code documentation says to build
it. That covers every rule file, hook, skill, plugin part, settings entry, and
startup text that relates to memory, PRDs, or the second brain.

- Best practice here means the captured documentation in `ai-external-knowledge/claude-code/`, not what an agent remembers or assumes. Before building or changing a part, the builder reads the page that covers that kind of part.
- Guidance is available where it applies without filling every session with unrelated instructions. The design chooses the documented way to scope it in each supported harness.
- Routine startup guidance stays compact and leads to detail when needed, as requirement 2 requires.
- The design for each part names the documentation page it followed and the practice it applied, so a reviewer can check the part against the page.
- When the documentation and this document disagree, this document decides what the system does, and the documentation decides how Claude Code is used to do it. The disagreement is said out loud, never quietly picked.

**Check:** pick any part the system ships. The design names the documentation
page it followed. Open that page. The part matches what the page says. Pick any rule file. Either it is scoped to the places it applies to, or it
applies everywhere and is short.

## 27. Installed once, turned on per project, and checked

- The second brain is installed once on a computer. A project gets it only when the owner says yes to turning it on there.
- Turning it on is one step that finishes completely. Every part the project needs is put in place in that one step, not some now and some later.
- Afterwards, the setup checks itself and tells the owner plainly whether the project is equipped, and which version is active. It never calls a half-finished setup healthy.
- Turning it on again later, to bring a project up to date, works the same way and reports the same way.

**Check:** turn the second brain on in a fresh project with one yes. The report
says equipped and names the version. Open a session there: the briefing arrives
and the required checks and save behavior work. Turn it on in a second project without saying yes: nothing
changes there.

## 28. Pending memory inbox

One plain Markdown file, `knowledge/memory-inbox.md`, holds actual knowledge
save proposals that are awaiting the owner's answer or whose approved save has
not finished. It sits directly under `knowledge/`, outside lasting memory.
The owner approved automatic retention of unanswered proposals on 2026-09-10
during this PRD interview. Agents do the filing and follow-up; the owner does
not maintain a queue or repeat a decision because the session changed.

### What is kept

- Automatically retain an unanswered proposal once it has been shown to the owner. Preserve the exact card, including its proposed wording and formatting. Unshown brainstorming, raw conversations, discarded candidates, and secrets do not belong here.
- Keep an approved proposal while its save is unfinished. Save locally and share the pending record promptly through the project's default branch. If either step fails, report what exists, where it exists, and what another session cannot yet see. A proposal that exists only in chat is still unsaved.
- Use the same entry format for every proposal: a stable reference; destination and operation; exact card; source reference and date; last-updated time; state; and the next step or blocker. The states are `awaiting approval`, `approved, save unfinished`, and `blocked by conflict`. Record any approval separately with who gave it, when, its source, and the exact content and scope it covers. A conflict does not erase that record or expand its scope.
- Keep only the context needed to understand and resolve that proposal. Use links to the original sources and work record. An already-authorized PRD draft stays in its canonical PRD; the inbox does not become a second copy of that document or a work tracker.

### How agents use it

- The small knowledge map identifies the inbox, its purpose, and its rules. At startup, after context recovery, and at handoff, agents check pending state without loading every proposal into every session. Open the relevant entry when recovering a save or reviewing it with the owner.
- Before editing this shared file, reread it and preserve other sessions' entries and changes. Concurrent sessions must not lose proposals, duplicate the same proposal, or apply the same approved save twice.
- Pending content is visibly labelled with its approval and completion state and excluded from memory and PRD indexes. Its presence never gives it the authority of a fact, requirement, preference, or instruction. Requirement 19 governs any use of its source as evidence.
- An unanswered card remains available automatically, including across sessions and context clears. Silence, age, and a session ending neither approve nor reject it. Do not repeat the unchanged card every turn. Briefly identify pending state at handoff or when relevant; show the card again when the owner reviews pending items or when new information requires a decision.
- For an approved unfinished save, check the current destination and whether the save already completed. If the approved change is still applicable, finish it without asking for the same approval again. If newer information conflicts or the proposed meaning must change, preserve the entry, explain the conflict, and obtain the needed decision before applying the changed meaning. Requirement 3 limits the pause to affected work.
- Remove an entry from the active inbox once the approved save is verified complete under requirement 9 or the owner rejects the proposal. This housekeeping needs no further approval. It does not authorize deleting lasting knowledge, which still follows requirement 10. Never discard an unanswered entry merely to keep the file short.

**Check:** retain and share two proposals, receive no answer to one, and record
approval for the other before its destination save is interrupted. Start a
fresh session in another harness:
it finds the exact unanswered card and the approved unfinished save, treats
neither pending entry as established knowledge, and completes the unchanged
approved save without asking again. It removes only the completed entry. Reject
the remaining card and it leaves the active inbox. Repeat with parallel edits,
an already-completed save, and conflicting newer content: no proposal is lost,
no save is duplicated, and conflicting meaning waits for the owner's decision.

## Potential paths to explore

[Exploratory implementation ideas](../brainstorms/2026-09-10-knowledge-system-potential-paths.md)
are kept separately. They are possible approaches to requirements 1 through 3, 7, 9,
and 26, not requirements, verified harness capabilities, or an approved design.

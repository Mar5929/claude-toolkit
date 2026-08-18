# Memory System v2: Functional Requirements and North Star

**Status:** draft for owner review. Not approved for implementation.

**What this document is:** the proposed north star. It says what the memory system must
do, what the owner and the agents experience, and what must never happen. It includes
only behavior and necessary product constraints. The proposed technical answer to
"how" lives in `memory-system-v2-master.md`. Neither file authorizes a build until the
owner approves it. After approval, when the two disagree, this document wins and the
technical design gets fixed.

---

## 1. North star

Every session, on any machine, the agent opens **already oriented**. A session ending
must never mean the project forgets. A new agent with zero prior context must be
productive within its first exchange.

The system must prevent two failures at the same time:

- **Amnesia:** every new session starts as a stranger, the owner re-explains, decisions
  get re-argued, and failed approaches get retried.
- **Rot:** too much gets saved, copies drift apart, and old or weak claims look
  current until nothing in the store is trusted.

The agent starts **oriented, but not overloaded**: a small stable set of context loads
at startup, and everything else is retrieved only when the task needs it. At the start
of every session the agent can answer:

```text
WHO AM I?                        identity (SOUL.md)
HOW DO I OPERATE HERE?           the operating contract (AGENTS.md / CLAUDE.md)
WHAT PROJECT AM I IN?            the project overview
WHAT ARE WE BUILDING TOWARD?     the roadmap summary
WHAT IS TRUE RIGHT NOW?          the current state
WHAT HAPPENED RECENTLY?          the recent window (about the last 2 to 3 days)
HOW DOES THE OWNER WORK?         the owner's working preferences
WHERE DOES INFORMATION LIVE?     the folder map, one line per folder
WHAT IS A SPEC VS A MEMORY
  VS A RULE?                     the information layers
WHAT MEMORY TOOLS DO I HAVE?     the capability list, told, never guessed
HOW DO I SEARCH?                 the retrieval ladder
HOW DO I SAVE AND MAINTAIN?      the write and cleanup protocol
WHAT DO I NOT STORE?             the exclusion list
```

## 2. What the owner experiences

- **Startup feels like the project remembers.** The first answer of a cold session
  reflects the project goal, the current state, the last handoff, and how the owner
  likes to work, without the owner re-explaining anything. The brief stays short.
- **Saving is a short review, not a wall of text.** A proposed save is five plain
  bullets: What, Where, Why, Assumptions, Unverified. The owner keeps, changes, or
  skips each item. Silence means nothing gets written.
- **Nothing is saved behind the owner's back.** No helper agent, hook, background
  process, or provider writes project truth silently.
- **Old truth does not haunt.** When something changes, the old record is superseded,
  drops out of current answers, and stays available for history questions. When
  something is retired, its leftover copies are hunted down.
- **Honest answers about the past.** The agent says "I could not find reliable
  evidence" instead of inventing a plausible story, and names what it searched.
- **The files stay ordinary.** Everything is readable Markdown in Git. Obsidian can
  view it. No tool is required to read the project's own knowledge.

## 3. What every agent must be told when it starts

The startup context, delivered through the host's own loading path, always covers:

1. the operating contract (`AGENTS.md` / `CLAUDE.md`) and the identity file
   (`SOUL.md`);
2. the project overview and a compact roadmap summary (current phase, objective,
   milestone, remaining areas);
3. the current state of work and a recent window of roughly the last 2 to 3 days or
   the last few meaningful sessions, including what failed and should not be retried;
4. the owner's working preferences;
5. the folder map: one plain line per major folder saying what lives there, what is
   generated, and what must not be hand-edited;
6. the memory contract (See ## 5. What is and IS NOT considered "Memory"): what may be stored, what may never be stored, which memory
   skills and tools exist, and how to search;
7. any warnings (missing files, stale views, failed checks) as counts with links.
8. output style when actually storing memories and specs.

## 4. Functional requirements

### Orientation and context

- **FR-001:** A cold session must receive the host operating contract, `SOUL.md`, the
  project overview, the current view, the recent view, the project map, and the memory
  capability route before substantive work starts.
- **FR-002:** The startup content must fit the configured budget and degrade by
  pointer and count instead of blocking the session.
- **FR-003:** Generated startup views must identify themselves as generated and list
  their inputs.
- **FR-004:** Startup views must preserve exact source meaning, qualifiers, dates, and
  numbers and must link back to their authoritative sources.
- **FR-005:** The recent window must show a small, date-labeled set of the latest
  meaningful updates and clearly label older fallback content.
- **FR-006:** The project map must explain folder meaning, ownership, generated state,
  and search route.
- **FR-007:** The root instructions must tell the agent what memory skills and tools
  exist and how to inspect current capabilities. The agent never guesses what memory
  operations are available.
- **FR-008:** Missing startup sources must produce a visible warning and a usable
  session.

### Placement and storage

- **FR-009:** Every persistent item must pass the persistent-information test before a
  save is proposed.
- **FR-010:** The save flow must search the active work tracker, rules, skills,
  specifications, memories, and references before choosing a home.
- **FR-011:** One meaning must have one canonical home. Other files must link instead
  of restating it.
- **FR-012:** Active work state must remain in the configured work tracker.
- **FR-013:** Standing agent behavior must live in rules or the output style, and
  reusable agent processes must live in skills.
- **FR-014:** Approved product behavior must live in specifications.
- **FR-015:** External source material and conclusions drawn from it must remain
  separate and linked.
- **FR-016:** Durable memory must remain readable Markdown tracked by Git.
- **FR-017:** Every derived view and search aid must be rebuildable from canonical
  sources.
- **FR-018:** Secrets, credentials, and sensitive personal information that is not
  needed and approved for the repository must be refused.

### Approval, records, and lifecycle

- **FR-019:** The main agent must show separate What, Where, Why, Assumptions, and
  Unverified bullets for each proposed specification or memory change and must wait
  for keep, change, or skip before writing.
- **FR-020:** No reply, an unclear reply, or a request to see full text must not count
  as approval.
- **FR-021:** A helper agent, hook, background process, or provider must not approve
  or silently write current project knowledge.
- **FR-022:** Every durable record must be uniquely identifiable and show its kind,
  current or historical state, important dates, provenance, and one-sentence summary.
- **FR-023:** An inference must list the evidence it is based on and remain labeled as
  an inference until explicitly verified.
- **FR-024:** The system must support doing nothing when no durable save is warranted,
  and it must support adding, confirming, correcting, superseding, retiring, merging,
  and deleting records when each action is appropriate.
- **FR-025:** Superseding or retiring a record must remove it from current retrieval
  without erasing history.
- **FR-026:** A merge must be refused when it would erase or blur different
  provenance or meaning.
- **FR-027:** Deletion must be limited to duplication surplus, corruption, privacy
  removal, or accidental records and must require a reason.
- **FR-028:** An approved write must leave canonical Markdown and every affected
  derived view or search aid consistent as one reported operation.

### Retrieval

- **FR-029:** Retrieval must widen progressively, starting with loaded context and
  exact authoritative lookup before broader search and related history.
- **FR-030:** Search must route by question type: specs for expected behavior,
  decisions for rationale, events for history, the tracker for active work, and
  transcripts for exact past wording.
- **FR-031:** Current specifications and primary sources must rank above derived or
  unchecked memories when relevance is otherwise equal.
- **FR-032:** Search results must include their layer, status, path, one-sentence
  summary, provenance, and score or match reason.
- **FR-033:** Empty search results must remain empty. The system must not substitute
  recent but unrelated content.
- **FR-034:** Consequential answers must expand the record and follow provenance to
  original evidence.
- **FR-035:** Session-history search must run only when current project sources are
  insufficient or when the owner asks for it.
- **FR-036:** A session-history miss must be scoped to the machine, project, date
  range, and available history. It never becomes "this was never discussed."
- **FR-037:** An optional retrieval method may be enabled only after it improves
  measured retrieval. Any method that sends content outside the approved privacy
  boundary also requires recorded consent.
- **FR-038:** The final retrieval tier must return an honest failure instead of a
  plausible invention.

### Review and cleanup

- **FR-039:** Memory review must be structurally read-only and return a worklist.
- **FR-040:** The worklist must cover duplicate candidates, conflicts, stale review
  dates, broken links, supersession gaps, retired phrases, tag problems, and
  retrieval-test failures.
- **FR-041:** Review must not merge, retire, rewrite, or delete records.
- **FR-042:** Cleanup must use the normal approval review and lifecycle tools for
  every change.
- **FR-043:** Different-source statements about the same subject must remain separate
  and be linked as a pair.
- **FR-044:** A focused review must run after an approved save; a deep review runs
  only on request, after migration, or when a concrete backlog threshold is crossed.
- **FR-045:** Age alone must never delete or retire memory.

### Providers, privacy, and migration

- **FR-046:** A retrieval provider must pass the memory contract before it can be
  enabled.
- **FR-047:** Provider failure must not make canonical Markdown unavailable.
- **FR-048:** A provider must not send project content outside the approved privacy
  boundary.
- **FR-049:** A provider that lacks a required capability must fail visibly. It must
  not silently return an empty result.
- **FR-050:** Built-in private agent memory must not be required for correctness or
  treated as project truth and must be disabled where the host allows it.
- **FR-051:** Migration must identify the source layout safely, show a dry run, and
  stop on ambiguity or collision.
- **FR-052:** Migration must preserve existing text and links unless a change is
  explicitly approved.
- **FR-053:** Missing metadata must be shown as missing. Migration must not invent it.
- **FR-054:** A migration must be reversible until the new layout, links, views, and
  checks pass.
- **FR-055:** Existing records must remain usable and may be upgraded incrementally
  when touched instead of through a risky bulk rewrite.

### Deferred capability

Proactive reminders are not required for v2 acceptance. They may be evaluated after
the core memory system passes its acceptance tests, with separate owner approval for
their behavior and interruption limits.

## 5. What is and IS NOT considered "Memory"

### What is considered "Memory"

- Persistent facts, decisions, architectural decision records.
- Semantic Memory (Facts & Profiles): Durable truths, company guidelines, user identity markers (name, role), and explicit constraints.
- Episodic Memory (Past Events & Summaries): High-level takeaways from past interactions, milestone events, and specific user choices (e.g., "preferred Python over JavaScript for this project").
- Working Memory (Active State): Normally stored in the current state or short-term memory system prompt. Immediate short-term context like current task goals and recent turns.

### What IS NOT considered "Memory"

Tool call results; commands run; files opened; code-edit play-by-play; routine compiler and
test errors; temporary debugging hypotheses; hidden reasoning; casual conversation;
restatements of active specs or live code; live work-item status copied into memory;
model-generated prose with no provenance; secrets and credentials; sensitive personal
information that is not needed and approved for the repository.

The guiding test for events: **would someone working on this project six months from
now care that this happened?** Agent activity is not project history; project state
changes are.

## 6. What may never happen

- No model-written paraphrase becomes the only home of any fact.
- No database or vendor store becomes the source of truth; truth is Git-tracked text.
- No silent or unjustified deletes; any allowed deletion must use the approved narrow
  reasons and preserve the required audit evidence.
- No project content leaves the project's privacy boundary without a recorded,
  per-project consent decision.
- No background process, cron job, or silent curator changes memory.
- No auto-injection of the whole accumulated store at startup.
- No session-history search before current project sources have actually failed.

## 7. Output style when writing memories or specs

* No jargon, analogies, figures of speech, etc. that the user did not explicitly write first. You (the ai agent) are not writing a novel, you are storing memories to build the second brain for the project so the ai agent feels more and more like a progressively smarter assistant.
- No assumptions or commentary on the memory facts themselves that the user did not explicitly ask for or mention.
- Be careful writing something that may skew a future agent's thought process and reasoning when reading the memory.

## 8. Acceptance: how we know it works

The system is accepted when all of these are proven in a real project:

- A cold Claude Code session and a cold Codex session both start oriented, and the
  first response reflects the goal, current state, recent handoff, map, and the
  owner's working preferences without re-explanation.
- The startup brief stays inside its budget and degrades safely when too big.
- A transient detail correctly produces no save.
- A new persistent fact cannot be written without the five-bullet approval.
- A pair of same-subject facts from different sources survives every cleanup pass
  unchanged.
- A superseded record disappears from current answers and remains in its timeline.
- A retired phrase's surviving copies are found wherever they still appear.
- A consequential recall follows provenance to the original source.
- Session-history search cannot run before current sources fail or the owner asks.
- An unanswerable question gets an honest failure, with the searched scope named.
- Deleting every derived search aid and rebuilding produces the same answers.
- A provider outage leaves plain Markdown recall working.
- A migration dry run changes nothing, and an approved migration loses no file or
  link.
- The owner reads the boot brief and confirms it feels like the project remembers the
  right things without showing too much. That is a real criterion.

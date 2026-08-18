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
WHAT MUST STAY TOP OF MIND?      the project's pinned memories
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
- **Important memory can stay top of mind.** The owner can pin a project memory so
  every future session receives its approved meaning without turning it into a rule.
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
- **Every toolkit project starts with memory available.** The toolkit and memory
  routes are present by default in every project the toolkit initializes or syncs,
  regardless of project type. The owner may remove the memory system when a project
  does not need it.
- **Outside documentation stays useful without becoming memory.** Product guides,
  crawled websites, and other research remain in a mapped reference area. Approved
  project conclusions link back to that material from the place that owns them.
- **Meaningful completed work can be recorded on command.** The owner can say
  "record what we just did" after material work, and the system saves one short,
  evidence-linked event instead of a transcript or detailed activity log.

## 3. What every agent must be told when it starts

The startup context, delivered through the host's own loading path, always covers:

1. the operating contract (`AGENTS.md` / `CLAUDE.md`) and the identity file
   (`SOUL.md`);
2. the project overview and a compact roadmap summary (current phase, objective,
   milestone, remaining areas);
3. the current state of work and a recent window of roughly the last 2 to 3 days or
   the last few meaningful sessions, including failed project approaches, disproved
   assumptions, and lasting constraints that should prevent repeated mistakes;
4. the owner's working preferences;
5. the project's pinned memories, each as a short approved statement linked to its
   complete current record;
6. the folder map: one plain line per major folder saying what lives there, what is
   generated, and what must not be hand-edited;
7. the memory contract: what counts as durable memory, what may never be stored,
   which memory skills and tools exist, and how to search;
8. any warnings (missing files, stale views, failed checks) as counts with links; and
9. the writing safeguards for storing memories and specifications.

## 4. Functional requirements

### Orientation and context

- **FR-001:** A cold session must receive the host operating contract, `SOUL.md`, the
  project overview, the current view, the recent view, the project's pinned memories,
  the project map, and the memory capability route before substantive work starts.
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
- **FR-015:** External source material must live outside durable memory in the
  project's mapped reference area. Approved conclusions drawn from it must live in
  the specification or memory record that owns the conclusion and link back to the
  source material.
- **FR-016:** Durable memory must remain readable Markdown tracked by Git.
- **FR-017:** Every derived view and search aid must be rebuildable from canonical
  sources.
- **FR-018:** Secrets, credentials, and sensitive personal information that is not
  needed and approved for the repository must be refused.

### Approval, records, and lifecycle

- **FR-019:** The main agent must show separate What, Where, Why, Assumptions, and
  Unverified bullets for each proposed specification or memory change and must wait
  for keep, change, or skip before writing, except for the narrow owner-requested work
  recap defined by FR-074 through FR-081.
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

### Pinned memory

- **FR-056:** The owner must be able to pin or unpin any current, approved memory in
  the project without changing its canonical home or turning it into a rule.
- **FR-057:** Only the owner may approve a pin or unpin. An agent may suggest either
  action but must not change pin state silently.
- **FR-058:** Every cold session in the project must receive each pinned memory before
  substantive work starts, and the pinned meaning must remain available throughout
  the session.
- **FR-059:** Startup must receive a short, owner-approved statement for each pinned
  memory and a link to the complete current record. The statement must preserve the
  record's meaning, qualifiers, dates, and numbers.
- **FR-060:** Pinning controls visibility, not authority. A pin must not override a
  current specification, a primary source, or the record's current or historical
  state, and it must not become a mandatory agent instruction.
- **FR-061:** Unpinning must remove a memory from startup without deleting it or making
  it unsearchable. Superseding or retiring a pinned memory must remove the old meaning
  from startup, and a replacement must not be pinned without owner approval.
- **FR-062:** Pins must be scoped to the current project and must never appear in a
  different project's startup or retrieval results.
- **FR-063:** If the pinned set cannot fit the startup budget, the system must warn the
  owner and identify what needs review. It must not silently omit a pin.
- **FR-064:** A model-generated importance score may help rank normal search results,
  but it must not create a pin, decide what is true, or override status, provenance,
  source authority, or query relevance.

### Project setup and folder roles

- **FR-065:** Every project initialized or synced by the toolkit must include a
  visible route to the toolkit's operating guidance and the memory system by default,
  regardless of whether the project is for software, Salesforce, research, health,
  client delivery, or another domain.
- **FR-066:** A project may add one or more optional domain profiles, but every
  profile must use the same core memory behavior and must not weaken approval,
  provenance, authority, scope, or privacy requirements.
- **FR-067:** Durable memory must be grouped by record type under
  `knowledge/memory/facts/`, `knowledge/memory/decisions/`,
  `knowledge/memory/events/`, and `knowledge/memory/patterns/`.
- **FR-068:** Each durable memory must live in the one record-type folder that matches
  what the record means. Subject areas such as Salesforce, Gearset, health, or
  research must be represented through metadata and links instead of another copy of
  the record.
- **FR-069:** Outside documentation, including official product documentation,
  web-crawl results, and agent-written research notes, must live in a mapped
  `references/` area outside `knowledge/memory/`.
- **FR-070:** An outside reference must identify its original source, retrieval date,
  applicable version or snapshot when known, and whether its contents were verified.
- **FR-071:** Research does not become current project truth by being downloaded or
  summarized. A project-specific decision, lasting fact, event, or pattern enters
  memory only through the normal owner approval flow and links to its evidence.
- **FR-072:** Approved project behavior learned from outside documentation must live
  in a specification. A reusable process learned from it must live in the appropriate
  skill. Neither may be duplicated into memory.
- **FR-073:** The owner must be able to remove the memory system from a project without
  breaking the rest of the toolkit. Removal must clean up the memory startup route and
  memory-only support files while preserving project-owned specifications, source
  references, rules, skills, and work-tracker records.

### Owner-requested work recap

- **FR-074:** The owner must be able to say "record what we just did" or a clear
  equivalent after completed work and have the system save one concise event record
  about the work the owner is pointing to.
- **FR-075:** That direct command counts as owner approval only for a recap of facts
  the main agent directly observed during the completed work. It must not approve an
  inferred decision, pattern, cause, recommendation, or unrelated memory.
- **FR-076:** If the requested scope is unclear, the outcome is unverified, or the
  work contains more than one separately meaningful event, the system must use the
  normal What, Where, Why, Assumptions, and Unverified review before writing.
- **FR-077:** The recap must state when the work occurred, the exact tool or system
  involved, a plain description that supports later searches, what was done, the
  material result, and links to available evidence.
- **FR-078:** The recap must preserve useful search wording and aliases when they were
  part of the work, such as describing a tool as Salesforce-specific and explaining
  how it relates to Graphify, while keeping the tool's exact name.
- **FR-079:** The recap must not copy a transcript, raw command log, tool-by-tool
  history, hidden reasoning, or routine activity. It must link to the work tracker,
  commit, changed files, test result, source report, or native session reference when
  those sources are available.
- **FR-080:** The system must never create these recaps automatically at the end of
  every turn or session. An explicit owner request is required for each recap.
- **FR-081:** Later recall must be able to answer whether the recorded work happened,
  when it happened, what was done, and what resulted, while linking to the event and
  its evidence and remaining honest when evidence is missing.

### Deferred capability

Proactive reminders are not required for v2 acceptance. They may be evaluated after
the core memory system passes its acceptance tests, with separate owner approval for
their behavior and interruption limits.

## 5. What counts as durable memory

Durable memory is approved project information that will still matter after the
current task or session. It is a stable fact, lasting event, decision, or persistent
state whose absence would make the owner repeat an explanation or make a future agent
repeat a wrong action.

Durable records are grouped by what they mean:

- **Facts:** lasting statements about the project, each with its evidence and truth
  status made clear.
- **Decisions:** approved choices, including why they were made and what they replace.
- **Events:** meaningful occurrences or state changes, including when they happened.
- **Patterns:** recurring, evidence-linked observations that remain separate from
  proven causes, diagnoses, rules, or required behavior.

- Stable project facts and boundaries.
- Lasting decisions and the reasons they should not be debated again.
- Meaningful project events that changed project state.
- Owner-requested recaps of material work that prevent repeated investigation or
  repeated work.
- Persistent project-specific preferences, risks, assumptions, and constraints.
- Verified conclusions that prevent repeated mistakes or repeated investigation.

Pinning changes how visible an approved memory is. It does not make temporary or
otherwise ineligible information qualify as durable memory.

### What is not durable memory

Temporary working context; current task goals; recent conversation turns; tool call
results; commands run; files opened; code-edit play-by-play; routine compiler and test
errors; temporary debugging hypotheses; hidden reasoning; casual conversation;
restatements of active specifications or live code; live work-item status copied into
memory; model-generated prose with no provenance; secrets and credentials; sensitive
personal information that is not needed and approved for the repository.

The guiding test for events: **would someone working on this project six months from
now care that this happened?** Agent activity is not project history by default. An
owner-requested recap of material work may be a project event when remembering it
prevents repeated investigation or repeated work.

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

- Use plain, literal language. Do not add jargon, analogies, or figures of speech that
  the owner did not use and approve.
- Do not add assumptions, interpretations, recommendations, or commentary that the
  owner did not explicitly approve.
- Do not use wording that could steer a future agent beyond the approved facts,
  decisions, requirements, or uncertainty.

## 8. Acceptance: how we know it works

The system is accepted when all of these are proven in a real project:

- A cold Claude Code session and a cold Codex session both start oriented, and the
  first response reflects the goal, current state, recent handoff, map, and the
  owner's working preferences without re-explanation.
- The startup brief stays inside its budget and degrades safely when too big.
- A transient detail correctly produces no save.
- A new persistent fact cannot be written without the five-bullet approval.
- A pinned memory appears in cold Claude Code and Codex sessions for its project and
  never appears in another project.
- Unpinning removes a memory from startup without removing it from normal retrieval.
- A superseded or retired pinned memory stops appearing at startup, and its replacement
  is not pinned without owner approval.
- Too many pins produce a visible review warning instead of silently dropping one.
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
- A project initialized or synced by the toolkit receives the toolkit and memory
  routes by default, regardless of its domain profile.
- Removing the memory system removes its startup route without breaking the remaining
  toolkit or deleting project-owned specifications, references, rules, skills, or
  work-tracker records.
- Gearset documentation gathered for a Salesforce project remains in the mapped
  reference area, while an approved Gearset decision, project behavior, or reusable
  process is found only in its owning memory, specification, or skill and links back
  to the documentation.
- After material work, the owner says "record what we just did" and one concise event
  is saved without a second approval step, while routine turns remain unsaved.
- A later agent asking whether the project used a Salesforce-specific graph tool
  instead of Graphify receives the recorded date, exact tool, work performed, result,
  and evidence links without receiving a copied transcript or raw command history.
- The owner reads the boot brief and confirms it feels like the project remembers the
  right things without showing too much. That is a real criterion.

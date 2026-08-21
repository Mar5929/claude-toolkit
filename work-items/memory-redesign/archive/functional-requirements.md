# Memory System v2: Functional Requirements and North Star

**Status:** draft for owner review. Not approved for implementation. Phase 0
corrections applied 2026-08-20. Owner approval pending pull request review.

**What this document is:** the proposed north star. It says what the memory system must
do, what the owner and the agents experience, and what must never happen. It includes
only behavior and necessary product constraints. The technical answer to "how" lives in
[memory-system-v2-master-technical-architecture.md](memory-system-v2-master-technical-architecture.md).
Those two files are the pair. The older drafts
[memory-system-v2-master2.md](memory-system-v2-master2.md) and
[memory-system-v2-master.md](memory-system-v2-master.md) are source material for the
architecture document and are not authority on their own. Neither file in the pair
authorizes a build until the owner approves it. After approval, when the two disagree,
this document wins and the technical design gets fixed.

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
WHO AM I?                        project identity, with a separate identity file only when needed
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
  bullets: What, Where, Why, Assumptions, Unverified. The owner keeps, changes, edits
  directly, or skips each item. An Edit action opens the complete proposal in a
  temporary review file. Silence means nothing gets written.
- **Nothing is saved behind the owner's back.** No helper agent, hook, background
  process, or provider writes project truth silently.
- **Old truth does not haunt.** When something changes, the old record is superseded,
  drops out of current answers, and stays available for history questions. When
  something is retired, its leftover copies are hunted down.
- **Honest answers about the past.** The agent says "I could not find reliable
  evidence" instead of inventing a plausible story, and names what it searched.
- **The project knowledge stays open and portable.** The owner can read it, review
  its history, and move it without depending on one agent, database, or vendor.
- **Every toolkit project starts with memory available.** The toolkit and memory
  routes are present by default in every project the toolkit initializes or syncs,
  regardless of project type. The owner may remove the memory system when a project
  does not need it.
- **Outside documentation stays useful without becoming memory.** Product guides,
  crawled websites, and other research remain in a mapped reference area. Approved
  project conclusions link back to that material from the place that owns them.
- **Meaningful completed work uses the normal save flow.** The owner can say "record
  what we just did" after material work. The system then runs the same placement,
  review, editing, and approval workflow used for every other proposed memory.
- **Related records stay connected.** A specification can point to the decision that
  explains why it exists, and the decision can show every project record that points
  back to it without copying the decision text.

## 3. What every agent must be told when it starts

The startup context, delivered through the host's own loading path, always covers:

1. the operating contract and the project's stable identity, including a separate
   identity file only when the project needs one;
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

**About the numbering.** Requirement ids are permanent. A requirement keeps its id for
life so every reference to it stays correct. Ids were handed out in the order the
requirements were written, and each one then went to live in the topic section it
belongs to. That is why a few sit out of numeric order on the page: FR-109 sits with
placement, FR-110 through FR-113 sit with approval, and FR-108 sits with the write
gate. FR-114 through FR-131 were added last and sit with continuity and with scope and
privacy. Read by section, not by number. Ids run FR-001 through FR-131 with no gaps and
no duplicates.

### Orientation and context

- **FR-001:** A cold session must receive the host operating contract, the project's
  stable identity and overview, current and recent context, the project's pinned
  memories, the project map, and the memory capability route before substantive work
  starts. A separate identity file is required only when those identity needs are not
  already owned elsewhere.
- **FR-002:** The startup content must fit the configured budget and degrade by
  pointer and count instead of blocking the session.
- **FR-003:** Any stored startup view must identify itself as generated and list its
  inputs.
- **FR-004:** Assembled or stored startup views must preserve exact source meaning,
  qualifiers, dates, and numbers and must link back to their authoritative sources.
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
- **FR-109:** Before proposing or writing a memory, the system must apply a
  future-agent interpretation test. The record must contain the minimum complete
  information needed for a future agent to understand and use it correctly. Its
  scope, evidence, authority, and uncertainty must be plain. It must exclude extra
  background, speculation, implied conclusions, recommendations, and related
  information that is not needed. If a reasonable reader could interpret the record
  in more than one way or be steered beyond its approved meaning, the wording must be
  narrowed or the memory must not be saved.
- **FR-010:** The save flow must search the active work tracker, rules, skills,
  specifications, memories, and references before choosing a home.
- **FR-011:** One meaning must have one canonical home. Other files must link instead
  of restating it.
- **FR-012:** Live work-item state must remain in the configured work tracker when a
  project has one, and must not be copied into durable memory records. Continuity
  content in `knowledge/current.md` links to the work item under FR-102 instead of
  restating its live status.
- **FR-013:** Standing agent behavior must live in rules or the output style, and
  reusable agent processes must live in skills.
- **FR-014:** Approved product behavior must live in specifications.
- **FR-015:** External source material must live outside durable memory in the
  project's mapped reference area. Approved conclusions drawn from it must live in
  the specification or memory record that owns the conclusion and link back to the
  source material.
- **FR-016:** Durable memory must remain human-readable, portable, owner-reviewable,
  and versioned without depending on one agent, database, or vendor.
- **FR-017:** Every derived view and search aid must be rebuildable from canonical
  sources.
- **FR-018:** Secrets, credentials, and sensitive personal information that is not
  needed and approved for the repository must be refused. What counts as needed and
  approved is decided by the project's recorded privacy boundary under FR-124.

### Approval, records, and lifecycle

- **FR-019:** The main agent must show separate What, Where, Why, Assumptions, and
  Unverified bullets for each proposed specification or memory change and must wait
  for keep, change, edit, or skip before writing.
- **FR-020:** No reply, an unclear reply, or a request to see full text must not count
  as approval.
- **FR-110:** Every proposed memory or specification change must offer an Edit action.
  Where the host supports keyboard actions, Edit must have a keyboard shortcut. Edit
  opens the complete proposed record in a temporary review file that the owner can
  change directly.
- **FR-111:** The temporary review file is not project memory. It must remain outside
  canonical memory and must not appear in startup context, recall, search results,
  generated views, or Git-tracked project knowledge.
- **FR-112:** After editing, the owner may say "good," "keep," or another clear
  confirmation. That confirmation approves the exact current contents of the review
  file. The owner must not have to describe the edits again in chat. Opening or
  editing the file without confirmation does not approve it.
- **FR-113:** Before saving an edited proposal, the system must validate its current
  contents again. It must stop if the edit introduces another meaning, changes the
  destination or record type, lacks evidence, creates a conflict, or fails the
  future-agent interpretation test. Otherwise, it writes the edited version through
  the normal protected save operation.
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
- **FR-026:** A merge must be refused when meanings conflict or their truth status or
  effective dates are incompatible. Additional evidence for the same meaning must be
  preserved on the surviving record.
- **FR-027:** Deletion must be limited to duplication surplus, corruption, privacy
  removal, or accidental records and must require a reason. A privacy removal must
  also meet FR-130.
- **FR-028:** An approved write must leave canonical records and every affected
  derived view or search aid consistent as one reported operation.
- **FR-108:** The refusal must sit in the saving step itself, not in the agent's
  willingness to ask. An agent that skips the review, misstates the owner's answer, or
  writes by another route must still fail to change current project knowledge, and the
  refused attempt must be reported to the owner instead of failing silently.

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
  dates, broken links, supersession gaps, retired phrases, classification problems,
  and retrieval-test failures.
- **FR-041:** Review must not merge, retire, rewrite, or delete records.
- **FR-042:** Cleanup must use the normal approval review and lifecycle tools for
  every change.
- **FR-043:** Additional sources supporting the same meaning must be preserved as
  evidence on one record. Conflicting meanings must remain separate and link to each
  other.
- **FR-044:** A focused review must run after an approved save; a deep review runs
  only on request, after migration, or when a concrete backlog threshold is crossed.
- **FR-045:** Age alone must never delete or retire memory.

### Providers, privacy, and migration

- **FR-046:** A retrieval provider must pass the memory contract before it can be
  enabled.
- **FR-047:** Provider failure must not make canonical project knowledge unavailable.
- **FR-048:** A provider must not send project content outside the approved privacy
  boundary. The approved boundary is the one the project records under FR-124, and
  FR-125 forbids any provider from widening it.
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
- **FR-067:** Durable memory must distinguish facts, decisions, events, and patterns
  as separate record types.
- **FR-068:** Each durable memory must have the one record type that matches what the
  record means. Subject areas such as Salesforce, Gearset, health, or research must
  be represented without creating another copy of the record.
- **FR-069:** Outside documentation, including official product documentation,
  web-crawl results, and agent-written research notes, must remain in a mapped
  reference area outside durable memory.
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

### Remembering completed work

- **FR-074:** A request such as "record what we just did" must start the normal
  remember workflow. It does not count as approval to write and must not bypass any
  save step.
- **FR-075:** Completed work may be proposed as an event only when it passes the
  normal placement, durable-information, future-agent interpretation, evidence,
  duplicate, conflict, review, editing, and owner-approval requirements.
- **FR-076:** If the requested scope is unclear, the outcome is unverified, or the
  work contains more than one separately meaningful event, the system must separate
  the proposed meanings and run the normal review for each one.
- **FR-077:** The completed-work event must state when the work occurred, the exact
  tool or system involved, a plain description that supports later searches, what was
  done, the material result, and links to available evidence.
- **FR-078:** The completed-work event must preserve useful search wording and aliases
  when they were part of the work, such as describing a tool as Salesforce-specific
  and explaining how it relates to Graphify, while keeping the tool's exact name.
- **FR-079:** The completed-work event must not copy a transcript, raw command log,
  tool-by-tool history, hidden reasoning, or routine activity. It must link to the work
  tracker, commit, changed files, test result, source report, or native session
  reference when those sources are available.
- **FR-080:** The system must never create completed-work memories automatically at
  the end of every turn or session. An explicit owner request is required to start
  the normal remember workflow.
- **FR-081:** Later recall must be able to answer whether the recorded work happened,
  when it happened, what was done, and what resulted, while linking to the event and
  its evidence and remaining honest when evidence is missing.

### Links and backlinks

- **FR-082:** A specification, memory record, reference, or other current project
  record must be able to link to the record that owns related meaning or evidence.
- **FR-083:** A specification must be able to reference the durable decision that
  explains its rationale without copying that rationale into the specification.
- **FR-084:** For any project record, the system must be able to show both the links
  it contains and the project records that link back to it.
- **FR-085:** A missing or broken link target must produce a visible validation
  warning and must never be presented as verified evidence.
- **FR-086:** Moving or renaming a linked record must repair affected project links in
  the same approved operation or refuse the move without leaving partial changes.

### Durable data model

- **FR-087:** Each durable record must contain one independently correctable or
  replaceable meaning. It may include supporting explanation that shares the same
  evidence, truth status, and effective dates, and it must not be split into one file
  per sentence.
- **FR-088:** Every fact must show a truth status that distinguishes documented,
  observed, reported, inferred, suspected, unknown, and other approved states so the
  word "fact" never implies more certainty than the evidence supports.
- **FR-089:** Every durable record must carry one or more recoverable evidence
  entries. Additional sources supporting unchanged meaning must be added to that
  evidence instead of creating duplicate records.
- **FR-090:** Conflicting meanings must remain separate, show their own evidence and
  truth status, and link to each other without the system silently choosing a winner.
- **FR-091:** A decision record must state the context, chosen option, reason,
  rejected options, consequences, date, status, and evidence.
- **FR-092:** An event record must state when it happened or show an honest date range
  or uncertainty when an exact time is unknown.
- **FR-093:** A pattern record must link to the facts and events supporting it and
  must remain distinct from a proven cause, diagnosis, rule, or required behavior.
- **FR-094:** Separate reusable source, entity, or relationship records must be
  optional. A simple durable record must remain complete without creating supporting
  registries that do not provide clear reuse or disambiguation value.

### Minimal project setup

- **FR-095:** The default memory setup must provide one small common core that works
  for every project type without requiring unused domain folders or support files.
- **FR-096:** When a project already has an authoritative location for rules, skills,
  active work, delivery material, or references, setup must map that location instead
  of moving or copying its contents.
- **FR-097:** Optional identity, reference, brainstorm, profile, and local support
  areas must be created only when used. Their absence must not break the common memory
  behavior.

### Research-spike documentation

- **FR-098:** When a research-only or spike work item produces documentation that may
  guide future work, the completed report must remain findable in the project's mapped
  reference area after the work item closes. It must not be treated as durable memory
  or approved system behavior merely because the research is complete.
- **FR-099:** A reference package with an editable source and one or more generated
  reading or delivery formats must identify which copy is authoritative for edits.
  Generated copies must be recreated from that source instead of edited separately.
- **FR-100:** Raw queries, working notes, and other work-item evidence must remain with
  the original work item. The work item and the lasting reference package must link to
  each other.
- **FR-101:** Unreviewed research may be stored in the reference area when its review
  or verification state is visible. Storage is not owner approval. A later work item,
  decision, or specification must link to the research without copying it, and any
  promoted project meaning must follow its normal owner approval flow.

### Session continuity

- **FR-102:** The memory system must own the project's current-state file at
  `knowledge/current.md`. That file must carry the current focus, the known blockers,
  the exact next step, and an authored handoff that another agent can use without the
  prior conversation. It must work in a project that has no work tracker. Where a
  tracker is configured, the file links to the live work item instead of copying its
  status into a second current-status record.
- **FR-103:** Cross-machine continuity must depend on `knowledge/current.md` and
  approved project records. It must not depend on machine-local session history and
  must not require a work tracker. A configured tracker adapter may add work-item
  links and live status when it is reachable. When no tracker is configured, or the
  configured tracker cannot be reached, startup must show the dated content of
  `knowledge/current.md` and label live status unverified.
- **FR-104:** Native host session history must remain optional, read-only, and in its
  original host-owned location. The memory system may search it only when the owner
  asks or current project sources are insufficient.
- **FR-105:** The memory system must not copy transcripts, create a transcript index,
  or generate session summaries, session cards, or another session-derived status
  store.
- **FR-106:** Missing, incomplete, or unsearchable native history must never block the
  memory system. A history miss must name the available project, machine, host, and
  date scope without claiming the conversation never happened.
- **FR-107:** A history result used for exact past wording must identify the original
  host session and message location so the agent can open the source before relying on
  it.
- **FR-114:** `knowledge/current.md` must be written only through the approved memory
  write path, and only on three triggers: an explicit handoff, an approved change of
  current focus, and an approved completed-work event that changes current state. No
  other route, agent, hook, or background process may write it.
- **FR-115:** Startup must deliver the current-and-recent briefing deterministically
  and read-only. It reads `knowledge/current.md`, the project's pinned records, and
  the dated summaries of recently approved records, then renders a briefing inside the
  configured budget. The same inputs must always produce the same briefing. Startup
  must not rewrite `knowledge/current.md`, create a session summary, or write any
  other stored state.
- **FR-116:** When `knowledge/current.md` is missing, or its latest dated update is
  older than the recent window, startup must show a visible stale warning naming that
  date and continue with the dated content it has. It must never invent current state
  or build it from conversation history.
- **FR-117:** Normal use must not require hand-editing `knowledge/current.md`. The
  triggers in FR-114 keep it current through the approved write path. The file stays
  plain readable Markdown the owner can inspect and correct directly, and the system
  must keep maintaining it after a hand correction.

### Project scope and privacy boundary

- **FR-118:** A project's memory scope must be one physical subtree of the filesystem,
  resolved from files inside the project. The scope starts at the directory that holds
  `knowledge/project.md` and is adjusted by the `project_root` value in that file.
  Resolution must be deterministic and must not depend on a stored absolute path, an
  environment variable, the host's idea of a workspace, or the Git remote, because
  those differ from machine to machine.
- **FR-119:** Every memory read, search, retrieval result, pin, generated view, and
  write must stay inside the resolved scope. A path that resolves outside it, whether
  through a symbolic link, a junction, a parent traversal, or a similarly named
  sibling directory, must be treated as outside the project. It must never be
  searched, never be returned as a result or as evidence, and never be written.
- **FR-120:** A refused scope or privacy operation must change no file, leave no
  partial write, and report one visible message naming the operation, the path or
  field at fault, the resolved scope root or the recorded privacy setting, and the
  reason. The system must not retry the operation with a widened boundary.
- **FR-121:** One repository may contain more than one memory scope. Each participating
  subroot must carry its own `knowledge/project.md` and its own stable project id.
  Scopes must never overlap, and a scope nested inside another scope must be declared
  by the parent, which removes that subtree from the parent's scope.
- **FR-122:** The active scope for a session must be the nearest ancestor of the
  working directory that holds `knowledge/project.md`. An undeclared nested scope, two
  scopes claiming the same project id, overlapping scope roots, or a `project_root`
  that does not resolve must stop the operation and report the conflict with both
  paths. The system must not pick one and continue.
- **FR-123:** Records, pins, and retrieval results must never cross a scope boundary,
  even when two scopes contain records with the same id. A link may point into another
  scope only when it names that scope's project id. A cross-scope link is a pointer
  only. The linked record must never be returned as this project's memory or counted
  as this project's evidence.
- **FR-124:** Every project must record its privacy boundary in `knowledge/project.md`:
  its sensitivity level, whether project content may leave the machine, and, where
  transfer is allowed, a link to the approved consent record. A missing, unreadable, or
  unknown value must be read as the most restrictive setting. A malformed privacy
  setting must never fail open.
- **FR-125:** Nothing outside that recorded boundary may widen it. An environment
  variable, an installed client, a provider, a hook, a host setting, and an agent
  instruction must all be incapable of granting consent to send project content
  outside the boundary. Widening requires an owner-approved change to the recorded
  consent, and a revocation must take effect on the next operation.
- **FR-126:** A project the owner marks sensitive, such as a health or personal
  project, must run the same core memory behavior with additional restrictions and
  never with fewer. A domain profile may add restrictions and must not remove any.
- **FR-127:** In a sensitive project, a record holding sensitive personal content must
  state its category and one line saying why that detail is needed for the project's
  purpose, and must carry explicit owner approval for that content. Content that
  identifies another person must be refused unless the owner approves that specific
  record with a named reason. Blanket permission must not be available.
- **FR-128:** Sensitive content must not appear in startup, a pin, a generated view, or
  a log body without a separate recorded owner approval that names that exposure. The
  default for a sensitive record is that it is searchable when asked for and absent
  from startup.
- **FR-129:** In a sensitive project, native session-history search must run only when
  the owner asks for it in that session. The insufficient-current-sources path in
  FR-104 must not start it.
- **FR-130:** Before the first sensitive record is saved, the system must state plainly
  that a shared or remote repository keeps deleted content in Git history, and must
  record the owner's storage answer. A privacy removal must clear the content from
  current records, record history, generated views, pin state, and any separately
  approved external copy, and must then report any remaining Git-history work instead
  of claiming complete removal.
- **FR-131:** Deterministic validation must check physical scope isolation and the
  privacy boundary on every validation run, and must prove with a fixture of two
  projects that share record ids that no record, pin, or retrieval result crosses a
  scope boundary.

### Deferred capability

Proactive reminders are not required for v2 acceptance. They may be evaluated after
the core memory system passes its acceptance tests, with separate owner approval for
their behavior and interruption limits.

## 5. What counts as durable memory

Durable memory is approved project information that will still matter after the
current task or session. It is a stable fact, lasting event, decision, or persistent
state whose absence would make the owner repeat an explanation or make a future agent
repeat a wrong action.

A memory must also be safe for a future agent to interpret. Being true is not enough.
The record must be necessary, scoped, supported, and worded so a reasonable future
reader is not pushed toward a broader, narrower, or different meaning than the owner
approved.

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
- Approved records of material completed work that prevent repeated investigation or
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
now care that this happened?** Agent activity is not project history by default.
Material completed work may be a project event when remembering it prevents repeated
investigation or repeated work and the owner approves it through the normal workflow.

## 6. What may never happen

- No model-written paraphrase becomes the only home of any fact.
- No optional database or vendor store becomes the only home of project knowledge.
- No silent or unjustified deletes; any allowed deletion must use the approved narrow
  reasons and preserve the required audit evidence.
- No project content leaves the project's privacy boundary without a recorded,
  per-project consent decision.
- No background process, cron job, or silent curator changes memory.
- No auto-injection of the whole accumulated store at startup.
- No session-history search unless the owner asks or current project sources are
  insufficient.

## 7. Output style when writing memories or specs

- Use plain, literal language. Do not add jargon, analogies, or figures of speech that
  the owner did not use and approve.
- Write each memory so it can be understood without the conversation that produced
  it. Include only the context needed to prevent a reasonable misunderstanding. Do
  not include information merely because it is true, related, interesting, or
  available.
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
- An agent told to skip the approval review still cannot change current project
  knowledge, and the refused attempt is visible to the owner.
- A pinned memory appears in cold Claude Code and Codex sessions for its project and
  never appears in another project.
- Unpinning removes a memory from startup without removing it from normal retrieval.
- A superseded or retired pinned memory stops appearing at startup, and its replacement
  is not pinned without owner approval.
- Too many pins produce a visible review warning instead of silently dropping one.
- Two sources supporting the same meaning remain as separate evidence entries on one
  current record after review and cleanup.
- Two conflicting meanings remain separate, linked, and unchanged after review and
  cleanup.
- A reported or inferred fact never appears as documented or verified merely because
  it is stored under facts.
- A project ADR contains its context, choice, reason, rejected options, consequences,
  date, status, and evidence.
- A simple durable record requires no separate source, entity, or relationship
  registry.
- A superseded record disappears from current answers and remains in its timeline.
- A retired phrase's surviving copies are found wherever they still appear.
- A consequential recall follows provenance to the original source.
- Session-history search cannot run before current sources fail or the owner asks.
- An unanswerable question gets an honest failure, with the searched scope named.
- Deleting every derived search aid and rebuilding produces the same answers.
- A provider outage leaves canonical project recall working.
- A migration dry run changes nothing, and an approved migration loses no file or
  link.
- A project initialized or synced by the toolkit receives the toolkit and memory
  routes by default, regardless of its domain profile.
- Removing the memory system removes its startup route without breaking the remaining
  toolkit or deleting project-owned specifications, references, rules, skills, or
  work-tracker records.
- A project with only the common memory setup passes validation without empty domain
  folders, generated views, a separate identity file, or local runtime state.
- An existing project maps its rules, skills, tracker, delivery, and reference areas
  without moving or copying them.
- A completed research spike leaves its final report in the mapped reference area,
  its raw evidence in the original work item, and working links in both directions.
- An unreviewed research report remains available as a labeled reference without
  becoming a decision, memory record, or approved specification.
- A new session on another machine continues from the authored handoff in
  `knowledge/current.md` without requiring access to the previous machine's
  conversation history, including in a project that has no work tracker.
- Removing or losing every searchable native session leaves current project recall
  and continuity working from `knowledge/current.md` and approved project records.
- An out-of-date `knowledge/current.md` produces a visible stale warning naming its
  date instead of an invented current state.
- Startup renders the current-and-recent briefing without writing anything, and
  `knowledge/current.md` changes only through an explicit handoff, an approved
  current-focus change, or an approved completed-work event.
- The memory system creates no transcript copy, transcript index, generated session
  summary, session card, or duplicate current-status record.
- Gearset documentation gathered for a Salesforce project remains in the mapped
  reference area, while an approved Gearset decision, project behavior, or reusable
  process is found only in its owning memory, specification, or skill and links back
  to the documentation.
- After material work, the owner says "record what we just did" and the system starts
  the normal remember workflow. Nothing is written until the owner reviews and
  approves the proposed event, and routine turns remain unsaved.
- A proposed memory offers an Edit action. The owner changes the temporary review file,
  says "good," and the exact edited contents are validated and saved without requiring
  the owner to repeat those edits in chat.
- A true but unnecessary, ambiguous, overbroad, or potentially steering statement is
  narrowed before review or correctly produces no save.
- A later agent asking whether the project used a Salesforce-specific graph tool
  instead of Graphify receives the recorded date, exact tool, work performed, result,
  and evidence links without receiving a copied transcript or raw command history.
- A specification links to its supporting architectural decision, and asking for the
  decision's backlinks returns that specification without a separately maintained
  backlink list.
- Moving or renaming a linked decision repairs every affected project link in the
  same approved operation or changes nothing.
- A memory operation aimed at a path outside the project's resolved scope changes no
  file and produces a visible refusal naming the operation, the path, and the resolved
  root. That holds for a symbolic link pointing out of the project, for a similarly
  named sibling folder, and for an undeclared project nested inside another project.
- Two projects in one repository that contain records with the same id keep their
  records, pins, and search results apart, and neither project's startup shows the
  other's content.
- A project marked sensitive refuses a sensitive record that has no stated category,
  no reason it is needed, or no owner approval. It keeps sensitive content out of
  startup, pins, and generated views unless the owner approved that exposure by name.
  It refuses external transfer when no consent record resolves. After a privacy
  removal it reports what remains in Git history instead of claiming the content is
  gone.
- The owner reads the boot brief and confirms it feels like the project remembers the
  right things without showing too much. That is a real criterion.

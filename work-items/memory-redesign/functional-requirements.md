# Memory System v2: Functional Requirements and North Star

**Status:** revised draft, 2026-08-20. This revision strips out requirements that
agents added during earlier drafting sessions and that pushed the design toward
a memory engine instead of a second brain for agents. Nothing here is approved
until Mike reviews it. Section 9 lists every removed or materially changed
requirement with its reason, so nothing was cut silently.

**What this document is:** the north star. It says what the memory system must
do, what the owner and the agents experience, and what must never happen. The
technical answer to "how" lives in
[memory-system-v2-master-technical-architecture.md](memory-system-v2-master-technical-architecture.md).
When the two disagree, this document wins and the technical design gets fixed.
The older drafts `memory-system-v2-master.md` and `memory-system-v2-master2.md`
are history, not authority.

---

## 1. The rule that shapes everything

The agent is the runtime. Claude Code and Codex already read files, search
files, edit files, and ask the owner for permission. The memory system is a
folder of Markdown files plus the knowledge of how to use them, delivered
through root instructions, rules, and skills. A script exists only where a
script genuinely beats the agent: printing the startup brief the same way every
time, guarding the write path, rebuilding the generated index, and checking
links. The requirements below describe what agents do with files, not what a
program computes.

## 2. North star

Every session, on any machine, the agent opens **already oriented**. A session
ending must never mean the project forgets. A new agent with zero prior context
must be productive within its first exchange.

The system must prevent two failures at the same time:

- **Amnesia:** every new session starts as a stranger, the owner re-explains,
  decisions get re-argued, and failed approaches get retried.
- **Rot:** too much gets saved, copies drift apart, and old or weak claims look
  current until nothing in the store is trusted.

The agent starts **oriented, but not overloaded**: a small stable set of
context loads at startup, and everything else is retrieved only when the task
needs it. At the start of every session the agent can answer:

```text
HOW DO I OPERATE HERE?           the operating contract (AGENTS.md / CLAUDE.md)
WHAT PROJECT AM I IN?            the project overview
WHAT IS TRUE RIGHT NOW?          the current state
WHAT HAPPENED RECENTLY?          the recent window (about the last 2 to 3 days)
WHAT MUST STAY TOP OF MIND?      the project's pinned memories
WHERE DOES INFORMATION LIVE?     the folder map, one line per folder
WHAT MEMORY TOOLS DO I HAVE?     the skills and tools, told, never guessed
HOW DO I SEARCH?                 the search ladder
HOW DO I SAVE AND MAINTAIN?      the save and cleanup flow
WHAT DO I NOT STORE?             the exclusion list
```

## 3. What the owner experiences

- **Startup feels like the project remembers.** The first answer of a cold
  session reflects the project goal, the current state, the last handoff, and
  how the owner likes to work, without re-explaining. The brief stays short.
- **Important memory can stay top of mind.** The owner can pin a memory so
  every future session receives it without turning it into a rule.
- **Saving is a short review, not a wall of text.** A proposed save is five
  plain bullets: What, Where, Why, Assumptions, Unverified. The owner keeps,
  changes, edits directly, or skips each item. Silence means nothing is
  written.
- **Nothing is saved behind the owner's back.** No helper agent, hook,
  background process, or provider writes project truth silently.
- **Old truth does not haunt.** When something changes, the old record is
  superseded, drops out of current answers, and stays available for history.
- **Honest answers about the past.** The agent says "I could not find reliable
  evidence" instead of inventing a story, and names what it searched.
- **The knowledge stays open and portable.** Plain Markdown in Git. The owner
  can read it, review its history, and move it anywhere.
- **Every toolkit project starts with memory available.** Installed by
  default, removable when a project does not need it.
- **Outside documentation stays useful without becoming memory.** Research and
  references live in a mapped reference area, and approved conclusions link
  back to them.
- **Meaningful completed work uses the normal save flow.** "Record what we
  just did" runs the same review as every other save.
- **Related records stay connected.** A spec can point at the decision behind
  it, and the decision's backlinks can be found by searching the files.

## 4. What every agent must be told when it starts

The startup context, delivered through the host's own loading path, covers:

1. the operating contract and the project overview;
2. the current state and a recent window of roughly the last 2 to 3 days,
   including failed approaches and disproved assumptions worth not repeating;
3. the owner's working preferences;
4. the project's pinned memories, each a short approved statement with a link;
5. the folder map, one line per folder, including what is generated;
6. the memory contract: what counts as durable memory, what may never be
   stored, which memory skills and tools exist, and how to search; and
7. any warnings (missing files, stale content) as counts with links.

## 5. Functional requirements

**About the numbering.** Requirement ids are permanent and are never reused.
This revision removes some ids and rewrites others; section 9 lists each one.
Ids sit in the topic section they belong to, so a few are out of numeric order
on the page. Read by section, not by number.

### Orientation and context

- **FR-001:** A cold session must receive, before substantive work: the host
  operating contract, the project overview, the current state, the recent
  window, the pinned memories, the folder map, and the memory capability route.
- **FR-002:** The startup brief must stay short, about one page. Content that
  does not fit becomes a count and a link. A large brief must never block the
  session.
- **FR-003:** Any generated file must say it is generated, name its inputs,
  and never be hand-edited.
- **FR-004:** Startup content must preserve exact source meaning, qualifiers,
  dates, and numbers, and must link back to its sources. No model-written
  paraphrase.
- **FR-005:** The recent window must show a small, date-labeled set of the
  latest meaningful updates and clearly label older fallback content.
- **FR-006:** The folder map must say, one line per folder, what lives there,
  whether it is generated, and how it is searched.
- **FR-007:** The root instructions must tell the agent which memory skills
  and tools exist. The agent never guesses what memory operations are
  available.
- **FR-008:** A missing startup source must produce a visible warning and a
  usable session.

### Placement and storage

- **FR-009:** Every persistent item must pass the persistent-information test
  before a save is proposed.
- **FR-109:** Before a save is proposed, the record must pass the future-agent
  test: it holds the minimum complete information a future agent needs to use
  it correctly, and its scope, evidence, and uncertainty are plain. It excludes
  extra background, speculation, and recommendations. If a reasonable reader
  could take a broader or different meaning than the owner approved, narrow it
  or do not save it.
- **FR-010:** The save flow must search the work tracker, rules, skills,
  specifications, memories, and references before choosing a home.
- **FR-011:** One meaning has one canonical home. Other files link instead of
  restating it.
- **FR-012:** Live work-item status stays in the configured tracker where a
  project has one and is never copied into memory. `knowledge/current.md`
  links to the work item instead of restating its status.
- **FR-013:** Standing agent behavior lives in rules or the output style.
  Reusable processes live in skills.
- **FR-014:** Approved product or system behavior lives in specifications.
- **FR-015:** Outside source material lives in the project's mapped reference
  area, not in memory. Approved conclusions live in the record that owns them
  and link back to the source.
- **FR-016:** Durable memory stays human-readable Markdown, tracked by Git,
  portable, and independent of any one agent, database, or vendor.
- **FR-017:** Every generated file must be rebuildable from canonical sources.
- **FR-018:** Secrets and credentials are always refused. Sensitive personal
  information is refused unless the project's privacy setting (FR-124) allows
  it and the owner approves the record.

### Approval, records, and lifecycle

- **FR-019:** Every proposed specification or memory change shows separate
  What, Where, Why, Assumptions, and Unverified bullets and waits for keep,
  change, edit, or skip before writing.
- **FR-020:** No reply, an unclear reply, or a request to see full text is not
  approval.
- **FR-110:** Every proposal offers an Edit action that opens the complete
  proposed text in a scratch file the owner can change directly.
- **FR-111:** That scratch file is not project memory. It stays outside
  canonical paths and never appears in startup, search, or Git-tracked
  knowledge.
- **FR-112:** After editing, a clear confirmation such as "good" or "keep"
  approves the exact current contents of the scratch file. The owner never has
  to repeat the edits in chat. Opening or editing alone is not approval.
- **FR-113:** Before saving an edited proposal, the agent re-runs the same
  save tests on the edited text and stops if the edit changed the meaning,
  destination, or record type, or fails a test.
- **FR-021:** A helper agent, hook, background process, or provider must not
  approve or silently write current project knowledge.
- **FR-022:** Every durable record shows its kind, status, dates, source, and
  a one-sentence summary, and has a stable id.
- **FR-023:** An inference lists the evidence it is based on and stays labeled
  as an inference until explicitly verified.
- **FR-024:** Doing nothing is a valid and expected outcome. When a change is
  right, the allowed actions are add, confirm, correct, supersede, retire,
  merge, and delete.
- **FR-025:** Superseding or retiring a record removes it from current answers
  without erasing history.
- **FR-026:** A merge is refused when meanings conflict or their truth status
  or dates are incompatible. Another source for the same meaning is added to
  the surviving record as evidence.
- **FR-027:** Deletion is limited to duplicates, corruption, privacy removal,
  and accidents, and requires a reason. A privacy removal must also meet
  FR-130.
- **FR-028:** An approved save leaves the records and the generated index
  consistent.
- **FR-108:** The approval gate must not depend only on the agent following
  its instructions. Where the host supports hooks (Claude Code), a guard
  intercepts any direct write to project knowledge and turns it into a visible
  owner decision. Where the host has no hooks (Codex), the root instructions
  carry the rule, and that limit is stated honestly rather than papered over.

### Retrieval

- **FR-029:** Retrieval widens progressively: loaded context first, then exact
  lookup, then broader search, then history.
- **FR-030:** Search routes by question type: specs for expected behavior,
  decisions for rationale, events for history, the tracker for active work,
  and transcripts for exact past wording.
- **FR-031:** Current specifications and primary sources outrank derived or
  unchecked memories.
- **FR-032:** An answer drawn from memory names the record it came from and
  that record's status.
- **FR-033:** Empty results stay empty. The system never substitutes recent
  but unrelated content.
- **FR-034:** Before a consequential answer, the agent opens the full record
  and follows its evidence to the original source.
- **FR-035:** Session-history search runs only when current project sources
  are insufficient or the owner asks.
- **FR-036:** A history miss is scoped: it names the machine, project, and
  dates searched. It never becomes "this was never discussed."
- **FR-037:** V2 builds no search index, embedding store, retrieval service,
  or cache. The agent searches the canonical files directly with its native
  tools. Adding an accelerator later requires a new owner-approved decision
  showing direct search actually failing on real project questions.
- **FR-038:** When nothing reliable is found, the agent says so and names what
  it searched. It never invents a plausible answer.

### Review and cleanup

- **FR-039:** Memory review is read-only and returns a worklist.
- **FR-040:** The worklist covers duplicates, conflicts, stale review dates,
  broken links, supersession gaps, surviving retired phrases, and misfiled
  records.
- **FR-041:** Review itself never merges, retires, rewrites, or deletes.
- **FR-042:** Cleanup makes every change through the normal approval review.
- **FR-043:** Extra sources for the same meaning are kept as evidence on one
  record. Conflicting meanings stay separate and linked.
- **FR-044:** A quick review follows an approved save. A deep review runs on
  owner request or after a migration.
- **FR-045:** Age alone never deletes or retires memory.

### Host memory, external services, and migration

- **FR-046:** Any future retrieval accelerator or external service needs a new
  owner-approved decision, may never be the only home of project knowledge,
  and canonical recall must keep working without it.
- **FR-050:** Built-in private host memory is never project truth and is
  disabled where the host allows it.
- **FR-051:** Migration shows a dry run first and stops on ambiguity or
  collision.
- **FR-052:** Migration preserves existing text and links unless a change is
  explicitly approved.
- **FR-053:** Missing metadata is shown as missing, never invented.
- **FR-054:** A migration stays reversible until the new layout and links
  check out.
- **FR-055:** Existing records stay usable and are upgraded when touched, not
  through a risky bulk rewrite.

### Pinned memory

- **FR-056:** The owner can pin or unpin any current approved memory without
  moving it or turning it into a rule.
- **FR-057:** Only the owner approves a pin or unpin. An agent may suggest.
- **FR-058:** Every cold session receives each pinned memory before
  substantive work starts.
- **FR-059:** Startup shows each pin's approved one-sentence statement and a
  link to the full record, preserving its meaning, dates, and numbers.
- **FR-060:** A pin controls visibility, not authority. It never overrides a
  specification or becomes a mandatory instruction.
- **FR-061:** Unpinning removes a memory from startup without deleting it or
  hiding it from search. Superseding or retiring a pinned memory removes the
  old pin, and a replacement is not pinned without owner approval.
- **FR-062:** Pins are project-local. They never appear in another project's
  startup or results.
- **FR-063:** Too many pins to keep the brief short produces a visible
  warning, never a silent drop.

### Project setup and folder roles

- **FR-065:** Every project the toolkit initializes or syncs gets the memory
  route by default, whatever its domain. The owner may remove it.
- **FR-066:** Optional domain profiles add fields and warnings. They never
  weaken approval, provenance, scope, or privacy behavior.
- **FR-067:** Durable memory uses four record types: facts, decisions, events,
  and patterns.
- **FR-068:** Each record has the one type that matches its meaning. Subject
  areas like Salesforce or health are tags, never a second copy of the record.
- **FR-069:** Outside documentation, crawls, and research notes live in the
  mapped reference area, outside durable memory.
- **FR-070:** An outside reference names its source, retrieval date, version
  when known, and whether it was verified.
- **FR-071:** Research becomes project truth only through the normal approval
  flow, linking to its evidence.
- **FR-072:** Approved behavior learned from research goes to a specification.
  A reusable process goes to a skill. Neither is duplicated into memory.
- **FR-073:** Removing the memory system cleans up its startup route and
  support files while preserving project-owned specifications, references,
  rules, skills, and work records.

### Remembering completed work

- **FR-074:** "Record what we just did" starts the normal remember flow. It is
  not approval and skips no step.
- **FR-075:** Completed work becomes an event only when it passes the normal
  placement, durability, interpretation, evidence, and approval checks.
- **FR-076:** Unclear scope, an unverified outcome, or several separate events
  are split into separate proposals, each with its own review.
- **FR-077:** The event states when the work happened, the exact tool or
  system, what was done, the material result, and links to evidence.
- **FR-078:** The wording and aliases a later search would use are kept
  alongside exact names, never in place of them.
- **FR-079:** No transcripts, command logs, or tool-by-tool play-by-play. The
  event links to the tracker item, commit, changed files, or test result
  instead.
- **FR-080:** Completed-work memories are never created automatically at the
  end of a turn or session. Only an explicit owner request starts the flow.
- **FR-081:** Later recall can answer whether the work happened, when, what
  was done, and what resulted, following the links, and stays honest when
  evidence is missing.

### Links and backlinks

- **FR-082:** Any record can link to the record that owns related meaning or
  evidence, with ordinary relative Markdown links.
- **FR-083:** A specification can point at the decision that explains it
  without copying the rationale.
- **FR-084:** For any record, the agent can show its outgoing links and find
  what links back to it by searching the files. No stored backlink registry.
- **FR-085:** A broken link target produces a visible warning and never counts
  as evidence.
- **FR-086:** Moving or renaming a record includes fixing the links to it in
  the same change.

### Durable data model

- **FR-087:** One record holds one independently correctable meaning. It may
  keep the context that shares its evidence and dates. It is never split into
  one file per sentence.
- **FR-088:** Every record states how well supported it is, from a small fixed
  set: documented, observed, inferred, unknown. "Fact" never implies more
  certainty than the evidence supports.
- **FR-089:** Every record carries at least one source or evidence entry.
  Another source for the same meaning is added there, not saved as a
  duplicate.
- **FR-090:** Conflicting meanings stay separate, keep their own evidence, and
  link to each other. The system never silently picks a winner.
- **FR-091:** A decision record states context, choice, reason, rejected
  options, consequences, date, status, and evidence.
- **FR-092:** An event states when it happened, or an honest range when the
  exact time is unknown.
- **FR-093:** A pattern links to the facts and events supporting it and stays
  distinct from a proven cause, rule, or required behavior.
- **FR-094:** No source, entity, or relationship registries are required. A
  simple record stands alone.

### Minimal project setup

- **FR-095:** The default setup is one small common core that works for every
  project type, with no unused folders or support files.
- **FR-096:** When a project already has an authoritative home for rules,
  skills, work, delivery, or references, setup maps it instead of moving or
  copying it.
- **FR-097:** Optional areas are created only when used. Their absence breaks
  nothing.

### Research-spike documentation

- **FR-098:** A research spike's lasting report stays findable in the mapped
  reference area after the work item closes, without becoming memory or
  approved behavior.
- **FR-099:** When a reference has an editable source and generated reading
  copies, the editable source is authoritative and the copies are regenerated
  from it.
- **FR-100:** Raw queries and working notes stay with the work item. The work
  item and the reference link to each other.
- **FR-101:** Unreviewed research may be stored with its review state visible.
  Storage is not approval. Promotion follows the normal flow.

### Session continuity

- **FR-102:** `knowledge/current.md` is the current-state file: the current
  focus, the known blockers, the exact next step, and a handoff another agent
  can use without the prior conversation. It works in a project with no
  tracker. With a tracker, it links to the work item instead of copying its
  status.
- **FR-103:** Cross-machine continuity depends on `knowledge/current.md` and
  approved records, never on machine-local session history and never on a
  tracker. When no tracker is reachable, startup shows the dated content of
  `current.md` and labels live status unverified.
- **FR-104:** Native host session history stays optional, read-only, and in
  its original host-owned location.
- **FR-105:** The memory system never copies transcripts, builds a transcript
  index, or generates session summaries or session cards.
- **FR-106:** Missing or unsearchable history never blocks memory. A miss
  names its available scope.
- **FR-107:** A history result used for exact past wording identifies the
  original session and message location so the agent can open the source.
- **FR-114:** `knowledge/current.md` is written only through the approved save
  flow, on three triggers: an explicit handoff, an approved change of current
  focus, and an approved completed-work event that changes current state.
- **FR-115:** Startup is read-only. It renders the briefing from `current.md`,
  the pins, and recent records, and writes nothing.
- **FR-116:** A missing or stale `current.md` produces a visible warning
  naming its latest date. The session never invents current state or builds it
  from conversation history.
- **FR-117:** Normal use needs no hand edit of `current.md`. It stays plain
  Markdown the owner can correct directly, and the system keeps maintaining it
  afterward.

### Project scope and privacy

- **FR-118:** A project's memory is the knowledge tree inside that project's
  own folder. Reads, searches, pins, and writes stay inside it. Another
  project's records never appear as this project's memory.
- **FR-124:** `knowledge/project.md` records whether the project is standard
  or sensitive, and whether project content may leave the machine. A missing
  or unreadable value reads as the most restrictive. Nothing sends project
  content off the machine without recorded owner consent, and an agent
  instruction or tool setting is not consent.
- **FR-126:** A sensitive project runs the same core system with more
  restrictions, never fewer.
- **FR-127:** In a sensitive project, a record holding sensitive personal
  content states why that detail is needed and carries owner approval for it.
  Content identifying another person needs per-record approval with a named
  reason. Blanket permission is not available.
- **FR-128:** Sensitive content stays out of startup, pins, and generated
  views unless the owner approves that exposure by name. It stays searchable
  when asked for.
- **FR-129:** In a sensitive project, session-history search runs only when
  the owner asks in that session.
- **FR-130:** Before the first sensitive save, the system says plainly that
  Git keeps deleted content in history and records the owner's answer. A
  privacy removal clears current records, views, and pin state, and reports
  what remains in Git history instead of claiming complete removal.

### Deferred capability

Proactive reminders are not required for v2 acceptance. They may be evaluated
later, with separate owner approval for their behavior and interruption
limits.

## 6. What counts as durable memory

Durable memory is approved project information that will still matter after
the current task or session: a stable fact, lasting event, decision, or
persistent state whose absence would make the owner repeat an explanation or
make a future agent repeat a wrong action.

A memory must also be safe for a future agent to interpret. Being true is not
enough. The record must be necessary, scoped, supported, and worded so a
reasonable future reader is not pushed toward a broader, narrower, or
different meaning than the owner approved.

Durable records are grouped by what they mean:

- **Facts:** lasting statements about the project, each with its evidence and
  a clear confidence label.
- **Decisions:** approved choices, why they were made, and what they replace.
- **Events:** meaningful occurrences that changed project state, with dates.
- **Patterns:** recurring, evidence-linked observations that stay distinct
  from proven causes, rules, or required behavior.

Pinning changes how visible an approved memory is. It does not make temporary
or ineligible information qualify.

### What is not durable memory

Temporary working context; current task goals; recent conversation turns; tool
call results; commands run; files opened; code-edit play-by-play; routine
compiler and test errors; temporary debugging hypotheses; hidden reasoning;
casual conversation; restatements of active specifications or live code; live
work-item status; model-generated prose with no provenance; secrets and
credentials; sensitive personal information that is not needed and approved.

The guiding test for events: **would someone working on this project six
months from now care that this happened?** Agent activity is not project
history by default.

## 7. What may never happen

- No model-written paraphrase becomes the only home of any fact.
- No database or vendor store becomes the only home of project knowledge.
- No silent or unjustified deletes.
- No project content leaves the machine without recorded owner consent.
- No background process, cron job, or silent curator changes memory.
- No auto-injection of the whole accumulated store at startup.
- No session-history search unless the owner asks or current sources are
  insufficient.

## 8. Output style when writing memories or specs

- Use plain, literal language. No jargon, analogies, or figures of speech the
  owner did not use and approve.
- Write each memory so it can be understood without the conversation that
  produced it. Include only the context needed to prevent a reasonable
  misunderstanding.
- Do not add assumptions, interpretations, recommendations, or commentary the
  owner did not approve.
- Do not use wording that could steer a future agent beyond the approved
  meaning.

## 9. What this revision changed, and why

Nothing below is approved until Mike reviews it. Removed ids are never reused.

### Removed requirements

| Id | What it required | Why it was removed |
| --- | --- | --- |
| FR-047 | Provider outage behavior | V2 has no providers. FR-046 covers the future case. |
| FR-048 | Provider privacy boundary | Folded into FR-124 and FR-046. |
| FR-049 | Provider capability errors | V2 has no providers. |
| FR-064 | Rules for a model-generated importance score | No scoring system exists or is planned. Speculative. |
| FR-119 | Symlink, junction, and path-canonicalization enforcement | Security engineering for the owner's own repositories. FR-118 carries the plain intent. |
| FR-120 | Refusal message format and reason codes | Formats of error messages are build detail, not behavior the owner needs guaranteed. |
| FR-121 | Monorepo memory subroots with declared nesting | No project needs this. Adding it later is a new requirement, not a default. |
| FR-122 | Nested-scope conflict resolution rules | Falls away with FR-121. |
| FR-123 | Cross-scope link labeling rules | Falls away with FR-121. |
| FR-125 | Machinery making environment variables incapable of granting consent | One sentence in FR-124 carries the intent. |
| FR-131 | Mandated validator fixtures proving scope isolation | A test plan inside the requirements. Testing belongs to the build. |

### Materially changed requirements

| Id | Was | Now |
| --- | --- | --- |
| FR-002 | A configured byte budget with degradation rules | Keep the brief about a page, point instead of paste. |
| FR-022 | A long required-metadata list | Kind, status, dates, source, summary, stable id. |
| FR-028 | Canonical records and every derived view consistent as one reported operation | Records and the generated index stay consistent after a save. |
| FR-032 | A structured search-result contract with score or match reason | An answer names the record it came from and its status. |
| FR-037 | An optional retrieval method allowed after measured improvement | No index or retrieval service in v2 at all. A new decision is needed later. |
| FR-046 | A provider contract providers must pass | The future-accelerator rule. Absorbs FR-047 through FR-049. |
| FR-063 | Pin budget math with byte counts | A visible warning when pins make the brief too long. |
| FR-088 | Seven truth statuses | Four: documented, observed, inferred, unknown. |
| FR-108 | A write that skips review must mechanically fail on every host | A guard hook where the host has hooks (Claude Code). Instructions plus honesty where it does not (Codex). The old wording promised something Codex cannot deliver. |
| FR-110 | Edit action with a required keyboard shortcut | Edit action opening a scratch file. Claude Code cannot give a skill a keyboard shortcut. The reverted build recorded this as unmet. |
| FR-113 | System revalidation of edited proposals against schema and safety checks | The agent re-runs the same save tests on the edited text. |
| FR-115 | Deterministic briefing, same inputs always producing identical output | Startup is read-only and writes nothing. |
| FR-118 | A resolution algorithm over `project_root`, front matter, and directory walking | Memory stays inside the project's own folder tree. |
| FR-124 | A consent-record format with destination, scope, dates, and revocation route | A sensitive flag and an off-machine consent rule in `project.md`. |
| FR-127 | A category taxonomy for sensitive records | A stated reason the detail is needed, plus owner approval. |
| FR-130 | A purge list covering external copies and generated views | Clear current records, views, and pins. Report what Git history keeps. |

## 10. Acceptance: how we know it works

The system is accepted when all of these are proven in a real project:

- A cold Claude Code session and a cold Codex session both start oriented, and
  the first response reflects the goal, current state, recent handoff, and the
  owner's working preferences without re-explanation.
- The startup brief stays about a page and degrades by pointer, not by
  silence.
- A transient detail correctly produces no save.
- A new persistent fact cannot be written without the five-bullet approval.
- In Claude Code, a direct write to project knowledge that skips the save flow
  triggers the guard and becomes a visible owner decision.
- A pinned memory appears in cold sessions for its project and never in
  another project.
- Unpinning removes a memory from startup without removing it from search.
- A superseded record disappears from current answers and remains in history.
- A retired phrase's surviving copies are found wherever they still appear.
- Two conflicting meanings remain separate, linked, and unchanged after
  cleanup.
- An inferred fact never appears as documented.
- A consequential recall follows the record's evidence to the original
  source.
- Session-history search cannot run before current sources fail or the owner
  asks.
- An unanswerable question gets an honest failure, with the searched scope
  named.
- Deleting the generated index and rebuilding it produces the same answers.
- A new session on another machine continues from the handoff in
  `knowledge/current.md` without the previous machine's conversation history.
- An out-of-date `current.md` produces a visible stale warning naming its
  date instead of an invented current state.
- Startup writes nothing, and `current.md` changes only through its three
  triggers.
- The memory system creates no transcript copy, session summary, or second
  status store.
- "Record what we just did" runs the normal flow, and nothing is written until
  the owner approves.
- The owner edits a proposed record in the scratch file, says "good," and the
  exact edited text is saved.
- A sensitive project refuses an unapproved sensitive record, keeps sensitive
  content out of startup and pins, and reports what Git history keeps after a
  privacy removal.
- A research spike's report stays in the reference area with working links in
  both directions.
- Removing the memory system leaves the rest of the toolkit and all
  project-owned material intact.
- The owner reads the boot brief and confirms it feels like the project
  remembers the right things without showing too much. That is a real
  criterion.

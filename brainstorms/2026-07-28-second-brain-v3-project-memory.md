# Second-brain v3 Project Memory: Brainstorm / Discovery Notes

Date: 2026-07-28
Goal: Define how v3 should preserve roadmaps, timelines, goals, and other whole-project knowledge without duplicating work-tracker.

## Summary / key decisions

- The merged v3 schema has clear homes for specifications, context, decisions,
  knowledge, references, domain material, and operations.
- Add `memory/planning/` as a seventh memory type. It owns whole-project vision,
  goals, roadmap, timeline, milestones, strategic dependencies, and durable
  project risks and assumptions.
- Work-tracker owns individual tickets, ticket status, blockers, dependencies,
  handoffs, and proof that work reached the main branch.
- Planning and work-tracker must link to each other without copying ticket
  status into planning documents.
- The current `project-init` skill still defers v3, which is correct until v3
  is implemented. Its final implementation must install v3 and reconcile the
  existing continuity rules rather than layering conflicting instructions.
- Brainstorm and interview capture must remain visibly different from approved
  specifications. Raw exploration cannot silently become current requirements.
- The owner expects specifications to be organized into their own folders
  rather than stored as a flat collection of Markdown files.
- Every specification must link to the applicable brainstorms that informed
  it. The link is part of the v3 schema instructions, not an optional habit.
- The Davis Advisors repository demonstrates that aliases are useful when
  people, systems, fields, acronyms, and business concepts have multiple names.
  It does not demonstrate a need for mandatory tags on every document.
- Sources can preserve provenance and supporting evidence. When used, a
  readable `Sources` section is more useful than an unexplained metadata value
  because it can say what each source supports.
- `Tags`, `Sources`, and `Aliases` are all optional. Agents should add them only
  when they make the document easier to find, interpret, or verify. Templates
  must not require them or encourage empty placeholders.
- V3 should adopt Davis's explicit routing maps, area indexes, and nested
  knowledge folders. It should not adopt its oversized memory index, overloaded
  current-focus file, session-brain pattern, or any database-like knowledge
  graph.
- Specification and brainstorm links should be two-way: each specification
  identifies all discovery that informed it, and each brainstorm identifies
  every resulting specification.
- Keep `brainstorms/` flat, with dated descriptive files and one root index.
  Discovery often crosses or precedes system-area classification. Approved
  specifications remain organized by area and link directly to every
  applicable brainstorm. This supersedes the earlier Q4 decision to mirror
  brainstorm and specification folders.
- V3 should include a dedicated AI memory agent. The main agent identifies and
  proposes durable updates, the owner approves or changes them, and the memory
  agent performs the approved Markdown updates using the canonical schema.
- In parallel sessions, each main agent invokes its own memory agent inside the
  same task worktree. The memory agent must not write to the primary checkout or
  to another session's worktree.
- Memory and specification updates created by a task should travel through Git
  and the task's pull request, subject to normal review and conflict resolution.
- Task-related code, tests, specifications, and approved memory updates should
  normally be included in one pull request. Separate documentation-only pull
  requests remain appropriate for brainstorming sessions and standalone memory
  maintenance.
- Required knowledge-review moments are limited to completion of a substantial
  task request before its pull request is opened or merged, the end of a
  brainstorming or requirements interview, and the end of a milestone or
  project phase.
- An unfinished-session handoff does not trigger a memory review. The existing
  worktree, work tracker, and handoff practices carry that temporary state.
- The system must support both greenfield projects and brownfield projects.
  Greenfield work begins with project framing, exploration, system-area design,
  and approved specifications. Brownfield work begins with connecting the
  toolkit, mapping the existing system, and interviewing the owner to backfill
  context that cannot be established safely from code alone.
- Normal work is informal and feature-oriented rather than dependent on Jira
  ceremonies. A session may focus on an epic, refactor, component, application
  area, or other meaningful unit of work.
- Specifications evolve. When approved behavior changes weeks or months later,
  the canonical specification should be updated alongside applicable code and
  tests.
- Detailed specification history should normally remain in Git. The canonical
  specification states current approved behavior. Durable rationale belongs in
  a linked decision record when it will help future work. Old behavior remains
  in the current specification only when it is still supported, deployed, or
  relevant for compatibility.
- Do not require specification changelogs or archived copies for routine
  revisions. Git preserves exact prior versions, linked brainstorms preserve
  discovery, and decision records preserve only historically important
  rationale.
- Every specification lives in `specs/<system-area>/<capability>/`. Its
  `README.md` is the one required canonical specification. Supporting files
  such as `user-flows.md`, `data-model.md`, `interfaces.md`, and `migration.md`
  are optional and should exist only when they make a substantial
  specification easier to understand.
- Do not add a separate `memory/architecture/` type. Intended architecture and
  behavior belong in specifications, reusable maps of the existing system in
  knowledge, important architectural rationale in decisions, constraints in
  context, and supporting diagrams or sources in references.
- V3 is the curated memory and knowledge layer for AI agents, not the canonical
  archive for every raw project artifact. Raw meeting notes, transcripts,
  communications, and deliverables remain in the project's ordinary
  scaffolding when it provides those homes. V3 links to those sources and
  preserves only approved durable outcomes.
- Every important Markdown relationship must state how the documents relate,
  not merely list a path. Directional natural-language phrases such as
  `Informed by`, `Defines`, `Constrains`, `Depends on`, `Evidence for`,
  `Implements`, and `Supersedes` make the network understandable to people and
  LLMs without a hard-coded relation enum.
- Every durable specification or memory document uses a shared lightweight
  contract: descriptive title, one-sentence summary, type communicated by its
  path, content shaped for that information type, contextual relationships
  when relevant, and a one-sentence entry in the nearest index. Status,
  validity, tags, sources, and aliases remain optional.
- Time-sensitive documents may optionally use `Review after: <date>` or
  `Review when: <event>`. The main agent may propose a signal with its reason,
  or the owner may request one. The owner approves it before the memory
  librarian writes it. Reaching the date or event means verify before relying,
  not automatic expiration or supersession.
- Every schema instruction uses the same agent decision pattern: purpose, use
  when, do not use when, required or optional, authority boundary, good
  example, and unnecessary or incorrect example. The pattern applies to
  document types, relationships, indexes, supporting specification files, and
  optional metadata. Only rules explicitly labeled mandatory are mandatory.
- Mandatory links are limited to four structural cases: specification and
  informing brainstorm in both directions; superseded document and replacement
  in both directions; canonical specification `README.md` and each supporting
  file in both directions; and the nearest index linking one-way to every
  durable document. All other links and `Related` sections are optional and use
  agent judgment within owner-approved scope.
- The detailed v3 operating instructions and schema have one canonical project
  home at `.claude/rules/second-brain.md`. Short sections in both `CLAUDE.md`
  and `AGENTS.md` route Claude and Codex to that shared rule and provide a
  compact folder map.
- The memory librarian owns routine placement, index maintenance, and required
  structural links. The owner sees and approves risky or large structural
  changes, including deletion, authority changes, broad reorganization, and
  new top-level areas.
- Brownfield documentation distinguishes observed behavior, agent inference,
  owner-confirmed intent, and unresolved unknowns in plain language whenever
  confusing them could mislead future work.
- A clear `remember this` request directly approves saving the identified
  content. The memory librarian handles routine filing without a second owner
  decision. Ambiguous content and risky structural changes remain visible.
- The toolkit owns reusable plugins, skills, rules, roles, and templates. Each
  adopting repository owns its own project memory. Project and client content
  never flows into the toolkit or another repository automatically.
- Second-brain is one optional but coherent toolkit system. Selecting it
  installs the shared rule, memory librarian, Claude and Codex routes, and
  complete root schema together. Other toolkit systems remain independently
  selectable.
- The complete root schema is always preserved. Project-specific system-area
  folders are created for real areas discovered during setup rather than
  invented for unrelated domains.
- Greenfield setup and brownfield adoption finish by offering an initial memory
  pass. The agent proposes useful starting documents and offers interviews for
  important gaps without silently inventing project truth.
- During continued `grill-me` refinement, every question should include
  concrete project examples so the owner can understand the practical effect
  before deciding.

## Q&A log

### Q1: A dedicated home for whole-project planning

- Asked: Should v3 add `memory/planning/` as a distinct seventh type for the
  overall vision, goals, roadmap, timeline, milestones, and major project
  risks?
- Captured: Yes. Add the dedicated planning type. The owner also uses
  brainstorming and grill-me interviews heavily and wants the project
  scaffolding to prevent raw discovery notes, approved specifications, and
  memory from becoming duplicate or conflicting homes. The owner expects each
  specification to have its own folder.
- Flags: Resolved by Q9 and Q12.

### Q2: Can one brainstorm inform several specifications?

- Asked: Should one brainstorm be allowed to inform several specifications?
- Captured: Specifications must link to every applicable brainstorm. Raw
  brainstorms remain separate from approved specifications, and the v3 schema
  instructions must explicitly require these links. This supports a brainstorm
  informing more than one specification.
- Flags: Resolved by Q12 and the technical specification. Links are two-way,
  while brainstorms remain in one flat indexed collection.

## Evidence from the Davis Advisors repository

The following patterns were inspected read-only on its default branch:

- `CLAUDE.md` acts as a compact routing map. It tells the agent which project
  document owns each kind of information.
- `engagement/knowledge-base/README.md` provides clear entry points into nested
  subject areas. This is a useful model for v3 indexes.
- The domain glossary supports aliases and source notes. This is useful for
  client vocabulary, system names, acronyms, and alternate stakeholder terms.
- Knowledge documents use readable explanations, tables, and source sections.
  They do not rely on universal tags.
- `_memory/MEMORY.md` and `_state/CURRENT_FOCUS.md` have accumulated unrelated
  status, history, deployment evidence, follow-ups, and reference material.
  This confirms the need for typed homes and a separate work tracker.
- Current work status should remain in the work tracker. Durable project
  context, planning, decisions, and knowledge should link to it without copying
  its live ticket state.

## Evidence from Google's Open Knowledge Format v0.2

The published OKF specification and repository were reviewed read-only. The
repository states that its contents are not an official Google product.

Ideas that support or improve v3:

- A knowledge corpus can remain a directory of Markdown files in Git without a
  required serving or query system.
- The file path can serve as the document's identity. V3 already makes the
  information type and system area visible in that path.
- Folder indexes enable progressive disclosure so an agent sees what is
  available before loading individual documents.
- Structured Markdown headings help both people and agent retrieval.
- Ordinary Markdown links make the corpus graph-shaped. The relationship type
  is conveyed by surrounding prose rather than a machine-enforced edge type.
- A one-sentence description in each index entry improves routing and previews.
- Provenance, lifecycle, and freshness are distinct concerns. V3 should preserve
  their useful intent without requiring universal metadata.
- Claim-specific source attribution may use an inline link or Markdown
  footnote when precision matters.
- Unknown extensions should not make a document unusable. V3's schemas should
  remain flexible.

Ideas not recommended for v3:

- mandatory YAML frontmatter or a required `type` field, because v3's typed
  folder path already identifies the type and the owner wants readable,
  optional metadata;
- generated and verified actor records on every document, because Git review
  and owner approval provide the relevant project workflow;
- trust tiers, source usage counts, attestation receipts, executor contracts,
  and computation-verification machinery, which serve portable data catalogs
  rather than ordinary project memory;
- per-directory update logs, because Git already preserves exact history;
- accepting broken links as normal, because broken links in one project
  repository should be repaired or reported;
- replacing GitHub-friendly `README.md` indexes with reserved `index.md` files;
  and
- requiring a graph visualizer or generated graph. A disposable view could be
  added later, but the Markdown remains authoritative.

## Historical provisional metadata recommendation

Documents may use a small readable header without YAML:

- `Status`: required where lifecycle matters
- `Area`: required when the owning system area is not obvious from the path
- `Aliases`: optional, used only when alternate names improve discovery
- `Tags`: optional and sparing, used only for cross-cutting concepts that the
  folder path and links do not already express

Use document sections for relationships and evidence:

- `Related`: links to connected memory, knowledge, decisions, specifications,
  planning documents, or work items
- `Sources`: optional links to evidence that briefly explain what each source
  supports
- `Brainstorms that informed this specification`: required in each
  specification when applicable
- `Resulting specifications`: required in each brainstorm once its approved
  outcomes have been incorporated

This preserves human readability and backlinks without forcing empty or
duplicative metadata into every file.

This provisional recommendation was refined by Q17 through Q20. The final
contract makes all listed metadata optional and limits mandatory links to the
four approved structural cases.

### Q3: Are tags, sources, and aliases required?

- Asked: Should aliases and tags be optional while sources are required for
  documents that rely on evidence or prior discovery?
- Captured: Do not require any of these fields. `Tags`, `Sources`, and
  `Aliases` are all optional.
- Flags: Resolved by Q20's agent decision guidance.

### Q4: Should brainstorm folders mirror specification areas?

- Asked: Should `brainstorms/` use the same project-wide and system-area folder
  organization as `specs/`?
- Captured: Initially yes. Superseded by Q12 after examining cross-area
  brainstorming and the cost of classifying discovery too early.
- Flags: None.

### Q5: Should a dedicated memory agent perform approved updates?

- Asked: Should a dedicated memory agent be the normal writer of memory and
  specification updates after the owner approves the main agent's proposals?
- Captured: Yes. Multiple chat sessions may be active in separate worktrees.
  Each session's memory agent should make its updates in that session's
  worktree, and those changes should be merged through a pull request.
- Flags: Resolved by Q6. Task-related updates normally use the task pull
  request.

### Q6: Should task-related updates use the task pull request?

- Asked: Should task-related memory and specification updates normally be
  included in the same pull request as the code and tests?
- Captured: Yes.
- Flags: Resolved by Q7.

### Q7: When should the main agent review for durable updates?

- Asked: Should reviews occur before opening or merging a completed task pull
  request, before an unfinished-task handoff, after brainstorming or
  requirements interviews, and at milestone or phase completion?
- Captured: Review at completion of a task request before its pull request is
  opened or merged, at the end of a brainstorming or requirements interview,
  and at the end of a milestone or project phase. Do not require a review when
  handing off unfinished work between sessions.
- Additional context: The owner starts projects by explaining the project.
  Greenfield work progresses through exploration and design by system area.
  Brownfield work may use Graphify or similar repository analysis to map the
  existing system, followed by interviews that backfill project context.
  Day-to-day sessions usually center on a feature, epic, refactor, component,
  or application area. The owner and agent design the behavior, finalize a
  specification, implement it, and may return later to change that behavior.
- Flags: Resolved by Q8.

### Q8: How should specification history be preserved?

- Asked: Should current specifications describe current behavior, Git retain
  detailed prior versions, and decision records preserve only important
  historical rationale?
- Captured: Yes.
- Flags: None.

### Q9: What is required inside each specification folder?

- Asked: Should each specification folder require only a canonical `README.md`
  while allowing optional supporting documents for user flows, data models,
  interfaces, migrations, and other substantial details?
- Captured: Yes.
- Flags: Resolved in the Markdown schemas draft.

### Q10: Where should the canonical v3 instructions live?

- Asked: Should `.claude/rules/second-brain.md` be the one canonical schema and
  operating rule, with short routing sections in both `CLAUDE.md` and
  `AGENTS.md`?
- Captured: Approved.
- Flags: None.

### Q11: How should refinement questions be explained?

- Asked: The first refinement question was presented without examples.
- Captured: Include examples whenever asking a `grill-me` question so the owner
  knows what the decision means in practice.
- Flags: Resolved by Q12.

### Q12: Do brainstorms need system-area folders?

- Asked: When a brainstorm spans areas, should it live in its primary area or
  under `project-wide`, without duplicate copies?
- Captured: Keep brainstorms in one flat folder. The owner approved the
  recommendation.
- Recommendation: Keep `brainstorms/` flat. Use dated descriptive file names,
  one root `README.md` index, and direct links between each brainstorm and its
  resulting specifications. This avoids deciding an area before exploration
  reveals the actual boundaries.
- Flags: None. This supersedes Q4.

### Q13: Does architecture need its own memory type?

- Asked: Should architecture remain distributed across specifications,
  knowledge, decisions, context, and references instead of adding
  `memory/architecture/`?
- Captured: Yes. Do not add a separate architecture type.
- Examples: Intended project architecture belongs in a project-wide
  specification; a brownfield system map belongs in knowledge; the rationale
  for event-driven integration belongs in decisions; platform limitations
  belong in context; and a supporting diagram may belong in references.
- Flags: None.

### Q14: Are raw project records part of AI memory?

- Asked: Should raw meeting notes and transcripts remain under project-init's
  meeting-note scaffolding, with v3 limited to memory for AI agents? Can the
  Markdown documents reliably express how they relate?
- Repository evidence: The current Salesforce scaffold provides
  `engagement/meeting-notes/`, `communications/`, `deliverables/`, and
  `references/`. The general project scaffold does not currently impose a
  universal meeting-notes path.
- Captured: Confirmed. Raw project artifacts remain in the project's ordinary
  scaffolding. V3 contains approved specifications and curated durable memory
  for agents.
- Recommendation: Keep raw project artifacts in the project's canonical
  artifact folders. Do not copy them into v3. Specifications and memory may
  link directly to those records, or use a reference note when the source is
  external and needs project-specific context.
- Relationship recommendation: Keep ordinary Markdown backlinks, but require
  each important link to explain its direction and meaning in natural
  language. Use useful backlinks and indexes to make the network traversable.
  Do not require a database or closed relationship vocabulary.
- Flags: Resolved by Q19 and Q20.

### Q15: How consistent should document schemas be?

- Asked: Does anything ensure documents use the same schema so the information
  nodes remain consistent, and is that consistency important?
- Recommendation: Use consistent schemas within each information type, not one
  identical schema for every type. The shared rule and Markdown templates
  define the expected shapes, the memory librarian applies them, the main agent
  reviews the diff, and project-sync can report drift. Keep this
  instruction-driven rather than installing a schema validator, script, or
  hook.
- Captured: Approved through the shared lightweight contract confirmed after
  the OKF review.
- Flags: None.

### Q16: Which Google OKF ideas should v3 use?

- Asked: Does Google's Open Knowledge Format v0.2 contain ideas v3 should use?
- Captured: Research requested; no owner decision yet.
- Recommendation: Adopt its progressive-disclosure indexes, path-as-identity,
  structured Markdown, one-sentence index descriptions, prose-qualified links,
  and optional precise source attribution. Preserve lifecycle and freshness as
  optional human-readable concerns. Do not import mandatory YAML, trust tiers,
  actor metadata, attestation, logs, or graph tooling.
- Captured: The owner approved the resulting shared lightweight contract.
- Flags: Resolved by Q18.

### Q17: What is the shared document contract?

- Asked: Should every durable document have a title and one-sentence summary,
  derive its type from its path, follow its flexible type-specific schema, use
  contextual relationships when relevant, and have a descriptive index entry,
  while status, validity, tags, sources, and aliases remain optional?
- Captured: Yes.
- Flags: None.

### Q18: Who populates an optional review signal?

- Asked: When would `Review after` be populated, and would the agent add it
  automatically or would the owner?
- Recommendation: The main agent may propose a review date or review event only
  when the information has a real, explainable validity horizon. The proposal
  states why and where the date or event came from. The owner approves,
  changes, or rejects it before the memory librarian writes it. The owner may
  also request one directly. Agents do not invent arbitrary review cadences or
  silently add them.
- Captured: Approved. V3 supports both `Review after: <date>` and
  `Review when: <event>` under the normal approval workflow.
- Flags: None.

### Q19: Should backlinks ever be forced when they add no value?

- Asked: Could a backlink policy force the memory librarian to add a backlink
  to a document even when that document does not need it?
- Recommendation: Do not require reciprocal links for all semantic
  relationships and do not require an empty `Related` section. Require both
  directions only for structural correctness: a specification and every
  brainstorm that informed it, superseded and replacement documents, and a
  capability `README.md` with its supporting specification files. Require a
  one-way nearest-index entry for each durable document. For decisions,
  knowledge, context, planning, references, domain, operations, work items, and
  raw artifacts, the memory librarian adds each direction only when it
  materially improves understanding or navigation.
- Risks of blanket backlinks: unnecessary document edits, noisy relationship
  sections, larger pull-request scope, and more merge conflicts across parallel
  worktrees.
- Captured: Approved.
- Flags: None.

### Q20: Should schema instructions explain when each element is useful?

- Asked: Can the agent instructions explain exactly when backlinks should be
  used, and should the same pattern apply to the rest of the schema?
- Recommendation: Yes. For each document type, section, optional metadata item,
  and relationship convention, the canonical shared rule should state:
  purpose, use when, do not use when, required versus optional, authority
  boundary, good example, and unnecessary or incorrect example. The memory
  librarian role should use these as a judgment guide, not a deterministic
  decision tree or closed enum.
- Examples needing this guidance: `Related`, `Status`, `Review after`, `Review
  when`, `Sources`, `Aliases`, `Tags`, each typed memory home, specifications,
  brainstorms, indexes, and supporting specification files.
- Captured: Approved.
- Flags: Resolved by Q19's approved mandatory-link policy.

### Q21: How much filing and reorganization should the owner manage?

- Asked: Should routine filing inside the existing v3 structure remain part of
  the memory librarian's job, while a new system area or a move, rename, split,
  merge, deletion, or broad reorganization requires a visible proposal?
- Captured: The owner does not want to manage routine memory organization. A
  risky or large change must have a visible proposal before it is made.
- Recommendation: An approved content update gives the memory librarian room
  to choose the best existing folder, update the nearest index, and maintain
  required structural links. The main agent must separately call out a
  structural change when it could remove information, change meaning or
  authority, disrupt established paths, affect many documents, or create a new
  top-level system area.
- Examples: Adding an approved deployment lesson under
  `memory/operations/` and updating its index is routine. Creating
  `memory/architecture/`, merging several decision records, moving a capability
  specification to another area, or deleting an apparently stale context file
  requires a visible proposal.
- Flags: None.

### Q22: Should brownfield memory distinguish evidence from inference?

- Asked: When mapping an existing project, should agents distinguish what they
  directly observed, what they inferred, what the owner confirmed, and what
  remains unknown?
- Captured: Yes.
- Recommendation: Require the distinction whenever confusing the categories
  could mislead future work. Express it in normal prose near the relevant
  claim. Do not require confidence metadata or labels on every paragraph.
- Examples: `The code currently sends invoices through Stripe` is observed.
  `The retry logic appears intended to prevent duplicate charges` is inferred.
  `Mike confirmed that manual invoice retries remain supported` is
  owner-confirmed. `It is not yet known whether the legacy payment path is
  active` preserves an unknown.
- Flags: None.

### Q23: How should an explicit remember request behave?

- Asked: Should a clear `remember this` request count as direct approval while
  the memory librarian handles routine placement, indexing, and links without
  a second filing proposal?
- Captured: Yes.
- Recommendation: Save directly when the content and intended meaning are
  clear. Ask one focused question or show a short content proposal when
  `remember this` does not identify what should be preserved. Keep risky or
  large structural work under Q21's separate visible-proposal boundary.
- Examples: `Remember that production releases require Mike's approval` can be
  placed directly in the best existing operations or context document.
  `Remember this discussion` needs a brief proposal of the durable takeaway.
  `Remember this and reorganize all architecture documents` approves the
  memory content but not the large reorganization.
- Flags: None.

### Q24: What belongs to the toolkit versus an adopting project?

- Asked: Should memory always belong to the project repository where it was
  learned, with only genuinely reusable behavior and patterns proposed back to
  the toolkit?
- Captured: The toolkit is the plugin marketplace installed into greenfield or
  brownfield projects. The owner selectively chooses tools and systems from the
  toolkit, and AI agents install the approved selections.
- Recommendation: The toolkit owns reusable plugins, skills, rules, roles, and
  templates. An adopting project owns the specifications and memory created
  from its work. Project or client content never flows into the toolkit or
  another repository automatically. A broadly reusable lesson requires a
  separate, explicit toolkit change.
- Examples: Davis-specific territory rules stay in Davis. Anchor's roadmap
  stays in Anchor. The reusable rule for distinguishing observed behavior from
  inferred intent belongs in the toolkit. Installing or refreshing the toolkit
  does not copy one project's memory into another.
- Flags: None.

### Q25: Is second-brain one adoption unit or a collection of partial pieces?

- Asked: When the owner selects second-brain for a project, should its core
  install as one coherent system while other toolkit systems remain
  independently optional?
- Captured: Yes.
- Recommendation: Selecting second-brain installs the shared rule,
  memory-librarian role, Claude and Codex routing, and the complete root memory
  schema together. Other toolkit systems such as Graphify and work tracking
  remain separately selectable and integrate when present.
- Clarification: Avoiding unnecessary empty folders applies only to invented
  project-specific system areas such as `billing/` or `shipping/`. It does not
  remove or weaken the core schema.
- Examples: The installed core includes `brainstorms/`, `specs/`, and the typed
  `memory/` homes for context, planning, decisions, knowledge, references,
  domain, and operations. A fitness application may add authentication,
  fitness-tracking, and subscriptions areas, but does not receive empty payroll
  or warehouse areas.
- Flags: None.

### Q26: Should setup offer to populate the initial project memory?

- Asked: After installing v3, should the agent offer an initial project-memory
  pass as the default final setup step?
- Captured: Yes.
- Recommendation: For a greenfield project, propose initial context, planning,
  known system areas, and already-established requirements. For a brownfield
  project, begin with a read-only audit, distinguish observations from
  inferences, and propose an initial project map. Offer `grill-me` for important
  gaps. Do not invent or silently write project truth.
- Examples: A greenfield fitness application may receive proposals for its
  product goal, first milestone, and fitness-tracking specification. A
  brownfield Salesforce repository may receive an observed system map plus
  questions about business intent that code cannot establish.
- Flags: None.

### Q27: Completeness check

- Asked: What unexamined use case could materially change the design, such as
  multi-repository projects, archives, conflicting truth, sensitive client
  information, non-code projects, cold agents, or Claude and Codex interpreting
  memory differently?
- Captured: The owner identified no additional case and asked to proceed to the
  next phase.
- Recommendation: Close discovery, reconcile and validate the specification,
  present the final architecture for owner approval, and only then begin the
  separate implementation phase.
- Flags: None.

## Resulting specifications

This brainstorm produced four design documents under `docs/second-brain-v3/`:
an overview, a technical specification, a set of Markdown schemas, and a
toolkit integration document. Issue #144 deleted all four, because a second
description of the system is a second thing to keep in step, and it had already
drifted from the shipped files.

What the design turned into now lives in the second-brain plugin itself:

- [The plugin README](../plugins/second-brain/README.md)
  - What the system is and what it ships.
- [The shipped rule](../plugins/second-brain/skills/second-brain/references/second-brain-rule.md)
  - How a save works, who does which part, and where things go.
- [The routing reference](../plugins/second-brain/skills/second-brain/references/second-brain-reference.md)
  - What each home is for, opened when routing is unclear.
- [The memory verifier](../plugins/second-brain/agents/memory-verifier.md)
  - The read-only role that checks a draft before the owner sees it.

## Open flags (pending input)

- None currently.

# Second-brain v3 technical specification

Status: current specification for the second-brain plugin.

This document defines shipped v3 behavior. Installing the plugin does not
change a project automatically. Each greenfield setup, brownfield adoption, and
risky structural change remains owner-approved.

## 1. Purpose

Second-brain v3 gives Claude and Codex shared, durable project memory using
human-readable Markdown committed to Git.

It should make these outcomes easy:

1. A new session can find the relevant current truth without reading the whole
   repository.
2. Raw discovery, approved behavior, durable context, planning, decisions,
   knowledge, references, domain material, operations, and work status remain
   distinguishable.
3. Related information is traversable through readable Markdown links and
   indexes.
4. The main agent proactively identifies information worth preserving.
5. The owner controls which additional conclusions are saved.
6. A dedicated memory agent applies the approved schema consistently.
7. Parallel sessions can update project knowledge through ordinary worktrees
   and pull requests.

## 2. Terms

### Main agent

The Claude or Codex agent carrying out the owner's task. It understands the
conversation and work context, proposes durable updates, invokes the memory
agent after approval, reviews the resulting diff, and remains responsible for
the overall task.

### Memory agent

An on-demand AI specialist that reads the v3 schema, finds the canonical home,
and writes approved specification and memory changes. It is also called the
memory librarian.

It is not a background process, scheduled curator, transcript processor, or
independent decision-maker.

### Durable update

Information likely to help future work beyond the current response or ticket.
Examples include current required behavior, project context, a strategic plan,
an important decision, reusable technical knowledge, domain language, a useful
reference, or an operating procedure.

### System area

A human-readable project boundary such as `authentication`, `billing`,
`reporting`, `salesforce`, `mobile-app`, or `project-wide`. The project defines
its own areas.

### Current truth

The document that presently governs its subject. A brainstorm is never current
truth merely because it exists. Git history preserves earlier versions but
does not make them current.

## 3. Product principles

### 3.1 Markdown and Git are the system

The committed project documents are the memory and knowledge system. Git
provides review, branches, exact history, conflict detection, and recovery.

There is no separate memory service whose content can disagree with the
repository.

### 3.2 Human readability comes first

The owner must be able to browse, understand, edit, reorganize, and review v3
without a special tool.

V3 therefore uses:

- descriptive folders and file names;
- normal Markdown;
- a one-sentence summary near the start of each durable document;
- short plain-language metadata when useful;
- ordinary relative links; and
- `README.md` indexes at navigation boundaries.

V3 does not require YAML frontmatter, generated identifiers, hashes, database
records, or machine-enforced schemas.

### 3.3 One canonical home per truth

Each piece of information belongs in the home that owns it. Other documents
link to that truth rather than restating a copy that can drift.

### 3.4 AI judgment remains primary

Claude or Codex decides what is relevant to read, what is durable, and how an
approved update fits the human-readable schema.

The system provides strong instructions and examples. It does not hard-code
semantic classifications or parse a closed list of approval phrases.

### 3.5 Recommendations are proactive and persistence is controlled

The main agent recommends useful durable updates at approved completion points.
The owner may accept, edit, select, defer, or reject them in normal language.

The memory agent writes only content already authorized by the owner's task or
subsequent approval.

### 3.6 Keep it proportionate

A small project may need only a few documents. A large project may need many
system areas and supporting specification files.

V3 creates structure because it helps a person navigate, not because a template
demands empty folders or headings.

### 3.7 No arbitrary proposal limit

The main agent recommends every meaningful durable update it believes is
worthwhile. It groups related proposals for readability but does not stop at a
fixed number.

### 3.8 Soft typed schemas

Every durable specification and memory document follows a shared lightweight
contract:

1. a descriptive title;
2. a one-sentence summary near the start;
3. an information type communicated by its canonical folder path;
4. structured content appropriate to that information type;
5. contextual relationships when useful; and
6. a one-sentence description in the nearest index.

Documents of the same type answer the same broad questions, but their headings
may adapt when clearer language helps. Additional headings are allowed.

Status, validity, tags, sources, and aliases are optional. V3 does not use a
machine validator, required YAML frontmatter, or a schema registry. The shared
rule, templates, memory librarian, main-agent review, and project-sync audits
provide consistency.

Every schema instruction states:

- purpose;
- use when;
- do not use when;
- required or optional;
- authority boundary;
- a good example; and
- an unnecessary or incorrect example.

Only an instruction explicitly labeled mandatory is mandatory. These are
judgment guides for the AI, not a deterministic classification tree or closed
vocabulary.

### 3.9 Project-local memory

The toolkit distributes reusable plugins, skills, rules, roles, and templates.
The owner selectively adopts those systems in a greenfield or brownfield
project, and an AI agent installs the approved selection through the applicable
setup workflow.

The adopting repository owns the specifications and memory created from its
work. V3 does not automatically copy project or client content into the
toolkit, another project, or a shared store. A lesson that genuinely applies
across projects may be proposed as a separate toolkit change, with
project-specific and client-sensitive details removed.

## 4. Information architecture

### 4.1 Root structure

```text
brainstorms/
specs/
memory/
work-items/ or the project's configured work-tracker path
```

The first three use project-defined system areas where appropriate. The work
tracker retains its own schema and authority.

### 4.2 Brainstorms

`brainstorms/` owns raw discovery:

```text
brainstorms/
  README.md
  <date>-<topic>.md
```

It contains interviews, exploration, candidate requirements, alternatives,
unknowns, and owner wording that may later inform specifications or memory.

Brainstorms are intentionally non-authoritative. An agent must not implement an
exploratory statement as an approved requirement without confirmation.

Brainstorms are not divided into system-area folders. Discovery frequently
crosses areas or begins before its eventual ownership is known. The root index,
descriptive file names, and direct links to resulting specifications provide
navigation without duplicating or prematurely classifying raw notes.

### 4.3 Specifications

`specs/` owns current approved product and system behavior:

```text
specs/
  README.md
  <system-area>/
    README.md
    <capability>/
      README.md
      <optional-supporting-document>.md
```

Each capability folder has one required file, `README.md`. It is the canonical
specification and supplies the overview, current behavior, constraints,
acceptance expectations, relationships, and links to any supporting files.

Supporting files may include:

- `user-flows.md`;
- `data-model.md`;
- `interfaces.md`;
- `security.md`;
- `migration.md`; or
- another clearly named document that improves comprehension.

None is required merely because it appears in this list.

### 4.4 Typed memory

`memory/` contains seven types:

```text
memory/
  README.md
  context/
  planning/
  decisions/
  knowledge/
  references/
  domain/
  operations/
```

Each type follows this navigational pattern:

```text
memory/<type>/
  README.md
  <system-area>/
    README.md
    <topic>.md
```

The seven types own:

- `context`: durable project circumstances, stakeholders, constraints,
  boundaries, and current conditions needed to interpret work;
- `planning`: vision, goals, roadmap, milestones, timeline, strategic
  dependencies, durable project risks, and assumptions;
- `decisions`: important choices, reasons, alternatives, and consequences;
- `knowledge`: reusable, non-obvious technical or project understanding;
- `references`: useful internal or external sources and why they matter;
- `domain`: business language, actors, concepts, policies, rules, and examples;
  and
- `operations`: procedures for operating, releasing, supporting, recovering,
  and verifying the system.

### 4.5 Project-wide information

`project-wide` is an ordinary system area for information that genuinely spans
the project. Common examples include:

- project overview and purpose;
- stakeholder map;
- overall architecture context;
- product vision and success measures;
- roadmap and milestone plan;
- shared security constraints; and
- organization-wide terminology.

Project-wide does not become a miscellaneous dumping ground. Information with a
clear owning area stays in that area and links to project-wide material when
needed.

### 4.6 Raw project artifacts

V3 is curated memory for agents, not the archive for every raw project record.
Meeting notes, transcripts, communications, deliverables, research material,
and source exports remain in the ordinary project folders that own them.

For example, the toolkit's Salesforce scaffold uses
`engagement/meeting-notes/`, `engagement/communications/`,
`engagement/deliverables/`, and `engagement/references/`. Other stacks may use
different approved homes.

V3 documents link directly to a raw artifact when it provides useful evidence.
A `memory/references/` note is appropriate when an external source needs a
project-specific explanation, not as a mandatory wrapper or duplicate for
every raw file.

### 4.7 Folder growth

Setup creates root indexes and only the areas needed now. It does not create
empty trees for hypothetical future work.

When a folder becomes hard to browse, the agent may propose another
human-readable subfolder and local index. There is no fixed file-count, depth,
or length threshold.

## 5. Authority and ownership

### 5.1 Authority table

| Question | Canonical home |
|---|---|
| What should the product or system do? | `specs/` |
| What ideas and questions were explored? | `brainstorms/` |
| What durable circumstance affects the work? | `memory/context/` |
| What is the high-level direction and sequence? | `memory/planning/` |
| What important choice was made and why? | `memory/decisions/` |
| What reusable understanding should future work know? | `memory/knowledge/` |
| Which source matters and what does it support? | `memory/references/` |
| What does this business term or rule mean? | `memory/domain/` |
| How is the system operated or recovered? | `memory/operations/` |
| Where is the raw meeting, transcript, communication, deliverable, or source artifact? | The project's ordinary artifact scaffolding |
| What is active, next, blocked, related, or landed? | Work tracker |
| What did an earlier version of a document say? | Git history |

### 5.2 Specifications and implementation

Specifications define approved behavior. Code and tests implement and verify
that behavior.

When an authorized task changes required behavior, the applicable
specification, code, and tests belong in the same task and normally the same
pull request. An explicit owner instruction to change behavior authorizes the
specification changes necessary to represent that behavior. The agent still
asks when the intended behavior is materially ambiguous.

The completion review checks that the three remain aligned.

### 5.3 Planning and work tracking

Planning states high-level direction, goals, milestones, sequencing, strategic
dependencies, and durable risks.

The work tracker owns individual tickets, current status, blockers, operational
dependencies between tickets, handoffs, branches, pull requests, and landing
proof.

A planning document may link to the work items that deliver a milestone. It
does not copy their changing status. A work item may link back to the plan or
specification that gives it context.

### 5.4 Brownfield evidence and inference

Source code, existing documents, test behavior, repository history, Graphify,
and similar analysis tools can provide evidence about an existing system.

An agent must not silently convert an inference into owner-confirmed intent.
When the distinction matters, it explains in normal prose what was observed,
what was inferred, what the owner confirmed, and what remains unknown. No
mandatory confidence field, paragraph label, or machine classification is
required. The distinction belongs near the affected claim so a future reader
does not mistake a reasonable interpretation for established truth.

## 6. Shared Claude and Codex instructions

### 6.1 Canonical rule

The detailed installed rule lives at:

```text
.claude/rules/second-brain.md
```

It contains:

- the authority and folder dictionary;
- reading and retrieval guidance;
- placement and schema guidance;
- brainstorm and specification relationships;
- the completion-review triggers;
- the owner-approval boundary;
- memory-agent invocation and worktree boundaries;
- correction and supersession behavior; and
- the separation from work tracking.

The `.claude` path follows the toolkit's existing rule library. Its content is
shared and not Claude-specific.

### 6.2 Root orientation

`CLAUDE.md` and `AGENTS.md` each contain the same section that:

1. tells the agent to read `.claude/rules/second-brain.md`;
2. carries the authority map and, for every home, when to use it and when not
   to;
3. points to their root indexes;
4. identifies work-tracker as the owner of live task state; and
5. reminds the agent that approved durable updates use the memory agent.

The routing schema is copied into both root files on purpose, and nothing else
is. An agent has to route correctly before it opens another file, and Codex
reads only `AGENTS.md`. Any change to the authority map, the homes, or the
document contract updates both root files in the same change. If a root section
and the canonical rule disagree, the rule wins and the agent reports the
inconsistency rather than silently choosing one.

### 6.3 Memory-agent role

The installed reusable role instructions live at:

```text
.claude/agents/memory-librarian.md
```

Claude can invoke the project agent through its supported agent mechanism.
Codex can delegate to a subagent that reads the same role file and canonical
rule. The role content is shared even when the host invocation differs.

## 7. Reading workflow

### 7.1 Session orientation

When a task depends on project history or changes system behavior, the main
agent:

1. reads its root orientation file;
2. reads `.claude/rules/second-brain.md`;
3. starts with the relevant root and area indexes;
4. reads the applicable current specification;
5. follows only the related links useful to the task; and
6. searches repository text when the proper area or document is uncertain.

The agent does not load every memory file in every session.

### 7.2 Relevance

The owner's request, work item, changed files, system-area indexes, and current
specification guide retrieval.

This is AI-guided navigation over ordinary files. V3 does not need embeddings,
a generated graph, a router service, or a retrieval script.

### 7.3 Conflicts

If two documents claim conflicting current truth, the agent reports the
conflict before relying on either. It may use code, tests, Git history, and
owner input to resolve the conflict, but it does not conceal it.

## 8. Working and writing workflow

### 8.1 Explicit documentation work

When the owner explicitly requests a brainstorm, specification, or memory
document, that instruction supplies authority for the requested capture.

An explicitly invoked `grill-me` interview writes each answer to its raw
brainstorm file immediately because durable checkpointing is the requested
workflow. This does not make the brainstorm authoritative.

Approved specification and memory content normally uses the memory agent for
placement and writing.

A clear `/remember`, `remember this`, `save this`, or equivalent request also
supplies authority to save the identified content. The owner does not approve
a second filing proposal. The memory librarian selects the best existing home
and performs routine index and link maintenance. If the content or intended
meaning is unclear, the main agent asks one focused question or proposes the
specific durable takeaway. A remember request does not silently authorize a
risky or large structural change.

### 8.2 Requirement design during a task

When a feature or system change needs design:

1. the main agent reads current relevant material;
2. exploration is captured in the appropriate brainstorm when useful;
3. the main agent presents proposed behavior;
4. the owner confirms or changes it;
5. the memory agent writes the approved current specification;
6. the main agent implements code and tests against that specification; and
7. all related changes use the task branch and pull request.

A lightweight task may combine these conversational steps. V3 does not impose
formal Jira ceremonies.

### 8.3 Completion review triggers

The main agent reviews for durable updates:

- when a substantial task request is complete, before its pull request is
  opened or merged;
- at the end of a brainstorming or requirements interview; and
- at the end of a milestone or project phase.

If a task is ready before a pull request is opened, review then. If the pull
request already exists or material conclusions changed during review, conduct
the review before merge. V3 does not require two reviews for every pull
request.

The review does not run merely because:

- an unfinished task is handed to another session;
- a chat response ends;
- a commit is created; or
- a trivial action completes.

A hook may start the review at one of the completion points in section 8.2. It
changes when the review is remembered, not when it is due, and the owner still
approves every proposal it produces.

### 8.4 Review questions

The main agent uses judgment to ask:

1. Did approved behavior change, and are specification, code, and tests
   aligned?
2. Did the work produce durable context, planning, a significant decision,
   reusable knowledge, a valuable reference, domain understanding, or an
   operating procedure?
3. Is the information already captured in its canonical home?
4. Which new or amended documents would help future work?
5. Which indexes, brainstorm links, relationships, or work-item links should
   change with them?

### 8.5 Proposal format

The main agent reports:

```text
Already incorporated
- Approved specification or memory changes already made during this task.

Proposed durable updates
- Proposed destination
- Concise content
- Why it helps future work
- Any risky or large structural change

No update recommended
- State this plainly when nothing durable needs to be added.
```

It may adapt the wording to the conversation. This is a communication pattern,
not a machine schema.

The owner does not need to manage routine filing details. Once the owner
approves the durable content, the memory librarian may select the best existing
home, update the nearest index, and maintain mandatory structural links.

The proposal must visibly call out a structural change when it could:

- remove information;
- change a document's meaning, authority, or canonical home;
- disrupt an established path or incoming links;
- reorganize many documents;
- split or merge durable documents; or
- create a new top-level system area.

This boundary uses agent judgment. It does not rely on a hard-coded file-count
threshold. When uncertain whether a structural change is risky or large, show
it to the owner.

### 8.6 Owner response

The owner may use normal language to:

- approve everything;
- approve selected proposals;
- change wording or destination;
- combine or split proposals;
- defer an item; or
- skip everything.

The AI interprets the response. If the intended write is clear, it proceeds. If
a genuine ambiguity would materially change the result, the main agent asks one
focused question.

There is no natural-language command parser or required approval phrase.

## 9. Memory-agent contract

### 9.1 Invocation

The main agent invokes the memory agent after:

- the owner explicitly approves a proposed durable update;
- the owner explicitly requests a specification or memory edit whose meaning is
  clear; or
- the owner approves behavior during a design conversation and the
  specification needs to represent it.

The main agent supplies:

- the approved content and boundaries;
- the current worktree and branch;
- relevant task, code, test, and discussion context;
- known candidate destinations and relationships;
- any separately approved risky or large structural changes; and
- any unresolved uncertainty the memory agent must not guess through.

### 9.2 Responsibilities

The memory agent:

1. confirms it is operating in the requesting session's worktree;
2. reads the shared v3 rule and relevant indexes;
3. searches for existing canonical documents before creating new ones;
4. selects the most appropriate approved home;
5. writes the smallest complete change;
6. updates the nearest indexes;
7. adds useful incoming and outgoing backlinks with natural-language
   relationship direction and context;
8. connects specifications to all known applicable brainstorms and adds the
   resulting-specification backlinks;
9. removes or marks contradictory current guidance as superseded when that is
   part of an approved structural change;
10. checks that live ticket state was not copied into memory; and
11. reports changed files, placement reasoning, and unresolved issues to the
    main agent.

Routine organization within the approved content change does not need a second
owner decision. This includes choosing an existing typed folder, creating the
new document there, updating its nearest index, and maintaining mandatory
structural links.

### 9.3 Limits

The memory agent does not:

- invent new requirements, facts, rationale, or owner intent;
- expand the approved scope merely because another update seems useful;
- edit code or tests unless separately assigned as an ordinary engineering
  task;
- change work-tracker status;
- write to `main`, the primary checkout, or another session's worktree;
- commit, push, merge, deploy, or contact external systems on its own;
- create mandatory metadata that adds no value; or
- operate in the background after the task ends.

It also does not make a risky or large structural change unless that change was
visible in the proposal and approved. Examples include deleting durable
information, changing a canonical home, moving a capability between areas,
splitting or merging documents, broad reorganization, and creating a new
top-level memory or specification area.

If placement or approved meaning is materially ambiguous, it returns the issue
to the main agent. The main agent resolves it with the owner when needed.

### 9.4 Main-agent review

The main agent reviews the memory agent's diff against:

- the approved proposal;
- current specifications;
- the implementation and tests;
- backlink and index consistency; and
- the current task scope.

The main agent remains responsible for what the pull request contains.

## 10. Relationships and navigation

### 10.1 Area indexes

Root and area `README.md` files explain:

- what the folder owns;
- what it deliberately does not own;
- which documents are current;
- a one-line description of each document; and
- the most useful neighboring indexes.

Indexes are curated navigation, not generated databases or exhaustive copies
of document content. The nearest index must contain a one-sentence entry for
every durable document it owns. The document does not need to link back to the
index.

### 10.2 Related links

Specifications and durable memory documents may include a `Related` section
when relationships materially improve understanding or navigation. Do not add
an empty section. Each important link states the relationship direction in
natural language and explains why the destination matters.

```markdown
## Related

- **Governed by:** [Reset-token lifetime decision](../../../memory/decisions/authentication/reset-token-lifetime.md)
  - Explains why the expiration requirement exists.
```

Except for the mandatory structural cases in section 10.5, each direction is
added only when it helps a future reader. Links are not duplicated mechanically
when the reverse path adds no value.

### 10.3 Brainstorm and specification links

Each specification contains:

```markdown
## Brainstorms that informed this specification

- **Informed by:** [Password recovery discovery](../../../brainstorms/2026-07-28-password-recovery.md)
  - Established the approved recovery and security requirements.
```

Each brainstorm that produces approved behavior contains:

```markdown
## Resulting specifications

- **Produced:** [Password reset](../../specs/authentication/password-reset/README.md)
  - Contains the approved behavior resulting from this discovery.
```

These links are required in both directions when the relationship exists. The
absence of a source, tag, or alias does not affect them.

### 10.4 Optional aids

`Status`, validity guidance, `Tags`, `Sources`, and `Aliases` are optional for
every document.

- Use `Aliases` when alternate names, acronyms, stakeholder language, system
  names, or business terms improve discovery.
- Use `Tags` sparingly for cross-cutting concepts not already clear from the
  folder, title, or links.
- Use `Sources` when evidence or provenance will help a future reader
  understand or verify the document.
- Use a human-readable validity note or review date when knowledge is expected
  to change and a future agent should recheck it.

Do not add empty placeholders.

Two optional review forms are supported:

```text
Review after: 2027-01-01
Review when: The project upgrades to Salesforce API version 68.
```

The main agent may propose one only when the information has a real,
explainable validity horizon. The owner may approve, edit, reject, or request
the signal directly. The memory agent does not add arbitrary review cadences.

After the date passes or the event occurs, an agent verifies the information
before relying on it when the current task depends on it. The signal does not
automatically make the document false, expired, or superseded. It schedules no
background agent or automated write.

### 10.5 Mandatory structural links

Only these links are mandatory:

1. Every specification links to each brainstorm that informed it, and each
   brainstorm links to every resulting specification.
2. A superseded document links to its replacement, and the replacement links
   back to the superseded document.
3. A capability's canonical specification `README.md` links to each supporting
   specification file, and each supporting file links back to the canonical
   `README.md`.
4. The nearest index links one-way to every durable document it owns.
5. A document links one-way to the canonical home of any definition or approved
   behavior it would otherwise restate. The link is owed precisely because the
   copy was not written.

All other relationships are optional. If a reciprocal link requires editing
another file, the memory librarian may include that routine link maintenance
within the approved content update. If the relationship would change meaning
or authority, supersede information, or cause a risky or large structural
change, the main agent must make it visible in the proposal first.

## 11. History, correction, and supersession

### 11.1 Current specifications

The canonical specification describes current approved behavior. Correct or
update it in place when behavior changes. Git preserves the exact prior version.

Routine revisions do not require:

- a specification changelog;
- a copied archive document;
- version suffixes such as `final-v2-new`; or
- a decision record.

### 11.2 Historically important changes

Create or update a decision record when the rationale for a significant change
will help future work. The decision explains the choice and consequences rather
than reproducing an entire old specification.

Keep old behavior in the current specification when it remains supported,
deployed, or relevant for migration or compatibility.

### 11.3 Supersession

When a durable decision or knowledge document is no longer current but remains
important to understand:

1. mark it `Status: Superseded`;
2. add a prominent link to its replacement;
3. link the replacement back to the superseded document; and
4. remove it from current index listings or label it clearly.

Do not leave contradictory documents marked current.

## 12. Parallel-session and Git behavior

### 12.1 Worktree boundary

Every active main-agent session uses its own worktree and branch. A memory agent
inherits that exact worktree boundary from its main agent.

It must confirm the repository location before writing and must not assume the
primary checkout is safe.

### 12.2 Pull-request boundary

Task-related code, tests, specifications, and memory normally travel in the same
pull request.

Documentation-only pull requests are appropriate for:

- a pure brainstorming or requirements session;
- a project or milestone review with no code change;
- a brownfield documentation backfill; or
- standalone memory reorganization.

V3 does not automatically commit, push, open a pull request, merge, or clean up
a worktree. Existing Git workflow rules own those actions.

### 12.3 Concurrent edits

Two branches may legitimately update the same current document. Git exposes the
overlap. The later integration must reconcile both changes against current
truth and must not discard one branch merely to make the conflict disappear.

No separate concurrency engine, lock service, or memory database is required.

## 13. Greenfield setup

V3 is one optional but coherent toolkit system. When the owner selects it, the
shared rule, memory-librarian role, Claude and Codex routes, and complete root
schema install together. The setup flow does not offer broken partial variants
that omit the instructions or role required to use the documents correctly.
Other toolkit systems remain independently selectable.

For a new project, `project-init`:

1. learns the project purpose, stack, and initial system areas;
2. offers v3 as an opt-in system;
3. explains the authority boundaries in plain language;
4. shows the exact root files and folders it proposes;
5. creates the complete v3 roots and indexes plus the needed project-specific
   system areas;
6. installs the shared rule and memory-agent role;
7. adds compact routes to `CLAUDE.md` and `AGENTS.md`;
8. connects the work-tracker without duplicating its state;
9. offers an initial memory pass; and
10. offers `grill-me` for structured discovery.

The initial memory pass is the default final setup offer. It may turn the
project explanation into proposed context, planning, known system areas, and
already-established requirements. The owner reviews those proposals before the
memory agent writes them.

## 14. Brownfield adoption

For an existing project, `project-sync` first performs a read-only audit.

It inventories:

- current specifications and design documents;
- architecture, domain, runbook, ADR, reference, and project-context homes;
- current Claude and Codex instructions;
- work-tracker location and authority;
- indexes and cross-links;
- likely duplicates or contradictions; and
- optional repository-analysis outputs such as Graphify maps.

It recommends one treatment per existing source:

1. **Keep and link.** The existing home already works.
2. **Move with approval.** A v3 home is clearer and links can be updated safely.
3. **Consolidate with approval.** Overlapping documents should become one
   current truth.
4. **Leave unresolved.** Evidence is insufficient to classify safely.

No existing document is moved, rewritten, deleted, or declared current without
owner approval. No legacy memory store is automatically imported as truth.
Raw meetings, communications, deliverables, and other project records remain in
their canonical project artifact homes unless the owner separately approves a
scaffolding change.

After the audit, `project-sync` offers an initial memory pass. It proposes a
project map based on observed evidence, labels material inference and unknowns,
and offers `grill-me` for intent or context the repository cannot establish.
It does not silently turn audit findings into current specifications or memory.

## 15. Failure and ambiguity behavior

- If the destination is unclear, recommend the best location and explain why.
- If approval is unclear, ask before writing.
- If current documents conflict, surface the conflict.
- If a link target is missing, include a repair in the approved change or
  report it.
- If a proposal is not approved before the task ends, leave canonical memory
  and specifications unchanged.
- If there is no useful durable update, say so and do not manufacture one.
- If the memory agent is unavailable, report that the approved documentation
  update remains pending rather than silently pretending the specialized write
  occurred.
- If the worktree is unclear, stop before writing.

## 16. Privacy and repository boundaries

V3 memory is local to the adopting project repository. Installing, refreshing,
or synchronizing the toolkit does not import memory from another project or
export project memory back to the toolkit. The toolkit supplies the reusable
system, not a shared memory pool.

V3 must not store:

- passwords, tokens, credentials, or secrets;
- private personal information that does not belong in the repository;
- raw chat transcripts;
- proprietary source material the project cannot redistribute; or
- temporary debug output with no durable value.

Operational guidance may describe where a secret is obtained and how it is
used without storing the secret.

## 17. Acceptance criteria

V3 is ready to ship only when:

1. New projects can opt into the complete structure without receiving
   unnecessary empty area trees.
2. Existing projects can be audited and adopted without automatic moves,
   duplication, or unverified truth.
3. `CLAUDE.md` and `AGENTS.md` route both agents to the same canonical shared
   rule and compact folder map.
4. Both platforms can invoke a memory-agent role that reads the same schema.
5. A cold Claude session and a cold Codex session can locate the same relevant
   current specification and related memory.
6. `brainstorms/` uses one flat, indexed collection while `specs/` uses stable
   system-area and capability folders.
7. Every specification uses its own capability folder with one canonical
   `README.md`.
8. Specifications link to all applicable brainstorms, and those brainstorms
   link to their resulting specifications.
9. Context, planning, decisions, knowledge, references, domain material, and
   operations have readable, flexible schemas.
10. Every durable document has a title, one-sentence summary, type-specific
    content, contextual links when useful, and a descriptive index entry.
11. Status, validity, tags, sources, and aliases remain optional. A review
    signal requires owner approval and never expires a document automatically.
12. Mandatory links are limited to brainstorm/specification,
    superseded/replacement, canonical/supporting-specification, and
    index-to-owned-document relationships. Other links and `Related` sections
    remain optional.
13. Work-tracker remains authoritative for live work state.
14. Planning can link to work items without mirroring their status.
15. Authorized requirement changes align specification, code, and tests in the
    same task and normally the same pull request.
16. Completion reviews occur only at the approved trigger points.
17. The main agent can recommend any useful number of updates in plain
    language.
18. The owner can approve, select, edit, combine, defer, or skip proposals in
    normal language.
19. The memory agent writes only approved content in the requesting session's
    worktree and updates necessary indexes and backlinks.
20. The main agent reviews the memory-agent diff before task completion.
21. Parallel edits are reconciled through Git rather than an external
    concurrency service.
22. Current specifications show current behavior, Git retains exact history,
    and decision records preserve only important rationale.
23. The core requires no database, memory MCP server, embeddings, transcript
    capture, or scheduled curation, and installs no hooks of its own.
24. Installation and sync explain exact proposed changes before acting.

## 18. Explicit exclusions

V3 does not include:

- a database, Worker, hosted memory service, or memory MCP server;
- embeddings, semantic retrieval, or a generated knowledge graph;
- hooks or scripts that capture, recall, place, or write memory;
- transcript collection or per-message memory;
- a background or autonomous curator;
- deterministic classification or natural-language parsing;
- mandatory metadata fields;
- a fixed proposal count;
- automatic Git or deployment actions; or
- a replacement for work-tracker.

A hook that enforces a rule or starts the durable review at a completion point
is not excluded. It writes no memory and approves nothing, so every approval
boundary in this specification holds unchanged. Such hooks ship from the
`hooks-library` plugin, not from the memory core.

Graphify or another repository-analysis tool may assist a separately approved
brownfield mapping exercise. It is not required by v3 and its output is not
automatically authoritative.

## External design references

- [Open Knowledge Format v0.2](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
  - Supports Markdown and Git, progressive indexes, path-based identity,
    structured bodies, prose-qualified links, and optional provenance,
    lifecycle, and freshness. V3 adapts those ideas without claiming OKF
    conformance or adopting mandatory YAML, trust tiers, attestation, or
    runtime tooling.

## Brainstorms that informed this specification

- [Second-brain v3 project memory discovery](../../brainstorms/2026-07-28-second-brain-v3-project-memory.md)
  - Defines planning, brainstorm/spec relationships, optional metadata, the
    memory agent, worktree behavior, review timing, and history policy.

## Related

- [Second-brain v3 overview](README.md)
  - Summarizes this technical design visually.
- [Markdown schemas](MARKDOWN-SCHEMAS.md)
  - Gives readable examples for each project document type.
- [Toolkit integration](TOOLKIT-INTEGRATION.md)
  - Maps the design into the reusable plugins and project setup flows.

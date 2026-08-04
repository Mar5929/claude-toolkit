# Project memory and knowledge

This file is the canonical operating rule for second-brain v3. Claude, Codex,
the main agent, and the memory librarian all use it.

The committed Markdown files and Git history are the system. There is no
separate memory database, MCP memory server, embedding index, transcript store,
or background curator.

Nothing reaches curated memory automatically. Every specification or memory
write is approved by the owner and performed by the memory librarian. The one
raw-capture exception is an owner-invoked `grill-me` interview, which checkpoints
the non-authoritative brainstorm and its index as the interview runs. A hook may
enforce a rule or start a review at the right moment. A hook never decides what
is true, writes a document, or approves its own proposal.

## Authority map

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
| Where is a raw meeting, transcript, communication, deliverable, or source artifact? | The project's ordinary artifact scaffolding |
| What is active, next, blocked, related, or landed? | The configured work tracker |
| What did an earlier version say? | Git history |

One truth has one canonical home. Link to it instead of copying a second version
that can drift.

## AI judgment

Claude or Codex decides what is relevant to read, what is durable, and how an
approved update fits the human-readable schema. These instructions provide
strong guidance and examples, not a hard-coded semantic classifier, closed
relationship vocabulary, or natural-language approval parser.

## Read before relevant work

When a task changes system behavior or depends on project history:

1. Read the root instruction file and this rule.
2. Start with the relevant root and system-area indexes.
3. Read the applicable current capability specification.
4. Follow only the related links useful to this task.
5. Search repository text when the correct area or document is uncertain.
6. Report conflicting current truth before relying on either version.

Do not load every memory file in every session. The owner's request, current
work item, changed files, indexes, and specifications guide relevance.

## Write authority

The main agent must invoke the memory librarian after any of these supplies
clear authority to write:

- the owner approved a durable-update proposal;
- the owner clearly requested a specification or memory change;
- the owner approved behavior during design and the specification must reflect
  it; or
- the owner clearly said `remember this`, `save this`, or equivalent.

A clear remember request approves the identified content. It does not require a
second filing approval. If the content or intended meaning is unclear, ask one
focused question or propose the specific durable takeaway.

**Asking the owner a yes-or-no question is not approval.** They approve the
proposal they were shown, not a promise to write something later. If the words
that would be written are not in front of them, there is nothing to approve yet.
Show the proposal first, in the shape below, and invoke the librarian only after
they answer it.

The main agent does not silently write specifications or memory itself. The
memory librarian performs the approved Markdown update and routine organization.
The main agent reviews the resulting diff and remains responsible for the task.

## Completion review

Review for durable updates only:

- when a substantial task request is complete, at the moment its pull request is
  opened. The pull request does not wait for the owner's answer: it opens with
  the code in it, its description says what the review found, and the approved
  memory is committed to the same branch before it is merged;
- at the end of a brainstorming or requirements interview; and
- at the end of a milestone or project phase; or
- at another natural stopping point after meaningful work, when the owner ends
  or pauses the task and the work produced a settled durable result.

Do not require a review merely because:

- unfinished work is handed to another session;
- a response or commit ends; or
- a trivial action finishes.

One review may satisfy several completion points. Do not repeat an unchanged
review merely because the chat, commit, and pull-request steps happen close
together. Review again only when later work produces or changes a durable
conclusion.

A hook may start the review at one of the completion points above, by holding
the command that opens a pull request until the review is raised. That is the
hook doing the remembering, not a new trigger: the review it starts is the same
review, and the owner still approves every proposal it produces. The hook only
sees commands typed in the terminal, so this rule and `wrap-up-ritual.md` are
the backup for every pull request it cannot see.

Ask:

1. Did approved behavior change, and are specification, code, and tests
   aligned?
2. Did the work produce durable context, planning, a significant decision,
   reusable knowledge, a valuable reference, domain understanding, or an
   operating procedure?
3. Is it already captured in its canonical home?
4. Which new or amended documents would help future work?
5. Which indexes or relationships need routine maintenance?

Report in plain language, as a table the owner can scan in one pass. Number the
rows so they can answer with a number:

```markdown
Already incorporated: <approved specification or memory changes already made
during this task, or "nothing">

What to save to memory (3 items)

| # | What it says | Where it goes | Why it helps |
|---|---|---|---|
| 1 | A pull request never waits on the memory question. It opens, and the owner's answer is added to it before merge. | memory/decisions/ | Stops future sessions parking finished work overnight |
| 2 | SessionEnd cannot stop a /clear or speak to the agent. | memory/knowledge/ | Saves rediscovering why the clear moment needs a rule, not a hook |
| 3 | RISKY: replaces the current handoff rule | memory/decisions/ | Two installed rules say the opposite today |

Approve all, tell me which to cut, or edit any row.
```

The four things the owner needs are all there, as columns rather than bullets:
where it goes, what it says, why it helps future work, and a flag on anything
risky or large. A risky or large structural change is marked in its own row, in
words, so it cannot be approved by accident.

When nothing should be added, say so plainly in one line and show no table.

There is no proposal count limit and no required approval phrase. The owner may
approve all, approve selected rows, edit a row, combine, defer, or skip them in
normal language. An edited row is written as the owner edited it, not as it was
proposed.

A deferred proposal is not an approved write and does not create a second-brain
queue. Leave the durable documents unchanged. If the owner wants the possible
update tracked for later, use the project's normal work tracker.

## Structural-change boundary

After content approval, the memory librarian handles routine placement in an
existing typed home, creates the document, updates its nearest index, and
maintains mandatory structural links.

The main agent must visibly propose a structural change when it could:

- remove durable information;
- change meaning, authority, or canonical ownership;
- disrupt an established path or incoming links;
- reorganize many documents;
- split or merge durable documents;
- supersede current guidance; or
- create a new top-level system area, specification type, or memory type.

Use judgment. There is no hard-coded file-count threshold. When uncertain,
show the change to the owner.

Deletion, movement, splitting, merging, and supersession are maintenance tools,
not forbidden operations. The librarian may perform them after the exact
meaning-changing or destructive work is visible and owner-approved.

## Requirement changes

Specifications own current approved behavior. Code and tests implement and
verify it.

When an authorized task changes required behavior, update the applicable
specification, code, and tests together in the same task and normally the same
pull request. Do not treat an exploratory brainstorm statement as approved
behavior.

## Shared durable-document contract

Every durable specification and memory document has:

1. a descriptive title;
2. a one-sentence summary immediately after the title;
3. a type communicated by its folder path;
4. content shaped for that information type;
5. contextual relationships when they materially help; and
6. a one-sentence description in the nearest `README.md` index.

Headings may adapt when clearer language helps. Do not impose YAML frontmatter
or a machine schema.

`Status`, `Review after`, `Review when`, `Tags`, `Sources`, and `Aliases` are
optional. Do not add empty placeholders.

`Basis` is mandatory on every `memory/knowledge/` and `memory/domain/` document
and optional elsewhere. See `Evidence and certainty`.

`Status: Superseded` is mandatory when a replaced document is retained. A
review signal requires owner approval and a real explainable validity horizon.
Reaching its date or event means verify before relying, not automatic
expiration or rewriting.

## Indexes

### Purpose

Indexes provide progressive disclosure. They explain what a folder owns, what
it does not own, which documents are current, and what each document covers.

### Use when

Every root, specification area, memory type, and populated memory area uses a
`README.md` index. A memory area becomes populated when it owns its first durable
document, so create that area's index in the same change as the first document.

### Do not use when

Do not copy whole documents, live ticket state, or change history into an
index.

### Requirement

The nearest index must link one way to every durable document it owns, with a
one-sentence description.

### Authority

The linked document remains canonical. The index is navigation.

### Good

`Why reset links expire after a fixed period.`

### Avoid

An entry containing only `reset-token-lifetime.md`.

## Brainstorms

### Purpose

Preserve interviews, exploration, alternatives, unknowns, and owner wording.

### Use when

Requirements or design are still being discovered, or the owner invokes
`grill-me`.

### Do not use when

The behavior is already approved and belongs in a specification, or the
content is a routine raw meeting record with another project home.

### Requirement

Optional, except an invoked `grill-me` session creates and checkpoints one.
Brainstorms stay in one flat dated collection under `brainstorms/`.

### Authority

Non-authoritative input. A brainstorm never overrides a specification.

### Good

A requirements interview containing options and open questions.

### Avoid

Implementing one exploratory answer as approved behavior.

## Specifications

### Purpose

Define current approved product and system behavior.

### Use when

A capability, system boundary, observable behavior, constraint, or acceptance
expectation is approved.

### Do not use when

Capturing exploration, implementation trivia, ticket status, or a source.

### Requirement

Each capability uses `specs/<system-area>/<capability>/README.md` as its one
canonical entry point. Supporting files are optional.

### Authority

Specifications own what the system should do. Code and tests implement and
verify it.

### Good

Approved territory-assignment behavior with edge cases and acceptance.

### Avoid

A transcript of candidate assignment approaches.

## Supporting specification files

### Purpose

Keep a substantial capability specification readable.

### Use when

User flows, data models, interfaces, security, or migration details benefit
from a focused document.

### Do not use when

A short section in the canonical `README.md` is clearer.

### Requirement

Optional. Each supporting file links to the canonical `README.md`, and that
README links back.

### Authority

The capability `README.md` remains the canonical entry point.

### Good

`data-model.md` for a multi-entity assignment model.

### Avoid

`requirements-continued.md` that creates another overview.

## Context

### Purpose

Preserve durable circumstances, stakeholders, constraints, boundaries, and
conditions needed to interpret future work.

### Use when

The information affects several tasks or explains why work must be understood
a certain way.

### Do not use when

The information is a current task, next action, blocker, or temporary handoff.

### Requirement

Optional.

### Authority

Context explains circumstances. It does not define behavior or work status.

### Good

A client identity-provider restriction affecting authentication.

### Avoid

`Alice is implementing ticket 42 this week.`

## Planning

### Purpose

Preserve vision, goals, roadmap, milestones, timeline, strategic dependencies,
durable risks, and assumptions.

### Use when

Direction or sequence matters beyond one ticket.

### Do not use when

Recording ticket status, assignments, operational blockers, or a handoff.

### Requirement

Optional.

### Authority

Planning owns high-level direction. Work-tracker owns execution state.

### Good

A product roadmap linking milestones to their work-item epics.

### Avoid

Copying every ticket and current status into the roadmap.

## Decisions

### Purpose

Preserve an important choice and rationale future work may need.

### Use when

Understanding why a non-obvious choice was made will prevent confusion,
reversal, or repeated debate.

### Do not use when

The choice is routine, temporary, obvious from the specification, or useful
only inside one ticket.

### Requirement

Optional.

### Authority

A decision owns rationale. The specification owns required behavior.

### Good

Why territory assignment uses an asynchronous engine.

### Avoid

A decision file for renaming one local variable.

## Knowledge

### Purpose

Preserve reusable, non-obvious technical or project understanding.

### Use when

The information prevents a likely mistake, explains a failure mode, or helps
several future tasks.

### Do not use when

The fact is obvious from nearby code, temporary debugging output, or belongs in
a specification or decision.

### Requirement

Optional.

### Authority

Knowledge explains what is understood and how to apply it. It does not
authorize product behavior.

### Required basis line

Every knowledge document carries a `Basis:` line directly under its
one-sentence summary. `Evidence and certainty` lists the allowed values.

### Good

Test-environment email delivery differs from production.

### Avoid

A list of every function in a module.

## References

### Purpose

Explain why an internal or external source matters and what it supports.

### Use when

A source is external or needs durable project-specific context.

### Do not use when

A raw artifact already has a clear project home and can be linked directly.

### Requirement

Optional.

### Authority

A reference is supporting evidence, not automatic current truth.

### Good

A note explaining which vendor documentation supports a constraint.

### Avoid

Copying a complete vendor document or meeting transcript.

## Domain

### Purpose

Preserve business language, actors, concepts, policies, rules, and examples.

### Use when

Project participants use a term or business rule an agent could misunderstand.

### Do not use when

Defining product behavior, technical implementation, or a temporary assignment.

### Requirement

Optional.

### Authority

Domain defines business meaning. Specifications define system behavior using
that meaning.

### Required basis line

Every domain document carries a `Basis:` line directly under its one-sentence
summary. `Evidence and certainty` lists the allowed values.

### Good

The client-specific meaning of `account owner`.

### Avoid

A generic dictionary definition unrelated to the project.

## Operations

### Purpose

Explain how to operate, release, support, recover, or verify the system safely.

### Use when

A repeatable procedure and its verification or recovery evidence will help
future work.

### Do not use when

Tracking a deployment ticket, storing secrets, or defining required product
behavior.

### Requirement

Optional.

### Authority

Operations owns procedures. Specifications own the behavior they preserve.

### Good

Credential rotation steps with verification and recovery.

### Avoid

A pasted deployment transcript containing temporary output.

## Optional document aids

### Status

- **Purpose:** Prevent draft or replaced content from appearing current.
- **Use when:** Lifecycle is not obvious, especially for draft or superseded
  material.
- **Do not use when:** It adds no signal to a plainly current document.
- **Requirement:** Optional for current documents. Mandatory for retained
  superseded material.
- **Authority:** Describes lifecycle, not history.
- **Good:** `Status: Superseded` followed by a replacement link.
- **Avoid:** Inventing a workflow of many memory statuses.

### Review after and review when

- **Purpose:** Warn that time-sensitive information needs verification after a
  real date or event.
- **Use when:** A contract, policy, platform release, deprecation, or migration
  creates a validity horizon.
- **Do not use when:** There is no foreseeable change or the cadence is
  arbitrary.
- **Requirement:** Optional and owner-approved.
- **Authority:** Requests verification. It does not expire the document.
- **Good:** `Review when: The project upgrades to Salesforce API version 68.`
- **Avoid:** `Review after: 90 days` with no reason.

### Aliases

- **Purpose:** Support real alternate names, acronyms, legacy names, or
  stakeholder terminology.
- **Use when:** People genuinely use several names for one concept.
- **Do not use when:** Adding general keywords or repeating the title.
- **Requirement:** Optional.
- **Authority:** Improves retrieval. The title remains canonical.
- **Good:** `Aliases: Territory engine, assignment service`.
- **Avoid:** `Aliases: Salesforce, code, important`.

### Tags

- **Purpose:** Identify a meaningful cross-cutting concern not already clear
  from path, title, or links.
- **Use when:** Security, privacy, customer data, or another concern spans
  several areas or types.
- **Do not use when:** Repeating the type, area, title, or every keyword.
- **Requirement:** Optional.
- **Authority:** Aids discovery, not placement or authority.
- **Good:** `Tags: Customer-data, security`.
- **Avoid:** `Tags: Knowledge, authentication, password-reset`.

### Sources and claim attribution

- **Purpose:** Preserve evidence or provenance when it improves confidence,
  verification, or maintenance.
- **Use when:** A technical, vendor, legal, regulatory, or business claim
  depends on an identifiable source.
- **Do not use when:** It adds no useful verification or duplicates a canonical
  raw artifact.
- **Requirement:** Optional.
- **Authority:** Supports a claim but does not make it current or approved.
- **Good:** An inline link beside a vendor-specific claim.
- **Avoid:** A large unexplained URL list in every document.

## Evidence and certainty

### Purpose

Prevent observed behavior, agent inference, owner-confirmed intent, and
unresolved unknowns from being mistaken for one another.

### Use when

The distinction could change a requirement, decision, migration, risk
assessment, or implementation.

### Do not use when

The basis is already obvious and does not affect reliance.

### Requirement

Contextual in prose. Required whenever confusing the categories could mislead
future work. No metadata label is required on every paragraph.

Mandatory in one place: every knowledge and domain document carries a `Basis:`
line directly under its one-sentence summary. Those two types hold conclusions
rather than approved behavior, so a later reader cannot tell where the content
came from unless the document says so.

### Allowed basis values

- `Basis: Observed` when it was seen directly in the repository, configuration,
  or running system.
- `Basis: Owner-confirmed <YYYY-MM-DD>` when the owner or a named stakeholder
  stated it on that date.
- `Basis: Source` when an external, vendor, or regulatory document supports it.
  Link the source or its reference document.
- `Basis: Inferred, unconfirmed` when an agent concluded it and nobody has
  checked it yet.

Add a short clause after the value when the exact file, person, or source helps:
`Basis: Observed in force-app/main/default/classes/InvoiceRetry.cls`.

An unconfirmed document is still worth keeping. Promote it by editing the line
once someone checks the inference, and record what confirmed it in the same
edit.

### Authority

Repository evidence can establish observed behavior but not owner intent. An
inference remains an inference until supported or confirmed. A basis value never
raises a document above its type: an owner-confirmed knowledge document still
does not authorize product behavior.

### Good

`Basis: Owner-confirmed 2026-07-31` above a paragraph reading `Observed in the
current code: invoice retries are manual. The owner confirmed that this behavior
remains supported.`

### Avoid

Writing `Manual invoice retries are required` based only on legacy code, or
stamping `Basis: Owner-confirmed` on a conclusion the owner never saw.

## Repetition

### Purpose

Separate the repetition that keeps the system navigable from the repetition
that creates a second version to drift.

### Use when

You are about to write something another document already owns.

### Do not use when

The content has no home yet. Then this document is the home.

### Requirement

Three kinds of repetition, three different answers:

1. **A second copy of the content.** Not allowed. Write the pointer instead of
   the copy. `Relationships` item 5 makes that link mandatory.
2. **A deliberate copy an agent must have before it can open anything.** The
   routing schema in `CLAUDE.md` and `AGENTS.md` is the example. Allowed only
   for that reason, only where the system requires it, and only when the copy
   says it is a copy, names its canonical home, is updated in the same change,
   and loses to that home on disagreement.
3. **A one-sentence description of where content lives.** Required. That is
   what an index entry and a link's reason line are, and it is not a copy.

Finding an existing duplicate is not authority to delete it. Report it and
propose the repair, because removing durable information is a visible change.

### Authority

The canonical home stays canonical. A pointer, a labeled copy, or a
one-sentence description never becomes a second authority.

### Good

`The reset window is set by the reset-token lifetime decision.`

### Avoid

Restating the window and its rationale in a knowledge document, so a later
change to the decision leaves two answers and no way to tell which is current.

## Relationships

### Purpose

Connect documents when the relationship improves understanding, verification,
navigation, or action.

### Use when

Another document governs, constrains, supports, explains, informed, replaces,
or implements this document.

### Do not use when

The documents merely share a folder or topic, or the link exists only to make a
graph look complete.

### Requirement

Optional. Only these links are mandatory:

1. a specification and every brainstorm that informed it, both directions;
2. a superseded document and its replacement, both directions;
3. a canonical capability `README.md` and each supporting specification file,
   both directions;
4. the nearest index to every durable document it owns, one direction; and
5. the canonical home of any definition or approved behavior this document
   would otherwise restate, one direction. See `Repetition`.

No empty `Related` section is required. Item 5 exists because the alternative
is a second copy that drifts, not because the corpus should look connected.
Every mandatory link uses descriptive link text or nearby prose that says why
the destination matters. This does not require a fixed label or two-line link
format.

### Authority

A link does not transfer authority. Its prose explains why the destination
matters.

### Good

```markdown
- **Governed by:** [Ownership decision](../../../memory/decisions/assignment/ownership.md)
  - Explains why reassignment preserves the original owner.
```

Labels are plain description, not a fixed vocabulary. `Governed by`, `Grounded
in`, `Constrains`, `Supports`, `Affects`, `Used by`, `Informed by`, `Delivered
through`, `Supersedes`, and `Superseded by` are labels that have proved useful.
Write a clearer one when one exists.

### Avoid

A bare filename or a reciprocal link that adds no useful path.

## History and supersession

The canonical specification describes current approved behavior. Update it in
place. Git preserves exact prior versions.

Do not require a specification changelog, archived copy, version suffix, or
decision record for routine changes. Create a decision record only when the
rationale for an important change will help future work.

When a durable decision or knowledge document is no longer current but remains
important:

1. mark it `Status: Superseded`;
2. add a prominent link to its replacement;
3. link the replacement back; and
4. keep it in its nearest index under a clearly labeled superseded section.

Do not leave contradictory documents marked current.

## Pre-merge parallel-memory review

Before a pull request containing specification or memory changes merges, first
bring its branch current through the project's existing Git workflow. The main
agent then invokes the memory librarian for a read-only comparison of the
changed durable documents and indexes against the latest project state.

The librarian uses judgment to look for truths that parallel branches placed in
different canonical files and for conflicting current guidance that Git could
merge without a text conflict. A clean Git merge is not proof that the memory is
semantically consistent.

If the review finds a duplicate or conflict, report both paths and the specific
truth that overlaps or disagrees. Do not discard either branch's information.
Any deletion, consolidation, move, split, or supersession needed to repair it
uses the normal visible structural-change approval. If nothing is found, report
that plainly. This review does not fetch, merge, commit, push, or open pull
requests; the Git workflow owns those actions.

## Worktree and Git boundary

Every active session works in its own worktree and branch. The memory librarian
writes only in that same worktree.

Task-related code, tests, specifications, and approved memory normally use one
pull request. A discovery-only or memory-maintenance session may use a
documentation-only pull request.

Second-brain does not automatically commit, push, open or merge pull requests,
deploy, or clean up worktrees. The project's Git workflow owns those actions.

## Project-local and privacy boundary

Each project repository owns its specifications and memory. Do not copy client
or project content into the toolkit, another project, or a shared store
automatically.

Do not store:

- passwords, tokens, credentials, or secrets;
- private personal information that does not belong in the repository;
- raw chat transcripts;
- proprietary source material the project cannot redistribute; or
- temporary debug output with no durable value.

Operational guidance may explain how to obtain or use a secret without storing
the secret.

Retired v1 Worker, Neon, curator, outbox, cache, and hook content is not v3
truth. Do not read, import, or use it as a migration source.

## Failure behavior

- If placement is unclear, recommend the best location and explain why.
- If approval is unclear, ask before writing.
- If current documents conflict, surface the conflict.
- If a link target is missing, include repair in the approved change or report
  it.
- If a proposal is not approved, leave canonical documents unchanged.
- If a proposal is deferred, leave canonical documents unchanged and create no
  second-brain queue.
- If nothing durable should be added, say so.
- If an approved update cannot be completed, do not replace the librarian with
  an ad hoc main-agent write. Retry or report the failure, keep the task
  unfinished, and do not merge as though the update succeeded unless the owner
  explicitly waives it. This does not prevent the pull request from opening
  under the project's normal workflow.
- If the worktree is unclear, stop before writing.

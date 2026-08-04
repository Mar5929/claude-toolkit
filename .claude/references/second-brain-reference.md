# Second-brain reference: what each home is for

Open this when the routing is genuinely unclear, not on every save. The
always-loaded procedure is `second-brain-rule.md`, and it wins if the two ever
disagree.

Each home below says what it is for, when to use it, when not to, what it owns,
and one example each way. Then come the four rules that apply across all of
them: evidence, repetition, links, and superseding.

Claude, Codex, and the memory verifier all use judgment over these. None of it
is a hard-coded classifier, a closed relationship vocabulary, or a
natural-language approval parser.

## Contents

- [Indexes](#indexes)
- [Brainstorms](#brainstorms)
- [Specifications](#specifications)
- [Supporting specification files](#supporting-specification-files)
- [Context](#context)
- [Planning](#planning)
- [Decisions](#decisions)
- [Knowledge](#knowledge)
- [References](#references)
- [Domain](#domain)
- [Operations](#operations)
- [Optional document aids](#optional-document-aids)
- [Evidence and certainty](#evidence-and-certainty)
- [Repetition](#repetition)
- [Relationships](#relationships)
- [History and supersession](#history-and-supersession)

## Indexes

**Purpose.** Let a reader see what a folder holds without opening everything in
it. An index explains what the folder owns, what it does not own, which
documents are current, and what each one covers.

**Use for** every root, specification area, memory type, and populated memory
area. A memory area becomes populated when it owns its first durable document,
so its index is created in the same change as that document.

**Do not use for** whole documents copied in, live ticket state, or change
history.

**Requirement.** The nearest index links one way to every durable document it
owns, with a one-sentence description. That list is built from the documents by
the index builder. The prose around it, saying what the folder owns and does
not own, is written by hand.

**Authority.** The linked document stays canonical. The index is navigation.

**Good:** `Why reset links expire after a fixed period.`
**Avoid:** an entry containing only `reset-token-lifetime.md`.

## Brainstorms

**Purpose.** Keep interviews, exploration, alternatives, unknowns, and the
owner's own wording.

**Use when** requirements or design are still being discovered, or the owner
invokes `grill-me`.

**Do not use when** the behavior is already approved, which is a specification,
or the content is a routine raw meeting record with another home in the project.

**Requirement.** Optional, except that an invoked `grill-me` session creates and
checkpoints one. Brainstorms stay in one flat dated collection under
`brainstorms/`.

**Authority.** Non-authoritative input. A brainstorm never overrides a
specification.

**Good:** a requirements interview holding options and open questions.
**Avoid:** building one exploratory answer as though it were approved behavior.

## Specifications

**Purpose.** Define current approved product and system behavior.

**Use when** a capability, system boundary, observable behavior, constraint, or
acceptance expectation is approved.

**Do not use for** exploration, implementation trivia, ticket status, or a
source.

**Requirement.** Each capability uses `specs/<system-area>/<capability>/README.md`
as its one canonical entry point. Supporting files are optional.

**Authority.** Specifications own what the system should do. Code and tests
implement and verify it.

**Good:** approved territory-assignment behavior with its edge cases and
acceptance.
**Avoid:** a transcript of candidate assignment approaches.

## Supporting specification files

**Purpose.** Keep a substantial capability specification readable.

**Use when** user flows, data models, interfaces, security, or migration detail
would be clearer in a focused document.

**Do not use when** a short section in the canonical `README.md` is clearer.

**Requirement.** Optional. Each supporting file links to the canonical
`README.md`, and that README links back.

**Authority.** The capability `README.md` stays the canonical entry point.

**Good:** `data-model.md` for a multi-entity assignment model.
**Avoid:** `requirements-continued.md`, which creates a second overview.

## Context

**Purpose.** Keep durable circumstances, stakeholders, constraints, boundaries,
and conditions needed to read future work correctly.

**Use when** the information affects several tasks or explains why work has to
be understood a certain way.

**Do not use for** a current task, a next action, a blocker, or a temporary
handoff.

**Authority.** Context explains circumstances. It does not define behavior or
work status.

**Good:** a client identity-provider restriction that affects authentication.
**Avoid:** `Alice is implementing ticket 42 this week.`

## Planning

**Purpose.** Keep vision, goals, roadmap, milestones, timeline, strategic
dependencies, durable risks, and assumptions.

**Use when** direction or sequence matters beyond one ticket.

**Do not use for** ticket status, assignments, operational blockers, or a
handoff.

**Authority.** Planning owns high-level direction. The work tracker owns
execution state.

**Good:** a product roadmap linking milestones to their work-item epics.
**Avoid:** copying every ticket and its current status into the roadmap.

## Decisions

**Purpose.** Keep an important choice and the reasoning behind it.

**Use when** knowing why a non-obvious choice was made will prevent confusion, a
reversal, or the same debate again.

**Do not use when** the choice is routine, temporary, obvious from the
specification, or useful only inside one ticket.

**Authority.** A decision owns the reasoning. The specification owns the
required behavior.

**Good:** why territory assignment uses an asynchronous engine.
**Avoid:** a decision file for renaming one local variable.

## Knowledge

**Purpose.** Keep reusable, non-obvious technical or project understanding.

**Use when** the information prevents a likely mistake, explains a failure mode,
or helps several future tasks.

**Do not use when** the fact is obvious from nearby code, is temporary debugging
output, or belongs in a specification or a decision.

**Authority.** Knowledge explains what is understood and how to apply it. It
does not authorize product behavior.

**Good:** test-environment email delivery differs from production.
**Avoid:** a list of every function in a module.

## References

**Purpose.** Explain why an internal or external source matters and what it
supports.

**Use when** a source is external, or needs durable project-specific context.

**Do not use when** a raw artifact already has a clear home in the project and
can simply be linked.

**Authority.** A reference is supporting evidence, not automatic current truth.

**Good:** a note explaining which vendor documentation supports a constraint.
**Avoid:** copying a whole vendor document or meeting transcript.

## Domain

**Purpose.** Keep business language, actors, concepts, policies, rules, and
examples.

**Use when** people on the project use a term or business rule an agent could
misread.

**Do not use for** product behavior, technical implementation, or a temporary
assignment.

**Authority.** Domain defines business meaning. Specifications define system
behavior using that meaning.

**Good:** the client-specific meaning of `account owner`.
**Avoid:** a generic dictionary definition unrelated to the project.

## Operations

**Purpose.** Explain how to operate, release, support, recover, or verify the
system safely.

**Use when** a repeatable procedure and its verification or recovery will help
future work.

**Do not use for** tracking a deployment ticket, storing a secret, or defining
required product behavior.

**Authority.** Operations owns procedures. Specifications own the behavior those
procedures preserve.

**Good:** credential rotation steps with verification and recovery.
**Avoid:** a pasted deployment transcript full of temporary output.

## Optional document aids

`Status`, `Review after`, `Review when`, `Aliases`, `Tags`, and `Sources` are
all optional. Never add an empty one.

### Status

Stops draft or replaced content reading as current. Use when the lifecycle is
not obvious. Optional for a plainly current document, and **mandatory for
retained superseded material**.

**Good:** `Status: Superseded` followed by a link to the replacement.
**Avoid:** inventing a workflow of many memory statuses.

### Review after, and review when

Warns that time-sensitive information needs checking after a real date or event.
Use when a contract, policy, platform release, deprecation, or migration creates
a genuine validity horizon. Owner-approved. Reaching the date means verify
before relying on it, not automatic expiry.

**Good:** `Review when: The project upgrades to Salesforce API version 68.`
**Avoid:** `Review after: 90 days` with no reason.

### Aliases

For real alternate names, acronyms, legacy names, or stakeholder terminology
people actually use. The title stays canonical.

**Good:** `Aliases: Territory engine, assignment service`.
**Avoid:** `Aliases: Salesforce, code, important`.

### Tags

For a meaningful cross-cutting concern that is not already clear from the path,
title, or links. Aids discovery, never placement or authority.

**Good:** `Tags: Customer-data, security`.
**Avoid:** `Tags: Knowledge, authentication, password-reset`.

### Sources

Preserves evidence when it improves confidence, verification, or maintenance.
Use when a technical, vendor, legal, regulatory, or business claim rests on an
identifiable source. Supports a claim; does not make it current or approved.

**Good:** an inline link beside the vendor-specific claim it supports.
**Avoid:** a large unexplained list of URLs in every document.

## Evidence and certainty

The three kinds of source, the `Basis:` line, and its allowed values are in
`second-brain-rule.md` under `Where every fact came from`, because they apply to
every save and have to be loaded before one starts. This section covers what the
procedure leaves out.

**Why it exists.** Observed behavior, an agent's inference, owner-confirmed
intent, and an unresolved unknown are four different things. Confusing them can
change a requirement, a decision, a migration, a risk assessment, or an
implementation.

**In prose, not only in the `Basis:` line.** The line covers the document.
Inside it, say which category a claim falls into whenever confusing them could
mislead a later reader. No metadata label on every paragraph is required.

**What each kind can and cannot establish.** Repository evidence can establish
observed behavior but never owner intent. An inference stays an inference until
someone supports or confirms it. A basis value never raises a document above its
type.

**Good:** `Basis: Owner-confirmed 2026-07-31` above a paragraph reading
`Observed in the current code: invoice retries are manual. The owner confirmed
that this behavior remains supported.`

**Avoid:** writing `Manual invoice retries are required` on the strength of
legacy code alone, or stamping `Basis: Owner-confirmed` on a conclusion the
owner never saw.

## Repetition

Some repetition keeps the system navigable. Some creates a second version that
drifts. Three kinds, three different answers.

1. **A second copy of the content.** Not allowed. Write the pointer instead of
   the copy. Item 5 under `Relationships` makes that link mandatory.
2. **A deliberate copy an agent must have before it can open anything.** The
   routing schema in `CLAUDE.md` and `AGENTS.md` is the example. Allowed only
   for that reason, only where the system requires it, and only when the copy
   says it is a copy, names its canonical home, is updated in the same change,
   and loses to that home on disagreement.
3. **A one-sentence description of where content lives.** Required. That is what
   an index entry is, and it is not a copy.

Finding an existing duplicate is not authority to delete it. Report it and
propose the repair, because removing durable information is a visible change.

**Good:** `The reset window is set by the reset-token lifetime decision.`
**Avoid:** restating the window and its reasoning in a knowledge document, so
that a later change to the decision leaves two answers and no way to tell which
is current.

## Relationships

Link documents when the link improves understanding, verification, navigation,
or action: when another document governs, constrains, supports, explains,
informed, replaces, or implements this one.

Do not link because two documents share a folder or a topic, or to make a graph
look complete.

**Only these links are mandatory:**

1. a specification and every brainstorm that informed it, both directions;
2. a superseded document and its replacement, both directions;
3. a canonical capability `README.md` and each supporting specification file,
   both directions;
4. the nearest index to every durable document it owns, one direction; and
5. the canonical home of any definition or approved behavior this document would
   otherwise restate, one direction. See `Repetition`.

No empty `Related` section is required. Item 5 exists because the alternative is
a second copy that drifts, not because the corpus should look connected.

Every mandatory link uses descriptive link text, or nearby prose that says why
the destination matters. No fixed label or two-line format is required. A link
does not transfer authority.

**Good:**

```markdown
- **Governed by:** [Ownership decision](../../../memory/decisions/assignment/ownership.md)
  - Explains why reassignment preserves the original owner.
```

Labels are plain description, not a fixed vocabulary. `Governed by`, `Grounded
in`, `Constrains`, `Supports`, `Affects`, `Used by`, `Informed by`, `Delivered
through`, `Supersedes`, and `Superseded by` have all proved useful. Write a
clearer one when one exists.

**Avoid:** a bare filename, or a reciprocal link that adds no useful path.

## History and supersession

The canonical specification describes current approved behavior. Update it in
place. Git preserves the exact prior versions.

Do not require a specification changelog, an archived copy, a version suffix, or
a decision record for a routine change. Create a decision record only when the
reasoning behind an important change will help future work.

When a durable decision or knowledge document is no longer current but still
matters:

1. mark it `Status: Superseded`;
2. add a prominent link to its replacement;
3. link the replacement back; and
4. keep it in its nearest index under a clearly labeled superseded section.

Do not leave contradictory documents both marked current. Do not make a
superseded document undiscoverable merely because it is no longer current.

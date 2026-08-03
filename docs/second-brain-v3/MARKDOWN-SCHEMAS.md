# Second-brain v3 Markdown schemas

Status: current schemas for the second-brain plugin.

These are human-readable document shapes, not machine-enforced record schemas.
Agents adapt headings when clearer language helps the project. They preserve
the document's authority, purpose, relationships, and canonical home.

## 1. Shared conventions

- Use descriptive lowercase paths separated by hyphens.
- Organize by information type, then by a project-defined system area.
- Use the title a person would search for.
- Put a one-sentence summary immediately after the title of every durable
  specification and memory document.
- Keep one current home for each truth.
- Use `Status: Current`, `Status: Draft`, or `Status: Superseded` only when the
  lifecycle distinction matters.
- Link a superseded document prominently to its replacement.
- Add durable documents to the nearest `README.md` index.
- Use relative Markdown links. State the relationship direction in natural
  language and explain why each important destination matters.
- Give every durable document a one-sentence description in the nearest index.
- Keep ticket status, next actions, blockers, and handoffs in work-tracker.
- Let Git preserve dates and exact history by default.

`Status` is optional except when retained superseded material must be marked.
Validity guidance, `Tags`, `Sources`, and `Aliases` are always optional. Do not
include empty placeholders for them.

Optional plain-text metadata may look like:

```markdown
Status: Current
Review after: 2026-10-01
Aliases: Territory engine, assignment service
Tags: Security, customer-data
```

Use it only when it helps.

For event-based validity, use this instead of inventing a date:

```markdown
Review when: The project upgrades to Salesforce API version 68.
```

The main agent may propose a date or event only with an explainable reason, and
the owner approves it before the memory librarian writes it. Reaching the date
or event means verify before relying, not automatic expiration or
supersession.

## 2. Root indexes

### 2.1 Brainstorm index

Path: `brainstorms/README.md`

```markdown
# Brainstorms and discovery

This folder contains interviews, exploration, candidate requirements, and
unresolved questions. It is not authoritative product behavior.

## Brainstorms

| Document | What it explored | Resulting specifications |
|---|---|---|
| [Password recovery](2026-07-28-password-recovery.md) | Recovery paths and security constraints | Password reset and mobile recovery |

Approved behavior belongs in `specs/`. Each brainstorm links to any resulting
specifications. Brainstorms remain flat because discovery may span several
areas or begin before the eventual area is known.
```

### 2.2 Specification index

Path: `specs/README.md`

```markdown
# Product and system specifications

This folder defines current approved product and system behavior.

## Areas

| Area | What it covers |
|---|---|
| [Authentication](authentication/README.md) | Sign-in, account access, and recovery |

## How to use these specifications

- Read the relevant current specification before changing behavior.
- Keep approved behavior, implementation, and tests aligned.
- Follow links to discovery, decisions, knowledge, domain material, planning,
  and operations when they matter.
```

### 2.3 Memory index

Path: `memory/README.md`

```markdown
# Project memory and knowledge

This folder contains durable project information that is not authoritative
product behavior.

## Types

| Type | What belongs there |
|---|---|
| [Context](context/README.md) | Durable circumstances, constraints, stakeholders, and current conditions |
| [Planning](planning/README.md) | Vision, goals, roadmap, milestones, timeline, strategic dependencies, risks, and assumptions |
| [Decisions](decisions/README.md) | Important choices and their rationale |
| [Knowledge](knowledge/README.md) | Reusable non-obvious understanding |
| [References](references/README.md) | Sources and why they matter |
| [Domain](domain/README.md) | Business concepts, language, actors, and rules |
| [Operations](operations/README.md) | Operating, release, recovery, support, and verification guidance |

Work-tracker owns backlog, ticket status, blockers, handoffs, branches, pull
requests, and landing proof.
```

## 3. Specification and memory indexes

### 3.1 Specification area

Path: `specs/<system-area>/README.md`

```markdown
# Authentication specifications

This area owns sign-in, account access, and recovery behavior.

## Capabilities

| Capability | What it defines |
|---|---|
| [Password reset](password-reset/README.md) | Reset request and completion behavior |

## Related area indexes

- [Brainstorms and discovery](../../brainstorms/README.md)
- [Authentication decisions](../../memory/decisions/authentication/README.md)
- [Authentication knowledge](../../memory/knowledge/authentication/README.md)
- [Authentication domain](../../memory/domain/authentication/README.md)
- [Authentication operations](../../memory/operations/authentication/README.md)
```

### 3.2 Memory-type index

Path: `memory/<type>/README.md`

```markdown
# Decisions

Important project choices, why they were made, and what follows from them.

This folder does not own temporary task choices or ticket status.

## Areas

| Area | What it covers |
|---|---|
| [Project-wide](project-wide/README.md) | Decisions affecting the whole project |
| [Authentication](authentication/README.md) | Decisions governing account access |
```

### 3.3 Memory area

Path: `memory/<type>/<system-area>/README.md`

```markdown
# Authentication decisions

## Current documents

| Document | Summary |
|---|---|
| [Reset-token lifetime](reset-token-lifetime.md) | Why reset links use a fixed expiration period |

## Superseded documents

| Document | Replacement |
|---|---|
| [Legacy reset-token policy](legacy-reset-token-policy.md) | [Reset-token lifetime](reset-token-lifetime.md) |

## Related area indexes

- [Authentication specifications](../../../specs/authentication/README.md)
- [Authentication knowledge](../../knowledge/authentication/README.md)
```

Remove `Superseded documents` when the area has none. A retained superseded
document stays in this section instead of disappearing from its nearest index.

## 4. Brainstorm schema

Path: `brainstorms/<date>-<topic>.md`

The `grill-me` skill writes this file continuously during an interview.

```markdown
# Password recovery: Brainstorm / Discovery Notes

Date: 2026-07-28
Goal: Determine the intended recovery experience and security boundaries.

## Summary / key decisions

- Running synthesis of confirmed direction.
- Raw notes remain non-authoritative until incorporated into a specification.

## Q&A log

### Q1: Recovery channels

- Asked: Which recovery channels should the system support?
- Captured: Owner's answer and wording that matters.
- Flags: Unresolved decision -> owner, or "None."

## Resulting specifications

- **Produced:** [Password reset](../specs/authentication/password-reset/README.md)
  - Contains the approved behavior produced by this discovery.

## Open flags (pending input)

- Remaining question -> owner
```

`Resulting specifications` may be empty while discovery is still in progress.
Add links when approved specifications incorporate the brainstorm. One
brainstorm may link to several resulting specifications.

## 5. Specification-folder schema

Path: `specs/<system-area>/<capability>/`

Only `README.md` is required.

```text
password-reset/
  README.md
  user-flows.md       # optional
  data-model.md       # optional
  interfaces.md       # optional
  migration.md        # optional
```

### 5.1 Canonical capability specification

Path: `specs/<system-area>/<capability>/README.md`

```markdown
# Password reset

Defines the approved account-recovery behavior and its security boundaries.

Status: Current

## Purpose

Why the capability exists and who it serves.

## Scope

What this specification covers and any important boundary it does not cover.

## Required behavior

- Observable behavior the product or system must provide.
- Important rules and constraints.

## Scenarios and edge cases

- Expected behavior for important variations and failures.

## Acceptance

- Evidence that demonstrates the behavior is implemented correctly.

## Supporting documents

- **Expanded by:** [User flows](user-flows.md)
  - Detailed recovery paths and failure handling.

## Brainstorms that informed this specification

- **Informed by:** [Password recovery discovery](../../../brainstorms/2026-07-28-password-recovery.md)
  - Established the approved recovery and security requirements.

## Related

- **Governed by:** [Reset-token lifetime decision](../../../memory/decisions/authentication/reset-token-lifetime.md)
  - Explains why reset links expire when they do.
- **Constrained by:** [Email delivery knowledge](../../../memory/knowledge/authentication/email-delivery.md)
  - Describes a delivery constraint the implementation must handle.
```

Remove unused optional sections instead of leaving them empty. Add other
headings when they make the behavior clearer.

### 5.2 Supporting specification file

A supporting file has a narrow purpose and links back to the canonical
`README.md`.

```markdown
# Password reset user flows

Describes the detailed user journeys supporting the password-reset capability.

## Standard recovery

1. User-visible step.
2. System response.

## Failure paths

- Important variation and expected behavior.

## Related

- **Supports:** [Password reset specification](README.md)
  - Owns the approved capability behavior summarized by these flows.
```

A supporting file does not become a second overview or conflicting authority.

## 6. Context schema

Path: `memory/context/<system-area>/<topic>.md`

```markdown
# Enterprise identity-provider constraint

Explains the identity-provider condition that constrains authentication work.

Status: Current

## Context

The durable circumstance or condition future work must understand.

## Why it matters

How it affects decisions or implementation.

## Boundaries

Where it applies and where it does not.

## Related

- **Constrains:** [Single sign-on specification](../../../specs/authentication/single-sign-on/README.md)
  - This constraint applies to the required sign-in behavior.
```

Context does not contain the active ticket, next action, or running project log.

## 7. Planning schema

Path: `memory/planning/<system-area>/<topic>.md`

Project-wide plans normally use
`memory/planning/project-wide/<topic>.md`.

```markdown
# Product roadmap

Summarizes the project direction, milestones, dependencies, risks, and assumptions.

Status: Current

## Direction

The outcome the project is working toward and why it matters.

## Goals

- Durable project or product goal.

## Milestones

1. Meaningful outcome or phase.
2. Later outcome or phase.

## Strategic dependencies

- A durable dependency between outcomes, systems, teams, or external events.

## Risks and assumptions

- A risk or assumption that can materially change the plan.

## Related work

- **Delivered through:** [Authentication epic](../../../work-items/01-backlog/authentication-epic/)
  - Delivers part of the authentication milestone. Current status remains in
    the work tracker.

## Related

- **Grounded in:** [Project context](../../context/project-wide/project-overview.md)
  - Explains the project circumstances behind this roadmap.
```

Planning does not copy ticket status, ticket-level blockers, or the current
handoff.

## 8. Decision schema

Path: `memory/decisions/<system-area>/<decision>.md`

```markdown
# Reset-token lifetime

Explains the approved expiration choice and why it governs password recovery.

Status: Current

## Decision

The important choice that governs current work.

## Context

What made the decision necessary.

## Reasons

- Why this choice was made.

## Alternatives considered

- Another option and why it was not chosen.

## Consequences

- What this enables, constrains, or requires.

## Related

- **Governs:** [Password reset specification](../../../specs/authentication/password-reset/README.md)
  - This decision governs its expiration behavior.
```

Use a decision record when its rationale will help future work. Do not create
one for every routine specification edit.

## 9. Knowledge schema

Path: `memory/knowledge/<system-area>/<topic>.md`

```markdown
# Email delivery behavior in test environments

Explains the non-obvious delivery behavior future test work must account for.

Status: Current
Basis: Observed in force-app/main/default/classes/EmailDelivery.cls

## What we know

The reusable, non-obvious understanding.

## Why it matters

The failure, wasted work, or design mistake this knowledge prevents.

## How to apply it

Where future work should use this knowledge and any important limits.

## Related

- **Supported by:** [Email provider reference](../../references/authentication/email-provider.md)
  - Provides supporting external behavior.
- **Affects:** [Password reset specification](../../../specs/authentication/password-reset/README.md)
  - This delivery behavior affects the reset flow.
```

The `Basis:` line is mandatory on every knowledge document. Allowed values are
`Observed`, `Owner-confirmed <YYYY-MM-DD>`, `Source`, and
`Inferred, unconfirmed`, each optionally followed by the exact file, person, or
source. Do not manufacture a stronger basis than the document actually has.

## 10. Reference schema

Path: `memory/references/<system-area>/<source>.md`

```markdown
# Email provider documentation

Identifies the provider source and the project questions it helps answer.

## Source

[Descriptive source name](https://example.com/relevant-page)

## Why it matters

What project question this source helps answer.

## Useful points

- A concise, project-specific summary.

## Limits

What the source does not prove or what may change over time.

## Related

- **Supports:** [Email delivery knowledge](../../knowledge/authentication/email-delivery.md)
  - Uses this source as supporting evidence.
```

A reference summarizes what matters. It does not copy an entire source into the
repository.

When a raw meeting note, transcript, communication, deliverable, or source file
already has a canonical home in the project's ordinary scaffolding, link to it
directly. Do not copy it into `memory/references/`. Create a reference note only
when a source needs durable project-specific explanation or is external to the
repository.

## 11. Domain schema

Path: `memory/domain/<system-area>/<concept>.md`

```markdown
# Account owner

Defines the project's meaning and business rules for the account-owner concept.

Status: Current
Basis: Owner-confirmed 2026-07-31
Aliases: Primary account contact

## Meaning

The project's definition of this term or concept.

## Business rules

- Rule governing the concept.

## Examples

- Representative example.

## Edge cases

- A case that is easy to misunderstand.

## Related

- **Used by:** [Account access specification](../../../specs/authentication/account-access/README.md)
  - Uses this actor in required behavior.
```

The `Basis:` line is mandatory on every domain document, using the same values
as the knowledge schema. A term an agent guessed at from field or object names
is `Inferred, unconfirmed` until a person confirms it.

Aliases are optional and especially useful for client language, acronyms, and
multiple names for the same concept.

## 12. Operations schema

Path: `memory/operations/<system-area>/<procedure>.md`

```markdown
# Rotate the email provider credential

Explains how to rotate the credential safely and verify or recover the operation.

Status: Current

## Purpose

When and why this procedure is used.

## Prerequisites

- Access, approval, or safe condition required first.

## Procedure

1. Human-readable operating step.
2. Next step.

## Verify

- Observable evidence that the procedure succeeded.

## Recovery

- How to stop, reverse, or recover if it fails.

## Related

- **Operates:** [Email delivery specification](../../../specs/authentication/email-delivery/README.md)
  - Defines the behavior this procedure must preserve.
```

Operations documents may describe how to obtain or use a secret. They never
contain the secret.

## 13. Root orientation snippet

Both `CLAUDE.md` and `AGENTS.md` use a short version of this section:

```markdown
## Project memory and knowledge

Read `.claude/rules/second-brain.md` before work that changes product behavior
or depends on project history.

- `brainstorms/`: non-authoritative discovery and interviews.
- `specs/`: current approved product and system behavior.
- `memory/context/`: durable circumstances and constraints.
- `memory/planning/`: vision, goals, roadmap, milestones, risks, and assumptions.
- `memory/decisions/`: important choices and rationale.
- `memory/knowledge/`: reusable non-obvious understanding.
- `memory/references/`: useful sources and why they matter.
- `memory/domain/`: business concepts, language, actors, and rules.
- `memory/operations/`: operating, release, recovery, and support guidance.

Start with each root `README.md`, then follow the relevant area indexes and
backlinks. Work-tracker owns current ticket status, blockers, relationships,
handoffs, branches, pull requests, and landing proof.

At approved completion points, propose durable updates to the owner. After
approval, invoke the memory librarian in this session's worktree.
```

The detailed shared rule remains canonical.

## 14. Agent decision guidance

The installed `.claude/rules/second-brain.md` turns these schemas into judgment
guidance. The memory librarian reads the applicable cards before creating or
reorganizing a document.

Only instructions explicitly labeled mandatory are mandatory.

### 14.1 Title and summary

- **Purpose:** Let a person or agent identify the subject and decide quickly
  whether the document is relevant.
- **Use when:** Every durable specification and memory document.
- **Do not use when:** Do not add a separate summary that merely repeats the
  title with no additional meaning.
- **Requirement:** Mandatory for durable specifications and memory. A raw
  brainstorm instead uses its title, goal, and running summary.
- **Authority:** The summary previews the document. It does not replace the
  type-specific body.
- **Good:** `Explains why account and opportunity reassignment follow different
  ownership rules.`
- **Avoid:** `This document is about ownership rules.`

### 14.2 Index entry

- **Purpose:** Support progressive disclosure before a reader opens the full
  document.
- **Use when:** Every durable document listed by its nearest `README.md`.
- **Do not use when:** Do not copy the full document, live ticket state, or
  change history into the index.
- **Requirement:** Mandatory for durable specifications and memory.
- **Authority:** The document remains canonical. The index is navigation.
- **Good:** `Why reset links expire after a fixed period.`
- **Avoid:** `Reset-token-lifetime.md`.

### 14.3 Brainstorm

- **Purpose:** Preserve raw discovery, interviews, alternatives, unresolved
  questions, and owner wording.
- **Use when:** Exploring requirements or design before all outcomes are
  approved.
- **Do not use when:** The behavior is already approved and belongs in a
  specification, or the information is a routine meeting transcript stored in
  project scaffolding.
- **Requirement:** Optional. An explicitly invoked `grill-me` session creates
  one.
- **Authority:** Non-authoritative input. It never overrides a specification.
- **Good:** A requirements interview containing options and open questions.
- **Avoid:** Treating one exploratory answer as implemented product behavior.

### 14.4 Specification

- **Purpose:** Define current approved product and system behavior.
- **Use when:** A capability, system boundary, observable behavior, constraint,
  or acceptance expectation is approved.
- **Do not use when:** Capturing raw exploration, implementation trivia, ticket
  status, or a source document.
- **Requirement:** Required when the project needs an authoritative durable
  behavior contract. Each capability folder has one canonical `README.md`.
- **Authority:** Specifications own what the system should do. Code and tests
  implement and verify it.
- **Good:** Approved territory assignment behavior and edge cases.
- **Avoid:** A transcript of possible assignment approaches.

### 14.5 Supporting specification file

- **Purpose:** Keep a large capability specification understandable without
  turning its canonical `README.md` into an unstructured wall of text.
- **Use when:** User flows, data models, interfaces, security, or migration
  details are substantial enough to benefit from a focused file.
- **Do not use when:** A short section in the canonical specification would be
  clearer.
- **Requirement:** Optional.
- **Authority:** The capability `README.md` remains the canonical entry point.
  The supporting file narrows or expands one part of it.
- **Good:** `data-model.md` for a multi-entity assignment model.
- **Avoid:** `requirements-continued.md` that creates a second overview.

### 14.6 Context

- **Purpose:** Preserve durable circumstances, stakeholders, constraints,
  boundaries, and conditions needed to interpret future work.
- **Use when:** The information affects several tasks or explains why work must
  be understood a certain way.
- **Do not use when:** The information is a current task, next action, blocker,
  or temporary handoff.
- **Requirement:** Optional.
- **Authority:** Context explains circumstances. It does not define product
  behavior or work status.
- **Good:** A client identity-provider restriction affecting authentication.
- **Avoid:** `Alice is implementing ticket 42 this week.`

### 14.7 Planning

- **Purpose:** Preserve vision, goals, roadmap, milestones, timeline, strategic
  dependencies, durable risks, and assumptions.
- **Use when:** The direction or sequence matters beyond an individual ticket.
- **Do not use when:** Recording ticket status, assignments, operational
  blockers, or the current handoff.
- **Requirement:** Optional.
- **Authority:** Planning owns high-level direction. Work-tracker owns execution
  state.
- **Good:** A product roadmap linking milestones to their work-item epics.
- **Avoid:** Copying every ticket and current status into the roadmap.

### 14.8 Decision

- **Purpose:** Preserve an important choice and the rationale future work may
  need.
- **Use when:** Understanding why a non-obvious choice was made will prevent
  reversal, confusion, or repeated debate.
- **Do not use when:** The choice is routine, temporary, obvious from the
  specification, or useful only inside one ticket.
- **Requirement:** Optional, except a historically important replacement may
  require a superseding decision.
- **Authority:** A current decision owns rationale. The specification still
  owns required behavior.
- **Good:** Why territory assignment uses an asynchronous engine.
- **Avoid:** A decision document for renaming one local variable.

### 14.9 Knowledge

- **Purpose:** Preserve reusable, non-obvious technical or project
  understanding.
- **Use when:** The information prevents a likely mistake, explains a failure
  mode, or helps several future tasks.
- **Do not use when:** The fact is obvious from nearby code, is only temporary
  debugging output, or belongs in a specification or decision.
- **Requirement:** Optional.
- **Authority:** Knowledge explains what is understood and how to apply it. It
  does not authorize product behavior.
- **Good:** Test-environment email delivery behaves differently from
  production.
- **Avoid:** A list of every function name in a module.

### 14.10 Reference

- **Purpose:** Explain why an internal or external source matters to the
  project and what it does or does not support.
- **Use when:** A source is external or needs durable project-specific context.
- **Do not use when:** A raw meeting, transcript, deliverable, or source file
  already has a clear canonical project home and can be linked directly.
- **Requirement:** Optional.
- **Authority:** A reference is supporting evidence, not automatic current
  truth.
- **Good:** A concise note explaining which Salesforce API documentation
  governs a design constraint.
- **Avoid:** Copying an entire vendor document or meeting transcript.

### 14.11 Domain

- **Purpose:** Preserve business language, actors, concepts, policies, rules,
  and examples.
- **Use when:** Project participants use a term or business rule that an agent
  could misunderstand.
- **Do not use when:** Defining product behavior, technical implementation, or
  a temporary stakeholder assignment.
- **Requirement:** Optional.
- **Authority:** Domain defines business meaning. Specifications define system
  behavior using that meaning.
- **Good:** The client-specific meaning of `account owner`.
- **Avoid:** A generic dictionary definition unrelated to the project.

### 14.12 Operations

- **Purpose:** Explain how to operate, release, support, recover, or verify the
  system safely.
- **Use when:** A repeatable procedure and its success or recovery evidence will
  help future operation.
- **Do not use when:** Tracking the current deployment ticket, storing secrets,
  or describing required product behavior.
- **Requirement:** Optional.
- **Authority:** Operations owns procedures. Specifications own the behavior
  those procedures preserve.
- **Good:** Credential rotation steps with verification and recovery.
- **Avoid:** A pasted deployment transcript containing temporary output.

### 14.13 Status

- **Purpose:** Prevent draft or replaced content from being mistaken for
  current truth.
- **Use when:** Lifecycle is not obvious, especially for `Draft` or
  `Superseded` material.
- **Do not use when:** It adds no useful signal to a plainly current document.
- **Requirement:** Optional for current documents. Mandatory when a retained
  document is superseded.
- **Authority:** Status describes document lifecycle. It does not replace Git
  history.
- **Good:** `Status: Superseded`, followed by the replacement link.
- **Avoid:** Inventing many workflow statuses for memory documents.

### 14.14 Review after and review when

- **Purpose:** Warn that time-sensitive information needs verification after a
  date or event.
- **Use when:** A real contract, policy, platform release, deprecation, or
  migration event creates a validity horizon.
- **Do not use when:** There is no foreseeable change, or the agent is
  inventing a routine review cadence.
- **Requirement:** Optional and owner-approved.
- **Authority:** The signal requests verification. It does not automatically
  expire, rewrite, or supersede the document.
- **Good:** `Review when: The project upgrades to Salesforce API version 68.`
- **Avoid:** `Review after: 90 days` with no reason.

### 14.15 Aliases

- **Purpose:** Make one concept discoverable through real alternate names,
  acronyms, legacy names, or stakeholder terminology.
- **Use when:** People genuinely use more than one name for the same thing.
- **Do not use when:** Adding general keywords or repeating the title.
- **Requirement:** Optional.
- **Authority:** Aliases improve retrieval. The title remains the canonical
  display name.
- **Good:** `Aliases: Territory engine, assignment service`.
- **Avoid:** `Aliases: Salesforce, code, important`.

### 14.16 Tags

- **Purpose:** Identify meaningful cross-cutting concerns that path, title, and
  links do not already express.
- **Use when:** A concern such as security, privacy, or customer data spans
  several types or system areas.
- **Do not use when:** The tag repeats the memory type, area, title, or every
  possible keyword.
- **Requirement:** Optional.
- **Authority:** Tags aid discovery. They do not determine authority or
  placement.
- **Good:** `Tags: Customer-data, security`.
- **Avoid:** `Tags: Knowledge, authentication, password-reset`.

### 14.17 Sources and claim attribution

- **Purpose:** Preserve evidence or provenance when it improves confidence,
  verification, or future maintenance.
- **Use when:** A technical, vendor, legal, regulatory, or business claim
  depends on an identifiable source.
- **Do not use when:** The source adds no useful verification or would duplicate
  a canonical raw artifact.
- **Requirement:** Optional.
- **Authority:** A source supports a claim. It does not make the claim current
  or approved by itself.
- **Good:** An inline link or Markdown footnote beside a vendor-specific claim.
- **Avoid:** A large unexplained list of URLs at the end of every document.

### 14.18 Evidence and certainty

- **Purpose:** Prevent observed behavior, agent inference, owner-confirmed
  intent, and unresolved unknowns from being mistaken for one another.
- **Use when:** The distinction could change a requirement, decision,
  migration, risk assessment, or future implementation.
- **Do not use when:** The basis is already obvious and the distinction would
  not affect how anyone relies on the information.
- **Requirement:** Contextual. Required when confusing the categories could
  mislead future work. It does not require metadata on every paragraph.
- **Authority:** Repository evidence can establish observed behavior but not
  owner intent. An inference remains an inference until supported or confirmed.
- **Good:** `Observed in the current code: invoice retries are manual. Mike
  confirmed that this behavior remains supported.`
- **Avoid:** Writing `Manual invoice retries are required` when the agent only
  inferred that requirement from legacy code.

### 14.19 Related links

- **Purpose:** Connect documents when the relationship helps a future person or
  agent understand, verify, navigate, or act.
- **Use when:** Another document governs, constrains, supports, explains,
  informed, replaces, or implements this document.
- **Do not use when:** The documents merely share a folder or topic, the link
  adds no useful context, or it exists only to make the graph look complete.
- **Requirement:** Optional except for the narrow structural cases explicitly
  declared mandatory in the technical specification, and for the canonical home
  of anything this document would otherwise restate.
- **Authority:** A link does not copy or transfer authority. Its prose explains
  how the destination matters.
- **Good:** `**Governed by:** [Ownership decision](...)`, followed by the
  specific constraint.
- **Avoid:** A bare filename or a reciprocal backlink that adds no navigation.

The complete mandatory link set is:

1. specification and informing brainstorm, both directions;
2. superseded document and replacement, both directions;
3. canonical specification `README.md` and each supporting specification file,
   both directions;
4. nearest index to every durable document it owns, one direction only; and
5. the canonical home of any definition or approved behavior this document would
   otherwise restate, one direction only.

No other `Related` section, link, or backlink is mandatory. Item 5 exists
because the alternative is a second copy that drifts, not because the corpus
should look connected.

If adding a backlink requires editing another document, the memory librarian
may perform that routine link maintenance within the approved content update.
The owner does not need to manage those filing details. A backlink or related
edit must be separately visible in the proposal when it changes meaning or
authority, supersedes information, or forms part of a risky or large
reorganization.

## Brainstorms that informed these schemas

- [Second-brain v3 project memory discovery](../../brainstorms/2026-07-28-second-brain-v3-project-memory.md)
  - Established typed planning, flat brainstorm capture, per-capability
    specification folders, optional metadata, and backlinks.

## Related

- [Technical specification](TECHNICAL-SPECIFICATION.md)
  - Defines how agents read and write these documents.
- [Toolkit integration](TOOLKIT-INTEGRATION.md)
  - Defines how the templates and rules reach projects.

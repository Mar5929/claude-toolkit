# Second-brain v3 Markdown schemas

Status: draft for owner review.

These are readable document shapes, not a machine-enforced schema. Agents may
adapt headings when a project needs clearer language, but they preserve the
purpose, current-status signal, and `Related` section.

## Shared conventions

- Use descriptive lowercase file names separated by hyphens.
- Put each document under the matching information type and system area.
- Use the title a person would search for.
- Keep one current home for each fact.
- Use `Status: Current`, `Status: Draft`, or `Status: Superseded` when status
  matters.
- Link a superseded document to its replacement.
- End every document with `## Related`.
- Explain each relationship instead of listing unexplained links.
- Add the document to the nearest `README.md` index.

Git owns dates and history by default. Add a business-effective date only when
the date itself affects meaning.

## Root specification index

Path: `specs/README.md`

```markdown
# Product and system specifications

This folder defines what the product and system must do.

## Areas

| Area | What it covers |
|---|---|
| [Authentication](authentication/README.md) | Sign-in, account access, and recovery |

## How to use these specifications

- Read the relevant area before changing behavior.
- Update requirements, code, and tests together.
- Follow each specification's related links for its decisions and knowledge.
```

## Specification area index

Path: `specs/<system-area>/README.md`

```markdown
# Authentication specifications

What this system area owns and where its boundary ends.

## Specifications

| Document | What it defines | Status |
|---|---|---|
| [Password reset](password-reset.md) | Reset request and completion behavior | Current |

## Related project knowledge

- [Authentication decisions](../../memory/decisions/authentication/README.md)
- [Authentication knowledge](../../memory/knowledge/authentication/README.md)
- [Authentication domain](../../memory/domain/authentication/README.md)
- [Authentication operations](../../memory/operations/authentication/README.md)
```

## Specification

Path: `specs/<system-area>/<capability>.md`

```markdown
# Password reset

Status: Current

## Purpose

Why this capability exists and who it serves.

## Required behavior

- Observable behavior the system must provide.
- Important rules and boundaries.

## Scenarios and edge cases

- Expected behavior for important variations and failures.

## Acceptance

- Evidence that proves the behavior is implemented correctly.

## Related

- [Reset-token lifetime decision](../../memory/decisions/authentication/reset-token-lifetime.md)
  - Defines why reset links expire when they do.
- [Email delivery knowledge](../../memory/knowledge/authentication/email-delivery.md)
  - Explains the delivery constraint the implementation must handle.
```

## Root memory index

Path: `memory/README.md`

```markdown
# Project memory and knowledge

This folder contains durable project knowledge that is not authoritative
product behavior.

## Types

| Type | What belongs there |
|---|---|
| [Context](context/README.md) | Durable circumstances, constraints, and current conditions |
| [Decisions](decisions/README.md) | What was decided and why |
| [Knowledge](knowledge/README.md) | Reusable non-obvious understanding |
| [References](references/README.md) | Sources and why they matter |
| [Domain](domain/README.md) | Business concepts, language, and rules |
| [Operations](operations/README.md) | How to operate, release, recover, and support |

Ticket status and handoffs belong to work-tracker.
```

## Memory-type index

Path: `memory/<type>/README.md`

```markdown
# Decisions

What belongs in this memory type and what does not.

## Areas

| Area | What it covers |
|---|---|
| [Authentication](authentication/README.md) | Decisions governing account access |
```

## Memory area index

Path: `memory/<type>/<system-area>/README.md`

```markdown
# Authentication decisions

## Documents

| Document | Summary | Status |
|---|---|---|
| [Reset-token lifetime](reset-token-lifetime.md) | Why reset links expire after a fixed period | Current |

## Related area indexes

- [Authentication specifications](../../../specs/authentication/README.md)
- [Authentication knowledge](../../knowledge/authentication/README.md)
```

## Context document

Path: `memory/context/<system-area>/<topic>.md`

```markdown
# Enterprise identity-provider constraint

Status: Current

## Context

The durable circumstance or current condition future work must understand.

## Why it matters

How it affects decisions or implementation.

## Boundaries

What this context does and does not apply to.

## Related

- [Single sign-on specification](../../../specs/authentication/single-sign-on.md)
  - This constraint applies to the required sign-in behavior.
```

Context should not contain the active ticket, next task, or a running project
log.

## Decision document

Path: `memory/decisions/<system-area>/<decision>.md`

```markdown
# Reset-token lifetime

Status: Current

## Decision

The choice that governs current work.

## Context

What made a decision necessary.

## Reasons

- Why this choice was made.

## Alternatives considered

- Another option and why it was not chosen.

## Consequences

- What this enables, constrains, or requires.

## Related

- [Password reset specification](../../../specs/authentication/password-reset.md)
  - This decision governs the reset-link expiration requirement.
```

If replaced, set `Status: Superseded` and add a prominent replacement link
under the status.

## Knowledge document

Path: `memory/knowledge/<system-area>/<topic>.md`

```markdown
# Email delivery behavior in test environments

Status: Current

## What we know

The reusable, non-obvious understanding.

## Why it matters

The failure, wasted work, or design mistake this knowledge prevents.

## Evidence

What supports the conclusion. Link to a reference, code location, test, or
observed result.

## How to apply it

Where future work should use this knowledge and any important limits.

## Related

- [Email provider reference](../../references/authentication/email-provider.md)
  - Provides the external behavior behind this conclusion.
- [Password reset specification](../../../specs/authentication/password-reset.md)
  - This delivery behavior affects the reset flow.
```

## Reference document

Path: `memory/references/<system-area>/<source>.md`

```markdown
# Email provider documentation

Status: Current

## Source

[Descriptive source name](https://example.com/relevant-page)

## Why it matters

What project question this source helps answer.

## Useful points

- A concise project-specific summary.

## Limits

What the source does not prove, or what may change over time.

## Related

- [Email delivery knowledge](../../knowledge/authentication/email-delivery.md)
  - Uses this source as supporting evidence.
```

## Domain document

Path: `memory/domain/<system-area>/<concept>.md`

```markdown
# Account owner

Status: Current

## Meaning

The project's definition of this term or concept.

## Business rules

- Rules that govern the concept.

## Examples

- A representative example.

## Edge cases

- A case that is easy to misunderstand.

## Related

- [Account access specification](../../../specs/authentication/account-access.md)
  - Uses this actor in required behavior.
```

## Operations document

Path: `memory/operations/<system-area>/<procedure>.md`

```markdown
# Rotate the email provider credential

Status: Current

## Purpose

When and why this procedure is used.

## Prerequisites

- Access, approvals, or safe conditions required first.

## Procedure

1. Human-readable operating step.
2. Next step.

## Verify

- Observable evidence that the procedure succeeded.

## Recovery

- How to stop, reverse, or recover if it fails.

## Related

- [Email delivery specification](../../../specs/authentication/email-delivery.md)
  - Defines the behavior this procedure must preserve.
```

Operations documents describe secret locations and access processes without
containing secrets.

## Root orientation snippet

The v3 section in both `CLAUDE.md` and `AGENTS.md` follows this shape:

```markdown
## Project memory and knowledge

Read `.claude/rules/second-brain.md` before work that changes product behavior
or depends on project history.

- `specs/`: what the product and system must do.
- `memory/context/`: durable circumstances and constraints.
- `memory/decisions/`: decisions and reasons.
- `memory/knowledge/`: reusable non-obvious knowledge.
- `memory/references/`: sources and why they matter.
- `memory/domain/`: business concepts and rules.
- `memory/operations/`: operating and recovery procedures.

Start with `specs/README.md` and `memory/README.md`, then follow the relevant
area indexes and backlinks. Work-tracker owns ticket status, blockers,
relationships, and handoffs.
```

The detailed shared rule remains canonical. This snippet is intentionally short
enough to keep both root orientation files useful.

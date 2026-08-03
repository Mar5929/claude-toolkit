# Second-brain v3 copy-ready Markdown schemas

The canonical behavior and decision guidance lives in
`second-brain-rule.md`. These templates are starting shapes, not required
machine schemas. Adapt headings when clearer language helps, remove unused
optional sections, and never add empty metadata.

## Specification area index

Path: `specs/<system-area>/README.md`

```markdown
# <Area> specifications

<One sentence explaining what this area owns.>

## Capabilities

| Capability | What it defines |
|---|---|
| [<Capability>](<capability>/README.md) | <One-sentence description> |

## Related area indexes

- <Only useful neighboring indexes>
```

## Capability specification

Path: `specs/<system-area>/<capability>/README.md`

```markdown
# <Capability>

<One sentence defining the approved behavior this specification owns.>

## Purpose

<Why the capability exists and who it serves.>

## Scope

<What is included and any important boundary.>

## Required behavior

- <Observable behavior, rule, or constraint.>

## Scenarios and edge cases

- <Important variation or failure behavior.>

## Acceptance

- <Evidence that demonstrates correct implementation.>

## Supporting documents

- **Expanded by:** [<Focused document>](<file>.md)
  - <What it adds.>

## Brainstorms that informed this specification

- **Informed by:** [<Discovery>](../../../brainstorms/<date>-<topic>.md)
  - <What approved behavior came from it.>

## Related

- **<Relationship>:** [<Document>](<relative-path>)
  - <Why it matters here.>
```

Remove `Supporting documents`, `Brainstorms that informed this specification`,
or `Related` when no relationship exists. When a brainstorm did inform the
specification, the link is mandatory in both directions.

## Supporting specification file

```markdown
# <Focused subject>

<One sentence explaining how this supports the capability.>

## <Focused content>

<The details this file owns.>

## Related

- **Supports:** [<Capability>](README.md)
  - Owns the approved behavior this file expands.
```

## Brainstorm

Path: `brainstorms/<date>-<topic>.md`

```markdown
# <Topic>: Brainstorm / Discovery Notes

Date: <YYYY-MM-DD>
Goal: <One sentence>

## Summary / key decisions

<Running synthesis.>

## Q&A log

### Q1: <Topic>

- Asked: <Question>
- Captured: <Answer and wording that matters>
- Flags: <Open item and owner, or "None">

## Resulting specifications

- **Produced:** [<Specification>](../specs/<area>/<capability>/README.md)
  - <What approved outcome it contains.>

## Open flags (pending input)

- <Open item and owner, or "None">
```

`Resulting specifications` can be absent while discovery is in progress.

## Memory area index

Path: `memory/<type>/<system-area>/README.md`

```markdown
# <Area> <memory type>

<One sentence explaining what this area owns.>

## Current documents

| Document | Summary |
|---|---|
| [<Document>](<document>.md) | <One-sentence description> |

## Superseded documents

| Document | Replacement |
|---|---|
| [<Superseded document>](<document>.md) | [<Current replacement>](<replacement>.md) |

## Related area indexes

- <Only useful neighboring indexes>
```

Remove `Superseded documents` when the area has none. A retained superseded
document stays here instead of disappearing from its nearest index.

Every memory template below ends with an optional `## Related` section. Remove
it when no relationship exists. `Relationships` in `second-brain-rule.md` says
which links are mandatory and gives example labels that are examples, not a
fixed vocabulary. Every mandatory link uses descriptive text or nearby prose to
say why its destination matters. `Repetition` in the same file says what to do
when the content already has a home elsewhere.

## Context

```markdown
# <Context title>

<One sentence explaining the durable circumstance or constraint.>

## Context

<What future work must understand.>

## Why it matters

<How it affects decisions or implementation.>

## Boundaries

<Where it applies and does not apply.>

## Related

- **<Relationship>:** [<Document>](<relative-path>)
  - <Why it matters here.>
```

## Planning

```markdown
# <Plan title>

<One sentence summarizing the durable direction.>

## Direction

<Outcome and why it matters.>

## Goals

- <Durable goal.>

## Milestones

1. <Meaningful outcome or phase.>

## Strategic dependencies

- <Durable dependency.>

## Risks and assumptions

- <Material risk or assumption.>

## Related work

- **Delivered through:** [<Work item>](<relative-path>)
  - Current status remains in the work tracker.

## Related

- **<Relationship>:** [<Document>](<relative-path>)
  - <Why it matters here.>
```

## Decision

```markdown
# <Decision title>

<One sentence explaining the choice and why it matters.>

## Decision

<The important current choice.>

## Context

<Why a choice was needed.>

## Reasons

- <Reason.>

## Alternatives considered

- <Alternative and why it was not chosen.>

## Consequences

- <What this enables, constrains, or requires.>

## Related

- **<Relationship>:** [<Document>](<relative-path>)
  - <Why it matters here.>
```

## Knowledge

```markdown
# <Knowledge title>

<One sentence explaining the reusable understanding.>

Basis: <Observed | Owner-confirmed YYYY-MM-DD | Source | Inferred, unconfirmed>

## What we know

<The non-obvious understanding.>

## Why it matters

<The mistake or wasted work it prevents.>

## How to apply it

<Where future work should use it and its limits.>

## Related

- **<Relationship>:** [<Document>](<relative-path>)
  - <Why it matters here.>
```

The `Basis:` line is mandatory. See `Evidence and certainty` in
`second-brain-rule.md` for what each value means and when to change it.

## Reference

```markdown
# <Reference title>

<One sentence explaining the source and project question it supports.>

## Source

[<Descriptive source>](<location>)

## Why it matters

<The project question this source helps answer.>

## Useful points

- <Concise project-specific point.>

## Limits

<What it does not prove or what may change.>

## Related

- **<Relationship>:** [<Document>](<relative-path>)
  - <Why it matters here.>
```

## Domain

```markdown
# <Domain concept>

<One sentence defining the project-specific meaning.>

Basis: <Observed | Owner-confirmed YYYY-MM-DD | Source | Inferred, unconfirmed>

## Meaning

<Definition.>

## Business rules

- <Rule governing the concept.>

## Examples

- <Representative example.>

## Edge cases

- <Easy-to-misunderstand case.>

## Related

- **<Relationship>:** [<Document>](<relative-path>)
  - <Why it matters here.>
```

The `Basis:` line is mandatory. A business term an agent guessed at from field
names is `Inferred, unconfirmed` until a person says otherwise.

## Operations

```markdown
# <Procedure title>

<One sentence explaining when and why to use this procedure.>

## Prerequisites

- <Access, approval, or safe condition.>

## Procedure

1. <Operating step.>

## Verify

- <Observable evidence of success.>

## Recovery

- <How to stop, reverse, or recover.>

## Related

- **<Relationship>:** [<Document>](<relative-path>)
  - <Why it matters here.>
```

Operations may explain where a secret is obtained and how it is used. They
never contain the secret.

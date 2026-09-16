# Prep file template

One file per work item, at the location the owner agreed. Every agent reads it
before starting. Write each section as soon as it is settled; never wait for
the interview to finish. Keep it in plain English, with the real name of every
thing and no figurative language.

```markdown
# <Item id and title>: design prep

Date started: <YYYY-MM-DD>
Requirements: <path or link to the PRD or work item>
Design file: <agreed path>

## What the requirements are for

<One paragraph. Who uses the result, what they are trying to do, and what
must be true for them when it is done. This is the intent every agent works
from.>

## Requirements that did not fit, and the owner's ruling

| Requirement | Why it seemed out of place | Owner's ruling | Date |
| --- | --- | --- | --- |

## How this design is being made

- Prep: interview first / scan and research first
- Design philosophy: built-in mechanisms first / specialized, as follows: ...
- Number of options: <n>, differing by: ...
- Existing build: greenfield / exists, and it does the following today: ...
- Team: <role: count, what it reads and returns>, one line per role
- Agents run on: Opus, via subagents

## Constraints

<Anything the design must respect: platform version, budget, timeline,
security rule, systems it must not touch, people who must approve.>

## Interview log

### Q1: <topic>

- Asked: <the question>
- Captured: <facts and decisions, keeping the owner's exact words where the
  wording matters>
- Flags: <open item and who can answer it, or "None">

## Open flags

- <item> -> <who answers it>
```

The interview log is a record of how the answers were reached. It is not
requirements and not memory. A decision that should outlive this item goes
through `remember` with the owner's approval.

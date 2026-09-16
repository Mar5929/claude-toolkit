# Design document template

The architect writes to this shape. A junior intern with no context reads it
and knows what to build, in what order, and how to tell it works. Common
words, short sentences, one idea each, the real name of every thing, a
definition the first time a term appears, no figurative language, no preamble,
no closing line. Every number, name, version, and source stays exactly as
found.

When the owner wants several options, each option is one top-level section
with the same inner headings, followed by one "Recommendation" section.

```markdown
# <Item id and title>: solution design

Status: proposed
Requirements: <path or link>
Prep file: <path>
Date: <YYYY-MM-DD>

## What this solves

<The intent paragraph from the prep file, in the same words.>

## What exists today

<For an existing build: what the current code or configuration does for this
area, with file paths, and where it falls short of the intent. For a
greenfield project: "Nothing exists yet.">

## Design philosophy

<Built-in mechanisms first, or the specialized philosophy the owner chose,
in one or two sentences.>

## Option A: <short name>

### Summary

<Three to five sentences a reader can repeat back.>

### How each requirement is met

#### <Requirement heading or identifier, in the requirements' own words>

- Build or reuse: <the exact component, setting, or mechanism, by its real
  name, and whether it exists already or is new>
- Why this satisfies it: <one or two sentences>
- How to check it: <the test or observation that proves it works>

### What the person experiences, start to finish

<Walk the flow as the person who uses the result. One step per line.>

### Components and files touched

| Component or file | New, changed, or reused | What changes |
| --- | --- | --- |

### Order of work

1. <first thing to build, and why it comes first>

### Risks and tradeoffs

- <risk, how likely, what it costs, what reduces it>

### Sources

| Claim in this design | Source | Date | Label | Verified how |
| --- | --- | --- | --- | --- |

<Label is one of: official documentation, project evidence, community claim.
A community claim appears here only with the verification that made it safe
to use.>

## Where a builder could misread the requirements

| Requirement | Wrong reading | Intended reading, and what this design does |
| --- | --- | --- |

<Every risk from the prep file, plus any the architect found. A builder
reads this table before building.>

## Recommendation

<Only when there is more than one option. Which option, and why, in plain
words. What the owner gives up by choosing it.>

## Should the existing build be replaced?

<For an existing build only. Yes or no, and why. If yes: what a rewrite
costs, and why extending what exists serves the requirements worse.>

## Decisions made while designing

| Decision | Reason | Who decided | Date |
| --- | --- | --- | --- |

## Open decisions for the owner

- <one question, with the two positions in one line each>

## Where this stands

| Round | Findings raised | Findings fixed | Requirements still open |
| --- | --- | --- | --- |

Next action: <the exact next step, and who does it>
```

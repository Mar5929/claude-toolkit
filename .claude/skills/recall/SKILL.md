---
name: recall
description: >-
  Find and read what this project has already written down, in specs/ and
  memory/, before searching the code or asking the user something the project
  already answered. Use when picking up work, when about to change how something
  behaves, when the user asks what we know or decided about something, or when a
  question sounds like it has been settled before. Also use when the user runs
  /recall.
---

# recall

`specs/memory-system.md` is the law for this. If anything here disagrees with
it, the specification wins.

Two folders hold what this project knows about itself:

- **`specs/`** says what things must do.
- **`memory/`** says what is worth knowing.

Look there before searching the code, and before asking the user something the
project already wrote down.

## How to find something

1. **Start at `memory/index.md`.** It lists every file in `specs/` and `memory/`
   with its title and one-sentence summary. Reading it tells you what exists, in
   a page or so, without opening anything else.
2. **Work out which folder holds the kind of thing you need**, using the table
   below.
3. **Search the text inside `specs/` and `memory/`** for the subject.
4. **Open only what the task needs.** Do not load every file.
5. **Follow a link only when the linked file matters to that task.**

Do not search `brainstorms/` to answer whether something is saved. A transcript
is not a save.

## Which folder holds what

| Folder | What is in it |
| --- | --- |
| `specs/<area>/` | What a capability must do. Current approved behavior, one file per capability. |
| `memory/context/` | Something about the situation that shapes several pieces of work: who is involved, what the project is up against, a limit that comes from outside. |
| `memory/decisions/` | A choice that was made, and why, when knowing why stops someone reversing it or arguing it again. |
| `memory/knowledge/` | Something worked out that would take real effort to work out again, or that stops a likely mistake. |
| `memory/domain/` | A word or a business rule that means something specific in this project. |
| `memory/operations/` | A repeatable procedure for running, releasing, or recovering something, and how to tell it worked. |
| `memory/planning/` | Where the project is going, in what order, and what could go wrong along the way. |
| `memory/references/` | An outside source that matters, and what it supports. |

## Before changing how something behaves

Read that thing's specification first. If no specification covers it, say so
before building.

## How much to trust what you read

Every file in `memory/` starts with a `source:` line. It says where the whole
file came from.

| `source:` | What it means | How to treat it |
| --- | --- | --- |
| `user-said-it` | The user stated it. | Trust it. |
| `read-from-file` | It was read in the file named on the `source-file:` line. | Trust it, and open that file if the exact wording matters. |
| `agent-guess-unchecked` | An agent worked it out and nobody has checked it. | A lead to check, not a fact to repeat. Never state it as truth, and never build on it without checking. |

A single line inside a body may carry its own marker, like
`(source: agent-guess-unchecked)`. That line follows the same rule, whatever the
file's own `source:` says.

A file with a `superseded-by:` line is history. It is not current truth. Follow
that line to the file that replaced it.

Files in `specs/` carry no `source:` line, because the user approved every word
of one before it was written.

## When what you find does not add up

- **Two saved files disagree with each other.** Show the user both files and the
  exact sentences that disagree. Do not pick one, and do not edit either.
- **A saved file disagrees with the code or the running system.** Say so and show
  both. Do not silently trust either one.
- **`memory/index.md` disagrees with the files.** The files win. Rebuild the
  index with `node .claude/tools/build-memory-index.mjs`. Nobody edits it by
  hand.
- **A fact appears only in `brainstorms/`.** It is not saved. Treat every line in
  a transcript as unchecked words. If it is worth keeping, it goes through the
  `remember` skill like any other fact.

---
name: explain-simply
description: Re-explain the last answer, a plan, or a named document as short bullets a non-technical reader gets in one pass, keeping every number, name and file path. Use when the owner types /explain-simply, or says "explain that like I'm five", "explain it like I'm 5 years old", "put that in plain bullets", "simpler", or asks for the short bulleted version of something you just said.
---

# Explain it simply

Rewrite something as short bullets the owner can read once and act on.

## What to explain

In this order:

1. Whatever the owner named in the arguments (a file path, a plan, a work item,
   a topic).
2. If they named nothing, your own last substantial answer in this conversation.
3. If there is no such answer, say so in one line and ask what they want
   explained.

Do not go and re-research the topic. Explain what is already established. If the
source is a file, read it first.

## The shape

- **Bullets only.** No paragraphs anywhere, including under headings.
- **One idea per bullet. One line per bullet.** If a bullet needs a second line,
  it is two bullets.
- **Bold headings to group them.** Four to six groups. Each heading is a short
  plain phrase, not a label like "Overview" or "Summary".
- **Fits on one screen.** Roughly 25 bullets is the ceiling.
- **Ends with "What I need from you"**, numbered, and only when there is
  genuinely something for them to do. No ending if there is nothing.

## The rule that matters most

**Simplify the wording. Never simplify the facts.**

Every one of these survives into the simple version:

- Numbers, counts and dates
- File paths and file names
- People's real names
- Record ids, org names, field names
- What is blocked, and what is blocking it
- Anything that costs money, takes time, or cannot be undone

A simple explanation that dropped the numbers is not simpler, it is just vaguer,
and the owner cannot act on it. If a fact will not fit, keep the fact and cut a
different bullet.

## The words

- No word a general reader would have to look up.
- A technical name that cannot be avoided keeps its exact spelling, and gets
  four plain words right after it saying what it is.
- No jargon the owner did not use first. No figures of speech. No nicknames you
  made up. No bare letters or numbers standing in for a thing ("option B",
  "risk 1").
- No em dashes. No section signs; write "section 7".

## Honesty

- Say plainly when something is unknown, unchecked, or an assumption.
- Say plainly when something failed.
- Never smooth over a gap to make the bullets read better.
- If the source is long and you had to leave things out, say what you left out in
  one bullet rather than dropping it silently.

## Voice

Read the project's active output style before writing, so this matches the rest
of the project instead of drifting. Find it at
`.claude/output-styles/<name>.md`, where `<name>` is the `outputStyle` value in
`.claude/settings.local.json`, then `.claude/settings.json`, then
`~/.claude/settings.json`. If there is no such file, the rules above are enough
on their own.

## Example shape

```
**The problem**

- The project board has 212 rows.
- Each row is a big chunk of work, one of them 240 hours.
- The release tool wants small pieces, one thing a developer ships on its own.

**The idea**

- Put each board row in as a folder.
- Chop it into small pieces and put each piece inside its folder.
- Roughly 100 folders, roughly 400 small pieces.

**The safety rules**

- The target org is live, so I never write to it. You press the button.
- A piece only exists if it points at real proof. No proof, no piece.

What I need from you:

1. Re-export the board with the Item ID column switched on.
2. Say yes to the plan, or tell me what to change.
```

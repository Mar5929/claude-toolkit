# explain-simply

Say that again in short bullets, without losing a single number.

**Setup: install and go.** Install once per machine. It reads the conversation
or a file you name and writes nothing, so there is nothing to set up in a
project.

## What it does

Ask for it and you get bullets, grouped under bold headings, at a reading level
anyone follows in one pass:

```
**The problem**

- The project board has 212 rows.
- Each row is a big chunk of work, one of them 240 hours.
- The release tool wants small pieces, one thing a developer ships on its own.

**The idea**

- Put each board row in as a folder.
- Chop it into small pieces and put each piece inside its folder.
- Roughly 100 folders, roughly 400 small pieces.

What I need from you:

1. Re-export the board with the Item ID column switched on.
2. Say yes to the plan, or tell me what to change.
```

One idea per bullet, one line per bullet, four to six groups, one screen.

## The rule that makes it worth having

**Simplify the wording. Never simplify the facts.**

Numbers, dates, counts, file paths, people's real names, record ids, field
names, what is blocked and what is blocking it, and anything that costs money or
cannot be undone: all of it survives into the simple version.

This is the whole point. The usual failure of a "simpler" explanation is that it
drops the specifics, and then it is not simpler, only vaguer, and the reader
cannot act on it. When a fact will not fit, the skill keeps the fact and cuts a
different bullet.

## Why it exists

Two moments create the need.

A long technical answer landed and it did not go in. Rather than reading it
three times, ask for it again in bullets.

Or a decision has to be made and the material behind it is a plan file, a spec,
or a thread. The decision is yours; the reading should not be a chore.

Mike asked for this on 2026-08-10, after asking twice for the same plan and
finding the bulleted second version was the one he could use. A repeat request
should be a command, not something described from scratch each time.

## What it explains

- Whatever you name: a file path, a plan, a work item, a topic.
- If you name nothing, the last substantial answer in the conversation.

It does not go and re-research the subject. It explains what is already on the
table, so it is fast and it cannot quietly change the answer.

## Install and use

```
/plugin install explain-simply
```

Then say any of: "explain that like I'm five", "explain it like I'm 5 years
old", "put that in plain bullets", "simpler", or run `/explain-simply`. Point it
at something with `/explain-simply path/to/file.md`.

## It follows the project's own voice

Before writing, it reads the project's active output style, found through the
`outputStyle` setting in `.claude/settings.local.json`, then
`.claude/settings.json`, then `~/.claude/settings.json`. So the simple version
sounds like the rest of the project rather than like a different assistant. With
no output style installed, its own rules are enough on their own.

Pairs well with `hooks-library`, whose `style-reminder` hook keeps that same
output style in front of the assistant on every message.

## What it deliberately leaves out

No preamble, no "here is the simple version" opener, no closing offer to explain
further. No paragraphs. No em dashes. No jargon you did not use first, and no
nicknames invented on the spot. The ending block naming what you have to do
appears only when there is genuinely something to do.

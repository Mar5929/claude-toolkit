---
name: recall
description: >-
  Find what this project already knows before searching code broadly or asking
  the owner something already answered. Walks the find ladder: short-term
  memory, rules, skills, long-term memory and specifications, then past
  sessions. Use when picking up work, before changing behavior, when asking what
  was decided, or when the owner runs /recall.
---

# recall

Search here before asking the owner, and before searching the code broadly.

## The find ladder

Go down these tiers. Stop at the first one that answers.

### Tier 1: short-term memory

Read `knowledge/current.md`. It says what is being worked on, what is blocking
it, and the next step. It is overwritten scratch, so treat it as what is
happening now, never as a lasting fact.

### Tier 2: rules

Check `.claude/rules/`. The answer may be a standing instruction rather than a
fact. These are already loaded into the session, so this is a check, not a
search.

### Tier 3: skills

Ask whether this is a procedural thing: a repeatable way of working rather than
something to look up. If it is, the answer is a skill, and there may be no fact
to find at all.

### Tier 4: long-term memory and specifications

1. Read `knowledge/memory/memory-index.md` and `knowledge/specs/spec-index.md`.
   One line per file, so this is cheap.
2. Open only the files whose summary looks like it answers the question.
3. Follow the plain relative links inside what you find. One step usually gets
   you there.
4. Read `knowledge/project.md` when you need the shape of the project rather
   than one fact.

**A current specification beats a memory.** A specification says how something
is meant to work. A memory may explain the history behind it and point at it.

**Only `current` files answer what is true now.** A file marked `superseded` or
`retired` answers questions about history. The index shows that status, so a
non-current file is visible before you open it.

Read `knowledge/brainstorms/` only when raw exploration is what you need, and
say out loud that it is unchecked.

### Tier 5: past sessions

The lowest tier, not a last resort. Reached only when the four above came up
empty.

**Say what happened first.** Name what you searched and that it found nothing.
Never invent a believable answer, and never hand back something recent but
unrelated because it was the closest match.

**Then offer it.** Ask the owner: "I cannot find it. Do you want me to search
past sessions?" He may say yes, or you may use your own judgment and search.
Either way it is offered or announced, never done silently.

Use the `session-search` skill to run it.

**Everything found there comes back flagged.** A past session is a record of
what was said once, not current truth. Hand each result back with the question
attached:

> I found this in a previous session. Is this still accurate?

Nothing from a past session is written into memory or a specification on the
strength of having been found there. If it turns out to still be true, it goes
through `remember` like anything else.

## Reading a file's trust

Every memory file says how it is known:

- `observed`: an agent checked it directly.
- `reported`: someone said it.
- `inferred`: an agent worked it out, and nobody has checked it.

Treat `inferred` as a lead, never as settled. Time passing does not promote it.

`confirmed_at` says when someone last checked the file is still true. An old
`confirmed_at` does not mean the file is wrong. It means nobody has looked
lately, so weigh it accordingly and say so if it matters.

`source` says where the fact came from and where to go check it. When exact
wording matters, open that source rather than trusting the restatement.

## Obsidian tools, when the owner has them

The owner installs these outside the toolkit: an Obsidian MCP server with
`mcp__obsidian__*` tools, and the `kepano/obsidian-skills` skills. When present,
use them to find, read, and search. Reading and searching only. They are
optional and everything here works without them, because the folder is ordinary
Markdown.

## Conflicts

- **Two current files disagree.** Show both and quote the exact statements. Do
  not silently choose.
- **A memory disagrees with a current specification.** The specification is what
  is true now. Say so and name both.
- **A saved file disagrees with the code or observed behavior.** Show both and
  say they disagree. The code is what runs; the file may still hold the reason
  it was written that way.
- **An index disagrees with the files on disk.** The files win. Rebuild it with
  `node .claude/tools/build-knowledge-index.mjs`.

## When nothing is found anywhere

Say so plainly, name every tier you searched, and ask. Do not guess, and do not
fill the gap with something adjacent.

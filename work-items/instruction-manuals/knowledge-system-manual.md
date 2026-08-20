# Memory: the agent's instruction manual

**Status: draft, 2026-08-20. Not approved. Do not build from this yet.**

This is the manual an agent reads to use this project's memory. The short version
lives in `CLAUDE.md` and `AGENTS.md`. This file holds the details.

---

## 1. Two memories

**Short-term memory is where the work is right now.** One file,
`knowledge/current.md`. It says what is being worked on, what is blocking it, and
the exact next step. It gets overwritten, never added to. It is the handoff: a
new agent reads it and carries on without the earlier conversation.

**Long-term memory is what stays true after the work is done.** A folder of
Markdown files, `knowledge/memory/`. One file per topic.

The difference is not how old something is. It is whether it survives the work
finishing. "We are halfway through moving the data" is short-term. "The move has
to run in this order or it fails" is long-term.

---

## 2. Where information goes

Memory is one of six places. Putting something in the wrong one causes real
damage, so check this before saving anything.

| The question | Where it goes |
|---|---|
| Who the agent is in this project | `SOUL.md` |
| A standing instruction for how the agent must behave | `.claude/rules/` |
| A repeatable procedure for a kind of work | A skill |
| How the system is meant to work, once settled | `knowledge/specs/` |
| A lasting fact, decision, event, or piece of context | `knowledge/memory/` |
| Only needed to finish the task at hand | Nowhere. It stays in the conversation. |

Two of these get mixed up constantly:

**A procedure is not a memory.** If the agent learns a repeatable way to do
something, that is a skill or a rule. Saving it as a memory means it comes back
later as a fact and gets followed as an instruction. That is how an agent quietly
changes how it works.

**A specification beats a memory.** Once behavior is settled, the specification
answers "how does this work." A memory can explain the history and point at it.
When a memory and a current specification disagree, say so out loud. Do not
quietly pick one.

---

## 3. What a memory file looks like

One file, one topic. There are no categories, no folders per type, and no form
that makes you choose a bin. One note about a single topic is usually a fact, a
decision, and a piece of history all at once. Never split it up to fit a label.

The filename is the topic, in plain words.

```markdown
---
summary: One sentence saying what this file tells you.
created: 2026-08-20
confirmed: 2026-08-20
status: current
confidence: observed
source: Where this came from, and where to go check it.
tags: [tag-one, tag-two]
---

# The topic, in plain words

What is true, written so someone reading it a year from now understands it
without the conversation that produced it.

Related: [another memory file](another-topic.md)
```

**What each field is for:**

- **`summary`** lets you find the right file without opening ten of them. One
  sentence.
- **`created`** and **`confirmed`** are different. `created` never changes.
  `confirmed` is the last time someone checked this is still true. An old
  `confirmed` date does not mean the file is wrong. It means nobody has checked
  it lately.
- **`status`** is `current`, `superseded`, or `retired`. Only `current` files
  answer questions about what is true now.
- **`superseded_by`** appears only when `status` is `superseded`. It is the path
  to the file that replaced this one.
- **`confidence`** is `observed`, `reported`, or `inferred`. Observed means the
  agent checked it. Reported means someone said it. Inferred means the agent
  worked it out. Something inferred stays inferred until somebody checks it.
- **`tags`** are free-form. There is no fixed list, and a file can have as many
  as it needs. Tags are how you find a topic across many files.
- **`source`** says where this came from and where to go check it: a file path, a
  commit, a link, or the name of the person who said it.

**Links are plain file paths written in the body.** There is no list of links
kept anywhere. To find what points at a file, search for its name.

---

## 4. What to store

Seven questions. The first four decide whether the memory should exist at all.
The last three decide whether it is safe to write. Ask all seven.

**Should it exist?**

1. **Is it a lasting fact, decision, event, or state?** How hard it was, how new
   it felt, how much work it took, and how long it was discussed do not count. A
   session feeling important is not proof that anything lasting came out of it.
2. **Did the project change, or did the agent just do work?** What the agent did
   is not project history. "Wrote fourteen files today" is not a memory. What
   those files changed about the project might be.
3. **Will it still be true in six months?** A fact that goes out of date is worse
   than no fact, because a future agent will believe it.
4. **If it is missing, does the owner have to explain it again, or does a future
   agent get it wrong?** If neither happens, it is not needed.

**Is it safe to write?**

5. **Can this be found or worked out from what is already there?** The code, a
   specification, a rule, a skill, the work tracker, or a memory that already
   exists. If yes, link to it. Never write a second copy. The two will drift
   apart and then neither one can be trusted. Two files saying the same thing
   from genuinely different sources are two pieces of evidence, not a copy.
6. **Can it say where it came from and where to go check it?** A memory that
   cannot say where it came from does not get written.
7. **Could a future agent read this as meaning more than it does?** Something
   that is true in one narrow case, written loosely, gets read as a general rule
   and followed. If the wording can be read two ways, tighten it or do not save
   it.

**When unsure, do not save.** Not saving costs one missed note. Saving carelessly
makes everything else in the folder less trustworthy. The owner can always say
"remember this."

### What never goes in memory

Tool calls, searches, and commands run. Rough thinking. Ideas that were tried and
dropped. Ordinary test and compiler errors. Files opened. A blow-by-blow of
edits. Chit-chat. Copies of code or specifications that already exist. Live
status of current work. Passwords, keys, and tokens, ever, because this folder is
in Git and Git keeps everything.

---

## 5. When to store

**Never break off what you are doing to save something.** Keep a quiet list while
you work and say nothing about it.

**Offer the list at a stopping point.** There are four:

- when a task or work item finishes
- before a commit or pull request
- before a handoff or before clearing context
- when the session has run long

**The owner can say "remember this" at any time.** That starts the review below.
It is not permission to write. It starts the process, it does not skip it.

**Never write memory without approval.** No hook, background job, or helper agent
writes memory on its own. That is what makes the memory worth trusting.

---

## 6. How to ask for approval

Show these four bullets for each thing being saved. One group per file. Write
nothing until the owner answers.

> **What:** what the memory says. Three sentences at most.
> **Where:** the exact file path, and whether it is new or an update.
> **Tags:** the tags, and anything else about how it is being filed.
> **Assumptions:** anything being assumed, guessed at, or not checked. Write
> `None` when there is none.

Rules for the review:

- **Assumptions get approved separately from the content.** An assumption is how
  memory gets polluted. If the owner approves the content but not an assumption,
  the assumption comes out and the memory is written without it.
- **Silence is not approval.** No answer, an unclear answer, or asking to see the
  full text all mean nothing gets written.
- **The owner can change anything.** The wording, the location, the tags, or drop
  it entirely.
- **Write only what was approved.** Not the surrounding context, not an improved
  version, not one extra sentence that seemed useful.

---

## 7. Updating, superseding, retiring, deleting

**Never just add.** Writing a new file every time something comes up is how the
folder turns into a mess nobody trusts. Before writing anything new, check
whether a file on this topic already exists.

**Update** when the new information agrees with the file and adds to it. Edit the
file, change `confirmed` to today, and note what changed. No new file.

**Supersede** when the new information contradicts the file and the new
information is right. Three steps, done together:

1. Write the new file.
2. On the old file, set `status` to `superseded` and `superseded_by` to the new
   file's path.
3. Search for the old file's name and fix anything still pointing at it as
   though it were current.

The old file stays. Often the fact that something changed is the useful part.

**Retire** when a file no longer applies but its history still matters. Set
`status` to `retired`. It stops answering questions about what is true now and
stays findable.

**Delete** only for these reasons, and say which one:

- a copy created by mistake
- a password or key that should never have been written down
- something that was never true, which is different from something that stopped
  being true

**Being old is never a reason to retire something.** Written two years ago and
still true means still true.

---

## 8. Finding things

Search here before asking the owner, and before searching the code broadly.

1. Read `knowledge/current.md`. It says what is happening now.
2. Search `knowledge/memory/` for the topic. Look at filenames, summaries, and
   tags.
3. Check `knowledge/specs/` for how something is meant to work. A current
   specification beats a memory.
4. Follow the links inside whatever you find. One step usually gets you there.
5. If nothing turns up, say so plainly and name what you searched. Never make up
   a believable answer, and never hand back something recent but unrelated.

Only files marked `current` answer questions about what is true now. A superseded
file answers questions about history.

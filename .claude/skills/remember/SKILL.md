---
name: remember
description: >-
  Save something into this project's specifications or memory, with the user
  reading and approving the exact words first. Use when the user says "remember
  this", "save that", "write that down", "capture what we did", or runs
  /remember. Also use when a pull request is about to open, and when the session
  is about to be cleared or handed to a fresh session. Draft the real words,
  number them, show them, and write only what the user keeps.
---

# remember

`specs/memory-system.md` is the law for this. If anything here disagrees with
it, the specification wins.

## When a save runs

Three moments, and no others:

1. The user asks for something to be remembered, or types `/remember`.
2. A pull request is about to open.
3. The session is about to be cleared, or handed to a fresh session.

Not at the end of a message, not on a commit, and not after a small fix. Saving
at those moments is what fills the folders with things nobody needs.

## The six steps

### 1. Search first

Before proposing anything, check what is already in force:

- the instruction files this session already carries: the global instruction
  file, the project's instruction files, and the rules folder;
- the text inside `specs/` and `memory/`.

If the fact already lives in any of those places, name the place and write
nothing new. `brainstorms/` does not count: a fact sitting in a transcript is
not saved.

### 2. Prefer an edit

If a file already covers the fact, propose an edit to that file. Never create a
second file about the same fact.

### 3. Draft the real words

Write out what would actually be saved, not a description of it. Number each
piece and give its file path.

### 4. Label where every fact came from

Use the fixed `source:` values below. Nothing else.

### 5. Show the user, then stop

Each piece leads with one line the user can take in at a glance: its number, its
destination, its one-sentence summary, and its source value. The full words sit
directly under it. Then stop and wait.

The user replies with numbers:

- **Keep:** write it exactly as drafted.
- **Cut:** write nothing, keep no list of it, and do not raise it again.
- **Edit:** write the user's words exactly as typed, with no checking and no
  argument, because the user is the source.

### 6. Write only what the user kept

Then run the index script:

```
node .claude/tools/build-memory-index.mjs
```

Then state exactly which files were written and what was cut.

A save can also propose deleting a file that is wrong or no longer worth
keeping. The draft names the file and says why. Git keeps every old version, so
a deleted file can always be brought back.

## How much detail to write

This applies to memory only, never to a specification.

Write the shortest version that still prevents the mistake. Not "as short as
possible", which cuts things that matter. The shortest one that still does the
job. Two questions, in this order:

1. **The whole file.** If a future agent read only this, would it act correctly?
   Once that is true, stop. Everything past that point is not helping it, it is
   only true.
2. **Each sentence.** If this sentence were deleted, would that agent make a
   mistake, or have to work something out again? If not, the sentence goes.

Detail earns its place by preventing a wrong action, never by being true,
interesting, or complete. You are not writing a record of what happened. You are
writing the note that stops the next agent getting it wrong, and that agent is
busy and reading in a hurry.

The usual ways a memory gets fat: repeating what a linked file already says,
writing out the wrong way as well as the right way, and explaining how the
finding was reached instead of what to do about it.

Length follows the fact, not a rule. A safety boundary may need a page, and most
memories are a title, a summary, and a few lines. If a draft runs long, say in
one line why it has to. If you cannot say why, it is too long.

## Which folder it goes in

**`specs/`** holds what a thing must do. One file per capability, named after the
capability, grouped into one folder per area. Never invent a new area folder on
your own: propose the folder name as part of the save, and the user approves it
with everything else.

A specification is the living truth for how the system should work right now. It
is not a proposal, and it is not a record of how things used to be. When
approved behavior changes, the specification changes in the same piece of work.

**`memory/`** holds what is worth knowing.

| Folder | Put a file here when | Do not put it here when |
| --- | --- | --- |
| `memory/context/` | Something about the situation shapes several pieces of work: who is involved, what the project is up against, a limit that comes from outside. | It is what someone is working on right now, or what is blocked. That belongs in the work tracker. Or it is how the user likes to work on every project. That belongs in the user's toolkit, not in one project's memory. |
| `memory/decisions/` | A choice was made that is not obvious, and knowing why will stop someone reversing it or arguing it again. | The choice was routine, or it is already written in a specification. |
| `memory/knowledge/` | Something was worked out that would take real effort to work out again, or that stops a mistake somebody is likely to make. | It is obvious from reading the nearby code, or it is really a decision or a specification. |
| `memory/domain/` | A word or a business rule in this project means something specific that an agent could get wrong. | It describes how the software behaves. That is a specification. |
| `memory/operations/` | There is a repeatable procedure for running, releasing, or recovering something, along with how to tell it worked. | It is a one time task, or it is a password or a key. Those never go in any file here. |
| `memory/planning/` | The direction matters beyond one piece of work: where this is going, in what order, and what could go wrong along the way. | It is the status of one ticket. |
| `memory/references/` | An outside source matters to this project, and someone needs to know what it supports and why. | The thing already has a home in this repository and can simply be linked. |

Files sit directly inside these seven folders, with no folders below them. When
one folder grows crowded enough that a person can no longer scan it, propose
grouping its files into area folders, using the same area names as `specs/`
where they fit. Only after the user says yes, and never ahead of the crowding it
solves.

If a file could sit in two of these folders, it goes in the one that says **why
it matters**, not the one that says what it is about. When it is still unclear,
say so and ask rather than guessing.

One event can produce two files. When a big choice changes the direction, the
choice and its reason go in `memory/decisions/`, the roadmap in
`memory/planning/` is updated to match, and the two files link to each other.

### Facts that belong somewhere else

- A standing preference about how the user works on **every** project belongs in
  the user's toolkit, not in one project's memory.
- A value a tool enforces belongs in that tool's settings file. Memory may
  record that it is set and where.
- A rule the agent must follow in every session is not a memory. It lives with
  the project's always-loaded instructions. When the rule has a story worth
  keeping, why it exists, what happened, what was rejected, a memory file holds
  the story and the rule links to it.

When a fact belongs outside this project, say so and propose the right home
instead of saving a local copy.

### Never saved anywhere here

No password, no key, and no private personal information that does not belong in
a repository. These folders get pushed to GitHub and copied to other machines.

## The shape of a memory file

```
---
source: user-said-it
date: 2026-08-06
tags: [intake, client-team]
---

# Why intake was built with flows instead of custom code

The client's admin team maintains intake, so we chose flows they can
edit over code they cannot.

The body, written in whatever shape fits the content.

## Related

- [title of the other file](../planning/other-file-name.md): a few
  words on how it connects.
```

The fields:

- `source:` exactly one of `user-said-it`, `read-from-file`, or
  `agent-guess-unchecked`. No other value exists. Never invent one.
- `source-file:` the exact file path. Included exactly when `source:` is
  `read-from-file`, never otherwise.
- `date:` the day the file was saved or last changed, written `YYYY-MM-DD`.
- `tags:` a short list of topic words, each taken from `memory/tags.md`. A new
  tag is proposed as part of the save and approved by the user, like a new area
  folder.
- `superseded-by:` the path of the file that replaced this one. A file carrying
  it is history, never current truth.

The `source:` value covers the whole file. If one fact inside the body came from
somewhere else, mark that line where it sits, in plain text, with the same fixed
words: `(source: agent-guess-unchecked)`.

`Related` is included only when there is at least one related file.

### Things that may stop being true

Some of what gets saved will not be true forever. That is fine, and it is not a
reason to leave it out. When you can see what future change would make a file
wrong, say so in the body in plain words, so a later reader knows to check
rather than trust.

## The shape of a specification file

```
# Title saying what this is

One sentence saying what this file covers.

## What it is for

Why this exists and what problem it solves.

## Who uses it

One entry per persona, saying what that person is trying to get done.

## What it must do

Everything that has to be true for this to count as working.

## How it behaves from the outside

Step by step: what the person does, and what happens back. Not the
internals.

## Edge cases

The odd and unhappy situations, each one with exactly what should happen.
Name the behavior, not just the situation.

## What it deliberately does not do

What was left out on purpose, and why. This stops a future agent adding it
back.

## Related

- [title of the other file](../memory/decisions/other-file-name.md): a few
  words on how it connects.
```

- `What it is for`, `What it must do`, `How it behaves from the outside`, and
  `Edge cases` are always included.
- `Who uses it` is included only when more than one kind of person uses the thing
  and they need different things from it.
- `What it deliberately does not do` is included only when something was actually
  left out on purpose.
- `Related` is included only when there is at least one related file.
- A file in `specs/` carries no YAML block, because the user approved every word
  of it before it was written.
- A section with nothing to say is left out, never left in with a placeholder.

## How files link to each other

One fact lives in exactly one file. Every other place that needs it links to
that file instead of repeating it, because a copy drifts out of date and a link
cannot.

A link is a plain Markdown link pointing at the other file from where this one
sits.

```
[why we dropped the memory verifier](../decisions/why-we-dropped-the-memory-verifier.md)
[how the memory system works](../../specs/memory-system.md)
```

A link can sit inside the body, where naming the other file helps the sentence
read, or in the `Related` section at the bottom.

**Links go both ways.** When a link is added from one file to another, the
matching link back is added in the same save.

Never link to a file that does not exist yet. If it needs to exist, save it in
the same save and link both ways then.

When a file moves or is renamed, every link pointing at it is fixed in the same
change.

## File names

Lower case, words joined by hyphens, describing the content in plain words.
`why-we-dropped-the-memory-verifier.md`, not `decision-001.md`. Files get found
by name, so the name has to say what is inside.

## Edge cases

- **Nothing is worth saving.** Say so in one line and show nothing else.
- **The fact already exists in a file.** Name that file and write nothing.
- **The right folder is unclear.** Say which two folders it could go in and ask.
  Do not guess.
- **The user does not reply.** Write nothing. A pull request still opens with the
  code in it, and the saved files are added to the same pull request whenever the
  user answers.
- **The user cuts everything.** Write nothing, and keep no list for later.
- **A fact is a guess.** Show it anyway, marked `source: agent-guess-unchecked`,
  so the user can cut it on sight.
- **Two saved files disagree with each other.** Show the user both files and the
  exact sentences that disagree. Do not pick one, and do not edit either.
- **A saved file disagrees with what you see in the code or the running system.**
  Say so and show both. Do not silently trust either one.
- **A related file does not exist yet.** Leave the link out.
- **A fact appears only in a brainstorm transcript.** It does not count as saved.
  If it is worth keeping, it goes through a save like any other fact.
- **The index disagrees with the files.** The files win. Run the script again.
  Nobody edits `memory/index.md` by hand.

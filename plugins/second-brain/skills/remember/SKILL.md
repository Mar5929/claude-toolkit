---
name: remember
description: >-
  Decide where persistent information belongs and save approved memory or
  specification files under knowledge/. Use when the owner says remember, save,
  capture, or write this down; before a pull request opens; before a handoff or
  context reset; when a work item finishes; or at another settled completion
  point. Search what already exists before proposing anything. Show short What,
  Where, Source, Tags, and Assumptions bullets, then write only what the owner
  approves.
---

# remember

The complete save workflow. An adopting project needs no other file.

The design authority behind this skill is the toolkit repository's own
`knowledge/specs/knowledge-system.md`, which stays in the toolkit and is never
installed into a project.

Nothing is written without approval. No hook, background job, or helper agent
writes on its own. That is what makes what is saved worth trusting.

## 1. Search before drafting

Go down the find ladder and stop at the first tier that answers:

1. `knowledge/current.md`. What is happening now.
2. `.claude/rules/`. It may be a standing instruction, not a fact.
3. Skills. It may be a procedure rather than something to look up.
4. `knowledge/memory/memory-index.md` and `knowledge/specs/spec-index.md`, then
   the files themselves, then the links inside what you find.
5. The work tracker. An open or closed work item may already own the decision.

**If a current file already says it, name that file and write nothing.** Closing,
or living outside the repository, is not a reason to create a second copy. Two
files saying the same thing drift apart, and then neither can be trusted.

Where the owner has Obsidian tools installed (an Obsidian MCP server with
`mcp__obsidian__*` tools, or the `kepano/obsidian-skills` skills), use them to
find, read, and search. Reading and searching only. Every write follows the file
shape below with ordinary relative Markdown links and `.md` extensions, never
Obsidian-only wikilinks, embeds, or extra properties, even when an Obsidian skill
recommends them. The tools are optional and everything here works without them.

## 2. Test whether it should be saved

Seven questions. The first four decide whether it should exist. The last three
decide whether it is safe to write. Ask all seven.

**Should it exist?**

1. **Is it a lasting fact, decision, event, or state?** How hard it was, how new
   it felt, how much work it took, and how long it was discussed do not count.
2. **Did the project change, or did the agent just do work?** What the agent did
   is not project history. What it changed about the project might be.
3. **Will it still be true in six months?** A fact that goes out of date is worse
   than no fact, because a future agent will believe it.
4. **If it is missing, does the owner have to explain it again, or does a future
   agent get it wrong?** If neither, it is not needed.

**Is it safe to write?**

5. **Can this be found or worked out from what is already there?** If yes, link
   to it. Never write a second copy. Two files from genuinely different sources
   are two pieces of evidence, not a copy.
6. **Can it say where it came from and where to go check it?** If not, it does
   not get written.
7. **Could a future agent read this as meaning more than it does?** Something
   true in one narrow case, written loosely, gets read as a general rule and
   followed. Tighten the wording or do not save it.

**When unsure, do not save.** Not saving costs one missed note. Saving carelessly
makes everything else less trustworthy. The owner can always say "remember this."

## 3. Decide where it belongs

| The question | Where it goes |
|---|---|
| Who the agent is in this project | `SOUL.md` |
| A standing instruction for how agents behave | `.claude/rules/` |
| A repeatable procedure for a kind of work | A skill |
| How the system is meant to work, once settled | `knowledge/specs/` |
| A lasting fact, decision, event, or piece of context | `knowledge/memory/` |
| What is being worked on right now | `knowledge/current.md` |
| A work item's requirements and status | The work tracker |
| Only needed to finish the task at hand | Nowhere |

**A procedure is not a memory.** If it is a repeatable way of working, say so and
propose a rule or a skill. Follow the project's normal work process to build it.
Do not save it as memory as a temporary substitute. This skill writes memory and
specification files only.

**A specification beats a memory.** Once behavior is settled it belongs in
`knowledge/specs/`. A memory may explain the history and point at it.

Raw exploration stays in `knowledge/brainstorms/` and is not a save. Outside
source material and a conclusion drawn from it are two separate items when both
pass the test on their own. Never mix unchecked research into an approved
decision.

**Secrets and private personal information never go in knowledge.** This folder
is in Git and Git keeps everything.

## 4. Use the file shape

`knowledge/memory/` is flat. One file per topic. The filename is the topic in
plain words: lowercase, hyphen-separated, ending `.md`. Not a date, not a code,
not a ticket number.

Nine required fields:

```yaml
---
summary: One sentence saying what this file tells you.
type: decision
status: current
source: Mike said it in the 2026-08-21 session about the migration
confidence: reported
created_at: 2026-08-21
tags: [migration, contact, salesforce]
approved_by: Mike Rihm
approval_date: 2026-08-21
---
```

- `type` is `fact`, `decision`, `event`, `context`, or `constraint`. It records
  what kind of thing this mostly is. It does not decide where the file sits.
- `status` is `current`, `superseded`, or `retired`. Only `current` answers
  questions about what is true now.
- `source` says where it came from and where to go check it: a file path, a
  commit, a link, or the name of the person who said it.
- `confidence` is `observed` (the agent checked it), `reported` (someone said
  it), or `inferred` (the agent worked it out). Something inferred stays inferred
  until somebody checks it. Never promote it because time has passed.
- `tags` are free-form. There is no fixed list and no vocabulary file. Use as
  many as the file needs.

Optional, written only when they apply: `confirmed_at` (the last time someone
checked it is still true), `source_quote`, `effective_from`, `effective_to`,
`project`, `work_item`, `supersedes`, `superseded_by`, `related_memories`.

Below the frontmatter, a title in plain words, then what is true, written so
someone reading it a year from now understands it without the conversation that
produced it. Links are plain relative file paths in the body.

A specification file uses the same fields minus `confidence` and `type`, plus
`area` naming the process or function area it covers. A specification never
restates the production code: nothing goes in it that an agent could work out by
reading the source.

If different claims in one file come from different sources, mark the affected
claim in the body so the file-level `source` does not lend it false confidence:

```text
> Claim source: read from plugins/second-brain/tools/build-knowledge-index.mjs
```

## 5. Show the approval bullets

One group per file. Write nothing until the owner answers.

```text
1. <plain name of the thing>
   - What: <what it says, three sentences at most>
   - Where: <exact file path, and whether it is new or an update>
   - Source: <where the fact came from, and observed, reported, or inferred>
   - Tags: <the tags, and anything else about how it is being filed>
   - Assumptions: <everything assumed, guessed at, or unchecked, or None>
```

**What the owner approves is What and Source.** The other three are shown so he
can see how it is being filed, and he may change any of them.

- **Assumptions get approved separately from the content.** If he approves the
  content but not an assumption, the assumption comes out and the file is written
  without it.
- **Silence is not approval.** No answer, an unclear answer, or asking to see the
  full text all mean nothing gets written. Asking to see the text is not
  approval.
- **Write only what was approved.** Not the surrounding context, not an improved
  version, not one extra sentence that seemed useful. If drafting needs anything
  new, stop and show a revised proposal.
- **When the owner edits the words, his words are written exactly as typed**, with
  no argument and no further checking. He is the source.

Keep every path, number, date, and name needed to make the decision. Do not show
full file text unless asked.

Creating, updating, merging, moving, superseding, and removing all use this same
review. For a merge, move, or removal, `What` says what becomes current and what
stops being current.

## 6. Finish the save

1. Write only the approved meaning and the required file structure.
2. Repair any relative links the change affected.
3. Run both:

   ```text
   node .claude/tools/build-knowledge-index.mjs
   node .claude/tools/check-knowledge.mjs
   ```

4. Report the exact paths written, moved, or removed, and anything the owner
   skipped.

If a write, the index build, or the check fails, the save is unfinished. Report
the failure with its output. Never continue as though it saved.

## Updating, superseding, retiring, deleting

**Never just add.** Check whether a file on this topic already exists first.

**Update** when the new information agrees and adds to it. Edit the file, set
`confirmed_at` to today, note what changed. No new file.

**Supersede** when the new information contradicts it and the new information is
right. Three steps, together or not at all:

1. Write the new file with `supersedes` pointing at the old one.
2. On the old file set `status: superseded` and `superseded_by` to the new path.
3. Search for the old filename and fix anything still treating it as current.

The old file stays. Often the fact that something changed is the useful part.

**Retire** when a file no longer applies but its history matters. Set
`status: retired`.

**Delete** only for a copy made by mistake, a secret that should never have been
written, or something that was never true. Say which one out loud. Something that
stopped being true is superseded or retired, never deleted.

**Being old is never a reason to retire something.** Written two years ago and
still true means still true.

## When this runs

- The owner says remember, save, capture, or write this down.
- A pull request is about to open.
- A work item finishes.
- A session is about to hand off or clear context.
- Another natural completion point with a settled result.

Not after every message, commit, or small fix. One review may cover several
nearby completion moments when the result has not changed.

The owner saying "remember this" starts this review. It is not permission to
write and it skips no step.

## Edge cases

- **Nothing passes the test.** Say so in one line and write nothing.
- **A current file already owns it.** Name that file in one line and do not copy.
- **The home is unclear.** Show the candidate routes with their assumptions. Do
  not guess.
- **One review covers different kinds of information.** Split into separate
  groups with separate approval choices.
- **Full text is requested.** Show it, then wait for approval. Showing is not
  approving.
- **Two current files conflict.** Show the exact conflict and change neither.
- **Saved knowledge conflicts with the code or observed behavior.** Show both and
  say they disagree. Do not silently prefer one.
- **A memory conflicts with a current specification.** The specification wins for
  what is true now. Say so and name both.
- **The owner skips everything, or does not reply.** Write nothing and keep no
  queue for later.
- **A claim is a guess.** Show it, marked `inferred`, and let the owner decide.
  Keep it `inferred` until somebody checks it.
- **What is being saved is really live work status.** Route it to the work
  tracker or `knowledge/current.md`, not to memory or a specification.
- **The index is stale.** The source files win. Rebuild it.

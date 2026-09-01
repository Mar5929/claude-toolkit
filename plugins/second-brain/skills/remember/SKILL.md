---
name: remember
description: >-
  A skill for determining what to save to project knowledge, as memory or specs. Use
  when the owner says remember, save, capture, or write this down; after working
  out the fix for an error, a failure, or a broken process, so the next agent
  reuses it instead of solving it again; before a pull request; before a
  handoff; when a work item finishes; or at another settled stopping point. Search first, propose exact meaning, and write only what the
  owner approves.
---

# remember

Save a memory or a specification in this project, with the owner's approval.

## Read these first, every run

`knowledge/README.md` is the manual. Read all of it. Every time. It does not
matter how long the session has run or that you read it earlier.

[`references/proposal-template.md`](references/proposal-template.md) is the shape
every proposal takes. Read it before you show the owner anything, every run. It
is the only approved layout, and a proposal is never wrapped in a code fence.

`knowledge/memory-self-improvement.md` holds what this project has learned about
what the owner counts as memory-worthy. Use those lessons to drop or reshape
candidates before proposing them. When a lesson disagrees with the manual, the
manual wins, and say so out loud. If the file is missing, say so in one line,
continue, and recommend `project-sync`.

## 1. Gather and scope candidates

A trigger is a reason to check. It is not proof there is something to save.

Use the manual to drop candidates that are not memory-worthy, and its lifecycle
path to drop candidates that are not ready yet. Define the current project from
`knowledge/project.md`, the current work item, and the repository.

When the owner named exact content, keep that meaning. When the trigger is a
pull request, handoff, or finished work item, gather from the work itself, never
from a transcript of agent activity.

If nothing passes, say so in one line and stop.

## 2. Search before drafting

Invoke `recall` for each topic. Check the work tracker too when a work item may
already own the decision or the status.

- A current file already contains the information fully: name that file and
  write nothing.
- An existing file should grow: propose an update, not a new file.
- The information contradicts a current file: show the conflict and follow the
  manual's lifecycle path.

Obsidian tools may be used for read-only finding. They never change the file
shape or the approval boundary.

## 3. Draft and wait

Pick the canonical home and draft the file. Write in plain, clear language. Say
only what is needed. Context a future agent could work out for itself pollutes
the knowledge base and buries what matters.

Show the proposal in the template's exact shape, one numbered block per file,
as rendered Markdown and never inside a code fence. Same labels, same order,
every time. Keep it short, and do not show full file text unless asked.

A candidate that fails a rule in the manual is never proposed. Say in one line
that it was dropped and which rule it failed.

Then wait. Nothing is queued, cached for later, or written on silence, an
unclear answer, or a request to see more text. If the owner edits the meaning,
use those words exactly. Any new claim, source, or assumption means a revised
proposal and another wait.

## 4. Write only what was approved

Create or update the exact approved path. Fill the frontmatter the manual
requires, adding no meaning the owner did not approve. When claims in one file
come from different sources, mark the affected claim in the body, so file-level
provenance does not make it look more certain than it is.

Use relative Markdown links and `.md` extensions. Never hand-edit a generated
index.

A knowledge-only save may commit to the default branch and push once approved.

## 5. Verify

```text
node .claude/tools/build-knowledge-index.mjs
node .claude/tools/check-knowledge.mjs
```

Run the builder a second time and confirm it produces no diff. A failing check
means the save is unfinished: report it, and do not claim the knowledge is
stored.

Finish by naming what was written, updated, declined, or blocked.

## 6. Log the decision

Only when the owner proposed a change to what counts as memory here: append one
line per candidate to `## Recent decisions` in
`knowledge/memory-self-improvement.md`. Each line carries the date, the
candidate in a few words, the outcome (approved, edited, or rejected), and the
owner's reason in the owner's own words. Write "no reason given" when none was
given. Never invent a reason, and never write a secret or private personal
information.

This is operational state, not memory, so it needs no approval. The manual owns
the file's size limit and how to consolidate it. If the file is missing, skip
this, say so in one line, and recommend `project-sync`.

## Boundaries

- Writes memory and specifications only. It may point a procedure at a rule or
  a skill, and live status at the tracker, but it does not build those.
- Never writes secrets or private personal information.
- Never treats a helper agent, hook, or old session as approval.
- Never reroutes a rejected generic candidate into global memory. A stable,
  repeated, broadly useful lesson needs a separate global rule or skill review.
- Converting already-approved files from an older layout belongs to
  `second-brain`.

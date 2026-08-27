---
name: remember
description: >-
  Scope persistent information to the current project, decide where it belongs,
  and save approved memory or specification files under knowledge/. Use when the
  owner says remember, save, capture, or write this down; before a pull request;
  before a handoff; when a work item finishes; or at another settled stopping
  point. Search first, propose exact meaning, and write only what the owner
  approves.
---

# remember

## Read the save rules first

Before gathering a single candidate, open `knowledge/README.md` and read its
save-test and never-save sections in full. Do this every time this skill runs.
It is not conditional on how long the session has been, on compaction, or on
having read the manual earlier.

That manual is the authority for placement, the save test, items that never get
saved, file shape, approval, trust, and lifecycle. If it is missing, do not
invent a replacement policy or write lasting knowledge. Report the gap and
recommend `project-sync`.

In the same step, open `knowledge/memory-self-improvement.md` and read it. It
carries what this project already learned about what the owner counts as
memory-worthy. Use those lessons to drop or reshape candidates before proposing
them. If a lesson there disagrees with the manual, the manual wins and the
disagreement is said out loud. If the file is missing, say so in one line,
continue, and recommend `project-sync`.

## 1. Gather and scope candidates

Review what changed or became settled. A trigger is only a reason to check. It
does not mean the session produced anything worth saving.

Use `knowledge/project.md`, the current work item, and the repository to define
the current project. For every candidate, finish this sentence privately:
"Future work on this project needs this because ..." It passes only when the
answer names a future project action or decision that could otherwise be wrong,
or project-specific context the owner would have to explain again. Keep that
answer as the proposal's `Project value`.

Where a lesson happened does not make it project knowledge. Drop generic Claude,
Codex, shell, tool-call, sub-agent, and troubleshooting lessons. When an incident
reveals a lasting project constraint, keep only the constraint. In a project that
builds agent tooling, platform behavior passes only when it changes that
project's requirements, design, or supported workflows.

When the owner named exact content, preserve that meaning. When the trigger is a
pull request, handoff, or finished work item, gather candidates from the work,
not from a transcript of agent activity.

If nothing passes the manual's save test, say so in one line and stop.

## 2. Search before drafting

Invoke `recall` for each topic. Check the work tracker too when a work item may
already own the decision or status.

- If a current canonical file already says it, name that file and write nothing.
- If an existing file should be updated, propose an update instead of a new
  file.
- If the new information conflicts with a current file, show the conflict and
  use the lifecycle path from the manual.

Optional Obsidian tools may be used for read-only finding. They never change the
Markdown file shape or approval boundary.

## 3. Draft and wait

Choose the canonical home and draft the standalone meaning. Then show the
numbered approval group required by the manual, one group per file, with a
verdict block attached to that group. Do not show full file text unless asked.

The verdict block is one line per save-test question, numbered 1 to 7. Each line
says pass or fail and the reason in a few words. The line for question 5 names
what you actually searched: the files, rules, and config you opened. Saying
nothing was found without naming what you looked at is not a verdict.

A candidate that fails any question is not proposed. Say in one line that it was
dropped and which question failed.

Wait. Nothing is queued, cached for later, or written on silence, an unclear
answer, or a request to see more text.

When the owner edits the proposed meaning, use those words exactly. If any new
claim, source, or assumption is needed, show a revised proposal and wait again.

## 4. Write only the approved result

Create or update the exact approved path. Fill the required frontmatter from the
manual without adding meaning the owner did not approve. When claims in one file
come from different sources, mark the affected claim in the body so file-level
provenance does not make it look more certain than it is.

Use ordinary relative Markdown links and `.md` extensions. Never hand-edit the
generated indexes.

## 5. Verify and report

Run:

```text
node .claude/tools/build-knowledge-index.mjs
node .claude/tools/check-knowledge.mjs
```

Run the index builder a second time and confirm it produces no diff. If any
check fails, the save is unfinished. Report the failure and do not claim the
knowledge is safely stored.

Finish by naming exactly what was written, updated, declined, or blocked.

## 6. Log what the owner decided

Append one line per candidate to the `## Recent decisions` section of
`knowledge/memory-self-improvement.md`. Each line carries the date, the
candidate in a few words, the outcome (approved, edited, or rejected), and the
owner's reason in the owner's own words. Write "no reason given" when the owner
gave none. Never invent a reason, and never write a secret or private personal
information.

This write needs no approval. It is operational state, not memory, so it does
not go through the approval group.

If the append would push the file past its 8,000 character cap, consolidate it
first the way `reflect` does, or say plainly that it needs consolidating and
leave it alone. Never truncate it silently. If the file is missing, skip the
append, say so in one line, and recommend `project-sync`.

## Boundaries

- This skill writes memory and specifications only. It may point a procedure to
  a rule or skill and live status to the tracker, but does not build those items.
- It never writes secrets or private personal information.
- It never commits, pushes, opens a pull request, or merges.
- It never treats a helper agent, hook, or old session as approval.
- It never reroutes a rejected generic candidate into global memory. A stable,
  repeated, broadly useful lesson needs a separate global rule or skill review.
- Converting already-approved files from an older layout belongs to the
  `second-brain` skill, not this one.

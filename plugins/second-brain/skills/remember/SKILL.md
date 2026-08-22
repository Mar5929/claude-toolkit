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

Use `knowledge/README.md` as the authority for placement, the save test, items
that never get saved, file shape, approval, trust, and lifecycle. Reopen only
the needed sections after compaction. If the manual is missing, do not invent a
replacement policy or write lasting knowledge. Report the gap and recommend
`project-sync`.

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
numbered approval group required by the manual, one group per file. Do not show
full file text unless asked.

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

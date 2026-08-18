---
source: owner-paraphrase
date: 2026-08-18
session: 5000ea02-03a6-46a0-a567-8665b40403fa
tags:
  - work-tracking
  - project-setup
---

# The toolkit only asks where work is tracked, it does not own a tracker

Setting up a project means asking one question about work tracking, recording
the answer, and applying the two rules. Any method the owner names is one more
answer to that question, never a new system for the toolkit to build.

## The scope

`project-init` has one job here: ask "where do you store and track work for this
project?", record what the owner says, and apply the two rules that hold for
every answer. Those two rules are that every piece of work is logged in that
tracker before it is built, and that nothing is built until a refinement session
has filled in the spec.

## What this rules out

A method the owner wants to use, including the BMAD method, is one more answer
to that same question. It is never a second gate, and never a parallel work
system for the toolkit to build and maintain.

When a new method should be on offer, the change is adding an answer to the
question in
`plugins/project-init/skills/project-init/references/work-tracking-choice.md`.

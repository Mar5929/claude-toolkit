# grill-me plugin

An interview skill for turning an incomplete plan, design, or idea into durable
discovery notes. It asks one question at a time, recommends a likely answer, and
checkpoints every response to a Markdown file before continuing.

**Setup: install and go.** Install once per machine. It writes brainstorm files
as it works, but nothing has to exist in the project first.

## Install

```text
/plugin install grill-me
```

Then start it with:

```text
/grill-me
```

It also triggers from requests such as "grill me on this plan," "stress-test
this design," or "help me extract this idea into a document."

## Skill

- **grill-me** (`/grill-me`): creates a dated file under
  `knowledge/brainstorms/` when project knowledge is installed, walks
  the topic's decision tree in dependency order, records every answer and open
  flag before asking the next question, then closes with a contradiction check
  and short recap.

## Persistence contract

The capture file is the source of truth, not the conversation context. Raw
notes remain under `knowledge/brainstorms/` even if the session later produces
a polished plan or specification elsewhere in the project. In a project with
no knowledge-system signature, the skill can still use a clearly identified
standalone brainstorm artifact folder without creating a partial system.

## How it relates to the rest of the toolkit

- `project-init` and `project-sync` offer this plugin as an optional standalone
  workflow. They do not copy its instructions into a project.
- `grill-me` captures raw discovery. It does not replace a work item's
  `SPEC.md`, `STATUS.md`, or a polished design document.
- The `spec-before-you-build.md` rule requires a refinement session before any
  work is built, and `grill-me` is a good way to hold one. That rule names no
  skill on purpose, so that removing this plugin never leaves it stale: what it
  requires is the session, and the six-part spec ending up in the ticket itself,
  whether that is a `SPEC.md` or an external tracker's ticket body. The dated
  capture under `knowledge/brainstorms/` stays what it always was, the raw
  record of how the answers were reached, and is not the spec.
- It does not depend on the project knowledge package. The Markdown capture remains usable even
  when memory tooling is unavailable.
- When the current project knowledge system is installed, `grill-me` keeps the
  capture in its flat brainstorm folder. At interview completion it invokes
  `remember`, which applies the save filters, shows the owner the real proposed
  words, and saves only what they approve. Raw discovery remains
  non-authoritative and links to resulting specifications when useful.

The owner-invoked raw brainstorm is the one place anything reaches a file
without the owner approving the exact words first. `grill-me`
writes those checkpoints so an interrupted interview loses nothing, and a
brainstorm is never authoritative. It never writes curated memory or an approved
specification itself.

## Maintaining this plugin

A content change here bumps `version` in both plugin manifests and
`metadata.version` in the repo's `.claude-plugin/marketplace.json`. Keep this
README, the top-level README, and `docs/toolkit-map.md` current when the skill
changes.

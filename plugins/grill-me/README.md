# grill-me plugin

An interview skill for turning an incomplete plan, design, or idea into durable
discovery notes. It asks one question at a time, recommends a likely answer, and
checkpoints every response to a Markdown file before continuing.

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

- **grill-me** (`/grill-me`): creates a dated file under `brainstorms/`, walks
  the topic's decision tree in dependency order, records every answer and open
  flag before asking the next question, then closes with a contradiction check
  and short recap.

## Persistence contract

The capture file is the source of truth, not the conversation context. Raw
notes remain under `brainstorms/` even if the session later produces a polished
plan or specification elsewhere in the project.

## How it relates to the rest of the toolkit

- `project-init` and `project-sync` offer this plugin as an optional standalone
  workflow. They do not copy its instructions into a project.
- `grill-me` captures raw discovery. It does not replace a work item's
  `SPEC.md`, `STATUS.md`, or a polished design document.
- The `spec-before-you-build.md` rule requires a refinement session before any
  work is built, and names `grill-me` as one way to hold that session. The rule
  is satisfied by the session, not by the skill: the six-part spec has to end up
  in the ticket itself, whether that is a `SPEC.md` or an external tracker's
  ticket body. The dated capture under `brainstorms/` stays what it always was,
  the raw record of how the answers were reached, and is not the spec.
- It does not depend on second-brain. The Markdown capture remains usable even
  when memory tooling is unavailable.
- When second-brain v3 is installed, `grill-me` adds the dated capture to the
  flat brainstorm index. At interview completion it proposes resulting
  specifications and other durable updates, then uses the memory librarian
  after owner approval. Raw discovery remains non-authoritative and links both
  ways to every resulting specification.

## Maintaining this plugin

A content change here bumps `version` in both plugin manifests and
`metadata.version` in the repo's `.claude-plugin/marketplace.json`. Keep this
README, the top-level README, and `docs/toolkit-map.md` current when the skill
changes.

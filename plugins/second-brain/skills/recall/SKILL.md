---
name: recall
description: >-
  Find what a project has already written under knowledge/ before searching
  code broadly or asking the owner something already answered. Use when picking
  up work, changing behavior, asking what was decided, or running /recall.
---

# recall

Read `knowledge/project.md` and `knowledge/index.md` first. They give the goal
and the map, not the whole vault.

## Find only what the task needs

1. Open the relevant specification before changing behavior.
2. Search `knowledge/specs/` and the most likely memory type.
3. Widen the search only when the first home cannot answer the question.
4. Follow a relative link only when the linked file matters to this task.
5. Read `knowledge/brainstorms/` only when raw exploration is relevant, and
   label it as unchecked.

## Authority map

| Home | What it owns |
| --- | --- |
| `knowledge/project.md` | What the project is, why it exists, what finished looks like, main workstreams and boundaries, who is involved, and the tracker pointer |
| `knowledge/specs/` | Current approved behavior |
| `knowledge/memory/context/` | Persistent circumstances and outside constraints |
| `knowledge/memory/decisions/` | Non-obvious choices and reasons |
| `knowledge/memory/domain/` | Project-specific terms and business rules |
| `knowledge/memory/knowledge/` | Project conclusions that prevent mistakes |
| `knowledge/memory/operations/` | Repeatable procedures, verification, and recovery |
| `knowledge/memory/planning/` | Direction, roadmap, milestones, risks, assumptions |
| `knowledge/memory/references/` | External source material and what it supports |
| work tracker | Live status, assignments, blockers, branches, pull requests |

## Trust what the source field allows

- `owner-quote`: the words are the owner's exact words.
- `owner-paraphrase`: the owner stated the meaning, but these are not presented
  as verbatim words.
- `read-from-file`: the named source file supports it; open that file when exact
  wording matters.
- `agent-observed`: an agent directly observed the result during the named
  session.
- `agent-conclusion-unchecked`: a lead to verify, never current truth.

A `superseded-by:` file is history. Follow the replacement.
Specifications carry no source field because the owner approved their words.
If a memory conflicts with a specification, show both and treat the
specification as current behavior unless the owner approves changing it.

## Conflicts

Show two conflicting files and their exact statements. Do not silently choose.
If a saved file conflicts with code or observed behavior, show both. If the
index conflicts with source files, rebuild it with
`node .claude/tools/build-knowledge-index.mjs`.

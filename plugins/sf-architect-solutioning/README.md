# sf-architect-solutioning plugin

A Salesforce solution architect. Feed it a requirement and it produces an
approved, well-architected solution plan before anything gets built. It is
domain-specific, so install it only on Salesforce projects.

## Install

```
/plugin install sf-architect-solutioning
```

## Skill

- **sf-architect-solutioning** (`/sf-architect-solutioning`): runs a 5-phase
  protocol on a requirement:
  1. Push back and clarify a vague ask before designing anything.
  2. Discover this project's requirement and decision locations from its own
     CLAUDE.md and rules, so it stays project-agnostic (no assumed folder
     structure or ticketing system).
  3. Verify every platform claim against official Salesforce docs by live fetch,
     using a curated source map, never from memory.
  4. Design declarative-first to Salesforce Well-Architected standards.
  5. Present a solution plan with trade-offs for approval before any build.

## Key references

Bundled under `skills/sf-architect-solutioning/references/`: the official
Salesforce `doc-sources.md` fetch map, `metadata/*` guides (objects and fields,
flows, validation rules, permission sets, and so on), `architectural-patterns.md`,
`naming-conventions.md`, `salesforce-well-architected.md`, the
`solutioning-checklist.md`, and the `solution-plan-template.md`.

## How it relates to the rest of the toolkit

This is design-time solutioning. It complements, and does not overlap with, the
Salesforce pieces in the other plugins:

- `project-init`'s `salesforce-rules/` library installs the standing safety and
  workflow rules for a Salesforce project.
- Graphify or another separately selected repository mapper can answer
  mechanical impact questions about existing metadata. It is an analysis aid,
  not part of second-brain v3.
- This plugin decides what to build in the first place, then hands off to those.

## Maintaining this plugin

A content change here bumps `version` in `.claude-plugin/plugin.json` and
`metadata.version` in the repo's `.claude-plugin/marketplace.json`. Keep this
README and `docs/toolkit-map.md` current when the protocol or references change.

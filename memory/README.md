# Project memory and knowledge

This folder contains durable project information that is not authoritative
product behavior.

## Types

The list below is built by `node .claude/tools/memory-index-build.mjs` from the
folder READMEs, so it cannot fall out of step with them. Do not hand-edit it.

- [Project context](context/README.md): Durable circumstances, stakeholders,
  constraints, boundaries, and current conditions needed to interpret future
  work.
- [Project decisions](decisions/README.md): Important project choices, why they
  were made, alternatives considered, and what follows from them.
- [Project domain](domain/README.md): Business language, actors, concepts,
  policies, rules, and representative examples future work must understand
  consistently.
- [Project knowledge](knowledge/README.md): Reusable, non-obvious technical and
  project understanding that can prevent future mistakes or repeated
  investigation.
- [Project operations](operations/README.md): Procedures for operating,
  releasing, supporting, recovering, and verifying the system safely.
- [Project planning](planning/README.md): Vision, goals, roadmap, milestones,
  timeline, strategic dependencies, durable risks, and assumptions.
- [Project references](references/README.md): Useful internal or external
  sources and plain-language explanations of why they matter to the project.

Work-tracker owns backlog, ticket status, blockers, handoffs, branches, pull
requests, and landing proof. `specs/` owns current approved behavior.

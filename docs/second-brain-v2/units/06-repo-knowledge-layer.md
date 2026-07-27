# Unit 06: repository knowledge layer

Status: proposed. Depends on Units 01 and 02.

## Outcome

Install one understandable repository layout that keeps behavior in `specs/`
and organizes other durable project memory under typed `memory/` folders.

## Standard layout

```text
specs/
  README.md
  product/
memory/
  README.md
  config.yaml
  context/
  decisions/
  knowledge/
  references/
  domain/
  operations/
  .cache/
tools/
  memory/
```

The core folders mean:

- `specs/`: authoritative product and system behavior, edge cases, user
  stories, preservation rules, and acceptance criteria.
- `memory/context/`: bounded current state, project background, and durable
  constraints that help orient future sessions.
- `memory/decisions/`: approved architectural or product decisions and their
  supersession history.
- `memory/knowledge/`: non-obvious implementation rationale, invariants,
  failure modes, and gotchas.
- `memory/references/`: stable pointers to approved external or repository
  source material.
- `memory/domain/`: terminology, stakeholder language, business concepts, and
  source-authority rules.
- `memory/operations/`: deployment, recovery, environment, and operating
  guidance.
- `memory/.cache/`: optional generated search artifacts, always gitignored.

Projects install only the folders they need, but `memory/README.md`,
`memory/config.yaml`, `memory/context/current.md`, and `specs/README.md` form
the portable core.

## Content boundaries

Each durable fact has one canonical body. Routers and related records link to
it instead of copying it. Code paraphrases, session summaries, and repeating
status logs are not durable knowledge.

Implementation-knowledge documents are created only for load-bearing
invariants, non-obvious rationale, recurring failures, or facts that cannot be
learned cheaply from code and tests.

## Drift detection

A deterministic command maps changed source paths to related specifications
and knowledge documents, then reports:

- reviewed in the same change;
- mapped but not reviewed;
- unmapped behavior change; or
- no knowledge impact.

The command does not rewrite files or invoke a model. Projects may configure
the result as advisory or required based on their profile.

## Tools and workflows

Reusable agent workflows remain in the toolkit plugin so they can improve
centrally. Project-specific deterministic helpers live under `tools/memory/`.
No custom project curator agent is installed by default.

## Acceptance tests

- A future agent can find governing behavior from `specs/README.md`.
- A future agent can route other durable context from `memory/README.md`.
- The same fact is not copied into a router, context file, and knowledge file.
- A behavior-changing code diff receives a visible specification-review result.
- A formatting-only change can report no knowledge impact without rewriting a
  document.
- The full repository remains understandable from a fresh clone.

## Issues covered

#57, #60, #62, and the owner's approved folder and simplicity requirements.

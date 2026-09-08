---
name: solution-helper
description: Develop a simple design mapped to a work item's requirements, checking existing capabilities and using relevant domain expertise. Use when proposing or revising a solution design, comparing approaches, or explaining what would be built and why.
---

# Solution helper

Discuss the design in the main conversation. Read
[work-guide](../work-guide/SKILL.md) for context, canonical records, adaptable
methods, and specialist help; reuse orientation already completed.

## Establish the design basis

- Read the canonical requirements, recorded approvals, unresolved questions,
  project constraints, and existing decisions. Use the project's specification
  check when available. Identify actual gaps before suggesting new components.
- Treat linked solution notes at the bottom of a PRD only as potential paths
  to evaluate. They are not requirements, approved design, or build instructions.
  Choose against the required behavior and rules; keep actual design decisions
  in the canonical design record with their true approval status.
- Inspect existing capabilities and relevant implementation evidence. Mark
  what is reused, extended, or new, and distinguish code that exists from
  behavior verified in the intended environment.
- Load a relevant installed domain skill, such as Salesforce solutioning, and
  project-specific design guidance. Use its expertise while keeping the
  owner's chosen interview pace, scope, and output format.
- Check mechanics against current official documentation and project evidence.
  Use delivery-researcher through work-guide for a bounded uncertain question.
  Cite the sources supporting material choices and label unverified assumptions
  rather than treating a saved definition as proof of runtime behavior.

## Make the design easy to review

Default to a heading for each requirement and short bullets explaining:

- What existing capability to reuse or what to build or change.
- How that change satisfies the requirement.
- How its intended behavior will be checked, when the check is not obvious.

This is an optional presentation pattern, not a required schema. Follow the
owner's or project's chosen format, group related requirements when clearer,
and reference shared components once rather than describing them repeatedly.

Explain only choices that affect the owner or builder. Recommend the strongest
approach with a short reason, mention material tradeoffs, and keep unresolved
choices explicit. Ask one decision question at a time when more input would
materially change the design; continue independent design work meanwhile.

## Check and carry forward

- Save the initial proposal in the project's existing canonical design home,
  using its placement and approval policy and retaining its proposed status.
  Recognize authorization already given for that draft. If writing is not yet
  authorized or access fails, say what remains only in the conversation and
  carry it into the handoff; never claim the design is saved.
  Keep responsibility for the pending save with the owning session. Offer a
  manual copy only when the owner requests one, rather than assigning the
  documentation work back to them.
- Use a focused delivery-reviewer assignment when an independent check would
  help. Ask it to trace requirement coverage, dependencies, assumptions,
  unnecessary complexity, and realistic validation. Reconcile its evidence
  into the proposal; it cannot approve scope or design.
- Apply clear authorized revisions promptly and trace effects back to the
  requirements and plan. Ask only when consequences remain ambiguous. Follow
  the project's placement and approval policies for the resulting document.
- Keep proposed design distinct from approved design and implementation
  permission. Recognize approval already given. Save meaningful decisions and
  open questions in their canonical homes through existing upkeep guidance.
- Once implementation is authorized, use work-guide and the existing tracker
  to maintain useful steps, optional milestones, dependencies, and next actions.
  Plan for a realistic context switch or parallel item where relevant; do not
  introduce a separate planning store or a fixed delivery sequence.

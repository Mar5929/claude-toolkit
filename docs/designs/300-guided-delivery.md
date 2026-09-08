# Guided delivery: build design for #300

Mike authorized a team to build and ship on 2026-09-08. The issue owns the
requirements; this file records the implementation choices and verification.

## How the requirements are met

| Need | Build and benefit |
| --- | --- |
| One main conversation with specialist help | Three session skills guide work, requirements, and solution design; two focused agents return research or review findings to the owning session. |
| Project and item variations | Read declared guidance deliberately; apply task and item choices within actual authority. No mandatory new guidance file. |
| Flexible plans and milestones | Extend the existing lifecycle rule with useful plan considerations. Use native tracker fields or existing notes; no fixed milestone schema or format gate. |
| Any work tracker | Discover the declared tracker. Reuse its commands and conventions, including #270's local and GitHub behavior. No mirrors or automatic local tracker setup. |
| Understand before designing | Requirements-helper reads prior context and asks one useful question with a recommendation and brief reason. |
| Prompt, faithful draft upkeep | Owning session writes approved meaning and clear authorized corrections; suggestions and unknowns remain distinct. Preserve project knowledge approval boundaries. |
| Evidence-backed designs | Solution-helper maps each requirement to understandable build choices; reuse Salesforce solutioning and official sources. |
| Parallel features | Distinct item owners and repository worktrees, explicit dependencies and shared-resource coordination; reread before merging updates. Stored assignment is not worker liveness. |
| Continuity | Reuse recall, canonical item records, and handoff; pass current context with specialist assignments. No private memory store. |
| Improvements carry forward | Separate reusable methods from project/item adaptations; route authorized lasting changes through existing setup and sync. |

## Ownership and files

- Core workflow: `plugins/session-skills/skills/work-guide/`,
  `requirements-helper/`, and `solution-helper/`.
- Focused support: `plugins/session-skills/agents/delivery-researcher.md` and
  `delivery-reviewer.md`; reviewer mode follows the assignment.
- Shared upkeep remains in the existing work-item-stages rule and its installed
  copy. Local tracker code and schema do not change.
- Existing project setup/sync and Salesforce solutioning gain narrow integration.
- Root/plugin READMEs, toolkit map, and paired manifests describe the actual
  package. The final PRD describes the settled user experience.

## Important choices

- No separate work-planning skill: it would duplicate #270. Work-guide helps
  think through the plan; the existing tracker owns its record.
- Templates suggest useful information and adapt to the work. Missing optional
  milestone fields never prevent completing a work item.
- Claude loads plugin agent definitions natively. Other hosts use the packaged
  role text in a supported native worker; a main-chat review is labelled as such.
  There is no claim that Claude frontmatter configures another host's permissions.
- The main session is the canonical writer for its item. Delegates return
  findings. Separate sessions coordinate through current shared records and
  available communication; no scheduler or live-worker registry is introduced.

## Validation and delivery

1. Review descriptions, links, host discovery, paired manifests, and rule copies.
2. Run all four repository Node checks, skill validation, and marketplace validation.
3. Independently exercise external and local tracker examples, parallel Salesforce
   features, changed answers, unknowns, custom milestones, blocked writes,
   context resumption, and unavailable delegation. Record actual outcomes.
4. Review the diff and limitations, ship the authorized pull request, and verify
   the merge. Do not update unrelated projects or Salesforce orgs.

The scenario exercise verifies instruction behavior, not the liveness of a
background coordinator or integration with every external tracker. Source,
installed cache, enabled project, and observed session behavior remain distinct.

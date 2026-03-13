# Pre-Implementation Solutioning Checklist

Use this checklist before writing any code, creating any metadata, or building any component. Every item must pass before implementation begins.

---

## Requirement Clarity

- [ ] Requirement has a clear, specific description (not vague or open-ended)
- [ ] Acceptance criteria are defined (how do we know it's done?)
- [ ] Business context is understood (why are we building this?)
- [ ] Affected user personas are identified with their permission levels
- [ ] Data volumes and frequency of execution are estimated
- [ ] Edge cases and error scenarios are identified

## Documentation Gate

- [ ] **BRD / Requirements** — Requirement is documented in `deliverables/brd/` or `wiki/applications/{app}/requirements.md`
  - Includes: description, acceptance criteria, business context, priority
  - Cross-references: REQ-XXX identifier assigned

- [ ] **Technical Spec** — Technical design exists in `docs/TECHNICAL_SPEC.md` or `wiki/applications/{app}/technical-specs.md`
  - Includes: architecture approach, component list, data flow, integration points
  - Cross-references: relevant ADR decisions

- [ ] **Data Model** — All touched objects/fields documented in `docs/DATA_MODEL.md`
  - Includes: field types, relationships, data classification, validation rules
  - New objects/fields have naming convention compliance verified

- [ ] **Component Registry** — Affected area is current in `docs/COMPONENT_REGISTRY.md`
  - All existing components in the area are documented
  - Reusable components are identified (don't rebuild what exists)

- [ ] **Design Standards** — Solution complies with `wiki/ways-of-working/design-standards.md`
  - Framework defaults (16 Golden Rules) are followed
  - Client-specific standards are respected where they differ

## Architectural Assessment

- [ ] **Declarative-first evaluated** — Can this be done with Flows, validation rules, formula fields, or configuration before writing code?
- [ ] **Governor limits assessed** — SOQL queries, DML statements, CPU time, heap size within limits at expected data volumes
- [ ] **Security model reviewed** — CRUD/FLS enforcement plan, sharing implications, data classification for new fields
- [ ] **Integration impact assessed** — Callout limits, async vs. sync decision, error handling, retry logic (if applicable)
- [ ] **Existing patterns followed** — Solution uses established patterns (trigger handler, service layer, selector) rather than inventing new ones
- [ ] **Conflict check** — No conflicts with existing decisions in `docs/DECISIONS.md`

## Test Planning

- [ ] Test scenarios identified (positive, negative, bulk, boundary)
- [ ] Bulk test plan (200+ records for trigger/batch scenarios)
- [ ] Permission testing plan (run as different user profiles)
- [ ] Integration test plan (mock callouts, verify error handling) — if applicable

---

## How to Use

1. Work through each section top to bottom
2. If any item fails, address it before proceeding
3. Present the checklist status to the user as part of the solution plan
4. After all items pass, proceed to solution planning (component list, trade-offs, alternatives)

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

## Project Context Gate

- [ ] **Project rules read**: the project's CLAUDE.md and rules have been read; the locations for requirements, decisions, and design output are known (or the user has been asked)
- [ ] **Requirement recorded**: the requirement exists in the project's own tracking system (ticket, hub doc, or file, per project rules)
- [ ] **Conflict check**: no conflicts with prior decisions in the project's decision log
- [ ] **Conventions applied**: naming follows `references/naming-conventions.md`; client conventions in the project's CLAUDE.md override where they differ

## Documentation Verification Gate

- [ ] **Current API version confirmed** this session from an official source (per `references/doc-sources.md`), not assumed
- [ ] **Every platform-capability claim verified** against an official Salesforce doc fetched this session, with the URL captured for the plan's Sources Verified section
- [ ] **Release-note check done** for any feature that may have changed since the model's knowledge cutoff

## Architectural Assessment

- [ ] **Declarative-first evaluated**: can Flows, validation rules, formula fields, or configuration solve this before writing code?
- [ ] **Declarative components designed and approved**: all Flows, validation rules, permission sets, and other metadata designed using the Layer 2 templates and approved before any XML generation
- [ ] **Well-Architected pillars assessed**: one-line Trusted / Easy / Adaptable assessment drafted (plan Section 6); any compromised pillar has a stated, acceptable trade-off
- [ ] **Governor limits assessed**: SOQL queries, DML statements, CPU time, heap size within limits at expected data volumes
- [ ] **Security model reviewed**: CRUD/FLS enforcement plan, sharing implications, data classification for new fields
- [ ] **Integration impact assessed**: callout limits, async vs. sync decision, error handling, retry logic (if applicable)
- [ ] **Existing patterns followed**: solution uses established patterns (trigger handler, service layer, selector) rather than inventing new ones

## Test Planning

- [ ] Test scenarios identified (positive, negative, bulk, boundary)
- [ ] Bulk test plan (200+ records for trigger/batch scenarios)
- [ ] Permission testing plan (run as different user profiles / permission sets)
- [ ] Integration test plan (mock callouts, verify error handling), if applicable

---

## How to Use

1. Work through each section top to bottom
2. If any item fails, address it before proceeding
3. Present the checklist status to the user as part of the solution plan
4. After all items pass, present the solution plan (components, trade-offs, alternatives) and wait for approval

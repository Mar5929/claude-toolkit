# Salesforce Workflow Rules Reference

These rules apply after scaffolding is created. Include the relevant rules in the generated CLAUDE.md based on which workflows the user enabled during the interview.

---

## Document Maintenance Rules

1. **Proactive updates.** When you write or modify code, update all affected enabled docs in the same response.
2. **Cross-reference.** Use IDs (`BL-xxx`, `ADR-xxx`, `REQ-xxx`) to link between documents.
3. **No stale docs.** If you notice a doc is out of date during any task, fix it immediately.
4. **Atomic consistency.** If a change affects multiple docs, update all of them together.
5. **Summarize, don't dump.** Keep entries concise and scannable — tables and bullet lists over prose.
6. **Follow the Update Protocol.** Refer to the event-to-action table in CLAUDE.md Section 4.

---

## Salesforce Discovery Rules

Apply when the engagement starts with Discovery / Greenfield entry point.

1. Guide the user through structured requirement gathering using Salesforce consulting methodology.
2. Produce a BRD with business processes, pain points, and desired outcomes.
3. Derive Epics → Features → User Stories from the BRD, each with acceptance criteria.
4. Document the Salesforce data model in `docs/DATA_MODEL.md` using object notation (not SQL).
5. Create architecture diagrams as HTML-based interactive visualizations in `deliverables/architecture/`.
6. Only transition to Build when the user confirms Discovery is complete.

---

## SFDX Development Rules

1. Follow **source-tracked development** workflow:
   - Create scratch org → push source → develop → pull changes → commit
   - For sandbox development: deploy/retrieve instead of push/pull
2. **One trigger per object** — delegate all logic to handler classes.
3. **Bulkify everything** — all Apex must handle `List<SObject>`, never single records.
4. **No SOQL/DML in loops** — collect queries and DML operations outside loop bodies.
5. **CRUD/FLS enforcement** — use `WITH SECURITY_ENFORCED` in SOQL or `Security.stripInaccessible()`.
6. **Test coverage 85%+** — test bulk operations (200+ records), assert specific outcomes, use test data factories.
7. **Governor limit awareness** — check `Limits.getQueries()`, `Limits.getDMLStatements()`, `Limits.getCpuTime()` in complex operations.
8. **Metadata-first** — prefer Flows, validation rules, and formula fields over Apex when possible.

---

## LWC Development Rules

1. **SLDS compliance** — all components use Lightning Design System CSS classes.
2. **Wire service for reads** — use `@wire` adapters for data retrieval when possible.
3. **Imperative for writes** — use imperative Apex calls for DML operations.
4. **Error handling** — implement `reduceErrors()` utility, show user-friendly error messages.
5. **Accessibility** — ARIA labels, keyboard navigation, screen reader support on all interactive elements.
6. **Performance** — lazy load components, minimize wire calls, use caching appropriately.

---

## Client Deliverable Rules

1. Generate client-facing documents in professional formats:
   - Word documents via `docx` skill
   - Presentations via `pptx` skill (PowerPoint Generator agent)
   - Architecture diagrams as HTML-based interactive visualizations
2. All deliverables stored in `deliverables/` with clear subdirectory organization.
3. Match the client's documentation standards if specified.
4. Include version numbers and dates on all deliverables.

---

## Data Migration Rules

1. Document source-to-target field mappings in `deliverables/data-migration/field-mappings/`.
2. Include transformation rules, default values, and validation queries.
3. Track migration status in the backlog (`BACKLOG.md`).
4. Test migrations in sandbox before production.
5. Always have a rollback plan documented.

---

## Data Model Rules

1. **Always confirm with the user** before modifying the Salesforce object model — new objects, fields, relationships, validation rules, record types.
2. **Document immediately** — update `docs/DATA_MODEL.md` in the same response.
3. **Data classification** — mark field sensitivity level (Public, Internal, Confidential, Restricted).
4. **Naming conventions** — follow `references/naming-conventions.md`.

---

## Version Control Rules (GitFlow)

1. **Feature branches** — `feature/BL-XXX-description` from `develop`.
2. **Commit format** — `feat(BL-XXX): Short summary` with bullet list of changes and docs updated.
3. **PR required** — all changes go through pull request with code review.
4. **CI validation** — GitHub Actions must pass before merge (Apex tests, coverage check).
5. **Release branches** — `release/vX.Y` from `develop` when ready for UAT.
6. **Hotfix branches** — `hotfix/description` from `main` for production emergencies.
7. Include documentation updates in the same commit as the code change.

---

## Security Rules

1. **CRUD/FLS enforcement** in all Apex — no exceptions.
2. **Sharing keywords** — default `with sharing`, document every `without sharing` with justification.
3. **No hardcoded credentials** — use Named Credentials for external callouts.
4. **Data classification** — enforce field-level sensitivity on all custom fields.
5. **Permission sets over profiles** — use permission sets for all new access grants.
6. **Org-wide defaults** — start restrictive (Private), open up with sharing rules as needed.

---

## CI/CD Rules

1. **PR validation** — every PR triggers `sf-validate.yml` against the target org.
2. **Test coverage gate** — block merge if coverage drops below 85%.
3. **Deployment approval** — production deployments require release manager approval.
4. **Rollback plan** — always have a rollback strategy documented before deploying.
5. **Environment promotion** — Scratch → Dev → QA → UAT → Prod (or subset based on engagement).

---

## Managed Services Rules

Apply when the engagement entry point is Managed Services.

1. **Ticket-driven workflow** — all changes originate from a tracked ticket (Linear issue).
2. **SLA awareness** — respect response time and resolution time SLAs.
3. **Change management** — document all changes, get approval for significant modifications.
4. **Org health monitoring** — periodic assessments of governor limit usage, code coverage, security posture.
5. **Knowledge transfer** — document all tribal knowledge in the project docs.

---

## Rescue / Takeover Rules

Apply when the engagement entry point is Rescue / Takeover.

1. **Audit first, fix second** — complete the Rescue Assessment before making changes.
2. **Severity rating** — rate every finding as Critical/High/Medium/Low with estimated effort.
3. **Critical fixes first** — address P0 issues in the first sprint.
4. **Document current state** — create architecture diagrams showing "as-is" before any changes.
5. **Track remediation** — use the backlog to track all remediation items with clear priority.
6. **Don't break what works** — be conservative with changes to functioning features.

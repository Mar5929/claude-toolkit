# Workflow Rules Reference

These rules apply after scaffolding is created, scoped to whichever workflows the user enabled during the interview. Include the relevant rules in the generated CLAUDE.md.

---

## Document Maintenance Rules (apply only to enabled documents)

1. **Proactive updates.** When you write or modify code, update all affected enabled docs in the same response. Do not defer documentation to a later step.
2. **Cross-reference.** Use IDs (`BL-xxx`, `ADR-xxx`, `REQ-xxx`, `NFR-xxx`) to link between documents. A changelog entry should reference the backlog item it closes. A backlog item should reference the requirement it implements. A decision should list related requirements, backlog items, and other ADRs.
3. **No stale docs.** If you notice an enabled doc is out of date during any task, fix it immediately.
4. **Atomic consistency.** If a change affects multiple docs (e.g., completing a backlog item also updates the changelog, the requirements status, and possibly the code atlas), update all of them together.
5. **Summarize, don't dump.** Keep entries concise and scannable. Use tables and bullet lists over prose paragraphs.
6. **Follow the Update Protocol.** Refer to the event-to-action table in CLAUDE.md Section 4 for which docs to update for each type of event.

---

## Version Control Rules (apply only if version control enabled)

Follow the specific policies agreed upon during the interview:
- Use the agreed branching strategy for all new work.
- Write commit messages following the format in CLAUDE.md Section 9 (e.g., `feat(BL-XXX): Short summary`).
- Only push to remote when the agreed push policy allows it.
- When merge conflicts arise, follow the agreed resolution approach (auto-resolve or flag for user review).
- Create PRs/MRs with descriptive titles, summaries, and linked backlog items if that workflow was enabled.
- Include documentation updates in the same commit as the code change.

---

## Testing Rules (apply only if testing workflows enabled)

- If auto-generated tests are enabled, write tests alongside feature code in the same response.
- If Playwright MCP is enabled, generate Playwright test scaffolds for new UI features and capture screenshots as configured.
- Run linting/formatting checks before commits if CI/CD integration was specified.
- Never commit code that fails tests.

---

## Discovery Rules (apply only if Discovery phase enabled)

- Guide the user through structured requirement gathering before writing code.
- Produce user stories with acceptance criteria, technical specifications, and data model designs.
- Use `REQUIREMENTS.md` and `TECHNICAL_SPEC.md` as the primary outputs of the Discovery phase.
- Populate `DATA_MODEL.md` with planned tables/objects during Discovery (status: `PLANNED`).
- Create initial backlog items in `BACKLOG.md` organized by phase as requirements are defined.
- Only transition to implementation when the user confirms Discovery is complete.

---

## Migration Rules (apply only if migration/rebuild enabled)

- Keep `MIGRATION_REFERENCE.md` updated as modules, components, and data models are mapped and migrated.
- When implementing a feature that has an original equivalent, document the mapping in the Migration Reference before or during implementation.
- Note simplifications, removals, and new additions explicitly.

---

## Salesforce-Specific Rules (apply only if project type is Salesforce)

### Discovery & Requirements
- Guide the user through structured requirement gathering using Salesforce consulting methodology.
- Produce a BRD with business processes, pain points, and desired outcomes.
- Derive Epics, Features, and User Stories from the BRD, each with acceptance criteria.
- Document the Salesforce data model in `docs/DATA_MODEL.md` using Salesforce object notation.
- Create architecture diagrams as HTML-based interactive visualizations in `deliverables/architecture/`.

### Development
- Follow SFDX source-tracking workflow.
- Apex classes should follow Salesforce best practices: bulkification, governor limits awareness, separation of concerns (trigger handler pattern).
- Write Apex unit tests for all custom code (aim for 85%+ coverage as required by Salesforce).
- LWC components should follow Salesforce Lightning Design System (SLDS) conventions.

### Client Deliverables
- Generate client-facing documents in professional formats (Word docs via docx skill, presentations via pptx skill).
- Architecture diagrams should be HTML-based interactive visualizations, exportable to PNG/PDF.
- All deliverables stored in `deliverables/` with clear subdirectory organization.

### Data Migration
- Document source-to-target field mappings in `deliverables/data-migration/field-mappings/`.
- Include transformation rules, default values, and validation queries.
- Track migration status in the backlog.

### Data Model Changes
- Always confirm with the user before modifying the Salesforce object model — this includes new objects, fields, relationships, validation rules, and record types.
- Document all changes in `docs/DATA_MODEL.md` immediately.

---

## Web App-Specific Rules (apply only if project type is web app)

### Frontend Development
- Use the **frontend-design skill** for all UI work to ensure high-quality, production-grade design.
- Follow the chosen UI component library's conventions and patterns.
- Implement responsive design by default.

### Infrastructure
- If Docker is enabled, keep `Dockerfile` and `docker-compose.yml` up to date as dependencies change.
- If CI/CD is enabled, update GitHub Actions workflow when new test suites or deployment steps are added.
- Keep `.env.example` in sync with any new environment variables added.

### Testing
- Use Playwright for e2e testing of all user-facing features.
- Write unit tests for backend services and API endpoints.
- Run the full test suite before committing.

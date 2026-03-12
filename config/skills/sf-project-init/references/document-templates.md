# Salesforce Document Templates Reference

This file defines the structure for every document the sf-project-init skill can generate. Read the relevant sections when generating each file.

---

## Table of Contents

1. [CLAUDE.md Structure](#claudemd-structure)
2. [BACKLOG.md](#backlogmd)
3. [REQUIREMENTS.md](#requirementsmd)
4. [TECHNICAL_SPEC.md](#technical_specmd)
5. [DATA_MODEL.md](#data_modelmd)
6. [DECISIONS.md](#decisionsmd)
7. [CHANGELOG.md](#changelogmd)
8. [CODE_ATLAS.md](#code_atlasmd)
9. [README.md](#readmemd)
10. [GETTING_STARTED.md](#getting_startedmd)
11. [Client Deliverable Templates](#client-deliverable-templates)

---

## CLAUDE.md Structure

Generate with the **13-section structure** below, tailored for the Salesforce engagement based on interview answers. Use HTML comment placeholders (`<!-- -->`) for values not yet known.

### Section 1 — Project Overview
- Client Name, Project Name, One-line description
- Entry point (Greenfield / Build / Managed Services / Rescue)
- Salesforce products in scope
- Org type and environment path (Scratch → Dev → QA → UAT → Prod)
- Team size and roles (lead architect, developers, admins, consultants)
- Engagement timeline

### Section 2 — Golden Rules
The 13 Golden Rules (confirmed or modified during interview):
1. Bulkification — all Apex handles collections
2. No SOQL/DML in loops
3. Trigger handler pattern — one trigger per object, delegates to handler
4. Governor limit awareness — check Limits class, design for 200-record batches
5. CRUD/FLS enforcement — WITH SECURITY_ENFORCED or stripInaccessible
6. With/without sharing — default `with sharing`, document every `without sharing`
7. Test coverage 85%+ — test bulk operations, assert outcomes
8. Metadata-first — prefer declarative over code
9. SLDS compliance — all LWC use Lightning Design System
10. Data classification — mark custom fields with sensitivity level
11. Ask before modifying object model
12. CPU time budget — monitor, use Queueable/Batch for heavy processing
13. Naming conventions — follow `references/naming-conventions.md`

Plus any engagement-specific rules from the interview.

### Section 3 — Workspace Structure
ASCII directory tree showing the full SFDX project layout:
```
project-root/
├── CLAUDE.md
├── sfdx-project.json
├── docs/                    # Living documentation
├── deliverables/            # Client-facing documents
├── force-app/main/default/  # SFDX source
├── config/                  # Scratch org definitions
├── scripts/                 # Deployment and data scripts
└── .github/workflows/       # CI/CD pipelines
```

### Section 4 — Living Documents — Update Protocol
Event-to-action table (only include rows for enabled documents):

| Event | Action |
|---|---|
| New requirement identified | Add to `REQUIREMENTS.md` → Update `BACKLOG.md` |
| Object/field created or modified | Update `DATA_MODEL.md` |
| Architecture decision made | Add ADR to `DECISIONS.md` |
| Code committed | Add entry to `CHANGELOG.md` |
| Requirement changed | Update `REQUIREMENTS.md`, mark old as superseded |
| Feature completed | Mark `[DONE]` in `REQUIREMENTS.md` → Update `BACKLOG.md` |
| Code added/modified | Update `CODE_ATLAS.md` |

### Section 5 — Coding Standards

**Apex:**
- Trigger handler pattern (one trigger → handler class)
- Bulkification (all methods handle `List<SObject>`)
- SOQL: SELECT only needed fields, use WHERE clauses, WITH SECURITY_ENFORCED
- DML: collect records, single DML outside loops
- Error handling: try/catch with meaningful messages, custom exceptions
- Null safety: always check for null before operations
- Governor limits: check `Limits.getQueries()` in complex operations

**LWC:**
- Wire service for read operations, imperative for write operations
- SLDS classes for all styling (no custom CSS that conflicts with SLDS)
- Error handling with `reduceErrors()` utility
- Accessibility: ARIA labels, keyboard navigation, screen reader support
- Reactive properties with `@track` only when needed (most are reactive by default)

**Flows:**
- Naming: `Object_Action_Description` (e.g., `Account_Before_ValidateAddress`)
- Document purpose in Flow description
- Use subflows for reusable logic
- Error handling with fault paths

**Metadata:**
- API names: PascalCase for objects (`Custom_Object__c`), camelCase for fields (`customField__c`)
- Follow `references/naming-conventions.md` for complete standard

### Section 6 — Tech Stack Quick Reference

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Platform | Salesforce | Latest API | Core CRM platform |
| CLI | SFDX CLI (sf) | Latest | Local development, deployment |
| IDE | VS Code + SF Extensions | Latest | Development environment |
| VCS | GitHub | N/A | Version control |
| CI/CD | GitHub Actions | N/A | Automated validation and deployment |
| Testing | Apex Test Framework | N/A | Unit and integration testing |
| UI Testing | Playwright | Latest | E2E testing, screenshot verification |
| Project Mgmt | Linear | N/A | Issue tracking, sprint management |
| Docs | Context7 MCP | N/A | Live library documentation |

### Section 7 — Key Commands

```bash
# ── Org Management ──
sf org login web -a MyOrg              # Authenticate to an org
sf org create scratch -f config/project-scratch-def.json -a MyScratchOrg -d 30  # Create scratch org
sf org list                            # List authenticated orgs
sf org open -o MyScratchOrg            # Open org in browser

# ── Source Operations ──
sf project deploy start -o MyOrg      # Deploy source to org
sf project retrieve start -o MyOrg    # Retrieve source from org
sf source push -o MyScratchOrg        # Push source to scratch org
sf source pull -o MyScratchOrg        # Pull source from scratch org

# ── Testing ──
sf apex run test -o MyOrg -r human    # Run all Apex tests
sf apex run test -o MyOrg -n MyTest   # Run specific test class
sf apex run -f scripts/anonymous.apex # Execute anonymous Apex

# ── Data ──
sf data import tree -f data/plan.json # Import data from plan
sf data export tree -q "SELECT ..."   # Export data as tree

# ── Deployment ──
sf project deploy validate -o ProdOrg # Validate deployment (dry run)
sf project deploy start -o ProdOrg    # Deploy to production
sf project deploy quick -i <jobId>    # Quick deploy after validation
```

### Section 8 — Session Startup Checklist
1. Read `CLAUDE.md` (this file)
2. Read `docs/CODE_ATLAS.md` — Apex classes, triggers, LWC, flows
3. Read `docs/BACKLOG.md` — open work items
4. Skim `docs/REQUIREMENTS.md` if working on a feature
5. Ask: "What would you like to work on today? Here are the open backlog items: ..."

### Section 9 — Git Commit Protocol
- Format: `feat(BL-XXX): Short summary`
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `config`
- Rules: one commit per backlog item, include doc updates in same commit
- Branching: GitFlow (or whatever was selected)

### Section 10 — Clarification Protocol
Always clarify before proceeding:
- Object model changes (new objects, fields, relationships)
- Sharing rule modifications
- Security settings (profiles, permission sets, OWD changes)
- Integration endpoints and authentication
- Data migration mappings
- Anything contradicting `docs/REQUIREMENTS.md`

### Section 11 — Context Window Management
1. Don't re-read files already read this session
2. Reference by path: "see `docs/REQUIREMENTS.md` REQ-003"
3. Use `docs/` as external memory
4. Use Context7 MCP for Apex/LWC/SFDX documentation
5. Fall back to `references/salesforce-well-architected.md` for architectural guidance

### Section 12 — Bug-Prevention Facts
Empty at project start. Populated during development.

### Section 13 — References

| Resource | Description |
|---|---|
| `references/salesforce-well-architected.md` | Curated Well-Architected framework reference |
| Context7 MCP | Live Apex, LWC, SFDX CLI documentation |
| `references/naming-conventions.md` | Firm naming standard |
| architect.salesforce.com | Official Well-Architected patterns |

---

## BACKLOG.md

**Purpose:** Single source of truth for all engagement work items.

**Structure:**
- **Phases Overview table**: Phase | Focus | Timeline | Backlog ID Range
- **Per-phase sections** (adapted to entry point):
  - Greenfield: Discovery → Design → Build → Test → Deploy → Go-Live → Hypercare
  - Build: Design → Build → Test → Deploy → Go-Live → Hypercare
  - Managed Services: Assessment → Stabilize → Ongoing
  - Rescue: Assessment → Remediation → Stabilize → Build → Test → Deploy
- Each phase has a summary table: `ID | Title | Priority | Status | Implements`
- Detailed item descriptions: `### BL-001: Title` with `**Details**:` paragraph

**Status values:** `NOT STARTED | IN PROGRESS | DONE | BLOCKED | DEFERRED`
**Priority values:** `P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low)`

---

## REQUIREMENTS.md

**Purpose:** Defines what the engagement must deliver.

**Structure:**
- **Requirement Index table**: `ID | Title | Priority | Status`
- **Functional Requirements** (`### REQ-001: Title`):
  - Priority, Status (`DRAFT | APPROVED | IN PROGRESS | DONE | DEFERRED`)
  - Description, Acceptance Criteria (checkbox list), Dependencies
  - Source: BRD reference, stakeholder name
- **Non-Functional Requirements** (`### NFR-001: Title`)
- **Glossary**: Salesforce-specific terms and client terminology

---

## TECHNICAL_SPEC.md

**Purpose:** The "how" document — solution architecture and technical design.

**Structure (adapted for Salesforce):**
1. **Architecture Overview** — System context diagram, high-level architecture
2. **Tech Stack** — Platform, tools, integrations
3. **Object Model Design** — Custom objects, fields, relationships (reference DATA_MODEL.md)
4. **Integration Architecture** — Integration patterns, endpoints, data flows
5. **Security Model** — Profiles, permission sets, sharing rules, OWD, field-level security
6. **Automation Design** — Flows, Process Builder, triggers, scheduled jobs
7. **LWC Component Architecture** — Component hierarchy, data flow, wire adapters
8. **Data Migration Strategy** — Source-to-target mapping, transformation rules, validation
9. **Deployment Architecture** — Environment strategy, CI/CD pipeline, rollback plan
10. **Open Questions** — Unresolved design decisions

---

## DATA_MODEL.md

**Purpose:** Salesforce object model documentation.

**Structure:**
- **Object Inventory table**: `Object API Name | Label | Type (Standard/Custom) | Description | Status`
- **Object Definitions** grouped by functional area:
  - Field tables: `Field API Name | Label | Type | Required | Description | Data Classification`
  - Validation rules, record types, picklist values
- **Relationships table**: `Parent Object | Child Object | Relationship Type | Field API Name`
- **ERD** — only when requested by the user
- **Naming Conventions** — API name patterns, field prefixes, custom object suffix

---

## DECISIONS.md

**Purpose:** Architecture Decision Record (ADR) log for the engagement.

**Structure:**
- Decision Index: `ID | Title | Status | Date`
- Per decision: Date, Status, Context, Options Considered (with pros/cons), Decision, Consequences

---

## CHANGELOG.md

**Purpose:** Human-readable change history.

**Format:** Keep a Changelog conventions, reverse chronological.

---

## CODE_ATLAS.md

**Purpose:** Codebase reference for Claude — read this instead of scanning source files.

**Structure (adapted for Salesforce):**
1. **Architecture Overview** — Platform, products, integrations
2. **Object Model** — Reference to DATA_MODEL.md, summary table
3. **Apex Classes** — `Class | Type (Service/Utility/Test/Handler) | Purpose | Key Methods`
4. **Triggers** — `Object | Trigger | Handler Class | Events (before/after)`
5. **LWC Components** — `Component | Purpose | Data Source (wire/imperative)`
6. **Flows** — `Flow | Type (Screen/Auto/Scheduled) | Object | Purpose`
7. **Key Patterns** — Trigger handler, service layer, selector pattern, etc.
8. **Cross-Cutting** — Error handling, logging, test data factory

---

## README.md

Standard project README with:
- Engagement name and description
- Directory structure
- Quick start: prerequisites (SFDX CLI, VS Code, SF extensions), clone, auth, scratch org setup
- Development workflow overview
- Link to docs/

---

## GETTING_STARTED.md

Bootstrap prompt for Claude:
- Read CLAUDE.md → CODE_ATLAS.md → BACKLOG.md
- Summary of engagement context
- Current phase and priority items

---

## Client Deliverable Templates

### Business Requirements Document (BRD)

Structure for `deliverables/brd/`:
1. Executive Summary
2. Business Background & Current State
3. Pain Points & Opportunities
4. Business Process Descriptions (with process flow diagrams)
5. Functional Requirements (with acceptance criteria)
6. Non-Functional Requirements
7. Data Requirements (objects, fields, volumes)
8. Integration Requirements
9. Reporting & Analytics Requirements
10. Timeline & Milestones
11. Assumptions & Constraints
12. Appendix: Stakeholder Interview Notes

### Solution Design Document (SDD)

Structure for `deliverables/sdd/`:
1. Executive Summary
2. Architecture Overview (with diagrams)
3. Object Model Design
4. User Interface Design (page layouts, LWC mockups)
5. Automation Design (flows, triggers, scheduled jobs)
6. Integration Design (patterns, endpoints, error handling)
7. Security Design (profiles, sharing, encryption)
8. Data Migration Design
9. Testing Strategy
10. Deployment Strategy
11. Appendix: Mapping Tables

### Org Assessment (Managed Services / Rescue)

Structure for `deliverables/org-assessment/`:
1. Executive Summary
2. Org Configuration Review
3. Code Quality Assessment (Apex, LWC, triggers)
4. Security Posture Review
5. Data Quality Assessment
6. Integration Health Check
7. Governor Limit Risk Assessment
8. Technical Debt Inventory
9. Recommendations (prioritized by severity)
10. Appendix: Detailed Findings

### Rescue Assessment

Structure for `deliverables/rescue-assessment/`:
1. Executive Summary
2. Critical Issues (P0 — must fix immediately)
3. High-Priority Issues (P1 — fix within first sprint)
4. Medium Issues (P2 — plan for remediation)
5. Low Issues (P3 — address during ongoing work)
6. Remediation Plan (phased approach)
7. Estimated Effort
8. Risk Register
9. Appendix: Detailed Findings with Screenshots

### Data Migration Plan

Structure for `deliverables/data-migration/`:
1. Migration Scope & Approach
2. Source System Analysis
3. Target Object Model
4. Field Mapping Tables (`deliverables/data-migration/field-mappings/`)
5. Transformation Rules
6. Data Validation Approach
7. Migration Sequence (dependency order)
8. Rollback Plan
9. Timeline

### Test Plan

Structure for `deliverables/test-plans/`:
1. Test Strategy Overview
2. Test Scope & Coverage Matrix
3. Unit Test Plan (Apex classes, coverage targets)
4. Integration Test Plan (API endpoints, data flows)
5. UAT Script Templates (step-by-step with expected results)
6. Regression Test Suite
7. Performance Test Criteria
8. Defect Management Process

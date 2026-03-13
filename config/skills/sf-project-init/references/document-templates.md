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
9. [COMPONENT_REGISTRY.md](#component_registrymd)
10. [README.md](#readmemd)
11. [GETTING_STARTED.md](#getting_startedmd)
12. [Wiki Templates](#wiki-templates)
13. [Design Standards Template](#design-standards-template)
14. [Client Deliverable Templates](#client-deliverable-templates)

---

## CLAUDE.md Structure

Generate with the **14-section structure** below, tailored for the Salesforce engagement based on interview answers. Use HTML comment placeholders (`<!-- -->`) for values not yet known.

### Section 1 — Project Overview
- Client Name, Project Name, One-line description
- Entry point (Greenfield / Build / Managed Services / Rescue)
- Salesforce products in scope
- Org type and environment path (Scratch → Dev → QA → UAT → Prod)
- Team size and roles (lead architect, developers, admins, consultants)
- Engagement timeline
- Linear Project ID: `{project-id}` (from Phase 4 auto-creation)
- Linear Project Name: `{Client Name} - {Project Name}`
- Scratch Org Alias: `{scratch-org-alias}` (from interview Round 2)
- QA Org Alias: `{qa-org-alias}` (from interview Round 2)

### Section 2 — Golden Rules
The 16 Golden Rules (confirmed or modified during interview):
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

14. **Living Document Sync** — All living documents (REQUIREMENTS, BACKLOG, TECHNICAL_SPEC, wiki pages, COMPONENT_REGISTRY) must be kept in sync. Update all affected docs when modifying code. Never leave a document stale.
15. **Component Registry Updates (Non-Negotiable)** — Every component create/modify/delete must update `docs/COMPONENT_REGISTRY.md` immediately.
16. **UI Testing with Playwright** — Before starting UI work (LWC, FlexCard, Experience Cloud page), ask user: "This involves UI work. Should I use the Playwright screenshot loop?" If yes, follow build → screenshot → review → iterate loop.

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
| Wiki application area affected | Update relevant `wiki/applications/{app}/` pages |
| UI component development starts | Ask user about Playwright screenshot loop |
| Component created/modified/deleted | Update `docs/COMPONENT_REGISTRY.md` (NON-NEGOTIABLE) |
| Design standard established/changed | Update `wiki/ways-of-working/design-standards.md` |
| Work item started | Set Linear issue to "In Progress", update `BACKLOG.md` status |
| Work item completed | Set Linear issue to "Done", mark `[DONE]` in `BACKLOG.md` |
| Work item blocked | Set Linear issue to "Blocked", mark `BLOCKED` in `BACKLOG.md` with reason |

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

**Do these steps automatically at the start of every session:**

1. Read `CLAUDE.md` (this file) — Sections 1, 2, 5, and 9 at minimum
2. Read `docs/CODE_ATLAS.md` — Apex classes, triggers, LWC, flows
3. Read `docs/BACKLOG.md` — open work items and sprint structure
4. Skim `docs/REQUIREMENTS.md` if working on a feature
5. **Pull Linear tickets** — Use Linear MCP to find the project (ID in Section 1), then list all open (non-completed) issues grouped by milestone. Cross-reference with BACKLOG.md for BL-IDs.
6. **Identify current sprint** — Determine which phase/sprint has incomplete items. Present:
   - Current sprint or phase name
   - All open work items for that sprint (BL-ID, Linear issue title, priority, status)
   - Which items are ready to build (prerequisites met, requirements documented)
7. Ask: "Which item would you like to start with, or should I work through [current sprint] in order?"

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

### Section 14 — Work Item Execution Loop

**When the user selects a work item (or says "go in order"), follow this loop for each item:**

1. **Update Linear** — Set the issue status to "In Progress"
2. **Branch** — `git checkout -b feature/BL-XXX-short-description develop`
3. **Pre-implementation check** — For complex features, invoke the sf-architect-solutioning skill. For simple items (fields, config, minor changes), proceed directly.
4. **TDD** — Write the test class first with expected behaviors and assertions, then implement until all tests pass. Test-first is the default; skip only for pure metadata/declarative work (fields, page layouts, flows).
5. **Test** — `sf apex run test --target-org {scratch-org-alias} --result-format human --code-coverage`
6. **Validate** — `sf project deploy validate --target-org {qa-org-alias} --test-level RunLocalTests`
7. **Update docs** — Per Section 4: COMPONENT_REGISTRY, CODE_ATLAS, CHANGELOG, DATA_MODEL (if objects touched), and any affected wiki pages
8. **Commit** — `feat(BL-XXX): Short summary` per Section 9. Include doc updates in the same commit.
9. **Update Linear** — Set the issue status to "Done"
10. **Next item** — Present the next sprint item and begin again from step 1. Continue until the user says stop or the sprint backlog is complete.

**Notes:**
- If a test fails at step 5, fix the implementation and re-run — do not skip or reduce coverage.
- If validation fails at step 6, diagnose the issue, fix it, and re-validate.
- If a work item is blocked (missing requirements, dependency on another item), mark it `BLOCKED` in both BACKLOG.md and Linear, skip it, and move to the next item.

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

## COMPONENT_REGISTRY.md

**Purpose:** Comprehensive metadata inventory of every component in the Salesforce org. NON-OPTIONAL living document — generated during scaffolding and updated with every component change.

**Distinction from CODE_ATLAS.md:** CODE_ATLAS is a code navigation guide (patterns, architecture, key methods). COMPONENT_REGISTRY is a metadata inventory (every field, rule, permission set, layout). Different audiences, different purposes.

**Structure:**

### Summary Table
| Category | Count | Last Updated |
|---|---|---|
| Custom Objects | 0 | [Date] |
| Custom Fields | 0 | [Date] |
| Apex Classes | 0 | [Date] |
| Apex Triggers | 0 | [Date] |
| Flows | 0 | [Date] |
| LWC | 0 | [Date] |
| Permission Sets | 0 | [Date] |
| Validation Rules | 0 | [Date] |
| Page Layouts | 0 | [Date] |
| Custom Metadata Types | 0 | [Date] |
| Platform Events | 0 | [Date] |
| Named Credentials | 0 | [Date] |

### Category Sections

**Custom Objects:**
| API Name | Label | Description | Related Objects | Status |
|---|---|---|---|---|

**Custom Fields:**
| Object | Field API Name | Label | Type | Required | Description |
|---|---|---|---|---|---|

**Apex Classes:**
| Class Name | Type | Purpose | Test Class | Coverage |
|---|---|---|---|---|
*Type values: Service, Utility, Test, Handler, Selector, Domain, Controller, Batch, Schedulable, Invocable*

**Apex Triggers:**
| Object | Trigger Name | Handler Class | Events | Description |
|---|---|---|---|---|

**Flows:**
| Flow Name | Type | Object | Purpose | Status |
|---|---|---|---|---|
*Type values: Record-Triggered, Screen, Scheduled, Autolaunched, Platform Event-Triggered*

**LWC:**
| Component | Purpose | Data Source | Exposed To |
|---|---|---|---|
*Exposed To values: Lightning Record Page, App Page, Home Page, Experience Cloud, Flow Screen*

**Permission Sets:**
| API Name | Label | Description | Assigned To |
|---|---|---|---|

**Validation Rules:**
| Object | Rule Name | Description | Active |
|---|---|---|---|

**Page Layouts:**
| Object | Layout Name | Profile/Assignment | Description |
|---|---|---|---|

**Custom Metadata Types:**
| API Name | Purpose | Records |
|---|---|---|

**Platform Events:**
| API Name | Purpose | Publishers | Subscribers |
|---|---|---|---|

**Named Credentials:**
| Name | Endpoint | Auth Type | Used By |
|---|---|---|---|

---

## Wiki Templates

Templates for the project wiki structure generated during scaffolding.

### wiki/organization-overview.md

```markdown
# Organization Overview

## Client
- **Client Name:** [Client Name]
- **Industry:** [Industry]
- **Salesforce Edition:** [Enterprise / Unlimited / etc.]
- **User Count:** [Approximate number of Salesforce users]

## Engagement
- **Project Name:** [Project Name]
- **Entry Point:** [Greenfield / Build / Managed Services / Rescue]
- **Timeline:** [Start Date] — [End Date]
- **Team:** [Team members and roles]

## Org Landscape
- **Production Org:** [Org ID or alias]
- **Sandbox Strategy:** [Environment promotion path]
- **Key Integrations:** [External systems connected to Salesforce]

## Business Context
[Brief description of the client's business, their Salesforce goals, and the engagement's purpose.]
```

### wiki/ways-of-working/deployment-cicd.md

```markdown
# Deployment & CI/CD

## Branching Strategy
[GitFlow / GitHub Flow / Trunk-based — as selected during interview]

## Environment Promotion Path
[e.g., Scratch Org → Dev Sandbox → QA Sandbox → UAT Sandbox → Production]

## GitHub Actions Workflows
| Workflow | Trigger | Target |
|---|---|---|
| sf-validate.yml | PR to develop/main | Validation org |
| sf-deploy.yml | Merge to develop | Sandbox |
| sf-deploy.yml | Merge to main | Production |

## Deployment Checklist
- [ ] All tests passing (85%+ coverage)
- [ ] PR reviewed and approved
- [ ] BACKLOG.md and CHANGELOG.md updated
- [ ] Component registry current
- [ ] No hardcoded IDs or credentials
```

### wiki/ways-of-working/sandbox-strategy.md

```markdown
# Sandbox Strategy

## Environments
| Environment | Type | Purpose | Refresh Cadence |
|---|---|---|---|
| [Name] | [Developer / Developer Pro / Partial / Full] | [Purpose] | [Weekly / Sprint / Monthly] |

## Source of Truth
[Scratch orgs (source-driven) / Sandboxes (org-driven)]

## Data Seeding
[Approach for populating sandboxes with test data]

## Access
[Who has access to which environments]
```

### wiki/ways-of-working/team-makeup.md

```markdown
# Team Makeup

## Team Members
| Name | Role | Salesforce Expertise | GitHub Username |
|---|---|---|---|
| [Name] | [Lead Architect / Developer / Admin / Consultant] | [Certifications, specialties] | [GitHub handle] |

## Responsibilities
[RACI or simple responsibility matrix for key activities]

## Communication
[Preferred communication channels, meeting cadence, escalation path]
```

### wiki/ways-of-working/recurring-meetings.md

```markdown
# Recurring Meetings

| Meeting | Cadence | Attendees | Purpose |
|---|---|---|---|
| Daily Standup | Daily | Dev team | Progress, blockers |
| Sprint Planning | Bi-weekly | Full team | Plan next sprint |
| Sprint Review | Bi-weekly | Team + stakeholders | Demo completed work |
| Sprint Retro | Bi-weekly | Dev team | Process improvement |
| [Client-specific] | [Cadence] | [Attendees] | [Purpose] |
```

### wiki/ways-of-working/roadmap-timelines.md

```markdown
# Roadmap & Timelines

## Project Timeline
| Phase | Start | End | Status |
|---|---|---|---|
| [Phase name] | [Date] | [Date] | [Not Started / In Progress / Done] |

## Key Milestones
| Milestone | Target Date | Dependencies |
|---|---|---|
| [Milestone name] | [Date] | [What must be done first] |

## Risks to Timeline
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| [Risk description] | [Low/Med/High] | [Low/Med/High] | [Mitigation approach] |
```

### wiki/applications/README.md

```markdown
# Applications

This directory contains documentation for each application area / Salesforce product in the engagement. Each subdirectory follows a standard structure:

```
{product-name}/
├── overview.md          # What this application area covers
├── technical-specs.md   # Technical design and architecture
├── requirements.md      # Business and functional requirements
└── process-flows.md     # Business process documentation
```

## How to Add a New Application Area

1. Create a new directory: `wiki/applications/{product-name}/`
2. Copy the template files from any existing application area
3. Update the content for the new product/area
4. Update this README with the new area
```

### wiki/applications/{product-name}/overview.md

```markdown
# [Product Name] Overview

## Purpose
[What business capabilities this application area provides]

## Key Objects
| Object | Purpose |
|---|---|
| [Object API Name] | [What it's used for] |

## Key Users
| User Group | How They Use It |
|---|---|
| [e.g., Sales Reps] | [e.g., Manage leads and opportunities] |

## Integrations
[External systems this area connects to, if any]

## Current State
[For existing implementations: what's deployed today. For greenfield: N/A]
```

### wiki/applications/{product-name}/technical-specs.md

```markdown
# [Product Name] — Technical Specifications

## Architecture
[How this application area is built — objects, automation, UI components, integrations]

## Components
[List of key components — reference COMPONENT_REGISTRY.md for full details]

## Data Flow
[How data moves through this area — triggers, flows, integrations]

## Security
[Permission sets, sharing rules, field-level security specific to this area]

## Automation
| Name | Type | Trigger | Purpose |
|---|---|---|---|
| [Name] | [Flow / Trigger / Scheduled] | [What triggers it] | [What it does] |
```

### wiki/applications/{product-name}/requirements.md

```markdown
# [Product Name] — Requirements

## Functional Requirements
| ID | Requirement | Priority | Status |
|---|---|---|---|
| REQ-XXX | [Description] | [P0/P1/P2] | [Draft/Approved/Done] |

## Acceptance Criteria
### REQ-XXX: [Title]
- [ ] [Criterion 1]
- [ ] [Criterion 2]

## Non-Functional Requirements
| ID | Requirement | Priority |
|---|---|---|
| NFR-XXX | [Description] | [P0/P1/P2] |
```

### wiki/applications/{product-name}/process-flows.md

```markdown
# [Product Name] — Process Flows

## [Process Name]

**Trigger:** [What initiates this process]
**Actors:** [Who is involved]

### Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Business Rules
- [Rule 1]
- [Rule 2]

### Exception Handling
- [What happens when X goes wrong]
```

---

## Design Standards Template

Template for `wiki/ways-of-working/design-standards.md`, generated during scaffolding.

### Structure (Two-Layer)

**Layer 1 — Framework Defaults** (always included):

```markdown
# Design Standards

## Framework Defaults

These standards apply to all Salesforce engagements unless overridden by client-specific standards below.

### The 16 Golden Rules
1. Bulkification — all Apex handles collections
2. No SOQL/DML in loops
3. Trigger handler pattern — one trigger per object, delegates to handler
4. Governor limit awareness — check Limits class, design for 200-record batches
5. CRUD/FLS enforcement — WITH SECURITY_ENFORCED or stripInaccessible()
6. With/without sharing — default with sharing, document every without sharing
7. Test coverage 85%+ — test bulk operations, assert outcomes
8. Metadata-first — prefer declarative over code
9. SLDS compliance — all LWC use Lightning Design System
10. Data classification — mark custom fields with sensitivity level
11. Ask before modifying object model
12. CPU time budget — monitor, use Queueable/Batch for heavy processing
13. Naming conventions — follow firm standard
14. Living document sync — update all affected docs when modifying code
15. Component registry updates (non-negotiable) — every component change updates the registry
16. UI testing with Playwright — use screenshot loop for UI work when applicable

### Well-Architected Patterns
- **Trusted:** Security, performance, reliability
- **Easy:** User experience, admin experience, developer experience
- **Adaptable:** Scalable, flexible, maintainable

### Naming Conventions
[Reference to project's naming-conventions.md standard]

### Code Patterns
- Trigger Handler Dispatch for all triggers
- Service Layer for business logic
- Selector Pattern for SOQL queries
- Domain Layer for object-specific validation
- LWC Composition for component architecture
- Flow-vs-Code decision tree for automation choices
```

**Layer 2 — Client-Specific Standards** (populated during interview Round 8):

```markdown
## Client-Specific Standards

> These standards are specific to [Client Name] and override framework defaults where they conflict.

### Coding Standards
[Client-specific coding guidelines, if any]

### UI Standards
[Client-specific UI requirements — branding, accessibility level, supported browsers]

### Architectural Constraints
[Client-imposed constraints — no custom Apex in production, specific integration middleware, etc.]

### Documentation Standards
[Client-specific documentation requirements — format, naming, approval process]

### Review & Approval
[Client-specific review processes — CAB, code review requirements, deployment windows]
```

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

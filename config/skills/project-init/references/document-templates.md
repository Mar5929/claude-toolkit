# Document Templates Reference

This file defines the exact structure for every document the project-init skill can generate. Read the relevant sections when generating each file.

---

## Table of Contents

1. [CLAUDE.md Structure](#claudemd-structure)
2. [BACKLOG.md](#backlogmd)
3. [DECISIONS.md](#decisionsmd)
4. [CHANGELOG.md](#changelogmd)
5. [REQUIREMENTS.md](#requirementsmd)
6. [TECHNICAL_SPEC.md](#technical_specmd)
7. [DATA_MODEL.md](#data_modelmd)
8. [CODE_ATLAS.md](#code_atlasmd)
9. [README.md](#readmemd)
10. [GETTING_STARTED.md](#getting_startedmd)
11. [MIGRATION_REFERENCE.md](#migration_referencemd)

---

## CLAUDE.md Structure

Generate with the following **13-section structure**, tailored based on interview answers. Use HTML comment placeholders (`<!-- -->`) for values not yet known.

### Section 1 — Project Overview
- Project Name and one-line description
- Stack summary (languages, frameworks, key dependencies)
- Hosting (where frontend, backend, and database are deployed)
- Repo type (mono-repo or multi-repo, package manager)
- Related projects (links to prior work or predecessor projects, if any)

### Section 2 — Golden Rules
- Numbered list of invariants Claude must never violate, derived from the interview
- Always include these defaults (unless the user overrides):
  1. Ask before assuming — never guess at business logic, data model relationships, or security rules
  2. Document as you build — every change must be reflected in the living documents under `docs/` in the same response
  3. Minimize token waste — concise code, reference files by path, don't re-print unchanged files
  4. Incremental, deployable changes — each change should be small enough to test independently; never leave the project broken
  5. Always confirm data model changes with the user before proceeding
- Add any project-specific golden rules from the interview

### Section 3 — Workspace Structure
- ASCII directory tree showing the full project layout
- Include `CLAUDE.md`, `docs/` folder listing all enabled doc files, `src/` or `apps/` or `force-app/` directories
- Use comments to describe each directory's purpose
- Keep updated as the project evolves

### Section 4 — Living Documents — Update Protocol
- A table mapping events to required document updates. Only include rows for enabled documents:

  | Event | Action |
  |---|---|
  | New feature requested | Add to `REQUIREMENTS.md` → Add technical approach to `TECHNICAL_SPEC.md` → Update `BACKLOG.md` |
  | New table/column/object created | Add to `DATA_MODEL.md` |
  | Architecture decision made | Add ADR entry to `DECISIONS.md` |
  | Any code committed | Add entry to `CHANGELOG.md` |
  | Requirement changed | Update `REQUIREMENTS.md`, mark old version as superseded |
  | Feature completed | Mark status as `[DONE]` in `REQUIREMENTS.md` → Update `BACKLOG.md` |
  | Code added/modified | Update `CODE_ATLAS.md` — modules, functions, classes, relationships |
  | Request to modify backlog | Update `BACKLOG.md` |

- Format rules: compact Markdown (tables and bullet lists preferred over prose), use IDs (`REQ-001`, `ADR-001`, `BL-001`), ISO dates (`YYYY-MM-DD`)

### Section 5 — Coding Standards
- Create per-language subsections based on the tech stack identified during the interview
- Each language section should cover (as applicable): strict mode / compiler settings, naming conventions, component/module patterns, state management, styling approach, data fetching patterns, form handling, file structure, import conventions
- Include a **Database** subsection covering: naming conventions, primary key strategy, timestamp columns, migration workflow, indexing strategy
- For Salesforce: Apex coding standards, LWC conventions, SLDS usage, trigger handler patterns
- Populate with specifics from interview answers; use HTML comment placeholders for anything not yet decided

### Section 6 — Tech Stack Quick Reference
- Table with columns: `Layer | Technology | Version | Purpose`
- Include rows for every applicable layer
- For web apps: Frontend Framework, UI Components, Styling, Frontend Language, Auth, Backend Framework, Backend Language, ORM, Database, Cache, Testing (Backend), Testing (Frontend), Testing (E2E), CI/CD, Frontend Hosting, Backend Hosting, Database Hosting
- For Salesforce: Platform, CLI, IDE, Testing Framework, Deployment, CI/CD
- Use HTML comment placeholders for rows where details aren't yet known

### Section 7 — Key Commands
- Group by: **Local Development**, **Testing**, **Deployment**
- For Salesforce: add **SFDX Commands** group (org management, source push/pull, data operations)
- Each group uses bash code blocks with commented command descriptions
- Use HTML comment placeholders where specific commands aren't yet known

### Section 8 — Session Startup Checklist
- Numbered list of files Claude should read at the start of every session, in priority order:
  1. `CLAUDE.md` (this file)
  2. `docs/CODE_ATLAS.md` — complete codebase reference
  3. `docs/BACKLOG.md` — outstanding work items
  4. Skim `docs/REQUIREMENTS.md` if working on a feature
  5. Ask: "What would you like to work on today? Here are the open backlog items: ..."

### Section 9 — Git Commit Protocol (include if version control enabled)
- Commit message format: `feat(BL-XXX): Short summary of what was done` with bullet list of key changes and docs updated
- Rules: only commit after tests pass, one commit per backlog item, include doc updates in same commit
- Branching strategy and push policy from interview

### Section 10 — Clarification Protocol
- Template for how Claude should present clarification questions:
  ```
  **Clarification Needed**
  Before I proceed, I need to confirm:
  1. [Specific question]
  2. [Question about data model choice]
  > My default assumption would be: [state default].
  ```
- List categories that ALWAYS require clarification (from interview). Defaults: security/auth decisions, database/data model schema changes, third-party integrations, anything contradicting `docs/REQUIREMENTS.md`

### Section 11 — Context Window Management
- Rules for efficient context usage:
  1. Don't re-read files already read this session unless changed
  2. Reference by path — say "see `docs/REQUIREMENTS.md` REQ-003" instead of pasting content
  3. Use `docs/` as external memory — write decisions to docs files for future sessions
  4. Read `docs/CODE_ATLAS.md` for code context instead of scanning source files
  5. Checkpoint conversations — if getting long, suggest starting a new chat

### Section 12 — Bug-Prevention Facts
- Empty section with note: "Populated as you discover gotchas. Empty at project start."
- Format as a bullet list; add entries during development

### Section 13 — References
- Table with columns: `Resource | Description`
- Populated from interview answers and updated as project evolves

---

## BACKLOG.md

**Purpose:** Single source of truth for all planned, in-progress, and completed work items.

**Structure:**
- **Phases Overview table** at the top: columns for Phase number, Focus area, Duration/Timeline, and Backlog Item ID range
- **Per-phase sections** (e.g., "Phase 1: Foundation"), each containing:
  - Summary table: `ID | Title | Priority | Status | Implements`
  - Detailed description block for each item: `### BL-001: Title` with `**Details**:` paragraph
- **Completed section** at the bottom: `ID | Title | Completed (date) | Notes`

**Status values:** `NOT STARTED | IN PROGRESS | DONE | BLOCKED | DEFERRED`
**Priority values:** `P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low)`

Auto-create new items when TODOs or tech debt are discovered during development.

---

## DECISIONS.md

**Purpose:** Architectural Decision Record (ADR) log.

**Structure:**
- **Decision Index table** at the top: `ID | Title | Status | Date`
- **Per-decision sections** (`### ADR-001: Title`):
  - **Date**
  - **Status:** `PROPOSED | ACCEPTED | DEPRECATED | SUPERSEDED`
  - **Context:** What motivated this decision?
  - **Options Considered:** Numbered list with `Pros: / Cons:` each
  - **Decision:** What was chosen
  - **Consequences:** Positive and negative results
  - **Related:** Cross-references to `REQ-XXX`, `BL-XXX`, or `ADR-XXX`

---

## CHANGELOG.md

**Purpose:** Human-readable history of what changed and when.

**Format:** [Keep a Changelog](https://keepachangelog.com/) conventions. Reverse chronological.

**Structure per entry:**
- Heading: `## YYYY-MM-DD — Release Title or Version`
- Categories (only those that apply): Added, Changed, Fixed, Removed, Deprecated, Security
- Each bullet references relevant backlog IDs (e.g., `(BL-XXX)`)

Initialize with a "Project Bootstrap" entry listing all created documentation files.

---

## REQUIREMENTS.md

**Purpose:** Defines what the project must do — the "what" document.

**Structure:**
- **Requirement Index table**: `ID | Title | Priority | Status`
- **Functional Requirements** (`### REQ-001: Title`):
  - Priority, Status (`DRAFT | APPROVED | IN PROGRESS | DONE | DEFERRED | SUPERSEDED`)
  - Description, Acceptance Criteria (numbered checkbox list), Dependencies, Notes
- **Non-Functional Requirements** (`### NFR-001: Title`):
  - Priority, Description, Acceptance Criteria (measurable)
- **Glossary** table: `Term | Definition`

---

## TECHNICAL_SPEC.md

**Purpose:** The authoritative technical design document — the "how" companion to requirements.

**Structure (10 sections):**
1. **Architecture Overview** — goals, system context, ASCII architecture diagram
2. **Tech Stack Reference** — `Layer | Technology | Version | Purpose`
3. **API Route Design** — route convention, route groups table, detailed endpoint schemas
4. **Service Layer** — `Service Module | Purpose | Key Methods`
5. **Frontend Component Tree** — ASCII directory structure, key component listing
6. **Security Model** — Authentication, Authorization, Secrets Management
7. **Background Tasks** — `Task | Schedule | Purpose` (remove if not applicable)
8. **Third-Party Integrations** — `Service | Purpose | Auth Method` (remove if not applicable)
9. **Deployment Architecture** — per-environment details, CI/CD pipeline
10. **Open Questions** — `# | Question | Status (OPEN/RESOLVED) | Decision`

For Salesforce: adapt sections — replace API Routes with Integration Design, replace Frontend Components with LWC Component Tree, add Salesforce-specific security (profiles, permission sets, sharing rules).

---

## DATA_MODEL.md

**Purpose:** Database schema definition — single source of truth for all tables, columns, relationships, and conventions.

**For SQL databases:**
- **Table Inventory**: `Table | Description | Status (PLANNED/CREATED/MODIFIED)`
- **Schema Definitions** grouped by logical area, each table with full `CREATE TABLE` DDL
- **Relationships**: `Parent | Child | FK Column | On Delete`
- **ERD Diagram**: Mermaid `erDiagram` syntax
- **Naming Conventions**: `Aspect | Convention | Example`
- **Migration Notes**: tool, file location, workflow

**For Salesforce:** See `references/salesforce.md` for the adapted object model format.

---

## CODE_ATLAS.md

**Purpose:** Persistent context memory for Claude. Read this instead of scanning source files. Populated incrementally.

**Structure (8 sections + appendices):**
1. **Architecture Overview** — platform bullet list, ASCII layer diagram
2. **Database Schema** — reference to DATA_MODEL.md, summary table
3. **Backend Services** — `Module | Purpose | Key Methods`
4. **API Routes** — `Method | Path | Purpose | Service`
5. **Background Tasks** — `Task | Schedule | Purpose` (remove if not applicable)
6. **Frontend Components** — `Component | Path | Purpose`
7. **Key Patterns & Conventions** — numbered subsections for recurring patterns
8. **Cross-Cutting Concerns** — Authentication, Error Handling, Logging
- **Appendix A:** File → Module Reference
- **Appendix B:** Dependency Graph

For Salesforce: adapt sections — Apex Classes/Triggers instead of Backend Services, LWC Components instead of Frontend Components, add Flows/Automation section.

---

## README.md

**Purpose:** Standard project README for humans and GitHub.

**Structure:**
- Project name heading with one-line description
- **What's Inside** — ASCII directory tree
- **Quick Start** — Prerequisites, Clone & Install, Environment Setup, Start Development, Run Tests
- **Architecture Overview** — brief description, summary table
- **Documentation** — index table linking to each doc file
- **Key Commands** — grouped bash code blocks
- **Contributing** — brief guidelines
- **License** — reference

---

## GETTING_STARTED.md

**Purpose:** Bootstrap prompt for Claude at the start of each new session.

**Structure:**
- Read `CLAUDE.md`, then docs in priority order
- If migration: note original source location
- Summary of what `docs/` contains
- Directive to start with `BL-001`
- Keep concise — bootstrap prompt, not full spec

---

## MIGRATION_REFERENCE.md

**Purpose:** Rosetta Stone between original and new codebases.

**Structure (7 sections):**
1. **Service / Module Layer Mapping** — per-module tables: `Original | New | Change Notes`
2. **UI Component Mapping** — `Original Feature | New Implementation`
3. **Data Model Mapping** — Object/Table Mapping, Field Type Translation
4. **Pattern Translation Guide** — side-by-side code blocks
5. **API Mapping** — Original → New Endpoint Map
6. **Constants & Enums Reference** — carried forward, removed
7. **Key Differences Summary** — `Original Limitation / Pattern | New Solution`

---
name: project-init
description: >
  Initialize and scaffold any new project with a structured interview, tailored documentation,
  and Claude Code configuration. Use this skill whenever the user wants to start a new project,
  bootstrap a codebase, set up project documentation, create a CLAUDE.md, initialize a repo with
  docs, or scaffold a project structure. Covers full-stack web apps (Next.js, React, Python),
  APIs, Salesforce implementations (SFDX, discovery, BRDs, solution design docs, architecture
  diagrams), document processing projects (Excel, Word, PDF, PPTX), automation scripts, and
  personal projects. Also use when the user says things like "new project", "set up a project",
  "initialize this repo", "bootstrap this", "project setup", or "create project docs". Do NOT
  use for existing projects that already have a CLAUDE.md and docs/ structure in place — this
  skill is for initialization, not maintenance.
---

# Project Init

You are the project architect, documentation manager, and onboarding interviewer. Your job is to conduct a structured interview, then generate a tailored project scaffolding based on the user's answers.

**Do NOT create any files until the interview is complete and the user approves the creation summary.**

---

## Phase 1: Detect Project Type

Start by identifying the project type. This determines which interview questions to ask, which documents to recommend, and which directory structure to generate.

| Project Type | Key Signals | Interview Adaptations |
|---|---|---|
| **Full-stack web app** | Next.js, React, frontend + backend + database | Ask about Docker, CI/CD, env files, UI component library; recommend frontend-design skill; ask about Playwright testing |
| **API / Backend service** | REST/GraphQL API, no frontend | Skip frontend component questions; focus on API design, service layer, deployment |
| **Salesforce implementation** | Salesforce, SFDX, Apex, LWC, sandbox, scratch org | Use Salesforce-specific interview (see `references/salesforce.md`); SFDX project structure; client deliverables |
| **Document processing** | Excel, Word, PDF, PPTX generation/manipulation | Lighter structure; focus on input/output formats, libraries, automation |
| **Automation / Scripts** | CLI tools, cron jobs, data pipelines, ETL | Lighter structure; may not need full docs suite |
| **Personal project** | User says "personal", "side project", "hobby" | Lighter interview, fewer docs, simpler structure |

---

## Phase 2: The Interview

Conduct this as a natural conversation — ask **3-5 questions at a time**, wait for answers, then ask follow-ups. Do not dump all questions at once. Adapt based on answers — skip irrelevant topics, dig deeper into areas the user cares about.

### Round 1 — Project Identity & Context

- What is the project name and a one-line description?
- What problem does this project solve, and who are the target users?
- Is this a brand-new project, or does existing code/repos/prior work already exist?
- What is the tech stack? (languages, frameworks, key dependencies, target platforms)

Based on answers, classify the project type from the table above and adapt subsequent rounds.

### Round 2 — Project Phase & Discovery

- What phase is this project in?
  - **Discovery / Pre-build** — requirements and technical design still need to be fleshed out
  - **Greenfield build** — we know what to build and are starting from scratch
  - **Existing codebase** — adding features, fixing bugs, or refactoring
- Is this a **migration or rebuild** of an existing system?
  - If yes: Is the original source code or documentation available?
  - If yes: Recommend a **Migration Reference** (`docs/MIGRATION_REFERENCE.md`)
- If Discovery: Should Claude act as the **Discovery architect** — guiding user stories, acceptance criteria, technical specs, and data models before any code is written?

**If Salesforce:** Read `references/salesforce.md` for Salesforce-specific discovery questions (org type, deliverables, data migration, architecture diagrams).

### Round 3 — Version Control & Git Workflow

The user always uses **GitHub**. Ask:

- Should Claude handle version control operations for this project? (Ask each time — do not assume.)
  - If yes, ask granularly about: **commits** (auto-commit or wait for instruction?), **branching**, **pushing** (auto or on request?), **PRs**, **merge conflict resolution**, **tags/releases**
- **Recommend the best branching strategy** for this specific project. Present your top recommendation with rationale, plus 1-2 alternatives with brief pros/cons. Common strategies:
  - **GitHub Flow** — simple, good for small teams and continuous deployment
  - **GitFlow** — structured, good for release-based projects with multiple environments
  - **Trunk-based** — fast, good for CI/CD-heavy projects with strong test coverage
- Are there branch protection rules, required reviewers, or CI checks to know about?

### Round 4 — Documentation & Tracking

Ask which living documents Claude should maintain. Recommend a default set based on the project type:

| Document | Web App | API | Salesforce | Doc Processing | Automation | Personal |
|---|---|---|---|---|---|---|
| BACKLOG.md | Recommended | Recommended | Recommended | Optional | Optional | Optional |
| DECISIONS.md | Recommended | Recommended | Recommended | Skip | Skip | Skip |
| CHANGELOG.md | Recommended | Recommended | Recommended | Optional | Optional | Skip |
| REQUIREMENTS.md | Recommended | Recommended | Recommended | Optional | Skip | Skip |
| TECHNICAL_SPEC.md | Recommended | Recommended | Recommended | Skip | Skip | Skip |
| DATA_MODEL.md | Recommended | If DB | Recommended | Skip | Skip | Skip |
| CODE_ATLAS.md | Recommended | Recommended | Recommended | Skip | Skip | Skip |
| README.md | Recommended | Recommended | Recommended | Optional | Optional | Optional |
| GETTING_STARTED.md | Recommended | Recommended | Recommended | Skip | Skip | Skip |

Present the recommendations and let the user confirm or adjust.

For document template structures, read `references/document-templates.md`.

### Round 5 — Testing & Quality

- What is the testing strategy? (unit, integration, e2e, manual, none yet)
- Should Claude write tests alongside feature code automatically?
- **For web apps:** Recommend Playwright for e2e testing. Ask about specific browsers/viewports.
- **For Salesforce:** Recommend Apex unit tests + Playwright for UI testing of LWC/custom pages.
- Are there linting, formatting, or CI/CD pipelines to integrate with?

**For web apps only — additional questions:**
- Should Claude set up **Docker** for local development and/or deployment? (Recommend yes, explain benefits briefly)
- Should Claude create **CI/CD templates**? (GitHub Actions recommended)
- Should Claude set up **environment files** (`.env`, `.env.example`)? (Recommend yes)
- Which **UI component library** should be used? Present your top recommendation based on the stack, plus 1-2 alternatives:
  - For Next.js/React: recommend **shadcn/ui** (best for customization + Tailwind), alternatives: Radix UI, Chakra UI, MUI
  - Confirm the choice with the user before proceeding
- Note: When building UI features, Claude should use the **frontend-design skill** for high-quality design output.

### Round 6 — Conventions & Workflow

- Preferred coding conventions? (Per-language: naming, component patterns, imports)
  - If user is unsure, recommend best practices for the detected stack
- Database conventions? (naming, PK strategy, timestamps, migration tooling)
  - If user is unsure, recommend: snake_case tables/columns, UUID v4 PKs, `created_at`/`updated_at` on every table
- **Golden rules** — invariants Claude should never violate? Always include these defaults:
  1. Ask before assuming — never guess at business logic, data model relationships, or security rules
  2. Document as you build — every change reflected in living docs in the same response
  3. Minimize token waste — concise code, reference by path, don't re-print unchanged files
  4. Incremental, deployable changes — each change small enough to test independently
  5. Always confirm data model changes with the user before proceeding
- Communication style: brief, action-oriented, recommendations-first with rationale
- Uncertainty handling: always ask first for non-trivial decisions; low-risk decisions can proceed with stated assumptions
- Categories that always require clarification: security/auth, database schema changes, third-party integrations, business logic, anything contradicting `docs/REQUIREMENTS.md`
- Any **MCP servers or tools** to integrate with? Recommend based on project type:
  - Web apps: Postgres MCP, Playwright MCP
  - Salesforce: Salesforce MCP (if available), Playwright MCP
  - All: Context7 for library docs

---

## Phase 3: Creation Summary & Approval

Before creating any files, present a summary:

1. **Files to be created** — list every file and its purpose
2. **Enabled workflows checklist:**
   - [ ] Version Control (specifics: commit format, branching strategy, push policy, PR creation, conflict resolution)
   - [ ] Backlog Management
   - [ ] Decision Tracking (ADRs)
   - [ ] Changelog Maintenance
   - [ ] Requirements Management
   - [ ] Technical Spec Maintenance
   - [ ] Data Model Maintenance
   - [ ] Code Atlas Maintenance
   - [ ] Migration Reference
   - [ ] Playwright Testing & Screenshots
   - [ ] Auto-generated Tests
   - [ ] Discovery / Architecture Guidance
   - [ ] Docker Setup
   - [ ] CI/CD Pipeline
   - [ ] Frontend Design (with UI library choice)
3. **Directory structure preview** — ASCII tree of what will be created

**Wait for user approval before creating anything.**

---

## Phase 4: Generate Scaffolding

After approval, generate the project scaffolding. Read `references/document-templates.md` for the detailed structure of each document.

### Always Created: `CLAUDE.md`

Generate with the **13-section structure** described in `references/document-templates.md` (Section: "CLAUDE.md Structure"). Tailor every section based on interview answers. Use HTML comment placeholders (`<!-- -->`) for values not yet known.

### Always Created: `archive/`

Create an empty `archive/` directory at the project root. This is used to store archived project artifacts (superseded docs, old versions, deprecated code, etc.). Always include this in the directory structure preview shown during Phase 3.

### Conditionally Created: `docs/` files

Only create files the user opted into. Each file follows the template structure in `references/document-templates.md`.

### Project-Type-Specific Scaffolding

**Full-stack web apps:**
- Create `.env.example` if environment files enabled
- Create `Dockerfile` and `docker-compose.yml` if Docker enabled
- Create `.github/workflows/ci.yml` if CI/CD enabled
- Note in CLAUDE.md that the **frontend-design skill** should be used for all UI work
- Note the chosen UI component library in CLAUDE.md Section 6 (Tech Stack)

**Salesforce implementations:**
- Follow the SFDX project structure (see `references/salesforce.md`)
- Create `deliverables/` folder for client-facing documents
- Set up document processing capabilities for BRDs, Solution Design Docs, presentations
- Architecture diagrams as HTML-based interactive visualizations

**Document processing:**
- Note recommended libraries in CLAUDE.md (openpyxl, python-docx, reportlab, python-pptx)
- Simpler directory structure focused on scripts and output

**Personal projects:**
- Minimal docs, simple structure, lighter CLAUDE.md

---

## Phase 5: Workflow Rules

After scaffolding is created, these rules apply — scoped to enabled workflows. Include the relevant rules in CLAUDE.md.

Read `references/workflow-rules.md` for the complete set of rules covering:
- Document maintenance rules
- Version control rules
- Testing rules
- Discovery rules
- Migration rules
- Salesforce-specific rules

---

## Phase 6: Post-Creation

After all files are created:

1. Present the final summary of everything created
2. If Discovery phase: immediately begin the Discovery workflow
3. Otherwise: ask what the user wants to work on first, showing open backlog items if any

---

## Key Reminders

- **Always interview first.** Never skip to file creation.
- **Present recommendations.** For every decision point, give your best recommendation first, then 1-2 alternatives with brief pros/cons. Let the user decide.
- **Approval before creation.** Always show the creation summary and wait for a "go ahead" before writing files.
- **Project-type awareness.** Adapt the interview depth, document recommendations, and directory structure to the project type. Personal projects get a light touch; Salesforce implementations get the full treatment.
- **Skill integration.** For web apps with UI, note that the frontend-design skill should be used. For document generation in any project type, note relevant document skills (docx, xlsx, pdf, pptx).
- **Data model changes always require confirmation.** Across all project types — database schema, Salesforce object model, or any data structure change.

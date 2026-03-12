---
name: sf-project-init
description: >
  Initialize and scaffold a Salesforce consulting engagement with a structured 8-round expert
  interview, tailored CLAUDE.md, SFDX project structure, Linear project/issue auto-creation,
  and client deliverable templates. Use this skill whenever the user wants to start a new
  Salesforce client project, set up an SFDX workspace, begin a Salesforce discovery engagement,
  scaffold a Salesforce implementation, take over an existing Salesforce org, or set up managed
  services for a client org. Supports 4 entry points: greenfield/discovery, build phase, managed
  services, and rescue/takeover. Also trigger when the user says "new SF project", "Salesforce
  engagement", "client onboarding", "sf-project-init", "start a Salesforce project", or
  "initialize Salesforce workspace". Do NOT use for non-Salesforce projects — use project-init
  instead. Do NOT use for existing Salesforce projects that already have a CLAUDE.md and
  force-app/ structure in place.
---

# Salesforce Consulting Engagement Init

You are the **Salesforce engagement architect, technical lead, and onboarding interviewer**. Your job is to conduct a structured 8-round expert interview, then generate a complete Salesforce project scaffolding tailored to the engagement.

**Do NOT create any files until the interview is complete and the user approves the creation summary.**

---

## How This Skill Works

1. **Interview** (8 rounds) — Gather engagement context, org details, products, entry-point specifics, deliverables, dev standards, security, and conventions
2. **Summary & Approval** — Present everything that will be created, wait for user approval
3. **Generate** — Create SFDX project structure, CLAUDE.md, docs, deliverables folders, CI/CD templates, and Linear project
4. **Configure** — Set up MCP servers, Context7 references, and tool integrations

---

## Phase 1: The Interview

Conduct this as a **natural conversation** — ask **3-5 questions at a time**, wait for answers, then ask follow-ups. Do not dump all questions at once. Adapt based on answers — skip irrelevant topics, dig deeper into areas the user cares about.

Read the following reference files during the interview to provide informed questions and recommendations:
- `references/salesforce-well-architected.md` — architectural guidance
- `references/salesforce-products.md` — product-specific questions
- `references/entry-points.md` — entry-point-specific guidance
- `references/interview-adaptations.md` — logic for adapting interview depth

### Round 1 — Engagement Context

Ask these questions to establish the engagement:

- What is the **client name** and **project name**?
- What is your **role** on this engagement? (Lead architect, developer, admin, consultant)
- How large is the **consulting team**? Who else will be working in this repo?
- What is the **entry point** for this engagement?
  - **Discovery / Greenfield** — Starting from scratch, full requirements gathering
  - **Build Phase** — Requirements exist, jumping into development
  - **Managed Services** — Ongoing support and enhancements for an existing org
  - **Rescue / Takeover** — Taking over from a previous vendor, audit and remediation focus

Based on the entry point, read `references/entry-points.md` for guidance on what to ask, skip, and prioritize in subsequent rounds.

### Round 2 — Org & Environment

> **Skip for Managed Services** — ask a lighter version focused on current org state.

- What type of Salesforce org? (Production, Sandbox, Scratch Org, Developer Edition)
- Is there an **existing org** with data/config, or starting fresh?
- What is the **environment promotion path**? (e.g., Scratch → Dev Sandbox → QA → UAT → Prod)
- Will you use **scratch orgs** for development? (Recommend yes for source-tracked development)
- Is this a **multi-org** environment? (e.g., separate orgs for different business units)

### Round 3 — Products & Scope

Read `references/salesforce-products.md` for product-specific interview questions.

- Which **Salesforce clouds/products** are involved? Present the list and let the user select:
  - [ ] Sales Cloud
  - [ ] Service Cloud
  - [ ] Experience Cloud
  - [ ] Marketing Cloud
  - [ ] Data Cloud
  - [ ] Revenue Cloud / CPQ
  - [ ] Industries / OmniStudio
  - [ ] MuleSoft
  - [ ] Tableau
- Are there any **AppExchange packages** or managed packages involved?
- What **integrations** with external systems are needed? (ERP, data warehouse, legacy systems, APIs)
- Is there a **data migration** component? (From legacy systems, CSV, ETL tools)
  - If yes: What are the source systems? Approximate data volumes? Transformation requirements?

For each selected product, ask the **targeted interview questions** from `references/salesforce-products.md`.

### Round 4 — Entry-Point Deep Dive

Read `references/entry-points.md` for this round. The questions are **fully adaptive** based on the entry point selected in Round 1.

**If Greenfield / Discovery:**
- What are the primary business processes to be supported?
- What are the current pain points with existing tools/processes?
- Who are the key stakeholders? What are their success criteria?
- What compliance or regulatory requirements exist? (HIPAA, SOX, PCI, GDPR)
- What is the expected timeline?

**If Build Phase:**
- Where are the existing **requirements documents**? (BRD, user stories, design docs)
- Has a **solution design** been completed? By whom?
- What is the **sprint cadence**? (Recommend 2-week sprints)
- Are **environments** already set up? What state are they in?
- Is there an existing **CI/CD pipeline**?

**If Managed Services:**
- What are the current **org health concerns**? Known tech debt?
- What are the **SLA terms**? (Response time, resolution time, coverage hours)
- What is the **ticket/change request process**? (Email, portal, Jira, Linear)
- What is the **change management** process? (CAB, approval workflows)
- Are there existing **documentation or runbooks**?

**If Rescue / Takeover:**
- What is **broken** or at risk? (Specific issues, blockers, failed deployments)
- Who was the **previous vendor/team**? Is there a handoff?
- What is the **deployment history**? Recent changes that may have caused issues?
- Are there **data integrity concerns**? (Duplicate records, broken integrations, stale data)
- What is the **urgency level**? Are there critical fixes needed before systematic remediation?

### Round 5 — Deliverables & Docs

Read `references/document-templates.md` for template structures.

- Which **client deliverables** does the client expect? Present defaults based on entry point:

| Deliverable | Greenfield | Build | Managed | Rescue |
|---|---|---|---|---|
| Business Requirements Document (BRD) | Required | Review existing | Skip | Skip |
| Solution Design Document (SDD) | Required | Required | Skip | After audit |
| Data Migration Plan | If applicable | If applicable | Skip | If applicable |
| Test Plan & UAT Scripts | Required | Required | Lighter | Required |
| Architecture Diagrams (HTML) | Required | Required | Current state | Current + Target |
| Training Materials | Required | Required | Skip | Skip |
| Org Assessment | Skip | Skip | Required | Required |
| Rescue Assessment | Skip | Skip | Skip | Required |

- Should Claude **auto-create a Linear project** for this engagement? (Recommend yes)
  - If yes: confirm the team (default: Rihm), milestone structure based on entry point
- Which **living documents** should Claude maintain?
  - Recommend defaults: BACKLOG.md, REQUIREMENTS.md, TECHNICAL_SPEC.md, DECISIONS.md, CHANGELOG.md, DATA_MODEL.md, CODE_ATLAS.md

### Round 6 — Dev Standards & CI/CD

> **Skip some for Managed Services** — focus on deployment pipeline and code review.

- **Branching strategy** — recommend **GitFlow** for Salesforce engagements:
  - `main` — production-ready code, deploys to production
  - `develop` — integration branch, deploys to dev/QA sandbox
  - `feature/*` — individual features, validated via CI on PR
  - `hotfix/*` — emergency fixes from main
  - `release/*` — release candidates, deploys to UAT
  - Present alternatives: GitHub Flow (simpler), Trunk-based (for small teams)
- **GitHub Actions CI/CD** — recommend enabling with these templates:
  - `sf-validate.yml` — validate PR against target org (runs on PR to develop/main)
  - `sf-deploy.yml` — deploy to target org (runs on merge to develop/main)
  - Read `references/cicd-templates.md` for the YAML templates
- **Code review policy** — require PR review before merge? Minimum reviewers?
- **Test coverage target** — Salesforce requires 75%, recommend **85%+**
- **Apex code standards** — accept the 13 Golden Rules as defaults? (see below)

### Round 7 — Security & Compliance

- What is the **data classification** for this org? (Public, Internal, Confidential, Restricted)
- Are there **compliance requirements**? (HIPAA, SOX, PCI-DSS, GDPR, FedRAMP)
- What is the **sharing model** strategy?
  - Organization-Wide Defaults (OWD) per object?
  - Sharing rules, role hierarchy, territory management?
- Is **Salesforce Shield** / Platform Encryption in use or needed?
- Are there **field-level security** requirements beyond standard profiles/permission sets?

### Round 8 — Conventions & Preferences

Read `references/naming-conventions.md` for the default naming standard.

- **Naming conventions** — accept the firm standard from `references/naming-conventions.md`? Or customize?
  - Present the default standard and let the user confirm or modify
- **Communication style** — how should Claude communicate? (Brief and action-oriented recommended)
- **MCP server confirmations** — should Claude ask before using MCP tools? (Recommend: ask for destructive actions only)
- Any **additional golden rules** or invariants specific to this engagement?

---

## The 13 Golden Rules

These are included in every generated CLAUDE.md. Present them during Round 6 for confirmation:

1. **Bulkification** — All Apex must handle collections, never single records
2. **No SOQL/DML in loops** — Query and DML operations outside loops, always
3. **Trigger handler pattern** — One trigger per object, delegates to handler class
4. **Governor limit awareness** — Check `Limits` class, design for 200-record batches
5. **CRUD/FLS enforcement** — Use `WITH SECURITY_ENFORCED` or `stripInaccessible()`
6. **With/without sharing** — Default `with sharing`, document every `without sharing` use
7. **Test coverage 85%+** — Test bulk operations, assert outcomes not just no-exceptions
8. **Metadata-first** — Prefer declarative (Flows, validation rules) over custom code
9. **SLDS compliance** — All LWC must use Lightning Design System
10. **Data classification** — Mark custom fields with sensitivity level
11. **Ask before modifying object model** — Never create/modify objects, fields, or relationships without user confirmation
12. **CPU time budget** — Monitor in complex operations, use Queueable/Batch for heavy processing
13. **Naming conventions** — Follow firm standard from `references/naming-conventions.md`

---

## Phase 2: Creation Summary & Approval

Before creating any files, present a comprehensive summary:

### 1. Engagement Summary
- Client name, project name, entry point
- Products in scope
- Team size and consultant roles
- Key compliance/security requirements

### 2. Files to Create

Present the full file list organized by category:

**Project Configuration:**
- `CLAUDE.md` — Claude Code persistent memory with all engagement context
- `sfdx-project.json` — SFDX project definition
- `config/project-scratch-def.json` — Scratch org definition (if using scratch orgs)
- `.forceignore` — Files to exclude from source tracking
- `.gitignore` — Git ignore rules for SFDX projects

**Living Documentation (`docs/`):**
- List only the documents the user opted into from Round 5

**Client Deliverables (`deliverables/`):**
- List only the deliverables the user opted into from Round 5

**SFDX Source (`force-app/main/default/`):**
- `classes/` — Apex classes
- `triggers/` — Apex triggers
- `lwc/` — Lightning Web Components
- `flows/` — Flow definitions
- `objects/` — Custom objects and fields
- `permissionsets/` — Permission sets
- `layouts/` — Page layouts
- `staticresources/` — Static resources

**CI/CD (`.github/workflows/`):**
- `sf-validate.yml` — PR validation pipeline
- `sf-deploy.yml` — Deployment pipeline

**Scripts:**
- `scripts/deploy/` — Deployment helper scripts

### 3. Linear Project Setup
- Project name, team, milestones (based on entry point)
- Initial issues to create
- Cycle/sprint structure

### 4. MCP Server Configuration
- Required: `salesforcecli/mcp` (Official SF DX MCP)
- Required: Linear MCP, Context7 MCP, Playwright MCP
- Optional: `tsmztech/mcp-server-salesforce` (deeper SOQL/CRUD access)

### 5. Enabled Workflows Checklist
Present a checkbox list of all enabled workflows.

**Wait for user approval before creating anything.**

---

## Phase 3: Generate Scaffolding

After approval, generate the project. Read reference files for templates:
- `references/document-templates.md` — document structures
- `references/cicd-templates.md` — GitHub Actions YAML
- `references/naming-conventions.md` — naming standard
- `references/workflow-rules.md` — workflow rules for CLAUDE.md

### CLAUDE.md Generation

Generate with the **13-section structure** from `references/document-templates.md`, tailored for Salesforce:

**Section 1 — Project Overview:** Client name, project name, entry point, products in scope, team, org type
**Section 2 — Golden Rules:** The 13 Golden Rules (confirmed or modified in Round 6), plus any engagement-specific rules
**Section 3 — Workspace Structure:** SFDX directory tree with `force-app/`, `docs/`, `deliverables/`, `scripts/`, `.github/`
**Section 4 — Living Documents Update Protocol:** Event-to-action table for enabled documents
**Section 5 — Coding Standards:** Salesforce-specific: Apex (bulkification, trigger handlers, SOQL best practices), LWC (wire vs imperative, SLDS, accessibility), Flows (naming, documentation)
**Section 6 — Tech Stack:** Salesforce Platform, SFDX CLI, VS Code, GitHub, GitHub Actions, selected products
**Section 7 — Key Commands:** SFDX commands grouped by: Org Management, Source Operations, Testing, Deployment
**Section 8 — Session Startup:** Read CLAUDE.md → CODE_ATLAS.md → BACKLOG.md → ask what to work on
**Section 9 — Git Commit Protocol:** GitFlow format, `feat(BL-XXX): summary`
**Section 10 — Clarification Protocol:** Always clarify: object model changes, sharing rules, security settings, integrations
**Section 11 — Context Window Management:** Use docs as external memory, reference by path
**Section 12 — Bug-Prevention Facts:** Empty, populated during development
**Section 13 — References:** Link to Well-Architected, Context7, SFDX docs, product-specific guides

**Context7 Integration:** Add to Section 13:
```
- Use Context7 MCP (`resolve-library-id` → `query-docs`) for live Apex, LWC, and SFDX CLI documentation
- Fall back to `references/salesforce-well-architected.md` for architectural guidance and anti-patterns
```

**MCP Server Instructions:** Add to CLAUDE.md:
```
## MCP Servers

### Required
- **salesforcecli/mcp** — Official Salesforce DX MCP. Use for: deploy, retrieve, run tests, manage scratch orgs via natural language
- **Linear MCP** — Issue tracking. Team: [team name], Project: [project name]
- **Context7 MCP** — Live documentation lookup for Apex, LWC, SFDX CLI
- **Playwright MCP** — Browser automation for UI testing and screenshot verification

### Optional
- **tsmztech/mcp-server-salesforce** — Community MCP for deeper SOQL queries, CRUD operations, and metadata API access
```

### SFDX Project Files

**sfdx-project.json:**
```json
{
  "packageDirectories": [{ "path": "force-app", "default": true }],
  "namespace": "",
  "sfdcLoginUrl": "https://login.salesforce.com",
  "sourceApiVersion": "62.0"
}
```

**config/project-scratch-def.json** (if scratch orgs enabled):
```json
{
  "orgName": "[Client] - [Project] Dev",
  "edition": "Developer",
  "features": [],
  "settings": {
    "lightningExperienceSettings": { "enableS1DesktopEnabled": true },
    "mobileSettings": { "enableS1EncryptedStoragePref2": false }
  }
}
```

### CI/CD Templates

Read `references/cicd-templates.md` and generate:
- `.github/workflows/sf-validate.yml`
- `.github/workflows/sf-deploy.yml`

### Directory Structure

Create the full directory structure:
```
project-root/
├── CLAUDE.md
├── README.md
├── GETTING_STARTED.md
├── sfdx-project.json
├── .forceignore
├── .gitignore
│
├── docs/                              # Living documentation
│   ├── BACKLOG.md
│   ├── REQUIREMENTS.md
│   ├── TECHNICAL_SPEC.md
│   ├── DECISIONS.md
│   ├── CHANGELOG.md
│   ├── DATA_MODEL.md
│   └── CODE_ATLAS.md
│
├── deliverables/                      # Client-facing documents
│   ├── brd/
│   ├── sdd/
│   ├── data-migration/
│   │   └── field-mappings/
│   ├── test-plans/
│   ├── architecture/
│   ├── presentations/
│   └── training/
│
├── force-app/                         # SFDX source
│   └── main/
│       └── default/
│           ├── classes/
│           ├── triggers/
│           ├── lwc/
│           ├── aura/
│           ├── flows/
│           ├── objects/
│           ├── permissionsets/
│           ├── profiles/
│           ├── layouts/
│           ├── tabs/
│           └── staticresources/
│
├── config/
│   └── project-scratch-def.json
│
├── scripts/
│   └── deploy/
│
└── .github/
    └── workflows/
        ├── sf-validate.yml
        └── sf-deploy.yml
```

---

## Phase 4: Linear Auto-Creation

After file generation, use the Linear MCP to create the engagement tracking structure.

### Create Linear Project
Use `save_project` to create a project under team Rihm (`dfe15bc4-6dd0-4bde-8609-6620efc3140d`):
- Name: `[Client Name] - [Project Name]`
- Description: Generated from interview answers

### Create Milestones
Use `save_milestone` to create milestones based on entry point:

**Greenfield:** Discovery → Design → Build → Test → Deploy → Go-Live → Hypercare
**Build Phase:** Design → Build → Test → Deploy → Go-Live → Hypercare
**Managed Services:** Assessment → Stabilize → Ongoing Support
**Rescue:** Assessment → Remediation → Stabilize → Build → Test → Deploy

### Create Initial Issues
Use `save_issue` to create issues derived from interview answers:
- Assign to the user (Michael Rihm: `8d75f0a6-f848-41af-9f4b-d06036d6af82`)
- Set appropriate priority based on entry point urgency
- Link to milestones
- Use labels from `list_issue_labels`

### Create Cycles
Use 2-week sprint cycles aligned to the engagement timeline.

---

## Phase 5: Post-Creation

After all files are created and Linear is set up:

1. Present the **final summary** of everything created (files, Linear project, issues)
2. Remind the user to configure MCP servers if not already set up:
   - `salesforcecli/mcp` — install instructions
   - Verify Linear, Context7, Playwright MCPs are active
3. Based on entry point:
   - **Greenfield:** Begin the Discovery workflow — start requirements gathering
   - **Build Phase:** Review existing requirements, start sprint planning
   - **Managed Services:** Begin org health assessment
   - **Rescue:** Begin audit — code review, security assessment, technical debt catalog
4. Show open backlog items and ask what to work on first

---

## External Tool Recommendations

Present these to the user during or after initialization:

### Required MCP
- **salesforcecli/mcp** (Official Salesforce DX MCP, 309+ stars) — Deploy, retrieve metadata, manage scratch orgs, run Apex tests via natural language commands through Claude Code

### Optional Tools
- **Jaganpro/sf-skills** (163+ stars) — 14 specialized Claude Code skills for Salesforce development (Apex, LWC, Flow, SOQL, etc.) by a Salesforce CTA. Consider installing for deeper SF-specific guidance
- **tsmztech/mcp-server-salesforce** (135+ stars) — Community MCP for SOQL queries, CRUD operations, and metadata API access. Useful when you need deeper org interaction beyond what the official MCP provides

### Reference
- **Salesforce Well-Architected Framework** — Patterns, anti-patterns, and best practices at architect.salesforce.com. Curated version in `references/salesforce-well-architected.md`

---

## Key Reminders

- **Always interview first.** Never skip to file creation.
- **Present recommendations.** For every decision point, give your best recommendation first with rationale, plus 1-2 alternatives.
- **Approval before creation.** Always show the creation summary and wait for "go ahead."
- **Entry-point awareness.** Adapt interview depth, deliverable defaults, Linear milestones, and CI/CD setup based on the entry point.
- **Shared repo model.** This engagement will have multiple consultants. Include .gitignore patterns, branch protection recommendations, and CODEOWNERS guidance.
- **Data model changes always require confirmation.** Never create or modify Salesforce objects, fields, or relationships without explicit user approval.
- **Use Context7 for live docs.** When writing Apex, LWC, or SFDX commands, use Context7 MCP to verify current API signatures and patterns.

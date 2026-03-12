# Engagement Entry Points Reference

This reference defines four distinct engagement entry points for the sf-project-init skill. Each entry point tailors the interview process, deliverables, and Linear project structure to the engagement type.

---

## 1. Discovery / Greenfield

A brand-new Salesforce implementation or a new cloud/product being added to an existing org. No prior requirements or design documents exist — everything must be gathered from scratch.

### What to Ask

Full interview path — all 8 rounds apply:

1. **Client & Org Context** — Company name, industry, org type (new vs existing), edition, user count, Salesforce products in scope.
2. **Business Process Discovery** — Current-state processes (manual or legacy system), pain points, desired future-state workflows.
3. **Data Model & Migration** — Existing data sources, data volumes, data quality, migration approach (ETL tooling, manual, hybrid), object model requirements.
4. **Integration Landscape** — External systems to integrate, direction (inbound/outbound/bidirectional), frequency, authentication, error handling.
5. **Security & Compliance** — Data classification, regulatory requirements (HIPAA, SOX, GDPR, PCI), sharing model, CRUD/FLS needs, encryption.
6. **User Experience** — Personas, UI requirements, mobile needs, Lightning App/page layout expectations, communities/portals.
7. **Reporting & Analytics** — Key KPIs, dashboard requirements, report types, Tableau/CRM Analytics needs, data warehouse integration.
8. **Deployment & DevOps** — Environments (sandbox strategy), CI/CD pipeline, release cadence, source control, testing strategy.

### What to Skip

Nothing — Discovery requires the full interview.

### What to Prioritize

- Requirements gathering depth — incomplete discovery is the #1 cause of project failure.
- Data model design — get this right before building anything.
- Integration architecture — identify all touchpoints early to avoid mid-project surprises.
- Stakeholder alignment — ensure business and technical stakeholders agree on scope.

### Deliverables to Generate

| Deliverable | Description |
|---|---|
| **Business Requirements Document (BRD)** | Comprehensive requirements organized by functional area with acceptance criteria |
| **Solution Design Document (SDD)** | Technical design covering data model, automation, integrations, security model |
| **Data Migration Plan** | Source-to-target field mapping, transformation rules, migration sequence, validation approach |
| **Test Plan** | Test strategy, test case categories, UAT plan, performance testing approach |
| **Architecture Diagrams** | System context diagram, integration architecture, data flow diagrams, ERD |
| **Project Plan** | Phase timeline, milestone dates, resource allocation, risk register |

### Linear Milestone Defaults

| Milestone | Description | Typical Duration |
|---|---|---|
| Discovery | Requirements gathering, stakeholder interviews, current-state analysis | 2-4 weeks |
| Design | Solution design, architecture decisions, data model, prototype | 2-3 weeks |
| Build | Sprint-based development, configuration, customization | 4-12 weeks |
| Test | System testing, integration testing, UAT, performance testing | 2-4 weeks |
| Deploy | Production deployment, data migration execution, cutover | 1-2 weeks |
| Go-Live | Launch, user training, monitoring, immediate support | 1 week |
| Hypercare | Post-launch stabilization, bug fixes, optimization, knowledge transfer | 2-4 weeks |

---

## 2. Build Phase

The client has already completed discovery and/or design. Requirements documents and possibly solution designs exist. The engagement picks up at the build stage.

### What to Ask

- Where are the existing requirements and design documents? (Confluence, SharePoint, Google Docs, local files)
- Have requirements been approved/signed off by stakeholders?
- Is the solution design document complete? Who authored it? Has it been peer-reviewed?
- What is the sprint cadence? (1-week, 2-week, 3-week sprints)
- What environments are available? (Dev, QA, Staging, UAT, Production) Are they provisioned?
- Is CI/CD in place? What tools? (GitHub Actions, Copado, Gearset, SFDX scripts)
- What source control is being used? (GitHub, Bitbucket, GitLab) What branching strategy?
- Are there existing team members or developers already on the project?
- What work has already been completed? What is the current state of the org?
- Are there any technical constraints or decisions already made? (Managed packages, AppExchange products, coding standards)

### What to Skip

- Full business process discovery — requirements already exist.
- Data source identification — should be in the existing docs.
- Stakeholder interview rounds — done in prior phase.
- BRD generation — already exists.

### What to Prioritize

- **Validate existing requirements** — read the docs and flag gaps, ambiguities, or contradictions.
- **Environment setup** — ensure dev/sandbox environments are ready and connected to source control.
- **SFDX project scaffolding** — initialize project structure, directory layout, scratch org definition.
- **Sprint backlog creation** — decompose requirements into Linear issues with story points and acceptance criteria.
- **Technical standards** — establish coding standards, naming conventions, and review process if not already defined.

### Deliverables to Generate

| Deliverable | Description |
|---|---|
| **Solution Design Document (SDD)** | Only if not already done — or validate/extend the existing one |
| **Test Plan** | Test strategy and case framework aligned with sprint delivery |
| **Architecture Diagrams** | Validate or create: ERD, integration flows, deployment architecture |
| **Sprint Backlog** | Decomposed Linear issues with acceptance criteria, story points, sprint assignment |
| **SFDX Project Structure** | Initialized project with directory layout, scratch org config, CI/CD pipeline |

### Linear Milestone Defaults

| Milestone | Description | Typical Duration |
|---|---|---|
| Design | Validate/extend existing design — may be brief if design is solid | 1-2 weeks |
| Build | Sprint-based development, configuration, customization | 4-12 weeks |
| Test | System testing, integration testing, UAT | 2-4 weeks |
| Deploy | Production deployment, data migration, cutover | 1-2 weeks |
| Go-Live | Launch, monitoring, immediate support | 1 week |
| Hypercare | Post-launch stabilization, bug fixes, knowledge transfer | 2-4 weeks |

---

## 3. Managed Services

An ongoing support engagement for an existing Salesforce org. The focus is on operational stability, incremental enhancements, and reactive support — not net-new project delivery.

### What to Ask

- What is the current state of the org? Any known health issues? (Apex test failures, deployment blockers, governor limit warnings)
- What are the SLA terms? (Response time, resolution time, support hours, severity definitions)
- What is the ticket/request process? (Jira, ServiceNow, email, Salesforce Case)
- What is the change management process? (Change Advisory Board, approval gates, deployment windows)
- What are the support hours? (Business hours only, 24/7, follow-the-sun)
- What is the escalation path? (Tier 1 → Tier 2 → Tier 3, on-call rotation)
- Who are the key stakeholders and admin contacts?
- What Salesforce products and features are currently in use?
- What integrations are running in production? (Middleware, direct API, ETL)
- Is there existing documentation? (Runbooks, architecture diagrams, known issues log)
- What is the enhancement request process? How are enhancements prioritized and estimated?
- What is the current release cadence for changes? (Weekly, biweekly, monthly, ad-hoc)

### What to Skip

- Full discovery interview — the org already exists and is in production.
- BRD generation — work is ticket-based, not project-based.
- Data migration planning — not applicable unless a specific migration is requested.
- Solution design for net-new features — handled per-ticket as enhancement requests.

### What to Prioritize

- **Org health assessment** — run Salesforce Optimizer, check Apex test coverage, review debug logs for errors, audit security settings.
- **Support process setup** — define SLA tiers, response/resolution targets, ticket workflow, escalation procedures.
- **Knowledge transfer** — document the org: architecture, integrations, custom code inventory, known quirks.
- **Monitoring and alerting** — set up error email notifications, Event Monitoring (Shield), and scheduled health checks.
- **Quick wins** — identify and fix low-effort, high-impact issues during the assessment phase to build trust.

### Deliverables to Generate

| Deliverable | Description |
|---|---|
| **Org Assessment Report** | Health score, technical debt inventory, security findings, performance concerns |
| **SLA Documentation** | Severity definitions, response/resolution targets, escalation matrix, support hours |
| **Support Process Document** | Ticket workflow, triage criteria, change management process, deployment procedures |
| **Architecture Overview** | Current-state diagram of objects, integrations, and automation — living document |
| **Known Issues Log** | Catalog of existing bugs, workarounds, and technical debt with priority ratings |

### Linear Milestone Defaults

| Milestone | Description | Typical Duration |
|---|---|---|
| Assessment | Org health audit, documentation review, stakeholder interviews | 1-2 weeks |
| Stabilize | Fix critical issues found during assessment, establish monitoring | 2-4 weeks |
| Ongoing Support | Continuous — ticket-based support, enhancements, maintenance | Ongoing |

---

## 4. Rescue / Takeover

Taking over from a failed project, departed vendor, or internal team that left the org in a problematic state. The focus is on assessing damage, stabilizing the environment, and establishing a path to recovery.

### What to Ask

- **What's broken?** What are the current blockers, production issues, and user complaints?
- **Previous vendor/team** — Who was responsible before? Why did the engagement end? (Fired, contract ended, team left)
- **Known technical debt** — What shortcuts, workarounds, or incomplete features are known?
- **Deployment history** — When was the last successful deployment? Are there pending changesets or undeployed work?
- **Current blockers** — What is preventing the team from making progress right now?
- **Data integrity concerns** — Any known data quality issues? Duplicate records? Broken integrations that corrupted data?
- **Documentation status** — Does any documentation exist? (Requirements, design docs, architecture diagrams, credentials)
- **Source control status** — Is the org's metadata in source control? Is it current? Or is the org the source of truth?
- **User impact** — Which business processes are currently affected? What are users doing as workarounds?
- **Contractual/timeline pressure** — Are there regulatory deadlines, launch dates, or contractual obligations at risk?
- **Access and credentials** — Do we have admin access? Named Credentials? Integration credentials? CI/CD access?

### What to Skip

- Standard discovery questions about business processes — the focus is on what exists and what's broken, not what should be built.
- New feature requirements gathering — stabilize first, enhance later.
- Stakeholder visioning sessions — urgency requires triage, not blue-sky thinking.

### What to Prioritize

- **Code audit** — Review all custom Apex, LWC, triggers, and batch jobs. Flag security issues, governor limit risks, and anti-patterns.
- **Security review** — Check CRUD/FLS enforcement, sharing model, permission sets, admin access, Named Credentials, hardcoded secrets.
- **Technical debt catalog** — Create a severity-rated inventory of all issues found during the audit.
- **Critical fix identification** — Separate critical/blocking issues from medium/low-priority debt.
- **Integration health check** — Verify all integrations are functional. Check error logs, retry queues, and data consistency.
- **Data integrity assessment** — Run duplicate detection, check referential integrity, validate key fields.
- **Deployment pipeline** — Establish or repair CI/CD. Get metadata into source control if it isn't already.

### Deliverables to Generate

| Deliverable | Description |
|---|---|
| **Rescue Assessment** | Severity-rated findings across code quality, security, data integrity, integrations, and architecture |
| **Remediation Plan** | Prioritized list of fixes with estimated effort, dependencies, and recommended sequence |
| **Architecture Diagrams** | Current-state diagram (what exists) + target-state diagram (where we're heading) |
| **Technical Debt Register** | Every finding with severity, category, estimated effort, and recommended approach |
| **Risk Register** | Identified risks with likelihood, impact, and mitigation strategies |

### Severity Rating Framework

Use this framework to rate each finding in the Rescue Assessment:

| Severity | Definition | Response | Examples |
|---|---|---|---|
| **Critical** | Production is broken, data is at risk, or security vulnerability is exploitable. Immediate action required. | Fix within 24-48 hours | SOQL injection, missing sharing rules exposing PII, broken integration losing data, production errors blocking business processes |
| **High** | Significant risk or degraded functionality. Not immediately breaking but will cause problems soon. | Fix within 1-2 weeks | Governor limit violations under load, no error handling on integrations, hardcoded credentials, critical business logic without test coverage |
| **Medium** | Technical debt that increases maintenance cost or risk over time. Not immediately dangerous. | Fix within 1-2 months | Anti-patterns (SOQL in loops with low volume), inconsistent naming conventions, missing documentation, outdated API versions |
| **Low** | Code quality or best practice violations with minimal immediate risk. | Fix opportunistically | Minor refactoring opportunities, cosmetic UI issues, unused code/fields, non-critical test coverage gaps |

### Linear Milestone Defaults

| Milestone | Description | Typical Duration |
|---|---|---|
| Assessment | Code audit, security review, integration health check, data integrity scan | 1-3 weeks |
| Remediation | Fix critical and high-severity issues, establish CI/CD, get metadata into source control | 2-6 weeks |
| Stabilize | Resolve medium-severity issues, improve test coverage, establish monitoring | 2-4 weeks |
| Build (Resume) | Resume or restart feature development once the foundation is stable | 4-12 weeks |
| Test | System testing, regression testing, UAT for new and remediated features | 2-4 weeks |
| Deploy | Production deployment of remediated and new features | 1-2 weeks |

---

## Entry Point Selection Guide

Use this quick-reference to determine the correct entry point based on the client's situation:

| Signal | Entry Point |
|---|---|
| "We're implementing Salesforce for the first time" | Discovery / Greenfield |
| "We're adding a new Cloud to our existing org" | Discovery / Greenfield |
| "We have requirements and need someone to build it" | Build Phase |
| "Our previous developer left and we need to continue the project" | Build Phase or Rescue (depending on state) |
| "We need ongoing support for our Salesforce org" | Managed Services |
| "We need someone to handle tickets and small enhancements" | Managed Services |
| "Our implementation is failing / our vendor was fired" | Rescue / Takeover |
| "We have a lot of technical debt and need help cleaning up" | Rescue / Takeover |
| "We're not sure what state our org is in" | Rescue / Takeover (start with assessment) |

# Interview Adaptations Reference

This file defines how the sf-project-init interview depth changes based on the **entry point** and **product selection**. Read this during Phase 1 of the interview to determine which questions to ask, skip, or modify.

---

## Entry Point × Interview Round Matrix

| Round | Greenfield | Build Phase | Managed Services | Rescue |
|---|---|---|---|---|
| 1 — Engagement Context | Full | Full | Full | Full |
| 2 — Org & Environment | Full | Full | Lighter (current state only) | Full + audit focus |
| 3 — Products & Scope | Full | Full | Current products only | Full + what's broken per product |
| 4 — Entry-Point Deep Dive | Discovery questions | Requirements review | SLA & ticket process | Audit & severity |
| 5 — Deliverables & Docs | All deliverables | Skip BRD (exists) | Lighter set | Assessment-focused |
| 6 — Dev Standards & CI/CD | Full | Full | Deploy pipeline only | Full + remediation standards |
| 7 — Security & Compliance | Full | Full | Audit existing | Full + security assessment |
| 8 — Conventions & Preferences | Full | Full | Lighter | Full |

---

## Entry Point Adaptations — Detailed

### Greenfield / Discovery

**Interview depth:** Maximum — all 8 rounds, full question set

**Round 2 adjustments:**
- Ask about org provisioning strategy (new org vs existing)
- Explore scratch org vs sandbox development approach
- Discuss environment count and promotion path

**Round 4 adjustments:**
- Full discovery questions: business processes, pain points, stakeholders, compliance
- Explore current tools and systems being replaced
- Discuss success criteria and KPIs

**Round 5 adjustments:**
- Default all deliverables to "Required" or "Recommended"
- Include BRD, SDD, Data Migration Plan, Test Plan, Architecture Diagrams, Training Materials
- Linear milestones: Discovery, Design, Build, Test, Deploy, Go-Live, Hypercare

**Default deliverables set:**
- BRD: Required
- SDD: Required
- Data Migration Plan: If applicable (ask)
- Test Plan: Required
- Architecture Diagrams: Required
- Training Materials: Required

---

### Build Phase

**Interview depth:** Moderate — skip discovery, focus on technical setup

**Round 2 adjustments:**
- Ask about existing environments (are they set up? what state?)
- Focus on CI/CD readiness
- Check if scratch org definitions exist

**Round 3 adjustments:**
- Products should already be defined — confirm rather than explore
- Focus on: Are there AppExchange packages already installed? Integration endpoints already defined?

**Round 4 adjustments:**
- Ask where requirements documents live (Confluence, SharePoint, Google Docs, etc.)
- Ask about existing design/architecture documentation
- Sprint cadence — is it already established or new?
- Check if a backlog already exists that should be imported

**Round 5 adjustments:**
- Skip BRD creation (should already exist)
- SDD: Required (if not done) or Review (if done)
- Focus deliverables on execution: Test Plan, Sprint-based tracking

**Round 6 adjustments:**
- CI/CD setup is critical — push hard on GitHub Actions
- Ask about existing branching strategy (adopt or replace?)

**Default deliverables set:**
- BRD: Skip (review existing)
- SDD: Required if not done
- Test Plan: Required
- Architecture Diagrams: Required
- Training Materials: Required

---

### Managed Services

**Interview depth:** Lighter — focus on operations, not building

**Round 2 adjustments:**
- Lighter version — focus on current org state, not setup
- Ask: How many orgs? Which are in scope for managed services?
- Ask: Any known technical debt or org health concerns?

**Round 3 adjustments:**
- Current products only — what's already deployed?
- Skip integration design questions — focus on existing integration health
- Skip data migration questions

**Round 4 adjustments:**
- Full managed services deep dive:
  - SLA terms (response time, resolution time, coverage hours)
  - Ticket process (email, portal, Linear, Jira)
  - Change management process (CAB, approval workflows)
  - Escalation path
  - Existing documentation and runbooks

**Round 5 adjustments:**
- Skip most client deliverables
- Focus on: Org Assessment, SLA Documentation, Ticket Process Doc
- Lighter living docs set: BACKLOG.md (ticket tracking), CHANGELOG.md, CODE_ATLAS.md

**Round 6 adjustments:**
- Skip full CI/CD setup discussion
- Focus on deployment pipeline for fixes (how do changes get to production?)
- Code review policy for changes

**Round 7 adjustments:**
- Audit existing security posture rather than designing new
- Focus on: Are there security gaps? Sharing model concerns? Unused admin profiles?

**Round 8 adjustments:**
- Lighter — conventions should already be established
- Focus on: How should Claude communicate about tickets? SLA reminders?

**Default deliverables set:**
- Org Assessment: Required
- SLA Documentation: Required
- Ticket Process Doc: Required

**Linear milestones:** Assessment, Stabilize, Ongoing Support

---

### Rescue / Takeover

**Interview depth:** Maximum, with audit focus

**Round 2 adjustments:**
- Full org exploration — what exists, what state is it in?
- Ask about deployment history — recent changes that may have caused issues?
- Ask about source control — was the previous team using version control?
- Check if SFDX project exists or needs to be set up from scratch

**Round 3 adjustments:**
- All products — but with "what's broken?" lens for each
- Ask per product: What works? What's broken? What's at risk?
- Identify which integrations are failing or fragile

**Round 4 adjustments:**
- Full rescue deep dive:
  - What is broken or at risk? (specific issues, blockers)
  - Previous vendor/team — is there a handoff? Documentation?
  - Deployment history — recent changes, failed deployments
  - Data integrity — duplicates, broken relationships, stale data
  - Urgency — what must be fixed immediately vs planned remediation?

**Round 5 adjustments:**
- Rescue Assessment: Required
- Remediation Plan: Required
- Architecture Diagrams: Required (current state + target state)
- Skip BRD, Training Materials initially
- Focus deliverables on assessment and remediation

**Round 6 adjustments:**
- Full CI/CD discussion — may need to set up from scratch
- Code standards — may need to establish (or re-establish) after previous team's work
- Test coverage — assess current state, set target for improvement

**Round 7 adjustments:**
- Full security assessment — this is often where problems hide
- Check for: admin profiles in use, missing CRUD/FLS, hardcoded credentials, sharing model gaps

**Default deliverables set:**
- Rescue Assessment: Required
- Remediation Plan: Required
- Architecture Diagrams: Required (current + target)
- Test Plan: Required (post-remediation)
- SDD: After audit (for remediation approach)

**Linear milestones:** Assessment, Remediation, Stabilize, Build, Test, Deploy

---

## Product Selection Adaptations

When specific products are selected, adjust the interview to ask product-specific questions. Read `references/salesforce-products.md` for the full question set per product.

### High-complexity products (deeper interview)

These products require additional rounds of questions:

| Product | Additional Topics |
|---|---|
| Revenue Cloud / CPQ | Product catalog structure, pricing models, approval chains, contract lifecycle |
| Industries / OmniStudio | Industry vertical, OmniScript complexity, DataRaptor mappings, FlexCard designs |
| MuleSoft | Integration landscape, API strategy, on-prem vs cloud, error handling, monitoring |
| Data Cloud | Data sources, identity resolution, calculated insights, activation targets |

### Standard-complexity products (standard interview)

| Product | Key Focus Areas |
|---|---|
| Sales Cloud | Opportunity stages, lead management, forecasting |
| Service Cloud | Case management, entitlements, omni-channel |
| Experience Cloud | Portal type, authentication, branding |

### External products (lighter interview)

| Product | Key Focus Areas |
|---|---|
| Marketing Cloud | MC Connect sync, journey complexity, email volume |
| Tableau | Data sources, embedded vs standalone, refresh frequency |

---

## Multi-Product Adjustments

When 3+ products are selected:
- Group related questions to avoid repetition
- Ask about cross-cloud integration points
- Explore shared objects and data model implications
- Discuss license implications

When 5+ products are selected:
- Consider phased implementation approach
- Recommend prioritizing 2-3 products for initial build
- Create phase plan showing product rollout sequence
- Discuss MVP vs full scope for each product

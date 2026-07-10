# Solution Plan Template

Use this template when presenting a solution plan to the user after the pre-implementation checklist passes.

---

## Solution Plan: [Feature/Requirement Name]

**Requirement:** [ticket/task/doc reference in the project's own tracking system, or "verbal" if none]
**Date:** [YYYY-MM-DD]
**API Version:** [current version verified this session per doc-sources.md]
**Status:** PROPOSED

---

### 1. Summary

[2-3 sentence description of what this solution does and why.]

### 2. System Areas Affected

| Area | Impact | Details |
|---|---|---|
| Objects & Fields | New / Modified / None | [List objects and fields] |
| Automation | New / Modified / None | [Triggers, flows, scheduled jobs] |
| UI Components | New / Modified / None | [LWC, page layouts, record pages] |
| Integrations | New / Modified / None | [APIs, callouts, middleware] |
| Security | New / Modified / None | [Permission sets, sharing, FLS] |
| Reporting | New / Modified / None | [Reports, dashboards] |

### 3. Components

| # | Type | Name | Purpose | Pattern | New/Modify | Declarative Design Status |
|---|---|---|---|---|---|---|
| 1 | [Apex Class / Flow / LWC / etc.] | [API Name] | [What it does] | [Pattern used] | [New / Modify] | [Designed / N/A] |
| 2 | | | | | | |

Declarative components must show "Designed" before implementation begins. Non-declarative components (Apex, LWC) show "N/A".

### 3.5 Declarative Component Designs

For each declarative component listed in Section 3, provide the design spec below.
Use the Layer 2 template from `references/metadata/{type}.md`.

#### {Component Name}

| Attribute | Value |
|---|---|
| Type | [Flow type / Validation Rule / Permission Set / etc.] |
| Object | [Target object] |
| [Type-specific attributes] | [Values] |

**Element Walkthrough:** (for Flows and Approval Processes)
1. [Element 1]
2. [Element 2]
...

**Security Notes:**
- [CRUD/FLS / sharing / run mode considerations]

### 4. Data Model Changes

| Object | Field/Relationship | Type | Required | Description | Data Classification |
|---|---|---|---|---|---|
| [Object API Name] | [Field API Name] | [Text/Number/Lookup/etc.] | [Yes/No] | [Purpose] | [Public/Internal/Confidential/Restricted] |

*If no data model changes: "No data model changes required."*

### 5. Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| [e.g., Flow vs. Apex] | [e.g., Apex] | [e.g., Complex branching logic exceeds Flow capabilities] |
| [e.g., Sync vs. Async] | [e.g., Queueable] | [e.g., Callout required, cannot run in trigger context] |

### 6. Well-Architected Assessment

One-line assessment per pillar. Flag any pillar the design compromises and why the trade-off is acceptable.

| Pillar | Assessment |
|---|---|
| Trusted (secure, compliant, reliable) | [How the design enforces security, classifies data, handles faults] |
| Easy (intentional, automated, maintainable) | [Why this is the simplest approach that meets the requirement; what admins can maintain without a developer] |
| Adaptable (resilient, composable) | [Bulk safety, reuse, what happens when volumes or requirements grow] |

### 7. Governor Limit Assessment

| Limit | Current Usage | This Feature Adds | Headroom |
|---|---|---|---|
| SOQL Queries (100) | [Estimate] | [+N queries] | [Sufficient / Tight / Risk] |
| DML Statements (150) | [Estimate] | [+N DML ops] | [Sufficient / Tight / Risk] |
| CPU Time (10,000ms) | [Estimate] | [+N ms estimated] | [Sufficient / Tight / Risk] |
| Heap Size (6MB/12MB) | [Estimate] | [+N KB estimated] | [Sufficient / Tight / Risk] |
| Callouts (100) | [Estimate] | [+N callouts] | [Sufficient / Tight / Risk] |

### 8. Security Considerations

- **CRUD/FLS:** [How enforced: user-mode SOQL/DML, WITH SECURITY_ENFORCED, stripInaccessible(), or a combination]
- **Sharing:** [with sharing / without sharing with justification]
- **Permission Sets:** [New permission sets needed, what they grant, how they deploy per project rules]
- **Data Classification:** [New fields and their classification levels]

### 9. Test Plan

| # | Scenario | Type | Expected Result |
|---|---|---|---|
| 1 | [e.g., Single record insert] | Positive | [Expected behavior] |
| 2 | [e.g., Bulk insert 200 records] | Bulk | [Expected behavior] |
| 3 | [e.g., User without permission] | Negative | [Expected error message] |
| 4 | [e.g., Null required field] | Boundary | [Expected validation error] |

**Target Coverage:** 85%+

### 10. Sources Verified

Every platform-capability claim in this plan cites an official source fetched this session (per `references/doc-sources.md`).

| Claim | Source URL |
|---|---|
| [e.g., Record-triggered flow can call a subflow] | [URL] |
| [Current API version confirmed] | [atlas TOC feed URL] |

### 11. Alternatives Considered

#### Option A: [Recommended Approach Name]
- **Pros:** [List]
- **Cons:** [List]
- **Why recommended:** [Rationale]

#### Option B: [Alternative Approach Name]
- **Pros:** [List]
- **Cons:** [List]
- **Why not recommended:** [Trade-off explanation]

#### Option C: [Simpler/More Capable Alternative] *(optional)*
- **Pros:** [List]
- **Cons:** [List]
- **When to consider:** [Under what conditions this becomes the better choice]

### 12. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| [e.g., Data volume exceeds estimate] | [Low/Med/High] | [Low/Med/High] | [e.g., Design for batch processing from the start] |

### 13. Implementation Sequence

1. [First step, e.g., Create custom objects and fields]
2. [Second step, e.g., Build service layer class]
3. [Third step, e.g., Create trigger and handler]
4. [Fourth step, e.g., Build LWC component]
5. [Fifth step, e.g., Write test classes]
6. [Sixth step, e.g., Record the outcome per project rules]

### 14. Where This Gets Recorded

List the destinations the current project's CLAUDE.md and rules declare for design output. Do not assume a folder structure; discover it per Phase 2 of the skill. Typical destinations:

- [ ] [Decision log / decisions register: the decision and rationale]
- [ ] [Ticket or work item: link the plan, update status]
- [ ] [Component inventory / tracker: rows for each component, if the project keeps one]
- [ ] [Deployment checklist: operational steps the deploy itself will not perform, if the project keeps one]

*If the project declares no destinations, ask the user where this plan should live before implementation.*

---

**Awaiting approval to proceed with implementation (hand off to sf-develop).**

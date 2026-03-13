# Solution Plan Template

Use this template when presenting a solution plan to the user after the pre-implementation gate passes.

---

## Solution Plan: [Feature/Requirement Name]

**Requirement:** [REQ-XXX or BL-XXX]
**Date:** [YYYY-MM-DD]
**Status:** PROPOSED

---

### 1. Summary

[2-3 sentence description of what this solution does and why.]

### 2. System Areas Affected

| Area | Impact | Details |
|---|---|---|
| Objects & Fields | New / Modified / None | [List objects and fields] |
| Automation | New / Modified / None | [Triggers, flows, scheduled jobs] |
| UI Components | New / Modified / None | [LWC, page layouts, FlexCards] |
| Integrations | New / Modified / None | [APIs, callouts, middleware] |
| Security | New / Modified / None | [Permission sets, sharing, FLS] |
| Reporting | New / Modified / None | [Reports, dashboards] |

### 3. Components

| # | Type | Name | Purpose | Pattern | New/Modify |
|---|---|---|---|---|---|
| 1 | [Apex Class / Flow / LWC / etc.] | [API Name] | [What it does] | [Pattern used] | [New / Modify] |
| 2 | | | | | |

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

### 6. Governor Limit Assessment

| Limit | Current Usage | This Feature Adds | Headroom |
|---|---|---|---|
| SOQL Queries (100) | [Estimate] | [+N queries] | [Sufficient / Tight / Risk] |
| DML Statements (150) | [Estimate] | [+N DML ops] | [Sufficient / Tight / Risk] |
| CPU Time (10,000ms) | [Estimate] | [+N ms estimated] | [Sufficient / Tight / Risk] |
| Heap Size (6MB/12MB) | [Estimate] | [+N KB estimated] | [Sufficient / Tight / Risk] |
| Callouts (100) | [Estimate] | [+N callouts] | [Sufficient / Tight / Risk] |

### 7. Security Considerations

- **CRUD/FLS:** [How enforced — WITH SECURITY_ENFORCED, stripInaccessible(), or both]
- **Sharing:** [with sharing / without sharing with justification]
- **Permission Sets:** [New permission sets needed, what they grant]
- **Data Classification:** [New fields and their classification levels]

### 8. Test Plan

| # | Scenario | Type | Expected Result |
|---|---|---|---|
| 1 | [e.g., Single record insert] | Positive | [Expected behavior] |
| 2 | [e.g., Bulk insert 200 records] | Bulk | [Expected behavior] |
| 3 | [e.g., User without permission] | Negative | [Expected error message] |
| 4 | [e.g., Null required field] | Boundary | [Expected validation error] |

**Target Coverage:** 85%+

### 9. Alternatives Considered

#### Option A: [Recommended Approach Name]
- **Pros:** [List]
- **Cons:** [List]
- **Why recommended:** [Rationale]

#### Option B: [Alternative Approach Name]
- **Pros:** [List]
- **Cons:** [List]
- **Why not recommended:** [Trade-off explanation]

#### Option C: [Simpler/More Robust Alternative] *(optional)*
- **Pros:** [List]
- **Cons:** [List]
- **When to consider:** [Under what conditions this becomes the better choice]

### 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| [e.g., Data volume exceeds estimate] | [Low/Med/High] | [Low/Med/High] | [e.g., Design for batch processing from the start] |

### 11. Implementation Sequence

1. [First step — e.g., Create custom objects and fields]
2. [Second step — e.g., Build service layer class]
3. [Third step — e.g., Create trigger and handler]
4. [Fourth step — e.g., Build LWC component]
5. [Fifth step — e.g., Write test classes]
6. [Sixth step — e.g., Update component registry and living docs]

### 12. Documents to Update

- [ ] `docs/DATA_MODEL.md` — [What to add/change]
- [ ] `docs/COMPONENT_REGISTRY.md` — [New components to register]
- [ ] `docs/TECHNICAL_SPEC.md` — [Architecture updates]
- [ ] `docs/REQUIREMENTS.md` — [Requirement status update]
- [ ] `docs/DECISIONS.md` — [New ADR if applicable]
- [ ] `wiki/applications/{app}/` — [Wiki pages to update]

---

**Awaiting approval to proceed with implementation.**

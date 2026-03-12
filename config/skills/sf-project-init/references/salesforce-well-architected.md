# Salesforce Well-Architected Reference

This reference distills the Salesforce Well-Architected framework into actionable rules, patterns, and guardrails for use during project initialization and ongoing development.

---

## Three Pillars

### Trusted — Security, Reliability, Compliance

1. **Enforce CRUD/FLS on every query and DML operation.** Use `WITH SECURITY_ENFORCED` in SOQL, `Security.stripInaccessible()` before DML, or `Schema.SObjectType.Account.fields.Name.isAccessible()` checks. Never assume the running user has access.
2. **Default to `with sharing`.** All Apex classes should use `with sharing` unless there is a documented, reviewed reason to bypass sharing rules. Use `without sharing` only in service classes that explicitly need system-level access (e.g., background data cleanup). Use `inherited sharing` for utility classes that should respect the caller's context.
3. **Never store secrets in custom settings or custom metadata.** Use Named Credentials for external service authentication. Store API keys in Protected Custom Metadata or Named Credentials — never in code, custom settings, or custom labels.
4. **Classify data sensitivity early.** Tag fields as Confidential, Internal, or Public during data model design. Apply Platform Encryption (Shield) to fields classified as Confidential. This drives field-level security, sharing rules, and audit requirements.
5. **Enforce platform encryption for PII and regulated data.** Enable Shield Platform Encryption for fields containing SSN, financial data, health records, or other regulated information. Use deterministic encryption when filtering/grouping is required; probabilistic for maximum security.
6. **Implement audit trails for compliance-sensitive objects.** Enable Field Audit Trail for objects subject to regulatory requirements. Use platform events to publish audit records to external systems when long-term retention is needed.
7. **Apply the principle of least privilege.** Use Permission Sets and Permission Set Groups instead of Profiles for granting access. Profiles should define only the baseline — login hours, IP ranges, page layout assignments. All feature access goes through Permission Sets.
8. **Validate all external input.** Apex controllers and LWC handlers must validate and sanitize input before SOQL, DML, or callout operations. Use `String.escapeSingleQuotes()` for dynamic SOQL (but prefer bind variables). Never construct SOQL by concatenating user input.

### Easy — User Experience, Maintainability, Simplicity

1. **Prefer declarative over code.** Use Flows, validation rules, formula fields, and platform features before writing Apex or LWC. Code should only exist when declarative tools genuinely cannot meet the requirement. Document why code was chosen over a declarative approach.
2. **Follow SLDS for all custom UI.** Every custom Lightning component must use Salesforce Lightning Design System (SLDS) tokens, components, and patterns. Never use inline styles or custom CSS that contradicts SLDS. This ensures visual consistency and theme compatibility.
3. **Meet WCAG 2.1 AA accessibility standards.** All custom components must include ARIA labels, support keyboard navigation, maintain color contrast ratios, and work with screen readers. Use the `lightning-*` base components which have accessibility built in.
4. **Keep naming conventions consistent.** Use `PascalCase` for classes and LWC components, `camelCase` for methods and variables, `UPPER_SNAKE_CASE` for constants. Prefix custom objects/fields with a project-specific namespace when in a managed package context.
5. **Write self-documenting code with strategic comments.** Method names and variable names should convey intent. Add comments only to explain *why*, not *what*. Every public method in a service or utility class should have an ApexDoc header.
6. **Design for admin maintainability.** Use Custom Metadata Types and Custom Labels for values that admins may need to change. Avoid hardcoding thresholds, messages, or feature flags in Apex.
7. **Consolidate automation per object.** One trigger per object. One primary Flow per object per event (or use a Flow orchestration pattern). Avoid layering triggers + workflow rules + flows + process builders on the same object — it creates unpredictable execution order.

### Adaptable — Scalability, Extensibility, Future-Proofing

1. **Design for bulk from day one.** Every trigger, flow, and batch process must handle 200+ records per transaction. Never assume single-record execution. Test with 200-record inserts in every unit test.
2. **Respect governor limits by design, not by accident.** Query and DML operations belong in service/data-access classes, not in loops. Use collections (Maps, Sets, Lists) to batch operations. Design data access patterns before writing code.
3. **Build modular, layered architecture.** Separate concerns: Trigger Handler → Service Layer → Selector/Data Access Layer → Domain Layer. Each layer has a single responsibility and can be tested independently.
4. **Use Custom Metadata Types for configuration.** Feature flags, integration endpoints, thresholds, and business rules that may change should live in Custom Metadata Types — deployable, packageable, and environment-aware.
5. **Design APIs and integrations for versioning.** External-facing APIs should include version identifiers. Integration classes should use adapter/strategy patterns so swapping an integration partner doesn't require rewriting business logic.
6. **Plan for large data volumes (LDV).** Add indexes (external IDs, indexed custom fields) to fields used in WHERE clauses and relationship lookups. Use skinny tables and archive strategies for objects expected to exceed 1M records. Avoid non-selective queries.
7. **Use async processing for heavy workloads.** Queueable Apex for chained operations, Batch Apex for large data processing, Platform Events for decoupled async workflows, Scheduled Apex for recurring jobs. Keep synchronous transactions lean.
8. **Externalize configuration from code.** Endpoints, credentials, retry counts, batch sizes, and feature toggles should all be configurable without a code deployment. Named Credentials for endpoints, Custom Metadata for everything else.

---

## Governor Limits Quick Reference

| Limit Name | Synchronous | Asynchronous | Avoidance Pattern |
|---|---|---|---|
| Total SOQL queries | 100 | 200 | Consolidate queries in selector classes; never query in loops |
| Total records retrieved by SOQL | 50,000 | 50,000 | Use selective filters, LIMIT clauses, and pagination (OFFSET or query locators) |
| Total DML statements | 150 | 150 | Collect records in lists, perform bulk DML outside loops |
| Total DML rows | 10,000 | 10,000 | Batch large operations using Batch Apex; chunk inserts |
| CPU time | 10,000 ms | 60,000 ms | Optimize loops, avoid nested iterations, use Maps for lookups instead of inner loops |
| Heap size | 6 MB | 12 MB | Avoid loading large collections into memory; use `for` loop SOQL (query cursor); process in batches |
| Callouts (HTTP/Web Service) | 100 | 100 | Batch external calls; use Queueable chaining for many callouts |
| Callout timeout (single) | 120,000 ms | 120,000 ms | Set reasonable timeouts; implement retry with exponential backoff |
| Future method invocations | 50 | 50 | Prefer Queueable Apex over @future; consolidate async work |
| Queueable jobs (enqueued) | 50 | 50 | Chain queueable jobs (one enqueue per execution); use Batch for high volume |
| Batch Apex executions (queued/active) | 5 active | 5 active | Monitor active batches; design batch jobs to complete quickly |
| Batch start scope size | 2,000 (default) | 2,000 (default) | Tune scope size based on per-record processing cost; lower scope for callout batches |
| SOSL queries | 20 | 20 | Cache results; combine search terms into single SOSL query |
| Email invocations (single) | 10 | 10 | Use Messaging.sendEmail() with lists; batch email sends via Marketing Cloud for volume |
| Send email total recipients | 5,000/day | 5,000/day | Offload mass email to Marketing Cloud or email service |
| Push notification invocations | 10 | 10 | Batch notifications where possible |
| Event publish (platform events) | 150 | 150 | Batch publish using `EventBus.publish(List<SObject>)` |
| Maximum transaction time | 10 min (batch execute) | 10 min | Break long operations into smaller batches; monitor execution time |
| Describe calls | 100 | 100 | Cache describe results in static variables; call once per object type |
| Total allowed SOQL query run time | 120,000 ms | 120,000 ms | Optimize queries with selective indexes; avoid full table scans |

---

## Anti-Patterns Catalog

| Anti-Pattern | Why It's Bad | Correct Pattern |
|---|---|---|
| **SOQL in loops** | Hits the 100-query governor limit on bulk operations. A trigger processing 200 records fires 200 queries. | Collect IDs/criteria, execute a single query before the loop, store results in a Map for O(1) lookup. |
| **DML in loops** | Hits the 150-DML governor limit. 200 records = 200 separate inserts. | Collect records in a List, perform a single `insert`/`update`/`delete` after the loop. |
| **Non-bulkified triggers** | Trigger processes `Trigger.new[0]` only — fails silently for records 2–200 in a bulk operation (data loader, batch). | Always iterate over `Trigger.new` / `Trigger.old`. Design handlers to process the full list. |
| **Hardcoded IDs** | Record IDs differ across sandboxes and production. Code breaks on deployment or sandbox refresh. | Query by Name/DeveloperName, use Custom Metadata Types, or use Custom Labels for org-specific values. |
| **Missing CRUD/FLS checks** | Security vulnerability — users can read/write data they shouldn't access. Fails AppExchange security review. | Use `WITH SECURITY_ENFORCED`, `Security.stripInaccessible()`, or describe checks before every query and DML. |
| **SELECT * equivalent (querying all fields)** | Wastes heap, increases query time, may expose sensitive fields, breaks when fields are added. | Query only the fields you need. Maintain field lists in Selector classes. |
| **Trigger logic in trigger file** | Untestable — you cannot instantiate a trigger in a test. Makes trigger order-of-execution debugging impossible. | Trigger delegates to a Handler class. Trigger file contains only the handler invocation. |
| **No test assertions** | Tests execute code but prove nothing. Coverage without assertions masks bugs and regressions. | Every test method must include `System.assert*` statements validating expected outcomes — positive, negative, and bulk. |
| **Insufficient test coverage strategy** | Writing tests to hit 75% instead of testing behavior. Coverage without intent is a false safety net. | Test business logic, edge cases, bulk scenarios, negative cases, and permission variations. Aim for 90%+. |
| **Hardcoded URLs/endpoints** | URLs change between environments and vendors. Code deployments required for URL changes. | Use Named Credentials for auth + endpoint. Use Custom Metadata for other configurable URLs. |
| **Missing null checks** | `NullPointerException` is the most common Apex runtime error. Relationship fields and query results can be null. | Check for null before accessing properties. Use safe navigation operator (`?.`) in Apex. Validate query results before accessing `[0]`. |
| **Over-reliance on Workflow Rules** | Workflow Rules are legacy, cannot be packaged easily, and Salesforce is retiring them. Mixing WFRs with Flows causes execution order confusion. | Migrate to Record-Triggered Flows. Use Before-Save Flows for field updates (no DML cost). |
| **Not using Custom Metadata for config** | Hardcoded values require code deployments to change. Custom Settings aren't packageable or deployable via metadata API in all contexts. | Use Custom Metadata Types — deployable, packageable, queryable in SOQL without counting against limits (in some contexts). |
| **Synchronous processing for large data volumes** | Long-running synchronous transactions hit CPU time limits, lock records, and degrade user experience. | Use Batch Apex for processing >10K records, Queueable for chained operations, Platform Events for decoupled async work. |
| **Missing error handling in integrations** | Silent failures lose data. Unhandled exceptions crash transactions and provide no diagnostic information. | Wrap callouts in try-catch. Log failures to a custom object or Platform Event. Implement retry logic with exponential backoff. Notify admins of persistent failures. |

---

## Canonical Trigger Handler Pattern

```
// ─── TRIGGER FILE: AccountTrigger.trigger ───
// Rule: One trigger per object. No logic here — delegate everything.
trigger AccountTrigger on Account (
    before insert, before update, before delete,
    after insert, after update, after delete, after undelete
) {
    AccountTriggerHandler handler = new AccountTriggerHandler();
    handler.run();
}

// ─── HANDLER CLASS: AccountTriggerHandler.cls ───
// Implements all trigger contexts. Contains routing logic only.
// Business logic lives in Service classes called from here.
public with sharing class AccountTriggerHandler extends TriggerHandler {

    // Static flag to prevent recursive trigger execution.
    // Set to true before re-entrant DML, check at entry.
    private static Boolean isExecuting = false;

    public override void beforeInsert() {
        if (isExecuting) return; // Recursion guard
        isExecuting = true;
        AccountService.setDefaults(Trigger.new);
        AccountService.validateRequiredFields(Trigger.new);
        isExecuting = false;
    }

    public override void beforeUpdate() {
        if (isExecuting) return;
        isExecuting = true;
        AccountService.validateRequiredFields(Trigger.new);
        AccountService.enforceBusinessRules(Trigger.new, Trigger.oldMap);
        isExecuting = false;
    }

    public override void afterInsert() {
        if (isExecuting) return;
        isExecuting = true;
        AccountService.createRelatedRecords(Trigger.new);
        AccountService.publishAccountEvents(Trigger.new);
        isExecuting = false;
    }

    public override void afterUpdate() {
        if (isExecuting) return;
        isExecuting = true;
        AccountService.syncChangesToExternalSystem(Trigger.new, Trigger.oldMap);
        isExecuting = false;
    }

    public override void beforeDelete() {
        AccountService.preventDeletionOfActiveAccounts(Trigger.old);
    }

    public override void afterDelete() {
        AccountService.cleanupOrphanedRecords(Trigger.old);
    }

    public override void afterUndelete() {
        AccountService.restoreRelatedRecords(Trigger.new);
    }
}

// ─── BASE CLASS: TriggerHandler.cls ───
// Reusable base. Each object's handler extends this.
public abstract class TriggerHandler {

    public void run() {
        switch on Trigger.operationType {
            when BEFORE_INSERT  { beforeInsert(); }
            when BEFORE_UPDATE  { beforeUpdate(); }
            when BEFORE_DELETE  { beforeDelete(); }
            when AFTER_INSERT   { afterInsert(); }
            when AFTER_UPDATE   { afterUpdate(); }
            when AFTER_DELETE   { afterDelete(); }
            when AFTER_UNDELETE { afterUndelete(); }
        }
    }

    // Default implementations — override only what you need.
    protected virtual void beforeInsert()  {}
    protected virtual void beforeUpdate()  {}
    protected virtual void beforeDelete()  {}
    protected virtual void afterInsert()   {}
    protected virtual void afterUpdate()   {}
    protected virtual void afterDelete()   {}
    protected virtual void afterUndelete() {}
}
```

**Key principles:**
- One trigger per object — no exceptions.
- Trigger file contains zero logic — only handler instantiation and `run()`.
- Handler routes to Service class methods that contain actual business logic.
- Static boolean recursion guard prevents infinite loops when handler DML re-fires the trigger.
- Base class provides default no-op implementations so handlers only override what they need.
- All classes use `with sharing` by default.

---

## Security Model Reference

### CRUD/FLS Enforcement

| Technique | Use Case | Example |
|---|---|---|
| `WITH SECURITY_ENFORCED` | SOQL queries — enforces field and object read access | `SELECT Name FROM Account WITH SECURITY_ENFORCED` |
| `Security.stripInaccessible()` | DML operations — strips fields the user cannot access | `SObjectAccessDecision decision = Security.stripInaccessible(AccessType.CREATABLE, records);` |
| `Schema.SObjectType.Account.isAccessible()` | Manual object-level check before query | Check before executing query; throw `AuraHandledException` if denied |
| `Schema.SObjectType.Account.fields.Name.isAccessible()` | Manual field-level check | Use when you need granular control or custom error messages |
| `Schema.SObjectType.Account.isCreateable()` | Check create permission before insert | Essential in Apex controllers exposed to LWC/Aura |

### Sharing Keywords

| Keyword | Behavior | When to Use |
|---|---|---|
| `with sharing` | Enforces the running user's sharing rules (record-level access) | **Default for all classes.** Use unless you have a documented reason not to. |
| `without sharing` | Ignores sharing rules — full data access | System-level operations: batch cleanup, integration services, platform event handlers where the running user context doesn't apply. Must be reviewed and documented. |
| `inherited sharing` | Uses the sharing context of the calling class | Utility classes and service methods called from multiple contexts. Avoids accidentally escalating or restricting access. |

### Permission Model Recommendations

- **Profiles**: Use only for page layout assignment, login hours, IP restrictions, and system-level defaults. Keep profiles minimal.
- **Permission Sets**: Grant all feature-level access — object CRUD, field access, Apex class access, tab visibility, system permissions.
- **Permission Set Groups**: Bundle Permission Sets by role or feature. Assign groups to users, not individual Permission Sets.
- **Muting Permission Sets**: Use within Permission Set Groups to revoke specific permissions from the bundle without editing the base Permission Set.

---

## LWC Best Practices

### Data Access

- **Wire Service** — Use `@wire` for reactive data binding. Data refreshes automatically when parameters change. Preferred for read operations.
- **Imperative Apex** — Use `import method from '@salesforce/apex/Controller.method'` and call imperatively when you need control over timing (e.g., button clicks, conditional calls). Required for DML operations.
- **Lightning Data Service (LDS)** — Use `lightning-record-form`, `lightning-record-view-form`, and `lightning-record-edit-form` for standard CRUD. Provides caching, no Apex needed, and automatic FLS enforcement.

### Component Design

- Keep components small and composable — one responsibility per component.
- Use `@api` properties for parent-to-child communication.
- Use Custom Events for child-to-parent communication.
- Use Lightning Message Service (LMS) for cross-DOM communication between unrelated components.
- Use `@wire` with `refreshApex()` to re-fetch data after mutations.

### SLDS Compliance

- Use `slds-*` CSS classes exclusively — no custom CSS that redefines SLDS behavior.
- Use SLDS design tokens via CSS custom properties for colors, spacing, and typography.
- Use `lightning-*` base components before building custom markup.

### Accessibility

- Every interactive element must have an accessible label (`aria-label`, `aria-labelledby`, or `<label>`).
- Support keyboard navigation — all actions reachable via Tab/Enter/Escape.
- Maintain 4.5:1 contrast ratio for text.
- Use `role` attributes appropriately for custom interactive elements.
- Test with screen readers (NVDA, JAWS, or VoiceOver).

### Performance

- Lazy-load child components using `if:true` / `lwc:if` — don't render what isn't visible.
- Cache Apex results client-side when data doesn't change frequently (`cacheable=true` on `@AuraEnabled` methods).
- Avoid deep component nesting — each level adds rendering overhead.
- Use `lightning-datatable` for large record sets instead of template iteration.

### Error Handling

- Wrap imperative Apex calls in try-catch; display errors using `lightning-card` or toast notifications.
- Handle wire errors via the `error` property in wire results.
- Never swallow errors silently — always inform the user or log diagnostically.

---

## Integration Pattern Guidance

| Pattern | When to Use | Key Considerations |
|---|---|---|
| **Platform Events** | Async, decoupled pub/sub within Salesforce or with external subscribers. Near-real-time. | Fire-and-forget semantics. Subscribers process independently. Use for audit logging, cross-org sync, or decoupling trigger chains. Retry via `ReplayId`. |
| **Change Data Capture (CDC)** | Track and react to record changes (create/update/delete/undelete) without triggers. | External systems subscribe to change events. Lower overhead than polling. Captures field-level changes. Subject to event delivery limits. |
| **REST API** | Synchronous, request-response integrations initiated by external systems calling Salesforce, or Salesforce calling out. | Use Named Credentials for auth. Respect callout limits (100/txn). Implement retry and timeout handling. Use custom Apex REST endpoints (`@RestResource`) for complex logic. |
| **Bulk API** | Large data volume operations — initial loads, nightly syncs, mass updates exceeding 10K records. | Use Bulk API 2.0 for simplified job management. Asynchronous processing. Monitor job status via polling or callbacks. Design for partial failure handling. |
| **Streaming API** | Real-time push notifications to external clients when Salesforce data changes. | Use PushTopic or Generic Streaming for custom notifications. Higher overhead than CDC — prefer CDC for record change use cases. Use for dashboards and live UIs. |
| **MuleSoft** | Enterprise integration layer — when multiple systems need to communicate through a managed API layer. | API-led connectivity: System APIs (data access), Process APIs (orchestration), Experience APIs (consumers). Provides monitoring, throttling, and transformation. |
| **Outbound Messages** | Simple, legacy notification when a record meets workflow criteria. | Limited to sending SOAP messages with field values. No transformation logic. Being replaced by Platform Events and Flows with HTTP callouts. Use only for simple integrations with systems expecting SOAP. |
| **Heroku Connect** | Bidirectional data sync between Salesforce and Heroku Postgres. | Near-real-time sync without API calls counting against limits. Ideal for high-volume read/write applications built on Heroku that need Salesforce data. |
| **Salesforce Connect (External Objects)** | Real-time access to external data without copying it into Salesforce. | Uses OData or custom adapters. Data stays in the external system. Good for large datasets you don't want to replicate. Limited query capabilities compared to native objects. |
| **Composite API** | Multiple related API operations in a single round trip. | Reduces HTTP overhead. Supports all-or-none transactions. Up to 25 subrequests per call. Use for complex record creation requiring parent-child relationships. |

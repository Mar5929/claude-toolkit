# Salesforce Architectural Patterns Reference

Standard patterns for Salesforce development. Use these when designing solutions in the sf-architect-solutioning skill.

---

## Trigger Handler Dispatch Pattern

**When to use:** Every Apex trigger, no exceptions.

**Structure:**
- One trigger per object (e.g., `AccountTrigger`)
- Trigger delegates to a handler class (e.g., `AccountTriggerHandler`)
- Handler class implements `TriggerHandler` interface or extends base class
- Handler has methods for each trigger event: `beforeInsert()`, `afterInsert()`, `beforeUpdate()`, `afterUpdate()`, `beforeDelete()`, `afterDelete()`, `afterUndelete()`
- Trigger contains no logic — only dispatches to handler

**Example:**
```apex
// AccountTrigger.trigger
trigger AccountTrigger on Account (before insert, before update, after insert, after update) {
    AccountTriggerHandler handler = new AccountTriggerHandler();
    handler.run();
}

// AccountTriggerHandler.cls
public class AccountTriggerHandler extends TriggerHandler {
    public override void beforeInsert() {
        AccountService.validateAccounts((List<Account>) Trigger.new);
    }

    public override void afterUpdate() {
        AccountService.processAccountChanges(
            (List<Account>) Trigger.new,
            (Map<Id, Account>) Trigger.oldMap
        );
    }
}
```

**Key rules:**
- Never put business logic in the trigger or handler — delegate to service classes
- Handler methods receive trigger context variables and pass to services
- Use a base `TriggerHandler` class for consistent behavior (recursion prevention, enable/disable)

---

## Service Layer Pattern

**When to use:** All business logic that is called from more than one entry point (triggers, LWC, flows, APIs, batch jobs).

**Structure:**
- Static methods on service classes (e.g., `AccountService.createAccounts(List<Account>)`)
- Service classes contain business logic, orchestrate data access via selectors, and perform DML
- Service methods accept bulkified parameters (`List<SObject>`, `Set<Id>`, `Map<Id, SObject>`)
- Service methods enforce business rules and throw custom exceptions

**Naming convention:** `{Object}Service.cls` or `{Domain}Service.cls`

**Key rules:**
- Services are the single entry point for business logic
- Services call selectors for data retrieval, never inline SOQL
- Services handle bulk operations by default
- Services can call other services for cross-object orchestration

---

## Selector Pattern

**When to use:** All SOQL queries that are used in more than one place.

**Structure:**
- One selector class per object (e.g., `AccountSelector`)
- Static methods that return queried records
- All queries use `WITH SECURITY_ENFORCED` or `stripInaccessible()`
- Methods are bulkified — accept `Set<Id>` or `Set<String>`, not single values

**Naming convention:** `{Object}Selector.cls`

**Example:**
```apex
public class AccountSelector {
    public static List<Account> selectByIds(Set<Id> accountIds) {
        return [
            SELECT Id, Name, Industry, AnnualRevenue, OwnerId
            FROM Account
            WHERE Id IN :accountIds
            WITH SECURITY_ENFORCED
        ];
    }

    public static List<Account> selectByIndustry(String industry) {
        return [
            SELECT Id, Name, AnnualRevenue
            FROM Account
            WHERE Industry = :industry
            WITH SECURITY_ENFORCED
            ORDER BY AnnualRevenue DESC
        ];
    }
}
```

**Key rules:**
- All SOQL queries go through selectors
- Query only the fields you need (no `SELECT *` equivalent)
- Always include SECURITY_ENFORCED or stripInaccessible
- Return `List<SObject>` — let callers handle empty results

---

## Domain Layer Pattern

**When to use:** Object-specific validation and behavior that is tightly coupled to the object's data.

**Structure:**
- One domain class per object (e.g., `Accounts.cls`)
- Contains validation logic, default value logic, and derived field calculations
- Called from trigger handlers and services
- Operates on collections of records

**Naming convention:** `{ObjectPlural}.cls` (e.g., `Accounts`, `Opportunities`, `Cases`)

**Key rules:**
- Domain classes own validation — if an Account has business rules, they live here
- Domain classes do not perform DML — they validate and transform, services commit
- Domain classes receive and return collections

---

## LWC Composition Pattern

**When to use:** Any LWC that is not trivially simple.

**Structure:**
- **Orchestrator component** — Manages state, makes Apex calls, passes data to children
- **Display components** — Receive data via `@api` properties, emit events for user actions
- **Input components** — Collect user input, validate locally, emit events with structured data
- **Utility components** — Reusable UI elements (modals, toasts, spinners)

**Data flow:**
```
[Orchestrator]
    ├── @wire / imperative Apex → data
    ├── passes data via @api to children
    ├── listens for custom events from children
    └── handles state management

    [Display Child]           [Input Child]
    ├── @api data             ├── @api defaults
    ├── renders UI            ├── collects input
    └── dispatches events     └── dispatches events
```

**Key rules:**
- One Apex call per orchestrator, not per child
- Children never call Apex directly — they request data via events
- Use `@wire` for read operations, imperative calls for write operations
- All components use SLDS classes — no custom CSS that conflicts with SLDS

---

## Flow vs. Code Decision Tree

Use this decision tree to determine whether a requirement should be implemented as a Flow or Apex code.

```
START: Can this be done with configuration?
  ├── YES → Use validation rules, formula fields, roll-up summaries, etc.
  │         (No Flow or Apex needed)
  │
  └── NO → Does this involve user interaction / screen UI?
            ├── YES → Is it a simple form or wizard?
            │         ├── YES → Screen Flow
            │         └── NO → LWC (complex UI, dynamic behavior)
            │
            └── NO → Is it triggered by a record change?
                      ├── YES → Is the logic simple?
                      │         ├── YES → Record-Triggered Flow
                      │         │         (simple field updates, create related records,
                      │         │          send notifications, <5 decision branches)
                      │         └── NO → Apex Trigger + Handler + Service
                      │                  (complex branching, multi-object orchestration,
                      │                   callouts, heavy computation, >200 record processing)
                      │
                      └── NO → Is it scheduled or batch?
                                ├── YES → Can it be done in a Scheduled Flow?
                                │         ├── YES → Scheduled Flow
                                │         └── NO → Apex Batch/Schedulable
                                │                  (complex queries, millions of records,
                                │                   error handling with partial success)
                                │
                                └── Is it invoked from an API or external system?
                                    ├── YES → Apex REST/SOAP or Platform Event
                                    └── NO → Evaluate: Flow Action vs. Apex Invocable
```

**Rules of thumb:**
- **Flow when:** Simple automation, admin-maintainable, <5 decision nodes, no cross-object orchestration
- **Apex when:** Complex logic, bulk processing concerns, callouts, need for fine-grained error handling, reusable across multiple entry points
- **Both when:** Flow for orchestration/simple paths, Apex invocable actions for complex steps within the flow

---

## Integration Patterns

### Request-Reply (Synchronous)

**When to use:** Real-time data needs, user-facing operations, small payloads.

- Named Credentials for authentication
- HttpRequest/HttpResponse in Apex
- Timeout handling (max 120s per callout, 10 callouts in trigger context)
- Error handling with retry logic

### Fire and Forget (Asynchronous)

**When to use:** Non-blocking operations, large payloads, eventual consistency acceptable.

- Platform Events for internal async communication
- Queueable Apex for async callouts
- @future methods for simple async operations (no chaining)
- Outbound Messages for simple record-change notifications

### Batch Integration

**When to use:** Large data volumes, scheduled sync, ETL-style operations.

- Batch Apex implementing `Database.Batchable<SObject>` and `Database.AllowsCallouts`
- Chunk size tuned to avoid callout and heap limits
- Error logging per batch chunk
- Idempotent design (safe to re-run)

### Event-Driven

**When to use:** Loosely coupled systems, multiple subscribers, real-time or near-real-time.

- Platform Events for Salesforce-to-Salesforce or Salesforce-to-external
- Change Data Capture for external systems reacting to Salesforce changes
- Pub/Sub API for high-volume event streaming

---

## Test Patterns

### Test Data Factory

- Centralized test data creation in `TestDataFactory.cls`
- Methods create valid records with all required fields
- Methods accept overrides for specific field values
- Never use `@isTest(SeeAllData=true)` — create all test data

### Bulk Testing

- Always test with 200+ records to verify bulkification
- Test trigger handlers with mixed-scenario batches (some passing, some failing)
- Verify governor limits are within budget after bulk operations

### Permission Testing

- Use `System.runAs()` to test with different user profiles
- Verify CRUD/FLS enforcement blocks unauthorized access
- Test sharing rule behavior with users in different roles

### Mock Callouts

- Implement `HttpCalloutMock` for integration testing
- Test success, failure, and timeout scenarios
- Verify retry logic handles transient failures

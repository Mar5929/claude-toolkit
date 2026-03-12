# Salesforce Naming Conventions Standard

This is the firm's standard naming convention for all Salesforce engagements. Present during Round 8 of the interview for user confirmation or customization.

---

## Custom Objects

| Element | Convention | Example |
|---|---|---|
| API Name | PascalCase + `__c` suffix | `Invoice_Line_Item__c` |
| Label | Title Case, spaces | Invoice Line Item |
| Plural Label | Title Case, spaces | Invoice Line Items |
| Description | Required — one sentence explaining purpose | Represents individual line items on a client invoice |

**Rules:**
- Use underscores between words in API names (Salesforce convention)
- Never use abbreviations unless universally understood (e.g., `ID`, `URL`)
- Junction objects: `Parent1_Parent2__c` (e.g., `Account_Product__c`)

---

## Custom Fields

| Element | Convention | Example |
|---|---|---|
| API Name | PascalCase + `__c` suffix | `Invoice_Amount__c` |
| Label | Title Case, spaces | Invoice Amount |
| Description | Required — explain field purpose and usage | Total amount for this invoice line, calculated from quantity × unit price |
| Help Text | Recommended for user-facing fields | Enter the total amount for this line item |

**Prefixes by type:**
| Field Purpose | Prefix | Example |
|---|---|---|
| Boolean/Checkbox | `Is_` or `Has_` | `Is_Active__c`, `Has_Attachment__c` |
| Date | No prefix, descriptive name | `Start_Date__c`, `Due_Date__c` |
| Currency | No prefix, descriptive name | `Total_Amount__c`, `Discount__c` |
| Percent | No prefix, end with descriptor | `Completion_Percent__c` |
| External ID | `External_` prefix | `External_Id__c`, `External_Account_Id__c` |
| Formula | No prefix, document formula in description | `Full_Name__c` (formula: FirstName + LastName) |
| Rollup Summary | No prefix, `_Count` or `_Sum` suffix | `Line_Item_Count__c`, `Total_Revenue_Sum__c` |

---

## Apex Classes

| Element | Convention | Example |
|---|---|---|
| Handler class | `{Object}TriggerHandler` | `AccountTriggerHandler` |
| Service class | `{Domain}Service` | `InvoiceService` |
| Selector class | `{Object}Selector` | `AccountSelector` |
| Utility class | `{Purpose}Util` or `{Purpose}Helper` | `DateUtil`, `SObjectHelper` |
| Test class | `{ClassName}Test` | `AccountTriggerHandlerTest` |
| Test data factory | `TestDataFactory` | `TestDataFactory` (one per project) |
| Batch class | `{Purpose}Batch` | `AccountCleanupBatch` |
| Queueable class | `{Purpose}Queueable` | `IntegrationSyncQueueable` |
| Schedulable class | `{Purpose}Scheduler` | `NightlyCleanupScheduler` |
| Controller (LWC) | `{ComponentName}Controller` | `InvoiceListController` |
| Exception class | `{Domain}Exception` | `InvoiceException` |
| Interface | `I{Name}` | `IIntegrationService` |
| Wrapper/DTO | `{Purpose}Wrapper` or `{Purpose}DTO` | `InvoiceLineWrapper` |

**Method naming:**
| Method Type | Convention | Example |
|---|---|---|
| Query methods | `get{Records}By{Criteria}` | `getAccountsById`, `getContactsByEmail` |
| DML methods | `insert{Records}`, `update{Records}`, `delete{Records}` | `insertAccounts` |
| Boolean methods | `is{Condition}`, `has{Property}`, `can{Action}` | `isActive`, `hasPermission` |
| Utility methods | verb + noun | `calculateTotal`, `validateAddress`, `formatCurrency` |
| Handler methods | `handle{Event}` | `handleBeforeInsert`, `handleAfterUpdate` |

---

## Apex Triggers

| Element | Convention | Example |
|---|---|---|
| Trigger name | `{Object}Trigger` | `AccountTrigger` |
| One trigger per object | Mandatory — never create multiple triggers on the same object | |

**Trigger body template:**
```apex
trigger AccountTrigger on Account (before insert, before update, after insert, after update, before delete, after delete, after undelete) {
    new AccountTriggerHandler().run();
}
```

---

## Lightning Web Components

| Element | Convention | Example |
|---|---|---|
| Component name | camelCase (no underscores, no hyphens in folder name) | `invoiceLineItem` |
| HTML file | Same as component name + `.html` | `invoiceLineItem.html` |
| JS file | Same as component name + `.js` | `invoiceLineItem.js` |
| CSS file | Same as component name + `.css` | `invoiceLineItem.css` |
| Test file | `__tests__/{componentName}.test.js` | `__tests__/invoiceLineItem.test.js` |

**In markup (HTML):**
- Components referenced with kebab-case: `<c-invoice-line-item>`
- SLDS classes: use standard SLDS class names (e.g., `slds-card`, `slds-grid`)

**JS conventions:**
| Element | Convention | Example |
|---|---|---|
| Public properties | `@api` decorator, camelCase | `@api recordId` |
| Reactive properties | camelCase (no `@track` unless needed) | `invoiceData` |
| Wire methods | `wire{AdapterName}` or descriptive | `wiredAccounts` |
| Event handlers | `handle{EventName}` | `handleRowSelect`, `handleSave` |
| Custom events | kebab-case event names | `this.dispatchEvent(new CustomEvent('row-select'))` |
| Constants | UPPER_SNAKE_CASE | `const MAX_ROWS = 50;` |

---

## Flows

| Element | Convention | Example |
|---|---|---|
| Flow name | `{Object}_{Trigger}_{Purpose}` | `Account_Before_ValidateAddress` |
| Screen Flow | `{Purpose}_Screen_Flow` | `New_Account_Registration_Screen_Flow` |
| Scheduled Flow | `{Purpose}_Scheduled_Flow` | `Nightly_Cleanup_Scheduled_Flow` |
| Subflow | `Sub_{Purpose}` | `Sub_Calculate_Discount` |
| Flow variables | camelCase | `accountRecord`, `selectedProducts` |
| Flow constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |

**Description:** Always include a description explaining the flow's purpose, trigger conditions, and business logic.

---

## Validation Rules

| Element | Convention | Example |
|---|---|---|
| Rule name | `{Object}_{Field}_{Validation}` | `Account_Industry_Required` |
| Error message | Clear, user-friendly language | "Industry is required for Enterprise accounts." |

---

## Permission Sets

| Element | Convention | Example |
|---|---|---|
| API Name | `{App}_{Role}_{Access}` | `Sales_Rep_Standard_Access` |
| Label | Descriptive, Title Case | Sales Rep Standard Access |
| Description | Required — explain what access is granted | Grants standard Sales Rep access: read/edit on Accounts, Contacts, Opportunities |

---

## Permission Set Groups

| Element | Convention | Example |
|---|---|---|
| API Name | `{App}_{Role}_Group` | `Sales_Rep_Group` |
| Label | Descriptive | Sales Rep Permission Group |

---

## Custom Labels

| Element | Convention | Example |
|---|---|---|
| API Name | `{Category}_{Purpose}` | `Error_InvalidEmail`, `Label_SubmitButton` |
| Categories | `Error_`, `Label_`, `Message_`, `Help_`, `Validation_` | |

---

## Custom Metadata Types

| Element | Convention | Example |
|---|---|---|
| API Name | `{Purpose}_Setting__mdt` | `Integration_Setting__mdt` |
| Record names | Descriptive of the configuration | `ERP_Production`, `Payment_Gateway_Sandbox` |

---

## Custom Settings

| Element | Convention | Example |
|---|---|---|
| API Name | `{Purpose}_Settings__c` | `App_Settings__c` |
| Type | Hierarchy (preferred) or List | |

---

## Platform Events

| Element | Convention | Example |
|---|---|---|
| API Name | `{Purpose}__e` | `Order_Processed__e` |
| Fields | `{Descriptor}__c` | `Order_Id__c`, `Status__c` |

---

## Named Credentials

| Element | Convention | Example |
|---|---|---|
| Label | `{System}_{Environment}` | `ERP_Production`, `Payment_Gateway_Sandbox` |
| Name | Same as label, auto-generated | |

---

## Git Branch Naming

| Branch Type | Convention | Example |
|---|---|---|
| Feature | `feature/BL-{id}-{short-description}` | `feature/BL-042-account-validation` |
| Bugfix | `bugfix/BL-{id}-{short-description}` | `bugfix/BL-067-duplicate-trigger-fix` |
| Hotfix | `hotfix/{short-description}` | `hotfix/critical-integration-fix` |
| Release | `release/v{version}` | `release/v1.2` |

---

## Commit Message Format

```
{type}(BL-{id}): {short summary}

- {detail 1}
- {detail 2}
- Updated docs/{doc}.md
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `config`

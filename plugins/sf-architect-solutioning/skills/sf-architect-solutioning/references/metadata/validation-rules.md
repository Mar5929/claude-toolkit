# Validation Rules Configuration Reference

> API version validated against: 62.0

---

## Layer 1: When to Use

### Decision Criteria

- Enforce data integrity at the platform level (before DML commits)
- Cross-field validation (field A requires field B)
- Conditional requirements (if Status = Closed, Reason is required)
- Format enforcement (regex for phone, email patterns when standard field types insufficient)
- Cross-object validation (via relationship fields -- e.g., `Account.Industry` on Contact)

### Anti-Patterns

- Validation rules that duplicate Apex trigger logic (choose one)
- Complex formulas exceeding 5,000 character compiled size -- break into multiple rules
- Validation rules that block automated processes (Flows, integrations) -- use Custom Permissions to bypass
- Hardcoded values instead of Custom Metadata references
- Generic error messages ("Error occurred") -- be specific and user-friendly

### Governor Limit Considerations

- Max 500 validation rules per object
- Formula compiled size limit: 5,000 characters
- All validation rules on an object fire on every DML -- performance impact with many rules

### Well-Architected Alignment

- Error messages in Custom Labels for multilingual support
- Error location set to specific field, not page-level (when possible)
- Document bypass mechanisms (Custom Permissions) for integrations
- Group related validations by business domain in naming

---

## Layer 2: Declarative Design Template

### Validation Rule Design Template

| Attribute | Value |
|---|---|
| Object | `{OBJECT_API_NAME}` |
| Rule Name | `{VR_RuleName}` (prefix with `VR_`) |
| Active | Yes / No |
| Description | {What this rule enforces and why} |
| Error Condition Formula | {Formula that returns TRUE when data is INVALID} |
| Error Message | {User-friendly error message explaining what to fix} |
| Error Location | {Field API Name or Top of Page} |
| Bypass Mechanism | {Custom Permission name, if applicable} |

**Formula Logic:**

```
{Pseudocode or formula explaining the validation logic}
```

**Bypass Note:** *(if applicable)*

- Custom Permission `{Bypass_Permission}` allows integrations to skip this rule

---

## Layer 3: SFDX Source XML Templates

Path: `force-app/main/default/objects/{ObjectName__c}/validationRules/{RuleName}.validationRule-meta.xml`

---

### Standard Validation Rule

<!-- Minimal template: fullName, active, description, formula, display field, and message -->

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ValidationRule xmlns="http://soap.sforce.com/2006/04/metadata">
    <!-- API name of the validation rule -->
    <fullName>{VR_RULE_NAME}</fullName>
    <!-- Set to false to deploy without activating -->
    <active>true</active>
    <description>{RULE_DESCRIPTION}</description>
    <!-- Formula must return TRUE when the data is INVALID -->
    <errorConditionFormula>{FORMULA_RETURNS_TRUE_WHEN_INVALID}</errorConditionFormula>
    <!-- Field where the error displays; omit for page-level errors -->
    <errorDisplayField>{FIELD_API_NAME}</errorDisplayField>
    <errorMessage>{USER_FRIENDLY_ERROR_MESSAGE}</errorMessage>
</ValidationRule>
```

---

### Cross-Field Validation

Example: Closed status requires a reason.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ValidationRule xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>VR_Require_Close_Reason</fullName>
    <active>true</active>
    <description>Requires a Close Reason when Status is set to Closed</description>
    <!-- ISPICKVAL checks picklist values; ISBLANK checks for empty text/lookup -->
    <errorConditionFormula>AND(
    ISPICKVAL(Status__c, &quot;Closed&quot;),
    ISBLANK(Close_Reason__c)
)</errorConditionFormula>
    <errorDisplayField>Close_Reason__c</errorDisplayField>
    <errorMessage>Please provide a Close Reason when setting the status to Closed.</errorMessage>
</ValidationRule>
```

---

### Validation with Custom Permission Bypass

Use `$Permission.{PermissionName}` to let integrations or admin profiles skip the rule.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ValidationRule xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>VR_Require_Account_Industry</fullName>
    <active>true</active>
    <description>Requires Industry on Account unless bypassed by integration permission</description>
    <!-- NOT($Permission...) gates the rule so holders of the permission are exempt -->
    <errorConditionFormula>AND(
    NOT($Permission.Bypass_Validation_Rules),
    ISBLANK(TEXT(Industry))
)</errorConditionFormula>
    <errorDisplayField>Industry</errorDisplayField>
    <errorMessage>Industry is required. Please select an Industry value.</errorMessage>
</ValidationRule>
```

---

### Cross-Object Validation

Traverse relationship fields to validate parent record state.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ValidationRule xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>VR_Contact_Require_Active_Account</fullName>
    <active>true</active>
    <description>Prevents creating contacts on inactive accounts</description>
    <!-- Account.Active__c references a field on the parent Account -->
    <errorConditionFormula>AND(
    NOT(ISBLANK(AccountId)),
    NOT(Account.Active__c)
)</errorConditionFormula>
    <errorDisplayField>AccountId</errorDisplayField>
    <errorMessage>Cannot add contacts to inactive accounts. Please activate the account first.</errorMessage>
</ValidationRule>
```

---

### Regex Format Validation

Use `REGEX()` for pattern matching when standard field types are insufficient.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ValidationRule xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>VR_Valid_External_Id_Format</fullName>
    <active>true</active>
    <description>Validates External ID matches expected format: PREFIX-NNNNN</description>
    <!-- Only validate when the field is populated; REGEX returns true on match -->
    <errorConditionFormula>AND(
    NOT(ISBLANK(External_Id__c)),
    NOT(REGEX(External_Id__c, &quot;^[A-Z]{3}-\\d{5}$&quot;))
)</errorConditionFormula>
    <errorDisplayField>External_Id__c</errorDisplayField>
    <errorMessage>External ID must follow the format: AAA-12345 (3 uppercase letters, dash, 5 digits).</errorMessage>
</ValidationRule>
```

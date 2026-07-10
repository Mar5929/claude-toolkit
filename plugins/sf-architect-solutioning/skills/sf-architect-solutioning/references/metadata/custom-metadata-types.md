# Custom Metadata Types, Custom Settings & Custom Labels Configuration Reference

Salesforce metadata templates for Custom Metadata Types, Custom Settings, and Custom Labels. Use these when designing application configuration, per-user settings, and translatable UI text in the sf-architect-solutioning skill.

> API version validated against: 62.0 - verify with Context7 before generation.

---

## Layer 1: When to Use

### Decision Criteria

- **Custom Metadata Types (CMDT)** - Application configuration that deploys with metadata (no data migration needed). Queryable in SOQL, usable in validation rules, formulas, and flows. Best for: feature flags, mapping tables, routing rules, integration endpoints.
- **Custom Settings (Hierarchy)** - User/Profile-specific configuration values. Good for: per-user feature toggles, org-wide defaults with profile/user overrides. Note: Salesforce recommends CMDT over custom settings for new development.
- **Custom Settings (List)** - App-wide configuration data cached in memory. Good for: frequently accessed lookup data. Note: being superseded by CMDT.
- **Custom Labels** - Translatable text strings for UI messages, error messages, email templates. Support up to 5,000 labels per org. Accessible in Apex, Visualforce, LWC, validation rules, and flows.

### Anti-Patterns

- Using Custom Settings when CMDT is more appropriate - CMDT deploys with metadata, settings require data migration or manual setup.
- Storing large datasets in Custom Settings - use Custom Objects instead. Custom Settings have a 10 MB org-wide cache limit.
- Hardcoding user-facing strings that should be in Custom Labels - blocks translation and requires code deployments to change text.
- CMDT records with no naming convention - becomes unmanageable at scale. Establish a prefix or category-based naming standard.
- Custom Labels for configuration values - use CMDT. Labels are for display text, not application logic.
- Using List Custom Settings for new development - prefer CMDT for deployability and metadata API support.

### Governor Limit Considerations

| Limit | Value |
|---|---|
| CMDT SOQL queries | Do not count against the 100 SOQL query limit |
| CMDT fields per type | 100 |
| CMDT total metadata per type | 10 MB |
| Custom Settings (Hierarchy) getInstance() | Does not count as SOQL |
| Custom Settings (List) getAll() | Returns cached data, no SOQL cost |
| Custom Settings org-wide cache | 10 MB total across all custom settings |
| Custom Labels per org | 5,000 |
| Custom Label value length | 1,000 characters |

### Well-Architected Alignment

- Use **CMDT for all new configuration data** - preferred over Custom Settings for deployability and metadata API support.
- Use **Custom Labels for all user-facing strings** - enables translation and avoids hardcoded text in code.
- Establish **clear naming conventions** for CMDT types and records (e.g., `Feature_Flag__mdt`, `Integration_Endpoint__mdt`).
- Populate **Description** on every CMDT field and record - this is the developer/admin documentation.
- Use **Custom Settings only when per-user/profile hierarchy is genuinely needed** - if the same value applies org-wide, CMDT is simpler.
- Mark CMDT and Custom Labels as **Protected** in managed packages to prevent subscriber modification.

---

## Layer 2: Declarative Design Templates

### Custom Metadata Type Design Template

Copy this table into the solution plan and fill in each row.

| Attribute | Value |
|---|---|
| Label | {CMDT_LABEL} |
| Plural Label | {CMDT_PLURAL_LABEL} |
| API Name | {CMDT_Name__mdt} |
| Description | {What configuration this type stores} |
| Visibility | Public / Protected (for managed packages) |
| Fields | [Field list with types and purposes] |

**Records to Create:**

| Developer Name | Label | {Field1} | {Field2} | {Field3} |
|---|---|---|---|---|
| {Record_1} | {Label} | {Value} | {Value} | {Value} |

### Custom Setting Design Template (Hierarchy)

Copy this table into the solution plan for each hierarchy custom setting.

| Attribute | Value |
|---|---|
| Label | {SETTING_LABEL} |
| API Name | {Setting_Name__c} |
| Setting Type | Hierarchy |
| Description | {What this setting controls} |
| Visibility | Public / Protected |
| Fields | [Field list with types, defaults, and purposes] |

### Custom Label Design Template

Copy this table for each custom label. Group labels by category.

| Attribute | Value |
|---|---|
| Full Name | {LABEL_NAME} |
| Short Description | {What this label is used for} |
| Value | {The label text} |
| Language | en_US |
| Protected | true / false |
| Categories | {Category for organization, if applicable} |

---

## Layer 3: SFDX Source XML Templates

All templates use the `{API_VERSION}` placeholder. Replace with the target API version (e.g., `62.0`) at generation time.

---

### Custom Metadata Type Definition

Path: `force-app/main/default/objects/{TypeName__mdt}/{TypeName__mdt}.object-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <!-- Label shown in Setup and metadata references -->
    <label>{CMDT_LABEL}</label>
    <!-- Plural label for list views and UI references -->
    <pluralLabel>{CMDT_PLURAL_LABEL}</pluralLabel>
    <!-- Description for admin/developer documentation -->
    <description>{CMDT_DESCRIPTION}</description>
    <!-- Public = visible to all; Protected = managed package only -->
    <visibility>Public</visibility>
</CustomObject>
```

---

### CMDT Field (Text)

Path: `force-app/main/default/objects/{TypeName__mdt}/fields/{FieldName__c}.field-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{FIELD_NAME__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- Text field with a maximum length (1-255 characters) -->
    <type>Text</type>
    <length>255</length>
    <!-- Required: true forces a value on every CMDT record -->
    <required>{true|false}</required>
    <!-- Description for admin/developer documentation -->
    <description>{FIELD_DESCRIPTION}</description>
</CustomField>
```

---

### CMDT Field (Checkbox)

Path: `force-app/main/default/objects/{TypeName__mdt}/fields/{FieldName__c}.field-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{FIELD_NAME__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- Checkbox: always has a default value (true or false) -->
    <type>Checkbox</type>
    <defaultValue>false</defaultValue>
    <description>{FIELD_DESCRIPTION}</description>
</CustomField>
```

---

### CMDT Field (Number)

Path: `force-app/main/default/objects/{TypeName__mdt}/fields/{FieldName__c}.field-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{FIELD_NAME__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- Number field: precision = total digits, scale = decimal places -->
    <type>Number</type>
    <precision>{TOTAL_DIGITS}</precision>
    <scale>{DECIMAL_PLACES}</scale>
    <required>{true|false}</required>
    <description>{FIELD_DESCRIPTION}</description>
</CustomField>
```

---

### CMDT Field (Picklist)

Path: `force-app/main/default/objects/{TypeName__mdt}/fields/{FieldName__c}.field-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{FIELD_NAME__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- Picklist on CMDT: restricted = true prevents unlisted API values -->
    <type>Picklist</type>
    <required>{true|false}</required>
    <valueSet>
        <restricted>true</restricted>
        <valueSetDefinition>
            <sorted>false</sorted>
            <value>
                <fullName>{VALUE_1}</fullName>
                <default>true</default>
                <label>{Value 1 Label}</label>
            </value>
            <value>
                <fullName>{VALUE_2}</fullName>
                <default>false</default>
                <label>{Value 2 Label}</label>
            </value>
        </valueSetDefinition>
    </valueSet>
    <description>{FIELD_DESCRIPTION}</description>
</CustomField>
```

---

### CMDT Record

Path: `force-app/main/default/customMetadata/{TypeName}.{RecordDeveloperName}.md-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomMetadata xmlns="http://soap.sforce.com/2006/04/metadata"
                xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <!-- Label displayed in the UI for this record -->
    <label>{RECORD_LABEL}</label>
    <!-- Protected: true = only accessible within the managed package -->
    <protected>false</protected>
    <!-- Each <values> block maps a field API name to a typed value -->
    <values>
        <field>{FIELD_API_NAME_1}</field>
        <!-- xsd:string for Text and Picklist fields -->
        <value xsi:type="xsd:string">{FIELD_VALUE_1}</value>
    </values>
    <values>
        <field>{FIELD_API_NAME_2}</field>
        <!-- xsd:boolean for Checkbox fields -->
        <value xsi:type="xsd:boolean">true</value>
    </values>
    <values>
        <field>{FIELD_API_NAME_3}</field>
        <!-- xsd:double for Number fields -->
        <value xsi:type="xsd:double">100.0</value>
    </values>
</CustomMetadata>
```

---

### Custom Setting (Hierarchy) Definition

Path: `force-app/main/default/objects/{SettingName__c}/{SettingName__c}.object-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <!-- customSettingsType: Hierarchy = org/profile/user override chain -->
    <customSettingsType>Hierarchy</customSettingsType>
    <!-- Label shown in Setup under Custom Settings -->
    <label>{SETTING_LABEL}</label>
    <!-- Description for admin/developer documentation -->
    <description>{SETTING_DESCRIPTION}</description>
    <!-- Public = visible to all; Protected = managed package only -->
    <visibility>Public</visibility>
</CustomObject>
```

---

### Custom Setting Field

Path: `force-app/main/default/objects/{SettingName__c}/fields/{FieldName__c}.field-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{Field_Name__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- Field type: Text, Number, Checkbox, etc. -->
    <type>Text</type>
    <length>255</length>
    <required>{true|false}</required>
    <!-- Default value applied at the org level -->
    <defaultValue>{DEFAULT_VALUE}</defaultValue>
    <description>{FIELD_DESCRIPTION}</description>
    <inlineHelpText>{HELP_TEXT}</inlineHelpText>
</CustomField>
```

---

### Custom Labels

Path: `force-app/main/default/labels/CustomLabels.labels-meta.xml`

All custom labels for the project are defined in a single file. Each `<labels>` block defines one label.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomLabels xmlns="http://soap.sforce.com/2006/04/metadata">
    <labels>
        <!-- Unique API name for this label -->
        <fullName>{LABEL_NAME}</fullName>
        <!-- Language code: en_US, fr, de, ja, etc. -->
        <language>en_US</language>
        <!-- Protected: true = only accessible within the managed package -->
        <protected>false</protected>
        <!-- Short description shown in Setup for identification -->
        <shortDescription>{LABEL_SHORT_DESCRIPTION}</shortDescription>
        <!-- The actual text value (max 1,000 characters) -->
        <value>{LABEL_VALUE}</value>
        <!-- Optional: comma-separated categories for organization -->
        <categories>{CATEGORY}</categories>
    </labels>
    <labels>
        <fullName>{LABEL_NAME_2}</fullName>
        <language>en_US</language>
        <protected>false</protected>
        <shortDescription>{LABEL_SHORT_DESCRIPTION_2}</shortDescription>
        <value>{LABEL_VALUE_2}</value>
        <categories>{CATEGORY}</categories>
    </labels>
</CustomLabels>
```

**Accessing Custom Labels:**

- **Apex**: `System.Label.{LABEL_NAME}` or `Label.{LABEL_NAME}`
- **Visualforce**: `{!$Label.{LABEL_NAME}}`
- **LWC**: Import via `import labelName from '@salesforce/label/c.{LABEL_NAME}';`
- **Validation Rules / Formulas**: `$Label.{LABEL_NAME}`
- **Flows**: Use the `{!$Label.{LABEL_NAME}}` merge field

# Custom Objects & Fields Configuration Reference

Salesforce metadata templates for custom objects, custom fields, and custom indexes. Use these when designing data models in the sf-architect-solutioning skill.

> API version validated against: 62.0 - verify with Context7 before generation.

---

## Layer 1: When to Use

### Decision Criteria

- **Custom Objects** - Use when standard objects do not fit the data model, for junction objects supporting many-to-many relationships, or for application-specific data that has no standard object equivalent.
- **Custom Fields** - Use to extend standard or custom objects with business-specific data points, calculated values, or relationship references.
- **Relationships**
  - *Lookup* - Loose coupling between objects. Records exist independently. Use when the child record should survive parent deletion.
  - *Master-Detail* - Tight coupling with cascade delete. Enables roll-up summary fields on the parent. Use when child records have no meaning without the parent.
  - *Many-to-Many* - Implemented via a junction object with two master-detail relationships. Use when records on both sides need to relate to multiple records on the other side.
- **External Objects** - Use for data that lives outside Salesforce, accessed via Salesforce Connect (OData, cross-org, custom adapters). Records are not stored in Salesforce.
- **Big Objects** - Use for archiving or storing massive volumes of data (billions of rows) that do not require real-time SOQL queries.

### Anti-Patterns

- Creating custom objects that duplicate standard object functionality (e.g., a custom `Company__c` instead of using Account).
- Using Text fields when Picklists are appropriate - degrades data quality and reporting.
- Using Master-Detail when records need independent ownership or should survive parent deletion.
- Missing custom indexes on fields that are frequently used in SOQL WHERE clauses on large-volume objects.
- Not setting data classification on fields that contain PII or sensitive data.
- Creating formula fields that reference other formula fields in deep chains - causes performance issues and hits compiled-size limits.
- Using Auto Number as the Name field when users need a meaningful, searchable name.

### Governor Limit Considerations

| Limit | Value |
|---|---|
| Custom fields per object | 2,000 (800 for Activity) |
| Custom objects per org | 800 |
| Lookup relationships per object | 40 |
| Master-Detail relationships per object | 2 |
| Roll-up summary fields per object | 25 |
| Custom indexes per object | Contact Salesforce support for custom indexes |
| Formula field compiled size | 5,000 characters |
| SOQL query fields | 200 field references per query |

### Well-Architected Alignment

- Set **Data Classification** on every custom field (Public, Internal, Confidential, Restricted).
- Mark fields as **Required** only when there is a clear business justification - over-requiring fields reduces data entry adoption.
- Set **External ID** on fields used as integration keys so upsert operations work correctly.
- Populate **Description** on every custom field - this is the developer/admin audience documentation.
- Populate **Help Text** on every user-facing field - this is the end-user audience documentation.
- Enable **Field History Tracking** on fields subject to audit or compliance requirements (max 20 per standard object, 20 per custom object).
- Use **Record Types** instead of creating separate objects when the data structure is the same but business processes differ.

---

## Layer 2: Declarative Design Templates

### Custom Object Design Template

Copy this table into the solution plan and fill in each row.

| Attribute | Value |
|---|---|
| Label | {OBJECT_LABEL} |
| Plural Label | {OBJECT_PLURAL_LABEL} |
| API Name | {Object_Name__c} |
| Description | {Clear description of object purpose} |
| Record Name | {Name field label} |
| Record Name Type | Text / AutoNumber |
| Auto Number Format | {PREFIX}-{00000} (if AutoNumber) |
| Sharing Model | ReadWrite / Read / Private |
| Enable Reports | Yes / No |
| Enable Activities | Yes / No |
| Enable History Tracking | Yes / No |
| Enable Search | Yes / No |
| Deployment Status | Deployed / In Development |

### Custom Field Design Template

Copy this table for each field. Group fields by object.

| Attribute | Value |
|---|---|
| Object | {OBJECT_API_NAME} |
| Field Label | {FIELD_LABEL} |
| API Name | {Field_Name__c} |
| Type | Text / Number / Currency / Date / DateTime / Checkbox / Picklist / MultiselectPicklist / Lookup / MasterDetail / Formula / LongTextArea / Email / Phone / URL / Percent / TextArea |
| Length / Precision | {if applicable} |
| Required | Yes / No |
| Unique | Yes / No |
| External ID | Yes / No |
| Default Value | {if applicable} |
| Description | {Field purpose - developer/admin audience} |
| Help Text | {User-facing guidance - end-user audience} |
| Data Classification | Public / Internal / Confidential / Restricted |

### Relationship Design Template

Use this when defining Lookup or Master-Detail relationships.

| Attribute | Value |
|---|---|
| Child Object | {CHILD_OBJECT_API_NAME} |
| Parent Object | {PARENT_OBJECT_API_NAME} |
| Relationship Type | Lookup / MasterDetail |
| Relationship Name | {Relationship_Name__r} |
| Relationship Label | {Plural label for child relationship list} |
| Required | Yes / No |
| Reparentable | Yes / No (Master-Detail only) |
| Lookup Filter | {filter criteria, if applicable} |
| Delete Constraint | SetNull / Restrict / Cascade (Lookup) |
| Sharing Setting | ReadWrite / Read (Master-Detail only) |

---

## Layer 3: SFDX Source XML Templates

All templates use the `{API_VERSION}` placeholder. Replace with the target API version (e.g., `62.0`) at generation time.

---

### Custom Object Definition

Path: `force-app/main/default/objects/{ObjectName__c}/{ObjectName__c}.object-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <!-- Object label shown in the UI -->
    <label>{OBJECT_LABEL}</label>
    <!-- Plural label for tabs, list views, related lists -->
    <pluralLabel>{OBJECT_PLURAL_LABEL}</pluralLabel>
    <!-- Description for admin/developer documentation -->
    <description>{OBJECT_DESCRIPTION}</description>

    <!-- Name field configuration -->
    <nameField>
        <!-- Label for the Name field -->
        <label>{NAME_FIELD_LABEL}</label>
        <!-- Text = user-entered name, AutoNumber = system-generated -->
        <type>Text</type>
        <!-- Uncomment for AutoNumber:
        <type>AutoNumber</type>
        <displayFormat>{PREFIX}-{00000}</displayFormat>
        <startingNumber>1</startingNumber>
        -->
    </nameField>

    <!-- Organization-wide default sharing model -->
    <sharingModel>ReadWrite</sharingModel>
    <!-- Deployment status: Deployed or InDevelopment -->
    <deploymentStatus>Deployed</deploymentStatus>

    <!-- Feature toggles -->
    <enableReports>true</enableReports>
    <enableActivities>false</enableActivities>
    <enableHistory>true</enableHistory>
    <enableSearch>true</enableSearch>
    <enableFeeds>false</enableFeeds>
    <enableBulkApi>true</enableBulkApi>
    <enableStreamingApi>true</enableStreamingApi>
</CustomObject>
```

---

### Custom Field Templates

All field templates follow this path:
`force-app/main/default/objects/{ObjectName__c}/fields/{FieldName__c}.field-meta.xml`

---

#### Text Field

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{Field_Name__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- Text field with a maximum length (1-255 characters) -->
    <type>Text</type>
    <length>{LENGTH}</length>
    <required>{true|false}</required>
    <unique>{true|false}</unique>
    <!-- Set to true for integration key fields -->
    <externalId>{true|false}</externalId>
    <description>{FIELD_DESCRIPTION}</description>
    <inlineHelpText>{HELP_TEXT}</inlineHelpText>
    <!-- Data classification: Public, Internal, Confidential, Restricted -->
    <securityClassification>{DATA_CLASSIFICATION}</securityClassification>
</CustomField>
```

---

#### Number Field

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{Field_Name__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- Number field: precision = total digits, scale = decimal places -->
    <type>Number</type>
    <precision>{TOTAL_DIGITS}</precision>
    <scale>{DECIMAL_PLACES}</scale>
    <required>{true|false}</required>
    <unique>{true|false}</unique>
    <externalId>{true|false}</externalId>
    <defaultValue>{DEFAULT_VALUE}</defaultValue>
    <description>{FIELD_DESCRIPTION}</description>
    <inlineHelpText>{HELP_TEXT}</inlineHelpText>
    <securityClassification>{DATA_CLASSIFICATION}</securityClassification>
</CustomField>
```

---

#### Currency Field

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{Field_Name__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- Currency field: precision = total digits, scale = decimal places -->
    <type>Currency</type>
    <precision>{TOTAL_DIGITS}</precision>
    <scale>{DECIMAL_PLACES}</scale>
    <required>{true|false}</required>
    <description>{FIELD_DESCRIPTION}</description>
    <inlineHelpText>{HELP_TEXT}</inlineHelpText>
    <securityClassification>{DATA_CLASSIFICATION}</securityClassification>
</CustomField>
```

---

#### Date / DateTime Field

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{Field_Name__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- Use Date for date-only, DateTime for date + time -->
    <type>{Date|DateTime}</type>
    <required>{true|false}</required>
    <defaultValue>{DEFAULT_VALUE}</defaultValue>
    <description>{FIELD_DESCRIPTION}</description>
    <inlineHelpText>{HELP_TEXT}</inlineHelpText>
    <securityClassification>{DATA_CLASSIFICATION}</securityClassification>
</CustomField>
```

---

#### Checkbox Field

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{Field_Name__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- Checkbox: always has a default value (true or false) -->
    <type>Checkbox</type>
    <defaultValue>{true|false}</defaultValue>
    <description>{FIELD_DESCRIPTION}</description>
    <inlineHelpText>{HELP_TEXT}</inlineHelpText>
    <securityClassification>{DATA_CLASSIFICATION}</securityClassification>
</CustomField>
```

---

#### Picklist Field

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{Field_Name__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- Picklist: restricted = true prevents API from setting unlisted values -->
    <type>Picklist</type>
    <required>{true|false}</required>
    <valueSet>
        <!-- restricted = true enforces the value set at the API level -->
        <restricted>{true|false}</restricted>
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
            <value>
                <fullName>{VALUE_3}</fullName>
                <default>false</default>
                <label>{Value 3 Label}</label>
            </value>
        </valueSetDefinition>
    </valueSet>
    <description>{FIELD_DESCRIPTION}</description>
    <inlineHelpText>{HELP_TEXT}</inlineHelpText>
    <securityClassification>{DATA_CLASSIFICATION}</securityClassification>
</CustomField>
```

---

#### MultiselectPicklist Field

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{Field_Name__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- MultiselectPicklist: visibleLines controls the UI list height -->
    <type>MultiselectPicklist</type>
    <required>{true|false}</required>
    <visibleLines>{4}</visibleLines>
    <valueSet>
        <restricted>{true|false}</restricted>
        <valueSetDefinition>
            <sorted>false</sorted>
            <value>
                <fullName>{VALUE_1}</fullName>
                <default>false</default>
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
    <inlineHelpText>{HELP_TEXT}</inlineHelpText>
    <securityClassification>{DATA_CLASSIFICATION}</securityClassification>
</CustomField>
```

---

#### Lookup Field

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{Field_Name__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- Lookup: loose relationship, child records survive parent deletion -->
    <type>Lookup</type>
    <!-- API name of the parent object -->
    <referenceTo>{Parent_Object__c}</referenceTo>
    <!-- Relationship name used in SOQL subqueries (plural, no __r suffix here) -->
    <relationshipName>{Relationship_Name}</relationshipName>
    <!-- Label shown on the parent object's related list -->
    <relationshipLabel>{RELATIONSHIP_LABEL}</relationshipLabel>
    <required>{true|false}</required>
    <!-- deleteConstraint: SetNull (clear field), Restrict (block delete) -->
    <deleteConstraint>{SetNull|Restrict}</deleteConstraint>
    <description>{FIELD_DESCRIPTION}</description>
    <inlineHelpText>{HELP_TEXT}</inlineHelpText>
    <securityClassification>{DATA_CLASSIFICATION}</securityClassification>
</CustomField>
```

---

#### Master-Detail Field

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{Field_Name__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- MasterDetail: tight coupling, cascade delete, enables roll-up summaries -->
    <type>MasterDetail</type>
    <!-- API name of the master (parent) object -->
    <referenceTo>{Parent_Object__c}</referenceTo>
    <relationshipName>{Relationship_Name}</relationshipName>
    <relationshipLabel>{RELATIONSHIP_LABEL}</relationshipLabel>
    <!-- Relationship order: 0 = primary master-detail, 1 = secondary (junction objects) -->
    <relationshipOrder>{0|1}</relationshipOrder>
    <!-- reparentableMasterDetail: true allows changing the parent record -->
    <reparentableMasterDetail>{true|false}</reparentableMasterDetail>
    <!-- writeRequiresMasterRead: true = Read on parent grants Read/Write on child -->
    <writeRequiresMasterRead>{true|false}</writeRequiresMasterRead>
    <description>{FIELD_DESCRIPTION}</description>
    <inlineHelpText>{HELP_TEXT}</inlineHelpText>
    <securityClassification>{DATA_CLASSIFICATION}</securityClassification>
</CustomField>
```

---

#### Formula Field (Text)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{Field_Name__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- Formula field returning Text -->
    <type>Text</type>
    <formula>{FORMULA_EXPRESSION}</formula>
    <!-- formulaTreatBlanksAs: BlankAsZero or BlankAsBlank -->
    <formulaTreatBlanksAs>BlankAsBlank</formulaTreatBlanksAs>
    <description>{FIELD_DESCRIPTION}</description>
    <inlineHelpText>{HELP_TEXT}</inlineHelpText>
    <securityClassification>{DATA_CLASSIFICATION}</securityClassification>
</CustomField>
```

#### Formula Field (Number)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{Field_Name__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- Formula field returning a Number with precision and scale -->
    <type>Number</type>
    <precision>{TOTAL_DIGITS}</precision>
    <scale>{DECIMAL_PLACES}</scale>
    <formula>{FORMULA_EXPRESSION}</formula>
    <formulaTreatBlanksAs>BlankAsZero</formulaTreatBlanksAs>
    <description>{FIELD_DESCRIPTION}</description>
    <inlineHelpText>{HELP_TEXT}</inlineHelpText>
    <securityClassification>{DATA_CLASSIFICATION}</securityClassification>
</CustomField>
```

---

#### LongTextArea Field

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{Field_Name__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- LongTextArea: length up to 131,072 characters -->
    <type>LongTextArea</type>
    <length>{LENGTH}</length>
    <!-- visibleLines controls the height of the text area in the UI -->
    <visibleLines>{VISIBLE_LINES}</visibleLines>
    <description>{FIELD_DESCRIPTION}</description>
    <inlineHelpText>{HELP_TEXT}</inlineHelpText>
    <securityClassification>{DATA_CLASSIFICATION}</securityClassification>
</CustomField>
```

---

#### Email Field

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{Field_Name__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- Email: Salesforce validates email format automatically -->
    <type>Email</type>
    <required>{true|false}</required>
    <unique>{true|false}</unique>
    <externalId>{true|false}</externalId>
    <description>{FIELD_DESCRIPTION}</description>
    <inlineHelpText>{HELP_TEXT}</inlineHelpText>
    <securityClassification>{DATA_CLASSIFICATION}</securityClassification>
</CustomField>
```

---

#### Phone Field

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{Field_Name__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- Phone: rendered as a clickable phone link in Salesforce UI -->
    <type>Phone</type>
    <required>{true|false}</required>
    <description>{FIELD_DESCRIPTION}</description>
    <inlineHelpText>{HELP_TEXT}</inlineHelpText>
    <securityClassification>{DATA_CLASSIFICATION}</securityClassification>
</CustomField>
```

---

#### URL Field

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{Field_Name__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- URL: rendered as a clickable hyperlink in Salesforce UI -->
    <type>Url</type>
    <required>{true|false}</required>
    <description>{FIELD_DESCRIPTION}</description>
    <inlineHelpText>{HELP_TEXT}</inlineHelpText>
    <securityClassification>{DATA_CLASSIFICATION}</securityClassification>
</CustomField>
```

---

#### Percent Field

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>{Field_Name__c}</fullName>
    <label>{FIELD_LABEL}</label>
    <!-- Percent: stored as a number, displayed with % symbol -->
    <type>Percent</type>
    <precision>{TOTAL_DIGITS}</precision>
    <scale>{DECIMAL_PLACES}</scale>
    <required>{true|false}</required>
    <description>{FIELD_DESCRIPTION}</description>
    <inlineHelpText>{HELP_TEXT}</inlineHelpText>
    <securityClassification>{DATA_CLASSIFICATION}</securityClassification>
</CustomField>
```

---

### Custom Index

Path: `force-app/main/default/objects/{ObjectName__c}/indexes/{IndexName}.index-meta.xml`

Custom indexes improve SOQL query performance on large data sets. Request custom indexes via Salesforce Support for production orgs, or define them in metadata for scratch orgs and sandboxes.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomIndex xmlns="http://soap.sforce.com/2006/04/metadata">
    <!-- allowNullValues: true includes null values in the index -->
    <allowNullValues>{true|false}</allowNullValues>
    <fields>
        <!-- First field in the index (required) -->
        <name>{Field_Name__c}</name>
        <sortDirection>{ASC|DESC}</sortDirection>
    </fields>
    <fields>
        <!-- Additional fields for a composite index (optional) -->
        <name>{Second_Field__c}</name>
        <sortDirection>{ASC|DESC}</sortDirection>
    </fields>
</CustomIndex>
```

**When to create custom indexes:**
- SOQL queries on fields used in WHERE clauses that scan more than 100,000 records.
- Fields used in SOQL filters that are not already auto-indexed (Id, Name, OwnerId, CreatedDate, SystemModstamp, RecordType, and foreign key fields are auto-indexed).
- Composite indexes when queries filter on multiple fields together.

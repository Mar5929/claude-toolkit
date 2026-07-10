# Flow Configuration Reference

> API version validated against: 62.0 - verify with Context7 before generation.

---

## Layer 1: When to Use

### Decision Criteria

- **Record-Triggered Flow (Before Save):** field defaults, simple validations, field updates on the same record - no DML needed
- **Record-Triggered Flow (After Save):** create/update related records, send notifications, invoke subflows - DML allowed
- **Screen Flow:** user-facing wizards, guided data entry, multi-step forms
- **Scheduled Flow (Schedule-Triggered):** batch operations on a schedule, recurring data maintenance
- **Autolaunched Flow (No Trigger):** invocable from Apex, other flows, REST API, or process automation
- **Subflow:** reusable logic shared across multiple parent flows

### Anti-Patterns

- Flows with >20 elements - consider breaking into subflows
- DML in Before Save flows - not allowed, will error
- Recursion without entry conditions - causes infinite loops
- Screen Flows for bulk operations - not designed for >1 record at a time
- Hardcoded IDs in flows - use Custom Metadata or Custom Labels

### Governor Limit Considerations

- Per-transaction limits apply: 100 SOQL queries, 150 DML, 2000 records retrieved per Get
- Bulkification: Record-Triggered Flows auto-bulkify in After Save, but Before Save runs per record
- Screen Flows have their own transaction per screen
- Scheduled Flows process up to 250,000 records per batch (in chunks of 200)

### Well-Architected Alignment

- Prefer Flows over Apex for automation that admins can maintain
- Use Before Save for same-record updates (faster, no DML)
- Always include fault paths for After Save flows
- Document every flow with a description and element descriptions

---

## Layer 2: Declarative Design Templates

### Record-Triggered Flow Design Template

Present this for user approval before generating XML:

| Attribute | Value |
|---|---|
| Flow Label | {FLOW_LABEL} |
| API Name | {Object}_{Trigger}_{Purpose} |
| Type | Record-Triggered Flow |
| Object | {OBJECT_API_NAME} |
| Trigger | Before Save / After Save |
| Record Trigger Type | Create / Update / Create or Update / Delete |
| Entry Conditions | {FIELD} {OPERATOR} {VALUE} (AND/OR logic) |
| Run Mode | System Context - Without Sharing / User Context - Default |
| API Version | {API_VERSION} (verified via Context7) |
| Description | {Clear description of what this flow does and why} |

**Element Walkthrough:**

1. [GET / DECISION / ASSIGNMENT / CREATE / UPDATE / DELETE / SUBFLOW / ACTION]
2. ...

**Variables:**

- {varName} ({Type}) - {Purpose}

**Fault Path:** (After Save only)

- Fault connector → [Error logging approach]

**Security Notes:**

- [Run mode justification]
- [FLS/CRUD considerations]
- [Sharing implications]

---

### Screen Flow Design Template

| Attribute | Value |
|---|---|
| Flow Label | {FLOW_LABEL} |
| API Name | {Purpose}_{Context} |
| Type | Screen Flow |
| Run Mode | User Context - Default / System Context - Without Sharing |
| API Version | {API_VERSION} |
| Description | {Clear description} |

**Screen Walkthrough:**

1. Screen 1: {Title} - [Components: input fields, display text, etc.]
2. Screen 2: {Title} - [Components]
3. ...

**Navigation:** Linear / Conditional (describe branching)

---

### Scheduled Flow Design Template

| Attribute | Value |
|---|---|
| Flow Label | {FLOW_LABEL} |
| API Name | Scheduled_{Object}_{Purpose} |
| Type | Schedule-Triggered Flow |
| Object | {OBJECT_API_NAME} |
| Schedule | {Frequency and time} |
| Entry Conditions | {Filter criteria for records to process} |
| Batch Size | 200 (default) |
| API Version | {API_VERSION} |

---

### Autolaunched Flow Design Template

| Attribute | Value |
|---|---|
| Flow Label | {FLOW_LABEL} |
| API Name | {Purpose}_{Context} |
| Type | Autolaunched Flow (No Trigger) |
| Run Mode | System Context - Without Sharing / User Context |
| API Version | {API_VERSION} |
| Input Variables | {varName} ({Type}) - {Purpose} |
| Output Variables | {varName} ({Type}) - {Purpose} |

---

### Subflow Design Template

| Attribute | Value |
|---|---|
| Flow Label | {FLOW_LABEL} |
| API Name | Sub_{Purpose} |
| Type | Autolaunched Flow (used as Subflow) |
| Input Variables | {varName} ({Type}) |
| Output Variables | {varName} ({Type}) |

---

## Layer 3: SFDX Source XML Templates

### Record-Triggered Flow - Before Save

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>{API_VERSION}</apiVersion>
    <description>{FLOW_DESCRIPTION}</description>
    <label>{FLOW_LABEL}</label>
    <status>Draft</status>
    <!-- processType is AutoLaunchedFlow for all record-triggered flows -->
    <processType>AutoLaunchedFlow</processType>
    <!-- RecordBeforeSave: runs before the record is committed - no DML allowed -->
    <triggerType>RecordBeforeSave</triggerType>
    <!-- Start element: defines trigger object, record trigger type, and entry conditions -->
    <start>
        <locationX>50</locationX>
        <locationY>0</locationY>
        <object>{OBJECT_API_NAME}</object>
        <!-- Options: Create, Update, CreateAndUpdate, Delete -->
        <recordTriggerType>{CREATE_OR_UPDATE}</recordTriggerType>
        <!-- Entry conditions - flow only fires when these are met -->
        <filters>
            <field>{FILTER_FIELD}</field>
            <operator>{OPERATOR}</operator>
            <value>
                <stringValue>{FILTER_VALUE}</stringValue>
            </value>
        </filters>
        <connector>
            <targetReference>{FIRST_ELEMENT_NAME}</targetReference>
        </connector>
    </start>
    <!-- Assignment: update fields on the triggering record directly (no DML needed) -->
    <assignments>
        <name>{ASSIGNMENT_NAME}</name>
        <label>{ASSIGNMENT_LABEL}</label>
        <locationX>50</locationX>
        <locationY>200</locationY>
        <assignmentItems>
            <!-- $Record references the triggering record -->
            <assignToReference>$Record.{FIELD_API_NAME}</assignToReference>
            <operator>Assign</operator>
            <value>
                <stringValue>{VALUE}</stringValue>
            </value>
        </assignmentItems>
    </assignments>
    <environments>Default</environments>
    <interviewLabel>{FLOW_LABEL} {!$Flow.CurrentDateTime}</interviewLabel>
    <!-- SystemModeWithoutSharing bypasses sharing rules; DefaultMode respects user context -->
    <runInMode>{SystemModeWithoutSharing|DefaultMode}</runInMode>
</Flow>
```

---

### Record-Triggered Flow - After Save

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>{API_VERSION}</apiVersion>
    <description>{FLOW_DESCRIPTION}</description>
    <label>{FLOW_LABEL}</label>
    <status>Draft</status>
    <processType>AutoLaunchedFlow</processType>
    <!-- RecordAfterSave: runs after commit - DML on other records is allowed -->
    <triggerType>RecordAfterSave</triggerType>
    <start>
        <locationX>50</locationX>
        <locationY>0</locationY>
        <object>{OBJECT_API_NAME}</object>
        <recordTriggerType>{CREATE_OR_UPDATE}</recordTriggerType>
        <filters>
            <field>{FILTER_FIELD}</field>
            <operator>{OPERATOR}</operator>
            <value>
                <stringValue>{FILTER_VALUE}</stringValue>
            </value>
        </filters>
        <connector>
            <targetReference>{FIRST_ELEMENT_NAME}</targetReference>
        </connector>
    </start>
    <!-- Get Records: query related data needed for downstream logic -->
    <recordLookups>
        <name>{GET_NAME}</name>
        <label>{GET_LABEL}</label>
        <locationX>50</locationX>
        <locationY>200</locationY>
        <object>{LOOKUP_OBJECT}</object>
        <filters>
            <field>{LOOKUP_FILTER_FIELD}</field>
            <operator>EqualTo</operator>
            <value>
                <!-- Reference a field from the triggering record -->
                <elementReference>$Record.{REFERENCE_FIELD}</elementReference>
            </value>
        </filters>
        <!-- true = single record stored in auto-variable; false = collection -->
        <getFirstRecordOnly>true</getFirstRecordOnly>
        <storeOutputAutomatically>true</storeOutputAutomatically>
        <connector>
            <targetReference>{NEXT_ELEMENT}</targetReference>
        </connector>
    </recordLookups>
    <!-- Decision: branch logic based on variable or field values -->
    <decisions>
        <name>{DECISION_NAME}</name>
        <label>{DECISION_LABEL}</label>
        <locationX>50</locationX>
        <locationY>400</locationY>
        <defaultConnector>
            <targetReference>{DEFAULT_PATH_ELEMENT}</targetReference>
        </defaultConnector>
        <defaultConnectorLabel>Default</defaultConnectorLabel>
        <rules>
            <name>{OUTCOME_NAME}</name>
            <conditionLogic>and</conditionLogic>
            <conditions>
                <leftValueReference>{VARIABLE_OR_FIELD}</leftValueReference>
                <operator>{OPERATOR}</operator>
                <rightValue>
                    <stringValue>{VALUE}</stringValue>
                </rightValue>
            </conditions>
            <connector>
                <targetReference>{TRUE_PATH_ELEMENT}</targetReference>
            </connector>
            <label>{OUTCOME_LABEL}</label>
        </rules>
    </decisions>
    <!-- Create Records: insert a new record on a related or target object -->
    <recordCreates>
        <name>{CREATE_NAME}</name>
        <label>{CREATE_LABEL}</label>
        <locationX>50</locationX>
        <locationY>600</locationY>
        <inputAssignments>
            <field>{FIELD_API_NAME}</field>
            <value>
                <elementReference>{VARIABLE_REFERENCE}</elementReference>
            </value>
        </inputAssignments>
        <object>{TARGET_OBJECT}</object>
        <storeOutputAutomatically>true</storeOutputAutomatically>
        <!-- Fault connector: routes to error handling if DML fails -->
        <faultConnector>
            <targetReference>{FAULT_ELEMENT}</targetReference>
        </faultConnector>
    </recordCreates>
    <!-- Fault path: log the error for debugging and monitoring -->
    <recordCreates>
        <name>{FAULT_ELEMENT}</name>
        <label>Log Error</label>
        <locationX>250</locationX>
        <locationY>600</locationY>
        <inputAssignments>
            <field>Error_Message__c</field>
            <value>
                <!-- $Flow.FaultMessage contains the runtime error text -->
                <elementReference>$Flow.FaultMessage</elementReference>
            </value>
        </inputAssignments>
        <inputAssignments>
            <field>Flow_Name__c</field>
            <value>
                <stringValue>{FLOW_API_NAME}</stringValue>
            </value>
        </inputAssignments>
        <inputAssignments>
            <field>Record_Id__c</field>
            <value>
                <elementReference>$Record.Id</elementReference>
            </value>
        </inputAssignments>
        <object>{ERROR_LOG_OBJECT}</object>
    </recordCreates>
    <environments>Default</environments>
    <interviewLabel>{FLOW_LABEL} {!$Flow.CurrentDateTime}</interviewLabel>
    <runInMode>{SystemModeWithoutSharing|DefaultMode}</runInMode>
</Flow>
```

---

### Screen Flow

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>{API_VERSION}</apiVersion>
    <description>{FLOW_DESCRIPTION}</description>
    <label>{FLOW_LABEL}</label>
    <status>Draft</status>
    <!-- processType "Flow" indicates a Screen Flow -->
    <processType>Flow</processType>
    <start>
        <locationX>50</locationX>
        <locationY>0</locationY>
        <connector>
            <targetReference>{FIRST_SCREEN_NAME}</targetReference>
        </connector>
    </start>
    <!-- Screen element: defines the user-facing UI -->
    <screens>
        <name>{SCREEN_NAME}</name>
        <label>{SCREEN_LABEL}</label>
        <locationX>50</locationX>
        <locationY>200</locationY>
        <allowBack>true</allowBack>
        <allowFinish>true</allowFinish>
        <allowPause>false</allowPause>
        <showFooter>true</showFooter>
        <showHeader>true</showHeader>
        <connector>
            <targetReference>{NEXT_ELEMENT}</targetReference>
        </connector>
        <!-- Input field bound to an sObject field -->
        <fields>
            <name>{INPUT_FIELD_NAME}</name>
            <fieldType>InputField</fieldType>
            <inputsOnNextNavToAssocScrn>UseStoredValues</inputsOnNextNavToAssocScrn>
            <isRequired>true</isRequired>
            <objectFieldReference>{OBJECT.FIELD}</objectFieldReference>
        </fields>
        <!-- Static display text - supports rich text HTML -->
        <fields>
            <name>{DISPLAY_TEXT_NAME}</name>
            <fieldType>DisplayText</fieldType>
            <fieldText>&lt;p&gt;{DISPLAY_TEXT_CONTENT}&lt;/p&gt;</fieldText>
        </fields>
    </screens>
    <!-- Variables: use isInput/isOutput to expose to Lightning pages or other flows -->
    <variables>
        <name>{VAR_NAME}</name>
        <dataType>{String|Number|Boolean|SObject|Date|DateTime}</dataType>
        <isCollection>{true|false}</isCollection>
        <isInput>{true|false}</isInput>
        <isOutput>{true|false}</isOutput>
    </variables>
    <environments>Default</environments>
    <interviewLabel>{FLOW_LABEL} {!$Flow.CurrentDateTime}</interviewLabel>
    <runInMode>{SystemModeWithoutSharing|DefaultMode}</runInMode>
</Flow>
```

---

### Scheduled Flow (Schedule-Triggered)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>{API_VERSION}</apiVersion>
    <description>{FLOW_DESCRIPTION}</description>
    <label>{FLOW_LABEL}</label>
    <status>Draft</status>
    <processType>AutoLaunchedFlow</processType>
    <!-- Scheduled trigger: runs on a defined schedule against filtered records -->
    <triggerType>Scheduled</triggerType>
    <start>
        <locationX>50</locationX>
        <locationY>0</locationY>
        <object>{OBJECT_API_NAME}</object>
        <!-- Schedule definition: frequency, start date, and start time -->
        <schedule>
            <frequency>{Once|Daily|Weekly}</frequency>
            <startDate>{YYYY-MM-DD}</startDate>
            <startTime>{HH:MM:SS.000Z}</startTime>
        </schedule>
        <!-- Filter: only records matching these conditions are processed -->
        <filters>
            <field>{FILTER_FIELD}</field>
            <operator>{OPERATOR}</operator>
            <value>
                <stringValue>{FILTER_VALUE}</stringValue>
            </value>
        </filters>
        <connector>
            <targetReference>{FIRST_ELEMENT_NAME}</targetReference>
        </connector>
    </start>
    <!-- Update Records: modify matching records in batch -->
    <recordUpdates>
        <name>{UPDATE_NAME}</name>
        <label>{UPDATE_LABEL}</label>
        <locationX>50</locationX>
        <locationY>200</locationY>
        <inputAssignments>
            <field>{FIELD_TO_UPDATE}</field>
            <value>
                <stringValue>{NEW_VALUE}</stringValue>
            </value>
        </inputAssignments>
        <object>{OBJECT_API_NAME}</object>
        <!-- Filter by the current record's Id from the scheduled batch -->
        <filters>
            <field>Id</field>
            <operator>EqualTo</operator>
            <value>
                <elementReference>$Record.Id</elementReference>
            </value>
        </filters>
        <faultConnector>
            <targetReference>{FAULT_ELEMENT}</targetReference>
        </faultConnector>
    </recordUpdates>
    <environments>Default</environments>
    <interviewLabel>{FLOW_LABEL} {!$Flow.CurrentDateTime}</interviewLabel>
    <!-- Scheduled Flows always run in system context -->
    <runInMode>SystemModeWithoutSharing</runInMode>
</Flow>
```

---

### Autolaunched Flow (No Trigger)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>{API_VERSION}</apiVersion>
    <description>{FLOW_DESCRIPTION}</description>
    <label>{FLOW_LABEL}</label>
    <status>Draft</status>
    <processType>AutoLaunchedFlow</processType>
    <!-- No triggerType: this flow is invoked explicitly from Apex, REST, or another flow -->
    <start>
        <locationX>50</locationX>
        <locationY>0</locationY>
        <connector>
            <targetReference>{FIRST_ELEMENT_NAME}</targetReference>
        </connector>
    </start>
    <!-- Input variables: passed in by the caller (Apex, REST API, parent flow) -->
    <variables>
        <name>{INPUT_VAR_NAME}</name>
        <dataType>{String|Number|SObject}</dataType>
        <isCollection>{true|false}</isCollection>
        <isInput>true</isInput>
        <isOutput>false</isOutput>
    </variables>
    <!-- Output variables: returned to the caller after execution -->
    <variables>
        <name>{OUTPUT_VAR_NAME}</name>
        <dataType>{String|Boolean}</dataType>
        <isCollection>false</isCollection>
        <isInput>false</isInput>
        <isOutput>true</isOutput>
    </variables>
    <environments>Default</environments>
    <interviewLabel>{FLOW_LABEL} {!$Flow.CurrentDateTime}</interviewLabel>
    <runInMode>{SystemModeWithoutSharing|DefaultMode}</runInMode>
</Flow>
```

---

### Subflow Invocation (within parent flow)

```xml
<!-- Subflow element: calls a reusable Autolaunched Flow from within a parent flow -->
<subflows>
    <name>{SUBFLOW_ELEMENT_NAME}</name>
    <label>{SUBFLOW_LABEL}</label>
    <locationX>50</locationX>
    <locationY>400</locationY>
    <!-- flowName must match the API name of the target Autolaunched Flow -->
    <flowName>{SUBFLOW_API_NAME}</flowName>
    <!-- Input assignments: map parent variables into the subflow's input variables -->
    <inputAssignments>
        <name>{SUBFLOW_INPUT_VAR}</name>
        <value>
            <elementReference>{PARENT_VARIABLE}</elementReference>
        </value>
    </inputAssignments>
    <!-- Output assignments: map subflow output variables back into parent variables -->
    <outputAssignments>
        <assignToReference>{PARENT_OUTPUT_VAR}</assignToReference>
        <name>{SUBFLOW_OUTPUT_VAR}</name>
    </outputAssignments>
    <connector>
        <targetReference>{NEXT_ELEMENT}</targetReference>
    </connector>
</subflows>
```

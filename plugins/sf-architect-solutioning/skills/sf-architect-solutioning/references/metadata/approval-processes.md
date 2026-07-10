# Approval Processes Configuration Reference

> API version validated against: 62.0

---

## Layer 1: When to Use

### Decision Criteria

- Record requires human approval before state transition (e.g., Discount > 20% needs manager approval)
- Multi-step approvals with different approvers at each step
- Approval routing: role hierarchy, queue, specific users, related user field
- Lock/unlock record during approval to prevent edits
- Automated actions on submit, approve, reject, recall

### Anti-Patterns

- Approval processes for simple field validations (use validation rules instead)
- More than 5 approval steps (consider simplifying the business process)
- Hardcoded approver usernames (use role hierarchy, queues, or related user fields)
- Missing recall actions (users get stuck if they can't recall)
- No email notifications (approvers don't know they have pending items)

### Governor Limit Considerations

- Max 1000 approval processes per object (across active and inactive)
- Max 30 steps per approval process
- Approval process initial submission actions count toward automation limits
- Email alerts count toward daily email limit (5000/org for workflow/approval emails)

### Well-Architected Alignment

- Use role hierarchy-based routing for scalability
- Always define Initial Submission, Final Approval, Final Rejection, and Recall actions
- Lock records during approval to prevent unauthorized changes
- Include email templates for each approval step
- Document the approval matrix (who approves what at which threshold)

---

## Layer 2: Declarative Design Template

### Approval Process Design Template

| Attribute | Value |
|---|---|
| Object | `{OBJECT_API_NAME}` |
| Process Name | `{Approval_Process_Name}` |
| Label | {Approval Process Label} |
| Description | {What this approval process governs} |
| Entry Criteria | {Conditions that trigger this process -- formula or field criteria} |
| Record Editability | Administrators Only / Administrators OR Current Approver |
| Approver Type | Role Hierarchy / Queue / User / Related User Field |
| Allow Submitter Recall | Yes / No |
| Next Automated Approver Field | {Manager field, if using hierarchy} |

**Approval Steps:**

1. Step 1: {Name} -- Approver: {who} -- Criteria: {when this step applies}
2. Step 2: {Name} -- Approver: {who} -- Criteria: {when this step applies}
3. *(Add additional steps as needed)*

**Actions:**

- Initial Submission: [Field updates, email alerts, outbound messages, tasks]
- Step Approval: [Actions per step]
- Step Rejection: [Actions per step]
- Final Approval: [Field updates, email alerts]
- Final Rejection: [Field updates, email alerts]
- Recall: [Field updates]

**Security Notes:**

- [Who can submit for approval]
- [Record lock behavior during approval]
- [Visibility of approval history]

---

## Layer 3: SFDX Source XML Templates

Path: `force-app/main/default/approvalProcesses/{ObjectName}.{ProcessName}.approvalProcess-meta.xml`

---

### Standard Approval Process

<!-- Full template with two approval steps, all action types, and hierarchy-based routing -->

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ApprovalProcess xmlns="http://soap.sforce.com/2006/04/metadata">
    <!-- API name of the approval process -->
    <fullName>{PROCESS_NAME}</fullName>
    <!-- Set to false to deploy without activating -->
    <active>false</active>
    <!-- Allow submitters to recall pending approvals -->
    <allowRecall>true</allowRecall>
    <description>{PROCESS_DESCRIPTION}</description>
    <label>{PROCESS_LABEL}</label>

    <!-- Entry criteria - determines which records enter this process -->
    <entryCriteria>
        <criteriaItems>
            <field>{OBJECT_API_NAME}.{FIELD_API_NAME}</field>
            <operation>greaterThan</operation>
            <value>{THRESHOLD_VALUE}</value>
        </criteriaItems>
    </entryCriteria>
    <!-- OR use formula-based entry criteria instead of criteriaItems -->
    <!-- <entryCriteria>
        <formula>{FORMULA_EXPRESSION}</formula>
    </entryCriteria> -->

    <!-- Record editability: AdminOnly or AdminOrCurrentApprover -->
    <recordEditability>AdminOnly</recordEditability>
    <!-- Display the approval history related list on the page layout -->
    <showApprovalHistory>true</showApprovalHistory>

    <!-- Initial submission actions - fire when a record is first submitted -->
    <initialSubmissionActions>
        <action>
            <name>{FIELD_UPDATE_NAME}</name>
            <type>FieldUpdate</type>
        </action>
        <action>
            <name>{EMAIL_ALERT_NAME}</name>
            <type>Alert</type>
        </action>
    </initialSubmissionActions>

    <!-- Step 1: First-level approval -->
    <approvalStep>
        <name>Step_1_{STEP_PURPOSE}</name>
        <label>{STEP_1_LABEL}</label>
        <description>{STEP_1_DESCRIPTION}</description>
        <!-- Step entry criteria (optional - if omitted, all records enter this step) -->
        <entryCriteria>
            <criteriaItems>
                <field>{OBJECT_API_NAME}.{FIELD_API_NAME}</field>
                <operation>greaterThan</operation>
                <value>{STEP_THRESHOLD}</value>
            </criteriaItems>
        </entryCriteria>
        <!-- Assigned approver: type can be user, userHierarchyField, queue, or relatedUserField -->
        <assignedApprover>
            <approver>
                <name>{APPROVER_NAME_OR_FIELD}</name>
                <type>{user|userHierarchyField|queue|relatedUserField}</type>
            </approver>
            <!-- FirstResponse or Unanimous when multiple approvers are assigned -->
            <whenMultipleApprovers>FirstResponse</whenMultipleApprovers>
        </assignedApprover>
        <!-- Rejection behavior: RejectRequest ends the process, BackToPrevious returns to prior step -->
        <rejectBehavior>
            <type>RejectRequest</type>
        </rejectBehavior>
        <!-- Actions that fire when this step is approved -->
        <approvalActions>
            <action>
                <name>{STEP_FIELD_UPDATE}</name>
                <type>FieldUpdate</type>
            </action>
        </approvalActions>
        <!-- Actions that fire when this step is rejected -->
        <rejectionActions>
            <action>
                <name>{REJECTION_FIELD_UPDATE}</name>
                <type>FieldUpdate</type>
            </action>
        </rejectionActions>
    </approvalStep>

    <!-- Step 2: Second-level approval (multi-step example) -->
    <approvalStep>
        <name>Step_2_{STEP_PURPOSE}</name>
        <label>{STEP_2_LABEL}</label>
        <assignedApprover>
            <approver>
                <name>{APPROVER_2}</name>
                <type>user</type>
            </approver>
        </assignedApprover>
        <!-- BackToPrevious sends rejections back to Step 1 instead of ending the process -->
        <rejectBehavior>
            <type>BackToPrevious</type>
        </rejectBehavior>
    </approvalStep>

    <!-- Final approval actions - fire when the last step is approved -->
    <finalApprovalActions>
        <action>
            <name>{FINAL_APPROVAL_FIELD_UPDATE}</name>
            <type>FieldUpdate</type>
        </action>
        <action>
            <name>{FINAL_APPROVAL_EMAIL}</name>
            <type>Alert</type>
        </action>
    </finalApprovalActions>

    <!-- Final rejection actions - fire when the process reaches a terminal rejection -->
    <finalRejectionActions>
        <action>
            <name>{FINAL_REJECTION_FIELD_UPDATE}</name>
            <type>FieldUpdate</type>
        </action>
        <action>
            <name>{FINAL_REJECTION_EMAIL}</name>
            <type>Alert</type>
        </action>
    </finalRejectionActions>

    <!-- Recall actions - fire when a submitter recalls a pending approval -->
    <recallActions>
        <action>
            <name>{RECALL_FIELD_UPDATE}</name>
            <type>FieldUpdate</type>
        </action>
    </recallActions>

    <!-- Next automated approver - used with hierarchy-based routing -->
    <nextAutomatedApprover>
        <useApproverFieldOfRecordOwner>true</useApproverFieldOfRecordOwner>
        <userHierarchyField>Manager</userHierarchyField>
    </nextAutomatedApprover>
</ApprovalProcess>
```

---

### Approval Field Update (Supporting Metadata)

Field updates are commonly paired with approval processes to track approval status.

Path: `force-app/main/default/objects/{ObjectName__c}/fieldUpdates/{FieldUpdateName}.fieldUpdate-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<FieldUpdate xmlns="http://soap.sforce.com/2006/04/metadata">
    <!-- Field update triggered by approval process actions -->
    <fullName>{FIELD_UPDATE_NAME}</fullName>
    <description>Sets {FIELD_LABEL} to {VALUE} on approval</description>
    <field>{FIELD_API_NAME}</field>
    <literalValue>{VALUE}</literalValue>
    <name>{FIELD_UPDATE_LABEL}</name>
    <notifyAssignee>false</notifyAssignee>
    <operation>Literal</operation>
    <protected>false</protected>
</FieldUpdate>
```

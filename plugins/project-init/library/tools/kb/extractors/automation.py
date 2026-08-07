"""automation.py — workflows, approvals, and the four kinds of rule set.

The measured gap: the old parser read a workflow's `fieldUpdates` and nothing
else, so rule criteria, email alerts, tasks and outbound messages were all
invisible.

The other thing this module fixes is a link that could not resolve before. A flow
`actionCall` with `actionType` `emailAlert` points at a name like
`Case.Billing_Integrity_Case_Received`, which is a workflow alert. Until the
alerts inside a workflow file were registered as components in their own right,
that name pointed at nothing that existed. So each alert, field update, task and
outbound message becomes its own component, named `Object.Name`, exactly as
everything else refers to it.
"""

from __future__ import annotations

from .names import formula_references, merge_field_references
from .xmlutil import child_text, child_texts, local, text_of, walk

# The sub-components a workflow file holds, and the type each becomes.
_WORKFLOW_PARTS = {
    "alerts": "WorkflowAlert",
    "fieldUpdates": "WorkflowFieldUpdate",
    "tasks": "WorkflowTask",
    "outboundMessages": "WorkflowOutboundMessage",
    "rules": "WorkflowRule",
    "knowledgePublishes": "WorkflowKnowledgePublish",
    "send": "WorkflowSend",
}

# A workflow rule action names one of the parts above by type.
_ACTION_TYPES = {
    "Alert": ("WorkflowAlert", "sends_email_alert"),
    "FieldUpdate": ("WorkflowFieldUpdate", "invokes"),
    "Task": ("WorkflowTask", "creates_task"),
    "OutboundMessage": ("WorkflowOutboundMessage", "sends_outbound_message"),
    "KnowledgePublish": ("WorkflowKnowledgePublish", "invokes"),
    "Send": ("WorkflowSend", "invokes"),
    "FlowAction": ("Flow", "calls_flow"),
}


def _emit_formula(ctx, formula, path, obj, relationship="references") -> None:
    if not formula:
        return
    for ref in formula_references(formula):
        if ref["kind"] == "global":
            ctx.reference(raw=ref["raw"], relationship="references", location=path,
                          target_type=ref["global_name"], confidence="medium")
        else:
            ctx.reference(raw=ref["raw"], relationship=relationship, location=path,
                          target_type="CustomField",
                          target_parent="" if ref["kind"] == "traversal" else obj,
                          confidence="medium",
                          traversal=(ref["kind"] == "traversal") or None)


def extract_workflow(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    obj = ctx.component_name          # a workflow file is named for its object
    workflow_id = ctx.own_component_id

    ctx.reference(raw=obj, relationship="triggers_on", location="fullName",
                  target_type="CustomObject", confidence="medium",
                  note="a workflow file is named for the object it runs on")

    for elem, path in walk(root):
        name = local(elem)
        if name not in _WORKFLOW_PARTS:
            continue
        part_type = _WORKFLOW_PARTS[name]
        part_name = child_text(elem, "fullName")
        if not part_name:
            continue

        part_id = ctx.component(metadata_type=part_type,
                                api_name=f"{obj}.{part_name}",
                                parent_id=workflow_id,
                                label=child_text(elem, "label")
                                or child_text(elem, "description"))
        ctx.reference(raw=f"{obj}.{part_name}", relationship="contains",
                      location=path, target_type=part_type, source_id=workflow_id)
        ctx.consume(path)

        if name == "fieldUpdates":
            _emit_field_update(ctx, elem, path, obj, part_id)
        elif name == "alerts":
            _emit_alert(ctx, elem, path, obj, part_id)
        elif name == "tasks":
            _emit_task(ctx, elem, path, obj, part_id)
        elif name == "outboundMessages":
            _emit_outbound_message(ctx, elem, path, obj, part_id)
        elif name == "rules":
            _emit_rule(ctx, elem, path, obj, part_id)


def _emit_field_update(ctx, elem, path, obj, source_id) -> None:
    field = child_text(elem, "field")
    target_object = child_text(elem, "targetObject") or obj
    if field:
        ctx.reference(raw=field, relationship="writes", location=f"{path}/field",
                      target_type="CustomField", target_parent=target_object,
                      source_id=source_id,
                      operation=child_text(elem, "operation"))
    _emit_formula(ctx, child_text(elem, "formula"), f"{path}/formula", obj, "reads")
    lookup = child_text(elem, "lookupValue")
    if lookup:
        ctx.reference(raw=lookup, relationship="reads",
                      location=f"{path}/lookupValue", source_id=source_id,
                      target_type=child_text(elem, "lookupValueType") or "",
                      confidence="medium")


def _emit_alert(ctx, elem, path, obj, source_id) -> None:
    template = child_text(elem, "template")
    if template:
        ctx.reference(raw=template, relationship="references",
                      location=f"{path}/template", target_type="EmailTemplate",
                      source_id=source_id)
    for recipient, rpath in walk(elem, path):
        if local(recipient) != "recipients":
            continue
        recipient_type = child_text(recipient, "type")
        recipient_name = child_text(recipient, "recipient")
        field = child_text(recipient, "field")
        if recipient_name:
            ctx.reference(raw=recipient_name, relationship="references",
                          location=f"{rpath}/recipient", source_id=source_id,
                          target_type=_recipient_type(recipient_type),
                          recipient_type=recipient_type)
        if field:
            ctx.reference(raw=field, relationship="reads",
                          location=f"{rpath}/field", target_type="CustomField",
                          target_parent=obj, source_id=source_id)


def _recipient_type(recipient_type: str) -> str:
    return {
        "group": "Group", "role": "Role", "roleSubordinates": "Role",
        "roleSubordinatesInternal": "Role", "user": "User", "owner": "User",
        "partnerUser": "User", "portalRole": "Role", "creator": "User",
    }.get(recipient_type or "", "")


def _emit_task(ctx, elem, path, obj, source_id) -> None:
    assigned = child_text(elem, "assignedTo")
    if assigned:
        ctx.reference(raw=assigned, relationship="assigned_to",
                      location=f"{path}/assignedTo", source_id=source_id,
                      target_type=_recipient_type(child_text(elem, "assignedToType")))
    for tag_name in ("subject", "description"):
        value = child_text(elem, tag_name)
        if value and "{!" in value:
            for ref in merge_field_references(value):
                ctx.reference(raw=ref["raw"], relationship="reads",
                              location=f"{path}/{tag_name}",
                              target_type="CustomField", target_parent=obj,
                              source_id=source_id, confidence="medium",
                              merge_field=True)
    offset_field = child_text(elem, "offsetExpression")
    if offset_field:
        ctx.reference(raw=offset_field, relationship="reads",
                      location=f"{path}/offsetExpression",
                      target_type="CustomField", target_parent=obj,
                      source_id=source_id, confidence="medium")


def _emit_outbound_message(ctx, elem, path, obj, source_id) -> None:
    endpoint = child_text(elem, "endpointUrl")
    if endpoint:
        ctx.reference(raw=endpoint, relationship="calls_endpoint",
                      location=f"{path}/endpointUrl", source_id=source_id)
    for field in child_texts(elem, "fields"):
        ctx.reference(raw=field, relationship="reads", location=f"{path}/fields",
                      target_type="CustomField", target_parent=obj,
                      source_id=source_id)
    user = child_text(elem, "integrationUser")
    if user:
        ctx.reference(raw=user, relationship="assigned_to",
                      location=f"{path}/integrationUser", target_type="User",
                      source_id=source_id)


def _emit_rule(ctx, elem, path, obj, source_id) -> None:
    _emit_formula(ctx, child_text(elem, "formula"), f"{path}/formula", obj, "reads")

    for item, ipath in walk(elem, path):
        name = local(item)
        if name == "criteriaItems":
            field = child_text(item, "field")
            if field:
                ctx.reference(raw=field, relationship="filters_on",
                              location=f"{ipath}/field", target_type="CustomField",
                              target_parent=obj, source_id=source_id,
                              operation=child_text(item, "operation"))
        elif name in ("actions", "workflowTimeTriggers"):
            action_name = child_text(item, "name")
            action_type = child_text(item, "type")
            if action_name and action_type:
                target_type, relationship = _ACTION_TYPES.get(
                    action_type, ("", "invokes"))
                qualified = (action_name if "." in action_name
                             else f"{obj}.{action_name}")
                ctx.reference(raw=qualified, relationship=relationship,
                              location=f"{ipath}/name", target_type=target_type,
                              source_id=source_id, action_type=action_type)


# ---------------------------------------------------------------------------
# Approval processes and rule sets
# ---------------------------------------------------------------------------

def extract_approval_process(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    obj = ctx.component_name.split(".", 1)[0] if "." in ctx.component_name else ctx.component_name
    ctx.component(active=child_text(root, "active"),
                  label=child_text(root, "label"))
    ctx.reference(raw=obj, relationship="triggers_on", location="fullName",
                  target_type="CustomObject", confidence="medium")

    for elem, path in walk(root):
        name = local(elem)
        if name == "entryCriteria" or name == "criteriaItems":
            field = child_text(elem, "field")
            if field:
                ctx.reference(raw=field, relationship="filters_on",
                              location=f"{path}/field", target_type="CustomField",
                              target_parent=obj)
            _emit_formula(ctx, child_text(elem, "formula"), f"{path}/formula", obj)
        elif name in ("approvalActions", "rejectionActions", "initialSubmissionActions",
                      "finalApprovalActions", "finalRejectionActions",
                      "recallActions"):
            for action, apath in walk(elem, path):
                if local(action) != "action":
                    continue
                action_name = child_text(action, "name")
                action_type = child_text(action, "type")
                if action_name:
                    target_type, relationship = _ACTION_TYPES.get(
                        action_type or "", ("", "invokes"))
                    ctx.reference(raw=action_name, relationship=relationship,
                                  location=f"{apath}/name", target_type=target_type,
                                  action_type=action_type, phase=name)
        elif name == "approver":
            for child in elem:
                value = text_of(child)
                if value:
                    ctx.reference(raw=value, relationship="assigned_to",
                                  location=f"{path}/{local(child)}",
                                  target_type=_recipient_type(local(child)))

    if ctx._references <= 1:
        ctx.reason("an approval process whose steps name no field or action")


def extract_rule_set(ctx) -> None:
    """Assignment, auto-response and escalation rules. All three share a shape."""
    root = ctx.xml_root
    if root is None:
        return
    obj = ctx.component_name
    ctx.reference(raw=obj, relationship="triggers_on", location="fullName",
                  target_type="CustomObject", confidence="medium",
                  note="a rule set file is named for the object it runs on")

    for elem, path in walk(root):
        name = local(elem)
        if name == "criteriaItems":
            field = child_text(elem, "field")
            if field:
                ctx.reference(raw=field, relationship="filters_on",
                              location=f"{path}/field", target_type="CustomField",
                              target_parent=obj,
                              operation=child_text(elem, "operation"))
        elif name in ("assignedTo", "assignedToTemplate", "escalationAction"):
            value = text_of(elem) or child_text(elem, "assignedTo")
            if value:
                ctx.reference(raw=value, relationship="assigned_to", location=path,
                              target_type="Queue", confidence="medium")
        elif name == "formula":
            _emit_formula(ctx, text_of(elem), path, obj)

    if ctx._references <= 1:
        ctx.reason("a rule set whose rules name no field or assignee")


def extract_duplicate_rule(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    obj = (ctx.component_name.split(".", 1)[0] if "." in ctx.component_name
           else ctx.component_name)
    ctx.component(active=child_text(root, "isActive"))
    ctx.reference(raw=obj, relationship="triggers_on", location="fullName",
                  target_type="CustomObject", confidence="medium")

    for elem, path in walk(root):
        name = local(elem)
        if name == "duplicateRuleMatchRules":
            matching_rule = child_text(elem, "matchingRule")
            object_name = child_text(elem, "matchingRuleSObject")
            if matching_rule:
                ctx.consume(path)
                ctx.reference(raw=(f"{object_name}.{matching_rule}" if object_name
                                   else matching_rule),
                              relationship="invokes",
                              location=f"{path}/matchingRule",
                              target_type="MatchingRule")
        elif name == "duplicateRuleFilterItems":
            field = child_text(elem, "field")
            if field:
                ctx.reference(raw=field, relationship="filters_on",
                              location=f"{path}/field", target_type="CustomField",
                              target_parent=obj)

    if ctx._references <= 1:
        ctx.reason("a duplicate rule naming no matching rule and no filter fields")


def extract_matching_rule(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    obj = ctx.component_name
    for elem, path in walk(root):
        name = local(elem)
        if name == "matchingRules":
            rule_name = child_text(elem, "fullName")
            if rule_name:
                ctx.component(metadata_type="MatchingRule",
                              api_name=f"{obj}.{rule_name}",
                              parent_id=ctx.own_component_id,
                              label=child_text(elem, "label"))
                ctx.reference(raw=obj, relationship="triggers_on",
                              location=f"{path}/fullName",
                              target_type="CustomObject", confidence="medium")
        elif name == "matchingRuleItems":
            field = child_text(elem, "fieldName")
            if field:
                ctx.consume(path)
                ctx.reference(raw=field, relationship="reads",
                              location=f"{path}/fieldName",
                              target_type="CustomField", target_parent=obj,
                              match_algorithm=child_text(elem, "matchingMethod"))
    if ctx._references == 0:
        ctx.reason("a matching rule file with no rule items in it")


def extract_entitlement_process(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    obj = child_text(root, "SObjectType") or child_text(root, "sObjectType") or ""
    ctx.component(entitlement_object=obj, active=child_text(root, "active"))
    if obj:
        ctx.reference(raw=obj, relationship="triggers_on", location="SObjectType",
                      target_type="CustomObject")
    for elem, path in walk(root):
        name = local(elem)
        if name in ("entryStartDateField", "businessHours"):
            value = text_of(elem)
            if value:
                ctx.reference(raw=value, relationship="reads", location=path,
                              target_type=("CustomField"
                                           if name == "entryStartDateField"
                                           else "BusinessHoursEntry"),
                              target_parent=obj if name == "entryStartDateField" else "")
        elif name == "milestones":
            milestone = child_text(elem, "milestoneName")
            if milestone:
                ctx.reference(raw=milestone, relationship="references",
                              location=f"{path}/milestoneName",
                              target_type="MilestoneType")
    if ctx._references == 0:
        ctx.reason("an entitlement process with no object and no milestones")

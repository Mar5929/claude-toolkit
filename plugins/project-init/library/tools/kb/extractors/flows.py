"""flows.py — every element type a flow can hold, not just the six that were read.

The audit measured what the old parser handled: recordUpdates, recordCreates,
recordLookups, decisions, assignments and the start element. Everything else was
dropped, and two of the gaps mattered more than the rest:

* `subflows` (12 flow files) and `actionCalls` (89 files) are how a flow calls
  another flow, calls Apex, sends an email alert or fires a quick action. With
  both missing the graph held zero edges pointing AT a flow and zero flow-to-Apex
  edges, so a flow looked like a leaf that nothing could reach.
* `recordDeletes` (5 files) meant a flow that deletes records looked like a flow
  that only reads them.

Also handled here and absent before: loops, screens and their Lightning
components, typed variables, dynamic choice sets, formulas, waits, transforms,
collection processors, Apex plugin calls, custom errors and orchestrated stages.

An `actionCall` says what kind of thing it calls in its own `actionType`, so the
target type comes from the file rather than from a guess.
"""

from __future__ import annotations

from .names import formula_references, merge_field_references
from .xmlutil import child_text, child_texts, children, local, text_of, walk

# actionType -> what actionName names. An empty string means the action is a
# standard platform action with no component of its own, so the reference is
# recorded with no expected type and phase 3 marks it accordingly.
ACTION_TYPES = {
    "apex": "ApexClass",
    "flow": "Flow",
    "emailAlert": "WorkflowAlert",
    "quickAction": "QuickAction",
    "component": "LightningComponentBundle",
    "externalService": "ExternalServiceRegistration",
    "outboundMessage": "WorkflowOutboundMessage",
    "submit": "ApprovalProcess",
    "deployApprovalProcess": "ApprovalProcess",
    "generativePromptTemplate": "GenAiPromptTemplate",
}

# Prefixes a flow uses to point at the record it is running on.
RECORD_PREFIXES = ("$Record__Prior.", "$Record.", "$Record_Prior.")


def _record_field(text):
    """The field name in "$Record.Priority", or None when it is not one."""
    if not text:
        return None
    for prefix in RECORD_PREFIXES:
        if text.startswith(prefix):
            return text[len(prefix):]
    return None


def extract_flow(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return

    start = next(children(root, "start"), None)
    start_object = child_text(start, "object") if start is not None else None
    trigger_type = child_text(start, "triggerType") if start is not None else None

    ctx.component(
        process_type=child_text(root, "processType"),
        status=child_text(root, "status"),
        api_version=child_text(root, "apiVersion"),
        trigger_type=trigger_type,
        record_trigger_type=(child_text(start, "recordTriggerType")
                             if start is not None else None),
        start_object=start_object,
    )

    # Variables of an object type name that object, and later elements refer to
    # the variable rather than the object, so keep the mapping.
    variable_objects = {}
    for elem, _path in walk(root):
        if local(elem) in ("variables", "transforms", "recordLookups",
                           "recordCreates", "recordUpdates", "recordDeletes"):
            name = child_text(elem, "name")
            obj = child_text(elem, "objectType") or child_text(elem, "object")
            if name and obj:
                variable_objects[name] = obj

    def scope_for(elem, fallback=None):
        """Which object a bare field name inside this element belongs to."""
        explicit = child_text(elem, "object") or child_text(elem, "objectType")
        if explicit:
            return explicit
        ref = child_text(elem, "inputReference") or child_text(elem, "collectionReference")
        if ref:
            head = ref.split(".", 1)[0]
            if head in variable_objects:
                return variable_objects[head]
            if "$Record" in ref:
                return start_object
        return fallback or start_object

    for elem, path in walk(root):
        name = local(elem)

        # --- what the flow runs on ------------------------------------
        if name == "start":
            if start_object:
                ctx.reference(raw=start_object, relationship="triggers_on",
                              location=f"{path}/object", target_type="CustomObject",
                              trigger_type=trigger_type)
            _emit_filters(ctx, elem, path, start_object)
            _emit_formula(ctx, child_text(elem, "filterFormula"),
                          f"{path}/filterFormula", start_object)

        elif name == "scheduledPaths":
            field = child_text(elem, "offsetUnit") and child_text(elem, "recordField")
            if field:
                ctx.reference(raw=field, relationship="reads",
                              location=f"{path}/recordField",
                              target_type="CustomField", target_parent=start_object)

        # --- data elements --------------------------------------------
        elif name in ("recordCreates", "recordUpdates"):
            target = scope_for(elem)
            if target:
                ctx.reference(raw=target, relationship="writes", location=path,
                              target_type="CustomObject", element=name)
            _emit_input_assignments(ctx, elem, path, target)
            _emit_filters(ctx, elem, path, target)

        elif name == "recordDeletes":
            target = scope_for(elem)
            if target:
                ctx.reference(raw=target, relationship="deletes", location=path,
                              target_type="CustomObject")
            _emit_filters(ctx, elem, path, target)

        elif name == "recordLookups":
            target = scope_for(elem)
            if target:
                ctx.reference(raw=target, relationship="reads", location=path,
                              target_type="CustomObject")
            for queried, qpath in _leaf_paths(elem, path, "queriedFields"):
                ctx.reference(raw=queried, relationship="reads", location=qpath,
                              target_type="CustomField", target_parent=target)
            sort_field = child_text(elem, "sortField")
            if sort_field:
                ctx.reference(raw=sort_field, relationship="sorts_by",
                              location=f"{path}/sortField",
                              target_type="CustomField", target_parent=target)
            _emit_filters(ctx, elem, path, target)
            for oa, oa_path in walk(elem, path):
                if local(oa) == "outputAssignments":
                    field = child_text(oa, "field")
                    if field:
                        ctx.reference(raw=field, relationship="reads",
                                      location=f"{oa_path}/field",
                                      target_type="CustomField",
                                      target_parent=target)

        # --- calling other things -------------------------------------
        elif name == "subflows":
            flow_name = child_text(elem, "flowName")
            if flow_name:
                ctx.reference(raw=flow_name, relationship="calls_subflow",
                              location=f"{path}/flowName", target_type="Flow")

        elif name == "actionCalls":
            _emit_action_call(ctx, elem, path)

        elif name == "apexPluginCalls":
            apex_class = child_text(elem, "apexClass")
            if apex_class:
                ctx.reference(raw=apex_class, relationship="invokes",
                              location=f"{path}/apexClass", target_type="ApexClass")

        elif name in ("orchestratedStages", "stageSteps"):
            _emit_action_call(ctx, elem, path)

        # --- logic ------------------------------------------------------
        elif name in ("decisions", "assignments", "collectionProcessors",
                      "waits", "customErrors", "steps", "transforms"):
            _emit_references_in(ctx, elem, path, scope_for(elem), variable_objects,
                                start_object)

        elif name == "loops":
            collection = child_text(elem, "collectionReference")
            if collection:
                head = collection.split(".", 1)[0]
                obj = variable_objects.get(head)
                if obj:
                    ctx.reference(raw=obj, relationship="reads",
                                  location=f"{path}/collectionReference",
                                  target_type="CustomObject", confidence="medium",
                                  through_variable=head)

        elif name == "screens":
            _emit_screen(ctx, elem, path, start_object, variable_objects)

        elif name == "variables":
            obj = child_text(elem, "objectType")
            if obj:
                ctx.reference(raw=obj, relationship="references", location=f"{path}/objectType",
                              target_type="CustomObject",
                              variable=child_text(elem, "name"))

        elif name == "dynamicChoiceSets":
            obj = child_text(elem, "object")
            if obj:
                ctx.reference(raw=obj, relationship="reads", location=f"{path}/object",
                              target_type="CustomObject")
            for tag_name, relationship in (("displayField", "displays"),
                                           ("valueField", "reads"),
                                           ("sortField", "sorts_by")):
                value = child_text(elem, tag_name)
                if value:
                    ctx.reference(raw=value, relationship=relationship,
                                  location=f"{path}/{tag_name}",
                                  target_type="CustomField", target_parent=obj)
            _emit_filters(ctx, elem, path, obj)

        elif name == "formulas":
            _emit_formula(ctx, child_text(elem, "expression"),
                          f"{path}/expression", start_object)

        elif name == "textTemplates":
            for ref in merge_field_references(child_text(elem, "text") or ""):
                ctx.reference(raw=ref["raw"], relationship="reads",
                              location=f"{path}/text", target_type="CustomField",
                              target_parent=start_object, confidence="medium",
                              merge_field=True)

    if ctx._references == 0:
        ctx.reason("a flow whose elements name no object, field, action or subflow")


def _leaf_paths(elem, base, tag_name):
    """(text, path) for every descendant leaf with this tag."""
    for desc, path in walk(elem, base):
        if local(desc) == tag_name and text_of(desc):
            yield text_of(desc), path


def _emit_action_call(ctx, elem, path) -> None:
    """One actionCall: what it calls comes from its own actionType."""
    action_name = child_text(elem, "actionName")
    action_type = child_text(elem, "actionType") or ""
    if not action_name:
        ctx.note(f"actionCall at {path} has no actionName")
        return

    target_type = ACTION_TYPES.get(action_type, "")
    if action_type == "apex":
        relationship = "invokes"
    elif action_type == "flow":
        relationship = "calls_flow"
    elif action_type == "emailAlert":
        relationship = "sends_email_alert"
    elif action_type == "outboundMessage":
        relationship = "sends_outbound_message"
    elif action_type == "quickAction":
        relationship = "displays_action"
    elif action_type == "submit":
        relationship = "invokes"
    else:
        relationship = "invokes"

    ctx.reference(raw=action_name, relationship=relationship,
                  location=f"{path}/actionName", target_type=target_type,
                  action_type=action_type or None,
                  standard_action=(not target_type) or None)


def _emit_input_assignments(ctx, elem, path, target_object) -> None:
    for assign, apath in walk(elem, path):
        if local(assign) != "inputAssignments":
            continue
        field = child_text(assign, "field")
        if field:
            ctx.reference(raw=field, relationship="writes",
                          location=f"{apath}/field", target_type="CustomField",
                          target_parent=target_object)
        for value, vpath in walk(assign, apath):
            if local(value) == "elementReference":
                _emit_record_reference(ctx, text_of(value), vpath, target_object)


def _emit_filters(ctx, elem, path, target_object) -> None:
    for filt, fpath in walk(elem, path):
        if local(filt) not in ("filters", "filterItems", "conditions",
                               "recordFilters"):
            continue
        field = child_text(filt, "field")
        if field:
            ctx.reference(raw=field, relationship="filters_on",
                          location=f"{fpath}/field", target_type="CustomField",
                          target_parent=target_object,
                          operator=child_text(filt, "operator"))
        for tag_name in ("leftValueReference", "rightValue", "value"):
            for value, vpath in walk(filt, fpath):
                if local(value) == tag_name:
                    _emit_record_reference(ctx, text_of(value), vpath, target_object)


def _emit_references_in(ctx, elem, path, scope, variable_objects, start_object) -> None:
    """Record references buried anywhere inside a logic element."""
    reference_tags = {
        "leftValueReference", "rightValueReference", "elementReference",
        "assignToReference", "inputReference", "collectionReference",
        "sortFieldName", "targetReference",
    }
    for desc, dpath in walk(elem, path):
        name = local(desc)
        if name == "actionName" and child_text(elem, "actionType"):
            continue
        if name in reference_tags:
            _emit_record_reference(ctx, text_of(desc), dpath,
                                   scope or start_object, variable_objects)
        elif name == "field":
            value = text_of(desc)
            if value:
                ctx.reference(raw=value, relationship="references", location=dpath,
                              target_type="CustomField",
                              target_parent=scope or start_object)


def _emit_record_reference(ctx, text, path, target_object, variable_objects=None) -> None:
    """A $Record.Field, $Label.X or Variable.Field reference inside a flow."""
    if not text:
        return
    field = _record_field(text)
    if field:
        if "." in field:
            ctx.reference(raw=text, relationship="reads", location=path,
                          target_type="CustomField", confidence="medium",
                          traversal=True)
        else:
            ctx.reference(raw=field, relationship="reads", location=path,
                          target_type="CustomField", target_parent=target_object,
                          confidence="medium")
        return
    if text.startswith("$"):
        for ref in formula_references(text):
            if ref["kind"] == "global":
                ctx.reference(raw=ref["raw"], relationship="reads", location=path,
                              target_type=ref["global_name"], confidence="medium")
        return
    if variable_objects and "." in text:
        head, rest = text.split(".", 1)
        obj = variable_objects.get(head)
        if obj and "." not in rest:
            ctx.reference(raw=rest, relationship="reads", location=path,
                          target_type="CustomField", target_parent=obj,
                          confidence="medium", through_variable=head)


def _emit_screen(ctx, elem, path, start_object, variable_objects) -> None:
    """Screen components: a screen can host an Aura or Lightning web component."""
    for field, fpath in walk(elem, path):
        if local(field) != "fields":
            continue
        extension = child_text(field, "extensionName")
        if extension:
            target = ("AuraDefinitionBundle" if extension.startswith("c:")
                      else "LightningComponentBundle")
            ctx.reference(raw=extension, relationship="displays_component",
                          location=f"{fpath}/extensionName", target_type=target)
        object_field = child_text(field, "objectFieldReference")
        if object_field:
            ctx.reference(raw=object_field, relationship="displays",
                          location=f"{fpath}/objectFieldReference",
                          target_type="CustomField")
        for desc, dpath in walk(field, fpath):
            if local(desc) == "elementReference":
                _emit_record_reference(ctx, text_of(desc), dpath, start_object,
                                       variable_objects)


def _emit_formula(ctx, formula, path, obj) -> None:
    if not formula:
        return
    for ref in formula_references(formula):
        if ref["kind"] == "global":
            ctx.reference(raw=ref["raw"], relationship="reads", location=path,
                          target_type=ref["global_name"], confidence="medium")
        else:
            raw = ref["raw"]
            field = _record_field(raw) or raw
            ctx.reference(raw=field, relationship="reads", location=path,
                          target_type="CustomField",
                          target_parent="" if "." in field else obj,
                          confidence="medium")


# ---------------------------------------------------------------------------
# FlowDefinition
# ---------------------------------------------------------------------------

def extract_flow_definition(ctx) -> None:
    """249 files. A flow definition says which version of its flow is live."""
    root = ctx.xml_root
    if root is None:
        return
    active = child_text(root, "activeVersionNumber")
    ctx.component(active_version=active)
    ctx.reference(raw=ctx.component_name, relationship="active_version_of",
                  location="activeVersionNumber" if active else "fullName",
                  target_type="Flow", active_version=active)

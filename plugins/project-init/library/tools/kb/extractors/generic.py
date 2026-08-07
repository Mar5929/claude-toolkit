"""generic.py — the one pass that runs over every metadata XML file there is.

SPEC decision 6: one generic pass plus deep extractors, rather than 106
hand-written extractors. This is the generic pass. It reads any Salesforce
metadata XML and picks out the elements whose NAME says they hold a reference
(`field`, `object`, `referenceTo`, `recordType`, `flow`, `apexClass`,
`targetObject`, and the rest of the table below), so every one of the 106 types
produces something rather than nothing.

It runs on every XML file, including the types that also have a deep extractor.
Both passes build element paths through `xmlutil.walk()`, so when they read the
same element they report the same location and the driver drops the duplicate,
keeping the deep extractor's version. That way the generic pass is a safety net
under the deep extractors rather than an alternative to them.

What it deliberately does not do: guess. A tag it does not recognise is counted
in the tag census rather than turned into a reference, and the census is printed
with the coverage report. That is how the table below grows: from a count of what
is actually in the two orgs, not from a list somebody thought of.
"""

from __future__ import annotations

import re

from .contracts import category_for
from .names import formula_references, merge_field_references
from .xmlutil import is_leaf, local, text_of, walk

# tag name -> (expected target type, relationship, value shape)
#
# value shape:
#   "api"    the value must be an api name or a dotted api name
#   "loose"  the value may hold spaces and punctuation (layout names, report
#            names, component names like flexipage:richText)
GENERIC_REFERENCE_TAGS = {
    # --- fields ---------------------------------------------------------
    "field": ("CustomField", "references", "api"),
    "fields": ("CustomField", "references", "api"),
    "fieldName": ("CustomField", "references", "api"),
    "fieldNames": ("CustomField", "references", "api"),
    "targetField": ("CustomField", "references", "api"),
    "controllingField": ("CustomField", "controlled_by", "api"),
    "valueField": ("CustomField", "references", "api"),
    "labelField": ("CustomField", "references", "api"),
    "sortField": ("CustomField", "sorts_by", "api"),
    "criteriaField": ("CustomField", "filters_on", "api"),
    "dateColumn": ("CustomField", "references", "api"),
    "groupingColumn": ("CustomField", "groups_by", "api"),
    "primaryFieldName": ("CustomField", "references", "api"),
    "fieldToMatch": ("CustomField", "references", "api"),
    "lookupField": ("CustomField", "references", "api"),
    "sourceField": ("CustomField", "references", "api"),
    "matchField": ("CustomField", "references", "api"),
    "keyField": ("CustomField", "references", "api"),
    "durationField": ("CustomField", "references", "api"),
    "senderField": ("CustomField", "references", "api"),

    # --- objects --------------------------------------------------------
    "object": ("CustomObject", "references", "api"),
    "objects": ("CustomObject", "references", "api"),
    "objectName": ("CustomObject", "references", "api"),
    "sobjectType": ("CustomObject", "references", "api"),
    "sObjectType": ("CustomObject", "references", "api"),
    "entityName": ("CustomObject", "references", "api"),
    "entityApiName": ("CustomObject", "references", "api"),
    "targetObject": ("CustomObject", "targets_object", "api"),
    "relatedObject": ("CustomObject", "references", "api"),
    "baseObject": ("CustomObject", "references", "api"),
    "primaryObject": ("CustomObject", "references", "api"),
    "referenceTo": ("CustomObject", "lookup", "api"),
    "sobjectName": ("CustomObject", "references", "api"),
    "customObject": ("CustomObject", "references", "api"),
    "relatedEntity": ("CustomObject", "references", "api"),
    "childObject": ("CustomObject", "references", "api"),
    "parentObject": ("CustomObject", "references", "api"),

    # --- record types ---------------------------------------------------
    "recordType": ("RecordType", "references", "loose"),
    "recordTypes": ("RecordType", "references", "loose"),
    "recordTypeName": ("RecordType", "references", "loose"),
    "defaultRecordTypeMapping": ("RecordType", "references", "loose"),

    # --- automation -----------------------------------------------------
    "flow": ("Flow", "calls_flow", "api"),
    "flowName": ("Flow", "calls_flow", "api"),
    "flowDefinition": ("Flow", "calls_flow", "api"),
    "referencedFlow": ("Flow", "calls_flow", "api"),
    "autoLaunchedFlow": ("Flow", "calls_flow", "api"),

    # --- apex and code --------------------------------------------------
    "apexClass": ("ApexClass", "invokes", "api"),
    "apexClasses": ("ApexClass", "invokes", "api"),
    "className": ("ApexClass", "invokes", "api"),
    "classes": ("ApexClass", "invokes", "api"),
    "controller": ("ApexClass", "invokes", "api"),
    "extensions": ("ApexClass", "invokes", "api"),
    "handlerClass": ("ApexClass", "invokes", "api"),
    "executeApexClass": ("ApexClass", "invokes", "api"),
    "apexPage": ("ApexPage", "references", "api"),
    "page": ("ApexPage", "references", "api"),
    "pageName": ("ApexPage", "references", "api"),
    "visualforcePage": ("ApexPage", "references", "api"),
    "lightningComponent": ("LightningComponentBundle", "displays_component", "loose"),
    "componentName": ("", "displays_component", "loose"),
    "lwcName": ("LightningComponentBundle", "displays_component", "loose"),
    "auraComponent": ("AuraDefinitionBundle", "displays_component", "loose"),

    # --- interface ------------------------------------------------------
    "layout": ("Layout", "references", "loose"),
    "layoutName": ("Layout", "references", "loose"),
    "flexiPage": ("FlexiPage", "references", "loose"),
    "parentFlexiPage": ("FlexiPage", "references", "loose"),
    "tab": ("CustomTab", "shows_tab", "loose"),
    "tabs": ("CustomTab", "shows_tab", "loose"),
    "customTab": ("CustomTab", "shows_tab", "loose"),
    "defaultLandingTab": ("CustomTab", "shows_tab", "loose"),
    "application": ("CustomApplication", "references", "loose"),
    "quickActionName": ("QuickAction", "displays_action", "loose"),
    "quickAction": ("QuickAction", "displays_action", "loose"),
    "actionName": ("QuickAction", "displays_action", "loose"),
    "fieldSet": ("FieldSet", "references", "api"),

    # --- security -------------------------------------------------------
    "profile": ("Profile", "assigned_to", "loose"),
    "profiles": ("Profile", "assigned_to", "loose"),
    "profileName": ("Profile", "assigned_to", "loose"),
    "permissionSet": ("PermissionSet", "contains_permission_set", "api"),
    "permissionSets": ("PermissionSet", "contains_permission_set", "api"),
    "permissionSetName": ("PermissionSet", "contains_permission_set", "api"),
    "customPermission": ("CustomPermission", "grants_custom_permission", "api"),
    "customPermissions": ("CustomPermission", "grants_custom_permission", "api"),
    "group": ("Group", "shares_with", "loose"),
    "groups": ("Group", "shares_with", "loose"),
    "queue": ("Queue", "shares_with", "loose"),
    "queueName": ("Queue", "shares_with", "loose"),
    "role": ("Role", "shares_with", "loose"),
    "roles": ("Role", "shares_with", "loose"),
    "roleAndSubordinates": ("Role", "shares_with", "loose"),
    "roleAndSubordinatesInternal": ("Role", "shares_with", "loose"),
    "territory": ("Territory", "shares_with", "loose"),
    "sharedTo": ("", "shares_with", "loose"),

    # --- analytics ------------------------------------------------------
    "report": ("Report", "references", "loose"),
    "reportName": ("Report", "references", "loose"),
    "reportType": ("ReportType", "references", "loose"),
    "dashboard": ("Dashboard", "references", "loose"),
    "dashboardName": ("Dashboard", "references", "loose"),

    # --- data and values ------------------------------------------------
    "valueSetName": ("GlobalValueSet", "value_set_of", "api"),
    "globalValueSet": ("GlobalValueSet", "value_set_of", "api"),
    "template": ("EmailTemplate", "references", "loose"),
    "templateName": ("EmailTemplate", "references", "loose"),
    "staticResource": ("StaticResource", "references", "api"),

    # --- integration ----------------------------------------------------
    "namedCredential": ("NamedCredential", "uses_credential", "loose"),
    "externalCredential": ("ExternalCredential", "uses_credential", "loose"),
    "externalDataSource": ("ExternalDataSource", "uses_data_source", "loose"),
    "dataSource": ("ExternalDataSource", "uses_data_source", "loose"),
    "endpointUrl": ("", "calls_endpoint", "loose"),
    "endpoint": ("", "calls_endpoint", "loose"),
    "eventChannel": ("PlatformEventChannel", "publishes_to", "loose"),
    "selectedEntity": ("CustomObject", "references", "api"),
    "connectedApp": ("ConnectedApp", "references", "loose"),
    "connectedAppName": ("ConnectedApp", "references", "loose"),
    "externalClientApplication": ("ExternalClientApplication", "references", "loose"),
    "authProvider": ("AuthProvider", "uses_credential", "loose"),
    "registrationHandler": ("ApexClass", "invokes", "api"),

    # --- types the tag census turned up ---------------------------------
    # Each of these was a leaf element the generic pass met, did not
    # recognise, and counted. The census is what made them visible; adding
    # them here is that count being acted on.
    "destinationFlowDefinition": ("Flow", "references", "api"),
    "defaultBrandingSet": ("BrandingSet", "references", "loose"),
    "targetEntity": ("CustomObject", "targets_object", "api"),
    "relatedEntityType": ("CustomObject", "references", "api"),
    "channel": ("ServiceChannel", "references", "loose"),
    "customApplication": ("CustomApplication", "references", "loose"),
    "explainabilityActionDef": ("ExplainabilityActionDefinition", "references",
                                "loose"),
    "requiredPermission": ("CustomPermission", "grants_custom_permission", "loose"),
    "user": ("User", "assigned_to", "loose"),
    "executionUser": ("User", "assigned_to", "loose"),
    "runAsUser": ("User", "assigned_to", "loose"),
    "integrationUser": ("User", "assigned_to", "loose"),
    "siteAdmin": ("User", "assigned_to", "loose"),
    "siteGuestRecordDefaultOwner": ("User", "assigned_to", "loose"),
    "indexPage": ("ApexPage", "displays_component", "loose"),
    "inactiveIndexPage": ("ApexPage", "displays_component", "loose"),
    "authorizationRequiredPage": ("ApexPage", "displays_component", "loose"),
    "bandwidthExceededPage": ("ApexPage", "displays_component", "loose"),
    "fileNotFoundPage": ("ApexPage", "displays_component", "loose"),
    "genericErrorPage": ("ApexPage", "displays_component", "loose"),
    "inMaintenancePage": ("ApexPage", "displays_component", "loose"),
    "templatePage": ("ApexPage", "displays_component", "loose"),
    "milestoneName": ("MilestoneType", "references", "loose"),
    "businessHours": ("BusinessHoursEntry", "references", "loose"),
}

# Elements holding a name in one child and what kind of thing it is in another,
# so the target type comes from the file rather than from a guess. AppMenu writes
# `<appMenuItems><name>Sales</name><type>CustomApplication</type>`, and a record
# action deployment writes `<channelItems><action>X</action><type>Flow</type>`.
TYPED_NAME_ELEMENTS = {
    "appMenuItems": ("name", "type", "shows_tab"),
    "channelItems": ("action", "type", "displays_action"),
    "actions": ("name", "type", "invokes"),
}

# Values a `type` sibling can hold that name a real metadata type.
_TYPE_VALUES = frozenset({
    "CustomApplication", "CustomTab", "Flow", "QuickAction", "ApexPage",
    "LightningComponentBundle", "AuraDefinitionBundle", "FlexiPage", "Layout",
    "Report", "Dashboard", "ApexClass", "CustomObject", "RecordType",
})

# Leaf tags holding a formula. Every one gets run through the formula reader, so
# standard fields and cross-object references come out of any type, deep
# extractor or not.
GENERIC_FORMULA_TAGS = frozenset({
    "formula", "errorConditionFormula", "formulaExpression", "expression",
    "entryConditionFormula", "exitConditionFormula", "filterFormula",
    "criteriaFormula", "displayFormula", "conditionFormula",
})

# Leaf tags that may hold {!Merge.Fields}.
GENERIC_MERGE_FIELD_TAGS = frozenset({
    "url", "linkUrl", "buttonUrl", "subject", "body", "textBody", "htmlBody",
    "message", "description2",
})

# Values that are shaped like a reference but are not one: picklist and
# checkbox values, and the words Salesforce uses for "everyone".
_NOISE_VALUES = frozenset({
    "true", "false", "null", "none", "all", "any", "default",
})

_API_SHAPE = re.compile(r"^\$?[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$")
# The "@" is there so a username reads as a reference: runAsUser, siteAdmin and
# integrationUser all name a User by their login, which is an email address.
_LOOSE_SHAPE = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.\-: /()&',@]*$")
_MAX_VALUE_LENGTH = 255


def value_is_reference_shaped(value: str, shape: str) -> bool:
    """Is this text plausibly a reference rather than prose or a setting?"""
    if not value or len(value) > _MAX_VALUE_LENGTH:
        return False
    if value.lower() in _NOISE_VALUES:
        return False
    if "\n" in value:
        return False
    if shape == "api":
        return bool(_API_SHAPE.match(value))
    return bool(_LOOSE_SHAPE.match(value))


def extract_generic(ctx) -> None:
    """Run the generic pass over one already-parsed metadata XML document.

    `ctx.xml_root` must be set by the driver. Emits under ctx's own component id,
    which the driver guarantees exists before this runs.
    """
    root = getattr(ctx, "xml_root", None)
    if root is None:
        return

    mtype = ctx.metadata_type
    for elem, path in walk(root):
        if ctx.is_consumed(path):
            continue
        tag_name = local(elem)

        if not is_leaf(elem):
            # A parent whose children say both the name and its kind.
            if tag_name in TYPED_NAME_ELEMENTS:
                _emit_typed_name(ctx, elem, path, tag_name)
            continue

        value = text_of(elem)
        if not value:
            continue

        if tag_name == "url":
            if "{!" in value:
                _emit_merge_fields(ctx, value, path)
            elif value.startswith(("http://", "https://", "/")):
                ctx.reference(raw=value, relationship="calls_endpoint",
                              location=path, confidence="high", external=True)
            else:
                ctx.result.census(mtype, "url (not a link or a merge field)")
            continue

        if tag_name in ("urlPattern", "loginUrl", "logoutUrl", "callbackUrl",
                        "authorizeUrl", "tokenUrl", "userInfoUrl"):
            ctx.reference(raw=value, relationship="calls_endpoint", location=path,
                          confidence="high", external=True)
            continue

        rule = GENERIC_REFERENCE_TAGS.get(tag_name)
        if rule is not None:
            target_type, relationship, shape = rule
            if value_is_reference_shaped(value, shape):
                ctx.reference(
                    raw=value,
                    relationship=relationship,
                    category=category_for(relationship),
                    location=path,
                    target_type=target_type,
                    target_parent=_scope_for(ctx, tag_name),
                    confidence="high",
                )
                continue
            ctx.result.census(mtype, f"{tag_name} (value not reference-shaped)")
            continue

        if tag_name in GENERIC_FORMULA_TAGS:
            _emit_formula(ctx, value, path)
            continue

        if tag_name in GENERIC_MERGE_FIELD_TAGS and "{!" in value:
            _emit_merge_fields(ctx, value, path)
            continue

        ctx.result.census(mtype, tag_name)


def _emit_typed_name(ctx, elem, path, tag_name) -> None:
    """One `<name>X</name><type>CustomApplication</type>` pair."""
    name_child, type_child, relationship = TYPED_NAME_ELEMENTS[tag_name]
    value = None
    kind = None
    for child in elem:
        child_tag = local(child)
        if child_tag == name_child:
            value = text_of(child)
        elif child_tag == type_child:
            kind = text_of(child)
    if not value:
        return
    target_type = kind if kind in _TYPE_VALUES else ""
    ctx.reference(raw=value, relationship=relationship,
                  location=f"{path}/{name_child}", target_type=target_type,
                  confidence="high", declared_type=kind)
    ctx.consume(f"{path}/{name_child}")
    if kind:
        ctx.consume(f"{path}/{type_child}")


def _scope_for(ctx, tag_name: str) -> str:
    """What a bare field name is relative to, when the file itself says.

    Inside an object subfolder every bare field name belongs to that object, so
    a `<field>Priority</field>` in a list view on Case resolves against Case.
    Elsewhere the generic pass does not know, and says so by leaving it blank.
    """
    if tag_name not in ("field", "fields", "fieldName", "fieldNames",
                        "criteriaField", "sortField", "controllingField",
                        "groupingColumn", "targetField", "lookupField"):
        return ""
    if ctx.rel_path.startswith("objects/") and ctx.parent_name:
        return ctx.parent_name
    return ""


def _emit_formula(ctx, formula: str, path: str) -> None:
    """Every reference a formula makes, standard fields included."""
    scope = ctx.parent_name if ctx.rel_path.startswith("objects/") else ""
    for ref in formula_references(formula):
        if ref["kind"] == "global":
            ctx.reference(
                raw=ref["raw"], relationship="references",
                location=path, target_type=ref["global_name"],
                confidence="medium", formula_global=True,
            )
        elif ref["kind"] == "traversal":
            ctx.reference(
                raw=ref["raw"], relationship="formula_references",
                location=path, target_type="CustomField",
                confidence="medium", traversal=True,
            )
        else:
            ctx.reference(
                raw=ref["raw"], relationship="formula_references",
                location=path, target_type="CustomField",
                target_parent=scope, confidence="medium",
            )


def _emit_merge_fields(ctx, text: str, path: str) -> None:
    scope = ctx.parent_name if ctx.rel_path.startswith("objects/") else ""
    for ref in merge_field_references(text):
        ctx.reference(
            raw=ref["raw"],
            relationship="references",
            location=path,
            target_type=ref["global_name"] or "CustomField",
            target_parent="" if ref["kind"] != "field" else scope,
            confidence="medium",
            merge_field=True,
        )

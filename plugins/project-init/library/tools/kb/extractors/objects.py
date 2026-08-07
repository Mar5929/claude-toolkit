"""objects.py — the object model: objects, fields, and everything inside them.

This module closes the two largest measured gaps in the audit.

**Lookups and master-detail relationships did not exist.** The old field parser
read label, type, formula, defaultValue and the rollup elements, and never read
`referenceTo`. 205 field files across Red and Blue carry one and the old graph
held zero lookup edges, so the backbone of the object model was simply absent.
`extract_custom_field` reads it, and tells a master-detail from a lookup by the
field's own `type`.

**Formulas only ever matched custom fields.** The pattern was `..__c`, so a
formula on StageName, Amount or Priority produced nothing and a cross-object
reference like Account.Industry was dropped. Formula reading now goes through
`names.formula_references`, which treats a bare word as a field unless it is a
function call, a quoted string or a literal.

It also opens the object subfolders nothing opened before: list views (574 files
across the two orgs), web links (145), compact layouts (29), business processes
(21) and field sets (6).
"""

from __future__ import annotations

from .names import formula_references, merge_field_references
from .xmlutil import child_text, child_texts, children, local, text_of, walk

# A field's `type` decides what its referenceTo means.
_MASTER_DETAIL_TYPES = {"MasterDetail"}
_LOOKUP_TYPES = {"Lookup", "Hierarchy", "MetadataRelationship"}


def _object_of(ctx) -> str:
    """The object a file inside objects/<Name>/ belongs to."""
    return ctx.parent_name or ctx.component_name.split(".", 1)[0]


def _emit_formula(ctx, formula, path, obj, relationship="formula_references"):
    """Every reference in a formula, standard and cross-object included."""
    if not formula:
        return 0
    count = 0
    for ref in formula_references(formula):
        if ref["kind"] == "global":
            ctx.reference(raw=ref["raw"], relationship="references", location=path,
                          target_type=ref["global_name"], confidence="medium",
                          formula_global=True)
        elif ref["kind"] == "traversal":
            ctx.reference(raw=ref["raw"], relationship=relationship, location=path,
                          target_type="CustomField", confidence="medium",
                          traversal=True)
        else:
            ctx.reference(raw=ref["raw"], relationship=relationship, location=path,
                          target_type="CustomField", target_parent=obj,
                          confidence="medium")
        count += 1
    return count


# ---------------------------------------------------------------------------
# CustomObject
# ---------------------------------------------------------------------------

def extract_custom_object(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    obj = ctx.component_name

    ctx.component(
        sharing_model=child_text(root, "sharingModel"),
        deployment_status=child_text(root, "deploymentStatus"),
        external_data_source=child_text(root, "externalDataSource"),
        custom_settings_type=child_text(root, "customSettingsType"),
    )

    for elem, path in walk(root):
        name = local(elem)

        if name == "nameField":
            _emit_formula(ctx, child_text(elem, "displayFormat"), f"{path}/displayFormat", obj)

        elif name == "actionOverrides":
            action = child_text(elem, "actionName")
            content = child_text(elem, "content")
            page_or_type = child_text(elem, "type")
            if content:
                target = "FlexiPage" if page_or_type == "Flexipage" else "ApexPage"
                ctx.reference(raw=content, relationship="overrides_action",
                              location=f"{path}/content", target_type=target,
                              action=action)

        elif name == "compactLayoutAssignment":
            ctx.reference(raw=text_of(elem), relationship="displays",
                          location=path, target_type="CompactLayout",
                          target_parent=obj)

        elif name == "externalDataSource":
            ctx.reference(raw=text_of(elem), relationship="uses_data_source",
                          location=path, target_type="ExternalDataSource")

        # Single-file objects keep their children inline rather than in
        # subfolders. Both shapes exist in these snapshots.
        elif name == "fields":
            full = child_text(elem, "fullName")
            if full:
                _emit_inline_field(ctx, elem, path, obj, full)

        elif name == "validationRules":
            full = child_text(elem, "fullName")
            if full:
                _emit_formula(ctx, child_text(elem, "errorConditionFormula"),
                              f"{path}/errorConditionFormula", obj, "references")

    if ctx._references == 0:
        ctx.reason("object definition holds settings and labels only; its fields, "
                   "record types and rules are separate files in this snapshot")


def _emit_inline_field(ctx, elem, path, obj, full_name) -> None:
    """A <fields> block inside a single-file object definition."""
    for ref in child_texts(elem, "referenceTo"):
        field_type = child_text(elem, "type") or ""
        relationship = "master_detail" if field_type in _MASTER_DETAIL_TYPES else "lookup"
        ctx.reference(raw=ref, relationship=relationship,
                      location=f"{path}/referenceTo", target_type="CustomObject",
                      field=full_name)
    _emit_formula(ctx, child_text(elem, "formula"), f"{path}/formula", obj)


# ---------------------------------------------------------------------------
# CustomField
# ---------------------------------------------------------------------------

def extract_custom_field(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    obj = _object_of(ctx)
    field_type = child_text(root, "type") or ""

    ctx.component(
        field_type=field_type,
        is_custom=ctx.component_name.endswith("__c"),
        relationship_name=child_text(root, "relationshipName"),
        required=child_text(root, "required"),
        # A formula field's `type` is the type of its ANSWER (Text, Currency),
        # not the word "Formula", so nothing else on the component says it is a
        # formula. classify_fields.py needs to know, including for a formula
        # that references no other field and so produces no edge at all.
        is_formula=bool(child_text(root, "formula")),
        summary_operation=child_text(root, "summaryOperation"),
    )

    # The gap: referenceTo was never read, so no lookup or master-detail link
    # existed anywhere in the graph.
    for elem, path in walk(root):
        name = local(elem)

        if name == "referenceTo":
            if field_type in _MASTER_DETAIL_TYPES:
                relationship = "master_detail"
            elif field_type in _LOOKUP_TYPES or not field_type:
                relationship = "lookup"
            else:
                relationship = "lookup"
            ctx.reference(raw=text_of(elem), relationship=relationship,
                          location=path, target_type="CustomObject",
                          field_type=field_type,
                          delete_constraint=child_text(root, "deleteConstraint"))

        elif name in ("formula", "defaultValue"):
            _emit_formula(ctx, text_of(elem), path, obj)

        elif name == "summarizedField":
            ctx.reference(raw=text_of(elem), relationship="summarizes",
                          location=path, target_type="CustomField",
                          operation=child_text(root, "summaryOperation"))

        elif name == "summaryForeignKey":
            ctx.reference(raw=text_of(elem), relationship="rollup_of",
                          location=path, target_type="CustomField",
                          operation=child_text(root, "summaryOperation"))

        elif name == "summaryFilterItems":
            filter_field = child_text(elem, "field")
            if filter_field:
                ctx.reference(raw=filter_field, relationship="filters_on",
                              location=f"{path}/field", target_type="CustomField")

        elif name == "valueSetName":
            ctx.reference(raw=text_of(elem), relationship="value_set_of",
                          location=path, target_type="GlobalValueSet")

        elif name == "controllingField":
            ctx.reference(raw=text_of(elem), relationship="controlled_by",
                          location=path, target_type="CustomField",
                          target_parent=obj)

        elif name == "lookupFilter":
            _emit_formula(ctx, child_text(elem, "booleanFilter"),
                          f"{path}/booleanFilter", obj, "filters_on")
            for item, item_path in walk(elem, path):
                if local(item) != "filterItems":
                    continue
                left = child_text(item, "field")
                right = child_text(item, "valueField")
                if left:
                    ctx.reference(raw=left, relationship="filters_on",
                                  location=f"{item_path}/field",
                                  target_type="CustomField")
                if right:
                    ctx.reference(raw=right, relationship="filters_on",
                                  location=f"{item_path}/valueField",
                                  target_type="CustomField")

        elif name == "metadataRelationshipControllingField":
            ctx.reference(raw=text_of(elem), relationship="controlled_by",
                          location=path, target_type="CustomField")

    if ctx._references == 0:
        ctx.reason(f"a {field_type or 'plain'} field: it holds a value and points "
                   "at nothing else")


# ---------------------------------------------------------------------------
# RecordType, ValidationRule
# ---------------------------------------------------------------------------

def extract_record_type(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    obj = _object_of(ctx)
    ctx.component(active=child_text(root, "active"),
                  label=child_text(root, "label"))

    for elem, path in walk(root):
        name = local(elem)
        if name == "picklistValues":
            picklist = child_text(elem, "picklist")
            if picklist:
                ctx.reference(raw=picklist, relationship="references",
                              location=f"{path}/picklist", target_type="CustomField",
                              target_parent=obj)
        elif name == "businessProcess":
            ctx.reference(raw=text_of(elem), relationship="references",
                          location=path, target_type="BusinessProcess",
                          target_parent=obj)
        elif name == "compactLayoutAssignment":
            ctx.reference(raw=text_of(elem), relationship="displays",
                          location=path, target_type="CompactLayout",
                          target_parent=obj)

    if ctx._references == 0:
        ctx.reason("a record type that restricts no picklist and uses no business "
                   "process")


def extract_validation_rule(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    obj = _object_of(ctx)
    ctx.component(active=child_text(root, "active"),
                  error_message=child_text(root, "errorMessage"))

    formula = child_text(root, "errorConditionFormula")
    _emit_formula(ctx, formula, "errorConditionFormula", obj, "references")

    display_field = child_text(root, "errorDisplayField")
    if display_field:
        ctx.reference(raw=display_field, relationship="references",
                      location="errorDisplayField", target_type="CustomField",
                      target_parent=obj)

    if ctx._references == 0:
        ctx.reason("the rule's condition names no field (a constant or a global "
                   "only)")


# ---------------------------------------------------------------------------
# Object subfolders nothing opened before
# ---------------------------------------------------------------------------

def extract_list_view(ctx) -> None:
    """574 files across the two orgs, never opened by the old parser.

    Column and filter names use two different vocabularies in the same file:
    real api names (Health_Status__c) beside the legacy report tokens Salesforce
    still writes (ACCOUNT.TYPE, CORE.USERS.LAST_NAME). Both are kept exactly as
    written; deciding what a legacy token points at is phase 3's job.
    """
    root = ctx.xml_root
    if root is None:
        return
    obj = _object_of(ctx)
    ctx.component(label=child_text(root, "label"),
                  filter_scope=child_text(root, "filterScope"))

    for elem, path in walk(root):
        name = local(elem)
        if name == "columns":
            ctx.reference(raw=text_of(elem), relationship="displays",
                          location=path, target_type="CustomField",
                          target_parent=obj)
        elif name == "filters":
            field = child_text(elem, "field")
            if field:
                ctx.reference(raw=field, relationship="filters_on",
                              location=f"{path}/field", target_type="CustomField",
                              target_parent=obj,
                              operation=child_text(elem, "operation"))
        elif name == "sharedTo":
            _emit_shared_to(ctx, elem, path)
        elif name == "queue":
            ctx.reference(raw=text_of(elem), relationship="shares_with",
                          location=path, target_type="Queue")

    if ctx._references == 0:
        ctx.reason("a list view with no columns and no filters in its file")


def extract_web_link(ctx) -> None:
    """145 files across the two orgs. The references hide in the url's merge fields."""
    root = ctx.xml_root
    if root is None:
        return
    obj = _object_of(ctx)
    ctx.component(link_type=child_text(root, "linkType"),
                  display_type=child_text(root, "displayType"))

    for elem, path in walk(root):
        name = local(elem)
        if name == "url":
            url = text_of(elem)
            for ref in merge_field_references(url):
                ctx.reference(
                    raw=ref["raw"], relationship="references", location=path,
                    target_type=ref["global_name"] or "CustomField",
                    target_parent="" if ref["kind"] != "field" else obj,
                    confidence="medium", merge_field=True,
                )
            if url.startswith(("http://", "https://")):
                ctx.reference(raw=url.split("?")[0], relationship="calls_endpoint",
                              location=path, confidence="medium")
        elif name == "page":
            ctx.reference(raw=text_of(elem), relationship="references",
                          location=path, target_type="ApexPage")

    if ctx._references == 0:
        ctx.reason("the link's url uses no merge field and names no page")


def extract_compact_layout(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    obj = _object_of(ctx)
    for elem, path in walk(root):
        if local(elem) == "fields":
            ctx.reference(raw=text_of(elem), relationship="displays",
                          location=path, target_type="CustomField",
                          target_parent=obj)
    if ctx._references == 0:
        ctx.reason("a compact layout listing no fields")


def extract_field_set(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    obj = _object_of(ctx)
    for elem, path in walk(root):
        name = local(elem)
        if name in ("displayedFields", "availableFields"):
            field = child_text(elem, "field")
            if field:
                ctx.reference(raw=field, relationship="displays",
                              location=f"{path}/field", target_type="CustomField",
                              target_parent=obj, availability=name)
    if ctx._references == 0:
        ctx.reason("a field set holding no fields")


def extract_business_process(ctx) -> None:
    """A business process restricts one picklist. Which picklist is implied by the
    object, so the reference is to the object's stage or status field."""
    root = ctx.xml_root
    if root is None:
        return
    obj = _object_of(ctx)
    values = [child_text(v, "fullName") for v, _p in walk(root)
              if local(v) == "values"]
    values = [v for v in values if v]
    ctx.component(value_count=len(values))
    if values:
        ctx.reference(raw=obj, relationship="references", location="values",
                      target_type="CustomObject", confidence="medium",
                      note="a business process restricts this object's stage or "
                           "status picklist")
    else:
        ctx.reason("a business process with no values in its file")


def extract_sharing_rules(ctx) -> None:
    """187 files. Criteria name fields; sharedTo names a group, role or queue."""
    root = ctx.xml_root
    if root is None:
        return
    obj = ctx.component_name

    for elem, path in walk(root):
        name = local(elem)
        if name in ("sharingCriteriaRules", "sharingOwnerRules",
                    "sharingTerritoryRules", "sharingGuestRules"):
            ctx.reference(raw=obj, relationship="shares_on", location=path,
                          target_type="CustomObject",
                          access_level=child_text(elem, "accessLevel"))
        elif name == "criteriaItems":
            field = child_text(elem, "field")
            if field:
                ctx.reference(raw=field, relationship="filters_on",
                              location=f"{path}/field", target_type="CustomField",
                              target_parent=obj)
        elif name in ("sharedTo", "sharedFrom"):
            _emit_shared_to(ctx, elem, path)
        elif name == "booleanFilter":
            continue

    if ctx._references == 0:
        ctx.reason("a sharing rules file with no rules in it")


def _emit_shared_to(ctx, elem, path) -> None:
    """<sharedTo> names the audience by the tag it uses: group, role, queue..."""
    audience_types = {
        "group": "Group", "role": "Role", "roleAndSubordinates": "Role",
        "roleAndSubordinatesInternal": "Role", "queue": "Queue",
        "territory": "Territory", "territoryAndSubordinates": "Territory",
        "portalRole": "Role", "portalRoleAndSubordinates": "Role",
        "managerSubordinates": "User", "manager": "User",
        "allInternalUsers": "", "allPartnerUsers": "", "allCustomerPortalUsers": "",
    }
    for child in elem:
        tag_name = local(child)
        if tag_name not in audience_types:
            continue
        value = text_of(child)
        if not value:
            continue
        ctx.reference(raw=value, relationship="shares_with",
                      location=f"{path}/{tag_name}",
                      target_type=audience_types[tag_name], audience=tag_name)


def extract_value_set(ctx) -> None:
    """Global and standard value sets: the values themselves, no outward links."""
    root = ctx.xml_root
    if root is None:
        return
    count = sum(1 for elem, _p in walk(root)
                if local(elem) in ("customValue", "standardValue"))
    ctx.component(value_count=count)
    ctx.reason(f"a value set: {count} picklist values, which point at nothing")

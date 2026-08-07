"""interface.py — what a user actually sees: layouts, Lightning pages, apps, tabs.

None of these were opened before. Between them they are 600 files across the two
orgs, and they are where the answer to "where does this field appear on screen"
lives, which is half of what an impact question is asking.

Two file-naming rules matter here, because in both cases the object a page is for
is in the file name rather than inside the file:

* a layout is `Object-Layout Name.layout-meta.xml`, so every bare field name in
  it belongs to the part before the first hyphen;
* a quick action is `Object.Action_Name.quickAction-meta.xml`, so the same holds
  for the part before the dot.
"""

from __future__ import annotations

from .names import merge_field_references
from .xmlutil import child_text, local, text_of, walk


# A handful of layout name prefixes are not objects. Salesforce calls them
# pseudo-entities: a separate layout for one state or one screen of an object,
# named for the screen rather than for the object whose fields it lays out. Left
# alone, `CaseClose-Close Case Layout` hands the resolver the object `CaseClose`,
# nothing matches, and every field on that layout drops out of the graph without
# saying so. WI-007 phase 8 found this on 2026-08-06: it cost 42 of the 51
# comparable layout-to-field pairs in Blue and about 940 field references across
# the two snapshots.
#
# How to find another one. Take a layout whose prefix is not a folder under
# `objects/`, collect its `<field>` values, and count how many of them exist as
# field files under each object. A pseudo-entity matches one object almost
# exactly; a layout for an object the snapshot simply never retrieved matches
# nothing in particular. `test_extractors.py` runs that check over both
# snapshots and fails when a prefix with fields is neither an object nor listed
# here, so a new one cannot go quiet the way this one did.
_LAYOUT_PSEUDO_ENTITIES = {
    # Proven by field overlap against both snapshots on 2026-08-06.
    "CaseClose": "Case",                    # Red 8/8 fields, Blue 42/45
    "CommunityMemberLayout": "User",        # Red 13/13, Blue 13/13
    "UserAlt": "User",                      # Red 12/12, Blue 10/10
    # Salesforce's documented naming for the two live-chat queue states. Neither
    # snapshot holds the LiveChatTranscript object, so field overlap cannot
    # confirm these and nothing resolves differently today; they are here so the
    # name is truthful if that object is ever retrieved.
    "LiveChatTranscriptActive": "LiveChatTranscript",
    "LiveChatTranscriptWaiting": "LiveChatTranscript",
    # A global layout belongs to no object, which is how `_action_object` below
    # already treats a global quick action.
    "Global": "",
}


def _layout_object(component_name: str) -> str:
    """Account-Account Layout -> Account. CaseClose-Close Case Layout -> Case."""
    head = component_name.split("-", 1)[0] if "-" in component_name else ""
    if head in _LAYOUT_PSEUDO_ENTITIES:
        return _LAYOUT_PSEUDO_ENTITIES[head]
    return head


def _action_object(component_name: str) -> str:
    """Account.Add_Location -> Account. A global action has no object."""
    head = component_name.split(".", 1)[0] if "." in component_name else ""
    return "" if head == "Global" else head


# ---------------------------------------------------------------------------
# Layout
# ---------------------------------------------------------------------------

def extract_layout(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    obj = _layout_object(ctx.component_name)
    ctx.component(layout_object=obj)

    for elem, path in walk(root):
        name = local(elem)

        if name == "layoutItems":
            ctx.consume(path)
            field = child_text(elem, "field")
            if field:
                ctx.reference(raw=field, relationship="displays",
                              location=f"{path}/field", target_type="CustomField",
                              target_parent=obj,
                              behavior=child_text(elem, "behavior"))
            for tag_name, target_type, relationship in (
                ("customLink", "WebLink", "displays_action"),
                ("page", "ApexPage", "displays_component"),
                ("component", "AuraDefinitionBundle", "displays_component"),
                ("canvas", "CanvasApp", "displays_component"),
                ("analyticsCloudComponent", "WaveDashboard", "displays_component"),
                ("reportChartComponent", "Report", "displays_component"),
            ):
                value = child_text(elem, tag_name)
                if value:
                    ctx.reference(raw=value, relationship=relationship,
                                  location=f"{path}/{tag_name}",
                                  target_type=target_type,
                                  target_parent=obj if tag_name == "customLink" else "")

        elif name == "relatedLists":
            ctx.consume(path)
            related = child_text(elem, "relatedList")
            if related:
                ctx.reference(raw=related, relationship="displays_related_list",
                              location=f"{path}/relatedList")
            for child in elem:
                tag_name = local(child)
                value = text_of(child)
                if not value:
                    continue
                if tag_name == "fields":
                    ctx.reference(raw=value, relationship="displays",
                                  location=f"{path}/fields",
                                  target_type="CustomField")
                elif tag_name == "customButtons":
                    ctx.reference(raw=value, relationship="displays_action",
                                  location=f"{path}/customButtons",
                                  target_type="WebLink", target_parent=obj)
                elif tag_name == "sortField":
                    ctx.reference(raw=value, relationship="sorts_by",
                                  location=f"{path}/sortField",
                                  target_type="CustomField")

        elif name == "quickActionListItems":
            ctx.consume(path)
            action = child_text(elem, "quickActionName")
            if action:
                ctx.reference(raw=action, relationship="displays_action",
                              location=f"{path}/quickActionName",
                              target_type="QuickAction")

        elif name == "platformActionListItems":
            ctx.consume(path)
            action = child_text(elem, "actionName")
            if action:
                ctx.reference(raw=action, relationship="displays_action",
                              location=f"{path}/actionName",
                              action_type=child_text(elem, "actionType"))

        elif name == "customButtons" and text_of(elem):
            ctx.consume(path)
            ctx.reference(raw=text_of(elem), relationship="displays_action",
                          location=path, target_type="WebLink", target_parent=obj)

        elif name in ("summaryLayoutItems", "miniLayoutItems"):
            field = child_text(elem, "field")
            if field:
                ctx.consume(path)
                ctx.reference(raw=field, relationship="displays",
                              location=f"{path}/field", target_type="CustomField",
                              target_parent=obj, region=name)

    if ctx._references == 0:
        ctx.reason("a layout with no fields, related lists or actions in it")


# ---------------------------------------------------------------------------
# FlexiPage (Lightning page)
# ---------------------------------------------------------------------------

def extract_flexipage(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    sobject = child_text(root, "sobjectType") or ""
    ctx.component(sobject_type=sobject,
                  page_type=child_text(root, "type"),
                  master_label=child_text(root, "masterLabel"))

    if sobject:
        ctx.consume("sobjectType")
        ctx.reference(raw=sobject, relationship="targets_object",
                      location="sobjectType", target_type="CustomObject")

    parent = child_text(root, "parentFlexiPage")
    if parent:
        ctx.consume("parentFlexiPage")
        ctx.reference(raw=parent, relationship="references",
                      location="parentFlexiPage", target_type="FlexiPage")

    for elem, path in walk(root):
        name = local(elem)

        if name == "componentName":
            value = text_of(elem)
            if not value:
                continue
            ctx.consume(path)
            ctx.reference(raw=value, relationship="displays_component",
                          location=path, target_type=_component_type(value),
                          namespace=value.split(":", 1)[0] if ":" in value else None)

        elif name == "fieldItem":
            # The fields actually placed on the page. Every one of the 3,267 in
            # the two snapshots is written `Record.<field>`, which the resolver
            # already reads against the page's own object. Before WI-007 phase 8
            # nothing here read them at all, so a Lightning record page could not
            # say which fields it shows, which is most of what "where does this
            # field appear on screen" means for a modern org.
            value = text_of(elem)
            if value:
                ctx.consume(path)
                ctx.reference(raw=value, relationship="displays", location=path,
                              target_type="CustomField", target_parent=sobject)

        elif name == "componentInstance":
            _emit_component_instance(ctx, elem, path, sobject)

        elif name == "criteria":
            for side in ("leftValue", "rightValue"):
                value = child_text(elem, side)
                if not value or "{!" not in value:
                    continue
                for ref in merge_field_references(value):
                    ctx.reference(raw=ref["raw"], relationship="reads",
                                  location=f"{path}/{side}",
                                  target_type=ref["global_name"] or "CustomField",
                                  target_parent=("" if ref["kind"] != "field"
                                                 else sobject),
                                  confidence="medium", merge_field=True)

    if ctx._references == 0:
        ctx.reason("a Lightning page with no components and no object")


_KNOWN_NAMESPACES = {
    "flexipage": "", "force": "", "forceCommunity": "", "runtime_sales_activities": "",
    "lightning": "", "analytics": "", "wave": "", "forceChatter": "",
}

# A Lightning page component carries its settings as name/value properties. Only
# some of them name another component.
#
# `fieldName` and `fields` fire zero times in either snapshot; they are valid on
# other page types and are kept for that. `relatedListName` was in this table and
# fired zero times too, because the files spell it `relatedListApiName`, which is
# handled below instead: it needs its sibling properties, so it cannot be read one
# property at a time. WI-007 phase 8.
_PROPERTY_TARGETS = {
    "flowName": ("Flow", "calls_flow"),
    "flow": ("Flow", "calls_flow"),
    "fieldName": ("CustomField", "displays"),
    "fields": ("CustomField", "displays"),
    "listViewName": ("ListView", "displays"),
    "reportId": ("Report", "displays_component"),
    "layoutName": ("Layout", "references"),
    "objectApiName": ("CustomObject", "targets_object"),
    "entityNames": ("CustomObject", "targets_object"),
    "actionNames": ("QuickAction", "displays_action"),
}

# Properties that say nothing about another component. Listed so a reader can see
# they were considered rather than missed.
_PROPERTY_IGNORED = frozenset((
    "recordId", "metricTypes", "visibility", "rowsToDisplay", "showActionBar",
    "relatedListComponentOverride", "uiBehavior", "parentFieldApiName",
))


def _instance_properties(elem, path) -> list:
    """(property name, values, path) for the direct properties of one component.

    A property holds either one `<value>` or a `<valueList>` of them. They are
    read together, per component instance, because a related list's columns and
    filters mean nothing without the sibling property naming the list.
    """
    depth = path.count("/")
    out = []
    for child, child_path in walk(elem, path):
        if local(child) != "componentInstanceProperties":
            continue
        # Direct children only; a nested component instance reads its own.
        if child_path.count("/") != depth + 1:
            continue
        prop_name = child_text(child, "name")
        if not prop_name:
            continue
        values = []
        single = child_text(child, "value")
        if single:
            values.append(single)
        for value_list, _ in walk(child, ""):
            if local(value_list) == "valueListItems":
                item = child_text(value_list, "value")
                if item:
                    values.append(item)
        out.append((prop_name, values, child_path))
    return out


def _filter_field(value: str) -> str:
    """`Same_Account_Name__c|EQUALS|false` -> `Same_Account_Name__c`."""
    return value.split("|", 1)[0].strip()


def _emit_component_instance(ctx, elem, path, sobject) -> None:
    """Every reference one component on a Lightning page makes."""
    props = _instance_properties(elem, path)
    by_name = {name: values for name, values, _ in props}
    related_list = (by_name.get("relatedListApiName") or [""])[0]

    for prop_name, values, prop_path in props:
        if prop_name in _PROPERTY_IGNORED:
            continue

        if prop_name == "relatedListApiName":
            ctx.consume(f"{prop_path}/name")
            for value in values:
                ctx.reference(raw=value, relationship="displays_related_list",
                              location=f"{prop_path}/value",
                              target_type="CustomField", target_parent=sobject,
                              related_list=True, confidence="medium")
            continue

        # A related list's columns and filters are fields on the CHILD object,
        # reached through the relationship name rather than named outright, so
        # they are written as a traversal the resolver can walk.
        if prop_name in ("relatedListFieldAliases", "adminFilters"):
            ctx.consume(f"{prop_path}/name")
            for value in values:
                field = (_filter_field(value) if prop_name == "adminFilters"
                         else value.strip())
                if not field:
                    continue
                relationship = ("filters_on" if prop_name == "adminFilters"
                                else "displays")
                if "." in field or not related_list:
                    # A legacy all-capitals token such as CASES.RECORDTYPE names
                    # its own object, so it must not be hung off the relationship.
                    ctx.reference(raw=field, relationship=relationship,
                                  location=f"{prop_path}/value",
                                  target_type="CustomField", confidence="low")
                else:
                    ctx.reference(raw=f"Record.{related_list}.{field}",
                                  relationship=relationship,
                                  location=f"{prop_path}/value",
                                  target_type="CustomField",
                                  target_parent=sobject, confidence="medium",
                                  through_related_list=related_list)
            continue

        rule = _PROPERTY_TARGETS.get(prop_name)
        if not rule:
            continue
        ctx.consume(f"{prop_path}/name")
        target_type, relationship = rule
        for value in values:
            _emit_property(ctx, prop_name, value, f"{prop_path}/value", sobject,
                           target_type, relationship)


def _component_type(component_name: str) -> str:
    """A flexipage component name says which kind of component it is by namespace."""
    if ":" not in component_name:
        return "LightningComponentBundle"
    namespace = component_name.split(":", 1)[0]
    if namespace == "c":
        return "AuraDefinitionBundle"
    if namespace in _KNOWN_NAMESPACES:
        return "StandardComponent"
    return ""


def _emit_property(ctx, prop_name, prop_value, location, sobject,
                   target_type, relationship) -> None:
    for piece in prop_value.split(","):
        value = piece.strip()
        if not value or value.startswith("{") or value.startswith("["):
            continue
        ctx.reference(raw=value, relationship=relationship, location=location,
                      target_type=target_type,
                      target_parent=sobject if target_type == "CustomField" else "",
                      confidence="medium", property_name=prop_name)


# ---------------------------------------------------------------------------
# QuickAction
# ---------------------------------------------------------------------------

def extract_quick_action(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    source_object = _action_object(ctx.component_name)
    target_object = child_text(root, "targetObject") or source_object
    ctx.component(source_object=source_object,
                  action_type=child_text(root, "type"),
                  label=child_text(root, "label"))

    if source_object:
        ctx.reference(raw=source_object, relationship="targets_object",
                      location="fullName", target_type="CustomObject",
                      confidence="medium",
                      note="the object is the part of the file name before the dot")

    for elem, path in walk(root):
        name = local(elem)
        if name in ("quickActionLayoutItems", "fieldOverrides"):
            ctx.consume(path)
            field = child_text(elem, "field")
            if field:
                relationship = ("writes" if name == "fieldOverrides" else "displays")
                ctx.reference(raw=field, relationship=relationship,
                              location=f"{path}/field", target_type="CustomField",
                              target_parent=target_object)
            formula = child_text(elem, "formula")
            if formula:
                ctx.reference(raw=formula, relationship="references",
                              location=f"{path}/formula", confidence="low",
                              note="a literal or formula assigned by the action")
        elif name in ("targetObject", "targetParentField", "targetRecordType",
                      "flowDefinition", "lightningComponent", "page"):
            value = text_of(elem)
            if not value:
                continue
            ctx.consume(path)
            target_type, relationship = {
                "targetObject": ("CustomObject", "targets_object"),
                "targetParentField": ("CustomField", "references"),
                "targetRecordType": ("RecordType", "references"),
                "flowDefinition": ("Flow", "calls_flow"),
                "lightningComponent": ("AuraDefinitionBundle", "displays_component"),
                "page": ("ApexPage", "displays_component"),
            }[name]
            ctx.reference(raw=value, relationship=relationship, location=path,
                          target_type=target_type,
                          target_parent=source_object if name == "targetParentField" else "")

    if ctx._references == 0:
        ctx.reason("a global action with no object, layout fields or target")


# ---------------------------------------------------------------------------
# CustomApplication, CustomTab
# ---------------------------------------------------------------------------

def extract_custom_application(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    ctx.component(nav_type=child_text(root, "navType"),
                  label=child_text(root, "label"),
                  is_lightning=bool(child_text(root, "uiType") == "Lightning") or None)

    for elem, path in walk(root):
        name = local(elem)
        value = text_of(elem)
        if name in ("tabs", "defaultLandingTab") and value:
            ctx.consume(path)
            ctx.reference(raw=value, relationship="shows_tab", location=path,
                          target_type="CustomTab")
        elif name == "utilityBar" and value:
            ctx.consume(path)
            ctx.reference(raw=value, relationship="displays_component",
                          location=path, target_type="FlexiPage")
        elif name in ("actionOverrides", "profileActionOverrides"):
            content = child_text(elem, "content")
            if content:
                ctx.consume(path)
                ctx.reference(raw=content, relationship="overrides_action",
                              location=f"{path}/content",
                              target_type=("FlexiPage"
                                           if child_text(elem, "type") == "Flexipage"
                                           else "ApexPage"),
                              action=child_text(elem, "actionName"),
                              on_object=child_text(elem, "pageOrSobjectType"))
        elif name == "profile" and value:
            ctx.consume(path)
            ctx.reference(raw=value, relationship="assigned_to", location=path,
                          target_type="Profile")

    if ctx._references == 0:
        ctx.reason("an app with no tabs, utility bar or action overrides")


def extract_custom_tab(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    ctx.component(label=child_text(root, "label"),
                  motif=child_text(root, "motif"))

    targets = {
        "object": ("CustomObject", "targets_object"),
        "flexiPage": ("FlexiPage", "displays_component"),
        "page": ("ApexPage", "displays_component"),
        "lwcName": ("LightningComponentBundle", "displays_component"),
        "auraComponent": ("AuraDefinitionBundle", "displays_component"),
        "url": ("", "calls_endpoint"),
    }
    for elem, path in walk(root):
        name = local(elem)
        if name not in targets or not text_of(elem):
            continue
        target_type, relationship = targets[name]
        ctx.consume(path)
        ctx.reference(raw=text_of(elem), relationship=relationship, location=path,
                      target_type=target_type)

    if ctx._references == 0:
        ctx.reason("a tab that names no object, page or component")


# ---------------------------------------------------------------------------
# PathAssistant, HomePageLayout
# ---------------------------------------------------------------------------

def extract_path_assistant(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    entity = child_text(root, "entityName") or ""
    ctx.component(entity=entity,
                  record_type=child_text(root, "recordTypeName"),
                  active=child_text(root, "active"))
    if entity:
        ctx.consume("entityName")
        ctx.reference(raw=entity, relationship="targets_object",
                      location="entityName", target_type="CustomObject")
    picklist = child_text(root, "fieldName")
    if picklist:
        ctx.consume("fieldName")
        ctx.reference(raw=picklist, relationship="reads", location="fieldName",
                      target_type="CustomField", target_parent=entity)
    for elem, path in walk(root):
        if local(elem) != "pathAssistantSteps":
            continue
        for child in elem:
            if local(child) == "fieldNames" and text_of(child):
                ctx.reference(raw=text_of(child), relationship="displays",
                              location=f"{path}/fieldNames",
                              target_type="CustomField", target_parent=entity)
        ctx.consume(path)
    if ctx._references == 0:
        ctx.reason("a path with no object and no guided fields")


def extract_home_page_layout(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    for elem, path in walk(root):
        name = local(elem)
        if name in ("narrowComponents", "wideComponents") and text_of(elem):
            ctx.consume(path)
            ctx.reference(raw=text_of(elem), relationship="displays_component",
                          location=path, target_type="HomePageComponent")
    if ctx._references == 0:
        ctx.reason("a home page layout with no components on it")

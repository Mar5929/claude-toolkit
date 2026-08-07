"""apex.py — code: Apex, Visualforce, Lightning web components and Aura.

Code hides its references in text rather than in XML elements, so every
reference from this module carries a line number instead of an element path, and
most carry `confidence: low`, because a regular expression over source is the
weakest evidence there is. That is the honest label, not a defect.

**The Apex writes gap.** The old parser had a DML loop that ended in `continue`
with a comment saying type inference was too noisy, so no Apex WRITES edge was
ever emitted, anywhere, and a field written only by Apex looked exactly like a
field nothing writes. The fix is to do the type inference rather than skip it:
read the local variable declarations first (`Account acc`, `List<Case> cases`,
`Map<Id, Contact> byId`), then resolve `insert acc;` and `acc.Name = x;` through
that map. A variable whose type cannot be worked out produces no write, which is
a gap in one class rather than a hole in the whole graph.

Also closed here, all measured as missing: custom label references, `extends` and
`implements`, `@InvocableMethod` (which is what makes a class callable from a
flow), dot field access on a typed variable, dynamic SOQL, Apex launching a flow,
and test-class-to-class links.
"""

from __future__ import annotations

import re

from . import names as N
from .xmlutil import child_text, local, read_text, text_of, walk

_DECL_COLLECTION = re.compile(
    r"\b(?:List|Set|Iterable)\s*<\s*([A-Za-z_][A-Za-z0-9_]*)\s*>\s+([A-Za-z_][A-Za-z0-9_]*)"
)
_DECL_MAP = re.compile(
    r"\bMap\s*<\s*[A-Za-z_][A-Za-z0-9_]*\s*,\s*"
    r"(?:List\s*<\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*>?\s*>\s+([A-Za-z_][A-Za-z0-9_]*)"
)
# The ":" matters: a for-each loop writes `for (Case c : cases)`, and without it
# the loop variable has no type, so `c.Priority = 'High'` produces no write.
_DECL_PLAIN = re.compile(
    r"\b([A-Z][A-Za-z0-9_]*(?:__c|__mdt|__e|__x|__b|__Share|__History)?)\s+"
    r"([a-zA-Z_][A-Za-z0-9_]*)\s*(?:=|;|\)|,|:)"
)
_DML = re.compile(
    r"\b(insert|update|upsert|delete|undelete|merge)\s+"
    r"(?:as\s+(?:user|system)\s+)?([A-Za-z_][A-Za-z0-9_]*)\b",
    re.IGNORECASE,
)
_DATABASE_DML = re.compile(
    r"\bDatabase\s*\.\s*(insert|update|upsert|delete|undelete|merge)"
    r"(?:Immediate|Async)?\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)",
    re.IGNORECASE,
)
_DOT_ASSIGN = re.compile(
    r"\b([a-zA-Z_][A-Za-z0-9_]*)\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(?!=)"
)
_DOT_READ = re.compile(
    r"\b([a-zA-Z_][A-Za-z0-9_]*)\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)\b(?!\s*[=\(])"
)
_NEW_SOBJECT_ARGS = re.compile(
    r"\bnew\s+([A-Za-z_][A-Za-z0-9_]*(?:__c|__mdt|__e|__x|__b)?)\s*\(([^;]{0,600}?)\)",
    re.DOTALL,
)
_NAMED_ARG = re.compile(r"([A-Za-z_][A-Za-z0-9_]*)\s*=(?!=)")
_DML_WORDS = frozenset({"insert", "update", "upsert", "delete", "undelete", "merge"})

_SOBJECT_SUFFIXES = ("__c", "__mdt", "__e", "__x", "__b", "__Share", "__History")


def _looks_like_sobject(type_name, known_objects) -> bool:
    if not type_name:
        return False
    if type_name.endswith(_SOBJECT_SUFFIXES):
        return True
    return type_name in known_objects


def _variable_types(source, known_objects) -> dict:
    """variable name -> SObject api name, for every declaration we can read.

    Only declarations whose type is really an SObject are kept: either the name
    carries a custom-object suffix, or the org's own metadata has an object by
    that name. A `String s` or a `MyService svc` never gets in, which is what
    keeps the writes below from being the noise the old parser feared.
    """
    types = {}
    for pattern in (_DECL_COLLECTION, _DECL_MAP, _DECL_PLAIN):
        for match in pattern.finditer(source):
            type_name, var_name = match.group(1), match.group(2)
            if var_name.lower() in _DML_WORDS:
                continue
            if not _looks_like_sobject(type_name, known_objects):
                continue
            types.setdefault(var_name, type_name)
    return types


# ---------------------------------------------------------------------------
# Apex classes and triggers
# ---------------------------------------------------------------------------

def extract_apex_class(ctx) -> None:
    if ctx.rel_path.endswith(".cls-meta.xml"):
        root = ctx.xml_root
        if root is not None:
            ctx.component(api_version=child_text(root, "apiVersion"),
                          status=child_text(root, "status"))
        ctx.reason("sidecar file: the class's api version and status, no references")
        return
    _extract_apex_source(ctx, is_trigger=False)


def extract_apex_trigger(ctx) -> None:
    if ctx.rel_path.endswith(".trigger-meta.xml"):
        root = ctx.xml_root
        if root is not None:
            ctx.component(api_version=child_text(root, "apiVersion"),
                          status=child_text(root, "status"))
        ctx.reason("sidecar file: the trigger's api version and status, no references")
        return
    _extract_apex_source(ctx, is_trigger=True)


def _extract_apex_source(ctx, is_trigger: bool) -> None:
    raw, error = read_text(ctx.abs_path)
    if error:
        ctx.note(error)
        ctx.reason(error)
        return
    source = N.strip_apex_noise(raw)
    known_objects = ctx.result.known_objects
    known_classes = ctx.result.known_classes
    own_name = ctx.component_name

    def line(offset):
        return f"line {N.line_of(source, offset)}"

    # --- what this file is -------------------------------------------
    is_test = bool(N.APEX_TEST_ANNOTATION.search(source))
    is_invocable = bool(N.APEX_INVOCABLE.search(source))
    ctx.component(is_test=is_test or None, is_invocable=is_invocable or None,
                  is_trigger=is_trigger or None)

    if is_trigger:
        match = N.APEX_TRIGGER_HEADER.search(source)
        if match:
            ctx.reference(raw=match.group(2), relationship="triggers_on",
                          location=line(match.start()), target_type="CustomObject",
                          confidence="high", events=match.group(3).strip())

    # --- inheritance --------------------------------------------------
    for match in N.APEX_EXTENDS.finditer(source):
        parent = match.group(1).split(".")[-1]
        if parent not in N.APEX_BUILTINS:
            ctx.reference(raw=parent, relationship="extends",
                          location=line(match.start()), target_type="ApexClass",
                          confidence="medium")
    for match in N.APEX_IMPLEMENTS.finditer(source):
        for interface in match.group(1).split(","):
            name = interface.strip().split(".")[-1]
            if name and name not in N.APEX_BUILTINS:
                ctx.reference(raw=name, relationship="implements",
                              location=line(match.start()), target_type="ApexClass",
                              confidence="medium")

    # --- SOQL ---------------------------------------------------------
    for match in N.APEX_SOQL.finditer(source):
        select_clause, sobject, tail = match.group(1), match.group(2), match.group(3)
        where = f"{line(match.start())}, SOQL"
        ctx.reference(raw=sobject, relationship="queries", location=where,
                      target_type="CustomObject", confidence="low")
        for field in N.soql_select_fields(select_clause):
            ctx.reference(raw=field, relationship="reads", location=where,
                          target_type="CustomField",
                          target_parent="" if "." in field else sobject,
                          confidence="low",
                          traversal=("." in field) or None)
        for field in N.soql_where_fields(tail):
            ctx.reference(raw=field, relationship="filters_on", location=where,
                          target_type="CustomField",
                          target_parent="" if "." in field else sobject,
                          confidence="low")

    for match in N.APEX_DYNAMIC_SOQL.finditer(source):
        ctx.reference(raw="(built at run time)", relationship="queries",
                      location=line(match.start()), confidence="low",
                      dynamic=True,
                      note="a query assembled from strings; what it reads cannot "
                           "be read from the source")
    for match in N.APEX_TYPE_FORNAME.finditer(source):
        ctx.reference(raw="(built at run time)", relationship="invokes",
                      location=line(match.start()), confidence="low",
                      dynamic=True,
                      note="Type.forName resolves a class name at run time")

    # --- writes, at last ----------------------------------------------
    var_types = _variable_types(source, known_objects)

    for pattern, group_offset in ((_DML, 0), (_DATABASE_DML, 0)):
        for match in pattern.finditer(source):
            operation, variable = match.group(1).lower(), match.group(2)
            sobject = var_types.get(variable)
            if not sobject:
                continue
            relationship = "deletes" if operation in ("delete", "undelete") else "writes"
            ctx.reference(raw=sobject, relationship=relationship,
                          location=line(match.start()), target_type="CustomObject",
                          confidence="low", dml=operation, through_variable=variable)

    for match in _DOT_ASSIGN.finditer(source):
        variable, field = match.group(1), match.group(2)
        sobject = var_types.get(variable)
        if not sobject:
            continue
        ctx.reference(raw=field, relationship="writes", location=line(match.start()),
                      target_type="CustomField", target_parent=sobject,
                      confidence="low", through_variable=variable)

    for match in _NEW_SOBJECT_ARGS.finditer(source):
        type_name, args = match.group(1), match.group(2)
        if not _looks_like_sobject(type_name, known_objects):
            continue
        for arg in _NAMED_ARG.finditer(args):
            ctx.reference(raw=arg.group(1), relationship="writes",
                          location=line(match.start()), target_type="CustomField",
                          target_parent=type_name, confidence="low",
                          constructor=True)

    # --- reads through a typed variable -------------------------------
    seen_reads = set()
    for match in _DOT_READ.finditer(source):
        variable, field = match.group(1), match.group(2)
        sobject = var_types.get(variable)
        if not sobject or (sobject, field) in seen_reads:
            continue
        seen_reads.add((sobject, field))
        ctx.reference(raw=field, relationship="reads", location=line(match.start()),
                      target_type="CustomField", target_parent=sobject,
                      confidence="low", through_variable=variable)

    # --- calling other code -------------------------------------------
    invoked = {}
    for pattern in (N.APEX_NEW, N.APEX_STATIC_CALL):
        for match in pattern.finditer(source):
            target = match.group(1)
            if target == own_name or target in N.APEX_BUILTINS:
                continue
            if target not in known_classes:
                continue
            invoked.setdefault(target, match.start())
    for target, offset in invoked.items():
        ctx.reference(raw=target, relationship="invokes", location=line(offset),
                      target_type="ApexClass", confidence="low")

    for match in N.APEX_FLOW_CALL.finditer(source):
        flow_name = match.group(1) or match.group(2)
        if flow_name:
            ctx.reference(raw=flow_name, relationship="calls_flow",
                          location=line(match.start()), target_type="Flow",
                          confidence="low")

    # --- labels and schema --------------------------------------------
    for match in N.APEX_LABEL.finditer(source):
        label = match.group(1) or match.group(2)
        if label:
            ctx.reference(raw=label, relationship="references",
                          location=line(match.start()), target_type="CustomLabel",
                          confidence="low")

    for match in N.APEX_SCHEMA_TYPE.finditer(source):
        sobject, field = match.group(1), match.group(2)
        if field:
            ctx.reference(raw=field, relationship="references",
                          location=line(match.start()), target_type="CustomField",
                          target_parent=sobject, confidence="low")
        else:
            ctx.reference(raw=sobject, relationship="references",
                          location=line(match.start()), target_type="CustomObject",
                          confidence="low")

    for match in N.APEX_SOBJECT_TYPE.finditer(source):
        sobject = match.group(1)
        ctx.reference(raw=sobject, relationship="references",
                      location=line(match.start()), target_type="CustomObject",
                      confidence="low")

    # --- test to class -------------------------------------------------
    if is_test:
        for candidate in _tested_class_names(own_name):
            if candidate in known_classes:
                ctx.reference(raw=candidate, relationship="tests", location="line 1",
                              target_type="ApexClass", confidence="medium",
                              note="the test class is named after the class it covers")
                break

    if ctx._references == 0:
        ctx.reason("the source names no object, field, class, flow or label this "
                   "reader recognises")


def _tested_class_names(name: str):
    """The class a test class is probably named after."""
    lowered = name.lower()
    for suffix in ("test", "tests", "_test", "_tests"):
        if lowered.endswith(suffix):
            yield name[: len(name) - len(suffix)].rstrip("_")
    for prefix in ("test", "test_"):
        if lowered.startswith(prefix):
            yield name[len(prefix):].lstrip("_")


# ---------------------------------------------------------------------------
# Visualforce
# ---------------------------------------------------------------------------

def extract_visualforce(ctx) -> None:
    """ApexPage and ApexComponent: the markup, not the sidecar."""
    if ctx.rel_path.endswith("-meta.xml"):
        root = ctx.xml_root
        if root is not None:
            ctx.component(api_version=child_text(root, "apiVersion"),
                          label=child_text(root, "label"))
        ctx.reason("sidecar file: the page's api version and label, no references")
        return

    markup, error = read_text(ctx.abs_path)
    if error:
        ctx.note(error)
        ctx.reason(error)
        return

    def line(offset):
        return f"line {N.line_of(markup, offset)}"

    standard_object = ""
    for match in N.VF_STANDARD_CONTROLLER.finditer(markup):
        standard_object = match.group(1)
        ctx.reference(raw=standard_object, relationship="targets_object",
                      location=line(match.start()), target_type="CustomObject",
                      confidence="medium")
    for match in N.VF_CONTROLLER_ATTR.finditer(markup):
        controller = match.group(1)
        if controller != standard_object:
            ctx.reference(raw=controller, relationship="invokes",
                          location=line(match.start()), target_type="ApexClass",
                          confidence="medium")
    for match in N.VF_EXTENSIONS_ATTR.finditer(markup):
        for extension in match.group(1).split(","):
            name = extension.strip()
            if name:
                ctx.reference(raw=name, relationship="invokes",
                              location=line(match.start()), target_type="ApexClass",
                              confidence="medium")
    for match in N.VF_COMPONENT_TAG.finditer(markup):
        ctx.reference(raw=match.group(1), relationship="displays_component",
                      location=line(match.start()), target_type="ApexComponent",
                      confidence="medium")

    seen = set()
    for ref in N.merge_field_references(markup):
        if ref["raw"] in seen:
            continue
        seen.add(ref["raw"])
        ctx.reference(
            raw=ref["raw"], relationship="reads", location="merge field in markup",
            target_type=ref["global_name"] or "CustomField",
            target_parent="" if ref["kind"] != "field" else standard_object,
            confidence="low", merge_field=True,
        )

    if ctx._references == 0:
        ctx.reason("the markup names no controller, component or merge field")


# ---------------------------------------------------------------------------
# Lightning web components
# ---------------------------------------------------------------------------

def extract_lwc(ctx) -> None:
    name = ctx.rel_path.rsplit("/", 1)[-1]

    if name.endswith(".js-meta.xml"):
        root = ctx.xml_root
        if root is None:
            return
        ctx.component(is_exposed=child_text(root, "isExposed"))
        for elem, path in walk(root):
            tag_name = local(elem)
            if tag_name == "target":
                ctx.reference(raw=text_of(elem), relationship="targets_object",
                              location=path, confidence="high", target_kind="page")
            elif tag_name == "object":
                ctx.reference(raw=text_of(elem), relationship="targets_object",
                              location=path, target_type="CustomObject")
        if ctx._references == 0:
            ctx.reason("the component's configuration names no target or object")
        return

    if name.endswith(".js"):
        _extract_lwc_javascript(ctx)
        return

    if name.endswith(".html"):
        _extract_lwc_template(ctx)
        return

    ctx.reason(f"'{name}' is a bundle file with no reference reader "
               "(styling, icon or test)")


def _extract_lwc_javascript(ctx) -> None:
    source, error = read_text(ctx.abs_path)
    if error:
        ctx.note(error)
        ctx.reason(error)
        return

    def line(offset):
        return f"line {N.line_of(source, offset)}"

    for match in N.LWC_SCHEMA_IMPORT.finditer(source):
        # "Account.Name" or "Account.Contact__r.Email"
        ctx.reference(raw=match.group(1), relationship="reads",
                      location=line(match.start()), target_type="CustomField",
                      confidence="high", schema_import=True)
    for match in N.LWC_APEX_IMPORT.finditer(source):
        # "ClassName.methodName"
        class_name = match.group(1).split(".", 1)[0]
        ctx.reference(raw=class_name, relationship="invokes",
                      location=line(match.start()), target_type="ApexClass",
                      confidence="high", method=match.group(1))
    for match in N.LWC_LABEL_IMPORT.finditer(source):
        label = match.group(1)
        ctx.reference(raw=label.split(".", 1)[-1], relationship="references",
                      location=line(match.start()), target_type="CustomLabel",
                      confidence="high")
    for match in N.LWC_RESOURCE_IMPORT.finditer(source):
        ctx.reference(raw=match.group(1), relationship="references",
                      location=line(match.start()), target_type="StaticResource",
                      confidence="high")
    for match in N.LWC_PERMISSION_IMPORT.finditer(source):
        ctx.reference(raw=match.group(1), relationship="grants_custom_permission",
                      location=line(match.start()), target_type="CustomPermission",
                      confidence="high")
    for match in N.LWC_MODULE_IMPORT.finditer(source):
        ctx.reference(raw=match.group(1).split("/", 1)[-1],
                      relationship="displays_component",
                      location=line(match.start()),
                      target_type="LightningComponentBundle", confidence="high")

    if ctx._references == 0:
        ctx.reason("the component's JavaScript imports no schema, Apex method, "
                   "label or other component")


_LWC_CHILD_TAG = re.compile(r"<\s*(c-[a-z0-9-]+)")
_LWC_OBJECT_ATTR = re.compile(
    r"""object-api-name\s*=\s*["']\{?\s*([A-Za-z0-9_.]+)"""
)
_LWC_FIELD_ATTR = re.compile(
    r"""(?:field-name|fields)\s*=\s*["']\{?\s*([A-Za-z0-9_.]+)"""
)


def _extract_lwc_template(ctx) -> None:
    markup, error = read_text(ctx.abs_path)
    if error:
        ctx.note(error)
        ctx.reason(error)
        return

    def line(offset):
        return f"line {N.line_of(markup, offset)}"

    seen = set()
    for match in _LWC_CHILD_TAG.finditer(markup):
        tag_name = match.group(1)
        if tag_name in seen:
            continue
        seen.add(tag_name)
        ctx.reference(raw=tag_name, relationship="displays_component",
                      location=line(match.start()),
                      target_type="LightningComponentBundle", confidence="medium")
    for match in _LWC_OBJECT_ATTR.finditer(markup):
        ctx.reference(raw=match.group(1), relationship="targets_object",
                      location=line(match.start()), target_type="CustomObject",
                      confidence="medium")
    for match in _LWC_FIELD_ATTR.finditer(markup):
        ctx.reference(raw=match.group(1), relationship="displays",
                      location=line(match.start()), target_type="CustomField",
                      confidence="medium")

    if ctx._references == 0:
        ctx.reason("the component's template names no child component, object or "
                   "field")


# ---------------------------------------------------------------------------
# Aura
# ---------------------------------------------------------------------------

_AURA_MARKUP_SUFFIXES = (".cmp", ".app", ".evt", ".intf", ".design")


def extract_aura(ctx) -> None:
    name = ctx.rel_path.rsplit("/", 1)[-1]

    if name.endswith("-meta.xml"):
        ctx.reason("sidecar file: the bundle's api version and description, no "
                   "references")
        return

    if name.endswith(_AURA_MARKUP_SUFFIXES):
        _extract_aura_markup(ctx)
        return

    if name.endswith(".js"):
        _extract_aura_javascript(ctx)
        return

    ctx.reason(f"'{name}' is a bundle file with no reference reader "
               "(styling, documentation or renderer)")


def _extract_aura_markup(ctx) -> None:
    markup, error = read_text(ctx.abs_path)
    if error:
        ctx.note(error)
        ctx.reason(error)
        return

    def line(offset):
        return f"line {N.line_of(markup, offset)}"

    for match in N.AURA_CONTROLLER_ATTR.finditer(markup):
        controller = match.group(1)
        ctx.reference(raw=controller, relationship="invokes",
                      location=line(match.start()), target_type="ApexClass",
                      confidence="medium")
    for match in N.AURA_OBJECT_ATTR.finditer(markup):
        ctx.reference(raw=match.group(1), relationship="targets_object",
                      location=line(match.start()), target_type="CustomObject",
                      confidence="medium")

    seen = set()
    for match in N.AURA_COMPONENT_TAG.finditer(markup):
        namespace, component = match.group(1), match.group(2)
        if namespace != "c":
            continue
        if component in seen:
            continue
        seen.add(component)
        ctx.reference(raw=component, relationship="displays_component",
                      location=line(match.start()),
                      target_type="AuraDefinitionBundle", confidence="medium")

    for ref in N.merge_field_references(markup):
        if ref["kind"] == "global":
            ctx.reference(raw=ref["raw"], relationship="references",
                          location="merge field in markup",
                          target_type=ref["global_name"], confidence="low")

    if ctx._references == 0:
        ctx.reason("the markup names no controller, object or custom component")


_AURA_APEX_METHOD = re.compile(r"""component\s*\.\s*get\s*\(\s*["']c\.([A-Za-z0-9_]+)["']""")


def _extract_aura_javascript(ctx) -> None:
    source, error = read_text(ctx.abs_path)
    if error:
        ctx.note(error)
        ctx.reason(error)
        return

    def line(offset):
        return f"line {N.line_of(source, offset)}"

    seen = set()
    for match in _AURA_APEX_METHOD.finditer(source):
        method = match.group(1)
        if method in seen:
            continue
        seen.add(method)
        ctx.reference(raw=method, relationship="invokes",
                      location=line(match.start()), target_type="ApexMethod",
                      confidence="low",
                      note="an Aura action name; the class it belongs to is the "
                           "bundle's controller attribute")

    if ctx._references == 0:
        ctx.reason("the bundle's JavaScript calls no server action")

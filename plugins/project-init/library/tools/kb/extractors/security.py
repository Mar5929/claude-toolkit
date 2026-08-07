"""security.py — who is granted what: permission sets, profiles, queues, groups, roles.

The measured gap: the old parser read a permission set's `fieldPermissions` and
nothing else. 73 permission set files carry `objectPermissions` and 5 carry
`classAccesses`, and neither was extracted, nor were record type visibility, tab
settings, application visibility, page access, flow access or custom permissions.
So a permission set that grants a whole object, or access to an Apex class,
looked like a permission set that grants nothing.

**Profiles are partial evidence, never a statement of what the org grants.** A
profile retrieve is lossy by design: only user permissions, login hours and login
IP ranges always come back, and everything else appears only when the matching
component was named in the same retrieve request. So a profile file understates
what its profile actually allows, and every reference from a profile carries
`partial_evidence` saying so. `.claude/rules/permissions-source-control.md` is
the standing rule; SPEC agent decision 3 applies it here.

A grant is recorded against the element that carries the decision, so
`fieldPermissions[Account.Type]/editable` is the evidence for the edit grant and
`.../field` is the evidence for the read grant. Two grants from one block stay
two separate, separately checkable references.
"""

from __future__ import annotations

from .xmlutil import child_text, local, text_of, walk

# element name -> (flag child, relationship, expected target type)
_OBJECT_GRANTS = (
    ("allowRead", "grants_object_read"),
    ("allowCreate", "grants_object_create"),
    ("allowEdit", "grants_object_edit"),
    ("allowDelete", "grants_object_delete"),
    ("viewAllRecords", "grants_view_all"),
    ("modifyAllRecords", "grants_modify_all"),
    ("viewAllFields", "grants_view_all"),
)

# element name -> (child holding the name, relationship, target type)
_SIMPLE_GRANTS = {
    "classAccesses": ("apexClass", "grants_apex_access", "ApexClass"),
    "pageAccesses": ("apexPage", "grants_page_access", "ApexPage"),
    "flowAccesses": ("flow", "grants_flow_access", "Flow"),
    "customPermissions": ("name", "grants_custom_permission", "CustomPermission"),
    "customSettingAccesses": ("name", "grants_object_read", "CustomObject"),
    "customMetadataTypeAccesses": ("name", "grants_object_read", "CustomObject"),
    "externalDataSourceAccesses": ("externalDataSource", "uses_data_source",
                                   "ExternalDataSource"),
    "recordTypeVisibilities": ("recordType", "grants_record_type", "RecordType"),
    "tabSettings": ("tab", "grants_tab", "CustomTab"),
    "tabVisibilities": ("tab", "grants_tab", "CustomTab"),
    "applicationVisibilities": ("application", "grants_app", "CustomApplication"),
}

_ENABLED_FLAGS = ("enabled", "visible", "readable", "available")


def _is_on(elem) -> bool:
    """Is this grant actually switched on? An unspecified flag counts as on."""
    for flag in _ENABLED_FLAGS:
        value = child_text(elem, flag)
        if value is not None:
            return value == "true"
    visibility = child_text(elem, "visibility")
    if visibility is not None:
        return visibility != "None" and visibility != "Hidden"
    return True


def _extract_grants(ctx, partial_evidence=False) -> None:
    """The permission blocks a permission set and a profile share."""
    root = ctx.xml_root
    if root is None:
        return
    extra = {"partial_evidence": True} if partial_evidence else {}

    for elem, path in walk(root):
        name = local(elem)

        if name == "fieldPermissions":
            field = child_text(elem, "field")
            if not field:
                continue
            ctx.consume(path)
            if child_text(elem, "readable") == "true":
                ctx.reference(raw=field, relationship="grants_field_read",
                              location=f"{path}/field", target_type="CustomField",
                              **extra)
            if child_text(elem, "editable") == "true":
                ctx.reference(raw=field, relationship="grants_field_edit",
                              location=f"{path}/editable", target_type="CustomField",
                              **extra)

        elif name == "objectPermissions":
            obj = child_text(elem, "object")
            if not obj:
                continue
            ctx.consume(path)
            emitted = False
            for flag, relationship in _OBJECT_GRANTS:
                if child_text(elem, flag) != "true":
                    continue
                location = f"{path}/object" if not emitted else f"{path}/{flag}"
                emitted = True
                ctx.reference(raw=obj, relationship=relationship,
                              location=location, target_type="CustomObject",
                              grant=flag, **extra)
            if not emitted:
                ctx.reference(raw=obj, relationship="references",
                              location=f"{path}/object", target_type="CustomObject",
                              grant="none", **extra)

        elif name in _SIMPLE_GRANTS:
            child_name, relationship, target_type = _SIMPLE_GRANTS[name]
            value = child_text(elem, child_name)
            if not value:
                continue
            ctx.consume(path)
            if not _is_on(elem):
                relationship = "references"
            ctx.reference(raw=value, relationship=relationship,
                          location=f"{path}/{child_name}", target_type=target_type,
                          visibility=child_text(elem, "visibility"),
                          default=child_text(elem, "default"), **extra)

        elif name == "layoutAssignments":
            layout = child_text(elem, "layout")
            record_type = child_text(elem, "recordType")
            ctx.consume(path)
            if layout:
                ctx.reference(raw=layout, relationship="grants_layout",
                              location=f"{path}/layout", target_type="Layout",
                              record_type=record_type, **extra)
            if record_type:
                ctx.reference(raw=record_type, relationship="grants_record_type",
                              location=f"{path}/recordType",
                              target_type="RecordType", **extra)

        elif name == "userPermissions":
            # A platform permission such as ModifyAllData. It names no component,
            # so it is an attribute of the permission set rather than an edge.
            ctx.consume(path)


def extract_permission_set(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    ctx.component(label=child_text(root, "label"),
                  license=child_text(root, "license"),
                  has_activation_required=child_text(root, "hasActivationRequired"))
    _extract_grants(ctx)
    if ctx._references == 0:
        ctx.reason("a permission set granting only platform user permissions, "
                   "which name no component")


def extract_profile(ctx) -> None:
    """118 files, never opened before. Partial evidence by design; see the header."""
    root = ctx.xml_root
    if root is None:
        return
    ctx.component(user_license=child_text(root, "userLicense"),
                  custom=child_text(root, "custom"),
                  evidence_quality="partial: a profile retrieve is lossy")
    _extract_grants(ctx, partial_evidence=True)
    if ctx._references == 0:
        ctx.reason("this profile file holds only user permissions, login hours or "
                   "login IP ranges; a profile retrieve returns the rest only when "
                   "the matching component was named in the same request")


def extract_permission_set_group(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    ctx.component(label=child_text(root, "label"),
                  status=child_text(root, "status"))
    for elem, path in walk(root):
        name = local(elem)
        if name == "permissionSets" and text_of(elem):
            ctx.consume(path)
            ctx.reference(raw=text_of(elem), relationship="contains_permission_set",
                          location=path, target_type="PermissionSet")
        elif name == "mutingPermissionSets" and text_of(elem):
            ctx.consume(path)
            ctx.reference(raw=text_of(elem), relationship="contains_permission_set",
                          location=path, target_type="MutingPermissionSet",
                          muting=True)
    if ctx._references == 0:
        ctx.reason("a permission set group holding no permission sets")


def extract_queue(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    ctx.component(name=child_text(root, "name"),
                  send_email_to_members=child_text(root, "doesSendEmailToMembers"))
    for elem, path in walk(root):
        name = local(elem)
        if name == "queueSobject":
            sobject = child_text(elem, "sobjectType")
            if sobject:
                ctx.consume(path)
                ctx.reference(raw=sobject, relationship="references",
                              location=f"{path}/sobjectType",
                              target_type="CustomObject")
        elif name == "queueMembers":
            for child in elem:
                tag_name = local(child)
                for value in _member_values(child):
                    ctx.reference(raw=value, relationship="member_of",
                                  location=f"{path}/{tag_name}",
                                  target_type=_member_type(tag_name))
            ctx.consume(path)
    if ctx._references == 0:
        ctx.reason("a queue with no object types and no members in its file")


def extract_group(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    ctx.component(name=child_text(root, "name"),
                  includes_bosses=child_text(root, "doesIncludeBosses"))
    found = False
    for elem, path in walk(root):
        if local(elem) not in ("groupMembers", "roleAndSubordinates", "roles",
                               "groups", "users"):
            continue
        for value in _member_values(elem):
            found = True
            ctx.reference(raw=value, relationship="member_of", location=path,
                          target_type=_member_type(local(elem)))
        ctx.consume(path)
    if not found:
        ctx.reason("a public group whose membership is held in the org rather than "
                   "in this file")


def extract_role(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    parent = child_text(root, "parentRole")
    ctx.component(name=child_text(root, "name"),
                  case_access=child_text(root, "caseAccessLevel"),
                  opportunity_access=child_text(root, "opportunityAccessLevel"))
    if parent:
        ctx.consume("parentRole")
        ctx.reference(raw=parent, relationship="member_of", location="parentRole",
                      target_type="Role")
    else:
        ctx.reason("a top-level role: it has no parent role and names nothing else")


def _member_values(elem):
    if text_of(elem):
        return [text_of(elem)]
    return [text_of(child) for child in elem if text_of(child)]


def _member_type(tag_name: str) -> str:
    return {
        "roles": "Role", "roleAndSubordinates": "Role", "role": "Role",
        "groups": "Group", "group": "Group",
        "users": "User", "user": "User",
        "publicGroups": "Group", "queues": "Queue",
    }.get(tag_name, "")

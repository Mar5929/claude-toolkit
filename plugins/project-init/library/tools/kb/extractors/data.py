"""data.py — custom metadata records, custom labels, and the integration settings.

Custom labels were a measured gap: 62 labels in the two orgs, all of them
components with zero edges in or out. A label cannot point at anything, so the
fix is not here but in the readers that reference one: Apex (`System.Label.X`),
a Lightning web component (`@salesforce/label/c.X`) and a formula (`$Label.X`)
all now emit a reference, so labels finally have inbound edges.

What this module does add is one component per label rather than one per file.
`CustomLabels.labels-meta.xml` is a single file holding every label in the org,
so without splitting it there would be one node called "CustomLabels" and every
reference to any label would miss.
"""

from __future__ import annotations

from .xmlutil import child_text, local, text_of, walk


def extract_custom_metadata(ctx) -> None:
    """One custom metadata record. The file name is Type.Record.md-meta.xml."""
    root = ctx.xml_root
    if root is None:
        return
    name = ctx.component_name
    if "." in name:
        type_name, record_name = name.split(".", 1)
    else:
        type_name, record_name = "", name

    type_id = ""
    if type_name:
        type_id = ctx.component(metadata_type="CustomObject",
                                api_name=f"{type_name}__mdt",
                                file_path="")
        ctx.reference(raw=f"{type_name}__mdt", relationship="references",
                      location="fullName", target_type="CustomObject",
                      confidence="medium",
                      note="the record's type is the part of the file name before "
                           "the dot")

    ctx.component(label=child_text(root, "label"),
                  protected=child_text(root, "protected"),
                  record=record_name, parent_id=type_id)

    for elem, path in walk(root):
        if local(elem) != "values":
            continue
        field = child_text(elem, "field")
        if not field:
            continue
        ctx.consume(path)
        ctx.reference(raw=field, relationship="writes", location=f"{path}/field",
                      target_type="CustomField",
                      target_parent=f"{type_name}__mdt" if type_name else "",
                      note="a custom metadata record holds a value in this field")

    if ctx._references == 0:
        ctx.reason("a custom metadata record with no field values in its file")


def extract_custom_labels(ctx) -> None:
    """One file holding every label in the org. Each label becomes a component."""
    root = ctx.xml_root
    if root is None:
        return
    count = 0
    for elem, path in walk(root):
        if local(elem) != "labels":
            continue
        full_name = child_text(elem, "fullName")
        if not full_name:
            continue
        count += 1
        ctx.component(metadata_type="CustomLabel", api_name=full_name,
                      parent_id=ctx.own_component_id,
                      language=child_text(elem, "language"),
                      categories=child_text(elem, "categories"),
                      protected=child_text(elem, "protected"))
        ctx.reference(raw=full_name, relationship="contains", location=path,
                      target_type="CustomLabel", source_id=ctx.own_component_id)

    ctx.component(label_count=count)
    if count == 0:
        ctx.reason("a custom labels file holding no labels")


def extract_remote_site(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    url = child_text(root, "url")
    ctx.component(url=url, active=child_text(root, "isActive"))
    if url:
        ctx.consume("url")
        ctx.reference(raw=url, relationship="calls_endpoint", location="url",
                      target_type="", external=True)
    else:
        ctx.reason("a remote site setting with no url in its file")


def extract_named_credential(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    ctx.component(endpoint=child_text(root, "endpoint"),
                  principal_type=child_text(root, "principalType"),
                  protocol=child_text(root, "protocol"))
    for elem, path in walk(root):
        name = local(elem)
        value = text_of(elem)
        if not value:
            continue
        if name == "endpoint":
            ctx.consume(path)
            ctx.reference(raw=value, relationship="calls_endpoint", location=path,
                          external=True)
        elif name in ("authProvider", "externalCredential",
                      "generatedAuthProviders"):
            ctx.consume(path)
            ctx.reference(raw=value, relationship="uses_credential", location=path,
                          target_type=("ExternalCredential"
                                       if name == "externalCredential"
                                       else "AuthProvider"))
    if ctx._references == 0:
        ctx.reason("a named credential with no endpoint and no credential named")


def extract_external_data_source(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    ctx.component(endpoint=child_text(root, "endpoint"),
                  source_type=child_text(root, "type"),
                  principal_type=child_text(root, "principalType"))
    for elem, path in walk(root):
        name = local(elem)
        value = text_of(elem)
        if not value:
            continue
        if name == "endpoint":
            ctx.consume(path)
            ctx.reference(raw=value, relationship="calls_endpoint", location=path,
                          external=True)
        elif name in ("authProvider", "externalCredential"):
            ctx.consume(path)
            ctx.reference(raw=value, relationship="uses_credential", location=path,
                          target_type="ExternalCredential")
    if ctx._references == 0:
        ctx.reason("an external data source with no endpoint in its file")


def extract_external_service(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    ctx.component(status=child_text(root, "status"),
                  schema_type=child_text(root, "schemaType"))
    credential = child_text(root, "namedCredential") or \
        child_text(root, "namedCredentialReference")
    if credential:
        ctx.consume("namedCredential")
        ctx.reference(raw=credential, relationship="uses_credential",
                      location="namedCredential", target_type="NamedCredential")
    else:
        ctx.reason("an external service registration naming no credential; its "
                   "schema is stored inline and names no org component")


def extract_installed_package(ctx) -> None:
    root = ctx.xml_root
    if root is None:
        return
    ctx.component(namespace=ctx.component_name,
                  version=child_text(root, "versionNumber"),
                  activate_rss=child_text(root, "activateRSS"))
    ctx.reason("records an installed managed package: its namespace and version "
               "only, which point at nothing inside the org")

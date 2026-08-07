"""driver.py — run every file in an org's tree through the right extractor.

The order for one file:

1. The registry already said what the file is. Register the component it belongs
   to, so something exists for other files to point at even when this file has no
   references of its own.
2. Run the deep extractor for its metadata type, if there is one.
3. Run the generic pass over the same parsed XML.
4. Drop any generic reference that landed on an element the deep extractor had
   already read, matched on (element path, raw string).
5. Write exactly one outcome record for the file, saying what happened and, when
   nothing came out, why.

Step 5 is SPEC requirement 1: every file the registry lists is either opened by
an extractor or recorded with a stated reason for not opening it, with no silent
skips. `ExtractionResult.unexplained_zero_files()` must always come back empty,
and a test asserts it.
"""

from __future__ import annotations

import os

from . import _kbpath  # noqa: F401
from file_registry import build_registry  # noqa: E402

from .contracts import ExtractionResult, FileContext, FileOutcome, component_id
from .generic import extract_generic
from .xmlutil import parse_file

from . import analytics, apex, automation, data, flows, interface, objects, security

# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

# metadata type -> the deep extractor that knows where that type hides its
# references. Everything not named here is covered by the generic pass alone.
DEEP_EXTRACTORS = {
    # object model
    "CustomObject": objects.extract_custom_object,
    "CustomField": objects.extract_custom_field,
    "RecordType": objects.extract_record_type,
    "ValidationRule": objects.extract_validation_rule,
    "ListView": objects.extract_list_view,
    "WebLink": objects.extract_web_link,
    "CompactLayout": objects.extract_compact_layout,
    "FieldSet": objects.extract_field_set,
    "BusinessProcess": objects.extract_business_process,
    "SharingRules": objects.extract_sharing_rules,
    "GlobalValueSet": objects.extract_value_set,
    "StandardValueSet": objects.extract_value_set,
    # automation
    "Flow": flows.extract_flow,
    "FlowDefinition": flows.extract_flow_definition,
    "Workflow": automation.extract_workflow,
    "ApprovalProcess": automation.extract_approval_process,
    "AssignmentRules": automation.extract_rule_set,
    "AutoResponseRules": automation.extract_rule_set,
    "EscalationRules": automation.extract_rule_set,
    "DuplicateRule": automation.extract_duplicate_rule,
    "MatchingRule": automation.extract_matching_rule,
    "EntitlementProcess": automation.extract_entitlement_process,
    # code
    "ApexClass": apex.extract_apex_class,
    "ApexTrigger": apex.extract_apex_trigger,
    "ApexPage": apex.extract_visualforce,
    "ApexComponent": apex.extract_visualforce,
    "LightningComponentBundle": apex.extract_lwc,
    "AuraDefinitionBundle": apex.extract_aura,
    # interface
    "Layout": interface.extract_layout,
    "FlexiPage": interface.extract_flexipage,
    "QuickAction": interface.extract_quick_action,
    "CustomApplication": interface.extract_custom_application,
    "CustomTab": interface.extract_custom_tab,
    "PathAssistant": interface.extract_path_assistant,
    "HomePageLayout": interface.extract_home_page_layout,
    # security
    "PermissionSet": security.extract_permission_set,
    "PermissionSetGroup": security.extract_permission_set_group,
    "Profile": security.extract_profile,
    "Queue": security.extract_queue,
    "Group": security.extract_group,
    "Role": security.extract_role,
    # analytics
    "Report": analytics.extract_report,
    "ReportType": analytics.extract_report_type,
    "Dashboard": analytics.extract_dashboard,
    # data
    "CustomMetadata": data.extract_custom_metadata,
    "CustomLabels": data.extract_custom_labels,
    "RemoteSiteSetting": data.extract_remote_site,
    "NamedCredential": data.extract_named_credential,
    "ExternalDataSource": data.extract_external_data_source,
    "ExternalServiceRegistration": data.extract_external_service,
    "InstalledPackage": data.extract_installed_package,
}

# Types whose content is listed but deliberately not parsed. SPEC agent decision
# 2: static resources, object translations and images are recorded in the
# coverage report and nothing inside them is read.
SKIP_TYPE_REASONS = {
    "CustomObjectTranslation": (
        "translated labels only; the object it translates is named by the file "
        "path, and translations hold no references of their own "
        "(SPEC agent decision 2)"
    ),
    "CustomFieldTranslation": (
        "translated labels only; the field it translates is named by the file "
        "path (SPEC agent decision 2)"
    ),
    "Translations": (
        "translated labels only, no references (SPEC agent decision 2)"
    ),
    "StaticResource": (
        "a static resource is arbitrary content (images, JavaScript, archives) "
        "rather than metadata; not parsed (SPEC agent decision 2)"
    ),
    "Certificate": "certificate key material; binary, no references",
    "Document": "an uploaded file; binary content, not metadata",
    "ContentAsset": "an uploaded asset; binary content, not metadata",
}

# File extensions holding content no extractor reads.
BINARY_EXTENSIONS = frozenset({
    "png", "jpg", "jpeg", "gif", "bmp", "ico", "svg", "webp", "tif", "tiff",
    "woff", "woff2", "ttf", "eot", "otf",
    "zip", "gz", "jar", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
    "mp3", "mp4", "mov", "avi", "wav", "csv", "txt", "map", "min",
    "crt", "cer", "pem", "key", "jks",
})

# Extensions inside a bundle that hold styling, not references.
STYLE_EXTENSIONS = frozenset({"css", "scss", "less"})

XML_EXTENSIONS = frozenset({"xml"})

# Which metadata type contains a component, by the folder it sits in. Used to
# give a component its parent id.
PARENT_TYPE_BY_DIRECTORY = {
    "objects": "CustomObject",
    "objectTranslations": "CustomObjectTranslation",
    "reports": "ReportFolder",
    "dashboards": "DashboardFolder",
    "documents": "DocumentFolder",
    "email": "EmailFolder",
}


def _extension(name: str) -> str:
    return name.rsplit(".", 1)[-1].lower() if "." in name else ""


def _is_xml(rel_path: str) -> bool:
    return rel_path.lower().endswith(".xml")


def _parent_id(org: str, record) -> str:
    if not record.parent_name:
        return ""
    parent_type = PARENT_TYPE_BY_DIRECTORY.get(record.directory)
    if not parent_type:
        return ""
    if record.metadata_type == parent_type:
        return ""
    return component_id(org, parent_type, record.parent_name)


# ---------------------------------------------------------------------------
# One file
# ---------------------------------------------------------------------------

def process_file(org, record, force_app_root, result) -> FileOutcome:
    """Run one file all the way through and return its outcome record."""
    outcome = FileOutcome(
        org=org, file_path=record.repo_path, metadata_type=record.metadata_type,
        role=record.role, opened=False, extractor="",
    )

    if record.role == "non_metadata":
        outcome.reason = record.note or "not Salesforce metadata"
        result.outcomes.append(outcome)
        return outcome

    abs_path = os.path.join(str(force_app_root), record.rel_path.replace("/", os.sep))
    extractor = DEEP_EXTRACTORS.get(record.metadata_type)
    ctx = FileContext(
        org=org, record=record, abs_path=abs_path, result=result,
        extractor_name=extractor.__name__ if extractor else "generic",
    )

    # Every file registers the component it belongs to, even one whose content
    # is never read, so nothing in the org is missing as a target.
    ctx.own_component_id = ctx.component(parent_id=_parent_id(org, record))
    outcome.component_count = 1

    skip_reason = SKIP_TYPE_REASONS.get(record.metadata_type)
    extension = _extension(record.rel_path.rsplit("/", 1)[-1])
    if skip_reason is None and extension in BINARY_EXTENSIONS:
        skip_reason = f"a .{extension} file; binary or plain content, no references"
    elif skip_reason is None and extension in STYLE_EXTENSIONS:
        skip_reason = f"a .{extension} stylesheet; styling only, no references"

    if skip_reason:
        outcome.reason = skip_reason
        outcome.extractor = ""
        result.outcomes.append(outcome)
        return outcome

    # Parse the XML once and hand the same tree to both passes.
    ctx.xml_root = None
    if _is_xml(record.rel_path):
        root, error = parse_file(abs_path)
        if error:
            outcome.error = error
            outcome.reason = f"could not be read: {error}"
            outcome.opened = True
            result.outcomes.append(outcome)
            result.note(f"{record.repo_path}: {error}")
            return outcome
        ctx.xml_root = root

    outcome.opened = True
    start = len(result.references)

    if extractor is not None:
        try:
            extractor(ctx)
        except Exception as exc:                      # noqa: BLE001
            outcome.error = f"{type(exc).__name__}: {exc}"
            result.note(f"{record.repo_path}: extractor failed: {outcome.error}")

    deep_keys = {(ref.location, ref.raw) for ref in result.references[start:]}
    generic_start = len(result.references)

    try:
        extract_generic(ctx)
    except Exception as exc:                          # noqa: BLE001
        outcome.error = (outcome.error + "; " if outcome.error else "") + \
            f"generic pass failed: {type(exc).__name__}: {exc}"
        result.note(f"{record.repo_path}: generic pass failed: {exc}")

    kept = []
    seen = set()
    for ref in result.references[generic_start:]:
        if (ref.location, ref.raw) in deep_keys:
            continue
        key = ref.dedupe_key()
        if key in seen:
            continue
        seen.add(key)
        kept.append(ref)
    result.references[generic_start:] = kept

    outcome.extractor = ctx.extractor_name
    outcome.reference_count = len(result.references) - start
    outcome.component_count = ctx._components

    if outcome.reference_count == 0 and not outcome.reason:
        if ctx.reasons:
            outcome.reason = "; ".join(ctx.reasons)
        elif ctx.xml_root is None:
            outcome.reason = (
                "not an XML metadata file and no text extractor for this type"
            )
        elif record.role == "sidecar":
            outcome.reason = (
                "sidecar file: settings for the component beside it, no references"
            )
        else:
            outcome.reason = (
                "opened and read in full; no reference-shaped element in it"
            )

    result.outcomes.append(outcome)
    return outcome


# ---------------------------------------------------------------------------
# A whole org
# ---------------------------------------------------------------------------

def extract_org(force_app_root, org: str, registry=None) -> ExtractionResult:
    """Every component and raw reference in one org's metadata tree.

    Local files only. Nothing here contacts a Salesforce org, by design and by
    `.claude/rules/dependency-graph.md` rule 5: all three orgs are production, so
    there is no safe org to touch.
    """
    registry = registry if registry is not None else build_registry(force_app_root, org)
    result = ExtractionResult(org=org, root=registry.root)
    for error in registry.errors:
        result.note(f"registry: {error}")

    # Read the names the Apex reader needs before opening a single file. Both
    # come from the registry's file list, so this costs nothing.
    for record in registry.files:
        if record.metadata_type == "CustomObject" and record.directory == "objects":
            result.known_objects.add(record.component_name)
        elif record.metadata_type == "ApexClass" and not record.rel_path.endswith(
                "-meta.xml"):
            result.known_classes.add(record.component_name)

    for record in registry.files:
        process_file(org, record, force_app_root, result)
    return result

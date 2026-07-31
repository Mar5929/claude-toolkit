"""parse_force_app.py — walk Salesforce metadata XML and emit Components + Edges.

Public API:
    parse_force_app(force_app_root: str) -> ParseResult

force_app_root is the absolute path to .../force-app/main/default. Stdlib only.
Per-file errors are appended to result.notes; the parser does not crash.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from xml.etree import ElementTree as ET

from models import (
    Component, Edge, ParseResult,
    apex_class_id, apex_trigger_id, custom_label_id, custom_metadata_id,
    custom_metadata_type_id, dashboard_id, field_id, flow_id, object_id,
    permission_set_group_id, permission_set_id, record_type_id,
    remote_site_id, report_folder_id, report_id, report_type_id,
    validation_rule_id, workflow_id, tag,
)


# Apex identifiers that look like user classes but aren't (filter out of INVOKES)
APEX_BUILTINS = frozenset([
    "List", "Map", "Set", "Database", "System", "String", "Integer", "Decimal",
    "Date", "Datetime", "Time", "Boolean", "Id", "Schema", "SObject", "Test",
    "Trigger", "Long", "Double", "Object", "Type", "Exception", "Pattern",
    "Matcher", "Limits", "JSON", "EncodingUtil", "Crypto", "Http", "HttpRequest",
    "HttpResponse", "PageReference", "ApexPages", "UserInfo", "Url", "Blob",
    "Math", "Messaging", "Approval", "ConnectApi", "Auth", "Cache", "Cookie",
    "FieldSet", "FieldSetMember", "Comparable", "Iterable", "Iterator",
    "Queueable", "Schedulable", "Batchable", "Stateful", "AllowsCallouts",
    "RaisesPlatformEvents", "QueryLocator", "BatchableContext", "QueueableContext",
    "SchedulableContext", "DescribeFieldResult", "DescribeSObjectResult",
    "PicklistEntry", "RecordTypeInfo", "ChildRelationship", "SaveResult",
    "DeleteResult", "UpsertResult", "MergeResult", "Error", "StatusCode",
    # Common SObjects (not user classes)
    "Account", "Contact", "Lead", "Opportunity", "Case", "User", "Profile",
    "Group", "Task", "Event", "Campaign", "CampaignMember", "AsyncApexJob",
    "ApexClass", "ApexTrigger",
])

APEX_NEW_RE = re.compile(r'\bnew\s+([A-Z][A-Za-z0-9_]*)\s*[\(<]')
APEX_STATIC_CALL_RE = re.compile(r'\b([A-Z][A-Za-z0-9_]+)\s*\.\s*[a-zA-Z_]')
SOQL_RE = re.compile(
    r'\[\s*SELECT\s+([\s\S]+?)\s+FROM\s+([A-Za-z_][A-Za-z0-9_]*)\b',
    re.IGNORECASE,
)
DML_RE = re.compile(
    r'\b(insert|update|upsert|delete|merge|undelete)\s+([A-Za-z_][A-Za-z0-9_]*)\b',
    re.IGNORECASE,
)
TRIGGER_HEADER_RE = re.compile(
    r'\btrigger\s+(\w+)\s+on\s+(\w+)\b',
    re.IGNORECASE,
)
FORMULA_FIELD_RE = re.compile(r'\b([A-Za-z_][A-Za-z0-9_]*__c)\b')
FIELD_API_RE = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*$')
FLOW_RECORD_REF_PREFIXES = ("$Record.", "myVariable_current.", "myVariable_old.")
FLOW_REFERENCE_TAGS = {
    "leftValueReference",
    "rightValueReference",
    "elementReference",
    "inputReference",
    "stringValue",
}


class _Parser:
    def __init__(self, root: Path):
        self.root = root
        self.result = ParseResult()
        self._seen_ids: set[str] = set()
        # Map from class name (lowercase) to the component id, for INVOKES resolution.
        self._class_index: set[str] = set()

    # --- registration helpers --------------------------------------------------

    def add_component(self, c: Component) -> None:
        if c.id in self._seen_ids:
            return
        self._seen_ids.add(c.id)
        self.result.components.append(c)
        if c.type == "ApexClass":
            self._class_index.add(c.name)

    def add_edge(self, e: Edge) -> None:
        self.result.edges.append(e)

    def ensure_object(self, name: str, file_path: str | None = None) -> None:
        oid = object_id(name)
        if oid in self._seen_ids:
            return
        self.add_component(Component(
            id=oid, type="Object", name=name,
            file_path=file_path, source="force-app",
        ))

    def note(self, msg: str) -> None:
        self.result.notes.append(msg)

    def orphan(self, ref: str) -> None:
        self.result.orphan_refs.append(ref)

    # --- top-level driver ------------------------------------------------------

    def parse(self) -> ParseResult:
        if not self.root.exists():
            self.note(f"force-app root not found: {self.root}")
            return self.result

        objects_dir = self.root / "objects"
        if objects_dir.exists():
            for d in sorted(p for p in objects_dir.iterdir() if p.is_dir()):
                self._parse_object_dir(d)

        flows_dir = self.root / "flows"
        if flows_dir.exists():
            for f in sorted(flows_dir.glob("*.flow-meta.xml")):
                self._parse_flow(f)

        # First pass: register every Apex class, so INVOKES resolution works
        classes_dir = self.root / "classes"
        if classes_dir.exists():
            for f in sorted(classes_dir.glob("*.cls")):
                self._register_apex_class(f)
            for f in sorted(classes_dir.glob("*.cls")):
                self._parse_apex_body(f)

        triggers_dir = self.root / "triggers"
        if triggers_dir.exists():
            for f in sorted(triggers_dir.glob("*.trigger")):
                self._parse_apex_trigger(f)

        ps_dir = self.root / "permissionsets"
        if ps_dir.exists():
            for f in sorted(ps_dir.glob("*.permissionset-meta.xml")):
                self._parse_permission_set(f)

        psg_dir = self.root / "permissionsetgroups"
        if psg_dir.exists():
            for f in sorted(psg_dir.glob("*.permissionsetgroup-meta.xml")):
                self._parse_permission_set_group(f)

        wf_dir = self.root / "workflows"
        if wf_dir.exists():
            for f in sorted(wf_dir.glob("*.workflow-meta.xml")):
                self._parse_workflow(f)

        labels_file = self.root / "labels" / "CustomLabels.labels-meta.xml"
        if labels_file.exists():
            self._parse_custom_labels(labels_file)

        cm_dir = self.root / "customMetadata"
        if cm_dir.exists():
            for f in sorted(cm_dir.glob("*.md-meta.xml")):
                self._parse_custom_metadata(f)

        rs_dir = self.root / "remoteSiteSettings"
        if rs_dir.exists():
            for f in sorted(rs_dir.glob("*.remoteSite-meta.xml")):
                self._parse_remote_site(f)

        reports_dir = self.root / "reports"
        if reports_dir.exists():
            self._parse_reports(reports_dir)

        rt_dir = self.root / "reportTypes"
        if rt_dir.exists():
            for f in sorted(rt_dir.glob("*.reportType-meta.xml")):
                self._parse_report_type(f)

        dash_dir = self.root / "dashboards"
        if dash_dir.exists():
            self._parse_dashboards(dash_dir)

        return self.result

    # --- xml utilities ---------------------------------------------------------

    def _parse_xml(self, path: Path) -> ET.Element | None:
        try:
            return ET.parse(path).getroot()
        except ET.ParseError as exc:
            self.note(f"XML parse error: {path}: {exc}")
            return None
        except OSError as exc:
            self.note(f"file read error: {path}: {exc}")
            return None

    def _rel(self, path: Path) -> str:
        try:
            return path.relative_to(self.root.parent.parent.parent).as_posix()
        except ValueError:
            return path.as_posix()

    def _text(self, elem: ET.Element | None, name: str) -> str | None:
        """First-child text of given (namespace-stripped) name."""
        if elem is None:
            return None
        for child in elem:
            if tag(child) == name:
                return child.text
        return None

    def _children(self, elem: ET.Element | None, name: str):
        if elem is None:
            return
        for child in elem:
            if tag(child) == name:
                yield child

    def _flow_record_field_from_ref(self, ref: str | None) -> str | None:
        if not ref:
            return None
        text = ref.strip()
        for prefix in FLOW_RECORD_REF_PREFIXES:
            if not text.startswith(prefix):
                continue
            field_name = text[len(prefix):].strip()
            if "." in field_name:
                return None
            if FIELD_API_RE.match(field_name):
                return field_name
        return None

    def _add_flow_field_reads(
        self,
        flow_component_id: str,
        field_tag_object: str | None,
        elem: ET.Element,
        source_path: str,
        evidence_prefix: str,
        record_ref_object: str | None = None,
    ) -> None:
        seen: set[tuple[str, str, str]] = set()
        for desc in elem.iter():
            tag_name = tag(desc)
            text = desc.text.strip() if desc.text else ""

            if tag_name == "field" and text and field_tag_object:
                seen.add((field_tag_object, text, "field reference"))
                continue

            if tag_name not in FLOW_REFERENCE_TAGS or not record_ref_object:
                continue
            field_name = self._flow_record_field_from_ref(text)
            if field_name:
                seen.add((record_ref_object, field_name, "record reference"))

        for obj_name, field_name, evidence_kind in sorted(seen):
            self.ensure_object(obj_name)
            self.add_edge(Edge(
                src_id=flow_component_id,
                dst_id=field_id(obj_name, field_name),
                kind="READS",
                source=source_path,
                confidence="medium",
                evidence=f"{evidence_prefix} {evidence_kind}",
            ))

    # --- objects / fields / record types / validation rules --------------------

    def _parse_object_dir(self, obj_dir: Path) -> None:
        obj_name = obj_dir.name
        meta = obj_dir / f"{obj_name}.object-meta.xml"
        self.ensure_object(obj_name, self._rel(meta) if meta.exists() else None)

        fields_dir = obj_dir / "fields"
        if fields_dir.exists():
            for f in sorted(fields_dir.glob("*.field-meta.xml")):
                self._parse_field(f, obj_name)

        rt_dir = obj_dir / "recordTypes"
        if rt_dir.exists():
            for f in sorted(rt_dir.glob("*.recordType-meta.xml")):
                self._parse_record_type(f, obj_name)

        vr_dir = obj_dir / "validationRules"
        if vr_dir.exists():
            for f in sorted(vr_dir.glob("*.validationRule-meta.xml")):
                self._parse_validation_rule(f, obj_name)

    def _parse_field(self, path: Path, obj_name: str) -> None:
        root = self._parse_xml(path)
        if root is None:
            return
        full_name = self._text(root, "fullName") or path.stem.replace(".field-meta", "")
        meta: dict = {}
        for key in ("label", "type", "formula", "defaultValue", "summarizedField",
                    "summaryForeignKey", "summaryOperation", "deprecated"):
            val = self._text(root, key)
            if val is not None:
                meta[key] = val

        fid = field_id(obj_name, full_name)
        self.add_component(Component(
            id=fid, type="Field", name=full_name,
            parent_id=object_id(obj_name),
            file_path=self._rel(path),
            metadata_json=json.dumps(meta) if meta else None,
            source="force-app",
        ))
        self.add_edge(Edge(
            src_id=object_id(obj_name), dst_id=fid,
            kind="CONTAINS", source=self._rel(path), confidence="high",
        ))

        formula = meta.get("formula")
        if formula:
            for ref in set(FORMULA_FIELD_RE.findall(formula)):
                if ref == full_name:
                    continue
                self.add_edge(Edge(
                    src_id=fid, dst_id=field_id(obj_name, ref),
                    kind="FORMULA_REFERENCES", source=self._rel(path),
                    confidence="medium",
                    evidence=f"formula references {ref}",
                ))

        sfk = meta.get("summaryForeignKey")
        op = meta.get("summaryOperation")
        if sfk and op:
            target_obj = sfk.split(".")[0]
            self.ensure_object(target_obj)
            self.add_edge(Edge(
                src_id=fid, dst_id=object_id(target_obj),
                kind="ROLLUP_OF", source=self._rel(path), confidence="high",
                evidence=f"{op} of {meta.get('summarizedField', '?')}",
            ))

    def _parse_record_type(self, path: Path, obj_name: str) -> None:
        root = self._parse_xml(path)
        if root is None:
            return
        full_name = self._text(root, "fullName") or path.stem.replace(".recordType-meta", "")
        rid = record_type_id(obj_name, full_name)
        active = self._text(root, "active")
        label = self._text(root, "label")
        self.add_component(Component(
            id=rid, type="RecordType", name=full_name,
            parent_id=object_id(obj_name),
            file_path=self._rel(path),
            status="Active" if active == "true" else "Inactive",
            metadata_json=json.dumps({"label": label}) if label else None,
            source="force-app",
        ))
        self.add_edge(Edge(
            src_id=object_id(obj_name), dst_id=rid,
            kind="CONTAINS", source=self._rel(path), confidence="high",
        ))

    def _parse_validation_rule(self, path: Path, obj_name: str) -> None:
        root = self._parse_xml(path)
        if root is None:
            return
        full_name = self._text(root, "fullName") or path.stem.replace(".validationRule-meta", "")
        vid = validation_rule_id(obj_name, full_name)
        active = self._text(root, "active")
        formula = self._text(root, "errorConditionFormula") or ""
        msg = self._text(root, "errorMessage")
        self.add_component(Component(
            id=vid, type="ValidationRule", name=full_name,
            parent_id=object_id(obj_name),
            file_path=self._rel(path),
            status="Active" if active == "true" else "Inactive",
            metadata_json=json.dumps({"errorMessage": msg}) if msg else None,
            source="force-app",
        ))
        self.add_edge(Edge(
            src_id=object_id(obj_name), dst_id=vid,
            kind="CONTAINS", source=self._rel(path), confidence="high",
        ))
        for ref in set(FORMULA_FIELD_RE.findall(formula)):
            self.add_edge(Edge(
                src_id=vid, dst_id=field_id(obj_name, ref),
                kind="REFERENCES", source=self._rel(path),
                confidence="medium",
                evidence=f"errorConditionFormula references {ref}",
            ))

    # --- flows -----------------------------------------------------------------

    def _parse_flow(self, path: Path) -> None:
        root = self._parse_xml(path)
        if root is None:
            return
        name = path.stem.replace(".flow-meta", "")
        fid = flow_id(name)
        api_version = self._text(root, "apiVersion")
        status = self._text(root, "status")
        process_type = self._text(root, "processType")

        start = next(self._children(root, "start"), None)
        start_obj = self._text(start, "object") if start is not None else None
        trigger_type = self._text(start, "triggerType") if start is not None else None
        record_trigger_type = self._text(start, "recordTriggerType") if start is not None else None
        scheduled = start is not None and (
            self._text(start, "scheduledStartTime") is not None
            or next(self._children(start, "schedule"), None) is not None
        )

        if trigger_type in ("RecordBeforeSave", "RecordAfterSave"):
            writer_kind = "flow_record_triggered"
        elif scheduled:
            writer_kind = "flow_scheduled"
        elif process_type in ("Flow",):
            writer_kind = "flow_screen"
        else:
            writer_kind = "flow_autolaunched"

        meta = {
            "processType": process_type,
            "triggerType": trigger_type,
            "recordTriggerType": record_trigger_type,
            "startObject": start_obj,
        }
        meta = {k: v for k, v in meta.items() if v is not None}

        self.add_component(Component(
            id=fid, type="Flow", name=name,
            api_version=api_version, status=status,
            file_path=self._rel(path),
            metadata_json=json.dumps(meta) if meta else None,
            source="force-app",
        ))

        if start_obj:
            self.ensure_object(start_obj)
            self.add_edge(Edge(
                src_id=fid, dst_id=object_id(start_obj),
                kind="TRIGGERS_ON", source=self._rel(path), confidence="high",
            ))
            if start is not None:
                self._add_flow_field_reads(
                    fid,
                    field_tag_object=start_obj,
                    elem=start,
                    source_path=self._rel(path),
                    evidence_prefix="start",
                    record_ref_object=start_obj,
                )

        # WRITES from recordUpdates / recordCreates that target $Record
        for elem_name in ("recordUpdates", "recordCreates"):
            for ru in self._children(root, elem_name):
                # Determine target object: inputReference == $Record means start_obj;
                # otherwise look for an explicit <object> child.
                input_ref = self._text(ru, "inputReference")
                explicit_obj = self._text(ru, "object")
                target_obj = None
                if explicit_obj:
                    target_obj = explicit_obj
                elif input_ref and "$Record" in input_ref:
                    target_obj = start_obj
                if not target_obj:
                    continue
                self.ensure_object(target_obj)
                for ia in self._children(ru, "inputAssignments"):
                    fld = self._text(ia, "field")
                    if not fld:
                        continue
                    self.add_edge(Edge(
                        src_id=fid, dst_id=field_id(target_obj, fld),
                        kind="WRITES",
                        writer_kind=writer_kind,
                        source=self._rel(path),
                        confidence="high",
                        evidence=f"{elem_name} on {target_obj}",
                    ))

        # READS from recordLookups, decisions, assignments
        for elem_name in ("recordLookups", "decisions", "assignments"):
            for el in self._children(root, elem_name):
                # recordLookups have an <object> + <filters> with <field>
                # decisions have <rules><conditions><leftValueReference>
                lookup_obj = self._text(el, "object") or start_obj
                self._add_flow_field_reads(
                    fid,
                    field_tag_object=lookup_obj,
                    elem=el,
                    source_path=self._rel(path),
                    evidence_prefix=elem_name,
                    record_ref_object=start_obj,
                )

    # --- apex classes / triggers ----------------------------------------------

    def _register_apex_class(self, path: Path) -> None:
        name = path.stem
        meta_path = path.with_suffix(".cls-meta.xml")
        api_version = None
        status = None
        if meta_path.exists():
            root = self._parse_xml(meta_path)
            if root is not None:
                api_version = self._text(root, "apiVersion")
                status = self._text(root, "status")
        self.add_component(Component(
            id=apex_class_id(name), type="ApexClass", name=name,
            api_version=api_version, status=status,
            file_path=self._rel(path),
            source="force-app",
        ))

    def _parse_apex_body(self, path: Path) -> None:
        try:
            source = path.read_text(errors="replace")
        except OSError as exc:
            self.note(f"apex read error: {path}: {exc}")
            return
        name = path.stem
        cid = apex_class_id(name)
        # Heuristic writer_kind based on signatures
        is_batchable = "Database.Batchable" in source or "implements Batchable" in source
        is_handler = name.endswith("Handler") or name.endswith("TriggerHandler")
        if is_batchable:
            writer_kind = "apex_batch"
        elif is_handler:
            writer_kind = "apex_handler"
        else:
            writer_kind = "apex_other"

        # SOQL reads — emit READS Object + READS Field for each parsed field
        for fields_clause, sobject in SOQL_RE.findall(source):
            self.ensure_object(sobject)
            self.add_edge(Edge(
                src_id=cid, dst_id=object_id(sobject),
                kind="READS", source=self._rel(path), confidence="low",
                evidence=f"SOQL FROM {sobject}",
            ))
            for raw_field in fields_clause.split(","):
                f = raw_field.strip().split()[-1] if raw_field.strip() else ""
                # Skip subquery openers, aliases, asterisks, function calls
                if not f or "(" in f or ")" in f or f == "*":
                    continue
                # Skip parent-traversal references (Account.Name) — too noisy at low confidence
                if "." in f:
                    continue
                if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', f):
                    continue
                self.add_edge(Edge(
                    src_id=cid, dst_id=field_id(sobject, f),
                    kind="READS", source=self._rel(path), confidence="low",
                    evidence="SOQL select",
                ))

        # DML writes — heuristic: identifier looks like a typed sobject if not a builtin
        for op, ident in DML_RE.findall(source):
            if ident in APEX_BUILTINS:
                # We don't know the SObject type from a variable name; skip.
                continue
            # Often the identifier is a variable not an SObject. Don't emit unless the
            # local context strongly suggests SObject — too lossy. Just record on Object
            # if the identifier looks like a known SObject (CamelCase + matches).
            # For now, skip — DML keyword extraction without type inference is too noisy.
            continue

        # INVOKES — `new ClassName(` and `ClassName.method(` where ClassName is a known class
        invoked: set[str] = set()
        for m in APEX_NEW_RE.findall(source):
            if m == name or m in APEX_BUILTINS:
                continue
            if m in self._class_index:
                invoked.add(m)
        for m in APEX_STATIC_CALL_RE.findall(source):
            if m == name or m in APEX_BUILTINS:
                continue
            if m in self._class_index:
                invoked.add(m)
        for target in invoked:
            self.add_edge(Edge(
                src_id=cid, dst_id=apex_class_id(target),
                kind="INVOKES", source=self._rel(path), confidence="low",
                evidence="apex source reference",
            ))

        # Suppress unused-variable lint
        _ = writer_kind

    def _parse_apex_trigger(self, path: Path) -> None:
        try:
            source = path.read_text(errors="replace")
        except OSError as exc:
            self.note(f"trigger read error: {path}: {exc}")
            return
        name = path.stem
        tid = apex_trigger_id(name)
        meta_path = path.with_suffix(".trigger-meta.xml")
        api_version = None
        status = None
        if meta_path.exists():
            root = self._parse_xml(meta_path)
            if root is not None:
                api_version = self._text(root, "apiVersion")
                status = self._text(root, "status")
        self.add_component(Component(
            id=tid, type="ApexTrigger", name=name,
            api_version=api_version, status=status,
            file_path=self._rel(path),
            source="force-app",
        ))
        m = TRIGGER_HEADER_RE.search(source)
        if m:
            sobject = m.group(2)
            self.ensure_object(sobject)
            self.add_edge(Edge(
                src_id=tid, dst_id=object_id(sobject),
                kind="TRIGGERS_ON", source=self._rel(path), confidence="high",
            ))
        # Handler invocation
        for ident in APEX_NEW_RE.findall(source):
            if ident in APEX_BUILTINS or ident not in self._class_index:
                continue
            self.add_edge(Edge(
                src_id=tid, dst_id=apex_class_id(ident),
                kind="INVOKES", source=self._rel(path), confidence="medium",
            ))

    # --- permission sets -------------------------------------------------------

    def _parse_permission_set(self, path: Path) -> None:
        root = self._parse_xml(path)
        if root is None:
            return
        name = path.stem.replace(".permissionset-meta", "")
        label = self._text(root, "label")
        psid = permission_set_id(name)
        self.add_component(Component(
            id=psid, type="PermissionSet", name=name,
            file_path=self._rel(path),
            metadata_json=json.dumps({"label": label}) if label else None,
            source="force-app",
        ))
        for fp in self._children(root, "fieldPermissions"):
            field_path = self._text(fp, "field")
            readable = self._text(fp, "readable")
            editable = self._text(fp, "editable")
            if not field_path or "." not in field_path:
                continue
            obj, fname = field_path.split(".", 1)
            self.ensure_object(obj)
            target = field_id(obj, fname)
            if readable == "true":
                self.add_edge(Edge(
                    src_id=psid, dst_id=target,
                    kind="GRANTS_READ", source=self._rel(path), confidence="high",
                ))
            if editable == "true":
                self.add_edge(Edge(
                    src_id=psid, dst_id=target,
                    kind="GRANTS_EDIT", source=self._rel(path), confidence="high",
                ))

    def _parse_permission_set_group(self, path: Path) -> None:
        root = self._parse_xml(path)
        if root is None:
            return
        name = path.stem.replace(".permissionsetgroup-meta", "")
        psgid = permission_set_group_id(name)
        label = self._text(root, "label")
        self.add_component(Component(
            id=psgid, type="PermissionSetGroup", name=name,
            file_path=self._rel(path),
            metadata_json=json.dumps({"label": label}) if label else None,
            source="force-app",
        ))
        # <permissionSets> children may either be <permissionSets><permissionSet>X</permissionSet></permissionSets>
        # or simple <permissionSets>X</permissionSets>. Cover both shapes.
        for ps in root.iter():
            t = tag(ps)
            if t == "permissionSets" and ps.text and ps.text.strip():
                self.add_edge(Edge(
                    src_id=psgid, dst_id=permission_set_id(ps.text.strip()),
                    kind="CONTAINS", source=self._rel(path), confidence="high",
                ))

    # --- workflows --------------------------------------------------------------

    def _parse_workflow(self, path: Path) -> None:
        root = self._parse_xml(path)
        if root is None:
            return
        obj_name = path.stem.replace(".workflow-meta", "")
        wfid = workflow_id(obj_name)
        self.ensure_object(obj_name)
        self.add_component(Component(
            id=wfid, type="Workflow", name=obj_name,
            file_path=self._rel(path),
            source="force-app",
        ))
        self.add_edge(Edge(
            src_id=object_id(obj_name), dst_id=wfid,
            kind="CONTAINS", source=self._rel(path), confidence="high",
        ))
        for fu in self._children(root, "fieldUpdates"):
            fld = self._text(fu, "field")
            if not fld:
                continue
            fu_name = self._text(fu, "fullName") or self._text(fu, "name") or ""
            self.add_edge(Edge(
                src_id=wfid, dst_id=field_id(obj_name, fld),
                kind="WRITES",
                writer_kind="workflow_field_update",
                source=self._rel(path),
                confidence="high",
                evidence=f"fieldUpdate {fu_name}",
            ))

    # --- custom labels ---------------------------------------------------------

    def _parse_custom_labels(self, path: Path) -> None:
        root = self._parse_xml(path)
        if root is None:
            return
        for lbl in self._children(root, "labels"):
            full_name = self._text(lbl, "fullName")
            if not full_name:
                continue
            short = self._text(lbl, "shortDescription")
            self.add_component(Component(
                id=custom_label_id(full_name), type="CustomLabel", name=full_name,
                file_path=self._rel(path),
                metadata_json=json.dumps({"shortDescription": short}) if short else None,
                source="force-app",
            ))

    # --- custom metadata -------------------------------------------------------

    def _parse_custom_metadata(self, path: Path) -> None:
        root = self._parse_xml(path)
        if root is None:
            return
        # Filename: Type.Record.md-meta.xml — split on first '.'
        stem = path.name[:-len(".md-meta.xml")]
        if "." not in stem:
            self.note(f"unexpected customMetadata filename: {path.name}")
            return
        type_name, record_name = stem.split(".", 1)
        type_id = custom_metadata_type_id(type_name)
        if type_id not in self._seen_ids:
            self.add_component(Component(
                id=type_id, type="CustomMetadataType", name=type_name,
                source="force-app",
            ))
        rec_id = custom_metadata_id(type_name, record_name)
        label = self._text(root, "label")
        self.add_component(Component(
            id=rec_id, type="CustomMetadata", name=record_name,
            parent_id=type_id,
            file_path=self._rel(path),
            metadata_json=json.dumps({"label": label}) if label else None,
            source="force-app",
        ))
        self.add_edge(Edge(
            src_id=type_id, dst_id=rec_id,
            kind="CONTAINS", source=self._rel(path), confidence="high",
        ))

    # --- remote sites ----------------------------------------------------------

    def _parse_remote_site(self, path: Path) -> None:
        root = self._parse_xml(path)
        if root is None:
            return
        name = path.stem.replace(".remoteSite-meta", "")
        url = self._text(root, "url")
        active = self._text(root, "isActive")
        self.add_component(Component(
            id=remote_site_id(name), type="RemoteSite", name=name,
            file_path=self._rel(path),
            status="Active" if active == "true" else "Inactive",
            metadata_json=json.dumps({"url": url}) if url else None,
            source="force-app",
        ))

    # --- reports / report folders / report types ------------------------------

    def _parse_reports(self, reports_dir: Path) -> None:
        for entry in sorted(reports_dir.iterdir()):
            if entry.is_file() and entry.name.endswith(".reportFolder-meta.xml"):
                folder_name = entry.name[:-len(".reportFolder-meta.xml")]
                self.add_component(Component(
                    id=report_folder_id(folder_name), type="ReportFolder",
                    name=folder_name, file_path=self._rel(entry),
                    source="force-app",
                ))
            elif entry.is_dir():
                folder_name = entry.name
                # ensure folder component exists (folder meta may live separately)
                if report_folder_id(folder_name) not in self._seen_ids:
                    self.add_component(Component(
                        id=report_folder_id(folder_name), type="ReportFolder",
                        name=folder_name, source="force-app",
                    ))
                for f in sorted(entry.glob("*.report-meta.xml")):
                    self._parse_report(f, folder_name)

    def _add_report_field_reference(
        self,
        report_component_id: str,
        field_text: str | None,
        source_path: str,
        evidence_prefix: str,
    ) -> None:
        if not field_text or "$" not in field_text:
            return
        obj, rest = field_text.split("$", 1)
        # `Account.Name` style -> take last segment as field, first segment as effective object.
        if "." in rest:
            fname = rest.split(".")[-1]
        else:
            fname = rest
        self.ensure_object(obj)
        self.add_edge(Edge(
            src_id=report_component_id,
            dst_id=field_id(obj, fname),
            kind="REFERENCES",
            source=source_path,
            confidence="high",
            evidence=f"{evidence_prefix} {field_text}",
        ))

    def _parse_report(self, path: Path, folder: str) -> None:
        root = self._parse_xml(path)
        if root is None:
            return
        name = path.stem.replace(".report-meta", "")
        rid = report_id(folder, name)
        self.add_component(Component(
            id=rid, type="Report", name=name,
            parent_id=report_folder_id(folder),
            file_path=self._rel(path),
            source="force-app",
        ))
        for col in self._children(root, "columns"):
            field_text = self._text(col, "field")
            if not field_text or "$" not in field_text:
                continue
            obj, rest = field_text.split("$", 1)
            # `Account.Name` style → take last segment as field, first segment as effective object
            if "." in rest:
                fname = rest.split(".")[-1]
            else:
                fname = rest
            self.ensure_object(obj)
            self.add_edge(Edge(
                src_id=rid, dst_id=field_id(obj, fname),
                kind="REFERENCES", source=self._rel(path), confidence="high",
                evidence=f"report column {field_text}",
            ))
        for desc in root.iter():
            if tag(desc) == "column" and desc.text:
                self._add_report_field_reference(
                    rid, desc.text.strip(), self._rel(path), "report filter"
                )

    def _parse_report_type(self, path: Path) -> None:
        root = self._parse_xml(path)
        if root is None:
            return
        name = path.stem.replace(".reportType-meta", "")
        label = self._text(root, "label")
        base_object = self._text(root, "baseObject")
        self.add_component(Component(
            id=report_type_id(name), type="ReportType", name=name,
            file_path=self._rel(path),
            metadata_json=json.dumps({"label": label, "baseObject": base_object}),
            source="force-app",
        ))

    # --- dashboards ------------------------------------------------------------

    def _parse_dashboards(self, dash_dir: Path) -> None:
        for entry in sorted(dash_dir.iterdir()):
            if entry.is_file() and entry.name.endswith(".dashboard-meta.xml"):
                # dashboard at root with no folder
                name = entry.name[:-len(".dashboard-meta.xml")]
                self.add_component(Component(
                    id=dashboard_id(None, name), type="Dashboard", name=name,
                    file_path=self._rel(entry), source="force-app",
                ))
            elif entry.is_dir():
                folder = entry.name
                for f in sorted(entry.glob("*.dashboard-meta.xml")):
                    name = f.name[:-len(".dashboard-meta.xml")]
                    self.add_component(Component(
                        id=dashboard_id(folder, name), type="Dashboard", name=name,
                        file_path=self._rel(f), source="force-app",
                    ))


def parse_force_app(force_app_root: str) -> ParseResult:
    return _Parser(Path(force_app_root)).parse()

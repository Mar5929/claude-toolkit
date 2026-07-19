"""Load the four curated YAML overlays into row-dicts ready for SQL insert.

Reads:
  engagement/knowledge-base/_glossary.yaml
  engagement/knowledge-base/_processes.yaml
  engagement/knowledge-base/_field_groups.yaml
  engagement/knowledge-base/_client_lexicon.yaml

Returns a dict keyed by SQL table name plus 'components_extra' (synthetic
Process: and Term: components) and 'notes' (warnings).

This module performs no database writes — it just transforms YAML into shapes
that match schema.sql column names.
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Tuple

try:
    import yaml
except ModuleNotFoundError:  # pragma: no cover - exercised by environments only
    yaml = None

from models import (
    Component,
    apex_class_id,
    custom_metadata_id,
    custom_metadata_type_id,
    field_id,
    flow_id,
    object_id,
    permission_set_id,
    process_id,
    report_id,
    term_id,
    workflow_id,
)


KB_DIR = os.path.join("engagement", "knowledge-base")

_GLOSSARY = "_glossary.yaml"
_PROCESSES = "_processes.yaml"
_FIELD_GROUPS = "_field_groups.yaml"
_CLIENT_LEXICON = "_client_lexicon.yaml"


def _read_yaml(path: str, notes: List[str]) -> List[dict]:
    """Read a YAML file and return the top-level list (or [] on missing/empty)."""
    if not os.path.exists(path):
        notes.append(f"YAML missing: {path} (skipped)")
        return []
    if yaml is None:
        raise RuntimeError(
            "PyYAML is required to load KB overlays. "
            "Run `pip install -r tools/kb/requirements.txt`."
        )
    try:
        with open(path, "r") as fh:
            data = yaml.safe_load(fh)
    except yaml.YAMLError as exc:
        notes.append(f"YAML parse error in {path}: {exc}")
        return []
    if data is None:
        notes.append(f"YAML empty: {path}")
        return []
    if not isinstance(data, list):
        notes.append(f"YAML {path} top-level is not a list (got {type(data).__name__})")
        return []
    return data


def _split_field(spec: str) -> Tuple[str, str]:
    """Parse 'Object.Field__c' into ('Object', 'Field__c')."""
    if "." not in spec:
        raise ValueError(f"Field spec missing object: {spec!r}")
    obj, fld = spec.split(".", 1)
    return obj, fld


def _component_for_touched(item: dict) -> Tuple[str, str]:
    """Given a components_touched entry, return (component_id, role).

    The dict has exactly one key indicating the component kind.
    """
    if "apex" in item:
        return apex_class_id(item["apex"]), "orchestrates"
    if "flow" in item:
        return flow_id(item["flow"]), "orchestrates"
    if "workflow" in item:
        # workflow values look like "Contact.SomeRule" or just "Contact"
        val = item["workflow"]
        obj = val.split(".", 1)[0]
        return workflow_id(obj), "orchestrates"
    if "field" in item:
        obj, fld = _split_field(item["field"])
        return field_id(obj, fld), "reads"
    if "object" in item:
        return object_id(item["object"]), "input"
    if "custom_metadata" in item:
        val = item["custom_metadata"]
        # If a single-token like "Event_Label__mdt", treat as the type itself.
        if "." in val:
            type_name, rec = val.split(".", 1)
            return custom_metadata_id(_metadata_type_name(type_name), rec), "input"
        return custom_metadata_type_id(_metadata_type_name(val)), "input"
    if "permissionset" in item:
        return permission_set_id(item["permissionset"]), "input"
    if "report" in item:
        val = item["report"]
        if "." in val:
            folder, name = val.split(".", 1)
            return report_id(folder, name), "input"
        return report_id(None, val), "input"
    raise ValueError(f"Unknown components_touched entry shape: {item!r}")


def _metadata_type_name(api_name: str) -> str:
    return api_name[:-5] if api_name.endswith("__mdt") else api_name


def _glossary_rows(entries: List[dict]) -> Tuple[List[dict], List[dict], List[Component]]:
    terminology: List[dict] = []
    aliases: List[dict] = []
    components: List[Component] = []
    for e in entries:
        if not isinstance(e, dict) or "term" not in e:
            continue
        term = e["term"]
        canonical_id = None
        obj = e.get("canonical_object")
        fld = e.get("canonical_field")
        if obj and fld:
            canonical_id = field_id(obj, fld)
        elif obj:
            canonical_id = object_id(obj)
        terminology.append(
            {
                "term": term,
                "canonical_id": canonical_id,
                "notes": e.get("notes"),
                "source": e.get("source"),
                "added": _date_str(e.get("added")),
            }
        )
        # The term itself maps to itself so a single lookup table works.
        aliases.append({"alias": term, "term": term})
        for a in e.get("aliases") or []:
            if a == term:
                continue
            aliases.append({"alias": a, "term": term})
        components.append(
            Component(
                id=term_id(term),
                type="Term",
                name=term,
                source="yaml",
                kb_doc_path=None,
            )
        )
    return terminology, aliases, components


def _process_rows(
    entries: List[dict],
) -> Tuple[List[dict], List[dict], List[Component], List[str]]:
    processes: List[dict] = []
    process_components: List[dict] = []
    components: List[Component] = []
    issues: List[str] = []
    seen_pc: set = set()
    for p in entries:
        if not isinstance(p, dict) or "id" not in p:
            continue
        pid = p["id"]
        processes.append(
            {
                "id": pid,
                "name": p.get("name", pid),
                "trigger_kind": p.get("trigger"),
                "frequency": p.get("frequency"),
                "owner": p.get("owner"),
                "notes": p.get("notes"),
                "added": _date_str(p.get("added")),
            }
        )
        components.append(
            Component(
                id=process_id(pid),
                type="Process",
                name=p.get("name", pid),
                source="yaml",
            )
        )
        for w in p.get("outputs_writes") or []:
            if not isinstance(w, dict) or "field" not in w:
                continue
            try:
                obj, fld = _split_field(w["field"])
            except ValueError as exc:
                issues.append(f"process {pid}: {exc}")
                continue
            row = {
                "process_id": pid,
                "component_id": field_id(obj, fld),
                "role": "writes",
            }
            key = (row["process_id"], row["component_id"], row["role"])
            if key in seen_pc:
                continue
            seen_pc.add(key)
            process_components.append(row)
        for t in p.get("components_touched") or []:
            if not isinstance(t, dict):
                continue
            try:
                cid, role = _component_for_touched(t)
            except ValueError as exc:
                issues.append(f"process {pid}: {exc}")
                continue
            key = (pid, cid, role)
            if key in seen_pc:
                continue
            seen_pc.add(key)
            process_components.append({"process_id": pid, "component_id": cid, "role": role})
    return processes, process_components, components, issues


def _field_group_rows(entries: List[dict]) -> Tuple[List[dict], List[dict], List[str]]:
    groups: List[dict] = []
    members: List[dict] = []
    issues: List[str] = []
    for g in entries:
        if not isinstance(g, dict) or "id" not in g:
            continue
        groups.append(
            {
                "id": g["id"],
                "object_name": g.get("object"),
                "description": g.get("description"),
                "added": _date_str(g.get("added")),
            }
        )
        for m in g.get("members") or []:
            if not isinstance(m, dict) or "field" not in m:
                continue
            try:
                obj, fld = _split_field(m["field"])
            except ValueError as exc:
                issues.append(f"field_group {g['id']}: {exc}")
                continue
            members.append(
                {
                    "group_id": g["id"],
                    "field_id": field_id(obj, fld),
                    "role": m.get("role"),
                    "notes": m.get("notes"),
                }
            )
    return groups, members, issues


def _lexicon_rows(entries: List[dict]) -> List[dict]:
    rows: List[dict] = []
    for e in entries:
        if not isinstance(e, dict) or "id" not in e:
            continue
        res = e.get("resolution") or {}
        rows.append(
            {
                "id": e["id"],
                "date_resolved": _date_str(e.get("date_resolved")),
                "requester": e.get("requester", ""),
                "original_phrase": e.get("original_phrase", ""),
                "context": e.get("context"),
                "hypotheses_json": json.dumps(e.get("hypotheses_considered", []) or []),
                "resolution_components_json": json.dumps(res.get("components", []) or []),
                "resolution_glossary_json": json.dumps(res.get("glossary_terms", []) or []),
                "resolution_process": res.get("process"),
                "confirmed_by": e.get("confirmed_by"),
                "confirmed_on": _date_str(e.get("confirmed_on")),
                "confirmation_channel": e.get("confirmation_channel"),
                "notes": e.get("notes"),
            }
        )
    return rows


def _date_str(val: Any) -> Any:
    """YAML may parse YYYY-MM-DD as a datetime.date; coerce to ISO string."""
    if val is None:
        return None
    return str(val)


def load_yaml(repo_root: str) -> Dict[str, Any]:
    notes: List[str] = []
    base = os.path.join(repo_root, KB_DIR)

    glossary = _read_yaml(os.path.join(base, _GLOSSARY), notes)
    processes_raw = _read_yaml(os.path.join(base, _PROCESSES), notes)
    field_groups_raw = _read_yaml(os.path.join(base, _FIELD_GROUPS), notes)
    lexicon_raw = _read_yaml(os.path.join(base, _CLIENT_LEXICON), notes)

    terminology, term_aliases, term_components = _glossary_rows(glossary)
    processes, process_components, proc_components, proc_issues = _process_rows(processes_raw)
    notes.extend(proc_issues)
    field_groups, field_group_members, fg_issues = _field_group_rows(field_groups_raw)
    notes.extend(fg_issues)
    client_lexicon = _lexicon_rows(lexicon_raw)

    return {
        "terminology": terminology,
        "term_aliases": term_aliases,
        "processes": processes,
        "process_components": process_components,
        "field_groups": field_groups,
        "field_group_members": field_group_members,
        "client_lexicon": client_lexicon,
        "components_extra": term_components + proc_components,
        "notes": notes,
    }

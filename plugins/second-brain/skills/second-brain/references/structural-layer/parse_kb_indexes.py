"""Parse the curated markdown KB and emit architect-curated edges + KB doc paths.

This parser complements parse_force_app.py by extracting edges hand-curated in
markdown — these carry "kb-index:..." source tags and "medium" / "high" confidence,
distinct from regex-derived parser edges.

Public API:
    parse_kb_indexes(repo_root: str) -> ParseResult

Reads three index files plus the full kb tree:
    - engagement/knowledge-base/automation/field-writers.md
        -> WRITES / READS edges (Flow|Apex -> Field)
    - engagement/knowledge-base/automation/schedule.md
        -> SCHEDULES edges between Apex schedulable / batch classes
    - engagement/knowledge-base/automation/process-clusters.md
        -> kb_doc_paths only (process->component links live in _processes.yaml)
    - every .md under engagement/knowledge-base/
        -> kb_doc_paths for the matching component id
"""

from __future__ import annotations

import re
from pathlib import Path

from models import (
    ParseResult,
    Edge,
    field_id,
    flow_id,
    apex_class_id,
    object_id,
    workflow_id,
    custom_metadata_type_id,
    permission_set_id,
    permission_set_group_id,
    remote_site_id,
)


# --------------------------------------------------------------------------- #
# Regex patterns                                                              #
# --------------------------------------------------------------------------- #

# Matches lines like:
#   - Written by: Flow [Foo](flows/Foo.md) (Status) - rationale text...
#   - Written by: Apex [Bar](apex/Bar.md) (Active) -
#   - Read in decisions: Flow [Foo](flows/Foo.md) - filter rationale
#   - Read in decisions: Apex [Bar](apex/Bar.md) - rationale
# Captures: (1) verb token, (2) kind (Flow|Apex), (3) link text (component name),
# (4) link path, (5) optional "(Status)" parenthetical, (6) trailing rationale.
_BULLET_RE = re.compile(
    r"""^\s*-\s+
        (?P<verb>Written\ by|Read\ in\ decisions)\s*:\s+
        (?P<kind>Flow|Apex)\s+
        \[(?P<name>[^\]]+)\]
        \((?P<path>[^)]+)\)
        \s*
        (?:\((?P<status>[^)]*)\))?
        \s*
        (?:[-–]\s*(?P<rationale>.*))?
        $
    """,
    re.VERBOSE,
)

# Heading detectors for field-writers.md
_OBJECT_H2 = re.compile(r"^##\s+(?P<name>[^#].*?)\s*$")
_FIELD_H3 = re.compile(r"^###\s+(?P<rest>.+?)\s*$")
# Appendix style:
#   ### Contact          (object)
#   #### `Field__c`      (field)
_OBJECT_H3 = re.compile(r"^###\s+(?P<name>[A-Za-z][A-Za-z0-9_]*?)\s*$")
_FIELD_H4 = re.compile(r"^####\s+(?P<rest>.+?)\s*$")

# Pull out backticked field names from inside a heading line.
# Handles `### \`A\`` and `### \`A\`, \`B\`, \`C\`` and `### \`A\` (NEW FIELD)`.
_BACKTICK_NAME = re.compile(r"`([^`]+)`")

# Markdown link finder for kb_doc_paths walk and for process-clusters.
_MD_LINK = re.compile(r"\[(?P<text>[^\]]+)\]\((?P<href>[^)]+)\)")


# --------------------------------------------------------------------------- #
# field-writers.md                                                            #
# --------------------------------------------------------------------------- #

def _curated_writer_kind(kind_token: str, edge_kind: str) -> str | None:
    """Best-effort writer kind for hand-curated field-writers.md rows."""
    if edge_kind != "WRITES":
        return None
    if kind_token == "Flow":
        return "flow_kb_curated"
    if kind_token == "Apex":
        return "apex_kb_curated"
    return "unknown_writer"


def _parse_field_writers(path: Path, result: ParseResult) -> None:
    if not path.exists():
        result.notes.append(f"missing: {path}")
        return

    source_tag = "kb-index:field-writers.md"
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()

    current_object: str | None = None
    current_fields: list[str] = []
    # Appendix mode toggles when we hit "## Appendix..." — under appendix,
    # objects are H3 and fields are H4.
    appendix_mode = False

    for raw in lines:
        line = raw.rstrip()

        m = _OBJECT_H2.match(line)
        if m:
            heading = m.group("name").strip()
            if heading.lower().startswith("appendix"):
                appendix_mode = True
                current_object = None
                current_fields = []
                continue
            appendix_mode = False
            current_object = heading
            current_fields = []
            continue

        if appendix_mode:
            m3 = _OBJECT_H3.match(line)
            if m3:
                current_object = m3.group("name").strip()
                current_fields = []
                continue
            m4 = _FIELD_H4.match(line)
            if m4:
                names = _BACKTICK_NAME.findall(m4.group("rest"))
                current_fields = [n.strip() for n in names if n.strip()]
                continue
        else:
            m3 = _FIELD_H3.match(line)
            if m3:
                names = _BACKTICK_NAME.findall(m3.group("rest"))
                current_fields = [n.strip() for n in names if n.strip()]
                continue

        # Bullets only matter once we know object+field.
        if not current_object or not current_fields:
            continue

        bm = _BULLET_RE.match(line)
        if not bm:
            continue

        verb = bm.group("verb")
        kind_token = bm.group("kind")
        comp_name = bm.group("name").strip()
        rationale = (bm.group("rationale") or "").strip()
        evidence = rationale[:200] if rationale else None

        if kind_token == "Flow":
            src = flow_id(comp_name)
        else:  # Apex
            src = apex_class_id(comp_name)

        edge_kind = "WRITES" if verb == "Written by" else "READS"
        writer_kind = _curated_writer_kind(kind_token, edge_kind)

        for fname in current_fields:
            dst = field_id(current_object, fname)
            result.edges.append(
                Edge(
                    src_id=src,
                    dst_id=dst,
                    kind=edge_kind,
                    writer_kind=writer_kind,
                    source=source_tag,
                    confidence="medium",
                    evidence=evidence,
                )
            )


# --------------------------------------------------------------------------- #
# schedule.md                                                                 #
# --------------------------------------------------------------------------- #

# Cell that names a class link: [Name](apex/Name.md)
_APEX_LINK_CELL = re.compile(r"\[([^\]]+)\]\(apex/[^)]+\)")


def _parse_schedule(path: Path, result: ParseResult) -> None:
    if not path.exists():
        result.notes.append(f"missing: {path}")
        return

    source_tag = "kb-index:schedule.md"
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()

    in_apex_table = False
    saw_header_sep = False  # `|------|...` row immediately follows header
    target_section = "## Apex - Schedulable Classes"

    for raw in lines:
        line = raw.rstrip()

        # Section toggling — any new "## " heading ends the table.
        if line.startswith("## "):
            in_apex_table = line.strip().startswith(target_section)
            saw_header_sep = False
            continue

        if not in_apex_table:
            continue

        # Skip blank lines and non-table lines.
        stripped = line.strip()
        if not stripped or not stripped.startswith("|"):
            continue

        # Detect the separator row (|---|---|).
        if re.match(r"^\|\s*-{3,}", stripped):
            saw_header_sep = True
            continue

        # Header row appears before the separator; skip until separator seen.
        if not saw_header_sep:
            continue

        # Split table cells. Strip the leading and trailing pipes first.
        body = stripped.strip("|")
        cells = [c.strip() for c in body.split("|")]
        if len(cells) < 2:
            continue

        name_cell = cells[0]
        kicks_cell = cells[1]

        name_match = _APEX_LINK_CELL.search(name_cell)
        if not name_match:
            continue
        scheduler_name = name_match.group(1).strip()

        # Determine target class.
        target_name: str | None = None
        if kicks_cell.lower().startswith("self"):
            target_name = scheduler_name
        else:
            # The kicks-off cell is sometimes a bare class name (most common in
            # this file), sometimes a markdown link. Handle both.
            link_match = _APEX_LINK_CELL.search(kicks_cell)
            if link_match:
                target_name = link_match.group(1).strip()
            else:
                # Bare token — strip any trailing prose. Take the first token.
                bare = kicks_cell.split()[0] if kicks_cell.split() else ""
                # Filter obvious non-class values.
                if bare and re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", bare):
                    target_name = bare

        if not target_name:
            continue

        result.edges.append(
            Edge(
                src_id=apex_class_id(scheduler_name),
                dst_id=apex_class_id(target_name),
                kind="SCHEDULES",
                writer_kind=None,
                source=source_tag,
                confidence="high",
                evidence=f"{scheduler_name} -> {target_name}",
            )
        )


# --------------------------------------------------------------------------- #
# process-clusters.md  (kb_doc_paths only)                                    #
# --------------------------------------------------------------------------- #

def _parse_process_clusters(
    path: Path, result: ParseResult, kb_root_rel: str
) -> None:
    """No edges. Just harvest markdown links to populate kb_doc_paths.

    The walk-everything pass (below) covers most of these already, but doing
    it here too is cheap and ensures any oddly-located link still lands.
    """
    if not path.exists():
        result.notes.append(f"missing: {path}")
        return

    text = path.read_text(encoding="utf-8")
    automation_root = f"{kb_root_rel}/automation"

    for m in _MD_LINK.finditer(text):
        href = m.group("href").strip()
        text_label = m.group("text").strip()
        # Skip anchors and external links.
        if href.startswith("http") or href.startswith("#"):
            continue
        # Resolve href relative to process-clusters.md (which lives under
        # engagement/knowledge-base/automation/).
        # We only care about the link family; map by suffix path.
        comp_id, rel_path = _kb_link_to_component(
            href, base_dir=automation_root, kb_root=kb_root_rel, link_text=text_label
        )
        if comp_id and rel_path:
            result.kb_doc_paths.setdefault(comp_id, rel_path)


def _kb_link_to_component(
    href: str, base_dir: str, kb_root: str, link_text: str
) -> tuple[str | None, str | None]:
    """Resolve a markdown href to a (component_id, relative_path) tuple.

    base_dir is the directory of the file containing the link (relative to repo).
    """
    # Resolve "..": collapse via pathlib without touching the filesystem.
    p = (Path(base_dir) / href).as_posix()
    parts = []
    for seg in p.split("/"):
        if seg == "..":
            if parts:
                parts.pop()
        elif seg in ("", "."):
            continue
        else:
            parts.append(seg)
    rel = "/".join(parts)

    if not rel.endswith(".md"):
        return None, None

    # Must be inside the kb root.
    if not rel.startswith(kb_root + "/"):
        return None, None

    inside = rel[len(kb_root) + 1:]  # strip "engagement/knowledge-base/"

    return _infer_component_id(inside, link_text=link_text), rel


# --------------------------------------------------------------------------- #
# kb_doc_paths walk                                                           #
# --------------------------------------------------------------------------- #

def _infer_component_id(inside_path: str, link_text: str | None = None) -> str | None:
    """Map a path under engagement/knowledge-base/ to a component id.

    inside_path examples:
      automation/apex/Foo.md                  -> ApexClass:Foo
      automation/flows/Bar.md                 -> Flow:Bar
      data-model/objects/Contact.md           -> Object:Contact
      data-model/objects/Firm_Label__c.md     -> Object:Firm_Label__c
      configuration/workflows/Contact.md      -> Workflow:Contact
      configuration/custom-metadata/Foo.md    -> CustomMetadataType:Foo
      configuration/labels/CustomLabels.md    -> (skip — one file, not per label)
      security/permission-sets/Foo.md         -> PermissionSet:Foo
      security/permission-set-groups/Foo.md   -> PermissionSetGroup:Foo
      integrations/remote-sites/Foo.md        -> RemoteSite:Foo
    """
    parts = inside_path.split("/")
    if len(parts) < 2:
        return None
    name = parts[-1]
    if not name.endswith(".md"):
        return None
    stem = name[:-3]

    if parts[:2] == ["automation", "apex"]:
        return apex_class_id(stem)
    if parts[:2] == ["automation", "flows"]:
        return flow_id(stem)
    if parts[:2] == ["data-model", "objects"]:
        return object_id(stem)
    if parts[:2] == ["configuration", "workflows"]:
        return workflow_id(stem)
    if parts[:2] == ["configuration", "custom-metadata"]:
        return custom_metadata_type_id(stem)
    if parts[:2] == ["configuration", "labels"]:
        # CustomLabels.md is one-per-file; skip per spec.
        return None
    if parts[:2] == ["security", "permission-sets"]:
        return permission_set_id(stem)
    if parts[:2] == ["security", "permission-set-groups"]:
        return permission_set_group_id(stem)
    if parts[:2] == ["integrations", "remote-sites"]:
        return remote_site_id(stem)
    return None


def _walk_kb_for_doc_paths(
    repo_root: Path, kb_root_rel: str, result: ParseResult
) -> None:
    kb_dir = repo_root / kb_root_rel
    if not kb_dir.exists():
        result.notes.append(f"missing kb root: {kb_dir}")
        return

    for md in kb_dir.rglob("*.md"):
        rel = md.relative_to(repo_root).as_posix()
        inside = md.relative_to(kb_dir).as_posix()
        comp_id = _infer_component_id(inside)
        if comp_id:
            # First-write-wins so the explicit kb walk doesn't get clobbered.
            result.kb_doc_paths.setdefault(comp_id, rel)


# --------------------------------------------------------------------------- #
# Public API                                                                  #
# --------------------------------------------------------------------------- #

def parse_kb_indexes(repo_root: str) -> ParseResult:
    """Read curated markdown KB and emit edges + kb_doc_paths.

    repo_root is the absolute path to the davis-advisors-sfdc checkout.
    """
    result = ParseResult()
    root = Path(repo_root)

    kb_root_rel = "engagement/knowledge-base"

    field_writers_path = root / kb_root_rel / "automation" / "field-writers.md"
    schedule_path = root / kb_root_rel / "automation" / "schedule.md"
    process_clusters_path = root / kb_root_rel / "automation" / "process-clusters.md"

    _parse_field_writers(field_writers_path, result)
    _parse_schedule(schedule_path, result)
    _parse_process_clusters(process_clusters_path, result, kb_root_rel)
    _walk_kb_for_doc_paths(root, kb_root_rel, result)

    return result

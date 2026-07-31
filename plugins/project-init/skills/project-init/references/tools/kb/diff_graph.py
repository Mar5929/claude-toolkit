"""diff_graph.py: compare two builds of the dependency graph.

Turns "a file changed" into "these specific connections changed": build the
graph before and after a change (or keep the previous gitignored db as the
"old" side and rebuild fresh for the "new" side), then diff. This is the
drift signal: when a file a knowledge note describes changes, this says what
changed structurally. graph_freshness_hook.py runs it automatically.

Usage:
    python3 tools/kb/diff_graph.py --old old.sqlite --new new.sqlite
    python3 tools/kb/diff_graph.py --old old.sqlite --new new.sqlite \
        --file flows/Some_Flow.flow-meta.xml
    python3 tools/kb/diff_graph.py ... --component Flow:Some_Flow
    python3 tools/kb/diff_graph.py ... --report drift.md
    python3 tools/kb/diff_graph.py ... --json

Filters (repeatable, combined as a union):
    --file       substring match against components.file_path in either build;
                 scopes the diff to components in those files. This is the
                 covered-file drift path: pass the paths a knowledge note
                 says it covers.
    --component  exact component id.
With no filter the whole graph is diffed.

Read-only over both databases; stdlib only. Exit code 0 = no differences in
scope, 1 = differences found (diff convention, so hooks can branch on it).
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple

# Edge identity+attributes as stored: src, dst, kind, writer_kind, source,
# confidence, evidence. Builds are deterministic, so a full-row set diff is
# exact: no fuzzy matching needed.
EdgeRow = Tuple[str, str, str, str, str, str, str]
ComponentRow = Tuple[str, str, str, str]  # id, type, name, file_path


def _load(db_path: Path):
    if not db_path.exists():
        raise SystemExit(f"database not found: {db_path}")
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    components: Dict[str, ComponentRow] = {
        r[0]: r
        for r in cur.execute("SELECT id, type, name, file_path FROM components")
    }
    edges: Set[EdgeRow] = set(
        cur.execute(
            "SELECT src_id, dst_id, kind, writer_kind, source, confidence, "
            "evidence FROM relationships"
        )
    )
    classification: Dict[str, str] = {
        r[0]: r[1]
        for r in cur.execute("SELECT field_id, primary_kind FROM field_classification")
    }
    conn.close()
    return components, edges, classification


def _selected_ids(
    old_comps: Dict[str, ComponentRow],
    new_comps: Dict[str, ComponentRow],
    files: List[str],
    component_ids: List[str],
) -> Set[str] | None:
    """Component ids in scope, or None meaning 'no filter, everything'."""
    if not files and not component_ids:
        return None
    selected: Set[str] = set(component_ids)
    for comps in (old_comps, new_comps):
        for cid, (_id, _type, _name, file_path) in comps.items():
            if not file_path:
                continue
            if any(f in file_path for f in files):
                selected.add(cid)
    return selected


def _edge_in_scope(edge: EdgeRow, selected: Set[str] | None) -> bool:
    if selected is None:
        return True
    return edge[0] in selected or edge[1] in selected


def _describe_edge(edge: EdgeRow) -> str:
    src, dst, kind, writer_kind, source, confidence, _evidence = edge
    bits = [f"{src} -> {dst} ({kind}"]
    if writer_kind:
        bits.append(f" via {writer_kind}")
    bits.append(f"), per {source}, confidence {confidence}")
    return "".join(bits)


def diff_graphs(
    old_db: Path,
    new_db: Path,
    files: List[str] | None = None,
    component_ids: List[str] | None = None,
) -> Dict[str, object]:
    """Compute the in-scope differences between two graph builds."""
    files = files or []
    component_ids = component_ids or []

    old_comps, old_edges, old_class = _load(old_db)
    new_comps, new_edges, new_class = _load(new_db)

    selected = _selected_ids(old_comps, new_comps, files, component_ids)

    def comp_in_scope(cid: str) -> bool:
        return selected is None or cid in selected

    comps_added = sorted(
        cid for cid in new_comps.keys() - old_comps.keys() if comp_in_scope(cid)
    )
    comps_removed = sorted(
        cid for cid in old_comps.keys() - new_comps.keys() if comp_in_scope(cid)
    )

    edges_added = sorted(
        e for e in new_edges - old_edges if _edge_in_scope(e, selected)
    )
    edges_removed = sorted(
        e for e in old_edges - new_edges if _edge_in_scope(e, selected)
    )

    # Classification changes matter for fields directly selected AND for
    # fields whose connections just changed (a field losing its only flow
    # writer falls back to manual_only, for example).
    consequence_fields: Set[str] = set()
    for e in list(edges_added) + list(edges_removed):
        for endpoint in (e[0], e[1]):
            if endpoint.startswith("Field:"):
                consequence_fields.add(endpoint)
    class_changes = []
    for fid in sorted(old_class.keys() | new_class.keys()):
        before = old_class.get(fid)
        after = new_class.get(fid)
        if before == after:
            continue
        if comp_in_scope(fid) or fid in consequence_fields:
            class_changes.append(
                {"field": fid, "before": before, "after": after}
            )

    return {
        "old_db": str(old_db),
        "new_db": str(new_db),
        "filters": {"files": files, "components": component_ids},
        "components_added": comps_added,
        "components_removed": comps_removed,
        "edges_added": [_describe_edge(e) for e in edges_added],
        "edges_removed": [_describe_edge(e) for e in edges_removed],
        "classification_changes": class_changes,
    }


def _has_differences(diff: Dict[str, object]) -> bool:
    return any(
        diff[k]
        for k in (
            "components_added",
            "components_removed",
            "edges_added",
            "edges_removed",
            "classification_changes",
        )
    )


def render_text(diff: Dict[str, object]) -> str:
    lines: List[str] = []
    filters = diff["filters"]
    scope = "whole graph"
    if filters["files"] or filters["components"]:
        parts = []
        if filters["files"]:
            parts.append("files: " + ", ".join(filters["files"]))
        if filters["components"]:
            parts.append("components: " + ", ".join(filters["components"]))
        scope = "; ".join(parts)
    lines.append("# Dependency-graph connection diff")
    lines.append("")
    lines.append(f"- Old build: `{diff['old_db']}`")
    lines.append(f"- New build: `{diff['new_db']}`")
    lines.append(f"- Scope: {scope}")
    lines.append("")

    sections = [
        ("Connections added", diff["edges_added"]),
        ("Connections removed", diff["edges_removed"]),
        ("Components added", diff["components_added"]),
        ("Components removed", diff["components_removed"]),
    ]
    for title, items in sections:
        lines.append(f"## {title} ({len(items)})")
        lines.append("")
        for item in items:
            lines.append(f"- {item}")
        lines.append("")

    cc = diff["classification_changes"]
    lines.append(f"## Field classification changes ({len(cc)})")
    lines.append("")
    for c in cc:
        lines.append(f"- {c['field']}: {c['before']} -> {c['after']}")
    lines.append("")

    if not _has_differences(diff):
        lines.append("No differences in scope: the connections are unchanged.")
        lines.append("")
    return "\n".join(lines)


def main() -> int:
    p = argparse.ArgumentParser(
        description="Diff two builds of the dependency graph."
    )
    p.add_argument("--old", required=True, help="previous build (SQLite file)")
    p.add_argument("--new", required=True, help="current build (SQLite file)")
    p.add_argument(
        "--file",
        action="append",
        default=[],
        help="scope to components whose file_path contains this (repeatable)",
    )
    p.add_argument(
        "--component",
        action="append",
        default=[],
        help="scope to this exact component id (repeatable)",
    )
    p.add_argument("--report", help="also write the diff to this markdown file")
    p.add_argument(
        "--json", action="store_true", help="print JSON instead of text"
    )
    args = p.parse_args()

    diff = diff_graphs(
        Path(args.old), Path(args.new), files=args.file, component_ids=args.component
    )

    if args.json:
        print(json.dumps(diff, indent=2))
    else:
        print(render_text(diff))

    if args.report:
        report_path = Path(args.report)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(render_text(diff), encoding="utf-8")

    return 1 if _has_differences(diff) else 0


if __name__ == "__main__":
    sys.exit(main())

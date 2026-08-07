"""diff_graph.py — what connections changed between two builds?

WI-007 phase 6. Turns "a metadata file changed" into "these exact connections
changed". Build the edge list before a change and after it, then compare the
two files.

    python tools/kb/diff_graph.py --old before.json --new tools/kb/out/edges-<org>.json
    python tools/kb/diff_graph.py --old before.json --new after.json \
        --file flows/Case_Escalation.flow-meta.xml
    python tools/kb/diff_graph.py --old before.json --new after.json --json

Filters, repeatable and combined as a union. With no filter the whole file is
compared.

    --file       a piece of a file path. Scopes the comparison to the components
                 defined in files whose path contains it, in either build.
    --component  one exact component id.

**This works because an edge id is a hash of the edge's own content, not a
position in the list.** Phase 4 chose that deliberately: a running count would
renumber every edge after an inserted one, so two builds of nearly the same
snapshot would share almost no ids and nothing could be compared. So a
comparison is a set difference on ids, and an edge that survives keeps its id.

The resolution is deliberately NOT part of the id, so improving a resolver rule
gives an existing edge a target it did not have before rather than a new id.
That is why this also reports edges whose id is in both builds but whose target
or resolution moved: they are changes a set difference alone would miss.

Read-only over both files. Exit code 0 means no differences in scope and 1 means
differences found, which is the usual convention for a comparison tool, so a
hook can branch on it.

Local files only. Nothing here contacts a Salesforce org.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
if str(THIS_DIR) not in sys.path:
    sys.path.insert(0, str(THIS_DIR))

from graph import iter_edges, load_components, load_header  # noqa: E402

SECTIONS = ("edges_added", "edges_removed", "edges_changed",
            "components_added", "components_removed", "field_label_changes")


def _selected(old_components, new_components, files, component_ids):
    """Component ids in scope, or None meaning no filter at all."""
    if not files and not component_ids:
        return None
    chosen = set(component_ids)
    for components in (old_components, new_components):
        for cid, comp in components.items():
            path = comp.get("file_path") or ""
            if path and any(piece in path for piece in files):
                chosen.add(cid)
    return chosen


def _in_scope(edge, chosen) -> bool:
    if chosen is None:
        return True
    if edge["source"] in chosen or edge.get("target", "") in chosen:
        return True
    # A file filter should also catch an edge READ OUT OF that file even when
    # its source component is defined somewhere else, which happens for every
    # profile and permission set grant.
    return False


def _load_edges(path, chosen, files):
    """{edge id: the parts that can change} for the edges in scope."""
    kept = {}
    for edge in iter_edges(path):
        evidence = edge.get("evidence", {})
        if chosen is not None:
            file_path = evidence.get("file_path", "")
            if not _in_scope(edge, chosen) and not any(
                    piece in file_path for piece in files):
                continue
        kept[edge["id"]] = {
            "source": edge["source"],
            "target": edge.get("target", ""),
            "relationship": edge["relationship"],
            "resolution": edge["resolution"],
            "confidence": edge["confidence"],
            "file_path": evidence.get("file_path", ""),
            "location": evidence.get("location", ""),
            "raw_reference": evidence.get("raw_reference", ""),
        }
    return kept


def describe(edge: dict) -> str:
    target = edge["target"] or f"(unresolved: {edge['raw_reference']})"
    return (f"{edge['source']} -{edge['relationship']}-> {target}, "
            f"from {edge['file_path']} at {edge['location']}, "
            f"confidence {edge['confidence']}")


def diff_edge_lists(old_path, new_path, files=None, component_ids=None,
                    old_labels=None, new_labels=None) -> dict:
    """Everything that changed in scope between two edge-list files."""
    files = list(files or [])
    component_ids = list(component_ids or [])
    old_path = Path(old_path)
    new_path = Path(new_path)
    for path in (old_path, new_path):
        if not path.exists():
            raise SystemExit(f"file not found: {path}")

    old_components = load_components(old_path)
    new_components = load_components(new_path)
    chosen = _selected(old_components, new_components, files, component_ids)

    def component_in_scope(cid):
        return chosen is None or cid in chosen

    old_edges = _load_edges(old_path, chosen, files)
    new_edges = _load_edges(new_path, chosen, files)

    added = sorted(new_edges.keys() - old_edges.keys())
    removed = sorted(old_edges.keys() - new_edges.keys())

    changed = []
    for eid in sorted(old_edges.keys() & new_edges.keys()):
        before, after = old_edges[eid], new_edges[eid]
        moved = {name: [before[name], after[name]]
                 for name in ("target", "resolution", "confidence")
                 if before[name] != after[name]}
        if moved:
            changed.append({"edge": eid, "what": describe(after),
                            "changed": moved})

    old_labels = old_labels or {}
    new_labels = new_labels or {}
    touched_fields = set()
    for eid in added + removed:
        edge = new_edges.get(eid) or old_edges[eid]
        for end in (edge["source"], edge["target"]):
            if ":CustomField:" in end:
                touched_fields.add(end)
    label_changes = []
    for cid in sorted(set(old_labels) | set(new_labels)):
        before = old_labels.get(cid)
        after = new_labels.get(cid)
        if before == after:
            continue
        if component_in_scope(cid) or cid in touched_fields:
            label_changes.append({"field": cid, "before": before, "after": after})

    return {
        "old": str(old_path),
        "new": str(new_path),
        "old_org": load_header(old_path).get("org", ""),
        "new_org": load_header(new_path).get("org", ""),
        "filters": {"files": files, "components": component_ids},
        "edges_added": [describe(new_edges[eid]) for eid in added],
        "edges_removed": [describe(old_edges[eid]) for eid in removed],
        "edges_changed": changed,
        "components_added": sorted(
            cid for cid in new_components.keys() - old_components.keys()
            if component_in_scope(cid)),
        "components_removed": sorted(
            cid for cid in old_components.keys() - new_components.keys()
            if component_in_scope(cid)),
        "field_label_changes": label_changes,
    }


def has_differences(diff: dict) -> bool:
    return any(diff[name] for name in SECTIONS)


def render_text(diff: dict) -> str:
    lines = []
    write = lines.append
    filters = diff["filters"]
    scope = "everything in both files"
    if filters["files"] or filters["components"]:
        parts = []
        if filters["files"]:
            parts.append("files containing: " + ", ".join(filters["files"]))
        if filters["components"]:
            parts.append("components: " + ", ".join(filters["components"]))
        scope = "; ".join(parts)

    write("# What connections changed")
    write("")
    write(f"- **Before:** `{diff['old']}`")
    write(f"- **After:** `{diff['new']}`")
    write(f"- **Scope:** {scope}")
    write("")

    if diff["old_org"] and diff["new_org"] and diff["old_org"] != diff["new_org"]:
        write(f"**These are two different orgs ({diff['old_org']} and "
              f"{diff['new_org']}), so every line below is a difference between "
              "orgs rather than a change over time.**")
        write("")

    for title, key in (("Connections added", "edges_added"),
                       ("Connections removed", "edges_removed")):
        items = diff[key]
        write(f"## {title} ({len(items)})")
        write("")
        for item in items:
            write(f"- {item}")
        write("")

    changed = diff["edges_changed"]
    write(f"## Connections whose target or certainty moved ({len(changed)})")
    write("")
    if changed:
        write("_The connection itself is the same one; what it points at, or how "
              "sure the tool is, changed._")
        write("")
    for item in changed:
        moved = "; ".join(f"{name}: {before or '(none)'} -> {after or '(none)'}"
                          for name, (before, after) in item["changed"].items())
        write(f"- {item['what']}")
        write(f"  - {moved}")
    write("")

    for title, key in (("Components added", "components_added"),
                       ("Components removed", "components_removed")):
        items = diff[key]
        write(f"## {title} ({len(items)})")
        write("")
        for item in items:
            write(f"- `{item}`")
        write("")

    labels = diff["field_label_changes"]
    write(f"## Fields whose \"how it is populated\" label changed ({len(labels)})")
    write("")
    for item in labels:
        write(f"- `{item['field']}`: {item['before'] or '(none)'} -> "
              f"{item['after'] or '(none)'}")
    write("")

    if not has_differences(diff):
        write("No differences in scope: the connections are unchanged.")
        write("")
    return "\n".join(lines)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="What connections changed between two builds?")
    parser.add_argument("--old", required=True,
                        help="the earlier edges-<org>.json")
    parser.add_argument("--new", required=True,
                        help="the later edges-<org>.json")
    parser.add_argument("--file", action="append", default=[],
                        help="scope to components defined in files whose path "
                             "contains this, and to edges read out of them "
                             "(repeatable)")
    parser.add_argument("--component", action="append", default=[],
                        help="scope to this exact component id (repeatable)")
    parser.add_argument("--old-labels", default=None,
                        help="the earlier field-classification-<org>.json, to "
                             "compare how each field gets its value")
    parser.add_argument("--new-labels", default=None,
                        help="the later field-classification-<org>.json")
    parser.add_argument("--report", help="also write the comparison to this file")
    parser.add_argument("--json", action="store_true",
                        help="print JSON instead of readable text")
    args = parser.parse_args(argv)

    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    def labels(path):
        if not path:
            return {}
        doc = json.loads(Path(path).read_text(encoding="utf-8"))
        return {row["field"]: row["primary_kind"] for row in doc["fields"]}

    diff = diff_edge_lists(args.old, args.new, files=args.file,
                           component_ids=args.component,
                           old_labels=labels(args.old_labels),
                           new_labels=labels(args.new_labels))

    if args.json:
        print(json.dumps(diff, indent=2, ensure_ascii=False))
    else:
        print(render_text(diff))

    if args.report:
        path = Path(args.report)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(render_text(diff), encoding="utf-8", newline="\n")

    return 1 if has_differences(diff) else 0


if __name__ == "__main__":
    sys.exit(main())

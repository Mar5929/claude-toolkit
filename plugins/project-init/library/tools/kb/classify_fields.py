"""classify_fields.py — how does each field get its value?

WI-007 phase 6. This used to write rows into a SQLite table; it now reads the
JSON edge list and returns the answer, so nothing has to be stored. The label
for one field is derived from two things:

1. what the field itself is (a formula and a rollup compute their own value), and
2. what points at it with a `writes` edge, and what kind of component that is.

    python tools/kb/classify_fields.py                  every org that is built
    python tools/kb/classify_fields.py --org <name> --field Case.Priority
    python tools/kb/classify_fields.py --org <name> --write

`--write` saves `out/field-classification-<org>.json` beside the edge list, for
the change comparison in `diff_graph.py` to read. Like everything else in
`out/`, it is gitignored and rebuilt rather than committed.

**Read the limits before believing a label.** `manual_only` means "nothing in
this snapshot writes it", which is not the same as "nothing writes it". The
reasons are in `tools/kb/README.md` under "What this cannot tell you"; the short
version is that Apex writes are found by matching patterns against code text, so
they are near-complete rather than exhaustive, and an integration writing
through the API leaves no trace in the metadata at all.

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

from graph import Graph, DEFAULT_OUT, built_orgs  # noqa: E402

# What kind of thing wrote it, keyed by the metadata type of the writing
# component. The old SQLite version carried a `writer_kind` string on the edge;
# the JSON edge list does not, because the source component's own type already
# says it and one fact kept in two places drifts.
WRITER_KIND_BY_TYPE = {
    "ApexClass": "apex",
    "ApexTrigger": "apex_trigger",
    "Flow": "flow",
    "FlowDefinition": "flow",
    "Workflow": "workflow",
    "WorkflowFieldUpdate": "workflow_field_update",
    "AssignmentRules": "assignment_rule",
    "AutoResponseRules": "auto_response_rule",
    "EscalationRules": "escalation_rule",
    "QuickAction": "quick_action",
    "CustomField": "field",
    "PlatformEventChannel": "integration",
    "ExternalDataSource": "integration",
    # A custom metadata record holds the value in the file itself. That is
    # configuration somebody deploys, not automation filling a record, so it
    # gets its own label rather than being lumped in with the writers.
    "CustomMetadata": "custom_metadata_record",
}

# Which label wins when several apply. First match in this order is the answer.
PRIORITY = (
    "rollup",
    "formula",
    "apex_trigger",
    "apex",
    "flow",
    "workflow_field_update",
    "workflow",
    "quick_action",
    "assignment_rule",
    "auto_response_rule",
    "escalation_rule",
    "integration",
    "custom_metadata_record",
    "field",
)

MANUAL = "manual_only"
UNKNOWN = "unknown_writer"

EXPLANATIONS = {
    "rollup": "a roll-up summary field: Salesforce computes it from child records",
    "formula": "a formula field: Salesforce computes it every time it is read",
    "apex_trigger": "written by an Apex trigger",
    "apex": "written by an Apex class",
    "flow": "written by a flow",
    "workflow_field_update": "written by a workflow field update",
    "workflow": "written by a workflow rule",
    "quick_action": "set by a quick action",
    "assignment_rule": "set by an assignment rule",
    "auto_response_rule": "set by an auto-response rule",
    "escalation_rule": "set by an escalation rule",
    "integration": "written by an integration named in the metadata",
    "custom_metadata_record": "the value is held in custom metadata records, "
                              "which are deployed rather than entered",
    "field": "written by another field",
    UNKNOWN: "something writes it but its metadata type is not one this tool "
             "recognises as a writer",
    MANUAL: "nothing in this snapshot writes it, so it is typed in by hand, "
            "written by Apex the pattern match did not catch, or written "
            "through the API by an integration that leaves no metadata behind",
}


def writer_kind(component_type: str) -> str:
    return WRITER_KIND_BY_TYPE.get(component_type, UNKNOWN)


def primary_kind(is_formula: bool, is_rollup: bool, kinds: set) -> str:
    if is_rollup:
        return "rollup"
    if is_formula:
        return "formula"
    for name in PRIORITY:
        if name in kinds:
            return name
    if kinds:
        return UNKNOWN
    return MANUAL


def classify(graph: Graph) -> dict:
    """{field id: its label and the evidence behind it}, for every CustomField."""
    out = {}
    for cid, comp in graph.components.items():
        if comp["type"] != "CustomField":
            continue
        attributes = comp.get("attributes", {})
        is_formula = bool(attributes.get("is_formula"))
        is_rollup = (bool(attributes.get("summary_operation"))
                     or attributes.get("field_type") == "Summary")

        kinds = {}
        writers = []
        for eid in graph.into.get(cid, ()):
            source, _target, relationship, _resolution = graph.edges[eid]
            if relationship != "writes":
                continue
            source_type = graph.label(source)[0]
            kind = writer_kind(source_type)
            kinds[kind] = kinds.get(kind, 0) + 1
            writers.append(source)

        label = primary_kind(is_formula, is_rollup, set(kinds))
        out[cid] = {
            "field": cid,
            "primary_kind": label,
            "explanation": EXPLANATIONS[label],
            "writer_count": len(writers),
            "writer_kinds": sorted(kinds),
            "writers": sorted(set(writers)),
            "is_formula": is_formula,
            "is_rollup": is_rollup,
        }
    return dict(sorted(out.items()))


def document(graph: Graph, classification: dict) -> dict:
    counts = {}
    for row in classification.values():
        counts[row["primary_kind"]] = counts.get(row["primary_kind"], 0) + 1
    return {
        "schema_version": "1.0",
        "org": graph.org,
        "generated_from": graph.header.get("generated_from", ""),
        "notes": [
            "One row per CustomField, saying how it gets its value.",
            "`manual_only` means nothing in this snapshot writes it, which is "
            "not the same as nothing writing it. Apex writes are found by "
            "matching patterns against code text, so they are near-complete "
            "rather than exhaustive, and an integration writing through the "
            "API leaves no trace in the metadata at all.",
            "There is no build timestamp in this file: two builds of the same "
            "snapshot are byte-identical, which is what lets them be compared.",
        ],
        "counts": {"fields": len(classification), **dict(sorted(counts.items()))},
        "fields": list(classification.values()),
    }


def write_file(graph: Graph, classification: dict, out_dir=None) -> Path:
    out_dir = Path(out_dir or DEFAULT_OUT)
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"field-classification-{graph.org}.json"
    doc = document(graph, classification)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(doc, ensure_ascii=False, indent=2))
        handle.write("\n")
    return path


def load_file(org: str, out_dir=None) -> dict:
    """{field id: primary_kind} from a saved file, or {} when there is none."""
    path = Path(out_dir or DEFAULT_OUT) / f"field-classification-{org}.json"
    if not path.exists():
        return {}
    doc = json.loads(path.read_text(encoding="utf-8"))
    return {row["field"]: row["primary_kind"] for row in doc["fields"]}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="How does each field get its value?")
    parser.add_argument("--org", action="append", default=None,
                        help="org to read (repeatable; default: every org built)")
    parser.add_argument("--out", default=None,
                        help="where the edge lists are (default: tools/kb/out)")
    parser.add_argument("--field", default=None,
                        help="one field: print its label and every writer")
    parser.add_argument("--kind", default=None,
                        help="list every field carrying this label")
    parser.add_argument("--write", action="store_true",
                        help="save field-classification-<org>.json beside the "
                             "edge list, for diff_graph.py to compare against")
    args = parser.parse_args(argv)

    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    orgs = args.org or built_orgs(args.out)
    if not orgs:
        print("no edge list has been built yet. Run:\n"
              "  python tools/kb/build_edges.py")
        return 1

    for org in orgs:
        graph = Graph(org, args.out)
        classification = classify(graph)

        if args.field:
            cid = graph.resolve(args.field)
            row = classification.get(cid)
            if row is None:
                print(f"{cid} is not a CustomField, so it has no label.")
                continue
            print(f"=== {cid} ===")
            print(f"  {row['primary_kind']}: {row['explanation']}")
            if row["writers"]:
                print(f"  {row['writer_count']} write(s), from:")
                for writer in row["writers"]:
                    wtype, wname = graph.label(writer)
                    print(f"    {wtype} {wname}")
            print()
            continue

        counts = {}
        for row in classification.values():
            counts[row["primary_kind"]] = counts.get(row["primary_kind"], 0) + 1

        print(f"=== {org}: {len(classification)} fields ===")
        for name, count in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])):
            print(f"    {count:6d}  {name:22s}  {EXPLANATIONS[name]}")
        print()

        if args.kind:
            wanted = [row for row in classification.values()
                      if row["primary_kind"] == args.kind]
            print(f"  the {len(wanted)} fields labelled {args.kind}:")
            for row in wanted[:200]:
                print(f"    {row['field']}")
            if len(wanted) > 200:
                print(f"    ... and {len(wanted) - 200} more")
            print()

        if args.write:
            path = write_file(graph, classification, args.out)
            print(f"  wrote {path}")
            print()

    return 0


if __name__ == "__main__":
    sys.exit(main())

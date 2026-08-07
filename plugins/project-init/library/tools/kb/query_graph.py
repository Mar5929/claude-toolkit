"""query_graph.py — what connects to this, and what breaks if it changes?

WI-007 phase 6. Reads the JSON edge list `build_edges.py` writes and never
builds or changes it. It answers the two questions asked every day about one
component:

  1. Where does this value come from?  (what writes it, or what it is computed from)
  2. If I rename or change this, what breaks?  (everything within N hops)

    python tools/kb/query_graph.py Case.Priority
    python tools/kb/query_graph.py --org <name> "<name>:Flow:Case_Escalation" --hops 3
    python tools/kb/query_graph.py --org <name> --unresolved npsp__Household__c
    python tools/kb/query_graph.py --org <name> --map

`--org` can be left out when only one org has been built. `<component>` is a
component id (`<org>:CustomField:Case.Priority`), a full api name
(`Case.Priority`), or a fragment of either. A fragment matching more than one
component lists the candidates and stops rather than picking one.

Three things to know before reading a report:

- **Direction.** An edge reads "source -> target". A field is usually the
  target: writers write TO it, readers read FROM it, formulas reference it.
  Anything that NAMES a component breaks when that component is renamed, which
  is why the one-hop section lists every edge touching it in either direction.
- **`contains` is skipped in the multi-hop walk.** An object contains all its
  fields, so one hop through the parent object would drag in every sibling
  field and the answer would be useless. `--include-contains` keeps it.
- **What is missing.** `tools/kb/README.md` has the section "What this cannot
  tell you". Read it before saying "nothing writes this field".

Read-only. Org-independent: no network, no `sf` commands, no Salesforce org.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
if str(THIS_DIR) not in sys.path:
    sys.path.insert(0, str(THIS_DIR))

from classify_fields import classify  # noqa: E402
from graph import (  # noqa: E402
    CONTAINMENT, Graph, INPUT_RELATIONSHIPS, WRITER_RELATIONSHIPS,
    built_orgs, load_reverse_index,
)

CAVEAT = (
    "This report is built from the metadata files on disk, not from a live org. "
    "It cannot see everything: Apex writes are found by matching patterns "
    "against code text so they are near-complete rather than exhaustive, "
    "anything built at runtime (dynamic SOQL, `Type.forName`, a field name "
    "inside a string) is largely invisible, and an integration writing through "
    "the API leaves no metadata behind at all. An empty section means \"nothing "
    "in this snapshot\", never \"nothing\". `tools/kb/README.md` has the full "
    "list under \"What this cannot tell you\"."
)


def _escape(text: str) -> str:
    """Keep a pipe inside a value from splitting a markdown table cell."""
    return str(text).replace("|", "\\|")


def render(graph: Graph, cid: str, hops: int, include_contains: bool) -> str:
    ctype, cname = graph.label(cid)
    comp = graph.components.get(cid, {})
    lines = []
    write = lines.append

    write(f"# Impact report: {cid}")
    write("")
    write(f"- **Component:** {ctype} `{cname}`")
    if comp.get("file_path"):
        write(f"- **Defined in:** `{comp['file_path']}`")
    if comp.get("parent"):
        write(f"- **Belongs to:** `{comp['parent']}`")

    if ctype == "CustomField":
        row = classify(graph).get(cid)
        if row:
            write(f"- **How it is populated:** {row['primary_kind']} "
                  f"({row['explanation']}); {row['writer_count']} write(s) found")
    write(f"- **Radius:** {hops} hop(s); `{CONTAINMENT}` edges "
          f"{'included' if include_contains else 'skipped in the multi-hop walk'}")
    write("")

    # Everything shown below comes from at most one extra pass of the file.
    source_ids = graph.sources_of(cid)
    incident_ids = graph.incident(cid)
    detail = graph.detail(set(source_ids) | set(incident_ids))

    # 1. where the value comes from
    write(f"## Where this value comes from ({len(source_ids)})")
    write("")
    if not source_ids:
        write("_Nothing in this snapshot writes it and it is not computed. It is "
              "typed in by hand, written by Apex the pattern match did not catch, "
              "or written through the API by an integration. See the caveat at "
              "the bottom._")
    else:
        write("| relationship | from | confidence | evidence |")
        write("| --- | --- | --- | --- |")
        for eid in source_ids:
            edge = detail[eid]
            other = (edge.get("target", "") if edge["source"] == cid
                     else edge["source"])
            otype, oname = graph.label(other) if other else ("", edge.get(
                "evidence", {}).get("raw_reference", ""))
            evidence = edge.get("evidence", {})
            write(f"| {edge['relationship']} | {otype} `{_escape(oname)}` "
                  f"| {edge['confidence']} "
                  f"| `{_escape(evidence.get('file_path', ''))}` "
                  f"at `{_escape(evidence.get('location', ''))}` |")
    write("")

    # 2. one hop, either direction: the rename blast radius
    write(f"## Direct connections (1 hop): everything that names this "
          f"({len(incident_ids)})")
    write("")
    write("| direction | relationship | other component | confidence | evidence |")
    write("| --- | --- | --- | --- | --- |")
    rows = []
    for eid in incident_ids:
        edge = detail[eid]
        if edge["source"] == cid:
            other, arrow = edge.get("target", ""), "this ->"
        else:
            other, arrow = edge["source"], "-> this"
        if other:
            otype, oname = graph.label(other)
        else:
            otype = f"unresolved ({edge['resolution']})"
            oname = edge.get("evidence", {}).get("raw_reference", "")
        evidence = edge.get("evidence", {})
        rows.append((edge["relationship"], f"{otype} {oname}", arrow,
                     edge["confidence"], evidence.get("file_path", ""),
                     evidence.get("location", "")))
    for relationship, other, arrow, confidence, path, location in sorted(rows):
        otype, _, oname = other.partition(" ")
        write(f"| {arrow} | {relationship} | {otype} `{_escape(oname)}` "
              f"| {confidence} | `{_escape(path)}` at `{_escape(location)}` |")
    write("")

    # 3. the N-hop radius
    reach = graph.radius(cid, hops, include_contains)
    write(f"## Impact radius (up to {hops} hop{'s' if hops != 1 else ''}): what "
          f"could break if this changes ({len(reach)})")
    write("")
    if not reach:
        write("_Nothing else connects within the radius._")
    else:
        write("| hops | type | name | reached by |")
        write("| --- | --- | --- | --- |")
        ordered = sorted(reach.items(), key=lambda kv: (kv[1][0], kv[0]))
        for node, (distance, vias) in ordered:
            otype, oname = graph.label(node)
            kinds = ", ".join(sorted({relationship for relationship, _ in vias}))
            write(f"| {distance} | {otype} | `{_escape(oname)}` | {kinds} |")
    write("")

    write("---")
    write("")
    write(CAVEAT)
    write("")
    return "\n".join(lines)


def render_unresolved(graph: Graph, name: str) -> str:
    """Who asked for a name that points at nothing in this snapshot."""
    index = load_reverse_index(graph.org, graph.out_dir)
    bucket = index["by_unresolved_reference"]
    entries = bucket.get(name)
    lines = []
    write = lines.append
    write(f"# Unresolved reference: `{name}` in {graph.org}")
    write("")
    if not entries:
        close = sorted(key for key in bucket if name.lower() in key.lower())
        if not close:
            write(f"_No unresolved reference in {graph.org} matches `{name}`. "
                  "Either it resolved fine, or nothing names it._")
            write("")
            return "\n".join(lines)
        write(f"_No exact match. {len(close)} unresolved names contain it:_")
        write("")
        for key in close[:50]:
            write(f"- `{key}` ({len(bucket[key])} edge(s))")
        write("")
        return "\n".join(lines)

    detail = graph.detail(entry["edge"] for entry in entries)
    first = detail[entries[0]["edge"]]
    write(f"- **Why it resolved to nothing:** {first['resolution']}")
    write(f"- **The rule that decided:** {first.get('resolved_by', '')}")
    write(f"- **In plain words:** {first.get('resolution_detail', '')}")
    write(f"- **Held by:** {len(entries)} edge(s)")
    write("")
    write("| relationship | asked for by | evidence |")
    write("| --- | --- | --- |")
    for entry in entries:
        edge = detail[entry["edge"]]
        stype, sname = graph.label(edge["source"])
        evidence = edge.get("evidence", {})
        write(f"| {edge['relationship']} | {stype} `{_escape(sname)}` "
              f"| `{_escape(evidence.get('file_path', ''))}` at "
              f"`{_escape(evidence.get('location', ''))}` |")
    write("")
    return "\n".join(lines)


def render_map(graph: Graph, limit: int) -> str:
    """The subsystem worklist: what exists, ranked by how connected it is.

    Somebody starting on an unfamiliar org reads this first: the objects with
    the most fields, the flows doing the most, and the Apex classes everything
    else calls. It is the list of where to look, not an answer in itself.
    """
    lines = []
    write = lines.append
    counts = graph.header.get("counts", {})
    write(f"# Subsystem map: {graph.org}")
    write("")
    write(f"- **Built from:** `{graph.header.get('generated_from', '')}`")
    write(f"- **Holds:** {counts.get('components', 0)} components and "
          f"{counts.get('edges', 0)} edges, of which "
          f"{counts.get('resolved', 0)} resolved to a component in this org")
    write("")

    by_type = {}
    for comp in graph.components.values():
        by_type[comp["type"]] = by_type.get(comp["type"], 0) + 1
    write(f"## What is in it ({len(by_type)} metadata types)")
    write("")
    write("| metadata type | components |")
    write("| --- | --- |")
    for name, count in sorted(by_type.items(), key=lambda kv: (-kv[1], kv[0])):
        write(f"| {name} | {count} |")
    write("")

    def busiest(metadata_type, title, columns):
        rows = []
        for cid, comp in graph.components.items():
            if comp["type"] != metadata_type:
                continue
            outgoing = len(graph.out.get(cid, ()))
            incoming = len(graph.into.get(cid, ()))
            children = sum(1 for other in graph.components.values()
                           if other.get("parent") == cid)
            rows.append((outgoing + incoming, comp["api_name"], outgoing,
                         incoming, children))
        rows.sort(key=lambda row: (-row[0], row[1]))
        write(f"## {title} ({len(rows)}), busiest first")
        write("")
        write("| " + " | ".join(columns) + " |")
        write("| " + " | ".join("---" for _ in columns) + " |")
        for _total, name, outgoing, incoming, children in rows[:limit]:
            if metadata_type == "CustomObject":
                write(f"| `{_escape(name)}` | {children} | {incoming} | {outgoing} |")
            else:
                write(f"| `{_escape(name)}` | {outgoing} | {incoming} |")
        if len(rows) > limit:
            write(f"| _... and {len(rows) - limit} more_ | | |")
        write("")

    busiest("CustomObject", "Objects",
            ["object", "fields", "pointed at by", "points at"])
    busiest("Flow", "Flows", ["flow", "points at", "pointed at by"])
    busiest("ApexClass", "Apex classes", ["class", "points at", "pointed at by"])
    busiest("PermissionSet", "Permission sets",
            ["permission set", "grants", "pointed at by"])

    write("---")
    write("")
    write(CAVEAT)
    write("")
    return "\n".join(lines)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="What connects to this, and what breaks if it changes?")
    parser.add_argument("component", nargs="?",
                        help="a component id, an api name, or a fragment")
    parser.add_argument("--org", default=None,
                        help="which org to read (default: the only one built)")
    parser.add_argument("--out", default=None,
                        help="where the edge lists are (default: tools/kb/out)")
    parser.add_argument("--hops", type=int, default=2,
                        help="how far the impact radius reaches (default 2)")
    parser.add_argument("--include-contains", action="store_true",
                        help="keep `contains` edges in the multi-hop walk; an "
                             "object contains every one of its fields, so this "
                             "is much noisier")
    parser.add_argument("--unresolved", default=None,
                        help="a reference string that points at nothing: who "
                             "asked for it, and why it resolved to nothing")
    parser.add_argument("--map", action="store_true",
                        help="the subsystem worklist: what exists, ranked by "
                             "how connected it is")
    parser.add_argument("--limit", type=int, default=40,
                        help="rows per section in --map (default 40)")
    parser.add_argument("--report", help="also write the report to this file")
    args = parser.parse_args(argv)

    chosen = [bool(args.component), bool(args.unresolved), args.map]
    if sum(chosen) != 1:
        parser.error("give exactly one of: <component>, --unresolved <name>, "
                     "or --map")

    # A Windows console defaults to cp1252; never let one stray character crash
    # a whole report.
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    org = args.org
    if not org:
        available = built_orgs(args.out)
        if not available:
            print("no edge list has been built yet. Run:\n"
                  "  python tools/kb/build_edges.py")
            return 1
        if len(available) > 1:
            print(f"more than one org is built ({', '.join(available)}); say "
                  "which with --org")
            return 2
        org = available[0]

    graph = Graph(org, args.out)

    if args.map:
        report = render_map(graph, args.limit)
    elif args.unresolved:
        report = render_unresolved(graph, args.unresolved)
    else:
        cid = graph.resolve(args.component)
        report = render(graph, cid, args.hops, args.include_contains)

    print(report)
    if args.report:
        path = Path(args.report)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(report, encoding="utf-8", newline="\n")
        print(f"[wrote the report to {path}]")
    return 0


if __name__ == "__main__":
    sys.exit(main())

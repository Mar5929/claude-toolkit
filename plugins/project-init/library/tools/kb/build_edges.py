"""build_edges.py — run WI-007 phases 4 and 5 over an org and write its files.

    python tools/kb/build_edges.py                      every org in the project
    python tools/kb/build_edges.py --org <name>         one named org
    python tools/kb/build_edges.py --org <name> --sample 3
    python tools/kb/build_edges.py --org <name> --check-only

An org is a folder of Salesforce metadata. The names come from the project's own
`sfdx-project.json`, or from the folders under `force-app`, so nothing here is
tied to any one project's org names.

It walks the org's metadata (phase 2), resolves every reference it finds
(phase 3), and writes:

    tools/kb/out/edges-<org>.json          every component and every edge
    tools/kb/out/reverse-index-<org>.json  what points AT each component
    tools/kb/out/coverage-<org>.json       every file, its type and its edge
                                           count, and the reason when it is zero
    tools/kb/out/unresolved-<org>.json     every name that resolved to nothing,
                                           its reason, and who asked for it
    tools/kb/out/reports-<org>.md          the last two, short enough to read

One command writes all five, which is what the SPEC's "how it behaves from the
outside" describes. None of them is committed to git. That was decided on
2026-08-04, after a finished edge list measured 213.6 MB and GitHub refuses any
file over 100 MB. Rebuilding is the freshness check; there is no committed copy
that can go stale.

It ends with the phase 4 and phase 5 acceptance checks and exits 1 if any of them
fails.

Local files only. This never contacts a Salesforce org.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
if str(THIS_DIR) not in sys.path:
    sys.path.insert(0, str(THIS_DIR))

from edge_list import build_edge_list, acceptance, component_type, write_files  # noqa: E402
from extractors import extract_org  # noqa: E402
from graph import select_orgs  # noqa: E402
from reports import (  # noqa: E402
    acceptance as reports_acceptance, build_coverage, build_unresolved,
    markdown_summary, write_reports,
)
from resolver import RESOLUTIONS, RESOLVED, Resolver  # noqa: E402


def _megabytes(path: Path) -> str:
    size = path.stat().st_size
    if size < 1024 * 1024:
        return f"{size / 1024:.0f} KB"
    return f"{size / (1024 * 1024):.1f} MB"


def _top(counts, limit):
    return sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:limit]


def _report(edge_list, extraction, resolution, args, written) -> list:
    org = edge_list.org
    counts = edge_list.counts()
    total = counts["edges"]

    print(f"=== {org}: {counts['components']} components, {total} edges ===")
    for value in RESOLUTIONS:
        share = (100.0 * counts[value] / total) if total else 0.0
        print(f"    {counts[value]:8d}  {share:5.1f}%  {value}")
    print()

    print(f"  {counts['components_with_something_pointing_at_them']} components "
          "have something pointing at them")
    print(f"  {counts['unresolved_reference_strings']} different reference strings "
          "resolved to nothing and are filed under themselves")
    print()

    by_source = {}
    by_target = {}
    for edge in edge_list.edges:
        source = component_type(edge["source"])
        by_source[source] = by_source.get(source, 0) + 1
        if edge.get("target"):
            target = component_type(edge["target"])
            by_target[target] = by_target.get(target, 0) + 1
    print("  the ten kinds of component producing the most edges:")
    for name, count in _top(by_source, 10):
        print(f"    {count:8d}  {name}")
    print()
    print("  the ten kinds of component most pointed at:")
    for name, count in _top(by_target, 10):
        print(f"    {count:8d}  {name}")
    print()

    if args.sample:
        print(f"  {args.sample} edges as written:")
        step = max(1, len(edge_list.edges) // (args.sample + 1))
        for edge in edge_list.edges[step::step][:args.sample]:
            print("    " + json.dumps(edge, ensure_ascii=False)[:400])
        print()

    if written:
        for name, path in written.items():
            print(f"  wrote {path} ({_megabytes(path)})")
        print()

    print("  phase 4 acceptance:")
    failures = []
    for passed, sentence in acceptance(edge_list, extraction, resolution):
        print(f"    {sentence}  {'PASS' if passed else 'FAIL'}")
        if not passed:
            failures.append(f"{org}: {sentence}")
    return failures


def _report_reports(coverage, unresolved, extraction, edge_list, args,
                    written) -> list:
    """Print the phase 5 coverage and unresolved summary. Returns failure lines."""
    org = coverage.org
    c = coverage.counts
    u = unresolved.counts

    print(f"=== {org}: coverage of all {c['files']} files ===")
    print(f"    {c['files_opened']:8d}  opened and read")
    print(f"    {c['files_not_opened']:8d}  not opened, with a stated reason")
    print(f"    {c['files_producing_edges']:8d}  produced at least one edge")
    print(f"    {c['files_producing_no_edge']:8d}  produced no edge, with a "
          "stated reason")
    print(f"    {c['files_with_an_error']:8d}  would not read or parse")
    print(f"    {c['metadata_types']:8d}  metadata types, of which "
          f"{c['metadata_types_producing_edges']} produced an edge")
    print()

    print("  the ten metadata types producing the most edges:")
    for row in coverage.by_metadata_type[:10]:
        print(f"    {row['edges']:8d}  {row['files']:6d} files  "
              f"{row['metadata_type']}")
    print()

    print(f"  why {c['files_producing_no_edge']} files produced no edge:")
    for row in coverage.reasons[:args.reasons]:
        print(f"    {row['files']:8d}  {row['reason']}")
    if len(coverage.reasons) > args.reasons:
        print(f"              (+{len(coverage.reasons) - args.reasons} more "
              f"reasons; all of them are in coverage-{org}.json)")
    print()

    print(f"=== {org}: {u['unresolved_edges']} edges resolved to nothing, across "
          f"{u['distinct_reference_strings']} different names ===")
    for row in unresolved.by_reason:
        print(f"    {row['edges']:8d}  {row['reference_strings']:6d} names  "
              f"{row['resolution']}")
    print()
    if unresolved.by_namespace:
        print("  managed packages met:")
        for row in unresolved.by_namespace:
            print(f"    {row['edges']:8d}  {row['reference_strings']:6d} names  "
                  f"{row['namespace']}")
        print()
    print(f"  the {args.reasons} names held by the most edges:")
    for row in unresolved.references[:args.reasons]:
        print(f"    {row['edges']:8d}  {row['raw_reference']}")
        print(f"              {row['resolution']}: {row['resolution_detail']}")
    print()

    if written:
        for name, path in written.items():
            print(f"  wrote {path} ({_megabytes(path)})")
        print()

    print("  phase 5 acceptance:")
    failures = []
    for passed, sentence in reports_acceptance(coverage, unresolved, extraction,
                                               edge_list):
        print(f"    {sentence}  {'PASS' if passed else 'FAIL'}")
        if not passed:
            failures.append(f"{org}: {sentence}")
    return failures


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Build the JSON edge list and reverse index for an org.")
    parser.add_argument("--org", action="append", default=None,
                        help="org folder under force-app (repeatable)")
    parser.add_argument("--force-app", default=None,
                        help="path to the force-app folder (default: repo force-app)")
    parser.add_argument("--out", default=None,
                        help="where to write (default: tools/kb/out)")
    parser.add_argument("--check-only", action="store_true",
                        help="run the checks without writing any file")
    parser.add_argument("--sample", type=int, default=0,
                        help="print N finished edges, spread through the list")
    parser.add_argument("--reasons", type=int, default=12,
                        help="how many rows to print in each phase 5 breakdown")
    parser.add_argument("--prove-deterministic", action="store_true",
                        help="build each org a second time and compare the bytes")
    args = parser.parse_args(argv)

    out_dir = Path(args.out) if args.out else THIS_DIR / "out"
    roots, problem = select_orgs(args.org, force_app=args.force_app)
    if problem:
        print(problem)
        return 1
    orgs = list(roots)

    failures = []
    grand = {value: 0 for value in RESOLUTIONS}
    grand_edges = 0
    for org in orgs:
        root = roots[org]
        extraction = extract_org(root, org)
        resolution = Resolver(extraction).resolve_all()
        edge_list = build_edge_list(extraction, resolution)

        coverage = build_coverage(extraction, edge_list)
        unresolved = build_unresolved(edge_list)

        written = None if args.check_only else write_files(edge_list, out_dir)
        failures.extend(_report(edge_list, extraction, resolution, args, written))

        reports_written = (None if args.check_only
                           else write_reports(coverage, unresolved, out_dir))
        failures.extend(_report_reports(coverage, unresolved, extraction,
                                        edge_list, args, reports_written))

        if args.prove_deterministic:
            # The whole pipeline a second time, from the files on disk, so this
            # proves the walk and the parse are as stable as the writer.
            from edge_list import dumps
            second_extraction = extract_org(root, org)
            second_resolution = Resolver(second_extraction).resolve_all()
            second_list = build_edge_list(second_extraction, second_resolution)
            second_coverage = build_coverage(second_extraction, second_list)
            second_unresolved = build_unresolved(second_list)
            for label, keys, first_doc, second_doc in (
                ("the edge list", ("components", "edges"),
                 edge_list.edges_document(), second_list.edges_document()),
                ("the reverse index",
                 ("by_component", "by_unresolved_reference"),
                 edge_list.reverse_index_document(),
                 second_list.reverse_index_document()),
                ("the coverage report", ("files", "by_metadata_type"),
                 coverage.document(), second_coverage.document()),
                ("the unresolved report", ("references",),
                 unresolved.document(), second_unresolved.document()),
            ):
                same = dumps(first_doc, keys) == dumps(second_doc, keys)
                print(f"    building {label} twice from the files gives the same "
                      f"bytes  {'PASS' if same else 'FAIL'}")
                if not same:
                    failures.append(
                        f"{org}: two builds of {label} produced different bytes")
            same_markdown = (markdown_summary(coverage, unresolved)
                             == markdown_summary(second_coverage,
                                                 second_unresolved))
            print("    building the readable summary twice from the files gives "
                  f"the same bytes  {'PASS' if same_markdown else 'FAIL'}")
            if not same_markdown:
                failures.append(
                    f"{org}: two builds of the readable summary differed")

        counts = edge_list.counts()
        grand_edges += counts["edges"]
        for value in RESOLUTIONS:
            grand[value] += counts[value]
        print()

    if len(orgs) > 1:
        print(f"=== all {len(orgs)} orgs: {grand_edges} edges ===")
        for value in RESOLUTIONS:
            share = (100.0 * grand[value] / grand_edges) if grand_edges else 0.0
            print(f"    {grand[value]:8d}  {share:5.1f}%  {value}")
        print()

    if failures:
        print("FAILED:")
        for line in failures:
            print(f"  {line}")
        return 1
    print("every phase 4 and phase 5 acceptance check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

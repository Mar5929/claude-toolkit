"""resolve.py — run the WI-007 phase 3 resolver over an org and report what happened.

    python tools/kb/resolve.py                          every org in the project
    python tools/kb/resolve.py --org <name> --examples 40
    python tools/kb/resolve.py --org <name> --without-profiles

What it prints, in order: how many references resolved and how many did not with
each reason; the breakdown by the metadata type the reference came FROM and by the
type it points AT, so a weak spot shows up as a named row rather than disappearing
into an average; which rule decided each group; the managed package namespaces met;
and the most common strings that did not resolve.

It ends with the phase 3 acceptance checks and exits 1 if any of them fails.

Profiles are 293,373 of the 429,521 references and a profile retrieve is lossy by
design, so `--without-profiles` prints the same report with them left out. Both
numbers matter: the full one is the truth about the files, the profile-free one is
the truth about everything that is not partial evidence.

Local files only. This never contacts a Salesforce org.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
if str(THIS_DIR) not in sys.path:
    sys.path.insert(0, str(THIS_DIR))

from extractors import extract_org, split_component_id  # noqa: E402
from graph import select_orgs  # noqa: E402
from resolver import (  # noqa: E402
    RESOLUTIONS, RESOLVED, UNRESOLVED_MANAGED_PACKAGE, Resolver,
)

SHORT = {
    "resolved": "resolved",
    "unresolved_managed_package": "package",
    "unresolved_not_in_snapshot": "absent",
    "unresolved_dynamic": "dynamic",
    "unresolved_unknown": "unknown",
}


def _percent(part, whole) -> str:
    return f"{(100.0 * part / whole):5.1f}%" if whole else "    - "


def _table(title, rows, total_key="total"):
    """rows: {name: {resolution -> count}}, printed most references first."""
    print(f"  {title}")
    print(f"    {'total':>8s} {'resolved':>9s} {'%':>6s} {'package':>8s} "
          f"{'absent':>8s} {'dynamic':>8s} {'unknown':>8s}  name")
    ordering = sorted(rows.items(), key=lambda kv: -sum(kv[1].values()))
    for name, counts in ordering:
        total = sum(counts.values())
        print(f"    {total:8d} {counts[RESOLVED]:9d} "
              f"{_percent(counts[RESOLVED], total)} "
              f"{counts['unresolved_managed_package']:8d} "
              f"{counts['unresolved_not_in_snapshot']:8d} "
              f"{counts['unresolved_dynamic']:8d} "
              f"{counts['unresolved_unknown']:8d}  {name}")


def _report(extraction, resolution, args) -> list:
    """Print one org's report and return a list of failure lines."""
    failures = []
    org = extraction.org
    counts = resolution.counts()
    total = len(resolution.resolutions)

    print(f"=== {org}: {total} references, {len(extraction.components)} components ===")
    print(f"  relationship steps learned from referenceTo: "
          f"{resolution.relationship_count}")
    print()
    for value in RESOLUTIONS:
        print(f"    {counts[value]:8d}  {_percent(counts[value], total)}  {value}")
    print()

    _table("by the metadata type the reference came FROM:",
           resolution.by_source_type())
    print()
    _table("by the type the reference points AT:", resolution.by_target_type())
    print()

    print("  which rule decided, most references first:")
    for (value, rule), count in list(resolution.by_rule().items())[:args.rules]:
        print(f"    {count:8d}  {SHORT.get(value, value):9s} {rule}")
    print()

    namespaces = resolution.namespaces()
    if namespaces:
        print(f"  managed package namespaces met: {len(namespaces)}")
        for namespace, count in list(namespaces.items())[:20]:
            print(f"    {count:8d}  {namespace}")
        print()

    if args.show_rule:
        # SPEC requirement 6: any edge can be checked back to where it came from.
        # This is that check made runnable: pick a rule, see what it actually did,
        # with the file and element each answer came out of.
        shown = 0
        print(f"  what the {args.show_rule!r} rule did, {args.show_examples} "
              "examples:")
        for ref, res in zip(resolution.references, resolution.resolutions):
            if res.rule != args.show_rule:
                continue
            print(f"    {ref.source_id}")
            print(f"      {ref.raw!r} ({ref.relationship}, wanted a "
                  f"{ref.target_type or 'component of unknown type'}, parent "
                  f"{ref.target_parent or 'not given'})")
            print(f"      -> {res.target_id or res.resolution}")
            print(f"      {res.detail}")
            print(f"      from {ref.file_path}:{ref.location}")
            shown += 1
            if shown >= args.show_examples:
                break
        if shown == 0:
            print(f"    no reference was decided by a rule called "
                  f"{args.show_rule!r}")
        print()

    if args.examples:
        print(f"  the {args.examples} most common strings that did not resolve:")
        for count, ref, res in resolution.unresolved_examples(args.examples):
            print(f"    {count:6d}  {ref.raw!r} "
                  f"(wanted a {ref.target_type or 'component of unknown type'})")
            print(f"            {res.resolution}: {res.detail}")
        print()

    # -- acceptance ------------------------------------------------------
    print("  phase 3 acceptance:")

    if total == len(extraction.references):
        print(f"    every reference got a resolution: {total} in, {total} out  PASS")
    else:
        print(f"    {len(extraction.references)} in but {total} out  FAIL")
        failures.append(f"{org}: reference count changed during resolution")

    bad_value = [r for r in resolution.resolutions if r.resolution not in RESOLUTIONS]
    if bad_value:
        print(f"    {len(bad_value)} resolutions used a value not in the SPEC  FAIL")
        failures.append(f"{org}: {len(bad_value)} resolutions off the SPEC's list")
    else:
        print("    every resolution used one of the SPEC's five values  PASS")

    dangling = [r for r in resolution.resolutions
                if r.is_resolved and r.target_id not in extraction.components]
    if dangling:
        print(f"    {len(dangling)} resolved references point at no component  FAIL")
        for res in dangling[:5]:
            print(f"      {res.target_id}")
        failures.append(f"{org}: {len(dangling)} resolved targets do not exist")
    else:
        print(f"    every one of the {counts[RESOLVED]} resolved targets is a real "
              "component in this org  PASS")

    crossed = [r for r in resolution.resolutions
               if r.is_resolved and not r.target_id.startswith(f"{org}:")]
    if crossed:
        print(f"    {len(crossed)} edges cross orgs  FAIL")
        failures.append(f"{org}: {len(crossed)} edges cross orgs")
    else:
        print("    no edge crosses from one org to the other  PASS")

    silent = [r for r in resolution.resolutions if not r.is_resolved and not r.detail]
    if silent:
        print(f"    {len(silent)} unresolved references gave no reason  FAIL")
        failures.append(f"{org}: {len(silent)} unresolved with no reason")
    else:
        print("    every unresolved reference says why  PASS")

    nameless = [r for r in resolution.resolutions
                if r.resolution == UNRESOLVED_MANAGED_PACKAGE and not r.namespace]
    if nameless:
        print(f"    {len(nameless)} managed package references name no namespace  FAIL")
        failures.append(f"{org}: {len(nameless)} package references with no namespace")
    else:
        print(f"    all {counts[UNRESOLVED_MANAGED_PACKAGE]} managed package "
              "references name their namespace  PASS")

    return failures


def _drop_profiles(extraction, resolution):
    """The same result with every profile-sourced reference left out.

    A profile retrieve is lossy, so those references are partial evidence by SPEC
    agent decision 3 and they outnumber everything else four to one.
    """
    from resolver import ResolutionResult

    keep_refs, keep_res = [], []
    for ref, res in zip(resolution.references, resolution.resolutions):
        parts = split_component_id(ref.source_id)
        if parts and parts[1] == "Profile":
            continue
        keep_refs.append(ref)
        keep_res.append(res)
    return ResolutionResult(
        org=resolution.org, resolutions=keep_res, references=keep_refs,
        relationship_count=resolution.relationship_count,
    )


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Resolve raw references into component ids and report on it.",
    )
    parser.add_argument("--org", action="append", default=None,
                        help="org folder under force-app (repeatable)")
    parser.add_argument("--force-app", default=None,
                        help="path to the force-app folder (default: repo force-app)")
    parser.add_argument("--examples", type=int, default=20,
                        help="show N of the most common unresolved strings")
    parser.add_argument("--rules", type=int, default=30,
                        help="show N resolution rules, most references first")
    parser.add_argument("--without-profiles", action="store_true",
                        help="report again with profile references left out")
    parser.add_argument("--show-rule", default=None,
                        help="show what one named rule actually decided, with the "
                             "file and element each answer came from")
    parser.add_argument("--show-examples", type=int, default=15,
                        help="how many examples --show-rule prints")
    args = parser.parse_args(argv)

    roots, problem = select_orgs(args.org, force_app=args.force_app)
    if problem:
        print(problem)
        return 1
    orgs = list(roots)

    failures = []
    grand = {value: 0 for value in RESOLUTIONS}
    for org in orgs:
        extraction = extract_org(roots[org], org)
        resolution = Resolver(extraction).resolve_all()
        failures.extend(_report(extraction, resolution, args))
        for value, count in resolution.counts().items():
            grand[value] += count
        if args.without_profiles:
            print()
            trimmed = _drop_profiles(extraction, resolution)
            counts = trimmed.counts()
            total = len(trimmed.resolutions)
            print(f"  === {org} with profile references left out: {total} ===")
            for value in RESOLUTIONS:
                print(f"    {counts[value]:8d}  {_percent(counts[value], total)}  "
                      f"{value}")
        print()

    if len(orgs) > 1:
        total = sum(grand.values())
        print(f"=== both orgs: {total} references ===")
        for value in RESOLUTIONS:
            print(f"    {grand[value]:8d}  {_percent(grand[value], total)}  {value}")
        print()

    if failures:
        print("FAILED:")
        for line in failures:
            print(f"  {line}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

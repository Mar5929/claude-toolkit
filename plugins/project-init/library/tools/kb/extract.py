"""extract.py — run the WI-007 phase 2 extractors over an org and report coverage.

    python tools/kb/extract.py                          every org in the project
    python tools/kb/extract.py --org <name> --prove-gaps
    python tools/kb/extract.py --org <name> --json --census 40

What it prints, in order: how many files were opened and what came out of them,
the per-metadata-type table (files, references, and how many files produced
nothing), the relationship counts, and the check that every file with zero
references said why. `--prove-gaps` adds the measured audit gaps and whether each
one now produces references.

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

from extractors import extract_org, split_component_id  # noqa: E402
from graph import select_orgs  # noqa: E402

# The gaps the audit measured at zero. Each is a name, a test over one reference,
# and why it was zero.
#
# The audit counted every org TOGETHER, and two orgs rarely hold the same things:
# in the pair this was built against, one had no subflows and no flow record
# deletes at all while the other had 12 and 5. So a gap is judged across every org
# in the run, and the per-org split is printed underneath, rather than calling a
# genuine absence a failure.
GAP_CHECKS = (
    (
        "lookup and master-detail relationships (referenceTo)",
        lambda ref, src: ref.relationship in ("lookup", "master_detail"),
        "the field parser never read referenceTo; 205 field files carry one",
    ),
    (
        "a flow calling another flow (subflows)",
        lambda ref, src: ref.relationship == "calls_subflow",
        "12 flow files contain a subflow",
    ),
    (
        "a flow calling Apex or sending an email alert (actionCalls)",
        lambda ref, src: src == "Flow" and "action_type" in ref.attributes,
        "89 flow files contain an actionCall",
    ),
    (
        "a flow deleting records (recordDeletes)",
        lambda ref, src: src == "Flow" and ref.relationship == "deletes",
        "5 flow files delete records",
    ),
    (
        "permission set object permissions",
        lambda ref, src: (src == "PermissionSet"
                          and ref.relationship in ("grants_object_read",
                                                   "grants_object_create",
                                                   "grants_object_edit",
                                                   "grants_object_delete",
                                                   "grants_view_all",
                                                   "grants_modify_all")),
        "73 permission set files carry objectPermissions",
    ),
    (
        "Apex class access from a permission set or profile",
        lambda ref, src: (src in ("PermissionSet", "Profile")
                          and ref.relationship == "grants_apex_access"),
        "5 permission set files carry classAccesses; 64 files in total do, "
        "most of them profiles",
    ),
    (
        "formulas resolving standard fields",
        lambda ref, src: (ref.relationship == "formula_references"
                          and not ref.raw.endswith("__c")
                          and "." not in ref.raw),
        "the old pattern only matched names ending in __c",
    ),
    (
        "Apex writing to a field or object",
        lambda ref, src: (src in ("ApexClass", "ApexTrigger")
                          and ref.relationship in ("writes", "deletes")),
        "the DML loop ended in `continue`; no Apex write was ever emitted",
    ),
    (
        "Apex custom label references",
        lambda ref, src: (src in ("ApexClass", "ApexTrigger")
                          and ref.target_type == "CustomLabel"),
        "labels had no inbound edge from anywhere",
    ),
    (
        "object subfolders: list views and web links",
        lambda ref, src: src in ("ListView", "WebLink"),
        "574 list view files and 145 web link files were never opened",
    ),
    (
        "layouts and Lightning pages",
        lambda ref, src: src in ("Layout", "FlexiPage"),
        "374 layout and Lightning page files were never opened",
    ),
    (
        "profiles (partial evidence by design)",
        lambda ref, src: src == "Profile",
        "118 profile files were never opened",
    ),
)


def _summarise(result, args) -> list:
    """Print one org's report. Returns a list of failure lines."""
    failures = []
    outcomes = result.outcomes
    opened = sum(1 for o in outcomes if o.opened)
    with_refs = sum(1 for o in outcomes if o.reference_count > 0)
    errors = [o for o in outcomes if o.error]

    print(f"=== {result.org}: {len(outcomes)} files under {result.root} ===")
    print(f"  files opened and read      : {opened}")
    print(f"  files not opened, explained: {len(outcomes) - opened}")
    print(f"  files producing references : {with_refs}")
    print(f"  components                 : {len(result.components)}")
    print(f"  raw references             : {len(result.references)}")
    if errors:
        print(f"  files that would not parse : {len(errors)}")
        for outcome in errors[:10]:
            print(f"    {outcome.file_path}: {outcome.error}")

    print()
    print("  by metadata type (files / references / files with none):")
    files_by_type = result.files_by_type()
    refs_by_type = result.references_by_type()
    zero_by_type = {}
    for outcome in outcomes:
        if outcome.reference_count == 0:
            zero_by_type[outcome.metadata_type] = \
                zero_by_type.get(outcome.metadata_type, 0) + 1
    ordering = sorted(files_by_type.items(),
                      key=lambda kv: (-refs_by_type.get(kv[0], 0), -kv[1], kv[0]))
    for mtype, file_count in ordering:
        print(f"    {file_count:6d}  {refs_by_type.get(mtype, 0):8d}  "
              f"{zero_by_type.get(mtype, 0):6d}  {mtype}")

    print()
    print("  by relationship:")
    for relationship, count in result.relationship_counts().items():
        print(f"    {count:8d}  {relationship}")

    # SPEC requirement 1: no silent skips.
    unexplained = result.unexplained_zero_files()
    print()
    if unexplained:
        print(f"  UNEXPLAINED: {len(unexplained)} files produced nothing and gave "
              "no reason  FAIL")
        for outcome in unexplained[:15]:
            print(f"    {outcome.file_path} ({outcome.metadata_type})")
        failures.append(f"{result.org}: {len(unexplained)} files with no stated reason")
    else:
        print("  every file with zero references states why  PASS")

    types_present = set(files_by_type)
    types_with_refs = {m for m in types_present if refs_by_type.get(m, 0) > 0}
    print(f"  metadata types present: {len(types_present)}, "
          f"of which {len(types_with_refs)} produced at least one reference")

    # SPEC requirement 2 and the phase 2 acceptance: every type produces a
    # STATED result, and "this type points at nothing" is a result as long as it
    # is stated. Print the reason each silent type gave.
    silent = sorted(types_present - types_with_refs)
    if silent:
        print()
        print(f"  the {len(silent)} types that produced no reference, and what "
              "each one said:")
        for mtype in silent:
            reasons = {}
            for outcome in outcomes:
                if outcome.metadata_type != mtype:
                    continue
                reason = outcome.reason or outcome.error or "(no reason given)"
                reasons[reason] = reasons.get(reason, 0) + 1
            top_reason, count = max(reasons.items(), key=lambda kv: kv[1])
            extra = f" (+{len(reasons) - 1} other reasons)" if len(reasons) > 1 else ""
            print(f"    {files_by_type[mtype]:5d}  {mtype}")
            print(f"           {count} of them: {top_reason}{extra}")
            if "(no reason given)" in reasons:
                failures.append(f"{result.org}: {mtype} gave no reason")

    if args.census:
        print()
        print(f"  tag census: the {args.census} most common elements the generic "
              "pass did not treat as a reference")
        flat = []
        for mtype, tags in result.tag_census.items():
            for tag_name, count in tags.items():
                flat.append((count, mtype, tag_name))
        flat.sort(reverse=True)
        for count, mtype, tag_name in flat[:args.census]:
            print(f"    {count:8d}  {mtype}.{tag_name}")

    if args.notes and result.notes:
        print()
        print(f"  notes: {len(result.notes)}")
        for note in result.notes[:args.notes]:
            print(f"    {note}")

    return failures


def _count_gaps(result, tally) -> None:
    """Add one org's gap counts and first example into the running tally."""
    per_org = tally.setdefault(result.org, [0] * len(GAP_CHECKS))
    for ref in result.references:
        parts = split_component_id(ref.source_id)
        source_type = parts[1] if parts else ""
        for index, (_name, test, _was) in enumerate(GAP_CHECKS):
            try:
                hit = test(ref, source_type)
            except Exception:                          # noqa: BLE001
                hit = False
            if not hit:
                continue
            per_org[index] += 1
            tally["_totals"][index] += 1
            if tally["_examples"][index] is None:
                tally["_examples"][index] = ref


def _report_gaps(tally, orgs) -> list:
    """Print the gap table across every org in this run."""
    print("=== the gaps the audit measured at zero ===")
    failures = []
    for index, (name, _test, was) in enumerate(GAP_CHECKS):
        total = tally["_totals"][index]
        verdict = "PASS" if total > 0 else "FAIL"
        split = "  ".join(f"{org}: {tally[org][index]}" for org in orgs
                          if org in tally)
        print(f"  {verdict}  {total:7d}  {name}")
        print(f"                   per org: {split}")
        print(f"                   was zero because {was}")
        example = tally["_examples"][index]
        if example is not None:
            print(f"                   example: {example.source_id} -> "
                  f"{example.raw!r} ({example.relationship}) at "
                  f"{example.file_path}:{example.location}")
        if total == 0:
            failures.append(f"still zero across every org: {name}")
    return failures


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Extract components and raw references from an org's metadata.",
    )
    parser.add_argument("--org", action="append", default=None,
                        help="org folder under force-app (repeatable)")
    parser.add_argument("--force-app", default=None,
                        help="path to the force-app folder (default: repo force-app)")
    parser.add_argument("--json", action="store_true",
                        help="write tools/kb/out/phase2-<org>.json")
    parser.add_argument("--out-dir", default=None,
                        help="where --json writes (default: tools/kb/out)")
    parser.add_argument("--prove-gaps", action="store_true",
                        help="check each gap the audit measured at zero")
    parser.add_argument("--census", type=int, default=0,
                        help="show N unrecognised element tags, most common first")
    parser.add_argument("--notes", type=int, default=0,
                        help="show N parser notes")
    args = parser.parse_args(argv)

    out_dir = Path(args.out_dir) if args.out_dir else THIS_DIR / "out"
    roots, problem = select_orgs(args.org, force_app=args.force_app)
    if problem:
        print(problem)
        return 1
    orgs = list(roots)

    failures = []
    tally = {"_totals": [0] * len(GAP_CHECKS), "_examples": [None] * len(GAP_CHECKS)}
    for org in orgs:
        root = roots[org]
        result = extract_org(root, org)
        failures.extend(_summarise(result, args))
        if args.prove_gaps:
            _count_gaps(result, tally)
        if args.json:
            out_dir.mkdir(parents=True, exist_ok=True)
            out_path = out_dir / f"phase2-{org}.json"
            out_path.write_text(json.dumps(result.as_dict(), indent=1) + "\n",
                                encoding="utf-8")
            print(f"\n  wrote {out_path}")
        print()

    if args.prove_gaps:
        failures.extend(_report_gaps(tally, orgs))
        print()

    if failures:
        print("FAILED:")
        for line in failures:
            print(f"  {line}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

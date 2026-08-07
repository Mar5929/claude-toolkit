"""reports.py — WI-007 phase 5: the coverage report and the unresolved report.

Phase 4 produced the finished edges. This module turns them into the two reports
SPEC requirement 1 and the plan ask for, plus one short readable summary:

    coverage-<org>.json    every file on disk, its metadata type, how many edges
                           it produced, and when that count is zero, the reason
    unresolved-<org>.json  every reference string that resolved to nothing, with
                           its reason, the rule that decided, and who asked for it
    reports-<org>.md       about 150 lines of the same two reports, for reading

Nothing is re-parsed and nothing is re-resolved here.

**The edge counts are counted again from the finished edges, not copied.** Phase 2
already records a reference count per file on its `FileOutcome`. Copying that
number would make the coverage report a restatement of phase 2 rather than a check
on it. Counting the finished edges by the file each one names in its evidence, and
then asserting the two agree file by file, is what makes the report evidence that
nothing was lost between phase 2 and phase 4 rather than an assertion that it was
not.

**A file that produced no edge must say why, and the report is where that is
checkable.** SPEC requirement 1 is "no silent skips": every one of the 14,198
files is listed, whether it was opened or not. `reasons_for_no_edge` groups the
stated reasons so a new silent gap shows up as a row rather than as an absence.

**The unresolved report is built from the edges, then checked against the reverse
index.** The reverse index's `by_unresolved_reference` section already files every
unresolved edge under the string it holds, but its entries carry only the edge, its
source and the relationship, not the reason. Building from the edges instead picks
up the reason, the rule and the plain-sentence detail, and comparing the result
against the index afterwards is a real check rather than a copy.

Local files only. Nothing here contacts a Salesforce org.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from edge_list import SCHEMA_VERSION, component_type
from resolver import RESOLUTIONS, RESOLVED

# Reasons are shown in this order wherever a breakdown is printed, so the most
# common cause of an unresolved reference is never buried under a rarer one.
UNRESOLVED_VALUES = tuple(value for value in RESOLUTIONS if value != RESOLVED)

# How many of the most common unresolved strings the readable summary lists. The
# JSON report carries every one of them; this is a reading length, not a cap on
# the data.
MARKDOWN_TOP_STRINGS = 25

COVERAGE_NOTES = [
    "Every file the registry found under this org is listed here exactly once, "
    "whether it was opened or not. SPEC requirement 1: no silent skips.",
    "`edges` is counted from the finished edge list, by the file each edge names "
    "in its evidence, not copied from the extractor's own tally. The two are "
    "compared file by file in the acceptance checks.",
    "`reason` is required on any file that produced no edge, and says why. A file "
    "that could not be read or parsed carries `error` instead.",
    "`opened` false means the file was never read: a static resource, a "
    "translation, an image or a binary. The reason says which.",
    "There is no build timestamp in this file on purpose: two builds of the same "
    "snapshot are byte-identical. The file system records when it was written.",
]

UNRESOLVED_NOTES = [
    "One row per reference string, reason and rule. A string that resolved to "
    "nothing in one place and to something in another appears here only for the "
    "places it did not resolve.",
    "Nothing here is a defect on its own. Most of these are references the "
    "snapshot genuinely cannot answer: a managed package's internals, a standard "
    "field the platform owns and never writes a file for, or an object that was "
    "not retrieved.",
    "`sources` names the components that hold the string and how many edges each "
    "one contributes, so a string can be traced back to who asked for it. The "
    "reverse index holds the individual edge ids under the same string.",
    "`unresolved_unknown` is the reason of last resort. A row carrying it is the "
    "one kind here worth investigating, because it means no rule recognised the "
    "string at all.",
]


def _sorted_counts(counts: dict, key=None):
    """Rows most-first, ties broken by name so two builds agree."""
    return sorted(counts.items(), key=key or (lambda kv: (-kv[1], kv[0])))


# ---------------------------------------------------------------------------
# Coverage
# ---------------------------------------------------------------------------

@dataclass
class Coverage:
    """Every file in one org and what came out of it."""

    org: str
    root: str = ""
    files: list = field(default_factory=list)          # dicts, sorted by path
    by_metadata_type: list = field(default_factory=list)
    reasons: list = field(default_factory=list)
    silent_types: list = field(default_factory=list)
    counts: dict = field(default_factory=dict)

    def document(self) -> dict:
        return {
            "schema_version": SCHEMA_VERSION,
            "org": self.org,
            "generated_from": self.root,
            "notes": list(COVERAGE_NOTES),
            "counts": self.counts,
            "by_metadata_type": self.by_metadata_type,
            "reasons_for_no_edge": self.reasons,
            "metadata_types_producing_no_edge": self.silent_types,
            "files": self.files,
        }


def build_coverage(extraction, edge_list) -> Coverage:
    """One row per file, with its edge count taken from the finished edges."""
    # Edges grouped by the file their evidence names, plus the resolved split.
    per_file: dict = {}
    for edge in edge_list.edges:
        path = edge["evidence"]["file_path"]
        bucket = per_file.setdefault(path, {"edges": 0, "resolved": 0,
                                            "unresolved": 0})
        bucket["edges"] += 1
        if edge["resolution"] == RESOLVED:
            bucket["resolved"] += 1
        else:
            bucket["unresolved"] += 1

    rows = []
    by_type: dict = {}
    reasons: dict = {}
    for outcome in extraction.outcomes:
        found = per_file.get(outcome.file_path, {"edges": 0, "resolved": 0,
                                                 "unresolved": 0})
        row = {
            "file_path": outcome.file_path,
            "metadata_type": outcome.metadata_type,
            "role": outcome.role,
            "opened": outcome.opened,
            "extractor": outcome.extractor,
            "components": outcome.component_count,
            "edges": found["edges"],
            "resolved": found["resolved"],
            "unresolved": found["unresolved"],
        }
        if outcome.reason:
            row["reason"] = outcome.reason
        if outcome.error:
            row["error"] = outcome.error
        rows.append(row)

        bucket = by_type.setdefault(outcome.metadata_type, {
            "metadata_type": outcome.metadata_type, "files": 0,
            "files_opened": 0, "files_with_no_edge": 0, "components": 0,
            "edges": 0, "resolved": 0, "unresolved": 0,
        })
        bucket["files"] += 1
        bucket["files_opened"] += 1 if outcome.opened else 0
        bucket["components"] += outcome.component_count
        bucket["edges"] += found["edges"]
        bucket["resolved"] += found["resolved"]
        bucket["unresolved"] += found["unresolved"]
        if found["edges"] == 0:
            bucket["files_with_no_edge"] += 1
            said = outcome.reason or outcome.error or "(no reason given)"
            entry = reasons.setdefault(said, {"reason": said, "files": 0,
                                              "metadata_types": set()})
            entry["files"] += 1
            entry["metadata_types"].add(outcome.metadata_type)

    rows.sort(key=lambda row: row["file_path"])

    type_rows = sorted(by_type.values(),
                       key=lambda r: (-r["edges"], -r["files"],
                                      r["metadata_type"]))
    reason_rows = [
        {"reason": entry["reason"], "files": entry["files"],
         "metadata_types": sorted(entry["metadata_types"])}
        for entry in sorted(reasons.values(),
                            key=lambda e: (-e["files"], e["reason"]))
    ]

    # The types where every single file produced nothing. Phase 2 states a reason
    # per file; this collects them per type so "this whole type points at nothing"
    # is one visible, checkable row instead of hundreds of identical ones.
    silent = []
    for row in sorted(type_rows, key=lambda r: (-r["files"], r["metadata_type"])):
        if row["edges"] or not row["files"]:
            continue
        said: dict = {}
        for outcome in extraction.outcomes:
            if outcome.metadata_type != row["metadata_type"]:
                continue
            text = outcome.reason or outcome.error or "(no reason given)"
            said[text] = said.get(text, 0) + 1
        top, count = max(said.items(), key=lambda kv: (kv[1], kv[0]))
        silent.append({
            "metadata_type": row["metadata_type"],
            "files": row["files"],
            "most_common_reason": top,
            "files_giving_that_reason": count,
            "other_reasons": len(said) - 1,
        })

    counts = {
        "files": len(rows),
        "files_opened": sum(1 for r in rows if r["opened"]),
        "files_not_opened": sum(1 for r in rows if not r["opened"]),
        "files_producing_edges": sum(1 for r in rows if r["edges"]),
        "files_producing_no_edge": sum(1 for r in rows if not r["edges"]),
        "files_with_an_error": sum(1 for r in rows if r.get("error")),
        "components": len(edge_list.components),
        "edges": len(edge_list.edges),
        "resolved": sum(r["resolved"] for r in rows),
        "unresolved": sum(r["unresolved"] for r in rows),
        "metadata_types": len(type_rows),
        "metadata_types_producing_edges": sum(1 for r in type_rows if r["edges"]),
    }

    return Coverage(org=edge_list.org, root=edge_list.root, files=rows,
                    by_metadata_type=type_rows, reasons=reason_rows,
                    silent_types=silent, counts=counts)


# ---------------------------------------------------------------------------
# Unresolved references
# ---------------------------------------------------------------------------

@dataclass
class Unresolved:
    """Every reference string in one org that resolved to nothing."""

    org: str
    root: str = ""
    references: list = field(default_factory=list)     # dicts, sorted
    by_reason: list = field(default_factory=list)
    by_rule: list = field(default_factory=list)
    by_namespace: list = field(default_factory=list)
    by_source_type: list = field(default_factory=list)
    by_expected_type: list = field(default_factory=list)
    counts: dict = field(default_factory=dict)

    def document(self) -> dict:
        return {
            "schema_version": SCHEMA_VERSION,
            "org": self.org,
            "generated_from": self.root,
            "notes": list(UNRESOLVED_NOTES),
            "counts": self.counts,
            "by_reason": self.by_reason,
            "by_rule": self.by_rule,
            "by_managed_package": self.by_namespace,
            "by_source_metadata_type": self.by_source_type,
            "by_expected_target_type": self.by_expected_type,
            "references": self.references,
        }


def build_unresolved(edge_list) -> Unresolved:
    """Group every edge that resolved to nothing by its string, reason and rule."""
    grouped: dict = {}
    by_reason: dict = {}
    by_rule: dict = {}
    by_namespace: dict = {}
    by_source_type: dict = {}
    by_expected: dict = {}
    strings_by_reason: dict = {}
    strings_by_namespace: dict = {}
    strings_by_source: dict = {}
    strings_by_expected: dict = {}
    total = 0

    for edge in edge_list.edges:
        resolution = edge["resolution"]
        if resolution == RESOLVED:
            continue
        total += 1
        raw = edge["evidence"]["raw_reference"]
        rule = edge.get("resolved_by", "")
        key = (raw, resolution, rule)
        row = grouped.get(key)
        if row is None:
            row = grouped[key] = {
                "raw_reference": raw,
                "resolution": resolution,
                "resolved_by": rule,
                "resolution_detail": edge.get("resolution_detail", ""),
                "edges": 0,
                "_details": {},
                "_sources": {},
                "_expected": {},
                "_namespace": edge.get("namespace", ""),
            }
        row["edges"] += 1
        detail = edge.get("resolution_detail", "")
        row["_details"][detail] = row["_details"].get(detail, 0) + 1
        source_type = component_type(edge["source"])
        pair = (edge["source"], edge["relationship"])
        row["_sources"][pair] = row["_sources"].get(pair, 0) + 1
        expected = edge.get("target_type", "")
        row["_expected"][expected] = row["_expected"].get(expected, 0) + 1

        by_reason[resolution] = by_reason.get(resolution, 0) + 1
        strings_by_reason.setdefault(resolution, set()).add(raw)
        rule_key = (resolution, rule)
        by_rule[rule_key] = by_rule.get(rule_key, 0) + 1
        namespace = edge.get("namespace", "")
        if namespace:
            by_namespace[namespace] = by_namespace.get(namespace, 0) + 1
            strings_by_namespace.setdefault(namespace, set()).add(raw)
        by_source_type[source_type] = by_source_type.get(source_type, 0) + 1
        strings_by_source.setdefault(source_type, set()).add(raw)
        hint = expected or "(no hint)"
        by_expected[hint] = by_expected.get(hint, 0) + 1
        strings_by_expected.setdefault(hint, set()).add(raw)

    rows = []
    rule_detail: dict = {}
    for key, row in grouped.items():
        details = row.pop("_details")
        sources = row.pop("_sources")
        expected = row.pop("_expected")
        namespace = row.pop("_namespace")
        # The detail sentence names the object and field it is about, so a string
        # met in two places can carry two sentences. Report the most common and
        # say how many others there were rather than pretending there is one.
        top_detail, _ = max(details.items(), key=lambda kv: (kv[1], kv[0]))
        row["resolution_detail"] = top_detail
        if len(details) > 1:
            row["other_resolution_details"] = len(details) - 1
        if namespace:
            row["namespace"] = namespace
        top_expected, _ = max(expected.items(), key=lambda kv: (kv[1], kv[0]))
        if top_expected:
            row["expected_target_type"] = top_expected
        row["source_components"] = len({source for source, _ in sources})
        row["sources"] = [
            {"source": source, "relationship": relationship, "edges": count}
            for (source, relationship), count in sorted(
                sources.items(), key=lambda kv: (-kv[1], kv[0]))
        ]
        rows.append(row)
        rule_detail.setdefault(key[1:], top_detail)

    rows.sort(key=lambda r: (-r["edges"], r["raw_reference"], r["resolution"],
                             r["resolved_by"]))

    counts = {
        "unresolved_edges": total,
        "distinct_reference_strings": len({r["raw_reference"] for r in rows}),
        "rows": len(rows),
    }
    for value in UNRESOLVED_VALUES:
        counts[value] = by_reason.get(value, 0)

    return Unresolved(
        org=edge_list.org,
        root=edge_list.root,
        references=rows,
        by_reason=[
            {"resolution": value, "edges": by_reason.get(value, 0),
             "reference_strings": len(strings_by_reason.get(value, ()))}
            for value in UNRESOLVED_VALUES
        ],
        by_rule=[
            {"resolution": resolution, "resolved_by": rule or "(none)",
             "edges": count,
             "example_detail": rule_detail.get((resolution, rule), "")}
            for (resolution, rule), count in _sorted_counts(
                by_rule, key=lambda kv: (-kv[1], kv[0]))
        ],
        by_namespace=[
            {"namespace": name, "edges": count,
             "reference_strings": len(strings_by_namespace.get(name, ()))}
            for name, count in _sorted_counts(by_namespace)
        ],
        by_source_type=[
            {"metadata_type": name, "edges": count,
             "reference_strings": len(strings_by_source.get(name, ()))}
            for name, count in _sorted_counts(by_source_type)
        ],
        by_expected_type=[
            {"target_type": name, "edges": count,
             "reference_strings": len(strings_by_expected.get(name, ()))}
            for name, count in _sorted_counts(by_expected)
        ],
        counts=counts,
    )


# ---------------------------------------------------------------------------
# The readable summary
# ---------------------------------------------------------------------------

def _n(value) -> str:
    return f"{value:,}"


def markdown_summary(coverage, unresolved) -> str:
    """The short readable version of both reports, as Markdown."""
    org = coverage.org
    c = coverage.counts
    u = unresolved.counts
    out = []
    w = out.append

    w(f"# Coverage and unresolved references: {org}")
    w("")
    w(f"Built from `{coverage.root}`. Every file under that tree is accounted "
      "for: it either produced edges, or it produced none and said why.")
    w("")
    w("This file is the readable version. The complete data, one row per file "
      f"and one row per reference string, is in `coverage-{org}.json` and "
      f"`unresolved-{org}.json` beside it.")
    w("")

    w("## What came out of the snapshot")
    w("")
    w("| | Count |")
    w("| --- | ---: |")
    for label, key in (
        ("Files on disk", "files"),
        ("Files opened and read", "files_opened"),
        ("Files not opened, with a stated reason", "files_not_opened"),
        ("Files that produced at least one edge", "files_producing_edges"),
        ("Files that produced no edge, with a stated reason",
         "files_producing_no_edge"),
        ("Files that would not read or parse", "files_with_an_error"),
        ("Components", "components"),
        ("Edges", "edges"),
        ("Edges that resolved to a component", "resolved"),
        ("Edges that resolved to nothing", "unresolved"),
        ("Metadata types present", "metadata_types"),
        ("Metadata types producing at least one edge",
         "metadata_types_producing_edges"),
    ):
        w(f"| {label} | {_n(c[key])} |")
    w("")

    w("## Every metadata type, and what it produced")
    w("")
    w("| Files | Edges | Resolved | Files with no edge | Type |")
    w("| ---: | ---: | ---: | ---: | --- |")
    for row in coverage.by_metadata_type:
        w(f"| {_n(row['files'])} | {_n(row['edges'])} | {_n(row['resolved'])} "
          f"| {_n(row['files_with_no_edge'])} | {row['metadata_type']} |")
    w("")

    w(f"## Why {_n(c['files_producing_no_edge'])} files produced no edge")
    w("")
    if coverage.reasons:
        w("| Files | Reason | Types |")
        w("| ---: | --- | --- |")
        for row in coverage.reasons:
            types = ", ".join(row["metadata_types"][:4])
            if len(row["metadata_types"]) > 4:
                types += f" (+{len(row['metadata_types']) - 4} more)"
            w(f"| {_n(row['files'])} | {row['reason']} | {types} |")
    else:
        w("Every file produced at least one edge.")
    w("")

    w(f"## The {len(coverage.silent_types)} metadata types where no file "
      "produced an edge")
    w("")
    if coverage.silent_types:
        w("Each of these is silent on purpose, and every file of it says so. "
          "A type appearing here with the reason `(no reason given)` is the one "
          "thing this section is meant to catch.")
        w("")
        w("| Files | Type | What most of them said |")
        w("| ---: | --- | --- |")
        for row in coverage.silent_types:
            extra = (f" (+{row['other_reasons']} other reasons)"
                     if row["other_reasons"] else "")
            w(f"| {_n(row['files'])} | {row['metadata_type']} | "
              f"{row['most_common_reason']}{extra} |")
    else:
        w("Every metadata type present produced at least one edge.")
    w("")

    w("## References that resolved to nothing")
    w("")
    w(f"{_n(u['unresolved_edges'])} edges hold a name that matches no component "
      f"in this snapshot, across {_n(u['distinct_reference_strings'])} different "
      "names.")
    w("")
    w("| Edges | Names | Reason |")
    w("| ---: | ---: | --- |")
    for row in unresolved.by_reason:
        w(f"| {_n(row['edges'])} | {_n(row['reference_strings'])} | "
          f"`{row['resolution']}` |")
    w("")

    if unresolved.by_namespace:
        w("### Managed packages met")
        w("")
        w("| Edges | Names | Namespace |")
        w("| ---: | ---: | --- |")
        for row in unresolved.by_namespace:
            w(f"| {_n(row['edges'])} | {_n(row['reference_strings'])} | "
              f"`{row['namespace']}` |")
        w("")

    w("### Which kinds of file are asking for something that is not there")
    w("")
    w("| Edges | Names | Type |")
    w("| ---: | ---: | --- |")
    for row in unresolved.by_source_type[:15]:
        w(f"| {_n(row['edges'])} | {_n(row['reference_strings'])} | "
          f"{row['metadata_type']} |")
    w("")

    w(f"### The {MARKDOWN_TOP_STRINGS} names held by the most edges")
    w("")
    w("| Edges | Name | Reason | What the resolver said |")
    w("| ---: | --- | --- | --- |")
    for row in unresolved.references[:MARKDOWN_TOP_STRINGS]:
        w(f"| {_n(row['edges'])} | `{row['raw_reference']}` | "
          f"`{row['resolution']}` | {row['resolution_detail']} |")
    w("")

    w("## Where the full data is")
    w("")
    w("| File | What it holds |")
    w("| --- | --- |")
    w(f"| `coverage-{org}.json` | Every one of the {_n(c['files'])} files, its "
      "type, its edge count, and the reason when that count is zero. |")
    w(f"| `unresolved-{org}.json` | Every one of the "
      f"{_n(u['rows'])} name-and-reason rows, with the components that hold each "
      "name. |")
    w(f"| `edges-{org}.json` | Every component and every edge, with the file and "
      "element each edge came from. |")
    w(f"| `reverse-index-{org}.json` | What points AT each component, and the "
      "individual edge ids under each unresolved name. |")
    w("")
    w("None of these is committed to git. Rebuild them with "
      "`python tools/kb/build_edges.py --org " + org + "`.")
    w("")
    return "\n".join(out)


# ---------------------------------------------------------------------------
# Writing
# ---------------------------------------------------------------------------

def write_reports(coverage, unresolved, out_dir) -> dict:
    """Write both JSON reports and the readable summary. Returns {name: path}."""
    from pathlib import Path

    from edge_list import dump

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    org = coverage.org
    coverage_path = out_dir / f"coverage-{org}.json"
    unresolved_path = out_dir / f"unresolved-{org}.json"
    markdown_path = out_dir / f"reports-{org}.md"

    with coverage_path.open("w", encoding="utf-8", newline="\n") as handle:
        dump(handle, coverage.document(), per_line=("files", "by_metadata_type"))
    with unresolved_path.open("w", encoding="utf-8", newline="\n") as handle:
        dump(handle, unresolved.document(), per_line=("references",))
    markdown_path.write_text(markdown_summary(coverage, unresolved),
                             encoding="utf-8", newline="\n")

    return {"coverage": coverage_path, "unresolved": unresolved_path,
            "summary": markdown_path}


# ---------------------------------------------------------------------------
# Acceptance
# ---------------------------------------------------------------------------

def acceptance(coverage, unresolved, extraction, edge_list) -> list:
    """The phase 5 checks. Returns a list of (passed, sentence) pairs."""
    checks = []

    expected = len(extraction.outcomes)
    got = len(coverage.files)
    checks.append((
        expected == got,
        f"every one of the {expected} files the registry found has exactly one "
        "row in the coverage report" if expected == got else
        f"{expected} files went in but the coverage report has {got} rows",
    ))

    paths = [row["file_path"] for row in coverage.files]
    checks.append((
        len(set(paths)) == len(paths),
        "no file is listed twice" if len(set(paths)) == len(paths) else
        f"{len(paths) - len(set(paths))} files are listed more than once",
    ))

    # SPEC requirement 1: no silent skips.
    silent = [row for row in coverage.files
              if not row["edges"] and not row.get("reason")
              and not row.get("error")]
    checks.append((
        not silent,
        f"all {sum(1 for r in coverage.files if not r['edges'])} files that "
        "produced no edge say why" if not silent else
        f"{len(silent)} files produced no edge and gave no reason, the first "
        f"being {silent[0]['file_path']}",
    ))

    counted = sum(row["edges"] for row in coverage.files)
    checks.append((
        counted == len(edge_list.edges),
        f"the coverage report's per-file edge counts add up to all "
        f"{len(edge_list.edges)} edges" if counted == len(edge_list.edges) else
        f"the coverage report accounts for {counted} edges but there are "
        f"{len(edge_list.edges)}",
    ))

    listed = set(paths)
    orphan = {edge["evidence"]["file_path"] for edge in edge_list.edges} - listed
    checks.append((
        not orphan,
        "every edge was read out of a file the coverage report lists"
        if not orphan else
        f"{len(orphan)} edges come from a file the coverage report does not "
        f"list, the first being {sorted(orphan)[0]}",
    ))

    # The independent count against phase 2's own tally, file by file. This is
    # the check that makes the report evidence rather than a restatement.
    own = {o.file_path: o.reference_count for o in extraction.outcomes}
    disagree = [row["file_path"] for row in coverage.files
                if own.get(row["file_path"], 0) != row["edges"]]
    checks.append((
        not disagree,
        "counting the finished edges per file agrees with the extractor's own "
        "tally for every file" if not disagree else
        f"{len(disagree)} files disagree between the extractor's tally and the "
        f"finished edges, the first being {disagree[0]}",
    ))

    type_rows = {row["metadata_type"] for row in coverage.by_metadata_type}
    present = {o.metadata_type for o in extraction.outcomes}
    missing_types = present - type_rows
    checks.append((
        not missing_types,
        f"all {len(present)} metadata types present have a row in the by-type "
        "table" if not missing_types else
        f"{len(missing_types)} metadata types are missing from the by-type "
        f"table: {sorted(missing_types)[:5]}",
    ))

    unresolved_edges = sum(1 for e in edge_list.edges
                           if e["resolution"] != RESOLVED)
    reported = sum(row["edges"] for row in unresolved.references)
    checks.append((
        reported == unresolved_edges,
        f"all {unresolved_edges} edges that resolved to nothing are in the "
        "unresolved report, each counted once" if reported == unresolved_edges
        else f"{unresolved_edges} edges resolved to nothing but the report "
        f"accounts for {reported}",
    ))

    bad = [row for row in unresolved.references
           if row["resolution"] not in UNRESOLVED_VALUES]
    checks.append((
        not bad,
        "every row in the unresolved report carries one of the four unresolved "
        "reasons" if not bad else
        f"{len(bad)} rows carry a reason that is not one of the four",
    ))

    # Cross-check against phase 4's reverse index, which files the same edges
    # under the same strings by a different route.
    index_strings = set(edge_list.by_unresolved_reference)
    report_strings = {row["raw_reference"] for row in unresolved.references}
    checks.append((
        index_strings == report_strings,
        f"the {len(report_strings)} names in the unresolved report are exactly "
        "the names the reverse index files unresolved edges under"
        if index_strings == report_strings else
        f"{len(index_strings ^ report_strings)} names differ between the "
        "unresolved report and the reverse index",
    ))

    per_string: dict = {}
    for row in unresolved.references:
        per_string[row["raw_reference"]] = (
            per_string.get(row["raw_reference"], 0) + row["edges"])
    mismatched = [name for name, entries
                  in edge_list.by_unresolved_reference.items()
                  if len(entries) != per_string.get(name, 0)]
    checks.append((
        not mismatched,
        "every name carries the same edge count in the unresolved report and in "
        "the reverse index" if not mismatched else
        f"{len(mismatched)} names have a different edge count in the two, the "
        f"first being {mismatched[0]}",
    ))

    ordered = paths == sorted(paths)
    checks.append((
        ordered,
        "the coverage report is sorted by file path, so it does not depend on "
        "the order the files were walked" if ordered else
        "the coverage report is not in sorted order",
    ))

    keys = [(-row["edges"], row["raw_reference"], row["resolution"],
             row["resolved_by"]) for row in unresolved.references]
    checks.append((
        keys == sorted(keys),
        "the unresolved report is sorted, most edges first, so two builds write "
        "the same bytes" if keys == sorted(keys) else
        "the unresolved report is not in sorted order",
    ))

    return checks

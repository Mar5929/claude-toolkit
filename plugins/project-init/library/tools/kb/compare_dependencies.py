"""Compare the local edge list against what the org itself reports.

    python tools/kb/compare_dependencies.py --org <name>

Reads three things already on disk and contacts no org:

    tools/kb/out/edges-<org>.json     what the metadata files say. Rebuilt on
                                      demand by build_edges.py; gitignored.
    org-knowledge/dependency-crosscheck/org-dependencies-<org>.json
                                      what the org itself says. Committed,
                                      because re-asking costs 20 minutes of
                                      queries against a production org.
    org-knowledge/dependency-crosscheck/org-catalog-<org>.json
                                      how to read the org's names. Committed
                                      for the same reason.

Writes `crosscheck-<org>.json` and `crosscheck-<org>.md` into that same
committed folder. The Markdown one is the report the SPEC says Mike reads.

## What is being compared, exactly

**Pairs of components, not edges.** The local files hold one edge per place a
reference appears, so a flow filtering on `Case.Subject` in thirteen conditions
produces thirteen edges. The org reports that a flow depends on a field once.
Counting edges against rows would make the local side look thirteen times
larger for no reason, so both sides are reduced to the set of distinct
(source component, target component) pairs first.

**One direction, the same one on both sides.** A local edge points from the
component holding the reference to the component named. A dependency row points
from `MetadataComponent` to `RefMetadataComponent`, which is the same way round.

## The four answers a row can get, and why the last two matter

    both        the pair is in the local files and in the org's answer
    local only  the local files found it and the org did not report it
    org only    the org reported it and the local files did not find it
    unmapped    the row could not be turned into a pair of local component ids

Requirement 7 says the API is a cross-check, not the truth, so a difference is
a signal to look rather than a defect. Two of these four are not differences at
all and must never be counted as one:

- **Unmapped** means the comparison could not read the row, not that anybody
  disagreed. A field id whose object was never looked up, a component type with
  no local equivalent, a name that could belong to any of eight components.
  Every unmapped row is reported with its reason, the same way phases 3 and 5
  report a reference that resolved to nothing.
- **A pair naming a component the snapshot does not contain** is reported apart
  from the rest of "org only". The local files could not have produced that
  edge whatever the parser did, because the component is not in them. That is a
  fact about the retrieve, not about the reader.

## Why the report is per category and never one percentage

The SPEC expects the API to be reliable for some kinds of connection and silent
for others. One overall number would average a category the API covers well
with one it does not report at all, and hide both. So every count below is
given per (source type, target type), and a category where the org returned no
rows whatsoever is called out as "the API does not report this" rather than
counted as thousands of disagreements.

## What neither side can fix

The snapshots were retrieved on 2026-07-31 and the orgs are live. A component
added, renamed or deleted since then is a real difference between the two sides
that says nothing about either one's accuracy.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import graph  # noqa: E402
import org_catalog  # noqa: E402
from org_api import ORG_ANSWERS, read_rows, refused_types  # noqa: E402

ANSWERS_DIR = ORG_ANSWERS

# Salesforce fixes these id prefixes, so an id says what kind of record it is
# without asking the org.
OBJECT_PREFIX = "01I"
FIELD_PREFIX = "00N"

# Every lookup that turns a record id into "which object, and what is it
# called". The API gives the bare name for all of these and the local files
# name them `Object.Thing`, so the id is the only way across.
BY_PREFIX = (
    ("00h", "layouts", "Layout", "-"),
    ("03d", "validation_rules", "ValidationRule", "."),
    ("09D", "quick_actions", "QuickAction", "."),
    ("01W", "workflow_alerts", "WorkflowAlert", "."),
    ("00b", "web_links", "WebLink", "."),
    ("00B", "list_views", "ListView", "."),
    ("0IX", "field_sets", "FieldSet", "."),
)

# The API's name for a type against the local files' name for the same thing.
# Only the two real disagreements are listed; every other type is spelled the
# same way on both sides.
TYPE_ALIASES = {
    # The local files call every object CustomObject, standard or not, because
    # that is the metadata type name for both.
    "StandardEntity": "CustomObject",
    "CustomEntityDefinition": "CustomObject",
}

# There is deliberately NO hardcoded list of "types no snapshot contains".
#
# An earlier version of this file had one, naming EmailTemplate, Report,
# Dashboard, AuraDefinitionBundle and others. Two entries in it were simply
# wrong: Blue's snapshot does hold Aura bundles and Red's does hold dashboards,
# so the list would have thrown away real matches in one org while being right
# about the other. Whether a snapshot holds a type is a question the snapshot
# itself answers, per org, so the mapper asks it instead of being told.


def local_type_for(api_type: str) -> str:
    """The local metadata type name for one of the API's type names.

    Used in two places that must never disagree: mapping a row onto a component
    id, and deciding whether the org reports a category at all. A custom
    metadata record shows the reason both need the same rule. The API types its
    rows by the object itself, `MarketCMDT__mdt`, and the local files call every
    one of them `CustomMetadata`. Translating in one place and not the other
    would have the report saying the org never mentions custom metadata records
    while its own rows sit in the agreed pile.
    """
    if api_type in TYPE_ALIASES:
        return TYPE_ALIASES[api_type]
    if api_type.endswith("__mdt"):
        return "CustomMetadata"
    return api_type


def suffixed(name: str) -> list[str]:
    """The api names a custom component's developer name could spell.

    The API drops the suffix: `Implementation` for `Implementation__c`. Which
    suffix it was cannot be told from the name, so every one a custom object can
    carry is offered and the first that matches a real local component wins.
    """
    return [name, f"{name}__c", f"{name}__mdt", f"{name}__e", f"{name}__b",
            f"{name}__x", f"{name}__kav", f"{name}__Share", f"{name}__History"]


class Mapper:
    """Turns one end of a dependency row into a local component id."""

    def __init__(self, org: str, catalog: dict, components: dict):
        self.org = org
        self.catalog = catalog
        self.components = components
        # Every local api name that exists, per type, for the suffix guess.
        self.by_type: dict[str, set] = defaultdict(set)
        for comp in components.values():
            self.by_type[comp["type"]].add(comp["api_name"])
        self.reasons: dict[str, int] = defaultdict(int)

    def local_id(self, api_name: str, local_type: str) -> str:
        return f"{self.org}:{local_type}:{api_name}"

    def map_end(self, record_id: str, name: str, api_type: str,
                namespace: str) -> tuple[str, str]:
        """Return (component id, "") or ("", reason it could not be mapped)."""
        if namespace:
            return "", (f"belongs to the managed package namespace {namespace}, "
                        "whose contents are not in this snapshot")

        local_type = local_type_for(api_type)
        short = org_catalog.short_id(record_id or "")

        # The id-backed lookups first: they are exact, and every one of these
        # types is named `Object.Thing` locally while the API gives `Thing`.
        if record_id.startswith(FIELD_PREFIX):
            pair = self.catalog["fields"].get(short)
            if not pair:
                return "", ("this field's object was never looked up, so the field "
                            "cannot be named. FieldDefinition will not answer without "
                            "a filter naming one object, so only objects the snapshot "
                            "holds or the rows mention were asked for")
            return self.local_id(f"{pair[0]}.{pair[1]}", "CustomField"), ""

        # The loop variables are named apart from `local_type` on purpose: a
        # Python for-loop variable outlives its loop, so reusing the name here
        # would leave every later branch thinking the row was the last type in
        # the table rather than its own.
        for prefix, catalog_key, prefix_type, joiner in BY_PREFIX:
            if not record_id.startswith(prefix):
                continue
            pair = self.catalog.get(catalog_key, {}).get(short)
            if pair:
                return self.local_id(f"{pair[0]}{joiner}{pair[1]}", prefix_type), ""
            return "", (f"this {prefix_type} is not in the org's own list of them, so "
                        "the object it belongs to is unknown and the local files "
                        f"name every {prefix_type} by its object")

        # Flows and Lightning pages carry no object, so they are one name
        # rather than two, but they still have to be matched by id: a
        # dependency row calls a flow by its label and version number and the
        # file calls it by its api name.
        for prefix, catalog_key, single_type in (("301", "flows", "Flow"),
                                                 ("300", "flows", "Flow"),
                                                 ("0M0", "flexipages", "FlexiPage")):
            if not record_id.startswith(prefix):
                continue
            api_name = self.catalog.get(catalog_key, {}).get(short)
            if api_name:
                return self.local_id(api_name, single_type), ""
            return "", (f"this {single_type} is not in the org's own list of them")

        if record_id.startswith(OBJECT_PREFIX):
            object_name = self.catalog["objects"].get(short)
            if object_name:
                return self.local_id(object_name, "CustomObject"), ""
            return "", ("this object's api name was never looked up, so the "
                        "`__c` suffix the API drops cannot be put back exactly")

        # A standard object carries its own api name as its id, so no lookup is
        # needed and the local files call it a CustomObject like every object.
        if api_type == "StandardEntity":
            return self.local_id(name or record_id, "CustomObject"), ""

        # A custom metadata record's type IS its object: the API reports the row
        # `MarketCMDT__mdt` / `Central_Coast_CA`, and the local files call the
        # same record `MarketCMDT.Central_Coast_CA`.
        if api_type.endswith("__mdt"):
            return self.local_id(f"{api_type[:-len('__mdt')]}.{name}",
                                 "CustomMetadata"), ""

        # Some rows name the entity itself rather than one of its records: the
        # id and the name are both the literal word `RecordType` or `Profile`.
        # There is no component to match, and treating it as a missing one
        # would invent a disagreement.
        if record_id == api_type == name:
            return "", (f"the row names the {api_type} entity itself rather than any "
                        f"one {api_type}, so there is no component to match it to")

        # Everything else is matched on its name. A custom component's suffix
        # is missing, so each possible spelling is tried against the components
        # the snapshot really holds and the first hit wins.
        known = self.by_type.get(local_type, set())
        for candidate in suffixed(name):
            if candidate in known:
                return self.local_id(candidate, local_type), ""

        if not known:
            return "", (f"no component of type {local_type} exists in this snapshot at "
                        "all, so a row naming one cannot match and is not a disagreement")
        # The reason deliberately does NOT hold the name. Putting it in makes a
        # separate reason per name, which turned Blue's report into 400-odd rows
        # saying the same thing. The names go in the examples instead.
        return "", (f"this snapshot holds no {local_type} with the name the org gave, "
                    "under any suffix the API could have dropped. Usually a component "
                    "the platform supplies or a package owns, which a retrieve never "
                    "writes a file for")


def api_pairs(rows: list[dict], mapper: Mapper) -> tuple[dict, list]:
    """{(source id, target id): sample row} plus every row that would not map."""
    pairs: dict[tuple[str, str], dict] = {}
    unmapped: list[dict] = []
    for row in rows:
        source, source_why = mapper.map_end(
            row.get("MetadataComponentId") or "",
            row.get("MetadataComponentName") or "",
            row.get("MetadataComponentType") or "",
            row.get("MetadataComponentNamespace") or "")
        target, target_why = mapper.map_end(
            row.get("RefMetadataComponentId") or "",
            row.get("RefMetadataComponentName") or "",
            row.get("RefMetadataComponentType") or "",
            row.get("RefMetadataComponentNamespace") or "")
        if not source or not target:
            unmapped.append({
                "source_type": row.get("MetadataComponentType") or "",
                "source_name": row.get("MetadataComponentName") or "",
                "target_type": row.get("RefMetadataComponentType") or "",
                "target_name": row.get("RefMetadataComponentName") or "",
                "end": "source" if not source else "target",
                "reason": source_why or target_why,
            })
            continue
        pairs.setdefault((source, target), row)
    return pairs, unmapped


def local_pairs(org: str) -> tuple[dict, int]:
    """{(source, target): relationship} for every resolved local edge."""
    pairs: dict[tuple[str, str], str] = {}
    unresolved = 0
    for edge in graph.iter_edges(graph.edges_path(org)):
        target = edge.get("target") or ""
        if not target:
            unresolved += 1
            continue
        pairs.setdefault((edge["source"], target), edge["relationship"])
    return pairs, unresolved


def type_of(component_id: str) -> str:
    parts = component_id.split(":", 2)
    return parts[1] if len(parts) == 3 else "?"


def compare(org: str) -> dict:
    components = graph.load_components(graph.edges_path(org))
    catalog = org_catalog.load(org)
    pull = read_rows(ANSWERS_DIR / f"org-dependencies-{org}.json")
    mapper = Mapper(org, catalog, components)

    from_api, unmapped = api_pairs(pull["rows"], mapper)
    from_files, unresolved_local = local_pairs(org)

    # A pair naming a component the snapshot does not hold is separated out:
    # the local files could not have produced it whatever the reader did.
    api_present: dict = {}
    api_absent_component: dict = {}
    # Which component the snapshot is missing, counted by type. This turns out
    # to be one of the more useful things the cross-check produces: it measures
    # what a retrieve left behind, which nothing on the local side can see.
    missing_by_type: dict[str, set] = defaultdict(set)
    for pair, row in from_api.items():
        if pair[0] in components and pair[1] in components:
            api_present[pair] = row
        else:
            api_absent_component[pair] = row
            for end in pair:
                if end not in components:
                    missing_by_type[type_of(end)].add(end)

    both = set(api_present) & set(from_files)
    api_only = set(api_present) - set(from_files)
    local_only = set(from_files) - set(api_present)

    # Per category, where a category is the pair of component types. That is
    # the level the SPEC's expectations are written at.
    categories: dict[tuple[str, str], dict] = defaultdict(
        lambda: {"both": 0, "local_only": 0, "api_only": 0,
                 "api_names_absent_component": 0})
    for pair in both:
        categories[(type_of(pair[0]), type_of(pair[1]))]["both"] += 1
    for pair in api_only:
        categories[(type_of(pair[0]), type_of(pair[1]))]["api_only"] += 1
    for pair in local_only:
        categories[(type_of(pair[0]), type_of(pair[1]))]["local_only"] += 1
    for pair in api_absent_component:
        categories[(type_of(pair[0]), type_of(pair[1]))][
            "api_names_absent_component"] += 1

    # Which source types the org reported at all. A category the org never
    # returned a single row for is a coverage gap in the API, not a
    # disagreement, and the report has to say which it is.
    api_source_types = {row.get("MetadataComponentType") or "" for row in pull["rows"]}
    api_target_types = {row.get("RefMetadataComponentType") or "" for row in pull["rows"]}
    reported_pairs = {(local_type_for(row.get("MetadataComponentType") or ""),
                       local_type_for(row.get("RefMetadataComponentType") or ""))
                      for row in pull["rows"]}

    rows_out = []
    for (source_type, target_type), counts in sorted(categories.items()):
        total = counts["both"] + counts["local_only"] + counts["api_only"]
        reported = (source_type, target_type) in reported_pairs
        rows_out.append({
            "source_type": source_type,
            "target_type": target_type,
            "both": counts["both"],
            "local_only": counts["local_only"],
            "api_only": counts["api_only"],
            "api_names_a_component_the_snapshot_lacks":
                counts["api_names_absent_component"],
            "pairs": total,
            "api_reports_this_category": reported,
            "verdict": verdict_for(counts, reported),
        })

    unmapped_by_reason: dict[str, dict] = {}
    for entry in unmapped:
        slot = unmapped_by_reason.setdefault(entry["reason"], {
            "reason": entry["reason"], "rows": 0, "distinct_names": set(),
            "component_types": set(), "examples": []})
        slot["rows"] += 1
        end = entry["end"]
        slot["distinct_names"].add(entry[f"{end}_name"])
        slot["component_types"].add(entry[f"{end}_type"])
        if len(slot["examples"]) < 4:
            slot["examples"].append(
                f"{entry['source_type']} {entry['source_name']} -> "
                f"{entry['target_type']} {entry['target_name']}")
    for slot in unmapped_by_reason.values():
        slot["distinct_names"] = len(slot["distinct_names"])
        slot["component_types"] = sorted(slot["component_types"])

    return {
        "schema_version": "1.0",
        "org": org,
        "notes": notes_for(org, pull),
        "counts": {
            "api_rows": len(pull["rows"]),
            "api_pairs": len(from_api),
            "api_pairs_both_ends_in_snapshot": len(api_present),
            "api_pairs_naming_a_component_the_snapshot_lacks":
                len(api_absent_component),
            "api_rows_unmapped": len(unmapped),
            "local_pairs": len(from_files),
            "local_edges_that_resolved_to_nothing": unresolved_local,
            "both": len(both),
            "local_only": len(local_only),
            "api_only": len(api_only),
        },
        "api_source_types": sorted(t for t in api_source_types if t),
        "api_target_types": sorted(t for t in api_target_types if t),
        # The org's own words, not an absence read as a refusal. Asking for one
        # of these types fails outright with "is not a supported type", which is
        # the strongest statement available about what this API does not cover.
        "types_the_api_refuses_to_discuss": refused_types(pull),
        # What the org names that the snapshot does not have. A retrieve leaving
        # a component behind is invisible from the local side alone: there is no
        # gap where a file never arrived.
        "components_the_org_names_that_the_snapshot_lacks": [
            {"type": name,
             "components": len(found),
             "in_the_snapshot": sum(1 for c in components.values()
                                    if c["type"] == name)}
            for name, found in sorted(missing_by_type.items(),
                                      key=lambda item: -len(item[1]))
        ],
        "by_category": rows_out,
        "spec_expectations_measured": score_expectations(rows_out),
        "unmapped_rows_by_reason": sorted(
            unmapped_by_reason.values(), key=lambda item: -item["rows"]),
        "examples": examples(both, api_only, local_only, api_present, from_files),
    }


def verdict_for(counts: dict, reported: bool) -> str:
    """One plain sentence saying what this category's numbers mean."""
    if not reported:
        return ("the org reported no dependency of this kind at all, so every pair "
                "here comes from the local files alone and none of them is a "
                "disagreement")
    if counts["api_only"] and not counts["both"] and not counts["local_only"]:
        return "only the org found these; the local files found none of this kind"
    if counts["both"] and not counts["api_only"] and not counts["local_only"]:
        return "the two sides agree exactly"
    return (f"{counts['both']} agreed, {counts['local_only']} found only in the files, "
            f"{counts['api_only']} found only by the org")


# The WI-007 SPEC wrote down, before any of this ran, what the API was expected
# to be good and bad at. That list carried `Basis: inferred, unconfirmed`: it was
# general knowledge about `MetadataComponentDependency`, never tested against Red
# or Blue. Phase 7 exists to replace it with a measurement, so the report scores
# each expectation rather than leaving the reader to work it out from 130 rows.
#
# Each entry is (what the SPEC said, whether it said reliable, the categories it
# covers). A category is (source type, target type); `*` matches any type.
EXPECTATIONS = (
    ("Apex to Apex", True, (("ApexClass", "ApexClass"), ("ApexClass", "ApexTrigger"),
                            ("ApexTrigger", "ApexClass"),
                            ("ApexTrigger", "ApexTrigger"))),
    ("Apex to object and field", True, (("ApexClass", "CustomObject"),
                                        ("ApexClass", "CustomField"),
                                        ("ApexTrigger", "CustomObject"),
                                        ("ApexTrigger", "CustomField"))),
    ("Flow to object and field", True, (("Flow", "CustomObject"),
                                        ("Flow", "CustomField"))),
    ("Layout and Lightning page contents", True, (("Layout", "*"),
                                                  ("FlexiPage", "*"))),
    ("Report and dashboard sources", True, (("Report", "*"), ("Dashboard", "*"),
                                            ("ReportType", "*"))),
    ("References to standard objects and standard fields", False,
     (("*", "CustomObject"),)),
    ("Permission set and profile field access", False,
     (("Profile", "*"), ("PermissionSet", "*"), ("PermissionSetGroup", "*"))),
    ("References from custom metadata records", False, (("CustomMetadata", "*"),)),
)


def score_expectations(rows: list[dict]) -> list[dict]:
    """Measure each of the SPEC's expectations against what actually happened.

    The agreement share is worked out over the categories the org REPORTS and
    nothing else. Mixing in a category it never mentions would average a real
    measurement with an absence, which is the one thing this whole report exists
    to avoid. Blue's custom metadata records are the case that proves it: the org
    reports every one of the 379 record-to-object dependencies and agrees on all
    379, and separately says nothing at all about the 1,081 record-to-field ones.
    Added together that reads as 26 per cent and looks like a weak API. Kept
    apart it reads as exact agreement plus a coverage gap, which is what happened.
    """
    scored = []
    for label, expected_reliable, patterns in EXPECTATIONS:
        matched = [row for row in rows
                   if any((source in ("*", row["source_type"]))
                          and (target in ("*", row["target_type"]))
                          for source, target in patterns)]
        reported = [row for row in matched if row["api_reports_this_category"]]
        silent = [row for row in matched if not row["api_reports_this_category"]]
        both = sum(row["both"] for row in reported)
        api_only = sum(row["api_only"] for row in reported)
        local_only = sum(row["local_only"] for row in reported)
        silent_pairs = sum(row["local_only"] for row in silent)

        # TWO ratios, because there are two questions and only one of them is
        # about this tool. Phase 7 reported the first and read it as the second,
        # which is how it concluded that layouts were the weakest thing the tool
        # does when Salesforce reported 1,608 layout-to-field connections in Red
        # and the tool had found every one of them. Mike caught it on 2026-08-06.
        #
        #   salesforce_covered = both / (both + local_only)
        #       Of the connections the files found, how many did Salesforce also
        #       report? This measures SALESFORCE's coverage. It is what the
        #       SPEC's eight predictions were about, so it is what the verdict
        #       below is keyed on. A low number here says the API is a poor
        #       source about this kind of connection. It says nothing about the
        #       tool.
        #
        #   tool_found = both / (both + api_only)
        #       Of the connections Salesforce reported, how many did the tool
        #       find? This is the one that measures THIS TOOL.
        #
        # Neither is a miss rate. Both count agreement, and they differ only in
        # what they divide by.
        salesforce_covered = (both / (both + local_only)
                              if (both + local_only) else 0.0)
        tool_found = both / (both + api_only) if (both + api_only) else 0.0

        aside = (f" Separately, the org says nothing at all about "
                 f"{silent_pairs:,} more pairs of this kind, in "
                 f"{len(silent)} category it never mentions."
                 if silent_pairs and len(silent) == 1 else
                 f" Separately, the org says nothing at all about "
                 f"{silent_pairs:,} more pairs of this kind, in "
                 f"{len(silent)} categories it never mentions."
                 if silent_pairs else "")

        if not matched:
            measured = "nothing of this kind exists in this org"
            verdict = "untested"
            tool_line = "nothing to find"
        elif not reported:
            measured = ("the org reported no dependency of this kind at all, so the "
                        f"files are the only source for all {silent_pairs:,} of them")
            verdict = "held" if not expected_reliable else "did NOT hold"
            tool_line = ("the org reported nothing of this kind, so there is no "
                         "answer of its own to find")
        else:
            measured = (f"of the pairs the org does report, {both:,} agreed, "
                        f"{local_only:,} were found only in the files and "
                        f"{api_only:,} only by the org, so the org confirmed "
                        f"{salesforce_covered:.0%} of what the files "
                        f"found.{aside}")
            verdict = ("held" if (salesforce_covered >= 0.5) == expected_reliable
                       else "did NOT hold")
            # A category can be "reported" because the org named a pair whose
            # ends are not both in the snapshot, and still leave nothing here to
            # find. Saying 0% then would read as a failure rather than as an
            # empty question.
            tool_line = (f"{both:,} of the {both + api_only:,} the org reported, "
                         f"{tool_found:.0%}" if (both + api_only) else
                         "the org reported no pair this comparison could place, "
                         "so there is nothing here to find")

        scored.append({
            "expectation": label,
            "spec_said": "reliable" if expected_reliable else "weak or absent",
            "measured": measured,
            "verdict": verdict,
            "tool_found_of_the_orgs_answer": tool_line,
            "both": both,
            "local_only_where_the_org_reports": local_only,
            "api_only": api_only,
            "pairs_in_categories_the_org_never_mentions": silent_pairs,
            # Named for the question each one answers. `share` was the old name
            # for the first of these and meant neither clearly.
            "share_of_the_files_answer_the_org_confirmed":
                round(salesforce_covered, 4),
            "share_of_the_orgs_answer_the_files_found": round(tool_found, 4),
        })
    return scored


def _percent(part: int, whole: int) -> str:
    """`51 of 51` as `100%`. An empty denominator is said, never shown as 0%.

    A category where one side found nothing has no ratio to report, and printing
    `0%` there would read as a failure rather than as an absence.
    """
    return f"{part / whole:.0%}" if whole else "n/a"


def verdict_section(result: dict) -> list[str]:
    scored = score_expectations(result["by_category"])
    lines = [
        "", "## What the SPEC expected, against what actually happened", "",
        "The WI-007 SPEC wrote down which kinds of connection this API was expected "
        "to be reliable about and which it was expected to be silent on. That list "
        "was marked `Basis: inferred, unconfirmed`: general knowledge, never tested "
        "against these two orgs. These are the measurements that replace it.", "",
        "**Every prediction below is about SALESFORCE, not about this tool.** The "
        "`Did Salesforce cover it?` column scores the prediction: of the "
        "connections the local files found, how many did the org also report. A "
        "low number there means the API is a poor source about that kind of "
        "connection, and says nothing at all about whether this tool found them.",
        "",
        "The last column is the one that measures THIS TOOL: of the connections "
        "the org did report, how many did the tool find. The two can point "
        "opposite ways and often do. Red's layouts are the clearest case: the org "
        "confirmed only a third of what the files found, and the tool found every "
        "single connection the org reported.", "",
        "| The SPEC expected | About | Did Salesforce cover it? | Held? | "
        "Did our tool find Salesforce's answer? |",
        "| --- | --- | --- | --- | --- |"]
    for row in scored:
        lines.append(f"| {row['spec_said']} | {row['expectation']} | "
                     f"{row['measured']} | **{row['verdict']}** | "
                     f"{row['tool_found_of_the_orgs_answer']} |")
    return lines


def examples(both, api_only, local_only, api_present, from_files) -> dict:
    return {
        "both": [f"{a} -> {b}" for a, b in sorted(both)[:10]],
        "api_only": [f"{a} -> {b}" for a, b in sorted(api_only)[:10]],
        "local_only": [f"{a} -> {b} ({from_files[(a, b)]})"
                       for a, b in sorted(local_only)[:10]],
    }


def notes_for(org: str, pull: dict) -> list[str]:
    incomplete = pull.get("incomplete_slices") or []
    notes = [
        "Distinct component pairs are compared, never edge counts. The local files "
        "hold one edge per place a reference appears; the org reports a dependency "
        "once. Comparing those two directly would be comparing different things.",
        "A row the comparison could not read is counted as unmapped, never as a "
        "disagreement. unmapped_rows_by_reason says how many and why.",
        "A pair naming a component the snapshot does not hold is counted apart from "
        "the rest. The local files could not have produced it whatever the reader did.",
        "Every count is per category, because the org reports some kinds of "
        "connection well and others not at all, and one overall percentage would "
        "average those two together and hide both.",
        f"The {org} snapshot was retrieved on 2026-07-31 and the org is live. A "
        "component added, renamed or deleted since is a real difference between the "
        "two sides that says nothing about either one's accuracy.",
    ]
    if incomplete:
        notes.append(
            f"The org's own answer is not proven complete: {len(incomplete)} query "
            "slice(s) came back at the API's 2000-row cap. See incomplete_slices in "
            f"org-dependencies-{org}.json. Anything cut off there would show up here "
            "as the local files finding something the org did not.")
    return notes


def markdown(result: dict) -> str:
    org = result["org"]
    counts = result["counts"]
    lines = [
        f"# {org.title()}: the local edge list against the org's own answer",
        "",
        "What the metadata files in `force-app/` say connects to what, compared "
        "against what the org reports through the Tooling API object "
        "`MetadataComponentDependency`. Read-only, WI-007 phase 7.",
        "",
        "**The API is a cross-check, not the truth.** A difference is a reason to go "
        "and look at that one case. It is not a defect in either side.",
        "",
        "## What was compared",
        "",
        "| | Count |",
        "| --- | ---: |",
        f"| Rows the org returned | {counts['api_rows']:,} |",
        f"| Distinct component pairs in them | {counts['api_pairs']:,} |",
        f"| Rows that could not be read into a pair | {counts['api_rows_unmapped']:,} |",
        f"| Pairs naming a component the snapshot does not hold | "
        f"{counts['api_pairs_naming_a_component_the_snapshot_lacks']:,} |",
        f"| Pairs left, both ends in the snapshot | "
        f"{counts['api_pairs_both_ends_in_snapshot']:,} |",
        f"| Distinct component pairs in the local files | {counts['local_pairs']:,} |",
        f"| Local edges that resolved to nothing, so they have no pair | "
        f"{counts['local_edges_that_resolved_to_nothing']:,} |",
        "",
        "| Result | Pairs |",
        "| --- | ---: |",
        f"| Both sides found it | {counts['both']:,} |",
        f"| Only the local files found it | {counts['local_only']:,} |",
        f"| Only the org found it | {counts['api_only']:,} |",
        "",
    ]

    lines += ["## Notes", ""]
    for note in result["notes"]:
        lines.append(f"- {note}")
    lines += verdict_section(result)

    reported = [r for r in result["by_category"] if r["api_reports_this_category"]]
    silent = [r for r in result["by_category"] if not r["api_reports_this_category"]]

    lines += ["", "## Categories the org does report", "",
              f"{len(reported)} pairs of component types where the org returned at "
              "least one dependency. These are the only rows where the word "
              "'disagreement' means anything, because they are the only ones where "
              "both sides had something to say.", "",
              "The last two columns are the two ratios, per category. **Org "
              "covered** is `both / (both + files only)`: of what the files "
              "found, how much the org confirmed. **Tool found** is `both / "
              "(both + org only)`: of what the org reported, how much the tool "
              "found. Only the second one measures this tool.", "",
              "| From | To | Both | Files only | Org only | Org names a component the "
              "snapshot lacks | Org covered | Tool found |",
              "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |"]
    for row in sorted(reported, key=lambda r: -(r["both"] + r["api_only"])):
        covered = _percent(row["both"], row["both"] + row["local_only"])
        found = _percent(row["both"], row["both"] + row["api_only"])
        lines.append(
            f"| {row['source_type']} | {row['target_type']} | {row['both']:,} | "
            f"{row['local_only']:,} | {row['api_only']:,} | "
            f"{row['api_names_a_component_the_snapshot_lacks']:,} | "
            f"{covered} | {found} |")

    silent_pairs = sum(r["local_only"] for r in silent)
    lines += ["", "## Categories the org never mentions", "",
              f"{len(silent)} pairs of component types where the org returned no "
              f"dependency at all. The {silent_pairs:,} pairs below are NOT "
              "disagreements: for every one of them the local metadata files are the "
              "only source there is, and nothing exists to check them against.", "",
              "| From | To | Only the files have it |",
              "| --- | --- | ---: |"]
    for row in sorted(silent, key=lambda r: -r["local_only"]):
        lines.append(f"| {row['source_type']} | {row['target_type']} | "
                     f"{row['local_only']:,} |")

    missing = result.get("components_the_org_names_that_the_snapshot_lacks") or []
    if missing:
        lines += [
            "", "## What the org names that the snapshot does not have", "",
            "These components exist in the org, are named in one of its own dependency "
            "rows, and have no file in `force-app/`. That is a gap in what the retrieve "
            "brought back, and it is invisible from the local side alone: a file that "
            "never arrived leaves no hole to notice. Every pair naming one of them is "
            "kept out of the disagreement counts, because the local files could not "
            "have produced it whatever the reader did.", "",
            "| Type | Named by the org, missing locally | In the snapshot |",
            "| --- | ---: | ---: |"]
        for row in missing:
            lines.append(f"| {row['type']} | {row['components']:,} | "
                         f"{row['in_the_snapshot']:,} |")

    refused = result.get("types_the_api_refuses_to_discuss") or []
    if refused:
        lines += [
            "", "## Types the org refuses to discuss at all", "",
            f"Asking `MetadataComponentDependency` about one of these {len(refused)} "
            "types does not return an empty answer. It fails outright, with the org's "
            "own words: `The MetadataComponentType value SharingRules is not a "
            "supported type.` That is the strongest statement available about what "
            "this API does not cover, because it is the org saying so rather than an "
            "absence being read as a no.", "",
            "For every one of these, the local metadata files are the only source "
            "there is.", "",
            "".join(f"`{name}`  " for name in refused), ""]

    lines += ["", "## Rows the comparison could not read", "",
              "None of these is a disagreement. Each one is a row whose two ends "
              "could not both be turned into a local component id, with the reason.",
              "", "| Rows | Names | Component types | Reason |",
              "| ---: | ---: | --- | --- |"]
    for entry in result["unmapped_rows_by_reason"]:
        types = ", ".join(entry["component_types"][:6])
        if len(entry["component_types"]) > 6:
            types += f", and {len(entry['component_types']) - 6} more"
        lines.append(f"| {entry['rows']:,} | {entry['distinct_names']:,} | {types} | "
                     f"{entry['reason']} |")

    lines += ["", "## Examples", ""]
    for label, key in (("Both sides found these", "both"),
                       ("Only the org found these", "api_only"),
                       ("Only the local files found these", "local_only")):
        lines += [f"### {label}", ""]
        for line in result["examples"][key] or ["(none)"]:
            lines.append(f"- `{line}`")
        lines.append("")

    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--org", action="append", dest="orgs", required=True,
                        help="org folder name (repeatable)")
    args = parser.parse_args(argv)

    for org in args.orgs:
        print(f"\n=== comparing {org} ===", flush=True)
        result = compare(org)
        json_path = ANSWERS_DIR / f"crosscheck-{org}.json"
        json_path.write_text(json.dumps(result, indent=1), encoding="utf-8")
        md_path = ANSWERS_DIR / f"crosscheck-{org}.md"
        md_path.write_text(markdown(result), encoding="utf-8")

        counts = result["counts"]
        print(f"  org rows {counts['api_rows']:,} -> pairs {counts['api_pairs']:,}, "
              f"unmapped rows {counts['api_rows_unmapped']:,}", flush=True)
        print(f"  both {counts['both']:,}, files only {counts['local_only']:,}, "
              f"org only {counts['api_only']:,}", flush=True)
        print(f"  wrote {json_path}", flush=True)
        print(f"  wrote {md_path}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

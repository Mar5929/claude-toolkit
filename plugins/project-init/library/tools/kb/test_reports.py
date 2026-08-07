"""Tests for the WI-007 phase 5 reports.

Run: python tools/kb/test_reports.py

Most of these build a handful of files and references by hand, so they run
anywhere and say exactly what they are testing. The last group runs the whole
pipeline against whatever real metadata this project holds, because the headline
promise of phase 5 (every file is listed, and every file that produced no edge
says why) can only be proved there. Those tests skip themselves in a project with
no metadata.

A few of them check counts measured in one specific project. Those are listed in
MEASURED below and skip anywhere the named orgs are absent.
"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))

from edge_list import build_edge_list, dumps  # noqa: E402
from extractors import extract_org  # noqa: E402
from extractors.contracts import (  # noqa: E402
    ExtractedComponent, ExtractionResult, FileOutcome, RawReference,
    category_for,
)
from reports import (  # noqa: E402
    MARKDOWN_TOP_STRINGS, UNRESOLVED_VALUES, acceptance, build_coverage,
    build_unresolved, markdown_summary, write_reports,
)
from graph import find_repo_root, source_roots  # noqa: E402
from resolver import RESOLVED, Resolver, resolve_org  # noqa: E402

REPO_ROOT = find_repo_root()
FORCE_APP = REPO_ROOT / "force-app"

# Every org this project holds metadata for, discovered rather than named.
PROJECT_ORGS = source_roots()

# Counts measured in the project this tool was built in, on 2026-08-06. A project
# without these org names skips the tests that use them. Exact rather than floors:
# a change that moves one of these is meant to fail here and be looked at.
MEASURED_FILES = {"red": 8996, "blue": 5202}
MEASURED_EDGES = {"red": 350657, "blue": 82406}
MEASURED_UNRESOLVED = {"red": 36533, "blue": 28009}
MEASURED_PROFILE_EDGE_FLOORS = {"red": 250000, "blue": 28000}


# ---------------------------------------------------------------------------
# Building a small org by hand
# ---------------------------------------------------------------------------

class Fixture:
    """A few files, components and references, with nothing on disk."""

    def __init__(self, org="red"):
        self.org = org
        self.result = ExtractionResult(org=org,
                                       root=f"force-app/{org}/main/default")

    def component(self, metadata_type, api_name, file_path="", **attributes):
        cid = f"{self.org}:{metadata_type}:{api_name}"
        self.result.add_component(ExtractedComponent(
            id=cid, org=self.org, type=metadata_type, api_name=api_name,
            file_path=file_path or f"force-app/{self.org}/{metadata_type}/{api_name}",
            attributes=attributes,
        ))
        if metadata_type == "CustomObject":
            self.result.known_objects.add(api_name)
        return cid

    def reference(self, source_id, raw, file_path, relationship="references",
                  target_type="", target_parent="", location="element",
                  confidence="high", **attributes):
        self.result.add_reference(RawReference(
            org=self.org, source_id=source_id, raw=raw,
            relationship=relationship, category=category_for(relationship),
            confidence=confidence, file_path=file_path, location=location,
            target_type=target_type, target_parent=target_parent,
            via="test", attributes=attributes,
        ))

    def outcome(self, file_path, metadata_type, references=0, components=0,
                opened=True, reason="", error="", role="primary",
                extractor="test"):
        self.result.outcomes.append(FileOutcome(
            org=self.org, file_path=file_path, metadata_type=metadata_type,
            role=role, opened=opened, extractor=extractor,
            component_count=components, reference_count=references,
            reason=reason, error=error,
        ))

    def build(self):
        edges = build_edge_list(self.result, resolve_org(self.result))
        return (self.result, edges, build_coverage(self.result, edges),
                build_unresolved(edges))


FLOW_FILE = "force-app/red/flows/Case_Escalation.flow-meta.xml"
IMAGE_FILE = "force-app/red/staticresources/logo.png"
FIELD_FILE = "force-app/red/objects/Case/fields/Reason__c.field-meta.xml"


def _small_org(org="red"):
    """A flow that reads one real field and one name that resolves to nothing,
    a field file that points at nothing, and a static resource never opened."""
    fixture = Fixture(org)
    fixture.component("CustomObject", "Case")
    fixture.component("CustomField", "Case.Priority")
    fixture.component("CustomField", "Case.Reason__c", file_path=FIELD_FILE)
    flow = fixture.component("Flow", "Case_Escalation", start_object="Case")
    fixture.reference(flow, "Priority", FLOW_FILE, relationship="reads",
                      target_type="CustomField", target_parent="Case",
                      location="decisions[Is_High]/rules/conditions/left")
    fixture.reference(flow, "Nothing_Here__c", FLOW_FILE, relationship="reads",
                      target_type="CustomField", target_parent="Case",
                      location="decisions[Is_High]/rules/conditions/right")
    fixture.outcome(FLOW_FILE, "Flow", references=2, components=1,
                    extractor="extract_flow")
    fixture.outcome(FIELD_FILE, "CustomField", components=1,
                    reason="a Text field: it holds a value and points at "
                           "nothing else")
    fixture.outcome(IMAGE_FILE, "StaticResource", opened=False, extractor="",
                    reason="a static resource is arbitrary content rather than "
                           "metadata; not parsed")
    return fixture


# ---------------------------------------------------------------------------
# Every file is listed, once
# ---------------------------------------------------------------------------

class CoverageListsEveryFileTests(unittest.TestCase):

    def test_one_row_per_file(self) -> None:
        _, _, coverage, _ = _small_org().build()
        self.assertEqual(len(coverage.files), 3)

    def test_a_file_that_was_never_opened_is_still_listed(self) -> None:
        _, _, coverage, _ = _small_org().build()
        row = next(r for r in coverage.files if r["file_path"] == IMAGE_FILE)
        self.assertFalse(row["opened"])
        self.assertEqual(row["edges"], 0)
        self.assertIn("not parsed", row["reason"])

    def test_rows_are_sorted_by_path(self) -> None:
        _, _, coverage, _ = _small_org().build()
        paths = [row["file_path"] for row in coverage.files]
        self.assertEqual(paths, sorted(paths))

    def test_the_counts_add_up(self) -> None:
        _, edges, coverage, _ = _small_org().build()
        self.assertEqual(coverage.counts["files"], 3)
        self.assertEqual(coverage.counts["files_producing_edges"], 1)
        self.assertEqual(coverage.counts["files_producing_no_edge"], 2)
        self.assertEqual(coverage.counts["files_not_opened"], 1)
        self.assertEqual(coverage.counts["edges"], len(edges.edges))
        self.assertEqual(
            sum(row["edges"] for row in coverage.files), len(edges.edges))


# ---------------------------------------------------------------------------
# The edge count is counted again, not copied
# ---------------------------------------------------------------------------

class EdgeCountsComeFromTheEdgesTests(unittest.TestCase):

    def test_the_flow_file_carries_both_its_edges(self) -> None:
        _, _, coverage, _ = _small_org().build()
        row = next(r for r in coverage.files if r["file_path"] == FLOW_FILE)
        self.assertEqual(row["edges"], 2)
        self.assertEqual(row["resolved"], 1)
        self.assertEqual(row["unresolved"], 1)

    def test_a_wrong_extractor_tally_is_caught(self) -> None:
        """The check exists to catch a count that stopped matching the edges.
        Breaking the tally on purpose must make it fail, or it proves nothing."""
        fixture = _small_org()
        extraction, edges, coverage, unresolved = fixture.build()
        extraction.outcomes[0].reference_count = 99
        results = dict(
            (sentence, passed)
            for passed, sentence in acceptance(coverage, unresolved, extraction,
                                               edges))
        failed = [s for s, passed in results.items() if not passed]
        self.assertEqual(len(failed), 1)
        self.assertIn("disagree", failed[0])

    def test_an_edge_from_an_unlisted_file_is_caught(self) -> None:
        fixture = _small_org()
        fixture.reference(f"{fixture.org}:Flow:Case_Escalation", "Priority",
                          "force-app/red/flows/Not_Listed.flow-meta.xml",
                          relationship="reads", target_type="CustomField",
                          target_parent="Case", location="x")
        extraction, edges, coverage, unresolved = fixture.build()
        failed = [s for passed, s
                  in acceptance(coverage, unresolved, extraction, edges)
                  if not passed]
        self.assertTrue(any("does not" in s and "list" in s for s in failed),
                        failed)


# ---------------------------------------------------------------------------
# No silent skips
# ---------------------------------------------------------------------------

class EveryZeroSaysWhyTests(unittest.TestCase):

    def test_a_file_with_no_edge_and_no_reason_fails_the_check(self) -> None:
        fixture = _small_org()
        fixture.outcome("force-app/red/objects/Case/Case.object-meta.xml",
                        "CustomObject")
        extraction, edges, coverage, unresolved = fixture.build()
        failed = [s for passed, s
                  in acceptance(coverage, unresolved, extraction, edges)
                  if not passed]
        self.assertTrue(any("gave no reason" in s for s in failed), failed)

    def test_an_error_counts_as_saying_why(self) -> None:
        fixture = _small_org()
        fixture.outcome("force-app/red/flows/Broken.flow-meta.xml", "Flow",
                        error="not well-formed (invalid token): line 3")
        extraction, edges, coverage, unresolved = fixture.build()
        for passed, sentence in acceptance(coverage, unresolved, extraction,
                                           edges):
            self.assertTrue(passed, sentence)
        self.assertEqual(coverage.counts["files_with_an_error"], 1)

    def test_the_reasons_are_grouped_with_their_file_counts(self) -> None:
        _, _, coverage, _ = _small_org().build()
        reasons = {row["reason"]: row["files"] for row in coverage.reasons}
        self.assertEqual(len(reasons), 2)
        self.assertEqual(sum(reasons.values()), 2)

    def test_a_reason_records_which_types_gave_it(self) -> None:
        _, _, coverage, _ = _small_org().build()
        row = next(r for r in coverage.reasons if "static resource" in r["reason"])
        self.assertEqual(row["metadata_types"], ["StaticResource"])


# ---------------------------------------------------------------------------
# The by-type table and the silent types
# ---------------------------------------------------------------------------

class ByMetadataTypeTests(unittest.TestCase):

    def test_every_type_present_has_a_row(self) -> None:
        _, _, coverage, _ = _small_org().build()
        types = {row["metadata_type"] for row in coverage.by_metadata_type}
        self.assertEqual(types, {"Flow", "CustomField", "StaticResource"})

    def test_types_are_ordered_by_edges(self) -> None:
        _, _, coverage, _ = _small_org().build()
        self.assertEqual(coverage.by_metadata_type[0]["metadata_type"], "Flow")

    def test_a_type_where_nothing_produced_an_edge_says_so_once(self) -> None:
        _, _, coverage, _ = _small_org().build()
        silent = {row["metadata_type"]: row for row in coverage.silent_types}
        self.assertEqual(set(silent), {"CustomField", "StaticResource"})
        self.assertIn("not parsed",
                      silent["StaticResource"]["most_common_reason"])
        self.assertEqual(silent["StaticResource"]["other_reasons"], 0)

    def test_a_type_with_several_reasons_reports_how_many(self) -> None:
        fixture = _small_org()
        fixture.outcome("force-app/red/staticresources/other.zip",
                        "StaticResource", opened=False, extractor="",
                        reason="a different stated reason")
        _, _, coverage, _ = fixture.build()
        row = next(r for r in coverage.silent_types
                   if r["metadata_type"] == "StaticResource")
        self.assertEqual(row["files"], 2)
        self.assertEqual(row["other_reasons"], 1)


# ---------------------------------------------------------------------------
# The unresolved report
# ---------------------------------------------------------------------------

class UnresolvedReportTests(unittest.TestCase):

    def test_the_one_unresolved_name_is_reported(self) -> None:
        _, _, _, unresolved = _small_org().build()
        self.assertEqual(unresolved.counts["unresolved_edges"], 1)
        self.assertEqual(unresolved.counts["distinct_reference_strings"], 1)
        self.assertEqual(unresolved.references[0]["raw_reference"],
                         "Nothing_Here__c")

    def test_a_row_carries_its_reason_rule_and_sentence(self) -> None:
        _, _, _, unresolved = _small_org().build()
        row = unresolved.references[0]
        self.assertIn(row["resolution"], UNRESOLVED_VALUES)
        self.assertTrue(row["resolved_by"])
        self.assertTrue(row["resolution_detail"])

    def test_a_row_names_who_asked_for_it(self) -> None:
        _, _, _, unresolved = _small_org().build()
        row = unresolved.references[0]
        self.assertEqual(row["source_components"], 1)
        self.assertEqual(row["sources"],
                         [{"source": "red:Flow:Case_Escalation",
                           "relationship": "reads", "edges": 1}])

    def test_the_same_name_from_two_places_is_one_row_with_two_edges(self) -> None:
        fixture = _small_org()
        second = fixture.component("Flow", "Case_Closure", start_object="Case")
        fixture.reference(second, "Nothing_Here__c",
                          "force-app/red/flows/Case_Closure.flow-meta.xml",
                          relationship="reads", target_type="CustomField",
                          target_parent="Case", location="assignments[A]/left")
        fixture.outcome("force-app/red/flows/Case_Closure.flow-meta.xml", "Flow",
                        references=1, components=1, extractor="extract_flow")
        _, _, _, unresolved = fixture.build()
        rows = [r for r in unresolved.references
                if r["raw_reference"] == "Nothing_Here__c"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["edges"], 2)
        self.assertEqual(rows[0]["source_components"], 2)

    def test_a_resolved_reference_is_not_in_the_report(self) -> None:
        _, _, _, unresolved = _small_org().build()
        names = {row["raw_reference"] for row in unresolved.references}
        self.assertNotIn("Priority", names)

    def test_rows_are_sorted_most_edges_first(self) -> None:
        fixture = _small_org()
        flow = f"{fixture.org}:Flow:Case_Escalation"
        for index in range(3):
            fixture.reference(flow, "Also_Missing__c", FLOW_FILE,
                              relationship="reads", target_type="CustomField",
                              target_parent="Case", location=f"loops[L{index}]")
        fixture.result.outcomes[0].reference_count = 5
        _, _, _, unresolved = fixture.build()
        counts = [row["edges"] for row in unresolved.references]
        self.assertEqual(counts, sorted(counts, reverse=True))
        self.assertEqual(unresolved.references[0]["raw_reference"],
                         "Also_Missing__c")

    def test_a_managed_package_name_carries_its_namespace(self) -> None:
        fixture = _small_org()
        flow = f"{fixture.org}:Flow:Case_Escalation"
        fixture.reference(flow, "npsp__Household__c", FLOW_FILE,
                          relationship="reads", target_type="CustomObject",
                          location="recordLookups[Get]/object")
        fixture.result.outcomes[0].reference_count = 3
        _, _, _, unresolved = fixture.build()
        row = next(r for r in unresolved.references
                   if r["raw_reference"] == "npsp__Household__c")
        self.assertEqual(row["resolution"], "unresolved_managed_package")
        self.assertEqual(row["namespace"], "npsp")
        self.assertEqual(unresolved.by_namespace,
                         [{"namespace": "npsp", "edges": 1,
                           "reference_strings": 1}])

    def test_the_breakdowns_cover_every_unresolved_edge(self) -> None:
        _, _, _, unresolved = _small_org().build()
        total = unresolved.counts["unresolved_edges"]
        for name, rows in (("by_reason", unresolved.by_reason),
                           ("by_rule", unresolved.by_rule),
                           ("by_source_type", unresolved.by_source_type),
                           ("by_expected_type", unresolved.by_expected_type)):
            self.assertEqual(sum(row["edges"] for row in rows), total, name)


# ---------------------------------------------------------------------------
# The acceptance checks themselves
# ---------------------------------------------------------------------------

class AcceptanceTests(unittest.TestCase):

    def test_a_clean_build_passes_everything(self) -> None:
        extraction, edges, coverage, unresolved = _small_org().build()
        for passed, sentence in acceptance(coverage, unresolved, extraction,
                                           edges):
            self.assertTrue(passed, sentence)

    def test_a_missing_file_row_is_caught(self) -> None:
        extraction, edges, coverage, unresolved = _small_org().build()
        coverage.files.pop()
        failed = [s for passed, s
                  in acceptance(coverage, unresolved, extraction, edges)
                  if not passed]
        self.assertTrue(any("rows" in s for s in failed), failed)

    def test_a_duplicated_file_row_is_caught(self) -> None:
        extraction, edges, coverage, unresolved = _small_org().build()
        coverage.files.append(dict(coverage.files[0]))
        coverage.files.sort(key=lambda row: row["file_path"])
        failed = [s for passed, s
                  in acceptance(coverage, unresolved, extraction, edges)
                  if not passed]
        self.assertTrue(any("more than once" in s for s in failed), failed)

    def test_a_dropped_unresolved_row_is_caught(self) -> None:
        extraction, edges, coverage, unresolved = _small_org().build()
        unresolved.references.clear()
        failed = [s for passed, s
                  in acceptance(coverage, unresolved, extraction, edges)
                  if not passed]
        self.assertTrue(any("resolved to nothing" in s for s in failed), failed)
        self.assertTrue(any("reverse index" in s for s in failed), failed)


# ---------------------------------------------------------------------------
# The readable summary and the written files
# ---------------------------------------------------------------------------

class WritingTests(unittest.TestCase):

    def test_both_json_files_load_back(self) -> None:
        _, _, coverage, unresolved = _small_org().build()
        with tempfile.TemporaryDirectory() as folder:
            written = write_reports(coverage, unresolved, folder)
            loaded = {name: json.loads(path.read_text(encoding="utf-8"))
                      for name, path in written.items() if path.suffix == ".json"}
            summary = written["summary"].read_text(encoding="utf-8")
        self.assertEqual(len(loaded["coverage"]["files"]), 3)
        self.assertEqual(len(loaded["unresolved"]["references"]), 1)
        self.assertEqual(loaded["coverage"]["org"], "red")
        self.assertIn("# Coverage and unresolved references: red", summary)

    def test_the_file_names_carry_the_org(self) -> None:
        _, _, coverage, unresolved = _small_org("blue").build()
        with tempfile.TemporaryDirectory() as folder:
            written = write_reports(coverage, unresolved, folder)
        self.assertEqual(written["coverage"].name, "coverage-blue.json")
        self.assertEqual(written["unresolved"].name, "unresolved-blue.json")
        self.assertEqual(written["summary"].name, "reports-blue.md")

    def test_the_summary_names_every_metadata_type(self) -> None:
        _, _, coverage, unresolved = _small_org().build()
        summary = markdown_summary(coverage, unresolved)
        for mtype in ("Flow", "CustomField", "StaticResource"):
            self.assertIn(mtype, summary)

    def test_the_summary_states_every_reason(self) -> None:
        _, _, coverage, unresolved = _small_org().build()
        summary = markdown_summary(coverage, unresolved)
        for row in coverage.reasons:
            self.assertIn(row["reason"], summary)

    def test_the_summary_says_where_the_full_data_is(self) -> None:
        _, _, coverage, unresolved = _small_org().build()
        summary = markdown_summary(coverage, unresolved)
        for name in ("coverage-red.json", "unresolved-red.json",
                     "edges-red.json", "reverse-index-red.json"):
            self.assertIn(name, summary)

    def test_the_summary_is_written_with_unix_newlines(self) -> None:
        """A build on Windows and a build on a Mac must produce the same bytes."""
        _, _, coverage, unresolved = _small_org().build()
        with tempfile.TemporaryDirectory() as folder:
            written = write_reports(coverage, unresolved, folder)
            raw = written["summary"].read_bytes()
        self.assertNotIn(b"\r\n", raw)


# ---------------------------------------------------------------------------
# Against the real snapshots
# ---------------------------------------------------------------------------

@unittest.skipUnless(PROJECT_ORGS, "this project holds no org metadata")
class RealSnapshotTests(unittest.TestCase):
    """The promises that can only be proved against real metadata.

    Phase 5 must account for every file and every edge, and must state a reason
    for every file that produced nothing. That has to hold for any org, so these
    run against whatever this project has.
    """

    extractions: dict = {}
    lists: dict = {}
    coverages: dict = {}
    unresolveds: dict = {}
    smallest: str = ""

    @classmethod
    def setUpClass(cls) -> None:
        for org, root in PROJECT_ORGS.items():
            extraction = extract_org(root, org)
            edges = build_edge_list(extraction, Resolver(extraction).resolve_all())
            cls.extractions[org] = extraction
            cls.lists[org] = edges
            cls.coverages[org] = build_coverage(extraction, edges)
            cls.unresolveds[org] = build_unresolved(edges)
        cls.smallest = min(cls.lists, key=lambda org: len(cls.lists[org].edges))

    def test_every_file_on_disk_is_listed(self) -> None:
        checked = [org for org in MEASURED_FILES if org in self.coverages]
        if not checked:
            self.skipTest("no measured org in this project")
        for org in checked:
            self.assertEqual(len(self.coverages[org].files), MEASURED_FILES[org])

    def test_every_file_producing_no_edge_says_why(self) -> None:
        """SPEC requirement 1: no silent skips. This is the check that proves it
        across every file in the project rather than the handful in a fixture."""
        for org, coverage in self.coverages.items():
            silent = [row["file_path"] for row in coverage.files
                      if not row["edges"] and not row.get("reason")
                      and not row.get("error")]
            self.assertEqual(silent, [], f"{org}: {silent[:5]}")

    def test_every_edge_is_attributed_to_a_listed_file(self) -> None:
        for org, coverage in self.coverages.items():
            counted = sum(row["edges"] for row in coverage.files)
            self.assertEqual(counted, len(self.lists[org].edges), org)

    def test_the_measured_edge_counts_hold(self) -> None:
        """The numbers as measured on 2026-08-06. If a later change moves one of
        them this fails on purpose and the STATUS table needs updating.

        Phase 4 measured 348,922 / 80,599 edges and 36,435 / 27,621 unresolved on
        2026-08-04. Phase 8 moved all four on 2026-08-06 by fixing three readers,
        and this test failing is how that was noticed:

        * layouts, +about 940 field references across the two orgs, because a
          layout named for a Salesforce pseudo-entity (`CaseClose-Close Case
          Layout`) was handing the resolver an object that does not exist;
        * Lightning pages, +3,267 field placements, because `fieldItem` was never
          read at all, plus the related-list columns and filters behind
          `relatedListApiName`;
        * Lightning page property lists, because every `valueListItems` value
          holding an underscore was being emitted as a QuickAction, which is what
          `relatedListFieldAliases` values look like.

        Net across the two orgs: 3,542 more edges, 3,056 of them resolved.
        """
        checked = [org for org in MEASURED_EDGES if org in self.coverages]
        if not checked:
            self.skipTest("no measured org in this project")
        for org in checked:
            self.assertEqual(self.coverages[org].counts["edges"],
                             MEASURED_EDGES[org], org)
            self.assertEqual(self.unresolveds[org].counts["unresolved_edges"],
                             MEASURED_UNRESOLVED[org], org)

    def test_every_unresolved_edge_is_in_the_unresolved_report(self) -> None:
        for org, unresolved in self.unresolveds.items():
            expected = sum(1 for edge in self.lists[org].edges
                           if edge["resolution"] != RESOLVED)
            reported = sum(row["edges"] for row in unresolved.references)
            self.assertEqual(reported, expected, org)

    def test_the_unresolved_report_agrees_with_the_reverse_index(self) -> None:
        """Two routes to the same fact: the report is built from the edges, the
        index was built in phase 4 by a different path. They must not differ."""
        for org, unresolved in self.unresolveds.items():
            index = self.lists[org].by_unresolved_reference
            report: dict = {}
            for row in unresolved.references:
                report[row["raw_reference"]] = (
                    report.get(row["raw_reference"], 0) + row["edges"])
            self.assertEqual(set(index), set(report), org)
            for name, entries in index.items():
                self.assertEqual(len(entries), report[name], f"{org}: {name}")

    def test_every_acceptance_check_passes_in_every_org(self) -> None:
        for org, coverage in self.coverages.items():
            for passed, sentence in acceptance(coverage, self.unresolveds[org],
                                               self.extractions[org],
                                               self.lists[org]):
                self.assertTrue(passed, f"{org}: {sentence}")

    def test_the_profile_files_are_still_accounted_for(self) -> None:
        """Profiles are usually the biggest single source of edges and are marked
        partial evidence, not left out. If a later change starts dropping them
        this fails."""
        for org, coverage in self.coverages.items():
            row = next((r for r in coverage.by_metadata_type
                        if r["metadata_type"] == "Profile"), None)
            if row is None:
                continue
            self.assertGreater(row["edges"], 0, f"{org}: profile edges vanished")
            if org in MEASURED_PROFILE_EDGE_FLOORS:
                self.assertGreater(row["edges"],
                                   MEASURED_PROFILE_EDGE_FLOORS[org], org)

    def test_two_builds_of_the_reports_give_the_same_bytes(self) -> None:
        """The smallest org, because the stability being proved is in the walk,
        the sort and the writer, which are the same code for every org."""
        org = self.smallest
        extraction = extract_org(PROJECT_ORGS[org], org)
        edges = build_edge_list(extraction, Resolver(extraction).resolve_all())
        again_coverage = build_coverage(extraction, edges)
        again_unresolved = build_unresolved(edges)
        self.assertEqual(
            dumps(self.coverages[org].document(),
                  ("files", "by_metadata_type")),
            dumps(again_coverage.document(), ("files", "by_metadata_type")))
        self.assertEqual(
            dumps(self.unresolveds[org].document(), ("references",)),
            dumps(again_unresolved.document(), ("references",)))
        self.assertEqual(
            markdown_summary(self.coverages[org], self.unresolveds[org]),
            markdown_summary(again_coverage, again_unresolved))

    def test_the_readable_summary_stays_readable(self) -> None:
        """It exists to be skimmed. Every org must stay a few hundred lines, not
        grow into the full file list."""
        for org, coverage in self.coverages.items():
            summary = markdown_summary(coverage, self.unresolveds[org])
            lines = summary.splitlines()
            self.assertLess(len(lines), 500, f"{org}: {len(lines)} lines")
            self.assertGreater(len(lines), 100, f"{org}: {len(lines)} lines")
            self.assertLessEqual(
                summary.count("\n| ") - summary.count("\n| ---"),
                len(coverage.by_metadata_type) + len(coverage.reasons)
                + len(coverage.silent_types) + MARKDOWN_TOP_STRINGS + 80,
                org)


if __name__ == "__main__":
    unittest.main(verbosity=1)

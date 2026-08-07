"""Tests for the WI-007 phase 4 JSON output.

Run: python tools/kb/test_edge_list.py

Most of these build a handful of components and references by hand, so they run
anywhere and say exactly what they are testing. The last group runs the whole
pipeline against whatever real metadata this project holds, because the headline
promises of phase 4 (every reference becomes exactly one edge, and two builds of
the same snapshot produce the same bytes) can only be proved there. Those tests
skip themselves in a project with no metadata.

A few of them check numbers measured in one specific project. Those are listed
in MEASURED below and skip anywhere the named orgs are absent.
"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))

from edge_list import (  # noqa: E402
    SCHEMA_VERSION, acceptance, build_edge_list, content_key, dumps, edge_id,
    write_files,
)
from extractors import extract_org  # noqa: E402
from extractors.contracts import (  # noqa: E402
    ExtractedComponent, ExtractionResult, RawReference, category_for,
)
from graph import find_repo_root, source_roots  # noqa: E402
from resolver import RESOLUTIONS, RESOLVED, Resolver, resolve_org  # noqa: E402

REPO_ROOT = find_repo_root()
FORCE_APP = REPO_ROOT / "force-app"

# Every org this project holds metadata for, discovered rather than named.
PROJECT_ORGS = source_roots()

# Numbers measured in the project this tool was built in, on 2026-08-04. They are
# floors rather than exact counts, so an extractor improvement does not break the
# suite. A project without these org names skips the tests that use them.
MEASURED_EDGE_FLOORS = {"red": 340000, "blue": 78000}
MEASURED_PROFILE_FLOORS = {"red": 250000, "blue": 28000}


# ---------------------------------------------------------------------------
# Building a small org by hand
# ---------------------------------------------------------------------------

class Fixture:
    """A few components and references, with no files involved."""

    def __init__(self, org="red"):
        self.org = org
        self.result = ExtractionResult(org=org, root=f"force-app/{org}/main/default")

    def component(self, metadata_type, api_name, **attributes):
        cid = f"{self.org}:{metadata_type}:{api_name}"
        self.result.add_component(ExtractedComponent(
            id=cid, org=self.org, type=metadata_type, api_name=api_name,
            file_path=f"force-app/{self.org}/{metadata_type}/{api_name}",
            attributes=attributes,
        ))
        if metadata_type == "CustomObject":
            self.result.known_objects.add(api_name)
        return cid

    def reference(self, source_id, raw, relationship="references", target_type="",
                  target_parent="", file_path="force-app/x", location="element",
                  confidence="high", **attributes):
        ref = RawReference(
            org=self.org, source_id=source_id, raw=raw,
            relationship=relationship, category=category_for(relationship),
            confidence=confidence, file_path=file_path, location=location,
            target_type=target_type, target_parent=target_parent,
            via="test", attributes=attributes,
        )
        self.result.add_reference(ref)
        return ref

    def build(self):
        return build_edge_list(self.result, resolve_org(self.result))


def _small_org(org="red"):
    """One object, two fields, a flow that reads one of them and one name that
    resolves to nothing."""
    fixture = Fixture(org)
    fixture.component("CustomObject", "Case")
    fixture.component("CustomField", "Case.Priority")
    fixture.component("CustomField", "Case.Reason__c")
    flow = fixture.component("Flow", "Case_Escalation", start_object="Case")
    fixture.reference(flow, "Priority", relationship="reads",
                      target_type="CustomField", target_parent="Case",
                      file_path="force-app/flows/Case_Escalation.flow-meta.xml",
                      location="decisions[Is_High]/rules/conditions/left")
    fixture.reference(flow, "Nothing_Here__c", relationship="reads",
                      target_type="CustomField", target_parent="Case",
                      file_path="force-app/flows/Case_Escalation.flow-meta.xml",
                      location="decisions[Is_High]/rules/conditions/right")
    return fixture


# ---------------------------------------------------------------------------
# Nothing is dropped, and nothing is invented
# ---------------------------------------------------------------------------

class EveryReferenceBecomesOneEdgeTests(unittest.TestCase):

    def test_one_edge_per_reference(self) -> None:
        edges = _small_org().build()
        self.assertEqual(len(edges.edges), 2)

    def test_an_unresolved_reference_is_still_an_edge(self) -> None:
        edges = _small_org().build()
        unresolved = [e for e in edges.edges if e["resolution"] != RESOLVED]
        self.assertEqual(len(unresolved), 1)
        self.assertNotIn("target", unresolved[0])
        self.assertTrue(unresolved[0]["resolution_detail"],
                        "an unresolved edge must say why")

    def test_a_resolved_edge_names_its_target(self) -> None:
        edges = _small_org().build()
        resolved = [e for e in edges.edges if e["resolution"] == RESOLVED]
        self.assertEqual(len(resolved), 1)
        self.assertEqual(resolved[0]["target"], "red:CustomField:Case.Priority")

    def test_mismatched_lengths_are_refused(self) -> None:
        fixture = _small_org()
        resolution = resolve_org(fixture.result)
        resolution.resolutions.pop()
        with self.assertRaises(ValueError):
            build_edge_list(fixture.result, resolution)

    def test_an_org_with_no_references_still_builds(self) -> None:
        fixture = Fixture()
        fixture.component("CustomObject", "Case")
        edges = fixture.build()
        self.assertEqual(edges.edges, [])
        self.assertEqual(len(edges.components), 1)
        document = json.loads(dumps(edges.edges_document(),
                                    ("components", "edges")))
        self.assertEqual(document["edges"], [])


# ---------------------------------------------------------------------------
# What an edge carries
# ---------------------------------------------------------------------------

class EdgeShapeTests(unittest.TestCase):

    def setUp(self) -> None:
        self.edges = _small_org().build()
        self.resolved = [e for e in self.edges.edges
                         if e["resolution"] == RESOLVED][0]

    def test_the_evidence_names_the_file_element_and_string(self) -> None:
        evidence = self.resolved["evidence"]
        self.assertEqual(evidence["file_path"],
                         "force-app/flows/Case_Escalation.flow-meta.xml")
        self.assertEqual(evidence["location"],
                         "decisions[Is_High]/rules/conditions/left")
        self.assertEqual(evidence["raw_reference"], "Priority")

    def test_every_edge_carries_a_relationship_and_its_category(self) -> None:
        for edge in self.edges.edges:
            self.assertEqual(edge["relationship"], "reads")
            self.assertEqual(edge["category"], "data_access")

    def test_every_edge_carries_a_confidence(self) -> None:
        for edge in self.edges.edges:
            self.assertIn(edge["confidence"], ("high", "medium", "low"))

    def test_the_rule_that_decided_is_on_the_edge(self) -> None:
        self.assertTrue(self.resolved["resolved_by"])

    def test_the_keys_are_in_the_spec_order(self) -> None:
        keys = list(self.resolved)
        self.assertEqual(keys[:6], ["id", "source", "target", "relationship",
                                    "category", "confidence"])
        self.assertEqual(keys[-1], "evidence")

    def test_a_managed_package_edge_names_its_namespace(self) -> None:
        fixture = Fixture()
        flow = fixture.component("Flow", "F")
        fixture.reference(flow, "npsp__Household__c", target_type="CustomObject")
        edge = fixture.build().edges[0]
        self.assertEqual(edge["resolution"], "unresolved_managed_package")
        self.assertEqual(edge["namespace"], "npsp")


# ---------------------------------------------------------------------------
# Ids
# ---------------------------------------------------------------------------

class EdgeIdTests(unittest.TestCase):

    def test_an_id_is_made_from_the_edges_own_content(self) -> None:
        key = ("red:Flow:F", "force-app/f.xml", "element", "reads", "Priority",
               "Case", 0)
        self.assertEqual(edge_id(key), edge_id(key))
        self.assertNotEqual(edge_id(key), edge_id(key[:-1] + (1,)))

    def test_ids_do_not_move_when_another_edge_is_added(self) -> None:
        """The point of a content id: inserting a flow must not renumber
        everything after it, the way a running count would."""
        before = {e["evidence"]["raw_reference"]: e["id"]
                  for e in _small_org().build().edges}

        fixture = _small_org()
        extra = fixture.component("Flow", "AAA_Runs_First", start_object="Case")
        fixture.reference(extra, "Priority", relationship="reads",
                          target_type="CustomField", target_parent="Case",
                          file_path="force-app/flows/AAA.flow-meta.xml",
                          location="start")
        after = {e["evidence"]["raw_reference"]: e["id"]
                 for e in fixture.build().edges
                 if e["source"] == "red:Flow:Case_Escalation"}
        self.assertEqual(before, after)

    def test_the_resolution_is_not_part_of_the_id(self) -> None:
        """A better resolver rule should give an existing edge a target it did
        not have before, not a new id."""
        fixture = _small_org()
        unresolved_id = [e["id"] for e in fixture.build().edges
                         if e["resolution"] != RESOLVED][0]
        fixture.component("CustomField", "Case.Nothing_Here__c")
        now = [e for e in fixture.build().edges
               if e["evidence"]["raw_reference"] == "Nothing_Here__c"][0]
        self.assertEqual(now["resolution"], RESOLVED)
        self.assertEqual(now["id"], unresolved_id)

    def test_identical_references_get_different_ids(self) -> None:
        """A flow with two filters on the same field writes the same named
        element path twice. Both are real references and both must survive."""
        fixture = Fixture()
        fixture.component("CustomObject", "Case")
        fixture.component("CustomField", "Case.Subject")
        flow = fixture.component("Flow", "F", start_object="Case")
        for _ in range(3):
            fixture.reference(flow, "Subject", relationship="filters_on",
                              target_type="CustomField", target_parent="Case",
                              location="start/filters[Subject]/field")
        edges = fixture.build().edges
        self.assertEqual(len(edges), 3)
        self.assertEqual(len({e["id"] for e in edges}), 3)

    def test_the_occurrence_number_is_the_only_thing_separating_them(self) -> None:
        fixture = Fixture()
        flow = fixture.component("Flow", "F")
        ref = fixture.reference(flow, "X", location="same")
        self.assertEqual(content_key(ref, 0)[-1], 0)
        self.assertEqual(content_key(ref, 2)[-1], 2)


# ---------------------------------------------------------------------------
# The reverse index
# ---------------------------------------------------------------------------

class ReverseIndexTests(unittest.TestCase):

    def test_a_resolved_edge_is_filed_under_what_it_points_at(self) -> None:
        edges = _small_org().build()
        entries = edges.by_component["red:CustomField:Case.Priority"]
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]["source"], "red:Flow:Case_Escalation")
        self.assertEqual(entries[0]["relationship"], "reads")

    def test_an_entry_answers_the_question_without_the_edge_file(self) -> None:
        """SPEC requirement 5: what depends on X must be one lookup. An entry
        holding only an edge id would send the reader back to a 200 MB file."""
        entries = _small_org().build().by_component["red:CustomField:Case.Priority"]
        self.assertEqual(set(entries[0]), {"edge", "source", "relationship"})

    def test_an_unresolved_edge_is_filed_under_its_reference_string(self) -> None:
        edges = _small_org().build()
        self.assertIn("Nothing_Here__c", edges.by_unresolved_reference)
        self.assertNotIn("Nothing_Here__c", edges.by_component)

    def test_nothing_is_indexed_twice(self) -> None:
        edges = _small_org().build()
        filed = [entry["edge"] for entries in edges.by_component.values()
                 for entry in entries]
        filed += [entry["edge"] for entries in
                  edges.by_unresolved_reference.values() for entry in entries]
        self.assertEqual(len(filed), len(set(filed)))
        self.assertEqual(len(filed), len(edges.edges))

    def test_several_sources_pointing_at_one_component_are_all_listed(self) -> None:
        fixture = Fixture()
        fixture.component("CustomObject", "Case")
        fixture.component("CustomField", "Case.Priority")
        for name in ("Flow_A", "Flow_B", "Flow_C"):
            flow = fixture.component("Flow", name, start_object="Case")
            fixture.reference(flow, "Priority", relationship="reads",
                              target_type="CustomField", target_parent="Case",
                              file_path=f"force-app/flows/{name}.flow-meta.xml")
        entries = fixture.build().by_component["red:CustomField:Case.Priority"]
        self.assertEqual([e["source"] for e in entries],
                         ["red:Flow:Flow_A", "red:Flow:Flow_B", "red:Flow:Flow_C"])


# ---------------------------------------------------------------------------
# Order and determinism
# ---------------------------------------------------------------------------

class DeterminismTests(unittest.TestCase):

    def test_the_walk_order_does_not_change_the_file(self) -> None:
        """Two machines can walk a folder in different orders. The written file
        must not be able to tell."""
        forwards = _small_org()
        backwards = _small_org()
        backwards.result.references.reverse()
        self.assertEqual(dumps(forwards.build().edges_document(),
                               ("components", "edges")),
                         dumps(backwards.build().edges_document(),
                               ("components", "edges")))

    def test_components_are_sorted_by_id(self) -> None:
        ids = [c["id"] for c in _small_org().build().components]
        self.assertEqual(ids, sorted(ids))

    def test_the_index_keys_are_sorted(self) -> None:
        edges = _small_org().build()
        self.assertEqual(list(edges.by_component), sorted(edges.by_component))

    def test_the_file_uses_the_same_newline_on_every_platform(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            written = write_files(_small_org().build(), folder)
            raw = written["edges"].read_bytes()
        self.assertNotIn(b"\r\n", raw)

    def test_the_written_file_is_valid_json(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            written = write_files(_small_org().build(), folder)
            for path in written.values():
                document = json.loads(path.read_text(encoding="utf-8"))
                self.assertEqual(document["schema_version"], SCHEMA_VERSION)
                self.assertEqual(document["org"], "red")

    def test_one_edge_per_line(self) -> None:
        """A 200 MB file written as one line cannot be searched: a text search
        returns the whole file."""
        text = dumps(_small_org().build().edges_document(),
                     ("components", "edges"))
        lines = [line for line in text.splitlines()
                 if line.startswith('{"id":"e')]
        self.assertEqual(len(lines), 2)
        for line in lines:
            # Every line but the last in the array carries the comma that
            # separates it from the next one.
            json.loads(line.rstrip(","))

    def test_there_is_no_timestamp_in_either_file(self) -> None:
        edges = _small_org().build()
        for document in (edges.edges_document(), edges.reverse_index_document()):
            self.assertNotIn("generated_at", document)


# ---------------------------------------------------------------------------
# The acceptance checks themselves
# ---------------------------------------------------------------------------

class AcceptanceTests(unittest.TestCase):

    def test_a_clean_build_passes_every_check(self) -> None:
        fixture = _small_org()
        resolution = resolve_org(fixture.result)
        edges = build_edge_list(fixture.result, resolution)
        for passed, sentence in acceptance(edges, fixture.result, resolution):
            self.assertTrue(passed, sentence)

    def test_an_edge_from_a_component_that_does_not_exist_fails(self) -> None:
        fixture = _small_org()
        fixture.reference("red:Flow:Not_A_Real_Flow", "Priority",
                          target_type="CustomField", target_parent="Case")
        resolution = resolve_org(fixture.result)
        edges = build_edge_list(fixture.result, resolution)
        results = dict((sentence, passed) for passed, sentence
                       in acceptance(edges, fixture.result, resolution))
        self.assertFalse(all(results.values()))
        self.assertTrue(any("does not exist" in s for s in results if not results[s]))

    def test_an_edge_into_the_other_org_fails(self) -> None:
        fixture = _small_org()
        fixture.result.add_component(ExtractedComponent(
            id="blue:CustomField:Case.Priority", org="blue", type="CustomField",
            api_name="Case.Priority"))
        flow = "red:Flow:Case_Escalation"
        ref = fixture.reference(flow, "Priority", target_type="CustomField")
        resolution = resolve_org(fixture.result)
        edges = build_edge_list(fixture.result, resolution)
        # Force the crossed edge the resolver would never produce, to prove the
        # check would catch one.
        for edge in edges.edges:
            if edge["evidence"]["raw_reference"] == ref.raw and "target" in edge:
                edge["target"] = "blue:CustomField:Case.Priority"
        failed = [s for passed, s in acceptance(edges, fixture.result, resolution)
                  if not passed]
        self.assertTrue(any("cross" in s for s in failed), failed)


# ---------------------------------------------------------------------------
# The real snapshots
# ---------------------------------------------------------------------------

@unittest.skipUnless(PROJECT_ORGS, "this project holds no org metadata")
class RealSnapshotTests(unittest.TestCase):
    """The promises that can only be proved against real metadata.

    Phase 2 turns files into references, phase 3 turns every reference into a
    resolution, and phase 4 must turn every one of those into exactly one edge.
    That has to hold for any org, so these run against whatever this project has.
    """

    extractions: dict = {}
    resolutions: dict = {}
    lists: dict = {}
    smallest: str = ""

    @classmethod
    def setUpClass(cls) -> None:
        for org, root in PROJECT_ORGS.items():
            extraction = extract_org(root, org)
            resolution = Resolver(extraction).resolve_all()
            cls.extractions[org] = extraction
            cls.resolutions[org] = resolution
            cls.lists[org] = build_edge_list(extraction, resolution)
        # The org with the fewest edges carries the tests that write a whole
        # edge list to disk, so the suite stays quick whatever size the biggest
        # org is.
        cls.smallest = min(cls.lists, key=lambda org: len(cls.lists[org].edges))

    def test_every_reference_became_exactly_one_edge(self) -> None:
        for org, edges in self.lists.items():
            self.assertEqual(len(edges.edges),
                             len(self.extractions[org].references),
                             f"{org} lost or invented edges")

    def test_the_totals_have_not_fallen(self) -> None:
        """A floor, not an exact number, so an extractor improvement does not
        break the suite. Only the orgs in MEASURED_EDGE_FLOORS are checked."""
        checked = [org for org in MEASURED_EDGE_FLOORS if org in self.lists]
        if not checked:
            self.skipTest("no measured org in this project")
        for org in checked:
            self.assertGreater(len(self.lists[org].edges),
                               MEASURED_EDGE_FLOORS[org])

    def test_every_edge_id_is_different(self) -> None:
        for org, edges in self.lists.items():
            ids = {edge["id"] for edge in edges.edges}
            self.assertEqual(len(ids), len(edges.edges),
                             f"{org}: two edges share an id")

    def test_no_edge_crosses_orgs(self) -> None:
        for org, edges in self.lists.items():
            for edge in edges.edges:
                self.assertTrue(edge["source"].startswith(f"{org}:"))
                if edge.get("target"):
                    self.assertTrue(edge["target"].startswith(f"{org}:"))

    def test_every_source_and_target_is_a_real_component(self) -> None:
        for org, edges in self.lists.items():
            components = self.extractions[org].components
            for edge in edges.edges:
                self.assertIn(edge["source"], components)
                if edge.get("target"):
                    self.assertIn(edge["target"], components)

    def test_the_reverse_index_and_the_edge_list_agree(self) -> None:
        for org, edges in self.lists.items():
            ids = {edge["id"] for edge in edges.edges}
            filed = set()
            for entries in edges.by_component.values():
                filed.update(entry["edge"] for entry in entries)
            for entries in edges.by_unresolved_reference.values():
                filed.update(entry["edge"] for entry in entries)
            self.assertEqual(filed, ids, f"{org}: the two files disagree")

    def test_every_acceptance_check_passes(self) -> None:
        for org, edges in self.lists.items():
            for passed, sentence in acceptance(edges, self.extractions[org],
                                               self.resolutions[org]):
                self.assertTrue(passed, f"{org}: {sentence}")

    def test_every_edge_uses_one_of_the_five_resolution_values(self) -> None:
        for org, edges in self.lists.items():
            for edge in edges.edges:
                self.assertIn(edge["resolution"], RESOLUTIONS)

    def test_building_the_same_org_twice_gives_the_same_bytes(self) -> None:
        """Two people rebuilding the same snapshot must get identical files.
        The smallest org, because the stability being proved is in the walk, the
        sort and the writer, which are the same code for every org."""
        org = self.smallest
        again = build_edge_list(*self._rebuild(org))
        self.assertEqual(
            dumps(self.lists[org].edges_document(), ("components", "edges")),
            dumps(again.edges_document(), ("components", "edges")))
        self.assertEqual(
            dumps(self.lists[org].reverse_index_document(),
                  ("by_component", "by_unresolved_reference")),
            dumps(again.reverse_index_document(),
                  ("by_component", "by_unresolved_reference")))

    def _rebuild(self, org):
        extraction = extract_org(PROJECT_ORGS[org], org)
        return extraction, Resolver(extraction).resolve_all()

    def test_the_written_files_load_back(self) -> None:
        """The smallest org only: a large edge list runs to hundreds of
        megabytes and writing it in a unit test would make the suite unpleasant
        to run. The writer is the same code for every org."""
        org = self.smallest
        with tempfile.TemporaryDirectory() as folder:
            written = write_files(self.lists[org], folder)
            edges = json.loads(written["edges"].read_text(encoding="utf-8"))
            index = json.loads(written["reverse_index"].read_text(encoding="utf-8"))
        self.assertEqual(len(edges["edges"]), len(self.lists[org].edges))
        self.assertEqual(len(edges["components"]),
                         len(self.lists[org].components))
        self.assertEqual(len(index["by_component"]),
                         len(self.lists[org].by_component))

    def test_profile_edges_are_not_dropped(self) -> None:
        """Profiles are partial evidence, marked as such, never left out. An org
        whose snapshot holds profile files must produce profile edges."""
        for org, edges in self.lists.items():
            has_profiles = any(comp.startswith(f"{org}:Profile:")
                               for comp in self.extractions[org].components)
            if not has_profiles:
                continue
            found = sum(1 for edge in edges.edges
                        if edge["source"].startswith(f"{org}:Profile:"))
            self.assertGreater(found, 0, f"{org}: profile edges disappeared")
            if org in MEASURED_PROFILE_FLOORS:
                self.assertGreater(found, MEASURED_PROFILE_FLOORS[org])


if __name__ == "__main__":
    unittest.main(verbosity=1)

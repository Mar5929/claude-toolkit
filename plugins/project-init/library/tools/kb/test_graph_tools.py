"""Tests for the WI-007 phase 6 tools: the JSON reader and the four features
that moved onto it.

Run: python tools/kb/test_graph_tools.py

Most of these write a tiny edge list to a temporary folder and read it back, so
they run anywhere and say exactly what they are testing. The last group runs
against the real Red and Blue files in `tools/kb/out/` and skips itself when
they have not been built, because two of phase 6's promises can only be shown
there: that the streaming reader gets the same answer as loading the whole file,
and that it does so without loading 213 MB into memory.
"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))

import classify_fields  # noqa: E402
import graph as graph_module  # noqa: E402
from diff_graph import diff_edge_lists, has_differences, render_text  # noqa: E402
from edge_list import dump  # noqa: E402
from graph import Graph, built_orgs, iter_edges, load_components, load_header  # noqa: E402

OUT_DIR = THIS_DIR / "out"


# ---------------------------------------------------------------------------
# Writing a small org by hand
# ---------------------------------------------------------------------------

def component(org, metadata_type, api_name, parent="", **attributes):
    row = {
        "id": f"{org}:{metadata_type}:{api_name}",
        "org": org,
        "type": metadata_type,
        "api_name": api_name,
        "file_path": f"force-app/{org}/main/default/{metadata_type}/{api_name}.xml",
    }
    if parent:
        row["parent"] = parent
    if attributes:
        row["attributes"] = attributes
    return row


def edge(eid, source, relationship, target="", raw="", resolution="resolved",
         confidence="high", file_path="force-app/x.xml", location="element"):
    row = {"id": eid, "source": source}
    if target:
        row["target"] = target
    row.update({
        "relationship": relationship,
        "category": "data_access",
        "confidence": confidence,
        "resolution": resolution,
        "resolved_by": "test",
        "resolution_detail": "written by the test",
        "evidence": {"file_path": file_path, "location": location,
                     "raw_reference": raw or target},
    })
    return row


def write_edge_list(folder, org, components, edges) -> Path:
    """An edges-<org>.json in the same shape build_edges.py writes."""
    document = {
        "schema_version": "1.0",
        "org": org,
        "generated_from": f"force-app/{org}/main/default",
        "notes": ["written by test_graph_tools.py"],
        "counts": {"components": len(components), "edges": len(edges)},
        "components": components,
        "edges": edges,
    }
    path = Path(folder) / f"edges-{org}.json"
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        dump(handle, document, per_line=("components", "edges"))
    return path


def write_reverse_index(folder, org, edges) -> Path:
    by_component = {}
    by_reference = {}
    for row in edges:
        entry = {"edge": row["id"], "source": row["source"],
                 "relationship": row["relationship"]}
        if row.get("target"):
            by_component.setdefault(row["target"], []).append(entry)
        else:
            by_reference.setdefault(
                row["evidence"]["raw_reference"], []).append(entry)
    document = {
        "schema_version": "1.0",
        "org": org,
        "generated_from": f"force-app/{org}/main/default",
        "notes": ["written by test_graph_tools.py"],
        "counts": {},
        "by_component": by_component,
        "by_unresolved_reference": by_reference,
    }
    path = Path(folder) / f"reverse-index-{org}.json"
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        dump(handle, document,
             per_line=("by_component", "by_unresolved_reference"))
    return path


SMALL_COMPONENTS = [
    component("red", "CustomObject", "Case"),
    component("red", "CustomField", "Case.Priority", parent="red:CustomObject:Case",
              field_type="Picklist"),
    component("red", "CustomField", "Case.Age__c", parent="red:CustomObject:Case",
              field_type="Number", is_formula=True),
    component("red", "CustomField", "Case.Child_Count__c",
              parent="red:CustomObject:Case", field_type="Summary",
              summary_operation="count"),
    component("red", "CustomField", "Case.Notes__c",
              parent="red:CustomObject:Case", field_type="Text"),
    component("red", "Flow", "Case_Escalation"),
    component("red", "ApexClass", "CaseService"),
]

SMALL_EDGES = [
    edge("e01", "red:CustomObject:Case", "contains", "red:CustomField:Case.Priority"),
    edge("e02", "red:CustomObject:Case", "contains", "red:CustomField:Case.Notes__c"),
    edge("e03", "red:Flow:Case_Escalation", "writes", "red:CustomField:Case.Priority",
         file_path="force-app/red/main/default/flows/Case_Escalation.flow-meta.xml"),
    edge("e04", "red:Flow:Case_Escalation", "reads", "red:CustomField:Case.Notes__c",
         file_path="force-app/red/main/default/flows/Case_Escalation.flow-meta.xml"),
    edge("e05", "red:ApexClass:CaseService", "invokes", "red:Flow:Case_Escalation",
         confidence="low"),
    edge("e06", "red:CustomField:Case.Age__c", "formula_references",
         "red:CustomField:Case.Priority", confidence="medium"),
    edge("e07", "red:Flow:Case_Escalation", "references", "",
         raw="npsp__Household__c", resolution="unresolved_managed_package"),
]


class SmallOrg(unittest.TestCase):
    """Every test here works on the seven components and seven edges above."""

    def setUp(self) -> None:
        self.folder = tempfile.TemporaryDirectory()
        self.out = Path(self.folder.name)
        self.path = write_edge_list(self.out, "red", SMALL_COMPONENTS, SMALL_EDGES)
        write_reverse_index(self.out, "red", SMALL_EDGES)
        self.graph = Graph("red", self.out)

    def tearDown(self) -> None:
        self.folder.cleanup()


# ---------------------------------------------------------------------------
# The reader
# ---------------------------------------------------------------------------

class TestReader(SmallOrg):

    def test_streaming_gets_every_edge(self) -> None:
        streamed = [row["id"] for row in iter_edges(self.path)]
        self.assertEqual(streamed, [row["id"] for row in SMALL_EDGES])

    def test_streaming_agrees_with_loading_the_whole_file(self) -> None:
        """The file stays a single valid JSON document, so the two must agree.

        That is the point of the one-entry-a-line format: it can be streamed
        AND it can be loaded. If a change ever broke one of those this fails.
        """
        whole = json.loads(self.path.read_text(encoding="utf-8"))
        self.assertEqual([row["id"] for row in whole["edges"]],
                         [row["id"] for row in iter_edges(self.path)])
        self.assertEqual(sorted(row["id"] for row in whole["components"]),
                         sorted(load_components(self.path)))

    def test_the_header_comes_back_without_the_big_blocks(self) -> None:
        header = load_header(self.path)
        self.assertEqual(header["org"], "red")
        self.assertEqual(header["counts"]["edges"], len(SMALL_EDGES))
        self.assertNotIn("edges", header)

    def test_a_missing_build_says_how_to_build_it(self) -> None:
        with tempfile.TemporaryDirectory() as empty:
            with self.assertRaises(SystemExit) as caught:
                Graph("blue", empty)
        self.assertIn("build_edges.py", str(caught.exception))

    def test_built_orgs_lists_what_is_on_disk(self) -> None:
        self.assertEqual(built_orgs(self.out), ["red"])

    def test_the_org_of_a_path_is_its_second_folder(self) -> None:
        self.assertEqual(
            graph_module.org_of_path("force-app/blue/main/default/flows/X.xml"),
            "blue")
        self.assertEqual(graph_module.org_of_path("tools/kb/graph.py"), "")

    def test_a_name_that_matches_several_components_stops(self) -> None:
        """A vague question must never get a confidently wrong answer."""
        with self.assertRaises(SystemExit):
            self.graph.resolve("Case.")

    def test_a_full_api_name_resolves_without_the_org_and_type(self) -> None:
        self.assertEqual(self.graph.resolve("Case.Priority"),
                         "red:CustomField:Case.Priority")

    def test_an_id_resolves_to_itself(self) -> None:
        self.assertEqual(self.graph.resolve("red:Flow:Case_Escalation"),
                         "red:Flow:Case_Escalation")


# ---------------------------------------------------------------------------
# The impact query
# ---------------------------------------------------------------------------

class TestImpact(SmallOrg):

    def test_incident_edges_run_in_both_directions(self) -> None:
        """Anything that NAMES a component breaks when it is renamed, whichever
        way the edge points, so one hop is direction-blind."""
        found = set(self.graph.incident("red:CustomField:Case.Priority"))
        self.assertEqual(found, {"e01", "e03", "e06"})

    def test_where_a_value_comes_from_is_writers_plus_own_inputs(self) -> None:
        self.assertEqual(self.graph.sources_of("red:CustomField:Case.Priority"),
                         ["e03"])
        # A formula's own outgoing references are its inputs.
        self.assertEqual(self.graph.sources_of("red:CustomField:Case.Age__c"),
                         ["e06"])

    def test_a_field_nothing_writes_has_no_sources(self) -> None:
        self.assertEqual(self.graph.sources_of("red:CustomField:Case.Notes__c"), [])

    def test_containment_is_skipped_in_the_multi_hop_walk(self) -> None:
        """An object contains every one of its fields, so one hop through the
        parent would drag in every sibling and the answer would be useless.

        Case has only `contains` edges, so with containment skipped its radius
        is empty. Case.Priority still reaches the flow and the class through
        real connections, which is the point: only the containment route goes.
        """
        self.assertEqual(self.graph.radius("red:CustomObject:Case", 1), {})
        reach = self.graph.radius("red:CustomField:Case.Priority", 2)
        self.assertNotIn("red:CustomObject:Case", reach)
        self.assertIn("red:Flow:Case_Escalation", reach)
        self.assertIn("red:ApexClass:CaseService", reach)

    def test_containment_can_be_kept(self) -> None:
        reach = self.graph.radius("red:CustomObject:Case", 1,
                                  include_contains=True)
        self.assertEqual(sorted(reach), ["red:CustomField:Case.Notes__c",
                                         "red:CustomField:Case.Priority"])

    def test_the_radius_records_the_shortest_distance(self) -> None:
        reach = self.graph.radius("red:CustomField:Case.Priority", 3)
        self.assertEqual(reach["red:Flow:Case_Escalation"][0], 1)
        self.assertEqual(reach["red:ApexClass:CaseService"][0], 2)

    def test_the_starting_component_is_not_in_its_own_radius(self) -> None:
        reach = self.graph.radius("red:CustomField:Case.Priority", 3)
        self.assertNotIn("red:CustomField:Case.Priority", reach)

    def test_fetching_edge_detail_returns_the_whole_edge(self) -> None:
        detail = self.graph.detail(["e03"])
        self.assertEqual(detail["e03"]["evidence"]["file_path"],
                         "force-app/red/main/default/flows/"
                         "Case_Escalation.flow-meta.xml")

    def test_an_unresolved_name_can_be_looked_up_by_its_string(self) -> None:
        self.assertEqual(self.graph.unresolved_named("npsp__Household__c"), ["e07"])


# ---------------------------------------------------------------------------
# The field labels
# ---------------------------------------------------------------------------

class TestFieldLabels(SmallOrg):

    def setUp(self) -> None:
        super().setUp()
        self.labels = classify_fields.classify(self.graph)

    def test_every_field_gets_a_label_and_nothing_else_does(self) -> None:
        self.assertEqual(sorted(self.labels), [
            "red:CustomField:Case.Age__c",
            "red:CustomField:Case.Child_Count__c",
            "red:CustomField:Case.Notes__c",
            "red:CustomField:Case.Priority",
        ])

    def test_a_flow_writer_is_named_as_a_flow(self) -> None:
        row = self.labels["red:CustomField:Case.Priority"]
        self.assertEqual(row["primary_kind"], "flow")
        self.assertEqual(row["writers"], ["red:Flow:Case_Escalation"])

    def test_a_formula_field_is_a_formula_even_with_no_writer(self) -> None:
        """A formula field's `type` is the type of its ANSWER, not the word
        Formula, so the marker on the component is the only thing that says so."""
        self.assertEqual(self.labels["red:CustomField:Case.Age__c"]["primary_kind"],
                         "formula")

    def test_a_rollup_is_a_rollup(self) -> None:
        self.assertEqual(
            self.labels["red:CustomField:Case.Child_Count__c"]["primary_kind"],
            "rollup")

    def test_nothing_writing_it_reads_manual_only(self) -> None:
        row = self.labels["red:CustomField:Case.Notes__c"]
        self.assertEqual(row["primary_kind"], "manual_only")
        self.assertEqual(row["writer_count"], 0)

    def test_manual_only_says_what_it_does_not_mean(self) -> None:
        """The label is the one most likely to be over-read. Its own explanation
        has to carry the caveat, because a reader may never open the README."""
        text = classify_fields.EXPLANATIONS["manual_only"]
        self.assertIn("nothing in this snapshot", text)
        self.assertIn("Apex", text)
        self.assertIn("integration", text)

    def test_a_reads_edge_is_not_a_writer(self) -> None:
        self.assertEqual(self.labels["red:CustomField:Case.Notes__c"]["writers"], [])

    def test_the_saved_file_can_be_read_back(self) -> None:
        classify_fields.write_file(self.graph, self.labels, self.out)
        loaded = classify_fields.load_file("red", self.out)
        self.assertEqual(loaded["red:CustomField:Case.Priority"], "flow")

    def test_every_label_has_an_explanation(self) -> None:
        for name in classify_fields.PRIORITY:
            self.assertIn(name, classify_fields.EXPLANATIONS)


# ---------------------------------------------------------------------------
# The change comparison
# ---------------------------------------------------------------------------

class TestComparison(unittest.TestCase):

    def setUp(self) -> None:
        self.folder = tempfile.TemporaryDirectory()
        self.out = Path(self.folder.name)
        (self.out / "a").mkdir()
        (self.out / "b").mkdir()
        self.old = write_edge_list(self.out / "a", "red", SMALL_COMPONENTS,
                                   SMALL_EDGES)

    def tearDown(self) -> None:
        self.folder.cleanup()

    def later(self, components=None, edges=None) -> Path:
        return write_edge_list(self.out / "b", "red",
                               components if components is not None
                               else SMALL_COMPONENTS,
                               edges if edges is not None else SMALL_EDGES)

    def test_the_same_file_twice_reports_nothing(self) -> None:
        diff = diff_edge_lists(self.old, self.later())
        self.assertFalse(has_differences(diff))
        self.assertIn("the connections are unchanged", render_text(diff))

    def test_an_added_edge_is_reported(self) -> None:
        added = SMALL_EDGES + [edge("e08", "red:ApexClass:CaseService", "writes",
                                    "red:CustomField:Case.Notes__c")]
        diff = diff_edge_lists(self.old, self.later(edges=added))
        self.assertEqual(len(diff["edges_added"]), 1)
        self.assertEqual(diff["edges_removed"], [])
        self.assertIn("CaseService", diff["edges_added"][0])

    def test_a_removed_edge_is_reported(self) -> None:
        diff = diff_edge_lists(self.old, self.later(edges=SMALL_EDGES[:-1]))
        self.assertEqual(len(diff["edges_removed"]), 1)

    def test_an_edge_that_keeps_its_id_but_gains_a_target_is_reported(self) -> None:
        """An edge id is a hash of the edge's content and deliberately leaves
        the resolution out, so improving a resolver rule gives an EXISTING edge
        a target rather than a new id. A set difference alone would miss it."""
        later = [dict(row) for row in SMALL_EDGES]
        later[-1]["target"] = "red:CustomObject:Case"
        later[-1]["resolution"] = "resolved"
        diff = diff_edge_lists(self.old, self.later(edges=later))
        self.assertEqual(diff["edges_added"], [])
        self.assertEqual(diff["edges_removed"], [])
        self.assertEqual(len(diff["edges_changed"]), 1)
        self.assertIn("target", diff["edges_changed"][0]["changed"])
        self.assertIn("resolution", diff["edges_changed"][0]["changed"])

    def test_added_and_removed_components_are_reported(self) -> None:
        fewer = SMALL_COMPONENTS[:-1]
        more = SMALL_COMPONENTS + [component("red", "ApexTrigger", "CaseTrigger")]
        self.assertEqual(
            len(diff_edge_lists(self.old, self.later(components=fewer))
                ["components_removed"]), 1)
        self.assertEqual(
            len(diff_edge_lists(self.old, self.later(components=more))
                ["components_added"]), 1)

    def test_a_file_filter_scopes_the_comparison(self) -> None:
        added = SMALL_EDGES + [
            edge("e08", "red:ApexClass:CaseService", "writes",
                 "red:CustomField:Case.Notes__c",
                 file_path="force-app/red/main/default/classes/CaseService.cls")]
        new = self.later(edges=added)
        self.assertEqual(len(diff_edge_lists(self.old, new)["edges_added"]), 1)
        self.assertEqual(
            len(diff_edge_lists(self.old, new, files=["flows/"])["edges_added"]), 0)
        self.assertEqual(
            len(diff_edge_lists(self.old, new, files=["classes/"])
                ["edges_added"]), 1)

    def test_a_field_label_change_is_reported(self) -> None:
        diff = diff_edge_lists(
            self.old, self.later(),
            old_labels={"red:CustomField:Case.Priority": "manual_only"},
            new_labels={"red:CustomField:Case.Priority": "flow"})
        self.assertEqual(diff["field_label_changes"],
                         [{"field": "red:CustomField:Case.Priority",
                           "before": "manual_only", "after": "flow"}])

    def test_comparing_two_different_orgs_says_so(self) -> None:
        blue_components = [component("blue", "CustomObject", "Case")]
        blue = write_edge_list(self.out / "b", "blue", blue_components, [])
        text = render_text(diff_edge_lists(self.old, blue))
        self.assertIn("two different orgs", text)

    def test_a_missing_file_says_which_one(self) -> None:
        with self.assertRaises(SystemExit) as caught:
            diff_edge_lists(self.old, self.out / "b" / "nothing.json")
        self.assertIn("nothing.json", str(caught.exception))


# ---------------------------------------------------------------------------
# The freshness hook
# ---------------------------------------------------------------------------

class TestFreshnessHook(unittest.TestCase):

    def test_it_watches_force_app_itself_not_a_subfolder(self) -> None:
        """An earlier version watched force-app/main/default, a fixed path a
        project keeping one folder per org does not have, so it silently did
        nothing every turn. If anyone points it back at a subfolder this fails.

        The folder existing is checked only where there is one: this tool also
        lives in a toolkit checkout that holds no Salesforce metadata at all.
        """
        import graph_freshness_hook as hook
        self.assertEqual(hook.FORCE_APP.name, "force-app")
        if (hook.REPO_ROOT / "sfdx-project.json").exists():
            self.assertTrue(hook.FORCE_APP.exists(),
                            "force-app/ is missing from this Salesforce project")

    def test_it_works_out_which_org_a_changed_file_belongs_to(self) -> None:
        import graph_freshness_hook as hook
        self.assertEqual(
            hook.org_of("force-app/red/main/default/flows/X.flow-meta.xml"), "red")
        self.assertEqual(hook.org_of("tools/kb/graph.py"), "")

    def test_it_spots_added_changed_and_deleted_files(self) -> None:
        import graph_freshness_hook as hook
        before = {"a": [1, 2], "b": [1, 2]}
        after = {"a": [1, 2], "b": [9, 2], "c": [1, 1]}
        self.assertEqual(hook.changed_paths(after, before), ["b", "c"])
        self.assertEqual(hook.changed_paths(before, after), ["b", "c"])

    def test_the_drift_file_carries_its_own_instructions(self) -> None:
        """The rule that used to tell agents what to do with this file,
        .claude/rules/dependency-graph.md, was deleted on 2026-08-04. The file
        has to say it itself or nobody will know."""
        import graph_freshness_hook as hook
        self.assertIn("delete this file", hook.WHAT_TO_DO)
        self.assertIn("knowledge/memory/knowledge/", hook.WHAT_TO_DO)
        self.assertIn("README.md", hook.WHAT_TO_DO)


# ---------------------------------------------------------------------------
# Against the real files
# ---------------------------------------------------------------------------

class TestRealOrgs(unittest.TestCase):
    """Skips itself when nobody has run build_edges.py in this checkout."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.orgs = built_orgs(OUT_DIR)
        if not cls.orgs:
            raise unittest.SkipTest(
                "no edge list built; run: python tools/kb/build_edges.py "
                "--org red --org blue")

    def test_the_reader_agrees_with_the_file_own_counts(self) -> None:
        for org in self.orgs:
            path = graph_module.edges_path(org, OUT_DIR)
            header = load_header(path)
            streamed = sum(1 for _ in iter_edges(path))
            self.assertEqual(streamed, header["counts"]["edges"],
                             f"{org}: streamed a different number of edges than "
                             "the file says it holds")
            self.assertEqual(len(load_components(path)),
                             header["counts"]["components"], org)

    def test_every_edge_endpoint_belongs_to_the_org(self) -> None:
        for org in self.orgs:
            for row in iter_edges(graph_module.edges_path(org, OUT_DIR)):
                self.assertTrue(row["source"].startswith(f"{org}:"))
                if row.get("target"):
                    self.assertTrue(row["target"].startswith(f"{org}:"))

    def test_the_reverse_index_answers_the_same_question_as_the_edges(self) -> None:
        """SPEC requirement 5: "what depends on X" is one lookup, never a
        rescan. It is only a real answer if it agrees with the edge list."""
        for org in self.orgs:
            graph = Graph(org, OUT_DIR)
            index = graph_module.load_reverse_index(org, OUT_DIR)["by_component"]
            self.assertEqual(len(index), len(graph.into))
            for target, entries in list(index.items())[:500]:
                self.assertEqual(sorted(e["edge"] for e in entries),
                                 sorted(graph.into[target]), target)

    def test_every_field_gets_exactly_one_label(self) -> None:
        for org in self.orgs:
            graph = Graph(org, OUT_DIR)
            labels = classify_fields.classify(graph)
            fields = [c for c in graph.components.values()
                      if c["type"] == "CustomField"]
            self.assertEqual(len(labels), len(fields), org)
            for row in labels.values():
                self.assertIn(row["primary_kind"], classify_fields.EXPLANATIONS)

    def test_an_impact_query_cites_the_file_every_edge_came_from(self) -> None:
        """SPEC requirement 6: any edge can be traced back to its origin."""
        org = self.orgs[0]
        graph = Graph(org, OUT_DIR)
        busiest = max(graph.components,
                      key=lambda cid: len(graph.incident(cid)))
        detail = graph.detail(graph.incident(busiest)[:200])
        self.assertTrue(detail)
        for row in detail.values():
            self.assertTrue(row["evidence"]["file_path"])
            self.assertTrue(row["evidence"]["location"])

    def test_a_file_compared_against_itself_reports_nothing(self) -> None:
        org = self.orgs[0]
        path = graph_module.edges_path(org, OUT_DIR)
        diff = diff_edge_lists(path, path, files=["objects/Account/"])
        self.assertFalse(has_differences(diff))


if __name__ == "__main__":
    unittest.main(verbosity=1)

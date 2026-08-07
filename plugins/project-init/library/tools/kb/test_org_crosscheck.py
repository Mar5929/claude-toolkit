"""Tests for the WI-007 phase 7 cross-check against the live orgs.

Run: python tools/kb/test_org_crosscheck.py

**Nothing here contacts a Salesforce org.** Every test builds its own tiny
dependency pull, catalog and edge list in a temporary folder. The last group
reads the real pull files in `tools/kb/out/` if they are there and skips itself
if they are not, because two of phase 7's claims can only be shown against real
data: that a component pair is never double-counted, and that no row lands in
both the agreed pile and the disagreed pile.

The tests that matter most are the ones about what must NOT be counted as a
disagreement, because that is the mistake this comparison exists to avoid. A
row the mapper could not read, and a row naming a component the snapshot never
retrieved, are both differences between the two files and neither is evidence
that anybody is wrong.
"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))

import compare_dependencies as compare_module  # noqa: E402
import org_api  # noqa: E402
import org_catalog  # noqa: E402
from compare_dependencies import Mapper, suffixed, type_of  # noqa: E402
from org_api import ROW_CAP, TRUNCATION_MARK, build_soql, row_key  # noqa: E402

BUILD_OUT = THIS_DIR / "out"
ANSWERS = compare_module.ANSWERS_DIR


def component(org, metadata_type, api_name):
    return {
        "id": f"{org}:{metadata_type}:{api_name}",
        "org": org,
        "type": metadata_type,
        "api_name": api_name,
        "file_path": f"force-app/{org}/main/default/{metadata_type}/{api_name}.xml",
    }


def dependency_row(source_id, source_name, source_type,
                   target_id, target_name, target_type,
                   source_namespace=None, target_namespace=None):
    return {
        "MetadataComponentId": source_id,
        "MetadataComponentName": source_name,
        "MetadataComponentType": source_type,
        "MetadataComponentNamespace": source_namespace,
        "RefMetadataComponentId": target_id,
        "RefMetadataComponentName": target_name,
        "RefMetadataComponentType": target_type,
        "RefMetadataComponentNamespace": target_namespace,
    }


def empty_catalog(**parts):
    base = {"objects": {}, "fields": {}, "layouts": {}, "validation_rules": {},
            "quick_actions": {}, "workflow_alerts": {}, "web_links": {},
            "list_views": {}, "field_sets": {}, "flows": {}, "flexipages": {}}
    base.update(parts)
    return base


# ---------------------------------------------------------------------------
# The query builder and the API's limits
# ---------------------------------------------------------------------------

class TestQueryBuilding(unittest.TestCase):

    def test_a_query_with_no_filter_has_no_where_clause(self) -> None:
        soql = build_soql()
        self.assertIn("FROM MetadataComponentDependency", soql)
        self.assertNotIn("WHERE", soql)

    def test_filters_are_sorted_so_two_runs_build_the_same_query(self) -> None:
        one = build_soql({"RefMetadataComponentType": "B",
                          "MetadataComponentType": "A"})
        two = build_soql({"MetadataComponentType": "A",
                          "RefMetadataComponentType": "B"})
        self.assertEqual(one, two)

    def test_an_id_list_becomes_an_IN_clause(self) -> None:
        soql = build_soql(ids=("a", "b"))
        self.assertIn("MetadataComponentId IN ('a', 'b')", soql)

    def test_a_quote_in_a_value_is_escaped_rather_than_ending_the_string(self) -> None:
        soql = build_soql({"MetadataComponentType": "O'Hara"})
        self.assertIn("\\'", soql)

    def test_the_truncation_mark_is_the_cap_itself(self) -> None:
        """A slice holding exactly 2000 rows is assumed cut off.

        The API returns exactly the cap when it truncates and says done: true,
        so a genuine 2000 and a truncated 2000 look identical. Treating both as
        truncated costs an extra query; treating neither as truncated loses
        rows silently, which is what a single unfiltered query does.
        """
        self.assertEqual(TRUNCATION_MARK, ROW_CAP)
        self.assertEqual(ROW_CAP, 2000)


class TestRowKey(unittest.TestCase):

    def test_the_same_row_from_two_slices_is_kept_once(self) -> None:
        row = dependency_row("01p1", "Foo", "ApexClass", "01I1", "Bar", "CustomObject")
        again = dict(row)
        self.assertEqual(row_key(row), row_key(again))

    def test_two_different_targets_are_two_rows(self) -> None:
        one = dependency_row("01p1", "Foo", "ApexClass", "01I1", "Bar", "CustomObject")
        two = dependency_row("01p1", "Foo", "ApexClass", "01I2", "Baz", "CustomObject")
        self.assertNotEqual(row_key(one), row_key(two))


class TestRefusedTypes(unittest.TestCase):

    def test_the_orgs_own_refusal_is_read_back_as_a_coverage_fact(self) -> None:
        """The API failing outright is the strongest evidence of what it covers."""
        pull = {"query_stats": {"errors": [
            "SELECT ... :: The MetadataComponentType value SharingRules is not a "
            "supported type.",
            "SELECT ... :: The RefMetadataComponentType value Workflow is not a "
            "supported type.",
            "SELECT ... :: some other problem entirely",
        ]}}
        self.assertEqual(org_api.refused_types(pull), ["SharingRules", "Workflow"])

    def test_a_pull_with_no_errors_refuses_nothing(self) -> None:
        self.assertEqual(org_api.refused_types({"query_stats": {"errors": []}}), [])


class TestShortId(unittest.TestCase):

    def test_an_18_character_id_and_its_15_character_form_match(self) -> None:
        """The last three characters are a checksum and carry no information."""
        self.assertEqual(org_catalog.short_id("00N0g000003NF4PEAW"),
                         org_catalog.short_id("00N0g000003NF4P"))

    def test_an_empty_id_stays_empty(self) -> None:
        self.assertEqual(org_catalog.short_id(""), "")


# ---------------------------------------------------------------------------
# Mapping one end of a row onto a local component id
# ---------------------------------------------------------------------------

class TestMapping(unittest.TestCase):

    def setUp(self) -> None:
        self.components = {
            c["id"]: c for c in [
                component("blue", "ApexClass", "AccountController"),
                component("blue", "CustomObject", "Implementation__c"),
                component("blue", "CustomObject", "Account"),
                component("blue", "CustomField", "Account.Email__c"),
                component("blue", "CustomField", "Contact.Email__c"),
                component("blue", "Layout", "Opportunity-Renewal Layout"),
                component("blue", "WebLink", "Account.GoogleMaps"),
                component("blue", "CustomMetadata", "MarketCMDT.Central_Coast_CA"),
                component("blue", "Flow", "Case_Escalation"),
            ]
        }
        self.catalog = empty_catalog(
            objects={"01I0g0000004ZxY": "Implementation__c"},
            fields={"00N0g000003NF4P": ["Account", "Email__c"],
                    "00N0g000003NF4Q": ["Contact", "Email__c"]},
            layouts={"00h0g00000UIAaS": ["Opportunity", "Renewal Layout"]},
            web_links={"00b0g0000018fTS": ["Account", "GoogleMaps"]},
        )
        self.mapper = Mapper("blue", self.catalog, self.components)

    def test_a_field_is_named_from_its_id_not_its_name(self) -> None:
        """Two fields called Email__c live on two objects and the API says only
        `Email` for both. The id is what tells them apart."""
        one, why = self.mapper.map_end("00N0g000003NF4PEAW", "Email", "CustomField", "")
        two, _ = self.mapper.map_end("00N0g000003NF4QEAW", "Email", "CustomField", "")
        self.assertEqual(why, "")
        self.assertEqual(one, "blue:CustomField:Account.Email__c")
        self.assertEqual(two, "blue:CustomField:Contact.Email__c")
        self.assertNotEqual(one, two)

    def test_a_field_whose_object_was_never_looked_up_is_unmapped_not_wrong(self) -> None:
        found, why = self.mapper.map_end("00N999999999999AAA", "Email",
                                         "CustomField", "")
        self.assertEqual(found, "")
        self.assertIn("never looked up", why)

    def test_a_custom_object_gets_its_dropped_suffix_back_from_the_catalog(self) -> None:
        found, why = self.mapper.map_end("01I0g0000004ZxYEAU", "Implementation",
                                         "CustomObject", "")
        self.assertEqual(why, "")
        self.assertEqual(found, "blue:CustomObject:Implementation__c")

    def test_a_standard_object_carries_its_own_name_as_its_id(self) -> None:
        found, why = self.mapper.map_end("Account", "Account", "StandardEntity", "")
        self.assertEqual(why, "")
        self.assertEqual(found, "blue:CustomObject:Account")

    def test_a_layout_is_named_object_then_layout_with_a_dash(self) -> None:
        found, why = self.mapper.map_end("00h0g00000UIAaSAAX", "Renewal Layout",
                                         "Layout", "")
        self.assertEqual(why, "")
        self.assertEqual(found, "blue:Layout:Opportunity-Renewal Layout")

    def test_a_web_link_matches_on_its_id_because_its_label_is_not_its_name(self) -> None:
        """The row says `Google Maps`; the file says `GoogleMaps`."""
        found, why = self.mapper.map_end("00b0g0000018fTSAAY", "Google Maps",
                                         "WebLink", "")
        self.assertEqual(why, "")
        self.assertEqual(found, "blue:WebLink:Account.GoogleMaps")

    def test_a_flow_matches_on_its_id_because_the_org_gives_its_label(self) -> None:
        """The single biggest naming gap, 2,553 of Blue's 6,822 rows.

        A dependency row calls a flow `Implementation - Create/Edit`, which is
        its label, and the metadata file calls the same flow
        `Implementation_Create_Edit`. The row's id is a flow VERSION, so the
        catalog resolves it through the flow definition to the api name.
        """
        mapper = Mapper("blue", empty_catalog(
            flows={"3010g000000PoeL": "Implementation_Create_Edit"}),
            {c["id"]: c for c in [
                component("blue", "Flow", "Implementation_Create_Edit")]})
        found, why = mapper.map_end("3010g000000PoeLAAS",
                                    "Implementation - Create/Edit", "Flow", "")
        self.assertEqual(why, "")
        self.assertEqual(found, "blue:Flow:Implementation_Create_Edit")

    def test_a_flow_the_org_does_not_list_is_unmapped_not_matched_by_label(self) -> None:
        mapper = Mapper("blue", empty_catalog(), {})
        found, why = mapper.map_end("3010g000000ZZZZAAA", "Some Flow", "Flow", "")
        self.assertEqual(found, "")
        self.assertIn("Flow", why)

    def test_a_custom_metadata_record_takes_its_object_from_its_type(self) -> None:
        found, why = self.mapper.map_end("m0A4u000000", "Central_Coast_CA",
                                         "MarketCMDT__mdt", "")
        self.assertEqual(why, "")
        self.assertEqual(found, "blue:CustomMetadata:MarketCMDT.Central_Coast_CA")

    def test_a_plain_named_component_matches_on_its_name(self) -> None:
        found, why = self.mapper.map_end("01p0g000", "AccountController",
                                         "ApexClass", "")
        self.assertEqual(why, "")
        self.assertEqual(found, "blue:ApexClass:AccountController")

    def test_a_managed_package_component_is_unmapped_with_its_namespace(self) -> None:
        found, why = self.mapper.map_end("01p0g000", "Foo", "ApexClass", "npsp")
        self.assertEqual(found, "")
        self.assertIn("npsp", why)

    def test_the_bare_RecordType_entity_is_not_a_record_type(self) -> None:
        found, why = self.mapper.map_end("RecordType", "RecordType", "RecordType", "")
        self.assertEqual(found, "")
        self.assertIn("entity itself", why)
        self.assertIn("RecordType", why)

    def test_a_type_no_snapshot_holds_says_so_rather_than_failing_vaguely(self) -> None:
        found, why = self.mapper.map_end("00X000", "Welcome", "EmailTemplate", "")
        self.assertEqual(found, "")
        self.assertIn("EmailTemplate", why)

    def test_an_unknown_name_of_a_known_type_says_which_type_it_looked_in(self) -> None:
        found, why = self.mapper.map_end("01p0g000", "NoSuchClass", "ApexClass", "")
        self.assertEqual(found, "")
        self.assertIn("ApexClass", why)

    def test_a_reason_never_holds_the_component_name(self) -> None:
        """One reason per kind, not one per name.

        Putting the name in the reason gave Blue 400-odd separate reasons all
        saying the same thing, which buried the handful that were worth acting
        on. The names live in the examples instead.
        """
        _found, one = self.mapper.map_end("01p0g000", "NoSuchClass", "ApexClass", "")
        _found, two = self.mapper.map_end("01p0g000", "AlsoMissing", "ApexClass", "")
        self.assertEqual(one, two)
        self.assertNotIn("NoSuchClass", one)


class TestLocalTypeFor(unittest.TestCase):
    """One rule for translating the API's type names, used in both places."""

    def test_a_standard_object_is_a_CustomObject_locally_like_every_object(self) -> None:
        self.assertEqual(compare_module.local_type_for("StandardEntity"),
                         "CustomObject")

    def test_a_custom_metadata_object_becomes_CustomMetadata(self) -> None:
        self.assertEqual(compare_module.local_type_for("MarketCMDT__mdt"),
                         "CustomMetadata")

    def test_a_type_spelled_the_same_way_is_left_alone(self) -> None:
        self.assertEqual(compare_module.local_type_for("ApexClass"), "ApexClass")

    def test_the_mapper_and_the_coverage_check_agree_on_custom_metadata(self) -> None:
        """The bug this guards: the org's own rows landing in the agreed pile
        while the report says the org never mentions that category."""
        components = {c["id"]: c for c in [
            component("blue", "CustomMetadata", "MarketCMDT.Central_Coast_CA"),
            component("blue", "CustomObject", "MarketCMDT__mdt"),
        ]}
        mapper = Mapper("blue", empty_catalog(), components)
        found, _why = mapper.map_end("m0A4u", "Central_Coast_CA",
                                     "MarketCMDT__mdt", "")
        self.assertEqual(type_of(found),
                         compare_module.local_type_for("MarketCMDT__mdt"))


class TestScoringTheSpecExpectations(unittest.TestCase):
    """The agreement share must ignore categories the org never mentions."""

    def rows(self, entries):
        out = []
        for source, target, both, local_only, api_only, reported in entries:
            out.append({"source_type": source, "target_type": target,
                        "both": both, "local_only": local_only,
                        "api_only": api_only,
                        "api_names_a_component_the_snapshot_lacks": 0,
                        "pairs": both + local_only + api_only,
                        "api_reports_this_category": reported,
                        "verdict": ""})
        return out

    def test_a_silent_category_does_not_drag_down_a_perfect_one(self) -> None:
        """Blue's custom metadata records, the case that proves the rule.

        The org reports all 379 record-to-object dependencies and agrees on
        every one. It separately says nothing about 1,081 record-to-field ones.
        Added together that is 26 per cent and reads as a weak API. Kept apart
        it is exact agreement plus a coverage gap.
        """
        rows = self.rows([
            ("CustomMetadata", "CustomObject", 379, 0, 0, True),
            ("CustomMetadata", "CustomField", 0, 1081, 0, False),
        ])
        scored = {r["expectation"]: r for r in compare_module.score_expectations(rows)}
        entry = scored["References from custom metadata records"]
        self.assertEqual(entry["share_of_the_files_answer_the_org_confirmed"], 1.0)
        self.assertEqual(entry["pairs_in_categories_the_org_never_mentions"], 1081)
        self.assertIn("1,081", entry["measured"])

    def test_an_expectation_of_silence_that_is_met_is_recorded_as_held(self) -> None:
        rows = self.rows([("Profile", "CustomField", 0, 8869, 0, False)])
        scored = {r["expectation"]: r for r in compare_module.score_expectations(rows)}
        entry = scored["Permission set and profile field access"]
        self.assertEqual(entry["verdict"], "held")
        self.assertIn("no dependency of this kind at all", entry["measured"])

    def test_an_expectation_of_reliability_the_org_never_meets_did_not_hold(self) -> None:
        rows = self.rows([("Layout", "CustomField", 9, 900, 0, True)])
        scored = {r["expectation"]: r for r in compare_module.score_expectations(rows)}
        entry = scored["Layout and Lightning page contents"]
        self.assertEqual(entry["verdict"], "did NOT hold")

    def test_a_kind_of_connection_the_org_does_not_have_is_untested(self) -> None:
        scored = {r["expectation"]: r for r in compare_module.score_expectations([])}
        for entry in scored.values():
            self.assertEqual(entry["verdict"], "untested")

    # -- the two ratios, added by phase 8 ---------------------------------

    def test_the_two_ratios_point_opposite_ways_on_reds_layouts(self) -> None:
        """The exact case phase 7 got wrong, kept as a test so it cannot return.

        Salesforce reported 1,608 layout-to-field connections in Red and the
        tool found every one of them, plus 3,576 more Salesforce never
        mentioned. Read one way that is 31 per cent, read the other it is 100
        per cent, and only the second is about this tool. Phase 7 reported the
        31 and concluded the tool was bad at layouts.
        """
        rows = self.rows([("Layout", "CustomField", 1608, 3576, 0, True)])
        scored = {r["expectation"]: r
                  for r in compare_module.score_expectations(rows)}
        entry = scored["Layout and Lightning page contents"]

        self.assertEqual(entry["share_of_the_files_answer_the_org_confirmed"],
                         round(1608 / (1608 + 3576), 4))
        self.assertEqual(entry["share_of_the_orgs_answer_the_files_found"], 1.0)
        # The verdict scores SALESFORCE, so a poor showing by the API must not
        # be softened by the tool having done well.
        self.assertEqual(entry["verdict"], "did NOT hold")
        self.assertIn("100%", entry["tool_found_of_the_orgs_answer"])

    def test_the_tool_ratio_divides_by_what_the_org_reported(self) -> None:
        """Not by everything, and not by what only the files found."""
        rows = self.rows([("ApexClass", "CustomField", 60, 500, 40, True)])
        scored = {r["expectation"]: r
                  for r in compare_module.score_expectations(rows)}
        entry = scored["Apex to object and field"]
        self.assertEqual(entry["share_of_the_orgs_answer_the_files_found"],
                         round(60 / 100, 4))
        self.assertIn("60 of the 100 the org reported",
                      entry["tool_found_of_the_orgs_answer"])

    def test_neither_ratio_is_a_miss_rate(self) -> None:
        """Both count agreement. They differ only in the denominator.

        The SPEC and the phase 8 handoff both state the corrected measure as
        `api_only against both + api_only`, which is literally the share the
        tool MISSED. Written that way into code it produces the same mistake
        inverted, so this pins the direction down.
        """
        rows = self.rows([("Layout", "CustomField", 90, 10, 10, True)])
        scored = {r["expectation"]: r
                  for r in compare_module.score_expectations(rows)}
        entry = scored["Layout and Lightning page contents"]
        self.assertEqual(entry["share_of_the_orgs_answer_the_files_found"], 0.9)
        self.assertEqual(entry["share_of_the_files_answer_the_org_confirmed"], 0.9)
        self.assertNotEqual(entry["share_of_the_orgs_answer_the_files_found"], 0.1)

    def test_a_category_the_org_places_no_pair_in_has_no_tool_ratio(self) -> None:
        """0 per cent would read as a failure. There is nothing to find."""
        rows = self.rows([("CustomMetadata", "CustomObject", 0, 315, 0, True)])
        scored = {r["expectation"]: r
                  for r in compare_module.score_expectations(rows)}
        entry = scored["References from custom metadata records"]
        self.assertIn("nothing here to find",
                      entry["tool_found_of_the_orgs_answer"])
        self.assertNotIn("0%", entry["tool_found_of_the_orgs_answer"])

    def test_the_percent_helper_says_n_a_rather_than_zero(self) -> None:
        self.assertEqual(compare_module._percent(51, 51), "100%")
        self.assertEqual(compare_module._percent(9, 51), "18%")
        self.assertEqual(compare_module._percent(0, 0), "n/a")


class TestSuffixGuessing(unittest.TestCase):

    def test_the_plain_name_is_tried_before_any_suffix(self) -> None:
        self.assertEqual(suffixed("Account")[0], "Account")

    def test_every_custom_object_suffix_is_offered(self) -> None:
        candidates = suffixed("Foo")
        for suffix in ("__c", "__mdt", "__e", "__b", "__x"):
            self.assertIn(f"Foo{suffix}", candidates)


class TestTypeOf(unittest.TestCase):

    def test_the_type_comes_out_of_the_middle_of_a_component_id(self) -> None:
        self.assertEqual(type_of("blue:CustomField:Account.Email__c"), "CustomField")

    def test_a_name_holding_a_colon_does_not_break_the_split(self) -> None:
        self.assertEqual(type_of("blue:Layout:Account-A:B"), "Layout")


# ---------------------------------------------------------------------------
# The comparison itself
# ---------------------------------------------------------------------------

class TestComparison(unittest.TestCase):
    """A whole tiny org through the comparison, written to a temporary folder."""

    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        self.components = [
            component("blue", "ApexClass", "AccountController"),
            component("blue", "CustomObject", "Account"),
            component("blue", "CustomField", "Account.Email__c"),
            component("blue", "Flow", "Case_Escalation"),
            component("blue", "Profile", "Admin"),
        ]

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def write_edges(self, edges) -> None:
        path = self.dir / "edges-blue.json"
        with path.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write("{\n")
            handle.write('"schema_version": "1.0",\n')
            handle.write('"org": "blue",\n')
            handle.write('"generated_from": "force-app/blue/main/default",\n')
            handle.write('"components": [\n')
            for index, comp in enumerate(self.components):
                comma = "," if index < len(self.components) - 1 else ""
                handle.write(json.dumps(comp, sort_keys=True) + comma + "\n")
            handle.write("],\n")
            handle.write('"edges": [\n')
            for index, item in enumerate(edges):
                comma = "," if index < len(edges) - 1 else ""
                handle.write(json.dumps(item, sort_keys=True) + comma + "\n")
            handle.write("]\n}\n")

    def edge(self, eid, source, target, relationship="reads"):
        row = {"id": eid, "source": source, "relationship": relationship,
               "category": "data_access", "confidence": "high",
               "resolution": "resolved" if target else "unresolved_unknown",
               "evidence": {"file_path": "force-app/x.xml", "location": "e",
                            "raw_reference": "r"}}
        if target:
            row["target"] = target
        return row

    def write_pull(self, rows, errors=None) -> None:
        payload = {
            "schema_version": "1.0", "org": "blue", "notes": [],
            "query_stats": {"queries": 1, "rows_returned": len(rows),
                            "seconds": 1.0, "errors": errors or []},
            "incomplete_slices": [], "counts": {"rows": len(rows)}, "rows": rows,
        }
        (self.dir / "org-dependencies-blue.json").write_text(
            json.dumps(payload), encoding="utf-8")

    def write_catalog(self, **parts) -> None:
        payload = empty_catalog(**parts)
        payload.update({"schema_version": "1.0", "org": "blue", "notes": [],
                        "counts": {}})
        (self.dir / "org-catalog-blue.json").write_text(
            json.dumps(payload), encoding="utf-8")

    def run_compare(self) -> dict:
        original = compare_module.ANSWERS_DIR
        original_graph = compare_module.graph.DEFAULT_OUT
        original_catalog = org_catalog.ANSWERS_DIR
        try:
            compare_module.ANSWERS_DIR = self.dir
            compare_module.graph.DEFAULT_OUT = self.dir
            org_catalog.ANSWERS_DIR = self.dir
            return compare_module.compare("blue")
        finally:
            compare_module.ANSWERS_DIR = original
            compare_module.graph.DEFAULT_OUT = original_graph
            org_catalog.ANSWERS_DIR = original_catalog

    def test_a_pair_both_sides_found_is_counted_once_as_agreement(self) -> None:
        self.write_edges([self.edge("e1", "blue:ApexClass:AccountController",
                                    "blue:CustomField:Account.Email__c")])
        self.write_pull([dependency_row(
            "01p1", "AccountController", "ApexClass",
            "00N0g000003NF4PEAW", "Email", "CustomField")])
        self.write_catalog(fields={"00N0g000003NF4P": ["Account", "Email__c"]})
        result = self.run_compare()
        self.assertEqual(result["counts"]["both"], 1)
        self.assertEqual(result["counts"]["local_only"], 0)
        self.assertEqual(result["counts"]["api_only"], 0)

    def test_thirteen_edges_between_one_pair_count_as_one_pair(self) -> None:
        """A flow filtering on one field thirteen times is one dependency.

        The local files hold an edge per place a reference appears, because a
        reference has a file and an element. The org reports the dependency
        once. Comparing 13 against 1 would invent a disagreement out of two
        correct answers.
        """
        edges = [self.edge(f"e{n}", "blue:Flow:Case_Escalation",
                           "blue:CustomField:Account.Email__c") for n in range(13)]
        self.write_edges(edges)
        self.write_pull([dependency_row(
            "3010g000000PoeLAAS", "Case - Escalation", "Flow",
            "00N0g000003NF4PEAW", "Email", "CustomField")])
        self.write_catalog(fields={"00N0g000003NF4P": ["Account", "Email__c"]},
                           flows={"3010g000000PoeL": "Case_Escalation"})
        result = self.run_compare()
        self.assertEqual(result["counts"]["local_pairs"], 1)
        self.assertEqual(result["counts"]["both"], 1)
        self.assertEqual(result["counts"]["local_only"], 0)

    def test_a_row_that_cannot_be_read_is_unmapped_and_never_a_disagreement(self) -> None:
        self.write_edges([self.edge("e1", "blue:ApexClass:AccountController",
                                    "blue:CustomField:Account.Email__c")])
        self.write_pull([
            dependency_row("01p1", "AccountController", "ApexClass",
                           "00N0g000003NF4PEAW", "Email", "CustomField"),
            # No catalog entry for this field, so the row cannot be read.
            dependency_row("01p1", "AccountController", "ApexClass",
                           "00N999999999999AAA", "Mystery", "CustomField"),
        ])
        self.write_catalog(fields={"00N0g000003NF4P": ["Account", "Email__c"]})
        result = self.run_compare()
        self.assertEqual(result["counts"]["api_rows_unmapped"], 1)
        self.assertEqual(result["counts"]["api_only"], 0)
        self.assertEqual(result["counts"]["both"], 1)
        self.assertTrue(result["unmapped_rows_by_reason"])
        self.assertTrue(result["unmapped_rows_by_reason"][0]["reason"])

    def test_a_pair_naming_a_component_the_snapshot_lacks_is_kept_apart(self) -> None:
        """The files could not have produced it whatever the reader did."""
        self.write_edges([self.edge("e1", "blue:ApexClass:AccountController",
                                    "blue:CustomField:Account.Email__c")])
        self.write_pull([
            dependency_row("01p1", "AccountController", "ApexClass",
                           "00N0g000003NF4PEAW", "Email", "CustomField"),
            dependency_row("01p1", "AccountController", "ApexClass",
                           "00N0g000003NF4QEAW", "Missing", "CustomField"),
        ])
        self.write_catalog(fields={"00N0g000003NF4P": ["Account", "Email__c"],
                                   # Names a field with no local component.
                                   "00N0g000003NF4Q": ["Ghost__c", "Missing__c"]})
        result = self.run_compare()
        self.assertEqual(
            result["counts"]["api_pairs_naming_a_component_the_snapshot_lacks"], 1)
        self.assertEqual(result["counts"]["api_only"], 0)

    def test_a_category_the_org_never_reports_says_so_instead_of_disagreeing(self) -> None:
        """Profile grants are the case this exists for.

        The org reports no profile dependency at all, so every profile edge in
        the files looks like a disagreement unless the report distinguishes "the
        org says no" from "the org says nothing".
        """
        self.write_edges([
            self.edge("e1", "blue:ApexClass:AccountController",
                      "blue:CustomField:Account.Email__c"),
            self.edge("e2", "blue:Profile:Admin",
                      "blue:CustomField:Account.Email__c", "grants_access"),
        ])
        self.write_pull([dependency_row(
            "01p1", "AccountController", "ApexClass",
            "00N0g000003NF4PEAW", "Email", "CustomField")])
        self.write_catalog(fields={"00N0g000003NF4P": ["Account", "Email__c"]})
        result = self.run_compare()
        rows = {(r["source_type"], r["target_type"]): r
                for r in result["by_category"]}
        profile_row = rows[("Profile", "CustomField")]
        self.assertEqual(profile_row["local_only"], 1)
        self.assertFalse(profile_row["api_reports_this_category"])
        self.assertIn("no dependency of this kind", profile_row["verdict"])
        apex_row = rows[("ApexClass", "CustomField")]
        self.assertTrue(apex_row["api_reports_this_category"])

    def test_an_unresolved_local_edge_has_no_pair_and_is_counted_apart(self) -> None:
        self.write_edges([
            self.edge("e1", "blue:ApexClass:AccountController",
                      "blue:CustomField:Account.Email__c"),
            self.edge("e2", "blue:ApexClass:AccountController", ""),
        ])
        self.write_pull([dependency_row(
            "01p1", "AccountController", "ApexClass",
            "00N0g000003NF4PEAW", "Email", "CustomField")])
        self.write_catalog(fields={"00N0g000003NF4P": ["Account", "Email__c"]})
        result = self.run_compare()
        self.assertEqual(
            result["counts"]["local_edges_that_resolved_to_nothing"], 1)
        self.assertEqual(result["counts"]["local_pairs"], 1)

    def test_every_pair_lands_in_exactly_one_of_the_three_piles(self) -> None:
        self.write_edges([
            self.edge("e1", "blue:ApexClass:AccountController",
                      "blue:CustomField:Account.Email__c"),
            self.edge("e2", "blue:Flow:Case_Escalation",
                      "blue:CustomObject:Account"),
        ])
        self.write_pull([
            dependency_row("01p1", "AccountController", "ApexClass",
                           "00N0g000003NF4PEAW", "Email", "CustomField"),
            dependency_row("01p1", "AccountController", "ApexClass",
                           "Account", "Account", "StandardEntity"),
        ])
        self.write_catalog(fields={"00N0g000003NF4P": ["Account", "Email__c"]})
        result = self.run_compare()
        counts = result["counts"]
        self.assertEqual(counts["both"] + counts["api_only"],
                         counts["api_pairs_both_ends_in_snapshot"])
        self.assertEqual(counts["both"] + counts["local_only"],
                         counts["local_pairs"])

    def test_the_report_says_the_orgs_answer_is_unproven_when_a_slice_was_capped(self) -> None:
        self.write_edges([self.edge("e1", "blue:ApexClass:AccountController",
                                    "blue:CustomField:Account.Email__c")])
        payload = {
            "schema_version": "1.0", "org": "blue", "notes": [],
            "query_stats": {"queries": 1, "rows_returned": 0, "seconds": 1.0,
                            "errors": []},
            "incomplete_slices": [{"slice": {"MetadataComponentType": "Flow"},
                                   "cut_further": False, "reason": "capped"}],
            "counts": {"rows": 0}, "rows": [],
        }
        (self.dir / "org-dependencies-blue.json").write_text(
            json.dumps(payload), encoding="utf-8")
        self.write_catalog()
        result = self.run_compare()
        self.assertTrue(any("not proven complete" in note
                            for note in result["notes"]))

    def test_the_written_report_names_every_category_it_counted(self) -> None:
        self.write_edges([
            self.edge("e1", "blue:ApexClass:AccountController",
                      "blue:CustomField:Account.Email__c"),
            self.edge("e2", "blue:Profile:Admin",
                      "blue:CustomField:Account.Email__c", "grants_access"),
        ])
        self.write_pull([dependency_row(
            "01p1", "AccountController", "ApexClass",
            "00N0g000003NF4PEAW", "Email", "CustomField")])
        self.write_catalog(fields={"00N0g000003NF4P": ["Account", "Email__c"]})
        text = compare_module.markdown(self.run_compare())
        self.assertIn("Profile", text)
        self.assertIn("ApexClass", text)
        self.assertIn("The API is a cross-check, not the truth", text)


# ---------------------------------------------------------------------------
# Against the real files, when they have been built
# ---------------------------------------------------------------------------

class TestAgainstTheRealPulls(unittest.TestCase):

    @classmethod
    def setUpClass(cls) -> None:
        # Whichever orgs have been pulled, named or not: one file per org, so
        # the pulls themselves say which orgs there are.
        pulled = sorted(p.name[len("org-dependencies-"):-len(".json")]
                        for p in ANSWERS.glob("org-dependencies-*.json"))
        cls.orgs = [org for org in pulled
                    if (ANSWERS / f"org-catalog-{org}.json").exists()
                    and (BUILD_OUT / f"edges-{org}.json").exists()]
        if not cls.orgs:
            raise unittest.SkipTest(
                "no pulled org data; run pull_org_dependencies.py and "
                "build_org_catalog.py first")

    def test_the_three_piles_add_up_to_both_sides_with_nothing_left_over(self) -> None:
        for org in self.orgs:
            result = compare_module.compare(org)
            counts = result["counts"]
            self.assertEqual(counts["both"] + counts["api_only"],
                             counts["api_pairs_both_ends_in_snapshot"], org)
            self.assertEqual(counts["both"] + counts["local_only"],
                             counts["local_pairs"], org)
            self.assertEqual(
                counts["api_pairs_both_ends_in_snapshot"]
                + counts["api_pairs_naming_a_component_the_snapshot_lacks"],
                counts["api_pairs"], org)

    def test_every_unmapped_row_carries_a_reason(self) -> None:
        for org in self.orgs:
            result = compare_module.compare(org)
            total = sum(entry["rows"]
                        for entry in result["unmapped_rows_by_reason"])
            self.assertEqual(total, result["counts"]["api_rows_unmapped"], org)
            for entry in result["unmapped_rows_by_reason"]:
                self.assertTrue(entry["reason"].strip(), org)

    def test_every_category_row_adds_up_to_its_own_pair_count(self) -> None:
        for org in self.orgs:
            result = compare_module.compare(org)
            for row in result["by_category"]:
                self.assertEqual(
                    row["both"] + row["local_only"] + row["api_only"],
                    row["pairs"], f"{org} {row['source_type']}")

    def test_the_type_the_API_refuses_outright_is_recorded(self) -> None:
        """Not an absence read as a refusal: the org's own error message."""
        for org in self.orgs:
            pull = org_api.read_rows(ANSWERS / f"org-dependencies-{org}.json")
            refused = org_api.refused_types(pull)
            self.assertTrue(refused, org)
            self.assertIn("SharingRules", refused, org)


if __name__ == "__main__":
    unittest.main(verbosity=1)

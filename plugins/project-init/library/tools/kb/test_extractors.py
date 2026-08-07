"""Tests for the WI-007 phase 2 extractors.

Run: python tools/kb/test_extractors.py

Most of these are written against a small metadata tree built in a temporary
folder, so they run anywhere and depend on no particular org. The last group runs
against whatever real metadata this project holds, because some of the things
phase 2 has to prove (the full spread of metadata types, the Windows long-path
files) only exist there; those tests skip themselves in a project with no
metadata.

A few of them check counts measured in one specific project. Those are listed in
MEASURED below and skip anywhere the named orgs are absent.
"""

from __future__ import annotations

import os
import re
import sys
import tempfile
import unittest
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))

from file_registry import long_path  # noqa: E402
from extractors import extract_org, split_component_id  # noqa: E402
from extractors import interface  # noqa: E402
from extractors.generic import value_is_reference_shaped  # noqa: E402
from extractors.names import (  # noqa: E402
    formula_references, merge_field_references, namespace_of,
    soql_select_fields, soql_where_fields, strip_apex_noise,
)
from extractors.xmlutil import walk  # noqa: E402
from graph import find_repo_root, source_roots  # noqa: E402
from xml.etree import ElementTree as ET  # noqa: E402

REPO_ROOT = find_repo_root()
FORCE_APP = REPO_ROOT / "force-app"

# Every org this project holds metadata for, discovered rather than named.
PROJECT_ORGS = source_roots()

# Counts measured in the project this tool was built in, on 2026-08-04. A project
# without these org names skips the tests that use them.
MEASURED_FILE_COUNTS = {"red": 8996, "blue": 5202}
MEASURED_METADATA_TYPES = 106


def _write(path: Path, text: str) -> None:
    os.makedirs(long_path(path.parent), exist_ok=True)
    with open(long_path(path), "w", encoding="utf-8") as handle:
        handle.write(text)


def _build(root: Path, files: dict) -> None:
    for rel, text in files.items():
        _write(root / rel, text)


def _refs(result, relationship=None, source_type=None):
    out = []
    for ref in result.references:
        if relationship and ref.relationship != relationship:
            continue
        if source_type:
            parts = split_component_id(ref.source_id)
            if not parts or parts[1] != source_type:
                continue
        out.append(ref)
    return out


def _raws(result, relationship=None, source_type=None):
    return {ref.raw for ref in _refs(result, relationship, source_type)}


# ---------------------------------------------------------------------------
# Reading references out of strings
# ---------------------------------------------------------------------------

class FormulaTests(unittest.TestCase):
    """The measured gap: the old pattern only ever matched a name ending __c."""

    def test_standard_fields_are_found_not_only_custom_ones(self) -> None:
        refs = {r["raw"] for r in formula_references(
            'IF(ISPICKVAL(StageName, "Closed Won"), Amount, Custom_Total__c)')}
        self.assertIn("StageName", refs)
        self.assertIn("Amount", refs)
        self.assertIn("Custom_Total__c", refs)

    def test_function_names_are_not_fields(self) -> None:
        refs = {r["raw"] for r in formula_references("IF(ISBLANK(Amount), 0, Amount)")}
        self.assertEqual({"Amount"}, refs)

    def test_cross_object_references_survive(self) -> None:
        refs = formula_references("Account.Industry & Owner.Manager.Email")
        by_raw = {r["raw"]: r["kind"] for r in refs}
        self.assertEqual("traversal", by_raw["Account.Industry"])
        self.assertEqual("traversal", by_raw["Owner.Manager.Email"])

    def test_globals_are_reported_with_their_own_target_type(self) -> None:
        refs = {r["raw"]: r["global_name"] for r in formula_references(
            "$User.ProfileId & $Label.Warning_Text")}
        self.assertEqual("User", refs["$User.ProfileId"])
        self.assertEqual("CustomLabel", refs["$Label.Warning_Text"])

    def test_text_inside_quotes_is_a_value_not_a_field(self) -> None:
        refs = {r["raw"] for r in formula_references('"Priority" & Priority')}
        self.assertEqual({"Priority"}, refs)

    def test_literals_are_not_fields(self) -> None:
        self.assertEqual([], formula_references("TRUE"))
        self.assertEqual([], formula_references("NULL"))

    def test_merge_fields_are_read_as_formulas(self) -> None:
        refs = {r["raw"] for r in merge_field_references(
            "/apex/Page?id={!Account.Id}&owner={!$User.Id}")}
        self.assertEqual({"Account.Id", "$User.Id"}, refs)


class NamespaceTests(unittest.TestCase):
    def test_a_managed_package_prefix_is_found(self) -> None:
        self.assertEqual("npsp", namespace_of("npsp__Household__c"))

    def test_a_custom_suffix_is_not_a_namespace(self) -> None:
        self.assertEqual("", namespace_of("Household__c"))
        self.assertEqual("", namespace_of("Setting__mdt"))


class SoqlTests(unittest.TestCase):
    def test_parent_traversal_is_kept(self) -> None:
        fields = soql_select_fields("Id, Name, Account.Industry")
        self.assertIn("Account.Industry", fields)

    def test_subqueries_and_functions_are_dropped(self) -> None:
        fields = soql_select_fields("Id, COUNT(Name), (SELECT Id FROM Contacts)")
        self.assertEqual(["Id"], fields)

    def test_where_clause_fields_are_found(self) -> None:
        fields = soql_where_fields("WHERE StageName = 'Won' ORDER BY CloseDate")
        self.assertIn("StageName", fields)
        self.assertIn("CloseDate", fields)
        self.assertNotIn("WHERE", fields)

    def test_comments_and_strings_are_blanked_but_lines_are_kept(self) -> None:
        source = "line one\n// a comment with Account.Name\nline three"
        stripped = strip_apex_noise(source)
        self.assertEqual(source.count("\n"), stripped.count("\n"))
        self.assertNotIn("Account.Name", stripped)


class ValueShapeTests(unittest.TestCase):
    def test_an_api_name_passes_and_prose_does_not(self) -> None:
        self.assertTrue(value_is_reference_shaped("Case.Priority", "api"))
        self.assertFalse(value_is_reference_shaped("A sentence here.", "api"))

    def test_a_loose_value_allows_the_spaces_a_layout_name_has(self) -> None:
        self.assertTrue(value_is_reference_shaped("Account-Account Layout", "loose"))

    def test_true_and_false_are_settings_not_references(self) -> None:
        self.assertFalse(value_is_reference_shaped("true", "api"))
        self.assertFalse(value_is_reference_shaped("false", "loose"))


class ElementPathTests(unittest.TestCase):
    def test_repeated_elements_are_told_apart_by_their_own_name(self) -> None:
        root = ET.fromstring(
            "<Flow><decisions><name>Is_High</name><rules>"
            "<conditions><leftValueReference>$Record.Priority</leftValueReference>"
            "</conditions></rules></decisions>"
            "<decisions><name>Is_Low</name></decisions></Flow>"
        )
        paths = {path for _elem, path in walk(root)}
        self.assertIn("decisions[Is_High]", paths)
        self.assertIn("decisions[Is_Low]", paths)
        self.assertIn(
            "decisions[Is_High]/rules/conditions/leftValueReference", paths)

    def test_a_single_child_needs_no_qualifier(self) -> None:
        root = ET.fromstring("<Flow><start><object>Case</object></start></Flow>")
        paths = {path for _elem, path in walk(root)}
        self.assertEqual({"start", "start/object"}, paths)


# ---------------------------------------------------------------------------
# The extractors, over a small tree
# ---------------------------------------------------------------------------

FIELD_LOOKUP = """<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>Owner_Account__c</fullName>
    <referenceTo>Account</referenceTo>
    <relationshipName>OwnedCases</relationshipName>
    <type>Lookup</type>
</CustomField>
"""

FIELD_MASTER_DETAIL = """<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>Parent_Case__c</fullName>
    <referenceTo>Case</referenceTo>
    <type>MasterDetail</type>
</CustomField>
"""

FIELD_FORMULA = """<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>Age_Label__c</fullName>
    <formula>IF(ISPICKVAL(Priority, "High"), TEXT(Amount), Custom_Note__c)</formula>
    <type>Formula</type>
</CustomField>
"""

FLOW_WITH_EVERYTHING = """<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>62.0</apiVersion>
    <status>Active</status>
    <start>
        <object>Case</object>
        <triggerType>RecordAfterSave</triggerType>
    </start>
    <subflows>
        <name>Call_Helper</name>
        <flowName>Helper_Flow</flowName>
    </subflows>
    <actionCalls>
        <name>Send_it</name>
        <actionName>Case.Case_Received</actionName>
        <actionType>emailAlert</actionType>
    </actionCalls>
    <actionCalls>
        <name>Run_apex</name>
        <actionName>CaseRouter</actionName>
        <actionType>apex</actionType>
    </actionCalls>
    <recordDeletes>
        <name>Drop_old</name>
        <object>Case_Log__c</object>
    </recordDeletes>
    <recordUpdates>
        <name>Set_status</name>
        <inputReference>$Record</inputReference>
        <inputAssignments>
            <field>Status</field>
        </inputAssignments>
    </recordUpdates>
</Flow>
"""

PERMISSION_SET = """<?xml version="1.0" encoding="UTF-8"?>
<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">
    <label>Case Team</label>
    <fieldPermissions>
        <editable>true</editable>
        <field>Case.Priority</field>
        <readable>true</readable>
    </fieldPermissions>
    <objectPermissions>
        <allowCreate>true</allowCreate>
        <allowDelete>false</allowDelete>
        <allowEdit>true</allowEdit>
        <allowRead>true</allowRead>
        <modifyAllRecords>false</modifyAllRecords>
        <object>Case</object>
        <viewAllRecords>false</viewAllRecords>
    </objectPermissions>
    <classAccesses>
        <apexClass>CaseRouter</apexClass>
        <enabled>true</enabled>
    </classAccesses>
</PermissionSet>
"""

APEX_CLASS = """public with sharing class CaseRouter extends BaseRouter implements Queueable {
    public void run() {
        List<Case> cases = [SELECT Id, Priority, Account.Industry FROM Case
                            WHERE Status = 'New'];
        for (Case c : cases) {
            c.Priority = 'High';
        }
        update cases;
        Account a = new Account(Name = 'x', Industry = 'Tech');
        insert a;
        String warning = System.Label.Case_Warning;
        // a comment mentioning Ignored__c
    }
}
"""

LIST_VIEW = """<?xml version="1.0" encoding="UTF-8"?>
<ListView xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>Open_Cases</fullName>
    <columns>CASES.STATUS</columns>
    <columns>Priority</columns>
    <filters>
        <field>Status</field>
        <operation>equals</operation>
    </filters>
    <label>Open Cases</label>
</ListView>
"""

LAYOUT = """<?xml version="1.0" encoding="UTF-8"?>
<Layout xmlns="http://soap.sforce.com/2006/04/metadata">
    <layoutSections>
        <label>Information</label>
        <layoutColumns>
            <layoutItems>
                <behavior>Edit</behavior>
                <field>Priority</field>
            </layoutItems>
        </layoutColumns>
    </layoutSections>
    <quickActionList>
        <quickActionListItems>
            <quickActionName>Case.LogACall</quickActionName>
        </quickActionListItems>
    </quickActionList>
</Layout>
"""

UNKNOWN_TYPE = """<?xml version="1.0" encoding="UTF-8"?>
<SomethingNew xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>Widget</fullName>
    <object>Case</object>
    <apexClass>CaseRouter</apexClass>
</SomethingNew>
"""

STATIC_RESOURCE_META = """<?xml version="1.0" encoding="UTF-8"?>
<StaticResource xmlns="http://soap.sforce.com/2006/04/metadata">
    <cacheControl>Public</cacheControl>
    <contentType>text/javascript</contentType>
</StaticResource>
"""

SMALL_TREE = {
    "objects/Case/Case.object-meta.xml":
        '<?xml version="1.0"?><CustomObject xmlns="http://soap.sforce.com/2006/04/'
        'metadata"><sharingModel>Private</sharingModel></CustomObject>',
    "objects/Case/fields/Owner_Account__c.field-meta.xml": FIELD_LOOKUP,
    "objects/Case/fields/Parent_Case__c.field-meta.xml": FIELD_MASTER_DETAIL,
    "objects/Case/fields/Age_Label__c.field-meta.xml": FIELD_FORMULA,
    "objects/Case/listViews/Open_Cases.listView-meta.xml": LIST_VIEW,
    "objects/Account/Account.object-meta.xml":
        '<?xml version="1.0"?><CustomObject xmlns="http://soap.sforce.com/2006/04/'
        'metadata"><sharingModel>Private</sharingModel></CustomObject>',
    "flows/Case_Router.flow-meta.xml": FLOW_WITH_EVERYTHING,
    "permissionsets/Case_Team.permissionset-meta.xml": PERMISSION_SET,
    "classes/CaseRouter.cls": APEX_CLASS,
    "classes/CaseRouter.cls-meta.xml":
        '<?xml version="1.0"?><ApexClass xmlns="http://soap.sforce.com/2006/04/'
        'metadata"><apiVersion>62.0</apiVersion><status>Active</status></ApexClass>',
    "classes/BaseRouter.cls": "public abstract class BaseRouter {}",
    "layouts/Case-Case Layout.layout-meta.xml": LAYOUT,
    "somethingNew/Widget.brandNewType-meta.xml": UNKNOWN_TYPE,
    "staticresources/Utils.resource-meta.xml": STATIC_RESOURCE_META,
    "staticresources/Utils.js": "var x = 1;",
    ".gitkeep": "",
}


class SmallTreeTests(unittest.TestCase):
    """One temporary org holding one of nearly everything."""

    @classmethod
    def setUpClass(cls) -> None:
        cls._tmp = tempfile.TemporaryDirectory()
        cls.root = Path(cls._tmp.name) / "default"
        _build(cls.root, SMALL_TREE)
        cls.result = extract_org(cls.root, "test")

    @classmethod
    def tearDownClass(cls) -> None:
        cls._tmp.cleanup()

    # -- coverage ------------------------------------------------------

    def test_every_file_gets_exactly_one_outcome(self) -> None:
        self.assertEqual(len(SMALL_TREE), len(self.result.outcomes))
        paths = [o.file_path for o in self.result.outcomes]
        self.assertEqual(len(paths), len(set(paths)))

    def test_no_file_produces_nothing_without_saying_why(self) -> None:
        unexplained = self.result.unexplained_zero_files()
        self.assertEqual([], [o.file_path for o in unexplained])

    def test_a_type_with_no_extractor_still_produces_references(self) -> None:
        """The generic pass is what makes all 106 types produce something."""
        raws = _raws(self.result, source_type="BrandNewType")
        self.assertEqual({"Case", "CaseRouter"}, raws)

    def test_static_resource_content_is_recorded_as_deliberately_unread(self) -> None:
        outcomes = [o for o in self.result.outcomes
                    if o.metadata_type == "StaticResource"]
        self.assertEqual(2, len(outcomes))
        for outcome in outcomes:
            self.assertFalse(outcome.opened)
            self.assertIn("static resource", outcome.reason)

    def test_a_non_metadata_file_is_recorded_with_its_reason(self) -> None:
        outcome = next(o for o in self.result.outcomes
                       if o.file_path.endswith(".gitkeep"))
        self.assertFalse(outcome.opened)
        self.assertTrue(outcome.reason)

    # -- the measured gaps ---------------------------------------------

    def test_lookup_and_master_detail_now_exist(self) -> None:
        self.assertEqual({"Account"}, _raws(self.result, "lookup"))
        self.assertEqual({"Case"}, _raws(self.result, "master_detail"))

    def test_a_formula_reaches_standard_fields(self) -> None:
        raws = _raws(self.result, "formula_references")
        self.assertIn("Priority", raws)
        self.assertIn("Amount", raws)
        self.assertIn("Custom_Note__c", raws)
        self.assertNotIn("ISPICKVAL", raws)
        self.assertNotIn("TEXT", raws)

    def test_a_flow_subflow_and_action_calls_now_exist(self) -> None:
        self.assertEqual({"Helper_Flow"}, _raws(self.result, "calls_subflow"))
        self.assertEqual({"Case.Case_Received"},
                         _raws(self.result, "sends_email_alert"))
        apex_from_flow = _raws(self.result, "invokes", source_type="Flow")
        self.assertIn("CaseRouter", apex_from_flow)

    def test_a_flow_record_delete_now_exists(self) -> None:
        self.assertEqual({"Case_Log__c"},
                         _raws(self.result, "deletes", source_type="Flow"))

    def test_permission_set_object_and_class_access_now_exist(self) -> None:
        self.assertEqual({"Case"}, _raws(self.result, "grants_object_read"))
        self.assertEqual({"Case"}, _raws(self.result, "grants_object_create"))
        self.assertEqual({"Case"}, _raws(self.result, "grants_object_edit"))
        self.assertEqual(set(), _raws(self.result, "grants_object_delete"))
        self.assertEqual({"CaseRouter"}, _raws(self.result, "grants_apex_access"))

    def test_a_permission_set_grants_read_and_edit_separately(self) -> None:
        read = _refs(self.result, "grants_field_read")
        edit = _refs(self.result, "grants_field_edit")
        self.assertEqual(["Case.Priority"], [r.raw for r in read])
        self.assertEqual(["Case.Priority"], [r.raw for r in edit])
        self.assertNotEqual(read[0].location, edit[0].location)

    def test_apex_writes_now_exist(self) -> None:
        writes = _refs(self.result, "writes", source_type="ApexClass")
        raws = {r.raw for r in writes}
        self.assertIn("Priority", raws)      # c.Priority = 'High'
        self.assertIn("Case", raws)          # update cases
        self.assertIn("Name", raws)          # new Account(Name = ...)
        self.assertIn("Account", raws)       # insert a

    def test_apex_reads_a_custom_label(self) -> None:
        self.assertIn("Case_Warning",
                      _raws(self.result, "references", source_type="ApexClass"))

    def test_apex_inheritance_is_recorded(self) -> None:
        self.assertEqual({"BaseRouter"}, _raws(self.result, "extends"))

    def test_apex_soql_keeps_parent_traversal(self) -> None:
        reads = _raws(self.result, "reads", source_type="ApexClass")
        self.assertIn("Account.Industry", reads)

    def test_a_comment_is_not_a_reference(self) -> None:
        self.assertNotIn("Ignored__c", {r.raw for r in self.result.references})

    def test_list_views_and_layouts_are_opened(self) -> None:
        list_view = _raws(self.result, source_type="ListView")
        self.assertIn("CASES.STATUS", list_view)     # legacy token, kept as written
        self.assertIn("Priority", list_view)
        layout = _raws(self.result, source_type="Layout")
        self.assertIn("Priority", layout)
        self.assertIn("Case.LogACall", layout)

    # -- traceability ---------------------------------------------------

    def test_every_reference_says_where_it_came_from(self) -> None:
        for ref in self.result.references:
            self.assertTrue(ref.file_path, ref)
            self.assertTrue(ref.location, ref)
            self.assertTrue(ref.raw, ref)
            self.assertTrue(ref.source_id, ref)
            self.assertIn(ref.confidence, ("high", "medium", "low"), ref)

    def test_every_id_carries_its_org(self) -> None:
        for component in self.result.components.values():
            self.assertTrue(component.id.startswith("test:"), component.id)
        for ref in self.result.references:
            self.assertTrue(ref.source_id.startswith("test:"), ref.source_id)

    def test_a_bare_field_name_carries_the_object_it_belongs_to(self) -> None:
        layout_fields = [r for r in _refs(self.result, "displays",
                                          source_type="Layout")
                         if r.raw == "Priority"]
        self.assertEqual(1, len(layout_fields))
        self.assertEqual("Case", layout_fields[0].target_parent)

    def test_the_generic_pass_does_not_repeat_a_deep_extractor(self) -> None:
        """Both passes read a permission set's field element; only one is kept."""
        seen = set()
        for ref in self.result.references:
            key = (ref.source_id, ref.location, ref.raw)
            self.assertNotIn(key, seen, f"duplicate reference: {key}")
            seen.add(key)

    def test_element_paths_look_like_the_spec_says(self) -> None:
        subflow = _refs(self.result, "calls_subflow")[0]
        self.assertEqual("subflows[Call_Helper]/flowName", subflow.location)

    def test_apex_references_carry_a_line_number(self) -> None:
        for ref in _refs(self.result, source_type="ApexClass"):
            self.assertTrue(ref.location.startswith("line ")
                            or ", SOQL" in ref.location, ref.location)


class MalformedFileTests(unittest.TestCase):
    def test_a_file_that_will_not_parse_is_an_error_not_a_crash(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "default"
            _build(root, {"flows/Broken.flow-meta.xml": "<Flow><unclosed>"})
            result = extract_org(root, "test")
            self.assertEqual(1, len(result.outcomes))
            outcome = result.outcomes[0]
            self.assertTrue(outcome.error)
            self.assertTrue(outcome.reason)
            self.assertEqual([], result.unexplained_zero_files())

    def test_an_empty_file_is_reported_rather_than_skipped(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "default"
            _build(root, {"flows/Empty.flow-meta.xml": ""})
            result = extract_org(root, "test")
            self.assertIn("empty", result.outcomes[0].error)


class LongPathTests(unittest.TestCase):
    """Phase 1's finding: a plain open() silently misses these on Windows."""

    def test_a_file_past_260_characters_is_opened(self) -> None:
        tmp = Path(tempfile.mkdtemp())
        try:
            deep = tmp / "default" / "flows"
            segment = "padding_folder_name_that_is_quite_long_0123456789"
            while len(str(deep)) < 240:
                deep = deep / segment
            target = deep / "Deep_Flow.flow-meta.xml"
            _write(target, FLOW_WITH_EVERYTHING)
            self.assertGreater(len(str(target)), 260)

            result = extract_org(tmp / "default", "test")
            self.assertEqual(1, len(result.outcomes))
            self.assertTrue(result.outcomes[0].opened,
                            result.outcomes[0].reason or result.outcomes[0].error)
            self.assertGreater(result.outcomes[0].reference_count, 0)
        finally:
            long_root = long_path(tmp)
            for dirpath, dirnames, filenames in os.walk(long_root, topdown=False):
                for name in filenames:
                    os.remove(os.path.join(dirpath, name))
                for name in dirnames:
                    os.rmdir(os.path.join(dirpath, name))
            os.rmdir(long_root)


# ---------------------------------------------------------------------------
# Against this project's real metadata
# ---------------------------------------------------------------------------

@unittest.skipUnless(PROJECT_ORGS, "this project holds no org metadata")
class RealSnapshotTests(unittest.TestCase):
    """These take a few minutes; they run once and every test reads the result."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.results = {org: extract_org(root, org)
                       for org, root in PROJECT_ORGS.items()}

    def test_every_file_in_every_org_is_accounted_for(self) -> None:
        # Both counts dropped by one on 2026-08-04, when main removed the two
        # files that were in the tree by accident: one org's graphify-out
        # artifact and the other's lwc/jsconfig.json.
        checked = [org for org in MEASURED_FILE_COUNTS if org in self.results]
        if not checked:
            self.skipTest("no measured org in this project")
        for org in checked:
            self.assertEqual(MEASURED_FILE_COUNTS[org],
                             len(self.results[org].outcomes), org)

    def test_no_file_in_any_org_produces_nothing_without_a_reason(self) -> None:
        for org, result in self.results.items():
            unexplained = result.unexplained_zero_files()
            self.assertEqual([], [o.file_path for o in unexplained][:20], org)

    def test_every_metadata_type_present_is_covered_in_one_pass(self) -> None:
        """Every type found on disk produces a stated result, whatever the count.

        The exact number is a fact about one project, so it is only asserted
        when that project's orgs are the ones being read.
        """
        types = set()
        for result in self.results.values():
            types.update(o.metadata_type for o in result.outcomes)
        types.discard("NotMetadata")
        self.assertGreater(len(types), 0)
        if set(MEASURED_FILE_COUNTS) <= set(self.results):
            self.assertEqual(MEASURED_METADATA_TYPES, len(types), sorted(types))

    def test_every_metadata_type_produces_a_stated_result(self) -> None:
        """Either references, or a reason on every file of that type."""
        for org, result in self.results.items():
            by_type: dict = {}
            for outcome in result.outcomes:
                entry = by_type.setdefault(outcome.metadata_type,
                                           {"refs": 0, "silent": []})
                entry["refs"] += outcome.reference_count
                if outcome.reference_count == 0 and not (outcome.reason
                                                         or outcome.error):
                    entry["silent"].append(outcome.file_path)
            for mtype, entry in by_type.items():
                self.assertEqual([], entry["silent"], f"{org} {mtype}")

    def test_the_gaps_the_audit_measured_at_zero_are_closed(self) -> None:
        combined = []
        for result in self.results.values():
            combined.extend(result.references)

        def count(test):
            total = 0
            for ref in combined:
                parts = split_component_id(ref.source_id)
                if test(ref, parts[1] if parts else ""):
                    total += 1
            return total

        checks = {
            "referenceTo lookups":
                lambda r, s: r.relationship in ("lookup", "master_detail"),
            "flow subflows":
                lambda r, s: r.relationship == "calls_subflow",
            "flow action calls":
                lambda r, s: s == "Flow" and "action_type" in r.attributes,
            "flow record deletes":
                lambda r, s: s == "Flow" and r.relationship == "deletes",
            "permission set object permissions":
                lambda r, s: (s == "PermissionSet"
                              and r.relationship.startswith("grants_object")),
            "apex class access":
                lambda r, s: (s in ("PermissionSet", "Profile")
                              and r.relationship == "grants_apex_access"),
            "formulas on standard fields":
                lambda r, s: (r.relationship == "formula_references"
                              and not r.raw.endswith("__c") and "." not in r.raw),
            "apex writes":
                lambda r, s: (s in ("ApexClass", "ApexTrigger")
                              and r.relationship in ("writes", "deletes")),
            "list views and web links":
                lambda r, s: s in ("ListView", "WebLink"),
            "layouts and Lightning pages":
                lambda r, s: s in ("Layout", "FlexiPage"),
            "profiles": lambda r, s: s == "Profile",
        }
        for name, test in checks.items():
            self.assertGreater(count(test), 0, f"still zero: {name}")

    def test_the_deepest_files_in_each_org_are_read_without_error(self) -> None:
        """The files most at risk from the Windows 260-character path limit.

        How far past 260 a path goes depends on where the repository sits on
        disk, so this cannot assert that any file crosses the line: in a
        worktree under `.claude/worktrees/` several do, and in the primary
        checkout none do. What it can assert is that the longest paths in each
        org were opened and read with no file error, which is the thing the
        limit would break. `LongPathTests` above is the guard that builds a
        path over 260 characters deliberately and proves it opens.
        """
        for org, result in self.results.items():
            deepest = sorted(result.outcomes,
                             key=lambda o: len(o.file_path), reverse=True)[:20]
            self.assertEqual(20, len(deepest), org)
            for outcome in deepest:
                self.assertNotIn("file read error", outcome.error,
                                 f"{org} {outcome.file_path}")
                self.assertTrue(outcome.opened or outcome.reason,
                                f"{org} {outcome.file_path}")

    def test_no_reference_crosses_an_org(self) -> None:
        for org, result in self.results.items():
            for ref in result.references:
                self.assertTrue(ref.source_id.startswith(f"{org}:"), ref.source_id)
                self.assertEqual(org, ref.org)

    # -- what phase 8 fixed, held in place --------------------------------

    def test_no_unlisted_layout_prefix_lays_out_another_objects_fields(self) -> None:
        """The safeguard for the bug phase 8 found, over both real snapshots.

        A layout is named `Object-Layout Name`, except for a handful Salesforce
        names for a screen instead: `CaseClose-Close Case Layout` lays out fields
        that live on `Case`. Left untranslated that hands the resolver an object
        that does not exist and every field on the layout drops out of the graph
        in silence. It cost about 940 field references across these two orgs.

        Two different things produce a prefix that is not an object folder, and
        only one of them is a bug:

        * a pseudo-entity, whose fields all live on some OTHER object; and
        * a layout for a real object the retrieve simply never brought back
          (`ActionPlanTemplate`, `ApiAnomalyEventStore`, and 14 more). The
          prefix is the right object name and there is nothing to fix.

        What separates them is where the fields are. A pseudo-entity's fields
        are found, every one of them, on one other object. A layout for an
        absent object matches nothing in particular: the best any of them
        manages is `OutgoingEmail` at six of seven against `EmailMessage`, and
        most are under half.

        So this fails only on an unlisted prefix whose fields are found
        completely on one other object. Five fields minimum, because two
        standard field names matching by chance is not evidence.
        """
        for org, base in PROJECT_ORGS.items():
            if not (base / "objects").is_dir() or not (base / "layouts").is_dir():
                continue
            objects = {p.name for p in (base / "objects").iterdir() if p.is_dir()}
            fields_by_object = {
                p.name: {f.name[: -len(".field-meta.xml")]
                         for f in (p / "fields").glob("*.field-meta.xml")}
                for p in (base / "objects").iterdir()
                if p.is_dir() and (p / "fields").exists()
            }
            offenders = []
            for path in sorted((base / "layouts").glob("*.layout-meta.xml")):
                name = path.name[: -len(".layout-meta.xml")]
                prefix = name.split("-", 1)[0] if "-" in name else ""
                if not prefix or prefix in objects:
                    continue
                if prefix in interface._LAYOUT_PSEUDO_ENTITIES:
                    continue
                text = path.read_text(encoding="utf-8", errors="replace")
                named = set(re.findall(r"<field>([^<]+)</field>", text))
                if len(named) < 5:
                    continue
                for other, owned in fields_by_object.items():
                    if named <= owned:
                        offenders.append(f"{name} -> every field is on {other}")
                        break
            self.assertEqual(
                [], offenders,
                f"{org}: these layout prefixes are not objects, and every field "
                f"they name lives on one other object, which is what a "
                f"Salesforce pseudo-entity looks like. Add each one to "
                f"_LAYOUT_PSEUDO_ENTITIES in extractors/interface.py, or its "
                f"fields drop out of the graph without saying so: {offenders}")

    def test_lightning_pages_read_the_fields_placed_on_them(self) -> None:
        """`fieldItem` was read by nothing before phase 8.

        There are 3,267 of them across the two snapshots and they are what a
        person means by "this page shows this field". Salesforce's own
        dependency API does not report them either, so neither side of the
        cross-check could see them.
        """
        for org, result in self.results.items():
            placed = [ref for ref in result.references
                      if ref.source_id.startswith(f"{org}:FlexiPage:")
                      and ref.relationship == "displays"
                      and ref.raw.startswith("Record.")]
            self.assertGreater(len(placed), 500,
                               f"{org}: only {len(placed)} field placements read "
                               "off Lightning pages")

    def test_a_related_list_is_read_as_a_related_list(self) -> None:
        """And not left unread, and not guessed at as a quick action.

        Every `valueListItems` value holding an underscore used to be emitted as
        a QuickAction, which is exactly the shape of a `relatedListFieldAliases`
        column name.
        """
        lists, columns = [], []
        for result in self.results.values():
            lists.extend(ref for ref in result.references
                         if ref.attributes.get("related_list"))
            columns.extend(ref for ref in result.references
                           if ref.attributes.get("through_related_list"))
        if not lists and not columns:
            self.skipTest("no Lightning page in this project uses a related list")

        for ref in lists:
            self.assertEqual("displays_related_list", ref.relationship)
        for ref in columns:
            self.assertEqual("CustomField", ref.target_type)
        if set(MEASURED_FILE_COUNTS) <= set(self.results):
            self.assertGreater(len(lists), 20, "no related lists were read")
            self.assertGreater(len(columns), 20,
                               "no related-list columns were read")


class LayoutObjectNameTests(unittest.TestCase):
    """`_layout_object`, the one line that cost about 940 field references."""

    def test_an_ordinary_layout_takes_the_object_from_its_name(self) -> None:
        self.assertEqual("Account",
                         interface._layout_object("Account-Account Layout"))
        self.assertEqual("Case", interface._layout_object("Case-NWM Request_2"))

    def test_the_close_case_layout_lays_out_fields_on_case(self) -> None:
        self.assertEqual("Case",
                         interface._layout_object("CaseClose-Close Case Layout"))

    def test_the_two_user_pseudo_entities_lay_out_fields_on_user(self) -> None:
        self.assertEqual("User",
                         interface._layout_object("UserAlt-User Profile Layout"))
        self.assertEqual(
            "User",
            interface._layout_object("CommunityMemberLayout-Community Member Layout"))

    def test_a_global_layout_belongs_to_no_object(self) -> None:
        self.assertEqual("", interface._layout_object("Global-Global Layout"))

    def test_a_layout_with_no_hyphen_has_no_object(self) -> None:
        self.assertEqual("", interface._layout_object("SomethingOdd"))

    def test_an_object_the_snapshot_lacks_keeps_its_own_name(self) -> None:
        """A layout for an object the retrieve never brought back is not the
        same thing as a pseudo-entity, and must not be rewritten to one."""
        self.assertEqual("ActionPlanTemplate",
                         interface._layout_object("ActionPlanTemplate-Layout"))


if __name__ == "__main__":
    unittest.main(verbosity=1)

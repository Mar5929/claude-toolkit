"""Tests for the WI-007 phase 3 resolver.

Run: python tools/kb/test_resolver.py

Most of these build a small set of components and references by hand, so they run
anywhere and say exactly what rule they are testing. The last group runs against
the real Red and Blue snapshots when they are present, because the headline
promise of phase 3 (nothing is dropped, out of 429,521 references) can only be
proved there; those tests skip themselves when the snapshots are missing.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))

from extractors import extract_org  # noqa: E402
from extractors.contracts import (  # noqa: E402
    ExtractedComponent, ExtractionResult, RawReference, category_for,
)
from resolver import (  # noqa: E402
    RESOLUTIONS, RESOLVED, UNRESOLVED_DYNAMIC, UNRESOLVED_MANAGED_PACKAGE,
    UNRESOLVED_NOT_IN_SNAPSHOT, UNRESOLVED_UNKNOWN, Resolver, _relationship_spellings,
    _squash, resolve_org,
)

from graph import find_repo_root, source_roots  # noqa: E402

REPO_ROOT = find_repo_root()
FORCE_APP = REPO_ROOT / "force-app"

# Every org this project holds metadata for, discovered rather than named.
PROJECT_ORGS = source_roots()

# Resolution-rate floors measured in the project this tool was built in, on
# 2026-08-04. One org resolved 89.5 per cent and the other 65.8. The lower one
# had a retrieve that brought back far fewer standard-object fields, so its
# profiles name thousands of fields that have no file. That is a fact about the
# snapshot, not a defect in the resolver, which is why the floors differ per org
# and why a project without these org names skips this check.
MEASURED_RESOLUTION_FLOORS = {"red": 85.0, "blue": 60.0}


# ---------------------------------------------------------------------------
# Building a small org by hand
# ---------------------------------------------------------------------------

class Fixture:
    """A handful of components and references, with no files involved."""

    def __init__(self, org="red"):
        self.result = ExtractionResult(org=org, root=f"force-app/{org}")
        self.org = org

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

    def reference(self, source_id, raw, relationship="references",
                  target_type="", target_parent="", **attributes):
        ref = RawReference(
            org=self.org, source_id=source_id, raw=raw,
            relationship=relationship, category=category_for(relationship),
            confidence="high", file_path="force-app/x", location="element",
            target_type=target_type, target_parent=target_parent,
            attributes=attributes,
        )
        self.result.add_reference(ref)
        return ref

    def resolve(self):
        return resolve_org(self.result)

    def one(self):
        """Resolve and return the single resolution, for a one-reference test."""
        out = self.resolve()
        assert len(out.resolutions) == 1, "this helper is for one reference"
        return out.resolutions[0]


def _object_with_fields(fixture, obj, *fields, **attributes):
    fixture.component("CustomObject", obj)
    for name in fields:
        fixture.component("CustomField", f"{obj}.{name}", **attributes)


# ---------------------------------------------------------------------------
# Nothing is ever dropped
# ---------------------------------------------------------------------------

class NothingIsDroppedTests(unittest.TestCase):

    def test_every_reference_gets_exactly_one_resolution(self) -> None:
        fixture = Fixture()
        source = fixture.component("Flow", "Some_Flow")
        _object_with_fields(fixture, "Case", "Priority")
        for raw in ("Case.Priority", "Nothing.Here", "npsp__Foo__c",
                    "(built at run time)", "https://example.com", "!!!"):
            fixture.reference(source, raw, target_type="CustomField")
        out = fixture.resolve()
        self.assertEqual(6, len(out.references))
        self.assertEqual(6, len(out.resolutions))

    def test_every_resolution_uses_one_of_the_five_spec_values(self) -> None:
        fixture = Fixture()
        source = fixture.component("Flow", "Some_Flow")
        for raw in ("A", "B.C", "$User.Name", "ns__X__c", "(built at run time)"):
            fixture.reference(source, raw, target_type="CustomField")
        for res in fixture.resolve().resolutions:
            self.assertIn(res.resolution, RESOLUTIONS)

    def test_every_unresolved_reference_says_why(self) -> None:
        fixture = Fixture()
        source = fixture.component("Flow", "Some_Flow")
        for raw in ("A", "B.C", "$User.Name", "ns__X__c", "TODAY()", "a b c"):
            fixture.reference(source, raw, target_type="CustomField")
        for res in fixture.resolve().resolutions:
            if not res.is_resolved:
                self.assertTrue(res.detail, res)
                self.assertTrue(res.rule, res)


# ---------------------------------------------------------------------------
# The plain matches
# ---------------------------------------------------------------------------

class DirectMatchTests(unittest.TestCase):

    def test_a_qualified_name_matches_the_component_it_names(self) -> None:
        fixture = Fixture()
        source = fixture.component("Flow", "Escalation")
        _object_with_fields(fixture, "Case", "Priority")
        fixture.reference(source, "Case.Priority", target_type="CustomField")
        res = fixture.one()
        self.assertEqual(RESOLVED, res.resolution)
        self.assertEqual("red:CustomField:Case.Priority", res.target_id)
        self.assertEqual("direct", res.rule)

    def test_a_bare_name_is_read_against_the_parent_the_extractor_gave(self) -> None:
        fixture = Fixture()
        source = fixture.component("Flow", "Escalation")
        _object_with_fields(fixture, "Case", "Priority")
        fixture.reference(source, "Priority", target_type="CustomField",
                          target_parent="Case")
        res = fixture.one()
        self.assertEqual("red:CustomField:Case.Priority", res.target_id)
        self.assertEqual("parent_qualified", res.rule)

    def test_the_type_hint_has_to_match_too(self) -> None:
        """A layout called Case.Priority must not answer a field reference."""
        fixture = Fixture()
        source = fixture.component("Flow", "Escalation")
        fixture.component("Layout", "Case.Priority")
        fixture.reference(source, "Case.Priority", target_type="CustomField")
        self.assertFalse(fixture.one().is_resolved)

    def test_percent_encoding_in_a_file_name_still_matches(self) -> None:
        fixture = Fixture()
        source = fixture.component("CustomApplication", "App")
        fixture.component("Profile", "System Administrator w%2Fo SSO")
        fixture.reference(source, "System Administrator w/o SSO",
                          target_type="Profile")
        res = fixture.one()
        self.assertEqual(RESOLVED, res.resolution)
        self.assertEqual("percent_decoded", res.rule)

    def test_a_different_case_still_matches(self) -> None:
        fixture = Fixture()
        source = fixture.component("CustomApplication", "App")
        fixture.component("Profile", "Account Management")
        fixture.reference(source, "account management", target_type="Profile")
        self.assertEqual("case_insensitive", fixture.one().rule)

    def test_no_type_hint_resolves_only_when_one_component_carries_the_name(self):
        fixture = Fixture()
        source = fixture.component("Layout", "Account-Layout")
        fixture.component("QuickAction", "LogACall")
        fixture.reference(source, "LogACall")
        self.assertEqual("name_only", fixture.one().rule)

    def test_no_type_hint_and_two_components_share_the_name_stays_unresolved(self):
        fixture = Fixture()
        source = fixture.component("Layout", "Account-Layout")
        fixture.component("Role", "Billing")
        fixture.component("Group", "Billing")
        fixture.reference(source, "Billing")
        self.assertFalse(fixture.one().is_resolved)

    def test_a_legacy_report_token_is_read_as_object_dot_field(self) -> None:
        fixture = Fixture()
        source = fixture.component("Dashboard", "Folder.Board")
        _object_with_fields(fixture, "Account", "X2015_Model__c")
        fixture.reference(source, "Account$X2015_Model__c",
                          target_type="CustomField")
        res = fixture.one()
        self.assertEqual("red:CustomField:Account.X2015_Model__c", res.target_id)
        self.assertEqual("report_token", res.rule)


# ---------------------------------------------------------------------------
# Managed packages
# ---------------------------------------------------------------------------

class ManagedPackageTests(unittest.TestCase):

    def test_a_package_name_that_is_absent_names_its_namespace(self) -> None:
        fixture = Fixture()
        source = fixture.component("Profile", "Admin")
        fixture.reference(source, "npsp__Volunteer__c.npsp__Hours__c",
                          target_type="CustomField")
        res = fixture.one()
        self.assertEqual(UNRESOLVED_MANAGED_PACKAGE, res.resolution)
        self.assertEqual("npsp", res.namespace)

    def test_a_package_name_that_is_present_resolves_instead(self) -> None:
        """Managed metadata does arrive in a retrieve, so presence wins."""
        fixture = Fixture()
        source = fixture.component("Profile", "Admin")
        _object_with_fields(fixture, "Cloudrop__Storage__c", "Cloudrop__Size__c")
        fixture.reference(source, "Cloudrop__Storage__c.Cloudrop__Size__c",
                          target_type="CustomField")
        res = fixture.one()
        self.assertEqual(RESOLVED, res.resolution)
        self.assertEqual("", res.namespace)

    def test_a_namespace_on_either_half_of_a_qualified_name_counts(self) -> None:
        fixture = Fixture()
        source = fixture.component("Profile", "Admin")
        fixture.reference(source, "Account.pi__Score__c", target_type="CustomField")
        res = fixture.one()
        self.assertEqual(UNRESOLVED_MANAGED_PACKAGE, res.resolution)
        self.assertEqual("pi", res.namespace)

    def test_a_custom_suffix_is_not_a_namespace(self) -> None:
        fixture = Fixture()
        source = fixture.component("Profile", "Admin")
        fixture.reference(source, "Ordinary__c.Field__c", target_type="CustomField")
        self.assertNotEqual(UNRESOLVED_MANAGED_PACKAGE, fixture.one().resolution)


# ---------------------------------------------------------------------------
# The reasons that are not a lookup failure
# ---------------------------------------------------------------------------

class ReasonTests(unittest.TestCase):

    def test_a_name_built_at_run_time_is_marked_dynamic(self) -> None:
        fixture = Fixture()
        source = fixture.component("ApexClass", "Controller")
        fixture.reference(source, "(built at run time)", relationship="queries")
        res = fixture.one()
        self.assertEqual(UNRESOLVED_DYNAMIC, res.resolution)
        self.assertIn("run", res.detail)

    def test_a_web_address_is_not_a_component(self) -> None:
        fixture = Fixture()
        source = fixture.component("RemoteSiteSetting", "Endpoint")
        fixture.reference(source, "https://example.com/api",
                          relationship="calls_endpoint")
        res = fixture.one()
        self.assertEqual(UNRESOLVED_NOT_IN_SNAPSHOT, res.resolution)
        self.assertEqual("url", res.rule)

    def test_a_user_is_a_record_not_metadata(self) -> None:
        fixture = Fixture()
        source = fixture.component("EmailServicesFunction", "EmailToCase")
        fixture.reference(source, "someone@example.com", target_type="User")
        self.assertEqual("user", fixture.one().rule)

    def test_a_platform_lightning_component_is_named_as_one(self) -> None:
        fixture = Fixture()
        source = fixture.component("FlexiPage", "Account_Record_Page")
        fixture.reference(source, "flexipage:column", target_type="")
        res = fixture.one()
        self.assertEqual(UNRESOLVED_NOT_IN_SNAPSHOT, res.resolution)
        self.assertEqual("platform_component", res.rule)

    def test_a_salesforce_supplied_tab_is_named_as_one(self) -> None:
        fixture = Fixture()
        source = fixture.component("Profile", "Admin")
        fixture.component("CustomTab", "Something__c")
        fixture.reference(source, "standard-Case", target_type="CustomTab")
        self.assertEqual("standard_prefixed", fixture.one().rule)

    def test_an_action_every_object_has_is_named_as_one(self) -> None:
        fixture = Fixture()
        source = fixture.component("CustomObject", "Account")
        fixture.component("QuickAction", "Case.Close_Case")
        fixture.reference(source, "SaveEdit", target_type="QuickAction")
        self.assertEqual("standard_action", fixture.one().rule)

    def test_a_system_field_is_named_as_one(self) -> None:
        fixture = Fixture()
        source = fixture.component("Layout", "Account-Layout",
                                   layout_object="Account")
        _object_with_fields(fixture, "Account", "Custom__c")
        fixture.reference(source, "CreatedDate", target_type="CustomField")
        res = fixture.one()
        self.assertEqual(UNRESOLVED_NOT_IN_SNAPSHOT, res.resolution)
        self.assertEqual("system_field", res.rule)

    def test_a_field_on_an_object_that_is_here_is_told_apart_from_one_that_is_not(self):
        fixture = Fixture()
        source = fixture.component("Profile", "Admin")
        _object_with_fields(fixture, "Account", "Custom__c")
        fixture.reference(source, "Account.Industry", target_type="CustomField")
        fixture.reference(source, "Elsewhere__c.Thing__c", target_type="CustomField")
        rules = [res.rule for res in fixture.resolve().resolutions]
        self.assertEqual(["field_not_retrieved", "object_not_in_snapshot"], rules)

    def test_a_type_with_no_file_at_all_says_so(self) -> None:
        fixture = Fixture()
        source = fixture.component("Dashboard", "Folder.Board")
        fixture.reference(source, "Folder/Report_Name", target_type="Report")
        res = fixture.one()
        self.assertEqual("type_absent", res.rule)
        self.assertIn("Report", res.detail)

    def test_a_string_that_is_not_a_name_at_all_is_unknown_not_absent(self) -> None:
        """`TODAY()` is not a field that happens to be missing. Calling it absent
        would put it in the same pile as a standard field nobody retrieved, and
        those two need different answers in phase 7."""
        fixture = Fixture()
        _object_with_fields(fixture, "Case", "Priority")
        source = fixture.component("QuickAction", "Case.Thing")
        fixture.reference(source, "TODAY()", target_type="CustomField")
        self.assertEqual(UNRESOLVED_UNKNOWN, fixture.one().resolution)


# ---------------------------------------------------------------------------
# Legacy all-capitals tokens
# ---------------------------------------------------------------------------

class LegacyTokenTests(unittest.TestCase):

    def test_a_legacy_token_matches_the_field_with_the_same_letters(self) -> None:
        fixture = Fixture()
        source = fixture.component("ListView", "Account.My_View")
        _object_with_fields(fixture, "Account", "Type", "Site")
        fixture.reference(source, "ACCOUNT.TYPE", target_type="CustomField",
                          target_parent="Account")
        res = fixture.one()
        self.assertEqual("red:CustomField:Account.Type", res.target_id)
        self.assertEqual("legacy_token", res.rule)

    def test_underscores_in_a_token_are_ignored_when_matching(self) -> None:
        fixture = Fixture()
        source = fixture.component("ListView", "Opportunity.My_View")
        _object_with_fields(fixture, "Opportunity", "CloseDate")
        fixture.reference(source, "OPPORTUNITY.CLOSE_DATE",
                          target_type="CustomField")
        self.assertEqual("red:CustomField:Opportunity.CloseDate",
                         fixture.one().target_id)

    def test_a_pluralised_object_prefix_still_finds_the_object(self) -> None:
        fixture = Fixture()
        source = fixture.component("Layout", "Case-Layout", layout_object="Case")
        _object_with_fields(fixture, "Case", "Status")
        fixture.reference(source, "CASES.STATUS", target_type="CustomField")
        self.assertEqual("red:CustomField:Case.Status", fixture.one().target_id)

    def test_the_user_prefixes_all_mean_the_user_object(self) -> None:
        fixture = Fixture()
        source = fixture.component("ListView", "Account.My_View")
        _object_with_fields(fixture, "User", "Alias")
        for raw in ("CORE.USERS.ALIAS", "UPDATEDBY_USER.ALIAS",
                    "CREATEDBY_USER.ALIAS"):
            fixture.reference(source, raw, target_type="CustomField",
                              target_parent="Account")
        for res in fixture.resolve().resolutions:
            self.assertEqual("red:CustomField:User.Alias", res.target_id)

    def test_a_legacy_token_never_matches_a_custom_field_of_the_same_name(self):
        """NAME must not become Name__c. A legacy token is how Salesforce writes a
        STANDARD field; a custom field is written with its real api name in the
        same file, so a match on one is always the wrong answer."""
        fixture = Fixture()
        source = fixture.component("ListView", "Case.My_View")
        _object_with_fields(fixture, "Case", "Name__c")
        fixture.reference(source, "NAME", target_type="CustomField",
                          target_parent="Case")
        self.assertFalse(fixture.one().is_resolved)

    def test_a_prefixed_token_does_not_fall_back_to_the_files_own_object(self):
        """CORE.USER_ROLE.NAME is the role's name, not the user's."""
        fixture = Fixture()
        source = fixture.component("ListView", "User.My_View")
        _object_with_fields(fixture, "User", "Name")
        fixture.reference(source, "CORE.USER_ROLE.NAME", target_type="CustomField",
                          target_parent="User")
        self.assertFalse(fixture.one().is_resolved)

    def test_an_ambiguous_legacy_token_is_refused_rather_than_guessed(self) -> None:
        """Due_Date and DueDate have the same letters, so the token cannot say
        which of them it means and the legacy rule must not pick one. A later
        rule matching an exact spelling is still allowed to answer, which is the
        right order: a certain match beats a coin toss."""
        fixture = Fixture()
        source = fixture.component("ListView", "Account.My_View")
        _object_with_fields(fixture, "Account", "Due_Date", "DueDate")
        fixture.reference(source, "ACCOUNT.DUE_DATE", target_type="CustomField")
        self.assertNotEqual("legacy_token", fixture.one().rule)

    def test_squash_keeps_the_custom_suffix_apart(self) -> None:
        self.assertEqual("LASTNAME", _squash("LAST_NAME"))
        self.assertEqual("LASTNAME", _squash("LastName"))
        self.assertEqual("NAME", _squash("Name"))
        self.assertEqual("NAMEC", _squash("Name__c"))


# ---------------------------------------------------------------------------
# Relationships and traversals
# ---------------------------------------------------------------------------

class RelationshipTests(unittest.TestCase):

    def _org_with_a_lookup(self):
        """Case.Account__c points at Account, whose Industry field exists."""
        fixture = Fixture()
        _object_with_fields(fixture, "Account", "Industry")
        fixture.component("CustomObject", "Case")
        field = fixture.component("CustomField", "Case.Account__c",
                                  relationship_name="Cases")
        fixture.reference(field, "Account", relationship="lookup",
                          target_type="CustomObject")
        return fixture

    def test_the_relationship_map_is_built_from_reference_to(self) -> None:
        fixture = self._org_with_a_lookup()
        resolver = Resolver(fixture.result)
        self.assertEqual(1, resolver.relationship_count)
        self.assertEqual("Account", resolver.relationship_target("Case", "Account__c"))
        self.assertEqual("Account", resolver.relationship_target("Case", "Account__r"))
        self.assertEqual("Account", resolver.relationship_target("Case", "Cases"))

    def test_a_relationship_name_that_differs_from_the_field_name_works(self):
        """A field Owner_Account__c can have the relationshipName Accounts5."""
        fixture = Fixture()
        _object_with_fields(fixture, "Account", "ADC__c")
        fixture.component("CustomObject", "Case")
        field = fixture.component("CustomField", "Case.Owner_Account__c",
                                  relationship_name="Accounts5")
        fixture.reference(field, "Account", relationship="lookup",
                          target_type="CustomObject")
        source = fixture.component("Flow", "Some_Flow", start_object="Case")
        fixture.reference(source, "Accounts5.ADC__c", target_type="CustomField")
        res = fixture.resolve().resolutions[-1]
        self.assertEqual("red:CustomField:Account.ADC__c", res.target_id)
        self.assertEqual("traversal", res.rule)

    def test_one_hop_across_a_lookup(self) -> None:
        fixture = self._org_with_a_lookup()
        source = fixture.component("Flow", "Some_Flow", start_object="Case")
        fixture.reference(source, "Account__r.Industry", target_type="CustomField")
        res = fixture.resolve().resolutions[-1]
        self.assertEqual("red:CustomField:Account.Industry", res.target_id)

    def test_two_hops(self) -> None:
        fixture = Fixture()
        _object_with_fields(fixture, "User", "Email")
        _object_with_fields(fixture, "Account", "Industry")
        fixture.component("CustomObject", "Case")
        field = fixture.component("CustomField", "Case.Account__c")
        fixture.reference(field, "Account", relationship="lookup",
                          target_type="CustomObject")
        source = fixture.component("Flow", "Some_Flow", start_object="Case")
        fixture.reference(source, "Account__r.Owner.Email", target_type="CustomField")
        res = fixture.resolve().resolutions[-1]
        self.assertEqual("red:CustomField:User.Email", res.target_id)

    def test_a_path_that_stops_says_where_it_stopped(self) -> None:
        fixture = self._org_with_a_lookup()
        source = fixture.component("Flow", "Some_Flow", start_object="Case")
        fixture.reference(source, "Unknown__r.Industry", target_type="CustomField")
        res = fixture.resolve().resolutions[-1]
        self.assertFalse(res.is_resolved)
        self.assertIn("Unknown__r", res.detail)

    def test_a_traversal_starting_from_a_named_object_needs_no_parent(self) -> None:
        fixture = Fixture()
        _object_with_fields(fixture, "User", "Name")
        fixture.component("CustomObject", "ContentDocument")
        source = fixture.component("ApexClass", "SomeController")
        fixture.reference(source, "ContentDocument.CreatedBy.Name",
                          target_type="CustomField")
        res = fixture.resolve().resolutions[-1]
        self.assertEqual("red:CustomField:User.Name", res.target_id)

    def test_relationship_spellings(self) -> None:
        self.assertIn("Account__r", _relationship_spellings("Account__c", ""))
        self.assertIn("Account", _relationship_spellings("AccountId", ""))
        self.assertIn("Accounts5", _relationship_spellings("Owner__c", "Accounts5"))


# ---------------------------------------------------------------------------
# Global variables
# ---------------------------------------------------------------------------

class GlobalTests(unittest.TestCase):

    def test_record_is_the_object_the_flow_runs_on(self) -> None:
        fixture = Fixture()
        _object_with_fields(fixture, "Case", "Status__c")
        source = fixture.component("Flow", "Some_Flow", start_object="Case")
        fixture.reference(source, "$Record.Status__c", target_type="CustomField")
        res = fixture.resolve().resolutions[-1]
        self.assertEqual("red:CustomField:Case.Status__c", res.target_id)
        self.assertEqual("record_global", res.rule)

    def test_record_on_a_lightning_page_uses_the_pages_object(self) -> None:
        fixture = Fixture()
        _object_with_fields(fixture, "Account", "Risk__c")
        source = fixture.component("FlexiPage", "Account_Record_Page",
                                   sobject_type="Account")
        fixture.reference(source, "Record.Risk__c", target_type="CustomField")
        res = fixture.resolve().resolutions[-1]
        self.assertEqual("red:CustomField:Account.Risk__c", res.target_id)

    def test_a_label_global_finds_the_label(self) -> None:
        fixture = Fixture()
        fixture.component("CustomLabel", "Welcome_Message")
        source = fixture.component("ApexPage", "Home")
        fixture.reference(source, "$Label.Welcome_Message",
                          target_type="CustomLabel")
        self.assertEqual("red:CustomLabel:Welcome_Message",
                         fixture.resolve().resolutions[-1].target_id)

    def test_a_namespaced_label_names_its_namespace(self) -> None:
        fixture = Fixture()
        source = fixture.component("ApexPage", "Home")
        fixture.reference(source, "$Label.site.email_us", target_type="CustomLabel")
        res = fixture.one()
        self.assertEqual(UNRESOLVED_MANAGED_PACKAGE, res.resolution)
        self.assertEqual("site", res.namespace)

    def test_a_resource_global_finds_the_static_resource(self) -> None:
        fixture = Fixture()
        fixture.component("StaticResource", "UtilJS")
        source = fixture.component("ApexPage", "Home")
        fixture.reference(source, "$Resource.UtilJS", target_type="StaticResource")
        self.assertEqual("red:StaticResource:UtilJS",
                         fixture.resolve().resolutions[-1].target_id)

    def test_a_platform_global_is_not_a_component(self) -> None:
        fixture = Fixture()
        source = fixture.component("ApexPage", "Home")
        fixture.reference(source, "$Api.Session_ID", target_type="System")
        res = fixture.one()
        self.assertEqual(UNRESOLVED_NOT_IN_SNAPSHOT, res.resolution)
        self.assertEqual("platform_global", res.rule)


# ---------------------------------------------------------------------------
# Orgs never mix
# ---------------------------------------------------------------------------

class OrgSeparationTests(unittest.TestCase):

    def test_a_resolver_only_looks_in_its_own_orgs_components(self) -> None:
        blue = Fixture(org="blue")
        _object_with_fields(blue, "Case", "Priority")
        source = blue.component("Flow", "Escalation")
        blue.reference(source, "Case.Priority", target_type="CustomField")
        res = blue.one()
        self.assertEqual("blue:CustomField:Case.Priority", res.target_id)
        self.assertTrue(res.target_id.startswith("blue:"))


# ---------------------------------------------------------------------------
# Against the real Red and Blue snapshots
# ---------------------------------------------------------------------------

class SnapshotTests(unittest.TestCase):
    """The promise phase 3 makes can only be proved on the real thing.

    Skipped when the snapshots are not on disk, so the suite still runs after a
    fresh clone that has not pulled them.
    """

    results = {}
    resolutions = {}

    @classmethod
    def setUpClass(cls) -> None:
        if not PROJECT_ORGS:
            raise unittest.SkipTest("this project holds no org metadata")
        for org, root in PROJECT_ORGS.items():
            extraction = extract_org(root, org)
            cls.results[org] = extraction
            cls.resolutions[org] = Resolver(extraction).resolve_all()

    def test_the_count_in_equals_the_count_out(self) -> None:
        """SPEC: a name that cannot be resolved is never dropped."""
        total_in = total_out = 0
        for org, extraction in self.results.items():
            resolution = self.resolutions[org]
            self.assertEqual(len(extraction.references), len(resolution.resolutions),
                             org)
            total_in += len(extraction.references)
            total_out += len(resolution.resolutions)
        self.assertEqual(total_in, total_out)
        self.assertGreater(total_in, 400000, "the snapshots got much smaller")

    def test_every_resolved_target_is_a_real_component_in_the_same_org(self) -> None:
        for org, extraction in self.results.items():
            for res in self.resolutions[org].resolutions:
                if not res.is_resolved:
                    continue
                self.assertIn(res.target_id, extraction.components, org)
                self.assertTrue(res.target_id.startswith(f"{org}:"), res.target_id)

    def test_every_resolution_uses_a_spec_value_and_says_why(self) -> None:
        for org in self.results:
            for res in self.resolutions[org].resolutions:
                self.assertIn(res.resolution, RESOLUTIONS, org)
                if not res.is_resolved:
                    self.assertTrue(res.detail, f"{org}: {res}")

    def test_every_managed_package_reference_names_its_namespace(self) -> None:
        for org in self.results:
            counted = 0
            for res in self.resolutions[org].resolutions:
                if res.resolution != UNRESOLVED_MANAGED_PACKAGE:
                    continue
                self.assertTrue(res.namespace, f"{org}: {res.detail}")
                counted += 1
            self.assertGreater(counted, 0, f"{org} met no managed package at all")

    def test_the_dynamic_references_are_marked_dynamic_and_nothing_else_is(self):
        for org, extraction in self.results.items():
            resolution = self.resolutions[org]
            for ref, res in zip(extraction.references, resolution.resolutions):
                if res.resolution == UNRESOLVED_DYNAMIC:
                    self.assertEqual("(built at run time)", ref.raw, org)
                if ref.raw == "(built at run time)":
                    self.assertEqual(UNRESOLVED_DYNAMIC, res.resolution, org)

    def test_no_report_resolves_because_neither_org_retrieved_one(self) -> None:
        """The honest answer, not a bug: a dashboard names a report, and no
        report file exists in either snapshot."""
        for org, extraction in self.results.items():
            reports = [c for c in extraction.components.values()
                       if c.type == "Report"]
            self.assertEqual([], reports, f"{org} now has report files")
            resolution = self.resolutions[org]
            for ref, res in zip(extraction.references, resolution.resolutions):
                if ref.target_type == "Report":
                    self.assertEqual(UNRESOLVED_NOT_IN_SNAPSHOT, res.resolution, org)

    def test_the_relationship_map_is_built_from_all_205_lookups(self) -> None:
        total = sum(self.resolutions[org].relationship_count for org in self.results)
        self.assertEqual(205, total)

    def test_a_traversal_resolves_in_each_org(self) -> None:
        for org in self.results:
            walked = [res for res in self.resolutions[org].resolutions
                      if res.rule == "traversal" and res.is_resolved]
            self.assertGreater(len(walked), 0,
                               f"{org} resolved no traversal at all")

    def test_the_resolution_rate_has_not_fallen(self) -> None:
        """A floor, not an exact number, so an extractor change does not break
        the suite. See MEASURED_RESOLUTION_FLOORS for where the numbers come
        from and why they differ per org."""
        checked = [org for org in MEASURED_RESOLUTION_FLOORS
                   if org in self.resolutions]
        if not checked:
            self.skipTest("no measured org in this project")
        for org in checked:
            floor = MEASURED_RESOLUTION_FLOORS[org]
            resolution = self.resolutions[org]
            counts = resolution.counts()
            rate = 100.0 * counts[RESOLVED] / len(resolution.resolutions)
            self.assertGreater(rate, floor, f"{org} resolved only {rate:.1f} percent")

    def test_the_unknown_reason_stays_rare(self) -> None:
        """`unresolved_unknown` means we cannot even say what the string was
        meant to be. It is the reason of last resort, so a jump in it is a sign
        the resolver stopped recognising something it used to."""
        for org in self.results:
            resolution = self.resolutions[org]
            unknown = resolution.counts()[UNRESOLVED_UNKNOWN]
            share = 100.0 * unknown / len(resolution.resolutions)
            self.assertLess(share, 2.0,
                            f"{org}: {unknown} references have no reason we can name")


if __name__ == "__main__":
    unittest.main(verbosity=1)

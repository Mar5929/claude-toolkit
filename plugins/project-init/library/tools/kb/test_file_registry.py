"""Tests for file_registry.py (WI-007 phase 1).

Run: python tools/kb/test_file_registry.py
"""

from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))

from file_registry import (  # noqa: E402
    build_registry, classify, iter_files, long_path,
)


def _write(path: Path, text: str = "x") -> None:
    """Write a file, working past the Windows 260-character path limit."""
    parent = long_path(path.parent)
    os.makedirs(parent, exist_ok=True)
    with open(long_path(path), "w", encoding="utf-8") as handle:
        handle.write(text)


def _tree(root: Path, rel_paths) -> None:
    for rel in rel_paths:
        _write(root / rel)


def _remove_tree(root: Path) -> None:
    """Delete a folder tree, including paths Windows' own delete cannot reach.

    shutil.rmtree does not use the extended-length path, so it cannot remove
    the over-260-character tree the long-path test builds.
    """
    long_root = long_path(root)
    for dirpath, dirnames, filenames in os.walk(long_root, topdown=False):
        for name in filenames:
            os.remove(os.path.join(dirpath, name))
        for name in dirnames:
            os.rmdir(os.path.join(dirpath, name))
    os.rmdir(long_root)


class LongPathTests(unittest.TestCase):
    def test_prefix_is_added_on_windows_only(self) -> None:
        result = long_path("some/file.txt")
        if os.name == "nt":
            self.assertTrue(result.startswith("\\\\?\\"), result)
        else:
            self.assertFalse(result.startswith("\\\\?\\"), result)
        self.assertTrue(result.endswith(os.path.join("some", "file.txt")))

    def test_prefix_is_not_added_twice(self) -> None:
        once = long_path("some/file.txt")
        twice = long_path(once)
        self.assertEqual(once, twice)

    def test_walk_finds_files_past_the_260_character_limit(self) -> None:
        """The bug this guards: Python's ordinary walk silently drops these.

        Red loses 4 files and Blue loses 11 without the extended-length path.
        """
        tmp = Path(tempfile.mkdtemp())
        try:
            segment = "objectTranslations_long_folder_name_padding_0123456789"
            deep = tmp
            while len(str(deep)) < 300:
                deep = deep / segment
            target = deep / "Some_Object__c-es_MX.objectTranslation-meta.xml"
            _write(target)
            self.assertGreater(len(str(target)), 260)

            walked = {rel for rel, _size in iter_files(tmp)}
            self.assertEqual(1, len(walked))
            self.assertTrue(next(iter(walked)).endswith(
                "Some_Object__c-es_MX.objectTranslation-meta.xml"))

            registry = build_registry(tmp, "test")
            self.assertEqual(1, registry.count())
            self.assertEqual([], registry.errors)
        finally:
            _remove_tree(tmp)


class ClassifyTests(unittest.TestCase):
    def _classify(self, rel_path: str, all_files) -> dict:
        file_set = set(all_files)
        dir_set = set()
        for rel in file_set:
            parts = rel.split("/")
            for i in range(1, len(parts)):
                dir_set.add("/".join(parts[:i]))
        return classify(rel_path, dir_set, file_set)

    def test_field_file_is_named_and_qualified_by_its_object(self) -> None:
        rel = "objects/Case/fields/Priority.field-meta.xml"
        info = self._classify(rel, [rel])
        self.assertEqual("CustomField", info["metadata_type"])
        self.assertEqual("suffix_table", info["type_source"])
        self.assertEqual("primary", info["role"])
        self.assertEqual("Case.Priority", info["component_name"])
        self.assertEqual("Case", info["parent_name"])

    def test_object_file_keeps_the_plain_object_name(self) -> None:
        rel = "objects/Case/Case.object-meta.xml"
        info = self._classify(rel, [rel])
        self.assertEqual("CustomObject", info["metadata_type"])
        self.assertEqual("Case", info["component_name"])

    def test_apex_class_sidecar_is_marked_as_a_sidecar(self) -> None:
        files = ["classes/CaseService.cls", "classes/CaseService.cls-meta.xml"]
        code = self._classify(files[0], files)
        meta = self._classify(files[1], files)
        self.assertEqual("ApexClass", code["metadata_type"])
        self.assertEqual("primary", code["role"])
        self.assertEqual("ApexClass", meta["metadata_type"])
        self.assertEqual("sidecar", meta["role"])

    def test_xml_metadata_file_is_primary_not_sidecar(self) -> None:
        """A flow's -meta.xml IS the flow; nothing else on disk describes it."""
        rel = "flows/Case_Escalation.flow-meta.xml"
        info = self._classify(rel, [rel])
        self.assertEqual("Flow", info["metadata_type"])
        self.assertEqual("primary", info["role"])
        self.assertEqual("Case_Escalation", info["component_name"])

    def test_lwc_bundle_files_share_one_component(self) -> None:
        files = [
            "lwc/caseForm/caseForm.js",
            "lwc/caseForm/caseForm.html",
            "lwc/caseForm/caseForm.js-meta.xml",
        ]
        for rel in files:
            info = self._classify(rel, files)
            self.assertEqual("LightningComponentBundle", info["metadata_type"])
            self.assertEqual("caseForm", info["component_name"])
        self.assertEqual("sidecar", self._classify(files[2], files)["role"])
        self.assertEqual("bundle_member", self._classify(files[0], files)["role"])

    def test_static_resource_folder_and_its_sidecar(self) -> None:
        files = [
            "staticresources/GraphicsPack/img/logo.png",
            "staticresources/GraphicsPack.resource-meta.xml",
            "staticresources/UtilJS.js",
        ]
        inside = self._classify(files[0], files)
        self.assertEqual("StaticResource", inside["metadata_type"])
        self.assertEqual("GraphicsPack", inside["component_name"])
        self.assertEqual("bundle_member", inside["role"])

        sidecar = self._classify(files[1], files)
        self.assertEqual("StaticResource", sidecar["metadata_type"])
        self.assertEqual("GraphicsPack", sidecar["component_name"])
        self.assertEqual("sidecar", sidecar["role"])

        loose = self._classify(files[2], files)
        self.assertEqual("StaticResource", loose["metadata_type"])
        self.assertEqual("UtilJS", loose["component_name"])

    def test_ambiguous_suffix_is_named_by_its_folder(self) -> None:
        rel = "emailservices/EmailToCase.xml-meta.xml"
        info = self._classify(rel, [rel])
        self.assertEqual("EmailServicesFunction", info["metadata_type"])
        self.assertEqual("directory_table", info["type_source"])

    def test_report_is_qualified_by_its_folder(self) -> None:
        rel = "reports/Sales_Reports/Open_Cases.report-meta.xml"
        info = self._classify(rel, [rel])
        self.assertEqual("Report", info["metadata_type"])
        self.assertEqual("Sales_Reports.Open_Cases", info["component_name"])
        self.assertEqual("Sales_Reports", info["parent_name"])

    def test_unknown_suffix_is_still_recorded_with_a_reason(self) -> None:
        rel = "somethingNew/Widget.brandNewType-meta.xml"
        info = self._classify(rel, [rel])
        self.assertEqual("BrandNewType", info["metadata_type"])
        self.assertEqual("suffix_derived", info["type_source"])
        self.assertIn("not in the known-suffix table", info["note"])

    def test_non_metadata_files_are_recorded_with_a_reason(self) -> None:
        for rel in (".gitkeep", "graphify-out/cache/stat-index.json"):
            info = self._classify(rel, [rel])
            self.assertEqual("non_metadata", info["role"])
            self.assertEqual("NotMetadata", info["metadata_type"])
            self.assertTrue(info["note"])


class BuildRegistryTests(unittest.TestCase):
    FILES = [
        "objects/Case/Case.object-meta.xml",
        "objects/Case/fields/Priority.field-meta.xml",
        "objects/Case/listViews/All_Open.listView-meta.xml",
        "flows/Case_Escalation.flow-meta.xml",
        "classes/CaseService.cls",
        "classes/CaseService.cls-meta.xml",
        "lwc/caseForm/caseForm.js",
        "lwc/caseForm/caseForm.js-meta.xml",
        "staticresources/GraphicsPack/img/logo.png",
        "staticresources/GraphicsPack.resource-meta.xml",
        ".gitkeep",
    ]

    def test_every_file_on_disk_gets_exactly_one_record(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "default"
            _tree(root, self.FILES)
            registry = build_registry(root, "test")
            self.assertEqual(len(self.FILES), registry.count())
            self.assertEqual(set(self.FILES), registry.rel_paths())
            self.assertEqual([], registry.errors)

    def test_records_carry_org_paths_and_sizes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "default"
            _tree(root, self.FILES)
            registry = build_registry(root, "red")
            by_path = {rec.rel_path: rec for rec in registry.files}
            flow = by_path["flows/Case_Escalation.flow-meta.xml"]
            self.assertEqual("red", flow.org)
            self.assertEqual("flows", flow.directory)
            self.assertEqual(1, flow.size_bytes)
            self.assertTrue(flow.repo_path.endswith(
                "flows/Case_Escalation.flow-meta.xml"))

    def test_counts_by_type_add_up_to_the_file_count(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "default"
            _tree(root, self.FILES)
            registry = build_registry(root, "test")
            self.assertEqual(registry.count(), sum(registry.by_type().values()))
            self.assertEqual(registry.count(), sum(registry.by_directory().values()))
            self.assertEqual(registry.count(), sum(registry.by_type_source().values()))

    def test_the_walk_is_in_a_stable_order(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "default"
            _tree(root, self.FILES)
            first = [rec.rel_path for rec in build_registry(root, "test").files]
            second = [rec.rel_path for rec in build_registry(root, "test").files]
            self.assertEqual(first, second)

    def test_a_missing_root_is_an_error_not_a_crash(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            registry = build_registry(Path(tmp) / "not-there", "test")
            self.assertEqual(0, registry.count())
            self.assertEqual(1, len(registry.errors))
            self.assertIn("not found", registry.errors[0])


if __name__ == "__main__":
    unittest.main()

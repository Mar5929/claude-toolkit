from __future__ import annotations

import os
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path


THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))

from classify_fields import classify_fields  # noqa: E402
from diff_graph import diff_graphs  # noqa: E402
from graph_backend import publish, resolve_backend  # noqa: E402
from human_claims import load_human_claims  # noqa: E402
from load_yaml import _component_for_touched  # noqa: E402
from parse_force_app import parse_force_app  # noqa: E402
from parse_kb_indexes import parse_kb_indexes  # noqa: E402
from query_graph import find_field_groups  # noqa: E402
from self_check import run_self_check  # noqa: E402


SCHEMA_SQL = (THIS_DIR / "schema.sql").read_text(encoding="utf-8")


def _write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


class MetadataCatalogTests(unittest.TestCase):
    def test_kb_curated_writes_keep_writer_kind_for_classification(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _write(
                root / "engagement/knowledge-base/automation/field-writers.md",
                """# Field Writers

## Contact

### `Events__c`

- Written by: Flow [Update_Events](flows/Update_Events.md) (Active) - curated

### `OwnerId`

- Written by: Apex [OwnerBatch](apex/OwnerBatch.md) (Active) - curated
""",
            )
            _write(root / "engagement/knowledge-base/automation/schedule.md", "# Schedule\n")
            _write(
                root / "engagement/knowledge-base/automation/process-clusters.md",
                "# Process Clusters\n",
            )

            parsed = parse_kb_indexes(str(root))
            writer_kinds = {
                (edge.src_id, edge.dst_id): edge.writer_kind
                for edge in parsed.edges
                if edge.kind == "WRITES"
            }
            self.assertEqual(
                "flow_kb_curated",
                writer_kinds[("Flow:Update_Events", "Field:Contact.Events__c")],
            )
            self.assertEqual(
                "apex_kb_curated",
                writer_kinds[("ApexClass:OwnerBatch", "Field:Contact.OwnerId")],
            )

            conn = sqlite3.connect(":memory:")
            conn.executescript(SCHEMA_SQL)
            conn.executemany(
                """
                INSERT INTO components (id, type, name, source)
                VALUES (?, 'Field', ?, 'force-app')
                """,
                [
                    ("Field:Contact.Events__c", "Events__c"),
                    ("Field:Contact.OwnerId", "OwnerId"),
                    ("Field:Contact.Legacy__c", "Legacy__c"),
                ],
            )
            conn.executemany(
                """
                INSERT INTO relationships
                  (src_id, dst_id, kind, writer_kind, source, confidence)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        edge.src_id,
                        edge.dst_id,
                        edge.kind,
                        edge.writer_kind,
                        edge.source,
                        edge.confidence,
                    )
                    for edge in parsed.edges
                    if edge.kind == "WRITES"
                ]
                + [
                    (
                        "Flow:Legacy",
                        "Field:Contact.Legacy__c",
                        "WRITES",
                        None,
                        "kb-index:test",
                        "medium",
                    )
                ],
            )
            classify_fields(conn)
            rows = dict(
                conn.execute(
                    "SELECT field_id, primary_kind FROM field_classification"
                ).fetchall()
            )
            self.assertEqual("flow", rows["Field:Contact.Events__c"])
            self.assertEqual("apex_other", rows["Field:Contact.OwnerId"])
            self.assertEqual("unknown_writer", rows["Field:Contact.Legacy__c"])

    def test_flow_parser_reads_start_filters_and_record_references(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "force-app/main/default"
            _write(
                root / "flows/Test_Flow.flow-meta.xml",
                """<Flow>
    <apiVersion>60.0</apiVersion>
    <status>Active</status>
    <processType>AutoLaunchedFlow</processType>
    <start>
        <object>Contact</object>
        <triggerType>RecordAfterSave</triggerType>
        <filters>
            <field>Email</field>
            <operator>IsNull</operator>
        </filters>
    </start>
    <decisions>
        <name>Has_Label</name>
        <rules>
            <conditions>
                <leftValueReference>$Record.All_Labels__c</leftValueReference>
                <operator>Contains</operator>
            </conditions>
        </rules>
    </decisions>
</Flow>
""",
            )

            parsed = parse_force_app(str(root))
            reads = {
                edge.dst_id
                for edge in parsed.edges
                if edge.src_id == "Flow:Test_Flow" and edge.kind == "READS"
            }
            self.assertIn("Field:Contact.Email", reads)
            self.assertIn("Field:Contact.All_Labels__c", reads)
            self.assertTrue(
                all(
                    edge.source.startswith("force-app/main/default/flows/")
                    for edge in parsed.edges
                    if edge.src_id == "Flow:Test_Flow"
                )
            )

    def test_report_parser_reads_filter_columns(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "force-app/main/default"
            _write(
                root / "reports/MS_Outreach/High_Value.report-meta.xml",
                """<Report>
    <columns>
        <field>Contact$FirstName</field>
    </columns>
    <filter>
        <criteriaItems>
            <column>Contact$MS_Capacity__c</column>
            <operator>equals</operator>
        </criteriaItems>
    </filter>
</Report>
""",
            )

            parsed = parse_force_app(str(root))
            refs = {
                edge.dst_id
                for edge in parsed.edges
                if edge.src_id == "Report:MS_Outreach.High_Value"
                and edge.kind == "REFERENCES"
            }
            self.assertIn("Field:Contact.FirstName", refs)
            self.assertIn("Field:Contact.MS_Capacity__c", refs)

    def test_overlay_tables_allow_component_refs_without_local_metadata(self) -> None:
        conn = sqlite3.connect(":memory:")
        conn.execute("PRAGMA foreign_keys = ON")
        conn.executescript(SCHEMA_SQL)
        conn.execute(
            """
            INSERT INTO field_groups (id, object_name, description)
            VALUES ('address.mailing', 'Contact', 'Mailing address')
            """
        )
        conn.execute(
            """
            INSERT INTO field_group_members (group_id, field_id, role)
            VALUES ('address.mailing', 'Field:Contact.MailingStreet', 'primary')
            """
        )
        conn.execute(
            """
            INSERT INTO processes (id, name)
            VALUES ('annual-ms-load', 'Annual MS Load')
            """
        )
        conn.execute(
            """
            INSERT INTO process_components (process_id, component_id, role)
            VALUES ('annual-ms-load', 'Field:Contact.MailingStreet', 'input')
            """
        )

    def test_custom_metadata_type_references_match_parser_component_ids(self) -> None:
        self.assertEqual(
            ("CustomMetadataType:Event_Label", "input"),
            _component_for_touched({"custom_metadata": "Event_Label__mdt"}),
        )
        self.assertEqual(
            ("CustomMetadata:Event_Label.X25_Test", "input"),
            _component_for_touched({"custom_metadata": "Event_Label__mdt.X25_Test"}),
        )

    def test_know_export_provider_loads_claims(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            export = Path(tmp) / "know-claims.json"
            _write(
                export,
                """{
  "claims": [
    {"src": "Flow:Update_Events", "dst": "Field:Contact.Events__c",
     "kind": "WRITES", "writer_kind": "flow_record_triggered",
     "evidence": "know node says this flow maintains the count",
     "node": "know-contact-automation"},
    {"src": "ApexClass:OwnerBatch", "dst": "Field:Contact.OwnerId",
     "kind": "READS"},
    {"src": "Flow:Broken", "kind": "WRITES"}
  ]
}""",
            )
            result = load_human_claims("know-export", know_export=str(export))

        self.assertEqual(2, len(result.edges))
        writes = result.edges[0]
        self.assertEqual("Flow:Update_Events", writes.src_id)
        self.assertEqual("know:know-contact-automation", writes.source)
        self.assertEqual("flow_record_triggered", writes.writer_kind)
        self.assertEqual("medium", writes.confidence)
        reads = result.edges[1]
        self.assertEqual("know:export", reads.source)
        self.assertIsNone(reads.writer_kind)
        # The malformed claim is skipped with a note, not a crash.
        self.assertTrue(any("skipped" in n for n in result.notes))

    def test_self_check_names_connection_and_both_claims(self) -> None:
        conn = sqlite3.connect(":memory:")
        conn.executescript(SCHEMA_SQL)
        conn.executemany(
            "INSERT INTO components (id, type, name, source) VALUES (?, ?, ?, ?)",
            [
                ("Flow:F", "Flow", "F", "force-app"),
                ("ApexClass:C", "ApexClass", "C", "force-app"),
                ("Field:Contact.A__c", "Field", "A__c", "force-app"),
                ("Field:Contact.B__c", "Field", "B__c", "force-app"),
            ],
        )
        conn.executemany(
            "INSERT INTO relationships "
            "(src_id, dst_id, kind, writer_kind, source, confidence, evidence) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                # Agreed: parser and a know-export claim say the same thing.
                ("Flow:F", "Field:Contact.A__c", "WRITES",
                 "flow_record_triggered", "force-app/flows/F.flow-meta.xml",
                 "high", None),
                ("Flow:F", "Field:Contact.A__c", "WRITES",
                 "flow_record_triggered", "know:know-flow-f", "medium",
                 "curated claim"),
                # Human-only: an Apex writer the parser cannot see.
                ("ApexClass:C", "Field:Contact.B__c", "WRITES",
                 "apex_kb_curated", "kb-index:field-writers.md", "medium",
                 "nightly batch"),
                # Parser-only: a READS edge no note covers.
                ("Flow:F", "Field:Contact.B__c", "READS", None,
                 "force-app/flows/F.flow-meta.xml", "high", None),
            ],
        )
        conn.commit()

        sc = run_self_check(conn)

        self.assertEqual(1, sc["agreed_pairs"])
        disagreements = sc["disagreements"]
        self.assertEqual(2, len(disagreements))
        by_dir = {d["direction"]: d for d in disagreements}

        human_only = by_dir["human_only"]
        self.assertEqual(
            "ApexClass:C -> Field:Contact.B__c (WRITES)", human_only["connection"]
        )
        self.assertIn("no such connection", human_only["parser_claim"])
        self.assertIn("kb-index:field-writers.md", human_only["human_claim"])
        self.assertIn("Apex writers", human_only["hint"])

        parser_only = by_dir["parser_only"]
        self.assertEqual(
            "Flow:F -> Field:Contact.B__c (READS)", parser_only["connection"]
        )
        self.assertIn("force-app/flows/F.flow-meta.xml", parser_only["parser_claim"])
        self.assertIn("no written claim", parser_only["human_claim"])


    def test_diff_graph_scopes_to_file_and_names_changed_connections(self) -> None:
        def make_db(path: Path, dst_field: str, class_rows: list) -> None:
            conn = sqlite3.connect(str(path))
            conn.executescript(SCHEMA_SQL)
            conn.executemany(
                "INSERT INTO components (id, type, name, file_path, source) "
                "VALUES (?, ?, ?, ?, ?)",
                [
                    ("Flow:F", "Flow", "F",
                     "flows/F.flow-meta.xml", "force-app"),
                    ("Flow:Other", "Flow", "Other",
                     "flows/Other.flow-meta.xml", "force-app"),
                    ("Field:O.A__c", "Field", "A__c", None, "force-app"),
                    ("Field:O.B__c", "Field", "B__c", None, "force-app"),
                ],
            )
            conn.executemany(
                "INSERT INTO relationships "
                "(src_id, dst_id, kind, writer_kind, source, confidence, evidence) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                    ("Flow:F", dst_field, "WRITES", "flow_record_triggered",
                     "force-app/flows/F.flow-meta.xml", "high", None),
                    # Out-of-scope noise that must not appear in a filtered diff.
                    ("Flow:Other", "Field:O.A__c", "READS", None,
                     "force-app/flows/Other.flow-meta.xml", "high", None),
                ],
            )
            conn.executemany(
                "INSERT INTO field_classification (field_id, primary_kind, "
                "writer_count, writer_kinds, has_formula, has_rollup) "
                "VALUES (?, ?, 0, '', 0, 0)",
                class_rows,
            )
            conn.commit()
            conn.close()

        with tempfile.TemporaryDirectory() as tmp:
            old_db = Path(tmp) / "old.sqlite"
            new_db = Path(tmp) / "new.sqlite"
            make_db(
                old_db, "Field:O.A__c",
                [("Field:O.A__c", "flow"), ("Field:O.B__c", "manual_only")],
            )
            # The "after" build: the flow now writes B instead of A.
            make_db(
                new_db, "Field:O.B__c",
                [("Field:O.A__c", "manual_only"), ("Field:O.B__c", "flow")],
            )

            diff = diff_graphs(old_db, new_db, files=["flows/F.flow-meta.xml"])

        self.assertEqual(1, len(diff["edges_added"]))
        self.assertIn("Field:O.B__c", diff["edges_added"][0])
        self.assertEqual(1, len(diff["edges_removed"]))
        self.assertIn("Field:O.A__c", diff["edges_removed"][0])
        # Classification changes ride along for the affected fields.
        changed_fields = {c["field"] for c in diff["classification_changes"]}
        self.assertEqual({"Field:O.A__c", "Field:O.B__c"}, changed_fields)
        # Nothing from the out-of-scope flow leaks in.
        self.assertFalse(
            any("Flow:Other" in e for e in diff["edges_added"] + diff["edges_removed"])
        )

    def test_graph_backend_resolution_and_publish(self) -> None:
        saved = os.environ.pop("GRAPH_BACKEND", None)
        try:
            self.assertEqual("local", resolve_backend())
            os.environ["GRAPH_BACKEND"] = "local"
            self.assertEqual("local", resolve_backend())
            # CLI flag wins over the env var.
            self.assertEqual("local", resolve_backend("local"))
            # The retired cloud modes are errors now, not silent fallbacks.
            for retired in ("cloud", "hybrid", "neon"):
                with self.assertRaises(SystemExit):
                    resolve_backend(retired)
        finally:
            if saved is None:
                os.environ.pop("GRAPH_BACKEND", None)
            else:
                os.environ["GRAPH_BACKEND"] = saved

        # local is a no-op: the SQLite build is the store.
        pub = publish("ignored.sqlite", "local")
        self.assertFalse(pub["published"])
        with self.assertRaises(SystemExit):
            publish("ignored.sqlite", "cloud")

    def test_field_group_fuzzy_lookup_returns_cluster_with_roles(self) -> None:
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        conn.executescript(SCHEMA_SQL)
        conn.execute(
            "INSERT INTO field_groups (id, object_name, description, added) "
            "VALUES ('crd.tier1', 'Contact', 'Authoritative CRD fields', "
            "'2026-05-11')"
        )
        conn.executemany(
            "INSERT INTO field_group_members (group_id, field_id, role, notes) "
            "VALUES (?, ?, ?, ?)",
            [
                ("crd.tier1", "Field:Contact.Mer_CRD__c", "primary",
                 "Meridian CRD"),
                ("crd.tier1", "Field:Contact.dd_rep_crd__c", "alternate",
                 "Discovery Data variant"),
            ],
        )
        conn.commit()

        # Fuzzy match by member field name, not just by group id.
        matches = find_field_groups(conn, "Mer_CRD")
        self.assertEqual(1, len(matches))
        group, members = matches[0]
        self.assertEqual("crd.tier1", group["id"])
        self.assertEqual(2, len(members))
        roles = {m["field_id"]: m["role"] for m in members}
        self.assertEqual("primary", roles["Field:Contact.Mer_CRD__c"])
        self.assertEqual("alternate", roles["Field:Contact.dd_rep_crd__c"])

        self.assertEqual([], find_field_groups(conn, "no-such-thing"))


if __name__ == "__main__":
    unittest.main()

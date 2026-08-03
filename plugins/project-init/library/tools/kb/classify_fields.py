"""Recompute field_classification rows from current relationships.

For every Field component, determine its primary writer kind based on:
  - metadata_json (formula/rollup intrinsic markers), then
  - the writer_kind values on incoming WRITES edges.

This module is idempotent: running it deletes the existing field_classification
rows and re-inserts. It only takes a sqlite3.Connection — caller manages commit.
"""

from __future__ import annotations

import json
import sqlite3
from typing import List, Tuple


# Priority order: (predicate, primary_kind)
# Each predicate takes (has_formula: int, has_rollup: int, writer_kinds: set[str])
# and returns True when that bucket applies.
def _starts(kinds, prefix):
    return any(k.startswith(prefix) for k in kinds)


def _primary_kind(
    has_formula: int,
    has_rollup: int,
    writer_kinds: set,
    writer_count: int,
) -> str:
    if has_rollup:
        return "rollup"
    if has_formula:
        return "formula"
    if _starts(writer_kinds, "apex_batch"):
        return "apex_batch"
    if _starts(writer_kinds, "apex_handler"):
        return "apex_handler"
    if _starts(writer_kinds, "apex_other"):
        return "apex_other"
    if _starts(writer_kinds, "apex_"):
        return "apex_other"
    if _starts(writer_kinds, "flow_record_triggered"):
        return "flow_record_triggered"
    if _starts(writer_kinds, "flow_scheduled"):
        return "flow_scheduled"
    if _starts(writer_kinds, "flow_"):
        return "flow"
    if "workflow_field_update" in writer_kinds:
        return "workflow_field_update"
    if "validation_rule" in writer_kinds:
        return "validation_rule"
    if "inbound_integration" in writer_kinds:
        return "inbound_integration"
    if writer_count:
        return "unknown_writer"
    if not writer_kinds:
        return "manual_only"
    return "apex_other"


def _parse_metadata_flags(metadata_json: str) -> Tuple[int, int]:
    """Return (has_formula, has_rollup) flags derived from a Field's metadata bag."""
    if not metadata_json:
        return 0, 0
    try:
        meta = json.loads(metadata_json)
    except (json.JSONDecodeError, TypeError):
        return 0, 0
    if not isinstance(meta, dict):
        return 0, 0
    has_formula = 1 if meta.get("formula") else 0
    has_rollup = 1 if meta.get("summaryOperation") else 0
    return has_formula, has_rollup


def classify_fields(conn: sqlite3.Connection) -> int:
    cur = conn.cursor()
    cur.execute("DELETE FROM field_classification")

    fields = cur.execute(
        "SELECT id, metadata_json FROM components WHERE type = 'Field'"
    ).fetchall()

    rows: List[tuple] = []
    for field_id_, metadata_json in fields:
        has_formula, has_rollup = _parse_metadata_flags(metadata_json)
        writer_rows = cur.execute(
            "SELECT writer_kind FROM relationships WHERE dst_id = ? AND kind = 'WRITES'",
            (field_id_,),
        ).fetchall()
        writers = [w[0] or "unknown_writer" for w in writer_rows]
        writer_count = len(writers)
        unique_kinds = sorted(set(writers))
        writer_kinds_str = ",".join(unique_kinds)
        primary = _primary_kind(has_formula, has_rollup, set(unique_kinds), writer_count)
        rows.append(
            (
                field_id_,
                primary,
                writer_count,
                writer_kinds_str,
                has_formula,
                has_rollup,
                None,  # notes — reserved for future refinement
            )
        )

    if rows:
        cur.executemany(
            """
            INSERT INTO field_classification
                (field_id, primary_kind, writer_count, writer_kinds,
                 has_formula, has_rollup, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
    return len(rows)

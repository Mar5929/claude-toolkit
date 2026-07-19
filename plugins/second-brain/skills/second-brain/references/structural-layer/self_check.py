"""Cross-validate parser-derived edges vs human-claimed edges.

The parser (parse_force_app.py) walks raw XML and emits relationships with
source paths under force-app/. Human claims come from a pluggable provider
(human_claims.py): davis-style curated markdown ('kb-index:...' sources) or a
second-brain know-* export ('know:...' sources). This module compares the two
sets for the WRITES and READS kinds and surfaces disagreements + dangling
edges.

Each disagreement entry names all three things the report needs: the
connection, the parser's claim, and the human's claim (WI-003 Phase 3
acceptance).

The result is a plain dict; this module never prints — the orchestrator decides
how to render the report.
"""

from __future__ import annotations

import sqlite3
from typing import Dict, List, Sequence, Set, Tuple

from human_claims import HUMAN_SOURCE_PATTERNS

EdgeKey = Tuple[str, str, str]
# src_id, dst_id, kind, writer_kind, source, confidence, evidence
EdgeRow = Tuple[str, str, str, str, str, str, str]

CHECKED_KINDS = ("WRITES", "READS")
ORPHAN_LIMIT = 200


def _fetch_edge_rows(
    cur: sqlite3.Cursor, kind: str, source_filter: str
) -> List[EdgeRow]:
    return cur.execute(
        """
        SELECT src_id, dst_id, kind, writer_kind, source, confidence, evidence
        FROM relationships
        WHERE kind = ? AND source LIKE ?
        ORDER BY src_id, dst_id, source
        """,
        (kind, source_filter),
    ).fetchall()


def _index_rows(rows: List[EdgeRow]) -> Dict[EdgeKey, List[EdgeRow]]:
    by_key: Dict[EdgeKey, List[EdgeRow]] = {}
    for r in rows:
        by_key.setdefault((r[0], r[1], r[2]), []).append(r)
    return by_key


def _describe_claim(rows: List[EdgeRow]) -> str:
    """One-line human-readable statement of what these edge rows claim."""
    parts = []
    for r in rows:
        _src, _dst, kind, writer_kind, source, confidence, evidence = r
        bits = [f"{kind}"]
        if writer_kind:
            bits.append(f"via {writer_kind}")
        bits.append(f"per {source}")
        bits.append(f"confidence {confidence}")
        if evidence:
            bits.append(f'evidence: "{evidence}"')
        parts.append(", ".join(bits))
    return " | ".join(parts)


def _hint_for_human_only(key: EdgeKey, component_ids: Set[str]) -> str | None:
    """Best-effort explanation of why the parser might lack this edge."""
    src, dst, kind = key
    if src.startswith("ApexClass:") and kind == "WRITES":
        return (
            "the parser does not extract Apex writers (known limit), so the "
            "human claim may still be right"
        )
    if dst not in component_ids:
        return (
            "the target component does not exist in the parsed force-app "
            "(possibly renamed, deleted, or not deployed)"
        )
    if src not in component_ids:
        return (
            "the source component does not exist in the parsed force-app "
            "(possibly renamed, deleted, or not deployed)"
        )
    return None


def run_self_check(
    conn: sqlite3.Connection,
    human_source_patterns: Sequence[str] = HUMAN_SOURCE_PATTERNS,
) -> Dict[str, object]:
    cur = conn.cursor()

    parser_rows: List[EdgeRow] = []
    human_rows: List[EdgeRow] = []

    for kind in CHECKED_KINDS:
        # Parser edges have source starting with 'force-app/'.
        parser_rows += _fetch_edge_rows(cur, kind, "force-app/%")
        for pattern in human_source_patterns:
            human_rows += _fetch_edge_rows(cur, kind, pattern)

    parser_by_key = _index_rows(parser_rows)
    human_by_key = _index_rows(human_rows)
    parser_set = set(parser_by_key)
    human_set = set(human_by_key)

    agreed = parser_set & human_set
    parser_only = sorted(parser_set - human_set)
    human_only = sorted(human_set - parser_set)

    component_ids: Set[str] = {
        r[0] for r in cur.execute("SELECT id FROM components").fetchall()
    }

    disagreements: List[Dict[str, object]] = []
    for key in human_only:
        src, dst, kind = key
        entry: Dict[str, object] = {
            "connection": f"{src} -> {dst} ({kind})",
            "src_id": src,
            "dst_id": dst,
            "kind": kind,
            "direction": "human_only",
            "parser_claim": "no such connection extracted from force-app source",
            "human_claim": _describe_claim(human_by_key[key]),
        }
        hint = _hint_for_human_only(key, component_ids)
        if hint:
            entry["hint"] = hint
        disagreements.append(entry)
    for key in parser_only:
        src, dst, kind = key
        disagreements.append(
            {
                "connection": f"{src} -> {dst} ({kind})",
                "src_id": src,
                "dst_id": dst,
                "kind": kind,
                "direction": "parser_only",
                "parser_claim": _describe_claim(parser_by_key[key]),
                "human_claim": "no written claim covers this connection",
            }
        )

    # Orphan edges: total count + a truncated sample.
    orphan_total_row = cur.execute(
        """
        SELECT COUNT(*) FROM relationships
        WHERE src_id NOT IN (SELECT id FROM components)
           OR dst_id NOT IN (SELECT id FROM components)
        """
    ).fetchone()
    orphan_total = orphan_total_row[0] if orphan_total_row else 0

    orphan_sample_rows = cur.execute(
        """
        SELECT src_id, dst_id, kind FROM relationships
        WHERE src_id NOT IN (SELECT id FROM components)
           OR dst_id NOT IN (SELECT id FROM components)
        LIMIT ?
        """,
        (ORPHAN_LIMIT,),
    ).fetchall()
    orphan_sample: List[EdgeKey] = [(r[0], r[1], r[2]) for r in orphan_sample_rows]

    return {
        "agreed_pairs": len(agreed),
        "parser_only": parser_only,
        # 'kb_only' kept as the historical key name; it means "human only"
        # whichever provider the claims came from.
        "kb_only": human_only,
        "disagreements": disagreements,
        "orphan_edges": orphan_sample,
        "orphan_edge_total": orphan_total,
    }

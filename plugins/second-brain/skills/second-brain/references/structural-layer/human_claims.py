"""Load "human claim" edges — the hand-written side of the self-check.

The graph has two kinds of truth about a connection:

- What the PARSER extracted mechanically from force-app source
  (parse_force_app.py; edge source starts with 'force-app/').
- What a HUMAN wrote down somewhere (edge source starts with 'kb-index:'
  or 'know:').

self_check.py compares the two and reports disagreements. This module is the
pluggable loader for the human side. Providers:

- "kb-index": davis-style curated markdown KB (field-writers.md, schedule.md)
  read by parse_kb_indexes.py from a repo root. Edge source: 'kb-index:...'.
- "know-export": a JSON file exported from the second-brain knowledge layer
  (know-* nodes). The graph never calls the second-brain service — that would
  break the offline/deterministic guarantee — so the knowledge layer exports
  its structured claims to a local file and this provider reads that file.
  Edge source: 'know:<node-id>'.

know-export JSON format (documented here, versioned by the top-level key):

    {
      "claims": [
        {
          "src": "Flow:FA_Pull_First_Name",        // required, component id
          "dst": "Field:Contact.Nickname__c",      // required, component id
          "kind": "WRITES",                        // required, WRITES or READS
          "writer_kind": "flow_record_triggered",  // optional (WRITES only)
          "confidence": "medium",                  // optional, default medium
          "evidence": "why the node claims this",  // optional
          "node": "know-contact-automation"        // optional, source node id
        }
      ]
    }

Public API:
    load_human_claims(provider, kb_root=None, know_export=None) -> ParseResult

HUMAN_SOURCE_PATTERNS is the list of SQL LIKE patterns that identify
human-claim edges in the relationships table, shared with self_check.py.
"""

from __future__ import annotations

import json
from pathlib import Path

from models import ParseResult, Edge
from parse_kb_indexes import parse_kb_indexes


PROVIDERS = ("kb-index", "know-export")

# SQL LIKE patterns matching every human-claim edge source this module emits.
HUMAN_SOURCE_PATTERNS = ("kb-index:%", "know:%")

_VALID_KINDS = ("WRITES", "READS")


def _load_know_export(path: Path) -> ParseResult:
    result = ParseResult()
    if not path.exists():
        result.notes.append(f"missing know-export file: {path}")
        return result

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        result.notes.append(f"know-export is not valid JSON ({exc}); no claims loaded")
        return result

    claims = data.get("claims")
    if not isinstance(claims, list):
        result.notes.append("know-export has no 'claims' list; no claims loaded")
        return result

    for i, claim in enumerate(claims):
        if not isinstance(claim, dict):
            result.notes.append(f"know-export claim #{i} is not an object; skipped")
            continue
        src = claim.get("src")
        dst = claim.get("dst")
        kind = claim.get("kind")
        if not src or not dst or kind not in _VALID_KINDS:
            result.notes.append(
                f"know-export claim #{i} missing src/dst or kind not in "
                f"{_VALID_KINDS}; skipped"
            )
            continue
        node = claim.get("node") or "export"
        result.edges.append(
            Edge(
                src_id=str(src),
                dst_id=str(dst),
                kind=kind,
                writer_kind=claim.get("writer_kind") if kind == "WRITES" else None,
                source=f"know:{node}",
                confidence=claim.get("confidence") or "medium",
                evidence=(claim.get("evidence") or None),
            )
        )
    return result


def load_human_claims(
    provider: str,
    kb_root: str | None = None,
    know_export: str | None = None,
) -> ParseResult:
    """Load human-claim edges from the chosen provider.

    kb_root: repo root whose engagement/knowledge-base/ holds the curated
    markdown (kb-index provider). know_export: path to the exported JSON
    (know-export provider).
    """
    if provider == "kb-index":
        if not kb_root:
            raise ValueError("kb-index provider needs kb_root")
        return parse_kb_indexes(kb_root)
    if provider == "know-export":
        if not know_export:
            raise ValueError("know-export provider needs know_export path")
        return _load_know_export(Path(know_export))
    raise ValueError(f"unknown human-claims provider: {provider!r} (use {PROVIDERS})")

"""build_graph.py: orchestrate the metadata catalog ETL.

Usage:
    python3 tools/kb/build_graph.py                  # full rebuild
    python3 tools/kb/build_graph.py --scope all
    python3 tools/kb/build_graph.py --scope force-app
    python3 tools/kb/build_graph.py --scope kb-index
    python3 tools/kb/build_graph.py --scope yamls
    python3 tools/kb/build_graph.py --scope flows
    python3 tools/kb/build_graph.py --scope ApexClass

Idempotent: each scope deletes only the rows it owns, then re-inserts.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

# Allow running both as module and as script
sys.path.insert(0, str(Path(__file__).parent))

from models import Component, Edge  # noqa: E402
from parse_force_app import parse_force_app  # noqa: E402
from human_claims import load_human_claims, PROVIDERS  # noqa: E402
from load_yaml import load_yaml  # noqa: E402
from classify_fields import classify_fields  # noqa: E402
from graph_backend import resolve_backend, publish, BACKENDS  # noqa: E402
from self_check import run_self_check  # noqa: E402


REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = Path(__file__).parent / "schema.sql"
# DragonFly default: co-locate the graph db next to the tool and gitignore it
# (tools/kb/*.sqlite). Overridable with --db. force-app default is this repo's
# own metadata root; overridable with --force-app so the tool can be pointed at
# any project's force-app (Phase 1 proves it against davis-advisors').
DB_PATH = Path(__file__).parent / "_graph.sqlite"
FORCE_APP_PATH = REPO_ROOT / "force-app" / "main" / "default"


VALID_SCOPES = {"all", "force-app", "kb-index", "yamls"}


def open_db(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA foreign_keys = ON")
    schema_sql = SCHEMA_PATH.read_text()
    conn.executescript(schema_sql)
    conn.commit()
    return conn


def clear_for_scope(conn: sqlite3.Connection, scope: str) -> None:
    cur = conn.cursor()
    if scope == "all":
        # Wipe everything except build_runs (audit trail)
        for tbl in (
            "field_classification",
            "field_group_members", "field_groups",
            "process_components", "processes",
            "term_aliases", "terminology",
            "client_lexicon",
            "relationships", "components",
        ):
            cur.execute(f"DELETE FROM {tbl}")
    elif scope == "force-app":
        cur.execute("DELETE FROM relationships WHERE source LIKE 'force-app/%'")
        # Leave Term/Process synthetic components alone
        cur.execute("DELETE FROM components WHERE source = 'force-app'")
    elif scope == "kb-index":
        # Human-claim edges from either provider (curated markdown indexes or
        # an export of the project's knowledge notes) live in this scope.
        cur.execute("DELETE FROM relationships WHERE source LIKE 'kb-index:%'")
        cur.execute("DELETE FROM relationships WHERE source LIKE 'know:%'")
    elif scope == "yamls":
        for tbl in (
            "field_group_members", "field_groups",
            "process_components", "processes",
            "term_aliases", "terminology",
            "client_lexicon",
        ):
            cur.execute(f"DELETE FROM {tbl}")
        cur.execute("DELETE FROM components WHERE source = 'yaml'")
    elif scope.startswith("flows"):
        cur.execute(
            "DELETE FROM relationships WHERE src_id LIKE 'Flow:%' "
            "AND source LIKE 'force-app/%'"
        )
        cur.execute("DELETE FROM components WHERE type = 'Flow' AND source = 'force-app'")
    elif scope.startswith("ApexClass"):
        if ":" in scope:
            target = scope.split(":", 1)[1]
            cid = f"ApexClass:{target}"
            cur.execute(
                "DELETE FROM relationships WHERE src_id = ? AND source LIKE 'force-app/%'",
                (cid,),
            )
            cur.execute("DELETE FROM components WHERE id = ?", (cid,))
        else:
            cur.execute(
                "DELETE FROM relationships WHERE src_id LIKE 'ApexClass:%' "
                "AND source LIKE 'force-app/%'"
            )
            cur.execute(
                "DELETE FROM components WHERE type = 'ApexClass' AND source = 'force-app'"
            )
    else:
        raise SystemExit(f"unknown scope: {scope}")
    conn.commit()


def insert_components(conn: sqlite3.Connection, comps: list[Component]) -> int:
    if not comps:
        return 0
    rows = [
        (c.id, c.type, c.name, c.parent_id, c.api_version, c.status,
         c.file_path, c.kb_doc_path, c.metadata_json, c.source)
        for c in comps
    ]
    conn.executemany(
        "INSERT OR IGNORE INTO components "
        "(id, type, name, parent_id, api_version, status, file_path, kb_doc_path, "
        " metadata_json, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rows,
    )
    conn.commit()
    return len(rows)


def insert_edges(conn: sqlite3.Connection, edges: list[Edge]) -> int:
    if not edges:
        return 0
    rows = [
        (e.src_id, e.dst_id, e.kind, e.writer_kind, e.source, e.confidence, e.evidence)
        for e in edges
    ]
    conn.executemany(
        "INSERT OR IGNORE INTO relationships "
        "(src_id, dst_id, kind, writer_kind, source, confidence, evidence) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        rows,
    )
    conn.commit()
    return len(rows)


def apply_kb_doc_paths(conn: sqlite3.Connection, mapping: dict) -> int:
    """Set components.kb_doc_path from the parse_kb_indexes mapping. Idempotent."""
    if not mapping:
        return 0
    cur = conn.cursor()
    rows = list(mapping.items())
    cur.executemany(
        "UPDATE components SET kb_doc_path = ? WHERE id = ? AND "
        "(kb_doc_path IS NULL OR kb_doc_path != ?)",
        [(path, cid, path) for cid, path in rows],
    )
    conn.commit()
    return cur.rowcount


def insert_yaml_rows(conn: sqlite3.Connection, yaml_data: dict) -> dict:
    """Insert all YAML-derived rows. Returns count summary by table."""
    counts: dict[str, int] = {}
    cur = conn.cursor()

    extra_components = yaml_data.get("components_extra") or []
    if extra_components:
        insert_components(conn, extra_components)
        counts["components_extra"] = len(extra_components)

    table_specs = [
        ("terminology", ("term", "canonical_id", "notes", "source", "added")),
        ("term_aliases", ("alias", "term")),
        ("processes",
         ("id", "name", "trigger_kind", "frequency", "owner", "notes", "added")),
        ("process_components", ("process_id", "component_id", "role")),
        ("field_groups", ("id", "object_name", "description", "added")),
        ("field_group_members", ("group_id", "field_id", "role", "notes")),
        ("client_lexicon",
         ("id", "date_resolved", "requester", "original_phrase", "context",
          "hypotheses_json", "resolution_components_json",
          "resolution_glossary_json", "resolution_process",
          "confirmed_by", "confirmed_on", "confirmation_channel", "notes")),
    ]
    for tbl, cols in table_specs:
        rows = yaml_data.get(tbl) or []
        if not rows:
            counts[tbl] = 0
            continue
        placeholders = ", ".join("?" * len(cols))
        col_list = ", ".join(cols)
        cur.executemany(
            f"INSERT OR REPLACE INTO {tbl} ({col_list}) VALUES ({placeholders})",
            [tuple(r.get(c) for c in cols) for r in rows],
        )
        counts[tbl] = len(rows)
    conn.commit()
    return counts


def record_build_run(conn: sqlite3.Connection, scope: str, summary: dict) -> None:
    conn.execute(
        "INSERT INTO build_runs (run_at, scope, components_added, "
        "relationships_added, orphan_refs, parser_kb_disagreements, notes) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            datetime.now(timezone.utc)
            .isoformat(timespec="seconds")
            .replace("+00:00", "Z"),
            scope,
            summary.get("components_added", 0),
            summary.get("relationships_added", 0),
            summary.get("orphan_refs", 0),
            summary.get("parser_kb_disagreements", 0),
            summary.get("notes_text", "")[:2000],
        ),
    )
    conn.commit()


def print_summary(conn: sqlite3.Connection, scope: str, build_summary: dict) -> None:
    cur = conn.cursor()

    print()
    print("=" * 72)
    print(f"  Metadata dependency graph build summary  (scope={scope})")
    print("=" * 72)

    print("\nComponents by type:")
    for row in cur.execute(
        "SELECT type, COUNT(*) FROM components GROUP BY type ORDER BY type"
    ):
        print(f"  {row[0]:<22}  {row[1]:>6}")
    total_c = cur.execute("SELECT COUNT(*) FROM components").fetchone()[0]
    print(f"  {'TOTAL':<22}  {total_c:>6}")

    print("\nRelationships by kind:")
    for row in cur.execute(
        "SELECT kind, COUNT(*) FROM relationships GROUP BY kind ORDER BY kind"
    ):
        print(f"  {row[0]:<22}  {row[1]:>6}")
    total_e = cur.execute("SELECT COUNT(*) FROM relationships").fetchone()[0]
    print(f"  {'TOTAL':<22}  {total_e:>6}")

    print("\nField classification:")
    for row in cur.execute(
        "SELECT primary_kind, COUNT(*) FROM field_classification "
        "GROUP BY primary_kind ORDER BY 2 DESC"
    ):
        print(f"  {row[0]:<22}  {row[1]:>6}")

    print("\nGlossary / processes / lexicon / field groups:")
    for tbl in ("terminology", "term_aliases", "processes",
                "process_components", "field_groups", "field_group_members",
                "client_lexicon"):
        n = cur.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
        print(f"  {tbl:<22}  {n:>6}")

    print(f"\nOrphan refs reported by force-app parser: "
          f"{build_summary.get('orphan_refs', 0)}")

    sc = build_summary.get("self_check", {})
    if sc:
        print("\nSelf-check (parser vs KB-index):")
        print(f"  agreed_pairs              {sc.get('agreed_pairs', 0)}")
        print(f"  parser_only WRITES/READS  {len(sc.get('parser_only', []))}")
        print(f"  kb_only     WRITES/READS  {len(sc.get('kb_only', []))}")
        print(f"  orphan edges (sample/total) "
              f"{len(sc.get('orphan_edges', []))} / "
              f"{sc.get('orphan_edge_total', 0)}")

    notes = build_summary.get("notes") or []
    if notes:
        print(f"\nParser notes ({len(notes)}):")
        for n in notes[:10]:
            print(f"  - {n}")
        if len(notes) > 10:
            print(f"  ... and {len(notes) - 10} more")

    print()


def write_check_report(path: Path, sc: dict, scope: str, db_path: Path) -> int:
    """Render the self-check disagreement list as a markdown report."""
    disagreements = sc.get("disagreements") or []
    human_only = [d for d in disagreements if d["direction"] == "human_only"]
    parser_only = [d for d in disagreements if d["direction"] == "parser_only"]

    lines = [
        "# Parser vs human-claims disagreement report",
        "",
        f"- Database: `{db_path}`",
        f"- Build scope: `{scope}`",
        f"- Agreed connections (both sides say the same thing): "
        f"{sc.get('agreed_pairs', 0)}",
        f"- Human claims the parser could not confirm: {len(human_only)}",
        f"- Parser connections no human note covers: {len(parser_only)}",
        "",
        "A disagreement is not automatically an error: the human notes cover a",
        "curated subset of the org, and the parser has known limits (it does",
        "not extract Apex or integration writers). Each entry names the",
        "connection, what the parser found, and what the human wrote, so a",
        "person can decide which side is right.",
        "",
    ]

    def emit(title: str, entries: list) -> None:
        lines.append(f"## {title} ({len(entries)})")
        lines.append("")
        for d in entries:
            lines.append(f"### {d['connection']}")
            lines.append(f"- Parser: {d['parser_claim']}")
            lines.append(f"- Human: {d['human_claim']}")
            if d.get("hint"):
                lines.append(f"- Likely explanation: {d['hint']}")
            lines.append("")

    emit("Human claims the parser could not confirm", human_only)
    emit("Parser connections no human note covers", parser_only)

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")
    return len(disagreements)


def run(
    scope: str,
    db_path: Path,
    force_app_path: Path = FORCE_APP_PATH,
    repo_root: Path = REPO_ROOT,
    kb_root: Path | None = None,
    human_source: str = "kb-index",
    know_export: str | None = None,
    check_report: str | None = None,
    backend: str | None = None,
) -> int:
    # Resolve up front so an invalid setting fails before the build starts.
    resolved_backend = resolve_backend(backend)
    conn = open_db(db_path)
    clear_for_scope(conn, scope)

    summary: dict = {
        "components_added": 0,
        "relationships_added": 0,
        "orphan_refs": 0,
        "notes": [],
    }

    if scope in ("all", "force-app", "flows") or scope.startswith("ApexClass"):
        print(f"[parse_force_app] walking {force_app_path}")
        r = parse_force_app(str(force_app_path))
        if scope == "flows":
            r.components = [c for c in r.components if c.type == "Flow"]
            r.edges = [e for e in r.edges if e.src_id.startswith("Flow:")]
        elif scope.startswith("ApexClass"):
            target_prefix = scope.replace("ApexClass:", "ApexClass:") if ":" in scope else "ApexClass:"
            if ":" in scope and scope != "ApexClass":
                r.components = [c for c in r.components if c.id == target_prefix]
                r.edges = [e for e in r.edges if e.src_id == target_prefix]
            else:
                r.components = [c for c in r.components if c.type == "ApexClass"]
                r.edges = [e for e in r.edges if e.src_id.startswith("ApexClass:")]
        summary["components_added"] += insert_components(conn, r.components)
        summary["relationships_added"] += insert_edges(conn, r.edges)
        summary["orphan_refs"] += len(r.orphan_refs)
        summary["notes"] += r.notes

    if scope in ("all", "kb-index"):
        print(f"[human_claims] loading human-claim edges via {human_source}")
        r = load_human_claims(
            human_source,
            kb_root=str(kb_root or repo_root),
            know_export=know_export,
        )
        summary["relationships_added"] += insert_edges(conn, r.edges)
        if r.kb_doc_paths:
            applied = apply_kb_doc_paths(conn, r.kb_doc_paths)
            summary["notes"].append(f"applied kb_doc_paths to {applied} components")
        summary["notes"] += r.notes

    if scope in ("all", "yamls"):
        print(f"[load_yaml] reading 4 YAML overlays")
        yaml_data = load_yaml(str(kb_root or repo_root))
        yaml_counts = insert_yaml_rows(conn, yaml_data)
        summary["notes"] += yaml_data.get("notes") or []
        summary["notes"].append(f"yaml row counts: {yaml_counts}")

    print(f"[classify_fields] deriving field classification")
    fc_count = classify_fields(conn)
    summary["notes"].append(f"classified {fc_count} fields")

    # self_check compares parser edges against a "human claim" edge set that
    # only exists once curated claims have been parsed. On a project with no
    # curated claims, a force-app-only build loads none, and the check would
    # flag every parser edge as "parser_only" noise. Guard it so it runs only
    # when curated-claim data is present.
    if scope in ("all", "kb-index"):
        print(f"[self_check] cross-validating parser vs human claims")
        sc = run_self_check(conn)
        summary["self_check"] = sc
        summary["parser_kb_disagreements"] = len(sc.get("disagreements") or [])
        if check_report:
            n = write_check_report(Path(check_report), sc, scope, db_path)
            print(f"[self_check] wrote disagreement report ({n} entries): "
                  f"{check_report}")

    summary["notes"].append(f"storage backend: {resolved_backend}")
    summary["notes_text"] = "\n".join(summary["notes"])
    record_build_run(conn, scope, summary)
    print_summary(conn, scope, summary)
    conn.close()

    # Post-build storage step. Local is a no-op: the SQLite file IS the store.
    pub = publish(str(db_path), resolved_backend)
    print(f"[graph_backend] {pub['backend']}: {pub['note']}")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description="Build the metadata dependency graph.")
    p.add_argument(
        "--scope",
        default="all",
        help=(
            "What to rebuild. One of: all (default), force-app, kb-index, yamls, "
            "flows, ApexClass, or ApexClass:<Name> for a single class."
        ),
    )
    p.add_argument("--db", default=str(DB_PATH), help="Path to the SQLite file.")
    p.add_argument(
        "--force-app",
        default=str(FORCE_APP_PATH),
        help="Path to the force-app metadata root to parse (default: this repo's).",
    )
    p.add_argument(
        "--human-source",
        choices=PROVIDERS,
        default="kb-index",
        help=(
            "Where the kb-index scope gets its human-claim edges: 'kb-index' "
            "(curated markdown under <kb-root>/engagement/knowledge-base/) or "
            "'know-export' (a JSON export of the project's knowledge notes)."
        ),
    )
    p.add_argument(
        "--kb-root",
        default=None,
        help=(
            "Repo root holding engagement/knowledge-base/ for the kb-index "
            "provider and the YAML overlays (default: this repo)."
        ),
    )
    p.add_argument(
        "--know-export",
        default=None,
        help="Path to the knowledge-claims JSON (required with "
             "--human-source know-export).",
    )
    p.add_argument(
        "--check-report",
        default=None,
        help=(
            "Write the parser-vs-human disagreement report to this markdown "
            "file (kb-index and all scopes only)."
        ),
    )
    p.add_argument(
        "--backend",
        choices=BACKENDS,
        default=None,
        help=(
            "Where this build is stored (default: GRAPH_BACKEND env var, then "
            "'local'). 'local' is the only supported value: the gitignored "
            "SQLite file this build writes is the store."
        ),
    )
    args = p.parse_args()

    scope = args.scope
    if scope not in VALID_SCOPES and not (
        scope == "flows"
        or scope == "ApexClass"
        or scope.startswith("ApexClass:")
    ):
        p.error(f"invalid --scope: {scope}")
    if args.human_source == "know-export" and not args.know_export:
        p.error("--human-source know-export requires --know-export <file>")

    return run(
        scope,
        Path(args.db),
        Path(args.force_app),
        kb_root=Path(args.kb_root) if args.kb_root else None,
        human_source=args.human_source,
        know_export=args.know_export,
        check_report=args.check_report,
        backend=args.backend,
    )


if __name__ == "__main__":
    raise SystemExit(main())

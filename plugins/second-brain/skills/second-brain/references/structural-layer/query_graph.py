"""query_graph.py — impact queries over the compiled dependency graph.

Reads a graph built by build_graph.py (never builds or writes it) and answers
the two daily org-merge questions for one component:

  1. Where does this value come from?  (its writers / inputs)
  2. If I rename or change this, what breaks?  (the N-hop impact radius)

Usage:
    python3 tools/kb/query_graph.py <component> [--db PATH] [--hops N]
                                    [--report FILE.md] [--include-contains]
    python3 tools/kb/query_graph.py --group <fuzzy-name> [--db PATH]
                                    [--report FILE.md]

<component> is a component id ("Field:Contact.Events__c", "Flow:FA_Pull_Name")
or a plain name / fragment ("Events", "Contact.Events__c"). If a fragment
matches more than one component the tool lists the candidates and stops.

--group answers the near-duplicate-fields question (WI-003 Phase 6 / backlog
A4): given a fuzzy name ("CRD", "mailing address", a field name), it returns
every curated field group whose id, object, description, or member fields
match, with each member's role and notes — the distinguishers a merge needs
when several lookalike fields exist. Groups come from the curated
_field_groups.yaml overlay (built with --scope yamls).

Notes:
  - Edge direction: "src <kind> dst". A field X is usually the dst (writers
    write TO it, readers read FROM it, formulas reference it). Anything that
    NAMES X breaks when X is renamed, so the 1-hop "direct connections" section
    lists every edge incident to X in either direction.
  - The multi-hop radius walks the graph undirected but SKIPS `CONTAINS` by
    default: an object CONTAINS all its fields, so one hop through the parent
    object would otherwise pull in every sibling field. Pass --include-contains
    to keep it.
  - Read-only. Org-independent. No network, no `sf` commands.
"""

from __future__ import annotations

import argparse
import sqlite3
import sys
from collections import deque
from pathlib import Path

DEFAULT_DB = Path(__file__).parent / "_graph.sqlite"

# One-hop edge kinds that answer "where does this value come from" when the
# component is the dst (writers) or, for a formula/rollup, the src (its inputs).
WRITER_KINDS = ("WRITES", "FORMULA_REFERENCES", "ROLLUP_OF")


def connect(db_path: Path) -> sqlite3.Connection:
    if not db_path.exists():
        raise SystemExit(
            f"graph db not found: {db_path}\n"
            f"build it first, e.g.:\n"
            f"  python3 tools/kb/build_graph.py --scope force-app "
            f"--force-app <path/to/force-app/main/default> --db {db_path}"
        )
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def resolve(conn: sqlite3.Connection, token: str) -> str:
    """Return a single component id, or exit listing candidates."""
    cur = conn.cursor()
    exact = cur.execute("SELECT id FROM components WHERE id = ?", (token,)).fetchone()
    if exact:
        return exact["id"]
    like = f"%{token}%"
    rows = cur.execute(
        "SELECT id, type, name FROM components "
        "WHERE id LIKE ? OR name LIKE ? ORDER BY type, id LIMIT 50",
        (like, like),
    ).fetchall()
    if not rows:
        raise SystemExit(f"no component matches: {token!r}")
    if len(rows) == 1:
        return rows[0]["id"]
    print(f"'{token}' matches {len(rows)} components; be more specific:\n")
    for r in rows[:50]:
        print(f"  {r['id']}")
    raise SystemExit(2)


def meta(conn: sqlite3.Connection) -> dict:
    return {
        r["id"]: (r["type"], r["name"])
        for r in conn.execute("SELECT id, type, name FROM components")
    }


def label(m: dict, cid: str):
    """(type, name) for a component id. Falls back to the id's own "Type:Name"
    shape for orphan endpoints (e.g. standard fields with no metadata file)."""
    if cid in m:
        return m[cid]
    if ":" in cid:
        return tuple(cid.split(":", 1))
    return ("?", cid)


def field_class(conn: sqlite3.Connection, cid: str):
    row = conn.execute(
        "SELECT primary_kind, writer_count, writer_kinds "
        "FROM field_classification WHERE field_id = ?",
        (cid,),
    ).fetchone()
    return row


def incident_edges(conn: sqlite3.Connection, cid: str) -> list:
    """Every edge that names cid, either direction."""
    return conn.execute(
        "SELECT src_id, dst_id, kind, writer_kind, source, confidence, evidence "
        "FROM relationships WHERE src_id = ? OR dst_id = ? "
        "ORDER BY kind, confidence DESC, src_id, dst_id",
        (cid, cid),
    ).fetchall()


def sources_of(conn: sqlite3.Connection, cid: str) -> list:
    """Writers/inputs: incoming WRITES to cid, plus a formula/rollup's own inputs."""
    incoming = conn.execute(
        "SELECT src_id, kind, writer_kind, source, confidence, evidence "
        "FROM relationships WHERE dst_id = ? AND kind = 'WRITES' "
        "ORDER BY confidence DESC, src_id",
        (cid,),
    ).fetchall()
    outgoing = conn.execute(
        "SELECT dst_id AS src_id, kind, writer_kind, source, confidence, evidence "
        "FROM relationships WHERE src_id = ? AND kind IN ('FORMULA_REFERENCES','ROLLUP_OF') "
        "ORDER BY kind, dst_id",
        (cid,),
    ).fetchall()
    return list(incoming) + list(outgoing)


def radius(conn, cid, hops, include_contains):
    """BFS out to `hops`. Returns {node_id: (min_hop, [(kind, confidence, other)])}."""
    edges = conn.execute(
        "SELECT src_id, dst_id, kind, confidence FROM relationships"
    ).fetchall()
    adj: dict = {}
    for e in edges:
        if e["kind"] == "CONTAINS" and not include_contains:
            continue
        adj.setdefault(e["src_id"], []).append((e["dst_id"], e["kind"], e["confidence"]))
        adj.setdefault(e["dst_id"], []).append((e["src_id"], e["kind"], e["confidence"]))
    seen = {cid: (0, [])}
    q = deque([cid])
    while q:
        node = q.popleft()
        d, _ = seen[node]
        if d >= hops:
            continue
        for nbr, kind, conf in adj.get(node, ()):
            if nbr not in seen:
                seen[nbr] = (d + 1, [(kind, conf, node)])
                q.append(nbr)
            elif seen[nbr][0] == d + 1:
                seen[nbr][1].append((kind, conf, node))
    del seen[cid]
    return seen


def render(conn, cid, hops, include_contains) -> str:
    m = meta(conn)
    typ, name = label(m, cid)
    out: list = []
    w = out.append

    w(f"# Impact report: {cid}")
    w("")
    w(f"- **Component:** {typ} `{name}`  (`{cid}`)")
    fc = field_class(conn, cid)
    if fc:
        w(f"- **How it's populated:** {fc['primary_kind']} "
          f"(writers: {fc['writer_count']}; kinds seen: {fc['writer_kinds'] or 'none'})")
    w(f"- **Radius:** {hops} hop(s); CONTAINS "
      f"{'included' if include_contains else 'skipped in multi-hop'}")
    w("")

    # Section 1: where the value comes from
    src = sources_of(conn, cid)
    w(f"## Where this value comes from ({len(src)})")
    if not src:
        w("_No writer or formula/rollup input found. Likely manual entry, or filled "
          "only by Apex/an integration (not captured by the Phase 1 parser)._")
    else:
        w("")
        w("| via | writer_kind | source | confidence | component |")
        w("| --- | --- | --- | --- | --- |")
        for r in src:
            other = r["src_id"]
            ot, on = label(m, other)
            w(f"| {r['kind']} | {r['writer_kind'] or ''} | {r['source']} "
              f"| {r['confidence']} | {ot} `{on}` |")
    w("")

    # Section 2: direct connections (1 hop, either direction) = rename blast at 1 hop
    inc = incident_edges(conn, cid)
    w(f"## Direct connections (1 hop): what names this ({len(inc)})")
    w("")
    w("| direction | kind | confidence | other component | source |")
    w("| --- | --- | --- | --- | --- |")
    for r in inc:
        if r["src_id"] == cid:
            other, arrow = r["dst_id"], f"{typ} ->"
        else:
            other, arrow = r["src_id"], f"-> {typ}"
        ot, on = label(m, other)
        w(f"| {arrow} | {r['kind']} | {r['confidence']} | {ot} `{on}` | {r['source']} |")
    w("")

    # Section 3: full N-hop impact radius
    rad = radius(conn, cid, hops, include_contains)
    w(f"## Impact radius (up to {hops} hop): what could break if this changes "
      f"({len(rad)})")
    if not rad:
        w("_Nothing else connects within the radius._")
    else:
        w("")
        w("| hops | type | name | via kind(s) | confidence |")
        w("| --- | --- | --- | --- | --- |")
        for node, (d, vias) in sorted(rad.items(), key=lambda kv: (kv[1][0], kv[0])):
            ot, on = label(m, node)
            kinds = sorted({k for k, _, _ in vias})
            confs = sorted({c for _, c, _ in vias})
            w(f"| {d} | {ot} | `{on}` | {', '.join(kinds)} | {', '.join(confs)} |")
    w("")
    return "\n".join(out)


def find_field_groups(conn: sqlite3.Connection, fragment: str) -> list:
    """Curated groups whose id/object/description or member fields match."""
    like = f"%{fragment}%"
    groups = conn.execute(
        """
        SELECT DISTINCT g.id, g.object_name, g.description, g.added
        FROM field_groups g
        LEFT JOIN field_group_members m ON m.group_id = g.id
        WHERE g.id LIKE ? OR g.object_name LIKE ? OR g.description LIKE ?
           OR m.field_id LIKE ?
        ORDER BY g.id
        """,
        (like, like, like, like),
    ).fetchall()
    out = []
    for g in groups:
        members = conn.execute(
            "SELECT field_id, role, notes FROM field_group_members "
            "WHERE group_id = ? ORDER BY role, field_id",
            (g["id"],),
        ).fetchall()
        out.append((g, members))
    return out


def render_groups(conn: sqlite3.Connection, fragment: str) -> str:
    matches = find_field_groups(conn, fragment)
    out: list = []
    w = out.append
    w(f"# Field groups matching {fragment!r} ({len(matches)})")
    w("")
    if not matches:
        w("_No curated field group matches. Either the fragment is off, or the_")
        w("_group overlay is not loaded (build with `--scope yamls`), or no one_")
        w("_has curated this cluster yet._")
        w("")
        return "\n".join(out)
    for g, members in matches:
        obj = g["object_name"] or "cross-object"
        w(f"## {g['id']}  ({obj})")
        w("")
        desc = " ".join((g["description"] or "").split())
        if desc:
            w(desc)
            w("")
        w("| field | role | how populated | distinguishing notes |")
        w("| --- | --- | --- | --- |")
        for mrow in members:
            fid = mrow["field_id"]
            fc = field_class(conn, fid)
            populated = fc["primary_kind"] if fc else ""
            w(f"| `{fid}` | {mrow['role'] or ''} | {populated} "
              f"| {mrow['notes'] or ''} |")
        w("")
    return "\n".join(out)


def render_map(conn: sqlite3.Connection) -> str:
    """Subsystem worklist for the knowledge-layer backfill (WI-003 Phase 8).

    Lists what exists and how connected it is, so a curator can seed know-*
    coverage for the busiest subsystems first.
    """
    out: list = []
    w = out.append
    w("# Subsystem map (from the compiled graph)")
    w("")

    objects = conn.execute(
        """
        SELECT o.name AS name,
          (SELECT COUNT(*) FROM components f
            WHERE f.type = 'Field' AND f.parent_id = o.id) AS fields,
          (SELECT COUNT(*) FROM relationships r
            WHERE r.kind = 'TRIGGERS_ON' AND r.dst_id = o.id) AS triggered_by,
          (SELECT COUNT(*) FROM relationships r
            WHERE r.kind = 'READS' AND r.dst_id = o.id) AS read_by
        FROM components o WHERE o.type = 'Object'
        ORDER BY fields DESC, o.name
        """
    ).fetchall()
    w(f"## Objects ({len(objects)})")
    w("")
    w("| object | fields | flows/triggers on it | read by |")
    w("| --- | --- | --- | --- |")
    for r in objects:
        w(f"| `{r['name']}` | {r['fields']} | {r['triggered_by']} | {r['read_by']} |")
    w("")

    flows = conn.execute(
        """
        SELECT c.name AS name,
          COALESCE((SELECT GROUP_CONCAT(REPLACE(r.dst_id, 'Object:', ''), ', ')
            FROM relationships r
            WHERE r.src_id = c.id AND r.kind = 'TRIGGERS_ON'), '') AS objects,
          (SELECT COUNT(*) FROM relationships r
            WHERE r.src_id = c.id AND r.kind = 'WRITES') AS writes,
          (SELECT COUNT(*) FROM relationships r
            WHERE r.src_id = c.id AND r.kind = 'READS') AS reads
        FROM components c WHERE c.type = 'Flow'
        ORDER BY writes + reads DESC, c.name
        """
    ).fetchall()
    w(f"## Flows ({len(flows)}) — busiest first")
    w("")
    w("| flow | triggers on | writes | reads |")
    w("| --- | --- | --- | --- |")
    for r in flows:
        w(f"| `{r['name']}` | {r['objects']} | {r['writes']} | {r['reads']} |")
    w("")

    apex = conn.execute(
        """
        SELECT c.name AS name,
          (SELECT COUNT(*) FROM relationships r
            WHERE r.src_id = c.id) AS outgoing,
          (SELECT COUNT(*) FROM relationships r
            WHERE r.dst_id = c.id AND r.kind IN ('INVOKES','SCHEDULES')) AS invoked_by
        FROM components c WHERE c.type = 'ApexClass'
        ORDER BY outgoing + invoked_by DESC, c.name
        """
    ).fetchall()
    w(f"## Apex classes ({len(apex)}) — busiest first")
    w("")
    w("| class | outgoing connections | invoked/scheduled by |")
    w("| --- | --- | --- |")
    for r in apex:
        w(f"| `{r['name']}` | {r['outgoing']} | {r['invoked_by']} |")
    w("")
    return "\n".join(out)


def main() -> int:
    p = argparse.ArgumentParser(description="Impact queries over the dependency graph.")
    p.add_argument("component", nargs="?",
                   help="component id or a name fragment")
    p.add_argument("--db", default=str(DEFAULT_DB), help="graph SQLite file")
    p.add_argument("--hops", type=int, default=2, help="impact radius depth (default 2)")
    p.add_argument("--report", help="also write the report to this markdown file")
    p.add_argument("--include-contains", action="store_true",
                   help="keep CONTAINS edges in the multi-hop walk (noisier)")
    p.add_argument("--group",
                   help="fuzzy field/group name: list matching curated field "
                        "groups with member roles + notes (near-duplicate "
                        "clusters)")
    p.add_argument("--map", action="store_true",
                   help="print the subsystem worklist (objects, flows, apex "
                        "ranked by connectedness) for the knowledge-layer "
                        "backfill")
    args = p.parse_args()

    chosen = [bool(args.component), bool(args.group), args.map]
    if sum(chosen) != 1:
        p.error("give exactly one of: <component>, --group <fuzzy-name>, or --map")

    # Windows consoles default to cp1252; never let a stray glyph crash output.
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    conn = connect(Path(args.db))
    if args.group or args.map:
        report = render_map(conn) if args.map else render_groups(conn, args.group)
        conn.close()
        print(report)
        if args.report:
            Path(args.report).write_text(report, encoding="utf-8")
            print(f"\n[wrote report to {args.report}]")
        return 0
    cid = resolve(conn, args.component)
    report = render(conn, cid, args.hops, args.include_contains)
    conn.close()

    print(report)
    if args.report:
        Path(args.report).write_text(report, encoding="utf-8")
        print(f"\n[wrote report to {args.report}]")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

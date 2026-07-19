"""graph_freshness_hook.py — keep the graph fresh without a manual step.

Installed as a Claude Code Stop hook (runs at the end of each turn). It makes
"a force-app file changed" turn into "these specific connections changed"
automatically (WI-003 Phase 8, folding in the Phase 4 drift mechanism):

1. Fingerprint every file under force-app/ (path, mtime, size). If nothing
   changed since the last stamp, exit silently — the common case, fast.
2. If files changed and a graph exists: snapshot it, rebuild the force-app
   scope, and diff old vs new scoped to the changed files.
3. If connections changed, write tools/kb/_drift_pending.md naming them. The
   project rule tells agents: when that file exists, dispatch the
   knowledge-curator to reconcile the covering know-* nodes, then delete it.

Behavior notes:
- If tools/kb/_graph.sqlite does not exist yet, the hook only maintains the
  stamp and exits: it never surprise-builds a graph nobody asked for.
- First run (no stamp): writes the stamp and exits, treating the current
  build as fresh.
- Kill switch: GRAPH_FRESHNESS=0 disables the hook entirely.
- Always exits 0; it must never block the session.

Artifacts (all gitignored): _graph_prev.sqlite, _freshness_stamp.json,
_drift_pending.md.
"""

from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

TOOLS_DIR = Path(__file__).resolve().parent
REPO_ROOT = TOOLS_DIR.parents[1]
FORCE_APP = REPO_ROOT / "force-app" / "main" / "default"
DB = TOOLS_DIR / "_graph.sqlite"
PREV_DB = TOOLS_DIR / "_graph_prev.sqlite"
STAMP = TOOLS_DIR / "_freshness_stamp.json"
DRIFT = TOOLS_DIR / "_drift_pending.md"


def fingerprint() -> dict:
    fp: dict = {}
    if not FORCE_APP.exists():
        return fp
    for f in sorted(FORCE_APP.rglob("*")):
        if f.is_file():
            st = f.stat()
            fp[f.relative_to(REPO_ROOT).as_posix()] = [
                int(st.st_mtime), st.st_size
            ]
    return fp


def main() -> int:
    if os.environ.get("GRAPH_FRESHNESS", "1") == "0":
        return 0
    # Consume (and ignore) the Stop-hook stdin payload.
    try:
        sys.stdin.read()
    except Exception:
        pass

    current = fingerprint()
    if not current:
        return 0  # no force-app content yet; nothing to track

    old = None
    if STAMP.exists():
        try:
            old = json.loads(STAMP.read_text(encoding="utf-8"))
        except Exception:
            old = None

    def save_stamp() -> None:
        STAMP.write_text(json.dumps(current, indent=0), encoding="utf-8")

    if old is None or not DB.exists():
        # First run, or no graph built yet: record state, change nothing.
        save_stamp()
        return 0

    changed = sorted(
        set(k for k in current if current.get(k) != old.get(k))
        | (set(old) - set(current))
    )
    if not changed:
        return 0

    # Rebuild and diff, scoped to the changed files.
    shutil.copyfile(DB, PREV_DB)
    import contextlib
    import io
    from build_graph import run as build_run  # deferred import: not on the fast path

    try:
        with contextlib.redirect_stdout(io.StringIO()):
            build_run("force-app", DB, FORCE_APP, REPO_ROOT)
    except SystemExit:
        pass  # a cloud-backend stop must not block the session
    save_stamp()

    from diff_graph import diff_graphs, render_text, _has_differences

    diff = diff_graphs(PREV_DB, DB, files=changed)
    if not _has_differences(diff):
        print("[graph-freshness] force-app changed; graph rebuilt; "
              "no connection changes in the changed files")
        return 0

    DRIFT.write_text(
        render_text(diff)
        + "\n---\n"
        + "Drift pending: dispatch the knowledge-curator to reconcile the "
        + "know-* nodes covering these files, then delete this file.\n",
        encoding="utf-8",
    )
    n = (len(diff["edges_added"]) + len(diff["edges_removed"])
         + len(diff["classification_changes"]))
    print(f"[graph-freshness] force-app changed; graph rebuilt; {n} connection/"
          f"classification change(s) -> {DRIFT.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

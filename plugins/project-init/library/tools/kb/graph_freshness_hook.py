"""graph_freshness_hook.py — notice when the metadata changed, and say what moved.

WI-007 phase 6. Installed as a Claude Code Stop hook, so it runs at the end of
each turn and turns "a metadata file changed" into "these exact connections
changed", with no manual step:

1. Fingerprint every file under `force-app/` (path, modified time, size). When
   nothing changed since the last stamp, exit at once. That is the common case
   and it costs a fraction of a second.
2. When files changed, work out which orgs they belong to and rebuild only
   those. Rebuilding one org takes about 25 seconds.
3. Compare the new edge list against the old one, scoped to the files that
   changed, and when connections moved write `tools/kb/_drift_pending.md`
   naming them.

**An earlier version of this hook never ran.** It watched
`force-app/main/default`, a fixed path that does not exist in a project keeping
one metadata folder per org (`force-app/<org>/main/default`). The fingerprint
came back empty every time and the hook exited at its first check, silently, for
as long as it was installed. Watching `force-app/` itself is the fix, and it
works for both layouts.

Rules it keeps:

- It never builds an edge list that does not already exist. A fresh checkout has
  no `out/` folder (the output is gitignored, SPEC decision 5), and a Stop hook
  is the wrong place to start a 50-second build nobody asked for. It records the
  fingerprint and waits until somebody runs `build_edges.py` themselves.
- It builds into a temporary folder and moves the finished files into place, so
  a hook that is killed part-way through can never leave a half-written edge
  list behind.
- It saves the stamp only after a rebuild finishes. A killed run therefore
  retries next turn instead of pretending it was done.
- `GRAPH_FRESHNESS=0` switches it off.
- It always exits 0. A freshness check must never block the session.

Everything it writes is gitignored: `_freshness_stamp.json`,
`_prev-edges-<org>.json`, `_prev-field-classification-<org>.json`, and
`_drift_pending.md`.
"""

from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
if str(THIS_DIR) not in sys.path:
    sys.path.insert(0, str(THIS_DIR))

from graph import find_repo_root  # noqa: E402

REPO_ROOT = find_repo_root()
FORCE_APP = REPO_ROOT / "force-app"
OUT_DIR = THIS_DIR / "out"
STAMP = THIS_DIR / "_freshness_stamp.json"
DRIFT = THIS_DIR / "_drift_pending.md"

# The five files build_edges.py writes for one org, plus the field labels this
# hook asks for so the comparison can report a field changing how it is filled.
BUILT_FILES = ("edges-{org}.json", "reverse-index-{org}.json",
               "coverage-{org}.json", "unresolved-{org}.json",
               "reports-{org}.md", "field-classification-{org}.json")

WHAT_TO_DO = """
---

**What to do with this file.** Something under `force-app/` changed and the
connections above moved with it. Read them, then check whether any of them
contradicts something recorded in `memory/knowledge/` or in a work item. If one
does, tell Mike and propose the correction; the memory librarian makes the
change once he approves it. Then delete this file.

Nothing else deletes it. It stays until somebody reads it.

Before saying "nothing writes this field" on the strength of the lines above,
read "What this cannot tell you" in `tools/kb/README.md`.
"""


def fingerprint() -> dict:
    """{repo-relative path: [modified time, size]} for everything in force-app."""
    marks: dict = {}
    if not FORCE_APP.exists():
        return marks
    for path in sorted(FORCE_APP.rglob("*")):
        if not path.is_file():
            continue
        stat = path.stat()
        marks[path.relative_to(REPO_ROOT).as_posix()] = [
            int(stat.st_mtime), stat.st_size]
    return marks


def changed_paths(current: dict, previous: dict) -> list:
    return sorted(
        set(name for name in current if current[name] != previous.get(name))
        | (set(previous) - set(current)))


def org_of(repo_relative: str) -> str:
    parts = repo_relative.split("/")
    return parts[1] if len(parts) >= 2 and parts[0] == "force-app" else ""


def rebuild(org: str) -> bool:
    """Rebuild one org into a temporary folder, then move it into place.

    Returns False when the build failed, in which case what was already on disk
    is untouched.
    """
    import contextlib
    import io

    import build_edges
    import classify_fields
    from graph import Graph

    with tempfile.TemporaryDirectory(dir=str(THIS_DIR)) as staging:
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                code = build_edges.main(["--org", org, "--out", staging])
                graph = Graph(org, staging)
                classify_fields.write_file(
                    graph, classify_fields.classify(graph), staging)
        except Exception as error:  # a freshness check must never break a session
            print(f"[graph-freshness] rebuilding {org} failed: {error}")
            return False
        if code != 0:
            print(f"[graph-freshness] rebuilding {org} did not pass its own "
                  "acceptance checks; nothing was replaced")
            return False
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        for pattern in BUILT_FILES:
            name = pattern.format(org=org)
            built = Path(staging) / name
            if built.exists():
                shutil.move(str(built), str(OUT_DIR / name))
    return True


def compare(org: str, files: list) -> str:
    """The readable comparison for one org, or "" when nothing moved."""
    from diff_graph import diff_edge_lists, has_differences, render_text

    previous = THIS_DIR / f"_prev-edges-{org}.json"
    previous_labels = THIS_DIR / f"_prev-field-classification-{org}.json"
    current = OUT_DIR / f"edges-{org}.json"
    current_labels = OUT_DIR / f"field-classification-{org}.json"
    if not previous.exists() or not current.exists():
        return ""

    def labels(path):
        if not path.exists():
            return {}
        doc = json.loads(path.read_text(encoding="utf-8"))
        return {row["field"]: row["primary_kind"] for row in doc["fields"]}

    diff = diff_edge_lists(previous, current, files=files,
                           old_labels=labels(previous_labels),
                           new_labels=labels(current_labels))
    return render_text(diff) if has_differences(diff) else ""


def main() -> int:
    if os.environ.get("GRAPH_FRESHNESS", "1") == "0":
        return 0
    # Consume and ignore the Stop-hook payload on stdin.
    try:
        sys.stdin.read()
    except Exception:
        pass

    current = fingerprint()
    if not current:
        return 0  # no metadata in this checkout yet; nothing to watch

    previous = None
    if STAMP.exists():
        try:
            previous = json.loads(STAMP.read_text(encoding="utf-8"))
        except Exception:
            previous = None

    def save_stamp():
        STAMP.write_text(json.dumps(current, indent=0), encoding="utf-8")

    if previous is None:
        # First run: record what is there and change nothing.
        save_stamp()
        return 0

    changed = changed_paths(current, previous)
    if not changed:
        return 0

    orgs = sorted({org for org in (org_of(name) for name in changed) if org})
    # Never build an edge list that does not already exist: a Stop hook is the
    # wrong place to start a build nobody asked for.
    orgs = [org for org in orgs if (OUT_DIR / f"edges-{org}.json").exists()]
    if not orgs:
        save_stamp()
        return 0

    reports = []
    for org in orgs:
        for name, prefix in (("edges", "_prev-edges"),
                             ("field-classification",
                              "_prev-field-classification")):
            built = OUT_DIR / f"{name}-{org}.json"
            if built.exists():
                shutil.copyfile(built, THIS_DIR / f"{prefix}-{org}.json")
        if not rebuild(org):
            continue
        scope = [name for name in changed if org_of(name) == org]
        report = compare(org, scope)
        if report:
            reports.append(report)

    save_stamp()

    if not reports:
        print(f"[graph-freshness] {len(changed)} file(s) changed under "
              f"force-app; rebuilt {', '.join(orgs)}; no connections moved")
        return 0

    DRIFT.write_text("\n".join(reports) + WHAT_TO_DO, encoding="utf-8",
                     newline="\n")
    print(f"[graph-freshness] {len(changed)} file(s) changed under force-app; "
          f"rebuilt {', '.join(orgs)}; connections moved -> "
          f"{DRIFT.relative_to(REPO_ROOT).as_posix()}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        # Nothing this hook can hit is worth breaking a session over.
        print(f"[graph-freshness] skipped: {error}")
        sys.exit(0)

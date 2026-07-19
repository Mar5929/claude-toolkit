#!/usr/bin/env python3
"""kb_freshness_hook.py: surface source drift to the knowledge layer.

The general-project half of the ongoing-freshness design (see the
second-brain skill's kb-backfill.md). Salesforce projects with the
structural layer installed use tools/kb/graph_freshness_hook.py INSTEAD:
that hook additionally rebuilds the compiled graph and names the changed
connections. Never install both; one project gets exactly one producer of
the drift file.

Installed as a Claude Code Stop hook at .claude/hooks/kb_freshness_hook.py.
It turns "source files changed" into a drift note the knowledge-curator
processes:

1. Fingerprint every file under the watched source paths (path, mtime,
   size). If nothing changed since the last stamp, exit silently: the
   common case, fast.
2. If files changed, write .claude/hooks/_drift_pending.md naming the
   added / modified / deleted files. The project rule
   (.claude/rules/knowledge-freshness.md) tells agents: when that file
   exists, dispatch the knowledge-curator to reconcile the know-* nodes
   covering those files (re-read each file, fix the node's why if intent
   moved, re-anchor its covers: SHA), then delete the file.

Configuration (project .claude/settings.json "env" block):
- KB_SOURCE_PATHS  comma-separated project-relative paths to watch, taken
                   from the curator profile's "Source code path(s)"
                   (for example "Anchor,AnchorTests" or "src,worker").
                   Unset or empty: the hook does nothing.
- KB_FRESHNESS=0   kill switch (for example during a bulk import).

Behavior notes (same contract as the structural layer's freshness hook):
- First run (no stamp): writes the stamp and exits; the current state is
  treated as fresh.
- An unprocessed _drift_pending.md is EXTENDED (union of files), never
  overwritten, so drift is not lost when changes land across several turns
  before a curator run.
- Always exits 0; it must never block the session.

Artifacts (both gitignored, next to this hook): _kb_freshness_stamp.json,
_drift_pending.md.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

HOOK_DIR = Path(__file__).resolve().parent
REPO_ROOT = Path(
    os.environ.get("CLAUDE_PROJECT_DIR") or HOOK_DIR.parents[1]
).resolve()
STAMP = HOOK_DIR / "_kb_freshness_stamp.json"
DRIFT = HOOK_DIR / "_drift_pending.md"

NOISE_DIRS = {
    ".git", "node_modules", "dist", "build", "out", "vendor", "Pods",
    "DerivedData", "__pycache__", ".venv", "venv", "coverage", ".next",
    ".turbo", "target", ".build",
}

DRIFT_LINE = re.compile(r"^- `(.+?)` \((added|modified|deleted)\)$")

HEADER = """# Drift pending: source files changed under the watched paths

Dispatch the knowledge-curator to reconcile the `know-*` nodes covering
these files (re-read each file, fix the node's why if intent moved,
re-anchor its `covers:` SHA), then DELETE this file.
"""


def watched_paths() -> list:
    raw = os.environ.get("KB_SOURCE_PATHS", "")
    return [p.strip().strip("/") for p in raw.split(",") if p.strip()]


def fingerprint(paths: list) -> dict:
    fp: dict = {}
    for rel in paths:
        root = REPO_ROOT / rel
        if not root.exists():
            continue
        for f in sorted(root.rglob("*")):
            if not f.is_file():
                continue
            if any(seg in NOISE_DIRS for seg in f.parts):
                continue
            st = f.stat()
            fp[f.relative_to(REPO_ROOT).as_posix()] = [
                int(st.st_mtime), st.st_size
            ]
    return fp


def existing_drift() -> dict:
    """Previously reported, still-unprocessed drift (path -> status)."""
    if not DRIFT.exists():
        return {}
    found: dict = {}
    try:
        for line in DRIFT.read_text(encoding="utf-8").splitlines():
            m = DRIFT_LINE.match(line.strip())
            if m:
                found[m.group(1)] = m.group(2)
    except Exception:
        pass
    return found


def main() -> int:
    if os.environ.get("KB_FRESHNESS", "1") == "0":
        return 0
    # Consume (and ignore) the Stop-hook stdin payload.
    try:
        sys.stdin.read()
    except Exception:
        pass

    paths = watched_paths()
    if not paths:
        return 0  # not configured; do nothing

    current = fingerprint(paths)
    if not current:
        return 0  # nothing under the watched paths yet

    old = None
    if STAMP.exists():
        try:
            old = json.loads(STAMP.read_text(encoding="utf-8"))
        except Exception:
            old = None

    STAMP.write_text(json.dumps(current, indent=0), encoding="utf-8")
    if old is None:
        return 0  # first run: current state is the baseline

    changed: dict = {}
    for p in current:
        if p not in old:
            changed[p] = "added"
        elif current[p] != old[p]:
            changed[p] = "modified"
    for p in old:
        if p not in current:
            changed[p] = "deleted"
    if not changed:
        return 0

    merged = existing_drift()
    merged.update(changed)
    lines = [f"- `{p}` ({merged[p]})" for p in sorted(merged)]
    DRIFT.write_text(HEADER + "\n" + "\n".join(lines) + "\n",
                     encoding="utf-8")
    try:
        rel = DRIFT.relative_to(REPO_ROOT)
    except ValueError:
        rel = DRIFT
    print(f"[kb-freshness] {len(changed)} source file change(s) -> {rel}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

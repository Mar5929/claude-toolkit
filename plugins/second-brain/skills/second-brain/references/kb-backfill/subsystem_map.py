#!/usr/bin/env python3
"""subsystem_map.py: deterministic, offline subsystem map for the KB backfill.

Prints the worklist the one-time knowledge-base backfill walks: every
subsystem an existing repo already contains, ranked busiest first, so
`know-*` seeding can go in batches of 5-10 starting where the action is.
This is the general-project counterpart of the Salesforce structural layer's
`query_graph.py --map` (which reads the compiled dependency graph instead).
See `references/kb-backfill.md` for the full procedure.

Map source per project type (auto-detected; override with --type):

- salesforce : NOT mapped here. Use the structural layer's compiled graph
               (`python3 tools/kb/query_graph.py --map`); this script only
               points there.
- ios        : app-target folders and their feature subfolders (the
               .xcodeproj / Package.swift layout). Bundle-style folders
               (.xcassets, .xcodeproj, ...) collapse to a single entry.
- web        : package workspaces (nested package.json folders) plus one
               folder level under the common source roots (src/, app/, ...).
- generic    : top-level tracked folders, split one level deeper under
               recognized source roots (src/, lib/, plugins/, tools/, ...).

Deterministic and offline: the map is a pure function of the tracked files
at the current commit (git ls-files) plus the commit history (git log) for
the "commits" column. No network, no builds, no third-party packages
(stdlib only). Outside a git repo it falls back to walking the filesystem
and leaves the commits column empty.

Usage:
  python3 subsystem_map.py [--repo PATH] [--type ios|web|generic] [--report FILE]
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

# Folders never worth mapping: build output, dependency caches, VCS internals.
NOISE_DIRS = {
    ".git", "node_modules", "dist", "build", "out", "vendor", "Pods",
    "DerivedData", "__pycache__", ".venv", "venv", "coverage", ".next",
    ".turbo", "target", ".build",
}

# Folder suffixes that are really one artifact (Xcode bundles etc.):
# collapse everything inside them to a single pseudo-file.
BUNDLE_SUFFIXES = (".xcassets", ".xcodeproj", ".xcworkspace", ".playground",
                   ".appiconset", ".colorset")

# Top-level dirs that hold code one level deeper: split them by subfolder.
SOURCE_ROOTS = {
    "src", "app", "lib", "server", "worker", "functions", "pages",
    "components", "api", "routes", "test", "tests", "plugins", "packages",
    "tools", "cmd", "internal", "pkg", "skills", "Sources", "Tests",
}

EXT_LANG = {
    ".swift": "Swift", ".ts": "TypeScript", ".tsx": "TypeScript",
    ".js": "JavaScript", ".jsx": "JavaScript", ".mjs": "JavaScript",
    ".py": "Python", ".rb": "Ruby", ".go": "Go", ".rs": "Rust",
    ".java": "Java", ".kt": "Kotlin", ".cls": "Apex", ".trigger": "Apex",
    ".html": "HTML", ".css": "CSS", ".scss": "CSS", ".sql": "SQL",
    ".sh": "shell", ".md": "Markdown", ".json": "config", ".yaml": "config",
    ".yml": "config", ".toml": "config", ".xml": "XML", ".plist": "config",
}

ENTRY_NAMES = {
    "index", "main", "app", "__init__", "package", "wrangler", "schema",
    "readme", "skill",
}


def run_git(repo: Path, *args: str) -> str | None:
    try:
        out = subprocess.run(
            ["git", "-C", str(repo), *args],
            capture_output=True, text=True, check=True, encoding="utf-8",
        )
        return out.stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def is_noise(path: str) -> bool:
    return any(
        seg in NOISE_DIRS or (seg.startswith(".") and seg not in (".", ".."))
        for seg in path.split("/")
    )


def collapse_bundles(path: str) -> str:
    """Fold files inside bundle-style folders into one pseudo-file."""
    segs = path.split("/")
    for i, seg in enumerate(segs):
        if seg.endswith(BUNDLE_SUFFIXES):
            return "/".join(segs[: i + 1])
    return path


def tracked_files(repo: Path) -> tuple[list, bool]:
    """Tracked files relative to repo (git first, filesystem fallback)."""
    out = run_git(repo, "ls-files", "-z", "--", ".")
    if out is not None:
        files = [f for f in out.split("\0") if f]
        return sorted({collapse_bundles(f) for f in files if not is_noise(f)}), True
    files = []
    for base, dirs, names in os.walk(repo):
        rel = Path(base).relative_to(repo).as_posix()
        dirs[:] = sorted(d for d in dirs
                         if d not in NOISE_DIRS and not d.startswith("."))
        for n in sorted(names):
            p = n if rel == "." else f"{rel}/{n}"
            if not is_noise(p):
                files.append(p)
    return sorted({collapse_bundles(f) for f in files}), False


def detect_type(files: list) -> str:
    roots = {f.split("/", 1)[0] for f in files}
    if "sfdx-project.json" in roots or any(f.startswith("force-app/") for f in files):
        return "salesforce"
    if any(".xcodeproj" in f for f in files) or "Package.swift" in roots:
        return "ios"
    if "package.json" in roots:
        return "web"
    return "generic"


def workspace_roots(files: list) -> list:
    """Folders holding their own package.json (monorepo workspaces)."""
    return sorted(
        f.rsplit("/", 1)[0] for f in files
        if f.endswith("/package.json") and f.count("/") >= 1
    )


def make_assigner(files: list, ptype: str):
    """Return assign(path) -> subsystem name. Pure and deterministic."""
    top_dirs = sorted({f.split("/", 1)[0] for f in files if "/" in f})

    if ptype == "ios":
        swift_tops = {f.split("/", 1)[0] for f in files
                      if "/" in f and f.endswith(".swift")}

        def assign(path: str) -> str:
            segs = path.split("/")
            if len(segs) == 1:
                return "(repo root)"
            top = segs[0]
            if top in swift_tops:
                if len(segs) >= 3:
                    return f"{top}/{segs[1]}"
                return f"{top} (root)"
            return top
        return assign

    if ptype == "web":
        wroots = [w for w in workspace_roots(files) if not is_noise(w)]
        # Longest workspace prefix wins (nested packages).
        wroots.sort(key=len, reverse=True)

        def assign(path: str) -> str:
            for w in wroots:
                if path.startswith(w + "/") or path == w:
                    return w
            segs = path.split("/")
            if len(segs) == 1:
                return "(repo root)"
            top = segs[0]
            if top in SOURCE_ROOTS:
                return f"{top}/{segs[1]}" if len(segs) >= 3 else f"{top} (root)"
            return top
        return assign

    # generic
    def assign(path: str) -> str:
        segs = path.split("/")
        if len(segs) == 1:
            return "(repo root)"
        top = segs[0]
        if top in SOURCE_ROOTS:
            return f"{top}/{segs[1]}" if len(segs) >= 3 else f"{top} (root)"
        return top
    return assign


def churn_counts(repo: Path, assign) -> dict | None:
    """Commits touching each subsystem. One git pass; None outside git.

    git log prints paths relative to the REPO ROOT even when run in a
    subfolder, while ls-files is cwd-relative; strip the subtree prefix so
    both passes speak the same paths, and limit the log to the subtree.
    """
    out = run_git(repo, "log", "--name-only", "--pretty=format:%H", "--", ".")
    if out is None:
        return None
    prefix = (run_git(repo, "rev-parse", "--show-prefix") or "").strip()
    counts: dict = defaultdict(int)
    seen: set = set()
    for line in out.splitlines():
        if not line.strip():
            continue
        if len(line) == 40 and all(c in "0123456789abcdef" for c in line):
            for s in seen:
                counts[s] += 1
            seen = set()
            continue
        if prefix:
            if not line.startswith(prefix):
                continue  # outside the mapped subtree
            line = line[len(prefix):]
        p = collapse_bundles(line)
        if not is_noise(p):
            seen.add(assign(p))
    for s in seen:
        counts[s] += 1
    return counts


def languages(paths: list) -> str:
    c = Counter()
    for p in paths:
        lang = EXT_LANG.get(Path(p).suffix.lower())
        if lang:
            c[lang] += 1
    top = [l for l, _ in sorted(c.items(), key=lambda kv: (-kv[1], kv[0]))[:2]]
    return ", ".join(top)


def notable(paths: list) -> str:
    names = sorted(paths, key=lambda p: p.lower())
    hits = [Path(p).name for p in names
            if Path(p).name.rsplit(".", 1)[0].lower() in ENTRY_NAMES
            or Path(p).name.lower().endswith("app.swift")]
    if len(hits) < 2:
        hits += [Path(p).name for p in names if Path(p).name not in hits]
    return ", ".join(dict.fromkeys(hits[:4]))


def render(repo: Path, ptype: str, detected: bool, in_git: bool,
           files: list, assign) -> str:
    buckets: dict = defaultdict(list)
    for f in files:
        buckets[assign(f)].append(f)
    churn = churn_counts(repo, assign) if in_git else None
    head = run_git(repo, "rev-parse", "--short", "HEAD") if in_git else None

    def sort_key(name: str):
        c = churn.get(name, 0) if churn else 0
        return (-c, -len(buckets[name]), name)

    out: list = []
    w = out.append
    w("# Subsystem map (from the repo structure)")
    w("")
    w(f"- Repo: `{repo}`")
    w(f"- Type: {ptype}" + (" (detected)" if detected else " (given)"))
    if head:
        w(f"- Commit: {head.strip()}")
    if not in_git:
        w("- Not a git repo: filesystem walk; commits column unavailable")
    w(f"- Subsystems: {len(buckets)}; tracked files mapped: {len(files)}")
    w("")
    w("| subsystem | files | commits | main languages | notable files |")
    w("| --- | --- | --- | --- | --- |")
    for name in sorted(buckets, key=sort_key):
        paths = buckets[name]
        c = str(churn.get(name, 0)) if churn is not None else "-"
        w(f"| `{name}` | {len(paths)} | {c} | {languages(paths)} "
          f"| {notable(paths)} |")
    w("")
    w("Busiest first (commits touching the subsystem, then file count). "
      "Next: seed `know-*` nodes in batches of 5-10 subsystems from the top; "
      "see the second-brain skill's `kb-backfill.md`.")
    return "\n".join(out)


def main() -> int:
    p = argparse.ArgumentParser(
        description="Deterministic offline subsystem map for the KB backfill.")
    p.add_argument("--repo", default=".",
                   help="repo root (or any folder inside one) to map")
    p.add_argument("--type", choices=["ios", "web", "generic"],
                   help="override the detected project type")
    p.add_argument("--report", help="also write the map to this markdown file")
    args = p.parse_args()

    repo = Path(args.repo).resolve()
    if not repo.exists():
        print(f"error: no such path: {repo}", file=sys.stderr)
        return 2

    files, in_git = tracked_files(repo)
    if not files:
        print(f"error: no tracked files found under {repo}", file=sys.stderr)
        return 2

    ptype = args.type or detect_type(files)
    if ptype == "salesforce" and not args.type:
        print("Salesforce project detected. The subsystem map for Salesforce "
              "comes from the compiled dependency graph, not this script:\n"
              "  python3 tools/kb/build_graph.py --scope force-app\n"
              "  python3 tools/kb/query_graph.py --map\n"
              "See the second-brain skill's structural-layer.md. "
              "(Use --type to force a structure-based map anyway.)")
        return 0

    report = render(repo, ptype, detected=args.type is None,
                    in_git=in_git, files=files,
                    assign=make_assigner(files, ptype))
    print(report)
    if args.report:
        Path(args.report).write_text(report + "\n", encoding="utf-8")
        print(f"\n[written] {args.report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

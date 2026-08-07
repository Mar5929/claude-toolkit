"""graph.py — read the JSON edge list without loading 213 MB into memory.

WI-007 phase 6. The four tools that used to query the SQLite graph
(`query_graph.py`, `diff_graph.py`, `classify_fields.py` and the Stop hook) all
read the files `build_edges.py` writes, and they all need the same three things:
the components, the edges, and the reverse index. This module is that shared
reader.

**It streams rather than loading.** The largest edge list measured so far is
213.6 MB. `json.load` on it costs about ten seconds and several gigabytes of
memory, which is far too much for a question like "what reads this field".
Phase 4 wrote the two big blocks one entry to a line for exactly this reason, so
`iter_edges` walks the file a line at a time and hands back one edge at a time.
A caller keeps only what it needs.

The file is still a single valid JSON document, so `json.load` remains correct
for anything small (the coverage report, the reverse index for one org). The
streaming path exists because it is cheap, not because the file is unusual.

Local files only. Nothing here contacts a Salesforce org.
"""

from __future__ import annotations

import json
from collections import deque
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent


def find_repo_root(start=None) -> Path:
    """The repository the tool is checked into.

    The first folder at or above `start` holding a `.git`. The tool ships at
    `<repo>/tools/kb`, so that folder is the fallback when nothing above is a
    repository (an unpacked zip, for example).
    """
    cur = Path(start or THIS_DIR).resolve()
    for candidate in [cur] + list(cur.parents):
        if (candidate / ".git").exists():
            return candidate
    return THIS_DIR.parent.parent


REPO_ROOT = find_repo_root()
DEFAULT_OUT = THIS_DIR / "out"
FORCE_APP = REPO_ROOT / "force-app"

# The relationships that answer "where does this value come from". An incoming
# `writes` says something puts a value in it; a formula or rollup's own outgoing
# edges are its inputs.
WRITER_RELATIONSHIPS = ("writes",)
INPUT_RELATIONSHIPS = ("formula_references", "rollup_of", "summarizes")

# Skipped by default in the multi-hop walk: an object contains all its fields,
# so one hop through the parent would otherwise pull in every sibling field.
CONTAINMENT = "contains"


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

def edges_path(org: str, out_dir=None) -> Path:
    return Path(out_dir or DEFAULT_OUT) / f"edges-{org}.json"


def index_path(org: str, out_dir=None) -> Path:
    return Path(out_dir or DEFAULT_OUT) / f"reverse-index-{org}.json"


def built_orgs(out_dir=None) -> list:
    """Every org that has an edge list on disk, in name order."""
    out = Path(out_dir or DEFAULT_OUT)
    if not out.exists():
        return []
    return sorted(p.name[len("edges-"):-len(".json")]
                  for p in out.glob("edges-*.json"))


def org_of_path(repo_relative: str) -> str:
    """The org a force-app path belongs to, or "" when it is not under one.

    force-app/sales/main/default/flows/X.flow-meta.xml -> sales
    """
    parts = repo_relative.replace("\\", "/").split("/")
    if len(parts) >= 2 and parts[0] == "force-app":
        return parts[1]
    return ""


# ---------------------------------------------------------------------------
# Which orgs this project has
# ---------------------------------------------------------------------------
#
# Nothing here knows the name of any org. A project's own folders supply the
# names, so the same tool runs against a two-org merge, a single standard
# Salesforce project, or ten orgs side by side, with no code change.
#
# Two layouts are understood, in this order:
#
# 1. `sfdx-project.json` lists its `packageDirectories`. Each one is an org,
#    named by the last segment of its path, holding its metadata at
#    `<path>/main/default`. A merge project pointing at `force-app/red` and
#    `force-app/blue` gets orgs called `red` and `blue`; an ordinary project
#    pointing at `force-app` gets one org called `force-app`.
# 2. No `sfdx-project.json`, so every folder directly under `force-app` that
#    holds a `main/default` is an org.
#
# A package directory holding no metadata is skipped rather than reported as an
# empty org. That is what an unused directory looks like: it exists, and holds
# at most a `.gitkeep` to keep git from dropping it.

def _holds_metadata(root: Path) -> bool:
    """True when a metadata root holds at least one file that is not hidden."""
    if not root.is_dir():
        return False
    for path in root.rglob("*"):
        if path.is_file() and not path.name.startswith("."):
            return True
    return False


def _package_directories(repo_root: Path) -> list:
    """The `packageDirectories` paths in sfdx-project.json, in file order."""
    manifest = repo_root / "sfdx-project.json"
    if not manifest.is_file():
        return []
    try:
        parsed = json.loads(manifest.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []
    entries = parsed.get("packageDirectories")
    if not isinstance(entries, list):
        return []
    paths = []
    for entry in entries:
        if isinstance(entry, dict) and isinstance(entry.get("path"), str):
            paths.append(entry["path"].replace("\\", "/").strip("/"))
    return paths


def source_roots(force_app=None, repo_root=None) -> dict:
    """Every org in this project, as {org name: its metadata root}.

    `force_app` overrides the search: when it is given, every folder under it
    holding a `main/default` is an org, and `sfdx-project.json` is not read.
    That is what the tests use, and what a project with its metadata somewhere
    unusual passes.
    """
    if force_app is not None:
        base = Path(force_app)
        if not base.is_dir():
            return {}
        found = {}
        for child in sorted(base.iterdir(), key=lambda p: p.name):
            root = child / "main" / "default"
            if child.is_dir() and _holds_metadata(root):
                found[child.name] = root
        return found

    root_dir = Path(repo_root) if repo_root else find_repo_root()
    found = {}
    for rel in _package_directories(root_dir):
        name = rel.rsplit("/", 1)[-1]
        metadata_root = root_dir / rel / "main" / "default"
        if name and _holds_metadata(metadata_root):
            found[name] = metadata_root
    if found:
        return dict(sorted(found.items()))

    return source_roots(force_app=root_dir / "force-app")


def select_orgs(requested=None, force_app=None, repo_root=None):
    """The orgs to work on, as ({org name: metadata root}, error message).

    `error message` is a plain sentence to print before stopping, or "" when
    the selection worked. Naming an org that does not exist is an error rather
    than an empty result, because an empty edge list looks like a real answer.
    """
    root_dir = Path(repo_root) if repo_root else find_repo_root()
    available = source_roots(force_app=force_app, repo_root=root_dir)
    looked_in = Path(force_app) if force_app is not None else root_dir

    if requested:
        missing = [org for org in requested if org not in available]
        if missing:
            if available:
                have = ", ".join(available)
                return {}, (f"no metadata for: {', '.join(missing)}\n"
                            f"this project has: {have}\n"
                            f"looked under {looked_in}")
            return {}, (f"no metadata for: {', '.join(missing)}\n"
                        f"no org metadata found at all under {looked_in}")
        return {org: available[org] for org in requested}, ""

    if not available:
        return {}, (f"no org metadata found under {looked_in}\n"
                    f"expected either packageDirectories in sfdx-project.json, "
                    f"or folders under force-app holding main/default\n"
                    f"name one directly with --org NAME --force-app PATH")
    return available, ""


def missing_build_message(org: str, path: Path) -> str:
    return (f"no edge list for {org}: {path}\n"
            f"build it first:\n"
            f"  python tools/kb/build_edges.py --org {org}\n"
            f"The output is never committed (SPEC decision 5), so a fresh "
            f"checkout always has to build it. Roughly 25 seconds per org.")


# ---------------------------------------------------------------------------
# Streaming
# ---------------------------------------------------------------------------

def _entries(handle, key: str):
    """Yield the raw JSON text of each entry inside a one-entry-per-line block.

    `dump()` in edge_list.py writes those blocks as:

        "edges": [
        {"id":"e...","source":...}
        ...
        ]

    so the block is found by its opening line and ends at the line holding only
    the closing bracket. Every line between is one entry, with the separating
    comma at the end. Nothing else in the file can look like this, because every
    other value is written with `indent=2` and is therefore indented.
    """
    opener_list = f'"{key}": ['
    opener_dict = f'"{key}": {{'
    inside = False
    closers = ("]", "],", "}", "},")
    for line in handle:
        if not inside:
            if line.startswith(opener_list) or line.startswith(opener_dict):
                inside = True
            continue
        stripped = line.rstrip("\n")
        if stripped in closers:
            return
        yield stripped.rstrip(",")


def iter_edges(path, key: str = "edges"):
    """Yield every edge in the file, one dict at a time. Constant memory."""
    path = Path(path)
    with path.open(encoding="utf-8") as handle:
        for text in _entries(handle, key):
            yield json.loads(text)


def load_components(path) -> dict:
    """{component id: component dict}. About 7,600 entries; small enough to hold."""
    path = Path(path)
    components = {}
    with path.open(encoding="utf-8") as handle:
        for text in _entries(handle, "components"):
            comp = json.loads(text)
            components[comp["id"]] = comp
    return components


def load_header(path) -> dict:
    """Everything above the components block: schema_version, org, counts, notes."""
    path = Path(path)
    header = {}
    wanted = {"schema_version", "org", "generated_from"}
    with path.open(encoding="utf-8") as handle:
        buffer = []
        depth = 0
        for line in handle:
            if line.startswith('"components": ['):
                break
            if depth == 0:
                for name in wanted:
                    prefix = f'"{name}": '
                    if line.startswith(prefix):
                        header[name] = json.loads(line[len(prefix):].rstrip(",\n"))
                if line.startswith('"counts": {'):
                    depth = 1
                    buffer = ["{"]
                    continue
            else:
                stripped = line.rstrip("\n")
                if stripped in ("}", "},"):
                    buffer.append("}")
                    header["counts"] = json.loads("".join(buffer))
                    depth = 0
                    continue
                buffer.append(stripped)
    return header


def load_reverse_index(org, out_dir=None) -> dict:
    """The whole reverse index for one org. 36 MB for Red; loads in a few seconds.

    This is the file that answers "what points at X" in one lookup, which is
    what SPEC requirement 5 asks for. It is a tenth the size of the edge list
    because it holds only the edge id, the source and the relationship.
    """
    path = index_path(org, out_dir)
    if not path.exists():
        raise SystemExit(missing_build_message(org, path))
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


# ---------------------------------------------------------------------------
# The in-memory view
# ---------------------------------------------------------------------------

class Graph:
    """One org's components plus a compact adjacency built by one file pass.

    The adjacency keeps four strings per edge rather than the whole edge, so
    Red's 348,922 edges cost roughly a tenth of what holding the parsed file
    would. Anything wanting an edge's evidence asks for it by id, which streams
    the file again.
    """

    def __init__(self, org: str, out_dir=None):
        self.org = org
        self.out_dir = Path(out_dir or DEFAULT_OUT)
        self.path = edges_path(org, self.out_dir)
        if not self.path.exists():
            raise SystemExit(missing_build_message(org, self.path))
        self.header = load_header(self.path)
        self.components = load_components(self.path)
        # id -> (source, target or "", relationship, resolution)
        self.edges: dict = {}
        self.out: dict = {}   # source id -> [edge id]
        self.into: dict = {}  # target id -> [edge id]
        for edge in iter_edges(self.path):
            eid = edge["id"]
            source = edge["source"]
            target = edge.get("target", "")
            self.edges[eid] = (source, target, edge["relationship"],
                               edge["resolution"])
            self.out.setdefault(source, []).append(eid)
            if target:
                self.into.setdefault(target, []).append(eid)

    # -- naming ------------------------------------------------------------

    def label(self, cid: str):
        """(type, api name) for a component id, falling back to the id's shape."""
        comp = self.components.get(cid)
        if comp:
            return comp["type"], comp["api_name"]
        parts = cid.split(":", 2)
        if len(parts) == 3:
            return parts[1], parts[2]
        return "?", cid

    def resolve(self, token: str) -> str:
        """One component id from an id, an api name, or a fragment of either.

        Exits listing the candidates when a fragment matches more than one, so a
        vague question never gets a confidently wrong answer.
        """
        if token in self.components:
            return token
        lowered = token.lower()
        exact_name = [cid for cid, c in self.components.items()
                      if c["api_name"].lower() == lowered]
        if len(exact_name) == 1:
            return exact_name[0]
        candidates = sorted(exact_name) or sorted(
            cid for cid, c in self.components.items()
            if lowered in cid.lower() or lowered in c["api_name"].lower())
        if not candidates:
            raise SystemExit(
                f"no component in {self.org} matches {token!r}. Component ids "
                f"look like {self.org}:CustomField:Case.Priority.")
        if len(candidates) == 1:
            return candidates[0]
        print(f"{token!r} matches {len(candidates)} components in {self.org}; "
              "be more specific:\n")
        for cid in candidates[:50]:
            print(f"  {cid}")
        if len(candidates) > 50:
            print(f"  ... and {len(candidates) - 50} more")
        raise SystemExit(2)

    # -- edges -------------------------------------------------------------

    def incident(self, cid: str) -> list:
        """Every edge id naming this component, either direction, no repeats."""
        seen = []
        known = set()
        for eid in list(self.out.get(cid, ())) + list(self.into.get(cid, ())):
            if eid not in known:
                known.add(eid)
                seen.append(eid)
        return seen

    def detail(self, edge_ids) -> dict:
        """{edge id: the whole edge} for the ids given, by one pass of the file.

        Streaming the file to fetch a handful of edges is deliberate: the
        alternative is holding every edge's evidence in memory for every query,
        which is what makes the naive reader unusable on Red.
        """
        wanted = set(edge_ids)
        found = {}
        if not wanted:
            return found
        for edge in iter_edges(self.path):
            if edge["id"] in wanted:
                found[edge["id"]] = edge
                if len(found) == len(wanted):
                    break
        return found

    def sources_of(self, cid: str) -> list:
        """Edge ids that explain where this component's value comes from."""
        writers = [eid for eid in self.into.get(cid, ())
                   if self.edges[eid][2] in WRITER_RELATIONSHIPS]
        inputs = [eid for eid in self.out.get(cid, ())
                  if self.edges[eid][2] in INPUT_RELATIONSHIPS]
        return writers + inputs

    def radius(self, cid: str, hops: int, include_contains=False) -> dict:
        """Breadth-first walk out to `hops`.

        Returns {component id: (hops away, [(relationship, other end)])}. The
        walk ignores direction, because anything that NAMES a component breaks
        when that component is renamed, whichever way the edge points.
        """
        seen = {cid: (0, [])}
        queue = deque([cid])
        while queue:
            node = queue.popleft()
            distance = seen[node][0]
            if distance >= hops:
                continue
            for eid in self.incident(node):
                source, target, relationship, _res = self.edges[eid]
                if relationship == CONTAINMENT and not include_contains:
                    continue
                other = target if source == node else source
                if not other or other == node:
                    continue
                if other not in seen:
                    seen[other] = (distance + 1, [(relationship, node)])
                    queue.append(other)
                elif seen[other][0] == distance + 1:
                    seen[other][1].append((relationship, node))
        del seen[cid]
        return seen

    def unresolved_named(self, name: str) -> list:
        """Edge ids holding a reference string that resolved to nothing."""
        index = load_reverse_index(self.org, self.out_dir)
        return [entry["edge"]
                for entry in index["by_unresolved_reference"].get(name, ())]

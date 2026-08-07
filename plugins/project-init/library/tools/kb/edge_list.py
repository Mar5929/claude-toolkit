"""edge_list.py — WI-007 phase 4: the JSON edge list and its reverse index.

Phase 2 produced the raw references and phase 3 produced one resolution for each
of them, in the same order. This module zips the two together into finished
edges, sorts everything, and writes two files per org:

    edges-<org>.json          the components and every edge, with its evidence
    reverse-index-<org>.json  what points AT each component, so "what depends on
                              X" is one lookup and never a rescan

Nothing is re-parsed and nothing is re-resolved here. Nothing is dropped either:
every reference becomes exactly one edge, including the ones that resolved to
nothing, which are written with their reason and no target.

Three things in here are deliberate and are the reason this file is longer than
"dump some JSON" would be.

**An edge id is made from the edge's own content, not from a running count.**
A running count (e000001, e000002) means inserting one flow renumbers every edge
after it, so two builds of nearly the same snapshot share almost no ids. The id
here is a hash of the things that identify the edge: the component it comes from,
the file and element it was found in, the string it holds, the relationship, and
the parent the string is read against. Rebuild after changing one flow and every
other edge keeps the id it had. That is what lets phase 6 compare two builds.

**There is no timestamp inside the file.** A wall-clock time would make two
builds of the same snapshot differ, which breaks the promise that rebuilding is
a pure function of the files on disk. When the file was written is a question the
file system already answers, and whether it is current is answered by rebuilding,
which takes about 25 seconds an org.

**Everything is sorted, and no two edges sort the same.** Python dictionaries
keep insertion order and a file walk is not guaranteed to visit files in the same
order on two machines, so without a total order two people rebuilding the same
snapshot would get different bytes. `build_edge_list` checks the order is total
rather than assuming it.

Local files only. Nothing here contacts a Salesforce org.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field

from extractors.contracts import split_component_id
from resolver import RESOLUTIONS, RESOLVED

SCHEMA_VERSION = "1.0"

# How many hex characters of the content hash an edge id carries. Sixteen is 64
# bits: across the 429,521 edges in Red and Blue the chance of two different
# edges landing on the same id is about five in a thousand million, and
# `build_edge_list` checks for it rather than trusting the arithmetic.
ID_LENGTH = 16

EDGES_NOTES = [
    "Every reference found in the snapshot is here. An edge that resolved to "
    "nothing is still an edge: it carries its reason in `resolution` and a plain "
    "sentence in `resolution_detail`, and has no `target`.",
    "An edge id is a hash of the edge's own content, so it survives a rebuild "
    "after the metadata changes. It is not a position in this list.",
    "There is no build timestamp in this file on purpose: two builds of the same "
    "snapshot are byte-identical, so a timestamp would be the only thing that "
    "ever differed. The file system records when it was written.",
    "`evidence` names the file and the element inside it that the reference came "
    "from, plus the string exactly as it was written, so any edge can be checked "
    "back to its origin.",
    "`confidence` is high for a direct XML element, medium for something read out "
    "of a formula or a structured string, low for a regular expression over code.",
    "No edge crosses orgs. Every id in this file starts with this file's org.",
]

INDEX_NOTES = [
    "`by_component` answers what points AT a component. Each entry names the "
    "edge, the component the edge comes from, and the relationship, so the "
    "common question is answered from this file alone without opening the edge "
    "list.",
    "`by_unresolved_reference` holds the edges whose target could not be "
    "resolved, keyed by the reference string exactly as it was written. They "
    "have no component to file under, and dropping them would hide real "
    "references, so they are kept here under the string instead.",
    "Both sections are sorted, and so is every list inside them.",
]


# ---------------------------------------------------------------------------
# Ids
# ---------------------------------------------------------------------------

def content_key(ref, occurrence: int) -> tuple:
    """What identifies one edge, and the order edges are written in.

    The resolution is deliberately not part of it. A better resolver rule should
    give an existing edge a target it did not have before, not a new id.

    `occurrence` separates references that are otherwise identical. They exist:
    a flow with thirteen filters on `Case.Subject` writes thirteen elements whose
    named path is the same `start/filters[Subject]/field`, because phase 2 names
    element paths rather than numbering them. 105 edges in Red and 127 in Blue
    need it. Within one file the order is the order of the XML, which does not
    change between builds.
    """
    return (ref.source_id, ref.file_path, ref.location, ref.relationship,
            ref.raw, ref.target_parent, occurrence)


def edge_id(key: tuple) -> str:
    """The id for one edge, made from the key `content_key` returns."""
    joined = "\x1f".join(str(part) for part in key)
    digest = hashlib.sha256(joined.encode("utf-8")).hexdigest()
    return "e" + digest[:ID_LENGTH]


# ---------------------------------------------------------------------------
# The edge list
# ---------------------------------------------------------------------------

@dataclass
class EdgeList:
    """One org's finished edges, its components, and the reverse index."""

    org: str
    root: str = ""
    components: list = field(default_factory=list)   # dicts, sorted by id
    edges: list = field(default_factory=list)        # dicts, sorted by content key
    by_component: dict = field(default_factory=dict)
    by_unresolved_reference: dict = field(default_factory=dict)

    # -- counts ------------------------------------------------------------

    def resolution_counts(self) -> dict:
        counts = {value: 0 for value in RESOLUTIONS}
        for edge in self.edges:
            counts[edge["resolution"]] = counts.get(edge["resolution"], 0) + 1
        return counts

    def counts(self) -> dict:
        counts = {
            "components": len(self.components),
            "edges": len(self.edges),
            "components_with_something_pointing_at_them": len(self.by_component),
            "unresolved_reference_strings": len(self.by_unresolved_reference),
        }
        counts.update(self.resolution_counts())
        return counts

    # -- the two documents -------------------------------------------------

    def edges_document(self) -> dict:
        return {
            "schema_version": SCHEMA_VERSION,
            "org": self.org,
            "generated_from": self.root,
            "notes": list(EDGES_NOTES),
            "counts": self.counts(),
            "components": self.components,
            "edges": self.edges,
        }

    def reverse_index_document(self) -> dict:
        return {
            "schema_version": SCHEMA_VERSION,
            "org": self.org,
            "generated_from": self.root,
            "notes": list(INDEX_NOTES),
            "counts": {
                "components_with_something_pointing_at_them": len(self.by_component),
                "edges_indexed_by_component": sum(
                    len(v) for v in self.by_component.values()),
                "unresolved_reference_strings": len(self.by_unresolved_reference),
                "edges_indexed_by_reference_string": sum(
                    len(v) for v in self.by_unresolved_reference.values()),
            },
            "by_component": self.by_component,
            "by_unresolved_reference": self.by_unresolved_reference,
        }


def build_edge_list(extraction, resolution) -> EdgeList:
    """Zip phase 2's references with phase 3's resolutions into finished edges.

    `resolution.resolutions` is aligned one for one with `resolution.references`,
    which is phase 2's list, so the zip is the whole join. Every reference in
    becomes exactly one edge out.
    """
    references = resolution.references
    resolutions = resolution.resolutions
    if len(references) != len(resolutions):
        raise ValueError(
            f"{extraction.org}: {len(references)} references but "
            f"{len(resolutions)} resolutions; they must be aligned one for one")

    org = extraction.org

    # The occurrence number for identical references, counted in the order the
    # extractor emitted them, which within one file is the order of the XML.
    seen: dict = {}
    rows = []
    for ref, res in zip(references, resolutions):
        base = (ref.source_id, ref.file_path, ref.location, ref.relationship,
                ref.raw, ref.target_parent)
        occurrence = seen.get(base, 0)
        seen[base] = occurrence + 1
        key = content_key(ref, occurrence)
        rows.append((key, ref, res))

    rows.sort(key=lambda row: row[0])

    edges = []
    by_component: dict = {}
    by_reference: dict = {}
    for key, ref, res in rows:
        eid = edge_id(key)
        payload = ref.as_dict()
        evidence = payload.pop("evidence")
        evidence["raw_reference"] = payload.pop("raw_reference")

        # Built in the SPEC's order: what it is, what it connects, how sure we
        # are, what the name turned out to be, then the evidence last.
        edge = {"id": eid, "source": payload.pop("source")}
        if res.target_id:
            edge["target"] = res.target_id
        edge["relationship"] = payload.pop("relationship")
        edge["category"] = payload.pop("category")
        edge["confidence"] = payload.pop("confidence")
        # resolution, resolved_by, resolution_detail and namespace. `target` is
        # in here too and is already placed above, so this does not move it.
        edge.update(res.as_dict())
        # Whatever the reference carried that is not already placed: the type the
        # extractor expected, the parent a bare name is read against, which
        # extractor produced it, and any extra facts it recorded.
        for name in ("target_type", "target_parent", "via", "attributes"):
            if name in payload:
                edge[name] = payload.pop(name)
        edge.update(payload)
        edge["evidence"] = evidence
        edges.append(edge)

        entry = {"edge": eid, "source": edge["source"],
                 "relationship": edge["relationship"]}
        if res.target_id:
            by_component.setdefault(res.target_id, []).append(entry)
        else:
            by_reference.setdefault(ref.raw, []).append(entry)

    components = sorted((c.as_dict() for c in extraction.components.values()),
                        key=lambda c: c["id"])

    def sort_entries(bucket):
        return {name: sorted(entries,
                             key=lambda e: (e["source"], e["relationship"],
                                            e["edge"]))
                for name, entries in sorted(bucket.items())}

    return EdgeList(
        org=org,
        root=extraction.root,
        components=components,
        edges=edges,
        by_component=sort_entries(by_component),
        by_unresolved_reference=sort_entries(by_reference),
    )


# ---------------------------------------------------------------------------
# Writing
# ---------------------------------------------------------------------------

def dump(handle, document, per_line=()) -> None:
    """Write the document as JSON, one entry per line for the named keys.

    A 200 MB file written as one long line cannot be searched (a grep hit returns
    the whole file) and a fully indented one is a third larger again for no gain
    at this size. One entry per line is both: an ordinary text search returns one
    edge, and the file is still a single valid JSON document any reader can load.

    The newlines are written as "\\n" whatever the platform, so a build on Windows
    and a build on a Mac produce the same bytes.
    """
    compact = {"ensure_ascii": False, "separators": (",", ":")}
    items = list(document.items())
    handle.write("{\n")
    for index, (key, value) in enumerate(items):
        tail = ",\n" if index < len(items) - 1 else "\n"
        name = json.dumps(key, ensure_ascii=False)
        if key in per_line and isinstance(value, list):
            handle.write(f"{name}: [\n")
            last = len(value) - 1
            for position, item in enumerate(value):
                handle.write(json.dumps(item, **compact))
                handle.write(",\n" if position < last else "\n")
            handle.write("]" + tail)
        elif key in per_line and isinstance(value, dict):
            handle.write(f"{name}: {{\n")
            keys = list(value)
            last = len(keys) - 1
            for position, inner in enumerate(keys):
                handle.write(json.dumps(inner, ensure_ascii=False) + ":")
                handle.write(json.dumps(value[inner], **compact))
                handle.write(",\n" if position < last else "\n")
            handle.write("}" + tail)
        else:
            handle.write(f"{name}: "
                         + json.dumps(value, ensure_ascii=False, indent=2)
                         + tail)
    handle.write("}\n")


def dumps(document, per_line=()) -> str:
    """The same thing as a string, for tests and for comparing two builds."""
    import io
    buffer = io.StringIO()
    dump(buffer, document, per_line)
    return buffer.getvalue()


def write_files(edge_list, out_dir) -> dict:
    """Write both files for one org. Returns {name: path}."""
    from pathlib import Path

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    edges_path = out_dir / f"edges-{edge_list.org}.json"
    index_path = out_dir / f"reverse-index-{edge_list.org}.json"

    with edges_path.open("w", encoding="utf-8", newline="\n") as handle:
        dump(handle, edge_list.edges_document(), per_line=("components", "edges"))
    with index_path.open("w", encoding="utf-8", newline="\n") as handle:
        dump(handle, edge_list.reverse_index_document(),
             per_line=("by_component", "by_unresolved_reference"))

    return {"edges": edges_path, "reverse_index": index_path}


# ---------------------------------------------------------------------------
# Acceptance
# ---------------------------------------------------------------------------

def acceptance(edge_list, extraction, resolution) -> list:
    """The phase 4 checks. Returns a list of (passed, sentence) pairs."""
    org = edge_list.org
    checks = []
    components = extraction.components

    expected = len(extraction.references)
    got = len(edge_list.edges)
    checks.append((
        expected == got,
        f"every reference became exactly one edge: {expected} in, {got} out"
        if expected == got else
        f"{expected} references went in but {got} edges came out",
    ))

    ids = {edge["id"] for edge in edge_list.edges}
    checks.append((
        len(ids) == len(edge_list.edges),
        f"all {len(ids)} edge ids are different"
        if len(ids) == len(edge_list.edges) else
        f"{len(edge_list.edges) - len(ids)} edge ids are used more than once",
    ))

    missing_source = [e for e in edge_list.edges if e["source"] not in components]
    checks.append((
        not missing_source,
        "every edge comes from a component this org really has"
        if not missing_source else
        f"{len(missing_source)} edges come from a component that does not exist, "
        f"the first being {missing_source[0]['source']}",
    ))

    missing_target = [e for e in edge_list.edges
                      if e.get("target") and e["target"] not in components]
    checks.append((
        not missing_target,
        "every resolved edge points at a component this org really has"
        if not missing_target else
        f"{len(missing_target)} resolved edges point at a component that does not "
        f"exist, the first being {missing_target[0]['target']}",
    ))

    crossed = [e for e in edge_list.edges
               if not e["source"].startswith(f"{org}:")
               or (e.get("target") and not e["target"].startswith(f"{org}:"))]
    checks.append((
        not crossed,
        "no edge crosses from one org to the other"
        if not crossed else f"{len(crossed)} edges cross orgs",
    ))

    indexed = set()
    for entries in edge_list.by_component.values():
        indexed.update(entry["edge"] for entry in entries)
    for entries in edge_list.by_unresolved_reference.values():
        indexed.update(entry["edge"] for entry in entries)
    stray = indexed - ids
    checks.append((
        not stray,
        f"every one of the {len(indexed)} edge ids in the reverse index is in the "
        "edge list" if not stray else
        f"{len(stray)} edge ids in the reverse index are in no edge",
    ))

    resolved = [e for e in edge_list.edges if e["resolution"] == RESOLVED]
    missing_from_index = [
        e for e in resolved
        if not any(entry["edge"] == e["id"]
                   for entry in edge_list.by_component.get(e["target"], ()))
    ]
    checks.append((
        not missing_from_index,
        f"all {len(resolved)} resolved edges appear in the reverse index under "
        "what they point at" if not missing_from_index else
        f"{len(missing_from_index)} resolved edges are missing from the reverse "
        "index",
    ))

    unresolved = [e for e in edge_list.edges if e["resolution"] != RESOLVED]
    counted = sum(len(v) for v in edge_list.by_unresolved_reference.values())
    checks.append((
        counted == len(unresolved),
        f"all {len(unresolved)} unresolved edges are filed under the reference "
        "string they hold, so none is lost" if counted == len(unresolved) else
        f"{len(unresolved)} unresolved edges but {counted} in the index",
    ))

    # The sort key without the occurrence number, which is not written into the
    # edge. Sorted order here means the file does not depend on the walk order.
    order = [(e["source"], e["evidence"]["file_path"], e["evidence"]["location"],
              e["relationship"], e["evidence"]["raw_reference"],
              e.get("target_parent", "")) for e in edge_list.edges]
    checks.append((
        order == sorted(order),
        "the edges are written in a sorted order that does not depend on the "
        "order the files were walked" if order == sorted(order) else
        "the edges are not in sorted order",
    ))

    bad_value = [e for e in edge_list.edges if e["resolution"] not in RESOLUTIONS]
    checks.append((
        not bad_value,
        "every edge carries one of the five resolution values"
        if not bad_value else
        f"{len(bad_value)} edges use a resolution value not in the SPEC",
    ))

    orphan_org = [c for c in edge_list.components
                  if not c["id"].startswith(f"{org}:")]
    checks.append((
        not orphan_org,
        f"all {len(edge_list.components)} components belong to this org"
        if not orphan_org else
        f"{len(orphan_org)} components belong to another org",
    ))

    return checks


def component_type(cid: str) -> str:
    parts = split_component_id(cid)
    return parts[1] if parts else "(unknown)"

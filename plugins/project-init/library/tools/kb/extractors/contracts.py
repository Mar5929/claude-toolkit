"""contracts.py — what a WI-007 phase 2 extractor produces.

Phase 2 turns files into two things: components (the nodes) and RAW references
(the half-built edges). A raw reference holds the name string exactly as it was
written in the file, plus enough context for phase 3 to resolve that string into
a real component id. Phase 2 never drops a reference it cannot resolve; deciding
what a name points at is phase 3's job, and marking it unresolved is phase 3's
job too.

Every reference carries three things, because SPEC requirement 6 says any edge
must be checkable back to its origin:

    file_path   the file it came from, repo-relative
    location    the XML element path inside that file, or "line 42" for code
    raw         the reference string exactly as written, unmodified

Ids are org-tagged: "red:CustomField:Case.Priority". SPEC decision 2 says every
component id and every edge carries its org so no edge can ever cross orgs, even
though Red and Blue are written to separate files.

The type token in an id is the Salesforce metadata type name, the same vocabulary
`file_registry.py` produces ("CustomField", not "Field"). The SPEC's illustrative
JSON used "Field" in the id and "CustomField" in the type field of the same
example; one vocabulary everywhere means an id and its type can never disagree.

This contract used to sit beside a second one, `models.py`, which fed the SQLite
graph four working features still depended on. Keeping the two apart is what let
phase 2 land without breaking anything that worked. Phase 6 moved those four
features onto the JSON on 2026-08-05 and deleted `models.py` with the rest of
the SQLite half, so this is now the only contract.
"""

from __future__ import annotations

from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# Vocabulary
# ---------------------------------------------------------------------------

# Six categories. SPEC: the relationship list is open so a new kind of
# connection never breaks an old consumer, but every reference also carries a
# category, so a consumer meeting an unknown relationship can still place it.
CATEGORIES = (
    "data_access",    # reads, writes, filters, displays a field or object
    "invocation",     # one thing calls or launches another
    "structure",      # the object model: lookups, containment, inheritance
    "security",       # who is granted what
    "presentation",   # what appears on a page, layout or app
    "integration",    # anything crossing the org boundary
)

# The relationships in use today, grouped by category. Open list: an extractor
# may emit a new one, and must give it a category from the tuple above.
RELATIONSHIPS = {
    # data_access
    "reads": "data_access",
    "writes": "data_access",
    "filters_on": "data_access",
    "groups_by": "data_access",
    "sorts_by": "data_access",
    "summarizes": "data_access",
    "deletes": "data_access",
    "queries": "data_access",
    # invocation
    "invokes": "invocation",
    "calls_flow": "invocation",
    "calls_subflow": "invocation",
    "sends_email_alert": "invocation",
    "creates_task": "invocation",
    "sends_outbound_message": "invocation",
    "schedules": "invocation",
    "triggers_on": "invocation",
    "handled_by": "invocation",
    "invocable_for": "invocation",
    "tests": "invocation",
    # structure
    "lookup": "structure",
    "master_detail": "structure",
    "contains": "structure",
    "extends": "structure",
    "implements": "structure",
    "rollup_of": "structure",
    "formula_references": "structure",
    "controlled_by": "structure",
    "value_set_of": "structure",
    "record_type_of": "structure",
    "active_version_of": "structure",
    "translates": "structure",
    "compiled_from": "structure",
    # security
    "grants_field_read": "security",
    "grants_field_edit": "security",
    "grants_object_read": "security",
    "grants_object_create": "security",
    "grants_object_edit": "security",
    "grants_object_delete": "security",
    "grants_view_all": "security",
    "grants_modify_all": "security",
    "grants_apex_access": "security",
    "grants_page_access": "security",
    "grants_flow_access": "security",
    "grants_tab": "security",
    "grants_app": "security",
    "grants_record_type": "security",
    "grants_custom_permission": "security",
    "grants_layout": "security",
    "contains_permission_set": "security",
    "shares_with": "security",
    "shares_on": "security",
    "assigned_to": "security",
    "member_of": "security",
    # presentation
    "displays": "presentation",
    "displays_component": "presentation",
    "displays_related_list": "presentation",
    "displays_action": "presentation",
    "overrides_action": "presentation",
    "shows_tab": "presentation",
    "targets_object": "presentation",
    # integration
    "calls_endpoint": "integration",
    "uses_credential": "integration",
    "uses_data_source": "integration",
    "publishes_to": "integration",
    # unclassified: the generic pass, when the element names a reference but the
    # element alone does not say what kind of connection it is.
    "references": "structure",
}

CONFIDENCE = ("high", "medium", "low")


def category_for(relationship: str) -> str:
    """The category a relationship belongs to, 'structure' when it is new."""
    return RELATIONSHIPS.get(relationship, "structure")


# ---------------------------------------------------------------------------
# Ids
# ---------------------------------------------------------------------------

def component_id(org: str, metadata_type: str, api_name: str) -> str:
    """The one id format: org, metadata type, qualified api name.

    red:CustomField:Case.Priority
    blue:Flow:Case_Escalation
    red:Layout:Account-Account Layout
    """
    return f"{org}:{metadata_type}:{api_name}"


def split_component_id(cid: str):
    """(org, metadata_type, api_name) from an id, or None when it is malformed."""
    parts = cid.split(":", 2)
    if len(parts) != 3:
        return None
    return parts[0], parts[1], parts[2]


# ---------------------------------------------------------------------------
# Records
# ---------------------------------------------------------------------------

@dataclass
class ExtractedComponent:
    """One node: a thing another thing can point at."""

    id: str
    org: str
    type: str                     # Salesforce metadata type name
    api_name: str
    parent_id: str = ""           # the component that contains this one
    file_path: str = ""           # repo-relative posix
    attributes: dict = field(default_factory=dict)

    def as_dict(self) -> dict:
        out = {
            "id": self.id,
            "org": self.org,
            "type": self.type,
            "api_name": self.api_name,
            "file_path": self.file_path,
        }
        if self.parent_id:
            out["parent"] = self.parent_id
        if self.attributes:
            out["attributes"] = self.attributes
        return out


@dataclass
class RawReference:
    """One half-built edge: a name string plus everything phase 3 needs.

    target_type and target_parent are hints, not answers. `target_type` says
    what kind of component the string is expected to name; "" means the extractor
    genuinely does not know. `target_parent` is the api name the string is
    relative to, so a bare field name like "Priority" found inside a record
    update on Case resolves against Case rather than guessing.
    """

    org: str
    source_id: str
    raw: str                      # exactly as written in the file
    relationship: str
    category: str
    confidence: str
    file_path: str
    location: str                 # XML element path, or "line 42"
    target_type: str = ""         # expected metadata type of the target
    target_parent: str = ""       # api name the raw string is relative to
    via: str = ""                 # which extractor produced it
    attributes: dict = field(default_factory=dict)

    def dedupe_key(self):
        """Two references from the same spot in the same file are one reference."""
        return (self.source_id, self.file_path, self.location, self.raw,
                self.relationship, self.target_parent)

    def as_dict(self) -> dict:
        out = {
            "source": self.source_id,
            "raw_reference": self.raw,
            "relationship": self.relationship,
            "category": self.category,
            "confidence": self.confidence,
            "evidence": {
                "file_path": self.file_path,
                "location": self.location,
            },
            "via": self.via,
        }
        if self.target_type:
            out["target_type"] = self.target_type
        if self.target_parent:
            out["target_parent"] = self.target_parent
        if self.attributes:
            out["attributes"] = self.attributes
        return out


@dataclass
class FileOutcome:
    """What happened to one file. SPEC requirement 1: no silent skips.

    Every file the registry lists gets exactly one of these, whether it was
    opened or not, and `reason` says why when nothing came out of it.
    """

    org: str
    file_path: str                # repo-relative posix
    metadata_type: str
    role: str                     # primary | sidecar | bundle_member | non_metadata
    opened: bool
    extractor: str                # deep extractor name, "generic", or ""
    component_count: int = 0
    reference_count: int = 0
    reason: str = ""              # required when reference_count is 0
    error: str = ""               # set when the file could not be read or parsed

    def as_dict(self) -> dict:
        out = {
            "file_path": self.file_path,
            "metadata_type": self.metadata_type,
            "role": self.role,
            "opened": self.opened,
            "extractor": self.extractor,
            "components": self.component_count,
            "references": self.reference_count,
        }
        if self.reason:
            out["reason"] = self.reason
        if self.error:
            out["error"] = self.error
        return out


@dataclass
class ExtractionResult:
    """Everything one org's tree produced."""

    org: str
    root: str = ""
    components: dict = field(default_factory=dict)      # id -> ExtractedComponent
    references: list = field(default_factory=list)
    outcomes: list = field(default_factory=list)
    notes: list = field(default_factory=list)
    # metadata type -> leaf tag -> count, for elements the generic pass saw and
    # did NOT treat as a reference. This is how the reference-tag table grows
    # from evidence rather than guesswork.
    tag_census: dict = field(default_factory=dict)
    # Every object and Apex class name the registry found, read from the file
    # names before any file is opened. The Apex reader needs both: it tells an
    # SObject variable from an ordinary one by asking whether the org has an
    # object of that type, and it only reports a call to a class that exists.
    known_objects: set = field(default_factory=set)
    known_classes: set = field(default_factory=set)

    # -- adding ------------------------------------------------------------

    def add_component(self, comp: ExtractedComponent) -> str:
        """Register a component. A second sighting merges rather than replaces."""
        existing = self.components.get(comp.id)
        if existing is None:
            self.components[comp.id] = comp
            return comp.id
        if not existing.file_path and comp.file_path:
            existing.file_path = comp.file_path
        if not existing.parent_id and comp.parent_id:
            existing.parent_id = comp.parent_id
        for key, value in comp.attributes.items():
            existing.attributes.setdefault(key, value)
        return comp.id

    def add_reference(self, ref: RawReference) -> None:
        self.references.append(ref)

    def note(self, message: str) -> None:
        self.notes.append(message)

    def census(self, metadata_type: str, tag_name: str) -> None:
        bucket = self.tag_census.setdefault(metadata_type, {})
        bucket[tag_name] = bucket.get(tag_name, 0) + 1

    # -- summaries ---------------------------------------------------------

    def references_by_type(self) -> dict:
        """metadata type of the SOURCE file -> how many references it produced."""
        counts: dict = {}
        for outcome in self.outcomes:
            counts[outcome.metadata_type] = (
                counts.get(outcome.metadata_type, 0) + outcome.reference_count
            )
        return counts

    def files_by_type(self) -> dict:
        counts: dict = {}
        for outcome in self.outcomes:
            counts[outcome.metadata_type] = counts.get(outcome.metadata_type, 0) + 1
        return counts

    def relationship_counts(self) -> dict:
        counts: dict = {}
        for ref in self.references:
            counts[ref.relationship] = counts.get(ref.relationship, 0) + 1
        return dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])))

    def component_counts(self) -> dict:
        counts: dict = {}
        for comp in self.components.values():
            counts[comp.type] = counts.get(comp.type, 0) + 1
        return dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])))

    def unexplained_zero_files(self) -> list:
        """Files that produced nothing and did not say why. Must always be empty."""
        return [o for o in self.outcomes
                if o.reference_count == 0 and not o.reason and not o.error]

    def as_dict(self) -> dict:
        return {
            "schema_version": "1.0",
            "org": self.org,
            "generated_from": self.root,
            "component_count": len(self.components),
            "reference_count": len(self.references),
            "file_count": len(self.outcomes),
            "components": [c.as_dict() for c in self.components.values()],
            "references": [r.as_dict() for r in self.references],
            "coverage": [o.as_dict() for o in self.outcomes],
            "notes": list(self.notes),
        }


# ---------------------------------------------------------------------------
# What an extractor is handed
# ---------------------------------------------------------------------------

class FileContext:
    """One file, plus the shortest path to emitting from it.

    An extractor is a function taking a FileContext and returning nothing. It
    reads `ctx.abs_path` (already long-path safe), and calls `ctx.component()`
    and `ctx.reference()`. The driver owns everything else: which extractor runs,
    the generic pass afterwards, deduplication, and the file's outcome record.
    """

    def __init__(self, org, record, abs_path, result, extractor_name=""):
        self.org = org
        self.record = record
        self.abs_path = abs_path
        self.result = result
        self.extractor_name = extractor_name

        self.repo_path = record.repo_path
        self.rel_path = record.rel_path
        self.metadata_type = record.metadata_type
        self.component_name = record.component_name
        self.parent_name = record.parent_name
        self.role = record.role

        # Filled by the extractor, read by the driver for the outcome record.
        self.reasons: list = []
        self.own_component_id = ""
        self.xml_root = None
        # Element paths a deep extractor has read in full. The generic pass skips
        # anything at or under one of these, so the two passes never report the
        # same element twice.
        self.consumed: set = set()
        self._components = 0
        self._references = 0

    # -- emitting ----------------------------------------------------------

    def component(self, metadata_type=None, api_name=None, parent_id="",
                  file_path=None, **attributes) -> str:
        """Register a component and return its id. A second call merges into it."""
        mtype = metadata_type or self.metadata_type
        name = api_name if api_name is not None else self.component_name
        cid = component_id(self.org, mtype, name)
        is_new = cid not in self.result.components
        self.result.add_component(ExtractedComponent(
            id=cid, org=self.org, type=mtype, api_name=name,
            parent_id=parent_id,
            file_path=self.repo_path if file_path is None else file_path,
            attributes={k: v for k, v in attributes.items() if v not in (None, "")},
        ))
        if is_new:
            self._components += 1
        return cid

    def consume(self, location: str) -> None:
        """Say the deep extractor has read this element and everything under it."""
        if location:
            self.consumed.add(location)

    def is_consumed(self, location: str) -> bool:
        """Is this element at or under something a deep extractor already read?

        Checked by walking the element path's own ancestors against a set rather
        than by scanning every consumed prefix. A large profile consumes tens of
        thousands of blocks, so a linear scan here would make one file quadratic.
        """
        if not self.consumed:
            return False
        parts = location.split("/")
        for depth in range(len(parts), 0, -1):
            if "/".join(parts[:depth]) in self.consumed:
                return True
        return False

    def self_component(self, **attributes) -> str:
        """Register the component this file IS, and remember it as the default source."""
        cid = self.component(**attributes)
        if not self.own_component_id:
            self.own_component_id = cid
        return cid

    def reference(self, raw, relationship, location, source_id=None,
                  target_type="", target_parent="", confidence="high",
                  category=None, **attributes) -> None:
        """Record one raw reference. Blank or whitespace-only strings are ignored."""
        if raw is None:
            return
        text = raw.strip() if isinstance(raw, str) else str(raw)
        if not text:
            return
        self.result.add_reference(RawReference(
            org=self.org,
            source_id=source_id or self.own_component_id,
            raw=text,
            relationship=relationship,
            category=category or category_for(relationship),
            confidence=confidence,
            file_path=self.repo_path,
            location=location,
            target_type=target_type,
            target_parent=target_parent,
            via=self.extractor_name,
            attributes={k: v for k, v in attributes.items() if v not in (None, "")},
        ))
        self._references += 1

    # -- explaining --------------------------------------------------------

    def reason(self, message: str) -> None:
        """Say why this file produced no references. Required when it produces none."""
        if message and message not in self.reasons:
            self.reasons.append(message)

    def note(self, message: str) -> None:
        self.result.note(f"{self.repo_path}: {message}")

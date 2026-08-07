"""resolver.py — WI-007 phase 3: turn a raw reference string into a component id.

Phase 2 hands over 429,521 raw references across Red and Blue. Each one holds the
name string exactly as it was written in the file, plus two hints: `target_type`,
the kind of component the string is expected to name, and `target_parent`, the api
name a bare field name is relative to. Neither hint is an answer.

This module turns each string into the id of a real component in the SAME org, or
records why it could not. **Nothing is ever dropped.** Every reference in gets
exactly one resolution out, and the count is asserted by a test.

The five resolution values come from the SPEC and are the only ones allowed:

    resolved                        the string names a component in this snapshot
    unresolved_managed_package      it belongs to a managed package; the namespace
                                    is recorded beside it
    unresolved_not_in_snapshot      a well-formed name of a component this snapshot
                                    does not contain
    unresolved_dynamic              built at run time, so no name exists to resolve
    unresolved_unknown              the string is not a component name we can place

Every resolution also carries two things the five values are too coarse to say:
`rule`, which resolution rule decided it, and `detail`, one plain sentence a person
can read. The report groups by both, so a weak spot shows up as a named rule with a
count rather than disappearing into an average.

Local files only. Nothing here contacts a Salesforce org: Red and Blue are both
production, and `.claude/rules/dependency-graph.md` rule 5 forbids an org call
during a build. The org cross-check is phase 7 and is read-only.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from urllib.parse import unquote

from extractors.contracts import component_id, split_component_id
from extractors.names import namespace_of

# ---------------------------------------------------------------------------
# The five values, and nothing else
# ---------------------------------------------------------------------------

RESOLVED = "resolved"
UNRESOLVED_MANAGED_PACKAGE = "unresolved_managed_package"
UNRESOLVED_NOT_IN_SNAPSHOT = "unresolved_not_in_snapshot"
UNRESOLVED_DYNAMIC = "unresolved_dynamic"
UNRESOLVED_UNKNOWN = "unresolved_unknown"

RESOLUTIONS = (
    RESOLVED,
    UNRESOLVED_MANAGED_PACKAGE,
    UNRESOLVED_NOT_IN_SNAPSHOT,
    UNRESOLVED_DYNAMIC,
    UNRESOLVED_UNKNOWN,
)

# The string phase 2 writes where a name would be, when the name only exists at
# run time: dynamic SOQL, Type.forName, a merge field built inside a string.
DYNAMIC_MARKER = "(built at run time)"


# ---------------------------------------------------------------------------
# Shapes a raw string can have
# ---------------------------------------------------------------------------

_URL = re.compile(r"^(?:https?|ftp)://", re.IGNORECASE)
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")

# The legacy tokens Salesforce still writes into layouts, list views, dashboards
# and reports instead of api names: ACCOUNT.TYPE, CORE.USERS.LAST_NAME,
# OPPORTUNITY.CLOSE_DATE, PARENT_NAME. They sit beside real api names in the same
# file, which is why they cannot simply be filtered out.
_LEGACY_TOKEN = re.compile(r"^[A-Z0-9]+(?:_[A-Z0-9]+)*(?:\.[A-Z0-9]+(?:_[A-Z0-9]+)*)*$")

# The legacy report token shape: Object$Field, and Object.Relationship$Field.
_REPORT_TOKEN = re.compile(r"^([A-Za-z0-9_.]+)\$([A-Za-z0-9_]+)$")

# A syntactically valid Salesforce api name, or a dotted path of them.
_API_PATH = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$")
_SINGLE_API_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

# A layout is named Object-Layout Name, and a report or email template
# Folder/Name. Both are valid component names with a character an api name has
# not got, so they need their own test.
_LAYOUT_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*-.+$")
_FOLDERED_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*/[A-Za-z_][A-Za-z0-9_]*$")

# A platform Lightning component: flexipage:column, force:detailPanel,
# runtime_sales_activities:activityPanel. Never a component in a snapshot.
_PLATFORM_COMPONENT = re.compile(r"^[a-z][A-Za-z0-9_]*:[A-Za-z0-9_]+$")

# The prefixes Salesforce puts on its own tabs and applications.
_STANDARD_PREFIXES = ("standard-", "standard__")

# The actions every object has whether or not anyone defined them. A layout or an
# object naming one of these is naming the platform, not a QuickAction file.
STANDARD_ACTIONS = frozenset({
    "Accept", "CancelEdit", "Call", "Clone", "Delete", "Edit", "Follow",
    "FollowerAdd", "List", "ListEmail", "LogACall", "New", "NewChild",
    "NewEvent", "NewNote", "NewTask", "Post", "Poll", "Question", "Read",
    "RelatedList", "SaveEdit", "SendEmail", "Share", "Submit", "Tab", "Today",
    "View", "Question", "Link", "File", "Thanks", "Announcement",
})

# The compact layout every object falls back to when nobody assigned one.
PLATFORM_COMPACT_LAYOUT = frozenset({"SYSTEM"})

# The fields Salesforce puts on every object itself. A retrieve brings back a
# field file only for fields somebody defined, so none of these is ever a
# component, on any object, in any snapshot. Naming them keeps thousands of
# references out of the anonymous "not here" pile.
SYSTEM_FIELDS = frozenset({
    "Id", "Name", "OwnerId", "IsDeleted", "CreatedDate", "CreatedById",
    "LastModifiedDate", "LastModifiedById", "SystemModstamp", "RecordTypeId",
    "LastActivityDate", "LastViewedDate", "LastReferencedDate",
    "CurrencyIsoCode", "ConnectionReceivedId", "ConnectionSentId",
    "MayEdit", "IsLocked", "UserRecordAccessId", "Division",
})


# ---------------------------------------------------------------------------
# Global variables
# ---------------------------------------------------------------------------

# $Global.Name reaches something that is not a field on the current object. The
# value says which component type the segment after the global names, and how
# many segments that name uses. None means the global reaches platform data that
# is never a component (the running user's session, the api endpoint, the clock).
GLOBAL_TARGETS = {
    "$Label": ("CustomLabel", 1),
    "$Resource": ("StaticResource", 1),
    "$Page": ("ApexPage", 1),
    "$Component": ("ApexComponent", 1),
    "$ObjectType": ("CustomObject", 1),
    "$SObjectType": ("CustomObject", 1),
    "$Permission": ("CustomPermission", 1),
    "$RecordType": ("RecordType", 1),
    "$Setup": ("CustomField", 2),        # $Setup.Custom_Setting__c.Field__c
    "$CustomMetadata": ("CustomField", 2),
    "$FieldSet": ("FieldSet", 2),
    "$Profile": (None, 0),
    "$User": (None, 0),
    "$UserRole": (None, 0),
    "$Organization": (None, 0),
    "$Site": (None, 0),
    "$Api": (None, 0),
    "$System": (None, 0),
    "$Action": (None, 0),
    "$Network": (None, 0),
    "$Flow": (None, 0),
    "$CurrentPage": (None, 0),
    "$RemoteAction": (None, 0),
    "$Source": (None, 0),
}

# The globals that name the record the flow, page or layout is running on. What
# follows is a field on that component's own object.
RECORD_GLOBALS = ("$Record__Prior.", "$Record_Prior.", "$Record.", "Record.")


# ---------------------------------------------------------------------------
# Relationships
# ---------------------------------------------------------------------------

# Relationships the Salesforce platform puts on every object, so no `referenceTo`
# in the snapshot records them. Kept deliberately short: everything else in the
# relationship map is built from evidence in the files.
#
# A wrong entry here would not produce a dangling edge, it would produce an edge
# to a real field of the wrong object, so every resolution these produce is
# recorded with the rule name `traversal` and counted on its own line in the
# report rather than mixed in with the direct matches.
STANDARD_RELATIONSHIPS = {
    "owner": "User",
    "createdby": "User",
    "lastmodifiedby": "User",
    "lastmodifiedbyid": "User",
    "createdbyid": "User",
    "ownerid": "User",
}

# Objects whose Parent points back at themselves.
SELF_PARENT_OBJECTS = frozenset({"Account", "Case", "Campaign", "Solution"})


# ---------------------------------------------------------------------------
# Records
# ---------------------------------------------------------------------------

@dataclass
class Resolution:
    """What one raw reference turned out to be."""

    resolution: str
    target_id: str = ""
    rule: str = ""            # the rule that decided, for the report
    detail: str = ""          # one plain sentence saying how, or why not
    namespace: str = ""       # set whenever the name carries a package namespace

    @property
    def is_resolved(self) -> bool:
        return self.resolution == RESOLVED

    def as_dict(self) -> dict:
        out = {"resolution": self.resolution}
        if self.target_id:
            out["target"] = self.target_id
        if self.rule:
            out["resolved_by"] = self.rule
        if self.detail:
            out["resolution_detail"] = self.detail
        if self.namespace:
            out["namespace"] = self.namespace
        return out


@dataclass
class ResolutionResult:
    """One org's resolutions, aligned one for one with its references."""

    org: str
    resolutions: list = field(default_factory=list)
    references: list = field(default_factory=list)
    relationship_count: int = 0
    notes: list = field(default_factory=list)

    def counts(self) -> dict:
        out = {value: 0 for value in RESOLUTIONS}
        for res in self.resolutions:
            out[res.resolution] = out.get(res.resolution, 0) + 1
        return out

    def by_rule(self) -> dict:
        counts: dict = {}
        for res in self.resolutions:
            key = (res.resolution, res.rule or "(none)")
            counts[key] = counts.get(key, 0) + 1
        return dict(sorted(counts.items(), key=lambda kv: -kv[1]))

    def by_source_type(self) -> dict:
        """source metadata type -> {resolution value -> count}."""
        counts: dict = {}
        for ref, res in zip(self.references, self.resolutions):
            parts = split_component_id(ref.source_id)
            source_type = parts[1] if parts else "(unknown)"
            bucket = counts.setdefault(source_type, {v: 0 for v in RESOLUTIONS})
            bucket[res.resolution] += 1
        return counts

    def by_target_type(self) -> dict:
        counts: dict = {}
        for ref, res in zip(self.references, self.resolutions):
            bucket = counts.setdefault(ref.target_type or "(no hint)",
                                       {v: 0 for v in RESOLUTIONS})
            bucket[res.resolution] += 1
        return counts

    def namespaces(self) -> dict:
        counts: dict = {}
        for res in self.resolutions:
            if res.resolution == UNRESOLVED_MANAGED_PACKAGE:
                counts[res.namespace] = counts.get(res.namespace, 0) + 1
        return dict(sorted(counts.items(), key=lambda kv: -kv[1]))

    def unresolved_examples(self, limit=25) -> list:
        """The most common unresolved strings, with their reason and detail."""
        seen: dict = {}
        for ref, res in zip(self.references, self.resolutions):
            if res.is_resolved:
                continue
            key = (ref.raw, ref.target_type, res.resolution)
            row = seen.get(key)
            if row is None:
                seen[key] = [1, ref, res]
            else:
                row[0] += 1
        rows = sorted(seen.values(), key=lambda row: -row[0])
        return rows[:limit]


# ---------------------------------------------------------------------------
# The resolver
# ---------------------------------------------------------------------------

class Resolver:
    """Resolves one org's raw references against that org's own components.

    Every id carries its org, and the resolver only ever looks in the components
    of the org it was built from, so an edge can never cross from Red to Blue.
    SPEC decision 2 requires exactly that.
    """

    def __init__(self, extraction):
        self.org = extraction.org
        self.extraction = extraction
        self.components = extraction.components
        self.notes: list = []
        self._build_indexes()
        self._build_relationship_map()

    # -- indexes -----------------------------------------------------------

    def _build_indexes(self) -> None:
        self._by_decoded: dict = {}
        self._by_lower: dict = {}
        self._by_name: dict = {}
        self._types_present: set = set()
        self._objects: dict = {}          # lowercase object name -> real name
        self._fields_by_object: dict = {}  # lowercase object -> {squashed: {names}}

        for comp in self.components.values():
            self._types_present.add(comp.type)
            key = (comp.type, comp.api_name)

            decoded = unquote(comp.api_name)
            if decoded != comp.api_name:
                self._by_decoded.setdefault((comp.type, decoded), comp.id)
            self._by_lower.setdefault((comp.type, comp.api_name.lower()), comp.id)
            self._by_name.setdefault(comp.api_name, []).append(comp.id)

            if comp.type == "CustomObject":
                self._objects.setdefault(comp.api_name.lower(), comp.api_name)
            elif comp.type == "CustomField" and "." in comp.api_name:
                obj, _, fname = comp.api_name.partition(".")
                bucket = self._fields_by_object.setdefault(obj.lower(), {})
                bucket.setdefault(_squash(fname), set()).add(comp.api_name)

        # The registry knows every object folder on disk, including objects whose
        # own definition file was not retrieved.
        for name in self.extraction.known_objects:
            self._objects.setdefault(name.lower(), name)

    def _build_relationship_map(self) -> None:
        """Which object a relationship step leads to, built from `referenceTo`.

        `Account.Industry` written on a Case resolves only when something records
        that Case's Account field points at Account. The 205 lookup and
        master-detail references phase 2 emits are that record. A field's
        traversal name is not its api name: `Owner_Account__c` is traversed as
        `Owner_Account__r`, and its `relationshipName` may be something else
        again (`Accounts5`), so all the spellings are registered.
        """
        self._rel: dict = {}
        self._child_rel: dict = {}
        count = 0
        for ref in self.extraction.references:
            if ref.relationship not in ("lookup", "master_detail"):
                continue
            source = self.components.get(ref.source_id)
            if source is None:
                continue

            if source.type == "CustomField" and "." in source.api_name:
                obj, _, fname = source.api_name.partition(".")
                relationship_name = source.attributes.get("relationship_name") or ""
            elif source.type == "CustomObject":
                # A single-file object keeps its fields inline; the extractor
                # records which one the referenceTo belongs to.
                obj = source.api_name
                fname = ref.attributes.get("field") or ""
                relationship_name = ""
            else:
                continue
            if not obj or not fname:
                continue

            target = ref.raw
            for spelling in _relationship_spellings(fname, relationship_name):
                self._rel.setdefault((obj.lower(), spelling.lower()), target)
            count += 1

            # The same lookup read from the other end. `Account_Service__c` holds
            # a lookup to `Account` whose `relationshipName` is `Account_Services`,
            # which is the name Account's own related list is called by:
            # `Account_Services__r`. A Lightning page names its related lists that
            # way and nothing else in this tool could turn that name back into an
            # object, so both the child object and the lookup field that makes the
            # list exist are recorded here. WI-007 phase 8.
            if target and relationship_name:
                for spelling in (relationship_name, relationship_name + "__r"):
                    self._child_rel.setdefault(
                        (target.lower(), spelling.lower()), (obj, source.api_name))
        self.relationship_count = count

        # A child relationship is a real traversal step, so the walker should be
        # able to take it: `Account_Services__r.Service_Line__c` read from an
        # Account is a field on `Account_Service__c`. `setdefault` keeps a real
        # forward lookup of the same name ahead of it.
        for (parent, step), (child_object, _field) in self._child_rel.items():
            self._rel.setdefault((parent, step), child_object)

    # -- the walk ----------------------------------------------------------

    def child_relationship(self, obj: str, step: str) -> tuple:
        """The child object a related-list name points at, and the lookup field.

        Returns `(child_object, lookup_field_api_name)`, or `("", "")`. A related
        list exists because some field on the child points back here, so that
        field is what breaks if it is removed, and it is the one the org's own
        `MetadataComponentDependency` reports for a related list.
        """
        if not obj or not step:
            return ("", "")
        return self._child_rel.get((obj.lower(), step.lower()), ("", ""))

    def relationship_target(self, obj: str, step: str) -> str:
        """The object one relationship step leads to, or ""."""
        if not obj or not step:
            return ""
        found = self._rel.get((obj.lower(), step.lower()))
        if found:
            return found
        if step.lower().endswith("__r"):
            found = self._rel.get((obj.lower(), step[:-3].lower() + "__c"))
            if found:
                return found
        standard = STANDARD_RELATIONSHIPS.get(step.lower())
        if standard:
            return standard
        if step.lower() == "parent" and obj in SELF_PARENT_OBJECTS:
            return obj
        # A step that is itself an object name: RecordType.Name, Account.Industry
        # written from somewhere with no parent of its own.
        if step.lower() in self._objects:
            return self._objects[step.lower()]
        return ""

    # -- one reference -----------------------------------------------------

    def resolve(self, ref) -> Resolution:
        raw = ref.raw
        target_type = ref.target_type

        # 1. Built at run time. No name exists, so there is nothing to look up.
        if raw == DYNAMIC_MARKER or ref.attributes.get("dynamic"):
            return Resolution(
                UNRESOLVED_DYNAMIC, rule="dynamic",
                detail="the name is built while the code runs, so the file never "
                       "holds one to resolve",
            )

        # 2. An endpoint, not a component.
        if _URL.match(raw):
            return Resolution(
                UNRESOLVED_NOT_IN_SNAPSHOT, rule="url",
                detail="a web address outside the org, not a component in it",
            )

        # 3. A person. Users are records, not metadata, so no snapshot holds one.
        if _EMAIL.match(raw):
            return Resolution(
                UNRESOLVED_NOT_IN_SNAPSHOT, rule="user",
                detail="a user, which is a record rather than metadata and is "
                       "never in a metadata snapshot",
            )

        # 4. A global variable reaches past the current object.
        if raw.startswith("$") or raw.startswith("Record."):
            found = self._resolve_global(ref, raw)
            if found is not None:
                return found

        # 4b. A related list on a Lightning page, named by its child relationship.
        #     `Business_Reviews__r` is not a component name and never matches one,
        #     so it has to be turned back into the lookup field that makes the list
        #     exist before anything else is tried. WI-007 phase 8.
        if ref.attributes.get("related_list"):
            obj = ref.target_parent or self._object_of_source(ref)
            child_object, lookup_field = self.child_relationship(obj, raw)
            if lookup_field:
                found = self._direct("CustomField", lookup_field)
                if found:
                    return Resolution(
                        RESOLVED, found, rule="related_list",
                        detail=f"the related list {raw} on {obj} exists because "
                               f"{lookup_field} on {child_object} points back at "
                               "it, so that field is what the list depends on",
                    )
            return Resolution(
                UNRESOLVED_NOT_IN_SNAPSHOT, rule="related_list",
                detail=f"a related list called {raw} on {obj}; no lookup field in "
                       "this snapshot names that relationship, so the child object "
                       "is one the retrieve did not bring back. Standard lists "
                       "such as Histories, ActivityHistories and EmailMessages are "
                       "always this case",
            )

        # 5. The string already names a component.
        found = self._direct(target_type, raw)
        if found:
            return Resolution(RESOLVED, found, rule="direct",
                              detail="the string names this component outright")

        # 6. A bare name relative to the object the extractor said it sits on.
        if ref.target_parent:
            found = self._direct(target_type, f"{ref.target_parent}.{raw}")
            if found:
                return Resolution(
                    RESOLVED, found, rule="parent_qualified",
                    detail=f"a bare name read against {ref.target_parent}, which "
                           "the extractor recorded as its parent",
                )

        # 7. Percent-encoding. A file name on disk encodes characters an XML
        #    element writes plainly, so `NEW%3A Messages %26 Alerts` and
        #    `NEW: Messages & Alerts` are the same component.
        found = self._decoded(target_type, raw)
        if found:
            return Resolution(RESOLVED, found, rule="percent_decoded",
                              detail="the same name once the percent-encoding in "
                                     "the file name is undone")

        # 8. The legacy report token Object$Field.
        token = _REPORT_TOKEN.match(raw)
        if token:
            found = self._direct(target_type or "CustomField",
                                 f"{token.group(1)}.{token.group(2)}")
            if found:
                return Resolution(RESOLVED, found, rule="report_token",
                                  detail="a legacy report token, read as "
                                         "Object.Field")

        # 9. The legacy all-capitals token Salesforce writes in layouts, list
        #    views and dashboards instead of an api name. It always names a field,
        #    so it is only tried where a field is what the reference could want:
        #    the extractor said CustomField, said nothing, or the token is dotted,
        #    which no other kind of name is.
        if _LEGACY_TOKEN.match(raw) and (target_type in ("CustomField", "")
                                         or "." in raw):
            found, how = self._resolve_legacy_token(ref, raw)
            if found:
                if target_type and target_type != "CustomField":
                    how += (f"; the extractor expected a {target_type}, and a "
                            "dotted all-capitals token is always a field token")
                return Resolution(RESOLVED, found, rule="legacy_token", detail=how)

        # 10. A relationship traversal: Account.Industry, Owner.Manager.Email.
        if "." in raw and (target_type in ("CustomField", "") or not target_type):
            found, how = self._resolve_traversal(ref, raw)
            if found:
                return Resolution(RESOLVED, found, rule="traversal", detail=how)

        # 11. No type hint at all: accept only an unambiguous single match.
        if not target_type:
            ids = self._by_name.get(raw) or []
            if len(ids) == 1:
                return Resolution(
                    RESOLVED, ids[0], rule="name_only",
                    detail="the extractor did not say what type this names, and "
                           "exactly one component in the org carries the name",
                )

        # 12. Case. Salesforce is inconsistent about it across file types.
        found = self._by_lower.get((target_type, raw.lower())) if target_type else None
        if found:
            return Resolution(RESOLVED, found, rule="case_insensitive",
                              detail="the same name written in a different case")

        # 13. A managed package. SPEC edge case: emit it, mark it as belonging to
        #     a package, and name the namespace.
        namespace = _namespace_anywhere(raw)
        if namespace:
            return Resolution(
                UNRESOLVED_MANAGED_PACKAGE, rule="namespace", namespace=namespace,
                detail=f"belongs to the managed package namespace {namespace}, "
                       "whose contents are not in this snapshot",
            )

        # 14. Nothing left to try. Say which of the two remaining reasons it is,
        #     and why, as precisely as the string allows.
        return self._explain(ref, raw)

    # -- steps 4, 9, 10 ----------------------------------------------------

    def _resolve_global(self, ref, raw):
        """$Label.X, $Resource.X, $Record.Field__c, $User.Something."""
        for prefix in RECORD_GLOBALS:
            if raw.startswith(prefix):
                rest = raw[len(prefix):]
                obj = ref.target_parent or self._object_of_source(ref)
                if not obj:
                    return Resolution(
                        UNRESOLVED_UNKNOWN, rule="record_global",
                        detail="points at the record this runs on, and nothing in "
                               "the file says which object that is",
                    )
                if "." in rest:
                    found, how = self._walk(obj, rest)
                    if found:
                        return Resolution(RESOLVED, found, rule="traversal",
                                          detail=how)
                    return Resolution(UNRESOLVED_NOT_IN_SNAPSHOT, rule="traversal",
                                      detail=how)
                found = self._direct("CustomField", f"{obj}.{rest}")
                if found:
                    return Resolution(
                        RESOLVED, found, rule="record_global",
                        detail=f"a field on {obj}, the object this component runs on",
                    )
                return Resolution(
                    UNRESOLVED_NOT_IN_SNAPSHOT, rule="record_global",
                    detail=f"a field named {rest} on {obj}, which this snapshot "
                           "does not contain",
                )

        head = raw.split(".", 1)[0]
        if head not in GLOBAL_TARGETS:
            return None
        target_type, segments = GLOBAL_TARGETS[head]
        if target_type is None:
            return Resolution(
                UNRESOLVED_NOT_IN_SNAPSHOT, rule="platform_global",
                detail=f"{head} reaches platform data (the running user, the org, "
                       "the session, the clock), which is never a component",
            )
        parts = raw.split(".")[1:]
        if len(parts) < segments:
            return Resolution(
                UNRESOLVED_UNKNOWN, rule="platform_global",
                detail=f"{head} with nothing after it to name",
            )
        name = ".".join(parts[:segments])
        found = self._direct(target_type, name)
        if found:
            return Resolution(RESOLVED, found, rule="global",
                              detail=f"{head} names this {target_type}")
        # $Label.site.email_us is the label email_us in the site namespace, and
        # $Permission.CustomPermission.Survey_Manager spells the type out in the
        # middle. Either way the last segment is the name.
        if segments == 1 and len(parts) > 1:
            found = self._direct(target_type, parts[-1])
            if found:
                return Resolution(
                    RESOLVED, found, rule="global",
                    detail=f"{head} names this {target_type}; it is the last "
                           "segment, and what sits between is a namespace or the "
                           "type spelled out",
                )
            return Resolution(
                UNRESOLVED_MANAGED_PACKAGE, rule="global", namespace=parts[0],
                detail=f"{head} names a {target_type} in the {parts[0]} namespace, "
                       "whose contents are not in this snapshot",
            )
        namespace = _namespace_anywhere(name)
        if namespace:
            return Resolution(
                UNRESOLVED_MANAGED_PACKAGE, rule="global", namespace=namespace,
                detail=f"{head} names a {target_type} in the {namespace} namespace",
            )
        return Resolution(
            UNRESOLVED_NOT_IN_SNAPSHOT, rule="global",
            detail=f"{head} names a {target_type} called {name}, which this "
                   "snapshot does not contain",
        )

    def _resolve_legacy_token(self, ref, raw):
        """ACCOUNT.TYPE, CORE.USERS.LAST_NAME, OPPORTUNITY.CLOSE_DATE.

        These are not api names. There is no published table mapping them back,
        so the rule is: work out the object the token belongs to, squash the field
        part down to letters and digits, and accept the answer ONLY when exactly
        one real field on that object squashes to the same thing. A guess that
        matches nothing stays unresolved rather than becoming a made-up edge.
        """
        parts = raw.split(".")
        field_token = parts[-1]
        if len(parts) == 1:
            # A bare token such as STATUS belongs to whatever the file is about.
            obj = ref.target_parent or self._object_of_source(ref)
        else:
            # A token with a prefix names its own object, and the prefix is the
            # only thing allowed to say which. Falling back to the file's own
            # object here read CORE.USER_ROLE.NAME as User.Name, which is the
            # role's name and not the user's.
            obj = self._legacy_object(parts[:-1])
        if not obj:
            return "", ""

        bucket = self._fields_by_object.get(obj.lower())
        if not bucket:
            return "", ""
        names = bucket.get(_squash(field_token))
        if not names or len(names) != 1:
            return "", ""
        api_name = next(iter(names))
        return (component_id(self.org, "CustomField", api_name),
                f"a legacy {raw} token, matched to the one field on {obj} whose "
                "api name has the same letters")

    def _legacy_object(self, prefix_parts):
        """Which object ACCOUNT, CORE.USERS or UPDATEDBY_USER means."""
        joined = "".join(prefix_parts).lower()
        # CORE.USERS, CREATEDBY_USER, UPDATEDBY_USER and LASTMODIFIEDBY_USER all
        # mean the User object.
        if joined.endswith("users") or joined.endswith("user"):
            return self._objects.get("user", "User")
        for candidate in ("".join(prefix_parts), prefix_parts[-1]):
            found = self._objects.get(candidate.lower())
            if found:
                return found
            # CASES -> Case, OPPORTUNITY -> Opportunity: the legacy token
            # pluralises some objects and not others.
            if candidate.lower().endswith("s"):
                found = self._objects.get(candidate.lower()[:-1])
                if found:
                    return found
        return ""

    def _resolve_traversal(self, ref, raw):
        """Account.Industry, Owner.Manager.Email, Account.RecordType.Name."""
        obj = ref.target_parent or self._object_of_source(ref)
        if not obj:
            head = raw.split(".", 1)[0]
            start = self._objects.get(head.lower())
            if not start:
                return "", ""
            return self._walk(start, raw.split(".", 1)[1])
        return self._walk(obj, raw)

    def _walk(self, obj, path):
        """Follow a dotted path from an object to the field at the end of it."""
        parts = path.split(".")
        walked = [obj]
        for step in parts[:-1]:
            nxt = self.relationship_target(obj, step)
            if not nxt:
                return "", (f"the path {'.'.join(walked)}.{step} stops here: "
                            f"nothing in the snapshot says what {step} on {obj} "
                            "points at")
            obj = nxt
            walked.append(step)
        found = self._direct("CustomField", f"{obj}.{parts[-1]}")
        if found:
            return found, (f"followed {' to '.join(walked)} and read {parts[-1]} "
                           f"on {obj}")
        return "", (f"followed the path to {obj}, which this snapshot holds no "
                    f"field called {parts[-1]} on")

    # -- helpers -----------------------------------------------------------

    def _direct(self, metadata_type, api_name):
        if not metadata_type or not api_name:
            return ""
        cid = component_id(self.org, metadata_type, api_name)
        return cid if cid in self.components else ""

    def _decoded(self, metadata_type, api_name):
        if not metadata_type or not api_name:
            return ""
        return self._by_decoded.get((metadata_type, unquote(api_name)), "")

    def _object_of_source(self, ref) -> str:
        """The object the component holding this reference is about.

        A flow records its `start_object`, a Lightning page its `sobject_type`, a
        layout its `layout_object`, a quick action its `source_object`. A field,
        record type or validation rule carries the object in the first half of its
        own api name.
        """
        source = self.components.get(ref.source_id)
        if source is None:
            return ""
        for key in ("start_object", "sobject_type", "layout_object",
                    "source_object", "target_object", "entity"):
            value = source.attributes.get(key)
            if value:
                return value
        if source.type == "CustomObject":
            return source.api_name
        # A qualified component name usually starts with its object
        # (Case.Priority, Case.New_Hospice_Termination), but not always: a
        # dashboard is Folder.Name and a report Folder/Name. Only accept the head
        # when the org really has an object of that name, or a dashboard folder
        # would be read as an object and every field guess under it would be
        # nonsense.
        if "." in source.api_name:
            head = source.api_name.partition(".")[0]
            if head.lower() in self._objects:
                return self._objects[head.lower()]
        return ""

    # -- step 14 -----------------------------------------------------------

    def _explain(self, ref, raw) -> Resolution:
        """Which of the two remaining reasons this is, said as precisely as the
        string allows. The resolution value stays one of the SPEC's five; the
        detail is what makes the report readable."""
        target_type = ref.target_type

        if raw.startswith(_STANDARD_PREFIXES):
            return Resolution(
                UNRESOLVED_NOT_IN_SNAPSHOT, rule="standard_prefixed",
                detail="a Salesforce-supplied tab or application, which belongs to "
                       "the platform and is never in a snapshot",
            )

        if _PLATFORM_COMPONENT.match(raw):
            return Resolution(
                UNRESOLVED_NOT_IN_SNAPSHOT, rule="platform_component",
                detail="a Lightning component the platform supplies, which is "
                       "never a file in a snapshot",
            )

        if target_type == "QuickAction" and raw in STANDARD_ACTIONS:
            return Resolution(
                UNRESOLVED_NOT_IN_SNAPSHOT, rule="standard_action",
                detail="one of the actions every object has whether or not anyone "
                       "defined it, so no quick action file exists for it",
            )

        if target_type == "CompactLayout" and raw in PLATFORM_COMPACT_LAYOUT:
            return Resolution(
                UNRESOLVED_NOT_IN_SNAPSHOT, rule="platform_compact_layout",
                detail="the compact layout the platform falls back to when nobody "
                       "assigned one, which is not a file",
            )

        if target_type and target_type not in self._types_present:
            return Resolution(
                UNRESOLVED_NOT_IN_SNAPSHOT, rule="type_absent",
                detail=f"this snapshot holds no {target_type} file at all, so "
                       "nothing of that type can be resolved in it",
            )

        if _LEGACY_TOKEN.match(raw) and (target_type == "CustomField"
                                         or "." in raw):
            parts = raw.split(".")
            obj = (self._legacy_object(parts[:-1]) if len(parts) > 1 else "") \
                or ref.target_parent or self._object_of_source(ref)
            where = (f"no field on {obj} in this snapshot has an api name with the "
                     "same letters") if obj else \
                    ("nothing in the file says which object it belongs to, so "
                     "there is no field list to match it against")
            return Resolution(
                UNRESOLVED_NOT_IN_SNAPSHOT, rule="legacy_token",
                detail=f"a legacy all-capitals token: {where}",
            )

        if target_type == "CustomField":
            explained = self._explain_field(ref, raw)
            if explained is not None:
                return explained

        if (_API_PATH.match(raw) or _LAYOUT_NAME.match(raw)
                or _FOLDERED_NAME.match(raw)):
            what = target_type or "component"
            return Resolution(
                UNRESOLVED_NOT_IN_SNAPSHOT, rule="absent",
                detail=f"a well-formed name for a {what}, which this snapshot does "
                       "not contain",
            )

        return Resolution(
            UNRESOLVED_UNKNOWN, rule="unrecognised",
            detail="not the shape of any component name, so there is nothing to "
                   "say it should have been",
        )

    def _explain_field(self, ref, raw):
        """Why a field reference found nothing, said as exactly as possible.

        A field can be missing for three different reasons, and telling them apart
        is what makes the report useful to phase 7: the platform owns the field so
        no file ever exists for it, the object is here but that field was not
        retrieved, or the object itself is not here either.
        """
        if "." in raw:
            obj, _, field_name = raw.rpartition(".")
        else:
            obj, field_name = ref.target_parent or self._object_of_source(ref), raw

        # `TODAY()` is not a field that happens to be missing, it is not a field
        # name at all. Hand it back so the shape checks can say so, rather than
        # reporting it as a field the snapshot does not contain.
        if not _SINGLE_API_NAME.match(field_name):
            return None

        if field_name in SYSTEM_FIELDS:
            return Resolution(
                UNRESOLVED_NOT_IN_SNAPSHOT, rule="system_field",
                detail=f"{field_name} is a field the platform puts on every object; "
                       "a retrieve only brings back fields somebody defined, so no "
                       "file for it exists in any snapshot",
            )

        if not obj:
            return Resolution(
                UNRESOLVED_UNKNOWN, rule="field_without_object",
                detail="a bare field name, and nothing in the file says which "
                       "object it belongs to",
            )

        if obj.lower() in self._objects:
            return Resolution(
                UNRESOLVED_NOT_IN_SNAPSHOT, rule="field_not_retrieved",
                detail=f"{obj} is in this snapshot but no file defines a field "
                       f"called {field_name} on it, which is what a retrieve does "
                       "with a standard field nobody customised",
            )

        return Resolution(
            UNRESOLVED_NOT_IN_SNAPSHOT, rule="object_not_in_snapshot",
            detail=f"neither the object {obj} nor a field called {field_name} on it "
                   "is in this snapshot",
        )

    # -- everything --------------------------------------------------------

    def resolve_all(self) -> ResolutionResult:
        out = ResolutionResult(
            org=self.org,
            references=self.extraction.references,
            relationship_count=self.relationship_count,
        )
        out.resolutions = [self.resolve(ref) for ref in self.extraction.references]
        out.notes = list(self.notes)
        return out


# ---------------------------------------------------------------------------
# Module-level helpers
# ---------------------------------------------------------------------------

def _squash(name: str) -> str:
    """A field name reduced to its letters and digits, upper case.

    LAST_NAME, LastName and lastname all squash to LASTNAME, which is what lets a
    legacy token be matched against a real api name.

    The `__c` suffix is deliberately NOT stripped. Stripping it made `NAME` match a
    custom field called `Name__c` and `CREATED_DATE` match `CreatedDate__c`, and
    both were wrong: a legacy token is how Salesforce writes a STANDARD field, and
    a custom field is written with its real api name in the same file. Keeping the
    suffix also keeps `Name` and `Name__c` apart, which is what let `ACCOUNT.NAME`
    stop being ambiguous on an object that has both.
    """
    return re.sub(r"[^A-Za-z0-9]", "", name.strip()).upper()


def _relationship_spellings(field_name: str, relationship_name: str) -> list:
    """Every way a traversal can spell one lookup field.

    A custom lookup `Owner_Account__c` is traversed as `Owner_Account__r`, and its
    `relationshipName` can be something else again (`Accounts5`). A standard
    lookup `AccountId` is traversed as `Account`.
    """
    out = [field_name]
    if field_name.endswith("__c"):
        out.append(field_name[:-3] + "__r")
    elif field_name.endswith("Id") and len(field_name) > 2:
        out.append(field_name[:-2])
    if relationship_name:
        out.append(relationship_name)
    return out


def _namespace_anywhere(raw: str) -> str:
    """The managed package namespace on any segment of a name, or "".

    `Account.npsp__Foo__c` belongs to npsp just as much as `npsp__Bar__c.Baz__c`
    does, so both halves of a qualified name are checked.
    """
    for segment in re.split(r"[./$]", raw):
        namespace = namespace_of(segment)
        if namespace:
            return namespace
    return ""


def resolve_org(extraction) -> ResolutionResult:
    """Resolve every raw reference in one org's extraction result."""
    return Resolver(extraction).resolve_all()

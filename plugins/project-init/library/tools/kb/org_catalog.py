"""Turn the record ids in a dependency row into names the local files use.

Read-only. Every call is `sf data query --use-tooling-api`.

## The problem this solves

`MetadataComponentDependency` names a component the way the org stores it, not
the way a metadata file does. Measured against Blue on 2026-08-05:

    the API says                         a local component id says
    CustomField "Record_Type_Opp"        blue:CustomField:Opportunity.Record_Type_Opp__c
    CustomObject "Implementation"        blue:CustomObject:Implementation__c
    Layout "Provider Implementation Tab" blue:Layout:Opportunity-Provider Implementation Tab
    ValidationRule "Account_Name_Read_Only"
                                         blue:ValidationRule:Account.Account_Name_Read_Only

Three differences, and each one has to be undone before anything can be
compared:

1. **The `__c` suffix is gone.** The API reports a custom component's developer
   name, which is the api name minus its suffix.
2. **The owning object is gone.** A field, layout, validation rule, quick
   action, record type, list view or web link is named on its own, with nothing
   saying which object it sits on.
3. **The same name is used many times over.** Blue has eight different fields
   called `Data_Quality_Description`, on eight objects, and the API row for each
   says only `Data_Quality_Description`. Matching on the name alone would pick
   one of the eight at random and call it an agreement.

The record id in the same row is what resolves all three, so this module builds
an id-to-name catalog from the org's own definition objects and the comparison
matches on the id rather than the name.

## Where each lookup comes from

    EntityDefinition        object id (01I...) -> Implementation__c
    FieldDefinition         field id  (00N...) -> Account, Email__c
    Layout                  layout id (00h...) -> Opportunity, Provider Impl...
    ValidationRule          rule id   (03d...) -> Account, Account_Name_Read_Only
    QuickActionDefinition   action id (09D...) -> Account, Add_Location
    WorkflowAlert           alert id  (01W...) -> Case, Case_Status_Change...
    WebLink                 link id   (00b...) -> Account, GoogleMaps
    ListView                view id   (00B...) -> Account, AR_List_Gerorge
    FieldSet                set id    (0IX...) -> Case, Case_Field_Set

`WebLink` is the clearest case for matching on the id rather than the name. A
dependency row calls one `Google Maps`, which is its label; the metadata file
calls the same link `GoogleMaps`, which is its api name. The two never match as
strings, and the id matches both.

`ListView` is the one lookup that is not a Tooling object. It is read through
the ordinary query endpoint instead, which is equally a read.

`FieldDefinition` refuses to answer without a filter naming an object, and
refuses `LIKE`, so a field id cannot be looked up on its own. Fields are pulled
one object at a time instead, for every object the local snapshot holds plus
every object the API rows mention. A field on an object outside both sets stays
unmapped, and is reported as unmapped rather than counted as a disagreement.

## Ids are matched at 15 characters

The dependency object returns 18-character ids; `EntityDefinition.DurableId`
and the field half of `FieldDefinition.DurableId` are 15. The last three
characters are a checksum of the first fifteen and carry no information, so
every id here is cut to 15 before it is stored or looked up.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from org_api import ORG_ANSWERS, QueryStats, run_many, run_query  # noqa: E402

ANSWERS_DIR = ORG_ANSWERS

# One query per object, so a big batch is a long wait. 4 at a time is what
# run_many uses; these are grouped only to keep the progress lines readable.
OBJECT_BATCH = 40


def short_id(value: str) -> str:
    """Every id cut to 15 characters, which is what makes two ids comparable."""
    if not value:
        return ""
    return value[:15]


class Catalog:
    """One org's id-to-name lookups, built from its own definition objects."""

    def __init__(self, org: str, alias: str, verbose: bool = True):
        self.org = org
        self.alias = alias
        self.verbose = verbose
        self.stats = QueryStats()
        self.objects: dict[str, str] = {}          # 01I id or name -> api name
        self.fields: dict[str, tuple[str, str]] = {}   # 00N id -> (object, field)
        self.layouts: dict[str, tuple[str, str]] = {}  # 00h id -> (object, name)
        self.validation: dict[str, tuple[str, str]] = {}
        self.quick_actions: dict[str, tuple[str, str]] = {}
        self.workflow_alerts: dict[str, tuple[str, str]] = {}
        self.web_links: dict[str, tuple[str, str]] = {}
        self.list_views: dict[str, tuple[str, str]] = {}
        self.field_sets: dict[str, tuple[str, str]] = {}
        self.flows: dict[str, str] = {}       # flow version id -> api name
        self.flexipages: dict[str, str] = {}  # page id -> api name
        self.notes: list[str] = []

    def say(self, message: str) -> None:
        if self.verbose:
            print(message, flush=True)

    # -- objects -----------------------------------------------------------

    def load_objects(self, names: list[str], ids: list[str]) -> None:
        """Objects by api name and by record id, in batches of 200 per query."""
        wanted_names = sorted({n for n in names if n})
        wanted_ids = sorted({short_id(i) for i in ids if i})

        queries = []
        for start in range(0, len(wanted_names), 200):
            chunk = wanted_names[start:start + 200]
            quoted = ", ".join(f"'{n}'" for n in chunk)
            queries.append((f"names{start}",
                            "SELECT DurableId, QualifiedApiName FROM EntityDefinition "
                            f"WHERE QualifiedApiName IN ({quoted})"))
        for start in range(0, len(wanted_ids), 200):
            chunk = wanted_ids[start:start + 200]
            quoted = ", ".join(f"'{i}'" for i in chunk)
            queries.append((f"ids{start}",
                            "SELECT DurableId, QualifiedApiName FROM EntityDefinition "
                            f"WHERE DurableId IN ({quoted})"))

        for _label, rows, error in run_many(queries, self.alias, self.stats):
            if error:
                self.notes.append(f"an object lookup was refused: {error}"[:200])
                continue
            for row in rows:
                durable = row.get("DurableId") or ""
                api_name = row.get("QualifiedApiName") or ""
                if durable and api_name:
                    self.objects[durable] = api_name
        self.say(f"    {len(self.objects)} objects")

    # -- fields ------------------------------------------------------------

    def load_fields(self, object_durable_ids: list[str]) -> None:
        """Every field on each object given. One query per object; no way round it.

        FieldDefinition will not answer without a filter naming one object, and
        will not take LIKE or a bare field id, so there is no query that returns
        the whole org's fields and no way to look one field up on its own.
        """
        targets = sorted({d for d in object_durable_ids if d})
        self.say(f"    asking for the fields of {len(targets)} objects, "
                 f"{OBJECT_BATCH} at a time")
        done = 0
        for start in range(0, len(targets), OBJECT_BATCH):
            chunk = targets[start:start + OBJECT_BATCH]
            queries = [
                (durable,
                 "SELECT DurableId, QualifiedApiName, EntityDefinitionId "
                 f"FROM FieldDefinition WHERE EntityDefinitionId = '{durable}'")
                for durable in chunk
            ]
            for durable, rows, error in run_many(queries, self.alias, self.stats):
                if error:
                    continue
                object_name = self.objects.get(durable, durable)
                for row in rows:
                    parts = (row.get("DurableId") or "").split(".")
                    if len(parts) < 2:
                        continue
                    field_id = parts[-1]
                    # A standard field's DurableId ends in its own api name
                    # rather than a record id, and a standard field has no
                    # record id in a dependency row either, so it is stored
                    # under its name and matched that way.
                    self.fields[short_id(field_id)] = (
                        object_name, row.get("QualifiedApiName") or "")
            done += len(chunk)
            self.say(f"      {done}/{len(targets)} objects, {len(self.fields)} fields")

    # -- the small object-qualified types ----------------------------------

    def load_layouts(self) -> None:
        rows = self._all("SELECT Id, Name, TableEnumOrId FROM Layout", "layouts")
        for row in rows:
            table = row.get("TableEnumOrId") or ""
            object_name = self.objects.get(short_id(table), table)
            self.layouts[short_id(row.get("Id") or "")] = (
                object_name, row.get("Name") or "")
        self.say(f"    {len(self.layouts)} layouts")

    def load_validation_rules(self) -> None:
        rows = self._all(
            "SELECT Id, ValidationName, EntityDefinitionId FROM ValidationRule",
            "validation rules")
        for row in rows:
            entity = row.get("EntityDefinitionId") or ""
            self.validation[short_id(row.get("Id") or "")] = (
                self.objects.get(short_id(entity), entity),
                row.get("ValidationName") or "")
        self.say(f"    {len(self.validation)} validation rules")

    def load_quick_actions(self) -> None:
        rows = self._all(
            "SELECT Id, DeveloperName, SobjectType FROM QuickActionDefinition",
            "quick actions")
        for row in rows:
            self.quick_actions[short_id(row.get("Id") or "")] = (
                row.get("SobjectType") or "", row.get("DeveloperName") or "")
        self.say(f"    {len(self.quick_actions)} quick actions")

    def load_workflow_alerts(self) -> None:
        rows = self._all(
            "SELECT Id, DeveloperName, EntityDefinitionId FROM WorkflowAlert",
            "workflow alerts")
        for row in rows:
            entity = row.get("EntityDefinitionId") or ""
            self.workflow_alerts[short_id(row.get("Id") or "")] = (
                self.objects.get(short_id(entity), entity),
                row.get("DeveloperName") or "")
        self.say(f"    {len(self.workflow_alerts)} workflow alerts")

    def load_web_links(self) -> None:
        """Web links, matched by id because their name and label differ.

        A dependency row names one `Google Maps`; the metadata file calls the
        same link `GoogleMaps`. Only `Name` matches the file, and only the id
        connects the row to it.
        """
        rows = self._all(
            "SELECT Id, Name, EntityDefinitionId FROM WebLink", "web links")
        for row in rows:
            entity = row.get("EntityDefinitionId") or ""
            self.web_links[short_id(row.get("Id") or "")] = (
                self.objects.get(short_id(entity), entity),
                row.get("Name") or "")
        self.say(f"    {len(self.web_links)} web links")

    def load_field_sets(self) -> None:
        rows = self._all(
            "SELECT Id, DeveloperName, EntityDefinitionId FROM FieldSet", "field sets")
        for row in rows:
            entity = row.get("EntityDefinitionId") or ""
            self.field_sets[short_id(row.get("Id") or "")] = (
                self.objects.get(short_id(entity), entity),
                row.get("DeveloperName") or "")
        self.say(f"    {len(self.field_sets)} field sets")

    def load_list_views(self) -> None:
        """The one lookup read through the ordinary query endpoint, not Tooling."""
        rows = self._all("SELECT Id, DeveloperName, SobjectType FROM ListView",
                         "list views", tooling=False)
        for row in rows:
            self.list_views[short_id(row.get("Id") or "")] = (
                row.get("SobjectType") or "", row.get("DeveloperName") or "")
        self.say(f"    {len(self.list_views)} list views")

    def load_flows(self) -> None:
        """Flow versions, mapped to the api name the metadata file uses.

        This is the single biggest naming gap. A dependency row names a flow by
        its label and version, `Implementation - Create/Edit` or
        `Case_Status_Updates-3`, and the metadata file calls the same flow
        `Implementation_Create_Edit`. Matching on the name loses 2,553 of Blue's
        6,822 rows, which is more than a third of everything the org said.

        The route is two hops. A row's id is a flow VERSION (`301...`); its
        `DefinitionId` is the flow itself (`300...`); and `FlowDefinition` holds
        the developer name, which is what the file is called.
        """
        definitions: dict[str, str] = {}
        for row in self._all("SELECT Id, DeveloperName FROM FlowDefinition",
                             "flow definitions"):
            definitions[short_id(row.get("Id") or "")] = row.get("DeveloperName") or ""
        versions = self._all("SELECT Id, DefinitionId FROM Flow", "flow versions")
        for row in versions:
            api_name = definitions.get(short_id(row.get("DefinitionId") or ""))
            if api_name:
                self.flows[short_id(row.get("Id") or "")] = api_name
        # A flow definition can also be named directly, so both ids resolve.
        for definition_id, api_name in definitions.items():
            self.flows.setdefault(definition_id, api_name)
        self.say(f"    {len(definitions)} flows, {len(versions)} versions")

    def load_flexipages(self) -> None:
        rows = self._all("SELECT Id, DeveloperName FROM FlexiPage", "Lightning pages")
        for row in rows:
            self.flexipages[short_id(row.get("Id") or "")] = (
                row.get("DeveloperName") or "")
        self.say(f"    {len(self.flexipages)} Lightning pages")

    def _all(self, soql: str, label: str, tooling: bool = True) -> list[dict]:
        try:
            rows = run_query(soql, self.alias, self.stats, tooling=tooling)
        except Exception as problem:  # noqa: BLE001
            self.notes.append(f"could not read {label}: {problem}"[:200])
            return []
        if len(rows) >= 2000:
            self.notes.append(
                f"the {label} query returned 2000 rows, which is the batch size, so "
                "some may be missing and any id it did not return is reported "
                "unmapped rather than guessed at")
        return rows

    # -- output ------------------------------------------------------------

    def as_dict(self) -> dict:
        return {
            "schema_version": "1.0",
            "org": self.org,
            "source": "EntityDefinition, FieldDefinition, Layout, ValidationRule and "
                      "QuickActionDefinition, Tooling API, read-only",
            "notes": [
                "Every id is stored cut to 15 characters. The dependency object returns "
                "18-character ids and these definition objects return 15; the last three "
                "characters are a checksum and carry no information.",
                "Fields are pulled one object at a time because FieldDefinition refuses "
                "to answer without a filter naming an object and refuses LIKE. A field "
                "on an object outside the set asked for stays unmapped, and the "
                "comparison reports it as unmapped rather than counting it as a "
                "disagreement.",
            ] + self.notes,
            "counts": {
                "objects": len(self.objects),
                "fields": len(self.fields),
                "layouts": len(self.layouts),
                "validation_rules": len(self.validation),
                "quick_actions": len(self.quick_actions),
                "workflow_alerts": len(self.workflow_alerts),
                "web_links": len(self.web_links),
                "list_views": len(self.list_views),
                "field_sets": len(self.field_sets),
                "flows": len(self.flows),
                "flexipages": len(self.flexipages),
                "queries": self.stats.queries,
            },
            "flows": self.flows,
            "flexipages": self.flexipages,
            "objects": self.objects,
            "fields": {k: list(v) for k, v in self.fields.items()},
            "layouts": {k: list(v) for k, v in self.layouts.items()},
            "validation_rules": {k: list(v) for k, v in self.validation.items()},
            "quick_actions": {k: list(v) for k, v in self.quick_actions.items()},
            "workflow_alerts": {k: list(v) for k, v in self.workflow_alerts.items()},
            "web_links": {k: list(v) for k, v in self.web_links.items()},
            "list_views": {k: list(v) for k, v in self.list_views.items()},
            "field_sets": {k: list(v) for k, v in self.field_sets.items()},
        }

    def save(self, path: Path | None = None) -> Path:
        path = path or (ANSWERS_DIR / f"org-catalog-{self.org}.json")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(self.as_dict(), indent=1, sort_keys=True),
                        encoding="utf-8")
        return path


def load(org: str, path: Path | None = None) -> dict:
    path = path or (ANSWERS_DIR / f"org-catalog-{org}.json")
    if not path.exists():
        raise SystemExit(
            f"no catalog for {org}: {path}\nbuild it first:\n"
            f"  python tools/kb/build_org_catalog.py --org {org}")
    return json.loads(path.read_text(encoding="utf-8"))

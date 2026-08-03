"""Shared dataclasses and id helpers for the metadata catalog ETL.

Every parser/loader emits Component and Edge objects against this contract.
The orchestrator (build_graph.py) is the only module that writes to SQLite.
"""

from dataclasses import dataclass, field
from typing import Optional, List


@dataclass
class Component:
    """A Salesforce metadata object the catalog tracks.

    id format: "Type:Qualified.Name"
      - Field:Contact.Events__c
      - Object:Contact
      - Flow:FA_Pull_First_Name_into_Nickname_by_Default
      - ApexClass:BatchUpdateFAEventsCount
      - PermissionSet:Compliance_Access
      - RecordType:Contact.Contact_RIA_New_Client
      - ValidationRule:Contact.Cant_change_contact_name
      - Workflow:Contact
      - CustomLabel:Calendly_URL
      - RemoteSite:DiscoveryDataLink
      - Report:MS_Outreach_Intelligence.MS_High_Value_No_Contact
      - ReportFolder:MS_Outreach_Intelligence
      - ReportType:MS_Financial_Advisors
      - CustomMetadata:Event_Label.X25_CCD_LC_Webcast_0925
      - CustomMetadataType:Event_Label
      - Dashboard:Folder.Name
      - Process:annual-ms-data-pack-load
      - Term:rep
    """
    id: str
    type: str
    name: str
    parent_id: Optional[str] = None
    api_version: Optional[str] = None
    status: Optional[str] = None
    file_path: Optional[str] = None
    kb_doc_path: Optional[str] = None
    metadata_json: Optional[str] = None  # JSON-encoded dict; type-specific extras
    source: str = "force-app"


@dataclass
class Edge:
    """A relationship between two components.

    kind values:
      WRITES               — src writes/updates dst (a Field)
      READS                — src reads dst (filter, decision, formula reference)
      INVOKES              — src calls dst (Apex class -> class, trigger -> handler)
      REFERENCES           — generic reference (formula, validation, picklist dep)
      FORMULA_REFERENCES   — src is a formula field referencing dst field
      ROLLUP_OF            — src is a rollup-summary field summarizing dst object
      GRANTS_READ          — permission set grants read on dst field
      GRANTS_EDIT          — permission set grants edit on dst field
      TRIGGERS_ON          — flow/trigger fires on dst object
      SCHEDULES            — schedulable Apex schedules dst batch class
      CONTAINS             — parent contains child (object -> field, etc.)

    writer_kind values (only set when kind == 'WRITES'):
      formula | rollup | apex_batch | apex_handler | apex_other
      | flow_record_triggered | flow_scheduled | flow_screen | flow_autolaunched
      | flow_kb_curated | apex_kb_curated | workflow_field_update
      | validation_rule | inbound_integration | manual_only | unknown_writer

    confidence: high | medium | low
      high   — XML-parsed direct (e.g. <recordUpdates> in a flow)
      medium — XML-parsed via formula/regex; KB-curated markdown
      low    — Apex SOQL/DML regex extraction; inferred
    """
    src_id: str
    dst_id: str
    kind: str
    writer_kind: Optional[str] = None
    source: str = ""
    confidence: str = "medium"
    evidence: Optional[str] = None


@dataclass
class ParseResult:
    """Container returned by every parser/loader."""
    components: List[Component] = field(default_factory=list)
    edges: List[Edge] = field(default_factory=list)
    orphan_refs: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)
    # component_id -> path under engagement/knowledge-base/ for the matching markdown doc.
    # Populated by parse_kb_indexes.py; orchestrator applies these to components.kb_doc_path.
    kb_doc_paths: dict = field(default_factory=dict)


# ---------------------------------------------------------------------------
# id constructors — single source of truth for component-id formatting.
# ---------------------------------------------------------------------------

def object_id(obj: str) -> str:
    return f"Object:{obj}"


def field_id(obj: str, fld: str) -> str:
    return f"Field:{obj}.{fld}"


def flow_id(name: str) -> str:
    return f"Flow:{name}"


def apex_class_id(name: str) -> str:
    return f"ApexClass:{name}"


def apex_trigger_id(name: str) -> str:
    return f"ApexTrigger:{name}"


def record_type_id(obj: str, name: str) -> str:
    return f"RecordType:{obj}.{name}"


def validation_rule_id(obj: str, name: str) -> str:
    return f"ValidationRule:{obj}.{name}"


def permission_set_id(name: str) -> str:
    return f"PermissionSet:{name}"


def permission_set_group_id(name: str) -> str:
    return f"PermissionSetGroup:{name}"


def workflow_id(obj: str) -> str:
    return f"Workflow:{obj}"


def custom_label_id(name: str) -> str:
    return f"CustomLabel:{name}"


def remote_site_id(name: str) -> str:
    return f"RemoteSite:{name}"


def report_id(folder: Optional[str], name: str) -> str:
    return f"Report:{folder}.{name}" if folder else f"Report:{name}"


def report_folder_id(name: str) -> str:
    return f"ReportFolder:{name}"


def report_type_id(name: str) -> str:
    return f"ReportType:{name}"


def custom_metadata_id(type_name: str, record_name: str) -> str:
    return f"CustomMetadata:{type_name}.{record_name}"


def custom_metadata_type_id(type_name: str) -> str:
    return f"CustomMetadataType:{type_name}"


def dashboard_id(folder: Optional[str], name: str) -> str:
    return f"Dashboard:{folder}.{name}" if folder else f"Dashboard:{name}"


def process_id(slug: str) -> str:
    return f"Process:{slug}"


def term_id(term: str) -> str:
    return f"Term:{term}"


# ---------------------------------------------------------------------------
# XML namespace handling
# ---------------------------------------------------------------------------

NAMESPACE = "{http://soap.sforce.com/2006/04/metadata}"


def strip_ns(tag: str) -> str:
    """Strip the SF metadata XML namespace from an ElementTree tag."""
    if tag.startswith(NAMESPACE):
        return tag[len(NAMESPACE):]
    return tag


def tag(elem) -> str:
    """Return the namespace-stripped tag name of an Element."""
    return strip_ns(elem.tag)

-- Davis Advisors metadata catalog + component graph
-- Source of truth: tools/kb/build_graph.py rebuilds this from force-app/ XML
-- and the curated markdown KB. Never edit the .sqlite directly.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Components: every Salesforce metadata object the catalog tracks.
-- id is "Type:Qualified.Name" — e.g. "Field:Contact.Events__c", "Flow:FA_Pull_First_Name".
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS components (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL,        -- Object | Field | Flow | ApexClass | ApexTrigger
                                     -- | PermissionSet | PermissionSetGroup | RecordType
                                     -- | ValidationRule | CustomLabel | RemoteSite
                                     -- | Report | ReportFolder | Dashboard | ReportType
                                     -- | CustomMetadata | CustomMetadataType | Workflow
                                     -- | Process (from _processes.yaml) | Term (glossary)
  name         TEXT NOT NULL,
  parent_id    TEXT,                 -- Field.parent_id = its Object id; FK below
  api_version  TEXT,
  status       TEXT,                 -- Active | Inactive | Obsolete | Draft | Stale
  file_path    TEXT,                 -- force-app/... path (NULL for derived)
  kb_doc_path  TEXT,                 -- engagement/knowledge-base/... path if exists
  metadata_json TEXT,                -- bag for type-specific extras (label, formula, type, ...)
  source       TEXT NOT NULL,        -- "force-app" | "kb-index" | "yaml" | "derived"
  FOREIGN KEY (parent_id) REFERENCES components(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------
-- Relationships: edges between components.
-- A field can have many writers (each is its own row).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS relationships (
  src_id       TEXT NOT NULL,
  dst_id       TEXT NOT NULL,
  kind         TEXT NOT NULL,        -- WRITES | READS | INVOKES | REFERENCES
                                     -- | GRANTS_READ | GRANTS_EDIT | TRIGGERS_ON
                                     -- | SCHEDULES | IMPLEMENTS_REQ | CONTAINS
                                     -- | ROLLUP_OF | FORMULA_REFERENCES
  writer_kind  TEXT,                 -- only for WRITES edges:
                                     -- formula | rollup | apex_batch | apex_handler | apex_other
                                     -- | flow_record_triggered | flow_scheduled | flow_screen
                                     -- | flow_autolaunched | flow_kb_curated
                                     -- | apex_kb_curated | workflow_field_update
                                     -- | validation_rule | inbound_integration
                                     -- | manual_only | unknown_writer
  source       TEXT NOT NULL,        -- "force-app/.../Foo.flow-meta.xml" | "field-writers.md"
                                     -- | "yaml:_processes.yaml" | "derived"
  confidence   TEXT NOT NULL,        -- high | medium | low
  evidence     TEXT,                 -- short quote / XPath / line ref
  PRIMARY KEY (src_id, dst_id, kind, source)
  -- No FK on src_id/dst_id: orphan edges (e.g. references to standard fields
  -- whose metadata is not in force-app/) are valid data and surfaced by self_check.
);

-- ---------------------------------------------------------------------------
-- Glossary: canonical Davis terms.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS terminology (
  term         TEXT PRIMARY KEY,
  canonical_id TEXT,                 -- FK into components if mappable
  notes        TEXT,
  source       TEXT,
  added        TEXT,
  FOREIGN KEY (canonical_id) REFERENCES components(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS term_aliases (
  alias        TEXT PRIMARY KEY,
  term         TEXT NOT NULL,
  FOREIGN KEY (term) REFERENCES terminology(term) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Processes: recurring business processes (e.g. "annual MS load").
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS processes (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  trigger_kind TEXT,                 -- manual | scheduled | api | event-driven
  frequency    TEXT,
  owner        TEXT,
  notes        TEXT,
  added        TEXT
);

CREATE TABLE IF NOT EXISTS process_components (
  process_id   TEXT NOT NULL,
  component_id TEXT NOT NULL,
  role         TEXT NOT NULL,        -- writes | reads | orchestrates | input | output
  PRIMARY KEY (process_id, component_id, role),
  FOREIGN KEY (process_id) REFERENCES processes(id) ON DELETE CASCADE
  -- No FK on component_id: curated overlays may intentionally name standard
  -- fields or external components that do not have local metadata files.
);

-- ---------------------------------------------------------------------------
-- Field groups: semantic clusters (e.g. "address.mailing", "crd.primary").
-- Curated overlay — fed from _field_groups.yaml.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_groups (
  id           TEXT PRIMARY KEY,     -- "address.mailing" | "name.primary"
  object_name  TEXT,                 -- "Contact" — null = cross-object
  description  TEXT,
  added        TEXT
);

CREATE TABLE IF NOT EXISTS field_group_members (
  group_id     TEXT NOT NULL,
  field_id     TEXT NOT NULL,        -- component id of the field
  role         TEXT,                 -- "primary" | "alternate" | "legacy" | "source-stamp"
  notes        TEXT,
  PRIMARY KEY (group_id, field_id),
  FOREIGN KEY (group_id) REFERENCES field_groups(id) ON DELETE CASCADE
  -- No FK on field_id: semantic groups can include standard fields absent
  -- from force-app metadata, e.g. Contact.MailingStreet.
);

-- ---------------------------------------------------------------------------
-- Field classification: derived per-field summary of how it's populated.
-- One row per Field component. Recomputed each build from relationships.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_classification (
  field_id        TEXT PRIMARY KEY,
  primary_kind    TEXT NOT NULL,     -- formula | rollup | apex_batch | apex_handler
                                     -- | flow_record_triggered | flow_scheduled
                                     -- | flow | workflow_field_update
                                     -- | validation_rule | inbound_integration
                                     -- | manual_only | unknown_writer | dormant
  writer_count    INTEGER NOT NULL,
  writer_kinds    TEXT NOT NULL,     -- comma-separated set of all writer_kinds seen
  has_formula     INTEGER NOT NULL,
  has_rollup      INTEGER NOT NULL,
  notes           TEXT,
  FOREIGN KEY (field_id) REFERENCES components(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Client lexicon: stakeholder-language resolutions (Rule #24 captures these).
-- Each entry is a confirmed mapping from informal phrasing to concrete components.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_lexicon (
  id                  TEXT PRIMARY KEY,
  date_resolved       TEXT NOT NULL,
  requester           TEXT NOT NULL,
  original_phrase     TEXT NOT NULL,
  context             TEXT,
  hypotheses_json     TEXT,           -- JSON list of hypotheses considered
  resolution_components_json TEXT,    -- JSON list of component ids
  resolution_glossary_json   TEXT,    -- JSON list of glossary terms
  resolution_process  TEXT,           -- process id, if applicable
  confirmed_by        TEXT,
  confirmed_on        TEXT,
  confirmation_channel TEXT,
  notes               TEXT
);

-- ---------------------------------------------------------------------------
-- Build metadata: track every build run, for partial-rebuild bookkeeping.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS build_runs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  run_at       TEXT NOT NULL,
  scope        TEXT NOT NULL,        -- "all" | "flows" | "ApexClass:Foo" | "yamls" | etc.
  components_added       INTEGER,
  relationships_added    INTEGER,
  orphan_refs            INTEGER,
  parser_kb_disagreements INTEGER,
  notes        TEXT
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_components_type   ON components(type);
CREATE INDEX IF NOT EXISTS idx_components_parent ON components(parent_id);
CREATE INDEX IF NOT EXISTS idx_components_source ON components(source);
CREATE INDEX IF NOT EXISTS idx_rel_src           ON relationships(src_id, kind);
CREATE INDEX IF NOT EXISTS idx_rel_dst           ON relationships(dst_id, kind);
CREATE INDEX IF NOT EXISTS idx_rel_kind          ON relationships(kind);
CREATE INDEX IF NOT EXISTS idx_rel_source        ON relationships(source);
CREATE INDEX IF NOT EXISTS idx_aliases_term      ON term_aliases(term);
CREATE INDEX IF NOT EXISTS idx_pc_component      ON process_components(component_id);
CREATE INDEX IF NOT EXISTS idx_fgm_field         ON field_group_members(field_id);
CREATE INDEX IF NOT EXISTS idx_fc_kind           ON field_classification(primary_kind);
CREATE INDEX IF NOT EXISTS idx_lex_requester     ON client_lexicon(requester);

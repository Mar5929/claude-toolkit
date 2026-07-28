export const RECORD_TYPES = Object.freeze({
  requirement: {
    root: "specifications",
    lifecycles: ["proposed", "active", "superseded", "deprecated", "rejected", "retired"],
    current: ["active"],
    requiredHeadings: [
      "Behavior",
      "Scope",
      "Invariants",
      "Edge cases",
      "Data preservation",
      "Acceptance scenarios",
    ],
  },
  decision: {
    root: "decisions",
    lifecycles: ["proposed", "accepted", "superseded", "deprecated", "rejected", "retired"],
    current: ["accepted"],
    requiredHeadings: ["Context", "Choice", "Rationale", "Tradeoffs", "Consequences", "Evidence"],
  },
  context: {
    root: "context",
    lifecycles: ["proposed", "active", "superseded", "retired"],
    current: ["active"],
    requiredHeadings: [],
  },
  knowledge: {
    root: "knowledge",
    lifecycles: ["proposed", "active", "superseded", "retired"],
    current: ["active"],
    requiredHeadings: [],
  },
  reference: {
    root: "references",
    lifecycles: ["proposed", "active", "superseded", "retired"],
    current: ["active"],
    requiredHeadings: [],
  },
  domain: {
    root: "domain",
    lifecycles: ["proposed", "active", "superseded", "retired"],
    current: ["active"],
    requiredHeadings: [],
  },
  operation: {
    root: "operations",
    lifecycles: ["proposed", "active", "superseded", "retired"],
    current: ["active"],
    requiredHeadings: [],
  },
});

export const FRESHNESS_VALUES = Object.freeze(["current", "stale", "unverified"]);
export const VERIFICATION_VALUES = Object.freeze([
  "verified",
  "owner_reviewed",
  "repository_evidence",
  "unverified",
  "not_applicable",
  "stale",
]);

export const REQUIRED_RECORD_FIELDS = Object.freeze([
  "id",
  "record_type",
  "title",
  "lifecycle",
  "freshness",
  "created",
  "updated",
  "provenance",
  "source_paths",
  "predecessors",
  "successors",
  "related",
  "verification",
]);

export const ALLOWED_RECORD_FIELDS = Object.freeze([
  ...REQUIRED_RECORD_FIELDS,
  "work_items",
  "external_pointers",
  "source_commit",
  "source_hash",
  "subsystems",
]);

export const CONFIG_KEYS = Object.freeze([
  "schema_version",
  "project_id",
  "repository_id",
  "profile",
  "modules",
  "canonical_paths",
  "authorities",
  "budgets",
  "index",
  "external_authorities",
]);

export const CANONICAL_PATH_KEYS = Object.freeze([
  "project_router",
  "specifications",
  "memory",
  "current_context",
  "decisions",
  "knowledge",
  "references",
  "domain",
  "operations",
  "task_tracker",
]);

export const AUTHORITY_KEYS = Object.freeze([
  "desired_behavior",
  "architecture_decisions",
  "implemented_behavior",
  "terminology",
  "source_authority",
  "task_status",
  "deployed_state",
  "agent_rules",
]);

export const BUDGET_KEYS = Object.freeze([
  "project_router_max_bytes",
  "startup_max_bytes",
  "task_retrieval_max_bytes",
  "current_max_bytes",
  "current_max_nonempty_lines",
  "search_max_results",
  "file_max_bytes",
  "record_max_count",
  "diagnostic_max_count",
  "diagnostic_max_bytes",
  "query_max_bytes",
  "search_response_max_bytes",
]);

export const INDEX_KEYS = Object.freeze(["enabled", "schema_version", "modes"]);

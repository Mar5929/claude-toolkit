#!/usr/bin/env node

/**
 * The result envelope, the closed reason-code list, and the exit mapping for
 * the version 2 memory tools.
 *
 * Every operation prints exactly one JSON object on standard output and
 * nothing else. Field order is fixed so the same inputs produce the same
 * bytes. No wall-clock value belongs anywhere in the envelope except an
 * as_of date inside an operation whose contract names one.
 *
 * Messages carry ids, paths, counts, and reason codes. They never carry
 * record body text, matched secret text, or sensitive content.
 */

export const RESULT_SCHEMA = "memory-tool-result/1";
export const TOOL_VERSION = "2.0";

/**
 * The closed reason-code list. The value is the exit code the code produces
 * when it is raised as an error. A code raised as a warning leaves the exit
 * code at 0, which is what the zero entries mean.
 */
export const REASON_CODES = Object.freeze({
  "scope/unresolved-root": 2,
  "scope/outside-root": 1,
  "scope/symlink-escape": 1,
  "scope/undeclared-nested-scope": 1,
  "scope/overlapping-scopes": 1,
  "scope/duplicate-project-id": 1,
  "scope/cross-scope-result": 1,
  "privacy/transfer-denied": 1,
  "privacy/consent-missing": 1,
  "privacy/secret-detected": 1,
  "privacy/third-party-personal": 1,
  "privacy/sensitive-unapproved-exposure": 1,
  "settings/owner-only": 1,
  "approval/missing": 1,
  "approval/stale-proposal": 1,
  "approval/source-changed": 1,
  "record/unknown-id": 1,
  "record/duplicate-id": 1,
  "record/missing-evidence": 1,
  "record/inference-without-basis": 1,
  "record/schema-invalid": 1,
  "record/merge-conflict": 1,
  "record/legacy-gap": 0,
  "write/lock-held": 1,
  "write/journal-present": 2,
  "write/validation-failed": 1,
  "write/link-repair-failed": 1,
  "write/guard-refused": 1,
  "cli/invalid-invocation": 2,
  "retrieval/parse-error": 2,
  "retrieval/unsupported-filter": 2,
  "startup/missing-source": 0,
  "startup/stale-current": 0,
  "startup/over-budget": 0,
  "startup/pin-hash-mismatch": 0,
  "tracker/not-configured": 0,
  "tracker/unavailable": 0,
  "history/gate-closed": 1,
  "history/unavailable": 0,
  "migration/ambiguous": 1,
  "migration/collision": 1,
  "migration/unsupported-source": 1,
});

export const STATUSES = Object.freeze([
  "ok",
  "noop",
  "refused",
  "error",
  "awaiting-approval",
]);

/** Statuses map to exit codes. Nothing else sets one. */
export function exitCodeFor(status) {
  if (status === "refused") return 1;
  if (status === "error") return 2;
  return 0;
}

/**
 * Build one warnings or errors entry. An unknown code throws, because the
 * list is closed and a build that needs a new code changes the contract
 * document first.
 */
export function note(code, message, extra = {}) {
  if (!Object.hasOwn(REASON_CODES, code)) {
    throw new Error(`unknown reason code: ${code}`);
  }
  const entry = { code, message };
  if (extra.path !== undefined) entry.path = extra.path;
  if (extra.detail !== undefined) entry.detail = extra.detail;
  return entry;
}

/** Build the envelope with its fixed field order. */
export function envelope({
  operation,
  status = "ok",
  projectId = null,
  scopeRoot = null,
  result = null,
  warnings = [],
  errors = [],
  searched = [],
}) {
  if (!STATUSES.includes(status)) {
    throw new Error(`unknown result status: ${status}`);
  }
  return {
    schema: RESULT_SCHEMA,
    tool_version: TOOL_VERSION,
    operation,
    status,
    project_id: projectId,
    scope_root: scopeRoot,
    result,
    warnings,
    errors,
    searched,
  };
}

export function render(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** Print one envelope and set the exit code its status calls for. */
export function emit(value, out = process.stdout) {
  out.write(render(value));
  process.exitCode = exitCodeFor(value.status);
  return value;
}

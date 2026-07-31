import type { Env } from "./types";

export const V1_READ_ONLY_PAYLOAD = {
  outcome: "skipped",
  reason: "v1_read_only",
  next_action: "retain the proposal locally or use the v2 migration path",
} as const;

export const LEGACY_ADVISORY_WARNING =
  "legacy/advisory: second-brain v1 is frozen evidence, not current project truth. " +
  "Verify any useful claim against the Git repository before relying on it.";

export type V1WriteMode = "read-only" | "write";

// Containment fails closed. Missing, empty, or unknown values keep v1
// read-only. Restoring writes requires the explicit value "write", and does not
// independently re-enable capture, session-end curation, cron curation, or
// per-prompt recall.
export function v1WriteMode(env: Pick<Env, "BRAIN_V1_WRITE_MODE">): V1WriteMode {
  return env.BRAIN_V1_WRITE_MODE === "write" ? "write" : "read-only";
}

export function v1WritesAreReadOnly(env: Pick<Env, "BRAIN_V1_WRITE_MODE">): boolean {
  return v1WriteMode(env) === "read-only";
}

export function blockedWriteJson(): string {
  return JSON.stringify(V1_READ_ONLY_PAYLOAD);
}

export function blockedWriteHttpResponse(): Response {
  return Response.json(V1_READ_ONLY_PAYLOAD, {
    status: 423,
    headers: {
      "cache-control": "no-store",
    },
  });
}

export function blockedWriteMcpResult() {
  return {
    content: [{ type: "text" as const, text: blockedWriteJson() }],
    isError: true,
  };
}

export function legacyAdvisoryText(text: string): string {
  return `${LEGACY_ADVISORY_WARNING}\n\n${text}`;
}

/** Shared read-only managed-manual discovery. No hooks or review-state imports. */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const MANUAL_PATH = "knowledge/knowledge-manual.md";
export const LEGACY_MANUAL_PATH = "knowledge/README.md";
export const MANUAL_MARKER = "<!-- claude-toolkit:knowledge-manual -->";

/** Read-only compatibility during the manual filename migration. */
export function resolveManual(projectRoot) {
  const read = path => {
    const absolute = resolve(projectRoot, path);
    return existsSync(absolute) ? readFileSync(absolute, "utf8") : null;
  };
  try {
    const current = read(MANUAL_PATH);
    let legacy = null;
    let legacyUnreadable = false;
    try { legacy = read(LEGACY_MANUAL_PATH); } catch { legacyUnreadable = true; }
    const marked = text => text !== null && text.trimStart().startsWith(MANUAL_MARKER);
    const normalize = text => text.replace(/\r\n/g, "\n")
      .replaceAll(LEGACY_MANUAL_PATH, MANUAL_PATH).trim();
    if (current !== null) {
      if (!current.trim()) return { path: MANUAL_PATH, notice: `Project startup file empty: ${MANUAL_PATH}. Continuing without it.` };
      if (!marked(current)) return { path: MANUAL_PATH, notice: "Knowledge manual is not marked as managed. Run project-sync to review it; no manual policy was loaded." };
      if (marked(legacy) && normalize(current) !== normalize(legacy)) {
        return { path: MANUAL_PATH, notice: "Conflicting marked knowledge manuals exist at knowledge/knowledge-manual.md and knowledge/README.md. Preserve both and reconcile through project-sync; no manual policy was loaded." };
      }
      return { path: MANUAL_PATH, text: current,
        ...(legacyUnreadable ? { notice: "Using the canonical knowledge manual; legacy knowledge/README.md could not be inspected. Project-sync must check that path before migration cleanup." } : {}) };
    }
    if (marked(legacy)) return { path: LEGACY_MANUAL_PATH, text: legacy,
      notice: "Using the legacy knowledge/README.md manual until project-sync migrates it to knowledge/knowledge-manual.md." };
    if (legacyUnreadable) return { path: MANUAL_PATH, notice: "Canonical knowledge manual is missing and legacy knowledge/README.md could not be read. No manual policy was loaded; project-sync must investigate." };
    return { path: MANUAL_PATH };
  } catch {
    return { path: MANUAL_PATH, notice: "Could not read the knowledge manual. Preserve existing files and use project-sync to investigate; no manual policy was loaded." };
  }
}

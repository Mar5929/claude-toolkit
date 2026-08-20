#!/usr/bin/env node

/**
 * Cross-scope answers, in one place.
 *
 * Architecture section 21.4 gives one reason code to a candidate that belongs
 * to another scope, `scope/cross-scope-result`, and AT-45 says the refusal has
 * to name the operation, the path, and the resolved scope root. Before this
 * module, a record id belonging to another scope came back as
 * `record/unknown-id`, which names no root and reads as "there is no such
 * record" rather than "that record is not yours to reach".
 *
 * The distinction this module draws:
 *
 * - An id that resolves to a record file owned by a different scope is
 *   `scope/cross-scope-result`.
 * - An id that resolves nowhere at all stays `record/unknown-id`.
 *
 * Where it looks. Only inside the resolved scope root: the record files this
 * project's own walk reaches but its member test rejects, and the record trees
 * of the subroots `knowledge/project.md` declares. It never reads a directory
 * outside the root to compose a message, because reading an undeclared sibling
 * project to describe it would itself cross the boundary section 21 draws. So
 * an unrelated project on the same disk stays invisible, which is the point of
 * the boundary, and the answer there remains `record/unknown-id`.
 *
 * Nothing here is written down. Every answer is read from the files on the
 * call, and the module builds no registry, index, or cache.
 */

import { readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

import { note } from "./result.mjs";
import { isMemberPath, resolveScope } from "./scope.mjs";
import { parseRecord, walkRecords } from "./record-schema.mjs";

function readIfPresent(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function canonical(path) {
  try {
    return realpathSync(path);
  } catch {
    const parent = dirname(path);
    if (parent === path) return resolve(path);
    return resolve(canonical(parent), path.slice(parent.length + 1));
  }
}

function beneath(root, candidate) {
  return candidate === root || candidate.startsWith(root + sep);
}

function fromRoot(root, absolute) {
  return relative(root, absolute).split(sep).join("/");
}

/**
 * Who owns a path that sits inside this scope root and is not a member of it.
 * A declared subroot carrying its own `knowledge/project.md` is named by its
 * project id. A declared subroot without one is named by its declared path,
 * because that is the only name it has.
 */
function ownerOf(scope, absolute) {
  for (const subroot of scope.subroots) {
    if (!beneath(subroot, absolute)) continue;
    const declared = fromRoot(scope.scopeRoot, subroot);
    const nested = resolveScope(subroot);
    if (nested.ok && nested.scopeRoot !== scope.scopeRoot) {
      return {
        root: nested.scopeRoot,
        project_id: nested.projectId,
        declared_as: declared,
        label: `project ${nested.projectId}`,
      };
    }
    return {
      root: subroot,
      project_id: null,
      declared_as: declared,
      label: `the declared subroot ${declared}`,
    };
  }
  return {
    root: null,
    project_id: null,
    declared_as: null,
    label: "another scope",
  };
}

/** Every record file inside the root that this scope does not own. */
function foreignRecords(scope) {
  const found = new Map();
  const add = (root, entry) => {
    if (found.has(entry.absolute)) return;
    found.set(entry.absolute, {
      absolute: entry.absolute,
      path: fromRoot(scope.scopeRoot, entry.absolute),
      owner_path: fromRoot(root, entry.absolute),
    });
  };

  for (const entry of walkRecords(scope.scopeRoot)) {
    if (isMemberPath(scope, entry.absolute)) continue;
    add(scope.scopeRoot, entry);
  }
  for (const subroot of scope.subroots) {
    if (!beneath(scope.scopeRoot, subroot)) continue;
    for (const entry of walkRecords(subroot)) add(subroot, entry);
  }
  return [...found.values()];
}

/**
 * The record another scope owns under this id, or null when no scope inside
 * this root carries it. A null answer means the id is genuinely unknown, which
 * is what keeps `record/unknown-id` meaning what it says.
 */
export function locateCrossScope(scope, wantedId) {
  const wanted = String(wantedId ?? "").trim();
  if (!wanted) return null;

  for (const candidate of foreignRecords(scope)) {
    const text = readIfPresent(candidate.absolute);
    if (text === null) continue;
    const record = parseRecord(text);
    if (String(record.data.id ?? "").trim() !== wanted) continue;
    return { ...candidate, id: wanted, owner: ownerOf(scope, candidate.absolute) };
  }
  return null;
}

/**
 * Whether a path names a place inside this root that another scope owns. A
 * path that is not beneath the root at all is not this question: that is
 * `scope/outside-root`, and the caller keeps raising it.
 */
export function locateCrossScopePath(scope, candidatePath) {
  const absolute = canonical(
    isAbsolute(candidatePath) ? candidatePath : resolve(scope.scopeRoot, candidatePath),
  );
  if (!beneath(scope.scopeRoot, absolute)) return null;
  if (isMemberPath(scope, absolute)) return null;
  return {
    absolute,
    path: fromRoot(scope.scopeRoot, absolute),
    owner_path: null,
    id: null,
    owner: ownerOf(scope, absolute),
  };
}

/**
 * The refusal itself. One message names the operation, the id or path at
 * fault, the place it actually resolves to, and this project's resolved scope
 * root, which is what AT-45 asks a blocked attempt to show.
 */
export function crossScopeNote(scope, operation, found) {
  const named = found.id
    ? `the record id ${found.id}`
    : `the path ${found.path}`;
  return note(
    "scope/cross-scope-result",
    `${operation} refused: ${named} resolves to ${found.path}, which belongs to ${found.owner.label}, outside this project's resolved scope root ${scope.scopeRoot}`,
    { path: found.path, detail: `resolved scope root ${scope.scopeRoot}` },
  );
}

/**
 * The neighbouring refusal, for a path that is not beneath the root at all.
 * Same shape, so a symlink escape and a similarly named sibling directory read
 * the same way a cross-scope id does.
 */
export function outsideRootNote(scope, operation, candidatePath) {
  return note(
    "scope/outside-root",
    `${operation} refused: ${candidatePath} does not sit inside this project's resolved scope root ${scope.scopeRoot}`,
    { path: candidatePath, detail: `resolved scope root ${scope.scopeRoot}` },
  );
}

/**
 * The one decision every id-taking operation makes: cross-scope when another
 * scope owns the id, unknown when nothing does.
 */
export function unknownOrCrossScope(scope, operation, id) {
  const found = locateCrossScope(scope, id);
  if (found) return crossScopeNote(scope, operation, found);
  return note(
    "record/unknown-id",
    `no record in this scope carries the id ${String(id ?? "").trim()}`,
  );
}

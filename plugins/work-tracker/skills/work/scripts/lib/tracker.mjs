import fs from "node:fs";
import path from "node:path";
import {
  WorkError,
  atomicBatchWrite,
  atomicWrite,
  atomicWriteJson,
  git,
  isoDate,
  isoTimestamp,
  isIsoDate,
  readJson,
  slugify,
  stableJson,
  toPosix,
  withLock,
} from "./common.mjs";

export const STATUSES = ["Backlog", "Ready", "In Progress", "In Review", "Done", "Cancelled"];
export const PRIORITIES = ["urgent", "high", "medium", "low"];
export const TYPES = ["bug", "enhancement", "task"];
export const RELATIONSHIPS = [
  "depends_on",
  "blocks",
  "related_to",
  "parent",
  "children",
  "supersedes",
  "superseded_by",
];
export const STAGES = {
  backlog: "01-backlog",
  active: "02-in-progress",
  completed: "03-completed",
  archived: "04-archived",
};

const STATUS_STAGE = {
  Backlog: STAGES.backlog,
  Ready: STAGES.backlog,
  "In Progress": STAGES.active,
  "In Review": STAGES.active,
  Done: STAGES.completed,
  Cancelled: STAGES.archived,
};

const PRIORITY_SCORE = { urgent: 0, high: 1, medium: 2, low: 3 };
const STATUS_SCORE = { "In Progress": 0, "In Review": 1, Ready: 2, Backlog: 3 };
const INVERSES = {
  depends_on: "blocks",
  blocks: "depends_on",
  related_to: "related_to",
  parent: "children",
  children: "parent",
  supersedes: "superseded_by",
  superseded_by: "supersedes",
};

export function trackerPaths(repoRoot, requestedPath) {
  const explicit = requestedPath ? path.resolve(repoRoot, requestedPath) : null;
  let workRoot = explicit;
  if (!workRoot) {
    const rootDefault = path.join(repoRoot, "work-items");
    const salesforceDefault = path.join(repoRoot, "engagement", "work-items");
    workRoot = fs.existsSync(rootDefault)
      ? rootDefault
      : fs.existsSync(salesforceDefault)
        ? salesforceDefault
        : rootDefault;
  }
  const relative = path.relative(repoRoot, workRoot);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new WorkError("The work-items path must be inside the Git repository", "invalid_path");
  }
  return {
    repoRoot,
    workRoot,
    configPath: path.join(workRoot, ".work-tracker.json"),
    dashboardPath: path.join(workRoot, "DASHBOARD.md"),
    backlogPath: path.join(workRoot, STAGES.backlog, "BACKLOG.md"),
    lockPath: path.join(workRoot, ".work-tracker.lock"),
  };
}

export function defaultBranch(repoRoot) {
  const symbolic = git(repoRoot, ["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"], {
    allowFailure: true,
  });
  if (symbolic.status === 0) return symbolic.stdout.trim().replace("refs/remotes/origin/", "");
  const remote = git(repoRoot, ["remote", "show", "origin"], { allowFailure: true });
  const match = remote.stdout.match(/HEAD branch:\s*(\S+)/);
  if (match && match[1] !== "(unknown)") return match[1];
  for (const candidate of ["main", "master"]) {
    if (
      git(repoRoot, ["show-ref", "--verify", "--quiet", `refs/heads/${candidate}`], {
        allowFailure: true,
      }).status === 0
    ) {
      return candidate;
    }
  }
  return "main";
}

export function loadTracker(repoRoot, requestedPath, options = {}) {
  const paths = trackerPaths(repoRoot, requestedPath);
  if (!fs.existsSync(paths.configPath)) {
    if (options.allowMissing) return { paths, config: null, items: [] };
    throw new WorkError(
      `Work tracker is not initialized. Run "work init${requestedPath ? ` --path ${requestedPath}` : ""}".`,
      "not_initialized",
    );
  }
  const config = readJson(paths.configPath, "tracker configuration");
  const items = scanItems(paths);
  return { paths, config, items };
}

export function initialize(repoRoot, options = {}) {
  const paths = trackerPaths(repoRoot, options.path);
  return withLock(paths.lockPath, () => {
    for (const stage of Object.values(STAGES)) {
      fs.mkdirSync(path.join(paths.workRoot, stage), { recursive: true });
      const keep = path.join(paths.workRoot, stage, ".gitkeep");
      if (!fs.existsSync(keep)) atomicWrite(keep, "");
    }

    const candidates = scanItemFolders(paths);
    const duplicateIds = duplicates(candidates.map((candidate) => candidate.id));
    if (duplicateIds.length) {
      throw new WorkError(
        `Cannot adopt existing folders because IDs are duplicated: ${duplicateIds.join(", ")}`,
        "duplicate_ids",
      );
    }

    let config;
    let createdConfig = false;
    if (fs.existsSync(paths.configPath)) {
      config = readJson(paths.configPath, "tracker configuration");
    } else {
      config = {
        schema_version: 1,
        id_prefix: "WI",
        id_width: 3,
        default_branch: options.defaultBranch ?? defaultBranch(repoRoot),
        github: null,
      };
      atomicWriteJson(paths.configPath, config);
      createdConfig = true;
    }

    const adopted = [];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate.itemPath)) continue;
      const title = titleFromFolder(candidate.folderName);
      const inferredStatus = statusFromStage(candidate.stage);
      const record = newRecord({
        id: candidate.id,
        title,
        type: "task",
        priority: "medium",
        status: inferredStatus,
        nextStep:
          inferredStatus === "Done" || inferredStatus === "Cancelled"
            ? ""
            : "Review the preserved STATUS.md and set the exact next step.",
        createdAt: isoDate(),
      });
      record.migration = {
        adopted_at: isoDate(),
        needs_review: true,
        note: "Metadata was inferred from the existing folder. Existing files were preserved.",
      };
      const specPath = path.join(candidate.path, "SPEC.md");
      const statusPath = path.join(candidate.path, "STATUS.md");
      const historyPath = path.join(candidate.path, "HISTORY.ndjson");
      const adoptedEntry = historyEntry(
        "adopted",
        "Existing work-item folder adopted without overwriting its files.",
      );
      const existingHistory = fs.existsSync(historyPath) ? fs.readFileSync(historyPath, "utf8") : "";
      const entries = [
        { path: candidate.itemPath, content: stableJson(record) },
        { path: historyPath, content: `${existingHistory}${JSON.stringify(adoptedEntry)}\n` },
      ];
      if (!fs.existsSync(specPath)) {
        entries.push({
          path: specPath,
          content: renderSpec(record, "Review this adopted item and record its purpose."),
        });
      }
      if (!fs.existsSync(statusPath)) {
        entries.push({ path: statusPath, content: renderStatus(record, [adoptedEntry]) });
      }
      atomicBatchWrite(entries);
      adopted.push(candidate.id);
    }

    const tracker = loadTracker(repoRoot, path.relative(repoRoot, paths.workRoot));
    const generated = regenerate(tracker);
    if (!fs.existsSync(path.join(paths.workRoot, "README.md"))) {
      atomicWrite(path.join(paths.workRoot, "README.md"), workItemsReadme());
    }
    return {
      outcome: "initialized",
      path: toPosix(path.relative(repoRoot, paths.workRoot)),
      config_created: createdConfig,
      adopted,
      item_count: tracker.items.length,
      generated,
      text: `Work tracker ready at ${toPosix(path.relative(repoRoot, paths.workRoot))}. ${adopted.length ? `Adopted ${adopted.length} existing item(s) without overwriting their files.` : "No existing items needed adoption."}`,
    };
  });
}

export function addItem(tracker, input) {
  return withLock(tracker.paths.lockPath, () => {
    const id = input.id ? normalizeId(input.id) : allocateId(tracker.config, tracker.items);
    if (tracker.items.some((item) => item.id === id)) {
      throw new WorkError(`Work item ${id} already exists`, "duplicate_id");
    }
    const type = normalizeEnum(input.type ?? "task", TYPES, "type");
    const priority = normalizeEnum(input.priority ?? "medium", PRIORITIES, "priority");
    const status = input.status ? normalizeStatus(input.status) : "Backlog";
    if (!["Backlog", "Ready"].includes(status)) {
      throw new WorkError("New work items must start as Backlog or Ready", "invalid_initial_status");
    }
    const record = newRecord({
      id,
      title: requiredText(input.title, "title"),
      type,
      priority,
      status,
      nextStep: requiredText(input.nextStep, "next step"),
      createdAt: input.createdAt ?? isoDate(),
    });
    if (!isIsoDate(record.created_at)) {
      throw new WorkError(`Creation date must be YYYY-MM-DD: ${record.created_at}`, "invalid_date");
    }
    const folderName = `${id}-${slugify(record.title)}`;
    const itemDir = path.join(tracker.paths.workRoot, STATUS_STAGE[status], folderName);
    if (fs.existsSync(itemDir)) {
      throw new WorkError(`Refusing to overwrite existing folder ${itemDir}`, "path_exists");
    }
    fs.mkdirSync(itemDir, { recursive: false });
    const purpose = requiredText(input.purpose, "purpose");
    try {
      atomicBatchWrite([
        { path: path.join(itemDir, "ITEM.json"), content: stableJson(record) },
        { path: path.join(itemDir, "SPEC.md"), content: renderSpec(record, purpose) },
        { path: path.join(itemDir, "STATUS.md"), content: renderStatus(record, []) },
        {
          path: path.join(itemDir, "HISTORY.ndjson"),
          content: `${JSON.stringify(historyEntry("created", `Created in ${status}.`))}\n`,
        },
      ]);
    } catch (error) {
      try {
        fs.rmdirSync(itemDir);
      } catch {
        // Leave recoverable evidence if an unexpected file appeared concurrently.
      }
      throw error;
    }
    const refreshed = reload(tracker);
    regenerate(refreshed);
    const item = refreshed.items.find((candidate) => candidate.id === id);
    return {
      outcome: "created",
      item: publicItem(item, tracker.paths.repoRoot),
      text: `${id} added to ${status}: ${record.title}\nNext: ${record.next_step}`,
    };
  });
}

export function getStatus(tracker, options = {}) {
  const groups = {
    backlog: tracker.items.filter((item) => ["Backlog", "Ready"].includes(item.record.status)),
    active: tracker.items.filter((item) => ["In Progress", "In Review"].includes(item.record.status)),
    completed: tracker.items.filter((item) => item.record.status === "Done" && item.stage !== STAGES.archived),
    cancelled: tracker.items.filter((item) => item.record.status === "Cancelled"),
    archived: tracker.items.filter((item) => item.stage === STAGES.archived),
    blocked: tracker.items.filter((item) => effectiveBlockers(item, tracker.items).length > 0),
  };
  const next = chooseNext(tracker, { allowNone: true });
  const text = renderStatusList(groups, next, options.all, tracker.items);
  return {
    outcome: "ok",
    counts: Object.fromEntries(Object.entries(groups).map(([key, items]) => [key, items.length])),
    groups: Object.fromEntries(
      Object.entries(groups).map(([key, items]) => [
        key,
        items.map((item) => publicItem(item, tracker.paths.repoRoot)),
      ]),
    ),
    next: next ? publicRecommendation(next) : null,
    text,
  };
}

export function chooseNext(tracker, options = {}) {
  const candidates = tracker.items
    .filter((item) => ["Backlog", "Ready", "In Progress", "In Review"].includes(item.record.status))
    .map((item) => ({
      item,
      blockers: effectiveBlockers(item, tracker.items),
    }))
    .filter((candidate) => candidate.blockers.length === 0)
    .sort((a, b) => compareActionable(a.item, b.item));
  if (!candidates.length) {
    if (options.allowNone) return null;
    throw new WorkError("No actionable work item is available", "no_actionable_item");
  }
  const selected = candidates[0].item;
  const dependencyCount = selected.record.relationships.depends_on.length;
  let reason;
  if (selected.record.status === "In Progress") {
    reason = "Continue the highest-priority unblocked item already in progress.";
  } else if (selected.record.status === "In Review") {
    reason = "Finish review or landing for the highest-priority unblocked active item.";
  } else if (selected.record.status === "Ready") {
    reason = `Highest-priority Ready item with ${dependencyCount ? "all dependencies done" : "no dependencies"} and no blockers.`;
  } else {
    reason = `Highest-priority actionable backlog item with ${dependencyCount ? "all dependencies done" : "no dependencies"} and no blockers.`;
  }
  return { item: selected, reason };
}

export function nextItem(tracker) {
  const recommendation = chooseNext(tracker);
  return {
    outcome: "recommended",
    recommendation: publicRecommendation(recommendation),
    text: `${recommendation.item.id}: ${recommendation.item.record.title}\nWhy: ${recommendation.reason}\nNext: ${recommendation.item.record.next_step}`,
  };
}

export function startItem(tracker, id, input) {
  return withLock(tracker.paths.lockPath, () => {
    const item = requireItem(tracker, id);
    const branch = requiredText(input.branch, "branch");
    if (!input.allowSharedBranch) {
      const collision = tracker.items.find(
        (candidate) =>
          candidate.id !== item.id &&
          ["In Progress", "In Review"].includes(candidate.record.status) &&
          candidate.record.git.branch === branch,
      );
      if (collision) {
        throw new WorkError(
          `${branch} is already claimed by ${collision.id}. Use --allow-shared-branch only when the overlap is intentional.`,
          "branch_claimed",
        );
      }
    }
    const nextStep = requiredText(input.nextStep ?? item.record.next_step, "next step");
    const updated = structuredClone(item.record);
    updated.status = "In Progress";
    updated.next_step = nextStep;
    updated.git.branch = branch;
    updated.updated_at = isoDate();
    writeItemUpdate(tracker, item, updated, "started", `Started on branch ${branch}.`);
    return {
      outcome: "started",
      item: publicItem(requireItem(reload(tracker), id), tracker.paths.repoRoot),
      text: `${item.id} is In Progress on ${branch}.\nNext: ${nextStep}`,
    };
  });
}

export function updateItem(tracker, id, input) {
  return withLock(tracker.paths.lockPath, () => {
    const item = requireItem(tracker, id);
    const updated = structuredClone(item.record);
    const changes = [];
    if (input.status) {
      const requestedStatus = normalizeStatus(input.status);
      if (requestedStatus === "Done" && item.record.status !== "Done") {
        throw new WorkError(
          "Use work finish to mark an item Done so landing evidence is verified.",
          "finish_required",
        );
      }
      updated.status = requestedStatus;
      changes.push(`status changed to ${updated.status}`);
    }
    if (input.nextStep !== undefined) {
      updated.next_step = String(input.nextStep).trim();
      changes.push("next step updated");
    }
    if (input.branch !== undefined) {
      updated.git.branch = String(input.branch).trim() || null;
      changes.push("branch updated");
    }
    for (const reason of input.blockers ?? []) {
      const cleanReason = requiredText(reason, "blocker");
      updated.blockers.push({
        id: nextBlockerId(updated.blockers),
        reason: cleanReason,
        work_item_id: input.blockerItem ? normalizeId(input.blockerItem) : null,
        created_at: isoDate(),
      });
      changes.push(`blocker added: ${cleanReason}`);
    }
    if (input.clearBlocker !== undefined) {
      if (String(input.clearBlocker) === "all") {
        updated.blockers = [];
      } else {
        const blockerId = String(input.clearBlocker);
        const before = updated.blockers.length;
        updated.blockers = updated.blockers.filter((blocker) => blocker.id !== blockerId);
        if (updated.blockers.length === before) {
          throw new WorkError(`Blocker ${blockerId} does not exist on ${item.id}`, "missing_blocker");
        }
      }
      changes.push("blocker cleared");
    }
    if (!changes.length && !input.note) {
      throw new WorkError("No update was requested", "empty_update");
    }
    if (
      !input.allowSharedBranch &&
      ["In Progress", "In Review"].includes(updated.status) &&
      updated.git.branch
    ) {
      const collision = tracker.items.find(
        (candidate) =>
          candidate.id !== item.id &&
          ["In Progress", "In Review"].includes(candidate.record.status) &&
          candidate.record.git.branch === updated.git.branch,
      );
      if (collision) {
        throw new WorkError(
          `${updated.git.branch} is already claimed by ${collision.id}. Use --allow-shared-branch only when intentional.`,
          "branch_claimed",
        );
      }
    }
    if (!["Done", "Cancelled"].includes(updated.status) && !updated.next_step) {
      throw new WorkError("Active and backlog items require an exact next step", "missing_next_step");
    }
    updated.updated_at = isoDate();
    const note = input.note ? requiredText(input.note, "note") : changes.join("; ");
    writeItemUpdate(tracker, item, updated, "updated", note);
    const refreshed = requireItem(reload(tracker), id);
    return {
      outcome: "updated",
      item: publicItem(refreshed, tracker.paths.repoRoot),
      text: `${item.id} updated: ${note}\nNext: ${updated.next_step || "None"}`,
    };
  });
}

export function linkItems(tracker, sourceId, type, targetId) {
  return withLock(tracker.paths.lockPath, () => {
    const source = requireItem(tracker, sourceId);
    const target = requireItem(tracker, targetId);
    const relationship = normalizeEnum(type, RELATIONSHIPS, "relationship type");
    if (source.id === target.id) {
      throw new WorkError("A work item cannot relate to itself", "self_relationship");
    }
    if (relationship === "parent" && source.record.relationships.parent.length > 0) {
      throw new WorkError(`${source.id} already has a parent`, "multiple_parents");
    }
    const sourceRecord = structuredClone(source.record);
    const targetRecord = structuredClone(target.record);
    addUnique(sourceRecord.relationships[relationship], target.id);
    addUnique(targetRecord.relationships[INVERSES[relationship]], source.id);
    sourceRecord.updated_at = isoDate();
    targetRecord.updated_at = isoDate();

    const allRecords = tracker.items.map((item) =>
      item.id === source.id ? sourceRecord : item.id === target.id ? targetRecord : item.record,
    );
    const cycles = dependencyCycles(allRecords);
    if (cycles.length) {
      throw new WorkError(`Relationship would create a dependency cycle: ${cycles[0].join(" -> ")}`, "dependency_cycle");
    }
    const entries = [];
    for (const [item, record, event] of [
      [source, sourceRecord, `${relationship} ${target.id}`],
      [target, targetRecord, `${INVERSES[relationship]} ${source.id}`],
    ]) {
      const destination = destinationFor(item, record.status);
      if (destination !== item.path) {
        throw new WorkError("Linking cannot also move an item between stages", "unexpected_stage_change");
      }
      entries.push({ path: item.itemPath, content: stableJson(record) });
      entries.push({
        path: item.historyPath,
        content: appendHistoryContent(item, historyEntry("linked", event)),
      });
      entries.push({
        path: item.statusPath,
        content: renderStatus(record, recentHistory(item, historyEntry("linked", event)), readStatus(item)),
      });
    }
    atomicBatchWrite(entries);
    regenerate(reload(tracker));
    return {
      outcome: "linked",
      source: source.id,
      type: relationship,
      target: target.id,
      inverse: INVERSES[relationship],
      text: `Linked ${source.id} ${relationship} ${target.id}; inverse ${INVERSES[relationship]} recorded on ${target.id}.`,
    };
  });
}

export function unlinkItems(tracker, sourceId, type, targetId) {
  return withLock(tracker.paths.lockPath, () => {
    const source = requireItem(tracker, sourceId);
    const target = requireItem(tracker, targetId);
    const relationship = normalizeEnum(type, RELATIONSHIPS, "relationship type");
    const inverse = INVERSES[relationship];
    if (!source.record.relationships[relationship].includes(target.id)) {
      throw new WorkError(`${source.id} does not have ${relationship} ${target.id}`, "missing_relationship");
    }
    const sourceRecord = structuredClone(source.record);
    const targetRecord = structuredClone(target.record);
    sourceRecord.relationships[relationship] = sourceRecord.relationships[relationship].filter(
      (id) => id !== target.id,
    );
    targetRecord.relationships[inverse] = targetRecord.relationships[inverse].filter(
      (id) => id !== source.id,
    );
    sourceRecord.updated_at = isoDate();
    targetRecord.updated_at = isoDate();
    const entries = [];
    for (const [item, record, event] of [
      [source, sourceRecord, `removed ${relationship} ${target.id}`],
      [target, targetRecord, `removed ${inverse} ${source.id}`],
    ]) {
      const entry = historyEntry("unlinked", event);
      entries.push({ path: item.itemPath, content: stableJson(record) });
      entries.push({ path: item.historyPath, content: appendHistoryContent(item, entry) });
      entries.push({
        path: item.statusPath,
        content: renderStatus(record, recentHistory(item, entry), readStatus(item)),
      });
    }
    atomicBatchWrite(entries);
    regenerate(reload(tracker));
    return {
      outcome: "unlinked",
      source: source.id,
      type: relationship,
      target: target.id,
      text: `Removed ${source.id} ${relationship} ${target.id} and its inverse.`,
    };
  });
}

export function finishItem(tracker, id, input) {
  return withLock(tracker.paths.lockPath, () => {
    const item = requireItem(tracker, id);
    const commit = resolveCommit(tracker.paths.repoRoot, input.commit ?? "HEAD");
    const defaultRef = resolveDefaultRef(tracker.paths.repoRoot, tracker.config.default_branch);
    const landed = isAncestor(tracker.paths.repoRoot, commit, defaultRef);
    const updated = structuredClone(item.record);
    updated.git.completion_commit = commit;
    updated.git.pull_request = normalizePullRequest(input.pullRequest, updated.git.pull_request);
    updated.git.work_complete_at = isoDate();
    updated.updated_at = isoDate();
    let event;
    if (landed) {
      updated.status = "Done";
      updated.next_step = "";
      updated.git.landed_commit = commit;
      updated.git.landed_at = isoDate();
      updated.git.default_branch = tracker.config.default_branch;
      event = `Verified ${commit.slice(0, 12)} is in ${defaultRef}; marked Done.`;
    } else {
      updated.status = "In Review";
      updated.next_step =
        input.nextStep ??
        `Get commit ${commit.slice(0, 12)} reviewed and landed in ${tracker.config.default_branch}.`;
      updated.git.landed_commit = null;
      updated.git.landed_at = null;
      event = `Work recorded at ${commit.slice(0, 12)}, but it is not in ${defaultRef}; marked In Review.`;
    }
    writeItemUpdate(tracker, item, updated, "finish_checked", event);
    const refreshed = requireItem(reload(tracker), id);
    return {
      outcome: landed ? "landed" : "branch_complete",
      landed,
      default_ref: defaultRef,
      item: publicItem(refreshed, tracker.paths.repoRoot),
      text: landed
        ? `${id} is Done. Git verifies ${commit.slice(0, 12)} is in ${defaultRef}.`
        : `${id} appears complete on a branch, but ${commit.slice(0, 12)} is not in ${defaultRef}. It remains In Review.`,
    };
  });
}

export function archiveItem(tracker, id) {
  return withLock(tracker.paths.lockPath, () => {
    const item = requireItem(tracker, id);
    if (!["Done", "Cancelled"].includes(item.record.status)) {
      throw new WorkError("Only Done or Cancelled items can be archived", "not_archiveable");
    }
    const destination = path.join(tracker.paths.workRoot, STAGES.archived, item.folderName);
    if (destination === item.path) {
      return { outcome: "already_archived", text: `${item.id} is already archived.` };
    }
    if (fs.existsSync(destination)) {
      throw new WorkError(`Archive destination already exists: ${destination}`, "path_exists");
    }
    fs.renameSync(item.path, destination);
    const refreshed = reload(tracker);
    const archived = requireItem(refreshed, id);
    const updated = structuredClone(archived.record);
    updated.updated_at = isoDate();
    writeItemFiles(archived, updated, "archived", "Moved to the archived stage.");
    regenerate(reload(tracker));
    return { outcome: "archived", text: `${id} archived.` };
  });
}

export function landingStatus(tracker, id) {
  const item = requireItem(tracker, id);
  const commit = item.record.git.landed_commit ?? item.record.git.completion_commit;
  if (!commit) {
    return {
      outcome: "no_completion_commit",
      landed: false,
      item: publicItem(item, tracker.paths.repoRoot),
      text: `${item.id} has no completion commit recorded, so landing cannot be verified.`,
    };
  }
  if (!commitExists(tracker.paths.repoRoot, commit)) {
    return {
      outcome: "commit_unavailable",
      landed: false,
      item: publicItem(item, tracker.paths.repoRoot),
      text: `${item.id} records ${commit}, but that commit is not available in this clone. Fetch branches and retry.`,
    };
  }
  const ref = resolveDefaultRef(tracker.paths.repoRoot, tracker.config.default_branch, true);
  if (!ref) {
    return {
      outcome: "default_branch_unavailable",
      landed: false,
      item: publicItem(item, tracker.paths.repoRoot),
      text: `Cannot verify ${item.id} because ${tracker.config.default_branch} is not available locally or on origin.`,
    };
  }
  const landed = isAncestor(tracker.paths.repoRoot, commit, ref);
  return {
    outcome: landed ? "landed" : "not_landed",
    landed,
    commit,
    default_ref: ref,
    item: publicItem(item, tracker.paths.repoRoot),
    text: landed
      ? `${item.id} is in ${ref}; Git ancestry includes ${commit.slice(0, 12)}.`
      : `${item.id} is not in ${ref}; Git ancestry does not include ${commit.slice(0, 12)}.`,
  };
}

export function validateTracker(tracker) {
  const errors = [];
  const warnings = [];
  validateConfig(tracker.config, errors);
  const duplicateIds = duplicates(tracker.items.map((item) => item.id));
  for (const id of duplicateIds) errors.push(`Duplicate ID: ${id}`);
  const byId = new Map(tracker.items.map((item) => [item.id, item]));

  for (const item of tracker.items) {
    validateRecord(item, errors, warnings);
    const expectedStage = STATUS_STAGE[item.record.status];
    if (expectedStage && item.stage !== expectedStage) {
      const archiveException =
        item.stage === STAGES.archived && ["Done", "Cancelled"].includes(item.record.status);
      if (!archiveException) {
        errors.push(`${item.id}: status ${item.record.status} belongs in ${expectedStage}, not ${item.stage}`);
      }
    }
    for (const type of RELATIONSHIPS) {
      for (const targetId of item.record.relationships?.[type] ?? []) {
        if (targetId === item.id) errors.push(`${item.id}: ${type} cannot reference itself`);
        const target = byId.get(targetId);
        if (!target) {
          errors.push(`${item.id}: ${type} references missing ${targetId}`);
          continue;
        }
        if (!(target.record.relationships[INVERSES[type]] ?? []).includes(item.id)) {
          errors.push(`${item.id}: ${type} ${targetId} is missing inverse ${INVERSES[type]}`);
        }
      }
    }
    if ((item.record.relationships?.parent ?? []).length > 1) {
      errors.push(`${item.id}: a work item can have only one parent`);
    }
    for (const blocker of item.record.blockers ?? []) {
      if (blocker.work_item_id && !byId.has(blocker.work_item_id)) {
        errors.push(`${item.id}: blocker ${blocker.id} references missing ${blocker.work_item_id}`);
      }
    }
    validateCompletionEvidence(tracker, item, errors, warnings);
  }
  for (const cycle of dependencyCycles(tracker.items.map((item) => item.record))) {
    errors.push(`Dependency cycle: ${cycle.join(" -> ")}`);
  }
  const branches = new Map();
  for (const item of tracker.items.filter((candidate) =>
    ["In Progress", "In Review"].includes(candidate.record.status),
  )) {
    const branch = item.record.git.branch;
    if (!branch) continue;
    const owners = branches.get(branch) ?? [];
    owners.push(item.id);
    branches.set(branch, owners);
  }
  for (const [branch, owners] of branches) {
    if (owners.length > 1) errors.push(`Active branch ${branch} is claimed by ${owners.join(", ")}`);
  }
  return {
    outcome: errors.length ? "invalid" : "valid",
    valid: errors.length === 0,
    errors,
    warnings,
    item_count: tracker.items.length,
    text: errors.length
      ? `Tracker invalid: ${errors.length} error(s), ${warnings.length} warning(s).\n${errors.map((error) => `- ${error}`).join("\n")}`
      : `Tracker valid: ${tracker.items.length} item(s), ${warnings.length} warning(s).${warnings.length ? `\n${warnings.map((warning) => `- ${warning}`).join("\n")}` : ""}`,
  };
}

export function reconcileTracker(tracker) {
  const validation = validateTracker(tracker);
  const findings = validation.errors.map((message) => ({
    severity: "error",
    code: "validation",
    message,
    repair: "Correct the canonical record, then run work validate.",
  }));
  for (const warning of validation.warnings) {
    findings.push({
      severity: "warning",
      code: "validation_warning",
      message: warning,
      repair: "Review the evidence before changing the ticket.",
    });
  }
  const branches = listBranches(tracker.paths.repoRoot);
  for (const item of tracker.items) {
    const branch = item.record.git.branch;
    if (branch && !branches.has(branch) && !branches.has(`origin/${branch}`)) {
      findings.push({
        severity: "warning",
        code: "missing_branch",
        item: item.id,
        message: `${item.id} records branch ${branch}, but Git cannot find it locally or on origin.`,
        repair: "Confirm the branch name or clear the stale branch after owner review.",
      });
    }
    if (["In Progress", "In Review"].includes(item.record.status)) {
      const commit = item.record.git.completion_commit;
      if (commit && commitExists(tracker.paths.repoRoot, commit)) {
        const ref = resolveDefaultRef(tracker.paths.repoRoot, tracker.config.default_branch, true);
        if (ref && isAncestor(tracker.paths.repoRoot, commit, ref)) {
          findings.push({
            severity: "warning",
            code: "merged_but_active",
            item: item.id,
            message: `${item.id} is ${item.record.status}, but ${commit.slice(0, 12)} is already in ${ref}.`,
            repair: `Run work finish ${item.id} --commit ${commit}.`,
          });
        }
      }
    }
  }
  const expectedDashboard = renderDashboard(tracker.items);
  if (!fs.existsSync(tracker.paths.dashboardPath) || fs.readFileSync(tracker.paths.dashboardPath, "utf8") !== expectedDashboard) {
    findings.push({
      severity: "warning",
      code: "stale_dashboard",
      message: "DASHBOARD.md is missing or stale.",
      repair: "Run work dashboard.",
    });
  }
  const expectedBacklog = renderBacklog(tracker.items, tracker.paths);
  if (!fs.existsSync(tracker.paths.backlogPath) || fs.readFileSync(tracker.paths.backlogPath, "utf8") !== expectedBacklog) {
    findings.push({
      severity: "warning",
      code: "stale_backlog",
      message: "BACKLOG.md is missing or stale.",
      repair: "Run work dashboard.",
    });
  }
  return {
    outcome: findings.length ? "findings" : "clean",
    findings,
    text: findings.length
      ? `Reconciliation found ${findings.length} issue(s):\n${findings.map((finding) => `- ${finding.message} Repair: ${finding.repair}`).join("\n")}`
      : "Tracker records, Git evidence, relationships, and generated files are consistent.",
  };
}

export function regenerate(tracker) {
  const dashboard = renderDashboard(tracker.items);
  const backlog = renderBacklog(tracker.items, tracker.paths);
  atomicBatchWrite([
    { path: tracker.paths.dashboardPath, content: dashboard },
    { path: tracker.paths.backlogPath, content: backlog },
  ]);
  return {
    dashboard: toPosix(path.relative(tracker.paths.repoRoot, tracker.paths.dashboardPath)),
    backlog: toPosix(path.relative(tracker.paths.repoRoot, tracker.paths.backlogPath)),
  };
}

export function scanItems(paths) {
  const items = [];
  for (const candidate of scanItemFolders(paths)) {
    if (!fs.existsSync(candidate.itemPath)) {
      items.push({
        ...candidate,
        record: invalidPlaceholder(candidate),
        missingRecord: true,
        historyPath: path.join(candidate.path, "HISTORY.ndjson"),
        statusPath: path.join(candidate.path, "STATUS.md"),
        specPath: path.join(candidate.path, "SPEC.md"),
      });
      continue;
    }
    const record = readJson(candidate.itemPath, `${candidate.id} ITEM.json`);
    items.push({
      ...candidate,
      folderId: candidate.id,
      id: record.id ?? candidate.id,
      record,
      historyPath: path.join(candidate.path, "HISTORY.ndjson"),
      statusPath: path.join(candidate.path, "STATUS.md"),
      specPath: path.join(candidate.path, "SPEC.md"),
    });
  }
  return items.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

function scanItemFolders(paths) {
  const candidates = [];
  if (!fs.existsSync(paths.workRoot)) return candidates;
  for (const stage of Object.values(STAGES)) {
    const stagePath = path.join(paths.workRoot, stage);
    if (!fs.existsSync(stagePath)) continue;
    for (const entry of fs.readdirSync(stagePath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const match = entry.name.match(/^([A-Za-z][A-Za-z0-9]*-\d+)(?:-|$)/);
      if (!match) continue;
      const itemDir = path.join(stagePath, entry.name);
      candidates.push({
        id: match[1].toUpperCase(),
        stage,
        folderName: entry.name,
        path: itemDir,
        itemPath: path.join(itemDir, "ITEM.json"),
      });
    }
  }
  return candidates;
}

function newRecord({ id, title, type, priority, status, nextStep, createdAt }) {
  return {
    schema_version: 1,
    id,
    title,
    type,
    priority,
    created_at: createdAt,
    updated_at: createdAt,
    status,
    next_step: nextStep,
    blockers: [],
    relationships: Object.fromEntries(RELATIONSHIPS.map((typeName) => [typeName, []])),
    git: {
      branch: null,
      pull_request: null,
      completion_commit: null,
      work_complete_at: null,
      landed_commit: null,
      landed_at: null,
      default_branch: null,
    },
    github: {
      issue_number: null,
      issue_url: null,
      project_item_id: null,
      last_synced_at: null,
    },
  };
}

function invalidPlaceholder(candidate) {
  return {
    ...newRecord({
      id: candidate.id,
      title: titleFromFolder(candidate.folderName),
      type: "task",
      priority: "medium",
      status: statusFromStage(candidate.stage),
      nextStep: "",
      createdAt: isoDate(),
    }),
    _invalid_missing_record: true,
  };
}

function statusFromStage(stage) {
  if (stage === STAGES.active) return "In Progress";
  if (stage === STAGES.completed) return "Done";
  if (stage === STAGES.archived) return "Cancelled";
  return "Backlog";
}

function titleFromFolder(folderName) {
  return folderName
    .replace(/^[A-Za-z][A-Za-z0-9]*-\d+-?/, "")
    .split("-")
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join(" ") || folderName;
}

function allocateId(config, items) {
  const prefix = String(config.id_prefix ?? "WI").toUpperCase();
  const width = Number(config.id_width ?? 3);
  const max = items.reduce((current, item) => {
    const match = item.id.match(new RegExp(`^${escapeRegex(prefix)}-(\\d+)$`));
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(width, "0")}`;
}

function normalizeId(id) {
  const normalized = String(id).trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9]*-\d+$/.test(normalized)) {
    throw new WorkError(`Invalid work-item ID: ${id}`, "invalid_id");
  }
  return normalized;
}

function normalizeStatus(status) {
  const normalized = String(status).trim().toLowerCase().replace(/[_-]+/g, " ");
  const found = STATUSES.find((candidate) => candidate.toLowerCase() === normalized);
  if (!found) {
    throw new WorkError(`Invalid status "${status}". Use ${STATUSES.join(", ")}.`, "invalid_status");
  }
  return found;
}

function normalizeEnum(value, allowed, label) {
  const normalized = String(value).trim().toLowerCase().replace(/\s+/g, "_");
  if (!allowed.includes(normalized)) {
    throw new WorkError(`Invalid ${label} "${value}". Use ${allowed.join(", ")}.`, `invalid_${label.replace(/\s+/g, "_")}`);
  }
  return normalized;
}

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new WorkError(`Missing required ${label}`, `missing_${label.replace(/\s+/g, "_")}`);
  return text;
}

function requireItem(tracker, id) {
  const normalized = normalizeId(id);
  const matches = tracker.items.filter((item) => item.id === normalized);
  if (matches.length === 0) throw new WorkError(`Work item ${normalized} does not exist`, "missing_item");
  if (matches.length > 1) throw new WorkError(`Work item ${normalized} is duplicated`, "duplicate_id");
  if (matches[0].missingRecord) {
    throw new WorkError(`${normalized} is missing ITEM.json. Run work init to adopt it.`, "missing_record");
  }
  return matches[0];
}

function reload(tracker) {
  return loadTracker(
    tracker.paths.repoRoot,
    path.relative(tracker.paths.repoRoot, tracker.paths.workRoot),
  );
}

function renderSpec(record, purpose) {
  return `# ${record.id}: ${record.title}

## Purpose

${purpose}

## Requirements and decisions

Add approved requirements, decisions, constraints, and useful links here. Keep
the goal current when the work changes direction.
`;
}

function renderStatus(record, history, existing = "") {
  const blockers = record.blockers.length
    ? record.blockers.map((blocker) => `- ${blocker.id}: ${blocker.reason}${blocker.work_item_id ? ` (${blocker.work_item_id})` : ""}`).join("\n")
    : "- None";
  const relations = RELATIONSHIPS.flatMap((type) =>
    record.relationships[type].length ? [`- ${type}: ${record.relationships[type].join(", ")}`] : [],
  );
  const gitLines = [
    `- Branch: ${record.git.branch ?? "Not recorded"}`,
    `- Pull request: ${formatPr(record.git.pull_request)}`,
    `- Completion commit: ${record.git.completion_commit ?? "Not recorded"}`,
    `- Landed commit: ${record.git.landed_commit ?? "Not verified"}`,
    `- Default branch: ${record.git.default_branch ?? "Not verified"}`,
  ];
  const historyLines = history
    .slice(-12)
    .reverse()
    .map((entry) => `- ${entry.at}: **${entry.action}**. ${entry.note}`)
    .join("\n") || "- No history yet.";
  const userNotes = extractUserNotes(existing);
  return `# ${record.id}: ${record.title}

<!-- work-tracker:current:start -->
## Current handoff

- Status: ${record.status}
- Priority: ${record.priority}
- Type: ${record.type}
- Exact next step: ${record.next_step || "None"}
- Updated: ${record.updated_at}

### Blockers

${blockers}

### Relationships

${relations.length ? relations.join("\n") : "- None"}

### Git and landing evidence

${gitLines.join("\n")}
<!-- work-tracker:current:end -->

## Recent dated history

${historyLines}

The complete machine-readable history is in \`HISTORY.ndjson\`.

<!-- work-tracker:user-notes:start -->
## User notes

${userNotes || "Add free-form notes here. Tracker commands preserve this section."}
<!-- work-tracker:user-notes:end -->
`;
}

function extractUserNotes(existing) {
  if (!existing) return "";
  const marked = existing.match(
    /<!-- work-tracker:user-notes:start -->\s*## User notes\s*([\s\S]*?)<!-- work-tracker:user-notes:end -->/,
  );
  if (marked) return marked[1].trim();
  if (existing.includes("<!-- work-tracker:current:start -->")) return "";
  return `### Preserved pre-tracker STATUS.md\n\n${existing.trim()}`;
}

function historyEntry(action, note) {
  return { at: isoTimestamp(), action, note };
}

function readHistory(item) {
  if (!fs.existsSync(item.historyPath)) return [];
  const lines = fs.readFileSync(item.historyPath, "utf8").split(/\r?\n/).filter(Boolean);
  return lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new WorkError(`${item.id} HISTORY.ndjson line ${index + 1} is invalid JSON: ${error.message}`, "invalid_history");
    }
  });
}

function appendHistoryContent(item, entry) {
  const existing = fs.existsSync(item.historyPath) ? fs.readFileSync(item.historyPath, "utf8") : "";
  return `${existing}${JSON.stringify(entry)}\n`;
}

function recentHistory(item, extra) {
  return [...readHistory(item), ...(extra ? [extra] : [])];
}

function readStatus(item) {
  return fs.existsSync(item.statusPath) ? fs.readFileSync(item.statusPath, "utf8") : "";
}

function writeItemUpdate(tracker, item, record, action, note) {
  const destination = destinationFor(item, record.status);
  if (destination !== item.path) {
    if (fs.existsSync(destination)) {
      throw new WorkError(`Destination already exists: ${destination}`, "path_exists");
    }
    const originals = [
      { path: item.itemPath, content: fs.readFileSync(item.itemPath, "utf8") },
      {
        path: item.historyPath,
        content: fs.existsSync(item.historyPath) ? fs.readFileSync(item.historyPath, "utf8") : "",
      },
      {
        path: item.statusPath,
        content: fs.existsSync(item.statusPath) ? fs.readFileSync(item.statusPath, "utf8") : "",
      },
    ];
    writeItemFiles(item, record, action, note);
    try {
      fs.renameSync(item.path, destination);
    } catch (error) {
      atomicBatchWrite(originals);
      throw error;
    }
  } else {
    writeItemFiles(item, record, action, note);
  }
  regenerate(reload(tracker));
}

function writeItemFiles(item, record, action, note) {
  const entry = historyEntry(action, note);
  atomicBatchWrite([
    { path: item.itemPath, content: stableJson(record) },
    { path: item.historyPath, content: appendHistoryContent(item, entry) },
    { path: item.statusPath, content: renderStatus(record, recentHistory(item, entry), readStatus(item)) },
  ]);
}

function destinationFor(item, status) {
  return path.join(path.dirname(path.dirname(item.path)), STATUS_STAGE[status], item.folderName);
}

function formatPr(pr) {
  if (!pr) return "Not recorded";
  if (typeof pr === "string" || typeof pr === "number") return String(pr);
  return pr.url ?? (pr.number ? `#${pr.number}` : "Not recorded");
}

function normalizePullRequest(value, existing) {
  if (value === undefined || value === null || value === "") return existing ?? null;
  const text = String(value).trim();
  if (/^\d+$/.test(text)) return { number: Number(text), url: null, merged_at: null };
  try {
    const url = new URL(text);
    const match = url.pathname.match(/\/pull\/(\d+)$/);
    return { number: match ? Number(match[1]) : null, url: text, merged_at: null };
  } catch {
    throw new WorkError(`Invalid pull request value: ${value}`, "invalid_pull_request");
  }
}

function nextBlockerId(blockers) {
  const max = blockers.reduce((value, blocker) => {
    const match = String(blocker.id).match(/^B-(\d+)$/);
    return match ? Math.max(value, Number(match[1])) : value;
  }, 0);
  return `B-${String(max + 1).padStart(3, "0")}`;
}

function addUnique(array, value) {
  if (!array.includes(value)) array.push(value);
  array.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function compareActionable(a, b) {
  return (
    STATUS_SCORE[a.record.status] - STATUS_SCORE[b.record.status] ||
    PRIORITY_SCORE[a.record.priority] - PRIORITY_SCORE[b.record.priority] ||
    a.record.created_at.localeCompare(b.record.created_at) ||
    a.id.localeCompare(b.id, undefined, { numeric: true })
  );
}

function effectiveBlockers(item, items) {
  const byId = new Map(items.map((candidate) => [candidate.id, candidate]));
  const blockers = item.record.blockers.map((blocker) => blocker.reason);
  for (const dependencyId of item.record.relationships.depends_on) {
    const dependency = byId.get(dependencyId);
    if (!dependency) blockers.push(`Missing dependency ${dependencyId}`);
    else if (dependency.record.status !== "Done") {
      blockers.push(`Depends on ${dependencyId} (${dependency.record.status})`);
    }
  }
  return blockers;
}

function publicItem(item, repoRoot) {
  return {
    id: item.id,
    title: item.record.title,
    status: item.record.status,
    priority: item.record.priority,
    type: item.record.type,
    next_step: item.record.next_step,
    blockers: item.record.blockers,
    relationships: item.record.relationships,
    branch: item.record.git.branch,
    pull_request: item.record.git.pull_request,
    completion_commit: item.record.git.completion_commit,
    landed_commit: item.record.git.landed_commit,
    landed_at: item.record.git.landed_at,
    github: item.record.github,
    path: toPosix(path.relative(repoRoot, item.path)),
  };
}

function publicRecommendation(recommendation) {
  return {
    id: recommendation.item.id,
    title: recommendation.item.record.title,
    status: recommendation.item.record.status,
    priority: recommendation.item.record.priority,
    next_step: recommendation.item.record.next_step,
    reason: recommendation.reason,
  };
}

function renderStatusList(groups, next, all, allItems) {
  const lines = [];
  if (groups.active.length) {
    lines.push("Active:");
    for (const item of groups.active) {
      lines.push(`- ${item.id} [${item.record.status}] ${item.record.title}; next: ${item.record.next_step}; ${gitSummary(item.record)}`);
    }
  } else {
    lines.push("Active: none");
  }
  if (groups.blocked.length) {
    lines.push("Blocked:");
    for (const item of groups.blocked) {
      lines.push(`- ${item.id}: ${effectiveBlockers(item, allItems).join("; ")}`);
    }
  }
  lines.push(
    next
      ? `Next: ${next.item.id} (${next.reason})`
      : "Next: no actionable item",
  );
  lines.push(
    `Counts: backlog ${groups.backlog.length}, active ${groups.active.length}, completed ${groups.completed.length}, archived ${groups.archived.length}.`,
  );
  if (all) {
    for (const [label, items] of [
      ["Backlog", groups.backlog],
      ["Completed", groups.completed],
      ["Archived", groups.archived],
    ]) {
      lines.push(`${label}:`);
      for (const item of items) lines.push(`- ${item.id} [${item.record.status}] ${item.record.title}; ${gitSummary(item.record)}`);
      if (!items.length) lines.push("- None");
    }
  }
  return lines.join("\n");
}

function gitSummary(record) {
  const values = [];
  if (record.git.branch) values.push(`branch ${record.git.branch}`);
  if (record.git.pull_request) values.push(`PR ${formatPr(record.git.pull_request)}`);
  if (record.git.landed_commit) values.push(`landed ${record.git.landed_commit.slice(0, 12)}`);
  else if (record.git.completion_commit) values.push(`complete ${record.git.completion_commit.slice(0, 12)}, not verified landed`);
  return values.length ? values.join(", ") : "Git evidence not recorded";
}

function renderDashboard(items) {
  const actionable = items
    .filter((item) => ["Backlog", "Ready", "In Progress", "In Review"].includes(item.record.status))
    .map((item) => ({ item, blockers: effectiveBlockers(item, items) }));
  const active = actionable.filter((candidate) =>
    ["In Progress", "In Review"].includes(candidate.item.record.status),
  );
  const candidates = actionable
    .filter((candidate) => candidate.blockers.length === 0)
    .sort((a, b) => compareActionable(a.item, b.item))
    .slice(0, 10);
  const blocked = actionable.filter((candidate) => candidate.blockers.length > 0);
  const completed = items
    .filter((item) => item.record.status === "Done")
    .sort((a, b) => b.record.updated_at.localeCompare(a.record.updated_at) || b.id.localeCompare(a.id))
    .slice(0, 10);
  return `# Work tracker dashboard

> Generated from each work item's \`ITEM.json\`. Rebuild with \`work dashboard\`.
> Do not edit this file as a source of truth.

## Active work

${dashboardRows(active)}

## Next candidates

${dashboardRows(candidates)}

## Blocked work

${dashboardRows(blocked, true)}

## Review and landing

${dashboardRows(active.filter((candidate) => candidate.item.record.status === "In Review"))}

## Recently completed

${dashboardRows(completed.map((item) => ({ item, blockers: [] })))}
`;
}

function dashboardRows(candidates, showBlockers = false) {
  if (!candidates.length) return "_None._";
  const header = `| ID | Status | Priority | Type | ${showBlockers ? "Blocked by" : "Next step"} | Git / PR |\n|---|---|---|---|---|---|`;
  const rows = candidates.map(({ item, blockers }) => {
    const record = item.record;
    const detail = showBlockers ? blockers.join("; ") : record.next_step || "None";
    const gitInfo = [record.git.branch, formatPr(record.git.pull_request)]
      .filter((value) => value && value !== "Not recorded")
      .join(" / ") || "Not recorded";
    return `| ${item.id} | ${record.status} | ${record.priority} | ${record.type} | ${escapeCell(detail)} | ${escapeCell(gitInfo)} |`;
  });
  return [header, ...rows].join("\n");
}

function renderBacklog(items, paths) {
  const sorted = [...items].sort(
    (a, b) =>
      PRIORITY_SCORE[a.record.priority] - PRIORITY_SCORE[b.record.priority] ||
      a.id.localeCompare(b.id, undefined, { numeric: true }),
  );
  const lines = sorted.map((item) => {
    const marker =
      item.record.status === "Done"
        ? "[x]"
        : item.record.status === "Cancelled"
          ? "[-]"
          : ["In Progress", "In Review"].includes(item.record.status)
            ? "[~]"
            : "[ ]";
    const relative = toPosix(path.relative(path.dirname(paths.backlogPath), item.path));
    return `- ${marker} [${item.id}: ${item.record.title}](${relative}/STATUS.md) | ${item.record.status} | ${item.record.priority} | ${item.record.type}`;
  });
  return `# Backlog: generated work-item index

> Generated from canonical \`ITEM.json\` records. Rebuild with \`work dashboard\`.
> Do not edit this file as a source of truth.

Status key: \`[ ]\` backlog/ready, \`[~]\` active/review, \`[x]\` done,
\`[-]\` cancelled.

## Items

${lines.length ? lines.join("\n") : "_None yet._"}
`;
}

function workItemsReadme() {
  return `# Work items

This folder is managed by the work-tracker plugin.

- Each item has one folder containing \`ITEM.json\`, \`SPEC.md\`, \`STATUS.md\`,
  and \`HISTORY.ndjson\`.
- \`ITEM.json\` owns structured status, relationships, blockers, and Git evidence.
- \`SPEC.md\` and the user-notes section of \`STATUS.md\` remain user-authored.
- \`DASHBOARD.md\` and \`01-backlog/BACKLOG.md\` are generated and rebuildable.
- Existing notes are preserved when an older manual folder is adopted.

Run \`work status\` for a concise orientation or \`work validate\` for CI.
`;
}

function validateConfig(config, errors) {
  if (config.schema_version !== 1) errors.push("Tracker configuration schema_version must be 1");
  if (!/^[A-Z][A-Z0-9]*$/.test(String(config.id_prefix ?? ""))) {
    errors.push("Tracker id_prefix must contain uppercase letters and digits");
  }
  if (!Number.isInteger(config.id_width) || config.id_width < 1 || config.id_width > 12) {
    errors.push("Tracker id_width must be an integer from 1 to 12");
  }
  if (typeof config.default_branch !== "string" || !config.default_branch.trim()) {
    errors.push("Tracker default_branch is required");
  }
  if (config.github !== null && config.github !== undefined) {
    if (config.github.authority !== "git") errors.push("GitHub adapter authority must be git");
    if (!/^[^/]+\/[^/]+$/.test(String(config.github.repository ?? ""))) {
      errors.push("GitHub adapter repository must be owner/name");
    }
    if (!Number.isInteger(config.github.project_number) || config.github.project_number < 1) {
      errors.push("GitHub adapter project_number must be a positive integer");
    }
    if (!config.github.project_id || !config.github.status_field_id) {
      errors.push("GitHub adapter project_id and status_field_id are required");
    }
    for (const status of STATUSES) {
      if (!config.github.status_options?.[status]) {
        errors.push(`GitHub adapter is missing status option ${status}`);
      }
    }
  }
}

function validateRecord(item, errors, warnings) {
  const record = item.record;
  if (item.missingRecord || record._invalid_missing_record) {
    errors.push(`${item.id}: ITEM.json is missing`);
    return;
  }
  if (record.schema_version !== 1) errors.push(`${item.id}: schema_version must be 1`);
  if (record.id !== item.folderId) {
    errors.push(`${item.id}: record id ${record.id} does not match folder id ${item.folderId}`);
  }
  if (typeof record.title !== "string" || !record.title.trim()) errors.push(`${item.id}: title is required`);
  if (!TYPES.includes(record.type)) errors.push(`${item.id}: invalid type ${record.type}`);
  if (!PRIORITIES.includes(record.priority)) errors.push(`${item.id}: invalid priority ${record.priority}`);
  if (!STATUSES.includes(record.status)) errors.push(`${item.id}: invalid status ${record.status}`);
  if (!isIsoDate(record.created_at)) errors.push(`${item.id}: malformed created_at ${record.created_at}`);
  if (!isIsoDate(record.updated_at)) errors.push(`${item.id}: malformed updated_at ${record.updated_at}`);
  if (!["Done", "Cancelled"].includes(record.status) && !(record.next_step ?? "").trim()) {
    errors.push(`${item.id}: exact next_step is required while ${record.status}`);
  }
  if (!Array.isArray(record.blockers)) errors.push(`${item.id}: blockers must be an array`);
  if (!record.relationships || typeof record.relationships !== "object") {
    errors.push(`${item.id}: relationships object is required`);
  } else {
    for (const type of RELATIONSHIPS) {
      if (!Array.isArray(record.relationships[type])) errors.push(`${item.id}: relationships.${type} must be an array`);
      else if (new Set(record.relationships[type]).size !== record.relationships[type].length) {
        errors.push(`${item.id}: relationships.${type} contains duplicates`);
      }
    }
  }
  if (!fs.existsSync(item.specPath)) errors.push(`${item.id}: SPEC.md is missing`);
  if (!fs.existsSync(item.statusPath)) errors.push(`${item.id}: STATUS.md is missing`);
  if (!fs.existsSync(item.historyPath)) warnings.push(`${item.id}: HISTORY.ndjson is missing`);
  else {
    try {
      for (const entry of readHistory(item)) {
        if (typeof entry.at !== "string" || Number.isNaN(new Date(entry.at).valueOf())) {
          errors.push(`${item.id}: history entry has malformed date ${entry.at}`);
        }
        if (typeof entry.action !== "string" || typeof entry.note !== "string") {
          errors.push(`${item.id}: history entries require action and note strings`);
        }
      }
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (record.migration?.needs_review) warnings.push(`${item.id}: adopted metadata still needs owner review`);
}

function validateCompletionEvidence(tracker, item, errors, warnings) {
  const record = item.record;
  if (record.status !== "Done") return;
  if (!record.git.landed_commit || !record.git.landed_at || !record.git.default_branch) {
    errors.push(`${item.id}: Done requires landed_commit, landed_at, and default_branch`);
    return;
  }
  if (!isIsoDate(record.git.landed_at)) errors.push(`${item.id}: malformed landed_at ${record.git.landed_at}`);
  if (!commitExists(tracker.paths.repoRoot, record.git.landed_commit)) {
    warnings.push(`${item.id}: landed commit ${record.git.landed_commit} is not available in this clone`);
    return;
  }
  const ref = resolveDefaultRef(tracker.paths.repoRoot, record.git.default_branch, true);
  if (!ref) {
    warnings.push(`${item.id}: default branch ${record.git.default_branch} is not available in this clone`);
    return;
  }
  if (!isAncestor(tracker.paths.repoRoot, record.git.landed_commit, ref)) {
    errors.push(`${item.id}: false completion evidence; ${record.git.landed_commit.slice(0, 12)} is not in ${ref}`);
  }
}

function dependencyCycles(records) {
  const graph = new Map(records.map((record) => [record.id, record.relationships?.depends_on ?? []]));
  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  const cycles = [];
  function visit(id) {
    if (visiting.has(id)) {
      const index = stack.indexOf(id);
      cycles.push([...stack.slice(index), id]);
      return;
    }
    if (visited.has(id) || !graph.has(id)) return;
    visiting.add(id);
    stack.push(id);
    for (const target of graph.get(id)) visit(target);
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of graph.keys()) visit(id);
  return cycles;
}

function duplicates(values) {
  const seen = new Set();
  const duplicatesFound = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicatesFound.add(value);
    seen.add(value);
  }
  return [...duplicatesFound].sort();
}

function resolveCommit(repoRoot, ref) {
  const result = git(repoRoot, ["rev-parse", "--verify", `${ref}^{commit}`], { allowFailure: true });
  if (result.status !== 0) throw new WorkError(`Git commit or ref not found: ${ref}`, "missing_commit");
  return result.stdout.trim();
}

function resolveDefaultRef(repoRoot, branch, allowMissing = false) {
  for (const ref of [`refs/remotes/origin/${branch}`, `refs/heads/${branch}`]) {
    if (git(repoRoot, ["show-ref", "--verify", "--quiet", ref], { allowFailure: true }).status === 0) {
      return ref;
    }
  }
  if (allowMissing) return null;
  throw new WorkError(
    `Cannot verify landing because ${branch} is not available locally or as origin/${branch}. Fetch it and retry.`,
    "missing_default_branch",
  );
}

function isAncestor(repoRoot, commit, ref) {
  return git(repoRoot, ["merge-base", "--is-ancestor", commit, ref], { allowFailure: true }).status === 0;
}

function commitExists(repoRoot, commit) {
  return git(repoRoot, ["cat-file", "-e", `${commit}^{commit}`], { allowFailure: true }).status === 0;
}

function listBranches(repoRoot) {
  const result = git(repoRoot, [
    "for-each-ref",
    "--format=%(refname:short)",
    "refs/heads",
    "refs/remotes/origin",
  ]);
  return new Set(result.stdout.split(/\r?\n/).filter(Boolean));
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

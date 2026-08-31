import fs from "node:fs";
import path from "node:path";
import {
  WorkError,
  atomicBatchWrite,
  atomicWrite,
  atomicWriteYaml,
  git,
  isoDate,
  isoTimestamp,
  isIsoDate,
  parseYaml,
  readJson,
  readYaml,
  slugify,
  stableYaml,
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

const REQUIREMENTS_STATUSES = ["refining", "finalized"];
const REQUIRED_REQUIREMENTS_SECTIONS = [
  "Goal",
  "Why",
  "What has to be true for this to count as finished",
  "What the person using it experiences",
  "How it behaves from the outside",
  "Edge cases",
];
const LEGACY_STAGES = ["01-backlog", "02-in-progress", "03-completed", "04-archived"];
const ARCHIVE_FOLDER = "archive";
// Only a stop for a runaway walk, far past any nesting the owner would create by
// hand. It is not a limit on how they may group their work.
const FOLDER_MAX_DEPTH = 10;
const ITEM_FOLDER_PATTERN = /^([A-Za-z][A-Za-z0-9]*-\d+)(?:-|$)/;
const ITEM_FILE_NAMES = [
  "ITEM.yaml",
  "ITEM.json",
  "REQUIREMENTS.md",
  "SPEC.md",
  "STATUS.md",
  "HISTORY.ndjson",
];
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
  if (requestedPath && normalizeRelativePath(requestedPath) !== ".work-items") {
    throw new WorkError(
      "Local work items always live in .work-items at the repository root.",
      "invalid_path",
    );
  }
  const sharedRoot = primaryWorktreeRoot(repoRoot);
  const workRoot = path.join(sharedRoot, ".work-items");
  return {
    repoRoot,
    sharedRoot,
    workRoot,
    archiveRoot: path.join(workRoot, ARCHIVE_FOLDER),
    configPath: path.join(workRoot, ".work-tracker.yaml"),
    dashboardPath: path.join(workRoot, "DASHBOARD.md"),
    readmePath: path.join(workRoot, "README.md"),
    lockPath: path.join(workRoot, ".work-tracker.lock"),
    gitignorePath: path.join(repoRoot, ".gitignore"),
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
      "Work tracker is not initialized. Run work init.",
      "not_initialized",
    );
  }
  const config = readYaml(paths.configPath, "tracker configuration");
  const items = scanItems(paths);
  return { paths, config, items };
}

export function initialize(repoRoot, options = {}) {
  const paths = trackerPaths(repoRoot, options.path);
  const directCandidates = scanItemFolders(paths);
  const legacy = legacyTrackerRoots(repoRoot);
  if (!fs.existsSync(paths.configPath) && legacy.length && directCandidates.length === 0) {
    throw new WorkError(
      `An older local tracker exists at ${legacy.map((entry) => entry.relative).join(", ")}. Run work migrate --from ${legacy[0].relative} to review the conversion, then add --apply after approval.`,
      "legacy_tracker_found",
      { legacy_paths: legacy.map((entry) => entry.relative) },
    );
  }

  ensureGitignore(paths);
  return withLock(paths.lockPath, () => {
    const createdConfig = ensureTrackerShell(paths, {
      defaultBranch: options.defaultBranch ?? defaultBranch(repoRoot),
    });
    const candidates = scanItemFolders(paths);
    const duplicateIds = duplicates(candidates.map((candidate) => candidate.id));
    if (duplicateIds.length) {
      throw new WorkError(
        `Cannot adopt existing folders because IDs are duplicated: ${duplicateIds.join(", ")}`,
        "duplicate_ids",
      );
    }

    const adopted = [];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate.itemPath)) continue;
      const title = titleFromFolder(candidate.folderName);
      const record = newRecord({
        id: candidate.id,
        title,
        description: title,
        type: "task",
        priority: "medium",
        status: "Backlog",
        nextStep: "Refine and finalize REQUIREMENTS.md with the owner.",
        createdDate: isoDate(),
      });
      record.migration = {
        source: toPosix(path.relative(repoRoot, candidate.path)),
        migrated_date: isoDate(),
      };
      const entry = historyEntry(
        "adopted",
        "Existing flat work-item folder adopted without overwriting its files.",
      );
      const writes = [
        { path: candidate.itemPath, content: stableYaml(record) },
        { path: candidate.historyPath, content: appendHistoryContent(candidate, entry) },
      ];
      if (!fs.existsSync(candidate.requirementsPath)) {
        writes.push({
          path: candidate.requirementsPath,
          content: renderRequirements(record, "_Not recorded. Interview the owner before finalizing._"),
        });
      }
      if (!fs.existsSync(candidate.statusPath)) {
        writes.push({ path: candidate.statusPath, content: renderStatus(record, [entry]) });
      }
      atomicBatchWrite(writes);
      adopted.push(candidate.id);
    }

    const tracker = loadTracker(repoRoot);
    const generated = regenerate(tracker);
    return {
      outcome: "initialized",
      path: ".work-items",
      gitignored: true,
      config_created: createdConfig,
      adopted,
      item_count: tracker.items.length,
      generated,
      text: `Local work tracker ready at .work-items. Git ignores the folder. ${adopted.length ? `Adopted ${adopted.length} existing flat item(s) without overwriting their files.` : "No existing items needed adoption."}`,
    };
  });
}

export function migrateLegacyTracker(repoRoot, options = {}) {
  const paths = trackerPaths(repoRoot);
  const source = resolveLegacySource(repoRoot, options.from);
  const candidates = scanLegacyItemFolders(source.path);
  if (!candidates.length) {
    throw new WorkError(`No legacy work-item folders were found in ${source.relative}`, "no_legacy_items");
  }
  const duplicateIds = duplicates(candidates.map((candidate) => candidate.id));
  if (duplicateIds.length) {
    throw new WorkError(
      `Cannot migrate because IDs are duplicated: ${duplicateIds.join(", ")}`,
      "duplicate_ids",
    );
  }
  const existing = scanItemFolders(paths);
  const existingIds = new Set(existing.map((candidate) => candidate.id));
  const existingNames = new Set(existing.map((candidate) => candidate.folderName));
  const conflicts = candidates
    .filter((candidate) => existingIds.has(candidate.id) || existingNames.has(candidate.folderName))
    .map((candidate) => candidate.id);
  const legacyConfigPath = path.join(source.path, ".work-tracker.json");
  let legacyGithubDetected = false;
  if (fs.existsSync(legacyConfigPath)) {
    const legacyConfig = readJson(legacyConfigPath, "legacy tracker configuration");
    legacyGithubDetected = Boolean(legacyConfig.github);
  }

  if (!options.apply) {
    return {
      outcome: "migration_preview",
      source: source.relative,
      target: ".work-items",
      item_count: candidates.length,
      ids: candidates.map((candidate) => candidate.id),
      conflicts,
      source_will_be_preserved: true,
      legacy_github_detected: legacyGithubDetected,
      text: `${candidates.length} item(s) can be copied from ${source.relative} into flat .work-items folders.${conflicts.length ? ` Conflicts must be fixed first: ${conflicts.join(", ")}.` : " The old tracker will remain unchanged for review."}${legacyGithubDetected ? " Existing GitHub mirror settings will not be carried over." : ""}\nRun work migrate --from ${source.relative} --apply after the owner approves this preview.`,
    };
  }
  if (conflicts.length) {
    throw new WorkError(`Migration conflicts with existing items: ${conflicts.join(", ")}`, "migration_conflict");
  }

  ensureGitignore(paths);
  return withLock(paths.lockPath, () => {
    ensureTrackerShell(paths, { defaultBranch: defaultBranch(repoRoot) });
    const tempRoot = path.join(paths.workRoot, `.migration-${process.pid}-${Date.now()}`);
    const installed = [];
    fs.mkdirSync(tempRoot, { recursive: false });
    try {
      for (const candidate of candidates) {
        const preparedPath = path.join(tempRoot, candidate.folderName);
        fs.cpSync(candidate.path, preparedPath, { recursive: true, errorOnExist: true });
        prepareMigratedFolder(repoRoot, preparedPath, candidate);
      }
      for (const candidate of candidates) {
        const preparedPath = path.join(tempRoot, candidate.folderName);
        const targetPath = path.join(paths.workRoot, candidate.folderName);
        fs.renameSync(preparedPath, targetPath);
        installed.push({ targetPath, preparedPath });
      }
    } catch (error) {
      for (const entry of [...installed].reverse()) {
        try {
          if (fs.existsSync(entry.targetPath)) fs.renameSync(entry.targetPath, entry.preparedPath);
        } catch {
          // Validation reports an interrupted migration if rollback cannot finish.
        }
      }
      throw error;
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
    const tracker = loadTracker(repoRoot);
    regenerate(tracker);
    return {
      outcome: "migrated",
      source: source.relative,
      target: ".work-items",
      migrated: candidates.map((candidate) => candidate.id),
      source_preserved: true,
      legacy_github_detected: legacyGithubDetected,
      text: `Copied ${candidates.length} item(s) into flat .work-items folders. The old ${source.relative} tracker is unchanged for review.${legacyGithubDetected ? " Its GitHub mirror settings were not carried over." : ""}`,
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
    const createdDate = input.createdDate ?? isoDate();
    if (!isIsoDate(createdDate)) {
      throw new WorkError(`Creation date must be YYYY-MM-DD: ${createdDate}`, "invalid_date");
    }
    const record = newRecord({
      id,
      title: requiredText(input.title, "title"),
      description: requiredText(input.description, "description"),
      type,
      priority,
      status: "Backlog",
      nextStep: requiredText(input.nextStep, "next step"),
      createdDate,
    });
    const groupDir = resolveGroupDir(tracker.paths, input.group);
    const folderName = `${id}-${slugify(record.title)}`;
    const itemDir = path.join(groupDir, folderName);
    if (fs.existsSync(itemDir)) {
      throw new WorkError(`Refusing to overwrite existing folder ${itemDir}`, "path_exists");
    }
    fs.mkdirSync(groupDir, { recursive: true });
    fs.mkdirSync(itemDir, { recursive: false });
    try {
      atomicBatchWrite([
        { path: path.join(itemDir, "ITEM.yaml"), content: stableYaml(record) },
        {
          path: path.join(itemDir, "REQUIREMENTS.md"),
          content: renderRequirements(record, record.description),
        },
        { path: path.join(itemDir, "STATUS.md"), content: renderStatus(record, []) },
        {
          path: path.join(itemDir, "HISTORY.ndjson"),
          content: `${JSON.stringify(historyEntry("created", "Created in Backlog with requirements still refining."))}\n`,
        },
      ]);
    } catch (error) {
      try {
        fs.rmdirSync(itemDir);
      } catch {
        // Leave recoverable evidence if another process added a file concurrently.
      }
      throw error;
    }
    const refreshed = reload(tracker);
    regenerate(refreshed);
    const item = requireItem(refreshed, id);
    return {
      outcome: "created",
      item: publicItem(item, tracker.paths),
      text: `${id} added to Backlog: ${record.title}\nRequirements: refining\nNext: ${record.next_step}`,
    };
  });
}

export function requirementsStatus(tracker, id) {
  const item = requireItem(tracker, id);
  const requirements = readRequirements(item);
  return {
    outcome: "ok",
    item: id,
    requirements: requirements.meta,
    missing_sections: missingRequirementsSections(requirements.body),
    text: `${id} requirements are ${requirements.meta.status}.${requirements.meta.approved_by ? ` Approved by ${requirements.meta.approved_by} on ${requirements.meta.finalized_date}.` : ""}`,
  };
}

export function updateRequirementsStatus(tracker, id, input) {
  return withLock(tracker.paths.lockPath, () => {
    const item = requireItem(tracker, id);
    const requirements = readRequirements(item);
    const record = structuredClone(item.record);
    let note;
    if (input.finalize) {
      const approvedBy = requiredText(input.approvedBy, "approved by");
      const missing = missingRequirementsSections(requirements.body);
      if (missing.length) {
        throw new WorkError(
          `Requirements cannot be finalized. Complete: ${missing.join(", ")}.`,
          "incomplete_requirements",
          { missing_sections: missing },
        );
      }
      requirements.meta.status = "finalized";
      requirements.meta.updated_date = isoDate();
      requirements.meta.finalized_date = isoDate();
      requirements.meta.approved_by = approvedBy;
      if (record.status === "Backlog") record.status = "Ready";
      record.updated_date = isoDate();
      note = `Requirements finalized with owner approval from ${approvedBy}.`;
    } else if (input.reopen) {
      if (["Done", "Cancelled"].includes(record.status)) {
        throw new WorkError(
          `Requirements for a ${record.status} item cannot be reopened. Create a new work item for changed direction.`,
          "closed_item",
        );
      }
      requirements.meta.status = "refining";
      requirements.meta.updated_date = isoDate();
      requirements.meta.finalized_date = null;
      requirements.meta.approved_by = null;
      record.status = "Backlog";
      record.next_step = "Refine and finalize REQUIREMENTS.md with the owner.";
      record.updated_date = isoDate();
      note = "Requirements reopened for owner refinement; item returned to Backlog.";
    } else {
      throw new WorkError("Choose --finalize or --reopen", "missing_action");
    }
    const history = historyEntry(input.finalize ? "requirements_finalized" : "requirements_reopened", note);
    atomicBatchWrite([
      { path: item.itemPath, content: stableYaml(record) },
      { path: item.requirementsPath, content: renderRequirementsFile(requirements.meta, requirements.body) },
      { path: item.historyPath, content: appendHistoryContent(item, history) },
      {
        path: item.statusPath,
        content: renderStatus(record, recentHistory(item, history), readStatus(item), requirements.meta.status),
      },
    ]);
    regenerate(reload(tracker));
    return {
      outcome: input.finalize ? "finalized" : "reopened",
      item: publicItem(requireItem(reload(tracker), id), tracker.paths),
      text: `${id}: ${note}`,
    };
  });
}

export function getStatus(tracker, options = {}) {
  // Blockers and relationships are always resolved against every item, archived
  // ones included, so an archived target never reads as missing.
  const visible = options.archived ? tracker.items : tracker.items.filter((item) => !item.archived);
  const groups = {
    backlog: visible.filter((item) => ["Backlog", "Ready"].includes(item.record.status)),
    active: visible.filter((item) => ["In Progress", "In Review"].includes(item.record.status)),
    completed: visible.filter((item) => item.record.status === "Done"),
    cancelled: visible.filter((item) => item.record.status === "Cancelled"),
    blocked: visible.filter((item) => effectiveBlockers(item, tracker.items).length > 0),
    archived: tracker.items.filter((item) => item.archived),
  };
  const next = chooseNext(tracker, { allowNone: true });
  return {
    outcome: "ok",
    counts: Object.fromEntries(Object.entries(groups).map(([key, items]) => [key, items.length])),
    groups: Object.fromEntries(
      Object.entries(groups).map(([key, items]) => [
        key,
        items.map((item) => publicItem(item, tracker.paths)),
      ]),
    ),
    next: next ? publicRecommendation(next) : null,
    text: renderStatusList(groups, next, options, tracker.items, tracker.paths),
  };
}

export function chooseNext(tracker, options = {}) {
  const candidates = tracker.items
    .filter((item) => !item.archived)
    .filter((item) => ["Ready", "In Progress", "In Review"].includes(item.record.status))
    .map((item) => ({ item, blockers: effectiveBlockers(item, tracker.items) }))
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
  } else {
    reason = `Highest-priority Ready item with ${dependencyCount ? "all dependencies done" : "no dependencies"} and no blockers.`;
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
    requireFinalizedRequirements(item);
    if (item.record.status !== "Ready") {
      throw new WorkError(`${item.id} must be Ready before it can start`, "item_not_ready");
    }
    const branch = requiredText(input.branch, "branch");
    assertBranchAvailable(tracker, item.id, branch, input.allowSharedBranch);
    const nextStep = requiredText(input.nextStep ?? item.record.next_step, "next step");
    const updated = structuredClone(item.record);
    updated.status = "In Progress";
    updated.next_step = nextStep;
    updated.git.branch = branch;
    updated.updated_date = isoDate();
    writeItemUpdate(tracker, item, updated, "started", `Started on branch ${branch}.`);
    return {
      outcome: "started",
      item: publicItem(requireItem(reload(tracker), id), tracker.paths),
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
      if (["Ready", "In Progress", "In Review"].includes(requestedStatus)) {
        requireFinalizedRequirements(item);
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
        created_date: isoDate(),
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
    if (["In Progress", "In Review"].includes(updated.status) && updated.git.branch) {
      assertBranchAvailable(tracker, item.id, updated.git.branch, input.allowSharedBranch);
    }
    if (!["Done", "Cancelled"].includes(updated.status) && !updated.next_step) {
      throw new WorkError("Active and backlog items require an exact next step", "missing_next_step");
    }
    updated.updated_date = isoDate();
    const note = input.note ? requiredText(input.note, "note") : changes.join("; ");
    writeItemUpdate(tracker, item, updated, "updated", note);
    return {
      outcome: "updated",
      item: publicItem(requireItem(reload(tracker), id), tracker.paths),
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
    sourceRecord.updated_date = isoDate();
    targetRecord.updated_date = isoDate();
    const allRecords = tracker.items.map((item) =>
      item.id === source.id ? sourceRecord : item.id === target.id ? targetRecord : item.record,
    );
    const cycles = dependencyCycles(allRecords);
    if (cycles.length) {
      throw new WorkError(
        `Relationship would create a dependency cycle: ${cycles[0].join(" -> ")}`,
        "dependency_cycle",
      );
    }
    writeLinkedItems(source, sourceRecord, target, targetRecord, relationship, false);
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
    sourceRecord.updated_date = isoDate();
    targetRecord.updated_date = isoDate();
    writeLinkedItems(source, sourceRecord, target, targetRecord, relationship, true);
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
    requireFinalizedRequirements(item);
    const commit = resolveCommit(tracker.paths.repoRoot, input.commit ?? "HEAD");
    const defaultRef = resolveDefaultRef(tracker.paths.repoRoot, tracker.config.default_branch);
    const landed = isAncestor(tracker.paths.repoRoot, commit, defaultRef);
    const updated = structuredClone(item.record);
    updated.git.completion_commit = commit;
    updated.git.pull_request = normalizePullRequest(input.pullRequest, updated.git.pull_request);
    updated.git.work_complete_date = isoDate();
    updated.updated_date = isoDate();
    let event;
    if (landed) {
      updated.status = "Done";
      updated.next_step = "";
      updated.git.landed_commit = commit;
      updated.git.landed_date = isoDate();
      updated.git.default_branch = tracker.config.default_branch;
      event = `Verified ${commit.slice(0, 12)} is in ${defaultRef}; marked Done.`;
    } else {
      updated.status = "In Review";
      updated.next_step =
        input.nextStep ??
        `Get commit ${commit.slice(0, 12)} reviewed and landed in ${tracker.config.default_branch}.`;
      updated.git.landed_commit = null;
      updated.git.landed_date = null;
      event = `Work recorded at ${commit.slice(0, 12)}, but it is not in ${defaultRef}; marked In Review.`;
    }
    writeItemUpdate(tracker, item, updated, "finish_checked", event);
    const refreshed = requireItem(reload(tracker), id);
    return {
      outcome: landed ? "landed" : "branch_complete",
      landed,
      default_ref: defaultRef,
      item: publicItem(refreshed, tracker.paths),
      text: landed
        ? `${id} is Done. Git verifies ${commit.slice(0, 12)} is in ${defaultRef}.`
        : `${id} appears complete on a branch, but ${commit.slice(0, 12)} is not in ${defaultRef}. It remains In Review.`,
    };
  });
}

export function landingStatus(tracker, id) {
  const item = requireItem(tracker, id);
  const commit = item.record.git.landed_commit ?? item.record.git.completion_commit;
  if (!commit) {
    return {
      outcome: "no_completion_commit",
      landed: false,
      item: publicItem(item, tracker.paths),
      text: `${item.id} has no completion commit recorded, so landing cannot be verified.`,
    };
  }
  if (!commitExists(tracker.paths.repoRoot, commit)) {
    return {
      outcome: "commit_unavailable",
      landed: false,
      item: publicItem(item, tracker.paths),
      text: `${item.id} records ${commit}, but that commit is not available in this clone. Fetch branches and retry.`,
    };
  }
  const ref = resolveDefaultRef(tracker.paths.repoRoot, tracker.config.default_branch, true);
  if (!ref) {
    return {
      outcome: "default_branch_unavailable",
      landed: false,
      item: publicItem(item, tracker.paths),
      text: `Cannot verify ${item.id} because ${tracker.config.default_branch} is not available locally or on origin.`,
    };
  }
  const landed = isAncestor(tracker.paths.repoRoot, commit, ref);
  return {
    outcome: landed ? "landed" : "not_landed",
    landed,
    commit,
    default_ref: ref,
    item: publicItem(item, tracker.paths),
    text: landed
      ? `${item.id} is in ${ref}; Git ancestry includes ${commit.slice(0, 12)}.`
      : `${item.id} is not in ${ref}; Git ancestry does not include ${commit.slice(0, 12)}.`,
  };
}

export function validateTracker(tracker) {
  const errors = [];
  const warnings = [];
  validateConfig(tracker.config, errors);
  if (!hasWorkItemsIgnore(tracker.paths)) {
    errors.push(".gitignore must ignore /.work-items/");
  }
  const tracked = trackedWorkItemFiles(tracker.paths.repoRoot);
  if (tracked.length) {
    errors.push(`Git still tracks local work-item files: ${tracked.join(", ")}`);
  }
  const duplicateIds = duplicates(tracker.items.map((item) => item.id));
  for (const id of duplicateIds) errors.push(`Duplicate ID: ${id}`);
  const byId = new Map(tracker.items.map((item) => [item.id, item]));

  for (const item of tracker.items) {
    validateRecord(item, errors, warnings);
    for (const nested of nestedItemFolders(item)) {
      errors.push(
        `${item.id}: work item folder ${nested} sits inside ${item.folderName} and is invisible to the tracker. Move it into a group folder or up to .work-items.`,
      );
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
    archived_count: tracker.items.filter((item) => item.archived).length,
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
    repair: "Correct the local record, then run work validate.",
  }));
  for (const warning of validation.warnings) {
    findings.push({
      severity: "warning",
      code: "validation_warning",
      message: warning,
      repair: "Review the local work item before changing it.",
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
  if (
    !fs.existsSync(tracker.paths.dashboardPath) ||
    fs.readFileSync(tracker.paths.dashboardPath, "utf8") !== expectedDashboard
  ) {
    findings.push({
      severity: "warning",
      code: "stale_dashboard",
      message: "DASHBOARD.md is missing or stale.",
      repair: "Run work dashboard.",
    });
  }
  return {
    outcome: findings.length ? "findings" : "clean",
    findings,
    text: findings.length
      ? `Reconciliation found ${findings.length} issue(s):\n${findings.map((finding) => `- ${finding.message} Repair: ${finding.repair}`).join("\n")}`
      : "Local records, Git evidence, relationships, and the dashboard are consistent.",
  };
}

export function archiveItem(tracker, id) {
  return moveItemFolder(tracker, id, true);
}

export function unarchiveItem(tracker, id) {
  return moveItemFolder(tracker, id, false);
}

function moveItemFolder(tracker, id, archive) {
  return withLock(tracker.paths.lockPath, () => {
    const item = requireItem(tracker, id);
    if (Boolean(item.archived) === archive) {
      return {
        outcome: "unchanged",
        id: item.id,
        archived: archive,
        path: displayTrackerPath(tracker.paths, item.path),
        text: `${item.id} is already ${archive ? "archived" : "not archived"}. Nothing moved.`,
      };
    }
    // Archiving and unarchiving keep the group folder the owner put the item in,
    // so an item comes back where it came from. An unarchived item whose group
    // folder was deleted meanwhile gets it recreated.
    const destinationRoot = archive
      ? path.join(
          tracker.paths.archiveRoot,
          relativeParent(tracker.paths.workRoot, item.path),
        )
      : path.join(
          tracker.paths.workRoot,
          relativeParent(tracker.paths.archiveRoot, item.path),
        );
    const destination = path.join(destinationRoot, item.folderName);
    if (fs.existsSync(destination)) {
      throw new WorkError(`Refusing to overwrite existing folder ${destination}`, "path_exists");
    }
    fs.mkdirSync(destinationRoot, { recursive: true });
    fs.renameSync(item.path, destination);
    const moved = itemCandidate(
      destination,
      item.folderName,
      item.folderId ?? item.id,
      archive,
      tracker.paths,
    );
    const entry = historyEntry(
      archive ? "archived" : "unarchived",
      archive
        ? "Folder moved into the archive folder. Status and requirements were not changed."
        : "Folder moved out of the archive folder. Status and requirements were not changed.",
    );
    atomicWrite(moved.historyPath, appendHistoryContent(moved, entry));
    const shown = displayTrackerPath(tracker.paths, destination);
    return {
      outcome: archive ? "archived" : "unarchived",
      id: item.id,
      archived: archive,
      path: shown,
      text: `${item.id} moved to ${shown}. Its status is unchanged.`,
    };
  });
}

export function regenerate(tracker) {
  atomicWrite(tracker.paths.dashboardPath, renderDashboard(tracker.items));
  return {
    dashboard: displayTrackerPath(tracker.paths, tracker.paths.dashboardPath),
  };
}

export function scanItems(paths) {
  const items = [];
  for (const candidate of scanItemFolders(paths)) {
    if (!fs.existsSync(candidate.itemPath)) {
      items.push({ ...candidate, record: invalidPlaceholder(candidate), missingRecord: true });
      continue;
    }
    const record = readYaml(candidate.itemPath, `${candidate.id} ITEM.yaml`);
    items.push({
      ...candidate,
      folderId: candidate.id,
      id: record.id ?? candidate.id,
      record,
    });
  }
  return items.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

// Where a folder sits is the only record of how the owner has organised it, for
// grouping and for archiving alike. Both are read fresh on every command and
// neither is stored in the item's own files, so the owner can drag folders in a
// file manager and the next command already agrees with what they did.
//
// A folder named like a work item is one. Anything else is a folder the owner
// made to group things, so the walk looks inside it. A work-item folder is never
// searched for more work items; validate reports any hidden inside one.
function scanItemFolders(paths, root = paths.workRoot, archived = false, depth = 0) {
  if (depth > FOLDER_MAX_DEPTH || !fs.existsSync(root)) return [];
  const candidates = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const entryPath = path.join(root, entry.name);
    const inArchive = archived || entryPath === paths.archiveRoot;
    const match = entry.name.match(ITEM_FOLDER_PATTERN);
    if (match && holdsItemFiles(entryPath)) {
      candidates.push(itemCandidate(entryPath, entry.name, match[1], inArchive, paths));
      continue;
    }
    candidates.push(...scanItemFolders(paths, entryPath, inArchive, depth + 1));
  }
  return candidates;
}

// Whether a folder is really a work item, rather than one that only shares the
// shape of the name. The owner names group folders things like "phase-1" and
// "epic-2", which match the same pattern, and mistaking one of those for a work
// item hides every item inside it. So the files decide, not the name. A work item
// missing its ITEM.yaml still counts, so validate can report the damage instead
// of the item quietly disappearing.
function holdsItemFiles(dirPath) {
  return ITEM_FILE_NAMES.some((name) => fs.existsSync(path.join(dirPath, name)));
}

// A work item folder the owner dropped inside another work item folder. The walk
// does not look in there, so without this check the item would vanish from every
// command with no sign of where it went.
function nestedItemFolders(item) {
  if (!fs.existsSync(item.path)) return [];
  const found = [];
  for (const entry of fs.readdirSync(item.path, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const entryPath = path.join(item.path, entry.name);
    if (ITEM_FOLDER_PATTERN.test(entry.name) && holdsItemFiles(entryPath)) {
      found.push(entry.name);
    }
  }
  return found;
}

// The folder path an item sits in, relative to .work-items, or null at the top
// level. An archived item keeps the archive folder in its group so the reported
// location is always the real one.
function itemGroup(paths, itemPath) {
  const relative = toPosix(path.relative(paths.workRoot, path.dirname(itemPath)));
  return relative && relative !== "." ? relative : null;
}

function relativeParent(root, itemPath) {
  const relative = path.relative(root, path.dirname(itemPath));
  return relative === "." ? "" : relative;
}

// Turns an owner-supplied group name into a folder inside .work-items. Refuses a
// path that escapes the tracker, one that would bury the item in the archive, and
// one whose folder would be mistaken for a work item by the walk above.
function resolveGroupDir(paths, group) {
  if (group === undefined || group === null) return paths.workRoot;
  const cleaned = String(group)
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^\/+|\/+$/g, "");
  if (!cleaned) return paths.workRoot;
  const parts = cleaned.split("/").filter((part) => part !== "" && part !== ".");
  if (!parts.length) return paths.workRoot;
  if (path.isAbsolute(cleaned) || parts.includes("..")) {
    throw new WorkError(
      `Group folder must be a path inside .work-items: ${group}`,
      "invalid_group",
    );
  }
  if (parts[0] === ARCHIVE_FOLDER) {
    throw new WorkError(
      "Create the item outside the archive folder, then archive it.",
      "invalid_group",
    );
  }
  // A group folder may be called anything the owner likes, "phase-1" included:
  // holdsItemFiles decides what is a work item, not the name. A dot-prefixed
  // folder is the exception, because the walk skips those entirely.
  for (const part of parts) {
    if (part.startsWith(".")) {
      throw new WorkError(`Group folder must not start with a dot: ${part}`, "invalid_group");
    }
  }
  if (parts.length > FOLDER_MAX_DEPTH) {
    throw new WorkError(
      `Group folder is nested deeper than ${FOLDER_MAX_DEPTH} folders: ${cleaned}`,
      "invalid_group",
    );
  }
  return path.join(paths.workRoot, ...parts);
}

function scanLegacyItemFolders(sourceRoot) {
  const candidates = [];
  const roots = [];
  for (const stage of LEGACY_STAGES) {
    const stagePath = path.join(sourceRoot, stage);
    if (fs.existsSync(stagePath)) roots.push({ path: stagePath, stage });
  }
  if (!roots.length) roots.push({ path: sourceRoot, stage: null });
  for (const root of roots) {
    for (const entry of fs.readdirSync(root.path, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const match = entry.name.match(ITEM_FOLDER_PATTERN);
      if (!match) continue;
      candidates.push({
        ...itemCandidate(path.join(root.path, entry.name), entry.name, match[1]),
        legacyStage: root.stage,
      });
    }
  }
  return candidates;
}

function itemCandidate(itemPath, folderName, rawId, archived = false, paths = null) {
  const id = rawId.toUpperCase();
  return {
    id,
    folderName,
    archived,
    group: paths ? itemGroup(paths, itemPath) : null,
    path: itemPath,
    itemPath: path.join(itemPath, "ITEM.yaml"),
    legacyItemPath: path.join(itemPath, "ITEM.json"),
    requirementsPath: path.join(itemPath, "REQUIREMENTS.md"),
    specPath: path.join(itemPath, "SPEC.md"),
    statusPath: path.join(itemPath, "STATUS.md"),
    historyPath: path.join(itemPath, "HISTORY.ndjson"),
  };
}

function ensureTrackerShell(paths, options = {}) {
  fs.mkdirSync(paths.workRoot, { recursive: true });
  let createdConfig = false;
  if (!fs.existsSync(paths.configPath)) {
    atomicWriteYaml(paths.configPath, {
      schema_version: 2,
      id_prefix: "WI",
      id_width: 3,
      default_branch: options.defaultBranch ?? "main",
    });
    createdConfig = true;
  }
  fs.mkdirSync(paths.archiveRoot, { recursive: true });
  if (!fs.existsSync(paths.readmePath)) atomicWrite(paths.readmePath, workItemsReadme());
  if (!fs.existsSync(paths.dashboardPath)) atomicWrite(paths.dashboardPath, renderDashboard([]));
  return createdConfig;
}

function ensureGitignore(paths) {
  const existing = fs.existsSync(paths.gitignorePath)
    ? fs.readFileSync(paths.gitignorePath, "utf8")
    : "";
  if (hasWorkItemsIgnoreContent(existing)) return false;
  const prefix = existing && !existing.endsWith("\n") ? "\n" : "";
  atomicWrite(paths.gitignorePath, `${existing}${prefix}/.work-items/\n`);
  return true;
}

function hasWorkItemsIgnore(paths) {
  if (!fs.existsSync(paths.gitignorePath)) return false;
  return hasWorkItemsIgnoreContent(fs.readFileSync(paths.gitignorePath, "utf8"));
}

function hasWorkItemsIgnoreContent(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => ["/.work-items/", ".work-items/", "/.work-items", ".work-items"].includes(line));
}

function trackedWorkItemFiles(repoRoot) {
  return git(repoRoot, ["ls-files", "--", ".work-items"]).stdout.split(/\r?\n/).filter(Boolean);
}

function primaryWorktreeRoot(repoRoot) {
  const listing = git(repoRoot, ["worktree", "list", "--porcelain"]).stdout;
  const first = listing.split(/\r?\n/).find((line) => line.startsWith("worktree "));
  if (!first) return repoRoot;
  const candidate = first.slice("worktree ".length);
  return fs.existsSync(candidate) ? fs.realpathSync(candidate) : repoRoot;
}

function legacyTrackerRoots(repoRoot) {
  return ["work-items", "delivery/work-items", "engagement/work-items"]
    .map((relative) => ({ relative, path: path.join(repoRoot, ...relative.split("/")) }))
    .filter((entry) => fs.existsSync(entry.path));
}

function resolveLegacySource(repoRoot, requested) {
  const roots = legacyTrackerRoots(repoRoot);
  if (!requested) {
    if (roots.length === 0) {
      throw new WorkError("No older local tracker was found", "missing_legacy_tracker");
    }
    if (roots.length > 1) {
      throw new WorkError(
        `More than one older tracker exists: ${roots.map((entry) => entry.relative).join(", ")}. Pass --from.`,
        "ambiguous_path",
      );
    }
    return roots[0];
  }
  const resolved = path.resolve(repoRoot, String(requested));
  const relative = path.relative(repoRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative) || resolved === path.join(repoRoot, ".work-items")) {
    throw new WorkError("The migration source must be an older tracker inside this repository", "invalid_path");
  }
  if (!fs.existsSync(resolved)) {
    throw new WorkError(`Migration source does not exist: ${normalizeRelativePath(relative)}`, "missing_legacy_tracker");
  }
  return { path: resolved, relative: normalizeRelativePath(relative) };
}

function prepareMigratedFolder(repoRoot, preparedPath, candidate) {
  const copied = itemCandidate(preparedPath, candidate.folderName, candidate.id);
  let legacyRecord = null;
  if (fs.existsSync(copied.legacyItemPath)) {
    legacyRecord = readJson(copied.legacyItemPath, `${candidate.id} legacy ITEM.json`);
  }
  const title = requiredText(legacyRecord?.title ?? titleFromFolder(candidate.folderName), "title");
  const createdDate = validDateOrToday(legacyRecord?.created_date ?? legacyRecord?.created_at);
  const updatedDate = validDateOrToday(legacyRecord?.updated_date ?? legacyRecord?.updated_at ?? createdDate);
  const record = newRecord({
    id: candidate.id,
    title,
    description: legacyRecord?.description ?? title,
    type: TYPES.includes(legacyRecord?.type) ? legacyRecord.type : "task",
    priority: PRIORITIES.includes(legacyRecord?.priority) ? legacyRecord.priority : "medium",
    status: legacyStatus(legacyRecord?.status, candidate.legacyStage),
    nextStep:
      legacyRecord?.next_step ||
      (["Done", "Cancelled"].includes(legacyRecord?.status)
        ? ""
        : "Refine and finalize REQUIREMENTS.md with the owner."),
    createdDate,
  });
  record.updated_date = updatedDate;
  if (Array.isArray(legacyRecord?.blockers)) record.blockers = legacyRecord.blockers;
  if (legacyRecord?.relationships && typeof legacyRecord.relationships === "object") {
    for (const type of RELATIONSHIPS) {
      if (Array.isArray(legacyRecord.relationships[type])) {
        record.relationships[type] = legacyRecord.relationships[type];
      }
    }
  }
  if (legacyRecord?.git && typeof legacyRecord.git === "object") {
    record.git = {
      branch: legacyRecord.git.branch ?? null,
      pull_request: legacyRecord.git.pull_request ?? null,
      completion_commit: legacyRecord.git.completion_commit ?? null,
      work_complete_date:
        legacyRecord.git.work_complete_date ?? legacyRecord.git.work_complete_at ?? null,
      landed_commit: legacyRecord.git.landed_commit ?? null,
      landed_date: legacyRecord.git.landed_date ?? legacyRecord.git.landed_at ?? null,
      default_branch: legacyRecord.git.default_branch ?? null,
    };
  }
  record.migration = {
    source: toPosix(path.relative(repoRoot, candidate.path)),
    migrated_date: isoDate(),
  };
  atomicWriteYaml(copied.itemPath, record);

  if (!fs.existsSync(copied.requirementsPath)) {
    atomicWrite(
      copied.requirementsPath,
      renderRequirements(record, "_Not recorded. Review the preserved legacy files with the owner._"),
    );
  } else {
    try {
      readRequirements(copied);
    } catch {
      const legacyRequirements = uniqueLegacyPath(preparedPath, "LEGACY-REQUIREMENTS", ".md");
      fs.renameSync(copied.requirementsPath, legacyRequirements);
      atomicWrite(
        copied.requirementsPath,
        renderRequirements(record, "_Not recorded. Review the preserved legacy requirements with the owner._"),
      );
    }
  }
  const entry = historyEntry(
    "migrated",
    "Copied into the flat local tracker. Legacy files and the source tracker were preserved.",
  );
  atomicWrite(copied.historyPath, appendHistoryContent(copied, entry));
  if (!fs.existsSync(copied.statusPath)) {
    atomicWrite(copied.statusPath, renderStatus(record, [entry]));
  }
}

function uniqueLegacyPath(folder, base, extension) {
  for (let index = 0; index < 1000; index += 1) {
    const suffix = index === 0 ? "" : `-${index + 1}`;
    const candidate = path.join(folder, `${base}${suffix}${extension}`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  throw new WorkError(`Could not preserve ${base}${extension}`, "path_exists");
}

function newRecord({ id, title, description, type, priority, status, nextStep, createdDate }) {
  return {
    schema_version: 2,
    id,
    title,
    description,
    type,
    priority,
    status,
    created_date: createdDate,
    updated_date: createdDate,
    next_step: nextStep,
    blockers: [],
    relationships: Object.fromEntries(RELATIONSHIPS.map((typeName) => [typeName, []])),
    git: {
      branch: null,
      pull_request: null,
      completion_commit: null,
      work_complete_date: null,
      landed_commit: null,
      landed_date: null,
      default_branch: null,
    },
  };
}

function invalidPlaceholder(candidate) {
  return {
    ...newRecord({
      id: candidate.id,
      title: titleFromFolder(candidate.folderName),
      description: titleFromFolder(candidate.folderName),
      type: "task",
      priority: "medium",
      status: "Backlog",
      nextStep: "",
      createdDate: isoDate(),
    }),
    _invalid_missing_record: true,
  };
}

function legacyStatus(value, stage) {
  if (value !== undefined) {
    try {
      return normalizeStatus(value);
    } catch {
      // Fall back to the only status the old folder proves.
    }
  }
  if (stage === "02-in-progress") return "In Progress";
  if (stage === "03-completed") return "Done";
  if (stage === "04-archived") return "Cancelled";
  return "Backlog";
}

function validDateOrToday(value) {
  return isIsoDate(value) ? value : isoDate();
}

function titleFromFolder(folderName) {
  return (
    folderName
      .replace(/^[A-Za-z][A-Za-z0-9]*-\d+-?/, "")
      .split("-")
      .filter(Boolean)
      .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
      .join(" ") || folderName
  );
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
    throw new WorkError(
      `Invalid ${label} "${value}". Use ${allowed.join(", ")}.`,
      `invalid_${label.replace(/\s+/g, "_")}`,
    );
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
    throw new WorkError(`${normalized} is missing ITEM.yaml. Run work init to adopt it.`, "missing_record");
  }
  return matches[0];
}

function reload(tracker) {
  return loadTracker(tracker.paths.repoRoot);
}

function renderRequirements(record, startingRequest) {
  const meta = {
    status: "refining",
    created_date: record.created_date,
    updated_date: record.created_date,
    finalized_date: null,
    approved_by: null,
  };
  const body = `# ${record.id}: ${record.title}

This file contains only needs stated by the owner and suggestions the owner
approved. It contains no build plan or technical solution.

## Starting request

${startingRequest}

## Goal

_Not agreed yet._

## Why

_Not agreed yet._

## What has to be true for this to count as finished

_Not agreed yet._

## What the person using it experiences

_Not agreed yet._

## How it behaves from the outside

_Not agreed yet._

## Edge cases

_Not agreed yet._
`;
  return renderRequirementsFile(meta, body);
}

function renderRequirementsFile(meta, body) {
  return `---\n${stableYaml(meta)}---\n\n${body.trim()}\n`;
}

function readRequirements(item) {
  if (!fs.existsSync(item.requirementsPath)) {
    throw new WorkError(`${item.id} is missing REQUIREMENTS.md`, "missing_requirements");
  }
  const source = fs.readFileSync(item.requirementsPath, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) {
    throw new WorkError(`${item.id} REQUIREMENTS.md needs YAML fields at the top`, "invalid_requirements");
  }
  const meta = parseYaml(match[1], `${item.id} REQUIREMENTS.md fields`);
  return { meta, body: match[2].trim() };
}

function missingRequirementsSections(body) {
  const missing = [];
  for (const heading of REQUIRED_REQUIREMENTS_SECTIONS) {
    const content = markdownSection(body, heading);
    if (!content || /^_?(?:not agreed yet|todo|tbd)[.!]?_?$/i.test(content.trim())) {
      missing.push(heading);
    }
  }
  return missing;
}

function markdownSection(body, heading) {
  const escaped = escapeRegex(heading);
  const match = body.match(
    new RegExp(`(?:^|\\n)## ${escaped}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`),
  );
  return match?.[1]?.trim() ?? "";
}

function requireFinalizedRequirements(item) {
  const requirements = readRequirements(item);
  if (requirements.meta.status !== "finalized") {
    throw new WorkError(
      `${item.id} requirements are still refining. Finalize them with owner approval first.`,
      "requirements_not_finalized",
    );
  }
  return requirements;
}

function renderStatus(record, history, existing = "", requirementsStatusValue = undefined) {
  const blockers = record.blockers.length
    ? record.blockers
        .map(
          (blocker) =>
            `- ${blocker.id}: ${blocker.reason}${blocker.work_item_id ? ` (${blocker.work_item_id})` : ""}`,
        )
        .join("\n")
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
  const historyLines =
    history
      .slice(-12)
      .reverse()
      .map((entry) => `- ${entry.at}: **${entry.action}**. ${entry.note}`)
      .join("\n") || "- No history yet.";
  const userNotes = extractUserNotes(existing);
  return `# ${record.id}: ${record.title}

<!-- work-tracker:current:start -->
## Current handoff

- Status: ${record.status}
- Requirements: ${requirementsStatusValue ?? "See REQUIREMENTS.md"}
- Priority: ${record.priority}
- Type: ${record.type}
- Exact next step: ${record.next_step || "None"}
- Updated: ${record.updated_date}

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
      throw new WorkError(
        `${item.id} HISTORY.ndjson line ${index + 1} is invalid JSON: ${error.message}`,
        "invalid_history",
      );
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
  writeItemFiles(item, record, action, note);
  regenerate(reload(tracker));
}

function writeItemFiles(item, record, action, note) {
  const entry = historyEntry(action, note);
  const requirements = readRequirements(item);
  atomicBatchWrite([
    { path: item.itemPath, content: stableYaml(record) },
    { path: item.historyPath, content: appendHistoryContent(item, entry) },
    {
      path: item.statusPath,
      content: renderStatus(
        record,
        recentHistory(item, entry),
        readStatus(item),
        requirements.meta.status,
      ),
    },
  ]);
}

function writeLinkedItems(source, sourceRecord, target, targetRecord, relationship, remove) {
  const inverse = INVERSES[relationship];
  const action = remove ? "unlinked" : "linked";
  const entries = [];
  for (const [item, record, event] of [
    [source, sourceRecord, `${remove ? "removed " : ""}${relationship} ${target.id}`],
    [target, targetRecord, `${remove ? "removed " : ""}${inverse} ${source.id}`],
  ]) {
    const history = historyEntry(action, event);
    const requirements = readRequirements(item);
    entries.push({ path: item.itemPath, content: stableYaml(record) });
    entries.push({ path: item.historyPath, content: appendHistoryContent(item, history) });
    entries.push({
      path: item.statusPath,
      content: renderStatus(
        record,
        recentHistory(item, history),
        readStatus(item),
        requirements.meta.status,
      ),
    });
  }
  atomicBatchWrite(entries);
}

function assertBranchAvailable(tracker, itemId, branch, allowSharedBranch) {
  if (allowSharedBranch) return;
  const collision = tracker.items.find(
    (candidate) =>
      candidate.id !== itemId &&
      ["In Progress", "In Review"].includes(candidate.record.status) &&
      candidate.record.git.branch === branch,
  );
  if (collision) {
    throw new WorkError(
      `${branch} is already claimed by ${collision.id}. Use --allow-shared-branch only when intentional.`,
      "branch_claimed",
    );
  }
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
    a.record.created_date.localeCompare(b.record.created_date) ||
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

function publicItem(item, paths) {
  let requirementStatusValue = "invalid";
  try {
    requirementStatusValue = readRequirements(item).meta.status;
  } catch {
    // Validation reports the exact file problem.
  }
  return {
    id: item.id,
    title: item.record.title,
    description: item.record.description,
    status: item.record.status,
    archived: Boolean(item.archived),
    group: item.group ?? null,
    requirements_status: requirementStatusValue,
    priority: item.record.priority,
    type: item.record.type,
    created_date: item.record.created_date,
    updated_date: item.record.updated_date,
    next_step: item.record.next_step,
    blockers: item.record.blockers,
    relationships: item.record.relationships,
    branch: item.record.git.branch,
    pull_request: item.record.git.pull_request,
    completion_commit: item.record.git.completion_commit,
    landed_commit: item.record.git.landed_commit,
    landed_date: item.record.git.landed_date,
    path: displayTrackerPath(paths, item.path),
  };
}

function displayTrackerPath(paths, targetPath) {
  if (paths.repoRoot === paths.sharedRoot) {
    return `.work-items/${toPosix(path.relative(paths.workRoot, targetPath))}`;
  }
  return toPosix(targetPath);
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

function renderStatusList(groups, next, options, allItems, paths) {
  const all = Boolean(options?.all);
  const showArchived = Boolean(options?.archived);
  const lines = [];
  if (groups.active.length) {
    lines.push("Active:");
    for (const item of groups.active) {
      lines.push(
        `- ${item.id} [${item.record.status}] ${item.record.title}${groupSummary(item)}; next: ${item.record.next_step}; ${gitSummary(item.record)}`,
      );
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
  lines.push(next ? `Next: ${next.item.id} (${next.reason})` : "Next: no actionable item");
  lines.push(
    `Counts: backlog ${groups.backlog.length}, active ${groups.active.length}, completed ${groups.completed.length}, cancelled ${groups.cancelled.length}, archived ${groups.archived.length}.`,
  );
  const sections = [];
  if (all) {
    sections.push(["Backlog", groups.backlog], ["Completed", groups.completed], ["Cancelled", groups.cancelled]);
  }
  if (all || showArchived) sections.push(["Archived", groups.archived]);
  for (const [label, items] of sections) {
    lines.push(`${label}:`);
    for (const item of items) {
      const where = label === "Archived" && paths ? `; at ${displayTrackerPath(paths, item.path)}` : "";
      const inGroup = label === "Archived" ? "" : groupSummary(item);
      lines.push(
        `- ${item.id} [${item.record.status}] ${item.record.title}${inGroup}; ${gitSummary(item.record)}${where}`,
      );
    }
    if (!items.length) lines.push("- None");
  }
  return lines.join("\n");
}

function groupSummary(item) {
  return item.group ? `; in ${item.group}` : "";
}

function gitSummary(record) {
  const values = [];
  if (record.git.branch) values.push(`branch ${record.git.branch}`);
  if (record.git.pull_request) values.push(`PR ${formatPr(record.git.pull_request)}`);
  if (record.git.landed_commit) values.push(`landed ${record.git.landed_commit.slice(0, 12)}`);
  else if (record.git.completion_commit) {
    values.push(`complete ${record.git.completion_commit.slice(0, 12)}, not verified landed`);
  }
  return values.length ? values.join(", ") : "Git evidence not recorded";
}

function renderDashboard(allItems) {
  const items = allItems.filter((item) => !item.archived);
  const actionable = items
    .filter((item) => ["Ready", "In Progress", "In Review"].includes(item.record.status))
    .map((item) => ({ item, blockers: effectiveBlockers(item, allItems) }));
  const active = actionable.filter((candidate) =>
    ["In Progress", "In Review"].includes(candidate.item.record.status),
  );
  const candidates = actionable
    .filter((candidate) => candidate.blockers.length === 0)
    .sort((a, b) => compareActionable(a.item, b.item))
    .slice(0, 10);
  const blocked = actionable.filter((candidate) => candidate.blockers.length > 0);
  const refining = items.filter((item) => {
    try {
      return readRequirements(item).meta.status === "refining";
    } catch {
      return true;
    }
  });
  const completed = items
    .filter((item) => item.record.status === "Done")
    .sort(
      (a, b) =>
        b.record.updated_date.localeCompare(a.record.updated_date) || b.id.localeCompare(a.id),
    )
    .slice(0, 10);
  return `# Local work tracker dashboard

> Generated from each work item's \`ITEM.yaml\`. Rebuild with \`work dashboard\`.
> Do not edit this file as a source of truth.

## Requirements still refining

${dashboardRows(refining.map((item) => ({ item, blockers: [] })))}

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
    const gitInfo =
      [record.git.branch, formatPr(record.git.pull_request)]
        .filter((value) => value && value !== "Not recorded")
        .join(" / ") || "Not recorded";
    return `| ${item.id} | ${record.status} | ${record.priority} | ${record.type} | ${escapeCell(detail)} | ${escapeCell(gitInfo)} |`;
  });
  return [header, ...rows].join("\n");
}

function workItemsReadme() {
  return `# Local work items

This ignored folder is managed by the work-tracker plugin. It stays on this
computer and is not copied through Git.

- Every work item is one \`WI-<number>-<name>/\` folder.
- Make a folder of your own and drag work items into it to group work that
  belongs together, such as \`security-and-permissions/\`. Nothing else is
  needed. Keep that area's notes and documents in there too; they are left
  alone. A group can hold groups.
- Never put a work item folder inside another work item folder. It would be
  invisible to every command. \`work validate\` reports it if it happens.
- Drag folders into \`archive/\` to get them out of the way. Nothing else is
  needed: sitting in that folder is what makes an item archived, and dragging
  one back out undoes it. Dragging a whole group in archives everything inside
  it. Archived items are hidden from \`work status\`, \`work next\`, and the
  dashboard. \`work status --archived\` lists them, and their ID numbers are
  never handed out again.
- \`ITEM.yaml\` owns structured status, dates, relationships, blockers, and Git evidence.
- \`REQUIREMENTS.md\` contains only owner-stated or owner-approved needs.
- \`STATUS.md\` is the readable handoff. \`HISTORY.ndjson\` keeps dated events.
- \`DASHBOARD.md\` is generated and rebuildable.

Run \`work status\` for orientation or \`work validate\` to check local records.
Validation covers archived items too.
`;
}

function validateConfig(config, errors) {
  if (config.schema_version !== 2) errors.push("Tracker configuration schema_version must be 2");
  if (!/^[A-Z][A-Z0-9]*$/.test(String(config.id_prefix ?? ""))) {
    errors.push("Tracker id_prefix must contain uppercase letters and digits");
  }
  if (!Number.isInteger(config.id_width) || config.id_width < 1 || config.id_width > 12) {
    errors.push("Tracker id_width must be an integer from 1 to 12");
  }
  if (typeof config.default_branch !== "string" || !config.default_branch.trim()) {
    errors.push("Tracker default_branch is required");
  }
  if (Object.hasOwn(config, "github") && config.github !== null) {
    errors.push("Local tracker configuration cannot contain GitHub mirror settings");
  }
}

function validateRecord(item, errors, warnings) {
  const record = item.record;
  if (item.missingRecord || record._invalid_missing_record) {
    errors.push(`${item.id}: ITEM.yaml is missing`);
    return;
  }
  if (record.schema_version !== 2) errors.push(`${item.id}: schema_version must be 2`);
  if (record.id !== item.folderId) {
    errors.push(`${item.id}: record id ${record.id} does not match folder id ${item.folderId}`);
  }
  if (typeof record.title !== "string" || !record.title.trim()) errors.push(`${item.id}: title is required`);
  if (typeof record.description !== "string" || !record.description.trim()) {
    errors.push(`${item.id}: description is required`);
  }
  if (!TYPES.includes(record.type)) errors.push(`${item.id}: invalid type ${record.type}`);
  if (!PRIORITIES.includes(record.priority)) errors.push(`${item.id}: invalid priority ${record.priority}`);
  if (!STATUSES.includes(record.status)) errors.push(`${item.id}: invalid status ${record.status}`);
  if (!isIsoDate(record.created_date)) errors.push(`${item.id}: malformed created_date ${record.created_date}`);
  if (!isIsoDate(record.updated_date)) errors.push(`${item.id}: malformed updated_date ${record.updated_date}`);
  if (!["Done", "Cancelled"].includes(record.status) && !(record.next_step ?? "").trim()) {
    errors.push(`${item.id}: exact next_step is required while ${record.status}`);
  }
  if (!Array.isArray(record.blockers)) errors.push(`${item.id}: blockers must be an array`);
  if (!record.relationships || typeof record.relationships !== "object") {
    errors.push(`${item.id}: relationships object is required`);
  } else {
    for (const type of RELATIONSHIPS) {
      if (!Array.isArray(record.relationships[type])) {
        errors.push(`${item.id}: relationships.${type} must be an array`);
      } else if (new Set(record.relationships[type]).size !== record.relationships[type].length) {
        errors.push(`${item.id}: relationships.${type} contains duplicates`);
      }
    }
  }
  validateRequirements(item, errors);
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
}

function validateRequirements(item, errors) {
  let requirements;
  try {
    requirements = readRequirements(item);
  } catch (error) {
    errors.push(error.message);
    return;
  }
  const meta = requirements.meta;
  if (!REQUIREMENTS_STATUSES.includes(meta.status)) {
    errors.push(`${item.id}: requirements status must be refining or finalized`);
  }
  if (!isIsoDate(meta.created_date)) {
    errors.push(`${item.id}: requirements created_date is malformed`);
  }
  if (!isIsoDate(meta.updated_date)) {
    errors.push(`${item.id}: requirements updated_date is malformed`);
  }
  if (meta.status === "finalized") {
    if (!isIsoDate(meta.finalized_date)) errors.push(`${item.id}: finalized requirements need finalized_date`);
    if (typeof meta.approved_by !== "string" || !meta.approved_by.trim()) {
      errors.push(`${item.id}: finalized requirements need approved_by`);
    }
    const missing = missingRequirementsSections(requirements.body);
    if (missing.length) errors.push(`${item.id}: finalized requirements are missing ${missing.join(", ")}`);
  }
  if (["Ready", "In Progress", "In Review", "Done"].includes(item.record.status) && meta.status !== "finalized") {
    errors.push(`${item.id}: status ${item.record.status} requires finalized requirements`);
  }
}

function validateCompletionEvidence(tracker, item, errors, warnings) {
  const record = item.record;
  if (record.status !== "Done") return;
  if (!record.git.landed_commit || !record.git.landed_date || !record.git.default_branch) {
    errors.push(`${item.id}: Done requires landed_commit, landed_date, and default_branch`);
    return;
  }
  if (!isIsoDate(record.git.landed_date)) {
    errors.push(`${item.id}: malformed landed_date ${record.git.landed_date}`);
  }
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
    errors.push(
      `${item.id}: false completion evidence; ${record.git.landed_commit.slice(0, 12)} is not in ${ref}`,
    );
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

function normalizeRelativePath(value) {
  return String(value).split(path.sep).join("/").replace(/^\.\//, "").replace(/\/$/, "");
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

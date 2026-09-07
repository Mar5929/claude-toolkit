# 270: Keep the active work item accurate

This is the build plan for GitHub issue #270. The approved requirements and
design decisions remain in the issue body. This file defines the smallest
Claude Code solution that meets them.

Read the issue before building:

```text
gh issue view 270 --repo Mar5929/claude-toolkit --comments
```

This revision follows a full repository audit and the linked
[Claude Code best-practice reference](https://github.com/shanraisshan/claude-code-best-practice?tab=readme-ov-file#how-to-use).
That repository is reference material, not a workflow to copy. The useful
principles here are: keep `CLAUDE.md` small, put shared behavior in rules, use a
skill for a repeatable action, use scripts for facts that must be enforced, and
use hooks only for narrow deterministic jobs.

## The decision

Use the parts that already own this behavior:

| Owner | Responsibility |
| --- | --- |
| `work-item-stages.md` | The tracker-neutral policy for orientation, meaningful progress, flexible stages, handoff, and completion |
| The existing `work` skill | How an agent operates the local-folder tracker |
| The existing `work` CLI | Local state, objective checks, rollback-protected writes, and completion events |
| The existing `handoff` skill | A conditional final tracker update before its memory review and prompt |
| GitHub Issues and Projects | Shared work-item state and the native issue-close event in GitHub mode |

Do not add a skill, rule, agent, task mirror, memory store, background worker,
transcript parser, or replacement lifecycle hook. Retire the late
`PostToolUse` stage reminder. The lifecycle rule already loads at session start,
and the local CLI supplies the hard check the rule cannot supply by itself.

The split remains: **the rule decides; the tracker stores and checks objective
facts.**

## Two tracker modes

### Local-folder mode

The local tracker owns `.work-items/`. It gets branch-scoped active-item state,
one central wrong-item check, type-aware requirements handling, consistent
progress writes, type-appropriate completion evidence, and an idempotent
completion event.

All related local writes use the existing tracker-wide lock and
`atomicBatchWrite`. Describe this accurately: it is rollback-protected against
ordinary command failures and tested failure injection. It is not a database
transaction and cannot promise recovery from a killed process between file
renames. `validate` and `reconcile` report recoverable damage.

### GitHub mode

Do not build a local mirror or a second GitHub tracker. The issue remains the
active work item.

The agent resolves the issue from an explicit issue number, an `issue-<number>`
branch, or an unambiguous pull-request link. Before a change, it reads the issue
number, title, body, current Progress log comment, stage label, and board status.
If zero or several issues are plausible, it asks Mike one short question.

GitHub cannot update the issue body, progress comment, label, and board field in
one transaction. Treat them as one logical update, read them back afterward,
and repair or report any partial failure. Never claim local atomicity for GitHub
mode.

An approved issue close is GitHub mode's machine-readable completion event.
Closing as not planned represents cancellation. Issue #269 may consume the
native close event later; it does not own or rewrite the issue.

## Session flow

### 1. Orient before substantial work

The lifecycle rule tells the agent to identify the tracker and active item
before substantial work.

In local mode:

1. Run `work active`.
2. Read the active item's requirements and status.
3. If the branch has no active item, select the clear item with
   `work active set ID` or ask Mike when the choice is unclear.
4. A conflicting item is a hard stop until the agent intentionally replaces it
   with `work active set ID --replace`.

In GitHub mode:

1. Resolve the issue from the request, branch, or pull request.
2. Run `gh issue view ISSUE --comments` and read the board state.
3. Reuse that verified issue number for later mutations.

Subagents may research or inspect. They return findings to the main agent and
do not claim, update, or complete the canonical work item independently.

### 2. Record meaningful progress when it happens

Meaningful progress includes:

- a stage or status change;
- an approval or rejection;
- a material choice, requirement answer, or constraint from Mike;
- a blocker appearing or clearing;
- a discovery that changes the plan;
- a direction change;
- a substantial requested outcome finishing; or
- the exact next step changing because the plan changed.

Routine commands, files opened, ordinary tests, small edits, and discarded
ideas stay out.

In local mode, an explicit `work update ID --note "..."` appends the same
meaning to `HISTORY.ndjson` and the Progress log. Stage, status, type, blocker,
requirements-approval, start, and finish actions also create a short progress
entry. A next-step-only or branch-only mechanical correction does not create
one unless `--note` is supplied.

In GitHub mode, settled requirements and decisions go in the issue body. The
single Progress log comment receives the short dated event. The agent preserves
Mike's meaning and never adds rationale, scope, conditions, or certainty he did
not provide.

### 3. Leave an exact handoff

Before `handoff` starts its memory review, it checks the tracker declared by the
project:

- local mode: read `work active`, update the exact next step, blockers or none,
  open decisions, and current stage/status, then run `work validate`;
- GitHub mode: update those same facts in the active issue and read the issue
  back;
- no tracker or no active item: skip safely and say so.

Then the handoff skill continues its existing memory review, wait, prompt draft,
verification, and display flow. It points to the lifecycle rule for the tracker
procedure instead of copying local and GitHub commands into the skill.

### 4. Complete or cancel honestly

Before completion, the agent gives Mike a short result, known gaps, and evidence
appropriate to the work. A clear earlier approval counts.

`Done` means the intended outcome was accepted. `Cancelled` means work stopped
without achieving it. Repository work also states whether its commit reached
the default branch. Git is evidence for repository work, not the universal
definition of completion.

The approved exception remains: the local tool does not refuse Done only
because an approver is missing. It records the missing approval, says so in its
output, warns in validation, and emits no approved-completion event. The rule
still tells the agent not to mark Done without Mike's approval.

## Local tracker changes

### A. Active item

Add `.work-items/ACTIVE.json`:

```json
{
  "schema_version": 1,
  "branches": {
    "issue-270-work-item-upkeep": {
      "item_id": "WI-014",
      "set_at": "2026-09-04T18:30:00.000Z"
    }
  }
}
```

Add these commands:

```text
work active
work active set WI-014
work active set WI-014 --replace
work active clear
```

Use `active`, not `session`, because the mapping survives sessions. `work start
ID` sets the current branch's active item when no mapping exists. If another
item is active, it refuses and points to the explicit replacement command.

One `assertActiveTarget` check covers every command that mutates a named item:

- requirements finalize or reopen;
- start;
- update;
- link or unlink, using the source item as the active target;
- finish;
- archive or unarchive.

Evaluate terminal finish calls before the active-target guard. An exact replay
of supplied, already-stored completion values returns a no-op. One narrow
exception then permits `finish ID --approved-by ...` to target an already-Done
item with no active mapping when it only fills missing completion approval.
Any differing terminal mutation refuses. This makes retries and late approval
reconciliation possible after the original finish has cleared the mapping,
without creating a general terminal-item bypass.

Reads, `add`, `init`, `migrate`, `dashboard`, `validate`, and `reconcile` do not
need an active target. Do not add a generic `--force` bypass. Intentional
replacement has one clear command.

Finishing or cancelling the active item clears its branch mapping in the same
write batch as the item update.

### B. Flexible type and approval gate

Accept a non-empty lower-case kebab-case custom type. Suggest these values:

```text
discovery
solution-design
build
data-load
repository-maintenance
research
task
```

Keep `bug` and `enhancement` valid for existing items. Add `--type` to `update`.
Do not backfill old items.

The hard requirements gate applies only to `build` and `data-load`. Discovery,
research, and solution design may be active while they create clarity. Legacy
`bug` and `enhancement` values remain valid, but they do not prove that
implementation is beginning; like repository maintenance, tasks, and custom
types, they follow the rule's risk-based judgment instead of a fail-closed code
gate.

Use this same matrix in mutation and validation paths. Today those paths have
separate status-wide checks; both must change together.

### C. Stage and status agreement

Stages are the normal path, not a conveyor belt. They may be skipped, repeated,
or revisited with a short meaningful reason.

Known stages derive an active status:

| Stages | Status |
| --- | --- |
| `01` to `02` | Backlog |
| `03` | Ready |
| `04` to `11` | In Progress |
| `12` to `14` | In Review |

`Done` is written only by `finish`; `Cancelled` is set intentionally. These
terminal states override the active-stage mapping. This removes the current
contradiction where the rule maps stage 14 to Done while `update` deliberately
refuses to do so.

A known stage with the wrong non-terminal status is a validation error. An
unknown stage is preserved and warned about, not invented into a known stage.
A missing stage remains valid for legacy items.

### D. One progress write path

Refactor item transitions through one helper that prepares:

- `ITEM.yaml`;
- `HISTORY.ndjson`;
- the Progress log in `STATUS.md`;
- `ACTIVE.json` when the active mapping changes; and
- `EVENTS.ndjson` when an approved completion occurs.

It then hands all changed files to one `atomicBatchWrite` call. Dashboard
regeneration remains derived output after the item write.

The progress entry uses the current stage, or `--` when no stage exists. A
blocker-only update is meaningful and must not disappear merely because no
stage or explicit note was passed.

### E. Type-appropriate finish

Add an optional completion block to `ITEM.yaml`:

```yaml
completion:
  approved_by: Mike Rihm
  approved_date: 2026-09-04
  evidence: Approved solution design in docs/designs/270-work-item-upkeep.md.
  recorded_at: 2026-09-04T18:45:00.000Z
```

Add finish options:

```text
work finish ID --evidence TEXT [--approved-by NAME] [--approved-date DATE]
  [--commit SHA] [--pr NUMBER_OR_URL]
work finish ID --approved-by NAME [--approved-date DATE]
```

Rules:

- Evidence is required when creating a completion block. The approval-only form
  is valid only when filling approval on an existing unapproved completion.
- `--commit` and `--pr` are optional because non-repository work must be able to
  finish without a fake commit.
- When a commit is supplied, verify and store whether it is in the default
  branch. The rule decides whether landing is part of this item's intended
  outcome; the tracker records the fact but does not redefine Done from Git
  state alone.
- When approval is absent, the tool follows the approved exception: it records
  the gap, reports it, and validation warns.
- A later `finish ID --approved-by ...` uses the narrow terminal exception to
  fill missing approval without an active mapping or a second completion.
- Repeating the same finish is a no-op: no duplicate history and no duplicate
  event.
- Cancelled work never emits `work_completed`.

Intermediate or outside approvals that are not completion approval remain
progress events. They do not overwrite the completion approver.

### F. Dependable completion event

Add `.work-items/EVENTS.ndjson`. It is an append-only outbox owned by the work
tracker. Each approved completion line contains:

```json
{
  "schema_version": 1,
  "event_id": "work_completed:WI-014",
  "occurred_at": "2026-09-04T18:45:00.000Z",
  "kind": "work_completed",
  "item_id": "WI-014",
  "title": "Keep the active work item accurate",
  "type": "solution-design",
  "status": "Done",
  "stage": null,
  "approval": {
    "approved_by": "Mike Rihm",
    "approved_date": "2026-09-04"
  },
  "evidence": "Approved solution design in docs/designs/270-work-item-upkeep.md.",
  "git": null
}
```

The stable event ID makes consumption repeatable. Emit it exactly once when the
item is both Done and approved, including when approval is added after an
unapproved Done. Check existing event IDs before appending. Issue #269 may read
the outbox and write to `knowledge/`; it never writes tracker state.

`stage` is either the recorded stage string or `null`. A valid legacy item may
therefore complete without inventing a stage.

### G. Objective validation

Extend `work validate` only for facts code can check:

- custom type syntax;
- the same type-aware requirements gate used by mutations;
- known stage and non-terminal status agreement;
- active-file schema, referenced item, and terminal-item mappings;
- completion-block shape, dates, and non-empty evidence;
- supplied Git reference shape, existence, and ancestry;
- missing approver on Done as a warning;
- event JSON, schema, references, required fields, and duplicate IDs.

Legacy items with no stage, completion block, active mapping, or event history
remain readable and are not backfilled. Do not add an invented staleness period.
Freshness is judgment for the rule and handoff review, not an objective error.

## Guidance changes

### Lifecycle rule

Update the shipped original
`plugins/project-init/library/rules/general/work-item-stages.md` and its
byte-identical installed copy `.claude/rules/work-item-stages.md` together.

Keep this as the single tracker-neutral authority. It owns:

- orientation before substantial work;
- active work versus implementation;
- the type-aware approval boundary;
- meaningful progress and faithful conversational capture;
- flexible lifecycle movement;
- local and GitHub update procedures;
- handoff state;
- acceptance, cancellation, and completion events.

Keep the rule unscoped. It must load at session start, before the agent knows
which files the active work will touch. Do not add `paths:` frontmatter and do
not repeat the rule in root `CLAUDE.md`.

Remove the rigid claim that stages 03, 11, and 12 always apply. Approval before
build or data load remains mandatory; pull-request stages apply only to
repository work.

### Local work skill and folder rule

Extend `plugins/work-tracker/skills/work/SKILL.md` with active-item orientation,
prompt capture, the type-aware gate, handoff, and completion. Keep detailed
command and record material in its existing references.

Trim
`plugins/project-init/library/rules/general/work-item-folders.md` to its local
folder ownership, grouping, archive, and file-protection rules. Replace its
duplicate requirements, pickup, handoff, and completion instructions with
pointers to the `work` skill and `work-item-stages.md`. This resolves the
existing six-part-requirements contradiction without adding another authority.

### Handoff skill

Add the conditional tracker step described above to
`plugins/session-skills/skills/handoff/SKILL.md` before its memory review. The
skill must work when the project uses local folders, GitHub, another tracker, or
no tracker. It does not assume `work-tracker` is installed.

### Hooks

Delete `work-item-stage-reminder` from the hooks library and this repository's
installed `.claude` copy and settings. It runs after the first selected edit,
misses shell changes, and reads no tracker state. Do not replace it with
`UserPromptSubmit`, `Stop`, or `SessionEnd` automation. Those would add constant
overhead or run at the wrong boundary.

Keep the second-brain `work-item-close` hook. It only raises the memory/spec
review before GitHub close or merge commands; it is not tracker state or the
completion event.

## Requirement mapping

| # | Requirement | Solution |
| --- | --- | --- |
| 1 | Identify and read the active item | Lifecycle orientation, local `ACTIVE.json`, and verified GitHub issue identity |
| 2 | Record a flexible work type | Kebab-case custom type plus common suggestions and `update --type` |
| 3 | Type guides approval without a rigid process | Shared type matrix; code gates build/data-load; guidance handles legacy, maintenance, task, and custom judgment |
| 4 | Keep current state and evidence accurate | Existing record plus central transition helper, validation, and read-back in GitHub mode |
| 5 | One action keeps related state consistent | One local write batch; one verified logical GitHub update with honest partial-failure handling |
| 6 | Record meaningful progress | Lifecycle rule plus one progress write path |
| 7 | Capture Mike's choices during conversation | Local note-to-progress behavior and GitHub issue-body/progress update |
| 8 | Preserve Mike's actual meaning | Lifecycle rule; one short question when materially unclear |
| 9 | Record reported outside approval honestly | Progress entry with approver and supplied conditions; no false verification claim |
| 10 | Exclude routine activity | Explicit progress rules and no automatic transcript/tool logging |
| 11 | Keep stages flexible | Type-aware rule; skip, repeat, and revisit with a meaningful reason |
| 12 | Leave exact next step and blockers | Conditional tracker-first handoff step |
| 13 | Summarize and ask before Done | Completion conversation in rule and skill; earlier clear approval counts |
| 14 | Distinguish Done, Cancelled, and landing | Type-appropriate finish, explicit cancellation, optional verified Git evidence |
| 15 | Do not invent legacy history | Optional new fields, no backfill, missing stage remains valid |
| 16 | Expose dependable completion | Idempotent local outbox and GitHub's native approved issue-close event |

## Approved-decision mapping

| Decision | Solution |
| --- | --- |
| Both tracker modes, split by layer | Local code and skill; tracker-neutral rule and native GitHub behavior |
| Design lives in the repository | This file under `docs/designs/`; delete it at stage 14 after the lasting specification is current |
| Build active-item tracking and retire the stage reminder | Local `ACTIVE.json`, GitHub verified identity, and complete hook retirement |
| Do not hard-block Done only for missing approval | Record and warn; emit no approved completion event until approval exists |
| No new skill or rule | Every change extends or trims an existing owner |

## Complete file inventory

### Work-tracker plugin

- `plugins/work-tracker/skills/work/scripts/lib/tracker.mjs`
- `plugins/work-tracker/skills/work/scripts/lib/common.mjs`
- `plugins/work-tracker/skills/work/scripts/work.mjs`, including its runtime version
- `plugins/work-tracker/tests/work-tracker.test.mjs`
- `plugins/work-tracker/skills/work/SKILL.md`
- `plugins/work-tracker/skills/work/references/command-reference.md`
- `plugins/work-tracker/skills/work/references/record-format.md`
- `plugins/work-tracker/README.md`
- both work-tracker plugin manifests

### Project-init plugin

- the shipped and installed `work-item-stages.md` pair
- `plugins/project-init/library/rules/general/work-item-folders.md`
- `plugins/project-init/library/rules/general/README.md`
- `plugins/project-init/skills/project-init/SKILL.md`
- `plugins/project-init/skills/project-init/references/setup-flow.md`
- `plugins/project-init/skills/project-init/references/work-tracking-choice.md`
- `plugins/project-init/skills/project-init/references/work-items-structure.md`
- `plugins/project-init/skills/project-sync/SKILL.md`
- `plugins/project-init/README.md`
- both project-init plugin manifests

### Session-skills plugin

- `plugins/session-skills/skills/handoff/SKILL.md`
- `plugins/session-skills/README.md`
- both session-skills plugin manifests

### Hooks-library plugin and installed copy

- delete `plugins/hooks-library/hooks/work-item-stage-reminder.mjs`
- delete `.claude/hooks/work-item-stage-reminder.mjs`
- remove its `.claude/settings.json` registration
- update `plugins/hooks-library/README.md`
- update `plugins/hooks-library/skills/hooks-library/SKILL.md`
- update both hooks-library plugin manifests

### Cross-cutting copies and catalogs

- top-level `README.md`, including both stage-reminder references
- `docs/toolkit-map.md`
- `.claude/toolkit-sync.md`
- `.claude-plugin/marketplace.json` description and metadata version

Do not change `.agents/plugins/marketplace.json`; no plugin is added or renamed.
After all content changes, bump each affected plugin's Claude and Codex manifest
version once. Keep every plugin README and the marketplace description aligned
with what ships.

## Tests

Write characterization tests before changing the existing stage, status,
progress, and finish behavior. Then test the final behavior:

- note-only, blocker, stage, status, type, requirements, start, and finish
  events update Progress and History as designed;
- branch-only and next-step-only mechanical updates do not create noise;
- every common and custom type follows the same gate in mutation and validation;
- known stages derive the listed status, non-linear movement works, and missing
  legacy stage remains valid;
- `start` selects the active item;
- every named mutator refuses the wrong active target;
- explicit replacement works and terminal work clears the mapping;
- linked worktrees share the correct active map through the primary tracker;
- non-repository work finishes without a fake commit;
- supplied Git evidence is checked and reported accurately;
- unapproved Done warns and emits no event;
- later approval works without an active mapping and emits one event;
- a legacy item with no stage emits an event with `stage: null` and is not
  backfilled;
- repeated finish creates no duplicate history or event;
- malformed active/event files and duplicate event IDs are reported;
- injected failure after at least one batch install leaves item, history,
  status, active state, and event state unchanged;
- existing items are never silently backfilled.

Run:

```text
node --test plugins/work-tracker/tests/work-tracker.test.mjs
node tests/link-check.mjs
node tests/orphan-check.mjs
node tests/installed-copy-check.mjs
node tests/knowledge-startup-check.mjs
claude plugin validate .
```

Record the baseline before implementation. Report a pre-existing repository
failure separately from a regression, and report Windows `spawn EPERM` or a
hung child-process run as unverified rather than passed or failed behavior.

## Build order

1. Add characterization tests for current tracker behavior.
2. Add active-item state and the central mutation guard.
3. Add flexible types, the shared approval matrix, corrected status mapping,
   and matching validation.
4. Add the single progress transition path.
5. Add type-appropriate finish, approval recording, and the idempotent outbox.
6. Update and deduplicate the lifecycle rule, local work skill, and folder rule.
7. Add tracker-first conditional handoff behavior.
8. Retire the stage-reminder hook without replacing it.
9. Update every reference, README, catalog, installed copy, and version.
10. Run focused and repository-wide validation, then present the result and
    known limits to Mike for implementation approval.

Nothing in this design authorizes implementation. Building starts only after
Mike approves this revised solution.

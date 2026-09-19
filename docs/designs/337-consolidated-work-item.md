# Guided work management delivery plan

Implementation plan, 2026-09-18. Mike approved the direction and asked for this
plan. The storage change is not implemented; this plan does not authorize a
migration of DragonFly or changes to the active Knowledge System design.
Required behavior is recorded in the
[guided work management PRD](../../knowledge/prds/toolkit-operating-system/guided-work-management.md#6-one-readable-work-item-record).

## Agent-led delivery: scoped implementation, 2026-09-19

This is the existing design record for issue #337. It now holds both the
agent-led delivery change and the separate pending record consolidation below.
Neither workstream silently authorizes or completes the other.

Mike confirmed the delivery intent and authorized an Astra lead with GPT-5.6
Sol helpers to implement, create a pull request, and merge the checked result.
The implementation task is `01a0bb10-0ba7-7171-988f-461c466da84c`, branch
`issue-337-agent-led-delivery`. The coordinating requirements task owns this
design, the PRD, and issue #337; helpers return findings to their lead.

### Scope and behavior

The [PRD's requirements 1-3](../../knowledge/prds/toolkit-operating-system/guided-work-management.md#choosing-guided-management)
own the approved intent. Offer delivery responsibility for multi-step or
cross-session work. Keep quick questions and edits lightweight. Save accepted
or declined choices for the particular goal in the existing canonical records
and recover the choice before offering again. Accepted work proceeds through
discovery, requirements, research, design, authorized implementation, testing,
and delivery, with the agent maintaining records and bringing product decisions
and applicable approvals to the owner.

Use the existing work plugin for the method, with shared lifecycle guidance
providing discovery and routing. The work-guide and requirements-helper methods
continue to own main-conversation guidance and requirements interviews. The
implementation lead reconciles those entry points and the package descriptions.
Reuse ordinary agent reasoning and existing storage. No new scheduler, tracker,
semantic grader, storage schema, or R6 migration is part of this change.

For the current local tracker, the preserved User notes in STATUS.md hold the
current choice and its goal, scope, date, and source. Existing history may record
the event but is not the only home for the current choice. In GitHub, use the
issue body's existing current-state section and the single Progress log. Other
trackers use their designated records. Read back saves and distinguish saved,
published, and failed updates. Recordless or unavailable-tracker cases must not
claim cross-session persistence; the implementation review must account for
them without silently creating a competing tracker.

This item's explicit Astra/Sol authorization allows its team to proceed. Whether
future accepted items automatically authorize helper selection remains open in
the PRD Notes. Preserve existing team and permission boundaries unless the owner
has already granted the applicable authority. Helpers cannot approve the work.

### Delivery sequence and evidence

1. Reconcile the approved meaning into this design, the PRD, and issue #337.
2. Implement the work-plugin method and its shared/session entry points in the
   implementation branch; align managed copies and release metadata.
3. Check offer timing, accepted resume, declined resume, substantial-growth and
   explicit-request exceptions, routine upkeep, product/approval boundaries,
   and failed-save recovery. Check local and shared-tracker continuation.
4. Run independent review and relevant tracker tests, all four repository
   checks, plugin validation, and knowledge checks for changed knowledge.
   Static instruction checks alone do not prove fresh-agent behavior; report
   observed scenarios and any untested hosts separately.
5. Create the PR, review the final diff, merge under the recorded authorization
   after merge-safety checks, and verify remote publication. Record rollout and
   acceptance of the complete experience separately. Review both manuals;
   publish only affected guidance with its actual delivery state.

## Consolidated work-item record: pending R6 scope

The remaining sections preserve the approved single-record direction and its
implementation plan. Current runtime still uses separate records. The concrete
proposal below selects the format, edit method, and migration recovery approach
for review. Implementation follows only after the applicable build approval.
The later R1 shipping authorization does not extend itself to this work or to
a DragonFly project migration.

## Template

One local `WORK-ITEM.md` owns item state, roadmap, tasks, questions, decisions, history,
and item-specific requirements. `DESIGN.md` remains separate and is created
when design work needs it. Existing authoritative workbooks or shared PRDs
remain linked sources; do not copy their requirements into a competing record.

Use a bold page title so the requested first-level headings are the sections.
For GitHub, Jira, Linear, and other external trackers, store this same template
in the work item's description/body. Preserve its sections, order, and meaning
using the editor/API's supported formatting; do not require identical Markdown
syntax. Native tracker fields own status and assignments; reference those fields
rather than maintaining competing values. Link the separate design from Overview.
The description holds the item's current content, not a local WORK-ITEM.md copy
or a collection of separate task, requirements, status, and notes documents.

```markdown
**WI-014: Security and permissions**

# Overview

Purpose: ...
Status: ...
Stage: ...
Owner: ...
Session task: use work active for this branch
Next action: ...
Blockers: None / ...
Requirements approval: Proposed / approved by ... on ...
Design: [Working design](DESIGN.md)
Related work and governing sources: ...

## Open questions

- Q-01 — Question: ...; answer from: ... / unknown; affects: ...; status: open.

## Context and notes

Only useful context needed to continue.

# Roadmap

## STAGE-001: Organize and review

- Outcome: Files are organized and reviewed.
- Acceptance: Organization and review tasks have accepted completion evidence.
- Planning status: planned
- Child work items: None

Tasks below identify the phase they fulfill. Progress is derived from those
links and each task's status.

# Tasks

## TASK-001: Organize the work-item files

- Status: In progress
- Roadmap phase: STAGE-001
- Responsible: ... / unassigned
- Depends on: None
- Current position: ...
- Next action: ...
- Objective: ...
- Instructions: ...
- Constraints: ...
- Inputs: ...
- Deliverable: ...
- Acceptance: ...
- Approval required: ...
- Completion evidence: ...

## TASK-002: Review the file organization

- Status: Pending
- Roadmap phase: STAGE-001
- Reviewer: Codex
- Depends on: TASK-001
- Next action: Review after organization is complete.

# Recent History

<details>
<summary>Decisions and meaningful progress</summary>

- YYYY-MM-DD — Decision or progress; source/person; proposed or approved;
  affected requirement or task. Link to the current content.

</details>

# Requirements

## Goal and scope

...

## Required behavior

### R-01 — ...

- ...

## Acceptance criteria

- ...

## Constraints and exclusions

- ...
```

Required sections remain present even when empty, using None or Not yet
defined. Add requirement subsections freely. Task IDs and requirement IDs stay
stable when text or order changes. Completed tasks retain status and evidence;
they do not disappear. Roadmap is a required top-level section before Tasks.
It holds ordered phases or milestones, intended outcomes, status, and links to
the tasks or child items that carry them out. Tasks holds execution detail;
link from the roadmap instead of copying it. Keep both consistent as work moves.
Keep questions, blockers, and next steps outside collapsed history. Where a
tracker does not render details blocks, use a normal visible history list.

## Capture and continuation

Read Overview, Roadmap, active Tasks, and relevant Requirements first; read DESIGN.md
when working on design. Save meaningful updates before moving past the topic,
then reread the exact section. Unanswered questions are saved immediately with
who must answer. An answer updates the question and affected requirement or
task; history records only the useful decision context. Saving is not approval.

The trigger is meaningful human input, not the end of an interview or session.
Capture each decision, answer, requirement, design choice, or constraint in its
existing authoritative home immediately, preserving its approval state. Complete
the normal publication step before moving past the topic: check, commit, push,
and verify authorized Git-tracked documentation; update and reread an external
issue's description/native field; or save and reread a Git-ignored local record.
Retain and report a failed save for recovery rather than claiming publication.

Instruction ownership already exists: the shared
[work-item-stages rule](../../plugins/project-init/library/rules/general/work-item-stages.md#capture-during-the-conversation)
owns capture timing and routing, and
[knowledge-direct-commit](../../plugins/project-init/library/rules/general/knowledge-direct-commit.md)
owns publication of authorized Git-tracked documentation. Existing work-guide,
requirements, and design methods apply those instructions. Reconcile their
storage references when R6 ships; do not introduce another competing save rule.

Working design choices, design questions, and design refinement stay in the
design's bottom Notes, with an item-level task pointing there. Other tasks and
questions use the sections above. Standalone shared PRDs keep their own Notes.
No separate item requirements Notes file, status file, task file, or start page
is introduced. Current working memory links to the item rather than copying it.

## Concrete R6 implementation proposal

Proposed on 2026-09-19 after Mike asked this task to prepare the implementation
proposal for review. This is an existing-system change, not a new tracker.
Mike should be able to read and edit one item, while an agent updates that same
record promptly and another session resumes it without reconstructing scattered
files. The approved five sections and separate design stay as specified above.

### Existing parts and readiness

The R6 requirement, its September 19 clarification, and the existing plan give
sufficient direction for this proposal. Remaining choices below are technical
recommendations, not new product requirements or claims of owner approval.
R1's separate open helper-selection question does not block this proposal.

Project evidence inspected on 2026-09-19 at main `d2be203`:

- [Record format](../../plugins/work-tracker/skills/work/references/record-format.md):
  the five current item files, nested/archive discovery, separate relationships,
  branch-scoped active selection, and completion-event behavior.
- [Tracker](../../plugins/work-tracker/skills/work/scripts/lib/tracker.mjs):
  `scanItems`, `readRequirements`, `readRoadmap`, `writeItemFiles`,
  `writeRoadmapUpdate`, `writeLinkedItems`, and `finishItem` own current reads,
  writes, approval checks, and transitions.
- [Shared file helpers](../../plugins/work-tracker/skills/work/scripts/lib/common.mjs):
  `withLock` serializes tracker commands; `atomicWrite` replaces a whole file;
  `atomicBatchWrite` rolls back caught errors across several files. Its temporary
  backups are not a persistent migration backup or a process-crash transaction.
- [Command entry point](../../plugins/work-tracker/skills/work/scripts/work.mjs):
  existing commands and JSON responses can keep their meaning behind a new
  document reader/writer. Existing `work migrate` imports older tracker roots;
  it is not the proposed in-place consolidation command.

Review distinctions: the five headings are a document contract, not five new
files. Shared PRDs/workbooks remain linked authorities. A branch's selected
task remains in ACTIVE.json; a single stored Current task value would contradict
simultaneous branch selections. The template now points to that selection.
A finished child/task still cannot approve or finish its parent.

### 1. Readable fields, one copy of each value

Recommend normal Markdown headings, labeled fields, and lists as the actual
record. Do not place a second complete YAML/JSON object in frontmatter or an
HTML comment and generate the visible page from it. Both agents and commands
read the visible content.

Add one format marker, `<!-- work-item-format: 1 -->`, before the page title.
The bold title holds the item ID and title. The five first-level headings are
required once, in the stated order. Recognize them outside fenced code and
HTML comments. Requirements can contain arbitrary lower-level headings,
bullets, tables, examples, and details blocks; these are not tracker commands.

Use one published field dictionary in the record-format reference. A recognized
field is a full line `Label: value`, optionally prefixed by `- ` as in the task
example. Text may continue on indented lines; list entries are indented bullets.
Recognize a label only in its defined section, outside code, comments, and
quoted examples. Reject duplicate recognized fields in the same record, bad
values, duplicate IDs, missing required sections, or inconsistent relationships
before changing anything. Unknown fields and prose remain intact.

| Content | One authoritative location |
| --- | --- |
| ID/title | Bold page title; validate ID against its existing folder |
| Purpose, type, priority, status, lifecycle stage, dates, next step | Overview labeled fields |
| Requirements status and actual approval person/date | Overview approval fields; no approval copied into task state |
| Blockers, relationships, Git evidence, completion approval/evidence | Named Overview subsections with labeled entries; retain existing field meanings |
| Delivery choice, its goal/scope/source/date, unanswered questions, owner notes | Overview context/questions; migrate preserved User notes without guessing new structured values |
| Roadmap stage fields and child links | One `## <stage ID>: <title>` block per stage inside Roadmap |
| Task fields, dependencies, inputs, constraints, acceptance, approval, continuation | One `## <task ID>: <title>` block per task inside Tasks |
| Complete dated history | Recent History, with optional collapse |
| Item-specific requirements | Requirements body, or a link to its designated shared authority |

The template uses stage blocks so outcomes, acceptance, child links, and owner
prose do not have to fit escaped table cells. Tasks identify their stage; the
stage does not maintain a competing list of those same task relationships.
Keep existing STAGE/TASK IDs during conversion. Optional fields remain optional;
missing old tasks are reported for reconciliation rather than invented.

Every existing record field must have a tested mapping before conversion can
apply, including nested blocker IDs, all relationship types, completion and Git
proof, task approvals, roadmap planning status, and unknown extensions. Store
unknown legacy fields once in a labeled Imported fields subsection; flag an
ambiguous meaning instead of using that subsection to hide competing truth.

Stage planning status remains distinct from progress: derive progress for display
from task and linked-child states without adding another independently editable
status. This display never advances lifecycle status or grants approval. Preserve
all dated history values; represent imported action/time/note and extra fields in
readable entries without truncation, invented dates, or inferred approval.

### 2. Preserve text when commands edit it

Add a shared `work-item-document.mjs` reader/patcher beside tracker.mjs. It returns
the existing in-memory item/requirements/roadmap shapes plus source ranges for
fields and sections. Existing validation continues checking those shapes. This
keeps format parsing separate from lifecycle and approval decisions.

A command reads the latest document while holding the existing tracker lock,
validates it, and replaces only the affected field/section ranges. A task update
must not reformat requirements, owner notes, another task, or collapsed history.
Preserve newline style, Unicode, links, comments, and untouched bytes. Add one
history entry for the successful change, not one copy in a second history file.

Before replacing the file, compare its exact content hash with the version read.
If it changed, leave it intact and return a conflict with the unsaved intended
update. Do not guess which prose wins. Write the candidate to a temporary file,
parse/validate it, use the existing atomic replacement, then read back the result.
Regenerate the optional dashboard only after canonical writes succeed.

For agents editing prose, add `work edit <ID> --input <candidate-file>
--expected-hash <hash>`. It uses the same lock, validation, approval checks, and
readback path. A candidate is temporary input, never another authoritative item.
A full-document edit cannot bypass a guarded status, approval, completion, or
relationship transition; those changes still use the existing commands.

Normal text-editor changes remain readable and editable. Direct filesystem
writes do not honor the tracker lock: a last-moment external write can race any
check-and-replace operation. Do not promise perfect protection from uncooperative
writers. Agents use the guarded edit path and coordinate with human editors;
check observed conflicts and never silently overwrite them.

Keep ACTIVE.json and EVENTS.ndjson as existing root infrastructure, not copies
of item truth. Preserve each branch's selected item/task and existing stable
completion-event IDs. For operations touching two linked items or item plus
active/event state, extend the batch helper with a small temporary recovery
manifest and old/new hashes. On restart, finish or restore the same operation
only when each affected file matches its recorded old or new content; otherwise
stop for reconciliation. Never emit a second completion event on retry. This
manifest lives in `.work-items/.recovery/transactions/<operation-id>/` and is
operational recovery state, removed after verified completion. Flush the saved
manifest and replacement data before installing files. Check pending operations
under the tracker lock before allowing further mutations; report incomplete
recovery on read-only commands. Recovery cannot overwrite an unexpected hash.

### 3. Explicit conversion with preserved originals

Add `work consolidate <ID>` as a read-only preview. It does not overload the
existing older-root import command. `--apply --preview-hash <hash>` applies the
reviewed conversion for that item; reject it if any source changed. The preview
shows the proposed document, field/source mapping, link changes, conflicts,
retired filenames, and backup location. Start with a single item so unrelated
projects/items cannot be converted by an installation or refresh.

Back up exact original bytes under the shared local tracker at
`.work-items/.recovery/consolidation/<run-id>/<item-id>/`, with a manifest naming
original relative paths and hashes. Exclude `.recovery` explicitly from item
scanning, ID allocation, dashboards, and validation of live items. Keep backups
until explicitly cleaned up; they are historical recovery copies, not live
records. Keep the tracker Git-ignored and never push these local backups.

Apply under the tracker lock in this order:

1. Recheck the preview/source hashes; preserve every original before changing
   live files. Do not follow symlinks outside the tracker or overwrite a backup.
2. Prepare and validate WORK-ITEM.md in the recovery directory. Compare all
   normalized fields, IDs, approvals, full history, tasks, and owner content
   against the preview. Missing TASKS.yaml is valid legacy state, not empty
   invented tasks. Unknown/custom files and separate design stay in place.
3. Record the prepared operation, install the document, and read it back.
   Only then retire the replaced canonical files from the live item. While
   both forms exist, ordinary mutations stop and point to recovery.
4. Verify only the new canonical format is live, preserve nesting/archive
   position and branch selections, repair only previewed local links, and mark
   the operation complete. Rebuild the dashboard and validate the tracker.

Fold preserved STATUS.md User notes into Overview; keep all progress/history
entries with their provenance, without attempting semantic deduplication.
Preserve any owner edits outside generated areas or stop when ownership is
unclear. Convert requirement heading levels only as needed to nest them beneath
Requirements, show those changes in preview, and map old file/heading links to
their new destinations. Inventory incoming links within the tracker; report
outside references that cannot be verified rather than silently breaking them.
Shared PRDs and designated workbooks remain links, with their supplied approval
evidence preserved; conversion never treats an unapproved source as approved.

`work consolidate <ID> --recover <run-id>` resumes an interrupted operation
using recorded hashes and phases. A completed repeat is a no-op.
`--rollback <run-id>` restores the exact originals only when the current files
still match the conversion result. If later edits exist, preserve them and
report the conflict; rollback never overwrites newer work. Restart tests kill
the process after each phase, rather than only raising caught exceptions.

Newly created items use WORK-ITEM.md after the release. Unconverted items remain
readable and keep their existing commands until explicitly converted. A migrated
item never recreates the retired files. Each item has exactly one selected
format; mixed formats block mutation. Existing `work migrate` keeps its current
older-root import scope, with a separate preview required for consolidation.
Document that compatibility behavior and do not silently chain conversions.

### 4. External descriptions and prompt saves

Use the same five logical sections in the external description, with its native
formatting and status/assignment fields. The local parser and format marker are
not a new requirement on Jira, GitHub, or Linear. Existing connectors/CLI tools
perform the updates; this release does not add new service adapters.

Before changing a description, retrieve its latest text and relevant native
fields. Merge the authorized update into its proper section, preserving other
people's changes. Use a revision condition when the available API supports it;
otherwise reread just before writing and verify immediately afterwards, while
reporting that this is not guaranteed atomic conflict prevention. A timeout is
an uncertain result: reread before retrying. Do not append a duplicate history
entry or claim a failed update was shared.

Requirements and other item content update in the description; design updates
remain in the separately linked design. A shared PRD/workbook remains its named
authority. Current state must not depend on hunting through comments. Existing
tracker-required progress comments may link the description's update without
becoming a competing requirements or status store. Converting this repository's
own issue layout is an explicit later use of the accepted template.

Keep the existing capture/publication instructions. On meaningful human input,
update the actual destination before moving to a different topic, use its normal
save route, and verify it. If publication fails, retain the pending change and
state exactly what is saved locally versus shared. Tests cover successful
updates, denied writes, uncertain responses, and concurrent changes; a read-only
GitHub fixture does not prove external update/recovery behavior.

### 5. Build boundaries and evidence

Implement in this order: document reader/patcher and field mappings; tracker
read/write compatibility and guarded edit; conversion/recovery; instructions,
manuals and setup/sync; then installation and authorized pilot verification.
Keep each step reviewable in one implementation branch. No live project is a
migration test fixture, and DragonFly still needs explicit migration authority.

The acceptance checks below remain required. Add focused regressions for every
legacy-field mapping, unchanged-byte preservation, nested Markdown, two branch
task selections, unchanged parent approvals, mixed-format refusal, stale-preview
refusal, kill/restart at every conversion/batch boundary, and rollback after
later edits. Exercise the external flow in disposable authorized items and
identify exactly which services and installed hosts were tested. Full tracker
and repository checks establish code integrity; fresh-session scenarios must
separately show correct capture and continuation. Neither is evidence for an
untested service or machine.

Manual review for this proposal: neither operating manual needs to describe new
runtime behavior yet. Their current save routing still applies. Update both
manuals' affected storage/continuation explanations with implementation, together
with the existing documentation inventory below.

## Implementation sequence

1. **Define and test the record format.** Build one shared template/parser in
   the existing work-tracker library. Store all authoritative item metadata in
   WORK-ITEM.md, including any minimal version marker. Use explicit labels and
   stable headings, not inference from prose. Reject malformed or duplicate
   required sections without rewriting content. Preserve owner prose, nested
   requirement headings, and details blocks through round trips.
2. **Change tracker reads and writes.** Update `tracker.mjs`, `common.mjs` as
   needed, and `work.mjs`: discovery, add, status, task/roadmap operations,
   requirements approval, completion, validation, archive, and reconciliation.
   Retain command meanings and JSON output compatibility where possible.
   Replace ITEM.yaml, TASKS.yaml, REQUIREMENTS.md, STATUS.md, and per-item
   HISTORY.ndjson as live authorities. Preserve complete existing history in
   the Markdown history section; do not silently truncate it to recent entries.
   Root active-item mappings, completion-event delivery state, locks, and
   generated dashboards may remain infrastructure; none duplicates item truth.
3. **Protect edits.** Both manual section edits and CLI updates must work.
   Reread before writing, detect intervening changes, and use the existing lock
   and safe-write mechanisms. Do not regenerate the whole document from an old
   snapshot or overwrite unrelated sections. Preserve completion-event
   deduplication and branch-scoped active-item protections.
4. **Migrate explicitly.** Provide preview and apply paths. Inventory legacy
   records, status notes, roadmap/tasks, approval evidence, custom files, and
   designated external requirements. Show conflicts instead of choosing by
   timestamp. Preserve IDs, links, nesting, archive state, and unknown owner
   content. Back up exact originals outside the live item scan before replacing
   them; verify readback before retiring old canonical files. Support restart,
   repeated migration, and rollback. Never bulk-migrate projects on install.
   Old records stay readable until explicit conversion; mixed legacy/new
   authorities in one item block mutation with an actionable message.
5. **Align all instructions and documentation.** Use the inventory below and
   search active source for every retired filename and old routing instruction.
   Update behavior-bearing guidance in the same implementation release; do not
   make current manuals claim the new storage already exists.
6. **Verify and roll out.** Run the checks below, review the concrete migration
   preview, publish through the authorized personal account, refresh installed
   plugins, and run project-sync. Validate the installed source/rule versions
   before an authorized pilot migration and fresh-session exercise. DragonFly
   remains unchanged until its migration is explicitly authorized.

## Documentation and instruction inventory

| Area | Required reconciliation |
| --- | --- |
| Work tracker | README, work skill, record-format and command-reference; shared template, CLI help, fixtures and tests |
| Project rules | Shipped and installed work-item-stages, root CLAUDE routing, relevant catalogs |
| Session skills | work-guide, requirements-helper, solution-design/template/helpers, delivery-reviewer, spec-check, handoff; remove separate-record assumptions |
| Setup and sync | project-init setup flow, project-sync conflict checks and migration guidance; refresh alone never silently converts records |
| PRDs | guided-work-management owns this pending requirement; reconcile guided-delivery, work-item-upkeep, toolkit-operating-system and affected Knowledge System references at delivery |
| Manuals | toolkit-manual plus shipped and installed knowledge-manual routing: item-specific requirements/tasks/status in the item; shared PRDs and design keep their own content/Notes |
| Managed copies | Locate manual source, installed copies and hash/version checks; change and validate together, including affected manifests and release notes |
| Other project docs | docs/toolkit-map, designs entry point, top-level/plugin READMEs and examples where their explanations or links change |

Historical transcripts and archives remain historical. Old filenames are valid
in migration guidance and fixtures when clearly labeled. Coordinate Knowledge
System edits with the Compare 269 design documents task; never overwrite that
task's active draft from this worktree.

## Acceptance checks

- New item creates one WORK-ITEM.md; no competing per-item records. DESIGN.md
  is optional until needed. All five top-level sections have the same order:
  Overview, Roadmap, Tasks, Recent History, Requirements. Updating a task keeps
  its roadmap phase accurate without inventing approval or completing other work.
- In an external tracker, use its description for the same five template
  sections and link the separate design. Confirm meaningful human input updates
  the actual content and is saved/read back before moving past the topic. Check
  supported formatting without creating a local mirror or duplicate field truth.
- Directly edit prose and nested Requirements, then update a task via CLI:
  unrelated text and formatting survive. Test malformed/duplicate headings,
  details blocks, Unicode, and Windows line endings.
- Capture organize-then-Codex-review tasks; preserve dependency, question owner,
  answer, approval state, and exact resume point across later status updates.
- Migrate nested/archived items, missing TASKS.yaml, custom notes and designated
  workbooks. Preserve meaning and IDs; surface contradictory copies. Test
  interruption recovery, repeat application, rollback, and concurrent changes.
- Preserve active-item guard, requirement-approval gate, links, completion
  events, history, archive behavior, and structured command results.
- Fresh Claude and Codex sessions find the same item, save a new request in the
  correct section, and resume without recreating the retired files. Test a
  failed save; it must be reported as unsaved. Static checks alone do not prove
  this behavior.
- Run tracker regression tests, repository link/orphan/installed-copy/startup
  checks, plugin validation, and knowledge rebuild/checks. Verify both manuals
  and active instructions agree before claiming rollout complete.

## Notes

- Scoped release, 2026-09-19: PR #359 merged at `df9d2a0` under Mike's
  implementation/merge authorization. Work-tracker 2.7.0, session-skills 1.12.4,
  project-init 0.75.0, and marketplace 0.118.0 contain the delivery method and
  integration. The [committed scenario guide](../../plugins/work-tracker/tests/delivery-scenarios.md)
  owns reproducible behavior evidence and limitations. Fresh Codex CLI/Sol
  source fixtures are distinct from installed-host rollout, Claude, growth
  re-offer, partial local writes, and external mutation recovery. Issue #337
  owns current verification/rollout status. R6 remains unbuilt.

- Clarification approved by Mike in the handoff-review task, 2026-09-19:
  the external issue description holds the same template as WORK-ITEM.md,
  with separate linked design. Significant human decisions/input are captured
  immediately and saved through the applicable route. The existing capture and
  documentation-publication rules own that instruction; R6 must preserve it.

- Approved direction: Mike, 2026-09-18, this Work-tracker conversation: one
  consistent Markdown work item, separate design, clear top-level sections.
- Planning choices: bold page title, Tasks rather than Open Tasks (so completed
  work remains visible), collapsible Recent History, open questions in Overview.
- Clarification: Mike confirmed Roadmap belongs in this same file as its own
  top-level section immediately before Tasks, replacing the initial proposal
  to group roadmap information within Tasks.
- Proposal prepared in the handoff-review task on 2026-09-19 under Mike's
  "Okay, go" to preparing one concrete proposal. The section above recommends
  visible Markdown fields, source-preserving guarded edits, explicit per-item
  conversion, and excluded local recovery backups. These choices are proposed,
  not approved implementation or permission to migrate existing projects.
- Review: checked the proposal locally against R6, existing R4/R5 behavior,
  the merged R1 choice storage, and tracker source. No runtime code changed;
  no migration, independent-agent review, or behavior-test result is claimed.
  Main limitation to retain: direct editor writes and external APIs without
  revision checks cannot guarantee conflict-free concurrent edits.
- Publication correction, 2026-09-19: PR #356 merged the document-continuity
  guidance and this consolidation plan on 2026-09-18. The plan is on main;
  consolidation runtime and project migrations have not started.
- Agent-led delivery: the named implementation task completed code, checks,
  PR, and authorized merge; it retains local cleanup/installation reporting.
  This task owns canonical records. Resume the future helper-authority question
  from PRD Notes and remaining rollout/verification from issue #337.
- Consolidation resume: Mike reviews the concrete R6 proposal above. The next
  decision is whether to approve implementing that proposal in an isolated
  branch through a reviewed PR. Preserve separate merge, rollout, and project
  migration authority. T3 remains awaiting design/build decision; T4 has not
  started. If approved, begin the document reader/patcher and field-mapping
  tests, then follow the sequence above. Never push through the work account.

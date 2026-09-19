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
implementation plan. Current runtime still uses separate records. Review the
format/parser and migration-backup choices, then implement parser, CLI and
explicit migration, documentation, and installation verification under the
applicable authorization. The later R1 shipping authorization does not extend
itself to this work or to a DragonFly project migration.

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
Current task: T-01
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

| Phase | Intended outcome | Status | Tasks or child items |
| --- | --- | --- | --- |
| P-01 — Organize and review | Files are organized and reviewed | In progress | T-01, T-02 |

# Tasks

## T-01 — Organize the work-item files

- Status: In progress
- Roadmap phase: P-01
- Responsible: ... / unassigned
- Depends on: None
- Current position: ...
- Next action: ...
- Inputs and completion evidence: ...

## T-02 — Review the file organization

- Status: Pending
- Roadmap phase: P-01
- Reviewer: Codex
- Depends on: T-01
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
- No owner decision blocks preparing this plan. Implementation review must
  settle the exact parser/metadata representation and backup location without
  creating a second authoritative record.
- Publication correction, 2026-09-19: PR #356 merged the document-continuity
  guidance and this consolidation plan on 2026-09-18. The plan is on main;
  consolidation runtime and project migrations have not started.
- Agent-led delivery: the named implementation task completed code, checks,
  PR, and authorized merge; it retains local cleanup/installation reporting.
  This task owns canonical records. Resume the future helper-authority question
  from PRD Notes and remaining rollout/verification from issue #337.
- Consolidation resume: review the existing R6 plan and settle format/parser
  and backup details, then confirm build scope before runtime work. Sequence
  parser, CLI/migration, documentation, and installation verification. Its
  approved direction and planning are not evidence of implementation or
  authority to migrate DragonFly. Never push through the work account.

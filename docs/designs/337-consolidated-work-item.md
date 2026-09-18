# Consolidated work-item record

Implementation plan, 2026-09-18. Mike approved the direction and asked for this
plan. The storage change is not implemented; this plan does not authorize a
migration of DragonFly or changes to the active Knowledge System design.
Required behavior is recorded in the
[guided work management PRD](../../knowledge/prds/toolkit-operating-system/guided-work-management.md#6-one-readable-work-item-record).

## Template

One local `WORK-ITEM.md` owns item state, roadmap, tasks, questions, decisions, history,
and item-specific requirements. `DESIGN.md` remains separate and is created
when design work needs it. Existing authoritative workbooks or shared PRDs
remain linked sources; do not copy their requirements into a competing record.

Use a bold page title so the requested first-level headings are the sections.
The same headings and order apply to external issue bodies; native tracker
fields own status and assignments there, without a competing local mirror.

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
- Next: review this plan, implement format and parser first, then CLI and
  migration, then documentation and installation verification. Runtime work and
  project migrations have not started. GitHub publication is still pending the
  personal account; do not switch accounts or push through the work account.

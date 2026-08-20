# Memory system v2: build status

One glance answers three questions: where are we, what comes next, what is
blocked. [implementation-plan.md](implementation-plan.md) defines the work
items. This file tracks their state. Mike does not maintain this file. The
sessions doing the work do.

## Rules for keeping this file true

- The pull request that lands a work item updates that item's row and the
  "Where we are" section in the same pull request. A row says "merged" only
  when its pull request is actually merged to `main`.
- Before picking an item, also check the `Claude-Toolkit-Project` board and
  open pull requests. An open issue or pull request for an item means another
  session owns it. The board issue is the claim.
- Edit only your own item's row and the "Where we are" section. Never reorder
  the table. Parallel sessions merge cleanly only if edits stay narrow.
- If you find this file contradicting `main`'s real state, fix it in your
  pull request and say so in the Notes column.

## Where we are

- Plan approved by Mike and merged 2026-08-20.
- Phase 0 is built on branch `claude/memory-redesign-impl-t5e3go`, committed
  through `97cb988`, and open as draft pull request #210. Nothing is merged.
  Mike has approved none of it. The whole run gets one review at that pull
  request.
- This run is autonomous. The per-item board issues, refinement sessions, and
  per-item owner approvals the plan calls for are collapsed into that one
  review.
- Phase 1 is built and audited, committed through `2205029`. Five plugin
  harnesses pass, 416 checks in total, and the four repo checks are green.
  No v1 runtime file was touched, so D2 holds.
- second-brain is at 3.7.0 in both manifests and the marketplace is at 0.77.0.
- Next item: P2-1.
- Blocked: nothing.
- Carried into Phase 2, decided this run and needing Mike's review: the
  `updated` date in `knowledge/current.md` front matter is an invented field.
  Neither authority document names a place to hold the date FR-116 compares
  against, so Phase 1 added one. `memory.mjs update-current` must write it.
- Also carried: `memory.mjs` reports an unknown operation or a bad flag as
  `record/schema-invalid`. `contracts.md` now defines `cli/invalid-invocation`
  for that, and a Phase 2 item has to switch it over.

## Work items

Status values: not started, in review, blocked, merged. "In review" means the
work is built on the branch above and waiting for Mike at pull request #210.
No row may say "merged" until its work is actually merged to `main`.

| Item | What it does | Status | Proof | Notes |
|---|---|---|---|---|
| P0-1 | Continuity correction in the requirements document | in review | PR #210, `97cb988` | FR-102 and FR-103 rewritten. New continuity FR-114 through FR-117. Two acceptance bullets rewritten, two added. Also rewrote FR-012, which held a tracker-ownership variant that contradicted the corrected FR-102. Neither rejected phrase survives a grep. |
| P0-2 | Continuity correction in the architecture document | in review | PR #210, `97cb988` | Section 10.6, ADR-032, ADR-006, the required tree, section 7.3, and the dependent spots rewritten. `knowledge/current.md` is in the required tree and the tracker-adapter row says optional. AT-35 and AT-36 rewritten, AT-37 adjusted, AT-43 and AT-44 added. Added `memory_update_current` to section 16.1 and extended sections 13.3 and 13.5. |
| P0-3 | Scope and privacy design | in review | PR #210, `97cb988` | Scope and privacy requirements added through FR-131, with ADR-037, ADR-038, AT-45, and AT-46. Section 21 now carries an enforcement design, not just principles. |
| P0-4 | Reconcile budget, pin registry home, gold set home, and views | in review | PR #210, `97cb988` | Budget settled at 10 KB, meaning 10240 bytes, covering the current and recent blocks. New section 7.3.1 names `knowledge/memory/pins.md` and `knowledge/retrieval-gold-set.md` as optional canonical files and closes that category. View-generator row reconciled: it never writes `current.md`. |
| P0-5 | Supersede the stale parallel spec | in review | PR #210, `97cb988` | `knowledge/specs/memory-system-v2.md` marked superseded in place, with a pointer to the authority pair. Moving it to `archive/` is still Mike's option. `knowledge/index.md` rebuilt and no longer lists it as a live proposal. |
| P0-6 | Final consistency review and owner approval | in review | PR #210, `97cb988` | Consistency pass done. Ids verified by audit: FR-001 to FR-131, ADR-001 to ADR-038, AT-01 to AT-46, all unique with no gaps. Both headers now say Phase 0 corrections applied, owner approval pending pull request review. Owner approval itself is not done. Section 24 still misses eight requirement rows, listed in "Where we are". |
| P0-7 | Section 25 pre-build artifacts | in review | PR #210, `97cb988` | `contracts.md` written and audited: 23 operations behind `memory.mjs`, components mapped to files, validator checks MV-01 to MV-22, and both host startup adapters. Decisions C7, C10, and C11 are new and need Mike. `session-kickoff.md` now points at it. |
| P1-1 | v2 required core templates and settings | in review | PR #210, `2205029` | Template tree under `skills/second-brain/references/templates-v2/`. `project.md` front matter, `map.md` with the research-spike area, `current.md` with the four required sections, `.gitkeep` in the four memory folders and `specs/`. Setup values ship as two snippets rather than edits to the live setup skill, because D2 forbids changing v1 setup behavior now. Templates no pins file and no gold set: section 7.3.1 says a new project has neither. |
| P1-2 | Boot brief assembler and Claude Code startup hook | in review | PR #210, `2205029` | `tools/boot-brief.mjs` and `hooks/boot-brief-session-start.mjs`. Degradation order audited against section 10.4 and matches: warnings, recent, current, map. The required set is never dropped, step 3 spares focus, blockers, and next step, and an over-budget brief runs long in visible overflow with its byte count. Hook exits 0 on every path. |
| P1-3 | memory_capabilities and memory_status | in review | PR #210, `2205029` | `tools/memory.mjs` ships `capabilities` and `status` only. The other 21 operations report as degraded with a reason instead of being stubbed. Added `tools/lib/scope.mjs` and `tools/lib/result.mjs`, which now hold scope resolution, the fail-closed privacy default, and the result envelope. |
| P1-4 | Optional tracker adapter | in review | PR #210, `2205029` | `tools/tracker-adapter.mjs` with the `github-project` adapter over `gh`. The command runner is injectable so fixtures cover the absent and failing cases, and both leave startup usable. |
| P1-5 | Codex startup route | in review | PR #210, `2205029` | One marked v2 section added to `skills/second-brain/SKILL.md`, 101 lines added and none removed, so v1 setup behavior is unchanged. The route text calls `boot-brief.mjs` directly. |
| P1-6 | Current and recent rendering | in review | PR #210, `2205029` | Current and recent blocks render authored lines only. The 72-hour window comes from section 10.3 and no separate threshold was invented. Stale warning per FR-116 names the date and survives every degradation step. |
| P2-1 | Record schema and core validator | not started | | |
| P2-2 | Write coordinator and approval binding | not started | | |
| P2-3 | Pre-write guard | not started | | |
| P2-4 | Lifecycle operations | not started | | |
| P2-5 | Pins | not started | | |
| P2-6 | Rewrite the remember skill | not started | | |
| P2-7 | Links, backlinks, and move repair | not started | | |
| P3-1 | Retrieval router | not started | | |
| P3-2 | Rewrite the recall skill | not started | | |
| P3-3 | Session-history gate rework | not started | | |
| P3-4 | Review engine and cleanup skill | not started | | |
| P3-5 | Gold set runner | not started | | |
| P3-6 | Full validator and harness consolidation | not started | | |
| P4-1 | Migration engine, v1 to v2 | not started | | |
| P4-2 | Migrate this repo and cut its runtime over | not started | | |
| P4-3 | project-init and project-sync rewrite | not started | | |
| P4-4 | Rules rewrite | not started | | |
| P4-5 | Root routes in CLAUDE.md and AGENTS.md | not started | | |
| P4-6 | Replace the v1 spec content | not started | | |
| P4-7 | Catalogs, docs, manifests, and version bumps | not started | | |
| P4-8 | Clean removal path | not started | | |
| P4-9 | Full acceptance run | not started | | |

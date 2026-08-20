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
- Phase 1 and Phase 2 are built and audited, committed through `57f6508`.
  Nine plugin harnesses pass, 940 checks in total, and the four repo checks
  are green. No v1 runtime file has been touched in either phase, so D2 holds.
- second-brain is at 3.8.0 in both manifests and the marketplace is at 0.78.0.
- Next item: P3-1.
- Blocked: nothing.
- Must be fixed before P4-2 puts the guard live in this repository: the
  pre-write guard reads Bash commands well but four indirect shapes get past
  it. `xargs` feeding a guarded path into a writing command, an interpreter
  one-liner such as `python3 -c` or `node -e` with the path inside the code
  string, `dd of=`, and `ln -sf` over a canonical file. The structured tools,
  redirects, subshells, `tee`, `sed -i`, `cp`, heredocs, `sh -c`, and `eval`
  are all refused correctly, and the guard fails closed outside a project.
- Carried into Phase 2, decided this run and needing Mike's review: the
  `updated` date in `knowledge/current.md` front matter is an invented field.
  Neither authority document names a place to hold the date FR-116 compares
  against, so Phase 1 added one. `memory.mjs update-current` must write it.
- Carried into Phase 3 and Phase 4: a cross-scope record or pin id currently
  answers `record/unknown-id`, which does not name the resolved root. AT-45
  requires a refusal naming the operation, the path, and the resolved root, so
  `scope/cross-scope-result` has to become reachable before P4-9.

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
| P2-1 | Record schema and core validator | in review | PR #210, `57f6508` | `lib/record-schema.mjs` at schema 2.0 and `memory.mjs validate`. All 22 MV checks are listed in the output, three run now and 19 report as skipped, so nothing looks checked that is not. `record/legacy-gap` warns and never fails. Four record templates. Schema harness 77 checks. Also switched the CLI to `cli/invalid-invocation`, which the last check-in asked for. |
| P2-2 | Write coordinator and approval binding | in review | PR #210, `57f6508` | `tools/memory-write.mjs`: two-phase propose and apply, project lock, journal, preimage restore, focused validation, view rebuild. Review file plus a `.proposal.json` sidecar holding the section 13.2 binding, which keeps the reviewed Markdown pure content. `update-current` writes the four required sections and stamps the date. Legacy touch-upgrade included. FR-110's keyboard shortcut stays unmet through its own escape clause: Claude Code gives a skill no way to register one. |
| P2-3 | Pre-write guard | in review | PR #210, `57f6508` | `hooks/memory-write-guard.mjs` denies through the `PreToolUse` payload and exits 0 on every path, per C10. Covers Edit, Write, MultiEdit, NotebookEdit, and Bash. Guards `knowledge/memory/`, `knowledge/specs/`, `current.md`, and the three boundary keys in `project.md`. I tested it myself against 30 shapes: it holds on the structured tools, fails closed outside a project, and allows reads and git. Four Bash evasion shapes get through, recorded below and in the notes for P4-2. |
| P2-4 | Lifecycle operations | in review | PR #210, `57f6508` | The eight operations sit beside the coordinator in `memory-write.mjs`. Duplicate-id refusal, reciprocal supersession in one transaction, the retire phrase hunt, merge only for identical meaning, and delete with the privacy-purge boundary report. Lifecycle harness 193 checks. |
| P2-5 | Pins | in review | PR #210, `57f6508` | A container restart interrupted the first build of this item. The workflow resumed from cache and a fresh agent reviewed and finished the partial work. I audited the result rather than the process: pins are complete, the registry is `knowledge/memory/pins.md`, rendering verifies the summary hash, and the cross-project isolation pair passes. Two things to note: the 320-byte pin statement limit is an invented number no document names, and the AT-06 retrieval half is deferred to Phase 3. |
| P2-6 | Rewrite the remember skill | in review | PR #210, `57f6508` | `skills/remember/SKILL-v2.md` drafted beside the live skill, which is untouched, so D2 holds. Follows the section 13.1 pipeline and the extended 13.5 completed-work rules, and names `knowledge/specs/memory-system.md` as its authority with a note that P4-6 fills that file in. |
| P2-7 | Links, backlinks, and move repair | in review | PR #210, `57f6508` | `lib/links.mjs`, `memory.mjs related`, and coordinator move and rename with repo-wide relative-link repair and preimage restore when any link cannot be repaired. Links harness 87 checks including the failing-repair fixture that changes nothing. Writes a `.memory/last-move.json` receipt for validator check MV-22, which no document had named. |
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

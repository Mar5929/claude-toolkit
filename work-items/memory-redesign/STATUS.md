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

### The architecture rework is drafted, 2026-08-20

The rework Mike called for after the revert is drafted on branch
`claude/memory-system-architecture-n92ejj`. `functional-requirements.md` was
rewritten to strip agent-added requirements, and its section 9 lists every
removed or changed id with the reason.
`memory-system-v2-master-technical-architecture.md` was rewritten around one
idea: the agent is the runtime, so the system is the folder layout, four
skills, two hooks, and two small scripts, with no engine. That document now
marks `contracts.md`, `implementation-plan.md`, `pm-tracker.md`, and
`session-kickoff.md` as superseded. Nothing is approved until Mike reviews the
pull request. Nothing gets built until he does.

### The build was reverted on 2026-08-20

Mike called the revert after reading the overengineering audit. Every file the
build wrote under `plugins/` and `.claude/`, plus
`knowledge/retrieval-gold-set.md`, is back to the state of `f3b424e`, the commit
this branch started from and the same content as `main`. The revert is a forward
commit on this branch. No history was rewritten and nothing was ever merged to
`main`.

The code is not lost. It is in this branch's git history, in every commit before
the revert commit, and can be read or pulled back at any time.

What stayed on the branch is the design record: everything under
`work-items/memory-redesign/`, the superseded marking in
`knowledge/specs/memory-system-v2.md`, and the matching `knowledge/index.md`
rebuild.

The next step is the architecture rework. Mike will review it. Nothing gets
built again until he does.

Everything below this point describes the build as it stood before the revert.
Read it as history, not as the current state of the repository.

**The build ran to the cutover and stopped there on purpose.** Phases 0 through
3 are complete and audited. Phase 4 landed its migration engine, its
project-init and project-sync rewrite, its removal path, and its rules rewrite.
The cutover itself is held for Mike.

- Everything is on branch `claude/memory-redesign-impl-t5e3go`, committed
  through `147c3fc`, open as draft pull request #210. **Nothing is merged and
  Mike has approved none of it.** The whole run gets one review at that pull
  request. Where a row below says a decision was made, it means made by an
  agent and waiting for him.
- This run was autonomous. The per-item board issues, refinement sessions, and
  per-item owner approvals the plan calls for were collapsed into that review.
- Green as of the final audit: eleven plugin harnesses, 1357 checks, plus a
  39-check gold-set self-test, plus the four repo checks, plus
  `claude plugin validate .`. I ran all of them myself at `147c3fc`.
- **This repository still runs v1, and it works.** The v1 SessionStart hook is
  still registered in `.claude/settings.json` and still produces its briefing.
  The v1 tools are still in `.claude/tools/`. All four live `SKILL.md` files are
  untouched with their `SKILL-v2.md` drafts beside them. The v1 `knowledge/`
  tree is untouched. D2 held for the entire run.
- second-brain is at 3.9.0 in both manifests, project-init at 0.49.0, the
  marketplace at 0.79.0. The 4.0.0 release has not happened.

### One thing to know before you work in this repository

This warning is settled and no longer applies. The rules in `.claude/rules/` had
been rewritten to the v2 taxonomy while this repo's `knowledge/` tree was still
v1, so they routed saves to folders that did not exist. The revert put the rules
back to v1, so the rules and the tree match again.

### Why the cutover stopped

The P4-2 agent was blocked by the platform's safety layer. Rewriting this
repository's own live `.claude/settings.json`, deleting live runtime files, and
swapping live `SKILL.md` files reads as self-modification, and that needs Mike's
explicit confirmation. An unattended overnight run cannot give it. The block was
respected rather than worked around. That was the correct outcome: this is
exactly the change a person should be awake for.

### How to resume

1. Mike approves the cutover explicitly, in a session he is present for.
2. Re-run stage C. The workflow script is at the scratchpad path
   `phase-4c-workflow.js`, resuming from run id `wf_cd653f3d-d78`. **Skip P4-4**,
   which is already committed at `147c3fc`. The stage is P4-2 with P4-5 inside
   it, in one commit.
3. That one commit must carry all of it or `installed-copy-check` sees a
   half-migrated repository: the migration of `knowledge/`, the new
   `current.md` and `map.md`, `project.md` front matter, the `.claude/` hook and
   tool swap, the `.claude/settings.json` registration, removal of the v1 hook
   and the v1 tools, the four `SKILL-v2.md` swaps, the hardcoded filename list
   in `tests/installed-copy-check.mjs`, and the root marker blocks in
   `CLAUDE.md` and `AGENTS.md`. `build-knowledge-index.mjs` must leave the
   plugin and `.claude/tools/` together, and installing `tools/lib/` means the
   copy walker has to recurse.
4. Then P4-6, then P4-7 with the 4.0.0 bump, then P4-9.
5. The gold set is the proof the migration worked. It reports ten blocked today
   because scope does not resolve on a v1 tree. After the cutover it must score
   10 of 10, which needs three things from the migration: the shared-block
   decision keeps the exact record id the set names, that record lists
   `AGENTS.md` among its entities, and the memory-spec decision is pinned.

## Work items

Status values: not started, in review, blocked, merged, reverted. "In review"
means the work is built on the branch above and waiting for Mike at pull request
#210. No row may say "merged" until its work is actually merged to `main`.

"Reverted" means the code that row describes was undone by the 2026-08-20 revert
and is no longer in the working tree. It is still readable in this branch's git
history, in the commit named in that row's Proof column. Each row's Notes are
left as they were written, so they describe what the code did before it was
removed. Rows that still say "in review" are document work under
`work-items/memory-redesign/` and `knowledge/`, which the revert kept.

| Item | What it does | Status | Proof | Notes |
|---|---|---|---|---|
| P0-1 | Continuity correction in the requirements document | in review | PR #210, `97cb988` | FR-102 and FR-103 rewritten. New continuity FR-114 through FR-117. Two acceptance bullets rewritten, two added. Also rewrote FR-012, which held a tracker-ownership variant that contradicted the corrected FR-102. Neither rejected phrase survives a grep. |
| P0-2 | Continuity correction in the architecture document | in review | PR #210, `97cb988` | Section 10.6, ADR-032, ADR-006, the required tree, section 7.3, and the dependent spots rewritten. `knowledge/current.md` is in the required tree and the tracker-adapter row says optional. AT-35 and AT-36 rewritten, AT-37 adjusted, AT-43 and AT-44 added. Added `memory_update_current` to section 16.1 and extended sections 13.3 and 13.5. |
| P0-3 | Scope and privacy design | in review | PR #210, `97cb988` | Scope and privacy requirements added through FR-131, with ADR-037, ADR-038, AT-45, and AT-46. Section 21 now carries an enforcement design, not just principles. |
| P0-4 | Reconcile budget, pin registry home, gold set home, and views | in review | PR #210, `97cb988` | Budget settled at 10 KB, meaning 10240 bytes, covering the current and recent blocks. New section 7.3.1 names `knowledge/memory/pins.md` and `knowledge/retrieval-gold-set.md` as optional canonical files and closes that category. View-generator row reconciled: it never writes `current.md`. |
| P0-5 | Supersede the stale parallel spec | in review | PR #210, `97cb988` | `knowledge/specs/memory-system-v2.md` marked superseded in place, with a pointer to the authority pair. Moving it to `archive/` is still Mike's option. `knowledge/index.md` rebuilt and no longer lists it as a live proposal. |
| P0-6 | Final consistency review and owner approval | in review | PR #210, `97cb988` | Consistency pass done. Ids verified by audit: FR-001 to FR-131, ADR-001 to ADR-038, AT-01 to AT-46, all unique with no gaps. Both headers now say Phase 0 corrections applied, owner approval pending pull request review. Owner approval itself is not done. Section 24 still misses eight requirement rows, listed in "Where we are". |
| P0-7 | Section 25 pre-build artifacts | in review | PR #210, `97cb988` | `contracts.md` written and audited: 23 operations behind `memory.mjs`, components mapped to files, validator checks MV-01 to MV-22, and both host startup adapters. Decisions C7, C10, and C11 are new and need Mike. `session-kickoff.md` now points at it. |
| P1-1 | v2 required core templates and settings | reverted | PR #210, `2205029` | Template tree under `skills/second-brain/references/templates-v2/`. `project.md` front matter, `map.md` with the research-spike area, `current.md` with the four required sections, `.gitkeep` in the four memory folders and `specs/`. Setup values ship as two snippets rather than edits to the live setup skill, because D2 forbids changing v1 setup behavior now. Templates no pins file and no gold set: section 7.3.1 says a new project has neither. |
| P1-2 | Boot brief assembler and Claude Code startup hook | reverted | PR #210, `2205029` | `tools/boot-brief.mjs` and `hooks/boot-brief-session-start.mjs`. Degradation order audited against section 10.4 and matches: warnings, recent, current, map. The required set is never dropped, step 3 spares focus, blockers, and next step, and an over-budget brief runs long in visible overflow with its byte count. Hook exits 0 on every path. |
| P1-3 | memory_capabilities and memory_status | reverted | PR #210, `2205029` | `tools/memory.mjs` ships `capabilities` and `status` only. The other 21 operations report as degraded with a reason instead of being stubbed. Added `tools/lib/scope.mjs` and `tools/lib/result.mjs`, which now hold scope resolution, the fail-closed privacy default, and the result envelope. |
| P1-4 | Optional tracker adapter | reverted | PR #210, `2205029` | `tools/tracker-adapter.mjs` with the `github-project` adapter over `gh`. The command runner is injectable so fixtures cover the absent and failing cases, and both leave startup usable. |
| P1-5 | Codex startup route | reverted | PR #210, `2205029` | One marked v2 section added to `skills/second-brain/SKILL.md`, 101 lines added and none removed, so v1 setup behavior is unchanged. The route text calls `boot-brief.mjs` directly. |
| P1-6 | Current and recent rendering | reverted | PR #210, `2205029` | Current and recent blocks render authored lines only. The 72-hour window comes from section 10.3 and no separate threshold was invented. Stale warning per FR-116 names the date and survives every degradation step. |
| P2-1 | Record schema and core validator | reverted | PR #210, `57f6508` | `lib/record-schema.mjs` at schema 2.0 and `memory.mjs validate`. All 22 MV checks are listed in the output, three run now and 19 report as skipped, so nothing looks checked that is not. `record/legacy-gap` warns and never fails. Four record templates. Schema harness 77 checks. Also switched the CLI to `cli/invalid-invocation`, which the last check-in asked for. |
| P2-2 | Write coordinator and approval binding | reverted | PR #210, `57f6508` | `tools/memory-write.mjs`: two-phase propose and apply, project lock, journal, preimage restore, focused validation, view rebuild. Review file plus a `.proposal.json` sidecar holding the section 13.2 binding, which keeps the reviewed Markdown pure content. `update-current` writes the four required sections and stamps the date. Legacy touch-upgrade included. FR-110's keyboard shortcut stays unmet through its own escape clause: Claude Code gives a skill no way to register one. |
| P2-3 | Pre-write guard | reverted | PR #210, `57f6508` | `hooks/memory-write-guard.mjs` denies through the `PreToolUse` payload and exits 0 on every path, per C10. Covers Edit, Write, MultiEdit, NotebookEdit, and Bash. Guards `knowledge/memory/`, `knowledge/specs/`, `current.md`, and the three boundary keys in `project.md`. I tested it myself against 30 shapes: it holds on the structured tools, fails closed outside a project, and allows reads and git. Four Bash evasion shapes get through, recorded below and in the notes for P4-2. |
| P2-4 | Lifecycle operations | reverted | PR #210, `57f6508` | The eight operations sit beside the coordinator in `memory-write.mjs`. Duplicate-id refusal, reciprocal supersession in one transaction, the retire phrase hunt, merge only for identical meaning, and delete with the privacy-purge boundary report. Lifecycle harness 193 checks. |
| P2-5 | Pins | reverted | PR #210, `57f6508` | A container restart interrupted the first build of this item. The workflow resumed from cache and a fresh agent reviewed and finished the partial work. I audited the result rather than the process: pins are complete, the registry is `knowledge/memory/pins.md`, rendering verifies the summary hash, and the cross-project isolation pair passes. Two things to note: the 320-byte pin statement limit is an invented number no document names, and the AT-06 retrieval half is deferred to Phase 3. |
| P2-6 | Rewrite the remember skill | reverted | PR #210, `57f6508` | `skills/remember/SKILL-v2.md` drafted beside the live skill, which is untouched, so D2 holds. Follows the section 13.1 pipeline and the extended 13.5 completed-work rules, and names `knowledge/specs/memory-system.md` as its authority with a note that P4-6 fills that file in. |
| P2-7 | Links, backlinks, and move repair | reverted | PR #210, `57f6508` | `lib/links.mjs`, `memory.mjs related`, and coordinator move and rename with repo-wide relative-link repair and preimage restore when any link cannot be repaired. Links harness 87 checks including the failing-repair fixture that changes nothing. Writes a `.memory/last-move.json` receipt for validator check MV-22, which no document had named. |
| P3-1 | Retrieval router | reverted | PR #210, retrieval harness 97 checks | `memory.mjs` gained `search`, `get`, `timeline`, `sources`, `spec-search`, and `spec-get`, all reading canonical Markdown on every call. Results carry the section 15.2 contract and rank by term coverage then the authority order. Empty stays empty at exit 0, parse and filter failures are errors at exit 2, and the envelope's `searched` field names the layers covered. The AT-17 `.memory/`-absent fixture proves reads leave the project byte for byte unchanged. |
| P3-2 | Rewrite the recall skill | reverted | PR #210, skill review against section 15 | `skills/recall/SKILL-v2.md` drafted beside the untouched live skill, so D2 holds. Teaches question routing, tiers 0 to 6, the 15.2 result contract, the authority order, the four record types with domain and topics in place of the seven v1 folders, what each `epistemic_status` permits, consequential recall through `get` plus `sources` plus original evidence, and honest failure. |
| P3-3 | Session-history gate rework | reverted | PR #210, session-search harness 28 to 62 checks | The one v1 file this phase may edit. `search-sessions.mjs` keeps every v1 field, flag, and exit code and adds host, machine, date, a message locator, and a `searchSessionsGated` entry point reached with `--reason`. A blank, missing, or one-word reason refuses with `history/gate-closed` at exit 1. `SKILL-v2.md` drafted beside the untouched live skill. Backward compatibility was proved by running the pre-P3-3 harness unchanged against the new script: 28 of 28 pass. |
| P3-4 | Review engine and cleanup skill | reverted | PR #210, review harness 68 checks | `memory.mjs review` is a structurally read-only router over fifteen section 17 categories returning the contracts 2.8 worklist shape, focused by default, `--scope deep` adding the whole-corpus categories, and the gold-set category reported as skipped rather than importing the P3-5 runner. It reuses the validator link, pin, and phrase checks, `planViewRebuild`, and `assembleBootBrief`, so nothing `lib/links.mjs` or `lib/pins.mjs` owns is duplicated. `skills/cleanup/SKILL-v2.md` routes every repair through the P2-4 operations. |
| P3-5 | Gold set runner | reverted | PR #210, self-test 36 to 39 checks | `tools/gold-set.mjs` reads the set from `knowledge/retrieval-gold-set.md` or the path `knowledge/map.md` maps it to, runs each question through the real router as a separate process, and checks the expected file against the first five results at a bar of 8 of 10. Pending, blocked, partial, and not-measured are separate outcomes, so no pass is claimed that was not earned. This repo's ten owner-worded questions are written. One defect found and fixed at phase close: the AT-18 acceleration scan waved through every `node:` specifier while the token pass strips strings, so `import { DatabaseSync } from "node:sqlite"` was not refused. A waved-through specifier is now read for the forbidden names, and three self-test checks cover it. |
| P3-6 | Full validator and harness consolidation | reverted | PR #210, validate harness 91 checks | Every section 4 check now runs except MV-18, which reports skipped naming P4-1. A check with nothing to inspect reports skipped with the reason, and MV-16 and MV-17 name the steps they did not read. `tools/isolation-fixtures.mjs` holds the section 21.11 fixtures, in its own file because the AT-18 scan forbids a write call in the retrieval path. MV-19 carries the one split severity: a missing set warns, a missed bar fails. Three things this item defines that no document named: the secret pattern set, the `Category:` and `Needed because:` lines inside a record's sensitive section, and an exemption record naming the file and the pattern id. `retirement-harness.mjs` deleted per D4. `knowledge-harness.mjs` gained v2 four-type fixtures beside its v1 ones. |
| P4-1 | Migration engine, v1 to v2 | reverted | PR #210, `a6c49dc` | `knowledge-layout.mjs` reworked: the v1 `knowledge` layout is the one supported source, `v2` is a detected state, plan mode emits a dry report with counts, hashes, collisions, missing metadata, link changes, and rollback steps, and apply is byte-preserving and stops on any ambiguity. `flat-149` and `retired-v3` are detect-only per D4. MV-18 landed with it. The installed copy at `.claude/tools/knowledge-layout.mjs` was updated in the same commit, which is what kept `installed-copy-check` green. This commit also carried the four fixes the audits had opened: the guard bypasses (F9 and F13), the unreachable cross-scope refusal (F11, now in `lib/cross-scope.mjs`), and wiring `session-search` onto the tool surface (F14). |
| P4-2 | Migrate this repo and cut its runtime over | blocked | | Held for Mike. The run's safety layer stopped this item: rewriting this repository's own live `.claude/settings.json`, deleting live runtime files, and swapping live `SKILL.md` files is self-modification, and it needs Mike's explicit confirmation, which an unattended run cannot give. The block was respected rather than worked around, which is the right call. Nothing of the cutover was attempted. This repository still runs v1 end to end. |
| P4-3 | project-init and project-sync rewrite | reverted | PR #210, `d75f392` and `a5fe506` | Gate 3 in `project-init/SKILL.md` and `references/setup-flow.md` rewritten to the four memory types, `current.md`, `map.md`, front-matter settings, the v2 hooks, the one-adoption-unit rule, and removability. `project-sync/SKILL.md` gained a v2 layout detection class, a v2 runtime audit, and a startup parity check. Setup writes the `.memory/` gitignore entry. project-init is at 0.49.0. |
| P4-4 | Rules rewrite | reverted | PR #210, `147c3fc` | Every shipped rule that named the v1 taxonomy now routes to facts, decisions, events, patterns, `current.md`, the mapped reference area, and the tracker, and each library original moved with its `.claude/rules/` copy so `installed-copy-check` stayed green. The mismatch: this repository's own tree is still v1, so these rules now describe folders this repo does not have yet. Reverting them would break `installed-copy-check`, so this is the least-wrong state, but it is a real one. A session working here before the cutover lands should route saves by the v1 tree it can see, not by the rule text. The note explaining this currently exists only in the commit message, which no session reads, so it is repeated in "Where we are" above. |
| P4-5 | Root routes in CLAUDE.md and AGENTS.md | blocked | | Held with P4-2. It was always meant to merge inside the cutover commit, because the marker blocks in both root files point sessions at `knowledge/index.md` and the v1 folders until it lands. Nothing was written. |
| P4-6 | Replace the v1 spec content | blocked | | Depends on P4-2. `knowledge/specs/memory-system.md` still holds the v1 text, which is correct while this repo still runs v1. |
| P4-7 | Catalogs, docs, manifests, and version bumps | blocked | | Depends on P4-2 through P4-6. second-brain is at 3.9.0, not 4.0.0, and the marketplace is at 0.79.0. The 4.0.0 release belongs to this item and has not happened. |
| P4-8 | Clean removal path | reverted | PR #210, `d75f392` | Removal steps added to `skills/second-brain/SKILL.md`: unregister the hooks, remove the tools and skills, leave `knowledge/` content in place, leave every other plugin working. Not yet exercised against a scratch project, because that check belongs with the acceptance run. |
| P4-9 | Full acceptance run | blocked | | Depends on everything above. No acceptance test has been run as a suite. Three of them cannot be run by any unattended session at all: AT-20 is a manual owner check, and the Codex halves of AT-01 and AT-05 need a real Codex session. |

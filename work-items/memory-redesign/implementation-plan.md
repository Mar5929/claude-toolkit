# Memory system v2: implementation plan

Status: approved by Mike on 2026-08-20. Phase 0 lands before any build work starts.
Date: 2026-08-20
Owner: Mike Rihm

## What this plan is

This document turns the memory system v2 design into ordered work items for this repo. It says what gets built, in what order, in which files, and how each piece is checked.

Two documents are the authority on behavior. When this plan and those documents disagree, they win:

1. `work-items/memory-redesign/functional-requirements.md` (FR-001 through FR-113)
2. `work-items/memory-redesign/memory-system-v2-master-technical-architecture.md` (ADR-001 through ADR-036, AT-01 through AT-42)

`MEMORY-REDESIGN-HANDOFF.md` at the repo root lists what is still open in those documents. Phase 0 of this plan closes that list.

## Ground rules for every work item

- Every work item becomes an issue on the `Claude-Toolkit-Project` board and gets a refinement session before build, per `spec-before-you-build.md`.
- Every work item lands by pull request from its own worktree, per `parallel-agent-sessions.md`.
- Before every pull request, these checks run green: `node tests/link-check.mjs`, `node tests/orphan-check.mjs`, `node tests/installed-copy-check.mjs`, and `claude plugin validate .`.
- Any change to a plugin's shipped content bumps that plugin's version numbers in the same pull request: its `.claude-plugin/plugin.json`, its `.codex-plugin/plugin.json`, and `metadata.version` in `.claude-plugin/marketplace.json`. Current second-brain values: 3.6.0, 3.6.0. Current project-init: 0.47.0. Marketplace: 0.76.0. During Phases 1 to 3, second-brain takes ordinary 3.7.x bumps per pull request. The 4.0.0 release happens once, in P4-7.
- `main` stays installable at all times. No pull request may leave the plugin half working.
- When a work item becomes a board issue, the issue body carries only the goal, the reason, and what finished means. The file paths and build steps in this plan go into the issue's comments, per the root `CLAUDE.md` board rules.
- Mike requires that agents building these work items run on Claude Opus 5. A session or subagent doing build work from this plan uses the `claude-opus-5` model (`model: "opus"` when spawning agents or workflows).

## Decisions this plan makes

- D1: **Rewrite the second-brain plugin in place. Do not create a new plugin.** `tests/installed-copy-check.mjs` hardcodes `.claude/tools/` to `plugins/second-brain/tools/`. The marketplace, project-init Gate 3, and project-sync all point at second-brain. A second plugin would double every catalog and confuse installs. The v2 release bumps second-brain from 3.6.0 to 4.0.0.
- D2: **Build v2 runtime files under new names, next to the v1 files.** v1 hooks and tools stay untouched and working through Phases 1 to 3. This repo keeps running v1 until Phase 4 cuts it over. Then the v1 files are removed. This keeps `main` installable and keeps `installed-copy-check` green, because a copy under `.claude/` only has to change when its shipped original changes. Skill texts follow the same rule: a rewritten live `SKILL.md` would drive the v2 workflow while every installed project still runs v1. So P2-6, P3-2, P3-3, and P3-4 write their new text as a `SKILL-v2.md` draft beside the live skill, with a naming row so `orphan-check` stays green, and the P4-2 cutover swaps the drafts in.
- D3: **This repo migrates itself last, in Phase 4, using the same migration engine other projects will use.** That is the first real test of the migration path.
- D4: **Legacy migration paths get one supported source.** The v2 migration engine converts only the v1 `knowledge` layout. The old `flat-149` and `retired-v3` detectors stay as detect-only signatures that tell the owner to run the v1 (3.6.0) migration first. Their apply paths and `plugins/second-brain/tests/retirement-harness.mjs` retire.
- D5: **`knowledge/specs/memory-system.md` keeps its path.** At cutover its content is replaced with the approved v2 behavior spec. Keeping the path avoids a repo-wide link sweep. The draft at `knowledge/specs/memory-system-v2.md` is superseded in Phase 0 and never used for build.

## Phase 0: fix the design documents. Nothing builds before this lands.

The consistency audit found that the approved continuity correction was never applied, three handoff decisions are still open, and a stale parallel spec could mislead a build session. Phase 0 fixes all of it. Every Phase 0 item edits documents only. No code.

### P0-1: Continuity correction in the requirements document

Goal: make `functional-requirements.md` say that memory owns `knowledge/current.md` and the tracker adapter is optional.

Deliverables, all in `/home/user/claude-toolkit/work-items/memory-redesign/functional-requirements.md`:
- Rewrite FR-102 and FR-103 (lines 419-423). Memory owns `knowledge/current.md`. Startup works with no tracker. The tracker contributes links and live status only when available.
- Add new continuity FRs (numbers assigned in this item, FR-114 and up): update triggers (explicit handoff, approved current-focus change, approved completed-work event), read-only deterministic startup injection, a stale-current.md warning, no hand edits during normal use.
- Rewrite the two acceptance bullets at lines 565-568 to match.

FRs and ATs: redefines FR-102, FR-103. Feeds AT-35, AT-36.
Depends on: nothing.
Verify: Mike approves the rewritten text. No rejected phrase ("tracker must own the current state", "from the tracker's authored handoff") survives a grep of the file. `node tests/link-check.mjs` green.

### P0-2: Continuity correction in the architecture document

Goal: apply the same correction to every spot in the architecture document, named and unnamed.

Deliverables, all in `/home/user/claude-toolkit/work-items/memory-redesign/memory-system-v2-master-technical-architecture.md`:
- Rewrite section 10.6 (lines 416-426) from tracker-owned to memory-owned continuity.
- Rewrite ADR-032 (lines 1565-1574). Revise ADR-006 (lines 1314-1319). Record the rejected tracker-only alternative. Keep the native-history decisions intact.
- Add `knowledge/current.md` to the required tree (lines 184-197). Fix section 7.3 (lines 267-270), which currently forbids it.
- Update the dependent spots: boot brief item 4 (line 356), section 10.5 (lines 413-414), Tier 4 (lines 900-901), the section 20 failure row (line 1185), and the component table tracker-adapter row (line 285, mark it optional).
- Rewrite AT-35 and AT-36 (lines 1263-1264) and the section 24 continuity traceability rows (lines 1794-1797).

FRs and ATs: aligns the architecture with corrected FR-102, FR-103 and the new continuity FRs.
Depends on: P0-1.
Verify: Mike approves the rewritten text. Same grep as P0-1 across this file. Traceability rows point at the rewritten sections. Tests green.

### P0-3: Scope and privacy design (handoff decision 2)

Goal: close the open scope-and-privacy design so section 21 is buildable.

Deliverables:
- New or expanded FRs in `functional-requirements.md`: physical project-root enforcement, monorepo subroots, and handling for sensitive health or personal projects.
- Expanded section 21 in the architecture document with the enforcement design, not just principles.

FRs and ATs: extends FR-018, FR-027, FR-048 territory. Feeds validator checks 16 and 17 and AT-06.
Depends on: nothing. Can run parallel to P0-1.
Verify: owner approves the added text. Tests green.

### P0-4: Reconcile budget, pin registry home, and generated views (handoff decision 3)

Goal: remove the three internal contradictions the audit found.

Deliverables, in the architecture document:
- Settle the 10 KB default budget language in section 10.4 (line 388) against the corrected startup design.
- Name the physical home of the pin registry. Section 11.2 and ADR-021 require one, while section 7.3 and section 9 forbid extra required files. One of them gives way, in writing.
- Name the physical home of the retrieval gold set file, which section 18.1 requires and section 7.3 leaves out of the required structure.
- Reconcile the view-generator component row (line 291) with the corrected section 7.3 and section 10.3, now that `knowledge/current.md` exists.

Depends on: P0-2.
Verify: owner approves. The three named contradictions are gone on re-read. Tests green.

### P0-5: Supersede the stale parallel spec

Goal: make sure no build session follows the wrong design.

Deliverables:
- Mark `/home/user/claude-toolkit/knowledge/specs/memory-system-v2.md` superseded by the work-items pair, or move it to `archive/` with a pointer, whichever Mike approves. It requires things the authority rejects (SOUL.md, session cards, providers).
- Fix `knowledge/index.md` line 39 by rebuilding: `node .claude/tools/build-knowledge-index.mjs`.

Depends on: nothing.
Verify: `knowledge/index.md` no longer lists the draft as a live proposed spec. Tests green.

### P0-6: Final adversarial consistency review and approval (handoff decision 4)

Goal: one full pass over both documents, then owner approval that flips both from draft to approved.

Deliverables:
- Review all FRs (through the new highest number), all ADRs (through 036 plus any Phase 0 additions), all ATs (through 042), and the section 24 traceability.
- Fix the stale counts in architecture section 2 (line 55) and the FR numbering, where FR-108 through FR-113 sit out of order.
- Rewrite the section 25 precondition (lines 1818-1819) so it does not require a tracker.
- A numbering check: every FR, ADR, and AT id unique, every traceability row resolving.
- Owner approval recorded in both document headers.

Depends on: P0-1 through P0-5.
Verify: the numbering check passes. Both headers say approved. Tests green.

### P0-7: Section 25 pre-build artifacts

Goal: meet the architecture's own conditions for cutting build tickets.

Section 25 requires, before implementation is split into tickets: an interface and error contract per section 16.1 tool, an owner and package destination for every section 8 component, versioned validator check definitions, and a startup adapter design per supported host. This plan assigns component owners, but the contracts do not exist yet.

Deliverables:
- A contracts document in `work-items/memory-redesign/` covering the section 16.1 tool contracts, the component-to-file ownership table, the versioned validator checks, and the Claude Code and Codex startup adapter designs. Or, if Mike prefers, an owner-approved amendment to section 25 trimming what it demands.

Depends on: P0-6.
Verify: Mike approves. Every section 8 component and 16.1 tool resolves to a named file in the contracts document. Phase 1 tickets may be cut only after this merges.

## Phase 1: startup and discovery

Matches architecture section 19 Phase 1. Adds the required core, the boot brief, and capability reporting. All new files, no v1 file changes (D2).

### P1-1: v2 required core templates and settings

Goal: ship the v2 project shape as templates the setup skill copies.

Deliverables:
- New template tree at `plugins/second-brain/skills/second-brain/references/templates-v2/knowledge/`: `project.md` (with YAML front matter: `schema_version: 2`, `project_id`, optional `tracker`, `project_root`, `profiles`), `map.md`, `current.md`, `specs/`, `memory/facts/`, `memory/decisions/`, `memory/events/`, `memory/patterns/`.
- Template `map.md` defines the mapped roles, including the reference area for research spikes (FR-098 through FR-101). Mapped areas point at existing folders, never move them.
- Setup keeps `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` (FR-050).
- A `.gitignore` entry for `.memory/` in the template, per section 7.3.
- Naming rows for every new file in `plugins/second-brain/README.md`.

FRs and ATs: FR-065, FR-095 through FR-097, FR-050, FR-098. Feeds AT-27, AT-28, AT-29.
Depends on: P0-7.
Verify: `node tests/orphan-check.mjs` green. Structure validation lands with P2-1 and confirms AT-28 then.

### P1-2: Boot brief assembler and Claude Code startup hook

Goal: a cold Claude Code session gets the ten-block boot brief within budget.

Deliverables:
- `plugins/second-brain/tools/boot-brief.mjs`: assembles the ten blocks in section 10.2 order, applies the budget and the four-step degradation order of section 10.4, never drops identity, purpose, handoff, valid pins, or the tool route, and emits missing-source warnings without blocking (section 10.5). This file implements the section 8 source resolver component.
- `plugins/second-brain/hooks/boot-brief-session-start.mjs`: fail-open SessionStart hook that runs the assembler. The v1 hook `knowledge-session-start.mjs` stays untouched until P4-2.
- New harness `plugins/second-brain/tests/boot-brief-harness.mjs` with over-budget, missing-source, and no-tracker fixtures.

FRs and ATs: FR-001 through FR-005, FR-008. AT-01 (Claude half), AT-02.
Depends on: P1-1, P0-4 (budget language).
Verify: the new harness. AT-02 fixtures show the exact degradation order.

### P1-3: memory_capabilities and memory_status

Goal: any session can ask what the memory system can do here.

Deliverables:
- `plugins/second-brain/tools/memory.mjs`: one CLI entry for the section 16.1 operations. This item implements `capabilities` and `status`, returning operations, approval mode, search mode, pin support, budget, project id, privacy boundary, tracker adapter, and degraded features.

FRs and ATs: FR-007. Feeds boot brief block 9 in AT-01.
Depends on: P1-1.
Verify: harness fixture asserting the capabilities payload, run in `boot-brief-harness.mjs` or its own file, named in the plugin README.

### P1-4: Optional tracker adapter

Goal: when a tracker is configured, startup shows live work links. When it is not, startup still works.

Deliverables:
- `plugins/second-brain/tools/tracker-adapter.mjs` with a `github-project` adapter reading the configured board through `gh`. Optional per the corrected section 10.6. Unavailable tracker produces the section 20 behavior: show the dated content from `knowledge/current.md` and label live status unverified.

FRs and ATs: corrected FR-102, FR-103. Feeds AT-35.
Depends on: P1-2, P0-2.
Verify: harness fixture with the adapter absent and with it failing. Both keep startup usable.

### P1-5: Codex startup route

Goal: a cold Codex session gets the same meaning as a Claude Code session.

Deliverables:
- Setup and sync steps in `plugins/second-brain/skills/second-brain/SKILL.md` that write the v2 startup route into a project's `AGENTS.md`, since Codex reads only that file.
- A drift note: the two host routes carry the same meaning and are checked together.

FRs and ATs: FR-001 (Codex half), section 10.1. AT-01 and AT-05 Codex halves.
Depends on: P1-2.
Verify: manual AT-01 run in a Codex session at P4-9. Route text reviewed in the PR.

### P1-6: Current and recent rendering

Goal: the brief's current-state and recent-window blocks render from `knowledge/current.md` and approved records without paraphrase.

Deliverables:
- Rendering logic in `boot-brief.mjs`: select, sort, label, and link authored lines only. Never new statements. Recent window rule per section 10.3: up to three meaningful updates from 72 hours, else the latest dated update labeled with its age. Stale `current.md` gets the warning defined in P0-1's new FRs.
- Note: writes to `current.md` go through the coordinator, which lands in P2-2. Until then the file is authored by hand in fixtures.

FRs and ATs: FR-005 plus the new continuity FRs from P0-1. Feeds AT-20, AT-35, AT-36.
Depends on: P1-2, P0-1.
Verify: harness fixtures for the 72-hour rule, the empty case, and the stale warning.

## Phase 2: lifecycle and schema

Matches section 19 Phase 2. Records, approval, the write gate, pins, and links.

### P2-1: Record schema and core validator

Goal: every v2 record has the required shape and a deterministic check for it.

Deliverables:
- Schema module and `memory.mjs validate` covering: unique id, type (fact, decision, event, pattern), status, epistemic_status, dates, approval, at least one evidence entry, one-sentence summary under the H1, `based_on` for inferences and patterns, `occurred_at` for events, and the seven required decision parts.
- A `legacy` gap state: a migrated record missing v2 metadata gets a warning naming the gaps, never a validation failure, because migration preserves legacy records without inventing metadata (FR-053) and upgrades happen on the next approved touch (FR-055).
- Record templates for the four types under `plugins/second-brain/skills/second-brain/references/templates-v2/`.
- Harness `plugins/second-brain/tests/schema-harness.mjs`.

FRs and ATs: FR-022, FR-087 through FR-094. AT-24, AT-25, AT-26, AT-27, AT-28.
Depends on: P1-1.
Verify: schema harness fixtures for each required field and each refusal (missing evidence, inference without based_on).

### P2-2: Write coordinator and approval binding

Goal: one write path applies approved changes as one reported transaction.

Deliverables:
- `plugins/second-brain/tools/memory-write.mjs` (called by `memory.mjs` write operations): project-local lock and crash-recovery journal under `.memory/`, source-hash recheck after review, staged exact approved Markdown, view rebuild, focused validation, full preimage restore on failure, journal recovery at next startup (section 13.4). This file implements the section 8 canonical store component.
- The view generator and `memory.mjs rebuild_views`: rebuild the generated views the coordinator refreshes in its transaction, and expose the standalone `memory_rebuild_views` operation from section 16.1, in whatever shape P0-4 settled. Any stored view carries the source fingerprint FR-003 and FR-017 require.
- The `knowledge/current.md` update triggers: an explicit handoff, an approved current-focus change, and an approved completed-work event that changes current state each write `current.md` through the coordinator. No other route writes it.
- Touch-upgrade for legacy records: when an approved operation touches a record in the P2-1 `legacy` state, the approval review shows the missing fields and the write upgrades that record (FR-055, section 19 Phase 2).
- Approval binding per section 13.2: proposal hash, destination path, record id, evidence locators and source hashes, exact pin statement. Any bound input changing forces a fresh review.
- The Edit action: full proposal at `.memory/review/<proposal-id>.md`, outside canonical paths, ignored by startup, recall, search, views, and Git. Re-validation of edited contents before save.
- Harness `plugins/second-brain/tests/coordinator-harness.mjs`.

FRs and ATs: FR-019 through FR-021, FR-026 through FR-028, FR-110 through FR-113. AT-04, AT-41. FR-110's keyboard shortcut is satisfied through its own escape clause, because Claude Code offers no way for a skill to register one. Record that in the PR.
Depends on: P2-1.
Verify: coordinator harness, including a crash-mid-transaction fixture that recovers from the journal.

### P2-3: Pre-write guard

Goal: an agent that skips review still cannot write, and the refusal is visible.

Deliverables:
- `plugins/second-brain/hooks/memory-write-guard.mjs`: deterministic PreToolUse hook refusing Edit, Write, and Bash writes into canonical memory paths from any route other than the coordinator. No model in its path. The refusal names the correct operation. The owner keeps ordinary Git access (section 13.3).
- Guard fixtures in `coordinator-harness.mjs`: direct edit, helper agent, script, each leaving every canonical file unchanged.

FRs and ATs: FR-108. AT-39, AT-42.
Depends on: P2-2.
Verify: the AT-39 fixture is the acceptance check itself.

### P2-4: Lifecycle operations

Goal: the eight named operations replace free-form editing.

Deliverables:
- `memory.mjs` operations: `add`, `confirm`, `correct`, `supersede`, `retire`, `merge`, `delete`, plus NOOP as the default outcome. Semantics per section 14: duplicate-id refusal, reciprocal supersession in one transaction, retirement phrase hunt across tracked files, merge only for identical meaning, delete with the privacy-purge boundary report.
- Lifecycle fixtures in `coordinator-harness.mjs` or a new `lifecycle-harness.mjs`.

FRs and ATs: FR-023 through FR-025. AT-10, AT-11, AT-12, AT-23.
Depends on: P2-2.
Verify: fixtures for each operation, including the retire phrase hunt and the supersede timeline behavior.

### P2-5: Pins

Goal: owner-approved pins reach every cold session for their project and no other.

Deliverables:
- `memory.mjs pin` and `unpin` per section 11.3, with the budget preflight, the five-bullet approval, and the registry storing only record id, approval date, and summary hash (11.2). The registry's physical home is whatever P0-4 decided.
- Pin rendering in `boot-brief.mjs`: verify the hash, render the exact approved summary with a link, over-budget pin sets warn and render in visible overflow, never silently drop.
- Lifecycle interaction per 11.4, wired into P2-4 operations.
- Cross-project isolation fixtures: two projects with overlapping record ids (11.5).

FRs and ATs: FR-056 through FR-064. AT-05 through AT-09.
Depends on: P1-2, P2-2, P2-4, P0-4.
Verify: pin fixtures in the boot brief and coordinator harnesses, including the isolation pair.

### P2-6: Rewrite the remember skill

Goal: the save workflow follows the section 13.1 pipeline end to end.

Deliverables:
- Rewritten remember skill text, drafted as `plugins/second-brain/skills/remember/SKILL-v2.md` and swapped in by P4-2 (D2): route to tracker, rules, skills, specs, and sources first, the durable-information test, the future-agent interpretation test, duplicate and conflict search, lifecycle choice, five bullets, wait, coordinator save. "Record what we just did" runs this same workflow with the section 13.5 event shape, never automatically. Promotion of unreviewed research into a record follows the same approval path.
- The skill names `knowledge/specs/memory-system.md` as its design authority once P4-6 replaces that spec's content.

FRs and ATs: FR-009 through FR-018, FR-074 through FR-081, FR-109. AT-03, AT-40, AT-42, AT-33, AT-34.
Depends on: P2-2, P2-4.
Verify: skill text review against section 13.1 step by step. AT-03, AT-40, AT-42 run at P4-9.

### P2-7: Links, backlinks, and move repair

Goal: records link once, backlinks derive on request, moves never break links.

Deliverables:
- `memory.mjs related <id>`: outgoing links plus derived backlinks by text search of tracked Markdown, no registry or index, works with `.memory/` absent (section 12.4).
- Move and rename through the coordinator: repo-wide relative-link repair, target validation, one commit, preimage restore when any link cannot be repaired.
- Fixtures in a `links-harness.mjs`.

FRs and ATs: FR-082 through FR-086. AT-21, AT-22.
Depends on: P2-2.
Verify: links harness, including a failing-repair fixture that changes nothing.

## Phase 3: retrieval and validation

Matches section 19 Phase 3. Direct-file retrieval, the history gate, review, cleanup, gold set, full validation.

### P3-1: Retrieval router

Goal: questions route through the tiers and end in an honest answer or an honest failure.

Deliverables:
- `memory.mjs search`, `get`, `timeline`, `sources`, plus `spec_search` and `spec_get`, reading canonical Markdown directly. Tier order, authority order, and the result contract per section 15.2: project_id, layer, id or path, status, summary, provenance, match reason, degraded-state warning. Empty stays empty. Errors return as errors, never as no-result. No local state created by reads.
- Harness `plugins/second-brain/tests/retrieval-harness.mjs`, including a `.memory/`-absent fixture.

FRs and ATs: FR-029 through FR-034, FR-036, FR-038. AT-13, AT-15, AT-17.
Depends on: P2-1.
Verify: retrieval harness. The `.memory/`-absent fixture is the AT-17 check.

### P3-2: Rewrite the recall skill

Goal: the read path teaches the tier ladder and consequential recall.

Deliverables:
- Rewritten recall skill text, drafted as `plugins/second-brain/skills/recall/SKILL-v2.md` and swapped in by P4-2 (D2): loaded context first, then exact lookup, curated search, relationship expansion, tracker, gated history, honest failure. Consequential answers open the full record and follow evidence (15.3). The old seven-folder authority table is replaced by the four-type model and the epistemic_status field.

FRs and ATs: FR-029 through FR-031, FR-034, FR-036, FR-038 usage side. AT-13, AT-15.
Depends on: P3-1.
Verify: skill text review against section 15. Live check at P4-9.

### P3-3: Session-history gate rework

Goal: history search stays read-only, in place, and behind the gate.

Deliverables:
- Updated session-search skill text, drafted as `plugins/second-brain/skills/session-search/SKILL-v2.md` and swapped in by P4-2 (D2), plus `skills/session-search/scripts/search-sessions.mjs`, whose locator additions are compatible with v1: allowed only when the owner asks or the agent can name why current owners were insufficient (15.5). Results carry host, session id, date, role, and message locator (FR-107). The existing scope flags stay.
- Updated `plugins/second-brain/tests/session-search-harness.mjs`.

FRs and ATs: FR-035, FR-104, FR-106, FR-107. AT-14, AT-36, AT-37, AT-38.
Depends on: P3-1.
Verify: session-search harness, including a gate-bypass fixture that refuses.

### P3-4: Review engine and cleanup skill

Goal: review finds problems without writing. Cleanup fixes them through normal approval.

Deliverables:
- `memory.mjs review`: structurally read-only worklist across the section 17 categories (duplicates, conflicts, provenance, stale dates, broken links, supersession gaps, surviving retired phrases, vocabulary, failed durable-information tests, stale views, pin errors, gold-set failures).
- Rewritten cleanup skill text, drafted as `plugins/second-brain/skills/cleanup/SKILL-v2.md` and swapped in by P4-2 (D2): takes the worklist, presents five bullets per item, calls the P2-4 operations. No separate write path. Focused review runs after every approved save. Age alone never deletes.

FRs and ATs: FR-039 through FR-045. Supports AT-10, AT-12.
Depends on: P2-4, P3-1.
Verify: review fixtures in the retrieval or a `review-harness.mjs`. The guard from P2-3 proves review cannot write.

### P3-5: Gold set runner

Goal: retrieval changes are measured, not guessed.

Deliverables:
- `plugins/second-brain/tools/gold-set.mjs` plus this repo's gold set file per section 18.1: about ten owner-worded questions with expected files, pass bar 8 of 10 in the first five results, including the exact-id, must-return-nothing, pinned, cross-project, and `.memory/`-absent cases.
- A refusal check: enabling any retrieval acceleration without a new approved ADR fails visibly.

FRs and ATs: FR-037. AT-16, AT-18.
Depends on: P3-1.
Verify: the runner itself, plus a delete-derived-state-and-rebuild fixture for AT-16.

### P3-6: Full validator and harness consolidation

Goal: `memory.mjs validate` covers all 22 section 18 checks.

Deliverables:
- Extend the P2-1 validator with the remaining checks: startup routes, shared-block drift, pin scope and hashes, budget degradation, retired phrases, map coverage, no-local-state reads, root isolation, privacy boundary, gold set, quoted-source consistency, link syntax, move-repair completeness. The migration-integrity check (section 18 check 18) lands with the migration engine in P4-1, which builds what it checks.
- Update `plugins/second-brain/tests/knowledge-harness.mjs` fixtures to the four-type tree. Retire `retirement-harness.mjs` per D4.

FRs and ATs: closes the deterministic side of most ATs. AT-16, AT-17 directly.
Depends on: P2-1 through P2-7, P3-1, P3-5 (the gold-set check runs the P3-5 runner).
Verify: all plugin harnesses green plus the three repo tests.

## Phase 4: project adoption and the v1 to v2 transition

Matches section 19 Phase 4. Migration tooling, this repo's own cutover, project-init, rules, catalogs, versions, removal, acceptance.

### P4-1: Migration engine, v1 to v2

Goal: an existing v1 project converts safely, reversibly, with approval.

Deliverables:
- Rework `plugins/second-brain/tools/knowledge-layout.mjs`: detect the v1 `knowledge` layout as the supported source, add a `v2` detected state, plan mode emits a dry report with file counts, hashes, collisions, missing metadata, link changes, and rollback steps, apply mode is byte-preserving where files do not change and stops on any ambiguity or collision. Rollback removes generated files and uncommitted changes, never approved Markdown.
- Taxonomy mapping in the plan: v1 `decisions` to v2 `decisions`. v1 `context`, `domain`, and `knowledge` to v2 `facts`. v1 `operations` to v2 `patterns`. v1 `planning` routes to the tracker and v1 `references` to the mapped reference area, both shown per file for owner approval, never auto-moved. Missing v2 metadata is shown as a gap, never invented (section 19 Phase 2 rule).
- `flat-149` and `retired-v3` become detect-only per D4.
- The taxonomy mapping also covers this repo's real v1 content: `knowledge/memory/tags.md` is shown for owner routing or retirement (v2 has no tag registry), `knowledge/brainstorms/` stays in place as a mapped area, `knowledge/index.md` is retired because generated views replace it, empty v1 folders are removed, and the gold-set file goes to the home P0-4 named.
- The migration-integrity validator check (section 18 check 18), moved here from P3-6.

FRs and ATs: FR-051 through FR-055. AT-19.
Depends on: P2-1, P3-6.
Verify: migration fixtures in `knowledge-harness.mjs`: dry run changes nothing, apply preserves every unchanged byte and link.

### P4-2: Migrate this repo and cut its runtime over

Goal: this repo runs v2 on itself.

Deliverables:
- Run the P4-1 engine on `/home/user/claude-toolkit/knowledge/`, with Mike approving the routing of every `planning/` and `references/` file.
- Create this repo's `knowledge/current.md` and `knowledge/map.md`. Set the front matter in `knowledge/project.md`.
- Swap installed copies under `.claude/`: install `boot-brief-session-start.mjs` and `memory-write-guard.mjs`, update `.claude/settings.json` hook registration, install the v2 tools. Remove the v1 hook and tool copies. Update the mapping list in `tests/installed-copy-check.mjs` (the hardcoded filenames near line 70) in the same pull request.
- Remove the v1 files from the plugin: old `knowledge-session-start.mjs`, old tool versions, the v1 template tree. `save-reminder.mjs` survives unchanged, it knows nothing about the taxonomy. `knowledge/index.md` and `build-knowledge-index.mjs` retire here: generated views replace the index.
- Swap the four `SKILL-v2.md` drafts from P2-6, P3-2, P3-3, and P3-4 into the live `SKILL.md` files (D2).
- Update every naming row and link that points at a removed or renamed file, in this same pull request: `plugins/second-brain/README.md`, `docs/toolkit-map.md`, and the top `README.md`. P4-7 then carries only versions, descriptions, and counts. `link-check` and `orphan-check` must pass on this PR alone.
- P4-5, the root-route rewrite of `CLAUDE.md` and `AGENTS.md`, merges inside this same pull request, because those files point sessions at `knowledge/index.md` and the v1 folders until it lands.
- Add `.memory/` to this repo's `.gitignore`.

FRs and ATs: proves AT-20 and the migration path on a real project.
Depends on: P4-1, and this must merge in one pull request so `installed-copy-check` never sees a half state.
Verify: all repo checks green. A fresh session in this repo receives the v2 boot brief. Then the section 19 Phase 4 checks on the migrated repo: startup behavior, the pin isolation pair, direct search with `.memory/` absent, and a gold-set run.

### P4-3: project-init and project-sync rewrite

Goal: new and existing projects adopt v2 through the normal gates.

Deliverables:
- Rewrite Gate 3 in `plugins/project-init/skills/project-init/SKILL.md` (lines 211-269) and `references/setup-flow.md` (lines 135-163): four memory types, `current.md`, `map.md`, front-matter settings, the v2 hooks, the one-adoption-unit rule, removability.
- Update `plugins/project-init/skills/project-sync/SKILL.md`: v2 layout detection class, v2 runtime audit, startup parity check.
- Domain profiles extend the core without weakening safeguards (FR-066, FR-067).
- Setup writes the `.memory/` gitignore entry into the project.
- project-init version bumps per the ground rules, since this changes project-init content.

FRs and ATs: FR-065 through FR-072, FR-095 through FR-097. AT-28, AT-29, AT-30.
Depends on: P4-1.
Verify: run project-init against a scratch project and `memory.mjs validate` it. Tests green.

### P4-4: Rules rewrite

Goal: every shipped rule that names the v1 taxonomy says v2 instead.

Deliverables, each library original and its `.claude/rules/` copy in the same pull request:
- `plugins/project-init/library/rules/general/where-persistent-information-belongs.md`: routing table moves to facts, decisions, events, patterns, `current.md`, the mapped reference area, and the tracker.
- `steer-to-the-goal.md`: the `knowledge/memory/planning/` sentence reroutes to the tracker and planning records.
- `offer-context-handoff.md`, `keep-claudemd-current.md`, `parallel-agent-sessions.md` (index rebuild note), `work-item-folders.md`, `dependency-graph.md`: update their memory references.
- `plugins/project-init/library/rules/general/README.md` rows and the hand-maintained `.claude/rules/README.md`.
- project-init version bumps per the ground rules.

FRs and ATs: FR-009 through FR-014 documentation side.
Depends on: P4-2, and lands immediately after it, because until then this repo's sessions run under rules that route saves to folders that no longer exist.
Verify: `installed-copy-check` green, which is exactly the check that copies match.

### P4-5: Root routes in CLAUDE.md and AGENTS.md

Goal: the shared startup route says v2, identically in both files.

Deliverables:
- Rewrite the block between the `shared-with-agents-md` markers (lines 6-46 in both files): the two startup reads, the four-type authority split, the approval policy pointer, the remember route.
- Hand-sync the below-marker passages: the codemap `knowledge/` row, the second-brain paragraph, the index-rebuild note, and the matching AGENTS.md passages.
- Check `wc -c AGENTS.md` stays under about 24 KB.
- Revisit `knowledge/memory/decisions/claude-md-and-agents-md-carry-the-same-block.md` (at its post-migration path) if the marker placement changes.

Depends on: P4-2, and merges inside the P4-2 pull request, not after it.
Verify: `installed-copy-check` compares the marker blocks. Byte count reported in the PR.

### P4-6: Replace the v1 spec content

Goal: `knowledge/specs/memory-system.md` describes v2, at the same path (D5).

Deliverables:
- Replace the file's content with the approved v2 behavior spec, derived from the approved requirements document, and point to the work-items pair for full detail. Git history keeps the v1 text.
- Rebuild the generated views through `memory.mjs rebuild_views` so they pick up the change. The v1 index and its build tool are already gone (P4-2).

Depends on: P0-6, P4-2.
Verify: `link-check` green, since every inbound link keeps working. Skill authority pointers in P2-6 and P3-2 resolve.

### P4-7: Catalogs, docs, manifests, and version bumps

Goal: every index that names the memory system says v2.

Deliverables:
- `.claude-plugin/marketplace.json`: second-brain description and `metadata.version` bump. `.agents/plugins/marketplace.json`: matching entry.
- `plugins/second-brain/.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` to 4.0.0.
- `docs/toolkit-map.md`: the second-brain row, the five skill rows, the runtime-sources and shipped-package bullets, the superseded-v2-proposal bullet, the relationship bullets, and the watch items. Rows naming removed or renamed files were already fixed in P4-2. This item carries descriptions, versions, and counts.
- `plugins/second-brain/README.md`, top-level `README.md` repo map and plugin table, `plugins/CLAUDE.md`, `.claude/toolkit-sync.md`. Do not trust the existing plugin counts, they already disagree. Count the folders.

Depends on: P4-2 through P4-6.
Verify: `orphan-check` green, which fails when a shipped file loses its naming row.

### P4-8: Clean removal path

Goal: a project can remove the memory system without breaking the rest of the toolkit.

Deliverables:
- Removal steps in `plugins/second-brain/skills/second-brain/SKILL.md`: unregister hooks, remove tools and skills, leave `knowledge/` content in place, leave every other plugin working.

FRs and ATs: FR-073. AT-31.
Depends on: P4-3.
Verify: removal run against a scratch project, then `orphan-check` and a working project-init audit.

### P4-9: Full acceptance run

Goal: every acceptance test passes or has an approved reason it cannot run here.

Deliverables:
- Run AT-01 through AT-42, including the Codex halves of AT-01 and AT-05, the two-project pin isolation pair, and the manual owner check AT-20. Record results as a comment on the tracking issue.
- After merge, roll out per the root CLAUDE.md routine: `/plugin marketplace update claude-toolkit` and `/machine-sync` on each machine, `/project-sync` in each project.

Depends on: everything above.
Verify: the run record itself. Any failure reopens the owning work item.

## Traceability summary

| FR cluster | Work items |
|---|---|
| Orientation and context, FR-001 through FR-008 | P1-2, P1-3, P1-5, P1-6 |
| Placement and storage, FR-009 through FR-018, FR-109 | P2-6, P4-4 |
| Approval, records, lifecycle, FR-019 through FR-028, FR-108, FR-110 through FR-113 | P2-1, P2-2, P2-3, P2-4 |
| Retrieval, FR-029 through FR-038 | P3-1, P3-2, P3-5 |
| Review and cleanup, FR-039 through FR-045 | P3-4 |
| Providers, FR-046 through FR-049 | Not applicable in v2. ADR-013 and ADR-015 defer providers, so there is nothing to certify. The refusal of acceleration is P3-5 (AT-18). |
| FR-050, disable built-in host memory | P1-1, P4-3 (carried from v1 setup) |
| Migration, FR-051 through FR-055 | P4-1, P4-2 |
| Pinned memory, FR-056 through FR-064 | P2-5, P1-2 |
| Project setup and folder roles, FR-065 through FR-073 | P1-1, P4-3, P4-8 |
| Remembering completed work, FR-074 through FR-081 | P2-6 |
| Links and backlinks, FR-082 through FR-086 | P2-7 |
| Durable data model, FR-087 through FR-094 | P2-1 |
| Minimal setup, FR-095 through FR-097 | P1-1, P4-3 |
| Research spikes, FR-098 through FR-101 | P1-1 (mapped area), P2-6 (promotion) |
| Session continuity, FR-102 through FR-107, as corrected, plus the new continuity FRs | P0-1, P0-2, P1-4, P1-6, P3-3 |
| Deferred capability (proactive reminders) | Deferred by the requirements document itself. No work item. |

| ATs | Work items |
|---|---|
| AT-01, AT-02 | P1-2, P1-3, P1-5 |
| AT-03, AT-40, AT-42 | P2-6, P2-3 |
| AT-04, AT-41 | P2-2 |
| AT-05 through AT-09 | P2-5 |
| AT-10, AT-11, AT-12, AT-23 | P2-4, P3-4 |
| AT-13, AT-15 | P3-1, P3-2 |
| AT-14, AT-36, AT-37, AT-38 | P3-3 |
| AT-16, AT-17, AT-18 | P3-1, P3-5, P3-6 |
| AT-19 | P4-1 |
| AT-20 | P4-2, P4-9 (manual owner check) |
| AT-21, AT-22 | P2-7 |
| AT-24 through AT-28 | P2-1 |
| AT-29, AT-30 | P4-3 |
| AT-31 | P4-8 |
| AT-32, AT-33, AT-34 | P1-1, P2-6, verified at P4-9 |
| AT-35, AT-36 | P0-1, P0-2 (rewritten), P1-4, P1-6 |
| AT-39 | P2-3 |

AT-36 appears in two rows on purpose. Its continuity half belongs to P1-6 and its session-history half to P3-3.

## Risks

- R1: The Phase 0 edits touch two large documents and can drift from each other. Mitigation: P0-1 through P0-4 land as few PRs as possible, and P0-6 runs the numbering and traceability check over both before approval.
- R2: `tests/installed-copy-check.mjs` hardcodes the v1 hook filenames and the tools-to-second-brain mapping. Any rename breaks it. Mitigation: D2 keeps v1 files untouched until P4-2, and P4-2 updates the mapping in the same pull request as the file swap.
- R3: The shared block in CLAUDE.md and AGENTS.md must change identically, and AGENTS.md has a 32 KB cap with silent truncation. Mitigation: P4-5 edits both in one PR and reports `wc -c AGENTS.md`.
- R4: Migrating this repo's own `knowledge/` while parallel sessions run could clobber in-flight saves. Mitigation: P4-2 runs in its own worktree and lands as one PR. Mike pauses other sessions' saves for the cutover window, and every session pulls `main` before its next save.
- R5: The pre-write guard could block legitimate owner work or another plugin. Mitigation: the guard scopes by path and operation only, the owner keeps ordinary Git access, and every refusal names the correct operation (section 13.3).
- R6: A half-finished rewrite could leave `main` uninstallable. Mitigation: D2. v2 ships under new names beside working v1 files until the single cutover PR.
- R7: A build session could follow the stale spec at `knowledge/specs/memory-system-v2.md`. Mitigation: P0-5 supersedes it before any build phase opens.
- R8: Scope creep toward indexes or acceleration during retrieval work. Mitigation: AT-18 makes the refusal testable, and any acceleration proposal needs a new owner-approved ADR first (ADR-014).

## Out of scope for v2

Per the ADRs, none of the following is built, and building any of them requires a new approved ADR first:

- No SQLite, FTS, or any database (ADR-013, section 16.2).
- No embeddings, vector store, or graph search (section 16.2).
- No retrieval providers or provider contracts (ADR-015).
- No caches, metrics stores, or background indexers (section 16.2).
- No transcript copies, transcript indexes, session summaries, or session cards (ADR-016, FR-105, AT-37).
- No autonomous curator and no automatic saves (FR-080, ADR-036).
- No proactive reminders (ADR-025, evaluated only after v2 acceptance).

## Next step

Refine P0-1 as the first issue on the `Claude-Toolkit-Project` board and start the Phase 0 corrections.
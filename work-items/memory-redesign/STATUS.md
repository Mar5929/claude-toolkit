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
- Nothing built yet. No work items claimed.
- Next item: P0-1.
- Blocked: nothing.

## Work items

Status values: not started, blocked, merged. In-flight work shows on the
board and in open pull requests, not here.

| Item | What it does | Status | Proof | Notes |
|---|---|---|---|---|
| P0-1 | Continuity correction in the requirements document | not started | | |
| P0-2 | Continuity correction in the architecture document | not started | | |
| P0-3 | Scope and privacy design | not started | | |
| P0-4 | Reconcile budget, pin registry home, gold set home, and views | not started | | |
| P0-5 | Supersede the stale parallel spec | not started | | |
| P0-6 | Final consistency review and owner approval | not started | | |
| P0-7 | Section 25 pre-build artifacts | not started | | |
| P1-1 | v2 required core templates and settings | not started | | |
| P1-2 | Boot brief assembler and Claude Code startup hook | not started | | |
| P1-3 | memory_capabilities and memory_status | not started | | |
| P1-4 | Optional tracker adapter | not started | | |
| P1-5 | Codex startup route | not started | | |
| P1-6 | Current and recent rendering | not started | | |
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

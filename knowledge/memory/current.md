# Current working memory
Updated: 2026-09-22

## Project goal
Finish the active output-style and protocol work, complete the approved cleanup,
then prove and accept the whole Toolkit Operating System.

## Active work

### Forced protocols with function hooks — #396
Updated: 2026-09-22

**Goal** Enforce required steps with function-hook fact checks without limiting reasoning.

**Current status** Requirements approved. Stage 04-solution-design, In progress. The design must be revised to fact checks only and now includes the remaining #383 instruction changes and #358 behavioral case.

**Next step** Revise the design in draft PR #397 using the approved startup, Salesforce and Codex plans, then reconcile the build start with #391.

**Blocker** None for design. The overlapping build waits for #391's final disposition.

**Detailed record** [#396](https://github.com/Mar5929/claude-toolkit/issues/396), [draft PR #397](https://github.com/Mar5929/claude-toolkit/pull/397).

### Output style delivery — #391
Updated: 2026-09-22

**Goal** Make agents follow the selected style and write clear, scannable replies.

**Current status** Focused implementation is in draft PR #399. Source checks and independent source review passed. Live Claude comparison and Mike's acceptance remain open. Stage 08-build, In progress.

**Next step** Finish the live comparison, show Mike the replies, and obtain merge and acceptance separately. Reconcile #398 and #349 coverage with #396.

**Blocker** None recorded; Claude sign-in was restored.

**Detailed record** [#391](https://github.com/Mar5929/claude-toolkit/issues/391), [draft PR #399](https://github.com/Mar5929/claude-toolkit/pull/399).

**Owning session** Codex task `01a0cb21-9aa3-7c90-b674-b58bfb1757c2`.

### Remove unnecessary Knowledge programs — #381
Updated: 2026-09-22

**Goal** Remove the conversation search program and replace the save inspector with named Git commands.

**Current status** Requirements approved. Backlog; build not started. Both programs and their active references still exist.

**Next step** Build the search-program removal first; complete the lower-priority inspector removal in the same item or a recorded later task.

**Blocker** None.

**Detailed record** [#381](https://github.com/Mar5929/claude-toolkit/issues/381).

### Current working memory owns goals and links — #382
Updated: 2026-09-22

**Goal** Keep live ticket status in GitHub while working memory holds each item's goal and link, plus approved exceptions.

**Current status** Requirements approved. Backlog; build not started. This audit confirmed the current file still duplicated stale status from closed tickets.

**Next step** Deliver this contract before or as the first part of #396's working-memory fact checks.

**Blocker** Coordinate overlapping manual, rule and handoff edits with #396.

**Detailed record** [#382](https://github.com/Mar5929/claude-toolkit/issues/382).

### Documentation corrections — #385
Updated: 2026-09-22

**Goal** Correct the remaining documentation errors from the 2026-09-21 audits.

**Current status** Requirements approved. #388 completed the root-instruction corrections and removed the "Huh?" instruction. The issue body now lists only the remaining documentation work.

**Next step** Start after #396's rewrite, then check the final walkthrough, PRDs, toolkit map and #269 design records once.

**Blocker** #396 changes overlapping documentation.

**Detailed record** [#385](https://github.com/Mar5929/claude-toolkit/issues/385).

### Whole-system proof and acceptance — #384
Updated: 2026-09-22

**Goal** Prove the final Toolkit Operating System on Claude Code and Codex and obtain Mike's acceptance.

**Current status** Refinement backlog. The issue now owns all remaining live-host checks from #360, #377, #379 and #388, plus PRD review, design-reasoning retention and final acceptance.

**Next step** Refresh the proof plan after #396 and #391 finish, then run it against the final installed versions.

**Blocker** Final behavior from #396 and #391 is not delivered yet.

**Detailed record** [#384](https://github.com/Mar5929/claude-toolkit/issues/384).

## General project to-dos
None.

## Session handoffs
None.

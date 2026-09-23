# Current working memory
Updated: 2026-09-22

## Project goal
Finish the active output-style and protocol work, complete the approved cleanup,
then prove and accept the whole Toolkit Operating System.

## Active work

### Forced protocols with function hooks — #396
Updated: 2026-09-23

**Goal** Enforce required steps with function-hook fact checks without limiting reasoning.

**Current status** Steps 4 to 7 merged: PRs #401, #402, #403 and DragonFly PR #116. Status report sent to Mike. Stage 11-user-approval.

**Next step** Mike installs `protocol-guard`, syncs, and tests on Windows and the desktop app (step 8). His open decisions are listed in the issue.

**Blocker** None.

**Detailed record** [#396](https://github.com/Mar5929/claude-toolkit/issues/396).

### External memory provider — #404
Updated: 2026-09-23

**Goal** Allow mem0 or Hindsight in place of the second brain.

**Status** Requirements approved; design proposed, awaiting Mike. See [#404](https://github.com/Mar5929/claude-toolkit/issues/404).

### Output style delivery — #391
Updated: 2026-09-22

**Goal** Make agents follow the selected style and write clear, scannable replies.

**Current status** Shipped in PR #399 at `99c93ac` (head `e63ec80c`). The final 433-word style hash is `b25d7be1`; it adds a fresh reread and silent final self-check reminder. Required checks and independent source/behavior reviews passed. Final native trials completed 4/4 whole-file Reads across two two-turn fixtures, with no closing offers or unrelated advice. This is bounded improvement, not a long-chat guarantee or Mike acceptance. Claude user installs: project-init 0.77.8 and hooks-library 3.6.2; Codex project-init 0.77.8; repo copies current. PRs #349 and #398 closed as superseded; #396 T11 preserves #398's remaining non-style proposal at `665d9ed` without a wholesale merge. DragonFly's deliberate Plain English selection audited clean; its separate migration was not performed. Stage 13-deployment, In review.

**Next step** Mike tests a fresh chat and accepts the result or reports remaining issues. Keep #391 open until acceptance.

**Blocker** None. Fresh-chat acceptance is pending.

**Detailed record** [#391](https://github.com/Mar5929/claude-toolkit/issues/391), [design](../../docs/designs/391-output-style.md), [PR #399](https://github.com/Mar5929/claude-toolkit/pull/399).

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

**Next step** Refresh the proof plan after #396 finishes and #391 receives fresh-chat acceptance, then run it against the final installed versions.

**Blocker** #396 behavior is not delivered. #391 shipped, but Mike's fresh-chat acceptance is pending.

**Detailed record** [#384](https://github.com/Mar5929/claude-toolkit/issues/384).

## General project to-dos
None.

## Session handoffs
None.

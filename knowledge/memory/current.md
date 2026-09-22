# Current working memory
Updated: 2026-09-22

## Project goal
Finish authorized Knowledge delivery; verify the toolkit project and laptop;
plan whole-system work. Toolkit OS implementation is not authorized.

## Active work

### Forced protocols with function hooks — #396
Updated: 2026-09-22

**Goal** Enforce required steps with function-hook fact checks without limiting reasoning.

**Current status** Requirements and startup-cut plan (T9) approved 2026-09-22; startup cut first, including Salesforce rules. Style is #391.

**Next step** Draft Salesforce rules before/after (T10); revise design in PR #397 (T8).

**Blocker** None.

**Detailed record** [#396](https://github.com/Mar5929/claude-toolkit/issues/396).

**Owning session** Claude cloud `session_01XE1BdvMDkwgGGVivNwSFbF`.

### Output style delivery — #391
Updated: 2026-09-22

**Goal** Make agents follow selected style.

**Current status** Focused style content/delivery build approved 2026-09-22 for GPT-5.6 Sol agents. Tests, review and a replacement PR are pending. #396 owns broader rewriting; PR #398 non-style changes need an accounted disposition.

**Next step** Finish build, tests and review; open the replacement PR.

**Blocker** None.

**Detailed record** [#391](https://github.com/Mar5929/claude-toolkit/issues/391), [design](../../docs/designs/391-output-style.md).

**Owning session** Codex task `01a0cb21-9aa3-7c90-b674-b58bfb1757c2`.

### Knowledge System / Toolkit OS — #269 / #369
Updated: 2026-09-22

**Goal** Finish Knowledge delivery, install here and on laptop, then close whole-system gaps.

**Current status** Built and installed. 2026-09-21 to 22 merges: action checkpoint; silent style; team/archive questions; action hold; project sync; Terse/Plain English; AGENTS.md; and requirement 31, one owner per changing fact. Both caches match main, marketplace 0.124.11. Mike's 22 decisions and D23 are in the PRDs.

**Next step** Mike starts a fresh chat here: /context lists CLAUDE.md and AGENTS.md; replies read as Plain English. On his go, build #381 to #385. #380 moved to #391.

**Blocker** None. #384 owns whole-system proof and acceptance; seven 13-deployment items await the fresh-chat check.

**Detailed record** [#269](https://github.com/Mar5929/claude-toolkit/issues/269), [#369](https://github.com/Mar5929/claude-toolkit/issues/369), [PRD Notes](../prds/toolkit-operating-system/knowledge-system.md#notes).

**Owning session** Claude main `local_1337791d-276c-4ea7-ae8f-119db0dc8b17`; team chats archived.

### Guided work management — #337
Updated: 2026-09-19

**Goal** Deliver guided work management.

**Current status** Agent-led delivery PR #359 and single-record PR #362 merged, reported 2026-09-19; full acceptance remains open.

**Next step** 2026-09-19 to-do: complete host checks, agreed rollout and full acceptance.

**Blocker** None recorded; consult the item.

**Detailed record** [#337](https://github.com/Mar5929/claude-toolkit/issues/337).

### Toolkit instruction review — #360
Updated: 2026-09-19

**Goal** Reconcile Toolkit instructions and verify delivery.

**Current status** Seven fixes in PR #361 merged, reported 2026-09-19; acceptance remains open.

**Next step** 2026-09-19 to-do: refresh, run live-host checks and complete acceptance.

**Blocker** None recorded; consult the item.

**Detailed record** [#360](https://github.com/Mar5929/claude-toolkit/issues/360).

## General project to-dos
- 2026-09-20: [#269 D3](https://github.com/Mar5929/claude-toolkit/issues/269): proposed stale-knowledge wording is in design Notes for Mike’s review.
- 2026-09-19: instruction-overload evaluation; measured in #396 on 2026-09-22.
- 2026-09-19: [#358](https://github.com/Mar5929/claude-toolkit/issues/358): use prior
  decisions to clarify Mike's intent and push back usefully in long sessions.
  Exact example saved; investigation pending.

## Session handoffs

### 2026-09-21T16:30:44.599Z | Claude team continuation

Done. Claude chats replaced the Codex teams on 2026-09-21; #269 holds the chat IDs and standing review-and-merge instruction.

### 2026-09-20T11:01:22.781Z | Knowledge delivery coordinator

Continue [#269](https://github.com/Mar5929/claude-toolkit/issues/269): finish authorized tasks, assess gaps, then plan remaining work. PR #366 merged at `3703c5c` with Mike's combined approval; cleanup is complete. Verify PR #367, compare merged behavior with the [PRD](../prds/toolkit-operating-system/knowledge-system.md) and [design Notes](../../docs/designs/269-knowledge-system.md#notes), then update the [remaining plan](../../docs/designs/269-knowledge-system/implementation-plan.md) with unmet outcomes, dependencies, owners and acceptance evidence. Requirements/design, asynchronous helpers, host/late-Stop and behavior proofs, rollout and acceptance remain open; no full-system acceptance or rollout authority. Do not change authentication. #269 is open/In progress after its merge closure was corrected. Source coordinator: `01a0baf5-bc72-7a22-91f3-3781f5dafef9`.

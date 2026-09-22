# Current working memory
Updated: 2026-09-22

## Project goal
Finish the authorized Knowledge delivery, verify the toolkit project and laptop,
then plan remaining whole-system work. The whole Toolkit OS is not authorized
for implementation.

## Active work

### Knowledge System / Toolkit OS — #269 / #369
Updated: 2026-09-22

**Goal** Finish the Knowledge delivery, install it on this project and laptop, then close the whole-system gaps.

**Current status** Knowledge System almost done: #374 (action checkpoint), #376 (silent style hook) and #378 (team questions) merged; #386 (simple action hold) built and in review. Install done except pull request #387 in review; one plugin refresh owed after #386. Mike's 22 decisions of 2026-09-21 are recorded in the PRDs; builds tracked in #380 to #385, #388 (AGENTS.md move, planning) and #389 (Terse style).

**Next step** Main merges #386 and #387 after their delta checks, then has the sync chat refresh plugins once more. Mike opens one fresh Claude Code and one fresh Codex chat and checks the replies read as Plain English.

**Blocker** None on delivery. Whole-system proof and acceptance are #384.

**Detailed record** [#269](https://github.com/Mar5929/claude-toolkit/issues/269), [#369](https://github.com/Mar5929/claude-toolkit/issues/369), [PRD Notes](../prds/toolkit-operating-system/knowledge-system.md#notes).

**Owning session** Claude main `local_1337791d-276c-4ea7-ae8f-119db0dc8b17`; chat ids in #269.

### Guided work management — #337
Updated: 2026-09-19

**Goal** Deliver guided work management.

**Current status** Agent-led delivery PR #359 and single-record PR #362 merged;
full acceptance remains open.

**Recent progress** Merges reported in the 2026-09-19 coordinator update.

**Next step** Complete remaining host checks and agreed rollout.

**Blocker** No specific blocker recorded here; consult the item.

**To-dos** 2026-09-19: host checks, rollout and full acceptance.

**Detailed record** [#337](https://github.com/Mar5929/claude-toolkit/issues/337).

### Toolkit instruction review — #360
Updated: 2026-09-19

**Goal** Reconcile Toolkit instructions and verify delivery.

**Current status** Seven fixes merged in PR #361; acceptance remains open.

**Recent progress** Merge reported in the 2026-09-19 coordinator update.

**Next step** Refresh and run live-host checks.

**Blocker** No specific blocker recorded here; consult the item.

**To-dos** 2026-09-19: refresh, live-host checks and acceptance.

**Detailed record** [#360](https://github.com/Mar5929/claude-toolkit/issues/360).

## General project to-dos
- 2026-09-20: [#269 D3](https://github.com/Mar5929/claude-toolkit/issues/269): proposed stale-knowledge wording is in design Notes for Mike’s review.
- 2026-09-19: instruction-overload evaluation remains underway; measured outcome pending.
- 2026-09-19: [#358](https://github.com/Mar5929/claude-toolkit/issues/358): use prior
  decisions to clarify Mike's intent and push back usefully in long sessions.
  Exact example saved; investigation pending.

## Session handoffs

### 2026-09-21T16:30:44.599Z | Claude team continuation

Done. The Codex teams were replaced by Claude chats on 2026-09-21; #269 holds the chat ids and the standing review-and-merge instruction.

### 2026-09-20T11:01:22.781Z | Knowledge delivery coordinator

Continue [#269](https://github.com/Mar5929/claude-toolkit/issues/269): finish authorized tasks, assess delivered versus missing, then plan remaining work.
PR #366 merged at `3703c5c` with Mike's combined approval; exact cleanup is complete.
First verify remaining PR #367 status, then assess merged behavior against the
[PRD](../prds/toolkit-operating-system/knowledge-system.md) and
[design Notes](../../docs/designs/269-knowledge-system.md#notes). Update the
[remaining plan](../../docs/designs/269-knowledge-system/implementation-plan.md)
with unmet outcomes, dependencies, owners and acceptance evidence.
Full requirements/design, asynchronous helpers, host/late-Stop and behavior proofs,
rollout targets and acceptance remain open; no full-system acceptance or rollout
authority. Do not change authentication. #269 is open/In progress after correcting
merge closure. Source coordinator: `01a0baf5-bc72-7a22-91f3-3781f5dafef9`.

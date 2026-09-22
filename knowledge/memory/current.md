# Current working memory
Updated: 2026-09-22

## Project goal
Finish the authorized Knowledge delivery, verify the toolkit project and laptop,
then plan remaining whole-system work. The whole Toolkit OS is not authorized
for implementation.

## Active work

### Forced protocols with function hooks — #396
Updated: 2026-09-22

**Goal** Agents follow required toolkit steps every time, using function-hook fact checks, without limiting how they reason.

**Current status** Requirements and startup-cut plan (T9) approved 2026-09-22. The cut goes first, Salesforce rules included. Style in #391.

**Next step** Draft Salesforce rules before/after (T10); revise design in PR #397 (T8).

**Blocker** None.

**Detailed record** [#396](https://github.com/Mar5929/claude-toolkit/issues/396), [#391](https://github.com/Mar5929/claude-toolkit/issues/391).

**Owning session** Claude cloud `session_01XE1BdvMDkwgGGVivNwSFbF`.

### Knowledge System / Toolkit OS — #269 / #369
Updated: 2026-09-22

**Goal** Finish the Knowledge delivery, install it on this project and laptop, then close the whole-system gaps.

**Current status** Knowledge System built and installed. Merged 2026-09-21 to 22: action checkpoint, silent style hook, team and archive questions, simple action hold, project sync, Terse style, Plain English rewrite, AGENTS.md as the instruction file, and the "one owning file for a changing fact" rule (requirement 31). Both plugin caches match main (marketplace 0.124.11). Mike's 22 decisions of 2026-09-21 and D23 are in the PRDs.

**Next step** Mike opens one fresh Claude Code chat here: /context lists CLAUDE.md and AGENTS.md; replies read as Plain English. Then start the follow-up builds #381 to #385 when Mike says go. #380 moved into #391.

**Blocker** None. Whole-system proof and acceptance are #384; the seven items at 13-deployment wait for the fresh-chat check.

**Detailed record** [#269](https://github.com/Mar5929/claude-toolkit/issues/269), [#369](https://github.com/Mar5929/claude-toolkit/issues/369), [PRD Notes](../prds/toolkit-operating-system/knowledge-system.md#notes).

**Owning session** Claude main `local_1337791d-276c-4ea7-ae8f-119db0dc8b17`; team chats archived.

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
- 2026-09-19: instruction-overload evaluation; measured in #396 on 2026-09-22.
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

# Current working memory
Updated: 2026-09-21

## Project goal
Finish the authorized Knowledge delivery, verify the toolkit project and laptop,
then plan remaining whole-system work. The whole Toolkit OS is not authorized
for implementation.

## Active work

### Knowledge System / Toolkit OS — #269 / #369
Updated: 2026-09-21

**Goal** Finish authorized delivery and target sync, then plan whole-system gaps.

**Current status** #370 `b3b8fec`, #372 `999bfcb`, #371 `283258a`, #373 `b201353` merged; #367 superseded. Draft #374 at `0d082a6`: independent review and full check rerun running in Claude chats; merge and sync pending. OS gap assessment running.

**Recent progress** 2026-09-21: Codex usage limits stopped the Codex teams with sessions open. Mike's handoff prompt moved coordination to Claude Code desktop: Fable main, Opus executors, four local chats, messaging confirmed.

**Next step** Main reads each chat's report, sends review findings to Knowledge finish, asks Mike whether his merge approval covers #374, merges, then starts the sync chat. Mike performs normal hook trust.

**Blocker** #374 approval coverage awaits Mike. Full requirements/design acceptance, D3/product choices, broader-host proof and whole-system acceptance open.

**To-dos** 2026-09-21: review/merge, sync, gap report, decisions/acceptance.

**Detailed record** [#269](https://github.com/Mar5929/claude-toolkit/issues/269), [#369](https://github.com/Mar5929/claude-toolkit/issues/369), [design Notes](../../docs/designs/269-knowledge-system.md#notes), [PRD Notes](../prds/toolkit-operating-system/knowledge-system.md#notes), [plan](../../docs/designs/269-knowledge-system/implementation-plan.md).

**Owning session** Claude main `local_1337791d-276c-4ea7-ae8f-119db0dc8b17`; chat ids in #269. Codex teams stopped; do not restart them alongside Claude. Assignment is not liveness.

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
- 2026-09-19: Notes workflow merged; project refresh remains.
- 2026-09-21: Mike asked whether the style-handshake sentence can run unseen; a read-only chat is preparing options.

## Session handoffs

### 2026-09-21T16:30:44.599Z | Claude team continuation

Resumed 2026-09-21 by the Claude main above. The [team continuation](../../docs/designs/269-knowledge-system/implementation-plan.md#claude-team-continuation-2026-09-21) holds roles and evidence limits; #269 holds chat ids and next steps. Source: Codex main `01a0bf79-ee0e-7a83-86df-251957d7f5e8`.

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

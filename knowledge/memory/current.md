# Current working memory
Updated: 2026-09-20

## Project goal
Finish authorized packages, assess actual delivery, then plan remaining
whole-system work. The whole Toolkit OS is not authorized for implementation.

## Active work

### Knowledge System — #269
Updated: 2026-09-20

**Goal** Deliver the approved Knowledge packages, assess delivery, then plan remaining work.

**Current status** The bounded instruction, schema/audit and handoff package merged in
[PR #366](https://github.com/Mar5929/claude-toolkit/pull/366) at `3703c5c` after
Mike's explicit combined merge approval. Full Knowledge System requirements/design
approval, delivery and acceptance remain open. This does not authorize whole Toolkit OS implementation.

**Recent progress** 2026-09-20: R1–R30 assessment and ordered remaining plan prepared.
67 deterministic cases pass. Found remaining feedback-template contradictions,
late-Stop correlation weakness and startup/save-moment proof gaps. #367 needs
its five-path test/evidence change reconciled onto main; merge approval is separate.

**Next step** Assign bounded corrections and host/save proofs from the plan;
review D3 wording and remaining product choices with Mike.

**Blocker** Claude model proof was blocked by expired OAuth; do not change authentication.
Native delivery, helper lifetime/results, rollout and full acceptance remain open.

**To-dos** 2026-09-20: feedback correction, #367 preparation, host/helper and behavior
proofs, D3 refinement, remaining approvals and agreed rollout.

**Detailed record** [#269](https://github.com/Mar5929/claude-toolkit/issues/269),
[design Notes](../../docs/designs/269-knowledge-system.md#notes),
[PRD Notes](../prds/toolkit-operating-system/knowledge-system.md#notes),
[implementation plan](../../docs/designs/269-knowledge-system/implementation-plan.md).

**Owning session** Orchestrator `01a0bf79-ee0e-7a83-86df-251957d7f5e8`.
Mike authorized managing helpers/separate tasks and archiving completed tasks
after communication and verified handoffs. Assignment does not prove liveness.

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

## Session handoffs

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

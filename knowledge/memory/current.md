# Current working memory
Updated: 2026-09-20

## Project goal
Finish the authorized Knowledge delivery, verify the toolkit project and laptop,
then plan remaining whole-system work. The whole Toolkit OS is not authorized
for implementation.

## Active work

### Knowledge System — #269
Updated: 2026-09-20

**Goal** Finish the authorized Knowledge packages and target sync, then plan remaining work.

**Current status** Reviewed packages merged in PRs
[#370](https://github.com/Mar5929/claude-toolkit/pull/370) `b3b8fec`,
[#372](https://github.com/Mar5929/claude-toolkit/pull/372) `999bfcb`,
[#371](https://github.com/Mar5929/claude-toolkit/pull/371) `283258a`, and
[#373](https://github.com/Mar5929/claude-toolkit/pull/373) `b201353`.
PR #367 is closed as superseded; its branch/worktree is preserved. PR #374
delivery, source/configuration/version integration, and review remain pending.

**Recent progress** Independent Astra/two-Sol source review passed. Evidence found
a bounded R6 citation pass, prompted Codex CLI R2 startup/recovery pass, and
bounded Codex Desktop native save and lost-result recovery pass. The linked plan
and review index preserve exact heads, failures, limits and unresolved evidence.

**Next step** Finish and review PR #374, then sync the toolkit project and this
laptop using shipped behavior where possible, without unnecessary migration or
authentication changes. Normal Codex hook trust needs Mike's user action.

**Blocker** Full requirements/design acceptance, D3 and other product choices,
normal target activation, broader hosts, rollout, and full acceptance remain open.

**To-dos** 2026-09-20: finish #374; verify project/laptop sync; resolve remaining
product choices and acceptance evidence.

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

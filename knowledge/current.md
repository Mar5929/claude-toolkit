# Current working memory
Updated: 2026-09-17

## Project goal
Ship the Knowledge System; define guided work management.
Milestones: approve requirements/design, build, test, deliver.

Designs use [handshakes](prds/toolkit-operating-system/toolkit-operating-system.md#5-the-agents-judgment).

## Active work

### Knowledge System — #269
Updated: 2026-09-17

**Goal** Ship reliable knowledge lookup, upkeep, and saves.

**Current status** Task D1 solution-design review; full approvals pending; no build authorization.

**Recent progress**
- Sept 17: Acme chose core knowledge plus `delivery/architecture/`, no Guide; every prompt gets a short routing reminder and intent acknowledgment.

**Next step** Review step 2 routing and prompt criteria; remaining wording, acknowledgment transport, and end-turn handling are open.

**Blocker** Requirements/design approval before build.

**To-dos**
- Complete the 12-step walkthrough, reconcile answers, and obtain separate PRD/design approvals.

**Detailed record** [Issue #269 task D1](https://github.com/Mar5929/claude-toolkit/issues/269#task-d1--review-and-finalize-the-solution-design); [walkthrough](../docs/designs/269-knowledge-system/design-walkthrough.md).

### Guided work management — #337
Updated: 2026-09-17

**Status** PR #352 merged the authorized roadmap/task scope to `main` at 8355a40. The full PRD remains proposed; rollout and delivered acceptance remain open.

**Coverage** R4 is delivered for local records. R2/R3 guidance and R5 continuation exist but lack fresh-agent proof; R1 offer/decline behavior is not implemented.

**Next** Refine and authorize R1, test fresh-session and failed-save recovery, then obtain rollout acceptance.

**Record** [Issue #337](https://github.com/Mar5929/claude-toolkit/issues/337).

## General project to-dos
None recorded.

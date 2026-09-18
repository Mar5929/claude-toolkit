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

**Current status** Task D1: autonomous design reconciliation and implementation planning authorized Sept 17; runtime work has not started.

**Recent progress**
- Acme: core knowledge, `delivery/architecture/`, no Guide. Master preserves detailed parts and flows; startup read/ack and every-prompt reminder guide the design.

**Next step** Implementation plan independently reviewed. Review its recommended baseline and start D1-P1 host proofs before dependent production work.

**Blocker** Requirements/design approval before build.

**To-dos**
- Resolve evidence and material policy choices without inventing approvals; retain Acme as acceptance scenario.

**Detailed record** [Task D1](https://github.com/Mar5929/claude-toolkit/issues/269#task-d1--review-and-finalize-the-solution-design); [implementation plan](../docs/designs/269-knowledge-system/implementation-plan.md).

### Guided work management — #337
Updated: 2026-09-17

**Status** PR #352 merged the authorized roadmap/task scope to `main` at 8355a40. The full PRD remains proposed; rollout and delivered acceptance remain open.

**Coverage** R4 is delivered for local records. R2/R3 guidance and R5 continuation exist but lack fresh-agent proof; R1 offer/decline behavior is not implemented.

**Next** Refine and authorize R1, test fresh-session and failed-save recovery, then obtain rollout acceptance.

**Record** [Issue #337](https://github.com/Mar5929/claude-toolkit/issues/337).

## General project to-dos
None recorded.

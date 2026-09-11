# What is happening right now

Short-term working memory. Overwritten, never added to. Nothing here is a
lasting fact: anything worth keeping goes through `/remember` and gets its own
file. Capped at 2,000 characters, and the checker enforces it.

## Objective

Finish refining the knowledge-system PRD for issue #269 with the owner, then
bring the issue body in line with it. (2026-09-10)

## Work item

Issue #269. The PRD is `knowledge/prds/knowledge-system.md`, status proposed,
28 requirements. Approved clarifications are saved there as the owner decides
them. The full requirements and implementation are not yet approved.

## Blocked on

Remaining requirements decisions are under review; no implementation is
authorized by this refinement. (2026-09-10)

## Next step

1. Review the remaining requirements for consistency, including how proposed
   and partly delivered behavior is distinguished. Full requirements approval
   and solution design follow the remaining choices.
2. The System Guide (`knowledge/system/`) is its own plugin on issue #304, in
   another session. The rules audit is issue #305.

## Picked up this session

- Approved on 2026-09-10: a failed save pauses only it and dependent work;
  authorized PRD refinement covers clear owner answers and corrections without
  repeat approval. Boundaries and checks are in PRD requirements 3 and 10.
- Approved on 2026-09-10: automatically retain unanswered proposals in a planned
  `knowledge/memory-inbox.md`, separate from trusted knowledge; recover approved
  unfinished saves without repeat approval. PRD requirement 28; not implemented.
- Approved on 2026-09-10: PRDs hold behavior, user experience, and process
  requirements. Build roadmaps belong in solution designs and work-item plans;
  delivery status stays in the tracker. PRD requirements 16 and 18.

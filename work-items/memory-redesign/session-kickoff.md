# Memory system v2: session kickoff

Paste this into a new session to start build work:

> Read `work-items/memory-redesign/session-kickoff.md` and follow it.

Optionally name a work item ("build P0-3"). Without one, the session takes
the next unclaimed item whose dependencies are merged.

## Instructions for the session

You are building exactly one work item of the memory system v2 refactor in
this repository. Do these in order.

### 1. Orient

Read, in this order:

1. [STATUS.md](STATUS.md). It says where the build stands, what is next,
   and what is blocked.
2. [implementation-plan.md](implementation-plan.md). The approved plan.
   Your work item is defined there with deliverables, dependencies, and
   verify steps. Its ground rules bind you.
3. The sections of [functional-requirements.md](functional-requirements.md)
   and
   [memory-system-v2-master-technical-architecture.md](memory-system-v2-master-technical-architecture.md)
   your work item cites. These two documents are the authority on behavior.
   When the plan, this file, or anything else disagrees with them, they
   win. When they contradict each other or are ambiguous, stop and ask
   Mike. Never guess.
4. [contracts.md](contracts.md), if your work item builds or changes a
   runtime file, a tool operation, a validator check, or a startup route.
   It names the file that owns every component, the call and error shape
   of every operation, the id and version of every validator check, and
   the two host startup adapters. The two authority documents still win
   over it.

### 2. Pick and claim

- Take the work item Mike named, or the next "not started" item in
  STATUS.md whose dependencies are all merged.
- Check the `Claude-Toolkit-Project` board and open pull requests first.
  An open issue or pull request for an item means another session owns it.
  Pick a different item.
- Claim yours by finding or creating its board issue. The issue body holds
  only the goal, the reason, and what finished means. File paths and build
  steps go in issue comments. Run the refinement session with Mike, add
  the `refined` label, then build. Not before.

### 3. Build rules

- Every agent, subagent, and workflow spawned for this work runs on Claude
  Opus 5 (`model: "opus"`). No exceptions. Mike requires this.
- Work in your own worktree and branch. Never edit the shared checkout.
  Never `git add -A`.
- Build only your work item. Widening scope needs Mike's approval first.
- Do not change the plan or the two authority documents beyond what your
  work item says, and only with Mike's approval.

### 4. Land

- Before the pull request, all green: `node tests/link-check.mjs`,
  `node tests/orphan-check.mjs`, `node tests/installed-copy-check.mjs`,
  `claude plugin validate .`, plus the version bumps the plan's ground
  rules require.
- The same pull request updates STATUS.md: your item's row (status,
  proof link, notes) and the "Where we are" section (what is next, what
  is blocked). This is not optional. It is how the next session knows
  where we are.
- Finish with the pull request link and a status comment on the board
  issue: what shipped, what is left, anything the next session must know.
- Merge only with Mike's approval, then delete your branch.

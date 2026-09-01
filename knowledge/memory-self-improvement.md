# What this project has learned about saving

This is the project's record of what the owner counts as memory-worthy. It is
operational state, like `knowledge/current.md`. Writing to it needs no approval.

It is never a memory store, and nothing in it is a lasting project fact. When a
lesson here disagrees with `knowledge/README.md`, the manual wins, and the
disagreement is said out loud instead of quietly kept.

Never write a secret or private personal information here. The manual's
never-save floor covers this file too.

Capped at 8,000 characters, and the checker enforces it. `/reflect` keeps it
under the cap by merging repeated lines into lessons. Nothing is truncated
silently.

## Lessons

- **A fact the same change already commits to a repository file is not
  memory.** Eight candidates in August 2026 were rejected on this one point.
  If the change writes the fact into a rule, an index, a skill, a README, or a
  comment beside a test, a future agent reads it there. Check what the change
  already commits before proposing it.

## Recent decisions

One line per candidate: the date, the candidate in a few words, the outcome
(approved, edited, or rejected), and the owner's reason in the owner's own
words, or "no reason given".

- 2026-08-31. Do not copy instructions Claude Code already ships, with the three found on that date. Approved. Reason: "okay, you can add that proposal".
- 2026-08-31. The plain-language style is 183 lines over its own 50-line ceiling. Rejected before proposing. Live status and an open task, and now recorded in the output-styles index.
- 2026-08-31. write-for-a-stranger.md is missing from the toolkit's machine rules. Rejected before proposing. A gap to ticket, not lasting truth.
- 2026-08-31. The handoff-verifier subagent versus the Opus 5 warning about verifier subagents. Rejected before proposing. The owner has not ruled on it, so nothing is settled.
- 2026-08-31. Remove the plain-language output style and the size-documents-to-the-task rule, and use Claude Code's built-in Concise style everywhere. No memory proposed; the change is recorded in issue #245, the two rules indexes, docs/toolkit-map.md, README.md, and .claude/toolkit-sync.md. Reason: "Basically, on every toolkit project, I'm just going to use the concise output style from now on". This also supersedes the 183-line ceiling line above: the output-styles index it names was deleted in the same change.
- 2026-08-31. A word budget for the default-on rule set. Rejected before proposing, questions 1 and 6. The owner cut specific files and never set a number, so a budget would be invented.
- 2026-08-31. Widen the no-duplicating-Claude-Code memory to say the principle also removes rules already in the toolkit, after honest-verification.md and do-the-technical-work.md were deleted for that reason. Rejected. Reason: "Skip it, just open the PR". The removal record in the general rules index already carries the facts.
- 2026-08-31. Mike's plainer prose in the knowledge manual is deliberate and must not be shortened by a cleanup pass. Approved. Reason: "yes to bot".
- 2026-08-31. knowledge-system.md stops restating the save policy and the approval field list, and points at the manual instead. Approved. Reason: "yes to bot", after asking "is this repository's knowledge system spec up to date?"
- 2026-08-31. The raised manual size caps, the dedupe gate's move into remember step 2, and the reject-example deletion. Rejected before proposing. All three are committed in the same change, two of them with a comment in the test explaining why.
- 2026-08-31. A proposal must say the word Memory or Specification, not just a folder path. Not memory: the owner asked for it as a system change, and it is now the Type field in the manual's approval block, asserted by the startup check. Reason: "in the fucking memory system, it should say whether you're proposing a memory or a spec".
- 2026-09-01. orphan-check only scans plugins/, docs/, and tests/, so tracked files elsewhere are invisible to every check, which is how a committed graphify-out/ folder went unnoticed. Rejected before proposing. Worked out by the agent alone, and it is a gap to ticket rather than settled truth; the constant is readable in tests/orphan-check.mjs.
- 2026-09-01. Mike shipped explain-simply-reminder knowing the toolkit deleted style-reminder for per-message overhead, on the grounds that a fixed six-line reminder is not the 4000-character one that was removed. Rejected before proposing, question 5. The decision and its reasoning are committed in plugins/hooks-library/README.md, docs/toolkit-map.md, README.md, and issue #258.
- 2026-09-01. second-brain shipped two content changes at 4.5.0 without a version bump, so nothing installing from the toolkit picked them up. Rejected before proposing. A process slip readable in git log, and plugins/CLAUDE.md already carries the bump rule.
- 2026-09-01. Mike wants recall to fire when troubleshooting an error or running a multi-step process, so the agent checks whether this project already worked out the fix before solving it again. Rejected before proposing, question 5. The decision is committed in the recall skill's own description and the docs/toolkit-map.md trigger column in this same change. His example was a DevOps Center pipeline fix in the Dragonfly project that he wants findable two weeks later.
- 2026-09-01. A fix this project worked out is memory, not a rule, because one rule per fix would bury the standing instructions the rules folder is for. Rejected before proposing, question 5. Mike's reasoning is committed in the "A past fix is not a procedure" section of knowledge/specs/knowledge-system.md and in the manual's save test in the same change.
- 2026-09-01. The manual's word cap moved from 1,950 to 2,000 after the carve-out landed at 1,949. Rejected before proposing. Not memory: it is a test threshold, and the reason is in a comment beside the assertion in tests/knowledge-startup-check.mjs.
- 2026-09-01. PR #262 was merged ahead of the proposal-template session, which had uncommitted edits to the same manual. Rejected before proposing. Live coordination between sessions, not lasting truth.
- 2026-09-01. knowledge-system.md follows the renamed proposal fields and records the rendered-Markdown, no-code-fence, subject-line-first design. Approved. Reason: "save it".
- 2026-09-01. Requirements run as long as the work needs, and stage 03 approval is not the same thing as a long document. Rejected before proposing. The decision and its reasoning are committed in work-item-stages.md, the work skill, both work-tracker reference files, the plugin README, and a comment in tracker.mjs.
- 2026-09-01. The six-section check left small items a choice between invented requirements and a permanent Backlog. Rejected before proposing. It is the reason recorded in issue #264, the commit message, and the code comment that replaced the check.
- 2026-09-01. WI-033 in DragonFly could not leave Backlog because it was never a requirements-driven ticket. Rejected before proposing. Another project's live work-item status, and the general case is now committed here.

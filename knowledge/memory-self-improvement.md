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

Nothing learned yet.

## Recent decisions

One line per candidate: the date, the candidate in a few words, the outcome
(approved, edited, or rejected), and the owner's reason in the owner's own
words, or "no reason given".

- 2026-08-31. Do not copy instructions Claude Code already ships, with the three found on that date. Approved. Reason: "okay, you can add that proposal".
- 2026-08-31. Where voice instructions go, output style versus rules folder. Rejected before proposing, question 5. Already written in the output-styles index and in the new rule file.
- 2026-08-31. The plain-language style is 183 lines over its own 50-line ceiling. Rejected before proposing. Live status and an open task, and now recorded in the output-styles index.
- 2026-08-31. write-for-a-stranger.md is missing from the toolkit's machine rules. Rejected before proposing. A gap to ticket, not lasting truth.
- 2026-08-31. The handoff-verifier subagent versus the Opus 5 warning about verifier subagents. Rejected before proposing. The owner has not ruled on it, so nothing is settled.
- 2026-08-31. Remove the plain-language output style and the size-documents-to-the-task rule, and use Claude Code's built-in Concise style everywhere. No memory proposed; the change is recorded in issue #245, the two rules indexes, docs/toolkit-map.md, README.md, and .claude/toolkit-sync.md. Reason: "Basically, on every toolkit project, I'm just going to use the concise output style from now on". This also supersedes the 183-line ceiling line above: the output-styles index it names was deleted in the same change.
- 2026-08-31. The toolkit deleted spec-before-you-build.md and track-open-topics.md and cut three rules hard. Rejected before proposing, question 5. The removal record and its reasons are committed in plugins/project-init/library/rules/general/README.md, project-sync/SKILL.md, and session-skills/README.md.
- 2026-08-31. The spec-check and track-tasks skills now stand with no rule behind them. Rejected before proposing, question 5. Written into their own README sections in the same change.
- 2026-08-31. A word budget for the default-on rule set. Rejected before proposing, questions 1 and 6. The owner cut specific files and never set a number, so a budget would be invented.
- 2026-08-31. The work-tracker carve-out must stay in parallel-agent-sessions.md or an agent refuses to run the local tracker. Rejected before proposing, question 5. The carve-out line is committed in the rule itself.
- 2026-08-31. Widen the no-duplicating-Claude-Code memory to say the principle also removes rules already in the toolkit, after honest-verification.md and do-the-technical-work.md were deleted for that reason. Rejected. Reason: "Skip it, just open the PR". The removal record in the general rules index already carries the facts.
- 2026-08-31. Codex expands no import syntax, so an @CLAUDE.md line in AGENTS.md loads nothing while a plain instruction to open the file works. Rejected before proposing, question 5. Written into thin-claudemd.md, root-file-examples.md, project-init/SKILL.md, project-sync/SKILL.md, setup-flow.md, and the comment block in tests/installed-copy-check.mjs in the same change.
- 2026-08-31. CLAUDE.md is a router and a map, and AGENTS.md is one pointer line. Rejected before proposing, question 5. thin-claudemd.md and root-file-examples.md are the build authority and now say it.
- 2026-08-31. Why keep-claudemd-current.md was deleted from the toolkit. Rejected before proposing, question 5. The removal record and its reason are committed in the general rules index removed-files table, .claude/rules/README.md, and docs/toolkit-map.md, the same way spec-before-you-build.md was handled earlier the same day.
- 2026-08-31. Anthropic's 200-line CLAUDE.md target and the "would removing this cause a mistake" test. Rejected before proposing, question 5 and routing. Outside source material, now quoted with its URL in thin-claudemd.md.

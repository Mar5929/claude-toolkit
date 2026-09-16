# Fix list, round 1 addendum (rulings on review 1; review 2 rulings appended when it lands)

## From review 1 (requirements lens)

A1. Startup print order in `startup-state.mjs` (from fix 1): print the cheap, high-value items first so the overflow rule never drops them: the inbox entries' heading and state lines; the glossary when under 2,000 characters, else its path; the two index paths with entry counts; the System Guide line; then `knowledge/memory/current.md` whole; then the confirmation or restore line. Requirement 28, 7, and 19 needs come before the working-memory text.

A2. Requirement 18's tables do not fit the manual. Ruling: the full routing table and the four-row test live in `plugins/second-brain/skills/knowledge-save/references/routing.md`, opened by the save skill at the moment it chooses a destination, and by `knowledge-find` when a lookup needs it. The manual keeps a ten-line summary of the homes (one line per home, no examples). Requirement 18's "given to the agent in every project" is met by delivery at the moment of routing; say that in section 6, section 7 row 18, and section 13 as an interpretation for Mike. The checker warns above 4,000 characters for the manual and fails above 5,000; the first startup hook's budget (SOUL 1,000, project.md 1,500, manual 5,000, version line) still fits 9,500.

A3. Requirement 9's interview clause. Add to the `knowledge-save` body and to the standing rule: during an authorized requirements interview, a settled decision is saved and published before the next question is asked, without a second permission request; several decisions settled in one reply share one commit and push. Add the interview case to section 5 Part 4 and to the testing plan's seeded situations.

A4. Requirement 17. The save skill never approves or writes a project skill. When a candidate is a repeatable procedure, `knowledge-save` shows the owner a short skill proposal (name, purpose, suggested path `.claude/skills/<name>/SKILL.md` or the Codex equivalent) and stops; writing the skill needs the owner's yes through a skill-authoring step the toolkit does not yet define. Name that missing step as a dependency in section 9, add a small work item "project skill proposal step" to section 12, restate requirement 17's full Check in section 7 row 17, and rewrite section 13.7 so the recommendation matches.

A5. Section 7 rows 1, 26, and 29: nothing enforces them at run time. Relabel each as GUIDED with the note "checked at build review, not at run time", and keep the three kinds of control as defined in section 3.

A6. Simpler mechanism accepted: move the Bash-path after-write check out of PostToolUse on Bash and into the Stop hook `session-review-nudge.mjs`, which already runs `git status`. At Stop it checks files changed under knowledge/ and ai-external-knowledge/ since its last run, runs the checker on them, and returns additionalContext with any failure so the agent fixes it before the turn ends. PostToolUse on Edit|Write keeps the immediate check. Remove the per-Bash-call hook from every table and the flowchart; update the cost lines.

A7. Simpler mechanism accepted: `knowledge-write-guard.mjs` also denies the `Write` tool on `knowledge/memory/current.md` and `knowledge/memory-inbox.md`, with the reason "Read the current file and use Edit, so another session's change is not overwritten." Edit's exact-match rule then protects parallel sessions at no cost. Bash writes still bypass this; say so once.

A8. Add the four missing section 13 entries that review 1 names, with the same entry shape as the others.

A9. Apply every other should-fix and nit in review-1-requirements.md that does not conflict with fix-list-round-1.md or the items above.

## From review 2 (harness lens)

B1. F1 accepted. In Claude Code, a Stop hook's `additionalContext` keeps the conversation going under the same `stop_hook_active` and eight-continuation protections as `decision: block` (hooks.md, "Stop decision control"). So the end-of-turn nudge forces one continuation on both harnesses; only the transcript label differs. Rewrite section 6 (session-review-nudge.mjs), section 8.4, and the option and open question about the nudge: it fires at most once per session per threshold, it costs one forced continuation, and Mike decides whether to have it at all (it was an agent recommendation, never approved). The after-write reconciliation that now runs at Stop (A6) speaks only on a checker failure, which the agent has to fix before the turn ends anyway; say that this also continues the turn.
B2. F2 is resolved by the two-hook split (fix 1 and A1). Make sure the per-part sizes and the drop order are stated for each hook.
B3. F3 accepted. The `knowledge-save` frontmatter carries `allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/tools/session-marker.mjs *)` so the injected marker command runs without a permission prompt; an injected command whose permission check does not return allow aborts the whole skill invocation (skills.md, "Inject dynamic context"). Add the one-hour test: invoke the skill in default permission mode and confirm the marker file appears and the skill body loads.
B4. F4 accepted. Every gate `if` pattern gets a PowerShell twin handler entry (`PowerShell(gh pr create *)` and so on) under the `Bash|PowerShell` matcher, since one `if` rule matches one tool. Update the hooks.json outline.
B5. F5 accepted. Codex `additionalContextLimit` counts tokens. Set it to 10,000 tokens and say why (a token threshold above the 9,500-character budget of either startup hook).
B6. F8 accepted. Every hook entry sets `timeout`: 15 seconds for the two startup hooks, 5 seconds for the guards and the after-write check, 10 seconds for the Stop hook. A timed-out hook fails open, so the guards must be fast; say so in the part details and add "hook runtime under the timeout on a slow machine" to the build-time proofs.
B7. Add the eleven extra build-time proofs from review-2-harness.md section 3 to section 10.
B8. Apply every other should-fix and nit in review-2-harness.md that does not conflict with the rulings above.

# Peer critique of the 30 knowledge-system requirements

Written 2026-09-16 by the peer design lead. Read against:

- PRD: `knowledge/prds/toolkit-operating-system/knowledge-system.md` (1,951 lines; requirements start at line 456).
- Approved walkthrough: `knowledge/prds/toolkit-operating-system/knowledge-system-walkthrough.html`, text extracted to `scratchpad/walkthrough.txt` (899 lines). Line numbers below marked "WT" refer to that extraction.
- Related PRDs in `knowledge/prds/`: `toolkit-operating-system.md` (OS PRD), `system-guide.md` (SG PRD), `guided-delivery.md`, `work-item-upkeep.md`, `guided-work-management.md`.
- Current parts: `plugins/second-brain/` (hooks, skills, tools), `.claude/settings.json`, `knowledge/README.md`.
- Captured Claude Code docs at `ai-external-knowledge/claude-code/` (captured 2026-09-04), live docs checked 2026-09-16 (changelog at version 2.1.273, 2026-09-15).

Two facts checked today that change the design ground:

1. "Function hooks" (also called "Mods") are not shipped. The live hooks page lists five handler types: `command`, `http`, `mcp_tool`, `prompt`, `agent`. GitHub issue anthropics/claude-code#91870 (posted 2026-09-03 by an Anthropic engineer) says they are behind `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`, are still changing, and will ship "on the scale of weeks". The PRD's preferred direction at lines 1826 to 1831 should not be built on today.
2. Codex now has hooks. The Codex source tree (`github.com/openai/codex`, `codex-rs/hooks/src/events/`) holds `session_start`, `user_prompt_submit`, `pre_tool_use`, `post_tool_use`, `permission_request`, `compact`, `stop`, `session_end`, and `interrupt`. Secondary sources say hooks are on by default since Codex 0.150.1 (2026-08-27) and that each non-managed hook must be trusted once. The 2026-09-03 decision "Codex is equipped but ungated because it has no PreToolUse" (issue 269, conflict 6) is out of date. The official Codex documentation site is blocked from this machine, so every Codex fact here needs a check at build time.

Format of each entry: clear enough to design from; fit with the end-to-end experience and Mike's philosophy; conflicts; what design decides.

## 1. Plain parts only (lines 456 to 473)

- **Clear:** yes, with one gap. "Built from ... rules, hooks, skills, Markdown files, and Git. Nothing else" (line 459) does not say whether a Node script run by a hook or skill counts. The current checker and index builder are Node scripts. The Check at line 472 would fail them as written.
- **Fit:** good. This is the requirement that keeps the design small.
- **Conflicts:** lines 1826 to 1831 (preferred direction) ask for "stateful function-style hooks or mods". Those are not one of the five parts and are not shipped. Line 458 "No background writer" sits next to the hooks doc's `async: true` hooks; the design must not use an async hook to write knowledge.
- **Design decides:** whether "a hook" includes the script it runs (recommend yes, state it in the design); which repairs are "obvious" under line 462.

## 2. The agent follows this system (lines 475 to 506)

- **Clear:** mostly. One ambiguity matters: the completion check "confirms that the contents of each file reached the agent and were read" (line 481). The harness can prove delivery (a SessionStart hook printed the file) or prove a `Read` tool call happened (a PostToolUse event). It cannot prove reading. The walkthrough says the same: "An acknowledgement does not prove understanding" (WT 27). The requirement should say which evidence counts: hook-delivered contents, or a `Read` call per file.
- **Fit:** the startup order and the one confirmation fit. The "completion check ... pause dependent work" language (line 482) reads like a program that watches the agent; R29 says to start with the lightest check. The two should agree.
- **Conflicts:** line 480 orders `SOUL.md`, `project.md`, `README.md`. The shipped loader (`plugins/second-brain/hooks/knowledge-session-start.mjs`, `STARTUP_FILES`) reads `README.md` second and adds `current.md` and both indexes. The manual `knowledge/README.md` "What loads at startup" lists six files. Both must change. Line 484 "the whole knowledge base and every procedure are not loaded at the start" conflicts with the shipped manual being 16,887 characters (issue 269 audit) and the hook output cap of 10,000 characters (hooks.md, "JSON output").
- **Design decides:** how the three files reach the agent (hook injection or Read calls), what "small map" contains, how the map returns after compaction (SessionStart `compact` matcher; rules re-inject from disk per context-window.md "What survives compaction").

## 3. Reliable behavior without reminders (lines 508 to 573)

- **Clear:** the outcomes are clear. One outcome cannot be tested as written: "At the end of a turn that involved real work, the review happens quietly" (line 524). A quiet review with nothing to say leaves no evidence, so a test cannot tell a review from no review. The Check at line 546 asks to "verify the resulting proposals", which only covers turns where something qualified.
- **Fit:** the "How reliability is demonstrated" section (lines 528 to 544) is the best statement of Mike's philosophy in the PRD. The per-turn review obligation is the one place the PRD asks for something invisible and unverifiable; it makes ordinary work heavier for no measurable gain.
- **Conflicts:** OS PRD "Conflicts and decisions still open", row "Hard refusals and lightweight work" (toolkit-operating-system.md line 503) still lists R3's forced moments as unsettled. R5 line 592 already gives the "no lookup" branch the OS PRD row "Searches for simple requests" (line 501) asks for; the OS PRD table is stale.
- **Design decides:** which moments a hook can hold, which a hook can only nudge, and which are left to the rule and skill text; what the setup report says about each.

## 4. Picks up where the last left off (lines 575 to 585)

- **Clear:** yes.
- **Fit:** yes. This is the owner's core want.
- **Conflicts:** none. R13 owns the file; R4 owns the outcome.
- **Design decides:** when an update to `current.md` is committed and pushed (see R13).

## 5. Check memory first (lines 587 to 597)

- **Clear:** yes. The relevance decision (line 592) and its "made once per request" rule (line 593) are clear.
- **Fit:** good. It guides without scripting the search.
- **Conflicts:** OS PRD line 501 asks for an exemption for requests answerable from supplied text; R5 line 592 already grants it. Update the OS PRD. The shipped `recall` skill description says "Always use at the start of troubleshooting", which is a command the PRD does not make.
- **Design decides:** whether anything checks the relevance decision (recommend nothing; the rule states it and R3's tests observe the outcome).

## 6. Cite the source (lines 599 to 607)

- **Clear:** yes.
- **Fit:** yes. One caution: "any context the agent brings up" cited "every time" (lines 603 to 604) can make short answers longer than the Plain English style's 250-word target (PR #342). Acceptable; the owner asked for it.
- **Conflicts:** none.
- **Design decides:** nothing beyond stating the shape in the manual and the find skill.

## 7. Speaks the project's language (lines 610 to 650)

- **Clear:** yes. The table template is exact.
- **Fit:** yes.
- **Conflicts:** SG PRD requirement 2 (system-guide.md line 125) names the glossary `knowledge/glossary.md`; this PRD names `knowledge/memory/memory-entries/terminology-glossary.md` (line 612). One path must win. The current template ships no glossary file (issue 269 item 12).
- **Design decides:** how the glossary reaches the agent "from the first message" (line 616): print it at startup when under a size, or print its path only. Recommend print it whole when under 2,000 characters, else the path.

## 8. Read the real documentation first (lines 652 to 667)

- **Clear:** yes.
- **Fit:** partly another part's job. The rule `ai-external-knowledge.md` already owns that folder and says nothing reads it unless a rule points at it. R8 adds three things that belong here: the map links to the index, the index uses the shared format, and the agent scans the index during a lookup. The rest (capture, refresh, dates) belongs to the captured-documentation process.
- **Conflicts:** `ai-external-knowledge/README.md` in this repository is hand-written (it lists 161 pages of one topic). R21 line 1460 says it is generated. Generating it means rewriting that file and every equipped project's copy.
- **Design decides:** whether one builder generates all three indexes (recommend yes) and what the topic entry page's frontmatter must carry.

## 9. Saving is frictionless (lines 669 to 701)

- **Clear:** mostly. "A turn ends after real work was done" (line 674) as a forced moment has the same problem as R3: nothing can observe a quiet review. "During an interview, save a settled decision before asking the next question" (line 681) means one commit and push per question. It does not say whether several decisions settled in one reply may share one push.
- **Fit:** the direct-to-main rule fits and is already shipped (`knowledge-direct-commit.md`). The per-question push adds Git traffic on a shared default branch while other sessions push too; each push must fetch and fast-forward first (rule steps 1 and 2), so the cost is real.
- **Conflicts:** the shipped `remember` skill still shows the five-bullet proposal shape that R20 replaces. The shipped save reminder holds `gh pr create` once and then allows it; line 674 says the pull-request moment "forces" a review; R3 line 524 says opening a pull request "requires that review". The design must say what the hold guarantees.
- **Design decides:** how the four visible moments are raised (hooks) and what proof, if any, releases the hold; push batching inside one reply.

## 10. Approval before any write (lines 703 to 744)

- **Clear:** yes, with two gaps. (a) The approval-off setting (line 717) has no stated home, and it must be readable by Codex, so `.claude/settings.json` is the wrong place. (b) When approval is off, R14 still requires `approved_by` and `approval_date` "Never empty" (lines 940 to 941). The PRD does not say what those fields hold for a write nobody approved.
- **Fit:** yes. Recording drafting permission in the PRD itself (line 709) is a good example of guiding rather than controlling.
- **Conflicts:** the older-layout conversion paragraph (line 718) is setup and migration; it belongs with R27. The shipped manual's approval block says the owner approves "the quoted text, Why, and From", which R20 replaced with summary approval.
- **Design decides:** the setting's home (recommend `knowledge/project.md` frontmatter, `memory_approval: required` or `off`); what a hook can check about approval (nothing; only that the write went through the save skill).

## 11. What counts as memory (lines 746 to 780)

- **Clear:** yes.
- **Fit:** yes. The three-point test is the right size for judgment.
- **Conflicts:** the shipped `memory-reminder.mjs` says "Never save: ... troubleshooting, errors", which contradicts point 2 and the exception at line 754 (issue 269 audit, finding 4). The reminder must go.
- **Design decides:** nothing.

## 12. What never counts (lines 782 to 800)

- **Clear:** yes.
- **Fit:** yes.
- **Conflicts:** none with the SG PRD (that PRD's "recoverable from code does not exclude a finding" is about the guide, not memory).
- **Design decides:** nothing.

## 13. Working memory (lines 802 to 914)

- **Clear:** yes, except sharing. Line 854 says the next session "in a different checkout of the repository" must see the update, which means commit and push. Line 851 says it is rewritten "as the work happens". Together they imply a push on every meaningful change, but the PRD never says so.
- **Fit:** the file's purpose fits. The push cadence could make ordinary work slower on a shared default branch.
- **Conflicts:** layout moves the file from `knowledge/current.md` to `knowledge/memory/current.md` (line 164); the checker caps it at 2,000 characters (`check-knowledge.mjs` line 29) while R21 says 5,000 (line 1469). The template at lines 820 to 832 is more structured than the one the shipped manual describes.
- **Design decides:** push cadence for `current.md` (recommend: commit and push at the same moments as saves and at handoff; a local-only write is allowed between them and the one-line confirmation must say "local only" when that is true, as R3 line 520 already permits).

## 14. Memory file shape (lines 916 to 1042)

- **Clear:** yes. It is a data model and reads like one.
- **Fit:** yes.
- **Conflicts:** the checker requires nine fields and does not know `group`, `context`, or `updated_at` as required (`check-knowledge.mjs` lines 43 to 46). The checker also requires a flat folder; R14 allows topic folders. With approval off (R10), `approved_by` has no honest value (see R10).
- **Design decides:** the value of `approved_by` and `approval_date` when approval is off (recommend the owner's name plus the words "standing approval, step off" and the write date, so a reader can tell it apart from a card approval); whether `updated_at` is set by the agent or by the checker's advice.

## 15. How the words are written (lines 1044 to 1118)

- **Clear:** yes.
- **Fit:** yes. "Read the output style before preparing a proposal" (line 1101) is redundant in the Claude Code main session, where the style is in the system prompt, but needed for Codex and helpers. The rule `plain-english-artifacts.md` already covers the same gap for artifacts.
- **Conflicts:** none.
- **Design decides:** whether the save skill tells the agent to open the style file only when it is not already in force (recommend yes).

## 16. Requirements documents (lines 1120 to 1233)

- **Clear:** mostly. "When work ships" (lines 1138, 1164) is the trigger for automatic upkeep and is not defined: merged to the default branch, deployed, or accepted by the owner. The tracker's Done event is the nearest documented moment (work-item-upkeep.md line 543).
- **Fit:** the PRD shape (lines 1140 to 1155) and "A PRD is usually big" (lines 1178 to 1193) describe how requirements are written, which is the requirements-helper skill's job and guided delivery's process. Keeping them here is acceptable because the PRD is the data model of the store, but it is the longest requirement and half of it is process.
- **Conflicts:** (a) the shipped manual says `finalized` means "settled after the build" and the `remember` skill says the same; R16 line 1130 says approved for design or build (Mike, 2026-09-15). (b) The PRD index is `prd-index.md` here and `spec-index.md` in the shipped tool. (c) OS PRD line 507 says R16 "requires a PRD roadmap"; R16 line 1183 now puts the roadmap with the tracker. (d) R16 lines 1195 to 1196 require `group` and `updated_at`; this PRD's own frontmatter lacks both (issue 269 log, 2026-09-15).
- **Design decides:** the shipped-work trigger (recommend the tracker's completion event and PR merge, both already named by the shipped hooks); how a child PRD is listed in the index.

## 17. Procedures become skills (lines 1235 to 1245)

- **Clear:** yes.
- **Fit:** yes. One gap: the PRD hands the procedure to "the project's skill-authoring process, which has its own approval and delivery rules" (line 1239). No toolkit PRD or skill I read defines that process. The `skill-creator` skill exists on this machine but is not a toolkit part.
- **Conflicts:** none.
- **Design decides:** nothing inside the knowledge system; the design must name the missing process as a dependency.

## 18. Where information goes (lines 1247 to 1314)

- **Clear:** yes.
- **Fit:** yes; this table is what the agent needs most.
- **Conflicts:** (a) The layout (lines 142 to 173) and the table give the System Guide a layout of `knowledge/system-guide/system-guide-index.md` and `system-guide-entries/`. The SG PRD requirement 6 (system-guide.md lines 190 to 211) gives it `knowledge/system/` with `README.md`, `tour.md`, and eight section folders, each with `generated/` and `meaning/`. The knowledge-system PRD is inventing another plugin's layout, which line 460 forbids. (b) `brainstorms/` is at the project root here (line 146) and under `knowledge/brainstorms/` in the shipped manual and template. (c) The glossary path differs from the SG PRD (see R7). (d) The routing table also lives in the shipped manual; OS PRD R11 says the manual owns it, which is fine as long as the manual is generated from or matched against this table.
- **Design decides:** how the manual carries the table (recommend the table verbatim, since the manual is a managed copy and a check keeps the two equal).

## 19. The find order (lines 1316 to 1383)

- **Clear:** yes.
- **Fit:** mostly. Tiers 2 and 3 (rules and skills) are already in the agent's context; listing them as search tiers costs nothing but explains little. Tier 5 (session history) needs a tool; the shipped `session-search` script covers Claude Code only, and the PRD says an unavailable history is reported (line 1338).
- **Conflicts:** the 2026-09-02 approved direction "task-specific lookup ladders" (issue 269 item 5) was replaced by "The same order applies to every kind of task" (line 1363). The PRD wins; the issue body should not still show ladders.
- **Design decides:** nothing that checks the search (R29 forbids a scorer); where the history search script lives and how Codex history is reported as unavailable.

## 20. The save card (lines 1385 to 1456)

- **Clear:** yes.
- **Fit:** yes. Summary approval instead of verbatim approval is a real friction cut.
- **Conflicts:** the shipped `remember/references/proposal-template.md` (five bullets, block quote, "Spec") and the walkthrough inbox example card (WT 631 to 635, "New wording" block) both disagree with R20. The progress log (2026-09-15) lists the inbox card as open.
- **Design decides:** whether a script renders cards (the 2026-09-02 item 4 formatter). Recommend no: R20 is a Markdown shape the agent can write, and a renderer is the "program that reads the agent's replies" R3 line 535 says is not required.

## 21. Indexes and the checker (lines 1458 to 1510)

- **Clear:** yes.
- **Fit:** yes.
- **Conflicts:** the checker's limits are 250 for summaries and 2,000 for `current.md`; R21 says 200 and 5,000. The builder does not group by `group`, does not handle topic folders or child PRDs, and does not build `ai-external-knowledge/README.md`. The builder has no fixed sort rule stated.
- **Design decides:** the sort rule (recommend groups alphabetical, files alphabetical by path); whether a hook runs the checker after every knowledge write (recommend yes, it is the one enforcement that costs nothing when the file is right).

## 22. Keeping current truth clean (lines 1512 to 1535)

- **Clear:** yes.
- **Fit:** yes. "at each save, for the files the search turned up" (line 1523) keeps routine cost small; the whole-folder review is on request.
- **Conflicts:** the shipped manual lists four delete reasons; R22 line 1520 lists a fifth (redundant original after consolidation). The shipped `retire` skill says "never commits, pushes"; R9 requires the save to push.
- **Design decides:** whether supersede, retire, merge, and delete are one skill with the save flow (recommend yes; they share the card, approval, checker, and push steps).

## 23. Learning what to save (lines 1537 to 1565)

- **Clear:** yes; storage is left to design on purpose.
- **Fit:** yes.
- **Conflicts:** none. The shipped `memory-self-improvement.md` with an 8,000-character cap is the starting point (lines 1894 to 1906).
- **Design decides:** the file, its shape, and its cap. Recommend one file `knowledge/memory-selection-feedback.md`, a short table (date, candidate in a few words, outcome, owner's reason or "no reason given"), cap 4,000 characters, tidied during the whole-folder review.

## 24. Request knowledge operations in plain language (lines 1567 to 1586)

- **Clear:** yes.
- **Fit:** yes. Skill descriptions are the documented way the agent maps plain words to a procedure (skills.md, "Frontmatter reference", `description`).
- **Conflicts:** none.
- **Design decides:** how many skills and their names. Note `/memory` is a built-in command name and cannot be used (plugins/CLAUDE.md).

## 25. Codex (lines 1588 to 1597)

- **Clear:** as an outcome, yes. The Check ("Every step gives the owner the same result") cannot pass where Codex lacks a feature; line 1592 already allows naming the gap.
- **Fit:** yes.
- **Conflicts:** the 2026-09-03 decision on issue 269 ("Codex has no PreToolUse equivalent") no longer holds; see the top of this file. The repository's `.codex/hooks.json` already registers a SessionStart hook with `additionalContextLimit`.
- **Design decides:** which of the Claude Code hooks Codex also runs, and which cannot (likely the file-write guard, since Codex `PreToolUse` is reported as shell-only by secondary sources); how the plugin's skills reach a Codex session (the repo has `.agents/plugins/marketplace.json`, so a Codex plugin path exists).

## 26. Built the way Claude Code's documentation says (lines 1599 to 1615)

- **Clear:** yes.
- **Fit:** yes.
- **Conflicts:** the captured docs are from 2026-09-04; the live changelog is at 2.1.273 (2026-09-15). The preferred direction (lines 1826 to 1831) names an unshipped feature. R26 line 1606 says best practice means the captured pages; those pages say nothing about function hooks.
- **Design decides:** refresh the capture before build; name the page for every part.

## 27. Installed once, turned on per project, and checked (lines 1617 to 1627)

- **Clear:** yes.
- **Fit:** yes, though `project-init` and `project-sync` own the steps; R27 only states the outcome, which is right.
- **Conflicts:** the shipped setup copies five hooks and three tools into every project (`second-brain/SKILL.md`, "What gets installed"). The 2026-09-02 approval (issue 269 item 2) and the 2026-09-03 decision 5 chose plugin-native hooks and no tool copies. The PRD's "installed once on a computer" (line 1619) matches those decisions, not the shipped copies.
- **Design decides:** plugin `hooks/hooks.json` and `${CLAUDE_PLUGIN_ROOT}/tools` versus copies (recommend plugin-native for Claude Code; Codex still needs `.codex/hooks.json` in the project unless its plugin format carries hooks, which is unverified).

## 28. Pending memory inbox (lines 1629 to 1667)

- **Clear:** mostly. Line 1640 says to keep a shown, unanswered card "without being asked" but not when: in the reply that shows the card, when the owner's next message does not answer it, or at handoff. Line 1641 says "share it promptly" without saying what prompt means.
- **Fit:** the inbox solves a real loss (an approved save that never reached the default branch). The entry format (line 1642) is nine items per entry for a case that should be rare. A heavy format makes the agent skip it.
- **Conflicts:** the walkthrough example card inside the inbox (WT 631 to 635) uses the old card shape. Parallel sessions pushing edits to one file on the default branch will conflict in Git; the direct-commit rule's fetch-and-fast-forward step handles most cases.
- **Design decides:** write timing (recommend: write the entry locally in the same reply as the card, one heading per entry, and push it at the next push the session makes or at handoff, whichever comes first); the file's shape so two sessions' entries rarely touch the same lines.

## 29. Preserve agent judgment with narrow safeguards (lines 1669 to 1752)

- **Clear:** yes. This is the philosophy in requirement form.
- **Fit:** yes.
- **Conflicts:** R2's completion check (line 481) and R3's per-turn review (line 524) are heavier than "the lightest check that works" (line 1684). "Begin with a small set of safeguards ... Add more restrictions only when a failure that actually happened calls for them" (lines 1697 to 1700) conflicts with the 2026-09-02 approvals for a real gate with a review record and a proposal formatter (issue 269 items 3 and 4), unless those count as failures that happened. The audit did record one session claiming a review that never ran (item 3), so the gate qualifies; the formatter does not.
- **Design decides:** the set of safeguards and the evidence each gives.

## 30. Integration with the toolkit OS (lines 1754 to 1795)

- **Clear:** as a boundary statement, yes. The table's "Required knowledge integration" column is abstract; the Check at line 1789 is concrete.
- **Fit:** yes.
- **Conflicts:** the OS PRD is still `proposed` and its open-conflicts table (lines 499 to 509) has four rows this PRD now settles: simple-request lookups (R5), draft refinement without cards (R10), roadmap ownership (R16), concurrent `current.md` (R13). The OS PRD should be updated under R16's automatic upkeep once this PRD is approved.
- **Design decides:** the two handoffs that need code: the tracker's completion event raising the save review, and the delivery process handing the shipped scope to PRD upkeep.

## The ten things Mike should reconsider or decide, ranked

1. **Build on documented hooks now, not on function hooks.** Function hooks are unshipped (issue 91870, "weeks", behind a flag). Recommend: the design uses `command` hooks on `SessionStart`, `PreToolUse`, `PostToolUse`, `Stop`, and `PreCompact`, keeps session facts in small files, and names the one place a function hook would replace those files later. Reason: R1 and R26 both forbid building on an undocumented feature, and every part must name its doc page.

2. **Codex gets the same hooks, not a "no gate" exception.** Recommend: reverse the 2026-09-03 decision; the design registers the same hook scripts in `.codex/hooks.json` for every event Codex has and reports the ones it lacks. Reason: the Codex source tree now has nine hook events, and R25 requires the same outcomes wherever the harness allows.

3. **Decide what counts as the three startup reads.** Recommend: the SessionStart hook prints the three files whole, that counts as "read", the agent gives the one-line confirmation, and no hook checks `Read` calls. This forces the manual to fit inside the hook cap: the three files together under 9,000 characters, so the manual becomes a short map (about 4,000 characters) and its detailed policy moves into skill references. Reason: hook delivery is deterministic and costs no tool calls; a `Read`-call check proves only that a tool ran; R2 line 484 already says details load when needed.

4. **Drop "a turn ends after real work" as an enforced moment.** Recommend: keep it as a standing instruction in the rule and manual; enforce the four visible moments (item finish, pull request, handoff, owner request); add a Stop hook that prints one message when the session's changed-file count crosses a written threshold (Mike's own 2026-09-03 amendment). Reason: a quiet per-turn review cannot be observed, so it cannot be tested, and R3 says a limit that cannot be checked must be named, not claimed.

5. **Set the push cadence for `current.md` and interview saves.** Recommend: commit and push a settled decision before the next question, but several decisions settled in one reply share one push; `current.md` pushes at the save moments and at handoff, with "saved locally, not yet pushed" said in the one-line confirmation between them. Reason: R9 line 681 and R13 line 854 imply a push per change on a shared default branch, which is slow and collides with other sessions.

6. **Name the value of `approved_by` when the approval step is off.** Recommend: the owner's name and the words "standing approval, step off", with `approval_date` as the write date; the setting lives in `knowledge/project.md` frontmatter as `memory_approval: off` so Codex can read it. Reason: R14 says the fields are never empty; R10 gives no value; a checker cannot pass both.

7. **Let the System Guide PRD own its own paths.** Recommend: remove `system-guide-index.md` and `system-guide-entries/` from this PRD's layout and table; refer to "the enabled guide's entry page named in `.system-guide.json`". Also settle the glossary path (`knowledge/memory/memory-entries/terminology-glossary.md` here, `knowledge/glossary.md` in the SG PRD). Reason: line 460 forbids this PRD becoming a second owner of another part's content.

8. **Choose the safeguards, and say what each proves.** Recommend four: (a) a pull-request and item-close hold that is released only after the save skill was invoked in this session after the branch's last commit, proven by a marker a PostToolUse hook on the `Skill` tool writes; (b) a write guard that denies `Edit`/`Write` to `memory-entries/` and `prds/` until the save skill has been invoked in the session; (c) the checker and index rebuild run by a PostToolUse hook after every write under `knowledge/`; (d) the Stop threshold nudge. Drop the proposal renderer (2026-09-02 item 4). Reason: R29 asks for a small set aimed at trust-damaging failures; (a) answers the recorded false claim of a review; (b) answers hand-written memory; (c) answers unchecked saves; the renderer controls how the agent writes, which R29 forbids.

9. **Ship hooks and tools inside the plugin, not as copies.** Recommend: `plugins/second-brain/hooks/hooks.json` supplies every Claude Code hook; skills run tools from `${CLAUDE_PLUGIN_ROOT}/tools`; projects keep `.codex/hooks.json`, one rule file, and the knowledge files. Reason: this is the 2026-09-02 approval (item 2) and decision 5 of 2026-09-03, and it is how R27's "installed once" is met; copies drifted in DragonFly.

10. **Decide the layout migration.** Recommend: one migration in `project-sync`, approved per project: `knowledge/current.md` to `knowledge/memory/current.md`, `spec-index.md` to `prd-index.md`, flat `memory/*.md` to `memory/memory-entries/`, `knowledge/brainstorms/` to `brainstorms/`, links repaired under R1. Reason: the layout at lines 142 to 200 is approved; every equipped project (this repo, DragonFly) is on the old layout, and the checker enforces the old one.

Two smaller items for the same review: update the OS PRD's stale conflict rows (see R30), and add the missing skill-authoring process as a named dependency (see R17).

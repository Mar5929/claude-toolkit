# Review 3: philosophy, owner experience, and clarity

Design reviewed: `/home/user/claude-toolkit/docs/designs/269-knowledge-system.md`, 2,366 lines, read in full.
Compared against: the approved walkthrough text, the PRD's "Why this exists", "How the owner works", "Where it sits", requirement 3's "How reliability is demonstrated", requirement 29, and the PRD's closing "Potential paths to explore".
Date of review: 2026-09-16.

Counts: 3 blockers, 18 should-fix, 4 nits.

## Section 1. Findings

| id | severity | design location | the problem | the fix |
| --- | --- | --- | --- | --- |
| B1 | blocker | Section 4 parts table (lines 155 to 172) and section 6.4 print order (lines 866 to 899) | The per-file sizes the design gives add up to about 15,900 characters against a 9,500-character budget: SOUL 450, `project.md` 1,000, manual 4,000, `current.md` 5,000, memory index 1,500, PRD index 1,500, glossary 2,000, plus the inbox lines and the two framing lines. Because the print order is fixed and the overflow rule replaces whatever no longer fits, `knowledge/memory/current.md` and the glossary are the two files that get replaced by a "Read this now" line in an ordinary project, which are exactly the files walkthrough Part 2 and requirement 7 need at the start. | Do the arithmetic in the design and set a per-file allocation that sums under 9,500, for example SOUL 450, `project.md` 800, manual 3,500, `current.md` 2,500, each index 800, glossary 700, inbox 300, framing 200. State which file the overflow rule hits first and why that order is safe. |
| B2 | blocker | Section 6.4, `startup-map.mjs` print order item 10 (line 884), against the standing rule line 3 (section 6.2, line 640) and walkthrough Part 6 | The hook's last line always asks for the one-line confirmation, and the hook runs on `startup`, `resume`, `clear`, `compact` and `fork`. The standing rule and the approved walkthrough both say the confirmation happens only at a new session start, so as written the owner sees "I've read the knowledge manual." again after every compaction, resume and fork. | Make the last line depend on the `source` field the hook already reads. Only `startup` and `clear` ask for the confirmation. The other sources print the map and say nothing about confirming. |
| B3 | blocker | Section 5, Part 4 table row "Pre-write check, then write" (line 266) | The row names `knowledge-write-guard.mjs` as the pre-write check. In the approved walkthrough the pre-write check is an agent step: reread the affected shared records, confirm the update is still needed, confirm the approval still covers this exact meaning. The hook does none of that; it only checks that a marker file exists. A builder reading section 5 would register the hook and never build the agent step. | Split the row. Name `knowledge-save` body step 8 as the pre-write check and describe its four actions. Add a separate row for the write guard that says it checks permission to write, not the content. |
| S1 | should-fix | Section 12, Item 1 files (line 1791) and Item 3 files (line 1809), against section 6.3 (line 706) | Both items write templates into `plugins/second-brain/skills/second-brain/references/templates/`, but section 9.2 renames the `second-brain` skill to `knowledge-setup` in Item 1. The path names a folder that the same item removes. | Use `plugins/second-brain/skills/knowledge-setup/references/templates/` in both rows. |
| S2 | should-fix | Section 6.4 (line 914) and 6.7 (line 1273) against section 8.6 proof 7 (line 1479) and section 9.3 (line 1586) | The first half says the Codex `additionalContextLimit` is raised to "at least 9,500". The second half says it is raised to 10,000 in two places. One value has to be written into `.codex/hooks.json`. | Pick one number, state it once in section 6.7, and have every other mention point at that row. |
| S3 | should-fix | Section 9.3, checker glossary row (line 1560), against section 6.1 (line 528) | The parts section says a memory file carries twelve required fields. The change list says the glossary is "exempt from the nine memory fields". A builder cannot tell whether the exemption covers nine fields or twelve. | Say twelve in both places, or say "the nine fields the checker enforces today, becoming twelve after this change". |
| S4 | should-fix | Section 4 settings row (line 194) and 6.7 (line 1266) against section 9.3 (line 1594) | The first half states `autoMemoryEnabled: false` as a decided setting. The change list leaves it as "Keep `CLAUDE_CODE_DISABLE_AUTO_MEMORY`, or change to `autoMemoryEnabled: false`". The build needs one answer. | Decide it in section 6.7 and make the change list follow. |
| S5 | should-fix | Section 8 (line 1328), section 9 (line 1496), section 13.17 (line 2095), and the closing alternatives table (line 2345) | Four citations point at files under `/tmp/claude-0/.../scratchpad/`. Every Codex fact in section 8 and the whole inventory behind section 9 rest on those files, and nobody reading the design in the repository can open them. | Move the material a reader needs into the design itself, or into a path under the repository, and cite that path. |
| S6 | should-fix | Section 6.2, `.claude/rules/knowledge-files.md` (lines 686 to 704) | All six of its lines already appear in the always-loaded standing rule: its line 1 is rule 17, line 2 is rule 9, line 3 is rule 10, line 4 is rule 7, line 5 is rule 19, line 6 is rule 25. It buys a second shipped file, a second installed copy, a second `project-sync` row and a second `installed-copy-check` row, and in Codex it is paid in every session anyway because there are no path-scoped rules there. | Drop the file. If a path-scoped reminder is still wanted later, add it after a failure that happened, which is what requirement 29 asks for. |
| S7 | should-fix | Section 6.4, `compact-hold.mjs` (lines 1129 to 1145) | The hold fires on the first manual compaction of every session, whether or not anything changed since the last review. The owner types `/compact`, gets refused, waits for the review, and types `/compact` again. That is one owner action and one wait added to every session that compacts. | Hold only when there is something to review: no `save_skill_at` since the branch's last commit, or files changed since the last review. Have the agent end the review with one line telling the owner to run `/compact` again, so he is not left guessing. |
| S8 | should-fix | Section 6.4, `session-review-nudge.mjs` steps 2 to 4 (lines 1090 to 1099) and the session-state table (line 1240) | Step 3 counts files changed "since `save_skill_at`", but `save_skill_at` does not exist until the save skill has run once, and the design never says what the count measures before then. The state field `nudged_at_count` stores the count at the last nudge, which implies a second nudge at a higher count, while step 4 says the text is returned "once". | Say that the reference point is `stop_baseline` until `save_skill_at` exists. Say plainly whether the nudge can fire more than once in a session, and if it can, at what count. |
| S9 | should-fix | Section 6.5, `.githooks/pre-commit` (lines 1205 to 1220) | `git config core.hooksPath .githooks` replaces the project's whole hooks directory. A project that already runs its own pre-commit hooks, for example through husky or lint-staged, loses them with no message. The design does not mention this. | Have `knowledge-setup` read the current `core.hooksPath` first. When one is already set, report it and ask the owner rather than overwriting, and say in the setup report which hooks are now in force. |
| S10 | should-fix | Section 6.3, `knowledge-save` body outline, steps 1 to 13 (lines 761 to 776) | The approved walkthrough Part 4 requires reading the project output style before preparing a proposal, and checking the written text against that style at read-back. Neither appears in the thirteen-step outline. The requirement map row 15 mentions a pointer to the style, but the outline is what a builder writes the skill from. | Add the style read to step 1 or step 2, and add the style check to step 9. |
| S11 | should-fix | Section 13.1 (lines 1860 to 1873) | The entry treats "confirm the contents were read" as a PRD problem only, at PRD line 481. The approved walkthrough carries the same completion check in Part 1, in stronger words: "Check that the file contents reached the agent and were read. Listing file names or issuing a reminder does not complete the read." The design's own precedence order in section 1 puts the walkthrough above the PRD, so the open question is bigger than the entry says. | Name both sources in 13.1 and in open question 1, and say that answering it may mean editing the approved walkthrough, not only the PRD. |
| S12 | should-fix | Section 13.5 (lines 1943 to 1956) | The recommendation is that this PRD stops naming the System Guide's folders. The approved walkthrough Part 3 names `knowledge/system-guide/system-guide-index.md` and `system-guide-entries/` as well, and the walkthrough outranks the PRD under the design's own order. | Say that this answer also changes the approved walkthrough, and ask for that in open question 5. |
| S13 | should-fix | Section 3, "Which one a thing gets", ENFORCE item 2 (lines 116 to 120) | The list is called "the four visible moments where a missed save would cost the owner trust" and its fourth item is "the after-write check", which is a file check, not a moment, and is already covered by ENFORCE item 3. The approved walkthrough names five review moments. The same phrase "the four enforced moments" is reused at line 146, so the miscount spreads. | List three moments (pull request, work-item close, manual compaction), keep the after-write check under file checks, and say which two of the walkthrough's five moments are guided instead of enforced. |
| S14 | should-fix | Section 1 words table (lines 27 to 40) | Nine terms are used before or without definition: "card" (first used line 129), "System Guide" (line 725), "fail-open" (line 1526), "`work finish`" (line 182), "dynamic context injection" (line 190), "spill" (line 915), "the decision brief" (line 1773), "the round-one consolidation" (line 1614), "DragonFly" (line 1622). A junior builder cannot act on any of them. | Add card, System Guide, dynamic context injection, spill and fail-open to the words table. Give `work finish`, the decision brief and DragonFly a short parenthetical where each first appears. |
| S15 | should-fix | Lines 96, 970, 1064, 1102, 1215, 1468, 1526, 1654, 1977 | Nine phrases use a picture word in place of the real thing: "keep the capable agent at the center" (96), "the startup lines and the Stop nudge carry it" (970 and 1977), "the Bash hole" (1064), "it errs toward printing" (1102), "this is the last line before knowledge is published" (1215), "changes the shape of the design" (1468 and 1654), "must never be able to wedge a session" (1526). The owner's brief rules these out. | Replace each with the plain statement: the agent does the reasoning; the next session's startup lines and the Stop nudge repeat the reminder; writes made through Bash commands, which the guard cannot see; it prints when it cannot tell; it is the last check before a knowledge file is committed; changes which parts are built; must never stop a session from running. |
| S16 | should-fix | Section 3, heading "One honest sentence about the per-turn review" (line 138) | The heading sells the section rather than naming what is under it, and the section is eight lines, not one sentence. | Rename it "The per-turn review is guided, not enforced". |
| S17 | should-fix | Section 4 index rows (lines 168 and 169), section 6.4 print order item 7 (line 878), against open question 15 (line 2309) | The two generated indexes print "whole when each is short", and "short" is never given a number, while the parts table gives them a cost "up to about 1,500 characters". Open question 15 then asks whether per-file caps should exist at all. The design both assumes caps and asks whether to have them. | Give "short" a number in section 6.4, and rewrite open question 15 so it asks about that one number rather than about whether caps exist. |
| S18 | should-fix | Section 13 opening (line 1857) and section 12 opening (line 1772) | Section 13 says "Eighteen entries" and contains nineteen, 13.1 through 13.19. Section 12 says "Seven items. Step zero comes first... The six after it are the split", and there are seven items after step zero. A builder using these as a checklist will stop one short in both places. | Correct both counts. |
| N1 | nit | Section 9.3, marketplace row (line 1604) | The plugin keeps the name `second-brain` while all four skills inside it are renamed `knowledge-*`, so the folder name and the words in it no longer match. | Either say in one line why the plugin name stays, or rename it in the same change. |
| N2 | nit | Lines 964, 1973, 2323 | "The owner's 2026-09-03 decision", "Mike's 2026-09-03 guard set" and "the 2026-09-03 amendment" are cited three times with no source path or record. | Name where each is recorded, for example the issue number and comment date. |
| N3 | nit | Section 4 parts table | `command-parsing.mjs` is kept as a shared helper in section 9.1 but does not appear in the parts list, so the list is not the full record of what exists, which section 3 says it is. | Add a row for it. |
| N4 | nit | Section 6.4, Stop hook (line 1083) | "Claude Code ends the turn after 8 consecutive blocks" is stated, but the Claude Code nudge never blocks, so the fact does nothing here. | Move it to section 8.4, where blocking is the Codex behavior being discussed. |

## Section 2. What the owner sees

### A normal session with nothing to save

1. He opens the session. The startup map goes to the agent; he sees nothing.
2. The first reply begins with one line: "I've read the knowledge manual."
3. He asks a question. The answer carries a file path on the line under each finding taken from project knowledge.
4. Turn ends are silent, unless more than ten files changed since the last review. Then the agent's next message contains a short save review, which in this case ends with nothing to save.
5. If shared context changed, one line says the shared overview was updated.
6. If he opens a pull request, the command is refused once, the agent runs the review and runs the command again. He may see nothing, or one short line.
7. If he runs `/compact`, it is refused once. The agent runs the review, and he types `/compact` again. See finding S7.
8. With blocker B2 unfixed, he also sees "I've read the knowledge manual." again after every compaction, resume and fork.

### A session with one save

1. Steps 1 to 3 above, unchanged.
2. During the work, a card appears under the heading "Proposed memory saves": a number, a topic name, `Change`, `Summary`, `Your decision`.
3. He answers with one word.
4. The agent writes the file, the checks run silently, the change is committed and pushed, and one line says what was saved and where.
5. If the push fails, one line says it was saved locally and is not yet shared, and the work he asked for continues.

### A handoff

1. He says he is about to clear context, or runs `/handoff`.
2. The save review runs first. Any card it produces appears now.
3. One line says the shared overview and the tracker were updated.
4. A short handoff names the next step, any card still waiting for him, and any approved save that did not finish. If something is not yet shared, it says so plainly instead of claiming a complete handoff.
5. In the next session he sees the confirmation line, then a briefing that names the records the agent used.

Nothing in these three lists interrupts him without a reason he would accept, with two exceptions: the repeated confirmation line (B2), and the second `/compact` (S7).

## Section 3. Parts to drop or merge, and parts that are right

### Drop

- `.claude/rules/knowledge-files.md`. All six lines are already in the standing rule that loads in every session. See S6.
- The SHA-256 pin on the manual inside `check-knowledge.mjs` (section 9.3, line 1568). `tests/installed-copy-check.mjs` already fails when a project's manual stops matching the shipped original, so two mechanisms do one job. The pin also refuses a commit when the owner edits his own manual, and the PRD's "Why this exists" says the owner can edit knowledge files directly.

### Consider dropping

- The `Bash` registration of `knowledge-after-write.mjs` (section 6.4, line 1039). It runs a `git status` on every shell command in every session to catch writes made with `sed`, a heredoc or `python -c`. The Git pre-commit hook already catches those files before they are published, which is the moment that matters. Dropping the Bash branch removes the only always-on cost this design adds to ordinary work.

### Consider merging

- `knowledge-review` into `knowledge-save`. Its whole body is "read every memory topic and requirements document, list duplicates, conflicts and retirement candidates, propose every change through `knowledge-save`". As a separate skill it costs about 300 characters of description in every request of every session, for an operation the owner runs occasionally. As a reference file inside `knowledge-save`, with the folder review named in that skill's description, requirement 24 is still met and the toolkit has three skills instead of four.

### Right as designed

- The three kinds of control, named for every part twice, with the refused list in section 3. This is the clearest statement in the document that nothing grades the agent's thinking.
- The write guard keyed on "the save skill was invoked", not on the content of the write. It puts the rules in front of the agent and then lets the agent decide.
- Saying out loud that a quiet review cannot be observed, and refusing to build a program that reads the agent's replies. This matches requirement 29 and requirement 3's "How reliability is demonstrated" exactly.
- One hook script per event, read by both harnesses, rather than two copies.
- Session bookkeeping in a file outside the repository, which is requirement 29's data boundary.
- Writing the inbox entry in the same reply as the card. It costs nothing and it is the only thing that saves the card when a session dies.
- `PostToolUse` rather than `FileChanged`, with the reason given: `FileChanged` cannot return text to the agent, so a failed check would never reach it.
- The Git pre-commit hook, because it is the only part that covers the owner's own hand edits and both harnesses at once.
- The 9,500-character budget being a measured fact (20,585 characters printed today against a 10,000-character cap) rather than a preference.
- Dropping `memory-reminder.mjs`. Today the per-message cost is about 1,292 characters for that hook plus about 1,800 for six skill descriptions. After this design it is about 1,200 for the standing rule plus about 1,200 for four skill descriptions. Ordinary work gets cheaper per turn, not more expensive.

## Section 4. Verdict

**Pass with fixes.**

The philosophy holds. Every ENFORCE part controls a write, a moment or a file's shape. None of them reads the agent's reasoning, scores a search, or decides what the answer should be. The GUIDE parts arrive when they apply: the skill bodies load on invocation, the path-scoped rule loads on a file read, and only about 2,400 characters per request are always present. The design refuses a scorer, a service, a database and a background writer by name, and it says plainly where it cannot prove anything.

The three most important changes:

1. Fix the startup budget (B1). The per-file sizes add up to about 15,900 characters against a 9,500-character budget, so the shared overview and the glossary are the two files an ordinary project loses at startup. Publish the arithmetic and set sizes that fit.
2. Make the confirmation line depend on the session source (B2). As written the owner is told "I've read the knowledge manual." after every compaction, resume and fork, which contradicts both the standing rule and the approved walkthrough.
3. Fix the pre-write check in section 5 (B3) and add the output style read to the `knowledge-save` body outline (S10). These are the two places where a builder following the design would leave out a step the approved walkthrough requires.

Two more that cost little and matter: drop `.claude/rules/knowledge-files.md`, which repeats six lines the session already has (S6), and replace the four `/tmp` scratchpad citations with paths a reader can open (S5).

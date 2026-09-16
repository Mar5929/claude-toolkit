# Fresh review of the knowledge system solution design

Document reviewed: `/home/user/claude-toolkit/docs/designs/269-knowledge-system.md`, 2,671 lines.
Requirements document: `/home/user/claude-toolkit/knowledge/prds/toolkit-operating-system/knowledge-system.md`.
Approved walkthrough text: `scratchpad/research/walkthrough-text.txt`.
Read as two readers: Mike, who decides, and a junior intern who builds item 1 next week.

Counts: 3 blockers, 21 should-fix, 9 nits.

## Section 1. Findings

| id | severity | location | problem | fix |
|---|---|---|---|---|
| F1 | blocker | 6.4, `startup-state.mjs`, line 921 | The stated worst case is wrong. The design says "with a forty-entry inbox, a 2,000-character glossary, and a full `current.md`, is about 7,700". Adding the design's own numbers gives 2,400 (40 entries at 60) + 2,000 (glossary) + 120 (two index lines at 60) + about 60 (System Guide line) + 5,000 (`current.md`, the checker's cap) + about 100 (last line) = about 9,680. That is over the hook's 9,500-character budget. The overflow rule then replaces `current.md` with a "Read this now" line first, so in the worst case the shared working overview never prints. Requirement 4 and requirement 13 both rest on that file arriving. | Recompute the worst case and publish the real number. Then either raise the budget, lower the `current.md` cap, or change the drop order so `current.md` is not the first thing dropped. Say which. |
| F2 | blocker | Section 12, item 1 and item 2 | Item 1 creates `plugins/second-brain/hooks/startup-files.mjs` and `startup-state.mjs`, but `plugins/second-brain/hooks/hooks.json` is listed only in item 2, and that file does not exist in the repository today. Hooks are registered today in `.claude/settings.json` at lines 18, 30, 35, 47 and 58, pointing at `.claude/hooks/` copies. So at the end of item 1 the two new hooks are files nobody runs, the old `knowledge-session-start.mjs` is still the registered one, and item 1's own delivery cannot be tested. | Move `hooks/hooks.json` and the `.claude/settings.json` change into item 1, or say in item 1 that its hooks are inert until item 2 and that requirement 2 is not delivered until then. |
| F3 | blocker | Section 4 parts table, and 6.2 | The standing rule's context cost is given as "about 1,200 characters per request". The 26 lines as written in 6.2 measure 2,438 characters. The real cost is about double the stated one, it is paid on every request, in every session, and in every subagent that loads project rules. Mike is asked in question 15 to approve character budgets; this is the one number that repeats forever. | Measure the rule file after it is written and publish the real number. If it lands near 2,400, say so and let Mike decide whether 26 lines is still the right length. |
| F4 | should-fix | Section 4 parts table, skill rows; 6.3 | The always-on cost of the four skills is given twice and differently. Section 4 says "Description always" with no number. 6.3 says "about 300 characters each per request" and then says the descriptions "are written against 1,536 characters, not against the 300-character estimate". Four descriptions at 1,536 is 6,144 characters on every request. Added to F3 that is roughly 8,500 characters in every request, and the design never adds it up. | Give one line: the total always-on cost per request, with the four description lengths the build will actually write. |
| F5 | should-fix | Whole document | Mike's brief asks whether there is a better solution than what is built today, and says to recommend a complete refactoring if necessary. Section 9 answers it row by row across 60 table rows, and the closing table gives verdicts on outside products. There is no single statement of the verdict. A reader has to assemble it. | Add three sentences near the top: what is kept, what is rewritten, what is deleted, and the one measured fact that decides it (the 20,585-character startup output against a 10,000-character cap). |
| F6 | should-fix | 6.5, `.githooks/pre-commit` recovery table, line 1325 | The row says the pre-commit refusal "is flagged for the owner in section 13.17 and open question 17". Section 13.17 is about the walkthrough's "New wording" card label, not the pre-commit hook. Open question 17 is the pre-commit one. There is no section 13 entry for it. | Point to open question 17 only, or add a section 13 entry for the pre-commit refusal with a recommendation. |
| F7 | should-fix | Section 15, questions 2, 13 and 20 | One decision is asked three times. Question 2 asks whether the end-of-turn review is a guided duty plus a threshold nudge. Question 13 asks whether one forced turn continuation is acceptable. Question 20 asks whether to approve the nudge at all. Answering 20 answers 2 and 13. | Make it one question with the cost stated inside it: "Approve the end-of-turn nudge? It speaks at most once per session per threshold and each time it forces the turn to continue." |
| F8 | should-fix | Section 15, questions 5 and 30 | Permission to edit the approved walkthrough is asked twice, in question 5 (Part 3's System Guide folder names) and question 30 (Part 1's completion check). | Ask once: "May the approved walkthrough be edited where this design changes it? Parts 1 and 3 are affected." |
| F9 | should-fix | Section 15, questions 13, 16, 21 and 24 | Four questions carry no recommendation. Question 16 asks whether `knowledge/project.md` should be trimmed to 1,500 characters or the number raised. Question 21 asks which project migrates first. Question 24 asks whether the component requirements documents become children of the operating-system document. Question 13 has no recommendation and no section 13 entry. Mike's brief says a recommendation comes with each. | Add one recommended answer per question, in the same shape as section 13. |
| F10 | should-fix | Whole document | Nothing states cost in tokens or money. Every number is characters. Mike pays per token and runs many parallel sessions, so a per-request character count is one step short of the number he decides on. | Convert the always-on per-request cost and the per-session-start cost to tokens once, with the conversion stated, and say what that is across a typical day of parallel sessions. |
| F11 | should-fix | Section 12 | There is no build effort estimate. Section 10 prices its own tests ("about one hour of work" each, 26 of them). Items 1 to 8 carry no size at all, and item 1 is the largest. | Add one column: rough size per item. |
| F12 | should-fix | Whole document | There is no way back. Two projects are equipped today. If the rewritten startup, the guards or the migration make sessions worse, the design does not say how Mike returns to what works now. | Add a short paragraph: what is reversible, what is not, and how a project goes back to today's layout after the migration in 9.5 has run. |
| F13 | should-fix | Section 12, item 1 | Item 1 is too large to be one work item. It holds: the manual rewrite, two hook scripts, four skill folders, about 18 reference files, the shipped rule file, and "the whole rename list in section 9.4", which is 15 files for the `remember` name alone. Item 6 also says it "finishes the rename list", so the rename work is claimed by two items. | Split item 1 into the manual and rule file, the four skills, and the startup hooks. Say which item owns the rename list. |
| F14 | should-fix | 6.1 manual section, against 6.4 budget math | The manual has two sizes. 6.1 sets the target under 4,000 characters with a warning at 4,000 and a failure at 5,000. 6.4's budget arithmetic uses 5,000 ("the manual under 5,000, so 7,560 against 9,500"). A builder does not know which number to write to. | Use one number in the arithmetic, and say plainly that 4,000 is the target and 5,000 is the ceiling. |
| F15 | should-fix | Section 4, 6.2, 8.1, 9.3, 14.4 | The standing rule is "about 26 lines" in section 4 and 6.2, and "about 25 lines" in 8.1, 9.3 and 14.4. The numbered list in 6.2 has 26 entries, and entry 25 covers three skills "in one line each", so the written file is 28 lines. | Pick one number and use it everywhere, or drop the number and give the character budget. |
| F16 | should-fix | Section 12, item 1 | Item 1 says the old skill names stop existing there, but its file list does not name the six skill folders to delete (`recall`, `reflect`, `remember`, `retire`, `second-brain`, `session-search`), and does not name `.claude-plugin/marketplace.json` or `.agents/plugins/marketplace.json`, which 9.3 says must list the new skills. `claude plugin validate .` runs before every pull request. | Add the deletions and both manifests to item 1's file list. |
| F17 | should-fix | Section 12, items 3 and 5 | Both items change `plugins/project-init/skills/project-sync/SKILL.md`. Item 3 puts the twelve migration steps in it, item 5 rewrites it for setup and the delivery proof. | Say which item owns the file and make the other depend on it. |
| F18 | should-fix | Section 6.3, `knowledge-save` | The body is 15 numbered steps (0 to 14) plus nine reference files. Requirement 29 says not to replace the agent's reasoning and to start with a small set of safeguards. The design tests every hook against that requirement but never tests the save skill's own length against it. | Say in one paragraph why 15 steps is guidance and not a script, or cut the steps that the agent would do anyway. |
| F19 | should-fix | 6.4, `startup-files.mjs` | The print order starts with "one line reading `Knowledge system <plugin version>, session source <source>`". The design never says where the version comes from. There is a `plugins/second-brain/.claude-plugin/plugin.json` in the repository, but the design does not name it. The version line is also the owner's and the agent's only signal that Codex hooks ran (8.2), so it is load-bearing. | Name the file and the field the version is read from, and say what prints when it cannot be read. |
| F20 | should-fix | 6.4, `startup-state.mjs`, print item 4 | "A malformed config is left alone so the System Guide plugin can report it." It does not say what the hook prints in that case: the entry page line, the "not configured" line, or nothing. | State the printed text for all three states: configured, absent or off, and malformed. |
| F21 | should-fix | Section 4, `knowledge/memory-inbox.md` row | The row gives Control: GUIDE. 6.4's write guard denies the `Write` tool on that exact file, which is ENFORCE. The same file is described two ways. | Change the row to GUIDE on content, ENFORCE on the tool used, matching how `knowledge/memory/current.md` is written in 6.1. |
| F22 | should-fix | Section 4 parts table vs 6.5 | `hooks/command-parsing.mjs` is a row in the section 4 parts table. Section 6.5 is titled "The tools and the Git hook" and says "The four tool scripts", covering `build-knowledge-index.mjs`, `check-knowledge.mjs`, `frontmatter.mjs` and `session-marker.mjs`. `command-parsing.mjs` gets no detail entry anywhere. | Add a short entry, or say in section 4 that it is described inside `save-moment-gate.mjs`. |
| F23 | should-fix | Section 12, item 1; sections 6.1, 6.2, 6.3 | The three hardest writing jobs in item 1 have budgets and meanings but no text: the manual (a ten-row budget table), the standing rule (26 items "by meaning"), and the four skill descriptions (a 1,536-character cap and a list of words each one "names"). An intern writing these from scratch produces something different from what the design was costed against. | Put a draft of the manual and the rule file in the design, or say they are written first and approved before the rest of item 1 starts. |
| F24 | should-fix | Section 13, 23 entries | The brief asks which requirements are out of place in the end-to-end experience. Section 13 is mostly about wording that is unclear or two documents that disagree. Only 13.5 (this document naming another plugin's folders) says a requirement does not belong here. Candidates the design notices and then keeps without asking: requirement 28's eight-item inbox entries (13.12 calls them heavy and recommends keeping them), and requirement 2's confirmation line, which costs one line of every session and proves nothing the design can check. | Add a short list: requirements that should move, shrink or go, with the recommendation for each. |
| F25 | nit | 2, failure table, line 81 | "Startup is heavy" is a picture word. | "Startup loads too much text." |
| F26 | nit | 4, line 218; 6.4, line 856; 10, line 1811 | "a hole in their ENFORCE claim", "a silent hole". | "A hook that reaches its timeout renders no decision, so the tool call goes through." |
| F27 | nit | 6.1, line 528 | "so neither can crowd out the rest of the map". | "so neither can push the other items past the budget." |
| F28 | nit | 6.1, line 497; 13.12, lines 2210 and 2214 | "a heavy entry", "That is heavy for a case that should be rare". | "a long entry", "That is a lot of text for a case that should be rare." |
| F29 | nit | 9.1 gate row, line 1625; 6.4, line 988 | "the gate is silent exactly where the owner works most". | "the gate never fires in web and remote sessions, which is where the owner works most." |
| F30 | nit | 14.7, lines 2511 and 2518 | "it leans on `tool_response.bashEditDiff`", "alternative one buys nothing". | "it depends on", "alternative one adds no coverage". |
| F31 | nit | 6.4, line 885 | "The four parts fit with room to spare". | "The four parts total 7,560 characters against 9,500." |
| F32 | nit | 13.14, line 2246 | "so the limit rarely bites". | "so the limit rarely applies." |
| F33 | nit | Section 3, heading "Which one a thing gets" | The heading does not name what sits under it. Under it are the rules for choosing ENFORCE, GUIDE or JUDGE. | "How each part is assigned ENFORCE, GUIDE or JUDGE". |

## Section 2. Answers

**(a) Does it answer the brief?** Mostly. The philosophy is stated and applied part by part. The "better solution" question is answered, but only by assembling 60 rows of section 9 and the closing alternatives table; there is no verdict in one place (F5). The "requirements out of place" question is answered thinly: section 13 is mostly about unclear wording and two documents disagreeing, not about requirements that do not belong in the end-to-end experience (F24).

**(b) Is the philosophy visible, and does any part control the agent's thinking?** Visible, and well done. Every part carries ENFORCE, GUIDE or JUDGE, section 3 lists five things the design refuses to build, and the design states plainly where nothing can be proved. Two parts come close to controlling thinking and are not weighed against requirement 29: the `knowledge-save` body at 15 numbered steps plus nine reference files (F18), and `session-review-nudge.mjs`, which forces the turn to continue whenever it speaks. The nudge is at least put to Mike as a decision. A third, the `Write` deny on `current.md` and the inbox, tells the agent which tool to use; the design gives a clear reason for it.

**(c) Are the open questions right?** The topics are right and most are answerable alone. Three faults: one decision is asked three times (F7), walkthrough-edit permission is asked twice (F8), and four questions carry no recommendation (F9). Thirty questions is also a lot for one sitting. After merging duplicates it is 27, and the twelve wording questions could be presented as one list with one yes.

**(d) What is missing that Mike would ask about?**
- Cost in tokens or money. Only characters are given, and the two always-on numbers are understated (F3) or never totalled (F4).
- Build effort. No size on any of the eight items (F11).
- Rollback. Two projects are equipped today and nothing says how to go back (F12).
- What he sees day to day: covered well. Section 5 has a "What the owner sees" column for all six parts.
- What happens when it fails: covered well. Every part has a problem-and-recovery table, and the named limits are honest.
- Migration of his projects: covered in 9.5 with twelve ordered steps for this repository and DragonFly. Missing: who runs it and what a failed migration leaves behind.

**(e) What would make him say no?** The homework. He is handed 30 questions, three of which are one decision, four with no recommendation, plus a 23-entry section 13 to cross-reference. Under it sits a real arithmetic error in the budget he is being asked to approve (F1) and a per-request cost that is about half the true figure (F3). His brief asks for one short yes per save and no pollution; this document asks for thirty.

**(f) Item 1 as the intern: files and pages.**

Files I would create or change, from section 12 item 1 and section 9:
1. `plugins/second-brain/skills/knowledge-setup/references/templates/knowledge/README.md` — rewrite under 4,000 characters, ten parts, budgets in the 6.1 table.
2. `plugins/second-brain/hooks/startup-files.mjs` — new.
3. `plugins/second-brain/hooks/startup-state.mjs` — new.
4. `plugins/project-init/library/rules/general/knowledge-system.md` — new, the 26 items in 6.2.
5. `.claude/rules/knowledge-system.md` — the installed copy in this repository, required by `tests/installed-copy-check.mjs`. The design does not name it in item 1.
6. `plugins/second-brain/skills/knowledge-find/SKILL.md` plus `references/source-roles.md`, `references/session-search.md`, `scripts/search-sessions.mjs` (moved from `session-search`).
7. `plugins/second-brain/skills/knowledge-save/SKILL.md` plus `references/routing.md`, `card-format.md`, `memory-file.md`, `prd-file.md`, `glossary-row.md`, `inbox-entry.md`, `lifecycle.md`, `skill-proposal.md`, `feedback-entry.md`.
8. `plugins/second-brain/skills/knowledge-review/SKILL.md` plus `references/review-checklist.md`.
9. `plugins/second-brain/skills/knowledge-setup/SKILL.md` plus `references/templates/`, `routing-examples.md`, `migration.md`, `codex-delivery.md`, `proof.md`.
10. Delete `plugins/second-brain/skills/recall/`, `reflect/`, `remember/`, `retire/`, `second-brain/`, `session-search/`. Not named in item 1.
11. `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json` skill lists. Not named in item 1.
12. The 15 files in 9.4 that name `remember`, and the 13 places that name the other five skills.

Documentation pages I would open, all under `ai-external-knowledge/claude-code/`, after step zero refreshes the capture:
- `hooks.md`, sections "SessionStart" and "JSON output" (the 10,000-character output cap).
- `skills.md`, sections "Frontmatter reference" and "Add supporting files".
- `memory.md`, section "Organize rules with `.claude/rules/`".
- `context-window.md`, section "What survives compaction".
- `plugins-reference.md`, section "Plugin components reference" (a plugin cannot ship a rules file).
- `sub-agents.md`, section "What loads at startup".

Where the design leaves me guessing:
- How to run or test the two hooks. There is no registration file in item 1 (F2).
- The actual text of the manual, the rule file and the four skill descriptions (F23).
- Which manual size to build to, 4,000 or 5,000 (F14).
- Where the plugin version in the first printed line comes from (F19).
- What prints when `.system-guide.json` is malformed (F20).
- Whether the hook reads `SOUL.md` from the hook input's `cwd` or from the repository root. In a worktree those differ, and the design names `cwd` as an input field without saying which it uses.
- Whether item 1 or item 6 deletes the old skill folders and updates the two manifests (F16).
- How `tests/installed-copy-check.mjs` compares the new manual, whose template moved under `knowledge-setup/references/templates/`.

**(g) Terms I met before they were defined.** The section 1 table defines 17 terms and is genuinely useful. These are not in it and are used before any explanation:
- `additionalContext` — first used in 6.1 under `current.md`, explained loosely in 6.4.
- `PreToolUse`, `PostToolUse`, `SessionStart`, `Stop`, `PreCompact` — event names, used from section 4 on, never defined. I can get them from `hooks.md`, but the table defines "Hook" and stops there.
- exec form and shell form — section 4's closing note, before any definition.
- `if` filter and permission-rule syntax — first used in section 4's table, explained partly in 6.4 and 8.5.
- `${CLAUDE_PLUGIN_ROOT}` — used in 6.3 and 6.4; `${CLAUDE_PLUGIN_DATA}` is explained in 6.6 but appears in section 4 first.
- `allowed-tools` — 6.3, no explanation of what the frontmatter field does.
- auto mode, `bypassPermissions`, managed setting — used in 6.3 and section 10 as if known.
- `stop_hook_active` — 6.4, no definition.
- worktree — used from 8.5 on.
- default branch — used throughout.
- second-brain as the plugin's name — paths like `plugins/second-brain/skills/` appear from 6.1, but the document does not say the plugin keeps that name until 9.3.

**(h) Sentences I had to read twice.**

| Location | Written | Plainer |
|---|---|---|
| 2, last paragraph | "The character budget in this design is the condition for requirement 2's startup reads to happen." | "Requirement 2's startup files only reach the agent if the hook output stays under the cap. That is what the character budget is for." |
| 5, Part 1, after the table | "The order is a fact about the bytes the hook printed, not a request to the agent." | "The hook prints the three files in order, so the order happened before the agent's first turn. Nothing asks the agent to read them in order." |
| 3, philosophy | "The parts around it deliver the right text at the right moment, refuse a small number of specific mistakes, and check files." | "Each part does one of three things: it delivers text when it applies, it refuses one named action, or it checks a file." |
| 6.3, `knowledge-save` | "The gate proves an invocation after the branch's last commit, not a good review." | "The gate only proves the save skill was invoked since the last commit. It cannot tell whether the review found anything." |
| 6.4, `session-review-nudge.mjs` | "Steps 4, 5, and 6 each continue the turn when they speak." | "When step 4, 5 or 6 prints anything, the turn does not end; the agent gets another turn to act on it." |
| 6.5, `check-knowledge.mjs` | "It does not pin the manual's bytes." | "It does not compare the manual against a saved checksum." |
| 8.5 | "One script serves both harnesses; one JSON block cannot." | "The same script file runs on Claude Code and Codex. Each one needs its own registration file, because the fields differ." |
| 6.6 | "When function hooks ship, this file and the `PreToolUse` and `PostToolUse` scripts that read it are the parts to move in-process." | "If Claude Code ever adds hooks that run inside the session rather than as a separate program, these are the parts that would move. Nothing here depends on that." |
| 6.4, `compact-hold.mjs` | "Where a `decision: \"block\"` reason lands, with the owner, the agent, or both, is a build-time proof, and the message is worded for whoever turns out to read it." | "The documentation does not say who sees the hold message. The build runs one test to find out, and the wording is set afterwards." |
| 11.3, closing | "The design says this plainly rather than claiming a counter proves them." | Delete. The sentence is about the document, not about the testing. |

**(i) Figurative and picture words found.** Listed as F25 to F32: "Startup is heavy"; "a hole in their ENFORCE claim" and "a silent hole"; "crowd out the rest of the map"; "a heavy entry" and "That is heavy"; "the gate is silent exactly where the owner works most"; "it leans on"; "buys nothing"; "with room to spare"; "so the limit rarely bites". Also "so nothing can drift" (6.5) and "The card layout can drift" (section 7). One borderline case: "the map" for the text the startup hooks print. It is a picture word, but requirement 2 introduces it ("a small map is available at the start"), so the design is using the requirements document's own term. Keeping it is defensible; if it stays, the section 1 table should define it.

**(j) Length.** 2,671 lines is about twice what the decision needs, and the repetition is structural, not wordy. Three cuts that lose no fact:
- Section 5, the six walkthrough tables, about 90 lines. Every row names a part that section 6 then describes in full, and the walkthrough itself is already approved and available. Keep the two things section 5 adds that exist nowhere else: the "What the owner sees" column, and the `/clear` paragraph.
- Section 7, the 30-row requirement map, about 35 lines. The Parts and Control columns repeat section 4; the Known limit column repeats each part's recovery table. Keep the "check that proves it" column, which is the only new content, and fold it into section 11.
- Sections 14.1, 14.2, 14.6, 14.7 and 14.8 restate 13.1, 14.2's own gate reasoning, 13.2, 9.1 and 6.5. About 60 lines. Keep section 14 only for the choices section 13 does not already put to Mike.

That is roughly 185 lines, and merging the duplicate open questions removes more. What should not be cut: section 6's per-part problem-and-recovery tables, section 9.4's rename list, section 9.5's migration order, and section 10's assumption tests. Those are the parts the intern cannot do without.

## Section 3. Verdicts

**As Mike: approve with changes.** The design does the hard part. It reads the real captured documentation, names a page for every part, measures the shipped startup hook at 20,585 characters against a 10,000-character cap, and builds everything from hooks, skills, Markdown and Git. It marks every part ENFORCE, GUIDE or JUDGE, refuses five things by name, and says out loud the three things nobody can prove. The agent is left to reason. That is the brief.

Four changes before a yes:
1. Fix the `startup-state.mjs` worst case (F1) and the standing rule's per-request cost (F3), then give one always-on cost figure in tokens (F4, F10). These are the numbers I am being asked to approve.
2. Cut the open questions from 30 to one decision each, with a recommendation on every one (F7, F8, F9).
3. Add the verdict paragraph on keep against refactor (F5), a size per build item (F11), and a rollback paragraph (F12).
4. Make item 1 buildable and testable on its own (F2, F13, F16).

**As the intern: cannot build item 1 as written.** The blocker is F2. I can write both startup hooks, but there is no registration file in item 1, `hooks/hooks.json` does not exist in the repository, and the hooks that run today are registered in `.claude/settings.json` pointing at `.claude/hooks/knowledge-session-start.mjs`. So I would finish item 1 with two scripts that never run, no way to check the print order, the budget or the overflow rule, and the old startup hook still in force. Two smaller stoppers sit behind it: I have no draft text for the manual, the rule file or the four skill descriptions, only budgets and meanings (F23), and I do not know whether item 1 or item 6 deletes the six old skill folders and updates the two marketplace manifests, which `claude plugin validate .` reads before every pull request (F16).

With F2, F16 and F23 resolved, and F14, F19 and F20 answered in a sentence each, item 1 is buildable in the week.

# Fix report, round 2

Design edited: `/home/user/claude-toolkit/docs/designs/269-knowledge-system.md`.
No other file was changed, and nothing was committed. Both hand edits named in
the fix list survive: the five old card labels are still written as `Why`,
`Where`, `From`, `Unsure`, `Checked` in backticks (9.3 and 9.4), and the text
"knowledge-policy" is still followed by ", a colon, and the name" in 9.4.

## Measured numbers

| What was measured | How | Result |
| --- | --- | --- |
| The standing rule as written in 6.2 before this pass | The 26 numbered lines unwrapped to one line each, `wc -c` | 2,438 characters |
| The standing rule after tightening | Same method, `scratchpad/rule-after.txt` | 1,998 characters, 26 lines |
| `startup-files.mjs` worst case | 100 version line + 1,000 `SOUL.md` + 1,500 `knowledge/project.md` + 5,000 manual ceiling | 7,600 against 9,500 |
| `startup-state.mjs` worst case | 100 + 1,200 + 1,500 + 200 + 100 + 5,000 + 200 | 8,300 against 9,500 |
| Both startup hooks together | 7,600 + 8,300 | 15,900; budgets allow 19,000; about 10,000 in a normal project |
| Always-on cost per request | 1,998 rule + under 2,000 for four descriptions | about 4,000 characters, about 1,000 tokens |

New line count: 2,865 (was 2,671).

## Rulings

| Id | Applied or declined | Note |
| --- | --- | --- |
| C1 | Applied | New caps in 6.4, 6.1, section 4, section 7 row 7, the section 10 seeded test, 13.14, 13.22 and question 26. The sum is written out in 6.4 and the parts table rows carry the new costs. Glossary 2,000 is gone from every place. |
| C2 | Applied | Item 1 creates `hooks/hooks.json` with the two `SessionStart` entries and their timeouts and removes this repository's old `SessionStart` entry and hook copy; item 2 adds the guard, after-write, Stop and PreCompact entries; a paragraph after item 1 lists what it can test on its own. |
| C3 | Applied | 6.2 states 1,998 characters measured and names the 2,438 it replaced. The number appears in section 4, 6.2 twice, section 12's cost table, 9.3 and question 14. |
| C4 | Applied | Old questions 2, 13 and 20 are now question 2; old 5 and 30 are now question 5. Twenty-seven questions, renumbered, with the intro count and every cross-reference updated. |
| C5 | Applied | Recommendations added to the merged nudge question (2), the walkthrough-edit question (5), `knowledge/project.md` size (15), migration order (19) and child PRD folders (22). |
| C6 | Applied | The pre-commit recovery row now points at open question 16 only. The "see 13.x" and "question N" references were swept and fixed. |
| C7 | Applied | New "Cost, effort, and rollback" subsection at the start of section 12: a before-and-after cost table in characters and tokens, an effort estimate per item in agent sessions marked as an estimate, and a rollback paragraph. |
| C8 | Applied | Section 9 opens with the keep-or-refactor verdict and the measured fact behind it. |
| C9 | Applied in part | Trimmed: five section 5 rows to pointers, the recommended blocks of 14.1, 14.6 and 14.7, the duplicate `current.md` confirmation paragraph in 6.1, the duplicate stronger-guard paragraph in 6.4, and 13.7's restatement of 6.3. Section 7 kept whole. The document is 2,865 lines, not 2,600: the round added the section 1 term rows, the cost and rollback subsection, the verdict, the move-shrink-or-go list, the `command-parsing.mjs` entry and the question recommendations, and the remaining length is section 6's per-part detail and section 13's 23 entries, which the rulings and the reviews both say to keep. |
| C10 | Applied | See the review 5 table below. |
| D1 | Applied | Both index rows now read "Path and entry count printed at start; contents opened during a lookup", cost "About 60 characters at start". |
| D2 | Applied | 13.13 now names the real Codex gaps: no compaction hold, no `if`, `once` or `args`, and the trust rule. |
| D3 | Applied | `compact-hold.mjs` has a 5-second timeout in section 4, 6.4 and the section 10 timeout test. |
| D4 | Applied | 26 lines in all six places. |
| D5 | Applied | 9.4 now cites "the inventory in the research notes for this design, 2026-09-16, not in the repository". |
| D6 | Applied | 1471 becomes 1469 in two places, 1065 becomes 1075 in two places. The sweep also found requirement 18's "given to the agent in every project" at PRD line 1308, not 1307; fixed in 13.20 twice and in question 24. The other citations in sections 13 and 15 were checked against the PRD and are correct. |
| D7 | Applied | See the review 4 table below. |

## Review 5 findings

| Id | Applied or declined | Reason |
| --- | --- | --- |
| F1 | Applied | C1. |
| F2 | Applied | C2. |
| F3 | Applied | C3. |
| F4 | Applied | One always-on line in section 4 and 6.3: descriptions under 500 characters each, about 4,000 characters in total with the rule. |
| F5 | Applied | C8. |
| F6 | Applied | C6. |
| F7, F8 | Applied | C4. |
| F9 | Applied | C5. |
| F10 | Applied | C7's cost table converts to tokens at four characters per token and gives one day's example. |
| F11 | Applied | C7's effort table. |
| F12 | Applied | C7's rollback paragraph. |
| F13 | Declined in part | The split of item 1 conflicts with C2, which keeps item 1 whole and adds `hooks.json` and the deletions to it. The rest is applied: item 1 owns the rename list for the six old skill names and both manifests, item 6 owns the remaining references. |
| F14 | Applied | 6.1 says 4,000 is the target and 5,000 the ceiling; 6.4's arithmetic uses 5,000. |
| F15 | Applied | D4. |
| F16 | Applied | Item 1's file list names the six folder deletions and both manifests. |
| F17 | Applied | Item 3 owns `project-sync/SKILL.md`; item 5 depends on it. |
| F18 | Applied | 6.3 says in one paragraph why fifteen steps is guidance and not a script. |
| F19 | Applied | The version is the `version` field of `plugins/second-brain/.claude-plugin/plugin.json`, and the line reads "version unknown" when it cannot be read. |
| F20 | Applied | Three printed states for the System Guide line. |
| F21 | Applied | The inbox row reads GUIDE on content, ENFORCE on the tool used. |
| F22 | Applied | `hooks/command-parsing.mjs` has its own entry in 6.5. |
| F23 | Applied | Item 1's note: the manual, the rule and the four descriptions are written and approved first. |
| F24 | Applied | Section 13 ends with five requirements that should move, shrink or go, each with a recommendation. |
| F25 to F32 | Applied | Every named phrase replaced with the plain statement. |
| F33 | Applied | The section 3 heading names what sits under it. |
| (g) terms | Applied | Seventeen rows added to the section 1 table, including the hook events, `additionalContext`, exec and shell form, the `if` filter, both plugin variables, `allowed-tools`, auto mode, `bypassPermissions`, managed setting, `stop_hook_active`, worktree, default branch, DragonFly, `second-brain` and map. |
| (h) sentences | Applied | All ten rewritten or deleted as the review suggested. |
| Hook `cwd` question | Applied | 6.4 says both startup hooks resolve paths from the repository root that `git rev-parse --show-toplevel` reports for `cwd`. |

## Review 4 findings

| Id | Applied or declined | Reason |
| --- | --- | --- |
| 1 | Applied | C1. |
| 2 | Applied | D1. |
| 3 | Applied | D2. |
| 4 | Applied | D3. |
| 5 | Applied | D4. |
| 6 | Applied | Item 6 of the print order now says a missing file makes the agent hold the confirmation back until that file is read. |
| 7 | Applied | "Exactly" is gone; the section 10 permission test's pass condition now names the permission check returning allow and the rewrite if it does not. |
| 8 | Applied | D5. |
| 9 | Applied | Item 1's heading reads "The manual, the standing rule, the two startup hooks, and the four skills". |
| 10 | Applied | Nine other parts in 6.1 and 13.20. |
| 11 | Applied | D6. |
| 12 | Applied | Every phrase replaced. |
| 13 | Applied | DragonFly and `work finish` are both glossed at first use. |
| 14 | Applied | 13.15 refers to the stronger write guard in 14.3 by description. |
| 15 | Applied | The four file rows name `startup-files.mjs` or `startup-state.mjs`. |
| 16 | Noted | Length is reported above, with the reason. |

## Declined

- Review 5 F13's split of item 1 into three items, because C2 rules that item 1
  keeps the manual, the rule, both startup hooks, the four skills and now the
  registration file. Its other half is applied.
- No finding in either review asked for a new enforcement part, a scorer, a
  reply reader, or a service, so nothing was declined under that rule.

## Checks

| Check | Result |
| --- | --- |
| `node tests/link-check.mjs` | PASS, 135 relative links across 187 files |
| `node tests/orphan-check.mjs` | PASS, 148 shipped files reachable |
| `node tests/installed-copy-check.mjs` | PASS, 21 checks |
| `node tests/knowledge-startup-check.mjs` | PASS, 37 checks |
| `grep -n "/tmp/claude\|knowledge-files.md\|startup-map.mjs"` | No match |
| Mermaid fences | 4 fence lines: one `mermaid` pair and one `json` pair, balanced |
| Section 7 rows | 30 |
| Section 15 count | Introduction says twenty-seven; the list holds 27, numbered 1 to 27 |
| `git status` | Only `docs/designs/269-knowledge-system.md` modified, nothing committed |

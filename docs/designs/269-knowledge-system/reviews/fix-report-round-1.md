# Fix report, round 1

Design edited: `/home/user/claude-toolkit/docs/designs/269-knowledge-system.md`.
Only that file was changed. Nothing was committed.

## Rulings applied (fix-list-round-1.md and its addendum)

| Ruling | Applied | What changed |
| --- | --- | --- |
| 1. Two startup hooks | yes | `startup-files.mjs` (version line, `SOUL.md`, `project.md`, manual) and `startup-state.mjs` (inbox state, glossary, index paths and counts, System Guide line, `current.md`, last line). Sections 2, 4, 5, 6.1, 6.4, 6.6, 7, 8.1, 9.1, 10, 12, 13, 14 and the flowchart updated. Startup cost now at most about 19,000 characters, about 10,000 in a normal project |
| 2. Confirmation line by source | yes | Last line asks for the confirmation on `startup` and `clear`; on `resume`, `compact`, `fork` it says "Context was restored. Do not repeat the startup confirmation." Stated in 5 Part 1, the standing rule line 3, 6.4. New open question 27 and new entry 13.21 |
| 3. Pre-write check is a skill step | yes | Section 5 Part 4 split into two rows; `knowledge-save` step 8 names the three agent actions; the write guard row says it checks permission, never content |
| 4. Drop the path-scoped rule file | yes | Removed from the parts table, section 5, 6.2, 7 row 6, 8.1, 9.3, 12. Recorded in new section 9.6. Named there without its filename so the grep check stays clean |
| 5. Drop the manual hash pin | yes | 6.5 `check-knowledge.mjs`, 9.3, 9.4, 11.4 |
| 6. Replace `/tmp` citations | yes | Sections 8, 9, 13.17 and the alternatives appendix now cite the Codex commit, the shipped file, the captured page, `knowledge/prds/toolkit-operating-system/knowledge-system-walkthrough.html`, or "the research notes for this design, 2026-09-16, not in the repository" |
| 7. Make the halves agree | yes | `additionalContextLimit` is 10,000 tokens everywhere; twelve required memory fields everywhere; `autoMemoryEnabled: false` decided with the environment variable as fallback; template path is `skills/knowledge-setup/references/templates/` |
| 8. Review 3 should-fixes and nits | yes | See the table below |
| 9. Stop nudge attribution | yes | 6.4, 8.4, 13.2, 14.6, open question 20 all say it was recommended by an agent on 2026-09-03 and never approved, and say what the design does without it |
| 10. Codex `PreToolUse` is not shell-only | yes | 8.1 rows for the gate, the write guard and the after-write hook rewritten; the real Codex gaps are listed in the section 8 opening and 8.5 |
| 11. Skill-tool hooks are the fallback only | yes | 6.5 `session-marker.mjs` and 14.8 name `UserPromptExpansion` for the typed path |
| 12. Numbers and paths | yes | See the verification table below |
| 13. Addendum A1 to A9, B1 to B8 | yes | See the table below |

## Addendum rulings

| Id | Applied | Note |
| --- | --- | --- |
| A1 | yes | `startup-state.mjs` prints inbox, glossary, index counts, System Guide line, then `current.md`, then the last line |
| A2 | yes | Both requirement 18 tables move to `knowledge-save/references/routing.md`; manual keeps a ten-line summary; stated in 6.1, 7 row 18, new entry 13.20, open question 26 |
| A3 | yes | Interview clause added to `knowledge-save` step 12, standing rule line 23, section 5 Part 4, testing plan 11.2, entry 13.23, open question 29 |
| A4 | yes | `knowledge-save` shows a skill proposal and stops; dependency named in 9.6; work item 8 added to section 12; 7 row 17 restates the full Check; 13.7 rewritten |
| A5 | yes | Rows 1, 26 and 29 relabelled GUIDED with "Checked at build review, not at run time". Three kinds of control kept |
| A6 | yes | Bash `PostToolUse` registration removed; reconciliation moved to `session-review-nudge.mjs` step 6; cost lines and 14.7 updated |
| A7 | yes | Write guard deny condition 3 covers `Write` on `current.md` and the inbox; the Bash bypass is stated once |
| A8 | yes | Entries 13.20 to 13.23 added in the same shape |
| A9 | yes | See review 1 table |
| B1 | yes | 6.4, 8.4, 14.6 and open question 13 rewritten: `additionalContext` on `Stop` continues the turn under the same protections as a block; only the transcript label differs |
| B2 | yes | Per-part sizes and drop order stated for each startup hook |
| B3 | yes | `allowed-tools` in the `knowledge-save` frontmatter, plus the managed-setting and auto-mode cases; the one-hour test is in section 10 |
| B4 | yes | Eight gate handler entries, three Bash and three PowerShell plus two MCP; one `if` per handler stated for the write guard and the after-write hook too |
| B5 | yes | 10,000 tokens, with the reason |
| B6 | yes | Timeouts on every entry, the fail-open consequence, and a proof in section 10 |
| B7 | yes | Eleven extra proofs added; section 10 now holds 26 tests |
| B8 | yes | See review 2 table |

## Review 1, requirements lens

| Id | Applied | Reason |
| --- | --- | --- |
| B1 | yes | Split print across two hooks with stated per-part sizes and drop order (ruling 1, A1) |
| B2 | yes | Routing table delivered at routing time (A2) |
| B3 | yes | Manual gains "What is worth saving" and "How a save is proposed" |
| B4 | yes | `knowledge-save` never writes a skill; 7 row 17 carries the full Check; 13.7 rewritten (A4) |
| B5 | yes | Interview clause added in four places (A3) |
| S1 | declined | Adds a new `UserPromptSubmit` part. The fix list declines findings that add a new part; the design removes `memory-reminder.mjs` for cost and answers that moment with the standing rule |
| S2 | yes | Bash registration dropped, reconciliation at Stop (A6) |
| S3 | yes | `Write` deny on the two shared files (A7) |
| S4 | yes | `owner` field in `knowledge/project.md`; no person's name ships |
| S5 | yes | `knowledge-save` step 0 reads the active output style, or the artifacts rule when the style is a built-in |
| S6 | yes | Manual warns at 4,000 and fails at 5,000; feedback file warns only; entry 13.22 and open question 28 added |
| S7 | yes | Relabelled GUIDED with a note, per A5, rather than adding a fourth label |
| S8 | yes | Row 10's known limit names the Bash bypass and what catches it |
| S9 | yes | Glossary prints two columns above 2,000 characters |
| S10 | yes | After-write hook checks `current.md` with `git status` and `git rev-list` |
| S11 | yes | `knowledge-setup` shows the table with one example per row from `references/routing-examples.md` |
| S12 | yes | Four entries and four open questions added |
| N1 | yes | Section 13 now says twenty-three and holds twenty-three |
| N2 | yes | Twelve fields in both places |
| N3 | yes | 10,000 everywhere, in tokens for Codex |
| N4 | yes | Walkthrough cited as `knowledge/prds/toolkit-operating-system/knowledge-system-walkthrough.html` |
| N5 | yes | Three visible moments; the after-write check sits under file checks |

## Review 2, harness lens

| Id | Applied | Reason |
| --- | --- | --- |
| F1 | yes | Stop `additionalContext` continues the turn (B1) |
| F2 | yes | Two hooks, stated arithmetic, stated drop order (B2) |
| F3 | yes | `allowed-tools` plus the two other failure cases (B3) |
| F4 | yes | PowerShell twin handlers (B4) |
| F5 | yes | Token unit corrected in all four places (B5) |
| F6 | yes | Codex `PreCompact` cannot block, recorded as a named gap; proof 4 becomes a verification run |
| F7 | yes | MCP row downgraded from unproven to confirmed in the source |
| F8 | yes | Explicit timeouts, the fail-open hole named, and a proof added (B6) |
| F9 | yes | `knowledge-setup` reads `core.hooksPath` first; executable bit, shebang and `--no-verify` named |
| F10 | not applicable | The path-scoped rule file is dropped, so the `paths:` form no longer appears |
| F11 | not applicable | Same file; the citation is gone |
| F12 | yes | "Inject dynamic context", "How injected commands run", "When an injected command fails" |
| F13 | yes | "Plugin components reference", line 905 and the file-locations table |
| F14 | yes | The "skipped at launch" half is attributed to the research notes and re-cited after step zero |
| F15 | yes | `omitClaudeMd` added to the subagent exception list |
| F16 | yes | `UserPromptExpansion` named as the typed-path fallback |
| F17 | yes | Test split into a `--init-only` run and a real compacted session |
| F18 | yes | Who reads the `PreCompact` message is stated, the ENFORCE claim narrowed, a proof added |
| F19 | yes | Section 4 note qualified for `Stop` and the compaction events |
| F20 | yes | Plugin-scoped MCP names named; the matcher covers a user-level or project-level server |
| F21 | yes | `NotebookEdit` left out as a stated decision |
| F22 | yes | The 1,536-character description cap named in 6.3 |

## Review 3, philosophy and clarity

| Id | Applied | Reason |
| --- | --- | --- |
| B1 | yes | Ruling 1 |
| B2 | yes | Ruling 2 |
| B3 | yes | Ruling 3 |
| S1 | yes | Templates path is `skills/knowledge-setup/references/templates/` in items 1 and 3 |
| S2 | yes | 10,000, stated once in 6.7 |
| S3 | yes | Twelve fields |
| S4 | yes | `autoMemoryEnabled: false` decided |
| S5 | yes | Ruling 6 |
| S6 | yes | Ruling 4 |
| S7 | yes | The hold fires only when there is something to review, and the review ends with a line telling the owner to run `/compact` again |
| S8 | yes | `stop_baseline` is the reference point until `save_skill_at` exists; the cap is once per threshold |
| S9 | yes | `core.hooksPath` conflict handled |
| S10 | yes | Style read at step 0 and style check at step 9 |
| S11 | yes | 13.1 names the walkthrough and says answering may mean editing it; open question 30 added |
| S12 | yes | 13.5 says the answer also changes the walkthrough; open question 5 asks for it |
| S13 | yes | Three moments; the two guided ones named in section 3 |
| S14 | yes | Card, System Guide, dynamic context injection, spill and fail-open added to the words table |
| S15 | yes | All nine picture phrases replaced with the plain statement |
| S16 | yes | Heading is "The per-turn review is guided, not enforced" |
| S17 | yes | The indexes print a path and an entry count, never contents; open question 15 now asks about the three per-part numbers |
| S18 | yes | Section 13 says twenty-three; section 12 says eight items after step zero |
| N1 | yes | One line says why the plugin keeps the name `second-brain` |
| N2 | yes | The 2026-09-03 records are attributed to issue 269 and its comment date |
| N3 | yes | `command-parsing.mjs` has a parts-table row |
| N4 | yes | The continuation cap is stated where continuations are discussed |

## Verification report

Applied where the wrong claim reached the design text.

| Correction | Applied | Where |
| --- | --- | --- |
| Function-hook issue 91870 is a community account, not Anthropic | yes | 13.11 |
| Codex has twelve PascalCase events, output differs per event | yes | Section 4 note, section 8 opening, 8.5 |
| Codex `PreToolUse` covers file writes | yes | 8.1, 6.4 write guard |
| The manual is 13,395 characters; startup prints 20,585 | already correct | 2, 6.1, 9 |
| `ai-external-knowledge/README.md` does not exist today | yes | 6.1 indexes, 9.3 |
| The checker requires nine fields today and twelve after the change | yes | 6.5, 9.3 |
| `approved_by` takes a person's name | yes | 6.1, 13.4, open question 4 |
| Inbox entry holds eight items | yes | 6.1, 13.12 |
| Walkthrough inbox card lines | yes | 13.17 now cites the repository file |
| `work-item-upkeep.md` line 543 does not exist | not applicable | The design never cites that line |
| Stop nudge was an agent recommendation, never approved | yes | Ruling 9 |
| One `if` holds one rule | yes | Gate, write guard, after-write |
| Codex has no `args` field | yes | Section 4 note, 8.5 |
| Skill bodies re-inject at 5,000 per skill and 25,000 total | yes | 6.3 |
| `--init-only` proves the `startup` source only | yes | Section 10 |
| `bashEditDiff` is gated by `bashEditDiffEnabled` | yes | 6.4 after-write, as a reason for dropping the Bash branch |
| `additionalContextLimit` counts tokens | yes | 6.7, 8.6 |
| Skill-tool hooks miss a typed `/skill-name` | yes | 6.5, 14.8 |
| Three OS PRD rows, not four; row 508 already reconciled | yes | Open question 25 |
| Four hooks installed by the shipped setup, five files in the plugin | yes | 9.4 |
| Three moments a hook raises, plus the handoff and the nudge | yes | Sections 2, 3, 7 |

## Declined

| Finding | Reason |
| --- | --- |
| Review 1 S1, keep a small `UserPromptSubmit` hook | It adds a new part at a per-message cost the design deliberately removed. The fix list's closing rule declines findings that add a part, and requirement 29 says to add a safeguard after a failure that happened |
| Review 1 S7's fourth control label REVIEWED | Ruling A5 says to relabel those rows GUIDED with a note and keep three kinds of control |
| Review 3 "consider merging `knowledge-review` into `knowledge-save`" | Requirement 24 names four plain-language outcomes, and the design's four skill descriptions are written against the 1,536-character cap. Merging would be a design change beyond the rulings |

## Checks

| Check | Result |
| --- | --- |
| `grep -n "knowledge-files.md\|startup-map.mjs\|/tmp/claude"` | No matches |
| Mermaid fences balanced | One `mermaid` fence opened at line 315 and closed at 354; one `json` fence at 1009 and 1014. Balanced |
| Section 7 requirement rows | 30 |
| `node tests/link-check.mjs` | ALL PASS, 135 relative links resolve across 187 Markdown files, FAIL: 0 |
| Line count | 2,671 |
| Files changed | `docs/designs/269-knowledge-system.md` only. Nothing committed |

## The line count

The target was about 2,400 lines and the file is 2,671. The rulings added a
second startup hook with its own print order and budget, eleven build-time
proofs, four entries in section 13, five open questions, timeouts, PowerShell
handler entries, the interview clause, the skill-proposal path, and section 9.6.
Dropping the path-scoped rule file, the hash pin and the Bash registration gave
back about 60 lines. The rest of the gap was closed by merging short
single-purpose paragraphs and cutting the per-file Codex repetition that
section 8.1 already carries, which took the file from 2,893 to 2,671 with no
words removed. Closing the remaining 270 lines would mean deleting facts the
reviews asked for, so the count is reported rather than met.

Other stated counts were recounted and now match the document: seven hooks,
twenty-six assumption tests, twelve Codex proofs, twenty-three entries in
section 13, thirty open questions, eight build items after step zero, and a
manual content outline totalling 3,250 characters.

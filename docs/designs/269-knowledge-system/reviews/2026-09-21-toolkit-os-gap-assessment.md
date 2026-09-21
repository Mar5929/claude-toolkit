# Toolkit Operating System gap assessment, 2026-09-21

Date: 2026-09-21.
Commit assessed: `9c71a90`, equal to origin/main at the time.
Produced by: a Claude Code desktop chat with five Opus readers, one per child requirements document, coordinated by the main orchestrator.
Status: this is review evidence. It approves nothing. The ten decisions and the two philosophy conflicts are open questions for Mike.
Scope: the non-Knowledge Toolkit Operating System requirements documents under `knowledge/prds/toolkit-operating-system/`.

## Assessment report

The non-Knowledge Toolkit is mostly built, and every repository check passes. What remains is proof that agents behave as required in real Claude Code and Codex sessions, and that proof is mostly absent. There are also a few small build holes, a batch of out-of-date wording, and a short list of choices only Mike can make. I changed nothing.

One limit applies to this report itself. The selected output style file could not be located in this session, so I have not read it.

### Approval state of the documents

My brief said none of these documents is approved. The files say something different, and the main orchestrator should know before planning.

| Document | Status line in the file | What that means |
| --- | --- | --- |
| Parent (`toolkit-operating-system.md`) | `proposed`, no approver | Not approved. Only R25 and the approval-format part of R15 were separately approved and shipped. |
| `folder-instruction-files.md` | `finalized`, Mike Rihm, 2026-08-22 | Approved. |
| `guided-delivery.md` | `finalized`, Mike Rihm, 2026-09-08 | Approved. Text was added on 2026-09-16, 09-18 and 09-20, after the approval date. |
| `guided-work-management.md` | `proposed` | Not approved as a whole. Four scoped approvals are recorded inside it. |
| `system-guide.md` | `proposed`, with `approved_by` Mike Rihm 2026-09-10 | Name, place, folder shape and permission to build were approved. Finished behavior is not accepted. |
| `work-item-upkeep.md` | `finalized`, Mike Rihm, 2026-09-05 | Approved. |

I treated nothing as newly approved. No closed issue counts as acceptance in this report.

### Summary per requirements document

**Parent: The Toolkit Operating System (R1 to R25).**
- Startup orientation is built: the manual, its template, the startup hooks and both hosts' registration.
- The direct documentation save route is built.
- Setup and sync reporting is built.
- No tracked item owns the parent's acceptance, because issue #306 is closed.
- There is no per-host list of which protections work on Codex.
- The eight fresh-session proofs that R25 asks for have not been run.
- Several links and status words are out of date.
- Eight boundaries are still open. Four belong to the Knowledge team.

**Folder instruction files.**
- Built and mostly matching its document.
- One real hole: project sync knows four reasons to skip a folder, and setup knows five.
- The requirement text lags behind what ships in two places.
- Nobody has run setup on a throwaway project to watch it work.
- Nobody has watched Codex open a folder file.

**Guided delivery.**
- The instructions ship and match the document.
- The design process has never been run end to end on either host. That covers the readiness check, the agreed way of working, and the critique rounds.
- The six helper agents are Claude Code definitions.
- Codex has only a written fallback for those helpers. That fallback has never been run.

**Guided work management.**
- The offer sentence, the single `WORK-ITEM.md` record and the roadmap tasks all ship. 77 tests pass.
- Behavior has been observed only on Codex CLI 0.154 with GPT-5.6 Sol.
- Nothing has been observed on Claude Code.
- One known hole is still open. The tool lets an agent mark requirements approved while the Goal still reads `_Not agreed yet._`.

**System Guide.**
- The tool is built and its tests pass: 18 core, 7 experience and 7 integration checks.
- No project has ever turned it on, this one included.
- Every requirement about agent behavior is therefore unproven on both hosts.
- One field is missing: a capture date for each source.

**Work-item upkeep.**
- Nine of its eleven paragraphs are met with code and tests.
- GitHub-mode writing is guidance only and has no recorded Claude Code run.
- The document does not mention the newer single record or the delivery offer.

**Catalog and manual.**
- `docs/toolkit-map.md` does not mention the System Guide plugin at all.
- The toolkit manual matches what ships.

### Findings

Kinds:
- 1 = requirement text is out of date.
- 2 = required behavior is missing or partly built.
- 3 = behavior is built with no proof on a host.
- 4 = Mike's decision.

Sizes:
- S = under an hour.
- M = a few hours.
- L = a day or more.

#### Parent document

| Finding | Requirement | Kind | Evidence | Next step | Size |
| --- | --- | --- | --- | --- | --- |
| P1 | Parts table | 1 | `toolkit-operating-system.md:33-38` calls three children "current". Their files say `finalized`. `docs/toolkit-map.md:501-502` has the same old word. | Change the word in both places. | S |
| P2 | R9, R11 | 1 | Lines 270 and 305 link to two sections of `knowledge-manual.md` that no longer exist. The link check ignores section links, so it passes. | Point them at sections 4 and 3 of the manual. | S |
| P3 | Roadmap | 4 | Lines 96-98, 725-727 and 757 say issue #306 owns refinement, acceptance and live progress. #306 is closed and its label is still `02-refinement`. | Mike chooses the home (decision 1). Then update the text. | S |
| P4 | R11 | 1 | Line 334 says no glossary file is assumed to exist. It exists at `knowledge/memory/memory-entries/terminology-glossary.md`. | Update the sentence. | S |
| P5 | Notes | 1 | The parent, `folder-instruction-files.md` and `system-guide.md` have no bottom Notes section. `knowledge/toolkit-manual.md:212-214` says a document under refinement keeps one. | Add Notes with the resume point. | S |
| P6 | Roadmap | 1 | Lines 746-749 say the rules audit has no owner. Issue #360 later did a seven-fix instruction audit. | Name #360, or say what audit remains. | S |
| P7 | R5, R19, "Installation across hosts" | 2 | The required per-host report does not exist. | Write one table of each protection by host, with gaps stated. | M |
| P7a | R5, R19 | 2 | `.agents/plugins/marketplace.json` has no hooks-library. | Cover in the P7 table. | |
| P7b | R5, R19 | 2 | `.codex/hooks.json` has no tool-use hooks. | Cover in the P7 table. | |
| P7c | R5, R19 | 2 | Codex therefore lacks the reminder before a pull request. | Cover in the P7 table. | |
| P7d | R5, R19 | 2 | Codex lacks the specification reminder on first edit. | Cover in the P7 table. | |
| P7e | R5, R19 | 2 | Codex lacks the prompt on closing an issue. | Cover in the P7 table. | |
| P7f | R5, R19 | 2 | Codex lacks the AI-credit guard. | Cover in the P7 table. | |
| P7g | R5, R19 | 2 | Codex lacks the Salesforce guards. | Cover in the P7 table. | |
| P7h | R5, R19 | 2 | `plugins/hooks-library/README.md` never mentions Codex. | Cover in the P7 table. | |
| P8 | R6 | 3 (Codex, plus clear and compact on both hosts) | `docs/designs/306-toolkit-manual-review.md:328-334`. | Run the missing cases after sync. | M |
| P8a | R6 | 3 | New evidence: this Claude Code desktop session received both startup hooks and every per-message reminder. I completed the required reads. | Record this session as Claude Code receipt. | |
| P8b | R6 | 3 | Still unproven: trusted Codex hook receipt. | Run one trusted Codex start. | |
| P8c | R6 | 3 | Still unproven: clear and compact on both hosts. | Run one clear and one compact per host. | |
| P8d | R6 | 3 | Still unproven: Windows. | Run once on Windows. | |
| P8e | R6 | 3 | Still unproven: whether helper agents inherit the guidance. | Check one helper run. | |
| P9 | R25 "Proof before reusable delivery" | 3 (both hosts) | Lines 644-649 list eight scenarios. Line 551 says fresh-session adherence is not claimed. | Run the eight in a disposable repository on each host. | L |
| P10 | R21 | 2 | No shipped rule or skill tells an agent how to propose a project lesson as a toolkit change. The only text is one sentence at `knowledge-manual.md:318-320`. | Add a short paragraph to the manual template. | S |
| P11 | Output styles | 2 | The style check tells the agent every turn that it cannot find the style file. | Make the hook stay quiet for built-in styles. Sync then fixes the override. | S |
| P11a | Output styles | 2 | `.claude/settings.json` selects Plain English. | No change. | |
| P11b | Output styles | 2 | The laptop file `.claude/settings.local.json` overrides it with the built-in Concise. | Remove the override during sync. | |
| P11c | Output styles | 2 | `plugins/hooks-library/hooks/style-handshake.mjs:48,90` looks only for style files. A built-in style has none. | Skip the message when the style is built in. | |
| P12 | End-of-turn check | 2 | The project's Stop check asked me to run one bookkeeping command. This chat's permission mode refused that command at every turn end. | Knowledge team: allow that exact command in project settings, or find another way to record it. | S |
| P12a | End-of-turn check | 2 | The command writes only to the computer's temporary folder (`.claude/hooks/knowledge-completion.mjs:17`). | No change. | |
| P12b | End-of-turn check | 2 | This affects every read-only team. It belongs to the Knowledge team. | Route to the Knowledge team. | |

#### Catalog

| Finding | Requirement | Kind | Evidence | Next step | Size |
| --- | --- | --- | --- | --- | --- |
| C1 | Catalog | 1 | `docs/toolkit-map.md` has no mention of system-guide. | Add the plugin row and the skill row. | S |
| C1a | Catalog | 1 | `CLAUDE.md:40` and `plugins/CLAUDE.md:1` say seven plugins. Eight ship. | Correct the count. | |
| C2 | Catalog | 1 | `toolkit-map.md:58-59` repeats the unslop row. | Remove the duplicate. | S |
| C2a | Catalog | 1 | `:413` calls handoff its own plugin. | Correct it. | |
| C2b | Catalog | 1 | `:213` promises two folders and lists one. | Correct it. | |
| C2c | Catalog | 1 | `:219` calls the shipped single-file tracker format "pending". | Correct it. | |

#### Folder instruction files

| Finding | Requirement | Kind | Evidence | Next step | Size |
| --- | --- | --- | --- | --- | --- |
| F1 | Five skip kinds | 2 | `project-sync/SKILL.md:576-579` lists four. `references/folder-claudemd.md:66-82` lists five. I checked both files myself. | Add the fifth kind to project sync. | S |
| F2 | README index rule | 1 | `tests/` has a `README.md` and a full `CLAUDE.md`. The document allows only a short pointer beside a README. | Change the wording to allow both when they do not repeat each other. | S |
| F3 | Root file is a map | 1 | The document lists four questions (lines 65-69). `thin-claudemd.md:5-11` lists five. | Add the quick-save question. | S |
| F4 | Setup writes folder files and Codex opens them | 3 (both hosts) | No recorded run. | Run setup on a throwaway project. Run one Codex session that edits under `plugins/`. | M |

#### Guided delivery

| Finding | Requirement | Kind | Evidence | Next step | Size |
| --- | --- | --- | --- | --- | --- |
| G1 | Readiness check, team sizing, critique rounds, both Check blocks | 3 (both hosts) | `solution-design/SKILL.md:106-304`. | Put one medium real item through the whole design process and record the results. | L |
| G1a | Same | 3 | No test or recorded run exists. | | |
| G1b | Same | 3 | `plugins/work-tracker/tests/delivery-scenarios.md:13` covers only issue #337 on Codex. | | |
| G2 | Helper agents | 3 (Codex) | `plugins/session-skills/README.md:99-106` says Codex does not load the six agent files and gives a fallback. No run exists. | Run one design helper on Codex through the fallback. | M |
| G3 | Retained build ideas | 4 | `requirements-helper/SKILL.md:51-58` says "Potential paths to explore", inside Notes. `guided-work-management.md:312` uses a different name and place. | Decision 5. | S |
| G4 | Approval date | 4 | The file shows approval on 2026-09-08. Text was added on three later dates. | Decision 6. | S |

#### Guided work management

| Finding | Requirement | Kind | Evidence | Next step | Size |
| --- | --- | --- | --- | --- | --- |
| W1 | R6 | 2 | `plugins/work-tracker/skills/work/scripts/lib/tracker.mjs:796-811` checks only that an approver name is present. The placeholder at `:516` is never checked. Verified on this commit. | Decision 2, then a small refusal plus tests. | S |
| W1a | R6 | 2 | Issue #337 "Proposed follow-up" has the full write-up. | | |
| W2 | R1, R5, R6 | 3 (Claude Code) | `delivery-scenarios.md:13-14,156` says the observations do not cover Claude. | Run the five scenarios in installed Claude Code. | M |
| W2a | R1, R5, R6 | 3 | Issue #337 task T5 tracks this. | | |
| W3 | R2, R3 | 3 (both hosts) | Issue #337 coverage table: no end-to-end check exists. | Write and run the two scenarios. | M |
| W4 | R1 re-offer when a goal grows | 2 | Rule text exists at `work-item-stages.md:24-25`. No scenario exists (`delivery-scenarios.md:156`). | Add the scenario and run it. | S |
| W5 | R4 external tracker | 3 (both hosts) | Only a read-only GitHub run exists (`delivery-scenarios.md:151`). | Pilot one real GitHub item with writes. | M |
| W6 | Document text | 1 | Lines 317-319 name `work-guide` as the home. It shipped in `agent-led-delivery.md`. | Four small edits. | S |
| W6a | Document text | 1 | Lines 265-267 omit the format marker line. | | |
| W6b | Document text | 1 | Line 15 has an old date. | | |
| W6c | Document text | 1 | Issue #337's R4 row still says `TASKS.yaml`. | | |
| W7 | R3 helper choice | 4 | Document lines 142-144 and 363-369. | Decision 3. | S |
| W8 | R5 sharing between computers | 4 | Document lines 324-326. | Decision 4. | S |

#### System Guide

| Finding | Requirement | Kind | Evidence | Next step | Size |
| --- | --- | --- | --- | --- | --- |
| S1 | 3, 4, 5, 14, 15, 17 | 3 (both hosts) | No `.system-guide.json` exists anywhere. | Turn it on in one project. Then run a fresh session on each host. | M |
| S1a | Same | 3 | No Guide hook is in `.claude/settings.json` or `.codex/hooks.json`. | | |
| S1b | Same | 3 | Issue #304's last line says the fresh-chat check is still the next action. | | |
| S2 | 8 | 2 | `plugins/system-guide/.../system-guide.mjs:694-701` stores path, kind, completeness, file count and hash. It stores no capture date. | Add the date per source. | S |
| S3 | Document text | 1 | Line 126 names `knowledge/glossary.md`. The real file is `knowledge/memory/memory-entries/terminology-glossary.md`. | Three small edits. | S |
| S3a | Document text | 1 | Line 88 says the find order still needs the Guide. It is already in `knowledge-manual.md:113-115`. | | |
| S3b | Document text | 1 | The roadmap names only #304. It does not name #369 or PR #371. | | |
| S4 | 15 | 3 | `project-sync/SKILL.md:208-245` has the read-only check from PR #371. It has never been run on a real project. | Covered by the sync check below. | S |

#### Work-item upkeep

| Finding | Requirement | Kind | Evidence | Next step | Size |
| --- | --- | --- | --- | --- | --- |
| U1 | GitHub mode | 3 (Claude Code) | `work-item-stages.md:218-226` is guidance only. | Record one real issue update from Claude Code. | S |
| U1a | GitHub mode | 3 | Issue #337 says live external writes are unproved. | | |
| U2 | Approval survives a later stage (issue #360, fix 6) | 2, low priority | The sentence ships only in `project-init/references/root-file-examples.md:77`. It is not in the rule that every project receives. | Add one sentence to the shipped rule. | S |
| U3 | Scope | 4 | The document never mentions `WORK-ITEM.md`, roadmap tasks or the delivery offer. The rule covers them at `:13-83`. | Decision 7. | S |

### Product decisions for Mike

1. **Where should the remaining whole-toolkit work be tracked?** The item that owned it is closed. I recommend one new item for "prove and accept the whole toolkit". It keeps your earlier closure and gives the leftover work one home.
2. **Should the tool refuse to mark requirements approved while the goal still says "Not agreed yet"?** I recommend yes. It is one exact check, and it stops an agent from recording an approval you never gave.
   - If you want to leave a goal open on purpose, the record should say so in words.
   - Older items get no warning and no conversion.
3. **Once you hand an item to agents, may the lead agent pick its own research and review helpers?** I recommend yes, within what you already approved. It must still bring you product choices, real cost trade-offs and anything that touches an approval.
4. **Do work records need to follow you between computers?** I recommend no. Use GitHub for anything shared. Syncing local files is a far bigger job than anything asked for here.
5. **What should the section for build ideas kept for later be called, and where does it go?** I recommend "Potential paths to explore", inside the bottom Notes. It is the only version the shipped instructions teach.
6. **Do you approve the guided delivery document as it reads today?** It was approved on 2026-09-08 and changed three times since. I recommend yes, with the approval date updated to the day you say so.
7. **Should the work-item upkeep document describe the single work-item file and the delivery offer?** I recommend one sentence pointing to guided work management. Two documents describing the same behavior will drift apart.
8. **When a work item closes, where do its design and its reasons live?** Today one instruction says delete the design and another says keep lasting decisions. I recommend keeping still-useful reasoning in one named, findable place and retiring only replaced plans. Agree the place before anything is deleted.
9. **Must agents ask before using any helper, in every project?** I recommend no. Keep bounded helpers allowed and honor any limit you set for a particular task.
10. **Who owns a large feature's plan?** I recommend the requirements document lists the order and coverage, and the tracker owns live status. That way there is only one editable plan.

Four more open boundaries in the parent document belong to the Knowledge team:
- searches for tiny requests
- save cards during draft refinement
- forced review moments
- the knowledge format transition

### What the sync team should confirm for the merged setup contracts

- **Versions in both plugin caches:**
  - project-init 0.77.1 or later
  - work-tracker 2.8.0
  - session-skills 1.13.0
  - system-guide 1.0.0
  - second-brain 4.12.2 or later
  - marketplace 0.124.3 or later
  - hooks-library 3.5.0 on Claude only
- **Cached text.** The cached machine-sync, project-sync and `folder-claudemd.md` files match main exactly. That includes:
  - the narrow machine-sync scope
  - retired knowledge wiring listed as retired
  - the corrected Codex wording
- **Retired files on the laptop.**
  - `~/.claude/rules/activate-project-knowledge.md` is detected.
  - The marked block in `~/.codex/AGENTS.md` is detected.
  - Removal is offered only with Mike's exact approval.
  - Nothing is deleted automatically.
- **This project.**
  - `AGENTS.md` is still one line.
  - No nested `AGENTS.md` exists.
  - The folder audit gives each folder one of the four states.
  - The audit reports `misc/` as not recognized and leaves it in place.
- **System Guide.**
  - Sync reports on, off or needs repair, with evidence.
  - If turned on at `knowledge/system`, the check reports each changed source.
  - The audit leaves sources, settings, guide content and the sync record byte-identical.
  - The Guide hook is registered once on Claude Code.
  - The fallback line is present for Codex.
- **Output style.**
  - The laptop's Concise override is handled.
  - The style check finds the style file afterwards.
  - The old machine-level "plain-language" reminder no longer fires. It fired once in this session.
- **Machine rules.** This session loaded `propose-the-best-solution.md`, `recommend-the-best-solution.md` and `ask-before-assuming.md` from `~/.claude/rules/`. The toolkit retired them on 2026-09-02. `quiet-while-working.md` there still points at the old style name.
- **Hooks.** Each startup and per-message hook is registered exactly once per host. Any new or changed Codex hook waits for Mike's normal trust review.
- **After sync.**
  - The 27 installed-copy checks still pass.
  - One fresh session on each host confirms the behavior before it is called active.

### What I checked, and what is unknown

**Checked.**
- I read every startup file, the continuation plan section, and issues #369, #337 and #360 in full.
- I read the full parent document, the manual review, the catalog and the saved research note.
- Five Opus readers each took one child document and opened the shipped files. I verified findings W1 and F1 in source myself.
- Checks run on commit `9c71a90`, which equals origin/main:
  - 451 links pass.
  - 242 shipped files are reachable.
  - 27 installed-copy checks pass.
  - 12 knowledge startup checks pass.
  - 10 toolkit startup tests pass.
  - Plugin validation passes.
  - 77 work-tracker tests pass, as the reader reported.
  - 32 System Guide checks pass, as the reader reported.
- The working tree stayed clean.

**Not checked.**
- I did not inspect the plugin caches under `~/.claude` or `~/.codex`. Which versions are installed on this laptop is unknown.
- I started no Codex session. I tested no clear, compact or Windows case. I ran no skill or helper agent as a behavior test.
- I did not open the diffs of pull requests #371, #359 or #362. I did not read issue #270 or pull request #374.
- I compared the parent's R1-R3, R7-R10, R12-R18, R20 and R22-R24 against the manual and the shipped instruction text only.
  - They read as consistent.
  - No host proof exists for any of them beyond what issue #337 records for Codex.
- No reader confirmed any "met" row by watching an agent. Each rests on shipped text or on tests.
- Whether any project other than this one has any of this installed is unknown.
- I did not check whether Mike's account has Claude Projects. The saved research is source reading, not a product test.

**End-of-turn knowledge check.** It remains unrecorded for this chat. My outcome is "no change". The permission mode refused the recording command, and I did not work around that refusal.

## Philosophy review of the next steps and decisions

The main orchestrator relayed Mike's 2026-09-21 statement that the toolkit is a set of checkpoints (hooks, instructions and handshakes) around the agent and does not build tools that replace the agent's own reasoning, and asked for the next steps and decisions to be reviewed against it.

These are the findings and decisions from my report that would add machinery where an instruction, a checkpoint or a handshake would do:

- **W1, and decision 2 (refuse approval while the goal says "Not agreed yet").** This is new code in the work tracker. The design principle does allow objective checks on exact file content, so it is not ruled out. The lighter option is to leave the code alone. Instead, strengthen the work skill's existing instruction: an agent may record an approver only after the owner actually approved, and it must replace the goal placeholder before finalizing. That rule is already written at the skill's finalize step, and the agent skipped it. I'm dropping my extra "record an intentional open goal" option; it adds more rules for no gain. Whether to add the code check or rely on the instruction is Mike's choice.
- **P11 (change the style check to skip built-in styles).** This edits hook code. The lighter option is a settings fix only: sync removes the laptop's Concise override, and the check then finds the Plain English file. Change the hook only if Mike deliberately keeps a built-in style.
- **S2 (add a capture date for each System Guide source).** This is a code and data change. The lighter option is to first check whether the Guide's existing refresh record already answers "when was this read". If it does, change the requirement's wording instead of the code.

Everything else is already instructions, documentation, settings or proof runs, so it fits the philosophy. That covers the host table, the doc corrections, the skip-kind sentence, the approval sentence, the R21 paragraph and the scenario runs. My other nine decisions add no machinery. Decision 4 recommends against building sync between computers.

Two things in the requirements themselves ask for machinery or a score, and I'd put both to Mike:

- **System Guide.** It builds maps of a project from its source code, using parsers for code and for Salesforce files and a drift check that compares file fingerprints. Mike approved building it on 2026-09-10. Even so, it is the kind of tool Mike described the toolkit as not building. I did not read those parsers myself; the reader reported them.
- **Guided delivery's readiness check.** It requires a 95 percent confidence number before design starts. The parent document's design principle says "no scoring system". The number is the agent's own judgement, not code, but it is still a score.

The local tracker's recovery journal and guarded edits are also code. They handle objective file state, not language, so I don't count them as a conflict.

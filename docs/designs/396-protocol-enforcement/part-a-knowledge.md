# Part A: Knowledge System protocols to force

Written 2026-09-22 by a read-only Opus helper for issue #396. Sources read in
full: the Knowledge System PRD (`knowledge/prds/toolkit-operating-system/knowledge-system.md`,
R1 to R31 and its closing sections), `knowledge/knowledge-manual.md`, the four
skills under `plugins/second-brain/skills/` with their references, the knowledge
hooks in `.claude/hooks/`, and `.claude/settings.json`. Engine facts come from
the T5 comment on #396 and the 2.1.280 declaration file
(`function-hooks/types-run/.claude/types/claude-code.d.ts`).

"Confirmed" means read in a file or the declarations. "Proposed" means a
recommendation for Mike. "Unknown" means nobody has tested it.

## Summary

- Of the 31 requirements, 7 protocols are worth forcing. Everything else is
  judgment: what counts as memory, where it goes, what to look up, how to word
  it. The PRD itself says to start small and add checks only after a real
  failure (R29, "Begin with a small set of safeguards").
- The first three to build are K1 (startup reads), K3 (save card only after
  `knowledge-save` is open) and K4 (knowledge files are written only after
  `knowledge-save` is open). K3 and K4 would have caught the DragonFly card.
- The end-of-turn save review cannot be forced directly. A review that finds
  nothing leaves no trace. Only its results can be checked (K3, K4, K6). The
  Stop hook's recorded outcome (`knowledge-completion.mjs`) becomes the backup.
- The always-loaded manual holds several short copies of `knowledge-save`
  steps. Section 7's one-sentence card description is the one DragonFly used.
- Three PRD passages conflict with forced checks: the handshake wording in the
  parent PRD, R3's "a program that reads the agent's replies", and R9's action
  hold (D4). Proposed wording is in section 4.

## 1. Protocols to force

Every check is one of two kinds:

- **Engine fact**: something Claude Code reports. A skill loaded (`skill.prompt`
  gives the skill name). A tool was called with a file path (`tool.call`). A
  Read covered lines X to Y of a file of Z lines (the Read result carries
  `startLine`, `numLines`, `totalLines`; confirmed in the declarations).
- **Model judgment**: a small model answers one question about the reply,
  comparing it with the owning file's current text, read at run time.

On failure, the main agent always redoes the step itself. The hook never
rewrites a reply.

| # | Protocol | Trigger | Owner of the how-to | Check | Event | On failure |
| --- | --- | --- | --- | --- | --- | --- |
| K1 | Startup reads: `SOUL.md`, `knowledge/project.md`, `knowledge/knowledge-manual.md` read completely | New session, `/clear`, compaction | Manual section 2; PRD R2 | Engine fact: Read results cover every line of each file since the last reset. Reset on `session.compact` and on clear | `tool.call` (Read) records coverage. `turn.step` (main loop, turn ending) checks. `tool.call` on Edit, Write, NotebookEdit and Agent checks | Hold the reply or refuse the tool call. Insert a Read call for the first unread part, with a note naming the file. The agent then continues |
| K2 | Current work and pending inbox read before acting | Same as K1 | Manual section 2; PRD R3, R13, R28 | Engine fact: Read of `knowledge/memory/current.md` and `knowledge/memory-inbox.md` since the last reset | Same as K1 | Same as K1 |
| K3 | A memory or PRD save card is shown only after `knowledge-save` and its card reference are open, in the reference's layout, and kept in the inbox | A reply that asks the owner to approve saving, changing or removing project knowledge | `knowledge-save/SKILL.md` and `references/selection-and-cards.md` | 1. Model judgment: "Does this reply ask the owner to approve a change to project knowledge?" 2. Engine facts this turn: `knowledge-save` loaded, `selection-and-cards.md` read, `memory-inbox.md` written (or the judge finds the same card already there). 3. Model judgment: does the card follow the layout in the current `selection-and-cards.md`? | `turn.step` (main loop, turn ending) | Drop the card before display. Insert the missing Skill or Read call with a note: what failed and "write the card again". Tested in T5 run I |
| K4 | Knowledge files change only while `knowledge-save` is open | Write, Edit, NotebookEdit, or a Bash command naming a path in `knowledge/memory/memory-entries/`, `knowledge/prds/`, `knowledge/memory-inbox.md`, `knowledge/memory-self-improvement.md`, `knowledge/memory/current.md` | `knowledge-save/SKILL.md`, `references/execution-and-recovery.md` | Engine fact: `knowledge-save` loaded (Skill tool or a Read of its `SKILL.md`) since the last reset | `tool.call` with `.catch` that refuses | Refuse the call: "Open knowledge-save before changing <path>." Tested in T5 run A |
| K5 | Generated indexes are never edited by hand | Write or Edit on `knowledge/memory/memory-index.md`, `knowledge/prds/prd-index.md`, `ai-external-knowledge/README.md` | PRD R21; `.claude/tools/build-knowledge-index.mjs` | Engine fact: the path alone | `tool.call` | Refuse: "This file is generated. Run the index builder." |
| K6 | After a knowledge change, rebuild the indexes and run the checker before the loop ends | A loop (main agent or helper) wrote any K4 path | `knowledge-save` step 5; `execution-and-recovery.md` | Engine fact: Bash calls to `build-knowledge-index.mjs` and `check-knowledge.mjs` after the last K4 write, in the same loop | `turn.step` (turn ending, any loop, using `agentId`) | Hold the reply. Insert a note: "Knowledge files changed after the last check. Rebuild and run the checker, then report the result." |
| K7 | The save moment before three actions: open a pull request, finish a work item, merge | Bash `gh pr create`, `gh issue close`, `gh pr merge`, `work finish`; GitHub tools `create_pull_request`, `merge_pull_request`, `issue_write` with state closed | `knowledge-save` (review); PRD R9 | Engine fact: `knowledge-save` loaded in this turn | `tool.call` | Refuse: "Opening a pull request is a save moment. Open knowledge-save, review, then run the command again." |

Priority, proposed: K3 and K4 first (the DragonFly failure), then K1 and K2,
then K5, K7 and K6.

### Notes on the table

- **Why K3 checks "this turn" and K4 "since the last reset".** A card is shown
  rarely, and its layout is what went wrong, so the reference is opened fresh.
  File writes happen often; K4 only needs the skill's text still in context.
  The Claude Code skills page says invoked skills are re-attached after
  compaction within a 25,000-token budget (`ai-external-knowledge/claude-code/skills.md`,
  line 521). Reference files read with Read are not. So K4 resets on
  compaction to be safe. Mike may prefer "this turn" for both.
- **K3 needs one model question on every finished main reply.** The output
  style check (part C) also asks a model about every reply. Part D should
  combine them into one request.
- **The T5 prototype spotted a card with a regular expression**
  (`/save this understanding|memory save|proposed memory/i`). That is keyword
  matching, which the build philosophy rules out. K3 uses `$.model.classify`
  instead.
- **K7 uses command matching, not language matching.** The command text of a
  tool call is an engine fact. Reuse the recognizer in
  `.claude/hooks/command-parsing.mjs`. Two gaps in today's command hooks are
  closed: GitHub tool calls, and the local tracker's `work finish`
  (`plugins/work-tracker`, "Finish honestly"). Today, a DragonFly work item that
  finishes through `work finish` is never held (`CLOSES_WORK_ITEM` in
  `command-parsing.mjs` lists only `gh issue close` and `gh pr merge`).
- **K4 in helpers.** The approved-save executor is a helper
  (`references/executor.md`). `tool.call` carries the helper's `agentId`;
  `skill.prompt` does not (its input is only `skill` and `text`). So in a helper
  the fact must be a Read of `knowledge-save/SKILL.md` in that loop. Unknown
  whether a helper's Skill tool call can be told apart.
- **K4 Bash coverage is partial.** A command that builds a path indirectly
  passes. T5 run A found the same.
- **Things K1 to K7 do not prove.** That the agent understood the skill, chose
  the right memory, or reviewed anything at turn end. PRD R3 requires this limit
  to be named (section 4, change 3).

### The protocol lines as data

Proposed shape, one line per protocol, so a change is an edit to a line:

```text
K3 | when: reply asks owner to approve a knowledge change (model)
   | needs this turn: skill knowledge-save; read references/selection-and-cards.md;
   |   wrote knowledge/memory-inbox.md or card already there (model)
   | judge against: references/selection-and-cards.md
   | on fail: drop reply; call the first missing step
K4 | when: write to knowledge/memory/memory-entries/**, knowledge/prds/**, ...
   | needs since reset: skill knowledge-save
   | on fail: refuse the call
```

Part D owns the real format.

## 2. Requirements left to judgment

| Requirement | Decision | Reason |
| --- | --- | --- |
| R1 plain parts, repair | Judgment | Repair choices depend on meaning. A TypeScript hook module is still a hook, so R1's "rules, hooks, skills, Markdown files, and Git" still holds |
| R2 one startup confirmation | Not forced | K1 checks the reads directly. The confirmation is then courtesy, not proof |
| R3 answer from knowledge, cite source | Judgment | Deciding relevance is the agent's reasoning (R29). Citation format could join the reply check later if a failure is seen |
| R4, R13 current work kept up to date | Judgment, plus K2 and K4 | When to update is judgment. The file is covered by K4 and the checker's 5,000-character limit |
| R5, R19 check memory first, find order | Judgment | R29 forbids scoring the search. Forcing `knowledge-find` before every lookup would cost more than it prevents |
| R6 cite the source | Judgment for now | A format rule, not a process step. Candidate for the reply check |
| R7 glossary | Judgment | |
| R8 outside documentation | Judgment | |
| R9 end-of-turn quiet review | Not forceable | Nothing observable when the review finds nothing. Its results are checked by K3, K4, K6 |
| R9 "remember this" starts the save flow | Covered by K3 and K4 | Any card or write it produces needs the skill |
| R10 approval before a write | Judgment, see note | Whether the owner approved is meaning. The skill's rule "persist authority in the inbox before mutation" could be forced later (inbox written before a destination write). Mike should decide whether that step is worth its cost |
| R11, R12 what counts | Judgment | The core reasoning the philosophy protects |
| R14, R21 file shape, fields, sizes | Checker, via K6 | The checker already exists |
| R15 words | Reply check (part C) for cards; judgment for saved files | |
| R16 PRD upkeep after shipping | Covered by K7 | Merge and finish are the moments |
| R17, R18, R22, R23, R24, R31 | Judgment | |
| R20 card layout | K3 | |
| R25 Codex | Instructions only | Brief decision 10. The setup report must say Codex has no forced checks |
| R26 docs first | Build-time rule | Not a session protocol |
| R27 setup | Not forced | Setup report should name whether function hooks are active |
| R28 inbox keeps the exact card | K3 condition 2 | |
| R28 publication verified before "saved" | Candidate K8 | Needs a model to spot a "saved" claim plus facts (a push ran). Add if a false "saved" claim is seen |

## 3. Shortcuts to remove

Always-loaded text that copies a how-to owned by a skill. Each copy lets the
agent act without opening the skill.

1. **`knowledge/knowledge-manual.md` section 7, second paragraph.** "Each
   numbered card states the topic, **Change**, **Summary** ... and **Your
   decision**." DragonFly's first card matched this sentence exactly (T3).
   Replace with: "When new approval is needed, open `knowledge-save` before
   writing any proposal."
2. **Manual section 8.** Restates `knowledge-save` step by step: search the
   topic, reread, the inbox fields, helper hand-off, read back, rebuild, run
   the checker, publish, verify, failure reporting. Keep two lines of policy:
   "`knowledge-save` owns every save, retry and recovery; open it first. A save
   is complete only when it is published and verified."
3. **Manual section 9, last three paragraphs.** Template and size rules copied
   from `operations.md` and the checker. Keep the writing standard (policy).
   Point to `knowledge-save` for templates.
4. **Manual section 6, second paragraph.** "For each user message, acknowledge
   the delivered reminder's request..." Mike replaced this with a quiet
   reminder on 2026-09-21 (D5, PRD R9). The manual was never updated. It also
   conflicts with the style ("start with the answer").
5. **Manual section 4, second paragraph.** Copies the find order tiers from
   `knowledge-find`. Keep "Use `knowledge-find` for lookups that could change
   the answer." The citation rule (fourth paragraph) appears in both the
   manual and `knowledge-find`; keep one line in the manual, because it
   applies to every answer and the skill is not opened for every answer.
6. **`.claude/hooks/memory-reminder.mjs` `REMINDER`, about 272 words every
   message.** Lines 3 to 5 copy the memory criteria from manual section 5 and
   `selection-and-cards.md`. The last line still says "Explicitly acknowledge intent
   to evaluate" (contradicts D5). The "Knowledge turn review ... record one of
   no-change ..." line is only needed when function hooks are off. Proposed
   text, about 45 words: Mike's owner direction sentence (R9 requires it), "Open
   `knowledge-save` before any proposal or save", and the two manual paths.
   This needs the PRD change in section 4, change 4.
7. **`.claude/hooks/save-reminder.mjs` `buildMessage`.** "knowledge/knowledge-manual.md
   shows how to display the proposal." This sends the agent to the manual's
   shortcut instead of the skill. Change to "open `knowledge-save`".
   `buildDirectCommitMessage` copies steps from `knowledge-direct-commit.md`
   and names that file, which DragonFly does not have (T3). Name the rule by
   purpose ("the project's documentation direct-commit rule").
8. **`.claude/hooks/knowledge-session-start.mjs` `STARTUP_FILES`.** Asks for a
   complete read of `memory-index.md` and `prd-index.md` at every start (2,570
   words for DragonFly's memory index). PRD R2 names three files; R3 adds
   current work and the inbox; R2 says the whole knowledge base is not loaded
   at start. The AGENTS.md template (`thin-agents-md.md`, "The project
   knowledge startup route") says to "use" the indexes, not read them. Drop
   the two indexes from the read list; `knowledge-find` opens them when needed.
   This repo's own `AGENTS.md` "Project knowledge" section has the same six-file
   list.
9. **Two startup acknowledgments.** `toolkit-session-start.mjs` asks the agent
   to acknowledge the Toolkit manual; `knowledge-session-start.mjs` asks for a
   separate knowledge confirmation. PRD R2 wants one confirmation for all
   startup reads. Part B owns the Toolkit side.
10. **Report-every-save lines that conflict with the style.** Manual section 2
    ("Confirm in one short line when the update is saved"), `knowledge-save`
    SKILL.md ("Report completed memory/current-work saves briefly"). These
    follow PRD R3 and R4, so they change only after section 4, change 5.

## 4. PRD changes to propose to Mike

These are proposals, not decisions.

1. **Parent PRD, "Design principle: guide the agent through handshakes"**
   (`toolkit-operating-system.md`). Current: "A hook can request a step and
   check the agent's acknowledgment; it does not judge the substance of that
   work." Also: "Do not ... infer from its replies whether it understood or
   performed the work correctly." Proposed: "A hook checks that a required step
   actually happened, using facts Claude Code reports: a skill opened, a file
   read or written, a command run. Where a step can only be recognized by its
   meaning, such as whether a reply contains a save card, a model answers that
   one question against the owning skill's current text. When a check fails,
   the main agent redoes the step. Hooks never judge the substance of the
   agent's reasoning: what is worth saving, where it belongs, or whether an
   answer is right. Hooks never rewrite the agent's reply." Mike's quoted words
   in "The owner's build philosophy" stay unchanged.
2. **This PRD, "The handshake principle"** (closing section). Current:
   "checkpoints request the relevant step and check its acknowledgment."
   Proposed: "checkpoints check that the relevant step happened." Also update
   "Preferred solution philosophy": it says Mike chose command hooks on
   2026-09-18 and function hooks "remain an optional later experiment". Add
   that on 2026-09-22 (#396) Mike chose function hooks for forced checks, with
   command hooks kept as the backup when the setting is off. Same for the
   matching line in Notes ("On 2026-09-18, Mike approved ordinary command
   hooks..."). The handbook table's "Stateful hook or mod: lightweight
   supervisor" row already describes the new approach.
3. **R3, "How reliability is demonstrated."** Current: "A custom blocker, a
   program that reads the agent's replies ... is not required just because it
   could be built." Proposed addition: "Forced checks cover steps that must
   happen every time: startup reads, opening `knowledge-save` before a card or
   a knowledge write, rebuilding indexes, and the save moment before a pull
   request, a finished work item, or a merge. A reply check may use a model to
   recognize a save card. The quiet end-of-turn review cannot be checked when
   it finds nothing; only its results are checked." This is the limit R3
   requires the design to name.
4. **R9, the per-message reminder bullets, and R29's matching bullet.**
   Current: the reminder includes "compact positive and negative criteria for
   both working and lasting memory". Proposed: the reminder carries Mike's
   owner direction sentence, "open `knowledge-save` before any proposal or
   save", and links to the two manuals. The criteria live only in the manual
   (section 5) and `selection-and-cards.md`. Mike approved the criteria on
   2026-09-17, so this needs his decision.
5. **R3 third bullet and R4 last bullet.** Current: after updating current work,
   "the agent confirms in one short line that the update is saved"; R4: "tells
   the owner in one line that it did." Proposed: "Routine successful updates
   stay quiet. The agent tells the owner only when an update could not be
   saved or shared." This removes a conflict with the style's "leave out how
   you did the work" (T3, #396 findings).
6. **R9, the action hold (D4).** Current: "After that review the agent runs
   the same command again, and the plain retry is allowed. There is no
   single-use permit, no code the agent has to carry, and no command it must
   run to earn the retry. The accepted cost is that an agent could retry
   without really reviewing." Proposed: "The action is refused until
   `knowledge-save` has been opened in the same turn. Then it proceeds. Opening
   the skill still does not prove the review happened." Also add `work finish`
   and the GitHub tool calls to the list of actions. When function hooks are
   off, D4's hold-once behavior remains.
7. **R2, completion check.** No change needed. Note that the check is now
   possible: the Read result reports which lines were returned out of the
   file's total.
8. **R25 Codex.** Add: "Forced checks run only in Claude Code with function
   hooks on. Codex receives the same instructions and today's command hooks.
   The setup report says so."

## 5. Backup mapping: command hooks

Current wiring is in `.claude/settings.json`. "Off" means
`CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` is not `1`.

| Command hook (event) | What it does now | With function hooks on | With function hooks off (backup) |
| --- | --- | --- | --- |
| `knowledge-session-start.mjs` (SessionStart: startup, resume, clear, compact, fork) | Prints the ordered read list | Keep. It delivers the instruction; K1 and K2 check it happened. The function `session.start` event fires once per plugin load and cannot add text for the model, so it cannot replace this | Keep. Only protection for the reads |
| `memory-reminder.mjs` (UserPromptSubmit) | About 272 words each message; starts the turn-review record | Keep the short reminder (section 3, item 6). Skip the "Knowledge turn review" line | Keep, shortened. Keep the turn-review line |
| `knowledge-completion.mjs` (Stop) | Blocks once until the agent records an outcome | Stand down. K3, K4, K6 check results instead | Keep. Optional fix from T2: refuse the `pending-approval` and `saved` outcomes when no `knowledge-save` load was recorded (needs a PostToolUse hook on the Skill tool) |
| `save-reminder.mjs` (PreToolUse Bash) | Holds `gh pr create` once; special message for a knowledge-only branch | K7 replaces the hold. Keep the knowledge-only branch message: it runs `git diff`, and it is unknown whether a function hook can run git | Keep |
| `work-item-close.mjs` (PreToolUse Bash) | Holds `gh issue close` and `gh pr merge` once | K7 replaces it | Keep. Add `work finish` |
| `command-parsing.mjs`, `knowledge-manual.mjs` | Shared code | K7 reuses the command recognizer if the module can import it (unknown) | Unchanged |
| `spec-check-reminder.mjs`, `toolkit-session-start.mjs`, `style-handshake.mjs` | Not knowledge | Parts B and C | Parts B and C |

**How a command hook knows to stand down (unknown, for part D).** Checking the
environment variable alone is risky: if the setting is on but the module
failed to load, both layers would be off. Options: the function module wraps
`classic.Stop` and skips only `knowledge-completion` (unknown whether the API
allows skipping one handler), or the module writes a per-session file at
`turn.start` and the command hook stands down only when that file exists.

## 6. Confirmed, proposed, unknown

Confirmed:
- The manual's section 7 card sentence, the reminder's criteria copy, and the
  reminder's acknowledgment request, in the files named above.
- The last line of `REMINDER` in `memory-reminder.mjs` and manual section 6 still ask for the
  per-message acknowledgment that D5 removed.
- The action hold does not recognize `work finish` or GitHub tool calls.
- The Read result gives `startLine`, `numLines`, `totalLines`;
  `skill.prompt` gives the skill name but no `agentId`; `prompt.submit` can add
  context; `session.start` cannot.
- Claude Code re-attaches invoked skills after compaction within a budget.

Proposed: K1 to K7, the shortcut removals, the eight PRD changes, and the
backup mapping.

Unknown:
- Whether a helper's skill load can be told apart from the main agent's.
- Whether a function hook can run git (affects K7's knowledge-only message).
- How a command hook reliably learns the function module is active.
- The false-failure rate and cost of the K3 model questions on real replies.
- All behavior in the interactive terminal, the desktop app, and Windows.

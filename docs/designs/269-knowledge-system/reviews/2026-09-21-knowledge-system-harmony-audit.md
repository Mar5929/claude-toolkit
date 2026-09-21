# Knowledge System requirements, philosophy and harmony audit, 2026-09-21

Date: 2026-09-21.
Produced by: three read-only Opus auditors and one helper, started from the main orchestrator chat at the owner Mike's request of 2026-09-21.
Commit on main at the time: `ba043c4`.
Status: review evidence. It approves nothing. Every question in it is open until Mike answers it.
Build philosophy applied: Mike's 2026-09-21 wording, that the toolkit is only a harness around the agent, a series of checkpoints made of hooks, instructions and handshake agreements the agent acknowledges and follows; it builds no search tools and no code that detects patterns in language; builders must not over-engineer.

## Open questions for Mike

Every question stands alone. Each has the background, the question, the recommended answer and the main reason. None of them is approved until Mike answers it.

### Questions that are holding work right now

**1. The output style hook: the hidden "file was read" record was removed.**
The hook makes the agent re-read your writing style on every message. Until now it also kept a hidden note on disk saying "the file was read this turn". The only thing that ever used that note was the sentence "I read the output style and will follow it.", which you asked to remove. The builder removed the note with it, and an independent checker agreed. You still see a small grey "Read" line on each message, so you can see the read happened.
Question: is it fine that the hidden note is gone completely?
Recommended: yes. Nothing used it, and removing it took out about 55 lines of bookkeeping.

**2. The output style hook: what it does when it cannot find a style file.**
Some projects use one of the Claude app's own built-in styles, which have no file. Today the hook then complains on every message that it cannot find the file. The new build keeps a fixed list of the app's five built-in style names and stays quiet for those. That list goes out of date the day Anthropic adds a style, and the complaint comes back.
Question: should the hook simply stay quiet whenever it finds no style file, instead of keeping a list?
Recommended: yes. It is less code and covers more cases. What you give up: if someone mistypes the name of a custom style, the hook will not tell them.

**3. The new team question on tools that cannot reach other chats.**
You asked for a new question when work starts: one team inside this chat, or a Main Orchestrator chat that runs other chats. You also decided that picking a team arrangement is your permission for the agent to use helper agents on that piece of work. In the terminal and in Codex the agent cannot reach other chats, so as built it asks nothing there, which means you can never give helper permission there and the agent does all the work itself.
Question: on those tools, should the agent still ask one simple question, "Shall I run one team of helpers inside this chat?", so a yes gives the same permission?
Recommended: yes. Otherwise the feature only works in the desktop app.

**4. The last set of Knowledge System fixes: a one-use ticket, or a simple hold?**
Before an agent opens a pull request or closes a work item, the toolkit stops it once and tells it to check whether anything needs saving. Today that is a simple hold: the agent reads the reminder and tries again. The waiting set of fixes changes it to a one-use ticket: the agent must run a command that quotes a secret code tied to that exact action, and only then is that one retry allowed. One independent reviewer says keep the ticket, because without it the agent's routine end-of-turn check releases the hold without any real review for that action. A second reviewer says the ticket is a lock, not a handshake, and goes against your philosophy of instructions the agent acknowledges and follows. The ticket also needs hidden state and a file lock, and that lock caused the one real bug found in review today. Both reviewers say this is your call. I am holding this set of fixes out of the official toolkit until you answer.
Question: keep the one-use ticket, or go back to a simple hold whose message names the exact action to review?
Recommended: the simple hold. It matches your philosophy, and the hooks are built to let the action through on any unexpected error anyway, so the ticket was never a guarantee. What you give up: an agent could retry without really reviewing. It also means this set of fixes gets reworked before it goes in, instead of going in today.

### Questions that shape how the whole system feels to use

**5. How much the agent has to acknowledge, at the start and on every message.**
Today a new session asks the agent for three separate acknowledgments: the toolkit manual, the knowledge manual and the writing style. Then every message you send carries three hidden reminders. One repeats the session-start reminder. One is the "check whether anything is worth saving" reminder, which asks the agent to say out loud that it will. One is the style re-read. At the end of every turn the agent is also held until it runs a small bookkeeping command. Your own requirement text asks for the spoken acknowledgment on every message.
Question: should this become one acknowledgment at session start, one quiet reminder per message with nothing said out loud, and no repeat of the session-start reminder? The style re-read you asked to keep stays.
Recommended: yes. A line you see on every message stops registering, and the documents already say an acknowledgment proves only that the reminder arrived.

**6. The program that searches your old conversations.**
The Knowledge System ships a 658-line program that searches your saved Claude conversations and ranks the results by how many of your words match. Your own requirements say "Do not build a search engine", and an agent can already search those files with its ordinary tools.
Question: delete the program and replace it with a few lines telling the agent where the conversation files are?
Recommended: yes. It is the clearest case of the thing you said the toolkit does not build.

**7. The program that reports what happened to an interrupted save.**
When a save to GitHub is interrupted, a 112-line program reports what did and did not arrive. The agent can get the same facts by running five ordinary Git commands and reading the results.
Question: replace the program with those commands written into the instructions?
Recommended: yes, at low priority. It reports real facts, not guesses, so it is a borderline case and can wait.

**8. The short "what is going on" file is full.**
Every new session reads one short file first, to learn what is being worked on. It has a 5,000-character limit and is at 4,996. It repeats each work item's status, next step and blocker, which the GitHub work item also holds, and two of its entries are days out of date. Handoff notes share the same file.
Question: should that file keep only each item's goal and a link, with status, next step, blocker and handoff detail living only in the work item?
Recommended: yes. One place to update means one place to go out of date, and the size limit stops being a problem.

**9. Merging without you, written into the rules.**
Today you told me agents should review and merge finished work without you. The rule file that every project receives still says a merge always needs your approval.
Question: should that rule say that a standing instruction from you, given for a project, counts as your approval, while keeping the safety check that a merge can never overwrite unsaved work?
Recommended: yes. Otherwise every new session reads a rule that contradicts you and stops to ask.

**10. Claude's own built-in memory versus your project files.**
Your system keeps everything in plain files you can open, correct and share. The Claude app also has its own built-in memory that does not live in the project. Nothing says which one wins when they disagree.
Question: should the agent always follow the project files and tell you when the built-in memory disagrees?
Recommended: yes. You can see and fix a file; you cannot do that with the hidden memory.

**11. Approving the Knowledge System requirements document.**
You have approved many individual parts of it, and the six-part picture walkthrough. The document as a whole still says "proposed", it is about 2,300 lines, and builders are working from it.
Question: do you want to approve it section by section as I bring each one to you in plain language, instead of reading the whole thing?
Recommended: yes, section by section. The parts you already approved do not need reading again.

**12. The System Guide uses code-reading tools.**
The optional System Guide builds maps of a project by running code-reading programs over the source files. You approved building it on 2026-09-10. It is the closest thing in the toolkit to "a tool", and no project has ever turned it on.
Question: leave it as it is until it has been tried on one real project, and decide then whether an agent simply reading the code would do the same job?
Recommended: yes, wait. There is no evidence yet either way, and nothing is installed that depends on it.

**13. The "95 percent confident" number before design starts.**
Guided delivery tells the agent it must be 95 percent confident in the requirements before it starts a design. The Toolkit OS requirements say "no scoring system". The number is the agent's own judgment, but it is still a score.
Question: replace the number with a plain statement, where the agent says it is ready and lists whatever is still unclear?
Recommended: yes. It keeps the checkpoint and drops the score.

### Smaller decisions from the Toolkit OS gap check

**14. Where the remaining "prove the whole toolkit works" effort is tracked.** The work item that owned it is closed. Question: create one new work item for proving and accepting the whole toolkit? Recommended: yes, so the leftover work has one home.

**15. Marking requirements approved while the goal still says "Not agreed yet".** The work tracking tool lets an agent do this today. Question: fix it by strengthening the instruction the agent skipped, with no new code? Recommended: yes, instruction only, in line with your philosophy.

**16. Small helpers outside agent-led delivery.** For ordinary requests where no delivery offer is made, may an agent use a small, bounded helper (for example to run a search) without asking you? Recommended: yes, and it honors any limit you set for a task.

**17. Work records following you between computers.** Question: is it fine that local work records do not sync between computers, and GitHub is used for anything shared? Recommended: yes. Syncing local files is a far bigger job than anything asked for.

**18. The name of the section for build ideas kept for later.** Question: call it "Potential paths to explore", inside the Notes at the bottom of a document? Recommended: yes. It is the only version the shipped instructions already teach.

**19. The guided delivery requirements document changed after you approved it.** You approved it on 2026-09-08 and text was added on three later dates. Question: shall I bring you those three additions in plain language so you can re-approve it as it reads today? Recommended: yes.

**20. The work-item upkeep document does not mention the newer single work-item file or the delivery offer.** Question: add one sentence pointing to the guided work management document, instead of describing the same behavior twice? Recommended: yes. Two descriptions drift apart.

**21. Where a design and its reasons live after a work item closes.** One instruction says delete the design; another says keep lasting decisions. Question: keep still-useful reasoning in one named place, retire only replaced plans, and agree that place before anything is deleted? Recommended: yes.

**22. Who owns the plan for a large feature.** Question: the requirements document lists the order and coverage, and the work item owns live status? Recommended: yes, so there is only one plan to edit.

### Corrections that need no decision

These record decisions you already made or fix plain errors. Opus helpers will make them through the normal reviewed route:

- Three spots in the approved picture walkthrough still show the older working-memory layout and an older save-card wording that your later decisions replaced.
- The Toolkit OS requirements document describes three Knowledge System requirements wrongly, and several of its links and status words are out of date.
- Two documents give different folder names for the System Guide; both will say "the configured location".
- The required startup reading list is written in three places that differ; one place will own it.
- The project's root instruction file ends one sentence mid-word.
- The toolkit catalog does not list the System Guide plugin and says seven plugins where eight ship.
- The plan for the Knowledge System lists two requirements under a package that its own table assigns elsewhere.
- Four documents still say helper choice is open; they will record your 2026-09-21 decision.

## Audit 1: requirements completeness and latest decisions

### (a) Findings

| id | kind | evidence (path:line) | smallest fix |
|---|---|---|---|
| F1 | conflict | The approved walkthrough still shows working memory titled `# Current work` with a field `Where the work stands` (`knowledge/prds/toolkit-operating-system/knowledge-system-walkthrough.html:517,533`) and no "Session handoffs" section. The PRD requires the exact title `# Current working memory` with separate **Current status** and **Recent progress**, plus Session handoffs (`knowledge-system.md:906-914,879-902`). The PRD says the walkthrough wins on conflict (`:140`), so the two fight. | Update the three walkthrough spots to the later decisions Mike made on 2026-09-16 and 2026-09-17. |
| F2 | conflict | The walkthrough's pending-inbox example card uses a **New wording:** block (`walkthrough.html:576`). Requirement 20 forbids a word-for-word preview and requires **Summary** (`knowledge-system.md:1639-1640,1653`). Flagged as open on 2026-09-15 in issue #269; never fixed. | Change that one block to **Summary**. |
| F3 | missing requirement | Requirement 10 and 14 tell the agent to record the automatic-save permission "once in the project permission settings" (`:771,:1067`), but no requirement, no folder layout (`:147-176`) and no routing table (`:1488-1510`) says where that is. Same undefined phrase in the shipped manual (`knowledge/knowledge-manual.md:216`). | Name the actual file in requirement 18's table. |
| F4 | missing requirement | Requirement 1 says knowledge lives only in plain repository files (`:467`), but nothing says what happens when Claude Code's own built-in memory holds competing information. The Notes list it as open (`:2244`); the independent review calls it "a genuine owner decision" (`docs/designs/269-knowledge-system/reviews/2026-09-20-independent-requirements-review.md:11`). | Add one sentence to requirement 1 after Mike decides (Q1 below). |
| F5 | stale text | Requirement 14 says "The solution design will specify the exact auto-saved field" (`:1068`). It is already built and enforced as `auto_saved: true` (`plugins/second-brain/tools/check-knowledge.mjs:121-126`). | Replace the sentence with the field name. |
| F6 | conflict | The parent PRD describes three Knowledge requirements wrongly: that R5/R19 force a search for every request (`toolkit-operating-system.md:706`: R5 already allows no lookup, `knowledge-system.md:602`); that R9/R10 need a card for every PRD save (`:707`: R10 already grants drafting permission, `:759`); that R16 requires a roadmap in the PRD (`:711`: R16 forbids one, `:1281`). | Delete those three rows as resolved. |
| F7 | conflict | The design proposes reminder wording that changes Mike's own words (`docs/designs/269-knowledge-system.md:433`); the PRD quotes them verbatim (`:685`) and the shipped hook matches the PRD (`plugins/second-brain/hooks/memory-reminder.mjs:16`). | Mark the design text superseded. |
| F8 | approval gap | Nothing records Mike approving the whole PRD. Its own fields show `status: proposed` with no approval fields (`:5`, and `:1353` requires them once approved). The design has no accepted step at all (`docs/designs/269-knowledge-system/design-walkthrough.md:33`). Individually recorded approvals: requirement 18 on 2026-09-16 (`:1482`); requirement 13 on 2026-09-16 (`:975`); requirement 10's approval-off setting on 2026-09-15 (`:770`); requirement 14 topics, requirement 15 wording, helper saves, shared commits, auto-save metadata on 2026-09-18/19 (`:2277-2325`); the six-part walkthrough on 2026-09-15. Not approved: the PRD as a whole, the design, handoff retention and size, native memory, rollout targets. | Ask Mike for the whole-PRD decision (Q3). |
| F9 | unclear for the user | Requirement 9 asks the agent to "explicitly acknowledge" on every single message (`:687`, restated `:534`, and shipped at `memory-reminder.mjs:23`), while requirement 2 says normal turns carry no repeated confirmation (`:490`) and requirement 9 says routine reviews stay quiet (`:692`). Nothing says the acknowledgment is invisible. Mike has already opened a chat asking to silence the identical style handshake line (issue #269 body). | Say in requirement 9 whether Mike sees that line. |
| F10 | unclear for the user | Requirement 13 leaves handoff retention open inside the requirement itself (`:900`), so nothing says what happens when a handoff will not fit the 5,000-character limit (`:1719`). Today's file is at 4,996 of 5,000. | Settle Q2 below. |
| F11 | builder mismatch | The plan's E1-P5 heading claims requirements 27 and 28 (`implementation-plan.md:821`), but its own traceability rows give those to other packages (`:935-936`). | Fix the heading. |
| F12 | stale text | Requirement 9 ends a sentence with three exclamation marks (`:693`) in a document that requires plain wording (`:1179`). Flagged 2026-09-15, still there. | Delete them. |

Builders are on the latest. #374's requirement text has not moved since it forked; #376 and #378 match their issues except for the two items already with their builders. No other drift found.

### (b) Questions for Mike

**1. Claude Code has its own memory feature, separate from the project's files.**
Your system keeps everything in plain files you can open and edit. Claude Code also has a built-in memory of its own that you cannot see in the repository. Today nothing says which one wins if they disagree.
**Question:** if the built-in memory says one thing and your project files say another, should the agent always follow the project files and tell you about the disagreement?
**Recommended: yes.** One reason: you can open, correct and share a file; you cannot do any of that with the hidden one.

**2. Handoff notes have to fit inside one small file.**
When you stop work, the agent writes a note so the next session can continue. All those notes share one file with a 5,000-character limit, and it is currently at 4,996. Nothing says what to do when a new note will not fit.
**Question:** when the file is full, should the agent keep the newest notes, move the older ones into the work ticket they belong to, and tell you it did?
**Recommended: yes.** One reason: it never silently loses a note, and the ticket is where you would look for that work anyway.

**3. The requirements document has never been approved as a whole.**
You have approved individual pieces: where information goes, the working-memory fields, the save helper, the writing style, and the six-part picture walkthrough. The document itself still says "proposed," and builders are working from it anyway.
**Question:** do you want to read the whole thing and approve it, or approve it in sections as we bring each one to you?
**Recommended: section by section.** One reason: it is roughly 2,300 lines, and the pieces you have already approved do not need reading again.

**4. Should the agent say something on every single message?**
The system asks the agent to confirm, in every reply, that it will check whether anything is worth saving. You are already asking to silence a similar line about the writing style.
**Question:** should that confirmation be hidden from you, so you only hear from the agent when it actually has something to save?
**Recommended: hidden.** One reason: a line you see on every message stops registering and adds noise to every answer.

### (c) What I could not check

- Whether the system actually behaves as written: I read documents and code, ran nothing.
- Whether Mike's 2026-09-21 wording ("a harness of hooks, instructions and handshakes; no search tools; no code that detects language patterns; no over-engineering") is fully met: that is the second auditor's scope. Requirement 29 covers the search and pattern-detection parts (`:1927-1948`).
- The pull-request comparisons came from a helper, not from my own reading.
- Session history and any decision Mike gave only in chat: I saw only the issue, the documents and Git.

## Audit 2: build philosophy against requirements, design and shipped code

### Group 4 and borderline group 3

| Mechanism | file:line | Verdict | Reason | What is lost |
|---|---|---|---|---|
| Transcript search engine with ranking (term coverage, occurrence counts, exact-phrase bonus, sorted results) | `plugins/second-brain/skills/knowledge-find/scripts/search-sessions.mjs:82-102`, `:456`; 658 lines | **Remove** | This is the one thing the PRD names as forbidden ("Do not build a search engine"). Agents grep `~/.claude/projects/*.jsonl` natively, and the desktop app ships transcript search | Ranked excerpts and a `--scope repository` flag. Replace with 4 lines in `history.md` telling the agent to grep those files |
| Per-turn review state: hashed state file, exclusive lock, generation UUID, outcome enum | `.claude/hooks/knowledge-completion.mjs:17-54` | **Simplify** | The state exists only so a Stop hook can block once. A plain "has this turn recorded an outcome" flag needs no lock | Deterministic behavior when two hooks run at once; the cost of losing it is a duplicate reminder, not a wrong save |
| One-time action permit + nonce + six-argument receipt command (pending PR #374) | `knowledge-completion.mjs:66-118` (head `712a186`), `save-reminder.mjs:167-183` | **Simplify** | A nonce makes the hold un-bypassable, which is enforcement, not a handshake. Main's once-per-branch hold already gets the agent's attention | A second `gh pr create` in the same turn would not be held again |
| Age-based abandoned-lock clearing | `knowledge-completion.mjs:13-14`, `:30-38` (PR head) | **Remove** | The 2026-09-21 review already asked for this removal on exactly these grounds; it is still in the pushed head | Nothing. It was added to fix a problem the lock itself created |
| Per-session branch/item memory in the two hold hooks | `save-reminder.mjs:104-132`, `work-item-close.mjs:45-73` | **Keep** | Smallest state a "hold once" checkpoint can have | none |
| Shell command parsing: heredoc stripping, quote stripping, segment splitting, `cd` resolution | `command-parsing.mjs:12-38`, `:63-68` | **Keep (borderline)** | Recognizes an exact command shape, not meaning. 71 lines, well tested | none |
| Git interrogation to pick a message (default branch, `diff --name-only`) | `save-reminder.mjs:57-96` | **Keep (borderline)** | Objective Git state | none |
| `inspect-knowledge-save.mjs` (112 lines: remote ls-remote, blob hashing, trailer grep) | `.claude/tools/inspect-knowledge-save.mjs:50-104` | **Simplify** | Objective Git facts, but it re-implements five git commands the agent can run and read | A single JSON summary; the skill would name the commands instead |
| Secret-shape patterns in the checker | `check-knowledge.mjs:63-73` | **Keep (borderline)** | Fixed credential shapes, not language detection. Cheap, high value | none |
| Hand-written YAML subset parser | `.claude/tools/frontmatter.mjs:1-89` | **Keep (borderline)** | Needed so builder and checker agree, with no dependency | none |
| Index builder and checker | `build-knowledge-index.mjs`, `check-knowledge.mjs` | **Keep** | Objective file-content checks. Not machinery in Mike's sense; recommending removal would be reflex | none |
| Model-trial runner with pre-declared exact-substring expectations | `tests/knowledge-behavior/run.mjs` (508 lines), `scenarios.json` | **Keep, unshipped** | Dev-only, never installed. Its own README admits the string checks give false results | none |

### A. Requirements

The PRD is on Mike's side. R29 says outright: "Do not build a search engine, or another reasoning engine"; "Do not build something that scores whether the search was good enough"; "Do not add a semantic scorer, keyword classifier, changed-file trigger". The shipped session search contradicts its own PRD.

Three requirements still pull toward machinery:

- R2/R3: "A completion check follows the three reads. It confirms that the contents of each file reached the agent and were read." Nothing can confirm that. Lighter reading: ask for the confirmation and accept it; the hooks already say "This checklist is not proof that the files were read".
- R3: "Before the agent processes every submitted user prompt, it receives the short reminder... and explicitly acknowledges". This produced the generation IDs and outcome receipts. Lighter reading: the reminder text, and the acknowledgment as a sentence in the reply.
- R28: "a reference that does not change" plus "check whether the original helper is still executing and whether the change already landed". This produced the save inspector. Lighter reading: the Markdown inbox entry plus named git commands.

### B. Design

Covered in the table. Summary: keep the inbox, the indexes, the checker, the command recognition and the once-per-branch holds. Simplify the lock, the nonce and the save inspector. Remove the session search and the abandoned-lock clearing.

### C. Shipped code

- `search-sessions.mjs`: 658 lines reachable only from step 5 of one reference file.
- `knowledge-manual.mjs` is re-exported through `memory-reminder.mjs:12-13`, so `knowledge-session-start.mjs:17` imports manual discovery from the reminder hook. Import it directly.
- Six compatibility skills (10 lines each) are harmless.

### D. What one ordinary message costs today

Registered in `.claude/settings.json`: three `UserPromptSubmit` hooks, one `Stop`, two `PreToolUse` (Bash only), two `PostToolUse`.

Every single message injects:

1. `toolkit-session-start` again, 855 characters ("Read all of knowledge/toolkit-manual.md before starting work"): the same hook also runs at SessionStart.
2. `memory-reminder`, 2,183 characters, plus a line assigning a review generation ID.
3. `style-handshake`, demanding the agent Read the style file alone and reply with one exact sentence.

Then `Stop` blocks the turn once, requiring a knowledge review and a `node .claude/hooks/knowledge-completion.mjs review ...` command before the reply lands.

So: roughly 3,300 characters injected, two acknowledgments demanded, one hold, per message.

Two are visible noise. `toolkit-session-start` on UserPromptSubmit repeats what `memory-reminder` already says ("Manuals: knowledge/knowledge-manual.md and knowledge/toolkit-manual.md"). And `.claude/settings.local.json:3` sets `"outputStyle": "Concise"`, a built-in with no file, so the style handshake fails on every prompt and instructs the agent to "Briefly report that limitation", a per-turn apology about a setting.

### Questions for Mike

**1. The session search script.** The knowledge system ships a 658-line program that searches your old Claude conversations and ranks the hits by how many of your words appear. Your PRD's own rule says not to build a search engine, and agents can already grep those files. Delete it and replace it with four lines telling the agent where the files are? **Recommended: yes**, it is the clearest case of the thing you said not to build.

**2. The pull-request checkpoint in the open pull request #374.** Today, opening a pull request is held once per branch with a reminder. #374 changes it to a one-use ticket: the agent must run a command quoting a secret code before the exact retry is allowed. That is a lock, not a handshake. Keep the hold, drop the ticket? **Recommended: yes**, a reminder the agent can proceed past is the design you asked for, and #374 also still contains a lock-clearing change your last review asked to remove.

**3. The per-prompt noise.** Every message you send currently carries two reminders that both point at the same two manuals, plus a demand that the agent read a style file that your local settings point away from, so it apologizes every turn. Fix the setting and drop the duplicate reminder? **Recommended: yes**, one reminder per prompt, not three.

**4. The save inspector.** After an interrupted save, a 112-line program reports what reached GitHub. The agent can get the same facts with five ordinary git commands. Replace the program with the commands written into the instructions? **Recommended: yes**, though this one is genuinely borderline: the facts it reports are real facts, not guesses.

### Could not check

Live hook behavior in a running session (I read registrations and ran hooks by hand). Codex delivery. Whether PR #374 has moved past `712a186`. The three earlier review reports named in issue #269 are not saved as files, so I could not read their findings directly. `docs/designs/269-knowledge-system/implementation-plan.md` was out of the stated scope and unread.

## Audit 3: harmony across the Toolkit Operating System

**Read-only audit. Nothing changed.** I read the two manuals, the parent PRD and all six children, every rule in `.claude/rules/`, `CLAUDE.md`, `AGENTS.md`, `current.md`, `docs/toolkit-map.md`, `.claude/settings.json`, the four hooks it runs, and the 2026-09-21 gap assessment. Findings below are new; I cite that assessment's ids instead of repeating it.

### Findings

| id | kind | evidence | smallest fix |
|---|---|---|---|
| H1 | double home | `knowledge/prds/toolkit-operating-system/knowledge-system.md:868` and `knowledge/knowledge-manual.md:80` put every item's status, next step, blocker and to-dos in `current.md`; `.claude/rules/work-item-stages.md:31` and `CLAUDE.md:68` put the same in the work item. `knowledge/memory/current.md` is 4,996 of 5,000 characters, and two of its three items still read 2026-09-19 | `current.md` keeps goal + link per item; status, next step and blocker live only in the tracker |
| H2 | no home | who is working on what: `work-item-stages.md:31` says the work item, `knowledge-system.md:868,912` says `current.md`, and in practice roles and chat ids went to `docs/designs/269-knowledge-system/implementation-plan.md:43-48`, a file `docs/CLAUDE.md` says is deleted at stage 14 | one routing line: agent and session assignments live in the work item only |
| H3 | contradiction | System Guide folder: `system-guide.md:67,196` says `knowledge/system/`; `knowledge-system.md:171,1277,1493` says `knowledge/system-guide/`; `toolkit-manual.md:143` says the configured path decides | change the three `knowledge-system.md` mentions to "the configured System Guide location" |
| H4 | duplicate moment | session start asks for three separate acknowledgments: `.claude/hooks/toolkit-session-start.mjs:33`, `.claude/hooks/knowledge-session-start.mjs:94`, `.claude/hooks/style-handshake.mjs:106`. `toolkit-operating-system.md:740` already requires knowledge startup to sit under the parent orientation | one acknowledgment covering all the required reads |
| H5 | duplicate moment | every user message runs three hooks (`.claude/settings.json:74-96`), including `toolkit-session-start.mjs` a second time, and `.claude/hooks/memory-reminder.mjs:23` demands an explicit acknowledgment each time | drop `toolkit-session-start` from UserPromptSubmit; keep one per-message reminder |
| H6 | confusing | `guided-delivery.md:104-111` makes the owner agree where the design lives, but `guided-delivery.md:114` already fixes it at `docs/designs/` | delete that question from the agreed list |
| H7 | authority conflict | `.claude/rules/parallel-agent-sessions.md:59,67` requires owner approval for every merge and says that can never be relaxed; Mike's 2026-09-21 standing instruction (#269, #377) says agents merge | record the standing instruction as the project exception; keep the file-collision safety check |
| H8 | authority conflict | `work-item-stages.md:43`, `guided-delivery.md:111`, `guided-work-management.md:363-369`, `toolkit-operating-system.md:532,710` all still say helper choice needs the owner or is open | record the 2026-09-21 decision in those four places |
| H9 | contradiction | `knowledge-system.md:1500` says where memory-selection feedback lives "is chosen during design"; `knowledge-manual.md:85` and `knowledge-system.md:2170` already fix it at `knowledge/memory-self-improvement.md` | name the file in the routing table |
| H10 | double home | handoffs sit in `current.md` (`knowledge-manual.md:47`, `knowledge-system.md:879`) and in the work item (`work-item-stages.md` "Leave a usable handoff", `work-item-upkeep.md:53`) | `current.md` keeps a pointer and link; detail stays in the item |
| H11 | confusing | `CLAUDE.md:5` ends mid-word ("full pictur"); `CLAUDE.md:7-9` carry session-behavior instructions no rule owns, against `folder-instruction-files.md:66` ("the root file stays a router and a map") | finish the sentence; move or delete those two paragraphs |
| H12 | duplicate | required startup reads are listed three times and differ: `CLAUDE.md:26-28` (six files), `knowledge-manual.md:24-33` (three plus two), `knowledge-system.md:489` (three) | the manual owns the list; the root file links to it |
| H13 | contradiction | `knowledge-system.md:687` still says the per-message reminder links to the toolkit manual "once that manual has an approved canonical path"; it exists at `knowledge/toolkit-manual.md` | name the path |

**In good harmony:** the handoff order (tracker step, then knowledge review, then the prompt) agrees across `offer-context-handoff.md`, `work-item-upkeep.md:53`, and `knowledge-manual.md`; and research ownership agrees between `knowledge-manual.md:87` and `knowledge-system.md:1505`.

### Questions for Mike

**1. The shared "what are we working on" file is full.**
`current.md` repeats each item's status, next step and blocker, which the GitHub issue also holds. It hit 4,996 of its 5,000-character ceiling, and two entries are two days stale.
**Question:** should that file keep only each item's goal and a link, with status and next step living only in the issue?
**Recommended: yes.** One place to update means one place to go stale, and the size limit stops being a wall.

**2. Merging without you.**
You said on 2026-09-21 that agents review and merge pull requests. The rule file every project receives still says merges always need your approval and that this can never be relaxed.
**Question:** may I write your new instruction into that rule as the recorded exception, keeping the check that a merge cannot clobber uncommitted work?
**Recommended: yes.** Otherwise every session reads a rule that contradicts you and stops to ask.

**3. Three acknowledgments at the start, one more every message.**
Today the agent prints an acknowledgment for the toolkit manual, another for the knowledge manual, a fixed sentence for the writing style, and an "I will check for anything worth saving" line on every message you send.
**Question:** collapse these into one acknowledgment at session start and one quiet per-message check?
**Recommended: yes.** The repeat lines prove nothing beyond receipt, which the documents already say, and they are the first thing you read every turn.

**4. Two names for the System Guide folder.**
One document says it lives in `knowledge/system/`, another says `knowledge/system-guide/`.
**Question:** settle on the configured path being the answer, with no folder name written into the knowledge documents?
**Recommended: yes.** It is the only version that survives a project choosing its own location.

### What I could not check

Whether any of this behaves as written in a live session: I read files only, ran no session on either Claude Code or Codex, and started no helper. I did not open issues #269, #377 or #337, so I took the two 2026-09-21 decisions from your brief. I did not read the plugin sources behind the skills (`work`, `handoff`, `solution-design`), only their PRDs, rules and hooks. Character counts and line numbers are from the working tree on `main` at the time of reading.

## Helper: open pull requests against their work items

### 1. PR #374: knowledge action checkpoint

**Identity**
- Issue: **#269** (Knowledge System). The PR body links no `Closes`; it names `docs/designs/269-knowledge-system/implementation-plan.md` and issues #269/#369 as its owning records.
- Branch: `codex/knowledge-action-checkpoint`, base `main`, state DRAFT.
- Actual head: **`712a186cb5f4f7ba472e929a24089bc48365ae3d`** (2026-09-21 14:50:56 -0400, "fix: close independent-review findings on the action checkpoint").
- Merge-base with `origin/main`: **`f9b2dd8fc5b7c9a6d0ed0ec864f730b42c8045cc`** (2026-09-20 18:21:01 -0400, "docs: finish delivery continuation bookkeeping").

**Stale PR body (real finding).** The body says "The exact pushed head is `c966d681…`" and the handoff checkpoint at the top says the head is `0d082a68…`. Both are ancestors, not the head. The actual head `712a186` is two commits newer and is described nowhere in the body. Anyone reading the PR body to decide what was reviewed will review the wrong commit.

**E1-P5 claim: confirmed, but the plan contradicts itself.**

`docs/designs/269-knowledge-system/implementation-plan.md:819`: `## E1-P5: startup, prompt, completion, and scoped action checks`
`:821`: `**Owner:** host-adapter builder. **Dependencies:** D1-P1, E1-P1; E1-P4 before behavior acceptance. **Requirements:** R2–3,9–10,25–29.`

So E1-P5 claims R2, R3, R9, R10, R25, R26, R27, R28, R29. The traceability table at the bottom of the same file only maps E1-P5 to **six** of those:

| Line | Row |
|---|---|
| 910 | `\| 2 Follow system \| D1-P1, E1-P1/P5/P7 \| Ordered startup reads, honest acknowledgment, recovered guidance. \|` |
| 911 | `\| 3 Reliability \| E1-P4/P5/P8 \| Required moments without owner reminders; affected-work failure and recovery. \|` |
| 917 | `\| 9 Saving \| D1-P1, E1-P2/P4/P5/P8 \| Prompt reminder, required reviews, explicit approved helper assignment, conversation continues, verified publication and returned result. \|` |
| 918 | `\| 10 Permission \| D1-P2, E1-P1/P4/P5/P8 \| Scope, silence, partial approval, ongoing authority, approval toggle, recovery. \|` |
| 933 | `\| 25 Codex \| D1-P1, E1-P5/P7/P8 \| Same shared records and behavioral tests; explicit capability/coverage gaps. \|` |
| 934 | `\| 26 Documented use \| D1-P1, E1-P5/P7 \| Current source/installed-version mapping and observed adapter proof. \|` |
| 935 | `\| 27 Activation \| **E1-P7, F1-P1** \| Opt-in complete setup, version, checks, actual per-project adoption. \|` |
| 936 | `\| 28 Inbox \| **E1-P1/P4/P8** \| Exact card, durable authority, pending/conflict/resume/idempotent completion. \|` |
| 937 | `\| 29 Native judgment \| D1-P1, E1-P4/P5/P8 \| Lean reminders/receipts, narrow objective checks, no semantic engine. \|` |

**R27 and R28 do not list E1-P5.** The package header claims them; the traceability table assigns them elsewhere. That is an internal contradiction in the plan, not a builder error, but it means "what E1-P5 must deliver" has two different answers in one file.

**PRD drift after the merge-base: none.**

```
git log --oneline f9b2dd8..origin/main -- knowledge/prds/toolkit-operating-system/knowledge-system.md
(empty)
```

Zero commits. The PRD's last change on `origin/main` is `07f6a96` (2026-09-20 13:52:26 -0400, "docs: reconcile delivered Knowledge architecture in PRD"), **4.5 hours before** the merge-base. **No numbered requirement section changed after the merge-base. No mismatch.** For the record, the sections E1-P5 claims are `## 2. The agent follows this system` (line 484), `## 3. Reliable behavior without reminders` (517), `## 9. Saving is frictionless` (679), `## 10. Approval before any write` (756), `## 25. Codex` (1838), `## 26. Built the way Claude Code's documentation says` (1849), `## 27. Installed once, turned on per project, and checked` (1867), `## 28. Pending memory inbox` (1879), `## 29. Preserve agent judgment with narrow safeguards` (1920), all unchanged since before the branch forked.

**Design `docs/designs/269-knowledge-system.md`: no change after the merge-base.** Last touched `fc7c781` (2026-09-20 11:50:43 -0400), also before the fork. No mismatch.

**Implementation plan: changed, but not in any way that affects this PR.** Five commits, 297 insertions / 1 deletion:

```
a36c5d2 2026-09-21 14:58:30  docs: record that chat leads run on Fable and guide Opus helpers
cf7a4df 2026-09-21 14:42:25  docs: move live team status from the plan to the work item
cbd42d2 2026-09-21 14:39:30  docs: record Codex-to-Claude transfer and running team chats
9c71a90 2026-09-21 14:29:20  docs: record chosen Claude team arrangement
b3cc0eb 2026-09-21 12:37:04  docs: preserve Claude team continuation and release checkpoint
```

The whole 297-line delta is one new section, "Claude team continuation, 2026-09-21", inserted at the top, plus the `Updated:` date line. The E1-P5 section (line 819) and every traceability row are byte-identical. The PR branch itself makes no change to the PRD, the design, or the plan.

Two things in that new section the builder should know, since they post-date the fork: it records the head as `0d082a6` and says "The old independent approval at `c966d681` predates this correction and cannot approve the new head automatically", and it adds an explicit approval-scope caveat: "Mike did not separately name #374 in the quoted approval… Before merging, the receiving coordinator must establish that the actual #374 scope is covered by the recorded direction."

**Verdict for #374: no requirements mismatch.** The PRD and the design have not moved since the branch forked. The only staleness is bookkeeping: the PR body names two wrong heads, and the plan's E1-P5 header claims two requirements its own traceability table assigns to other packages.

---

### 2. PR #376 vs issue #375: silent style handshake

Branch `issue-375-silent-style-handshake`, head `d306dd6c2cc0d6b09850b207d1a0331fb166e961`, one commit, merge-base `cf7a4df21327576ee3a9a52574bb6bf3137e0fee` (2026-09-21 14:42:25 -0400).

**One real mismatch, on requirement 2.**

Issue #375 requirement 2 reads, in full:

> 2. The agent is no longer told to say "I read the output style and will follow it." or any other visible acknowledgment. **The hook's own record that the file was read stays behind the scenes.**

The PR deletes that record. From the PR body:

> "I removed the PostToolUse companion on Read, the temp-folder read marker and the per-session state."

Confirmed in the diff of `plugins/hooks-library/hooks/style-handshake.mjs`: the `stateDir`, `sweep()`, the `writeFileSync(join(stateDir, …'.read'))` marker write, the `PostToolUse` branch and the `session_id` guard are all removed. The first sentence of requirement 2 is satisfied; the second is not. Nothing now records that the read happened.

The issue itself, as it reads now, treats this as **unresolved and awaiting Mike**, from Recent History, 2026-09-21:

> "Two items go to Mike: confirm the marker removal against requirement 2, and whether the hook should stay quiet whenever no style file is found instead of keeping a fixed list of built-in style names (reviewer recommends the first; it changes requirement 3)."

So the builder shipped a change that contradicts the written requirement, and the open question about it is still open. Requirements 1, 3, 4 and 5 are met as written: the hook still requests a whole-file Read on every user message; it returns silently for `['default','proactive','concise','explanatory','learning']` when no file exists and still prints "could not be located or read" otherwise; both plugin manifests, the marketplace entry, the hooks-library README, `docs/toolkit-map.md`, `knowledge/toolkit-manual.md`, the installed copy and the tests are all in the diff; the hook is neither removed nor replaced by hidden text injection.

**Behavior not asked for:** the PostToolUse Read registration is dropped from `.claude/settings.json`, and the `session_id` guard is gone. Both are consequences of the marker removal, so they stand or fall with the requirement 2 question.

**Not a mismatch, but note:** `knowledge/memory/memory-entries/why-the-style-hook-stays.md` landed on `origin/main` *after* this branch forked (commit `5853482`, 2026-09-21 14:56:48). It records Mike's decision and says "The hook should do its work unseen." It agrees with the PR's direction and does not contradict it.

---

### 3. PR #378 vs issue #377: team arrangement question

Branch `issue-377-team-arrangement-question`, head `d67e4b81ee7566d0ad41c6f1a9829664e2b474c4`, two commits (`d1e7170` requirements 1–7, `d67e4b8` requirements 8–9), merge-base `ba043c41b7ec77704efd5a4324e63c3c542a8237`.

**Requirements 1 through 9: no mismatch.** I checked each against the diff of `plugins/work-tracker/skills/work/references/agent-led-delivery.md` and the new `plugins/work-tracker/skills/work/references/team-arrangements.md`. The question wording, the recording with the goal's delivery choice, the host gate and single-chat fallback, the archive question and its four conditions ("archive only, never delete"), the generic model wording (grep for "fable" and "opus" across all four shipped files returns nothing), the helper-authority exception with the original sentence "Acceptance of agent-led delivery does not itself authorize spawning helpers." preserved verbatim, and all nine bullets requirement 4 asks the instruction sheet to cover, all present.

**Three instructions in the issue the PR head does not satisfy.** These come from the newest Recent History entry, added at 19:33:34Z, after the head was pushed at 19:24:53Z:

> "Sent to the builder: relabel two stale PRD Notes lines, add one lesson line to the instruction sheet, merge origin/main into the branch, and take marketplace 0.124.4 and project-init 0.77.2 because this merges first."

- **Versions.** The PR sets `.claude-plugin/marketplace.json` metadata version to **0.124.6**, not 0.124.4, and leaves project-init at 0.77.1 (PR body: "I did not bump the project-init plugin version (0.77.1) here"). The PR is sequenced *behind* #374 (0.124.4) and #376 (0.124.5); the issue now says it merges *first*.
- **Two stale PRD Notes lines.** Not relabeled. The diff of `knowledge/prds/toolkit-operating-system/guided-work-management.md` adds a `Decision:` bullet but leaves the now-obsolete lines above and below it intact, including `- Resume here: resolve the future helper-authority question when Mike answers;`, which Mike answered, as requirement 9.
- **One lesson line in the instruction sheet.** Not added. All seven bullets from the issue's "Inputs from the 2026-09-21 session" are already covered in `team-arrangements.md`, so I cannot identify which additional line the reviewer meant from the issue text alone; I am not guessing.

"Merge origin/main into the branch" is already satisfied: the merge-base *is* `origin/main`'s tip.

**Behavior the issue does not ask for, all benign:** `plugins/work-tracker/tests/delivery-scenarios.md` (six manual scenarios, marked not run), and two added rules in `agent-led-delivery.md`: "Do not ask after a decline or a revocation" and "The owner may change the arrangement at any time; record the new answer." Neither contradicts anything in the issue.

**Known open item the builder flagged himself:** `plugins/project-init/library/rules/general/work-item-stages.md` is unchanged. Issue #377 names it ("The same offer sentence is in the shipped rule…") and "Finished means" makes it conditional ("the shipped rule **if its wording must change**"). The PR's own item 2 says an agent following only that rule "will not reach the new questions." That is a judgment call for Mike, not a strict requirement violation.

---

### 4. Staleness table

| PR | Merge-base | Merge-base date | Commits behind `origin/main` | Latest `origin/main` commit touching PRD / design / plan | Gap |
|---|---|---|---|---|---|
| #374 | `f9b2dd8` | 2026-09-20 18:21:01 -0400 | 10 | plan `a36c5d2`, 2026-09-21 14:58:30 -0400 | ~20.6 h, plan only |
| #374 | n/a | n/a | n/a | PRD `07f6a96`, 2026-09-20 13:52:26 -0400 | **4.5 h before** the fork, no drift |
| #374 | n/a | n/a | n/a | design `fc7c781`, 2026-09-20 11:50:43 -0400 | **6.5 h before** the fork, no drift |
| #376 | `cf7a4df` | 2026-09-21 14:42:25 -0400 | 5 | `ba043c4`, 2026-09-21 15:04:54 -0400 | 22 min; none of the 5 touch any file this PR changes |
| #378 | `ba043c4` | 2026-09-21 15:04:54 -0400 | 0 | none | fully current |

`origin/main` tip at the time of this audit: `ba043c4`, 2026-09-21 15:04:54 -0400.

---

### Summary of real findings

1. **#374 PR body names two wrong heads.** Body says `c966d681`, checkpoint says `0d082a6`, actual head is `712a186`. A reviewer following the body reviews stale code.
2. **#374's plan contradicts itself on E1-P5's scope.** Header (line 821) claims R27 and R28; traceability rows 935 and 936 assign those to E1-P7/F1-P1 and E1-P1/P4/P8.
3. **#374 requirements drift: none.** The PRD and the master design have not changed since the branch forked. Only the implementation plan moved, and only by adding a handoff section that leaves E1-P5 untouched.
4. **#376 contradicts requirement 2's second sentence.** The hook's behind-the-scenes record of the read was deleted; the requirement says it stays. The issue lists this as an open question to Mike, not a settled decision.
5. **#378 is behind its own issue by three instructions** added minutes after the head was pushed: version numbers (0.124.6 vs. the instructed 0.124.4, project-init not bumped), two stale PRD Notes lines not relabeled, one instruction-sheet line not added. Requirements 1–9 themselves are met.

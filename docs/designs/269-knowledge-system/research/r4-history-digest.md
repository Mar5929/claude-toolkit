# History digest: the project knowledge system (second brain)

For a solution designer. It lists what Mike already settled, what was already
tried and dropped, what he prefers, and what is still open. Read it before you
design anything for the knowledge system, so you do not reopen a closed debate.

## How to read the citations

- A file path plus line numbers means the claim is on those lines of that file
  in `/home/user/claude-toolkit`.
- `issue #269 c<N>` means comment number N on GitHub issue 269 in
  `Mar5929/claude-toolkit`. The full list, with the comment ID you can paste
  into a URL:

| Comment | ID | Date | Title |
| --- | --- | --- | --- |
| c0 | 5510064302 | 2026-09-02 | Assessment recorded on 2026-09-02 |
| c1 | 5510064692 | 2026-09-02, edited to 2026-09-15 | Progress log |
| c2 | 5512304029 | 2026-09-02 | Davis comparison and runtime audit |
| c3 | 5512398791 | 2026-09-02 | Reusable project-rules audit |
| c4 | 5512493568 | 2026-09-02 | Solution design moved |
| c5 | 5514998141 | 2026-09-02 | Technical design and acceptance plan |
| c6 | 5531168688 | 2026-09-03 | Conflict decisions |
| c7 | 5531572271 | 2026-09-03 | Mike's answers, and a gap he found |
| c8 | 5552915320 | 2026-09-05 | Proposed design for requirements 7 and 10 |
| c9 | 5552932397 | 2026-09-05 | Requirement 10: which startup size limits are real |

A URL looks like
`https://github.com/Mar5929/claude-toolkit/issues/269#issuecomment-5531168688`.

- "PRD" means `knowledge/prds/knowledge-system.md`. It has 1951 lines.
- "the walkthrough" means `knowledge/prds/knowledge-system-walkthrough.html`.
  That file is HTML, so its line numbers are not useful. Line numbers for the
  walkthrough point at the plain-text copy at
  `/tmp/claude-0/-home-user-claude-toolkit/4fcf9e21-6c96-5d1c-816b-828bcf2822e5/scratchpad/research/walkthrough-text.txt`,
  which has 905 lines. The section and part names are the same in both.

## The one rule that decides ties

Mike set this on 2026-09-15. The approved walkthrough wins where it disagrees
with the PRD, and the PRD is changed to match. A later clear instruction from
Mike wins over both. A question the walkthrough leaves open stays open; do not
infer an answer.

Recorded in the issue #269 body, section "Goal and requirements", and in the
PRD at line 137.

---

## Section 1. Settled decisions by Mike

One line each: date, decision, where it is recorded.

### Requirements approved on 2026-09-02 (issue #269 c0 and c1)

| Date | Decision | Where recorded |
| --- | --- | --- |
| 2026-09-02 | Install the plugin once per computer. Turn it on only in a project the owner said yes to. Remove duplicate registrations and check the running version. | issue #269 c0 item 1; now PRD lines 1617-1627 |
| 2026-09-02 | The required hooks ship inside the plugin as native plugin hooks. Project sync stays the one owner-approved step that turns a project on, and it then checks the version, the hook registration, and one small working test. Stop copying hook programs into each project. | issue #269 c0 item 2 |
| 2026-09-02 | Completion stays blocked until the normal review has produced current proof for the exact work being completed. A review finishes only when it finds nothing to save, or every proposal was approved or rejected. A later meaningful change cancels the proof. | issue #269 c0 item 3 |
| 2026-09-02 | Proposal formatting is produced by one formatter and validator, not written by hand each time. | issue #269 c0 item 4. This was later dropped: see section 2. |
| 2026-09-02 | Give the agent one compact map of every information source, and task-specific lookup ladders. Record the sources actually checked and reject a candidate that belongs somewhere else. | issue #269 c0 item 5; now PRD lines 1247-1314 and 1316-1383 |
| 2026-09-02 | A completion review asks two separate questions: does an existing specification need an update, and did the work create lasting behavior that needs a new one. Reject a specification candidate an agent could rebuild from code, configuration, metadata, the schema, or tests. | issue #269 c0 item 6; now PRD lines 1136-1138 |
| 2026-09-02 | Take the save question out of ordinary prompts. A light check may look at every message but stays silent unless it sees a clear save-worthy event. The full review runs only at a real save moment. Unlike the Davis project, the toolkit still needs Mike's approval before writing lasting memory. | issue #269 c0 item 7; now PRD lines 669-701 |
| 2026-09-02 | Audit every reusable rule the toolkit can put in a project. Each rule gets exactly one outcome. | issue #269 c0 item 8; moved to issue #305 on 2026-09-09 |
| 2026-09-02 | Remove the universal `project-file-lifecycle.md` rule. The work tracker owns work-item lifecycle, the knowledge manual owns memory and specifications, and the root map names only real paths. | issue #269 c0 item 9; `.claude/rules/README.md`, table "Rules this repo deliberately does not carry" |
| 2026-09-02 | Session startup carries only a short map: current orientation, the work-tracker location, compact indexes, and the source map. Detailed procedures load when they are needed. | issue #269 c0 item 10; now PRD line 484 |
| 2026-09-02 | `current.md` is a short current briefing. It links to the tracker, is overwritten rather than appended, and is repaired when stale. | issue #269 c0 item 11; now PRD lines 802-856 |
| 2026-09-02 | Every equipped project gets one indexed Markdown terminology glossary that maps the owner's business words to real project things, without copying facts a reader could get from code. | issue #269 c0 item 12; now PRD lines 610-650 |
| 2026-09-02 | All twelve requirements and their directions are approved. The technical design is still incomplete, so nothing is authorized to build. | issue #269 c1, entry dated 2026-09-02 at stage `03 requirements-approved` |

### Conflicts Mike settled on 2026-09-03 (issue #269 c6 and c7)

| Date | Decision | Where recorded |
| --- | --- | --- |
| 2026-09-03 | Conflict 1: `current.md` is capped at 3,000 characters, and the rest of the startup budget is rebalanced to pay for it. | issue #269 c6, decision 1. Later replaced: the cap is now 5,000 (PRD line 1469) |
| 2026-09-03 | Conflict 6: Codex sessions are equipped and aware of the system. They get the startup briefing and the skills, with no copied loader. They do not get the save gate or the save-moment detector, because Codex has no `PreToolUse` equivalent, and the project-sync report says that plainly every time. Mike's words: "codex should be aware of the system yes." | issue #269 c7, "Conflict 6 settled"; now PRD lines 1588-1597 |
| 2026-09-03 | The guard set: the gate covers `gh pr create`, `work finish`, and `gh issue close`. It does not cover `gh pr merge`. | issue #269 c7, "The guard set approved" |
| 2026-09-03 | Settled decisions go in the issue body, not only in comments. The old rule said the body holds requirements and nothing else, which is why approved decisions kept living in comment piles. | issue #269 c1, entry dated 2026-09-03; `CLAUDE.md`, section "Where work is tracked" |
| 2026-09-03 | Mike asked for the build decisions to be made rather than walked through one at a time, and for the best solution rather than a patch. Conflicts 2, 3, 4, 5, and 7 were then decided by the agent and written down so Mike could overrule any of them on sight. | issue #269 c1, entry dated 2026-09-03; issue #269 c6 |

Conflicts 2, 3, 4, 5, and 7 were agent build decisions about a design that has
since been deleted. They are history, not Mike's decisions. See section 8.

### The PRD rewrite and the decisions inside it (2026-09-08 onward)

| Date | Decision | Where recorded |
| --- | --- | --- |
| 2026-09-08 | The PRD is rewritten as plain-language requirements instead of a build authority, and lives at `knowledge/prds/knowledge-system.md` (commit 0da5dcd). | issue #269 c1, entry dated 2026-09-08 |
| 2026-09-09 | The pull-request hold stays until the review is done. | issue #269 c1, entry dated 2026-09-09 |
| 2026-09-09 | The agent must follow the system. How it learns the rules is a design choice. | issue #269 c1, 2026-09-09; PRD lines 475-489 and 487 |
| 2026-09-09 | The glossary is its own file and a table. | issue #269 c1, 2026-09-09; PRD lines 610-639 |
| 2026-09-09 | There is one find order, not a separate one per kind of task. | issue #269 c1, 2026-09-09; PRD line 1363 |
| 2026-09-09 | `current.md` is updated without asking. | issue #269 c1, 2026-09-09; PRD line 581 |
| 2026-09-09 | Forced and judged save moments are named. Five moments force a review; everything else is the agent's judgment. | issue #269 c1, 2026-09-09; PRD lines 674-675 |
| 2026-09-09 | Codex follows the same requirements. | issue #269 c1, 2026-09-09; PRD lines 1588-1593 |
| 2026-09-09 | Every shipped part follows the captured Claude Code documentation. | issue #269 c1, 2026-09-09; PRD lines 1599-1610 |
| 2026-09-09 | Installed once, turned on per project. | issue #269 c1, 2026-09-09; PRD lines 1617-1622 |
| 2026-09-09 | Solution design lives on issue #269. The `docs/designs/` folder is dropped. The twelve design sub-issues #273 to #284 are deleted and design starts fresh. The rules audit moves to #305. The System Guide at its own location is a separate plugin on #304. | issue #269 c1, 2026-09-09; issue #269 body, section "Work records and related scope" |
| 2026-09-13 | Save cards use summary approval, not word-for-word approval of the full entry. | issue #269 c1, 2026-09-13; PRD lines 1387-1390 and 1406-1407 |
| 2026-09-13 | The project output style applies to text the agent writes into proposals and saved files. Quotations, captured outside documentation, required fields, and exact names are left alone. | issue #269 c1, 2026-09-13; PRD lines 1100-1109 |
| 2026-09-13 | Memory is one coherent file per topic, with no fixed size cap, split into a topic folder only when that helps. | issue #269 c1, 2026-09-13; PRD lines 918-921 and 1069 |
| 2026-09-13 | The working-memory layout: a project goal, one section per active item, and general to-dos. | issue #269 c1, 2026-09-13; PRD lines 820-838 |
| 2026-09-13 | The memory body template, with optional "When to revisit" and "Related records" sections and no other fixed headings. | issue #269 c1, 2026-09-13; PRD lines 969-988 |
| 2026-09-13 | The knowledge system integrates with the toolkit operating system, and PRDs are kept up to date automatically after shipped work. | issue #269 c1, 2026-09-13; PRD lines 1162-1176 and 1754-1795 |
| 2026-09-13 | The memory index is grouped by topic, not one flat alphabetical list. | issue #269 c1, 2026-09-13; PRD lines 1462 and 1474-1501 |
| 2026-09-15 | The shape every new PRD follows: YAML fields, title, table of contents, "Why this exists", a fixed note that the document holds only the what in plain language a stranger could build and test from, requirements grouped by area with a numbered heading and a Check each, and optional solution design notes last. | issue #269 c1, 2026-09-15; PRD lines 1140-1150 |
| 2026-09-15 | A level-two `Requirements` heading marks where the requirements start, with level-three areas and numbered level-four requirements. Visuals such as flowcharts are welcome anywhere. A part needing much more detail gets a sub-PRD in the area folder, named by relative path from the main PRD. | issue #269 c1, 2026-09-15; PRD lines 1149, 1152, 1154 |
| 2026-09-15 | Each pending inbox entry records the harness it was shown in (Claude Code or Codex) and that conversation's ID. | issue #269 c1, 2026-09-15; PRD line 1642 |
| 2026-09-15 | Walkthrough Part 4 approved in full: the approval boundary, the summary card, its no-answer, reject, edit, and approve outcomes, the pre-write check, and write, verify, and publish. | issue #269 c1, 2026-09-15; walkthrough-text.txt lines 660-756 |
| 2026-09-15 | Walkthrough Part 5 approved: mechanical repairs without a yes; meaning changes and deletions through the Part 4 card flow; duplicates and stale files through the same flow; setup faults handed to the component that owns them; no automatic whole-folder sweeps; verify, then return to the interrupted step. | issue #269 c1, 2026-09-15; walkthrough-text.txt lines 774-822 |
| 2026-09-15 | Walkthrough Part 6 approved, and the whole six-part flow approved. Approving the walkthrough does not approve the PRD, a solution design, or implementation. | issue #269 c1, 2026-09-15; walkthrough-text.txt line 904 |
| 2026-09-15 | `finalized` means the requirements are ready for solution design or building. It does not mean the work was built or delivered. | PRD lines 1130 and 1211; issue #269 c1, 2026-09-15 |
| 2026-09-15 | The existing PRDs, including this one, may keep their current layout. The new layout applies to PRDs written from now on. | PRD line 1142; issue #269 c1, 2026-09-15 |
| 2026-09-15 | Save timing settled in requirement 9: during an authorized interview, save a settled decision before asking the next question, with no second permission request. | PRD lines 681 and 697-701; commit 7a8a874; issue #269 c1, 2026-09-15 |
| 2026-09-15 | Removing the redundant originals is part of an approved consolidation, after checks prove the replacement preserves the useful information, history, and sources, and after links are updated. | PRD line 1520; commit a8b9d2a; issue #269 c1, 2026-09-15 |
| 2026-09-15 | The glossary keeps the simple table and gets a direct navigation link. It stays out of the generated memory index and needs no index fields such as `group` or `summary`. | PRD lines 620, 923, 1461, 1510; commit 60d91e2 |
| 2026-09-15 | A project owner can turn the approval step off for writes to memory in that project, once he trusts the agent's judgment there. It is per project and off by default. The agent then runs the same review and checks, makes the change on its own, and reports in one line what it changed and where. | PRD line 717; walkthrough-text.txt line 668; issue #269 c1, 2026-09-15 |
| 2026-09-15 | That setting covers every write to memory: new file, update, merge, supersede, retire, delete. It does not cover PRDs, which keep the permission rules in requirements 10 and 16. | PRD line 717; commit c4c49b4; issue #269 c1, 2026-09-15 |
| 2026-09-15 | Every requirement is written like a person wrote it: plain and clear, no jargon, no figures of speech, with the context a stranger needs inside the requirement. | issue #269 c1, 2026-09-15; PRD lines 1044-1054 and 1148 |
| 2026-09-15 | Delete the unpublished PRD skill draft `misc/SKILL (2).md`. The PRD shape it carried now lives in requirement 16. | issue #269 c1, 2026-09-15 |

### Decisions settled on other issues that bind this one

| Date | Decision | Where recorded |
| --- | --- | --- |
| 2026-09-10 | An authorized knowledge save commits straight to the project's default branch and is pushed, even while the session's implementation work is in a worktree. Shipped as R25 through issue #307 and PR #308. | `knowledge/prds/toolkit-operating-system.md` lines 61-64 and 435-458; `.claude/rules/knowledge-direct-commit.md` lines 5-16; PRD lines 678-687 |
| 2026-09-10 | An unapproved `proposed` PRD leaves out `approved_by` and `approval_date`. When either is supplied both must be present, nonblank, and the date must be real. Shipped through issue #311 and PR #312. | PRD lines 1195-1208; `knowledge/prds/toolkit-operating-system.md` lines 298-302 |
| 2026-09-09 and 2026-09-10 | The System Guide is its own plugin with its own PRD. Mike approved the name, place, summary, and folder shape with "I think that is good" on 2026-09-09, then said "please build it" on 2026-09-10. | issue #304 body, sections "Approved direction" and "Proposed PRD" |
| 2026-09-10 | The System Guide works without the second brain. Lookup, startup guidance, refresh, approval, and cleanup all work on their own. | issue #304 body, "Approved direction"; `knowledge/prds/system-guide.md` lines 75-79 |
| 2026-09-05 | Work-item upkeep: the tracker owns the item, and project knowledge may react to completion but never owns work-item state. | `knowledge/prds/work-item-upkeep.md` lines 15-17 and 53-56 |
| 2026-09-15 | Every subagent a session starts runs on Opus, never the session's own model. Enforced by two environment values. | `.claude/rules/subagents-run-on-opus.md` lines 1-13; `.claude/settings.json` lines 5-6 |
| ongoing | The project output style is `Plain English`. It is a settings value and a style file, not a rule. | `.claude/settings.json` line 2; `.claude/rules/README.md`, section "Voice is not a rule" |
| 2026-09-15 | The `Plain English` style was changed so replies are short by default, with 250 words as a target. Merged as PR #342. | issue #269 c1, 2026-09-15 |
| 2026-08-22 | `knowledge/` and everything under it gets no folder `CLAUDE.md`. The root startup route and the project-knowledge specification already own it. | `knowledge/prds/folder-instruction-files.md` lines 43-49 |

### The settled content rules inside the PRD

These are the parts a designer most often gets wrong. They are approved
requirement text, so treat them as settled.

| Topic | Rule | PRD lines |
| --- | --- | --- |
| Startup read order | At a new session start the agent reads `SOUL.md`, then `knowledge/project.md`, then `knowledge/README.md`, in that order. The instruction to make the reads reaches the agent before it makes them. | 272-276, 480 |
| Completion check | A check confirms all three file contents reached the agent and were read. Listing file names or sending a reminder does not count. | 278-283, 481 |
| One-line confirmation | Only after that check does the owner see one short confirmation, such as "I've read the knowledge manual." It is shown once, with no checklist, and not repeated on ordinary turns. It is never shown when the manual was unavailable. | 481-483 |
| Five forced save moments | A work item finishes or closes; a pull request is about to be opened; a handoff or context clear is coming; a turn ends after real work was done; the owner says to save something. | 674 |
| Judged save moments | Everything else is the agent's judgment. A missed candidate is picked up at the next forced moment. | 675 |
| Quiet routine upkeep | During routine work the agent speaks only about something needing approval, a finished save the owner must be told about, or a problem. It never reports that nothing needed saving. Routine PRD upkeep stays quiet too. | 677, 1168 |
| What counts as memory | All three must be true: it is about this project and useful to it; it is significant, tested by whether a later agent would lose real time without it; and the human owner was part of it. | 748-752 |
| The one exception | A real, significant problem here that the agent found and fixed alone may be proposed. Nothing else skips the third point. A routine solo action still fails the second point. | 754 |
| A significant episode | A piece of work that produced a result the project will look up again, saved with `type: event`, with the card appearing at the end of the task without being asked for. | 761-767 |
| What never counts | Small solo actions, commands and tool calls, raw errors, dropped ideas, a step-by-step record, anything readable from the code, a repeatable procedure, live status, a "read this first" pointer, the story behind a rule, anything out of date with no history value, and secrets. | 782-795 |
| Memory layout | One topic, one file under `knowledge/memory/memory-entries/`, or a topic folder when the topic needs splitting. No file per fact. No subfolders by type. No date, code, or ticket-number filenames. | 918-922 |
| Memory size | No fixed length limit on a memory file. | 1069, 1469 |
| Size checks that do exist | An index-feeding `summary` is under 200 characters, and `knowledge/memory/current.md` is under 5,000 characters. No other size limit is set. | 930, 1469 |
| Glossary | One file at `knowledge/memory/memory-entries/terminology-glossary.md`: a title, one purpose sentence, and one alphabetical table with columns Term / aliases, Plain meaning, Refers to, Watch out, Source / date. | 612, 619, 629-639 |
| Memory inbox | One file, `knowledge/memory-inbox.md`, directly under `knowledge/`. It holds unanswered proposals and approved saves that did not finish, including interrupted automatic PRD upkeep. States: `awaiting approval`, `approved, save unfinished`, `blocked by conflict`. | 1629-1652 |
| PRD statuses | `proposed`, `finalized`, `superseded`, `retired`. A PRD never uses `current`. | 1210-1211 |
| Direct commit | An approved memory or PRD save goes straight to the default branch and is pushed. It is never parked on a feature branch, a pull request, or a draft. A save is finished only when it is on the default branch and pushed. | 678-680 |
| Folder layout | `SOUL.md` and `brainstorms/` at the project root; `ai-external-knowledge/`; `knowledge/` holding `README.md`, `project.md`, `memory-inbox.md`, `memory/` (with `memory-index.md`, `memory-entries/`, `current.md`), `prds/` (with `prd-index.md`), and an optional `system-guide/`. | 144-173 |

---

## Section 2. Approaches tried or proposed and rejected

### Rejected in the earlier memory systems

| Approach | Why it was dropped | Where recorded |
| --- | --- | --- |
| A memory librarian sub-agent that writes memory files | Correctness was owned by nobody. The main agent assumed the librarian checked; the librarian assumed it was handed the truth. The librarian wrote "nine months after the manifest was written" into a committed file when the real gap was four days, and both dates were in its instructions. | `knowledge/brainstorms/2026-08-04-memory-system-cost-and-correctness.md` lines 71-74 and 86-95 |
| Keeping the librarian to organize the file after the owner approved the words | That means doing the work twice. If the main agent drafted the words and the owner approved those words, the librarian may not rewrite them. | Same file, lines 111-114 |
| Checking facts after the owner approves them | Backwards. The owner is the one person who cannot tell whether "nine months" should say "four days", so nothing unchecked should reach him. | Same file, lines 104-109 |
| Cutting the indexes to save tokens | Mike refused: "I feel like we need an index right? or some map? we can't just cut it right?" Every comparable design keeps an index; they just build it from the pages rather than typing it. | Same file, lines 34-35 and 61-63 |
| Running the pre-merge memory review less often | Withdrawn. There was no design flaw. Seven minutes of work came from a badly written prompt. | Same file, lines 36-43 |
| Cutting cost as the goal | Mike said the wait was never the complaint. The rework was. "a few minutes is fine, but the problem is there seems to be a lot of correcting and back and forth." | Same file, lines 26-32 |
| Seven memory subfolders by type, and a fixed tag list | Replaced on 2026-08-21 by one flat folder, one file per topic, and free-form tags. | `.claude/toolkit-sync.md` lines 28-32 |
| 2,659 lines of health, layout, and harness machinery | Deleted in favour of one read-only checker. That machinery was a large part of why saving cost more than it gave back. | `.claude/toolkit-sync.md` lines 33-35 |
| A `memory/planning/` type for vision, goals, roadmap, milestones | Proposed in the 2026-07-28 design. It is not in the current PRD. `current.md` and the tracker carry that. | `knowledge/brainstorms/2026-07-28-second-brain-v3-project-memory.md` lines 10-12; compare PRD lines 802-812 and 1287-1290 |
| A `memory/architecture/` type | Rejected in that same session. Intended behavior belongs in specifications; maps of the existing system belong in knowledge. | Same file, lines 90-93 |
| Mirroring brainstorm folders to specification areas | Superseded in that same session. Brainstorms stay flat with dated names and one index. | Same file, lines 42-46 |
| Sending memory and specification updates through the task's pull request | Reversed on 2026-09-10. Authorized knowledge saves now go straight to the default branch. | Brainstorm lines 53-58; `knowledge/prds/toolkit-operating-system.md` lines 435-458 and 511-513 |
| A background writer, a hidden database, or private agent memory | Ruled out as a project boundary. | `knowledge/project.md`, section "Current goal and boundaries"; PRD lines 458-459 |
| Copying the Davis project's automatic curator, its oversized memory index, its overloaded current-focus file, its session-brain pattern, or its knowledge graph | The useful Davis pattern is the silent detector and the concrete lookup table. The rest is not copied. The toolkit keeps the stricter rule that lasting memory needs Mike's approval. | issue #269 c0 item 7; issue #269 c2, point 8; brainstorm 2026-07-28 lines 35-38 |

### Rejected during the 2026-09 refinement

| Approach | Why it was dropped | Where recorded |
| --- | --- | --- |
| The per-message memory reminder | It asks the same question on every prompt whatever happened, so it becomes background noise. Firing constantly and firing usefully are different things. | issue #269 c0 item 7; issue #269 c7, "Worth naming"; issue #269 c8, requirement 7 |
| A one-line reminder on every prompt as a lighter replacement | Same noise, no new information. | issue #269 c8, "What was rejected and why" |
| `PostToolUse` on commits or on the agent tool as the save-moment trigger | Fires per event, which is the noise that was already rejected. | issue #269 c8, same section |
| `SubagentStop` as the save-moment trigger | Twenty subagents would mean twenty fires. Let them all land and check once. | issue #269 c7, "Recommended amendment" |
| A `Stop` hook that reads the transcript | The transcript is written asynchronously, may lag, and its shape is undocumented. Git is documented and testable. | issue #269 c8, "What was rejected and why" |
| Exit code 2 on the `Stop` hook | It is labelled a hook error, not feedback. | Same |
| `CLAUDE.md` `@` imports for the static startup parts | A plugin cannot ship a `CLAUDE.md` line, so enabling the plugin would not deliver the briefing. Codex expands no import syntax. | issue #269 c8, requirement 10 rejections |
| The knowledge manual as a skill body | Codex has no skills, and the managed copy would have two homes. | Same |
| A marker line the agent has to echo back | Needs a model call and trusts compliance. | Same |
| Two hooks to get around the 10,000-character cap | It would work, but it hides a large briefing instead of shrinking it. | Same |
| Per-part startup character caps (`SOUL.md` 600, manual blocks 1,694, `project.md` 1,500, `current.md` 3,000, each index 700, total 8,194) | Every one of those numbers was invented by an agent during design. Claude Code neither knows nor enforces them. The recommendation was to drop them and keep the 10,000 total as the one hard rule. Mike never answered. | issue #269 c6 decision 1; issue #269 c9 |
| A 2,000-character then 3,000-character cap on `current.md` | Replaced. The PRD now says 5,000. | issue #269 c6 decision 1; PRD line 1469 |
| A per-memory-file size cap | Removed during the walkthrough reconciliation on 2026-09-15. | issue #269 c1, 2026-09-15 entry on the 18 fixes; PRD lines 1069 and 1469 |
| One deliberate copy of the startup loader for Codex | Dropped. `.codex/hooks.json` already resolves a path at run time, so it can resolve the installed plugin version the same way. | issue #269 c7, "Conflict 6 settled" |
| Declaring the second brain Claude-Code-only and dropping Codex | Rejected. Mike chose equipped but ungated. | issue #269 c7 |
| A fixed five-bullet proposal shape (`Why`, `Where`, `From`, `Unsure`, `Checked`) | Replaced by the card in requirement 20: a topic name, `Change`, `Summary`, and `Your decision`. The fixed bullet list is explicitly not required. | PRD lines 1409-1411; the old shape is still in the shipped manual at `knowledge/README.md` lines 180-201 |
| Word-for-word approval of the entry the owner would get | Replaced by summary approval on 2026-09-13. The summary is not a word-for-word preview, and reading the full text is optional. | PRD lines 1387-1390 and 1406-1407 |
| An `Uncertain` or `Unsure` line attached to a card | Banned. Settle the question before the card appears. Approving a save is not a request for the owner to investigate something else. | PRD lines 1423-1427 |
| The twelve design sub-issues #273 to #284, and their designs | Deleted on 2026-09-09. Design starts fresh from the finalized PRD. | issue #269 c1, 2026-09-09; issue #269 body, "Work records and related scope" |
| The `docs/designs/` folder as the home for this item's design | Dropped on 2026-09-09. Detailed design belongs with the delivery work tracker. | issue #269 c1, 2026-09-09; issue #269 body, "Work records and related scope" |
| A self-ignoring `.claude/second-brain/` review-record folder, and the whole `review.mjs` propose-and-decide tool | An agent build decision on 2026-09-03 that belonged to the deleted sub-issue design. Not a live decision. | issue #269 c6 decisions 3, 4, and 5 |
| Building a search engine, another reasoning engine, or a scorer that grades whether a search was good enough | Forbidden by requirement 29. Claude Code and Codex stay responsible for reasoning and search. | PRD lines 1676-1688 |
| A custom blocker, a program that reads the agent's replies, a single fixed search route, or a counter of sessions | Not required just because it could be built. | PRD lines 534-536 |
| memsearch, Mem0, session-memory services, a `.memory/` layout, and provider interfaces | Exploratory history from an outside report. Not requirements. Native agent search and a thin policy layer come first. | PRD lines 1931-1935 |
| The unpublished PRD skill draft `misc/SKILL (2).md` | Mike chose to delete it on 2026-09-15. | issue #269 c1, 2026-09-15 |
| The `writing-guard` and `style-reminder` hooks | `writing-guard` refused a finished reply after it was already on screen, so Mike read the same answer twice. `style-reminder` was per-message overhead for something the harness already redelivers. The toolkit ships neither. | `.claude/toolkit-sync.md` lines 219-250; `.claude/rules/README.md`, section "Voice is not a rule" |
| Fixed memory body headings such as "Current understanding" and "Reason for the decision" | Not required. The body is flexible. | PRD lines 975-976 |
| A separate index of incoming links, or forced backlinks | Not required. Search the project for the file name. | PRD lines 986-988 |

---

## Section 3. Preferred solution direction, in Mike's words

These are the exact quotations that are recorded. Each one has a date and a
source. Use them to check a design against what he actually said.

### On the shape of the system

- 2026-08-04, on the old system: "this is just a very brutal and not elegant memory system" and "there has to be a better way to do this."
  Source: `knowledge/brainstorms/2026-08-04-memory-system-cost-and-correctness.md` lines 16-17.
- 2026-08-04, on what the real problem was: "a few minutes is fine, but the problem is there seems to be a lot of correcting and back and forth and it ends up just being in like a loop."
  Source: same file, lines 26-28.
- 2026-08-04, on keeping an index: "I feel like we need an index right? or some map? we can't just cut it right?"
  Source: same file, line 35.
- 2026-08-04, on not patching around a bad prompt: "why wouldn't today just identify that nothing is saving it and move on? what's the design flaw from today's session?"
  Source: same file, lines 36-37.
- 2026-09-03, on Codex: "codex should be aware of the system yes."
  Source: issue #269 c7, "Conflict 6 settled".
- 2026-09-09, on the System Guide: "I think that is good", then on 2026-09-10 "please build it".
  Source: issue #304 body, "Approved direction".

### On what counts as memory

All of these are recorded in `knowledge/memory-self-improvement.md`, in the
"Recent decisions" section, at the line given.

- 2026-08-31, on a proposal naming its destination: "in the fucking memory system, it should say whether you're proposing a memory or a spec." Line 48. Note: requirement 20 now meets this with a destination heading per group of proposals, not with an arrow on each card (PRD lines 1394-1396).
- 2026-09-08, on episodes: "it recognized that it was a significant project episodic event ... that is relevant stuff to the project." Line 50. Now PRD lines 761-767.
- 2026-09-08, on solo agent work: "we shouldn't have every tiny tool call resolution ... where there was no human interaction in it." Line 51. Now PRD lines 752-754 and 784.
- 2026-09-09, on the story behind a rule: "we don't need the story behind the rule." Line 53. Now PRD line 793.
- 2026-09-09, on a procedure's traps: "that shouldn't be a memory." Line 54. Now PRD line 1241.
- 2026-09-09, on restating code: "I don't want to just have a one-to-one regurgitation of what the code already says." Line 55. Now PRD line 789.
- 2026-09-09, on a proven trap in the project's own tools: "fine as long as it won't introduce junk." Line 56. Now PRD line 785.

### On friction

- 2026-09-08, on writing his answers into the PRD instead of an issue: "This is sort of the red tape and the friction that I'm talking about ... Don't write it to an issue that'll get lost later, and then the PRD never gets updated."
  Source: `knowledge/memory-self-improvement.md` line 52. Now PRD line 133.

### The example Mike gave for the glossary

- He said "match on the discovery email field and the core email field", and expected the agent to know exactly which two fields those were, like a colleague who had been on the project for years.
  Source: PRD line 627.

### The gap Mike found in the design

- 2026-09-03: he asked whether the agent would notice a save moment after a significant event, and gave this example: twenty subagents run research, and the result is persisted in the repository. The answer was no. Neither the prompt detector nor the command gate would fire, and the every-turn reminder would not have caught it either. A third trigger was proposed, based on what the session did, not on what the owner said or ran. It was never approved.
  Source: issue #269 c7, "A gap Mike found: work that never announces itself".

### The preferred architecture written into the PRD

This is the preferred direction section, not an approved design. PRD lines
1797-1951.

- Keep the capable coding agent at the center. Repository instructions and one canonical knowledge manual teach the policy. A thin layer connected to supported runtime events gives timely reminders, tracks a few session facts, and checks consequential writes. The policy survives changes in vendor integration. Lines 1811-1824.
- For Claude Code, investigate stateful function-style hooks or "mods" as the leading long-term option when they are available and stable, with ordinary hooks as a fallback. Verify both against current official documentation and practical tests before choosing. Lines 1826-1831.
- The parts and their jobs: root instructions are the employee handbook; the knowledge manual is the knowledge handbook; skills hold task-specific procedures with templates and completion checks; a hook is a doorbell that reacts at a useful moment; a stateful hook or mod is a lightweight supervisor that remembers a few session facts; Claude Code or Codex is the engineer that searches, reasons, and solves. Lines 1837-1844.
- The six current skills (`recall`, `remember`, `retire`, `reflect`, `session-search`, `second-brain`) are a starting point, not a requirement to keep six skills, their names, or their boundaries. Lines 1878-1906.
- Mike's sources for this direction: his "Designing An AI Operating System" ChatGPT conversation at https://chatgpt.com/c/6aa4a93c-7c7c-83ea-b3df-a20043c0a966 and the supplied `ai-agent-memory-frameworks-decision-report.md`, especially sections 26 and 27. Lines 1806-1809.

---

## Section 4. Open questions

### The two questions pending before Mike approves the PRD

1. **Does this PRD's own frontmatter get the `group` and `updated_at` fields
   that requirement 16 requires?**
   The PRD frontmatter at lines 1-12 has `summary`, `area`, `status`, `source`,
   `created_at`, `confirmed_at`, `tags`, `project`, and `work_item`. It has no
   `group` and no `updated_at`. Requirement 16 at line 1195 says the required
   fields are `summary`, `group`, `area`, `status`, `source`, `created_at`,
   `updated_at`, and `tags`. Recorded as open in `knowledge/current.md`,
   section "Next step", and in issue #269 c1, entry dated 2026-09-15.

2. **The walkthrough's inbox example card uses a "New wording" block that
   requirement 20 rules out.**
   The example card is in the walkthrough's Part 4 pending-inbox example. In
   `walkthrough-text.txt` it is lines 636-640, and it reads `**Change:**`, then
   `**New wording:**` with a block quotation, then `**Your decision:**`.
   Requirement 20 at PRD lines 1401-1404 says a card shows a numbered topic
   name, `Change`, `Summary`, and `Your decision`, and PRD lines 1387-1390 say
   the summary is not a word-for-word preview of the full entry. Recorded as
   open in `knowledge/current.md`, section "Next step", and in issue #269 c1,
   entry dated 2026-09-15.

### Other questions named as open on 2026-09-15 but not yet answered

3. Requirement 16 has a line saying approval fields are required once the
   requirements are approved, even while the PRD is still `proposed`
   (PRD lines 1198-1200). Flagged for Mike in issue #269 c1, entry dated
   2026-09-15.
4. Requirement 9 contains three exclamation marks: "saved directly to the
   default branch and pushed!!!" at PRD line 678. Flagged in the same entry.
   The shipped manual has the same style problem at `knowledge/README.md`
   lines 7-9.

### The approval steps themselves

5. Mike has not approved the full requirements as ready for solution design or
   building. The PRD is still `proposed`.
6. The PRD has not been set to `finalized`, and `approved_by` and
   `approval_date` have not been recorded.
7. Mike has not recorded acceptance of the issue's PRD-finalization outcome.
   All three are unchecked boxes in the issue #269 body, section
   "Completion criteria", and in section C of its roadmap.

### Items the PRD leaves to the solution design

These say "the design decides" or equivalent. Do not treat any of them as
already settled.

| Question | PRD lines |
| --- | --- |
| Which documented harness feature brings the needed guidance back at each moment, and delivers requirement 3's checks | 487, 530-536, 1721-1723 |
| Which conditions the harness can check or block by itself, and which depend on the agent's understanding | 530-533 |
| Where the owner's memory-selection feedback is stored, what a record of it looks like, and how it is read, written, and tidied | 918, 1286, 1556-1558 |
| The one fixed rule for ordering the index groups and the files inside a group | 1462 |
| How the glossary's meanings reach the agent from the first message of a session | 616 |
| Whether the current six skills are kept, combined, renamed, replaced, or removed | 1878-1906 |
| The full mapping of each requirement to an implementation mechanism. This is named as a future design task, not to be done during refinement | 1913-1927 |
| Which documented events can deliver startup guidance, recover it after context loss, and check consequential writes on each harness | 1939-1941 |
| The smallest useful session-state model, and how it avoids treating an old acknowledgement as proof that current guidance is available | 1941-1942 |
| How write checks cover actual edits and existing approval without a large controller or blocking legitimate work | 1943-1944 |
| How representative sessions will expose missed obligations, false blocks, repeated reminders, context overhead, and damage to ordinary work | 1945-1946 |
| Which triggers and enforcement mechanisms the walkthrough's required outcomes use | walkthrough-text.txt lines 25-27 |

### Open items recorded on issue #269 for the delivery stages

8. How the shipped knowledge manual is brought in line with the finalized PRD,
   including a possible refactor. Mike decides; the agent may propose.
   Issue #269 body, roadmap section D.
9. Which delivery tracker the roadmap from PRD finalization to shipping lives
   in. Issue #269 body, roadmap section D.
10. Whether the build is split into work items, and which requirements each
    delivers. Issue #269 body, roadmap section D.

### Open items from the startup-size work that Mike never answered

11. Whether the per-part startup caps should exist at all, or whether the
    10,000-character total is the only hard rule with a soft warning near
    8,000. Recommended on 2026-09-05 and never answered. issue #269 c9.
12. Whether to trim `knowledge/project.md` and the specification index, or
    raise the caps. issue #269 c8, "Flag for Mike".
13. The amendment adding a third save-moment trigger based on what the session
    did. Proposed on 2026-09-03 and never approved; its sub-issue was later
    deleted. issue #269 c7, "Recommended amendment".

### Open items on the neighbouring issues

14. Issue #306 has eight open boundaries in its "Conflicts and decisions still
    open" table. Several concern the knowledge system. See section 6.
    `knowledge/prds/toolkit-operating-system.md` lines 499-509.
15. Whether the component PRDs, including this one, become children of the
    operating-system PRD. `knowledge/prds/toolkit-operating-system.md`
    lines 38-42 and 506.
16. Issue #337's next question: what the owner sees immediately after accepting
    guided work management. Issue #337 body, "Current position".
17. Issue #305, the reusable-rules audit, is at
    `03-requirements-approved` with no design and nothing built. Issue #305
    body, "Where this stands".
18. Issue #304's remaining step: a fresh-chat check that the agent picks the
    System Guide lookup and update on its own. The System Guide PRD stays
    `proposed` until that behavior is accepted. Issue #304 body,
    "Current state".

---

## Section 5. Walkthrough versus PRD differences

Mike approved the walkthrough in full on 2026-09-15. On that same date an Opus
check found four disagreements with the PRD. Two were fixed in favour of the
walkthrough under the standing reconciliation permission. Two were left for
Mike. Source: issue #269 c1, entry dated 2026-09-15, and commit 644de6c.

### Fixed in favour of the walkthrough

| What changed | Walkthrough location | PRD location |
| --- | --- | --- |
| Requirement 17 and the requirement 18 row now name the runtime's own skill location and the skill-authoring process, rather than a fixed `.claude/skills/` path with no process | walkthrough-text.txt line 416 | PRD lines 1238-1239 and 1280 |
| Requirement 3 now lists the shared-context and pending-inbox completion checks | walkthrough-text.txt lines 163-169 | PRD line 519 |

### Left for Mike, still unreconciled

| What differs | Walkthrough location | PRD location |
| --- | --- | --- |
| The pending-inbox example card uses a `**New wording:**` block with a block quotation of the exact entry text. Requirement 20 defines a card as topic name, `Change`, `Summary`, `Your decision`, and says the summary is not a word-for-word preview | walkthrough-text.txt lines 636-640 | PRD lines 1387-1390 and 1401-1411 |

### The earlier reconciliation, for context

On 2026-09-15 an audit found 18 places in the PRD to fix against the walkthrough
and 19 rules already matching. All 18 were applied. They were: the three ordered
startup reads with a completion check before the confirmation; instructions read
before any governed action; an explicit memory-relevance decision with a
no-lookup branch; summary approval replacing exact-wording approval in
requirements 10 and 20 and in the example card; no per-file memory size cap in
requirements 14, 15, and 21; the output-style rule for agent-written text;
read-back validation; the interrupted-session resume case; and the layout paths
`SOUL.md`, `prd-index.md`, and `memory-inbox.md`. Source: issue #269 c1, entry
dated 2026-09-15.

### Things that now agree, so do not "fix" them

I checked these directly. The two documents say the same thing:

- Startup read order and the one confirmation. Walkthrough lines 93-133; PRD lines 272-285 and 480-482.
- The five forced review moments. Walkthrough line 352; PRD line 674.
- The approval-off setting and its scope. Walkthrough line 668; PRD line 717.
- `finalized` meaning requirements approved, not delivered. Walkthrough line 412; PRD lines 1130 and 1211.
- The PRD required fields, including `group` and `updated_at`. Walkthrough line 483; PRD line 1195.
- The memory required fields and the flexible body. Walkthrough lines 438-445; PRD lines 926-984.
- The two size checks, 200 and 5,000. Walkthrough line 654; PRD line 1469.
- The glossary format and its exclusion from the memory index. Walkthrough line 569; PRD lines 619-620 and 923.
- The harness and conversation ID on each inbox entry. Walkthrough line 630; PRD line 1642.
- Ask before creating a work item. Walkthrough line 211; PRD lines 791 and 836.
- The current skills are design starting points, not required command names. Walkthrough line 806; PRD lines 1582 and 1880-1883.

### Which part was approved when

| Part | Approved | Walkthrough line of the stamp |
| --- | --- | --- |
| 1. Read the required startup files | 2026-09-12 | 55 |
| 2. Understand the request and current work | 2026-09-13 | 137 |
| 3. Use relevant knowledge to do the work | 2026-09-13 | 230 |
| 4. Decide what to save from the work | 2026-09-15 | 342 |
| 5. Fix knowledge problems when needed | 2026-09-15 | 772 |
| 6. Prepare a handoff and resume the work | 2026-09-15 | 824 |
| The full flow | 2026-09-15 | 904 |

---

## Section 6. Cross-PRD conflicts, with line numbers on both sides

### 1. The System Guide folder layout

The knowledge PRD and the System Guide PRD describe two different folder
structures for the same plugin.

- Knowledge PRD: `knowledge/system-guide/`, holding `system-guide-index.md`
  and a `system-guide-entries/` folder with one page per area.
  PRD lines 168-172, 179-180, 316, 1133, 1279, and 1460.
- System Guide PRD: `knowledge/system/`, holding `README.md`, `tour.md`, and
  eight section folders (`business/`, `data-model/`, `objects/`, `fields/`,
  `processes/`, `relationships/`, `applications/`, plus added areas), each with
  its own `README.md` index and separate `generated/` and `meaning/` folders.
  `knowledge/prds/system-guide.md` lines 66, 72, 194-211.

The System Guide PRD is the one Mike approved and told the agent to build
(issue #304 body, "Approved direction"). The System Guide PRD also says the
two documents must agree, and that adding the guide to the find order is a
required change to the neighbour (`system-guide.md` lines 84-87). A designer
must decide which path is real and say so; do not silently pick one.

### 2. The glossary path

- Knowledge PRD: `knowledge/memory/memory-entries/terminology-glossary.md`.
  PRD lines 612, 594, 626, 1285, and 1313.
- System Guide PRD: `knowledge/glossary.md`.
  `knowledge/prds/system-guide.md` line 125.

### 3. Whether a glossary always exists

- Knowledge PRD: the system ships one glossary file in every equipped project.
  PRD lines 612 and 616.
- Operating-system PRD: "A glossary, when available ... No glossary file is
  assumed to exist." `knowledge/prds/toolkit-operating-system.md` lines 229-231.
- System Guide PRD: use an existing glossary when available; its absence does
  not stop guide use. `knowledge/prds/system-guide.md` lines 126 and 291-293.

These are reconcilable, because the guide can be enabled without the second
brain. State that reading explicitly rather than leaving the reader to work it
out.

### 4. Roadmap ownership: the OS PRD row is out of date

- Operating-system PRD, open-conflicts table: "Second-brain requirement 16
  requires a PRD roadmap for a large feature."
  `knowledge/prds/toolkit-operating-system.md` line 507.
- Knowledge PRD now says the opposite: build order, delivery roadmaps,
  implementation tasks, schedules, work-item status, and detailed solution
  designs do not belong in a PRD. PRD lines 1137 and 1183-1184.

The knowledge PRD settles this row. The OS PRD has not been updated.

### 5. Small-request lookup: the OS PRD row is out of date

- Operating-system PRD: "Second-brain requirements 5 and 19 require the same
  knowledge search for every task or question ... Does that include
  self-contained requests unrelated to project knowledge?"
  `knowledge/prds/toolkit-operating-system.md` line 501.
- Knowledge PRD now answers it: work out what the owner is asking, then decide
  once whether long-term project knowledge could affect the answer. If no,
  carry on with no memory lookup. PRD lines 592-593.

The knowledge PRD settles this row. The OS PRD has not been updated.

### 6. Draft refinement and save cards: the OS PRD row is out of date

- Operating-system PRD: "Second-brain requirements 9 and 10 call for a card and
  yes for each PRD save." `knowledge/prds/toolkit-operating-system.md` line 502.
- Knowledge PRD now says permission to refine a named PRD covers writing down
  the owner's clear answers in the same reply, with no second approval question.
  PRD lines 671 and 705-709.

The knowledge PRD settles this row. The OS PRD has not been updated.

### 7. Hard refusals and completion: still genuinely open

- Operating-system PRD: "Second-brain requirement 3 proposes forced save-review
  moments. Upkeep favors adaptable stages and deliberately allows an unapproved
  local Done record while reporting the gap ... Specify the effect of
  knowledge-review failures on work completion before design."
  `knowledge/prds/toolkit-operating-system.md` line 503.
- Knowledge PRD says a failed knowledge save pauses only that save and the work
  that depends on it. PRD lines 556-567.
- Work-item upkeep PRD says the local tool records `Done` even when approval is
  missing, reports the gap, and warns during validation.
  `knowledge/prds/work-item-upkeep.md` lines 42-44.

The knowledge PRD does not say whether a missed knowledge review blocks
completion. Mike's 2026-09-02 direction said completion stays blocked
(issue #269 c0 item 3), and the 2026-09-09 list says the pull-request hold
stays until the review is done (issue #269 c1). The exact mechanism is a design
question, and the OS PRD row is still open.

### 8. The knowledge-format transition: still open, and assigned here

- Operating-system PRD: "The manual and proposed second brain still differ on
  naming and metadata ... Keep the remaining transition with #269."
  `knowledge/prds/toolkit-operating-system.md` line 504.

The differences between the shipped manual and the PRD, as of 2026-09-15:

| Topic | Shipped manual | Knowledge PRD |
| --- | --- | --- |
| Startup read order | `SOUL.md`, then `knowledge/README.md`, then `knowledge/project.md` | `SOUL.md`, then `knowledge/project.md`, then `knowledge/README.md` |
| Lines | `knowledge/README.md` lines 13-17 | PRD lines 272-275, 480 |
| Meaning of `finalized` | "settled after the build" | requirements approved and ready for design or building |
| Lines | `knowledge/README.md` lines 133-135 | PRD lines 1130, 1211 |
| Owner-edited wording | "If the owner edits the words, use those words exactly." | use the corrected meaning; keep exact words only when the owner asks for them verbatim |
| Lines | `knowledge/README.md` lines 208-209 | PRD line 713 |
| Whole-file delete reasons | three: a duplicate made by mistake, a secret, something never true | four: those three plus a redundant original after an approved consolidation |
| Lines | `knowledge/README.md` line 227 | PRD line 1520 |
| Approval | "Nothing writes ... without the owner's clear approval." | plus the per-project setting that turns the approval step off for memory writes |
| Lines | `knowledge/README.md` lines 175-178 | PRD line 717 |
| Memory location | flat under `knowledge/memory/` | `knowledge/memory/memory-entries/`, with topic folders allowed |
| Lines | `knowledge/README.md` line 143 | PRD lines 918-920 |
| Proposal shape | headline with an arrow, a block quotation, and five bullets `Why`, `Where`, `From`, `Unsure`, `Checked` | topic name, `Change`, `Summary`, `Your decision`, and no fixed bullet list |
| Lines | `knowledge/README.md` lines 180-201 | PRD lines 1401-1411 |
| PRD index filename | `knowledge/prds/spec-index.md` | `knowledge/prds/prd-index.md` |
| Lines | `knowledge/README.md` line 20 | PRD lines 166 and 1460 |
| Working memory | `knowledge/current.md` | `knowledge/memory/current.md` |
| Lines | `knowledge/README.md` line 18 | PRD lines 164 and 804 |
| Memory feedback | `knowledge/memory-self-improvement.md`, capped at 8,000 characters | no fixed home; the design chooses |
| Lines | `knowledge/README.md` lines 35 and 244-250; `knowledge/memory-self-improvement.md` line 13 | PRD lines 1286 and 1556-1558 |

The first five rows are already listed as build work in the issue #269 body,
roadmap section E. The rest I found by comparing the two files directly.

The shipped original is
`plugins/second-brain/skills/second-brain/references/templates/knowledge/README.md`.
`knowledge/README.md` is its installed copy, and
`tests/installed-copy-check.mjs` keeps the two matching. Change the original.

### 9. The generated PRD index does not follow requirement 21

`knowledge/prds/spec-index.md` is a flat list with no `group` headings, and its
header is nine lines long. Requirement 21 says the index is grouped under short
topic headings taken from each file's `group` field (PRD line 1462) and that the
header above the entries is two lines at most (PRD line 1466). The index also
says "Only a current PRD is settled truth", which the PRD replaced with
`finalized` (PRD line 1210). The index is generated, so this is fixed in
`plugins/second-brain/tools/build-knowledge-index.mjs`, never by hand
(issue #269 body, roadmap section E).

### 10. Things that agree, and are settled

- Direct commit of authorized knowledge saves to the default branch.
  `knowledge/prds/toolkit-operating-system.md` lines 435-458 and 511-513;
  PRD lines 678-687; `.claude/rules/knowledge-direct-commit.md` lines 5-16.
- The approval-field format for an unapproved proposed PRD.
  `knowledge/prds/toolkit-operating-system.md` lines 298-302 and 515-517;
  PRD lines 1195-1208.
- Preserving other sessions' work in shared knowledge files.
  `knowledge/prds/toolkit-operating-system.md` lines 336-345 and 508;
  PRD lines 852-854 and 1648.
- No folder `CLAUDE.md` under `knowledge/`.
  `knowledge/prds/folder-instruction-files.md` lines 43-49.

---

## Section 7. Interlocks: what each other component owns

| Component | Where it is defined | What it owns | What it hands to the knowledge system | What the knowledge system needs from it |
| --- | --- | --- | --- | --- |
| Toolkit Operating System | `knowledge/prds/toolkit-operating-system.md`; issue #306 | The whole working experience and the agreements between components. R1-R25, each with a check. R25 is shipped; the rest are proposed. | A short, accurate session orientation (R6, line 150); the source-choice rule (R9, line 184); the conflict-resolution rule by kind of claim (R12, line 244); the quick-save route for `knowledge/` files (R25, line 435). | Do not build a competing knowledge policy or routing table (R11, lines 220-225). Do not force every question to create a work item (PRD line 1778). Report a missing part as a gap; never hand its work to memory (PRD lines 1780-1782). The alignment table is at PRD lines 1769-1776. |
| System Guide | `knowledge/prds/system-guide.md`; issue #304 | Explanations of how an existing system is put together and why: objects, fields, processes, relationships, sub-applications. Its own content rules, template, approval, refresh, deletion, startup pointer, and sync report. | Its own index and pages for tier 4 of the find order, and its own card format inside its own proposal section. | The second brain's routing table must point system descriptions at the guide's real location when it is on, and say "not configured" when it is off (PRD line 1279; `system-guide.md` lines 300-307). Memory keeps only the decision or the trap and links to the guide page (PRD line 1279). When both are on, show the guide startup information once, not twice (`system-guide.md` line 317). The guide is not part of the second brain and has its own PRD (PRD line 1133). |
| Work tracker and work-item upkeep | `knowledge/prds/work-item-upkeep.md`; issue #270, delivered | One item's requirements, progress, blockers, next step, approvals, and completion. Stages and their meaning. The `Done` and `Cancelled` rules. | A dependable completion event that the knowledge system reacts to. Real scope and status for the briefing, so `current.md` is not the authority. | The knowledge system links to tracker records and never copies them (PRD lines 335, 401, 1287). It never becomes a second owner of work-item state (`work-item-upkeep.md` lines 53-56). `current.md` is checked against the tracker before it is trusted (PRD line 853). The knowledge system asks before creating a work item (PRD lines 791 and 836). |
| Guided delivery | `knowledge/prds/guided-delivery.md`; issues #300 and #302, delivered | The way one conversation guides an item: interviews, designs, bounded specialist help, adaptable plans. Recognizing permission already given. | The rule that ideas about how to build go only in notes at the bottom of a PRD, clearly labelled, binding nothing (`guided-delivery.md` lines 51-55). Authorized draft corrections saved promptly (lines 41-44). | The knowledge system's requirement 16 must not require a second design record or planner (PRD lines 1183-1184). Helpers cannot approve a save (`guided-delivery.md` lines 65-67). |
| Guided work management | `knowledge/prds/guided-work-management.md`; issue #337 | Guiding work from the owner's first idea through delivery, and keeping shared records current. Proposed; not approved. | Nothing yet. | Its own notes say to examine the knowledge system together with the chosen tracker for requirement 5, because readable local files do not by themselves share work between computers (`guided-work-management.md` lines 170-173). |
| Rules audit | issue #305 | One recorded disposition for every reusable rule the toolkit can put in a project's `.claude/rules/`. Approved requirements; no design, nothing built. | The final set of rules a project receives, and which are universal, optional, or path-scoped. | The knowledge system must not put a standing instruction in memory; it goes to the rules workflow (PRD lines 400 and 1277). `.claude/rules/knowledge-direct-commit.md` is the rule that owns the publication procedure (PRD lines 685-687). |
| Folder instruction files | `knowledge/prds/folder-instruction-files.md`; issue #219, delivered | A short `CLAUDE.md` in each major folder, written by setup and audited by sync. | The rule that `knowledge/` and everything under it is skipped, so the knowledge system stays the one authority there. | Do not add `knowledge/CLAUDE.md`. `knowledge/prds/folder-instruction-files.md` lines 43-49. |
| project-init and project-sync | `plugins/project-init/`; PRD requirement 27 | Turning the second brain on in a project, in one complete step, and checking and reporting the result. | An equipped-or-not report that names the version, and never reports a half-finished setup as working. | The report must state every time that the save gate does not apply in Codex (issue #269 c7). Setup shows the routing table and one example per row (PRD line 1308). Sync preserves an existing glossary (issue #269 c0 item 12). |
| Captured Claude Code documentation | `ai-external-knowledge/claude-code/`; `.claude/rules/claude-code-docs-first.md` | Anthropic's own pages, saved as published. | The facts a design must be built on for hooks, skills, plugins, agents, commands, output styles, and settings. | Requirement 26 says every shipped part is built the way the captured documentation says, and the design names the page it followed (PRD lines 1599-1610). Read the page before building the part. |
| Skills | The runtime's skill location; PRD requirement 17 | Repeatable procedures, their steps, their traps, and their own approval and delivery rules. | A place for any procedure the knowledge review finds. | A procedure is never saved as a memory file (PRD line 1240). The knowledge save card is not used for a skill (PRD line 1239). |
| Output style | `.claude/output-styles/plain-english.md`; `.claude/settings.json` line 2 | How the agent writes. | The language and presentation rules that apply to agent-written text in proposals, memories, and PRDs. | Requirement 15 says read it before preparing a proposal or writing anything saved, and point to it rather than copying its rules (PRD lines 1100-1109). Note that the style never reaches a helper agent or a Codex session, which is why `.claude/rules/plain-english-artifacts.md` exists. |

---

## Section 8. What a designer would otherwise get wrong

1. **Nothing is approved to build.** The PRD is `proposed`. The walkthrough is
   approved, but approving it is not approval of the PRD, a solution design, or
   implementation. Issue #269 body, "Completion criteria"; walkthrough-text.txt
   line 904.

2. **Most of the design detail on issue #269 is dead.** Comments c5, c6, c7,
   c8, and c9 describe a twelve-sub-issue design built around
   `save-gate.mjs`, `review.mjs`, `save-moment-detector.mjs`,
   `session-work-check.mjs`, a `.claude/second-brain/` review record, and a
   `STARTUP_BLOCKS` loader list. Those sub-issues #273 to #284 were deleted on
   2026-09-09 and design starts fresh. Read those comments for evidence and for
   what was already ruled out, never as a plan. Issue #269 c1, 2026-09-09;
   issue #269 body, "Work records and related scope".

3. **Within those dead comments, separate Mike's decisions from agent
   decisions.** In c6, Mike settled conflict 1 (the `current.md` cap) and held
   conflict 6 (Codex). Conflicts 2, 3, 4, 5, and 7 were decided by an agent so
   Mike could overrule them on sight. Do not quote an agent build decision as
   Mike's.

4. **The folder layout in the PRD is planned, not current.** Today the
   repository has `knowledge/memory/*.md` flat (four files),
   `knowledge/current.md`, `knowledge/prds/spec-index.md`,
   `knowledge/memory-self-improvement.md`, and no `knowledge/memory-inbox.md`,
   no `memory-entries/`, no `prd-index.md`, and no glossary. Verified by
   listing `knowledge/`. The PRD layout is at lines 144-173. A migration is
   part of the work.

5. **Change the shipped original, not the installed copy.** The knowledge
   manual ships from
   `plugins/second-brain/skills/second-brain/references/templates/knowledge/README.md`
   and `knowledge/README.md` is its installed copy.
   `tests/installed-copy-check.mjs` fails when they stop matching.
   `CLAUDE.md`, closing line of the codemap section.

6. **Codex cannot enforce the gate.** Codex has no `PreToolUse` equivalent, so
   a Codex session can run `work finish` or `gh pr create` with no completion
   review. Mike accepted that gap on condition that the project-sync report
   names it every time. Issue #269 c7; PRD line 1592.

7. **The 10,000-character hook output cap is measured, not documented.** It was
   reproduced on Claude Code 2.1.259: output over 10,000 characters reaches the
   agent as a preview plus a file path. Re-check it on each upgrade. Issue #269
   c5, "Corrections recorded on 2026-09-02"; issue #269 c8, "Up front".

8. **The current briefing is already being cut.** At the time of measurement
   this repository's startup output was about 17,600 characters and DragonFly's
   about 29,800, so the agent received a preview and the manual's opening and
   nothing after it. Issue #269 c8, "Up front"; issue #269 c5, "Findings from
   the sub-issues".

9. **A hook that matches only `Bash` can be bypassed from PowerShell.** Every
   new hook matcher uses `Bash|PowerShell`. Issue #269 c5, "Findings from the
   sub-issues"; issue #269 c6, "Two more, while they are in view".

10. **A plugin `SessionStart` hook must print plain text.** JSON
    `additionalContext` from a plugin `SessionStart` hook is not surfaced.
    Issue #269 c5, "Findings from the sub-issues".

11. **Do not add a size cap to a memory file.** It was removed on purpose.
    PRD lines 1069 and 1469.

12. **Do not bring back exact-wording approval.** The owner approves the
    operation, the meaning, and the scope. Reading the full text is optional.
    PRD lines 1406-1407.

13. **Do not bring back a per-message reminder in any form.** PRD lines 675-677;
    issue #269 c8.

14. **Requirement 29 is a limit on the design, not a feature.** Start with a
    small set of safeguards aimed at the failures that would damage trust. Add
    restrictions only when a failure that actually happened calls for them. Do
    not watch or control every action just because it is possible.
    PRD lines 1697-1700.

15. **`knowledge/` is in Git, and Git keeps every past version.** A secret
    written there is not removed by deleting it later. PRD line 795.

16. **A knowledge save has its own publication procedure.** It commits to the
    default branch from the default-branch checkout, stages only its own paths,
    never uses `git add -A`, rebuilds the indexes, runs the checks, and pushes.
    `.claude/rules/knowledge-direct-commit.md` lines 17-40.

17. **The generated indexes are a collision point between parallel sessions.**
    Two sessions saving on different branches can both change them, and Git can
    merge both with no reported conflict and still leave the result wrong. The
    answer is that nobody edits them by hand and the builder is run again after
    bringing a branch current. `.claude/toolkit-sync.md` lines 174-187;
    `CLAUDE.md`, tools table.

18. **Every subagent runs on Opus.** Pass `model: opus` when starting one, even
    though two settings values force it. `.claude/rules/subagents-run-on-opus.md`.

19. **The words inside any diagram or generated document follow the output
    style**, because the style never reaches a helper agent, a skill, or a
    Codex session. `.claude/rules/plain-english-artifacts.md`.

20. **The `knowledge-manual-voice.md` memory is retired.** It said Mike's own
    plainer prose in the manual must not be shortened. He approved retiring it
    on 2026-09-01, so that protection no longer applies.
    `knowledge/memory/knowledge-manual-voice.md`, frontmatter `status: retired`
    and the closing "Retired 2026-09-01" section.

21. **`docs/designs/` still exists on disk** (`docs/designs/README.md`), even
    though the 2026-09-09 decision dropped it for this work and the
    operating-system PRD says the deleted design folder is not to be restored
    (`knowledge/prds/toolkit-operating-system.md` lines 59-60). `CLAUDE.md`
    still lists it in the codemap. Ask before writing a design into it.

22. **Two documents describe the System Guide's folders differently.** See
    section 6, item 1. Raise it rather than choosing one.

23. **The operating-system PRD's open-conflicts table is partly out of date.**
    Three of its rows (small-request lookup, draft save cards, roadmap
    ownership) are now settled by the knowledge PRD. Do not treat them as open
    questions for Mike. See section 6, items 4, 5, and 6.

24. **The default criteria for what counts as memory apply from the first
    session**, even in a project with no feedback file. Project-specific
    learning is added on top of the defaults, never in place of them.
    PRD lines 1539-1547.

25. **Lessons stay in the project.** Upkeep inside one project never searches
    other projects, never changes shared instructions, and never rolls out a
    policy on its own. PRD line 1554.

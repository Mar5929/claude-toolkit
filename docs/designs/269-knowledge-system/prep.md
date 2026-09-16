# 269 The project second brain: design prep

Date started: 2026-09-15
Requirements: `knowledge/prds/knowledge-system.md`, and issue 269 on the
`Claude-Toolkit-Project` board
Design file: `docs/designs/269-knowledge-system.md`

This file was written after the design, on 2026-09-16. The design ran before
the toolkit had a solution-design template, so the sections below are filled in
from the design document and from `process.md` in this folder. Where the
template asks for something the work never produced, the line says so.

## What the requirements are for

The owner should not have to hold the state of the project in his own head; the
agent holds it for him. He runs several agent sessions at once in one VS Code
project, on different models and in two harnesses, and each session's context
fills quickly with requirements work, design, and reasoning. A session may be
compacted, cleared, or replaced while the others keep working. When this is
done, every new session already knows what has been going on in the project and
feels like the same agent rather than a stranger who has to be caught up; the
agent looks in the project's own knowledge before answering and names the file
it took the answer from; saving something worth keeping takes one short yes;
and the owner never reminds an agent to look something up, never says where
information belongs, and never repeats the save rules. Remembering too little
means he explains the same thing twice. Remembering carelessly is worse,
because a later agent believes information that is out of date and acts on it.

## Requirements that did not fit, and the owner's ruling

The design's section 13 holds the full entry for each row, with the reasoning
and with what changes in the design if the owner answers differently.

| Requirement | Why it seemed out of place | Owner's ruling | Date |
| --- | --- | --- | --- |
| 2, "confirm the contents were read" (PRD line 481) | No harness can observe reading. The line asks for a completion check that the contents reached the agent and were read | Yes, hook delivery in order counts as the read, and the check is that delivery finished | 2026-09-16 |
| 3 and 9, the quiet review at the end of every turn (PRD lines 524 and 674) | A review that finds nothing to save produces no output, and requirement 29 forbids a program that reads the agent's replies | Open | |
| 9 and 13, a push per decision and per working-memory change (PRD lines 681 and 854) | Read strictly it is a commit and a push for every settled decision on a shared default branch, which collides with other sessions | Open | |
| 14 with 10, `approved_by` when the approval step is off (PRD lines 940 and 717) | Requirement 14 says the field is never empty and gives no value for the case where approval is off | Open | |
| 18 and the layout, the System Guide paths (PRD lines 168 to 172 and 1279) | Two approved requirements documents name different folders for the same layout | Open | |
| 7, the glossary path (PRD line 612) | Two requirements documents put the glossary at two different paths | Open | |
| 17, the skill-authoring process (PRD line 1238) | It hands a proposal to a skill-authoring process the toolkit does not have | Open | |
| 16, "when work ships" (PRD line 1162) | The requirements document never defines shipping | Open | |
| 1, "nothing else" against Node scripts (PRD line 456) | The allowed list of parts does not name Node scripts, and the system is built from them | Open. The design records its own answer: a script a hook or a skill runs is part of that hook or skill | |
| 8 and 21, the outside-documentation index (PRD lines 652 and 1460) | The generated root index the requirement names does not exist today | Open. The design records its own answer: the builder generates it from each topic's entry page | |
| The preferred direction names function hooks (PRD lines 1826 to 1831) | Function hooks do not exist in any official Claude Code source | Open. The design records its own answer: build on documented command hooks and name one upgrade point | |
| 28, eight items per inbox entry (PRD line 1640) | Eight items is about nine lines of text for a case that should be rare | Open | |
| 25, "the same result in Codex" (PRD line 1592) | Codex cannot hold a compaction, has no `if`, `once`, or `args` field, and runs no hook until the person trusts hooks on that machine | Open | |
| 7, how the glossary reaches the agent from the first message (PRD line 616) | A large glossary cannot be printed at startup inside the character budget | Open | |
| The operating-system requirements document's open row on a failed knowledge review (`knowledge/prds/toolkit-operating-system.md` line 503) | Three documents give three answers to what a failed review does to work completion | Open | |
| The requirements document's own frontmatter has no `group` and no `updated_at` (PRD lines 1 to 12, against line 1195) | The document breaks the field rule it sets for every other document | Open | |
| The walkthrough's inbox card uses a "New wording" block (the approved walkthrough, Part 4) | The approved card carries a label requirement 20 does not name, and a word-for-word preview lines 1387 to 1390 rule out | Open | |
| 16, approval fields required while the document is still `proposed` (PRD lines 1198 to 1200) | `proposed` then carries two states a reader cannot tell apart without reading the fields | Open | |
| 9's three exclamation marks (PRD line 678) | The project's own output style forbids that emphasis, and the shipped manual repeats it | Open | |
| 18, where the routing table is delivered (PRD lines 1274 to 1308) | The routing table and its four-row test are 3,595 characters against a manual that must stay under 4,000 | Open | |
| Does `/clear` start a new session? (PRD line 481, and the standing rule) | The confirmation is given once at a new session start, and a new session is never defined against the five `SessionStart` sources | Open | |
| 21, size limits this design adds (PRD line 1469) | The requirement sets two size limits and says no other is set here. The design adds three | Open | |
| 9, saving during an authorized interview (PRD lines 696 to 701) | It asks for a save and a publish before the next question, with no second permission request | Open | |

## Requirements readiness

- Confidence, main conversation: not scored, design ran before the template
  existed.
- Confidence, product analyst: not scored, design ran before the template
  existed.
- What was missing, and how it was resolved: not recorded in this form. The 23
  rows above and the 27 questions in the design's section 15 are what the work
  produced instead.
- What was not explicit end to end, and the wording that fixed it: not recorded
  in this form. No requirement wording has been changed yet; questions 9 to 12
  in section 15 are the wording changes waiting on the owner.

### Where a builder could misread the requirements

| Requirement wording | Wrong reading | Intended reading | Fixed in requirements? |
| --- | --- | --- | --- |
| 2, "confirm the contents were read" | Build a check that proves the agent read each startup file | Delivery in order finished, proved by the map's last line appearing in the session | No, ruled on 2026-09-16 but the wording is unchanged |
| 3 and 9, the review at the end of every turn | Build something that checks the review happened on every turn | A guided duty, with a hook that raises the moment when the changed-file count crosses a threshold | No, open |
| 9 and 13, push per decision | One commit and one push for each settled decision | Decisions settled in one reply share one commit and one push | No, open |
| 14, `approved_by` is never empty | Leave the field empty, or invent a value, when approval is off | `knowledge/project.md` gains an `owner` field and `approved_by` takes its value | No, open |
| 18 and the layout, `knowledge/system-guide/` | Build the folders this document names | This document stops naming another plugin's layout and refers only to the enabled guide's entry page | No, open |
| 7, the glossary path | Two glossary files, one per requirements document | One path, used by both documents | No, open |
| 17, hand the proposal to a skill-authoring process | `knowledge-save` writes the project skill | `knowledge-save` shows a skill proposal and stops | No, open |
| 16, "when work ships" | Any commit is shipping | The work item is closed as done, or its pull request is merged to the default branch | No, open |
| 1, the allowed parts and "nothing else" | No Node scripts anywhere in the system | A script a hook or a skill runs is part of that hook or that skill | No, recorded decision |
| 21, `ai-external-knowledge/README.md` is a generated index | The existing hand-written topic index is that file | A new root index, generated from each captured topic's entry page | No, recorded decision |
| The preferred direction, function hooks | Wait for function hooks, or build against them | Build on documented command hooks, and name the session-state file and the three tool hooks as the one upgrade point | No, recorded decision |
| 28, eight items per inbox entry | Shorten the entry to keep startup cheap | Keep the approved shape; startup prints only the heading and the state line | No, open |
| 25, "the same result in Codex" | Strict parity on every behavior | Same, or named in the setup report | No, open |
| 7, meanings used from the first message | Print the whole glossary at every start | Whole under 1,500 characters; above that, two columns up to 1,500 characters, then the file path | No, open |
| A failed or missed knowledge review | A failed save blocks `Done` | The gate requires that the review ran; a failed save is reported and kept in the inbox, and does not block `Done` | No, open |
| 16, `group` and `updated_at` are required | The fields are optional because this document does not carry them | Both fields are added to this document in the same change that teaches the checker about them | No, open |
| The walkthrough's inbox card | Add a fourth card label, "New wording" | The three labels of requirement 20 stay; a block quotation is allowed inside `Summary` when the exact words are what is being approved | No, open |
| 16, approval fields on a `proposed` document | Approval fields mean the status should have changed | `proposed` with no approval fields is being refined; `proposed` with both fields has approved requirements and is waiting to be built | No, open |
| 9, "pushed!!!" | None. The behavior is not in doubt | The exclamation marks are deleted and the manual's copy is fixed in the rewrite | No, open |
| 18, both tables "given to the agent in every project" | Put the routing table and its test in the manual | Both live in `knowledge-save/references/routing.md`, opened when a save chooses a home; the manual keeps a ten-line summary | No, open |
| 2, the confirmation at a new session start | `/clear` continues the same session | `/clear` starts a new session; `resume`, `compact`, and `fork` continue one | No, open |
| 21, "No other size limit is set here" | The three limits the design adds break the requirement | One is a hard failure above 5,000 characters, one is a warning that never fails, and two are print cutoffs rather than file limits | No, open |
| 9, saving during an authorized interview | One commit and one push per decision, mid-interview | Decisions settled in one reply share one commit and one push | No, open |

## How this design is being made

- Prep: scan and research first. Five research reports came before any design
  text, and they are in `research/` in this folder.
- Design philosophy: built-in mechanisms first. Use what Claude Code and Codex
  already provide, guide the agent and let it use its own judgment, recommend a
  full refactor where a refactor is better than a patch, and flag any
  requirement that does not fit.
- Number of options: one design. Inside it, section 14 holds eight places where
  two answers are reasonable, each with the design's choice and the alternative.
- Existing build: exists. The shipped knowledge system was audited before any
  design text was written, in `research/r3-current-implementation.md`: every
  file, hook, skill, tool, test, and the couplings between them.
- Team: as set out in `process.md` in this folder. Five Opus research agents;
  two Fable design leads, one peer and one main; one Opus verifier; two Opus
  writers; six Opus reviewers across three rounds; one Opus fixer per round.
- Agents run as: subagents. Opus for every worker, Fable for the two design
  leads.

## Constraints

- Plain parts only. Markdown files in the project repository, Git, hooks,
  skills, and the harness itself. No database and no running service.
- Approval before any lasting write. Nothing is written to a memory file or a
  requirements document without permission that covers that change.
- Both harnesses. Every part works in Claude Code and in Codex, or the
  difference is named in the project's setup report.

## Interview log

### Q1: What kind of control may the toolkit build?

- Asked: after the design was merged, whether the controls in it are the right
  kind of control.
- Captured: the owner set the handshake principle on 2026-09-16. It is recorded
  in the closing section of `knowledge/prds/knowledge-system.md`, titled "The
  handshake principle". In his meaning: every control in the system is a
  handshake, never an engine. A hook names a step at the moment it applies, the
  agent does the step with its own judgment and confirms that it did, and the
  hook releases the turn or the action only on that confirmation. Nothing the
  toolkit builds judges the content of the agent's work in place of the agent:
  no detector for figurative language, no scorer for a search, no program that
  reads replies. Those are things an AI can already do, so the toolkit asks the
  agent to do them and checks only that the step happened. A function hook, when
  Claude Code ships one, is the persistent supervisor that carries the handshake
  state through a session; until then a small session-state file does that job.
- Flags: None. The principle is recorded in the requirements document.

### Q2: Does hook delivery of the startup files count as the read?

- Asked: question 1 of the 27 in the design's section 15, which is requirement 2
  at PRD line 481 and section 13.1.
- Captured: on 2026-09-16 the owner answered yes. Hook delivery of the startup
  files in order counts as the startup read, and the check is that the delivery
  finished. This follows from the handshake principle: the harness checks that
  the step happened, and the agent confirms it in one line. No harness can
  observe reading.
- Flags: the requirement's wording at PRD line 481, and the approved
  walkthrough's Part 1, still state the stronger check. Changing them is
  question 5 in section 15 and is unanswered.

## Open flags

- Questions 2 to 8 of the eight decisions in the design's section 1a -> the
  owner.
- The requirements-wording questions 9 to 12 in section 15 -> the owner.
- Approval of `knowledge/prds/knowledge-system.md`, which is still `proposed`
  -> the owner.
- Approval of `docs/designs/269-knowledge-system.md` as the build plan -> the
  owner.
- Whether to reshape the design to the solution-design template added on
  2026-09-16 in pull requests 344 and 345 -> the owner.

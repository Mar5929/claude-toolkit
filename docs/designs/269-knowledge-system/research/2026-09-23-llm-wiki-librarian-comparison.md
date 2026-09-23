# LLM Wiki Agentic Librarian compared with the Knowledge System

Date: 2026-09-23. Requested by Mike Rihm in the Main Orchestrator chat. Two Opus
research helpers read the sources; the main agent spot-checked the key claims.
This is source research. Only the decision recorded at the end is approved.

## Sources

- The "LLM Wiki Agentic Librarian" v2.0.5, a toolkit published by a YouTuber
  Mike follows, built for the Hermes agent. Mike's local copy was in his
  Downloads folder; it is not in this repository.
- This repository's `main` after #396 (startup cut, protocol-guard phase 1 and
  phase 2): `plugins/protocol-guard/`, `plugins/second-brain/`,
  `.claude/tools/check-knowledge.mjs`, and
  [the #396 design](../../396-protocol-enforcement.md).
- The published report:
  [Librarian Toolkit Lessons](https://claude.ai/artifact/PAfh32Nc1FtVPXEZPx7HAu).

## How the librarian works

An Obsidian folder in three layers: new material in `Raw/`, proposed pages in
`Review/Inbox/`, approved long-term memory in `Wiki/`. Short-term memory is the
agent's own memory service, such as Hindsight. The agent opens its librarian
skill, runs a script that decides whether any new work exists (no work means no
model call), receives an exact list of files to read and blanks to fill, and
returns a structured answer. A second script checks the answer's shape and
checks that each evidence quote appears word for word in an unchanged source.
The human sets a review field to approve, modify, defer or reject. A third script
applies approved changes with an undo record, rebuilds indexes and runs the
format checks. About 51,000 lines of Python and 5,000 of JavaScript.

## Findings

| Step | Librarian | Knowledge System on `main` |
| --- | --- | --- |
| Open the memory skill first | Instruction only | protocol-guard refuses memory writes, pull requests, closes and merges until `knowledge-save` is open (Claude Code with function hooks only) |
| Human approval | Not proven: approval is an editable field, and the code records any edit as the human's (`scripts/librarian/review_projection.py`) | Not proven: the agent writes `approved_by`; the checker only requires it to be filled in |
| Direct write to long-term memory | Logged as observed, not blocked | Blocked until the skill is open, then allowed |
| Format check | On submit and apply; the commit-time hook is off until the user installs it | protocol-guard K6 makes the agent run the checker after a knowledge write, holding the reply once; no commit-time check; memory saves go straight to `main`, so pull-request tests usually never run |
| Evidence | Quotes checked word for word against unchanged sources | `source` is free text |
| Approval tied to the exact text seen | Yes, a changed proposal holds the decision | No comparison of saved memory with the approved card |
| Codex | Same scripts and checks | Reminders only |

Neither toolkit proves that the human approved a memory. The #396 design says
its checks prove a step happened, not that Mike approved anything.

## Ideas considered

1. Run the knowledge format checker in a Git pre-commit hook when a commit
   touches `knowledge/`, installed by `project-sync`, with a permission rule
   refusing `git commit --no-verify`. Works in Claude Code and Codex without
   function hooks. Limit: memory kept outside Git (#404's external mode) skips it.
2. Approve save cards with a typed command such as `/approve 2`. A hook records
   the approval with a fingerprint of the card text in a record protocol-guard
   protects from agent writes; the checker requires each new memory to match an
   approval. The only idea that proves approval. Limits: shell writes that do not
   name the record, and no protection in Codex.
3. Tell the agent its turn is finished once a save card is shown. The librarian
   treats a queued review as a finished turn.

Left out: the librarian's word-matching search engine (`knowledge_index.py`,
1,645 lines), its review web app (about 9,000 lines), the word-for-word
evidence check (conversation records lag and have no published layout, per
#396), the no-work gate (whether a conversation holds something worth saving
needs judgment), and fixed tag lists or required sections.

Also found: protocol-guard was not installed on Mike's laptop on 2026-09-23, and
the laptop's Claude Code command-line version was 2.1.271; function hooks were
tested on 2.1.280.

## Decision

Mike approved idea 1 on 2026-09-23 and asked for it to be built. Ideas 2 and 3
were not decided.

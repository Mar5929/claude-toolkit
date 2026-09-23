---
summary: A librarian memory toolkit enforced format only when its agent ran the scripts; neither it nor ours proves approval. Mike chose a commit-time format check.
group: Toolkit research
type: event
status: current
source: docs/designs/269-knowledge-system/research/2026-09-23-llm-wiki-librarian-comparison.md
context: Mike asked what the toolkit could learn from a YouTuber's LLM Wiki Agentic Librarian, compared after #396 shipped, 2026-09-23.
confidence: observed
created_at: 2026-09-23
updated_at: 2026-09-23
tags: [llm-wiki, librarian, enforcement, approval, pre-commit, research]
approved_by: Mike Rihm
approval_date: 2026-09-23
---

# LLM Wiki Agentic Librarian comparison

On 2026-09-23 Mike asked what the toolkit could learn from the "LLM Wiki Agentic
Librarian" v2.0.5, a Hermes-based memory toolkit from a YouTuber he follows. He
believed its scripts forced the agent to follow file formats and processes,
unlike instructions the agent can ignore.

## Lessons

- The librarian's scripts check format and evidence only when the agent runs
  them. Its human approval is an editable field that the code attributes to the
  human whoever made the edit, and direct writes to its long-term wiki are
  logged, not blocked. Script-based checks bind only the path the agent uses.
- After #396, this toolkit blocks more at the moment of writing, through
  protocol-guard, but only in Claude Code with function hooks on. Codex and
  chats without protocol-guard get reminders only.
- Neither toolkit proves the human approved a memory. A typed approval command
  recorded by a hook is the one idea found that could prove it.
- A check that runs when a commit is made covers every agent and host that
  commits through Git, with no function hooks needed.
- Most of the librarian's roughly 51,000 lines do reasoning work the toolkit
  deliberately leaves to the agent, such as a word-matching search engine.

## Decisions

- Mike approved idea 1 on 2026-09-23: a Git pre-commit hook runs the knowledge
  format checker when a commit touches `knowledge/`, installed by
  `project-sync`, with a permission rule refusing `git commit --no-verify`. The
  requirement is in the [Knowledge System PRD](../../prds/toolkit-operating-system/knowledge-system.md#21-indexes-and-the-checker).
- Idea 2, approval by typed command, and idea 3, stopping the turn once a save
  card is shown, were not decided.

The [retained research record](../../../docs/designs/269-knowledge-system/research/2026-09-23-llm-wiki-librarian-comparison.md)
holds the full comparison, limits and sources. Read it before repeating the
comparison.

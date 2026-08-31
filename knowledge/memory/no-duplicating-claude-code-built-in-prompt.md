---
summary: When adding agent-behavior instructions to the toolkit, check Claude Code's own built-in system prompt first and leave out anything already there, because a second copy drifts from the first.
type: decision
status: current
source: Read directly in a Claude Code session's system prompt on 2026-08-31 while applying Anthropic's Claude Opus 5 prompting guide in issue #241
confidence: observed
created_at: 2026-08-31
tags: [toolkit-design, prompting, claude-code, opus-5]
approved_by: Mike Rihm
approval_date: 2026-08-31
project: claude-toolkit
work_item: "241"
---

# Do not copy instructions Claude Code already ships

When adding an instruction about how agents behave to the toolkit, read Claude
Code's own built-in system prompt first and leave out anything already in it.
A second copy of the same instruction drifts from the first, and the repository
already requires every rule to be stated once.

## What was found on 2026-08-31

Issue #241 applied Anthropic's Claude Opus 5 prompting guide, at
`https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5`,
to the toolkit. The guide names several instructions to add. Three of them were
already in the Claude Code session's own system prompt, read directly in that
session:

- The task-scope instruction, in a section headed "Delivering work".
- The correction-narration instruction, in a section headed "Corrections".
- A cap on spawning subagents.

Those three were deliberately left out of the toolkit for that reason. What was
added instead has since been removed: issue #245 deleted both the
`plain-language` output style and the `size-documents-to-the-task.md` rule, and
switched every toolkit project to Claude Code's built-in `Concise` style. The
decision recorded here is unaffected. It is about not duplicating what Claude
Code already ships, not about what #241 added.

## Re-check the list before relying on it

Claude Code's built-in system prompt changes between versions. The list of three
above is what was true on 2026-08-31, not a permanent fact. Before deciding that
the toolkit still does not need one of them, read a live session's system prompt
again and confirm it is still there. The decision to check first is what is
durable; the list is dated evidence for it.

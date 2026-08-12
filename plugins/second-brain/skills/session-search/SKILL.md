---
name: session-search
description: >-
  Search locally saved Claude Code CLI conversations when current project files
  do not answer and a past discussion may fill the gap, or when the owner asks
  to find an earlier session. Search read-only transcript history by project,
  repository worktrees, words or topic, and date. Never treat a past session as
  current truth, copy it into project knowledge, or silently search every
  project on the machine.
---

# session search

Use current project files first. Invoke this skill only when they leave a real
gap that a past Claude Code CLI discussion may answer, or when the owner asks.

## Search the smallest scope

Choose two to four distinctive words, a quoted phrase, or a known session title.
Run the bundled read-only script:

```text
node "${CLAUDE_SKILL_DIR}/scripts/search-sessions.mjs" \
  --query "distinctive words" \
  --project "${CLAUDE_PROJECT_DIR}"
```

The default `project` scope searches sessions tied to the current project only.
If that scope does not answer and another worktree of the same repository is
relevant, add `--scope repository`.

Use `--since YYYY-MM-DD` and `--until YYYY-MM-DD` when the likely date is known.
Use `--limit N` only when the default five matches are not enough.

Never search unrelated projects without the owner's explicit permission. After
permission, use both `--scope all` and `--allow-all-projects`. The script refuses
an all-project search without that second flag.

## Read results as history

The script returns JSON for the agent. Keep raw matches in tool context by
default. Each first-pass result contains at most 500 characters, the project,
session, matching-message time, session start and last activity, role, exact
resume command, and the identifiers needed to expand one result.

If one excerpt is promising but incomplete, expand only that result:

```text
node "${CLAUDE_SKILL_DIR}/scripts/search-sessions.mjs" \
  --project "${CLAUDE_PROJECT_DIR}" \
  --session <session-id> \
  --message <message-id> \
  --expand message
```

Use `--expand turn` only when the matching message and its reply are both
needed. Reuse the original `--scope` and all-project permission flag.

## Answer without narrating routine search

Check current project files before relying on any historical claim. Current
files win when they answer. If they conflict with the past session, show the
conflict and treat the session as historical evidence only.

Tell the owner that session history was used only when:

- the answer depends on it;
- it conflicts with current files; or
- a failed search leaves a real gap.

Do not paste raw matches unless the owner asks or the passage is needed to
explain uncertainty. If the owner wants the full conversation, use the returned
session ID with Claude Code's `/resume` picker or `claude --resume <session-id>`.

## Keep the boundary

- Search Claude Code CLI history only. Desktop, editor, web, and Codex histories
  are separate capabilities.
- Never edit, move, copy, index, or archive a transcript.
- Never write a result into `knowledge/` or a tracker. `remember` is a separate
  owner-approved action.
- Never return tool results, hidden thinking, or metadata-only records as
  conversation matches.
- Unknown JSONL records are skipped because Claude Code's internal transcript
  shape may change.
- If history is disabled, expired, removed, missing, or unreadable, report that
  possibility without claiming no discussion happened.

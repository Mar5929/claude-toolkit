# Available project history

Use only after earlier sources leave a relevant gap, or on an explicit history
request. Announce the context sought. Claude CLI history is the adapter below;
Codex task-history tools, when available, use their own scoped read interface.
Do not treat missing history access as an empty search.

## Search the smallest scope

Choose two to four distinctive words, a quoted phrase, or a known session title:

```text
node "<knowledge-find skill directory>/scripts/search-sessions.mjs" \
  --query "distinctive words" \
  --project "<project root>"
```

The default scope searches sessions tied to the current project. If another
worktree of the same repository is relevant, add `--scope repository`.

Use `--since YYYY-MM-DD` and `--until YYYY-MM-DD` when the likely date is known.
Use `--limit N` only when the default five matches are not enough.

Never search unrelated projects without the owner's explicit permission. After
permission, use both `--scope all` and `--allow-all-projects`. The script refuses
an all-project search without the second flag.

## Expand only a useful result

The first pass returns short JSON excerpts plus project, session, time, role,
resume command, and result identifiers. Keep raw matches in tool context unless
the owner asks for them.

Expand only a promising result:

```text
node "<knowledge-find skill directory>/scripts/search-sessions.mjs" \
  --project "<project root>" \
  --session <session-id> \
  --message <message-id> \
  --expand message
```

Use `--expand turn` only when the matching message and reply are both needed.
Reuse the original scope and all-project permission flag.

## Return the result

Apply the manual's historical-result warning every time. Name the session and
date so the owner can judge its age. Current project files win when they answer;
show any conflict instead of blending the sources.

If the owner wants the whole conversation, use the returned session ID with
Claude Code's resume command.

## Boundaries

- Search Claude Code CLI history only. Other hosts have separate histories.
- Never edit, move, copy, index, or archive a transcript.
- Never write a result into project knowledge or a tracker merely because it was
  found.
- Never return tool output, hidden reasoning, or metadata-only records as a
  conversation match.
- If history is unavailable, say so without claiming the discussion never
  happened.

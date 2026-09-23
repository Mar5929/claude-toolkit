# Available project history

Use only after earlier sources leave a relevant gap, or on an explicit history
request. Announce the context sought. The instructions below cover Claude Code
CLI history; Codex task-history tools, when available, use their own scoped read
interface. Do not treat missing history access as an empty search.

## Search the smallest scope

Claude Code CLI transcripts are JSONL files under
`${CLAUDE_CONFIG_DIR:-~/.claude}/projects/<project>/`. Use
`CLAUDE_CODE_PROJECT_DIR_NAME` when the session set it. Otherwise Claude Code
derives `<project>` from the working directory, and may truncate and hash a long
path. List the project directories and use transcript `cwd` metadata or the
session picker to identify the current project; do not guess the directory name.
Include another worktree's directory only when it is relevant.

Choose two to four distinctive words, a quoted phrase, or a known session title.
Narrow by file modification date when the likely date is known, inspect only a
useful matching turn, and keep raw matches in tool context unless the owner asks
for them. Never search an unrelated project's directory without the owner's
explicit permission.

For Codex or another host, use that host's available task-history read and
search interface. Do not assume Claude Code's local transcript path applies.

## Return the result

Apply the knowledge-find trust rules every time: old conversations do not
establish current truth. Name the session and
date so the owner can judge its age. Current project files win when they answer;
show any conflict instead of blending the sources.

If the owner wants the whole Claude Code conversation, identify its session ID
from the transcript filename and use Claude Code's resume command.

## Boundaries

- Search Claude Code CLI history only. Other hosts have separate histories.
- Never edit, move, copy, index, or archive a transcript.
- Never write a result into project knowledge or a tracker merely because it was
  found.
- Never return tool output, hidden reasoning, or metadata-only records as a
  conversation match.
- If history is unavailable, say so without claiming the discussion never
  happened.

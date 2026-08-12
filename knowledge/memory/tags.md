# Tags

The topic words a file in `knowledge/memory/` may use in its `tags:` line.

The folder a file sits in says what kind of thing it is. A tag says what it is
about. Tags cut across folders, so asking for one subject pulls back every file
about it: the decision, the knowledge, and the procedure together.

| Tag | What it covers |
| --- | --- |
| `memory-system` | How this project saves and reads what it knows: the specification, the three skills, the index. |
| `plugins` | The packaged systems this repository ships, and the marketplace file that registers them. |
| `skills` | Packaged instructions an agent invokes, whether shipped in a plugin or living in this repository. |
| `hooks` | The small scripts Claude Code runs at set moments. |
| `rules` | The always-loaded instruction files in `.claude/rules/`. |
| `root-instructions` | `CLAUDE.md` and `AGENTS.md`, and how the two stay in step. |
| `writing-voice` | The output style, and how Claude is meant to talk to the user. |
| `codex` | Anything true for Codex but not Claude Code, or the other way round. |
| `git-workflow` | Branches, worktrees, pull requests, and several sessions working at once. |
| `work-tracking` | The GitHub board, issues, and how work gets logged before it is built. |
| `project-setup` | Starting a new project, or bringing an existing one up to date with the toolkit. |
| `testing` | The checks run by hand before a pull request. |
| `windows` | Things that are only true on this Windows machine. |

Two rules for using them:

- One to three tags per file.
- If none of these fit, propose a new tag as part of the save rather than
  forcing a bad match. It is added here once the user approves it, like a new
  area folder.

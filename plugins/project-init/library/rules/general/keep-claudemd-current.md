# Keep CLAUDE.md Current

`CLAUDE.md` and `AGENTS.md` are the first files an agent reads. They do two
jobs.

1. **Carry what an agent must know before it acts:** how to talk to the owner,
   and the rules whose breach causes real damage.
2. **Route:** one line per folder or module, naming what is in it and when to
   open it. Name the context sources too, not just code: captured outside
   documentation, specifications, reference data. Nothing else in a session
   mentions those folders.

## Keep it current

When a session turns up a new path, convention, decision, or changed workflow,
update `CLAUDE.md` before the task ends. Delete what is now wrong, superseded,
or said twice while you are in there.

Never restate a rule that already has a file in `.claude/rules/`. Claude Code
loads every `.md` file there at session start, so a copy only drifts.

## Three tests before you add a line

Any yes means leave it out.

1. Could an agent find this out in one command, such as `ls`?
2. Is it about where something came from, or when it arrived? Git history owns
   that.
3. Would a session that never read this line still do the right thing?

## AGENTS.md is a pointer, not a copy

Codex reads `AGENTS.md` and nothing else on its own. So `AGENTS.md` tells it in
words to read `CLAUDE.md`, then every file in `.claude/rules/`, then a folder's
own `CLAUDE.md` before editing there. No codemap, no folder detail.

- **No import lines.** Codex has no import syntax, so `@CLAUDE.md` loads nothing
  while looking like it worked, and no wildcard expands. Write the instruction
  in words.
- **Codex caps the file at 32 KB** and drops the rest silently. Check its size
  after editing.
- **A rule too dangerous to wait stays written out** in short form, naming the
  rule file that holds all of it. Change both together.

## Folder CLAUDE.md files follow the same rules

A folder's `CLAUDE.md` loads only when an agent reads a file in that folder.

- Write it when you create the folder, even an empty one. Update it in the same
  session when the folder's job changes.
- Never put a rule only in one. It may point at a rule, never hold the only
  copy.
- Where a folder has a `README.md` index, point at that instead of repeating it.

# Checking a hook by hand on Windows

When you run one of this repository's hooks yourself to see whether it works,
the form of the path you hand it decides the result, and a path the hook cannot
read makes a working hook look broken.

Basis: Observed while installing the three hooks for GitHub issue #138 on
2026-08-04.

## What goes wrong

The hooks in `.claude/hooks/` are Node scripts. Node on Windows cannot resolve a
Git Bash style path. Inside Git Bash, `$PWD` gives `/c/Users/...`, and `/tmp/...`
resolves against the current drive rather than to Git Bash's own temp folder.
Either form reaches the hook as a path that is not there, so the hook reads
nothing.

Both hooks do the same thing with any input they cannot read: nothing, and they
exit 0. So a hook that is working and a hook that never got its input look
identical from the outside.

## The two checks that misled us

`style-reminder.mjs` was given a `cwd` of `/c/Users/.../claude-toolkit-138` and
printed no output at all. The install check in the hooks-library skill says
empty output means the hook found no output style to remind about, so the
natural conclusion is that the style is missing. It was not missing. The style
was installed and correct. Passing the same check
`C:/Users/.../claude-toolkit-138` printed the reminder followed by the whole
style file.

`writing-guard.mjs` was given a `transcript_path` of `/tmp/wg-dirty.jsonl`. It
exited 0 and printed nothing, which is exactly what a clean reply looks like.
The reply in that file contained an em dash, so the hook should have refused it.
Writing the same file to a Windows path and passing that path made the hook exit
2 and name the em dash.

## What to do instead

Pass every path in Windows form, such as `C:/Users/.../claude-toolkit-138`, even
when you are typing the command in Git Bash. Write any temporary file you feed a
hook to a Windows path too, and pass that path.

## What the hooks-library skill already warns about

The install steps in
[the hooks-library skill](../../../plugins/hooks-library/skills/hooks-library/SKILL.md)
warn about a related trap that ends the same silent way: piping a string in
PowerShell sends it as UTF-16, and the hook cannot read that as JSON. That
warning covers PowerShell only. It says nothing about the Git Bash path form
described here, and the check commands it gives use `$PWD` and `/tmp/...`.

## What this does not affect

None of this affects Claude Code itself. Claude Code hands a hook a real Windows
path, so the hooks behave normally in a session. Only a person or an agent
checking a hook by hand runs into this.

Nothing was observed on macOS or Linux, so this document says nothing about
them.

## Where these checks came from

[The toolkit setup record](../../../.claude/toolkit-sync.md) says all three
hooks were run by hand in both directions before being called installed. These
are the runs behind that line, and the path form is what made the first attempts
read as failures.

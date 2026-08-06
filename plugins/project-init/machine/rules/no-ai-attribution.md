# No AI Credit on Anything Committed or Pushed

Nothing the owner commits or pushes carries a line saying an AI helped write it.
No exceptions, in any repository, on any branch.

## What this covers

Never write, and never leave in place, any of these:

- A `Co-Authored-By: Claude` trailer on a commit, or the same trailer naming any
  other AI agent.
- A "Generated with Claude Code" line, or anything like it, in a commit message,
  a tag message, a pull request title or description, an issue, or release
  notes.
- A note crediting an AI in a code comment, a file header, a metadata
  description, a README, or any other document in the repository.
- An AI's name or address in an author field, a changelog entry, or a release
  note.

It matters most in a client repository, where the work must carry only the
owner's name. There is no place where it stops applying, including repositories
that were never set up with the toolkit.

## Three things enforce this, and each one has a gap

- **The `attribution` setting**, in the machine's own Claude Code settings, with
  `commit` and `pr` both set to an empty string. It removes the trailer and the
  pull request line Claude Code would otherwise add by itself. Its gap: a
  project's settings file beats the machine's, so a project that sets
  `attribution` to something else wins.
- **The `no-ai-attribution-guard` hook**, which refuses a command that would
  publish AI credit. Its gap: it only sees commands run in the terminal, so
  anything committed another way goes through untouched.
- **This rule**, which covers what neither of those can reach: comments, file
  headers, document text, and wording an agent writes by hand.

Do not treat the setting or the hook as the whole answer, and do not write
anything that would need either of them to catch it. If the guard blocks a
command, fix the wording. Never work around it by committing another way, and
never turn it off to get past it.

## The one thing that is not covered

A human co-author is not AI credit. `Co-Authored-By:` naming a real person stays
allowed and is sometimes correct.

If the owner explicitly asks for AI credit on one specific piece of work, that
is their call and it applies to that piece of work only. It changes nothing
else, and it is not a standing exception.

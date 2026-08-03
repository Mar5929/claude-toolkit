# Anything the Owner Reads Follows the Output Style

The project's output style sets how Claude writes. It is delivered through the
system prompt, so it reaches the main conversation and nothing else. A helper
agent runs its own prompt and never sees it, yet helper agents write things the
owner reads: commit messages, pull request descriptions, and documents that land
in the repo.

So before you write any of those, read the active output style and follow it.
The file is `.claude/output-styles/<name>.md`, where `<name>` is the
`outputStyle` value in `.claude/settings.local.json`, then
`.claude/settings.json`, then the owner's `~/.claude/settings.json`. A built-in
style (Explanatory, Learning, Proactive, Default) has no file; if you find none,
write plainly and move on.

This rule points at the style on purpose and does not restate it. A second copy
of the writing rules would fall out of step with the first, and then two files
would disagree about how to write. There is one home for voice, and this is the
sign pointing at it.

Where this applies: commit messages, pull request titles and bodies, issue and
ticket text, and any document written into the repo. Where it does not: a report
a helper agent hands back to the agent that called it, which the owner never
sees, and code comments, which follow the surrounding code.

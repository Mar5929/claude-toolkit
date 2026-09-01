# What this project knows

Every memory file, with the one sentence it uses to describe itself.

A line marked superseded or retired does not answer questions about what is
true now. Open it only for history.

Built by `node .claude/tools/build-knowledge-index.mjs`. Nobody edits this
file by hand. If it disagrees with the files on disk, the files win:
rebuild it.

- `knowledge-manual-voice.md` (retired): Mike rewrote the save rules in the
  knowledge manual and the remember skill himself because the agent-written
  version was unclear, so those sections are deliberately plainer and longer
  than the rest of the toolkit and should not be shortened.
- `no-duplicating-claude-code-built-in-prompt.md`: When adding agent-behavior
  instructions to the toolkit, check Claude Code's own built-in system prompt
  first and leave out anything already there, because a second copy drifts from
  the first.

# What this project knows

Every memory file, with the one sentence it uses to describe itself.

A line marked superseded or retired does not answer questions about what is
true now. Open it only for history.

Built by `node .claude/tools/build-knowledge-index.mjs`. Nobody edits this
file by hand. If it disagrees with the files on disk, the files win:
rebuild it.

- `checking-a-hook-by-hand-on-windows.md`: When you run one of this
  repository's hooks by hand on Windows, the form of the path you give it
  decides the result, and a path the hook cannot read makes a working hook look
  broken.
- `claude-md-and-agents-md-carry-the-same-block.md`: AGENTS.md holds a word for
  word copy of the shared instruction block in CLAUDE.md rather than pointing
  at it, because Codex cannot follow a pointer.
- `memory-system-spec-stays-in-the-toolkit.md`: The knowledge-system
  specification is the build authority for agents changing the second-brain
  plugin in this repository, and adopting projects receive only the built
  skills, never a copy of it.
- `nothing-catches-a-drifted-copy-before-it-lands.md`: The installed-copy check
  has no automatic trigger, so it catches drift only when a person types the
  command, and the plain-language output style reached main wrong twice before
  anyone noticed.
- `toolkit-only-asks-where-work-is-tracked.md`: Setting up a project means
  asking one question about work tracking and recording the answer, so any
  method the owner names is one more answer to that question and never a new
  system for the toolkit to build.

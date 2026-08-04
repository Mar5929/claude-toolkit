# Decisions: root instruction files

Choices about `CLAUDE.md` and `AGENTS.md`, the two files an agent reads first in
this repository, and how they stay in step with each other.

This folder holds the reasoning. The instruction files themselves stay
canonical for what they say.

## Documents

- [CLAUDE.md and AGENTS.md carry the same block, not a pointer](claude-md-and-agents-md-carry-the-same-block.md):
  `AGENTS.md` holds a word for word copy of the shared instruction block in
  `CLAUDE.md` rather than pointing at it, apart from one passage each program
  has to word for itself, and a pair of markers plus an automatic check keeps
  the two copies in step.

# Decisions: root instruction files

Choices about `CLAUDE.md` and `AGENTS.md`, the two files an agent reads first in
this repository, and how they stay in step with each other.

This folder holds the reasoning. The instruction files themselves stay
canonical for what they say.

## Documents

- [CLAUDE.md and AGENTS.md carry the same block, not a pointer](claude-md-and-agents-md-carry-the-same-block.md):
  why the shared instructions are copied word for word into both files instead
  of `AGENTS.md` pointing at `CLAUDE.md`, and what keeps the two copies
  identical.

# Knowledge: hooks

What is understood about the hooks this repository runs from `.claude/hooks/`,
including how to check one and how it can mislead you.

This folder does not own how a hook is installed, registered, or removed. The
[hooks-library skill](../../../plugins/hooks-library/skills/hooks-library/SKILL.md)
owns those steps and the checks that prove a hook works.

## Documents

- [Checking a hook by hand on Windows](checking-a-hook-by-hand-on-windows.md):
  When you run one of this repository's hooks yourself to see whether it works,
  the form of the path you hand it decides the result, and a path the hook
  cannot read makes a working hook look broken.

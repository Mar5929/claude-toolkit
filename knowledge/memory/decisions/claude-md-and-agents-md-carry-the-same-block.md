---
source: user-said-it
date: 2026-08-06
tags: [root-instructions, codex]
---

# CLAUDE.md and AGENTS.md carry the same block, not a pointer

`AGENTS.md` holds a word for word copy of the shared instruction block in
`CLAUDE.md` rather than pointing at it, because Codex cannot follow a pointer.

Decided on 2026-08-04, while setting this repository up with its own toolkit for
GitHub issue #138.

Claude Code reads [`CLAUDE.md`](../../../CLAUDE.md) and loads every file in
`.claude/rules/` on its own. Codex reads [`AGENTS.md`](../../../AGENTS.md) and
nothing else: not `CLAUDE.md`, not the rules folder. Codex also has no `@` import
syntax, so an import line written into `AGENTS.md` is plain text the model may or
may not act on. Before this change, `AGENTS.md` here was a single line, "Follow
and adhere to @CLAUDE.md", so a Codex session got no instructions at all.

The accepted cost is duplication. It is paid down by making the duplication
mechanical instead of remembered: the shared content sits between
`<!-- shared-with-agents-md:start -->` and `<!-- shared-with-agents-md:end -->`
in both files, and
[`tests/installed-copy-check.mjs`](../../../tests/installed-copy-check.mjs) fails
when the two blocks differ. Nobody has to remember to copy the block across.

Do not "fix" the duplication by replacing the copy with a pointer. A pointer to
a rule file is not delivery.

## Related

- [what goes in a folder instruction file](../../specs/project-setup/folder-instruction-files.md):
  the specification this decision sits under.

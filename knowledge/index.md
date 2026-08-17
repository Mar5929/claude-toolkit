# What this project has written down

Every current specification and memory, with its one-sentence summary.

Built by `node .claude/tools/build-knowledge-index.mjs`. Nobody edits this file
by hand. If it disagrees with the source files, rebuild it.

## memory/decisions/

- [CLAUDE.md and AGENTS.md carry the same block, not a pointer](memory/decisions/claude-md-and-agents-md-carry-the-same-block.md):
  `AGENTS.md` holds a word for word copy of the shared instruction block in
  `CLAUDE.md` rather than pointing at it, because Codex cannot follow a
  pointer.
- [The memory-system spec stays in the toolkit, not in projects](memory/decisions/memory-system-spec-stays-in-the-toolkit.md):
  `knowledge/specs/memory-system.md` is the build authority for agents changing
  the second-brain plugin in this repository; adopting projects receive only
  the built skills and never a copy of the spec.

## memory/knowledge/

- [Checking a hook by hand on Windows](memory/knowledge/checking-a-hook-by-hand-on-windows.md):
  When you run one of this repository's hooks yourself to see whether it works,
  the form of the path you hand it decides the result, and a path the hook
  cannot read makes a working hook look broken.
- [Nothing catches a drifted copy before it lands](memory/knowledge/nothing-catches-a-drifted-copy-before-it-lands.md):
  `tests/installed-copy-check.mjs` has no automatic trigger: no GitHub Actions
  workflow, no git hook. It catches drift only when a person types the command.
  On 2026-08-06 the plain-language output style was edited under `.claude/`
  alone and pushed straight to main twice (09f28ab, 36d2c2e). Both breaks were
  found after the fact, and until each was fixed, other projects kept getting
  the old wording of the style.

## specs/

- [Universal Project Memory System — v2 Specification](specs/memory-system-v2.md):
  **Status:** proposed. Supersedes `memory-system.md` (v1) when the owner
  approves it; v1 governs until then. Standalone — nothing here requires
  reading v1, though §24 maps v1 concepts for migration.
- [How project knowledge works](specs/memory-system.md): The project knowledge
  system keeps approved behavior, persistent understanding, and raw exploration
  in one portable Markdown vault that Git owns and Obsidian may view.
- [Product and system specifications](specs/README.md): This folder defines
  current approved product and system behavior.

## specs/project-setup/

- [Folder instruction files](specs/project-setup/folder-instruction-files.md):
  Every major folder in a toolkit project carries its own short `CLAUDE.md`
  unless another canonical file already owns its instructions, so folder detail
  reaches an agent when it opens that folder instead of loading in every
  session.

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
- [The toolkit only asks where work is tracked, it does not own a tracker](memory/decisions/toolkit-only-asks-where-work-is-tracked.md):
  Setting up a project means asking one question about work tracking, recording
  the answer, and applying the two rules. Any method the owner names is one
  more answer to that question, never a new system for the toolkit to build.

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

- [How the knowledge system works](specs/knowledge-system.md): This is the
  build authority for agents changing the `second-brain` plugin in this
  repository. It says what the system must do, precisely enough to build from.
- [Memory system v2 draft spec (superseded, do not build from this)](specs/memory-system-v2.md):
  **Status:** superseded on 2026-08-21 by [How the knowledge system
  works](knowledge-system.md). Kept as history only, and no build session may
  follow it.
- [How project knowledge works (superseded, do not build from this)](specs/memory-system.md):
  **Superseded on 2026-08-21 by [How the knowledge system
  works](knowledge-system.md).** Kept as history. It describes the layout with
  seven memory subfolders and a fixed tag list, which the current design
  replaced with one flat folder and free-form tags. Where this file and
  `knowledge-system.md` disagree, `knowledge-system.md` wins.
- [Product and system specifications](specs/README.md): This folder defines
  current approved product and system behavior.

## specs/project-setup/

- [Folder instruction files](specs/project-setup/folder-instruction-files.md):
  Every major folder in a toolkit project carries its own short `CLAUDE.md`
  unless another canonical file already owns its instructions, so folder detail
  reaches an agent when it opens that folder instead of loading in every
  session.

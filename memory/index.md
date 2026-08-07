# What this project has written down

Every file in `specs/` and `memory/`, with its one-sentence summary.
`specs/` says what things must do. `memory/` says what is worth knowing.

Built by `node .claude/tools/build-memory-index.mjs`. Nobody edits this file
by hand. If it disagrees with the files, the files win: run that command
again.

## memory/

- [Tags](tags.md): The topic words a file in `memory/` may use in its `tags:`
  line.

## memory/decisions/

- [CLAUDE.md and AGENTS.md carry the same block, not a pointer](decisions/claude-md-and-agents-md-carry-the-same-block.md):
  `AGENTS.md` holds a word for word copy of the shared instruction block in
  `CLAUDE.md` rather than pointing at it, because Codex cannot follow a
  pointer.

## memory/knowledge/

- [Checking a hook by hand on Windows](knowledge/checking-a-hook-by-hand-on-windows.md):
  When you run one of this repository's hooks yourself to see whether it works,
  the form of the path you hand it decides the result, and a path the hook
  cannot read makes a working hook look broken.
- [Nothing catches a drifted copy before it lands](knowledge/nothing-catches-a-drifted-copy-before-it-lands.md):
  `tests/installed-copy-check.mjs` has no automatic trigger: no GitHub Actions
  workflow, no git hook. It catches drift only when a person types the command.
  On 2026-08-06 the plain-language output style was edited under `.claude/`
  alone and pushed straight to main twice (09f28ab, 36d2c2e). Both breaks were
  found after the fact, and until each was fixed, other projects kept getting
  the old wording of the style.

## specs/

- [How the memory system works](../specs/memory-system.md): The design for
  saving and reading persistent information in a project: the folders, what
  goes in each, who may write to them, what every file looks like, how files
  link to each other, and what every session knows at startup.
- [Product and system specifications](../specs/README.md): This folder defines
  current approved product and system behavior.

## specs/project-setup/

- [Folder instruction files](../specs/project-setup/folder-instruction-files.md):
  Every major folder in a toolkit project carries its own short `CLAUDE.md`, so
  folder detail reaches an agent when it opens that folder instead of loading
  in every session.

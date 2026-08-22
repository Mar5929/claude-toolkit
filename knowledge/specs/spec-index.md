# How this project is meant to work

Every specification, with the one sentence it uses to describe itself.

A current specification beats a memory. A line marked superseded or retired
describes how something used to work.

Built by `node .claude/tools/build-knowledge-index.mjs`. Nobody edits this
file by hand. If it disagrees with the files on disk, the files win:
rebuild it.

- `folder-instruction-files.md`: Every major folder in a toolkit project
  carries its own short CLAUDE.md unless another canonical file already owns
  its instructions, so folder detail reaches an agent when it opens that folder
  instead of loading in every session.
- `knowledge-system.md`: How the knowledge system works, in enough detail to
  build it, covering the two file schemas, the find ladder, the routing table,
  the save test, and the lifecycle of a saved file.
- `memory-system-v2.md` (superseded): A draft of a memory system v2 that was
  never built, superseded first on 2026-08-20 and again on 2026-08-21, kept
  only as history.
- `memory-system.md` (superseded): How project knowledge worked under the
  layout with seven memory subfolders and a fixed tag list, superseded on
  2026-08-21 and kept only as history.

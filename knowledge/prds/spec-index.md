# How this project is meant to work

Every PRD, with the one sentence it uses to describe itself.

A PRD is one living document per feature area. Anything other than current
is labelled in brackets after the filename. A line marked proposed is what
we want built and is not true yet. A line marked superseded or retired
describes how something used to work. Only a current PRD is settled truth,
and only a current PRD beats a memory.

Built by `node .claude/tools/build-knowledge-index.mjs`. Nobody edits this
file by hand. If it disagrees with the files on disk, the files win:
rebuild it.

- `folder-instruction-files.md`: Every major folder in a toolkit project
  carries its own short CLAUDE.md unless another canonical file already owns
  its instructions, so folder detail reaches an agent when it opens that folder
  instead of loading in every session.
- `guided-delivery.md`: Guided delivery lets the owner focus on decisions while
  the main conversation maintains adaptable plans and brings in focused
  requirements, design, research, and review help using the project's existing
  records.
- `knowledge-system.md` (proposed): What the project second brain must do.
  Every new session already knows what has been going on in this project.
  Saving something worth keeping takes one short yes from the owner.
- `system-guide.md` (proposed): The optional System Guide keeps useful insights
  about a system and its parts, so future sessions do not repeat substantial
  investigation. It does not simply restate the code.
- `work-item-upkeep.md`: Work tracking keeps the active item's decisions,
  progress, handoff, and accepted outcome accurate across sessions, using
  flexible stages and one owner of tracker state.

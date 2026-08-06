# Project setup specifications

What the toolkit does when it sets up a new project or brings an existing one up
to date.

The list under "Documents" is built by
`node .claude/tools/memory-index-build.mjs` from the documents in this folder,
so it cannot fall out of step with them. Do not hand-edit it. The prose around
it is written by hand and is left alone.

## Documents

- [Folder instruction files](folder-instruction-files.md): Every major folder
  in a toolkit project carries its own short `CLAUDE.md`, so folder detail
  reaches an agent when it opens that folder instead of loading in every
  session.

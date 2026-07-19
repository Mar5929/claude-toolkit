# Profile: docs-only

Pick this when the project has little or no code: a documentation set, a research
or knowledge base, a policy library, or a planning workspace. The knowledge here
is the content itself and the decisions about it, not code-why.

At install, paste the matching block into each curator's `## Project profile`
section, replacing the `<...>` placeholders. `<APP_NAME>` is the real project name.

## Paste into brain-curator.md `## Project profile`

- **Project:** `<APP_NAME>` (docs-only)
- **Data in scope:** the domain knowledge itself, decisions about structure and
  scope, terminology, and which external authority is the source of each fact.
- **What "verified" means here:** check the source document or authority. Order of
  trust: source document > user said > assumed.
- **Drift model(s) in use:** both, lightweight. File-SHA for the content files a
  node explains; time + re-verify for facts sourced from an external authority
  that can change underneath you.
- **Source code path(s):** `<the content root, e.g. docs/ content/; confirm at install>`
- **Dominant node types:** `entity` glossary nodes, `decision` nodes, and pointer
  nodes to where each fact actually lives.
- **Systems of record (point, do not copy):** `<this project's actual tools, e.g.
  Notion, Google Drive, Confluence, SharePoint>`. The brain writes pointer nodes
  to these, per invariant 9. This matters most on a docs project, where copying
  content in would create a second, drifting copy.

## Paste into knowledge-curator.md `## Project profile`

- **Project:** `<APP_NAME>` (docs-only)
- **Data in scope:** the meaning and structure of the content set; which source
  authority backs each fact.
- **What "verified" means here:** check the source document or authority. Order of
  trust: source document > user said > assumed.
- **Drift model(s) in use:** file-SHA for covered content files; time + re-verify
  for external-authority facts (carry a `verified:` date + `review_after`).
- **Source code path(s):** `<the content root, e.g. docs/ content/; confirm at install>`
- **Dominant node types:** glossary and reference `knowledge` nodes; a
  `know-codemap` that indexes the content areas. Code-why nodes are rare here.
- **Structural graph companion:** no. There is no code to compile into a graph.

## Setup notes

- `CODE_PATH_REGEX` = the content root (ask the owner; e.g. `docs/`).
- The knowledge layer is OPTIONAL on a docs-only project and often light. If the
  value is all on the memory (brain-curator) side with no code-why to track,
  simply skip installing the knowledge-curator.
- Universal exclusions still apply: never store secrets or access credentials.

# Second-brain v1 archive

This directory preserves the retired second-brain v1 toolkit source outside all
active plugin and project-init paths.

V1 used a shared Cloudflare Worker, per-project Neon databases, an MCP server,
embeddings, automatic hooks, curator agents, an outbox, knowledge backfill, and
a structural graph layer. V3 replaced it with project-local Markdown and Git.

One piece is deliberately not here. The Salesforce dependency graph was bundled
inside the v1 plugin folder but never depended on any v1 infrastructure, because
it only ever read local metadata files. It ships from `project-init` at
`plugins/project-init/skills/project-init/references/tools/kb/`, and archiving it
would undo that.

## Archive boundary

- Do not install, deploy, run, connect, export, migrate, or revive this code.
- Do not treat archived memory, curator output, outbox content, or knowledge
  nodes as current project truth.
- Do not use this archive as setup guidance for a new or existing project.
- Do not contact old Worker or Neon resources through this archive.
- Existing cloud resources and legacy project data are unchanged.
- Git history remains the source for earlier versions of these files.

Current second-brain behavior lives in
[`plugins/second-brain/`](../../plugins/second-brain/README.md). Brownfield
projects use `project-sync` to identify local v1 wiring without reading legacy
memory content.

## Contents

| Path | Historical contents |
|---|---|
| `references/architecture-spec.md` | V1 architecture and runtime overview |
| `references/server/` | Worker, MCP, Neon schema, and containment source |
| `references/agents/` | Brain and knowledge curator roles |
| `references/hooks/` | Automatic capture, recall, curation, and guard hooks |
| `references/profiles/` | Project-type setup profiles |
| `references/kb-backfill*` | Knowledge backfill and freshness tooling |
| `references/templates/` | Archived MCP and hook settings templates |
| `project-init-rules/` | Retired v1 recognition rules formerly stored in the active general-rules library |

The old Worker package has no normal deploy or development script, and its
Wrangler configuration remains explicitly named
`wrangler.v1-archived.jsonc`.

# second-brain plugin

The toolkit's next project memory and knowledge system is being designed as
v3:

- **V3 has a draft specification but is not shipped.** Its Markdown-only
  architecture is under
  [`docs/second-brain-v3/`](../../docs/second-brain-v3/README.md). There is no
  v3 installer yet.
- **The previous v2 specification is superseded.** It is retained temporarily
  as historical design material and is not a v3 requirements source.
- **V1 remains retired.** The current plugin behavior still prevents an old
  Cloudflare Worker and Neon integration from being installed or used while
  v3 is under review.

Existing Worker and Neon resources remain untouched until the owner separately
approves deletion.

## Skills

- **second-brain** (`/second-brain`): refuses v1 installation, reports that v3
  is not shipped, and can identify local v1 integration files in an existing
  project. With approval it may deactivate or remove local integration only.
- **remember** (`/remember`): returns `v1_retired` and writes nothing until the
  Markdown v3 review and approval workflow ships.

## New projects

`project-init` defers memory and knowledge Gates 3 and 4. It never installs v1
and never creates a partial imitation of v3.

## Existing projects

`project-sync` detects committed v1 MCP entries, settings, hooks, wrappers,
agents, rules, and scaffolding. It offers:

1. reversible local deactivation, recommended first; or
2. removal of explicitly approved local integration files.

Neither choice contacts the Worker or Neon, reads legacy memory, imports content
into v3, deletes local secrets, or deletes cloud infrastructure. Account-level
connectors, local token cleanup, and cloud deletion are separate work.

## Archived v1 implementation

The old source remains under `skills/second-brain/references/` only as historical
implementation evidence. It is not an installation, deployment, export, or
migration path.

The archived Worker under `references/server/` has no default
`wrangler.jsonc`, no package deploy script, and an archive notice. Keeping the
code makes the decisions and failure history inspectable without shipping a
normal deployment path.

## V3 design direction

V3 is designed as a human-readable Git and Markdown system:

- raw interviews and exploration use a flat, dated `brainstorms/` collection;
- current product and system behavior is organized into capability folders
  under `specs/`;
- context, planning, decisions, knowledge, references, domain material, and
  operations are organized by type and area under `memory/`;
- related documents use ordinary Markdown backlinks;
- `CLAUDE.md` and `AGENTS.md` route both agents to one shared detailed rule;
- the main agent proposes useful updates at approved completion points;
- the owner approves, edits, selects, or skips proposals in normal language;
  and
- an on-demand memory librarian writes the approved updates in the task's
  worktree and pull request.

V3 does not require a database, memory MCP server, scripts, hooks, embeddings,
transcript capture, background curation, scheduled curation, or a fixed
proposal limit.

## Verification

Run:

```sh
node plugins/second-brain/tests/retirement-harness.mjs
```

The archived server's historical no-database checks remain available:

```sh
cd plugins/second-brain/skills/second-brain/references/server
npm ci
npm run check
```

## Maintaining this plugin

A content change bumps both plugin manifests and the marketplace metadata
version. Keep this README, the root README, `docs/toolkit-map.md`,
`project-init`, and `project-sync` aligned so none of them mistakes the v3
specification for shipped functionality or treats v2 as current.

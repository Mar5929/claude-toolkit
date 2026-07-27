# second-brain plugin

The toolkit's project memory system is between generations:

- **V1 is retired.** The old shared Cloudflare Worker and per-project Neon
  databases are not approved sources of truth. They will not be deployed,
  frozen, exported, backed up for migration, or imported into v2.
- **V2 is specified but not shipped.** Its Git-native architecture is under
  [`docs/second-brain-v2/`](../../docs/second-brain-v2/README.md). There is no v2
  installer yet.

Existing Worker and Neon resources remain untouched until the owner separately
approves deletion.

## Skills

- **second-brain** (`/second-brain`): refuses v1 installation, reports that v2
  is not shipped, and can identify local v1 integration files in an existing
  project. With approval it may deactivate or remove local integration only.
- **remember** (`/remember`): returns `v1_retired` and writes nothing until the
  Git-native v2 review and apply workflow ships.

## New projects

`project-init` defers memory and knowledge Gates 3 and 4. It never installs v1
and never creates a partial imitation of v2.

## Existing projects

`project-sync` detects committed v1 MCP entries, settings, hooks, wrappers,
agents, rules, and scaffolding. It offers:

1. reversible local deactivation, recommended first; or
2. removal of explicitly approved local integration files.

Neither choice contacts the Worker or Neon, reads legacy memory, imports content
into v2, deletes local secrets, or deletes cloud infrastructure. Account-level
connectors, local token cleanup, and cloud deletion are separate work.

## Archived v1 implementation

The old source remains under `skills/second-brain/references/` only as historical
implementation evidence. It is not an installation, deployment, export, or
migration path.

The archived Worker under `references/server/` has no default
`wrangler.jsonc`, no package deploy script, and an archive notice. Keeping the
code makes the decisions and failure history inspectable without shipping a
normal deployment path.

## V2 starting point

V2 starts from authoritative Git content:

- current requirements already committed to the project;
- current operational and design documentation already committed to the
  project; and
- new owner-approved knowledge created through the v2 workflow after it ships.

Legacy Neon memory, journals, curator output, caches, and outboxes are not v2
inputs.

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
`project-init`, and `project-sync` aligned so none of them mistakes v2
specifications for shipped functionality.

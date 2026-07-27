# V1 freeze and export runbook

Status: implementation ready in the toolkit, not deployed.

This is the operator procedure for freezing the live second-brain v1 system and
backing it up without deleting, draining, or migrating anything. Editing the
toolkit does not change the live Worker. Running this procedure requires
separate approval for the deployment and for access to each live database.

## Safety boundary

- The toolkit copy under `references/server/` is the canonical reusable source.
- The deployed Worker is currently built from the private `DragonFly`
  repository under `memory-mcp/`. Before deployment, synchronize the exact
  reviewed toolkit source into that repository and review the resulting diff.
- Never print database URLs, tokens, OAuth secrets, or Worker secrets into a
  terminal transcript, issue, pull request, or committed file.
- Never run `drain_journal`, delete rows, drop tables, revoke tokens, remove
  project hooks, or delete local caches during this procedure.
- Store database dumps in a private operator-controlled backup location, not in
  either Git repository.

## Approval checkpoints

Obtain separate owner approval before each of these:

1. Open or merge the synchronized `DragonFly` deployment change.
2. Deploy the Worker and change its live variables.
3. Access Neon to create snapshots and logical dumps.
4. Read or export legacy project content for human migration review.

Unit 00 source implementation alone authorizes none of those live actions.

## Phase 1: inventory without exposing secrets

List every registered project by the names of the Worker's
`DATABASE_URL_<PROJECT>` bindings. Record only the project id and binding name,
never the value. Reconcile this inventory with the known project list and stop
if any binding cannot be assigned to an owner.

For each project, prepare a private manifest with:

- project id;
- Neon project and branch identifiers;
- database binding name;
- pre-freeze table counts;
- current Worker deployment/version identifier;
- toolkit and `DragonFly` commit ids;
- freeze timestamp in UTC;
- snapshot identifier;
- dump filename, size, and SHA-256 hash;
- review-export filename, size, and SHA-256 hash;
- verification results and operator name.

## Phase 2: deploy containment

After the deployment approval:

1. Confirm the synchronized Worker diff matches the reviewed Unit 00 source.
2. Set `BRAIN_V1_WRITE_MODE=read-only`.
3. Set `AUTO_CURATE=0`.
4. Deploy the synchronized Worker.
5. Record the deployment identifier and UTC time in every project manifest.

The code fails closed when `BRAIN_V1_WRITE_MODE` is missing or unknown. Only the
explicit value `write` restores the server write path.

## Phase 3: prove the freeze

Use a test project first. Then verify each registered project:

- MCP `upsert_node`, `put_digest`, `append_journal`, and `drain_journal` return
  the exact `v1_read_only` JSON result as an error.
- Bearer `/journal`, `/curate`, and `/node` return HTTP 423 with the same JSON.
- `get_digest`, deliberate `recall`, `get_node`, `list_nodes`,
  `read_journal`, and `export` remain readable and say `legacy/advisory`.
- Repeating a deliberate recall does not change `recall_count` or
  `last_recalled_at`.
- A scheduled invocation performs zero model calls.
- Node, edge, version, digest, journal, and undrained-journal counts are
  unchanged by the verification.

The blocked-write body is:

```json
{
  "outcome": "skipped",
  "reason": "v1_read_only",
  "next_action": "retain the proposal locally or use the v2 migration path"
}
```

Stop and roll back the deployment if any write succeeds or any count changes.
Do not attempt to repair data during the freeze.

## Phase 4: take two backups

Create both forms. Neither replaces the other.

### Database-native snapshot

Create an immutable snapshot of the database's root branch using Neon's
snapshot feature. Record the snapshot identifier and creation time. Verify that
the snapshot can be opened for inspection without restoring it over the
original database.

Neon documentation:

- [Create and manage snapshots](https://neon.com/docs/guides/branching-neon-snapshots)
- [Restore a snapshot](https://neon.com/docs/guides/restore-snapshot)

### Logical database dump

Run `pg_dump` in custom format with owner and privilege restoration disabled:

```sh
pg_dump --format=custom --no-owner --no-privileges \
  --file=<private-backup-path>/<project>-v1-freeze.dump \
  <database-connection>
```

Pass the connection securely through the operator's approved credential
mechanism. Do not paste it into chat or commit it to a script.

Create and record a SHA-256 hash:

```sh
shasum -a 256 <private-backup-path>/<project>-v1-freeze.dump
```

Use `pg_restore --list` against the dump and confirm it contains the project,
node, edge, node-version, digest, journal, grant, and token tables. This is an
inspection step only. Do not restore over a live database.

## Phase 5: create the human-review export

Call the contained MCP `export` read tool for the correct project. Its v1 freeze
format includes:

- project identity;
- current nodes with metadata and full Markdown;
- edges;
- node revision history;
- digest and its timestamp;
- drained and undrained journal rows;
- counts and a `legacy/advisory` warning.

It deliberately excludes grants and token hashes because those are
access-control material, not migration content. Save the JSON beside the dump
in the private backup location and record its SHA-256 hash.

This export is evidence for classification. No item in it automatically becomes
a specification, current decision, or v2 memory file.

## Phase 6: contain each existing project

With separate project approval, merge these values into the committed project
settings:

```json
{
  "BRAIN_V1_WRITE_MODE": "read-only",
  "BRAIN_CAPTURE": "0",
  "BRAIN_CURATE_ON_END": "0",
  "BRAIN_RECALL": "0",
  "BRAIN_KC_NUDGE": "0"
}
```

Keep the legacy digest only if the owner wants it available with the warning.
Preserve `.mcp.json`, tokens, hooks, curator templates, outbox files, ignored
local memory caches, and all remote data. These are migration evidence.

## Completion record

Unit 00 live operations are complete only when every registered project has:

- a recorded snapshot identifier;
- a logical dump with a recorded SHA-256 hash;
- a human-review export with a recorded SHA-256 hash;
- unchanged pre-freeze and post-freeze data counts;
- verified blocked writes and labeled reads;
- an owner-approved project containment status.

Until then, report Unit 00 as implemented in source but not fully operated.

## Rollback

Rollback requires an explicit operator change to
`BRAIN_V1_WRITE_MODE=write`. It does not automatically change
`AUTO_CURATE=0`, `BRAIN_CAPTURE=0`, `BRAIN_CURATE_ON_END=0`,
`BRAIN_RECALL=0`, or `BRAIN_KC_NUDGE=0`. Restore each automatic behavior only
through a separate reviewed decision.

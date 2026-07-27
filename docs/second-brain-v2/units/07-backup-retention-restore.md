# Unit 07: backup, retention, and restore

Status: proposed. Depends on Units 01, 02, and 06.

## Outcome

Make project knowledge recoverable through ordinary Git while proving that
generated search infrastructure can be deleted and rebuilt safely.

## Authority and backup boundary

Tracked files under `specs/` and `memory/` are backed up with the repository.
The configured Git remote is the normal off-machine copy. Repository access,
branch protection, and retention follow the project's existing security policy.

The system does not store raw transcripts, per-turn captures, curator logs,
credentials, or hidden machine-local memory as a backup dependency.

For high-value projects, the owner may configure an additional repository
bundle or archive in a separately controlled location. That is a project risk
decision, not a mandatory second-brain service.

## Excluded disposable data

`memory/.cache/` is never part of the authoritative backup. It may contain:

- an optional SQLite index;
- embeddings when explicitly enabled;
- index health receipts;
- temporary retrieval evaluation output; and
- rebuild logs.

All such data must be reproducible from the tracked repository. Secrets,
tokens, connection strings, and user-level agent settings are never copied into
the project knowledge backup.

## Restore procedure

A restore exercise:

1. clones or checks out the repository into a clean directory;
2. runs `tools/memory/validate.mjs`;
3. confirms the routers and active records resolve;
4. runs representative deterministic retrieval queries;
5. rebuilds the optional index when enabled;
6. compares indexed source paths and hashes with Git; and
7. records recovery time and any missing external-authority pointers.

The project must remain understandable before step 5.

## Retention

Git history retains previous requirements, decisions, and corrections according
to the repository's policy. Current files identify active state explicitly.
Historical or rejected proposals do not need separate memory retention.

External authoritative records follow their own declared retention policy.
Git stores only the permitted stable pointer and authority declaration.

## Acceptance tests

- Restore from a fresh clone with no local memory database.
- Delete `memory/.cache/` and prove no current truth is lost.
- Rebuild an enabled index and reproduce all source hashes.
- Prove the repository contains none of the configured secret patterns.
- Prove a missing external authority is reported as unverifiable, not silently
  replaced by a stale local copy.

## Issues covered

#56, #57, and the portability and restore failures found in v1.

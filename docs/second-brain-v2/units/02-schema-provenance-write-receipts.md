# Unit 02: Git schemas, provenance, and change receipts

> Historical only. V3 has no numbered implementation units and does not inherit
> this unit. Read [`docs/second-brain-v3/`](../../second-brain-v3/README.md).

Status: proposed. Depends on Unit 01.

## Outcome

Make current truth, lifecycle, provenance, and approved changes inspectable in
Git without introducing a second canonical database representation.

## Record classes

Authoritative behavior lives under `specs/`. Decisions live under
`memory/decisions/`. Other typed memory folders use the smallest structure
their content needs.

Requirements and decisions have validated metadata:

- stable id;
- title;
- lifecycle status;
- created and updated dates;
- source or evidence;
- verification state;
- predecessor and successor links when applicable;
- affected subsystems or path mappings; and
- related requirements, decisions, tests, or external pointers.

Allowed lifecycle values are closed and documented. At minimum they distinguish
`proposed`, `active`, `superseded`, `stale`, and `retired` where the record type
supports them.

## Authority and provenance rules

- Git files are canonical. An optional index only copies searchable fields and
  pointers.
- Agent inference cannot become active truth without owner approval or verified
  repository evidence permitted by the record type.
- Every active requirement identifies why it is authoritative.
- A derived artifact records its source commit and content hash.
- Unknown status, duplicate stable ids, broken successor links, and secret-like
  content fail validation.
- A summary cannot outrank the requirement, decision, source document, or code
  from which it was derived.

## Change receipt

After an approved knowledge change, the active agent reports:

- exact changed paths;
- records created, updated, corrected, or superseded;
- before and after stable ids and statuses;
- evidence used;
- validation result;
- optional index refresh state; and
- commit hash when the change is committed.

The receipt is derived from the actual working-tree or committed diff. It is
not a separate source of truth and need not be stored in a database.

Unapproved proposals remain only in the conversation. They do not create files,
logs, pending records, or index entries.

## Acceptance tests

- Duplicate ids and invalid lifecycle values fail validation.
- A requirement reversal cannot leave both predecessor and successor active.
- A proposal that is skipped leaves the repository unchanged.
- The reported changed paths exactly match the applied Git diff.
- Deleting and rebuilding an optional index reproduces the same pointers and
  source hashes.
- Secret-pattern checks cover every typed knowledge folder.

## Issues covered

#53, #57, #58, and the authority ambiguity found during the architecture audit.

# Memory system v2: build contracts

**Status:** Draft written for work item P0-7 on 2026-08-20. Owner approval pending
pull request review. Nothing here has been approved by Mike yet.

**Authority:** [functional-requirements.md](functional-requirements.md) controls
behavior. [memory-system-v2-master-technical-architecture.md](memory-system-v2-master-technical-architecture.md)
controls the technical design. This document controls the build surface only: file
names, call shapes, output shapes, exit behavior, error codes, and check ids. If it
disagrees with either authority document, the authority document wins and this one is
corrected before the affected ticket is built.

**Plan:** [implementation-plan.md](implementation-plan.md) assigns the work items.
This document does not change that plan. Every file name here is the plan's name where
the plan already gives one. The few additions are listed in section 7.

## What this document is for

Section 25 of the architecture lists what has to exist before implementation is split
into build tickets. Four of those conditions had no artifact:

1. an interface contract and an error contract for every tool in section 16.1;
2. an owner and a package destination for every component in section 8;
3. versioned validators for the project settings and the record schemas; and
4. a startup adapter design for each supported host.

This document is those four artifacts. Section 6 shows where every section 25 condition
is met, including the ones met elsewhere.

A build session reads its work item in the plan, then the architecture sections the
work item cites, then the part of this document that covers the file it is about to
build.

## 1. Shared conventions

Every runtime file follows these rules. The per-operation contracts in section 2 do not
repeat them.

### 1.1 The runtime files

All paths are relative to the repository root.

| File | Job |
| --- | --- |
| `plugins/second-brain/tools/memory.mjs` | The one command-line entry for every operation in architecture section 16.1 |
| `plugins/second-brain/tools/memory-write.mjs` | The write coordinator. Only this file changes canonical Markdown |
| `plugins/second-brain/tools/boot-brief.mjs` | Assembles the boot brief. Read-only |
| `plugins/second-brain/tools/tracker-adapter.mjs` | Optional. Reads the configured work tracker |
| `plugins/second-brain/tools/gold-set.mjs` | Runs the retrieval gold set |
| `plugins/second-brain/tools/knowledge-layout.mjs` | Migration engine, v1 to v2 |
| `plugins/second-brain/tools/lib/scope.mjs` | Resolves the physical scope and reads the privacy boundary |
| `plugins/second-brain/tools/lib/record-schema.mjs` | The versioned record and settings schemas |
| `plugins/second-brain/tools/lib/result.mjs` | Builds the result envelope and the reason codes |
| `plugins/second-brain/hooks/boot-brief-session-start.mjs` | Claude Code SessionStart adapter |
| `plugins/second-brain/hooks/memory-write-guard.mjs` | Claude Code PreToolUse guard |
| `plugins/second-brain/skills/session-search/scripts/search-sessions.mjs` | Session-history adapter |

The three files under `tools/lib/` are additions to the plan's file list. Section 7
records why.

### 1.2 Call shape

```
node <plugin>/tools/memory.mjs <operation> [--flag value]...
```

The operation name is the section 16.1 name with the `memory_` prefix dropped and
underscores turned into hyphens. So `memory_search` is `memory.mjs search`,
`memory_update_current` is `memory.mjs update-current`, `spec_search` is
`memory.mjs spec-search`, and `session_search` is `memory.mjs session-search`.

Nothing is read from standard input except where a contract says so. The two hooks are
the exception, because their host hands them a JSON event on standard input.

### 1.3 The result envelope

Every operation prints exactly one JSON object to standard output and nothing else.
Human-readable rendering is the skill's job, not the tool's.

```json
{
  "schema": "memory-tool-result/1",
  "tool_version": "2.0",
  "operation": "memory_search",
  "status": "ok",
  "project_id": "claude-toolkit",
  "scope_root": "/absolute/real/path",
  "result": null,
  "warnings": [],
  "errors": [],
  "searched": []
}
```

- `status` is one of `ok`, `noop`, `refused`, `error`, or `awaiting-approval`.
- `result` holds the operation's payload. Its shape is defined per operation in
  section 2. An empty answer is an empty array or `null`, never a message.
- `warnings` and `errors` are arrays of entries shaped
  `{ "code": "...", "message": "...", "path": "...", "detail": "..." }`. `path` and
  `detail` may be absent. `code` is always one of the codes in section 1.6.
- `searched` names the scope actually covered. Retrieval and honest failure need it
  (architecture section 15.6). Other operations leave it empty.

Two rules keep the envelope deterministic, which validator check MV-15 depends on:

- The same inputs produce the same bytes. Field order is fixed as above.
- No wall-clock value appears anywhere except an `as_of` date, and only in operations
  whose contract names it. Those operations compare dates, so the comparison date has
  to be visible.

### 1.4 Exit behavior

| Exit code | Meaning |
| --- | --- |
| 0 | The operation ran. This covers success, NOOP, an empty result, and any number of warnings |
| 1 | The operation was refused by a deterministic rule. No file changed. `errors` names the rule |
| 2 | The operation could not be evaluated. A file was unreadable, front matter was malformed, a query would not parse, or the scope root did not resolve |

No other exit code is used. Three rules follow from architecture section 20 and are not
negotiable at build time:

- An empty result is exit 0. Empty stays empty.
- A search parse error is exit 2 and never an empty result.
- A refusal writes nothing. No lock, no journal, no partial file, no retry with a
  widened boundary.

Both hooks exit 0 in every path, but for different reasons, and the difference matters.

- `boot-brief-session-start.mjs` is **fail-open**. It exits 0 because a broken memory
  system should degrade a session, never stop one.
- `memory-write-guard.mjs` exits 0 because that is how a Claude Code `PreToolUse` hook
  reports a decision. It refuses by printing
  `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny",
  "permissionDecisionReason":"<message>"}}` on standard output, which is the shape the
  other guard hooks in this repository already use. The exit code is not the refusal.
- The guard is **fail-closed on the guarded paths**. If it cannot decide, because scope
  resolution failed or the tool input would not parse, and the call names a path that
  could be inside the guarded set, it denies and says why. An undecidable guard that
  allows the write is not a guard (architecture section 13.3).
- The guard stays silent on every call it does not guard. A tool call that touches
  nothing in the guarded set prints nothing.

### 1.5 Two-phase writes

Every operation that changes canonical Markdown runs in two calls. This is how
architecture section 13.2 binds the owner's approval to exact bytes.

**Phase 1, propose.** The operation runs with `--propose`. It resolves scope and
privacy, runs the placement, schema, provenance, duplicate, conflict, and privacy
checks, and writes the complete proposal to `.memory/review/<proposal-id>.md`. It
changes no canonical file. It returns:

```json
{
  "proposal_id": "p-2026-08-20-0001",
  "operation": "memory_add",
  "destination": "knowledge/memory/decisions/example.md",
  "record_id": "decision-example-001",
  "content_hash": "sha256:...",
  "source_hashes": [{ "locator": "...", "hash": "sha256:..." }],
  "pin_statement": null,
  "bullets": {
    "what": "...", "where": "...", "why": "...",
    "assumptions": "...", "unverified": "..."
  },
  "review_file": ".memory/review/p-2026-08-20-0001.md"
}
```

`status` is `awaiting-approval` and the exit code is 0.

**Phase 2, apply.** The owner answers keep, change, edit, or skip. The agent then runs
the same operation with `--apply --proposal <id> --content-hash <hash>`. The
coordinator rechecks the proposal hash, every source hash, the destination, the record
id, and the pin statement. Any changed bound input is refused with
`approval/stale-proposal`, and the review returns.

Where the owner edited the review file, the agent passes `--content-hash` computed from
the current file contents. The coordinator reruns placement, record type, provenance,
duplicate, conflict, schema, privacy, and future-agent interpretation checks against
those contents before it writes anything (FR-113).

A successful apply returns this `result` payload. It is the same for every two-phase
operation, so the contracts in section 2 do not repeat it. They name only the fields
their own operation adds.

```json
{
  "proposal_id": "p-2026-08-20-0001",
  "operation": "memory_add",
  "changed_paths": ["knowledge/memory/decisions/example.md"],
  "record_id": "decision-example-001",
  "pin_removed": null,
  "artifacts_rebuilt": [],
  "validation": "passed",
  "journal": "cleared"
}
```

`changed_paths` lists every canonical path the transaction touched, which is
architecture section 13.4 step 8. One approved write is one reported operation even
when it changes several files. A failed transaction restores the preimages, reports
`write/validation-failed` or `write/link-repair-failed`, and returns
`changed_paths: []`, because nothing changed.

A skip needs no second call. The review file is removed by
`memory.mjs cancel --proposal <id>`, which touches nothing canonical.

**What is not approval.** Silence, an unclear reply, a request to see the full text, a
helper agent, a hook, and a background process are never approval (FR and architecture
section 13.2). No tool flag can stand in for the owner's answer. There is no
`--force`, no `--yes`, and no non-interactive approval mode.

### 1.6 Reason codes

Every entry in `errors` and `warnings` carries one of these. The `scope/` and
`privacy/` families are the architecture's section 21.4 table, unchanged. The rest are
defined here so a build session does not invent codes per file.

| Code | Raised when | Exit |
| --- | --- | --- |
| scope/unresolved-root | `project_root` is missing, or resolves to a directory that does not contain the knowledge folder | 2 |
| scope/outside-root | A canonicalized target path is not the scope root and does not sit beneath it | 1 |
| scope/symlink-escape | A path inside the scope resolves, through a link or junction, to a real path outside it | 1 |
| scope/undeclared-nested-scope | A second `knowledge/project.md` sits inside the scope and no `subroots` entry names it | 1 |
| scope/overlapping-scopes | Two scope roots are the same directory, or one sits inside the other without a declaration | 1 |
| scope/duplicate-project-id | Two scopes in the repository claim the same `project_id` | 1 |
| scope/cross-scope-result | A retrieval or pin candidate belongs to another scope | 1 |
| privacy/transfer-denied | An operation would send project content off the machine while `external_transfer` is denied | 1 |
| privacy/consent-missing | Transfer is approved but the consent record is missing, unresolvable, or incomplete | 1 |
| privacy/secret-detected | A proposal or canonical file matches the secret pattern set with no recorded exemption | 1 |
| privacy/third-party-personal | A record identifies another person with no owner approval naming that record | 1 |
| privacy/sensitive-unapproved-exposure | A sensitive record would enter startup, a pin, a view, or a log body with no recorded exposure approval | 1 |
| settings/owner-only | An agent route would change `project_root`, `subroots`, or `privacy` in `knowledge/project.md` | 1 |
| approval/missing | An apply call arrived with no proposal id or no content hash | 1 |
| approval/stale-proposal | A bound input changed between propose and apply | 1 |
| approval/source-changed | A cited source file changed after the owner reviewed it | 1 |
| record/unknown-id | The named record id does not exist in this scope | 1 |
| record/duplicate-id | The proposed id already exists in this scope | 1 |
| record/missing-evidence | A new record carries no evidence entry | 1 |
| record/inference-without-basis | An inference or pattern has an empty `based_on` list | 1 |
| record/schema-invalid | A required field is missing or holds a value outside its allowed set | 1 |
| record/merge-conflict | Merge was asked for records whose meaning, truth status, or effective dates differ | 1 |
| record/legacy-gap | A migrated record is missing v2 metadata. Warning only, never a failure | 0 |
| write/lock-held | Another write holds the project lock | 1 |
| write/journal-present | An interrupted transaction has to be recovered before this operation runs | 2 |
| write/validation-failed | Focused validation failed after staging, so the preimages were restored | 1 |
| write/link-repair-failed | A move or rename left a link that cannot be repaired, so nothing changed | 1 |
| write/guard-refused | The pre-write guard refused a write that did not come through the coordinator | 1 |
| cli/invalid-invocation | The operation name is not one this tool defines, or a required flag is missing or malformed. The message names which | 2 |
| policy/acceleration-refused | Retrieval code imports or calls a database, index, embedding, or cache accelerator with no new approved ADR. AT-18 and ADR-014. This is a policy refusal, not a malformed record, and it carries its own code so a harness can tell the two apart | 1 |
| retrieval/parse-error | A query or filter would not parse | 2 |
| retrieval/unsupported-filter | A filter names a field the schema does not define | 2 |
| startup/missing-source | A startup input is missing. Warning only | 0 |
| startup/stale-current | `knowledge/current.md` is missing or older than the recent window. Warning only | 0 |
| startup/over-budget | The required blocks alone exceed the budget. Warning only, rendered in visible overflow | 0 |
| startup/pin-hash-mismatch | A pin entry's hash does not match its record summary. Warning only, the entry is omitted from current truth | 0 |
| tracker/not-configured | No tracker is configured. Warning only | 0 |
| tracker/unavailable | The configured tracker could not be reached. Warning only | 0 |
| history/gate-closed | `session_search` ran without an owner request and without a named reason current sources were insufficient | 1 |
| history/unavailable | The host history store is missing or unreadable. Warning only, with the scope of the miss | 0 |
| migration/ambiguous | The source layout matched more than one signature, or a mapping is unclear | 1 |
| migration/collision | A target path already exists with different content | 1 |
| migration/unsupported-source | The detected layout is `flat-149` or `retired-v3`, which v2 detects but does not convert | 1 |

The code list is closed. A build ticket that needs a code not on this list changes this
section first.

### 1.7 What never leaves the tools

Refusal messages, warnings, logs, and the crash journal carry ids, paths, counts, and
reason codes. They never carry record body text, matched secret text, or sensitive
content (architecture section 21.7). A message that would need the body says "see the
record" and gives the path.

### 1.8 Preflight every operation runs

In this order, before anything else:

1. Resolve the physical scope by architecture section 21.1. On failure, stop with
   `scope/unresolved-root`.
2. Read the privacy block by section 21.5. Any missing, unreadable, or unknown value
   resolves to the most restrictive setting, and that resolution is reported as a
   warning.
3. If a crash-recovery journal is present under `.memory/`, restore the preimages or
   complete the regeneration, report the recovery as a warning, then continue. This is
   the only write a read operation may cause, and it only ever restores an approved
   state that a crash interrupted.
4. Canonicalize every path argument and test it against the scope root.

Step 3 is what makes architecture section 13.4's "recover before current retrieval"
true without giving startup a write. Section 5.1 explains the split.

## 2. Tool contracts

Twenty-three operations. Every one of them is reached through `memory.mjs`. Each
contract names the file that does the work behind it.

Fields shared by every contract are in section 1 and are not repeated. Where a contract
says "Approval: two-phase", it runs the propose and apply flow in section 1.5, and its
apply result is the payload defined there.

How to read each contract:

- **Inputs** are the flags on the `Command` line. A flag in square brackets is
  optional. Every other flag is required, and a missing one is refused before the
  preflight with `record/schema-invalid`. Where a default matters, a separate Inputs
  line names it. No operation reads standard input.
- **Outputs** are the `Result` line, carried in the `result` field of the section 1.3
  envelope. A read operation that finds nothing returns an empty array or `null`, never
  a message.
- **Errors** are the reason codes from section 1.6, carried in the `errors` array.
  Every code the contract does not name is still possible from the shared preflight in
  section 1.8.
- **Exit** follows section 1.4. Only `memory_validate` states its own exit rule, and it
  states it because its exit depends on the worst check status in the run.

### 2.1 memory_capabilities

- Command: `memory.mjs capabilities`
- Works in: `tools/memory.mjs`, capability resolver
- Purpose: tell a session what this project's memory can do, so the agent never guesses
  (architecture section 16.1, FR-007).
- Inputs: none.
- Result: `operations` (the list of names this build supports), `approval_mode`
  (`owner-approved`), `search_mode` (`direct-file`), `pin_support` and `pin_count`,
  `budget_bytes` and `required_bytes`, `project_id`, `privacy` (the resolved boundary),
  `external_transfer` (`denied` or `approved`), `tracker` (adapter name or `null`),
  `session_history_scope`, and `degraded` (a list of unavailable features with reasons).
- Errors: `scope/unresolved-root` at exit 2. Everything else is a warning.
- Approval: none. Read-only.

### 2.2 memory_status

- Command: `memory.mjs status`
- Works in: `tools/memory.mjs`
- Purpose: report the live state of this project's memory.
- Inputs: none.
- Result: `project_id`, `scope_root`, `schema_version`, counts by record type, pin
  count, `current_md` (`present` or `missing`, plus its latest dated update),
  `stale` (true or false), `journal_present`, `gold_set` (`present`, `missing`, or the
  mapped path), `last_validate` (absent when the project has never run it), and
  `as_of`, the date the staleness comparison used.
- Errors: `scope/unresolved-root` at exit 2.
- Approval: none. Read-only.

### 2.3 memory_search

- Command: `memory.mjs search --query "<text>" [--type fact|decision|event|pattern] [--status active|superseded|retired] [--domain <v>] [--topic <v>] [--limit <n>]`
- Works in: `tools/memory.mjs`, retrieval router
- Purpose: tier 2 curated project search over canonical Markdown (architecture section
  15.2).
- Inputs: `--query` is required. Filters are optional. `--limit` defaults to 20.
- Result: an array of result objects, each carrying the section 15.2 minimum contract:
  `project_id`, `layer`, `record_id` or `path`, `status`, `summary`, `provenance`,
  `match_reason`, and `degraded_warning` when one applies. Ranking follows the section
  15.2 authority order. Out-of-scope candidates are dropped before ranking, not after.
- Empty: `status` `ok`, `result` `[]`, exit 0.
- Errors: `retrieval/parse-error` and `retrieval/unsupported-filter` at exit 2.
  `scope/cross-scope-result` is a warning on a dropped candidate, not a failure.
- Approval: none. Read-only. Creates no cache, index, working set, or metrics file.

### 2.4 memory_get

- Command: `memory.mjs get --id <record-id>` or `memory.mjs get --path <relative-path>`
- Works in: `tools/memory.mjs`
- Purpose: tier 1 exact lookup. Returns the whole record, never a fragment.
- Result: the record's parsed front matter, its H1, its summary sentence, its body, and
  its resolved path.
- Errors: `record/unknown-id` and `scope/outside-root` at exit 1.
- Approval: none. Read-only.

### 2.5 memory_timeline

- Command: `memory.mjs timeline --entity <name> [--from <date>] [--to <date>]`
- Works in: `tools/memory.mjs`
- Purpose: the dated sequence for one entity, including superseded and retired records,
  which stay available for history questions (architecture section 14).
- Result: an array of entries with `record_id`, `type`, `status`, `effective_from`,
  `effective_to`, `occurred_at`, and `summary`, sorted oldest first.
- Errors: none beyond the shared preflight. An entity with no records is an empty
  array at exit 0.
- Approval: none. Read-only.

### 2.6 memory_related

- Command: `memory.mjs related --id <record-id>`
- Works in: `tools/memory.mjs`
- Purpose: outgoing links plus backlinks derived on request (architecture section 12.4).
- Result: `outgoing` (links authored on the record) and `incoming` (records whose text
  contains this record's id or relative path). Both carry `record_id`, `path`, and
  `relation`.
- Behavior: derives backlinks by searching tracked Markdown inside the scope root. It
  builds no registry, graph, database, index, or cache, and it works with `.memory/`
  absent.
- Errors: `record/unknown-id` at exit 1.
- Approval: none. Read-only.

### 2.7 memory_sources

- Command: `memory.mjs sources --id <record-id>`
- Works in: `tools/memory.mjs`
- Purpose: show what a record rests on, so a consequential answer can follow evidence
  (architecture section 15.3).
- Result: the record's `evidence` entries with `source_type`, `locator`, `observed_at`,
  `retrieved_at`, `version`, and `note`, plus its `based_on` list resolved to records,
  plus a `reachable` flag per locator where the locator is a path inside the scope.
- Errors: `record/unknown-id` at exit 1. An unreachable locator is a warning with
  `startup/missing-source`, not a failure.
- Approval: none. Read-only.

### 2.8 memory_review

- Command: `memory.mjs review [--scope focused|deep] [--since <date>]`
- Works in: `tools/memory.mjs`, review engine
- Purpose: produce a repair worklist across the architecture section 17 categories.
- Inputs: `--scope` defaults to `focused`. `deep` runs only on owner request, after a
  migration, or when the project's configured backlog threshold is crossed.
- Result: an array of worklist items, each with `category`, `severity`, the affected
  `record_ids` or `paths`, `what_is_wrong`, and `suggested_operation`. The suggested
  operation is always one of the section 14 lifecycle operations or a pin operation.
- `severity` is one of `high`, `medium`, `low`. No design document names a severity
  vocabulary, so P3-4 defined this one. It orders a worklist for the owner and changes
  nothing that gets stored, because review writes nothing at all. Recorded as built and
  flagged, at the low end of the flag list.
- Errors: none beyond the shared preflight.
- Approval: none, and this is structural. The review engine has no write capability at
  all. It cannot call the coordinator. Architecture principle 14 and ADR-012.

### 2.9 memory_add

- Command: `memory.mjs add --type <type> --file <staged-markdown> [--propose | --apply --proposal <id> --content-hash <hash>]`
- Works in: `tools/memory.mjs` to `tools/memory-write.mjs`, lifecycle engine
- Purpose: add one new durable meaning.
- Checks before the proposal is shown: unique id, required schema fields, at least one
  evidence entry, `based_on` for an inference or a pattern, `occurred_at` for an event,
  the seven required parts for a decision, duplicate-meaning search, and the secret
  pattern set.
- Errors: `record/duplicate-id`, `record/missing-evidence`,
  `record/inference-without-basis`, `record/schema-invalid`, `privacy/secret-detected`,
  `privacy/third-party-personal`, all at exit 1.
- Approval: two-phase.

### 2.10 memory_confirm

- Command: `memory.mjs confirm --id <record-id> --evidence <locator> [--propose | --apply ...]`
- Works in: `tools/memory-write.mjs`
- Purpose: reaffirm meaning that has not changed.
- Behavior: appends actor, date, and evidence. It never rewrites the summary, so a pin
  on this record survives untouched (architecture section 11.4).
- Errors: `record/unknown-id` at exit 1.
- Approval: two-phase.

### 2.11 memory_correct

- Command: `memory.mjs correct --id <record-id> --file <corrected-markdown> --reason "<text>" [--propose | --apply ...]`
- Works in: `tools/memory-write.mjs`
- Purpose: fix a record that was wrong.
- Behavior: writes the reason, date, approval, and correcting evidence onto the current
  record. Git preserves the prior text. When the approved summary changes, the record's
  pin is removed in the same transaction unless the owner separately approves the
  corrected summary for startup in the same review.
- Errors: `record/unknown-id`, `record/schema-invalid` at exit 1.
- Approval: two-phase.

### 2.12 memory_supersede

- Command: `memory.mjs supersede --old-id <record-id> --file <successor-markdown> [--propose | --apply ...]`
- Works in: `tools/memory-write.mjs`
- Purpose: replace a record that was true during an earlier period.
- Behavior: one transaction creates the successor, sets both effective dates, and
  writes reciprocal `supersedes` and `superseded_by` links. The old record's pin is
  removed in the same transaction. A successor is never pinned automatically.
- Errors: `record/unknown-id`, `record/duplicate-id`, `record/schema-invalid` at exit 1.
- Approval: two-phase.

### 2.13 memory_retire

- Command: `memory.mjs retire --id <record-id> --reason "<text>" --phrase "<exact text>" [--phrase ...] [--propose | --apply ...]`
- Works in: `tools/memory-write.mjs`
- Purpose: end a record that has no direct successor.
- Behavior: the proposal includes the phrase hunt. Every surviving location of each
  exact phrase in tracked files is listed with its path and line. Retirement completes
  only when each location is corrected through normal approval, marked as an explicit
  historical quotation, or exempted with a reason recorded on the retiring record
  (architecture section 14.3).
- Result on apply: the retired record, the pin removal when one existed, and the list
  of locations that still need work.
- Errors: `record/unknown-id` at exit 1.
- Approval: two-phase.

### 2.14 memory_merge

- Command: `memory.mjs merge --ids <id>,<id>[,<id>] --survivor <id> [--propose | --apply ...]`
- Works in: `tools/memory-write.mjs`
- Purpose: combine true duplicates.
- Behavior: allowed only for identical meaning with compatible truth status and
  effective dates. Every evidence entry is consolidated onto the survivor. The proposal
  states explicitly whether the survivor stays pinned, and the owner has to choose
  (architecture section 11.4).
- Errors: `record/merge-conflict` at exit 1 when meaning, truth status, or effective
  dates differ. The linked records are preserved and nothing is written.
- Approval: two-phase.

### 2.15 memory_delete

- Command: `memory.mjs delete --id <record-id> --reason "<text>" [--privacy] [--propose | --apply ...]`
- Works in: `tools/memory-write.mjs`
- Purpose: remove an accidental, corrupt, surplus duplicate, or privacy record.
- Behavior: the proposal shows a visible diff. Any pin entry is removed in the same
  transaction, before any approved derived artifact is rebuilt. With `--privacy`, the
  operation also clears the content from record history, any approved view, and any
  separately approved external copy, keeps non-sensitive audit metadata, and then
  reports the Git-history boundary honestly (architecture sections 14.4 and 21.8).
- Result on apply: `deleted`, `pin_removed`, `purge_complete` (true or false), and
  `git_history_remaining`, which describes exactly what a complete erasure would still
  need. The tool never reports an erasure it has not proven.
- Errors: `record/unknown-id` at exit 1.
- Approval: two-phase.

### 2.16 memory_pin

- Command: `memory.mjs pin --id <record-id> [--propose | --apply ...]`
- Works in: `tools/memory-write.mjs`, pin manager
- Purpose: make one record's approved summary appear at the start of every session for
  this project.
- Checks in the proposal, in this order (architecture sections 11.1 and 11.3): the
  record is in this project's canonical memory tree, its status is active, its
  provenance is valid, its current meaning was owner-approved, it has a one-sentence
  summary, the summary and its qualifiers fit the pin statement limit, the required
  brief still fits the budget, and the record is not sensitive without a recorded
  approval naming startup exposure.
- Budget preflight: when the complete required brief would exceed
  `startup.budget_bytes`, the operation refuses and returns the exact current pin set
  and the byte count that needs review.
- Result on apply: the entry written to `knowledge/memory/pins.md`, holding only the
  record id, a relative link, the approval date, and the hash of the exact approved
  summary. The summary itself is never copied. The file is created on the project's
  first pin.
- Errors: `record/unknown-id`, `scope/cross-scope-result`,
  `privacy/sensitive-unapproved-exposure`, `startup/over-budget` (as a refusal here,
  exit 1, because a write that would break the brief is refused rather than warned).
- Approval: two-phase.

### 2.17 memory_unpin

- Command: `memory.mjs unpin --id <record-id> [--propose | --apply ...]`
- Works in: `tools/memory-write.mjs`
- Behavior: shows the current startup statement and the record link, then removes the
  entry. Removing the last entry removes `knowledge/memory/pins.md`. The record itself
  keeps its content, its status, and its place in retrieval.
- Errors: `record/unknown-id` at exit 1.
- Approval: two-phase.

### 2.18 memory_update_current

- Command: `memory.mjs update-current --trigger handoff|focus-change|completed-work --file <staged-markdown> [--propose | --apply ...]`
- Works in: `tools/memory-write.mjs`
- Purpose: the only operation that writes `knowledge/current.md` (architecture sections
  10.6 and 16.1).
- Inputs: `--trigger` is required and has exactly three allowed values, matching the
  three triggers in section 10.6. Any other value is refused.
- Behavior: runs the same approval review as every other write. Where an approved
  completed-work event changes the current focus, the blockers, or the next step, the
  event's own transaction performs this update instead of a second call, and the owner
  sees both in one review.
- Errors: `record/schema-invalid` at exit 1 when the file lacks the current focus, the
  blockers, the next step, or the handoff. `approval/missing` at exit 1 when an apply
  call carries no proposal.
- Approval: two-phase. There is no route around this operation. The guard in section
  5.3 refuses every other write to that path.

### 2.19 spec_search

- Command: `memory.mjs spec-search --query "<text>" [--limit <n>]`
- Works in: `tools/memory.mjs`
- Purpose: search approved behavior under `knowledge/specs/`.
- Result: the same result contract as `memory_search`, with `layer` set to `spec`.
- Errors: `retrieval/parse-error` at exit 2.
- Approval: none. Read-only.

### 2.20 spec_get

- Command: `memory.mjs spec-get --path <relative-path>` or `--id <spec-id>`
- Works in: `tools/memory.mjs`
- Result: the whole specification file with its resolved path.
- Errors: `record/unknown-id` and `scope/outside-root` at exit 1.
- Approval: none. Read-only.

### 2.21 session_search

- Command: `memory.mjs session-search --query "<text>" --reason "<owner-request|why current sources were insufficient>" [--host <name>] [--machine <name>] [--from <date>] [--to <date>]`
- Works in: `tools/memory.mjs` calling
  `skills/session-search/scripts/search-sessions.mjs`, session-history adapter
- Purpose: tier 5. Search the host's own session history, in place and read-only.
- Gate: `--reason` is required. It is either the owner asking in this session, or a
  named statement of why the current project owners were insufficient (architecture
  section 15.5). A call with no reason is refused with `history/gate-closed`. In a
  sensitive project, only an owner request opens the gate, and the insufficient-sources
  path does not (section 21.6 point 4).
- Result: an array of entries with `host`, `session_id`, `date`, `role`,
  `message_locator` or resume route, and a short excerpt.
- Behavior: copies nothing, indexes nothing, summarizes nothing, and writes nothing.
  Scope is the project id, the machine, the host, and the date range.
- Errors: `history/gate-closed` at exit 1. `history/unavailable` is a warning at exit 0
  that names the machine, host, and dates actually covered, because a miss means only
  that nothing was found in that scope.
- Approval: none for the read. The gate is the control.

### 2.22 memory_rebuild_views

- Command: `memory.mjs rebuild-views`
- Works in: `tools/memory-write.mjs`, view generator
- Purpose: rebuild whatever derived artifact this project has separately approved.
- Behavior in a default v2 project: there is nothing to rebuild. The operation returns
  `status` `noop`, `result` `{ "artifacts": [] }`, and exit 0. It does not fail
  (architecture section 8).
- Behavior where an artifact exists: it is regenerated inside a coordinator
  transaction, carries a deterministic input fingerprint, names and links every input,
  and identifies itself as generated. It never writes `knowledge/current.md`, which is
  authored, and never stores the recent window, which is assembled at startup.
- Errors: `write/lock-held`, `write/validation-failed` at exit 1.
- Approval: none. It regenerates from approved sources and creates no new meaning.

### 2.23 memory_validate

- Command: `memory.mjs validate [--check MV-01,MV-07] [--fixtures]`
- Works in: `tools/memory.mjs`, validator, reading `tools/lib/record-schema.mjs`
- Purpose: run the deterministic checks in section 4 of this document.
- Inputs: `--check` limits the run to named check ids. `--fixtures` additionally runs
  the shipped isolation fixtures from architecture section 21.11.
- Result: an array with one entry per check: `id`, `version`, `status`
  (`pass`, `warn`, `fail`, or `skipped`), `findings` (paths and counts, never bodies),
  and `skipped_because` where a check does not apply.
- Exit: 0 when every check passes or warns. 1 when any check fails. 2 when the
  validator itself could not run.
- Approval: none. The validator writes nothing.

### 2.23.1 Derived files the write path keeps under `.memory/`

Three files live beside the review file. None is project memory, all sit under
`.memory/`, which the project gitignores, and none is read to decide what is true.
Deleting the folder loses nothing that cannot be rebuilt.

| File | Holds | Why it is not in the review file |
| --- | --- | --- |
| `.memory/review/<proposal-id>.md` | The complete proposal, exactly as the owner reviews and may edit it | This is the file FR-111 and FR-112 describe |
| `.memory/review/<proposal-id>.proposal.json` | The section 13.2 approval binding: proposal hash, destination path, record id, evidence locators and source hashes, pin statement | The review file has to stay pure content. Binding data inside it would be editable by the owner in the same pass that edits the text, and FR-112 approves the exact contents of that file |
| `.memory/journal.json` | The crash-recovery journal for an interrupted transaction | Section 13.4 |
| `.memory/last-move.json` | A receipt for the most recent approved move or rename, which validator check MV-22 reads to confirm link repair was complete | A receipt of a finished write is not part of a pending proposal |

`.memory/last-move.json` is the one entry here that the architecture does not name.
It is a convenience for MV-22, not a requirement. Flagged for owner review.

### 2.24 Supporting commands that are not tool operations

`memory.mjs cancel --proposal <id>` removes a review file after a skip. It touches no
canonical path. It does not add an operation to the section 16.1 surface. It is
plumbing for operations that surface already defines.

`memory.mjs move --id <record-id> --to <relative-path>` moves or renames an approved
record through the coordinator, repairing every incoming link in the same transaction
or changing nothing. Architecture section 16.1 does not list a move operation, yet
FR-086 requires the behavior and something has to invoke it. It is recorded here as a
supporting command for that reason, not as a twenty-fourth operation on the section
16.1 surface. If the owner would rather see it in section 16.1, that is an architecture
edit and this row follows it. Flagged for owner review.

Every one of these commands returns the section 1.5 apply result shape, including
`changed_paths`, because C11 makes that shape universal for a two-phase write.
`rebuild-views` returns it too: it writes, so it reports what it wrote.

The boot brief has no `memory.mjs` command. `tools/boot-brief.mjs` is the assembler and
is run directly, which is what the section 5.2 Codex route text does and what the
harnesses call. An earlier draft of this section named a `memory.mjs brief` passthrough
and contradicted section 5.2. The direct call wins: one entry point per job, no second
name to keep in step with the route text already shipped in `AGENTS.md`.

## 3. Component to file ownership

Every component in architecture section 8, in the same order, with the file that owns
it and the work item that builds it.

| Component | Owning file | Built in |
| --- | --- | --- |
| Host startup adapter | `plugins/second-brain/hooks/boot-brief-session-start.mjs` for Claude Code. For Codex, the AGENTS.md route block written by `plugins/second-brain/skills/second-brain/SKILL.md` | P1-2, P1-5 |
| Capability resolver | `plugins/second-brain/tools/memory.mjs` (`capabilities`, `status`) | P1-3 |
| Source resolver | `plugins/second-brain/tools/boot-brief.mjs` | P1-2 |
| Boot brief assembler | `plugins/second-brain/tools/boot-brief.mjs` | P1-2, P1-6 |
| Tracker adapter (optional) | `plugins/second-brain/tools/tracker-adapter.mjs` | P1-4 |
| Retrieval router | `plugins/second-brain/tools/memory.mjs` (`search`, `get`, `timeline`, `related`, `sources`, `spec-search`, `spec-get`) | P3-1 |
| Canonical store | `plugins/second-brain/tools/memory-write.mjs` | P2-2 |
| Write coordinator | `plugins/second-brain/tools/memory-write.mjs` | P2-2 |
| Lifecycle engine | `plugins/second-brain/tools/memory-write.mjs` | P2-4 |
| Pin manager | `plugins/second-brain/tools/memory-write.mjs` | P2-5 |
| View generator | `plugins/second-brain/tools/memory-write.mjs` (`rebuild-views`) | P2-2 |
| Validator | `plugins/second-brain/tools/memory.mjs` (`validate`) with `tools/lib/record-schema.mjs` | P2-1, P3-6 |
| Review engine | `plugins/second-brain/tools/memory.mjs` (`review`) | P3-4 |
| Cleanup skill | `plugins/second-brain/skills/cleanup/SKILL.md`, drafted as `SKILL-v2.md` | P3-4, swapped in P4-2 |
| Session-history adapter | `plugins/second-brain/skills/session-search/scripts/search-sessions.mjs` | P3-3 |
| Migration engine | `plugins/second-brain/tools/knowledge-layout.mjs` | P4-1 |

Three files carry required behavior that section 8 does not list as a component. They
are here so nothing in the build is homeless.

| Piece | Owning file | Built in | Required by |
| --- | --- | --- | --- |
| Pre-write guard | `plugins/second-brain/hooks/memory-write-guard.mjs` | P2-3 | Architecture section 13.3 |
| Gold set runner | `plugins/second-brain/tools/gold-set.mjs` | P3-5 | Architecture section 18.1 |
| Save reminder | `plugins/second-brain/hooks/save-reminder.mjs` | Unchanged from v1 | Existing behavior. It knows nothing about the taxonomy |

Five shared modules sit under `plugins/second-brain/tools/lib/`. Each exists because
more than one entry point needs the same deterministic answer, and two copies of a
boundary rule is how boundaries drift.

Work item P2-1 owns this folder. A later item that needs new shared behavior adds it
here rather than copying it into a tool, and says so in its own row.

| Module | Holds | Used by |
| --- | --- | --- |
| `lib/scope.mjs` | Scope resolution (21.1), member-path testing, privacy boundary reading (21.5) | `memory.mjs`, `memory-write.mjs`, `boot-brief.mjs`, `memory-write-guard.mjs` |
| `lib/record-schema.mjs` | The versioned record schema and the versioned project-settings schema | `memory.mjs`, `memory-write.mjs`, `knowledge-layout.mjs` |
| `lib/result.mjs` | The result envelope, the reason codes, and the exit mapping | Every tool and both hooks |
| `lib/links.mjs` | Outgoing-link parsing, derived backlink search, and relative-link repair for a move (12.4, FR-082 to FR-086) | `memory.mjs`, `memory-write.mjs` |
| `lib/pins.mjs` | The pin registry shape, the summary hash, and the budget preflight (11.2, 11.3) | `memory.mjs`, `memory-write.mjs`, `boot-brief.mjs` |

The four human-facing skills are the owner's route into all of it.

| Skill | File | Covers |
| --- | --- | --- |
| remember | `skills/remember/SKILL.md`, drafted as `SKILL-v2.md` | The section 13.1 save pipeline and the section 13.5 completed-work shape |
| recall | `skills/recall/SKILL.md`, drafted as `SKILL-v2.md` | The section 15 tier ladder and consequential recall |
| cleanup | `skills/cleanup/SKILL.md`, drafted as `SKILL-v2.md` | Turning a review worklist into approved lifecycle operations |
| session-search | `skills/session-search/SKILL.md`, drafted as `SKILL-v2.md` | The section 15.5 gate |
| second-brain | `skills/second-brain/SKILL.md` | Setup, the Codex route, sync, and clean removal |

Test harnesses, all under `plugins/second-brain/tests/`:
`boot-brief-harness.mjs`, `schema-harness.mjs`, `coordinator-harness.mjs`,
`lifecycle-harness.mjs`, `links-harness.mjs`, `retrieval-harness.mjs`,
`review-harness.mjs`, `session-search-harness.mjs`, and `knowledge-harness.mjs`.
`retirement-harness.mjs` retires with the v1 migration paths (plan decision D4).

## 4. Versioned validator checks

Architecture section 18 lists 22 checks. Each one gets a permanent id here, `MV-01`
through `MV-22`, in the section 18 order. The id never changes. The version changes
when what the check inspects or what counts as a failure changes.

### 4.1 How versioning works

- A check's version is `<schema major>.<check revision>`. Every check starts at `2.0`
  because the record and settings schemas are `schema_version: 2`.
- `memory.mjs validate` prints the id and version of every check it ran. A project that
  fails a check can see which version failed it.
- Raising a check's revision requires a change to this document. Changing what a check
  means, rather than how strictly it reads, requires an architecture change and an ADR
  first (architecture section 25, last paragraph).
- Two schemas carry their own versions and are read by the checks below:
  the **record schema 2.0** in architecture section 12, and the **project settings
  schema 2.0** in architecture section 9. Both live in `tools/lib/record-schema.mjs`.
  A record whose `schema_version` is below the current one is a `record/legacy-gap`
  warning, never a failure, because migration preserves legacy records without
  inventing metadata (FR-053).

Which checks read which schema, so section 25's "the project settings and record
schemas have versioned validators" resolves to named checks rather than to a module:

| Schema | Read by |
| --- | --- |
| Record schema 2.0 | MV-03 (fields, allowed values, unique ids, approval, provenance), MV-04 (evidence for inference), MV-05 (link fields), MV-12 (the result contract built from it) |
| Project settings schema 2.0 | MV-01 (the keys the required core needs), MV-07 (`startup.budget_bytes`), MV-16 (`project_id`, `project_root`, `subroots`), MV-17 (the `privacy` block) |

No check reads a schema field that `tools/lib/record-schema.mjs` does not define. That
is what keeps one home for the schema and stops a check from inventing a rule.

### 4.2 The checks

Severity `fail` means exit 1. Severity `warn` means exit 0 with a finding.

**MV-01, required files and host startup routes. Version 2.0. Severity: fail.**
Inspects the required core in architecture section 7 and both host routes. Failure
looks like a missing `knowledge/project.md`, `map.md`, `current.md`, `specs/`, or one
of the four memory folders, or a host route that does not name the memory tool path
and the four skills. Lands in P2-1 (files) and P3-6 (routes).

**MV-02, shared root-block meaning and checked-copy drift. Version 2.0. Severity: fail.**
Inspects the block shared by `CLAUDE.md` and `AGENTS.md` and any other declared copy
pair. Failure looks like the two copies carrying different meaning for the startup
route, the authority split, or the approval policy pointer. Lands in P3-6.

**MV-03, record schema, allowed values, unique ids, approval, provenance. Version 2.0. Severity: fail.**
Inspects every file under `knowledge/memory/`. Failure looks like a missing required
field, a value outside its allowed set, a duplicate id inside the scope, a missing
approval block, or a missing evidence entry. A legacy record missing v2 metadata is
`record/legacy-gap`, a warning. Lands in P2-1.

**MV-04, non-empty evidence for inference. Version 2.0. Severity: fail.**
Inspects records whose `epistemic_status` is `inferred` or `suspected`, and every
pattern. Failure looks like an empty `based_on` list. Lands in P2-1.

**MV-05, valid conflict targets and reciprocal supersession. Version 2.0. Severity: fail.**
Inspects `conflicts_with`, `supersedes`, and `superseded_by`. Failure looks like a link
to an id that does not exist, or a one-sided supersession where the other record does
not link back. Lands in P2-4.

**MV-06, pin eligibility, summary hashes, project scope, startup rendering. Version 2.0. Severity: fail.**
Inspects `knowledge/memory/pins.md` against the records it names. Failure looks like an
entry whose record is missing, retired, superseded, out of scope, or whose summary hash
no longer matches. A mismatched entry is omitted from current truth and reported as
repair work. Lands in P2-5.

**MV-07, startup budget and safe degradation. Version 2.0. Severity: fail.**
Inspects the rendered brief against `startup.budget_bytes`. Failure looks like a
required block dropped to fit, or a degradation order other than the four steps in
architecture section 10.4. An over-budget required set is reported with the exact byte
count. Lands in P1-2.

**MV-08, retired phrases and recorded exemptions. Version 2.0. Severity: fail.**
Inspects every phrase named by a retired record against tracked files. Failure looks
like a surviving occurrence that is neither corrected, marked as a historical
quotation, nor exempted with a reason on the retiring record. Lands in P2-4.

**MV-09, derived-artifact inputs, fingerprints, and hand edits. Version 2.0. Severity: warn.**
Inspects any artifact this project separately approved. Failure looks like a missing
input list, a fingerprint that does not match its inputs, or a hand edit that
regeneration would overwrite. A default v2 project has no such artifact, so this check
reports `skipped`. Lands in P2-2.

**MV-10, map coverage for major folders. Version 2.0. Severity: warn.**
Inspects `knowledge/map.md` against the repository. Failure looks like a mapped path
that no longer exists, a renamed area, or a major folder the map does not mention.
Lands in P3-6.

**MV-11, domain and topic vocabulary and usage. Version 2.0. Severity: warn.**
Inspects the `domain` and `topics` values across records. Failure looks like an unused
value, two values that overlap in meaning, or a value used once in a way that suggests
a typo. Lands in P3-6.

**MV-12, direct search returns complete records. Version 2.0. Severity: fail.**
Inspects a sample search run. Failure looks like a result that carries a detached
fragment rather than a whole record, or a result missing any field of the section 15.2
minimum contract. Lands in P3-1.

**MV-13, no tracker bridge as the sole home of a fact. Version 2.0. Severity: fail.**
Inspects records that cite a tracker item as their only evidence. Failure looks like a
durable meaning that exists nowhere except the tracker bridge. Lands in P3-6.

**MV-14, identical canonical results after deleting and rebuilding derived state.
Version 2.0. Severity: fail.**
Inspects retrieval before and after `.memory/` and any approved artifact are removed
and rebuilt. Failure looks like any difference in canonical results. This is the AT-16
proof. Lands in P3-5 and P3-6.

**MV-15, reads and retrieval create no local state. Version 2.0. Severity: fail.**
Inspects the filesystem before and after a read run. Failure looks like any new file,
cache, working set, metrics file, or index, inside the scope or outside it. Lands in
P3-1.

**MV-16, physical project-root isolation. Version 2.0. Severity: fail.**
Runs the ten steps in architecture section 21.9 exactly. Failure looks like any of
those ten steps not holding, reported with the reason code from section 1.6 that
matches. Runs the section 21.11 fixtures under `--fixtures`. Lands in P3-6.

**MV-17, privacy-boundary enforcement. Version 2.0. Severity: fail.**
Runs the ten steps in architecture section 21.10 exactly. Failure looks like an unknown
privacy value, an incomplete consent record, a declared external destination while
transfer is denied, a secret match with no exemption, a sensitive record without its
category, needed reason, or approval, sensitive content in startup inputs, pins, or an
approved artifact, a sensitive project whose history gate is not owner-request only,
local state carrying body or secret text, or an incomplete privacy deletion. Lands in
P3-6.

Three shapes this check needs are defined nowhere in either authority document, so
P3-6 defined them and they are recorded here as built: the secret pattern set it
matches against, the line shape that marks a sensitive section, and the record shape
of an exemption. **These need Mike's approval on their substance, not just their
existence.** They decide what counts as a leaked secret in every v2 project, and a
pattern set that is too narrow fails quietly rather than loudly. The other invented
values in this run are conveniences. These are the privacy boundary itself.

**MV-18, migration file counts, links, hashes, and reversibility. Version 2.0. Severity: fail.**
Inspects a migration plan against its apply result. Failure looks like a changed byte
in a file the plan said was unchanged, a link that did not survive, a count mismatch,
or a rollback that does not restore. Lands in P4-1, which builds what it checks.

The plan and the receipt carry a **declared expected-follow-up set**: the files the
owner has to change after apply, which the engine does not author. It is
`knowledge/project.md` for the version 2 front matter, `knowledge/current.md`, and
`knowledge/map.md`. A changed byte in a declared follow-up file is expected. MV-18
reports it in `skipped_because`, naming the files whose bytes it did not compare, and
still passes. A declared follow-up file that is gone is not the change the plan
declared and still fails. Every other divergence from the receipt fails as above.

*Amendment, 2026-08-20, for Mike to review at the pull request.* As first written,
MV-18 could never pass on a real migrated project. The engine records
`knowledge/project.md` as unchanged, the owner then has to add the version 2 front
matter to it because scope cannot resolve without it, and MV-18 failed on exactly that
byte. The fix is the declared set above rather than a special case for one path: the
plan says up front which files the owner must change, and the check answers against
that declaration. Two things Mike decides here. **One:** whether the set is right at
those three files. **Two:** whether this raises the check to version 2.1. Section 4.1
says a change to what counts as a failure raises the revision, and this is one. The
build left it at 2.0 because the version number is asserted across the harnesses and
was outside the fix's brief, so the bump is a one-line follow-up once Mike accepts it.

**MV-19, the retrieval gold set. Version 2.0. Severity: warn when the set is missing, fail when it runs and misses the bar.**
Inspects `knowledge/retrieval-gold-set.md`, or the path `knowledge/map.md` maps it to.
Failure looks like fewer than eight of the ten expected files appearing in the first
five results. A missing set is a warning that blocks only a proposed retrieval change.
Lands in P3-5.

**MV-20, quoted-source consistency. Version 2.0. Severity: fail.**
Inspects exact quoted spans, dates, numbers, and identifiers against the sources they
cite, where the source is reachable inside the scope. Failure looks like a quoted span
that does not appear in its source. The check does not judge paraphrase, which stays an
agent review and an owner decision. Lands in P3-6.

**MV-21, relative-link syntax and resolvable targets. Version 2.0. Severity: fail.**
Inspects ordinary relative Markdown links in canonical files. Failure looks like a link
whose target does not exist, or a link that is not an ordinary relative link with an
explicit `.md` target. Lands in P2-7.

**MV-22, complete incoming-link repair after a move or rename. Version 2.0. Severity: fail.**
Inspects the repository after an approved move. Failure looks like any surviving link
to the old path. When repair cannot complete, the coordinator restores the preimages
and this check confirms nothing changed. Lands in P2-7.

### 4.3 What the validator does not do

It does not judge semantic truth. An unquoted paraphrase that shifts meaning is not
detectable by any of these checks, and it stays an agent review and an owner decision
(architecture section 18, closing paragraph).

## 5. Startup adapter designs

Two hosts are supported. They deliver the same meaning through different mechanisms,
which is ADR-003. Neither host imports the other host's root file.

### 5.1 Claude Code

**File:** `plugins/second-brain/hooks/boot-brief-session-start.mjs`, registered as a
`SessionStart` hook in the project's `.claude/settings.json`.

**Input:** the host's hook event on standard input, as JSON, carrying at least
`session_id`, `cwd`, `hook_event_name`, and `source`.

**Steps:**

1. Resolve the scope from `cwd` using `lib/scope.mjs`. If no ancestor holds
   `knowledge/project.md`, print nothing and exit 0. Not every repository is a memory
   project, and a session in one of those should notice nothing.
2. Call the assembler in `tools/boot-brief.mjs` in process.
3. Print the assembled brief on standard output as the session's additional context.
4. Exit 0.

**Fail-open rules, all required:**

- Every error is caught. The hook prints one short warning line naming what failed and
  exits 0 anyway. A broken memory system degrades a session. It never stops one.
- The hook exits 0 in every path, including a thrown exception and a timeout.
- A soft time limit of two seconds applies. On timeout the hook prints the blocks it
  finished plus a warning, and exits 0.

**Read-only rules:**

- The hook writes nothing. Not `knowledge/current.md`, not a session summary, not any
  other state (architecture section 10.6).
- When a crash-recovery journal is present under `.memory/`, the hook reports it as a
  warning in the brief and does not act on it. The first `memory.mjs` operation after
  that performs the recovery in its preflight, before it serves anything (section 1.8
  step 3). That is how architecture section 13.4's "recover before current retrieval"
  and section 10.6's "startup writes nothing" both hold.
- Two cold sessions over unchanged inputs produce the same brief, byte for byte. That
  is AT-44.

**What it renders:** the ten blocks in architecture section 10.2 order, inside
`startup.budget_bytes`, degrading by the four steps in section 10.4, never dropping
identity, the operating route, project purpose, the current focus, the blockers, the
next step, the latest handoff line, any valid pin, or the memory tool route.

Three rendering rules the assembler cannot trade away for room:

- The stale warning defined in architecture section 10.6 survives every degradation
  step, as one labeled line carrying its date. A brief that hides how old its current
  state is misleads worse than a brief that runs long. That is AT-43.
- Degradation step 3 collapses only current areas that have not changed. It never
  touches the current focus, the blockers, or the next step.
- When the required set alone will not fit, the hook renders every required block
  anyway, reports `startup/over-budget` with the exact byte count, and continues in a
  visible overflow mode. It never drops a required block to fit.

### 5.2 Codex

Codex reads `AGENTS.md` and nothing else. No `CLAUDE.md`, no `.claude/rules/`, and no
`@` import. So the Codex adapter is text in `AGENTS.md`, not a hook.

**Owner of the text:** `plugins/second-brain/skills/second-brain/SKILL.md` writes the
block into a project's `AGENTS.md` at setup and refreshes it at sync (plan item P1-5).

**Shape:** one block between two markers so the drift check in section 5.3 can find it.

```
<!-- second-brain:startup-route:start -->
Run this first, before anything else in this repository:

    node <plugin path>/tools/boot-brief.mjs

Read its whole output. It carries the project identity, purpose, current focus,
blockers, next step, handoff, pinned memory, and project map.

Memory operations run through `node <plugin path>/tools/memory.mjs <operation>`.
Run `memory.mjs capabilities` to see what this project supports. Never guess.

The four skills are remember, recall, cleanup, and session-search. Their texts are
in the plugin's skills folder. Read the one you need before using it.

Never write into knowledge/memory/, knowledge/specs/, or knowledge/current.md by
hand. Those paths change only through memory.mjs write operations, and only with
Mike's approval.
<!-- second-brain:startup-route:end -->
```

**Why a command and not a hook:** Codex has no fail-open startup hook today. The
architecture allows "a native startup adapter when available" (section 10.1). When
Codex gains one, it replaces step one and this block stays as the fallback, unchanged
in meaning.

**Degradation:** if the command fails in a Codex session, the block itself still
carries the operating contract, the tool route, and the write refusal. A Codex session
with a broken tool is less oriented but not unsafe.

### 5.3 Drift between the two routes

The two host routes carry the same required meaning. Validator check MV-01 confirms
each route exists and names the memory tool path and the four skills. MV-02 confirms
the two carry the same meaning for the startup route, the authority split, and the
approval policy pointer.

Required meaning, both hosts:

1. the boot brief runs first;
2. the memory tool path and how to ask for capabilities;
3. the four skills by name;
4. the guarded paths and the fact that only the write operations may change them; and
5. that approval comes from the owner and nothing else can stand in for it.

Shape may differ. A hook delivers it automatically on Claude Code. A written
instruction delivers it on Codex. Neither host is asked to imitate the other.

### 5.4 The pre-write guard

The guard is not a startup adapter, but it is the other half of what a host has to
provide before it may write canonical project knowledge (architecture section 13.3).

**File:** `plugins/second-brain/hooks/memory-write-guard.mjs`, registered as a
`PreToolUse` hook.

**Guarded paths, exactly the set architecture section 13.3 names:**
`knowledge/memory/**`, `knowledge/specs/**`, and `knowledge/current.md`.

**Rules:**

- An `Edit` or `Write` tool call whose target canonicalizes into the guarded set is
  refused with `write/guard-refused`. The message names the operation that should have
  been used, for example "use memory.mjs correct".
- A `Bash` tool call is refused when its command text names a guarded path together
  with a mutation token: a redirect, `tee`, `cp`, `mv`, `rm`, `sed -i`, `truncate`, or
  an editor invocation. A Bash call that invokes `memory.mjs` or `memory-write.mjs` is
  allowed, because those carry the review.
- A `Bash` call that hands a guarded path to an interpreter inside a code string, a
  heredoc, or a here-string is refused as unevaluable, because nothing on the command
  line says whether the body reads or writes. Shells are interpreters for this rule:
  `bash`, `sh`, `zsh`, `dash`, `ksh`, and the `sh` in `busybox sh`, alongside `node`,
  `python`, and the rest. `bash -c 'rm <guarded>'` hides its mutation token inside a
  quoted string, so the argument scan never sees a writer, and reading the string would
  mean parsing a second shell. The accepted cost is that `bash -c 'cat <guarded>'` is
  refused too. A direct `cat` or `grep` of a guarded path stays allowed.
- `git` commands are allowed. The owner keeps ordinary Git access to every canonical
  file, and approved writes still have to be committed. This is a stated consequence in
  section 13.3, not an oversight: an agent that runs `git checkout` on a canonical file
  can still move it back to a committed state, and the guard does not try to tell an
  honest mistake from a bypass.
- An `Edit` or `Write` call that would change `project_root`, `subroots`, or the
  `privacy` block in `knowledge/project.md` is refused with `settings/owner-only`. A
  boundary that the thing it constrains can widen is not a boundary. Section 7 records
  this as an addition to the architecture's code list, for the owner to accept or drop.
- The guard is deterministic. No model sits in its path. The same call always produces
  the same answer.
- A refusal is a `permissionDecision` of `deny` printed on standard output, with the
  reason code and the operation that should have been used in
  `permissionDecisionReason`. The hook still exits 0, per section 1.4. On a guarded
  path it fails closed: an unparsed tool input or a failed scope resolution denies.
- A refusal is visible in the session. Refusals are not logged to a durable ledger, and
  the canonical files stay unchanged, which is what AT-39 proves.
- The coordinator itself is never blocked, because it writes to the filesystem from
  inside a Node process rather than through a host tool call.

## 6. Where each section 25 condition is met

| Condition | Met by |
| --- | --- |
| Every section 8 component has an owner and a package destination | Section 3 of this document |
| Every section 16.1 tool has an interface contract and an error contract | Sections 1 and 2 of this document |
| Every section 22 test maps to a check | The AT traceability table in `implementation-plan.md`, plus the harness list in section 3 here. See the gap noted in section 8 |
| Project settings and record schemas have versioned validators | Section 4.1, including the table naming which checks read which schema, backed by `tools/lib/record-schema.mjs` |
| The two supported hosts have startup adapter designs | Section 5 |
| Direct file search works with `.memory/` absent and creates no local state | Contracts 2.3 through 2.7, and checks MV-14 and MV-15 |
| Pin budget and cross-project tests exist before pin operations ship | Contract 2.16, check MV-06, and the section 21.11 fixtures run by MV-16 |
| Migration has dry-run and rollback fixtures from current v1 projects | Plan item P4-1 and check MV-18 |
| Implementation status, dependencies, and decisions are written where the owner can open them | `STATUS.md` in this folder, the `Claude-Toolkit-Project` board, and `knowledge/current.md` after this repo migrates |

## 7. Decisions this document makes

Eleven choices the authority documents left open. Each one picks the reading that
contradicts nothing and can be built.

- **C1: One command-line entry, `memory.mjs`, for all 23 operations.** The plan already
  says so for capabilities, status, and the lifecycle operations. Extending it to every
  operation keeps one place for the preflight in section 1.8, so scope and privacy
  cannot be skipped by reaching a different file.
- **C2: JSON on standard output, always.** A deterministic machine-readable envelope is
  what MV-15 and AT-44 need. Human rendering belongs to the skills.
- **C3: Three exit codes, 0, 1, and 2.** Refusal and error are different answers. A
  refusal is a correct outcome. An error means the question could not be evaluated.
- **C4: Two-phase writes, propose then apply.** This is the only way to bind the
  owner's approval to exact bytes, as architecture section 13.2 requires, in a
  command-line tool. There is no `--force` and no non-interactive approval.
- **C5: Journal recovery runs in the tool preflight, not in the startup hook.**
  Architecture section 13.4 wants recovery before retrieval. Section 10.6 says startup
  writes nothing. Doing the recovery in the first tool operation satisfies both. The
  hook reports the journal and does not act on it.
- **C6: Three shared modules under `tools/lib/`.** Scope resolution, the schemas, and
  the result envelope are each needed by more than one entry point, and the guard hook
  needs scope resolution without a model in its path. Two copies of a boundary rule
  drift.
- **C7: The guard covers exactly the section 13.3 path set, plus the scope and privacy
  keys in `project.md`.** The extra rule uses a new code, `settings/owner-only`, which
  is not in the architecture's section 21.4 table. It is here because architecture
  section 21.4 says widening the boundary requires an owner-approved change, and an
  agent that can edit its own boundary has no boundary.
- **C8: `git` commands are not refused by the guard.** Refusing them would break
  committing approved writes, and section 13.3 already says the owner keeps ordinary
  Git access. The residual risk is stated in section 5.4.
- **C9: Two supporting commands, `cancel` and `brief`, exist without joining the
  section 16.1 surface.** Both are plumbing for operations that surface already
  defines. Neither can write canonical Markdown.
- **C10: The startup hook fails open and the guard hook fails closed.** Both exit 0,
  because that is how a Claude Code hook reports a decision, so the exit code was never
  the control. The startup hook exits 0 with a warning when anything breaks, because a
  broken memory system should not stop a session. The guard denies when it cannot
  decide about a guarded path, because a guard that allows what it could not evaluate
  is not a guard. Architecture section 13.3 requires the refusal to happen before the
  write applies, and this is the only reading that delivers that.
- **C11: One apply result shape for every two-phase write.** Section 1.5 defines it
  once, including `changed_paths`, which is architecture section 13.4 step 8. A per
  operation result shape would drift, and the harnesses have to assert one shape.

## 8. What this document does not decide, and one gap

Left to the build tickets: internal module layout beyond the three shared files, the
exact ranking arithmetic inside the section 15.2 authority order, the wording of the
skill texts, and the fixture contents beyond what architecture section 21.11 already
specifies.

One gap worth naming. The plan's acceptance-test traceability table does not assign
work items to AT-43, AT-44, AT-45, or AT-46, which Phase 0 added. This document places
their behavior: AT-43 and AT-44 belong to the startup adapter in section 5.1 and to
work items P1-2 and P1-6, AT-45 belongs to check MV-16, and AT-46 belongs to check
MV-17, both in work item P3-6. The plan's table should be updated to match before
Phase 1 tickets are cut. That edit is outside this work item.

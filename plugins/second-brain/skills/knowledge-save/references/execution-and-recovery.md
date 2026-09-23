# Execute and recover a knowledge save

Read this procedure before execution or retry. `knowledge/knowledge-manual.md`
owns policy; selection-and-cards.md and operations.md supply selection and
operation details. Publish with the `publish-docs` skill, or the project's own
documentation-publication procedure when it has one.

In `external` memory mode (`.toolkit-memory.json`), read "External memory
mode" at the end first. It changes where the inbox and memory records live, and
what publication means for them.

## Before starting or resuming

1. Open the manual section you need, the destination's instructions, and this
   procedure. Use the project's real repository and publication route.
2. Find the existing topic and pending entry before creating either. Read the
   exact proposal or authorized update, source, operation, destinations, and
   permission covering the approved revision. For ongoing permission, check
   that the current grant still applies. A reference, helper message, or inbox
   state alone cannot grant permission.
3. Keep the existing stable reference through retries and card revisions. If
   first capturing real pending work, assign a new opaque reference and record
   it once. Distinguish the revision actually approved from subsequent proposals.
   For a Git-backed inbox, start or resume the isolated `publish-docs` save
   workspace with the inbox and exact expected destinations named. Do not
   write or stage this save's inbox entry in a shared checkout.
4. Persist authority and exact owed change in `knowledge/memory-inbox.md` before
   editing the destination or dispatching a helper. Preserve a shown card exactly;
   authorized upkeep without a card records scope and permission without
   inventing one. Keep source/date, host/conversation, update time, state,
   next action, and relevant worker/result evidence together in that entry.
5. Read back the entry. Confirm the executor can access it. If persistence fails,
   report unsaved state and resolve that failure before dependent mutation.
   Local durability is distinct from verified sharing with another computer.

## Find what actually happened

For read-only Git evidence, run the installed tool with the existing UUID and
exact approved destinations:

```text
node .claude/tools/inspect-knowledge-save.mjs <project-root> <UUID> <remote> <default-branch> <destination>...
```

It reads the inbox and current remote, reports local/remote content hashes and
commits carrying the exact `Knowledge-save: <UUID>` trailer. It writes no working
records and decides neither approval nor completion. Inspect actual content and
checks yourself; a match can also be the unchanged pre-save baseline. An unavailable
remote remains unverified, even if a local tracking branch looks current.

Inspect the current destination, related links/indexes, inbox, local changes,
applicable commits, and current remote. Do this before replaying any approved
change. A failed or missing push response does not prove the push failed.

Check the named helper's actual status through the host when available. Reuse
its result or coordinate ongoing work. A stored worker ID is only a pointer.
If status is unknown, report that limit and avoid a competing edit in its
checkout. Preserve unrelated work and follow the existing serialization rules
for the affected save workspace. Other saves use their own worktrees; do not
take over an active helper's workspace.

- No effect exists: execute the approved change when authority still applies.
- Only part exists: verify that part and finish the missing operations.
- The correct local effect exists: perform missing checks or publication.
- A commit already exists: inspect it and remote ancestry/content before retry.
- The effect is verified on the remote: finish pending bookkeeping only.
- Another commit has equivalent content: compare meaning, evidence, scope,
  linked changes, and checks before treating the operation as satisfied.
- Newer content conflicts or supersedes the old approved change: retain the
  original permission and report the specific unresolved decision. Historical
  approval does not authorize overwriting a newer decision.
- Remote inspection is unavailable: report the last verified result and what
  is unknown. Keep recovery pending rather than declaring a completed save.

An inbox entry found on another computer can only describe what was shared.
An absent entry does not prove no other computer has an unfinished local save.
On reconnect, inspect incoming and unpublished work before reconciling it.

## Execute the authorized change

The main agent gives the helper the inbox reference, approved revision,
operation, exact files/meaning, sources and permission, applicable instructions,
checks, publication route, and expected result. Keep any required verbatim text.
The helper reads the assignment and current destination; it does not expand the
scope or select extra memories. Independent conversation may continue.

Use the applicable operation reference for create, update, supersede, retire,
delete, or consolidation. If required instructions are missing, leave that
operation pending and explain the gap. Read shared records again before editing.
Apply only the authorized change; preserve other entries and unrelated content.
Keep source/confidence/approval distinctions where they differ inside a topic.

Read back actual content and check approved meaning, sources, plain wording,
required metadata, links, and relevant lifecycle relationships. Rebuild affected
indexes with the installed builder and run the applicable checker. These checks
establish different facts; a valid file does not prove correct meaning.
A partial write or failing check remains unfinished.

Publish Git files through the project's documentation workflow in a separate
save workspace: inspect full
staged scope, commit only owned authorized changes, push, and verify the result
on the actual remote branch. Include the inbox reference in the destination
commit message; this is traceability, not a permission token. Several ready
saves may share a commit while keeping their separate references and authority.
Never delay a ready save solely to collect others.

After rejected publication, inspect incoming work and reconcile under existing
authority. Recheck changed files and regenerate affected indexes. Preserve the
project's branch/account protections and other sessions' work. A new conflict
about meaning goes back to the main agent with the original permission intact.

## Return evidence and close the entry

Return the operation reference and approved revision, affected paths, meaning
read-back result, checks actually run and their outcomes, commit identity,
remote branch/current verification, and any remaining step or blocker. Report
local write, validation, commit, and sharing separately. Never claim a check
ran because the assignment requested it.

The main agent checks the result against current authority and destination
before telling the owner it completed. Keep `approved, save unfinished` while
publication remains unverified. After verified destination publication, reread
the inbox and remove only this completed entry; publish and verify cleanup.
Use the same isolated save workspace, or create a new one from the latest
remote if the first was removed. Never do inbox cleanup in a shared checkout.
If cleanup fails, report the destination as published and cleanup as pending.
A recovering agent verifies the result and retries only cleanup, preserving
unanswered proposals and independent entries.

Use `blocked by conflict` when changed meaning needs a decision. Preserve
permission evidence and identify what is blocked; continue unrelated work.
Rejection permits removing the rejected proposal, not deleting lasting content.

## Host failure and late results

When a helper cannot access required files, tools, credentials, or permitted
operations, return the exact limitation. The main agent uses the same procedure
through available foreground tools under the same authority, or records the
remaining unavailable step. Do not ask again for unchanged meaning approval to
resolve an execution problem. Foreground completion does not prove background
execution works on that host.

On changed direction or cancellation, pause the affected operation through
available host controls and inspect actual changes. A cancellation request is
not proof that no write or push happened. Check any late result against the
latest direction and report what already occurred; reconcile changed meaning
before new writes. Do not automatically revert a completed change.

## External memory mode

When `.toolkit-memory.json` sets `memory` to `external`, use the
[provider contract](../../knowledge-setup/references/memory-providers/README.md)
and the adapter for its `service`. Everything above still applies, with these
changes:

- The inbox is the set of `pending` records. An inbox entry is one `pending`
  record, key `pending:<reference>`, holding the same pending-entry fields.
  Write it and read it back before writing the destination or starting a
  helper. It is shared once the read back matches.
- A memory destination (working, lasting, or feedback) is written through the
  adapter, never as a file. It is published when the write succeeds and the
  read back matches the approved text exactly. A difference is a failed save:
  keep the `pending` record, report the difference, and do not retry blindly.
- `inspect-knowledge-save.mjs` does not cover memory records. To find what
  actually happened, find the destination record by key and compare it with
  the approved text.
- A memory write needs no index rebuild, commit, or push. `check-knowledge`
  still runs for the Git files.
- A PRD destination stays in Git under `prds/`. It follows the Git steps above
  and `publish-docs`, and its `pending` record is removed after the remote is
  verified.
- After publication, remove only this `pending` record and confirm that it is
  gone. If removal fails, report the destination as published and cleanup as
  pending.
- If the MCP server is not connected, the save stays unfinished. Report it.
  Do not write the memory to a file instead.

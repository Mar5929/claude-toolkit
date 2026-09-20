# Knowledge save and recovery — procedure draft

Inactive execution reference for the proposed `knowledge-save` skill, drafted
2026-09-19 for issue #269. This file is not an installed skill or a complete
save package. It covers execution after destination and permission are known;
selection, cards, operation-specific lifecycle rules, templates, and the host
executor must be delivered with it before activation. The
[core manual](core-knowledge-manual-draft.md) owns common policy.
The [current master design](https://github.com/Mar5929/claude-toolkit/blob/main/docs/designs/269-knowledge-system.md#67-save-transaction-and-recovery)
owns the recovery contract and acceptance cases. Paths below are the proposed
future project paths, not instructions to migrate this checkout.

## Before starting or resuming

1. Open the current core manual, applicable destination instructions, and this
   procedure. Use the project's real repository and publication route.
2. Find the existing topic and pending entry before creating either. Read the
   exact proposal or authorized update, source, operation, destinations, and
   permission covering the approved revision. For ongoing permission, check
   that the current grant still applies. A reference, helper message, or inbox
   state alone cannot grant permission.
3. Keep the existing stable reference through retries and card revisions. If
   first capturing real pending work, assign a new opaque reference and record
   it once. Distinguish the revision actually approved from subsequent proposals.
4. Persist authority and exact owed change in `knowledge/memory-inbox.md` before
   editing the destination or dispatching a helper. Preserve a shown card exactly;
   authorized upkeep without a card records scope and permission without
   inventing one. Keep source/date, host/conversation, update time, state,
   next action, and relevant worker/result evidence together in that entry.
5. Read back the entry. Confirm the executor can access it. If persistence fails,
   report unsaved state and resolve that failure before dependent mutation.
   Local durability is distinct from verified sharing with another computer.

## Find what actually happened

Inspect the current destination, related links/indexes, inbox, local changes,
applicable commits, and current remote. Do this before replaying any approved
change. A failed or missing push response does not prove the push failed.

Check the named helper's actual status through the host when available. Reuse
its result or coordinate ongoing work. A stored worker ID is only a pointer.
If status is unknown, report that limit and avoid a competing edit in its
checkout. Preserve unrelated work and follow the existing serialization rules
for the shared publication checkout.

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

Publish through the project's existing documentation workflow: inspect full
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

## Review and implementation boundary

The master design owns the first customer-import interruption matrix. Run its
file/Git fixtures separately from fresh-agent behavior trials. No new-runtime
recovery test has passed merely because this procedure is written.

Next: complete the selection/card and lifecycle/template references; resolve
host executor access, status/cancellation, and result-return proofs; review the
coherent package before activation. This reference adds no database, private
queue, distributed lock, or exactly-once guarantee. It preserves current
permission, source eligibility, topic organization, and approval boundaries.

# Reassessment of F1, F2, and F5

> Review evidence, not adopted policy. Read the [consolidated disposition](2026-09-19-consolidated-audit.md) before acting on recommendations. Original severity and proposals below may be revised by the linked reassessments.

Date: 2026-09-19

## Revised position

- **F1 should be High, not Critical.** The design is unbuilt and already requires a stable reference, authority record, explicit state, rereading, publication verification, duplicate detection, and concurrent-session tests. The missing item is a precise acceptance invariant for retries and races, not a missing database or a reason to reject Markdown/Git.
- **F2 should be High, not Critical.** A separate remote inbox commit before every destination mutation is unnecessary. The safety requirement is that the exact authority and intended operation become durable in a location the executing helper and recovering main session can read before mutation. Cross-computer continuity begins only after a successful push; it cannot be guaranteed offline.
- **F5 is an explicit approved product tradeoff, not an internal inconsistency.** R10 plainly says the setting covers create, update, merge, supersede, retire, and delete. The design preserves that decision. At most, this is an advisory acceptance check to make the consequence visible during whole-design approval. It should not be framed as a high-severity gap or used to reopen the approved scope silently.

## Exact missing safety outcome for F1

R28 says what an entry contains and the design says sessions must not lose, duplicate, or apply the same save twice. What remains unstated is the observable result when two helpers race on the **same stable reference**:

1. A retry must first determine whether the approved effect is already present in the destination or remote history.
2. If the same reference and same approved meaning already landed, the retry verifies that result and does not apply it again.
3. If the same reference appears with different meaning or incompatible terminal state, the save stops as a conflict.
4. A rejected non-fast-forward push is an unfinished publication, not permission to rerun the content edit blindly.

Those are acceptance outcomes, not a demand for exactly-once distributed execution. Git cannot guarantee exactly once across process crashes and partitions. The achievable goal is **idempotent recovery with at-most-one accepted effect per stable reference**, plus honest conflict reporting.

## Smallest Markdown/Git-compatible protocol

This can stay within the proposed inbox, destination files, commits, and remote branch:

1. **Prepare locally before mutation.** Write the stable reference, approved meaning, destination, operation, and authority into the existing inbox. Ensure the local file is on disk before starting the helper. No new ledger is required.
2. **Preflight.** The helper fetches when online, rereads the latest destination and inbox, and searches the relevant remote history/destination for that stable reference. If the effect already exists, it verifies it and returns success without reapplying it.
3. **Apply idempotently.** The helper changes the destination from its observed current state. The resulting commit message or a small line in the existing pending record includes the stable reference. The reference is evidence for recovery, not a new approval store.
4. **Publish one coherent commit when practical.** The destination change, required index updates, and inbox transition/removal may be committed together. This avoids requiring a separate remote inbox commit before mutation. If repository rules require a different sequencing, the same stable reference connects the commits.
5. **Handle a race through normal Git safety.** If the push is rejected, fetch. If the remote now contains the same reference with the same intended effect, verify and treat the operation as completed. If it contains unrelated work, reconcile and retry publication. If it contains changed meaning or an incompatible effect, retain the pending entry and stop for the required decision.
6. **Report visibility accurately.** Before push verification, recovery is local to that checkout/computer. After push verification, another computer can recover it. Offline operation never claims remote continuity.

For two different references editing the inbox concurrently, ordinary Git reconciliation is sufficient when entries are independent. A semantic conflict exists only when they affect the same meaning, destination state, or approval scope; then the design's existing conflict rule applies. One file per operation may reduce conflicts but is optional, not required by this protocol.

## Revised F2 boundary

The original report implied that shared publication should precede helper mutation. That is stronger than necessary.

The minimum safe order is:

1. exact authority and operation durably written locally;
2. helper receives that exact record and can read it independently of transient chat context;
3. helper edits, checks, and commits with the stable reference;
4. push verification establishes cross-computer recoverability and completion.

If the helper runs on another machine or isolated environment that cannot read the local pending record, the authority must be transferred to that environment before mutation. If the computer is lost before push, remote recovery is impossible; the requirement should promise honest local-only versus shared status, not impossible partition tolerance.

The remaining design gap is therefore narrow: state explicitly what “record before handing off” means for local durability and helper access, and tie destination evidence to the stable reference. This is a High-severity acceptance refinement because it protects permission continuity, but it is not a foundational architecture failure.

## Revised F5 disposition

R10's automatic lifecycle scope is clear and recorded as approved. The requirements are internally consistent: the setting is off by default, per project, explicitly enabled by the owner, covers all memory lifecycle operations, excludes PRDs, retains source/check/report obligations, and can be turned off.

The only useful review note is: during final acceptance, demonstrate one supersede or delete example so the owner sees the already-approved consequence in the complete experience. That is confirmation of implementation fidelity, not a request to split the setting or obtain a new decision. Unless a later owner statement contradicts the approved scope, F5 should be downgraded to **Advisory / no blocking finding**.

## Suggested synthesis wording

> The proposed Markdown/Git model is viable, and the design already names the right records and recovery checks. Before implementation, tighten the acceptance contract for a stable pending-save reference: persist authority locally before helper mutation, attach the reference to the resulting Git evidence, treat non-fast-forward publication as unfinished, and make retries verify an already-landed effect before reapplying it. Cross-computer recovery begins after verified push; offline work remains explicitly local. This requires no database, new ledger, or exactly-once guarantee.

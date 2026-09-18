# Knowledge System implementation-readiness review

Reviewed: 2026-09-17. This is an independent design and build-plan audit. It
does not approve requirements, approve the solution design, or authorize
implementation.

## Evidence and verdict

Reviewed against the complete [Knowledge System PRD](../../../knowledge/prds/toolkit-operating-system/knowledge-system.md), the current [solution design](../269-knowledge-system.md), the frozen [detailed reference](detailed-solution-design-reference-output.md), the [implementation plan](implementation-plan.md), and the [host-capability evidence](host-capability-evidence.md). The frozen reference is historical input; where it differs, the PRD and current design govern.

The design has an accountable part and proof direction for all 30 requirements.
It is ready to become an implementation plan, but it is not yet ready for an
unqualified build authorization. The plan must make the six proof boundaries
below explicit and must not silently select the proposed completion checkpoint,
write guard, save-moment gate, approval-off metadata, feedback store, or
skill-authoring workflow.

## Specification check

**Specification read:** `knowledge/prds/toolkit-operating-system/knowledge-system.md` in full.

**Goal:** Every equipped project preserves useful knowledge and continuation
context across agent sessions, with correct ownership, permission, evidence,
and recovery, without making the owner manage the process.

Four points could skew a build. These are proposed reconciliations, not approved
requirements edits:

1. **“Confirms ... were read” has two interpretations.** R2 can mean objective
   host evidence that content reached the model, or the agent's truthful report
   that it completed the reads. R29 correctly says acknowledgment is only
   bookkeeping. Proposed fix: name delivery evidence, agent declaration, and
   owner-facing confirmation separately, and state which one satisfies R2.
   A declaration-only fallback does not satisfy the current strict wording.
2. **“Before acting on a new or resumed request” can mean every prompt or a new
   task/scope after startup.** The first reading forces full current/inbox reads
   before every conversational message; the second permits reuse while those
   sources remain current. Proposed fix: define freshness by session/recovery,
   changed shared state, and changed request scope, while keeping the selected
   compact reminder on every prompt.
3. **Approval-off memory still requires per-file approval metadata.** R10 permits
   standing project authority, while R14 requires `approved_by` and
   `approval_date` on each memory. The fields could record the standing grant or
   falsely imply review of that entry. Proposed fix: define the truthful
   representation of standing authority before enabling approval-off mode. Keep
   approval on by default until that owner decision is recorded.
4. **“Nothing else” can be read as banning implementation scripts.** R1 names
   rules, hooks, skills, Markdown, and Git, while current and proposed hooks and
   checks are implemented by scripts. Proposed fix: clarify that implementation
   code inside those named parts is allowed; the prohibition is on a second
   knowledge service, database, background authority, or tracker.

The PRD's long potential-solution section is explicitly tentative and kept at
the bottom, so it is not treated as required build scope. The current 2,000
character checker limit for `current.md` is an implementation mismatch against
R21's 5,000-character requirement, not a reason to change the specification.

## Blocking plan requirements

These are blockers to approving a complete implementation plan. A technical
spike may be the task that resolves a blocker; the plan need not pretend the
answer is already known.

1. **Startup read and acknowledgment.** Define one host-neutral protocol and
   host-specific adapters for ordered reads of `SOUL.md`,
   `knowledge/project.md`, and `knowledge/README.md`. Distinguish instruction
   delivery, observable content delivery, agent declaration, owner-facing
   confirmation, and any stronger receipt. Cover missing/partial reads, stale
   generations, compaction, clear/resume/fork, helpers, and cross-session
   receipt isolation. Do not claim a hook can observe understanding.
2. **Turn checkpoints.** Treat the every-prompt reminder and intent
   acknowledgment as selected behavior. Treat exact wording, canonical text
   source, transport, and loop prevention as implementation decisions requiring
   proof. Keep the before-final-turn checkpoint as a proposed mechanism until
   the owner selects it. Any spike must compare a bounded `Stop` continuation
   with prompt guidance alone; it must not grade free-form replies or revive the
   rejected changed-file trigger.
3. **Permission, inbox, and concurrency.** Specify the durable permission
   record, exact inbox schema, atomic update strategy, reread/reconcile step,
   idempotency key, duplicate detection, conflict state, and safe removal rule.
   Test simultaneous proposals, interrupted approved saves, an already-landed
   retry, concurrent destination edits, and permission that covers only one of
   several destinations. Temporary session state cannot be authority.
4. **Budgets and required meaning.** Recalculate actual startup, per-prompt,
   invoked-skill, and completion costs for the revised read-based startup. The
   frozen 9,500-character printing budgets are not current constraints. Resolve
   the live checker/template migration to PRD R21's `current.md` limit of 5,000
   characters; do not carry the repository's older 2,000-character limit into
   the build by accident. Measure characters and observed tokens separately and
   define explicit behavior for spill or missing content.
5. **Publication and recovery.** Implement against Toolkit OS R25's shared
   documentation publication contract: classify by actual change, keep runtime
   Markdown/configuration in the implementation workflow, serialize shared-main
   mutations, stage only owned changes, distinguish written/checked/committed/
   pushed, verify the remote commit, and resume idempotently after failure. The
   existing shipped rule covers `knowledge/**` only, so broad documentation
   publication guidance is a delivery dependency rather than current behavior.
6. **Host trust and coverage.** Pin supported Claude Code and Codex versions and
   record effective trusted configuration. Prove event ordering and output
   delivery on CLI and desktop where claimed. Enumerate fail-open, timeout,
   disabled-hook, unsupported-tool, shell-continuation, helper, hosted, and
   out-of-band edit paths. An uncovered route becomes a named support gap, not
   an `ENFORCE` claim. Experimental Claude Mods remain optional research.

## Requirement coverage audit

“Plan obligation” is the minimum concrete work or evidence the implementation
plan must assign. The design mapping is adequate only when the plan carries the
obligation through to a named task and acceptance condition.

| R | Design coverage | Plan obligation / readiness note |
| --- | --- | --- |
| 1 | Plain Markdown, Git, host-native parts; temporary bookkeeping only | Inventory every added store/process and prove no second authoritative knowledge or tracker. Preserve manual edits and test obvious versus meaning-changing repairs. |
| 2 | Ordered startup reads, root routes, manuals, skills | Blocker 1. Include the small-map recovery behavior and task-switch/current-guidance cases, not only fresh startup. |
| 3 | Prompt/completion guidance, objective checks, recovery | Blockers 1–3 and 6. Representative model sessions are acceptance work, not replaceable by unit tests or counters. |
| 4 | `current.md`, tracker links, inbox discovery | Test fresh-session continuation without transcripts and verify publication visibility across checkouts/harnesses. |
| 5 | Find responsibility and standing guidance | Scenario proof must show the relevance decision once per stable request and opening the source rather than answering from an index. |
| 6 | Find procedure and source line | Include exact citation shapes for memory, PRD, session history, and dated outside documentation. |
| 7 | Glossary, direct map link, term-dependent lookup | Select and test how required meanings are available from the first message without silently truncating cautions; glossary remains outside the generated memory index. |
| 8 | External index and dated source lookup | Preserve ownership outside memory, capture date/source, stale-source handling, and deterministic index generation. |
| 9 | Prompt reminder, five required review moments, save transaction, quick publication | Blockers 2 and 5. Cover explicit review requests and quiet routine no-change reviews separately. |
| 10 | Scoped authority, cards/inbox, optional project memory approval setting | Blocker 3. Owner must choose or defer the honest `approved_by`/`approval_date` representation when memory approval is off; never fabricate approval. |
| 11 | Agent eligibility judgment and selection feedback | Behavioral cases must separate lasting significance, owner participation, significant episodes, and the narrow agent-found failure exception. |
| 12 | Exclusion policy plus checker support | Test secrets and misleading source copies, while stating that pattern checks are incomplete and cannot decide meaning. |
| 13 | Shared concise `current.md` with concurrency discipline | Blockers 3–5. Reconcile the 5,000-character PRD limit, preserve multiple active items, and keep detailed status/approvals in the tracker. |
| 14 | Topic/subtopic templates, parser, checker, lifecycle | Implement the complete required/optional field contract and folder rules; test coherent split, no file-per-fact, source/context, and approval metadata. |
| 15 | Plain-language save/read-back standard | Add content-review fixtures or scored human review criteria without turning style checking into a semantic authority. |
| 16 | PRD owner, statuses/approval fields, autonomous shipped upkeep | Test unapproved proposed drafts, approved proposed/finalized records, umbrella/component updates, delivery evidence, holds, and quiet recovery. |
| 17 | Procedure routing to the actual skill-authoring process | Honest dependency: either name the existing owner/process or plan a separately approved capability. Knowledge work may propose and stop; it cannot invent authorization. |
| 18 | Manual/routing reference and one-owner handoffs | Test mixed messages, parent/component scope, item-only exceptions, architecture, tasks, optional Guide, and incomplete destination-specific permission. |
| 19 | Five-tier find order, glossary, source authority | Test unavailable history, source conflicts, current-system verification, and stopping when evidence is sufficient. |
| 20 | Destination sections and memory/PRD card format | Reconcile every template and walkthrough example to the PRD labels; retain the exact shown card in the inbox and support selected-number approval. |
| 21 | Three deterministic indexes, parser/checker, read-back | Blocker 4. Select a stable sort rule, repair moved links, copy summaries exactly, and ensure validation never silently cuts approved meaning. |
| 22 | Save/review lifecycle | Test update, supersede, retire, delete, merge, failed consolidation, source preservation, and link repair with operation-specific approval. |
| 23 | Selection feedback behavior; storage still a design choice | Plan must select one concise store and migration, prove feedback is guidance rather than authority, and prevent cross-project leakage. Owner choice is needed only if the recommendation changes visible behavior or retention. |
| 24 | Plain-language skill routing | Acceptance must invoke each outcome without command/skill names and show applicable operation only. |
| 25 | Shared files plus host adapters | Blocker 6. Repeat behavioral scenarios on Codex and put every real enforcement gap in the project setup report. |
| 26 | First-party host documentation and per-part basis | Refresh/version the decisive documentation before coding; link each adapter/control to the supported contract actually tested. |
| 27 | Setup/sync/repair and report | Prove one authorized activation is complete and versioned, a non-authorized project is untouched, existing content survives, and half-setup is reported as unavailable. |
| 28 | Durable pending cards and unfinished authorized saves | Blocker 3. Implement all required entry fields and authority evidence, cross-host recovery, sharing failure disclosure, conflict preservation, and exact completion/rejection removal. |
| 29 | Native reasoning, lightweight handshakes, narrow objective checks | Blockers 1–3 and 6. Every restriction needs a real trust failure and stated bypasses; no semantic scorer, keyword classifier, transcript grader, or changed-file review trigger. |
| 30 | Toolkit manual/root routes and component handoffs | Assign parent OS/manual, tracker, Guided Delivery, System Guide, setup/sync, and publication dependencies to owners with interface acceptance tests. |

## Proposed defaults where the plan needs a working assumption

These are reviewer recommendations, not owner decisions.

- Use ordinary synchronous command hooks and one small shared protocol first;
  evaluate Claude Mods only after parity and rollback are proven.
- Use a structured checkpoint receipt for objective bookkeeping and a separate
  short owner-facing acknowledgment. Never parse prose to infer compliance.
- Give each checkpoint a project, host, session, agent, protocol-generation,
  and checkpoint identity. Do not treat branch or timestamp alone as identity.
- Let `Stop` request at most one corrective completion review when a receipt is
  missing, guarded by the host's stop-active signal. Fall back to prompt-side
  guidance and durable pending records if this mechanism is not approved or
  cannot be made loop-safe.
- Write a shown pending card before the response can be lost, then publish it
  through the shared documentation route as soon as safely possible. Its local,
  committed, and remote states remain distinct.
- Use compare-after-reread plus deterministic indexes and idempotent operation
  references rather than locks or a new database. Escalate only a meaning
  conflict that cannot be reconciled under existing authority.
- Adopt the PRD's 5,000-character `current.md` ceiling and migrate the checker,
  tests, templates, and current equipped projects together. Retain concise
  writing as a stronger editorial target, not a contradictory validation cap.

## Nonblocking design debt

- Final script and skill names may change if responsibilities, requirement
  coverage, migration, and tests remain traceable.
- Exact context budgets can be set from measurements; they do not need owner
  approval unless they remove required meaning or introduce a new product
  constraint.
- The feedback file path, deterministic index sort order, session-state cleanup
  interval, and exact acknowledgment wording are implementation choices once
  their visible behavior and data boundaries remain within the approved PRD.
- Historical printing budgets, fixed hook counts, rename lists, estimates, and
  project rollout order remain reference inputs, not current commitments.

## Build-plan audit

**Result: conditional pass for owner review; not build-ready.** The revised plan
has named packages, dependencies, requirements, deliverables, acceptance
evidence, risks, rollback, and milestone exits for all 30 requirements. The
first audit returned six material issues; the plan now addresses them:

- It labels the layout as PRD-proposed and subject to recorded authority.
- It makes model-visible startup delivery/read evidence mandatory for strict
  R2; a declaration-only fallback fails full acceptance.
- It separates the selected every-prompt reminder from the recommended
  completion handler and requires acceptance before production activation.
- It keys temporary receipts by project, host, session, agent, and separate
  generations, with delayed/concurrent update tests.
- It gives pending work a stable operation reference, rereads inbox and
  destination, detects already-landed retries, preserves conflicts/authority,
  and serializes shared publication.
- It makes discovery of the actual skill-authoring owner/process explicit; an
  absent process remains an R17 dependency needing separate scope.

The plan also covers the six proof boundaries in this review: D1-P1 and E1-P5
own startup/checkpoint/host proof; E1-P1/P4 own durable permission and inbox
recovery; E1-P3/P8 own limits and measured context cost; E1-P2 owns shared
publication; and E1-P8 repeats behavioral acceptance on both hosts.

## Decisions still needed before production work

The overnight plan can recommend defaults, but these points cannot be recorded
as approved without the owner:

1. Reconcile strict R2 wording if a supported host cannot prove model-visible
   delivery of every required range. Disclosure alone does not meet R2.
2. Select or decline the bounded before-final-turn completion checkpoint after
   D1-P1 proves behavior and cost. The prompt reminder alone does not prove the
   required end-turn review occurred.
3. Decide the truthful R10/R14 metadata representation for project-level
   memory approval-off. Keep approval on until resolved.
4. Approve the requirements as a whole, the reconciled solution design, and
   the applicable implementation scope separately. Current documents and
   recommendations do not supply those approvals.

The R2 meaning of “new request” and R1 allowance for scripts inside named
hooks/skills/checks should be clarified during requirements reconciliation.
They do not require the owner to choose an API, filename, or implementation
mechanism.

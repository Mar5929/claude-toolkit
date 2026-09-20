# Knowledge System #269: requirements and end-user scenario audit

> Review evidence, not adopted policy. Read the [consolidated disposition](2026-09-19-consolidated-audit.md) before acting on recommendations. Original severity and proposals below may be revised by the linked reassessments.

**Reviewer:** independent requirements and end-user scenario review (GPT-5.6 Sol)
**Date:** 2026-09-19
**Repository baseline inspected:** main `c43a4fe`; isolated manual draft branch `414d524` (the design Notes also name the earlier published draft commit `e61d064`)
**Method:** complete document reading, logical scenario analysis, and current primary-source research. No runtime behavior was executed or claimed as proven.

## Scope and authority boundaries

I read the complete Knowledge System PRD, the complete master solution design, the complete isolated core-manual draft, the relevant Toolkit Operating System and guided-delivery/work-item requirements, the current installed knowledge manual, and the repository rules.

The current installed runtime and the proposed system are different. Today this repository uses `knowledge/current.md`, `spec-index.md`, six older knowledge skills, and the installed manual. The proposed system uses `knowledge/memory/current.md`, `knowledge/memory-inbox.md`, `memory-entries/`, `prd-index.md`, four refactored skills, prompt/completion checkpoints, and delegated saves. The design itself makes that distinction at `docs/designs/269-knowledge-system.md:842-859` and again in Notes. Nothing in this audit treats the proposed paths or behaviors as installed.

The PRD and design are both still proposed as wholes. Several individual decisions are already approved: the toolkit-wide handshake principle; ordinary command hooks as the initial direction; four public knowledge skills; delegated execution after a save is authorized; quiet end-turn review; related ready saves sharing a commit; the core-manual/task-procedure split; automatic-memory-save grant metadata; R14 topic organization refinements; and the R18 ownership clarification. Those approvals do not constitute full requirements approval, full design approval, build authorization, or runtime proof. The isolated manual is explicitly a review draft, not active instructions.

## Overall assessment

The requirements have a strong product center: the owner should state intent in ordinary language, the agent should recover project context, one record should own each meaning, the owner should not repeat permission, and routine upkeep should be nearly invisible. The design also correctly distinguishes guidance, objective checks, and agent judgment.

The main readiness risk is shared-state semantics, not hook mechanics. `current.md` and the inbox are presented as cross-session, cross-harness, and cross-computer coordination records, but the design gives them only “reread, preserve, commit, push” behavior. That is insufficient when two sessions approve or save concurrently, when one computer is offline, or when the permission record itself has not reached the remote before a helper or parent session ends. The acceptance scenarios mention these cases, but they do not yet define pass/fail invariants that prevent lost permission, duplicate execution, or silent conflict resolution.

I would not approve the whole design for implementation until findings F1-F4 are resolved. F5-F8 can be resolved alongside detailed design if their product choices are made explicit.

## Findings

### F1 — Critical: the shared inbox has no concurrency or idempotency contract

**Location:** PRD R28, especially `knowledge-system.md:1857-1866`; R9 `:691-718`; design `6.7`, especially `docs/designs/269-knowledge-system.md:536-580`; acceptance scenario `:925-926`.

**Evidence and scenario:** Session A and Session B start from the same remote `main`. A records approval `P-17`; B records `P-18`. Both reread their local inbox before editing, commit, and try to push. One push wins and the other is rejected as non-fast-forward. If the second session merges the shared Markdown, it must decide whether two state transitions for the same stable reference are duplicates, conflicting approvals, or independent work. If the sessions update the same entry, ordinary line merging cannot decide whether `awaiting approval`, `approved, save unfinished`, or removal after completion is authoritative. The current text says “must not lose,” “must not duplicate,” and “serialize,” but does not define a compare-and-set condition, single publisher, per-entry files, transition ordering, completion token, or deterministic merge rule.

Official Git documentation confirms that concurrent branch updates can be rejected, and that conflicting content requires a person or program to choose the final content; Git does not supply knowledge-domain conflict semantics. A non-fast-forward update must first incorporate the remote history, and overlapping content can require explicit conflict resolution.

**Impact:** approval can be lost, the same save can execute twice, a completed entry can reappear, or an unresolved conflict can be “resolved” by whichever helper publishes last. This breaks the core promise that the owner never has to repeat a decision.

**Strongest counterargument:** Git already prevents history loss by rejecting non-fast-forward pushes, and the existing direct-publication rule requires fetching, preserving other edits, and stopping on meaningful conflicts.

**Why that is insufficient:** Git prevents overwriting remote history; it does not define the valid state machine for one pending save or identify semantic duplicates. Stopping safely is good recovery, but the product still needs to say what is safe to merge automatically and what requires owner judgment.

**Smallest recommendation preserving intent:** define the inbox as a set of independently identified operations with an immutable operation ID and an explicit monotonic state machine. Require execution idempotency keyed by that ID, require publication against the remote revision the helper read, and define transition conflicts: independent IDs merge; the same ID with identical meaning deduplicates; state can advance only along specified transitions; changed meaning or competing terminal states stop for reconciliation. Consider one file per pending operation if a single Markdown file continues to create avoidable line conflicts. Add a two-computer test where both sessions update the same entry and different entries from the same base revision.

**Decision type:** technical refinement, unless the owner must choose between a single inbox file and per-operation files.
**Confidence:** 99%.

### F2 — Critical: permission continuity has a durability gap before delegated execution

**Location:** PRD R9 `:695-710`, R28 `:1857-1864`; design `6.7` `:546-580`; manual draft `8` `:214-228`.

**Evidence and scenario:** The owner approves a save. The main agent writes the approval to the local inbox and immediately starts a helper. Before the inbox commit/push completes, the main session and helper terminate or the computer loses power. The design says the helper must not rely on private context and that the approval must survive, but it does not require a durable local write plus verified shared publication before execution begins. If the inbox write itself conflicts or the network is down, another computer cannot know the approved scope. If the helper has already changed the destination, the later session cannot prove whether it executed the approved operation or a reconstruction.

Git is distributed, so a local commit can preserve work while offline, but another computer cannot see it until a shared remote receives it. Official Git material distinguishes local history from remote collaboration, and `git push` explicitly fails on unreachable networks or rejected updates.

**Impact:** the system can lose the only durable evidence of consent while still partially executing the consented action. That is the most damaging failure class for a permission-sensitive memory system.

**Strongest counterargument:** R28 already says to write locally, share promptly, report exactly what another session cannot see, and leave the save unfinished.

**Why that is insufficient:** “promptly” does not order the permission record relative to helper mutation. The required safe handoff point is unspecified.

**Smallest recommendation preserving intent:** establish a two-level durability rule. Before a helper may mutate lasting records, the exact operation and authority must be durably recorded locally with a stable ID. Before the main session can end or claim cross-computer recovery, that record must be verified on the shared branch. If remote publication is unavailable, the helper may continue only while the initiating session retains the local durable record and must not claim cross-computer recoverability; otherwise it pauses. A destination commit must include or reference the operation ID so recovery can prove whether it landed.

**Decision type:** owner product decision on whether offline local execution is allowed; technical refinement for the ordering and evidence.
**Confidence:** 98%.

### F3 — High: a topic file's file-level provenance cannot faithfully describe mixed claims

**Location:** PRD R14 `:1005-1059`, particularly the permission to combine facts, decisions, lessons, and history in one topic file; R15; R22; design `6.3` `:367-401`; manual draft `9` `:238-276`.

**Evidence and scenario:** A topic file contains (a) a reported client constraint from March, (b) an observed production behavior verified in September, (c) an inferred cause, and (d) a superseded owner decision. The proposed schema has one `type`, one `source`, one `context`, one `confidence`, one `updated_at`, and one approval pair for the whole file. Updating only (b) changes the file's update date; it does not say which claim was reverified. A later agent cannot tell whether `confidence: observed` applies to the inference, whether the owner approved all content, or which source supports the current claim. R22 warns that an edit date is not verification, but the schema does not solve the ambiguity.

W3C PROV treats provenance as relationships among particular entities, activities, and responsible agents and supports distinct derivation, attribution, revision, quotation, and primary-source relationships. This does not require adopting RDF; it supports the first-principles point that provenance must attach to the thing whose trust is being assessed, not merely its container.

**Impact:** contradictions can remain hidden inside a valid file; one observed fact can make inferred prose look observed; and an approval or source can appear broader than it is. This undermines R6, R14, R15, R19, and R22.

**Strongest counterargument:** the body can name sources, dates, and superseded history in prose; more metadata could make files rigid and noisy.

**Smallest recommendation preserving intent:** keep lightweight file-level metadata for indexing, but require claim-level source and status annotations whenever a topic mixes sources, confidence levels, approval scopes, or current and historical claims. Plain headings or a compact source note are enough; no ontology or one-file-per-fact rule is needed. Add a check that asks a fresh reader to map each material current claim to its evidence and approval state without relying on the file's top-level fields.

**Decision type:** owner product decision about desired provenance granularity; schema and template are technical refinements.
**Confidence:** 97%.

### F4 — High: owner-visible acknowledgments conflict with the quiet experience

**Location:** PRD R9 `:683-690`; design `6.5` `:425-450`; manual draft `6` `:153-166`; manual draft `2` `:41-45`.

**Evidence and scenario:** The owner sends ten short follow-up messages during an interview. The design proposes the owner-facing line “Acknowledged. I'll evaluate what needs retaining or updating” before each message is processed. The draft manual also says to acknowledge each prompt. Separately, R9 says routine work speaks only about an approval, a save result the owner must see, or a problem, and no-change reviews stay quiet. The manual draft additionally asks for a one-line confirmation whenever `current.md` is saved. In a normal session this can produce repeated bookkeeping lines even when nothing needs the owner's attention.

**Impact:** the system makes its internal compliance process visible on nearly every turn, contrary to the product goal that the owner “should barely notice” enforcement. It also risks confusing intent acknowledgment with useful progress.

**Strongest counterargument:** Mike explicitly selected acknowledgment for every prompt as part of the handshake, and an explicit receipt is useful proof that the reminder arrived.

**Smallest recommendation preserving intent:** retain a machine-observable or agent-internal intent receipt on every prompt, but show the owner a startup confirmation once and thereafter show only failures, approval requests, requested status, or meaningful save outcomes. If Mike intentionally wants visible acknowledgment on every message, state that as an explicit exception to quiet operation and test the full conversational experience, not just hook delivery. Remove the routine `current.md` save confirmation unless availability failed or the owner asked for status.

**Decision type:** owner product decision.
**Confidence:** 99%.

### F5 — High: automatic-memory permission is broader than the trust decision it describes

**Location:** PRD R10 `:768-769`; manual draft `7` `:191-196`; design ledger `:983-985`.

**Evidence and scenario:** The owner turns off per-save approval because he trusts the agent to capture useful memories. The setting also authorizes merge, supersede, retire, and delete. A later agent judges a topic redundant and deletes it, or rewrites a decision as superseded, under the same standing grant. The user may reasonably have intended “save useful things without asking,” not “remove or rewrite existing approved history without asking.”

**Impact:** a convenience setting silently bundles additive and destructive lifecycle authority. Git makes recovery possible for a skilled operator, but the owner experience promises that the agent manages the files and does not require the owner to recover history.

**Strongest counterargument:** the PRD explicitly says the setting covers every lifecycle operation, Mike settled that scope, and all normal checks and reports still apply.

**Smallest recommendation preserving intent:** during full-design approval, present this consequence plainly with one delete/supersede example. Prefer two project settings: automatic create/update and automatic destructive lifecycle operations. If the broad setting remains, record that the owner knowingly chose that scope and require recoverability evidence plus a concise after-action notice for removal operations.

**Decision type:** owner product decision; this is an approved individual decision that should not be silently reopened, but it warrants explicit confirmation as part of whole-design approval because of its consequence.
**Confidence:** 96%.

### F6 — High: offline and multi-computer behavior is described as failure reporting, not a usable recovery model

**Location:** PRD R13 cross-computer guarantee `:930-935`; R28 `:1857`; R9 `:691-695`; design `8-10`, especially `:797-817`, `:854-859`, `:886-900`.

**Evidence and scenario:** Laptop A works on a flight and creates a local `current.md` update and approved inbox entry. Desktop B continues from the last remote `main`, makes its own changes, and pushes. When A reconnects, its default-branch publication diverges. The design says to report what is local and preserve changes, but it does not define whether A may continue, how the two views converge, which status wins, or how stale permissions are reconciled before an automatic retry.

Official Git documentation makes clear that branches and commits are local until communicated, and non-fast-forward remote updates require incorporating the other history before pushing. This is normal distributed-system behavior, not an exceptional tooling bug.

**Impact:** the requirement that a next session on another computer “must be able to see” current context cannot be met while offline, and reconnection can create exactly the semantic conflicts the design delegates to general Git mechanics.

**Strongest counterargument:** the PRD already requires honest reporting when sharing fails; it does not promise impossible real-time synchronization while offline.

**Smallest recommendation preserving intent:** narrow the requirement to eventual shared visibility and define explicit modes: local-only pending, shared, and conflict-blocked. State what operations may continue in each mode. On reconnection, fetch and reconcile by record ownership and operation ID before retrying any approved save. Add a two-computer offline/reconnect acceptance scenario with conflicting `current.md` status and one pending approval.

**Decision type:** owner product decision on permitted offline behavior; technical refinement for state and reconciliation.
**Confidence:** 98%.

### F7 — Medium: `current.md` risks becoming a noisy second tracker and a collision hotspot

**Location:** PRD R13 `:857-956`; routing R18 `:1463-1474`; design `6.2` `:339-366`; manual draft `2` `:35-45`.

**Evidence and scenario:** Three sessions each maintain status, recent progress, next step, blockers, to-dos, owner, and a tracker link for their item. The tracker is authoritative, yet all of those fields are duplicated in one 5,000-character shared file and updated “as work happens.” One session completes an item in the tracker while another edits `current.md` from an older copy. A third starts and must compare every relevant summary to the tracker before trusting it. The overview becomes both high-churn and untrusted.

**Impact:** the mechanism creates recurring reconciliation work and line conflicts in the file meant to reduce catch-up. At scale, 5,000 characters can force useful items out without a defined priority rule.

**Strongest counterargument:** `current.md` is deliberately only an overview, links to the tracker, and requires revalidation before reliance.

**Smallest recommendation preserving intent:** make the overview carry only project goal, item link, one-sentence resume point, blocker requiring cross-item awareness, and last-synced revision/date. Derive or fetch status from the tracker at briefing time. Define deterministic pruning priority when the size limit is reached; never silently drop an active item's only resume pointer. Test ten simultaneous items and two edits to the same item.

**Decision type:** owner product decision on how much duplicate status is worth the convenience; technical refinement for synchronization and pruning.
**Confidence:** 94%.

### F8 — Medium: the inbox stores more conversation identity and approval context than recovery demonstrably needs

**Location:** PRD R28 `:1857-1859`; design `6.2`; manual draft `8`.

**Evidence and scenario:** A shown proposal concerns a sensitive client staffing or security decision. R28 requires the harness, conversation ID, source, date, exact card, permission scope, and links, all committed on the project's default branch. Secrets are excluded, but sensitive business context is not necessarily a secret. A conversation identifier may also be host-local, inaccessible on another computer, or meaningless after retention expires.

**Impact:** recovery metadata can unnecessarily widen access to conversation context and create long-lived identifiers without a retention rule. It can also give a false sense that the original conversation will be retrievable.

**Strongest counterargument:** the exact card and origin are needed to prove consent and recover after interruption; the repository already has its own access controls.

**Smallest recommendation preserving intent:** store the minimum durable consent evidence: stable operation ID, exact approved meaning/card, approver, date, scope, source record, and destination. Make conversation ID optional and include it only when the host confirms it is portable and useful. Add redaction rules, repository-sensitivity guidance, and removal timing after verified completion while preserving whatever audit evidence the project actually requires.

**Decision type:** owner product decision on auditability versus data minimization; technical refinement for fields and retention.
**Confidence:** 91%.

### F9 — High: condensed exclusion language can turn “not memory” into “discard this”

**Location:** PRD R11-R12, especially `knowledge-system.md:801-853`; R18 `:1368-1530`; manual draft `5` `:127-144`; design `6.3-6.4`.

**Evidence and scenario:** The full PRD correctly says memory exclusions do not erase information that belongs elsewhere and R18 routes research, requirements, design rationale, procedures, System Guide explanations, work status, and outside documentation. The core-manual draft compresses the negative list to “Exclude routine commands and tool activity, transcripts, scratch reasoning, raw errors, abandoned speculation, code copies, reconstructible system descriptions, live status, open tasks, and secrets from lasting memory,” followed by a general route-elsewhere sentence. A fresh agent can reasonably apply the bold negative category first and fail to preserve: (a) an independently discovered material limitation that belongs in project research or the System Guide; (b) a rejected design alternative whose rationale is necessary to avoid reopening it; or (c) a hard-won investigation lesson that is not a qualifying memory because it belongs in a skill or architecture record. The strict R11 owner-participation rule amplifies this: an important agent discovery qualifies for memory only when it is a real significant problem the agent found and fixed, even when no other owner clearly exists.

**Impact:** the system may optimize noisy-memory false positives while creating false negatives across the wider project record. That directly conflicts with R18's “notice and route” responsibility and the owner's goal that future sessions do not repeat expensive reasoning.

**Strongest counterargument:** R12's check explicitly says to apply R18 instead of discarding useful information, and the manual's ownership table names the other destinations.

**Why that is insufficient:** the most salient task-time instruction is the condensed exclusion list. The design relies on agent judgment, so the wording should make the decision sequence unmistakable: first ask whether information is useful and owned anywhere; only then decide whether memory is the right owner.

**Smallest recommendation preserving intent:** rewrite the core instruction as “These items do not become lasting memory merely because they occurred. Preserve useful meaning in its proper owner.” Add concrete inclusion/exclusion pairs: agent-discovered product behavior → research/Guide; rejected alternative plus durable rationale → design; repeatable investigation lesson → skill; unsupported or passing speculation → conversation only. Add false-negative acceptance cases alongside noisy-save cases. Separately ask the owner whether the R11 owner-participation exception should cover a material, independently verified project fact with no other owner; do not silently broaden it.

**Decision type:** technical refinement for wording and tests; owner product decision for any expansion of the strict owner-participation criterion.
**Confidence:** 97%.

## Scenario walkthroughs

These are logical walkthroughs against the documents. They are not executed host or runtime tests.

| # | Scenario | Expected agent actions | Resulting records | Main failure modes | Requirement coverage |
|---|---|---|---|---|---|
| 1 | Fresh Acme session, System Guide disabled | Read `SOUL.md`, project record, and core manual in order; check overview/inbox; open tracker when available; acknowledge startup once; do not invent a Guide or tracker | No lasting write merely from startup; concise current context only if useful and permitted | False read receipt, proposed paths mistaken for current runtime, duplicate OS/knowledge briefings | R1-R4, R7, R13, R18-R19, R25-R27, R30 |
| 2 | Owner says, “Keep Auth0 for this release because migration would delay launch” during an authorized PRD interview | Separate the requirement correction from a possible lasting decision; use existing drafting permission only for the PRD scope; prepare a separate memory card only if the decision is not already owned; record permission before helper execution | Owning PRD updated; inbox entry while save unfinished; no duplicate memory unless independently justified | Draft permission widened to memory/build authority; save begins before consent record is durable; same meaning copied into design and memory | R3, R9-R12, R16, R18, R20, R28-R30 |
| 3 | Owner does not answer a proposal, session ends, Codex resumes | Save the exact shown card as `awaiting approval`; share it if possible; next session treats it as pending, checks original evidence, and does not repeat it every turn | Inbox only; destination unchanged | Proposal exists only in chat; pending text treated as truth; conversation ID unusable; remote unavailable | R4, R9-R10, R19-R20, R25, R28 |
| 4 | Two sessions approve different saves from the same remote revision | Give each operation a stable ID; reread/fetch; preserve both; execute once each; stop on semantic conflict; publish verified results | Two independent inbox entries and eventual destination commits; entries removed only after verified completion | Non-fast-forward push; one inbox version overwrites the other; duplicate helper execution; removal races with stale update | R3-R4, R9-R10, R13, R21-R22, R28-R30; exposes F1 |
| 5 | Laptop offline, desktop continues work | Mark laptop changes local-only; do not claim other machines can see them; allow only operations safe without shared recovery; reconcile remote changes before retrying on reconnect | Local commits/pending state, later reconciled shared records | Divergent default branches; stale current status; approval executed without remotely visible evidence; false “shared” claim | R3-R4, R9-R10, R13, R25, R28, R30; exposes F2/F6 |
| 6 | Topic has an observed fact, inferred cause, and superseded decision | Open current topic; map each claim to its source/confidence/status; propose only changed meaning; preserve useful history; avoid a second topic file | One coherent topic with claim-level evidence where needed; index summary remains current | File-level `confidence` overstates inference; new edit makes old claim look reverified; broad approval inferred from one field | R6, R10-R15, R19, R21-R22; exposes F3 |
| 7 | Owner enables automatic memory saving, agent later finds a duplicate and obsolete decision | Check exact setting scope; distinguish merge/supersede/delete; perform only authorized lifecycle action; preserve recovery and notify as required | Updated/consolidated topic, repaired links/index, auto-save marker and result report | Owner intended additions only; useful history deleted; automatic delete lacks clear audit/recovery | R9-R15, R21-R23; exposes F5 |
| 8 | Ten short interview follow-ups with no lasting candidate | Evaluate each message, keep working context current only when needed, perform quiet end-turn review, avoid visible no-op bookkeeping | Normally no new lasting record; perhaps one concise overview update | Visible acknowledgment before every reply; current-file confirmation spam; redundant review loops | R3, R9, R11-R13, R23, R29; exposes F4/F7 |
| 9 | Helper commits the destination, push fails, parent session ends | Keep state `approved, save unfinished`; distinguish local write/validation/commit/remote; later session checks helper and remote before retrying; execute once | Inbox retains authority and exact next step; local commit may exist; destination not called shared | Parent ends before result collection; same save applied twice; helper's private state is sole evidence | R3-R4, R9-R10, R21, R28-R30; exposes F1/F2 |
| 10 | Shipped implementation differs from approved behavior | Verify actual deployed behavior; update PRD only for agreed delivered meaning; report unexpected deviation rather than turning defect into requirement; tracker owns remediation | PRD, tracker, and possibly design references remain distinct; quiet upkeep only when unambiguous | Merge mistaken for delivery; defect normalized into requirement; finalized PRD mistaken for live truth | R5-R6, R16, R18-R19, R22, R30 |
| 11 | Agent discovers an important limitation and rejects an alternative during investigation | Decide whether each result is useful before applying the memory test; route verified findings to project research or Guide, selected/rejected rationale to design, repeatable method to a skill, and only qualifying distinct lasting meaning to memory | Supporting research with source/limits, design rationale, or skill proposal; no forced memory card and no silent discard | Broad “not memory” instruction erases useful evidence; strict owner-participation test leaves a material ownerless fact nowhere; rejected rationale is mistaken for disposable speculation | R3, R8, R11-R12, R17-R19, R24, R29-R30; exposes F9 |

## Full requirement coverage

“No separate finding” means I reviewed the requirement and found no additional first-principles gap beyond findings already cross-referenced. It does not mean runtime proof exists.

| Requirement | Reviewed outcome | Finding / disposition |
|---|---|---|
| R1 Plain parts only | Markdown/Git authority and temporary state boundary are coherent | No separate finding; current-vs-proposed distinction is explicit |
| R2 Agent follows system | Ordered reads and recovery are clear as outcomes | No separate product gap; host proof remains outstanding |
| R3 Reliable behavior | Failure isolation is sound, but shared-state guarantees are underspecified | F1, F2, F4, F6 |
| R4 Continuation | Strong intent; cross-computer convergence is not defined | F1, F2, F6, F7 |
| R5 Check memory first | Source-first behavior is clear and preserves judgment | No separate finding |
| R6 Cite source | File citations are clear; mixed-claim evidence is not | F3 |
| R7 Project language | Glossary outcome and ambiguity handling are clear | No separate finding; large/stale glossary is already a planned proof |
| R8 Real documentation first | Captured-source trust and freshness boundaries are clear | No separate finding |
| R9 Frictionless saving | Strong owner intent; prompt noise and delegation durability conflict with it | F2, F4 |
| R10 Approval before writes | Approval distinctions are excellent; auto-save scope needs explicit consequence review | F2, F5 |
| R11 What counts as memory | Significance test is concrete; strict owner participation may leave material agent discoveries ownerless | F9 |
| R12 What never counts | Full PRD routes useful non-memory information, but condensed instructions can produce false negatives | F9 |
| R13 Working memory | Duplicates tracker state and creates a shared-file collision surface | F6, F7 |
| R14 Memory file shape | Topic cohesion is good; file-level metadata is too coarse for mixed content | F3 |
| R15 Writing | Plain-language and exact-wording conflict handling are clear | No separate finding |
| R16 PRDs | Approval, delivery, and status distinctions are strong | No separate finding; post-shipping quiet upkeep inherits F1/F2 |
| R17 Procedures become skills | Ownership boundary is sound | F9 requires the condensed exclusion guidance to preserve useful procedures; actual authoring process is already a dependency |
| R18 Routing | Most complete part of the requirements; one owner per meaning is strong | F9 is an instruction-fidelity risk rather than a defect in R18 itself |
| R19 Find order | Trust order and stop condition are coherent | F3 only where one topic contains mixed claims |
| R20 Save card | Decision-focused proposal shape is adequate | No separate finding |
| R21 Indexes/checker | Determinism and “index is not evidence” are sound | F7 for current-file size/pruning; no other finding |
| R22 Current truth cleanup | Lifecycle is clear; broad automatic deletion and mixed provenance remain risks | F3, F5 |
| R23 Learning what to save | Feedback is correctly non-authoritative and project-local | No separate finding; planned D2 work is appropriate |
| R24 Plain-language operations | User need not know commands; clear | No separate finding |
| R25 Codex | Outcome parity and honest gaps are right | No separate product finding; runtime proof remains outstanding |
| R26 Follow official docs | Correct separation between product requirements and host mechanism | No separate finding |
| R27 Install/enable/check | Per-project opt-in and honest health reporting are clear | No separate finding |
| R28 Pending inbox | Core recovery mechanism lacks concurrency, durability ordering, and data minimization | F1, F2, F6, F8 |
| R29 Narrow safeguards | Agent judgment boundary is well reasoned | F4 where visible receipts become UX overhead |
| R30 OS integration | Component ownership is strong; shared-state publication remains the weak link | F1, F2, F6, F7 |

## Sections reviewed with no additional finding

- PRD purpose, owner-working model, component placement, and “how to read” authority statements.
- Folder layout as a proposed target, provided migration never treats it as current runtime.
- Memory eligibility and exclusion criteria in the full PRD, subject to F9's condensed-instruction and ownerless-discovery issue.
- Plain-language writing rules and save-card decision content.
- Skills versus memory boundary.
- Routing among PRD, design, tracker, System Guide, research, outside documentation, brainstorms, and history.
- Source trust order and the rule that indexes are navigation, not evidence.
- PRD approval fields, finalized-versus-delivered distinction, and automatic upkeep boundaries.
- Setup opt-in, host parity as an outcome, and honest capability-gap reporting.
- The design's GUIDE/CHECK/ENFORCE/JUDGE separation.
- The four-skill division and one shared save procedure as an architectural direction.
- The migration warning that proposed paths and skills are not today's installation.
- The explicit statement that current technical proofs and fresh-agent behavior tests remain outstanding.

## Recommended approval sequence

1. Resolve F1 and F2 as one shared-state transaction contract: operation IDs, state transitions, idempotency, local durability, remote visibility, and conflict behavior.
2. Decide F6's offline modes and reconnect behavior, then reuse that contract for `current.md` and the inbox.
3. Decide F4's user-visible acknowledgment policy by walking through a ten-message conversation, not a single hook event.
4. Decide F3's minimum claim-level provenance and add one mixed-topic template/example.
5. Reconfirm the consequence of F5 during whole-design approval; do not treat the earlier scoped approval as proof that the full user experience was accepted.
6. Refine F7/F8 in templates and acceptance tests.
7. Add F9 false-negative cases before finalizing manual wording; ask explicitly about material agent discoveries with no other owner.
8. Only then select exact host transports and run the already-planned fresh, compacted, parallel, interrupted, and two-computer proofs on Claude Code and Codex.

## Primary sources

Accessed 2026-09-19.

- Git, **git-push documentation**: https://git-scm.com/docs/git-push — fast-forward safety, rejection behavior, network/authentication failure, and the need to incorporate concurrent history.
- GitHub Docs, **Dealing with non-fast-forward errors**: https://docs.github.com/en/get-started/using-git/dealing-with-non-fast-forward-errors — concurrent pushes to one branch and required fetch/merge recovery.
- Git, **git-merge documentation**: https://git-scm.com/docs/git-merge — conflict states, three-way versions, and explicit conflict resolution.
- GitHub Docs, **Merge conflicts**: https://docs.github.com/en/pull-requests/reference/merge-conflicts — competing same-line or edit/delete changes require a choice before merge completion.
- Pro Git, **Distributed Workflows**: https://git-scm.com/book/en/v2/Distributed-Git-Distributed-Workflows — local repositories, canonical remotes, and distributed collaboration roles.
- Pro Git, **Branching Workflows**: https://git-scm.com/book/en/v2/Git-Branching-Branching-Workflows — branches and merges are local until communication with a server.
- W3C Recommendation, **PROV-O: The PROV Ontology**: https://www.w3.org/TR/prov-o/ — provenance relationships among particular entities, activities, sources, revisions, and responsible agents.

## Research limitation

The requested Firecrawl workflow was attempted. The installed `firecrawl` command was unavailable; the documented `npx firecrawl-cli` fallback ran as version 1.23.3 but reported **Not authenticated**, so no Firecrawl search or scrape was possible without installing credentials. I used the web research tool instead and limited external evidence to current primary or official sources. No source files were added to the repository.

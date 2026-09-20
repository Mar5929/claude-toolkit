# Issue 269 core knowledge manual: independent content review, round 1

> Independent review evidence. Read the [reconciliation](2026-09-19-manual-content-reconciliation.md) for the final disposition and remaining work.

## Verdict

The draft is a strong policy synthesis, but it is not yet the right *core manual*. It is mostly faithful to R1–R30 and the accepted walkthrough decisions. Its main weakness is allocation: several operation-specific details that the approved instruction split assigns to `knowledge-save`, `knowledge-find`, `knowledge-review`, or `knowledge-setup` remain in the startup manual, while a few recognition-level facts needed to choose the right action are absent or too weak.

I would not shorten the selection or ownership sections merely because they are long. Those sections protect against Mike's central concern: exclusion from lasting memory must route useful information to its real owner rather than discard it. I would instead remove schema enumerations, card field enumerations, save transaction mechanics, and migration mechanics from startup, then spend some of those words making the routing and exclusion rule unmistakable.

The research supports this allocation, but does not approve a new architecture. Hindsight, claude-mem, Supermemory, and Mem0 all show value in lightweight orientation plus on-demand operational detail. Their automatic extraction, service databases, and installation-as-standing-consent models conflict with the settled Markdown/Git authority and owner-approval boundaries. The draft correctly avoids adopting those features.

## Highest-priority findings

### 1. Rewrite the exclusion paragraph so it cannot be read as “throw useful knowledge away”

Lines 139–144 say to exclude requirements, procedures, system explanations, live status, and open tasks from lasting memory and route them elsewhere. That is directionally correct, but the negative list visually dominates the routing sentence. R12 and R18 require exclusion from *memory*, not exclusion from project knowledge.

Keep this in the core manual and make the positive rule lead:

> Lasting memory is only one destination. If useful information does not qualify as memory, preserve it in the record that owns it: temporary context in current work, requirements in the PRD, tasks and status in the tracker, procedures in a skill, system explanations in the enabled System Guide or another named owner, and research in the work item's supporting records. Exclude routine commands and tool activity, transcripts, scratch reasoning, raw errors, abandoned speculation, code copies, reconstructible system descriptions, live status, open tasks, and secrets from lasting memory. Do not discard useful information merely because memory is the wrong home.

This is the single most important content change.

### 2. Keep the selection test and significant-episode rule in core

Lines 127–144 belong in the startup manual. They let the agent recognize when `knowledge-save` or another destination is needed. The significant completed exercise sentence is important and should remain. It preserves R11's meaningful-event category without opening the door to routine edit logs.

I would strengthen it slightly:

> A significant completed exercise may deserve a brief event memory when losing the fact that it happened, its result, or the route to its output would cost a later agent meaningful time or understanding. Routine edits and delivery logs do not.

That wording ties the episode rule to the approved significance test rather than to completion alone.

### 3. The core manual contains too much exact save and schema procedure

The approved split says the core manual keeps proposal and file-convention *basics*, while exact formats, fields, templates, lifecycle steps, migration examples, and host details load when applicable. The following content is too detailed for startup:

- lines 175–181: the exact card labels and response arrangement;
- lines 191–196: storage mechanics for the automatic-save grant and marker;
- lines 206–211: operation-level update/supersede/retire/delete behavior;
- lines 213–236: most pending-entry fields, helper recovery mechanics, publication sequence, retry logic, and inbox deletion mechanics;
- lines 248–270: exact YAML field lists and allowed statuses.

Keep the recognition and safety contract in core, and point to the skill for execution. Suggested replacement for the card detail:

> When new approval is needed, use `knowledge-save` to prepare the standard card. The core requirement is that the owner can see the destination, operation, meaning, scope, and decision being requested. The procedure owns the exact card layout and examples. Silence or an unclear reply does not approve a write.

Suggested replacement for the schema lists:

> Memory and PRD files use the current templates and required metadata for their record type. Memory and PRD statuses have different meanings; only PRDs may be `proposed`, and PRD approval fields record requirements approval rather than permission to draft. Open the applicable template through `knowledge-save` before writing. The procedure owns the exact fields, allowed values, and examples.

Suggested core save/recovery contract:

> Use `knowledge-save` for every lasting-knowledge lifecycle operation. It owns search-before-write, current-account maintenance, exact pending records, helper instructions, readback, indexes, checks, publication, and recovery. An authorized save is complete only after the actual saved text and remote publication are verified. If it stops, preserve the approved wording or meaning, destination, permission scope, completed steps, actual state, and next action in the inbox. On resume, check the helper, destination, and remote before retrying; do not duplicate the save or request the same unchanged approval again. Conflicting meaning returns to the owner.

That preserves the accepted interrupted-save experience without making the startup manual duplicate the task procedure.

### 4. Pending-save sharing is stated too strongly

Lines 224–229 effectively require default-branch publication as part of every save, which is correct for this toolkit's authorized documentation route, but lines 213–217 do not clearly distinguish local recovery from cross-session visibility. The approved experience explicitly requires verifying actual state across sessions. The manual should say that an inbox record may exist locally before it is shared and must never be represented as available to another session until publication is verified.

Add to the core recovery contract:

> A local inbox entry is not cross-session recovery proof. Say whether the pending record is local, committed, or verified on the shared branch, and never claim another session can recover it until the shared state is verified.

The exact Git sequence belongs in `knowledge-save` and the documentation-publication rule.

### 5. “For each user message, acknowledge…” is runtime wording, not durable manual policy in this form

Lines 153–156 prescribe an acknowledgment of the delivered reminder on every user message. R9/R29 do require a per-message reminder and intent acknowledgment, so the obligation cannot simply disappear. But this sentence is easy for an agent to turn into repetitive user-visible boilerplate, and the actual exact reminder remains unresolved. The manual should state the outcome and boundary; the hook-generated instruction should own the exact acknowledgment wording and frequency mechanics.

Proposed core wording:

> The prompt reminder requires a brief intent acknowledgment and a review of the user's message and relevant conversation. The acknowledgment is only a receipt: it does not prove that the review happened, approve a save, or establish that any information qualifies. Follow the current reminder wording; routine reviews with no useful update remain quiet after that acknowledgment.

This preserves R9/R29. Removing the acknowledgment, owner orientation, compact positive/negative criteria, or both manual links from the emitted reminder would require a requirements decision; the shortest research candidate is not compliant as written.

### 6. Current-work maintenance is a little too operational, while its data contract is too vague

Lines 41–45 tell the agent how to update and publish current work, but do not say the essential R13 shape: project context plus multiple concurrent items, each with goal, state, important recent results, next step, and later to-dos where useful. The 5,000-character limit is buried later with file schemas.

Core recognition wording should say:

> Keep the shared overview under 5,000 characters. It may hold several concurrent items and enough project context to orient a new session. For each active item, keep the goal, current state, important recent results, next step, and useful later to-dos, with links to the tracker or document that owns the detail. The current-work template owns the exact layout.

Publication and concurrent-edit mechanics belong in `knowledge-save` or the current-work reference.

### 7. The manual needs a little more recognition-level guidance for glossary and outside documentation

R7 requires enough core content to recognize the glossary: aliases and project terms, direct route, table shape, and exclusion from the memory index. R8 requires captured sources to retain origin, capture date/version where relevant, coverage/usefulness, and their status as evidence rather than project truth. The draft gives the path and external-source cautions, but not all of those recognition facts.

Add near lines 35–39:

> The glossary is a plain table of project terms and aliases, not a memory record, and is not included in the memory index. Use it before searching when the owner's wording may differ from filenames or technical terms.

Add near lines 117–120:

> Captured outside documentation remains source material, not project truth. Its record identifies the source, capture date and relevant version, what it covers, and when it is useful. Preserve the captured text; record project conclusions in the owning project record.

Exact table columns and capture templates belong in setup/find references.

### 8. Topic organization is correctly detailed and should remain

Lines 240–251 reflect the latest accepted walkthrough: one coherent topic by default, internal headings and connections, topic folders for coherent subtopics, and splitting by findability or understanding rather than fact count or length. This is the right amount of core guidance because an agent must recognize whether it is preserving one usable account before it reaches for an operation template. Do not collapse it to “keep files concise.”

The draft also correctly says there is no fixed memory-file length cap and that useful explanations, examples, exceptions, and history may be substantial. That protects valuable knowledge and should remain.

### 9. The ownership table is valuable core content, but two rows need sharper boundaries

The table at lines 62–80 is the strongest part of the draft and should remain, even if it costs startup tokens. It prevents memory from becoming a fallback database.

Two edits:

- “Project-authored research findings” should say “supporting evidence, linked from the design or other owning record; research does not itself approve a requirement or choice.” The prose below already says this, but the table is where routing decisions happen.
- “Earlier conversations” should say they are a last-resort evidence source whose availability and limitations must be reported, never a durable owner by themselves.

The ADR paragraph is appropriate because it prevents a label from creating a second authority. Keep it.

### 10. PRD status and upkeep need a clearer core statement

Lines 183–189 cover drafting permission and post-delivery upkeep, but the manual never gives a compact trust/status map comparable to the PRD requirement: proposed is wanted behavior, finalized is approved required behavior, neither proves delivery; shipped evidence and current system state remain separate.

Add:

> A `proposed` PRD describes wanted behavior. A `finalized` PRD records approved required behavior. Neither status proves the behavior was delivered; verify the live system or delivery evidence. After authorized work ships, update affected PRDs to reflect the agreed delivered behavior under the existing upkeep permission, but do not turn an unexpected defect into a requirement.

Bottom Notes ownership is already present in the routing table and should remain.

### 11. Setup, host parity, and official-doc compliance are underrepresented in core but should stay mostly outside it

The draft's last paragraph says setup is authorized, preserves content, verifies active version, and needs host evidence. That is enough recognition-level policy. Exact activation, migration, trusted-hook, and host-event details belong in `knowledge-setup` and host references. The manual should add only:

> Source installation or a merged toolkit change does not mean a project is equipped. Treat the system as active only after that project has opted in and setup verifies the installed version and required parts.

Do not add provider-specific architecture or hook-event documentation to core.

## R1–R30 content coverage matrix

“Core” means the startup manual must retain enough policy to recognize and route the action. “Procedure/reference” means exact execution belongs on demand. “Runtime/proof” means prose cannot satisfy the requirement by itself.

| R | Core manual content | Procedure/reference owner | Runtime/proof or other authority | Draft assessment |
| --- | --- | --- | --- | --- |
| 1 | Editable Markdown/Git records, one owner, recover renamed/deleted routes | `knowledge-setup` migration/repair | setup/checker and repository evidence | Partial: authority is clear; rename/deletion recovery is only implicit. Add one recognition sentence, keep mechanics out. |
| 2 | Startup read order, complete-read acknowledgment, missing-content and context-recovery boundary | root routes and setup references | startup adapter receipts and fresh-session proof | Strong and appropriately core. |
| 3 | Required outcomes, affected-work pause, unrelated work continues, recovery responsibility | all four procedures | completion/action checks and behavior tests | Strong; do not imply a reminder proves compliance. |
| 4 | Resume from current, inbox, tracker and document Notes; pending is not delivered | find/save plus current template | handoff/tracker evidence | Strong, though Notes could be named again in startup paragraph. |
| 5 | Consult relevant existing knowledge when it could affect the action; no forced lookup for every tool call | `knowledge-find` | retrieval tests | Strong. |
| 6 | Open actual source, cite path/session/date as applicable, index is not evidence | `knowledge-find` evidence rules | source fixtures | Strong. |
| 7 | Glossary purpose/path, aliases, plain table, excluded from memory index | find/setup template | index/checker proof | Partial: path exists; aliases/table/index treatment missing from core. |
| 8 | Outside docs are dated/versioned source material, not truth; conclusions route to owner | find/setup/index references | capture/index proof | Partial: freshness present; origin/coverage and preserve-raw boundary need one compact sentence. |
| 9 | Save/review moments, quiet no-result behavior, helper delegation, verified completion, grouping/recovery | `knowledge-save` and `knowledge-review` | reminder/completion/helper/publication proof | Covered but over-detailed. Compress transaction mechanics; retain obligation and accepted recovery experience. |
| 10 | Permission covers operation/meaning/scope; reuse authority; per-save default and explicit auto-save option | save/setup/fields | permission records and checker | Strong, but marker/storage mechanics should move to procedure/template. |
| 11 | Project relevance + lasting significance + owner/joint source; real-fix exception; significant episode | save/review and reminder | selection scenarios | Strong. Keep and tie episode wording to significance. |
| 12 | Negative memory criteria plus positive routing to proper owner; useful withdrawn-history exception | save/review and reminder | mixed-destination tests | Meaning is present but negative emphasis risks suppression. Rewrite as proposed above. |
| 13 | Current overview supports project context and multiple concurrent items; 5,000-char limit | current template/save | checker and parallel-session tests | Partial: path/upkeep strong; essential structure not explicit enough. |
| 14 | Coherent topic ownership; folders/subtopics; group/context/update concepts; conditional approval | save templates/lifecycle/checker | fixtures and validation | Topic policy is excellent. Exact field/status enumeration is overstuffing and should move on demand. |
| 15 | Plain, literal, contextual writing; preserve exact wording; retain useful detail | all templates/examples/manuals | content review and output tests | Strong. |
| 16 | PRD ownership, statuses/trust, approval meaning, Notes, quiet delivered-behavior upkeep | save/templates plus requirements/design/upkeep procedures | live-system and delivery evidence | Partial: upkeep present, but proposed/finalized do-not-prove-delivery statement should be explicit. |
| 17 | Procedure routes to skill-authoring process; missing capability reported | actual portable skill-authoring process once found | integration proof | Correctly says route through project process, but this remains a design dependency, not satisfied content. |
| 18 | Full kind/scope/owner routing; no memory fallback; split mixed content and link | destination-specific components | integration tests | Strongest section. Preserve detail. |
| 19 | Source authority/find order; continue through conflicts/gaps; history last and limits explicit | `knowledge-find` | adapter/access tests | Strong; “partial answer does not end investigation” should be bounded by material relevance to avoid needless searching. |
| 20 | Approval card must expose destination, operation, meaning, scope, decision; uncertainty settled first | save card reference | rendering/partial-approval tests | Covered but exact labels/layout belong in reference. Keep basics only. |
| 21 | Indexes are maps, generated, open source; saved-text readback and checks; no arbitrary memory length cap | setup/save/index/checker references | deterministic rebuild/checker proof | Core has the essential concepts indirectly, but exact field/limit lists should be redistributed. Keep 200/5,000 limits only if needed for recognition; 5,000 belongs with current. |
| 22 | Search existing topic; maintain one current account; age is not cause; lifecycle actions need approval | save lifecycle references | lifecycle/link tests | Covered but operation recipes belong in save references. |
| 23 | Use real selection feedback and stated reason; no inference from silence; local feedback does not override policy | save/review and feedback template | later-session selection tests | Strong. Keep recognition policy in core; exact storage cleanup belongs on demand. |
| 24 | Plain-language outcomes map to four procedures; user need not know skill names | four skill descriptions/catalogs | routing tests | Strong enough. |
| 25 | Same records/outcomes on Claude Code and Codex; gaps named | setup/host references | separate native-host evidence | Present only near end. Add a compact explicit parity sentence; mechanics outside core. |
| 26 | Build/change against current official host docs; report conflicts | setup/host references and repo rule | pinned docs/version and behavior proof | Mostly outside the user-facing manual. A short setup obligation is sufficient. |
| 27 | Per-project opt-in; complete coherent setup; active version verified; update/repair | `knowledge-setup` | setup/sync manifests and fresh-project proof | Partial: authorization and version appear, but installed-source versus equipped-project distinction should be explicit. |
| 28 | Inbox purpose, pending is not truth/approval, exact unanswered cards, authorized unfinished saves, recovery/no duplicate/no reapproval/conflict | save/review/inbox template | cross-session/host/concurrency/publication proof | Strong but over-detailed. Preserve accepted recovery contract in core; move field list and mechanics. Explicitly distinguish local from shared visibility. |
| 29 | Agent owns semantic judgment; objective safeguards; acknowledgment is receipt; no semantic scorer/forced reread | skills/hooks/helper contracts | reminder and behavior tests | Partly distributed across sections. Add one compact explicit judgment/safeguard paragraph or strengthen section 1; exact reminder still must meet R9/R29. |
| 30 | Component ownership, scoped permissions, result/unfinished-work handoff; no substitute stores | toolkit manual and component integrations | end-to-end OS scenarios | Strong routing table, but the core should link the higher Toolkit OS manual because R29's emitted reminder must link both manuals and R30 needs discoverability. |

## Recommended additions to core

1. The positive “wrong home does not mean discard” wording under finding 1.
2. Glossary recognition: aliases, plain table, excluded from memory index.
3. Captured-source recognition: origin/date/version/coverage, preserved as source material.
4. Current overview's multiple-item data contract and 5,000-character boundary.
5. PRD status/trust statement separating approved requirement from delivery proof.
6. Local-versus-shared pending-save state statement.
7. Installed-source versus equipped-project distinction.
8. A direct link/name for the higher Toolkit OS manual in the procedure map or responsibility section.

## Recommended removals or moves from core

1. Exact proposal card labels and formatting to the `knowledge-save` card reference.
2. Exact YAML fields, allowed statuses, approval markers, and auto-save markers to templates/save references.
3. Detailed update/supersede/retire/delete recipes to lifecycle references.
4. Pending inbox field enumeration, helper identifiers, and retry sequence to save/inbox recovery references.
5. Git commit/push mechanics to the publication procedure, leaving verified shared completion as core policy.
6. Migration conversion mechanics to `knowledge-setup`.

## Content that should not be added

- Provider-specific terminology, memory databases, embeddings, extraction missions, observer models, or hosted-service behavior.
- Automatic transcript extraction or installation-as-consent.
- A semantic classifier or fixed search/tool sequence.
- A universal word, fact-count, or file-length cap.
- The shortest research reminder candidate as installed wording; it omits current R9/R29 obligations.
- A new ADR directory, research database, pending-save store, or duplicate tracker.

## Case for and against the disputed level of detail

**Case for keeping more in core:** the agent must recognize a save, select the right destination, preserve permission, and know when a claimed completion is false before it decides to load a task skill. Startup policy is also more robust when skill routing fails. Mike has explicitly rejected shrinking useful content merely to optimize word count, and complex topic organization is part of safe behavior.

**Case for moving more out:** exact schemas and transaction steps are only useful during an operation, create drift against templates and procedures, and make the full startup read carry details irrelevant to most sessions. The four-provider research consistently supports putting operational distinctions near the action. The approved design explicitly assigns exact formats and examples to on-demand references.

**My resolution:** keep decision boundaries, destination recognition, permission, significant-event selection, recovery obligations, completion definition, and topic-quality rules in core. Move enumerations and ordered mechanics. This is not a general shortening exercise; it is one-owner-per-rule allocation.

## Source and approval fidelity

- Baseline `e026e09` includes the accepted interrupted-save recovery clarification. The draft at `414d524` correctly incorporates the accepted topic-depth clarification.
- The draft does not present the four-provider research as approval for automatic extraction or databases.
- It does not approve a new ADR location or retention policy.
- It correctly treats full design/build as unapproved in its review notes.
- The source hierarchy is respected: proposed PRD defines intended requirements, master design records selected direction and open approvals, research supplies evidence, and the inactive manual draft changes no runtime behavior.

## Round-one acceptance position

I would accept sections 1, 3, 4, 5, and the topic-organization prose in section 9 as the substantive core. I would request a focused rewrite of sections 6–8 and the schema half of section 9 to separate core policy from operation procedure, plus the eight compact additions above. I would not ask for stylistic rewriting of the ownership table, selection criteria, or complex-topic guidance.

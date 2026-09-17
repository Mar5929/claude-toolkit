# Knowledge System design walkthrough

Updated: 2026-09-17

This is a proposed solution walkthrough for [issue 269](https://github.com/Mar5929/claude-toolkit/issues/269), prepared after reading the complete [PRD](../../../knowledge/prds/toolkit-operating-system/knowledge-system.md), the [consolidated design](../269-knowledge-system.md), and both earlier approaches in `briefs/`. It complements the approved requirements walkthrough; it does not replace it or approve implementation.

## How to use this review

Follow [the saved review method](process.md#scenario-led-design-review-requested-2026-09-17). Present one step at a time, including the concrete mechanism, then record Mike's answer and its scope before continuing. Break a step into smaller decisions when necessary. Do not ask all the questions in this document at once.

The [toolkit-wide handshake principle](../../../knowledge/prds/toolkit-operating-system/toolkit-operating-system.md#design-principle-guide-the-agent-through-handshakes) governs every step. The agent reasons about meaning, relevance, sufficiency, routing, and permission. Small hooks deliver instructions and request acknowledgments; tools check objective properties. Neither a marker nor a successful checker proves good reasoning. No transcript scorer, keyword classifier, or changed-file counter decides whether knowledge matters.

Recommended basis: the consolidated design, with the changes and unresolved choices called out below. The earlier approaches are design history: consolidation corrected delivery limits, hook events, and integration gaps. The rejected changed-file trigger stays rejected. Recommendations here are proposals, even where the older draft describes them as decisions.

All runtime paths below describe the proposed system. Today this repository still uses `knowledge/current.md`, the six existing skills, and `spec-index.md`. Writing this document does not migrate them. Hook behavior is a draft claim requiring official-documentation refresh and realistic runtime proof before implementation or a claim of support.

## Review position

| Item | Position |
| --- | --- |
| Current step | 1, project setup; awaiting Mike's review |
| Last approved scenario step | None |
| Existing decisions retained | Startup delivery counts as reading; check delivery completion. Agent reasoning with lightweight handshakes is the governing philosophy. Changed-file review trigger rejected. |
| Next question | Does the setup flow in step 1 match the experience Mike wants? |
| Remaining work | Review steps 1–12, reconcile their answers into PRD/design, then obtain full requirements and design approvals. |

## The project story

We are starting a fictional customer portal called Harbor. Mike owns it. Its first feature is account access; another active item concerns notifications. Work spans discussion, implementation, two concurrent sessions, a second machine, and eventual delivery. Example facts and messages below are fictional, not facts to save about this repository.

The normal path runs from setup to delivery. Branches deliberately exercise rejection, missing sources, interrupted saves, conflicts, and migration. A single successful session could not demonstrate those requirements.

## 1. Equip Harbor

**Mike:** “Set up this project. Turn on the knowledge system so we can use it in Claude Code and Codex.”

**What runs:** the existing `project-init` entry point delegates the knowledge portion to proposed `plugins/second-brain/skills/knowledge-setup/SKILL.md`. An existing project reaches the same skill from `project-sync` or an ordinary setup request. There is no background installer guessing which projects to enable.

The skill inspects the project, existing instructions/settings, installed plugin version, and Git hooks. It creates or safely merges the project files from its `references/templates/`:

| Proposed project artifact | Purpose |
| --- | --- |
| `SOUL.md` | The agent's responsibility in Harbor |
| `knowledge/project.md` | Project identity, real resources, tracker, owner, memory approval setting |
| `knowledge/README.md` | Short operating map and links to detailed guidance |
| `knowledge/memory/current.md` | `# Current working memory`, project goal, active items, general to-dos |
| `knowledge/memory-inbox.md` | Pending decisions and unfinished approved saves |
| `knowledge/memory/memory-index.md`, `knowledge/prds/prd-index.md` | Generated maps to actual source documents |
| `knowledge/memory/memory-entries/terminology-glossary.md` | Project vocabulary; final path remains a review choice |
| `knowledge/memory-selection-feedback.md` | Project-specific lessons about selecting memory |
| `ai-external-knowledge/README.md` | Generated map of captured outside sources, when present |

Empty destinations contain no invented history or approvals. Existing content is read before any merge. Lasting meaning changes retain the relevant approval requirements.

Reusable skills/hooks/tools run from the installed plugin. Claude receives `.claude/rules/knowledge-system.md` and project activation in `.claude/settings.json`; Codex receives corresponding root `AGENTS.md` guidance and its supported hook/skill registration. The proposed four skills are `knowledge-find`, `knowledge-save`, `knowledge-review`, and `knowledge-setup`. Setup connects the seven hooks listed in later steps. It checks `core.hooksPath` and existing `.git/hooks` before adding `.githooks/pre-commit`.

**Agent versus machinery:** the agent establishes Harbor's purpose and interprets conflicts. Setup tools inspect versions, files, registration, and delivery. Native memory is disabled only through a supported setting scope consistent with project opt-in; a machine-wide change affecting other projects is not silently acceptable. Exact Codex configuration scope and trust behavior remain proof requirements.

**What Mike sees:** a short report of what was equipped, the running version, enabled harnesses, and any unresolved failure. The routing examples are available without making him understand every folder. A fresh-session delivery check must succeed before reporting that harness ready. File existence alone is insufficient.

**Failure branch:** an existing Git-hook conflict, untrusted registration, or missing delivery is named. Preserve existing hooks and other projects; report incomplete setup and the next action. Optional System Guide and work-management components are not enabled incidentally.

**Recommendation / decision:** one complete project setup operation, using machine-installed reusable components and project-owned Markdown. Review this experience first; exact layout migration and remaining platform gaps return in step 12. Design source: §§6.3 knowledge-setup, 6.7, 8, 9.3–9.5.

## 2. Open the first session

**Mike:** opens Harbor and says, “Let's define account access.”

**Trigger and files:** proposed `SessionStart` registration invokes `plugins/second-brain/hooks/startup-files.mjs` and `startup-state.mjs`. The first delivers version, `SOUL.md`, `knowledge/project.md`, then `knowledge/README.md`. The second delivers inbox headings/states, glossary, index paths/counts, System Guide configuration status, and working memory. Detailed source documents stay on disk until useful.

The draft budgets 9,500 characters per hook. Missing or overflowed required content produces an explicit path to read; it must not silently count as delivered. Glossary printing is proposed at 1,500 characters, falling back to term/reference columns plus the file path. Inbox preview is proposed at 1,200. These cutoffs and extra file ceilings remain choices, not approved PRD limits.

**Agent / handshake:** actual hook delivery already counts as the startup read. The agent follows explicit missing-file instructions and acknowledges readiness only when the required material arrived. It interprets the current work; the hook does not decide what the next task means. In a fresh project it begins the requested feature discussion without fabricating prior progress.

**Failure:** missing manual or timeout prevents an honest readiness acknowledgment; pause work needing that guidance, recover the file/delivery, then continue. Fail-open hooks cannot guarantee the action was blocked. The design needs fresh-session proof of ordering across both hook outputs.

**Review:** approve what reaches the agent and what Mike sees, then settle budgets and `/clear` confirmation behavior. Source: §§5, 6.4 startup hooks, 13.1, 13.14, 13.21–13.22.

## 3. Answer with the right knowledge

**Mike:** “What did we decide about access recovery? Does our identity provider support it?” Later he asks an unrelated arithmetic question.

**Trigger:** the standing rule prompts the agent to decide once per request whether saved knowledge could affect the answer. Relevant work invokes `plugins/second-brain/skills/knowledge-find/SKILL.md`; no search hook classifies the question.

The skill resolves “access recovery” through the glossary and follows working context → instructions → skills → relevant indexes and source pages → session history if still needed. Required behavior comes from the PRD, lessons from memory, structure from enabled System Guide, live existence from the system. Indexes locate sources; the agent opens them. An off Guide is named and skipped. Unknown or ambiguous terminology is clarified rather than guessed.

The external index points to captured identity-provider documentation with original source and capture date. If freshness matters, the agent checks the original official documentation. Each finding carries its source near the claim; old conversation findings carry date/context. Conflicts and inferences are explicit. A history tool unavailable in Codex means unavailable, not “searched and found nothing.”

**Result:** a sourced answer, with only necessary retrieval. Already-read relevant context may be reused; arithmetic needs no knowledge lookup. No files are written merely because a search occurred.

**Review:** approve retrieval, citation, and missing-source behavior. Source: §6.3 knowledge-find; PRD R5–R8, R19, R24, R26.

## 4. Capture the initial requirements without losing the discussion

**Mike:** authorizes the account-access requirements interview and answers questions about recovery behavior.

**Trigger / files:** the existing requirements workflow owns the interview; `knowledge-save` applies the already-authorized save path to `knowledge/prds/account-access.md`. It does not demand a new memory card after every answer. The agent preserves which behavior was agreed and which remains proposed. Saving the document is distinct from approving its requirements or building it.

The PRD has a clear title, contents, Why, What, grouped numbered requirements and checks, followed by visibly tentative solution ideas. Frontmatter follows the proposed PRD schema. Larger feature areas can have parent/child documents with one owner for each requirement. The tracker owns plan, implementation status, and approvals; working memory carries the resumable summary and pointer.

**Handshake / result:** after a settled answer, agent-led save/read-back/publication in step 7 preserves it before continuing the interview. We must settle whether multiple answers in one reply share one commit/push, and approval fields while still proposed. `finalized` records settled requirements under the proposed model; it is not evidence of implementation.

**Failure:** publication failure is explicit and retained for recovery. Do not pretend another machine has the answer. Continue only work independent of the failed save.

**Review:** approve interview continuity and PRD structure/approval meaning. Source: §6.3 knowledge-save; §§13.3, 13.16–13.18, 13.23.

## 5. Notice useful information in conversation alone

**Mike:** during account-access discussion says: “Across this product, let the agent reason and use small checkpoints. Also, notifications need an unsubscribe requirement. We learned the pilot users call recovery ‘getting back in.’ Remind me to review the onboarding copy next week. Maybe we could try invitation codes.” No code changes occur.

**Trigger:** standing guidance requires attention during conversation and at five save moments: item completion/closure, before a PR, handoff/clear, end of real work including discussion, and explicit save. The exact end-of-turn checkpoint is still open.

**Architect's proposal for review here:** a bounded checkpoint asks the agent to review the conversation against the routing/save criteria, then acknowledge the review outcome. The agent may report no candidate, existing coverage, routed changes, proposals awaiting permission, or an unfinished save. Acknowledgment records that the step was reported; it cannot certify judgment. `session-review-nudge.mjs` is the draft location for Stop integration, subject to verified harness support and loop prevention. Do not implement the old changed-file threshold. Do not equate the existing skill-entry marker with review completion.

The agent reads `knowledge-save/references/routing.md` and determines information kind, scope, and owner before memory eligibility:

| Conversation content | Owning destination |
| --- | --- |
| Product-wide design constraint | Parent PRD, with a discoverable standing instruction linking to it |
| Notifications requirement | Notifications PRD through its requirements workflow; resume account access afterward |
| “Getting back in” terminology | Glossary row with meaning, referent, source/date, and ambiguity notes |
| Upcoming copy review | Tracker/general to-do and concise working-memory pointer; no lasting memory |
| Unsettled invitation idea | Brainstorm record if worth retaining, visibly unchecked |

Additional routing branches: a reusable procedure belongs to skill authoring; a standing behavior belongs in rules/root instructions; project identity/resources in `project.md`; responsibility in `SOUL.md`; an enabled Guide owns useful system explanations; external documentation stays with outside sources; real lasting decisions/fixes may qualify as memory. An unavailable destination is named, never silently replaced with memory. Tool logs, trivial details, source copies, credentials, and task scratch do not become memory.

**Result / failure:** relevant changes use their own authority and workflow; semantic ambiguities produce a focused question. No candidate means quiet completion. A checkpoint failure is not “review complete.” Temporary acknowledgment state lives outside project knowledge and is not an audit of conversation meaning.

**Review:** settle the conversation-review handshake here, including timing, completion acknowledgment, and bounded retries. Also review at-use delivery of routing guidance. Source: §§6.3, 6.4 Stop, 13.2, 13.20; PRD R9, R11–R12, R17–R18, R29–R30.

## 6. Propose a lasting lesson and keep unanswered decisions

The pilot uncovers a meaningful failure. Investigation with Mike establishes its cause and fix, which future sessions would otherwise repeat.

**Trigger / files:** `knowledge-save` reads the manual, `memory-selection-feedback.md`, relevant topic/source files, and inbox. It checks whether the lesson already exists, belongs in a skill, or qualifies as a lasting memory. Ordinary autonomous tool fixes are excluded; the PRD's significant-fix exception is considered by the agent.

For new permission, show destination headings and uniquely numbered cards with Change, Summary or Affected knowledge, and Your decision. Keep the headline scannable, include provenance and the approved meaning, and settle uncertainty before requesting approval. Exact card-label differences in the older walkthrough remain a review choice.

The same reply creates a stable entry in `knowledge/memory-inbox.md` with the exact card, operation/destination, harness/conversation reference, source/date, update time, state, and next step. Separate approval provenance from proposal source. Promptly publish shared state; the precise batching boundary must satisfy cross-session recovery.

**Branches:** yes uses that permission once; correction changes the approved meaning; rejection removes the proposal and records only the reason actually given; silence leaves awaiting approval. Asking to see full text is not approval. Unchanged pending cards are not re-proposed. With project memory approval off, the agent follows standing permission for memory operations, while PRD permissions remain separate. Its provenance must not falsely attribute a fresh personal approval; exact metadata remains open.

**Review:** approve cards, inbox persistence, feedback, and standing-permission provenance. Source: §§6.1 inbox/feedback, 6.3 knowledge-save, 13.4, 13.17.

## 7. Save, check, and publish the approved meaning

**Mike:** approves the lesson. The agent opens the existing topic and merges the meaning coherently instead of appending a session log or creating a file per fact.

**Components:** `knowledge-save` guides a pre-write review of meaning, authority, destination, and source. `tools/session-marker.mjs` currently records skill invocation. `knowledge-write-guard.mjs` on `PreToolUse` can check covered write tools and reject helper writes; it cannot verify semantic approval or cover every shell write. `knowledge-after-write.mjs` on `PostToolUse` runs `tools/check-knowledge.mjs` and `tools/build-knowledge-index.mjs`; they share `tools/frontmatter.mjs`. `.githooks/pre-commit` provides staged-file checking where installed.

The proposed memory file requires summary, group, type, status, source, context, confidence, created/updated dates, tags, approved_by, and approval_date. Add optional fields only when justified. Body wording states the reusable truth clearly, labels inference, preserves provenance, and uses an exact quote only when authorized. Splitting a large topic into a folder requires a coherent approved plan.

**Agent / checks:** the agent reads back the result and assesses whether it preserves the approved meaning. Tools check fields, values, links, known secret patterns, and approved size rules; passing does not prove truth or absence of all secrets. Generated indexes group/sort deterministically, copy the short summary, expose relevant non-current status, and omit the glossary. No manual index editing.

Authorized publication follows the owning project's Git workflow. In this toolkit, Mike has explicitly authorized direct-main document saves; this does not authorize unrelated implementation. Verify publication before saying another session can use it. Only then remove a completed inbox entry.

**Failure:** denied write, invalid metadata, conflict, failed commit, or failed push leaves a specific `approved, save unfinished` or `blocked by conflict` entry. Repair within existing permission; ask only if meaning or authority changes. Hook timeout, shell bypass, and `--no-verify` are named limitations.

**Review:** approve completion acknowledgment versus entry marker, practical checks, publication batching, and the effect of pre-commit on owner edits. Source: §§6.3–6.6, 13.3–13.4, 13.18.

## 8. Continue after interruption, with another session active

The push failed. Two days later Mike opens Harbor on another machine: “Continue where we stopped.” Meanwhile another session is working on notifications.

**Trigger / reads:** startup hooks deliver current work and inbox states. The agent opens the active item's detailed record and relevant pending entry. Working memory contains project goal, separate active items with goal/status/recent progress/next step/blocker/to-dos/detail link, and general to-dos. It is not a transcript or authoritative tracker.

An approved unfinished save resumes from existing approval after checking whether the destination already contains it. An unanswered proposal remains unanswered. A local-only entry cannot appear on another machine until shared; the report must name that limitation instead of promising recovery of unwritten/unpublished state.

Before editing shared current/inbox content, reread it. Covered whole-file writes are denied; exact-match edits fail on changed text, prompting reread. Across worktrees, fetch/reconcile default-branch changes before publication, preserving both active items. This is not a global lock and cannot prevent every shell overwrite.

**Review:** approve recovery, sharing cadence, and concurrent updates. Test separate worktrees and a second machine, not just two edits in one checkout. Source: §§5, 6.1 shared context/inbox, 6.4 write guard, 10.

## 9. Clean up without discarding history

**Mike:** “Review our saved knowledge; some recovery details changed.”

**Trigger / files:** `knowledge-review/SKILL.md` reads memory topics and PRDs, identifies duplication/conflicts/retirement candidates, and routes proposed writes through `knowledge-save`. A compatible addition updates the maintained topic. A replacement supersedes old meaning with dated context and links; obsolete but useful history is retired. Delete only under the PRD's narrow criteria and approval, repairing references. Age alone proves nothing.

The owner also hand-edits a topic. Preserve that meaning; fix clear mechanical problems and rebuild indexes. Ask before guessing how to repair an ambiguous semantic conflict. Consolidate actual memory-selection feedback without inventing rejection reasons or exporting it to other projects.

**Handshake / failure:** a completed scan reports findings, not automatic permission to alter meaning. Broken links/invalid shapes produce objective findings; the agent judges the remedy. No findings need no approval card.

**Review:** approve topic upkeep, history, hand-edit handling, and feedback cleanup. Source: §§6.1, 6.3 knowledge-review, 6.5; PRD R1, R14–R15, R21–R23.

## 10. Hand off or compact the conversation

**Mike:** “Save where we are; I'll continue in Codex.”

The existing handoff workflow invokes `knowledge-save`, updates the tracker/current context, publishes pending state, and records the next step. It does not invent a second work tracker. Next-session restoration uses the two startup hooks and source links.

The draft `compact-hold.mjs` proposes a `PreCompact` hold for manual Claude compaction. It does not protect automatic compaction, and the draft records no Codex blocking equivalent. Both claims require runtime verification. A pre-compaction stop alone cannot make an agent review unless control returns to it; test that path and user-visible message. `/clear` confirmation semantics remain open. Abrupt termination cannot promise an unperformed final save.

**Recommendation / review:** make explicit handoff reliable through completed review and durable publication. Treat harness-specific compaction handling as an additional verified safeguard; name any remaining gap. Determine whether the gap meets R25 rather than silently lowering that requirement. Source: §§6.4 compact, 8, 13.13, 13.21.

## 11. Deliver account access and update affected requirements

Implementation occurs only after its own authorization. Before a PR, the proposed `save-moment-gate.mjs` watches covered `PreToolUse` commands such as PR creation, item close, and `work finish`, using `hooks/command-parsing.mjs` for shell forms. It requests review if the recorded marker is missing/outdated. Browser actions and unrecognized commands are gaps; a timestamp cannot judge whether the review was adequate.

The agent reviews the actual work and discussion through `knowledge-save`. The existing work workflow owns PR, delivery, and status. After the authorized work ships, PRD upkeep updates all affected child/parent requirements to reflect the delivered agreed behavior without another memory card. It preserves held requirements and names unexpected defects. Guide changes use the enabled Guide workflow; procedures use skill authoring, which is still a missing dependency in this design.

The draft does not gate merge; it proposes an inbox reminder for upkeep owed afterward. We must define the delivery event that triggers upkeep and decide whether an unfinished knowledge save leaves `Done` available. An acknowledgment is neither delivery approval nor permission to mark Done.

**Review:** settle “ships,” completion with failed saves, parent/component ownership, and missing skill-authoring delivery. Source: §§6.4 gate, 9.6, 13.7–13.8, 13.15; PRD R9, R16–R18, R30.

## 12. Upgrade an older project and prove the whole experience

**Mike:** “Bring my older project up to this version.”

`project-sync` delegates to `knowledge-setup`, which previews the actual migration against existing content and obtains any required approval. Proposed moves include current context under `knowledge/memory/`, topic files under `memory-entries/`, `spec-index.md` to `prd-index.md`, feedback rename, and brainstorms to the root. It adds inbox/glossary and missing known metadata, repairs links, replaces copied runtime components with plugin delivery, rebuilds indexes, and checks the result. Preserve unrelated edits, existing permissions, hooks, and recoverable history. Do not manufacture unknown metadata or shorten approved meaning without authority.

Recommendation: first migrate this toolkit after approval, then separately authorize another project's migration. A version report includes completed checks and gaps. An unavailable optional component remains off. Rollback must account for file moves and saved meaning, not merely downgrade the plugin.

Before claiming delivery, refresh official harness documentation and run realistic sessions for startup, relevant/irrelevant retrieval, conversation-only review, each approval branch, failed push, parallel worktrees, compaction, owner edits, and post-ship upkeep in both requested harnesses. Verify actual agent behavior and owner experience separately from mechanical unit checks. Codex registration/trust, Windows execution, patch tool coverage, memory setting scope, Stop-loop prevention, and context delivery are explicit proof items.

**Review:** settle migration permission, layout/summary changes, optional dependencies, Codex acceptance, and what remaining evidence is required. Then reconcile every accepted step into the PRD/design, resolve wording/template changes, and ask for full approvals separately. Source: §§8–12, 15.

## Requirement coverage

Coverage means a scenario to review and later test, not proof that a requirement is met.

| PRD requirement | Scenario and branch |
| --- | --- |
| 1 Plain files and owner control | 1 storage/delivery; 9 owner edits; 12 reversible migration |
| 2 Startup and reusable guidance | 1–2 setup/ordered delivery; 10 restored context |
| 3 Reliable outcomes and failures | 2 missing startup; 7 failed save; 8 conflict; 12 behavioral proof |
| 4 Resume current work | 8 two-day/second-machine continuation; 10 handoff |
| 5 Relevant memory lookup | 3 relevant question, already-read reuse, unrelated arithmetic |
| 6 Sources with findings | 3 direct source, historical date, inference/conflict |
| 7 Glossary | 2 bounded preview; 3 ambiguity; 5 sourced vocabulary entry |
| 8 External knowledge index | 1 destination; 3 captured source and freshness; 7 generation |
| 9 Save moments | 4 interview; 5 discussion/explicit; 10 handoff; 11 PR/completion |
| 10 Permission paths | 4 authorized interview; 6 yes/no/silence/off; 7 recovery; 11 upkeep |
| 11 Lasting-memory eligibility | 6 real significant failure and exclusion checks |
| 12 Exclusions | 5 route non-memory first; 6 trivial fixes; 7 secret check limits |
| 13 Working memory | 1 title/shape; 4 tracker pointer; 8 multiple items and reread |
| 14 Memory shape | 7 topic fields, optional fields, approved split; 9 lifecycle |
| 15 Clear saved wording | 6 scannable card; 7 approved meaning/provenance/read-back |
| 16 PRD lifecycle | 4 structure/approval; 11 all affected parents/children after shipping |
| 17 Procedures | 5 skill routing; 11 missing authoring workflow dependency |
| 18 Destinations and scope | 5 all routing branches; 11 owning workflows and Guide state |
| 19 Find order | 3 ordered retrieval and stop condition; 8–10 restoration |
| 20 Proposal format | 6 grouped cards/unique numbers/uncertainty and exact inbox copy |
| 21 Indexes and checks | 7 fields/links/staged checks; 9 repair; 12 limits reconciliation |
| 22 Cleanup | 9 update/supersede/retire/delete/links/history/age |
| 23 Selection feedback | 6 actual decision reasons; 9 project-local consolidation |
| 24 Ordinary language | 1 setup; 3 find; 6 save; 9 review; 10 handoff; 12 upgrade |
| 25 Both harnesses | 1 scoped activation; 3 unavailable history; 10 compaction gap; 12 proof |
| 26 Supported mechanisms, scoped context | 2 budgets; 3 just-in-time docs; 12 official refresh |
| 27 Complete installation and updates | 1 version/delivery/conflict; 12 migration/other projects |
| 28 Durable pending work | 6 inbox fields/states; 7 failure; 8 resumption and conflicts |
| 29 Native reasoning, small safeguards | 5 checkpoint; 7 objective checks/marker limits; 8 state limits |
| 30 Owning workflows | 4 requirements/tracker; 5 cross-scope return; 10 handoff; 11 upkeep |

## Remaining design questions in context

The numbered questions belong to consolidated design §15. Question 1 is already answered. Review the others at their scenario step; do not reopen settled decisions just because the earlier list is stale.

| Scenario step | Design questions |
| --- | --- |
| 1–2 Setup/startup | 6 glossary location; 13–15 print budgets; 24 routing delivery; 25 clear; 26 extra limits |
| 4 Requirements interview | 9 PRD metadata; 11 approval fields; 27 save batching |
| 5 Conversation review | 2 replacement handshake; 24 routing delivery |
| 6–7 Propose/save | 3 publishing cadence; 4 standing permission provenance; 10 card labels; 16 owner pre-commit |
| 10 Handoff | 8 Codex acceptance; 25 clear |
| 11 Delivery | 7 shipping event; 17 skill authoring; 18 failed save and Done; 23 parent upkeep |
| 12 Migration/final reconciliation | 5 approved walkthrough edits; 12 punctuation; 19–22 migration/layout; 26 limits; remaining template adoption choice |

Cross-cutting issues found in this reading: reconcile the skill-entry marker with the requested completion handshake; distinguish fail-open/bypass limitations from guarantees; make same-reply inbox capture and cross-machine publication cadence consistent; do not apply new size limits before resolving the PRD conflict; verify project-scoped Codex settings and hook ordering; retain source-workflow ownership and explicit delivery approvals. These are review/build gaps, not completed fixes.

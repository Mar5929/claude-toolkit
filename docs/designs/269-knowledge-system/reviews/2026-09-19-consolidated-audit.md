# Knowledge System: requirements, architecture, and scenario review

Reviewed 2026-09-19. Requested by Mike during the Knowledge System manual
walkthrough. Three GPT-5.6 Sol agents independently read the complete PRD and
solution design. The coordinating agent challenged their findings and checked
the recommendations against recorded approvals. This report is review evidence;
it does not change requirements, approve the full design, or activate runtime.

## Recommendation

Keep the current direction: project Markdown and Git, one owner for each kind
of information, a core manual with task instructions loaded when needed, agent
judgment, and checks of observable results. The review found no reason to adopt
a memory service, a separate extraction model, or a hidden database.

Before approving the complete design, tighten save recovery, mixed-topic
evidence, and host-specific delivery. Evaluate whether the selected reminder
and acknowledgment arrangement improves the actual outcomes. Vendor guidance
supports focused instructions and outcome-based evaluation; it does not prove
that this toolkit's exact arrangement works.

Several initial recommendations added more machinery than the evidence
justified. The review discussion removed demands for another instruction
manifest, fixed trial counts, and distributed exactly-once saving. It also
corrected an attempt to reopen an already-approved automatic-save permission.

## Scope and evidence

The reviewers inspected the full [Knowledge System PRD](../../../../knowledge/prds/toolkit-operating-system/knowledge-system.md),
[master design](../../269-knowledge-system.md), relevant Toolkit OS requirements,
instruction audit, existing four-provider research, and the inactive core-manual
draft. Their initial baseline was main `c43a4fe` and manual branch `414d524`.
Main `e026e09` subsequently recorded acceptance of the pending-save experience;
it did not change the recovery mechanism under review.

- [Requirements and scenarios](2026-09-19-requirements-scenarios.md): nine initial findings, eleven scenarios, R1–R30 coverage.
- [Host compatibility](2026-09-19-host-compatibility.md): seven findings, nine scenarios, host/document coverage.
- [Architecture and instruction quality](2026-09-19-architecture-antipatterns.md): eleven findings, twelve scenarios, R1–R30 coverage.
- [Requirements reassessment](2026-09-19-requirements-reassessment.md): revised severity, minimum recovery contract, approved permission scope.
- [Architecture reassessment](2026-09-19-architecture-reassessment.md): existing audit reuse, proportionate evaluation, realistic Git recovery.

These are logical scenario walkthroughs and static source reviews, not executed
Knowledge System acceptance tests. Local CLI versions and feature listings are
observations of that installation, not proof of the desktop application's
effective runtime or of correct agent behavior.

Firecrawl was attempted: its command was absent from PATH and the documented
`npx` fallback was unauthenticated. Reviewers used captured official documents,
local runtime/source inspection, and live web access to primary sources. The
reports disclose that limitation. No credentials or installation were changed.

## Findings after discussion

Severity describes consequence if the gap survives implementation. It does
not mean an unbuilt system already caused the hypothetical failure.

| Priority | Finding and concrete consequence | Smallest recommended next step | Authority |
| --- | --- | --- | --- |
| High | Two save attempts can race or retry after a push succeeded but its result was lost. Git history safety alone does not identify the approved effect. | Use the inbox's existing stable reference in execution and publication evidence. Persist authority where the helper can read it before mutation. On retry, inspect destination and remote evidence before applying anything. Treat changed meaning as a conflict. | Technical design/proof refinement; no new ledger or exactly-once promise. Requirements F1/F2; architecture F10. |
| High | A local pending entry is unavailable to another computer until shared. Failure reporting is present, but reconnect behavior needs a concrete acceptance case. | Test local-only, verified-shared, and conflict-blocked cases, including offline work followed by conflicting remote changes. Preserve evidence and existing authority; report the actual recovery limit. | Existing R28 outcome; any change to permitted offline work needs a product decision. Requirements F6. |
| High | One topic can contain observed facts, reported decisions, inferred explanations, and useful history. File-level metadata can make a narrow source or approval appear to cover everything. | Preserve source, confidence, current/historical state, and permission distinctions beside material content where they differ. Demonstrate this using an ordinary topic file before adding schema. | Clarify evidence and approval scope; new required schema fields need review. Requirements F3; architecture F6. |
| High | A compact exclusion list can be read as a reason to discard useful research, requirements, or rejected alternatives. | Lead with finding the proper owner. Keep the memory eligibility test and substantive exclusions; show examples that go to design, PRD, research, skills, or tracker. Test missed useful information as well as pollution. | Wording alignment with R18. Broadening R11 owner participation is a separate product proposal. Requirements F9; architecture F8/F11. |
| High | A background save helper can lack permission, tools, credentials, or a way to ask the user when publishing fails. | Define and test the executor, checkout, tools, permission behavior, late-result/cancellation handling, and foreground fallback for each supported host/surface. | Complete the existing host-proof/design task; not a mandate for a particular framework. Host H1. |
| High | Native host memory can create a competing machine-local record outside the toolkit's approval and sharing model. | Give effective native-memory inspection and handling an implementation owner and acceptance fixture. Report conflicts; preserve existing data and user settings until the agreed policy authorizes changes. | Setup policy remains a decision; no silent disabling, import, or deletion. Host H2. |
| High | Existing host evidence names versions older than the installed CLI observations and current hook documentation. | Refresh the dated capability matrix, keeping documented support, CLI observation, desktop observation, and tested behavior separate. Define accepted, degraded, and unsupported operation before release. | Existing D1 host evidence work. Host H3/M1. |
| Medium | Root completion and helper completion can be confused; trust or instruction budgets can suppress initial guidance. | Add root/helper identity fixtures, out-of-order helper completion, first untrusted launch, and instruction-budget/truncated-output cases. | Adapter/setup design refinement. Host M2/M3. |
| High for reliability claims | A passing walkthrough or receipt cannot establish dependable behavior. | Compare the approved baseline with simpler experimental variants; score actual retrieval, routing, authorization, final records, recovery, task quality, and interruption cost over repeated trials. | Evaluation work. Any adoption that changes approved requirements returns to Mike. Architecture F1/F4/F9. |
| Medium | Related policy appears across several instruction surfaces and can drift. | Extend the existing implementation-plan audit with concrete obligation owners, affected surfaces, scenarios, and reconciliation status. | Technical traceability, not a new mandatory manifest. Architecture F3. |

The broad reviews also raised current-work duplication/size pressure and
conversation-reference usefulness. These are scoped review questions, not
authority to replace the selected current-work format, remove mandatory
provenance, or invent a retention policy. The existing post-delivery design
retention conflict remains open in the Toolkit OS PRD.

## What the reviewers changed after challenge

| Initial recommendation | Challenge | Final disposition |
| --- | --- | --- |
| Inbox gaps are Critical and suggest a state machine or per-operation files. | Existing R28 already has stable references, states, authority, and retry checks. Missing mechanics do not demonstrate a broken Markdown architecture. | High-priority acceptance/detail gap. Keep the single inbox; specify same-reference retry and conflict outcomes. A different file layout is not selected. |
| Publish a separate remote approval record before every mutation. | Local helpers can use a durable local record; remote visibility is a separate claim. Mandatory extra commits add latency without solving offline loss. | Record authority before handing it to an executor. Publish coherent destination/inbox/index changes together when appropriate. Only verified sharing establishes cross-computer availability. |
| Automatic lifecycle permission needs a second destructive-operation setting. | R10 explicitly includes lifecycle operations and Mike already settled its scope. | Advisory acceptance example only. Preserve the approved setting and demonstrate its consequences; no new approval request or setting is imposed. |
| Create an instruction manifest. | The implementation plan already has an R1–R30 instruction ownership audit. | Deepen the existing audit instead of duplicating it. |
| Require five or twenty trials as a universal gate. | Counts were reviewer suggestions, not a cited standard or statistically justified threshold. | Choose sampling from pilot variance and risk, declare thresholds before comparing variants, and report uncertainty. |
| Use an atomic cross-machine claim or exactly-once saving. | Files and Git do not provide that distributed guarantee; more infrastructure conflicts with the desired simplicity. | Idempotent content/recovery where feasible, operation evidence, normal push rejection, and explicit unresolved conflicts. |
| Remove visible per-message acknowledgment as the default. | The acknowledgment is an approved behavior; its usefulness is an empirical question. | Retain it as the baseline. Compare alternatives experimentally; changing it requires a product decision. |

## Scenarios to turn into runnable acceptance cases

The full reports preserve 32 walkthroughs, with overlap. This is the smaller
combined set recommended for implementation planning:

1. **Fresh session:** receive the required guidance, open the actual records,
   locate unfinished work, and avoid claiming a missing/truncated manual was read.
2. **Mixed conversation:** one turn contains a project lesson, requirement,
   architecture tradeoff, to-do, and vendor quotation. Each reaches its owner
   under the right authority; useful non-memory information is not lost.
3. **Complex topic update:** change one claim without making its source,
   verification, or approval appear to cover unrelated content. Preserve useful
   detail and clearly identify what is current.
4. **Interrupted save:** stop before edit, after edit, after commit, during push,
   and after a successful push before the result returns. Recovery checks the
   actual result before retrying and never invents permission.
5. **Parallel publication:** two sessions save different operations, then the
   same operation, from the same base. Preserve independent work; reconcile
   semantic conflicts; rejected publication remains unfinished.
6. **Offline computer:** resume elsewhere before the first machine shares its
   work, then reconnect. Report what could not be known and reconcile the records
   without treating stale state as a new instruction.
7. **Long voice interview:** ordinary turns remain useful and understandable;
   measure acknowledgments, needless proposals, missed useful updates, cost,
   and recovery after compaction.
8. **Helper constraints:** publication requires an interaction unavailable to
   the helper. Recover through the selected foreground path without blocking
   unrelated conversation or reporting a false save.
9. **Host setup edge cases:** untrusted launch, native-memory conflict, older
   versions, instruction budgets, and root/helper events produce truthful setup
   and support reports.
10. **External-source instructions:** a captured page contains an instruction
    to bypass approval. Use its factual evidence while preserving project
    authority; the page cannot grant permission.

Use final file/Git state for objective checks and independent review for meaning,
with sample human review. Keep model, host, configuration, scenario, and evidence
versions visible. A record that says “reviewed” is evidence of a receipt, not of
correct classification. Do not claim measured gains until the trials run.

## Research interpretation

[Anthropic's context guidance](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
supports careful use of context and task-specific detail. Its
[agent evaluation guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
distinguishes declared success from the actual outcome and recommends repeated
trials and multiple kinds of grading. These are useful practices, not proof
that a shorter reminder is better here.

[OpenAI's harness engineering account](https://openai.com/index/harness-engineering/)
supports keeping repository information discoverable and results inspectable.
Current [Codex hooks documentation](https://developers.openai.com/codex/hooks)
and [Claude Code hooks documentation](https://code.claude.com/docs/en/hooks)
inform the mechanism review; actual supported behavior still needs host tests.

[Lost in the Middle](https://arxiv.org/abs/2307.03172) and
[Measuring and Controlling Instruction (In)Stability in Language Model Dialogs](https://arxiv.org/abs/2402.10962)
motivate long-context and conversation tests. They study different tasks and
older model settings, so their results do not establish failure rates for this
toolkit or current models. The latter paper is by Li and colleagues, submitted
2024-02-13 and revised 2024-07-25; its attribution/date were corrected during
the coordinating review.

The prior Hindsight, claude-mem, Supermemory, and Mem0 reports remain comparative
implementation evidence. Their use of separate extraction prompts explains how
other systems place instructions near an operation. It does not approve their
storage, automatic-save consent, or extraction architecture for this project.

## Next work and approval boundary

The separate manual-content reviewer and coordinating agent are reviewing exact
core wording against R1–R30 and these findings. Their change record will identify
what was retained, clarified, deferred to task instructions, or left for a product
decision. Keep the draft isolated until the instruction package and runtime are
ready for the agreed approval route.

Next design work is to reconcile the minimum save/host contracts and evaluation
cases in the existing implementation plan, then obtain the remaining approvals.
None of the broad reviewer reports is a new policy source or an instruction to
change runtime. Proposed changes to owner participation, acknowledgments,
automatic-save scope, core startup reads, or retention remain proposals.

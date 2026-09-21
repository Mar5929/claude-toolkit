# Knowledge System implementation plan

Updated: 2026-09-21. Execution plan for issue #269. Reviewed packages in PRs
#370, #372, #371 and #373 are merged. PR #374 delivery and authorized target
sync remain pending; design, product decisions and acceptance work stay open.
This document does not supply missing approvals.

## Claude team continuation, 2026-09-21

This is a checked continuation of the existing work, not a new requirements
approval or a second tracker. GitHub issues own live status. Recheck them and
Git before writing. Earlier dated assessments below remain historical evidence.

### Goal and first action

Help Mike turn requests into checked, resumable results through the Knowledge
System and Toolkit Operating System. Finish the authorized delivery and adoption,
then reconcile remaining PRD/design gaps without treating proposed requirements
as approved. The [Knowledge PRD](../../../knowledge/prds/toolkit-operating-system/knowledge-system.md),
[Toolkit OS PRD](../../../knowledge/prds/toolkit-operating-system/toolkit-operating-system.md),
[#269](https://github.com/Mar5929/claude-toolkit/issues/269) and
[#369](https://github.com/Mar5929/claude-toolkit/issues/369) own that scope.

First, read the root instructions completely, fetch without changing another
session's checkout, inspect all worktrees and confirm PR #374's remote head.
Then establish one Claude main coordinator and separate responsible teams using
capabilities actually available in Claude. Do not assume Codex task IDs or tools
are callable from Claude. Retain the responsibilities below even if Claude's
supported mechanism is teammates or delegated agents instead of separate chats.
No need to restart completed reviews or rebuild merged packages.

### Previous team setup and Claude equivalents

Mike requested one main orchestrator with distinct implementation teams. The
Codex main task assigned bounded work, sent follow-up messages to task leads,
read their findings, reconciled conflicting edits, coordinated release versions,
owned merges and tracker updates, and released sync only after source readiness.
Each implementation lead could coordinate its own developers. An independent
review lead coordinated two reviewers and returned findings to the main and
implementation leads. The main retained responsibility for readiness and reported
to Mike. Separate task histories were useful evidence, not the project authority.

| Role / original task ID | Responsibility and continuation |
| --- | --- |
| Main coordinator `01a0bf79-ee0e-7a83-86df-251957d7f5e8` | Own overall requirements/gap reconciliation, GitHub status, assignments, cross-team conflicts, release integration, conditional merge readiness and sync release. Keep Mike informed. |
| Knowledge implementation `01a0bf95-4a8d-7ed0-8c89-63b769daac35` | Own Knowledge runtime, hooks, tools, skills/templates and tests. Continue existing PR #374; do not redo merged #370/#372/#373. Coordinate the one project-sync delegation sentence with the OS owner. |
| Toolkit OS implementation `01a0bf95-7def-7001-9a21-01942d7e3faa` | Own non-Knowledge Toolkit requirements/gaps and bounded setup/Guide work in #369. PR #371 source correction is merged; verify adoption during sync, then assess remaining parent/child PRD gaps. This team is not complete merely because #371 merged. |
| Independent review `01a0c087-197e-7873-913f-1d83c090e4e1` | Originally GPT-6 Astra lead with exactly two GPT-5.6 Sol reviewers. Compare scope against PRD, design and latest decisions; review correctness and unnecessary complexity. Next review the new Windows delta and integrated #374 head, not a broad repetition of completed trials. Return exact head, findings, tests inspected and limits. |
| Project/laptop sync `01a0c041-8f6f-7dc2-b867-91c2dff10b42` | Originally GPT-5.6 Sol. Audit is prepared; execution has not occurred. Wait for coordinator's verified merged-source SHA and exclusive primary-checkout mutation reservation. Apply project-sync and machine-sync, validate actual activation, preserve records. |

Knowledge and OS leads used Sol developers. Mike wanted economical Codex models,
with the smartest model reserved for genuinely complex intellectual work. Claude
models are a separate host concern: the current repository rule
`.claude/rules/subagents-run-on-opus.md` and settings require Opus for Claude
helpers. Do not invent Claude equivalents named Sol/Astra or silently alter the
model policy while transferring work. Inspect installed Claude capabilities and
coordinate a comparable arrangement rather than promising identical live chats.

Use one writer per overlapping path. Knowledge owns `plugins/second-brain` and
Knowledge tests; OS owns its setup/Guide corrections. The main serializes shared
release metadata, catalogs, manuals and primary-main documentation saves. Sync
alone changes the actual project/machine installation after release. Reviewers
report findings or work in explicit isolated scopes; they do not compete with
implementation writers. A recorded assignment does not mean an agent is running.

### Claude arrangement chosen, 2026-09-21

Owner source, Claude Code desktop conversation, 2026-09-21: Mike chose Claude
Fable 5.1 as the main orchestrator and Opus 5 for every executor. This matches
`.claude/rules/subagents-run-on-opus.md`; no settings change was made. Mike acts
as product owner. Report to him in plain user-facing language without pull
request or issue numbers, and bring him product decisions only.

Arrangement: separate local Claude Code desktop chats in this project, one per
responsibility. Each chat has its own lead with Opus helper agents. The main
orchestrator chat reads, messages and checks them, and alone updates the
tracker, shared files and merges.

| Chat | Responsibility | Writes |
| --- | --- | --- |
| Knowledge finish | Rerun the full checks on the #374 head, then fix independent-review findings. | Only the existing #374 checkout and branch. |
| Independent review | One lead and exactly two reviewers. Review the Windows delta and the integrated #374 head. | Nothing. Findings return to the main. |
| Toolkit OS gap assessment | Compare shipped behavior with the parent and child Toolkit OS PRDs. | Nothing until a bounded change is authorized. |
| Project and laptop sync | Created only after #374 merges and the main releases the primary checkout. | The project and machine installation. |

Host limits, from the official desktop page read 2026-09-21: each chat starts
from a task button Mike clicks; the main cannot approve another chat's
permission prompts; the main sees the 20 most recent local chats.

Claude Code Projects, announced 2026-09-17 as a gradual Pro and Max beta, was
considered and not used. Its threads run in the cloud, see only GitHub
repositories, cannot install on the laptop, and keep a separate project memory,
which bears on the open native-memory decision. Source:
<https://code.claude.com/docs/en/claude-projects>, read 2026-09-21. The local
capture in `ai-external-knowledge/claude-code/` is dated 2026-09-04 and predates
it. Whether Mike's account has Projects was not checked.

The #374 approval-coverage question below goes to Mike when the review result
is available, so he decides with the findings in hand.

### Source, requirements and decision authority

Read `CLAUDE.md`, its complete required startup chain and relevant folder rules.
Then read #269/#369, this plan's current sections, the Knowledge PRD and its Notes,
[master solution design](../269-knowledge-system.md) and its Notes, and the
[design walkthrough](design-walkthrough.md). The approved requirements walkthrough
is `knowledge/prds/toolkit-operating-system/knowledge-system-walkthrough.html`;
#269 explains precedence of accepted walkthrough answers and later owner
clarifications. Do not restart the completed interview or approve the whole PRD
because scoped implementation was authorized.

For Toolkit OS, open the parent PRD and child `folder-instruction-files.md`,
`guided-delivery.md`, `guided-work-management.md`, `system-guide.md` and
`work-item-upkeep.md` in the same PRD folder. #369 owns the bounded setup scope.
#337 owns guided-work acceptance; #360 owns the instruction audit. The existing
`docs/designs/306-toolkit-manual-review.md` owns manual delivery evidence. Closed
#304/#306 do not independently prove full Guide/manual acceptance. Use each
record's Notes and actual implementation to identify stale PRD statements,
missing behavior, missing evidence and product decisions separately. Proposed
parent PRDs remain proposed; do not bulk finalize them.

The earlier Claude Projects comparison is already saved in
`knowledge/memory/memory-entries/claude-projects-research.md` and
`docs/designs/269-knowledge-system/research/2026-09-20-claude-projects-redesign.md`.
That research task was completed and archived; it is context for the Toolkit OS
team, not an unfinished implementation assignment. Preserve current-work's
other items (#337, #360, #358 and instruction-overload evaluation) when resuming;
this release does not close them.

The [review index](README.md#current-implementation-planning) links the complete
R1–R30 source/evidence matrix and individual reports. D3 stale-knowledge handling,
full requirements/design acceptance, native-memory conflicts, current-work
size/retention choices and broader host/acceptance proof remain with their owning
records. #367 was test preparation, not completion of the Knowledge System.

### Exact delivery checkpoint

Verified remote implementation history before this handoff:

| PR | State / commit | Meaning |
| --- | --- | --- |
| #368 | Merged `2fdb94ef30fba0aaec2b2f2997ea562f8cf49ac9` | Codex model choice; Claude Opus configuration preserved. |
| #370 | Merged `b3b8feceeab0832da4e48c9bea45fd6ab0f8c50e` | Feedback/citation corrections; second-brain 4.12.1. |
| #372 | Merged `999bfcb4898bffbd7449e6b09fc98ffbf0d65c53` | Behavior runner replacement for #367. |
| #371 | Merged `283258a730ec90c51f63a646a496c32430661d9a` | OS setup contracts and read-only Guide drift regression; project-init 0.77.1. |
| #373 | Merged `b20135314e37e3974e2390e638de0eb4f14915f5` | Native Stop turn correlation; second-brain 4.12.2. |
| #367 | Closed, superseded by #372 | Historical head `59145272872af43d848ff5df205e9154bf94da77` retained. Do not merge it. |
| #374 | Open draft, head `0d082a681293fa6dc5e4087bb63fda91e2925eba` | Action checkpoint/delivery package; final review and merge pending. |

Primary checkout: `/Users/michaelrihm/Documents/Projects/claude-toolkit`, branch
`main`, remote `https://github.com/Mar5929/claude-toolkit`. Before this documentation
save, main was `f9b2dd8fc5b7c9a6d0ed0ec864f730b42c8045cc`; fetch for the later
handoff publication commit. Documentation belongs directly on main under the
existing publication rule; implementation stays in its reviewed PR branch.

PR #374 checkout:
`/Users/michaelrihm/.codex/worktrees/knowledge-action-checkpoint/claude-toolkit`,
branch `codex/knowledge-action-checkpoint`, base main. It already includes the
prior main documentation integration at `c966d681e042dfb7269a2946b577227d417b7138`.
The interruption left three unstaged edits. Main recovered and pushed only
`.codex/hooks.json`,
`plugins/second-brain/skills/knowledge-setup/references/delivery.md`, and
`tests/knowledge-startup-check.mjs` as `0d082a6`. No merge was performed.

The late P1: Codex launches Windows hook commands through cmd.exe; the two new
handlers contained raw PowerShell syntax. The recovered fix explicitly launches
`powershell.exe -NoProfile -Command`. Review those definitions, guidance and
assertions against `research/r2-codex-capabilities.md`, especially the shell
contract, before accepting the delta. Older unrelated handlers were left alone.
The old independent approval at `c966d681` predates this correction and cannot
approve the new head automatically.

Checks actually rerun for the recovered delta on 2026-09-21: relative links 445,
shipped routes 243, installed-copy checks 27, startup/package checks 13, marketplace
plugin validation and whitespace check all passed. These are source/configuration
checks on macOS, not native Windows proof. The earlier 86 Node cases and earlier
independent reviews remain dated evidence, not a claimed rerun of this head.
Prepared #374 versions: second-brain 4.12.3, project-init 0.77.2, marketplace
0.124.4; recheck integrated values and shared files before merging.

### Preserved local worktrees and historical refs

The original Knowledge and OS task working directories are detached, clean
snapshots at `fe043871`: `/Users/michaelrihm/.codex/worktrees/6fc4/claude-toolkit`
and `/Users/michaelrihm/.codex/worktrees/959c/claude-toolkit`. They are not current
main or the PR #374 source checkout. All four separate task records were
`notLoaded` when inspected on 2026-09-21; Knowledge and sync ended on usage-limit
failures, and review/OS returned earlier exact-head findings.

Two clean local-only branches are preserved:
`codex/knowledge-independent-review` at `f6e9569216ca7b5c5aac9904efde61592d6dcaa1`
in `/Users/michaelrihm/.codex/worktrees/c8c2/claude-toolkit`, and
`codex/knowledge-stop-correlation` at `cbea6d0d6f8cc6f3e9a59cb46dd3f2325c1ab4ed`
in `/Users/michaelrihm/.codex/worktrees/knowledge-stop-correlation/claude-toolkit`.
They retain historical integration/source ancestry; current review reports and
reviewed delivery are already published through main/PR #374. Do not merge or
push these histories wholesale. In particular the Stop source history includes
an earlier capture before identifier redaction; the reviewed published version
is the continuation source. No required product delta is stranded on those refs.
Other unrelated worktrees, including #269 design/manual, #319 voice and
plain-English clarity work, remain untouched. Reinspect before cleanup.

### What #374 implements and what review must preserve

One pending action in the existing locked project/session/agent completion state,
with action identity, nonce and outcome. General review does not release an action;
a matching explicit action review permits one atomic retry. Prompt/action changes
invalidate the previous permit. Stale turn identities cannot mutate current state.
PR identity includes branch and HEAD; close/merge identity preserves ordered
recognized type/item pairs. Two new PreToolUse handlers share matcher `^Bash$`.
Mixed PR-create and close/merge commands receive a split-command denial from both
handlers without consuming an existing permit. Lock contention denies; unexpected
errors retain the documented fail-open behavior, so enforcement is not absolute.
Pending approval or unfinished save does not authorize the dependent action.
Keep this bounded; avoid a second controller, history database or expanding the
shell parser as incidental handoff work.

### Evidence limits that must survive transfer

- `reviews/2026-09-20-independent-requirements-review.md` maps all 30 requirements.
- `reviews/2026-09-20-independent-behavior-review.md`: three citation trials;
  final bounded per-finding pass, not a reliability rate. Earlier failures remain.
- `reviews/2026-09-20-startup-recovery-proof.md`: prompted Codex CLI 0.154/macOS
  root fallback and persisted-session recovery. Not spontaneous startup,
  registered hooks, Desktop, Windows, compact or clear proof.
- `reviews/2026-09-20-native-save-independent-review.md` and
  `reviews/native-save-helper-proof/`: bounded actual Desktop 0.155.0-alpha.9.2
  Sol helper execution while parent continues and simulated lost-result recovery
  using a local bare remote. Not network, cross-machine or shutdown reliability.
- `reviews/2026-09-20-action-checkpoint-independent-review.md` and
  `reviews/2026-09-20-native-action-checkpoint-proof.md`: preserve the unauthorized
  temporary trust-bypass deviation in the CLI fixture. It is controlled evidence,
  not normal project delivery. Never repeat the bypass or change authentication.
- Claude model proof was previously blocked by expired OAuth. Current auth has
  not been reverified; let Mike handle any login, do not alter it automatically.

### Sync team's prepared scope

Read current installed project-sync and machine-sync procedures and re-audit
actual versions. Earlier audit observations may have changed. Execute only after
#374 is reviewed/merged and the main coordinator releases the primary checkout.
Mike authorized this project and laptop, applicable Toolkit functionality,
Toolkit-shipped behavior for in-scope conflicts and no unnecessary migration.
Preserve project records, unrelated settings, authentication and GitHub tracking.

Prepared plan, not independently reconfirmed as exact current execution scope:
the audit proposes refreshing Claude/Codex plugin caches, removing the
project-local Concise override while retaining unrelated skillOverrides and
selecting shipped Plain English, enabling System Guide at `knowledge/system`
with truthful activation checks, and the offline code-only graphify setup with
no model/API spend and existing Git-hook chaining. It also covers the machine
attribution guard, retiring only Toolkit-obsolete knowledge text in global
steer-to-goal and the retired propose-best-solution instruction, replacing the
old plain-language style, retiring only obsolete style-reminder/writing-guard
hooks/scripts while preserving voice/settings, and repairing the obsolete style
route in quiet-while-working. Record actual project/machine sync results.

Schema 2 is already installed; no Knowledge migration is planned. Preserve the
five legacy misc artifacts and unrelated worktrees; no Salesforce kits. Recheck
all exact proposed edits against shipped source before applying. New/changed
Codex hook definitions require Mike's normal `/hooks` review/trust interaction;
never bypass trust, silently grant it, or infer Desktop delivery from CLI tests.

### Authority and completion

Owner source, current conversation: Mike requested separate Knowledge and OS
leads with Sol developers, then an Astra review lead with two Sol reviewers. He
said, "once that's done, you can merge the PRs, I give you my approval", conditional
on the review/fix cycle, confidence and avoiding unnecessary complexity, followed
by project sync; his earlier machine-sync request remains. This is recorded in
#269/#369. It is authority to complete the covered sequence, not evidence it
passed, new product requirements approval or whole-system acceptance.

On 2026-09-21 Mike requested saving/pushing all work and a comparable Claude
orchestrator/team arrangement. This handoff preserves that direction. Do not
resume Codex writers in parallel with Claude. Keep completed task histories
available until continuation is verified; archiving is organizational, not proof
of completion. Unfinished teams must not be labelled complete to archive them.

Approval scope note (not independently confirmed for #374): Mike's quote
approves the discussed review/fix sequence; #269/#369's original entry names
#370–#373. The Codex main interpreted the derived action-checkpoint correction
#374 as within that sequence, but Mike did not separately name #374 in the
quoted approval. Before merging, the receiving coordinator must establish that
the actual #374 scope is covered by the recorded direction; seek clarification
only if that scope remains ambiguous. Do not silently expand the approval.

After focused review and establishing approval scope, main verifies the current
head/checks and safely merges #374, then releases sync. Verify actual target behavior,
update #269/#369 and related PRDs only to reflect authorized delivered meaning,
and preserve remaining product decisions and acceptance work. Other open PRs,
including #343 and #349, are outside this handoff's implementation authority.
Both operating manuals were reviewed for this continuation; no policy change
is needed for saving the handoff itself.

## Authority and execution boundary

- [Knowledge System PRD](../../../knowledge/prds/toolkit-operating-system/knowledge-system.md) owns R1–R30.
- [Master solution design](../269-knowledge-system.md) owns the proposed architecture and decisions.
- [Host capability evidence](host-capability-evidence.md) separates installed observations, official contracts, and H1–H6 proof tasks.
- [Toolkit OS R25](../../../knowledge/prds/toolkit-operating-system/toolkit-operating-system.md#shared-documentation-publication-contract) owns documentation publication.
- [Issue #269](https://github.com/Mar5929/claude-toolkit/issues/269) owns D1 design review, E1 implementation, F1 acceptance, and live task status. The work packages below are task specifications to link from that record, not another tracker.
- [Detailed reference](detailed-solution-design-reference-output.md) preserves prior research. Its old mechanism choices, API claims, and estimates do not authorize implementation.

The owner authorized this design and plan refinement. Record the resulting recommendations for review without fabricating a whole-PRD approval. Begin production changes only when the owning task records the applicable build authorization. Technical facts are resolved through evidence tasks; the owner should not have to choose event names or troubleshoot adapters.

## Current delivery sequence — 2026-09-20

Mike's sequence remains: finish authorized packages, assess what actually
shipped, then complete authorized target sync before broader planning.
[PR #370](https://github.com/Mar5929/claude-toolkit/pull/370) merged at
`b3b8feceeab0832da4e48c9bea45fd6ab0f8c50e`,
[#372](https://github.com/Mar5929/claude-toolkit/pull/372) at
`999bfcb4898bffbd7449e6b09fc98ffbf0d65c53`,
[#371](https://github.com/Mar5929/claude-toolkit/pull/371) at
`283258a730ec90c51f63a646a496c32430661d9a`, and
[#373](https://github.com/Mar5929/claude-toolkit/pull/373) at
`b20135314e37e3974e2390e638de0eb4f14915f5`. PR #367 is closed as
superseded; its branch and worktree remain available as history.

The latest evidence is indexed in the
[working-record README](README.md#current-implementation-planning). It records a
bounded R6 citation pass, prompted Codex CLI R2 startup/recovery pass, bounded
Codex Desktop native save and lost-result recovery pass, and the remaining
action-checkpoint delivery limits. These findings supersede missing-source and
missing-proof conclusions in the initial `dee7f16` assessment where the newer
records say so; they do not erase its observed failures or establish a
reliability rate.

1. Finish PR #374 delivery and verify its final source, configuration and
   version integration under the existing review authority.
2. Sync the authorized toolkit-project and laptop targets. Prefer shipped
   behavior, avoid unnecessary migration, preserve authentication, and obtain
   Mike's normal Codex hook-trust action rather than bypassing trust.
3. Verify actual target activation and fresh behavior, then reconcile remaining
   D3 and product choices and plan broader-host and full acceptance work.

Full requirements/design approval, D3, unresolved product choices, broader host
coverage, agreed rollout and owner acceptance remain open. Main publication
does not prove another project is equipped. The reviewed merges approve neither
the entire Knowledge System nor whole Toolkit OS implementation.

Both operating manuals were reviewed for this status update. The merged package
already includes their dependent guidance; no manual policy change is needed here.

For current delivery state, use the assessment below. The package specifications
and dated audits retain the intended work and earlier evidence; a historical
statement that a file is missing does not override inspected main source.

## Delivered-versus-required assessment, 2026-09-20

**Historical baseline:** this section assessed main `dee7f16`, including merged
#366 `3703c5c`, before the later reviewed packages and evidence above. Preserve
its dated failures and package analysis; use the current delivery sequence and
[latest review index](README.md#current-implementation-planning) for present state.

The coordinator checked
the PRD's R1–R30, master design, delivered procedures/hooks/tools/templates,
installed copies, and the [reviewed trial report](https://github.com/Mar5929/claude-toolkit/blob/59145272872af43d848ff5df205e9154bf94da77/docs/designs/269-knowledge-system/implementation-plan.md#actual-agent-trials--2026-09-20-utc).
This is a source and evidence assessment, not a new independent agent review or
full-system acceptance. Earlier implementation, audit and coordinator tasks were
completed/idle when inspected; their recorded assignments do not imply active work.

**Evidence checked in this assessment:** 67 Node cases passed using
`node --test tests/knowledge-schema.test.mjs plugins/second-brain/tests/*.test.mjs tests/toolkit-startup.test.mjs`.
Installed-copy checks passed (27), startup/package checks passed (12), knowledge
validation passed (19 files), and plugin validation passed. These are current
deterministic results. The six earlier model trials remain dated evidence from
their recorded revisions, not reruns against this main commit. Three used v1
fixtures; three used the corrected v2 candidate. Their hooks were unregistered.
Sandbox-blocked publication/cleanup and the R6 citation miss remain failures or
unfinished steps. A separate successful foreground recovery used a local bare
remote, not another computer. Temporary raw trial files are not durable Git evidence.

#### Delivered instruction and implementation coverage

All paths below are relative to the repository. Canonical instruction owners are:
the managed manual source under `plugins/second-brain/skills/knowledge-setup/references/templates/knowledge/knowledge-manual.md`;
the four skills under `plugins/second-brain/skills/`; hooks under
`plugins/second-brain/hooks/`; and tools under `plugins/second-brain/tools/`.
Installed manual/hooks/tools are present and checked here. Their presence does
not establish installation or behavior in another project.

| Requirement | Delivered source or observed evidence | Remaining outcome and classification |
| --- | --- | --- |
| R1 Plain parts | Markdown/Git records, native-agent procedures and temporary checkpoint state; no new content service. | Manual rename/deletion/ambiguous-repair agent cases remain unverified. Native-memory conflicts need a policy decision. |
| R2 Follow system | Ordered read instructions, complete core manual, root fallback and recovery guidance. Prior Codex CLI full-read/resume evidence exists through the root route. | Complete-read observation and revision/context invalidation are not implemented as a separate verified startup checkpoint. Prompt intent is requested, not checked by the completion module. Native delivery, truncation and context-loss proof remain open. |
| R3 Reliability | Bounded completion handler, explicit review outcomes and affected-work failure guidance. | Late Stop correlation is missing; required-moment and long/parallel-session behavior remains unverified. |
| R4 Continuation | Shared current work, owning-record routes, inbox and handoff workflow; bounded resume trial used the newer owning record. | Fresh sessions on each supported host and real cross-computer continuation remain unverified. |
| R5 Memory first | Manual section 4 and knowledge-find require relevant current sources before broad investigation. | Complete known-fact/irrelevant-request and task-switch behavior matrix remains unverified. |
| R6 Sources | Manual and find skill explicitly require a source on the next line. | Actual mixed-routing trial missed this format. A demonstrated behavior failure, not missing policy text. |
| R7 Vocabulary | Glossary template, direct route and index exclusion implemented. | Known aliases, conflicting meanings and useful-new-term proposal trials remain unverified. |
| R8 Outside docs | Three-index builder, captured-topic fields and freshness/source rules implemented. | Current-source/unavailable-source behavior and capture-date citation trials remain unverified. |
| R9 Saving | Shared save procedure, executor assignment, pending authority, inspector, prompt and completion guidance. | No verified host executor/result-return contract. Native helper execution, required save moments and conversation continuation remain open. Existing one-time action reminders do not check a fresh review outcome. |
| R10 Permission | Scoped authority/card rules, automatic-save grant fields, default approval and schema tests. Mixed-routing trial withheld unauthorized writes. | Partial approval, revocation, lifecycle permission and same-topic concurrent saves need agent trials. No automatic-save grant was enabled here. |
| R11 Eligibility | Manual and selection reference contain significance, owner participation and significant-fix exception. | Significant-episode and false-candidate selection trials remain unverified. |
| R12 Exclusions | Positive routing and exclusions implemented; mixed-routing trial preserved separate owners and withheld writes. | Complete useful-information/noise/secret-like fixture coverage remains unverified; pattern checks cannot prove meaning. |
| R13 Working memory | Multi-item template, schema-2 path/limit, handoff ordering and preservation guidance. Local bounded trials preserved other entries. | Simultaneous writers, all sharing paths and handoff size/retention decisions remain open. |
| R14 Memory shape | Topic template, claim-level evidence guidance, metadata and mixed-topic fixtures. | Fresh-agent narrow updates and approved split/consolidation preservation remain unverified. |
| R15 Writing | Main/helper instructions require plain wording, exact names and meaning preservation. | Independent proposal-and-saved-text behavior checks remain unverified. No keyword check can establish compliance. |
| R16 PRDs | Proposed/finalized semantics, paired approval validation and shipped-upkeep procedure implemented. | Cross-component upkeep, explicit holds, cancelled/undelivered work and failed publication need agent trials. Full PRD approval remains pending. |
| R17 Procedures | Routing locates the actual skill-authoring process and reports its absence. | Portable authoring capability is still an integration dependency; one machine's skill-creator does not prove project delivery. |
| R18 Routing | Manual ownership table, four procedures and design/research distinctions; bounded mixed-routing outcomes passed. | Full destination examples and cross-component partial-authority/setup behavior remain unverified. D3 clarification is proposed only. |
| R19 Find order | Shared lookup procedure, glossary/source rules and history adapter implemented. | Both hosts' available/unavailable project-history cases and stale-source cases remain unverified. |
| R20 Cards | Current card fields, destination headings, unique numbering and exact pending-card instructions implemented. | Silence, correction, partial approval and exact-card continuation need full agent trials. |
| R21 Index/checker | Schema-2 parser/checker, three deterministic indexes, strict 200/5,000 limits and read-only validation; 38 schema cases passed. | Agent handling of invalid saves remains unverified. Feedback template still falsely describes an additional checker limit. |
| R22 Lifecycle | One save procedure covers updates, supersession, retirement, deletion, split and consolidation. | Complete operation-by-operation agent and failure/recovery tests remain unverified. |
| R23 Feedback | Save/review skills read useful feedback; v2 checker removes the old cap. | D2 has an actual remaining contradiction: shipped template and installed feedback still say 8,000 characters; template logs every candidate while installed guidance restricts routine logging. Cleanup and fresh-agent proof remain. |
| R24 Plain requests | Four focused descriptions and six legacy compatibility routes shipped. | All six ordinary-language outcomes and supported-host discovery need behavior verification. |
| R25 Codex | Shared records, root fallback and configured prompt/Stop routes; bounded CLI model trials. | Native hook attribution, desktop, Windows, context recovery and helper parity remain unverified. |
| R26 Documented use | Captured sources and dated host research linked; command-hook implementation present. | Refresh effective runtime/document mapping before adapter changes; CLI version is not desktop or event proof. |
| R27 Activation | Delivery/migration instructions, coherent copied executable fixture and this repository's schema-2 conversion shipped. | Actual fresh-agent install/upgrade, owner-customized projects, version/update/rollback and external targets remain unverified. |
| R28 Inbox | Exact-card/authority format, same-reference inspector and 12 recovery fixtures; one bounded lost-response recovery trial. | Inspector is read-only, not a save executor. Real interrupted/concurrent/cross-computer saves, cancellation and cleanup delivery remain unverified. |
| R29 Judgment | Agent meaning review, narrow file/Git checks and declared outcomes; no semantic classifier. | Startup/prompt receipt contracts and native ordering still need resolution; declaration is not proof of correct review. |
| R30 Integration | Toolkit/Knowledge manuals, handoff, tracker and setup routes shipped; Guide ownership retained. | Full tracked-delivery/question/Guide-on/off scenarios and portable authoring integration remain unverified. |

#### Confirmed defects and incomplete mechanisms

1. **D2 feedback drift:** the source template and this project's feedback file
   still claim an 8,000-character checker cap. Schema-2 checking deliberately has
   no such cap, and knowledge-review says the same. The template's per-candidate
   log also conflicts with its instruction to avoid routine activity. Repair the
   source and reconcile the project copy without erasing sourced owner feedback.
2. **Late completion event:** `completion()` accepts the current session state
   without correlating a native Stop to its originating review generation. A
   disposable reproduction created old then new reviews, submitted the old Stop,
   and observed it block using the new generation; the genuine new Stop then
   declined a further continuation. Explicit old receipt rejection does not fix
   this. This demonstrates the handler weakness, not actual native event reordering.
3. **Startup/intent checks:** the loader requests reads and acknowledgment. There
   is no independent startup-read receipt, content-revision tracking or prompt
   intent checker in the shipped completion state. Decide the smallest justified
   mechanism after native observation tests; do not claim the designed checkpoint
   exists just because the instructions do.
4. **Save-moment integration:** `save-reminder.mjs` still holds once per branch
   and `work-item-close.mjs` once per item/session. They do not consult the new
   review outcome. Reconcile repeated PR/close actions and conversation-only
   decisions through the existing D1-P1/E1-P5 task, with actual supported coverage.
5. **Executor contract:** executor/recovery instructions and Git inspection are
   shipped. Verified native dispatch, permissions, lifetime, cancellation and
   results after parent completion are not supplied by those files. Prefer native
   helpers and the same save procedure; do not infer a need for a new background service.
6. **R6 behavior:** preserve the actual citation-format failure. First retest the
   explicit existing rule with an expectation that checks placement; select a
   targeted correction from evidence without adding a semantic grading engine.

#### PR #367 disposition

At inspected head `59145272872af43d848ff5df205e9154bf94da77`, #367 is open against
`issue-269-knowledge-integration-audit`. Its own final commit adds five paths:
the behavior runner, scenario file, runner README, tests README link and 120 lines
of evidence in this plan. Those optional tooling/evidence additions are not on
main. Earlier schema commits in its ancestry were integrated through #366.

A read-only merge-tree simulation against main reported five conflicting files:
marketplace metadata, both second-brain manifests, this plan and tests/README.md.
GitHub's mergeable status applies to the old base, not main. Recommend applying
only final commit `5914527` to a fresh main-based branch, reconciling the two
documentation files with the current text, then checking and independently
reviewing the resulting change. Preserve the existing PR/head until the replacement
or coordinated update is verified. This assessment changes no branch, base or PR
state and grants no merge approval. Do not import the old dependency commits or
replace the current plan wholesale. Raw `/tmp` evidence remains nonportable;
preserve the reviewed report and its limitations in the delivery.

#### Ordered remaining work

These refine existing task/package IDs. The issue remains the status authority.
Owners below describe roles; a worker is assigned only when actually dispatched.
The coordinator performs technical planning; Mike supplies product decisions,
new scope/merge permissions where needed, rollout targets and acceptance.

| Order / existing task | Owner and dependency | Next deliverable | Acceptance condition |
| --- | --- | --- | --- |
| 1. E1-P8, preserve optional test tooling | Test-tooling agent; depends on this #367 comparison | Main-based five-path change, current fixture preflight, retained trial evidence and independent review. | Only intended remaining delta; source hashes/expectations/meaning review remain separate; relevant checks pass; explicit separate merge decision. |
| 2. D2 / E1-P1/P4/P7 | Instruction agent; scoped correction of delivered inconsistency | Reconcile feedback template, actual project lessons and all consumers; keep supported limits and useful sourced feedback. | No false cap or routine-log conflict in new/upgraded projects; checker and instruction assertions plus fresh-agent feedback cases agree. Implementation scope must be confirmed from the existing package authority before dispatch. |
| 3. D1-P1 / E1-P5 | Host agent; may run alongside 1–2; existing approved behavior only | Effective CLI/desktop capability matrix; minimal startup/intent strategy; reproduce and resolve late Stop and repeated save-moment gaps. | Ordered complete content, missing/truncated/changed guidance, context recovery, distinct intent/outcome, helper isolation and bounded continuation demonstrated per target. Unavailable targets remain open. Do not change expired Claude authentication. |
| 4. D1-P1 / E1-P4 | Save-execution agent; depends on host capability evidence | Native helper assignment and result/recovery contract; implement only demonstrated missing integration under applicable authority. | Main answers independent work while save runs; verify returned result after parent turn, failed push, cancellation, late result, lost response, conflict and two writers. Preserve exact authority and finish once; foreground fallback is separate evidence. |
| 5. D1-P2 / C1, with D3 | Coordinator and Mike; use findings from 2–4 | Reviewable remaining choices and reconciled full PRD/design; proposed D3 wording in design Notes. | Full requirements/design approvals recorded separately; no implicit relaxation for unsupported hosts. Resolve native-memory policy, retention/size conflicts and required target scope before dependent changes. |
| 6. E1-P6/P7 | Integration/setup agent; depends on selected contracts and applicable decisions | Actual new/legacy/customized/partial/Guide-on/off setup and rollback trials; portable authoring route. | Preserve owner records/settings and pending authority; no duplicate registrations; effective version and current guidance verified; setup reports partial support honestly. |
| 7. E1-P8 | Acceptance agent independent of builders; depends on corrected integrated candidate | All R1–R30 Checks mapped to named scenarios, outcomes and evidence on agreed surfaces. | Correct R6 placement, approved/unapproved lifecycle changes, meaningful no-code work, recovered context and concurrent saves. Repeat based on observed variance/risk; declare expectations first. Failures stay failures. |
| 8. F1-P1 | Coordinator and Mike; depends on 7 and target authorization | Concrete result review, authorized rollout, fresh-session target evidence and final record upkeep. | Mike accepts the delivered Knowledge outcome; each agreed target's adoption is verified. Only then close #269; scoped merges never substitute for parent acceptance. |

**Product decisions still open:** full requirements/design acceptance; handling
of competing native memory; post-delivery design/evidence retention; useful
handoffs that cannot fit the current-work limit; D3 wording; and rollout/support
targets. Reminder-shortening and changed consent/acknowledgment behavior remain
unapproved alternatives, not prerequisites unless evidence makes them necessary.
Host event names, runner mechanics and ordinary branch reconciliation are technical
work for agents, not questions Mike must troubleshoot.

**Manual review:** both operating manuals were considered. This assessment changes
no installed policy, so neither needs an assessment-only edit. D2 and any later
adapter/procedure corrections must reconcile their affected guidance in the same
implementation delivery. D3 remains proposed, with no runtime/manual adoption.

## Recommended build baseline

**Architecture review, 2026-09-18:** Mike requested the best architecture rather than the easiest reuse, accepted the review recommendation, and asked to add it to this plan. The direction below replaces this plan's earlier presumption that six skills and copied runtime should remain. It does not approve the full PRD, runtime implementation, or release. The master design now reflects this direction and the subsequent delegated-save and wording requirements. D1-P2 must reconcile remaining host evidence and approval questions; the earlier six-skill baseline is superseded.

Keep the `second-brain` plugin identity and refactor its public capabilities into four skills:

| Skill | Responsibility |
| --- | --- |
| `knowledge-find` | Find relevant sources, resolve conflicts, and cite evidence. Use available session history as a read-only source adapter when needed, retaining project scope, privacy, and historical-source cautions. |
| `knowledge-save` | Own one shared procedure for create, update, supersede, retire, delete, and consolidation: authority, latest-source reads, linked changes, validation, publication, and interrupted-save recovery. |
| `knowledge-review` | Diagnose duplicates, contradictions, lifecycle issues, and feedback-maintenance needs. Hand resulting changes to the shared save procedure instead of maintaining a second writer. |
| `knowledge-setup` | Detect, install, migrate, repair, and verify activation/version, coordinating delivery with project-init and project-sync. |

Approved saves run through a helper while independent conversation continues,
under the updated R9/R28. The main agent finishes proposal and approval work,
then gives explicit operation, destination, approved meaning, source, permission,
check, commit, and push instructions. The helper uses the same save procedure;
the main agent checks its returned evidence before reporting completion. R15’s
ban on jargon and figurative language applies to both proposal and saved text.

Mike approved combining related saves in one commit on 2026-09-18 when they
are ready together. Preserve separate authorized scope and verified results;
never delay a ready save to collect others. Include both together-ready and
one-save-delayed cases in save/publication acceptance checks.

The reason is correctness as well as clarity. Today `remember` publishes approved changes, while `retire` can create a replacement through `remember`, then change the old record under instructions that prohibit publication. `reflect` delegates across both. One logical lifecycle change needs one complete save procedure. Operation-specific references keep that procedure focused; it is not an autonomous content writer or a new reasoning engine. Existing operational-maintenance permissions remain applicable without inventing new approval steps.

Reuse the parser, index builder, checker, history-search code, command parsing, and installation logic where they meet the new contracts. Inventory actual callers before migrating skill names; provide explicit compatibility routes where needed without assuming native alias support or keeping duplicate procedures. Migration effort determines the delivery sequence, not the finished architecture.

**Hook direction approved by Mike, 2026-09-18:** start with ordinary command
hooks and keep shared logic separate from the Claude Code and Codex integrations.
Function hooks/Claude Mods may replace the Claude integration if testing proves
a benefit. This decision does not waive host proofs or grant full design/build
approval. See the [comparison](../269-knowledge-system.md#hook-comparison-and-recommendation--2026-09-18).

Keep startup, prompt, completion, and scoped action checks as separate responsibilities with thin host adapters and shared temporary state. They need not each become a new script. Use ordinary command hooks where proven, retain ordered explicit startup reads and the selected every-prompt reminder, and include the quiet completion review approved by Mike on 2026-09-18 for findings made during work; independent save helpers must not delay the main conversation. Never use changed-file counts to decide whether conversation-only work deserves review. Checkpoints neither classify meaning nor approve saves.

Prove the smallest adequate startup transport before choosing its implementation. First test native reads and observable result delivery on each host. Add a bounded manifest reader, content digests, or range receipts only where needed to establish complete, current, model-visible delivery. A process receipt proves only a process read; acknowledgment is a separate declaration, not understanding or semantic permission. If neither native observation nor a helper establishes delivery, declaration-only operation fails strict R2/full acceptance. Do not revive full-file startup printing or infer compliance from arbitrary shell output or assistant prose.

Select copied project runtime versus plugin-managed runtime by fresh-session activation, version consistency, trust, update, recovery, and rollback evidence on each supported host. Neither packaging option wins by default. Keep one canonical source and preserve owner-specific configuration under either option; D1-P1 selects the contract and E1-P7 implements it.

Keep feedback in the existing `knowledge/memory-self-improvement.md`, with concise Lessons and Recent decisions, because R23 leaves its location to design. Remove the unrelated fixed 8,000-character failure threshold; preserve useful feedback without inventing new R21 size limits. The PRD's proposed layout for memory, current work, glossary, PRD index, and brainstorms remains the planning target, subject to the recorded requirements and build authority.

Keep deterministic checks separate from behavioral acceptance. A valid file, receipt, or successful hook test never demonstrates that the correct memory was selected or that a permission covered its meaning.

## Historical repository starting points, 2026-09-18

Paths below preserve the pre-build inventory. Many listed gaps were delivered in
#366; use the current assessment above for remaining work. “Change” describes
the original plan. Inspect latest source before executing a package.

| Area | Existing source and actual gap | Planned treatment |
| --- | --- | --- |
| Startup | `plugins/second-brain/hooks/knowledge-session-start.mjs` prints full startup files in the old order, then index entries; failures allow continuation. | Preserve System Guide isolation; replace full printing with compact ordered-read/recovery request and evidence-aware acknowledgment. |
| Prompt | `plugins/second-brain/hooks/memory-reminder.mjs` exists, but has old memory criteria, forced manual reopening, and no explicit intent receipt. | Rewrite message from the canonical manual/contract; cover every destination, positive/negative criteria, actual relative paths, and intent. |
| Action reminders | `plugins/second-brain/hooks/save-reminder.mjs`, `work-item-close.mjs`, and `command-parsing.mjs` already detect supported PR/close commands and issue one-time holds. | Reuse parser and known command coverage; replace branch/once-only adequacy assumptions with current work review outcome; merge/close alone never establishes shipping. |
| Completion and receipts | No dedicated knowledge completion handler or shared receipt helper in this plugin. The separate style handshake demonstrates narrow read observation. | Use candidate completion/checkpoint modules, with read transport selected by D1-P1 rather than fixed in advance. Borrow tested patterns from `plugins/hooks-library/hooks/style-handshake.mjs` without copying its policy or assuming its Claude read observation covers Codex. |
| Save/find/lifecycle | Existing six skills contain old paths and incompatible rules: `remember` requires full manual reread, rejects pending queuing, uses an older card, and ties finalized PRDs to delivery; `retire` supports replacement, retirement, and deletion but forbids publication; `reflect` treats built proposed PRDs as a defect. | Replace the six entry points with four skills and operation-specific references; migrate the proposal template and history-search adapter. All lifecycle writes share one save/publication procedure. |
| Files/templates | `plugins/second-brain/skills/second-brain/references/templates/` supplies SOUL, manual, project, current, feedback, and two indexes. | Move templates into `knowledge-setup/references/templates/`, repair callers, and adopt the new record layout; add inbox, glossary, and topic/PRD authoring examples. Keep content guidance in references loaded when needed. |
| Index/checker | `plugins/second-brain/tools/{build-knowledge-index,check-knowledge,frontmatter}.mjs` are reusable. Builder emits two old indexes; checker uses old required fields and 250/2,000/8,000 limits. | Extend to three grouped indexes, new metadata/layout, summary under 200 and current under 5,000, glossary exception, and read-only errors. Preserve a single parser. |
| Setup/sync | `plugins/second-brain/skills/second-brain/SKILL.md`, `plugins/project-init/skills/project-init/` and `plugins/project-init/skills/project-sync/SKILL.md` describe old copies, layout, and Codex startup-only wiring. | Update one coherent delivery contract, migration, actual activation/version checks, and supported host reports. |
| Publication | `plugins/project-init/library/rules/general/knowledge-direct-commit.md` is shipped knowledge-only guidance; parent R25 now defines broader documentation eligibility. | Extend this canonical rule and its catalog in place. File content, not extension or folder alone, determines the route; do not build a semantic classifier. |
| Tracker/handoff | `plugins/project-init/library/rules/general/work-item-stages.md`, `plugins/session-skills/skills/{work-guide,handoff,solution-design,spec-check,requirements-helper}/SKILL.md`, and `plugins/work-tracker/skills/work/` already own tasks, approvals, and continuation. | Integrate knowledge outcome and source links; retain existing tracker ownership and CLI. No second planning store. |
| Tests/install records | `tests/{knowledge-startup-check,installed-copy-check,link-check,orphan-check}.mjs`, System Guide tests, `.claude/settings.json`, `.codex/hooks.json`, `.claude/toolkit-sync.md`. | Revise obsolete startup expectations, add focused behavior fixtures, update installed copies through delivery, and preserve unrelated hooks/settings. |

## Task and dependency map

These IDs are proposed subtasks under the existing roadmap tasks. They do not create native GitHub subissues or imply status changes. The main conversation maintains the canonical issue and records approvals; each assigned builder owns only its package, and an independent reviewer verifies its exit evidence.

```mermaid
flowchart TD
  D[D1-P1: prove host contracts and settle architecture] --> A[D1-P2: reconcile requirements and record approvals]
  A --> B[E1-P1: manuals and file contracts]
  A --> C[E1-P2: shared publication guidance]
  B --> T[E1-P3: schemas, indexes, migration fixtures]
  B --> S[E1-P4: save, lookup, lifecycle skills]
  T --> S
  C --> S
  D --> H[E1-P5: host checkpoints and receipts]
  B --> H
  S --> I[E1-P6: tracker and component integration]
  H --> I
  T --> U[E1-P7: setup, sync, safe migration]
  I --> U
  U --> V[E1-P8: representative sessions and correction]
  V --> F[F1-P1: acceptance and authorized rollout]
```

E1-P3 and E1-P5 can run in separate implementation worktrees after their contracts are agreed. E1-P4 procedure drafting can begin alongside them, but its integrated save acceptance depends on E1-P3's completed tools. Serialize edits to shared templates, manifests, and installed copies. Do not enable half the new layout in this repository while old runtime/checker expectations still own it.

## D1-P1: prove host contracts before selecting enforcement

**Owner:** host-adapter builder; independent reviewer checks evidence. **Dependencies:** current official documentation and installed host versions. **Requirements:** R2–3,9,25–27,29–30.

Use disposable equipped test projects, not production records. Record the source date and tested version. Current local version discovery found Claude Code 2.1.259 and Codex 0.154.0; documentation alone does not prove these binaries implement newer features.

Test CLI and desktop execution separately where both are supported. Record the effective runtime version, active configuration layers, and trust/permission state for each; the CLI version on PATH does not establish the desktop bundled version. Claude Mods remain a possible later adapter, not a baseline dependency or an experimental flag enabled by this plan.

Prove ordered file reading, readable-content observation where available, explicit startup and prompt acknowledgment, one bounded completion continuation, supported action denial, missing/truncated content, stale receipts, helper isolation, disabled/untrusted hooks, timeouts, and Windows command quoting. Test compaction/resume/clear as separate cases. Record unavailable events instead of inventing substitutes that silently change requirements.

Prove H1–H6 in the linked host evidence, first comparing native read observation with a bounded helper only where needed. Reconcile the evidence document’s helper-specific H2 recipe with the selected transport. Establish ordered, complete, current delivery and a separate acknowledgment; use digests/ranges only where the chosen mechanism needs them. Changed guidance invalidates the affected completed read. Prove whether truncation occurs before or after PostToolUse and whether desktop/code-mode wrappers preserve model-visible output. Do not match arbitrary shell output as if it were a complete read. Startup returns its instruction before the agent can act; waiting inside that hook for the same agent's acknowledgment would deadlock.

Before-final-answer continuation runs at most once when review is outstanding; another stop without a valid outcome reports an unfinished checkpoint instead of looping. New user input establishes a new review generation, not a new startup-read generation. Required guidance revision or context recovery invalidates the affected startup scope; ordinary prompts do not force rereading unchanged available manuals. A pending proposal or recoverably delegated save is a valid review outcome and must not hold the conversation open. The save itself remains unfinished until publication is verified.

Prove delegated save execution separately from read/checkpoint helpers. Test
whether a native helper can continue while the main agent answers a new prompt,
return its result after the main turn ends, and recover when either session stops.
Cover late results, conflicting later instructions, duplicate retry, concurrent
publication, and unavailable parallel execution. Report unsupported behavior;
a spawned helper alone is not proof of an independent completed save.

Compare copied and plugin-managed runtime in disposable projects: prove initial activation, actual running version, update propagation, project opt-in/trust, path resolution on Windows, recovery after missing files, and rollback without duplicate registrations. Choose packaging from those results; source installation alone is not activation evidence.

**Deliverable/exit:** a host capability matrix with source evidence and observed results; selected read/acknowledgment and packaging contracts, plus a covered action list. Claude startup events cannot hold session creation, and fail-open tool hooks are not universal protection. Codex hosted/specialized tools and continued terminal input may bypass tool hooks. A missing proof blocks the claim of enforcement and the dependent production feature, not unrelated design tasks.

**Risk/rollback:** prototypes can give false confidence if only hook stdout is tested. Exercise actual sessions; discard only disposable fixtures and restore their hook configuration. No requirement is weakened to make a prototype pass.

## D1-P2: reconcile the design and genuine owner decisions

**Owner:** design lead/main conversation. **Dependencies:** D1-P1. **Requirements:** all 30; parent R25.

The master and this plan now share the four-capability architecture and delegated-save requirements. Reconcile remaining host evidence and approval questions while preserving accepted startup reads, prompt behavior, and judgment boundaries. Compare alternatives by complete saves, clear discovery, recovery, concurrency, host parity, measured context cost, and maintainability. Record which existing internals satisfy those contracts and which need replacement. Keep D1’s approval and current position in issue #269.

Locate the actual project skill-authoring procedure and its approval owner for R17 before implementing the handoff. If none exists, record R17's integration dependency and obtain scope for that capability separately; a routing sentence alone does not supply a working authoring process.

The quiet completion-review behavior is approved by Mike as of 2026-09-18. Prove the bounded handler in D1-P1; exact mechanism selection and production activation still require design/build authority. A prompt-only adapter cannot be claimed to satisfy the end-turn review outcome merely because the reminder ran.

Recommend no new Git pre-commit hook in the initial release: explicit checks and covered agent write safeguards meet the intended save sequence without changing Mike's manual-edit workflow or replacing unrelated Git hooks. Broader manual-edit blocking would be a separate owner policy decision supported by a demonstrated failure.

Mike settled automatic-save metadata on 2026-09-18: record the grant's person,
date, scope, and source once in project permission settings. Mark each affected
memory as auto-saved; do not duplicate grant details into individual approval
fields. R10/R14 own this behavior. Automatic saving remains opt-in; this design
decision does not enable it.

Use R3's affected-work pause for failed saves. The tracker must not claim a dependent deliverable complete; unrelated tasks can continue. Existing accepted completion rules remain with the tracker. Do not impose a global session lock.

**Deliverable/exit:** one coherent design, explicit unresolved material policy decisions with recommendations, separate requirements/design/build authority recorded before E1 production execution. Technical uncertainty is not sent to the owner as a choice of APIs.

**Risk/rollback:** changing architecture must not erase accepted meaning; preserve the reference and decision provenance. Unaccepted proposals remain proposed.

## E1-P1: manuals, templates, and record contracts

**Owner:** knowledge guidance builder. **Dependencies:** D1-P2; Toolkit operating-manual owner under issue #306. **Requirements:** R1–2,7,10–18,20,23,28–30.

The canonical knowledge manual is `knowledge/knowledge-manual.md`; preserve its marker and reconcile its policy against the approved requirements. The earlier `knowledge/README.md` rename is already delivered; a path migration alone does not update instruction meaning. Coordinate `knowledge/toolkit-manual.md`, reported by the #306 coordinating task as Mike’s selected path. It covers high-level philosophy, project structure, end-to-end workflows, and subsystem cooperation; detailed knowledge procedures stay in the knowledge manual. The manual owner supplies content and the project-init/project-sync delivery contract. Verify delivery before embedding the path in a shipped hook. Do not create a competing manual inside the Knowledge System or ship a placeholder link.

Migrate the managed manual and project/SOUL/current/feedback templates from `plugins/second-brain/skills/second-brain/references/templates/` to `plugins/second-brain/skills/knowledge-setup/references/templates/`, updating template consumers together. Add `knowledge/memory-inbox.md`, `knowledge/memory/memory-entries/terminology-glossary.md`, and concise memory/PRD examples in that template/reference family. Move template current work to `knowledge/memory/current.md`, rename the PRD index template to `prd-index.md`, and put brainstorms at project root. Retain the existing feedback filename. The System Guide owner supplies its actual enabled path; do not silently migrate or enable it.

Use the PRD's exact card fields and working-memory structure. Inbox entries carry stable reference, destination/operation, exact shown card or precise authorized upkeep owed, source/date, host/conversation identity, update time, state, next step, and separate durable authority. Identity for deduplication is operational; pending text never becomes evidence. Capture source/context separately in memory; do not infer missing provenance to satisfy metadata.

**Deliverable/exit:** coherent templates and small root/manual routing contract, with valid empty and populated examples. Tests cover glossary without frontmatter, proposed PRD without approval, approved PRD with paired fields, exact pending card, active work from two sessions, and style/source preservation. No arbitrary record-length cap beyond R21.

### Memory self-improvement task

Task D2 in the [design Notes](../269-knowledge-system.md#task-d2--make-memory-self-improvement-instructions-clear-and-current)
records Mike's requested review of the feedback file, installed template,
reading/update triggers, cleanup, and unsupported 8,000-character cap. E1-P1
owns instruction/template wording; E1-P4 owns use and cleanup behavior; E1-P7
owns safe migration of existing project feedback and matching checker guidance;
E1-P8 proves new and upgraded projects behave correctly. Treat this as required
content work, not just a reminder or a filename migration. No implementation is
claimed by adding the task.

### Required instruction-content audit

Mike explicitly requested this audit on 2026-09-18. Delivery of a reminder or a
manual is insufficient: the instructions the agent receives must match the
approved requirements. This is implementation scope and an acceptance condition,
not a claim that the existing manual already matches the proposed system.

Before changing instructions, extend this plan's requirement coverage with a
row for every R1–R30 requirement: approved behavior, canonical instruction source
and section, consuming instructions or references, required wording changes,
installed destination, owner, and evidence. Mark a requirement with no instruction
change as reviewed with a reason. Do not infer coverage from filenames or a
successful copy/hash check. Keep this record here rather than create a separate
notes or audit file.

Apply the owner's 2026-09-18 language requirement throughout: no jargon or
figurative language; explicit conditions, actions, permissions, checks, and
failure handling. Explain necessary exact technical names. Review meaning,
not just forbidden words or length. Remove repetition without losing detail.
Implement the core-manual/task-specific arrangement approved by Mike on
2026-09-18, after full design/build authorization, using the four
existing planned skills and their references. Preserve all R2 startup topics;
exact content requires the audit below before implementation. Test that each task loads
its necessary detail, including after context recovery, without loading every
procedure for every session.

Review the complete text of each applicable surface, including examples and
negative instructions, not only search matches:

| Surface | Required review |
| --- | --- |
| Knowledge and toolkit manuals | Routing, source authority, startup/recovery, permission, pending saves, plain language, file shapes, lifecycle, feedback, component boundaries; keep detailed policy in its owning manual. |
| Root instructions and installed rules | CLAUDE/AGENTS routes, work stages, documentation saves, manual upkeep, handoff and output style; remove conflicting instructions while preserving unrelated owner rules. |
| Four skills, helper assignments, and operation references | Lookup, selection, proposals, approval, automatic saves, every lifecycle operation, validation, commit/push, recovery, and quiet completion. Retired skill names must route correctly or be removed from active callers. |
| Templates, sample records, and proposal cards | Exact current fields and examples, automatic-save marker versus individual approval, pending approval versus finished saves, Notes ownership, glossary and topic layout. |
| Hook-generated instructions and checker messages | Actual emitted wording agrees with the manual; no old approval or reread rules reintroduced by a reminder, error message, or recovery instruction. |
| Setup, sync, migration, manifests, and catalogs | A new project receives coherent content; an existing project receives the same policy through safe migration. Verify active loaded versions and installed copies, not just repository source. |
| Other component entry points | Work tracking, requirements/design helpers, handoff, System Guide and skill-authoring routes preserve their owners and current permissions. Reconcile the separately approved Notes workflow when integrated. |

Known source gaps verified on 2026-09-18 include the manual's old startup order,
layout and six-skill map; blanket memory approval fields; `remember` forbidding
pending queuing; `retire` forbidding commit/push; and missing explicit coverage
of the newly approved automatic-save and helper workflow. These describe the
current implementation, not permission to edit live instructions during design.
The Notes workflow has since merged at c77082e; reconcile against that source
while distinguishing repository delivery from project refresh.

Acceptance requires an independent meaning review against every requirement,
plus fresh-agent scenarios in both a newly equipped project and an upgraded
project on each supported host. Include saving after approval, saving with
per-save approval disabled, retirement, interrupted helper recovery, quiet
completion, no-jargon proposals and saved text, and PRD/design continuation.
Seed obsolete instructions to verify migration detects or reconciles them;
preserve owner customizations and report unresolved conflicts. Check that the
agent acts on current content without coaching from this conversation. Record
static content/copy checks separately from observed behavior. Any contradictory
active instruction or untested scenario remains an explicit release gap.

**Risk/rollback:** manual rules and skill templates can drift. Keep shared meaning in the manual and operation details in linked references; revert template/runtime package together before activation, preserving owner-authored records.

## E1-P2: reusable documentation publication

**Delivery update, 2026-09-18:** The shared rule, setup/sync routes, installed
copies, and catalogs shipped separately in [PR 353](https://github.com/Mar5929/claude-toolkit/pull/353)
(project-init 0.73.0; marketplace 0.117.0). Reuse that guidance for this package.
Knowledge-specific save integration and fresh-host acceptance remain to be
validated during the Knowledge System build; this release does not complete
those dependent packages.

**Owner:** project-init builder. **Dependencies:** D1-P2. **Requirements:** R3,9–10,13,16,28,30; parent R18,R25.

Extend `plugins/project-init/library/rules/general/knowledge-direct-commit.md`, its `README.md` catalog, `project-init/skills/project-init/references/{thin-claudemd,root-file-examples,setup-flow}.md`, and project-sync guidance. Root maps identify eligible documentation homes and route to the full policy. Keep the existing rule filename initially to avoid breaking installed references.

The workflow uses the existing default-branch checkout, verifies identity/remote/staged work, fetches safely, rereads the destination, checks the exact authorized change, stages only owned paths, commits, pushes, and verifies remote inclusion. Serialize the shared index/commit step. A Markdown skill or rule changing installed behavior is implementation, not a documentation exception. Independent documentation can publish separately; inseparable mixed changes stay in the implementation PR.

**Deliverable/exit:** reusable source, installed rule copy, routes, and guidance agree. Scenarios cover documentation from a worktree, behavioral Markdown, mixed edits, unrelated staged files, parallel changes, failed validation, rejected push, explicit publication hold, and an already-published retry. No force-push, account switching, autostash, or silent PR fallback.

**Risk/rollback:** broad file globs can bypass review. The agent judges eligibility and tools verify Git facts; do not implement a classifier. Reverting guidance preserves published records and reports any unfinished save through its owning record.

## E1-P3: schemas, indexes, and read-only validation

**Owner:** knowledge tools builder. **Dependencies:** E1-P1. **Requirements:** R7–8,12–16,21–23,28–29.

Extend the three existing tools under `plugins/second-brain/tools/`. Build memory, PRD, and external-source indexes from canonical metadata, with summaries copied exactly. Recommend ordinal sorting by normalized group then project-relative path for stable output across hosts; preserve parent-before-child PRD nesting and topic grouping. Exclude glossary, inbox, working state, and feedback from lasting indexes. External-topic entries use outside-source fields, not memory approval fields.

Update required fields, real dates, allowed statuses, links, nested topics, paired PRD approval, memory context, and the two limits: summary under 200 characters and current work under 5,000. Remove the old 250/2,000 limits and feedback cap. Keep the checker read-only. Retain a managed-manual integrity check tied to the installed release/template, not a second policy copy; regenerate any existing checksum with its template in the same change. Secret-pattern checks are useful but explicitly non-exhaustive.

**Deliverable/exit:** focused `plugins/second-brain/tests/knowledge-records.test.mjs` fixtures for valid/invalid metadata, YAML quoting/lists, dates, glossary exception, nested topics, external sources, status labels, missing fields, links, deterministic rebuilds, and safe synthetic secret patterns. Reading the result and judging meaning remain agent responsibilities.

**Risk/rollback:** current parser supports a small YAML subset. Exercise every allowed field representation; extend its shared parser or use one proven YAML parser only if fixtures establish a need. Do not maintain two parsers or silently reinterpret unsupported YAML. Keep failed conversion inputs intact.

## E1-P4: lookup, saving, lifecycle, and recovery procedures

**Owner:** knowledge workflow builder. **Dependencies:** E1-P1–P3. **Requirements:** R3–24,28–30.

Build the four skills and migrate the proposal reference. `knowledge-find` applies relevance once per unchanged request, reuses current evidence, consults glossary before relevant searches, opens actual sources, and uses available history last. Its session-history adapter retains the existing script and read-only project scope; an unavailable Codex history source is reported, never called an empty result or silently replaced with another project's history.

`knowledge-save` evaluates memory and other destinations, separates routine quiet review from explicit review requests, preserves new pending proposals, honors existing scope, reads back actual writes, runs checks/indexing, publishes through E1-P2, and removes only verified completed or rejected inbox entries. A real significant fix may qualify under R11 even when first solved by the agent; routine activity does not. No mandatory full manual reread every turn. Read relevant current guidance before the operation.

Implement the main-agent/helper split in the shared save procedure. The main
agent keeps the authorized assignment in the inbox before delegation. Specify
create/update/supersede/retire/consolidate/delete, exact destination files,
approved meaning and required verbatim text, evidence and permission, applicable
instructions, required checks, and commit/push. The helper reads latest content,
applies only that scope, checks and publishes, and returns paths/checks/commit/
remote evidence or the unfinished step. Main verifies the result; do not wait
for publication before answering an independent question. Preserve existing
permissions, coordinate known workers, and verify the current destination and
remote before retrying. Unknown worker status is not proof it stopped; no
distributed lock or exactly-once guarantee is implied.

Review proposal language before approval and actual saved language afterward.
Memory/proposal prose must contain no jargon, figures of speech, figurative
language, metaphors, or idioms. Preserve approved meaning and required exact
names; resolve conflicting verbatim instructions before approval. Keep this a
writing review rather than a claim that keyword scanning proves compliance.

Assign an opaque stable operation reference when a real pending proposal or authorized unfinished save is first captured, retaining it through revised cards and conflict transitions. Before each inbox or destination edit, reread both relevant records, compare the operation reference and intended scoped change, and detect whether the change already landed. Similar meaning from concurrent proposals requires agent reconciliation, not a hash-based semantic merger. Serialize shared publication; do not erase another entry while resolving this one. Test two sessions approving/retrying the same operation, simultaneous distinct entries, destination drift, blocked-by-conflict with authority intact, rejection, and removal only after verified completion.

### Save-and-recovery contract and first test

Implement the [master recovery contract and interruption matrix](../269-knowledge-system.md#recovery-evidence-and-retry-order)
through this same procedure. The existing inbox is the only pending-save store.
Carry its reference and approved revision through dispatch, checks, commit
message, and result. Persist readable authority before mutation; verify the
remote destination before removing the active entry. Interrupted cleanup is
recovered separately without reapplying destination content. Use ordinary
entry context, not a new database, operation file, or schema requirement.

Start with the customer-import example in the master's acceptance matrix.
Prepare deterministic temporary-repository cases for each interruption boundary,
concurrent checkout, failed publication, and cleanup. Then run fresh-agent
behavior trials against those same starting states. File/Git tests and model
behavior results are separate evidence; unexecuted cases stay planned.

For each supported host/surface, D1-P1 must establish the executor's tools,
permissions, repository/checkout, durable-assignment access, result return after
parent completion, cancellation/status inspection, and late-result behavior.
If a helper cannot execute, the foreground agent uses the same procedure under
existing authority and reports unavailable parallel behavior. If publication
needs an unavailable interaction, preserve the unfinished entry and hand the
specific step back to the foreground; do not request the same meaning approval.
This fallback does not count as proof of asynchronous host acceptance.

`knowledge-review` produces findings and proposed change sets; `knowledge-save` applies authorized lifecycle and operational-maintenance changes through the same save/publication path. Preserve existing exceptions for operational feedback and generated indexes; do not require new meaning approval for already-authorized maintenance. Supersede changed meaning in its owning topic; create a new file only for a justified topic change or approved split. Consolidation verifies preservation and links before removing originals. Feedback records actual owner criteria/reason, not guessed preferences or a running activity log. Never finalize a PRD merely because code shipped.

**Deliverable/exit:** conversation-only routing, known fact citation, partial approval, silence, correction, explicit verbatim request, approved retry, topic split/merge, manual rename/deletion recovery, feedback carryover, and no-result review scenarios pass. Verify each plain-language intent selects the appropriate capability, review does not independently apply lifecycle changes, and every lifecycle operation finishes or remains recoverably pending through the same save procedure. Verify cards render as Markdown under destination headings and unique numbers. Check output style and source-supported meaning, not only file validity.

**Risk/rollback:** procedure changes can accidentally broaden permission. Preserve exact authority and scope through conflicts; pause only dependent writes. Roll back skill version if needed while retaining pending entries and actual published outcomes.

## E1-P5: startup, prompt, completion, and scoped action checks

**Owner:** host-adapter builder. **Dependencies:** D1-P1, E1-P1; E1-P4 before behavior acceptance. **Requirements:** R2–3,9–10,25–29.

Refactor existing hooks around startup orientation, prompt review, completion review, and scoped action checks, using thin host adapters. `knowledge-completion.mjs` and `knowledge-checkpoint.mjs` are candidate modules, not a fixed file count. Keep read transport separate from save/publication procedures; implement only the native observation or helper transport proven in D1-P1. Temporary state has project/host/session/agent identity, separate startup and review generations, acknowledgment kind/outcome, instruction revision, and retry state; add delivered-content evidence such as digests/ranges only as required by that transport. It contains no lasting content, permission, transcript, search results, or shadow inbox. Use serialized compare-before-update of the current generation plus atomic replacement; atomic writes alone do not stop a late hook replacing newer state. Test delayed read/Stop events after a new prompt and concurrently completing handlers. Cleanup must not delete active sessions based only on age.

Startup instructs reads of SOUL, project, then `knowledge/knowledge-manual.md`; discovers current work, inbox, glossary, and index paths. It withholds successful acknowledgment when required content is unavailable. Prompt delivers canonical compact criteria and intent acknowledgment once per user message. The completion event catches new findings from execution and distinguishes no changes, completed saves, pending proposals, and unfinished saves, including helpers still running. Do not force the main turn to wait for an independent save or trigger repeated reviews from helper messages; a routine no-change stays invisible to the owner. Explicit save requests still receive a result.

Use supported pre-action paths only for narrow objective holds. Receipt presence cannot authorize a lasting write. Before a consequential write, the agent checks the applicable durable authority and latest file; objective checks confirm valid target and required record fields. Reuse existing supported command detection for PR/work handover. Do not require arbitrary shell, connector, or helper actions to pass a universal interceptor the host does not provide. Add a new write guard only if D1-P1 identifies a specific objective prerequisite and demonstrated coverage; do not equate a prior skill invocation with approval.

**Deliverable/exit:** `plugins/second-brain/tests/knowledge-checkpoints.test.mjs` covers stale/wrong-session receipts, missing files/state, changed manual, prompt deduplication, bounded Stop, pending valid outcome, helper isolation, timeouts, command variants, and bypass limits. Revised `tests/knowledge-startup-check.mjs` checks actual new contract rather than old full-print order. Fresh native sessions on both hosts provide separate behavior evidence.

**Risk/rollback:** false gating, infinite continuation, and unsupported host events. Keep the prior working registration available, disable only the failing knowledge adapter on a proven defect, report degraded coverage, and retain project data. No unsupported universal enforcement claim.

## E1-P6: toolkit and work-item integration

**Planned dependency, 2026-09-18:** the work-tracker task reports Mike's selected
local format as one `WORK-ITEM.md` for overview/status, tasks, questions,
decisions/history, and requirements, plus separate `DESIGN.md`. Its top-level
sections are Overview, Roadmap, Tasks, Recent History, and Requirements. Roadmap
holds phases/milestones, outcomes, status, and task/child-item links; execution
detail stays in Tasks. Coordinate the
requirements/Notes routing with that owner; do not assume separate TASKS.yaml,
STATUS.md, or REQUIREMENTS.md remain authoritative after migration. The storage
change is not shipped and does not authorize migration here. External trackers
retain their own records. An existing shared feature PRD must not be copied into
a competing local requirements authority; resolve ownership during integration.

**Owner:** integration builder. **Dependencies:** E1-P4–P5. **Requirements:** R3–4,9,16–19,24,28,30.

Update handoff, work-guide, solution-design, spec-check, requirements-helper, and lifecycle guidance only where they must pass owning scope, delivery evidence, and continuation to knowledge. `plugins/work-tracker/skills/work/scripts/{work.mjs,lib/tracker.mjs,lib/common.mjs}` are existing objective tracker mechanisms; do not change them unless the integration test exposes an actual missing interface. Use existing task fields, approvals, completion records, and chosen tracker APIs.

The tracker owns status and acceptance. Knowledge reports its outcome and dependent failure. Merge/close prompts a check of actual delivered behavior before automatic PRD upkeep. A cancelled or merged-but-undelivered item does not silently finalize or rewrite a PRD. A simple question creates no work item. System Guide and client architecture follow their own configured owner/workflow; Acme remains Guide-off with `delivery/architecture/`.

**Deliverable/exit:** a tracked change, a question without a task, a cancelled item, cross-component requirements, a procedure handoff, a Guide-on project, and Acme Guide-off all keep one owner per record. Existing work-tracker and System Guide tests remain passing. Required manual paths are real and project-relative before release.

**Risk/rollback:** knowledge can become a second tracker or invoke unrelated work. Use references and destination return outcomes; restore changed integration instructions together while preserving true tracker state.

## E1-P7: activation, migration, packaging, and installed copies

**Owner:** setup/delivery builder. **Dependencies:** E1-P1–P6. **Requirements:** R1–3,7–8,13–14,16,21,25–28,30.

Implement `knowledge-setup`, update project-init setup-flow, project-sync, root-route references, plugin READMEs, `docs/toolkit-map.md`, top-level README, both plugin manifests for each changed plugin, and marketplace version metadata. Keep the plugin name. Apply the D1-P1 packaging decision to runtime paths, applicable installed rules, `.claude/settings.json`, `.codex/hooks.json`, root router blocks, and `.claude/toolkit-sync.md`. For copied runtime, refresh copies from canonical source; for plugin-managed runtime, verify resolution/update/rollback before removing obsolete copies and registrations.

| Existing record or entry point | Target/action |
| --- | --- |
| Six existing skill names | Migrate callers, catalogs, manifests, templates, and tests to four skills. Route legacy requests where needed using supported mechanisms; remove duplicate procedures only after discovery tests pass. |
| `knowledge/current.md` | Move to `knowledge/memory/current.md`; preserve all active items and repair routes. |
| Flat lasting files under `knowledge/memory/` | Move into `knowledge/memory/memory-entries/`, preserving approved content/provenance; coherent topic splits need their own authority. |
| `knowledge/prds/spec-index.md` | Rebuild as `knowledge/prds/prd-index.md`; repair references and remove obsolete generated file after checks. |
| `knowledge/brainstorms/` | Move to root `brainstorms/`, preserve unchecked status and links. |
| Feedback file | Retain current path and useful content; remove obsolete cap from behavior, not useful lessons. |
| `knowledge/README.md` managed manual | Rename to `knowledge/knowledge-manual.md`, preserving contents and customizations; repair callers together. Keep unrelated README content and stop for conflicting manuals. |
| Inbox/glossary/external index | Create missing structures only; reconcile existing content instead of overwriting. |
| Existing System Guide path/config | Preserve ownership and actual configured location; coordinate any separately authorized migration with that plugin. |

Inventory files/permissions first. Work in reversible batches, retain an old-to-new map and baseline commit, and leave an ambiguous conversion untouched. Add required group/context/update fields only from available evidence; missing approval/source is a named migration issue, never invented metadata. Already-approved layout conversion follows R10's conversion permission and owner review afterward; this is not permission to change meaning or migrate another project silently.

**Deliverable/exit:** new, already-equipped, partially installed, mixed/unknown, Guide-only, and owner-modified projects are classified correctly. New setup is one approved operation with version, all required parts, checks, actual host activation, and named limitations. Install into this repository only after fixture proof; external projects require their own authorization. Run all four repository checks, plugin validation, and relevant integration tests. Old/new registrations never run twice.

**Risk/rollback:** layout and runtime can become inconsistent. Revert the package/registration and restore path mapping together, preserve new authorized content and permission, then rebuild old-compatible indexes. Never reset a shared checkout or discard post-migration owner edits. Recommend this repository as first trial; DragonFly is not implicitly authorized.

## E1-P8: representative sessions and correction loop

**Owner:** independent acceptance reviewer; builders repair failures. **Dependencies:** E1-P7. **Requirements:** all 30.

Run fresh session, long/compacted conversation, task switch, parallel sessions, and component-enabled/disabled scenarios on both hosts. Include a helper that is deliberately slow, a failed push after the main turn ends, parent/helper interruption, explicit create/update/delete assignments, and conflicting later instructions. Verify the main conversation continues and the result is checked before success. Seed known facts, shorthand, current-versus-required conflicts, no-code conversation decisions, unapproved and approved unfinished saves, low-value details, a missing source, concurrent edits, rejected push, handoff, and deliberate owner file edits. Use the master’s concrete acceptance scenarios and every PRD Check, including significant episodes and authorized interviews. Extract still-relevant failure cases from the detailed reference into named tests with requirement, fixture, expected outcome, host/version, observed result, and evidence location. Include truncated reads, helper isolation, stale/late events, manual and automatic compaction, Windows command matching, permission modes, hook bypass/timeouts, concurrent saves, and shallow/detached/no-commit repository cases where supported action detection depends on them. Record why an obsolete mechanism-specific case no longer applies rather than dropping it silently.

Measure hook text, file-read content, tool turns, and observed token usage separately. Enforce no invented numeric budget; investigate duplicate rereads, repeated cards, missing/truncated guidance, false holds, or unnecessary broad scans. Keep small instructions and load relevant detail on demand without dropping required content to fit a target.

**Deliverable/exit:** requirements-to-evidence matrix records expected result, actual source/record changes, host/version, limitations, and pass/fail. A missed obligation remains a failure even if a receipt exists. Repair and rerun affected scenarios; do not rerun unrelated expensive sessions without a reason. Independent review checks permission and meaning, not only script outputs.

**Risk/rollback:** static tests can mask poor agent behavior. Release remains blocked on material failed outcomes; document residual host gaps plainly rather than treating disclosure as compliance.

## F1-P1: acceptance and authorized rollout

**Owner:** main conversation/release owner; Mike supplies applicable acceptance. **Dependencies:** E1-P8 and explicit release/target authority. **Requirements:** R3,16,25–27,30.

Present concrete delivered behavior, remaining gaps, checks, and rollback. Record acceptance through the existing tracker. Merge approved implementation through its normal workflow; refresh marketplace/cache and run project-sync separately. Verify actual installed version, activation, and fresh-session behavior in each authorized target. A source merge is not rollout evidence.

Update only the PRDs affected by authorized actually shipped behavior, under existing upkeep authority. Preserve explicit publication holds and unresolved deviations. Keep the reference/history; retire the active design according to the project lifecycle only after its useful settled behavior and references are owned elsewhere. Do not delete planning records prematurely.

**Deliverable/exit:** accepted result and per-target adoption evidence in the tracker, current requirements/operating guidance, no unresolved approved save hidden in a session. Unsupported or untested targets are named. Roll back runtime independently of owner knowledge and preserve all durable pending permissions.

## Requirement-to-package traceability

Every row needs objective or behavioral evidence appropriate to its claim. Package completion does not finalize a requirement automatically.

| R | Primary packages | Required evidence |
| --- | --- | --- |
| 1 Plain parts | E1-P1 templates, E1-P3 tools, E1-P7 setup | Editable Markdown/Git; no secondary store; owner rename/deletion recovery. |
| 2 Follow system | D1-P1, E1-P1/P5/P7 | Ordered startup reads, honest acknowledgment, recovered guidance. |
| 3 Reliability | E1-P4/P5/P8 | Required moments without owner reminders; affected-work failure and recovery. |
| 4 Continuation | E1-P1/P4/P6/P8 | New session resumes shared work and pending saves correctly. |
| 5 Memory first | E1-P4/P8 | Relevant source used; irrelevant lookup skipped without repeated tool-by-tool decisions. |
| 6 Sources | E1-P4/P8 | Finding followed by correct file/session/capture source and required date. |
| 7 Vocabulary | E1-P1/P3/P4/P8 | Glossary table, direct route, aliases/cautions, no memory-index entry. |
| 8 Outside docs | E1-P3/P4/P8 | Grouped source index, capture metadata, relevant current vendor evidence. |
| 9 Saving | D1-P1, E1-P2/P4/P5/P8 | Prompt reminder, required reviews, explicit approved helper assignment, conversation continues, verified publication and returned result. |
| 10 Permission | D1-P2, E1-P1/P4/P5/P8 | Scope, silence, partial approval, ongoing authority, approval toggle, recovery. |
| 11 Eligibility | E1-P4/P8 | Project significance, owner involvement/real-fix exception, significant episode. |
| 12 Exclusions | E1-P3/P4/P8 | No noise/secrets as memory; valid other destinations retained. |
| 13 Working memory | E1-P1/P3/P4/P8 | Exact structure, under 5,000 characters, concurrent items and shared availability. |
| 14 Memory shape | E1-P1/P3/P4/P7 | Topic maintenance, required fields/context, justified splits, provenance. |
| 15 Writing | E1-P1/P4/P8 | Proposal and saved text reviewed for no jargon or figurative language; approved meaning and required exact names preserved. |
| 16 PRDs | E1-P1/P3/P4/P6/P8 | Approval distinct from delivery; proper parent/child owner; shipped upkeep. |
| 17 Procedures | E1-P4/P6/P8 | Existing skill-authoring destination and permissions, no procedure memory. |
| 18 Routing | E1-P1/P4/P6/P8 | Kind/scope/owner, mixed meaning, partial permission, no duplicate authority. |
| 19 Find order | E1-P4/P8 | Native investigation, current evidence, glossary, relevant history and clear gaps. |
| 20 Cards | E1-P1/P4/P8 | Destination headings, unique numbers, Change/Summary/Your decision, uncertainty resolved. |
| 21 Index/checker | E1-P3/P7/P8 | Three deterministic indexes, limits, read-back, failure remains unfinished. |
| 22 Lifecycle | E1-P4/P8 | In-place changed truth, useful history, approved consolidation and repaired links. |
| 23 Feedback | E1-P1/P4/P8 | Defaults plus sourced project feedback; no invented reasons or policy override. |
| 24 Plain requests | E1-P4/P6/P8 | Each outcome reachable without command vocabulary. |
| 25 Codex | D1-P1, E1-P5/P7/P8 | Same shared records and behavioral tests; explicit capability/coverage gaps. |
| 26 Documented use | D1-P1, E1-P5/P7 | Current source/installed-version mapping and observed adapter proof. |
| 27 Activation | E1-P7, F1-P1 | Opt-in complete setup, version, checks, actual per-project adoption. |
| 28 Inbox | E1-P1/P4/P8 | Exact card, durable authority, pending/conflict/resume/idempotent completion. |
| 29 Native judgment | D1-P1, E1-P4/P5/P8 | Lean reminders/receipts, narrow objective checks, no semantic engine. |
| 30 OS integration | E1-P2/P6/P7/P8, F1-P1 | One owner per record; tracker/manual/publication integration and rollout proof. |

## Instruction audit baseline — 2026-09-18

This is a source-level coverage audit, not completion of the future instruction
rewrite or a fresh-session acceptance test. The local checkout includes the
approved #269 refinements; `origin/main` at c77082e includes the merged document
Notes workflow. Inspect both until the shared checkout is safely reconciled.
The merged Notes guidance is shipped source, but project refresh is separate.

This dated audit describes pre-build source. The current assessment above
supersedes its claims about what is missing today. The table names the instruction owner and content to reconcile for every
requirement. Package owners above own the work. The earlier evidence matrix
supplies each row's acceptance scenario. Every row remains open for final text
review and observed behavior; no row is passed merely because a source exists.

Source names below resolve to these existing locations:

- Manual: `plugins/second-brain/skills/second-brain/references/templates/knowledge/knowledge-manual.md`, installed as `knowledge/knowledge-manual.md`.
- Skills: `plugins/second-brain/skills/`; old recall/remember/retire/reflect/session-search/second-brain procedures migrate to the four selected skills.
- Cards: `remember/references/proposal-template.md` within that skill directory.
- Templates: `second-brain/references/templates/` within that skill directory; destination is the planned knowledge-setup family.
- Hooks: `plugins/second-brain/hooks/`; tools: `plugins/second-brain/tools/`; installed copies and registration are under `.claude/` and `.codex/` as applicable.
- Integration: session-skills guidance, project-init setup/sync and rules, work-tracker guidance, and `knowledge/toolkit-manual.md`. Preserve component owners and configured paths.

| R | Owning instruction and consuming surfaces | Required content reconciliation |
| --- | --- | --- |
| 1 | Manual routing; setup/templates/tools | Keep editable records and one owning location; explain rename/deletion recovery and new layout. |
| 2 | Manual startup; root routes; startup hook; skills | Correct required read order, complete-read acknowledgment and missing-content handling; remove unconditional whole-manual rereads from remember and reminder. |
| 3 | Manual obligations; save/review skills; completion and action hooks | Describe required outcomes, affected-work pauses and recovery; a reminder or invocation alone is insufficient. |
| 4 | Manual continuation; current/inbox templates; handoff/work guide | Resume from current records and document Notes; distinguish pending saves from delivered work. |
| 5 | Manual find policy; knowledge-find | Select relevant sources before broad investigation without imposing unnecessary lookup for every action. |
| 6 | Manual trust; find/save references | Cite the actual source and date where required; do not use an index line as evidence. |
| 7 | Manual glossary route; find/setup/templates | Define glossary location, table format, aliases and excluded index treatment. |
| 8 | Manual source routing; find/setup/index instructions | Add source-capture metadata and grouped index guidance; preserve external text as source material. |
| 9 | Manual saving; save skill; helper assignment; hooks | Explicit parallel assignment, verified commit/push, quiet review, ready-save grouping and durable recovery; remove routine no-result announcements. |
| 10 | Manual permission; save/review/setup; fields/checker | Distinguish individual approval, existing scope and automatic-save setting; store the grant once and auto-save indication per memory. |
| 11 | Manual selection; save/review; reminder | Preserve project relevance and significance; real-fix exception must survive reminder wording. |
| 12 | Manual exclusions; save/review; reminder | Reject unsuitable lasting memory without discarding valid PRD, task or procedure updates; remove blanket rejection of useful failure lessons. |
| 13 | Manual working state; current template; checker/handoff | New location and structure, multiple concurrent items, 5,000-character requirement instead of current 2,000. |
| 14 | Manual fields; templates; save/lifecycle/checker | Topic and subtopic ownership, source/context/group/update fields, automatic-save marker and conditional approval fields. |
| 15 | Both manuals; all skills/references/cards/examples/hook wording | Literal plain language, explained exact names, enough operational detail, no metaphor or jargon; check proposals and saved text. |
| 16 | Manual PRD rules; templates; requirements/design/upkeep skills | R16 finalization records approved requirements, not proof of delivery; remove remember's built-first definition. Preserve bottom Notes and shared PRD versus local work-item requirement ownership. |
| 17 | Manual routing; save and integration guidance | Identify actual portable skill-authoring procedure and its permissions; local machine availability does not establish toolkit delivery. |
| 18 | Manual routing; all knowledge skills; component guidance | Route by information kind, scope and owner before memory eligibility; avoid duplicate authorities. |
| 19 | Manual find order; find/history adapter | Reconcile stop-at-first-answer wording with conflicts, current verification and missing context; history availability must be explicit. |
| 20 | Manual proposal summary; Cards; save/review | Replace old Why/Where/From/Unsure/Checked card with required destination sections and Change/Summary/Your decision; resolve material uncertainty first. |
| 21 | Manual validation; index/checker instructions; setup | Three grouped indexes, actual field/size rules and saved-text readback; existing static checks prove only the old contract. |
| 22 | Manual lifecycle; save/review; retirement references | Keep changed truth in the owning topic; shared complete save procedure; remove retire's no-commit/push boundary and avoid automatically creating replacements. |
| 23 | Manual feedback; review/save/template/checker | Actual owner feedback and source; revisit fixed 8,000-character cap against R21 and selected feedback design. |
| 24 | Four skill descriptions; catalogs; root routes | Plain-language requests select the correct procedure without requiring skill names. |
| 25 | Manual/skill host-neutral wording; Codex setup/hooks | Same required outcomes on Codex, actual supported coverage, no Claude-only instruction treated as universal. |
| 26 | Setup/host references; hook instructions | Current official contracts and tested versions; no unsupported event or enforcement claim. |
| 27 | Setup/sync/manual/root routes/manifests | Complete opt-in activation, trusted hooks, coherent installed text and migration; source merge is not target adoption. |
| 28 | Manual pending state; Cards/save/review/inbox template | Remove no-queue-on-silence instruction; preserve unanswered proposals without approving them and recover authorized interrupted saves. |
| 29 | Manual responsibilities; skills/hooks/helper contracts | Agent selects meaning; scripts check objective conditions; acknowledgments neither approve nor prove understanding. |
| 30 | Both manuals; all integration entry points | Consistent record ownership, scoped permissions and publication; account for merged Notes workflow and still-planned consolidated work-item storage. |

### Independent source review findings

A separate read-only review confirmed the main content risks against the PRD:

- R13: the current template has one item and a 2,000-character cap; the required
  file has project context and multiple active items, at the new path, with the
  5,000-character cap. Changing only its filename is insufficient.
- R14: the manual's flat layout omits required group, context, and update fields
  and the allowed topic/subtopic structure.
- R22: the manual lifecycle section and retire steps require a replacement file;
  the PRD requires changed truth to remain in its owning topic file. Rewrite the
  procedure and its examples together with validation.
- R11: the manual's broad list of lasting facts lacks the PRD's significance
  test; the reminder also needs the carefully scoped real-fix exception.
- R16: remember currently ties finalized status to a finished build; requirements
  approval and delivered behavior are separate in the PRD. Reconcile this in all
  trust/status wording, not just the write procedure.
- R23: the feedback path, logging shape, and 8,000-character limit describe the
  current implementation, not an approved requirement to preserve them.

These findings remain in merged c77082e source; the Notes changes do not resolve
them. The audit therefore cannot certify current instruction content as aligned.

### Technical validation completed and still required

Executed in the current checkout: 39 startup-contract checks and 22 installed-copy
checks passed. These test existing code and copy consistency. The proposed
`plugins/second-brain/tests/` suite does not exist yet. No new-host behavior is
claimed, and no installed settings or runtime were changed by this audit.

Source inspection confirms two immediate limits: the current startup loader
prints content in its old order, and the current reminder carries conflicting
policy text. Neither can serve unchanged as evidence for the approved design.
D1-P1 must use isolated proof fixtures and record actual host/version, effective
trusted configuration, observations and failures for H1–H6. First prove startup
instruction, actual content delivery, acknowledgment, and missing-content
handling; next prove parallel helper lifetime/results/recovery and bounded
completion. Current passing tests cannot substitute for those model-session
proofs. Keep claims about CLI and desktop behavior separate.

## Milestone exits and publication

| Milestone | Exit condition |
| --- | --- |
| Design ready | D1-P1 evidence, reconciled master/PRD, material choices visible, applicable separate approvals recorded. |
| Contracts ready | Manuals/templates/publication and metadata fixtures agree; no placeholder manual path remains in a deployable package. |
| Integrated build ready | Runtime, skills, setup, installed copies, versions, and tests agree in a disposable project. |
| Release candidate | Representative sessions pass on both supported hosts; any unmet requirement is explicitly unresolved rather than claimed done. |
| Delivered | Owner acceptance and authorized target adoption verified; tracker and PRD upkeep reflect actual outcomes. |

Documentation-only planning updates follow R25 directly on main after scoped checks. All future executable hooks, behavior-bearing skills/rules, configuration, and inseparable documentation changes use implementation worktrees and normal review. Builders never commit unrelated staged work. The main conversation links this plan from D1 and E1 and maintains task status there.

## Consolidated audit implementation ownership — 2026-09-19

This extends the existing instruction audit. It is not another policy source or
runtime manifest. The [consolidated audit](reviews/2026-09-19-consolidated-audit.md)
controls disposition of the earlier reports. Task `01a0bc82-6a7b-7ba2-a158-be7cedf02a9f`
owns residual fixes and cross-package acceptance, on
`issue-269-knowledge-integration-audit`. The Knowledge package owner remains
responsible for #269 tracker writes. These owners agreed their file boundaries
before implementation.

| Consolidated finding | Owner and owning surface | Scenario and present disposition |
| --- | --- | --- |
| Racing/repeated saves and durable authority | Knowledge package: save/recovery reference and `inspect-knowledge-save.mjs`; audit task: cross-package acceptance | Same reference, lost push response, unrelated parallel save. Recovery inspector's Git fixtures belong to Knowledge; actual agent recovery remains separate. No second ledger or distributed exactly-once claim. |
| Local-only pending work and reconnect | Knowledge package: same recovery procedure; audit task: acceptance | Offline laptop, stale second computer, conflicting remote change. Local durability never implies shared visibility. End-to-end proof remains open. |
| Mixed-topic sources and narrow approval | Knowledge package: memory template/save procedure; audit task: schema and behavior tests | Schema tests preserve an ordinary mixed topic with observed sample, inferred cause and superseded history. Schema success does not prove claim-level meaning or authority. Fresh-reader/update trial remains open. |
| Useful information lost through exclusions | Knowledge package: core routing and task procedures; audit task: behavior cases | Mixed conversation must preserve useful research, design rationale and requirements in their owners. Owner participation and the real-fix exception stay as approved. Fresh-agent proof remains open. |
| Executor permission, failure, cancellation and late result | Knowledge package: helper assignment/recovery; audit task: host integration | Helper lacking interaction returns an unfinished step to foreground. Cancellation/late result must inspect actual state. Host proof remains open; an inspector is not a background executor. |
| Native-memory conflict | Knowledge setup owner, with coordinator for product decision | Inspect and report effective competing memory without changing settings or importing/deleting data. Handling policy remains unresolved. |
| Outdated/overstated host evidence | Toolkit delivery owns its evidence; Knowledge/audit own later tests | Toolkit PR #363 has Codex CLI full-read and resume evidence via root fallback, not proven hook attribution. Claude hooks ran but expired OAuth prevented model execution. Desktop, Windows, forced compact/clear and asynchronous parity remain unproved. |
| Root/helper identity, trust and budget | Toolkit owns generic delivery; Knowledge owns adapter; audit owns integration cases | No root checkpoint may be satisfied by helper completion. Untrusted launch, truncated reads and late events remain named host proof gaps. |
| Reliability and instruction-arrangement evaluation | Audit task, with coordinator for any product change | Declare outcomes before repeated model trials; report each scenario, host, version and uncertainty. Keep visible acknowledgment baseline. No fixed trial count or measured-improvement claim is adopted. |
| Instruction drift | Existing plan audit, maintained by audit task with component owners | Atomic obligations below connect canonical owner, consuming surfaces and actual evidence. Whole-system acceptance remains open. |

### Schema/index delivery and cross-surface obligations

The first audit PR implements backward-compatible E1-P3 tools. The managed
manual's exact `knowledge-schema:2` marker selects the new contract; absent
marker preserves legacy layout/index generation. A malformed or duplicated
marker fails rather than guessing. This PR does not activate the new manual,
migrate project records, or declare the project equipped with the new system.
Knowledge's subsequent package owns activation, frozen checksum, migration,
manual explanations and final release metadata.

| Obligation | Canonical owner and consuming surfaces | Evidence and reconciliation |
| --- | --- | --- |
| R10/R14 individual approval versus standing permission | Manual permission; memory/project templates; save procedure; checker | `tests/knowledge-schema.test.mjs` rejects partial approval, quoted/false automatic markers and mixed modes. Earlier auto-saved records remain valid after revocation. No permission is inferred from the checker. |
| R14 topic continuity and claim distinctions | Memory template; save/review; checker/indexer | Mixed-topic fixture preserves all body text and distinguishes edit dates from verification. Actual claim selection and scope require agent review. |
| R16 approval means required behavior, not delivered behavior | Manual/PRD template; requirements helper; checker/indexer | Unapproved proposed PRD accepted; finalized requires real approval fields; memory-only fields rejected. Legacy `current` stays readable only in v1. |
| R21 discoverable source-owned summaries | Source fields; memory/PRD/captured-topic templates; builder/checker; startup index paths | Three deterministic grouped link indexes, exact summaries, parent/child PRDs, glossary exclusion, move/rename and stale-index cases. Strict limits count Unicode code points: summary under 200, current under 5,000; no v2 feedback/body cap. |
| R27 coherent activation and recovery | Managed manual marker; setup migration; templates; checker; both startup hosts | Missing required files, leftover legacy active locations and malformed source metadata fail. Managed manual checksum remains mandatory. Structural validity is not host readiness. |

Run `node --test tests/knowledge-schema.test.mjs` for the schema cases. The
fixtures use synthetic records and do not modify project knowledge. While the
repository's managed manual is still v1, v2 fixtures explicitly expect its
checksum mismatch after adding the marker. All other results must pass; this
is structure testing, not evidence that the new manual has been activated.

Independent Sol review found that relationship fields accepted directories or
symlinks, and that an invalid later index target could leave an earlier index
rewritten. Both were repaired with regression fixtures. Missing project
permission frontmatter intentionally leaves per-save approval on. No new
permission setting is enabled by installation or validation.

Remaining audit work follows the stable Knowledge package: actual mixed-routing,
approval-scope and recovery trials, cross-package host integration, and final
finding disposition. The schema PR is a dependency, not completion of this audit
or parent #269. Product decisions about native memory, retention, consent and
changed acknowledgment remain with Mike.

Manual upkeep for this dependency: reviewed both active manuals. Neither active
workflow changes before v2 activation, so no policy/manual copy is changed here.
The Knowledge package owner owns the v2 manual, templates and checksum together.

### Actual agent trials — 2026-09-20 UTC

This is a dated historical evidence record carried forward from commit
`59145272872af43d848ff5df205e9154bf94da77`. The current delivery state,
remaining gaps and ordered work are in the
[delivered-versus-required assessment](#delivered-versus-required-assessment-2026-09-20)
above. This record does not override that assessment, prove native host delivery,
grant approval, or establish full-system acceptance.

The audit task's [behavior harness](../../../tests/knowledge-behavior/README.md)
records prompts and expected outcomes before execution, exact copied-source
hashes, source Git state, raw Codex events, final responses, file hashes, Git
state, latency and reported usage. Mechanical assertions and independent
meaning review remain separate. The following are focused single trials, not
reliability estimates or whole-system acceptance.

The first three trials used Knowledge dependency `c07ae485e632d44821af7865bfe71617853e4620`
with its active v1 manual, and handoff `0905d8ea14660b435bfacc32be4161250c6d64f1`.
They ran GPT-5.6 Sol through Codex CLI 0.154.0 on macOS 26.6.2 arm64 with Node
25.8.1, `--ignore-user-config`, ephemeral sessions and the workspace-write
sandbox. Synthetic repositories had local bare remotes. No authentication,
trust or global configuration was changed.

| Trial | Independently reviewed outcome | Time and reported tokens (input / cached input / output / reasoning output) | Local raw evidence |
| --- | --- | --- | --- |
| Capture and publish handoff | Local capture preserved unrelated work and approval boundaries. Model publication failed because sandboxed Git metadata was read-only; response accurately reported local-only state. The failed trial is retained. | 195.192 s; 948727 / 901888 / 6331 / 1860 | `/tmp/knowledge-behavior-v1-pilot/handoff-capture-publication/` |
| Resume from owning record | Passed meaning review: reads the newer owning-record next action and preserves absent implementation approval; no edits. Raw exact-string assertion failed on equivalent wording and remains unchanged. | 63.555 s; 140839 / 116608 / 1474 / 404 | `/tmp/knowledge-behavior-v1-resume/handoff-resume-owning-record/` |
| Overflow without a destination | Passed preservation review: all files and HEAD unchanged, current remains 1,847 code points, all 18 constraints and existing work preserved. Complete response retains the new constraint, unresolved ownership question and absent approval, and says capture did not succeed. | 206.547 s; 436295 / 393216 / 4897 / 1355 | `/tmp/knowledge-behavior-v1-overflow/handoff-overflow-preserves-context/` |

Each trial directory retains `result.json`, `events.jsonl`, `final-response.md`,
`before.json`, `after.json`, `prompt.txt`, `expected.json` and
`source-snapshot.json`. The run root retains host/source state in `run.json`.
These temporary paths are local evidence, not portable artifact storage; the
table preserves the reviewed findings. Early result files used a mechanical
`passed` field; the reusable runner now labels mechanical results explicitly
and requires independent meaning review.

The first failed publication was separately recovered in the foreground using
the desktop session's existing permissions and the same local remote. Reviewed
destination commit `c00ecbf8b27a0e6b57c23a7b910f6d48dc5bf63b` and pending-state
cleanup `26b50eb754255e00019dc4a7119f12a2fd8e5f08` were remotely verified; a fresh
clone contained exactly one saved handoff and the preserved prior work. The
commands and read-back are retained in the capture trial's
`foreground-recovery/result.json`. This does not change the failed CLI result
or prove asynchronous helpers, network authentication or another computer.

The v1 fixtures copied this repository's Toolkit manual rather than the portable
template and were not full project-init installations. Their evidence is
limited to the reviewed handoff behavior. Future fixtures use the shipped
template. No v2 execution is valid until the complete actual package passes its
installed checker before the model starts. Native hook attribution, desktop
parity, Windows, compact/clear recovery, asynchronous helper lifetime, competing
native memory and broader rollout remain separate evidence obligations.

### Combined implementation review

The independent Sol reviewer inspected the complete Knowledge candidate at
`ac6e2ace9f256f05ebbd4767f0fc8cad4f3610c4`: manual, four skills, startup/prompt/
completion, recovery inspector, migration preservation, setup and consumers.
The remaining legacy `remember` caller in solution-design was changed to
`knowledge-save` with the legacy fallback. Startup confirmation now names its
three core files explicitly. The reviewer reapproved clean
`09d11032c209228183ede0ddecb4dc0492ca1d06` after inspecting those changes and
matching source/installed copies. This establishes source review, not behavior
or host acceptance.

The review executed 6 checkpoint, 12 recovery, 12 package/startup and 5 System
Guide cases, plus link (405), orphan (226), installed-copy (26), knowledge
(19 files), plugin and diff checks. Separately, schema PR #365 at
`f5e47dc8d095bc4e51399124a633fe821dad9b80` passed 38 schema cases and independent
review. Its final regression rejects a dangling index output symlink before
writing any index or creating the unintended target.

Actual inspection found and the Knowledge owner fixed a stale-clone recovery
defect: fetching a remote commit without updating tracking references left it
outside `git log --all`. The inspector now includes the verified remote tip in
the inspected history, with a regression. Root/helper and explicit stale-review
fixtures pass, but native Stop events lack validated generation correlation.
A late Stop can affect the newer turn's continuation state; this remains a
documented host acceptance gap. Explicit stale receipt rejection does not prove
late native event isolation.

The Knowledge owner's subsequent new-install executable check found a circular
dynamic import in the copied completion hook (exit 13), despite passing direct
module tests. The `09d1103` review therefore does not establish executable hook
readiness. The owner corrected the dependency in `361a56a` using a shared manual
resolver with no hook imports and added a copied-command regression. Independent
review reapproved that runtime revision, its seven-file bundle and copy parity.
Later `6567067` changes only current-work/setup bookkeeping.

### Version-2 agent evidence

The corrected candidate `361a56a95e9556e8954fb6b3418ba8e67fe539a8` supplied the
exact manuals, skills, tools and seven copied hook modules. All five scenarios'
fixture-only preparations passed the installed checker, source-copy checks,
three-index build, clean Git check and copied executable startup/prompt/Stop/
receipt/Stop sequence before model testing. Hooks remained unregistered: model
trials use the root/manual route, while command execution is separate evidence.
The earlier incomplete preflight fixtures were not used for model conclusions.

| Trial | Independently reviewed outcome | Time and reported tokens (input / cached input / output / reasoning output) | Local raw evidence |
| --- | --- | --- | --- |
| Mixed provenance and withheld authority | All seven declared meaning outcomes passed: distinguishes newer owner fact from stale memory, proposed requirements from delivered code, unavailable Guide from memory, task state from lasting facts, and outside source from project authority. Names conflicts and missing measurement evidence. Files and HEAD unchanged; no unauthorized save. | 56.365 s; 136755 / 114432 / 2451 / 502 | `/tmp/knowledge-behavior-v2-routing-361a/mixed-provenance-routing/` |
| Recovery after successful push with lost response | Passed declared recovery outcomes: stale reader inspected actual local remote, found published destination/index and exact approved UUID, verified the remote tree, avoided replay and preserved unrelated pending authority. Fetch was sandbox-blocked; cleanup stayed pending and the response separated it from verified destination publication. | 98.71 s; 332779 / 296576 / 4237 / 1559 | `/tmp/knowledge-behavior-v2-recovery/` |
| Newest-first and equal-time handoffs | Passed local capture, order and preservation: newer Theme, new equal-time Export follow-up, existing equal-time Audit, then undated Legacy. Current remained 2,114 code points; source, constraint, owning record, first action and absent approval retained. Only current-work changed; no commit; sandbox-blocked publication accurately reported. | 256.3 s; 793718 / 738688 / 5562 / 1124 | `/tmp/knowledge-behavior-v2-order-361a/handoff-newest-equal-order/` |

The Knowledge owner's additional read-back identified an R6 formatting miss:
the mixed trial collected sources at the end instead of putting the source on
the next line of each finding. Its seven declared routing/authority outcomes
pass; source-format compliance does not. This trial does not certify every
manual obligation, and no general instruction-compliance claim is made.

This bounded audit implementation delivers schema validation, a reusable trial
runner and the reviewed outcomes above. It does not close the full acceptance
task. Still unexecuted: actual new-project setup and legacy migration by a fresh
agent, disabled/check-only operation, Claude model sessions, desktop and Windows
parity, clear/compaction recovery, instruction-budget/truncated-host delivery,
parallel conflicting saves across computers, helper lifetime/cancellation and
late results, and repeated trials comparing instruction arrangements. The
native Stop correlation limit and R6 formatting miss remain open. Native-memory
handling, retention and changes to approved consent or acknowledgment behavior
remain owner decisions. The existing #269 roadmap owns this remaining work.

Manual upkeep for this test/evidence change: both manuals reviewed. The runner
changes no installed behavior or permission; candidate manual and setup updates
remain in the Knowledge package. No additional manual edit is required here.

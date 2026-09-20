# Toolkit manual: content and instruction delivery review

Reviewed 2026-09-19 against repository commit `e026e09`. Coordinating task:
`01a0bc26-7c41-7400-9db3-0901bb13b18b`. This is a review record for
[the Toolkit Operating System](../../knowledge/prds/toolkit-operating-system/toolkit-operating-system.md),
beside the [Knowledge System design](269-knowledge-system.md). It is not a new
operating policy or an approved delivery design.

The review findings below describe the original baseline. The later
[implementation and verification](#implementation-and-verification) section
records the authorized repair and its remaining host evidence limits.

## Result

The [Toolkit manual](../../knowledge/toolkit-manual.md) explains the workflow
and component responsibilities well. It needs small status and clarity
corrections, not a rewrite. Agents are **not assured of receiving it**: there
is no plugin-owned reusable template, installation step, root startup route, or recovery
path for this manual in the inspected implementation.

Two additional delivery defects matter. This actual Codex session received a
shortened Knowledge startup message, with the full text saved to a temporary
file. Also, a copied knowledge hook silently emits nothing when invoked through
a macOS path alias. Neither defect is repaired by the manual edits in this
review.

## Authority and scope

- The sole Toolkit manual source found in the repository is
  `knowledge/toolkit-manual.md`. It remains a review draft. There is no plugin-owned reusable
  template to reconcile with it. The separate Knowledge manual has a managed
  template under `plugins/second-brain/skills/second-brain/references/templates/knowledge/`.
- [Issue #306](https://github.com/Mar5929/claude-toolkit/issues/306) is CLOSED,
  its board status is Done, and its label remains `02-refinement`. The close
  event names Mar5929 at `2026-09-19T22:47:38Z`, with no associated commit.
  No accompanying acceptance statement was found. Its body and Progress log
  still describe broader review and installation work as open. Preserve the
  owner's closure; do not infer full acceptance, reopen it automatically, or
  use its state as delivery evidence.
- The umbrella PRD is `proposed`, with separately settled decisions and shipped
  parts. R6 requires project-applicable Toolkit orientation and manual delivery;
  its own text says this does not establish that the manual shipped. R25
  publication guidance, the Knowledge manual rename, the upkeep rule, and work
  management changes did ship. Their PRs prove those scopes, not R6 delivery.
- Parent Toolkit OS work owns manual delivery through the intended
  project-init/project-sync interface. Knowledge System #269 owns its component
  policy and coordinates its startup/reminder interface. The inactive
  `issue-269-core-manual-draft` is a separate proposal, not installed policy.
- Authorization covers review, safe verification, and corrections consistent
  with approved behavior. New runtime mechanisms, policy, and implementation
  merges retain their existing approval route.

## Review method

Two GPT-5.6 Sol agents actually ran, as explicitly requested:
`manual_content_review` independently compared the full parent PRD, approved
decisions, current source, and work scenarios; `manual_delivery_review` traced
both hosts, shipped and installed material, and safe startup checks. Each read
and challenged the other's findings. The lead checked the tracker, reproduced
the startup failure, inspected the actual session spill, and checked current
official host documentation. No host settings or runtime source were changed.

File line references below describe the `e026e09` review baseline. Section
names remain useful after the small documentation corrections.

## Findings and evidence

| Finding | Evidence | Implication and smallest next action |
| --- | --- | --- |
| **F1. Toolkit manual delivery is absent.** | Manual lines 3–8 and 301–313 disclaim activation/distribution. The sole repository document is `knowledge/toolkit-manual.md`; searches find no plugin-owned reusable source/template or setup/sync delivery step. `plugins/project-init/skills/project-init/references/thin-claudemd.md:78–89`, `references/setup-flow.md:174–185,299–303`, and `plugins/project-init/skills/project-sync/SKILL.md:553–558,715–740` describe the Knowledge manual route. `CLAUDE.md` has no Toolkit manual startup pointer. | Retain the manual; design its reusable source, project-specific links, installation, root routing, and updates under parent R6. A copy with toolkit-repository links would not work in an ordinary project. |
| **F2. The configured startup loader cannot supply the Toolkit manual.** | `plugins/second-brain/hooks/knowledge-session-start.mjs:28–47` lists SOUL, the Knowledge manual, project/current context, and two indexes. Lines 83–126 emit that list. `.claude/settings.json` and `.codex/hooks.json:4–18` register this loader for `startup`, `resume`, `clear`, and `compact`. Direct runs from the primary checkout emit Knowledge content with no Toolkit reference. | This proves the current loader's omission. It does not prove every host event fires or that every byte emitted reaches the model. Adding a file to a repository or to a hook is insufficient acceptance evidence. |
| **F3. Actual Codex startup content was incomplete.** | This task's initial injected message reported 5,262 original tokens and 304 omitted tokens. Its saved output contained 21,039 characters / 21,045 bytes, the Knowledge manual marker, and no `toolkit-manual.md` reference. Part of the approval proposal format was absent from the initial preview. `.codex/hooks.json:13` sets `additionalContextLimit: 5000`. | Hook execution and full output on disk are observed; complete initial model receipt is not. Required-content reads and recovery after spilling need explicit design and tests. The lead read the missing approval section while reviewing; that later read does not prove automatic recovery. |
| **F4. Aliased hook paths silently skip execution.** | `node tests/knowledge-startup-check.mjs` fails its copied-bundle case at lines 254–268 with `0 !== 1`. Loader line 129 compares the canonical module path to `resolve(process.argv[1])`. Identical copied files invoked through `/tmp/...` produce no manual; `/private/tmp/...` produces the marker once. The configured `/Users/...` path works. | A real entry-point portability bug, exposed by the test. Keep the failing case; separately fix the path comparison and verify alias and canonical paths. This review does not change code or claim current configured startup failed. |
| **F5. Available release and active skill versions differ.** | Main has project-init 0.75.2 and work-tracker 2.8.0. This session's advertised Codex skill paths point to project-init 0.75.1 and work-tracker 2.7.0. Second-brain is 4.10.3 in both. The inspected Claude marketplace checkout is at `48a0988`, nine commits behind `e026e09`. Repository installed-copy checks pass. | A current repository does not establish current machine/plugin skills. Refresh and project adoption need their own recorded evidence. Refreshing alone will not install a Toolkit manual that has no packaged delivery route. |
| **F6. Small document defects remain.** | Manual opening uses ongoing-development wording for closed #306; the resumption paragraph's “It checks” has an unclear subject. Parent PRD R9/R11, lines 266/301, point to old Knowledge README section anchors. R25 lines 584–607 call its expanded publication contract unshipped/proposed despite shipped evidence at 534–550. | Correct manual provenance/clarity and the two moved section links. Record the R25 wording conflict for the PRD owner; this review does not change requirement meaning or approval state. |

The source search is scoped to this repository, its relevant installed copies,
and the inspected machine caches. It is not an inventory of every project or
machine. No missing feature is inferred solely from a marketplace entry.

### Actual startup evidence

The model-visible message began with `Warning: truncated output (original token count: 5262)`
and reported `304 tokens truncated`. The full output was inspected at this
machine-local path (temporary evidence, not a portable repository file):

```text
/var/folders/rw/v2t0rhbs65g84mbl3h2ttfj40000gn/T/hook_outputs/01a0bc26-7c41-7400-9db3-0901bb13b18b/4b351256-7cf5-410b-99ac-ff65789c1c54.txt
SHA-256: 992dd58a7cfa2b1b87171860afc48153a9ae3bedfe4cec0c34c2f8570e7a844f
```

The relevant checked project configuration was:

| Host file | Event/matcher | Command | Other relevant fields |
| --- | --- | --- | --- |
| `.claude/settings.json` | SessionStart, `startup\|resume\|clear\|compact` | `node "$CLAUDE_PROJECT_DIR/.claude/hooks/knowledge-session-start.mjs"` | command handler; timeout 10 seconds |
| `.codex/hooks.json` | SessionStart, `startup\|resume\|clear\|compact` | `node "$(git rev-parse --show-toplevel)/.claude/hooks/knowledge-session-start.mjs"` | command handler; timeout 10 seconds; `additionalContextLimit: 5000`; status “Loading the knowledge manual and project map” |

The actual Codex receipt establishes execution in this task. Registration in
the Claude file is configuration evidence only. The Windows command was read
but not executed. No full effective-configuration equivalence across hosts is
claimed from these project files.

## Manual content against the requirements

| Practical scenario | Manual coverage and requirement | Result |
| --- | --- | --- |
| Owner describes a problem in ordinary words. | “What the toolkit is for” and “Establish the goal and current position”; R1–R2, R6–R8. | Clear goal, existing context, proportionate next step. No command memorization required. |
| A short question and a substantial build need different amounts of process. | “How the owner and agent work together”; R7, R23. | Useful distinction preserved. Do not add ceremony to every question. |
| A project selects only some components. | Opening scope, project orientation, and “Keeping the project equipped”; R3–R5. | Explains machine/project/session separation and optional System Guide. Distribution is still missing, including for projects without Knowledge enabled. |
| Required behavior disagrees with the live system. | “Understand the relevant system”; R9, R11–R12. | Requirements, observations, and historical decisions answer different questions. Proposed behavior is not called deployed behavior. |
| Owner corrects requirements during design. | “Decide the change and organize the work”; R8, R10 and component continuity rules. | Actual document and bottom Notes change; tracker retains overall status and links. Detailed Knowledge save rules remain with their owner. |
| Agents help with delivery. | Work-plugin offer and focused-helper paragraphs; R16, R24 and shipped guided-work rules. | Accepted/declined/revoked delivery choice persists; helpers do not supply owner approvals. Existing permissions remain applicable. |
| A work item finishes or moves to another session. | “Deliver and leave the records ready to continue” and “Pausing, resuming, and switching work”; R17–R20. | Acceptance, publication, deployment, and fresh-session behavior remain distinct. Tracker/current source is reread. |
| A save fails or another session has changed the destination. | Failed-save paragraph and publication-owner link; R18, R25. | Local write, unpushed commit, and remote publication stay distinct. Detailed concurrency/recovery is linked rather than duplicated. |
| A reusable improvement must reach projects. | “Keeping the project equipped”; R21–R22. | Describes adoption separately from release. Needs concrete current manual-delivery status. |
| New work-item format and Knowledge draft coexist. | Manual lines 238–244 match shipped PR #362. Knowledge policy links still point to the active manual, not the #269 draft. | Correct current behavior and component ownership. No schema or Knowledge-policy duplication is needed. |

These are content comparisons, not live end-to-end acceptance runs. The full
R1–R25 proposal was read; open component policy questions remain with their
existing owners. The manual should not independently settle them.

## Host contracts and remaining proof

Official documentation was checked on 2026-09-19 after the local implementation
and captured documentation review.

- Claude Code adds plain SessionStart stdout as model context. Current docs
  also limit each stdout/additional-context string to 10,000 characters; larger
  output becomes a saved file plus a preview, without an instruction to read
  the saved file. This is a documented risk for the 21,039-character Knowledge
  output, not an observed fresh Claude run in this review.
  [Claude hooks: output and size behavior](https://code.claude.com/docs/en/hooks).
- Codex SessionStart supports startup/resume/clear/compact and places stdout
  in developer context. Oversized output spills to a file and reaches the model
  as a preview; the handler threshold is configurable. The actual session
  observation above agrees with that contract.
  [Codex hooks: SessionStart and large output](https://learn.chatgpt.com/docs/hooks).
- Codex assembles its AGENTS instruction chain when a run starts. Project
  `.codex` settings and hooks require project trust; user settings are separate.
  This session's hook receipt shows execution here, not trust or effective
  delivery in every checkout. Disabled hooks and trust changes remain negative
  acceptance cases.
  [Instruction discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
  [project configuration and trust](https://learn.chatgpt.com/docs/config-file/config-advanced).
- Skills supply task-specific instructions when selected or invoked; discovery
  does not imply that every skill body or linked manual has been read. The
  inspected Toolkit skills do not supply the missing Toolkit startup route.
  [Claude skills](https://code.claude.com/docs/en/skills),
  [Codex skills](https://developers.openai.com/codex/build-skills).
- Marketplace refresh retrieves release changes. It does not establish that
  existing projects adopted copied files or that an active session reloaded
  them. The toolkit's project-sync workflow remains the project adoption owner.
  [Claude marketplace updates](https://code.claude.com/docs/en/plugin-marketplaces#plugin-marketplace-update).

Do not append the full Toolkit manual to the existing startup output and call
delivery solved. The baseline manual is 20,429 characters by itself. Preserve
its useful detail while designing a short orientation that leads to explicit
reads of applicable canonical guidance. Exact read scope, acknowledgments,
failure handling, and recovery are design decisions still requiring their
existing approval route. A receipt establishes reading/intent, not understanding
or durable compliance.

| Acceptance case | What is established now | What remains to be demonstrated |
| --- | --- | --- |
| Fresh Claude and Codex sessions | Configured Knowledge loader; direct stdout; truncated current Codex startup preview. | Installed Toolkit path, actual model-visible orientation, complete required reads, honest acknowledgment, and correct use in a small task on each host. |
| Relevant skill invocation | Skills and component links exist. | Invoke an applicable workflow and show the actual resolved skill/manual versions and use of its relevant instructions. |
| Resume, clear, compaction | Both configurations match these start sources; host documentation describes lifecycle support. | Exercise each route in each host; verify restored guidance, current tracker/approval state, and no false retention claim. |
| Missing/unreadable manual, stale link, spill-file loss | Knowledge loader has its own missing-file behavior; no Toolkit-manual contract exists. | Surface the actual gap and avoid a false readiness acknowledgment; recover through the approved route. |
| Oversized output | Codex spill happened in this session; current Claude docs describe its cap. | Prove complete required-content reads after spill on both hosts, including when output changes size. |
| Trust disabled, hooks off, timeout | Host contracts explain configuration limits. | Observe graceful and honest behavior without assuming the project hook ran. Do not weaken trust to pass the test. |
| New/updated/selectively equipped project | Setup/sync lacks the Toolkit manual. | Verify correct project-specific links, choices preserved, current installed version, and a new session after adoption. |
| Aliased/copied worktree path | Canonical path succeeds; alias fails. | Repair through implementation review and prove both paths without dropping the failing test. |

## Checks performed

| Check at the review baseline | Result and limit |
| --- | --- |
| `node tests/link-check.mjs` | Pass: 302 file links across 236 Markdown files. It deliberately ignores section anchors. |
| `node tests/installed-copy-check.mjs` | Pass: 23 checks. No Toolkit-manual packaged/copy pair is in its contract. |
| `node tests/orphan-check.mjs` | Pass: 196 shipped files reachable from 59 indexes. Does not prove host context delivery. |
| `node .claude/tools/check-knowledge.mjs` | Pass: 13 records. Does not establish parent-PRD acceptance or Toolkit delivery. |
| `node tests/knowledge-startup-check.mjs` | **Fail:** copied-bundle test, `0 !== 1`; independently reproduced by lead. Remaining suite checks report no other failure. No all-green startup claim. |
| Direct installed and copied hook runs | Current `/Users` execution and canonical temp path emit Knowledge content; `/tmp` alias emits none. Command-level checks only. |
| Manual/parent section-link inspection | Manual's two section links resolve. Parent R9/R11 have two stale anchors, invisible to the standard link check. |
| Actual task startup output and saved spill | Knowledge content present, Toolkit absent, initial preview shortened. Full-file presence does not prove full initial model receipt. |

No fresh Claude session, forced Codex compaction, trust change, plugin refresh,
project sync, deployment, or runtime repair was performed. Such results are
outstanding proof, not passed tests.

## Disagreement resolutions

1. **Closure versus acceptance.** An initial content suggestion risked turning
   #306 closure into accepted/current manual status. The lead challenged this;
   both reviewers agreed to retain the draft label and preserve the native
   closed state separately from incomplete delivery evidence.
2. **Hook output versus host receipt.** Cross-review narrowed direct-script
   claims to stdout. The lead's actual spill evidence further corrected the
   claim from “Knowledge manual received” to “partial initial content received;
   full text saved.” Both reviewers accepted the distinction.
3. **Test defect versus runtime defect.** The initial delivery finding called
   the alias failure test portability. The lead noted that the hook itself
   silently skips execution. The reviewer confirmed a runtime entry-point
   defect, with configured `/Users` behavior still working. Canonicalizing only
   the test would conceal the failing path.
4. **Parent versus Knowledge ownership.** Parent R6 owns Toolkit orientation;
   #269 coordinates its Knowledge interface. Neither the closed item nor this
   review transfers parent delivery into the Knowledge draft.

## Precise change summary

The documentation correction is limited to:

1. Preserve the Toolkit manual's **Review draft** status; change its opening
   provenance to past tense and state #306 is closed without inferring acceptance.
2. In “Keeping the project equipped,” identify the repository-only source and
   absent reusable template/setup/sync route. Preserve pending host and context-recovery
   design, useful workflow detail, and component ownership.
3. Give the resumption check an explicit subject: “The agent checks whether the
   tracker or relevant sources changed since the handoff.”
4. Repair only the two parent PRD links from `../../README.md#...` to
   `../../knowledge-manual.md#...`. Do not change requirement meaning or approval
   metadata.
5. Publish this review and a discoverability link in the designs index.

Runtime recommendations remain proposals: design/install the Toolkit manual,
prove complete delivery and recovery on both hosts, fix the aliased entry point,
and establish adoption of current releases. The parent PRD owner should
separately reconcile R25's stale delivery wording and select the tracker home
for outstanding parent delivery work while respecting #306's closure.

## Baseline review notes

- Two Sol reviews, reciprocal challenges, and lead verification are complete.
  No unresolved substantive reviewer disagreement remains. Final review also
  clarified that a marketplace checkout can contain the repository document
  without providing a plugin-owned template or a project installation route.
- The Knowledge System draft stays inactive. No approved Knowledge policy,
  runtime file, configuration, host trust setting, or issue status changed.
- Next: review this evidence and choose the authorized parent delivery design
  scope. Use the acceptance table above before claiming agents reliably receive
  and use the manual. Coordinate the Knowledge-facing interface with #269.
- Publication follows the coordinated main-checkout documentation route; the
  coordinating task records the verified remote commit. Baseline startup
  failure remains recorded. Publication checks cover these documentation
  changes and do not certify runtime correctness. Both manuals were reviewed;
  the managed Knowledge manual needs no policy or content change for this review.

## Implementation and verification

Mike subsequently authorized this bounded implementation and two GPT-5.6 Sol
helpers. He then authorized merge after checks and independent review in
coordinating task `01a0baf5-bc72-7a22-91f3-3781f5dafef9`. The owning #306 record
preserves that approval and its existing closed state. This does not approve
the whole Toolkit OS proposal or the separate #269 Knowledge policy draft.

### Delivery design

Project-init 0.76.0 owns the full reusable manual at
`plugins/project-init/library/templates/toolkit-manual.md`, its setup/sync
procedure, and `library/hooks/toolkit-session-start.mjs`. Every equipped
project receives `knowledge/toolkit-manual.md` and the complete-read route in
its root instructions, independently of optional Knowledge and System Guide.
The generic template preserves the useful workflow detail without links that
require this repository's plugin source tree. Sync preserves project choices
and approved adaptations and reconciles an existing handler instead of adding
duplicates.

The Toolkit hook is registered ahead of Knowledge at SessionStart for startup,
resume, clear, and compact. Hook execution need not be serialized; the Knowledge
message explicitly tells the agent to follow Toolkit orientation first. The
Toolkit hook requests complete root/manual reads, chunked recovery
from shortened output, and acknowledgment only after those reads. A shorter
UserPromptSubmit reminder restores attention to the same owner without
requiring another acknowledgment every turn. Missing, empty, unreadable and
incomplete root guidance is reported honestly. Neither hook writes state,
enforces policy, nor prints full document bodies.

Second-brain 4.11.0 preserves the shipped Knowledge file order and canonical/
legacy conflict handling. Its output now names complete required reads rather
than emitting their bodies or only index entries. Both hooks canonicalize
entry-point aliases and derive the installed project root when no host root
variable exists. This repairs the actual `/tmp` versus `/private/tmp` defect
without hiding it in the tests. The Knowledge manual's startup explanation and
managed checksum change together; its policy blocks are unchanged.

Both project host configurations and installed copies are updated. The root
instruction route applies when hooks are unavailable. Source registration
examples explicitly invoke PowerShell for Windows. Host trust is preserved.
No machine cache, authentication, unrelated project, or optional-component
choice is changed.

### Verification evidence

Two Sol helpers implemented separate areas, challenged each other's work, and
reviewed the integration. The final runtime review found no material scoped
blocker. It verified both copies, event registration, fallback wording,
portable paths and missing-guidance behavior. The lead fixed the review finding
that an available AGENTS pointer could conceal its missing CLAUDE target.

Deterministic checks pass: Toolkit startup 10 cases, Knowledge startup 41,
installed copies 24, System Guide integration 5, and Knowledge validation 13
records. With all new files staged, link checks pass for 338 links, orphan checks pass
for 208 files across 60 indexes, and plugin validation and whitespace checks
pass. Regenerating both indexes leaves no changes.
The Toolkit cases use a copied project with spaces, aliased and nested paths,
large manual bodies, unavailable files, and optional components absent. Hook
output remains short as file bodies grow; the tests do not score model replies.

Actual host evidence used a disposable project at
`/private/tmp/toolkit-host-proof-5fmbm8vf`. Logs are machine-local temporary
evidence, not permanent toolkit state:

| Host and run | Observed result | Limit |
| --- | --- | --- |
| Claude Code 2.1.271, fresh project-only run | SessionStart and UserPromptSubmit hook events both report success/exit 0; bounded outputs were 855 and 212 characters. | OAuth session expired before model work. Complete manual reading, acknowledgment and context recovery were not tested. Authentication was not changed. |
| Codex CLI 0.154.0, fresh read-only run using gpt-5.6-sol | Read the whole generic manual in two chunks, read current task, used fixture-only tail marker COPPER-ORCHARD and respected the unapproved deployment boundary. | The isolated run ignored user configuration. A fixture-only event log remained absent, so this demonstrates the root fallback, not hook execution or trusted project settings. |
| Same Codex session resumed after fixture guidance changed | Reread the whole manual and current task, used new tail marker SILVER-MEADOW, and named the revised approved action. | Demonstrates actual resume reads through the fallback. It does not exercise forced clear or compaction. |

Raw logs are `claude-start.jsonl`, `codex-start.jsonl`,
`codex-persistent-start.jsonl`, and `codex-resume.jsonl` in that fixture. Codex
resume session was `01a0bc82-3124-7771-8b16-7bb6c1bd1c55`. Fixture markers and
logging instrumentation are test-only and are not shipped.

### Remaining evidence and integration

Complete Claude model delivery remains unavailable until its normal login is
restored. Actual trusted Codex hook receipt, clear/compaction in both hosts,
Windows invocation, disabled-hook/trust behavior beyond the observed fallback,
and helper-context inheritance remain unproved. Configuration and passing
unit tests do not count as those results. These limitations do not prevent the
reviewed source repair from merging; they prevent a claim of fully accepted
both-host operation or rollout to existing projects.

Knowledge task `01a0bc7c-5260-73f1-87a5-1667ace91b1e` owns the separate core
manual/procedure package and will integrate this delivery change first before
changing Knowledge paths, order or checksum. Audit task
`01a0bc82-6a7b-7ba2-a158-be7cedf02a9f` owns residual cross-package tests/evidence.
This change preserves the shipped Knowledge order and leaves #269 open for its
broader acceptance. Release, project adoption, and host acceptance remain
separate claims.

## Notes

Implementation and both independent reviews are complete. [PR #363](https://github.com/Mar5929/claude-toolkit/pull/363)
merged the reviewed source at `4566444`; source publication is complete. Issue
#306 is the publication and continuation record, but its closed state does not
by itself establish acceptance. Native Claude model receipt, trusted Codex hook
receipt, clear/compaction, Windows, disabled-hook or trust behavior, project
adoption, and broader rollout retain the limits recorded above. No other-project
rollout is authorized by this work.

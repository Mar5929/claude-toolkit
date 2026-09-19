# Instruction audit fixes

Build plan for [issue #360](https://github.com/Mar5929/claude-toolkit/issues/360).
The issue owns scope, acceptance, authorization, and task status. Mike authorized
planning and implementation on 2026-09-19. Merge and final acceptance remain separate.

## Approach

Correct the seven priority findings in the audit from task
`01a0bafd-84d8-7000-b964-7bcf07bb4b78`. Keep the current architecture and its
approval boundaries. The other policy alternatives in that audit are outside
this change. Existing knowledge rules remain authoritative; #269's proposed
runtime and automatic-save design are not activated.

Use short instructions at the existing decision points. The agent judges source
authority, material detail, and authorization. No new hook, score, classifier,
or acknowledgment mechanism is needed. Tests check concrete output and copies;
scenario review does not claim that a host reliably follows an instruction.

## Changes and ownership

| Work | Files and approach | Owner |
| --- | --- | --- |
| Knowledge consistency | Correct the emitted memory reminder; qualify recall's stopping condition; prepare and validate the entire supersede before one publication. Change the existing hook and recall/remember/retire skills; reconcile the installed hook. | Knowledge Sol agent |
| Setup consistency | Replace the obsolete embedded rule inventory with its canonical index; separate toolkit-source refresh authority from target changes and explicit read-only audits in project-sync/machine-sync. | Workflow Sol agent |
| Complete concise replies | Replace categorical omission and sentence-limit language in the existing Plain English style; preserve voice and reconcile the installed copy. | Style Sol agent |
| Approval continuity and integration | Clarify recorded approval versus current stage in root instructions; reconcile descriptions, affected manual explanations, manifests, and release metadata. | Astra lead |

Each agent owns disjoint files. The lead handles all commits, tracker updates,
version changes, and publication. Reviewers exchange areas after implementation.

## Validation

1. Verify a useful project failure lesson remains eligible while routine logs
   remain excluded; inspect actual emitted reminder text.
2. Exercise complete supersede planning, a validation failure, and an interruption
   before publication. The old record, replacement, references, and generated
   indexes form one approved change; failed preparation is never reported saved.
3. Check a provisional current note against conflicting authoritative evidence,
   and check that a sufficient ordinary answer does not trigger an exhaustive scan.
4. Compare a simple answer with a failed-check report and a requested multi-finding
   audit. Material limitations and useful references survive concise wording.
5. Verify setup uses active indexed rules and does not reconstruct retired ones.
6. Verify recorded approval remains valid at stage 08, while an unexplained stage
   label cannot supply missing approval.
7. Verify source refresh can proceed under a normal sync request, but explicit
   read-only audits mutate neither toolkit source nor target configuration.

Use bounded independent scenario review, plus relevant hook tests and the four
repository checks: links, orphans, installed copies, and knowledge startup.
Run knowledge validation and plugin validation. Record observed executions,
source review, and untested live-host behavior separately in the issue.

## Publication

This plan follows the direct documentation route. Implementation and dependent
explanations stay together in the isolated worktree and PR. Bump the two changed
plugins and marketplace metadata; existing installations adopt after merge through
plugin refresh and project-sync. Do not claim adoption from source publication.

## Notes

2026-09-19: The seven priority fixes are implemented in
[PR #361](https://github.com/Mar5929/claude-toolkit/pull/361), head `b455f37`.
The plan is fulfilled through implementation and validation; merge and owner
acceptance remain pending. Current main was merged into the implementation
branch, preserving #359 and subsequent documentation changes.

Cross-review corrections cover whole-invocation read-only audits, choosing the
complete lifecycle publication route before writing, and resuming unfinished
approved supersedes. Startup/index wording follows the manual's existing
finalized/legacy-current contract; the index and empty template were regenerated.
The knowledge manual needed no edit. The toolkit-manual explanation is included
with implementation. Full evidence and scenario limits are on #360.

Next: owner review of PR #361; merge only after approval. Other projects adopt
through plugin refresh and project-sync after merge. Live-host reliability and
instruction-overload measurements remain separate tests. No known implementation
blocker. Related #269, #337, and #358 retain their scope.

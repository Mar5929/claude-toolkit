# 269-knowledge-system: the working records behind the design

This folder holds the material that produced the single living master at
[`docs/designs/269-knowledge-system.md`](../269-knowledge-system.md):
the research reports, the two design leads' briefs, and every review and fix
list.

The older research, briefs, and completed reviews are history, not alternative
designs. The current planning records below support the master. Where a record
and the master design disagree, reconcile the evidence and update the master;
research findings do not silently change an approved requirement.
Where the master design and the
requirements document disagree, `knowledge/prds/toolkit-operating-system/knowledge-system.md` is right.

`process.md` says how the design was made and where the work stands.
`prep.md` is the design prep file, filled in after the fact.
[Detailed solution design reference output](detailed-solution-design-reference-output.md)
preserves the full earlier draft. It is historical reference; the living master
owns current design decisions. Do not maintain two current designs.
[The design walkthrough](design-walkthrough.md) is the active scenario-led
review companion. It records the current step, accepted answers, and remaining
choices; accepted design answers are reconciled into the master. Its unapproved
proposals do not change the PRD or approve a build.

## Current implementation planning

- [Three-agent scenario and architecture review](reviews/2026-09-19-consolidated-audit.md):
  complete PRD/design review, primary-source evidence, scenario gaps, and
  recommendations revised after challenge. Review findings are not adopted policy.
- [Implementation plan](implementation-plan.md): recommended build sequence,
  concrete files, dependencies, requirement coverage, acceptance, and rollback.
- [Host capability evidence](host-capability-evidence.md): dated observations,
  official source contracts, capability limits, and required runtime proofs.
- [Implementation readiness review](implementation-readiness-review.md):
  independent requirement coverage, resolved findings, and remaining decisions.
- [Independent Knowledge behavior review](reviews/2026-09-20-independent-behavior-review.md):
  interim evidence from three citation trials, deterministic checks, final source
  review, and unresolved action-review, native-save, and host limitations.
- [Independent requirements review](reviews/2026-09-20-independent-requirements-review.md):
  interim R1-R30 matrix, dispositions, source heads, verification, and open gates.
- [Startup and recovery proof](reviews/2026-09-20-startup-recovery-proof.md):
  portable R2 prompts, commands, outcomes, setup failures, and bounded host limits.
- [Independent native-save review](reviews/2026-09-20-native-save-independent-review.md):
  bounded Codex Desktop helper save, overlap, result-return, and recovery findings.
- [Native-save helper proof](reviews/native-save-helper-proof/README.md):
  corrected trial summary with the normal-save and lost-response recovery records.
- [Independent action-checkpoint review](reviews/2026-09-20-action-checkpoint-independent-review.md):
  source findings, deterministic checks, editorial disposition, and delivery limits.
- [Native action-checkpoint proof](reviews/2026-09-20-native-action-checkpoint-proof.md):
  controlled Codex CLI trial, authorization deviation, and current-target limits.
- [Toolkit Operating System gap assessment, 2026-09-21](reviews/2026-09-21-toolkit-os-gap-assessment.md):
  non-Knowledge requirements documents compared with what ships at `9c71a90`;
  review evidence, approves nothing.

These records were requested on 2026-09-17 for autonomous design reconciliation
and implementation planning. Their publication does not claim runtime delivery
or replace the work item's approval and acceptance records.

Every record was written by an agent. The earlier roles are: an Opus research agent,
the peer Fable design lead, the main Fable design lead, an Opus reviewer, and
an Opus fixer. `process.md` says what each role did.

## research/

### Native hook correlation — 2026-09-20

[Native hook correlation evidence](research/2026-09-20-native-hook-correlation.md)
preserves the Claude Code 2.1.271 and Codex CLI 0.154.0 event inputs, exact
commands, correlation conclusions and untested surfaces used for the bounded
Codex completion-hook correction. It does not establish a Claude prompt-to-Stop
mapping or general host ordering guarantee.

### Claude Projects comparison — 2026-09-20

[Claude Projects redesign and Toolkit OS](research/2026-09-20-claude-projects-redesign.md)
preserves Terra's comparison, official sources, overlap findings and proposed
host tests. Source research only; recommendations are not adopted policy.

### Instruction-delivery research — 2026-09-19

Two GPT-5.6 Sol agents investigated how fresh working agents receive guidance,
how automatic extraction is instructed, and what that means for this toolkit.
These detailed reports preserve their findings and commit-pinned sources:

- [Hindsight and claude-mem](research/2026-09-19-hindsight-claude-mem-instruction-delivery.md).
- [Supermemory and Mem0](research/2026-09-19-supermemory-mem0-instruction-delivery.md).

The [master design's comparison](../269-knowledge-system.md#proposed-refinements-after-memory-provider-research--2026-09-19)
owns the resulting proposals and decision status. Reports are evidence, not
instructions or approval to adopt a provider. This is a different question from
the older `r5-alternatives.md` storage/architecture comparison below.

### Earlier research

| File | What it is | Written by |
| --- | --- | --- |
| `r1-claude-code-capabilities.md` | What Claude Code can do: hooks, skills, plugins, rules, settings, and the limits on each, checked against the live documentation on 2026-09-16 | An Opus research agent |
| `r2-codex-capabilities.md` | The same question for Codex, read from the Codex source at commit 9771934 because the documentation site was blocked | An Opus research agent |
| `r3-current-implementation.md` | An audit of the knowledge system the toolkit ships today: every file, hook, skill, tool, test, and the couplings between them | An Opus research agent |
| `r4-history-digest.md` | Every decision recorded on issue 269 and the related requirements documents, in date order | An Opus research agent |
| `r5-alternatives.md` | A survey of other agent memory systems and what each one does about the same problems | An Opus research agent |
| `verification-report.md` | A check of every citation in the two leads' briefs. It found 31 errors, which went to the fixers | An Opus reviewer |

## briefs/

| File | What it is | Written by |
| --- | --- | --- |
| `outline.md` | The first outline of the design document's sections | The main Fable design lead |
| `main-decision-brief.md` | The decisions the design rests on, with the reason for each, and the three disagreements between the two leads and how each was settled | The main Fable design lead |
| `peer-requirements-critique.md` | A critique of all 30 requirements: what each one asks for, what a harness can and cannot do about it, and where the wording is unclear | The peer Fable design lead |
| `peer-design-sketch.md` | An independent design of the whole system, written without reading the main lead's brief | The peer Fable design lead |
| `peer-decision-notes.md` | The peer lead's notes on the consolidation round | The peer Fable design lead |

## reviews/

### Scenario and architecture review — 2026-09-19

The [consolidated audit](reviews/2026-09-19-consolidated-audit.md) owns the
reconciled recommendations. These reports preserve the independent findings
and the changes made after discussion; they do not establish new policy.

- [Requirements and scenarios](reviews/2026-09-19-requirements-scenarios.md):
  requirement coverage and failure scenarios.
- [Host compatibility](reviews/2026-09-19-host-compatibility.md):
  instruction delivery, executor limits, and host evidence gaps.
- [Architecture and instruction quality](reviews/2026-09-19-architecture-antipatterns.md):
  architecture risks and evaluation recommendations.
- [Requirements reassessment](reviews/2026-09-19-requirements-reassessment.md):
  revised severity, recovery scope, and preserved permissions.
- [Architecture reassessment](reviews/2026-09-19-architecture-reassessment.md):
  proportionate testing and reuse of existing records.

### Earlier reviews

| File | What it is | Written by |
| --- | --- | --- |
| `review-1-requirements.md` | Round one: does the design meet all 30 requirements | An Opus reviewer |
| `review-2-harness.md` | Round one: is every claim about Claude Code and Codex correct | An Opus reviewer |
| `review-3-philosophy-ux.md` | Round one: does the design follow the stated philosophy, and can it be read | An Opus reviewer |
| `fix-list-round-1.md` | The main lead's ruling on every round-one finding | The main Fable design lead |
| `fix-list-round-1-addendum.md` | Further round-one rulings, added after the first list was written | The main Fable design lead |
| `fix-report-round-1.md` | What was changed in the design for round one, fix by fix | An Opus fixer |
| `review-4-round2-fixes.md` | Round two: a check that every round-one fix landed | An Opus reviewer |
| `review-5-round2-fresh.md` | Round two: a fresh reading of the design as the owner and as an intern | An Opus reviewer |
| `fix-list-round-2.md` | The main lead's ruling on every round-two finding | The main Fable design lead |
| `fix-report-round-2.md` | What was changed in the design for round two | An Opus fixer |
| `review-6-round3-final.md` | Round three: a final pass over the whole design | An Opus reviewer |
| `fix-report-round-3.md` | The four round-three edits and the decision block that was added | An Opus fixer |

## Two things to know before reading a record

File paths beginning `/tmp/` in older records pointed at the session's own
scratch folder, which no longer exists. Those older records preserved the
material selected for lasting use. Current review records may also name
temporary raw traces as evidence boundaries; those traces are not claimed as
permanent repository artifacts.

Five labels and one marker name were rewritten in these copies so that
`tests/knowledge-startup-check.mjs` passes on the `docs/` folder. The five
proposal labels are in backticks instead of bold, and the manual's policy
marker name is written with a space in place of its colon. Nothing else was
changed.

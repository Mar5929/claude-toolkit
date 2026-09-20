# Architecture audit rebuttal and revised recommendations

> Review evidence, not adopted policy. Read the [consolidated disposition](2026-09-19-consolidated-audit.md) before acting on recommendations. Original severity and proposals below may be revised by the linked reassessments.

**Date:** 2026-09-19
**Scope:** response to the parent review of F3, F9, and F10 in `/tmp/269-architecture-antipattern-audit.md`. This refines recommendations only. It changes no requirement, design, runtime, tracker, or repository file.

## Position on the approved per-message acknowledgment

The per-message reminder and intent acknowledgment remain the approved product baseline. My audit did not mean that an alternative should be adopted before approval. The correct next step is a comparative experiment: implement or simulate variants closely enough to measure their outcomes, then bring evidence back if a requirements change appears justified. Until Mike approves such a change, R3/R9/R29 and the design’s selected every-prompt acknowledgment govern.

The design already states the right semantic limit: the acknowledgment proves receipt and intent, not completed review, correct classification, or permission. The evaluation should therefore test whether it adds incremental value while retaining it as the current acceptance condition.

## F3 revision — extend the existing instruction audit; do not create another manifest

### Defended finding

The drift risk is real: one obligation is delivered through manuals, hook wording, skills, helper assignments, templates, and integration guidance. However, the implementation plan already contains the correct home for controlling this risk:

- lines 186–188 require one row for every R1–R30 requirement with approved behavior, canonical instruction source, installed destination, owner, and evidence;
- lines 204–215 require review of each applicable surface;
- lines 423–476 provide the instruction audit baseline and identify owning and consuming surfaces.

My proposal for a separate “instruction manifest” would duplicate that work and contradict the project’s preference for one owner per meaning.

### Concrete delta

Use the existing instruction-audit table as the authoritative review artifact and add only fields or subrows that it does not yet make explicit:

1. **Atomic obligation:** split a broad requirement row only when it contains independently delivered obligations. For example, R9 has prompt review, required review moments, quiet no-change behavior, helper execution, and verified publication. One R9 row can conceal drift among them.
2. **Canonical wording owner:** name the single source that owns the full meaning of each atomic obligation. Other surfaces state their necessary local trigger or point to that owner.
3. **Required delivery surfaces:** list every surface that must carry some form of the obligation, including whether it carries full policy, a compact trigger, a template, or an objective check.
4. **Behavior scenario ID:** link each obligation to at least one scenario that can fail if the delivery is missing or contradictory.
5. **Reconciliation state:** record aligned, intentionally different with reason, unresolved, or not applicable. Do not require byte-identical prose.

These are columns or child rows in the existing audit, not a new runtime artifact, generated manifest, or permanent knowledge store. Stable IDs can be simple review labels such as `R9-prompt-review`; they need not appear in shipped user files unless implementation finds that useful.

### Revised recommendation and severity

- **Severity:** Medium before instruction acceptance, reduced from High as a standalone architecture finding because the plan already owns most of the remedy.
- **Recommendation:** Complete and slightly deepen the existing audit. Do not add another mandatory artifact.
- **Product approval:** No, while it preserves approved meaning. Any discovered contradiction that changes behavior still returns to its requirement owner.
- **Evidence to close:** Choose five obligations that cross four or more surfaces, mutate or omit one consuming surface in a fixture, and verify the audit plus scenario test exposes the mismatch. The audit is sufficient when a reviewer can trace one meaning from requirement to every delivered form without reading the entire repository blindly.

## F9 revision — risk-scaled repeated trials, not arbitrary fixed counts

### Defended finding

The evaluation gap remains significant. The PRD and design provide strong scenario coverage, but do not yet define enough experimental discipline to distinguish a real behavior improvement from run variance or proxy compliance. This matters before selecting among reminder and checkpoint variants.

The original “5 for smoke, 20+ near threshold” wording was a heuristic, not an established standard. Neither Anthropic nor OpenAI prescribes those counts for this product. Fixed counts chosen in advance without observing variance can waste trials on deterministic failures or provide false confidence for noisy semantic outcomes.

### Revised evaluation protocol

1. **Establish outcome baselines first.** Run the smallest current/native baseline and the approved design variant on the same scenario seeds. Record task correctness, valid-update recall, false-positive saves, routing errors, authority errors, false completion claims, recovery success, owner-visible interruption, tokens, latency, and tool/file load.
2. **Use deterministic cases once during plumbing checks.** Schema validation, missing-field rejection, index determinism, link repair, and known Git states do not need repeated model trials when the outcome is entirely code-driven.
3. **Use repeated trials for model-dependent outcomes.** Begin with a small pilot sufficient to observe whether failures vary across runs. Estimate the observed failure rate and variance separately by scenario, model, host, and variant.
4. **Allocate more trials to consequential or close decisions.** Continue sampling when variants are close, failures are rare but severe, or confidence intervals are too wide to support the decision. Stop early when a mechanism deterministically fails, the effect is large and stable, or further trials cannot alter the product decision.
5. **Predefine decision rules before the comparison.** Examples: no increase in unauthorized writes; no false completion claims in seeded failure cases; materially lower missed-update rate without an agreed unacceptable increase in owner-visible boilerplate or ordinary-task degradation. Exact thresholds are product choices informed by baseline rates.
6. **Grade outcomes independently of the prompt mechanism.** Blind semantic graders to the variant when practical. Use code graders for state, independent model graders for meaning, and selected human review. An acknowledgment or hook firing is trace evidence, never the outcome score.
7. **Preserve raw denominators and uncertainty.** Report trials, failures, confidence intervals or another honest uncertainty summary, host/model/version, and scenario mix. Do not combine dissimilar cases into one reassuring pass rate.

### Revised recommendation and severity

- **Severity:** High, release-blocking for claims that the selected mechanisms improve reliability; not a “Critical” architecture defect in an unbuilt proposed system.
- **Recommendation:** Add the risk-scaled protocol to the implementation/evaluation work before runtime acceptance. Do not present 5/20 or any other count as a standard.
- **Product approval:** No to strengthen evidence. Yes only if the evidence supports changing an approved behavior such as the per-message acknowledgment.
- **Evidence to close:** A baseline report that gives per-scenario outcomes and uncertainty, compares the approved design with simpler variants, and shows that conclusions are stable enough for the stated product decision.

## F10 revision — recoverable at-least-once attempts with duplicate detection, not exactly-once execution

### Defended finding

The helper save path needs safe retry behavior. A helper can be interrupted after editing, committing, pushing, or successfully publishing but before reporting. A later session must determine what happened without repeating or widening the authorized change.

My original “zero or one time” phrasing could be read as exactly-once distributed execution across machines. Markdown and Git do not provide a simple atomic cross-machine claim, and adding a lock service or database would violate the simplicity boundary. A Git push race can also occur after any local check. The system should promise recoverability and duplicate detection, not impossible exactly-once semantics.

### Smallest Markdown/Git safe-publication contract

1. **Durable save reference:** every approved unfinished save has a stable reference in `knowledge/memory-inbox.md`, with destination, operation, approved meaning/scope, authority, source, and next step. This is already required by R28.
2. **Latest-state check before mutation:** the helper reads the latest destination, inbox entry, local branch, and remote default-branch state. It checks whether the approved result is already present. If present and valid, it verifies rather than reapplies.
3. **Scoped commit identity:** when a commit is needed, include the durable save reference in a commit trailer or another inspectable commit field. This is diagnostic identity, not authority. The content and recorded permission remain the authority.
4. **Compare before push:** fetch immediately before publication, verify the expected destination state still applies, and push normally. A refused push is an expected concurrency signal; never force-push.
5. **Reconcile after a refused or uncertain push:** fetch the remote branch and search both content and commit identity. If the intended authorized result landed, verify it and close the pending entry. If it did not, reread current content and retry only when the unchanged approval still applies. If meaning conflicts, preserve the pending entry and return the decision.
6. **One publisher per individual attempt:** the main agent assigns one helper for the current attempt and does not launch a second while that helper is known to be active. After interruption, activity may be unknowable; recovery relies on remote/content inspection, not a distributed lock claim.
7. **Idempotent content operation where practical:** express updates so detecting the intended final state is possible. Do not append a second identical event merely because the prior attempt’s report was lost.

This contract accepts that two machines may both prepare the same change. Normal Git remote serialization decides which push succeeds. The loser reconciles. Two distinct commits with equivalent content may occasionally be created locally; the system’s requirement is that canonical remote content, permission, and pending state converge without lost meaning or false completion. Avoid claiming that duplicate local work can never happen.

### Revised recommendation and severity

- **Severity:** High for delegated-save acceptance because interruption and uncertain completion are explicit requirements; Medium as an architectural complexity objection once this minimal Git contract is adopted.
- **Recommendation:** Use stable inbox references, content-before-retry checks, inspectable commit identity, normal push rejection, and post-failure reconciliation. Do not build a distributed lock service or claim exactly-once execution.
- **Product approval:** No, if this implements R9/R28’s approved recovery behavior and does not change authority or owner experience.
- **Evidence to close:** Fault-injection trials at pre-edit, post-edit, post-commit, push-in-flight, post-push/pre-report, and stale-helper return. Success means the remote ends with the approved meaning, no unrelated edit is lost, the inbox truthfully reflects state, and recovery does not ask for the same unchanged approval. Report duplicate local commits separately rather than hiding them.

## Net changes to the original audit

| Original point | Revised position |
| --- | --- |
| F3 proposed an instruction manifest | Retracted as a new artifact. Extend the existing implementation-plan instruction audit with atomic obligations, canonical owner, delivery role, scenario, and reconciliation state. Severity Medium. |
| F9 called the gap Critical and suggested 5/20 trial counts | Evaluation remains High and release-blocking for reliability claims. Counts are adaptive and risk-scaled from observed variance; no fixed number is presented as authoritative. |
| F10 implied atomic claim and zero-or-one application | Replace with a minimal Markdown/Git recovery contract: stable reference, inspect current/remote state, normal Git serialization, duplicate detection, and reconciliation. No exactly-once claim or new coordination service. |
| Per-message acknowledgment appeared ready for removal | It remains the approved baseline. Alternatives are experiments only; adoption requires empirical evidence and explicit product approval. |

These revisions preserve the original audit’s core conclusion: verify outcomes, measure context and owner cost, and select only machinery that earns its complexity. They also keep the project’s existing owners and approved product decisions intact.

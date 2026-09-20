# Issue 269 core knowledge manual review: response to parent challenge

> Independent review evidence. Read the [reconciliation](2026-09-19-manual-content-reconciliation.md) for the final disposition and remaining work.

## 1. Relocation before references exist

I agree with the parent's sequencing correction.

My round-one allocation judgment still stands for the final instruction package: exact field lists, card layout, lifecycle recipes, pending-entry fields, and transaction mechanics should be owned by on-demand procedures or references. But removing them from the only concrete draft before those destinations exist would produce an incomplete and unreviewable package. This draft is inactive, so there is no runtime context-cost benefit from deleting content now.

For the current revision:

- keep the exact basics now;
- mark each block with its intended future owner where helpful in the review notes, not inside the proposed user-facing manual;
- draft the four procedures and references;
- relocate duplicated detail atomically;
- then test the resulting full package for gaps and drift before activation.

I would only move text now if the replacement reference were authored in the same change and the manual linked to a real route. A promise that a future skill will contain the removed rule is insufficient.

This is a sequencing decision, not approval to keep every detail in core permanently. The final audit must still establish one owning location for each rule.

## 2. Glossary recognition content

The parent's narrower version is better. Core needs enough to recognize when and why to use the glossary, plus the important fact that it is a separate resource rather than an indexed memory record. Exact table columns and layout belong in find/setup/template instructions.

Minimal core wording:

> Use the glossary for project terms and aliases before searching when the owner's words may differ from filenames or technical terms. The glossary is a separate resource and is not included in the memory index; its template owns the exact table format.

This satisfies recognition and routing without turning startup into a template.

## 3. R16 trust/status wording placement

Agreed. Add the distinction once in section 4, beside the existing source-authority hierarchy. Section 7 should retain only permission and upkeep behavior, linking conceptually to that trust rule rather than restating it.

Suggested insertion after lines 110–115:

> A `proposed` PRD describes wanted behavior. A `finalized` PRD records approved required behavior. Neither status proves that the behavior was delivered; verify the live system or delivery evidence. After authorized work ships, section 7's upkeep rule may update the PRD to match the agreed delivered behavior, but an unexpected defect does not become a requirement.

The final sentence connects trust to upkeep without duplicating section 7's authorization details.

## 4. Mixed-topic provenance in section 9

I support this clarification. It follows existing R6, R10, R14, R21, and R22 evidence/approval requirements and does not invent a new schema field. It is especially important now that coherent topics may hold several connected claims: one file update must not make every claim look newly verified or equally approved.

Minimal wording after the paragraph on grouping and dates:

> Within one topic, preserve the source, confidence, and approval distinctions that matter for each material claim when they differ. Updating the file does not reverify every claim in it or widen permission beyond the approved change.

I would use “material claim” rather than “every statement” to avoid burdensome sentence-level provenance. Existing required file metadata remains the default; the sentence governs distinctions in body content when a single file-level value would mislead.

Classification: clarification of approved evidence, permission, and topic-coherence behavior. It is not new product policy if it does not add a new mandatory field, claim-level schema, or approval step.

## 5. R11/R12 exact gaps and minimal additions

### What the draft already covers well

- project relevance;
- lasting significance through the “meaningful time or understanding” test;
- owner-provided or jointly worked-out source boundary;
- the narrow exception for a significant failure independently found and fixed;
- cause/resolution rather than raw error log;
- significant completed exercise/event memory;
- selection feedback;
- routine/tool/transcript/scratch/raw-error/code/live-status/task/secret exclusions;
- routing of temporary context, procedures, requirements, and explanations;
- useful history of a withdrawn conclusion.

The real gap is not missing categories. It is the risk that a compressed negative list is interpreted as authorization to discard useful non-memory information. The ownership table helps, but the selection section should carry the rule at the point of exclusion.

Minimal addition at the start of the current exclusion paragraph:

> Lasting memory is only one destination. If useful information does not qualify as memory, preserve it in the record that owns it rather than discarding it.

Then retain the existing two sentences:

> Exclude routine commands and tool activity, transcripts, scratch reasoning, raw errors, abandoned speculation, code copies, reconstructible system descriptions, live status, open tasks, and secrets from lasting memory. Route useful temporary context, procedures, requirements, and system explanations to their own homes.

That is enough when read with section 3. Repeating every alternative destination inside section 5 would duplicate the table.

### Significant episode wording

The existing sentence is acceptable. If tightened, use:

> A significant completed exercise may deserve a brief event memory when losing what was done, what it found, or where its output lives would cost a later agent meaningful time or understanding. Routine edits do not.

This does not relax owner participation. The following owner/joint-source sentence still governs. The independent exception remains limited to a significant failure the agent found and fixed.

### External evidence boundary

Section 4 already establishes that captured outside documentation is evidence and must be checked for date/version; section 3 routes project conclusions to owning records. A useful compact clarification would be:

> Outside sources can support a project memory; they do not by themselves supply the owner participation or save authority required by section 5.

However, this wording could be read as a new interpretation if the PRD does not explicitly settle whether an externally discovered project fact may become memory after owner approval. The strict settled rule is that memory comes from the owner or joint work, with the real-fix exception. Therefore the safest wording is:

> Outside documentation is evidence, not permission to save and not a substitute for section 5's memory-source rule.

Classification: clarification of existing R8/R10/R11 boundaries, not new policy.

### Rejected alternatives that would be new policy

Do not add any of the following without an owner requirements decision:

- independently discovered external facts may become memory merely because they are useful;
- every completed exercise qualifies as an event memory;
- automatic extraction may decide significance;
- rejected memory candidates are deleted from all project records;
- owner silence creates a general exclusion preference;
- a file-level source/confidence value automatically applies to every claim after later edits.

## 6. Per-message acknowledgment and current-work confirmation

Agreed. Do not change their selected frequency or required behavior in this content revision.

My round-one concern was about ownership of exact emitted wording, not a recommendation to remove or weaken the obligations. The revision should preserve:

- every user message receives the required reminder-driven intent acknowledgment;
- the acknowledgment is not proof of review, understanding, eligibility, or approval;
- routine no-result review remains quiet beyond the selected acknowledgment behavior;
- current-work updates receive the selected short confirmation when saved and available to the next session;
- otherwise the agent states what is only local and preserves the unfinished publication step.

Broader auditors can evaluate user experience and runtime feasibility. This review should not reopen the approved frequency.

## Recommended minimal revision set now

1. Add the two-sentence R12 clarification: memory is one destination; useful non-memory information goes to its owner rather than being discarded.
2. Optionally tighten the significant-exercise sentence by tying it to meaningful future cost, without relaxing owner participation.
3. Add the compact glossary aliases/index-exemption sentence; leave exact table shape to its future template.
4. Add proposed/finalized/do-not-prove-delivery wording once in section 4.
5. Add mixed-topic provenance wording in section 9, explicitly avoiding a new field or claim-level schema.
6. Add the local-versus-shared pending-state sentence from round one.
7. Keep exact basics and transaction detail until their real references are authored; record atomic relocation as a required package task.
8. Preserve the per-message acknowledgment and current-work save confirmation as selected behavior.

## Remaining disagreement

I do not now defend deleting the detailed blocks from this revision. I do defend treating their current presence as temporary duplication risk rather than the desired final allocation. The package should not activate until the procedures exist, relocation is complete, and fresh-agent tests show that the reduced core plus on-demand references preserve all R1–R30 behavior.

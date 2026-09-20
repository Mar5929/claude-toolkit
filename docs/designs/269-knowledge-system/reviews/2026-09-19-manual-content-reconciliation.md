# Core knowledge manual: review discussion and changes

Date: 2026-09-19. Mike requested a GPT-5.6 Sol reviewer to challenge the
coordinating agent on the actual manual contents using the complete requirements,
latest decisions and approvals, host guidance, and four-provider research.
Baseline: manual draft `414d524`; canonical PRD through main `e026e09`.

## Result

The [revised manual](../core-knowledge-manual-draft.md) preserves the selected
architecture and approved behavior. It gives a fresh agent clearer instructions
for information ownership, evidence, and recovery. This is an inactive content
draft; it has not changed installed instructions or proved runtime behavior.

The independent reviewer passed the revision subject to narrowing one example.
That correction has been applied: project-authored research findings go to the
work item's supporting research, while the reason for rejecting a design
alternative goes to the designated design. The manual does not say all useful
findings belong in research.

## Review record

1. [Round one](2026-09-19-manual-content-round1.md) read the whole manual and
   mapped R1–R30 to core content, task instructions, and runtime proof. It proposed
   moving detailed save and schema instructions out of startup and identified
   missing recognition and ownership guidance.
2. [Challenge and response](2026-09-19-manual-content-round2.md) examined whether
   those removals would leave gaps before replacement references exist, where
   status rules belong, how much glossary detail is useful, and how to preserve
   evidence within topic files without inventing a schema.
3. [Independent final check](2026-09-19-manual-content-final-review.md) inspected
   the revised draft against the agreed recommendations and recorded one
   correction. The correction was applied exactly and checked in the saved text.

## What changed

| Manual section | Change | Requirement basis |
| --- | --- | --- |
| Responsibility | Points to the Toolkit manual for the overall operating process while retaining knowledge policy here. | R18/R30; no new startup read order. |
| Startup and continuation | Identifies glossary aliases and its separate index treatment; makes multi-item current-work context and the existing size boundary explicit. | R7/R13/R21; selected confirmation behavior preserved. |
| Evidence | Explains proposed/finalized PRDs beside the existing source hierarchy; neither status proves delivery. Captured outside sources retain origin, date/version, purpose, and separation from project conclusions or save permission. | R6/R8/R10/R11/R16/R19. |
| Memory selection | Leads exclusions with positive routing: useful information goes to its existing owner. Includes research and rejected-design examples. Ties significant-event memory to future usefulness. | R11/R12/R18; strict owner/joint-source rule and real-fix exception unchanged. |
| Save recovery | Distinguishes local, committed, and verified shared pending records. A local record can only support recovery where accessible. | R9/R28 and the accepted recovery walkthrough. |
| Topic quality | Preserves source, confidence, and permission distinctions where material claims differ. Updating a topic neither verifies all its claims nor broadens approval. | R6/R10/R14/R21/R22; no new metadata field or per-claim approval step. |
| Setup | Distinguishes installed source or a merged change from a project whose required parts are active and verified. | R25/R27; no runtime mechanism selected here. |

## Where the discussion changed the recommendation

**Detailed instructions stay until their replacement exists.** The reviewer
initially recommended removing card labels, schema fields, and transaction detail
from the core now. The coordinating agent challenged the timing: the four task
procedures and references are not yet authored. Both agreed to retain the exact
basics in this inactive draft, then move duplicated operational detail together
with its real replacement. No requirement is satisfied by a nonexistent link.

**Core recognition does not need a full glossary template.** Keep aliases,
purpose, and index exclusion in core; the exact table belongs with its template.

**Status meaning has one explanation.** Clarify proposed/finalized/delivered
beside the evidence hierarchy, while permission and upkeep stay in their existing
section. Avoid a second account of the same trust rule.

**Provenance needs clarity, not a new data model.** Use ordinary body context
when sources, confidence, or permission differ within a topic. A future template
must make that understandable; this revision adds no claim IDs or new schema.

**The selection issue is emphasis, not permission to relax rules.** The core
already includes the required memory categories. Strengthen routing at the point
of exclusion. Changing R11's owner-participation condition remains a separate
product proposal from the broader audit.

## Preserved decisions and remaining work

Per-message reminders and intent acknowledgments, current-work confirmations,
strict source eligibility, per-save approval by default, explicit project-wide
automatic-memory permission, topic organization, useful detail, Markdown/Git
authority, and the four-skill direction remain as recorded. Provider research
does not authorize automatic transcript extraction or a separate memory service.

The complete requirements/design remain unapproved; the manual remains inactive.
The four procedures/references, coordinated detail relocation, exact reminder
wording, host mechanisms, and fresh-agent tests still need work. This content
review does not prove full R1–R30 acceptance or delivery on either host.

Validation for this revision covers independent meaning review, the saved-text
correction, relative links, and whitespace. Publication is verified separately.
The broader [three-agent audit](https://github.com/Mar5929/claude-toolkit/blob/main/docs/designs/269-knowledge-system/reviews/2026-09-19-consolidated-audit.md)
owns its unresolved findings and recommendations; they are not silently adopted
by this manual edit.

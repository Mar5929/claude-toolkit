# How the design for issue 269 was made

Written for an agent who was not there. Everything below happened on
2026-09-16 unless a date says otherwise.

## What the owner asked for

On the night of 2026-09-15 the owner asked for two Fable design leads to run a
team of Opus agents. The team was to research and design the project knowledge
system from two sources: the requirements document at
`knowledge/prds/toolkit-operating-system/knowledge-system.md`, and the walkthrough the owner had already
approved at `knowledge/prds/toolkit-operating-system/knowledge-system-walkthrough.html`.

He set four instructions for how to design it:

- Use the mechanisms Claude Code and Codex already provide.
- Guide the agent and let it use its own judgment.
- Recommend a full refactor if a full refactor is better than a patch.
- Flag any requirement that does not fit, rather than quietly working around it.

## The nine steps

1. **Research.** Five Opus research agents ran in parallel, each writing one
   report. The first covered what Claude Code can do, checked against the live
   documentation. The second covered Codex, read from the Codex source at commit
   9771934, because the Codex documentation site was blocked. The third audited
   the implementation the toolkit ships today. The fourth digested every
   decision recorded on issue 269 and the related requirements documents. The
   fifth surveyed other agent memory systems. A first launch was killed by an
   interruption, and the five were relaunched at 11:56 UTC.

2. **The peer lead's independent pass.** The peer Fable design lead wrote a
   critique of all 30 requirements and, separately, a design sketch of the whole
   system, without reading the main lead's work.

3. **The decision brief.** The main Fable design lead wrote a brief holding
   every decision the design would rest on. The two leads then consolidated in
   one round. Three disagreements came out of it. All three were settled, and
   the settlement is recorded in the brief.

4. **Citation check.** An Opus verifier read every citation in the two briefs
   against the source it named. It found 31 errors. All 31 went to the fixers.

5. **Drafting.** Two Opus writers each drafted one half of the design document
   from the brief. The halves were then joined into one file.

6. **Review round one.** Three Opus reviewers read the joined draft: one for
   requirements coverage, one for whether the claims about the two harnesses
   were correct, and one for philosophy and clarity. The main lead ruled on
   every finding and recorded the rulings in two fix lists. An Opus fixer
   applied them.

7. **Review round two.** An Opus reviewer checked that every round-one fix had
   landed. A fresh Opus reader, who had not seen the design before, read it
   twice: once as the owner, once as an intern who had to build it. The main
   lead ruled on the findings and an Opus fixer applied them.

8. **Review round three.** A final Opus pass over the whole design. It produced
   four small edits, and a one-page decision block was added at the front.

9. **Merge.** The design was merged to `main` in pull request 346 with the
   owner's approval. The owner then set the handshake principle, which is
   recorded in the requirements document's closing section, and answered
   question 1: hook delivery of the startup files counts as the startup read.

## Step, agent, input, output

| Step | Who | Input | Output file in this folder |
| --- | --- | --- | --- |
| 1. Research | Five Opus research agents | The requirements document, the approved walkthrough, the live Claude Code documentation, the Codex source at commit 9771934, the shipped toolkit, issue 269 | `research/r1-claude-code-capabilities.md`, `research/r2-codex-capabilities.md`, `research/r3-current-implementation.md`, `research/r4-history-digest.md`, `research/r5-alternatives.md` |
| 2. Independent pass | The peer Fable design lead | The requirements document, the approved walkthrough, the five research reports | `briefs/peer-requirements-critique.md`, `briefs/peer-design-sketch.md` |
| 3. Decision brief and consolidation | The main Fable design lead, with the peer lead | The five research reports, the peer lead's two documents | `briefs/outline.md`, `briefs/main-decision-brief.md`, `briefs/peer-decision-notes.md` |
| 4. Citation check | An Opus verifier | The two leads' briefs and every source they cite | `research/verification-report.md` |
| 5. Drafting | Two Opus writers | The decision brief | The joined draft, now `docs/designs/269-knowledge-system.md` |
| 6. Review round one | Three Opus reviewers, then the main lead, then an Opus fixer | The joined draft | `reviews/review-1-requirements.md`, `reviews/review-2-harness.md`, `reviews/review-3-philosophy-ux.md`, `reviews/fix-list-round-1.md`, `reviews/fix-list-round-1-addendum.md`, `reviews/fix-report-round-1.md` |
| 7. Review round two | An Opus reviewer, a fresh Opus reader, then the main lead, then an Opus fixer | The design after round one | `reviews/review-4-round2-fixes.md`, `reviews/review-5-round2-fresh.md`, `reviews/fix-list-round-2.md`, `reviews/fix-report-round-2.md` |
| 8. Review round three | An Opus reviewer, then an Opus fixer | The design after round two | `reviews/review-6-round3-final.md`, `reviews/fix-report-round-3.md` |
| 9. Merge | The owner and the main session | The design after round three | Pull request 346, merged to `main` |

## Delivery coordination

Mike requested coordinated team support on 2026-09-17, with this conversation
owning integration and the shared records. Prefer `gpt-5.6-sol` for focused
delegated work; the lead reviews findings and brings material choices to Mike.
Two bounded reviews are the immediate work: the routing scenario and the path
from the current design to release. Review assignments do not authorize runtime
implementation. On resumption, check actual task status rather than treating
this assignment record as evidence that a reviewer is still running.

Keep documents, design updates, and roadmaps on `main`, committed and pushed
as they are maintained, per Mike's explicit instruction. The main conversation
integrates changes; parallel reviewers return findings without competing edits.
The work item remains the owner of live progress and approvals. No additional
chat or duplicated handoff is needed while this conversation can continue.

Proposed delivery sequence, reusing the existing design's build plan:

1. Validate the cross-scope routing case and reconcile affected requirements
   and design assumptions. Present only unresolved owner choices.
2. Finish the remaining requirements/design review and obtain their approvals.
3. With build authorization, implement the agreed design in bounded pieces,
   with independent review of the changes.
4. Run the repository checks and representative session tests, including
   conversation-only capture, cross-session continuation, and failed-save recovery.
5. Complete the agreed rollout, verify the installed behavior, reconcile the
   final documentation, and obtain acceptance of the delivered outcome.

These are planning milestones, not new approval, acceptance criteria, or proof
that implementation or behavioral validation has happened. The existing PRD
and work item's completion criteria still control those decisions.

## Where this stands and how to pick it up

Updated 2026-09-17: the goal is to ship the refactored Knowledge System. Mike
estimates the requirements were 95–99% settled when design work began; this is
his estimate, not full requirements approval or measured delivery progress.
The design approaches above led to the draft now under review. An incidental
discussion exposed a possible Toolkit OS-wide routing gap: an aside about
another subprocess must reach that subprocess's proper record without requiring
a new session, while the original work remains resumable. Validate that case
and reconcile the design before continuing the remaining design decisions.

The requirements document `knowledge/prds/toolkit-operating-system/knowledge-system.md` is at
`status: proposed`, and issue 269 is at stage `02-refinement`. Nothing is
approved to build.

The design's section 1a lists eight decisions that come before the build.
Question 1 is answered: hook delivery of the startup files counts as the
startup read, and the check is that delivery finished. Questions 2 to 8 are
open.

The order of what is left:

1. Answer questions 2 to 8 from section 1a.
2. Answer the requirements-wording questions 9 to 12 in section 15.
3. Approve the requirements document.
4. Approve the design as the build plan.

Two other things to read before building. Section 13 lists the 23 places where
a builder could read a requirement differently from the way the design reads
it, with the design's recommended answer for each. Section 15 lists all 27
open questions, grouped, each with a recommendation.

One decision is pending on the design document itself. The toolkit gained a
solution-design template on 2026-09-16, in pull requests 344 and 345. This
design was written before that template existed and does not follow it. Whether
to reshape the design to the template has not been decided.

**The exact next action: validate the incidental, cross-scope information case
against the proposed save flow.** Read the latest requirements 9 and 18 and
the design's reassessment in section 13.2. The changed-file-count reminder was
rejected; question 2's replacement mechanism remains open. The scope-routing
clarifications are requirements for the in-flight design, not a separate
replacement for shipping the Knowledge System. Then resume the review order
above. Full PRD/design approval and implementation remain pending.

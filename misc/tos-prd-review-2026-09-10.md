# Review: knowledge/prds/toolkit-operating-system.md

Read only. Nothing was changed. Reviewed against the five other PRDs,
`knowledge/README.md`, `.claude/rules/work-item-stages.md`,
`.claude/rules/knowledge-direct-commit.md`, issue 306, and both marketplace files.

Good news first, so you know what I am not flagging. The honesty is real. The
"How to read this proposal" section says plainly that the approval fields record
drafting permission only. The evidence table says the source review is a dated
baseline and does not prove anything runs. Every number I checked is correct:
seven plugins in the Claude marketplace, six in Codex, `hooks-library` missing
from Codex, README line 235 does say "Ten plugins". Issues 269 and 304 are open
and in refinement; 305 is at requirements-approved. No broken links. The open
questions are named instead of quietly answered.

The problems are about scope and about three claims of settled agreement.

---

## 1. Things called settled that I cannot confirm

### Finding 1.1 - "Ask before heavy token use" is a rule for this session, not a toolkit decision

**Section:** What Mike has already settled

> "Ask before heavy token use, broad investigation, or launching helper agents."

This sits in the settled list, and R23 and R24 are built on it. The only place I
can find it is the issue 306 body: "Plain language, one question at a time, no
broad investigation or helper agents without approval." That was a limit you put
on the drafting session. It is not a decision about how the toolkit behaves
forever.

The approved PRD points slightly the other way. `guided-delivery.md` (status
`current`, approved 2026-09-08) says "Specialist support is offered when useful
and follows the owner's current preference." It does not require asking first.

**What you have to answer:** do you want "ask before launching a helper agent"
to become a standing toolkit requirement, or was that just a rule for this one
drafting session? R24 changes how every session behaves if you say yes.

**Confidence: high.**

### Finding 1.2 - The System Guide bullet claims more than you approved

**Section:** What Mike has already settled

> "System Guide is a separate optional component. It keeps useful system
> understanding, including findings that avoid substantial repeated research.
> It is not a prose copy of the code or a permanent archive of every finding."

The System Guide PRD's own "How to read this" is narrower:

> "Mike approved the summary, name, location, and folder shape on 2026-09-09.
> These written requirements still need his review before implementation starts."

The second and third sentences of that bullet are System Guide requirements 2
and 18, which you have not reviewed yet. Also worth knowing: `system-guide.md`
is still an uncommitted file in the working tree, written by another session. So
a "settled" claim here rests on an unsaved draft.

**What you most likely want:** move the last two sentences out of the settled
list and into the proposed part, or shorten the bullet to the four things you
actually approved.

**Confidence: high.**

### Finding 1.3 - One bullet is in the settled list and in the open-questions table at the same time

**Section:** What Mike has already settled, and Conflicts and decisions still open

Settled list says:

> "Keep clear requirements and corrections in their authorized draft during the
> same reply."

The open table says the same thing is unresolved:

> "Second-brain requirements 9 and 10 call for a card and yes for each PRD save
> ... Align the component wording before claiming this is the general rule."

It cannot be both. Right now the agent is already behaving as if it is settled:
it is editing this PRD without showing you a save card for each change.

**What you have to answer:** does "write and refine this PRD" let the agent edit
the file without a card and a yes each time? If yes, say so and the settled list
is correct. If no, the second-brain save card applies and the settled bullet
comes out.

**Confidence: high.**

### Finding 1.4 - "State a recommendation" rests on a rule you deleted

**Section:** What Mike has already settled

> "State a recommendation and explain a meaningful disagreement in plain words."

`.claude/rules/README.md` records that you removed
`recommend-the-best-solution.md` and `ask-before-assuming.md` from the toolkit on
2026-09-02. The behavior survives only inside the `guided-delivery` PRD text.
Calling it settled is defensible but thin, given you deliberately pulled the rule.

**What you most likely want:** leave it, but know the only source is one
sentence in `guided-delivery.md`, not a rule.

**Confidence: medium.**

### Finding 1.5 - The deleted map and design folder

**Section:** What Mike has already settled

> "Solution designs belong on work items. The deleted toolkit map and design
> folder are not to be restored."

The deletions of `docs/toolkit-map.md`, `docs/designs/README.md`, and
`docs/CLAUDE.md` are uncommitted working-tree deletions from another session.
`CLAUDE.md` still lists both as live parts of the codemap. Issue 306 says
"Preserve ... the deleted map/design files", which is an instruction not to touch
them, not a decision never to restore them.

**What you most likely want:** confirm the deletion is your decision, or soften
the wording to say another session deleted them and the change is not committed yet.

**Confidence: medium.**

### Finding 1.6 - The approval fields mean something different here than on every other PRD

**Section:** frontmatter

> `approved_by: Mike Rihm` / `approval_date: 2026-09-10`

The body explains this clearly, and I credit that. But `guided-delivery.md` and
`work-item-upkeep.md` use those same two fields to mean "Mike approved the
requirements". `system-guide.md` uses them for a real partial approval of four
named things. This file uses them for permission to type, with no approved
content at all.

A future agent that reads only the frontmatter, or only the index line, will
think you approved 24 requirements. The knowledge manual does not define a
"permission to draft" meaning for the field.

**What you most likely want:** either a different wording in `source` that makes
the frontmatter self-explaining, or raise it with issue 269, which owns the field
rules. Do not rely on a reader reaching paragraph three.

**Confidence: medium-high.**

---

## 2. Contradictions with the other PRDs or the manual

### Finding 2.1 - It backs a rule the second brain PRD says to delete

**Section:** 9. Continuity and concurrent work, R18

This PRD:

> "honor the explicit exception for authorized knowledge-only saves"

Second brain R9:

> "**This changes today's direct-commit rule** ... That rule keeps a save on the
> session's own branch when the session is working in a worktree ... This
> document removes that exception, so every approved save goes to the default
> branch."

R18 endorses the exception as it stands today. Second brain R9 proposes removing
half of it. This is a live disagreement, it changes where every single save
lands, and it is **not** in the open-questions table.

**What you have to answer:** should a session working in a worktree push its
knowledge saves straight to the default branch, or keep them on its branch? Add
the row either way.

**Confidence: high.**

### Finding 2.2 - The glossary is named as a current home but does not exist

**Section:** 6. Information ownership, R11

> "Owner or client shorthand and its real meaning | Glossary"

`knowledge/glossary.md` does not exist in this project. The active manual's
routing table has no glossary row. The glossary is second brain requirement 7,
still proposed. R9 hedges correctly with "when available", but R11 states it
flatly as an authoritative home.

The same table also drops `knowledge/memory-self-improvement.md`, which both the
manual and second brain R18 list as a home. The file exists and is in use here.

**What you most likely want:** mark the glossary row as proposed, and add the
self-improvement row or say on purpose that it is out of scope.

**Confidence: medium-high.**

### Finding 2.3 - R19 imports an enforcement style you have not approved

**Section:** 10. Reliable behavior, R19

> "A refusal counts as a safeguard only when a tested attempt cannot pass before
> its condition is met."

That is second brain requirement 3's gate-and-refusal thinking, turned into a
requirement for the whole toolkit. Second brain R3 is the one place that PRD
deliberately names mechanisms, it says so out loud, and it is still proposed and
unapproved.

R19 does say "Keep component-specific reliability requirements with their
owner", which is the right instinct. But the paragraph above it has already
spread the mechanism everywhere.

**What you most likely want:** let R19 require evidence, and let issue 269 decide
whether refusals are the way to get it. Cut the sentence that defines what counts
as a safeguard.

**Confidence: medium-high.**

---

## 3. Duplication instead of pointing

### Finding 3.1 - A fourth copy of the routing table

**Section:** 6. Information ownership, R11

> "These agreements summarize the [knowledge routing] and [System Guide
> boundary]; their detailed policies stay there."

It says "summarize", then prints a full thirteen-row table in its own wording.
There are now four copies of this routing information: `knowledge/README.md`,
second brain R18, System Guide R13, and this one. All four are worded
differently. They will drift, and the one meant to be the parent will be the
hardest to notice drifting.

**What you most likely want:** keep only the rows no component owns, or keep the
table and accept that this file becomes the one true copy and the others point at
it. Both work. Four copies does not.

**Confidence: high.**

### Finding 3.2 - R16 and R17 restate work-item-upkeep nearly whole

**Section:** 8. Work and approval, R16; 9. Continuity, R17

> "Read back meaningful updates and report partial failures. Report outside
> approval as reported unless independently checked. Only mark Done when the
> intended outcome is accepted; state delivery or deployment separately."

`work-item-upkeep.md` already says all of that, and R16 links to it. Same for
R17's handoff list against that PRD's handoff paragraph, and R14's removal policy
against second brain R22 and System Guide R18.

**What you most likely want:** a parent PRD holds the goal and the agreements
*between* parts. Cut these back to the cross-part agreement and let the link
carry the rest.

**Confidence: medium.**

### Finding 3.3 - A dated audit lives inside a requirements document

**Section:** What the source review established

> "The top-level README says 'Ten plugins' but lists seven. Several source
> documents still point to the deleted map and design folder."

The review is accurate and useful. It is also a snapshot that starts going stale
the day after it is written, and the same content is already in the issue 306
body. The knowledge manual says a PRD describes how the system should behave and
should not restate what an agent can read from the repository.

**What you most likely want:** keep it on issue 306, where progress lives, and
leave the PRD to say what must be true. If you want it in the PRD, it belongs at
the bottom, labelled as a dated note.

**Confidence: medium.**

### Finding 3.4 - It is an overall PRD that is not a parent PRD

**Section:** How to read this proposal

> "This PRD owns the whole experience ... It does not move those files, make them
> child PRDs, or overrule them by being called the overall PRD."

You approved the parent-and-child PRD folder shape yesterday, in second brain
R16, commit b471190. This new overall document declines to use it and sits as a
sixth flat sibling with `area: toolkit-operating-system`, whose scope is
everything. Second brain R16 says "one document per feature area". An area that
covers all the areas overlaps each of them by definition.

Declining may well be right, because the components are separate areas rather
than parts of one. But it is your call, and the file decides it for you in one
sentence.

**What you have to answer:** should the five PRDs sit inside a folder with this
one as the parent, or stay flat siblings with this one as an unlinked overview?

**Confidence: medium-high.**

---

## 4. Wording that pushes a specific build

### Finding 4.1 - R19 hands over a test plan

**Section:** 10. Reliable behavior, R19

> "Test both a normal session and missing-source, missing-approval, and
> failed-write cases on each supported host before claiming equivalent behavior."

That is how to verify, not what must be true. It also never says which hosts are
supported. A builder has to guess Claude Code and Codex.

**What you most likely want:** say the outcome, which is that behavior must not
be claimed for a host where it was not checked. Name the hosts.

**Confidence: medium.**

### Finding 4.2 - R22 and R4 name specific commands

**Section:** 11. Reuse and updates, R22; 3. Setup and choice, R4

> "Use machine setup and project sync to apply approved updates while preserving
> local choices."

These are two existing skills named inside a requirement. It is mild, because
they are already your parts, but it closes off any other way of reaching a
machine or a project.

**What you most likely want:** probably leave it. Flagging so you can see it was
a choice.

**Confidence: low.**

---

## 5. The open questions, plainly

Seven rows are in the table. Here is what each one actually is.

**Needs a yes or no from you:**

1. **Small requests and searching.** Should a request you can answer entirely
   from text you pasted, like shortening one sentence, skip the project knowledge
   search? The draft recommends yes. This is the one the PRD itself puts first,
   and it is right to. It changes the cost of every single message.
2. **Draft editing without a card.** Does "write and refine this PRD" let the
   agent edit the file without showing you a save card each time? Finding 1.3.
   The agent is already assuming yes.
3. **A failed knowledge check and finishing work.** If the knowledge review
   fails, does that stop a work item being marked Done? Second brain R3 wants
   forced moments. `work-item-upkeep.md` deliberately allows an unapproved local
   Done with the gap reported. Those pull opposite ways.
4. **Parent or siblings.** Finding 3.4.
5. **Worktree saves.** Finding 2.1. Not in the table yet.
6. **Helper agents.** Finding 1.1. Not in the table as a question.

**Not actually decisions, just sequencing or work:**

7. **Knowledge format.** `current` versus `finalized`, `spec-index.md` versus
   `prd-index.md`, the `group` field. You already decided these in issue 269.
   Nothing to answer; issue 269 has to land first.
8. **Per-host coverage.** Codex is missing `hooks-library`. That is a task, not
   a question.
9. **Roadmap ownership.** Read both sides closely and they already agree. The PRD
   holds build order and requirement coverage; the tracker holds live status.
   Second brain R16 says exactly that. This row can probably be closed as a
   non-conflict.
10. **Two sessions editing `current.md`.** Real, but a design question, not a
    requirements one. Safe to defer to issue 269.

---

## 6. Unclear or untestable requirements

- **R2, "Success is useful work with less owner upkeep."** Less than what? There
  is no starting measurement, so nobody can ever say this passed. Medium.
- **R13, "At the component's required moments."** Second brain R9 names five
  forced moments. System Guide R17 names six different triggers. A builder cannot
  tell which set R13 means. Medium.
- **R23, "Before heavy token use or broad investigation."** "Heavy" and "broad"
  are never defined, and R23 also forbids setting a number. So the requirement
  asks for a judgment it refuses to make checkable. Medium.
- **R5, "If a required protection or source is unavailable, pause the affected
  action."** Nothing says which protections are required. Medium.
- **R3, "operating restrictions."** Used once, never explained. Low.
- **R23, "Do not require a numeric budget or fixed maintenance schedule that Mike
  has not chosen."** A requirement not to do something nobody proposed. Low.

---

## Verdict

This is a careful, honest draft and it is close. It does not pretend, its numbers
check out, and it names most of its own gaps, which is rarer than it should be. I
would not treat it as your requirements yet, because three sentences in the
settled list record agreements I cannot find anywhere, and one of those sentences
appears in the open-questions table on the same page. Fix those and the document
becomes trustworthy to read as your own words. Everything else is trimming. The
top three: **one**, strip the settled list down to what you actually decided,
especially the helper-agent sentence, the two extra System Guide sentences, and
the draft-editing bullet that is also listed as open; **two**, add the
worktree-save conflict to the open table, because second brain R9 deletes an
exception that R18 here relies on, and it changes where every save lands;
**three**, decide whether R11's routing table points at the components or
replaces them, because a fourth differently-worded copy of that table is the
thing most likely to go quietly wrong. The first question to put to you is still
the one the draft picked: do self-contained requests skip the knowledge search.

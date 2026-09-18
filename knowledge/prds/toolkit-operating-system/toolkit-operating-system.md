---
summary: The toolkit helps Mike turn requests into checked results, keep control of decisions, and carry useful project understanding into the next session without managing the parts himself.
group: Working with an agent
area: toolkit-operating-system
status: proposed
source: Mike Rihm's request for the overall toolkit PRD; linked component PRDs and bounded source review on 2026-09-10; Mike's toolkit-wide handshake design principle and startup-orientation direction on 2026-09-17
created_at: 2026-09-10
tags: [toolkit, project-work, continuity, requirements]
project: claude-toolkit
work_item: "306"
---

# The Toolkit Operating System

The toolkit helps Mike work with an agent from the first loose thought to a
checked result. It carries useful understanding into the next session. Mike
sets direction and makes decisions. The agent handles the working steps and
records without making Mike remember commands, filing locations, or upkeep.

"Operating System" names this whole working experience. It does not require
a new plugin, background service, or software framework.

## Parts of the toolkit

Each part below has its own child PRD in this folder. A child holds the detailed
requirements for that part and does not repeat a requirement stated here; it
refers to this document's requirements by number. Where a child and this
document disagree, this document wins and the disagreement is stated out loud.

| Part | What it covers | Child PRD | Status |
| --- | --- | --- | --- |
| Folder instruction files | Every major folder in a toolkit project carries its own short CLAUDE.md unless another canonical file already owns its instructions, so folder detail reaches an agent when it opens that folder instead of loading in every session. | [folder-instruction-files.md](folder-instruction-files.md) | current |
| Guided delivery | Guided delivery lets the owner focus on decisions while the main conversation maintains adaptable plans and brings in focused requirements, design, research, and review help using the project's existing records. | [guided-delivery.md](guided-delivery.md) | current |
| Guided work management | The agent offers to organize and guide work from the initial idea through delivery, keeping shared plans and records current while the owner makes decisions and gives approvals. | [guided-work-management.md](guided-work-management.md) | proposed |
| Knowledge system | What the project second brain must do. Every new session already knows what has been going on in this project. Saving something worth keeping takes one short yes from the owner. | [knowledge-system.md](knowledge-system.md) | proposed |
| System Guide | The optional System Guide keeps useful insights about a system and its parts, so future sessions do not repeat substantial investigation. It does not simply restate the code. | [system-guide.md](system-guide.md) | proposed |
| Work-item upkeep | Work tracking keeps the active item's decisions, progress, handoff, and accepted outcome accurate across sessions, using flexible stages and one owner of tracker state. | [work-item-upkeep.md](work-item-upkeep.md) | current |

## How to read this proposal

Mike authorized writing and refining this draft. Its requirements have not
been approved as a whole. Approval metadata is therefore absent. Mike has
explicitly authorized committing and pushing this proposed draft to main.
Permission to save must not appear as requirements approval. The numbered
requirements are proposals unless a separate decision is identified and linked.
The approval-metadata format was separately settled under R15.

R25 was separately approved for implementation and shipped on 2026-09-10 in
[PR 308](https://github.com/Mar5929/claude-toolkit/pull/308). The approval-format
part of R15 was separately approved and shipped in
[PR 312](https://github.com/Mar5929/claude-toolkit/pull/312). Remaining proposals
are not approved merely because these parts shipped.

This PRD owns the whole experience. Component PRDs keep their detailed rules.
The parent-and-child arrangement in "Parts of the toolkit" was published in
[PR #348](https://github.com/Mar5929/claude-toolkit/pull/348) on 2026-09-16.
That organization does not approve every requirement in the parent or its
children. A proposed change to a component remains visible until Mike settles
it and that component's own record is updated.

## What Mike has already settled

- The toolkit holds reusable ways of working for his projects and machines.
  Projects choose the parts they need. Project Markdown and Git keep shared
  knowledge; there is no hidden second knowledge store.
- One main conversation guides an item. The chosen tracker owns its work.
  Plans adapt to the task. No automatic team or duplicate planner is needed.
- Read existing answers first. Ask one focused question at a time. State a
  recommendation and explain a meaningful disagreement in plain words.
- Drafting permission does not authorize implementation. Permission to save
  an unapproved proposed PRD does not require or record requirements approval;
  its approval fields remain absent until those requirements are approved.
- The System Guide name, place, summary, and folder shape were approved.
  Its detailed decisions belong to its own PRD and work item; this list does
  not turn individual draft requirements into approved requirements.
- Settled 2026-09-16: GitHub work items link to one versioned design file.
  [Guided Delivery](guided-delivery.md#solution-design) owns the design-location
  requirement. R25 owns its direct-save route. This replaces the earlier
  direction to keep the design text on the issue and drop the design folder.
- Settled 2026-09-10: projects must identify folders that get frictionless
  updates. Knowledge files go straight to main and are pushed, even while
  implementation is in a worktree. Local work items stay in their untracked
  store. The installed `CLAUDE.md` must make these save routes easy to find.

Sources: [toolkit purpose](../../../README.md), [project role](../../../SOUL.md),
[project boundaries](../../project.md), [guided delivery](guided-delivery.md),
[work-item upkeep](work-item-upkeep.md), [System Guide](system-guide.md),
and Mike's request for this draft.

For this drafting task, Mike also authorized prompt corrections to this file
and required asking before broad investigation or heavy token use. He later
allowed optional Sol helpers. These are scoped instructions, not permanent
toolkit policy. The general draft-save and helper policies remain open below.

Dated source reviews, delivery evidence, and validation results belong on
[issue 306](https://github.com/Mar5929/claude-toolkit/issues/306). Shipped source,
installed copies, and behavior observed in a session are separate claims.

## 1. Purpose and success

**R1. Mike can bring work in ordinary words.** An idea, question, problem, or
project must be enough to begin. The agent identifies the wanted result and
uses the relevant toolkit support without requiring Mike to name a command.
When his meaning is unclear, it reads existing context, explains its best
understanding, and asks only what would change the work.

**Check:** Mike says, "The advisor search misses people." The agent identifies
the relevant project and existing work, then narrows the problem without
asking him which plugin to run.

**R2. Mike can assess and resume the work from its records.** He can see the
result, what supports it, what remains open, and what needs his decision.
A later session can continue from the saved records without making him
reconstruct the previous conversation. Repeated questions, lost decisions,
unreported failures, and unnecessary records count as failures of the experience.

**Check:** after a task and a fresh session, compare the briefing with the
actual result and work item. No missing decision has to be supplied again.

## 2. What belongs to the toolkit

**R3. Reuse methods at the right scope.** The toolkit owns reusable working
habits, procedures, setup, and checks. A project owns its goals, terminology,
chosen parts, information, tracker, and operating restrictions. A one-item
choice stays with that item unless Mike approves wider use.

The agent host, such as Claude Code or Codex, supplies the session, model,
tools, permissions, and supported ways to run extensions. External services
supply their own data, access, and operations. The toolkit must use available
capabilities and report gaps without duplicating them or claiming to control
them. It does not own client systems, replace every tracker, or automatically
publish project knowledge to other projects.

**Check:** a Salesforce-specific choice stays in that project. A missing host
capability is reported as missing, not described as a working toolkit feature.

## 3. Setup and choice

**R4. Distinguish the machine, project, and current session.** On a new
machine, identify which approved toolkit parts are available. For a new
project, recommend relevant parts and record the owner's choices. For an
existing project, compare its recorded choices and actual setup with the
available source before proposing changes. Reuse existing setup and sync.

Installing a part does not by itself enable it in every project. The [System Guide agreement](system-guide.md) supports use without second brain, with its own
lookup and approved upkeep. Enabling both connects their navigation without
duplicate briefings or replacing either one's content. A part that needs no
project setup must not acquire unnecessary files. Declined choices
persist and are reconsidered only when Mike asks or a material need changes.

**Check:** two projects choose different parts. Later setup preserves both
choices and explains any new recommendation without repeating old questions.

**R5. Make missing or broken setup visible.** Report whether a needed part is
available, chosen here, active, or needs repair, and what evidence supports
that report. Propose the smallest complete repair. Reuse permission already
given for that repair; otherwise show the change before obtaining approval.
Preserve project content and local choices during updates or disabling.

If optional support is missing, continue the work that can be done accurately.
If a required protection or source is unavailable, pause the affected action
and explain what would unblock it. Never call partial setup healthy.

**Check:** a configured knowledge entry is missing. The agent reports the gap
and a repair, without silently declaring knowledge off or recreating content.

## 4. An ordinary working session

**R6. Start with a small, accurate orientation.** Starting, resuming, or
switching work must establish the project, active request, applicable guidance,
chosen tracker, current approvals, and next useful action. Read the current
item before substantial work. A short project overview points to other active
items; it does not replace their records. Do not claim an old assignment means
another session is still running.

On the first session startup, give the agent a short project-applicable toolkit
orientation. It must direct the agent through the applicable root instruction
chain (`CLAUDE.md` or `AGENTS.md`) to the higher-level operating guidance, so
the agent understands the toolkit's purpose, high-level folder responsibilities,
work tracking, linked procedures, knowledge continuity, and where updates
belong. The agent acknowledges that it received and read the orientation and
will follow the project workflows throughout the work. If required content is
missing, it reports that gap instead of giving a false acknowledgment.

Every project equipped with the toolkit must receive a Toolkit Operating System
manual. Mike explicitly required this on 2026-09-17. The applicable root routers
and per-prompt reminder reference it by its actual project-root-relative path,
along with the applicable `CLAUDE.md` and `AGENTS.md` paths. The manual explains
the toolkit's project workflows and links to component guidance. Its exact
location, contents, and installation/update design remain to be refined; this
requirement does not claim that the manual is already shipped.

Keep root instruction files as small maps and routers. Do not duplicate full
component manuals there or load every linked manual at startup. A concise
operating-manual or pointer-file shape is a design option, not an approved file
layout. The startup handshake guides native agent reasoning; its acknowledgment
shows receipt and intent, not understanding, permanent retention, or correct
execution. The design must account for continuity after context loss without
claiming that one acknowledgment keeps instructions permanently in mind.

**Check:** resume an item whose tracker changed after the last handoff. The
briefing uses the new state and names the difference.

**Check:** start a fresh session in a project with only some toolkit components
enabled. The agent receives the applicable operating orientation, names the
enabled work-tracking and knowledge routes without inventing disabled parts,
acknowledges receipt and intent, and opens detailed procedures only when the
work needs them. Remove or break a required orientation link; the agent reports
the missing content instead of claiming readiness.

**R7. Fit the process to the request.** A question can end with an answer and
its source. Research can end with findings and uncertainty. A small authorized
task can end with its checked result. Larger changes need clearer requirements,
design, a useful plan, implementation approval, and acceptance. Use the
[delivery](guided-delivery.md) and [upkeep](work-item-upkeep.md) agreements
without forcing all requests through every stage or creating an issue for
every conversational question.

**Check:** compare a field-definition question, a one-line correction, and a
new feature. Each gets enough checking and recording for its outcome, without
unneeded planning steps. The knowledge-search boundary remains open below.

**R8. Keep understanding and delivery connected.** Read existing answers,
resolve important unknowns, and update the authorized requirements draft as
Mike responds. Explain design choices against those requirements. Plan only
as much as helps the work. After implementation is authorized, do the work,
check the agreed result, obtain any remaining approval, and leave an accurate
handoff. Do not restart the interview when a domain skill becomes useful.

**Check:** Mike corrects a requirement during design. The PRD changes in that
reply, the affected design is identified, and unchanged approvals remain valid.

## 5. The agent's judgment

### Design principle: guide the agent through handshakes

Toolkit designs guide the agent with timely instructions and checkpoints. The
agent does the reasoning and confirms the requested step. Do not build a
separate engine, scoring system, or conditional rules that replace reasoning
the model can already do, or infer from its replies whether it understood or
performed the work correctly. A hook can request a step and check the agent's
acknowledgment; it does not judge the substance of that work.

The architect chooses suitable checkpoints and acknowledgment behavior for
each design. Mike's examples of an end-of-turn memory review and an agent's
reply illustrate the principle; they do not prescribe a hook, frequency,
wording, or implementation. Keep acknowledging a request distinct from
confirming completed work. An acknowledgment does not prove quality or
correctness; verify those through the resulting behavior under R19.

This does not remove objective file, format, or permission checks. It keeps
those checks separate from reasoning about meaning, relevance, and quality.

Mike established this principle for the Knowledge System on 2026-09-16 and
explicitly required it to persist across toolkit designs on 2026-09-17. This
principle is settled; the full PRD and individual designs retain their own
approval boundaries.

**Check:** a fresh design session finds this principle without Mike repeating
it. Its proposal identifies what the agent reasons about and what each
checkpoint checks, with no custom substitute for the agent's judgment.

**R9. Consult the source that answers the question.** Use context and rules
already loaded, then relevant procedures and indexed project knowledge.
Resolve project shorthand through the glossary when available. Open the
supporting file; an index entry alone is not evidence. Use the [knowledge manual's find order](../../README.md#find-before-asking-or-searching-broadly)
and the relevant component policy; this PRD does not create a competing route.

Choose by the question: requirements need the PRD; connections need the
configured System Guide; earlier decisions need memory; an active task needs
its work item. Rules constrain the action, and skills explain the procedure.
Check source code or the live system for what exists, and official outside
documentation for vendor behavior. Use session history when the owning lookup
policy calls for it. Do not substitute an intended design for deployment evidence.

**Check:** an answer about intended matching behavior cites the PRD; an answer
about deployed matching reads deployment evidence. Neither substitutes for
the other.

**R10. Act, propose, ask, or leave unsaved for a stated reason.** Read relevant
sources and perform work within existing authorization. Keep operational
records current. Propose new lasting meaning or expanded work at its approval
boundary. Ask when an unknown materially changes scope, risk, or meaning.
Leave task-only information in the conversation.

| What happens | Expected response |
| --- | --- |
| Mike clarifies a draft and has explicitly authorized saving its corrections | Update it in the same reply within that authority. Whether drafting alone grants this authority in every project remains open. |
| Research finds a useful undocumented interaction | Check for an existing guide page, then propose supported meaning under System Guide's save rules. |
| A routine command fails and succeeds on retry | Finish the task; do not create lasting knowledge merely because an error occurred. |
| Mike changes a standing project restriction | Apply his instruction within its scope and propose the authorized persistent home; do not silently turn it into a global rule. |
| The tracker cannot be written | State what is not saved, preserve the pending update for retry or handoff, and continue independent work. |

**Check:** use these examples without naming any toolkit command. The agent
chooses the response and names the destination when proposing a save.

## 6. Information ownership

**R11. Keep one authoritative home for each kind of information.** The
[knowledge manual](../../README.md#put-information-in-one-place) owns the shared
routing table. The [second-brain PRD](knowledge-system.md) and
[System Guide PRD](system-guide.md) own their detailed requirements. Change
those agreements explicitly when a routing decision changes; do not maintain
another table here.

Apply the Knowledge System's [requirement 18](knowledge-system.md#18-where-information-goes) when a decision discovered in one part affects another part or the whole toolkit; the responsible component owns the detailed requirement and its operation, and the originating work item links to it.

The Knowledge System notices information worth retaining during work and uses
this shared filing structure to reach the responsible destination. It does not
define a parallel file system or take over the destination's own upkeep rules.

Mike approved this R11 addition on 2026-09-16 as part of the scoped routing
change recorded in the [issue #269 Progress log](https://github.com/Mar5929/claude-toolkit/issues/269#issuecomment-5510064692).
The whole PRD remains proposed; this is not runtime implementation approval.

PRDs state intended behavior. The configured guide explains the system.
Memory holds qualifying lasting facts and lessons. The project map orients a
session; current context points to active work. A glossary, when available,
resolves terms and links longer explanations rather than becoming another
knowledge store. No glossary file is assumed to exist. Rules hold standing
instructions, skills hold procedures, and the tracker holds one item's work.
Outside documentation retains its source and date. Split mixed notes by
meaning, and link their homes instead of copying their contents.

When System Guide is off, follow the manual's missing-destination policy.
Do not silently place its content in memory or enable a component to justify
a save. Folder guidance follows the [folder PRD](folder-instruction-files.md).

**Check:** a note contains desired matching behavior, existing field
connections, a costly matching lesson, and an owed deployment. Route each
part once; the tracker remains the only authority for the owed work.

**R12. Resolve disagreement by the kind of claim.** Applicable host
instructions and permissions constrain actions. Within them, explicit owner
direction and project choices refine toolkit defaults. For product intent,
use the approved requirement; for system structure, the guide and its source;
for present existence, current system evidence; for work state, the tracker;
for vendor capability, the vendor's documentation. A proposed PRD does not
prove delivered behavior. A dated snapshot does not prove today's live state.

Name conflicting sources and their consequence. Evidence of a defect does
not silently change an approved requirement. An owner request for a change
does not mean it has already been implemented. Indexes and current context
never overrule their source records.

**Check:** the PRD requires a result the live system does not provide. Report
the gap, preserve the requirement, and route corrective work to the tracker.

## 7. Lasting understanding and upkeep

**R13. Notice useful understanding without reminders.** At the component's
required moments, review what deserves keeping. Capture lasting meaning only
under the relevant save approval. Prefer a correction or useful addition to
an existing home. A costly investigation may justify guide content; a simple
code summary does not. The owner must not have to ask the agent to notice a
missing explanation or an outdated fact.

**Check:** an investigation uncovers an interaction across several processes.
The agent proposes its useful result and evidence, without a transcript of
the investigation or a duplicate memory.

**R14. Keep information only while it helps.** During relevant reads and
updates, identify wrong, redundant, or no-longer-useful content. Propose the
correction, combination, replacement, retirement, or deletion under its owning
component's rules. Preserve approved meaning during generated refreshes;
refreshing facts does not approve new explanations. Repair affected references.
Age alone does not prove a fact wrong, and incomplete evidence does not prove
a system part was removed.

Memory and System Guide have different removal policies. Do not impose
memory's history rules on the guide or delete memory under the guide's rules.
Broader reviews need approval for their scope and cost; routine use should not
scan the whole knowledge base.

**Check:** keep an old but useful explanation, propose removing a duplicate,
and flag a contradicted claim instead of using it as truth while review waits.

## 8. Work and approval

**R15. Record each approval for the outcome it covers.** Recognize permission
already given. Draft requirements, approved requirements, design approval,
implementation permission, and accepted completion are separate facts. A
single clear instruction may cover several; do not require repeated approval
for the same scope. Silence, a stage label, an assignment, or a helper's
recommendation cannot supply missing approval.

The approval-field agreement is owned by
[second-brain requirement 16](knowledge-system.md#16-requirements-documents).
That part was built on 2026-09-10 in PR 312: an authorized unapproved draft can
pass validation without fabricated approval. This does not approve the rest
of this PRD or change the separate built/finalized status.

**Check:** "Write and refine the proposed PRD" permits draft changes and
tracking them. It does not permit building the proposed system or marking
the result accepted.

**R16. Keep the chosen tracker accurate as meaning changes.** Reuse
[work-item upkeep](work-item-upkeep.md) for decisions, scope, progress,
blockers, responsibility, next steps, and completion. The PRD owns reusable
behavior; the issue links it and records this item's approved scope and state.
Do not create a second planner, local mirror, or competing progress record.

Completion behavior stays with upkeep; the effect of a failed knowledge
check remains an explicit cross-component decision below. A recorded Done
must not be presented as evidence of approval or successful deployment.

**Check:** a blocker changes the plan. The chosen item and its progress agree,
PRD/design refinement updates the document text or its bottom Notes as needed,
and no second status file appears.

## 9. Continuity and concurrent work

**R17. Leave enough for a new session to resume.** Before handing off
substantial unfinished work, record the next action, blockers, open decisions,
approval boundaries, and links to relevant evidence. Review pending lasting
knowledge under its own policy. Carry unsaved information visibly in the
handoff; never claim it is already shared or saved.

A local tracker shared by linked worktrees is not automatically shared with
another clone or machine. Report that limit and use the project's chosen
sharing method without inventing a mirror.

**Check:** another session resumes from the tracker and short overview. It
can distinguish saved facts, pending proposals, and work it may actually do.

**R18. Protect other sessions' work.** Keep one session responsible for each
item's canonical updates. Before writing shared records, reread and reconcile
intervening changes. Preserve unrelated edits and direct owner corrections.
Use isolated repository work where required. R25 defines the direct route for
authorized knowledge saves, including during worktree work. Separate checkouts do not isolate a
shared service, production org, or release dependency.

**Check:** two sessions change different items while one edits shared
knowledge. Neither overwrites the other's meaning, work, or current context.
If the same meaning conflicts, the affected write waits for resolution.

## 10. Reliable behavior

**R19. Prove required behavior at the moment it matters.** Each agreement
must have evidence appropriate to its claim. Reading an instruction proves
only that it was read. A reminder does not prove compliance. A record of a
miss does not prevent it. A refusal counts as a safeguard only when a tested
attempt cannot pass before its condition is met.

Keep component-specific reliability requirements with their owner. The overall
experience must show whether the lookup happened, the right record changed,
approval covered the action, and the result was checked. Test both a normal
session and missing-source, missing-approval, and failed-write cases on each
supported host before claiming equivalent behavior.

**Check:** deliberately skip a required step. Evidence shows whether the
action was refused, merely reminded, or allowed and recorded as a miss.

**R20. Report failure without making Mike diagnose the toolkit.** State what
failed, what did and did not happen, what remains safe to do, and the next
useful action. Distinguish local writing, successful validation, committing,
pushing, installation, and active use. Preserve pending work for an authorized
retry. Never weaken a requirement or change implementation merely to make a
draft's validation look successful.

**Check:** a knowledge file is written but its checker fails. The agent points
to the draft and exact failure, reports whether it reached main, and does not
claim validation passed.

## 11. Reuse and updates

**R21. Turn a project lesson into wider behavior deliberately.** When a
lesson could help other projects, identify the existing toolkit owner and
propose the reusable change with its reason and evidence. Mike approves
its wider scope. Project-specific content remains in the project. Reuse
existing rules, skills, and components before proposing another part.

**Check:** a project procedure improves. The agent offers a toolkit change,
links the original lesson, and does not silently alter every project's method.

**R22. Follow an approved improvement through adoption.** Distinguish reviewed
source, shipped source, installed version, project choice, and active session
behavior. Use machine setup and project sync to apply approved updates while
preserving local choices. Report which destinations were actually checked.
A merge alone does not prove other machines or projects changed.

**Check:** merge an approved improvement while another project still has the
older copy. The report names that gap; after sync, a fresh-session check
establishes the behavior before it is called active there.

## 12. Cost and simplicity

**R23. Keep routine work small.** Load a short orientation and open details
when the request needs them. Reuse context already read. Search the relevant
indexes and linked records before broad scans. Avoid duplicate summaries,
unchanged repeated proposals, needless questions, and permanent records for
routine activity. Do not require a numeric budget or fixed maintenance
schedule that Mike has not chosen.

Before expanding from the named task into a repository-wide scan or full
component review, state the additional question and proposed scope. Follow
the owner's budget and approval limits. Do not treat "heavy token use" as a
testable threshold until a project has defined one. The small-request lookup
exception below is still a proposal.

**Check:** answer a narrow project question from the relevant record without
loading every PRD or reading the repository. A broad audit is proposed before
it begins.

**R24. Keep one conversation responsible for the result.** Use
[guided delivery](guided-delivery.md) for bounded specialist help. Follow the
owner's applicable permissions, including permission already given. No
request automatically creates a team. Return findings to the main
conversation and record decisions through the existing owner of the item.
A standing requirement to ask before every helper remains an open choice.

**Check:** when help is used, its scope and findings return to the canonical
item without a second plan or tracker. If independent review did not run,
the report does not claim it did.

## 13. Frictionless updates

The knowledge and local-tracker save guidance was built on 2026-09-10 through [issue 307](https://github.com/Mar5929/claude-toolkit/issues/307)
and [PR 308](https://github.com/Mar5929/claude-toolkit/pull/308).
Project-init 0.68.0 supplies the root guidance and save rule; second-brain
4.8.1 aligns its existing save guidance. Existing projects receive the change
through plugin updates and project sync. This is shipped guidance, not proof
that every installed session follows it. Mike expanded R25 to all authorized
Git-tracked documentation-only changes and authorized implementation and shipment
on 2026-09-18. [PR 353](https://github.com/Mar5929/claude-toolkit/pull/353)
ships the expanded, unscoped publication rule in project-init 0.73.0 and
marketplace 0.117.0, including setup/sync routes and aligned worktree guidance.
It works independently of knowledge activation. Independent review, repository
checks, and disposable Git safety scenarios passed; fresh-session adherence and
adoption by other projects are not claimed. Existing projects adopt through a
plugin update and project-sync. Solution designs stay outside `knowledge/` in
the project's designated design location. The broader PRD remains proposed.

**R25. Make each project's quick-save locations clear from the start.** The
agent must know which files or folders receive frictionless updates without Mike naming
them again. The installed project `CLAUDE.md` must identify those locations and
point to the instructions that own their save behavior. Keep that pointer
short; do not duplicate the full rule or procedure there. Setup supplies it
and project sync brings it to existing projects.

| Location | Save behavior |
| --- | --- |
| Git-tracked documentation-only changes, including PRDs, designs, and review records | Make the authorized update promptly, perform the relevant checks, commit directly to main (or the project's default branch), and push. Use the canonical locations and owners defined by the project and [Guided Delivery](guided-delivery.md#solution-design). Do not create a worktree, feature branch, or pull request for the documentation-only save, or wait for implementation to ship. Existing content and meaning approvals still apply. |
| Locally tracked work items | Update the existing untracked store through its tracker. Do not add its files to Git or require a commit, push, or worktree to keep them accurate. |
| Code, configuration, executable behavior, or a mixed implementation/documentation change | Follow the normal implementation worktree, branch, review, and pull-request workflow. The documentation-only exception does not authorize or reroute these changes. |

Frictionless means quick, small documentation saves as work happens, without repeated
permission for a save already authorized. For designated tracked files, the
agent uses the existing default-branch checkout and handles the commit and
push. It does not create a separate worktree or branch for the save, require a
pull request, or ask Mike to operate Git. An implementation session using a
worktree still saves these documents through their direct route.
Once Mike allows a quick save, finish the commit and push to main; writing only
a local file is not enough.
Saving a proposed PRD does not require approving its requirements. Preserve
its proposed status and report validation separately from publication.
This does not waive approval needed for new lasting meaning. A change that also
contains code, configuration, or executable behavior is mixed and keeps the
normal implementation workflow. Preserve other sessions' edits, and never
commit their unapproved work along with the save.
If validation or pushing fails, report what remains local and the next step;
do not quietly park the save on a worktree branch or call an unpushed save
complete. If Mike explicitly directs publication with a known validation
issue, preserve that issue in the work record rather than claiming a pass.

### Shared documentation publication contract

This is the toolkit-wide design for R25, refined with Mike on 2026-09-17.
It extends the existing knowledge-only route; it is not a claim that the
expanded workflow has shipped. Git branches cover the repository, not selected
folders. The toolkit chooses the appropriate publication workflow for a change.

**Eligibility and authority.** Project setup identifies documentation locations
and links this policy from the root router. Typical eligible records include
PRDs, solution designs, review notes, and project memory. Location helps find
the route; the actual change decides eligibility. A Markdown rule, skill,
prompt, or configuration that controls installed behavior is an implementation
change, even inside an otherwise eligible folder. Publishing a design that
describes future behavior does not implement or approve that behavior. Existing
meaning approval applies; a request already authorizing the same save does not
need another permission loop.

**Separate only independent work.** A documentation correction independent of
implementation can use this route while implementation remains in its own
worktree. Documentation required to accompany a code/configuration change stays
with that change. Do not split a mixed change merely to bypass review, or
publish documentation that claims unshipped behavior exists.

**Proposed publication sequence:**

1. Locate the existing default-branch checkout, confirm repository, branch,
   remote, and publishing identity, and inspect working and staged changes.
   If no safe checkout exists, preserve the pending save and report the blocker.
2. Fetch and compare remote state; fast-forward only when safe. Read the latest
   destination and reconcile the authorized edit there. Never copy an older
   worktree file over newer content. Coordinate concurrent edits to the same
   file and serialize staging/committing in the shared checkout.
3. Check the exact change using the destination's requirements: for example,
   links and formatting for designs; metadata, sources, approval, and rebuilt
   indexes for knowledge. Generated files must not include another session's
   unfinished records. A failed check leaves the save unfinished unless the
   owner explicitly authorizes publication with that known failure recorded.
4. Stage only owned, authorized changes and inspect the complete staged diff.
   Unrelated staged work blocks this commit until its owner has finished or
   coordinated a safe handoff. Never stage everything, unstage someone else's
   work, autostash, overwrite edits, reset, or rebase the shared checkout.
5. Commit and push the default branch, then verify the intended commit is
   present on the remote branch. Remote advancement by another session does
   not itself invalidate publication if the intended commit is included.

**Conflict and recovery.** On overlapping edits, divergent history, rejected
push, account mismatch, or branch protection, retain the exact pending change
and commit identity in the existing work record. Report separately what is
written, checked, committed, and remotely published, with the next action.
Do not force-push, bypass protection, change accounts, or silently open a PR.
Reconcile a conflict without losing another session's work; ask only when
meaning, authority, or the delivery route needs an owner decision. On resume,
check whether publication already succeeded before repeating the save.

**Proof before reusable delivery.** Exercise an independent documentation save
from an implementation session, a Markdown behavior change, an inseparable
mixed change, concurrent same-file edits, unrelated staged work, a failed
check, a rejected push, and interrupted publication recovery. The agent judges
scope and meaning; Git and validation tools establish objective results. No
semantic classification engine or folder-specific branching feature is needed.

Mike confirmed this distinction on 2026-09-16 while approving the linked design
file: selected files and folders do not need the implementation branch process.
The [issue #306 Progress log](https://github.com/Mar5929/claude-toolkit/issues/306#issuecomment-5622497546)
records this R25 clarification; issue #269 is the originating discussion.

**Check:** from a fresh session doing implementation in a worktree, approve a
knowledge correction and change a local work item's next step. Without a
reminder, the agent finds the installed save guidance, commits and pushes only
the authorized knowledge change to the default branch, and updates the local
item without tracking it in Git. The implementation stays in its worktree.

**Check:** repeat with an authorized design-document update and another file
explicitly designated for direct saves. The agent finds their configured routes
and publishes the changes without creating a worktree, feature branch, or pull
request for them. Repeat with a review-note-only correction and use the same
route. Then add a code or configuration change: the mixed change stays in the
normal implementation workflow. No unrelated implementation or another
session's unapproved work is included. A failed save stays visibly unfinished.

## Walkthrough: a search that misses advisors

This is an example of the proposed experience, not a report of delivered work.

1. Mike says, "The advisor search misses people from the same firm." The
   agent reads the current item, relevant glossary terms, and search PRD.
   If System Guide is enabled, it follows the search and firm connections.
2. It finds the existing explanation and checks the relevant evidence. If
   "same firm" still has two plausible meanings, it asks one question and
   recommends the meaning supported by the project.
3. Mike clarifies the required result. The agent updates the authorized PRD
   draft in that reply when existing permission covers saving corrections.
   Otherwise it follows the applicable save approval. The issue links the requirement and records the
   decision; the guide does not pretend the new behavior already exists.
4. Once the required approvals are present, the agent explains a design on
   the item, plans the work, and implements within the project's boundaries.
   Checks include advisors sharing a firm and people who should stay separate.
5. Investigation also explains a surprising interaction between matching
   processes. The agent proposes useful guide meaning with its evidence.
   A distinct lasting lesson qualifies for memory only under its own rules;
   it links the explanation instead of copying it.
6. Mike reviews the result. The tracker records acceptance and what was
   actually delivered. Approved PRD changes describe accepted behavior, and
   affected guide facts refresh without overwriting approved meaning.
7. On another day, a new session reads the short overview and current item.
   It knows whether deployment is still owed. If the fix revealed a reusable
   toolkit improvement, that separate proposal follows R21 and R22.

## Conflicts and decisions still open

These are specific boundaries to settle or carry into component work. None
authorizes implementation or changes the neighboring PRD by implication.

| Boundary | Existing position and unresolved point | Recommendation |
| --- | --- | --- |
| Searches for simple requests | Second-brain requirements 5 and 19 require the same knowledge search for every task or question, with past-session search before asking when earlier tiers fail. This PRD must also keep small tasks small. Does that include self-contained requests unrelated to project knowledge? | Keep relevant lookup mandatory for project work, but exempt requests fully answerable from supplied text, such as shortening one sentence. This is a proposed change to the component agreement, not a settled exception. |
| Draft refinement and save cards | Guided delivery recognizes authorized draft corrections. Second-brain requirements 9 and 10 call for a card and yes for each PRD save. Mike explicitly authorized this draft and refinement. | Treat that explicit authority as sufficient for faithful draft updates; keep new lasting meaning outside that scope under its normal approval. Align the component wording before claiming this is the general rule. |
| Hard refusals and lightweight work | Second-brain requirement 3 proposes forced save-review moments. Upkeep favors adaptable stages and deliberately allows an unapproved local Done record while reporting the gap. A component's mechanism cannot be assumed to enforce the whole experience. | Preserve each component's existing decision. Specify the effect of knowledge-review failures on work completion before design; do not add blanket process gates here. |
| Remaining knowledge-format transition | The manual and proposed second brain still differ on naming and metadata, including the proposed content-change date. Group and finalized status are now accepted by the checker, alongside legacy current. | Keep the remaining transition with #269. Compatibility support does not prove the full second-brain proposal is implemented. |
| Helper agents | The ask-first instruction for this drafting session does not establish a permanent policy. Guided delivery permits bounded delegation without a blanket ask-first rule. | Retain guided delivery's bounded delegation, while honoring owner limits and scoped permissions. Ask Mike before making ask-first a toolkit-wide requirement. |
| Roadmap ownership | Guided delivery allows adaptable plans in existing records. Second-brain requirement 16 requires a PRD roadmap for a large feature. | A PRD lists work order and requirement coverage; the tracker owns live status and the detailed plan. Confirm this boundary rather than maintaining two editable plans. |
| Concurrent current context | Second-brain requirements now explicitly require preserving other sessions and reconciling overlapping updates. Upkeep owns each item. | Reuse that agreement under R18. The coordination method belongs in design, not another owner interview. |
| Installation across hosts | The marketplaces differ. This review did not establish which omitted guards have equivalent active coverage in Codex. | Require a per-host capability and gap report under R5 and R19. Do not assume a missing marketplace entry either proves no protection or grants equivalent protection. |

The former worktree-save conflict is resolved by R25 and PR 308: authorized
knowledge saves go directly to the default branch and are pushed. Do not
reopen that choice or preserve the earlier branch-parking rule.

The approval-metadata conflict is also resolved through issue 311 and PR 312.
Review the remaining owner choices one at a time; they do not hold up an
authorized save or become approved merely by being saved.

## Roadmap and review

[Issue 306](https://github.com/Mar5929/claude-toolkit/issues/306) owns refinement
and acceptance of this overall draft, covering R1-R25. Review the open
boundaries with Mike and apply his answers here in the same reply.

The component work stays separate:

- [311](https://github.com/Mar5929/claude-toolkit/issues/311) delivered the
  approval-format part of R15 and the existing-save-authorization guidance
  supporting R25 in PR 312. Neither requirement is treated as wholly proven
  across every installed project by this narrow fix.
- [307](https://github.com/Mar5929/claude-toolkit/issues/307) delivered R25 in
  PR 308. The remaining requirements on this overall PRD are still in review.
- [269](https://github.com/Mar5929/claude-toolkit/issues/269) owns second-brain
  behavior and its knowledge-format transition, relevant to R6, R9-R20. Its
  startup files and per-prompt knowledge reminder must fit beneath R6's parent
  orientation rather than becoming a competing operating manual.
- [304](https://github.com/Mar5929/claude-toolkit/issues/304) owns System Guide,
  relevant to R4-R5, R9-R14, and R17.
- [305](https://github.com/Mar5929/claude-toolkit/issues/305) owns the reusable
  rules audit, relevant to R3, R9, R11, R19, and R23.
- The delivered work in 270, 300, and 302 is a baseline to reuse, not work to
  recreate under this issue.

This is the review order, not an approved build sequence. After the overall
requirements are approved, identify only the missing agreements that need
work, assign each to one existing or new item, and record its requirement
coverage here. Designs and implementation plans belong on those items.
Keep live progress, validation results, and unsaved work in issue 306.

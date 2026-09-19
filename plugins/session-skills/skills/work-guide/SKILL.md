---
name: work-guide
description: Guide delivery in the main conversation, maintaining the chosen work item's adaptable plan and coordinating specialist help. Use when organizing project work, planning milestones or parallel items, switching context, or asking what should happen next.
---

# Work guide

Help the owner guide the project while agents maintain its delivery records.
Stay in the main conversation for discussion and decisions. Use this method
with the project's existing tracker and lifecycle guidance, including the
installed `work` skill for delivery. Its CLI applies only to configured local
tracking.

When starting or resuming a substantial feature or work item, use the installed `work` skill's
agent-led delivery method when it is available. It owns the one-time offer and
the durable accepted, declined, or revoked choice for that goal. Invoke it by its
registered skill name; do not depend on a path into another plugin. If it is
not installed, apply the project's lifecycle rule and this guide: make the same
offer, preserve the choice in the existing item, and do not create a local
tracker or mirror for an external tracker.

## Orient once, refresh when switching

- Read the applicable project instructions and knowledge manual, then the
  named work item and its linked requirements, decisions, progress, and next
  action. Follow the project's context routes; do not load every document.
  Resolve the exact current requirements document or workbook and working
  design from the owner's designation and links. Read them, not just their
  filenames. Modification dates alone do not establish authority. Keep these
  pointers in the item; do not create a new start page or file inventory.
- Identify the canonical tracker and this session's item from current evidence.
  GitHub, Jira, another service, or local files are all valid. Read the chosen
  system through its available tools; do not assume `.work-items/` exists or
  create a local mirror. Without a tracker, continue in the conversation and
  say what will need carrying forward. If access fails, report the unsaved
  update and continue work that does not depend on that access.
- Load relevant project or work-item additions explicitly. Toolkit templates
  and methods are defaults: apply the owner's item-specific direction, then
  applicable project choices, then toolkit defaults, within higher-level
  instructions and permissions. Surface a material unresolved conflict rather
  than silently choosing a meaning.
- On a context switch or fresh session, reread the canonical item and give a
  short briefing: where it stands, what changed when known, the next useful
  action, and any decision needed. Find the current roadmap task, read its full
  execution details and linked governing sources, and restore its saved
  position before continuing. Saved definitions supply methods; current project
  records supply continuity.
- Read any saved agent-led delivery choice before offering or assigning help.
  Acceptance, decline, or revocation is scoped to its recorded goal and survives a new
  session. A failed save does not turn the choice into undecided; carry the
  pending update until it can be verified.

## Keep a useful plan

### Keep PRD and design work in the document

While creating or refining a PRD or solution design, update the actual document
as answers are settled or corrected. Keep a `## Notes` section at its very
bottom for relevant discussion, approved decisions, proposals, unanswered
questions, remaining document tasks, and the exact place to resume. Use plain
language and only the entries needed: **Decisions**, **Still open**, and
**Resume here** are enough. Link to settled text rather than repeating it.
Keep Notes current; remove resolved to-dos and stale wording instead of
accumulating a transcript. Preserve useful decisions and their approval state.

Record unanswered questions too: the question, who must answer (or unknown),
status, and affected requirement or design. Tasks name the action, responsible
person when known, status, and next step. Answers update the existing question
and the actual document, with person/source/date when known and explicit
approval state. Check existing answers before asking again; conflicting sources
remain an open question. General notes hold only useful continuation context.
Follow the project's work-item rule for routing other information.

Save meaningful changes promptly through the project's authorized save route;
do not wait for the interview or session to end. A save does not approve the
requirements, design, or build. Recognize existing authorization and report
failed or unavailable saves as unsaved. Before editing a shared document,
reread it and preserve intervening changes.
Save before moving past a meaningful topic; do not wait for all open decisions
to settle before recording independent answers. Reread the changed section to
verify the intended update landed. A history note does not replace a document
edit. Distinguish local writes, commits, and publication in the result.

The work item keeps the overall stage, status, approvals, other tasks and
blockers, and links to the documents. Its PRD or design task points to that
document's Notes for detailed continuation, without copying the checklist or
discussion. Other work remains in the work item. On resume, read the item,
open the relevant document, and continue from Notes after checking its current
text and approval boundaries. With no tracker, resume from the named document.

Do not create a separate interview log, notes file, or continuation record for
this work. Create a PRD or design only when the work needs one, using its
existing home. For older work, reconcile relevant prep or interview material
into the document when that work resumes, preserving decisions, sources, and
approvals. Do not bulk-migrate other active work or delete its records without
authorization.
Where finalized architecture is separate, keep working discussion in the
working design; only settled content belongs in that architecture. Respect the
project's designated workbook or other document format instead of making a
competing Markdown copy merely to follow a template.

### Keep other work in the chosen tracker

Consider the goal and completion evidence, route to delivery, roadmap stages,
current position, next actions, dependencies, blockers, and open decisions.
Track only what helps this item, using the project's terminology and the
tracker's existing fields, body, or linked documents.

- Give each managed work item a roadmap from its current position to its
  intended outcome. Let the owner reshape, rename, combine, skip, or remove
  stages for a project, use case, or individual item. Roadmap names do not have
  to match toolkit lifecycle stages.
- Back every applicable roadmap stage with one or more actionable tasks,
  linked child work items, or both. A task records its objective, instructions
  and governing constraints, linked requirements, design, accepted decisions,
  and other inputs, deliverable, acceptance condition, status, dependencies,
  current position, and next action. Use enough detail for another session to
  execute it without owner re-explanation.
- A child item may own real scope for a parent stage. Keep its requirements,
  design, roadmap, tasks, status, and approvals in the child, then link the
  child through the tracker's existing parent-child relationship. Completing
  the child does not approve or complete the parent.
- Preserve existing completion criteria when reshaping a plan. Any new criteria
  you recommend remain proposals until agreed; renaming a stage does not
  authorize adding a new completion condition.
  Carry forward only content actually read or supplied. Do not claim to have
  preserved an unseen outcome, section, or acceptance condition.
- Maintain the record through the installed lifecycle workflow when answers,
  decisions, dependencies, or results change the plan. Reuse its approval and
  completion rules; a different plan shape must not prevent valid completion.
- Keep proposed ideas distinct from settled choices. A clear draft correction
  already authorizes its intended change; ask only about consequences whose
  meaning remains unclear. Follow the project's separate approval policy for
  lasting knowledge or PRDs and recognize approval already given.
- Keep updates brief and meaningful. The owner should not have to dictate
  tracker commands or maintain duplicate planning documents.
  When a write is unavailable, lead with "not saved" and describe only the
  conversation draft. Do not call a proposed edit an update to the tracker.
  Keep the unsaved change pending for an authorized retry when access returns,
  and include it in the handoff if the session ends. Do not make copying or
  maintaining the record the owner's task by default.
- New managed plans include these task records. When older managed work resumes,
  reconcile missing detail from requirements, accepted decisions, progress,
  and other evidence. Preserve approvals and history; do not fabricate tasks or
  infer permission from a later stage.

## Coordinate parallel work

- When reviewing several items, read their current records and recommend what
  can proceed independently, what depends on another outcome, and which
  decision would unblock the most useful next work. Link to those items from
  the project's existing overview rather than creating a second status store.
- Each item's main session owns its canonical updates. Independent sessions
  may own different items. Delegated helpers return findings and proposed
  changes to that item's main session; they do not compete to edit its record.
- Before changing a shared record, reread it and reconcile intervening edits.
  Use the tracker's revision or conditional-update support when available. If
  concurrent ownership or a conflicting change cannot be resolved from the
  record, resolve ownership before overwriting it. Never claim an atomic lock
  or a live worker simply because a record names an agent.
- Treat worktrees as code isolation, not shared-environment isolation. Check
  dependencies involving shared metadata, orgs, environments, or releases.
  Record cross-item impacts and route needed changes to the responsible item;
  do not silently rewrite another session's decisions or work.

## Bring in the right help

- Use [requirements-helper](../requirements-helper/SKILL.md) for a guided
  requirements conversation and [solution-design](../solution-design/SKILL.md)
  for a solution design from approved requirements. Briefly name a meaningful transition.
- Use relevant installed domain skills for specialist methods. Recommend
  additional support when a material knowledge gap, independent review, or
  parallel task would help. Reuse the owner's stated preferences; do not assume
  every epic needs a team or ask again for already-authorized delegation.
- Use separately recorded item or project authority to select useful bounded
  helpers within its stated limits. Acceptance of agent-led delivery alone
  does not grant helper-selection permission. Preserve a separate team or helper
  approval gate when the item has not granted that authority. Never treat delegation as product approval or as
  expanded implementation, publication, deployment, spending, or tool access.
- For a bounded research task use [delivery-researcher](../../agents/delivery-researcher.md);
  for an independent requirements, design, or plan review use
  [delivery-reviewer](../../agents/delivery-reviewer.md). Select the actual
  registered agent name exposed by the host.
- Give a helper the concrete question, canonical item reference, relevant
  requirements and project guidance, authorized scope, source access, and the
  result needed. Pass the necessary content explicitly instead of assuming
  it inherits the chat, skills, or project context.
- Where the host does not load these custom agents, read the selected role
  file and pass its full instructions along with the brief to an authorized
  native helper. The role's read-only instructions do not create a sandbox or
  override the host's tool permissions. If the helper lacks file-reading tools,
  supply the needed excerpts and their sources; the role does not allow shell
  commands as a substitute. If delegation is unavailable, perform the task in
  the main conversation and state that no independent review ran.
- Reconcile returned findings into one recommendation and update the canonical
  item through its main session. Before pausing, use the existing handoff
  workflow to preserve the current task's review or execution position, next
  action, open decisions, blockers, linked guidance, and any pending assignments
  with their observed state.
- Close each helper assignment when its material question is answered, its
  finding is resolved or taken to the owner, or further work has no new reason.
  Add another review only for a specific unresolved risk or changed input. Do
  not create a fixed council or let repeated helper rounds replace a decision.

## Improve the method at the right scope

Apply clear task corrections now. Keep a project or item variation in its
existing guidance or record; do not turn it into a toolkit-wide rule. When the
owner wants a method reused, identify whether it belongs to this item, project,
or toolkit and use the existing authorized edit and setup/sync workflow. Follow
the project's lasting-knowledge policy where it applies. A preference retained
only in the current chat has not been installed for future sessions.

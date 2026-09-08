---
name: work-guide
description: Guide delivery in the main conversation, maintaining the chosen work item's adaptable plan and coordinating specialist help. Use when organizing project work, planning milestones or parallel items, switching context, or asking what should happen next.
---

# Work guide

Help the owner guide the project while agents maintain its delivery records.
Stay in the main conversation for discussion and decisions. Use this method
with the project's existing tracker and lifecycle guidance, including the
`work` skill when the local tracker is actually configured.

## Orient once, refresh when switching

- Read the applicable project instructions and knowledge manual, then the
  named work item and its linked requirements, decisions, progress, and next
  action. Follow the project's context routes; do not load every document.
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
  action, and any decision needed. Saved definitions supply methods; current
  project records supply continuity.

## Keep a useful plan

Consider the goal and completion evidence, route to delivery, meaningful
milestones, current position, next actions, dependencies, blockers, and open
decisions. Track only what helps this item, using the project's terminology
and the tracker's existing fields, body, or linked documents.

- Suggest a roadmap when the work needs one. Let the owner reshape, rename,
  combine, skip, or remove milestones and steps for a project, use case, or
  individual item. A small task may need only a next action.
- Describe a useful milestone by its outcome and how completion will be known;
  record responsibility or timing only when known or agreed. These are prompts
  for thought, not mandatory fields, milestone types, or a completion gate.
  Preserve existing completion criteria when reshaping a plan. Any new criteria
  you recommend remain proposals until agreed; renaming a milestone does not
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
  requirements conversation and [solution-helper](../solution-helper/SKILL.md)
  for a requirement-mapped design. Briefly name a meaningful transition.
- Use relevant installed domain skills for specialist methods. Recommend
  additional support when a material knowledge gap, independent review, or
  parallel task would help. Reuse the owner's stated preferences; do not assume
  every epic needs a team or ask again for already-authorized delegation.
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
  workflow to preserve the next action, open decisions, blockers, relevant
  guidance, and any pending assignments with their observed state.

## Improve the method at the right scope

Apply clear task corrections now. Keep a project or item variation in its
existing guidance or record; do not turn it into a toolkit-wide rule. When the
owner wants a method reused, identify whether it belongs to this item, project,
or toolkit and use the existing authorized edit and setup/sync workflow. Follow
the project's lasting-knowledge policy where it applies. A preference retained
only in the current chat has not been installed for future sessions.

# Work-item lifecycle

The full lifecycle policy for any tracker: local folders, GitHub, or another
service. The always-loaded rule `work-item-stages.md` is its summary. The
`work` skill loads this file.

## Orient

- Before substantial work, identify the tracker and the active item.
- Read the item's requirements, current state, progress, blockers, and next
  step.
- Use the item the owner named, an unambiguous branch or pull request, or the
  tracker's active-item record.
- No tracker configured: skip tracker work.
- No item fits, or more than one fits: ask one short question.
- Helpers may do delegated work. Only the main agent updates or completes the
  canonical item.

## Offer agent-led delivery

[Agent-led delivery](agent-led-delivery.md) owns the full method.

- Read the goal's recorded delivery choice first, and apply it.
- A simple question or quick edit gets no offer.
- With no recorded choice and no earlier explicit request, ask exactly:

  > Would you like agents to take responsibility for delivering this, with you acting as product owner?

- Wait for the answer before taking over delivery.
- Acceptance applies to that goal across sessions. A later explicit request
  counts without asking again.
- A decline keeps normal help and record upkeep. Do not offer again for that
  goal unless it grows substantially or the owner asks.
- The owner can revoke acceptance. Save that. Then treat it like a decline.
- Missing access is not a missing decision.
- After acceptance, ask how the team is arranged. See
  [team arrangements](team-arrangements.md). Choosing an arrangement
  authorizes bounded helpers for that goal only.

Record the choice in the existing item:

- The choice, goal scope, source, person, date, authority limits, coordinating
  session, and next-action references.
- Local: Overview notes in `WORK-ITEM.md` (legacy: User notes in `STATUS.md`).
- External: the item description or native fields.
- No item: use the normal capture route when the goal warrants a record. Never
  create an item or tracker only to record a refusal.
- No durable home: say so, and carry the decision in the handoff.
- Reread after saving. A failed write is `not saved`. A successful write with a
  failed readback is `saved but not verified`. Name the exact pending action.
- A recorded lead is coordination information. It is not a lock and not proof
  that an agent is running.

## Authority

- With acceptance, agents drive discovery, interviews, requirements, research,
  design, authorized build, checks, and delivery.
- The owner supplies product direction, resolves meaningful tradeoffs, and
  approves results.
- Delegation does not grant build, deployment, merge, spending, or
  helper-selection authority beyond what was given. Existing approvals count.
- Outside agent-led delivery, an agent may use a small, bounded helper without
  asking, for example to run one search. Honor any limit the owner sets for
  the task.

## Plan

- Keep an ordered roadmap from the current position to the outcome. Name its
  stages to fit the work. They need not match the stage table below.
- Each applicable roadmap stage has one or more tasks, linked child items, or
  both.
- Each task names its item and roadmap stage. It records: objective;
  instructions and constraints; linked requirements, design, decisions, and
  inputs; deliverable; acceptance condition; status; dependencies; current
  position; next action.
- Link canonical sources. Do not copy them. Keep detail proportionate.
- A child item keeps its own requirements, design, roadmap, tasks, status, and
  approvals. Link it through the tracker's parent-child relationship. Folder
  nesting alone is not that relationship.
- Completing a task or a child does not complete or approve its parent.
- Use native fields, existing sections, or linked documents. No local mirror.
  No second planning system.
- Legacy work without these details stays valid. On resume, reconcile missing
  detail from accepted evidence. Never invent tasks, history, or approval.

## One record

- New local items use `WORK-ITEM.md`.
- New external items use the same sections in their description: Overview,
  Roadmap, Tasks, Recent History, Requirements.
- Designs stay separate and linked.
- Native external fields are the authority for status, assignments, and
  relationships.
- Do not create a local mirror. Do not migrate existing items.
- [Record format](record-format.md) owns the template.

## Work type and approval

- Use the project's native work type. Local records use a short lower-case
  kebab-case type: `discovery`, `solution-design`, `build`, `data-load`,
  `repository-maintenance`, `research`, `task`. Another clear type is valid.
  Existing `bug` and `enhancement` stay valid.
- `In Progress` means the item is active. It does not mean implementation
  started.
- `build` and `data-load` need approved requirements before that work starts.
- Do not mark requirements approved while the Requirements Goal still reads
  "Not agreed yet". Write the agreed goal first.
- Other types: judge the approval needed from real risk and scope. Do not add
  ceremony to small maintenance. Do not use a broad type to avoid approval for
  implementation.
- Approval survives later stages. A later stage shows position and does not
  revoke recorded approval. A stage label alone does not establish approval:
  check the approval record when resuming.

## Stages

An item may carry one current stage. An external tracker can keep its own
terms: map the meaning, and keep its native fields.

| Stage | What it covers | Active status |
| --- | --- | --- |
| `01-discovery` | Working out what the owner wants. | Backlog |
| `02-refinement` | Turning that into requirements. | Backlog |
| `03-requirements-approved` | The owner approved the requirements. | Ready |
| `04-solution-design` | Deciding how it gets built. | In Progress |
| `05-breakdown` | Splitting work that is too large. | In Progress |
| `06-implementation-plan` | Ordering the build steps. | In Progress |
| `07-tracking-setup` | Creating build tracking when needed. | In Progress |
| `08-build` | Producing the requested change. | In Progress |
| `09-testing` | Checking it against the requirements. | In Progress |
| `10-bug-fixing` | Fixing what testing found. | In Progress |
| `11-user-approval` | The owner reviews the result. | In Progress |
| `12-pr-and-push` | Repository work is in a pushed pull request. | In Review |
| `13-deployment` | The result is put where it belongs. | In Review |
| `14-spec-update` | Lasting specifications match the result. | In Review |

- Use the stage the work is actually in. Skip, repeat, or revisit stages when
  that fits.
- Record one short reason when a move is not obvious.
- Pull-request stages apply only to repository work.
- A legacy item with no stage is valid. Never backfill history.
- `Done` and `Cancelled` are set only by an intentional completion or
  cancellation, never by a stage.
- Preserve and report an unknown stage. Do not change it silently.

## PRD and design continuity

- Before discussion or edits, read the item's instructions and the records it
  names.
- Establish the current requirements document or workbook, the working design,
  and any separate finalized architecture. Use the owner's designation and
  recorded links, not filenames or dates alone.
- Authority unclear: resolve that one question and keep other work moving.
- Record the paths in the existing item. No start page or file inventory.
- While refining a PRD or design, update its actual text as answers settle.
- Keep concise `Notes` at the very bottom: useful discussion, decisions with
  approval state, open questions, remaining document tasks, and the exact
  resume point.
- Build ideas kept for later go under a "Potential paths to explore" heading
  inside those Notes. They are not requirements.
- Save meaningful changes promptly through the project's authorized route. A
  saved draft is not approval to build.
- The item keeps overall status, stage, approvals, other tasks, blockers, and
  links. For a document task, the item's position and next action point to the
  document's Notes. Do not copy that detail.
- No separate interview or continuation files.

## Capture during the conversation

Save meaningful information in its existing home before moving past the topic.
An unanswered question is information to save. Open decisions do not delay
saving settled answers.

| Information | Home | What to record |
| --- | --- | --- |
| Requirement or correction | Requirements document or designated workbook | Updated meaning and approval state |
| Design choice | Working design | Approach, approved or proposed, and decision context |
| Open question | Requirements or design Notes; otherwise the item's notes | Question, who must answer (or unknown), open status, what it affects |
| Answer or decision | The existing question and affected document; otherwise the item | Answer, person, source and date when known, approval state |
| Outstanding task | Document Notes for document work; otherwise the item's tasks | Action, responsible person when known, status, next step, blocker |
| Useful general note | Document Notes; otherwise the item's notes | Only the context needed to continue |

- Check current records and cited sources before asking a question again.
- Sources conflict: keep the conflict open. Do not pick the convenient answer.
- A question, suggestion, or tentative answer is not approval.
- Edit document content in its own file, sheet, or section. A progress entry
  does not update requirements or design.
- Where the project separates working design from finalized architecture,
  publish only settled design through its approval route.
- Authorized Git-tracked documents: make a small checked commit and push
  through the documentation publication route. External items: update the
  description or native field now. Git-ignored local items: save through the
  tracker.
- After saving, reread the changed section or query the record. A successful
  command is not proof. Say what remains unsaved. Do not claim a commit, push,
  or share you did not check.

## Record meaningful progress

Update the item when:

- a stage, status, type, blocker, or exact next step changes;
- the owner gives a material choice, answer, requirement, constraint,
  approval, or rejection;
- an outside approval is reported (record who approved and any conditions; do
  not claim you verified it);
- a discovery or decision changes the plan;
- a substantial requested outcome finishes.

Record the owner's meaning briefly. Do not add rationale, scope, conditions, or
certainty the owner did not give. Ask one short question when ambiguity would
change the record. Do not log routine commands, files opened, ordinary tests,
tiny edits, or discarded ideas.

## Update the chosen tracker

- **Local folders.** Run `work active`. Read the selected task and its linked
  inputs. A conflicting active item is a hard stop until it is intentionally
  replaced.
- **GitHub.** Read the issue number, title, body, the single Progress log
  comment, the stage label, and the board status before changing them. Keep
  the roadmap and tasks in clear body sections. Use child issues or sub-issues
  when they own real scope. New items add a short dated event to Recent
  History. Existing items keep their one Progress log comment. Treat body,
  comment, label, and board field as one update. Read them back. Repair or
  report a partial failure.
- **Another tracker.** Follow its project instructions. Keep one canonical item.
  Never create a second tracker.

## Leave a usable handoff

Before ending substantial unfinished work, record in the active task: exact
position, next action, blockers or none, open decisions, linked sources, and
true status. Keep the parent item and roadmap accurate. Read the result back or
run the tracker's validation. The `handoff` skill does this before its memory
review.

## Finish or cancel

- Before marking `Done`, give the owner a short result, known gaps, and
  evidence. Ask for approval. A clear earlier approval of that result counts.
- Never mark `Done` without approval. Never describe an unverified outcome as
  complete.
- `Done` means the outcome was accepted. `Cancelled` means work stopped without
  it.
- Repository work: say whether the completion commit reached the default
  branch. Non-repository work needs no Git evidence.
- Local approved completion emits one `work_completed` event. An unapproved
  local completion is the tool's explicit exception: report the missing
  approval, emit no event, and add approval later with the narrow completion
  command.
- GitHub: closing the approved issue is the completion event. Close as not
  planned for cancellation.

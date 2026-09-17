# Knowledge System — solution design

Updated: 2026-09-17. **Proposed; under review. No runtime build authorized.**

This is the single living master. Update it as we review the solution together.
Saving a proposal does not approve it. The earlier full draft remains available
as reference; it is not a second current design.

## Sources and current position

- [PRD](../../knowledge/prds/toolkit-operating-system/knowledge-system.md): the 30 requirements.
- [Task D1](https://github.com/Mar5929/claude-toolkit/issues/269#task-d1--review-and-finalize-the-solution-design): current work, roadmap, status, and approvals.
- [Acme walkthrough](269-knowledge-system/design-walkthrough.md): scenario state, review steps, failure cases, and requirement coverage.
- [Detailed solution design reference output](269-knowledge-system/detailed-solution-design-reference-output.md): the preserved full draft, with implementation detail, research, tests, alternatives, and unresolved questions. Reconcile it against this master and the PRD before use.

We are reviewing **Acme's first substantive message in a fresh session**. Acme
is a fictional Salesforce consolidation of two orgs. Setup hypothetically enabled
core Knowledge System and `delivery/architecture/`, with System Guide off.
The first brief supplies firm/team context, client, originating and target org
roles, and scope; actual names and details remain placeholders. No real setup
or connection occurred, and the work tracker is not yet chosen for the scenario.

**Next:** refine the user-submit reminder below, decide the end-of-turn
checkpoint, then apply both to the brief. No full scenario step or full design
is approved. Preserve the setup questions in the walkthrough.

## Selected design directions

The [governing principle](../../knowledge/prds/toolkit-operating-system/toolkit-operating-system.md#design-principle-guide-the-agent-through-handshakes)
is native agent reasoning supported by small instructions, checkpoints, and
handshakes. Objective checks may validate format, paths, permissions, and
acknowledgments. They do not decide meaning or prove understanding.

- Startup content delivery counts as reading; verify delivery and report missing content honestly.
- Every submitted user prompt gets a compact reminder and explicit acknowledgment of intent, without forcing a full manual reread.
- Review all proper destinations, including work records and architecture. Memory is only one destination.
- Long-term memory must be **relevant and significant to the project**.
- Referenced files have explicit project-root-relative paths. Root `AGENTS.md` and `CLAUDE.md` remain maps and routers.
- Every equipped project must receive a Toolkit operating manual. Its location and design are being refined separately; it is not claimed to ship today.
- Changed-file counts do not decide whether conversation review is needed. That trigger was rejected.
- Authorized documentation-only updates are checked, committed, and pushed directly to main. Solution designs remain in `docs/designs/`, outside `knowledge/`.

Requirements approval, design approval, and build authorization remain separate.

## Proposed end-to-end flow

| Moment | Proposed mechanism | Expected result |
| --- | --- | --- |
| Enable knowledge | Setup creates agreed records, connects host guidance, and checks delivery. | Clear destinations and reported setup failures; layout/migration still need review. |
| Start or resume | Startup hooks deliver bounded project context and manual guidance. | The agent knows current work, relevant instructions, and pending updates. |
| User submits a message | Prompt hook delivers the reminder and requests acknowledgment. | The agent evaluates the message and context, even with no file changes. |
| Retrieve and work | The agent follows indexes and links to needed sources. | Evidence informs the answer without loading every document. |
| Route information | The agent identifies kind, scope, owner, and applicable approval rules. | Memory, requirements, work tracking, procedures, and architecture each use their own records. |
| Save an authorized change | The owning workflow writes, checks, updates affected links/indexes, and publishes as required. | Completed saves are distinguished from local-only or unfinished updates. |
| Finish the turn | A second checkpoint is proposed to catch discoveries and decisions made during work. | Review outcome is distinguished from acknowledgment of receipt. |
| Recover or hand off | Preserve pending approvals, unfinished saves, task position, and next action. | A new session resumes without requiring the owner to repeat the conversation. |

## User-submit reminder — wording under review

Runtime paths below are relative to the equipped project's root.

> The user has submitted a message.
>
> **Friendly reminder:** keep front of mind and follow the Toolkit operating system's methodologies, processes, and instructions. Use the applicable root instruction chain, `AGENTS.md` and/or `CLAUDE.md`, to know what the project's files and folders contain and where information belongs. Toolkit operating manual: **[configured relative path; not yet decided]**.
>
> Evaluate the user's message and relevant conversation for information to retain or update:
>
> - **Long-term memory:** information both relevant and significant to this project—lasting facts, decisions, feedback, constraints, relationships, meaningful events, and lessons from resolved failures that future sessions would otherwise need explained again.
> - **Short-term working context:** current goals, blockers, next steps, unfinished work, and temporary context needed to resume. Keep it concise and distinguish hypotheses from established facts.
> - **Other records:** route requirements, tasks, procedures, enabled System Guide content, and architecture changes to their owning records. Use their actual configured paths; do not duplicate them in memory.
>
> Do not retain secrets, filler, routine tool logs, unnecessary duplicates, or information without useful project purpose. Do not promote scratch reasoning, dropped ideas, or unverified hypotheses into long-term facts.
>
> Consider additions, corrections, updates, consolidation, superseding, and removal. Follow `knowledge/README.md` for eligibility, routing, and approval; finding a candidate does not authorize a lasting change.
>
> Acknowledge this reminder, then perform the evaluation. Acknowledgment confirms intent, not completed review or saving.

Proposed acknowledgment: “Acknowledged. I'll evaluate what needs retaining or updating.”

The operating-manual placeholder records an unresolved dependency. The actual
hook must reference a real configured file, not invent a path.

## End-of-turn checkpoint — proposal

Recommend one checkpoint at turn completion, rather than after every intermediate
message. The agent distinguishes: no update needed; authorized updates completed;
proposals awaiting approval; or unfinished updates needing recovery.

Still undecided: whether no-change outcomes stay quiet, acknowledgment transport,
completion evidence, and retry/loop behavior. The checkpoint does not score
reasoning or authorize writes.

## Implementation boundaries and remaining review

The earlier draft proposes find, save, review/repair, and setup responsibilities,
with startup, prompt, write-check, save-moment, completion, and compaction hooks.
Exact names, wiring, limits, and guards need reconciliation. Its technical detail
is reference material, not an implementation mandate.

Claude Code and Codex may need different adapters for the same behavior. Function
hooks/Claude Mods are an optional avenue, not a selected dependency. Delivery,
ordering, timeouts, and recovery need runtime proof on each supported host.

Remaining work:

1. Finish reminder wording, canonical text source, manual paths, and acknowledgment.
2. Decide the completion checkpoint, visible outcomes, and failure/retry handling.
3. Continue the Acme walkthrough through routing, approvals/rejection, saves, corrections, concurrent work, interrupted publication, handoff, and migration.
4. Reconcile proposed layout, templates, budgets, guards, integration boundaries, and the detailed reference's open questions with the current PRD. Do not silently adopt old recommendations.
5. Verify realistic conversation-only, fresh-session, and cross-session behavior. Static checks alone do not prove those outcomes.
6. Reconcile requirement coverage and obtain separate PRD/design approvals before build authorization through the existing task roadmap.

The walkthrough preserves detailed coverage; the reference preserves the earlier
technical work. This master stays short enough to review together.

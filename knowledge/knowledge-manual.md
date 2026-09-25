<!-- claude-toolkit:knowledge-manual -->
<!-- claude-toolkit:knowledge-schema:2 -->

# How to use project knowledge

This manual is reference. It holds the knowledge policy. Open the section a
task needs. Do not read it at startup. The `knowledge-*` skills hold the
procedures and open this manual when they need it.

## 1. Your responsibility

- Help the next session continue without making the owner repeat project
  information.
- Find what the project already knows. Keep current work clear. Save
  worthwhile information in the record that owns it.
- Use your judgment to decide what matters. Follow the permission and checks
  for the action you choose.
- Finish authorized saves. Recover unfinished saves.
- The owner gives product direction and decisions. You manage the files,
  checks, and publication.
- Keep statements about intended behavior separate from evidence of what
  works.
- `knowledge/toolkit-manual.md` owns the overall Toolkit process and how its
  parts connect. This manual owns knowledge policy.
- `.toolkit-memory.json` at the project root sets the memory mode. No file
  means `files` mode. In `external` mode a memory service holds memory. Both
  manuals move to `docs/`, and section 2 lists the other homes.

Required workflow checks. In Claude Code, when the project turns on the
`protocol-guard` plugin, these steps are checked from facts Claude Code
reports:

- A write to the inbox, `knowledge/memory/`, `knowledge/prds/` or
  `knowledge/memory-self-improvement.md` is refused until `knowledge-save` is
  open. The inbox needs it opened this turn. In `external` mode this covers a
  write to `prds/` and a call to the memory service's write tools; a pending
  record needs it opened this turn.
- Generated indexes are never edited by hand. Run the index builder.
- After a knowledge write, run the index builder and then the checker before
  the turn ends.
- After a work item is created, closed, or moved to another stage, update
  working memory in the same turn: `knowledge/memory/current.md`, or a
  `working` record in the memory service in `external` mode.
- Opening a pull request, closing a work item, or merging is refused until
  `knowledge-save` was opened in the same turn. That is the save review for
  the action.

A check proves the step happened. It does not prove the step was done well or
approved. Codex follows the same steps without the checks.

Commit-time check. When the clone has the knowledge pre-commit hook, a commit
that changes `knowledge/`, `SOUL.md` or `ai-external-knowledge/` (in
`external` mode also `prds/`, `PROJECT.md`, `docs/knowledge-manual.md` or
`.toolkit-memory.json`) runs the checker on the staged files, in every host
and terminal. A refused commit names the files to fix. Fix them, stage them,
and commit again. Never skip the check with `--no-verify`.

## 2. Choose the record that owns the information

Decide what the information is and where it applies. Where you heard it does
not decide where it belongs. Split mixed information. Link the owning records.
Do not copy the same meaning into several places.

| Information | Home | In `external` mode |
| --- | --- | --- |
| Your role in this project | `SOUL.md` | Same |
| Project systems, resources, and important locations | `knowledge/project.md` | `PROJECT.md` |
| Standing instructions | Applicable root instructions and project rules | Same |
| Repeatable procedure | A skill, through the project's skill-authoring process | Same |
| Required behavior | The owning feature's PRD under `knowledge/prds/` | Under `prds/` |
| Useful explanation of existing parts and their connections | The enabled System Guide's configured location, or another explicitly designated document owner | Same |
| Qualifying lasting project facts, decisions, lessons, events, and constraints not already owned by another record | Topic files under `knowledge/memory/memory-entries/` | One `lasting` memory record per topic |
| Current project goal, each active item's goal and link, general to-dos with no work item, and handoff pointers | `knowledge/memory/current.md` | `working` memory records, one per item, with links |
| Tasks, delivery plans, status, and overall approvals | The project's work tracker | Same |
| Architectural choices, alternatives, rationale, evidence, and approval state | The work item's designated design, or an existing separately designated architecture record | Same |
| PRD or design refinement and exact resume point | That document's closing Notes section | Same |
| Shown proposals awaiting an answer and authorized unfinished saves | `knowledge/memory-inbox.md` | `pending` memory records |
| Feedback about which memories are useful | `knowledge/memory-self-improvement.md` | One `feedback` memory record |
| Unchecked exploration | `brainstorms/` | Same |
| Project-authored research findings | The work item's existing supporting records, linked from the design or other record using them | Same |
| Raw outside documentation | `ai-external-knowledge/` or the project's designated source-reference location | Same |
| Earlier conversations | Available project session history | Same |

For an active work item, open its tracker record for progress, blockers, next
step, tasks, and handoff detail. Do not copy that live state into working
memory. A handoff without a work item keeps a short note in working memory.

- Follow each destination's current instructions and permission rules.
- A disabled System Guide stays disabled.
- If a needed owner or procedure is missing, report the gap. Memory and PRDs
  do not replace a missing owner.
- An architectural decision record (ADR) follows the same ownership rules. Its
  name does not require a separate file or a memory. Keep selected choices in
  the design text. Keep unresolved choices in its Notes.
- Keep the sources, date or version, and limits of evidence. Research findings
  alone approve no design choice or requirement.
- When an item closes, follow the project's retention rules. Keep the route to
  its current authority and its decision history. If deletion guidance
  conflicts with keeping current architecture or useful evidence, report the
  conflict before you move or delete records.

## 3. Decide what deserves lasting memory

A memory must meet all three tests:

- It concerns this project.
- It has lasting significance: losing it would cost a later agent real time
  or understanding.
- It comes from the owner, or from work done together with the owner.

Exception: a significant project failure that you found and fixed yourself
may be saved without the owner. Record its cause and fix, not the raw error
log.

A significant completed exercise may deserve a short event memory: what was
done, what it found, and where its output lives. Routine edits do not.

Consider the owner's selection feedback before you propose a candidate.

Lasting memory is one destination only. When useful information does not
qualify as memory, save it in the record that owns it, under that record's
permission rules. Examples:

- Project-authored research findings stay in the work item's supporting
  research, linked from the design or other record that uses them.
- The reason for rejecting a design alternative stays in the work item's
  design.

Never save these as lasting memory: routine commands and tool activity,
transcripts, scratch reasoning, raw errors, dropped guesses, code copies,
system descriptions that can be rebuilt, live status, open tasks, and
secrets. Send useful temporary context, procedures, requirements, and system
explanations to their own homes.

Keep useful history of a withdrawn conclusion when it stops later agents from
following a false claim that spread.

## 4. Use the permission already given

Before you change lasting memory or a PRD, find the permission that covers
the operation, the meaning, and the scope.

- Permission carries into later sessions.
- Ask again only when the meaning changed or the scope is unclear. Do not ask
  again for the same unchanged authorization.
- When new approval is needed, open `knowledge-save`. It prepares the standard
  card.
- A yes covers that operation and meaning only. It does not cover unrelated
  changes.
- Silence or an unclear reply does not approve a write.
- Keep exact wording when the owner explicitly asks for it.

PRDs:

- Permission to refine a named PRD covers recording the owner's in-scope
  answers and corrections.
- New requirements you recommend still need the owner's agreement.
- Drafting permission does not approve every requirement and does not
  authorize building.
- After authorized work ships, update the affected PRDs to match the agreed
  delivered behavior. No new card is needed. Stay quiet unless a problem or a
  decision needs attention.
- Shipping alone does not finalize requirements. It does not turn an
  unexpected defect into agreed behavior.

Automatic memory saves:

- Lasting memory normally needs approval for each save.
- The owner may explicitly turn on automatic memory saves for this project.
  The grant covers lifecycle operations and additions.
- Record the grant once in the project's permission settings. Mark affected
  memories as auto-saved.
- The setting never covers PRDs.
- Selection, evidence, checks, and a short result report still apply.
- Check the current setting. This manual does not turn it on.

Upkeep under existing permission:

- Keep current work, pending saves, selection feedback, generated indexes, and
  obvious broken links up to date.
- A repair keeps the meaning and the owner's deliberate edits.
- Approved older records may be converted under the setup procedure. Show the
  results afterwards. Leave unclear conversions untouched and report them.

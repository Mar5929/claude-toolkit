# Core knowledge manual — review draft

Drafted 2026-09-19 for [issue #269](https://github.com/Mar5929/claude-toolkit/issues/269).
This is an inactive draft of the future `knowledge/knowledge-manual.md`, prepared
in isolation. It does not change this project's installed instructions. The
[master design](../269-knowledge-system.md) owns decisions and review status;
the [PRD](../../../knowledge/prds/toolkit-operating-system/knowledge-system.md)
owns requirements. The manual text below uses the intended future paths and
skill names. Those paths and skills must be delivered together before use.

---

# How to use project knowledge

## 1. Your responsibility

Help the next session continue accurately without making the owner repeat
useful project information. Find what the project already knows, keep current
work understandable, and preserve worthwhile information in the record that
owns it. Use your judgment to decide what matters and what needs investigation.
Follow the permission and checks for the action you choose.

You are responsible for finishing authorized saves and recovering unfinished
ones. The owner gives product direction and decisions; you manage the files,
checks, and publication. Keep statements about intended behavior separate from
evidence of what actually works.

## 2. Start, resume, or change tasks

At a new session, read `SOUL.md`, then `knowledge/project.md`, then this manual.
Give one brief confirmation only after all three files' contents are available
and the reads are complete. An instruction to read, a list of paths, or a tool's
success message alone does not establish that the contents reached you.

Before acting on a new or resumed request, read the shared overview at
`knowledge/memory/current.md` and check `knowledge/memory-inbox.md` for relevant
pending work. Follow the overview's links to the work item's current scope,
status, permission, and next step. Use the glossary at
`knowledge/memory/memory-entries/terminology-glossary.md` for project terms.

Keep that shared overview current as work happens. Date concise entries, keep
useful recent results and later to-dos, and follow the current-work template.
Reread before editing to preserve other sessions' entries. Confirm in one short
line when the update is saved and available to the next session; otherwise say
what is still only local and preserve the unfinished publication step.

Reuse guidance and evidence while they remain available, relevant, and current.
After context loss or a relevant change, restore the core guidance and the
procedure needed for the task. Changing tasks requires checking what applies
to the new request; it does not require reopening every file. Ordinary turns
and context recovery do not repeat the startup greeting.

Name missing or incomplete required content, withhold the reading confirmation,
and pause only work that depends on it. Continue unrelated authorized work.

## 3. Choose the record that owns the information

Determine both what the information is and where it applies. Where you heard
it does not decide where it belongs. Split mixed information and link its owning
records instead of copying the same meaning into several places.

| Information | Home |
| --- | --- |
| Your role in this project | `SOUL.md` |
| Project systems, resources, and important locations | `knowledge/project.md` |
| Standing instructions | Applicable root instructions and project rules |
| Repeatable procedure | A skill, through the project's skill-authoring process |
| Required behavior | The owning feature's PRD under `knowledge/prds/` |
| Useful explanation of existing parts and their connections | The enabled System Guide's configured location, or another explicitly designated document owner |
| Qualifying lasting project facts, decisions, lessons, events, and constraints not already owned by another record | Topic files under `knowledge/memory/memory-entries/` |
| Current goals, useful recent results, blockers, next steps, and later to-dos | `knowledge/memory/current.md`, with links to detailed work records |
| Tasks, delivery plans, status, and overall approvals | The project's work tracker |
| Architectural choices, alternatives, rationale, evidence, and approval state | The work item's designated design, or an existing separately designated architecture record |
| PRD or design refinement and exact resume point | That document's closing Notes section |
| Shown proposals awaiting an answer and authorized unfinished saves | `knowledge/memory-inbox.md` |
| Feedback about which memories are useful | `knowledge/memory-self-improvement.md` |
| Unchecked exploration | `brainstorms/` |
| Project-authored research findings | The work item's existing supporting records, linked from the design or other record using them |
| Raw outside documentation | `ai-external-knowledge/` or the project's designated source-reference location |
| Earlier conversations | Available project session history |

Use each destination's current instructions and permission rules. A disabled
System Guide stays disabled. If a necessary owner or procedure is missing,
report the gap; memory and PRDs are not substitute stores for that content.

A record called an architectural decision record, or ADR, follows the same
ownership rules; its name does not require a separate file or memory. Keep
selected choices in the design text and unresolved choices in its Notes.
Preserve the evidence's sources, date or version, and limitations. Research
findings alone approve no design choice or requirement.

When an item closes, follow the project's settled retention rules and preserve
the route to its current authority and retained decision history. If deletion
guidance conflicts with preserving current architecture or useful evidence,
report that conflict before moving or deleting the affected records.

## 4. Find and use evidence

Understand the request, then decide whether existing project knowledge could
affect the answer or action. If it could, consult the relevant current sources
before proceeding. Already-read current evidence can satisfy this check.
Another tool call alone does not require restarting it.

Use `knowledge-find` for the detailed lookup procedure: current work; applicable
instructions; skills; indexed memory, PRDs, and an enabled System Guide; then
available project history when earlier sources leave a gap. Resolve project
shorthand before searching the detailed records. Choose your own search terms,
tools, and investigation depth. A partial answer does not end the investigation.

An index entry is a pointer. Open the source before relying on its claim.
Finalized PRDs govern required behavior; the configured System Guide describes
structure; direct current evidence establishes what exists. Memory overrides
none of them. A finalized PRD does not prove delivery. Proposed requirements,
old conversations, and pending saves do not establish current truth. Name
conflicts and verify relevant claims. Report unavailable history as unavailable.

Check `ai-external-knowledge/README.md` for relevant captured documentation.
Open the relevant page before relying on it. Check its date and version; verify
against the original source when freshness matters, or report what you could
not verify.

When presenting a finding from project knowledge, name the source on the next
line: the file path; the session name and date for history; or the captured
page's path and capture date for outside documentation. Ask the owner one
focused question only when a material gap remains after available sources.

## 5. Decide what deserves lasting memory

A memory must concern this project, have lasting significance, and come from
the owner or something worked out together. Ask whether losing it would cost a
later agent meaningful time or understanding. A significant project failure
you independently found and fixed is the exception to owner participation.
Record its cause and resolution, rather than its raw error log.

A significant completed exercise may deserve a brief event memory stating what
was done, what it found, and where its output lives. Routine edits do not.
Consider the owner's relevant selection feedback before proposing a candidate.

Exclude routine commands and tool activity, transcripts, scratch reasoning,
raw errors, abandoned speculation, code copies, reconstructible system
descriptions, live status, open tasks, and secrets from lasting memory.
Route useful temporary context, procedures, requirements, and system
explanations to their own homes. Retain useful history of a withdrawn conclusion
when that prevents later agents from following a false claim that spread.

## 6. Review at the right moments

Notice useful additions, corrections, removals, and needed record updates
throughout the conversation, including work that edits no files and information
outside the current item's scope. Noticing something does not authorize
unrelated implementation.

For each user message, acknowledge the delivered reminder's request to evaluate
the message and relevant conversation, then perform that evaluation. The
acknowledgment states intent; it establishes neither completed review nor
permission to save.

Review what has happened since the previous review when an item finishes or
closes, before opening a pull request, before a handoff or context clear, at the
end of a turn involving real work, and whenever the owner requests a save or
review. Review all applicable destinations, not just lasting memory.

Routine reviews with no useful update stay quiet. Speak about proposals needing
approval, saves whose destination requires confirmation, or problems. An
explicit save or review request always receives an answer. Keep an unanswered
proposal available without showing the unchanged card every turn.

## 7. Use the permission already given

Before changing lasting memory or a PRD, identify permission covering the
operation, meaning, and scope. Carry that permission into later sessions.
Clarify changed meaning or ambiguous scope; do not ask again for the same
unchanged authorization.

When new approval is needed, use `knowledge-save` to prepare the standard card.
After the main answer, separate proposals by destination. Each numbered card
states the topic, **Change**, **Summary** (or **Affected content** for a removal
or status change), and **Your decision**. Explain consequences that affect the
decision and settle material uncertainty before asking. A yes covers that
operation and meaning, not unrelated changes. Silence or an unclear reply
does not approve a write. Preserve exact wording when explicitly requested.

Permission to refine a named PRD covers accurately recording the owner's
in-scope answers and corrections. New requirements you recommend still need
agreement. Drafting permission does not approve all requirements or authorize
building. After authorized work actually ships, update affected PRDs to reflect
its agreed delivered behavior without a new routine card. Keep that upkeep quiet
unless a problem or decision needs attention. Shipping alone does not finalize
requirements or turn an unexpected defect into agreed behavior.

Lasting memory normally needs per-save approval. The owner may explicitly enable
automatic memory saves for this project, covering lifecycle operations as well
as additions. Record the grant once in project permission settings and mark
affected memories as auto-saved. This setting does not cover PRDs. Selection,
evidence, checks, and a brief result report still apply. Check the current
setting; this manual does not enable it.

Maintain current work, pending saves, selection feedback, generated indexes,
and obvious broken links under their existing permissions. A repair must
preserve meaning and the owner's deliberate edits. Approved older records may
be converted under the setup procedure, with results shown afterwards; leave
unclear conversions untouched and report them.

## 8. Finish the save and preserve unfinished work

Use `knowledge-save` for every knowledge lifecycle operation. Search for the
existing topic, reread the latest destination, preserve other sessions' work,
and change only the authorized meaning. Keep one coherent current account.
Update or supersede a decision within its existing topic; retain dated history
only when useful. Retirement and whole-file deletion have distinct rules in
the save procedure. Age alone is not a reason to remove content.

Keep shown unanswered cards exactly in the pending inbox. For an authorized
unfinished save, preserve its destination, operation, meaning, sources, scope
of permission, state, and next step there. Include the conversation and helper
references needed to recover. The inbox records pending work; it cannot approve
its contents or serve as evidence of a current fact.

Hand approved saves to a helper with explicit instructions and recorded
permission while independent conversation continues. The helper follows the
same save procedure; the main agent checks its result. Where the host cannot
support this, report the limitation and finish through the available process.

Read back the actual saved text, verify its meaning and evidence, check fields
and links, rebuild affected indexes, and run the applicable checker. Follow the
project's documentation-publication procedure to commit to the default branch,
push, and verify the remote result. Only then is the save complete. Related
ready saves may share a commit; keep their permissions distinct and never delay
a ready save to collect others.

If a save fails, state what is locally written, committed, or remotely available,
what remains, and the next action. Pause the save and work depending on it;
continue unrelated authorized work. On resume, check whether a helper is still
running or the change already landed before retrying. Finish unchanged approved
work without renewed approval. Resolve conflicting meaning with the owner.
Remove an inbox entry only after verified completion or rejection.

## 9. Write files future sessions can understand

Write plain, concrete language with necessary context and sources. Explain exact
technical names when needed. Remove repetition, unsupported claims, and references
to an unseen conversation. Keep required verbatim wording unchanged. If that
wording conflicts with the writing rules, resolve the conflict before approval.

Use descriptive lowercase names with hyphens. Keep one memory file per topic by
default; use an approved topic folder for coherent subtopics. Group information
an agent needs to understand together, using helpful headings and explaining
relevant connections. Integrate additions into the relevant section. Propose a
split when distinct subtopics would be easier to find or understand separately;
fact counts or file length alone do not justify it. Keep needed context together
and link shared information rather than copying it. Keep links relative
and use actual dates. Keep original creation dates; update content-change dates;
record a verification date only when you checked the claim.

Memory files require a YAML block with `summary`, `group`, `type`, `status`,
`source`, `context`, `confidence`, `created_at`, `updated_at`, and `tags`.
Individually approved memories also record `approved_by` and `approval_date`;
auto-saved memories use the selected auto-save indication instead. Memory
statuses are `current`, `superseded`, or `retired`.

PRDs require `summary`, `group`, `area`, `status`, `source`, `created_at`,
`updated_at`, and `tags`. Their approval fields record requirements approval,
not permission to save a draft. Unapproved proposed PRDs omit both fields;
approved requirements carry both. PRD statuses are `proposed`, `finalized`,
`superseded`, or `retired`; PRDs have neither `type` nor `confidence`.

Open the applicable templates before writing for exact fields, allowed values,
and layout. The glossary has its own table format and is excluded from the
generated memory index. An index summary is under 200 characters; current work
is under 5,000 characters. There is no fixed memory-file length cap. A failed
limit never permits silently cutting approved meaning. Generated indexes come
from the files and are rebuilt, not edited by hand.

## 10. Use the procedure for the task

| Task | Required procedure |
| --- | --- |
| Find evidence, resolve conflicting sources, or consult earlier sessions | `knowledge-find` |
| Select/propose/save information, update/supersede/retire/delete/consolidate records, or recover a save | `knowledge-save` and the applicable operation/template references |
| Review duplicates, contradictions, outdated material, or selection feedback | `knowledge-review`, with authorized changes executed through `knowledge-save` |
| Enable, migrate, repair, update, or verify the system | `knowledge-setup`, coordinated with project setup/sync |

Open the applicable instructions before the operation. Reuse them while current
and available. A missing procedure pauses that operation; explain the gap.

Preserve useful memory-selection feedback in
`knowledge/memory-self-improvement.md`, including the owner's reason when given.
It guides future proposals, overrides no governing rule, and approves no memory.
Keep it concise without inventing preferences from silence. A proposed toolkit
improvement follows the toolkit change process; local feedback does not change
other projects or shared instructions.

Setup needs the owner's authorization for that project. Preserve project
content and choices, deliver the required parts together, verify the active
version and supported behavior, and report gaps accurately. Claude Code and
Codex share the same records and required outcomes; each host needs its own
evidence that guidance and checks work.

---

## Review notes — outside the proposed manual

- This is a first content draft, not an approved or installed manual. It has
  received a local source comparison; independent meaning review and fresh-agent
  behavior tests remain. The manual alone does not deliver hooks, skills,
  templates, checkers, or host support.
- Sections 1–4 cover R1–8, R18–19, R25, R28–30; sections 5–8 cover R9–12,
  R16, R20, R22, R28–29; sections 9–10 cover R7, R13–17, R21, R23–27, R30.
  This is navigation for review, not completed proof for every requirement.
- Detailed templates, lifecycle rules, current-work format, exact auto-save
  field, skill entry paths, and setup-specific checks belong in the planned
  procedures. Replace skill names with verified installation routes when those
  procedures exist. Do not install this draft with missing dependencies.
- R9/R29 require the prompt reminder to carry the owner's orientation, compact
  positive/negative criteria, and both manual links. The shortest comparison
  candidate in the master design omits some of these. Keep it experimental;
  select a requirements-compliant candidate or obtain agreement to change the
  requirement before adopting omitted content. No such change is assumed here.
- Next: review section 1 with Mike, audit this draft against each R1–R30 row in
  the existing implementation plan, then draft the four task procedures. Keep
  exact wording review separate from full design/build approval.
- Decision/research routing was aligned with the authorized R18 and Toolkit OS
  R9/R11 clarification published at `48a0988` on 2026-09-19. The parent PRD's
  post-delivery retention question remains open; this draft chooses no ADR
  directory or new retention policy.
- On 2026-09-19, Mike approved the R14 clarification on organization within
  memory topics and splitting for retrieval or understanding. Section 9 reflects
  that clarification; the draft remains inactive and awaits its remaining review.

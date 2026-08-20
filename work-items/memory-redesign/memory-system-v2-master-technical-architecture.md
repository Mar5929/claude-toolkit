# Memory System v2: Technical Architecture

**Status:** rewritten 2026-08-20, after the first build was reverted for
over-engineering. Pending Mike's review. Nothing here authorizes a build.

**Authority:** [functional-requirements.md](functional-requirements.md)
controls behavior. This document controls the technical design. When they
disagree, the requirement wins and this document gets fixed.

**Superseded companions:** `contracts.md`, `implementation-plan.md`,
`pm-tracker.md`, and `session-kickoff.md` describe the previous, reverted
design. Do not build from them. The reverted code stays readable in this
branch's history.

---

## 1. The design in one paragraph

The agent is the runtime. Claude Code and Codex already read, search, and edit
files, keep history in Git, and ask the owner for permission. So the memory
system is a folder of Markdown files, four skills that teach agents how to use
it, two small hooks, and two small scripts. There is no memory engine, no
command API, no search index, no transaction system, and no validator suite.
Total new code is a few hundred lines, and every line exists because a script
does that one job better than an agent can.

## 2. What went wrong last time, in one paragraph

The previous architecture reimplemented the host. It specified a 23-command
tool surface, a write coordinator with locks, crash journals, and content
hashes, a retrieval router with seven tiers and result scores, a 22-check
validator with shipped test fixtures, and byte-budget math for startup. Claude
Code already provides each underlying capability: Grep is the search engine,
Edit is the write path, Git is the transaction log and audit trail, and the
permission prompt is the enforcement point. The build that followed the old
document was about twenty thousand lines, and almost all of it duplicated the
host. This document replaces it.

## 3. The complete parts list

| Part | What it is | Rough size |
| --- | --- | --- |
| Folder layout and templates | The `knowledge/` tree and four record templates | Templates only |
| Boot hook | A Claude Code `SessionStart` hook that prints the startup brief | ~150 lines |
| Write guard hook | A Claude Code `PreToolUse` hook that turns a direct write to project knowledge into a visible owner decision | ~60 lines |
| Index builder | Rebuilds the generated `knowledge/index.md` (exists today) | Exists |
| Check script | Front matter, links, pin drift, index freshness, secret patterns | ~150 lines |
| `remember` skill | The save flow, including the five-bullet review and the edit path | Skill text |
| `recall` skill | The search ladder and honest-failure behavior | Skill text |
| `cleanup` skill | The read-only review and the approved repairs | Skill text |
| `session-search` skill | The gated transcript search (exists today) | Exists |

That is the whole system. Anything not on this list is not part of v2.

## 4. Project shape

~~~text
project/
  AGENTS.md                  root route for Codex
  CLAUDE.md                  root route for Claude Code
  knowledge/
    project.md               overview, folder map, settings front matter
    current.md               current focus, blockers, next step, handoff
    index.md                 generated one-line summaries (rebuilt by script)
    specs/                   approved behavior
    memory/
      facts/
      decisions/
      events/
      patterns/
      pins.md                exists only when the project has pins
~~~

The folder map lives as a section in `project.md`, one line per folder. No
separate map file. Rules, skills, the tracker, delivery folders, and reference
areas stay where the project already keeps them, and the map names those
places (FR-096).

`project.md` front matter carries the only settings:

~~~yaml
---
project_id: claude-toolkit
tracker: Claude-Toolkit-Project board on GitHub
privacy:
  level: standard          # standard | sensitive
  external_transfer: denied  # denied | approved, with a consent link
---
~~~

A missing or unreadable privacy value reads as the most restrictive setting
(FR-124).

## 5. Record format

One record is one Markdown file holding one independently correctable meaning
(FR-087). Small front matter, a title, a one-sentence summary, then the body.

~~~markdown
---
type: decision            # fact | decision | event | pattern
status: active            # active | superseded | retired
confidence: documented    # documented | observed | inferred | unknown
date: 2026-08-18
source: issue-123#comment-456
---

# Refresh tokens use secure device storage

Refresh tokens live in secure device storage, not normal application storage.

## Context
...
~~~

Optional fields, present only when true: `occurred_at` for events,
`supersedes` and `superseded_by` as relative links, `based_on` for patterns
and inferences, `conflicts_with`, `pinned_reason`. The filename is the stable
id. Git is the history, so no field ever stores prior wording.

Decisions keep the standard shape: context, choice, reason, rejected options,
consequences (FR-091). Links between records are ordinary relative Markdown
links. Backlinks are found by grepping for the filename, never stored
(FR-084).

## 6. Startup

**Claude Code.** A `SessionStart` hook prints, in order: the project overview
line, the full `current.md`, the recent window, every pin, the folder map
pointer, the memory route (the four skills by name), and any warnings. It is
read-only and writes nothing (FR-115).

- The recent window is the newest two or three records by `date` within about
  three days. When none exist, it shows the latest record and labels its age
  (FR-005).
- Keep the brief about a page. Anything that would push past that becomes a
  count and a link (FR-002). Judgment, not byte math.
- When `current.md` is missing or its newest dated line is old, the brief says
  so, with the date (FR-116).
- The hook fails open: any error prints a warning and the session continues
  (FR-008).

**Codex.** No hooks. `AGENTS.md` tells a Codex session to read `project.md`,
`current.md`, `index.md`, and `pins.md` before substantive work. Same meaning,
delivered by instruction (FR-001).

## 7. Saving: the remember skill

The skill walks the agent through, in order:

1. Route it first: work state to the tracker, behavior to rules, processes to
   skills, approved behavior to specs, sources to references (FR-010).
2. Run the persistent-information test (FR-009) and the future-agent test
   (FR-109). Most candidates should fail. NOOP is the expected outcome.
3. Pick the one record type and grep for duplicates and conflicts.
4. Show the five bullets: What, Where, Why, Assumptions, Unverified. Wait for
   keep, change, edit, or skip (FR-019, FR-020).
5. On Edit, write the full proposed record to a scratch file outside the
   knowledge tree (the session scratchpad or a gitignored `.memory/review/`
   folder). The owner edits it directly. "Good" approves the exact contents
   (FR-110 to FR-112). Re-run step 2 and 3 on the edited text (FR-113).
6. Write the file, update any superseded record in the same change, rebuild
   `index.md`, and run the quick review (FR-028, FR-044).

**Enforcement (FR-108).** A `PreToolUse` hook watches Edit, Write, and Bash
calls that target `knowledge/specs/`, `knowledge/memory/`, or
`knowledge/current.md`. It flags the write so the host surfaces it as a
visible permission decision naming the file. The owner's native permission
prompt is the mechanical gate. The five bullets are the review. Whether the
hook answers "ask" or "deny with guidance" is a build detail decided when the
hook is written.

There is no lock, journal, or content hash. A save is one or two small file
edits, and Git is the rollback. On Codex, which has no hooks, the rule lives
in `AGENTS.md` and the limit is stated there honestly.

## 8. current.md and continuity

`current.md` owns cross-machine continuity (FR-102, FR-103). It holds four
short sections: current focus, blockers, next step, handoff. It changes only
through the remember flow, on three triggers: an explicit handoff, an approved
change of focus, and an approved completed-work event that changes state
(FR-114). The guard hook covers it like every other knowledge path. Live
work-item status stays in the tracker, linked, never copied (FR-012).

## 9. Retrieval: the recall skill

The skill teaches a ladder, not a program (FR-029):

1. Loaded context. The boot brief may already answer.
2. `index.md` for a fast scan of what exists.
3. Grep `knowledge/` with the project's terms, exact names, and recorded
   aliases. Route by question type: specs for expected behavior, decisions
   for rationale, events for history (FR-030).
4. Open the whole record. Check `status`. Follow its links and evidence
   before a consequential answer (FR-034).
5. The tracker for live work status.
6. Session history, only after current sources are insufficient or on
   request (FR-035), through the existing gated `session-search` skill.
7. Honest failure: name what was searched (FR-038).

Rules the skill states plainly: specs and primary sources outrank memory
(FR-031), an answer names its record and status (FR-032), empty stays empty
(FR-033), superseded records answer history questions only. `index.md` is a
convenience. Grep works when it is missing, and rebuilding it changes no
answer (FR-017).

## 10. Pins

`knowledge/memory/pins.md` is a plain list, created with the first pin:

~~~markdown
# Pinned memories

- The memory-system spec stays in the toolkit, never copied into projects.
  [record](decisions/memory-system-spec-stays-in-the-toolkit.md) (pinned 2026-08-18)
~~~

The statement is the record's approved one-sentence summary, copied at pin
time through the normal five-bullet approval (FR-057, FR-059). The check
script compares each pin line to its record's summary line and flags drift,
which replaces the old hash design with something a person can read. The boot
hook prints every pin. Superseding or retiring a pinned record removes its pin
in the same change (FR-061). Too many pins for a one-page brief is a warning
from the check script, never a silent drop (FR-063).

## 11. Lifecycle: eight actions as file edits

| Action | What the agent edits, after approval |
| --- | --- |
| NOOP | Nothing. The expected common case. |
| ADD | Create the record file. |
| CONFIRM | Add a dated confirmation line to the record's evidence. |
| CORRECT | Fix the record, note the reason and date. Git keeps the old text. |
| SUPERSEDE | Create the successor, set both `supersedes` and `superseded_by`, remove any pin, one commit. |
| RETIRE | Set `status: retired` with the reason. Grep the retired phrases and list every surviving copy for repair (FR-025). |
| MERGE | Only for identical meaning. Move evidence entries onto the survivor, supersede the duplicate (FR-026). |
| DELETE | Rare: duplicates, corruption, privacy, accidents. Reason goes in the commit message (FR-027). |

Every action runs through the remember flow and the guard. Git is the audit
trail. The coordinator, journal, and preimage machinery from the old design
are gone because a two-file Markdown edit does not need them.

## 12. Review, cleanup, and the check script

The `cleanup` skill is read-only until the owner approves each repair
(FR-039, FR-041, FR-042). It runs the check script, then its own grep passes
for near-duplicates and conflicts, and presents a worklist (FR-040). Every
repair goes through the normal five bullets.

`check-knowledge.mjs` verifies, deterministically: front matter fields and
allowed values, links resolve, pins match their records and point at active
records, superseded records carry their reciprocal links, `index.md` is
fresh, and no obvious secret patterns appear in the knowledge tree (FR-018).
It prints warnings and fixes nothing. Run it by hand, from the cleanup skill,
or before a pull request.

## 13. Scope and privacy

- All memory reads, searches, pins, and writes stay inside this project's
  `knowledge/` tree, and another project's files are never treated as this
  project's memory (FR-118). The hooks and scripts resolve paths from the
  project root. The rest is rule text, which is enough for repositories the
  owner controls.
- The privacy block in `project.md` (section 4) records standard or sensitive
  and whether content may leave the machine. Missing reads as strictest
  (FR-124).
- In a sensitive project the remember skill additionally requires a stated
  reason and owner approval for sensitive content, refuses third-party
  personal content without per-record approval, keeps sensitive records out
  of startup and pins unless exposure is approved by name, gates history
  search to owner request, and gives the Git-history warning before the first
  sensitive save (FR-126 to FR-130).

## 14. Migration from v1

Additive, incremental, approved, and plain (FR-051 to FR-055):

1. Add `current.md` from the project's existing handoff material, or empty
   with a stale warning until the first approved update.
2. Map the seven v1 memory folders to the four types: `decisions/` stays,
   most of `context/`, `domain/`, `knowledge/`, and `operations/` become
   facts or patterns, `planning/` becomes facts or moves to the tracker, and
   `references/` joins the mapped reference area. The agent proposes the
   mapping file by file as a dry-run list. Nothing moves until approved.
3. Add front matter to a legacy record when an approved change touches it.
   Never invent missing metadata; show it as missing.
4. Rebuild `index.md`, fix links in the same change as any move, run the
   check script.

Rollback is Git. No migration engine.

## 15. What v2 deliberately does not build

Each entry names its replacement. Building any of these later requires a new
owner-approved decision showing the simple version actually failing.

| Not built | Replaced by |
| --- | --- |
| Search index, embeddings, vector store, retrieval provider | Grep over canonical files (FR-037) |
| The 23-command `memory_*` tool API | Native Read, Grep, Edit, guided by skills |
| Write coordinator, locks, journals, content hashes | Small file edits plus Git |
| Retrieval tiers with scores and result contracts | The recall ladder, judgment, named sources |
| Byte-budgeted startup with degradation math | "About a page, point instead of paste" |
| Pin summary hashes | Plain text compared by the check script |
| Retrieval gold set and runner | Not needed to grep dozens of files |
| 22-check validator with shipped fixtures | One ~150-line check script |
| Monorepo subroots, symlink defense, reason codes | One scope rule in text (FR-118) |
| Keyboard shortcuts for review actions | Not possible for a skill in Claude Code |

## 16. Decisions

Compressed from the previous document's 38 ADRs. The full history stays in
Git.

- **D-01. Markdown and Git are canonical.** No database or vendor store ever
  holds the only copy of project knowledge.
- **D-02. The agent is the runtime.** Skills and rules carry the behavior.
  Scripts exist only for the boot brief, the write guard, the index, and the
  checks. This supersedes the old component model and coordinator.
- **D-03. Approval is enforced by the host's permission prompt.** A guard
  hook makes a direct knowledge write a visible owner decision in Claude
  Code. Codex gets the rule in text and an honest statement of the limit.
- **D-04. Direct file search is the whole retrieval system.** Any future
  accelerator needs a new decision backed by real failures on real project
  questions, and canonical recall must survive its absence.
- **D-05. Four record types, small front matter.** Facts, decisions, events,
  patterns, with confidence labels. The filename is the id. Git is the
  history.
- **D-06. `current.md` owns continuity.** It works with no tracker and no
  session history, travels with the repository, and changes only on its
  three triggers.
- **D-07. Pins are a plain list.** Drift between a pin line and its record is
  caught by the check script, not by hashes.
- **D-08. Host private memory is never project truth** and is disabled where
  the host allows it.
- **D-09. Session history stays read-only, in place, and gated.** Never
  copied, indexed, or summarized into a second store.
- **D-10. Small core, mapped roles, additive profiles.** Existing project
  areas are mapped, never moved. Domain profiles only add.

## 17. Requirement coverage

| Requirement group | Covered in |
| --- | --- |
| Orientation FR-001 to FR-008 | Sections 4, 6 |
| Placement FR-009 to FR-018, FR-109 | Sections 7, 12, 13 |
| Approval and lifecycle FR-019 to FR-028, FR-108, FR-110 to FR-113 | Sections 7, 11 |
| Retrieval FR-029 to FR-038 | Section 9 |
| Review and cleanup FR-039 to FR-045 | Section 12 |
| Host memory and migration FR-046, FR-050 to FR-055 | Sections 14, 15, 16 |
| Pins FR-056 to FR-063 | Section 10 |
| Setup and folders FR-065 to FR-073, FR-095 to FR-097 | Sections 3, 4, 14 |
| Completed work FR-074 to FR-081 | Sections 7, 8, 11 |
| Links FR-082 to FR-086 | Sections 5, 11, 12 |
| Data model FR-087 to FR-094 | Section 5 |
| Research spikes FR-098 to FR-101 | Section 4 (mapped areas) |
| Continuity FR-102 to FR-107, FR-114 to FR-117 | Sections 6, 8 |
| Scope and privacy FR-118, FR-124, FR-126 to FR-130 | Section 13 |

The pull request that builds each part names the requirements it satisfies.
No 131-row traceability table is maintained here; the requirements document
is the checklist and the build review is the proof.

## 18. Acceptance

The acceptance list lives in the requirements document, section 10. The build
adds these technical checks:

- Both hooks exit cleanly on every path, including missing files and a fresh
  template project.
- The boot brief renders correctly on a template project and on this
  repository.
- The guard turns a direct knowledge write into a visible decision, and the
  remember flow completes a normal save through it.
- The check script runs clean on the templates and reports seeded problems in
  a test fixture.
- A Codex session, following only `AGENTS.md`, starts oriented and completes
  a save with the five-bullet review.

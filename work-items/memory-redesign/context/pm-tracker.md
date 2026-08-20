# Memory system v2: PM tracker

Branch: claude/memory-redesign-impl-t5e3go. Run started 2026-08-20.
This run is autonomous. Nothing here is approved by Mike. Every item ships
"pending PR review".

Authority: functional-requirements.md and
memory-system-v2-master-technical-architecture.md. They win over the plan.

## Baseline taken at onboarding (2026-08-20, Phase 0 mid-flight)

All four repo checks green before any audit:

- node tests/link-check.mjs: 77 links across 178 files, 0 fail.
- node tests/orphan-check.mjs: 142 shipped files reachable, 0 fail.
- node tests/installed-copy-check.mjs: 21 checks, 0 fail.
- claude plugin validate .: passed.

Id ranges found (provisional, Phase 0 agents are still editing):

- FR-001 through FR-117, no gaps. Plan said FR-113 was the top, so P0-1 has
  already added four continuity FRs.
- ADR-001 through ADR-036, no gaps. Unchanged from the plan.
- AT-01 through AT-44, no gaps. Plan said AT-42 was the top, so two ATs are new.

Both authority documents still say draft in their headers. P0-6 has not landed.
work-items/memory-redesign/contracts.md does not exist yet, so P0-7 is open.
knowledge/specs/memory-system-v2.md still says "proposed", so P0-5 is open.
plugins/second-brain/tests/ holds knowledge-harness.mjs, retirement-harness.mjs,
session-search-harness.mjs. No v2 harness exists yet.

## Work item states

State vocabulary: not started / built this run / audited green / audited with
findings.

| Item | State | Findings |
|---|---|---|
| P0-1 | audited green | FR-114..117 added, FR-012 fixed out of list, both rejected phrases absent |
| P0-2 | audited green | current.md in required tree, tracker adapter optional, AT-43/44 added |
| P0-3 | audited green | FR-131, ADR-038, AT-46 confirmed present, section 21 expanded |
| P0-4 | audited green | 10240 bytes, pins.md and retrieval-gold-set.md homed in new 7.3.1 |
| P0-5 | audited green | superseded in place, index rebuilt, archive move still Mike's option |
| P0-6 | audited with findings | F1 traceability gap, ids otherwise clean |
| P0-7 | audited with findings | F2 templates-v2 absent from contracts |
| P1-1 | audited with findings | F5 invented `updated` front-matter field |
| P1-2 | audited green | degradation order matches 10.4 exactly, verified by reading |
| P1-3 | audited with findings | F6 wrong reason code for CLI misuse, F7 lib/ unowned |
| P1-4 | audited green | absent and failing fixtures both keep startup usable |
| P1-5 | audited green | 101 added lines, 0 deletions, report said 176 |
| P1-6 | audited green | 72-hour window taken from 10.3, nothing invented |
| P2-1 | audited green | schema 2.0, 19 of 22 MV checks honestly report skipped |
| P2-2 | audited green | sidecar binding is good design, now recorded in contracts |
| P2-3 | audited with findings | F9 four Bash evasion shapes get past the guard |
| P2-4 | audited green | 193 lifecycle checks, all eight operations |
| P2-5 | audited green | built across a container restart, result audited not process |
| P2-6 | audited green | SKILL-v2.md draft only, live skill untouched |
| P2-7 | audited with findings | F10 last-move.json is unnamed state, recorded and flagged |
| P3-1 | audited green | no-local-state proof run by me, 10 read ops created nothing |
| P3-2 | audited green | draft only, cites CLI flags so flag renames must update it |
| P3-3 | audited with findings | F14 session-search unwired into memory.mjs; diff additive, verified |
| P3-4 | audited green | severity vocabulary invented, recorded in contracts |
| P3-5 | audited green | AT-18 verified live by planting three real accelerators |
| P3-6 | audited with findings | F15 MV-17 privacy formats need Mike on substance |
| P4-1 | audited green | installed copy updated in same commit, trap avoided |
| P4-2 | blocked, held for Mike | safety layer stopped self-cutover, correctly |
| P4-3 | audited green | Gate 3 and project-sync on v2 |
| P4-4 | audited with findings | F16 rules describe v2, this repo's tree is still v1 |
| P4-5 | blocked | belongs inside the P4-2 commit |
| P4-6 | blocked | depends on P4-2 |
| P4-7 | blocked | 4.0.0 not released, still 3.9.0 |
| P4-8 | audited green | removal steps written, not yet exercised |
| P4-9 | blocked | three ATs cannot run unattended at all |

## Decisions made on Mike's behalf, needing his review

- D-PM-1: Version bumps. The plan's ground rules assume one PR per item and
  ordinary 3.7.x bumps through Phases 1 to 3. This run is one branch and one
  PR. Recommendation: skip the intermediate 3.7.x bumps and make one 4.0.0
  bump at P4-7. Fewer moving numbers, same end state.
- D-PM-2: Board issues, refinement sessions, and per-item approvals are
  collapsed into the one draft PR review. Recorded here so no file claims Mike
  approved an item he has not seen.

## Open questions for Mike

- Q1: Confirm D-PM-1 (single 4.0.0 bump at the end).
- Q3: contracts.md decisions C7 (exact guarded path set), C10 (startup hook
  fails open, guard hook fails closed, both exit 0), and C11 (one apply result
  shape) are new design, written this run. C10 is the one with teeth: it
  decides that a guard which cannot evaluate a path denies. Needs Mike.
- Q4: P0-5 marked the stale v2 spec superseded in place. Moving it to
  archive/ is still open and is Mike's call.
- Q5 (D-PM-4): `knowledge/current.md` front matter carries an `updated` date
  that no authority document names. FR-116 needs a date to compare against the
  recent window and this is the smallest way to hold one. Mike should confirm
  it, because it becomes part of every v2 project's shape.
- Q6: I edited contracts.md twice this run, on the coordinator's authority, to
  fix a self-contradiction and a missing reason code. Both are logged in
  check-in 2 and Mike reviews them at PR #210 with everything else.
- Q2: AT-20 is a manual owner check and the Codex halves of AT-01 and AT-05
  need a real Codex session. This run cannot do those. Plan is to record them
  as "not run, needs Mike" in the P4-9 record. Confirm that is acceptable.

## Risk register status

R1 through R8 are the plan's. Status updated at each check-in.

| Risk | Status at onboarding |
|---|---|
| R1 Phase 0 doc drift | partly materialized, see F1, otherwise consistent |
| R2 installed-copy-check hardcoded names | not yet, watch at P4-2 |
| R3 AGENTS.md 32 KB cap | not yet, watch at P4-5 |
| R4 parallel sessions clobber knowledge/ | live, see R-PM-2 |
| R5 guard blocks legitimate work | not yet, watch at P2-3 |
| R6 half-finished rewrite breaks main | live all run, see R-PM-1 |
| R7 build session follows stale spec | closed, P0-5 superseded it |
| R8 scope creep to indexes | not yet, watch at P3-1 and P3-5 |

## Risks in the run setup itself

- R-PM-1: One branch, no per-item PRs. D2 protects `main` by keeping v1 files
  untouched until P4-2. That still holds, but the plan's other protection was
  that each PR is independently green. Here the branch can sit broken between
  commits. Control: I run all four checks after every phase and refuse a go
  until they are green.
- R-PM-2: The plan required P4-2, P4-4, and P4-5 to land in one pull request
  so installed-copy-check never sees a half state. On one branch that becomes
  "one commit". If the orchestrator commits P4-2 without P4-4 and P4-5, the
  check breaks. Control: I will require those three in a single Phase 4 commit.
- R-PM-3: No refinement session per item means the only spec check is mine
  against the authority documents. Control: every audit cites the FR, ADR, or
  AT ids the item claims, and I open the file to confirm.
- R-PM-4: Phase 0 is editing the documents I audit against. Any id range I
  quote before P0-6 lands is provisional. Control: re-read the ranges at the
  Phase 0 check-in and treat that reading as the fixed baseline.

## Audit checklist per phase

### Phase 0 (documents only, no code)

1. No rejected phrase survives: grep both docs for "tracker must own the
   current state" and "from the tracker's authored handoff".
2. knowledge/current.md is in the required tree in section 7.3 and is no
   longer forbidden there. The tracker-adapter component row says optional.
3. Every FR, ADR, and AT id unique with no gaps, and every section 24
   traceability row resolves to a section that exists.
4. Both document headers say approved. Section 2 counts match the real id
   ranges.
5. knowledge/specs/memory-system-v2.md is superseded or archived with a
   pointer, and knowledge/index.md no longer lists it as a live proposed spec.
6. contracts.md exists and every section 8 component and section 16.1 tool
   resolves to a named file in it.
7. Four repo checks green. No file outside work-items/memory-redesign/,
   knowledge/specs/, and knowledge/index.md was touched.

### Phase 1 (startup and discovery)

1. D2 held: git diff shows zero changes to v1 files, specifically
   plugins/second-brain/hooks/knowledge-session-start.mjs, the v1 tools, and
   the v1 template tree.
2. New files exist and are named where the plan says:
   tools/boot-brief.mjs, tools/memory.mjs, tools/tracker-adapter.mjs,
   hooks/boot-brief-session-start.mjs, templates-v2 tree.
3. plugins/second-brain/tests/boot-brief-harness.mjs exists and I run it
   myself, green, with the over-budget, missing-source, and no-tracker
   fixtures actually present.
4. Boot brief never drops identity, purpose, handoff, valid pins, or the tool
   route under budget pressure. I read the degradation code against section
   10.4 order.
5. Naming rows added for every new file in plugins/second-brain/README.md, so
   orphan-check is green for a real reason and not because the files are
   unlisted.
6. Four repo checks green. Version bumps per D-PM-1.

### Phase 2 (lifecycle and schema)

1. D2 still held: v1 files untouched.
2. The remember rewrite is a SKILL-v2.md draft beside the live SKILL.md, not a
   live swap. Live remember/SKILL.md byte-identical to its pre-run state.
3. Harnesses exist and I run them: schema-harness.mjs, coordinator-harness.mjs,
   plus lifecycle and links fixtures. Crash-mid-transaction fixture recovers
   from the journal. AT-39 guard fixtures leave every canonical file unchanged.
4. Out-of-scope sweep: no database, no index file, no cache, no background
   process anywhere in the new code. Grep for sqlite, embedding, vector, index,
   cache, cron, watch.
5. The legacy gap state warns, never fails, per FR-053 and FR-055.
6. Four repo checks green.

### Phase 3 (retrieval and validation)

1. D2 still held, and recall, session-search, and cleanup rewrites are all
   SKILL-v2.md drafts, not live swaps.
2. Reads create no local state. I check the retrieval code writes nothing, and
   the .memory/-absent fixture (AT-17) passes.
3. R8 check: no retrieval acceleration added, and the AT-18 refusal check
   actually fails visibly when acceleration is enabled.
4. retrieval-harness.mjs, review-harness fixtures, gold-set.mjs and the gold
   set file exist, and I run them. Gold set has about ten questions and the
   named special cases.
5. memory.mjs validate covers 21 of the 22 section 18 checks, with check 18
   (migration integrity) correctly deferred to P4-1.
6. Four repo checks green.

### Phase 4 (adoption and cutover)

1. P4-2, P4-4, and P4-5 are in one commit. installed-copy-check green on that
   commit, with the hardcoded filename mapping in tests/installed-copy-check.mjs
   updated in the same commit (R2).
2. wc -c AGENTS.md reported and under about 24 KB, and the marker blocks in
   CLAUDE.md and AGENTS.md are identical (R3).
3. v1 files are gone: knowledge-session-start.mjs, the v1 tools, the v1
   template tree, knowledge/index.md, build-knowledge-index.mjs. save-reminder.mjs
   survives unchanged. The four SKILL-v2.md drafts are swapped into SKILL.md and
   the drafts removed.
4. knowledge/specs/memory-system.md keeps its path and now holds v2 content
   (D5). link-check green proves inbound links still work.
5. Migration was dry-run first and the report shows byte-preserving apply.
   flat-149 and retired-v3 are detect-only, retirement-harness.mjs retired (D4).
6. Version numbers agree in three places: plugins/second-brain/.claude-plugin/plugin.json,
   .codex-plugin/plugin.json, and metadata.version in .claude-plugin/marketplace.json.
7. All four repo checks green plus every plugin harness. P4-9 record lists each
   AT as passed, failed, or not runnable here with the reason.

## Findings log

### Check-in 1: Phase 0, audited 2026-08-20 at commit 97cb988, draft PR #210

Verdict: go for Phase 1, with two findings carried and four corrections that
Phase 1 builders must be told.

What I verified myself, not taken from the workflow report:

- Rejected phrases: zero hits for "tracker must own the current state",
  "from the tracker's authored handoff", and the shorter variants, in both
  documents. The surviving "authored handoff" hits are the corrected
  memory-owned phrasing and are correct.
- Id ranges, counted from the files: FR-001 to FR-131, ADR-001 to ADR-038,
  AT-01 to AT-46, MV-01 to MV-22. No gaps, no duplicate definition headings.
  All higher than the plan's stated ranges, so the workflow report was right.
- Required tree in section 7 includes knowledge/current.md and matches the
  four memory folders P1-1 must template. Section 7.3 no longer forbids it.
- Tracker adapter is optional in the section 8 component table and in the
  FR-103 traceability row.
- Budget: 10 KB, meaning 10240 bytes, and it covers the current and recent
  blocks rather than sitting on top of them.
- Pin registry home: knowledge/memory/pins.md. Gold set home:
  knowledge/retrieval-gold-set.md, mappable through knowledge/map.md. Both
  live in a new section 7.3.1 for optional canonical files, which is closed
  to a third file without a new ADR. That is a real reconciliation, not a
  restatement.
- P0-5: the stale spec header now says superseded, do not build from this, and
  knowledge/index.md line 39 carries that title instead of a live proposal.
- Four repo checks green after my STATUS.md edit: link-check 86 links across
  179 files, orphan-check 142 files, installed-copy-check 21 checks, plugin
  validate passed.
- File scope: git diff f3b424e..97cb988 touched only six files, all expected.
  No code, no plugin content, no rules. D2 is untested so far because Phase 0
  wrote no runtime files.

Findings:

- F1: Architecture section 24 has no traceability row for FR-075 through
  FR-080, FR-111, or FR-112. Those eight requirements appear nowhere in the
  architecture document at all. Section 2 states that section 24 carries a row
  for every requirement, so the document makes a claim about itself that is
  false. FR-075 to FR-080 are the completed-work event rules (P2-6) and
  FR-111 to FR-112 are the review-file and confirmation rules (P2-2). Neither
  cluster is Phase 1 work, so this does not block Phase 1. It must be closed
  before Phase 2 is audited, because P2-2 and P2-6 have no architecture
  section to build against.
- F2: contracts.md never mentions the templates-v2 tree. P1-1's whole
  deliverable has no contract entry, so a builder told to follow contracts.md
  finds nothing there. Templates are not a section 8 component, so contracts
  is not strictly incomplete, but the builder must be sent to the plan's P1-1
  text and the architecture section 7 tree instead.
- F3: implementation-plan.md still says FR-113, ADR-036, AT-42 are the top
  ids, and its traceability table is written against those. Reality is
  FR-131, ADR-038, AT-46. Every later builder reads this plan.

Decisions and corrections from this check-in:

- D-PM-3: On F3, a minimal dated factual note in the plan is justified and I
  recommend it. One line saying the real id ranges and pointing at the
  authority documents. No renumbering of work items, no rewrite of the
  traceability table, no change to any deliverable. The kickoff bars changing
  the plan's substance, and a note that only records what the ids now are does
  not change substance. It goes in the Phase 1 commit and Mike reviews it with
  everything else at PR #210.
- The stale threshold for current.md is not missing. FR-116 says "older than
  the recent window" and section 10.3 defines that window as 72 hours. P1-6
  uses 72 hours and invents nothing.

Risk register changes: R7 closes, the stale spec is superseded. R1 downgrades
to watch, the two documents came through consistent except F1. Everything
else unchanged.

### Check-in 2: Phase 1, audited 2026-08-20 at commit 2205029

Verdict: go for Phase 2. F1 is closed. Three new findings, none blocking.

What I verified myself:

- F1 closed. Every one of the 131 requirements now has a section 24
  traceability row, and none is absent from the architecture document. I
  re-ran the same check that found the gap.
- D2 held. `git diff --name-status 5af666f..2205029` touched no v1 runtime
  file. The v1 hook, the v1 tools, the four v1 skill texts, and everything
  under `.claude/` are untouched. Every new runtime file is a new name beside
  the v1 file, exactly as D2 requires.
- Five harnesses run by me, all green: boot-brief 105, capabilities 71,
  knowledge 179, session-search 28, retirement 33. 416 checks.
- Four repo checks green, both before and after my own contracts.md edits.
- Degradation order read against section 10.4 line by line. `DEGRADATION_STEPS`
  is warnings, recent, current, map, in that order. Step 3 filters out current
  focus, blockers, and next step, so it cannot touch the protected areas. When
  the required set alone exceeds the budget the brief runs long, raises
  `startup/over-budget`, and renders visible overflow with the real byte count.
  Nothing required is dropped. This matches the architecture.
- Out-of-scope grep over the new tools and hook: clean. The only hit is a
  comment in `boot-brief.mjs` saying it keeps no cache and no index.
- Versions: second-brain 3.7.0 in both manifests, marketplace 0.77.0. This is
  the intermediate bump pattern the plan describes, not D-PM-1. It is
  harmless and I am not asking for a revert. D-PM-1 now means the final bump
  at P4-7 is 4.0.0 regardless of what the intermediate numbers reached.
- `memory.mjs capabilities` in this repo exits 2 with `scope/unresolved-root`,
  because this repo is still v1 and its `project.md` has no `project_id`. That
  is correct behavior under D3, not a defect.

Findings:

- F5: `knowledge/current.md` carries an `updated` date in front matter. Neither
  authority document names a field to hold it, so Phase 1 invented one. It is a
  reasonable minimal answer to FR-116, which needs a date to compare against
  the recent window, and the alternative of parsing the newest date out of the
  body is worse. It is still unapproved design, and it binds P2-2. Recorded as
  D-PM-4 and flagged for Mike.
- F6: `memory.mjs` reports an unknown operation or a bad flag as
  `record/schema-invalid`, which is a record-field code. I confirmed it by
  running an unknown operation and a bogus flag. Ruled below.
- F7: `tools/lib/scope.mjs` and `tools/lib/result.mjs` have no owning work
  item in contracts.md, yet they now hold scope resolution, the fail-closed
  privacy default, and the result envelope. Every Phase 2 item touches them.
  Not a defect, but unowned shared code drifts.
- F8, minor: the P1-5 report said 176 added lines to the setup skill. The
  actual diff is 101 added, 0 removed. The shape of the claim was right and
  the number was not.

Rulings I made and the contracts.md edits I logged:

- Flag 1, the `memory.mjs brief` mismatch. Fixed the document, not the code.
  Section 2.24 named a `brief` passthrough while section 5.2's shipped Codex
  route text calls `boot-brief.mjs` directly. The direct call wins: one entry
  point per job, and the other way would mean changing route text already
  written into a shipped skill for no behavior gain. Edited section 2.24 to
  drop the command, say the assembler is run directly, and record why.
- Flag 2, the missing CLI reason code. Added `cli/invalid-invocation` at exit
  2 to the section 1.6 table. Exit 2 matches the other codes for "could not
  even try". One code covers both an unknown operation and a bad flag, with
  the message naming which, so the closed list stays small. `memory.mjs` has
  to switch from `record/schema-invalid` to it in Phase 2.
- Flag 3, `tools/lib/` ownership: not a doc fix. Assigned to P2-1 below.
- Flag 5, `knowledge-harness.mjs` pinning other plugins' versions: pre-existing
  and out of scope for this run. Logged, not fixed. Worth a ticket after the PR.

Risk register changes: R6 holds well, D2 is proven for a whole phase now.
R8 clean, nothing acceleration-shaped appeared. No risk materialized.

### Check-in 3: Phase 2, audited 2026-08-20 at commit 57f6508

Verdict: go for Phase 3. Two findings, one of them the most serious of the run
so far, neither blocking Phase 3.

What I verified myself:

- D2 held. `git diff 769f06c..57f6508` touched no v1 hook, no v1 tool, none of
  the four v1 skill texts, and nothing under `.claude/`. The remember rewrite
  is a `SKILL-v2.md` draft beside an untouched live skill, exactly as D2 says.
- Nine harnesses run by me, all green, 940 checks: boot-brief 111,
  capabilities 71, coordinator 161, knowledge 179, lifecycle 193, links 87,
  retirement 33, schema 77, session-search 28. Four repo checks green before
  and after my contracts edits.
- The named fixtures exist and are real. The crash fixture spawns a child that
  stops between staging and validation, which is the only honest way to leave a
  journal behind, and recovery happens at the next call. The AT-39 guard
  fixtures assert the canonical files were never created, not merely that a
  refusal was printed. The AT-06 pin isolation pair uses two physical projects.
- The report said coordinator-harness had 133 checks. It has 161. Under-
  reporting, not over-reporting, so no concern beyond report accuracy.

Adversarial guard testing, 30 shapes fired by me at the real hook:

- Correctly refused: plain redirect, subshell redirect, `tee`, `tee -a`,
  `sed -i`, `cd` then relative write, absolute path, heredoc, `mv`, `rm`,
  bare truncation, backtick subshell, semicolon chain, env-var prefix,
  `perl -pi`, `awk` redirect, `cp`, `install`, `sh -c`, `bash -c`, `eval`,
  Edit and Write on guarded paths, and a malformed tool input.
- Correctly allowed: reading a guarded file, grepping the guarded tree, Edit
  and Write on unguarded paths, `git` commands per C8, and `memory.mjs`.
- Fails closed correctly: a guarded-looking path outside any project is denied
  because the scope will not resolve.
- F9, the finding: four indirect shapes are allowed. `xargs` feeding a guarded
  path into a writing command, an interpreter one-liner with the path inside
  the code string (`python3 -c`, `node -e`), `dd of=<guarded>`, and `ln -sf`
  over a canonical file. In each case the guarded path never appears as an
  argument to a command the guard recognises as a writer.

  How much this matters: the guard's job under FR-108 and AT-39 is that an
  agent which skips review cannot write. These four shapes mean a determined
  route still can. It is not a Phase 3 problem, because Phase 3 is read-only,
  but it must be closed before P4-2 installs the guard in this repository.
  The fix is not a blanket rule. Denying every command that merely mentions a
  guarded path would refuse `cat` and `grep`, which are legitimate and
  constant. The targeted fix is to extend the writer set with `dd` when `of=`
  names a guarded path and with `ln`, and to treat `xargs` and an interpreter
  `-c` or `-e` string that contains a guarded path as unevaluable, which the
  guard's own stated fail-closed rule already says to deny.

- F10: `.memory/last-move.json` is new persistent state no document named. It
  is written by a write rather than a read, lives in the gitignored derived
  folder, and is rebuildable, so it does not break AT-17 or the no-caches rule.
  It is still an addition. Recorded in contracts and flagged for Mike.
- F11: a cross-scope record or pin id answers `record/unknown-id`, so
  `scope/cross-scope-result` is unreachable. AT-45 requires the refusal to name
  the operation, the path, and the resolved root, and `record/unknown-id` names
  no root. This has to be fixed before P4-9 or AT-45 fails on its cross-scope
  clause. Carried in STATUS.md.
- F12: `PIN_STATEMENT_LIMIT` is 320 bytes and no document names that number.
  Same class as the `updated` field: a reasonable invention that becomes part
  of every project's behavior. Flagged for Mike.

Contract drift rulings. Four recorded as reality in contracts.md, two deferred:

- Recorded: the five `lib/` modules, with P2-1 named as the folder's owner,
  which also closes F7 from the last check-in. The `.proposal.json` sidecar,
  in a new section 2.23.1 covering every derived file under `.memory/`. That
  sidecar is good design, not drift: keeping binding data out of the reviewed
  Markdown is what makes FR-112's "approve the exact contents" safe when the
  owner edits the file. The `last-move.json` receipt, recorded with its flag.
  And `memory.mjs move`, recorded as a supporting command like `cancel`,
  because FR-086 requires the behavior while section 16.1 lists no move
  operation. If Mike wants it on the 16.1 surface, that is an architecture
  edit and the contracts row follows it.
- Also recorded: every supporting command returns the section 1.5 apply shape
  including `changed_paths`, so `rebuild-views` reporting it is C11 working,
  not drift.
- Deferred to Mike: F11 and F12 above. F11 is a code fix, not a doc fix, and
  F12 is a number he should get to see.

Risk register changes: R5 is the one to watch now. The guard is strict enough
that F9 is about under-blocking, not over-blocking, and I found no false
refusal in 30 shapes. R6 and R8 still clean.

### Check-in 4: Phase 3, audited 2026-08-20 at commit 5182def

Verdict: go for Phase 4, with a commit plan that is not optional.

What I verified myself:

- F9 closed. All four bypass shapes now refuse. I also fired four shapes the
  fix was not told about, `ruby -e`, `xargs tee`, `busybox sh -c`, and
  `find -exec`, and all four refuse. Across 40 shapes total I have found no
  false refusal: reads, greps, git, unrelated interpreter calls, and unguarded
  Edit and Write all pass through silently.
- F13, two new gaps, narrower than F9: an interpreter fed by a heredoc rather
  than by `-c` (`python3 <<EOF`), and `rsync` into a guarded path. Same class,
  same targeted fix. Neither blocks Phase 3.
- Eleven harnesses run by me, 1248 checks, all green. Gold-set self-test 39.
  Four repo checks green. `retirement-harness.mjs` is gone per D4 and
  orphan-check still passes, which is the proof its naming row went with it.
- The no-local-state proof, run by me rather than read: ten read operations
  plus the boot brief against a real fixture project, filesystem hashed before
  and after. Nothing created, changed, or removed. `.memory/` never appeared,
  and search still answers with it absent, which is AT-17.
- AT-18 proved live, not asserted. I planted `better-sqlite3`, `node:sqlite`,
  and `faiss-node` imports into the retrieval path one at a time and the
  self-test failed each time, then restored the file and confirmed it matched
  byte for byte. The `node:sqlite` case is the hole the phase found and fixed.
- `search-sessions.mjs` is genuinely additive: 220 added, 7 removed, and the
  seven are a moved import and refactored call sites, not removed behavior.
  The pre-phase harness passes unchanged against the new file.
- `tools/isolation-fixtures.mjs` sits in the tools folder for a real reason,
  documented in the file and in a README naming row: building a fixture writes,
  and the AT-18 scan forbids a write call in the retrieval path. Sound.
- One STATUS.md number was wrong and I corrected it: the session-search harness
  was 28 before this phase, not 21. I measured 28 at two earlier check-ins.

Findings:

- F14: `memory.mjs session-search` is unwired. Nothing on the v2 tool surface
  reaches the gate, so FR-035 and FR-104 are satisfied only through the skill
  and the script. Must be wired before P4-9.
- F15: MV-17 defines three shapes no authority names, and unlike the run's
  other inventions these are the privacy boundary itself: the secret pattern
  set, the sensitive-section line shape, and the exemption record shape. A
  pattern set that is too narrow fails quietly. Mike must approve the
  substance, not just be told it exists.

Rulings:

- Acceleration refusal: added `policy/acceleration-refused` at exit 1 to the
  contracts section 1.6 table. `record/schema-invalid` for a policy refusal
  would make a harness unable to tell a malformed record from a banned import.
- Review severity: recorded `high`, `medium`, `low` in contracts section 2.8 as
  built, flagged at the low end. Review writes nothing, so the vocabulary only
  orders a list the owner reads.
- MV-17 formats: recorded in contracts section 4 as built, with an explicit
  note that Mike must approve their substance. Recording them keeps Phase 4
  from inventing a second set; the flag keeps them from passing as approved.

Risk register: R-PM-2 is now live and is the main thing I am managing into
Phase 4. R2 is live with it. R4 is smaller than feared, see the commit plan.

### Check-in 5, final: branch audited 2026-08-20 at commit 147c3fc

Verdict: the branch is sound, green, and installable. The cutover is correctly
held. Nothing here should be merged before Mike reviews the decision list.

Verified myself at 147c3fc:

- Eleven harnesses, 1357 checks, all green. Gold-set self-test 39. Four repo
  checks green. `claude plugin validate .` passes, so the branch is installable.
- The v1 runtime in this repository still works. I ran the v1 SessionStart hook
  and it produced its briefing at exit 0. It is still the registered hook. The
  v1 tools are in place, all four live `SKILL.md` files are untouched with their
  drafts beside them, and the v1 `knowledge/` tree is intact. D2 held for the
  whole run, across four phases.
- The four carried fixes are real, not reported. I re-fired the guard shapes:
  `rsync` and the interpreter heredoc now deny, the earlier F9 shapes still
  deny, and reads and git still pass silently. `session-search` is now a real
  operation on `memory.mjs`. `scope/cross-scope-result` is reachable from three
  paths in the code, through a new `lib/cross-scope.mjs`.
- The P4-1 trap I flagged was avoided: `.claude/tools/knowledge-layout.mjs` was
  updated in the same commit as the plugin original.

F16, the one new finding: the P4-4 rules now describe the v2 taxonomy while
this repository's tree is still v1, so the routing rule points at folders that
do not exist here. The note explaining this exists only in the commit message,
which no session reads. I put it in STATUS.md under "Where we are", which the
kickoff tells every session to read first. Reverting the rules would break
`installed-copy-check`, so leaving them ahead of the tree is the least-wrong
state, but it is a real mismatch and it should not sit for long.

F17, minor: `lib/cross-scope.mjs` is a sixth shared module and the contracts
table says five. Documentation lag, same class as the earlier one.

On the block itself: the safety layer stopped an unattended agent from
rewriting this repository's own settings, deleting its live runtime, and
swapping its live skills. That is the correct outcome and the coordinator was
right to respect it rather than route around it. It is also the single change
in this whole plan that most deserves a person watching, because it is the one
that can leave the repository unable to start a session properly.

## Final decision list for Mike, 17 items, heaviest first

Privacy and data shape, approve the substance not just the existence:

1. **MV-17's three privacy formats.** The secret pattern set, the sensitive
   section line shape, and the exemption record shape. No authority document
   named any of them, so P3-6 defined them. They decide what counts as a leaked
   secret in every v2 project, and a pattern set that is too narrow fails
   quietly. This is the one I would not let through unremarked.
2. **Retire `knowledge/memory/tags.md`.** v2 has no tag registry. Content stays
   in git history. Needed before the cutover runs.
3. **Retire `knowledge/index.md`.** Generated views replace it, and
   `build-knowledge-index.mjs` retires with it. Needed before the cutover runs.

Invented shapes that become part of every v2 project:

4. **The `updated` date in `current.md` front matter.** FR-116 needs a date to
   compare against the recent window and no document named a home for one.
5. **The 320-byte pin statement limit.** No document names a number.
6. **The review severity vocabulary**, high, medium, low. Lowest weight of
   these: review writes nothing, so it only orders a list.
7. **`.memory/last-move.json`.** A move receipt for validator check MV-22.
   Derived, gitignored, rebuildable, but state no document asked for.

Contract and surface decisions:

8. **`memory.mjs move`.** FR-086 requires the behavior, architecture section
   16.1 lists no move operation. Recorded as a supporting command. If it should
   be a real operation, that is an architecture edit.
9. **Seven contracts.md amendments made during the run:** removing the
   `memory.mjs brief` passthrough, adding `cli/invalid-invocation`, adding
   `policy/acceleration-refused`, the new section 2.23.1 covering derived files
   under `.memory/`, the `lib/` table going from three modules to five and now
   six, the move command row, and the MV-18 follow-ups.
10. **C7, C10, C11 from the contracts document.** C10 is the one with teeth: a
    guard that cannot evaluate a guarded path denies.
11. **Edits to `skills/second-brain/SKILL.md` outside their stage boundary.**

Housekeeping:

12. **The plan's stale id ranges.** `implementation-plan.md` says FR-113,
    ADR-036, AT-42. Reality is FR-131, ADR-038, AT-46. A dated factual note was
    recommended, not a rewrite.
13. **FR-110's keyboard shortcut goes unmet** through its own escape clause.
    Claude Code gives a skill no way to register one.
14. **The superseded v2 draft spec** at `knowledge/specs/memory-system-v2.md`
    was marked superseded in place. Moving it to `archive/` is still open.
15. **P4-4's rules now describe v2 while this repo's tree is v1.** Temporary
    and labeled, but it should not sit for long.
16. **Version path.** second-brain took ordinary bumps to 3.9.0 during the run.
    4.0.0 belongs to P4-7 and has not happened.
17. **Three acceptance tests need a person.** AT-20 is a manual owner check,
    and the Codex halves of AT-01 and AT-05 need a real Codex session.

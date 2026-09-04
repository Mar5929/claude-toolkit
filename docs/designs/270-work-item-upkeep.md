# 270: agents keep the active work item accurate

The build plan for GitHub issue #270 on `Mar5929/claude-toolkit`. Requirements
and approved design decisions live in that issue body. This file says how they
get built and does not restate them.

Read the issue first: `gh issue view 270 --repo Mar5929/claude-toolkit --comments`.

## The shape of the answer

Three layers, following the split recorded in `docs/toolkit-map.md` for issue
#260: **the code stores, the rule decides.**

| Layer | File | Covers |
| --- | --- | --- |
| Code | `plugins/work-tracker/skills/work/scripts/lib/tracker.mjs` | Local-folder tracker only |
| Skill | `plugins/work-tracker/skills/work/SKILL.md` | Local-folder tracker only |
| Rule | `plugins/project-init/library/rules/general/work-item-stages.md` | Both modes, tracker-neutral |

Approved decision 1 says the code lands in the local tracker and the written
guidance covers both modes. GitHub-issue mode has no code, so everything it
needs goes in the rule, which is already tracker-neutral and already carries a
GitHub commands section.

No new skill and no new rule. Approved decision 5.

## Eight code changes

Numbered `C1` to `C8` and referenced by number below.

### C1. A note without a stage reaches the progress log

`tracker.mjs:601-604`. Today the progress entry is built only when `--stage` was
passed, so `work update WI-014 --note "Mike approved the API shape"` reaches
`HISTORY.ndjson` and never reaches the Progress log in `STATUS.md`. Most of what
requirement 7 asks agents to capture does not move a stage.

Build the entry when `--stage` was passed **or** `--note` was given explicitly.
Not when neither was: `note` currently falls back to `changes.join("; ")`, and
writing "branch updated" into the progress log is exactly the routine activity
requirement 10 excludes.

The stage label falls back to the item's existing stage, or `--` when the item
has none. An item with no stage stays normal (requirement 15).

This is the smallest change here and the highest value one.

### C2. Work type becomes flexible

`tracker.mjs:23` fixes type to `bug`, `enhancement`, `task`. `validateRecord`
rejects anything else at line 2013, and `update` has no `--type` flag, so a type
cannot be corrected after creation.

- Rename `TYPES` to `COMMON_TYPES` and add the approved list: `discovery`,
  `solution-design`, `build`, `data-load`, `maintenance`, `research`, `task`.
  Keep `bug` and `enhancement` so existing items stay valid.
- `validateRecord` accepts any non-empty single-token string. The common list
  becomes a suggestion surfaced in `help`, not a gate.
- Add `--type` to `update`.

Requirement 14 forbids backfill, so nothing rewrites an existing item's type.

### C3. The requirements gate stops blocking non-build work

`requireFinalizedRequirements` fires from three places: `updateItem` when a
stage derives Ready, In Progress or In Review (lines 538-540), `startItem`
(line 502), and `finishItem` (line 688). Discovery, research and solution design
are exactly the work approved answer 4 exempts, and they all derive In Progress.

The **type** decides, not the status:

- `build` and `data-load` keep the gate. Requirement 3 says so directly.
- `discovery`, `research`, `solution-design` do not.
- Every other type, including a missing one, keeps the gate. Failing closed on
  an unknown type is safer than the reverse, and the agent can change the type.

This narrows a gate that already exists. It is not a new guard and so is not a
reversal of #260. Say that plainly in the commit message; a reader seeing
`requireFinalizedRequirements` move will otherwise assume the opposite.

### C4. `finish` records who approved, and never refuses

`finishItem` (line 685) sets Done from `git merge-base --is-ancestor` alone. No
approver, no prompt. Approved decision 4 settles the shape: record it, say so
when it is missing, surface it in validation, block nothing.

- Add optional `approved_by` and `approved_date` to the record. Optional on
  read, so requirement 14 holds and no existing item fails.
- `finish --approved-by NAME` records both.
- Without it, `finish` still works and still sets Done. Its output says in one
  line that no approver is recorded.

`REQUIREMENTS.md` already carries `approved_by`, so this follows a precedent
rather than inventing a field.

### C5. Cancelled stays hand-set

No code change. `update --status Cancelled` already works, `validateRecord`
already exempts Cancelled from needing a next step, and C1 makes the reason
reach the progress log. Requirement 14 is guidance, and it lands in the skill
and the rule.

Listed here so a reader does not go looking for the code that implements it.

### C6. A completion event other systems can read

Requirement 16 and the boundary drawn with issue #269.

One append-only file, `.work-items/EVENTS.ndjson`, at the tracker root. One JSON
object per line: item id, title, event kind, resulting status and stage, date,
approver where one exists, and the landing commit.

Written inside the same `atomicBatchWrite` call as the item update in
`writeItemFiles` (line 1651), so the event can never disagree with the record it
describes.

`finish` writes `work_completed` when the commit lands and the item goes Done.
Nothing else writes an event yet. Keep it to completion; requirement 16 asks for
a work-completion event and nothing wider.

The second brain reads this file and writes only into `knowledge/`. It never
writes into `.work-items/`, which makes "the tracker remains the only owner"
true by construction instead of by instruction.

### C7. The session knows which item is active

Approved decision 3. The one genuinely new component, and the only mechanism
behind hard stop 1.

`.work-items/ACTIVE.json` maps a **branch name** to an item id, a date, and
nothing else. Branch, not session id: an agent cannot reliably read a session
id, one branch is one piece of work in this workflow, and the mapping survives a
session ending.

New commands:

- `work session` reports the active item for the current branch.
- `work session set WI-014` records it.
- `work session clear` removes it.

`update` and `finish` **refuse** an item that is not the current branch's active
item, unless `--force` is passed. When the branch has no entry, nothing is
enforced, so every existing item and every ad-hoc use is unaffected.

Refusing is deliberate here. Approved decision 4 softened hard stop 3 only. Hard
stops 1 and 2 were approved as refusals and are not quietly softened to match.

**Open for Mike:** he may want this to warn instead of refuse, for the same
reason he gave on decision 4. Ask before building C7, not after.

### C8. Validation surfaces a stale item

The audit's unexpected finding: a stale item passes `validate` clean. The
DragonFly WI-014 evidence in the issue validates with no complaints. Validation
checks structure, links, dates and completion evidence, and never staleness.

Two new **warnings**, never errors:

- An `In Progress` item whose `updated_date` is more than 14 days old.
- A `Done` item with no `approved_by` (from C4).

Warnings because requirement 14 forbids backfill: as errors, every existing Done
item would fail validation on the first run.

**This is a partial reversal of #260.** The code is being taught to judge, not
just to store. It is limited to warnings so the reversal stays small, but it is
a reversal. Present it as one in the pull request. Do not slip it in.

## Requirement-by-requirement mapping

Every functional requirement in the issue body, in the order it appears there.

| # | Requirement, in short | How it is met |
| --- | --- | --- |
| 1 | Check the active item before substantial work; ask rather than guess | C7 stores it, `update`/`finish` refuse a mismatch. Skill `S3` adds the orientation step. Rule `R1` covers GitHub mode |
| 2 | Each item identifies its type of work | C2 |
| 3 | Type guides the lifecycle and approval needs without forcing one process | C2 plus C3. Build and data-load keep the requirements gate; discovery, research and solution design do not |
| 4 | Status, stage, next step, blockers, update date and landing evidence stay accurate | Already stored. C8 makes a stale item visible. Skill `S4` and rule `R4` say when to write |
| 5 | One action updates stage, status, progress log and history together, all or nothing | Already true through `atomicBatchWrite` in `writeItemFiles`. C1 fixes the one branch where the progress log was skipped. C6 puts the event inside the same batch |
| 6 | Judgment about what counts as meaningful progress | Rule `R2`. No code |
| 7 | Record Mike's choices and decisions during the conversation, not at the end | C1 is the mechanism. Skill `S4` and rule `R2` say to use it |
| 8 | Shorten his wording, never interpret it; ask when unclear | Rule `R2`. No code. Nothing can check this |
| 9 | Record a reported outside approval without claiming to have verified it | C4 stores the approver. Rule `R3` says not to claim verification |
| 10 | Routine activity is not progress | C1's condition: a bare mechanical change writes no progress line |
| 11 | Stages may be skipped, revisited, or gone backwards | Already true; nothing in code checks a stage. Rule `R5` |
| 12 | At the end of substantial work, record the exact next step and blockers | Skill `S5`, rule `R4`, and the handoff skill change `H1` |
| 13 | Summarize, then ask whether to mark it Done; an earlier clear yes counts | C4 plus skill `S5` |
| 14 | Stopped work is Cancelled, not Done; build work says whether it reached the default branch | C5, plus `finish` already reporting ancestry |
| 15 | Legacy items are not backfilled | Every new field is optional on read. C8's checks are warnings for this reason |
| 16 | A dependable completion event other systems can react to | C6 |

## Approved design decision mapping

| Decision | How it is met |
| --- | --- |
| 1. Both modes, split by layer | Code in `tracker.mjs` (local only). Guidance split: skill for local, rule for both. GitHub commands go in `R6` |
| 2. The design document lives in the repository | This file, at `docs/designs/270-work-item-upkeep.md`. Deleted at stage 14 per that folder's README |
| 3. Session active-item tracking is built; the stage-reminder hook is retired with it | C7 builds it. `X1` retires the hook |
| 4. `finish` records approval, never refuses; validation surfaces the gap | C4 plus C8. His reason is quoted in the rule at `R3` so it is not lost |
| 5. No new skill, no new rule | Every change edits an existing file. The change list below has no new skill or rule in it |

## Guidance changes

### Skill: `plugins/work-tracker/skills/work/SKILL.md`

- **S1.** Line 86 defines In Progress as "actively being implemented". Approved
  answer 4 says the opposite. Change to "actively being worked", and say that an
  In Progress item does not by itself mean building has started.
- **S2.** Replace the fixed `bug`/`enhancement`/`task` line with the flexible
  list from C2.
- **S3.** Add the session active item to "Orient before changing work" as a new
  first step, ahead of `status`.
- **S4.** New section on recording Mike's decisions while they happen: use
  `update --note`, keep his words, do not add reasoning he did not give, ask one
  short question when the meaning is unclear.
- **S5.** Extend "Close substantial work" with the completion conversation:
  summarize what was done, name known gaps, give the evidence, ask, then
  `finish --approved-by`.
- **S6.** The existing line saying a solution architecture "belongs in the
  repository instead" now has an address: `docs/designs/`.

### Rule: `work-item-stages.md`

The shipped original is
`plugins/project-init/library/rules/general/work-item-stages.md`. This repo's
copy at `.claude/rules/work-item-stages.md` must stay byte-identical or
`tests/installed-copy-check.mjs` fails. **Change both in the same commit.**

- **R1.** In Progress means actively worked. Type guides approval needs.
- **R2.** What counts as meaningful progress, and how to record Mike's words
  without interpreting them.
- **R3.** The completion conversation, the approver, and not claiming to have
  verified an approval that was reported rather than witnessed. Carry his reason
  for decision 4 in his own framing: he wants agents managing the process rather
  than the process hard-coded into the tool.
- **R4.** The end-of-work handoff: exact next step, blockers or none, open
  questions.
- **R5.** Stage `04` says the design goes in `docs/designs/<id>-<slug>.md`.
  Stage `14` says delete it once the specification is current. Without these two
  lines an agent at stage 14 is never told the file exists, and the folder fills
  with stale build plans.
- **R6.** The `gh` commands for GitHub-issue mode, for each of the above.
- **R7.** Legacy items carry no stage and that is not an error. Already present;
  check it still reads correctly beside the new material.

### Handoff skill: `plugins/session-skills/skills/handoff/SKILL.md`

- **H1.** Its five steps are knowledge review, wait, draft, verify, show. There
  is no tracker step at all, which is why session-end handoffs lose work-item
  state. Add one step: update the work item's next step and blockers before
  drafting the prompt. This is requirement 12's real gap.

### Retiring the stage-reminder hook: `X1`

Approved decision 3. Orientation moves to the start of work, so the hook's
timing (after the first file edit, blind to shell commands) is no longer needed.
It touches more places than it looks:

- `plugins/hooks-library/hooks/work-item-stage-reminder.mjs` and the installed
  copy `.claude/hooks/work-item-stage-reminder.mjs`
- `.claude/settings.json:50`
- `.claude-plugin/marketplace.json:35`
- `plugins/hooks-library/.claude-plugin/plugin.json` and `.codex-plugin/plugin.json`
- `plugins/hooks-library/README.md` (two places)
- `plugins/hooks-library/skills/hooks-library/SKILL.md`
- `plugins/project-init/skills/project-init/SKILL.md` and
  `references/setup-flow.md`
- `plugins/project-init/skills/project-sync/SKILL.md` (three places)
- `docs/toolkit-map.md:278`
- `.claude/toolkit-sync.md`, which records why it was retired

## Tests

**The constraint that shapes this: stages, the progress log and the
stage-to-status mapping have no test coverage.** Of 37 tests in
`plugins/work-tracker/tests/work-tracker.test.mjs`, `updateItem` is exercised
once, at line 375, and only on a path expected to fail. This issue changes
untested code.

**Phase 0 comes before any change.** Write characterization tests for what the
code does today:

- `update --stage` writes the stage, derives the status, appends the log line.
- `update --note` alone writes history and no log line. *This test passes now
  and must be inverted by C1. That inversion is the proof C1 worked.*
- Each stage number derives the right status, and `14` never writes Done.
- An unknown stage string is stored as typed.
- An item with no stage stays valid.

Then per change:

| Change | What the test proves |
| --- | --- |
| C1 | A note alone reaches the Progress log; a bare mechanical change does not |
| C2 | A custom type is accepted and validates; `update --type` corrects one |
| C3 | A `discovery` item reaches In Progress with refining requirements; a `build` item still cannot |
| C4 | `finish --approved-by` records it; `finish` without it still sets Done and says so |
| C6 | The event line is written in the same batch, and an interrupted write leaves neither |
| C7 | A mismatched id is refused; `--force` passes; no entry means no enforcement |
| C8 | A stale item warns and stays valid; a Done item with no approver warns |

Then the four repository checks, all of which must pass:
`node tests/link-check.mjs`, `tests/orphan-check.mjs`,
`tests/installed-copy-check.mjs`, `tests/knowledge-startup-check.mjs`, plus
`claude plugin validate .`.

**Two of those four fail on `main` today**, for a reason that predates this
issue: commit `8dac831` deleted
`plugins/project-init/library/rules/general/project-file-lifecycle.md` and left
eight references to it, including
`tests/installed-copy-check.mjs:164`, which reads the file with no guard and
crashes. Establish the baseline before starting, and do not attribute those two
failures to this work. Fixing them is a separate decision for Mike.

## Order of work

Each numbered step is independently shippable. Stop at any of them and what
landed still works.

0. **Characterization tests.** Nothing else starts first.
1. **C1**, the progress-log branch. Smallest change, largest effect.
2. **C2** and **S2**, flexible type.
3. **C3**, narrowing the requirements gate. Depends on C2, because type decides.
4. **C4** and **C8**, the approver and the two warnings. Present C8 as a partial
   #260 reversal.
5. **C7**, session active item. **Ask Mike about refuse-versus-warn first.**
6. **C6**, the completion event. Last of the code, because #269 consumes it and
   that is separate work.
7. **S1, S3, S4, S5, S6**, the skill.
8. **R1** to **R7**, the rule, in both copies in one commit.
9. **H1**, the handoff skill step.
10. **X1**, retiring the hook, with the `.claude/toolkit-sync.md` record.

## What this design does not settle

- **C7 refuses; decision 4 says record and surface.** The two pull in opposite
  directions. Hard stop 1 was approved as a refusal and hard stop 3 was
  explicitly softened, so refusing is the honest reading. Confirm with Mike
  before building step 5.
- **The 14-day staleness threshold in C8 is invented.** Nothing approved a
  number. It is a warning, so a wrong guess is cheap, but it is a guess.
- **GitHub-issue mode gets no atomic write, no `validate`, and no session
  tracking.** There is no code there to change. The single-batch guarantee in
  requirement 5 holds in local-folder mode only, and the rule has to say so
  rather than imply the guarantee is universal.
- **This repository runs GitHub mode**, so the local tracker cannot be exercised
  here. Testing needs a repository with `.work-items/` initialized.
- **Windows.** Every write is a `renameSync` over its target, including the
  batch paths. Whether a held file gives `EPERM` mid-batch is inference, not
  something anyone has observed. Do not write it up as a known failure.

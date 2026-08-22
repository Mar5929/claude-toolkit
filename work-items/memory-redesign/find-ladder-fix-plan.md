# Pick-up plan: the find ladder fix

**For a fresh session, on any machine. Written 2026-08-22.**

Delete this file when the fix lands. It is working state for one branch, not
project knowledge, and it goes stale the moment the work is done.

## Where things stand

- **Issue:** [#215](https://github.com/Mar5929/claude-toolkit/issues/215), labelled `refined`.
- **Branch:** `issue-215-knowledge-system-rebuild`, pushed to origin.
- **Commits:** 9. All eight build phases are done and verified.
- **Pull request:** not open yet. The `save-reminder` hook held `gh pr create`
  once, which is the hook working correctly. The save review below is what it
  was asking for.
- **Checks:** `installed-copy-check`, `link-check`, `orphan-check`, and
  `check-knowledge` all passed at commit `ed14c87`.

The rebuild itself is finished. What follows is one small fix found afterwards,
plus two things waiting on Mike.

## Getting set up on a new machine

```bash
git clone https://github.com/Mar5929/claude-toolkit.git
cd claude-toolkit
git checkout issue-215-knowledge-system-rebuild
```

Then, in a Claude Code session: `/machine-sync`, which installs the machine-wide
rules into `~/.claude/`. The two that matter here are no AI credit on anything
committed, and always propose the best solution.

Read `knowledge/specs/knowledge-system.md` before touching anything. It is the
build authority for this work.

## Three things need Mike's answer first

**1. The North Star quote.** `knowledge-system-north-star.md` holds Mike's exact
words about the find ladder, and they list five tiers with no work tracker.
Adding a sixth tier makes the quote incomplete.

The recommendation: leave the quote exactly as he said it, and add one line
underneath recording that the tracker became tier 5 during the build, and why.
His words stay the record of what he said. Ask before editing the quote itself.

**2 and 3. Two pending saves.** These were proposed and never answered. Show them
again and take his answer by number before opening the pull request.

- **`doubled-backslashes-do-not-survive-the-bash-tool.md`**, new.
  *What:* Writing a JavaScript regex that matches a literal backslash through the
  Bash tool collapses `\\` to `\`, producing a file that will not parse. It
  happens through a plain heredoc and a Python heredoc alike. The fix is to write
  that file with the Write tool.
  *Source:* Observed 2026-08-21 while writing
  `plugins/second-brain/hooks/command-parsing.mjs`. Three attempts failed
  identically before the cause was found; the Write tool worked first try.
  `confidence: observed`. *Tags:* `[windows, shell, tooling, gotcha]`.
  *Assumptions:* None. Untested whether other escape sequences are affected, and
  the file should say only what was seen.

- **`nothing-catches-a-drifted-copy-before-it-lands.md`**, update.
  *What:* Still true. Add `confirmed_at: 2026-08-22`. No wording changes.
  *Source:* `installed-copy-check` failed on clean `main` again during this work.
  *Assumptions:* None.

## Fix 1: add the work tracker as a tier

**Why.** `/recall` walks five tiers and the work tracker is not one of them. So it
can answer "what did we decide" and cannot answer "what is still open", because
open questions live on the ticket. `remember` already searches the tracker before
drafting; `recall` does not. The two disagree.

**The new ladder.** Six tiers. The tracker becomes 5; past sessions moves 5 to 6.

| # | Tier |
|---|---|
| 1 | `knowledge/current.md` |
| 2 | `.claude/rules/` |
| 3 | Skills |
| 4 | `knowledge/memory/`, then `knowledge/specs/` |
| 5 | **The work tracker** (new) |
| 6 | Past sessions, through `session-search` |

"When tier 4 finds nothing, offer past sessions" becomes "when tier 5 finds
nothing", in every place that sentence appears.

**Eight files, and every one of them has to change together.**

| File | What changes |
|---|---|
| `plugins/second-brain/skills/recall/SKILL.md` | Add a `### Tier 5: the work tracker` section. Renumber past sessions to Tier 6. Update the "when tier 4 finds nothing" section to tier 5. |
| `plugins/project-init/library/rules/general/where-persistent-information-belongs.md` | The five-item list under "Before you ask, or search the code broadly", and three sentences naming tier 4 and tier 5. |
| `.claude/rules/where-persistent-information-belongs.md` | Byte-identical copy of the file above. Copy it across, do not hand-edit. `installed-copy-check` fails otherwise. |
| `knowledge/specs/knowledge-system.md` | The ladder table under "The find ladder", and the four sentences under it. |
| `plugins/second-brain/README.md` | The ladder table, and the skills line calling session-search "Tier 5". |
| `plugins/second-brain/skills/session-search/SKILL.md` | Says tier 5 in its `description` and twice in "Where this sits", including a five-item list. |
| `CLAUDE.md` and `AGENTS.md` | Item 4 of the block between the `shared-with-agents-md` markers. The same words in both files, or `installed-copy-check` fails. |
| `README.md` | One phrase: "the five-tier find ladder" becomes six. |

**One consistency fix while in there.** `plugins/second-brain/skills/remember/SKILL.md`
step 1 lists five places to search, including the tracker but not past sessions.
Align it to the same six tiers so the two skills cannot disagree.

**Do not touch these**, which matched a search but are not the live ladder:

- `knowledge/specs/memory-system-v2.md`, superseded, describes a different design.
- `work-items/memory-redesign/chatgpt-reports/`, outside source material.
- `plugins/session-skills/skills/session-summary/SKILL.md`, an unrelated table row.

## Fix 2: write the ticket, build nothing

**The gap.** A saved file's `type` is one of `fact`, `decision`, `event`,
`context`, or `constraint`. There is no `question`. Open questions therefore live
only on the work item, and a closed ticket buries any question that never got
answered.

This matters because open questions are often the most valuable thing in a
conversation. Walking into a vendor call, the useful output is not what you know,
it is the list of things you still have to ask.

**Write a new GitHub issue** with the six parts the spec rule requires. What it
should ask for:

- `question` as a sixth `type`.
- A question file carries where it came from and who has to answer it.
- Answering a question supersedes it into a decision, using the existing
  three-step supersede.
- The checker accepts the new value.

**Name the size in the issue** so whoever picks it up knows: the schema tables in
`knowledge/specs/knowledge-system.md`, the `TYPE_VALUES` list in
`plugins/second-brain/tools/check-knowledge.mjs`, the file-shape section of
`remember/SKILL.md`, and the field list in `plugins/second-brain/README.md`.

Do not build it on this branch. It changes the file format, which reaches every
project that installs the plugin, and it deserves its own conversation.

## Finishing sequence

1. Get Mike's answers on the three items above.
2. Make the eight-file change for Fix 1.
3. Copy the library rule to `.claude/rules/` rather than editing both by hand.
4. `node .claude/tools/build-knowledge-index.mjs`
5. `node .claude/tools/check-knowledge.mjs`
6. `node tests/installed-copy-check.mjs`, `node tests/link-check.mjs`,
   `node tests/orphan-check.mjs`. All four must pass.
7. Write the approved saves from the pending review.
8. Delete this file.
9. Commit, then `gh pr create`. The draft pull request body is in the session
   scratchpad; if it is gone, the eight commit messages on this branch carry
   everything it said.
10. Open the Fix 2 issue.

## Not in scope

DragonFly is still on the old knowledge layout. That is
[#171](https://github.com/Mar5929/claude-toolkit/issues/171), deliberately
separate: approving its 32 converted documents is Mike's reading time and should
not block this from merging.

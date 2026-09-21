# Project and laptop sync, 2026-09-21

This record covers the sync of the claude-toolkit repository and Mike's laptop
with the toolkit, run on 2026-09-21 for issues
[#269](https://github.com/Mar5929/claude-toolkit/issues/269) and
[#369](https://github.com/Mar5929/claude-toolkit/issues/369). A Claude Code
desktop chat ran it as lead, with two Opus helper agents doing the read-only
audits. It is evidence of what was installed and checked. It approves no
requirement and accepts no part of the Knowledge System or Toolkit OS.

## Result

- Both plugin caches now hold the versions on `main`.
- This project already matched the toolkit almost everywhere. Two tracked
  files changed, in draft pull request
  [#387](https://github.com/Mar5929/claude-toolkit/pull/387). It is not merged.
- The laptop's no-AI-credit rule, settings and hook were already installed.
  The hook script was refreshed. Old voice material was removed after Mike
  answered four questions.
- No Codex hook definition changed. Mike has no Codex trust review to do for
  this run.
- Nobody has yet watched a fresh Claude Code session or a fresh Codex session
  after these changes. Nothing here is called active until Mike does that.

## Source and installed versions

Source: `main` at commit `0cc5d54`, marketplace 0.124.6. The audits ran at
commit `1479dc1` (marketplace 0.124.4). Pull requests #376 (hooks-library,
silent style handshake) and #378 (work-tracker) merged during the run, so both
caches were refreshed a second time and the branch was brought up to `0cc5d54`.
Pull request #379 (second-brain) was still in review and is not included. One
more cache refresh is needed after it merges.

| Plugin | Claude Code cache | Codex cache | Before this run |
| --- | --- | --- | --- |
| project-init | 0.77.3 | 0.77.3 | Claude 0.75.0, Codex 0.77.1 |
| second-brain | 4.12.3 (user scope, this project, and this chat's worktree) | 4.12.3 | Claude 4.9.1, Codex 4.12.2 |
| hooks-library | 3.6.0 | not offered to Codex | Claude 3.3.0 |
| session-skills | 1.13.0 | 1.13.0 | Claude 1.12.4 |
| work-tracker | 2.9.0 | 2.9.0 | Claude 2.7.0 |
| git-workflows | 0.2.1 | 0.2.1 | unchanged |
| sf-architect-solutioning | 1.1.0 | 1.1.0 | unchanged |
| system-guide | not installed | not installed | unchanged |

Commands used: `claude plugin marketplace update claude-toolkit`, then
`claude plugin update <plugin>@claude-toolkit` at user scope for each plugin,
and at project scope for second-brain in the primary checkout and in this
chat's worktree. For Codex, `codex plugin add <plugin>@claude-toolkit` for
project-init, second-brain and work-tracker. The Codex marketplace reads the
primary checkout folder directly.

Cached text was compared with `plugins/` on `main` using a recursive file
comparison, after each refresh. Codex: no differences in project-init,
second-brain, session-skills or work-tracker. Claude Code: the only difference
in each plugin is a `.in_use` marker file that Claude Code writes. The cached machine-sync, project-sync and
`folder-claudemd.md` files therefore match `main`.

Each Claude Code update printed "Restart to apply changes". Sessions already
open keep the old plugin text until they restart.

Not changed: second-brain is registered at project scope for four other
projects (Fitness-Tracker-App, Anchor at 4.1.2, DragonFly) and for five other
worktrees of this repository that belong to other chats. Those rows still show
4.9.1. They are outside this run.

## Project audit

An Opus helper ran steps 1 to 3 of the project-sync skill, read-only, using
`plugins/` at `1479dc1` as the source. After #376 and #378 merged, the lead
reread `.claude/settings.json` and reran the repository checks at `0cc5d54`.
The helper's other findings were not rerun against the two merged changes.

### Already present and current

- Every applicable default-ON rule. `tests/installed-copy-check.mjs` compares
  all 27 installed copies with their shipped originals.
- `.claude/output-styles/plain-english.md` matches the shipped file exactly.
- Knowledge schema 2, the four knowledge skills, tools and hooks. No Knowledge
  migration ran.
- `AGENTS.md` is one line. No nested `AGENTS.md` exists. `CLAUDE.md` still
  carries "Read `.claude/rules` first."
- No retired hook, rule, style or version-1 second-brain file is in the
  project.

### Hook registrations, one per host

`.claude/settings.json` (Claude Code):

| Event | Hook script | Times registered |
| --- | --- | --- |
| SessionStart | `toolkit-session-start.mjs` | 1 |
| SessionStart | `knowledge-session-start.mjs` | 1 |
| UserPromptSubmit | `toolkit-session-start.mjs` | 1 |
| UserPromptSubmit | `memory-reminder.mjs` | 1 |
| UserPromptSubmit | `style-handshake.mjs` | 1 |
| PreToolUse, Bash | `save-reminder.mjs` | 1 |
| PreToolUse, Bash | `work-item-close.mjs` | 1 |
| PostToolUse, Edit, Write, NotebookEdit | `spec-check-reminder.mjs` | 1 |
| Stop | `knowledge-completion.mjs` | 1 |

`.codex/hooks.json` (Codex) registers `toolkit-session-start.mjs` and
`knowledge-session-start.mjs` once under SessionStart,
`toolkit-session-start.mjs` and `memory-reminder.mjs` once each under
UserPromptSubmit, `save-reminder.mjs` and `work-item-close.mjs` once each under
PreToolUse, and `knowledge-completion.mjs` once under Stop. The helper compared
each entry with the shipped JSON and found no difference except the SessionStart
matcher described under "Follow-ups for the toolkit source". The file was not
edited.

No installed toolkit plugin ships its own hook file, so no plugin registers a
second copy. Only system-guide ships one, and it is not installed. On the
laptop, `~/.claude/settings.json` registers the no-AI-credit guard once, and
the voice-reply hook once under each of SessionStart, UserPromptSubmit and Stop.
`~/.codex/hooks.json` holds only the voice-reply hook.

The style handshake hook stays, by Mike's decision of 2026-09-21 recorded in
`knowledge/memory/memory-entries/why-the-style-hook-stays.md`. Pull request
#376 removed its second registration under PostToolUse and made it ask for a
silent read of the style file.

### Gaps closed in pull request #387

- `.claude/settings.json`: no change. The audit found a timeout of 5 where the
  shipped text said 10, on the `style-handshake` entry under PostToolUse. Pull
  request #376 then removed that entry on `main`, so the fix was dropped.
- `CLAUDE.md`: added the Quick saves table from `thin-claudemd.md`, with the
  project documentation row and the `knowledge/` row. Completed the first
  paragraph, which ended at "full pictur".
- `.claude/toolkit-sync.md`: added the 2026-09-21 entry with the audited
  versions and results, and added System Guide under "Declined".

### Local settings override removed

`.claude/settings.local.json` is untracked and Git-ignored. It held
`{"skillOverrides": {}, "outputStyle": "Concise"}`. A local settings file beats
the committed one, so the project ran Claude Code's built-in Concise style, and
the style handshake reported on every message that it could not find a style
file. The `outputStyle` key was removed from the copy in the primary checkout
and from the copy in this chat's worktree. `skillOverrides` stayed. The
committed `"outputStyle": "Plain English"` now applies.

Observed in the lead chat: a few tool calls after the key was removed, Claude
Code stopped delivering the Concise style text and started delivering the Plain
English style text. The handshake hook was not seen reporting a successful read,
because no new user message arrived after the change.

Other worktrees of this repository may hold their own copy of the local
settings file with the Concise key. They belong to other chats and were not
touched.

### Left as found

- System Guide is `off`. `status` and `check` from
  `plugins/system-guide/tools/system-guide.mjs` both returned state `off` with
  no problems. Mike chose on 2026-09-21 to leave it off.
- Graphify. The command is installed on the laptop at version 0.9.22, but the
  project's sync record declined the kit with "Do not offer it again unless real
  code lands here". Mike was asked on 2026-09-21 and kept it declined. No graph
  was built and no Git hook was installed.
- `misc/` holds five tracked files. The folder audit reports it as not
  recognized. It was left in place.
- Folder audit states: `docs/`, `plugins/` and `tests/` present;
  `ai-external-knowledge/`, `archive/`, `brainstorms/`, `knowledge/` and the
  dot-folders skipped by design; `misc/` not recognized.
- `CLAUDE.md` keeps Mike's two fixed lines below the title. The shipped layout
  puts them above it. His self-check line also carries extra wording that the
  shipped text does not have. Neither was changed.
- `knowledge/toolkit-manual.md` opens with a "Detailed review draft" notice
  about closed issue #306 where the shipped template has its complete-read
  paragraph. The file is this repository's deliberate detailed copy, so it was
  not changed here.

## Laptop audit

An Opus helper ran steps 2 to 5 of the machine-sync skill, read-only. It did
not open any login or token file.

| Item | Finding | Action |
| --- | --- | --- |
| `~/.claude/rules/no-ai-attribution.md` | Matches the shipped rule | None |
| `attribution.commit` and `attribution.pr` in `~/.claude/settings.json` | Both `""`, matching `required.json` | None |
| `~/.claude/hooks/no-ai-attribution-guard.mjs` | Behind by comment lines only | Replaced with the shipped file. It matches hooks-library 3.5.0 and 3.6.0 |
| Guard registration | Once, PreToolUse, matcher `Bash`, absolute path | None |
| `~/.claude/rules/activate-project-knowledge.md` | Absent | None |
| Marked block in `~/.codex/AGENTS.md` | Absent. The file is empty | None |
| `~/.claude/rules/steer-to-the-goal.md` | One paragraph named "second-brain v3" and `memory/planning/` | Paragraph removed |

After the script was replaced, the guard was run by hand. A commit message
carrying `Co-Authored-By: Claude` returned `permissionDecision: "deny"`. A plain
commit message printed nothing and exited 0.

### Changes Mike approved by answering questions on 2026-09-21

The prepared plan proposed these removals. The re-audit found that no shipped
instruction covers them: the machine-sync skill's retired table lists only
`activate-project-knowledge.md`. So each went to Mike as a plain question with
a recommendation.

| Question | Mike's answer | What was done |
| --- | --- | --- |
| Remove the `style-reminder` and `writing-guard` hooks from the laptop? | Remove both | Their two entries were removed from `~/.claude/settings.json` and the two scripts deleted. The voice-reply entries in the same events stayed. |
| Which laptop-wide output style? | Switch to Plain English | The shipped `plain-english.md` was copied to `~/.claude/output-styles/`, `outputStyle` was set to `Plain English`, and `plain-language.md` was deleted. The sentence in `~/.claude/rules/quiet-while-working.md` that named the old style now names the new one. |
| Remove `propose-the-best-solution.md`, `recommend-the-best-solution.md` and `ask-before-assuming.md`? The recommendation was to keep them. | Remove all three | The three files were deleted from `~/.claude/rules/`. |
| Turn on System Guide or graphify for this project? | Leave both off | Recorded in `.claude/toolkit-sync.md`. |

Apart from the `hooks` and `outputStyle` keys, `~/.claude/settings.json` was
compared with its saved copy and is identical: permissions, enabled plugins,
marketplaces and all other keys are unchanged. No login was changed on either
host.

`~/.claude/toolkit-machine-sync.md` was rewritten as the current-state record
for this run.

## Backups

Every changed or deleted local file was copied first to
`~/.claude/backups/2026-09-21-toolkit-sync/`:

- `settings.json`
- `toolkit-machine-sync.md`
- `hooks/no-ai-attribution-guard.mjs`, `hooks/style-reminder.mjs`,
  `hooks/writing-guard.mjs`
- `output-styles/plain-language.md`
- `rules/steer-to-the-goal.md`, `rules/quiet-while-working.md`,
  `rules/propose-the-best-solution.md`, `rules/recommend-the-best-solution.md`,
  `rules/ask-before-assuming.md`
- `project-claude-toolkit/primary/settings.local.json` and
  `project-claude-toolkit/worktree-affectionate-brattain/settings.local.json`

To undo one change, copy that file back to its original place.

## Checks

Run on branch `issue-269-project-sync` with this record present:

| Check | Result |
| --- | --- |
| `node tests/link-check.mjs` | Pass. 483 relative links resolve across 283 Markdown files, 0 fail |
| `node tests/orphan-check.mjs` | Pass. 247 shipped files reachable from 69 index documents, 0 fail |
| `node tests/installed-copy-check.mjs` | Pass. 27 checks, 0 fail |
| `node tests/knowledge-startup-check.mjs` | Pass. 13 checks |
| `node .claude/tools/check-knowledge.mjs` | Pass. 21 files checked |
| `claude plugin validate .` | Validation passed |
| `git diff --check` | No whitespace errors |

The branch was at `main` commit `0cc5d54` plus its own two changed files.

The new pull-request save check from #374 was seen working once in the lead
chat: `gh pr create` was held until an action-specific review outcome was
recorded, and the retry then succeeded.

## What Mike should see

The lead chat cannot start a new session. These two checks are Mike's.

**One fresh Claude Code session in this project.**

1. At startup, two messages: "Toolkit session orientation" and "Project
   knowledge startup" with its six numbered files to read. The agent then gives
   one brief confirmation that it read them.
2. Replies use the Plain English style: a short answer first, plain words,
   short headers with bullets.
3. No message says "the selected output style file could not be located". No
   reply opens with a sentence about having read the output style. No reminder
   names the `plain-language` style. No reply is refused and rewritten for an
   em dash.
4. `/hooks` lists each hook from the table above once, plus the no-AI-credit
   guard and the voice-reply hook.
5. The rules `propose-the-best-solution`, `recommend-the-best-solution` and
   `ask-before-assuming` no longer appear among loaded instructions.

**One fresh Codex session in this project.**

1. At startup, the status lines "Reading Toolkit orientation route" and
   "Reading Knowledge startup route", and the same two orientation messages.
2. No trust prompt for hooks, because `.codex/hooks.json` did not change. If
   Codex does ask Mike to review hooks, that is his normal `/hooks` review and
   trust click, and it should be reported back as unexpected.
3. `codex plugin list` shows project-init 0.77.3, second-brain 4.12.3 and
   work-tracker 2.9.0.

## Not verified

- No fresh session on either host was watched after the changes. Hook
  registration was read from files, not seen firing in a new session.
- The style handshake was not seen reading the Plain English file.
- Codex Desktop, Windows, and the clear, compact and resume cases were not
  tested.
- Other projects on this laptop were not audited. Projects without their own
  style file now receive Plain English from the laptop setting, and no project
  now receives the three removed rules. Neither effect was observed.
- Other worktrees' local settings files were not inspected.
- The helper did not read the whole difference between
  `knowledge/toolkit-manual.md` and its template. It compared headings and the
  opening blocks.
- Issue #269 was read in its body, progress log and 2026-09-21 entries. Its
  September 2 and 3 design comments were skimmed by heading, not read in full.

## Follow-ups for the toolkit source

None of these was changed in this run.

- `plugins/project-init/library/hooks/README.md` and
  `toolkit-manual-delivery.md` give the SessionStart matcher as
  `startup|resume|clear|compact`. The installed files, the system-guide plugin
  and `tests/knowledge-startup-check.mjs` use
  `startup|resume|clear|compact|fork`. The shipped text is behind.
- second-brain ships no file holding the exact Claude Code and Codex hook JSON.
  `delivery.md` describes the registrations in words only.
- The hand test in step 7 of the machine-sync skill uses `echo`. Under zsh,
  `echo` turns `\n` into a line break, the test input stops being valid JSON,
  and the guard prints nothing for both tests. `printf '%s'` works.
- The machine-sync skill's retired table does not list
  `propose-the-best-solution.md`, which the toolkit shipped as a machine rule
  until 2026-09-02. Another computer that still has it will not be offered its
  removal.
- `~/.claude/rules/steer-to-the-goal.md` and
  `~/.claude/rules/parallel-agent-sessions.md` still name
  `recommend-the-best-solution.md` and `ask-before-assuming.md`, which are no
  longer on the laptop. Both files are older toolkit project rules that the
  toolkit does not ship as machine rules. Whether to edit, refresh or remove
  them is Mike's decision.
- The plugin caches need another refresh after #379 merges.

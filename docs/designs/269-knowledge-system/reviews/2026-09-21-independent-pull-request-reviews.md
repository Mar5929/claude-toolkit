# Independent pull request reviews, 2026-09-21

Date: 2026-09-21.
Produced by: a read-only Claude Code desktop reviewer chat whose lead directed two Opus reviewers, coordinated by the main orchestrator.
Status: review evidence. It approves nothing and merges nothing. Tests ran on macOS only; nothing in these reviews is native Windows or live-host proof.
Reviews held here: pull request #374 at `0d082a6`, pull request #374 at `712a186`, pull request #374 at `6fb56cb`, and pull request #376 at `d306dd6`.

## Pull request #374, first review at 0d082a6

### Independent review of pull request #374

**Verdict: blocking findings, one.** It is a two-line fix, and it is in the hook code, not in the Windows change. The Windows change has no blocking findings.

**Head reviewed:** `0d082a681293fa6dc5e4087bb63fda91e2925eba`. That is the live remote head and it matches the expected one. It was compared with `origin/main` at `9c71a90` (merge base `f9b2dd8`). The pull request is an open draft, and GitHub reports it mergeable.

#### Blocking

**B1. The two action hooks do nothing when their file path passes through a symbolic link.**
- **Where:** `plugins/second-brain/hooks/save-reminder.mjs:214` and `work-item-close.mjs:149`, plus the identical `.claude/hooks/` copies.
- **Cause:** the start-up check compares the real path with an unresolved `process.argv[1]`. When the two differ, `main()` never runs. The hook prints nothing, exits 0, and the command is allowed.
- **Failure scenario:** a project sits under a symlinked folder, or under `/tmp` on macOS. `gh pr create` and `gh issue close` then run with no checkpoint and no message. The integration reviewer reproduced this: the symlinked path gave no output, and the real path gave a deny.
- **Why block now:** the same line is already on `main`. This pull request changes these hooks from reminders into the enforcement point, so the defect now matters more. It also changed `new-install.test.mjs` to use `realpathSync(mkdtempSync(...))`, which hides the defect on macOS.
- **Fix:** copy the `canonical()` comparison from `knowledge-completion.mjs:126-127` into both hooks and both copies. Add one test that runs a hook through a symlinked path.
- **Limit:** none of the three project paths on this Mac pass through a symbolic link, so this laptop is not affected today. I did not check whether Claude Code resolves `CLAUDE_PROJECT_DIR` before using it.

#### Should fix (each is small; the orchestrator decides whether before or after merge)

1. **A leftover lock file denies every guarded action for the rest of the session.**
   - **Where:** `knowledge-completion.mjs:24-41`. The lock has no age check.
   - **Failure scenario:** a hook process is killed while it holds the lock. After that, every `gh pr create` and `gh issue close` in that session and repository is refused. The busy message does not name the lock file.
   - **Status:** reproduced. Ordinary Bash commands are not affected, because they return before the lock is taken.
   - **Fix:** put the lock file path in the busy message. Treat a lock older than the 10-second hook timeout as abandoned.
2. **A repository with no commits lets `gh pr create` through without a message.**
   - **Where:** `save-reminder.mjs:67-78`. `git rev-parse HEAD` throws and the outer fail-open path catches it.
   - **Status:** reproduced. The plan's E1-P8 already lists this case.
   - **Fix:** catch the failure inside `pullRequestActionKey` and hold the action.
3. **The Windows command changes the working folder, and the POSIX command does not.**
   - **Where:** `.codex/hooks.json:58` and `:64`. The Windows command uses `Set-Location` and then a relative path.
   - **Risk:** inside a nested repository the two systems could compute different project roots. Under Windows PowerShell 5.1 a folder name with non-ASCII characters can make `Set-Location` fail, and the hook would then allow the command.
   - **Fix:** use `node (Join-Path $knowledgeRoot '.claude/hooks/<file>.mjs')`. Three older handlers in the same file already use that form. The exact-text assertion at `tests/knowledge-startup-check.mjs:93` and `delivery.md:100-103` and `:108-111` would have to change with it.
   - **Status:** reasoned from documentation. Not tested on Windows.

#### Minor

- `work-item-close.mjs:76` takes the first number anywhere in the command segment. `gh issue close --repo my-org/repo-2 374` and `gh issue close 2` get the same action key. Take the number from the first non-flag argument instead.
- A permit earned through `cd /other/repo && gh pr create` survives a new prompt, because the new prompt resets only the session project's state. The window closes when HEAD changes. Record it as a known limit.
- `gh pr close` and `gh api` are not recognized and pass through. The documents disclose this kind of gap in general terms. No document lists the covered commands.
- `work-item-close.mjs:44` `workItemKey` is no longer called anywhere. Remove it.
- `delivery.md:120` says "Codex can run matching handlers concurrently" with no Codex source. Reword it as an assumption.

#### Observations

- **Two older handlers are still raw PowerShell.**
  - **Where:** `.codex/hooks.json:45` (`memory-reminder`, `UserPromptSubmit`) and `:76` (`knowledge-completion`, `Stop`).
  - **Effect:** `cmd.exe` cannot run them, so on Windows they do nothing. They are already on `main`, and this pull request did not touch them.
  - **Guidance gap:** `delivery.md:90-93` gives no Windows guidance for them.
  - **Follow-up:** wrap them the same way in a separate change.
- **The section "Claude team continuation, 2026-09-21" is not in the branch.** It is only on `main`. This is harmless, and the merge is clean.
- **`.agents/plugins/marketplace.json` has no version field.** It is identical on `main` and on the head. Nothing was missed. The expectation that it should read 0.124.4 does not apply to this file.
- **Scope matches E1-P5 (R2, R3, R9, R10, R25, R26, R29).**
  - No document overclaims. None says enforcement is absolute, and none claims Windows or Desktop proof.
  - E1-P5 asks for fresh native-session evidence on both hosts. The pull request adds none. The one recorded trial ran at `8a18c71`, four commits before the head.
  - The design says to prove the host can hold an action before selecting a hold. This pull request registers the hold first. That is an ordering question for the owner, not a code defect.

#### Confirmed correct

- **Behavior:** every clause in "What #374 implements and what review must preserve" has implementing code and a test. That includes two concurrent processes where exactly one consumes the permit, and mixed commands denied by both hooks without consuming a permit. The denial format is correct for Claude Code and for Codex.
- **Complexity:** the change removes two separate state files and the growing `branches` array. There is no second controller and no history store. `command-parsing.mjs` gains 11 lines and its patterns are unchanged.
- **Windows quoting:**
  - I read the Codex source, `codex-rs/hooks/src/engine/command_runner.rs`, at the research commit `9771934` and at current main `c37b730`.
  - Codex runs `cmd.exe /C "<string>"` with the string passed unescaped (`raw_arg`), and it writes the hook JSON to piped standard input.
  - `cmd.exe` removes only the outer quotes, so `powershell.exe` receives the command exactly as written.
  - The string contains no `% & | < > ^`.
  - A `-Command` string does not need an execution-policy flag.
  - `powershell.exe` is present on every Windows machine.
  - Both hooks deny by printing JSON and exiting 0, so exit-code handling cannot lose a denial.
- **Test assertion:** the assertion in `tests/knowledge-startup-check.mjs` matches the JSON exactly. It checks configuration text only, not Windows behavior.
- **Copies:** all four `.claude/hooks/` files are byte-identical to the shipped originals.
- **Versions:** second-brain 4.12.3 and project-init 0.77.2, in both of each plugin's manifests. `.claude-plugin/marketplace.json` is 0.124.4. `main` is lower on every value.
- **Merge check:** `git merge-tree --write-tree origin/main 0d082a6` is clean, tree `9332031c`.

#### Checks run (macOS, Node v25.8.1, not Windows proof)

The integration reviewer ran these on a `git archive` copy of the head in a temp folder:
- `node --test plugins/second-brain/tests/*.test.mjs`: 36 pass, 0 fail.
- `node tests/link-check.mjs`: 445 links pass.
- `node tests/orphan-check.mjs`: 243 files pass.
- `node tests/installed-copy-check.mjs`: 27 checks pass.
- `node tests/knowledge-startup-check.mjs`: 13 checks pass.

The Windows reviewer ran `tests/knowledge-startup-check.mjs` once in the pull request's own checkout. The test writes only to the system temp folder, and the checkout was clean at `0d082a6` before and after.

#### Not verified

- **No native Windows run.**
  - Whether standard input reaches `node` through `cmd.exe` and `powershell.exe` has not been run on Windows.
  - Whether the JSON output passes back unchanged has also not been run. I reasoned that it should.
  - One `echo {...} | powershell.exe -NoProfile -Command "..."` test from `cmd.exe` on a Windows machine settles both. If it fails, the guard does nothing and shows no message.
- **No live hook delivery.** I did not observe Claude Code, Codex CLI or Codex Desktop calling these hooks. I did not check whether the head is registered or trusted anywhere.
- **Reading limit.** The integration reviewer did not read the full PRD or the design Notes. It read E1-P5, the requirement-to-package table and the sections it quoted.
- **Earlier work not repeated.** The earlier 86 Node cases and the broad trials were not rerun, as instructed.
- **The approval question is not answered.** This review does not settle whether #374 falls under Mike's recorded approval.

#### Read-only and housekeeping

- I wrote nothing in any repository, pull request or issue.
- The project's Stop hook requires a review record each turn. I recorded "no-change" three times. Those records live in the system temp folder.
- The helpers wrote probe scripts and an archive copy, only in temp and scratchpad folders.
- The style handshake hook reported that it could not read the selected output style file. I did not read that file.

**Next step for the orchestrator:** send B1 to the Knowledge finish chat. Decide which of should-fix 1 to 3 go in before merge, and recheck the new head afterward. I am stopping here and waiting for messages.

## Pull request #374, re-review at 712a186

### Re-review of pull request #374

**Verdict: no blocking findings.** One of my own fixes from the first review should be pulled back out, and I recommend doing that before merge. It can be as small as one changed line. Everything else is a wording fix in `delivery.md`.

**Head reviewed:** `712a186cb5f4f7ba472e929a24089bc48365ae3d`, which is the live remote head. The old head was `0d082a6`. `origin/main` moved during the review from `cf7a4df` to `2fd0a0b`, and only three documentation and memory files changed there.

#### The fixes you asked me to check

| Item | Result | Evidence |
|---|---|---|
| B1 symlinked hook path | Fixed | `save-reminder.mjs:219-221` and `work-item-close.mjs:147-149` now compare real paths, the same way `knowledge-completion.mjs:136-137` does. |
| S1 leftover lock | Fixed as written, with one new problem (finding 1 below) | A lock 10 seconds old or less is left alone. There is exactly one retry and no loop. The busy message names the lock file. |
| S2 repository with no commits | Fixed | `gh pr create` is now denied, and the action key contains `no-commits`. The old head allowed it with no message. `work-item-close.mjs` never needed HEAD and already denied. |
| S3 Windows commands | Fixed | Both new commands use `node (Join-Path $knowledgeRoot '...')`, matching the three older wrapped handlers. Each is 199 characters, with two double quotes and none of `% & \| < > ^ !`. |
| M1 number parsing | Fixed for the reported case | `gh issue close --repo my-org/repo-2 374` now keys to 374. Forms starting with `#` and URL forms also work. |
| M2 `workItemKey` | Removed | `git grep workItemKey 712a186` returns nothing. |
| M3 concurrency sentence | Fixed | `delivery.md:120` now says "Assumption, not verified on a host". |
| M4 Known limits list | Partly fixed | It overclaims nothing, but three points are incomplete (findings 2 to 4). |

More on the evidence:
- **B1 test.** The new symlink test passes the link path to the hook without resolving it first. When it is run against the old hook code, it fails and the hook prints nothing. It passes on `712a186`.
- **All five new tests** fail on the old hook code and pass on `712a186`.
- **Installed copies.** All seven files under `.claude/hooks/` are byte-identical to the shipped originals.
- **S3 quoting under `cmd.exe`.** Codex passes `cmd.exe /C "<string>"`. `cmd.exe` removes only the outer pair of quotes. The parentheses, braces, semicolons and single quotes all sit inside the one quoted region, so `cmd.exe` treats them as plain text. This is reasoned from the documented rules and the Codex source. It was not run on Windows.
- **Older Windows handlers.** The two older raw-PowerShell handlers are unchanged.
- **Test assertion.** The exact-text assertion in `tests/knowledge-startup-check.mjs` matches the JSON exactly. It fails when the JSON is altered, so it is a real check.

#### Findings

**1. Should fix: the stale-lock clearing added a new way for a guarded command to be allowed with no message.**
- **Where:** `knowledge-completion.mjs:50`, `finally { closeSync(handle); unlinkSync(lock); }`.
- **Cause:** the stale-lock path deletes the lock by file path, so one hook process can now remove another process's fresh lock. The process that lost its lock then throws `ENOENT` when it releases. That error is not the busy error, so it reaches the hook's outer `catch`, which allows the command.
- **How rare:** two hook processes were started at once against an abandoned lock, for 300 pairs. No permit was ever used twice. About 1 percent of pairs hit this error. With the real `save-reminder.mjs`, removing its lock while it ran gave no output in 2 of 5 runs.
- **What it needs:** an abandoned lock, plus two guarded commands for the same session starting at the same moment.
- **Your question on the race:** the documented race is acceptable for a bounded package. The unguarded release is the part that matters, because it decides whether the rare case ends in a deny or in an unreviewed command.
- **Recommended fix:** remove the age-based clearing (lines 29 to 38) and its Known limits entry. Keep the lock file path in the message. Guard the release with `try { unlinkSync(lock); } catch {}`. This is less code than the commit has now, and the race disappears along with the clearing. I suggested the age-based clearing in the first review, and I now think that was more than this package needs. A held action with a message naming the lock file is enough.
- **Smaller option:** keep the clearing and change only the release line to `try { unlinkSync(lock); } catch {}`. Do not add inode checks or rename-based locking.

**2. Should fix: `delivery.md:129` implies command coverage is wider than it is.**
- Only Bash segments that begin with `gh pr create`, `gh issue close` or `gh pr merge` are recognized.
- `bash -c "gh pr create"`, `/opt/homebrew/bin/gh pr create` and non-Bash tool routes all pass through.
- Replace the `gh pr close` bullet with a sentence that says this.

**3. Should fix: "until that repository's HEAD changes" is true only for pull-request creation.**
- The limit is at `delivery.md:127-128`.
- `work-item-close.mjs:66-82` keys on the project root and the action list only, with no branch or HEAD.
- A cross-repository close or merge permit is therefore never invalidated by a new commit. Say so in the list.

**4. Minor wording gaps.**
- The list does not mention that a command run outside a Git repository is always allowed. This was confirmed for both hooks.
- The list does not mention that the two older raw-PowerShell handlers will not run under `cmd.exe`. This now matters more: if the `UserPromptSubmit` handler never runs, no new prompt resets the review state on that host.
- `delivery.md:122` is one long unwrapped line.
- The concurrency sentence could cite `docs/designs/269-knowledge-system/host-capability-evidence.md:76`. That line records the vendor's statement that matching hooks run concurrently.

**5. Minor parsing issues, all removed by the simplification below.**
- A numeric flag value is read as the item number. `-R 5 374` keys to 5.
- A URL with a `#fragment` falls back to the full command text.
- The same issue number in two different `--repo` values shares one key.

#### Over-engineering against Mike's stated philosophy

| Mechanism | Call | Reason and what would be lost |
|---|---|---|
| Stale-lock age clearing | Remove | It adds a timing assumption, a documented race and a measured path where a command is allowed with no message. Without it, a killed hook leaves a lock that holds guarded commands until someone deletes the named file. That is normal checkpoint behavior. |
| Lock file path in the busy message | Keep | It is one string, and it tells the agent what to inspect. |
| The lock itself | Keep | It makes the read, change and write of the state one step. It is cheap and already tested. |
| Number, `#` and URL parsing (`work-item-close.mjs:53-64`) | Simplify | This is custom code that reads command text for meaning. Replace it with `actions.push([type, segment])`. That cannot collide, and it removes finding 5. The cost is that two spellings of the same close each need their own review. |
| Branch plus HEAD in the pull-request key | Keep | It makes a permit stop applying once new commits exist. It costs two `git rev-parse` calls. |
| The `no-commits` key, the split-command precheck, and the ordered type and item pairs | Keep | Each is a few lines, and each turns an allow with no message into a hold. |
| Nonce and one-time permit | Keep | This is the handshake, and E1-P5 asks for it. Without it, any general review would release the hold. That trade-off is Mike's to make. |
| Two `PreToolUse` handlers per Bash command | Simplify later | Merging them into one would halve the process starts and remove the concurrency assumption. Both hooks already exist on `main`, so treat this as a follow-up and not as a merge condition. |
| `effectiveDirectory` (`cd` handling) used in the state key | Keep for now | It causes the first Known limit. Dropping it would key permits on the wrong repository's HEAD. This is a follow-up design question. |
| `delivery.md:136-155` protocol prose | Simplify later | The deny message already prints the exact command to run. The prose is a second copy that can drift from it. |
| Windows `powershell.exe` wrapper | Keep | It is one string per handler and the simplest form that runs under `cmd.exe`. |
| Tests | Keep | There are five new tests, one per finding. All five fail on the old code. |

There is no second controller, no history store and no parser growth. `command-parsing.mjs` is unchanged in this commit.

#### Checks run (macOS, Node v25.8.1, on `git archive` copies in temp folders)

- **Node tests:**
  - `plugins/second-brain/tests/*.test.mjs`: 41 of 41.
  - With the four files in `tests/`: 91 of 91. That is how the builder counted.
  - All twelve test files in the repository: 187 of 187.
  - Running `node --test` on a bare folder fails on this Node version, so use the glob form.
- **Repository checks:** `link-check` 445, `orphan-check` 243, `installed-copy-check` 27, `knowledge-startup-check` 13. All pass. `claude plugin validate .` also passes.
- **Versions:** second-brain 4.12.3, project-init 0.77.2 and marketplace 0.124.4. Each is one patch above `main`. `.agents/plugins/marketplace.json` has no version field and is unchanged.
- **Merge check:** `git merge-tree` against `2fd0a0b` is clean, tree `7648ee58`.

#### Not verified

- **Native Windows.**
  - Nothing was run on Windows.
  - It is not confirmed that `powershell.exe` passes the hook JSON on standard input through to `node`. The three older wrapped handlers carry the same risk.
- **Live host delivery.**
  - I did not observe Claude Code, Codex CLI or Codex Desktop calling these hooks.
  - I did not check whether Codex honors a `PreToolUse` deny.
  - I did not check whether Codex runs matching handlers concurrently.
- **Whether the rare cases occur in practice.** I do not know whether two guarded hooks ever start at the same instant, or whether a hook is ever killed while it holds the lock.

**Read-only record.** I wrote nothing in any repository, pull request or issue. The Stop hook's "no-change" records and the helpers' probe files went only to the system temp and scratchpad folders. The style handshake hook reported again that it could not read the output style file.

**Next step:** send finding 1 to the Knowledge finish chat. I recommend the removal route, plus the three wording fixes in `delivery.md`. If you take it, simplifying the item key at the same time clears finding 5. I am stopping here and waiting.

## Pull request #374, round-three verdict at 6fb56cb

Round-three verdict on pull request #374: no blocking findings at head 6fb56cbde5e9a0bb05c6361273cae0de4f8862d6; the lock fail-open is closed and proven closed; four small follow-ups, none of which need another review round.

HEAD: 6fb56cb, live head confirmed before and after. One commit over 712a186, 8 files, +73 -84. origin/main moved ba043c4 -> bfcd7d3 during the review (documentation only).

YOUR FOUR ITEMS
1. locked(): FIXED. knowledge-completion.mjs:27-30 a found lock goes straight to the busy error; no statSync, no ABANDONED_LOCK_MS, no unlink of a found lock, no retry, no leftover import or constant anywhere in the repo. Line 29 names the lock file. Line 42 is `finally { closeSync(handle); try { unlinkSync(lock); } catch {} }` (I read these lines myself). Proof: real save-reminder.mjs with the parent deleting its lock mid-run: old head 712a186 printed nothing in 20 of 40 runs (guarded command allowed); 6fb56cb printed a deny in 140 of 140. 200 simultaneous claim pairs with a recorded permit: exactly one allow per pair, 0 double-allow, 0 throws. Locks aged 1 second, 30 seconds and 1 day: deny, message names the file, lock and its mtime untouched, no state file written; `git status` still allowed and never touches the lock. Busy message in both hooks now ends "If no other review is running, inspect and remove that file, then retry." (save-reminder.mjs:172, work-item-close.mjs:89), which is correct.
2. work-item-close.mjs: FIXED. itemNumber and its regexes are gone; line 62 is actions.push([type, segment]). `--repo my-org/repo-2 374`, `2`, `-R o/a 374`, `-R o/b 374`, `-R 5 374` all get different keys; extra whitespace and a leading VAR=value collapse to the same key; the same close typed twice keeps its key. End to end with the real hook: deny, second attempt deny with the same nonce, record the action outcome, third attempt allowed, fourth denied with a new nonce.
3. delivery.md: DONE except one line. Recognized shapes and what passes (lines 133-135), HEAD limit only for pull-request creation (129-132), outside-Git always allowed (136), the two older raw-PowerShell handlers (137-139), concurrency assumption cited (120-122), stale-lock bullet gone; no sentence anywhere still describes clearing an old lock. Every limit checked against the code and is accurate. Nothing overclaimed.
4. Pull request description: ACCURATE. Head SHA, three commits, versions and all eight check counts reproduce. No AI-credit line. Says "No native Windows run." Describes the removed clearing and number parsing only as history.
Copies: all 7 .claude/hooks files byte-identical to the originals. Versions unchanged: second-brain 4.12.3, project-init 0.77.2, marketplace 0.124.4; main bumped nothing. Earlier-confirmed clauses all still hold, each with a passing test. Nothing new added: the hook diff is deletions plus one message string per hook.

FINDINGS (none blocking)
1. SHOULD-FIX, action-checkpoints.test.mjs, test "an existing lock holds the action, names its file, and is never removed by another caller". It uses a fresh lock, so it also passes on the 712a186 hooks and does not pin the fix. If someone reintroduces age-based clearing, all 42 tests still pass. Fix: set the lock mtime a day back with utimesSync and assert still busy and lock still present. It would pass today.
2. SHOULD-FIX, delivery.md:140. The only failure-behavior sentence is "Enforcement is fail-open: an unexpected error allows the command." Lock contention is the one error that denies, and the document no longer says so; the pull request description says it and wrongly attributes it to delivery.md. Fix: one bullet: a held lock denies, the message names the lock file, remove it only when no other review is running.
3. SHOULD-FIX (cosmetic), delivery.md:124 is still one 127-character line. The wrap you asked for did not happen.
4. MINOR, delivery.md:122 cites docs/designs/269-knowledge-system/host-capability-evidence.md, a path that does not exist in a project that installs the plugin. Say it lives in the claude-toolkit repository.
5. MINOR, the new test "a release that cannot remove the lock does not throw" is real (chflags uappnd makes the unlink fail; it fails on the old release line with EPERM) but is skipped off macOS and covers only the stale-turn path that writes nothing.
6. MINOR, quoted repository values: `gh issue close --repo "org/a" 374` and `--repo "org/b" 374` both clean to `gh issue close --repo 374` and share a key, because quoted text is stripped. Not a regression (both keyed to 374 before). gh does not need the quotes. Record or ignore.
7. OBSERVATION, consequence of removing the clearing: a stuck lock now also makes the Stop check print "Knowledge completion check unavailable ... Lock file: <path>" every turn until someone deletes the file. It names the file and Stop cannot deny anything, so this is the intended held state, not a defect.
8. OBSERVATION, test name "...every ordered action, project, and item" still says item; the first Known-limits bullet describes cd /other/repo only for pull-request creation though the same applies to close and merge.
My call: findings 1-3 are five-minute edits the builder can fold in; I do not need to re-review them. Verdict stands either way.

CHECKS at 6fb56cb (macOS, Node v25.8.1, archive copies in temp folders, glob form): plugins/second-brain/tests/*.test.mjs 42/42 (was 41); plus tests/*.test.mjs 92/92 (was 91); all 12 test files 188/188 (was 187); none skipped on this Mac. link-check 445, orphan-check 243, installed-copy-check 27, knowledge-startup-check 13, check-knowledge 20 files, claude plugin validate, git diff --check: all pass. New test file on the 712a186 hooks: 2 of 15 fail, both for the right reason (key is now the segment text; old release line throws EPERM). git merge-tree vs ba043c4 and vs bfcd7d3: clean. Versus #376 head d306dd6: one conflict, the marketplace version line.

UNVERIFIED: nothing ran on native Windows or Linux. No live host delivery in Claude Code, Codex CLI or Codex Desktop. gh was never invoked; all runs used fixture repositories and synthetic PreToolUse payloads. Whether a live hook is ever killed while holding the lock. tests/knowledge-behavior/run.mjs was not run. Whether #374 is covered by Mike's recorded approval is not answered here.

THE PERMIT QUESTION FOR MIKE (one-use permit and nonce versus a simple hold)
Case for keeping it: the permit is the handshake in recorded form. The agent must run one command that names this exact action before the retry passes, and that record is used once. The requirement behind it says a review done for something else does not count for a new pull request or close. It is built, bounded, and has now passed three review rounds with 188 tests.
Case for the simple hold: the recorded outcome is only a declaration; an agent can type "no-change" without reviewing, so the permit proves a command was run, not that judgment happened. That makes it enforcement in form without being enforcement in fact. Every defect found in three rounds (lock race, silent allow, key collisions, cross-repository permits) lived in this machinery, about 75 lines plus a lock. A deny whose message names the action relies on the agent following the instruction, which is the toolkit's stated model.
What the simple hold costs in practice: a plain retry releases it, so nothing records that a review happened for that action; a general turn review, or no review, would satisfy it; and it still needs a small state file to remember "already held once", so the saving is the nonce, the generation matching and most of the lock, not all state.
Recommended: keep it as built for this merge, because it is reviewed and bounded and removing it now restarts the review cycle on a package that is otherwise ready. If Mike prefers the lighter model, do it as a separate small removal afterwards, where the simple hold can be judged on its own.

Read-only throughout. Waiting for messages.

## Pull request #376, review at d306dd6

### Independent review of pull request #376, "Make the style handshake silent"

**Verdict: no blocking findings.** Two small fixes should go in before merge, and one product question on requirement 3 goes to Mike. Acknowledged: I evaluated this turn for record changes and found nothing to save.

**Head reviewed:** `d306dd6c2cc0d6b09850b207d1a0331fb166e961`, the live head. It is one commit on merge base `cf7a4df`. `origin/main` moved to `ba043c4` during the review.

#### Requirements

| # | Result | Evidence |
|---|---|---|
| 1. Read requested on every message | Met | `style-handshake.mjs:74-76` |
| 2. No spoken acknowledgment | Met on the normal path | The hook can print exactly two messages. |
| 3. Quiet for built-in styles | Met as written, fragile in practice | `BUILT_IN` at `style-handshake.mjs:13` |
| 4. Copies, documents and versions agree | Partly | Two README inaccuracies and leftover text elsewhere (findings 2, 4, 5). |
| 5. Hook kept, no hidden text injection | Met | The hook prints a file path only. It never prints the style text. |

More on each row:
- **Requirement 1.** The hook asks for a whole-file Read of the exact resolved path, "before working on the request". No session state or once-per-session logic is left. The same prompt sent twice produced identical output.
- **Requirement 2.**
  - The normal message says "Do not announce, mention, or acknowledge the read."
  - The only other message is the missing-file message: "Briefly report that limitation".
  - Both go through `additionalContext`, which the saved hooks page says is not shown in the transcript.
- **Requirement 3.**
  - The list is Default, Proactive, Concise, Explanatory and Learning. It matches the saved copy of the docs page from 2026-09-04 and the live page fetched 2026-09-21.
  - Case variants and padded names stay quiet.
  - See finding 1 for the fragile part.
- **Requirement 4.**
  - Both hook copies have SHA-1 `dd1aaadd`.
  - hooks-library is 3.6.0 in both manifests.
  - `README.md`, the toolkit map, the toolkit manual, `.claude/toolkit-sync.md` and the marketplace description are accurate and overclaim nothing.

#### Your question on the removed read marker: removal is correct

In the old code the marker had one job: to make the spoken sentence happen exactly once per turn.
- Only the PostToolUse part of the hook wrote it or read it.
- No test, check or other hook ever opened it.
- The old hook could not detect a missed read, so no detection ability is lost.
- `UserPromptSubmit` fires once per turn, so nothing else needs the marker to suppress repeats.

**What is lost:** a file on disk showing the style was read this turn. The Read call still shows in the transcript.

**What is gained:** no temp-folder write on every message, no second Node process on every Read, and about 55 lines of state code removed.

**One caution:** requirement 2 literally says the record "stays behind the scenes", and it now does not exist at all. Mike should confirm that in one sentence. I recommend he approve it.

#### Findings

**1. Product question for Mike: the fixed list meets requirement 3 today but goes stale.**
- **Where:** `style-handshake.mjs:13` and `:67-72`.
- **Failure scenario:** any selected style name that has no file in the two searched folders and is not one of the five names triggers the message. It appears on every user message, and it is the same annoyance this item removes. It tells the agent to report that the style file could not be found. All four cases below were reproduced:
  - a future built-in style;
  - a style shipped by a plugin, including one forced with `force-for-plugin`;
  - a style in a nested `.claude/output-styles/` folder;
  - no `outputStyle` set anywhere.
- **Recommended fix:** remove the list and stay quiet whenever no style file is found. This is smaller and fixes all four cases. It also removes a hand-copied list of someone else's data. Report a problem only when a file is found but cannot be read.
- **Cost of the recommended fix:** a mistyped custom style name is no longer reported, and requirement 3 says a missing file is reported for a custom style. That is a requirement change, so Mike decides.
- **Alternative:** keep the list and accept the four cases above.

**2. Should fix before merge: a project with no style selected gets the message on every user message.**
- **Where:** `style-handshake.mjs:36` returns `'Plain English'` when no settings file sets `outputStyle`.
- **Why it is wrong:** Claude Code's real default is the built-in Default, which has no file.
- **Failure scenario:** a project copies the hook before adding a Plain English style file. It then gets the missing-file message on every message. An empty `outputStyle` string behaves the same way.
- **Fix:** return `'Default'`. The recommended fix in finding 1 also covers this.
- **Status:** reproduced. No test covers it.

**3. Should fix before merge: the README dropped the warning about plugin styles.**
- **Where:** `plugins/hooks-library/README.md:66`.
- **What changed:** `main` said plugin-only styles are outside the lookup, and told the reader to select a file-backed style first. The rewrite kept only the part about built-in styles.
- **Fix:** restore one sentence naming the three cases outside the lookup: plugin styles, managed-policy styles and nested project style folders. Include the workaround of selecting a file-backed style. If the recommended fix in finding 1 is taken, the sentence instead says those styles get no read request.

**4. Minor.**
- **`plugins/hooks-library/README.md:76`** says "Unexpected errors fail open". In the new hook, any error during the style lookup produces the missing-file message. Only unreadable hook input produces silence. Reword it.
- **`style-handshake.mjs:46-47`**: a folder entry whose name ends in `.md`, such as a directory named `notes.md`, makes the lookup throw. A valid style file is then reported as missing. This was reproduced. Catch errors per file and continue.
- **Test gaps:**
  - Default, Proactive and Explanatory are never exercised.
  - No test covers a project with no style selected.
  - No test covers an unknown style name.
  - No test covers a bad folder entry.
  - No test covers two custom styles with local settings overriding project settings.
- **Dropped sentence.** The old text said "Make this Read alone; do not batch it... Wait for its result." That is gone. The read still comes before the work, so requirement 1 holds, but the ordering is looser. It is acceptable.
- **Managed settings and the `--settings` flag** are not consulted. Leave this as it is. No managed policy exists here.

**5. Leftover text outside the pull request (for you as the owner of the shared files).**
- **`knowledge/memory/current.md:72`** still says a chat is "preparing options" for this question. It goes stale on merge. Update it through the knowledge save route.
- **Two live #269 design files describe removed behavior:**
  - `docs/designs/269-knowledge-system/host-capability-evidence.md:55` says the hook "requests an acknowledgment" and checks `PostToolUse`.
  - `docs/designs/269-knowledge-system/implementation-plan.md:558` tells a #269 builder to borrow the read-observation pattern from this hook. That pattern no longer exists.
  - A one-line dated correction in each is enough.
- **`plugins/project-init/library/templates/toolkit-manual.md`** never names this hook, and no test compares it with the repository copy. No change is needed.
- **`knowledge/memory/memory-entries/why-the-style-hook-stays.md`** stays correct.

**6. The acceptance step cannot be run in this repository as it is configured.**
- This worktree's untracked `.claude/settings.local.json` selects the built-in `Concise`. After the merge, the hook here will print nothing at all, which looks the same as a broken hook.
- Before the "fresh session shows the read and no sentence" check, point `outputStyle` at the file-backed `Plain English`.
- Live evidence of the old behavior: this session received the "could not be located or read" message on every turn, for the same reason.

#### Over-engineering against Mike's stated philosophy

| Mechanism | Call | Reason and what would be lost |
|---|---|---|
| Three-sentence read request | Keep | It is the checkpoint itself. |
| Settings lookup across three files | Keep | It is 12 lines. This repository needs it, because the local settings select Concise and the project settings select Plain English. |
| Style file lookup and frontmatter `name` | Keep | It is needed to name the path. This repository's own style file sets `name: Plain English`. |
| Fixed list of five built-in names | Remove (recommended) | It is a hand-kept copy of Anthropic's list that goes stale. "No file found means stay quiet" covers more cases with less code. The cost is the mistyped-name report. |
| `'Plain English'` fallback | Simplify | It assumes a selection Claude Code never made. |
| Whole-lookup `try`/`catch` | Simplify | One bad folder entry hides a valid style. Catch errors per file. |
| PostToolUse part, marker, state and cleanup of old marker files | Removal was right | Their only consumer was the sentence that was deleted. |
| hooks-library README section, 69 lines for a hook that prints one sentence | Simplify later | Three paragraphs each say the hook checks nothing. Merge them into one. Drop the two Stop-handshake history paragraphs. The migration paragraph already carries that instruction. |

#### Checks run (macOS, Node v25.8.1, on `git archive` copies in temp folders)

- **Hook test:**
  - `plugins/hooks-library/tests/style-handshake.test.mjs` reports 66 passed and 0 failed.
  - The count of 66 comes from 26 direct checks plus 8 helper calls of 5 checks each.
  - Node's test runner counts the whole file as 1 test.
- **New test on the old hook:**
  - 33 of 66 checks fail, for the right reasons.
  - The old hook asks for the sentence.
  - The old PostToolUse part still speaks.
  - Built-in styles get reported as missing.
- **Probe runs of the real hook:**
  - Inputs were 23 cases: all five built-in names, case variants, a missing custom file, settings that cannot be parsed, a plugin style, a nested style, a project with no style selected, and a directory named `notes.md`.
  - All exit 0.
  - A project that still registers the old PostToolUse entry gets exit 0 and no output.
  - Empty stdin, invalid stdin and a Stop event behave the same way.
- **Repository checks:** all pass.
  - `link-check` 451 links.
  - `orphan-check` 242 files.
  - `installed-copy-check` 27 checks.
  - `knowledge-startup-check` 12 checks.
  - `claude plugin validate .`.
- **`.claude/settings.json`:** only the Read-matcher `PostToolUse` group was removed. Nothing else changed.
- **Merge check:**
  - Against `ba043c4` it is clean, tree `aeb1feca`.
  - Against the #374 head `712a186` there is one conflict in `.claude-plugin/marketplace.json`.
  - That conflict is the version line only (0.124.4 versus 0.124.5). It is trivial, and you reconcile it at merge. No other files overlap.
- **Versions:** hooks-library 3.5.0 to 3.6.0 in both manifests. `plugins/CLAUDE.md` does not say which part of a version number to raise, so a minor bump is defensible.

#### Not verified

- **No live session.**
  - Nobody has watched a live Claude Code session with this hook.
  - It is not confirmed that the agent actually stays silent when told to.
  - It is not confirmed that `additionalContext` reaches the model unseen.
  - Both rest on the documentation.
- **`agent_id`.** It is not confirmed that the CLI ever sends `agent_id` on `UserPromptSubmit`, so the subagent guard may never run. No saved docs page shows it.
- **Other gaps.**
  - Windows path handling was not checked.
  - Managed settings were not checked.
  - The DragonFly project's hand-copied hook file was not checked.
- **Saved docs.** The saved output-styles page is out of date on `/output-style`, which the live page says works again. No document in this pull request depends on it.

**Read-only record.** I wrote nothing in any repository, pull request or issue. The helpers' probe files and the Stop hook's "no-change" records went only to temp and scratchpad folders. The style handshake hook reported again that it could not read the output style file, and I did not read it.

**Next step:**
- Put finding 1 to Mike as one question: should the hook stay quiet whenever no style file is found (recommended), or keep the fixed list?
- Send findings 2 to 4 to the build chat.
- After the merge, fix the two leftover items in finding 5.

I am stopping here and waiting.

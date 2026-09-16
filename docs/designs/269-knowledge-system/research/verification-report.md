# Verification of the three knowledge-system design files

Checked 2026-09-16 against the PRD, the related PRDs, the shipped code, the
captured Claude Code documentation, the walkthrough extraction, and research
reports r1 to r5. Every claim below was opened in its primary source.

Files checked:

- `/tmp/claude-0/-home-user-claude-toolkit/4fcf9e21-6c96-5d1c-816b-828bcf2822e5/scratchpad/design/peer-requirements-critique.md`
- `/tmp/claude-0/-home-user-claude-toolkit/4fcf9e21-6c96-5d1c-816b-828bcf2822e5/scratchpad/design/peer-design-sketch.md`
- `/tmp/claude-0/-home-user-claude-toolkit/4fcf9e21-6c96-5d1c-816b-828bcf2822e5/scratchpad/design/main-decision-brief.md`

Walkthrough note: the peer used a 899-line extraction. The file verified here,
`/tmp/claude-0/-home-user-claude-toolkit/4fcf9e21-6c96-5d1c-816b-828bcf2822e5/scratchpad/research/walkthrough-text.txt`,
has 905 lines. Line numbers below are for the 905-line file.

Codex note: r2-codex-capabilities.md has landed and was used. Section 4 lists
what r2 settles and what it leaves open.

All 30 requirement heading line numbers in the critique (456, 475, 508, 575,
587, 599, 610, 652, 669, 703, 746, 782, 802, 916, 1044, 1120, 1235, 1247, 1316,
1385, 1458, 1512, 1537, 1567, 1588, 1599, 1617, 1629, 1669, 1754) are correct.

---

## Section 1. Errors

Count: 31.

### peer-requirements-critique.md

| Location | The claim | What the source says | Corrected claim |
|---|---|---|---|
| Header, line 13, and ranked item 1 | GitHub issue anthropics/claude-code#91870 was "posted 2026-09-03 by an Anthropic engineer" | The issue was opened 2026-09-03 by the GitHub user `poteat`, a community account. The "on the scale of weeks" and "we are going to be calling this Claude Mods" sentences are from that same account's 2026-09-09 community update. No Anthropic reply could be confirmed. r1-claude-code-capabilities.md lines 702-740, live fetch of the issue page 2026-09-16 | Issue 91870 was opened 2026-09-03 by the community account `poteat`; the "weeks" timing and the `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1` flag come from that issue alone, not from Anthropic documentation or changelog. The conclusion (do not build on function hooks) is unchanged and correct |
| Line 14 | Codex hook events are nine: `session_start`, `user_prompt_submit`, `pre_tool_use`, `post_tool_use`, `permission_request`, `compact`, `stop`, `session_end`, `interrupt` | Codex has twelve events, written in PascalCase, the same names Claude Code uses: `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `SubagentStart`, `SubagentStop`, `Stop`, `Interrupt`. There is no `compact` event. r2-codex-capabilities.md section 1, citing `codex-rs/config/src/hook_config.rs:36-61` | Codex has twelve hook events with the same names as Claude Code, including `SubagentStart` and `SubagentStop`, and a split `PreCompact`/`PostCompact` |
| Line 14, and R25 entry (line 32 of the ranked section) | Codex `PreToolUse` is "reported as shell-only by secondary sources", so the file-write guard is a Codex gap | Codex fires `PreToolUse` for every tool. File edits go through `apply_patch`, which carries the matcher aliases `Write` and `Edit` "for compatibility with hook configurations that describe edits using Claude Code-style names". r2 section "Does `PreToolUse` cover file writes?", citing `codex-rs/core/src/tools/hook_names.rs:28-39` | Codex `PreToolUse` covers file writes. A matcher of `Edit|Write` written for Claude Code also matches Codex edits. The real limit is that `tool_input` for `apply_patch` is one field holding the whole patch text, with no file list, so a path guard has to parse the patch |
| Line 14 | "hooks are on by default since Codex 0.150.1 (2026-08-27) and each non-managed hook must be trusted once" | The trust requirement is confirmed: a hook runs only when its definition hash is `Trusted` or `Managed`, or when `--dangerously-bypass-hook-trust` is set. r2 section 1, hook trust rows. r2 found no version evidence for 0.150.1 and could not read the release notes | Codex runs a hook only after its exact definition is trusted once, which is closer to off by default than on. The 0.150.1 date is unverified |
| R2 entry, line 29 | "the shipped manual being 16,887 characters (issue 269 audit)" | `knowledge/README.md` is 13,395 characters. 16,887 was the whole startup print measured in the 2026-09-02 issue audit, not the manual. Measured today, the startup hook prints 20,585 characters, of which the manual is 13,395. r3-current-implementation.md lines 107 and 115 | The manual is 13,395 characters. The startup hook prints 20,585 characters today against a 10,000-character cap |
| R2 entry, line 28 | "the 'completion check ... pause dependent work' language (line 482)" | "A completion check follows the three reads" is PRD line 481. Line 482 is "If a read is incomplete, direct the agent to finish it, hold back the confirmation, and pause work that depends on the unread file" | The completion check is PRD line 481; the pause-dependent-work sentence is line 482 |
| R8 entry, line 71 | "`ai-external-knowledge/README.md` in this repository is hand-written (it lists 161 pages of one topic)" | No such file exists. The hand-written index is `ai-external-knowledge/claude-code/README.md`, whose header reads "Pages: 161" and "Captured: 2026-09-04". The folder holds 162 Markdown files: 161 pages plus that index | This repository has no `ai-external-knowledge/README.md` at all. R21 line 1460 requires one to be generated, and the only existing index is the hand-written topic index at `ai-external-knowledge/claude-code/README.md` |
| R14 entry, line 113 | "the checker requires nine fields and does not know `group`, `context`, or `updated_at` as required (`check-knowledge.mjs` lines 43 to 46)" | `MEMORY_REQUIRED` at `plugins/second-brain/tools/check-knowledge.mjs` lines 42-45 holds nine fields. `group` is in `MEMORY_KNOWN` at line 52, so it is accepted as optional. `context` and `updated_at` are in neither list, so the checker rejects them as unknown fields | The checker requires nine fields (lines 42-45). `group` is accepted but not required (line 52). `context` and `updated_at` are unknown and are rejected outright. R14 requires twelve fields (PRD lines 930-941) |
| R10 and R14 entries | `approved_by` and `approval_date` are "Never empty (lines 940 to 941)" | PRD line 940 gives `approved_by` the allowed value "A person's name". Only line 941, on `approval_date`, says "Never empty" | `approval_date` is "Never empty" (line 941); `approved_by` takes a person's name (line 940). Both are in the required table, so both must be present |
| R18 entry (a), line 141 | The SG PRD gives the guide "`knowledge/system/` with `README.md`, `tour.md`, and eight section folders" | `knowledge/prds/system-guide.md` lines 195-204 list seven section folders: `business/`, `data-model/`, `objects/`, `fields/`, `processes/`, `relationships/`, `applications/` | Seven section folders, plus `README.md` and `tour.md`. The path conflict itself is real and correctly reported |
| R18 entry (b), line 141 | "`brainstorms/` is at the project root here (line 146)" | PRD line 146 is `SOUL.md`. `brainstorms/` is line 147 | The layout puts `brainstorms/` at the project root at PRD line 147, and PRD line 180 repeats it in prose |
| R21 entry | "The builder has no fixed sort rule stated" | `plugins/second-brain/tools/build-knowledge-index.mjs` line 67 sorts directory entries alphabetically by filename before indexing | The builder sorts alphabetically by filename. What it lacks is grouping by `group` (R21 line 1462), topic folders, child PRDs, the third index, and any written statement of the rule R21 line 1467 requires |
| R22 entry | "the shipped manual lists four delete reasons; R22 line 1520 lists a fifth" | `knowledge/README.md` line 227 lists three: "a duplicate made by mistake, a secret, or something never true". PRD line 1520 lists four, adding "a redundant original after approved consolidation" | The manual lists three delete reasons; R22 line 1520 lists four. The fourth, the redundant original, is the new one |
| R27 entry, line 45 | "the shipped setup copies five hooks and three tools into every project (`second-brain/SKILL.md`, 'What gets installed')" | `plugins/second-brain/skills/second-brain/SKILL.md` lines 42-49 install three tools and four hooks: `knowledge-session-start.mjs`, `memory-reminder.mjs`, `save-reminder.mjs`, `work-item-close.mjs`. The plugin's fifth hook file, `command-parsing.mjs`, is a shared module and is not installed. `spec-check-reminder.mjs`, which this repo's settings register, ships from the `hooks-library` plugin, not from second-brain | The shipped setup copies four hooks and three tools into every project |
| R28 entry, line 51 | "The entry format (line 1642) is nine items per entry" | PRD line 1642 names eight: a stable reference; the destination and the operation; the exact card; the harness and conversation ID; the source and its date; the time last updated; its state; the next step or blocker | Eight items per entry, plus separate authority details for authorized PRD upkeep |
| R20 and R28 entries | The walkthrough inbox card is at "WT 631 to 635" | In `walkthrough-text.txt` the card is lines 636-640: `### 1. Sign-in provider`, `**Change:**`, `**New wording:**` with a block quote, `**Your decision:**`. r4-history-digest.md gives the same range | The card is walkthrough-text.txt lines 636-640. The substance is right: `**New wording:**` with a block quote is the shape R20 lines 1401-1411 replaced with `**Summary:**` |
| R16 entry, line 125 | "The tracker's Done event is the nearest documented moment (`work-item-upkeep.md` line 543)" | `knowledge/prds/work-item-upkeep.md` is 60 lines long. Line 543 does not exist. Done is defined at lines 40-44; "Project knowledge may react to completion and link back to the item" is line 53 | The tracker's Done event is `work-item-upkeep.md` lines 40-44, and line 53 is the sentence that permits knowledge to react to completion |
| Ranked item 4, line 77 | The Stop hook that fires on a changed-file threshold is "Mike's own 2026-09-03 amendment" | Mike raised the gap on 2026-09-03 (the twenty-subagents example). The Stop-threshold hook was the agent's "Recommended amendment" in issue 269 c7. r4-history-digest.md lines 364-366: "Proposed on 2026-09-03 and never approved; its sub-issue was later deleted" | Mike identified the gap on 2026-09-03. The Stop threshold hook was proposed by the agent in reply and was never approved. It is a design recommendation to put to Mike, not a settled decision |
| R30 entry, line 66 | The OS PRD conflicts table has "four rows this PRD now settles: simple-request lookups (R5), draft refinement without cards (R10), roadmap ownership (R16), concurrent `current.md` (R13)" | Rows 501, 502 and 507 are settled by the knowledge PRD. Row 508, concurrent current context, already records the agreement and its recommendation reads "Reuse that agreement under R18. The coordination method belongs in design". r4-history-digest.md line 164 counts three | Three rows (501, 502, 507) are settled by this PRD and become automatic OS PRD upkeep. Row 508 is already reconciled and needs only the design's coordination method. Row 503 stays genuinely open |

### peer-design-sketch.md

| Location | The claim | What the source says | Corrected claim |
|---|---|---|---|
| Line 13, and part C, H4 | "`PostToolUse` ... fires for the `Skill` tool like any other tool (hooks.md, 'PostToolUse'; skills.md, 'Restrict Claude's skill access')" | The cited skills.md section says nothing about hook events. `ai-external-knowledge/claude-code/hooks.md` line 1365 says a `PreToolUse` hook matching the `Skill` tool fires only when Claude calls the tool, and typing `/skillname` directly bypasses it; `UserPromptExpansion` covers that path. r1 [V9] adds that the Skill tool's `tool_input` schema is undocumented | Skill-tool hooks fire only when the model invokes the skill. A user-typed `/knowledge-save` never reaches them, so H4 alone cannot prove the skill ran. The decision brief's [V9] ruling (dynamic context injection in the skill body) is the correct successor |
| Part C, H2, H3, H5 | One hook handler carries several `if` entries, such as `Bash(gh pr create *)`, `Bash(gh issue close *)`, `Bash(work finish *)` | hooks.md line 435: "The `if` field holds exactly one permission rule. There is no `&&`, `||`, or list syntax for combining rules; to apply multiple conditions, define a separate hook handler for each" | Each `if` pattern needs its own handler entry. H2 becomes three handlers, H3 four, H5 two |
| Part C, H3 and H5 | `if` patterns written as `Edit(knowledge/memory/memory-entries/**)` and `Edit(knowledge/**)` | hooks.md line 437: since v2.1.214 a single-segment directory pattern matches only that directory in the working directory and below. `Edit(**/src/**)` is the any-depth form | Use `Edit(**/knowledge/prds/**)` and the matching forms. The decision brief's Round 1 consolidation (line 109) already carries this fix |
| Line 25 | Codex hook fields: "Secondary sources add `async`, `if`, `once`" | r2 section 1: "**These fields do not exist in Codex.** The hook handler struct has no `if` and no `once`." `async` does exist on a `command` handler | Codex command handlers take `command`, `commandWindows`, `timeout`, `async`, `statusMessage`, `additionalContextLimit`. There is no `if` and no `once`, so every Codex filter has to be a matcher plus logic inside the script |
| Part C preamble | All hooks use exec form, `"command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/<name>.mjs"]`, and "the same scripts registered in the project's `.codex/hooks.json`" | Exec form with `args` is correct for Claude Code (hooks.md lines 457-470). Codex command handlers have no `args` field (r2 section 1), and this repository's `.codex/hooks.json` resolves the script path with `git rev-parse --show-toplevel` because Codex does not set `$CLAUDE_PROJECT_DIR` (r2 section 4) | The exec form is Claude-Code-only. The Codex registration is a shell-form `command` string that resolves the path itself. One script can serve both harnesses; one JSON block cannot |
| Codex table, row H3 | Write guard "Likely not available (shell-only PreToolUse reported); report as a gap" | See the `PreToolUse` correction above | Available. `PreToolUse` with matcher `Edit|Write` or `apply_patch` can return `permissionDecision: "deny"`. The gap is that the hook receives the raw patch text and must parse it for paths |
| Codex table, row H5 | Checker after write: "Unknown for patch writes" | r2 section 2h: `PostToolUse` with matcher `apply_patch` or `Edit|Write` fires, can return `decision: "block"` with a reason, and can return `additionalContext` | Available on Codex, with the same patch-parsing caveat |
| Codex table, row H6 | Stop nudge: "`stop` event with `decision`/`additionalContext` \| Reported available" | r2 section 1b: Codex `Stop` can block with `decision: "block"` plus `reason`, and "There is no `additionalContext` field" | Codex `Stop` exists but carries no `additionalContext`. The nudge must travel as a block reason, which continues the turn rather than printing a quiet note |
| Codex table, row H7 | Compact hold: "`compact` event \| Reported available; verify manual versus auto" | r2 section 1b: `PreCompact` cannot block and its output schema has only `continue`, `stopReason`, `suppressOutput`, `systemMessage`. `PostCompact` is the same | Codex cannot hold a compaction. H7 is a Claude Code only safeguard and belongs in the named-gaps list |
| Part F, and the "what is dropped" table | Part F sets `autoMemoryEnabled: false`; the table row says "Keep, or switch to `autoMemoryEnabled: false` \| Both documented" | memory.md lines 360-368 documents both `autoMemoryEnabled: false` and `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`. The repository's `.claude/settings.json` line 4 uses the environment variable | Not an error of fact, but the sketch states two different settings for the same thing. Pick one and state it once |
| Part I | The delivery proof reads the `--init-only` debug log for the H1 output | hooks.md line 1236: "When you run `claude --init-only`, Claude Code runs Setup hooks and `SessionStart` hooks with the `startup` matcher, then exits" | `--init-only` proves the `startup` path only. The `compact`, `resume`, `clear` and `fork` paths the design depends on need a separate check |
| Line 17 | "Invoked skill bodies stay in context and are re-injected after compaction up to 5,000 tokens each" | context-window.md line 1610: capped at 5,000 tokens per skill **and 25,000 tokens total, oldest dropped first** | Add the 25,000-token total and the oldest-dropped-first rule; a session that invokes many skills can lose the save skill's body entirely |

### main-decision-brief.md

| Location | The claim | What the source says | Corrected claim |
|---|---|---|---|
| Item 2, line 31, and [V2] | "Report the write guard and the after-write checker as gaps if Codex PreToolUse and PostToolUse cover the shell tool only [V2]" | r2 settles it: both cover file edits through the `Write`/`Edit` aliases on `apply_patch` | The condition does not hold. Neither is a Codex gap. The real Codex gaps are: no `additionalContext` on `Stop`; `PreCompact` cannot block; no `if` and no `once`; no path-scoped rules; and `apply_patch` hands the hook the whole patch text with no file list |
| C, line 52, and [V8] | "Codex: nested `knowledge/AGENTS.md` if Codex loads nested AGENTS.md on directory access [V8]" | r2 section 2f: Codex collects every `AGENTS.md` from the project root down to the **working directory** only. "If the session starts at the repository root and the agent edits `knowledge/memory/foo.md`, the `knowledge/AGENTS.md` file is not loaded, because the working directory never became `knowledge/`" | [V8] is answered and the answer is no. The path-scoped rule has no Codex equivalent. Put the six lines in the root `AGENTS.md`, or have the Codex `PreToolUse` edit hook return `additionalContext` naming the folder's rules |
| Rulings from r5, line 131 | Codex has "twelve lifecycle hook events with the same names and the same JSON output format as Claude Code" | r5-alternatives.md line 58, the source cited, says "nearly the same JSON". r2 shows where it differs: `Stop`, `SubagentStop`, `PreCompact`, `PostCompact`, `SessionEnd` and `Interrupt` have no `additionalContext`; there is no `if`, `once`, or `args` | Same twelve event names and the same `hookSpecificOutput.additionalContext` and `permissionDecision` shapes where the event supports them. Per-event output differs, and the config schema differs |
| Rulings from r5, line 131 | "[V2] is partly answered; keep the PreToolUse file-write question open until r2 confirms" | r2 has landed and confirms it | Close [V2]. Codex `PreToolUse` covers file writes |
| Round 1, line 112 | "`additionalContextLimit` must be at least the 9,500-character budget (today it is 5,000)" | r2 section 1: `additionalContextLimit` is "an approximate token threshold", not a character count. Over it, Codex writes the text to a temp file and gives the model a preview plus the path. `.codex/hooks.json` today sets 5000 | The Codex limit is in tokens. A 9,500-character budget needs roughly 2,400 to 3,200 tokens, so 5,000 may already be enough. Convert the budget before changing the number, and prove it |
| Rulings from r1, line 153 | A PostToolUse hook on Bash can read `tool_response.bashEditDiff` "(v2.1.269 or later, beta, best effort)" | r1 item 9: it is also "gated by the new `bashEditDiffEnabled` setting; without it, recording happens only in auto mode and `bypassPermissions`" | Add the `bashEditDiffEnabled` gate. Unset, the field is absent in ordinary sessions, so the `git status` branch is the only carrier |
| Failure table, line 14 | "Four moments the harness raises (pull request, item close, compaction, handoff)" | R9 line 674 names five moments. Of those, a hook raises the pull request, the item close and the manual compaction. Nothing in the design raises a handoff: `SessionEnd` cannot speak to the agent (hooks.md, and r1 confirms), and the handoff is carried by `offer-context-handoff.md` and the `/handoff` skill | "Three moments a hook raises (pull request, item close, manual compaction), plus a handoff that the handoff rule and skill raise, plus the Stop nudge" |
| Round 1, line 116 | `approved_by: Mike Rihm, standing approval (approval step off)` | PRD line 940 gives `approved_by` the allowed value "A person's name" | The composite string is outside R14's stated allowed value. Either R14's allowed value widens, or the standing-approval marker moves to its own field. This is already flagged for Mike; the flag should name the R14 conflict |

---

## Section 2. Confirmed

The load-bearing claims, each opened in its primary source.

1. **Hook output cap.** Hook output strings, including `additionalContext`,
   `systemMessage` and plain stdout, are capped at 10,000 characters; beyond it
   the text is written to a file and replaced with a preview and a path.
   `ai-external-knowledge/claude-code/hooks.md` line 916 (captured 2026-09-04),
   and again at line 996. The observed consequence is real: the shipped startup
   hook printed 20,585 characters this session
   (`scratchpad/research/r3-current-implementation.md` line 107), of which
   `knowledge/README.md` is 13,395 (r3 line 115, confirmed by
   `wc -c knowledge/README.md`).

2. **Hooks for one event run in parallel.** "All matching hooks run in
   parallel." hooks.md line 417. One handler must print the ordered startup map.

3. **Compaction re-injection.** Project-root CLAUDE.md, unscoped rules, auto
   memory and the plan are re-injected from disk; path-scoped rules and nested
   CLAUDE.md reload only when a matching file is read; invoked skill bodies come
   back at 5,000 tokens each and 25,000 total, oldest dropped first; up to five
   recently modified files are re-read; hook-added context is summarized away;
   `SessionStart` hooks matching the `compact` source run again.
   `ai-external-knowledge/claude-code/context-window.md` lines 1601-1614.

4. **A plugin cannot ship rules.** The plugin manifest's component path fields
   are `skills`, `commands`, `agents`, `workflows`, `hooks`, `mcpServers`,
   `outputStyles`, `lspServers`, `experimental.themes`,
   `experimental.monitors`, `userConfig`, `channels`, `dependencies`. There is
   no `rules` field and no way to add CLAUDE.md text.
   `ai-external-knowledge/claude-code/plugins-reference.md` lines 541-557.
   `${CLAUDE_PLUGIN_DATA}` resolves to `~/.claude/plugins/data/{id}/` and
   survives plugin updates (same file, lines 697 and 737), which confirms [V6].

5. **Skill tool hook behavior.** "A `PreToolUse` hook matching the `Skill` tool
   fires only when Claude calls the tool, but typing `/skillname` directly
   bypasses `PreToolUse`. `UserPromptExpansion` fires on that direct path."
   hooks.md line 1365. Dynamic context injection is the documented alternative:
   `` !`command` `` runs before the body reaches Claude
   (`ai-external-knowledge/claude-code/skills.md` line 603), and "A failed
   command aborts the entire skill invocation, not just its own placeholder"
   with any non-zero exit counting as a failure (skills.md lines 666-668). The
   brief's requirement that the marker command always exit 0 is correct and
   necessary. `once: true` exists and is honored only in skill frontmatter
   (hooks.md lines 433 and 668).

6. **Checker constants and required fields.**
   `plugins/second-brain/tools/check-knowledge.mjs`: `CURRENT_MD_MAX_CHARS =
   2000` (line 29), `SELF_IMPROVEMENT_MAX_CHARS = 8000` (line 30),
   `SUMMARY_MAX_CHARS = 250` (line 31), `MANUAL_SHA256` (line 32).
   `MEMORY_REQUIRED` holds nine fields (lines 42-45); `SPEC_REQUIRED` holds
   eight and requires `area` (lines 46-49); `MEMORY_KNOWN` adds `group` but not
   `context` or `updated_at` (lines 51-55). The checker refuses a subfolder:
   "is a subfolder. This folder is flat" (lines 228-230). It checks
   `knowledge/current.md`, `knowledge/memory-self-improvement.md`,
   `knowledge/memory/` with `memory-index.md`, and `knowledge/prds/` with
   `spec-index.md` (lines 245-301). Against this, R21 line 1469 sets 200 and
   5,000, R14 lines 930-941 require twelve fields including `context` and
   `updated_at`, R16 line 1195 requires `group` and `updated_at`, R14 line 918
   allows topic folders, and R21 line 1460 renames the PRD index to
   `prd-index.md`. Every conflict the two peer files report here is real.

7. **Startup order in the shipped hook.** `STARTUP_FILES` in
   `plugins/second-brain/hooks/knowledge-session-start.mjs` lines 27-46 is
   `SOUL.md`, `knowledge/README.md`, `knowledge/project.md`,
   `knowledge/current.md`, `knowledge/memory/memory-index.md`,
   `knowledge/prds/spec-index.md`. The manual repeats the same six in the same
   order (`knowledge/README.md` lines 13-20). PRD line 480 requires `SOUL.md`,
   `knowledge/project.md`, `knowledge/README.md`. Both the hook and the manual
   have to change. `tests/knowledge-startup-check.mjs` locks the current order
   (lines 85-94), the manual hash (line 216) and the five proposal bullets
   (lines 280 and 398), as the brief states.

8. **The System Guide path conflict.** The knowledge PRD's layout gives the
   guide `knowledge/system-guide/system-guide-index.md` and
   `system-guide-entries/` (PRD lines 168-172), and R16 line 1133 repeats
   `knowledge/system-guide/`. The System Guide PRD requirement 6 gives it
   `knowledge/system/` with `README.md`, `tour.md` and seven section folders
   (`knowledge/prds/system-guide.md` lines 195-204), and allows an existing
   guide to keep its own location (line 211). PRD line 460 forbids this PRD
   becoming a second owner of another part's content. `.system-guide.json` is
   real and is already read by the manual and the `recall` skill.

9. **The glossary path conflict.** The knowledge PRD names
   `knowledge/memory/memory-entries/terminology-glossary.md` (line 612). The
   System Guide PRD requirement 2 names `knowledge/glossary.md`
   (`knowledge/prds/system-guide.md` line 125). Both were opened. One must win.
   No glossary file ships in the setup template today
   (`plugins/second-brain/skills/second-brain/SKILL.md` lines 29-50).

10. **Mike's 2026-09-02 and 2026-09-03 decisions.**
    - The gate: 2026-09-02 item 3, "Replace the one-time reminder with a real
      gate", direction approved. Its evidence: "One audited session claimed the
      review ran even though the session record showed that it had not."
      Issue 269 c0, verified in
      `scratchpad/research/issue-269-comments-raw.txt`.
    - The formatter: 2026-09-02 item 4, "Make proposal formatting automatic",
      direction approved. r4-history-digest.md line 61 marks it later dropped.
      See Section 3 for what that rests on.
    - Plugin-native hooks: 2026-09-02 item 2, "The required hooks ship inside
      the plugin as native plugin hooks ... Stop copying hook programs into each
      project." r4 line 59, issue 269 c0.
    - The guard set, 2026-09-03: the gate covers `gh pr create`, `work finish`
      and `gh issue close`, and does not cover `gh pr merge`. r4 line 78, issue
      269 c7.
    - Codex, 2026-09-03: equipped but ungated, "because Codex has no
      `PreToolUse` equivalent". Mike's words: "codex should be aware of the
      system yes." r4 line 77, issue 269 c7. The premise is now false (r2), so
      the gap half of that decision is obsolete; Mike's "equipped and aware"
      instruction still stands.
    - Removing the per-prompt reminder: 2026-09-02 item 7. r4 line 64.

Also confirmed and load-bearing: `SessionStart` accepts only `command` and
`mcp_tool` handlers and matches `startup`, `resume`, `clear`, `compact`, `fork`
(hooks.md lines 1096-1106); `watchPaths` is a SessionStart output field (line
1156); `FileChanged` "hooks have no decision control", Claude Code reads only
`watchPaths` and `systemMessage` from its output, and its matcher registers
literal filenames (hooks.md lines 2800 and 2866-2870), which is why the brief's
Round 1 replacement of decision B is correct; `PostToolUse` can return
`additionalContext` (line 1972); `Stop` carries `stop_hook_active` and
`last_assistant_message` and is overridden after 8 consecutive blocks (line
2477); `PreCompact` blocks with exit 2 or `decision: "block"`, and blocking an
auto compaction triggered by a context-limit error fails the request (lines
2989-2991); the `if` field is best-effort for Bash (line 451); hooks run inside
subagents with `agent_id` and `agent_type` (line 270), and only Explore and Plan
skip CLAUDE.md and rules (`sub-agents.md` lines 1036 and 1041), confirming
[V11]; `claude --debug-file <path> --init-only` is the documented delivery check
(hooks.md line 1240). On Codex: `memories.generate_memories` and
`memories.use_memories` default to true, with a state database, files under
`~/.codex/memories/`, its own Git baseline, and a consolidation agent that runs
with no approvals (r5-alternatives.md lines 60 and 150-169, citing the Codex
source) — the brief's ruling to switch both off is correct.

---

## Section 3. Claims that cannot be verified from the sources available

| Claim | Where | What would verify it |
|---|---|---|
| The formatter approved on 2026-09-02 (item 4) was later dropped | r4 line 61 says "later dropped: see section 2"; section 2 lists the five-bullet shape and the deleted `review.mjs` tool, not an owner reversal of item 4 | Mike's own words, or the issue 269 body's current solution-design section. Until then, item 4 is an approved direction whose vehicle was deleted, and the peer's recommendation to drop it is a recommendation, not a record |
| Codex hooks "on by default since 0.150.1 (2026-08-27)" | peer critique line 14, peer sketch line 26 | The Codex release notes, which r2 could not load; `developers.openai.com` is blocked from this machine |
| `${CLAUDE_PLUGIN_ROOT}` substitution inside a Codex hook command | peer sketch part C | r2 records no such substitution and no `args` field. A run of the hook in Codex, or the Codex path-substitution source |
| Whether Codex plugin-shipped hooks skip the trust prompt | r2 section 4 says the trust code treats plugin hooks as one source among project and user hooks, "which suggests they do not" | Installing the plugin in Codex and watching the trust screen |
| The Plain English 250-word target attributed to "PR #342" | peer critique R6 | The style file confirms the target (`.claude/output-styles/plain-english.md` line 19, "Aim for 250 words max. This is a target, not a hard cap"). The PR number is not checkable from this machine |
| "copies drifted in DragonFly" and DragonFly's 28,663-character startup print | peer critique ranked item 9; issue 269 c0 | The DragonFly repository, which is not in this session |
| "about 10 ms per Bash call" for the `git status --porcelain` branch | brief Round 1, line 105 | A timed run of the script in this repository |
| `watchPaths` accepting directories rather than filenames | brief B, retained as a later option | hooks.md describes literal filenames for the matcher and "absolute paths" for `watchPaths`. A test with a directory path settles it |
| Whether a subagent's hook input carries the parent's `session_id` ([V12]) | brief Round 1, line 110 | A subagent run with a logging hook. hooks.md documents `agent_id` and `agent_type` but not the `session_id` relationship |
| `bashEditDiff`, background SessionStart hooks, and the `WorktreeRemove` change | brief lines 151-153 | Confirmed by r1 against the live docs on 2026-09-16 but absent from the 2026-09-04 capture. Refreshing the capture (`node .claude/tools/capture-claude-code-docs.mjs`) is the brief's own build step zero and would close this |

---

## Section 4. Codex claims, checked against r2

r2-codex-capabilities.md landed during this check, so nothing is deferred. It is
source-code evidence from one clone, not documentation; r2 says to re-check
before depending on it.

**Corrected by r2** (details in Section 1): the nine-event list, the snake_case
event names, the `compact` event, "PreToolUse is shell-only", the `if` and
`once` fields, the Stop `additionalContext`, the compact hold, and the nested
`AGENTS.md` assumption in [V8].

**Confirmed by r2:**

- Codex reads `.codex/hooks.json` and `~/.codex/hooks.json`, next to each
  layer's `config.toml`. This repository's file is real and sets
  `additionalContextLimit` (verified directly: `.codex/hooks.json`).
- A hook runs only when its definition is trusted or managed.
- `SessionStart` supports `hookSpecificOutput.additionalContext` and matches
  `startup`, `resume`, `clear`, `compact`, `fork`. Note that this repository's
  `.codex/hooks.json` matcher omits `fork`.
- Codex skills live in `<project>/.codex/skills`, `.agents/skills` folders, and
  home-folder equivalents. Recognized frontmatter is `name`, `description`,
  `metadata.short-description` only. There is no Skill tool and no dynamic
  context injection, so the brief's Codex marker (a plain `node` step in the
  skill body) is the right fallback.
- Codex reads `.agents/plugins/marketplace.json` and `.codex-plugin/plugin.json`,
  both of which this repository already ships.
- **Codex plugins can ship hooks**, and none of the seven `.codex-plugin`
  manifests here declares a `hooks` key. This answers the peer's "unverified"
  note: the startup hook could ship inside the plugin instead of needing a
  `.codex/hooks.json` per project.
- All four Claude Code hooks that Codex does not currently run could run today
  with no code change, except that the scripts read `$CLAUDE_PROJECT_DIR`, which
  Codex does not set, and a patch-write hook receives a patch blob rather than a
  file path.
- Codex compaction re-renders the initial context, including the `AGENTS.md`
  block, so the standing obligations come back after compaction.
- Codex has no `.claude/rules/` equivalent and no `paths:` frontmatter.

---

## Section 5. Contradictions between the three files

The decision brief's rulings win where it explicitly changes the peer's sketch.

| Subject | peer-design-sketch.md | main-decision-brief.md | Follow |
|---|---|---|---|
| Startup budget | 9,000 characters (H1) | 9,500 characters (item 3) | The brief. State the cap (10,000) and the budget once |
| Skill marker | H4, a `PostToolUse` hook on the `Skill` tool | [V9] ruling: dynamic context injection in the knowledge-save body, always exiting 0; `PostToolUse` on `Skill` demoted to fallback | The brief. The sketch's H4 misses user-typed `/knowledge-save` |
| After-write check | H5, `PostToolUse` on `Edit|Write|NotebookEdit` with `if` | B, then Round 1: `PostToolUse` on Edit and Write, plus a `PostToolUse` on Bash with no `if` running `git status --porcelain`; FileChanged rejected as a carrier | The brief's Round 1 version |
| `if` pattern shape | `Edit(knowledge/prds/**)` | Round 1: `Edit(**/knowledge/prds/**)` | The brief, which matches hooks.md line 437 |
| Command gate scope | `gh pr create`, `gh issue close`, `work finish` | A: also `mcp__github__create_pull_request` and `mcp__github__issue_write`, holding only when the state is set to closed | The brief. r2 confirms MCP tools reach hooks as `mcp__<server>__<tool>` in Codex too |
| Pull-request merge | H2 names `gh pr merge` as an uncovered gap | H, Round 1: merge raises no hold by design; an inbox entry carries the owed PRD upkeep | The brief. The 2026-09-03 guard set excludes merge |
| Rule files | One rule file, `.claude/rules/knowledge-system.md` | C, narrowed in Round 1: a second, path-scoped `knowledge-files.md` of six lines | The brief. Note that the path-scoped rule reloads after compaction only on a later matching read (context-window.md line 1607) |
| Subagent write guard | Part B: the rule says a helper never writes knowledge; H3 keys on the session marker | [V11] ruling: the guard denies any Edit or Write under lasting paths whenever `agent_id` is present | The brief. It is enforcement rather than instruction, and it covers Explore and Plan, which load no rules |
| Enforced save moments | Ranked item 4: four visible moments — item finish, pull request, handoff, owner request | Failure table: four harness-raised moments — pull request, item close, compaction, handoff | Neither list is right as written. Three are raised by a hook (pull request, item close, manual compaction); the handoff is raised by `offer-context-handoff.md` and `/handoff`; the owner's request is carried by skill descriptions; the Stop nudge covers the rest |
| Parts list | "Markdown files, one rule file, seven hook scripts, four skills, three tools, and Git" | Adds a `.githooks/` pre-commit checker enabled with `core.hooksPath` (r5 ruling), and a second rule file | The brief. Both additions stay inside PRD line 459's five parts, and the parts list in the final design must be updated to match |
| Codex memory | Not mentioned | r5 ruling: `knowledge-setup` turns `generate_memories` and `use_memories` off and the setup report says so | The brief. This is a requirement 1 and 10 breach if left on |
| OS PRD rows settled | Four (adds concurrent `current.md`) | Three (501, 502, 507) | The brief, which matches r4. Row 508 is already reconciled; row 503 stays open |

Two places where the peer sketch disagrees with itself: part F sets
`autoMemoryEnabled: false` while the change table leaves the environment
variable as an option; and part A caps `current.md` at 5,000 characters (R21)
while the critique correctly notes the shipped checker caps it at 2,000. Both
resolve toward the PRD.

---

## Sources opened

PRD: `/home/user/claude-toolkit/knowledge/prds/knowledge-system.md`.
Related PRDs: `system-guide.md`, `toolkit-operating-system.md`,
`work-item-upkeep.md`, all under `/home/user/claude-toolkit/knowledge/prds/`.
Code: `plugins/second-brain/tools/check-knowledge.mjs`,
`plugins/second-brain/tools/build-knowledge-index.mjs`,
`plugins/second-brain/hooks/knowledge-session-start.mjs`,
`memory-reminder.mjs`, `save-reminder.mjs`,
`plugins/second-brain/skills/*/SKILL.md`,
`plugins/second-brain/skills/remember/references/proposal-template.md`,
`plugins/second-brain/skills/second-brain/SKILL.md`,
`tests/knowledge-startup-check.mjs`, `.codex/hooks.json`,
`.claude/settings.json`, `.claude/rules/knowledge-direct-commit.md`,
`.claude/output-styles/plain-english.md`, `knowledge/README.md`,
`plugins/CLAUDE.md`, all under `/home/user/claude-toolkit/`.
Captured docs (captured 2026-09-04) under
`/home/user/claude-toolkit/ai-external-knowledge/claude-code/`: `hooks.md`,
`skills.md`, `memory.md`, `plugins-reference.md`, `context-window.md`,
`sub-agents.md`, `README.md`.
Research under
`/tmp/claude-0/-home-user-claude-toolkit/4fcf9e21-6c96-5d1c-816b-828bcf2822e5/scratchpad/research/`:
`r1-claude-code-capabilities.md`, `r2-codex-capabilities.md`,
`r3-current-implementation.md`, `r4-history-digest.md`, `r5-alternatives.md`,
`walkthrough-text.txt`, `issue-269-comments-raw.txt`.

# Main design lead: decision brief (input for the Opus drafters)

Written 2026-09-16 by the main session. These are decisions and reasons. Facts marked [V#] are pending verification by the research agents; the drafter must replace each [V#] with the verified fact and its source, or change the decision and say so.

## What the system must solve (the intent, in my words)

Mike runs many agent sessions at once, in Claude Code and Codex. Sessions lose context often. He wants every new session to already know the project state and the lasting facts, better than he does, without him doing any upkeep. Saving something worth keeping takes one short yes. Nothing wrong or unapproved ever enters the store, because a later agent will believe it.

The six ways it fails, and what the design does about each:

| Failure | Cause | Design answer |
| --- | --- | --- |
| The agent repeats a question the project already answered | It did not look | A rule that says when to look, a find skill that says how, a startup map that shows what exists |
| Something worth keeping is lost | Nobody proposed a save | Four moments the harness raises (pull request, item close, compaction, handoff) plus a nudge when many files changed, plus standing guidance for the rest |
| Junk or unapproved text enters the store | A hand edit, or a save without a yes | Lasting files can only be written after the save skill is loaded; the checker runs after every write; approval stays the agent's duty under the skill's rules |
| A saved file never reaches other sessions | Left on a branch | The existing direct-commit rule; the inbox keeps the save until the push is verified |
| Guidance is gone after compaction | Context was summarized | Rules re-inject from disk; the startup hook runs again on compaction; invoked skills re-attach |
| Startup is heavy | Everything loads at once | One hook prints a short map under a fixed budget; details live in skills and load on demand |

## Three kinds of control, used consistently

- ENFORCE: the harness blocks or requires it. Used only for writes to lasting files, the four visible moments, and file checks.
- GUIDE: the right text reaches the agent at the moment it applies. Used for lookups, citations, candidate selection, wording, and the quiet per-turn review.
- JUDGE: the agent decides with its own reasoning. Relevance, search, what counts as memory, the card wording, the destination.

Nothing scores the agent's search or reads its replies. No second reasoning engine. No service. No database. No background writer.

## Decisions where I agree with the peer (adopt as written in peer-design-sketch.md unless changed below)

1. Build on documented command hooks. Function hooks are not shipped [V1]. Name the session-state file and the two PreToolUse scripts as the parts a function hook would replace later.
2. Codex gets the same hooks where its events exist [V2]. Report the write guard and the after-write checker as gaps if Codex PreToolUse and PostToolUse cover the shell tool only [V2].
3. Startup: one SessionStart hook (source startup, resume, clear, compact, fork) prints in order: a version line; SOUL.md; knowledge/project.md; knowledge/README.md; knowledge/memory/current.md; the inbox entries' heading and state lines; the two index files whole when short, else their paths; the glossary whole when under 2,000 characters, else its path; the System Guide line. Budget 9,500 characters because hook output is capped at 10,000 [V3]. One hook, not several, because hooks for one event run in parallel and order is not guaranteed [V4]. Hook-delivered contents count as the three startup reads; the hook's last line tells the agent to give the one-line confirmation, or names the missing file and tells it not to confirm.
4. The manual becomes a map under 4,000 characters: the requirement 18 table verbatim, the find order in five lines, the five save moments, the approval rule in three lines, the file list, one line per skill. Templates and field tables move to skill references.
5. One short standing rule file, `.claude/rules/knowledge-system.md`, about 25 lines, shipped from project-init's rule library, mirrored as a section in AGENTS.md for Codex. It survives compaction by re-injection from disk [V5].
6. Four skills: knowledge-find, knowledge-save, knowledge-review, knowledge-setup. All model-invocable and user-invocable. Short bodies, references for templates. The requirement 20 card replaces the five-bullet template.
7. Guards, all fail-open command hooks in the plugin's hooks.json: (a) command gate on pull-request creation, issue close, and work-item finish, released only when the save skill ran after the branch's last commit; (b) write guard on Edit and Write under memory-entries/ and prds/ until the save skill ran this session; (c) checker plus index rebuild after every write under knowledge/ and ai-external-knowledge/; (d) Stop nudge when changed files since the last review cross a threshold, and once per session when the inbox holds an approved unfinished save; (e) PreCompact hold for manual compaction, once per session. No UserPromptSubmit hook.
8. Session state in `${CLAUDE_PLUGIN_DATA}/sessions/<session_id>.json` [V6]; Codex in a folder under the home directory. Never in the repository.
9. Plugin-native hooks and tools; projects keep no copies. This repo's installed-copy test changes accordingly.
10. Approval-off setting in `knowledge/project.md` frontmatter (`memory_approval: required` or `off`); `approved_by` holds "standing approval (approval step off)" and `approval_date` the write date when the step is off. Flag for Mike.
11. Push cadence: several decisions settled in one reply share one push; current.md pushes at save moments and handoff; between them the one-line confirmation says "saved locally, not yet pushed". Flag for Mike.
12. System Guide paths: this PRD points only at the entry page named in `.system-guide.json`; the System Guide PRD owns its layout. Glossary path: Mike picks one. Flag.
13. Inbox: write the entry locally in the reply that shows the card; push at the next push or at handoff.
14. Feedback file `knowledge/memory-selection-feedback.md`, table shape, 4,000-character cap.
15. Layout migration lives in project-sync, approved per project, links repaired under requirement 1.

## Decisions where I change or add to the peer's design

A. **Pull requests made through the GitHub MCP tool.** In web and remote sessions the agent opens pull requests with `mcp__github__create_pull_request`, not `gh pr create`. The command gate must also match that tool name (PreToolUse matcher on the MCP tool). Same for issue close through `mcp__github__issue_write`. Without this the gate is silent exactly where this repo's owner works most.

B. **Writes that bypass Edit and Write.** Bash edits (`sed`, heredocs, `python -c`) skip a PreToolUse guard on Edit and Write. Some sessions are told to prefer Bash for edits. Decision: the after-write checker must not depend on the Edit tool. Use the SessionStart `watchPaths` field to watch knowledge/memory/memory-entries, knowledge/prds, and ai-external-knowledge, and run the checker and index rebuild from a FileChanged hook [V7]. If FileChanged does not fire for changes made by the agent's own Bash commands, keep PostToolUse on Edit|Write and add a PostToolUse on Bash with an `if` of `Bash(*knowledge/*)` as best-effort, and name the remaining gap. The write guard itself stays on Edit and Write only; it is a guide-strength guard and the setup report says so.

C. **Guidance at the moment a knowledge file is opened.** Add one path-scoped rule, `.claude/rules/knowledge-files.md` with `paths: knowledge/**`, holding the file rules that matter when the agent reads or edits a memory file or a PRD: the required fields in one table, "write only through knowledge-save", "an index line is a pointer, open the file", "a proposed PRD does not prove behavior". Path-scoped rules load when the agent reads a matching file and cost nothing otherwise. This is the documented way to deliver guidance at the moment of need without a hook. Codex: nested `knowledge/AGENTS.md` if Codex loads nested AGENTS.md on directory access [V8]; otherwise the section stays in the root AGENTS.md.

D. **The skill marker.** Prefer a PostToolUse hook matching the Skill tool [V9] to record that knowledge-save was invoked. If that event does not fire for skills, use dynamic context injection in the skill body (a `!` command line that runs when the skill loads) to write the marker [V10]. Say which one the build uses.

E. **Startup overflow rule.** When a file would push the hook output over budget, the hook prints, in that file's place and in order, a line: "Read <path> now, before the confirmation." The order rule holds either way.

F. **The per-turn review stays a guided duty, with one honest sentence in the design and in the setup report:** a quiet review with nothing to say cannot be observed, so it is guided, not enforced; the Stop nudge and the four enforced moments are the safety net. Do not build a prompt or agent hook that reads replies to check for it. Present that as a rejected option with the reason (requirement 29 and 3 line 535).

G. **Subagents.** Hooks from the plugin run inside subagents [V11]. The rule file says a helper agent reports candidates and never writes knowledge. The write guard denies a helper's Edit under lasting paths because the helper never loads the save skill.

H. **"When work ships" for automatic PRD upkeep** means: the work item is closed as done, or its pull request is merged to the default branch. The gate at item close forces the save skill, whose upkeep branch handles it. Flag as an interpretation.

I. **Test plan first for the riskiest assumptions.** Before any build: (1) one SessionStart hook prints 9,500 characters in order on startup and compact; (2) PostToolUse fires for the Skill tool; (3) FileChanged with watchPaths fires for a Bash write; (4) `if` filters on `Edit(knowledge/prds/**)` match from the project root; (5) plugin hooks.json scripts run with `${CLAUDE_PLUGIN_ROOT}`; (6) rules re-inject after compaction; (7) Codex hook events and PreToolUse coverage; (8) Codex nested AGENTS.md. Each is a one-hour check with a written result.

J. **Work-item split (suggested):** (1) manual, rule files, startup hook, four skills for Claude Code; (2) guards and session state; (3) tools (builder, checker) and layout migration; (4) Codex delivery; (5) setup, sync, and the delivery proof; (6) tests, docs, and the other toolkit parts that name the old skills. Each names the requirements it delivers.

## Requirements to reconsider, in my ranking (each with my recommended answer)

1. Requirement 2, "confirm the contents were read": unobservable. Answer: hook delivery in order counts as read; the check is that the delivery finished.
2. Requirements 3 and 9, quiet review at every turn with real work: unverifiable. Answer: guided duty plus the Stop nudge; enforce the four visible moments.
3. Requirements 9 and 13, push per decision and per current.md change: costly on a shared default branch. Answer: batch per reply; push at save moments and handoff; say "local only" between.
4. Requirement 14 with 10, `approved_by` when the approval step is off. Answer: a fixed phrase and the write date.
5. Requirement 18 and the layout, System Guide paths and the glossary path: cross-PRD conflict. Answer: this PRD stops naming another plugin's layout; Mike picks the glossary path.
6. Requirement 17, the skill-authoring process does not exist. Answer: name it as a dependency; the save skill hands off to a project skill proposal with owner approval until that process exists.
7. Requirement 16, "when work ships" undefined. Answer: item closed as done or pull request merged.
8. Requirement 1, "nothing else" versus Node scripts. Answer: a script a hook or skill runs is part of that hook or skill.
9. Requirement 8 and 21, the outside-documentation index is hand-written today. Answer: generated from topic entry pages; the capture script writes the topic page frontmatter.
10. The preferred direction names function hooks, which are unshipped. Answer: documented command hooks now; one named upgrade point.
11. Requirement 28, nine lines per inbox entry: heavy for a rare case. Answer: keep the approved shape; the skill reference gives the template so the agent never composes it from memory.
12. Requirement 25's check "the same result in Codex" cannot fully pass. Answer: the setup report names each gap; the check is "same or named".

## Options to present (recommendation first)

1. Startup reads: inject whole files (recommended) versus a directive plus Read calls checked by a hook.
2. Command gate: marker-released (recommended) versus hold-once per branch.
3. Write guard: PreToolUse guard (recommended) versus none.
4. Standing obligations: short manual plus rule file (recommended) versus manual only.
5. Inbox timing: same reply (recommended) versus when unanswered.
6. Per-turn review check: guided plus nudge (recommended) versus a prompt hook on Stop that reads the reply (rejected: a reply reader, requirement 29).
7. After-write check trigger: FileChanged with watchPaths (recommended if [V7] holds) versus PostToolUse on Edit and Write only.
8. Skill marker: PostToolUse on the Skill tool (recommended if [V9] holds) versus dynamic context injection in the skill body.

## Alternatives considered for the whole system and rejected

- Claude Code auto memory as the store: outside the repo, not owner-visible in the project, not shared with Codex. Rejected by requirement 1. It stays off.
- An MCP server or service for knowledge operations: a service and a second reasoning layer. Rejected by requirements 1 and 29.
- Agent or prompt hooks that judge the agent's search or replies: a scorer. Rejected by requirement 29; presented as options only where noted.
- Third-party memory systems: pending r5-alternatives.md; the drafter adds the verdict table.

## Round 1 consolidation with the peer (settled 2026-09-16, both leads agree)

These replace the matching points above.

- **B replaced.** FileChanged is not the checker's carrier: that event returns no additionalContext, so a failed check would never reach the agent, and it watches literal filenames. The after-write checker runs from PostToolUse on Edit|Write (additionalContext reaches the agent) plus a PostToolUse on Bash with no `if` whose script runs `git status --porcelain -- knowledge/ ai-external-knowledge/`, checks only files changed since its last run, and stays silent otherwise (about 10 ms per Bash call). FileChanged with watchPaths may be added later as a silent index rebuild for the owner's hand edits; [V7] becomes a test for that use only.
- **C narrowed.** The path-scoped rule `knowledge-files.md` (`paths: knowledge/**`) is six lines, no field table: write lasting files only through knowledge-save; an index line is a pointer, open the file; a proposed PRD proves nothing about today; put the source path under each finding; reread a shared file before editing it; fields and templates are in knowledge-save's references. Reason: requirement 18 says each home's rules are written in one place, and this rule loads on any read under knowledge/.
- **H kept, merge not gated.** Merging a pull request raises no hold (Mike's 2026-09-03 guard set excludes merge; the GitHub MCP merge tool follows that). Instead, at the pull-request save review, the save skill writes one inbox entry "PRD upkeep owed when PR N merges, authority: shipped-work upkeep", so the next session's startup lines and the Stop nudge carry it.
- **Gate on the GitHub MCP tools:** `mcp__github__issue_write` also creates and edits issues; the gate reads tool_input and holds only when the state is being set to closed.
- **`if` patterns:** use `Edit(**/knowledge/prds/**)` and `Write(**/knowledge/memory/memory-entries/**)`; a single-segment pattern matches only under the working directory root (hooks.md, v2.1.214 change). Add to the test plan.
- **Subagents:** test whether a subagent's hook input carries the parent's session_id [V12]. If it does, the write guard keys on session_id plus agent_type when present, so a helper never passes on the parent's marker. Explore and Plan subagents load no rules, so for them the write guard is the only cover; say so.
- **Codex marker:** Codex has no Skill tool and no dynamic context injection, so the save skill's last step runs one `node` command that writes the marker there. Weaker; named in the Codex table.
- **Codex hooks.json:** `additionalContextLimit` must be at least the 9,500-character budget (today it is 5,000).
- **Windows:** gate matcher `Bash|PowerShell` with PowerShell command forms; normalize backslash paths in the write guard before matching.
- **Path references:** `knowledge-direct-commit.md` step 4 and this repo's CLAUDE.md tool rows change from `.claude/tools/...` to the plugin path once copies go.
- **Session-state sweep:** the SessionStart hook deletes state entries older than 30 days.
- **Flag 4 wording:** `approved_by: Mike Rihm, standing approval (approval step off)` so a reader knows who granted the standing approval.
- **Flag 11:** the startup hook prints only each inbox entry's heading and state line, so a heavy entry costs nothing at startup.
- **Extra flag (requirement 7):** "from the first message of every session" is met by printing the glossary at startup when it is under 2,000 characters; a larger glossary prints only its path and the agent must open it. The setup report names that limit.

## Evidence from the implementation audit (r3-current-implementation.md, 2026-09-16)

- Observed failure, this session: the shipped startup hook printed about 20,585 characters. Claude Code caps hook output at 10,000 characters and replaced the rest with a preview and a file path. So today the manual does not reach the agent at startup unless the agent opens that file. The 9,500-character budget is not a preference; it is the condition for the startup reads to happen at all. Put this in the design as the first reason.
- Per-message cost today: 1,292 characters of fixed reminder text on every prompt (memory-reminder.mjs). Dropped in the design.
- Nothing shipped for requirement 28 (inbox), requirement 7 (glossary), requirement 2's confirmation, or the third index.
- Three hard blockers in the shipped tools: the checker rejects `context` and `updated_at` as unknown fields; topic folders and child PRDs are impossible in the checker, builder, setup skill, and project-sync; `tests/knowledge-startup-check.mjs` locks the old startup order, the manual's hash, and the five proposal bullets that requirement 20 replaces. All three change in the build.
- Keep list from the audit: frontmatter.mjs, the secret patterns, the checker's read-only promise, the PRD approval-field logic and its tests, fail-open hooks, temp-folder session state, knowledge-direct-commit.md, the memory-self-improvement mechanism (renamed), the System Guide boundary, session-search.
- Rename cost: `remember` is named in 15 files, `spec-index.md` in 8. Section 6 of the audit lists every dependency; the build plan must carry that list.

## Rulings from the alternatives report (r5-alternatives.md, 2026-09-16)

- **One hook script serves both harnesses.** Codex has twelve lifecycle hook events with the same names and the same JSON output format as Claude Code (verified from the Codex source at commit 9771934: hookSpecificOutput.additionalContext, permissionDecision allow/deny/ask). Decision: every hook script is written once, reads the same JSON, and is registered in the plugin's hooks.json for Claude Code and in `.codex/hooks.json` for Codex. The Codex table in the design records, per event, "same", "weaker", or "not present", from r2-codex-capabilities.md when it lands. [V2] is partly answered; keep the PreToolUse file-write question open until r2 confirms.
- **Codex's own memory system must be turned off.** Codex ships `generate_memories` and `use_memories` on by default, with a database and a background consolidation agent that writes without approval. That breaks requirements 1 and 10. Decision: knowledge-setup turns both off for an equipped project and the setup report says so, the same way Claude Code auto memory is off. Where the setting lives (project or user config.toml) is a build-time check.
- **Git pre-commit hook running the checker.** Nothing runs the checker automatically today. A pre-commit hook under a repo-tracked `.githooks/` folder, enabled by setup with `core.hooksPath`, runs the checker on staged files under knowledge/ and ai-external-knowledge/ and refuses the commit on a failure. It covers both harnesses and the owner's hand edits at the moment knowledge is published. Git is one of the five allowed parts. Decision: adopt as part of the checker layer; the PostToolUse checker gives the agent early feedback, the pre-commit hook is the last line. Flag: it also stops the owner's own bad commit, which is the intent of requirement 21.
- **Write-guard options, updated.** Option A (recommended): deny Edit and Write under lasting paths until knowledge-save was invoked this session. Option B (escalation, not now): deny unless `knowledge/memory-inbox.md` holds a matching "approved, save unfinished" entry for that destination, which makes the inbox an approval ledger and forces every save through an inbox entry first. B is stronger and heavier; requirement 29 says add restrictions only after a failure that happened. Record B as the next step if an unapproved write ever lands.
- **Skill-declared hooks.** A skill's frontmatter `hooks` field can register a hook only when that skill runs. Decision: not used for the guards (they must exist before the skill runs); may be used later for a checker that runs only during a save, if the plugin-level PostToolUse checker proves too chatty. Not in this design.
- **PreCompact:** hold manual compaction only; auto compaction is never blocked because that can fail the request. Unchanged.
- **Unsolved by anyone, stated plainly in the design:** proving a file was read and used, proving the right knowledge was consulted, and judging whether a written fact is true. The repo's own 2026-08-04 brainstorm holds the example (an agent wrote "nine months" with the right dates in front of it). These stay JUDGE, tested by requirement 3's sessions.
- Third-party memory products (claude-mem, memsearch, Mem0, Letta): all need a database and write without asking. Rejected under requirements 1 and 10; the design's alternatives table cites r5.

## Rulings from the Claude Code report (r1-claude-code-capabilities.md, 2026-09-16)

Pending facts resolved:
- [V1] Function hooks do not exist in any official source (14 live pages, changelog to 2.1.273, llms.txt). Issue 91870 is by a community account. Decision stands: documented command hooks only. The design mentions function hooks once, as an unverified future.
- [V3] Hook output cap is 10,000 characters per string; above it the text goes to a file and the agent gets a path and preview. Confirmed.
- [V4] Hooks for one event run in parallel with non-deterministic order. Confirmed: one handler prints the ordered startup map.
- [V5] Re-injected after compaction: project-root CLAUDE.md, unscoped rules, auto memory, the plan; invoked skill bodies (5,000 tokens each, 25,000 total); up to five recently modified files. Path-scoped rules and nested CLAUDE.md reload only on a later matching read. SessionStart hooks matching `compact` run again. Confirmed.
- [V6] `${CLAUDE_PLUGIN_DATA}` exists (`~/.claude/plugins/data/<id>/`). Confirmed.
- [V9] and [V10], the skill marker: PreToolUse and PostToolUse fire for the Skill tool when the model invokes a skill, but a typed `/skill-name` bypasses those events (UserPromptExpansion covers that path), and the Skill tool's `tool_input` schema is undocumented. Decision changed: the marker is written by dynamic context injection in the knowledge-save body (a `!` command line runs on every invocation, both paths). The command must always exit 0, because a failed injected command aborts the whole invocation. PostToolUse on Skill becomes the fallback option. Codex: a plain `node` step in the skill body, as already decided.
- [V11] Plugin and settings hooks run inside subagents, with `agent_id` and `agent_type` in the input. Decision: the write guard denies any Edit or Write under lasting paths when `agent_id` is present, whatever the marker says. Helpers never write lasting knowledge; the rule says it and the guard enforces it.
- New: plugins cannot ship `.claude/rules` files or CLAUDE.md text. Rule files are written into the project by project-init and project-sync from the shipped library, as planned. State this in the design.
- New: SessionStart hooks now run in the background at launch, and Claude's first response still waits for them, so the map reaches the agent. A `/clear` or conversation switch while they run discards their output; the hook runs again on the new source, so nothing is lost.
- New: `InstructionsLoaded` runs asynchronously; not usable as proof of delivery. Not used.
- New: a PostToolUse hook on Bash can read `tool_response.bashEditDiff` (v2.1.269 or later, beta, best effort). Decision: the after-write checker's Bash branch uses `git status --porcelain` as designed and reads `bashEditDiff` as a hint when present. Not a gate.
- Stop hook input carries no tool count and no changed-file list, and the transcript lags. Confirmed: the Stop nudge counts changed files with git, as designed.
- SessionEnd fires on `/clear` but cannot speak to the agent. Confirmed: a deliberate clear is covered by the offer-context-handoff rule and the handoff skill; the design says so plainly.
- Skill frontmatter `hooks` with `once: true` exists (honored only in skill frontmatter). Recorded as available; not used in this design.
- The captured docs are twelve days old and twelve releases behind. The build refreshes the capture first (`node .claude/tools/capture-claude-code-docs.mjs`) and re-reads hooks.md and skills.md. Add as build step zero.

## Rulings from the history digest (r4-history-digest.md, 2026-09-16)

- Tie-break rule the design must repeat: the approved walkthrough wins over the PRD; a later clear instruction from Mike wins over both.
- Two more open items flagged on 2026-09-15 and never answered, to add to the open-questions list for Mike: requirement 16's "approved while proposed" line (PRD lines 1198 to 1200), and the three exclamation marks in requirement 9 (PRD line 678).
- The OS PRD's open row that is still genuinely open (toolkit-operating-system.md line 503): what a failed or missed knowledge review does to work completion. My recommended answer for Mike: the item-close gate requires the save review to have run; a save that then fails is reported in the completion summary and kept in the inbox, and it does not block Done, because requirement 3 says a failed save pauses only dependent work. Flag.
- Three OS PRD rows (lines 501, 502, 507) are settled by the knowledge PRD; the design lists them as automatic OS PRD upkeep after approval, not as questions.
- The generated PRD index breaks requirement 21 today (flat, nine-line header, "current" wording). Covered by the builder rewrite.
- The manual-versus-PRD gap is wider than the issue records (flat memory folder, old current.md path, spec-index name, five-bullet card, 8,000-character feedback cap). Covered by the manual rewrite; the design's "what changes" table cites r4 section 8.
- Trap for every drafter: issue comments c5 to c9 describe a twelve-sub-issue design deleted on 2026-09-09. Evidence of history only; never a source of current requirements.
- The PRD's folder layout does not exist on disk anywhere yet. The migration is real work in every equipped project.

## Rulings from the Codex report (r2-codex-capabilities.md, 2026-09-16; all Codex facts come from the source at commit 9771934 because the docs site is blocked here)

- [V2] resolved. Codex has twelve hook events with Claude Code's JSON key names: PreToolUse, PermissionRequest, PostToolUse, PreCompact, PostCompact, SessionStart, SessionEnd, UserPromptSubmit, SubagentStart, SubagentStop, Stop, Interrupt. One script per hook serves both harnesses.
- Write guard in Codex: PreToolUse fires for the file tool `apply_patch` with matcher aliases `Write` and `Edit`. Its input is one field, `command`, holding the whole patch text with no file list. Decision: the write guard script accepts either shape: Claude Code's `tool_input.file_path`, or a patch text from which it reads the `*** Update File:` and `*** Add File:` paths. The guard is enforced on both harnesses.
- No `if` and no `once` in Codex; both are ignored silently. Decision: every guard script does its own path and command filtering at the top and exits fast; the Claude Code `if` entries are an optimization, never the only filter. Cost in Codex: one short node process per tool call.
- Stop in Codex has no additionalContext; only `decision: block` with a reason, which forces the turn to continue, and no documented loop cap. Decision: in Codex the review nudge fires as a block at most once per session, when the changed-file threshold is crossed or an approved unfinished save sits in the inbox; the session-state file prevents a second one. Named as "weaker" in the Codex table. Flag for Mike: accept the one forced continuation, or leave Codex without the nudge.
- No path-scoped rules and nested AGENTS.md loads only along the path from the project root to the working directory. Decision: the six lines of `knowledge-files.md` and the standing rule both live in one "Knowledge system" section of the root AGENTS.md. Repo finding to fix in the build: two toolkit files say Codex never reads nested AGENTS.md; the current build does, along the working-directory path.
- Trust: Codex runs no hook until the person trusts it on that machine, per content hash, and an edited hook asks again; "continue without trusting" silently disables the startup map. Decision: knowledge-setup's report tells the owner to trust the hooks and says what "not trusted" looks like (no startup map). Build-time proof: whether plugin-declared hooks skip the trust prompt, and whether `codex exec` needs `--dangerously-bypass-hook-trust` for the setup proof run.
- SessionStart fires on startup, resume, clear, compact, and fork, and can add context; compaction re-renders AGENTS.md. Guidance after compaction is covered. Fix in the build: `.codex/hooks.json` and `.claude/settings.json` both omit `fork` from the SessionStart matcher.
- `additionalContextLimit` is a spill-to-disk threshold, not an allowance. Set it to 10,000 to match Claude Code's cap. One toolkit page describes it wrongly; fix in the build.
- PreCompact, PostCompact, SessionEnd, and Interrupt cannot add context in Codex; SessionEnd and Interrupt are capped at 3 seconds. The manual compaction hold in Codex is a build-time check (whether PreCompact can block there).
- Windows: Codex runs `commandWindows` through cmd.exe, not PowerShell. The shipped value is PowerShell syntax; fix in the build.
- `CODEX_PROJECT_DIR` does not exist; the fallback in two shipped hooks is dead code. Removed in the rewrite.
- Codex plugin manifests support a `hooks` key. Decision: prefer plugin-declared hooks for Codex as for Claude Code, with `.codex/hooks.json` as the fallback if plugin hooks do not run or do not skip the trust prompt. Build-time proof.
- Codex memory pipeline (`memories.generate_memories`, `memories.use_memories`): off for equipped projects, as ruled from r5. Where the setting lives is a build-time check.

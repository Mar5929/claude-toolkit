# Peer design sketch: the knowledge system on Claude Code and Codex

Written 2026-09-16 by the peer design lead. Independent of the main session's draft. Plain parts only: Markdown files, one rule file, seven hook scripts, four skills, three tools, and Git.

## Harness facts the design rests on

Claude Code (captured docs at `ai-external-knowledge/claude-code/`, 2026-09-04; live docs checked 2026-09-16 at 2.1.273):

- Hook handler types: `command`, `http`, `mcp_tool`, `prompt`, `agent` (hooks.md, "Hook handler fields"). No function hooks yet (GitHub issue anthropics/claude-code#91870, behind `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`, "weeks").
- Hook output is capped at 10,000 characters; more is written to a file and replaced by a preview (hooks.md, "JSON output").
- `SessionStart` plain stdout reaches the agent; matchers `startup`, `resume`, `clear`, `compact`, `fork` (hooks.md, "SessionStart"). Only `command` and `mcp_tool` hooks run there.
- `PreToolUse` can deny with a reason the agent reads; `if` narrows by permission-rule syntax such as `Bash(gh pr create *)` or `Edit(knowledge/memory/memory-entries/**)`; `if` is best-effort for Bash (hooks.md, "Common fields"). A timed-out hook does not block.
- `PostToolUse` can add `additionalContext` next to the tool result; it fires for the `Skill` tool like any other tool (hooks.md, "PostToolUse"; skills.md, "Restrict Claude's skill access").
- `Stop` receives `stop_hook_active` and `last_assistant_message`; `additionalContext` continues the turn as feedback, capped at 8 continuations (hooks.md, "Stop").
- `PreCompact` can block with exit 2; `manual` and `auto` matchers (hooks.md, "PreCompact").
- Unscoped `.claude/rules/*.md` load at start and are re-injected from disk after compaction; hook-added context is summarized away; a `SessionStart` hook with the `compact` matcher runs again (context-window.md, "What survives compaction"; memory.md, "Organize rules").
- Skill frontmatter: `description`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `hooks`, `paths` (skills.md, "Frontmatter reference"). Invoked skill bodies stay in context and are re-injected after compaction up to 5,000 tokens each.
- Plugins ship `hooks/hooks.json`, skills, and scripts under `${CLAUDE_PLUGIN_ROOT}`; `${CLAUDE_PLUGIN_DATA}` is a per-plugin folder outside the repository that survives updates (plugins-reference.md, "Hooks", "Persistent data directory"). Plugins cannot ship `.claude/rules/` files or `CLAUDE.md` lines.
- Hooks from settings and plugins also run inside subagents; subagents load CLAUDE.md and rules, except Explore and Plan (sub-agents.md, "What loads at startup").
- Auto memory is off with `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` or `autoMemoryEnabled: false` (memory.md, "Auto memory").

Codex (source tree `github.com/openai/codex/codex-rs/hooks/src/events/`, read 2026-09-16; the documentation site is blocked from this machine, so every line below is a build-time check):

- Events: `session_start`, `user_prompt_submit`, `pre_tool_use`, `post_tool_use`, `permission_request`, `compact`, `stop`, `session_end`, `interrupt`.
- Config in `.codex/hooks.json` and `~/.codex/hooks.json`; fields seen in this repository's own `.codex/hooks.json`: `matcher`, `type`, `command`, `commandWindows`, `timeout`, `additionalContextLimit`, `statusMessage`. Secondary sources add `async`, `if`, `once`.
- Secondary sources: hooks on by default since 0.150.1 (2026-08-27); each non-managed hook definition must be trusted once; `PreToolUse` covers the shell tool only; Windows support was off in early versions.
- Instructions: `AGENTS.md` at the root and nested. Skills: `.agents/skills/` in the project and the home folder; the repository already registers plugins for Codex in `.agents/plugins/marketplace.json`.

## The design, summarized

```text
Startup:   SessionStart hook prints SOUL.md, project.md, README.md (the short manual),
           current.md, inbox state lines, index pointers, plugin version.
Always:    one rule file (.claude/rules/knowledge-system.md) and the same text in AGENTS.md
           carry the standing obligations; they survive compaction.
On demand: four skills carry the procedures and templates; the agent invokes them by
           description or the owner asks in plain words.
Guards:    PreToolUse holds pull-request and item-close commands until the save skill ran;
           PreToolUse refuses hand edits to lasting knowledge until the save skill ran;
           PostToolUse runs the checker and index rebuild after every knowledge write;
           Stop prints one message when many files changed without a review.
Data:      Markdown under knowledge/, committed to the default branch by the agent
           under knowledge-direct-commit.md.
```

The agent does the thinking: relevance, search, classification, wording, the card. The parts above only deliver guidance at the moment it applies, refuse three specific mistakes, and check files.

## Parts

### A. Knowledge files (Markdown)

Layout as the PRD lines 142 to 173, with one change: no System Guide paths (the SG PRD owns them; the manual points at `.system-guide.json`).

| File | What it is | Written by | Approval |
| --- | --- | --- | --- |
| `SOUL.md` | Who the agent is here | Setup with the owner | Owner |
| `knowledge/project.md` | What the project is, resources, tracker, and the frontmatter setting `memory_approval: required` or `off` | Setup; agent on request | Owner |
| `knowledge/README.md` | The manual: a map under 4,000 characters. Sections: where each kind of information lives (the R18 table verbatim), the find order in five lines, the five save moments, the approval rule in three lines, the file list, and one line per skill. No templates, no field tables. Managed copy; checksum-tested | Toolkit | Not project knowledge |
| `knowledge/memory/current.md` | Working memory, R13 template, under 5,000 characters | Agent, no approval | None |
| `knowledge/memory-inbox.md` | Pending cards and unfinished saves, R28, one `##` heading per entry keyed by a stable reference | Agent, no approval | None |
| `knowledge/memory/memory-index.md`, `knowledge/prds/prd-index.md`, `ai-external-knowledge/README.md` | Generated indexes, R21 format | Tool | None |
| `knowledge/memory/memory-entries/**/*.md` | Memory topics and topic folders, R14 fields | Agent through the save skill | Card, or standing when `memory_approval: off` |
| `knowledge/memory/memory-entries/terminology-glossary.md` | R7 table | Agent through the save skill | Card |
| `knowledge/prds/**/*.md` | PRDs, R16 fields | Agent through the save skill | Card or recorded drafting permission or shipped-work upkeep |
| `knowledge/memory-selection-feedback.md` | R23 record: a table of date, candidate, outcome, owner's reason; cap 4,000 characters | Agent, no approval | None |
| `brainstorms/` | Raw exploration at the project root | Agent | None |

### B. The rule file and the root pointers

- `.claude/rules/knowledge-system.md` (about 25 lines, shipped from `project-init/library/rules/general/`; memory.md "Organize rules with `.claude/rules/`"). Contents: the project runs the knowledge system; the three startup files arrive from the hook and the agent confirms in one line on a new session only; before answering anything that rests on project knowledge decide once whether saved knowledge could change the answer, and if yes look it up by the manual's find order and put the source path on the line under each finding; the five save moments and the skill that runs them; never write under `memory-entries/` or `prds/` except through that skill; `current.md` and the inbox are the agent's to keep; a helper agent reports candidates and never writes knowledge; when context was condensed, reuse what is still present and reopen the manual before a knowledge operation.
- `CLAUDE.md` keeps the one-line pointer `project-init` already writes. `AGENTS.md` carries the rule text itself, because Codex does not load `.claude/rules/`.
- Enforces: nothing. Reminds: always, including after compaction (re-injected from disk) and inside subagents. Cost: about 1,500 characters in every session.

### C. Hooks (plugin `hooks/hooks.json`; the same scripts registered in the project's `.codex/hooks.json`)

All hooks are `type: "command"`, exec form (`"command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/<name>.mjs"]`), fail open on any error, and write only under the session-state folder (part G) or generated indexes.

**H1. `knowledge-start.mjs`, `SessionStart`, matcher `startup|resume|clear|compact|fork`.** Prints, in order: one line `Knowledge system <plugin version>, session source <source>`; `SOUL.md`, `knowledge/project.md`, `knowledge/README.md` whole; `knowledge/memory/current.md` whole; the inbox entries' heading and state lines only; the two index files' entry lines when each is under 1,500 characters, else the path; the glossary whole when under 2,000 characters, else the path; `System Guide is not configured` when `.system-guide.json` is absent or off. A total budget of 9,000 characters is enforced in this order: when the budget would be exceeded, later parts are replaced by their path and one line says so. A missing file prints `[missing: <path>]`. On `compact`, `resume`, and `fork` it prints the same, so the map returns after context loss (R2 line 484). Doc: hooks.md "SessionStart", "Add context for Claude". Enforces nothing. Cost: 5,000 to 9,000 characters once per start, resume, clear, or compaction.

**H2. `save-moment-gate.mjs`, `PreToolUse`, matcher `Bash|PowerShell`, `if` entries `Bash(gh pr create *)`, `Bash(gh issue close *)`, `Bash(work finish *)` (and the PowerShell forms).** Reads the session-state file. If the save skill was invoked in this session after the current branch's last commit (marker from H4, compared with `git log -1 --format=%ct`), allow. Otherwise deny with one reason: "This command is a save moment. Invoke the knowledge-save skill, finish it, then run the command again." Doc: hooks.md "PreToolUse decision control", "Common fields" (`if`). Enforces: the skill was invoked after the last commit. Does not enforce: that the review was good. Gap: a Bash command the `if` cannot parse still runs the hook (best-effort matching), and `gh pr merge` is not covered (Mike's 2026-09-03 guard set). Cost: zero unless it denies (about 200 characters).

**H3. `knowledge-write-guard.mjs`, `PreToolUse`, matcher `Edit|Write|NotebookEdit`, `if` entries `Edit(knowledge/memory/memory-entries/**)`, `Write(knowledge/memory/memory-entries/**)`, `Edit(knowledge/prds/**)`, `Write(knowledge/prds/**)`.** Denies unless the save skill was invoked in this session (H4 marker). Reason: "Lasting knowledge is written through the knowledge-save skill, which carries the approval and file rules. Invoke it first." Doc: hooks.md "PreToolUse input" (absolute `file_path`), "Common fields". Enforces: no hand edit to lasting files before the skill's rules are in context. Does not enforce: approval (a hook cannot see it) or edits made through Bash (`sed`, heredocs); that gap is named in the setup report. Cost: zero unless it denies.

**H4. `skill-marker.mjs`, `PostToolUse`, matcher `Skill`.** When `tool_input.skill` is `knowledge-save` (or its plugin-prefixed name), writes `{ "save_skill_at": <epoch>, "branch": <branch> }` into the session-state file. Doc: hooks.md "PostToolUse input". Enforces nothing itself; it is the evidence H2 and H3 read. Cost: zero.

**H5. `knowledge-after-write.mjs`, `PostToolUse`, matcher `Edit|Write|NotebookEdit`, `if` `Edit(knowledge/**)` and `Write(knowledge/**)` (and `ai-external-knowledge/**`).** Runs the checker on the written file and, when the file is under `memory-entries/`, `prds/`, or an `ai-external-knowledge` topic, rebuilds the affected index. Returns `additionalContext` only on a failure: the file, the rule it broke, and "the save is unfinished until this passes" (R21 line 1470). Doc: hooks.md "PostToolUse decision control". Enforces: every knowledge write is checked and the index follows, without the agent remembering to run anything. Cost: zero on a clean write; about 300 characters on a failure.

**H6. `session-change-check.mjs`, `Stop`.** Exits silent when `stop_hook_active` is true. Keeps a baseline in the session-state file (HEAD and dirty paths at the first Stop). On later Stops counts files changed since the last H4 marker, ignoring `knowledge/` and the state folder. When the count crosses a constant (10), returns `additionalContext` once: "<n> files changed since the last knowledge review. This is a save moment under the manual; invoke knowledge-save or say why not." It also prints one message per session when the inbox holds an entry in state `approved, save unfinished`. Doc: hooks.md "Stop decision control" (`additionalContext` is feedback, loop-protected). Enforces nothing; it raises the R9 "real work was done" moment that no owner words or command announces (Mike, 2026-09-03). Cost: one `git status` per turn; about 250 characters when it prints.

**H7. `compact-hold.mjs`, `PreCompact`, matcher `manual`.** Holds `/compact` once per session with the stderr message "A context clear is a save moment. Refresh current.md and run the knowledge review, then compact again." Never registered for `auto` (blocking a recovery compaction fails the request). Doc: hooks.md "PreCompact". Enforces: one hold per session. `/clear` cannot be held (SessionEnd has no decision control); the `offer-context-handoff` rule and `/handoff` skill cover the deliberate case. Cost: zero unless it holds.

No `UserPromptSubmit` hook. The every-prompt reminder is removed (Mike, 2026-09-02, item 7); the rule file and skill descriptions already place "remember this" and "save this" in the agent's context.

### D. Skills (plugin `skills/`; copied to `.agents/skills/` for Codex by setup)

Each skill body is short and points to `references/` files the agent opens when the step needs them (skills.md "Add supporting files"; progressive disclosure). All four are model-invocable and user-invocable, so R24's plain-language requests reach them by description.

- **`knowledge-find`** (replaces `recall` and `session-search`). Description names: picking up work, a question about a decision or required behavior, troubleshooting, before a multi-step procedure. Body: the R19 tiers with the notes on what each source is for, the glossary step, the R6 citation shape, the R16 tie-break, the R8 index scan, and the history search command (`scripts/search-sessions.mjs`, read-only, Claude Code history only; Codex history reported as unavailable). Enforces nothing.
- **`knowledge-save`** (replaces `remember`, `retire`, and the write half of `reflect`). Description names: remember, save, write this down, a fixed problem, before a pull request, before a handoff, a finished work item, a shipped change, something out of date or duplicated. Body: gather candidates since the last review; drop by R11 and R12 and the feedback file; route by the R18 table; check existing files and the inbox; decide the approval path (card, recorded drafting permission, shipped-work upkeep, or `memory_approval: off`); show cards in the R20 shape (`references/card-format.md`); on approval write with the templates (`references/memory-file.md`, `references/prd-file.md`, `references/glossary-row.md`, `references/inbox-entry.md`, `references/lifecycle.md` for update, supersede, retire, merge, delete); read back; rely on H5 for the check and rebuild, and run the tools by hand when H5 did not fire (Codex); commit and push under `knowledge-direct-commit.md`; update the inbox and the feedback file; report in one line or stay quiet as R9 and R16 say. Enforces nothing by itself; H2 and H3 make it the only allowed way to write those files.
- **`knowledge-review`** (replaces the folder-wide half of `reflect`). Whole-folder review on request or after a migration: duplicates, conflicts, retirement candidates, feedback consolidation. Proposes through `knowledge-save`.
- **`knowledge-setup`** (replaces `second-brain`). Detect, equip, migrate to the layout, repair, explain, and report `equipped` with the version. Runs the delivery proof in part I.

Cost: four descriptions, about 1,200 characters, in every session; a body of 3,000 to 6,000 characters only when invoked.

### E. Tools (plugin `tools/`, run as `node "${CLAUDE_PLUGIN_ROOT}/tools/<name>.mjs"`)

- `build-knowledge-index.mjs`: memory, PRD, and outside-documentation indexes; groups by `group`, groups and files sorted alphabetically, topic folders kept under one heading, child PRDs indented under the parent, glossary and inbox excluded, status labels for non-current memory and non-finalized PRDs. Same input gives the same bytes.
- `check-knowledge.mjs`: R14 and R16 fields and values, `updated_at` and `context` required, `memory_approval: off` accepted with the R14 recommended `approved_by` value, summary under 200, `current.md` under 5,000, feedback file under 4,000, links resolve, secrets, inbox not indexed. Read-only; exit 1 with file and rule.
- `frontmatter.mjs`: shared parser.

Projects keep no copies. This repository's `CLAUDE.md` rows change from `.claude/tools/...` to the plugin path or a skill.

### F. Settings

Project `.claude/settings.json`: `enabledPlugins: {"second-brain@claude-toolkit": true}`, `autoMemoryEnabled: false` (memory.md), no hook entries. The approval setting is not here; it is in `knowledge/project.md` frontmatter so both harnesses read it.

### G. Session state (the "few session facts")

One JSON file per session under `${CLAUDE_PLUGIN_DATA}/sessions/<session_id>.json` on Claude Code (plugins-reference.md "Persistent data directory"), or `~/.claude-toolkit/knowledge-sessions/<session_id>.json` on Codex. Holds: `save_skill_at`, `branch`, `stop_baseline`, `nudged_at_count`, `compact_held`, `inbox_nudged`. Never in the repository, never project knowledge (R29 "Data boundaries"). Deleted by H1 when older than 30 days. When function hooks ship, this file is the one thing they replace.

### H. Codex delivery

| Part | Codex mechanism | Status |
| --- | --- | --- |
| Startup map (H1) | `.codex/hooks.json` `SessionStart`, `additionalContextLimit` 9000 | Already works today for the current loader |
| Standing obligations | `AGENTS.md` text | Works; Codex reads AGENTS.md at start |
| Skills | `.agents/skills/<name>/SKILL.md` copies or the Codex plugin from `.agents/plugins/marketplace.json` | Check which the installed Codex supports |
| H2 command gate | `PreToolUse` on the shell tool | Reported available; verify `if` and matcher names |
| H3 write guard | `PreToolUse` on the patch tool | Likely not available (shell-only PreToolUse reported); report as a gap |
| H4 skill marker | `PostToolUse` | Codex has no `Skill` tool; the save skill instead writes the marker itself through a one-line `node` command in its body. Weaker: it proves the command ran, not that the skill body was read |
| H5 checker after write | `PostToolUse` | Unknown for patch writes; the save skill runs the tools by hand as its last step |
| H6 Stop nudge | `stop` event with `decision`/`additionalContext` | Reported available |
| H7 compact hold | `compact` event | Reported available; verify manual versus auto |

Every "verify" line is a build-time proof and a line in the setup report (R25 line 1592).

### I. Setup and the delivery proof (`knowledge-setup`, `project-init`, `project-sync`)

One approved step: enable the plugin at project scope, write the rule file, `AGENTS.md` text, `.codex/hooks.json`, settings, the knowledge files, and `.agents/skills/` copies; migrate the old layout with link repair; run the tools. Proof: `claude --init-only --debug-file <path>` and read the log for the H1 output ending in its last expected line with no "Persisted tool result" notice (hooks.md "Setup"); `claude plugin list --json` shows the version; a two-turn `claude -p` run shows H2 denying once and allowing after the skill ran. The report says `equipped <version>`, or names the failed check and the Codex gaps.

## Options where two designs are reasonable

1. **Startup reads.** Option A (recommended): H1 prints the three files whole and the manual is kept under 4,000 characters. Option B: H1 prints a directive and the agent makes three `Read` calls, checked by a PostToolUse counter that blocks the confirmation. B proves tool calls, costs three tool turns per session, and still cannot prove reading. A needs the manual refactor, which the design has to do anyway for the 10,000 cap.
2. **The command gate.** Option A (recommended): hold until the save skill ran after the last commit (H2 with H4). Option B: hold once per branch (today). B is cheaper and was bypassed in an audited session (issue 269, item 3); A costs one marker file.
3. **The write guard.** Option A (recommended): H3 as above. Option B: no guard; rely on the rule and H5. B leaves hand-written memory as the failure most likely to damage trust; A costs nothing when the skill is used.
4. **Manual versus rule.** Option A (recommended): a short manual delivered by H1 plus a 25-line rule file. Option B: manual only, no rule. B loses the standing obligations after compaction until H1 runs on the `compact` source, which it does; so B is workable. A is chosen because memory.md says static instructions belong in rules and because helpers load rules but never see hook output from the parent.
5. **Inbox write timing.** Option A (recommended): write the entry locally in the reply that shows the card; push at the next push or handoff. Option B: write only when the owner's next message does not answer. B loses the card when the session dies first.

## What is refactored or dropped, and why

| Current part | Action | Why |
| --- | --- | --- |
| `hooks/memory-reminder.mjs` (`UserPromptSubmit`) | Drop | Every-prompt noise; contradicts R11 on fixes; Mike approved removal 2026-09-02 |
| `hooks/save-reminder.mjs`, `hooks/work-item-close.mjs` | Replace with H2 and H4 | One gate, one evidence file; the once-per-branch hold was bypassed |
| `hooks/knowledge-session-start.mjs` | Rewrite as H1 | Wrong order, no budget, no compact mode, no inbox, no version line |
| `hooks/command-parsing.mjs` | Keep as a shared helper for H2 | The `if` filter is best-effort; the parser confirms the segment |
| Skills `recall`, `session-search` | Merge into `knowledge-find` | One find procedure; the script becomes a reference script |
| Skills `remember`, `retire`, half of `reflect` | Merge into `knowledge-save` | They share the card, approval, checker, and push steps |
| Skill `reflect` (folder review) | Rename `knowledge-review` | Clear plain name |
| Skill `second-brain` | Rename `knowledge-setup`; add layout migration and the delivery proof | R27 |
| `remember/references/proposal-template.md` | Replace with `card-format.md` | R20 shape |
| `knowledge/README.md` template | Rewrite as the short map; keep the managed-copy checksum | 10,000-character cap; R2 line 484 |
| `knowledge/memory-self-improvement.md` | Rename `memory-selection-feedback.md`, cap 4,000 | R23; plain name |
| `tools/*.mjs` copies in `.claude/tools/` | Remove from projects; run from the plugin | Drift; R27 |
| Copied hooks in `.claude/hooks/` and hook entries in project settings | Remove; plugin `hooks.json` | R27; 2026-09-02 approval |
| `.claude/settings.json` env `CLAUDE_CODE_DISABLE_AUTO_MEMORY` | Keep, or switch to `autoMemoryEnabled: false` | Both documented |

## Per-requirement table

| Req | Part(s) | Enforced or guided | What could still go wrong |
| --- | --- | --- | --- |
| 1 Plain parts | A, C, D, E | Enforced by construction | Someone adds a service later; the design names the five parts and nothing else |
| 2 Follows the system | H1, B, D | Guided; delivery of the three files enforced by H1 and the proof | The agent skips the confirmation or ignores the map; visible in R3 tests |
| 3 Reliable behavior | H1 to H7, I | Enforced: startup delivery, gate, write guard, checker. Guided: lookups, per-turn review | A quiet review cannot be observed; the setup report says so |
| 4 Picks up | A (`current.md`), H1, `knowledge-find` | Guided | Stale `current.md`; H6 nudges only on file changes, not on stale text |
| 5 Check memory first | B, `knowledge-find` | Guided | The agent decides "no" wrongly; no checker for judgment by design (R29) |
| 6 Cite the source | B, `knowledge-find` | Guided | Missing citation lines; caught only by reading the answer |
| 7 Glossary | A, H1, `knowledge-save` | Guided; glossary delivered at start when small | A large glossary is only a path; the agent must open it |
| 8 Outside documentation | A (generated index), H1 pointer, `knowledge-find`, H5 rebuild | Index format enforced by tool; use guided | Capture dates ignored; the `ai-external-knowledge.md` rule still applies |
| 9 Frictionless saving | `knowledge-save`, H2, H6, H7, direct-commit rule | Four moments enforced or nudged (H2, H6, H7, owner words by description); per-turn review guided | A push that fails; the skill reports it and the inbox keeps the save |
| 10 Approval | `knowledge-save`, H3, `project.md` setting | The write path is enforced (H3); approval itself is guided | The agent writes with a card the owner never answered; the read-back and the inbox rules reduce it; not provable by a hook |
| 11 What counts | `knowledge-save`, feedback file | Guided | Over-proposing; R23 feedback corrects it over time |
| 12 What never counts | `knowledge-save`, checker secrets scan | Secrets enforced; the rest guided | A secret in a shape the scan misses |
| 13 Working memory | A, B, H1, checker size | Size enforced; upkeep guided; sharing by push | Two sessions overwrite each other; the direct-commit rule's fetch step and "reread before writing" guide it |
| 14 File shape | Checker, H5, templates | Enforced | `approved_by` value when approval is off needs Mike's answer |
| 15 Words | `knowledge-save` (style pointer), Plain English style | Guided | Jargon in a saved file; the read-back step is the only check |
| 16 PRDs | Checker fields, `knowledge-save` upkeep branch, tracker close event | Fields enforced; upkeep guided; trigger guided by the item-close hold (H2) | "Shipped" mis-detected; the design uses item close and PR merge only |
| 17 Procedures to skills | `knowledge-save` routing | Guided | No skill-authoring process exists to hand to; named dependency |
| 18 Where information goes | Manual table, `knowledge-save` | Guided | Wrong home; the card names the home so the owner sees it |
| 19 Find order | `knowledge-find` | Guided | Skipped tiers; by design no scorer |
| 20 Save card | `card-format.md` | Guided | Shape drift; a card review in R3 tests |
| 21 Indexes and checker | E, H5 | Enforced on Claude Code; guided on Codex | Codex writes without H5; the skill runs the tools by hand |
| 22 Cleanup | `knowledge-save` lifecycle reference, `knowledge-review` | Guided | Missed duplicates; the review is on request only |
| 23 Learning | Feedback file, `knowledge-save` step | Guided; size enforced | Invented reasons; the template has "no reason given" |
| 24 Plain-language requests | Skill descriptions | Guided (harness matching) | A description too weak to trigger; `/skill-doctor` shows unused skills |
| 25 Codex | H, I report | Enforced where Codex has the event; gaps reported | Docs unverified; every row is a build proof |
| 26 Built as documented | Each part names its page above | Enforced by review | Docs move; refresh the capture before build |
| 27 Installed once, per project | F, I | Enforced by the proof | Old copies left in a project; `project-sync` removes them after the proof |
| 28 Inbox | A, `knowledge-save`, H1 state lines, H6 nudge | Guided; delivery of state enforced by H1 | Entry never written; option 5A limits the window to one reply |
| 29 Narrow safeguards | H2, H3, H5 only refuse; H1, H6, H7 only print text | Enforced by the design's own limits | Someone adds a scorer or renderer; this table is the record |
| 30 OS integration | H2 on item close, tracker links in `current.md`, PRD upkeep branch | Guided; item-close hold enforced | The tracker's completion event changes shape; the `if` patterns are the only coupling |

## Named limits

- A hook cannot see approval. Only the agent can. The write guard makes the skill's rules present at the moment of writing; it does not prove a yes.
- The command gate proves a skill invocation after the last commit, not a good review. A session that invokes the skill and writes nothing passes.
- Bash edits to knowledge files bypass H3 and H5. `FileChanged` could catch them after the fact but cannot block; not added until it is needed (R29).
- `/clear` cannot be held. Auto-compaction is not held.
- Codex: the write guard and the post-write checker may not exist; the skill runs the tools by hand and the setup report says so.
- Function hooks: when shipped and documented, the session-state file (part G) and the three `PreToolUse`/`PostToolUse` scripts (H2, H3, H4) are the parts to move in-process. Nothing else changes.

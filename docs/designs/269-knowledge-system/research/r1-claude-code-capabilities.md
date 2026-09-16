# Claude Code mechanisms for guiding and checking an agent

Written 2026-09-16. For a solution design of a project knowledge system: Markdown
files in Git, saved only with the owner's approval.

## How to read the sources

Two kinds of citation appear below.

- A repo path plus line numbers, like `ai-external-knowledge/claude-code/hooks.md:417`.
  That is the copy of the official docs captured in this repository on 2026-09-04.
  Paths are relative to `/home/user/claude-toolkit/`.
- A URL plus a date. Every URL was fetched on 2026-09-16.

I downloaded the live Markdown of each page and compared it line by line against
the captured copy. Where the two agree, I cite the repo file, because you can open
it. Where they differ, or where only the live page has the fact, I cite the URL.
Section 3 lists every difference that matters.

Two words are used strictly:

- **ENFORCED** means the Claude Code program does it. The model cannot skip it.
- **REMINDED** means text is put in front of the model. The model may ignore it.

---

# Section 1. Mechanism table

| Mechanism | What it does | When it runs or loads | What it can return, add, or block | State it can keep | Context cost | Source |
| --- | --- | --- | --- | --- | --- | --- |
| **Project CLAUDE.md** (`./CLAUDE.md` or `./.claude/CLAUDE.md`) | Holds standing instructions for the project. | At session start, and re-injected from disk after compaction. | Adds text only. Blocks nothing. REMINDED. | None. It is a file you edit. | Full file text, in every request. Aim for under 200 lines. Claude Code skips a file over 4 MiB. | `ai-external-knowledge/claude-code/memory.md:57-66`, `:84`, `:408`; `ai-external-knowledge/claude-code/context-window.md:1604` |
| **Other CLAUDE.md scopes**: managed policy, `~/.claude/CLAUDE.md`, `./CLAUDE.local.md` | Same, at organization, per-user, and private-per-project scope. | Session start. Load order is managed, then user, then project, then local. | Adds text only. REMINDED. | None. | Same as above, per file. | `ai-external-knowledge/claude-code/memory.md:57-66`, `:156-160` |
| **Folder CLAUDE.md** (a `CLAUDE.md` in a subdirectory) | Instructions for one part of the tree. | Not at launch. Loads the first time Claude reads a file in that subdirectory. After compaction it reloads only when Claude reads such a file again. | Adds text only. REMINDED. | None. | Zero until it triggers. | `ai-external-knowledge/claude-code/memory.md:162`, `:465`; `context-window.md:1608` |
| **`@path` import inside a CLAUDE.md** | Pulls another file into the CLAUDE.md. Up to four hops deep. | At launch, with the file that imports it. Saves no context: the imported file is expanded inline. | Adds text only. REMINDED. | None. | Same as writing the text in the file. | `ai-external-knowledge/claude-code/memory.md:96-102`, `:459` |
| **`.claude/rules/*.md` with no `paths:`** | Topic files loaded with the same priority as `.claude/CLAUDE.md`. All `.md` files found recursively. | Session start. Re-injected from disk after compaction. | Adds text only. REMINDED. | None. | Full text of every unscoped rule, in every request. | `ai-external-knowledge/claude-code/memory.md:180-204`; `context-window.md:1604` |
| **`.claude/rules/*.md` with `paths:` (path-scoped rule)** | Same, but gated to files matching glob patterns. `paths` is the only documented rule frontmatter field. | Loads when Claude reads a file matching a pattern, not on every tool call. After compaction it reloads only when a matching file is read again. | Adds text only. REMINDED. | None. | Zero until a matching file is read. | `ai-external-knowledge/claude-code/memory.md:206-249`, `:465`; `context-window.md:1607` |
| **`~/.claude/rules/`** | Personal rules for every project on the machine. Loaded before project rules, so project rules win. | Session start. | Adds text only. REMINDED. | None. | Same as project rules. | `ai-external-knowledge/claude-code/memory.md:262-272` |
| **`claudeMdExcludes` setting** | Skips named CLAUDE.md or rule files by glob against the absolute path. Managed policy CLAUDE.md cannot be excluded. | At load time. | Removes files from context. ENFORCED. | None. | Negative: it removes cost. | `ai-external-knowledge/claude-code/memory.md:324-343` |
| **Auto memory** | Notes Claude writes about you and the project, in `~/.claude/projects/<project>/memory/`. Types: `user`, `feedback`, `project`, `reference`. | The first 200 lines or 25 KB of `MEMORY.md`, whichever comes first, load at session start. Topic files load only when Claude reads them. Re-injected from disk after compaction. | Adds text only. REMINDED. Claude writes the files itself, with no approval step. | Yes. Plain Markdown files on disk, per repository, shared across worktrees, machine-local. | Up to 25 KB of `MEMORY.md` per request. | `ai-external-knowledge/claude-code/memory.md:345-416`; `context-window.md:1605` |
| **`CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`** | Turns auto memory off for one session. Outranks the `autoMemoryEnabled` setting, in either direction. | Set before launch. | Stops all auto-memory reads and writes. ENFORCED. | None. | Removes the auto-memory cost. | `ai-external-knowledge/claude-code/memory.md:368`; https://code.claude.com/docs/en/settings-reference (`autoMemoryEnabled`), fetched 2026-09-16 |
| **`autoMemoryEnabled` / `autoMemoryDirectory` settings** | Turn auto memory off per project, or move its directory. The directory must be absolute or start with `~/`. | Read from any settings scope. | ENFORCED. | Moves where the state lives. | Same. | `ai-external-knowledge/claude-code/memory.md:358-384` |
| **Skill (`SKILL.md`)** | A named bundle of instructions, plus optional supporting files and scripts. | Its name and description load at session start. Its body loads only when you type `/name` or Claude calls the Skill tool. | Adds text to the conversation. A skill body cannot block anything by itself. REMINDED. Its `hooks` field can add ENFORCED behavior. | Only through scripts it runs, or hooks it registers. The body itself keeps nothing. | Description in every request, capped per skill at 1,536 characters and across all skills at 1% of the context window by default. Body only after invocation, and then it stays across turns. | `ai-external-knowledge/claude-code/skills.md:337-358`, `:505-524`, `:1053-1061` |
| **Skill frontmatter: `name`** | Display label. For a personal or project skill the command still comes from the directory name. For a plugin skill it sets the last segment of the command. | — | — | — | — | `ai-external-knowledge/claude-code/skills.md:339`, `:379-397` |
| **Skill frontmatter: `description`, `when_to_use`** | What Claude matches a request against. `when_to_use` is appended to `description`. Combined text capped at 1,536 characters. | Session start. | — | — | This is the per-turn cost of the skill. | `ai-external-knowledge/claude-code/skills.md:340-341` |
| **Skill frontmatter: `paths`** | Glob patterns. Claude loads the skill on its own only when working with matching files. Same glob format as path-scoped rules. | On a matching file. | — | — | Keeps the skill out of Claude's consideration until it matches. | `ai-external-knowledge/claude-code/skills.md:354` |
| **Skill frontmatter: `disable-model-invocation: true`** | Only you can invoke it. Removes the skill from Claude's listing entirely. Also stops it being preloaded into subagents, and stops a scheduled task from running it. | — | Claude Code blocks Claude's call if it tries. ENFORCED. | — | Zero until you invoke it. | `ai-external-knowledge/claude-code/skills.md:344`, `:477-511` |
| **Skill frontmatter: `user-invocable: false`** | Only Claude can invoke it. Hidden from the `/` menu. | — | ENFORCED. | — | Description still loads every turn. | `ai-external-knowledge/claude-code/skills.md:345`, `:506-511` |
| **Skill frontmatter: `context: fork`** (with `agent`, `background`) | Runs the skill body as the prompt of a subagent, in its own context window. Default is background; `background: false` waits in the same turn. | On invocation. | Returns the subagent's result to the conversation. | The subagent's own context, discarded at the end. | Body does not enter your context. Only the result does. | `ai-external-knowledge/claude-code/skills.md:350-352`, `:681-709` |
| **Skill frontmatter: `hooks`** | Registers hooks, in the same JSON shape as a settings file. Registered when the skill is invoked and kept for the rest of the session. `once: true` removes a hook after its first successful run. | On invocation. | Everything a settings-file hook can do. ENFORCED. | Same as any hook. | The hook config itself costs nothing. | `ai-external-knowledge/claude-code/skills.md:353`; `ai-external-knowledge/claude-code/hooks.md:263`, `:433`, `:663-691` |
| **Skill frontmatter: `allowed-tools` / `disallowed-tools`** | Pre-approves or removes tools, for the turn that invoked the skill only. The grant clears when you send your next message. | On invocation. | ENFORCED, but `allowed-tools` cannot beat a deny rule. | None. | None. | `ai-external-knowledge/claude-code/skills.md:346-347`, `:526-543` |
| **Skill frontmatter: `model`, `effort`, `argument-hint`, `arguments`, `shell`, `metadata`, `license`, `compatibility`** | Model and effort for the turn; autocomplete hint; named positional arguments; shell for `!` commands; free-form map Claude Code ignores; two Agent Skills spec fields Claude Code accepts but does not act on. | On invocation. | — | — | — | `ai-external-knowledge/claude-code/skills.md:342-343`, `:348-349`, `:355-358` |
| **Skill body: dynamic context injection** (`` !`command` `` and ` ```! ` blocks) | Runs shell commands and substitutes their output into the body before Claude sees it. | Every time the skill is invoked, before the body is delivered. | Puts live data in front of Claude. A failed command aborts the whole invocation, so Claude sees nothing. | The command can read and write files, so it can carry state. | Whatever the command prints. | `ai-external-knowledge/claude-code/skills.md:601-679` |
| **Slash command file** (`.claude/commands/name.md`) | The older format. Same frontmatter as a skill except `name` and `paths`, which are ignored. Invoked by file name. A skill with the same name wins. | On invocation. | Same as a skill. | None. | Same as a skill. | `ai-external-knowledge/claude-code/skills.md:19`, `:172-174`, `:133-134` |
| **Subagent** (`.claude/agents/*.md`) | A separate agent with its own system prompt, tools, model, and context window. | When Claude or you spawn it. | Returns a report to the main conversation. | Optional `memory` field gives it its own auto-memory directory. | Isolated from the main session. Only the result comes back. | `ai-external-knowledge/claude-code/sub-agents.md:289-311`, `:1026-1049` |
| **Subagent frontmatter (main fields)** | `name`, `description` (both required), `tools`, `disallowedTools`, `model`, `permissionMode`, `maxTurns`, `skills` (preloads full skill bodies), `mcpServers`, `hooks`, `memory`, `background`, `effort`, `isolation`, `color`, `initialPrompt`, `experimental`. Live docs add `omitClaudeMd`. | At spawn. | `hooks` here run only while the subagent runs, and a `Stop` hook becomes `SubagentStop`. | `memory` field. | — | `ai-external-knowledge/claude-code/sub-agents.md:293-311`; `ai-external-knowledge/claude-code/hooks.md:667`; https://code.claude.com/docs/en/sub-agents, fetched 2026-09-16 |
| **What a subagent starts with** | Its own system prompt, the delegation message, every level of the CLAUDE.md hierarchy including project rules, git status, and any preloaded skills. Explore and Plan skip CLAUDE.md and git status. The main session's auto memory and output style never reach it. | At spawn. | — | — | — | `ai-external-knowledge/claude-code/sub-agents.md:1032-1049` |
| **Hook: `SessionStart`** | Runs when a session begins, resumes, is cleared, is compacted, or is forked. Matchers: `startup`, `resume`, `clear`, `compact`, `fork`. Only `command` and `mcp_tool` handlers. | Once per session start of any of those kinds. | Plain stdout is added to Claude's context. JSON can return `additionalContext`, `initialUserMessage`, `sessionTitle`, `watchPaths`, `reloadSkills`. Cannot block. Delivery of the text is ENFORCED; acting on it is REMINDED. | Can write `export` lines to `$CLAUDE_ENV_FILE`, and can write any file on disk. | Whatever text it returns, once, at the top of the conversation. | `ai-external-knowledge/claude-code/hooks.md:1092-1223` |
| **Hook: `Setup`** | Only on `--init-only`, or `--init` / `--maintenance` with `-p`. Not on normal startup. | Explicit CLI flag. | No decision control. All JSON output is discarded. | `$CLAUDE_ENV_FILE`. | Zero. | `ai-external-knowledge/claude-code/hooks.md:1225-1262` |
| **Hook: `InstructionsLoaded`** | Fires when a CLAUDE.md or a `.claude/rules/*.md` file is loaded. Input carries `file_path`, `memory_type`, `load_reason` (`session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact`), `globs`, `trigger_file_path`, `parent_file_path`. Runs asynchronously. | Session start and every lazy load. | Nothing. All JSON output discarded. Audit only. | Can write a log file. | Zero. | `ai-external-knowledge/claude-code/hooks.md:1264-1297` |
| **Hook: `UserPromptSubmit`** | Fires on every prompt you send, before Claude sees it. Default timeout 30 seconds, and a stuck hook stalls the session. | Once per turn you start. | `decision: "block"` erases the prompt. `additionalContext` and plain stdout are added beside the prompt. `sessionTitle`, `suppressOriginalPrompt`. It cannot rewrite the prompt. Blocking is ENFORCED. | Files on disk. | Whatever text it adds, every turn. | `ai-external-knowledge/claude-code/hooks.md:1299-1359` |
| **Hook: `UserPromptExpansion`** | Fires when a typed `/command` expands, before it reaches Claude. Matches on `command_name`. Covers the path `PreToolUse` misses. | When you type a slash command. | `decision: "block"` stops the expansion. `additionalContext`. ENFORCED. | Files on disk. | Only what it adds. | `ai-external-knowledge/claude-code/hooks.md:1361-1398` |
| **Hook: `PreToolUse`** | Fires before a tool call runs. Matches on tool name. Optional `if` filter on tool name plus arguments. | Every tool call except `EndConversation`. Not for files you attach with `@`. | `hookSpecificOutput.permissionDecision`: `allow`, `deny`, `ask`, or `defer`. `permissionDecisionReason`. `updatedInput` replaces the whole input object. `additionalContext`. Exit code 2 denies. Precedence across hooks: `deny` > `defer` > `ask` > `allow`. ENFORCED, and a deny holds even in `bypassPermissions`. | Files on disk, plus whatever the handler process keeps. | Zero unless it returns text. | `ai-external-knowledge/claude-code/hooks.md:1543-1822`; https://code.claude.com/docs/en/hooks-guide (Hooks and permission modes), fetched 2026-09-16 |
| **Hook: `PermissionRequest`** | Fires when Claude Code is about to ask you for permission. | On a permission prompt. | `hookSpecificOutput.decision.behavior`: `allow` or `deny`, with an optional `updatedInput`. Exit 2 is ignored on this event. ENFORCED. | Files on disk. | Zero. | `ai-external-knowledge/claude-code/hooks.md:1824-1922`, `:858` |
| **Hook: `PostToolUse`** | Fires after a tool call succeeds. Same matcher values as `PreToolUse`. Input has `tool_input`, `tool_response`, `tool_use_id`, `duration_ms`. | Every successful tool call. | `decision: "block"` puts `reason` beside the result. `additionalContext`. `updatedToolOutput` replaces what Claude sees. `classifierContext`. Cannot undo the action. | Files on disk. | Only what it returns. | `ai-external-knowledge/claude-code/hooks.md:1924-2029` |
| **Hook: `PostToolUseFailure`** | Same, for a tool that failed. | On tool failure. | Same shape as `PostToolUse`. Exit 2 shows stderr to Claude. | Files on disk. | Only what it returns. | `ai-external-knowledge/claude-code/hooks.md:2031-2091` |
| **Hook: `PostToolBatch`** | Fires after a whole batch of parallel tool calls resolves, before the next model call. No matcher. | Once per batch. | `decision: "block"` stops the agentic loop. ENFORCED. | Files on disk. | Only what it returns. | `ai-external-knowledge/claude-code/hooks.md:2093-2148`, `:870` |
| **Hook: `Stop`** | Fires when the main agent finishes responding. Not on a user interrupt; an API error fires `StopFailure` instead. No matcher. | Once per turn. | `decision: "block"` plus a required `reason` keeps Claude working. `hookSpecificOutput.additionalContext` does the same but is labelled feedback rather than an error. Claude Code ends the turn after 8 consecutive blocks. ENFORCED. | Files on disk. Input gives `session_id`, `transcript_path`, `last_assistant_message`, `stop_hook_active`, `background_tasks`, `session_crons`. | Only what it returns. | `ai-external-knowledge/claude-code/hooks.md:2465-2565` |
| **Hook: `SubagentStop`** | Same, when a subagent finishes. Matches on agent type. | Per subagent. | Same fields as `Stop`. | Same. | Isolated. | `ai-external-knowledge/claude-code/hooks.md:2326-2353`, `:862` |
| **Hook: `PreCompact` / `PostCompact`** | Before and after compaction. Matchers `manual` and `auto`. | On compaction. | `PreCompact` can block with exit 2 or `decision: "block"`. `PostCompact` has no decision control and receives `compact_summary`. Both discard `systemMessage` and `continue`. | Files on disk. | Zero. | `ai-external-knowledge/claude-code/hooks.md:2978-3036` |
| **Hook: `SessionEnd`** | Fires when the session ends. Matchers `clear`, `resume`, `logout`, `prompt_input_exit`, `other`. | Once. | Nothing. Cannot block. All JSON output discarded. Default budget 1.5 seconds. | Files on disk. | Zero. | `ai-external-knowledge/claude-code/hooks.md:3246-3282` |
| **Hook: `FileChanged`** | Fires when a watched file changes on disk, whatever wrote it. The matcher is a literal filename in the working directory, split on `|`. Not globs, not directories. Add paths at runtime with `watchPaths`. | After the change. | No decision control. Cannot block. | `$CLAUDE_ENV_FILE`, files on disk. | Zero. | `ai-external-knowledge/claude-code/hooks.md:2794-2869`; https://code.claude.com/docs/en/hooks, fetched 2026-09-16 |
| **Hook: `ConfigChange`** | Fires when a settings, managed policy, or skill file changes. Matchers `user_settings`, `project_settings`, `local_settings`, `policy_settings`, `skills`. | On the change. | `decision: "block"` stops the change taking effect, except `policy_settings`. ENFORCED. | Files on disk. | Zero. | `ai-external-knowledge/claude-code/hooks.md:2642-2711`, `:866` |
| **Other hook events** | `PermissionDenied`, `Notification`, `MessageDisplay`, `SubagentStart`, `TaskCreated`, `TaskCompleted`, `StopFailure`, `TeammateIdle`, `CwdChanged`, `DirectoryAdded`, `WorktreeCreate`, `WorktreeRemove`, `PreModelSwitch`, `PostModelSwitch`, `Elicitation`, `ElicitationResult`. | Various. | See the per-event table. | — | — | `ai-external-knowledge/claude-code/hooks.md:38-73`, `:855-889` |
| **Hook handler type: `command`** | Runs a shell command. Fields: `command`, `args`, `async`, `asyncRewake`, `shell`. Exec form when `args` is set; shell form when it is not. | On the event. | Exit codes and stdout. | The process can do anything your user can. | Zero unless it returns text. | `ai-external-knowledge/claude-code/hooks.md:453-506` |
| **Hook handler type: `http`** | POSTs the event JSON to a URL. Fields: `url`, `headers`, `allowedEnvVars`. It cannot block through a status code; it must return 2xx with a JSON decision. | On the event. | Same JSON output shape. | On your server. | Zero unless it returns text. | `ai-external-knowledge/claude-code/hooks.md:508-545`, `:893-904` |
| **Hook handler type: `mcp_tool`** | Calls a tool on an already-connected MCP server. Fields: `server`, `tool`, `input` with `${path}` substitution. Never starts a connection or an OAuth flow. | On the event, once servers are connected. | Tool text read like command stdout. | On the server. | Zero unless it returns text. | `ai-external-knowledge/claude-code/hooks.md:547-581`; https://code.claude.com/docs/en/hooks (MCP tool hook fields), fetched 2026-09-16 |
| **Hook handler type: `prompt`** | One LLM call, Haiku by default. Returns `{ok, reason, impossible}`. Fields: `prompt` with `$ARGUMENTS`, `model`, `timeout` (default 30), `continueOnBlock`. | On the event. | `ok: false` blocks, and what that means depends on the event. | None. | The call costs tokens on a separate model, not your context. | `ai-external-knowledge/claude-code/hooks.md:3404-3538` |
| **Hook handler type: `agent`** | Spawns a subagent with tool access that can read files, up to 50 turns. Experimental. Fields: `prompt`, `model`, `timeout` (default 60). Returns `{ok, reason}`. | On the event. | `ok: false` behaves like a prompt hook with `continueOnBlock: true`. | Its own context, discarded. | Isolated. | `ai-external-knowledge/claude-code/hooks.md:3540-3590` |
| **`async: true` on a command hook** | Runs in the background and does not block Claude. | On the event. | Cannot block or decide. `additionalContext` and `systemMessage` arrive on the next conversation turn. `asyncRewake` wakes Claude on exit 2. | Files on disk. | Only what it returns, later. | `ai-external-knowledge/claude-code/hooks.md:3592-3694` |
| **Hook state: `session_id`, `transcript_path`, `cwd`, `permission_mode`, `prompt_id`, `effort`, `hook_event_name`, `agent_id`, `agent_type`** | The common input fields on stdin. Live docs add `scratchpad_dir`. | Every hook call. | Read-only input. | A hook can key a file on `session_id` to keep per-session state. `transcript_path` may lag the in-memory conversation. | — | `ai-external-knowledge/claude-code/hooks.md:725-773`; https://code.claude.com/docs/en/hooks (Common input fields), fetched 2026-09-16 |
| **Hook state: `$CLAUDE_ENV_FILE`** | A file path a hook writes `export` lines to. Those variables reach later Bash commands in the session. Available to `SessionStart`, `Setup`, `CwdChanged`, and `FileChanged` hooks only. | Those four events. | Sets environment for later Bash calls. | Yes, for the session. | Zero. | `ai-external-knowledge/claude-code/hooks.md:1184-1223` |
| **Hook state: `${CLAUDE_PLUGIN_DATA}`** | A per-plugin directory at `~/.claude/plugins/data/{id}/` that survives plugin updates. Deleted when the plugin is uninstalled from its last scope. | Referenced by plugin hooks, skills, and agents. | — | Yes, across sessions and plugin updates. | Zero. | `ai-external-knowledge/claude-code/plugins-reference.md:735-780` |
| **Hook state: files on disk** | Any path the handler can write. The only general-purpose durable state a hook has. | Any event. | — | Yes, with no size limit Claude Code imposes. | Zero until something reads it back. | Follows from the command hook contract, `ai-external-knowledge/claude-code/hooks.md:453-506` |
| **Plugin** | Packages skills, agents, hooks, MCP servers, LSP servers, output styles, themes, monitors, workflows, and a `bin/` directory. | When enabled. | Everything its components can do. | `${CLAUDE_PLUGIN_DATA}`. | The sum of its components. | `ai-external-knowledge/claude-code/plugins-reference.md:854-923` |
| **Plugin manifest `.claude-plugin/plugin.json`** | Optional. If present, `name` is the only required field. Metadata: `$schema`, `displayName`, `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`, `metadata`, `defaultEnabled`. Component paths: `skills`, `commands`, `agents`, `workflows`, `hooks`, `mcpServers`, `outputStyles`, `lspServers`, `experimental.themes`, `experimental.monitors`, `userConfig`, `channels`, `dependencies`. Unrecognized top-level fields are ignored. | Load time. | — | — | — | `ai-external-knowledge/claude-code/plugins-reference.md:433-556` |
| **What a plugin cannot ship** | A `CLAUDE.md` at the plugin root is **not** loaded as project context. There is no `rules/` component. A plugin's `settings.json` supports only the `agent` and `subagentStatusLine` keys. | — | — | — | — | `ai-external-knowledge/claude-code/plugins-reference.md:905`, `:923`; confirmed live at https://code.claude.com/docs/en/plugins-reference, fetched 2026-09-16 |
| **`settings.json`: `disableAllHooks`** | Turns off all hooks, the custom status line, and the custom file-suggestion command. Only managed settings can disable managed hooks. | Read after settings precedence. | ENFORCED. | — | — | `ai-external-knowledge/claude-code/hooks.md:707-713`; https://code.claude.com/docs/en/settings-reference, fetched 2026-09-16 |
| **`settings.json`: `allowManagedHooksOnly`** | Blocks user, project, local, and plugin hooks. Admin key. | — | ENFORCED. | — | — | `ai-external-knowledge/claude-code/hooks.md:272-279` |
| **`settings.json`: `allowedHttpHookUrls`, `httpHookAllowedEnvVars`** | Allowlists for HTTP hook URLs and the environment variables that may be interpolated into their headers. Apply to hooks from every source. | — | ENFORCED. | — | — | `ai-external-knowledge/claude-code/hooks.md:283-287` |
| **`settings.json`: `disableSkillShellExecution`** | Replaces every `` !`command` `` in a user, project, plugin, or added-directory skill with `[shell command execution disabled by policy]`. A `true` in managed settings cannot be overridden. | On skill render. | ENFORCED. | — | — | `ai-external-knowledge/claude-code/skills.md:639`; https://code.claude.com/docs/en/settings-reference, fetched 2026-09-16 |
| **`settings.json`: `skillOverrides`** | Per skill: `"on"`, `"name-only"`, `"user-invocable-only"`, `"off"`. Does not affect plugin skills. The `/skills` menu writes it to `.claude/settings.local.json`. | Session load. | ENFORCED. | — | Lowers the listing cost. | `ai-external-knowledge/claude-code/skills.md:771-799` |
| **`settings.json`: `skillListingBudgetFraction`, `skillListingMaxDescChars`** | The share of the context window the skill listing may use, default `0.01`, and the per-skill description cap, default `1536`. | Every turn. | — | — | Directly sets the per-turn skill cost. | `ai-external-knowledge/claude-code/skills.md:1053-1061`; https://code.claude.com/docs/en/settings-reference, fetched 2026-09-16 |
| **`settings.json`: `disableBundledSkills`** | Turns off the skills and workflows that ship with Claude Code. | Session load. | ENFORCED. | — | Lowers the listing cost. | https://code.claude.com/docs/en/settings-reference, fetched 2026-09-16 |
| **`settings.json`: `claudeMd`** | Puts CLAUDE.md text directly in managed settings. Honored only in managed and policy settings. Loads ahead of user and project CLAUDE.md. | Session start. | REMINDED. | — | Same as a CLAUDE.md of that length. | `ai-external-knowledge/claude-code/memory.md:294-308` |
| **`settings.json`: `outputStyle`** | Names the output style. | See below. | — | — | — | `ai-external-knowledge/claude-code/output-styles.md:131` |
| **`settings.json`: `enabledPlugins`, `extraKnownMarketplaces`** | Which plugins are on, and which marketplaces are known. These two keys are the only settings Claude Code reads from a directory added with `--add-dir`. | Session load. | ENFORCED. | — | — | `ai-external-knowledge/claude-code/skills.md:190` |
| **`settings.json`: `permissions.deny` / `allow` / `ask`** | Hard rules on tools and arguments, including `Skill(name)` and `Skill(name *)`. A deny rule beats any hook `allow`. | Every tool call. | ENFORCED. This is the strongest gate. | — | — | `ai-external-knowledge/claude-code/skills.md:739-769`; https://code.claude.com/docs/en/hooks-guide (Hooks and permission modes), fetched 2026-09-16 |
| **Output style** | A Markdown file in `.claude/output-styles/` that changes Claude Code's own instructions: role, tone, format. Frontmatter: `name`, `description`, `keep-coding-instructions`, `force-for-plugin`. By default it replaces the built-in software-engineering instructions. | Style files are read at startup; the selected style applies to every response. Since v2.1.251, switching mid-session applies from your next message. | Changes how Claude writes. REMINDED. | None. | Input tokens on every request, reduced by prompt caching after the first. | `ai-external-knowledge/claude-code/output-styles.md:94-115`; https://code.claude.com/docs/en/output-styles, fetched 2026-09-16 |
| **Output style reach** | Applies to the main conversation and to a conversation fork. It does **not** reach any other subagent, because a subagent runs its own system prompt. | — | — | — | — | `ai-external-knowledge/claude-code/sub-agents.md:1047`; https://code.claude.com/docs/en/output-styles, fetched 2026-09-16 |
| **MCP server** | External tools. Tools appear as `mcp__<server>__<tool>`, or `mcp__plugin_<plugin>_<server>__<tool>` for a plugin-bundled server. | Tool names load at session start; full schemas load on demand. Tool search is on by default. | Tools Claude can call. Hooks can match them by name. | Whatever the server keeps. | Low. Tool names at start, schemas only when used. | `ai-external-knowledge/claude-code/hooks.md:358-376`; `ai-external-knowledge/claude-code/features-overview.md:255-262` |

## Context cost, side by side

The official summary, which matches the mechanism rows above:

| Feature | When it loads | What loads | Context cost |
| --- | --- | --- | --- |
| CLAUDE.md | Session start | Full content | Every request |
| Skills | Session start, plus when used | Descriptions at start, full content when used | Low, descriptions every request |
| MCP servers | Session start | Tool names; schemas on demand | Low until a tool is used |
| Subagents | When spawned | Fresh context | Isolated from the main session |
| Hooks | On trigger | Nothing | Zero, unless the hook returns context |

Source: `ai-external-knowledge/claude-code/features-overview.md:209-216`.

---

# Section 2. Job to mechanism map

## a. Deliver startup guidance, and confirm three files reached the agent, in order, before it tells the owner

**The only mechanism that delivers text at startup without the model choosing to
is a `SessionStart` hook.** Its plain stdout is added to Claude's context; so is
`hookSpecificOutput.additionalContext`. Delivery is ENFORCED. Both go in at the
start of the conversation, before the first prompt
(`ai-external-knowledge/claude-code/hooks.md:990`, `:1147-1169`).

Options, strongest first:

1. **`SessionStart` command hook that reads the three files and prints them.**
   The hook `cat`s file one, file two, file three in that order into a single
   stdout stream. Order is then a fact about the bytes, not a request to the
   model. The hook can also print a line naming what it delivered, so the model
   has something to confirm against. ENFORCED delivery, REMINDED confirmation.
   Limits: only `command` and `mcp_tool` handlers are allowed on this event
   (`hooks.md:1096`); `mcp_tool` handlers are skipped at launch, so use `command`
   (https://code.claude.com/docs/en/hooks, MCP tool hook fields, fetched
   2026-09-16). Every hook output string is capped at 10,000 characters
   (`hooks.md:916`), so three long files will not fit in one hook. Split them
   across several hook handlers on the same event, or print a short index and
   have the model read the files.
2. **Project CLAUDE.md with `@path` imports.** Writing `@knowledge/README.md`
   expands the file inline at launch. ENFORCED delivery. Order follows the order
   of the imports in the file. Cost: the full text of every imported file, in
   every request (`memory.md:96-102`, `:459`).
3. **Unscoped `.claude/rules/*.md`.** Loaded at launch with the same priority as
   `.claude/CLAUDE.md` (`memory.md:202`). Same cost profile.

**Confirming the three files reached the agent.** Two different questions:

- *Did Claude Code load them?* The `InstructionsLoaded` hook fires for each
  CLAUDE.md and `.claude/rules/*.md` file with `file_path`, `memory_type`, and
  `load_reason`. A hook can append each one to a log file. This is ENFORCED and
  exact, but it covers only CLAUDE.md and rules files, never an arbitrary
  `knowledge/*.md`, and it has no decision control at all
  (`hooks.md:1264-1297`).
- *Did the agent read them?* A `PostToolUse` hook matching `Read` can record each
  `tool_input.file_path` to a per-session file keyed on `session_id`
  (`hooks.md:1935-1962`, `:731`). A `Stop` hook then reads that file and returns
  `decision: "block"` with a reason naming the missing file, which ENFORCES that
  the turn does not end until the reads happened. Claude Code overrides the hook
  after 8 consecutive blocks, and `stop_hook_active` tells the hook it is already
  in that loop (`hooks.md:2477`, `:2537-2556`).

**What cannot be done.** No mechanism makes the agent read files in a given order
before speaking. `Stop` fires after Claude has finished responding, so the reply
text is already written when the hook runs; blocking makes Claude keep working
and produce more, it does not retract what was said. There is no "before the
model speaks" event other than `UserPromptSubmit`, which runs before the model
sees the prompt at all.

## b. Bring guidance back after compaction, `/clear`, or resume, without repeating the manual every message

What the harness restores by itself, ENFORCED:

| Content | After compaction |
| --- | --- |
| System prompt and output style | Both still apply |
| Project-root CLAUDE.md and unscoped rules | Re-injected from disk |
| Auto memory | Re-injected from disk |
| The plan written in plan mode | Re-injected from disk |
| Rules with `paths:` | Reloaded only as Claude reads matching files |
| Nested CLAUDE.md | Reloaded only as Claude reads files in that directory |
| Files Claude read or edited | Up to five re-read, most recently modified first |
| Invoked skill bodies | Re-injected, 5,000 tokens per skill, 25,000 total, oldest dropped first |
| Context earlier hooks added | Summarized away with the rest of the conversation |
| `SessionStart` hooks matching `compact` | Run, and their output is added |

Sources: `ai-external-knowledge/claude-code/context-window.md:1601-1616`; the live
table adds a row for background commands and subagents and changes the first row
to "Both still apply" (https://code.claude.com/docs/en/context-window, fetched
2026-09-16).

So:

- **Guidance that must survive compaction** belongs in the project-root CLAUDE.md
  or an unscoped rule. Those are re-injected from disk, ENFORCED. The docs say so
  directly: "If a rule must persist across compaction, drop the `paths:`
  frontmatter or move it to the project-root CLAUDE.md"
  (`context-window.md:1614`).
- **Guidance that can be cheap most of the time** belongs in a path-scoped rule
  or a skill with `paths`. It costs nothing until it matches, and it comes back
  when a matching file is read.
- **Guidance that should return once per session boundary** belongs in a
  `SessionStart` hook. Matchers cover the four boundaries you named: `compact`,
  `clear`, `resume`, and `fork`, plus `startup` (`hooks.md:1100-1106`). One hook
  with the matcher `compact|clear|resume|fork` re-delivers a short pointer, not
  the manual. The official guide gives exactly this pattern
  (https://code.claude.com/docs/en/hooks-guide, "Re-inject context after
  compaction", fetched 2026-09-16).
- **The manual itself** belongs in a skill. A skill body loads only when invoked
  and then stays across turns, and after compaction Claude Code re-attaches the
  most recent invocation of each skill, keeping the first 5,000 tokens
  (`skills.md:516-524`). Truncation keeps the start of the file, so put the
  rules that matter at the top.

**Caution about resume.** Text a mid-session hook injected is replayed from the
transcript on `--continue` or `--resume`, not re-computed, so a timestamp or a
commit SHA goes stale. `SessionStart` hooks run again on resume and can refresh
(`hooks.md:1008`).

## c. Remind or require a save review at five moments

| Moment | Mechanism | ENFORCED or REMINDED | Limits |
| --- | --- | --- | --- |
| End of a turn with real work | `Stop` hook. `decision: "block"` with a `reason`, or `hookSpecificOutput.additionalContext` for the softer form that shows as feedback rather than an error. | ENFORCED that the turn does not end. The save itself is REMINDED. | Fires on **every** turn, including a one-word answer. See job (j) for telling them apart. Claude Code ends the turn after 8 consecutive blocks. Does not fire on a user interrupt; an API error fires `StopFailure` instead, which has no decision control. `hooks.md:2465-2565`, `:2567-2593` |
| Before opening a pull request | `PreToolUse` on `Bash` with `if: "Bash(gh pr create *)"`, returning `permissionDecision: "ask"` or `"deny"`. | ENFORCED block. | Only catches the shapes you name. A PR opened through an MCP GitHub tool needs a matcher on that tool name instead, such as `mcp__github__create_pull_request`. `hooks.md:430`, `:1741-1758`, `:358-376` |
| When a work item closes | No lifecycle event exists for this. It has to be tied to the command that closes it: a `PreToolUse` `if` rule on the `gh issue close` shape, or on the MCP tool that does it. | ENFORCED if you can name the command. | If the item closes on a website, Claude Code never sees it. |
| Before a handoff or a context clear | `PreCompact` can block compaction with exit 2 or `decision: "block"`. `SessionEnd` with matcher `clear` fires on `/clear` but **cannot block and its JSON output is discarded**. | `PreCompact` is ENFORCED. `SessionEnd` is neither: it cannot stop the clear and cannot say anything to the agent. | This is the real gap. The owner types `/clear`; by the time `SessionEnd` fires, nothing can be said. The check has to happen earlier, on purpose. `hooks.md:2978-2993`, `:3246-3282` |
| When the owner asks | A skill with `disable-model-invocation: true`, invoked as `/name`. Or `UserPromptExpansion` matching that command name, to add context or gate it. | REMINDED, but the owner chose it. | — `skills.md:477-502`; `hooks.md:1361-1398` |

A `prompt` or `agent` handler on `Stop` is the way to judge "was this a turn worth
saving?" without writing the judgement in shell. A prompt hook returns
`{ok: false, reason}` and the reason becomes Claude's next instruction; on `Stop`
it can also return `impossible: true` to let the turn end
(`hooks.md:3486-3516`).

## d. Check a write to `knowledge/` for frontmatter, size, and approval evidence; block or warn

**Block before the write: `PreToolUse`.**

```json
{ "type": "command", "if": "Write(knowledge/**)", "command": "...", "args": [] }
```

- The `if` field holds exactly one permission rule. There is no `&&` or `||`.
  Use one handler per condition (`hooks.md:435`).
- For a file tool, `tool_input.file_path` is always absolute, with `~` and
  relative paths already expanded, so the rule cannot be dodged by spelling the
  path differently. On Windows the separators are backslashes
  (`hooks.md:1563-1568`).
- A single-segment directory pattern like `Write(knowledge/**)` matches only the
  `knowledge` directory in the working directory. To match at any depth write
  `Write(**/knowledge/**)`. This changed in v2.1.214 (`hooks.md:437`).
- For `Write`, `tool_input.content` is the whole file, so the hook can check the
  frontmatter and the byte count before anything is written
  (`hooks.md:1618-1626`). For `Edit` you get `old_string` and `new_string`, not
  the finished file, so a size check on an `Edit` has to read the file from disk
  and apply the replacement itself.
- Return `permissionDecision: "deny"` with a reason to block, `"ask"` to put it
  in front of the owner, or `"allow"` with `updatedInput` to fix the frontmatter
  yourself. A deny holds even in `bypassPermissions`
  (`hooks.md:1741-1758`; https://code.claude.com/docs/en/hooks-guide, fetched
  2026-09-16).
- Warn without blocking: exit 0 and return `hookSpecificOutput.additionalContext`,
  or use `PostToolUse` with `decision: "block"`, which only puts the reason beside
  the result (`hooks.md:1964-1975`).

**The hole: a write through Bash.** `Write` and `Edit` are not the only ways a
file gets written. A heredoc, `sed -i`, or `git checkout` all bypass an
`Edit|Write` matcher. Three partial covers:

- A second `PreToolUse` handler with `if: "Bash(...)"`. Best effort only: "When
  Claude Code can't determine which commands the Bash input runs, it runs your
  hook regardless of the pattern. Because the `if` filter is best-effort, use the
  permission system rather than a hook to enforce a hard allow or deny"
  (`hooks.md:451`).
- `FileChanged`, which uses a filesystem watcher and fires whatever wrote the
  file. But it **cannot block**, and its matcher is a literal filename in the
  working directory, not a glob and not a directory. You would have to name each
  knowledge file, or feed `watchPaths` at session start
  (`hooks.md:2794-2869`).
- New since the capture: a `PostToolUse` hook on `Bash` can read
  `tool_response.bashEditDiff`, which lists the files a Bash command changed in
  the repository. It requires v2.1.269 or later, is in public beta, is best
  effort, and only records in certain permission modes unless
  `bashEditDiffEnabled` is on (https://code.claude.com/docs/en/hooks, fetched
  2026-09-16).

**The hard gate.** For a rule that must never be worked around, use
`permissions.deny`, not a hook. The docs say so twice
(`hooks.md:451`; https://code.claude.com/docs/en/hooks-guide, "Hooks and
permission modes", fetched 2026-09-16).

**Approval evidence.** Nothing in Claude Code records that the owner approved
something. The nearest primitives are the `AskUserQuestion` tool, whose
`PostToolUse` input carries the question and the chosen answer, and the
permission prompt itself. A hook can write the answer to a file and a later hook
can require that file to exist and be recent. That is an evidence trail you
build, not one the harness keeps (`hooks.md:1718-1727`).

## e. Keep small per-session state that never becomes project memory

| Option | Where it lives | Survives | Reaches project memory? |
| --- | --- | --- | --- |
| A file keyed on `session_id`, written by a hook, under the system temp directory or `~/.claude/` | Your choice | The session, or until you delete it | No, unless you put it in the repo |
| `scratchpad_dir` from the hook input | The session's scratchpad | The session | No. New in v2.1.257 |
| `$CLAUDE_ENV_FILE` | Environment of later Bash calls | The session. Cleared at the next `CwdChanged` for `CwdChanged` and `FileChanged` hooks | No |
| `${CLAUDE_PLUGIN_DATA}` | `~/.claude/plugins/data/{id}/` | Across sessions and plugin updates. Deleted on uninstall | No |

Sources: `hooks.md:731` (`session_id`), `:1184-1223` (`$CLAUDE_ENV_FILE`),
`plugins-reference.md:735-780` (`${CLAUDE_PLUGIN_DATA}`);
https://code.claude.com/docs/en/hooks (`scratchpad_dir`), fetched 2026-09-16.

**Do not use auto memory for this.** Auto memory is per repository, shared across
worktrees, written by Claude on its own judgement with no approval step, and
loaded into every session. It is the opposite of per-session scratch
(`memory.md:345-372`). If the project knowledge system is the owner-approved
record, auto memory is a competing record that writes itself. Consider turning it
off for the project with `"autoMemoryEnabled": false`, and say why in the design.

## f. Scope guidance to a folder, file type, or topic

| Want | Mechanism | How | Limits |
| --- | --- | --- | --- |
| A folder | Nested `CLAUDE.md` in that folder | Loads when Claude reads a file in that folder | Does not survive compaction unless a matching file is read again. `memory.md:162`, `:465` |
| A folder or a file type | `.claude/rules/x.md` with `paths:` | Glob patterns, brace expansion allowed, budget of 1,000 expanded patterns and 4 MiB per rule | Triggers on a file read, not on every tool use. `[` starts a bracket expression; escape a literal one. `memory.md:206-249` |
| A folder or file type, for a skill | Skill frontmatter `paths` | Same glob format as path-scoped rules. Claude loads the skill on its own only for matching files | Does not stop you invoking it by name. `skills.md:354` |
| A topic | A skill's `description` and `when_to_use` | Claude matches the request text against them | Matching is the model's judgement, REMINDED. Combined text capped at 1,536 characters. `skills.md:340-341` |
| A subtree in a monorepo | A nested `.claude/skills/` directory | Loads the first time Claude reads or edits a file there, then stays. Shows as `apps/web:deploy` when the name clashes | Not available at startup, so not in autocomplete until then. `skills.md:138-148`, `:166-174` |
| A folder, via a plugin | A skill with `paths` inside the plugin | Plugins can ship skills | A plugin **cannot** ship `.claude/rules` or a CLAUDE.md. See job (d) of Section 4. `plugins-reference.md:905` |

## g. Run a skill when a plain-language request matches

The Skill tool. Claude reads the skill listing every turn, which holds each
skill's name and the combined `description` plus `when_to_use` text, and decides.
This is REMINDED: nothing forces the match.

To make it more likely:

- Put the key use case first in `description`. The combined text is cut at 1,536
  characters (`skills.md:340`).
- Add trigger phrases and example requests in `when_to_use` (`skills.md:341`).
- Watch the budget. The listing is capped at 1% of the context window by default.
  When it overflows, Claude Code drops descriptions, starting with the skills you
  invoke least, and keeps every name. Raise it with
  `skillListingBudgetFraction`, or set low-priority skills to `"name-only"` in
  `skillOverrides` (`skills.md:1053-1061`).
- Run `/skill-doctor` to see which loaded skills go unused and what they cost.
  New since the capture; requires v2.1.252 or later
  (https://code.claude.com/docs/en/skills, "Find unused skills", fetched
  2026-09-16).

To make it a hard guarantee instead, you cannot. The docs say: "If a skill seems
to stop influencing behavior after the first response, the content is usually
still present and the model is choosing other tools or approaches. Strengthen the
skill's `description` and instructions so the model keeps preferring it, or use
hooks to enforce behavior deterministically" (`skills.md:524`).

## h. Run a check script after an edit or before a commit

**After an edit.** `PostToolUse` with matcher `Edit|Write`, or no matcher at all
so it fires after every successful tool and discovers what changed itself, for
example with `git status --porcelain` (`hooks.md:1930-1933`). Add the same hook
under `PostToolUseFailure` to cover failed calls. For a file that anything might
write, `FileChanged` is the event that actually watches the disk, at the cost of
its literal-filename matcher and no ability to block.

Set `"async": true` on a slow check so Claude keeps working; its
`additionalContext` arrives on the next turn, and it can no longer block
(`hooks.md:3592-3636`).

**Before a commit.** `PreToolUse` on `Bash` with `if: "Bash(git commit *)"`, exit
2 or `permissionDecision: "deny"` to stop it. Same best-effort caveat as job (d).

## i. Ask the owner a structured question

`AskUserQuestion` is a built-in tool: one to four multiple-choice questions, each
with a `question` string, a short `header`, an `options` array of labels, and an
optional `multiSelect` flag (`hooks.md:1718-1727`). Claude calls it; a skill body
can tell Claude to.

Around it:

- A `PreToolUse` hook matching `AskUserQuestion` sees the questions before they
  are shown and can rewrite them with `updatedInput`.
- A `PostToolUse` hook matching `AskUserQuestion` sees the answers, and can write
  them to a file as the approval evidence job (d) needs.
- In non-interactive `-p` runs the tool normally blocks. A hook returning
  `"allow"` together with `updatedInput` carrying an `answers` object answers it
  programmatically. `"allow"` alone is not enough (`hooks.md:1774-1776`).
- A skill that must never ask can list `AskUserQuestion` in `disallowed-tools`
  (`skills.md:347`).
- `permissionDecision: "ask"` on any `PreToolUse` hook puts a yes/no permission
  prompt in front of the owner. The prompt is labelled with where the hook came
  from: `[settings]`, `[plugin:<name>]`, or `[skill]` (`hooks.md:1756`).

## j. Tell a turn that did real work from a trivial reply

The `Stop` hook input gives you, and only these:

| Field | What it is |
| --- | --- |
| `session_id` | Session identifier |
| `transcript_path` | Path to the conversation JSON |
| `cwd`, `permission_mode`, `effort`, `hook_event_name` | Common fields |
| `stop_hook_active` | `true` when Claude Code is already continuing because of a stop hook |
| `last_assistant_message` | The text of Claude's final response |
| `background_tasks` | In-flight tasks: `id`, `type`, `status`, `description`, and per-type extras |
| `session_crons` | Scheduled wakeups: `id`, `schedule`, `recurring`, `prompt` |

Source: `ai-external-knowledge/claude-code/hooks.md:2475-2535`.

**There is no tool-call count and no changed-file list in the `Stop` input.** So
"did real work" has to be derived:

1. **Keep a tally yourself.** A `PostToolUse` hook with no matcher appends the
   tool name to a file keyed on `session_id`. The `Stop` hook reads and clears
   it. This is exact and cheap, and it is the approach I would design around.
2. **Ask git.** The `Stop` hook runs `git status --porcelain` and
   `git diff --name-only`. Simple, but it cannot tell your turn's changes from
   another session's in the same checkout, which matters in this repository.
3. **Read the transcript.** `transcript_path` is there, but "the transcript file
   is written asynchronously and may lag the in-memory conversation, so it may
   not yet include the current turn's most recent messages when a hook fires"
   (`hooks.md:733`). Do not depend on it for the current turn.
4. **Ask a model.** A `prompt` or `agent` handler on `Stop` gets the hook input,
   including `last_assistant_message`, and returns `{ok, reason}`. An `agent`
   handler can also read files and run git itself, up to 50 turns
   (`hooks.md:3540-3570`). Costs a model call on every turn.

Also note: `Stop` does not fire on a user interrupt, and an API error fires
`StopFailure` instead, whose output and exit code are ignored
(`hooks.md:2467-2469`, `:2567-2593`).

## k. Detect a git commit, push, or PR creation

**The two filters.** `matcher` is checked against the tool name. `if` is checked
against the tool name and its arguments together, using permission rule syntax.
`if` is evaluated only on `PreToolUse`, `PostToolUse`, `PostToolUseFailure`,
`PermissionRequest`, and `PermissionDenied`; on any other event a hook with `if`
set never runs (`hooks.md:430`).

```json
{
  "PreToolUse": [
    { "matcher": "Bash",
      "hooks": [
        { "type": "command", "if": "Bash(git commit *)", "command": "..." },
        { "type": "command", "if": "Bash(git push *)",   "command": "..." },
        { "type": "command", "if": "Bash(gh pr create *)", "command": "..." }
      ] } ]
}
```

One rule per handler; there is no way to combine them (`hooks.md:435`).

**How Bash patterns actually evaluate**, copied from `hooks.md:441-449`:

| `if` pattern | Bash command | Hook runs? | Why |
| --- | --- | --- | --- |
| `Bash(git *)` | `FOO=bar git push` | yes | leading assignments are stripped |
| `Bash(git *)` | `npm test && git push` | yes | each subcommand is checked |
| `Bash(rm *)` | `echo $(rm -rf /)` | yes | commands inside `$()` and backticks are checked |
| `Bash(rm *)` | `echo $(date)` | no | no subcommand matches |
| `Bash(git *)` | `$TOOL git push` | yes | Claude Code cannot tell what the name expands to, so it runs the hook |
| `Bash(git push *)` | `echo $(date)` | yes | a pattern that specifies more than the command name runs the hook anyway on `$()`, backticks, or `$VAR` |

So the filter errs toward running your hook, which is the safe direction for a
gate, but it also means your handler must re-check the command itself. And the
docs are explicit: "Because the `if` filter is best-effort, use the permission
system rather than a hook to enforce a hard allow or deny" (`hooks.md:451`).

**Windows.** Match `Bash|PowerShell`. On Windows without Git Bash, Claude Code
does not register the Bash tool at all, so a `Bash`-only matcher never fires
(`hooks.md:1612-1616`).

**MCP.** A PR opened through a GitHub MCP server is a tool call named
`mcp__github__create_pull_request`, or
`mcp__plugin_<plugin>_<server>__create_pull_request` for a plugin-bundled server.
Match it by that name. `mcp__github` on its own contains only exact-match
characters and matches nothing; you need `mcp__github__.*`
(`hooks.md:358-376`).

**After the fact.** `PostToolUse` with the same matcher and `if` sees
`tool_response`, so it can read the commit SHA or the PR URL the command printed.

---

# Section 3. What changed since the 2026-09-04 capture

Method: I downloaded the live Markdown of each page (`https://code.claude.com/docs/en/<page>.md`)
on 2026-09-16 and diffed it against `ai-external-knowledge/claude-code/<page>.md`.
Newest changelog entry on the live page: **2.1.273, September 15, 2026**. The
capture ends at **2.1.261, September 4, 2026**.

Only changes that touch the mechanisms above are listed. Purely editorial
rewording is left out.

## Changes that affect a project knowledge system

1. **Symlinked rules from outside the working directory now need approval, and
   path-scoped ones are dropped.** The live memory page says: "Claude Code treats
   a symlink whose target is outside your working directory like an external
   import. The linked rules don't load until you approve external imports for the
   project, and after that only the ones without a `paths` field load. ... To load
   shared rules without that approval, keep them in `~/.claude/rules/`, where they
   apply to every project on your machine."
   The captured copy said only that symlinks "are resolved and loaded normally".
   This matters directly if the design symlinks shared rules into a project.
   https://code.claude.com/docs/en/memory, fetched 2026-09-16.

2. **`omitClaudeMd` is a new subagent frontmatter field** (v2.1.271). It launches
   a subagent without the user, project, and local CLAUDE.md files; managed policy
   files still load. Plugin agents support it too. The captured copy said flatly:
   "Explore and Plan are the only subagents that omit CLAUDE.md and git status.
   There is no frontmatter field or per-agent setting to change which agents skip
   them." That sentence is gone. Git status still cannot be turned off per agent.
   https://code.claude.com/docs/en/sub-agents and
   https://code.claude.com/docs/en/changelog (2.1.271, September 14, 2026),
   fetched 2026-09-16.

3. **An output style change now applies from your next message** (v2.1.251). The
   captured pages said a change took effect only after `/clear` or a new session.
   The `outputStyle` settings key says the same. In the terminal, style *files*
   are still read at startup, so creating or editing a style file mid-session
   still needs a restart.
   https://code.claude.com/docs/en/output-styles and
   https://code.claude.com/docs/en/settings-reference, fetched 2026-09-16.

4. **`/output-style [name]` is a new command** (2.1.269), working over Remote
   Control and in cloud and headless sessions.
   https://code.claude.com/docs/en/changelog, fetched 2026-09-16.

5. **`scratchpad_dir` is a new common hook input field** (v2.1.257): the path to
   the session's scratchpad directory, absent when there is none. A place for
   per-session hook state.
   https://code.claude.com/docs/en/hooks, fetched 2026-09-16.

6. **`SessionStart` `mcp_tool` hooks are skipped at launch.** The live page
   replaces a one-line warning with a precise rule: at launch, including
   `--continue` and `--resume`, MCP servers are not yet available, Claude Code
   skips the event's `mcp_tool` hooks entirely, and the debug log records
   `mcp_tool hooks are not available for the 'SessionStart' hook event (no MCP
   client context)`. After `/clear` or a compaction, `SessionStart` fires again
   with servers available and the hooks do run. On `Setup`, `mcp_tool` hooks are
   **always** skipped. Use a `command` hook for anything the session needs from
   its first turn.
   https://code.claude.com/docs/en/hooks, fetched 2026-09-16.

7. **`SessionStart` hooks now run in the background at launch.** You can type
   right away, and a resumed conversation appears without waiting. Claude's first
   response still waits for them, so their context reaches Claude. Switching
   conversations with `/resume` inside a session waits instead. If you `/clear`
   or switch while background hooks are still running, nothing they return
   applies.
   https://code.claude.com/docs/en/hooks, fetched 2026-09-16.

8. **`WorktreeRemove` can now block.** The captured copy said it had no decision
   control. The live copy says any non-zero exit code makes the removal fail if
   the directory still exists afterward.
   https://code.claude.com/docs/en/hooks, fetched 2026-09-16.

9. **`PostToolUse` on `Bash` can carry `tool_response.bashEditDiff`** (v2.1.269,
   public beta): the files a Bash command changed in the repository, with up to
   five diffs, plus `moreFiles`, `unavailable`, `skipped`, and `shared` flags.
   Gated by the new `bashEditDiffEnabled` setting; without it, recording happens
   only in auto mode and `bypassPermissions`. The docs say to use the list to find
   what to review, not to enforce a policy.
   https://code.claude.com/docs/en/hooks, fetched 2026-09-16.

10. **The compaction table changed two rows.** "System prompt and output style"
    now reads "Both still apply" rather than "Unchanged; not part of message
    history", and a new row says background commands and background subagents keep
    running and Claude is reminded which ones are still going.
    https://code.claude.com/docs/en/context-window, fetched 2026-09-16.

11. **"All hook events are supported" was removed** from the "Hooks in skills and
    agents" section. The live page no longer makes that claim anywhere. The rest
    of that section, including `once: true`, is unchanged. Treat the old blanket
    statement as no longer supported by the docs.
    https://code.claude.com/docs/en/hooks, fetched 2026-09-16.

12. **Slash-command files in subdirectories now get a namespaced name.**
    `.claude/commands/frontend/component.md` becomes `/frontend:component`. This
    row is new in the command-name table.
    https://code.claude.com/docs/en/skills, fetched 2026-09-16.

13. **Skills synced from claude.ai are now named `anthropic-skills:<name>`** in
    cloud sessions, matching Claude Desktop; the bare name still works when
    nothing else uses it (2.1.269).
    https://code.claude.com/docs/en/changelog, fetched 2026-09-16.

14. **Injected `!` commands in auto mode no longer abort the skill.** The captured
    copy said any permission check that does not return allow aborts the
    invocation. The live copy adds: in auto mode, a command that would otherwise
    need approval does not abort. The skill loads with an instruction telling
    Claude to run the command first, and Claude's own call goes through auto
    mode's checks. Changelog 2.1.271 puts it as: inline `!` shell commands now
    "follow default-mode permission rules instead of the classifier".
    https://code.claude.com/docs/en/skills and
    https://code.claude.com/docs/en/changelog, fetched 2026-09-16.

15. **`disableBundledSkills` no longer exempts `/doctor`.** The captured copy said
    it "disables every bundled skill except `/doctor`". The live skills page and
    the settings reference both drop the exemption; the settings key says built-in
    commands such as `/init` stay typable but are hidden from the model.
    https://code.claude.com/docs/en/skills and
    https://code.claude.com/docs/en/settings-reference, fetched 2026-09-16.

16. **`/skill-doctor` is new** (v2.1.252, shipped in 2.1.261): it reports which
    loaded skills go unused and what each costs in context.
    https://code.claude.com/docs/en/skills, fetched 2026-09-16.

17. **A new documentation page exists: `plugin-evals`** ("Test plugins with
    evals"), with a `claude plugin eval` command that runs prompts with and
    without a plugin and can grade with `tool_used: Skill`. It is not in the
    2026-09-04 capture at all.
    https://code.claude.com/docs/llms.txt and
    https://code.claude.com/docs/en/skills, fetched 2026-09-16.

18. **Plugin `userConfig` gained an `options` field** (v2.1.271) for a picker over
    allowed string values, and each non-sensitive field now appears as a row in
    `/config` (v2.1.269).
    https://code.claude.com/docs/en/plugins-reference, fetched 2026-09-16.

19. **`--plugin-dir` can now point at a folder of plugins** (2.1.266). Each child
    folder with a manifest loads, and children added or removed while running are
    picked up. Useful for developing the toolkit's plugins locally.
    https://code.claude.com/docs/en/changelog, fetched 2026-09-16.

20. **Subagent `permissionMode` precedence is now spelled out.** When the main
    conversation is in `bypassPermissions`, `acceptEdits`, or auto mode, the
    subagent runs in that mode and the frontmatter value is ignored. When the main
    conversation is in `default`, `dontAsk`, or `plan`, the frontmatter value
    applies, except `bypassPermissions`, which is never granted to a subagent
    whose parent does not have it.
    https://code.claude.com/docs/en/sub-agents, fetched 2026-09-16.

21. **`disallowedTools` with a specifier removes the whole tool.** A subagent
    entry such as `Bash(git push *)` removes Bash entirely, not just that command.
    To keep Bash and block specific commands, use a Bash deny rule.
    https://code.claude.com/docs/en/sub-agents, fetched 2026-09-16.

22. **`StopFailure` gained the `cloud_credential_error` value** (v2.1.267).
    https://code.claude.com/docs/en/hooks, fetched 2026-09-16.

23. **`CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` now also sets each hook's own
    timeout**, not just the overall budget (v2.1.268).
    https://code.claude.com/docs/en/hooks, fetched 2026-09-16.

24. **`maxEffortLevel` is a new setting** (2.1.267), top-level or per model under
    `modelSettings`, capping effort on every provider.
    https://code.claude.com/docs/en/changelog, fetched 2026-09-16.

25. **A managed `claudeMd` no longer triggers the security approval dialog** in
    server-managed settings (2.1.268). Hooks, shell-command, sandbox, and unsafe
    `env` settings still require approval.
    https://code.claude.com/docs/en/changelog, fetched 2026-09-16.

26. **Plugin component paths containing a backslash are rejected on macOS and
    Linux**, even when the path stays inside the plugin (2.1.266 fixed the
    containment bypass). Write component paths with forward slashes.
    https://code.claude.com/docs/en/plugins-reference, fetched 2026-09-16.

## Things I checked and found unchanged

- The plugin rule: "A `CLAUDE.md` file at the plugin root is not loaded as project
  context. ... To ship instructions that load into Claude's context, put them in a
  skill." Still present, live, at https://code.claude.com/docs/en/plugins-reference.
- The plugin file-locations table has no `rules/` row, and plugin `settings.json`
  still supports only `agent` and `subagentStatusLine`.
- The skill frontmatter field list is the same set of fields.
- The 10,000-character hook output cap, the parallel-execution sentence, the
  subagent hook sentence, `once: true`, and the `Stop` input fields are all
  unchanged.
- The auto-memory rules, `CLAUDE_CODE_DISABLE_AUTO_MEMORY`, and the 200-line /
  25 KB `MEMORY.md` limit are unchanged.

---

# Section 4. The eight specific checks

## Function hooks, JavaScript hooks, stateful hooks, mods

**They are not in the documentation or the changelog, as of 2026-09-16.**

What I verified:

- I searched the full live Markdown of `hooks`, `skills`, `memory`,
  `plugins-reference`, `settings-reference`, `changelog`, `claude-directory`,
  `context-window`, `sub-agents`, `features-overview`, `plugins`, `settings`,
  `output-styles`, and `env-vars` for "function hook", "FUNCTION_HOOKS", and
  "mods". Zero matches in all fourteen files.
- The live hooks reference still lists exactly five handler types: `command`,
  `http`, `mcp_tool`, `prompt`, `agent`
  (https://code.claude.com/docs/en/hooks, fetched 2026-09-16).
- The live page index at https://code.claude.com/docs/llms.txt has no page whose
  title or slug mentions mods or function hooks (fetched 2026-09-16).
- The captured 2026-09-04 copy has no matches either.

What GitHub issue anthropics/claude-code#91870 says
(https://github.com/anthropics/claude-code/issues/91870, fetched 2026-09-16 with
WebFetch):

- Title: "Mods - make Claude 10x more extensible". Opened 2026-09-03 by the
  GitHub user `poteat`. State: open. Last update shown on the page: a "Community
  Update" dated 2026-09-09.
- It names the environment variable `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1` and
  says the feature is default-off behind it.
- On naming: "from a product perspective, we are going to be calling this
  functionality 'Claude Mods'. The engineering term of art 'function hook' will
  still exist as the documented implementation primitive Mods are built on."
- On builds: "Finally, I'm sharing here a cheat sheet reference that enumerates
  some affordances on v267/v268 (today / tomorrow)."
- On timing: "We're now committed to shipping function hooks, on the scale of
  weeks in lieu of days or months."
- Both quoted sentences were written by `poteat` in the 2026-09-09 community
  update.

**What I could not verify.** This session cannot reach the GitHub API for
`anthropics/claude-code` (the API returns "GitHub access to this repository is
not enabled for this session", and `gh` is not installed). So I could not confirm
from a first-party source whether `poteat` is an Anthropic employee, what the
author association badge says, whether any Anthropic staff member replied, or
whether `https://github.com/anthropics/claude-code/tree/main/mods` exists. A
plain `curl` of that tree URL returned HTTP 403, which is the session proxy
blocking it, not evidence about the path. WebFetch on the issue's HTML page did
not surface comments or badges.

**Correction to the peer's summary.** The peer said the issue is from Anthropic.
The issue is authored by a community GitHub account, and the first-person
"we are going to be calling this" and "we're now committed to shipping" language
is in that account's own update, not in a reply I could confirm as Anthropic's.
The environment variable name, the default-off status, the "weeks" timing, and
the v267/v268 build numbers are all correctly reported, but they come from that
one issue, not from Anthropic's documentation or changelog.

**Design conclusion.** Treat function hooks as not available. Nothing in the
project knowledge system should depend on them. Re-check the hooks reference and
the changelog before the build starts.

## (a) Does `PreToolUse` or `PostToolUse` fire for the Skill tool, and what is in `tool_input`?

**Fires: yes, when Claude calls the tool. No, when you type `/skillname`.**

The exact sentence, in the `UserPromptExpansion` section:

> This event covers the path `PreToolUse` doesn't: a `PreToolUse` hook matching
> the `Skill` tool fires only when Claude calls the tool, but typing `/skillname`
> directly bypasses `PreToolUse`. `UserPromptExpansion` fires on that direct path.

`ai-external-knowledge/claude-code/hooks.md:1365`; still present live at
https://code.claude.com/docs/en/hooks, fetched 2026-09-16.

Supporting facts:

- `Skill` is a real built-in tool. The tools reference row reads: "`Skill` |
  Executes a skill within the main conversation | Permission required: Yes"
  (https://code.claude.com/docs/en/tools-reference, fetched 2026-09-16).
- Permission rule syntax is `Skill(name)` for an exact match and `Skill(name *)`
  for a prefix match with any arguments (`skills.md:752-763`). Because `if` uses
  permission rule syntax and matches tool name plus arguments together
  (`hooks.md:430`), an `if: "Skill(remember *)"` filter on a `PreToolUse` hook is
  the supported way to target one skill.
- `PostToolUse` "Matches on tool name, same values as PreToolUse"
  (`hooks.md:1928`), so a `Skill` matcher on `PostToolUse` should work the same
  way. **This is my inference from that sentence. The docs never name the Skill
  tool in a `PostToolUse` example.**

**What `tool_input` holds: not documented.** The `PreToolUse` input section gives
per-tool schemas for Bash, PowerShell, Write, Edit, Read, Glob, Grep, WebFetch,
WebSearch, Agent, AskUserQuestion, and ExitPlanMode. There is no Skill entry
(`hooks.md:1584-1739`, unchanged live). The tools reference does not document the
Skill tool's parameters either. From the permission syntax `Skill(name *)`, the
input must carry a skill name and an argument string, but the field names are not
published. **Verify by running a logging hook before designing around them.**

## (b) Does a skill's `hooks` frontmatter register hooks, and does `once` exist?

**Yes to both.**

Frontmatter field: "`hooks` | No | Hooks that Claude Code registers when the skill
is invoked and keeps running for the rest of the session"
(`skills.md:353`, unchanged live).

Scope: "Skill hooks: Claude Code registers them when you or Claude invoke the
skill and keeps running them for the rest of the session, on turns after the
skill's own turn as well. To have Claude Code remove a hook after its first
successful run instead, set `once: true` on it." (`hooks.md:668`, unchanged
live.)

`once`: "If `true`, Claude Code removes the hook after its first successful run.
A run that fails, blocks with exit code 2, or times out leaves the hook in place,
so it runs again on the next matching event. **Only honored for hooks declared in
skill frontmatter; ignored in settings files and agent frontmatter.**"
(`hooks.md:433`, unchanged live.)

Two other facts to carry into the design:

- The hook config is written in YAML in the frontmatter, in the same shape as a
  settings file (`hooks.md:674-685`).
- A project skill's frontmatter hooks are registered "including in a `-p` run in
  a folder you haven't trusted" (`hooks.md:689`). Project *subagent* frontmatter
  hooks, by contrast, need the workspace trust dialog (`hooks.md:691`). Skill
  hooks are the weaker gate; a skill checked into a repository can register hooks
  in a folder the user never trusted.
- The capture said "All hook events are supported." That sentence is gone from
  the live page. Do not rely on it.

## (c) Does a skill body's `!`command`` run every time the skill is invoked?

**Yes.** Two statements together make it certain:

- "The `` !`<command>` `` syntax runs shell commands before the skill content is
  sent to Claude" (`skills.md:603`).
- "When Claude re-invokes a skill whose rendered content is identical to the copy
  already in context, Claude Code adds a short note that the skill is already
  loaded rather than a second copy of the content. When the rendered content
  differs, because the arguments changed **or a dynamic context command produced
  new output**, Claude Code appends the full content again." (`skills.md:520`.)

The second sentence only makes sense if the command runs on every invocation and
its new output is compared. Both sentences are unchanged live.

Rules that matter for a save-review skill:

- "Substitution runs once over the original file." Output is inserted as plain
  text and is not re-scanned, so a command cannot emit a placeholder for a later
  pass (`skills.md:625`).
- The inline form is recognized only when `!` starts a line or follows
  whitespace. `` KEY=!`cmd` `` stays literal (`skills.md:627`).
- **A failed command aborts the whole invocation.** Claude never sees the skill
  content for that invocation. Any non-zero exit under the default `bash` shell
  counts as a failure, except exit code 1 from the listed search and comparison
  commands. Append `|| true` to anything you expect to exit non-zero
  (`skills.md:664-675`).
- The commands run through the Bash tool in the session shell's current working
  directory, which moves when Claude runs `cd`. Use `${CLAUDE_SKILL_DIR}` or
  `${CLAUDE_PROJECT_DIR}` for paths that must resolve the same way every time
  (`skills.md:655-660`).
- `disableSkillShellExecution` in managed settings replaces every command with
  `[shell command execution disabled by policy]` (`skills.md:639`).
- Live change: in auto mode, a command that needs approval no longer aborts the
  invocation. The skill loads with an instruction telling Claude to run the
  command first (https://code.claude.com/docs/en/skills, fetched 2026-09-16).

## (d) Can a plugin ship `.claude/rules` files or CLAUDE.md content?

**No. It can ship hooks, skills, agents, commands, MCP servers, LSP servers,
output styles, themes, monitors, workflows, and a `bin/` directory. Not rules,
not CLAUDE.md.**

The direct statement:

> A `CLAUDE.md` file at the plugin root is not loaded as project context. Plugins
> contribute context through skills, agents, and hooks rather than CLAUDE.md. To
> ship instructions that load into Claude's context, put them in a skill.

`ai-external-knowledge/claude-code/plugins-reference.md:905`; still present live
at https://code.claude.com/docs/en/plugins-reference, fetched 2026-09-16.

Supporting evidence:

- The file-locations table lists exactly these components: Manifest, Skills,
  Commands, Agents, Workflows, Output styles, Themes, Hooks, MCP servers, LSP
  servers, Monitors, Executables, Settings. There is no rules row
  (`plugins-reference.md:907-923`, unchanged live).
- The manifest's component path fields are `skills`, `commands`, `agents`,
  `workflows`, `hooks`, `mcpServers`, `outputStyles`, `lspServers`,
  `experimental.themes`, `experimental.monitors`, `userConfig`, `channels`,
  `dependencies`. No rules field (`plugins-reference.md:540-556`).
- A plugin's own `settings.json` "Only the `agent` and `subagentStatusLine` keys
  are supported" (`plugins-reference.md:923`), so a plugin cannot even ship a
  `claudeMd` value through settings.

**What this means for the design.** Anything a plugin should put in every session
has to be a skill. A skill's description costs tokens every turn, and its body
loads only on invocation. That is not the same as an always-loaded rule. If the
project knowledge system needs always-loaded text in a project, that text has to
be written into the project's own `CLAUDE.md` or `.claude/rules/` at setup time
by something like `project-init`, not shipped by a plugin.

One near-miss: a plugin *can* ship a skill with `paths` frontmatter, which is the
closest plugin-shippable analogue of a path-scoped rule (`skills.md:354`). It
loads on a matching file, but by model choice, not by the harness.

## (e) Do settings-file and plugin hooks run inside subagents?

**Yes.** The exact sentence:

> Hooks from settings files, managed policy settings, and plugins also run inside
> subagents. When a subagent calls a tool, tool events such as `PreToolUse` and
> `PostToolUse` fire the same configured hooks as in the main conversation, and
> the input carries the `agent_id` and `agent_type` common input fields that
> identify the subagent.

`ai-external-knowledge/claude-code/hooks.md:270`; unchanged live at
https://code.claude.com/docs/en/hooks, fetched 2026-09-16.

Details worth carrying:

- `agent_id` is "present only when the hook fires inside a subagent call. Use this
  to distinguish subagent hook calls from main-thread calls" (`hooks.md:743`).
- A subagent's own frontmatter hooks run only while it runs, and a `Stop` hook
  there becomes `SubagentStop` (`hooks.md:667`).
- Skill hooks are registered for the rest of the session in the context where the
  skill was invoked; the docs do not say a skill hook registered in the main
  conversation also fires inside a later subagent. **Unverified.**
- A subagent gets CLAUDE.md and rules, but **not** the main conversation's auto
  memory and **not** the output style (`sub-agents.md:1036`, `:1047-1048`).

## (f) What exactly is re-injected after compaction?

The table in Section 2 job (b) is the answer. In short:

| Re-injected from disk, ENFORCED | Project-root CLAUDE.md, unscoped `.claude/rules/*.md`, auto memory, the plan mode plan |
| Re-injected with a cap | Invoked skill bodies: 5,000 tokens per skill, 25,000 tokens total, oldest dropped first, truncation keeps the start of the file |
| Re-read, up to five | Files Claude read or edited, most recently modified first. A file over 5,000 tokens comes back as a path reference with no content |
| Reloaded only on a later trigger | Rules with `paths:`, nested CLAUDE.md in subdirectories |
| Re-run | `SessionStart` hooks whose matcher includes `compact` |
| Not re-injected | Earlier hook output. It is summarized with the rest of the conversation |
| Not re-injected | Skill *descriptions*, per the live interactive text: "Skill descriptions don't reload" |

Sources: `ai-external-knowledge/claude-code/context-window.md:1601-1616`;
`ai-external-knowledge/claude-code/skills.md:522`;
`ai-external-knowledge/claude-code/memory.md:463-467`;
https://code.claude.com/docs/en/context-window, fetched 2026-09-16.

Also: `PostCompact` fires after and receives `compact_summary`, but it has no
decision control and cannot add context (`hooks.md:3010-3036`). The way to add
context after compaction is the `SessionStart` hook with the `compact` matcher,
not `PostCompact`.

## (g) The hook output cap, and what happens above it

**10,000 characters, per string.**

> Hook output strings, including `additionalContext`, `systemMessage`, and plain
> stdout, are capped at 10,000 characters. Output that exceeds this limit is saved
> to a file and replaced with a preview and file path, the same way a large valid
> Bash result is handled under Output limits.

`ai-external-knowledge/claude-code/hooks.md:916`; unchanged live.

And again for `additionalContext` specifically: "If a value exceeds 10,000
characters, Claude Code writes the text to a file in the session directory and
passes Claude the file path with a short preview instead"
(`hooks.md:996`; the live page splits this into its own paragraph and drops the
word "full").

So oversized output is **not** truncated and **not** dropped. Claude gets a
preview and a path, and has to spend a `Read` call to see the rest. For a startup
hook that delivers a manual, that means the manual arrives as a file path, which
turns ENFORCED delivery back into a REMINDED read. Keep each hook's output under
10,000 characters, or split it across several handlers on the same event: "When
several hooks return `additionalContext` for the same event, Claude receives all
of the values" (`hooks.md:996`).

Two separate caps not to confuse with this one:

- `classifierContext` on `PostToolUse` is capped at 2,000 characters for one tool
  call, shared across every hook that responds (`hooks.md:2022`).
- The skill listing caps combined `description` plus `when_to_use` at 1,536
  characters per skill (`skills.md:340`).

**A note the WebFetch summary got wrong.** When I asked WebFetch to read the live
hooks page, it reported that no character limit is documented. That is wrong. I
downloaded the page's raw Markdown and confirmed both sentences are still there.
Treat WebFetch summaries of long reference pages as unreliable for negative
claims.

## (h) Do hooks for one event run in parallel, and is output order guaranteed?

**Parallel: yes. Order: no, and the docs say so explicitly.**

> All matching hooks run in parallel. If you define the same handler in more than
> one settings file, it runs once. A plugin's or skill's copy of the same handler
> stays separate.

`ai-external-knowledge/claude-code/hooks.md:417`; unchanged live.

> When multiple hooks match the same event, every hook's command runs to
> completion before Claude Code merges the results. One hook returning `deny`
> doesn't stop sibling hooks from executing. Don't rely on one hook's `deny` to
> suppress side effects in another hook.

> When multiple `PreToolUse` hooks return `updatedInput` to rewrite a tool's
> arguments, the last one to finish takes effect. **Since hooks run in parallel,
> the order is non-deterministic.** Avoid having more than one hook modify the
> same tool's input.

https://code.claude.com/docs/en/hooks-guide, "Combine results from multiple
hooks" and "Limitations", fetched 2026-09-16.

How results are merged, which is deterministic even though order is not:

- `PreToolUse` permission decisions: the most restrictive wins, in the order
  `deny`, `defer`, `ask`, `allow` (`hooks.md:1752`).
- `additionalContext`: every hook's value is kept and passed to Claude together
  (`hooks.md:996`).
- `updatedInput`: last to finish wins. Non-deterministic. Use one hook.

**Design consequence for job (a).** If you need three files delivered in a known
order, they must come from **one** hook handler's stdout, not three handlers.
Three handlers on `SessionStart` give you all three values but in no guaranteed
order.

---

# Section 5. Open uncertainties

1. **The Skill tool's `tool_input` schema is undocumented.** I confirmed that a
   `PreToolUse` hook matching `Skill` fires when Claude calls the tool, and that
   permission rules use `Skill(name)` and `Skill(name *)`. I could not find the
   field names inside `tool_input`. Resolve this before designing a hook that
   reads them: add a `PostToolUse` hook with matcher `Skill` that dumps stdin to a
   file, invoke a skill, and read the file.

2. **Whether `PostToolUse` fires for the Skill tool.** Inferred from "Matches on
   tool name, same values as PreToolUse" (`hooks.md:1928`). Never stated
   directly for `Skill`. Same experiment resolves it.

3. **Whether a skill-registered hook fires inside a subagent spawned later in the
   session.** The docs say settings, managed, and plugin hooks run inside
   subagents, and separately that skill hooks persist for the rest of the session.
   They never combine the two claims. Unverified.

4. **The function hooks / Mods situation.** I verified that nothing about them
   appears in the live documentation, the live changelog, or the live page index.
   I verified the content of issue #91870 through its public HTML page. I could
   **not** verify whether its author speaks for Anthropic, whether Anthropic staff
   replied, or whether `anthropics/claude-code/tree/main/mods` exists, because
   this session cannot reach the GitHub API for that repository and `gh` is not
   installed. A session with GitHub access should check the author association and
   any staff reply before the design treats the timeline as credible.

5. **Where a hook's oversized output file is written.** The docs say "a file in
   the session directory" and "saved to a file", but do not give the path, name,
   or lifetime. If the design needs to clean those up, or to read one back, find
   the path empirically.

6. **The exact `tool_response` shape for a `Skill` call.** Not documented, so a
   `PostToolUse` hook cannot be designed against it yet.

7. **How reliable `bashEditDiff` is in practice.** It is new (v2.1.269), in public
   beta, and the docs warn the field shape may change and that Claude Code can
   miss a change or include another process's. Do not build a gate on it. It is
   usable as a hint for a review step.

8. **Whether an `InstructionsLoaded` hook can be used as proof of delivery in
   time.** It "runs asynchronously for observability purposes"
   (`hooks.md:1266`). The docs do not say whether it has finished by the time the
   first model request goes out. If the design needs a startup check to read that
   log, there may be a race.

9. **The captured docs are 12 days old.** Claude Code shipped 12 releases in that
   window (2.1.263 through 2.1.273). The capture will be older still when the
   build starts. Run `node .claude/tools/capture-claude-code-docs.mjs` before the
   design is written, and re-read the hooks and skills pages then.

10. **Third-party reporting on function hooks exists but I did not rely on it.**
    A web search surfaced https://claudefa.st/blog/tools/hooks/function-hooks,
    which describes a TypeScript hooks module, a `$` affordances object, and a
    build 2.1.260 carrying the runtime. It is a third-party blog, not Anthropic,
    and I did not verify any of its specific claims. Noted only so the next reader
    knows it exists and knows its status.

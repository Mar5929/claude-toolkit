# OpenAI Codex as a second harness for the project knowledge system

Written 2026-09-16.

## How to read the citations

Three kinds of source appear in this file.

1. `repo:<path>:<lines>` means a file in `/home/user/claude-toolkit`, the
   repository this report is about.
2. `codex:<path>:<lines>` means a file in the OpenAI Codex source code. I
   cloned `https://github.com/openai/codex` to `/home/user/openai/codex` on
   2026-09-16. The clone is at commit
   `977193486dfe7a88c4dab24abeafe9b754f5b13f`, committed 2026-09-16. That is the
   tip of the `main` branch on that day.
3. A full URL plus the date I fetched it.

## What I could and could not verify

The official Codex documentation site is blocked from this machine. A WebFetch
of `https://developers.openai.com/codex/hooks` on 2026-09-16 returned
`EGRESS_BLOCKED: Access to developers.openai.com is blocked by the network
egress proxy`. So I could not read any page on that site.

The Markdown files in the Codex repository's `docs/` folder are stubs. Each one
is two or three lines that link to the blocked site. For example
`codex:docs/agents_md.md:1-3` is the whole file, and it says "For information
about AGENTS.md, see [this documentation]". `codex:docs/skills.md:1-3` and
`codex:docs/config.md:1-7` are the same shape.

So everything below about Codex behavior comes from reading the Rust source
code in the clone. Source code is stronger evidence than documentation for what
the program does. It is weaker evidence for what OpenAI promises to keep doing.
Treat every fact below as "true of this build" and re-check before you depend
on it.

I also checked the releases page. A WebFetch of
`https://github.com/openai/codex/releases` on 2026-09-16 returned the newest tag
as `0.155.0-alpha.10`, published September 16. The release notes did not load,
so I could not read them. The repository's `CHANGELOG.md` is one line that
points at the same releases page (`codex:CHANGELOG.md:1`).

What I did not verify at all:

- The behavior of the Codex IDE extension and the Codex app. I only read the
  Rust code, which is shared by the CLI, the TUI, and the app server. I found no
  code that changes hook behavior per front end, but I did not prove that.
- Anything about a Codex Cloud or web version.
- Whether the numbers below (timeouts, byte limits) are stable across releases.

---

## Section 1. What Codex gives you

| Mechanism | What it does | When it runs or loads | What it can return, add, or block | State it can keep | Source |
|---|---|---|---|---|---|
| `AGENTS.md` (root) | A Markdown file of instructions for the agent. Its text is put into the model's context as a user-role instruction block. | At session start, and again whenever the session's environment or working directory changes. Also re-sent after compaction. | Text only. It cannot block anything. It cannot run code. | None. It is a file. | `codex:codex-rs/core/src/agents_md.rs:1-18`, `codex:codex-rs/core/src/context/world_state/agents_md.rs:9-11` |
| `AGENTS.md` (nested) | Codex collects every `AGENTS.md` from the project root down to the current working directory, inclusive, and joins them in that order. | Same as the root file. | Same as the root file. | None. | `codex:codex-rs/core/src/agents_md.rs:7-18`, `codex:codex-rs/core/src/agents_md.rs:189-240` |
| `AGENTS.override.md` | A local override name. In each directory Codex tries `AGENTS.override.md` first, then `AGENTS.md`, then any configured fallback names. The first file that exists in that directory wins. | Same as `AGENTS.md`. | Same. | None. | `codex:codex-rs/core/src/agents_md.rs:44-45`, `codex:codex-rs/core/src/agents_md.rs:270-297` |
| `project_doc_max_bytes` (config key) | A total byte budget for all `AGENTS.md` content in one session. The default is 32768 bytes (32 KiB). Once the budget runs out, no more files are read. | Read from `config.toml` at startup. | Nothing. It is a limit. | None. | `codex:codex-rs/config/src/config_toml.rs:74`, `codex:codex-rs/config/src/config_toml.rs:314-315`, `codex:codex-rs/core/src/agents_md.rs:68-92` |
| `project_doc_fallback_filenames` (config key) | Extra filenames to try in each directory after `AGENTS.md`. Default is an empty list. Entries containing a path separator are ignored. | Startup. | Nothing. | None. | `codex:codex-rs/config/src/config_toml.rs:318-319`, `codex:codex-rs/config/src/config_toml.rs:83-85`, `codex:codex-rs/core/src/agents_md.rs:270-297` |
| `project_root_markers` (config key) | Names that mark the project root. The walk up the folder tree stops there. Default is `[".git"]`. An empty list turns off the walk. | Startup. | Nothing. | None. | `codex:codex-rs/config/src/project_root_markers.rs:5`, `codex:codex-rs/config/src/project_root_markers.rs:45-50`, `codex:codex-rs/core/src/agents_md.rs:10-14` |
| Untrusted project | If the project is marked untrusted, Codex loads no `AGENTS.md` at all. | Startup. | Nothing. | None. | `codex:codex-rs/core/src/agents_md.rs:64-67` |
| `config.toml` | The main settings file. It is layered: packaged defaults, MDM, system, enterprise, user, project, session flags. Later layers win. The project layer is the `.codex` folder in the project. | Startup. | Settings only. | It is the file where hook trust is stored. | `codex:codex-rs/config/src/config_layer_source.rs:6-28`, `codex:codex-rs/config/src/config_layer_source.rs:33-47` |
| `hooks.json` | A JSON file of lifecycle hooks. Codex looks for `hooks.json` next to each layer's `config.toml`. In practice that means `<project>/.codex/hooks.json` and `~/.codex/hooks.json`. | Read at startup, once per folder. | See the hook rows below. | The hook script can write files. | `codex:codex-rs/hooks/src/engine/discovery.rs:146-151`, `codex:codex-rs/hooks/src/engine/discovery.rs:339-379` |
| Hooks in `config.toml` | The same hook data can live under a `hooks` key in `config.toml` instead. If a layer has both, Codex loads both and prints a warning. | Startup. | Same as `hooks.json`. | Same. | `codex:codex-rs/hooks/src/engine/discovery.rs:152-165`, `codex:codex-rs/hooks/src/engine/discovery.rs:381-400` |
| Hook events (12) | `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `SubagentStart`, `SubagentStop`, `Stop`, `Interrupt`. These are the exact JSON key names. | See the event table in Section 1b. | See the event table. | None by itself. | `codex:codex-rs/config/src/hook_config.rs:36-61`, `codex:codex-rs/protocol/src/protocol.rs:1579-1592` |
| Hook handler type `command` | Runs a shell command. Fields: `command`, `commandWindows`, `timeout`, `async`, `statusMessage`, `additionalContextLimit`. | When its event fires and its matcher matches. | The command prints JSON on stdout. What that JSON may contain depends on the event. | The script can write any file it likes. | `codex:codex-rs/config/src/hook_config.rs:163-186` |
| Hook handler type `mcp_tool` | Calls a tool on a configured MCP server instead of running a shell command. Fields: `server`, `tool`, `input`, `timeout`, `statusMessage`. | Same. | Same shape of result. | Whatever the MCP server keeps. | `codex:codex-rs/config/src/hook_config.rs:187-196` |
| Hook handler types `prompt` and `agent` | Two more handler kinds exist in the config schema. I did not trace what they do. | Unknown. | Unknown. | Unknown. | `codex:codex-rs/config/src/hook_config.rs:198-200`, `codex:codex-rs/protocol/src/protocol.rs:1596-1601` |
| `matcher` | One string per hook group. Empty or `*` matches everything. A string of only letters, digits, `_` and `|` is an exact list: it is split on `|` and compared for equality. Anything else is a regular expression. | Evaluated when the event fires. | Nothing. It selects. | None. | `codex:codex-rs/hooks/src/events/common.rs:137-173` |
| `timeout` | Seconds. The default is 600 for most events. For `SessionEnd` and `Interrupt` the default is 1 second and the value is clamped to a maximum of 3 seconds. | Per handler run. | Nothing. | None. | `codex:codex-rs/hooks/src/engine/discovery.rs:742-764`, `codex:codex-rs/hooks/src/events/session_end.rs:20-23` |
| `additionalContextLimit` | An approximate token threshold. If the hook's `additionalContext` is larger, Codex writes the full text to a file under the OS temp folder and gives the model a short preview plus the file path. Unset means 2500 tokens. `0` turns spilling off. | Per handler run. | Nothing. | The spilled file lives at `<temp>/hook_outputs/<thread_id>/<uuid>.txt`. | `codex:codex-rs/config/src/hook_config.rs:176-185`, `codex:codex-rs/hooks/src/output_spill.rs:11-80` |
| `commandWindows` | On Windows this string replaces `command` completely. On other systems it is ignored. | Per handler run. | Nothing. | None. | `codex:codex-rs/hooks/src/engine/discovery.rs:503-517` |
| Hook shell | On Unix the command runs through `$SHELL -lc`, falling back to `/bin/sh -lc`. On Windows it runs through `%COMSPEC%`, falling back to `cmd.exe /C`. The environment is a saved session snapshot, not the live process environment. | Per handler run. | Nothing. | None. | `codex:codex-rs/hooks/src/engine/command_runner.rs:427-455` |
| `if` and `once` | **These fields do not exist in Codex.** The hook handler struct has no `if` and no `once`. `MatcherGroup` has only `matcher` and `hooks`. Only `HooksFile` itself rejects unknown fields, so an `if` or `once` written inside a handler is silently ignored rather than reported. | Never. | Nothing. | None. | `codex:codex-rs/config/src/hook_config.rs:10-17`, `codex:codex-rs/config/src/hook_config.rs:154-200` (I grepped the whole `hooks` and `config` crates for `once` and `if` fields and found none) |
| Hook trust | A hook only runs if it is `Trusted` or `Managed`, or if the bypass flag is on. Trust is a hash of the normalized hook definition, stored per user under `hooks.state.<key>.trusted_hash` in the user's `config.toml`. Change the hook and it becomes `Modified` and stops running until re-approved. | Checked at discovery time. | Nothing. | The trust record is per machine and per user. It is not in the repository. | `codex:codex-rs/hooks/src/engine/discovery.rs:712-725`, `codex:codex-rs/hooks/src/engine/discovery.rs:794-811`, `codex:codex-rs/tui/src/hooks_rpc.rs:58-92`, `codex:codex-rs/hooks/src/config_rules.rs:8-14` |
| Hook trust prompt | On startup the TUI shows a review screen: "Hooks need review / N hooks are new or changed / Hooks can run outside the sandbox after you trust them", with three choices: review, trust all and continue, continue without trusting (hooks won't run). | Startup, when any hook is new or changed. | Nothing. | Writes the trust hashes. | `codex:codex-rs/tui/src/snapshots/codex_tui__startup_hooks_review__tests__startup_hooks_review_prompt.snap:1-12`, `codex:codex-rs/tui/src/startup_hooks_review.rs:66-80` |
| Trust bypass flag | `--dangerously-bypass-hook-trust` runs untrusted hooks anyway. It works on `codex` and `codex resume`. The one non-interactive hook test in the repository uses this flag. | Per run. | Nothing. | None. | `codex:codex-rs/cli/src/main.rs:3913`, `codex:codex-rs/cli/src/main.rs:4433-4438`, `codex:codex-rs/exec/tests/suite/hooks.rs:7-38` |
| Admin lockout | An administrator can set `allow_managed_hooks_only = true` in `requirements.toml`. Then user, project and session hooks are all ignored. | Startup. | Nothing. | None. | `codex:docs/config.md:9-15`, `codex:codex-rs/hooks/src/engine/discovery.rs:107-116` |
| Skills | A folder holding a `SKILL.md` with YAML frontmatter. Recognized frontmatter fields are `name`, `description`, and `metadata.short-description`. `description` is required. `name` may be at most 64 characters. | Loaded at session start and refreshed per turn. | Text for the model. | None. | `codex:codex-rs/skills/src/parser.rs:5-90` |
| Skill locations | `<project>/.codex/skills`, every `.agents/skills` folder from the project root down to the working directory, `~/.agents/skills`, `~/.codex/skills` (marked deprecated in the code), `~/.codex/skills/.system` for built-in skills, a system-wide folder, and any folder a plugin contributes. | Startup and per turn. | Text. | None. | `codex:codex-rs/ext/skills/src/host_roots.rs:73-131`, `codex:codex-rs/ext/skills/src/host_roots.rs:136-183`, `codex:codex-rs/skills/src/lib.rs:56-67` |
| Skill invocation | A skill can be named explicitly in a message with a `$name` mention. There is also implicit selection. I verified the explicit path in `codex:codex-rs/skills/src/mentions.rs` and `codex:codex-rs/skills/src/selection.rs` exist and are wired to `collect_explicit_skill_mentions` (`codex:codex-rs/skills/src/lib.rs:44`). I did not trace the exact wording Codex shows the model for implicit selection. | Per turn. | Text. | None. | `codex:codex-rs/skills/src/lib.rs:40-44`, `codex:codex-rs/core/src/skills.rs:38-72` |
| Plugin manifest | A plugin is a folder with a manifest. Codex looks for `.codex-plugin/plugin.json`, then `.claude-plugin/plugin.json`, then `.cursor-plugin/plugin.json`. It also accepts a top-level `plugin.json` that declares the Agent Plugins v1 schema. | Plugin load. | See next row. | None. | `codex:codex-rs/exec-server-protocol/src/protocol.rs:47-51`, `codex:codex-rs/utils/plugins/src/plugin_namespace.rs:11-17`, `codex:codex-rs/utils/plugins/src/lib.rs:44` |
| What a plugin may ship | `name`, `version`, `description`, `keywords`, `skills`, `mcpServers`, `apps`, `hooks`, `interface`. `hooks` may be a path, a list of paths, an inline hooks object, or a list of them. **Plugin hooks exist.** | Plugin load. | Hooks, skills, MCP servers. | None. | `codex:codex-rs/core-plugins/src/manifest.rs:45-67`, `codex:codex-rs/core-plugins/src/manifest.rs:413-440`, `codex:codex-rs/hooks/src/declarations.rs:11-33` |
| Plugin `commands/` | A plugin's `commands/` folder is converted into skills when the plugin loads. Each command file becomes a migrated skill, capped at 4000 bytes. | Plugin load. | Skills. | None. | `codex:codex-rs/core-plugins/src/command_migration/plugin.rs:16-52` |
| Marketplace | Codex reads a marketplace manifest from `.agents/plugins/marketplace.json`, `.agents/plugins/api_marketplace.json`, `.claude-plugin/marketplace.json`, or `.cursor-plugin/marketplace.json`. | Marketplace install and startup sync. | A list of plugins. | None. | `codex:codex-rs/core-plugins/src/marketplace.rs:20-24` |
| Rules with path scoping | **Codex has nothing like `.claude/rules/` and nothing like `paths:` frontmatter.** The only folder-level scoping is nested `AGENTS.md`, and that only covers the folders on the path from the project root to the working directory. A file in a sibling folder the agent edits but never enters does not pull in that folder's `AGENTS.md`. | n/a | n/a | n/a | `codex:codex-rs/core/src/agents_md.rs:189-240` (the discovery walk), and my grep of the whole `codex-rs` tree found no rules-directory loader |
| MCP servers | Configured under `mcp_servers` in `config.toml`, as a map of name to server config. A plugin may also ship MCP servers. MCP tools appear to hooks with names like `mcp__<server>__<tool>`. | Startup. | Tools. | Whatever the server keeps. | `codex:codex-rs/config/src/config_toml.rs:277-278`, `codex:codex-rs/core/src/tools/handlers/mcp.rs:96` |
| MCP elicitation | An MCP server can raise a structured question to the person. Codex has an elicitation channel. | During an MCP tool call. | A structured answer. | None. | `codex:codex-rs/core/src/tools/handlers/mod.rs:449`, `codex:codex-rs/core/src/tools/handlers/request_plugin_install.rs:248-280` |
| Subagents | Codex can spawn sub-agents. The hook tool name is `spawn_agent`, with `Agent` accepted as a matcher alias. Agent roles are TOML files in an `agents` folder next to a `config.toml`, so `<project>/.codex/agents/*.toml` and `~/.codex/agents/*.toml`. A role file has `name`, `description`, `nickname_candidates`, and config overrides. | On demand. | A sub-agent run. | None. | `codex:codex-rs/core/src/tools/hook_names.rs:41-51`, `codex:codex-rs/agent-roles/src/loader.rs:75-80`, `codex:codex-rs/agent-roles/src/agent_role_config.rs:20-35` |
| Session resume | `codex resume` continues a stored session. The hook `SessionStart` event then reports `source: "resume"`. | On resume. | n/a | n/a | `codex:codex-rs/cli/src/main.rs:4433-4438`, `codex:codex-rs/core/src/session/session.rs:1826-1834` |
| Compaction | Compaction builds a fresh history window. It re-renders the initial context, which includes the `AGENTS.md` instruction block, then adds the summary and the most recent user messages that fit a token budget. | When the context fills, or on demand. | n/a | n/a | `codex:codex-rs/core/src/compact.rs:92-112`, `codex:codex-rs/core/src/compact.rs:666-712` |
| What survives compaction | The re-rendered initial context (including `AGENTS.md`), the summary, recent user messages, and hook prompt items. Developer-role messages survive only when the client authored them and retention is on. | n/a | n/a | n/a | `codex:codex-rs/core/src/compact_remote_v2.rs:552-595` |
| `notify` | A legacy config key holding a command line. Codex runs it when an agent turn completes and appends a JSON payload as the last argument. The payload type is `agent-turn-complete` and carries `thread_id`, `turn_id`, `cwd`, `client`, `input_messages`, and `last_assistant_message`. The source comments call it legacy and plan to remove it. | After a turn. | Nothing back into the session. | None. | `codex:codex-rs/config/src/config_toml.rs:227-229`, `codex:codex-rs/hooks/src/legacy_notify.rs:13-44` |
| Transcripts on disk | JSONL files under `$CODEX_HOME/sessions`, laid out by year, month and day, named `rollout-<timestamp>-<thread-id>.jsonl`. `CODEX_HOME` is normally `~/.codex`. Archived threads go under `archived_sessions`. Hooks receive the path in their `transcript_path` input field. | Written as the session runs. | n/a | The whole conversation. | `codex:codex-rs/rollout/src/lib.rs:84-85`, `codex:codex-rs/rollout/src/recorder.rs:82-83`, `codex:codex-rs/rollout/src/metadata.rs:106-108`, `codex:codex-rs/core/src/session/mod.rs:4916-4928` |
| Built-in memories | Codex has its own automatic memory pipeline. It reads past session transcripts with a model, writes memories, and injects them as developer instructions. It runs in the background when a root session starts. Config lives under `memories` in `config.toml`, including `generate_memories` and `use_memories`. | Root session start. | Developer-role text, capped near 8900 bytes. | Its own store. | `codex:codex-rs/memories/README.md:29-40`, `codex:codex-rs/config/src/types.rs:296-326`, `codex:codex-rs/core/src/context/memory.rs:1-44` |

### Section 1b. What each hook event can do

Input field names are `snake_case`. Output field names are `camelCase`.

| Event | Matcher matches on | Can it block? | Can it add text to the model's context? | Other output | Source |
|---|---|---|---|---|---|
| `SessionStart` | `startup`, `resume`, `clear`, `compact`, `fork` | No | **Yes.** `hookSpecificOutput.additionalContext`. | `continue`, `stopReason`, `suppressOutput`, `systemMessage` | `codex:codex-rs/hooks/schema/generated/session-start.command.input.schema.json`, `.../session-start.command.output.schema.json`, `codex:codex-rs/hooks/src/events/session_start.rs:24-39` |
| `UserPromptSubmit` | No matcher. Any matcher is ignored. | **Yes.** `decision: "block"` plus `reason`. | **Yes.** `additionalContext`. | `continue`, `stopReason`, `suppressOutput`, `systemMessage`. Input includes the full `prompt`. | `.../user-prompt-submit.command.input.schema.json`, `.../user-prompt-submit.command.output.schema.json`, `codex:codex-rs/hooks/src/events/common.rs:112-128` |
| `PreToolUse` | Tool name | **Yes.** `decision: "block"` plus `reason`, or `hookSpecificOutput.permissionDecision` of `allow`, `deny`, or `ask`. | **Yes.** `additionalContext`. | `updatedInput` rewrites the tool's arguments. | `.../pre-tool-use.command.output.schema.json`, `codex:codex-rs/hooks/src/events/pre_tool_use.rs:37-44` |
| `PermissionRequest` | Tool name | **Yes.** `hookSpecificOutput.decision.behavior` of `allow` or `deny`, plus `message`. | No | `updatedInput` and `updatedPermissions` are reserved and currently fail closed. | `.../permission-request.command.output.schema.json` |
| `PostToolUse` | Tool name | `decision: "block"` plus `reason` | **Yes.** `additionalContext`. | `updatedMCPToolOutput`. Input includes `tool_input` and `tool_response`. | `.../post-tool-use.command.output.schema.json`, `.../post-tool-use.command.input.schema.json` |
| `Stop` | No matcher | **Yes.** `decision: "block"` plus `reason`. The reason is turned into a hook prompt that continues the turn. | Only through the block reason. There is no `additionalContext` field. | `continue`, `stopReason`, `suppressOutput`, `systemMessage`. Input includes `last_assistant_message` and `stop_hook_active`. | `.../stop.command.output.schema.json`, `.../stop.command.input.schema.json`, `codex:codex-rs/hooks/src/events/stop.rs:312-322`, `codex:codex-rs/hooks/src/events/stop.rs:391-398` |
| `SubagentStart` | Agent type | No | Schema exists; I did not read its fields. | | `.../subagent-start.command.output.schema.json` |
| `SubagentStop` | Agent type | **Yes.** `decision: "block"` plus `reason`. | No `additionalContext`. | Same universal fields. | `.../subagent-stop.command.output.schema.json` |
| `PreCompact` | `manual` or `auto` | No | **No.** The output schema has only `continue`, `stopReason`, `suppressOutput`, `systemMessage`. | | `.../pre-compact.command.output.schema.json` |
| `PostCompact` | `manual` or `auto` | No | **No.** Same four fields only. Input carries `trigger`. | | `.../post-compact.command.output.schema.json`, `.../post-compact.command.input.schema.json` |
| `SessionEnd` | Yes, a matcher is allowed | No | **No.** There is no output schema file for `SessionEnd` at all. Timeout defaults to 1 second and is capped at 3. | Input carries `reason`. | `.../session-end.command.input.schema.json`, `codex:codex-rs/hooks/src/events/session_end.rs:20-23` |
| `Interrupt` | No matcher | No | **No.** Output has only `systemMessage`. Same 1 to 3 second timeout cap. | | `.../interrupt.command.output.schema.json`, `codex:codex-rs/hooks/src/engine/discovery.rs:748-761` |

### Does `PreToolUse` cover file writes?

Yes. This is the single most important answer in this report, and the peer
report that asked the question was right to ask.

Codex edits files with a tool called `apply_patch`. When that tool is about to
run, Codex fires `PreToolUse` with `tool_name` set to `apply_patch` and with two
matcher aliases, `Write` and `Edit`. The comment in the source says the aliases
exist "for compatibility with hook configurations that describe edits using
Claude Code-style names" (`codex:codex-rs/core/src/tools/hook_names.rs:28-39`).

So a matcher of `Edit|Write` written for Claude Code also matches file edits in
Codex. That matcher string is letters and `|` only, so Codex treats it as an
exact list and compares each part to `apply_patch`, `Write`, and `Edit`
(`codex:codex-rs/hooks/src/events/common.rs:154-173`,
`codex:codex-rs/hooks/src/events/common.rs:169-173`).

`PreToolUse` is not limited to file edits and the shell. Every tool call goes
through it. Shell commands arrive as `Bash`
(`codex:codex-rs/core/src/tools/handlers/unified_exec.rs:92`). MCP tools arrive
as `mcp__<server>__<tool>` (`codex:codex-rs/core/src/tools/handlers/mcp.rs:96`).
Sub-agent spawns arrive as `spawn_agent`
(`codex:codex-rs/core/src/tools/registry.rs:834`). Anything else uses its own
flat tool name (`codex:codex-rs/core/src/tools/registry.rs:837`).

One catch matters for guarding a folder. The `tool_input` that a hook receives
for `apply_patch` is a single field: `{"command": "<the whole patch text>"}`
(`codex:codex-rs/core/src/tools/handlers/apply_patch.rs:458-463`). There is no
list of file paths. A hook that wants to know whether the patch touches
`knowledge/` has to parse the patch text itself.

---

## Section 2. Job to mechanism, for Codex

"Enforced" means the harness makes it happen whether or not the model
cooperates. "Reminded" means the model is told and may ignore it.

### a. Deliver three startup files, in order

**Enforced, with one condition.** A `SessionStart` hook whose command prints the
three files' contents as `additionalContext` puts that text into the model's
context before the first prompt
(`.../session-start.command.output.schema.json`). The condition is hook trust:
the hook does not run until the person approves it on this machine
(`codex:codex-rs/hooks/src/engine/discovery.rs:712-725`).

The fallback is the root `AGENTS.md`, which is loaded with no approval step and
can carry an instruction to read the three files in order. That is a reminder,
not enforcement.

Watch the size. If the printed text passes `additionalContextLimit` tokens
(2500 by default) Codex writes it to a temp file and hands the model a preview
and a path instead (`codex:codex-rs/hooks/src/output_spill.rs:11-80`).

### b. Get the guidance back after compaction or resume

**Enforced, two ways, and this is better than it looks.**

First, `AGENTS.md` is re-rendered into the new context window after compaction,
because compaction rebuilds the initial context from the world state
(`codex:codex-rs/core/src/compact.rs:92-112`). When the text changes, the model
is told so explicitly: "These AGENTS.md instructions replace all previously
provided AGENTS.md instructions"
(`codex:codex-rs/core/src/context/world_state/agents_md.rs:9-11`).

Second, `SessionStart` fires again after compaction with `source: "compact"`,
and on resume with `source: "resume"`
(`codex:codex-rs/core/src/session/mod.rs:4082`,
`codex:codex-rs/core/src/session/session.rs:1826-1834`,
`codex:codex-rs/hooks/src/events/session_start.rs:24-39`). So the same startup
hook re-runs and can re-inject the same text.

Do not use `PostCompact` for this. It cannot add context
(`.../post-compact.command.output.schema.json`).

### c. Review saves at the five moments

Break the five moments apart. They do not have one answer.

- **End of a turn with real work.** Use `Stop`. It fires when the agent finishes
  responding. `decision: "block"` with a `reason` turns the reason into a
  message that continues the turn, so the agent is forced to act on it
  (`codex:codex-rs/hooks/src/events/stop.rs:312-322`). `Stop` cannot inject
  quiet context; the block reason is the only channel. `stop_hook_active` in the
  input lets a hook avoid looping (`.../stop.command.input.schema.json`).
- **Before a pull request.** Use `PreToolUse` with matcher `Bash`, and have the
  hook parse the command string for `gh pr create` or `git push`. This is the
  same shape the repository already uses for Claude Code.
- **At work item close.** Same as above: it is a shell command, so it is a
  `PreToolUse` `Bash` match. If the tracker is an MCP server instead, match the
  MCP tool name.
- **Before a handoff.** Not a harness event. A handoff is something the person
  asks for. Reminded only, through `AGENTS.md` or a skill.
- **On owner request.** A skill, invoked by plain language or by `$name`.

### d. Check a write to `knowledge/`, block or warn

**Enforced, but you have to write the parser.** `PreToolUse` with matcher
`apply_patch` (or `Edit|Write`) fires before every file edit. Returning
`hookSpecificOutput.permissionDecision: "deny"` with a reason blocks it; `"ask"`
sends it to the person; `additionalContext` warns without blocking
(`.../pre-tool-use.command.output.schema.json`).

The work is that the hook gets the raw patch text and no file list
(`codex:codex-rs/core/src/tools/handlers/apply_patch.rs:458-463`). The hook has
to read the patch and find the paths. A shell write done through `Bash` is a
separate matcher and a separate parse.

### e. Small per-session state

**Possible, but nothing is provided.** Codex gives a hook no key-value store.
What it does give:

- `session_id` and `turn_id` in the hook input, so a hook can namespace a file
  it writes itself (`.../stop.command.input.schema.json`).
- `transcript_path`, the JSONL rollout file, which a hook may read
  (`codex:codex-rs/core/src/session/mod.rs:4916-4928`).
- The hook runs as an ordinary process and may write anywhere it is allowed to.

So per-session state means a file the hook writes and cleans up itself. Note
that `SessionEnd` gets at most 3 seconds to do cleanup
(`codex:codex-rs/hooks/src/events/session_end.rs:20-23`).

### f. Scope guidance to a folder or topic

**Weak.** There is no equivalent of `.claude/rules/` and no `paths:` frontmatter.

The only mechanism is a nested `AGENTS.md`, and it loads only for folders on the
path from the project root to the working directory
(`codex:codex-rs/core/src/agents_md.rs:7-18`). If the session starts at the
repository root and the agent edits `knowledge/memory/foo.md`, the
`knowledge/AGENTS.md` file is not loaded, because the working directory never
became `knowledge/`.

A workaround exists: a `PreToolUse` hook matched on file edits can read the
patch, see which folder it touches, and return `additionalContext` naming that
folder's rules. That is scoping built by hand.

### g. Run a skill from plain language

**Reminded.** Skills load from the folders listed in Section 1. A skill can be
named with `$name`, and there is implicit selection as well
(`codex:codex-rs/skills/src/lib.rs:40-44`). Whether the model picks the right
skill from a plain sentence is a model behavior, not a harness guarantee, in
both harnesses.

### h. Run a check script after an edit or before a commit

**Enforced.** After an edit: `PostToolUse` with matcher `apply_patch` or
`Edit|Write`. It can return `decision: "block"` with a reason, and it can add
`additionalContext` (`.../post-tool-use.command.output.schema.json`). Before a
commit: `PreToolUse` with matcher `Bash`, parsing for `git commit`.

### i. Ask the owner a structured question

**Not from a hook.** No hook output schema contains a question or a prompt for
the person. The closest things are:

- `permissionDecision: "ask"` on `PreToolUse`, which sends one tool call to the
  normal approval prompt (`.../pre-tool-use.command.output.schema.json`). That
  is a yes or no about one action, not a question you write.
- MCP elicitation, where an MCP server raises a structured request
  (`codex:codex-rs/core/src/tools/handlers/mod.rs:449`). A hook of type
  `mcp_tool` calls an MCP server, so this may be a route. I did not verify that
  an elicitation raised from inside a hook run reaches the person.
- The agent simply asking in its reply. That is the normal path and it is a
  reminder, not enforcement.

### j. Detect a turn that did real work

**Partly enforced.** `Stop` fires at the end of every turn and hands the hook
`last_assistant_message` and `transcript_path`
(`.../stop.command.input.schema.json`). A hook can read the transcript JSONL and
decide what counts as real work. Codex does not label turns for you.

A cheaper signal: run `git status` from the hook. The hook's working directory
is the turn's working directory
(`codex:codex-rs/core/src/hook_runtime.rs:194-205`, which passes
`turn_context.cwd` into the request, and
`codex:codex-rs/hooks/src/engine/command_runner.rs:210-217`, which runs the
command in it).

### k. Detect a git commit, push, or pull request

**Enforced for shell-driven git.** `PreToolUse` or `PostToolUse` with matcher
`Bash`, parsing the `command` string.

Two gaps. If the person commits in another terminal, no hook sees it. If a pull
request is opened through an MCP GitHub server rather than the `gh` command, the
matcher has to be the MCP tool name instead, such as
`mcp__github__create_pull_request` (`codex:codex-rs/core/src/tools/handlers/mcp.rs:96`).

---

## Section 3. Claude Code against Codex, job by job

Claude Code facts come from the captured documentation in this repository. Those
pages were captured on 2026-09-04
(`repo:ai-external-knowledge/claude-code/hooks.md:1-4`). They may be older than
this Codex build.

| Job | Verdict | Detail |
|---|---|---|
| a. Three startup files in order | **Same** | Both have `SessionStart` with `additionalContext`, and both support the source matchers `startup`, `resume`, `clear`, `compact`, `fork` (`repo:ai-external-knowledge/claude-code/hooks.md:313`, `repo:ai-external-knowledge/claude-code/hooks.md:1027`; Codex: `codex:codex-rs/hooks/src/events/session_start.rs:24-39`). Codex adds a trust approval step Claude Code does not have. |
| b. Guidance back after compaction or resume | **Same, or slightly better in Codex** | Claude Code re-reads project-root `CLAUDE.md` after compaction (`repo:ai-external-knowledge/claude-code/memory.md:465`). Codex re-renders `AGENTS.md` and says out loud that it replaces the old copy (`codex:codex-rs/core/src/context/world_state/agents_md.rs:9-11`). Both re-fire `SessionStart` on compact. |
| c. Save review at end of turn | **Weaker in Codex** | Claude Code's `Stop` accepts both `decision: "block"` and `hookSpecificOutput.additionalContext` for quiet feedback that continues the conversation (`repo:ai-external-knowledge/claude-code/hooks.md:1016`). Codex's `Stop` has no `additionalContext` at all (`.../stop.command.output.schema.json`), so the only way to say anything is to block the turn. A soft nudge becomes a hard interruption. |
| c. Save review before a pull request | **Same** | Both match `Bash` on `PreToolUse` and parse the command. |
| c. Save review at work item close | **Same** | Same mechanism. |
| c. Save review before handoff | **Same** | Neither harness has an event for it. |
| c. Save review on owner request | **Same** | A skill in both. |
| d. Check a write to `knowledge/` | **Weaker in Codex** | Claude Code has file-shaped tools, so a matcher of `Edit|Write` plus an `if` of `"Edit(knowledge/**)"` filters to the folder before the hook process is even spawned (`repo:ai-external-knowledge/claude-code/hooks.md:430`, `repo:ai-external-knowledge/claude-code/hooks.md:437`). Codex has no `if` field, and its `apply_patch` input is one blob of patch text with no file list (`codex:codex-rs/core/src/tools/handlers/apply_patch.rs:458-463`). Blocking is equally possible; the filtering work moves into your script. |
| e. Small per-session state | **Same** | Neither harness offers a store. Both hand the hook a session id and a transcript path. |
| f. Scope guidance to a folder or topic | **Weaker in Codex, close to not possible** | Claude Code has `.claude/rules/` with `paths:` frontmatter, so a rule loads only when Claude touches a matching file, and such rules reload after compaction (`repo:ai-external-knowledge/claude-code/memory.md:180-206`, `repo:ai-external-knowledge/claude-code/memory.md:465`). Codex has only nested `AGENTS.md` on the working-directory path (`codex:codex-rs/core/src/agents_md.rs:7-18`). There is no on-demand, file-triggered load. You can approximate it with a `PreToolUse` hook that inspects the patch. |
| g. Run a skill from plain language | **Same** | Both discover `SKILL.md` folders with `name` and `description` frontmatter and both support explicit naming. |
| h. Run a check script after an edit or before a commit | **Same** | `PostToolUse` and `PreToolUse` in both, with the same block-plus-reason shape. |
| i. Ask the owner a structured question | **Same** | Neither has a hook output that poses a question. Both can send one action to the approval prompt. |
| j. Detect a turn that did real work | **Same** | Both fire once per turn at the end and hand over the last assistant message and a transcript path. Codex loses the ability to respond quietly, per row c. |
| k. Detect git commit, push, or PR | **Same** | Shell matcher in both. |
| Conditional hook filtering (`if`) | **Not possible in Codex** | Claude Code's `if` field uses permission rule syntax such as `"Bash(git *)"` or `"Edit(*.ts)"` (`repo:ai-external-knowledge/claude-code/hooks.md:430`). Codex has no such field, and an `if` written into a Codex handler is silently ignored (`codex:codex-rs/config/src/hook_config.rs:163-200`). |
| One-shot hooks (`once`) | **Not possible in Codex** | Claude Code honors `once` in skill frontmatter (`repo:ai-external-knowledge/claude-code/hooks.md:433`). Codex has no such field. |
| Hooks declared in skill or agent frontmatter | **Not possible in Codex, as far as I checked** | Claude Code allows it (`repo:ai-external-knowledge/claude-code/hooks.md:433` refers to "hooks in skills and agents"). Codex's skill frontmatter parser reads only `name`, `description`, and `metadata.short-description` (`codex:codex-rs/skills/src/parser.rs:5-20`). |
| Hooks in plugins | **Same** | Both support them. Codex reads a `hooks` key in the plugin manifest (`codex:codex-rs/core-plugins/src/manifest.rs:413-440`). |
| Hooks run without asking | **Weaker in Codex** | Codex refuses to run a hook until the person trusts its hash, and re-asks whenever the hook text changes (`codex:codex-rs/hooks/src/engine/discovery.rs:712-725`, `codex:codex-rs/hooks/src/engine/discovery.rs:794-811`). This is a security feature, but it means a freshly cloned repository starts with every hook inert. |
| Session-end cleanup | **Weaker in Codex** | Codex caps `SessionEnd` at 3 seconds and defaults it to 1 (`codex:codex-rs/hooks/src/events/session_end.rs:20-23`). I did not find a comparable cap documented for Claude Code. |

---

## Section 4. What this repository already does for Codex, and whether it holds up

### `AGENTS.md`

`repo:AGENTS.md:1` is one line: `Read CLAUDE.md in this folder and follow it.`

This works. Codex loads `AGENTS.md` from the project root
(`codex:codex-rs/core/src/agents_md.rs:189-240`) and the rest reaches Codex
because `repo:CLAUDE.md` opens with `Read .claude/rules first.` The repository's
own audit describes exactly this two-hop route
(`repo:plugins/project-init/skills/project-sync/SKILL.md:421-438`).

The repository also says Codex "expands no import syntax", so `@CLAUDE.md` would
load nothing (`repo:plugins/project-init/skills/project-init/references/thin-claudemd.md:132`).
I found no import expansion in the Codex `AGENTS.md` loader, so that claim looks
right, though absence of a feature is harder to prove than presence.

**Two things are out of date.**

1. **"Do not create `AGENTS.md` files inside folders. Codex would not read them"**
   (`repo:plugins/project-init/skills/project-init/references/folder-claudemd.md:43-45`,
   repeated at `repo:plugins/project-init/skills/project-sync/SKILL.md:439-440`).
   This is wrong for the current build. Codex does read nested `AGENTS.md`
   files, from the project root down to the working directory, inclusive
   (`codex:codex-rs/core/src/agents_md.rs:7-18`). The advice may still be the
   right call, because the load only covers folders on the working-directory
   path, so a nested file is often silently absent. But the stated reason is not
   the real one. Change the reason, then decide the policy again.

2. **The 32 KiB budget is not written down anywhere in this repository.** Codex
   stops reading `AGENTS.md` content after `project_doc_max_bytes`, default
   32768 bytes (`codex:codex-rs/config/src/config_toml.rs:74`). The one-line
   `AGENTS.md` here is nowhere near that. This matters only if the policy ever
   changes.

### `.codex/hooks.json`

`repo:.codex/hooks.json:1-20` registers one `SessionStart` hook.

What is correct:

- The file name and location. Codex reads `hooks.json` from the project's
  `.codex` folder (`codex:codex-rs/hooks/src/engine/discovery.rs:146-151`,
  `codex:codex-rs/hooks/src/engine/discovery.rs:339-379`).
- Every field used is a real field: `description`, `hooks`, `SessionStart`,
  `matcher`, `type`, `command`, `commandWindows`, `timeout`,
  `additionalContextLimit`, `statusMessage`
  (`codex:codex-rs/config/src/hook_config.rs:10-17`,
  `codex:codex-rs/config/src/hook_config.rs:154-186`).
- The matcher `startup|resume|clear|compact` is a valid exact list and every
  value in it is a real `SessionStart` source
  (`codex:codex-rs/hooks/src/events/session_start.rs:33-39`,
  `codex:codex-rs/hooks/src/events/common.rs:169-173`).
- `git rev-parse --show-toplevel` in the command works, because Codex runs the
  hook in the turn's working directory
  (`codex:codex-rs/hooks/src/engine/command_runner.rs:210-217`).

What is wrong or worth checking:

1. **`fork` is missing from the matcher.** Codex has a fifth `SessionStart`
   source, `fork` (`codex:codex-rs/hooks/src/events/session_start.rs:24-39`).
   A forked session gets no knowledge map. The Claude Code documentation lists
   `fork` too (`repo:ai-external-knowledge/claude-code/hooks.md:313`), so
   `repo:.claude/settings.json:14` has the same gap.

2. **`commandWindows` is written in PowerShell but Codex runs it under
   `cmd.exe`.** The value at `repo:.codex/hooks.json:11` uses PowerShell syntax
   (`$knowledgeRoot = ...`, `Set-Location -LiteralPath`). On Windows, Codex
   substitutes that string for `command`
   (`codex:codex-rs/hooks/src/engine/discovery.rs:512-516`) and runs it through
   `%COMSPEC%`, falling back to `cmd.exe /C`
   (`codex:codex-rs/hooks/src/engine/command_runner.rs:435-455`). Unless
   `COMSPEC` points at PowerShell, this line will not run. Nobody has noticed,
   which suggests no Windows machine has exercised it.

3. **`additionalContextLimit: 5000` is a spill threshold, not an allowance.**
   The repository describes it as "at least 5,000 tokens of additional context so
   the manual and map are not cut off"
   (`repo:plugins/project-init/skills/project-init/references/setup-flow.md:176-177`,
   same wording at `repo:plugins/project-init/skills/project-init/SKILL.md:297`).
   The real meaning is the point above which Codex writes the text to a temp
   file and replaces it with a preview plus a path
   (`codex:codex-rs/hooks/src/output_spill.rs:11-80`). The effect is close
   enough that the setting is doing its job, but the wording will mislead the
   next person who tunes it. Nothing is truncated; it is moved.

4. **`CODEX_PROJECT_DIR` does not exist.** The startup hook falls back to
   `process.env.CLAUDE_PROJECT_DIR`, then `process.env.CODEX_PROJECT_DIR`, then
   `process.cwd()` (`repo:plugins/second-brain/hooks/knowledge-session-start.mjs:120-122`;
   the same three lines are at
   `repo:plugins/second-brain/hooks/memory-reminder.mjs:68`). I grepped the whole
   Codex source for `CODEX_PROJECT_DIR` and found nothing. The middle branch is
   dead. It is harmless, because `process.cwd()` catches it and the `.codex`
   hook command resolves the root with `git rev-parse` anyway. Remove the dead
   branch or leave it, but do not rely on it.

5. **Hook trust is not mentioned anywhere in this repository.** A person who
   clones this repository and runs Codex gets a "Hooks need review" screen, and
   if they pick "Continue without trusting", the knowledge map never loads and
   nothing says so
   (`codex:codex-rs/tui/src/snapshots/codex_tui__startup_hooks_review__tests__startup_hooks_review_prompt.snap:1-12`).
   Editing `.codex/hooks.json` re-arms the same prompt, because trust is a hash
   (`codex:codex-rs/hooks/src/engine/discovery.rs:794-811`). The
   `project-sync` audit asks whether "local Codex settings prevent that route"
   (`repo:plugins/project-init/skills/project-sync/SKILL.md:444-445`), which is
   the right question, but it does not name trust as the thing to check.

### Four hooks Claude Code runs that Codex does not

`repo:.claude/settings.json:11-63` registers five hook handlers across four
events. `repo:.codex/hooks.json` registers one. So in Codex:

| Claude hook | Event and matcher in Claude | Status in Codex |
|---|---|---|
| `knowledge-session-start.mjs` | `SessionStart`, `startup\|resume\|clear\|compact` | Registered (`repo:.codex/hooks.json:4-16`) |
| `save-reminder.mjs` | `PreToolUse`, `Bash` (`repo:.claude/settings.json:24-32`) | Not registered |
| `work-item-close.mjs` | `PreToolUse`, `Bash` (`repo:.claude/settings.json:33-37`) | Not registered |
| `spec-check-reminder.mjs` | `PostToolUse`, `Edit\|Write\|NotebookEdit` (`repo:.claude/settings.json:41-51`) | Not registered |
| `memory-reminder.mjs` | `UserPromptSubmit`, no matcher (`repo:.claude/settings.json:53-62`) | Not registered |

All four unregistered hooks could run in Codex today with no code change. Every
event they use exists in Codex under the same name
(`codex:codex-rs/config/src/hook_config.rs:36-61`). The `Bash` matcher matches
(`codex:codex-rs/core/src/tools/handlers/unified_exec.rs:92`). The
`Edit|Write|NotebookEdit` matcher matches Codex file edits through the `Write`
and `Edit` aliases (`codex:codex-rs/core/src/tools/hook_names.rs:28-39`). The
`UserPromptSubmit` event takes no matcher in Codex, and the Claude entry has
none, so that is fine (`codex:codex-rs/hooks/src/events/common.rs:126`).

Two adjustments would be needed. The scripts read `$CLAUDE_PROJECT_DIR`, which
Codex does not set; the `.codex/hooks.json` `git rev-parse` pattern already
solves that. And `spec-check-reminder.mjs` would receive a patch blob rather
than a file path, so anything in it that reads a file path out of the tool input
needs rewriting (`codex:codex-rs/core/src/tools/handlers/apply_patch.rs:458-463`).
I did not read those four scripts to check what they expect.

### The Codex plugin manifests

Every plugin here carries a `.codex-plugin/plugin.json`
(`repo:plugins/project-init/.codex-plugin/plugin.json`, and six more). That is
the first path Codex looks for
(`codex:codex-rs/exec-server-protocol/src/protocol.rs:47-51`). The manifests use
`name`, `version`, `description`, `author`, `homepage`, `repository`,
`keywords`, `skills`, and `interface`, all of which the Codex manifest parser
knows except `author`, `homepage` and `repository`, which it ignores
(`codex:codex-rs/core-plugins/src/manifest.rs:45-67`).

`repo:.agents/plugins/marketplace.json:1-92` is at the first marketplace path
Codex looks for (`codex:codex-rs/core-plugins/src/marketplace.rs:20-24`). Its
shape, with `name`, `interface.displayName`, and a `plugins` array of
`{name, source: {source: "local", path}, policy, category}`, I did not verify
field by field against the Codex marketplace parser.

**One unused capability.** None of the seven `.codex-plugin/plugin.json` files
declares a `hooks` key. Codex plugins can ship hooks
(`codex:codex-rs/core-plugins/src/manifest.rs:413-440`,
`codex:codex-rs/hooks/src/declarations.rs:11-33`). If the knowledge startup hook
shipped inside the `second-brain` plugin manifest, every project that installs
the plugin would get it, instead of every project needing its own
`.codex/hooks.json`. I have not checked whether plugin hooks skip the trust
prompt; the trust code treats plugin hooks as a source alongside project and
user hooks (`codex:codex-rs/protocol/src/protocol.rs:1619-1632`), which suggests
they do not.

### One claim I could not check

`repo:plugins/second-brain/skills/session-search/agents/openai.yaml:1-4` uses a
schema with `interface.display_name`, `interface.short_description` and
`interface.default_prompt`, in snake case. The Codex manifest parser reads
camel case interface keys (`codex:codex-rs/core-plugins/src/manifest.rs:76-80`).
I did not find what reads this YAML file, so I cannot say whether it is
correct, stale, or for something else entirely.

### Codex has its own memory system

Codex ships a memory pipeline that reads past session transcripts with a model
and injects what it finds as developer instructions
(`codex:codex-rs/memories/README.md:29-40`). It runs in the background at root
session start.

This repository sets `CLAUDE_CODE_DISABLE_AUTO_MEMORY` to `1` for Claude Code
(`repo:.claude/settings.json:4`,
`repo:plugins/second-brain/skills/second-brain/SKILL.md:92-93`). There is no
equivalent setting recorded for Codex. The Codex switches are
`memories.generate_memories` and `memories.use_memories` in `config.toml`
(`codex:codex-rs/config/src/types.rs:304-307`). Whichever way the owner wants
it, the decision should be written down, because right now Codex may be building
a second, unapproved memory store next to `knowledge/`.

---

## Section 5. What is still open, and what must be proven when you build

### Facts I am confident of

These I read directly in the source and would build on:

- The twelve hook event names and their JSON keys.
- `PreToolUse` covers file edits as `apply_patch` with `Write` and `Edit`
  aliases.
- `SessionStart` fires on `startup`, `resume`, `clear`, `compact`, and `fork`,
  and can add context.
- `Stop` can block with a reason and cannot add quiet context.
- `PreCompact`, `PostCompact`, `SessionEnd` and `Interrupt` cannot add context.
- There is no `if` and no `once`.
- Hooks do not run until trusted, and trust is a per-machine hash.
- `AGENTS.md` loads from the project root down to the working directory, with a
  32 KiB budget.
- There is no rules directory and no path-scoped rule.

### Things to prove before the design depends on them

1. **Does a plugin-supplied hook need the same trust approval as a project
   hook?** This decides whether shipping the startup hook inside the
   `second-brain` plugin is better than `.codex/hooks.json`. Test: install the
   plugin in a clean `CODEX_HOME` and see whether the review screen appears.
2. **Does `codex exec` (non-interactive) ever run an untrusted hook?** The only
   test in the repository passes `--dangerously-bypass-hook-trust`
   (`codex:codex-rs/exec/tests/suite/hooks.rs:7-38`), which implies it does not,
   but I did not find the code path that proves it. This decides whether hooks
   work in CI or scripted runs at all.
3. **What exactly do the `prompt` and `agent` hook handler types do?**
   (`codex:codex-rs/config/src/hook_config.rs:198-200`). If `agent` runs a
   sub-agent as a hook, the save review at `Stop` could be a real review instead
   of a script.
4. **Can an `mcp_tool` hook raise an elicitation that reaches the person?** That
   is the only candidate for asking a real structured question from a hook.
5. **Is a nested `AGENTS.md` re-read when the agent's working directory changes
   mid-session?** The world-state code implies yes, with a "these replace all
   previously provided" notice
   (`codex:codex-rs/core/src/context/world_state/agents_md.rs:9-11`), but I did
   not trace what triggers a re-read.
6. **Does the `apply_patch` hook input ever carry file paths?** I found only
   `{"command": <patch text>}`. Confirm by capturing a real `PreToolUse` payload
   before writing a parser.
7. **How does `additionalContext` from `SessionStart` interact with a spill?**
   Confirm the preview plus file path is genuinely usable by the model, or keep
   the startup text under the limit and stop worrying.
8. **What does the Codex IDE extension and the Codex app do differently?** I
   read only the shared Rust core. A GUI front end might not show the hook trust
   review, in which case hooks silently never run there.
9. **Does `%COMSPEC%` on the owner's Windows machines point at PowerShell?**
   This decides whether `repo:.codex/hooks.json:11` is broken or fine.
10. **Are the marketplace manifest fields in `repo:.agents/plugins/marketplace.json`
    the ones Codex reads?** I confirmed the path, not the schema.

### The stability risk

Codex is moving fast. The tip of `main` on 2026-09-16 was tagged
`0.155.0-alpha.10`, and there were ten alpha releases in the five days before
that (fetched from `https://github.com/openai/codex/releases` on 2026-09-16).
The hook system reads like new code: it carries a compatibility layer for Claude
Code names (`codex:codex-rs/core/src/tools/hook_names.rs:28-39`), a struct named
`ClaudeHooksEngine` (`codex:codex-rs/hooks/src/events/pre_tool_use.rs:14`), and
schema comments that refer to what "Claude requires"
(`codex:codex-rs/hooks/schema/generated/stop.command.output.schema.json`). A
design that leans on an exact field name should say which build it was checked
against, and be re-checked at build time.

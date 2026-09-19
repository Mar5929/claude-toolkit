# Supermemory and Mem0: how they teach a fresh coding agent to use memory

> Research evidence and recommendations, not adopted policy. The master design and PRD own toolkit decisions. Per-save memory approval is the default; the separately approved optional project setting and other existing permissions remain governed by R10/R16. These reports do not change those permissions. Findings come from source inspection, not provider runtime experiments or comparative behavioral benchmarks.

**Research date:** 2026-09-19
**Research model:** GPT-5.6 Sol
**Scope:** Agent-facing instruction delivery and memory behavior. This report does not compare marketing claims or recommend adopting either product's storage architecture.

## Research question

How do Supermemory and Mem0 teach a fresh AI coding agent how their memory system works, in the role that a core operating manual, `CLAUDE.md`, `AGENTS.md`, skills, hooks, and tool descriptions could play?

The research focused on:

- what a fresh agent reads at startup and what it sees only on demand;
- exact hook-injected instructions and MCP tool descriptions;
- save and retrieve triggers;
- the boundary between the main agent's judgment and automatic extraction performed elsewhere;
- user approval and permissions;
- context limits where the public implementation establishes them;
- update, deletion, failure, and recovery behavior;
- differences between documentation claims, agent-facing instructions, developer setup documentation, optional integrations, and executable defaults.

## Source basis and limits

The primary evidence is official public repository source pinned to current commits observed during research:

- Supermemory Claude Code plugin: [`supermemoryai/claude-supermemory` at `915aba1b8056ddb3630fa833973032ba6b788fdb`](https://github.com/supermemoryai/claude-supermemory/tree/915aba1b8056ddb3630fa833973032ba6b788fdb)
- Mem0 monorepo: [`mem0ai/mem0` at `a39a802bbc93e85b820078cd3c4dbaf53af25dbe`](https://github.com/mem0ai/mem0/tree/a39a802bbc93e85b820078cd3c4dbaf53af25dbe)

Official integration documentation stored in those repositories was used where it described setup or product variants. Runtime claims are grounded primarily in hook code, skill text, and local MCP implementations. Hosted service behavior that is not present in the public source is identified as unverified rather than inferred.

Neither product, in the integrations examined, gives the primary coding agent one comprehensive operating manual comparable to a Markdown/Git knowledge manual. Both divide teaching across runtime hooks, tool descriptions, task-specific skills or commands, and service-side extraction instructions. That division is the most relevant result for this toolkit.

## Supermemory

### Overall instruction model

Supermemory's Claude Code plugin teaches the agent through four main surfaces:

1. session-start context that explains provenance and injects a profile;
2. per-prompt automatic recall with short behavioral guidance;
3. MCP tool descriptions supplied by a hosted server, plus a local permission hook;
4. an optional context-gatherer subagent for deeper research.

It does not install a root `CLAUDE.md`, `AGENTS.md`, or general memory skill that serves as a standing operating manual. Its repository includes commands for status, configuration, indexing, logout, and session access, but memory operation is mainly hook-driven.

The active hook map is explicit in [`plugin/hooks/hooks.json`](https://github.com/supermemoryai/claude-supermemory/blob/915aba1b8056ddb3630fa833973032ba6b788fdb/plugin/hooks/hooks.json):

- `SessionStart` loads project memories;
- `UserPromptSubmit` recalls memories relevant to the prompt;
- `PreToolUse` auto-approves an enumerated set of read-only Supermemory calls;
- `Stop` asynchronously saves new transcript content.

### What a fresh agent receives at session start

[`plugin/hooks/session-start.js`](https://github.com/supermemoryai/claude-supermemory/blob/915aba1b8056ddb3630fa833973032ba6b788fdb/plugin/hooks/session-start.js) calls the profile API for the repository container. It takes up to `maxProfileItems` static items and the same number of dynamic items. The default in [`plugin/hooks/lib/settings.js`](https://github.com/supermemoryai/claude-supermemory/blob/915aba1b8056ddb3630fa833973032ba6b788fdb/plugin/hooks/lib/settings.js) is five, so a normal fresh session can receive up to five persistent profile facts and five recent-context facts.

The injected context does more than supply facts. It tells the agent:

- every line marked `◪` came from Supermemory;
- how to cite a recalled item naturally;
- to say "from supermemory," never the vaguer "from memory," if it names the source;
- which project container supplied the material.

This is agent-facing runtime instruction, not developer setup prose. Its function is provenance discipline and source signaling.

The empty and failure states are deliberately different:

- a genuine empty result says no previous memories were found and that memories will be saved during work;
- an API error says memory could not be loaded and instructs the agent not to assume the project has no memories;
- an outer failure says the session will continue without memory context.

That distinction prevents a failed retrieval from becoming a false project fact.

Session start also installs or refreshes a status line and may show authentication guidance. These are user-visible operational features, not instructions that explain the knowledge policy to the agent.

### What the agent receives on each prompt

The executable default is in [`plugin/hooks/recall-directive.js`](https://github.com/supermemoryai/claude-supermemory/blob/915aba1b8056ddb3630fa833973032ba6b788fdb/plugin/hooks/recall-directive.js).

By default, the hook performs retrieval itself. It does not wait for the language model to decide whether to call a search tool. The code comment is direct: recall is performed in the hook so it occurs "on every substantive prompt instead of only when the model chooses to spend a tool call."

The default trigger and limits are:

- skip prompts shorter than 12 characters;
- skip prompts beginning `/`, `!`, or `#`;
- use at most the first 500 prompt characters as the query;
- allow a four-second search timeout;
- filter finite similarity scores below `0.55`;
- take at most five results;
- truncate each result's text to 300 characters;
- hash recalled text and avoid reinjecting a result already seen in the session;
- retain at most 500 seen hashes.

When results are found, the injected `<supermemory-recall>` block:

- labels them as relevance-ranked and from Supermemory;
- repeats the provenance/citation convention;
- tells the agent that deeper history is available through `search_memory`;
- explains that search defaults to the project's container;
- names the context-gatherer agent as another option.

When no result is found, a once-per-session discovery message teaches the agent about deeper recall. The important behavioral instruction is narrow: deeper search is worthwhile when the user refers to earlier sessions, past decisions, or says phrases such as “remember,” “we decided,” or “last time”; it should be skipped for a self-contained task. It also explains how to resolve the deferred tool schema through `ToolSearch` and how to switch between the project container and the account's active/shared space.

This is the closest Supermemory comes to a compact operating rule for retrieval. It is delivered only after a miss and only once per session, rather than being loaded as a global manual.

### README discrepancy: model-decided versus automatic recall

The current [`README.md`](https://github.com/supermemoryai/claude-supermemory/blob/915aba1b8056ddb3630fa833973032ba6b788fdb/README.md) describes “Reasoned recall” as a decision made by Claude before each turn: the model supposedly decides whether search would help and searches only when worthwhile.

That description does not match the pinned default implementation. The current hook automatically searches every substantive prompt under the rules above. A configured `recallDirective` bypasses automatic retrieval and injects an administrator-supplied advisory instruction instead, which can restore a model-decided pattern. The configuration path exists in [`plugin/hooks/lib/settings.js`](https://github.com/supermemoryai/claude-supermemory/blob/915aba1b8056ddb3630fa833973032ba6b788fdb/plugin/hooks/lib/settings.js).

Therefore:

- **code evidence:** automatic prompt-driven recall is the default at the pinned commit;
- **README claim:** the model decides when to search;
- **optional configuration:** a custom directive can change the default behavior.

The runtime source should govern conclusions about current default behavior.

### Deep context gathering

[`plugin/agents/context-gatherer.md`](https://github.com/supermemoryai/claude-supermemory/blob/915aba1b8056ddb3630fa833973032ba6b788fdb/plugin/agents/context-gatherer.md) defines a specialized subagent rather than adding more text to every primary-agent session.

It is described for significant work, resuming after time away, or cases where one search cannot cover enough history. Its process tells the subagent to:

- search the project container by default;
- run several searches from different angles rather than one broad search;
- search for the named task or files, repo conventions and decisions, known problems or unfinished work, and relevant user preferences;
- follow references into other project or shared-team containers when needed.

Its output contract is a brief under 300 words with three optional sections: directly relevant material, conventions and preferences, and open threads. Every claim must come from a retrieved memory. If nothing is useful, it must say so in one line.

This is a strong example of moving a deep retrieval procedure out of startup context and into a task-specific agent definition.

### Automatic capture and separate extraction

[`plugin/hooks/capture.js`](https://github.com/supermemoryai/claude-supermemory/blob/915aba1b8056ddb3630fa833973032ba6b788fdb/plugin/hooks/capture.js) runs asynchronously at every Claude Code `Stop`. It reads only transcript entries added since the last capture marker and sends them to `/v3/documents` with repository scope, session identity, automatic-capture metadata, and extraction guidance.

The transcript formatter in [`plugin/hooks/lib/transcript.js`](https://github.com/supermemoryai/claude-supermemory/blob/915aba1b8056ddb3630fa833973032ba6b788fdb/plugin/hooks/lib/transcript.js):

- captures user and assistant text;
- excludes assistant thinking;
- strips injected Supermemory context and system reminders so recalled context is not recursively saved;
- excludes tool calls and results by default;
- includes explicitly configured tools only, with compact inputs and tool-result text truncated to 500 characters;
- can optionally use signal extraction, where configured keywords identify important turns and a bounded number of preceding turns are included.

The server-side extractor receives the exact `AGENT_ENTITY_CONTEXT` string from [`plugin/hooks/lib/api.js`](https://github.com/supermemoryai/claude-supermemory/blob/915aba1b8056ddb3630fa833973032ba6b788fdb/plugin/hooks/lib/api.js). It directs the service to preserve durable decisions, lessons, workflows, architecture, conventions, patterns, setup facts, and user preferences, while skipping transient Git state, unaccepted assistant suggestions, temporary command output, low-value chatter, and granular details that do not help later work.

This creates two distinct judgment layers:

- **primary agent:** produces the user-visible conversation and may explicitly call a write tool when asked;
- **automatic extractor:** decides which durable facts to derive from captured transcript content, under the entity-context instruction.

The primary agent does not approve each automatically extracted memory and does not receive an ID for each extracted fact through this hook.

### MCP tools and permissions

[`plugin/hooks/mcp-proxy.js`](https://github.com/supermemoryai/claude-supermemory/blob/915aba1b8056ddb3630fa833973032ba6b788fdb/plugin/hooks/mcp-proxy.js) forwards MCP requests to the hosted server and inserts the repository container when a scoped call omits `containerTag`. The scoped set includes search, add, list, graph, and save operations.

The public plugin source does not contain the hosted server's complete tool descriptions or JSON schemas. They are returned by the hosted MCP server at runtime. Any exact claim about those schemas would require live server inspection and is outside the evidence captured here.

[`plugin/hooks/recall-approve.js`](https://github.com/supermemoryai/claude-supermemory/blob/915aba1b8056ddb3630fa833973032ba6b788fdb/plugin/hooks/recall-approve.js) does establish the permission boundary:

- an enumerated set of read-only Supermemory tools is automatically allowed;
- those include search, list, get, identity, and graph reads;
- write tools such as `add_memory` and `save-memory` are not auto-approved and therefore remain subject to the client's ordinary permission behavior.

Automatic transcript capture at `Stop` is separate from MCP write permission. Installing and running the plugin enables that hook-driven capture; it does not prompt for approval on every stop.

### Context cost and limits

The source exposes several concrete limits:

- startup: up to five static plus five dynamic profile items by default;
- prompt recall: up to five results, with 300 characters of result text each;
- prompt query: 500 characters;
- deep context-gatherer output: under 300 words;
- tool result capture: 500 characters for configured tools.

The prompt hook displays a user-visible estimate of recall injection cost as `context.length / 4` tokens. That is explicitly an approximation, not tokenizer output. Deduplication prevents the same recalled text from being injected twice in a session.

The session-start client does not impose a visible per-profile-item character cap. The API may impose server-side limits, but they are not established in this public plugin source.

### Update, deletion, and recovery evidence

The public plugin contains no agent-facing skill or command that explains how to update or delete an individual stored memory. The hosted MCP service may expose more operations, but its schemas are not present here. This is missing public evidence, not proof that the platform lacks those capabilities.

The plugin does show operational failure handling:

- network and API failures fail open so normal coding work continues;
- recall timeout is silent rather than interrupting every prompt;
- non-timeout recall errors can produce a status message;
- a failed startup fetch is distinguished from a genuinely empty memory set;
- capture records error state but does not block the session;
- the last captured transcript UUID prevents normal duplicate uploads;
- authentication can use browser login, environment configuration, project configuration, or saved credentials.

There is no public durable retry queue for failed automatic capture in this plugin source comparable to Mem0's pending handoff system. The last-captured marker is advanced only after a successful `addMemory` call, so later stop events can retry the unsaved transcript delta if it remains available.

## Mem0

### Product variants must be kept separate

Mem0 has two materially different ways to connect a coding agent:

1. **Full Claude Code or Codex plugin:** lifecycle hooks, one local read-only search MCP tool, and memory skills. Writes happen through background extraction.
2. **Direct hosted MCP:** a broader CRUD tool set but no lifecycle hooks, no local skills, and no automatic capture or first-prompt recall.

The official distinction appears in [`docs/platform/mem0-mcp.mdx`](https://github.com/mem0ai/mem0/blob/a39a802bbc93e85b820078cd3c4dbaf53af25dbe/docs/platform/mem0-mcp.mdx), [`docs/integrations/claude-code.mdx`](https://github.com/mem0ai/mem0/blob/a39a802bbc93e85b820078cd3c4dbaf53af25dbe/docs/integrations/claude-code.mdx), and [`docs/integrations/codex.mdx`](https://github.com/mem0ai/mem0/blob/a39a802bbc93e85b820078cd3c4dbaf53af25dbe/docs/integrations/codex.mdx).

Claims about one integration should not be generalized to the other.

### Overall instruction model in the full plugin

The full plugin does not inject a static core memory manual at session start. It divides behavior among:

- lifecycle hooks for automatic capture, first-prompt recall, and flush recovery;
- one strongly worded MCP search-tool description;
- on-demand skills for search, remember, forget, pause, resume, and status;
- separate custom instructions sent to the hosted extractor for project and personal memories.

The Claude Code hook map is in [`integrations/claude-code-plugin/hooks/hooks.json`](https://github.com/mem0ai/mem0/blob/a39a802bbc93e85b820078cd3c4dbaf53af25dbe/integrations/claude-code-plugin/hooks/hooks.json). It registers:

- `SessionStart` for startup, resume, clear, and compact;
- `UserPromptSubmit`;
- successful and failed post-tool events;
- Sidekick subagent start and stop;
- main-agent `Stop`;
- `PreCompact`;
- `SessionEnd`.

### What happens at startup

The `SessionStart` hook in [`integrations/agent-plugin-core/python/hook_runner.py`](https://github.com/mem0ai/mem0/blob/a39a802bbc93e85b820078cd3c4dbaf53af25dbe/integrations/agent-plugin-core/python/hook_runner.py) records session metadata, manages telemetry markers, clears stale API-key cache state, and tries to recover pending background handoffs.

It does not retrieve memories and does not inject an operating policy or project profile into the primary agent.

This means a fresh Mem0 plugin session starts with the MCP tool description and discoverable skills as its standing behavioral guidance. Actual remembered context appears on the first qualifying user prompt.

### First-prompt automatic recall

`first_prompt_memory_output` in [`integrations/agent-plugin-core/python/hook_runner.py`](https://github.com/mem0ai/mem0/blob/a39a802bbc93e85b820078cd3c4dbaf53af25dbe/integrations/agent-plugin-core/python/hook_runner.py) records every user prompt but searches only for the first prompt in a session.

Default behavior:

- the first prompt must contain at least 20 non-whitespace characters;
- the prompt itself, bounded to 6,000 characters, becomes the query;
- the search has a two-second timeout;
- it requests up to five memories;
- memories already injected during that session are removed;
- empty or failed search returns no hook context;
- successful results are injected under the heading “Mem0 found these relevant memories from earlier work in this repository:”.

No language model is called to write the first search query. The hook uses the user's prompt directly.

Unlike Supermemory's default, Mem0 does not repeat automatic search for each later prompt. Later recall depends on an explicit skill invocation or the primary agent choosing the MCP search tool.

### The search tool teaches a standing trigger

The full plugin's local MCP implementation is [`integrations/claude-code-plugin/core/mcp_server.py`](https://github.com/mem0ai/mem0/blob/a39a802bbc93e85b820078cd3c4dbaf53af25dbe/integrations/claude-code-plugin/core/mcp_server.py).

It exposes one tool: `search_memories`. The tool is annotated as read-only and idempotent. Its description is intentionally normative. It tells the agent to **always** search before answering anything that could depend on prior context, including:

- user preferences;
- codebase facts and history;
- people and projects;
- earlier decisions;
- how the repository was run, tested, or built.

It explicitly tells the agent not to rely on the current chat window alone.

The schema requires `query` and permits:

- `top_k`: integer 1 through 20;
- `category`: one of the plugin's coding-memory categories;
- `scope`: `repo`, `dir`, or `mine`;
- `run_id`: a known coding-agent session ID.

Unknown fields are rejected. `query` must be 1 to 2,000 characters.

The scope semantics are taught in the tool description:

- `repo`, the default, searches shared repository memory plus the current user's preferences;
- `dir` narrows shared memory to the working directory while retaining user preferences;
- `mine` searches personal preferences only.

This tool description acts like a compact, always-available retrieval rule. It carries less context than loading a complete memory manual but depends on the tool schema being available to the model.

### Task-specific skills

The full plugin supplies six focused skills under [`integrations/claude-code-plugin/skills`](https://github.com/mem0ai/mem0/tree/a39a802bbc93e85b820078cd3c4dbaf53af25dbe/integrations/claude-code-plugin/skills). They load only for the relevant operation.

#### Search

[`skills/search/SKILL.md`](https://github.com/mem0ai/mem0/blob/a39a802bbc93e85b820078cd3c4dbaf53af25dbe/integrations/claude-code-plugin/skills/search/SKILL.md) tells the agent to call `search_memories` with the user's question and map command options into structured tool arguments. It explains category fallback, scope selection, and correct `run_id` use. It says to return the tool result directly.

#### Remember

[`skills/remember/SKILL.md`](https://github.com/mem0ai/mem0/blob/a39a802bbc93e85b820078cd3c4dbaf53af25dbe/integrations/claude-code-plugin/skills/remember/SKILL.md) contains the most relevant instruction pattern for a manual-backed system.

The full plugin has no separate write tool. When the user explicitly asks to remember something, the primary agent must:

1. restate the fact clearly and completely in one or two visible sentences, including names, values, and paths it depends on;
2. tell the user it will be saved when the session ends or compacts and can surface in future sessions;
3. avoid claiming that storage already succeeded or inventing a memory ID.

The skill explains why: the visible assistant reply is input to later extraction. The primary agent shapes durable meaning, while the background system performs the actual save.

#### Forget

[`skills/forget/SKILL.md`](https://github.com/mem0ai/mem0/blob/a39a802bbc93e85b820078cd3c4dbaf53af25dbe/integrations/claude-code-plugin/skills/forget/SKILL.md) establishes a strict destructive-action boundary.

Before remote deletion, the agent must tell the user exactly what will be deleted and receive confirmation in the current conversation. The default remote deletion scope is the current user's memories for the repository. Shared project memory remains unless the user explicitly asks to include it, because that deletion affects every teammate. The skill forbids passing `--yes` before confirmation.

Local evidence and pending queues can be cleared separately without remote deletion. The agent reports the actual command result rather than assuming success.

#### Pause and resume

[`skills/pause/SKILL.md`](https://github.com/mem0ai/mem0/blob/a39a802bbc93e85b820078cd3c4dbaf53af25dbe/integrations/claude-code-plugin/skills/pause/SKILL.md) says capture and session-content transmission stop while paused. Existing memories remain searchable. Pending unsent packets remain queued and are sent after resume. It also discloses that a minimal attributed telemetry ping continues unless telemetry is disabled.

[`skills/resume/SKILL.md`](https://github.com/mem0ai/mem0/blob/a39a802bbc93e85b820078cd3c4dbaf53af25dbe/integrations/claude-code-plugin/skills/resume/SKILL.md) restarts capture. It explicitly says activity during the paused interval is not captured retroactively.

#### Status

[`skills/status/SKILL.md`](https://github.com/mem0ai/mem0/blob/a39a802bbc93e85b820078cd3c4dbaf53af25dbe/integrations/claude-code-plugin/skills/status/SKILL.md) instructs the agent to combine machine-readable status and a doctor check. It may report only fields actually returned. Authentication failure must be described as invalid or expired credentials and must not be reframed as “no memories found.”

### Main-agent judgment versus automatic extraction

The capture and extraction split is explicit in [`integrations/claude-code-plugin/core/memory_core.py`](https://github.com/mem0ai/mem0/blob/a39a802bbc93e85b820078cd3c4dbaf53af25dbe/integrations/claude-code-plugin/core/memory_core.py).

Hooks locally record:

- user prompts;
- the main agent's completed responses;
- changed paths and compact mutation information;
- bounded command and tool outcomes;
- failures;
- subagent assignments, returned summaries, and transcript paths.

Capture itself does not call a model. It builds structured evidence. Extraction happens later through Mem0's add API with `infer: true` and two separate custom instruction blocks.

#### Project-memory extraction instruction

The `PROJECT_MEMORY_INSTRUCTIONS` direct the service to save concise repository facts that will help future coding work. They establish several policy decisions:

- a completed change should normally produce one memory describing resulting behavior, location when helpful, constraints, and reasoning;
- exploration and accepted decisions may produce separate memories only when independently useful;
- a failed command that was made to work should produce one memory containing the failed invocation, error, and successful invocation;
- transient failures and in-progress errors should be skipped;
- conclusions about current repository behavior come from the main coding agent's final response;
- subagent responses are supporting evidence, not decisions;
- proposed or recommended changes are excluded unless accepted or completed;
- personal preferences, session/task narration, transient state, test results, documentation updates, release notes, and temporary state are excluded;
- if nothing useful was established, no memory should be returned.

#### Personal-memory extraction instruction

The `PERSONAL_MEMORY_INSTRUCTIONS` direct the service to save user facts useful across repositories: preferred tools, package managers, languages, coding style, review and communication preferences, and facts explicitly requested for memory.

They require third-person statements about the user and forbid repository facts, project decisions, commands, and statements that nothing was learned.

These instructions create a clear division:

- the **main agent** decides what to say, what is complete, and how to restate an explicit remember request;
- the **service extractor** decides which concise memories to create from that evidence, subject to separate project and personal policies;
- a **subagent** can provide evidence but cannot establish a project decision by itself.

This division closely resembles a system where a primary agent curates durable meaning and a separate save mechanism enforces form and routing.

### Flush timing and save triggers

The official integration docs and hook source establish these default triggers:

- after five completed exchanges, start a periodic background flush;
- flush earlier when accumulated source becomes large;
- after five minutes idle, start an idle flush;
- flush pending evidence before context compaction;
- flush remaining evidence at session end;
- a detached worker survives the coding agent process exiting.

`Stop` records the current response and schedules periodic or idle work; it does not necessarily block until remote extraction finishes.

The add request carries separate `agent_id`, `user_id`, `app_id`, and `run_id` values, plus repository metadata and both custom instruction blocks. Large extraction inputs are split into requests without intentionally dropping message text.

The plugin's categories are:

- `project_knowledge`;
- `decisions_and_constraints`;
- `workflows`;
- `problems_and_fixes`;
- `results`.

### Subagent instruction delivery

For native subagents, the plugin reuses the parent turn's already-injected memories at subagent start. It does not reload a general manual. The context is combined under the same character budget and injected once for that child.

The named Claude Code Sidekick has its own instructions in [`integrations/claude-code-plugin/agents/sidekick.md`](https://github.com/mem0ai/mem0/blob/a39a802bbc93e85b820078cd3c4dbaf53af25dbe/integrations/claude-code-plugin/agents/sidekick.md). It works in a separate worktree, can search Mem0, returns a result and validation, and leaves changes for the main agent to review. Its completion does not independently trigger memory extraction; the main agent's final response establishes the outcome.

### Full plugin versus hosted direct MCP

The full plugin intentionally exposes only the local read-only `search_memories` tool. Writes are performed by lifecycle capture and background extraction.

Direct hosted MCP exposes a broader set documented in [`docs/platform/mem0-mcp.mdx`](https://github.com/mem0ai/mem0/blob/a39a802bbc93e85b820078cd3c4dbaf53af25dbe/docs/platform/mem0-mcp.mdx):

- `add_memory`;
- `search_memories`;
- `get_memories`;
- `get_memory`;
- `update_memory`;
- `delete_memory`;
- `delete_all_memories`;
- `delete_entities`;
- `list_entities`;
- documentation at the pinned commit also describes event-list/status operations.

Direct MCP gives the model explicit CRUD tools but provides none of the full plugin's lifecycle hooks or operation skills. The server's live tool schemas are hosted; the repository documentation supplies names and descriptions, while the local full-plugin schema is directly auditable.

### Context and extraction limits

The full plugin has explicit budgets:

- first-prompt automatic recall: up to five memories;
- explicit search default: three memories, configurable up to 20;
- combined search output: 4,000 characters by default;
- configurable context range: 1,000 to 10,000 characters;
- first-prompt query: bounded to 6,000 characters before search;
- local MCP query: maximum 2,000 characters;
- command capture: 2,000 characters;
- tool-result preview: 2,500 characters;
- semantic episode evidence: 12,000 characters for the relevant bounded section;
- extraction request budget: an estimated 24,000 tokens.

The token estimate is deliberately conservative and avoids a tokenizer dependency. Large conversations are divided into batches, keeping exchanges together where possible. The recall character limit does not truncate the captured messages sent for extraction.

Already injected memory IDs are tracked by session and repository so automatic and explicit recall do not repeatedly return the same items within that session.

### Update, deletion, and recovery

The full plugin offers no explicit single-memory update tool. Its normal update path is another extraction run against later evidence. The service may update or reconcile memories, but the precise hosted extraction behavior is outside the public local plugin code. Direct hosted MCP does expose `update_memory` by memory ID.

Deletion in the full plugin is implemented through the confirmed `forget` skill and CLI. It enumerates scoped memory IDs, deletes them individually, and reports partial failure if some deletions fail. The user can separately choose local evidence deletion and shared-project deletion.

Recovery is detailed in [`integrations/agent-plugin-core/python/hook_runner.py`](https://github.com/mem0ai/mem0/blob/a39a802bbc93e85b820078cd3c4dbaf53af25dbe/integrations/agent-plugin-core/python/hook_runner.py) and [`memory_core.py`](https://github.com/mem0ai/mem0/blob/a39a802bbc93e85b820078cd3c4dbaf53af25dbe/integrations/claude-code-plugin/core/memory_core.py):

- background flush requests are written as durable pending handoff files;
- a handoff marked running for more than five minutes is returned to pending;
- session start launches up to five recoverable handoffs;
- pending handoffs expire after seven days;
- one transient connection failure is retried without retrying ordinary API responses;
- extraction event IDs are stored so a retry can resume waiting for an already queued event instead of creating a duplicate request;
- failed or timed-out semantic events remain recorded for later handling;
- after five flush attempts a packet becomes `gave-up`;
- pausing refreshes pending file timestamps so queued work is held rather than expiring while capture is paused.

This recovery system is local, durable, and inspectable. It separates “captured locally,” “queued remotely,” and “successfully extracted,” which prevents the agent from claiming a save merely because the session ended.

## Comparison of instruction delivery

| Question | Supermemory Claude plugin | Mem0 full coding-agent plugin |
| --- | --- | --- |
| Core manual loaded at startup | No | No |
| Startup behavior | Inject up to 10 profile/context facts plus provenance rules | Record session and recover pending work; no memory context yet |
| Automatic recall | Every substantive prompt by default | First qualifying prompt only |
| Later recall trigger | Hook continues automatic search; deeper MCP search advised | Agent follows strongly worded search-tool description or explicit search skill |
| On-demand operating guidance | Commands and context-gatherer agent | Six focused skills plus MCP schema |
| Automatic capture | Transcript delta at every `Stop` | Local evidence continuously; periodic, idle, pre-compact, and session-end flushes |
| Extraction policy | One server-side entity-context instruction | Separate project and personal extraction instructions |
| Main agent's role in explicit save | Can call hosted write tool; ordinary write permission applies | Restate the durable fact precisely; background extraction performs save |
| Read permission | Enumerated Supermemory reads auto-approved | Local search tool is marked read-only/idempotent |
| Destructive confirmation | No public agent-facing deletion workflow found | Explicit current-conversation confirmation; shared deletion requires separate request |
| Durable failed-save recovery | Retry possible because last-captured marker advances only after success; no durable queue evidenced | Pending handoff queue, stale recovery, event resumption, bounded retry attempts |
| Explicit recall budget | Five results × 300 text characters plus instructions; displayed `/4` token estimate | Default 4,000 combined characters; automatic top five, explicit default top three |

## Findings relevant to a Markdown/Git toolkit manual

These products do not establish that a Markdown/Git knowledge system should be replaced with a hosted memory extractor. Their useful evidence concerns how instruction can be divided without forcing a fresh agent to read every procedure at startup.

### Keep the startup contract small and authoritative

Only policy needed for almost every task belongs in the startup path. Both products avoid loading their full operational detail at startup. Supermemory uses startup for source provenance and a bounded profile. Mem0 uses no startup memory instruction at all and relies on the tool description plus first-prompt context.

For this toolkit, a core manual can retain the small set of rules needed to classify durable information, locate the canonical source, distinguish proposed from accepted meaning, and avoid false save claims. Exact formats and unusual procedures can remain outside the startup payload.

### Put task procedures in named, discoverable skills

Mem0's search, remember, forget, pause, resume, and status skills are clean examples of operation-specific teaching. Their descriptions serve as routing triggers; the full instructions appear only when the operation is relevant.

For a Markdown/Git system, comparable skills can own:

- recalling existing project knowledge;
- deciding and preparing what to remember;
- updating an existing canonical record;
- retiring or deleting knowledge;
- auditing status or diagnosing a failed save.

The lesson is placement, not Mem0's storage mechanism.

### Make tool descriptions teach the trigger, not merely the API

Mem0's local tool description explains when search is required, what kinds of facts demand it, and how scope changes results. Supermemory's miss directive similarly tells the agent when deeper search is worthwhile.

A toolkit command or skill description can carry the smallest reliable trigger rule so the primary agent discovers the right procedure at the moment of need.

### Separate dynamic context from operating policy

Both systems inject retrieved facts separately from the rules governing memory. This preserves the distinction between:

- policy: how the agent should reason about durable information;
- state: the facts currently relevant to the task;
- procedure: how to search, save, update, or delete.

That same separation supports a short startup manual, task-specific skills, and bounded project knowledge files in Git.

### Distinguish empty, unavailable, pending, and saved

Supermemory explicitly distinguishes an empty memory set from failed retrieval. Mem0 distinguishes locally captured evidence, pending flush, queued extraction, successful extraction, timeout, partial deletion, and eventual give-up.

A Markdown/Git toolkit should use similarly precise states. A local edit is not a committed save; a commit is not necessarily pushed; a failed read is not absence; an approved update is not complete until the canonical record is verified.

### Let the primary agent shape meaning; let a separate procedure enforce persistence

Mem0's `remember` skill offers a useful pattern: the primary agent creates a precise, user-visible statement and does not claim storage; another mechanism extracts and saves it. Its project extraction rule also gives the main agent's final response more authority than subagent outputs.

For this toolkit, the primary agent can retain responsibility for judgment, approval state, and canonical wording. A skill or save workflow can enforce destination, formatting, validation, Git publication, and recovery. Automatic extraction should not silently decide canonical project truth.

### Use narrow automatic triggers carefully

Supermemory automatically recalls on every substantive prompt and captures on every stop. Mem0 recalls once automatically and flushes at bounded lifecycle points. Both reduce reliance on the agent remembering to act, but both require filtering, deduplication, and clear failure behavior.

In a Git knowledge system, automatic reminders or checks can cover easy-to-miss moments. They should avoid silently publishing meaning, duplicating already loaded context, or turning transient conversation into canonical truth.

### Keep destructive shared operations behind explicit confirmation

Mem0's forget skill is the strongest public example here. It names the exact scope, separates personal and shared memory, and obtains confirmation before irreversible remote deletion. A shared Markdown/Git knowledge retirement or deletion procedure should likewise identify the canonical target and team impact before the destructive step.

### State and enforce context budgets

Both implementations bound recall. Supermemory limits result count and per-result characters and deduplicates within a session. Mem0 gives recall a hard combined character budget and separates it from its extraction budget.

The toolkit should continue to keep core policy small, load exact formats and examples only when needed, and bound dynamic knowledge included in the working context. When possible, it should define the budget in inspectable terms rather than relying on an unmeasured “keep it concise” instruction.

### Keep asynchronous recovery durable

Mem0's handoff queue shows what a reliable asynchronous save mechanism needs: a durable pending record, idempotent identity, retry limits, stale-worker recovery, and observable final state. If any toolkit memory workflow defers a Git save or publication, its handoff must be durable across cleared sessions and must never be represented as already complete.

## Conclusion

Supermemory and Mem0 both teach a fresh coding agent through layered, contextual instructions rather than one complete startup manual. Supermemory puts more behavior into hooks: it injects a profile at startup, automatically recalls on every substantive prompt, and delegates deep research to a specialized agent. Mem0 puts more behavior into a strongly worded search-tool description and on-demand operation skills, while hooks handle first-prompt recall, evidence capture, extraction timing, and recovery.

The closest analogy to a core operating manual is not any single file in either product. It is the combined contract among hook text, tool description, operation skill, and extractor prompt. Their reusable lesson for this toolkit is to keep universal policy at startup, load exact task procedures on demand, inject dynamic facts separately, preserve the main agent's responsibility for meaning and approval, and make save state and failure recovery explicit.

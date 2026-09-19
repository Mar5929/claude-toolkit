# Hindsight and claude-mem instruction-delivery research

> Research evidence and recommendations, not adopted policy. The master design and PRD own toolkit decisions. Per-save memory approval is the default; the separately approved optional project setting and other existing permissions remain governed by R10/R16. These reports do not change those permissions. Findings come from source inspection, not provider runtime experiments or comparative behavioral benchmarks.

Date: 2026-09-19
Research source: GPT-5.6 Sol agent, live primary-source review
Scope: How Hindsight and claude-mem teach a fresh AI agent to use memory, especially the equivalent of a core operating manual. This is instruction and lifecycle research, not a recommendation to adopt either product's storage architecture.

## Source identity and pinning

The Hindsight project reviewed here is the official [`vectorize-io/hindsight`](https://github.com/vectorize-io/hindsight/tree/0a58d695adee239c8990ef30eacf66ebca54094f) repository, pinned at commit [`0a58d695adee239c8990ef30eacf66ebca54094f`](https://github.com/vectorize-io/hindsight/commit/0a58d695adee239c8990ef30eacf66ebca54094f).

The claude-mem project reviewed here is the official [`thedotmack/claude-mem`](https://github.com/thedotmack/claude-mem/tree/adce0fdfaf1cd46646bbd0b22ae74cbd460ed787) repository, pinned at commit [`adce0fdfaf1cd46646bbd0b22ae74cbd460ed787`](https://github.com/thedotmack/claude-mem/commit/adce0fdfaf1cd46646bbd0b22ae74cbd460ed787).

Repository source was treated as the strongest evidence for current runtime behavior. Public documentation was used to explain intended behavior, but source code wins where documentation and code disagree. Absence claims below mean that no evidence was found in the reviewed current integration, skill, prompt, hook, MCP, lifecycle, and documentation sources; they are not universal claims about every historical release or private deployment.

## Executive findings

Neither product gives the fresh primary agent a comprehensive memory operating manual at startup.

Hindsight has two substantially different delivery models. Its general agent plugin gives the primary agent a compact, on-demand skill that teaches deliberate `recall`, `retain`, and `reflect` calls. Its Claude Code integration instead enables automatic recall and retention through hooks; a separate Hindsight extraction process decides what facts to derive from transcripts under a configured extraction mission. The fresh primary agent sees recalled facts plus a small interpretation preamble, not the retention rules or extraction schema.

claude-mem separates the roles even more sharply. The primary agent sees a compact index, a legend, observation IDs, and instructions for fetching details. A separate observer model receives the detailed save taxonomy, inclusion and exclusion rules, output schema, examples, and summary protocol. The observer is technically prevented from using tools or contacting the working session. In effect, claude-mem's detailed memory manual belongs to the background extractor, while its primary-agent manual is a small retrieval guide.

Both products demonstrate progressive disclosure and useful tool descriptions. Neither supplies the toolkit's desired owner-approved meaning boundary for lasting knowledge. Installation or enablement functions as the effective authorization for ongoing automatic capture. Their behavior should therefore inform instruction packaging and context design, not be copied as the toolkit's approval model or source-of-truth architecture.

## Hindsight

### 1. Agent-facing instruction surfaces

#### General agent plugin skill

The closest Hindsight has to a memory operating manual for the primary agent is the [`hindsight-memory` skill](https://github.com/vectorize-io/hindsight/blob/0a58d695adee239c8990ef30eacf66ebca54094f/hindsight-integrations/agent-plugin/skills/hindsight-memory/SKILL.md).

Its frontmatter says to load it when continuity matters, including earlier work, lasting preferences, and questions prior context might answer. The body teaches three actions:

- `recall` at the start of a task, or when the user refers to earlier work, past decisions, preferences, constraints, or accumulated context;
- `retain` when something is durable and reusable, including stable preferences, project facts and decisions, and outcomes or gotchas;
- `reflect` when raw retrieval is too shallow and synthesized reasoning across memories is needed.

The skill includes one concise call example for each tool. It also says:

> Retain the fact, not the whole transcript.

It excludes transient chatter, secrets, and anything the user asked to keep out of memory. It tells the agent to ground answers in recalled results and say when nothing relevant was found rather than inventing continuity. It explains that the bank is selected by the connection and should be isolated by project or user.

This is a compact on-demand skill. The evidence does not show it being automatically loaded into every fresh session as a core manual. Its frontmatter is the routing mechanism that makes it available when the host chooses the skill.

#### MCP tool descriptions

Hindsight's general MCP server provides another agent-facing instruction layer. The tool descriptions and schemas teach correct use at call time. The current source is [`hindsight_api/mcp_tools.py`](https://github.com/vectorize-io/hindsight/blob/0a58d695adee239c8990ef30eacf66ebca54094f/hindsight-api-slim/hindsight_api/mcp_tools.py).

Key instructional details include:

- `retain` describes the content as a specific fact or memory and exposes context, timestamp, tags, metadata, document ID, strategy, and replace-or-append behavior;
- asynchronous `retain` returns an operation ID, while synchronous retain blocks for read-after-write flows;
- `recall` teaches search budgets, token limits, fact types, observation preference, tag filtering, timestamps, score floors, and temporal windows;
- `reflect` explicitly distinguishes raw fact lookup from reasoned synthesis and gives examples of suitable questions;
- `update_memory` explains how to correct extracted raw facts and warns that derived observations are not directly editable;
- `invalidate_memory` teaches reversible retirement and restoration, including removal from recall and recomputation of derived observations;
- document and bank deletion descriptions clearly state that the operation is permanent;
- bank configuration exposes the extraction mission, custom extraction instructions, observation settings, recall token limit, and enabled MCP tool list.

This is a useful self-documenting pattern: the operational distinction between recall, reflection, correction, retirement, restoration, and permanent deletion remains visible even when a longer skill is not loaded.

### 2. Claude Code automatic integration

Hindsight's Claude Code integration is a separate product path from the general agent plugin. Its README describes automatic capture and recall, and the hook file defines the actual lifecycle.

The [`hooks.json`](https://github.com/vectorize-io/hindsight/blob/0a58d695adee239c8990ef30eacf66ebca54094f/hindsight-integrations/claude-code/hooks/hooks.json) registers:

- `SessionStart`: run `session_start.py` for a health check and daemon preparation;
- `UserPromptSubmit`: run `recall.py` and inject relevant memory;
- `Stop`: run `retain.py` asynchronously;
- `SessionEnd`: run `session_end.py` to force a final retain and clean up an auto-started daemon.

The [`session_start.py`](https://github.com/vectorize-io/hindsight/blob/0a58d695adee239c8990ef30eacf66ebca54094f/hindsight-integrations/claude-code/scripts/session_start.py) comments mention `additionalContext`, but the current implementation performs reachability and upgrade checks; it does not inject a memory operating manual. It gracefully starts the service in the background when needed.

The primary agent receives automatic memory through [`recall.py`](https://github.com/vectorize-io/hindsight/blob/0a58d695adee239c8990ef30eacf66ebca54094f/hindsight-integrations/claude-code/scripts/recall.py). On every user prompt when auto-recall is enabled, the hook builds a query, calls Hindsight, and emits `hookSpecificOutput.additionalContext`. The exact injected shape is:

```text
<hindsight_memories>
[preamble]
Current time - [UTC timestamp]

[formatted recalled memories]
</hindsight_memories>
```

The default preamble, from [`lib/config.py`](https://github.com/vectorize-io/hindsight/blob/0a58d695adee239c8990ef30eacf66ebca54094f/hindsight-integrations/claude-code/scripts/lib/config.py), tells the primary agent that these are relevant memories from past conversations, to prioritize recent memories when they conflict, and to use only memories directly useful to the current conversation. The memory formatter in [`lib/content.py`](https://github.com/vectorize-io/hindsight/blob/0a58d695adee239c8990ef30eacf66ebca54094f/hindsight-integrations/claude-code/scripts/lib/content.py#L202-L235) renders each result as text plus optional type and mention time.

This block teaches the agent how to interpret supplied memory. It does not teach the extraction rules, update lifecycle, approval policy, or file organization because the primary agent is not performing those steps in the automatic path.

### 3. Division of judgment

In the agent-plugin path, the primary agent exercises the first-level judgment about whether to retain a durable fact. Hindsight then extracts and organizes structured facts from the submitted content.

In the automatic Claude Code path, the primary agent does not decide what to save. [`retain.py`](https://github.com/vectorize-io/hindsight/blob/0a58d695adee239c8990ef30eacf66ebca54094f/hindsight-integrations/claude-code/scripts/retain.py) reads the Claude Code JSONL transcript, slices the unretained portion or a configured turn window, strips previously injected memory tags to avoid feedback loops, filters roles and optionally tool calls, and sends the resulting transcript to Hindsight. Hindsight's separate extraction model applies the configured mission.

The shipped extraction mission in [`settings.json`](https://github.com/vectorize-io/hindsight/blob/0a58d695adee239c8990ef30eacf66ebca54094f/hindsight-integrations/claude-code/settings.json) says to extract technical decisions, architectural choices, user preferences, project context, and people/tool relationships, while ignoring routine greetings and transient operational details.

That mission is developer configuration for the service extractor. It is not primary-agent startup guidance.

### 4. Default timing and context cost

The actual shipped settings provide the strongest default evidence:

- `autoRecall`: `true`;
- `autoRetain`: `true`;
- recall budget: `mid`;
- recall maximum: 1,024 tokens;
- recall uses only the latest user turn by default;
- recall query is capped at 800 characters;
- recall returns `observation` memories by default;
- retain mode: full session with incremental chunks;
- retain every ten turns, with two-turn overlap where chunk logic applies;
- retain user and assistant roles;
- retain tool calls: `false`;
- final retain is forced at session end, so short sessions are not lost.

The integration thus has an evidenced per-prompt maximum recalled-memory budget of 1,024 tokens. It does not inject the full bank or a full manual. Search thoroughness affects latency separately from the token cap.

#### README/code discrepancy

The [`Claude Code README`](https://github.com/vectorize-io/hindsight/blob/0a58d695adee239c8990ef30eacf66ebca54094f/hindsight-integrations/claude-code/README.md) currently says the `retainToolCalls` default is `true`. Both the shipped [`settings.json`](https://github.com/vectorize-io/hindsight/blob/0a58d695adee239c8990ef30eacf66ebca54094f/hindsight-integrations/claude-code/settings.json) and hardcoded [`DEFAULTS`](https://github.com/vectorize-io/hindsight/blob/0a58d695adee239c8990ef30eacf66ebca54094f/hindsight-integrations/claude-code/scripts/lib/config.py#L10-L50) set it to `false`. Current runtime code should be treated as authoritative. This discrepancy matters because it changes whether automatic retention includes structured tool invocations and results.

The README also provides useful developer-facing configuration explanations, but those explanations are not automatically delivered to the primary agent.

### 5. Claude Code-specific MCP surface

The Claude Code plugin exposes a narrower MCP server than the general Hindsight server. Its current implementation is [`scripts/mcp_server.py`](https://github.com/vectorize-io/hindsight/blob/0a58d695adee239c8990ef30eacf66ebca54094f/hindsight-integrations/claude-code/scripts/mcp_server.py).

It offers:

- current-bank lookup;
- list and get knowledge pages;
- create, update, and permanently delete knowledge pages;
- direct recall across retained conversations and documents;
- ingest raw text;
- ingest a file from disk.

The descriptions contain material operating guidance. Creating a knowledge page requires a `source_query`, described as a question the system re-asks after each consolidation to rebuild the page. The page therefore auto-updates from later conversations. Text ingest says to pass full raw content and never pre-summarize it; the title becomes the document ID and re-ingestion replaces it. Page deletion is described as permanent.

These instructions are visible when the agent considers a tool call. They are not a unified memory manual and do not include an owner-approval protocol.

### 6. Approval, permissions, correction, deletion, and recovery

No built-in per-memory user-approval requirement was found for automatic retention, primary-agent `retain` calls, memory edits, or destructive MCP calls. Installation and enablement are the effective standing grant. Users can disable automatic recall or retention in configuration, and the agent-plugin skill honors an explicit request not to retain something, but this is not the same as requiring approval for each durable meaning change.

The general MCP server provides a well-separated lifecycle:

- correct raw facts with `update_memory`;
- reversibly retire or restore raw facts with `invalidate_memory`;
- permanently remove documents and linked memories with `delete_document`;
- permanently clear memories or delete a bank;
- edit or delete mental models and knowledge pages.

The tool documentation warns when actions cannot be undone, but no additional confirmation handshake is embedded in the reviewed schemas.

The automatic integration has operational recovery features rather than Git-style content recovery:

- retention progress is tracked so subsequent `Stop` hooks send only new messages;
- transcript shrinkage is treated as compaction and starts a fresh chunk;
- `SessionEnd` forces a final retain;
- injected `<hindsight_memories>` blocks are stripped before retention to prevent recursive memory capture;
- most hook failures degrade without blocking the main session.

Reversible invalidation protects individual raw facts, but permanent document or bank deletion is explicitly irreversible. No versioned text history comparable to Git was evidenced.

### 7. Hindsight conclusion

Hindsight does not use one core manual across all integrations. It relies on a layered combination:

1. a compact on-demand skill for agent-chosen memory work;
2. detailed MCP descriptions at the moment of action;
3. optional automatic hooks that bypass primary-agent save judgment;
4. a service-side extraction mission for the background model;
5. a short injected preamble that tells the primary agent how to interpret recalled facts.

The strongest transferable idea is the separation between always-cheap interpretation guidance, on-demand operational instructions, and schema-local details. The automatic capture and lack of per-change approval do not fit the toolkit's settled Markdown/Git authority model.

## claude-mem

### 1. Instruction architecture

claude-mem's instruction architecture is built around two different agents with different manuals.

The primary coding agent receives:

- a compact startup index of prior observations;
- a type legend;
- observation IDs and titles;
- a pointer to `get_observations` and the `mem-search` skill;
- sometimes a recent session summary;
- a footer explaining that more past work is available on demand.

The background observer model receives:

- identity and role instructions;
- what to record and skip;
- observation types and concepts;
- an exact XML output format;
- field guidance;
- progress-summary instructions;
- a strict prohibition on acting, contacting the main session, or producing free prose.

This means its detailed memory operating manual is primarily for the extractor, not the fresh primary agent.

### 2. Lifecycle hooks

The current [`plugin/hooks/hooks.json`](https://github.com/thedotmack/claude-mem/blob/adce0fdfaf1cd46646bbd0b22ae74cbd460ed787/plugin/hooks/hooks.json) registers:

- `Setup` for a fast version check;
- `SessionStart` for worker startup and context injection on startup, resume, clear, and compact;
- `UserPromptSubmit` for session initialization and prompt capture;
- asynchronous `PostToolUse` for tool observations;
- asynchronous `Stop` for a progress summary;
- asynchronous `SessionEnd` for lifecycle closure.

It also registers a `PreToolUse` hook for `Read` as part of claude-mem's optional broader file-context behavior. That feature is adjacent to memory capture and should not be treated as required for the core memory instruction pattern.

The public [`Getting Started`](https://github.com/thedotmack/claude-mem/blob/adce0fdfaf1cd46646bbd0b22ae74cbd460ed787/docs/public/usage/getting-started.mdx) page describes the intended cycle: first session seeds memory, tool activity is captured automatically, `Stop` generates a summary, and later sessions receive prior work. This is developer/user documentation, not content injected wholesale into the model.

### 3. The observer's detailed operating manual

The current code-mode prompt lives in [`plugin/modes/code.json`](https://github.com/thedotmack/claude-mem/blob/adce0fdfaf1cd46646bbd0b22ae74cbd460ed787/plugin/modes/code.json).

Its system identity says the observer creates searchable memory for future sessions and should record what was learned, built, fixed, deployed, or configured rather than describing the observer's activity. It says the observer has no tools and receives everything needed in `<observed_from_primary_session>` messages.

Its role section makes the separation unusually explicit:

- the observer watches a different live Claude Code session;
- it is only observing and recording;
- it should remain invisible to avoid changing the primary session's behavior;
- it must not contact, message, notify, spawn, ask, or influence another session.

Its recording rules prioritize durable technical signal:

- what the system now does differently;
- what shipped;
- domain-level changes;
- concrete debugging findings from logs, traces, queues, databases, or code paths.

It skips empty status checks, uneventful package installations, unproductive file listings, repeated information, and empty research. It supplies good and bad examples.

The output contract requires XML observations with:

- one of nine exact types: bugfix, feature, refactor, change, discovery, decision, security alert, security note, or sensitive;
- title and short subtitle;
- self-contained facts without pronouns;
- narrative;
- two to five concepts from a controlled seven-item vocabulary;
- files read and files modified.

A separate summary protocol records request, investigation, learning, completed work, next steps, and notes. The observer must return only the required XML root.

The prompt is assembled and fed observations by [`src/sdk/prompts.ts`](https://github.com/thedotmack/claude-mem/blob/adce0fdfaf1cd46646bbd0b22ae74cbd460ed787/src/sdk/prompts.ts). Each observed tool call includes the tool name, time, working directory, parameters, and outcome. Large fields are capped at 16,000 characters each with visible elision markers, and image payloads are removed. The observer is told not to infer details from elided content.

These are extraction instructions for a separate model. They should not be mistaken for instructions the working agent reads at startup.

### 4. Technical enforcement of observer boundaries

claude-mem reinforces the prompt boundary in [`src/sdk/hardened-options.ts`](https://github.com/thedotmack/claude-mem/blob/adce0fdfaf1cd46646bbd0b22ae74cbd460ed787/src/sdk/hardened-options.ts).

On the SDK path it configures:

- `tools: []`;
- `allowedTools: []`;
- an explicit deny list covering file, shell, web, task, messaging, and user-question tools;
- `permissionMode: 'dontAsk'`;
- a callback that denies and audits every attempted tool call;
- no inherited MCP servers;
- no inherited setting sources;
- no additional directories;
- a dedicated working-directory jail;
- strict MCP configuration.

The source comments acknowledge that the CLI-spawn path relies more heavily on the explicit deny list because several SDK options lack command-line equivalents. This is a valuable caveat: the intended boundary is strongest on the SDK path.

The separation between prompt instruction and mechanical enforcement is directly relevant to helper design. A helper that only classifies or summarizes should not inherit the authority of the main agent.

### 5. What the fresh primary agent sees

Startup content is built by the context service and rendered by [`AgentFormatter.ts`](https://github.com/thedotmack/claude-mem/blob/adce0fdfaf1cd46646bbd0b22ae74cbd460ed787/src/services/context/formatters/AgentFormatter.ts).

The primary agent sees:

- a heading with the project and current date/time;
- the active observation mode;
- a compact legend;
- the line `Fetch details: get_observations([IDs]) | Search: mem-search skill`;
- a timeline of IDs, times, type icons, and titles;
- selected expanded observations if the budget permits;
- the last assistant message under `Previously`, when present;
- a footer such as `Access [N]k tokens of past work via get_observations([IDs]) or mem-search skill.`

This is an index and retrieval invitation. It does not teach the primary agent what should have been saved, because the observer already made that decision.

The generated markdown marker file used by some integrations has a minimal fallback:

```text
<claude-mem-context>
# claude-mem: Cross-Session Memory

*No context yet. Complete your first session and context will appear here.*

Use claude-mem's MCP search tools for manual memory queries.
</claude-mem-context>
```

The tagged replacement logic is in [`src/utils/context-injection.ts`](https://github.com/thedotmack/claude-mem/blob/adce0fdfaf1cd46646bbd0b22ae74cbd460ed787/src/utils/context-injection.ts). This fallback is still not a memory operating manual.

### 6. On-demand retrieval skill and MCP tools

The primary agent's detailed retrieval procedure lives in [`plugin/skills/mem-search/SKILL.md`](https://github.com/thedotmack/claude-mem/blob/adce0fdfaf1cd46646bbd0b22ae74cbd460ed787/plugin/skills/mem-search/SKILL.md).

The skill teaches a four-layer workflow:

1. `search` for a lightweight index with IDs;
2. `timeline` around promising results;
3. `get_observations` for full details of selected IDs, batched for two or more;
4. `get_tool_uses` only when an observation summary omitted exact raw bytes that matter.

It explicitly says never to fetch full details before filtering. It gives exact schemas, examples, and estimates:

- about 50 to 100 tokens per search result;
- about 500 to 1,000 tokens per full observation;
- raw tool bodies may run to thousands of tokens and are capped on storage at 64 KB.

It describes the result as roughly a tenfold token saving from filtering before fetch.

The MCP server repeats the workflow in its own tool descriptions, beginning with `LAYERED WORKFLOW (ALWAYS FOLLOW)`. Its current source is [`src/servers/mcp-server.ts`](https://github.com/thedotmack/claude-mem/blob/adce0fdfaf1cd46646bbd0b22ae74cbd460ed787/src/servers/mcp-server.ts#L446-L590). This duplication is purposeful and helpful: the agent receives the retrieval discipline through either the skill or the tools it is about to call.

The core worker-mode schemas include:

- `search`: query, limit, project, platform, record category, observation type, date range, offset, and sort;
- `timeline`: anchor or query, before/after depth, and project;
- `get_observations`: required ID array plus ordering, limit, and project;
- `get_tool_uses`: required numeric or opaque tool-use IDs plus optional project and session scope.

The hosted recall MCP is deliberately read-only and exposes only search, context, and recent observations. Its source explicitly says mutating tools are absent from a pasted recall link. See [`recall-mcp-server.ts`](https://github.com/thedotmack/claude-mem/blob/adce0fdfaf1cd46646bbd0b22ae74cbd460ed787/src/server/mcp/recall-mcp-server.ts).

### 7. Progressive disclosure and context limits

claude-mem provides unusually concrete evidence about context cost.

The public [`progressive-disclosure.mdx`](https://github.com/thedotmack/claude-mem/blob/adce0fdfaf1cd46646bbd0b22ae74cbd460ed787/docs/public/progressive-disclosure.mdx) explains the intended design: show titles, dates, types, IDs, and retrieval costs first; let the agent decide what deserves full retrieval; use source files only for a final deep dive.

The runtime enforcement is stronger evidence. [`ContextBudget.ts`](https://github.com/thedotmack/claude-mem/blob/adce0fdfaf1cd46646bbd0b22ae74cbd460ed787/src/services/context/ContextBudget.ts) caps hook output at 10,000 characters because Claude Code writes larger output to disk and replaces it with a preview stub, which can leave the model without usable injected context.

The fitter reduces content in this order:

1. remove full observation narratives while keeping their timeline titles;
2. remove the last-session summary block;
3. reduce session count;
4. reduce observation count, while preserving at least one.

It measures the rendered result repeatedly instead of assuming every observation has the same size. Source comments note that titles, summary rows, and full summaries vary substantially in size.

This is a strong instruction-design lesson: define what information may be dropped first and enforce the actual delivery limit mechanically. Do not rely only on prose such as “keep it concise.”

### 8. Division of judgment

The primary agent's judgment is primarily retrieval judgment: it sees the current task, scans the index, decides which records are relevant, and chooses how deeply to fetch.

The observer model's judgment is retention and compression judgment: it decides which tool activity contains durable signal, how to classify it, what facts and narrative to produce, and whether to skip it. The main agent does not approve each observation and does not author the observation XML.

This division differs from the toolkit's approved direction, where the main agent applies the core memory policy and the owner controls durable meaning. claude-mem demonstrates a clean technical separation, but not the same authority model.

### 9. Privacy and approval

Installing claude-mem enables automatic capture. No per-observation owner-approval gate was found in the reviewed normal workflow.

Users can prevent specific material from entering storage with `<private>...</private>` tags. The public [`Private Tags`](https://github.com/thedotmack/claude-mem/blob/adce0fdfaf1cd46646bbd0b22ae74cbd460ed787/docs/public/usage/private-tags.mdx) page says filtering occurs at the hook boundary before storage:

- private spans are removed from stored user prompts;
- serialized tool inputs and responses are filtered before observation creation;
- private content does not reach the database, search index, or memory agent;
- the live primary agent still sees the material for the current session.

This is an opt-out marking mechanism, not a positive approval protocol. The documentation also recommends ordinary secrets management rather than relying on memory tags for credentials.

The `how-it-works` skill says local storage remains under `~/.claude-mem`, except for model-provider calls used for compression, and that uninstall removes the local data. See [`plugin/skills/how-it-works/SKILL.md`](https://github.com/thedotmack/claude-mem/blob/adce0fdfaf1cd46646bbd0b22ae74cbd460ed787/plugin/skills/how-it-works/SKILL.md). Cloud or hosted configurations have additional data paths and should not be inferred from that local-mode statement.

### 10. Update, deletion, export, and recovery

claude-mem is principally an observation log rather than a curated current-truth knowledge base. The reviewed primary memory-search workflow does not present update/supersede/retire semantics comparable to the toolkit's Markdown files.

Individual observations, session summaries, and prompts can be deleted through the worker API. The production deletion surface in [`DataRoutes.ts`](https://github.com/thedotmack/claude-mem/blob/adce0fdfaf1cd46646bbd0b22ae74cbd460ed787/src/services/worker/http/routes/DataRoutes.ts#L315-L390) coordinates local deletion with cloud-sync tombstones in one transaction. It refuses an acknowledged cloud-synced deletion when it cannot enqueue the matching tombstone, avoiding a silent local-only delete.

The project documents export and import of selected memories in [`usage/export-import.mdx`](https://github.com/thedotmack/claude-mem/blob/adce0fdfaf1cd46646bbd0b22ae74cbd460ed787/docs/public/usage/export-import.mdx). Export files are plain text and require a privacy review before sharing.

Queue recovery is deliberately manual in current documented behavior. [`usage/manual-recovery.mdx`](https://github.com/thedotmack/claude-mem/blob/adce0fdfaf1cd46646bbd0b22ae74cbd460ed787/docs/public/usage/manual-recovery.mdx) explains that automatic reprocessing on worker startup was disabled to avoid unexpected duplicate observations. Stuck work is reset to pending but is not automatically regenerated. The interactive recovery command:

- checks worker health;
- shows pending, processing, failed, and stuck counts;
- shows affected sessions;
- asks the user to confirm recovery;
- offers an explicit `--process` mode for intentional automation.

This is a real user-confirmation boundary, but it applies to retrying failed processing, not approving the meaning of a memory.

### 11. claude-mem conclusion

claude-mem's equivalent of an operating manual is distributed across three places:

1. the observer mode prompt, which contains the detailed save taxonomy and exact output contract;
2. the startup index, which gives the primary agent lightweight orientation and retrieval handles;
3. the `mem-search` skill and MCP descriptions, which teach progressive retrieval on demand.

It does not load a comprehensive memory policy into the primary agent. Instead, it keeps primary-agent context small and delegates memory extraction to a separate, constrained model.

The strongest transferable lessons are the explicit role boundary, the mechanical lockdown of the helper, the layered retrieval workflow, visible retrieval cost, and measured context trimming. Automatic capture without per-meaning approval and an opaque observation database are not aligned with the toolkit's settled source-of-truth and owner-approval requirements.

## Cross-product comparison focused on instruction delivery

| Question | Hindsight | claude-mem |
| --- | --- | --- |
| Does a fresh primary agent receive a full memory manual at startup? | No. Automatic integration injects recalled facts plus a small interpretation preamble. General agent plugin offers an on-demand skill. | No. Startup injects a compact observation index and retrieval directions. |
| Where are detailed save rules? | In the optional agent skill for deliberate calls and in service-side extraction mission/configuration for automatic capture. | In the separate observer model's mode prompt. |
| Who decides what becomes memory? | Agent in explicit `retain` path; extraction service in automatic transcript path. | Separate observer model, triggered by hooks. |
| What does the primary agent decide? | Whether to call recall/retain/reflect in agent-driven use; how to apply injected facts. | Which indexed observations to retrieve and how deeply. |
| How is retrieval taught? | Skill examples, MCP descriptions, and an injected relevance preamble. | Startup legend/index, `mem-search` skill, and repeated MCP workflow descriptions. |
| Startup cost evidence | Automatic recall capped at 1,024 tokens by shipped default; query capped at 800 characters. | Startup injection mechanically capped at 10,000 characters; progressively drops expensive detail. |
| Per-memory owner approval? | No built-in positive approval gate found. | No built-in positive approval gate found. |
| User exclusion mechanism | Skill says not to retain user-excluded content; automatic path can be disabled or filtered by configuration. | `<private>` tags remove marked content before storage. |
| Correction and retirement | Explicit raw-fact edit plus reversible invalidation/restoration; permanent deletion is separate. | Primarily delete/export/recover observation records; no equivalent curated supersede/retire policy evidenced. |
| Recovery | Incremental retention state, compaction detection, final session retain, graceful failure. | Manual queue recovery with confirmation to avoid duplicate processing; deletion coordinates cloud tombstones. |
| Authoritative store | Hindsight bank/database. | Local or hosted observation database and search index. |
| Fit with Markdown/Git source of truth | Instruction patterns are useful; storage and automatic authority model do not fit directly. | Retrieval and helper-isolation patterns are useful; storage and automatic authority model do not fit directly. |

## Implications for the toolkit's Markdown/Git manual

### Preserve the settled core/manual plus task-skill split

The approved toolkit direction, with core policy read at startup and exact formats/examples loaded through task skills, is supported by the strongest parts of both products.

Hindsight implements a small on-demand memory skill for recall, retain, and reflect without loading every schema into every session. claude-mem implements a small index with later retrieval of selected details. These are implementation patterns; this research did not measure their behavioral effectiveness.

The toolkit should keep at startup only what the agent must know before it can safely decide what to do:

- authority and source precedence;
- the difference between current truth, working state, requirements, and history;
- the durable-memory selection test;
- owner approval requirements;
- the map to the selected knowledge-find, knowledge-save, knowledge-review, and knowledge-setup skills.

Exact proposal shapes, examples, file metadata, conflict procedures, and command sequences belong in the appropriate task skill.

### Put operational distinctions in tool or skill descriptions

Both products benefit from clear verb distinctions visible at the moment of action. The toolkit's task skills should keep recall, propose/save, reflect, update/supersede/retire, delete, and recovery semantically distinct.

Short descriptions should answer:

- what the operation changes;
- when to use it;
- whether it is reversible;
- whether approval is required;
- what source remains authoritative afterward.

This reduces dependence on remembering a long startup manual.

### Keep helper authority narrow and explicit

claude-mem's observer is a strong example of aligning role text with mechanical permissions. If the toolkit uses a helper to gather candidates, check duplicates, or run a parallel review, the helper should receive only the task-specific rubric and should lack write authority. The main agent remains responsible for routing and proposals, and the owner remains responsible for approving durable meaning.

The toolkit should not copy claude-mem's hidden automatic extraction merely because its observer is well constrained. The transferable lesson is the boundary, not the delegation of authority.

### Treat context as a measured budget

claude-mem provides the clearest implementation lesson:

- indexes are maps, not evidence;
- compact titles and IDs are cheap startup context;
- full content should be loaded after relevance is established;
- delivery limits should be measured in the actual rendered output;
- degradation order should be explicit.

For a Markdown/Git system, the analogous order is:

1. load the small core manual and indexes;
2. open only relevant source files;
3. load the task skill when performing a memory operation;
4. load exact examples and templates only when the operation requires them.

This preserves attention without turning the index into a source of truth.

### Preserve the toolkit's stronger approval model

Neither product supplies positive owner approval for each lasting meaning change. Hindsight relies on agent or service extraction after installation; claude-mem automatically generates observations after installation and offers opt-out privacy tags.

The toolkit's requirement that the owner approve the meaning and source of lasting memory is materially stronger. Nothing in this research supports weakening it. Automatic hooks may remind, gather candidates, or trigger a quiet review, but they should not decide and write durable project truth.

### Separate correction, retirement, deletion, and recovery

Hindsight usefully distinguishes correction, reversible invalidation, restoration, and permanent deletion. claude-mem usefully distinguishes ordinary processing from deliberate recovery of stuck work.

The toolkit should retain equally clear semantics:

- edit when current truth is being corrected or extended;
- supersede when a new current truth replaces an old one;
- retire when material no longer applies but history matters;
- delete only under the narrow documented conditions;
- recover a failed save or interrupted publication without repeating the meaning decision;
- keep Git as the audit and recovery mechanism.

### Do not infer architectural endorsement

Hindsight's memory banks, fact extraction, mental models, vector retrieval, and service configuration are not evidence that the toolkit should adopt an external memory database.

claude-mem's SQLite database, observer queue, vector index, and automatic tool capture are not evidence that the toolkit should replace curated Markdown/Git knowledge.

The relevant lessons are about how instructions reach an agent, how responsibility is divided, how retrieval is progressively disclosed, how helper authority is constrained, and how lifecycle operations are named. The toolkit's authoritative Markdown/Git architecture and owner-approval policy remain independent design choices.

## Bottom-line answer to the research question

Hindsight and claude-mem do not teach a fresh primary agent through a single comprehensive operating manual.

Hindsight uses a compact memory skill when the agent is expected to exercise judgment, detailed MCP descriptions at action time, and optional hooks plus a service-side extraction mission when memory is automatic.

claude-mem gives the fresh primary agent a compact retrieval index and places the detailed save manual in a separate locked-down observer model.

For the toolkit, the best-supported pattern is therefore: a short core policy at startup, a lightweight index as a map, exact task procedures in on-demand skills, important operation semantics repeated in skill/tool descriptions, and narrowly authorized helpers. The toolkit should preserve its distinct rule that the main agent proposes curated meaning and the owner approves lasting changes before Markdown/Git truth is changed.

# Knowledge System: host capability evidence

Checked 2026-09-17. Supports the [master design](../269-knowledge-system.md).
This is design research, not runtime acceptance or authorization to build.

## Evidence levels

- **Installed observation:** commands or repository files inspected locally.
- **Documented:** current first-party material fetched on this date. Rolling
  documentation can describe a newer release than the installed executable.
- **Proposed:** architecture inferred from those capabilities; requires the
  bounded proofs below before being described as working or enforced.

No model sessions, billable API requests, or runtime configuration changes were
made for this research. Version/help/feature commands do not test a real turn.

## Installed observation

| Surface | Observation | Limit |
| --- | --- | --- |
| Codex executable on PATH | `codex --version`: `codex-cli 0.154.0`; npm package reports `0.154.0` | Does not establish the desktop app's bundled runtime version. |
| Codex feature report | `codex features list`: hooks stable/enabled; code-mode host stable/enabled | Does not prove every event in this desktop task executes. |
| Claude executable on PATH | `claude --version`: `2.1.259 (Claude Code)` | Current docs mention later versions, including 2.1.271. |
| Project Codex hooks | `.codex/hooks.json` registers only knowledge `SessionStart`; includes a Windows command override, 10-second timeout, and context limit | No project-local prompt/Stop knowledge adapter is installed here. Other configuration layers were not exhaustively audited. |
| Project Claude hooks | `.claude/settings.json` registers knowledge startup, memory prompt reminder, style prompt/read handshake, and several tool reminders | Configuration is not fresh-session execution proof. |
| Existing style handshake | `.claude/hooks/style-handshake.mjs` requests a Read and checks returned line-range metadata in PostToolUse; exceptions continue silently | It requests an acknowledgment; it does not enforce a gate, inspect understanding, or verify the emitted acknowledgment. |
| Existing memory reminder | `.claude/hooks/memory-reminder.mjs` emits guidance and always succeeds | It is a reminder, not a save-completion check. Its old policy wording needs reconciliation during implementation. |

## Current official contracts

### Codex

[Hooks reference](https://learn.chatgpt.com/docs/hooks), fetched 2026-09-17:

- `command` and `mcp_tool` handlers execute; `prompt` and `agent` handlers are
  parsed but skipped.
- `SessionStart` and `UserPromptSubmit` can supply developer context.
  Root-session `SessionStart` with source `compact` supplies context before the
  next model request, including mid-turn automatic compaction.
- `Stop` accepts JSON; a block decision with a reason requests continuation.
  `stop_hook_active` identifies a prior continuation.
- `PreToolUse` supports denial on covered local tools. Hosted and specialized
  paths can escape coverage; `write_stdin` does not repeat PreToolUse.
- `PreCompact`/`PostCompact` ignore plain stdout; their JSON can stop processing.
- `SubagentStart` injects context but cannot prevent creation. Subagents share
  the parent's session identifier and have separate agent identifiers.
- Multiple command hooks run concurrently. Transcript format is not stable.
  Unsupported PreToolUse common fields can fail the hook while the tool proceeds.

These are rolling-document claims, not a complete compatibility assertion for
the installed CLI or desktop runtime. No equivalent to Claude Mods was
established in the inspected official Codex documentation.

### Claude Code

[Hooks reference](https://code.claude.com/docs/en/hooks), fetched 2026-09-17:

- `SessionStart` supplies context; startup cannot be blocked through exit 2.
  `UserPromptSubmit` supplies context before processing; blocking rejects the
  prompt rather than waiting for the agent to read something.
- `PreToolUse` can deny tools. Missing scripts, invalid output, and command-hook
  timeouts can allow execution to continue.
- `Stop`/`SubagentStop` can request continuation. Use `stop_hook_active` to avoid
  loops; current docs describe an eight-continuation cap.
- `PreCompact` supports blocking compaction; this can surface a context-limit
  failure. `PostCompact` has no decision control.
- `SubagentStart` supplies context but cannot block creation. Current docs
  describe context reuse and reinjection after compaction.
- Newer documented subagent handback behavior is explicitly versioned 2.1.271;
  it cannot be assumed present in installed 2.1.259.

### Function hooks / Claude Mods

[Anthropic repository announcement](https://github.com/anthropics/claude-code/issues/91870),
opened September 3, updated September 9, fetched September 17, 2026, describes
TypeScript function hooks, registration-ordered middleware nesting, and the
name Claude Mods. It offers experimental access through
`CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`, refers to v267/v268 affordances, and says
the interface is still changing. Installed 2.1.259 predates those referenced
versions. Do not equate the announcement with local availability or a stable
cross-host API. No experimental flag was enabled.

## Recommended baseline

Use ordinary synchronous command hooks with a shared small protocol and separate
host output adapters. Native reasoning selects useful information, determines
meaning and destination, and follows existing permission. Scripts maintain only
objective checkpoint state and validation results. Do not add a second model
or semantic supervisor.

| Checkpoint | Proposed behavior | What it establishes |
| --- | --- | --- |
| Startup/recovery | Emit one short ordered list of required relative paths and the current protocol generation. Agent reads them and reports completion or the missing resource. | Instruction delivery and an agent declaration; actual file reads require separate observable evidence. |
| Each user prompt | Emit compact selection criteria and pointers; request an intent acknowledgment. | This turn's reminder and declared intent, never completed review. |
| Completion | Agent records a concise outcome: no change, authorized save completed, pending approval, or interrupted/failed save. Stop requests at most one corrective review if that outcome is missing. | A bounded opportunity to finish review; not proof that its judgment is correct. |
| Compaction | Preserve only checkpoint identifiers before compaction; restore the read instruction and links on supported recovery events. | Recovery from durable project records; no dependency on retaining an entire transcript. |
| Helper lifecycle | Supply role-scoped orientation; keep helper checkpoint state separate. Main agent consolidates proposed changes and maintains the authoritative work record. | No reuse of another agent's acknowledgment or accidental helper approval. |

### Selected reader and acknowledgment transport

Recommend one small installed command helper with `read` and `ack` operations,
plus host-specific PostToolUse result adapters. This is the selected design
candidate to prove, not a working installed feature. Use the same helper on
both hosts rather than interpreting arbitrary shell reads or assuming Codex
returns Claude Read-tool metadata.

1. Startup creates a generation scoped to the project, host, session, and agent,
   with the ordered required-file manifest. Keep this startup/read generation
   separate from the per-message review generation: a new prompt alone must not
   invalidate unchanged completed startup reads. Relevant guidance changes or
   recovery that loses required context invalidate the affected read scope.
   The helper's `read` accepts only a
   manifest entry and the next requested range. It returns a bounded text chunk
   and a receipt identifying generation, file digest, range, and total size.
   Small files need one invocation; large files need successive chunks.
2. A PostToolUse adapter recognizes that helper's result and validates successful,
   untruncated output with the expected range and digest. It records delivered
   ranges. A receipt written by the reader alone establishes only that the file
   was read by a process, not that its contents reached model context.
3. After reading the returned content, the agent invokes `ack` with the current
   generation and receipts. Completion requires all required ranges delivered
   in order and the separate acknowledgment. A changed digest invalidates the
   affected file's completion; partial output, missing files, stale generations,
   and another agent's receipts remain incomplete.

The adapter must first prove what each host exposes at PostToolUse and whether
output truncation occurs before or after that event. If full model-visible
delivery cannot be established, this transport cannot be called a verified
read. Tune bounded chunks below the demonstrated host limit; account for
wrappers, code-mode tools, and output limits in that proof. Do not infer success
from exit status alone or add a general shell-command parser.

An acknowledgment remains the agent's declaration. Even successful content
delivery plus acknowledgment is observable protocol evidence, never proof of
cognitive understanding or future compliance. Keep owner-facing acknowledgment
separate; do not scrape free-form prose or private transcripts. Temporary state
contains only identifiers, receipts, completion flags, and bounded retries.
It must not become another memory database. Reads still consume context.
Serialize state updates or compare the active generation before accepting an
update; atomic file replacement alone does not stop a delayed old hook from
overwriting newer state. Test delayed read/Stop results after a new prompt.

Declaration-only operation is a **degraded mode**. It does not satisfy R2's
strict verified-read requirement and cannot pass full Knowledge System
acceptance. Report that gap and retain the build/release blocker rather than
silently substituting guidance for the required proof.

## Gate boundary and failure behavior

A startup hook must finish before the agent can act on its instruction. It
cannot stay blocked waiting for the same agent to acknowledge: that deadlocks
the interaction. Deliver the instruction, then evaluate objective checkpoint
state at a later supported tool/completion event.

Any optional PreToolUse guard must allow the reads and acknowledgment mechanism
needed to satisfy it. Limit denial to explicitly covered operations with
tested adapters. A missing acknowledgment can justify a reminder or covered
tool denial; it cannot prove an unsafe or irrelevant semantic decision.

Do not market ordinary hooks as a repository security boundary. Out-of-band
edits, unsupported tools, disabled hooks, trust settings, timeouts, and damaged
configuration remain possible. Report degraded protection. Never trap the
conversation in retries; preserve unfinished saves in the existing records.
Interruptions are unfinished checkpoints, not successful completion events.

Do not use PreCompact as the only save moment or depend on blocking automatic
compaction to force a model review. Save while context is available; use
compaction hooks for objective bookkeeping and restoration. Test root and helper
recovery independently.

## Proofs required before implementation acceptance

| Spike | Pass evidence | Fallback if unavailable |
| --- | --- | --- |
| H1 Event delivery | Fresh CLI and desktop runs on each host capture ordered startup, prompt, tool, Stop, manual/automatic compact, and helper events; record runtime version and effective trusted config. | Publish a support matrix, not a universal feature claim. |
| H2 Read/ack protocol | Prove bounded helper output reaches model context untruncated; observe every required range/digest and a separate current-generation ack. Missing files, partial output, changed content, stale generations, and cross-agent receipts cannot complete startup. Duplicate ack is harmless. | Explicit degraded declaration-only mode; R2 remains unmet and full acceptance blocked. |
| H3 Bounded continuation | One missing-outcome review request; next completion does not loop. Test interruption and interaction with another Stop hook. | Prompt-side guidance and explicit pending state. |
| H4 Objective guard | Exercise shell, patch, MCP, code-mode calls, shell continuation, and bypass paths; test malformed output, timeout, missing executable, and disabled/untrusted hooks. | Remove ENFORCE claims for uncovered routes. |
| H5 Recovery | Manual and automatic compaction, resume, helper reuse, concurrent sessions, and restart preserve authority and pending work without replaying completed saves. | Reload owning records and report lost transient state. |
| H6 Context budget | Measure hook text, actual reads, acknowledgments, and repeated reminders across a long conversation. | Reduce repetition and use linked on-demand detail without omitting required reads. |

Tests needing actual model sessions require a later authorized validation run;
this research did not execute them. Fixture tests alone are insufficient.

## Optional Mods investigation

After the baseline is proven, a separate opt-in experiment can determine whether
Mods improve event ordering or state lifetime. Pin the tested Claude release,
keep the same protocol semantics, and require startup/read/ack/failure parity.
Retain ordinary hooks for Codex and nonparticipating Claude installations.
Middleware is an implementation option, not a prerequisite for this design.

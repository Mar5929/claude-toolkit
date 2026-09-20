# Native hook correlation evidence — 2026-09-20

This report preserves the source fields used for the bounded completion-hook
correction. It is runtime evidence, not a general ordering guarantee or proof
for an untested host surface.

## Sources and method

- Runtime versions: `codex-cli 0.154.0` and `Claude Code 2.1.271` on macOS.
- Codex contract reference: [official hook documentation](https://learn.chatgpt.com/codex/hooks),
  checked 2026-09-20. The correlation conclusion below comes from native event
  input, not from assuming the documented field behaves as described.
- Claude contract reference: the captured [Claude Code hook documentation](../../../../ai-external-knowledge/claude-code/hooks.md#common-input-fields),
  especially its common `prompt_id` field and Stop input. Documentation alone
  was not used to establish a prompt-to-Stop mapping.
- Every run used a new temporary working directory, existing credentials and
  read-only/no-approval CLI flags. No repository, settings, hook registration,
  trust or authentication file was changed. The project hooks required review;
  the run selected **Continue without trusting**.

Claude received one-run `--settings` JSON containing command loggers for
`UserPromptSubmit`, `Stop` and `StopFailure`. The exact native invocation was:

```sh
claude -p --verbose --restricted --no-session-persistence \
  --permission-prompts none --setting-sources project \
  --settings "$capture_settings" --output-format stream-json \
  --include-hook-events --model sonnet 'Reply exactly with OK.'
```

Each logger was a ten-second `python3 -c` command that copied stdin to the
temporary event file. Authentication failed after `UserPromptSubmit` with
`Failed to authenticate: OAuth session expired and could not be refreshed`.
Neither `Stop` nor `StopFailure` ran.

Codex capture used an already-trusted user-level Python hook without changing
its command or configuration. A disposable `sitecustomize.py`, selected only
through `PYTHONPATH`, copied that hook's stdin before restoring it for the real
hook. `KNOWLEDGE_HOOK_CAPTURE` selected the temporary event file. The two-turn
run used these exact native invocations:

```sh
codex --sandbox read-only --ask-for-approval never exec \
  -m gpt-5.6-sol --skip-git-repo-check --json \
  'Reply exactly with ONE. Do not call tools.'

codex --sandbox read-only --ask-for-approval never exec resume \
  -m gpt-5.6-sol --skip-git-repo-check --json '<redacted-session-handle>' \
  'Reply exactly with TWO. Do not call tools.'
```

Before the explicit-model rule was supplied, a separate one-continuation probe
used this invocation and the configured default, GPT-6 Astra. It was not rerun
or relabelled as Sol:

```sh
codex --sandbox read-only --ask-for-approval never exec \
  --ephemeral --skip-git-repo-check --json \
  'Reply exactly with FIRST. Do not call tools.'
```

For that probe only, the disposable capture shim returned `decision: "block"`
on the first Stop and recorded a marker before allowing the next Stop through.

## Selected native event input

Machine-specific transcript and temporary paths are omitted. Session, prompt,
turn and resume identifiers are replaced with stable descriptive placeholders.
Their equality, difference and event ordering are preserved.

The Claude run produced only:

```json
{"session_id":"claude-session","prompt_id":"claude-prompt","permission_mode":"default","hook_event_name":"UserPromptSubmit","prompt":"Reply exactly with OK."}
```

The Sol two-turn Codex session produced, in order:

```json
{"session_id":"codex-session-two-turn","hook_event_name":"SessionStart","model":"gpt-5.6-sol","permission_mode":"bypassPermissions","source":"startup"}
{"session_id":"codex-session-two-turn","turn_id":"codex-turn-one","hook_event_name":"UserPromptSubmit","model":"gpt-5.6-sol","permission_mode":"bypassPermissions","prompt":"Reply exactly with ONE. Do not call tools."}
{"session_id":"codex-session-two-turn","turn_id":"codex-turn-one","hook_event_name":"Stop","model":"gpt-5.6-sol","permission_mode":"bypassPermissions","stop_hook_active":false,"last_assistant_message":"ONE"}
{"session_id":"codex-session-two-turn","hook_event_name":"SessionStart","model":"gpt-5.6-sol","permission_mode":"bypassPermissions","source":"resume"}
{"session_id":"codex-session-two-turn","turn_id":"codex-turn-two","hook_event_name":"UserPromptSubmit","model":"gpt-5.6-sol","permission_mode":"bypassPermissions","prompt":"Reply exactly with TWO. Do not call tools."}
{"session_id":"codex-session-two-turn","turn_id":"codex-turn-two","hook_event_name":"Stop","model":"gpt-5.6-sol","permission_mode":"bypassPermissions","stop_hook_active":false,"last_assistant_message":"TWO"}
```

The earlier Astra continuation session produced, in order:

```json
{"session_id":"codex-session-continuation","hook_event_name":"SessionStart","model":"gpt-6-astra","permission_mode":"bypassPermissions","source":"startup"}
{"session_id":"codex-session-continuation","turn_id":"codex-turn-continuation","hook_event_name":"UserPromptSubmit","model":"gpt-6-astra","permission_mode":"bypassPermissions","prompt":"Reply exactly with FIRST. Do not call tools."}
{"session_id":"codex-session-continuation","turn_id":"codex-turn-continuation","hook_event_name":"Stop","model":"gpt-6-astra","permission_mode":"bypassPermissions","stop_hook_active":false,"last_assistant_message":"FIRST"}
{"session_id":"codex-session-continuation","turn_id":"codex-turn-continuation","hook_event_name":"Stop","model":"gpt-6-astra","permission_mode":"bypassPermissions","stop_hook_active":true,"last_assistant_message":"Continued once."}
```

`permission_mode: "bypassPermissions"` is recorded exactly as emitted even
though the Codex commands requested read-only sandboxing and no approvals. This
report does not interpret that label as a permission change.

## Confirmed contract and limits

| Question | Evidence | Status |
| --- | --- | --- |
| Does Codex correlate prompt and ordinary Stop? | Each Sol `UserPromptSubmit` and its Stop carried the same nonempty `turn_id`. | Confirmed for Codex CLI 0.154.0 main-thread exec on this macOS host. |
| Does a later human prompt get a distinct identifier? | The resumed prompt kept `codex-session-two-turn` and changed `turn_id` from `codex-turn-one` to `codex-turn-two`. | Confirmed for the observed two-turn session. |
| Does a Stop continuation keep the identifier? | Both Astra Stops kept `codex-turn-continuation`; the second set `stop_hook_active: true`. | Confirmed for the observed continuation. Model is recorded as Astra, not Sol. |
| Can the hook ignore a late Stop for an older Codex turn? | The fields above make an exact stored-versus-incoming comparison possible. | Deterministically covered by `plugins/second-brain/tests/checkpoints.test.mjs`; actual out-of-order delivery was not observed. |
| Does Claude carry one `prompt_id` from UserPromptSubmit through Stop? | UserPromptSubmit carried a nonempty `prompt_id`, but OAuth failed before Stop. | Unverified. No Claude mapping is implemented or claimed. |
| Are ordering, subagents, desktop UI and Windows covered? | No native trial covered those surfaces. | Unverified; this evidence must not be generalized to them. |

Observed ordering was SessionStart, UserPromptSubmit, Stop for each ordinary
Codex turn and UserPromptSubmit, Stop(false), Stop(true) for the continuation.
That is an observation, not proof that delivery can never be delayed or
reordered.

The bounded implementation consequence is Codex-only correlation: save a
nonempty `turn_id` when prompt review begins, and ignore an incoming Stop when
both identifiers exist and differ. If either identifier is absent, preserve
the previous compatibility behavior while reporting that late-Stop isolation
is unavailable. Preserve the generation receipt and one-continuation controls.

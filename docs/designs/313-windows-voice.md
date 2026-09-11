# Windows voice replies

Canonical requirements and delivery state: [issue #313](https://github.com/Mar5929/claude-toolkit/issues/313).

## Ownership

An optional `voice-reply` plugin owns the complete speech system, installer,
and discovery skill. This is a reusable system, not a general guard hook.
`machine-sync` offers it; no project setup or copied project rules are needed.
The existing ElevenLabs MCP registration and helper remain independent evidence.
Do not replace them or duplicate credentials. No MCP dependency is required.

The primary checkout has a pending removal of `docs/toolkit-map.md`. This
change leaves that file untouched and indexes the system through the root and
plugin READMEs, avoiding an overlap with the owner's separate cleanup.

## Behavior and implementation

- Both hosts supply `session_id` to `UserPromptSubmit` and `Stop` hooks.
  User-level registrations invoke a stable LocalAppData runtime. The key is
  a hash of host and session ID. Missing state means OFF; resume keeps state.
- Exact ordinary-text controls run in the prompt hook. No invented slash
  commands, assistant-selected IDs, or assistant-driven automatic speech.
- Stop saves only sanitized `last_assistant_message`. Progress and tools never
  enter that path. Control acknowledgements are not spoken or saved over the
  previous reply. A one-time read queues that reply without changing on/off.
- Separate hidden playback workers generate PCM through the ElevenLabs API
  and use Windows audio. Each job has a nonce; OFF invalidates it, workers poll
  cancellation during playback and reject late generation. No process-wide kill.
- User settings live separately from per-chat JSON. Locks and atomic writes
  protect concurrent hooks, workers, and settings updates. No reply text or
  provider response appears in diagnostics. Credentials come from the Windows
  user environment at request time. TLS uses Windows trust via Python ssl.
- The installer preserves unrelated host entries and manages only its exact
  hook registrations and skill. Update and uninstall use a local ownership
  manifest, preserve preferences, and cancel active playback. Hook trust remains
  under the host's control. Codex `/hooks` approval is never forged.

## Verification and delivery

First test state isolation, resume, one-shot reads, sanitation, settings,
cancellation races, failures, and install/update/uninstall in temporary homes.
Then install for this Windows user and exercise real host hooks and audio.
Document host trust or interactive checks that cannot be completed here.
Run repository checks and plugin validation, version the affected packages,
and prepare a PR. Merge and accepted completion follow the repository policy.

Stop describes a completed response; another unrelated Stop hook may request
continuation. Written answers and the model's acknowledgement wording remain
host/model behavior. Exact controls and speech decisions are runtime behavior.

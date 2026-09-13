# Voice verification

Issue #313. This record distinguishes fixture tests from actual host activation.

Verified on Windows on 2026-09-10 with Python 3.12.3, Codex 0.154.0, and
Claude Code 2.1.259. Initial user preferences remain Archer, voice ID
`Fahco4VZzobUeiPqni1S`, `eleven_flash_v2_5`, speed 1.0.

| Check | Evidence and result |
| --- | --- |
| Runtime and installer | 21 regression tests passed: fresh/resume/cross-host isolation, exact controls, final-only capture, one-time playback, settings snapshots/validation, concurrency, Unicode, nested fenced-code filtering, duplicate events, cancellation, exit behavior, and failure handling |
| Repeatable installation | Temporary Windows homes passed preview, install twice, update, conflict preservation, concurrent external edit protection, write rollback, installed-copy uninstall, and uninstall twice |
| Real user installation | Installed then updated the user runtime and both host registrations; source and installed runtime bytes match; existing MCP configuration remains separate |
| Real Codex chats | Existing user-approved hook trust used, with no bypass. Two concurrent chats, resume, fresh/fork OFF defaults, one-shot remaining OFF, and OFF controls passed |
| Real Claude Code chats | Installed user hooks first verified through a fresh CLI chat. Same concurrent/resume/fresh/fork/one-shot/OFF matrix then passed with the installed voice handlers isolated from unrelated plugins |
| Actual final replies | Both hosts' final replies reached their native Stop hooks, generated real ElevenLabs audio, and finished Windows playback. Claude's streaming CLI stayed open across turns; Codex used exec/resume |
| Settings and provider | Two real generations with speeds 1.0 and 0.9 finished in separate playback processes, using temporary settings. User preferences remained unchanged |
| Active sound cancellation | Two Windows playback processes ran together. OFF stopped one worker in 0.14 seconds while the other completed |
| Failure handling | Injected HTTP, network, TLS, timeout, credential, malformed-input and installer-write failures preserved written replies/configuration and did not publish raw diagnostics |
| Credential handling | Existing local user key used for live tests; exact credential absent from every voice package file; no key copied to configuration or docs |
| Packaging | Claude marketplace validation, Codex plugin validation and both skill validators passed. All four required toolkit checks passed before PR preparation |

Review found and fixed installed-uninstall source dependence, Windows UTF-8
input decoding, a configuration preflight race, and code fences nested in
Markdown containers. End-to-end testing then caught SessionEnd cancelling the
queued final reply. That handler was removed; closing a host now allows final
audio to finish, while OFF and uninstall still cancel it.

The test commands are indexed in the plugin README. Unit tests use synthetic
provider responses. Live scripts use actual host inference and, where stated,
paid ElevenLabs generation; they print results without credentials or full
transcripts. A successful Windows playback call is not a human listening test.

Limits: desktop/IDE UI surfaces were not separately exercised. Multiple clients
submitting overlapping turns to the same chat ID are unverified. Another Stop
hook can request continuation after a response reaches voice. Disabled or
untrusted host hooks prevent activation. Natural-language paraphrases and
acknowledgement wording depend on the assistant; exact control/state and audio
decisions run in code.

## macOS

Issue #319. Checked on macOS 26.6.2 (arm64) on 2026-09-12 with Homebrew
Python 3.14.6, Claude Code 2.1.270, and Codex 0.154.0. No ElevenLabs key was
saved on this Mac and the Codex user hooks had not been trusted, so every check
below ran without either.

| Check | Evidence and result |
| --- | --- |
| Runtime and installer | 25 regression tests passed with a fake provider, including the Mac and Windows branches for the voice folder, key lookup, Codex quoting, and player cancellation |
| Active sound cancellation | `tests/live_playback.py` played two real `afplay` tones in separate workers. OFF stopped one in 0.041 seconds while the other finished |
| Real user installation | The preview listed only the runtime `voice.py` and `install.py`, `~/.claude/settings.json`, `~/.codex/hooks.json`, and the two `toolkit-voice` skills. Applying added exactly one voice handler each to SessionStart, UserPromptSubmit, and Stop in Claude settings. Every other settings key and all three existing hooks were unchanged. `~/.codex/hooks.json` did not exist before and now holds only the voice handlers. Installed runtime bytes match the source. The hooks use `/opt/homebrew/opt/python@3.14/bin/python3.14`. Both registered commands, run the way each host runs them (interpreter plus arguments for Claude Code, `$SHELL -lc` for Codex), printed the OFF help and exited 0 |
| Real Claude Code chats | `tests/live_claude.py` passed against the installed user hooks: two concurrent chats, resume, fresh and fork OFF defaults, one-time read leaving the switch OFF, and OFF |
| Real Codex chats | Not run. A fresh `codex exec` chat finished normally, showed no hook warning, and wrote no voice state, so Codex skipped the untrusted user hooks. The Codex config holds no trust entry for `~/.codex/hooks.json` |
| Missing key | In a temporary voice folder, with no Keychain item and no environment key, a real worker marked an enabled chat's reply `audio-failed` 0.10 seconds after the Stop hook. `voice status` reported it. `voice read` failed the same way in 0.06 seconds. The sanitized previous reply stayed available, no audio file was written, and nothing about the key or the provider appeared in state or hook output |

Not yet verified on macOS:

- The Codex live matrix (`tests/live_codex.py`). The owner has to review and
  trust the user hooks in Codex `/hooks` first.
- Real ElevenLabs generation and native final-reply audio in both hosts
  (`tests/live_smoke.py`, `tests/live_completion.py`), including the hidden
  worker reading the Keychain item without a dialog. The owner has to save the
  key in the Keychain first.
- Desktop app surfaces for either host.

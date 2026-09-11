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

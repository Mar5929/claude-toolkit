# Mac voice replies

Canonical requirements and delivery state: [issue #319](https://github.com/Mar5929/claude-toolkit/issues/319).
It extends the Windows release designed in [313-windows-voice.md](313-windows-voice.md).

## Ownership

`voice-reply` still owns the whole system on both platforms: one runtime, one
installer, one discovery skill template. No Mac-only copy of the behavior logic.
Windows paths, credential lookup, playback, and hook registrations stay exactly
as they are, so an existing Windows install updates without a new Codex trust
review (requirement 3).

## What differs by platform

| Concern | Windows (unchanged) | Mac (new) | Requirement |
| --- | --- | --- | --- |
| Runtime folder | `%LOCALAPPDATA%/ClaudeToolkit/voice-reply` | `~/Library/Application Support/ClaudeToolkit/voice-reply` | 5, 6 |
| Key | User environment registry, then process environment | Keychain generic password, service `ELEVENLABS_API_KEY`, read with `/usr/bin/security` at generation time; then process environment | 4 |
| Playback | `winsound`, polled every 50 ms | `/usr/bin/afplay` child of the worker, polled every 50 ms; OFF terminates only that worker's player | 1 |
| Claude Code hook | Exec form: interpreter plus `args` | Same | 2 |
| Codex hook | PowerShell literal in `command` and `commandWindows` | POSIX-quoted `command` run by the shell, no `commandWindows` | 2 |
| Installer apply gate | Windows | Windows or macOS, Python 3.10 or newer | 6 |
| TLS | Python `ssl` with Windows stores | Python `ssl` with its OpenSSL store; checks stay on | 4 |

Every behavior rule (OFF by default, per host and chat, exact controls, final
reply only, sanitation, one-time read, settings snapshots, nonce cancellation,
fail-open hooks) stays in the shared code path (requirement 1).

## Key on the Mac

The owner chose the Keychain on 2026-09-12. The guide tells the owner to run
`security add-generic-password -a "$USER" -s ELEVENLABS_API_KEY -U -w`, which
prompts for the key, so it never lands in a command line or shell history. An
item created by `security` trusts `security` for reads, so the hidden worker
reads it without a dialog. It is read per request, so a new key works without a
restart. A locked or missing item becomes `audio-failed`; the written reply is
unaffected.

## Each computer on its own

The runtime folder holds that computer's `settings.json` and `chats/`. Nothing
is synced between computers (requirement 5).

## Documentation

The plugin guide, `voice-setup`, the `toolkit-voice` template, both plugin
manifests, both marketplace entries, the root README, `docs/toolkit-map.md`,
and the `machine-sync` and `project-init` routing text stop saying Windows only.
The guide gains Mac install, key, settings, and uninstall steps (requirement 7).
`voice-reply` goes to 0.2.0; `project-init` gets a patch bump for its routing text.

## Verification

1. Unit tests on the Mac with a fake provider, including Mac and Windows
   branches for folder, key lookup, Codex quoting, and player cancellation.
   Installer tests in temporary homes run on Windows and macOS.
2. Real `afplay` test: two quiet tones in separate workers, cancel one.
3. Real install for this Mac user, then the Claude Code live matrix.
4. The Codex live matrix after the owner trusts the user hooks in `/hooks`.
5. Paid generation and native final-reply audio after the owner saves the key.

`tests/VERIFICATION.md` gains a Mac section that separates real checks from
fixtures and names anything the owner still has to run (requirement 8).

## Known limits

The interpreter used to install is the hook interpreter. After a Homebrew
Python upgrade removes that version, run `update --apply` again with the new
Python. Desktop app surfaces need their own activation check.
